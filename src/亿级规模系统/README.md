---
title: 亿级规模系统
index: false
icon: bolt
article: false
---

# 亿级规模系统

本专栏聚焦高并发与大规模消息系统的架构设计，以 [**QPS 过万与亿级消息系统设计学习总纲**](./roadmap/scale-00-roadmap.md)（西蒙学习法 · 十大阶段 · 25 周）为主线，叙事主线是「流量每涨十倍，架构长出一件新器官」。与单点深挖系列（Redis / RocketMQ / 分布式事务等）互补：这里学的是**组装判断力**——什么量级、什么位置、用什么组件、付出什么代价。

## 学习路线

- [QPS 过万与亿级消息系统设计学习总纲：零基础到资深架构师的完整教学大纲](./roadmap/scale-00-roadmap.md)

## 系列文章（按学习顺序，占位待学）

### 阶段 0 · 度量与估算（3 篇）

1. [流量的语言：QPS、RT 与并发数的三角关系](./metrics/metrics-01-traffic-language.md)
2. [从日活到机器数：容量估算的草稿纸算法](./metrics/metrics-02-capacity-estimation.md)
3. [亿级消息解剖：吞吐、堆积与存储三笔账](./metrics/metrics-03-message-anatomy.md)

### 阶段 1 · 接入层扩展（5 篇）

1. [扩容两条路：先把单机榨干，再谈横向](./access/access-01-scale-up-out.md)
2. [负载均衡：四层与七层、算法与副作用](./access/access-02-load-balancing.md)
3. [API 网关：统一入口的得与失](./access/access-03-gateway.md)
4. [线程模型：从 BIO 到 NIO，百万连接的地基](./access/access-04-thread-model.md)
5. [压测入门：不压测，一切架构都是猜](./access/access-05-benchmark-basics.md)

### 阶段 2 · 缓存体系（6 篇）

1. [数据库为什么先死：读懂 MySQL 的极限](./cache/cache-01-db-first-victim.md)
2. [读写分离与主从复制：读扩展的第一刀](./cache/cache-02-read-write-split.md)
3. [缓存模式：谁来读写缓存，是一门学问](./cache/cache-03-cache-patterns.md)
4. [缓存三兄弟：穿透、击穿、雪崩](./cache/cache-04-three-brothers.md)
5. [缓存一致性：延迟双删、订阅 binlog 与最终一致](./cache/cache-05-consistency.md)
6. [热点 key 与多级缓存：扛住明星结婚](./cache/cache-06-hotkey-multilevel.md)

### 阶段 3 · 异步与消息（7 篇）★双主线交汇

1. [同步链路的天花板：级联失败与延迟叠加](./async/async-01-sync-ceiling.md)
2. [削峰填谷：MQ 的第一性原理](./async/async-02-peak-shaving.md)
3. [亿级消息存储模型：CommitLog、零拷贝与页缓存](./async/async-03-storage-model.md)
4. [顺序、重复与事务消息：消息三保难题](./async/async-04-order-idempotent.md)
5. [消息堆积治理：十亿条积压怎么办](./async/async-05-backlog.md)
6. [推与拉：长轮询、百万连接的消息投递](./async/async-06-push-pull.md)
7. [MQ 选型：RocketMQ、Kafka 与 RabbitMQ 的分野](./async/async-07-mq-selection.md)

### 阶段 4 · 分库分表（6 篇）

1. [拆前穷尽：别急着分库分表](./sharding/sharding-01-before-split.md)
2. [垂直拆分：按业务与按读写特征切](./sharding/sharding-02-vertical-split.md)
3. [水平拆分与分片键：一次选择，决定后半生](./sharding/sharding-03-horizontal-shardkey.md)
4. [全局唯一 ID：雪花算法与时钟回拨](./sharding/sharding-04-global-id.md)
5. [跨分片难题：分页、聚合与跨库事务](./sharding/sharding-05-cross-shard.md)
6. [ShardingSphere 实战与平滑扩容](./sharding/sharding-06-shardingsphere-migration.md)

### 阶段 5 · 流量防护（6 篇）

1. [雪崩机理：一次超时如何拖死全链路](./protection/protection-01-avalanche.md)
2. [限流四大算法：从计数器到令牌桶](./protection/protection-02-rate-limit-algorithms.md)
3. [集群限流：总水位怎么算](./protection/protection-03-cluster-limit.md)
4. [熔断与降级：断路器三态与降级预案](./protection/protection-04-circuit-breaking.md)
5. [隔离舱与系统自适应保护](./protection/protection-05-bulkhead-adaptive.md)
6. [Sentinel 实战：规则体系与生产落地](./protection/protection-06-sentinel.md)

### 阶段 6 · 高可用（5 篇）

1. [可用性度量：三个 9 的代价表](./ha/ha-01-nines.md)
2. [冗余与故障转移：无状态与有状态的不同打法](./ha/ha-02-redundancy-failover.md)
3. [中间件高可用盘点：MySQL、Redis、RocketMQ 与网关](./ha/ha-03-middleware-ha.md)
4. [同城双活与异地多活：单元化入门](./ha/ha-04-multi-idc.md)
5. [故障演练：把事故提前到演练室发生](./ha/ha-05-chaos-drill.md)

### 阶段 7 · 亿级场景实战（4 篇）★总装

1. [场景解剖一：IM 消息系统](./scenarios/scenarios-01-im.md)
2. [场景解剖二：Feed 流](./scenarios/scenarios-02-feed.md)
3. [场景解剖三：千万长连接推送系统](./scenarios/scenarios-03-push.md)
4. [场景解剖四：秒杀系统（全链路总复习）](./scenarios/scenarios-04-seckill.md)

### 阶段 8 · 压测与容量（4 篇）

1. [全链路压测：为什么单机压测会骗人](./pressure/pressure-01-fulllink.md)
2. [影子体系：在生产环境安全地压测](./pressure/pressure-02-shadow.md)
3. [可观测体系：指标、告警与容量水位](./pressure/pressure-03-observability.md)
4. [容量规划与成本：水位的艺术](./pressure/pressure-04-capacity-cost.md)

### 阶段 9 · 毕业设计（3 篇）

1. [架构设计方法论：从需求到图纸](./capstone/capstone-01-methodology.md)
2. [毕业设计：QPS 过万、消息过亿的交易与消息平台](./capstone/capstone-02-final-project.md)
3. [资深自检 30 问](./capstone/capstone-03-self-check.md)

## 深挖旁支（单点系列）

本板块只取各中间件的「能力面」，内部机制在各自系列深挖：

- [Redis 学习总纲](/中间件/redis/redis-00-roadmap.md) — 缓存阶段深挖
- [RocketMQ 学习总纲](/中间件/rocketmq/rocketmq-00-roadmap.md) — 消息阶段深挖
- [RabbitMQ 系列](/中间件/rabbitmq/)、[Kafka](/中间件/kafka/) — MQ 选型参考
- [分布式事务学习总纲](/分布式/roadmap/distributed-tx-roadmap.md) — 跨库一致性深挖
- [微服务 Sentinel 系列](/微服务/) — 流量防护深挖
- [K8s 学习总纲](/云原生/k8s/k8s-00-roadmap.md) — 部署与弹性伸缩底座
- [性能调优系列](/性能调优/) — JVM / Tomcat 单机榨干
