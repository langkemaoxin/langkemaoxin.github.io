---
title: "隔离性、脏读写防护与 Seata 面试题"
sidebarGroup: "Seata"
shortTitle: "08 隔离性与面试"
order: 8
date: 2026-09-06
category: "分布式"
tag:
  - "分布式"
  - "Seata"
description: "Seata 默认 RU 与 RC 实现、全局锁与 @GlobalLock 防脏读脏写、AT 一阶段流程面试题，以及 XA 与 Seata AT 架构/锁资源对比；Seata 系列收官。"
---

> **Seata 系列 · 第 8/8 篇**  
> 上一篇：[《Seata TCC 核心源码：切面、Fence、XID 传递》](/分布式/seata/seata-07-tcc-source)

---

## 开头：Seata 默认不是 RC，面试却常问怎么做到 RC

[源码篇](/分布式/seata/seata-07-tcc-source) 已讲 `@GlobalLock` 与全局锁检查。本文系统回答：**Seata 隔离级别到底是什么、脏读/脏写如何产生、三种防护方案、AT 流程与 XA 对比**——也是 Seata 系列最后一篇，汇总前 7 篇核心脉络。

---

## 一、数据库隔离级别回顾

| 级别 | 说明 | 典型默认 |
|------|------|----------|
| **RU** Read Uncommitted | 可见未提交修改 | 很少用 |
| **RC** Read Committed | 仅见已提交修改 | Oracle |
| **RR** Repeatable Read | 同事务多次读一致 | MySQL |
| **Serializable** | 串行执行 | 最高，锁争用大 |

业务多数场景 **RC 已够用**；但 Seata 全局事务默认**达不到 RC**，而是 **RU**——这是面试高频点。

---

## 二、Seata 为何默认 RU？

Seata 全局事务包含多个**分支本地事务**。一阶段 RM **直接提交本地事务**（AT/TCC 均如此），全局事务尚未结束。

若不做额外措施：

- 某分支已提交 → 其他事务**能读到** → **脏读**（相对全局而言是「全局未提交数据」）
- 外部事务修改分支已写行 → 全局回滚失败 → **脏写**

传统脏读是「读到未提交」；Seata 脏读是「读到**全局未提交**但**分支已提交**的数据」。

![Seata 脏读：分支已提交、全局未结束](/分布式/seata/p127-01.png)

> 绝大多数业务在 RU 下仍可接受；极端场景需主动升级到 RC。

---

## 三、Seata 隔离级别结论

| 组合 | 隔离级别 | 脏读/脏写 |
|------|----------|-----------|
| **Seata 事务 ↔ Seata 事务** | **RC** | 全局锁保障，无脏读 |
| **Seata 事务 ↔ 独立本地事务** | **RU** | 存在脏读、脏写 |

---

## 四、AT 模式全局锁流程

Seata 将 XA 的「二阶段持锁」拆成 **本地锁 + 全局锁**：

![分布式事务锁获取流程：本地锁 → 全局锁 → 提交](/分布式/seata/p118-01.png)

1. 获取**本地锁**，修改本地数据，**暂不提交**
2. 向 TC **申请全局锁**
3. 本地锁 + 全局锁均到位 → **提交本地事务**，释放本地锁
4. 全局二阶段结束后释放**全局锁**

AT 通过 `DataSourceProxy` 代理实现；全局锁隐藏在代理逻辑中（见 [07 源码篇](/分布式/seata/seata-07-tcc-source)）。

---

## 五、Seata + 独立事务：脏读脏写场景

![Seata 事务与独立事务并发修改同一行](/分布式/seata/p129-01.png)

- **业务一**：Seata 全局事务，分支 A 改行 A，分支 B 改行 B
- **业务二**：独立本地事务，只改行 A

时序：

1. 业务一分支 A 持本地锁
2. 业务二等分支 A 释放本地锁后，改 A 并**提交**
3. 业务一全局回滚 → 分支 A 无法恢复 → **脏写**；业务二则 **脏读** 了分支 A 中间态

---

## 六、三种防护方案

### 6.1 方案一：独立事务也加 @GlobalTransactional

业务二开启全局事务 → 注册分支申请全局锁 → 发现业务一未结束 → **提交失败回滚**，避免脏写。

![方案一：独立事务升级为 @GlobalTransactional](/分布式/seata/p130-01.png)

代价：多一次 begin/commit RPC，较重。

### 6.2 方案二：@GlobalLock（推荐轻量）

不开启全局事务；本地提交前 `checkLock` 检查 TC 全局行锁，冲突则**抛异常回滚**。

![方案二：@GlobalLock 提交前检查全局锁](/分布式/seata/p131-01.png)

比 `@GlobalTransactional` 少 begin/提交等 RPC，性能更好（见 [07 篇 GlobalLock 价值](/分布式/seata/seata-07-tcc-source#63-globallock-的价值)）。

### 6.3 方案三：@GlobalLock + SELECT FOR UPDATE

希望**等待**而非直接失败：`SELECT ... FOR UPDATE` 在 `SelectForUpdateExecutor` 中循环检查全局锁，锁释放后再执行 UPDATE。

![方案三：@GlobalLock + SELECT FOR UPDATE 等待重试](/分布式/seata/p132-01.png)

- 彻底防脏读 + 脏写
- 独立事务可最终提交（阻塞等待）
- 查询接口无 `@GlobalTransactional` 时：`@GlobalLock` + `FOR UPDATE`；已在事务链外层有 GT 时，**仅加 FOR UPDATE** 即可

---

## 七、压测与模式选型参考

社区单机 JMeter 参考（环境差异大，仅看量级）：

![压测参考：TCC ~100 TPS，AT ~20 TPS](/分布式/seata/p126-01.png)

![高并发下 AT 成功率显著低于 TCC](/分布式/seata/p126-02.png)

| 模式 | 100 并发 | 1000 并发 |
|------|----------|-----------|
| AT | 成功率 ~23%–29% | ~26%–28% |
| TCC | 成功率 ~80%–98% | ~48% |

生产多为 **Seata 事务 + 独立事务** 混合；并非所有操作都需要 `@GlobalTransactional`。

---

## 八、面试题精选

### Q1：Seata 如何保证 RC 隔离性？

**答**：

- 默认全局事务隔离级别 **RU**（一阶段分支已提交）
- 要 **RC**：依赖 **全局写排他锁**
  - **脏读**：`SELECT ... FOR UPDATE` + `@GlobalLock` 或 `@GlobalTransactional`（检查/持有全局锁）
  - **脏写**：写操作须 `@GlobalTransactional` 注册分支拿全局锁
- 仅查询、不需全局事务：`@GlobalLock` + `FOR UPDATE` 更轻量

![面试：SELECT FOR UPDATE 申请全局锁](/分布式/seata/p133-01.png)

要点：

- Seata **未代理所有 SELECT**，仅 **`FOR UPDATE`**
- `FOR UPDATE` 若全局锁被占：释放本地执行 → 重试，直到读到已提交数据
- `@GlobalLock` 省去 begin/commit 等无用 RPC

### Q2：说说 Seata AT 模式事务流程

**角色**：TC 协调、TM 边界、RM 分支。

![Seata AT 角色：TC / TM / RM](/分布式/seata/p134-01.png)

**流程**：

1. TM 向 TC **begin**，获得 **XID**
2. XID 在调用链传播（[07 篇 XID 传递](/分布式/seata/seata-07-tcc-source#七xid-远程传递)）
3. RM 执行分支：**解析 SQL → 写 undo_log → 执行业务 SQL → 申请全局锁 → 提交本地事务 → 汇报 TC**
4. TM 根据分支结果 **commit/rollback** 全局事务
5. TC 驱动各 RM 二阶段

**undo_log 示例**（节选）：

```json
{
  "branchId": 641789253,
  "xid": "xid:xxx",
  "undoItems": [{
    "sqlType": "UPDATE",
    "beforeImage": { "tableName": "product", "rows": [...] },
    "afterImage":  { "tableName": "product", "rows": [...] }
  }]
}
```

**一阶段已提交，为何能回滚？**  
依赖客户端 `undo_log` 表，二阶段回滚读 beforeImage 生成反向 SQL，**不依赖 DB 原生回滚**。

**二阶段提交**：异步删 `undo_log`，非再次 commit。  
**二阶段回滚**：查 `undo_log`，对比 afterImage 与当前数据（防脏写），执行回滚 SQL。

![AT 一阶段提交与全局锁](/分布式/seata/p136-01.png)

![AT 二阶段异步删除 undo_log](/分布式/seata/p136-02.png)

![AT 二阶段回滚读 undo_log](/分布式/seata/p137-01.png)

![全局锁释放时机：提交异步删日志；回滚持锁至二阶段结束](/分布式/seata/p137-02.png)

### Q3：XA 与 Seata AT 有何区别？

![XA 与 Seata AT 架构对比](/分布式/seata/p138-01.png)

| 维度 | **XA** | **Seata AT** |
|------|--------|--------------|
| **RM 位置** | 数据库层（XA 驱动） | 应用侧二方包（`DataSourceProxy`） |
| **协议依赖** | 数据库支持 XA | 不依赖 XA，只需本地事务 + undo_log |
| **微服务友好** | 需两套驱动适配 | 统一 JDBC 代理 |
| **锁持有** | Phase2 完成才释放 | 本地锁 Phase1 结束释放；全局锁提交即释（回滚持至 Phase2） |
| **连接占用** | 长 | 短，吞吐更高 |

![XA 锁资源占用至 Phase2 结束](/分布式/seata/p138-02.png)

![Seata 本地锁/全局锁分离，占用时间更短](/分布式/seata/p139-01.png)

Seata AT 可视为 **XA 两阶段提交的改进版**：

- **架构**：RM 上移到应用，剥离 DB 协议强依赖
- **两阶段**：Phase1 即可提交本地事务（undo_log 保证回滚），90%+ 成功路径缩短持锁
- **并发**：本地锁随本地事务结束释放；全局锁在**全局提交决议后**即可释放（回滚例外）

![Seata 相对 XA 的锁与连接优化总结](/分布式/seata/p139-02.png)

![Seata AT 改进 XA 的核心设计点](/分布式/seata/p140-01.png)

---

## 九、Seata 系列回顾

| 篇 | 主题 | 关键词 |
|----|------|--------|
| [01](/分布式/seata/seata-01-distributed-tx-overview) | 场景与总览 | CAP、2PC、Seata 架构 |
| [02](/分布式/seata/seata-02-at-mode) | AT 模式 | TM/RM/TC、undo_log、vs XA |
| [03](/分布式/seata/seata-03-tc-server) | TC 部署 | file/db 存储、Nacos 集群 |
| [04](/分布式/seata/seata-04-at-tm-rm) | AT 实战 | `@GlobalTransactional`、秒杀 |
| [05](/分布式/seata/seata-05-tcc-practice) | TCC 实战 | Try/Confirm/Cancel、三服务 |
| [06](/分布式/seata/seata-06-tcc-issues) | TCC 三坑 | 幂等、空回滚、悬挂 |
| [07](/分布式/seata/seata-07-tcc-source) | TCC 源码 | Scanner、Fence、XID |
| **08** | **隔离与面试** | **RC/RU、脏读写、XA vs AT** |

**选型速记**：

- **接入成本优先** → AT + 合理划分 `@GlobalTransactional` 边界
- **性能 / 高并发** → TCC 或 Saga；AT 慎用于热点写
- **混合事务** → 读用 `@GlobalLock` + `FOR UPDATE`，写用 GT 或升级方案
- **隔离敏感** → 全局锁 + 明确 RC 场景，勿假设默认 RC

---

## 参考

- [Seata 官方文档](http://seata.io/zh-cn/docs/overview/what-is-seata.html)
- [Seata AT 全局锁说明](https://seata.io/zh-cn/blog/seata-at-lock.html)

---

## 系列导航

| 篇目 | 主题 |
|------|------|
| [07 TCC 源码](/分布式/seata/seata-07-tcc-source) | 切面、Fence、XID |
| **08 隔离与面试** | 本文（系列收官） |
| [01 场景与总览](/分布式/seata/seata-01-distributed-tx-overview) | 回到系列起点 |
