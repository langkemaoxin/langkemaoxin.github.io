---
title: "Seata 内核源码深化：与分布式专栏互补"
sidebarGroup: "Seata 内核"
shortTitle: "01 Seata 内核源码"
order: 10
date: 2026-09-07
category: "微服务"
tag:
  - "微服务"
  - "Seata"
  - "源码"
description: "从 TC 协调器、GlobalSession/BranchSession、DataSourceProxy 与 undo 执行链深入 Seata 内核，与分布式专栏 AT/TCC 用法互补。"
---

> **微服务 · Seata 内核 · 第 1/1 篇**  
> 上一篇：[《Sentinel 核心架构源码剖析》](/微服务/sentinel/sentinel-01-architecture)  
> 下一篇：[《Spring 扩展点在微服务组件中的应用》](/微服务/spring-ext/spring-ext-01-extension-points)

---

## 与分布式专栏的关系

本文是**微服务专栏的内核深化篇**，不重复 AT/TCC 入门与实战。用法、模式选型、环境搭建请优先阅读 [分布式 · Seata](/分布式/seata/seata-01-distributed-tx-overview) 系列：

| 篇目 | 链接 | 本文关系 |
|------|------|----------|
| 01 场景与总览 | [分布式事务场景与 Seata 总览](/分布式/seata/seata-01-distributed-tx-overview) | 问题背景与生态定位 |
| 02 AT 模式 | [Seata AT 模式：角色、两阶段与 XA 对比](/分布式/seata/seata-02-at-mode) | AT 两阶段**概念**；本文补**源码类图与调用链** |
| 03 TC 搭建 | [搭建 Seata TC：file/db 存储与 Nacos 集群](/分布式/seata/seata-03-tc-server) | TC 部署；本文补 **DefaultCoordinator / Core** |
| 04 AT 实战 | [AT 模式 TM/RM 接入与秒杀实战](/分布式/seata/seata-04-at-tm-rm) | 接入配置；本文补 **DataSourceProxy / ConnectionProxy** |
| 05 TCC 实战 | [Seata TCC 模式实战：库存、订单与秒杀](/分布式/seata/seata-05-tcc-practice) | TCC 业务写法 |
| 06 TCC 问题 | [TCC 空回滚、悬挂与幂等](/分布式/seata/seata-06-tcc-issues) | TCC 边界案例 |
| 07 TCC 源码 | [Seata TCC 模式源码解析](/分布式/seata/seata-07-tcc-source) | TCC 分支实现 |
| 08 隔离性 | [Seata 隔离性与面试要点](/分布式/seata/seata-08-isolation-interview) | 全局锁与脏读 |

下文从**全局事务协调器（TC）**与 **AT 分支事务（RM）**两条线梳理内核接口与实现，对应课件「上：全局事务设计；下：两阶段、自动补偿、隔离性」的分工。

---

## 一、整体架构与生命周期

### 1.1 三大角色

| 角色 | 英文 | 部署 | 职责 |
|------|------|------|------|
| 事务协调者 | TC (Transaction Coordinator) | 独立 Server | 维护全局/分支事务状态，驱动提交或回滚 |
| 事务管理器 | TM (Transaction Manager) | 嵌入应用 Client | 定义全局事务边界：开启、提交、回滚 |
| 资源管理器 | RM (Resource Manager) | 嵌入应用 Client | 管理分支资源，向 TC 注册分支并汇报状态 |

![Seata 工作原理](/微服务/seata-kernel-01-source/Seata 工作原理.png)

### 1.2 分布式事务生命周期

1. **TM → TC**：请求开启全局事务，TC 生成 **XID**；
2. **XID 传播**：在微服务调用链中传递，关联多个子事务；
3. **RM → TC**：将本地事务注册为 XID 下的**分支事务**；
4. **TM → TC**：告知 XID 对应全局事务提交或回滚；
5. **TC → RM**：驱动各分支提交或回滚。

### 1.3 AT 模式设计思路（改进型 2PC）

AT 的核心是**对业务无侵入**，在经典两阶段提交上做了异步化与补偿：

| 阶段 | 行为 |
|------|------|
| **一阶段** | 业务 SQL 与 **undo_log** 在同一本地事务中提交，释放本地锁与连接 |
| **二阶段·提交** | TC 通知 RM **异步删除** undo_log，极快完成 |
| **二阶段·回滚** | TM 请求回滚 → RM 按 XID + BranchId 查 undo_log → 生成**反向 SQL** 补偿 |

一阶段的关键问题：如何把业务 SQL 解析成 undo_log 并入库？答案在 **ConnectionProxy → ExecuteTemplate → UndoExecutor** 链（见第五节）。

![Seata 源码分析总览](/微服务/seata-kernel-01-source/Seata源码分析.png)

---

## 二、TM 侧：GlobalTransaction 与拦截链

### 2.1 TransactionManager 与 GlobalTransaction

- **`TransactionManagerHolder`**：SPI 工厂，通过 `EnhancedServiceLoader` 加载 `TransactionManager`，默认 `DefaultTransactionManager`。
- **`GlobalTransaction`**：对外 API——开启、提交、回滚、查状态。
- **`DefaultGlobalTransaction`**：默认实现，持有 `TransactionManager`；默认超时 **60s**，名称 `default`。
- **`GlobalTransactionRole`**：业务方法可能嵌套创建多个 `GlobalTransaction`，只有 **Launcher** 角色才有开启/提交/回滚权限。
- **`GlobalTransactionContext`**：工具类，创建新全局事务、获取当前线程绑定的事务。

### 2.2 Spring 整合：Scanner 与 Interceptor

| 类 | 扩展点 | 作用 |
|----|--------|------|
| `GlobalTransactionScanner` | 继承 `AbstractAutoProxyCreator`，实现 `SmartInstantiationAwareBeanPostProcessor` | 容器初始化时对 Bean 做代理；`wrapIfNecessary` 为核心 |
| `GlobalTransactionalInterceptor` | 实现 `MethodInterceptor` | 拦截 `@GlobalTransactional` / `@GlobalLock` 方法 |
| `TransactionalTemplate` | 模板方法 | `execute(TransactionalExecutor business)`：开事务 → 执行业务 → 成功提交 / 失败回滚 |

配置 `service.disableGlobalTransaction=true` 时，全局事务注解不生效，代理直接返回原 Bean。

这与 [Spring 扩展点篇](/微服务/spring-ext/spring-ext-01-extension-points) 中 Seata 的 `AbstractAutoProxyCreator + MethodInterceptor` 场景一致。

---

## 三、TC 侧：DefaultCoordinator 与 Session 模型

### 3.1 DefaultCoordinator 与 Core

**`DefaultCoordinator`** 是 TC 默认协调器：

- 继承 **`AbstractTCInboundHandler`**：处理 RM/TM 入站请求；
- 实现 **`TransactionMessageHandler`**：处理 RPC 消息；
- 实现 **`ResourceManagerInbound`**：向 RM 发送 `branchCommit`、`branchRollback`。

**`Core`** 是 TC 核心处理器：

- 继承 **`ResourceManagerOutbound`**：接收 RM 的 `branchRegister`、`branchReport`、`lockQuery`；
- 继承 **`TransactionManager` 接口侧 RPC**：处理 TM 的 `begin`、`commit`、`rollback`、`getStatus`；
- 另提供 3 个扩展接口方法供协调流程调用。

### 3.2 GlobalSession 与 BranchSession

| 类 | 职责 |
|----|------|
| **`GlobalSession`** | TM `begin` 时 TC 创建，返回唯一 XID；实现 `SessionLifecycle`：`begin`、`changeStatus`、`changeBranchStatus`、`addBranch`、`removeBranch` |
| **`BranchSession`** | 分支数据；由 `GlobalSession` 统一调度；`lock` / `unlock` 委托 **`LockManager`** |
| **`DefaultLockManager`** | 将 `branchSession.lockKey` 转为 `List<RowLock>`，委派 **`Locker`** |
| **`Locker`** | 行锁：获取、释放、判断是否锁定、清除 |

全局锁与隔离性细节见 [第 8 篇](/分布式/seata/seata-08-isolation-interview)；此处强调 **Session 是 TC 内存/持久化模型的中心**。

---

## 四、RM 侧：ResourceManager 与 AT 核心

### 4.1 资源管理层次

```
ResourceManager (接口)
  └── AbstractResourceManager (模板)
        └── DefaultResourceManager (适配所有 RM，委派给具体实现)
              └── DataSourceManager (AT 核心：注册、提交、回滚)
                    └── 二阶段提交委派 AsyncWorker
```

- **`Resource`**：可被 RM 管理并关联全局事务；
- **`DataSourceProxy`**：实现 `Resource`，`BranchType=AT`；继承 `AbstractDataSourceProxy`，除 `getConnection()` 返回 **`ConnectionProxy`** 外，其余方法转发 `targetDataSource`；初始化时用 JDBC URL 作 `resourceId` 并注册到 `DefaultResourceManager`；提供 `getPlainConnection()` 获取未代理连接。

### 4.2 AsyncWorker 与二阶段提交

AT 分支**提交**无需再写业务数据，只需删 undo_log，故 **`DataSourceManager` 将 branchCommit 委派给 `AsyncWorker`** 异步执行：

```text
AsyncWorker#doBranchCommits
  → UndoLogManagerFactory.getUndoLogManager(dbType)
  → batchDeleteUndoLog(xids, branchIds, conn)
```

**`UndoLogManager`** 负责 undo 表的 flush、查询、批量删除。

---

## 五、一阶段：ConnectionProxy 与 Undo 执行链

### 5.1 ConnectionProxy#doCommit 分支

本地 `commit()` 时，`ConnectionProxy` 根据上下文选择路径：

```java
private void doCommit() throws SQLException {
    if (context.inGlobalTransaction()) {
        processGlobalTransactionCommit();
    } else if (context.isGlobalLockRequire()) {
        processLocalCommitWithGlobalLocks();
    } else {
        targetConnection.commit();
    }
}
```

**`processGlobalTransactionCommit()`** 典型步骤：

1. `register()` — 向 TC 注册分支；
2. `UndoLogManager.flushUndoLogs(this)` — 刷 undo_log；
3. `targetConnection.commit()` — 提交本地事务；
4. 可选 `report(true)` — 向 TC 汇报分支状态；
5. `context.reset()`。

### 5.2 SQL 解析与反向补偿

| 组件 | 作用 |
|------|------|
| **`ExecuteTemplate`** | 为 `Statement` 的 execute / executeQuery / executeUpdate 提供模板 |
| **`SQLRecognizer`** | 识别 SQL 类型、表名、别名、原生 SQL |
| **`UndoExecutorFactory`** | 按 sqlType 创建 `AbstractUndoExecutor` |
| **`UndoExecutor`** | 回滚时根据 **beforeImage / afterImage** 与 SQL 类型生成反向 SQL；含**脏数据校验** |

整条链路与 [AT 模式概念篇](/分布式/seata/seata-02-at-mode) 中的 undo_log 一一对应；[实战篇](/分布式/seata/seata-04-at-tm-rm) 中的 `undo_log` 表结构即此链路的落库结果。

---

## 六、阅读建议与源码入口

| 关注点 | 建议入口类 | 对照分布式篇 |
|--------|------------|--------------|
| 注解如何生效 | `GlobalTransactionScanner` → `GlobalTransactionalInterceptor` | [04 AT 实战](/分布式/seata/seata-04-at-tm-rm) |
| TC 如何管 XID | `DefaultCoordinator` → `GlobalSession` | [03 TC 搭建](/分布式/seata/seata-03-tc-server) |
| 数据源如何被代理 | `DataSourceProxy` → `ConnectionProxy` | [04 AT 实战](/分布式/seata/seata-04-at-tm-rm) |
| 回滚如何补偿 | `UndoExecutor` + `UndoLogManager` | [02 AT 模式](/分布式/seata/seata-02-at-mode) |
| TCC 分支逻辑 | `ResourceManager` 其他实现 | [07 TCC 源码](/分布式/seata/seata-07-tcc-source) |

---

## 小结

- **TM 线**：`GlobalTransaction` + AOP 拦截，把业务方法纳入 XID 边界。
- **TC 线**：`DefaultCoordinator` / `Core` + `GlobalSession` / `BranchSession`，协调全局与分支状态及行锁。
- **RM 线（AT）**：`DataSourceProxy` 拦截连接与提交，一阶段写 undo_log，二阶段异步删 log 或反向 SQL 补偿。

用法与模式选型见 [分布式专栏](/分布式/seata/seata-01-distributed-tx-overview)；Spring 如何把 Seata 织入容器见 [Spring 扩展点篇](/微服务/spring-ext/spring-ext-01-extension-points)。
