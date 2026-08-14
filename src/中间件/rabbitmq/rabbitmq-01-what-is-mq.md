---
title: "MQ 是什么？——从同步事件到异步消息"
sidebarGroup: "RabbitMQ"
shortTitle: "01 MQ 是什么与选型"
order: 1
date: 2026-08-26
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 1/22 篇**  
> 下一篇预告：[《RabbitMQ 安装部署——Docker 快速上手与数据持久化》](/中间件/rabbitmq/rabbitmq-02-install-concepts)

---

## 开头：订单下了，下游还在睡

电商大促零点，订单服务每秒涌入上万笔下单请求。如果每下一单就同步调用库存、积分、短信、风控四个服务，任何一个下游抖动都会拖垮主链路。

更常见的做法是：订单服务把「下单成功」这件事写成一条消息丢进队列，下游各自订阅、各自消费、各自重试。主流程只负责快速 ACK 用户，其余工作异步铺开。

这就是 **消息队列（Message Queue，MQ）** 要解决的问题——把进程内的事件驱动，延伸到跨进程、跨语言、跨服务的异步消息驱动。

---

## 一、什么是 MQ

MQ 即 **MessageQueue**，消息队列。可以拆成两部分理解：

| 概念 | 含义 |
|------|------|
| **Message（消息）** | 在不同应用程序之间传递的数据 |
| **Queue（队列）** | FIFO 先进先出的数据结构 |

把消息以队列形式暂存，再在应用之间传递，就构成了 MessageQueue。

MQ 最直接的作用，是把 **同步的事件驱动** 改为 **异步的消息驱动**。先用 Spring Boot 里已有的机制感受一下。

### 1.1 从 Spring 事件到消息驱动

搭建一个普通 Maven 项目，引入 Spring Boot 依赖：

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
        <version>2.4.5</version>
    </dependency>
</dependencies>
```

增加监听器：

```java
public class MyApplicationListener implements ApplicationListener<ApplicationEvent> {
    @Override
    public void onApplicationEvent(ApplicationEvent applicationEvent) {
        System.out.println("=====> MyApplicationListener: " + applicationEvent);
    }
}
```

启动类注册监听器并发布事件：

```java
@SpringBootApplication
public class AppDemo implements CommandLineRunner {
    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(AppDemo.class);
        application.addListeners(new MyApplicationListener());
        application.run(args);
    }

    @Resource
    private ApplicationContext applicationContext;

    @Override
    public void run(String... args) throws Exception {
        applicationContext.publishEvent(new ApplicationEvent("myEvent") {});
    }
}
```

不用额外配置，直接启动即可。Spring Boot 启动过程中会发布大量 `ApplicationEvent`，表示启动到了哪一步。

![Spring Boot 启动时 ApplicationEvent 发布与监听示意](/中间件/rabbitmq/12/p03-01.png)

从这个例子可以看到：

- **Producer（生产者）**：发布事件的 Spring Boot 框架本身
- **Consumer（消费者）**：`MyApplicationListener` 监听并处理事件

Producer 和 Consumer 的运行互不干涉——有没有 Consumer，Producer 照样发；有没有新消息，Consumer 照样监听。这种由消息驱动双方协作的方式，称为 **消息驱动**。

与之对比的是常见的 **事件驱动**：比如 Controller 方法，必须有一次 HTTP 请求主动触发才会执行。

![消息驱动与事件驱动的对比](/中间件/rabbitmq/12/p03-02.png)

Spring Boot 内部已经集成了消息驱动，但 Producer 和 Consumer 局限在 **同一进程**。若要跨进程、跨服务调用，就需要独立的中间服务来发布和接收消息——这就是 **MQ 中间件**。

典型场景：订单服务完成下单后发布「下单事件」，库存、积分、通知等下游各自消费，互不阻塞。

### 1.2 MQ 中间件的三项核心价值

| 价值 | 说明 |
|------|------|
| **解耦** | Producer 和 Consumer 只与中间件交互，不必互相感知。Producer 不必关心有几个 Consumer；Consumer 也不必关心 Producer 用什么语言实现 |
| **异步** | 消息先暂存于 MQ，Consumer 就绪后再拉取或推送处理，错开发送与消费的时间 |
| **削峰** | 当发送速度大于处理速度时，MQ 暂存消息，避免下游被瞬时流量压垮 |

---

## 二、主流 MQ 产品对比

MQ 发展多年，ZeroMQ、ActiveMQ 等早期产品已逐渐边缘化。目前最常用的是 **Kafka**、**RabbitMQ**、**RocketMQ**。

| 产品 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Kafka** | 吞吐量极大、性能优秀、技术生态完整 | 功能相对单一 | 分布式日志收集、大数据采集 |
| **RabbitMQ** | 消息可靠性高、功能全面 | 吞吐量较低；积压影响性能；Erlang 生态小众 | 企业内部系统调用 |
| **RocketMQ** | 高吞吐、高性能、高可用、高级功能齐全 | 技术生态相对不如 Kafka 完整 | 几乎全场景，尤其适合金融 |

![主流 MQ 产品选型对照](/中间件/rabbitmq/12/p04-01.png)

产品持续演进，理解也要跟上。**Apache Pulsar** 在大型企业海量系统调用场景也展现出很强竞争力——多租户、分层存储、统一消息模型，适合超大规模部署。

### 2.1 如何选型（简要）

- **日志型、高吞吐、可容忍少量丢失**：优先 Kafka
- **业务消息、路由灵活、可靠性优先**：优先 RabbitMQ
- **金融级、事务消息、顺序与延迟兼顾**：优先 RocketMQ
- **多数据中心、统一平台**：可评估 Pulsar

本系列聚焦 **RabbitMQ**——老牌、功能全、Spring 生态成熟，是企业内部消息通信的经典选择。

---

## 三、RabbitMQ 简介

RabbitMQ 历史可追溯到 **2005 年**，同期 ActiveMQ（2003）、ZeroMQ（2012）等已逐渐淡出，RabbitMQ 仍稳占一席之地。官网：[https://www.rabbitmq.com/](https://www.rabbitmq.com/)

当前 **3.13** 版本官网大改版，Quorum Queue、Stream Queue 等能力在 3.9.x 已成型，后续版本以修复增强和插件扩展为主，产品活力依然强劲。

RabbitMQ 基于 **Erlang/OTP** 开发，天生适合高并发、软实时、分布式场景。安装前需匹配 Erlang 版本——3.13 对应 Erlang **26.0 ~ 26.2.x**。

---

## 小结

| 要点 | 内容 |
|------|------|
| MQ 本质 | 消息 + 队列，跨应用异步传递数据 |
| 与 Spring 事件 | 同属消息驱动，MQ 把能力延伸到跨进程 |
| 三大价值 | 解耦、异步、削峰 |
| RabbitMQ 定位 | 可靠性高、功能全，适合企业内部系统调用 |

下一篇我们从安装与管理控制台入手，亲手创建 Queue、Exchange，理解 RabbitMQ 的核心组件。
