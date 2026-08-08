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

> **RabbitMQ 系列 · 第 2/10 篇**  
> 上一篇：[《MQ 是什么？——从同步事件到异步消息》](/中间件/rabbitmq/rabbitmq-01-what-is-mq)  
> 下一篇预告：[《RabbitMQ 基础编程模型——从连接到消费》](/中间件/rabbitmq/rabbitmq-03-programming-model)

---

## 开头：装好了，先别写代码

很多教程一上来就 `basicPublish`，结果连管理控制台长什么样、Queue 和 Exchange 谁存消息谁路由都不清楚。

本篇在 CentOS 上手动安装 RabbitMQ 3.13，启用管理插件，用 Web 控制台完成第一次收发，再用 Java 客户端验证 Connection / Channel——把核心概念落到操作上。

---

## 一、安装 RabbitMQ

### 1.1 前置环境

选用 **RabbitMQ 3.13**，建议 **CentOS 9**（至少 CentOS 8）。

RabbitMQ 依赖 Erlang，版本须严格对应。3.13 需要 Erlang **26.0 ~ 26.2.x**。

从官网下载对应安装包：

- Erlang（推荐 zero dependency 版）：[https://github.com/rabbitmq/erlang-rpm/releases](https://github.com/rabbitmq/erlang-rpm/releases)
- RabbitMQ Server：[https://github.com/rabbitmq/rabbitmq-server/releases](https://github.com/rabbitmq/rabbitmq-server/releases)

![RabbitMQ 与 Erlang 版本对应关系](/中间件/rabbitmq/12/p04-01.png)

### 1.2 安装 Erlang

```bash
rpm -ivh erlang-26.2.5.2-1.el9.x86_64.rpm
erl -version
# Erlang (SMP,ASYNC_THREADS) (BEAM) emulator version 14.2.5.2
```

### 1.3 安装 RabbitMQ

使用无依赖 RPM 包 `rabbitmq-server-3.13.6-1.el8.noarch.rpm`：

```bash
rpm -ivh rabbitmq-server-3.13.6-1.el8.noarch.rpm
```

![RabbitMQ RPM 安装过程](/中间件/rabbitmq/12/p05-01.png)

### 1.4 服务管理常用命令

| 命令 | 作用 |
|------|------|
| `service rabbitmq-server start` | 启动 RabbitMQ 服务 |
| `rabbitmq-server -detached` | 后台启动应用 |
| `rabbitmqctl start_app` | 启动 RabbitMQ 应用 |
| `rabbitmqctl stop` | 关闭 RabbitMQ |
| `rabbitmqctl status` | 查看状态（Runtime 表示成功） |

![rabbitmqctl status 启动成功示意](/中间件/rabbitmq/12/p06-01.png)

### 1.5 启用管理插件

```bash
rabbitmq-plugins enable rabbitmq_management
service rabbitmq-server start
rabbitmqctl start_app
```

重启后访问 **15672** 端口。默认用户 `guest/guest` 仅允许本机登录。

创建管理员账号：

```bash
rabbitmqctl add_user admin admin
rabbitmqctl set_permissions -p / admin "." "." ".*"
rabbitmqctl set_user_tags admin administrator
```

![管理控制台登录与 Overview 页面](/中间件/rabbitmq/12/p07-01.png)

![Admin 用户与 Virtual Host 管理](/中间件/rabbitmq/12/p07-02.png)

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

在 **Queues** 菜单创建名为 `test1` 的经典队列（Classic Queue）。

![创建 Classic 队列 test1](/中间件/rabbitmq/12/p08-01.png)

进入 `test1` 详情页，可直接 **Publish message** 和 **Get messages** 收发消息。

![在 Queue 详情页发送与消费消息](/中间件/rabbitmq/12/p08-02.png)

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

- 3.13 + Erlang 26.x，RPM 安装后启用 `rabbitmq_management`
- Queue 存消息，Exchange 路由消息，Binding 连接二者
- Connection / Channel 是客户端与 Broker 的通信层次

下一篇拆解完整的七步编程模型：声明 Exchange、Queue、Binding，发送与消费，以及 Push / Pull 两种模式。
