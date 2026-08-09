---
title: "13、面试官：如何构建一个“全链路业务日志”系统，将一次用户请求的所有日志串联起来？"
sidebarGroup: "赋文老师"
shortTitle: "13、面试官：如何构建一个“全链路业务日志”系统，将一次用户请求的所有日志串联起来？"
order: 1247
date: 2026-01-03
category: "面试题"
tag:
  - "面试题"
description: "腾讯二面，气氛很轻松。面试官是个技术老大，看起来很和善。前面聊了Redis、MySQL、消息队列，答得还不错。眼看就要结束了，面试官突然说：\"最后问一个场景题。\"他打开电脑，给我看了一张Kibana的截图：8万多条日志，密密麻麻。\"这是我们"
article: false
---

> 来源：[13、面试官：如何构建一个“全链路业务日志”系统，将一次用户请求的所有日志串联起来？](https://www.yuque.com/tulingzhouyu/db22bv/mt75o6gnxxz68qd7)

腾讯二面，气氛很轻松。

面试官是个技术老大，看起来很和善。前面聊了Redis、MySQL、消息队列，答得还不错。

眼看就要结束了，面试官突然说："最后问一个场景题。"

他打开电脑，给我看了一张Kibana的截图：**8万多条日志，密密麻麻。**

"这是我们上周遇到的真实故障。"

"凌晨3点，用户投诉说支付成功但没发货。值班同学查了40分钟才定位到问题：MQ消息因为网络抖动延迟了5分钟，但订单服务8秒就超时了。"

"如果是你，怎么快速定位这个问题？"

我想了想，说："先用用户ID搜索日志，看订单服务、支付服务、物流服务的日志……"

面试官打断我："用户ID搜出来8万条结果，因为这是个老用户，历史订单很多。你怎么确认哪些日志是这次故障的？"

我愣住了。

"如果订单服务在机器A，支付服务在机器B，物流服务在机器C，你怎么串联这些日志？"

"如果请求经过了8个微服务，中间还有异步MQ，你怎么还原完整链路？"

"最关键的，**如果这个故障在高峰期发生，每秒1万QPS，你怎么在海量日志中快速定位？**"

我支支吾吾，答不上来。

面试官看了看表："这个问题确实有难度。我再给你一个提示：**TraceID，听说过吗？**"

我摇头。

"回去可以了解一下。好了，今天就到这里，你还有什么问题要问我吗？"

我知道，这一轮凉了。

---

走出腾讯大厦，深圳的阳光刺得我睁不开眼。

电梯里，我打开手机搜索"TraceID"。

第一条结果：**《微服务架构下的分布式链路追踪详解》**

我点进去，越看越心惊：**这正是我欠缺的知识盲区。**

回到酒店，我打开电脑，开始恶补。

Google、GitHub、掘金、InfoQ，凡是跟"分布式追踪"相关的文章，我全部扫了一遍。

看了SkyWalking的文档，研究了Zipkin的架构，甚至把Twitter的Snowflake算法论文都啃了一遍。

第二天早上，我写了一套完整的Demo。

第三天晚上，我整理出了一份PPT。

第四天，我把这份资料发到了掘金，标题是：**《面试官问我微服务怎么查日志，我说用grep，然后就挂了》**

没想到，这篇文章当天就上了首页，1万多人点赞。

更没想到的是，三天后，我收到了字节跳动的面试邀请。

---

## 一、字节三面：我是这样回答日志追踪问题的

字节的面试官开门见山："看了你在掘金的文章，写得不错。来，给我讲讲全链路日志追踪。"

我深吸一口气，打开笔记本。

"面试官，我先说一个场景：**用户投诉说支付成功但没发货，怎么快速定位问题？**"

"传统的排查方式有三个致命缺陷："

```plain
传统排查方式的三大问题：

问题1：日志分散在不同机器
- 订单服务日志：机器A（/data/logs/order-service/app.log）
- 支付服务日志：机器B（/data/logs/payment-service/app.log）
- 库存服务日志：机器C（/data/logs/inventory-service/app.log）
- 物流服务日志：机器D（/data/logs/logistics-service/app.log）
→ 需要登录4台机器，逐个查看

问题2：无法确定日志的关联关系
- 用用户ID搜索：返回8万条历史记录
- 用订单号搜索：需要先从订单服务拿到订单号
- 用时间范围过滤：高峰期每分钟几十笔订单
→ 完全靠"猜测"哪些日志属于同一次请求

问题3：同步调用和异步消息无法串联
- 订单服务 → 支付服务：HTTP同步调用
- 支付服务 → 订单服务：MQ异步消息
- 异步消息延迟5分钟到达，怎么和之前的HTTP调用关联起来？
→ 链路断裂，无法还原完整过程
```

我翻到下一页PPT：

"**但如果有TraceID（追踪ID），排查流程就变成了这样：**"

```plain
有TraceID的排查流程：

第1步：用户或客服提供TraceID
（TraceID可以在前端页面显示，或记录到客服系统）
TraceID: 7234567890123456789

第2步：在Kibana搜索
搜索框输入：traceId:"7234567890123456789"
点击搜索

第3步：瞬间拉出完整链路（按时间排序）
[03:12:45.001] [Gateway] 接收用户请求，用户ID=123456
[03:12:45.123] [Order] 开始创建订单，商品=iPhone 15 Pro Max
[03:12:46.456] [Inventory] 扣减库存成功，剩余库存=23
[03:12:47.789] [Payment] 调用支付宝支付，金额=8999元
[03:12:47.890] [Payment] 支付成功，流水号=2024111522001399876543210
[03:12:47.891] [Payment] 发送MQ消息到order.paid队列
[03:12:52.012] [Order] 收到MQ消息（延迟5秒！）
[03:12:52.034] [Order] 订单已超时（超时时间8秒），拒绝处理

问题定位：MQ消息延迟5秒，导致订单服务超时拒绝处理
耗时：10秒
```

"**TraceID就像给每个请求发一张身份证，它跟着请求走遍所有服务。**"

面试官点头："具体怎么实现？"

---

## 二、核心实现：生成ID、传递ID、打印ID

我在白板上画了一张流程图：

```plain
用户购买iPhone 15 Pro Max的完整链路：

┌─────────┐
│  用户   │ 点击"下单"按钮
└────┬────┘
     │
     ▼
┌──────────────────────────────────────────────────┐
│ ① API网关                                         │
│    - 生成TraceID: 7234567890123456789            │
│    - 存入ThreadLocal                              │
│    - 写入MDC（供日志框架读取）                     │
└──────────────────┬───────────────────────────────┘
                   │ HTTP请求头：X-Trace-Id: 7234567890123456789
                   ▼
┌──────────────────────────────────────────────────┐
│ ② 订单服务                                        │
│    - 从Header提取TraceID                          │
│    - 恢复到ThreadLocal                            │
│    - 日志自动打印：[7234567890123456789] 创建订单 │
└────┬──────────────────────┬────────────────────── ┘
     │                      │
     │                      │ 都带着TraceID
     ▼                      ▼
┌─────────────┐       ┌─────────────┐
│ ③ 库存服务   │       │ ④ 优惠券服务 │
│   扣减库存   │       │   核销优惠券 │
└─────────────┘       └─────────────┘
     │
     ▼
┌──────────────────────────────────────────────────┐
│ ⑤ 支付服务                                        │
│    - 调用支付宝支付                                │
│    - 日志：[7234567890123456789] 支付成功          │
│    - 发送MQ消息，Header带上TraceID                │
└──────────────────┬───────────────────────────────┘
                   │ MQ消息Header：traceId=7234567890123456789
                   ▼
┌──────────────────────────────────────────────────┐
│ ⑥ 订单服务（消费MQ消息）                          │
│    - 从消息Header提取TraceID                      │
│    - 恢复到ThreadLocal                            │
│    - 日志：[7234567890123456789] 收到支付成功消息  │
└──────────────────────────────────────────────────┘

关键机制：
1. 网关生成TraceID，全链路传递
2. HTTP通过请求头传递：X-Trace-Id
3. MQ通过消息Header传递：traceId
4. 每个服务的日志自动带上TraceID
5. 在日志平台搜索TraceID，秒级定位问题
```

"整个方案分为三个核心步骤：**生成ID、传递ID、打印ID**。"

---

### 第一步：生成全局唯一的ID

面试官问："用UUID可以吗？"

"不推荐。UUID有三个问题："

```plain
UUID的缺陷：

1. 太长：36个字符
   示例：550e8400-e29b-41d4-a716-446655440000
   - 占用日志空间
   - 网络传输浪费带宽
   - 不便于人工识别

2. 无序：完全随机
   - 无法按时间排序
   - 无法通过ID判断请求发生的时间
   - 对B+树索引不友好（随机插入，页分裂严重）

3. 性能：生成依赖MAC地址或随机数
   - 有一定的性能开销
```

"我的方案是**雪花算法（Snowflake）**，这是Twitter开源的分布式ID生成算法。"

```plain
雪花算法ID结构（64位）：

┌─┬────────────────────────────────────────┬────────────┬──────────┐
│0│    41位时间戳（毫秒级）                 │ 10位机器ID  │ 12位序列号│
└─┴────────────────────────────────────────┴────────────┴──────────┘
符号位  2024-01-01 → 2093-01-01（69年）     1024台机器   4096/毫秒

生成的ID：7234567890123456789（19位数字）

四大优势：
1. 长度短：19位数字，比UUID短47%
2. 有序：包含时间戳，天然按时间递增，对索引友好
3. 高性能：单机每秒可生成400万个ID（4096 × 1000）
4. 分布式：通过机器ID保证全局唯一

实际使用：
- 美团点评：Leaf（基于Snowflake改进）
- 百度：UidGenerator（基于Snowflake改进）
- 腾讯：seqsvr（基于Snowflake思想）
```

"核心代码实现："

```java
/**
 * 雪花算法TraceID生成器
 * 参考：Twitter Snowflake
 */
public class TraceIdGenerator {
    
    // 起始时间戳：2024-01-01 00:00:00（可用69年）
    private static final long START_TIMESTAMP = 1704067200000L;
    
    // 位移量
    private static final long WORKER_ID_SHIFT = 12L;      // 序列号占12位
    private static final long TIMESTAMP_SHIFT = 22L;       // 序列号+机器ID占22位
    
    // 掩码
    private static final long SEQUENCE_MASK = 4095L;       // 序列号最大值：2^12-1
    
    // 机器ID（0-1023）
    private final long workerId;
    
    // 序列号（同一毫秒内递增）
    private long sequence = 0L;
    
    // 上次生成ID的时间戳
    private long lastTimestamp = -1L;
    
    public TraceIdGenerator(long workerId) {
        if (workerId > 1023 || workerId < 0) {
            throw new IllegalArgumentException("机器ID必须在0-1023之间");
        }
        this.workerId = workerId;
    }
    
    /**
     * 生成下一个TraceID
     * synchronized：保证线程安全
     * 时间复杂度：O(1)
     */
    public synchronized String nextId() {
        long timestamp = System.currentTimeMillis();
        
        // 时钟回拨检测
        if (timestamp < lastTimestamp) {
            throw new RuntimeException(String.format(
                "时钟回拨！拒绝生成ID。当前时间=%d，上次时间=%d，回拨了%d毫秒",
                timestamp, lastTimestamp, lastTimestamp - timestamp
            ));
        }
        
        // 同一毫秒内，序列号自增
        if (timestamp == lastTimestamp) {
            sequence = (sequence + 1) & SEQUENCE_MASK;  // 等价于 % 4096
            if (sequence == 0) {
                // 序列号用完了，等待下一毫秒
                timestamp = waitNextMillis(lastTimestamp);
            }
        } else {
            // 新的一毫秒，序列号重置为0
            sequence = 0L;
        }
        
        lastTimestamp = timestamp;
        
        // 组装64位ID：
        // 时间戳左移22位 | 机器ID左移12位 | 序列号
        long id = ((timestamp - START_TIMESTAMP) << TIMESTAMP_SHIFT)
                | (workerId << WORKER_ID_SHIFT)
                | sequence;
        
        return String.valueOf(id);
    }
    
    /**
     * 自旋等待下一毫秒
     */
    private long waitNextMillis(long lastTimestamp) {
        long timestamp = System.currentTimeMillis();
        while (timestamp <= lastTimestamp) {
            timestamp = System.currentTimeMillis();
        }
        return timestamp;
    }
}
```

面试官问："如果服务器时钟回拨了怎么办？"

"好问题！时钟回拨是雪花算法最大的坑。有三种处理策略："

```java
// 策略1：直接拒绝（适合对一致性要求极高的场景）
if (timestamp < lastTimestamp) {
    throw new RuntimeException("时钟回拨，拒绝生成ID");
}

// 策略2：等待时钟追上（适合回拨幅度较小的场景）
if (timestamp < lastTimestamp) {
    long offset = lastTimestamp - timestamp;
    if (offset > 5) {  // 回拨超过5ms，拒绝
        throw new RuntimeException("时钟回拨幅度过大");
    }
    try {
        Thread.sleep(offset);  // 等待时钟追上
        timestamp = System.currentTimeMillis();
    } catch (InterruptedException e) {
        throw new RuntimeException("等待时钟回拨失败");
    }
}

// 策略3：使用扩展位（美团Leaf的方案）
// 在64位ID中预留2位作为时钟回拨标志位
// 正常情况：标志位=00
// 第1次回拨：标志位=01
// 第2次回拨：标志位=10
// 第3次回拨：标志位=11
// 这样即使回拨，ID依然唯一
```

"生产环境的最佳实践："

```yaml
# 配置NTP时钟同步
- hosts: all
  tasks:
    - name: 安装NTP
      yum: name=ntp state=present
    
    - name: 配置NTP服务器
      lineinfile:
        path: /etc/ntp.conf
        line: "server ntp.aliyun.com iburst"
    
    - name: 启动NTP服务
      service: name=ntpd state=started enabled=yes

# 监控告警
- alert: ClockSkewDetected
  expr: abs(node_timex_offset_seconds) > 0.05
  for: 5m
  annotations:
    summary: "时钟偏移超过50ms，可能导致雪花算法异常"

# 降级方案
if (时钟回拨) {
    1. 记录告警日志
    2. 通知运维处理
    3. 降级使用UUID
}
```

---

### 第二步：让TraceID在服务间自动传递

"生成了ID，怎么让它在所有服务之间传递？"

"**关键技术：ThreadLocal + HTTP拦截器 + MQ拦截器**"

#### 2.1 TraceID上下文管理

```java
/**
 * TraceID上下文
 * 职责：管理当前线程的TraceID
 */
public class TraceContext {
    
    // ThreadLocal：线程级的全局变量，每个线程独立
    private static final ThreadLocal&lt;String&gt; TRACE_ID = new ThreadLocal<>();
    
    // 雪花算法生成器（单例）
    private static final TraceIdGenerator GENERATOR = 
        new TraceIdGenerator(getWorkerId());
    
    /**
     * 生成新的TraceID（在链路起点调用）
     */
    public static String createTraceId() {
        String traceId = GENERATOR.nextId();
        TRACE_ID.set(traceId);
        
        // 同时放入MDC，让Logback能自动读取
        MDC.put("traceId", traceId);
        
        return traceId;
    }
    
    /**
     * 设置TraceID（从上游服务传递过来）
     */
    public static void setTraceId(String traceId) {
        if (traceId != null && !traceId.isEmpty()) {
            TRACE_ID.set(traceId);
            MDC.put("traceId", traceId);
        }
    }
    
    /**
     * 获取当前TraceID
     */
    public static String getTraceId() {
        return TRACE_ID.get();
    }
    
    /**
     * 清理（请求结束时必须调用！）
     * 为什么必须清理？
     * 1. Tomcat使用线程池，线程会复用
     * 2. 不清理会导致下一个请求拿到上一个请求的TraceID
     * 3. 造成日志错乱，甚至数据泄露
     */
    public static void clear() {
        TRACE_ID.remove();
        MDC.remove("traceId");
    }
    
    /**
     * 获取机器ID
     * 生产环境从配置中心读取（如Apollo、Nacos）
     */
    private static long getWorkerId() {
        try {
            // 简化实现：用本机IP最后一段
            String ip = InetAddress.getLocalHost().getHostAddress();
            String lastSegment = ip.substring(ip.lastIndexOf('.') + 1);
            return Long.parseLong(lastSegment) % 1024;
        } catch (Exception e) {
            // 获取失败，返回默认值
            return 0L;
        }
    }
}
```

面试官问："为什么用ThreadLocal？"

"ThreadLocal是**线程级的全局变量**，有两大好处："

```java
// 好处1：线程隔离
public class ThreadLocalDemo {
    private static ThreadLocal&lt;String&gt; context = new ThreadLocal<>();
    
    public static void main(String[] args) {
        // 线程A
        new Thread(() -> {
            context.set("TraceID-A");
            System.out.println("线程A: " + context.get());  // 输出：TraceID-A
        }).start();
        
        // 线程B
        new Thread(() -> {
            context.set("TraceID-B");
            System.out.println("线程B: " + context.get());  // 输出：TraceID-B
        }).start();
        
        // 两个线程互不影响！
    }
}

// 好处2：避免层层传参
// 不用ThreadLocal：
public void createOrder(Long userId, String traceId) {
    checkInventory(userId, traceId);
}
private void checkInventory(Long userId, String traceId) {
    deductInventory(userId, traceId);
}
private void deductInventory(Long userId, String traceId) {
    log.info("[{}] 扣减库存", traceId);  // 每层都要传traceId
}

// 使用ThreadLocal：
public void createOrder(Long userId) {
    checkInventory(userId);
}
private void checkInventory(Long userId) {
    deductInventory(userId);
}
private void deductInventory(Long userId) {
    String traceId = TraceContext.getTraceId();  // 直接获取
    log.info("[{}] 扣减库存", traceId);
}
```

#### 2.2 HTTP拦截器

```java
/**
 * 服务端拦截器
 * 作用：接收上游传递的TraceID
 */
@Component
public class TraceIdServerInterceptor implements HandlerInterceptor {
    
    private static final String TRACE_ID_HEADER = "X-Trace-Id";
    
    @Override
    public boolean preHandle(HttpServletRequest request,
                            HttpServletResponse response,
                            Object handler) {
        // 从请求头获取TraceID
        String traceId = request.getHeader(TRACE_ID_HEADER);
        
        if (traceId == null || traceId.isEmpty()) {
            // 如果没有，说明这是链路起点（用户直接访问）
            traceId = TraceContext.createTraceId();
        } else {
            // 如果有，说明是下游服务，继承上游的TraceID
            TraceContext.setTraceId(traceId);
        }
        
        // 把TraceID放入响应头，方便前端或调用方追踪
        response.setHeader(TRACE_ID_HEADER, traceId);
        
        return true;
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request,
                               HttpServletResponse response,
                               Object handler,
                               Exception ex) {
        // 请求结束，清理ThreadLocal（防止内存泄漏）
        TraceContext.clear();
    }
}

/**
 * 客户端拦截器
 * 作用：调用下游服务时，自动把TraceID加到请求头
 */
@Component
public class TraceIdClientInterceptor implements ClientHttpRequestInterceptor {
    
    private static final String TRACE_ID_HEADER = "X-Trace-Id";
    
    @Override
    public ClientHttpResponse intercept(HttpRequest request,
                                       byte[] body,
                                       ClientHttpRequestExecution execution)
                                       throws IOException {
        // 从ThreadLocal获取TraceID
        String traceId = TraceContext.getTraceId();
        
        if (traceId != null) {
            // 添加到HTTP请求头
            request.getHeaders().add(TRACE_ID_HEADER, traceId);
        }
        
        // 继续执行请求
        return execution.execute(request, body);
    }
}

/**
 * 配置生效
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Autowired
    private TraceIdServerInterceptor serverInterceptor;
    
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(serverInterceptor)
                .addPathPatterns("/**");  // 拦截所有请求
    }
}

@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate(TraceIdClientInterceptor clientInterceptor) {
        RestTemplate template = new RestTemplate();
        template.setInterceptors(Collections.singletonList(clientInterceptor));
        return template;
    }
}
```

"现在，TraceID就像影子一样，自动跟着HTTP请求走，**业务代码完全无感知**。"

面试官问："如果用的是Feign或Dubbo呢？"

"原理一样，只是扩展点不同："

```java
// Feign：实现RequestInterceptor
@Component
public class FeignTraceIdInterceptor implements RequestInterceptor {
    @Override
    public void apply(RequestTemplate template) {
        String traceId = TraceContext.getTraceId();
        if (traceId != null) {
            template.header("X-Trace-Id", traceId);
        }
    }
}

// Dubbo：实现Filter
@Activate(group = {Constants.CONSUMER, Constants.PROVIDER})
public class DubboTraceIdFilter implements Filter {
    
    @Override
    public Result invoke(Invoker&lt;?> invoker, Invocation invocation) {
        // Consumer端：传递TraceID
        if (RpcContext.getContext().isConsumerSide()) {
            String traceId = TraceContext.getTraceId();
            RpcContext.getContext().setAttachment("traceId", traceId);
        }
        // Provider端：恢复TraceID
        else {
            String traceId = RpcContext.getContext().getAttachment("traceId");
            TraceContext.setTraceId(traceId);
        }
        
        try {
            return invoker.invoke(invocation);
        } finally {
            if (RpcContext.getContext().isProviderSide()) {
                TraceContext.clear();
            }
        }
    }
}
```

#### 2.3 MQ拦截器

```java
/**
 * RabbitMQ生产者：发送消息时带上TraceID
 */
@Service
public class OrderProducer {
    
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    public void sendOrderPaidMessage(Long orderId) {
        String traceId = TraceContext.getTraceId();
        
        OrderPaidMessage message = new OrderPaidMessage(orderId);
        
        rabbit

Template.convertAndSend(
            "order.exchange", 
            "order.paid", 
            message, 
            msg -> {
                // 把TraceID放入消息Header
                msg.getMessageProperties().setHeader("traceId", traceId);
                return msg;
            }
        );
    }
}

/**
 * RabbitMQ消费者：消费消息时恢复TraceID
 */
@Component
public class OrderConsumer {
    
    @RabbitListener(queues = "order.paid.queue")
    public void handleOrderPaid(Message message, OrderPaidMessage orderMsg) {
        // 从消息Header提取TraceID
        String traceId = (String) message.getMessageProperties()
            .getHeader("traceId");
        
        TraceContext.setTraceId(traceId);
        
        try {
            log.info("处理支付成功消息，订单ID={}", orderMsg.getOrderId());
            // 业务逻辑...
        } finally {
            TraceContext.clear();
        }
    }
}
```

---

### 第三步：让TraceID自动出现在日志里

"最后一步，配置Logback，让它自动打印TraceID。"

```xml
&lt;!-- logback-spring.xml --&gt;
&lt;configuration&gt;
    
    &lt;!-- 控制台输出 --&gt;
    &lt;appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender"&gt;
        &lt;encoder&gt;
            &lt;!-- %X{traceId}：从MDC读取traceId --&gt;
            &lt;pattern&gt;
                %d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level [%X{traceId}] %logger{36} - %msg%n
            &lt;/pattern&gt;
        &lt;/encoder&gt;
    &lt;/appender&gt;
    
    &lt;!-- 文件输出（JSON格式） --&gt;
    &lt;appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender"&gt;
        &lt;file&gt;logs/app.log&lt;/file&gt;
        
        &lt;!-- JSON编码器，方便ELK解析 --&gt;
        &lt;encoder class="net.logstash.logback.encoder.LogstashEncoder"&gt;
            &lt;customFields&gt;{"service":"order-service"}&lt;/customFields&gt;
        &lt;/encoder&gt;
        
        &lt;!-- 滚动策略 --&gt;
        &lt;rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy"&gt;
            &lt;fileNamePattern&gt;logs/app.%d{yyyy-MM-dd}.log&lt;/fileNamePattern&gt;
            &lt;maxHistory&gt;30&lt;/maxHistory&gt;
        &lt;/rollingPolicy&gt;
    &lt;/appender&gt;
    
    &lt;root level="INFO"&gt;
        &lt;appender-ref ref="CONSOLE" /&gt;
        &lt;appender-ref ref="FILE" /&gt;
    &lt;/root&gt;
    
&lt;/configuration&gt;
```

"现在，所有日志自动带上TraceID："

```bash
# 订单服务（机器A：192.168.1.10）
2024-11-15 03:12:45.123 [http-nio-8080-exec-1] INFO [7234567890123456789] com.company.order.OrderService - 用户下单，商品：iPhone 15 Pro Max

# 库存服务（机器B：192.168.1.11）
2024-11-15 03:12:46.456 [http-nio-7070-exec-5] INFO [7234567890123456789] com.company.inventory.InventoryService - 扣减库存，商品ID：100001，数量：1

# 支付服务（机器C：192.168.1.12）
2024-11-15 03:12:47.789 [http-nio-9090-exec-3] INFO [7234567890123456789] com.company.payment.PaymentService - 支付成功，金额：8999元

# 物流服务（机器D：192.168.1.13）
2024-11-15 03:12:48.012 [http-nio-6060-exec-7] INFO [7234567890123456789] com.company.logistics.LogisticsService - 创建物流单
```

"**在Kibana搜索**`7234567890123456789`**，10秒定位问题！**"

---

## 三、生产环境的三个大坑

面试官满意地点头："不错。但生产环境还有坑，你考虑过吗？"

我翻到PPT的最后一页："考虑过，有三个大坑。"

### 坑1：线程池会让TraceID"失踪"

```java
@Service
public class OrderService {
    
    @Autowired
    private ThreadPoolExecutor executor;
    
    public void createOrder(Long userId) {
        // 主线程：TraceID正常
        log.info("开始创建订单");  // [7234567890123456789] 开始创建订单
        
        // 提交到线程池异步发送短信
        executor.submit(() -> {
            // 子线程：TraceID变成null了！
            log.info("发送下单成功短信");  // [] 发送下单成功短信
        });
    }
}
```

"**原因：ThreadLocal只在当前线程有效，换了线程数据就丢了。**"

"解决方案：自定义线程池，自动传递TraceID。"

```java
/**
 * 可传递TraceID的Runnable包装器
 */
public class TraceRunnable implements Runnable {
    
    private final Runnable task;
    private final String traceId;
    
    public TraceRunnable(Runnable task) {
        this.task = task;
        // 在主线程捕获TraceID
        this.traceId = TraceContext.getTraceId();
    }
    
    @Override
    public void run() {
        // 在子线程恢复TraceID
        TraceContext.setTraceId(traceId);
        try {
            task.run();
        } finally {
            TraceContext.clear();
        }
    }
}

/**
 * 自定义线程池，自动包装所有任务
 */
public class TraceThreadPoolExecutor extends ThreadPoolExecutor {
    
    public TraceThreadPoolExecutor(int corePoolSize, int maximumPoolSize,
                                   long keepAliveTime, TimeUnit unit,
                                   BlockingQueue&lt;Runnable&gt; workQueue) {
        super(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue);
    }
    
    @Override
    public void execute(Runnable command) {
        // 自动包装，业务代码无感知
        super.execute(new TraceRunnable(command));
    }
    
    @Override
    public Future&lt;?> submit(Runnable task) {
        return super.submit(new TraceRunnable(task));
    }
}

/**
 * 配置
 */
@Configuration
public class ThreadPoolConfig {
    
    @Bean("traceExecutor")
    public Executor traceExecutor() {
        return new TraceThreadPoolExecutor(
            10,  // 核心线程数
            20,  // 最大线程数
            60L, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(1000)
        );
    }
}
```

"现在，异步任务也能自动带上TraceID了。"

---

### 坑2：日志量爆炸

"假设系统QPS是1万，每个请求打印10条日志，每条200字节："

```plain
日志量计算：
1万 QPS × 10条/请求 × 200字节/条 = 20MB/秒
20MB/秒 × 86400秒/天 ≈ 1.7TB/天
1.7TB/天 × 365天/年 ≈ 620TB/年

存储成本（按阿里云OSS标准型0.12元/GB/月）：
620TB × 1024GB × 0.12元 × 12月 ≈ 92万元/年
```

面试官瞪大眼睛："怎么优化？"

"**智能采样。** 不是所有请求都需要记录详细日志。"

```java
/**
 * 智能采样器
 */
public class TraceSampler {
    
    // 默认采样率：1%
    private static final double DEFAULT_SAMPLE_RATE = 0.01;
    
    /**
     * 判断是否需要采样
     */
    public static boolean shouldSample(HttpServletRequest request) {
        // 策略1：VIP用户100%采样
        String userId = request.getHeader("User-Id");
        if (isVip(userId)) {
            return true;
        }
        
        // 策略2：核心接口100%采样
        String uri = request.getRequestURI();
        if (uri.contains("/payment/") || uri.contains("/order/create")) {
            return true;
        }
        
        // 策略3：慢请求100%采样
        Long startTime = (Long) request.getAttribute("startTime");
        if (startTime != null && System.currentTimeMillis() - startTime > 1000) {
            return true;
        }
        
        // 策略4：异常请求100%采样
        if (request.getAttribute("hasError") != null) {
            return true;
        }
        
        // 策略5：其他请求按1%采样
        return ThreadLocalRandom.current().nextDouble() < DEFAULT_SAMPLE_RATE;
    }
    
    private static boolean isVip(String userId) {
        // 实际从Redis判断
        return false;
    }
}
```

"在拦截器里加上采样判断："

```java
@Override
public boolean preHandle(HttpServletRequest request,
                        HttpServletResponse response,
                        Object handler) {
    String traceId = request.getHeader("X-Trace-Id");
    
    if (traceId == null) {
        traceId = TraceContext.createTraceId();
        
        // 判断是否需要采样
        boolean sampled = TraceSampler.shouldSample(request);
        MDC.put("sampled", String.valueOf(sampled));
    } else {
        TraceContext.setTraceId(traceId);
    }
    
    return true;
}
```

"在Logback配置里，根据采样标记决定是否输出："

```xml
&lt;appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender"&gt;
    &lt;!-- 过滤器：只输出被采样的日志 --&gt;
    &lt;filter class="ch.qos.logback.core.filter.EvaluatorFilter"&gt;
        &lt;evaluator&gt;
            &lt;expression&gt;return "true".equals(mdc.get("sampled"));&lt;/expression&gt;
        &lt;/evaluator&gt;
        &lt;onMismatch&gt;DENY&lt;/onMismatch&gt;
        &lt;onMatch&gt;ACCEPT&lt;/onMatch&gt;
    &lt;/filter&gt;
    &lt;file&gt;logs/app.log&lt;/file&gt;
    &lt;encoder class="net.logstash.logback.encoder.LogstashEncoder" /&gt;
&lt;/appender&gt;
```

"**效果：日志量降低99%，成本从92万降到9200元，核心链路100%可追溯。**"

---

### 坑3：前端怎么拿到TraceID

"用户报障时，怎么快速拿到TraceID？"

```java
// 方案1：从响应头读取
axios.interceptors.response.use(response => {
    const traceId = response.headers['x-trace-id'];
    if (traceId) {
        // 存到sessionStorage
        sessionStorage.setItem('traceId', traceId);

        // 显示在页面右下角（开发环境）
        if (process.env.NODE_ENV === 'development') {
            showTraceId(traceId);
        }
    }
    return response;
});

// 方案2：用户报障时，提交TraceID
function reportBug(description) {
    const traceId = sessionStorage.getItem('traceId');
    axios.post('/api/bug/report', {
        description,
        traceId,  // 自动带上TraceID
        timestamp: Date.now()
    });
}

// 方案3：右下角显示TraceID（仅开发环境）
function showTraceId(traceId) {
    const div = document.createElement('div');
    div.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: #fff;
    padding: 5px 10px;
    font-size: 12px;
    border-radius: 4px;
    z-index: 9999;
    cursor: pointer;
    `;
    div.textContent = `TraceID: ${traceId}`;
    div.onclick = () => {
    navigator.clipboard.writeText(traceId);
    alert('TraceID已复制到剪贴板');
};
document.body.appendChild(div);
}
```

---

## 四、面试结果：从不会到精通

讲完最后一页PPT，会议室安静了5秒。

面试官起身，伸出手："这个方案非常完整。从原理到实现，从代码到优化，甚至考虑了前端集成和成本问题。"

"说实话，很多工作三五年的工程师，也未必能讲得这么清楚。"

"欢迎加入字节。"

那一刻，我知道，这次稳了。

---

一周后，我入职字节，base深圳。

第一个任务，就是给整个部门分享全链路日志追踪的最佳实践。

会后，当初面试我的那个面试官走过来："上次面试，我故意问了一个超纲的问题，就是想看看你遇到不会的知识点，会怎么办。"

"有的人直接放弃，有的人嘴硬狡辩，但你选择了回去研究，还整理成文章分享出来。"

"**这种学习能力和分享精神，正是我们需要的。**"

我笑了："谢谢您当时给我的提示。"

他拍拍我的肩膀："加油，你会成长得很快的。"

---

## 五、写在最后

这套全链路日志追踪方案，核心只有三步：

1. **雪花算法生成TraceID**：全局唯一、高性能、19位数字
2. **拦截器自动传递TraceID**：HTTP、RPC、MQ全覆盖
3. **MDC + Logback自动打印TraceID**：零侵入、开箱即用

代码量不到500行，但能让故障排查时间从40分钟降低到10秒。

如果你也在被"日志查不到"折磨，不妨试试这套方案。
