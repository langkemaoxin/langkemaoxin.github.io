---
title: "每天批次导入1000万订单数据到MySql经常出现死锁"
sidebarGroup: "AI代码助手"
shortTitle: "每天批次导入1000万订单数据到MySql经常出现死锁"
order: 1304
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "MySQL 8.0.18 REPLACE INTO 死锁问题深度解析目录问题背景死锁复现根因分析"
article: false
---

> 来源：[每天批次导入1000万订单数据到MySql经常出现死锁](https://www.yuque.com/tulingzhouyu/db22bv/dsqww90tyg2uqaga)

# MySQL 8.0.18 REPLACE INTO 死锁问题深度解析

## 目录

1. [问题背景](#问题背景)
2. [死锁复现](#死锁复现)
3. [根因分析](#根因分析)
4. [锁机制详解](#锁机制详解)
5. [源码剖析](#源码剖析)
6. [修复方案](#修复方案)
7. [总结与建议](#总结与建议)

---

## 问题背景

### MySQL 版本信息

- **影响版本**：MySQL 8.0.18
- **修复版本**：MySQL 8.0.19+
- **问题类型**：REPLACE INTO 并发死锁
- **Bug ID**：Bug #98324

### 问题描述

在 MySQL 8.0.18 版本中，当多个事务并发执行 `REPLACE INTO` 操作且触发唯一键冲突时，可能出现死锁（Deadlock）。这个问题在 MySQL 8.0.19 版本被修复。

---

## 死锁复现

### 测试环境准备

#### 1. 表结构

```sql
CREATE TABLE t (
    a INT PRIMARY KEY,
    b INT UNIQUE KEY
) ENGINE=InnoDB;
```

**关键要素**：

- 主键：`a`
- 唯一键：`b`

#### 2. 初始数据

```sql
INSERT INTO t VALUES (1, 1), (100, 8);
```

**数据分布**：

```plain
主键 a: 1, 100
唯一键 b: 1, 8
```

### 死锁场景

#### 场景 1：两个事务插入不同主键、相同唯一键

时间
Thread 1
Thread 2

T1
`REPLACE INTO t VALUES (10, 8);`

T2
✅ 执行成功（等待中...）

T3

`REPLACE INTO t VALUES (20, 8);`

T4

⏰ 等待 Thread 1

T5
继续执行...

T6
💥 **死锁！**
💥 **死锁！**

**死锁信息**：

```plain
ERROR 1213 (40001): Deadlock found when trying to get lock; 
try restarting transaction
```

#### 场景 2：REPLACE + UPDATE 混合

时间
Thread 1
Thread 2

T1
`REPLACE INTO t VALUES (10, 8);`

T2

`UPDATE t SET a = 20 WHERE b = 8;`

T3

⏰ 等待

T4
继续执行...

T5
💥 **死锁！**
💥 **死锁！**

---

## 根因分析

### REPLACE INTO 执行流程

`REPLACE INTO` 的语义等价于：

```sql
IF EXISTS (SELECT * FROM t WHERE uk = value) THEN
    DELETE FROM t WHERE uk = value;
    INSERT INTO t VALUES (...);
ELSE
    INSERT INTO t VALUES (...);
END IF;
```

### 加锁过程

#### 1. 检测唯一键冲突

```plain
函数调用链：
row_ins_scan_sec_index_for_duplicate()
    └─ btr_cur_search_to_nth_level()  // 定位到冲突记录
        └─ row_ins_set_rec_lock()      // 申请锁
```

**加锁类型**：**X Next-Key Lock**

对于 `b = 8`，假设索引中记录为 `[1, 8, 100]`，则加锁范围：

```plain
Lock: X Next-Key Lock on (1, 8]
```

#### 2. 删除冲突记录

已持有 Next-Key Lock，直接删除。

#### 3. 插入新记录

申请 **Insert Intention Lock**：

```plain
Lock: X Insert Intention Lock on gap (1, 100)
```

### 死锁形成机制

#### 时间线分析

```plain
初始数据：uk=8 对应 heap_no=5

T1: Thread 1 执行 REPLACE INTO (10, 8)
    ├─ 检测冲突，申请 X Next-Key Lock (1, 8]
    └─ ✅ 加锁成功（granted）

T2: Thread 2 执行 REPLACE INTO (20, 8)
    ├─ 检测冲突，申请 X Next-Key Lock (1, 8]
    └─ ❌ 被 Thread 1 阻塞，进入等待队列（waiting）

此时锁队列：
    heap_no=5: [T1: X Next-Key (granted)] → [T2: X Next-Key (waiting)]

T3: Thread 1 继续执行
    ├─ 删除 uk=8 的记录（已持有锁）
    ├─ 准备插入 (10, 8)
    └─ 申请 X Insert Intention Lock on gap (1, 100)

T4: 死锁检测
    ├─ Thread 1 申请 Insert Intention Lock
    ├─ 但 Thread 2 在同一位置等待 Next-Key Lock
    ├─ Insert Intention Lock 必须等待 waiting Next-Key Lock
    └─ 形成循环等待：
        - Thread 1 等待 Thread 2 (Insert Intention 等待 Waiting Next-Key)
        - Thread 2 等待 Thread 1 (Next-Key 等待 Granted Next-Key)
        
T5: 💥 死锁检测器触发，回滚一个事务
```

### 关键问题：为什么 Insert Intention Lock 要等待 Waiting Next-Key Lock？

#### 锁继承机制

**如果允许 Insert Intention Lock 超越 Waiting Next-Key Lock**：

```plain
1. Thread 2 等待 gap (1, 100) 上的 Next-Key Lock
2. Thread 1 的 Insert Intention Lock 成功，插入记录 10
3. Gap 被分裂：
   - Gap (1, 10)
   - Gap (10, 100)
4. Thread 2 原本等待 1 个锁，现在变成等待 2 个锁！
5. 违反 InnoDB 的假设：一个事务最多等待一个锁
6. 锁唤醒机制失效
```

**因此必须**：

```plain
Insert Intention Lock 不能超越 Waiting Next-Key Lock
→ Insert Intention Lock 必须等待
→ 但 Next-Key Lock 也在等待 Insert Intention 所属事务的 Granted Lock
→ 形成死锁
```

---

## 锁机制详解

### InnoDB 锁类型

#### 1. Record Lock（记录锁）

```plain
锁定索引记录本身
标志：LOCK_REC_NOT_GAP
```

#### 2. Gap Lock（间隙锁）

```plain
锁定索引记录之间的间隙，不包括记录本身
标志：LOCK_GAP
```

#### 3. Next-Key Lock（临键锁）

```plain
Record Lock + Gap Lock
锁定记录及其之前的间隙：(prev_record, current_record]
标志：LOCK_ORDINARY
```

#### 4. Insert Intention Lock（插入意向锁）

```plain
特殊的 Gap Lock，用于插入操作
标志：LOCK_GAP | LOCK_INSERT_INTENTION
```

### 锁兼容性矩阵

Record Lock (S)
Record Lock (X)
Gap Lock
Next-Key Lock (X)
Insert Intention

**Record Lock (S)**
✅
❌
✅
❌
✅

**Record Lock (X)**
❌
❌
✅
❌
✅

**Gap Lock**
✅
✅
✅
✅
✅

**Next-Key Lock (X)**
❌
❌
✅
❌
**❌**

**Insert Intention**
✅
✅
✅
**❌**
✅

**关键点**：

- Insert Intention Lock 与 Next-Key Lock **不兼容**
- Insert Intention Lock 之间**兼容**（允许并发插入）

---

## 源码剖析

### 核心函数：rec_lock_check_conflict

```cpp
/**
 * 检查锁冲突
 * @param trx           请求锁的事务
 * @param type_mode     请求的锁类型和模式
 * @param lock2         已存在的锁
 * @param lock_is_on_supremum  是否在supremum记录上
 * @return NO_CONFLICT / CAN_BYPASS / HAS_TO_WAIT
 */
static inline Conflict rec_lock_check_conflict(
    const trx_t *trx,
    ulint type_mode,
    const lock_t *lock2,
    bool lock_is_on_supremum,
    Trx_locks_cache &trx_locks_cache)
{
    // 1. 同一事务的锁不冲突
    if (trx == lock2->trx) {
        return Conflict::NO_CONFLICT;
    }
    
    // 2. 锁模式兼容性检查
    if (lock_mode_compatible(
            static_cast&lt;lock_mode&gt;(LOCK_MODE_MASK & type_mode),
            lock_get_mode(lock2))) {
        return Conflict::NO_CONFLICT;
    }
    
    // 3. 高优先级事务优化
    const bool is_hp = trx_is_high_priority(trx);
    if (is_hp && lock2->is_waiting() && !trx_is_high_priority(lock2->trx)) {
        return Conflict::NO_CONFLICT;
    }
    
    // 4. Gap Lock 兼容性规则
    if ((lock_is_on_supremum || (type_mode & LOCK_GAP)) &&
        !(type_mode & LOCK_INSERT_INTENTION)) {
        return Conflict::NO_CONFLICT;
    }
    
    // 5. Record Lock 不等待 Gap Lock
    if (!(type_mode & LOCK_INSERT_INTENTION) && lock_rec_get_gap(lock2)) {
        return Conflict::NO_CONFLICT;
    }
    
    // 6. Gap Lock 不等待 Record Lock
    if ((type_mode & LOCK_GAP) && lock_rec_get_rec_not_gap(lock2)) {
        return Conflict::NO_CONFLICT;
    }
    
    // 7. 任何锁都不等待 Insert Intention Lock
    if (lock_rec_get_insert_intention(lock2)) {
        return Conflict::NO_CONFLICT;
    }
    
    // 8. ⭐ 关键逻辑：防止锁继承导致的问题
    /* This is very important that LOCK_INSERT_INTENTION should not overtake a
       WAITING Gap or Next-Key lock on the same heap_no, because the following
       insertion of the record would split the gap duplicating the waiting lock,
       violating the rule that a transaction can have at most one waiting lock. */
    if (!(type_mode & LOCK_INSERT_INTENTION) &&  // 不是 Insert Intention
        lock2->is_waiting() &&                    // lock2 是等待锁
        lock2->mode() == LOCK_X &&                // 都是 X 锁
        (type_mode & LOCK_MODE_MASK) == LOCK_X) 
    {
        // 优化：如果请求者已持有阻塞 lock2 的 granted lock，可以绕过
        if (trx_locks_cache.has_granted_blocker(trx, lock2)) {
            return Conflict::CAN_BYPASS;
        }
    }
    
    // 9. 默认：有冲突，需要等待
    return Conflict::HAS_TO_WAIT;
}
```

### 关键点解析

#### 1. Insert Intention Lock 被阻塞的机制

**代码路径**：

```cpp
// Insert Intention Lock 申请时
type_mode = LOCK_X | LOCK_GAP | LOCK_INSERT_INTENTION
lock2 = Waiting Next-Key Lock

检查流程：
1. 同一事务？ ❌
2. 锁模式兼容？ ❌ (X vs X)
3. 高优先级？ ❌
4-7. 各种优化规则？ ❌ (Insert Intention 不适用这些规则)
8. 特殊优化条件？
   !(type_mode & LOCK_INSERT_INTENTION) => FALSE
   不进入这个分支
9. 返回 HAS_TO_WAIT ⏰
```

**结论**：Insert Intention Lock 通过**默认冲突逻辑**被阻塞，而不是特殊代码。

#### 2. 为什么不能让 Insert Intention Lock 超越 Waiting Lock

**场景模拟**：

```plain
初始：gap (1, 100)，Thread 2 等待 Next-Key Lock

如果允许 Thread 1 的 Insert Intention Lock 成功：
    Thread 1: 插入记录 10
    ↓
    gap 分裂：(1, 10) + (10, 100)
    ↓
    记录 10 继承记录 100 的锁
    ↓
    Thread 2 现在等待 2 个锁：
        - (1, 10] 的 Next-Key Lock
        - (10, 100] 的 Next-Key Lock
    ↓
    违反"一个事务一个等待锁"的假设
    ↓
    锁管理混乱
```

---

## 修复方案

### MySQL 8.0.19 的修复

#### 提交信息

```plain
Bug #98324: Deadlock with 3 concurrent REPLACEs 
            with unique key retry

Fixed in: MySQL 8.0.19
Commit: WL#13304
```

#### 修复思路

**核心思想**：允许 Insert Intention Lock 在特定条件下绕过 Waiting Next-Key Lock

**修复代码**（伪代码）：

```cpp
// 在 rec_lock_check_conflict 中添加特殊处理
if ((type_mode & LOCK_INSERT_INTENTION) &&  // 是 Insert Intention
    lock2->is_waiting() &&                   // lock2 是等待锁
    trx_has_granted_blocker(trx, lock2))     // 申请者持有阻塞 lock2 的锁
{
    // 允许绕过：因为申请者本来就在 lock2 前面
    return Conflict::CAN_BYPASS;
}
```

### 修复逻辑详解

#### 修复前

```plain
Thread 1: 持有 X Next-Key Lock (granted)
Thread 2: 等待 X Next-Key Lock (waiting)

Thread 1 申请 Insert Intention Lock：
    ├─ 检测到 Thread 2 在等待
    ├─ Insert Intention Lock 必须等待
    └─ 死锁形成
```

#### 修复后

```plain
Thread 1: 持有 X Next-Key Lock (granted)
Thread 2: 等待 X Next-Key Lock (waiting)

Thread 1 申请 Insert Intention Lock：
    ├─ 检测到 Thread 2 在等待
    ├─ 检查：Thread 1 的 granted lock 是否阻塞 Thread 2？✅
    ├─ 允许 Thread 1 绕过（CAN_BYPASS）
    └─ Thread 1 成功插入，Thread 2 继续等待
```

### 为什么这样修复是安全的？

#### 1. 锁队列顺序保证

```plain
锁队列：[T1: granted] → [T2: waiting]

T1 的 Insert Intention Lock 绕过 T2：
    - T1 本来就在 T2 前面
    - T1 持有的 granted lock 正是阻塞 T2 的原因
    - 允许 T1 继续不会改变队列的本质顺序
```

#### 2. 锁继承问题解决

```plain
T1 插入记录后：
    - gap 确实会分裂
    - 但 T2 还在等待 T1 的 granted lock
    - 当 T1 释放锁时，T2 会被唤醒
    - T2 重新检查时会看到新的 gap 结构
    - 不会出现"等待多个锁"的问题
```

#### 3. 死锁避免

```plain
修复后：
    - T1 不需要等待 T2
    - T2 继续等待 T1
    - 单向等待，不会形成循环
    - 死锁消除 ✅
```

---

## 验证测试

### 测试环境

- MySQL 8.0.18 (修复前)
- MySQL 8.0.19+ (修复后)

### 测试脚本

```sql
-- 准备
CREATE TABLE t (a INT PRIMARY KEY, b INT UNIQUE KEY) ENGINE=InnoDB;
INSERT INTO t VALUES (1, 1), (100, 8);

-- Session 1
BEGIN;
REPLACE INTO t VALUES (10, 8);
-- 等待 Session 2 执行后继续...
COMMIT;

-- Session 2
BEGIN;
REPLACE INTO t VALUES (20, 8);
COMMIT;
```

### 测试结果

MySQL 版本
结果

8.0.18
💥 死锁 (ERROR 1213)

8.0.19+
✅ 正常执行（Session 2 等待，Session 1 完成后 Session 2 继续）

---

## 总结与建议

### 问题本质

1. **REPLACE INTO 的特殊性**：需要先检查唯一键冲突（加 Next-Key Lock），再删除后插入（申请 Insert Intention Lock）
2. **锁继承机制**：Insert Intention Lock 不能超越 Waiting Next-Key Lock，防止 gap 分裂导致锁管理混乱
3. **循环等待**：Thread 1 等待 Thread 2 的 Waiting Lock，Thread 2 等待 Thread 1 的 Granted Lock

### 修复方案

**核心**：允许持有 Granted Blocker 的事务绕过等待队列

**安全性**：

- 不改变锁队列的本质顺序
- 不引入新的死锁风险
- 保持锁继承机制的正确性

### 最佳实践建议

#### 1. 避免高并发 REPLACE INTO

```sql
-- ❌ 不推荐：高并发场景使用 REPLACE INTO
REPLACE INTO t VALUES (?, ?);

-- ✅ 推荐：使用 INSERT ... ON DUPLICATE KEY UPDATE
INSERT INTO t VALUES (?, ?) 
ON DUPLICATE KEY UPDATE a = VALUES(a), b = VALUES(b);
```

**原因**：

- `REPLACE` 需要 X Next-Key Lock（排他锁范围大）
- `INSERT ... ON DUPLICATE KEY UPDATE` 只需要 X Record Lock（锁范围小）

#### 2. 减小事务粒度

```sql
-- ❌ 不推荐：一个事务中多个 REPLACE
BEGIN;
REPLACE INTO t VALUES (10, 8);
REPLACE INTO t VALUES (20, 9);
REPLACE INTO t VALUES (30, 10);
COMMIT;

-- ✅ 推荐：单条语句，快速提交
REPLACE INTO t VALUES (10, 8);
```

#### 3. 使用合适的隔离级别

```sql
-- 如果业务允许，使用 READ COMMITTED
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

**注意**：READ COMMITTED 减少了 Gap Lock，但可能引入幻读问题。

#### 4. 监控死锁

```sql
-- 查看最近的死锁信息
SHOW ENGINE INNODB STATUS;
```

```sql
-- 启用死锁日志
SET GLOBAL innodb_print_all_deadlocks = ON;
```

#### 5. 升级到修复版本

如果使用 MySQL 8.0.18，强烈建议升级到 8.0.19 或更高版本。

---

## 参考资料

### 相关 Bug 报告

- **Bug #98324**: Deadlock with 3 concurrent REPLACEs with unique key retry
- **Work Log**: WL#13304

### 源码位置

```plain
storage/innobase/lock/lock0lock.cc
  - rec_lock_check_conflict()
  - lock_rec_add_to_queue()
  
storage/innobase/row/row0ins.cc
  - row_ins_scan_sec_index_for_duplicate()
  - row_ins_set_rec_lock()
```

### 相关文档

- [InnoDB Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- [INSERT Intention Locks](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html#innodb-insert-intention-locks)
- [Deadlock Detection](https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html)

---

## 附录：完整死锁日志示例

```plain
------------------------
LATEST DETECTED DEADLOCK
------------------------
2024-11-11 10:30:45 0x7f8c8c0b4700
*** (1) TRANSACTION:
TRANSACTION 421234567890, ACTIVE 2 sec inserting
mysql tables in use 1, locked 1
LOCK WAIT 4 lock struct(s), heap size 1136, 3 row lock(s), undo log entries 1
MySQL thread id 123, OS thread handle 140241234567890, query id 9876 localhost root update
REPLACE INTO t VALUES (10, 8)

*** (1) HOLDS THE LOCK(S):
RECORD LOCKS space id 123 page no 4 n bits 72 index b of table `test`.`t` 
trx id 421234567890 lock_mode X locks rec but not gap
Record lock, heap no 5 PHYSICAL RECORD: n_fields 2; ...

*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 123 page no 4 n bits 72 index b of table `test`.`t` 
trx id 421234567890 lock_mode X locks gap before rec insert intention waiting
Record lock, heap no 5 PHYSICAL RECORD: n_fields 2; ...

*** (2) TRANSACTION:
TRANSACTION 421234567891, ACTIVE 1 sec inserting
mysql tables in use 1, locked 1
LOCK WAIT 3 lock struct(s), heap size 1136, 2 row lock(s)
MySQL thread id 124, OS thread handle 140241234567891, query id 9877 localhost root update
REPLACE INTO t VALUES (20, 8)

*** (2) HOLDS THE LOCK(S):
(NONE)

*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 123 page no 4 n bits 72 index b of table `test`.`t` 
trx id 421234567891 lock_mode X waiting
Record lock, heap no 5 PHYSICAL RECORD: n_fields 2; ...

*** WE ROLL BACK TRANSACTION (2)
```

**日志解读**：

- Transaction (1)：持有 X Record Lock，等待 Insert Intention Lock
- Transaction (2)：等待 X Next-Key Lock
- 循环等待形成，InnoDB 选择回滚 Transaction (2)

---

**作者注**：本文基于 MySQL 8.0 源码分析和实际测试编写，涉及的源码版本为 MySQL 8.0.18 ~ 8.0.19。实际生产环境请根据具体情况调整和测试。
