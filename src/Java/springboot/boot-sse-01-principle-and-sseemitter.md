---
title: "Spring Boot SSE（一）：协议原理与 SseEmitter"
sidebarGroup: "Spring Boot"
shortTitle: "01 SSE 原理与 SseEmitter"
order: 1
date: 2026-08-20
category: "Java"
tag:
  - "Java"
  - "Spring Boot"
  - "SSE"
  - "SseEmitter"
  - "EventSource"
description: "从 Server-Sent Events 协议与 HTTP 长连接讲起，配合 EventSource 浏览器 API，用 Spring Boot 4 的 SseEmitter 实现 MVC 流式推送，含工程实践与可运行 Demo。"
---

> **Java · Spring Boot SSE · 第 1/2 篇**  
> 下一篇：[WebFlux 与 Flux 流式推送](/Java/springboot/boot-sse-02-webflux)

---

## 开头：为什么需要 SSE？

浏览器要接收服务端「主动推送」的数据，常见方案有四类：

| 方案 | 方向 | 连接模型 | 典型场景 |
|------|------|----------|----------|
| 轮询 | 客户端 → 服务端 | 短 HTTP | 低频、容忍延迟 |
| 长轮询 | 客户端 → 服务端 | 挂起再返回 | 近似实时、实现简单 |
| **SSE** | **服务端 → 客户端** | **长 HTTP 响应** | 通知、进度、AI 流式输出 |
| WebSocket | 双向 | 独立协议升级 | 聊天、协作、游戏 |

SSE（Server-Sent Events）的定位很清晰：**基于普通 HTTP 的单向流**，浏览器原生提供 `EventSource`，无需额外协议握手，天然穿透大多数代理与 CDN，比 WebSocket 更轻量。

本系列分两篇：

1. **SSE 协议原理** + **Spring Boot 4 + `SseEmitter`（MVC）** —— 本篇  
2. **WebFlux + `Flux<ServerSentEvent>`** —— [第二篇](/Java/springboot/boot-sse-02-webflux)

配套可运行仓库：[code-corey/springboot-sse-demo](https://github.com/code-corey/springboot-sse-demo)

---

## 一、SSE 协议详解

### 1.1 本质：一条不结束的 HTTP 响应

客户端发起普通 GET（`EventSource` 只支持 GET），服务端返回：

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: ready
id: ready-0
data: mvc-sse-ready@2026-08-20T12:00:00Z

event: count
id: 1
data: {"n":1,"ts":"2026-08-20T12:00:01Z"}

```

关键点：

- **`Content-Type: text/event-stream`** —— 标识 SSE 流
- **响应体不会一次性结束** —— 连接保持打开，服务端持续写入事件帧
- **每个事件帧以空行（`\n\n`）分隔** —— 这是协议层面的「帧边界」

### 1.2 事件帧字段

| 字段 | 格式 | 说明 |
|------|------|------|
| `data` | `data: 内容` | 必填（至少一行）；多行用多个 `data:` 前缀，客户端会拼接 |
| `event` | `event: 名称` | 可选；对应 `EventSource.addEventListener('名称', …)` |
| `id` | `id: 标识` | 可选；浏览器会记住，重连时作为 `Last-Event-ID` 请求头发送 |
| `retry` | `retry: 毫秒` | 可选；建议客户端重连间隔 |
| 注释 | `: 任意内容` | 以 `:` 开头；不触发 `onmessage`，常用于心跳保活 |

示例——带心跳注释：

```text
: keep-alive ping

event: heartbeat
id: hb-3
data: ping@2026-08-20T12:00:03Z

```

注释行（`: …`）不会进入 JavaScript 事件回调，但会刷新连接活跃度，有助于穿透某些空闲超时策略。

### 1.3 EventSource 重连与 Last-Event-ID

浏览器 `EventSource` 在连接意外断开时会**自动重连**（除非调用 `close()` 或服务端正常结束）。

重连请求会携带：

```http
GET /api/sse/stream HTTP/1.1
Last-Event-ID: 5
Accept: text/event-stream
```

服务端若实现了续传逻辑，可解析 `Last-Event-ID`，从 `id + 1` 继续推送，避免客户端重复消费。

> 注意：`Last-Event-ID` 只在**自动重连**时由浏览器发送；首次连接不会有此头。

### 1.4 CORS 注意事项

当前端（如 `http://localhost:5173`）与 SSE 端点（如 `http://localhost:8081`）跨域时：

- `EventSource` 属于**简单请求**范畴，但响应头仍需允许跨域
- 服务端需返回 `Access-Control-Allow-Origin`（Demo 中已配置）
- 若走 Nginx 反代，确保**不要缓冲** SSE 响应（见下文工程笔记）

### 1.5 流结束 → onerror + readyState=CLOSED

这是初学者最容易误判的行为：

当服务端调用 `emitter.complete()` 或响应正常结束时，`EventSource` 会触发 **`onerror`**，且 **`readyState === EventSource.CLOSED`（值为 2）**。

```javascript
es.onerror = () => {
  if (es.readyState === EventSource.CLOSED) {
    // 正常结束，不是业务故障
  }
};
```

| readyState | 值 | 含义 |
|------------|-----|------|
| CONNECTING | 0 | 正在连接或自动重连 |
| OPEN | 1 | 连接已建立，可收事件 |
| CLOSED | 2 | 连接已关闭（含服务端主动 complete） |

不要把「流结束触发的 onerror」当成异常告警；应在 CLOSED 时更新 UI 状态即可。

---

## 二、Spring Boot 4.1.0 + SseEmitter（MVC）

### 2.1 依赖

Spring Boot 4 推荐使用 `spring-boot-starter-webmvc`（`spring-boot-starter-web` 仍可用但已标记 deprecated）：

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>4.1.0</version>
</parent>

<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc</artifactId>
  </dependency>
</dependencies>
```

### 2.2 控制器示例

核心思路：方法返回 `SseEmitter`，在**异步线程**中循环 `send()`，最后 `complete()`。

```java
@RestController
@RequestMapping("/api/sse")
public class SseController {

  private static final long TIMEOUT_MS = 30_000L;
  private static final int MAX_COUNT = 10;

  private final ScheduledExecutorService scheduler =
      Executors.newScheduledThreadPool(4, r -> {
        Thread t = new Thread(r, "sse-mvc-worker");
        t.setDaemon(true);
        return t;
      });

  @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter stream(
      @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId) {

    SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
    AtomicInteger next = new AtomicInteger(parseResumeFrom(lastEventId));

    emitter.onCompletion(() -> log.info("MVC SSE completed"));
    emitter.onTimeout(() -> {
      log.warn("MVC SSE timeout");
      emitter.complete();
    });
    emitter.onError(ex -> log.warn("MVC SSE error: {}", ex.toString()));

    try {
      emitter.send(SseEmitter.event()
          .name("ready")
          .id("ready-0")
          .data("mvc-sse-ready@" + Instant.now()));
    } catch (IOException e) {
      emitter.completeWithError(e);
      return emitter;
    }

    scheduleNext(emitter, next);
    return emitter;
  }

  private void scheduleNext(SseEmitter emitter, AtomicInteger next) {
    scheduler.schedule(() -> {
      int n = next.getAndIncrement();
      try {
        if (n > MAX_COUNT) {
          emitter.send(SseEmitter.event().name("done").id("done-" + n).data("stream-finished"));
          emitter.complete();
          return;
        }
        if (n > 0 && n % 3 == 0) {
          emitter.send(SseEmitter.event().name("heartbeat").id("hb-" + n)
              .data("ping@" + Instant.now()));
        }
        emitter.send(SseEmitter.event().name("count").id(String.valueOf(n))
            .data("{\"n\":" + n + ",\"ts\":\"" + Instant.now() + "\"}"));
        scheduleNext(emitter, next);
      } catch (IOException | IllegalStateException ex) {
        emitter.completeWithError(ex);
      }
    }, 1, TimeUnit.SECONDS);
  }
}
```

`produces = MediaType.TEXT_EVENT_STREAM_VALUE` 等价于 `text/event-stream`，Spring 会保持响应打开并逐帧刷出。

### 2.3 工程实践要点

| 主题 | 建议 |
|------|------|
| **线程池** | `send()` 不能在请求线程里阻塞循环；用 `ScheduledExecutorService`、虚拟线程或 `@Async` 推送 |
| **超时** | `new SseEmitter(timeoutMs)` 到期触发 `onTimeout`；生产环境按业务设置，并配合心跳 |
| **心跳** | 定时发送 `heartbeat` 事件或 SSE 注释行（`: ping`），防止中间层空闲断开 |
| **客户端断开** | `send()` 抛 `IOException` / `IllegalStateException` 时调用 `completeWithError` 或 `complete`，释放资源 |
| **Nginx 反代** | 必须 `proxy_buffering off;`、`proxy_read_timeout` 足够大、`X-Accel-Buffering: no` |
| **CORS** | 跨域前端需配置 `WebMvcConfigurer.addCorsMappings` 或 `@CrossOrigin` |

Nginx 片段参考：

```nginx
location /api/sse/ {
    proxy_pass http://backend;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_set_header Connection '';
    chunked_transfer_encoding off;
}
```

---

## 三、Demo 动手：backend-mvc + React 前端

完整代码见 [code-corey/springboot-sse-demo](https://github.com/code-corey/springboot-sse-demo)。

### 3.1 克隆与启动

```bash
git clone https://github.com/code-corey/springboot-sse-demo.git
cd springboot-sse-demo
```

**终端 1 — MVC 后端（8081）：**

```bash
cd backend-mvc
mvn spring-boot:run
```

**终端 2 — 前端（5173）：**

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 Vite 提示地址（通常 `http://localhost:5173`）。

### 3.2 页面操作

1. 切换到 **MVC · SseEmitter** Tab  
2. 点击 **连接**  
3. 观察事件顺序：`ready` → `count`（约每秒）→ 每 3 条穿插 `heartbeat` → `done`  
4. 流结束后日志出现 `onerror · readyState=CLOSED` —— **正常现象**  
5. 打开 Chrome DevTools → **Network** → 选中 `stream` → 确认 `Content-Type: text/event-stream`，Response 面板持续追加帧

### 3.3 curl 查看裸协议

```bash
curl -N -H "Accept: text/event-stream" http://localhost:8081/api/sse/stream
```

`-N` 关闭 curl 缓冲，可实时看到 `\n\n` 分隔的事件帧。

### 3.4 事件约定

| event | 含义 |
|-------|------|
| `ready` | 连接建立后的首条命名事件 |
| `count` | 计数业务事件；`id` 为数字，支持 `Last-Event-ID` 续传 |
| `heartbeat` | 心跳事件 |
| `done` | 服务端主动结束前的收尾事件 |

---

## 小结

- SSE 是**基于 HTTP 的单向流**，协议简单、浏览器原生支持、穿透性好  
- `SseEmitter` 适合 **Spring MVC 技术栈**，注意异步推送、超时、心跳与代理缓冲  
- 流正常结束时 `EventSource.onerror` + `CLOSED` 是预期行为，勿当故障  

下一篇我们将对比 **WebFlux + `Flux<ServerSentEvent>`** 的写法，以及何时该选 MVC 还是 Reactive：[Spring Boot SSE（二）：WebFlux 与 Flux 流式推送](/Java/springboot/boot-sse-02-webflux)
