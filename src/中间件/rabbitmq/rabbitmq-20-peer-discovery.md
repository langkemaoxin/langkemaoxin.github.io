---
title: "集群 Peer Discovery——自动发现与 K8s 集成"
sidebarGroup: "RabbitMQ"
shortTitle: "20 Peer Discovery"
order: 20
date: 2026-09-15
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 20/22 篇**  
> 上一篇：[《常用插件巡览——consistent-hash、delayed-message 等》](/中间件/rabbitmq/rabbitmq-19-plugins)  
> 下一篇预告：[《从 3.x 到 4.x——升级、迁移与 Feature Flags》](/中间件/rabbitmq/rabbitmq-21-migration-upgrade)

---

## 开头：手动 join_cluster，三台还行，三十台就崩了

在 [第 11 篇 集群与高可用](/中间件/rabbitmq/rabbitmq-11-cluster-ha) 里，我们是这样搭集群的：SSH 登上 worker2，`stop_app` → `join_cluster rabbit@worker1` → `start_app`，一台一台手搓。

三台机器还能忍；一旦上了云、用了 K8s、节点随负载弹性伸缩—— Pods 可能随时被调度、被销毁、被重建，你根本没机会 SSH 进去手动 join。**集群还没等搭好，节点已经漂走了。**

于是 RabbitMQ 提供了 **Peer Discovery（对等节点发现）**：节点一启动，自己去问"还有谁在"，找到同伴就自动 `join_cluster`，全程不用人介入。本篇讲清楚它怎么工作、有哪些后端、以及 K8s 上怎么和 StatefulSet 打配合。

> 本篇是第 11 篇的 **前序与自动化升级**：11 篇讲"集群是什么、手动怎么搭"，本篇讲"节点怎么自己找到彼此、自动成团"。建议先读 11 篇建立集群概念。

---

## 一、什么是 Peer Discovery

一句话：**节点启动时，自动发现同伴并加入集群的子系统。**

它由一个核心配置项开启：

```ini
cluster_formation.peer_discovery_backend = classic_config
```

`cluster_formation.peer_discovery_backend` 决定节点用哪种"问路方式"去找同伴——是查配置文件、查 DNS、查 K8s API，还是查 Consul/etcd。每种方式叫一个 **后端（backend）**。

### 工作流程

当一个 **全新（blank）节点** 启动，且检测到自己没有已初始化的数据目录时，它会按下面这套流程走：

1. 检查是否配置了 peer discovery 后端；
2. 若配置了，就执行发现，拿到一份候选节点列表；
3. 按顺序逐个尝试联系列表中的同伴；
4. 联系上第一个可达的同伴，就 `join_cluster` 加进去。

如果没配置、或反复失败、或一个同伴都够不着，这个"初来乍到"的节点就把自己当成 **独立单节点** 起来，并在日志里记录结果。

> 注意：只有 **新节点** 会跑 peer discovery。**老节点重启**时不走这套流程，而是直接联系它"上次见过的同伴"——这部分后面专门讲。

---

## 二、可选的后端机制

RabbitMQ 的 peer discovery 后端分两类：**内置**（核心自带，开箱即用）和 **插件**（需提前启用）。

| 后端 | 类型 | 是否支持注册 | 典型场景 |
|------|------|------------|---------|
| `classic_config` | 内置 | 否（节点写死在配置） | 节点固定、规模小 |
| `dns` | 内置 | 否 | 有统一 DNS 入口的环境 |
| `k8s` | 插件 | 由 K8s 管控 | Kubernetes StatefulSet 部署 |
| `aws` | 插件 | 由 ASG 管控 | EC2 + 自动伸缩组 |
| `consul` | 插件 | 是（注册 + 健康检查 + 锁） | Consul 服务发现生态 |
| `etcd` | 插件 | 是（带 TTL 的 key + 锁） | etcd 服务发现生态 |

**"是否支持注册"** 是个关键区别：

- **不支持注册**的后端（classic_config、dns）：同伴列表是 **预先知道**的——写死在配置或 DNS 里，节点不用主动"报到"。
- **支持注册**的后端（consul、etcd）：节点启动时往注册中心 **登记自己**，离开时注销；别的节点查注册中心拿实时列表。这种适合节点动态增减的场景。
- **K8s / AWS** 介于两者之间：成员关系由编排器（K8s API、AWS ASG）管，节点本身不显式注册，但成员列表不是预先写死的。

插件类后端必须在 **节点首次启动前** 就启用，否则节点读不到对应配置、直接启动失败。用 `--offline` 模式提前启用：

```bash
rabbitmq-plugins --offline enable rabbitmq_peer_discovery_k8s
```

---

## 三、Classic Config 后端：最朴素的"点名册"

最简单的后端：把所有节点名写进配置文件，节点启动时照着名单一个个联系。

```ini
cluster_formation.peer_discovery_backend = classic_config

cluster_formation.classic_config.nodes.1 = rabbit@rmq1.eng.example.local
cluster_formation.classic_config.nodes.2 = rabbit@rmq2.eng.example.local
cluster_formation.classic_config.nodes.3 = rabbit@rmq3.eng.example.local
```

> 后端值既可用短名 `classic_config`，也可用模块名 `rabbit_peer_discovery_classic_config`，两者等价。其它后端同理。

**优点**：零依赖，不用外部服务。**缺点**：节点增减要改配置、重启，完全静态。适合 3～5 个固定节点的小集群。

---

## 四、DNS 后端：一条记录拉出一串节点

DNS 后端靠一个"种子域名"工作，流程是：

1. 查种子域名的 **A 记录**（或 AAAA），拿到一批 IP；
2. 对每个 IP 做 **反向 DNS**，得到主机名；
3. 给每个主机名拼上当前节点的前缀（如 `rabbit@`），得到候选节点列表。

举个例子：种子域名 `discovery.eng.example.local` 有两条 A 记录，解析到 `192.168.100.1` 和 `192.168.100.2`；反查得到 `node1.eng.example.local`、`node2.eng.example.local`；最终候选节点就是 `rabbit@node1.eng.example.local` 和 `rabbit@node2.eng.example.local`。

```ini
cluster_formation.peer_discovery_backend = dns
cluster_formation.dns.hostname = discovery.eng.example.local
```

> **重要**：DNS 后端 **不用锁** 来防止并行启动的竞态。如果你的部署工具会同时拉起所有节点，必须由部署工具注入一个 **1～20 秒的随机启动延迟**，避免多个节点同时各自"建国"、形成多个独立集群。

另一个坑：某些容器环境（如 Podman）会在容器启动时改 `/etc/hosts`，可能把反向 DNS 搞乱，导致这个后端失效。遇到解析问题先查 hosts 文件。

---

## 五、Kubernetes 后端：和 StatefulSet 天作之合

> 提示：如果用 **RabbitMQ Cluster Operator**（官方推荐的 K8s 部署方式）或主流 Helm Chart，peer discovery 已经替你配好了，通常无需手动干预。本节讲的是"自己写 StatefulSet"时它背后的原理。

K8s 后端是云原生场景的重头戏。它依赖一个关键事实：**StatefulSet 给每个 Pod 一个稳定的、带序号的名字**——`rmq-0`、`rmq-1`、`rmq-2`……这天然就是一份现成的节点名单。

### 5.1 启用插件

把 `rabbitmq_peer_discovery_k8s` 加到 `enabled_plugins`（K8s 里通常是个 ConfigMap），或用 `--offline` 提前启用：

```bash
rabbitmq-plugins --offline enable rabbitmq_peer_discovery_k8s
```

### 5.2 种子节点逻辑（4.1 起的新行为）

从 **RabbitMQ 4.1** 开始，K8s 后端的成团逻辑大幅简化了：

> **只有序号最小的节点（几乎总是 `-0` 那个 Pod）允许创建新集群**，它就是"种子节点"（seed node）。其它节点一律去 join 种子节点；够不着就一直重试。

这意味着最常见的成团过程是：

- `rmq-0` 先起来，发现自己是种子，直接以单节点集群身份初始化；
- `rmq-1`、`rmq-2` 随后起来，各自发现并 join `rmq-0`，同步集群元数据。

**绝大多数情况下，启用插件之外不需要任何额外配置。** 只有两种例外需要手动指定：

```ini
# 例外一：StatefulSet 用了非 0 的起始序号（.spec.ordinals.start 不为 0）
cluster_formation.k8s.ordinal_start = 1

# 例外二：插件因非常规 K8s 配置没正常工作，强制指定种子节点
cluster_formation.k8s.seed_node = rabbit@rmq-0.rmq-headless.default.svc.cluster.local
```

> 如果你真的用到 `seed_node` 强制指定，说明遇到了非典型环境——官方建议顺便去 GitHub 提个 issue，好让他们改进插件。

### 5.3 和 StatefulSet 配合的部署要点

一个能自动成团的 K8s 部署，至少要有这几样：

| 组件 | 作用 |
|------|------|
| **Headless Service** | 给每个 Pod 提供稳定的 DNS（`rmq-0.rmq-headless`），节点名才能解析 |
| **StatefulSet** | 提供稳定 Pod 名 + 序号，是种子节点逻辑的基础 |
| **ServiceAccount + RBAC** | 让插件能查询 K8s API（列出 Pods） |
| **PV（持久卷）** | 节点重启后保留 mnesia 数据，避免被当成 blank 节点 |

骨架大致如下：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rmq-headless
spec:
  clusterIP: None          # Headless，每个 Pod 有独立 DNS
  selector:
    app: rabbitmq
  ports:
    - port: 5672
      name: amqp
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rmq
spec:
  serviceName: rmq-headless
  replicas: 3
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      serviceAccountName: rabbitmq   # 绑定有 RBAC 的 ServiceAccount
      containers:
        - name: rabbitmq
          image: rabbitmq:4.3-management
          env:
            - name: RABBITMQ_NODENAME   # 用长名，匹配 Headless Service DNS
              value: rabbit@$(MY_POD_NAME).rmq-headless.default.svc.cluster.local
            - name: MY_POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          ports:
            - containerPort: 5672
              name: amqp
```

插件要调 K8s API 列 Pods，所以 **ServiceAccount 必须有 RBAC 权限**。一份最小 RBAC（Cluster Operator 之外，手写部署用）大致长这样：

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: rabbitmq-peer-discovery
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
```

> 排错时先查这个：插件没权限调 API，日志里会反复报 peer discovery 失败、重试。

---

## 六、Consul 后端：注册 + 健康检查 + 锁

Consul 后端适合已有 Consul 服务发现体系的环境。节点启动时先在 Consul 上 **抢一把锁**（降低并行启动竞态），再注册为一个服务（默认名 `rabbitmq`），并设置周期性 **健康检查（TTL）**——在线时持续上报心跳，掉线续不上就被 Consul 清掉。

```ini
cluster_formation.peer_discovery_backend = consul
cluster_formation.consul.host = consul.eng.example.local
# port 默认 8500，scheme 默认 http，ACL 开了就配 acl_token

cluster_formation.consul.svc_ttl = 30           # 健康检查间隔（秒），默认 30
cluster_formation.consul.deregister_after = 90  # 失败多久后注销，不能低于 60
cluster_formation.consul.lock_timeout = 60      # 抢锁等待（秒），默认 300
```

别的节点用来连你的 **服务地址**，可以写死（`svc_addr_auto = false` + `svc_addr`），也可以让插件从 hostname / 节点名 / 网卡 IP 自动算（`svc_addr_auto = true`）。DNS 约定统一的环境用自动计算更省心。

---

## 七、etcd 后端：带 TTL 的 key + 租约

etcd 后端（要求 **etcd 3.4+**，插件用 v3 gRPC API）思路类似：节点启动时在 etcd 写一个 key 代表"我在"，key 关联一个带 TTL 的 **租约（lease）**，节点在线时持续续约；掉线续不上，key 过期被清，新节点就查不到它了。

```ini
cluster_formation.peer_discovery_backend = etcd

# 必填：至少一个 etcd 端点，否则不执行发现
cluster_formation.etcd.endpoints.1 = one.etcd.eng.example.local:2379
cluster_formation.etcd.endpoints.2 = two.etcd.eng.example.local:2479

# etcd 开了认证就配账号；node key 的 TTL 默认 30 秒
cluster_formation.etcd.node_ttl = 40
cluster_formation.etcd.lock_timeout = 60       # 抢锁超时（秒），默认 300
```

key 命名遵循固定前缀，可以直接看注册了哪些节点：`etcdctl get --prefix=true "/rabbitmq"`。多个集群共用一套 etcd 时，用 `cluster_formation.etcd.cluster_name` 区分。etcd 后端还支持完整的 TLS 配置（CA 证书、客户端证书、校验策略），生产环境建议开启。

---

## 八、并行启动的竞态：为什么需要"锁"

设想一个场景：3 个节点同时拉起，彼此还没注册完，A 找不到 B、B 找不到 C，结果三个节点各自"建国"，形成 **三个独立集群**——这显然不是我们想要的。

成功的成团要求 **只有一个节点能作为种子初始化**，其余都去 join 它。各后端用不同方式防这个竞态：

| 后端 | 防竞态机制 |
|------|-----------|
| classic_config / k8s / aws | 运行时内置的锁库 |
| consul | 在 Consul 上抢锁 |
| etcd | 在 etcd 上抢锁 |
| **dns** | **无锁**，必须靠部署工具注入随机延迟（1～20 秒） |

> 这就是为什么 DNS 后端"特殊"——它是唯一一个把防竞态责任甩给外部工具的。云上动态环境优先选 K8s / Consul / etcd，省心。

---

## 九、节点清理：自动踢人，请谨慎

动态后端（aws、k8s、consul、etcd）能感知"哪些节点已经不在了"。对于这些失联节点，RabbitMQ 可以 **自动从集群里踢掉**，但也可能误伤——所以默认只告警、不真踢：

```ini
# 默认值：只记警告日志，不删节点
cluster_formation.node_cleanup.only_log_warning = true

# 检查间隔，默认 60 秒
cluster_formation.node_cleanup.interval = 60
```

把 `only_log_warning` 改成 `false` 就是 **强制移除**——官方反复强调要 **慎用**：

> 自动移除有副作用。一个临时断网的节点回来后会发现自己被踢了，日志报 `thinks it's clustered ... but ... disagrees`，再也 join 不回去；监控还会持续误报。只有在"故障节点会被全新替换、且不会复用旧存储"的环境（如 AWS ASG 重建实例）才适合开启。

默认情况下（只告警），失联节点要由运维用 `rabbitmqctl forget_cluster_node` 手动清理。

---

## 十、重试与失败处理

peer discovery 不是"一次不行就放弃"。如果一次发现或 join 失败，节点会重试，默认 **10 次、每次间隔 500 毫秒**，大约覆盖 5 秒的短暂不可用：

```ini
# 默认值
cluster_formation.discovery_retry_limit = 10
cluster_formation.discovery_retry_interval = 500
```

日志里能看到典型的重试过程：`Trying to join discovered peers failed. Will retry after a delay of 500 ms, 4 retries left...`，伴随 `Could not auto-cluster with node rabbit@rmq2: {badrpc,nodedown}` 之类的警告。

> 如果依赖服务（DNS、Consul、etcd）和 RabbitMQ 同时部署、可能晚一会儿才可用，就把这两个值调大，给它们留出就绪时间。

---

## 十一、节点重连：老节点不走 discovery

一个常见误区：以为节点每次启动都跑 peer discovery。**不是的。**

- **新节点（blank）**：走 peer discovery，去问后端"还有谁"。
- **老节点（已有 mnesia 数据、曾是集群成员）**：**不走 discovery**，而是直接联系它"上次见过的同伴"，默认重试 **10 次、每次 30 秒**（共 5 分钟）。

```ini
# 老节点重连同伴的重试次数与间隔（节点全停再全起的场景尤其要调大）
cluster_formation.discovery_retry_limit = 30
```

全集群重启或滚动升级时，节点 A 起来发现同伴都没上线，就会反复重试。**节点启动慢、且不均匀的环境，务必调大这个重试次数**，否则某个节点等不及就独立起来，反而把集群撕裂。

> 还有个坑：如果一个节点被 `reset`（数据目录被清），它会表现得像个 blank 节点；但其它成员可能还认它为集群成员——两边"记忆"不一致，join 会失败，日志报 `thinks it's clustered ... but ... disagrees`。解决：用 `rabbitmqctl forget_cluster_node` 把它从集群里彻底删掉，再重新作为新节点加入。

---

## 十二、常见坑与排错

把高频问题集中列一下，排错时按顺序对照：

| 现象 | 多半原因 | 排查 |
|------|---------|------|
| 节点起不来，报配置项未知 | 插件没在首次启动前启用 | 用 `--offline` 提前 `enable` 插件，再启动 |
| 节点彼此 join 失败、`badrpc` | **Erlang Cookie 不一致** | 核对所有节点 `/var/lib/rabbitmq/.erlang.cookie`，`chmod 400` |
| DNS 后端发现不到节点 | 反向 DNS 不通 / `/etc/hosts` 被改 | 检查反查、容器 hosts 文件、`RABBITMQ_USE_LONGNAME` |
| K8s 后端反复失败 | ServiceAccount 没 RBAC / Headless Service 缺失 | 给 SA 加 `pods: get,list` 权限；确认 `serviceName` 指向 Headless Service |
| 节点名带 IP 报错 | 短名模式下 IP 不是合法节点名 | 设 `RABBITMQ_USE_LONGNAME=true` 并用长名 |
| 重启后 join 失败、`disagrees` | 节点被 reset 但集群侧没忘 | `rabbitmqctl forget_cluster_node` 后重新加入 |
| 多个独立集群形成 | 并行启动竞态（尤其 DNS 后端） | 注入随机启动延迟；或换用带锁的后端 |

**排错的两把钥匙**：

1. **开 debug 日志**：peer discovery 的发现步骤、HTTP 请求、候选节点列表都会在 `debug` 级别打出来。日志里要是完全没有 discovery 相关条目，说明这个节点要么不是 blank（有旧数据），要么已经是集群成员——这两种情况都不走 discovery。
2. **验证 cookie 与网络**：peer discovery 的前提是节点间能通、且用同一个 Erlang cookie 认证。先用 `rabbitmqctl cluster_status` 和网络连通性工具（参考官方 Troubleshooting Network Connectivity 指南）确认这两点。

---

## 小结

- **Peer Discovery** 解决的是"节点怎么自动找到彼此"——是第 11 篇手动 `join_cluster` 的自动化替代，云上和 K8s 场景必备。
- **核心配置**就一行 `cluster_formation.peer_discovery_backend`，后端选 `classic_config` / `dns` / `k8s` / `aws` / `consul` / `etcd`。
- **K8s 后端** 与 StatefulSet 天然契合：4.1 起，序号最小的 Pod（`-0`）作为种子建团，其余自动 join，通常零配置；要点是 Headless Service + ServiceAccount RBAC + PV。
- **竞态防护**：除 DNS 外的后端都靠锁，DNS 必须靠部署工具注入随机延迟。
- **老节点重连不走 discovery**，全集群重启时记得调大重试次数，避免撕裂集群。
- **自动踢节点要慎用**，默认只告警；临时掉线的节点被误踢后无法自行恢复。
- 三大常见坑：**Cookie 不一致、节点名/反向 DNS 解析、K8s RBAC 权限**——排错先过这三关。

下一篇我们从"怎么搭"走向"怎么演进"——[《从 3.x 到 4.x——升级、迁移与 Feature Flags》](/中间件/rabbitmq/rabbitmq-21-migration-upgrade)，看老集群怎么平稳跨过大版本升级。
