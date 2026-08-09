---
title: "高并发系统该如何选择合适的限流模型"
sidebarGroup: "综合篇"
shortTitle: "高并发系统该如何选择合适的限流模型"
order: 127
date: 2026-05-21
category: "面试题"
tag:
  - "面试题"
description: "在高并发、高可用的系统架构中，限流是必不可少的服务自我保护手段。本文将系统梳理常见限流算法（令牌桶、漏桶、计数器），对比其工作原理、特点及适用场景，并结合Java主流实践作举例说明。一、为什么要限流？很简单，每个系统都有自身的容量上限。不管"
article: false
---

> 来源：[高并发系统该如何选择合适的限流模型](https://www.yuque.com/tulingzhouyu/db22bv/mosfnh9lzt8xmqfk)

在高并发、高可用的系统架构中，**限流**是必不可少的服务自我保护手段。

本文将系统梳理常见限流算法（令牌桶、漏桶、计数器），对比其工作原理、特点及适用场景，并结合Java主流实践作举例说明。

---

## 一、为什么要限流？

很简单，每个系统都有自身的容量上限。不管是突发流量还是恶意流量超出系统上线就可能会导致系统崩溃

so  限流就是**当系统面临高并发流量或瞬时流量高峰时，为确保服务可用性与稳定性，通过牺牲、延迟、拒绝部分请求，保护核心服务能力不被压垮。**

常见应用场景：

- 核心接口的流量保护
- 防止恶意/异常请求淹没系统
- 分布式服务/中间件防雪崩
- 短时间流量激增的缓冲

---

## 二、主流限流算法详解

### 1. 令牌桶算法（Token Bucket）

![image](/面试题/综合篇/0127-how-to-choose-the-right-current-limiting-model-for-high/img-d8277c330f44.png)

#### 原理

系统以恒定速率（如每秒N个）往桶中添加令牌。当用户请求到来时，只有“抢到”令牌的请求才被处理，否则被丢弃或延迟。桶有最大容量，防止长期积累超发。

#### 特点

- **支持突发流量**：平时未被消耗的令牌可累积，允许高峰期突发消费
- **平滑控制速率**：最大吞吐由速率和桶容量共同决定
- **实现简单**：易于与现有框架、缓存中间件集成

#### 实践举例（Guava RateLimiter）

```java
RateLimiter limiter = RateLimiter.create(5); // 每秒5个令牌
if(limiter.tryAcquire()) {
    // 允许访问
} else {
    // 被限流，拒绝或排队
}
```

#### 常见模式说明

- `acquire(n)` 支持一次性消费多令牌，典型用于需要瞬间完成多任务的场景。
- `tryAcquire(timeout, unit)` 支持设定最大等待时间，不阻塞主流程，提高用户的响应体验。

#### **注意问题**

- **桶容量不应过大，否则短时间过多积压会冲垮后端。**
- 高并发热点场景建议配合动态参数调整、监控报警。
- 比如 Guava 的 SmoothWarmingUp 实现，可以“预热”，让系统冷启动时令牌速率逐步提升，防止刚上线资源未预热被打爆。

```java
RateLimiter limiter = RateLimiter.create(5, 1, TimeUnit.MINUTES); // 1分钟平滑预热
```

#### 场景：API限流、服务流控、允许瞬时流量高峰

#### SmoothBursty 与 SmoothWarmingUp

SmoothBursty（平滑突发型）

- **定义与特性**

- 允许令牌在桶中积累，平时如果流量没用光，令牌会在桶内持续存储。
- 当有突发流量（比如顿时来一批并发请求），可以瞬间消费掉已积累的令牌，实现 **“瞬时突发”处理能力**。
- 达到限流速率限制后，会恢复稳定的输出速率。

- **适用场景**

- 需要允许短时间流量激增的接口，比如秒杀抢购、热点API等。
- 系统对短时突刺有承受能力，但希望整体被控速率稳定。

SmoothWarmingUp（平滑预热型）

- **定义与特性**

- 令牌发放速率在系统初启动时不是立即达到最大速率，而是**“逐步平滑爬升”，经过一段预热期**后才进入正常速率。
- 预热期间，令牌生成速率缓慢提升，防止冷启动时一下子被打爆。
- 达到设定的预热时间点后，速率爬满，变为稳定输出。

- **适用场景**

- 系统刚上线或实例重启时，需要冷静恢复，不希望瞬间流量冲击“冷接口”或未作好缓存/准备的子系统。
- 类如后台批处理、冷接口、分布式实例启动时的流量平滑过渡。

对比

**场景**
**SmoothBursty**
**SmoothWarmingUp**

**启动时流量**
可突发流量（马上瞬时可用）
缓慢释放令牌（平滑升至最大速率）

**令牌积累机制**
可以积累，支持瞬时取大量
不积累，初期速度受限

**适合业务**
抢购、API突发流量、抗压能力较强系统
冷接口、批量任务、后端需预热、不能立即全速的场景

**Guava配置方式**
RateLimiter.create(速率)
RateLimiter.create(速率, 预热时长, TimeUnit)

---

### 2. 漏桶算法（Leaky Bucket）

![image](/面试题/综合篇/0127-how-to-choose-the-right-current-limiting-model-for-high/img-44b079ebcd48.jpg)

#### 原理

所有请求先进入漏桶，漏桶按固定出水速率依次处理。进水速度>出水速率时，且漏桶满了，多余部分被溢出、丢弃。

#### 特点

- **匀速处理请求**：严格控制最大流出速率
- **不支持大突发**：任何突发高峰都会被直接丢弃
- **实现简单**：流程直观

#### 实践举例（Guava RateLimiter）

```java
import java.util.concurrent.*;

public class LeakyBucketRateLimiter {
    private final int capacity;
    private final BlockingQueue&lt;Runnable&gt; bucket;
    private final ScheduledExecutorService scheduler;

    public LeakyBucketRateLimiter(int capacity, int rate) {
        this.capacity = capacity;
        this.bucket = new ArrayBlockingQueue<>(capacity);
        this.scheduler = Executors.newScheduledThreadPool(1);
        // 按固定间隔匀速消费
        scheduler.scheduleAtFixedRate(() -> {
            Runnable task = bucket.poll();
            if (task != null) {
                task.run(); // 业务处理
            }
        }, 0, 1000 / rate, TimeUnit.MILLISECONDS);
    }

    // 尝试放入漏桶
    public boolean trySubmit(Runnable task) {
        return bucket.offer(task);  // 队满时返回false，表示被限流
    }

    // 关闭限流器
    public void shutdown() {
        scheduler.shutdown();
    }
}

// 用例
public class Demo {
    public static void main(String[] args) {
        LeakyBucketRateLimiter limiter = new LeakyBucketRateLimiter(10, 5); // 桶容量10，速率5 req/sec

        for (int i = 0; i < 20; i++) {
            final int reqNo = i;
            boolean accepted = limiter.trySubmit(() -> {
                System.out.println("处理请求 " + reqNo + " at " + System.currentTimeMillis());
            });
            if (!accepted) {
                System.out.println("请求 " + reqNo + " 被限流丢弃！");
            }
        }
        // 等待一会儿观察效果
        try { Thread.sleep(3000); } catch (Exception ignore) {}
        limiter.shutdown();
    }
}
```

#### **注意问题**

- **漏桶不可突发高于出桶速率的流量**：所有“积蓄”均由出桶速率决定，超速永远被丢弃。
- **排队等待可能带来延迟**，需衡量业务最大可接受延时。
- **适用严格限流/均匀处理型场景**，不适合需要允许部分高并发突刺的业务（此类建议用令牌桶）。
- **监控桶内队列长度**，队满时需及时告警；可结合日志统计限流丢弃行为，辅助参数调整。
- **可配合降级方案**，队列满自动熔断或者切换降级响应。

#### 场景

带宽整形、对严格稳定输出要求的接口或服务。

---

### 3. 计数器算法（Counter）

#### 原理

维护某时间窗口内累计请求数（如每秒一次统计），超阈值即拒绝新请求。通常有**滑动**、**固定窗口**两种。

#### 特点

- **实现极简**：单计数器或滑动窗口结构
- **实时性一般**：难以严格限制“窗口边沿突发”
- **适合总量控制**：线程池大小、数据库连接等

#### 实践方法

- **AtomicInteger（固定窗口）**：固定窗口指将时间轴划分为一段一段等长的区间（如每1秒为一个窗口）。在每个窗口内，累计请求次数；只要计数未超过阈值就放行，当达到阈值后本窗口内其它请求就会被限流。每当时间进入下一个窗口，计数重置为0。

- **优点**：实现简单，性能高。
- **缺点**：临界时刻存在“突刺”现象——在窗口边界前后短时间内可能允许近两倍的阈值通过，防护性较弱。
- **举例**：如果1秒限制100次请求，窗口边界之前和之后连续来了200次，都会放行。

![image](/面试题/综合篇/0127-how-to-choose-the-right-current-limiting-model-for-high/img-fb9893d48a57.png)

```java
AtomicInteger count = new AtomicInteger(0);
int limit = 100;
long windowStart = System.currentTimeMillis();

if (System.currentTimeMillis() - windowStart > 1000) {
    count.set(0);
    windowStart = System.currentTimeMillis();
}

if (count.incrementAndGet() > limit) {
    // 拒绝服务，系统繁忙
}
```

- **阿里 Sentinel（滑动窗口）**：滑动窗口将统计时间窗口再细分为多个更小的子窗口（如将1秒分10份，每100ms为一个子窗口），时间轴上可“滑动”地累加最近一段时间内所有子窗口的请求总数。每次请求时动态统计最近N个小窗口的总和，从而减少突刺，提高流控精准度。

- **优点**：更加平滑、精准地限制请求，几乎消除了“窗口临界突刺”问题，适合高并发场景。
- **缺点**：实现略复杂，对内存要求略高。
- **举例**：如果1秒限制100次请求，但每100ms都有单独计数，仅允许最近10个小窗口累计不超过100次，即便在窗口交界时也不会让短时间高流量全部通过。

![image](/面试题/综合篇/0127-how-to-choose-the-right-current-limiting-model-for-high/img-aaab008ce2ee.png)

```java
import com.alibaba.csp.sentinel.Entry;
import com.alibaba.csp.sentinel.SphU;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRuleManager;
import java.util.Collections;

public class SentinelSlidingWindowDemo {
    public static void main(String[] args) {
        // 1. 配置QPS限流规则
        FlowRule rule = new FlowRule();
        rule.setResource("myApi");
        rule.setGrade(com.alibaba.csp.sentinel.slots.block.RuleConstant.FLOW_GRADE_QPS);
        rule.setCount(5); // QPS 5
        FlowRuleManager.loadRules(Collections.singletonList(rule));

        // 2. 在代码中保护资源
        while (true) {
            try (Entry entry = SphU.entry("myApi")) {
                // 业务逻辑
                System.out.println("pass");
            } catch (BlockException ex) {
                // 限流时的处理
                System.out.println("blocked");
            }
        }
    }
}
```

---

## 三、分布式限流及工程实现要点

实际生产多为集群部署，需全局限流，常见方法有：

### 1. Redis+Lua 实现 (常见分布式限流方式）

```lua
-- redis lua脚本示意：原子自增+过期
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = redis.call('incr', key)
if current == 1 then
  redis.call('expire', key, 1)
end
if current > limit then
  return 0
else
  return 1
end
```

- 利用Redis自增/过期能力和Lua脚本原子性，单Key可实现全局QPS固定窗口限流。
- 滑动窗口分布式限流要实现更高精度逻辑（需多Key统计&脚本判断）。
- 当前主流微服务API限流多用此法，推荐配合高可用Redis集群。

### 2. Nginx/OpenResty限流

- 在“接入层”采用OpenResty、Nginx限流模块，配置简单，可前置保护全部接口。
- 自带limit_req，支持突发量与速率双调优，适合网关层保护。

### 3. 限流框架（如Sentinel）

- **阿里 Sentinel 内部就是滑动窗口统计机制**（默认统计1秒、2个小格桶）。
- 只需配置FlowRule为QPS/线程数限流，Sentinel自动实现滑动窗口平滑计数。
- 支持实时监控、规则热更新，推荐生产应用直接集成而非手写，稳健性和性能都更优。

---

## 四、算法对比与场景分析

**算法/实现**
**支持突发流量**
**流量平滑**
**窗口精度**
**分布式支持**
**实现难度**
**资源消耗**
**典型适用场景**
**优点**
**局限或注意点**

**固定窗口计数器**
部分
✖️
低
易
低
低
基础接口/管理后台、低并发总量限制
简单高效、代码实现极简
临界窗口突刺风险、实际QPS不稳定

**滑动窗口计数器**
部分
✔️
高
中
中
中
精细限流、需平滑流量的API
降低突刺、控制更精确
实现略复杂、内存消耗较固定窗口略高

**令牌桶**
✔️
✔️
高
易
低
低
面向API、分布式服务/接口
支持大突发、灵活、易扩展
短时超发需设置合理令牌桶容量

**漏桶**
✖️
✔️
高
中
低
低
严格速率限制，如带宽、任务出队口
输出稳定、简单少突刺
不允许突发流量、请求易被丢弃

**信号量/线程池控制**
部分
✔️
中
难
低
低
并发/线程受限、线程池、异步任务
控制并发、利用Java原生工具
难以全局QPS限制、适合并发量固定/资源敏感场景

**分布式限流(Redis/Lua)**
部分
✔️
高
强
中
中
集群API流控、微服务全局总量限流
适合多节点、规则可伸缩
Redis延迟/单点风险需高可用保障，需要元素原子性和时钟同步

**Nginx/OpenResty模块**
✔️
✔️
高
强
低
低
接入层API统一限流、突发洪峰保护
配置简单、支持分布式、可靠性高
适用接口/网关层，业务侧自定义需二次开发

**Sentinel限流**
✔️
✔️
高
强
低
低
API/微服务、流量治理和敏感接口
动态调整、滑动窗口平滑、易监控
依赖组件集成、需额外部署

---

## 五、总结

限流不是单一算法能够“包打天下”，而是根据业务需求、系统状态、流量模型灵活选型、组合应用。在现代分布式系统设计中，合理恰当的限流配置，是保证高并发场景下服务稳定可用的重要基石。
