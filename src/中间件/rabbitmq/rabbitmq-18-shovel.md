---
title: "Shovel——跨 Broker 的可靠消息转发"
sidebarGroup: "RabbitMQ"
shortTitle: "18 Shovel"
order: 18
date: 2026-09-13
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 18/22 篇**  
> 上一篇：[《RPC 模式——用 RabbitMQ 实现远程调用》](/中间件/rabbitmq/rabbitmq-17-rpc)  
> 下一篇预告：[《常用插件巡览——consistent-hash、delayed-message 等》](/中间件/rabbitmq/rabbitmq-19-plugins)

---

## 开头：跨集群搬消息，谁来当搬运工

第 10 篇讲过的 [Federation 联邦](/中间件/rabbitmq/rabbitmq-10-monitor-backup-federation) 解决了"下游按需拉上游"的同步问题。但有些场景不是"按需同步"，而是真正的"搬家"：把一个集群的队列整体搬到另一个、把边缘机房数据汇聚到中心、或老集群退役前把存量消息平滑迁走。这时候你需要的是 **Shovel**——一个跑在 Broker 内部、像规范客户端一样从源队列取消息、转发到目标，两端都用确认机制兜底的可靠搬运工。

---

## 一、Shovel 是什么

### 1.1 核心概念

Shovel（`rabbitmq_shovel` 插件）是一个 **核心插件**，作用很纯粹：**单向**地把消息从源（Source）搬到目标（Destination）。源通常是一个队列，目标可以是 exchange、queue 或 topic。

它本质是一个"消息泵"，内部只做四件事：

1. 连接到源和目标两个 Broker
2. 从源队列消费消息
3. 重新发布到目标
4. 两端都用 ack 和 publisher confirms 保证数据安全，失败自动重连

> Shovel 就像一个写得规范的客户端应用：连接、消费、重发布、确认——只是它跑在 Broker 节点进程里，而不是你的业务进程中。

源和目标可以同处一个集群（比如不同 vhost 之间），也可以是完全不同的两个集群。它同时支持 **AMQP 0-9-1** 和 **AMQP 1.0**，甚至可以混用：从 AMQP 1.0 的 broker（如 Azure Service Bus）搬到 RabbitMQ，或反过来。

### 1.2 典型场景

| 场景 | 说明 |
|------|------|
| **集群迁移** | 老集群退役，把存量消息平滑搬到新集群 |
| **跨机房/跨可用区桥接** | 专线连通的两个数据中心之间单向传消息 |
| **边缘汇聚中心** | 多个边缘 broker 的数据汇总到中心集群统一处理 |
| **跨协议搬运** | 从 AMQP 1.0 系统搬到 RabbitMQ，反之亦然 |
| **一次性搬迁** | 临时把某个队列的消息挪走，搬完自毁 |

---

## 二、Shovel vs Federation：该用哪个

Shovel 和 Federation 都做"跨 broker 传消息"，很容易混淆。记住一个最关键的区别：

> **Federation 是"下游拉"，Shovel 是"源端推"。**

完整对比：

| 维度 | Shovel | Federation（队列联邦） |
|------|--------|----------------------|
| **搬运语义** | 无条件搬运源队列所有消息 | 仅当上游没有本地消费者时才拉 |
| **方向性** | 严格单向 | 可双向、N 向 |
| **触发方** | 源端（或第三方集群）主动推 | 下游主动连上游拉 |
| **配置位置** | 在"搬运起点"或独立集群配置 | 在"接收方/下游"配置 upstream |
| **连接关系** | 一对一 source → dest | 多上游可聚到一个下游 |
| **临时搬迁** | 支持（`src-delete-after` 搬完自毁） | 不适合，联邦是长期链路 |
| **协议** | AMQP 0-9-1 / 1.0 / local | AMQP 0-9-1 / 1.0 |

一句话选择：

- 想"长期、按需同步，下游有消费者就不重复拉" → **Federation**
- 想"无条件、可控地把消息从 A 搬到 B，搬完可能就结束" → **Shovel**

---

## 三、启用插件

Shovel 是 RabbitMQ 自带的核心插件，默认未启用：

```bash
# 启用 Shovel 核心
rabbitmq_plugins enable rabbitmq_shovel
# 启用管理台监控（强烈建议）
rabbitmq_plugins enable rabbitmq_shovel_management
```

> 管理台插件提供 **Shovel Status** 页和 HTTP API（`/api/shovels`），生产环境几乎必装。启用后 Admin 菜单会多出 `Shovel Status` 和 `Shovel Management` 两项。

---

## 四、两种声明方式：Static vs Dynamic

Shovel 分 **静态（Static）** 和 **动态（Dynamic）** 两种，官方明确推荐动态。

| 维度 | Static Shovel | Dynamic Shovel |
|------|---------------|----------------|
| **定义位置** | `advanced.config`（Erlang 配置文件） | 运行时参数（runtime parameter） |
| **增删代价** | 需要重启节点 | 随时增删，无需重启 |
| **配置格式** | Erlang 术语 | JSON |
| **自动化友好** | 低 | 高，可随 definitions 一起导入导出 |
| **适用场景** | 长期固定的永久链路 | 绝大多数场景 |

> 官方原话：*Dynamic shovels is the modern shovel type. When in doubt, prefer dynamic shovels.* 下文以 Dynamic 为主，Static 给个最小示例。

---

## 五、Dynamic Shovel：动态声明

动态 Shovel 本质是一个 runtime parameter，组件名固定为 `shovel`，隶属于某个 vhost。声明方式有三种：CLI、HTTP API、管理台。

### 5.1 用 rabbitmqctl 声明

最直接的方式，`set_parameter` + 一段 JSON：

```bash
# my-shovel 是这条 Shovel 的名字
rabbitmqctl set_parameter shovel my-shovel \
'{"src-protocol": "amqp091",
  "src-uri": "amqp://",
  "src-queue": "source-queue",
  "dest-protocol": "amqp091",
  "dest-uri": "amqp://remote-server",
  "dest-queue": "target-queue",
  "dest-queue-args": {"x-queue-type": "quorum"}}'
```

含义：从本集群默认 vhost 的 `source-queue` 取消息，转发到 `remote-server` 的 `target-queue`，目标队列声明为 **仲裁队列**（quorum）。

> `src-uri` / `dest-uri` 既可以是单个字符串，也可以是字符串数组。传数组时 Shovel 会随机挑一个直到连上——天然支持源端/目标端的多节点故障转移。

### 5.2 用 HTTP API 声明

```bash
# guest 账号仅限 localhost，生产请换独立账号
curl -v -u guest:guest -X PUT http://localhost:15672/api/parameters/shovel/%2f/my-shovel \
-H "content-type: application/json" \
-d @- <<EOF
{
  "value": {
    "src-protocol": "amqp091",
    "src-uri": "amqp://localhost",
    "src-queue": "source-queue",
    "dest-protocol": "amqp091",
    "dest-uri": "amqp://remote.rabbitmq.local",
    "dest-queue": "destination-queue"
  }
}
EOF
```

端点 `PUT /api/parameters/shovel/{vhost}/{name}`，其中 `%2f` 是默认 vhost `/` 的 URL 编码。调用账号需要 `policymaker` 权限标签。

### 5.3 用管理台声明

最直观：`Admin → Shovel Management → Add a new shovel`，填表提交即可。表单字段与上面 JSON 一一对应，适合临时验证。

---

## 六、关键配置属性

### 6.1 必备字段

| Key | 说明 |
|-----|------|
| `src-uri` / `dest-uri` | 源/目标连接 URI，**必填**；支持数组做多节点故障转移 |
| `src-protocol` / `dest-protocol` | 协议：`amqp091`（默认）、`amqp10`、`local`（4.2+） |
| `src-queue` | 源队列名，与 `src-exchange` 二选一 |
| `dest-queue` 或 `dest-exchange` | 目标队列或交换机；都不填则按原 exchange / routing-key 投递 |

### 6.2 数据安全三件套（重点）

| Key | 说明 |
|-----|------|
| `ack-mode` | 确认模式，见下表 |
| `src-prefetch-count` | 同时未确认消息上限，默认 1000 |
| `reconnect-delay` | 断线重连间隔（秒），默认 1 |

`ack-mode` 三档，直接决定会不会丢消息：

| ack-mode | 行为 | 安全性 / 吞吐 |
|----------|------|---------------|
| `on-confirm`（默认） | 目标端 publisher confirm 成功后，才向源端 ack | 最安全，最慢 |
| `on-publish` | 消息发到目标（尚未 confirm）即向源端 ack | 网络故障可能丢 |
| `no-ack` | 源端自动 ack，不等转发结果 | 吞吐最高，会丢消息 |

> 生产环境保持默认 `on-confirm` 别动。只有对丢消息不敏感、追求极限吞吐的日志类场景才考虑降级——但那时候你大概率不需要 Shovel 了。

### 6.3 搬完自毁：src-delete-after

这个属性让 Shovel 能当"一次性搬运工"用，迁移场景特别好用：

| 取值 | 含义 |
|------|------|
| `never`（默认） | 永久运行 |
| `queue-length` | 启动时量一下源队列长度，搬完那么多条就自删 |
| 整数 N | 搬完 N 条就自删 |

设成 `queue-length`，搬完 Shovel 自动消失、不留尾巴。注意它不能和 `ack-mode: no-ack` 一起用。

### 6.4 消息属性保留与改写

默认情况下，Shovel **保留原消息的全部属性**（delivery_mode、headers、correlation_id 等）。可选覆盖：

| Key | 说明 |
|-----|------|
| `dest-publish-properties` | 覆盖消息属性，如强制 `delivery_mode: 2`（持久化） |
| `dest-add-forward-headers` | 加 `x-shovelled` 头，标记来源与去向（默认 false） |
| `dest-add-timestamp-header` | 加 `x-shovelled-timestamp`（默认 false） |
| `dest-exchange-key` | 目标 routing-key，不填则用原值 |

> 开启 `dest-add-forward-headers: true` 后，下游能从 header 反查消息是哪个 Shovel 搬来的、从哪到哪，排错非常方便。

---

## 七、Static Shovel：配置文件声明

确实要静态，在 `advanced.config` 里用 Erlang 写。结构是 `rabbitmq_shovel` 应用下的 `shovels` 列表：

```erlang
{rabbitmq_shovel,
 [ {shovels,
    [ {my_first_shovel,
       [ {source,
          [ {protocol, amqp091},
            {uris, ["amqp://fred:secret@host1.domain/my_vhost",
                    "amqp://john:secret@host2.domain/my_vhost"]},
            {declarations,
             [ {'queue.declare', []},
               {'queue.bind', [{exchange, <<"my_fanout">>},
                               {queue,   <<>>}]}
             ]},
            {queue, <<>>},
            {prefetch_count, 10}
          ]},
         {destination,
          [ {protocol, amqp091},
            {uris, ["amqp://"]},
            {declarations,
             [ {'exchange.declare',
                [{exchange, <<"my_direct">>},
                 {type, <<"direct">>},
                 durable]}
             ]},
            {publish_properties, [{delivery_mode, 2}]},
            {add_forward_headers, true},
            {publish_fields, [{exchange, <<"my_direct">>},
                              {routing_key, <<"from_shovel">>}]}
          ]},
         {ack_mode, on_confirm},
         {reconnect_delay, 5}
       ]}
    ]}
 ]}.
```

要点解读：

- `source` / `destination` 各含 `protocol`、`uris` 和协议专属字段
- `declarations` 是一串 AMQP 0-9-1 方法调用序列，用来建拓扑（声明队列、交换机、绑定）；`queue, <<>>` 约定为"上一个声明的队列"，常配合匿名队列
- `ack_mode` 用下划线形式（`on_confirm`），动态版用连字符（`on-confirm`）
- **改完必须重启节点才生效**——这是静态最大的硬伤

---

## 八、AMQP 1.0 与 Local Shovel

### 8.1 AMQP 1.0 Shovel

跨协议搬运是 Shovel 的一大亮点。AMQP 1.0 用 `src-address` / `dest-address` 替代 queue/exchange：

```bash
rabbitmqctl set_parameter shovel my-amqp10-shovel \
'{"src-protocol": "amqp10",
  "src-uri": "amqp://username:password@source-server",
  "src-address": "/queues/source-queue",
  "dest-protocol": "amqp10",
  "dest-uri": "amqp://username:password@dest-server",
  "dest-address": "/queues/target-queue"}'
```

注意 AMQP 1.0 协议本身没有 vhost 概念，连 RabbitMQ 时用 URI 查询参数 `hostname=vhost:名称` 指定目标 vhost。混合协议（0-9-1 源 + 1.0 目标，或反过来）也完全支持。

### 8.2 Local Shovel（4.2+）

RabbitMQ 4.2 新增 `local` 类型：不走任何网络协议，直接用内部 API 在本集群内搬运——特别适合同一集群、不同 vhost 之间搬消息，零协议开销、无需 TLS。配置和 AMQP 0-9-1 基本一致，只是 `protocol` 设为 `local`。注意它只能在声明它的那个集群内使用，不能跨集群。

---

## 九、监控与运维

### 9.1 查看状态

CLI 方式：

```bash
# 表格输出
rabbitmqctl shovel_status --formatter=pretty_table
# JSON 输出，便于对接监控
rabbitmqctl shovel_status --formatter=json | jq
```

HTTP API（需启用 `rabbitmq_shovel_management`）：

```bash
# 列出默认 vhost 的所有 Shovel（查单条追加 /vhost/%2f/{name}）
curl -u guest:guest http://localhost:15672/api/shovels/%2f
```

管理台：`Admin → Shovel Status`，直观看到每条 Shovel 的运行情况。状态只有三档：`starting`（连接中）、`running`（搬运中）、`terminated`（已停止或异常，附带原因）。

### 9.2 重启与删除

```bash
# 重启（安全：未确认消息会自动重新入队）
rabbitmqctl restart_shovel "my-shovel"

# 删除（本质是清掉 runtime parameter）
rabbitmqctl clear_parameter shovel "my-shovel"
```

对应 HTTP API 分别是 `DELETE /api/shovels/vhost/{vhost}/{name}/restart`（重启）和 `DELETE /api/parameters/shovel/{vhost}/{name}`（删除）。

> 重启 Shovel 是安全的：配合 `ack-mode: on-confirm`，任何未确认/未 confirm 的"in flight"消息都会自动重新入队，重启后再消费一遍，不会丢。

---

## 十、集群故障与高可用

Dynamic Shovel 会在集群所有启用插件的节点上自动定义，但 **同一时刻只在其中一个节点上运行**。该节点挂了，自动在另一个节点重启，无需人工介入。

为应对源端或目标端集群的单点故障，`src-uri` / `dest-uri` 都支持传多个端点（数组）。Shovel 会随机尝试直到连上一个，任一端点宕机自动切换——这是跨集群可靠性的关键，前面 5.1 节的提示里已提到这一点。

---

## 十一、生产实践建议

| 建议 | 说明 |
|------|------|
| **优先 Dynamic** | 99% 场景用动态，运维省心 |
| **ack-mode 保持默认** | `on-confirm` 才是"可靠搬运"的意义（详见 6.2） |
| **开 forward-headers** | 排错时能定位消息来源链路 |
| **跨公网用 amqps** | 务必 `amqps://` + 证书；Erlang 26 起默认开启 peer verification |
| **账号最小权限** | Shovel 连接和普通客户端一样要授权，别用 admin 账号 |

> TLS 特别提醒：Erlang 26（RabbitMQ 3.13+/4.x）之后，TLS 客户端默认开启 peer verification。Shovel 走 `amqps://` 时若没配客户端证书，连接会直接失败——要么配上 `cacertfile`/`certfile`/`keyfile`，要么显式 `verify=verify_none`（仅测试用）。

---

## 小结

| 主题 | 要点 |
|------|------|
| **定位** | Shovel 是跨 broker 的单向可靠搬运工，源端推式 |
| **对比 Federation** | Federation 下游拉、按需同步；Shovel 源端推、无条件搬 |
| **Static vs Dynamic** | 配置文件 vs 运行时参数，官方推荐 Dynamic |
| **数据安全** | `ack-mode: on-confirm` + publisher confirms 双保险 |
| **协议支持** | AMQP 0-9-1 / 1.0 / local（4.2+），可混用 |
| **运维** | `rabbitmqctl shovel_status` 监控，重启/删除都是热操作 |

下一篇：RabbitMQ 常用插件巡览——consistent-hash、delayed-message 等实用插件逐一上手。
