---
title: "高并发系统 “安全阀门”：限流算法深度指南（含 Java 代码 + Redis 方案 + 生产工具）"
sidebarGroup: "鹏宇老师"
shortTitle: "高并发系统 “安全阀门”：限流算法深度指南（含 Java 代码 + Redis 方案 + 生产工具）"
order: 1178
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "在后端开发与架构设计面试中，“说说常用的限流算法” 是一道绕不开的高频题。看似考察基础技术点，实则暗藏对原理理解、场景匹配、系统设计三层能力的评估 —— 既要看你是否掌握算法核心逻辑，更要判断你能否将技术与业务结合，甚至延伸到分布式场景的落"
article: false
---

> 来源：[高并发系统 “安全阀门”：限流算法深度指南（含 Java 代码 + Redis 方案 + 生产工具）](https://www.yuque.com/tulingzhouyu/db22bv/dxyg0pfgktqo7ucs)

在后端开发与架构设计面试中，“说说常用的限流算法” 是一道绕不开的高频题。看似考察基础技术点，实则暗藏对**原理理解、场景匹配、系统设计**三层能力的评估 —— 既要看你是否掌握算法核心逻辑，更要判断你能否将技术与业务结合，甚至延伸到分布式场景的落地能力。本文将从限流的必要性出发，深入拆解四种核心限流算法的原理、Java 实现、优缺点，并拓展 Redis 分布式限流方案与生产级工具，帮你全面攻克这一考点。

## 一、为什么限流是系统的 “安全阀门”？

在高并发场景下，流量突发往往是系统崩溃的直接诱因。以下这些场景，你或许并不陌生：

- **电商秒杀**：10 万用户同时抢购 100 件库存，瞬时请求量远超服务承载上限，导致数据库连接耗尽、接口超时；
- **API 接口滥用**：第三方服务未遵守调用协议，恶意高频请求，挤占正常业务资源；
- **直播互动**：百万观众同时发送弹幕、点赞，消息队列堆积，服务响应延迟；
- **春运抢票**：放票瞬间查询请求峰值暴涨，缓存击穿后直接压垮数据库。

限流的本质，是通过 “牺牲部分非核心请求” 换取 “系统整体稳定性”，就像给水管装阀门，避免水压过高导致管道爆裂。

![image](/面试题/高频面试问题/鹏宇老师/1178-high-concurrency-rate-limiting-algorithms-guide/img-4400c3aced3f.png)

## 二、四种核心限流算法：原理、Java 实现与优缺点

### 1. 固定窗口计数器算法：简单粗暴的 “秒级限流”

#### 原理拆解

固定窗口算法是最基础的限流方案，核心逻辑分三步：

1. **定义时间窗口**：如 1 秒、1 分钟，窗口内请求数从零开始计数；
2. **累计请求次数**：每接收一个请求，计数器加 1；
3. **阈值判断**：若计数器超过预设阈值（如 1 秒内 100 次请求），则拒绝后续请求；窗口结束后，计数器重置为 0。

#### 关键问题：窗口临界穿透

假设窗口为 1 秒，阈值 100 次。若 0.9 秒时接收 100 次请求（达阈值），1.1 秒时窗口重置，又能接收 100 次请求 ——200ms 内实际处理 200 次请求，远超系统承载，这就是 “窗口临界问题”。

![image](/面试题/高频面试问题/鹏宇老师/1178-high-concurrency-rate-limiting-algorithms-guide/img-aff728c50765.png)

#### Java 实现（单机版）

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 固定窗口计数器算法（单机版）
 * 窗口大小：1秒，阈值：100次请求
 */
public class FixedWindowRateLimiter {
    // 计数器：记录当前窗口内请求数
    private final AtomicInteger requestCount = new AtomicInteger(0);
    // 窗口开始时间（毫秒）
    private final AtomicLong windowStartTime = new AtomicLong(System.currentTimeMillis());
    // 窗口大小（1秒=1000毫秒）
    private final long windowSize = 1000;
    // 限流阈值
    private final int threshold = 100;

    /**
     * 判断请求是否允许通过
     * @return true：允许，false：限流
     */
    public boolean allowRequest() {
        long currentTime = System.currentTimeMillis();
        // 1. 检查是否进入新窗口，若进入则重置计数器和窗口开始时间
        if (currentTime - windowStartTime.get() > windowSize) {
            requestCount.set(0);
            windowStartTime.set(currentTime);
        }
        // 2. 计数器自增，判断是否超过阈值
        return requestCount.incrementAndGet() <= threshold;
    }

    // 测试示例
    public static void main(String[] args) throws InterruptedException {
        FixedWindowRateLimiter limiter = new FixedWindowRateLimiter();
        // 模拟150次请求
        for (int i = 0; i < 150; i++) {
            if (limiter.allowRequest()) {
                System.out.println("请求" + (i+1) + "：允许通过");
            } else {
                System.out.println("请求" + (i+1) + "：被限流");
            }
            // 模拟请求间隔（避免瞬间完成）
            Thread.sleep(5);
        }
    }
}
```

#### 优缺点总结

- **优点**：实现简单，仅依赖原子变量，资源消耗极低；
- **缺点**：窗口临界问题导致流量穿透，仅适合对限流精度要求低的场景（如非核心接口的粗略限流）。

### 2. 滑动窗口计数器算法：解决临界问题的 “精准方案”

#### 原理拆解

滑动窗口算法是对固定窗口的优化，核心是**将大窗口拆分为多个连续的 “子窗口”**，窗口随时间 “滑动”，实时计算当前窗口内所有子窗口的请求总和，避免临界突发流量。

例如：1 秒主窗口拆分为 5 个 200ms 子窗口，每个子窗口独立计数；当时间推进 200ms，丢弃最旧的子窗口，纳入最新的子窗口，再累加当前 5 个子窗口的计数判断是否超限。

![image](/面试题/高频面试问题/鹏宇老师/1178-high-concurrency-rate-limiting-algorithms-guide/img-c53973427d02.png)

#### Java 实现（单机版）

```java
import java.util.LinkedList;
import java.util.Queue;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 滑动窗口计数器算法（单机版）
 * 主窗口：1秒，子窗口：200ms（共5个），阈值：100次请求
 */
public class SlidingWindowRateLimiter {
    // 子窗口队列：存储每个子窗口的请求数
    private final Queue&lt;Integer&gt; subWindowQueue = new LinkedList<>();
    // 子窗口大小（200ms）
    private final long subWindowSize = 200;
    // 主窗口包含的子窗口数量（1000ms / 200ms = 5）
    private final int subWindowCount = 5;
    // 总请求数（当前窗口内）
    private final AtomicInteger totalRequest = new AtomicInteger(0);
    // 限流阈值
    private final int threshold = 100;
    // 上一个子窗口的结束时间
    private long lastSubWindowEndTime;

    public SlidingWindowRateLimiter() {
        // 初始化：填充5个空的子窗口，初始请求数为0
        for (int i = 0; i < subWindowCount; i++) {
            subWindowQueue.offer(0);
        }
        lastSubWindowEndTime = System.currentTimeMillis();
    }

    public boolean allowRequest() {
        long currentTime = System.currentTimeMillis();
        // 1. 计算需要滑动的子窗口数量（根据当前时间与上一个子窗口结束时间的差值）
        int slideCount = (int) ((currentTime - lastSubWindowEndTime) / subWindowSize);
        if (slideCount > 0) {
            // 2. 滑动窗口：移除过期的子窗口，添加新的空窗口
            for (int i = 0; i < slideCount && !subWindowQueue.isEmpty(); i++) {
                // 减去过期子窗口的请求数
                totalRequest.addAndGet(-subWindowQueue.poll());
                // 添加新的空窗口
                subWindowQueue.offer(0);
            }
            // 更新上一个子窗口结束时间
            lastSubWindowEndTime = currentTime;
        }

        // 3. 若当前窗口请求数未超阈值，当前子窗口计数+1
        if (totalRequest.get() < threshold) {
            // 获取当前子窗口（队列最后一个），计数+1
            int currentSubWindow = subWindowQueue.poll();
            currentSubWindow++;
            subWindowQueue.offer(currentSubWindow);
            totalRequest.incrementAndGet();
            return true;
        }
        return false;
    }

    // 测试示例
    public static void main(String[] args) throws InterruptedException {
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter();
        // 模拟120次请求，覆盖2个主窗口周期
        for (int i = 0; i < 120; i++) {
            if (limiter.allowRequest()) {
                System.out.println("请求" + (i+1) + "：允许通过");
            } else {
                System.out.println("请求" + (i+1) + "：被限流");
            }
            Thread.sleep(10);
        }
    }
}
```

#### 优缺点总结

- **优点**：限流精度高，无窗口临界穿透问题，流量控制更平滑；
- **缺点**：实现复杂，需维护子窗口队列，频繁滑动时存在一定资源消耗（可通过调整子窗口大小平衡精度与性能）。

### 3. 漏桶算法：控制输出速率的 “稳压器”

#### 原理拆解

漏桶算法模拟 “水流通过漏桶” 的过程，核心是**强制请求以固定速率处理**，无论输入流量是否突发：

1. **请求入桶**：所有请求先进入漏桶（类似缓冲区）；
2. **匀速流出**：漏桶以固定速率将请求 “漏出” 到后端服务；
3. **桶满丢弃**：若请求入桶速度超过漏出速度，桶满后多余请求直接丢弃。

![image](/面试题/高频面试问题/鹏宇老师/1178-high-concurrency-rate-limiting-algorithms-guide/img-81b25883c420.png)

#### Java 实现（单机版）

```java
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * 漏桶算法（单机版）
 * 桶容量：100（最大缓冲请求数），流出速率：10次/秒（每100ms处理1个）
 */
public class LeakyBucketRateLimiter {
    // 阻塞队列：模拟漏桶（存储待处理请求）
    private final BlockingQueue&lt;Runnable&gt; bucket;
    // 桶容量
    private final int bucketCapacity;
    // 流出速率（次/秒）
    private final int outflowRate;

    public LeakyBucketRateLimiter(int bucketCapacity, int outflowRate) {
        this.bucketCapacity = bucketCapacity;
        this.outflowRate = outflowRate;
        this.bucket = new LinkedBlockingQueue<>(bucketCapacity);
        
        // 启动线程：模拟漏桶匀速流出（处理请求）
        new Thread(() -> {
            while (true) {
                try {
                    // 按流出速率控制处理间隔（1秒/outflowRate）
                    long interval = 1000 / outflowRate;
                    TimeUnit.MILLISECONDS.sleep(interval);
                    // 从桶中取出请求并处理（若桶空则阻塞）
                    Runnable request = bucket.take();
                    request.run();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }).start();
    }

    /**
     * 提交请求到漏桶
     * @param request 待处理的请求（Runnable）
     * @return true：成功入桶，false：桶满限流
     */
    public boolean submitRequest(Runnable request) {
        if (bucket.size() < bucketCapacity) {
            return bucket.offer(request);
        }
        // 桶满，拒绝请求
        return false;
    }

    // 测试示例
    public static void main(String[] args) throws InterruptedException {
        // 桶容量10，流出速率5次/秒（每200ms处理1个）
        LeakyBucketRateLimiter limiter = new LeakyBucketRateLimiter(10, 5);
        
        // 模拟15次突发请求
        for (int i = 0; i < 15; i++) {
            int requestId = i + 1;
            boolean success = limiter.submitRequest(() -> {
                System.out.println("处理请求" + requestId + "，时间：" + System.currentTimeMillis());
            });
            System.out.println("请求" + requestId + "：" + (success ? "成功入桶" : "被限流"));
        }
    }
}
```

#### 优缺点总结

- **优点**：输出速率绝对稳定，能有效保护后端服务不被突发流量冲击（如数据库写入、第三方接口调用）；
- **缺点**：无法利用系统空闲资源处理突发流量（即使后端有能力，也必须按固定速率处理）。

### 4. 令牌桶算法：支持突发流量的 “灵活方案”

#### 原理拆解

令牌桶算法是工业界最常用的限流方案，兼顾 “平稳速率” 与 “突发流量”：

1. **定时生成令牌**：系统以固定速率（如 10 个 / 秒）生成令牌，存入令牌桶（桶有最大容量，令牌满后不再生成）；
2. **请求获取令牌**：每个请求需要获取 1 个令牌才能被处理；
3. **无令牌限流**：若桶中无令牌，请求直接被拒绝或排队。

核心优势：当桶中有缓存的令牌时，能应对短时间的突发流量（一次性消耗多个令牌）。

![image](/面试题/高频面试问题/鹏宇老师/1178-high-concurrency-rate-limiting-algorithms-guide/img-bccc056a9544.png)

#### Java 实现（单机版）

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 令牌桶算法（单机版）
 * 桶容量：100（最大令牌数），令牌生成速率：10个/秒
 */
public class TokenBucketRateLimiter {
    // 当前令牌数
    private final AtomicInteger tokenCount = new AtomicInteger(0);
    // 桶容量（最大令牌数）
    private final int bucketCapacity;
    // 令牌生成速率（个/秒）
    private final int tokenGenerateRate;
    // 定时任务线程池：用于定时生成令牌
    private final ScheduledExecutorService scheduler;

    public TokenBucketRateLimiter(int bucketCapacity, int tokenGenerateRate) {
        this.bucketCapacity = bucketCapacity;
        this.tokenGenerateRate = tokenGenerateRate;
        this.scheduler = Executors.newSingleThreadScheduledExecutor();
        
        // 定时生成令牌：每1秒生成tokenGenerateRate个令牌（拆分到毫秒级，避免瞬间生成）
        long interval = 1000 / tokenGenerateRate;
        scheduler.scheduleAtFixedRate(
            this::addToken,
            0,
            interval,
            TimeUnit.MILLISECONDS
        );
    }

    /**
     * 生成令牌（确保不超过桶容量）
     */
    private void addToken() {
        int current = tokenCount.get();
        if (current < bucketCapacity) {
            tokenCount.incrementAndGet();
        }
    }

    /**
     * 请求获取令牌
     * @return true：获取成功（允许处理），false：无令牌（限流）
     */
    public boolean acquireToken() {
        while (true) {
            int current = tokenCount.get();
            // 若当前无令牌，返回false
            if (current == 0) {
                return false;
            }
            // 尝试原子性减少1个令牌（避免并发问题）
            if (tokenCount.compareAndSet(current, current - 1)) {
                return true;
            }
            // 若CAS失败，重试（应对高并发）
        }
    }

    /**
     * 关闭定时任务线程池（避免资源泄漏）
     */
    public void close() {
        scheduler.shutdown();
    }

    // 测试示例
    public static void main(String[] args) throws InterruptedException {
        // 桶容量20，令牌生成速率10个/秒（每100ms生成1个）
        TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(20, 10);
        
        // 模拟25次请求（前20次可利用缓存令牌，后5次需等待生成）
        for (int i = 0; i < 25; i++) {
            int requestId = i + 1;
            if (limiter.acquireToken()) {
                System.out.println("请求" + requestId + "：获取令牌成功，允许处理");
            } else {
                System.out.println("请求" + requestId + "：无令牌，被限流");
            }
            // 模拟请求间隔（前10次无间隔，模拟突发）
            if (i >= 10) {
                Thread.sleep(50);
            }
        }
        
        // 关闭线程池
        limiter.close();
    }
}
```

#### 优缺点总结

- **优点**：支持突发流量（利用缓存令牌），长期速率可控，灵活性高，适合大多数高并发场景（如 API 网关、秒杀接口）；
- **缺点**：实现较复杂，需维护定时生成令牌的线程，令牌生成速率与桶容量需根据业务调优。

## 三、分布式限流：基于 Redis 的 Java 实现

单机限流仅适用于单节点部署，分布式系统中需通过**中心化存储（如 Redis）** 共享限流状态，避免多节点各自限流导致的总体超限。Redis 的原子操作（INCR、Hash）和 Lua 脚本可保证限流逻辑的原子性。

![image](/面试题/高频面试问题/鹏宇老师/1178-high-concurrency-rate-limiting-algorithms-guide/img-269d8503218e.png)

### 1. 固定窗口计数器（Redis+Java）

利用 Redis 的`INCR`（原子计数）和`EXPIRE`（窗口过期）实现：

```java
import redis.clients.jedis.Jedis;

/**
 * 分布式固定窗口计数器（Redis+Java）
 */
public class RedisFixedWindowRateLimiter {
    private final Jedis jedis;
    private final String prefix = "rate_limit:fixed:";
    private final int threshold; // 阈值
    private final int windowSize; // 窗口大小（秒）

    public RedisFixedWindowRateLimiter(Jedis jedis, int threshold, int windowSize) {
        this.jedis = jedis;
        this.threshold = threshold;
        this.windowSize = windowSize;
    }

    public boolean allowRequest(String key) {
        String redisKey = prefix + key;
        // 1. 原子递增计数
        long count = jedis.incr(redisKey);
        // 2. 若为第一次计数，设置窗口过期时间
        if (count == 1) {
            jedis.expire(redisKey, windowSize);
        }
        // 3. 判断是否超过阈值
        return count <= threshold;
    }

    // 测试示例（需先启动Redis服务）
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            // 10秒窗口，阈值5次请求
            RedisFixedWindowRateLimiter limiter = new RedisFixedWindowRateLimiter(jedis, 5, 10);
            String userKey = "user_123"; // 按用户/接口维度的key
            
            for (int i = 0; i < 8; i++) {
                boolean success = limiter.allowRequest(userKey);
                System.out.println("请求" + (i+1) + "：" + (success ? "允许" : "限流"));
            }
        }
    }
}
```

### 2. 令牌桶算法（Redis+Lua）

用 Lua 脚本保证 “生成令牌 + 获取令牌” 的原子性，避免并发问题：

```lua
-- Redis Lua脚本：令牌桶算法（key：限流key，capacity：桶容量，rate：令牌生成速率（个/秒），now：当前时间戳）
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- 获取当前令牌桶状态（{last_generate_time, current_token_count}）
local bucket = redis.call('hmget', key, 'last_time', 'token_count')
local lastTime = tonumber(bucket[1]) or now
local tokenCount = tonumber(bucket[2]) or capacity

-- 计算从上次生成到现在的时间差，生成新令牌
local timeDiff = now - lastTime
local newToken = math.min(capacity, tokenCount + timeDiff * rate)

-- 尝试获取1个令牌
local allow = 0
if newToken >= 1 then
  newToken = newToken - 1
  allow = 1
end

-- 更新令牌桶状态，设置过期时间（避免垃圾key）
redis.call('hmset', key, 'last_time', now, 'token_count', newToken)
redis.call('expire', key, math.ceil(capacity / rate) + 1)

return allow
```

Java 调用 Lua 脚本：

```java
import redis.clients.jedis.Jedis;

import java.util.Collections;

/**
 * 分布式令牌桶算法（Redis+Lua+Java）
 */
public class RedisTokenBucketRateLimiter {
    private final Jedis jedis;
    private final String prefix = "rate_limit:token:";
    private final int capacity; // 桶容量
    private final int rate; // 令牌生成速率（个/秒）

    // Lua脚本（与上方一致）
    private final String luaScript = "local key = KEYS[1]\n" +
            "local capacity = tonumber(ARGV[1])\n" +
            "local rate = tonumber(ARGV[2])\n" +
            "local now = tonumber(ARGV[3])\n" +
            "local bucket = redis.call('hmget', key, 'last_time', 'token_count')\n" +
            "local lastTime = tonumber(bucket[1]) or now\n" +
            "local tokenCount = tonumber(bucket[2]) or capacity\n" +
            "local timeDiff = now - lastTime\n" +
            "local newToken = math.min(capacity, tokenCount + timeDiff * rate)\n" +
            "local allow = 0\n" +
            "if newToken >= 1 then\n" +
            "    newToken = newToken - 1\n" +
            "    allow = 1\n" +
            "end\n" +
            "redis.call('hmset', key, 'last_time', now, 'token_count', newToken)\n" +
            "redis.call('expire', key, math.ceil(capacity / rate) + 1)\n" +
            "return allow";

    public RedisTokenBucketRateLimiter(Jedis jedis, int capacity, int rate) {
        this.jedis = jedis;
        this.capacity = capacity;
        this.rate = rate;
    }

    public boolean acquireToken(String key) {
        String redisKey = prefix + key;
        // 调用Lua脚本，传入参数：key、容量、速率、当前时间戳（毫秒转秒）
        Long result = (Long) jedis.eval(
            luaScript,
            Collections.singletonList(redisKey),
            Collections.singletonList(capacity + "," + rate + "," + (System.currentTimeMillis() / 1000))
        );
        return result == 1;
    }

    // 测试示例
    public static void main(String[] args) throws InterruptedException {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            // 桶容量10，速率5个/秒
            RedisTokenBucketRateLimiter limiter = new RedisTokenBucketRateLimiter(jedis, 10, 5);
            String apiKey = "api:order:create";
            
            for (int i = 0; i < 15; i++) {
                boolean success = limiter.acquireToken(apiKey);
                System.out.println("请求" + (i+1) + "：" + (success ? "获取令牌成功" : "被限流"));
                Thread.sleep(100);
            }
        }
    }
}
```

## 四、生产级限流工具：避免重复造轮子

实际开发中，无需手写所有限流逻辑，以下工具已封装成熟的限流能力：

### 1. Guava RateLimiter（单机限流）

Google Guava 提供的单机令牌桶实现，轻量易用：

```java
import com.google.common.util.concurrent.RateLimiter;

public class GuavaRateLimiterDemo {
    public static void main(String[] args) {
        // 限流速率：5个/秒
        RateLimiter limiter = RateLimiter.create(5.0);
        
        for (int i = 0; i < 10; i++) {
            // 尝试获取令牌（无等待，立即返回）
            boolean success = limiter.tryAcquire();
            // 若需等待，用limiter.acquire()（阻塞直到获取令牌）
            System.out.println("请求" + (i+1) + "：" + (success ? "允许" : "限流"));
        }
    }
}
```

【此处插入 PPT 截图：生产常用限流工具页（Guava RateLimiter 介绍）】

### 2. Alibaba Sentinel（分布式限流）

阿里开源的流量控制组件，支持限流、熔断、降级一体化，可集成 Spring Cloud：

```java
import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OrderController {
    // 标注限流资源，blockHandler指定限流回调
    @SentinelResource(value = "createOrder", blockHandler = "createOrderBlocked")
    @GetMapping("/order/create")
    public String createOrder() {
        // 业务逻辑：创建订单
        return "订单创建成功";
    }

    // 限流回调方法（参数需与原方法一致，额外加BlockException）
    public String createOrderBlocked(BlockException e) {
        return "当前下单人数过多，请稍后再试";
    }
}
```

**限流规则配置**（Sentinel 控制台或配置文件）：设置资源 “createOrder” 的 QPS 阈值为 100。

【此处插入 PPT 截图：生产常用限流工具页（Alibaba Sentinel 介绍）】

### 3. Nginx 限流（网关层限流）

通过 Nginx 配置实现 IP 级或连接数限流，无需代码开发：

```nginx
# 基于IP的限流：10个请求/秒
http {
    limit_req_zone $binary_remote_addr zone=ip_limit:10m rate=10r/s;
    
    server {
        location /api/ {
            limit_req zone=ip_limit burst=20; # burst：允许的突发请求数
            proxy_pass http://backend;
        }
    }
}
```

![image](/面试题/高频面试问题/鹏宇老师/1178-high-concurrency-rate-limiting-algorithms-guide/img-84bb051c004d.png)

## 五、总结：算法选择与面试应答建议

**限流算法**
**核心优势**
**核心劣势**
**适用场景**

固定窗口计数器
实现简单、低耗
窗口临界穿透
非核心接口、粗略限流

滑动窗口计数器
精准平滑、无临界问题
实现复杂、耗资源
秒杀、高频核心接口

漏桶算法
输出速率稳定、护后端
不支持突发流量
数据库写入、第三方接口调用

令牌桶算法
支持突发、灵活可控
实现复杂、需调优
API 网关、高并发业务（推荐首选）

### 面试应答技巧

当面试官问 “常用限流算法” 时，建议按以下逻辑回答：

1. **点明考察核心**：限流是系统稳定性的关键，需结合场景选择算法；
2. **分算法拆解**：先讲原理，再讲优缺点，最后说适用场景（可举例电商秒杀用滑动窗口）；
3. **延伸分布式**：提及 Redis+Lua 实现分布式限流，体现系统设计思维；
4. **工具落地**：补充生产工具（如 Sentinel），展示实战经验。

![image](/面试题/高频面试问题/鹏宇老师/1178-high-concurrency-rate-limiting-algorithms-guide/img-316cf8bf7a7a.png)

通过以上内容，不仅能全面掌握限流算法的技术细节，更能站在面试官视角拆解考点，轻松应对面试与实际开发需求。
