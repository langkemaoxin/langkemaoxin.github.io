---
title: "RocketMQ 学习总纲：零基础到资深专家的完整教学大纲"
sidebarGroup: "RocketMQ"
shortTitle: "00 学习总纲"
order: 0
date: 2026-08-24
category: "中间件"
tag:
  - "RocketMQ"
  - "中间件"
  - "消息队列"
  - "学习路线"
description: "以西蒙学习法拆碎 RocketMQ 5.x 全领域：MQ 地基 → 部署与架构 → 六种消息类型 → 三种消费模型 → 存储深水区（CommitLog/零拷贝）→ 源码攻坚 → DLedger/Controller 高可用 → 运维调优 → AI 新特性（LiteTopic/RStream）。十个阶段、40+ 知识单元，每单元带动手实验与验收标准，已有 10 篇实战文作为锚点，总周期约 14 周。"
---

> **中间件 · RocketMQ · 学习路线 · 总纲第 1 篇**  
> 本文是 RocketMQ 领域的**完整教学大纲**：先定义「学成什么样算资深」，再把整个领域拆成可以逐个吃掉的小单元。本目录已有的 10 篇快速实战系列（基于 5.3.0）被吸收为大纲的**前半程锚点**，缺口单元按大纲逐篇补齐。

---

## 开头：为什么 RocketMQ 特别需要一份大纲？

因为这个领域的知识点**互相咬合得特别紧**：

- 学消费重试，一半的机制（%RETRY% 队列、分级延迟）长在**定时消息的时间轮**上；
- 学事务消息的回查，绕不开 **half topic 的存储设计**；
- 学集群高可用，前置是 **Raft 共识**（DLedger、Controller 都建在它上面）；
- 评价这一切的标尺，是**存储模型**——单一 CommitLog 顺序写决定了 RocketMQ 的性能边界，也决定了它和 Kafka 的分野。

没有路线图的学习是这样的：看消费重试 → 搜到 4.x 的 18 级延迟文章 → 又被 ScheduleMessageService 和 5.x TimerWheel 两套实现绕晕 → 转去翻源码 → 发现还缺 Raft 背景 → 每个知识点都指向另一个知识点，**学到哪都是黑洞，而且一半资料还是 4.x 时代的**。

这份大纲要做的事就一件：**把这些互相咬合的知识点排成一条单向的线**——每个单元只依赖前面的单元，学完一个，就扎实一个。这就是西蒙学习法在这个领域的落地方式。

---

## 一、学成什么样，才算「资深」？

先立靶子。学完本大纲，你应具备五项能力：

| # | 能力 | 具体表现 |
|---|------|----------|
| 1 | **讲得清** | 能用「单一 CommitLog 顺序写 + ConsumeQueue 索引」解释 RocketMQ 为什么在万级 Topic 下还能稳，以及它和 Kafka 存储模型的本质差异 |
| 2 | **选得对** | 给定业务场景（日志采集 / 交易链路 / 延迟任务 / 海量会话），能在 Kafka、RabbitMQ、RocketMQ 之间选出并说出为什么 |
| 3 | **写得出** | 普通、顺序、延迟/定时、事务、批量五种消息，Push、Pull、Pop 三种消费模型，都能写出生产级代码（含幂等、重试、轨迹） |
| 4 | **读得懂** | 发送、存储、消费、重平衡、事务回查五条源码链路能追到「类名级别」，知道断点打在哪 |
| 5 | **修得了** | 丢消息、重复消费、消费堆积、主从切换失败、刷盘超时这类线上故障，能定位、能修复、能预防 |

注意「资深」的定义里**没有**「背会所有参数」——参数查文档就行，判断力才是资深的分水岭。

---

## 二、西蒙学习法在本领域的四个落法

西蒙学习法的核心：**把领域拆碎成小单元，连续地、单点聚焦地逐个吃掉，每个单元立刻获得反馈**。对应到本大纲：

1. **拆碎**：每个知识单元控制在 0.5 ~ 2 天内可完成，绝不出现「学 RocketMQ 存储」这种大块头，只有「追一遍消息从 Producer 到 CommitLog 落盘的调用链」这种小块。
2. **单点聚焦**：一次只学一个单元。学消费重试的时候不要顺手去翻 Raft——忍住，它排在后面，到时候再看。
3. **及时反馈**：每个单元都配**动手实验**和**吃透的标准**。实验跑不通 = 没学会，不进入下一单元。
4. **连续推进**：每天 1.5 ~ 2 小时，每周 5 ~ 6 天，连续推进约 14 周。中断两周以上，从当前阶段的第一个单元重头来。

### 学习环境清单（开工前一次备齐）

| 工具 | 版本建议 | 用途 |
|------|----------|------|
| JDK | 17 | 全部 Java 代码与源码调试（5.x 源码编译与 Spring Boot 3 均友好） |
| Apache RocketMQ | **5.3.4**（2025-11 发布，教学主线）；**5.5.0**（2026-04，仅前沿阶段） | 阶段 1 起全程使用 |
| rocketmq-spring-boot-starter | 2.3.3（2026-03 发布） | 阶段 4 工程化 |
| Spring Boot | 3.x | 实战项目骨架 |
| Docker / Docker Compose | — | 集群搭建与故障演练 |
| Prometheus + Grafana | 最新稳定版 | 阶段 8 监控 |
| IDEA / Maven 3.8+ | — | 源码攻坚 |
| 机器资源 | 4C8G 起步（WSL2 亦可） | 3 节点 DLedger 演练需要 |

> **版本说明（重要）**：本目录已有的 10 篇实战系列基于 5.3.0，与本大纲 5.3.4 同属 5.3 稳定线，结论通用。查资料时注意甄别 **4.x 时代文章**：凡是用 `DefaultMQProducer` / `DefaultMQPushConsumer`、讲 18 个固定延迟级别的，都是旧 remoting 客户端语境——它仍在维护、生产也在用，但 5.x 的正解是 **gRPC 新客户端 + Proxy 架构**，本大纲两代都会讲清楚、且明确标注代际。

---

## 三、知识全景图

十个阶段 + 一个毕业设计，总周期约 **14 周**：

| 阶段 | 主题 | 回答的核心问题 | 周期 |
|------|------|----------------|------|
| 0 | 地基：消息世界观 | MQ 到底解决什么问题？RocketMQ 在 MQ 谱系里站哪？ | 0.5 周 |
| 1 | 跑起来：部署与架构全景 | 一条消息要经过哪些角色？5.x 的 Proxy 是干什么的？ | 0.5 周 |
| 2 | 生产者：六种消息类型 | 普通、顺序、延迟、事务、批量、过滤，各自怎么发、防什么坑？ | 2 周 |
| 3 | 消费者：三种消费模型 | Push / Pull / Pop 差在哪？重试、死信、重平衡怎么咬合？ | 1.5 周 |
| 4 | 工程化：Spring 与生产配置 | 真实项目里怎么接？轨迹、ACL、参数怎么配？ | 1 周 |
| 5 | 存储深水区 | 磁盘上有哪些文件？为什么顺序写 + 零拷贝就快？ | 2 周 |
| 6 | 源码攻坚 | 五条核心链路的类名级调用链 | 2 周 |
| 7 | 高可用：DLedger 与 Controller | 主从、Raft、Controller 怎么组合出自动切换？ | 1.5 周 |
| 8 | 运维调优：生产环境 | 监控、排障、调优、扩缩容怎么做？ | 1.5 周 |
| 9 | 前沿与生态 | 多协议、流处理、AI 场景（LiteTopic / RStream） | 1 周 |
| 10 | 毕业：选型 + 综合实战 | 真实系统里怎么用对、用好？ | 1 周 |

**顺序设计的三个关键决定**，先说透，免得学到一半怀疑路线：

1. **消息类型全部排在消费模型之前**：先会把六种消息「发出去」，再学怎么「消费好」——顺序、事务、延迟消息的消费端语义（队列锁、回查、时间轮）都以「见过消息长什么样」为前提。
2. **存储排在源码之前**：RocketMQ 源码的一半类名（CommitLog、ConsumeQueue、MappedFileQueue、TimerWheel）就是存储文件的名字。先在磁盘上亲眼见过这些文件，读源码才不是在天书里猜。
3. **运维调优排在高可用之后**：故障排查（主从切换失败、脑裂、刷盘超时）的前提是见过集群的正常形态与故障形态；而「丢消息五环节定位法」要用到前面所有阶段的knowledge。

**与站内已有系列的衔接**：

- 阶段 0 的 MQ 通识，[RabbitMQ 系列](/中间件/rabbitmq/rabbitmq-01-what-is-mq)已详细讲过，学过可直接跳到 0.3；
- 事务消息与幂等消费，[分布式 · 可靠消息](/分布式/message/message-03-rocketmq-tx)两篇已深入覆盖，本大纲将其吸收为锚点；
- 本目录已有的 10 篇 5.3.0 实战文（下表中标 ✅ 的单元）是前半程的现成教材，**读现成文章也算完成该单元**，验收标准照做即可。

---

## 四、阶段 0：地基——消息世界观（第 1 周前半）

**为什么有这个阶段**：零基础直接装 RocketMQ，只会得到一个「能跑但不知道为什么存在」的中间件。先把 MQ 的共性问题和 RocketMQ 的个性定位讲清楚，后面每个特性才有挂靠点。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 0.1 MQ 解决什么问题 | 异步、解耦、削峰各自的收益与代价（一致性复杂化、消息重复）？ | — | 能各举一个自己业务里的例子，并说出引入 MQ 后新增的三个问题 | ✅ [RabbitMQ 01](/中间件/rabbitmq/rabbitmq-01-what-is-mq) |
| 0.2 消息模型与投递语义 | 点对点 vs 发布订阅；at-least-once + 幂等消费为什么等于「效果恰好一次」？ | — | 能说清「投递语义」和「效果语义」的区别 | ✅ [RabbitMQ 03/05](/中间件/rabbitmq/rabbitmq-03-programming-model)、[分布式 message-04](/分布式/message/message-04-idempotent-consume) |
| 0.3 RocketMQ 的谱系定位 | 同为 MQ，Kafka / RabbitMQ / RocketMQ 的出身、存储模型、适用场景各是什么？为什么电商交易链路偏爱 RocketMQ？ | — | 能用三句话说清「什么场景不该选 RocketMQ」 | 📝 待补新篇 |

**阶段验收**：口述——「如果我有一个日志采集系统和一条订单交易链路，分别选什么 MQ，为什么」。

---

## 五、阶段 1：跑起来——部署与架构全景（第 1 周后半）

**为什么有这个阶段**：先让肌肉有记忆，再让大脑有抽象。本地跑通一条消息的全旅程，之后每个原理单元都有实验环境可回。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 1.1 单机部署与第一条消息 | NameServer + Broker 怎么配合启动？mqadmin 和 Dashboard 能看什么？ | Docker 起 5.3.4，用控制台收发一条消息，Dashboard 里观察 Topic / Consumer | 能画出这条消息经过的角色 | ✅ [RocketMQ 01](/中间件/rocketmq/rocketmq-01-quickstart) |
| 1.2 架构三角色与消息模型 | NameServer / Broker / Producer-Consumer 各管什么？Topic 与 MessageQueue 什么关系？ | — | 能解释「一个 Topic 有 8 个 Queue」意味着什么 | ✅ [RocketMQ 02](/中间件/rocketmq/rocketmq-02-architecture) |
| 1.3 4.x vs 5.x：Proxy 与无状态化 | 5.0 为什么引入 Proxy（Local / Cluster 两种模式）？gRPC 新客户端和 remoting 旧客户端什么关系？ | 用 Local 模式与 Cluster 模式各起一次 Proxy，观察端口与进程形态 | 能说清「5.x 完全兼容 4.x 极简架构」这句话的含义 | ✅ [RocketMQ 02](/中间件/rocketmq/rocketmq-02-architecture)（补 5.x 速览：[官方 5.0 速览](https://rocketmq.apache.org/version/)） |

**阶段验收**：脱稿画出 5.x Cluster 模式下「Producer → Proxy → Broker → Consumer」的完整拓扑，并标出 NameServer 被谁访问、何时访问。

---

## 六、阶段 2：生产者——六种消息类型（第 2 ~ 3 周）

**为什么有这个阶段**：消息类型是 RocketMQ 的「业务价值层」——顺序、延迟、事务三种消息是它区别于 Kafka 的核心卖点，也是面试与实战的最高频区。这里只学「怎么发对」，消费端语义留给阶段 3。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 2.1 发送模型与两代客户端 | 同步 / 异步 / 单向发送差在哪？remoting 的 `DefaultMQProducer` 与 gRPC 新客户端 `Producer` 怎么选？ | 分别用两代客户端发同步消息，抓包（或日志）对比协议 | 能说出新客户端为什么统一走 Proxy | ✅ [RocketMQ 03](/中间件/rocketmq/rocketmq-03-client-model)（gRPC 部分待补） |
| 2.2 顺序消息 | 全局顺序和分区顺序差在哪？`MessageQueueSelector` 怎么保证同一订单进同一队列？ | 同一 orderId 发 5 条消息到同一队列，消费端乱序消费一次（换队列）作对照 | 能说清为什么全局顺序在分布式下基本不可用 | ✅ [RocketMQ 03](/中间件/rocketmq/rocketmq-03-client-model)（概览，深挖待补） |
| 2.3 延迟 / 定时消息 | 4.x 的 18 个固定级别和 5.x 的任意时刻定时，底层实现差在哪？ | 分别发一条「30 秒后投递」，用 Dashboard 观察投递时间；5.x 试最大定时上限 | 能说出定时消息对堆积与磁盘的影响 | ✅ [RocketMQ 08](/中间件/rocketmq/rocketmq-08-delay-longpolling) |
| 2.4 事务消息 | half message → 本地事务 → commit / rollback → 回查，四环怎么咬合？ | 本地事务里 sleep 模拟超时，观察 Broker 回查；rollback 后验证 half 消息从未投递 | 能画出全时序图并标出回查兜底位置 | ✅ [分布式 message-03](/分布式/message/message-03-rocketmq-tx) + [RocketMQ 03](/中间件/rocketmq/rocketmq-03-client-model) |
| 2.5 批量与压缩 | 批量发送的限制（同一 Topic、非延迟、总大小）？什么时候开压缩？ | 单条 vs 批量各压测一轮，对比 TPS 与 CPU | 能说出批量对顺序语义的影响 | ✅ [RocketMQ 03](/中间件/rocketmq/rocketmq-03-client-model)（部分，待补） |
| 2.6 消息过滤 | Tag、属性、SQL92 过滤分别在哪个环节执行？BloomFilter 加速的是什么？ | 消费端分别按 Tag 与 SQL92 订阅，对比服务端过滤的投递量 | 能说清服务端过滤与客户端过滤的分界 | ✅ [RocketMQ 03](/中间件/rocketmq/rocketmq-03-client-model)（概览，深挖待补） |

**阶段验收**：写一个「订单超时未支付自动取消」demo——下单发事务消息（本地事务写订单表），支付回调正常则 commit；30 分钟未支付由定时消息触发取消并回补库存。

---

## 七、阶段 3：消费者——三种消费模型与消费语义（第 4 周 ~ 第 5 周前半）

**为什么有这个阶段**：生产环境的故障 80% 发生在消费端——堆积、重复、超时、重平衡风暴。三种消费模型（Push / Pull / Pop）的选择，本质是「谁来管位点、谁来扛慢消费」的取舍。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 3.1 Push / Pull / Pop 三种模型 | Push 为什么是「推拉结合 + 长轮询」？Pop 消费为什么把位点挪到 Broker 端？ | 用旧客户端 Push 消费，再观察其内部 Pull 调用日志 | 能解释 Pop 对「慢消费者拖垮队列」的解法 | ✅ [RocketMQ 06](/中间件/rocketmq/rocketmq-06-send-consume-lb)、[08 长轮询](/中间件/rocketmq/rocketmq-08-delay-longpolling)；📝 Pop 专篇待补 |
| 3.2 5.x 新消费者与 Pop Ack | gRPC 的 `SimpleConsumer` / `PushConsumer` 怎么用？Pop 的 Ack 机制（ invisible 时间、revive 队列）怎么保证不丢？ | 用新客户端消费，故意不 Ack，观察 invisibility 超时后重新投递 | 能说清 Pop「借用而非删除」的位点语义 | 📝 待补新篇 |
| 3.3 重平衡 | 队列怎么在消费者间分配？平均分配、一致性哈希等策略差在哪？重平衡风暴怎么发生？ | 同一消费组起 3 个消费者，kill 一个，观察队列接管时间线 | 能画出消费者上下线触发重平衡的时序 | ✅ [RocketMQ 06](/中间件/rocketmq/rocketmq-06-send-consume-lb) |
| 3.4 消费重试与死信 | 重试为什么是「先退回 %RETRY% 队列 + 分级延迟」？重试次数用尽后 %DLQ% 怎么兜底？ | 消费端抛异常 16 次，Dashboard 里看 RETRY → DLQ 的完整迁移 | 能说出广播模式为什么没有重试 | 📝 待补新篇 |
| 3.5 幂等消费 | 为什么要幂等？去重表、唯一索引、状态机三种方案各适合什么？ | 消费端用消息 key 唯一索引实现幂等，人为重投验证 | 说清「至少一次投递 + 幂等消费 = 恰好一次效果」 | ✅ [分布式 message-04](/分布式/message/message-04-idempotent-consume) |
| 3.6 消费进度与广播 | 集群消费和广播消费的 Offset 存储位置差在哪？消费位点存在哪、怎么重置？ | 广播模式消费一批，验证重启后不重复；Dashboard 重置 Offset | 能说出重置 Offset 的业务场景（跳过坏消息） | ✅ [RocketMQ 03](/中间件/rocketmq/rocketmq-03-client-model)（部分） |

**阶段验收**：故意制造「一条毒消息导致消费无限失败」——观察 RETRY 队列的延迟节奏，最后进 DLQ，写一条 DLQ 人工处理流程。

---

## 八、阶段 4：工程化——Spring 与生产配置（第 5 周后半）

**为什么有这个阶段**：业务代码不裸用客户端。starter 的注解模型、轨迹、ACL 与参数 defaults，决定这套代码能不能过公司评审。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 4.1 rocketmq-spring-boot-starter | `@RocketMQMessageListener` 的消费模型是哪种？事务监听怎么写？2.3.x 对 Boot 3 的支持？ | Boot 3 + starter 2.3.3 搭收发 + 事务 demo | 能说出注解各属性对应客户端的哪个参数 | ✅ [RocketMQ 04](/中间件/rocketmq/rocketmq-04-springboot-tips) |
| 4.2 消息轨迹与 ACL | 轨迹 Topic 记录了什么、排查时怎么用？ACL 的 plain 配置怎么开？ | 开轨迹后复现一条「消息去哪了」的完整查询；开 ACL 验证权限拦截 | 能用轨迹定位一次「消息发送成功但未消费」 | ✅ [RocketMQ 03](/中间件/rocketmq/rocketmq-03-client-model)（概览，实操待补） |
| 4.3 生产参数意识 | 发送超时、重试次数、故障规避（延迟规避的 Broker）怎么配？哪些默认值不能上生产？ | 对比默认参数与调优参数下的失败率（模拟 Broker 抖动） | 能背出发送侧必改的三个参数及理由 | 📝 待补新篇 |

**阶段验收**：把阶段 2 的「订单超时取消」demo 迁移到 Spring Boot 工程化形态：starter + 轨迹 + ACL + 幂等全开。

---

## 九、阶段 5：存储深水区（第 6 ~ 7 周）

**为什么有这个阶段**：存储是 RocketMQ 一切设计的根——性能边界、消息可靠性、堆积能力、与 Kafka 的分野，全部由磁盘上的文件布局决定。这是「会用」和「资深」的第一道分水岭。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 5.1 存储三件套总览 | CommitLog / ConsumeQueue / IndexFile 各存什么、谁写谁读？ | 发一条带 key 的消息，用 mqadmin 按 msgId 和 key 各查一次，`ll store/` 对照文件变化 | 能画出一次写入后三个文件的联动 | ✅ [RocketMQ 07](/中间件/rocketmq/rocketmq-07-persistence) |
| 5.2 写入路径与刷盘 | 同步刷盘 / 异步刷盘 / 组提交的取舍？TransientStorePool 是什么？ | 两种刷盘配置各压测一轮，kill -9 Broker 对比丢消息差异 | 能说清「SYNC_FLUSH 损失多少吞吐」的量级 | ✅ [RocketMQ 07](/中间件/rocketmq/rocketmq-07-persistence) |
| 5.3 主从复制 | 同步复制 / 异步复制配在哪？和刷盘怎么组合出四种可靠性档位？ | 2 主 2 从下 kill 主，不同组合观察数据丢失与可用性 | 能填出「刷盘 × 复制」四宫格 | ✅ [RocketMQ 07](/中间件/rocketmq/rocketmq-07-persistence)（部分） |
| 5.4 读路径与零拷贝 | PageCache 命中为什么快？mmap 与 sendfile 各用在哪？为什么读 CommitLog 用 mmap、而 Kafka 用 sendfile？ | `pcstat` 观察热文件的页缓存命中率 | 能讲出两种零拷贝的适用场景与 RocketMQ 的选择 | ✅ [RocketMQ 09](/中间件/rocketmq/rocketmq-09-zerocopy) |
| 5.5 定时消息的存储实现 | 5.x TimerWheel + TimerLog 时间轮怎么支撑任意时刻？4.x 的 SCHEDULE_TOPIC_XXXX 为什么只能 18 级？ | 发定时消息后观察 timerwheel / timerlog 文件增长 | 能画出「写入 → 进度推进 → 投递」三步 | ✅ [RocketMQ 08](/中间件/rocketmq/rocketmq-08-delay-longpolling) |
| 5.6 文件保留与堆积治理 | 过期文件何时删？磁盘水位线触发什么？堆积了先做什么（扩容消费者 / 跳过 / 转储）？ | 人为停消费制造百万级堆积，再分别用「扩消费者」「重置 Offset」处理 | 能给出堆积治理的三板斧与顺序 | ✅ [RocketMQ 07](/中间件/rocketmq/rocketmq-07-persistence)（部分，治理篇待补） |
| 5.7 与 Kafka 存储对比 | 单一 CommitLog vs 每分区独立日志：各牺牲了什么换来了什么？万级 Topic 场景为什么 RocketMQ 更稳？ | — | 能用一次「Kafka 分区文件数爆炸」的推演说明差异 | 📝 待补新篇 |

**阶段验收**：脱稿画出一条消息从 `Producer.send()` 返回，到消费者可见的**完整磁盘路径**（含刷盘、分发 ConsumeQueue、建立 Index），并标注每一步的可配置项。

---

## 十、阶段 6：源码攻坚（第 8 ~ 9 周）

**重点攻坚阶段。**方法：先在实验环境跑通对应场景，再按「一条消息的生命周期」打断点追，不按包结构翻。5.3.x 源码与运行版本一致，断点即所见。

| 单元 | 回答的核心问题 | 断点路线 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 6.1 源码环境与启动链路 | 5.3.x 怎么编译调试？NameServer / Broker 启动各做了什么？ | 源码编译 → `NamesrvStartup` / `BrokerStartup` 主流程 | 能讲出 Broker 启动时挂载了哪些组件 | ✅ [RocketMQ 05](/中间件/rocketmq/rocketmq-05-source-setup) |
| 6.2 发送链路 | 选队列（含故障规避）、重试、`sendKernelImpl` 怎么走？ | `DefaultMQProducerImpl.send` → `selectOneMessageQueue` → `NettyRemotingClient` | 能脱稿写出选队列策略的类名级链路 | ✅ [RocketMQ 06](/中间件/rocketmq/rocketmq-06-send-consume-lb) |
| 6.3 Broker 存储链路 | `SendMessageProcessor` → CommitLog 刷盘 → ReputMessageService 分发，怎么串起来？ | `SendMessageProcessor` → `CommitLog.putMessage` → `GroupCommitService` / `FlushRealTimeService` → `ReputMessageService` | 能讲出「写 CommitLog 与分发 ConsumeQueue 为什么天然异步」 | ✅ [RocketMQ 05/07](/中间件/rocketmq/rocketmq-07-persistence)（部分，源码篇待补） |
| 6.4 消费与重平衡源码 | Pull 的长轮询挂起在哪？`RebalanceService` 多久跑一次、怎么加锁队列？ | `PullMessageProcessor` 挂起点 → `RebalanceImpl` → `ProcessQueue` 流控 | 能解释「Push 消费实时性为什么是毫秒级」 | 📝 待补新篇（06 有骨架） |
| 6.5 事务消息源码 | half 消息怎么「伪装」进系统 Topic？回查线程怎么扫、扫多久？ | `SendMessageProcessor` 的 half 分支 → `TransactionalMessageCheckService` | 能定位回查源码并改一行日志验证 | 📝 待补新篇 |
| 6.6 定时消息源码 | 时间轮推进线程怎么调度？延迟投递的精度由什么决定？ | `TimerMessageStore` → `TimerEnqueueGetService` / `TimerDequeueGetService` | 能解释定时消息堆积时为什么投递延迟放大 | ✅ [RocketMQ 08](/中间件/rocketmq/rocketmq-08-delay-longpolling)（含部分源码） |

**加分实验**：给 Broker 加一个自定义的发送侧 Metric（拦截处理器链），证明你摸到了 `BrokerController` 的处理器注册体系。

**阶段验收**：白板画出「发送 → 存储 → 消费」三条链路的合并时序图，任选一条链路口述其失败重试路径。

---

## 十一、阶段 7：高可用——DLedger 与 Controller（第 10 周 ~ 第 11 周前半）

**为什么有这个阶段**：生产集群的灵魂。RocketMQ 5.x 的高可用有两条路线（DLedger Raft 组、Controller + 主从），不知道取舍就只能照抄公司 wiki。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 7.1 主从架构与切换难题 | 传统主从为什么不能自动切换？`SYNC_MASTER` 下 Slave 读到的是什么？ | 搭 2 主 2 从，kill 主，观察写入中断与手动切换 | 能说清「可读不可写」窗口 | ✅ [RocketMQ 01/10](/中间件/rocketmq/rocketmq-10-cluster-advanced) |
| 7.2 Raft 与 DLedger | Raft 三子问题在 DLedger 里怎么落地？日志复制与选主的关系？ | 搭 3 节点 DLedger，kill leader，记录自动选主时间线 | 能画出脑裂场景下多数派如何自保 | ✅ [RocketMQ 10](/中间件/rocketmq/rocketmq-10-cluster-advanced) |
| 7.3 Controller 模式 | 5.x 的 DLedger Controller 为什么比纯 DLedger 轻？它管什么、不管什么？ | 部署 Controller + 主从切换集群，kill Broker master，验证切主 | 能对比 DLedger 与 Controller 两条路线的资源代价 | ✅ [RocketMQ 10](/中间件/rocketmq/rocketmq-10-cluster-advanced)（含 Controller 章节，实操待补） |
| 7.4 NameServer 路由机制 | NameServer 之间为什么不通信（AP 取向）？路由 30 秒失效怎么和客户端容错配合？ | 抓包或日志观察 Broker 心跳与 NameServer 路由表变化；kill 一个 NameServer 验证无影响 | 能说清与 ZooKeeper（CP）注册中心的对比 | ✅ [RocketMQ 05](/中间件/rocketmq/rocketmq-05-source-setup)（心跳与路由章节） |
| 7.5 故障演练合集 | 每种角色挂掉，集群行为分别是什么？恢复后数据怎么对齐？ | 逐个 kill：NameServer / Broker 主 / DLedger leader / Producer 所在机，记录恢复时间线 | 能产出一张「角色 × 故障 × 行为 × 恢复」表 | 📝 待补新篇 |

**阶段验收**：3 节点 DLedger 集群上，kill leader 的同时持续发消息，用生产端日志证明「切换期间最多失败 N 次、无消息丢失」。

---

## 十二、阶段 8：运维调优——生产环境（第 11 周后半 ~ 第 12 周）

**为什么有这个阶段**：「修得了」能力的来源。监控建立观察力，checklist 建立预防力，故障手册建立反应力。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 8.1 监控体系 | 官方 Dashboard 能看什么？Prometheus 指标哪些必须配告警？ | Docker Compose 起 Prometheus + Grafana，导入官方面板，配 3 条告警（堆积、刷盘耗时、主从延迟） | 能说出 5 个黄金指标与阈值理由 | 📝 待补新篇 |
| 8.2 故障排查手册 | 「消息丢了」怎么沿 5 环节（生产 → 存储 → 持久化 → 投递 → 消费）逐环定位？重复消费、延迟抖动、PageCache 繁忙怎么查？ | 人为制造三类故障（生产端吞异常、消费超时、磁盘打满），按手册定位 | 能脱稿背出丢消息 5 环节定位法 | 📝 待补新篇 |
| 8.3 性能调优 | 生产侧（批量、压缩、异步发送）、Broker 侧（JVM、刷盘参数、TransientStorePool）、消费侧（并发、批量拉取）各调什么？ | 对同一负载做「默认 → 调优」两轮压测，记录 TPS / 延迟 / 资源 | 每项调优能说出收益与代价 | 📝 待补新篇 |
| 8.4 扩缩容与多机房 | 加 Broker 后 Queue 怎么迁移？消费者水平扩的上限是什么（队列数）？ | 向集群加一台 Broker，观察新写入分布；扩消费者到超过队列数验证空转 | 能说清「消费者数 > 队列数 = 有人闲着」 | 📝 待补新篇 |
| 8.5 生产 Checklist | 上线前要过哪些项？（对标 [RabbitMQ 22 生产清单](/中间件/rabbitmq/rabbitmq-22-production-checklist)） | 用自己搭的集群过一遍清单 | 产出自己团队版本的 checklist | 📝 待补新篇 |

**阶段验收**：交出三份文档——监控告警清单、故障排查手册、上线 checklist（均为自己实验环境的真实数据）。

---

## 十三、阶段 9：前沿与生态（第 13 周）

**为什么有这个阶段**：2024 年起 RocketMQ 明显转向 AI 基建赛道（RStream、LiteTopic），加上多协议接入，这些是「资深」区别于「熟练工」的视野差。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 | 教材 |
|------|----------------|----------|------------|------|
| 9.1 多协议接入 | MQTT（物联网）、AMQP 1.0、HTTPS 网关分别服务什么客户端？多语言 SDK 现状？ | 用 MQTT 客户端向 RocketMQ 收发一条消息 | 能说清「统一存储、多协议接入」的架构意义 | 📝 待补新篇 |
| 9.2 流处理与生态 | RocketMQ Streams / Connect 定位是什么？轻量流计算和 Flink 怎么分工？ | — | 能判断什么场景Streams 够用、什么必须 Flink | 📝 待补新篇 |
| 9.3 AI 时代的新 RocketMQ | 5.3.0 的 RStream（随机流存储）和 5.5.0 的 LiteTopic / Lite Mode（RIP-83，百万级轻量会话通道）解决 AI Agent 的什么问题？ | 起 5.5.0，创建 LiteTopic 感受轻量会话通道 | 能说清「MQ 为什么被卷进 AI：会话状态、MCP 通道、推理任务调度」 | 📝 待补新篇 |
| 9.4 版本演进脉络 | 4.x → 5.0（Proxy/gRPC/Pop）→ 5.1~5.2（Controller）→ 5.3（RStream）→ 5.5（LiteTopic），每代解决了什么遗留问题？ | — | 能为团队做一次 4.x → 5.x 升级评估 | 📝 待补新篇 |

**阶段验收**：写一篇《如果 2026 年选消息队列》——综合存储、生态、AI 三条线，给出你的选型框架。

---

## 十四、阶段 10：毕业——选型 + 综合实战（第 14 周）

### 10.1 选型决策树（背下来）

```
要一个消息队列？
├─ 日志 / 埋点 / 大数据管道，Topic 数量可控 → Kafka
├─ 复杂路由（交换机模型）、低吞吐、团队已有运维经验 → RabbitMQ
├─ 电商交易链路：要事务消息、延迟消息、百万级 Topic、金融级可靠 → RocketMQ
│   ├─ 存量 4.x 客户端、极简架构 → Local 模式 Proxy（兼容 4.x）
│   └─ 新项目、多语言、云原生 → Cluster 模式 Proxy + gRPC 客户端
└─ AI Agent 海量会话通道（2026 新场景）→ RocketMQ 5.5+ LiteTopic
```

### 10.2 综合实战（毕业设计）

设计并实现一个**电商交易链路**，强制用全本大纲的能力：

| 环节 | 要求方案 | 考点 |
|------|----------|------|
| 下单扣库存 + 生成订单 | 事务消息 | half / 回查 / 幂等消费 |
| 订单 30 分钟未支付自动取消 | 定时消息 | 任意时刻定时 + 取消补偿 |
| 同一订单的状态流转通知 | 顺序消息 | 队列选择器 + 消费端队列锁 |
| 支付成功 → 积分 / 优惠券 / 短信 | 普通消息 + 广播 | 重试、死信、幂等 |
| 全链路 | 监控 + 故障演练 | Prometheus 告警、kill -9 各角色一次 |

交付物：架构图一张、设计文档一篇（每个环节说明为什么选这种消息类型）、可运行代码、故障演练记录。

### 10.3 资深自检 20 问（节选）

1. Producer 的同步发送返回成功了，消息一定不丢吗？（刷盘 × 复制四宫格）
2. 为什么 RocketMQ 用单一 CommitLog 而 Kafka 用每分区一个日志？各自的代价是什么？
3. Push 消费的「推」，底层是推还是拉？长轮询的挂起点在哪个类？
4. Pop 消费比 Push 消费贵在哪、省在哪？什么场景必须 Pop？
5. 事务消息回查时本地事务已经在执行了怎么办？回查次数有上限吗？
6. 4.x 延迟消息为什么只有 18 个级别？5.x 任意定时的代价是什么？
7. 重试队列的延迟为什么是递增的？死信队列的消息怎么处理？
8. 消费者数超过队列数会怎样？怎么让消费水平扩展突破队列数限制？
9. NameServer 之间不通信，客户端怎么容忍 NameServer 部分宕机？
10. DLedger 和 Controller 两条高可用路线，你的团队该选哪条，为什么？

（完整 20 问在毕业设计时自测，答不出哪个，回对应阶段补哪个。）

---

## 十五、总时间线

| 周 | 内容 |
|----|------|
| 1 | 阶段 0：消息世界观 ＋ 阶段 1：部署与全景 |
| 2 ~ 3 | 阶段 2：六种消息类型 |
| 4 ~ 5 前半 | 阶段 3：三种消费模型 |
| 5 后半 | 阶段 4：Spring 工程化 |
| 6 ~ 7 | 阶段 5：存储深水区 |
| 8 ~ 9 | 阶段 6：源码攻坚 |
| 10 ~ 11 前半 | 阶段 7：DLedger 与 Controller 高可用 |
| 11 后半 ~ 12 | 阶段 8：运维调优 |
| 13 | 阶段 9：前沿与生态 |
| 14 | 阶段 10：毕业设计 |

每天 1.5 ~ 2 小时。进度可以慢，**顺序不要乱**：每个阶段的验收没过，不进下一阶段。标 ✅ 的单元有现成文章，读文章 + 做完实验即算过关，能把整条线提速约三分之一。

---

## 十六、参考资料（均已核验为当前版本）

### 官方文档

- [RocketMQ 官方文档](https://rocketmq.apache.org/docs/)（教学基准 5.3.4，2025-11-26 发布）
- [官方 5.0 速览](https://rocketmq.apache.org/version/)：Proxy 双模部署、gRPC 客户端、Pop 消费的官方总览，阶段 1 的必读补充
- [DLedger 集群搭建（官方最佳实践）](https://rocketmq.apache.org/zh/docs/4.x/bestPractice/02dledger/)：阶段 7 的 Raft 实操蓝本
- [rocketmq-spring 2.3.3 Release Notes](https://rocketmq.apache.org/release-notes/2025/03/14/release-notes-rocketmq-spring-2.3.3/)（2025-03-14 发布，Boot 3 支持）

### 版本事实（写文章与查资料时对表）

| 版本 | 日期 | 关键内容 |
|------|------|----------|
| 5.0 | 2022-11 | Proxy（Local/Cluster）、gRPC 客户端、Pop 消费、任意时刻定时消息 |
| 5.1 | 2023 | DLedger Controller 管控节点、自动容灾切换 |
| 5.3.0 | 2024-07-10 | RStream（AI 场景随机流存储）；本目录实战系列基于此版 |
| 5.3.4 | 2025-11-26 | 5.3 稳定线最新补丁，**本大纲教学基准** |
| 5.5.0 | 2026-04-10 | [Lite Mode / LiteTopic（RIP-83）](https://rocketmq.apache.org/zh/release-notes/2026/04/10/5.5.0/)：面向 AI 场景的百万级轻量会话通道，阶段 9 的主角 |

### 源码与追踪

- [apache/rocketmq GitHub 仓库](https://github.com/apache/rocketmq)：源码攻坚基于 release-5.3.4 分支
- [阿里云：RocketMQ 5.0 全新的高可用设计解读](https://www.cnblogs.com/alisystemsoftware/p/17514323.html)：Controller 设计的官方向解读
- [Apache RocketMQ 5.5.0 开源 LiteTopic 解析](https://www.alibabacloud.com/blog/apache-rocketmq-5-5-0-open-source-litetopic-dedicated-channel-for-millions-of-ai-sessions_603233)：LiteTopic 深度解析

### 站内关联系列

- [RabbitMQ 系列（22 篇）](/中间件/rabbitmq/rabbitmq-01-what-is-mq)：MQ 通识与对照系
- [Kafka 系列（11 篇）](/中间件/kafka/kafka-01-intro)：存储模型对比的另一极
- [分布式 · 可靠消息](/分布式/message/message-01-two-inconsistencies)：事务消息与幂等消费的分布式视角

---

## 结语：一条线，走到底

这份大纲的本质是把一个互相咬合的知识网络**压平成一条链**：

> 消息世界观 → 跑起来 → 会发（六种消息）→ 会消费（三种模型）→ 工程化 → 懂存储 → 读源码 → 高可用 → 会运维 → 见前沿 → 混合选型

每个环节只有一个入口——前一个环节。从阶段 0 的第一个实验开始，走完这条线，你就是能讲、能选、能写、能读、能修的 RocketMQ 资深工程师。

**本目录已有的 10 篇实战文（基于 5.3.0）覆盖了大纲前半程的 ✅ 单元**；标 📝 的约 15 篇缺口文章将按本大纲逐篇补齐，完成一篇就去掉一篇的「待补」标记。

标 📝 的缺口文章将按本大纲逐篇补齐（第一篇是阶段 0.3 的《三大 MQ 深度对比选型》），完成一篇就去掉一篇的「待补」标记；等不及的话，直接从已有实战系列 [《RocketMQ 快速实战——搭建、收发与可视化》](/中间件/rocketmq/rocketmq-01-quickstart) 进入阶段 1 也完全成立。
