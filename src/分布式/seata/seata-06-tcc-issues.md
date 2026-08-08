---
title: "TCC 三大优势与空回滚、悬挂、幂等"
sidebarGroup: "Seata"
shortTitle: "06 TCC 常见问题"
order: 6
date: 2026-09-06
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "TCC"
description: "TCC 相对 AT 的效率优势（非阻塞预留、异步二阶段、RPC 减半），以及幂等、空回滚、防悬挂三大问题的成因与 tcc_fence_log 解法。"
---

> **Seata 系列 · 第 6/8 篇**  
> 上一篇：[《Seata TCC 模式实战：库存、订单与秒杀》](/分布式/seata/seata-05-tcc-practice)  
> 下一篇：[《Seata TCC 核心源码：切面、Fence、XID 传递》](/分布式/seata/seata-07-tcc-source)

---

## 开头：TCC 快在哪，又容易踩哪些坑？

[上一篇 TCC 实战](/分布式/seata/seata-05-tcc-practice) 走通了 Try-Confirm-Cancel 代码路径。TCC 最大卖点是**效率**；但二阶段由 TC 异步驱动、网络不可靠，会引出**幂等、空回滚、悬挂**三个经典问题。本文先讲优势，再逐一拆解成因与解法。

---

## 一、TCC 三大优势

### 1.1 Try 阶段不阻塞等待

TCC 在 Try 阶段的「锁定」并非数据库意义上的阻塞锁，而是**提交本地事务、把资源预留到中间态**（如冻结余额/库存），无需长时间持锁等待，效率高于 XA/传统两阶段。

![TCC Try 阶段资源预留示意](/分布式/seata/p078-01.png)

### 1.2 异步二阶段

Try 成功后，TM 认为全局事务已结束，由**定时任务异步**执行 Confirm/Cancel，释放或扣减资源——业务线程不必同步等待二阶段完成，吞吐更高。

### 1.3 RPC 次数减少约 50%

标准 TCC 流程（两分支）中，TM↔TC、TC↔RM 合计 **4 次 RPC**：

![标准 TCC 中 TM/TC/RM 四次 RPC](/分布式/seata/p079-01.png)

优化后：

![优化后 TCC：分支状态存本地，RPC 减半](/分布式/seata/p080-01.png)

- TC 只保存全局事务状态
- TM 开启全局事务时，RM **不再向 TC 注册分支**，分支状态存本地
- TM 提交/回滚后，RM 异步线程查本地未提交分支，再向 TC 拉取全局状态决定 Confirm/Cancel

**RPC 减半，性能大幅提升。**

---

## 二、问题一：幂等

### 2.1 定义

对同一分布式事务的同一分支，**重复调用二阶段 Confirm/Cancel** 不应重复扣款或重复释放资源。网络超时、重试都可能导致二阶段重复执行；幂等没做好可能**资损**。

### 2.2 错误做法

```java
// 读-改-写，并发下单次扣减 OK，但无法防「执行两次 Confirm 扣两次」
Account account = accountDao.selectById(userId);
account.setBalance(account.getBalance() - 1000);
accountDao.update(account);
```

### 2.3 正确思路

**方案 A：业务状态判断**

转账 Confirm 时，若订单状态已是「已支付」，直接 `return`。

**方案 B：去重表**

以订单 ID 为唯一键插入去重表，重复插入失败则视为已处理。

**方案 C：TCC 控制表 status 字段（Seata 推荐）**

| status 值 | 含义 |
|-----------|------|
| 1 tried | 一阶段完成 |
| 2 committed | 二阶段已提交 |
| 3 rollbacked | 二阶段已回滚 |

Confirm/Cancel 执行后更新 status；重复调用时检查状态即可。

![TCC 幂等：通过状态字段防重复二阶段](/分布式/seata/p081-01.png)

---

## 三、问题二：空回滚

### 3.1 定义

**未执行 Try，却收到了 Cancel**——「没有 Try，只有 Cancel」。

典型时序：

```
Try 超时（丢包） → TC 决议回滚 → 触发 Cancel → RM 从未收到 Try
```

![空回滚时序：Cancel 先于 Try 到达](/分布式/seata/p082-01.png)

### 3.2 业务层解法

Cancel 中判断：若上下文中订单号不存在或订单记录不存在，**直接 return 成功**——核心思想：**回滚时业务数据为空，视为空回滚**。

也可在一阶段 Try 成功后写事务控制表，Cancel 时查不到记录则空回滚返回。

### 3.3 Seata 解法：tcc_fence_log

- Try 成功 → 向 `tcc_fence_log` 插入记录
- Rollback 时查表：有 Try 记录才执行 Cancel；**无记录则空回滚，直接成功**

![Seata tcc_fence_log 防空回滚](/分布式/seata/p083-01.png)

---

## 四、问题三：防悬挂

### 4.1 定义

**Cancel 比 Try 先执行**（二阶段跑到一阶段前面），称为悬挂/倒挂。

时序：

```
Try 超时（拥堵） → TC 触发 Cancel → Cancel 先执行 → 迟到的 Try 再执行 → 数据不一致
```

或：Try 执行慢，TC 已 Cancel，随后 Try 又成功——Try 预留的资源无法被正常提交/回滚。

![防悬挂：Cancel 先于 Try 到达](/分布式/seata/p084-01.png)

### 4.2 原则

一旦出现悬挂，**迟到的 Try 不能再成功执行**——否则全局已回滚，Try 却预留了资源，后续无法对齐。

### 4.3 解法

二阶段 Cancel 执行时插入控制记录，状态为**已回滚**。  
一阶段 Try 执行前先查表：**若已有回滚记录，拒绝 Try**。

Seata 在空回滚插入 `tcc_fence_log` 时，若 Try 随后到达，`prepareFence` 会因主键冲突而失败，从而**拒绝悬挂后的 Try**。

---

## 五、三问题对照表

| 问题 | 成因 | 核心解法 |
|------|------|----------|
| **幂等** | 二阶段重复 RPC | status 字段 / 去重表 / 业务状态判断 |
| **空回滚** | Try 丢包，Cancel 先到 | Cancel 时无 Try 记录则直接成功 |
| **防悬挂** | Cancel 先于 Try | Try 前检查是否已回滚；fence 表主键冲突拒绝 Try |

Seata 统一通过 **`tcc_fence_log` + `useTCCFence=true`** 在框架层处理，详见 [下一篇源码解读](/分布式/seata/seata-07-tcc-source)。

---

## 六、库存扣减再回顾

初始库存 100，Try 扣 30：

| 阶段 | 可用 | 冻结 |
|------|------|------|
| Try | 70 | 30 |
| Confirm | total→70 | 0 |
| Cancel | 100 | 0 |

三个方法业务自己实现，调用方**只调 Try**；Confirm/Cancel 由 Seata 在二阶段回调。

---

## 小结

- TCC 优势：非阻塞预留、异步二阶段、RPC 减半。
- 生产必做：Confirm/Cancel **幂等**、Cancel **识别空回滚**、Try **拒绝悬挂**。
- Seata 提供 `tcc_fence_log` 屏障表，开启 `useTCCFence=true` 即可框架级防护。

下一篇深入 **GlobalTransactionScanner、TccActionInterceptor、TCCFenceHandler** 源码，把上述机制落到具体类与方法。

---

## 系列导航

| 篇目 | 主题 |
|------|------|
| [05 TCC 实战](/分布式/seata/seata-05-tcc-practice) | 库存/订单/秒杀代码 |
| **06 TCC 常见问题** | 本文 |
| [07 TCC 源码](/分布式/seata/seata-07-tcc-source) | 切面、Fence、XID |
| [08 隔离与面试](/分布式/seata/seata-08-isolation-interview) | RC、脏读写、面试题 |
