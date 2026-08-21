---
title: "Spring Boot SSE（二）：WebFlux 与 Flux 流式推送"
sidebarGroup: "Spring Boot"
shortTitle: "02 WebFlux SSE"
order: 2
date: 2026-08-20
category: "Java"
tag:
  - "Java"
  - "Spring Boot"
  - "SSE"
  - "WebFlux"
  - "ServerSentEvent"
  - "Reactor"
description: "对比 MVC SseEmitter 与 WebFlux Flux 两种 SSE 实现，讲解 ServerSentEvent 编码、取消/完成钩子与背压直觉，附 Spring Boot 4.1.0 可运行 Demo。"
---

> **Java · Spring Boot SSE · 第 2/2 篇**  
> 上一篇：[SSE 原理与 SseEmitter](/Java/springboot/boot-sse-01-principle-and-sseemitter)

---

## 一、MVC SseEmitter vs WebFlux Flux

上一篇用 **Spring MVC + `SseEmitter`** 实现了 SSE。本篇改用 **WebFlux + `Flux<ServerSentEvent>`**，两者推送的 wire 格式完全一致（都是 `text/event-stream`），差异在编程模型与运行时。

| 维度 | MVC · `SseEmitter` | WebFlux · `Flux<ServerSentEvent>` |
|------|---------------------|-----------------------------------|
| Starter | `spring-boot-starter-webmvc` | `spring-boot-starter-webflux` |
| 返回类型 | `SseEmitter` | `Flux<ServerSentEvent<T>>` |
| 推送方式 | 手动 `send()` + 线程池调度 | 声明式流：`interval`、`concatMap` 等 |
| 线程模型 | Servlet 容器线程 + 自建 worker | Reactor 事件循环（Netty） |
| 背压 | 无内置背压；需自行节流 | Reactor 背压协议（下游 demand 驱动） |
| 取消感知 | 依赖 `send()` 异常或 `onCompletion` | `doOnCancel` 直接感知订阅取消 |
| 适用场景 | 已有 MVC 单体、团队熟悉 Servlet | 高并发 IO、与 Reactive 栈统一 |
| Demo 端口 | `:8081` | `:8082` |

**重要原则：不要在同一个 Spring Boot 应用里混用 `webmvc` 与 `webflux` starter。** 两者会争夺默认容器与自动配置。Demo 仓库因此拆成 **两个独立后端** + 一个 React 前端，通过 Tab 切换对比。

---

## 二、`Flux<ServerSentEvent>` 代码 walkthrough

### 2.1 依赖（Boot 4.1.0）

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>4.1.0</version>
</parent>

<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
  </dependency>
</dependencies>
```

### 2.2 控制器

```java
@RestController
@RequestMapping("/api/sse")
public class SseController {

  private static final int MAX_COUNT = 10;

  @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> stream(
      @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId) {

    int start = parseResumeFrom(lastEventId);

    ServerSentEvent<String> ready = ServerSentEvent.<String>builder()
        .event("ready")
        .id("ready-0")
        .data("webflux-sse-ready@" + Instant.now())
        .build();

    Flux<ServerSentEvent<String>> ticks = Flux.interval(Duration.ofSeconds(1))
        .map(i -> start + i.intValue())
        .takeWhile(n -> n <= MAX_COUNT)
        .concatMap(n -> {
          Flux<ServerSentEvent<String>> batch = Flux.just(
              ServerSentEvent.<String>builder()
                  .event("count")
                  .id(String.valueOf(n))
                  .data("{\"n\":" + n + ",\"ts\":\"" + Instant.now() + "\"}")
                  .build());

          if (n > 0 && n % 3 == 0) {
            ServerSentEvent<String> hb = ServerSentEvent.<String>builder()
                .event("heartbeat")
                .id("hb-" + n)
                .data("ping@" + Instant.now())
                .build();
            batch = Flux.just(hb).concatWith(batch);
          }
          return batch;
        });

    ServerSentEvent<String> done = ServerSentEvent.<String>builder()
        .event("done")
        .id("done-final")
        .data("stream-finished")
        .build();

    return Flux.concat(Mono.just(ready), ticks, Mono.just(done))
        .doOnCancel(() -> log.info("WebFlux SSE cancelled by client"))
        .doOnComplete(() -> log.info("WebFlux SSE completed"))
        .doOnError(ex -> log.warn("WebFlux SSE error: {}", ex.toString()));
  }
}
```

### 2.3 几个关键设计点

**`ServerSentEvent.builder()`** —— Spring 帮你把 `event` / `id` / `data` 格式化为标准 SSE 帧，无需手工拼接字符串。

**`Flux.interval` + `takeWhile`** —— 替代 MVC 版里的 `ScheduledExecutorService` 递归调度；逻辑更声明式。

**`concatMap`** —— 每个 tick 可能产出 1～2 个事件（heartbeat + count），顺序有保证。

**生命周期钩子：**

| 钩子 | 触发时机 |
|------|----------|
| `doOnCancel` | 客户端关闭 Tab、调用 `EventSource.close()`、网络断开 |
| `doOnComplete` | 流正常发射完毕 |
| `doOnError` | 序列中发生异常 |

### 2.4 背压直觉

SSE 是**浏览器拉一条长 HTTP**，本质上以网络与客户端消费速度为上限。Reactor 的背压在 `Flux` 链内部生效：若下游（HTTP 编码器）处理不过来，上游 `interval` 会被节流。

实践中 SSE 推送频率通常不高（秒级或更低），背压问题不如 Kafka 消费那样突出；但若要做**高频 tick**（如股票行情），WebFlux 模型更容易统一限流与资源管理。

---

## 三、何时选哪种？

| 选 MVC · SseEmitter | 选 WebFlux · Flux |
|---------------------|-------------------|
| 项目已是 Spring MVC / Servlet | 项目已是 WebFlux / Gateway / R2DBC |
| 团队不熟悉 Reactive | 需要与 Reactive 管道统一 |
| 推送逻辑简单、连接数中等 | 高并发长连接、IO 密集 |
| 不想引入 Netty 栈 | 已有 Reactor 经验 |

**不要**为了 SSE 单独把 MVC 项目改成 WebFlux，反之亦然。Demo 仓库的「双后端」结构就是为了让对比实验零侵入。

---

## 四、Demo：backend-webflux + React 对比实验

仓库：[code-corey/springboot-sse-demo](https://github.com/code-corey/springboot-sse-demo)

### 4.1 启动 WebFlux 后端

```bash
cd backend-webflux
mvn spring-boot:run
```

确认日志显示端口 **8082**。

### 4.2 启动前端（若尚未运行）

```bash
cd frontend
npm install
npm run dev
```

### 4.3 对比实验步骤

1. 打开 `http://localhost:5173`  
2. 先在 **MVC · SseEmitter** Tab 连接，观察事件流与 `CLOSED` 行为  
3. 切换到 **WebFlux · Flux** Tab，再次连接  
4. 对比：事件名称、顺序、`id`、JSON `data` 格式**完全一致**  
5. 查看后端日志：MVC 打印 `MVC SSE completed`；WebFlux 打印 `WebFlux SSE completed`  
6. 中途点 **断开**，WebFlux 侧应出现 `WebFlux SSE cancelled by client`

### 4.4 curl

```bash
curl -N -H "Accept: text/event-stream" http://localhost:8082/api/sse/stream
```

与 MVC 端点输出格式相同，仅 `ready` 事件 data 前缀为 `webflux-sse-ready@…`。

### 4.5 事件约定（与 MVC 一致）

| event | 含义 |
|-------|------|
| `ready` | 连接建立后的首条命名事件 |
| `count` | 计数业务事件；`id` 为数字 |
| `heartbeat` | 心跳 |
| `done` | 收尾事件 |

`Last-Event-ID` 续传逻辑两端相同：纯数字 id 则从 `id+1` 继续。

---

## 五、共通工程笔记

无论 MVC 还是 WebFlux，上线 SSE 都要关注：

1. **反向代理缓冲** —— Nginx `proxy_buffering off`，否则事件帧被攒批，前端「假死」  
2. **超时** —— 代理 `proxy_read_timeout`、负载均衡 idle timeout、Spring `SseEmitter` 超时三者对齐  
3. **心跳** —— 定时 `heartbeat` 或 SSE 注释行，防止中间层因空闲断开  
4. **CORS** —— 前后端分离时配置允许源；WebFlux 用 `CorsWebFilter`  
5. **连接数** —— 每个 SSE 占一条长连接；评估 Tomcat `maxConnections` 或 Netty 资源  
6. **优雅结束** —— 发 `done` 再 complete，前端识别 `CLOSED`，避免误报错误  

---

## 小结

- **Wire 协议相同**，MVC 与 WebFlux 只是服务端实现风格不同  
- **`Flux<ServerSentEvent>`** 更声明式，取消/完成钩子更清晰，适合 Reactive 技术栈  
- **Demo 仓库** [code-corey/springboot-sse-demo](https://github.com/code-corey/springboot-sse-demo) 提供 `:8081` / `:8082` 双后端 + React 前端，建议本地跑一遍对比  

系列回顾：

- [第一篇：SSE 原理与 SseEmitter](/Java/springboot/boot-sse-01-principle-and-sseemitter) —— 协议细节与 MVC 实现  
- **本篇** —— WebFlux 与 Flux 流式推送  
