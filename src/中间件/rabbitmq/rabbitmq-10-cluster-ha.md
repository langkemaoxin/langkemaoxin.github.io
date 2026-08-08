---
title: "RabbitMQ 集群与高可用"
sidebarGroup: "RabbitMQ"
shortTitle: "10 集群与高可用"
order: 10
date: 2026-09-04
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 10/10 篇**  
> 上一篇：[《RabbitMQ 监控、备份与联邦同步》](/中间件/rabbitmq/rabbitmq-09-monitor-backup-federation)

---

## 开头：单机磁盘坏了，消息全没

单机 RabbitMQ 宕机可以重启；磁盘损坏则 Queue 上的消息可能永久丢失——生产环境不可接受。RabbitMQ 从设计之初就支持 **集群**：普通集群共享元数据、镜像集群冗余消息，再配合 **HAProxy + Keepalived** 对客户端隐藏节点故障。

本篇搭建普通集群与镜像集群，并概述前端高可用架构（了解即可）。

---

## 一、集群机制概览

Admin → **Cluster** 可查看集群名（默认 `rabbit@hostname`），单机也是一个单节点集群。

![Admin Cluster 页面](/中间件/rabbitmq/15/p08-01.png)

RabbitMQ 提供两种集群模式：

![普通集群与镜像集群对比示意](/中间件/rabbitmq/15/p08-02.png)

| 模式 | 元数据 | 消息 | 可靠性 | 适用 |
|------|--------|------|--------|------|
| **普通集群** | 各节点相同 | 只存一份，消费时可能跨节点拉取 | 较低，节点挂则该节点消息暂不可消费 | 对安全要求不高的场景 |
| **镜像集群（HA）** | 各节点相同 | 主动同步到镜像节点，选举 master/slave | 高，master 挂自动选主 | 生产推荐 |

---

## 二、普通集群

准备三台服务器 `worker1`、`worker2`、`worker3`，分别安装 RabbitMQ。

### 2.1  hosts 与节点名

```bash
vi /etc/hosts
192.168.65.193  192-168-65-193
192.168.65.112  192-168-65-112
192.168.65.170  192-168-65-170
```

各节点集群名建议为 `rabbit@worker1` 等形式，与 hostname 对应。

### 2.2 同步 Erlang Cookie

集群节点 `/var/lib/rabbitmq/.erlang.cookie` 内容必须 **一致**。将 worker2 的 cookie 复制到 worker1：

```bash
chown rabbitmq:rabbitmq .erlang.cookie
chmod 400 .erlang.cookie
```

### 2.3 加入集群

worker1 服务正常后，在 worker2 执行：

```bash
rabbitmqctl stop_app
rabbitmqctl join_cluster --ram rabbit@worker2
rabbitmqctl start_app
```

> 注：原文示例中 join 目标节点名请按实际 hostname 调整，确保 `rabbitmqctl cluster_status` 显示预期成员。

**Disk 节点 vs RAM 节点**：

| 类型 | 元数据存储 | 特点 |
|------|------------|------|
| **disk** | 硬盘 | 元数据更安全，官方更推荐 |
| **ram** | 内存 | 元数据操作更快，节点全为 ram 可能导致元数据丢失、集群无法启动 |

`--ram` 只影响 **元数据**（Exchange、Queue 定义等），**不影响消息**存储位置。若 worker2 为唯一 disk 节点，存在单点元数据风险。

查看状态：

```bash
rabbitmqctl cluster_status
```

Web 控制台可看到多节点。生产建议 **奇数节点**，对 Quorum 队列更友好。

---

## 三、镜像集群

在普通集群基础上，针对 vhost 配置 **镜像策略**。

### 3.1 创建 vhost 与策略

```bash
rabbitmqctl add_vhost /mirror
rabbitmqctl set_policy ha-all --vhost "/mirror" "^" '{"ha-mode":"all"}'
```

也可在 Web 控制台 **Admin → Policies** 配置。

![镜像策略 ha-mode all 配置](/中间件/rabbitmq/15/p11-01.png)

### 3.2 ha-mode 参数

| ha-mode | 说明 |
|---------|------|
| **all** | 镜像到集群所有节点；新节点加入时队列同步到新节点（生产常用） |
| **exactly** | 配合数字 `ha-params`，镜像到指定数量节点；节点不足则镜像到全部 |
| **nodes** | 配合节点名列表，镜像到指定节点 |

**pattern**：队列名匹配规则，`^` 表示全部；通常用 vhost 隔离即可。

镜像模式 **消耗集群内带宽**，队列数量不宜过多，尽量避免大量消息长期堆积。

配置完成后，向任一节点发送消息，会同步到其他镜像节点。

![镜像集群多节点消息同步验证](/中间件/rabbitmq/15/p12-01.png)

---

## 四、HAProxy + Keepalived（了解）

镜像集群解决了 **数据冗余**，但客户端仍可能连到 **已宕节点**，需要切换连接地址。

### 4.1 HAProxy

在 RabbitMQ 集群前部署 **HAProxy**（TCP 负载均衡）。应用只连 HAProxy 端口，HAProxy 把 AMQP 请求转发到后端健康节点。某 RabbitMQ 节点崩溃时，HAProxy 自动切到其他节点，应用 **无需改 IP**。

同类工具：Nginx Stream、F5 等。

### 4.2 Keepalived

HAProxy 自身也可能单点。 **Keepalived** 暴露 **VIP（虚拟 IP）**，绑定到主 HAProxy 网卡；备 HAProxy 待机。主 HAProxy 故障时 VIP **漂移** 到备机，应用始终访问同一 VIP，感知不到切换。

HAProxy + Keepalived 是分布式场景常见组合，部署为下载 + 配置 + 运行，细节可参考社区文档与官方运维指南。

---

## 五、系列回顾

| 篇章 | 内容 |
|------|------|
| 01 | MQ 概念与选型 |
| 02 | 安装与 Queue / Exchange / Channel |
| 03 | 七步编程模型 |
| 04 | 七种消息场景与 Publisher Confirms |
| 05 | Spring Boot 集成 |
| 06 | Classic / Quorum / Stream |
| 07 | 死信与延迟队列 |
| 08 | Sharding 分片 |
| 09 | 监控、备份、Federation |
| 10 | 集群与高可用 |

RabbitMQ 沉淀多年，功能全面、Spring 生态成熟，持续吸收 Quorum、Stream 等新能力。互联网场景常选 Kafka 换吞吐；企业内部系统调用，RabbitMQ 仍是经典之选。与 RocketMQ、Pulsar 等并存，关键是 **按场景选型**，并理解各产品在可靠性、顺序、延迟上的取舍。

---

## 小结

- **普通集群**：元数据共享，消息单份，节点故障影响该节点上的消息消费
- **镜像集群**：消息冗余 + 自动选主，生产基线
- **HAProxy + Keepalived**：对客户端透明的高可用入口
- 配合 **Quorum 队列**、**Publisher Confirms**、**手动 Ack**，构成完整可靠性链路

本系列十篇至此完结。建议本地搭集群、配镜像策略、压一条 Confirms + DLX 链路，把控制台、API 与代码三层对照一遍，印象会更深。
