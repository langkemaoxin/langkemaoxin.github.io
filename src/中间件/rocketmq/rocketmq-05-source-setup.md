---
title: "RocketMQ 源码环境与 NameServer/Broker 启动"
sidebarGroup: "RocketMQ"
shortTitle: "05 源码环境与启动"
order: 5
date: 2026-09-20
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 5/10 篇**  
> 上一篇：[《SpringBoot 与注意点》](/中间件/rocketmq/rocketmq-04-springboot-tips) · 下一篇：[《发送、拉取与负载均衡源码》](/中间件/rocketmq/rocketmq-06-send-consume-lb)

---

## 开头：会用 API 不够，线上抖动时要能读源码

客户端 API 固定，但 **Broker 宕机、消息堆积、延迟不准** 往往要追到 NameServer 路由、Netty RPC、CommitLog 刷盘。本篇搭建源码调试环境，并梳理 NameServer/Broker 启动链路与 **remoting 模块** 的 RPC 框架——后续发送、持久化、长轮询都建立在此之上。

---

## 一、源码环境搭建

仓库：https://github.com/apache/rocketmq  

主要模块：

| 模块 | 职责 |
|------|------|
| `namesrv` | NameServer |
| `broker` | Broker 进程 |
| `store` | 消息存储 |
| `remoting` | Netty 远程调用 |
| `client` | 生产/消费客户端 |
| `example` | 示例 |

编译：

```bash
mvn clean install -Dmaven.test.skip=true
```

![源码模块与编译](/中间件/rocketmq/42/p03-01.png)

![IDEA 导入与模块结构](/中间件/rocketmq/42/p03-02.png)

![distribution 中的 broker.conf](/中间件/rocketmq/42/p03-03.png)

### 启动 NameServer

运行 `org.apache.rocketmq.namesrv.NamesrvStartup`：

- `-c namesrv.properties` 指定配置  
- `-p` 打印生效参数（如 `orderMessageEnable`）  

成功日志：`The Name Server boot success. serializeType=JSON, address 0.0.0.0:9876`

![NameServer 启动与参数](/中间件/rocketmq/42/p04-01.png)

### 启动 Broker

运行 `org.apache.rocketmq.broker.BrokerStartup`，`-c` 指向 `distribution/conf/broker.conf`，`-p`/`-m` 查看配置。

![Broker 启动入口](/中间件/rocketmq/42/p05-01.png)

### 调试建议

- RocketMQ **几乎无注释**，线程与定时任务多，**不建议大量断点**  
- **带着问题读**：NameServer 端口怎么改？Broker 挂了 Producer 还能发吗？  
- 分阶段：热身（启动结构）→ 小试（RPC/收发）→ 融汇（持久化/延迟）

![读源码的三阶段方法](/中间件/rocketmq/42/p06-01.png)

---

## 二、NameServer 启动过程

入口：`NamesrvStartup` → 构建并启动 `NamesrvController`（类似 MVC Controller，处理 Netty 请求）。

5.x 新增 `ControllerManager`、NameServer 侧 `NettyRemotingClient`（4.x NameServer 不对外发 Netty 请求）。

核心：`RouteInfoManager` 维护 Broker 路由表；整体风格是 **Controller + Manager/Service + 内存 Table**。

---

## 三、Broker 启动过程

`BrokerStartup.createBrokerController()` 加载核心配置：

- `BrokerConfig` —— Broker 行为  
- `MessageStoreConfig` —— 存储（刷盘、路径等）  
- `NettyServerConfig` / `NettyClientConfig` —— 10911 等端口；Broker 既是 Server（对 Client）又是 Client（对 NameServer）  
- `AuthConfig` —— ACL  

`BrokerController.start()` 节选：

```java
this.messageStore.start();
this.timerMessageStore.start();      // 指定时间点延迟消息
this.remotingServer.start();
this.fastRemotingServer.start();     // VIP 通道
this.brokerOuterAPI.start();
this.topicRouteInfoManager.start();
registerBrokerAll(...);              // 向所有 NameServer 注册
this.brokerStatsManager.start();
```

Producer 可 `setSendMessageWithVIPChannel(true)`，Consumer 可 `setVipChannelEnabled(true)` 走 fast 通道。

![Broker 核心组件启动](/中间件/rocketmq/42/p09-01.png)

---

## 四、Netty 服务注册框架（remoting）

### 1. 谁需要 Server / Client？

- NameServer、Broker：**既有** RemotingServer **又有** RemotingClient  
- Producer/Consumer：主要是 Client；**事务 Producer** 还要响应 Broker 回查，需要 NettyServer  

Channel 建立后 **双向 RPC**，Server 也可向 Client 推请求。

### 2. 协议与处理链

`RemotingCommand`：`code`（业务码）、`opaque`（请求 ID）、`customHeader`、`body`、`flag`（0 请求 / 1 响应）。

`NettyRemotingServer.configChannel`  pipeline：Handshake → Encoder/Decoder → IdleState → ConnectionManage → **NettyServerHandler** → `processMessageReceived`。

### 3. processorTable

`Map<Integer, Pair<NettyRequestProcessor, ExecutorService>>`：按 **code** 注册处理器。  
Broker：`BrokerController.registerProcessor()`；NameServer：`GET_ROUTEINFO_BY_TOPIC` 等。

Client 侧 `ClientRemotingProcessor` 统一处理 Broker 下行（如拉取响应、事务回查）。

### 4. 同步 vs 异步 RPC

- `responseTable`：`ConcurrentMap<opaque, ResponseFuture>`  
- **同步**：`ResponseFuture.waitResponse()` + `CountDownLatch` 阻塞  
- **异步**：结果留表，Client 再发 RESPONSE 类型请求取回  
- 定时任务扫描过期 `responseTable` 条目  

![RPC 框架整体流程](/中间件/rocketmq/42/p10-01.png)

这套 **按 code 注册 Processor** 的模式，可借鉴到 IM、网关等多 RPC 场景。

---

## 五、Broker 心跳与路由

启动后立即 `registerBrokerAll(true, false, true)`，之后定时（默认约 30s，首次延迟 10s）续心跳。

NameServer `RouteInfoManager.registerBroker` 更新路由；`startScheduleService` 扫描不活跃 Broker。

### 为何自建 NameServer？

1. 减少外部依赖（Kafka 去 ZK 同理）  
2. **极简**：NameServer **不同步**，Broker **全量注册** 到每个 NameServer；任一 NameServer 存活即可服务  
3. 代价：各 NameServer 数据可能短暂不一致；Client 只需 **任一可用 Broker** 即可发消息，对 MQ 场景可接受  

---

## 六、本章小结

- 本地跑通 `NamesrvStartup` + `BrokerStartup` + `example` 是读源码前提  
- Broker 是一组 **Store + Remoting + 定时任务** 的组合  
- **remoting + processorTable** 是理解所有 Broker 请求的钥匙  

下一篇跟踪 **Producer 发送** 与 **Consumer 拉取（推模式本质）** 及两端负载均衡。
