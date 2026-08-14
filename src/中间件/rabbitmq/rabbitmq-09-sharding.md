---
title: "消息分片存储插件 Sharding"
sidebarGroup: "RabbitMQ"
shortTitle: "09 Sharding 分片"
order: 9
date: 2026-09-02
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 9/22 篇**  
> 上一篇：[《死信队列与延迟队列》](/中间件/rabbitmq/rabbitmq-08-dlx-delay)  
> 下一篇预告：[《RabbitMQ 监控、备份与联邦同步》](/中间件/rabbitmq/rabbitmq-10-monitor-backup-federation)

---

## 开头：单队列吞吐到顶了，怎么办

一个队列的消费速度跟不上生产速度时，最直接的办法是加 Consumer、提升单条处理速度——但这往往意味着更多机器与人力。当这些都不够用时，问题就回到了队列本身：**能不能把一个队列的消息拆到多个队列、多个节点上去并行处理？**

这就是"水平扩展"在消息中间件里的命题。RabbitMQ 给出了 **两条不同时代的路线**，本篇会依次讲透：

| 路线 | 出现时间 | 一句话定位 |
|------|----------|-----------|
| **① Sharding 插件**（`rabbitmq_sharding`） | 较早 | 在传统队列之上做"哈希分片"，把一个逻辑队列拆到多个节点 |
| **② Streams / Super Stream** | Stream 3.8+，Super Stream 3.11+ | 用"只追加日志"模型从根上重新设计，吞吐更高、还能回放 |

> **官方态度**：Sharding 插件目前仍可用，但官方在 4.x 文档里明确建议，新项目这类场景 **优先用 Streams / partitioned streams**，效率更高。因此本文先讲清 Sharding 的原理（读懂老系统、做选型必备），再用一整节给出 Stream 的现代替代方案——读完你会明白为什么官方做了这个取舍。

思路类似数据库分库分表：分库减 IO 压力，分表解决单表过大；这里针对的是 **单队列吞吐瓶颈**。

---

# 路线一：Sharding 插件

## 一、它能解决什么

Sharding 插件（`rabbitmq_sharding`）在一条逻辑 Exchange 之下，把消息 **按 routing key 哈希分区** 到多张物理队列（shard queue），这些分片分布在不同集群节点上，对外却表现为「一个逻辑队列」：

- **生产端**：只往一个 Exchange 发，完全不感知分片；
- **消费端**：通过一个「与 Exchange 同名的伪队列」统一消费，插件自动把 Consumer 挂到合适的分片上，无需手动绑定每张分片 Queue；
- **结果**：单队列的吞吐压力被水平拆分到多节点。

![Sharding 插件整体架构](/中间件/rabbitmq/14/p12-01.png)

适用场景：**对延迟要求不严格、对全局顺序无要求**。因为分片会进一步削弱 RabbitMQ 本就不强的顺序保证——**只有同一分片内的消息保持相对顺序，跨分片不保证顺序**。

先把它跑通，再回头讲原理。

---

## 二、5 分钟跑通：使用步骤

整套流程一共 **5 步**，其中插件帮你自动完成 2 步，你只需写另外 3 步的代码/配置：

| 步骤 | 谁来做 | 做什么 |
|------|--------|--------|
| **① 启用插件** | 你 | `rabbitmq-plugins enable rabbitmq_sharding` |
| **② 配置策略** | 你 | 写一条 Policy，指定「对谁分片 + 每节点几张分片」 |
| **③ 创建 Exchange** | 你声明 / **插件建分片** | 你声明一个匹配策略的 Exchange；插件随即**自动**建好 N 张分片 Queue 并绑定 |
| **④ 发送消息** | 你 | `basicPublish` 到 Exchange（分片对生产端透明） |
| **⑤ 消费消息** | 你 | `basicConsume` 一个「伪队列」×N 次，覆盖所有分片 |

记住这张表，下面逐步展开。核心心智模型只有一句：**你负责「定义规则 + 收发消息」，插件负责「建分片 + 路由」**。

### 2.1 第 ① 步：启用插件

```bash
rabbitmq-plugins enable rabbitmq_sharding
```

> 4.x 上 `x-modulus-hash` 已在核心，但 Sharding 的自动分片编排仍来自本插件，所以仍需启用。

#### Docker 环境下怎么启用

`rabbitmq-plugins enable` 是在容器**内部**执行的命令。Docker 场景分三种情况，按你的处境对号入座：

**情况 A：容器正在运行，临时启用**（重启容器后会丢失）

用 `docker exec` 进容器执行，无需登录容器内部：

```bash
# my-rabbit 是容器名（也可用容器 ID）
docker exec -it my-rabbit rabbitmq-plugins enable rabbitmq_sharding
```

> ⚠️ 这种方式只是改了容器内运行时的插件状态，**容器一旦重建（如 `docker run` 新建、compose down/up）就会丢失**。仅适合临时调试。

**情况 B：新建容器时永久启用**（推荐）

核心思路：RabbitMQ 容器启动时会读 `/etc/rabbitmq/enabled_plugins` 这个文件来决定启用哪些插件。我们 **在宿主机准备一份这个文件，挂载进容器**——这样容器每次重建都能自动启用，不依赖手动 `docker exec`。

> 为什么不直接 `docker exec ... enable`？因为那只改容器运行时状态，**容器一重建就没了**（见情况 A 的警告）。文件挂载是把启用配置"固化"到宿主机。

完整 4 步：

**第 1 步：在宿主机建一个空文件**

在你的工作目录（任意你方便管理的文件夹）下，新建一个名为 `enabled_plugins` 的文件（**注意：文件名没有扩展名**）。

```bash
# Linux / macOS / Git Bash
touch enabled_plugins
```

> ⚠️ **Windows 用户注意**：资源管理器新建文件时容易自动加上 `.txt` 后缀，变成 `enabled_plugins.txt`，那样容器就读不到了。建议在命令行用 `touch`，或用编辑器另存为时手动删掉扩展名。下文验证步骤能帮你抓到这个错误。

**第 2 步：写入要启用的插件清单**

用任意文本编辑器打开 `enabled_plugins`，写入以下内容并保存：

```erlang
[rabbitmq_sharding,rabbitmq_management].
```

这一行是 **Erlang 列表语法**，三个不能省的细节：

- 用 **方括号 `[ ]`** 包裹，元素之间用 **逗号 `,`** 分隔；
- **行尾必须有英文句号 `.`**（这是 Erlang 语句结束符，漏掉会导致启动失败）；
- 全部用 **半角字符**，不要混入中文标点。

这里同时列了两个插件：

| 插件 | 作用 |
|------|------|
| `rabbitmq_sharding` | 本篇的主角：水平分片能力 |
| `rabbitmq_management` | Web 管理控制台（端口 15672），后面配策略、看分片都靠它 |

> 如果你用的是 `rabbitmq:3.13-management` 这种带 `-management` 后缀的镜像，`management` 其实已内置启用，写不写都行——但写上更明确，也方便换回不带后缀的基础镜像时不漏。

**第 3 步：启动容器并挂载这个文件**

把 `enabled_plugins` 挂载到容器内的 `/etc/rabbitmq/enabled_plugins`：

```bash
docker run -d --name my-rabbit \
  -p 5672:5672 -p 15672:15672 \
  -v $(pwd)/enabled_plugins:/etc/rabbitmq/enabled_plugins \
  rabbitmq:3.13-management
```

逐段说明：

| 参数 | 含义 |
|------|------|
| `-d` | 后台运行 |
| `--name my-rabbit` | 容器名，方便后续 `docker exec my-rabbit ...` |
| `-p 5672:5672` | AMQP 端口（生产/消费代码连这个） |
| `-p 15672:15672` | 管理控制台端口（浏览器访问） |
| `-v $(pwd)/enabled_plugins:/etc/rabbitmq/enabled_plugins` | **关键**：把宿主机的文件挂载成容器内的插件清单 |
| `rabbitmq:3.13-management` | 镜像名（按需换成你用的版本） |

> 💡 Windows PowerShell 下 `$(pwd)` 要写成 `${PWD}`；Git Bash 下两者都行。也可以直接写绝对路径，如 `-v E:/rabbitmq/enabled_plugins:/etc/rabbitmq/enabled_plugins`。

更推荐用 **docker-compose**，把端口、挂载、镜像都固化在文件里，团队协作和重建都更省心。在 `enabled_plugins` 同目录下新建 `docker-compose.yml`：

```yaml
services:
  rabbitmq:
    image: rabbitmq:3.13-management
    container_name: my-rabbit
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      # 挂载插件清单：容器重建后依然生效
      - ./enabled_plugins:/etc/rabbitmq/enabled_plugins
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin
```

然后一行启动：

```bash
docker compose up -d
```

**第 4 步：验证插件已启用**

容器起来后（约 10~20 秒），列出已启用的插件：

```bash
docker exec my-rabbit rabbitmq-plugins list -e
# -e 表示只列出已启用的（enabled）
```

看到列表里 **同时有** `rabbitmq_sharding` 和 `rabbitmq_management`（前缀 `[E*]` 表示显式启用且正在运行）即成功：

```
Listing "enabled" plugins ...
 Configured: E = explicitly enabled; e = implicitly enabled
 | Status: * = running on rabbit@xxx
 |/
[E*] rabbitmq_management       3.13.7
[E*] rabbitmq_sharding         3.13.7      ← 关键：出现了就算成功
[e*] rabbitmq_management_agent 3.13.7
...
```

> 🔍 **如果列表里没有 `rabbitmq_sharding`**，按下面的顺序排查（命中率从高到低）：

**① 最常见：挂载目标路径写错（宿主机文件对，但 RabbitMQ 读到的不是它）**

典型症状：你明明在 `enabled_plugins` 里写了 `rabbitmq_sharding`，但 `list -e` 就是不出现；而且 `cat` 出来的内容"莫名其妙"地是你没写过的东西（比如带 `rabbitmq_prometheus`）——那其实是 **镜像自带的默认清单**。

诊断：进容器看 RabbitMQ **真正读取的那个文件**：

```bash
docker exec my-rabbit cat /etc/rabbitmq/enabled_plugins
```

如果输出 ≠ 你宿主机写的内容，几乎一定是 compose 的挂载目标写错了。**挂载目标必须是 `/etc/rabbitmq/enabled_plugins`**：

```yaml
# ✅ 正确
- ./enabled_plugins:/etc/rabbitmq/enabled_plugins

# ❌ 错误（常见笔误：照抄了宿主机路径）
- ./enabled_plugins:/root/rabbitmq/enabled_plugins
```

冒号**右边**是容器内路径，RabbitMQ 只认 `/etc/rabbitmq/enabled_plugins`，写成别的等于没挂载——容器就会回退到镜像默认清单。

**② 文件名/路径问题**

文件名必须正好是 `enabled_plugins`（**无扩展名**）。Windows 资源管理器新建文件常偷偷加 `.txt`，变成 `enabled_plugins.txt`，容器就找不到。compose 里挂载时若写错宿主机路径（比如 `./` 不对），也会挂到一个空文件上。

**③ 文件内容语法问题**

漏了行尾的 `.`、用了中文标点、或不是方括号列表，Erlang 解析失败，会回退到默认插件集。正确格式：

```erlang
[rabbitmq_sharding,rabbitmq_management].   ← 行尾的 . 不能少
```

**统一排查动作**：对比"你写的"和"容器读到的"是否一致——

```bash
# 你写的（宿主机）
cat ./enabled_plugins
# 容器实际读到的
docker exec my-rabbit cat /etc/rabbitmq/enabled_plugins
```

两边内容一致才算挂载正确。改完后**必须重建容器**（`docker compose down && up -d`），因为 `enabled_plugins` 只在启动时读一次，`restart` 不重新解析。

**情况 C：用带 `-management` 的镜像**

官方镜像里 `rabbitmq:3.13-management` 这类带后缀的镜像 **已经内置** `rabbitmq_management`，但 **不含 Sharding**——Sharding 仍需按上面 A 或 B 的方式启用。本系列截图用的就是 `management` 镜像 + 手动启用 Sharding。

> 💡 **另一个验证途径**：登录管理控制台（`http://<host>:15672`），左侧 **Admin** 页里能看到 Policy 的 Sharding 选项，或在 **Exchanges** 页新建 Exchange 时类型下拉框里出现 `x-modulus-hash`，都说明插件已生效。

> 🖥️ **集群场景**：每个节点都必须启用该插件——Docker 下即每个容器都挂载同一份 `enabled_plugins`，Sharding 才能跨节点建分片。否则未启用的节点不会承载任何分片。

#### 顺带做：数据持久化（否则容器一重建，队列消息全没）

启用插件只是开始。Docker 下还**必须配数据持久化**，否则每次 `docker compose down/up` 重建容器，你的 **队列、消息、用户、策略全丢**。这一步踩坑的人极多，重点讲。

RabbitMQ 的所有数据（Mnesia 元数据 + 消息）都在 `/var/lib/rabbitmq`，挂一个命名卷进去即可：

```yaml
services:
  rabbitmq:
    image: rabbitmq:3.13-management
    container_name: my-rabbit
    hostname: rabbit                    # ① 固定 hostname（关键，见下文坑①）
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - ./enabled_plugins:/etc/rabbitmq/enabled_plugins
      - rabbitmq_data:/var/lib/rabbitmq # ② 数据持久化：队列/消息/用户/策略都在这
    environment:
      RABBITMQ_NODENAME: rabbit@rabbit  # ③ 固定节点名（关键，见下文坑①）
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin

volumes:
  rabbitmq_data:
```

**两个必须知道的坑**（都是真实踩出来的）：

**坑 ①：不固定节点名 → 重建后数据"凭空消失"**

RabbitMQ 按**节点名**在 `/var/lib/rabbitmq/mnesia` 下建数据库目录（如 `rabbit@<hostname>`）。Docker 默认用**容器 ID 当 hostname**，而容器每次重建 ID 都变 → 节点名变 → Mnesia 找不到旧库 → 开一个空的**新库**，老队列消息就"丢了"（其实数据还在卷里，只是节点名对不上）。

所以必须固定 hostname + 节点名：

```yaml
hostname: rabbit
environment:
  RABBITMQ_NODENAME: rabbit@rabbit   # 节点名恒定，mnesia 一直复用同一个库
```

验证：`docker exec my-rabbit rabbitmqctl status | grep "Node name"`，每次重建后都应是 `rabbit@rabbit` 才对。

**坑 ②：`.erlang.cookie` 权限错误 → 容器启动崩溃**

挂载命名卷后，偶尔会遇到容器起来就挂，日志报：

```
Error when reading /var/lib/rabbitmq/.erlang.cookie: eacces
```

原因是卷里的 `.erlang.cookie` 属主变成了 `root`，而 RabbitMQ 进程以 `rabbitmq` 用户（UID **999**）运行，读不到。修法是把 cookie 属主改回 999：

```bash
docker run --rm -v rabbitmq_rabbitmq_data:/var/lib/rabbitmq alpine \
  sh -c "chown 999:999 /var/lib/rabbitmq/.erlang.cookie && chmod 400 /var/lib/rabbitmq/.erlang.cookie"
```

然后 `docker compose up -d` 即可正常启动。

**验证持久化生效**（建队列 → 重建 → 看还在不在）：

```bash
docker exec my-rabbit rabbitmqadmin -u admin -p admin declare queue name=persist_test durable=true
docker compose down && docker compose up -d
# 等十几秒启动完
docker exec my-rabbit rabbitmqadmin -u admin -p admin list queues
# 仍能看到 persist_test 就算成功
```

> 💡 只 `docker compose restart` 不会触发重建，数据天然在；真正的考验是 `down` + `up`（或 `rm` + `run`）。配好上面两步，重建容器后队列、消息、用户、策略都会完整保留。

### 2.2 第 ② 步：配置策略

Sharding 不是靠手动建队列，而是靠一条 **策略（Policy）** 驱动。策略只回答两个问题：

1. **对谁分片？** —— 用正则匹配 Exchange 名字；
2. **每节点建几张分片？** —— 用 `shards-per-node` 指定。

至于"分片怎么绑到 Exchange"，是插件自动完成的（原理见第三节）。

#### 在管理控制台配置

打开管理控制台（`http://<host>:15672`），进入 **Admin → Policies**，点击 **Add / update a policy**。本系列用的真实配置如下图：

![策略详情：sharding_policy](/中间件/rabbitmq/14/p12-02.png)

逐字段说明（与截图一一对应）：

| 字段 | 截图中的值 | 含义 |
|------|-----------|------|
| **Virtual host** | `/mirror` | 策略所在的 vhost，需与后面 Exchange 所在 vhost 一致 |
| **Name** | `sharding_policy` | 策略名，任意取（这里用下划线） |
| **Pattern** | `^sharding_*` | **正则，匹配 Exchange 名字**。名字能匹配上的 Exchange 才会被分片 |
| **Apply to** | `all` | 作用于 exchanges（Sharding 会把策略应用到匹配的 Exchange 上；选 `exchanges` 或 `all` 均可） |
| **Priority** | `0` | 策略优先级，多个策略匹配同一对象时数值大的生效 |
| **Definition: `routing-key`** | `sharding` | 分片 Queue 绑到 Exchange 时用的 binding key（`x-modulus-hash` 会忽略它，占位即可） |
| **Definition: `shards-per-node`** | `3` | **每个集群节点**上建几张分片 Queue |

> ⚠️ **Pattern 匹配的是 Exchange 名，不是 Queue 名**。所以下一步创建 Exchange 时，名字必须能被这个正则匹配上（例如叫 `sharding_exchange` 才能匹配 `^sharding_*`），否则策略不生效、也不会产生任何分片。

> 💡 **关于 `shards-per-node` 填几**：它控制的是 **每个节点** 的分片数，**总分片数 = `shards-per-node` × 节点数**。截图填 `3`，在 **3 节点集群** 里就是 `3 × 3 = 9` 张分片；但如果只在 **单节点** 上跑（比如本地的单容器），就只会建 `3 × 1 = 3` 张（都落在那一个节点）。本系列后面演示用的是单节点容器，所以会看到 3 张同节点的分片。

填完点 **Add policy**，列表里出现 `sharding_policy` 即配置成功。

#### 等价的 CLI 写法

不喜欢点界面的话，命令行一条搞定（注意 vhost、名字、数值与上面截图一致）：

```bash
# 在 /mirror vhost 下，名为 sharding_policy，每节点 3 张分片
rabbitmqctl set_policy --vhost /mirror sharding_policy "^sharding_*" \
  '{"shards-per-node": 3, "routing-key": "sharding"}' \
  --apply-to exchanges \
  --priority 0
```

> 也可走 HTTP API（`rabbitmqadmin`），参数名相同，适合脚本化。

#### Docker 下的操作方式

上面的 `rabbitmqctl` / `rabbitmqadmin` 是**容器内部**的命令。你用 Docker 跑 RabbitMQ 时，有两种执行方式：

**方式 ①：`docker exec` 直接执行**（最常用）

把命令原样跟在 `docker exec <容器名>` 后面即可。注意 `rabbitmqctl` 走 Erlang 通道，**不需要账号密码**；而 `rabbitmqadmin` 走 HTTP API，**需要 `-u/-p` 带账号密码**：

```bash
# rabbitmqctl 配策略（无需账号密码）
docker exec my-rabbit rabbitmqctl set_policy --vhost /mirror sharding_policy \
  "^sharding_*" '{"shards-per-node": 3, "routing-key": "sharding"}' \
  --apply-to exchanges --priority 0

# rabbitmqadmin 配策略（需账号密码；本例用 admin/admin）
docker exec my-rabbit rabbitmqadmin -u admin -p admin declare policy \
  name=sharding_policy pattern="^sharding_*" apply-to=exchanges \
  definition='{"shards-per-node":3,"routing-key":"sharding"}' priority=0
```

**方式 ②：进入容器后再操作**（要连敲多条命令时更顺手）

```bash
# 进容器，得到一个 shell
docker exec -it my-rabbit bash
# 之后就像在普通机器上一样，直接敲 rabbitmqctl / rabbitmqadmin
rabbitmqctl set_policy ...
```

**验证策略已生效**：

```bash
# 列出所有策略
docker exec my-rabbit rabbitmqctl list_policies --vhost /mirror
# 或用 rabbitmqadmin
docker exec my-rabbit rabbitmqadmin -u admin -p admin list policies
```

> 💡 **小贴士**：`rabbitmqadmin` 不是系统自带命令，而是管理插件提供的一个 Python 脚本，镜像已放在 `/usr/local/bin/`，可直接调用。如果你的环境没有，可从管理控制台首页底部下载（`http://<host>:15672/cli`）。

### 2.3 第 ③ 步：创建 Exchange（分片在这一刻诞生）

策略配好后，下一步是 **创建一个能被 Pattern 匹配的 `x-modulus-hash` Exchange**——这才是真正触发分片创建的动作。

#### 新建 Exchange

在管理控制台 **Exchanges** 页点 **Add a new exchange**，**Type** 下拉里会多出一个 **`x-modulus-hash`**（这就是 Sharding 插件新增的 Exchange 类型，未启用插件时没有这一项）：

![新建 Exchange：Type 选 x-modulus-hash](/中间件/rabbitmq/14/p13-01.png)

按下表填写（注意 Name 必须能命中策略 Pattern `^sharding_*`）：

| 字段 | 值 | 说明 |
|------|----|------|
| **Virtual host** | `/` | 与策略所在 vhost 一致（本系列本地演示用 `/`） |
| **Name** | `sharding_exchange` | **必须匹配策略 Pattern**，否则不会触发分片 |
| **Type** | `x-modulus-hash` | Sharding 插件新增的类型 |
| **Durability** | `Durable` | 持久化，配合数据卷重建不丢 |

点 **Add exchange**。

> 💡 **Type 下拉里看不到 `x-modulus-hash`？** 说明 Sharding 插件没启用成功，回 2.1 第④步排查（最常见是 `enabled_plugins` 挂载目标路径写错）。

#### ⚠️ 建好了 Exchange，却"没出现效果"？

这是**最高频的卡点**：Exchange 建了、类型也对，但 Queues 页面空空如也、exchange 详情页也没有分片绑定。原因几乎只有一个——**没有策略匹配到这个 Exchange**（要么没配策略，要么策略的 Pattern/vhost 对不上）。

诊断三步（任选其一）：

```bash
# ① 看 / vhost 下有没有策略
docker exec my-rabbit rabbitmqctl list_policies
# 若输出 "Listing policies for vhost "/" ..." 后面空白 → 根本没配策略，回 2.2 配

# ② 看有没有分片 Queue 被建出来
docker exec my-rabbit rabbitmqadmin -u admin -p admin list queues name
# 若 "No items" → 插件没触发，99% 是策略没命中

# ③ 看 exchange 有没有 binding（分片会自动绑上来）
docker exec my-rabbit rabbitmqadmin -u admin -p admin list bindings source
```

排查清单（按命中率排序）：

| 现象 | 原因 | 修法 |
|------|------|------|
| `list_policies` 为空 | 压根没配策略 | 按 2.2 配一条 |
| 有策略，但 Exchange 没分片 | **策略 vhost ≠ Exchange vhost**（如策略在 `/mirror`、Exchange 在 `/`） | 两者改到同一 vhost |
| 有策略、同 vhost，仍没分片 | Pattern 没匹配上 Exchange 名（如 Pattern `^orders_` 但 Exchange 叫 `sharding_exchange`） | Exchange 名或 Pattern 改一致 |
| 之前有分片，重建容器后没了 | 数据卷没挂好 / 节点名变了 | 回 2.1 "数据持久化" 两个坑 |

> 关键认知：**Exchange 本身不会自动分片，是"策略 + 匹配的 Exchange"组合才触发**。可以把策略理解成"分片规则"，Exchange 是"触发器"——两者缺一不可，且必须对得上（同 vhost、Pattern 匹配）。

#### 效果出来后，在管理控制台看什么

配好策略并建好 Exchange 后，打开 exchange 详情页：

```
http://localhost:15672/#/exchanges/%2F/sharding_exchange
```

> URL 里的 `%2F` 是 `/`（vhost 名）的 URL 编码。本地默认就是 `/` vhost。

在这个页面你会看到 **Bindings** 区域多出几行——这是插件自动建的分片 Queue 并绑定上来的证据。以本系列单节点、`shards-per-node=3` 的实测为例：

| From | To | Routing key |
|------|----|----|
| `sharding_exchange` | `sharding: sharding_exchange - rabbit@rabbit - 0` | `sharding` |
| `sharding_exchange` | `sharding: sharding_exchange - rabbit@rabbit - 1` | `sharding` |
| `sharding_exchange` | `sharding: sharding_exchange - rabbit@rabbit - 2` | `sharding` |

再切到 **Queues** 标签页，会看到这 3 张分片 Queue：

```
sharding: sharding_exchange - rabbit@rabbit - 0
sharding: sharding_exchange - rabbit@rabbit - 1
sharding: sharding_exchange - rabbit@rabbit - 2
```

看到这些，说明分片拓扑已就绪。

![已建好的 x-modulus-hash Exchange 与分片队列](/中间件/rabbitmq/14/p14-01.png)

#### 声明 Exchange 的瞬间，发生了什么

插件监听着策略匹配范围内的 Exchange 声明事件。一旦你 `exchangeDeclare`（或在界面 Add）出这么一个 Exchange，插件就立即按策略**自动**完成三件事：

```
你声明 Exchange「sharding_exchange」
        │
        ▼  插件检测到它命中策略 ^sharding_*，shards-per-node = 3
        │
插件自动创建分片 Queue（总数 = shards-per-node × 节点数）
        │   单节点：3 × 1 = 3 张，全在 rabbit@rabbit 上：
        │   ├─ sharding:sharding_exchange-rabbit@rabbit-0
        │   ├─ sharding:sharding_exchange-rabbit@rabbit-1
        │   └─ sharding:sharding_exchange-rabbit@rabbit-2
        │   （3 节点集群则是 3 × 3 = 9 张，散到各节点）
        │
插件自动把每张分片 Queue 绑定到 Exchange（x-modulus-hash 的 slot 机制）
        │   N = 分片总数，每张各占 1 个槽位 → 等权分流
        ▼
分片拓扑就绪，等待消息
```

逐步拆开看：

- **触发时机** —— 不是配策略时建，而是 **声明 Exchange 时建**。策略本身只是"规则"；Exchange 出现且名字匹配正则，规则才被执行。这是最容易误解的地方：你以为分片是策略配出来的，其实是声明 Exchange 时插件"顺手"建出来的。
- **分片数 = `shards-per-node` × 节点数** —— 本系列截图配置 `shards-per-node=3`：**单节点**就是 `3 × 1 = 3` 张（全落在一个节点，如上面实测）；**3 节点集群**则是 `3 × 3 = 9` 张散到各节点。**插件保证每个节点至少有 `shards-per-node` 张分片**，从而把存储和流量铺到所有节点。
- **命名规则** —— `sharding:{exchangeName}-{node}-{shardingIndex}`：

  | 组成 | 含义 | 本例实测值 |
  |------|------|-----------|
  | `sharding:` | 固定前缀 | `sharding:` |
  | `{exchangeName}` | 被分片的 Exchange 名 | `sharding_exchange` |
  | `{node}` | 分片所在节点（Erlang 节点名） | `rabbit@rabbit`（你固定了节点名） |
  | `{shardingIndex}` | 该节点上的第几张分片（从 0 开始） | `0`、`1`、`2` |

  合起来：`sharding:sharding_exchange-rabbit@rabbit-0`。
- **自动绑定** —— 每张分片 Queue 被自动 `queueBind` 到 Exchange，等权占槽，每张分片拿到 `1/N` 的流量（3 张就是各约 33%）。

> 一句话：**策略告诉插件"见到匹配的 Exchange 就分片、每节点分几张"；声明 Exchange 是扣动扳机的那一刻**——你全程不需要手动 `queueDeclare` / `queueBind` 任何分片。

### 2.4 第 ④ 步：发送消息

声明 Exchange 和发消息在同一段代码里——`exchangeDeclare` 触发插件建分片（第 ③ 步），`basicPublish` 发消息（本步）：

```java
public class ShardingProducer {
    private static final String EXCHANGE_NAME = "sharding_exchange";

    public static void main(String[] args) throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("192.168.65.112");
        factory.setPort(5672);
        factory.setUsername("admin");
        factory.setPassword("admin");
        factory.setVirtualHost("/mirror");

        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();

        // 第 ③ 步：声明 Exchange，插件此刻按策略自动建好分片（张数 = shards-per-node × 节点数）
        channel.exchangeDeclare(EXCHANGE_NAME, "x-modulus-hash");

        // 第 ④ 步：发送消息，routing key = i
        for (int i = 0; i < 3000; i++) {
            String message = "Sharding message " + i;
            channel.basicPublish(EXCHANGE_NAME, String.valueOf(i), null, message.getBytes());
        }

        channel.close();
        connection.close();
    }
}
```

运行结果：routing key 取值 0~2999 足够分散，按 `hash(routingKey) mod N` 散落到各分片槽位，**整体相对均匀**——N 张分片的话，每张约 `3000/N` 条。

> 🖥️ **单节点 vs 集群的实际表现**（实测）：
> - **单节点容器**（如本地 Docker 跑 1 个节点）：总分片数 = `shards-per-node × 1`，所有消息都落在这一个节点的几张分片上。比如 `shards-per-node=3`，会看到同一节点上 3 张分片、消息大致三等分。
> - **3 节点集群**：总分片数 = `shards-per-node × 3`，分片真正散到不同节点，这才是 Sharding 摊薄单节点压力的完整形态。

![分片 Exchange 绑定多个碎片队列](/中间件/rabbitmq/14/p14-02.png)

> 注意：Producer 全程只与逻辑 Exchange 打交道，**既感知不到分片，也无法预知某条消息落在哪**——这正是分片对生产端透明的体现。

### 2.5 第 ⑤ 步：消费消息

分片 Queue 的名字有规律，但 **不应该** 逐个 Queue 去声明 Consumer：那样拿到的是零散分片，既不符合「逻辑上一整队列」的语义，也无法保证每张分片都被消费到。

Sharding 的解法是 **伪队列（pseudo-queue）**：声明一个与 Exchange **同名** 的 Queue 名，像普通队列一样 `basicConsume`。这个 Queue 物理上并不存在，插件会拦截对它的消费请求。

> **消费路由规则**：当 Consumer 连接进来，插件会从 **客户端所连节点的本地分片集合** 中，挑选 **当前活动消费者最少** 的那张分片 Queue 把 Consumer 挂上去——一句话，**就近 + 最少连接**。

```java
public class ShardingConsumer {
    public static final String QUEUENAME = "sharding_exchange";

    public static void main(String[] args) throws IOException, TimeoutException {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("192.168.65.112");
        factory.setPort(5672);
        factory.setUsername("admin");
        factory.setPassword("admin");
        factory.setVirtualHost("/mirror");

        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();

        // 声明伪队列：与 Exchange 同名，物理上不存在
        channel.queueDeclare(QUEUENAME, false, false, false, null);

        Consumer myconsumer = new DefaultConsumer(channel) {
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope,
                                       AMQP.BasicProperties properties, byte[] body)
                    throws IOException {
                System.out.println("routingKey > " + envelope.getRoutingKey());
                System.out.println("content: " + new String(body, "UTF-8"));
                channel.basicAck(envelope.getDeliveryTag(), false);
            }
        };

        // 关键：basicConsume 要调用 N 次（N = 分片数），覆盖所有分片
        String flag1 = channel.basicConsume(QUEUENAME, true, myconsumer);
        String flag2 = channel.basicConsume(QUEUENAME, true, myconsumer);
        String flag3 = channel.basicConsume(QUEUENAME, true, myconsumer);
        System.out.println("c1:" + flag1 + " c2:" + flag2 + " c3:" + flag3);
    }
}
```

**为什么 `basicConsume` 要调用 3 次？** 因为每次 `basicConsume(伪队列名)` 只会绑定到 **一个** 分片（按「就近 + 最少连接」选）。本例有 3 张分片，只 consume 一次的话，就只有一个分片在被消费，其余两张的消息持续堆积。所以要 **按分片数发起等量的 consume**，确保每张分片都有消费者。

这恰好印证了官方那句话：**"运行中的 Consumer 是应用的责任，不是插件的责任。"** 插件只负责把一次 consume 路由到一张分片，至于「是否覆盖全部分片」「扩缩容时如何补足消费者」，全靠应用自己规划。

---

## 三、原理：为什么按 routing key 哈希

跑通之后，回头看几个现象背后的"为什么"：为什么是 3 张分片各拿 1/3？为什么 3000 条消息大致均匀？答案都藏在一个核心组件里——`x-modulus-hash` Exchange。

### 3.1 路由规则：按 routing key 取模哈希（不是轮询）

`x-modulus-hash` 的行为常被误传为「忽略 routingKey、轮询平均分配」，**这是错的**。它的真实规则只有一行：

```
slot = hash(routingKey) mod N
```

逐项拆解：

- **`routingKey`** —— 消息发布时带的 routing key，**参与**哈希；
- **`hash`** —— 对 routing key 求哈希，得到一个稳定整数；
- **`N`** —— 这个 Exchange 上 **绑定的总数**。注意是「绑定数」不是「队列数」（一张 Queue 可以被绑多次，见 3.2）；
- **`mod N`** —— 取模后落到 `[0, N)` 某个 **槽位（slot）**，每个槽位对应一个绑定，进而对应一张 Queue。

用第 ③ 步建好的 3 张分片（N=3）举例，slot 与分片的映射是：

```
x-modulus-hash Exchange（N=3，3 个槽位）
  slot 0  ─→  分片 node1-0
  slot 1  ─→  分片 node2-0
  slot 2  ─→  分片 node3-0

hash("1") mod 3 = 1  → 进分片 node2-0
hash("2") mod 3 = 0  → 进分片 node1-0
hash("3") mod 3 = 2  → 进分片 node3-0
hash("4") mod 3 = 0  → 进分片 node1-0   ← routing key 不同，可能落到同一分片
```

由此推出三条关键性质：

- **不是轮询**：路由完全由 `hash(routingKey) mod N` 决定，与"下一条该轮到谁"无关；
- **忽略的是 binding key**：绑定时写的 key 不参与路由，参与的是发布时的 routing key；
- **稳定路由**：只要绑定集合不变，**相同的 routing key 永远落同一个 slot → 同一张 Queue**，节点重启也保持稳定（4.x 重构后尤其可靠）。

这就解释了第 ④ 步的现象：routing key 取值（0 ~ 2999）足够分散，`hash mod N` 的结果也就相对均匀地铺满各槽位——**均匀是哈希散列的副产物，不是严格轮询**。反过来，如果 routing key 只有少数几个取值，分布会明显倾斜。

理解了 slot/`N` 这个模型，3.2 的「加权」就是顺水推舟：**改 `N`（绑几次）就能改某张 Queue 的槽位数，从而改它的流量比例。**

### 3.2 加权：把同一张 Queue 绑定多次

`x-modulus-hash` 支持加权——同一张 Queue 可以被绑定多次。若某 Queue 被绑定 M 次、总绑定数为 N，它收到消息的概率就是 **M/N**。

用一个独立的小例子感受（不是上面的 Sharding 拓扑，单纯演示加权）。建一个 `x-modulus-hash` 类型的 Exchange `weights`，挂 3 张队列。

**① 等权：每张绑 1 次**

```
weights (x-modulus-hash)
  ├─ bind → Q1   (M=1)
  ├─ bind → Q2   (M=1)
  └─ bind → Q3   (M=1)
总绑定 N = 3
```

| Queue | M | 概率 | 发 3000 条预期 |
|-------|---|------|---------------|
| Q1 | 1 | 1/3 ≈ 33% | ~1000 |
| Q2 | 1 | 1/3 ≈ 33% | ~1000 |
| Q3 | 1 | 1/3 ≈ 33% | ~1000 |

**② 给 Q1 加权：绑 2 次**

把 Q1 多绑一次，绑定槽位就从 3 变成 4：

```java
channel.exchangeDeclare("weights", "x-modulus-hash");
channel.queueDeclare("Q1", false, false, false, null);
channel.queueDeclare("Q2", false, false, false, null);
channel.queueDeclare("Q3", false, false, false, null);

channel.queueBind("Q1", "weights", "a");   // Q1 第 1 次绑定
channel.queueBind("Q1", "weights", "b");   // Q1 第 2 次绑定 → 加权
channel.queueBind("Q2", "weights", "c");
channel.queueBind("Q3", "weights", "d");
```

> 注意：`x-modulus-hash` 忽略 binding key（这里的 `a/b/c/d` 不参与路由），但 **每次 `queueBind` 都会增加一个绑定槽位**，哈希取模的空间因此从 3 变成 4。

| Queue | M | 概率 | 发 3000 条预期 |
|-------|---|------|---------------|
| Q1 | 2 | 2/4 = **50%** | ~1500 |
| Q2 | 1 | 1/4 = 25% | ~750 |
| Q3 | 1 | 1/4 = 25% | ~750 |

**为什么是这个比例？** 回到 3.1 的公式 `slot = hash(routingKey) mod N`——现在 `N` 从 3 变成了 4。Q1 占了 4 个槽位里的 2 个（slot 0、1），所以哈希落在 0 或 1 的消息都进 Q1。下表是一种可能的哈希分布（具体值取决于哈希函数）：

| routing key | hash mod 4 | 槽位 | 进哪个 Queue |
|-------------|-----------|------|-------------|
| order-1 | 0 | 0 | Q1 |
| order-2 | 1 | 1 | Q1 |
| order-3 | 2 | 2 | Q2 |
| order-4 | 3 | 3 | Q3 |
| order-5 | 0 | 0 | Q1 |

Q1 独占 4 个槽位中的 2 个 → 收到一半消息。这就是「加权」的全部秘密。

**回到 Sharding 插件**：理解了加权，就看懂了第 ③ 步插件如何把 `shards-per-node` 翻译成「绑定槽位」。假设 `shards-per-node = 2`、3 节点集群，插件会自动创建 6 张分片 Queue，并把它们 **等权**（每张绑 1 次）挂到 Exchange：

```
sharding:ex-node1-0 ──┐
sharding:ex-node1-1 ──┤
sharding:ex-node2-0 ──┼──→ x-modulus-hash Exchange（N=6，每个 M=1）
sharding:ex-node2-1 ──┤     每张分片概率 = 1/6 ≈ 16.7%
sharding:ex-node3-0 ──┤
sharding:ex-node3-1 ──┘
```

所以 `shards-per-node` 控制的是 **绑定槽位总数**（= 分片数）。槽位越多，哈希取模空间越大、消息分得越散——这就是 Sharding 摊薄单队列压力的底层机制。默认是等权；若想给某个节点/某张分片更多流量，可以手动把那张分片多绑几次实现加权（Sharding 策略参数本身不直接暴露加权，需要自行操作 exchange binding）。

### 3.3 版本演进

| 版本 | 变化 |
|------|------|
| **RabbitMQ 4.3.0+** | `x-modulus-hash` **从 Sharding 插件移入核心**，并重新实现以保证路由稳定性（节点重启后仍稳定，前提是绑定集合不变） |
| **3.13 及更早** | `x-modulus-hash` 随 `rabbitmq_sharding` 插件提供，启用插件后才出现 |

所以在 4.x 上，即便不启用 Sharding 插件，也能直接使用 `x-modulus-hash` 这个 Exchange 类型；而「自动建分片 + 自动路由消费者」这套编排能力，才专属 Sharding 插件。

---

## 四、Sharding 的坑与边界

| 注意点 | 说明 |
|--------|------|
| **顺序** | 仅保证「同一 routing key → 同一分片」内的相对顺序；**跨分片无全局顺序**，不适合强顺序业务 |
| **均匀性** | 分布是否均匀取决于 **routing key 的哈希分散程度**；key 取值集中会严重倾斜。它不是严格轮询 |
| **稳定性** | 绑定集合不变时路由稳定（4.x 重构后节点重启也稳定）；但 **增删分片会改变取模空间，引起重新分布** |
| **Consumer 覆盖** | 必须保证每张分片至少一个 Consumer，否则该分片消息堆积；生命周期由应用管理 |
| **伪队列勿与分片 Queue 混用** | 分片 Queue 若已混入其他业务消息，再走伪队列消费会受脏数据影响 |
| **Ack** | 未 Ack 的消息会持续重投，须正常 `basicAck` |
| **策略可运行时改** | 调整 `shards-per-node` 会增删分片 Queue；但 Consumer 不会被插件迁移，**生命周期由应用负责** |
| **忽略队列主副本定位** | 分片场景下 `x-queue-master-locator` 之类设置不生效，分片由插件按节点自行编排 |

这些坑，大多根源在于「Sharding 是在传统队列之上『外挂』出来的分片能力」。下一节先横向对比几种"摊开队列"的思路，再引出官方更看好的现代方案。

---

## 六、横向对比：把队列压力摊开的几种思路

RabbitMQ 里"把单队列压力摊开"有好几种手段，别混淆：

| 方案 | 拆分维度 | 顺序保证 | 适用场景 |
|------|----------|----------|----------|
| **Sharding 插件** | 按 routing key 哈希分片到多节点多队列 | 跨分片无序 | 单队列吞吐瓶颈、对顺序无要求 |
| **Consistent Hash Exchange**（`x-consistent-hash`） | 哈希一致性路由，支持加权 | 同 key 同队列 | 需要稳定分区 + 加权、手动管理多队列 |
| **Federated Queue** | 把消息搬到「有消费者」的节点 | 跨节点无序 | 跨机房/跨集群负载均衡，消费者位置不固定 |
| **Streams / Super Stream** | 大日志 append + 多订阅、可分区 | 分区内有序 | 大吞吐、回放、多订阅者（**官方主推**） |
| **Quorum Queue** | 不拆分，靠 Raft 多副本 | 单队列内有序 | 高可靠、数据安全优先 |

Sharding 是其中"用空间换吞吐"的代表，代价是顺序与精确路由。但表里那个加粗的 **Streams / Super Stream**，正是官方为同一场景准备的现代答案——下面用一整节把它讲透。

---

# 路线二：Streams 与分区流（现代替代方案）

## 五、Stream 是什么：一条「可重放的只追加日志」

普通队列（classic / quorum）是 **破坏性消费**：消息被某个 Consumer 取走并 Ack 后就从队列消失。**Stream 完全不同**，它本质是一条 **持久化、可复制的只追加日志（append-only log）**，更接近 Kafka 的 topic：

- **非破坏性消费**：Consumer 读取消息但 **不删除**，同一条消息可被多个 Consumer 反复读、反复回放，直到过期。
- **append-only**：消息只追加到日志尾部，每条获得一个 **单调递增的永久 offset**。
- **分区内有序**：同一分区内 offset 严格有序，天然保留消息顺序。
- **存储即真相**：日志在磁盘按 segment 文件存储，每个 segment 配 offset→position 索引；retention 按 segment 整段回收。

一句话区分：**队列解决"送达即删"**；**Stream 解决"大吞吐写入 + 多订阅者按需回放"**。Sharding 插件想做的"水平扩吞吐"，Stream 用更原生、更高效的方式做到了。

---

## 六、上手 Stream

### 6.1 启用 Stream 协议

Stream 有两种使用方式：

| 方式 | 协议 | 端口 | 说明 |
|------|------|------|------|
| **Stream 协议客户端**（推荐） | RabbitMQ 专属二进制协议 | **5552** | 性能最好，支持全部 Stream 特性（filter、dedup、super stream、offset tracking） |
| AMQP 0-9-1 客户端 | AMQP 0-9-1 | 5672 | 兼容老客户端，把 stream 当 `x-queue-type=stream` 的队列用，特性受限 |

启用 Stream 插件（提供 5552 监听）：

```bash
rabbitmq-plugins enable rabbitmq_stream
```

可选自定义端口（`rabbitmq.conf`）：

```properties
stream.listeners.tcp.1 = 5552
```

官方核心团队维护的 Stream 协议客户端覆盖：**Java、Go、.NET、Rust、Python（rstream）**，生态完整。

### 6.2 创建 Stream 与 retention（数据保留）

Stream **无限增长**，必须配 retention 防止磁盘打满。两种维度（可叠加，先到先触发），**按 segment 整段回收，至少保留 1 个含消息的 segment**：

| 参数 | 含义 | 示例 |
|------|------|------|
| `max-length-bytes` | 按总大小保留 | `20gb` |
| `max-age` | 按时间保留（Y/M/D/H/m/s） | `PT10M30S`（10 分 30 秒）、`P1D`（1 天） |

**方式 A：AMQP 0-9-1 声明**（把 stream 当特殊队列）

```java
Map<String, Object> arguments = new HashMap<>();
arguments.put("x-queue-type", "stream");
arguments.put("x-max-length-bytes", 20_000_000_000);     // 最大 20 GB
arguments.put("x-stream-max-segment-size-bytes", 100_000_000); // 单 segment 100 MB
arguments.put("x-stream-filter-size-bytes", 32);          // Bloom 过滤器大小

channel.queueDeclare(
  "my-stream",
  true,         // durable（stream 必须持久化）
  false, false, // 非 exclusive、非 auto-delete
  arguments
);
```

**方式 B：rabbitmqctl 策略**（动态覆盖参数，便于运行时调整）

```bash
rabbitmqctl set_policy stream-retention "^my-stream$" \
  '{"max-length-bytes": 20000000000, "max-age": "P1D"}' \
  --apply-to queues
```

### 6.3 基础用法（Java）：生产与消费

引入官方客户端 `stream-java-client`，API 入口是 `Environment`。

**Producer：append + 异步 confirm**

```java
import com.rabbitmq.stream.*;

public class StreamProducer {
    public static void main(String[] args) throws Exception {
        // 1. 创建 Environment（连接 5552）
        Environment environment = Environment.builder()
                .host("192.168.65.112")
                .port(5552)
                .username("admin")
                .password("admin")
                .build();

        // 2. 声明 stream（不存在则创建）
        environment.streamCreator().stream("orders").create();

        // 3. 创建 Producer
        Producer producer = environment.producerBuilder()
                .stream("orders")
                .name("order-producer")   // 命名 Producer：开启去重（dedup）
                .build();

        // 4. 发送消息（异步 confirm）
        for (int i = 0; i < 1000; i++) {
            Message msg = producer.messageBuilder()
                    .addData(("order-" + i).getBytes())
                    .applicationProperties()   // 可附业务属性，供 filter 使用
                        .entry("region", "emea")
                    .messageBuilder()
                    .build();
            // 回调里拿到服务端分配的 offset（即写入位置）
            producer.send(msg, confirmationStatus -> {
                if (confirmationStatus.isConfirmed()) {
                    System.out.println("已写入 offset=" + confirmationStatus.getOffset());
                }
            });
        }

        producer.close();
        environment.close();
    }
}
```

两个要点：

- **`send` 是异步的**，通过回调拿到 confirm 与最终 `offset`。
- 给 Producer 起名字（`name(...)`）可开启 **去重（deduplication）**：broker 跟踪每个命名 Producer 已收到的最大 publishing ID，重发或 ID 回退的消息会被自动丢弃并直接 confirm——崩溃重连后可从断点续发，不丢不重。

**Consumer：从任意 offset 订阅（非破坏性）**

```java
import com.rabbitmq.stream.*;

public class StreamConsumer {
    public static void main(String[] args) throws Exception {
        Environment environment = Environment.builder()
                .host("192.168.65.112")
                .port(5552)
                .username("admin")
                .password("admin")
                .build();

        // OffsetSpecification：决定从哪里开始读
        // FIRST  - 第一条； NEXT  - 下一条（新来的）； LAST  - 最后一个 chunk
        // 还可以是具体数字 offset、时间戳、或相对当前的时间间隔
        Consumer consumer = environment.consumerBuilder()
                .stream("orders")
                .offset(OffsetSpecification.first())   // 从头回放
                .messageHandler((context, message) -> {
                    System.out.println("offset=" + context.offset()
                            + " body=" + new String(message.getBodyAsBinary()));
                    // 注意：Stream 消费无需、也不要 ack
                })
                .build();

        Thread.sleep(Long.MAX_VALUE); // 保持消费
    }
}
```

三个要点：

- **`OffsetSpecification`** 是 Stream 的灵魂：`first` / `next` / `last` / 具体数字 / 时间戳，可任意定位起点。
- **无需 ack**：Stream 是非破坏性读取，没有"删消息"的概念；进度由 **server-side offset tracking** 记录，消费端可 `storeOffset` 保存进度。
- 同一条 stream 可挂 **任意多个 Consumer**，各自独立 offset、互不影响——天然支持回放与多订阅。

> 若只能用 AMQP 0-9-1 客户端消费 stream，可通过 `x-stream-offset` 参数定位起点，但必须设 `basicQos`、且仍要 `basicAck`（ack 在 stream 语义里表示"我收到了"，不删消息）：
>
> ```java
> channel.basicQos(100);
> channel.basicConsume("my-stream", false,
>   Collections.singletonMap("x-stream-offset", "first"),
>   (tag, msg) -> { /* ... */ channel.basicAck(msg.getEnvelope().getDeliveryTag(), false); },
>   tag -> {});
> ```

---

## 七、Stream 的两大进阶能力

基础读写之外，Stream 还有两个让 Sharding 插件望尘莫及的能力：**服务端过滤** 和 **分区流**。

### 7.1 Stream Filtering：服务端按需过滤

Producer 写入时打一个 Bloom 过滤值，Consumer 订阅时只关心某些值，broker 在 **chunk 级别** 直接过滤掉不相关数据块，大幅减少网络与客户端开销：

```java
// Producer：从 applicationProperties.region 自动提取过滤值
Producer producer = environment.producerBuilder()
        .stream("invoices")
        .filterValue(msg -> msg.getApplicationProperties().get("region").toString())
        .build();

// Consumer：服务端 Bloom 过滤 + 客户端 postFilter 二次精筛
Consumer consumer = environment.consumerBuilder()
        .stream("invoices")
        .filter()
            .values("emea")                                          // 服务端按 chunk 过滤
            .postFilter(msg -> "emea".equals(                         // 客户端逐条精确过滤
                msg.getApplicationProperties().get("region")))
            .builder()
        .messageHandler((ctx, msg) -> { /* 处理 emea 区发票 */ })
        .build();
```

> Bloom 过滤有假阳性（可能漏放过来的无关消息），所以配 `postFilter` 在客户端做最终判定。

### 7.2 Super Stream：分区流（水平扩容的官方答案）

单个 stream 是单条日志，写入与存储最终会遇到瓶颈。**Super Stream（分区流，3.11+）** 把一条逻辑大流 **切成多个分区 stream**，存储与流量分散到多个集群节点，应用仍把它当 **一个整体** 操作。

**拓扑本质**：Super Stream 复用 AMQP 0-9.1 模型——一个 `x-modulus-hash` Exchange + 多个分区 stream + 绑定，客户端库屏蔽底层分区细节。（看到 `x-modulus-hash` 你应该会心一笑了：**Super Stream 的分区路由和 Sharding 插件同源**，区别只在底层是日志还是队列、以及编排是否自动化。）

```bash
# 创建 3 分区的 super stream（自动建好 exchange + 3 个 stream + 绑定）
rabbitmq-streams add_super_stream invoices --partitions 3

# 完整参数版
rabbitmq-streams add_super_stream invoices \
  --partitions 3 \
  --binding-keys key1,key2,key3 \
  --max-length-bytes 20gb \
  --max-age PT10M30S \
  --leader-locator client-local
```

**路由与顺序**：

- 消息按 **routing key 的哈希** 路由到固定分区；
- **同一 routing key 永远进同一分区**，故分区内严格有序；跨分区无全局顺序；
- 配合 **Single Active Consumer（SAC）**：同一分区的多个 Consumer 中只有一个活跃，崩溃自动切换，保证分区内 **顺序 + 连续性**。

**客户端：对应用透明**

```java
Environment environment = Environment.builder().host("...").port(5552).build();

// Producer：发到 super stream，库自动按 routing key 选分区
Producer producer = environment.producerBuilder()
        .superStream("invoices")              // 注意是 superStream(...)
        .key("invoice-1234")                  // 用它做哈希路由 → 固定分区
        .build();
producer.send(producer.messageBuilder()
        .addData("invoice data".getBytes()).build(),
        cs -> { /* confirm */ });

// Consumer：订阅 super stream，库自动管理分区分配 + SAC
Consumer consumer = environment.consumerBuilder()
        .superStream("invoices")              // superStream(...)
        .name("invoice-consumer")             // 命名 → 启用 Single Active Consumer
        .singleActiveConsumer()
        .messageHandler((ctx, msg) -> { /* 处理 */ })
        .build();
```

> ⚠️ 官方提醒：**Super Stream 会引入额外复杂度，建议在单 stream 达到极限后再上**，不要一上来就分区。

---

## 八、回到选型：Sharding vs Stream

讲完两条路线，用一张表收束全文。同样是"把单队列压力摊开"，它们的差距是结构性的：

| 维度 | Sharding 插件 | Stream / Super Stream |
|------|---------------|------------------------|
| 底层模型 | 多张普通队列 + Exchange 哈希 | append-only 日志（+ super stream 分区） |
| 协议 | AMQP 0-9-1 | 专属 Stream 二进制协议（吞吐高） |
| 消费语义 | 破坏性（ack 即删） | **非破坏性，可回放** |
| 多订阅 | 难（消息被一个消费者取走） | **天然多订阅**，各自独立 offset |
| 顺序 | 跨分片无序，需手动管 consumer 覆盖 | 分区内有序 + SAC 保证连续 |
| Consumer 管理 | **应用自己负责** | 客户端库 + SAC 自动管理 |
| 客户端特性 | 少 | filter、dedup、offset tracking、super stream |
| 官方定位 | 遗留，建议替代 | **主推方向** |

**什么时候选谁？**

| 场景 | 推荐 |
|------|------|
| 大吞吐写入、多订阅者各自消费、需要回放/重算 | **Stream** |
| 单 stream 吞吐或存储到顶，需水平拆分且保持分区内顺序 | **Super Stream** |
| 事件溯源、审计日志、指标流 | **Stream**（日志即真相） |
| 维护老系统、已是 AMQP 0-9-1 + Sharding 架构 | **Sharding 插件**（读懂即可，非必要不新建） |
| 需要"发完即删"的轻量任务分发、RPC | 普通 quorum / classic queue |

---

## 小结

- **单队列吞吐到顶时，RabbitMQ 给了两条水平扩展路线**：老的 Sharding 插件，新的 Streams / Super Stream。
- **Sharding 插件** = `x-modulus-hash` Exchange（4.3 起入核心，按 routing key 哈希取模、非轮询）+ 自动分片编排 + 同名伪队列消费（就近 + 最少连接）。它的三大坑是顺序、均匀性、Consumer 覆盖，根因是"在传统队列之上外挂分片"。
- **Stream 是一条可重放的只追加日志**：非破坏性消费、多订阅、offset 任意定位、服务端过滤；**Super Stream** 是它的分区形式（3.11+），路由同样基于 `x-modulus-hash`，配 SAC 做分区内有序 + 水平扩容，且客户端透明、Consumer 自动管理。
- **官方在 4.x 已明确**：新系统的"水平扩吞吐"应优先选 Stream，而非 Sharding 插件。

下一篇：监控 API、备份恢复与 Federation 跨机房同步。
