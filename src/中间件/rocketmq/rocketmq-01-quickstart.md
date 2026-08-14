---
title: "RocketMQ 快速实战——搭建、收发与可视化"
sidebarGroup: "RocketMQ"
shortTitle: "01 快速搭建"
order: 1
date: 2026-09-16
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
---

> **RocketMQ 系列 · 第 1/10 篇**  
> 下一篇：[《RocketMQ 运行架构与消息模型》](/中间件/rocketmq/rocketmq-02-architecture)

---

## 开头：订单系统为什么要上 RocketMQ？

假设你负责一套电商核心链路：用户下单后要通知库存、支付、物流、积分等多个子系统。如果全部用 HTTP 同步调用，任何一个下游抖动都会拖垮下单接口；大促瞬间流量又会在某个服务上形成尖峰。

消息队列（MQ）正是为这类场景设计的：**生产者把消息写入队列即可返回，消费者按自己的节奏处理**。RocketMQ 是阿里双十一锤炼后捐赠给 Apache 的顶级项目，在金融、电商等对可靠性要求高的场景里用得很多。

本篇从「单机跑起来」开始：安装 5.3.0、命令行收发、Java 客户端、Dashboard，再升级到 2 主 2 从与 DLedger 集群。

---

## 一、MQ 能帮你解决什么

MQ（Message Queue）拆开看：**Message** 是跨进程传递的数据，**Queue** 是排队缓存的结构。广义上，只要能跨进程传消息并缓存，就算 MQ——QQ、微信也算，只是对接对象是人。

典型价值有三类：

| 能力 | 生活类比 | 技术收益 |
|------|----------|----------|
| **异步** | 快递放到驿站，快递员继续派送 | 提高响应速度与吞吐 |
| **解耦** | 编辑社把英文书译成多语言 | 服务独立演进、可扩展 |
| **削峰** | 三峡大坝蓄水、下游匀速放水 | 用稳定资源应对突发流量 |

![MQ 异步解耦削峰示意](/中间件/rocketmq/40/p03-01.png)

![MQ 三大作用补充说明](/中间件/rocketmq/40/p03-02.png)

---

## 二、RocketMQ 是什么、适合谁

RocketMQ 源自阿里内部 MetaQ，早期为解决 **多 Topic 场景下 ActiveMQ IO 瓶颈** 而自研；Kafka 偏日志采集，Topic 过多时 Partition 文件与索引开销大，并不完全贴合阿里业务。

与 Kafka、RabbitMQ、Pulsar 对比，RocketMQ 的定位是：**高吞吐 + 功能全面 + Java 实现便于定制**，在金融场景的消息可靠性上比 Kafka 更保守，吞吐又明显高于 RabbitMQ。

![主流 MQ 对比表](/中间件/rocketmq/40/p04-01.png)

---

## 三、快速搭建 RocketMQ 5.3.0

### 1. 下载与目录

- 官网：https://rocketmq.apache.org  
- 下载页：https://rocketmq.apache.org/download  
- **建议用 5.3.0 Binary 包**；4.x 已于 2024 年 3 月停止维护，5.x 重构量超过 60%，新特性与架构升级显著。

解压到例如 `/app/rocketmq`，学习阶段需调低 JVM 内存：

**runserver.sh**（NameServer）：

```bash
JAVA_OPT="${JAVA_OPT} -server -Xms1g -Xmx1g -Xmn512m -XX:MetaspaceSize=128m -XX:MaxMetaspaceSize=320m"
```

**runbroker.sh**（Broker）：

```bash
JAVA_OPT="${JAVA_OPT} -server -Xms2g -Xmx2g"
```

生产环境不建议随意改这些参数——它们本质是官方 JVM 调优结果。

![RocketMQ 目录结构与版本说明](/中间件/rocketmq/40/p06-01.png)

![5.x 大版本升级要点](/中间件/rocketmq/40/p06-02.png)

### 2. 启动 NameServer

```bash
cd /app/rocketmq/rocketmq-all-5.3.0-bin-release
nohup bin/mqnamesrv &
```

日志出现 `The Name Server boot success. serializeType=JSON, address 0.0.0.0:9876` 即成功；`jps` 可见 `NamesrvStartup`。

### 3. 启动 Broker

配置环境变量（多网卡云主机需配 `brokerIP1` 为外网 IP）：

```bash
export NAMESRV_ADDR='localhost:9876'
nohup bin/mqbroker &
```

成功日志：`The broker[...] boot success. serializeType=JSON and name server is localhost:9876`

可选：把 `ROCKETMQ_HOME` 和 `PATH` 写入 `~/.bash_profile`；停止服务用 `mqshutdown namesrv` / `mqshutdown broker`。

### 4. 命令行快速收发

**发 1000 条测试消息：**

```bash
bin/tools.sh org.apache.rocketmq.example.quickstart.Producer
```

**消费：**

```bash
bin/tools.sh org.apache.rocketmq.example.quickstart.Consumer
```

日志里会出现 `brokerName`、`queueId`、`msgId`、`topic` 等字段——后面架构篇会逐一对应。

### 5. Java Maven 客户端

```xml
<dependency>
  <groupId>org.apache.rocketmq</groupId>
  <artifactId>rocketmq-client</artifactId>
  <version>5.3.0</version>
</dependency>
```

生产者要点：`DefaultMQProducer` → `setNamesrvAddr` → **`start()`** → `send` → `shutdown`。  
消费者要点：指定 NameServer、**订阅 Topic**（`subscribe("TopicTest", "*")`）、注册 `MessageListenerConcurrently`。

完整示例在源码包 `example` 模块，不必死记。

### 6. RocketMQ Dashboard

Dashboard 需单独下载源码，`mvn clean package -Dmaven.test.skip=true` 得到 `rocketmq-dashboard-*.jar`。

`application.yml` 指定 NameServer：

```yaml
rocketmq:
  config:
    namesrvAddrs:
      - 192.168.65.112:9876
```

```bash
java -jar rocketmq-dashboard-1.0.1-SNAPSHOT.jar 1>dashboard.log 2>&1 &
```

浏览器访问 `http://<host>:8080`，可查看集群、Topic、消费进度等。

![Dashboard 编译与配置](/中间件/rocketmq/40/p12-01.png)

![Dashboard 管理界面概览](/中间件/rocketmq/40/p13-01.png)

---

## 四、升级 2 主 2 从分布式集群

单机 Broker 存在单点故障与磁盘损坏丢消息风险。RocketMQ 主从架构：**Master 响应客户端，Slave 备份数据**。

三台机器示例（`/etc/hosts`）：

| 机器 | NameServer | Broker |
|------|------------|--------|
| worker1 | ✓ | — |
| worker2 | ✓ | broker-a(M), broker-b-s(S) |
| worker3 | ✓ | broker-b(M), broker-a-s(S) |

使用 `conf/2m-2s-async/` 模板，关键字段：

- `brokerClusterName`：同集群名自动组网  
- `brokerName`：同组主从共享数据副本  
- `brokerId`：0=Master，>0=Slave  
- `brokerRole`：`ASYNC_MASTER` / `SYNC_MASTER` / `SLAVE`  
- 同机多 Broker：`storePath*`、`listenPort` 不能冲突  

启动时指定配置：

```bash
nohup bin/mqbroker -c ./conf/2m-2s-async/broker-a.properties &
```

检查集群：

```bash
bin/mqadmin clusterList   # 需配置 NAMESRV_ADDR
```

![2 主 2 从集群拓扑](/中间件/rocketmq/40/p14-01.png)

---

## 五、升级 DLedger 高可用集群

主从架构的短板：**Slave 不能自动升 Master**，Broker 宕机期间该节点上的消息无法被消费，只能等 Master 恢复。

DLedger 基于 **Raft** 选举 Leader（类似 Master），Follower 备份；集群过半节点存活即可工作，通常部署 **奇数台**（3 节点集群容忍 1 台故障）。

三台机器 `conf/dledger/broker.conf` 核心项：

```properties
enableDLegerCommitLog=true
dLegerGroup=RaftNode00
dLegerPeers=n0-worker1:40911;n1-worker2:40911;n2-worker3:40911
dLegerSelfId=n0   # 每台不同：n0/n1/n2
```

```bash
nohup bin/mqbroker -c conf/dledger/broker.conf &
```

Dashboard 集群页可观察 Leader 选举；停掉 Leader 所在机器后会很快选出新 Leader。DLedger 会接管 CommitLog 写入，性能略低于原生写入；5.0 起有 **Dledger Controller** 模式，可只用选举、不用 DLedger 写盘以换性能。

---

## 六、本章小结

本篇完成了 RocketMQ 从单机到主从、再到 DLedger 的部署路径，并用命令行与 Java 客户端验证了收发。下一篇会抽象出 **NameServer / Broker / Client** 的运行架构，以及 **Topic → MessageQueue → Offset** 的消息模型。
