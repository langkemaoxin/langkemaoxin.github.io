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

核心类 `org.apache.zookeeper.ZooKeeper`：构造器 `ZooKeeper(connectString, sessionTimeout, watcher)`。

连接集群 + CountDownLatch 等待 `SyncConnected`：

```java
CountDownLatch latch = new CountDownLatch(1);
ZooKeeper zk = new ZooKeeper("192.168.65.156:2181,192.168.65.190:2181,192.168.65.200:2181",
    4000, event -> {
        if (event.getState() == KeeperState.SyncConnected && event.getType() == EventType.None) {
            latch.countDown();
        }
    });
latch.await();
zk.create("/user", "fox".getBytes(), Ids.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);
```

常用 API：`create/delete/exists/getData/setData/getChildren/sync`；更新分**无条件**（version=-1）与**条件**（version 匹配）；均有同步/异步版本。

```java
// 同步创建
String path = zk.create("/node", "data".getBytes(), Ids.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);

// 条件更新
Stat stat = new Stat();
byte[] data = zk.getData("/node", false, stat);
zk.setData("/node", "changed!".getBytes(), stat.getVersion());
```

**官方 API 痛点**：Watcher 一次性、断线重连需自研、异常繁杂、仅 `byte[]`、级联删除不便——故推荐 Curator。

---

## 二、Curator 客户端

> Guava is to Java what Curator is to ZooKeeper

- `curator-framework`：ZK API 封装
- `curator-client`：重试策略等
- `curator-recipes`：选举、锁、Counter、Cache

```xml
<dependency>
  <groupId>org.apache.curator</groupId>
  <artifactId>curator-recipes</artifactId>
  <version>5.1.0</version>
</dependency>
```

创建客户端：`CuratorFrameworkFactory.newClient` 或 `builder()`，配置 `connectString`、`sessionTimeoutMs`、`retryPolicy`（如 `ExponentialBackoffRetry`）、可选 `namespace`。

```java
RetryPolicy retry = new ExponentialBackoffRetry(1000, 3);
CuratorFramework client = CuratorFrameworkFactory.builder()
    .connectString("192.168.128.129:2181")
    .sessionTimeoutMs(5000)
    .connectionTimeoutMs(5000)
    .retryPolicy(retry)
    .namespace("base")
    .build();
client.start();
client.create().creatingParentsIfNeeded().forPath("/node-parent/sub-node-1");
```

**重试策略：**

| 策略 | 说明 |
|------|------|
| ExponentialBackoffRetry | 递增间隔，限定重试次数 |
| RetryNTimes | 固定最大次数 |
| RetryOneTime | 只重试一次 |
| RetryUntilElapsed | 在给定总时长内重试 |

创建节点：`create().withMode(...).forPath()`；`creatingParentsIfNeeded()` 递归建路径。

get/set/delete：`delete().guaranteed().deletingChildrenIfNeeded()` 保证删除与递归子节点。

**异步**：`inBackground(BackgroundCallback)`，可指定线程池。

**Cache 监听**（可反复注册，弥补原生 Watcher）：

| Cache | 范围 |
|-------|------|
| NodeCache | 单节点数据 |
| PathChildrenCache | 直接子节点 |
| TreeCache | 子树递归 |

---

## 三、分布式命名与 ID

**API 目录**（类 Dubbo）：`/dubbo/{service}/providers` 写 URL，Consumer 订阅 providers。

**节点命名**：动态扩缩容时用 **持久顺序** 或 **临时顺序** ZNode 分配 NodeId。

**分布式 ID**：UUID、Redis INCR、Snowflake、ZK 顺序节点、Mongo ObjectId 等。ZK 方案：`EPHEMERAL_SEQUENTIAL` 取后缀序号。

Curator 实现 `IDMaker`：`create().withMode(EPHEMERAL_SEQUENTIAL).forPath(prefix)`，解析路径末尾序号。

**Snowflake 结构**（64 bit：符号 + 时间戳 + workerId + sequence）；ZK 可分配 workerId。注意时钟回拨风险。

---

## 四、分布式队列

ZK 可做简单 FIFO：根下 `EPHEMERAL_SEQUENTIAL` 入队；出队取最小序号子节点 get+delete。吞吐不高，小系统可用；官方更推荐专业 MQ。

**Curator DistributedQueue**：`QueueBuilder.builder(client, consumer, serializer, root).buildQueue()`；可选 `lockPath("/orderlock")` 保证顺序与原子性。

---

## 小结

- 生产优先 **Curator**：重试、Recipe、Node/Path/TreeCache。
- 命名服务、ID、队列都依赖**顺序节点 + 临时节点**语义。
- 下一篇聚焦 **分布式锁** 与 Spring Cloud 注册中心。
