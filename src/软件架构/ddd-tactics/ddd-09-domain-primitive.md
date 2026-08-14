---
title: "Domain Primitive：定义、三原则与重构步骤"
sidebarGroup: "战术与分层"
shortTitle: "09 Domain Primitive"
order: 9
date: 2026-11-08
category: "软件架构"
tag:
  - "DDD"
  - "Domain Primitive"
  - "值对象"
  - "战术设计"
---

> **DDD 领域驱动设计 · 第 9/15 篇**  
> 上一篇：[08 分层与四种模型](/软件架构/ddd-tactics/ddd-08-layered-models) · 下一篇：[10 六边形新应用](/软件架构/ddd-tactics/ddd-10-hexagonal-new-app)

---

## 为什么先讲 Domain Primitive

DDD 宏观理念并不难懂，但缺少一套可落地的代码规范，新手容易「建模用 DDD、落地用 MVC」。在 Entity、Aggregate、Repository 等概念之前，**Domain Primitive（DP，原子领域类型）** 是最基础、也最容易立刻产生价值的战术构件——它像 `Integer`、`String` 之于编程语言一样，在领域模型里无处不在。

DP 的概念来自 Dan Bergh Johnsson & Daniel Deogun 的 *Secure by Design*；与《代码大全》中的 **ADT（抽象数据类型）** 一脉相承：用业务上的最小类型替代底层基础类型，让代码自我说明、易于修改。

---

## DP 的定义

**Domain Primitive** 是在特定领域里，拥有精准定义、可自我验证、拥有行为的 **Value Object**。

| 特征 | 说明 |
|------|------|
| 不可变 | 传统意义上的 VO，Immutable |
| 概念完整 | 是一个完整的概念整体，而非裸字段 |
| 通用语言 | 使用业务域原生语言命名 |
| 可组合 | 可以是最小组成部分，也可构建复杂组合 |

---

## 案例：用户注册与区号匹配

业务：地推注册系统，用户注册后按**电话区号**匹配区域业务员并发奖金。

### 原始实现

```java
public class User {
    Long userId;
    String name;
    String phone;
    String address;
    Long repId;
}

public class RegistrationServiceImpl implements RegistrationService {
    private SalesRepRepository salesRepRepo;
    private UserRepository userRepo;

    public User register(String name, String phone, String address)
            throws ValidationException {
        if (name == null || name.length() == 0) {
            throw new ValidationException("name");
        }
        if (phone == null || !isValidPhoneNumber(phone)) {
            throw new ValidationException("phone");
        }
        // 省略 address 校验
        String areaCode = null;
        String[] areas = new String[]{"0571", "021", "010"};
        for (int i = 0; i < phone.length(); i++) {
            String prefix = phone.substring(0, i);
            if (Arrays.asList(areas).contains(prefix)) {
                areaCode = prefix;
                break;
            }
        }
        SalesRep rep = salesRepRepo.findRep(areaCode);
        User user = new User();
        user.name = name;
        user.phone = phone;
        user.address = address;
        if (rep != null) {
            user.repId = rep.repId;
        }
        return userRepo.save(user);
    }

    private boolean isValidPhoneNumber(String phone) {
        return phone.matches("^0[1-9]{2,3}-?\\d{8}$");
    }
}
```

### 四个维度的问题

**1. 接口清晰度**

编译后方法签名等价于 `User register(String, String, String)`，入参顺序一错编译器不会报错：

```java
// 运行时才发现：name 与 address 传反了
service.register("殷浩", "浙江省杭州市余杭区文三西路969号", "0571-12345678");
```

只能依赖 `findByNameAndPhone` 这类冗长方法名区分，且多参数时仍有顺序风险。

**2. 数据校验与错误处理**

校验逻辑散落在每个方法入口，违反 DRY；扩展手机格式时容易漏改某处。Bean Validation 只能覆盖简单规则，复杂校验仍要写代码；`ValidationUtils` 集中校验又违背单一职责，业务异常与校验异常混杂。

**3. 业务代码清晰度**

从 `phone` 提取区号是典型的**胶水代码**——因外部 `SalesRepRepository.findRep(areaCode)` 的入参与原始 `String phone` 不匹配而产生。抽成 `PhoneUtils.findAreaCode()` 后，业务仍散落在工具类与 Service 之间。

**4. 可测试性**

若有 N 个参数、每个 M 种校验、P 个方法复用同一字段，测试用例量级约为 **P × N × M**。新增 `fax` 字段且校验与 `phone` 相同，仍要新增 M 个用例。

---

## 原则一：将隐性的概念显性化

电话号在原始代码里是隐藏概念；**区号**才是业务逻辑。引入 `PhoneNumber`：

```java
public class PhoneNumber {
    private final String number;

    public PhoneNumber(String number) {
        if (number == null) {
            throw new ValidationException("number不能为空");
        } else if (!isValid(number)) {
            throw new ValidationException("number格式错误");
        }
        this.number = number;
    }

    public String getNumber() {
        return number;
    }

    public String getAreaCode() {
        for (int i = 0; i < number.length(); i++) {
            String prefix = number.substring(0, i);
            if (isAreaCode(prefix)) {
                return prefix;
            }
        }
        return null;
    }

    private static boolean isAreaCode(String prefix) {
        return Arrays.asList("0571", "021", "010").contains(prefix);
    }

    public static boolean isValid(String number) {
        return number.matches("^0?[1-9]{2,3}-?\\d{8}$");
    }
}
```

要点：

- `private final String number` 保证不可变
- 校验放在构造器，创建出来一定合法
- `getAreaCode()` 把胶水逻辑变成计算属性

重构后：

```java
public User register(@NotNull Name name, @NotNull PhoneNumber phone, @NotNull Address address) {
    SalesRep rep = salesRepRepo.findRep(phone.getAreaCode());
    User user = new User();
    user.name = name;
    user.phone = phone;
    user.address = address;
    if (rep != null) {
        user.repId = rep.repId;
    }
    return userRepo.saveUser(user);
}
```

| 维度 | 传统代码 | 使用 DP |
|------|----------|---------|
| API 清晰度 | 含混 | `register(Name, PhoneNumber, Address)` |
| 校验 | 分散、重复 | 边界外完成，Service 无 throws |
| 业务清晰度 | 校验 + 胶水 + 逻辑混杂 | 核心流程一目了然 |
| 测试复杂度 | P × N × M | N + M + P |

`PhoneNumber` 自身仍需 M 个用例；各方法只需覆盖「null」分支，合法值由 DP 保证。

---

## DP 三原则（进阶）

### 原则二：将隐性的上下文显性化

境内转账写 `pay(BigDecimal money, Long recipientId)` 隐含货币为 CNY；跨境或货币变更时这是 bug。应显性化 **Money**：

```java
@Value
public class Money {
    private BigDecimal amount;
    private Currency currency;
}

public void pay(Money money, Long recipientId) {
    BankService.transfer(money, recipientId);
}
```

### 原则三：封装多对象行为

跨境需汇率：`Money`、`Currency`、`ExchangeRate`、`BigDecimal` 多对象计算应封装进 DP：

```java
@Value
public class ExchangeRate {
    private BigDecimal rate;
    private Currency from;
    private Currency to;

    public Money exchange(Money fromMoney) {
        notNull(fromMoney);
        isTrue(this.from.equals(fromMoney.getCurrency()));
        BigDecimal targetAmount = fromMoney.getAmount().multiply(rate);
        return new Money(targetAmount, to);
    }
}

public void pay(Money money, Currency targetCurrency, Long recipientId) {
    ExchangeRate rate = ExchangeService.getRate(money.getCurrency(), targetCurrency);
    Money targetMoney = rate.exchange(money);
    BankService.transfer(targetMoney, recipientId);
}
```

---

## DP 与 VO、DTO 的区别

| | DTO | DP |
|---|-----|-----|
| 功能 | 数据传输，技术细节 | 业务域概念 |
| 关联 | 字段堆叠，未必相关 | 高相关性 |
| 行为 | 无 | 丰富业务逻辑 |

DP 是 VO 的进阶：在 Immutable 之上要求**概念整体性、Validity（合法性）、行为**，且无副作用。

**适用场景**：有格式约束的 `String`（`Name`、`PhoneNumber`、`Address`）；有范围的 `Integer`（`OrderId`、`Quantity`）；带业务含义的 `BigDecimal`（`Money`、`Temperature`）；以及应封装操作的复杂结构（如 `Map` 的包装）。

---

## 老应用重构四步

以电话区号案例为例：

**第一步**：创建 DP，收集所有相关无状态行为（原 static 方法迁入 DP；有状态部分分离变与不变，无状态部分进 DP）。

**第二步**：保持旧接口签名，内部用 DP 替换校验与胶水逻辑：

```java
public User register(String name, String phone, String address) throws ValidationException {
    Name _name = new Name(name);
    PhoneNumber _phone = new PhoneNumber(phone);
    Address _address = new Address(address);
    SalesRep rep = salesRepRepo.findRep(_phone.getAreaCode());
    // ...
}
```

**第三步**：新接口直接使用 DP 类型：

```java
public User register(Name name, PhoneNumber phone, Address address) {
    SalesRep rep = salesRepRepo.findRep(phone.getAreaCode());
    // ...
}
```

**第四步**：调用方改为 `new Name(...)`、`new PhoneNumber(...)` 等。

---

## 小结

Domain Primitive 把散落在 Service、Utils、注解里的校验与胶水逻辑，收敛成**可复用、可测试、类型安全**的领域类型。它是后续 Entity、Repository、六边形分层的基础砖块——下一篇将从零搭建一套可测试的新应用架构。
