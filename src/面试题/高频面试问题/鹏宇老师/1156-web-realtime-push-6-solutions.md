---
title: "面试官问：Web 实时消息推送核心方案有哪些？6 大方案全解析（含代码 + 架构图）"
sidebarGroup: "鹏宇老师"
shortTitle: "面试官问：Web 实时消息推送核心方案有哪些？6 大方案全解析（含代码 + 架构图）"
order: 1156
date: 2026-01-03
category: "面试题"
tag:
  - "面试题"
description: "在 Java 后端面试中，“实时消息推送” 是高频考点。无论是初级开发岗位考察基础方案，还是中高级岗位考察架构设计，掌握消息推送的核心方案及选型逻辑，都能让你在面试中脱颖而出。本文将基于 6 大核心方案，从原理、代码实现、优缺点、适用场景四"
article: false
---

> 来源：[面试官问：Web 实时消息推送核心方案有哪些？6 大方案全解析（含代码 + 架构图）](https://www.yuque.com/tulingzhouyu/db22bv/kkgfvebbl3i8ag83)

在 Java 后端面试中，“实时消息推送” 是高频考点。无论是初级开发岗位考察基础方案，还是中高级岗位考察架构设计，掌握消息推送的核心方案及选型逻辑，都能让你在面试中脱颖而出。本文将基于 6 大核心方案，从原理、代码实现、优缺点、适用场景四个维度展开详解。

## 一、什么是消息推送？

消息推送是网站 / APP 运营方向用户当前网页或移动设备主动推送信息的机制，主要分为 Web 端和移动端两类，核心目标是实现 “事件触发后，Web 页面通知小红点实时 + 1”，让用户及时感知未读消息。

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-bcf9004643a9.png)

### 1.1 核心需求拆解

- 实时性：事件触发后（如他人分享资源、后台推送通知），客户端需快速感知；
- 可视化：未读消息数通过 “小红点” 直观展示，支持实时更新；
- 可靠性：消息不丢失、不重复推送。

### 1.2 数据存储模型

消息推送的底层依赖数据存储记录消息明细，表结构设计如下（MySQL 示例）：

```sql
CREATE TABLE message_record(
  id bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  template_id bigint unsigned NOT NULL COMMENT '消息模板ID',
  type int NOT NULL DEFAULT '1' COMMENT '推送渠道：1短信 2邮件 3微信 4APP 5Web',
  receiver varchar(128) NOT NULL COMMENT '接收者（手机号/邮箱/用户ID）',
  content varchar(1024) NOT NULL COMMENT '消息内容',
  create_time datetime NOT NULL COMMENT '创建时间',
  is_read tinyint NOT NULL DEFAULT '0' COMMENT '是否已读：0未读 1已读',
  PRIMARY KEY (id),
  KEY idx_receiver (receiver),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息推送记录表';
```

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-fa6a8f15b1aa.png)

## 二、消息推送核心模式：推（Push）vs 拉（Pull）

所有消息推送方案本质上基于两种核心模式，理解这两种模式是选型的基础：

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-80aa13e91656.png)

### 2.1 推模式（Push）

- 定义：服务端主动将消息推送给客户端，无需客户端主动请求，实时性强；
- 代表方案：SSE、WebSocket、MQTT、iframe 流；
- 核心优势：实时性高，减少客户端无效请求；
- 核心劣势：服务端需维护连接，高并发场景对服务器压力较大。

### 2.2 拉模式（Pull）

- 定义：客户端主动向服务端请求数据，服务端被动返回，实时性取决于请求频率；
- 代表方案：短轮询、长轮询；
- 核心优势：实现简单，服务端无连接维护压力；
- 核心劣势：实时性弱（取决于轮询间隔），存在大量无效请求。

## 三、6 大核心方案详解（含代码 + 流程图）

### 方案 1：短轮询（Polling）

#### 3.1 核心原理

客户端按固定时间间隔（如 1 秒）向服务端发送 HTTP 请求，服务端无论是否有新消息，都立即返回响应（含未读消息数），客户端收到响应后更新小红点。

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-7ad93b76219a.png)

#### 3.2 代码实现（前端伪代码）

```javascript
// 前端定时请求未读消息数
function pollMessageCount() {
  // 每1秒发起一次请求
  setInterval(async () => {
    try {
      const response = await fetch('/api/message/count', {
        method: 'GET',
        credentials: 'include' // 携带Cookie保持登录态
      });
      const result = await response.json();
      if (result.code === 200) {
        // 更新小红点数字
        document.getElementById('unread-count').innerText = result.data.count;
      }
    } catch (error) {
      console.error('轮询消息数失败：', error);
    }
  }, 1000); // 轮询间隔：1秒
}

// 初始化调用
pollMessageCount();
```

#### 3.3 优缺点

- 优点：实现简单，无需服务端特殊配置，兼容所有浏览器；
- 缺点：无效请求占比高（大部分请求无新消息），浪费带宽和服务器资源；实时性取决于轮询间隔（间隔越短，资源消耗越大）。

#### 3.4 工作流程

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-cabdc0fb124c.png)

#### 3.5 适用场景

简单原型开发、小流量场景、对实时性要求低的需求（如后台数据统计更新）。

### 方案 2：长轮询（Long Polling）

#### 3.6 核心原理

短轮询的优化版：客户端发起 HTTP 请求后，服务端若无新消息，不立即返回响应，而是 “hold 住” 请求（通过异步机制），直到有新消息产生或请求超时（如 30 秒），才返回响应；客户端收到响应后，立即发起下一次请求，形成 “请求 - hold - 响应 - 再请求” 的循环。

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-2a5bf2afa9f4.png)

#### 3.7 代码实现（Java 后端伪代码）

基于 Spring Boot 的长轮询实现，利用 DeferredResult 实现异步请求：

```java
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.async.DeferredResult;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@RestController
public class LongPollingController {
  // 存储用户ID与DeferredResult的映射
  private final Map<String, DeferredResult&lt;String&gt;> deferredResultMap = new ConcurrentHashMap<>();

  /**
   * 客户端发起长轮询请求
   */
  @GetMapping("/api/message/long-poll")
  public DeferredResult&lt;String&gt; longPoll(@RequestParam String userId) {
    // 设置超时时间：30秒
    DeferredResult&lt;String&gt; deferredResult = new DeferredResult<>(30000L, "timeout");

    // 存储请求上下文
    deferredResultMap.put(userId, deferredResult);

    // 请求完成（超时/响应）后移除映射
    deferredResult.onCompletion(() -> deferredResultMap.remove(userId));

    return deferredResult;
  }

  /**
   * 服务端有新消息时，主动唤醒长轮询
   */
  public void pushMessage(String userId, String message) {
    DeferredResult&lt;String&gt; deferredResult = deferredResultMap.get(userId);
    if (deferredResult != null && !deferredResult.isSetOrExpired()) {
      // 响应消息（含未读消息数）
      deferredResult.set("{\"code\":200,\"data\":{\"count\":3,\"message\":\"" + message + "\"}​}");
    }
  }
}
```

#### 3.8 优缺点

- 优点：相比短轮询大幅减少无效请求，实时性接近推模式（新消息产生后立即响应）；
- 缺点：服务端需维护大量挂起的 HTTP 连接，高并发场景下占用服务器资源；需处理超时重试、连接断开等异常。

#### 3.9 工作流程

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-7ab02f820bd3.png)

#### 3.10 适用场景

中小型系统的消息通知（如后台操作结果推送）、配置中心配置变更同步、对实时性有一定要求但无法使用 WebSocket 的场景。

### 方案 3：iframe 流（不推荐）

#### 3.11 核心原理

页面中嵌入隐藏的``标签，通过`src`属性请求服务端 API，建立长连接；服务端持续向 iframe 传输 HTML/JS 脚本（如`updateCount(3)`），客户端执行脚本更新页面小红点。

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-fb53a8dac6bf.png)

#### 3.12 优缺点

- 优点：实现简单，无需复杂的客户端逻辑；
- 缺点：服务器开销大（持续传输脚本），浏览器会显示加载状态（loading 图标旋转），用户体验差；不支持断线重连，兼容性问题较多。

#### 3.13 适用场景

仅兼容极老旧浏览器的场景（实际开发中几乎不用，已被 SSE/WebSocket 替代）。

### 方案 4：SSE（Server-Sent Events）【推荐】

#### 3.14 核心原理

基于 HTTP 协议的单向推模式，客户端发起一次 HTTP 请求后，服务端保持连接，以`text/event-stream`格式向客户端持续推送数据流（如消息数更新、事件通知），支持自动断线重连、事件类型区分。

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-71163b4c1639.png)

#### 3.15 代码实现

##### 前端代码（原生 JS）

```javascript
// 建立SSE连接
function initSSE() {
  // 兼容浏览器前缀
  const EventSource = window.EventSource || window.MozEventSource;
  if (!EventSource) {
    alert('浏览器不支持SSE');
    return;
  }

  // 发起连接（默认保持长连接）
  const sse = new EventSource('/api/sse/connect?userId=10086');

  // 监听连接建立
  sse.onopen = () => {
    console.log('SSE连接建立成功');
  };

  // 监听服务端推送的消息（默认事件）
  sse.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // 更新未读消息数
    document.getElementById('unread-count').innerText = data.count;
  };

  // 监听自定义事件（如特殊通知）
  sse.addEventListener('notification', (event) => {
    const notification = JSON.parse(event.data);
    console.log('收到特殊通知：', notification.content);
  });

  // 监听连接断开
  sse.onerror = (error) => {
    console.error('SSE连接异常：', error);
    // 自动重连（浏览器原生支持，无需手动处理）
  };
}

// 初始化SSE
initSSE();
```

##### 后端代码（Java Spring Boot）

```java
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@RestController
public class SSEController {
  private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();

  @GetMapping("/api/sse/connect")
  public void connectSSE(@RequestParam String userId, HttpServletResponse response) throws IOException {
    // 设置响应格式：text/event-stream（SSE核心）
    response.setContentType("text/event-stream");
    // 禁用缓存
    response.setHeader("Cache-Control", "no-cache");
    // 允许跨域（如需跨域访问）
    response.setHeader("Access-Control-Allow-Origin", "*");
    // 保持连接
    response.setHeader("Connection", "keep-alive");

    PrintWriter writer = response.getWriter();
    int count = 0;

    // 模拟每隔5秒推送一次消息数更新
    executor.scheduleAtFixedRate(() -> {
      try {
        if (writer.checkError()) {
          executor.shutdown();
          return;
        }
        // SSE消息格式：data: 内容\n\n（必须以双换行结束）
        writer.write("data: " + "{\"count\":" + (++count) + "}\n\n");
        writer.flush();
      } catch (Exception e) {
        executor.shutdown();
        e.printStackTrace();
      }
    }, 0, 5, TimeUnit.SECONDS);

    // 自定义事件推送（如特殊通知）
    executor.schedule(() -> {
      writer.write("event: notification\n");
      writer.write("data: " + "{\"content\":\"您有一条新的站内信\"}\n\n");
      writer.flush();
    }, 10, TimeUnit.SECONDS);
  }
}
```

#### 3.16 优缺点

- 优点：实现简单（基于 HTTP，无需特殊协议）、成本低（服务端无连接维护压力）、支持自动断线重连和事件类型区分；
- 缺点：单向通信（仅服务端→客户端），不支持 IE 浏览器；

#### 3.17 工作流程

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-d7b70974c591.png)

#### 3.18 适用场景

Web 端站内信、未读消息红点、行情推送（如股票 / 实时数据展示）、ChatGPT 流式输出等仅需服务端推客户端的场景（推荐首选）。

### 方案 5：WebSocket

#### 3.19 核心原理

基于 TCP 的全双工通信协议，客户端通过 HTTP 握手建立连接后，服务端和客户端可双向实时传输数据（无需反复发起请求），适用于需要双向交互的场景。

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-85374a3cb706.png)

#### 3.20 代码实现

##### 前端代码（原生 JS）

```javascript
function initWebSocket() {
  // 建立WebSocket连接（ws://对应HTTP，wss://对应HTTPS）
  const ws = new WebSocket('ws://localhost:8080/websocket?userId=10086');

  // 连接建立成功
  ws.onopen = () => {
    console.log('WebSocket连接建立成功');
    // 客户端向服务端发送消息（双向通信）
    ws.send(JSON.stringify({ type: 'subscribe', topic: 'message' }));
  };

  // 接收服务端消息
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'unread_count') {
      // 更新小红点
      document.getElementById('unread-count').innerText = data.count;
    }
  };

  // 连接关闭
  ws.onclose = (event) => {
    console.log('WebSocket连接关闭：', event.code, event.reason);
    // 断线重连
    setTimeout(initWebSocket, 3000);
  };

  // 连接异常
  ws.onerror = (error) => {
    console.error('WebSocket异常：', error);
  };
}

// 初始化WebSocket
initWebSocket();
```

##### 后端代码（Java Spring Boot）

依赖引入：

```xml
&lt;dependency&gt;
  &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
  &lt;artifactId&gt;spring-boot-starter-websocket&lt;/artifactId&gt;
&lt;/dependency&gt;
```

WebSocket 配置类：

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.server.standard.ServerEndpointExporter;

@Configuration
public class WebSocketConfig {
  // 注入ServerEndpointExporter，自动注册@ServerEndpoint注解的Bean
  @Bean
  public ServerEndpointExporter serverEndpointExporter() {
    return new ServerEndpointExporter();
  }
}
```

WebSocket 服务端：

```java
import org.springframework.stereotype.Component;

import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ServerEndpoint("/websocket")
@Component
public class WebSocketServer {
  // 存储用户Session
  private static final Map<String, Session> userSessionMap = new ConcurrentHashMap<>();

  /**
   * 连接建立时触发
   */
  @OnOpen
  public void onOpen(Session session) {
    // 从请求参数中获取userId（实际场景需解析请求参数）
    String userId = session.getRequestParameterMap().get("userId").get(0);
    userSessionMap.put(userId, session);
    System.out.println("用户" + userId + "WebSocket连接建立");
  }

  /**
   * 接收客户端消息时触发
   */
  @OnMessage
  public void onMessage(String message, Session session) {
    System.out.println("收到客户端消息：" + message);
    // 可根据消息内容进行逻辑处理（如订阅主题、发送消息）
  }

  /**
   * 连接关闭时触发
   */
  @OnClose
  public void onClose(Session session) {
    // 移除用户Session
    userSessionMap.entrySet().removeIf(entry -> entry.getValue().equals(session));
    System.out.println("WebSocket连接关闭");
  }

  /**
   * 服务端主动推送消息给客户端
   */
  public static void pushMessage(String userId, String message) {
    Session session = userSessionMap.get(userId);
    if (session != null && session.isOpen()) {
      try {
        session.getBasicRemote().sendText(message);
      } catch (IOException e) {
        e.printStackTrace();
      }
    }
  }
}
```

#### 3.21 优缺点

- 优点：全双工通信（客户端↔服务端双向实时交互）、性能高（TCP 长连接，无 HTTP 头开销）、实时性最强；
- 缺点：实现复杂（需处理握手、心跳保活、断线重连）、服务端需维护大量 TCP 连接、部分防火墙可能拦截 WebSocket 连接。

#### 3.22 适用场景

即时通讯（如在线聊天、客服系统）、在线游戏、协同工具（如多人文档编辑）等需要双向交互的场景。

### 方案 6：MQTT

#### 3.23 核心原理

基于发布 / 订阅（Pub/Sub）模式的轻量级协议，构建于 TCP/IP 之上，通过 MQTT 代理（Broker）转发消息：发布者（Publisher）向指定主题（Topic）发送消息，订阅者（Subscriber）订阅主题后，Broker 将消息推送给所有订阅者。

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-497934e24911.png)

#### 3.24 代码实现（伪代码）

基于 Eclipse Paho 客户端的 MQTT 实现：

##### 1. 依赖引入（Java）

```xml
&lt;dependency&gt;
  &lt;groupId&gt;org.eclipse.paho&lt;/groupId&gt;
  &lt;artifactId&gt;org.eclipse.paho.client.mqttv3&lt;/artifactId&gt;
  &lt;version&gt;1.2.5&lt;/version&gt;
&lt;/dependency&gt;
```

##### 2. 发布者（Publisher）代码

```java
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

public class MqttPublisher {
  // MQTT Broker地址（tcp://ip:端口）
  private static final String BROKER = "tcp://localhost:1883";
  // 客户端ID（唯一）
  private static final String CLIENT_ID = "publisher-sensor-temp";
  // 主题（温度传感器数据）
  private static final String TOPIC = "/sensor/temp";
  // QoS等级（0：最多一次，1：至少一次，2：恰好一次）
  private static final int QOS = 1;

  public static void publish(String message) throws Exception {
    // 内存持久化（避免消息丢失）
    MemoryPersistence persistence = new MemoryPersistence();
    MqttClient client = new MqttClient(BROKER, CLIENT_ID, persistence);

    // 连接配置
    MqttConnectOptions options = new MqttConnectOptions();
    options.setCleanSession(true); // 清除会话
    options.setConnectionTimeout(10); // 连接超时时间
    options.setKeepAliveInterval(60); // 心跳间隔（秒）

    // 建立连接
    client.connect(options);
    System.out.println("MQTT发布者连接成功");

    // 构建消息
    MqttMessage mqttMessage = new MqttMessage(message.getBytes());
    mqttMessage.setQos(QOS);

    // 发布消息
    client.publish(TOPIC, mqttMessage);
    System.out.println("发布消息：" + message);

    // 关闭连接
    client.disconnect();
    client.close();
  }

  public static void main(String[] args) throws Exception {
    // 发布温度数据
    publish("{\"temp\":25.6,\"time\":\"2024-05-20 14:30:00\"}");
  }
}
```

##### 3. 订阅者（Subscriber）代码

```java
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

public class MqttSubscriber {
  private static final String BROKER = "tcp://localhost:1883";
  private static final String CLIENT_ID = "subscriber-temp-monitor";
  private static final String TOPIC = "/sensor/temp";
  private static final int QOS = 1;

  public static void subscribe() throws Exception {
    MemoryPersistence persistence = new MemoryPersistence();
    MqttClient client = new MqttClient(BROKER, CLIENT_ID, persistence);

    // 连接配置
    MqttConnectOptions options = new MqttConnectOptions();
    options.setCleanSession(true);
    options.setConnectionTimeout(10);
    options.setKeepAliveInterval(60);

    // 设置消息回调（接收消息后触发）
    client.setCallback(new MqttCallback() {
      @Override
      public void connectionLost(Throwable cause) {
        System.out.println("连接丢失：" + cause.getMessage());
      }

      @Override
      public void messageArrived(String topic, MqttMessage message) throws Exception {
        String content = new String(message.getPayload());
        System.out.println("收到主题[" + topic + "]的消息：" + content);
        // 更新未读消息数或业务逻辑处理
      }

      @Override
      public void deliveryComplete(IMqttDeliveryToken token) {
        // 消息投递完成回调（仅发布者需要）
      }
    });

    // 建立连接并订阅主题
    client.connect(options);
    client.subscribe(TOPIC, QOS);
    System.out.println("MQTT订阅者连接成功，订阅主题：" + TOPIC);
  }

  public static void main(String[] args) throws Exception {
    subscribe();
    // 保持线程运行
    Thread.sleep(Integer.MAX_VALUE);
  }
}
```

#### 3.25 优缺点

- 优点：轻量级（协议头小，适合带宽有限场景）、稳定可靠（支持 QoS 消息质量等级）、支持弱网环境（断网后重连可恢复消息）；
- 缺点：需额外部署 MQTT Broker（如 EMQ X、RabbitMQ）、学习成本较高、不适用于 Web 端普通消息推送场景。

#### 3.26 适用场景

物联网（IoT）设备通信（如传感器数据采集）、跨设备消息同步、弱网环境下的消息推送（如智能硬件通知）。

## 四、6 大方案对比总结

**方案**
**核心特点**
**优点**
**缺点**
**适用场景**

短轮询
定时 HTTP 请求，立即响应
实现简单，兼容所有浏览器
无效请求多，浪费资源
简单原型、小流量、低实时性需求

长轮询
hold 请求，数据更新才响应
减少无效请求，实时性较好
占用服务器连接，需处理超时
配置中心、中小型系统消息通知

iframe 流
隐藏 iframe 长连接，推脚本
实现简单
服务器开销大，用户体验差
不推荐使用（仅兼容极老浏览器）

SSE
HTTP 单向流，支持重连
简单稳定，成本低，支持事件区分
单向通信，不支持 IE
站内信、未读红点、行情推送（推荐）

WebSocket
TCP 全双工，持久连接
双向通信，性能高，实时性强
实现复杂，需心跳保活
即时通讯、在线游戏、协同工具

MQTT
发布 / 订阅，轻量级协议
稳定可靠，支持弱网、IoT
需部署 Broker，学习成本高
物联网、跨设备通信、弱网场景

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-42b83b8b7514.png)

## 五、技术选型建议（面试重点）

选型的核心逻辑：**先明确需求，再匹配方案**，避免过度设计或技术选型不当。

![image](/面试题/高频面试问题/鹏宇老师/1156-web-realtime-push-6-solutions/img-dd475a451bf7.png)

1. 只需服务端推消息（如站内信、未读红点）：优先选 SSE

- 理由：实现简单、成本低，支持断线重连，无需额外部署中间件，性价比最高。

1. 需要双向通信（如聊天、协同工具）：选 WebSocket

- 理由：全双工通信，实时性最强，性能优于其他方案，是双向交互场景的唯一选择。

1. 物联网设备通信、弱网环境：选 MQTT

- 理由：轻量级协议，支持消息质量等级，断网重连后可恢复消息，适配 IoT 设备特性。

1. 简单原型开发、小流量场景：可选短轮询

- 理由：开发速度快，无需复杂配置，适合快速验证需求，上线后可优化为 SSE / 长轮询。

1. 兼容老旧环境、过渡期需求：可选长轮询

- 理由：兼容所有浏览器，相比短轮询更省资源，可作为 SSE/WebSocket 的降级方案。

1. 尽量避免使用：iframe 流

- 理由：用户体验差，服务器开销大，已被现代方案替代，面试中可说明其局限性。

## 六、面试点睛

1. 回答 “消息推送方案” 时，先分推 / 拉模式，再展开具体方案，逻辑更清晰；
2. 被问 “为什么选 SSE 而非 WebSocket” 时，强调 “单向需求无需双向开销，实现简单、运维成本低”；
3. 高并发场景追问时，可补充：SSE/WebSocket 需结合 Nginx 负载均衡、连接池优化、消息队列削峰；
4. 记住核心选型口诀：“单向推用 SSE，双向交互用 WebSocket，IoT 用 MQTT，简单场景用短轮询”。

通过本文的详解，相信你能在面试中从容应对消息推送相关问题。图片和代码示例，无论是笔试编程还是架构设计，都能快速给出最优解！
