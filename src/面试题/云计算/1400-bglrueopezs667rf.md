---
title: "Spring AI 2.0 经典面试题 · 10 道（结合真实面试高频考点）"
sidebarGroup: "云计算"
shortTitle: "Spring AI 2.0 经典面试题 · 10 道（结合真实面试高频考点）"
order: 1400
date: 2026-07-19
category: "面试题"
tag:
  - "面试题"
description: "基于 Spring AI 2.0 官方文档 + 2025/2026 大厂 AI 应用岗真实面试趋势整理。每题标注【难度】和【面试来源】，答案聚焦 Spring AI 2.0 具体机制，不说废话。Q1：ChatClient 和 ChatMod"
article: false
---

> 来源：[Spring AI 2.0 经典面试题 · 10 道（结合真实面试高频考点）](https://www.yuque.com/tulingzhouyu/db22bv/bglrueopezs667rf)

> 基于 Spring AI 2.0 官方文档 + 2025/2026 大厂 AI 应用岗真实面试趋势整理。每题标注【难度】和【面试来源】，答案聚焦 Spring AI 2.0 具体机制，不说废话。

---

## Q1：ChatClient 和 ChatModel 有什么区别？为什么日常开发用 ChatClient？

【难度：⭐⭐】【来源：大厂高频，基本必问】

**核心区别**：

维度
ChatModel
ChatClient

层级
低层模型抽象
高层流式 API，包装 ChatModel

类比
JDBC 的 Connection
JPA 的 Repository

Prompt 组装
手动构建 Prompt 对象
`.prompt().system().user()` 链式调用

工具调用
**不自动执行**，需手动用 `ToolCallingManager` 驱动循环
`ToolCallingAdvisor` **自动执行**

工具语义
`ChatOptions.toolCallbacks()` 是 **替换**语义，覆盖默认配置
`.tools()` 是 **追加**语义，与 `.defaultTools()` 取并集

结构化输出
需手动解析
`.entity()` 一行搞定

Advisor
不支持
支持顾问链注入

**面试加分话术**：ChatModel 是"裸调用"，ChatClient 是"工程化调用"。生产环境选 ChatClient，因为工具自动执行、Advisor 链、记忆管理都封装好了。只有在需要极致控制（如自定义 Tool 循环逻辑）时才直接用 ChatModel。

---

## Q2：Advisor 顾问链的执行顺序如何影响 Tool Calling 和 Memory 的交互？

【难度：⭐⭐⭐⭐】【来源：2026 大厂真题，Spring AI 2.0 独有陷阱】

**核心机制**：Advisor 按 `getOrder()` 升序排列，`ToolCallingAdvisor` 默认 order = `HIGHEST_PRECEDENCE + 300`。

Memory Advisor 的 order 决定其在 Tool 循环的位置：

位置
条件
行为
注意事项

**循环内**
order < `DEFAULT_ORDER`
每次工具调用都会触发 Memory Advisor，能记住中间工具结果
必须 `disableInternalConversationHistory()` 避免重复；必须选支持 Tool Call 消息的仓库（InMemory/Redis/Neo4j）

**循环外**
order > `DEFAULT_ORDER`
只在最终结果时执行，只记住最终对话
不存储中间工具调用历史；省 token

**面试关键点**：

- 如果 Memory 在循环内但没设置 `disableInternalConversationHistory()`，会导致对话历史重复注入，模型被同一轮工具调用信息淹没。

- JDBC/Cassandra/MongoDB 仓库**不支持 Tool Call 消息**，如果 Memory 在循环内用了这些仓库，工具调用消息会被丢弃，模型看不到之前的工具结果。

**递归机制**：`ToolCallingAdvisor` 通过 `chain.copy(this)` 实现递归——工具结果会重新经过链中前面的 Advisor（如 Memory Advisor），这是 Spring AI 2.0 独有的设计。

---

## Q3：Spring AI 的 Tool Calling 有三种定义方式，分别适合什么场景？returnDirect 有什么作用？

【难度：⭐⭐⭐】【来源：面试鸭/面试鸭真题 + CSDN高频题】

**三种方式对比**：

方式
适用场景
特点

`@Tool` 注解
声明式，最简单
适合方法级工具，`returnDirect=true` 可直接返回工具结果不再经过模型

`MethodToolCallback`
编程式方法
运行时动态绑定方法

`FunctionToolCallback`
Lambda 式
最灵活，适合函数式接口

`returnDirect`** 机制**：

- 正常流程：模型调用工具 → 工具结果回传模型 → 模型生成最终回答

- `returnDirect=true`：模型调用工具 → **工具结果直接返回给用户**，跳过模型二次生成

- 适用场景：查询类工具（天气、汇率），结果本身就是最终答案，不需要模型再加工

**面试陷阱**：ChatClient 的 `.tools()` 是追加语义（与 `.defaultTools()` 取并集），ChatModel 的 `ChatOptions.toolCallbacks()` 是替换语义。混用会导致工具丢失。

---

## Q4：Spring AI 2.0 提供两种 RAG 实现——Naive RAG 和 Modular RAG，区别是什么？生产环境选哪个？

【难度：⭐⭐⭐⭐】【来源：AI应用岗高频RAG题 + 腾讯云面试题】

**对比**：

维度
QuestionAnswerAdvisor（Naive RAG）
RetrievalAugmentationAdvisor（Modular RAG）

流程
一步检索+生成
Pre-Retrieval → Retrieval → Post-Retrieval → Generation

查询变换
不支持
CompressionQueryTransformer / RewriteQueryTransformer / MultiQueryExpander

多路检索
不支持
可配置多个 DocumentRetriever 并行检索后合并

动态过滤
仅构建时固定
`FILTER_EXPRESSION` 上下文参数动态传递

适用场景
简单问答、Demo
生产环境、复杂检索需求

**生产选 Modular RAG 的理由**：

1. **查询变换**：多轮对话中 "那它的价格呢？" → 通过 CompressionQueryTransformer 压缩为 "iPhone 15 的价格是多少？"

1. **多路检索**：向量检索 + 关键词检索并行，覆盖语义匹配和精确匹配

1. **动态过滤**：按用户权限/租户 ID 动态过滤检索结果，`"user_id == '" + currentUserId + "'"`

**面试加分**：Naive RAG 是入门级，生产必须 Modular RAG。核心价值在于 Pre-Retrieval 阶段的查询变换——用户原话往往不是最优检索词。

---

## Q5：Spring AI 的结构化输出 `.entity()` 有什么限制？Schema 验证重试机制怎么工作？

【难度：⭐⭐⭐】【来源：面试鸭真题 + JavaUp速查】

**三大限制**：

1. `.entity()` **仅支持 **`.call()`**（同步调用）**，不支持 `.stream()`

1. 流式场景需手动解析或自定义 `StructuredOutputConverter`

1. 模型可能生成不符合 Schema 的 JSON（尤其复杂嵌套结构）

**Schema 验证重试机制**（`validateSchema()`）：

```plain
模型返回JSON → 验证是否符合Schema → 
  ├── 符合 → 返回结果
  └── 不符合 → 将错误信息作为反馈注入Prompt → 重新请求模型（最多3次）
       ├── 3次内成功 → 返回
       └── 超过3次 → 返回最后一次结果（可能不符合Schema）
```

**Provider 级别 vs Prompt 注入**：

方式
机制
准确性
适用范围

Prompt 注入（默认）
Schema 注入 Prompt 文本
依赖模型理解
所有模型

`useProviderStructuredOutput()`
API 参数强制约束
API 层保证
仅支持特定 Provider（如 OpenAI JSON mode）

**面试答题技巧**：先说限制（不支持流式），再说解决方案（Provider 级别输出 + Schema 验证重试），最后提可组合使用。

---

## Q6：Spring AI 的 Chat Memory 如何实现多用户多会话隔离？MessageWindowChatMemory 的淘汰策略有什么特别之处？

【难度：⭐⭐⭐】【来源：面试鸭 + 腾讯云面试真题】

**多用户隔离**：通过 `ChatMemory.CONVERSATION_ID` 实现——每用户每对话分配唯一 ID。

```java
chatClient.prompt()
    .user("What's my name?")
    .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, "session-123"))
    .call().content();
```

**MessageWindowChatMemory 淘汰策略**（这是面试亮点）：

不是简单移除最旧的一条，而是**在对话轮次边界处截断**：

```plain
淘汰前（maxMessages=5）：
[User, Assistant, User, Assistant, User, Assistant, User]
                                                    ^ 超出限制

淘汰后：
[User, Assistant, User]  ← 保留最近完整轮次，不会把一轮对话拆成两半
```

**仓库选择关键**：

仓库
支持 Tool Call 消息
适用场景

InMemory
✅
开发测试

JDBC (PG/MySQL)
❌
生产环境（但**不能**存工具调用消息）

Redis
✅
高速缓存 + Tool Calling

Neo4j
✅
图数据库场景

**面试陷阱**：如果你的应用用了 Tool Calling，却选了 JDBC 仓库存记忆，工具调用消息会被丢弃——模型看不到之前的工具结果，后续对话断裂。

---

## Q7：Spring AI 2.0 的 MCP 协议集成解决了什么问题？Windows 下 STDIO 传输有什么坑？

【难度：⭐⭐⭐】【来源：2026 大厂 AI Agent 面试真题 + Spring AI 官方文档陷阱】

**MCP 解决的核心问题**：标准化 AI 应用与外部工具/资源的交互协议。不再每个工具单独写适配代码，而是通过统一协议连接。

**Spring AI 2.0 MCP 三层架构**：

```plain
Application Layer（ChatClient, Tools, Resources）
    ↓
Session Layer（McpClientSession, McpServerSession，协议协商、能力声明）
    ↓
Transport Layer（STDIO / SSE / Streamable-HTTP）
```

**传输方式选择**：

传输
适用场景
特点

STDIO
本地进程、命令行工具
标准输入/输出通信

SSE
HTTP 长连接
Server-Sent Events

Streamable-HTTP
MCP 推荐方式
HTTP 请求/响应，更现代

Stateless
Serverless
无状态，每请求独立

**Windows STDIO 的坑**（这是真实踩坑题）：

- npm 安装的 MCP Server 是 `.cmd` 或 `.bat` 文件，直接调用会失败

- **必须用 **`cmd.exe /c`** 包装**：

```yaml
spring.ai.mcp.client.stdio.connections.npm-tool:
  command: cmd.exe
  args: ["/c", "npx", "@modelcontextprotocol/server-filesystem"]
```

**2.0 破坏性变更**：

- `mcp-spring-webflux/webmvc` 包名从 `io.modelcontextprotocol.sdk` 迁移到 `org.springframework.ai`

- MCP Java SDK 必须 **1.0.0+**

---

## Q8：Workflow 和 Agent 有什么本质区别？Spring AI 的 Advisor 链属于哪种？5 种 Agentic 模式怎么选？

【难度：⭐⭐⭐⭐⭐】【来源：2026 大厂 Agent 面试真题，最高频方向】

**本质区别**：

维度
Workflow（工作流）
Agent（智能体）

路径
预定义代码路径
模型动态决定路径

控制
开发者控制
模型自主控制

可预测性
高
低

灵活性
低
高

**Spring AI 的归属**：Advisor 链本质是 **Workflow**（开发者编排固定链路），Tool Calling 循环具有 **Agent** 特性（模型自主决定调什么工具、调几次）。

**5 种 Agentic 模式速选**：

模式
核心思路
适用场景

**Chain**
A→B→C 线性串行
翻译→摘要→格式化

**Parallelization**
并行执行后合并
情感分析+关键词提取+实体识别 同时做

**Routing**
分类后走不同分支
客服/技术/销售 三路分流

**Orchestrator-Workers**
LLM 动态分解子任务
复杂研究任务，子任务数量不确定

**Evaluator-Optimizer**
生成→评估→优化循环
代码审查、文档润色、翻译优化

**面试话术**：先说区别（Workflow 可预测 vs Agent 灵活），再说 Spring AI 的 Advisor 链是 Workflow、Tool Calling 是 Agent，最后说 5 种模式从简单到复杂递进，可组合使用。`StructuredOutputValidationAdvisor` 其实就是 Evaluator-Optimizer 模式的特例。

---

## Q9：RAG 权限隔离怎么做？为什么不能靠 Prompt 告诉模型"不要泄露别人的数据"？

【难度：⭐⭐⭐⭐⭐】【来源：银行/政企场景真实面试题，安全红线】

**为什么 Prompt 约束不可靠**：

- Prompt 是"建议"，模型可能忽略

- 即使模型遵守了，攻击者可通过精心构造的提问绕过

- 银行/政企面试官会直接追问：你的权限是工程级还是靠模型自觉？

**Spring AI 2.0 的正确做法——元数据前置过滤**：

1. **入库时**：文档元数据带 `tenant_id`、`role`、`department`、`owner`

1. **检索时**：从用户上下文动态生成过滤条件 → **先过滤再召回**

```java
chatClient.prompt()
    .user("查询我的文档")
    .advisors(spec -> spec.param(
        RetrievalAugmentationAdvisor.FILTER_EXPRESSION,
        "tenant_id == '" + currentTenantId + "'"
    ))
    .call().content();
```

1. **召回后**：二次权限校验——即使向量库过滤有遗漏，服务端再检查引用文档的权限

**面试加分**：Spring AI 的 `SearchRequest.filterExpression()` 和 `RetrievalAugmentationAdvisor.FILTER_EXPRESSION` 上下文参数是工程级权限方案，不依赖模型自觉。

---

## Q10：大模型接口慢，Java 线程池会被拖死吗？Spring AI 项目怎么做生产级治理？

【难度：⭐⭐⭐⭐】【来源：大厂生产排障真题，AI应用岗最高频追问】

**会拖死**——同步 Servlet 线程池有限（Tomcat 默认 200），一个模型调用可能 10-30 秒，高并发下线程池很快耗尽。

**Spring AI 治理六层模型**：

层
问题
解决方案

**入口层**
SSE 流中断
监听断开取消上游；Nginx 禁 buffering；心跳超时

**线程层**
线程池耗尽
独立线程池 / WebFlux 异步 / bulkhead 隔离

**模型层**
模型慢/超时
超时配置 + 重试 + fallback 降级到小模型

**RAG层**
越权/检索不准
元数据前置过滤 + 二次校验

**工具层**
调错业务API
Schema 约束 + 读写分离 + 写操作确认机制

**观测层**
成本突增
token 按租户拆账 + 预算熔断 + Micrometer 观测

**Spring AI 2.0 的 Observability 支持**：

观测点
名称

ChatClient 调用
`spring.ai.chat.client`

Advisor 执行
`spring.ai.advisor`

模型调用
`gen_ai.client.operation`

工具执行
`spring.ai.tool`

向量存储
`db.vector.client.operation`

**关键配置**：

- `spring.ai.chat.client.observations.log-prompt=true` — 记录提示词

- `spring.ai.chat.observations.log-completion=true` — 记录完成内容

- `spring.ai.tools.observations.include-content=true` — 记录工具内容

**面试话术**："我不会把 Spring AI 项目只讲成调 ChatClient。生产排障先看入口层 SSE 和线程池，再看模型超时限流，RAG 问题拆检索和权限，Tool Calling 问题拆 Schema 和授权，最后用 Micrometer 把 Prompt、token、工具调用串起来。这样才能定位是模型问题、业务 API 问题，还是工程治理问题。"

---

## 📊 十题考点覆盖矩阵

题号
核心考点
难度
面试来源

Q1
ChatClient vs ChatModel
⭐⭐
大厂高频必问

Q2
Advisor 顺序 + Memory/Tool 交互
⭐⭐⭐⭐
2.0 独有陷阱

Q3
Tool Calling 三种方式 + returnDirect
⭐⭐⭐
面试鸭真题

Q4
Naive RAG vs Modular RAG
⭐⭐⭐⭐
AI应用岗高频

Q5
结构化输出限制 + Schema 重试
⭐⭐⭐
面试鸭真题

Q6
Chat Memory 隔离 + 淘汰策略
⭐⭐⭐
腾讯云真题

Q7
MCP 协议 + Windows STDIO 坑
⭐⭐⭐
Agent面试真题

Q8
Workflow vs Agent + 5种模式
⭐⭐⭐⭐⭐
大厂最高频

Q9
RAG 权限隔离（工程级 vs Prompt级）
⭐⭐⭐⭐⭐
银行/政企红线

Q10
生产治理六层模型 + Observability
⭐⭐⭐⭐
大厂追问真题

---

> **备考建议**：Q1-Q3 是基础门槛（不会直接挂），Q4-Q7 是进阶区分（答好加分），Q8-Q10 是高阶实战（答出工程思维拿高分）。重点练 Q2（Advisor 顺序陷阱）、Q8（Workflow vs Agent）、Q9（权限红线）——这三道是 2026 大厂 AI 应用岗真正拉开差距的题。
