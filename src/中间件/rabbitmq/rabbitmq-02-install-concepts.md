---
title: "RabbitMQ 安装与核心概念——Queue、Exchange、Channel"
sidebarGroup: "RabbitMQ"
shortTitle: "02 安装与核心概念"
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

## 开头：装好了，先别写代码

很多教程一上来就 `basicPublish`，结果连管理控制台长什么样、Queue 和 Exchange 谁存消息谁路由都不清楚。

本篇先用 **Docker** 快速拉起 RabbitMQ 3.13（含管理插件），再用 Web 控制台完成第一次收发，最后用 Java 客户端验证 Connection / Channel——把核心概念落到操作上。服务器环境另见下文 **CentOS / RHEL 官方 yum 安装**（当前稳定版，约 4.3.x）。

---

## 一、安装 RabbitMQ

### 管理插件是什么？

RabbitMQ 装好后，默认提供的是 **AMQP 消息服务**（端口 **5672**）：客户端连上来收发消息即可。

浏览器里的 **Web 管理控制台**（Overview / Queues / Exchanges 等，端口 **15672**）不是随服务自动常开的，而是由插件 **`rabbitmq_management`** 提供。所谓「启用 / 启动管理插件」，就是打开这个插件，让 15672 开始监听。

两种安装路径的差异：

| 方式 | 如何拿到管理控制台 |
|------|-------------------|
| **Docker（推荐）** | 使用带 `-management` 后缀的镜像，插件已启用；或普通镜像里再手动 `enable` |
| **CentOS 手动安装** | 必须执行 `rabbitmq-plugins enable rabbitmq_management` |

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

误用 `rabbitmq:3.13`（未带 management）时，可在运行中的容器里手动开启（与 CentOS 同一条命令）：

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

> 需要持久化时，可增加 `-v rabbitmq_data:/var/lib/rabbitmq`，把数据目录挂到命名卷。

---

### 1.2 CentOS / RHEL 手动安装（可选）

不能用 Docker、或要在虚拟机 / 物理机上常驻运行时，按官方 **RPM（dnf/yum）** 流程安装。资料依据：[Installing on RPM-based Linux](https://www.rabbitmq.com/docs/install-rpm)、[Management Plugin](https://www.rabbitmq.com/docs/management)、[Erlang 版本要求](https://www.rabbitmq.com/docs/which-erlang)（文档线约 4.3）。

> **与 1.1 的关系**：本系列 Docker 跟练仍用 `rabbitmq:3.13-management`，控制台截图也多来自 3.13。本节按官方推荐安装 **当前社区稳定版（撰写时约 4.3.x）**，管理台与 Queue / Exchange 等概念操作一致；个别菜单文案或默认行为可能略有差异。

#### 前置：发行版与版本

官方当前支持的 RPM 系发行版包括（节选）：**CentOS Stream 9/10**、**RHEL 9/10/8**、Rocky / Alma 等同代版本等。下文以 **el9**（CentOS Stream 9 / RHEL 9 一类）为例。

| 组件 | 说明 |
|------|------|
| RabbitMQ | 通过 Team RabbitMQ 的 yum 仓库安装最新稳定版（撰写时约 **4.3.x**） |
| Erlang | 须与 RabbitMQ 版本匹配；**4.3.x 需 Erlang 27.x**（见 [which-erlang](https://www.rabbitmq.com/docs/which-erlang)） |
| 安装方式 | **优先 yum 仓库**（依赖与升级更省事）；本地单独 `rpm` 安装为次选 |

版本对应关系示意（配图来自系列早期演示，请以官网矩阵为准）：

![RabbitMQ 与 Erlang 版本对应关系](/中间件/rabbitmq/12/p04-01.png)

#### 推荐：用官方 yum 仓库安装

**1. 导入签名密钥**

```bash
rpm --import 'https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc'
rpm --import 'https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-erlang.E495BB49CC4BBE5B.key'
rpm --import 'https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-server.9F4587F226208342.key'
```

**2. 写入仓库文件** `/etc/yum.repos.d/rabbitmq.repo`（el9 / 现代发行版）：

```ini
# /etc/yum.repos.d/rabbitmq.repo

## Zero dependency Erlang
[modern-erlang]
name=modern-erlang-el9
baseurl=https://yum1.rabbitmq.com/erlang/el/9/$basearch
        https://yum2.rabbitmq.com/erlang/el/9/$basearch
repo_gpgcheck=1
enabled=1
gpgkey=https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-erlang.E495BB49CC4BBE5B.key
gpgcheck=1
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
pkg_gpgcheck=1
autorefresh=1
type=rpm-md

[modern-erlang-noarch]
name=modern-erlang-el9-noarch
baseurl=https://yum1.rabbitmq.com/erlang/el/9/noarch
        https://yum2.rabbitmq.com/erlang/el/9/noarch
repo_gpgcheck=1
enabled=1
gpgkey=https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-erlang.E495BB49CC4BBE5B.key
       https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc
gpgcheck=1
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
pkg_gpgcheck=1
autorefresh=1
type=rpm-md

## RabbitMQ Server
[rabbitmq-el9]
name=rabbitmq-el9
baseurl=https://yum2.rabbitmq.com/rabbitmq/el/9/$basearch
        https://yum1.rabbitmq.com/rabbitmq/el/9/$basearch
repo_gpgcheck=1
enabled=1
gpgkey=https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-server.9F4587F226208342.key
       https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc
gpgcheck=1
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
pkg_gpgcheck=1
autorefresh=1
type=rpm-md

[rabbitmq-el9-noarch]
name=rabbitmq-el9-noarch
baseurl=https://yum2.rabbitmq.com/rabbitmq/el/9/noarch
        https://yum1.rabbitmq.com/rabbitmq/el/9/noarch
repo_gpgcheck=1
enabled=1
gpgkey=https://github.com/rabbitmq/signing-keys/releases/download/3.0/cloudsmith.rabbitmq-server.9F4587F226208342.key
       https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc
gpgcheck=1
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
pkg_gpgcheck=1
autorefresh=1
type=rpm-md
```

> RHEL 8 / Rocky 8 等需换用官方文档中的 **el8** 仓库片段，不要直接套用上面的 `el/9`。

**3. 安装依赖与软件包**

```bash
dnf update -y
dnf install -y logrotate
dnf install -y erlang rabbitmq-server
```

仓库会拉齐 **zero-dependency Erlang** 与 `rabbitmq-server`。也可从 [GitHub Releases](https://github.com/rabbitmq/rabbitmq-server/releases) 下载 `.rpm` 后 `dnf install -y ./rabbitmq-server-*.rpm`，但须自行解决依赖，升级也不如仓库方便。

![RabbitMQ RPM 安装过程](/中间件/rabbitmq/12/p05-01.png)

#### 启用管理插件并启动服务

RPM **装完后不会自动当守护进程跑起来**，管理控制台也不会默认打开。按固定顺序：

```bash
# 1. 启用管理插件（打开 15672 Web 控制台）
rabbitmq-plugins enable rabbitmq_management

# 2. 开机自启并立即启动（官方推荐 systemctl）
systemctl enable --now rabbitmq-server

# 3. 确认服务与节点状态
systemctl status rabbitmq-server
rabbitmqctl status
```

`rabbitmqctl status` 的 Runtime 信息正常，即表示 Broker 已起来。

![rabbitmqctl status 启动成功示意](/中间件/rabbitmq/12/p06-01.png)

#### 创建管理员并打开控制台

默认用户 `guest` / `guest` **只能本机连接**。远程或习惯用独立账号时，创建管理员：

```bash
rabbitmqctl add_user admin admin
rabbitmqctl set_user_tags admin administrator
rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"
```

浏览器访问 `http://<主机>:15672`，用 `admin` / `admin` 登录 Overview。若跨机访问，确认防火墙已放行 **15672**（以及客户端需要的 **5672**）。

![管理控制台登录与 Overview 页面](/中间件/rabbitmq/12/p07-01.png)

![Admin 用户与 Virtual Host 管理](/中间件/rabbitmq/12/p07-02.png)

#### 常用运维命令

| 命令 | 作用 |
|------|------|
| `systemctl start rabbitmq-server` | 启动服务 |
| `systemctl stop rabbitmq-server` | 停止服务 |
| `systemctl restart rabbitmq-server` | 重启服务 |
| `systemctl status rabbitmq-server` | 查看 systemd 服务状态 |
| `rabbitmqctl status` | 查看节点 Runtime / 应用状态 |
| `rabbitmq-plugins list` | 查看插件启用情况 |

旧环境偶见 `service rabbitmq-server start`，与 `systemctl` 等价场景下优先用 **systemctl**。

---

## 二、管理控制台概览

登录后顶部菜单：

| 菜单 | 说明 |
|------|------|
| **Overview** | 集群整体运行概况 |
| **Connections / Channels** | 客户端连接与信道 |
| **Exchanges / Queues** | 交换机与队列 |
| **Admin** | 用户、权限、Virtual Host |

**Virtual Host（虚拟主机）** 之间资源完全隔离，可视为独立 RabbitMQ 实例。不同 vhost 之间无法通过 Exchange 把消息转发到另一个 vhost 的 Queue。

---

## 三、理解 Queue

在 **Queues** 菜单创建名为 `test1` 的经典队列（Classic Queue）。创建时可勾选 **Durable**：表示队列元数据会落盘，Broker 重启后队列定义仍在。

![创建 Classic 队列 test1](/中间件/rabbitmq/12/p08-01.png)

进入 `test1` 详情页（例如 `/#/queues/%2F/test1`），可展开 **Publish message** 发消息、**Get messages** 取消息。这是管理台基于 `basic.publish` / `basic.get` 的调试能力，适合跟练与排障，**不是**生产消费方式。

![在 Queue 详情页发送与消费消息](/中间件/rabbitmq/12/p08-02.png)

### 3.1 Publish message：Delivery mode

发消息时除 Payload（正文）外，重点看 **Delivery mode**（AMQP 属性 `delivery_mode`）：

| UI 文案 | 值 | 含义 |
|---------|-----|------|
| **1 - Non-persistent** | `1` | **瞬态消息**。Broker 重启后**不一定**还在；即便队列是 Durable，瞬态消息在恢复时也可能被丢弃 |
| **2 - Persistent** | `2` | **持久消息**。意图写入可恢复存储；要与 **Durable 队列**配合，重启后才更可能还在 |

常见误区：

- **队列 Durable ≠ 消息一定持久**：Durable 只管队列定义；消息是否按持久语义处理，看 Delivery mode（以及队列类型实现）。
- **消息 Persistent + 非持久队列**：队列本身可能在重启时消失，消息跟着没了。
- **Quorum Queue**：发布到仲裁队列时，消息会按持久路径处理，与 Classic 上「选 1 / 2」的观感不完全一样；本篇跟练用 Classic 即可。

#### 消息要真正持久下来，需要同时满足三件事

`delivery_mode = 2` 只是其中一环。一条消息想在 Broker 重启后还活着，得凑齐：

| 条件 | 谁负责 | 没满足会怎样 |
|------|--------|--------------|
| **① 队列是 Durable** | 声明队列时 `durable=true` | Broker 重启后队列定义本身没了，里面的消息自然全没 |
| **② 消息 `delivery_mode = 2`** | 发布消息时选 Persistent / 代码设持久属性 | 即便队列还在，瞬态消息恢复时会被丢弃 |
| **③ 消息确实落盘并同步** | 队列类型决定（Classic / Quorum） | 见下方两种队列的差异 |

前两个是**必要条件**，少一个都不行；第三个是「持久」这个词真正的含义所在，分队列类型看：

**Classic 队列（本篇跟练用）**：Persistent 消息会写入磁盘的消息存储（message store）。

- **优雅重启**（`systemctl restart` / `docker restart`）：①② 满足 → 消息都在。
- **异常退出**（`kill -9` / 掉电）：Broker 可能在「收到消息」与「写入磁盘」之间就挂了，这条消息就丢——单节点 Classic 无法靠自身消除这个窗口。

**Quorum Queue（生产环境持久首选）**：消息**天然全部持久**——发布时不管 `delivery_mode` 填什么，都按持久处理；基于 Raft，消息要先被**多数副本写盘**才算发布成功，再回 ack 给生产者，可靠性远高于 Classic 单节点。

> **光靠 ①②③ 还不够，还得让生产者「知道」消息落盘了**——这就是 **Publisher Confirms（发布确认）**。开启后，Broker 只有在持久消息真正写盘（Quorum 则是多数副本确认）后才回 `basic.ack`，没收到就重发；不开就是「发了就忘」，崩溃窗口里的消息会无声丢失。Confirms 是和持久化配套的可靠性机制（具体用法见后续编程模型篇）。

代码里发持久消息（Java）：

```java
import com.rabbitmq.client.MessageProperties;

// 发布到默认交换机（""），routingKey = 队列名，即直接投到该队列
// （Exchange 的概念见第四节，这里只关注 delivery_mode 怎么设）
channel.basicPublish("", QUEUE_NAME,
        MessageProperties.PERSISTENT_TEXT_PLAIN,   // 持久化文本：delivery_mode=2
        "hello".getBytes("UTF-8"));

// 或自定义属性
AMQP.BasicProperties props = new AMQP.BasicProperties.Builder()
        .deliveryMode(2)          // 2 = Persistent
        .contentType("text/plain")
        .build();
channel.basicPublish("", QUEUE_NAME, props, body);
```

> 代价提醒：持久消息要写盘，吞吐比瞬态低，**别无脑全开 Persistent**。可丢、可重算的消息（日志、埋点）用瞬态；业务关键消息才上持久 + Quorum Queue。

跟练建议：先用 **2 - Persistent** 发几条，再在 Get 里观察；想对比行为时再发 Non-persistent。

### 3.2 Get messages：Ack Mode

点 **Get Message(s)** 会从队列取出最多 `count` 条（FIFO）。**Ack Mode** 决定取完之后消息是**还回队列**还是**从队列删除**（对应 HTTP API 的 `ackmode`）。本机 3.13 管理台选项原文如下：

| UI 文案 | API `ackmode` | 取完后消息还在队列？ | 说明 |
|---------|---------------|----------------------|------|
| **Nack message requeue true**（默认） | `ack_requeue_true` | **是**（重新入队） | 适合「只看一眼内容」：消息还在，Ready 数通常很快恢复。UI 文案带 Nack，API 名带 ack，都表示**不删、再入队** |
| **Automatic ack** | `ack_requeue_false` | **否**（删除） | 名字像「自动确认」，实际是**确认并移除**——看完即消费掉。生产库上误选可能把消息弄没 |
| **Reject requeue true** | `reject_requeue_true` | **是**（拒绝后再入队） | 走拒绝（reject）并 requeue，调试「消费失败但还要重试」的路径 |
| **Reject requeue false** | `reject_requeue_false` | **否**（删除）；若配置了死信（DLX）可能进死信队列 | 拒绝且不重回原队列，适合模拟失败丢弃 / 死信 |

怎么选（控制台调试）：

1. **只想看消息、不改队列积压** → 用默认 **Nack message requeue true**（或 Reject requeue true）。
2. **故意消费掉** → 选 **Automatic ack**。
3. **验证死信** → 队列已绑 DLX 时，用 **Reject requeue false**。

控制台 Get 不保证与客户端长连接消费同等可靠，官方也标注 HTTP get 仅适合诊断；业务消费请用客户端订阅（`basic.consume`）并按业务做手动 ACK / NACK。

Queue 是 RabbitMQ 传递消息的载体，本质是 **FIFO 队列**。控制台演示的是直接对 Queue 操作；编写客户端时也是绑定对应 Queue 收发。

---

## 四、理解 Exchange

Queue 能收发消息，那 **Exchange（交换机）** 做什么？

Exchange 不存储消息，它与 Queue 建立 **Binding（绑定）** 关系，Producer 把消息发到 Exchange，Exchange 再按规则转发到绑定的 Queue。

进入 **Exchanges**，每个 vhost 预置多种 Exchange（如 `amq.direct`）。

![预置 Exchange 列表](/中间件/rabbitmq/12/p09-01.png)

选择 `amq.direct`，在 **Bindings** 中将 `test1` 绑定到该交换机（注意选择正确的 vhost，如 `/mirror`）。

![将 test1 绑定到 amq.direct](/中间件/rabbitmq/12/p09-02.png)

绑定完成后，Exchange 与 Queue 详情页均可见绑定关系。

![Exchange 与 Queue 双向可见的绑定结果](/中间件/rabbitmq/12/p10-01.png)

在 Exchange 详情页发送消息，`test1` 队列即可消费到。

![经 Exchange 发送后在 Queue 消费](/中间件/rabbitmq/12/p10-02.png)

要点：

- Exchange **不存消息**，只负责路由
- 通常 **Producer 对接 Exchange**，**Consumer 只消费 Queue**
- 一个 Exchange 可绑定多个 Queue；Routing Key、Headers、Properties 决定分发策略

---

## 五、理解 Connection 与 Channel

**Connection** 对应一个客户端 TCP 连接；**Channel** 是 Connection 上的 AMQP 信道，实际 API 操作在 Channel 层完成。一个 Connection 可创建多个 Channel，复用 TCP 以减轻开销。

### 5.1 Maven 依赖

> 📦 **配套示例项目**：本节代码（5.1 依赖 + 5.2 消费者）可在 GitHub 运行 → [rabbitmq-blog-demo](https://github.com/code-corey/rabbitmq-blog-demo)

```xml
<dependency>
    <groupId>com.rabbitmq</groupId>
    <artifactId>amqp-client</artifactId>
    <version>5.21.0</version>
</dependency>
```

### 5.2 消费者示例

```java
public class FirstConsumer {
    private static final String HOST_NAME = "192.168.65.112";
    private static final int HOST_PORT = 5672;
    private static final String QUEUE_NAME = "test2";
    public static final String USER_NAME = "admin";
    public static final String PASSWORD = "admin";
    public static final String VIRTUAL_HOST = "/mirror";

    public static void main(String[] args) throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(HOST_NAME);
        factory.setPort(HOST_PORT);
        factory.setUsername(USER_NAME);
        factory.setPassword(PASSWORD);
        factory.setVirtualHost(VIRTUAL_HOST);

        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();

        // 队列名, durable, exclusive, autoDelete, arguments
        channel.queueDeclare(QUEUE_NAME, true, false, false, null);
        channel.basicQos(1);

        Consumer myconsumer = new DefaultConsumer(channel) {
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope,
                                       AMQP.BasicProperties properties, byte[] body)
                    throws IOException {
                System.out.println("routingKey > " + envelope.getRoutingKey());
                System.out.println("deliveryTag > " + envelope.getDeliveryTag());
                System.out.println("content: " + new String(body, "UTF-8"));
                channel.basicAck(envelope.getDeliveryTag(), false);
            }
        };

        channel.basicConsume(QUEUE_NAME, myconsumer);
    }
}
```

#### `queueDeclare(...)` 的五个参数逐个看

```java
channel.queueDeclare(QUEUE_NAME, true, false, false, null);
```

方法签名是 `queueDeclare(String queue, boolean durable, boolean exclusive, boolean autoDelete, Map<String,Object> arguments)`，本例 `(true, false, false, null)` 五个参数含义如下：

| # | 参数 | 本例取值 | 含义 |
|---|------|----------|------|
| 1 | `queue` | `"test2"` | 队列名。填空串 `""` 则由 Broker 自动生成唯一名（临时队列常用） |
| 2 | `durable` | `true` | 队列是否**持久化**。`true` → 队列元数据落盘，Broker 重启后队列还在（即第三节的 Durable 勾选项） |
| 3 | `exclusive` | `false` | 是否**独占**。`true` → 该队列只能被**声明它的这条 Connection** 使用，连接一断队列即删；常用于「一条连接私有的临时队列」（如 RPC 的应答队列） |
| 4 | `autoDelete` | `false` | 是否**自动删除**。`true` → 当**最后一个消费者**取消订阅 / 断开后队列被删 |
| 5 | `arguments` | `null` | 可选参数 `Map`，承载扩展特性 |

三个最容易记混的点：

- **`autoDelete` 不是「没消息就删」**：只有**曾经有过消费者**、且最后一个消费者走后才会触发删除；**从没来过消费者的队列不会被自动删**。想「没人消费就清掉」要用队列级 `x-expires`（TTL）。
- **`exclusive=true` 会忽略 `durable`**：RabbitMQ 把独占队列当**瞬态**处理——它的生命周期绑在连接上，谈持久化没意义。所以本例若真想持久，绝不能把 `exclusive` 设成 `true`。
- **`durable` 管队列、不管消息**：`durable=true` 只保证**队列定义**活过重启；消息能不能活过重启，看 `delivery_mode` + 队列类型（回到 3.1 的三条件）。

`arguments` 常用键（本例 `null`，需要时再填）：

| 键 | 作用 |
|----|------|
| `x-message-ttl` | 消息在队列里的存活时长（毫秒），过期作死信或丢弃 |
| `x-dead-letter-exchange` | 死信交换机（DLX），消息被拒 / 过期 / 超长时转投它处（见 3.2） |
| `x-max-priority` | 开启优先级队列，设最大优先级数 |
| `x-queue-type` | 队列类型：`classic` / `quorum` / `stream`（见 3.1） |
| `x-max-length` | 队列消息条数上限，超出的按策略丢弃或转死信 |

最后一句提醒：`queueDeclare` 是**幂等**的——多次声明同名队列时，参数必须**完全一致**，否则 Broker 报 `PRECONDITION_FAILED` 并关闭 Channel（比如先用 `durable=true` 建过，再拿 `false` 声明会失败）。改参数前要先把旧队列删掉。

本例 `(true, false, false, null)` 的整体含义：**一个持久、可被多连接共享、不会自动消失、无额外参数的经典队列**——最普通也最常用的生产形态。

运行后在控制台往 `test2` 发消息，消费者即可收到。

![控制台发消息、Java 消费者接收](/中间件/rabbitmq/12/p12-01.png)

在 **Connections** 和 **Channels** 可看到一条 Connection（running）和一条 Channel（有数据交互时为 running，空闲为 idle）。

![Connections 与 Channels 状态](/中间件/rabbitmq/12/p12-02.png)

---

## 六、核心概念总结

![RabbitMQ 核心概念与消息流转模型](/中间件/rabbitmq/12/p13-01.png)

| 概念 | 说明 |
|------|------|
| **Queue** | 实际存消息的最小单元，FIFO；消息最终必须进入 Queue 才能被消费 |
| **Exchange** | 路由组件，不存消息；与 Queue 绑定后转发消息；多数业务场景需要 Exchange |
| **Virtual Host** | 逻辑隔离单元，权限与资源独立；不同 vhost 无法互通信 |
| **Connection** | 客户端与 Broker 的 TCP 连接，用完应关闭 |
| **Channel** | AMQP 信道，绝大多数 API 在 Channel 上执行；多 Channel 共享 Connection |

对照上述概念再读 Java 客户端代码：先 `newConnection()`，再 `createChannel()`，然后 `queueDeclare` / `basicConsume`——这就是 RabbitMQ 使用的骨架。

---

## 小结

- 管理控制台依赖插件 `rabbitmq_management`（15672）；Docker 用 `*-management` 镜像即可，普通镜像或 yum/RPM 安装需 `rabbitmq-plugins enable`
- 本地跟练：`rabbitmq:3.13-management` 一条 `docker run` 即可，账号可用环境变量预置
- 服务器：优先官方 yum 仓库安装当前稳定版（约 4.3 + Erlang 27），`systemctl enable --now` 后启用管理插件并建管理员
- Queue 存消息，Exchange 路由消息，Binding 连接二者
- Connection / Channel 是客户端与 Broker 的通信层次

下一篇拆解完整的七步编程模型：声明 Exchange、Queue、Binding，发送与消费，以及 Push / Pull 两种模式。
