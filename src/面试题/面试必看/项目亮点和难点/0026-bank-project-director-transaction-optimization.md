---
title: "银行项目长事务优化"
sidebarGroup: "项目亮点和难点"
shortTitle: "银行项目长事务优化"
order: 26
date: 2026-08-02
category: "面试题"
tag:
  - "面试题"
description: "很多同学开发过一些传统项目，项目基本都是CRUD的业务实现，简历里不知道写什么项目亮点，其实长事务的优化就是可以写的一个亮点，我们可以考虑一个银行系统的场景，其中涉及账户转账功能的长事务优化。这个示例将展示如何优化银行账户资金转账时的长事务"
article: false
---

> 来源：[银行项目长事务优化](https://www.yuque.com/tulingzhouyu/db22bv/iu40yi3obhsecxi5)

很多同学开发过一些传统项目，项目基本都是CRUD的业务实现，简历里不知道写什么项目亮点，其实长事务的优化就是可以写的一个亮点，我们可以考虑一个银行系统的场景，其中涉及账户转账功能的长事务优化。这个示例将展示如何优化银行账户资金转账时的长事务。

### 项目背景

在一个银行账户管理系统中，用户可以从一个账户向另一个账户转账。原有的实现将整个转账过程（包括账户余额检查、扣款、入账、记录交易流水和通知客户）都纳入一个事务中。这可能导致以下问题：

1. 长时间锁定账户记录，导致其他操作无法进行
2. 系统并发能力降低
3. 影响用户体验（长时间等待转账完成）

### 优化策略

1. 缩小事务范围：仅将扣款和入账操作纳入事务。
2. 使用异步处理：异步处理通知和记录交易流水。
3. 采用批量操作来减少数据库交互。
4. 使用乐观锁来控制并发。

### 优化实现

#### 1. 服务设计

将关键的扣款和入账操作封装在一个事务中，而将通知和日志记录异步化。

```java
@Service  
public class TransferService {  

    @Autowired  
    private AccountRepository accountRepository;  

    @Autowired  
    private TransactionLogService transactionLogService;  

    @Autowired  
    private NotificationService notificationService;  

    @Transactional  
    public TransferResult transferFunds(Long fromAccountId, Long toAccountId, BigDecimal amount) {  
        //核对账户余额并扣款  
        Account fromAccount = accountRepository.findById(fromAccountId)  
        .orElseThrow(() -> new AccountNotFoundException("Account not found: " + fromAccountId));  
        Account toAccount = accountRepository.findById(toAccountId)  
        .orElseThrow(() -> new AccountNotFoundException("Account not found: " + toAccountId));  

        if (fromAccount.getBalance().compareTo(amount) < 0) {  
            throw new InsufficientFundsException("Insufficient balance in account: " + fromAccountId);  
        }  

        // 扣款  
        int updatedRows = accountRepository.decreaseBalance(fromAccountId, fromAccount.getVersion(), amount);  
        if (updatedRows == 0) {  
            throw new ConcurrentModificationException("Account was modified concurrently: " + fromAccountId);  
        }  

        // 入账  
        accountRepository.increaseBalance(toAccountId, amount);  

        // 异步记录交易日志  
        CompletableFuture.runAsync(() -> transactionLogService.logTransaction(fromAccountId, toAccountId, amount));  

        // 异步发送通知  
        CompletableFuture.runAsync(() -> notificationService.notifyTransfer(fromAccountId, toAccountId, amount));  

        return new TransferResult(true, "Transfer successful");  
    }  
}
```

#### 2. 仓库接口

数据库操作接口包括基于乐观锁的余额更新方法。

```java
@Repository  
public interface AccountRepository extends JpaRepository<Account, Long> {  

    @Modifying  
    @Query("UPDATE Account a SET a.balance = a.balance - :amount, a.version = a.version + 1 " +  
           "WHERE a.id = :accountId AND a.version = :version AND a.balance >= :amount")  
    int decreaseBalance(@Param("accountId") Long accountId, @Param("version") Long version, @Param("amount") BigDecimal amount);  

    @Modifying  
    @Query("UPDATE Account a SET a.balance = a.balance + :amount WHERE a.id = :accountId")  
    void increaseBalance(@Param("accountId") Long accountId, @Param("amount") BigDecimal amount);  
}
```

#### 3. 异步服务

使用异步服务处理非实时性任务，如记录交易日志和发送通知。

```java
@Service  
public class TransactionLogService {  

    @Async  
    public void logTransaction(Long fromAccountId, Long toAccountId, BigDecimal amount) {  
        // 模拟记录日志的过程  
        System.out.println("Logging transaction: " + fromAccountId + " to " + toAccountId + " Amount: " + amount);  
        // 实际实现可能包括数据库存储或文件写入  
    }  
}  

@Service  
public class NotificationService {  

    @Async  
    public void notifyTransfer(Long fromAccountId, Long toAccountId, BigDecimal amount) {  
        // 模拟发送通知的过程  
        System.out.println("Notifying transfer from: " + fromAccountId + " to: " + toAccountId + " Amount: " + amount);  
        // 实际实现可能涉及电子邮件或短信通知  
    }  
}
```

### 代码说明

1. **事务范围缩小**：

- 事务中只进行关键的扣款和入账操作。这样可以缩短事务时间，减少数据库锁定。

1. **乐观锁**：

- 通过在更新账户余额时使用版本号，确保数据一致性并避免并发冲突。

1. **异步处理**：

- 利用`@Async`异步方法处理日志记录和用户通知，从而减轻主流程的压力。

1. **批量操作**：

- 将所有账户相关信息提前查询减少每个操作的数据库交互次数。

### 优化效果

1. **并发提升**：通过缩短关键事务的锁定时间，提升了系统并发处理能力。
2. **快速响应**：将不影响数据一致性的操作异步化处理，使得用户能够更快速地完成转账操作。
3. **提升可靠性**：通过乐观锁减少了数据更新时的锁冲突风险，增加了系统的健壮性。
4. **提高用户体验**：减少转账等待时间，并提供及时通知，改善了整体用户体验。

通过上述优化策略，我们可以在银行系统中有效减少长事务的影响，提高系统的效率和用户满意度。
