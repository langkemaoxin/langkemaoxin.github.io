---
title: "RabbitMQ 监控、备份与联邦同步"
sidebarGroup: "RabbitMQ"
shortTitle: "10 监控备份与联邦"
order: 10
date: 2026-09-03
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 10/22 篇**  
> 上一篇：[《消息分片存储插件 Sharding》](/中间件/rabbitmq/rabbitmq-09-sharding)  
> 下一篇预告：[《RabbitMQ 集群与高可用》](/中间件/rabbitmq/rabbitmq-11-cluster-ha)

---

## 开头：控制台够用，自动化监控不够

RabbitMQ 管理插件的 Overview 页信息丰富，适合人工巡检。但要对接 Prometheus、Grafana 或自建告警，需要 **HTTP Management API**。企业跨机房部署时，还涉及 **备份恢复** 与 **Federation 联邦同步**——本篇覆盖这三块运维实践。

---

## 一、性能监控

### 1.1 管理控制台

首页 Overview 展示连接数、队列深度、消息速率、节点资源等。

![Overview 整体监控页面](/中间件/rabbitmq/15/p02-01.png)

Connections、Channels、Exchanges、Queues 各 Tab 可下钻到组件级指标。

### 1.2 HTTP Management API

控制台底部集成 API 文档。常用入口：

```
GET http://[server:port]/api/overview
```

返回系统资源、对象计数、消息统计等 JSON，便于对接 **Prometheus**（rabbitmq_exporter）、**Grafana** 仪表盘。

![Management API 文档入口](/中间件/rabbitmq/15/p03-01.png)

![api/overview 返回的部分字段示意](/中间件/rabbitmq/15/p03-02.png)

API 覆盖 GET 查询与 PUT/POST/DELETE 管理操作，生产环境须：

- 限制 API 端口访问（防火墙 / 内网）
- 使用独立监控账号，最小权限
- 启用 HTTPS（反向代理或 TLS）

其他常用接口示例：

| 接口 | 用途 |
|------|------|
| `/api/queues` | 队列列表与积压 |
| `/api/nodes` | 节点状态 |
| `/api/connections` | 连接详情 |

---

## 二、备份与恢复

RabbitMQ 数据目录默认 **`/var/lib/rabbitmq/mnesia`**，分两部分：

| 部分 | 内容 |
|------|------|
| **元数据** | Exchange、Queue、Binding、用户、策略等结构定义 |
| **消息存储** | 持久化消息体（按 vhost 组织） |

### 2.1 元数据：JSON 导入导出

Web 控制台 **Admin → Export definitions / Import definitions** 可导出、导入 JSON 元数据。

![Definitions 导入导出](/中间件/rabbitmq/15/p04-01.png)

迁移集群或灾难恢复时，先在新环境导入 definitions，再恢复消息文件。

### 2.2 消息：文件级备份

MQ 消息 **一般不建议** 像数据库那样频繁冷备——业务上更依赖集群冗余与 Confirms。若必须备份：

1. **停止应用**（镜像集群需 **整集群停服**）
2. 复制 vhost 对应目录，例如：
   ```
   /var/lib/rabbitmq/mnesia/rabbit@node-name/msg_stores/vhosts/
   ```
3. 目标节点已导入相同元数据后，按 vhost 复制文件夹；持久化与非持久化消息一并复制

![消息存储目录结构示意](/中间件/rabbitmq/15/p05-01.png)

恢复后启动集群，验证队列深度与消费是否正常。

---

## 三、Federation 联邦插件

### 3.1 作用

大型企业常在北京、长沙等多机房各部署 RabbitMQ。长沙消费者希望连 **本地 Broker**，但消息源在北京——跨城专线成本高，可建 **单向 Federation 通道**，把上游 Exchange/Queue 的消息同步到下游。

![Federation 跨机房单向同步概念](/中间件/rabbitmq/15/p06-01.png)

### 3.2 启用插件

```bash
rabbitmq-plugins list | grep federation
rabbitmq-plugins enable rabbitmq_federation
rabbitmq-plugins enable rabbitmq_federation_management
```

Admin 菜单新增 **Federation Status**、**Federation Upstreams**。

![Federation 插件启用后的 Admin 菜单](/中间件/rabbitmq/15/p07-01.png)

### 3.3 配置 Upstream

**Upstream** 表示上游（远程）节点，由 **下游主动** 配置连接，数据从上游同步到下游。

下游先声明本地 Exchange 与 Queue（示例：192.168.65.112 为 DownStream）：

```java
public class DownStreamConsumer {
    public static void main(String[] args) throws IOException, TimeoutException {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("192.168.65.112");
        factory.setPort(5672);
        factory.setUsername("admin");
        factory.setPassword("admin");
        factory.setVirtualHost("/mirror");

        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();

        channel.exchangeDeclare("fed_exchange", "direct");
        channel.queueDeclare("fed_queue", true, false, false, null);
        channel.queueBind("fed_queue", "fed_exchange", "routKey");

        channel.basicConsume("fed_queue", true, (consumerTag, envelope, properties, body) -> {
            System.out.println("content: " + new String(body, "UTF-8"));
        }, consumerTag -> {});
    }
}
```

在下游 **Federation Upstreams** 页面添加上游 URI，例如：

```
amqp://admin:admin@192.168.65.193:5672/
```

![配置 Federation Upstream](/中间件/rabbitmq/15/p07-02.png)

**Federated exchanges parameters** / **Federated queues parameters** 指定上游资源名；不填则与下游同名，上游不存在则自动创建。

![Upstream URI 与 Federated 参数](/中间件/rabbitmq/15/p07-03.png)

注意：

- DownStream 与 UpStream 建议使用 **相同 Virtual Host**
- URI 中若已指定 vhost，则 Upstream 表单里不要再重复配置 Virtual Host

### 3.4 配置 Federation 策略

在 **Policies** 中为 Exchange 或 Queue 配置 Federation，Definition 至少指定一个目标：

| 参数 | 说明 |
|------|------|
| `federation-upstream` | 对单个 Upstream 生效 |
| `federation-upstream-set` | 对一组 Upstream 生效，`all` 表示全部 |

![Federation 策略最简配置](/中间件/rabbitmq/15/p07-04.png)

### 3.5 测试

**Federation Status** 显示 `running` 表示成功；失败会给出原因。

![Federation Status 运行状态](/中间件/rabbitmq/15/p07-05.png)

在上游（193）的 `fed_exchange` 发消息，下游本地 `fed_queue` 的消费者应能收到。上游会看到联邦交换机及默认 routing key 绑定。

![上下游联邦交换机与消息同步验证](/中间件/rabbitmq/15/p08-01.png)

![下游 Consumer 收到联邦同步消息](/中间件/rabbitmq/15/p08-02.png)

---

## 四、日志：去哪看、怎么看

Docker 部署下 RabbitMQ **默认把日志打到标准输出**（`docker logs rabbitmq` 即是）；传统部署默认写在 `/var/lib/rabbitmq/log/`（或 `/var/log/rabbitmq/`）。想调整，都改 `rabbitmq.conf`（配置文件体系见 [02 安装部署](/中间件/rabbitmq/rabbitmq-02-install-concepts)）：

```ini
# 同时写文件与控制台（容器里只留 console 即可）
log.console = true
log.console.level = info

log.file.level = info
log.file = /var/lib/rabbitmq/log/rabbit.log
# 轮转：按大小或按时间（二选一）
log.rotation.file.size = 100MB
# log.rotation.file.date = $D0      # 每天一个文件
# log.file.formatter = json         # 结构化日志，接 ELK 等平台时用
```

排障时最有用的是**分类日志级别**——只把关心的类别调到 debug，不用全局拉爆日志量：

```ini
log.connection.level = info     # 连接建立/断开、认证失败
log.channel.level = info        # 信道生命周期与异常
log.queue.level = info          # 队列事件
log.federation.level = info     # 联邦链路
log.upgrade.level = info        # 升级过程
```

三个排障入口：

```bash
# 日志文件实际在哪（容器/主机各有默认）
rabbitmq-diagnostics log_location
# 生效的日志配置
rabbitmqctl environment | grep -A5 '^ {log'
# 管理控制台节点详情页也有 Log 卡片可直接看
```

> 💡 连接莫名被断查 `connection` 类日志（心跳超时、认证失败都会留痕）；集群异常查节点日志里的 Raft/Khepri 相关条目。日志级别改动需重启节点生效。

---

## 五、CLI 工具箱：不止 rabbitmqctl

前面各篇零散用过不少命令，这里收拢成一张速查（容器里统一 `docker exec <容器名> <命令>` 执行）：

| 工具 | 定位 | 高频命令 |
|------|------|---------|
| **`rabbitmqctl`** | 运维主入口 | `status` / `list_queues` / `set_policy` / `add_user` |
| **`rabbitmq-diagnostics`** | **诊断与健康检查**（排障首选） | `check_running` / `check_local_alarms` / `check_port_connectivity` / `environment` |
| `rabbitmq-plugins` | 插件启停 | `enable` / `list -e` |
| `rabbitmq-queues` / `rabbitmq-streams` | 队列/Stream 专项 | `rabbitmq-queues grow`（Quorum 扩副本）、`rabbitmq-streams add_super_stream` |
| `rabbitmqadmin` | HTTP API 的 CLI 封装 | `list queues` / `declare policy` |

两个通用技巧：

```bash
# ① 表格化输出，人读友好；脚本里则用 --formatter=json
rabbitmqctl list_queues name messages_ready --formatter=pretty_table

# ② diagnostics 的 check_* 系列用退出码表态，天生适合做探针/巡检
rabbitmq-diagnostics -q check_running && rabbitmq-diagnostics -q check_local_alarms
# 无输出、退出码 0 即健康——可直接放进定时巡检或 K8s 探针
```

> 💡 身份验证差异（09 篇踩过）：`rabbitmqctl` 系列走 Erlang 通道**不要账号密码**；`rabbitmqadmin` 走 HTTP **必须 `-u/-p`**。完整命令手册见官方 [docs/cli](https://www.rabbitmq.com/docs/cli)。

---

## 小结

| 主题 | 要点 |
|------|------|
| 监控 | Overview 人工 + `/api/*` 对接 Prometheus/Grafana |
| 备份 | Definitions JSON + 停服复制 msg_stores |
| Federation | 下游配 Upstream + Policy，单向跨机房同步 |

下一篇（系列收官）：普通集群、镜像集群与 HAProxy + Keepalived 高可用方案。
