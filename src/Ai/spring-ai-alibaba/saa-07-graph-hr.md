---
title: "7.Spring Ai Alibaba Graph《Hr招聘全流程workflow-agent实战》"
sidebarGroup: "Spring AI Alibaba"
shortTitle: "7.Spring Ai Alibaba Graph《Hr招聘全流程workflow-agent实战》"
order: 8
date: 2026-07-27
category: "AI"
tag:
  - "Spring AI Alibaba"
  - "Agent"
description: "课程定位：以 HR 招聘全流程 Agent 项目为实战案例，串讲 22 个技术点项目代码："
---

> 来源：[7.Spring Ai Alibaba Graph《Hr招聘全流程workflow-agent实战》](https://www.yuque.com/geren-t8lyq/sk9iuh/by70eyy04s4dhqyt?singleDoc#)  
> 配套代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs.git

![image](/Ai/spring-ai-alibaba/saa-07-graph-hr/img-001.png)

![image](/Ai/spring-ai-alibaba/saa-07-graph-hr/img-002.png)

**课程定位**：以 HR 招聘全流程 Agent 项目为实战案例，串讲 22 个技术点

**项目代码：**[链接](https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/hr-recruitment-agent)

## **Alibaba Graph 全技术点清单（共 20 个）**

## 附录 B：基础示例场景索引

以下是各知识点使用的基础示例场景，方便回顾：

## 附录 C：项目文件结构速查

```plain
src/main/java/com/example/
├── workflow/
│   └── HrRecruitmentWorkflow.java     ← 核心：StateGraph构建 + HITL内部类 + Mermaid
├── hr/
│   ├── HrRecruitmentApplication.java  ← Spring Boot 启动类
│   ├── controller/
│   │   └── HrRecruitmentController.java  ← REST API + HITL续传 + SSE + 时间旅行
│   ├── config/
│   │   ├── AiConfig.java              ← DashScope ChatModel 配置
│   │   ├── WebConfig.java             ← CORS 配置
│   │   └── WorkflowConfig.java        ← CompiledGraph Bean 装配
│   ├── nodes/                         ← 17个 NodeAction 实现
│   ├── hooks/                         ← Agent框架 Hook（非 Graph 生命周期）
│   ├── tools/                         ← FunctionToolCallback 工具
│   └── model/                         ← 数据模型
├── agents/                            ← ReactAgent 版本（已废弃，保留教学对比）
```

## 项目：HR 行业 - 招聘全流程自动化与人才智能匹配 Agent

### 业务流程设计

![diagram](/Ai/spring-ai-alibaba/saa-07-graph-hr/diagram-003.svg)

---

## StateGraph图的基础定义

![image.png](/Ai/spring-ai-alibaba/saa-07-graph-hr/img-004.png)

**核心问题**：为什么我们需要"图"来编排 AI Agent？写个 if-else 不行吗？

**答案**：if-else 能处理线性流程，但 AI Agent 的流程是**有状态的、可中断的、可分支的**。图把"做什么"（节点）和"去哪里"（边）解耦，让复杂流程可观测、可暂停、可恢复。

### 💡 为什么需要这个 ？

StateGraph 是一切的基础。你要先有一个"画布"，才能往上面放节点和边。就像你要先有一个类定义，才能往里面加字段和方法。

### 📖 框架核心

`StateGraph` 是图的定义类，创建时必须传入 `KeyStrategyFactory`——它定义了图里有哪些状态字段、每个字段怎么合并。

```java
// 匿名图
new StateGraph(keyStrategyFactory)

// 命名图（在 Mermaid 可视化中更清晰）
new StateGraph("HrGraph", keyStrategyFactory)
```

**关键操作链**：`new StateGraph` → `addNode` + `addEdge` → `.compile()` → 得到 `CompiledGraph`

**为什么必须编译？** 编译不是"优化"，而是**校验**——检查有没有孤立节点、死循环等结构问题。编译时还可以指定检查点器、中断点等运行时参数。

### 🧪 基础示例：一个最简单的图

**场景**：打招呼 — 你说什么，我回什么。两个节点，一条顺序边。

```java
// 1. 定义状态合并策略（只有一个字段，用 ReplaceStrategy）
KeyStrategyFactory strategy = () -> Map.of(
    "greeting", new ReplaceStrategy()
);

// 2. 创建图
StateGraph graph = new StateGraph("HelloGraph", strategy)
    .addNode("greet", node_async(state -> {
        String name = state.value("name").map(Object::toString).orElse("World");
        return Map.of("greeting", "Hello, " + name + "!");
    }))
    .addNode("farewell", node_async(state -> {
        String greeting = state.value("greeting").map(Object::toString).orElse("");
        return Map.of("greeting", greeting + " Goodbye!");
    }))
    .addEdge(START, "greet")
    .addEdge("greet", "farewell")
    .addEdge("farewell", END);

// 3. 编译
CompiledGraph compiled = graph.compile();

// 4. 执行
Optional<OverAllState> result = compiled.invoke(Map.of("name", "Alice"), RunnableConfig.builder().build());
result.get().value("greeting").ifPresent(System.out::println);
// 输出：Hello, Alice! Goodbye!
```

**运行过程**：`START → greet → farewell → END`

🎯 **动手练习**：把 `name` 改成你的名字，观察输出。然后试着把 `farewell` 节点删掉，看编译报什么错。

### 🔍 项目落地

项目中有两个 StateGraph：

子图匿名、主图命名——这个选择有讲究：主图在 Mermaid 可视化中需要名称来标识，子图作为嵌入节点不需要自己露脸。

## 节点与动作

### 💡 节点是什么？

**节点 = 干活的人**。每个节点就是一个函数：读状态 → 干活 → 写状态。框架不关心你节点里做什么（调 LLM、查数据库、发邮件都行），它只管三件事：

1. 把当前状态传给你
2. 你返回一个更新 Map
3. 框架用 KeyStrategy 把你的更新合并到全局状态

### 📖 框架核心 — 三种节点接口

**适配器**：`node_async(new SomeNodeAction())` 可把同步 NodeAction 包装成 AsyncNodeAction。绝大多数节点用这个就够了。

### 🧪 基础示例：三种节点写法

**场景**：一个"学生成绩处理"流程 — 三个节点，分别用三种接口

```java
// ─── 方式1：NodeAction（同步，最简单）───
public class InputScoreNode implements NodeAction {
    @Override
    public Map<String, Object> apply(OverAllState state) {
        // 纯同步：直接从状态读，直接返回
        String studentName = state.value("studentName").map(Object::toString).orElse("匿名");
        int score = state.value("rawScore").map(v -> (int) v).orElse(0);
        return Map.of("studentName", studentName, "score", score);
    }
}

// ─── 方式2：AsyncNodeAction（异步）───
public class FetchStandardNode implements AsyncNodeAction {
    @Override
    public CompletableFuture<Map<String, Object>> apply(OverAllState state) {
        // 模拟异步查询数据库获取及格线
        return CompletableFuture.supplyAsync(() -> {
            // 假装查了数据库
            int passingScore = 60;
            return Map.of("passingScore", passingScore);
        });
    }
}

// ─── 方式3：AsyncNodeActionWithConfig（需要运行时配置）───
public class JudgeNode implements AsyncNodeActionWithConfig {
    @Override
    public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
        // 可以读取 config 中的 threadId、metadata 等
        String threadId = config.threadId();
        System.out.println("处理会话: " + threadId);

        int score = state.value("score").map(v -> (int) v).orElse(0);
        int passingScore = state.value("passingScore").map(v -> (int) v).orElse(60);
        String result = score >= passingScore ? "PASS" : "FAIL";
        return CompletableFuture.completedFuture(Map.of("judgeResult", result));
    }
}

// ─── 组装图 ───
StateGraph graph = new StateGraph("ScoreGraph", strategy)
    .addNode("input_score", node_async(new InputScoreNode()))       // NodeAction → 用 node_async 包装
    .addNode("fetch_standard", new FetchStandardNode())             // AsyncNodeAction → 直接用
    .addNode("judge", new JudgeNode())                              // AsyncNodeActionWithConfig → 直接用
    .addEdge(START, "input_score")
    .addEdge("input_score", "fetch_standard")
    .addEdge("fetch_standard", "judge")
    .addEdge("judge", END);
```

官方推荐：

```java

        var nodeA = node_async(state -> {
            return Map.of("value", "AAA");
        });
```

🎯 **关键理解**：三种接口能力递增——NodeAction 最简单但只能做同步；需要异步就加 CompletableFuture；需要读 threadId/metadata 就加 RunnableConfig 参数。

### 🔍 项目落地 — 17+2+2 个节点

**17 个独立 NodeAction 类**（都在 `hr/nodes/` 下，通过 `node_async()` 包装）：

```plain
ParseResumeNode      → 解析简历        → AI 调用
ScreenResumeNode     → 硬性指标初筛     → 纯逻辑
FrontendScorerNode   → 前端技能评分    → AI 调用
JavaScorerNode       → Java 技能评分   → AI 调用
AlgorithmScorerNode  → 算法技能评分    → AI 调用
ExperienceScorerNode → 工作经验评分    → AI 调用
CultureScorerNode    → 文化契合度评分   → AI 调用
ScoreAggregatorNode  → 汇总评分→等级   → 纯逻辑
GenerateQuestionsNode→ 生成面试题      → AI 调用
SendQuestionsNode    → 发送面试题      → 纯逻辑
AnswerScoreNode      → 笔试答案评分    → AI 调用
HrInterviewNode      → HR 一面        → AI 调用
TechInterviewNode    → 技术二面       → AI 调用
FinalInterviewNode   → VP 终面        → AI 调用
OfferGeneratorNode   → 生成 Offer 方案 → AI 调用
SendRejectionNode    → 生成拒信       → AI 调用
SendOfferNode        → 生成录用通知    → AI 调用
```

**2 个 HITL 节点**（`AsyncNodeActionWithConfig` + `InterruptableAction`）：

- `CandidateSubmitHitlNode` — `HrRecruitmentWorkflow.java:357` — 等待候选人提交答案
- `OfferApprovalHitlNode` — `HrRecruitmentWorkflow.java:391` — 等待 HR 审批 Offer

**2 个 Lambda 匿名节点**：

- `eval_reject`（L221）— 笔试不通过 → 写入 REJECT 状态
- `background_decision`（L236）— 面试结果 → 背调 pass/fail 决策

> 为什么不用ReactAgent做为Node：项目里 `com/example/agents/` 下有 9 个废弃的 ReactAgent 版本。ReactAgent 是"黑盒"——Mermaid 图只显示 1 个节点，看不到内部逻辑。NodeAction 版本把每个步骤拆成独立节点，Mermaid 图一目了然。这就是 Graph 的核心价值——可观测性。

## 全局状态 — OverAllState

### 💡 为什么需要共享状态？

AI Agent 的每一步都需要前一步的结果。比如"评分"节点需要"简历"数据，"出题"节点需要"评分等级"。如果每个节点独立传参，参数会爆炸。OverAllState 就是一个**所有节点共享的笔记本**——谁都能读，谁都能写。

### 📖 框架核心

**读**：`state.value("key")` → `Optional`

**写**：节点返回 `Map`，框架按 KeyStrategy 自动合并到 OverAllState。**节点永远不直接修改状态，只返回"更新指令"**——这是函数式思维的核心。

### 🧪 基础示例：状态的读写

**场景**：一个"文本处理器" — 展示节点间如何通过 OverAllState 传递数据

```java
KeyStrategyFactory strategy = () -> Map.of(
    "text", new ReplaceStrategy(),
    "wordCount", new ReplaceStrategy(),
    "summary", new ReplaceStrategy()
);

StateGraph graph = new StateGraph("TextProcessor", strategy)
    // 节点1：读取 text，计算字数，写入 wordCount
    .addNode("count_words", node_async(state -> {
        String text = state.value("text").map(Object::toString).orElse("");
        return Map.of("wordCount", text.split("\\s+").length);
    }))
    // 节点2：读取 text，生成摘要，写入 summary
    .addNode("summarize", node_async(state -> {
        String text = state.value("text").map(Object::toString).orElse("");
        String summary = text.length() > 20 ? text.substring(0, 20) + "..." : text;
        return Map.of("summary", summary);
    }))
    // 节点3：读取所有中间结果，生成最终报告
    .addNode("report", node_async(state -> {
        int count = state.value("wordCount").map(v -> (int) v).orElse(0);
        String summ = state.value("summary").map(Object::toString).orElse("无");
        System.out.println("字数: " + count + ", 摘要: " + summ);
        return Map.of();  // 不写入任何状态，只是消费
    }))
    .addEdge(START, "count_words")
    .addEdge("count_words", "summarize")
    .addEdge("summarize", "report")
    .addEdge("report", END);

// 执行
graph.compile().invoke(
    Map.of("text", "Spring AI Alibaba Graph is a powerful framework for building AI agents"),
    RunnableConfig.builder().build()
);
```

🎯 **核心观察**：

- `count_words` 只读了 `text`，写了 `wordCount`
- `summarize` 只读了 `text`，写了 `summary`
- `report` 只读了 `wordCount` 和 `summary`，不写任何字段
- **每个节点只关心自己需要的字段，互不干扰**

### 🔍 项目落地 — 主图状态字段一览

**教学建议**：不要让学生背这张表。挑 3-4 个关键字段讲清楚读写关系，其他的让学生自己读代码。

**设计原则**（来自框架文档）：

1. **状态存原始数据，不存格式化文本**——不同节点可以按需格式化同一份数据
2. **能派生的不存储**——如果某个值可以从其他状态计算出来，就别存

## 状态合并策略 — AppendStrategy / ReplaceStrategy / KeyStrategyFactory

### 💡 为什么需要合并策略？

当多个节点**同时写同一个 key**（比如并行评分节点都写 `skill_score`），框架怎么处理？覆盖？追加？这就是 KeyStrategy 要回答的问题。

### 📖 框架核心

**KeyStrategyFactory** 是一个 `Supplier>`——定义图里每个 key 用什么策略。

### 🧪 基础示例：Replace vs Append 对比

**场景**：两个节点写同一个 key，看策略不同导致结果不同

```java
// ─── 替换策略 ───
KeyStrategyFactory replaceStrategy = () -> Map.of(
    "result", new ReplaceStrategy()
);

StateGraph replaceGraph = new StateGraph("ReplaceDemo", replaceStrategy)
    .addNode("step1", node_async(state -> Map.of("result", "第一步结果")))
    .addNode("step2", node_async(state -> Map.of("result", "第二步结果")))
    .addEdge(START, "step1")
    .addEdge("step1", "step2")
    .addEdge("step2", END);

replaceGraph.compile().invoke(Map.of(), RunnableConfig.builder().build());
// result = "第二步结果"  ← 后写覆盖前写

// ─── 追加策略 ───
KeyStrategyFactory appendStrategy = () -> Map.of(
    "result", new AppendStrategy()
);

StateGraph appendGraph = new StateGraph("AppendDemo", appendStrategy)
    .addNode("step1", node_async(state -> Map.of("result", "第一步结果")))
    .addNode("step2", node_async(state -> Map.of("result", "第二步结果")))
    .addEdge(START, "step1")
    .addEdge("step1", "step2")
    .addEdge("step2", END);

appendGraph.compile().invoke(Map.of(), RunnableConfig.builder().build());
// result = ["第一步结果", "第二步结果"]  ← 追加成列表
```

🎯 **选择指南**：

- 只有一个节点会写这个 key？→ **Replace**
- 多个节点会写这个 key，都要保留？→ **Append**
- 不确定？→ 默认 Replace，遇到数据丢失再改 Append

### 🔍 项目落地

**子图策略**

复制

```java
KeyStrategyFactory subKeyStrategy = () -> Map.ofEntries(
    Map.entry("status", new ReplaceStrategy()),
    // ... 13 个 ReplaceStrategy ...
    Map.entry("messages", new AppendStrategy())  // ← 唯一的 AppendStrategy
);
```

**主图策略**

```java
KeyStrategyFactory mainKeyStrategy = () -> Map.ofEntries(
    Map.entry("status", new ReplaceStrategy()),
    // ... 31 个 ReplaceStrategy ...
    Map.entry("messages", new AppendStrategy())  // ← 唯一的 AppendStrategy
);
```

**为什么 **`messages`** 用 Append？** 因为多个节点可能先后写入对话消息——parse_resume 写一条，scorer 写一条……你要的是"全保留"，不是"后面的覆盖前面的"。其他字段都是单写，所以用 Replace。

# 边与路由

**核心问题**：节点干完活了，下一步去哪？这就是"边"要回答的。

**类比**：节点是"路口"，边是"路牌"——顺序边写死了"前方直行"，条件边是"看路标左转/右转"。

---

## 顺序边 — addEdge

### 💡 最简单的路由

`addEdge(A, B)` = "A 干完了一定去 B"，没有分支，没有判断。就像流水线上的传送带。

**特殊节点**：`StateGraph.START`（图入口）和 `StateGraph.END`（图终端）。

### 🧪 基础示例：线性流程

**场景**：一个"审批流" — 提交 → 审查 → 批准，最经典的顺序流程

```java
KeyStrategyFactory strategy = () -> Map.of(
    "document", new ReplaceStrategy(),
    "reviewComment", new ReplaceStrategy(),
    "approvalStatus", new ReplaceStrategy()
);

StateGraph graph = new StateGraph("ApprovalFlow", strategy)
    .addNode("submit", node_async(state -> {
        String doc = state.value("document").map(Object::toString).orElse("空文档");
        System.out.println("📄 提交文档: " + doc);
        return Map.of("document", doc);
    }))
    .addNode("review", node_async(state -> {
        String doc = state.value("document").map(Object::toString).orElse("");
        System.out.println("🔍 审查文档: " + doc);
        return Map.of("reviewComment", "文档格式正确");
    }))
    .addNode("approve", node_async(state -> {
        String comment = state.value("reviewComment").map(Object::toString).orElse("");
        System.out.println("✅ 批准，审查意见: " + comment);
        return Map.of("approvalStatus", "APPROVED");
    }))
    // 三条顺序边，一条直线
    .addEdge(START, "submit")
    .addEdge("submit", "review")
    .addEdge("review", "approve")
    .addEdge("approve", END);

graph.compile().invoke(Map.of("document", "请假申请"), RunnableConfig.builder().build());
```

**控制台输出**：

```plain
📄 提交文档: 请假申请
🔍 审查文档: 请假申请
✅ 批准，审查意见: 文档格式正确
```

🎯 **动手练习**：在 `review` 和 `approve` 之间插入一个 `legal_check`（法务审核）节点，看怎么加边。

### 🔍 项目落地

**子图顺序边**（L160-163）：

```plain
score_aggregator → gen_questions → send_questions → END
```

评估汇总完 → 出面试题 → 发给候选人 → 结束。一条直线，没有分支。

**主图顺序边**：

```plain
START → parse_resume → screen_resume        ← 入口流程
hr_interview → tech_interview → final_interview  ← 面试三轮，固定顺序
offer_gen → offer_approval                  ← 生成 Offer → 审批
reject → END / send_offer → END            ← 两条终点路径
```

> ⚠️提醒
> 顺序边看似简单，但有个**隐藏功能**：当同一个源节点有**多条顺序边指向不同目标**时，框架自动将这些目标识别为**并行执行**

## 条件边 — addConditionalEdges

> 💡 什么时候用条件边？
> 当"下一步去哪"取决于**运行时的状态**时。比如初筛结果——通过了走评估流程，没通过走拒信流程。

### 📖 框架核心

```java
graph.addConditionalEdges(
    "source_node",                    // 源节点
    edge_async(state -> {             // 路由函数：读状态 → 返回路由 key
        String decision = state.value("next_node").map(Object::toString).orElse("");
        return decision;
    }),
    Map.of(                           // 路由表：key → 目标节点
        "PASS", "deep_eval",
        "REJECT", "reject"
    )
);
```

**三要素**：源节点、路由函数（`AsyncEdgeAction`）、路由表（`Map`）

### 🧪 基础示例：根据分数走不同路径

![diagram](/Ai/spring-ai-alibaba/saa-07-graph-hr/diagram-005.svg)

**场景**：学生成绩判定 — 分数 ≥ 60 走"通过"分支，< 60 走"补考"分支

```java
KeyStrategyFactory strategy = () -> Map.of(
    "score", new ReplaceStrategy(),
    "next_node", new ReplaceStrategy(),    // ← 路由决策字段
    "result", new ReplaceStrategy()
);

StateGraph graph = new StateGraph("ScoreJudge", strategy)
    .addNode("check_score", node_async(state -> {
        int score = state.value("score").map(v -> (int) v).orElse(0);
        // 节点写决策，边读决策 → 读写分离
        String decision = score >= 60 ? "PASS" : "FAIL";
        return Map.of("next_node", decision);
    }))
    .addNode("pass", node_async(state -> {
        return Map.of("result", "🎉 恭喜通过！");
    }))
    .addNode("fail", node_async(state -> {
        return Map.of("result", "📖 需要补考");
    }))
    .addEdge(START, "check_score")
    // 条件边：check_score 完成后，根据 next_node 的值决定走哪条路
    .addConditionalEdges(
        "check_score",
        edge_async(state -> state.value("next_node").map(Object::toString).orElse("FAIL")),
        Map.of("PASS", "pass", "FAIL", "fail")
    )
    .addEdge("pass", END)
    .addEdge("fail", END);

// 测试1：通过
graph.compile().invoke(Map.of("score", 85), RunnableConfig.builder().build());
// result = "🎉 恭喜通过！"

// 测试2：补考
graph.compile().invoke(Map.of("score", 45), RunnableConfig.builder().build());
// result = "📖 需要补考"
```

🎯 **设计模式**：

- `check_score` 节点只负责**写入决策**（`next_node`）
- 条件边只负责**读取决策**并路由
- **读写分离**——节点不关心"去哪"，边不关心"为什么去"

### 🔍 项目落地 — 6 处条件边

**设计模式**：每个条件边都是 `edge_async(state -> ...)` 形式的 Lambda，从 OverAllState 中读取**决策字段**，返回路由 key。这个"决策字段"通常由上游节点写入——节点写决策，边读决策，**读写分离**。

> ⚠️ 提醒
> **常见错误**：路由函数返回了一个路由表里没有的 key。框架会抛异常。所以路由表必须覆盖所有可能的返回值。
> **对比条件入口点**：条件边也可以加在 `START` 节点上——项目子图就是这么做的，根据岗位方向决定第一个执行哪个评分器。

## 并行边

> 💡 怎么让多个节点同时跑？
> **你不需要声明"这是并行"**。只需要给同一个源节点加多条出边指向不同目标，框架自动识别为并行。
> 框架检测到"多个节点指向同一个汇聚节点"时，自动生成隐式的 `ParallelNode`，确保所有分支都完成后才继续。

### 📖 框架核心

```plain
     ┌─ frontend_scorer  ─┐
     ├─ java_scorer ──────┤
START┤                    ├→ score_aggregator → ...
     ├─ algorithm_scorer ─┤
     ├─ experience_scorer ┤
     └─ culture_scorer ───┘
```

**限制**（来自框架文档）：

- 仅支持 **Fork-Join** 模型（先分叉后汇聚）
- 仅允许**一层并行步骤**（不能在并行分支里再套并行）
- **不配置 Executor 时，并行节点会被顺序调度**——必须通过 `RunnableConfig.addParallelNodeExecutor()` 提供 Executor 才能真正并发

### 🧪 基础示例：并行处理

**场景**：一份文档同时做三件事——字数统计、关键词提取、语言检测，三件事都做完再汇总

```java
KeyStrategyFactory strategy = () -> Map.of(
    "text", new ReplaceStrategy(),
    "wordCount", new ReplaceStrategy(),
    "keywords", new ReplaceStrategy(),
    "language", new ReplaceStrategy(),
    "report", new AppendStrategy()    // ← 多个节点都写 report，用 Append
);

StateGraph graph = new StateGraph("DocAnalyzer", strategy)
    // 三个并行节点
    .addNode("count_words", node_async(state -> {
        String text = state.value("text").map(Object::toString).orElse("");
        return Map.of("wordCount", text.split("\\s+").length);
    }))
    .addNode("extract_keywords", node_async(state -> {
        String text = state.value("text").map(Object::toString).orElse("");
        return Map.of("keywords", "Spring, AI, Graph");  // 简化
    }))
    .addNode("detect_language", node_async(state -> {
        return Map.of("language", "Java");  // 简化
    }))
    // 汇总节点
    .addNode("summarize", node_async(state -> {
        int wc = state.value("wordCount").map(v -> (int) v).orElse(0);
        String kw = state.value("keywords").map(Object::toString).orElse("");
        String lang = state.value("language").map(Object::toString).orElse("");
        System.out.println("汇总: 字数=" + wc + ", 关键词=" + kw + ", 语言=" + lang);
        return Map.of();
    }))
    // 并行边：START 分三路，三条边汇聚到 summarize
    .addEdge(START, "count_words")
    .addEdge(START, "extract_keywords")
    .addEdge(START, "detect_language")
    .addEdge("count_words", "summarize")
    .addEdge("extract_keywords", "summarize")
    .addEdge("detect_language", "summarize")
    .addEdge("summarize", END);

// 执行（需要配置 Executor 才能真正并行）
RunnableConfig config = RunnableConfig.builder()
    .addParallelNodeExecutor(START,ForkJoinPool.commonPool())
    .build();
graph.compile().invoke(Map.of("text", "Spring AI Alibaba Graph framework"), config);

```

🎯 **关键观察**：

- `START → count_words`、`START → extract_keywords`、`START → detect_language` — 三条边从同一源出发 = **并行**
- 三条边都指向 `summarize` = **汇聚点**
- 框架自动等三个并行节点全部完成，才执行 `summarize`
- 当你需要自定义线程池， 可以通过自行配置Executor

### 动态并行边

需求： 根据上一个state结果， 决定并行的节点，可以采用addParallelConditionalEdges

```java
 // 添加并行条件边  
    .addParallelConditionalEdges("router",   
        AsyncMultiCommandAction.node_async((state, config) ->   
            new MultiCommand(List.of("count_words", "extract_keywords", "detect_language"))  
        ),  
        Map.of(  
            "count_words", "count_words",  
            "extract_keywords", "extract_keywords",  
            "detect_language", "detect_keywords"  
        )  
    )  
```

缺点：对于并行节点，返回的节点目标， 必须是同一个目标。

#### 巧用透明节点+条件边，开启并行：

```java
 // 透明节点，用于启动并行执行
                .addNode("parallel_branch", node_async(state -> Map.of()))
                // 并行边：START 分三路，三条边汇聚到 summarize
                .addEdge(START, "count_words")
                .addConditionalEdges("count_words",
                        AsyncEdgeAction.edge_async(state -> {
                            Integer wordCount = (Integer) state.value("wordCount").orElse(0);
                            return wordCount > 3 ? "parallel_branch":END;
                        }),
                        EdgeMappings.builder().to("parallel_branch").toEND().build())
```

### 🔍 项目落地

**子图 5 路并行评分**（L154-158）：

```java
deepEvalGraph.addEdge("frontend_scorer", "score_aggregator");
deepEvalGraph.addEdge("java_scorer", "score_aggregator");
deepEvalGraph.addEdge("algorithm_scorer", "score_aggregator");
deepEvalGraph.addEdge("experience_scorer", "score_aggregator");
deepEvalGraph.addEdge("culture_scorer", "score_aggregator");
```

**实际执行逻辑**：

1. 条件边路由到**某一个**技能评分器（如 `frontend_scorer`）
2. `experience_scorer` 和 `culture_scorer` **始终执行**
3. 被路由选中的技能评分器 + 2 个通用评分器 = **3 个节点并行**
4. 全部完成后汇合到 `score_aggregator`

### ⚠️ 提醒

> **一定要注意**：并行边 + 条件边的组合，产生了"部分并行"的效果——不是所有 5 个评分器都跑，而是 1 个技能评分器 + 2 个通用评分器并行。这是实际项目中最常见的并行模式。
> **踩坑**：如果不配置 Executor，并行节点实际上会**串行执行**！

## 命令动作路由 — CommandAction / AsyncCommandAction

### 💡 和条件边有什么区别？

效果都是一样的：

![diagram](/Ai/spring-ai-alibaba/saa-07-graph-hr/diagram-006.svg)

### 📖 框架核心

```java
// 条件边模式：节点只管写状态，边读状态路由
graph.addConditionalEdges("nodeA", edge_async(state -> state.value("next").orElse("B")), Map.of("B","B","C","C"));

// CommandAction 模式：节点自己决定去哪
public class NodeA implements AsyncCommandAction {
    @Override
    public CompletableFuture<Command> apply(OverAllState state) {
        return CompletableFuture.completedFuture(
            new Command(Map.of("result", "done"), "nodeB")  // 状态更新 + 路由目标
        );
    }
}
```

**优劣对比**：

### 🧪 基础示例：CommandAction 实现条件路由

**场景**：用 CommandAction 重写上面的"分数判定"示例——节点自己决定去哪

```java
public class CheckScoreNode implements AsyncCommandAction {
    @Override
    public CompletableFuture<Command> apply(OverAllState state) {
        int score = state.value("score").map(v -> (int) v).orElse(0);
        if (score >= 60) {
            // 返回 Command：更新状态 + 指定下一个节点
            return CompletableFuture.completedFuture(
                new Command("pass", Map.of("result", "通过", "score", score))
            );
        } else {
            return CompletableFuture.completedFuture(
                new Command( "fail",Map.of("result", "补考", "score", score))
            );
        }
    }
}

// 使用 CommandAction 的节点不需要条件边——它自己返回路由目标
StateGraph graph = new StateGraph("CommandDemo", strategy)
    .addNode("check_score", new CheckScoreNode(),EdgeMappings.builder().to("pass").to("fail").build()))  // AsyncCommandAction
    .addNode("pass", node_async(state -> Map.of("message", "🎉 通过")))
    .addNode("fail", node_async(state -> Map.of("message", "📖 补考")))
    .addEdge(START, "check_score")
    // 注意：没有 addConditionalEdges！check_score 节点自己通过 Command 指定路由
    .addEdge("pass", END)
    .addEdge("fail", END);
```

🎯 **对比之前的条件边版本**：

- 条件边版本：`check_score` 只写 `next_node`，边读 `next_node` → 路由表里找目标
- CommandAction 版本：`check_score` 直接在 Command 里写 `"pass"` 或 `"fail"`
- **缺点**：看代码不能直观知道 `check_score` 会路由到哪些节点，必须读节点内部逻辑

### 🔍 项目落地

**本项目未使用 CommandAction**。所有路由通过 `addConditionalEdges` + `edge_async()` 实现。这是有意的设计——条件边的路由表让 Mermaid 图能展示所有可能路径，CommandAction 做不到这一点。

# 编译与执行

**核心问题**：图定义好了，怎么"跑"起来？同步跑还是流式跑？怎么给图传参数？

---

## 知识点 #11：编译图执行 — CompiledGraph.invoke() / .stream()

### 💡 两种执行模式

图编译后得到 `CompiledGraph`，有两种执行方式：

### 🧪 基础示例：invoke vs stream 对比

**场景**：同一个图，用两种方式执行，观察输出差异

```java
KeyStrategyFactory strategy = () -> Map.of(
    "text", new ReplaceStrategy(),
    "processed", new ReplaceStrategy()
);

StateGraph graph = new StateGraph("SimpleProcess", strategy)
    .addNode("step1", node_async(state -> {
        System.out.println("  [step1] 处理中...");
        return Map.of("processed", "step1完成");
    }))
    .addNode("step2", node_async(state -> {
        System.out.println("  [step2] 处理中...");
        return Map.of("processed", "step2完成");
    }))
    .addNode("step3", node_async(state -> {
        System.out.println("  [step3] 处理中...");
        return Map.of("processed", "step3完成");
    }))
    .addEdge(START, "step1")
    .addEdge("step1", "step2")
    .addEdge("step2", "step3")
    .addEdge("step3", END);

CompiledGraph compiled = graph.compile();
RunnableConfig config = RunnableConfig.builder().build();

// ─── 方式1：invoke — 只拿最终结果 ───
System.out.println("=== invoke 模式 ===");
Optional<OverAllState> finalState = compiled.invoke(Map.of("text", "hello"), config);
finalState.get().value("processed").ifPresent(v -> System.out.println("最终结果: " + v));
// 输出：
//   [step1] 处理中...
//   [step2] 处理中...
//   [step3] 处理中...
// 最终结果: step3完成

// ─── 方式2：stream — 逐步观察 ───
System.out.println("\n=== stream 模式 ===");
compiled.stream(Map.of("text", "hello"), config)
    .doOnNext(event -> {
        System.out.println("收到事件: 节点=" + event.node() + ", 状态=" + event.state().value("processed").orElse("N/A"));
    })
    .blockLast();
// 输出：
//   [step1] 处理中...
// 收到事件: 节点=step1, 状态=step1完成
//   [step2] 处理中...
// 收到事件: 节点=step2, 状态=step2完成
//   [step3] 处理中...
// 收到事件: 节点=step3, 状态=step3完成
```

🎯 **何时用 stream？**

- 需要检测 HITL 中断信号 → **必须用 stream**
- 需要向前端推送进度 → **用 stream**
- 只需要最终结果、不关心过程 → **invoke 更简单**

### 🔍 项目落地

**项目全部使用 **`stream()`，不用 `invoke()`。为什么？因为需要在 `doOnNext` 中检测 `InterruptionMetadata`（HITL 中断信号），`invoke()` 拿不到这个信号。

```java
// 典型消费模式（Controller）
compiledGraph.stream(inputState, config)
    .doOnNext(event -> {
        if (event instanceof InterruptionMetadata im) {
            // HITL 中断——记住中断信息
            interruptRef.set(im);
        } else {
            // 普通节点输出——记录进度
            completedNodes.add(event.node());
        }
    })
    .blockLast();  // 阻塞等待全部完成
```

> ⚠️ 提醒
> **关键理解**：`stream()` 返回的 Flux 是**冷流**——不 subscribe 不会执行。所以你必须 `.blockLast()` 或 `.subscribe()` 才能真正触发图的运行。

## 流式输出 — Flux + NodeOutput + InterruptionMetadata

### 💡 两层流式

1. **图级别**：每个节点执行完成后输出一个 `NodeOutput`（含 `node()` 节点名 + `state()` 当前状态）
2. **LLM 级别**：LLM 节点内部可以返回 `Flux`，框架自动包装为 `StreamingOutput`（含 `chunk()` Token 片段）

### 📖 框架核心类型

### 🧪 基础示例：消费流式事件

**场景**：监听图的流式输出，区分普通节点事件和中断事件

```java
compiledGraph.stream(Map.of("text", "测试"), config)
    .doOnNext(event -> {
        if (event instanceof InterruptionMetadata im) {
            // HITL 中断——需要人工介入
            System.out.println("⛔ 中断! 节点=" + im.node());
            System.out.println("   消息=" + im.getMetadata().get("message"));
        } else if (event instanceof StreamingOutput so) {
            // LLM 正在逐 Token 输出
            System.out.print(so.chunk());  // 实时打印 Token
        } else {
            // 普通节点完成
            System.out.println("✅ 节点完成: " + event.node());
        }
    })
    .blockLast();
```

🎯 **三种事件类型**：

- `NodeOutput`（普通）→ 节点执行完毕
- `StreamingOutput`（LLM）→ 节点内部的 LLM 正在输出 Token
- `InterruptionMetadata`（HITL）→ 遇到中断，需要人工介入

### 🔍 项目落地 — 3 种消费模式

**SSE 模式关键代码**

```java
compiledGraph.stream(inputState, config)
    .doOnNext(event -> {
        Map<String, Object> data = new HashMap<>();
        if (event instanceof InterruptionMetadata im) {
            data.put("type", "interrupt");
            // 提取面试题内容...
        } else {
            data.put("type", "node");
            data.put("node", event.node());
        }
        emitter.send(SseEmitter.event().name("event").data(data));
    })
    .blockLast();
```

> ⚠️ 提醒
> **实战建议**：SSE 模式是最实用的——前端可以实时看到"现在执行到哪个节点了"，对调试和用户体验都非常重要。

## 运行配置 — RunnableConfig

### 💡 每次运行图都需要什么参数？

RunnableConfig 是图的"运行时护照"，核心字段：

### 🧪 基础示例：RunnableConfig 的基本用法

**场景**：同一个图，用不同 threadId 执行两次，观察检查点隔离

```java
CompiledGraph compiled = graph.compile(CompileConfig.builder()
    .saverConfig(SaverConfig.builder().register(new MemorySaver()).build())
    .build());

// 第一次执行：threadId = "session-001"
RunnableConfig config1 = RunnableConfig.builder()
    .threadId("session-001")
    .build();
compiled.invoke(Map.of("text", "第一次输入"), config1);

// 第二次执行：threadId = "session-002"（完全独立的状态）
RunnableConfig config2 = RunnableConfig.builder()
    .threadId("session-002")
    .build();
compiled.invoke(Map.of("text", "第二次输入"), config2);

// 用 session-001 回看历史
Collection<StateSnapshot> history = compiled.getStateHistory(config1);
// 只能看到 session-001 的历史，看不到 session-002 的
```

🎯 **关键理解**：`threadId` 是状态隔离的边界——不同 threadId 的检查点互不干扰。

### 🔍 项目落地

```java
// 首次执行：新建 threadId
RunnableConfig config = RunnableConfig.builder()
    .threadId("sync-" + System.currentTimeMillis())
    .build();

// 续传执行：用已有 threadId 找回 checkpoint
RunnableConfig baseConfig = RunnableConfig.builder()
    .threadId(threadId)  // 前端传过来的
    .build();

// 续传关键：添加 HUMAN_FEEDBACK_METADATA_KEY
RunnableConfig resumeConfig = RunnableConfig.builder(updatedConfig)
    .addMetadata(RunnableConfig.HUMAN_FEEDBACK_METADATA_KEY, "candidate_submitted")
    .build();
```

> ⚠️ 提醒
> **HITL 续传的三步曲**（一定要讲清楚）：
> `RunnableConfig.builder().threadId(threadId).build()` — 找到旧 checkpoint
> `compiledGraph.updateState(config, newState, nodeId)` — 写入人工输入，得到 updatedConfig
> `RunnableConfig.builder(updatedConfig).addMetadata(HUMAN_FEEDBACK_METADATA_KEY, "...").build()` — 标记这是人工反馈
> 缺了第 3 步，框架不知道你是在续传，会从头开始跑！

## 编译配置 — CompileConfig

### 💡 编译时能配什么？

CompileConfig 是"编译时的一次性配置"，和 RunnableConfig（每次运行）不同。

### 📖 框架核心字段

### 🧪 基础示例：interruptBefore — 最简单的 HITL

**场景**：一个审批流程，在"批准"节点前自动中断，等人工确认

🎯 **对比**：`interruptBefore` 是"一刀切"——编译时就写死了在哪个节点中断。而 `InterruptableAction`（知识点 #16）可以在运行时根据状态动态决定是否中断。

### 🔍 项目落地

```java
// HrRecruitmentWorkflow.java:323-332
MemorySaver saver = new MemorySaver();

CompileConfig compileConfig = CompileConfig.builder()
    .saverConfig(SaverConfig.builder().register(saver).build())
    .recursionLimit(30)    // 防止条件边死循环
    .build();

CompiledGraph compiledGraph = mainGraph.compile(compileConfig);
```

**为什么不用 **`interruptBefore`** / **`interruptAfter`**？** 因为项目用的是 `InterruptableAction` 模式（#16），中断逻辑由节点自己控制，更灵活。

### ⚠️ 教学提醒

**两种 HITL 模式对比**：

项目选择 `InterruptableAction`，因为"候选人提交答案"和"HR 审批"都是**有条件**的中断——如果答案已提交就放行，不需要每次都断。

# 人工介入（HITL）

**核心问题**：AI Agent 不能完全自主——有些决策必须人类拍板。怎么让Graph"暂停等人"？

**这是整个框架最精妙的部分**——图的执行可以暂停、保存状态、等人操作、再恢复。背后全靠检查点（Checkpoint）。

---

## 检查点持久化 — MemorySaver / BaseCheckpointSaver

### 💡 Checkpoint 是什么？

每执行一个节点，框架就自动保存一份"状态快照"（Checkpoint）。每份快照包含：

- **state**：此时的状态值
- **nextNodeId**：接下来要执行的节点

有了 Checkpoint，才能实现三大能力：

1. **HITL** — 人在回路，必须能暂停和恢复
2. **会话记忆** — 同一 threadId 的多次调用共享状态
3. **时间旅行** — 回溯到任意检查点

### 📖 框架内置实现

### 🧪 基础示例：观察 Checkpoint 的产生

**场景**：一个 3 节点图，配置 MemorySaver，执行后查看检查点历史

```java
KeyStrategyFactory strategy = () -> Map.of("data", new ReplaceStrategy());

StateGraph graph = new StateGraph("CheckpointDemo", strategy)
    .addNode("step1", node_async(state -> Map.of("data", "第一步")))
    .addNode("step2", node_async(state -> Map.of("data", "第二步")))
    .addNode("step3", node_async(state -> Map.of("data", "第三步")))
    .addEdge(START, "step1")
    .addEdge("step1", "step2")
    .addEdge("step2", "step3")
    .addEdge("step3", END);

// 配置 MemorySaver
MemorySaver saver = new MemorySaver();
CompiledGraph compiled = graph.compile(CompileConfig.builder()
    .saverConfig(SaverConfig.builder().register(saver).build())
    .build());

// 执行
String threadId = "demo-001";
RunnableConfig config = RunnableConfig.builder().threadId(threadId).build();
compiled.invoke(Map.of("data", "初始值"), config);

// 查看检查点历史
Collection<StateSnapshot> history = compiled.getStateHistory(config);
System.out.println("检查点数量: " + history.size());
for (StateSnapshot snapshot : history) {
    System.out.println("  节点=" + snapshot.node()
        + ", data=" + snapshot.state().value("data").orElse("N/A")
        + ", checkpointId=" + snapshot.config().checkPointId().orElse("N/A"));
}
// 输出：
// 检查点数量: 4
//   节点=__start__, data=初始值, checkpointId=xxx1
//   节点=step1, data=第一步, checkpointId=xxx2
//   节点=step2, data=第二步, checkpointId=xxx3
//   节点=step3, data=第三步, checkpointId=xxx4
```

🎯 **关键理解**：每执行一个节点，框架就自动存一个检查点。不需要你手动调 save——只要配了 Saver，框架全自动。

### 🔍 项目落地

```java
// HrRecruitmentWorkflow.java:323-328
MemorySaver saver = new MemorySaver();
SaverConfig saverConfig = SaverConfig.builder().register(saver).build();
CompileConfig compileConfig = CompileConfig.builder()
    .saverConfig(saverConfig)
    .recursionLimit(30)
    .build();
```

**Checkpoint 的传播规则**：只需在**父图编译时**提供 Checkpointer，框架会自动传播给子图。所以子图 `deepEvalGraph.compile()` 不需要传 saver——主图的 saver 会自动生效。

> ⚠️ 提醒
> **MemorySaver 是进程内的**——应用重启就丢了。生产环境必须换成 Redis/PostgreSQL 实现。但开发阶段用 MemorySaver 足够了。

## Human-in-the-Loop — InterruptableAction

### 💡 两种 HITL 模式

项目选择 `InterruptableAction`，因为两个 HITL 场景都需要**条件性中断**——答案已提交就放行，未提交才中断。

### 📖 框架核心

节点同时实现 `AsyncNodeActionWithConfig` + `InterruptableAction`：

```java
public class MyHitlNode implements AsyncNodeActionWithConfig, InterruptableAction {

    // 正常执行逻辑（中断放行后才会走到这里）
    @Override
    public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
        return CompletableFuture.completedFuture(Map.of("status", "done"));
    }

    // 中断判断（框架在执行节点之前自动调用）
    @Override
    public Optional<InterruptionMetadata> interrupt(String nodeId, OverAllState state, RunnableConfig config) {
        if (已满足条件) {
            return Optional.empty();  // 放行
        }
        return Optional.of(InterruptionMetadata.builder(nodeId, state)
            .addMetadata("message", "等待人工操作...")
            .build());  // 中断
    }
}
```

### 🧪 基础示例：条件性中断

**场景**：一个"审批节点"——如果金额 ≤ 1000 自动放行，> 1000 需要人工审批

```java
public class ApprovalNode implements AsyncNodeActionWithConfig, InterruptableAction {

    // 中断判断：金额 > 1000 才中断
    @Override
    public Optional<InterruptionMetadata> interrupt(String nodeId, OverAllState state, RunnableConfig config) {
        int amount = state.value("amount").map(v -> (int) v).orElse(0);
        if (amount <= 1000) {
            System.out.println("  金额 ≤ 1000，自动放行");
            return Optional.empty();  // 不中断，直接执行 apply()
        }
        System.out.println("  金额 > 1000，需要人工审批");
        return Optional.of(InterruptionMetadata.builder(nodeId, state)
            .addMetadata("message", "金额超限，需要人工审批")
            .addMetadata("amount", amount)
            .build());  // 中断！
    }

    // 正常逻辑：中断放行后才执行
    @Override
    public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
        System.out.println("  审批通过，继续执行");
        return CompletableFuture.completedFuture(Map.of("approvalStatus", "APPROVED"));
    }
}

// ─── 测试1：小金额，自动放行 ───
graph.compile(compileConfig).stream(Map.of("amount", 500), config).blockLast();
// 输出：金额 ≤ 1000，自动放行 → 审批通过，继续执行

// ─── 测试2：大金额，中断等审批 ───
graph.compile(compileConfig).stream(Map.of("amount", 5000), config).blockLast();
// 输出：金额 > 1000，需要人工审批 → ⛔ 中断
```

🎯 **对比 **`interruptBefore`：

- `interruptBefore("approve")`：不管金额多少，每次都中断
- `InterruptableAction`：只有金额 > 1000 才中断，小金额自动通过
- **这就是"条件性中断"的价值**

### 🔍 项目落地

**HITL 节点 1：候选人提交答案 **

```java
private static class CandidateSubmitHitlNode 
        implements AsyncNodeActionWithConfig, InterruptableAction {

    @Override
    public Optional<InterruptionMetadata> interrupt(String nodeId, OverAllState state, RunnableConfig config) {
        String candidateStatus = state.value("candidate_status").map(Object::toString).orElse("");
        if ("submitted".equals(candidateStatus)) {
            return Optional.empty();  // 已提交 → 放行
        }
        return Optional.of(InterruptionMetadata.builder(nodeId, state)
            .addMetadata("message", "等待候选人提交面试题答案...")
            .addMetadata("action", "POST /api/recruitment/submit-answer/{threadId}")
            .build());
    }
}
```

**HITL 节点 2：HR 审批 Offer **

```java
private static class OfferApprovalHitlNode 
        implements AsyncNodeActionWithConfig, InterruptableAction {

    @Override
    public Optional<InterruptionMetadata> interrupt(String nodeId, OverAllState state, RunnableConfig config) {
        boolean approved = state.value("offer_approved")
            .map(v -> Boolean.parseBoolean(v.toString())).orElse(false);
        if (approved) {
            return Optional.empty();  // 已批准 → 放行
        }
        return Optional.of(InterruptionMetadata.builder(nodeId, state)
            .addMetadata("message", "等待 HR 审批 Offer...")
            .build());
    }
}
```

### 🚨 关键踩坑：HITL 节点必须在主图中！

> **血泪教训**：v2.1 版本时，HITL 节点放在了子图内，导致 `updateState` 报错 `edge with sourceId doesn't exist!`。
> **根因**：`updateState(config, newState, nodeId)` 的第三个参数 `nodeId` 必须是**当前 CompiledGraph 中存在的边源节点**。子图内的节点对主图不可见——主图只看到 `deep_eval` 这一个子图节点，看不到里面的 `candidate_submit`。
> **v3.0 解决方案**：把所有 HITL 节点移到主图，子图只做纯 AI 评估。

## 断点续传 — updateState + withResume

### 💡 HITL 续传的五步曲

这是整个课程最核心的操作流程：

```plain
步骤1：首次执行 → 在 HITL 节点中断 → 返回 InterruptionMetadata
步骤2：人工操作（前端提交答案/审批）
步骤3：后端 updateState → 把人工输入写入 checkpoint
步骤4：构建 resumeConfig（带 HUMAN_FEEDBACK_METADATA_KEY）
步骤5：stream(null, resumeConfig) → 从断点恢复执行
```

### 🧪 基础示例：完整的 HITL 续传流程

**场景**：一个简单的"人工确认"流程 — 执行到确认节点时暂停，人工输入后继续

```java
// ─── 1. 定义图 ───
KeyStrategyFactory strategy = () -> Map.of(
    "data", new ReplaceStrategy(),
    "confirmed", new ReplaceStrategy()
);

public class ConfirmNode implements AsyncNodeActionWithConfig, InterruptableAction {
    @Override
    public Optional<InterruptionMetadata> interrupt(String nodeId, OverAllState state, RunnableConfig config) {
        Boolean confirmed = state.value("confirmed").map(v -> (Boolean) v).orElse(false);
        if (confirmed) return Optional.empty();  // 已确认 → 放行
        return Optional.of(InterruptionMetadata.builder(nodeId, state)
            .addMetadata("message", "请确认数据是否正确").build());
    }

    @Override
    public CompletableFuture<Map<String, Object>> apply(OverAllState state, RunnableConfig config) {
        return CompletableFuture.completedFuture(Map.of("confirmed", true));
    }
}

MemorySaver saver = new MemorySaver();
CompiledGraph compiled = new StateGraph("HitlDemo", strategy)
    .addNode("process", node_async(state -> Map.of("data", "处理完成")))
    .addNode("confirm", new ConfirmNode())
    .addNode("finish", node_async(state -> {
        System.out.println("✅ 最终完成! data=" + state.value("data").orElse(""));
        return Map.of();
    }))
    .addEdge(START, "process")
    .addEdge("process", "confirm")
    .addEdge("confirm", "finish")
    .addEdge("finish", END)
    .compile(CompileConfig.builder().saverConfig(SaverConfig.builder().register(saver).build()).build());

// ─── 2. 首次执行 → 会在 confirm 节点中断 ───
String threadId = "hitl-demo-001";
RunnableConfig config1 = RunnableConfig.builder().threadId(threadId).build();
AtomicReference<InterruptionMetadata> interruptRef = new AtomicReference<>();

compiled.stream(Map.of("data", "待处理数据"), config1)
    .doOnNext(event -> {
        if (event instanceof InterruptionMetadata im) {
            interruptRef.set(im);
            System.out.println("⛔ 中断! " + im.getMetadata().get("message"));
        }
    })
    .blockLast();
// 输出：⛔ 中断! 请确认数据是否正确

// ─── 3. 人工确认（模拟用户操作）───
System.out.println("👤 人工确认数据，点击'通过'...");

// ─── 4. updateState — 把人工输入写入检查点 ───
RunnableConfig baseConfig = RunnableConfig.builder().threadId(threadId).build();
Map<String, Object> humanInput = Map.of("confirmed", true, "data", "人工确认后的数据");
RunnableConfig updatedConfig = compiled.updateState(baseConfig, humanInput, "confirm");
//                                              ↑ threadId    ↑ 人工输入    ↑ HITL 节点名

// ─── 5. 构建 resumeConfig 并恢复执行 ───
RunnableConfig resumeConfig = RunnableConfig.builder(updatedConfig)
    .addMetadata(RunnableConfig.HUMAN_FEEDBACK_METADATA_KEY, "confirmed")
    .build();

compiled.stream(null, resumeConfig).blockLast();  // ← input 传 null！
// 输出：✅ 最终完成! data=人工确认后的数据

```

🎯 **五个关键点**（最容易搞错的地方）：

1. `updateState` 的第三个参数 `nodeId` 必须是主图中存在的边源节点
2. 续传时 `stream()` 的第一个参数传 `null`，不要传新的 input——否则会覆盖 checkpoint 中的状态
3. `resumeConfig` 必须带 `HUMAN_FEEDBACK_METADATA_KEY`，否则框架不知道这是续传
4. `resumeConfig` 是从 `updatedConfig` 构建的，不是从 `baseConfig` 构建的——`updatedConfig` 包含了新的 checkpointId
5. HITL 节点不能放在子图里

### 🔍 项目落地 — 候选人提交答案（Controller）

```java
// Step 1：用 threadId 找到之前的 checkpoint
RunnableConfig baseConfig = RunnableConfig.builder().threadId(threadId).build();

// Step 2：更新状态——写入候选人的答案
Map<String, Object> newState = new HashMap<>();
newState.put("candidate_status", "submitted");
newState.put("candidate_answers", answer.getAnswers());

// Step 3：updateState — 关键操作！
RunnableConfig updatedConfig = compiledGraph.updateState(baseConfig, newState, "candidate_submit");

// Step 4：构建续传配置
RunnableConfig resumeConfig = RunnableConfig.builder(updatedConfig)
    .addMetadata(RunnableConfig.HUMAN_FEEDBACK_METADATA_KEY, "candidate_submitted")
    .build();

// Step 5：恢复执行（input 传 null，使用 checkpoint 中的状态）
compiledGraph.stream(null, resumeConfig).doOnNext(event -> { ... }).blockLast();
```

**HR 审批通过**（Controller:

```java
newState.put("offer_approved", true);
compiledGraph.updateState(baseConfig, newState, "offer_approval");
// ... 同样构建 resumeConfig + stream(null, resumeConfig)
```

**HR 审批拒绝**（Controller:

```java
newState.put("offer_approved", false);
newState.put("rejectionReason", reason);
compiledGraph.updateState(baseConfig, newState, "offer_approval");
```

---

## 时间旅行 — getStateHistory + checkPointId 回放

### 💡 什么是"时间旅行"？

回溯到图执行的**任意历史时刻**，查看当时的状态。用于调试、审计、重放。

### 📖 框架核心 API

每个 `StateSnapshot` 含 `state()`、`node()`、`config().checkPointId()`。

### 🧪 基础示例：回看执行历史

**场景**：执行完一个图后，查看每个节点的状态快照

```java
// 执行图（已在知识点 #15 的示例中演示过如何产生检查点）
compiled.invoke(Map.of("data", "初始值"), config);

// 回看历史
Collection<StateSnapshot> history = compiled.getStateHistory(config);
System.out.println("=== 执行历史 ===");
for (StateSnapshot snapshot : history) {
    System.out.printf("  节点=%-10s data=%-10s checkpointId=%s%n",
        snapshot.node(),
        snapshot.state().value("data").orElse("N/A"),
        snapshot.config().checkPointId().orElse("N/A"));
}
// 输出：
// === 执行历史 ===
//   节点=__start__   data=初始值      checkpointId=cp-001
//   节点=step1       data=第一步      checkpointId=cp-002
//   节点=step2       data=第二步      checkpointId=cp-003
//   节点=step3       data=第三步      checkpointId=cp-004

// 回到某个特定时刻
String targetCheckpointId = "cp-002";  // step1 完成后
RunnableConfig timeTravelConfig = RunnableConfig.builder()
    .threadId(threadId)
    .checkPointId(targetCheckpointId)
    .build();
StateSnapshot snapshot = compiled.getState(timeTravelConfig);
System.out.println("回到 step1 后: data=" + snapshot.state().value("data").orElse("N/A"));
// 输出：回到 step1 后: data=第一步
```

🎯 **时间旅行的价值**：

- 调试：某步结果不对？回到上一步看看当时的状态
- 审计：完整记录每一步的状态变化
- 重放：从某个检查点重新执行（改变某个参数再跑一遍）

### 🔍 项目落地 — 状态历史端点（Controller

```java
@GetMapping("/history/{threadId}")
public Map<String, Object> getStateHistory(@PathVariable String threadId) {
    RunnableConfig config = RunnableConfig.builder().threadId(threadId).build();
    Collection<StateSnapshot> history = compiledGraph.getStateHistory(config);
    
    List<Map<String, Object>> snapshots = new ArrayList<>();
    for (StateSnapshot snapshot : history) {
        Map<String, Object> snap = new HashMap<>();
        snap.put("node", snapshot.node());
        snap.put("state", snapshot.state());
        snap.put("checkpointId", snapshot.config().checkPointId().orElse("N/A"));
        snapshots.add(snap);
    }
    return Map.of("threadId", threadId, "snapshots", snapshots);
}
```

`enrichWithStateData()`** 方法**（Controller:548-604）：遍历所有 StateSnapshot，从历史状态中提取 `finalDecision`、`answerScore`、`rejectionMessage` 等关键字段写入响应——解决"前端看不到拒绝原因"的问题。

> ⚠️ 提醒
> **时间旅行不等于重放**。当前项目的 `/history` 端点只是**查看**历史，没有从某个 checkpoint 重新执行。如果要实现重放，需要把 `checkPointId` 设到 `RunnableConfig` 中再调用 `stream()`。

## 子图 — addNode(id, StateGraph/CompiledGraph)

### 💡 为什么需要子图？

当图变得庞大时，把一组相关节点封装成子图，对外只暴露为**一个节点**。好处：

1. **简化主图** — 主图只看到 `deep_eval` 一个节点，不用管里面 8 个节点
2. **团队协作** — 不同人负责不同子图
3. **可复用** — 同一个子图可以被多个主图使用

### 📖 框架三种子图方式

### 🧪 基础示例：子图封装

![diagram](/Ai/spring-ai-alibaba/saa-07-graph-hr/diagram-007.svg)

**场景**：把"文档分析"（字数统计 + 关键词提取）封装成子图，主图只看到"analyze"一个节点

```java

    //  并行+子图
    @Bean
    public CompiledGraph stateGraphCommandActionSubGraph(@Autowired DashScopeChatModel chatModel) throws GraphStateException {
        KeyStrategyFactory keyStrategyFactory = () ->
                Map.of("name", AppendStrategy.APPEND,
                        "rejectionMessage", AppendStrategy.APPEND);

        // 创建Graph
        StateGraph stateGraph = new StateGraph("hrGraph",keyStrategyFactory);

        var nodeA = node_async(new NodeAction() {
            @Override
            public Map<String, Object> apply(OverAllState state) throws Exception {
                // 调用LLM DB 第三方....
                String name = state.value("name").orElse("").toString();
                String resume = state.value("resume").orElse("").toString();

                // SpringAi ChatClient : 单次大模型对话
                ChatClient chatClient = ChatClient.builder(chatModel)
                        .defaultSystem("提取简历的信息")
                        .build();
                Person entity = chatClient.prompt(resume).call().entity(Person.class);

                return Map.of("name",entity.name(),"age",entity.age(),"education",entity.education());
            }
        });
        // 年龄评分
        var ageScore = node_async(state -> {
            Integer age = ((Integer) state.value("age").orElse("99"));
            int score = age>35?0:5;

            if(age>35){
                return Map.of("age_score", score,"rejectionMessage", "年龄太大");
            }
            return Map.of("age_score", score);
        });
        // 学历评分
        var educationScore = node_async(state -> {

            String education = state.value("education").orElse("未知").toString();
            int score = education.equals("本科")?5:0;

            if(!education.equals("本科")){
                return Map.of("education_score", score,"rejectionMessage", "学历不满足");
            }
            return Map.of("education_score", score);
        });

        var reject = node_async(state -> {
            String name = state.value("name").orElse("").toString();
            String resonse = state.value("rejectionMessage").orElse("未知").toString();

            return Map.of("rejectionMessage", "尊敬的"+name+",岗位不符，原因："+resonse);
        });

        var summarize = node_async(state -> {
            Integer age_score = (Integer) state.value("age_score").orElse("0");
            Integer education_score = (Integer) state.value("education_score").orElse("0");

            return Map.of("sum_score", age_score+education_score);

        });

        StateGraph subStateGraph = new StateGraph("hrSubGraph",keyStrategyFactory);
        subStateGraph.addNode("ageScore",ageScore)
                .addNode("educationScore",educationScore)
                .addNode("summarize",summarize)
                .addEdge(StateGraph.START,"ageScore")
                .addEdge(StateGraph.START,"educationScore")
                .addEdge("ageScore","summarize")
                .addEdge("educationScore","summarize")
                .addEdge("summarize",StateGraph.END);

        CompiledGraph compiledSubGraph = subStateGraph.compile();

        stateGraph.addNode("nodeA",nodeA)
                .addNode("subGraph",compiledSubGraph)
                .addNode("reject",reject)
                .addEdge(StateGraph.START,"nodeA")
                .addConditionalEdges("nodeA",edge_async(state -> {

                    String age = state.value("age").orElse("").toString();
                    String education = state.value("education").orElse("").toString();

                    if(StringUtils.isEmpty(age) || StringUtils.isEmpty(education)){
                        return "reject";
                    }
                    else{
                        return "subGraph";// 子图
                    }

                } ),EdgeMappings.builder().to("subGraph").to("reject").build())
                .addConditionalEdges("subGraph",edge_async(state -> {
                    Integer sum_score = (Integer) state.value("sum_score").orElse("0");
                    return  sum_score>=5?StateGraph.END:"reject";
                }),EdgeMappings.builder().toEND().to("reject").build())
                .addEdge("reject",StateGraph.END);

        // 编译/检验
        CompiledGraph compile = stateGraph.compile();

        return compile;
    }
```

🎯 **关键理解**：

- 主图只看到 `analyze` 一个节点，不知道里面有 `count_words` 和 `extract_keywords`
- 子图有自己独立的 KeyStrategyFactory
- 子图的状态在执行完后"回传"给主图（字段名相同的自动映射）

### 🔍 项目落地

**子图构建**（L118-165）：

**java**

复制

```java
StateGraph deepEvalGraph = new StateGraph(subKeyStrategy)  // 独立的 KeyStrategyFactory
    .addNode("frontend_scorer", frontendScorer)
    .addNode("java_scorer", javaScorer)
    .addNode("algorithm_scorer", algorithmScorer)
    .addNode("experience_scorer", experienceScorer)
    .addNode("culture_scorer", cultureScorer)
    .addNode("score_aggregator", scoreAggregator)
    .addNode("gen_questions", generateQuestions)
    .addNode("send_questions", sendQuestions);

CompiledGraph deepEvalCompiled = deepEvalGraph.compile();  // 子图单独编译
```

**子图嵌入主图**（L211）：

**java**

复制

```java
mainGraph.addNode("deep_eval", deepEvalCompiled);  // 已编译子图作为主图节点
```

**关键设计**：子图有自己独立的 `subKeyStrategy`（14 个字段），主图有 `mainKeyStrategy`（32 个字段）。子图只关心评分相关的状态，主图关心全部。

### 🚨 踩坑：HITL 不能在子图里

这在 #16 已经讲过，这里再次强调：

- `updateState` 的 `nodeId` 必须在当前 CompiledGraph 中可见
- 子图内的节点对主图不可见
- 所以所有 HITL 节点必须在主图中
- 子图只做纯 AI 评估（无中断、无人工介入）

---

## 知识点 #20：生命周期监听 — GraphLifecycleListener

### 💡 什么时候需要？

想在节点执行前后做"切面"操作——打日志、统计耗时、异常告警。

### 📖 框架核心

**java**

复制

```java
public interface GraphLifecycleListener {
    void before(String nodeId, OverAllState state);   // 节点执行前
    void after(String nodeId, OverAllState state);    // 节点执行后
    void onError(String nodeId, OverAllState state, Exception e);  // 异常
}
```

通过 `CompileConfig.listener()` 注册。

### 🧪 基础示例：给图加上执行耗时日志

**场景**：统计每个节点的执行耗时

```java
public class TimingListener implements GraphLifecycleListener {
    private final Map<String, Long> startTimes = new ConcurrentHashMap<>();

    @Override
    public void before(String nodeId, OverAllState state) {
        startTimes.put(nodeId, System.currentTimeMillis());
        System.out.println("▶ 开始执行: " + nodeId);
    }

    @Override
    public void after(String nodeId, OverAllState state) {
        long elapsed = System.currentTimeMillis() - startTimes.getOrDefault(nodeId, 0L);
        System.out.println("✔ 完成执行: " + nodeId + " (耗时 " + elapsed + "ms)");
    }

    @Override
    public void onError(String nodeId, OverAllState state, Exception e) {
        System.err.println("✘ 执行异常: " + nodeId + " → " + e.getMessage());
    }
}

// 注册到 CompileConfig
CompileConfig config = CompileConfig.builder()
    .listener(new TimingListener())
    .build();

CompiledGraph compiled = graph.compile(config);
compiled.invoke(Map.of("text", "test"), RunnableConfig.builder().build());
// 输出：
// ▶ 开始执行: step1
// ✔ 完成执行: step1 (耗时 12ms)
// ▶ 开始执行: step2
// ✔ 完成执行: step2 (耗时 8ms)
```

🎯 **类比 Spring AOP**：`GraphLifecycleListener` 就是 Graph 的 AOP——`before` = `@Before`，`after` = `@After`，`onError` = `@AfterThrowing`。

### 🔍 项目落地

**本项目未使用 **`GraphLifecycleListener`。但有两个"类似"的 Hook 类可做对比：

**扩展建议**：可用 `GraphLifecycleListener` 实现：

- 每个节点执行前后的审计日志
- 节点执行耗时统计（`before` 记时间戳，`after` 计算差值）
- 异常节点自动告警

### ⚠️ 教学提醒

**和 Spring AOP 的类比**：GraphLifecycleListener 就是 Graph 的 AOP——在节点执行前后织入横切逻辑。如果你用 Spring 的 `@Aspect` 做过后台监控，这个概念一模一样。

---

## 图可视化

![diagram](/Ai/spring-ai-alibaba/saa-07-graph-hr/diagram-008.svg)

### 💡 为什么需要可视化？

你用代码定义了一个 20 个节点的图，谁能看懂？生成 Mermaid 流程图，一眼看清全貌。

### 📖 框架核心

```java
GraphRepresentation mermaid = compiledGraph.getGraph(GraphRepresentation.Type.MERMAID);
System.out.println(mermaid.content());

GraphRepresentation plantuml = compiledGraph.getGraph(GraphRepresentation.Type.PLANTUML);
System.out.println(plantuml.content());
```

### 🧪 基础示例：生成 Mermaid 图

**场景**：给一个简单图生成 Mermaid 流程图

```java
KeyStrategyFactory strategy = () -> Map.of(
    "data", new ReplaceStrategy(),
    "decision", new ReplaceStrategy()
);

StateGraph graph = new StateGraph("DecisionFlow", strategy)
    .addNode("check", node_async(state -> Map.of("decision", "A")))
    .addNode("pathA", node_async(state -> Map.of()))
    .addNode("pathB", node_async(state -> Map.of()))
    .addEdge(START, "check")
    .addConditionalEdges("check", edge_async(s -> "A"), Map.of("A", "pathA", "B", "pathB"))
    .addEdge("pathA", END)
    .addEdge("pathB", END);

CompiledGraph compiled = graph.compile();

// 生成 Mermaid
GraphRepresentation mermaid = compiled.getGraph(GraphRepresentation.Type.MERMAID);
System.out.println(mermaid.content());
// 输出类似：
// graph TD
//     __start__ --> check
//     check -->|A| pathA
//     check -->|B| pathB
//     pathA --> __end__
//     pathB --> __end__
```

🎯 **实战技巧**：把输出的 Mermaid 代码粘贴到 [Mermaid Live Editor](https://mermaid.live/)，即时看到流程图。在开发阶段，每次改图结构都生成一次，确认拓扑正确。

### 🔍 项目落地

```java
// HrRecruitmentWorkflow.java:426-431
private void printArchitecture(CompiledGraph mainGraph) {
    System.out.println("\n==================== MERMAID 流程图 ====================");
    GraphRepresentation mermaid = mainGraph.getGraph(GraphRepresentation.Type.MERMAID);
    System.out.println(mermaid.content());
    System.out.println("=========================================================\n");
}
```

**调用时机**：`buildWorkflow()` 最后一步（L333），应用启动时自动打印 Mermaid 图到控制台。

**输出效果**：主图包含所有节点和边，子图内部节点也会展开显示——这正是把 ReactAgent 重构为 NodeAction 的核心收益：**ReactAgent 在 Mermaid 中只显示 1 个黑盒，NodeAction 展开每个步骤**。

---
