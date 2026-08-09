---
title: "简历项目优化方案：突出RocketMQ百万级吞吐实战优化经验"
sidebarGroup: "诸葛老师"
shortTitle: "简历项目优化方案：突出RocketMQ百万级吞吐实战优化经验"
order: 1331
date: 2026-08-05
category: "面试题"
tag:
  - "面试题"
description: "在电商大促、限量抢购等场景中，秒杀系统是检验架构能力的 “试金石”。看似简单的 “抢商品”，背后隐藏着瞬时百万并发、数据一致性、系统高可用等一系列难题。很多开发者简历写 “精通秒杀”，但面试时被问 “如何防超卖”“怎么扛住百万并发” 就卡壳"
article: false
---

> 来源：[简历项目优化方案：突出RocketMQ百万级吞吐实战优化经验](https://www.yuque.com/tulingzhouyu/db22bv/uxk1ha924cxp7v0m)

在电商大促、限量抢购等场景中，秒杀系统是检验架构能力的 “试金石”。看似简单的 “抢商品”，背后隐藏着瞬时百万并发、数据一致性、系统高可用等一系列难题。很多开发者简历写 “精通秒杀”，但面试时被问 “如何防超卖”“怎么扛住百万并发” 就卡壳 —— 本质是没掌握全链路设计逻辑。

本文将从核心问题出发，逐层拆解秒杀系统的优化方案，搭配可直接落地的代码示例，带你从 0 到 1 搭建高可用秒杀系统。

## 一、秒杀系统的核心：看透本质才能找对方向

### 1. 秒杀的本质与特点

秒杀的核心是**瞬时高并发**：平时几百 QPS 的系统，秒杀开启瞬间会涌入几十万、上百万请求。其核心特点可概括为 3 点：

- 库存少：通常只有几十到几百件商品，99.99% 的请求都是无效的
- 用户多：百万级用户同时争抢，流量集中在前三秒
- 时间短：活动持续 10-30 分钟，核心流量窗口仅几秒

### 2. 秒杀系统的核心目标

设计秒杀系统，本质是解决 4 个核心问题：

- 挡无效流量：尽早过滤掉 99.99% 的无效请求，避免压垮后端
- 防超卖：库存 100 件就绝对不能卖出 101 件，数据一致性是底线
- 保高可用：不能因秒杀导致整个系统瘫痪，核心链路必须抗住
- 优体验：抢到的用户能快速下单，没抢到的用户即时反馈 “已售罄”

### 3. 设计原则：分层过滤，层层递进

秒杀系统的设计核心思路是 **“分层过滤”**：从前端到数据库，每一层都拦截一部分无效流量，越靠前的层级，拦截成本越低。最终只有极少数有效请求能到达数据库，确保系统稳定。

## 二、分层优化方案：从前端到数据库的全链路设计

### 第一层：前端优化 —— 拦截最外层流量

前端是距离用户最近的层级，也是拦截成本最低的环节。目标是让无效请求 “发不出去”。

#### 1. 页面静态化 + CDN 部署

秒杀页面的商品图片、标题、价格等信息，活动前都是固定的，无需动态渲染。

- 方案：将页面做成纯静态 HTML，通过 CDN 分发。用户访问时直接从 CDN 获取页面，不请求后端服务器。
- 效果：静态资源加载速度提升 80%，后端服务器无需处理静态资源请求。

#### 2. 按钮置灰 + 倒计时限流

- 秒杀开始前，“立即抢购” 按钮置灰，通过 JS 倒计时控制可点击状态，避免用户提前点击发送请求。
- 代码示例（前端 JS）：

**javascript**

运行

```javascript
// 秒杀开始时间：2024-06-18 00:00:00
const seckillStartTime = new Date('2024-06-18 00:00:00').getTime();
const btn = document.getElementById('seckill-btn');

// 倒计时逻辑
const timer = setInterval(() => {
  const now = new Date().getTime();
  const diff = seckillStartTime - now;
  if (diff <= 0) {
    btn.disabled = false;
    btn.classList.remove('gray');
    btn.innerHTML = '立即抢购';
    clearInterval(timer);
  } else {
    const seconds = Math.floor(diff / 1000);
    btn.innerHTML = `距离开始还有${seconds}秒`;
  }
}, 1000);
```

#### 3. 验证码防刷 + 请求打散

- 点击 “立即抢购” 后，弹出图形验证码或简单答题（如滑块验证），过滤机器人脚本。
- 验证码不仅能防刷，还能打散请求：用户输入验证码需要时间（1-3 秒），避免所有请求在同一秒涌入后端。
- 注意：验证码只能防君子，黑产可通过打码平台破解，需配合后续层级防护。

### 第二层：网关层限流 ——Nginx 拦截恶意流量

经过前端过滤后，仍有部分流量到达后端，首先遇到的是 Nginx 网关。目标是拦截恶意攻击和高频无效请求。

#### 1. 基于 IP 的限流

通过 Nginx 的`limit_req_zone`模块，限制同一 IP 的请求频率。

- 配置示例（Nginx.conf）：

**nginx**

```nginx
# 定义限流区域：seckill，内存10M，速率10r/s（每秒10个请求）
limit_req_zone $binary_remote_addr zone=seckill:10m rate=10r/s;

server {
  listen 80;
  server_name seckill.example.com;

  location /seckill {
    # 应用限流规则，burst=5表示允许5个突发请求，nodelay不延迟
    limit_req zone=seckill burst=5 nodelay;
    proxy_pass http://seckill-app; # 转发到应用服务器
  }
}
```

- 说明：`$binary_remote_addr`是 IP 的二进制表示，比直接用`$remote_addr`更节省内存；10M 内存可存储约 16 万个 IP 的限流状态。

#### 2. 基于用户的限流（防代理 IP 刷量）

IP 限流可被代理 IP 绕过，需结合用户维度限流：

- 用户登录后，前端将`userId`放入请求头（如`X-User-Id`）。
- Nginx 通过`$http_x_user_id`获取用户 ID，按用户限流。
- 配置示例：

**nginx**

```nginx
# 基于用户ID限流，每秒1个请求
limit_req_zone $http_x_user_id zone=seckill_user:10m rate=1r/s;

location /seckill {
  limit_req zone=seckill burst=5 nodelay; # IP限流
  limit_req zone=seckill_user burst=1 nodelay; # 用户限流
  proxy_pass http://seckill-app;
}
```

#### 3. 集中式限流（多 Nginx 节点场景）

如果部署了多台 Nginx，单机限流会导致总限流阈值翻倍。此时需用 Redis 实现集中式限流：

- 原理：通过 Nginx 的`lua-nginx-module`调用 Redis，用`INCR`+`EXPIRE`记录请求次数，超过阈值则拦截。
- Lua 脚本示例（Nginx 中调用）：

**lua**

```lua
-- 限流逻辑：key=seckill:limit:userId，expire=1秒，threshold=1
local userId = ngx.var.http_x_user_id
local key = "seckill:limit:" .. userId
local threshold = 1
local expire = 1

local redis = require "resty.redis"
local red = redis:new()
red:connect("127.0.0.1", 6379)

local count = red:incr(key)
if count == 1 then
  red:expire(key, expire)
end

if count > threshold then
  ngx.exit(429) -- 429 Too Many Requests
end
```

### 第三层：应用层限流 —— 最后一道流量过滤

经过网关层后，流量已大幅减少，但仍需应用层限流兜底，避免因网关配置失误导致流量穿透。

#### 1. 限流算法选型

秒杀场景需应对突发流量，推荐用**令牌桶算法**：

- 令牌桶：系统以固定速率往桶里放令牌，请求需拿令牌才能处理，桶满后令牌溢出。支持突发流量（桶内积攒的令牌可应对瞬间高峰）。
- 对比漏桶：漏桶严格控制流出速率，不允许突发流量，适合流量平稳的场景。

#### 2. 代码实现（Spring Boot + Guava RateLimiter）

Guava 的`RateLimiter`是令牌桶算法的经典实现，可直接集成到 Spring Boot：

**java**

运行

```java
import com.google.common.util.concurrent.RateLimiter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.PostConstruct;

@RestController
public class SeckillController {
  // 令牌桶速率：1000QPS（根据应用服务器性能调整）
  private RateLimiter rateLimiter;

  @PostConstruct
  public void init() {
    rateLimiter = RateLimiter.create(1000.0); // 每秒生成1000个令牌
  }

  @GetMapping("/seckill")
  public String seckill(@RequestHeader("X-User-Id") String userId) {
    // 尝试获取令牌，超时时间0秒（拿不到直接拒绝）
    boolean acquire = rateLimiter.tryAcquire(0);
    if (!acquire) {
      return "系统繁忙，请稍后再试";
    }

    // 令牌获取成功，继续后续流程（库存扣减、创建订单）
    return doSeckill(userId);
  }

  private String doSeckill(String userId) {
    // 后续业务逻辑...
    return "抢购中，请稍后查询结果";
  }
}
```

### 第四层：缓存预扣减 ——Redis + Lua 防超卖

应用层限流后，剩余请求需处理库存扣减。直接操作数据库会导致 DB 被打垮，需用 Redis 做库存预扣减，且必须保证原子性防超卖。

#### 1. 库存预热

秒杀开始前，将商品库存从数据库加载到 Redis：

**java**

运行

```java
import org.springframework.data.redis.core.StringRedisTemplate;
import javax.annotation.PostConstruct;

@Service
public class SeckillStockService {
  @Autowired
  private StringRedisTemplate redisTemplate;
  @Autowired
  private StockMapper stockMapper;

  // 秒杀商品ID
  private static final String SECKILL_PRODUCT_ID = "1001";
  // Redis库存Key
  private static final String STOCK_KEY = "seckill:stock:" + SECKILL_PRODUCT_ID;

  // 项目启动时预热库存（或定时任务预热）
  @PostConstruct
  public void preloadStock() {
    // 从数据库查询库存
    Stock stock = stockMapper.selectById(SECKILL_PRODUCT_ID);
    if (stock != null) {
      // 存入Redis：SET seckill:stock:1001 100
      redisTemplate.opsForValue().set(STOCK_KEY, String.valueOf(stock.getNum()));
    }
  }
}
```

#### 2. 原子扣减库存：Lua 脚本是关键

直接用`GET`+`DECR`会导致超卖（如两个线程同时查询库存为 1，都执行`DECR`），需用 Lua 脚本保证 “查询 + 判断 + 扣减” 原子性。

- Lua 脚本（原子扣减逻辑）：

```lua
-- 传入参数：KEYS[1] = 库存Key，ARGV[1] = 用户ID（可选，用于限购）
local stockKey = KEYS[1]
local userId = ARGV[1]

-- 1. 检查库存
local stock = redis.call('GET', stockKey)
if not stock or tonumber(stock) <= 0 then
  return 0 -- 库存不足，返回0
end

-- 2. （可选）检查用户是否已抢购（防重复抢购）
local userKey = "seckill:user:" .. stockKey .. ":" .. userId
if redis.call('EXISTS', userKey) == 1 then
  return -1 -- 已抢购，返回-1
end

-- 3. 扣减库存
redis.call('DECR', stockKey)
-- 4. 记录用户抢购记录（过期时间24小时）
redis.call('SET', userKey, 1, 'EX', 86400)

return 1 -- 扣减成功，返回1
```

- Java 调用 Lua 脚本：

**java**

运行

```java
@Service
public class SeckillStockService {
  // 加载Lua脚本
  private static final String SECKILL_LUA_SCRIPT = """
    local stockKey = KEYS[1]
    local userId = ARGV[1]
    local stock = redis.call('GET', stockKey)
    if not stock or tonumber(stock) <= 0 then
      return 0
    end
    local userKey = "seckill:user:" .. stockKey .. ":" .. userId
    if redis.call('EXISTS', userKey) == 1 then
      return -1
    end
    redis.call('DECR', stockKey)
    redis.call('SET', userKey, 1, 'EX', 86400)
    return 1
    """;

  @Autowired
  private StringRedisTemplate redisTemplate;

  // 执行Lua脚本扣减库存
  public int deductStock(String productId, String userId) {
    String stockKey = "seckill:stock:" + productId;
    // 调用Lua脚本，KEYS=[stockKey], ARGV=[userId]
    DefaultRedisScript&lt;Long&gt; script = new DefaultRedisScript<>(SECKILL_LUA_SCRIPT, Long.class);
    Long result = redisTemplate.execute(
      script,
      Collections.singletonList(stockKey),
      userId
    );
    return result.intValue(); // 0=库存不足，-1=已抢购，1=扣减成功
  }
}
```

#### 3. Redis 高可用配置

- 避免主从架构：主库扣减库存后未同步到从库，主库宕机会导致从库库存恢复，引发超卖。
- 推荐配置：单机 Redis（秒杀库存数据量小，单机足够）+ RDB+AOF 双持久化，确保 Redis 宕机后能恢复数据。
- 持久化配置（redis.conf）：

```java
# 开启RDB：每5分钟生成快照（适合秒杀场景）
save 300 1
# 开启AOF：每秒刷盘（数据丢失≤1秒）
appendonly yes
appendfsync everysec
```

### 第五层：消息队列削峰 —— 异步创建订单

Redis 扣减库存成功后，不能直接操作数据库创建订单（仍会压垮 DB），需用消息队列异步削峰，控制数据库写入速率。

#### 1. 流程设计

1. Redis 扣减库存成功 → 发送消息到 RocketMQ/Kafka
2. 应用返回 “抢购成功，正在生成订单”
3. 消费者监听 MQ，异步创建订单、扣减数据库库存
4. 若创建订单失败（如数据库库存不足），回补 Redis 库存

#### 2. 代码实现（Spring Boot + RocketMQ）

- 生产者（发送订单消息）：

```java
@Service
public class SeckillOrderService {
  @Autowired
  private RocketMQTemplate rocketMQTemplate;
  @Autowired
  private SeckillStockService stockService;

  // MQ主题
  private static final String SECKILL_ORDER_TOPIC = "seckill_order_topic";

  public String createOrder(String productId, String userId) {
    // 1. Redis扣减库存
    int result = stockService.deductStock(productId, userId);
    if (result == 0) {
      return "已售罄";
    } else if (result == -1) {
      return "您已抢购过该商品";
    }

    // 2. 发送消息到MQ（异步创建订单）
    SeckillOrderMsg msg = new SeckillOrderMsg();
    msg.setProductId(productId);
    msg.setUserId(userId);
    msg.setOrderNo(UUID.randomUUID().toString());
    rocketMQTemplate.send(SECKILL_ORDER_TOPIC, MessageBuilder.withPayload(msg).build());

    return "抢购成功，正在生成订单，订单号：" + msg.getOrderNo();
  }
}
```

- 消费者（异步创建订单 + 库存回补）：

```java
@Service
@RocketMQMessageListener(topic = "seckill_order_topic", consumerGroup = "seckill_order_consumer")
public class SeckillOrderConsumer implements RocketMQListener&lt;SeckillOrderMsg&gt; {
  @Autowired
  private OrderMapper orderMapper;
  @Autowired
  private StockMapper stockMapper;
  @Autowired
  private StringRedisTemplate redisTemplate;

  @Override
  public void onMessage(SeckillOrderMsg msg) {
    String productId = msg.getProductId();
    String userId = msg.getUserId();
    String orderNo = msg.getOrderNo();

    try {
      // 3. 数据库扣减库存（最后防线）
      int rows = stockMapper.deductStock(productId);
      if (rows <= 0) {
        // 库存不足，回补Redis库存
        redisTemplate.opsForValue().increment("seckill:stock:" + productId);
        // 发送通知：抢购失败
        sendNotice(userId, "库存不足，抢购失败");
        return;
      }

      // 4. 创建订单
      Order order = new Order();
      order.setOrderNo(orderNo);
      order.setProductId(productId);
      order.setUserId(userId);
      order.setStatus(0); // 待支付
      order.setCreateTime(new Date());
      orderMapper.insert(order);

      // 5. 发送支付通知
      sendNotice(userId, "订单已生成，请15分钟内支付");
    } catch (Exception e) {
      // 异常回补库存
      redisTemplate.opsForValue().increment("seckill:stock:" + productId);
      sendNotice(userId, "抢购失败，请稍后重试");
    }
  }

  private void sendNotice(String userId, String content) {
    // 发送短信/APP推送...
  }
}
```

### 第六层：数据库兜底 —— 最后一道防超卖防线

即使 Redis 预扣减成功，数据库仍需做最终库存校验，避免因 Redis 异常导致超卖。

#### 1. 数据库表设计

```sql
-- 库存表
CREATE TABLE `stock` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` varchar(64) NOT NULL COMMENT '商品ID',
  `num` int NOT NULL COMMENT '库存数量',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单表
CREATE TABLE `order` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_no` varchar(64) NOT NULL COMMENT '订单号',
  `product_id` varchar(64) NOT NULL COMMENT '商品ID',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `status` tinyint NOT NULL COMMENT '状态：0-待支付，1-已支付，2-已取消',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_product` (`user_id`,`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 2. 库存扣减 SQL（直接扣减方案）

秒杀场景冲突高，推荐用 “直接扣减” 方案，而非乐观锁（会导致大量重试）：

```java
@Mapper
public interface StockMapper {
  // 直接扣减库存：WHERE num > 0 保证不超卖
  @Update("UPDATE stock SET num = num - 1 WHERE product_id = #{productId} AND num > 0")
  int deductStock(@Param("productId") String productId);
}
```

- 原理：InnoDB 的行锁会保证`num - 1`和`num > 0`原子执行，同一时间只有一个线程能扣减成功。

#### 3. 热点数据优化：分段库存

如果商品库存 100 件，所有请求都操作同一行数据，行锁会成为瓶颈。解决方案是**分段库存**：

- 拆分库存：将 100 件拆成 10 段，每段 10 件，存入 10 条数据库记录。
- 扣减逻辑：用户抢购时随机选择一个库存段扣减，分散行锁冲突。
- 代码示例（库存分段扣减）：

```java
@Update("UPDATE stock SET num = num - 1 WHERE product_id = #{productId} AND segment = #{segment} AND num > 0")
int deductStockBySegment(@Param("productId") String productId, @Param("segment") int segment);

// 随机选择库存段
int segment = new Random().nextInt(10) + 1; // 1-10段
int rows = stockMapper.deductStockBySegment(productId, segment);
```

### 第七层：防刷与缓存优化 —— 解决后续隐患

#### 1. 恶意刷单防护

- 用户限购：通过 Redis 记录用户抢购记录（已在 Lua 脚本中实现）。
- 订单超时取消：用 RocketMQ 延迟消息，15 分钟未支付则取消订单、释放库存。**java**运行

```java
// 发送延迟消息（15分钟后触发）
rocketMQTemplate.send(
  "seckill_order_cancel_topic",
  MessageBuilder.withPayload(orderNo)
    .setHeader(RocketMQHeaders.DELAY_LEVEL, 18) // 18级=15分钟（RocketMQ默认延迟级别）
    .build()
);

// 延迟消息消费者（取消订单）
@RocketMQMessageListener(topic = "seckill_order_cancel_topic", consumerGroup = "seckill_cancel_consumer")
public class OrderCancelConsumer implements RocketMQListener&lt;String&gt; {
  @Override
  public void onMessage(String orderNo) {
    // 查询订单状态，若未支付则取消
    Order order = orderMapper.selectByOrderNo(orderNo);
    if (order != null && order.getStatus() == 0) {
      // 取消订单
      order.setStatus(2);
      orderMapper.updateById(order);
      // 释放库存（数据库+Redis）
      stockMapper.increaseStock(order.getProductId());
      redisTemplate.opsForValue().increment("seckill:stock:" + order.getProductId());
    }
  }
}
```

#### 2. 缓存击穿与热 key 优化

- 缓存击穿：热点商品缓存过期，大量请求打向 DB。解决方案：预热缓存时设置永不过期，或用定时任务定时刷新。
- 热 key 问题：单个商品的 Redis key 被百万请求访问，单线程 Redis 扛不住。解决方案：

1. 本地缓存：用 Caffeine 缓存商品信息，请求先查本地缓存。**java**运行

```java
// Caffeine配置（TTL 5分钟，最大缓存1000条）
@Bean
public Cache<String, Product> productLocalCache() {
  return Caffeine.newBuilder()
    .expireAfterWrite(5, TimeUnit.MINUTES)
    .maximumSize(1000)
    .build();
}

// 查询商品信息：先查本地缓存，再查Redis
public Product getProduct(String productId) {
  return productLocalCache.get(productId, key -> {
    // 本地缓存未命中，查Redis
    String json = redisTemplate.opsForValue().get("product:" + key);
    return JSON.parseObject(json, Product.class);
  });
}
```

1. 热 key 打散：将`product:1001`拆成`product:1001:1`到`product:1001:10`，查询时随机选择一个 key。

## 三、秒杀系统完整流程总结

### 1. 秒杀前准备

1. 页面静态化部署到 CDN
2. 商品信息预热到 Redis + 本地缓存
3. 库存数据预热到 Redis（RDB+AOF 持久化）
4. 配置 Nginx、应用层限流规则

### 2. 秒杀中流程

1. 前端：倒计时→验证码→发送请求
2. 网关层：Nginx IP + 用户限流
3. 应用层：令牌桶限流
4. Redis：Lua 脚本原子扣减库存 + 用户限购
5. MQ：发送订单消息，异步削峰
6. 数据库：消费者异步创建订单 + 最终库存扣减

### 3. 秒杀后处理

1. 订单超时取消（延迟消息）
2. 库存回补（异常场景）
3. 数据对账（Redis 库存 vs 数据库库存）

## 四、不同量级秒杀的方案选型

秒杀系统无需过度设计，需根据并发量级选择合适方案：

- 小型秒杀（几千人抢）：数据库乐观锁 + 简单 Redis 缓存
- 中型秒杀（几万人抢）：Redis+Lua 预扣减 + 单机 MQ 削峰
- 大型秒杀（百万人抢）：多级限流 + Redis Cluster + MQ 集群 + 分段库存
- 超大型秒杀（千万人抢）：CDN + 本地缓存 + Redis Cluster + 微服务拆分 + 风控系统

## 五、核心总结

秒杀系统的设计核心是 “**分层过滤 + 异步削峰 + 数据一致性**”：

1. 分层过滤：从前端到数据库，层层拦截无效流量，降低后端压力。
2. 异步削峰：用 MQ 将同步写入转为异步，控制数据库写入速率。
3. 数据一致性：Redis Lua 原子扣减 + 数据库最终校验，双保险防超卖。

秒杀系统没有银弹，需结合业务场景（并发量级、库存数量、一致性要求）灵活调整方案。掌握以上全链路设计逻辑，不仅能应对面试，更能直接落地生产环境。
