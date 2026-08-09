---
title: "场景题：有一个用户提现 100 元，他的余额只有 100，如何在用户多次点击提现按钮的情况下，实现幂等"
sidebarGroup: "综合篇"
shortTitle: "场景题：有一个用户提现 100 元，他的余额只有 100，如何在用户多次点击提现按钮的情况下，实现幂等"
order: 119
date: 2026-05-21
category: "面试题"
tag:
  - "面试题"
description: "在用户多次点击提现按钮的情况下，确保提现操作的幂等性，需综合采用以下方案：1. 生成唯一提现票据（ Token ）实现逻辑：用户进入提现页面时，后端生成一个唯一 Token（如 UUID ），存储到Redis并设置较短的有效期（如5秒），同"
article: false
---

> 来源：[场景题：有一个用户提现 100 元，他的余额只有 100，如何在用户多次点击提现按钮的情况下，实现幂等](https://www.yuque.com/tulingzhouyu/db22bv/egyagslix1ni6rhk)

在用户多次点击提现按钮的情况下，确保提现操作的幂等性，需综合采用以下方案：

### 1. **生成唯一提现票据（ Token ）**

- **实现逻辑**：用户进入提现页面时，后端生成一个唯一 Token（如 UUID ），存储到Redis并设置较短的有效期（如5秒），同时返回给前端。每次提现请求必须携带此 Token。
- **作用**：防止用户短时间内重复提交请求，因为每次提现需先获取新 Token，而重复点击会导致后续请求无有效 Token。

### 2. **提现请求校验 Token**

- **实现逻辑**：提现接口需校验请求中的 Token 是否存在且有效。若 Token 不存在或已失效，直接返回“重复请求”错误。
- **示例流程**：

```java
// 伪代码：校验 Token
String token = request.getParameter("token");
if (!redis.exists(token)) {
    return "重复请求，请重新发起提现";
}
redis.del(token); // 删除 Token，确保仅一次使用
```

### 3. **数据库唯一索引防重**

- **实现逻辑**：创建提现流水表，以订单号（`order_id`）或 Token 作为唯一索引。处理提现时，先插入流水记录，利用数据库的唯一约束阻止重复操作。
- **表结构示例**：

```plsql
CREATE TABLE withdraw_record (
  order_id VARCHAR(64) PRIMARY KEY,
  user_id BIGINT,
  amount DECIMAL(10,2),
  status TINYINT
);
```

- **操作步骤**：

1. 插入流水记录：`INSERT INTO withdraw_record (order_id, user_id, amount, status) VALUES ('order_123', 1001, 100.00, 1)`。
2. 若插入失败（唯一索引冲突），直接返回“提现已处理”。

### 4. **乐观锁控制余额更新**

- **实现逻辑**：更新用户余额时，增加版本号字段（`version`），仅当版本号匹配时才执行扣款，防止并发覆盖。
- **SQL 示例**：

```plsql
UPDATE account 
SET balance = balance - 100, version = version + 1 
WHERE user_id = 1001 AND balance >= 100 AND version = 1;
```

- **校验结果**：若影响行数为0，说明余额不足或版本号不匹配，返回“提现失败”。

### 5. **分布式锁防止并发**

- **实现逻辑**：在扣款前，使用 Redis 分布式锁（如`SETNX`命令）锁定用户 ID 或订单号，确保同一时间仅一个请求处理提现。
- **伪代码示例**：

```java
String lockKey = "withdraw_lock:" + userId;
boolean locked = redis.setnx(lockKey, "1", 10); // 锁超时10秒
if (!locked) {
    return "系统繁忙，请稍后重试";
}
try {
    // 执行扣款和流水插入操作
} finally {
    redis.del(lockKey); // 释放锁
}
```

### 6. **事务与回滚机制**

- **实现逻辑**：将插入流水记录和更新余额操作放在同一数据库事务中，确保原子性。若任一操作失败，事务回滚。
- **示例**：

```plsql
BEGIN TRANSACTION;
  INSERT INTO withdraw_record ...;
  UPDATE account ...;
COMMIT;
```

### 7. **结果缓存与快速响应**

- **实现逻辑**：提现成功后，将结果（如订单状态）缓存到 Redis。后续相同请求直接返回缓存结果，避免重复处理。
- **示例**：

```java
String resultKey = "withdraw_result:" + orderId;
redis.setex(resultKey, 3600, "success"); // 缓存1小时
```

### 最终流程整合（实质上以下流程并不是所有节点都需要，按实际需求进行选择，下面的处理过程是悲观中的悲观解决方案）

1. 用户点击提现按钮，前端向后端申请Token。
2. 后端生成 Token 并存入 Redis，返回给前端。
3. 用户提交提现请求，携带 Token、金额和用户信息。
4. 后端校验 Token 有效性，无效则直接拒绝。
5. 获取分布式锁，防止并发请求。
6. 插入提现流水记录，利用唯一索引拦截重复请求。
7. 使用乐观锁更新用户余额，确保扣款安全。
8. 事务提交后释放分布式锁，并缓存提现结果。
9. 后续重复请求因 Token 失效、流水记录冲突或缓存命中，直接返回首次结果。

### 注意事项

- **Token 有效期**：需根据前端交互合理设置，过长可能导致安全性问题，过短可能影响用户体验。
- **锁超时时间**：需大于事务处理时间，避免锁提前释放导致并发问题。
- **对账机制**：极端情况下（如扣款成功但响应超时），需有定时任务核对流水与账户余额，修复不一致。

通过上述方案，即使多次点击提现按钮，也能保证仅扣款一次，实现接口的幂等性。
