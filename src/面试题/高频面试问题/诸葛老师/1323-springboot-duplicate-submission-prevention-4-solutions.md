---
title: "SpringBoot 防重复提交：4 个方案终结凌晨删订单！"
sidebarGroup: "诸葛老师"
shortTitle: "SpringBoot 防重复提交：4 个方案终结凌晨删订单！"
order: 1323
date: 2026-06-15
category: "面试题"
tag:
  - "面试题"
description: "你有没有过这样的崩溃时刻？刚上线的订单系统，用户手快点了两下 “提交”，数据库里立刻多了两条重复订单，库存还被多扣了一次。凌晨三点你被运维电话叫醒，一边对着数据库删数据，一边还要应付产品经理的灵魂拷问：“为啥没做防抖？”其实前端做的 “防抖"
article: false
---

> 来源：[SpringBoot 防重复提交：4 个方案终结凌晨删订单！](https://www.yuque.com/tulingzhouyu/db22bv/xoz89h1f6tmlwtm2)

你有没有过这样的崩溃时刻？刚上线的订单系统，用户手快点了两下 “提交”，数据库里立刻多了两条重复订单，库存还被多扣了一次。凌晨三点你被运维电话叫醒，一边对着数据库删数据，一边还要应付产品经理的灵魂拷问：“为啥没做防抖？”

其实前端做的 “防抖 / 节流” 只能防普通误触，真正的核心防护必须靠后端 —— 毕竟恶意请求、网络重发等场景，前端拦截根本无效。今天就用 3 分钟，带你吃透 SpringBoot 下 4 个防重复提交方案，从单实例到分布式，代码直接抄能用，彻底告别 “凌晨删单”！

## 一、单实例场景：本地缓存 + AOP（半小时落地）

如果你的项目还没做分布式，只是单服务部署，**本地缓存 + 自定义注解 + AOP** 是最轻量的方案，不用依赖任何中间件，半小时就能搞定。

### 核心原理

1. 定义自定义注解@NoRepeatSubmit，标记需要防重的接口
2. 用 AOP 拦截带有该注解的请求，生成 “用户 ID + 接口路径” 的唯一 key（确保只拦截当前用户的重复请求）
3. 将 key 存入线程安全的ConcurrentHashMap，设置过期时间（避免内存溢出）
4. 若后续请求能查到相同 key，直接返回 “请勿重复提交”

![image](/面试题/高频面试问题/诸葛老师/1323-springboot-duplicate-submission-prevention-4-solutions/img-25b17b71c9af.png)

### 完整代码实现

#### 1. 自定义注解

```java
import java.lang.annotation.*;
import java.util.concurrent.TimeUnit;
@Target(ElementType.METHOD) // 作用在方法上
@Retention(RetentionPolicy.RUNTIME) // 运行时生效
@Documented
public @interface NoRepeatSubmit {
    // 防重有效期（默认5秒，可自定义）
    long timeout() default 5;
    // 时间单位（默认秒）
    TimeUnit unit() default TimeUnit.SECONDS;
    // 重复提交时的提示信息
    String message() default "请勿重复提交，请稍后再试！";
}
```

#### 2. AOP 切面拦截

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import javax.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
@Aspect
@Component
public class NoRepeatSubmitAspect {
    // 本地缓存：key=用户ID+接口路径，value=请求时间戳
    private final Map<String, Long> localCache = new ConcurrentHashMap<>();
    // 切入点：拦截带有@NoRepeatSubmit注解的方法
    @Pointcut("@annotation(com.yourpackage.NoRepeatSubmit)")
    public void noRepeatSubmitPointcut() {}
    @Around("noRepeatSubmitPointcut() && @annotation(noRepeatSubmit)")
    public Object around(ProceedingJoinPoint joinPoint, NoRepeatSubmit noRepeatSubmit) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes.getRequest();
        // 1. 生成唯一key：用户ID（实际项目用登录态，这里模拟）+ 接口路径
        String userId = request.getHeader("X-User-ID"); // 从请求头拿用户ID
        String requestPath = request.getRequestURI();
        String cacheKey = userId + ":" + requestPath;
        // 2. 计算过期时间（当前时间戳 + 防重有效期）
        long currentTime = System.currentTimeMillis();
        long expireTime = currentTime + noRepeatSubmit.unit().toMillis(noRepeatSubmit.timeout());
        // 3. 检查缓存：若存在且未过期，拦截重复请求
        if (localCache.containsKey(cacheKey)) {
            long lastRequestTime = localCache.get(cacheKey);
            if (lastRequestTime > currentTime) {
                throw new RuntimeException(noRepeatSubmit.message());
            }
        }
        // 4. 缓存当前请求时间（覆盖过期的旧key）
        localCache.put(cacheKey, expireTime);
        try {
            // 5. 执行原方法（正常业务逻辑）
            return joinPoint.proceed();
        } finally {
            // 可选：业务执行完后删除key（允许用户快速重试，不删则等过期）
            // localCache.remove(cacheKey);
        }
    }
}
```

#### 3. 接口使用示例

```java
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
@RequestMapping("/order")
public class OrderController {
    // 给需要防重的接口加注解（自定义有效期10秒）
    @NoRepeatSubmit(timeout = 10, message = "订单提交中，请不要重复点击！")
    @PostMapping("/create")
    public String createOrder() {
        // 实际订单创建逻辑（如扣库存、生成订单）
        return "订单创建成功！";
    }
}
```

### 优缺点 & 适用场景

- **优点**：轻量无依赖，开发快，适合小项目
- **缺点**：分布式部署时失效（多实例缓存不共享）
- **适用**：单服务、低并发场景（如内部管理系统）

## 二、分布式场景：Redis + 原子操作（高并发稳如狗）

一旦项目拆成微服务、多实例部署，本地缓存就会失效（Instance A 存了 key，Instance B 没存，依然会重复提交）。这时候必须用**Redis+setIfAbsent 原子操作**，让所有实例共享缓存。

![image](/面试题/高频面试问题/诸葛老师/1323-springboot-duplicate-submission-prevention-4-solutions/img-7314c5d9a87d.png)

### 核心原理

1. 替换本地缓存为 Redis，利用setIfAbsent(key, value)的原子性（不存在则插入，返回 true；存在则不插入，返回 false）—— 避免并发下的 “缓存穿透”
2. 给 Redis key 设置过期时间（和本地缓存逻辑一致），避免内存泄漏
3. 业务执行完后主动删除 key（允许用户快速重试，比如订单创建失败后重新提交）

### 完整代码实现

#### 1. 先加 Redis 依赖（SpringBoot 项目）

```java
&lt;dependency&gt;
    &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
    &lt;artifactId&gt;spring-boot-starter-data-redis&lt;/artifactId&gt;
&lt;/dependency&gt;
```

#### 2. Redis 配置（可选，默认也能用）

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import javax.annotation.Resource;
@Configuration
public class RedisConfig {
    @Resource
    private RedisTemplate redisTemplate;
    // 解决Redis key/value序列化乱码问题
    @Bean
    public RedisTemplate<String, Object> redisTemplate() {
        // key用String序列化
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        // value用JSON序列化（可选）
        redisTemplate.setValueSerializer(new StringRedisSerializer());
        return redisTemplate;
    }
}
```

#### 3. 改造 AOP 切面（替换本地缓存为 Redis）

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.concurrent.TimeUnit;
@Aspect
@Component
public class RedisNoRepeatSubmitAspect {
    @Resource
    private RedisTemplate<String, Object> redisTemplate;
    @Pointcut("@annotation(com.yourpackage.NoRepeatSubmit)")
    public void noRepeatSubmitPointcut() {}
    @Around("noRepeatSubmitPointcut() && @annotation(noRepeatSubmit)")
    public Object around(ProceedingJoinPoint joinPoint, NoRepeatSubmit noRepeatSubmit) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes.getRequest();
        // 1. 生成唯一key（和本地缓存逻辑一致）
        String userId = request.getHeader("X-User-ID");
        String requestPath = request.getRequestURI();
        String cacheKey = "anti_duplicate:" + userId + ":" + requestPath;
        // 2. Redis原子操作：setIfAbsent（不存在则插入，返回true）
        Boolean isSuccess = redisTemplate.opsForValue().setIfAbsent(
            cacheKey, 
            "1", // value随便填，只要不为null
            noRepeatSubmit.timeout(), 
            noRepeatSubmit.unit()
        );
        // 3. 若插入失败（key已存在），拦截重复请求
        if (isSuccess == null || !isSuccess) {
            throw new RuntimeException(noRepeatSubmit.message());
        }
        try {
            // 4. 执行原业务逻辑
            return joinPoint.proceed();
        } finally {
            // 5. 业务执行完删除key（允许用户重试，不删则等过期）
            redisTemplate.delete(cacheKey);
        }
    }
}
```

### 优缺点 & 适用场景

- **优点**：分布式共享缓存，支持高并发，可靠性强
- **缺点**：依赖 Redis 服务（需保证 Redis 高可用）
- **适用**：微服务、多实例部署、高并发场景（如电商订单系统）

## 三、核心场景：数据库唯一索引（终极保障）

对于订单、支付这类 “绝对不能重复” 的核心业务，即使 Redis 偶尔抽风（如网络抖动、缓存失效），也得有最后一道防线 ——**数据库唯一索引**。

![image](/面试题/高频面试问题/诸葛老师/1323-springboot-duplicate-submission-prevention-4-solutions/img-da3ef07e0907.png)

### 核心原理

1. 给 “用户 ID + 业务唯一标识”（如订单号、支付流水号）建立联合唯一索引
2. 当重复请求突破前两层防护（本地缓存 / Redis），插入数据库时会触发DuplicateKeyException
3. 捕获该异常，返回 “重复提交” 提示，彻底杜绝重复数据

### 完整代码实现

#### 1. 建表语句（加联合唯一索引）

```java
-- 订单表示例：user_id + order_no 联合唯一
CREATE TABLE `t_order` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `user_id` varchar(64) NOT NULL COMMENT '用户ID',
    `order_no` varchar(64) NOT NULL COMMENT '订单号（唯一）',
    `amount` decimal(10,2) NOT NULL COMMENT '订单金额',
    `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    -- 核心：联合唯一索引，防止重复插入
    UNIQUE KEY `uk_user_order` (`user_id`,`order_no`) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
```

#### 2. Service 层捕获异常

```java
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.annotation.Resource;
import java.util.UUID;
@Service
public class OrderService {
    @Resource
    private OrderMapper orderMapper;
    @Transactional(rollbackFor = Exception.class)
    public String createOrder(String userId, BigDecimal amount) {
        // 1. 生成唯一订单号（如UUID、雪花算法）
        String orderNo = UUID.randomUUID().toString().replace("-", "");
        OrderDO orderDO = new OrderDO();
        orderDO.setUserId(userId);
        orderDO.setOrderNo(orderNo);
        orderDO.setAmount(amount);
        try {
            // 2. 插入数据库（若重复，会触发DuplicateKeyException）
            orderMapper.insert(orderDO);
            return "订单创建成功，订单号：" + orderNo;
        } catch (DuplicateKeyException e) {
            // 3. 捕获唯一索引冲突异常，返回重复提示
            throw new RuntimeException("订单已存在，请勿重复提交！");
        }
    }
}
```

### 优缺点 & 适用场景

- **优点**：终极防护，即使前两层失效也能拦截，数据绝对不重复
- **缺点**：需修改表结构，插入失败会触发异常（对性能影响极小）
- **适用**：核心业务（如订单、支付、转账），必须保证数据唯一性的场景

## 四、前后端分离：Token 验证（优雅防 CSRF）

前后端分离项目中，除了防重复提交，还得考虑 CSRF（跨站请求伪造）攻击。用**Token 验证**方案，既能防重复，又能防 CSRF，一举两得。

![image](/面试题/高频面试问题/诸葛老师/1323-springboot-duplicate-submission-prevention-4-solutions/img-bbca29ba5040.png)

### 核心原理

1. 前端进入提交页面时，先请求后端 “获取 Token” 接口
2. 后端生成唯一 Token（如 UUID），存入 Redis（key=Token，value = 用户 ID，设过期时间），返回给前端
3. 前端提交请求时，在 Header/Body 中携带该 Token
4. 后端验证 Token：若 Redis 中存在该 Token，删除 Token 并执行业务；若不存在，拦截请求（重复提交或 CSRF 攻击）

### 完整代码实现

#### 1. Token 生成接口（前端获取 Token）

```java
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
@RestController
@RequestMapping("/token")
public class TokenController {
    @Resource
    private RedisTemplate<String, Object> redisTemplate;
    // 前端进入提交页面时，调用该接口获取Token
    @GetMapping("/get")
    public String getToken(HttpServletRequest request) {
        String userId = request.getHeader("X-User-ID");
        // 1. 生成唯一Token
        String token = "submit_token:" + UUID.randomUUID().toString().replace("-", "");
        // 2. 存入Redis（key=Token，value=用户ID，过期时间30分钟）
        redisTemplate.opsForValue().set(token, userId, 30, TimeUnit.MINUTES);
        return token;
    }
}
```

#### 2. Token 验证 AOP（复用之前的 @NoRepeatSubmit 注解）

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
@Aspect
@Component
public class TokenNoRepeatSubmitAspect {
    @Resource
    private RedisTemplate<String, Object> redisTemplate;
    @Pointcut("@annotation(com.yourpackage.NoRepeatSubmit)")
    public void noRepeatSubmitPointcut() {}
    @Around("noRepeatSubmitPointcut() && @annotation(noRepeatSubmit)")
    public Object around(ProceedingJoinPoint joinPoint, NoRepeatSubmit noRepeatSubmit) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes.getRequest();
        // 1. 从请求头获取Token（前端需将Token放在Header中）
        String token = request.getHeader("X-Submit-Token");
        if (token == null || token.isEmpty()) {
            throw new RuntimeException("请先获取提交Token！");
        }
        // 2. 验证Token：存在则删除（原子操作，防止重复提交）
        Boolean isDeleted = redisTemplate.delete(token);
        if (isDeleted == null || !isDeleted) {
            throw new RuntimeException(noRepeatSubmit.message());
        }
        // 3. 执行原业务逻辑
        return joinPoint.proceed();
    }
}
```

#### 3. 前端调用示例（Vue 为例）

```java
// 1. 进入订单提交页，获取Token
async mounted() {
    const token = await this.$http.get("/token/get", {
        headers: { "X-User-ID": "当前用户ID" }
    });
    this.submitToken = token; // 存储Token
},
// 2. 提交订单时，携带Token
async submitOrder() {
    try {
        const res = await this.$http.post("/order/create", 
                                          { amount: 99.9 },
        { headers: { 
            "X-User-ID": "当前用户ID",
            "X-Submit-Token": this.submitToken // 携带Token
        }
        });
        console.log(res);
    } catch (err) {
        alert(err.message);
    }
}
```

### 优缺点 & 适用场景

- **优点**：同时防重复提交和 CSRF 攻击，前后端交互优雅
- **缺点**：多一次 Token 请求（对性能影响极小）
- **适用**：前后端分离项目（如 Vue/React+SpringBoot）

## 五、方案选型总结（直接对号入座）

场景
推荐方案
核心优势
注意事项

单服务、低并发
本地缓存 + AOP
轻量无依赖，开发快
不支持分布式

微服务、高并发
Redis + 原子操作
分布式共享，高可靠
保证 Redis 高可用

订单 / 支付核心业务
数据库唯一索引
终极防护，数据不重复
需提前设计唯一索引

前后端分离项目
Token 验证
防重复 + 防 CSRF，优雅
前端需正确存储和携带 Token

最后再送个福利：评论区留 “防重”，我把文中所有代码（含注解、AOP、Mapper、前端示例）打包发给你，直接复制到项目就能用！下次再遇到重复提交问题，不用再熬夜删数据，直接怼方案就行～
