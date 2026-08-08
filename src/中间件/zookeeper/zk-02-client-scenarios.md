---
title: "ZooKeeper 客户端与经典应用场景"
sidebarGroup: "ZooKeeper"
shortTitle: "02 客户端与场景"
order: 2
date: 2026-10-09
category: "中间件"
tag:
  - "ZooKeeper"
  - "中间件"
---

> **ZooKeeper 系列 · 第 2/5 篇**  
> 上一篇：[《ZooKeeper 特性、节点类型与快速安装》](/中间件/zookeeper/zk-01-intro) · 下一篇：[《ZooKeeper 分布式锁实战》](/中间件/zookeeper/zk-03-distributed-lock)

---

## 开头：会用 CLI 不够，业务要接进 JVM

配置中心、ID 生成、简易队列都要在应用里**创建会话、注册 Watcher、处理断线重连**。官方 Java API 能用但偏底层；生产更常用 **Curator** 封装重试、Recipe 与 Cache 监听。

前置：熟悉 [第 1 篇](/中间件/zookeeper/zk-01-intro) 的节点类型与 Watcher 语义。

![客户端与场景学习路径](/中间件/zookeeper/18/p02-page.png)

---

## 一、原生 Java 客户端

依赖（版本与 Server 一致，如 3.8.0）：

```xml
<dependency>
  <groupId>org.apache.zookeeper</groupId>
  <artifactId>zookeeper</artifactId>
  <version>3.8.0</version>
</dependency>
```

![Maven 依赖配置](/中间件/zookeeper/18/p03-page.png)

核心类 `org.apache.zookeeper.ZooKeeper`：构造器 `ZooKeeper(connectString, sessionTimeout, watcher)`。

![ZooKeeper 构造器参数](/中间件/zookeeper/18/p04-page.png)

连接集群 + CountDownLatch 等待 `SyncConnected`：

![原生客户端连接示例](/中间件/zookeeper/18/p05-page.png)

![连接建立与 create 持久节点](/中间件/zookeeper/18/p06-page.png)

常用 API：`create/delete/exists/getData/setData/getChildren/sync`；更新分**无条件**（version=-1）与**条件**（version 匹配）；均有同步/异步版本。

![ZooKeeper 主要方法说明](/中间件/zookeeper/18/p07-page.png)

同步/异步创建、带 version 的 setData 单元测试示意：

![createTest 同步创建](/中间件/zookeeper/18/p08-page.png)

![createAsycTest 异步回调](/中间件/zookeeper/18/p09-page.png)

![setTest 乐观锁更新](/中间件/zookeeper/18/p10-page.png)

**官方 API 痛点**：Watcher 一次性、断线重连需自研、异常繁杂、仅 `byte[]`、级联删除不便——故推荐 Curator。

![原生客户端不足归纳](/中间件/zookeeper/18/p11-page.png)

---

## 二、Curator 客户端

> Guava is to Java what Curator is to ZooKeeper

![Curator 官网与定位](/中间件/zookeeper/18/p12-page.png)

- `curator-framework`：ZK API 封装
- `curator-client`：重试策略等
- `curator-recipes`：选举、锁、Counter、Cache

![Curator 模块划分](/中间件/zookeeper/18/p13-page.png)

```xml
<dependency>
  <groupId>org.apache.curator</groupId>
  <artifactId>curator-recipes</artifactId>
  <version>5.1.0</version>
</dependency>
```

![Curator 依赖引入](/中间件/zookeeper/18/p14-page.png)

创建客户端：`CuratorFrameworkFactory.newClient` 或 `builder()`，配置 `connectString`、`sessionTimeoutMs`、`retryPolicy`（如 `ExponentialBackoffRetry`）、可选 `namespace`。

![newClient 与 builder 两种方式](/中间件/zookeeper/18/p15-page.png)

![重试策略对比表](/中间件/zookeeper/18/p16-page.png)

创建节点：`create().withMode(...).forPath()`；`creatingParentsIfNeeded()` 递归建路径。

![Curator 创建节点](/中间件/zookeeper/18/p17-page.png)

![creatingParentsIfNeeded 层级路径](/中间件/zookeeper/18/p18-page.png)

get/set/delete：`delete().guaranteed().deletingChildrenIfNeeded()` 保证删除与递归子节点。

![getData / setData](/中间件/zookeeper/18/p19-page.png)

![delete 与 guaranteed](/中间件/zookeeper/18/p20-page.png)

**异步**：`inBackground(BackgroundCallback)`，可指定线程池。

![inBackground 默认 EventThread](/中间件/zookeeper/18/p21-page.png)

![指定 Executor 的 inBackground](/中间件/zookeeper/18/p22-page.png)

**Cache 监听**（可反复注册，弥补原生 Watcher）：

| Cache | 范围 |
|-------|------|
| NodeCache | 单节点数据 |
| PathChildrenCache | 直接子节点 |
| TreeCache | 子树递归 |

![CuratorListener 接口](/中间件/zookeeper/18/p23-page.png)

![NodeCache 监听单节点](/中间件/zookeeper/18/p24-page.png)

![PathChildrenCache 子节点事件](/中间件/zookeeper/18/p25-page.png)

![TreeCache 递归监听](/中间件/zookeeper/18/p26-page.png)

---

## 三、分布式命名与 ID

**API 目录**（类 Dubbo）：`/dubbo/{service}/providers` 写 URL，Consumer 订阅 providers。

![分布式 API 目录模型](/中间件/zookeeper/18/p15-page.png)

**节点命名**：动态扩缩容时用 **持久顺序** 或 **临时顺序** ZNode 分配 NodeId。

![动态节点命名思路](/中间件/zookeeper/18/p16-page.png)

**分布式 ID**：UUID、Redis INCR、Snowflake、ZK 顺序节点、Mongo ObjectId 等。ZK 方案：`EPHEMERAL_SEQUENTIAL` 取后缀序号。

![ID 生成方案对比](/中间件/zookeeper/18/p17-page.png)

Curator 实现 `IDMaker`：`create().withMode(EPHEMERAL_SEQUENTIAL).forPath(prefix)`，解析路径末尾序号。

![IDMaker 核心逻辑](/中间件/zookeeper/18/p18-page.png)

![多线程 makeId 测试](/中间件/zookeeper/18/p19-page.png)

**Snowflake 结构**（64 bit：符号 + 时间戳 + workerId + sequence）；ZK 可分配 workerId。注意时钟回拨风险。

![Snowflake 位布局](/中间件/zookeeper/18/p20-page.png)

![基于 ZK 的 SnowflakeIdGenerator 片段](/中间件/zookeeper/18/p21-page.png)

---

## 四、分布式队列

ZK 可做简单 FIFO：根下 `EPHEMERAL_SEQUENTIAL` 入队；出队取最小序号子节点 get+delete。吞吐不高，小系统可用；官方更推荐专业 MQ。

![分布式队列设计思路](/中间件/zookeeper/18/p22-page.png)

![enqueue / dequeue 代码](/中间件/zookeeper/18/p23-page.png)

**Curator DistributedQueue**：`QueueBuilder.builder(client, consumer, serializer, root).buildQueue()`；可选 `lockPath("/orderlock")` 保证顺序与原子性。

![Curator DistributedQueue 示例](/中间件/zookeeper/18/p24-page.png)

![lockPath 与并发注意](/中间件/zookeeper/18/p25-page.png)

![队列注意事项](/中间件/zookeeper/18/p26-page.png)

---

## 小结

- 生产优先 **Curator**：重试、Recipe、Node/Path/TreeCache。
- 命名服务、ID、队列都依赖**顺序节点 + 临时节点**语义。
- 下一篇聚焦 **分布式锁** 与 Spring Cloud 注册中心。
