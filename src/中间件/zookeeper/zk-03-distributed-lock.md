---
title: "ZooKeeper 分布式锁实战"
sidebarGroup: "ZooKeeper"
shortTitle: "03 分布式锁"
order: 3
date: 2026-10-10
category: "中间件"
tag:
  - "ZooKeeper"
  - "中间件"
---

> **ZooKeeper 系列 · 第 3/5 篇**  
> 上一篇：[《ZooKeeper 客户端与经典应用场景》](/中间件/zookeeper/zk-02-client-scenarios) · 下一篇：[《ZooKeeper Leader 选举源码要点》](/中间件/zookeeper/zk-04-leader-election)

---

## 开头：跨 JVM 的互斥，不能再用 synchronized

单体里 `synchronized` / `ReentrantLock` 管得住一个进程内的线程；微服务多实例、多机部署时，库存扣减、订单幂等等场景需要**跨进程的互斥**。主流方案：数据库唯一索引、Redis（Redisson）、ZooKeeper（Curator `InterProcessMutex`）。本篇对比思路并落地 ZK 锁与**服务注册发现**。

![分布式锁场景引入](/中间件/zookeeper/19/p02-01.png)

---

## 一、分布式锁方案对比

| 方案 | 特点 |
|------|------|
| **数据库** | 唯一索引 / 悲观行锁；实现简单，性能与锁表风险差 |
| **Redis** | 高性能，需处理过期、续期、主从切换下的安全性 |
| **ZooKeeper** | 临时顺序节点 + 强一致；可靠、可重入（Curator）；创建/删除节点开销较大 |

![三种分布式锁方案对比](/中间件/zookeeper/19/p03-01.png)

### 数据库思路

利用**唯一索引**插入锁记录；释放则 delete。问题：DB 压力大、无天然阻塞等待、死锁与超时需额外设计。

![数据库唯一索引锁示意](/中间件/zookeeper/19/p04-01.png)

---

## 二、ZooKeeper 锁设计

### 思路一：临时节点

在 `/lock` 创建 **EPHEMERAL** 节点，成功者持锁；会话结束节点消失。  
问题：大量客户端 **watch 同一节点**，删除时**惊群**——仅一人获锁却通知全员。

![临时节点锁与惊群问题](/中间件/zookeeper/19/p05-01.png)

### 思路二：临时顺序节点（推荐）

在 `/lock` 下创建 **`EPHEMERAL_SEQUENTIAL`**，如 `/lock/0000000001`；**序号最小**者持锁，其余 watch **前一个**节点，形成公平队列。

![临时有序节点公平锁](/中间件/zookeeper/19/p06-01.png)

---

## 三、Curator InterProcessMutex

生产勿手写：使用 `curator-recipes` 的 **InterProcessMutex**（可重入、阻塞、会话失效释放锁）。

```java
InterProcessMutex lock = new InterProcessMutex(client, "/locks/order");
try {
    if (lock.acquire(10, TimeUnit.SECONDS)) {
        // 临界区
    }
} finally {
    lock.release();
}
```

**优劣**：

- 优点：高可用、可重入、避免失效死锁（临时节点 + session）
- 缺点：性能低于 Redis；**高并发写锁**不推荐，**一致性要求高、并发适中**的场景更合适

---

## 四、基于 ZK 的服务注册与发现

ZK 天然适合注册中心：Provider 在约定路径写**临时节点**（地址 + 元数据），Consumer **watch** 子节点列表，上下线实时感知。

![注册中心 ZNode 设计思路](/中间件/zookeeper/19/p05-01.png)

**优点**：高可用（多实例）、强一致视图、Watcher 实时性。  
**缺点**：写多时性能不如 Nacos/Consul 等专用注册中心；大规模集群需评估。

### Spring Cloud Zookeeper

父 POM 指定 Spring Boot + Spring Cloud 版本（注意兼容矩阵）：

![Spring Boot 与 Cloud 版本](/中间件/zookeeper/19/p06-01.png)

依赖 `spring-cloud-starter-zookeeper-discovery`，排除传递的旧 `zookeeper`，显式引入与 Server 匹配的 `zookeeper` 3.8.0：

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-zookeeper-discovery</artifactId>
  <exclusions>
    <exclusion>
      <groupId>org.apache.zookeeper</groupId>
      <artifactId>zookeeper</artifactId>
    </exclusion>
  </exclusions>
</dependency>
<dependency>
  <groupId>org.apache.zookeeper</groupId>
  <artifactId>zookeeper</artifactId>
  <version>3.8.0</version>
</dependency>
```

`application.yml`：

```yaml
spring:
  cloud:
    zookeeper:
      connect-string: localhost:2181
      discovery:
        instance-host: 127.0.0.1
```

Feign 调用示例：`/user/findOrderByUserId/{id}` 经注册发现路由到 order 服务。

核心入口类：`ZookeeperDiscoveryClientConfiguration`。

---

## 小结

- 公平 ZK 锁：**临时顺序节点 + watch 前驱**；用 **InterProcessMutex** 即可。
- 注册中心：临时节点表示实例，适合中小规模、强一致元数据场景。
- 下一篇从**集群内部 Leader 选举**源码视角理解 ZK 自身高可用。
