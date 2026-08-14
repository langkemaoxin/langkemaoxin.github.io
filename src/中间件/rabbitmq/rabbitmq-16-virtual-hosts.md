---
title: "Virtual Hosts——隔离、权限与配额"
sidebarGroup: "RabbitMQ"
shortTitle: "16 Virtual Hosts"
order: 16
date: 2026-09-11
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 16/22 篇**  
> 上一篇：[《RabbitMQ 安全——认证、授权与 TLS》](/中间件/rabbitmq/rabbitmq-15-security)  
> 下一篇预告：[《RPC 模式——用 RabbitMQ 实现远程调用》](/中间件/rabbitmq/rabbitmq-17-rpc)

---

## 开头：一台集群，为啥能分出"好几套"

上一篇讲了认证、授权与 TLS（[15 安全](/中间件/rabbitmq/rabbitmq-15-security)）。授权那节有一句关键话——**权限不是全局的，而是落在某个 virtual host 里**。这句没展开，本篇就把它讲透。实际开发你早晚会撞上：

- 开发、测试、生产**能不能共用一套 RabbitMQ**又互不踩脚？
- 不同业务线各跑各的交换机和队列，**名字还能重名**？
- 怎么把一个 vhost 的**连接数、队列数**卡死在配额内？
- 连接串 `amqp://guest@host:5672/` 最后的 `/` 是什么？

答案都指向 **Virtual Host（虚拟主机，简称 vhost）**——RabbitMQ 多租户隔离的核心单位。本篇一次讲清。

---

## 一、虚拟主机是什么：逻辑隔离单元

官方一句话：RabbitMQ is a **multi-tenant system**——连接、交换机、队列、绑定、用户权限、策略这些实体都**属于某个 virtual host**，vhost 是「一组实体的逻辑分组」。

如果你熟悉 **Apache 的 virtual host** 或 **Nginx 的 server block**，概念类似：一套服务，按"虚拟分区"对外提供多套互不相干的资源空间。但有**一个关键差别**：

> Apache 的 vhost 写在配置文件里、靠重载生效；**RabbitMQ 的 vhost 不是配出来的，是用命令现建现删的**（`rabbitmqctl` 或 HTTP API），属于运行时动态资源。

| 维度 | 说明 |
|------|------|
| **资源隔离** | 每个 vhost 拥有独立的一套 Exchange / Queue / Binding / Policy / Runtime 参数。A vhost 的 `orders.fanout` 和 B vhost 的同名交换机是两条完全无关的实体，可重名 |
| **权限隔离** | 用户**没有"全局权限"**，只有在**一个或多个 vhost 内**的权限。说"某用户有写权限"必须带上"在哪个 vhost"，否则没意义（用户 tag 是例外，可视为全局） |

> **vhost 提供逻辑隔离，不是物理隔离**——同一集群的 CPU / 磁盘 / 网络是共享的。它做的是"命名空间 + 权限边界"。要硬隔离，要么靠配额（第六节），要么拆集群。

---

## 二、默认 vhost 与多租户用法

RabbitMQ 启动后自带一个名为 **`/`（正斜杠）** 的默认 vhost，默认用户 `guest` / `guest` 就活在它里面，本地调试连的也是它。

为什么默认名是单斜杠？因为它在 AMQP URI 里看起来最干净——`amqp://guest:guest@localhost:5672/`，最后那个 `/` 既是路径分隔也是 vhost 名。

多租户的典型切法有两种：

| 切法 | 示例 vhost | 适用 |
|------|-----------|------|
| **按环境切** | `dev` / `staging` / `prod` | 一套集群跑多环境，省机器；前提是生产负载不高、或配额卡得严 |
| **按业务线切** | `orders` / `marketing` / `risk` | 多团队共用平台，业务间天然隔离、可重名、权限各管各的 |

> **建议**：生产环境**别让应用直接连默认 `/`**。哪怕只有一个业务，也建一个有语义名字的 vhost（如 `prod-orders`），给将来留出拆分与扩容的空间——重命名 vhost 成本远高于一开始就分清。

---

## 三、管理 vhost：增、删、查与元数据

vhost 只能通过命令或 HTTP API 管理，不在配置文件里。当前稳定版约 **4.3.x**，以下命令均适用。

### 3.1 创建与列出

```bash
# 建一个最简单的 vhost
rabbitmqctl add_vhost qa1

# 列出所有 vhost
rabbitmqctl list_vhosts
# 带元数据列（推荐用 pretty_table）
rabbitmqctl -q --formatter=pretty_table list_vhosts name description tags default_queue_type
```

HTTP API 等价写法（`PUT /api/vhosts/{name}`）：

```bash
curl -u user:password -X PUT http://rabbitmq.local:15672/api/vhosts/qa1
```

> **新建的 vhost 是"空壳"**：自带一套默认交换机（`amq.` 前缀那些），但**没有任何用户权限**。要让某个用户能用它，必须显式 `set_permissions`（见第四节），否则连接会被拒。

### 3.2 带元数据创建（推荐）

vhost 可挂三类**元数据**（都可选）：**描述**（`--description`，人看）、**标签**（`--tags`，分组检索）、**默认队列类型**（`--default-queue-type`，见第七节）。

```bash
# 建带完整元数据的 vhost
rabbitmqctl add_vhost qa1 \
  --description "QA env 1" \
  --default-queue-type quorum \
  --tags qa,project-a

# 后续可更新（不改 vhost 名）
rabbitmqctl update_vhost_metadata qa1 \
  --description "QA environment for issue 1662" \
  --default-queue-type quorum \
  --tags qa,project-a,qa-1662
```

HTTP API 同一个 `PUT` 端点带 body：

```bash
curl -u user:password -X PUT http://rabbitmq.local:15672/api/vhosts/qa1 \
  -H "content-type: application/json" \
  --data-raw '{"description": "QA environment 1", "tags": "qa,project-a", "default_queue_type": "quorum"}'
```

### 3.3 删除：级联销毁，谨慎操作

```bash
rabbitmqctl delete_vhost qa1
# 或 HTTP API：DELETE /api/vhosts/qa1
```

> ⚠️ **删除 vhost 会永久删除其内部的所有实体**——队列、交换机、绑定、策略、权限、消息、Federation 上游、Shovel……**全没了**。生产环境务必走变更流程。

批量删除（`rabbitmqadmin` 按正则匹配）是**极危险**的操作，官方反复强调**先 `--dry-run`**：

```bash
# 先预演，看清会删哪些
rabbitmqadmin vhosts delete_multiple --name-pattern "^test-.*" --dry-run
# 确认无误，加 --approve 才真删
rabbitmqadmin vhosts delete_multiple --name-pattern "^test-.*" --approve
```

默认 vhost `/` **永远会被保留**，即便匹配了正则也不会被这个命令删掉。

### 3.4 删除保护：给关键 vhost 上把锁

为防手滑，4.x 支持给 vhost 打**删除保护**，打上后任何删除都会被拒：

```bash
rabbitmqctl enable_vhost_protection_from_deletion "prod-orders"
rabbitmqctl delete_vhost "prod-orders"
# => Error: Cannot delete this virtual host: it is protected from deletion. ...
rabbitmqctl disable_vhost_protection_from_deletion "prod-orders"   # 解除后才能删
```

`list_vhosts name protected_from_deletion` 可查保护状态。HTTP API 侧是 `POST/DELETE /api/vhosts/{name}/deletion/protection`，受保护时删除返回 **412 Precondition Failed**；definition 文件里也可用 `metadata.protected_from_deletion: true` 在创建时标记。

> **建议**：生产 vhost 一律开删除保护，多一步解除就足以挡住绝大多数手滑。

### 3.5 批量预配：用 definition 而不是循环

vhost 创建是**集群范围的阻塞事务**，单次可能花到几秒。循环建一批时，客户端容易跑得比实际创建快、撞上超时。

> **大批量预配的正确姿势是 definition 导入导出**，而不是写循环 `add_vhost`。非要用循环，请调大操作超时并在每次操作间加延迟。

---

## 四、权限模型：per-vhost 的 configure / write / read

这是 vhost 最核心的作用之一，也是和 [15 安全](/中间件/rabbitmq/rabbitmq-15-security) 衔接最紧的地方。

RabbitMQ 的授权是**三维正则**，作用域是**单个 vhost**：

| 权限 | 控制什么 | 典型正则 |
|------|----------|---------|
| **configure** | 声明 / 删除资源（建/删交换机、队列、绑定） | `.*`（全允许）、`^orders\.`（仅 orders 前缀） |
| **write** | 向交换机发布消息、创建绑定（生产侧） | `.*` |
| **read** | 从队列消费、创建消费者侧绑定（消费侧） | `.*` |

三条都是正则，匹配的是**资源名**。给用户在某个 vhost 里授权的命令长这样：

```bash
# 在 qa1 这个 vhost 里，给用户 app-prod 全权限
rabbitmqctl set_permissions -p qa1 app-prod ".*" ".*" ".*"

# 只允许消费（read），不让建资源也不让发
rabbitmqctl set_permissions -p qa1 consumer-only "^$" "^$" "^events\."
```

> 没有所谓的"全局权限"——`set_permissions` 不带 `-p` 时作用的是默认 vhost `/`。一个用户能用哪些 vhost，取决于你在**每个** vhost 里分别给它授过权。完整安全模型见 [15 安全](/中间件/rabbitmq/rabbitmq-15-security)。

---

## 五、连接时指定 vhost

AMQP 0-9-1 客户端连接时**必须指定一个 vhost**。认证 + 该用户在该 vhost 的授权都通过，连接才建立。各客户端写法：

**Java（amqp-client）：**

```java
ConnectionFactory factory = new ConnectionFactory();
factory.setHost("rabbitmq.local");
factory.setVirtualHost("qa1");   // 关键这一行
Connection conn = factory.newConnection();
```

**URI 形式（所有客户端通用）：**`amqp://app-prod:password@rabbitmq.local:5672/qa1`

> 注意 URI 最后一段 `/qa1` 就是 vhost 名。**默认 `/` 在 URI 里要写成 `%2F`**：`amqp://guest:guest@localhost:5672/%2F`——直接写 `/` 会被当成空路径。

**Spring Boot（application.yml）：**

```yaml
spring:
  rabbitmq:
    host: rabbitmq.local
    virtual-host: qa1
    # 或用 uri 一次写完：
    # uri: amqp://app-prod:password@rabbitmq.local:5672/qa1
```

连接握手细节见 [03 基础编程模型](/中间件/rabbitmq/rabbitmq-03-programming-model)。

---

## 六、配额与限制：给 vhost 上护栏

vhost 是逻辑隔离，物理资源（连接、内存、队列数）是共享的。要防"一个 vhost 把集群吃垮"，得靠 **per-vhost limits**。

### 6.1 两类核心限制

| 限制 | 含义 | 特殊用法 |
|------|------|---------|
| **`max-connections`** | 该 vhost 的并发客户端连接上限 | **设为 `0` = 完全禁止新连接**（临时封死某 vhost，又不删数据） |
| **`max-queues`** | 该 vhost 的队列总数上限 | 防止应用无限建队列 |

```bash
# 限制 qa1 最多 256 个并发连接
rabbitmqctl set_vhost_limits -p qa1 '{"max-connections": 256}'

# 限制最多 1024 个队列
rabbitmqctl set_vhost_limits -p qa1 '{"max-queues": 1024}'

# 临时封死（0 连接）
rabbitmqctl set_vhost_limits -p qa1 '{"max-connections": 0}'

# 查看
rabbitmqctl list_vhost_limits -p qa1

# 清除某项
rabbitmqctl clear_vhost_limits -p qa1 '{"max-connections": 256}'
```

> **"封死 vhost"是个好用的小招**：出故障想暂停某个业务的消息流入又不想删数据，把 `max-connections` 设 `0` 即可，客户端一连接就被拒。恢复时再设回去。

### 6.2 在 rabbitmq.conf 里预配默认限制

当 vhost 是**用户动态创建**的（如把 RabbitMQ 当服务对外提供），需要保证新建 vhost 自动套上一致配额。`rabbitmq.conf` 支持按 **vhost 名 pattern** 分组预配：

```ini
# pipelines 开头的 vhost
default_limits.vhosts.1.pattern = ^pipelines
default_limits.vhosts.1.max_connections = 10
default_limits.vhosts.1.max_queues = 1000

# telemetry 开头：高连接、高队列
default_limits.vhosts.2.pattern = ^telemetry
default_limits.vhosts.2.max_connections = 10000
default_limits.vhosts.2.max_queues = 10000

# 兜底：所有其他 vhost
default_limits.vhosts.3.pattern = .*
default_limits.vhosts.3.max_connections = 20
default_limits.vhosts.3.max_queues = 20
```

用 **`-1`** 表示某项不限制。这是"创建时的默认值"，之后仍可用 `set_vhost_limits` 覆盖。

---

## 七、默认队列类型（DQT）：per-vhost 的队列类型默认值

这一节和 [04 队列核心概念](/中间件/rabbitmq/rabbitmq-04-queue-concepts) 的"声明等价"、[07 队列类型](/中间件/rabbitmq/rabbitmq-07-queue-types) 的 Classic/Quorum/Stream 强相关。

回顾一下：声明队列时不传 `x-queue-type`，Broker 会用一个**默认类型**。这个默认值现在可以**按 vhost 配**。

### 7.1 设置与优先级

在 vhost 元数据里指定（见 3.2）：`rabbitmqctl add_vhost qa1 --default-queue-type quorum`。支持 **`quorum` / `stream` / `classic`**。优先级只有一条：

> **vhost 级 DQT > 节点级 DQT**。两者都没设，兜底是 `classic`。节点级在 `rabbitmq.conf` 里设：`default_queue_type = quorum`。

### 7.2 三条要点

- **只对新声明生效**。已经存在的队列类型**不可变**——改 DQT 不会动旧队列，[04 声明等价](/中间件/rabbitmq/rabbitmq-04-queue-concepts) 那条铁律仍然在。
- **导出 definition 时**，对那些当初没显式指定类型的队列，会把这个"生效中的 vhost 默认值"注入到队列属性里，保证导出能还原。
- **迁移到 Quorum 队列期间的过渡开关**：如果默认类型刚从 classic 改成 quorum，但部分老应用还在用 classic 声明同一队列，会触发属性不等、Channel 关闭。可临时放宽检查：

```ini
# 仅在过渡期使用，帮助分批迁移到 quorum
quorum_queue.property_equivalence.relaxed_checks_on_redeclaration = true
```

> **过渡开关是临时绷带**，迁完就关掉。长期开着会让"声明等价"这条安全网失效，[04 第二节](/中间件/rabbitmq/rabbitmq-04-queue-concepts) 说的那些坑会重新冒出来。

---

## 八、vhost 之间不互通：跨 vhost 得靠"搬运工"

隔离是 vhost 的本分，代价就是**它俩天然不通**：

> 客户端连到 vhost A 后，**只能**操作 A 里的交换机、队列、绑定。A 的交换机和 B 的队列**不能直接绑定**。

跨 vhost 流转消息只有两条路：

1. **应用双连**：同一个应用同时连 A 和 B，从 A 消费、再向 B 发布。简单但要自己写搬运逻辑。
2. **插件搬运**（生产推荐）：
   - **[Shovel](/中间件/rabbitmq/rabbitmq-18-shovel)**：点对点可靠搬运，配置简单，适合"对接"场景。
   - **[Federation 联邦](/中间件/rabbitmq/rabbitmq-10-monitor-backup-federation)**：上游单向同步到下游，适合多机房、多集群松耦合共享。

两个 vhost 可在同一集群，也可跨集群——Shovel/Federation 都不挑。

---

## 九、协议差异：STOMP 有 vhost，MQTT 没有

| 协议 | 对 vhost 的支持 |
|------|----------------|
| **AMQP 0-9-1** | 原生支持，连接时必须指定 vhost |
| **STOMP** | 有 vhost 概念，连接时指定 |
| **MQTT** | **没有 vhost 概念**。默认连到单个 RabbitMQ 主机；通过 MQTT 专用约定，可在不改客户端库的前提下把连接路由到特定 vhost |

> 多协议混用时，MQTT 客户端默认落在哪个 vhost 是常见疑惑——它走 RabbitMQ 的 MQTT 插件配置，不走 AMQP 的 vhost 握手。

---

## 小结

- **vhost = 资源（Exchange/Queue/Binding/Policy）+ 权限的逻辑隔离单元**，不是物理隔离；类比 Apache vhost / Nginx server block，但**用命令动态建删**，不写在配置文件里。
- **默认 vhost 是 `/`**，URI 里要转义成 `%2F`；生产建议建带语义名的 vhost，别直接用 `/`。
- **管理全靠命令 / HTTP API**：`add_vhost` / `delete_vhost` / `list_vhosts`；可带 description/tags/默认队列类型等元数据；**删除=级联销毁一切**，关键 vhost 开**删除保护**，批量删务必先 `--dry-run`；大批预配用 **definition 导入**而非循环。
- **权限是 per-vhost 的 configure/write/read 三维正则**（呼应 [15 安全](/中间件/rabbitmq/rabbitmq-15-security)），没有全局权限；`set_permissions -p <vhost>` 授权，客户端连接时必须指定 vhost 并通过授权。
- **配额**：`max-connections`（设 `0` 可临时封死）/ `max-queues`，用 `set_vhost_limits` 配；动态 vhost 可在 `rabbitmq.conf` 按 pattern 预配默认限制。
- **默认队列类型（DQT）**：vhost 级 > 节点级 > `classic` 兜底；只对新声明生效、旧队列不可变；迁移期可临时开 `relaxed_checks_on_redeclaration`（呼应 [04](/中间件/rabbitmq/rabbitmq-04-queue-concepts) / [07](/中间件/rabbitmq/rabbitmq-07-queue-types)）。
- **vhost 之间不互通**，跨 vhost 搬消息靠应用双连或 [Shovel](/中间件/rabbitmq/rabbitmq-18-shovel) / [Federation](/中间件/rabbitmq/rabbitmq-10-monitor-backup-federation)。
- **协议差异**：AMQP/STOMP 有 vhost；**MQTT 没有**，走插件约定。

下一篇回到应用模式：[《RPC 模式——用 RabbitMQ 实现远程调用》](/中间件/rabbitmq/rabbitmq-17-rpc)。
