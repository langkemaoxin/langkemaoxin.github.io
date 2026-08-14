---
title: "RabbitMQ 安装部署——Docker 快速上手与数据持久化"
sidebarGroup: "RabbitMQ"
shortTitle: "02 安装部署"
order: 2
date: 2026-08-27
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 2/22 篇**  
> 上一篇：[《MQ 是什么？——从同步事件到异步消息》](/中间件/rabbitmq/rabbitmq-01-what-is-mq)  
> 下一篇预告：[《RabbitMQ 基础编程模型——从连接到消费》](/中间件/rabbitmq/rabbitmq-03-programming-model)

---

## 开头：先把环境装对

本篇只做一件事：把 RabbitMQ 装好、配好、保证数据不丢。先用 Docker 一条命令拉起 3.13（含管理插件）快速体验，再用 docker-compose 固化配置并解决数据持久化——包括两个真实踩出来的坑（节点名不固定导致数据「凭空消失」、`.erlang.cookie` 权限导致启动崩溃）。

Queue / Exchange / Connection / Channel 等核心概念不在本篇展开：控制台收发与编程模型见 [03 基础编程模型](/中间件/rabbitmq/rabbitmq-03-programming-model)，队列核心概念与持久化机制见 [04 队列核心概念](/中间件/rabbitmq/rabbitmq-04-queue-concepts)。

---

## 一、安装 RabbitMQ

### 管理插件是什么？

RabbitMQ 装好后，默认提供的是 **AMQP 消息服务**（端口 **5672**）：客户端连上来收发消息即可。

浏览器里的 **Web 管理控制台**（Overview / Queues / Exchanges 等，端口 **15672**）不是随服务自动常开的，而是由插件 **`rabbitmq_management`** 提供。所谓「启用 / 启动管理插件」，就是打开这个插件，让 15672 开始监听。

本系列统一用 Docker，两种镜像的差异：

| 镜像 | 如何拿到管理控制台 |
|------|-------------------|
| **`rabbitmq:3.13-management`**（推荐） | 插件已启用，映射 15672 即可打开控制台 |
| `rabbitmq:3.13`（无 management 后缀） | 必须在容器里手动 `rabbitmq-plugins enable rabbitmq_management` |

---

### 1.1 Docker 安装（推荐本地快速体验）

本地开发或跟练本系列时，优先用官方带管理插件的镜像，免去 Erlang 版本对齐与插件启用步骤。

#### 两种镜像怎么选

| 镜像 | 管理插件 | 说明 |
|------|----------|------|
| **`rabbitmq:3.13-management`** | 已启用 | 推荐；本机实测为 **3.13.7**，映射 15672 即可打开控制台 |
| `rabbitmq:3.13`（无 management） | 未启用 | 只有 AMQP；要控制台须进容器再 enable，并映射 15672 |

跟练本篇直接用 **`rabbitmq:3.13-management`**。

#### 拉取镜像

```bash
docker pull rabbitmq:3.13-management
```

#### 启动容器（management 镜像，插件已开）

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3.13-management
```

参数说明：

| 参数 | 含义 |
|------|------|
| `-d --name rabbitmq` | 后台运行，容器名为 `rabbitmq` |
| `-p 5672:5672` | AMQP 协议端口（客户端连接） |
| `-p 15672:15672` | 管理控制台 HTTP 端口（依赖 `rabbitmq_management`） |
| `RABBITMQ_DEFAULT_USER` / `PASS` | 创建管理员账号；避免依赖默认 `guest`（仅允许本机登录） |

`-management` 镜像启动后，日志中会出现类似：

```text
Management plugin: HTTP (non-TLS) listener started on port 15672
Server startup complete; 5 plugins started.
```

说明管理插件已在容器内就绪，**不必再执行** `rabbitmq-plugins enable`。

#### 若用了普通镜像，如何启用管理插件

误用 `rabbitmq:3.13`（未带 management）时，可在运行中的容器里手动开启：

```bash
# 需已映射 -p 15672:15672，否则宿主机仍访问不到控制台
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_management
```

启用后插件会按需加载；若 15672 仍打不开，可 `docker restart rabbitmq` 后再访问。

日常更省事：直接换成 `rabbitmq:*-management` 镜像重新 `docker run`。

#### 验证是否就绪

```bash
docker ps --filter "name=rabbitmq"
# 应看到 0.0.0.0:5672->5672/tcp、0.0.0.0:15672->15672/tcp，STATUS 为 Up

docker logs rabbitmq
# 出现 Server startup complete 即表示启动完成

docker exec rabbitmq rabbitmqctl status
# Runtime 中可见 RabbitMQ version: 3.13.x
```

浏览器访问 [http://localhost:15672](http://localhost:15672)，用 `admin` / `admin` 登录即可进入 Overview。

#### 常用运维命令

| 命令 | 作用 |
|------|------|
| `docker logs -f rabbitmq` | 跟踪启动与运行日志 |
| `docker stop rabbitmq` | 停止容器 |
| `docker start rabbitmq` | 再次启动（数据在容器内，未挂卷时重建会丢） |
| `docker rm -f rabbitmq` | 强制删除容器 |

> ⚠️ 表中 `rm` 后再 `run`（或 compose 的 `down` + `up`）属于**重建**：未挂卷时，队列、消息、用户、vhost 全部丢失。长期使用请按下节 1.2 配好持久化。

---

### 1.2 docker-compose 部署与数据持久化（长期使用必看）

裸 `docker run` 适合第一次体验；要把 RabbitMQ 当成后续跟练本系列的长期环境，还得补两件事：**配置固化**（compose 文件，团队协作与重建都省心）和 **数据持久化**（挂命名卷，容器重建后队列/消息/用户不丢）。其中有两个真实踩出来的坑，先给完整模板再逐个解释。

#### 完整 compose 模板

在工作目录新建 `docker-compose.yml`：

```yaml
services:
  rabbitmq:
    image: rabbitmq:3.13-management
    container_name: rabbitmq
    hostname: rabbitmq                    # ① 固定 hostname（坑①，见下文）
    ports:
      - "5672:5672"                       # AMQP：客户端代码连这个
      - "15672:15672"                     # 管理控制台：浏览器访问
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq   # ② 数据持久化：队列/消息/用户/vhost 都在这
    environment:
      RABBITMQ_NODENAME: rabbit@rabbitmq  # ③ 固定节点名（坑①，见下文）
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin

volumes:
  rabbitmq_data:
```

一行启动：

```bash
docker compose up -d
```

相比 1.1 的裸 `docker run`，多出来的三处正是关键：

| 配置 | 作用 |
|------|------|
| `hostname: rabbitmq` + `RABBITMQ_NODENAME` | 固定节点名，保证重建后能复用旧数据（坑①） |
| `rabbitmq_data:/var/lib/rabbitmq` 命名卷 | RabbitMQ 的所有数据（Mnesia 元数据 + 消息）都在 `/var/lib/rabbitmq`，挂卷后重建不丢 |
| compose 文件本身 | 端口、账号、挂载固化在文件里，`down/up` 随便重建 |

#### 坑 ①：不固定节点名 → 重建后数据「凭空消失」

RabbitMQ 按**节点名**在 `/var/lib/rabbitmq/mnesia` 下建数据库目录（形如 `rabbit@<hostname>`）。Docker 默认拿**容器 ID 当 hostname**，而容器每次重建 ID 都变 → 节点名变 → Mnesia 找不到旧库 → 开一个空的**新库**——老队列、消息就"丢了"（其实数据还在卷里，只是节点名对不上）。

所以模板里必须同时固定 hostname 与节点名，缺一不可：

```yaml
hostname: rabbitmq
environment:
  RABBITMQ_NODENAME: rabbit@rabbitmq   # 节点名恒定，mnesia 一直复用同一个库
```

验证：`docker exec rabbitmq rabbitmqctl status | grep "Node name"`，每次重建后都应是 `rabbit@rabbitmq` 才对。

#### 坑 ②：`.erlang.cookie` 权限错误 → 容器启动崩溃

**现象**：挂命名卷后，偶尔容器一起来就挂，日志报：

```text
Error when reading /var/lib/rabbitmq/.erlang.cookie: eacces
```

`eacces` 是 Erlang 的「权限不足」错误。要理解它，得先知道这个文件是干嘛的、坏在哪一环。

**`.erlang.cookie` 是什么**：RabbitMQ 用 Erlang 编写，节点内部组件之间、以及 `rabbitmqctl` 等命令行工具与节点的通信，都走 Erlang 的分布式通道。`.erlang.cookie` 就是这个通道的**共享密钥**——通信双方 cookie 一致才允许连接，所以它存在数据目录 `/var/lib/rabbitmq` 里（也就跟着进了我们挂的卷），并且属于「必须严防泄露」的敏感文件。

**为什么必须是 400 + 属主可读**：Erlang 出于安全考虑，**强制要求** cookie 文件只允许属主读写（权限 `400` 或 `600`）。检查的不只是「能不能读」，还包括「属主对不对、权限松不松」——属主不是运行 RabbitMQ 的用户，或权限开得太大，Erlang 都会拒绝启动，报上面的 `eacces`。

**属主为什么会变成 root**：容器里的 RabbitMQ 进程以 `rabbitmq` 用户（UID **999**）运行，它写的文件属主自然是 999；但只要卷里的文件**曾被以 root 身份写过**——常见于用临时容器初始化/恢复数据、手工 `docker cp` 拷文件进去、某些 WSL2/Docker Desktop 环境对命名卷的初始化行为——属主就变成了 root。之后 `rabbitmq` 用户（999）再按 400 去读一个 root 属主的文件，直接被拒，节点起不来。

**为什么用「另起一个临时容器」来修**：目标容器已经崩了，`docker exec` 进不去；而我们日常操作的宿主机账号又看不到卷内部的文件系统。所以借用 Docker 的能力——起一个轻量的 alpine 容器，把**同一个卷**挂进去，以 root 身份改属主：

```bash
docker run --rm -v <项目名>_rabbitmq_data:/var/lib/rabbitmq alpine \
  sh -c "chown 999:999 /var/lib/rabbitmq/.erlang.cookie && chmod 400 /var/lib/rabbitmq/.erlang.cookie"
```

逐段拆开：

| 片段 | 作用 |
|------|------|
| `--rm` | 临时容器用完即删，不留垃圾 |
| `-v <项目名>_rabbitmq_data:/var/lib/rabbitmq` | 把出问题的**同一个命名卷**挂进临时容器，改的才是真身 |
| `alpine` | 仅几 MB 的基础镜像，只为借它的 shell 和 `chown` |
| `chown 999:999` | 属主改回 `rabbitmq` 用户（容器内以 UID 操作，不必有同名用户） |
| `chmod 400` | 收紧到「仅属主可读」，满足 Erlang 的强制要求 |

修完验证一下再启动：

```bash
# 属主应为 999，权限应为 -r--------（400）
docker run --rm -v <项目名>_rabbitmq_data:/var/lib/rabbitmq alpine ls -ln /var/lib/rabbitmq/.erlang.cookie

docker compose up -d
```

> 💡 卷名默认带 compose 项目名前缀（如 `rabbitmq_rabbitmq_data`），可用 `docker volume ls` 确认实际名字。这个坑在首次挂卷、或往卷里手工写过文件后最常见——遇到 `eacces` 优先查属主。

#### 验证持久化生效

真正的考验是 **重建**（`down` + `up`），不是 `restart`——restart 不触发重建，数据天然在：

```bash
# 1. 建一条测试队列
docker exec rabbitmq rabbitmqadmin -u admin -p admin declare queue name=persist_test durable=true

# 2. 重建容器
docker compose down && docker compose up -d
# 等十几秒启动完

# 3. 队列还在，持久化即生效
docker exec rabbitmq rabbitmqadmin -u admin -p admin list queues
```

仍能看到 `persist_test` 就算成功。配好上面两步后，重建容器时队列、消息、用户、vhost 都会完整保留。

#### 插件启用怎么「固化」（机制速览）

`docker exec ... rabbitmq-plugins enable` 只改容器**运行时**状态，容器一重建就丢。固化思路是：RabbitMQ 启动时会读 `/etc/rabbitmq/enabled_plugins` 文件决定启用哪些插件，**在宿主机准备这份文件挂载进去**即可。

- 用 `rabbitmq:3.13-management` 镜像时，管理插件已内置启用，**无需**挂这个文件；
- 后续用到其他插件（如第 9 篇的 Sharding）时才需要，文件格式、挂载目标路径与排查方法见 [《消息分片存储插件 Sharding》](/中间件/rabbitmq/rabbitmq-09-sharding)。

---

### 1.3 rabbitmq.conf：把配置固化成文件

前面用环境变量（`RABBITMQ_DEFAULT_USER` 等）做了最简配置；正经部署要用**配置文件**。RabbitMQ 的配置分两层，各管一摊：

| 文件 | 管什么 | 格式 |
|------|--------|------|
| `/etc/rabbitmq/rabbitmq.conf` | **服务配置**：端口、内存水位、日志、TLS、各插件参数…… | `key = value`（3.7 起的 sysctl 格式） |
| `/etc/rabbitmq/rabbitmq-env.conf` | **启动环境**：节点名、数据目录、Erlang 分发端口 | `RABBITMQ_XXX=yyy`（shell 风格） |

优先级：**环境变量 > rabbitmq.conf**——两边都设时环境变量赢，这也是 1.2 用 `RABBITMQ_NODENAME` 固定节点名生效最直接的原因。Docker 下把文件挂进去即可，compose 补一行：

```yaml
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
      - ./rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf   # 服务配置
```

一份起步配置示例（后续各篇的配置项都落在这个文件里）：

```ini
# 内存水位与磁盘红线（容器部署建议用绝对值，机制详见第 12 篇）
vm_memory_high_watermark.absolute = 2GB
disk_free_limit.absolute = 1GB

# 日志（详见第 10 篇）
log.file.level = info

# 端口（默认即如此，列出便于查阅）
listeners.tcp.default = 5672
management.tcp.port = 15672
```

改完 `docker compose restart` 生效。**务必验证配置真的被读到了**——有的键拼错不会报错、只是被静默忽略：

```bash
docker exec rabbitmq rabbitmqctl environment | grep -A2 vm_memory
# 输出里能看到 vm_memory_high_watermark 的实际值才算生效
```

> 💡 官方全部配置键的权威清单见 [docs/configure](https://www.rabbitmq.com/docs/configure)。集群、TLS、Federation 等专项配置在对应篇目（11 / 15 / 10）展开。

---

## 二、验证安装：登录管理控制台

浏览器访问 [http://localhost:15672](http://localhost:15672)，用启动时预置的 `admin` / `admin` 登录，进入 Overview 即安装成功。

顶部菜单先混个脸熟，后续各篇会反复用到：

| 菜单 | 说明 |
|------|------|
| **Overview** | 集群整体运行概况 |
| **Connections / Channels** | 客户端连接与信道 |
| **Exchanges / Queues** | 交换机与队列 |
| **Admin** | 用户、权限、Virtual Host |

> **Virtual Host（虚拟主机）** 之间资源完全隔离，可视为独立 RabbitMQ 实例，详见 [16 · Virtual Hosts](/中间件/rabbitmq/rabbitmq-16-virtual-hosts)。

---

## 小结

- 管理控制台依赖插件 `rabbitmq_management`（15672）；Docker 用 `*-management` 镜像即可，普通镜像需进容器手动 `rabbitmq-plugins enable`
- 本地跟练：`rabbitmq:3.13-management` 一条 `docker run` 即可，账号可用环境变量预置
- 长期使用：compose + 命名卷持久化，并**固定 hostname 与节点名**（否则容器重建后节点名变化，数据「凭空消失」）；挂卷后偶发 `.erlang.cookie` 属主变 root，改回 999 即可
- 插件启用想固化，挂载宿主机的 `enabled_plugins` 到 `/etc/rabbitmq/enabled_plugins`（management 镜像无需）

下一篇先用 Web 控制台完成第一次收发、建立 Queue / Exchange 的直觉，再拆解完整的七步编程模型。
