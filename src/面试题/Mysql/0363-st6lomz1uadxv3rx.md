---
title: "MySQL只操作同一条记录也会死锁吗"
sidebarGroup: "Mysql"
shortTitle: "MySQL只操作同一条记录也会死锁吗"
order: 363
date: 2026-03-17
category: "面试题"
tag:
  - "面试题"
description: "在MySQL中，即使多个事务仅对同一条记录进行操作，也可能发生死锁。这通常与InnoDB存储引擎的锁管理机制有关。以下是一些触发这种情况的场景：可能的死锁原因索引导致的锁竞争：如果事务在WHERE子句中使用不同的索引来查找相同的行，Inno"
article: false
---

> 来源：[MySQL只操作同一条记录也会死锁吗](https://www.yuque.com/tulingzhouyu/db22bv/st6lomz1uadxv3rx)

在MySQL中，即使多个事务仅对同一条记录进行操作，也可能发生死锁。这通常与InnoDB存储引擎的锁管理机制有关。以下是一些触发这种情况的场景：

### 可能的死锁原因

1. **索引导致的锁竞争**：

- 如果事务在WHERE子句中使用不同的索引来查找相同的行，InnoDB可能会导致多个事务以不同顺序锁住这些索引，从而产生死锁。

1. **自增锁（auto-increment lock）**：

- 在使用自增列时，不同事务可能在等待获取表级锁来增加自增值，某些情况下也会出现死锁。

1. **外键约束**：

- 外键检查过程中可能会涉及多个表，多个事务可能会因为不同的锁顺序而陷入死锁。

### 示例

假设有一个表`accounts`，事务A和事务B都对记录ID为1的行进行更新操作导致产生死锁。

```sql
CREATE TABLE accounts (  
  account_id INT PRIMARY KEY,  
  balance DECIMAL(10, 2)  
);  

-- 初始数据  
INSERT INTO accounts (account_id, balance) VALUES (1, 100.00);
```

**事务A**:

```sql
START TRANSACTION;  
UPDATE accounts SET balance = balance - 10 WHERE account_id = 1;  
-- ... 其他处理，此时不提交事务
```

**事务B**:

```sql
START TRANSACTION;  
UPDATE accounts SET balance = balance + 10 WHERE account_id = 1;  
-- ... 其他处理，此时不提交事务
```

如果事务A和事务B在不提交事务的情况下，都在等待对方持有的锁释放，就会发生死锁。

### 解决方法

1. **合适的索引和查询计划**：

- 确保查询使用最优的索引，以减少锁的粒度。

1. **减少锁定时间**：

- 尽量缩短事务的生命周期，避免在事务内进行过多的运算或等待。

1. **合理规划事务逻辑**：

- 统一事务的锁定顺序，避免因为不同的顺序引起的锁等待。

1. **检测和重试**：

- 配置合适的重试机制，当捕获死锁异常时重试事务操作。

### Java代码示例

当检测到死锁时，可以使用重试机制来解决问题，如以下Java代码示例：

```java
import java.sql.*;  
import java.util.concurrent.TimeUnit;  

public class DeadlockRetryExample {  

    private static final String URL = "jdbc:mysql://localhost:3306/your_database";  
    private static final String USER = "your_username";  
    private static final String PASSWORD = "your_password";  
    private static final int MAX_RETRIES = 3;  
    private static final int RETRY_DELAY = 2;  

    public void updateBalanceWithRetry(int accountId, double balanceChange) throws SQLException {  
        String sql = "UPDATE accounts SET balance = balance + ? WHERE account_id = ?";  
        int attempts = 0;  
        while (attempts < MAX_RETRIES) {  
            try (Connection conn = DriverManager.getConnection(URL, USER, PASSWORD)) {  
                conn.setAutoCommit(false);  
                try (PreparedStatement ps = conn.prepareStatement(sql)) {  
                    ps.setDouble(1, balanceChange);  
                    ps.setInt(2, accountId);  
                    ps.executeUpdate();  
                    conn.commit();  
                    return;  
                } catch (SQLException e) {  
                    conn.rollback();  
                    if (isDeadlockException(e)) {  
                        if (++attempts >= MAX_RETRIES) {  
                            throw e;  
                        }  
                        TimeUnit.SECONDS.sleep(RETRY_DELAY);  
                    } else {  
                        throw e;  
                    }  
                }  
            }  
        }  
    }  

    private boolean isDeadlockException(SQLException e) {  
        return e.getErrorCode() == 1213; // MySQL死锁的错误代码为1213  
    }  
}
```

通过理解MySQL的锁机制和适当规划应用程序事务，可以有效地减少因操作同一记录导致的死锁。
