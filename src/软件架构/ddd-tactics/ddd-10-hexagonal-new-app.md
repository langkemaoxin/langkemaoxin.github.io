---
title: "从 0 到 1：用六边形架构搭新应用"
sidebarGroup: "战术与分层"
shortTitle: "10 六边形新应用"
order: 10
date: 2026-11-08
category: "软件架构"
tag:
  - "DDD"
  - "六边形架构"
  - "Clean Architecture"
  - "战术设计"
---

> **DDD 领域驱动设计 · 第 10/15 篇**  
> 上一篇：[09 Domain Primitive](/软件架构/ddd-tactics/ddd-09-domain-primitive) · 下一篇：[11 Repository](/软件架构/ddd-tactics/ddd-11-repository)

---

## 好架构的五个目标

1. **独立于框架**：不被 Spring、MyBatis 等结构束缚  
2. **独立于 UI**：Web、Console、App 切换时核心不变  
3. **独立于数据源**：MySQL、MongoDB、文件系统可替换  
4. **独立于外部依赖**：第三方 API 升级时核心逻辑不大改  
5. **可测试**：不依赖真实 DB、MQ 也能验证业务正确性  

像一栋好楼：无论内部承载什么活动、外部风雨如何，结构应屹立不倒。

---

## 案例：银行跨币种转账

需求：网页转账给另一账号，支持跨币种；记录审计日志供监管与对账。

### 事务脚本的典型写法

```java
public class TransferController {
    private TransferService transferService;

    public Result<Boolean> transfer(String targetAccountNumber, BigDecimal amount,
                                    HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        return transferService.transfer(userId, targetAccountNumber, amount, "CNY");
    }
}

public class TransferServiceImpl implements TransferService {
    private static final String TOPIC_AUDIT_LOG = "TOPIC_AUDIT_LOG";
    private AccountMapper accountDAO;
    private KafkaTemplate<String, String> kafkaTemplate;
    private YahooForexService yahooForex;

    @Override
    public Result<Boolean> transfer(Long sourceUserId, String targetAccountNumber,
                                    BigDecimal targetAmount, String targetCurrency) {
        AccountDO sourceAccountDO = accountDAO.selectByUserId(sourceUserId);
        AccountDO targetAccountDO = accountDAO.selectByAccountNumber(targetAccountNumber);

        if (!targetAccountDO.getCurrency().equals(targetCurrency)) {
            throw new InvalidCurrencyException();
        }

        BigDecimal exchangeRate = BigDecimal.ONE;
        if (!sourceAccountDO.getCurrency().equals(targetCurrency)) {
            exchangeRate = yahooForex.getExchangeRate(
                    sourceAccountDO.getCurrency(), targetCurrency);
        }
        BigDecimal sourceAmount = targetAmount.divide(exchangeRate, RoundingMode.DOWN);

        if (sourceAccountDO.getAvailable().compareTo(sourceAmount) < 0) {
            throw new InsufficientFundsException();
        }
        if (sourceAccountDO.getDailyLimit().compareTo(sourceAmount) < 0) {
            throw new DailyLimitExceededException();
        }

        sourceAccountDO.setAvailable(sourceAccountDO.getAvailable().subtract(sourceAmount));
        targetAccountDO.setAvailable(targetAccountDO.getAvailable().add(targetAmount));
        accountDAO.update(sourceAccountDO);
        accountDAO.update(targetAccountDO);

        String message = sourceUserId + "," + targetAccountNumber + ","
                + targetAmount + "," + targetCurrency;
        kafkaTemplate.send(TOPIC_AUDIT_LOG, message);
        return Result.success(true);
    }
}
```

Martin Fowler 在 *P of EAA* 中把这类写法称为 **Transaction Script（事务脚本）**：像写 SQL 脚本一样，把流程堆在一个方法里。

![事务脚本：参数校验、读库、汇率、计算、写库、发消息混在一处](/软件架构/ali/p28-01.png)

### 三大问题

| 问题 | 定义 | 表现 |
|------|------|------|
| 可维护性差 | 依赖变化时需改多少代码 | 表结构、ORM、Yahoo 汇率 API、Kafka 任一变更都可能牵动全方法 |
| 可扩展性差 | 新需求需新增/修改多少代码 | 跨行转账几乎重写；if-else 膨胀 |
| 可测试性差 | 单测耗时 × 用例数 | 强依赖 DB/MQ/HTTP，集成测试为主，边界难覆盖 |

根因：违背 **单一职责**、**依赖反转**、**开闭原则**——业务直接依赖具体实现。

---

## 重构路径

### 2.1 解耦数据存储：Entity + Repository

**Entity** 拥有 ID 与行为，与表结构解耦；**Repository** 只负责 Entity 的存取。

```java
@Data
public class Account {
    private AccountId id;
    private AccountNumber accountNumber;
    private UserId userId;
    private Money available;
    private Money dailyLimit;

    public void withdraw(Money money) { /* 转出 */ }
    public void deposit(Money money) { /* 转入 */ }
}

public interface AccountRepository {
    Account find(AccountId id);
    Account find(AccountNumber accountNumber);
    Account find(UserId userId);
    Account save(Account account);
}
```

| | Data Object (DO) | Entity |
|---|------------------|--------|
| 职责 | 与表一对一映射，无行为 | 领域逻辑，字段用语义类型（如 `Money`） |
| 使用 | 仅在 Infrastructure 层 | Domain / Application 层 |

| | DAO | Repository |
|---|-----|------------|
| 操作对象 | DO | Entity |
| 接口语义 | insert/update（SQL 思维） | find/save/remove（集合思维） |
| 位置 | Infrastructure | 接口在 Domain，实现在 Infrastructure |

![Entity 与 Repository 解耦业务与 ORM](/软件架构/ali/p31-01.png)

### 2.2 解耦第三方依赖：防腐层 ACL

抽象 `ExchangeRateService` 与 `ExchangeRate` DP，隔离 Yahoo 等具体实现：

```java
public interface ExchangeRateService {
    ExchangeRate getExchangeRate(Currency source, Currency target);
}

public class ExchangeRateServiceImpl implements ExchangeRateService {
    @Autowired
    private YahooForexService yahooForexService;

    @Override
    public ExchangeRate getExchangeRate(Currency source, Currency target) {
        if (source.equals(target)) {
            return new ExchangeRate(BigDecimal.ONE, source, target);
        }
        BigDecimal forex = yahooForexService.getExchangeRate(
                source.getValue(), target.getValue());
        return new ExchangeRate(forex, source, target);
    }
}
```

**Anti-Corruption Layer** 还能提供：适配器（协议/字段转换）、缓存、兜底、功能开关，并便于 Mock 测试。

![防腐层隔离外部依赖](/软件架构/ali/p32-01.png)

### 2.3 抽象中间件

封装 `AuditMessage` DP 与 `AuditMessageProducer`，隔离 Kafka 细节：

```java
@Value
@AllArgsConstructor
public class AuditMessage {
    private UserId userId;
    private AccountNumber source;
    private AccountNumber target;
    private Money money;
    private Date date;

    public String serialize() {
        return userId + "," + source + "," + target + "," + money + "," + date;
    }
}

public interface AuditMessageProducer {
    SendResult send(AuditMessage message);
}
```

### 2.4 封装业务逻辑

- **DP**：汇率换算 `exchangeRate.exchangeTo(targetMoney)`  
- **Entity**：`Account.deposit` / `withdraw` 含余额与限额校验  
- **Domain Service**：跨账户转账 `AccountTransferService`

```java
public interface AccountTransferService {
    void transfer(Account sourceAccount, Account targetAccount,
                  Money targetMoney, ExchangeRate exchangeRate);
}

public class AccountTransferServiceImpl implements AccountTransferService {
    @Override
    public void transfer(Account sourceAccount, Account targetAccount,
                         Money targetMoney, ExchangeRate exchangeRate) {
        Money sourceMoney = exchangeRate.exchangeTo(targetMoney);
        sourceAccount.withdraw(sourceMoney);
        targetAccount.deposit(targetMoney);
    }
}
```

### 2.5 重构后的 Application Service

```java
public class TransferServiceImplNew implements TransferService {
    private AccountRepository accountRepository;
    private AuditMessageProducer auditMessageProducer;
    private ExchangeRateService exchangeRateService;
    private AccountTransferService accountTransferService;

    @Override
    public Result<Boolean> transfer(Long sourceUserId, String targetAccountNumber,
                                    BigDecimal targetAmount, String targetCurrency) {
        Money targetMoney = new Money(targetAmount, new Currency(targetCurrency));

        Account sourceAccount = accountRepository.find(new UserId(sourceUserId));
        Account targetAccount = accountRepository.find(new AccountNumber(targetAccountNumber));
        ExchangeRate exchangeRate = exchangeRateService.getExchangeRate(
                sourceAccount.getCurrency(), targetMoney.getCurrency());

        accountTransferService.transfer(sourceAccount, targetAccount, targetMoney, exchangeRate);

        accountRepository.save(sourceAccount);
        accountRepository.save(targetAccount);

        AuditMessage message = new AuditMessage(sourceAccount, targetAccount, targetMoney);
        auditMessageProducer.send(message);
        return Result.success(true);
    }
}
```

`TransferService` 只做**编排（Orchestration）**，无计算逻辑——这就是 **Application Service**。

---

## 依赖关系：从三层到领域驱动

![重构前：UI → 业务 → 基础设施，强耦合](/软件架构/ali/p38-01.png)

![重构后：Domain 为核心，Application 依赖抽象，Infrastructure 实现细节](/软件架构/ali/p38-02.png)

- **Domain Layer**：Entity、DP、Domain Service，纯内存，无外部依赖  
- **Application Layer**：Application Service、Repository/ACL **接口**  
- **Infrastructure Layer**：Repository/ACL **实现**、Controller、ORM  

**DDD 不是特殊架构，而是事务脚本经合理重构后的自然终点。**

---

## 六边形架构与模块划分

Alistair Cockburn 的 **Hexagonal Architecture（端口与适配器）**：UI、DB、MQ 都是 I/O，权重相等；核心是领域模型。

![六边形架构：端口与适配器](/软件架构/ali/p39-01.png)

Java 中通过 **POM Module + 依赖注入** 组织：

![模块依赖关系总览](/软件架构/ali/p40-01.png)

| 模块 | 职责 | 依赖 |
|------|------|------|
| **Types** | 对外暴露的 DP | 无 |
| **Domain** | Entity、Domain Service、Repository/ACL 接口 | Types |
| **Application** | Application Service | Domain |
| **Infrastructure** | Persistence、Messaging、External 实现 | Domain + 具体框架 |
| **Web** | Controller | Application |
| **Start** | Spring Boot 启动 | 全部 |

![Types 模块：纯 POJO 的 DP](/软件架构/ali/p41-01.png)

![Domain 模块：核心业务](/软件架构/ali/p42-01.png)

![Infrastructure：Persistence 等](/软件架构/ali/p44-01.png)

### 测试与演进速度

- Types / Domain：100% 单元测试  
- Application：Mock 外部抽象  
- Infrastructure：I/O 较慢但变更少  
- **越内层演进越快，越外层越稳定**——体现「领域驱动」

![各层代码演进速度对比](/软件架构/ali/p46-01.png)

---

## 从 0 到 1 的四步清单

1. **抽象数据存储**：DO + DAO 留 Infrastructure；Entity + Repository 面向领域  
2. **解耦第三方与中间件**：ACL 隔离服务与 MQ  
3. **封装业务逻辑**：DP + Entity + Domain Service  
4. **六边形模块设计**：Types → Domain → Application → Infrastructure → Web → Start  

收益：**高可维护**（外部变更局部化）、**高可扩展**（复用核心逻辑）、**高可测试**（纯领域可全覆盖）、**结构清晰**（模块边界明确）。

下一篇聚焦 **Repository 模式** 与 DO / Entity / DTO 的对象规范。
