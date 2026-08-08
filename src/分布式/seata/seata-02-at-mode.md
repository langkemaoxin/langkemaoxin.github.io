---
title: "Seata AT 模式：角色、两阶段与 XA 对比"
sidebarGroup: "Seata"
shortTitle: "02 AT 模式"
order: 2
date: 2026-09-06
category: "分布式"
tag:
  - "分布式"
  - "Seata"
description: "深入 Seata AT 模式：TC/TM/RM 职责、两阶段提交流程、undo_log 与经典 XA 的差异及优势。"
---

> **Seata 系列 · 第 2/8 篇**  
> 上一篇：[《分布式事务场景与 Seata 总览》](/分布式/seata/seata-01-distributed-tx-overview)  
> 下一篇：[《搭建 Seata TC：file/db 存储与 Nacos 集群》](/分布式/seata/seata-03-tc-server)

---

## 开头：AT 模式「业务侵入小」到底小在哪？

[上一篇](/分布式/seata/seata-01-distributed-tx-overview) 已说明分布式事务为何出现、Seata 中 AT 与 TCC 的分工。本文聚焦 **AT（Automatic Transaction）模式**：它在 XA 两阶段提交思想上演进，通过 **undo_log（回滚日志）** 让分支事务在一阶段即可提交并释放锁，从而兼顾一致性与吞吐。

下文按「角色 → 整体 2PC → 一阶段 → 二阶段 → 对比 XA → 秒杀架构」展开。

---

## 一、AT 与 XA 的渊源

Seata AT 模式基于 **XA 事务**演进而来。

**XA** 是数据库实现的分布式事务协议，本质仍是**两阶段提交（2PC）**，需要数据库支持（MySQL 5.6+、Oracle、DB2 等均实现 XA 接口）。应用通过 XA 接口协调多个资源管理器，但资源锁往往要持有到二阶段结束，并发能力受限。

AT 模式同样采用 2PC 框架，但**一阶段就提交本地事务**，靠 undo_log 保证二阶段可回滚——这是与经典 XA 最核心的区别（详见第四节）。

---

## 二、三大角色与职责

![Seata AT 三大角色](/分布式/seata/p016-01.png)

| 角色 | 英文 | 职责 |
|------|------|------|
| **TC** | Transaction Coordinator | 维护全局事务运行状态；协调并驱动**全局提交**或**全局回滚** |
| **TM** | Transaction Manager | 控制全局事务**边界**；开启全局事务；最终发起全局提交/回滚**决议** |
| **RM** | Resource Manager | 控制**分支事务**；向 TC 注册分支、上报状态；接收 TC 指令驱动分支提交/回滚 |

在 Spring Cloud 应用中：

- **TM** 通常落在发起全局事务的服务（如秒杀聚合服务），通过 `@GlobalTransactional` 标注。
- **RM** 落在持有数据库资源的各微服务，通过 **DataSourceProxy** 代理数据源，自动参与分支事务。
- **TC** 即独立部署的 **seata-server**，本系列 [第 3 篇](/分布式/seata/seata-03-tc-server) 专门搭建。

**Branch（分支）**：分布式事务中每一个独立的本地事务，对应一个 RM 在某库上的一次参与。

---

## 三、AT 模式 2PC 基本处理逻辑

整体可概括为：**TM 开启全局事务 → 各 RM 执行分支并注册 → TM 决议 → TC 驱动二阶段**。

![AT 模式 2PC 基本处理逻辑](/分布式/seata/p017-01.png)

与标准 2PC 的对应关系：

| 阶段 | AT 模式行为 |
|------|-------------|
| **一阶段** | 各 RM 执行业务 SQL；解析 SQL 生成 **前后镜像**，写入 **undo_log**；**本地事务提交**（含业务更新 + undo_log） |
| **二阶段** | TC 根据 TM 决议：**全局提交**则异步删 undo_log；**全局回滚**则根据 undo_log 生成反向 SQL 执行 |

---

## 四、一阶段：undo_log 与「提前提交」

### 4.1 工作机制

Seata 的 **JDBC 数据源代理**在执行业务 SQL 时：

1. 解析 SQL，组织更新前后的**数据镜像**；
2. 将镜像写入 **undo_log**；
3. 利用本地事务的 ACID，把**业务更新**与 **undo_log 写入**放在**同一个本地事务**里提交。

因此保证：**任何已提交的业务数据更新，必有对应回滚日志**。

基于这一机制，分支本地事务可以在**全局事务一阶段就提交**，并**立即释放**行锁等资源。

![一阶段：业务更新与 undo_log 同事务提交](/分布式/seata/p017-02.png)

### 4.2 与 XA 的关键差异

经典 **XA / 2PC** 中，资源锁通常要持续到**二阶段实际提交或回滚**，持有时间长、并发差。

**AT 一阶段即可释放锁**，功劳在于 undo_log：即使全局最终回滚，也能靠日志反解析成 SQL 做补偿，而不必长时间占锁。

| 对比项 | XA | Seata AT |
|--------|-----|----------|
| 一阶段本地事务 | 未真正提交，资源仍被 XA 锁住 | **已提交**，锁释放 |
| 回滚依据 | 数据库 XA 回滚 | **undo_log** 生成反向 SQL |
| 业务改造 | 需 XA 数据源、侵入较大 | 代理数据源 + 注解，侵入小 |
| 隔离性 | 强（锁持有久） | 默认 AT 隔离级别为 **RC**，需额外手段防脏读（见系列第 8 篇） |

---

## 五、二阶段：全局提交 vs 全局回滚

### 5.1 场景一：全局提交

若 TM 决议为**全局提交**，各分支在一阶段**已经完成本地提交**，二阶段**无需再对业务数据做同步协调**，TC 只需**异步清理 undo_log**，Phase2 可极快完成。

![全局提交：二阶段异步清理 undo_log](/分布式/seata/p018-01.png)

```
TM ──决议提交──> TC
                  │
                  ├──> RM1：异步删除 undo_log（业务数据已在一阶段提交）
                  └──> RM2：异步删除 undo_log
```

### 5.2 场景二：全局回滚

若 TM 决议为**全局回滚**，TC 通知各 RM。RM 根据 **XID + Branch ID** 找到 undo_log，**反解析**成反向 UPDATE/DELETE 等 SQL 并执行，完成分支回滚。

![全局回滚：根据 undo_log 执行反向 SQL](/分布式/seata/p019-01.png)

```
TM ──决议回滚──> TC
                  │
                  ├──> RM1：读 undo_log → 生成反向 SQL → 执行
                  └──> RM2：读 undo_log → 生成反向 SQL → 执行
```

### 5.3 一阶段与二阶段时序（简图）

![AT 一阶段与二阶段时序](/分布式/seata/p018-02.png)

![AT 全局回滚分支处理](/分布式/seata/p018-03.png)

![二阶段回滚细节](/分布式/seata/p019-02.png)

---

## 六、AT 相对 XA 的优势（归纳）

1. **性能**：一阶段释放锁，吞吐明显高于长时间锁资源的 XA。
2. **回滚效率**：二阶段异常回滚时，只需查 undo_log 反解析 SQL，不必依赖数据库 XA 接口整段回滚。
3. **无侵入**：通过 **DataSourceProxy** 拦截 SQL 自动写 undo_log，业务 SQL 基本不改。
4. **运维成熟**：TC 可 file/db 存储、Nacos 注册，与 Spring Cloud Alibaba 集成路径清晰（见 [第 3、4 篇](/分布式/seata/seata-03-tc-server)）。

注意：AT 适合**关系型数据库**且以 UPDATE/DELETE 为主的场景；跨服务调用链还需正确传递 **XID**（[第 4 篇](/分布式/seata/seata-04-at-tm-rm) 实战）。

---

## 七、10WQPS 秒杀的 AT 分布式事务架构

高并发秒杀中，**库存服务**与**订单服务**分库部署。秒杀入口服务作为 **TM**，在 `@GlobalTransactional` 方法内 Feign 调用库存扣减与订单创建；两服务作为 **RM**，各自库中需有 **undo_log** 表；**TC** 集群记录全局/分支会话。

![秒杀 AT 分布式事务架构](/分布式/seata/p020-01.png)

典型调用：

```
Seckill(TM)  @GlobalTransactional
    ├──> Order(RM)   addOrder()     @Transactional + undo_log
    └──> Stock(RM)   minusStock()   @Transactional + undo_log
```

TM/RM 配置、代码与 undo_log 表结构见 [第 4 篇](/分布式/seata/seata-04-at-tm-rm)；TC 搭建见 [第 3 篇](/分布式/seata/seata-03-tc-server)。

---

## 八、与 TCC 如何选型（预告）

| 维度 | AT | TCC |
|------|-----|-----|
| 侵入性 | 低 | 高（Try/Confirm/Cancel） |
| 适用 | 多 DB CRUD | 需显式预留/释放资源 |
| 性能 | 一阶段提交，较好 | Try 可不阻塞，Confirm 异步（第 5 篇） |

同一秒杀业务既可 AT 也可 TCC 实现；AT 上手快，TCC 控制更细。

---

## 小结

- **AT = 2PC 框架 + undo_log + 一阶段本地提交**。
- **TC / TM / RM** 分工：协调、边界、分支。
- 相对 **XA**，AT 用 undo_log 换锁持有时间，显著提升并发，但需理解默认隔离级别与防脏读方案。
- 下一篇动手搭建 **seata-server（TC）**：file 单机与 db + Nacos 集群。
