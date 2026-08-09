---
title: "RocketMQ 消息积压不用慌！Java 工程师实战指南：从应急止损到架构根治（含代码 + 面试考点）"
sidebarGroup: "鹏宇老师"
shortTitle: "RocketMQ 消息积压不用慌！Java 工程师实战指南：从应急止损到架构根治（含代码 + 面试考点）"
order: 1188
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "在 Java 后端开发中，RocketMQ 作为高频使用的消息中间件，“消息积压” 是生产环境绕不开的坑 —— 大促峰值流量冲垮消费端、慢 SQL 阻塞业务执行、下游接口超时导致消息堆积…… 这些问题轻则引发业务延迟，重则导致系统雪崩。更棘"
article: false
---

> 来源：[RocketMQ 消息积压不用慌！Java 工程师实战指南：从应急止损到架构根治（含代码 + 面试考点）](https://www.yuque.com/tulingzhouyu/db22bv/zzbbgvpbmuwym7tz)

在 Java 后端开发中，RocketMQ 作为高频使用的消息中间件，“消息积压” 是生产环境绕不开的坑 —— 大促峰值流量冲垮消费端、慢 SQL 阻塞业务执行、下游接口超时导致消息堆积…… 这些问题轻则引发业务延迟，重则导致系统雪崩。更棘手的是，面试时面试官还会追问 “怎么处理积压”，光说 “扩容” 根本拿不到高分。

本文将从**问题本质→临时应急→根因排查→长期根治**四个维度，结合 Java 代码示例，带你彻底掌握 RocketMQ 消息积压的解决方案，既搞定生产故障，又应对面试拷问。

## 一、先搞懂：消息积压的本质不是 “故障”，是 “常态”

很多开发者一遇到积压就慌，其实从 MQ 的设计初衷来看，**积压是 “削峰填谷” 的必然结果**——MQ 的核心价值就是承接峰值流量，让消费端按 “平稳速度” 处理，只要积压在业务可接受范围内（比如日志消息延迟 10 分钟无关紧要，支付消息延迟 10 秒致命），就无需处理。

![image](/面试题/高频面试问题/鹏宇老师/1188-rocketmq-message-backlog-java-guide/img-b3baa20a23ff.png)

### 1.1 如何判断积压是否需要处理？

两个核心标准，用 Java 代码可通过 RocketMQ Admin API 查询：

```java
// 1. 初始化Admin客户端
DefaultMQAdminExt admin = new DefaultMQAdminExt();
admin.setNamesrvAddr("127.0.0.1:9876"); // Namesrv地址
admin.start();

// 2. 查询Topic的队列消费情况（关键指标：积压数量=maxOffset - commitOffset）
Set&lt;MessageQueue&gt; queues = admin.fetchSubscribeMessageQueues("order_topic"); // 目标Topic
for (MessageQueue queue : queues) {
    // 队列最大Offset（总消息数）
    long maxOffset = admin.maxOffset(queue);
    // 消费者已提交的Offset（已消费数）
    long commitOffset = admin.queryConsumeOffset("order_consumer_group", queue, false);
    // 积压数量
    long backlog = maxOffset - commitOffset;
    System.out.printf("队列%s：积压数量=%d%n", queue.getQueueId(), backlog);
    
    // 3. 结合业务判断：是否需要处理
    boolean isNeedHandle = false;
    // 标准1：积压数量持续增长（比如5分钟内增长超过1万）
    long backlog5MinAgo = getHistoryBacklog(queue, 5); // 自定义方法：查询5分钟前积压
    if (backlog - backlog5MinAgo > 10000) {
        isNeedHandle = true;
    }
    // 标准2：延迟超过业务阈值（比如支付消息延迟>10秒）
    long delay = System.currentTimeMillis() - admin.viewMessageByOffset(queue, commitOffset).getStoreTimestamp();
    if (delay > 10 * 1000) { // 10秒
        isNeedHandle = true;
    }
}

admin.shutdown();
```

只有同时满足 “积压持续增长” 和 “延迟超阈值”，才需要启动处理流程。

### 1.2 定位问题：找到积压的核心诱因（关键！避免盲目操作）

确定需要处理积压后，**第一步不是 “扩容”，而是 “定位诱因”**—— 盲目操作可能导致下游雪崩（比如消费慢是因为数据库压力大，再扩消费者会让数据库更卡）。根据 PPT 中的定位逻辑，分三步精准排查：

![image](/面试题/高频面试问题/鹏宇老师/1188-rocketmq-message-backlog-java-guide/img-e89515007b21.png)

#### 步骤 1：明确业务场景 ——“哪类消息在积压？”

先搞清楚是哪个模块、哪类消息出了问题，不同场景优先级和处理方式完全不同：

- 核心业务消息（如支付回调、订单创建）：需紧急处理，优先级最高；
- 非核心消息（如日志同步、数据统计）：可暂缓处理，甚至丢弃部分过期消息；
- 实操方式：通过 RocketMQ 控制台查看 “各 Tag 消息的积压量”，或在代码中打印消息 Tag 进行筛选：

```java
// 消费逻辑中打印Tag，定位积压消息类型
consumer.registerMessageListener((list, context) -> {
    for (MessageExt msg : list) {
        String tag = msg.getTags();
        log.info("接收消息：Tag={}, MsgId={}", tag, msg.getMsgId());
        // 若某类Tag消息积压严重，可针对性处理（如单独扩容该Tag的消费者）
    }
    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
});
```

#### 步骤 2：检查上游流量 ——“是输入太多，还是处理太慢？”

通过监控工具（如 Prometheus+Grafana、RocketMQ 控制台）查看 Topic 的 “消息生产 TPS”，判断是否是上游流量异常：

- 场景 A：流量突增（如大促秒杀、定时任务批量推送）：

- 正常突增：后续需扩容 Queue 和消费者长期支撑；
- 异常突增（如爬虫攻击、重复请求）：需在生产者端加限流（见下文 2.1 代码）；

- 场景 B：流量正常，但积压持续：说明是消费端处理效率下降（见步骤 3）。

#### 步骤 3：评估消费速度 ——“消费端为什么处理慢？”

通过 RocketMQ 监控查看 “消费 TPS” 和 “消费延迟”，判断消费端是否正常：

- 消费 TPS 骤降：需排查消费逻辑（如慢 SQL、下游接口超时）；
- 消费 TPS 正常，但积压仍增长：说明生产 TPS > 消费 TPS，需提升消费能力（如扩容、调线程数）；
- 实操工具：用 SkyWalking 等链路追踪工具，查看单条消息的消费耗时分布（哪一步耗时最长）。

## 二、三步解决消息积压：从应急止损到架构根治

处理积压的核心逻辑是 “**先止损，再找根因，最后根治**”，避免盲目扩容导致下游雪崩。

### 第一步：临时应急 —— 快速消化积压，先保业务可用

当延迟已影响核心业务（比如支付消息积压），需先通过 “资源扩容 + 参数调优” 快速提升消费能力，这一步的目标是 “止损”。

#### 1.1 动态扩容消费者：注意 Queue 数量限制

RocketMQ 集群消费模式下，**1 个 MessageQueue 同一时间只能被 1 个消费者实例消费**（保证消息顺序性）。如果消费者数量超过 Queue 数量，多余实例会空闲。

![image](/面试题/高频面试问题/鹏宇老师/1188-rocketmq-message-backlog-java-guide/img-8d524f988f00.png)

![image](/面试题/高频面试问题/鹏宇老师/1188-rocketmq-message-backlog-java-guide/img-8ed12e2572c1.png)

**正确操作流程**（Java 代码示例）：

```java
/**
 * 步骤1：先动态增加MessageQueue数量（若Queue不足）
 * 比如：原2个Queue，需扩4个消费者，先将Queue增至4个
 */
public void increaseQueueNum(String topic, int targetQueueNum) throws Exception {
    DefaultMQAdminExt admin = new DefaultMQAdminExt();
    admin.setNamesrvAddr("127.0.0.1:9876");
    admin.start();
    // 查询当前Queue数量
    int currentQueueNum = admin.fetchSubscribeMessageQueues(topic).size();
    if (currentQueueNum < targetQueueNum) {
        // 动态增加Queue（只能增，不能减）
        admin.updateTopicQueueNum("DEFAULT_CLUSTER", topic, targetQueueNum);
        System.out.printf("Topic[%s] Queue数从%d增至%d%n", topic, currentQueueNum, targetQueueNum);
    }
    admin.shutdown();
}

/**
 * 步骤2：扩容消费者实例（代码层面新增消费者节点）
 */
public void scaleOutConsumer(String topic, String consumerGroup, int instanceNum) {
    // 实际生产中：通过K8s/HorizontalPodAutoscaler自动扩容实例
    // 本地测试：循环启动多个消费者实例
    for (int i = 0; i < instanceNum; i++) {
        new Thread(() -> {
            DefaultMQPushConsumer consumer = new DefaultMQPushConsumer(consumerGroup);
            consumer.setNamesrvAddr("127.0.0.1:9876");
            try {
                consumer.subscribe(topic, "*");
                // 批量消费：提升单实例吞吐量（默认1条/次，改为16条/次）
                consumer.setConsumeMessageBatchMaxSize(16);
                // 注册消费逻辑
                consumer.registerMessageListener((list, context) -> {
                    // 业务处理：注意幂等性（下文会讲）
                    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
                });
                consumer.start();
                System.out.printf("消费者实例[%s]启动成功%n", Thread.currentThread().getName());
            } catch (MQClientException e) {
                e.printStackTrace();
            }
        }).start();
    }
}
```

**关键技巧**：配合 “批量消费”（`setConsumeMessageBatchMaxSize(16)`），单实例吞吐量可提升 3-5 倍，因为减少了消息拉取的网络开销。

#### 1.2 临时提升消费线程数：只适合 IO 密集型场景

RocketMQ 消费者默认用 20 个线程处理消息，若消费逻辑是**IO 密集型**（比如查库、调下游接口），线程大部分时间在 “等待响应”，可临时提升线程数。

![image](/面试题/高频面试问题/鹏宇老师/1188-rocketmq-message-backlog-java-guide/img-9af6d3f98a2e.png)

**代码示例**（动态调整，无需重启）：

```java
/**
 * 动态调整消费线程数（4.5.0+版本支持）
 * @param consumerGroup 消费组
 * @param topic Topic名称
 * @param targetThreadNum 目标线程数（建议8核CPU设40-80）
 */
public void updateConsumeThreadNum(String consumerGroup, String topic, int targetThreadNum) throws Exception {
    DefaultMQAdminExt admin = new DefaultMQAdminExt();
    admin.setNamesrvAddr("127.0.0.1:9876");
    admin.start();
    // 动态更新线程数
    admin.updateConsumeThreadNums(consumerGroup, topic, targetThreadNum);
    System.out.printf("消费组[%s]线程数调整为%d%n", consumerGroup, targetThreadNum);
    admin.shutdown();
}
```

**注意**：若消费逻辑是 CPU 密集型（比如大量 JSON 解析、计算），提升线程数会导致上下文切换开销剧增，反而降低效率。

### 第二步：根因排查 —— 找到 “为什么积压”，避免复发

临时扩容只能救急，若不找到根因，积压会反复出现。常见根因分两类：**上游流量突增**和**消费效率下降**。

#### 2.1 排查上游：是否是流量突增？

通过 RocketMQ 监控（如 Prometheus+Grafana）查看 Topic 的 “消息生产 TPS”，若短时间内 TPS 翻倍（比如大促、定时任务），需判断是否是 “正常业务流量”：

- 正常流量：后续可通过 “扩容 Queue + 消费者” 长期支撑；
- 异常流量（如爬虫、重复请求）：需在生产者端加限流（代码示例）：

```java
// 生产者端限流：基于Guava RateLimiter
RateLimiter rateLimiter = RateLimiter.create(1000.0); // 1秒1000条
DefaultMQProducer producer = new DefaultMQProducer("order_producer_group");
producer.setNamesrvAddr("127.0.0.1:9876");
producer.start();

for (Order order : orderList) {
    // 限流：若超过速率，阻塞等待
    rateLimiter.acquire();
    // 发送消息
    Message msg = new Message("order_topic", JSON.toJSONBytes(order));
    producer.send(msg);
}
```

#### 2.2 排查下游：消费效率为什么下降？

若上游流量正常，但消费 TPS 下降，需重点排查 3 个问题，每个问题都有对应的 Java 代码优化方案。

![image](/面试题/高频面试问题/鹏宇老师/1188-rocketmq-message-backlog-java-guide/img-1b51266652ec.png)

**根因**
**排查方法**
**Java 代码优化示例**

慢 SQL
查看数据库慢查询日志
1. 加索引；2. 分库分表；3. 预编译 SQL（MyBatis 示例）

缓存失效
查看缓存命中率（如 Redis 监控）
1. 修复缓存过期策略；2. 缓存预热（启动时加载热点数据）

下游接口超时
查看接口调用日志（如 SkyWalking 链路追踪）
1. 加超时时间（OkHttp 示例）；2. 异步调用；3. 降级非核心接口

**示例 1：慢 SQL 优化（MyBatis 预编译 + 索引）**

```java
// 原慢SQL：无索引，且每次拼接SQL
String sql = "select * from order where user_id = " + userId; // 风险：SQL注入+无索引

// 优化后：1. 加索引（user_id）；2. 预编译
@Select("select * from order where user_id = #{userId}")
List&lt;Order&gt; getOrderByUserId(@Param("userId") Long userId); // MyBatis预编译，避免SQL注入
```

**示例 2：下游接口超时处理（OkHttp 加超时 + 重试）**

```java
OkHttpClient client = new OkHttpClient.Builder()
        .connectTimeout(2, TimeUnit.SECONDS) // 连接超时2秒
        .readTimeout(3, TimeUnit.SECONDS)    // 读取超时3秒
        .retryOnConnectionFailure(true)      // 连接失败重试
        .build();

// 调用下游接口
Request request = new Request.Builder().url("http://api.payment.com/callback").build();
try (Response response = client.newCall(request).execute()) {
    if (response.isSuccessful()) {
        // 处理成功
    } else {
        // 记录日志，后续补偿
        log.error("下游接口调用失败，状态码：{}", response.code());
    }
} catch (IOException e) {
    log.error("下游接口超时", e);
    // 重试1次（避免重试风暴）
    retryCall(client, request);
}
```

### 第三步：长期根治 —— 从架构上避免积压，而非 “事后补救”

临时应急和根因排查是 “解决问题”，而架构优化是 “避免问题”。这里推荐 Java 后端最常用的 “**本地落地 + 异步执行**” 方案，彻底解耦 MQ 消费与业务执行。

#### 3.1 方案原理

核心逻辑：将 “MQ 消息接收” 与 “业务执行” 拆分为两个独立流程，MQ 只负责 “接收消息并落地”，业务执行由本地线程和定时任务处理，从源头避免 MQ 堆积。

![image](/面试题/高频面试问题/鹏宇老师/1188-rocketmq-message-backlog-java-guide/img-a3403856bde5.png)

#### 3.2 完整 Java 代码实现

##### 步骤 1：创建本地消息表（MySQL）

```sql
CREATE TABLE `local_message` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `msg_id` varchar(64) NOT NULL COMMENT 'MQ消息ID（唯一）',
  `topic` varchar(64) NOT NULL COMMENT 'MQ Topic',
  `msg_body` text NOT NULL COMMENT '消息内容',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '状态：0-待处理，1-处理中，2-处理成功，3-处理失败',
  `retry_count` int NOT NULL DEFAULT '0' COMMENT '重试次数',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_msg_id` (`msg_id`),
  KEY `idx_status_create_time` (`status`,`create_time`) COMMENT '查询待处理消息'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT '本地消息表';
```

##### 步骤 2：MQ 消费者接收消息并落地

```java
/**
 * MQ消费者：只负责接收消息，落地到本地表，立即ACK
 */
public class LocalMessageConsumer {
    @Autowired
    private LocalMessageMapper localMessageMapper;

    public void start() throws MQClientException {
        DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("local_message_consumer_group");
        consumer.setNamesrvAddr("127.0.0.1:9876");
        consumer.subscribe("order_topic", "*");
        
        consumer.registerMessageListener((list, context) -> {
            for (MessageExt msg : list) {
                try {
                    // 1. 消息落地本地表（用事务保证：写表成功才ACK）
                    LocalMessage localMsg = new LocalMessage();
                    localMsg.setMsgId(msg.getMsgId());
                    localMsg.setTopic(msg.getTopic());
                    localMsg.setMsgBody(new String(msg.getBody()));
                    localMsg.setStatus(0); // 0-待处理
                    localMessageMapper.insert(localMsg);
                    
                    // 2. 立即ACK：告诉MQ消息已处理，避免堆积
                    context.setAckIndex(list.indexOf(msg));
                } catch (Exception e) {
                    log.error("消息落地失败，msgId:{}", msg.getMsgId(), e);
                    // 落地失败：返回重试，避免消息丢失
                    return ConsumeConcurrentlyStatus.RECONSUME_LATER;
                }
            }
            return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
        });
        
        consumer.start();
        System.out.println("本地消息消费者启动成功");
    }
}
```

##### 步骤 3：异步线程处理本地消息

```java
/**
 * 异步线程池：从本地表读取待处理消息，执行业务逻辑
 */
@Component
public class LocalMessageProcessor {
    @Autowired
    private LocalMessageMapper localMessageMapper;
    @Autowired
    private OrderService orderService; // 业务服务

    // 线程池：核心线程数=CPU核心数*2，避免资源浪费
    private ExecutorService executor = new ThreadPoolExecutor(
            Runtime.getRuntime().availableProcessors() * 2,
            Runtime.getRuntime().availableProcessors() * 4,
            60, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(1000),
            new ThreadFactoryBuilder().setNameFormat("local-message-processor-%d").build()
    );

    // 启动异步处理（项目启动时调用）
    @PostConstruct
    public void startProcess() {
        // 每1秒拉取一次待处理消息
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(() -> {
            // 1. 批量拉取待处理消息（状态0，且重试次数<3）
            List&lt;LocalMessage&gt; messages = localMessageMapper.selectByStatusAndRetryCount(0, 3);
            if (CollectionUtils.isEmpty(messages)) {
                return;
            }
            
            // 2. 异步处理每条消息
            for (LocalMessage msg : messages) {
                executor.submit(() -> processMessage(msg));
            }
        }, 0, 1, TimeUnit.SECONDS);
    }

    // 处理单条消息
    private void processMessage(LocalMessage msg) {
        // 1. 更新消息状态为“处理中”（避免重复处理）
        localMessageMapper.updateStatusById(msg.getId(), 1);
        try {
            // 2. 执行业务逻辑（比如订单支付回调）
            OrderCallbackDTO dto = JSON.parseObject(msg.getMsgBody(), OrderCallbackDTO.class);
            orderService.handlePaymentCallback(dto);
            
            // 3. 处理成功：更新状态为2
            localMessageMapper.updateStatusById(msg.getId(), 2);
        } catch (Exception e) {
            log.error("消息处理失败，id:{}", msg.getId(), e);
            // 4. 处理失败：重试次数+1，状态仍为0（后续继续处理）
            localMessageMapper.increaseRetryCountAndResetStatus(msg.getId());
        }
    }
}
```

##### 步骤 4：定时任务补偿失败消息

```java
/**
 * 定时任务：处理“处理失败”或“超时未处理”的消息（最终保障）
 */
@Component
public class LocalMessageCompensator {
    @Autowired
    private LocalMessageMapper localMessageMapper;
    @Autowired
    private LocalMessageProcessor localMessageProcessor;

    // 每5分钟执行一次（cron表达式：0 0/5 * * * ?）
    @Scheduled(cron = "0 0/5 * * * ?")
    public void compensateFailedMessage() {
        // 1. 拉取：状态0但创建时间>30分钟（超时），或状态3（处理失败）且重试次数<3
        List&lt;LocalMessage&gt; messages = localMessageMapper.selectCompensateMessages();
        if (CollectionUtils.isEmpty(messages)) {
            return;
        }
        
        // 2. 重新提交处理
        for (LocalMessage msg : messages) {
            localMessageProcessor.getExecutor().submit(() -> 
                localMessageProcessor.processMessage(msg)
            );
        }
        log.info("定时补偿：提交{}条失败消息", messages.size());
    }
}
```

#### 3.3 方案优势

1. **彻底避免 MQ 堆积**：MQ 只负责 “接收 + 落地”，立即 ACK，业务执行不影响 MQ；
2. **消息可靠性高**：本地表持久化，即使业务服务宕机，重启后可通过定时任务补处理；
3. **重试可控**：避免 MQ 自带的 “重试风暴”，可自定义重试次数和间隔；
4. **易于监控**：通过本地表状态可直观查看消息处理进度，方便排查问题。

## 三、面试高频追问：这些细节决定你是否能拿 offer

面试官问 “消息积压怎么处理”，不会只听你讲方案，更会追问细节，以下是 3 个高频考点及参考答案。

![image](/面试题/高频面试问题/鹏宇老师/1188-rocketmq-message-backlog-java-guide/img-e9ebb406c2ea.png)

### 3.1 问：动态增加 Queue 后，历史积压消息会自动分配到新 Queue 吗？

答：不会。新 Queue 只会接收 “新增消息”（按轮询策略），历史积压仍在原 Queue 中。需手动转发历史消息到新 Queue，Java 代码示例：

```java
/**
 * 手动转发原Queue的历史积压到新Queue
 */
public void forwardHistoryMessage(String topic, List&lt;Integer&gt; originQueueIds, List&lt;Integer&gt; newQueueIds) throws Exception {
    DefaultMQAdminExt admin = new DefaultMQAdminExt();
    admin.setNamesrvAddr("127.0.0.1:9876");
    admin.start();
    
    // 1. 初始化生产者（用于发送到新Queue）
    DefaultMQProducer producer = new DefaultMQProducer("forward_producer_group");
    producer.setNamesrvAddr("127.0.0.1:9876");
    producer.start();
    
    // 2. 遍历原Queue，拉取历史消息
    for (int queueId : originQueueIds) {
        MessageQueue originQueue = new MessageQueue(topic, "DEFAULT_BROKER", queueId);
        // 获取已消费Offset（从已消费位置开始拉取未消费消息）
        long commitOffset = admin.queryConsumeOffset("order_consumer_group", originQueue, false);
        long maxOffset = admin.maxOffset(originQueue);
        
        DefaultMQPullConsumer pullConsumer = new DefaultMQPullConsumer("forward_pull_group");
        pullConsumer.setNamesrvAddr("127.0.0.1:9876");
        pullConsumer.start();
        
        long nextOffset = commitOffset;
        while (nextOffset < maxOffset) {
            // 批量拉取消息
            PullResult result = pullConsumer.pullBlockIfNotFound(originQueue, "*", nextOffset, 32);
            if (result.getMsgFoundList() == null) {
                break;
            }
            
            // 3. 转发到新Queue（按msgId哈希，保证同一消息只转发一次）
            for (MessageExt msg : result.getMsgFoundList()) {
                int targetQueueId = newQueueIds.get(Math.abs(msg.getMsgId().hashCode()) % newQueueIds.size());
                MessageQueue targetQueue = new MessageQueue(topic, "DEFAULT_BROKER", targetQueueId);
                
                // 发送消息到新Queue
                Message forwardMsg = new Message(topic, msg.getTags(), msg.getKeys(), msg.getBody());
                producer.send(forwardMsg, targetQueue);
                System.out.printf("消息%s从Queue%d转发到Queue%d%n", msg.getMsgId(), queueId, targetQueueId);
            }
            
            nextOffset = result.getNextBeginOffset();
        }
        pullConsumer.shutdown();
    }
    
    producer.shutdown();
    admin.shutdown();
}
```

### 3.2 问：如何保证 “本地落地 + 异步执行” 方案的消息不重复处理？

答：需做两层幂等保障：

1. **写入本地表时**：用 MQ 的`msgId`作为唯一键（`uk_msg_id`），避免重复写入；
2. **业务执行时**：用业务唯一键（如订单号）判断是否已处理，示例：

```java
// 业务处理幂等性：根据订单号判断是否已处理
public void handlePaymentCallback(OrderCallbackDTO dto) {
    // 1. 查库判断订单是否已处理
    Order order = orderMapper.selectByOrderNo(dto.getOrderNo());
    if (order != null && order.getStatus() == 2) { // 2-已支付
        log.info("订单{}已处理，跳过", dto.getOrderNo());
        return;
    }
    
    // 2. 未处理：执行业务逻辑（更新订单状态、通知物流等）
    orderMapper.updateStatusByOrderNo(dto.getOrderNo(), 2);
    logisticsService.notifyLogistics(dto.getOrderNo());
}
```

### 3.3 问：DLedger 集群（3 主）下，新建 Topic 默认有多少个 Queue？如何动态调整？

答：DLedger 集群下，Topic 默认 Queue 数 = 单主节点默认 Queue 数 × 主节点数。RocketMQ 单主节点默认 Queue 数为 4（`defaultTopicQueueNums=4`），3 主集群默认总 Queue 数 = 4×3=12 个。

动态调整 Queue 数的 Java 代码与普通集群一致（见第一步 “动态扩容消费者” 中的`increaseQueueNum`方法），DLedger 模式只影响数据一致性，不改变 Queue 分配逻辑。

## 四、总结

处理 RocketMQ 消息积压，不是 “堆资源” 这么简单，而是一个 “**判断→应急→排查→根治**” 的完整流程：

1. 判断：先看延迟是否可接受、积压是否持续增长；
2. 应急：扩 Queue + 消费者、调线程数、批量消费，快速止损；
3. 排查：上游流量突增要限流，下游效率下降要优化 SQL / 缓存 / 接口；
4. 根治：用 “本地落地 + 异步执行” 解耦 MQ 与业务，从架构上避免积压。

【此处插入 PPT 截图 8：总结页（核心观点：控制积压在业务可接受范围，从临时到架构优化）】

掌握这套流程，既能搞定生产故障，又能在面试中脱颖而出 —— 毕竟，面试官要的不是 “会扩容” 的执行者，而是 “懂原理、能设计” 的工程师。
