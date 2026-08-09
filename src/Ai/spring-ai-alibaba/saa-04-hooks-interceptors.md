---
title: "4.Hooks 和 Interceptors"
sidebarGroup: "Spring AI Alibaba"
shortTitle: "4.Hooks 和 Interceptors"
order: 4
date: 2026-05-21
category: "AI"
tag:
  - "Spring AI Alibaba"
  - "Agent"
description: "Hooks 和 Interceptors如何在Agent执行过程中对它无侵入式的进行干预或增强？比如：对话越来越长，如何避免上下文失控？"
---

> 来源：[4.Hooks 和 Interceptors](https://www.yuque.com/geren-t8lyq/sk9iuh/zymv31krooyapy8q?singleDoc#)  
> 配套代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs.git

# Hooks 和 Interceptors

如何在Agent执行过程中对它**无侵入式的**进行干预或增强？

比如：

- 对话越来越长，如何避免上下文失控？
- 涉及敏感内容时，如何在输入和输出阶段加一层护栏？
- 执行高风险操作前，能不能先让人工确认？
- 一个 Agent 在多轮推理、工具调用、再推理的过程中，开发者到底能不能插手？

这时候，Spring AI Alibaba 提供的 **Hooks** 和 **Interceptors**，就变得非常重要。

它们不是锦上添花的扩展点，而是让 Agent 从“能用”走向“可观测、可控制、可审计、可干预”的关键能力。

---

## 一、为什么 Agent 需要 Hooks 和 Interceptors？

在 Spring AI Alibaba 中，Agent 的执行并不是一次简单的模型调用，而是一个循环过程：

**模型推理 → 选择工具 → 调用工具 → 再次推理 → 直到结束**

如果没有扩展点，开发者其实很被动。你只能把请求交给 Agent，然后等待结果，很难在中途进行监管、修正或限制。

而 Hooks 和 Interceptors 的价值，就在于它们把 Agent 执行流程中的关键节点暴露了出来，让我们可以在合适的时机做这些事情：

- **监控**：记录日志、统计耗时、跟踪执行链路
- **修改**：改写提示词、调整上下文、过滤输出内容
- **控制**：重试、回退、提前退出、限制模型调用次数
- **约束**：敏感信息检测、内容审核、人工审批

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-001.png)

换句话说，Hooks 和 Interceptors 解决的不是“如何让 Agent 更聪明”，而是“如何让 Agent 更可控”。

---

## 二、Hook 和 Interceptor，到底有什么区别？

如果用一句话概括：

- **Hook** 更像是面向 Agent 生命周期的“流程钩子”
- **Interceptor** 更像是面向模型/工具调用链的“拦截器”

可以先用下面这张表快速建立认知：

一个更直观的理解方式是：

- 如果你关心的是 **Agent 这趟流程什么时候开始、什么时候结束、能不能中途跳转**，优先看 **Hook**。
- 如果你关心的是 **模型请求进来时怎么处理、工具调用出去时怎么包装**，优先看 **Interceptor**。

这两类能力并不是互相替代，而是共同构成 Agent 的可控执行链路。

---

## 三、Spring AI Alibaba 里有哪些关键扩展点？

在 Spring AI Alibaba 中，常见扩展点主要有 5 类：

1. **MessagesModelHook(最推荐）**：在模型调用前后处理消息列表，适合做消息过滤、补充、压缩，API 更简单，也更推荐
2. **ModelHook**：在模型调用前后执行逻辑，可以访问完整状态，适合复杂状态管理
3. **AgentHook**：在 Agent 整体执行前后介入，适合做全局监控和资源初始化/清理
4. **ModelInterceptor**：拦截模型请求和响应。适合做内容审核（敏感词过滤）、日志、重试（内置）、动态工具筛选（内置）。
5. **ToolInterceptor**：拦截工具调用。适合做监控、缓存。

这里有一个非常重要的取舍建议：

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-002.png)

**如果只是处理消息，优先使用 **`MessagesModelHook`**；只有在需要访问全局状态时，再考虑 **`ModelHook`**。**

因为从工程实践上看，越简单的抽象，越容易维护。

---

## 四、自定义 Hooks 和 Interceptors：真正的价值不在“会用”，而在“会选”

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-003.png)

很多人读文档时，容易把这些扩展点当成一组并列 API 来记。但真正进入项目后你会发现，关键不是“知道有几个类型”，而是**能不能根据场景选对扩展点**。

你可以把这 5 类能力理解成 5 个切入位置：

- 想动**消息列表**，优先 `MessagesModelHook`
- 想动**完整状态**，使用 `ModelHook`
- 想管**整个 Agent 生命周期**，使用 `AgentHook`

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-004.png)

- 想拦**模型请求/响应**，使用 `ModelInterceptor`
- 想拦**工具调用**，使用 `ToolInterceptor`

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-005.png)

下面分别展开。

---

## 五、MessagesModelHook：最推荐的自定义 Hook 入口

`MessagesModelHook` 是一个专门用于操作消息列表的 Hook。它直接接收和返回消息列表，不需要你先理解复杂的 `OverAllState`，因此**更简单，也更推荐优先使用**。

### 它最适合什么场景？

- 消息修剪、过滤或转换
- 添加系统提示或上下文消息
- 消息压缩和摘要
- 各种简单的消息操作需求

如果你的需求本质上就是“我想在模型调用前后动一动消息”，那大多数情况下都没必要上来就用 `ModelHook`。

### AgentCommand 与 UpdatePolicy

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-006.png)

`MessagesModelHook` 通常通过 `AgentCommand` 返回操作结果，其中比较关键的是更新策略：

- **REPLACE**：替换所有现有消息
- **APPEND**：将新消息追加到现有消息列表

这个设计非常适合教学，因为它把“修改消息”这件事表达得很清楚：

- 你是要完全重写当前消息集？
- 还是只是在原有消息后面补一些上下文？

### 它还能提前退出

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-007.png)

除了返回新的消息结果，`MessagesModelHook` 也支持通过 `JumpTo` 实现提前退出。

这意味着某些场景下，它不只是“改消息”，还可以参与**流程跳转**。

比如：

- 检测到用户输入不合法，直接返回固定结果
- 满足某种业务条件时，跳过后续模型调用
- 命中特定规则后，转入另一段执行路径

这也是为什么说 Hook 更偏“流程级扩展”，而不仅仅是一个消息处理器。

---

## 六、ModelHook：当你需要完整状态时再出手

`ModelHook` 同样是在模型调用前后执行逻辑，但它比 `MessagesModelHook` 更底层，也更复杂。

它的价值在于：**你不仅能看消息，还能访问和修改完整状态。**

这意味着它适合处理下面这类需求：

- 在状态中保存计数器、缓存、标记位
- 基于全局状态做复杂决策
- 需要访问 Agent 执行过程中的完整上下文
- 不只是改消息，而是要改状态本身

### 一个常被忽略的细节：删除消息时要保持顺序

使用 `ModelHook` 时，可以通过 `RemoveByHash` 从 `messages` 中删除消息。

但这里有一个非常重要的约束：

**返回的消息列表必须保持原消息列表的顺序，不能打乱顺序。**

这个细节看起来小，实际上很关键。因为一旦顺序混乱，模型上下文就可能被破坏，进而影响推理结果。

也正因为 `ModelHook` 的复杂度更高，所以在大多数普通场景下，我们更推荐直接使用 `MessagesModelHook`。

---

## 七、MessagesModelHook vs ModelHook：该怎么选？

这是实战里最容易纠结的地方。

两者都能在模型调用前后执行自定义逻辑，但设计目标完全不同：

### 选择 `MessagesModelHook`，如果你需要：

- 简单的消息操作，如修剪、过滤、转换
- 添加或修改系统提示
- 做消息压缩和摘要
- 快速实现消息相关的 Hook

### 选择 `ModelHook`，如果你需要：

- 访问和修改 `OverAllState` 中的其它数据
- 在状态中存储自定义信息，比如计数器、缓存等
- 基于全局状态做复杂决策
- 查看 Agent 执行过程中的完整上下文

如果要把这段话压缩成一句建议，那就是：

**能用 **`MessagesModelHook`** 解决的，就不要急着上 **`ModelHook`**。**

---

## 八、AgentHook

`AgentHook` 的切入点和前两个不一样。

**它不是围绕某一次模型调用，而是在 Agent 整体执行的开始和结束时 运行。**

这类能力最适合做：

- 整体执行前后的日志埋点
- 全局资源初始化与清理
- 统计本次 Agent 执行的总耗时
- 在开始和结束阶段做统一的审计处理

如果说 `MessagesModelHook`、`ModelHook` 更像是在单轮推理附近做文章，那么 `AgentHook` 关注的是“这一趟 Agent 任务”本身。

所以它特别适合做全局视角的治理。

---

## 九、ModelInterceptor：不只是拦模型，还能动态管理工具

很多人一看到 `ModelInterceptor`，第一反应是“它就是拦模型请求和响应”。这当然没错，但还不够。

它还有一个非常实用的能力：**动态工具管理**。

在模型调用前，`ModelInterceptor` 可以根据上下文动态调整工具能力，例如：

- `dynamicToolCallbacks`：**动态添加工具回调**，可以在运行时根据上下文加入新的工具
- `tools`：**动态筛选本次调用可用的工具名称列表**；如果为空，则使用默认工具集

这个能力非常适合企业项目，因为现实里的工具权限往往不是固定不变的。

### 它适合哪些场景？

- 根据用户权限动态添加或移除工具
- 根据对话上下文临时启用特定工具
- 实现工具的动态加载与卸载
- 在特定条件下限制可用工具集合

换句话说，`ModelInterceptor` 不只是“在模型外面套一层逻辑”，它还可以成为**工具治理的入口**。

这对多工具 Agent 来说，非常关键。

---

## 十、ToolInterceptor：真正把工具调用纳入治理范围

如果 `ModelInterceptor` 是守在模型调用前后，那么 `ToolInterceptor` 守的就是工具执行链路。

它可以拦截和修改工具调用，因此特别适合处理下面这些问题：

- 工具执行前做权限检查
- 工具请求参数改写
- 工具调用失败后的保护与补偿
- 工具结果缓存
- 工具返回值过滤、脱敏、格式统一

在真实项目里，很多风险并不来自模型回答本身，而是来自工具真的“动了系统”。

所以只盯模型是不够的，工具这一层同样需要治理。

---

## 十一、执行顺序，才是理解深度的分水岭

很多人看完 API 后能写出代码，但一旦多个 Hook 和 Interceptor 叠加，就开始混乱。根本原因就是：**没有真正理解执行顺序。**

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-008.png)

在 Spring AI Alibaba 中，关键规则非常清晰：

- `before_*` Hooks：**按注册顺序执行**
- `after_*` Hooks：**按逆序执行**
- Interceptors：**嵌套调用，前面的包住后面的**

假设我们这样配置：

```java
ReactAgent agent = ReactAgent.builder()
.name("my_agent")
.model(chatModel)
.hooks(hook1, hook2, hook3)
.interceptors(interceptor1, interceptor2)
.build();
```

那么大致执行过程就是：

1. `hook1.beforeAgent()`
2. `hook2.beforeAgent()`
3. `hook3.beforeAgent()`
4. 进入 Agent 循环
5. `hook1.beforeModel()`
6. `hook2.beforeModel()`
7. `hook3.beforeModel()`
8. `interceptor1 -> interceptor2 -> 模型调用`
9. `hook3.afterModel()`
10. `hook2.afterModel()`
11. `hook1.afterModel()`
12. 循环结束后：`hook3.afterAgent() -> hook2.afterAgent() -> hook1.afterAgent()`

这个顺序非常重要，因为它决定了你的日志、摘要、审核、缓存、回退逻辑谁先执行、谁后执行。

如果这一点讲不清，代码往往写得出来，但行为不一定符合预期。

---

## 内置Hooks& Interceptors

### Human-in-the-Loop人机协同

#### 一、为什么需要 Human-in-the-Loop

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-009.png)

在 Agent 系统里，模型不仅能“思考”，还能进一步调用外部工具（Tool）执行真实操作，例如：

- 删除文件
- 发送邮件
- 修改数据库
- 发起审批
- 调用支付接口

一旦这些操作具有**不可逆性、破坏性或合规风险**，仅靠模型自动决策往往是不够的。尤其是“删除文件”这一类动作，执行后可能造成数据丢失、审计困难、责任不清等问题。

这时就需要 **Human-in-the-Loop（人机协同）**：在 Agent 准备调用某个高风险 Tool 时，先暂停执行，等待人工批准、修改或拒绝，然后再决定是否继续。

它的核心价值不在于“让人参与所有步骤”，而在于：**只在人类必须介入的关键节点介入**。

---

#### 二、Human-in-the-Loop 控制的本质：针对某个 Tool 进行治理

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-010.png)

Human-in-the-Loop 并不是笼统地“人工审核整个 Agent”，而是可以**精确到某一个 Tool 的调用级别**。

也就是说，你可以这样定义策略：

- 查询类 Tool：自动执行
- 总结类 Tool：自动执行
- 发邮件 Tool：需要人工确认
- 删除文件 Tool：必须人工批准

这种方式的本质是：

**把人工审批能力绑定到具体工具上，而不是绑定到整个对话流程上。**

这样既保留了 Agent 自动化的效率，也避免高风险操作被模型直接落地执行。

#### 三、在 Spring AI Alibaba 中如何实现

建议结合Spring-ai-alibaba-studio。 提供交互UI界面：（Spring-ai-alibaba-studio在《3.深入使用Spring AI Alibaba Agent Framework》笔记中进行了讲解）

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-011.png)

代码：

📎 [DeleteFileTool.java](https://www.yuque.com/attachments/yuque/0/2026/java/22309163/1778767284837-3e400a34-92bc-4e99-969e-1d7ee99af549.java)

📎 [MyListFilesTool.java](https://www.yuque.com/attachments/yuque/0/2026/java/22309163/1778767284747-df27b79e-05d7-4827-a430-f20c61ef5d45.java)

注意：

1. HumanInTheLoopHook的toolName不是类名，而是工具创建时的名字（如果是MethodTool则是方法名）
2. 需要提供记忆实现

```java

@Bean
public Agent agent(DashScopeChatModel chatModel) {

// 创建 Human-in-the-Loop Hook
HumanInTheLoopHook humanReviewHook = HumanInTheLoopHook.builder()
.approvalOn("delete_file", ToolConfig.builder().description("确认删除吗？").build())
.build();

ReactAgent agent = ReactAgent.builder()
.name("my_agent")
.model(chatModel)
.saver(new MemorySaver())
.tools(
    MyListFilesTool.createListFilesToolCallback(MyListFilesTool.DESCRIPTION),
    DeleteFileTool.createDeleteFileToolCallback(DeleteFileTool.DESCRIPTION)
)
.hooks(humanReviewHook)
.systemPrompt("你是一个有帮助的AI助手")
.build();
return agent;
}
```

这段配置说明了一个关键信号：

**Human-in-the-Loop 是通过 **`approvalOn("toolName")`** 这种方式，对指定 Tool 开启人工审批的。**

也就是说，它天然就是**面向具体工具的控制机制**。

#### 四、原理

请通过视频学习（核心是Hooks和InterruptableAction）

1. ReactAgent请求
2. 执行`InterruptableAction.interrupt`方法

1. 如果方法返回`return Optional.empty();` 代表无需中断
2. 如果返回`InterruptionMetadata` 代表需要中断，（studio中已经实现）

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-012.png)

1. 当返回`InterruptionMetadata` UI层提供交互界面
![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-013.png)
2. 当点击  按钮，调用`/resume_sse`接口，拿到反馈结果继续请求Agent。
![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-014.png)

消息压缩 架构设计实战

### SummarizationHook消息压缩

在大模型Agent、多轮智能对话、长周期交互场景中，随着对话轮次增加，用户提问、Agent回复、工具调用记录等历史消息会持续累积，对应的Token数量呈线性增长。而市面上所有大模型都存在**固定上下文Token上限**，一旦历史消息+当前提问的总Token超出模型阈值，会直接触发请求报错、响应中断，导致对话无法正常继续，彻底破坏长对话的连贯性与可用性。

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-015.png)

为了解决这一问题，**消息压缩（对话摘要）**成为行业通用解决方案——通过精简老旧历史消息、提炼核心信息，降低整体Token占用，让对话突破模型原生上下文限制，实现长周期续航。但与此同时，消息压缩也伴随着不可避免的问题：**内容损耗与语义失真**，这也让很多开发者陷入“保续航还是保信息完整性”的纠结。

事实上，消息压缩并非可选的优化手段，而是**必要的兜底措施**，失真问题可以通过结构化方案优化，而兜底的核心价值不可替代。本文将围绕Token超限消息压缩，详解其兜底必要性、失真问题根源，以及对标Claude Code的结构化摘要优化思路。

代码：

```java
/*
    * 1.经济舱退票的费用要多少钱
    * 2.terms-of-service.txt 条规
    * 3. ##要求 1. 请讲中文。
    *
    *
    *  压缩= 3-messagesToKeep（1）= 压缩前2条
    *  keepFirstUserMessage 不压缩1
    *  所以只压缩2 ： terms-of-service.txt 条规 ——>LLM 回答没问题
    *
    * 第二轮对话：
    * 1.经济舱退票的费用要多少钱
    * 2.terms-of-service.txt 条规（压缩有后的
    * 3. ##要求 1. 请讲中文。
    * 4. LLM的回答 退费xx
    * 5.经济舱预定的费用要多少钱
    * 6.terms-of-service.txt
    * 7. ##要求 1. 请讲中文。
    *
    * 压缩= 7-messagesToKeep（1）= 压缩前6条
    *  keepFirstUserMessage 不压缩1
    *  所以只压缩2-6=5条 ： 去掉了很多关键信息， 升职5这轮对话的问题都压没了 ——>LLM 回答有问题！
    *  剩下：
    *  1.
    *  2.（3-5）全丢失了
    *  7.
    *  当然也可能我这个测试用例的数据比较极端，但是依然说明：
    *
    * 所以SummarizationHook是一种有损压缩， 是一种牺牲精度保全对话正常的错误方式
    * 像claude code 如果多次压缩会触发熔断， 因为多次压缩注定浪费且无用
    *
    * */
    @Test
    public void testSummarizationHook(@Autowired DashScopeChatModel chatModel,
                      @Value("classpath:terms-of-service.txt") Resource resource) throws Exception {
        // 创建消息压缩 Hook
        SummarizationHook summarizationHook = SummarizationHook.builder()
                .model(chatModel)
                // 触发摘要之前的最大 token 数， 设置模型的最大 token 数   1M 上下文
                .maxTokensBeforeSummary(5)
                // 消息需要保留的条数
                .messagesToKeep(10)
                // 是否保留第一条消息
                .keepFirstUserMessage(true)
                .build();

        // 使用
        ReactAgent agent = ReactAgent.builder()
                .name("my_agent")
                .model(chatModel)
                .saver(new MemorySaver())
                .systemPrompt("你是一个航空智能客服")
                . instruction("""
                         ##要求 
                           1. 请讲中文。
                        """)
                .chatClient(ChatClient.builder(chatModel).defaultAdvisors(SimpleLoggerAdvisor.builder().build()).build())
                .hooks(summarizationHook)
                .build();

        AssistantMessage message = agent.call(
                List.of(
                        new UserMessage("经济舱退票的费用要多少钱???"),
                        new UserMessage(resource.getContentAsString(StandardCharsets.UTF_8))
                ));
        System.out.println( message.getText());
        AssistantMessage message2 = agent.call(
                List.of(
                        new UserMessage("经济舱预定的费用要多少钱???"),
                        new UserMessage(resource.getContentAsString(StandardCharsets.UTF_8))
        ));
        System.out.println( message2.getText());

    }

```

#### 消息压缩的兜底必要性：宁可失真，不可中断

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-016.png)

##### 模型上下文上限的硬性约束

大模型的上下文窗口是硬件与算法层面的硬性限制，无法通过常规调用方式突破。无论是日常助手、企业客服，还是复杂Agent多工具交互，只要对话轮次超过一定数量，Token超限是必然结果。一旦超限，系统直接不可用，相比之下，**轻度的内容失真完全可以接受**，这是长对话场景的核心取舍逻辑。

##### 兜底压缩的核心定位：守住对话可用性底线

我们对消息压缩的定位必须清晰：**它是警戒线，是最后一道防线，是兜底手段**，而非日常必选操作。

- **非超限场景**：尽量保留完整历史消息，保证Agent理解的精准度，不做多余压缩；
- **临近/超出阈值场景**：强制启动压缩，牺牲部分非核心细节，保住对话不中断。

简单来说，长对话的前提是“对话能继续”，没有压缩兜底，再完整的上下文也毫无意义，这就是消息压缩成为必要措施的核心原因。

##### 兜底压缩的执行时机：调用前兜底，对话后优化

兜底压缩的核心执行节点，必须放在**每次LLM调用前（ModelHook#beforeModel）**，这是防止单次模型调用超限的最后关口，同步执行、强制截断压缩，确保请求能正常送入模型；而对话后的异步压缩，属于优化手段，用于降低兜底压缩的触发频率，二者分工明确，共同保障对话稳定。

#### 消息压缩的痛点：内容损耗与语义失真

##### 失真问题的根源

常规消息压缩多采用**笼统摘要**模式，将截断点之前的所有历史消息揉合在一起生成一段摘要，这种方式会带来三大失真问题：

- **关键信息丢失**：用户核心需求、业务关键参数、Agent重要决策等细节，被笼统概括后模糊化；
- **角色逻辑断裂**：用户与Agent的交互逻辑、工具调用的因果关系，在摘要中无法清晰体现；
- **多次压缩叠加损耗**：若每轮LLM调用后都压缩，会反复对摘要内容二次提炼，失真程度逐级放大。

##### 失真问题的客观认知

![image.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-017.png)

需要明确的是，**完全无失真的无损压缩并不存在**，消息压缩本质是“用信息密度换Token空间”，我们能做的是**最小化失真、保留核心信息**，而非杜绝失真。失真本身不可怕，可怕的是压缩逻辑不合理，导致核心信息丢失，让Agent彻底偏离对话意图。

#### 行业最优实践：对标Claude Code，对话后结构化摘要提取

针对常规压缩的失真问题，头部产品早已给出成熟解决方案，其中**Claude Code**的长对话优化逻辑极具参考价值——**摒弃笼统摘要，在整轮对话完成后，异步执行结构化信息提取，而非简单合并内容**，既降低Token占用，又最大程度保留核心信息，减少失真。

##### Claude Code的核心摘要逻辑

Claude Code不会在LLM调用中途频繁压缩，而是等待**整轮用户对话完全结束后（AgentHook#afterAgent）**，异步后台执行结构化拆分提取，将杂乱的历史消息，拆解为多个标准化核心模块，而非一段模糊摘要，具体提取维度如下：

- **用户核心画像/需求**：提炼用户的核心诉求、使用意图、关键问题、偏好与约束条件，固定模块呈现，绝不遗漏核心需求；
- **对话核心脉络**：梳理对话的整体流程，明确用户提问、Agent回应、问题解决进度，保留交互逻辑；
- **关键信息与结论**：提取业务关键参数、重要决策、已解决/未解决问题、工具调用核心结果；
- **待办与后续指向**：记录未完成的任务、需要继续执行的操作、后续对话的承接点。

##### 为什么对话后执行，而非调用后？

这一设计完美规避了常规压缩的弊端，核心优势有三点：

- **避免重复压缩**：整轮Agent对话结束后仅执行一次，无论内部调用多少次LLM，都不会反复提炼，杜绝多次压缩带来的叠加失真；
- **上下文完整闭环**：等待用户提问、Agent思考、工具调用、最终回复全部完成，此时历史消息是完整闭环，提取的信息更精准，不会中途截断逻辑链；
- **不影响用户体验**：异步后台执行，不阻塞当前响应，用户无延迟感知，兼顾续航与体验。

#### 长对话消息压缩的分层落地规范（兼顾兜底与低失真）

结合兜底必要性与结构化优化思路，最终落地需采用**“双层压缩+一层防护”**的规范，既守住不超限的底线，又最大程度减少失真：

##### 第一层：前置兜底压缩（beforeModel）

仅作为**警戒线兜底**，每次LLM调用前统计Token，达到阈值才触发同步压缩，修复原生截断拼接BUG，确保截断前内容全量压缩、截断后内容完整保留，不随意跳过关键消息，避免无效失真。

##### 第二层：后置结构化压缩（afterAgent）

整轮Agent对话结束后，异步执行**结构化摘要提取**，对标Claude Code拆分用户需求、对话脉络、关键结论，不做笼统概括，日常压低Token水位，减少前置兜底压缩的触发概率。

##### 防护层：Auto Dream 后台整理（定时优化）

记忆积累久了会出现过时、矛盾等问题，需通过后台定时清理进程 Auto Dream 优化，而非简单批量压缩，其核心作用是清理无效记忆、统一记忆逻辑，进一步降低Token冗余，同时避免记忆失真，具体规则如下：

触发条件

六、核心总结

- **消息压缩是必要兜底**：Token上限是硬性约束，没有压缩兜底，长对话直接中断，内容失真属于可接受的取舍；
- **失真并非不可优化**：摒弃常规笼统摘要，采用对话后结构化提取，能最大程度降低失真，保留核心信息；
- **时机选择至关重要**：前置压缩做兜底（调用前），后置结构化压缩做优化（对话后），坚决不在每轮LLM调用后压缩，避免重复损耗；
- **行业标杆参考**：Claude Code的结构化摘要模式，是长对话压缩的最优方向，兼顾Token优化、信息完整性与用户体验。

长对话的核心逻辑，永远是**“先保证能用，再保证好用”**，消息压缩的兜底价值不可替代，而结构化优化则让长对话既“能续航”，又“不失真”。

### ModelCallLimitHook 模型调用限制

很多开发者在落地 ReactAgent 时，都曾被“无限循环”坑过。其实，大部分时候并不是大模型真的“无脑”，而是我们的**工程系统允许它无限次尝试，且缺少明确的硬边界与退出条件**。

从工程视角来看，导致 ReactAgent 死循环的核心原因通常有以下四个：

**1. Tool 调用异常诱发“调用风暴”** 当 Tool（工具/接口）返回无效结果（如报错、空数据）时，大模型为了完成任务，往往会倾向于“再试一次”。如果外层没有强制的退出机制，模型就会在某些场景下对同一个 Tool 疯狂发起重试，最终演变成压垮接口的“调用风暴”。

**2. 裸奔上线：没有设置次数限制** 这是最典型、也是最致命的风险源。只要系统没有设定重试上限，策略一旦偶发“不愿意停”的倾向，就会把调用的时间和金钱成本无限拉长。在生产环境中，这直接等同于线程卡死和 API 账单爆炸。

**3. 上下文压缩导致“记忆丢失”** 为了节省 Token，我们通常会做上下文压缩。但如果压缩时只保留了“刚刚调用失败了”的大结论，却丢掉了“调用过哪个 Tool、传了什么参数”的细节，模型在下一轮就会误判“这个方法我还没试过”，从而引发重复调用。

**4. Prompt 强制要求“严禁放弃”** 如果我们在系统提示词（System Prompt）或调度规则中写死了“必须继续调用工具，直到解决问题”，那么即便模型自己已经判断出继续尝试毫无意义，也会被指令强行死锁，像在跑步机上一样被迫无限循环。

#### 终极解决办法：硬性兜底机制

排查和优化上述问题固然重要，但如果你只想在生产环境中落到最稳的一条线，答案只有一个：**加硬性调用上限（Max Call Limit）**。

以 **Spring AI Alibaba Agent Framework** 为例，框架直接提供了内置的 Hook 来解决这个问题：

Java

```java
ReactAgent agent = ReactAgent.builder()
.name("my_agent")
.model(chatModel)
// 核心防御：限制模型最大调用次数为 5 次
.hooks(ModelCallLimitHook.builder().runLimit(5).build())  
.saver(new MemorySaver())
.build();
```

**工程建议：** 将 `runLimit` 设置为“完成常见任务所需的正常预算”。一旦触达这个上限，务必让系统进入兜底输出（例如向用户说明已尝试的过程并给出下一步建议），绝对不要让它在后台无休止地消耗资源。

### PIIDetectionHook个人身份信息检测

——大模型Agent隐私泄露的“防火墙”

#### 一、引言：当Agent变成“泄密者”，你需要警惕什么？

小龙虾 意外泄露了IP地址、工作目录用户名、手机号、单位信息等隐私数据，甚至被公开曝光在数千人群聊中。

![641.png](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-018.png)

这类事件暴露出一个被很多开发者忽视的风险：**大模型Agent的全链路都可能成为隐私泄露的通道**。用户输入的手机号、工具返回的敏感数据、系统自动拼接的IP/用户名，都可能被Agent直接返回给用户，或在对话历史、摘要压缩中被意外保留，最终造成不可逆的隐私泄露。

而解决这个问题的核心手段，就是**个人身份信息（PII）检测与脱敏**。Spring AI Alibaba Agent Framework 内置了开箱即用的 `PIIDetectionHook`，无需复杂开发，就能为你的Agent搭建一道隐私保护的“防火墙”。

---

## 二、什么是PII？为什么Agent场景必须做检测？

### 1. 什么是PII？

PII（Personally Identifiable Information，个人身份可识别信息），是指任何可以直接或间接定位到特定自然人的信息，常见类型包括：

- 手机号、身份证号、银行卡号
- 邮箱、IP地址、MAC地址
- 姓名、工作目录用户名、精准地址
- 企业信息、营收数据等敏感业务信息

### 2. Agent场景下的隐私泄露风险点

在ReactAgent的完整链路中，隐私泄露可能发生在任意环节：

- **用户输入**：用户直接发送手机号、身份证号等信息；
- **工具返回**：业务工具、第三方接口返回用户隐私数据；
- **对话历史**：多轮对话、消息压缩、结构化摘要中留存敏感信息；
- **系统拼接**：IP地址、工作目录等系统信息被Agent自动提取并返回。

一旦这些信息被直接返回或留存，就可能像“养虾人”事件一样，被第三方获取并公开，造成隐私泄露甚至合规风险。

---

## 三、Spring AI Alibaba 内置 `PIIDetectionHook` 详解

`PIIDetectionHook` 是框架内置的隐私保护钩子，支持**多类型PII识别+多种脱敏策略**，可覆盖用户输入、工具返回结果等全链路场景，开箱即用，配置简单。

### 1. 核心能力概览

- 内置支持多种标准PII类型（邮箱、手机号、IP、银行卡等）；
- 支持自定义正则匹配，识别业务场景中的特殊敏感信息；
- 提供4种脱敏策略，可按需选择“拦截/替换/掩码/哈希”；
- 可同时对用户输入和工具返回结果进行检测处理。

### 2. 关键枚举定义

#### （1）`PIIType`：支持的PII类型

```java
public enum PIIType {
    EMAIL,          // 邮箱地址
    CREDIT_CARD,    // 银行卡号
    IP,             // IP地址
    MAC_ADDRESS,    // MAC地址
    URL,            // URL链接
    CUSTOM          // 自定义正则类型
}
```

#### （2）`RedactionStrategy`：脱敏策略

---

## 四、实战示例：手机号PII检测与脱敏

下面以“手机号脱敏”为例，演示如何通过 `PIIDetectionHook` 快速实现隐私保护，避免工具返回的手机号被直接泄露。

### 1. 完整代码示例

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.hook.pii.PIIDetectionHook;
import com.alibaba.cloud.ai.graph.agent.hook.pii.PIIType;
import com.alibaba.cloud.ai.graph.agent.hook.pii.RedactionStrategy;
import com.alibaba.cloud.ai.graph.agent.hook.pii.detector.PIIDetectors;
import com.alibaba.cloud.ai.graph.agent.tool.ToolCallback;
import org.springframework.ai.chat.model.ChatModel;

// 1. 模拟一个返回手机号的工具
ToolCallback weatherTool = FunctionToolCallback.builder("get_user_phone", args -> "13912345678")
        .description("获取用户的手机号")
        .inputType(Void.class)
        .build();

// 2. 配置PII检测Hook：手机号掩码脱敏
PIIDetectionHook piiHook = PIIDetectionHook.builder()
        // 脱敏策略：MASK（部分掩码）
        .strategy(RedactionStrategy.MASK)
        // PII类型：自定义手机号正则
        .piiType(PIIType.CUSTOM)
        .detector(PIIDetectors.regexDetector("PHONE", "\\b1[3-9]\\d{9}\\b"))
        // 同时检测用户输入和工具返回结果
        .applyToInput(true)
        .applyToToolResults(true)
        .build();

// 3. 构建带隐私保护的Agent
ReactAgent agent = ReactAgent.builder()
        .name("secure_agent")
        .model(chatModel)
        .hooks(piiHook)  // 注册PII检测Hook
        .tools(weatherTool)
        .build();

// 4. 调用Agent，测试效果
System.out.println(agent.call("请帮我获取我的手机号。").getText());
```

### 2. 运行效果

工具原本返回的手机号 `13912345678`，经过 `PIIDetectionHook` 处理后，会被脱敏为：

```plain
你的手机号是：*******5678
```

既保留了数据格式的可读性，又隐藏了完整号码，避免隐私泄露。

---

---

## 六、总结：隐私保护是Agent的“生命线”

大模型Agent的隐私泄露风险，从来都不是“会不会发生”，而是“什么时候发生”。Spring AI Alibaba 内置的 `PIIDetectionHook`，用开箱即用的方式，帮你解决了PII检测与脱敏的核心问题：

- 无需复杂开发，几行代码即可搭建隐私保护；
- 支持全链路覆盖，从用户输入到工具返回，层层设防；
- 结合多种脱敏策略，兼顾隐私保护与业务可读性。

与其等“被反噬”后再补救，不如提前用 `PIIDetectionHook` 为你的Agent装上隐私保护的“防火墙”，让大模型为你服务，而不是泄露你的信息。

---

需要我帮你补充一份**不同PII类型的正则匹配清单**（比如身份证、邮箱、IP地址），方便你直接在项目中使用吗？

# 检索增强生成（RAG）

大型语言模型（LLM）虽然强大，但有两个关键限制：

- **有限的上下文**——它们无法一次性摄取整个语料库
- **静态知识**——它们的训练数据在某个时间点被冻结

检索通过在查询时获取相关的外部知识来解决这些问题。这是**检索增强生成（RAG）**的基础：使用特定上下文的信息来增强 LLM 的回答。

## 构建知识库

**知识库**是用于检索的文档或结构化数据的存储库。

如果你需要自定义知识库，可以使用 Spring AI Alibaba 的文档加载器和向量存储从你自己的数据构建。

如果你已经有一个知识库（例如 SQL 数据库、CRM 或内部文档系统），你**不需要**重建它。你可以：

- 将其连接为 Agent 的**工具**用于 Agentic RAG
- 查询它并将检索到的内容作为上下文提供给 LLM（[两步 RAG](https://www.java2ai.com/docs/frameworks/agent-framework/advanced/rag#2-step-rag)）

### 从检索到 RAG

检索允许 LLM 在运行时访问相关上下文。但大多数实际应用更进一步：它们**将检索与生成集成**以产生基于事实的、上下文感知的答案。

这是**检索增强生成（RAG）**的核心思想。检索管道成为结合搜索和生成的更广泛系统的基础。

### 检索流程

典型的检索工作流如下：

![image](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-019.png)

每个组件都是模块化的：你可以交换加载器、分割器、嵌入或向量存储，而无需重写应用程序的逻辑。

### 构建模块

在 Spring AI Alibaba 中，你可以使用以下组件构建 RAG 系统：

#### 文档加载器和解析器

从外部源（文件、数据库、云存储、在线平台等）摄取数据，返回标准化的文档对象。Spring AI Alibaba 提供了丰富的 [Document Reader](https://www.java2ai.com/integration/rag/document-readers) 和 [Document Parser](https://www.java2ai.com/integration/rag/document-parsers) 实现，支持 PDF、Word、Markdown、GitHub、Notion、语雀等多种数据源和格式。

#### 文本分割器

将大型文档分解为更小的块，这些块可以单独检索并适合模型的上下文窗口。文本分割是 ETL 管道中的关键步骤，详见 [ETL Pipeline](https://www.java2ai.com/integration/rag/etl-pipeline)。

#### 嵌入模型

嵌入模型将文本转换为数字向量，使得具有相似含义的文本在向量空间中靠近在一起。Spring AI Alibaba 支持多种 [Embedding Model](https://www.java2ai.com/integration/rag/embeddings) 实现，包括 DashScope、OpenAI、Ollama 等。

#### 向量存储

用于存储和搜索嵌入的专用数据库。Spring AI Alibaba 支持多种向量数据库，包括 [Milvus](https://www.java2ai.com/integration/rag/vectordbs/milvus)、[Pinecone](https://www.java2ai.com/integration/rag/vectordbs/more/pinecone)、[Redis](https://www.java2ai.com/integration/rag/vectordbs/redis)、[Elasticsearch](https://www.java2ai.com/integration/rag/vectordbs/elasticsearch) 等。更多实现请查看 [向量数据库文档](https://docs.spring.io/spring-ai/reference/api/vectordbs.html)。

#### 检索器

检索器是一个接口，给定非结构化查询返回文档。Spring AI 提供了模块化的 RAG 架构，支持查询转换、查询扩展、文档后处理等高级功能，详见 [Retrieval Augmented Generation](https://www.java2ai.com/integration/rag/retrieval-augmented-generation)。

## RAG 架构

RAG 可以以多种方式实现，具体取决于你的系统需求。我们在下面的部分概述每种类型。

信息

**延迟**：延迟在**两步 RAG**中通常更**可预测**，因为 LLM 调用的最大次数是已知且有上限的。这种可预测性假设 LLM 推理时间是主要因素。但是，实际延迟也可能受检索步骤性能的影响——例如 API 响应时间、网络延迟或数据库查询——这些可能因使用的工具和基础设施而异。

### 两步 RAG

在**两步 RAG**中，检索步骤总是在生成步骤之前执行。这种架构简单且可预测，适合许多应用，其中检索相关文档是生成答案的明确前提。

![image](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-020.png)

Spring AI 提供了开箱即用的 `QuestionAnswerAdvisor` 和 `RetrievalAugmentationAdvisor`，简化两步 RAG 的实现。这些 Advisor 自动处理检索和上下文增强，详见 [Retrieval Augmented Generation](https://www.java2ai.com/integration/rag/retrieval-augmented-generation#advisors)。

#### 使用 MessagesModelHook 实现

通过 `MessagesModelHook` 在模型调用前检索文档并添加到消息中：

**使用 MessagesModelHook 实现两步RAG**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/RAGExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.hook.messages.MessagesModelHook;
import com.alibaba.cloud.ai.graph.agent.hook.messages.AgentCommand;
import com.alibaba.cloud.ai.graph.agent.hook.messages.UpdatePolicy;
import com.alibaba.cloud.ai.graph.agent.hook.HookPosition;
import com.alibaba.cloud.ai.graph.agent.hook.HookPositions;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.AssistantMessage;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

// 假设你已经有一个配置好的向量存储
VectorStore vectorStore = ...; // 配置你的向量存储（如Milvus、Pinecone等）

// 创建 RAG Hook：在模型调用前检索文档并添加到消息中
@HookPositions({HookPosition.BEFORE_MODEL})
class RAGMessagesHook extends MessagesModelHook {
  private final VectorStore vectorStore;
  private static final int TOP_K = 5;

  public RAGMessagesHook(VectorStore vectorStore) {
      this.vectorStore = vectorStore;
  }

  @Override
  public String getName() {
      return "rag_messages_hook";
  }

  @Override
  public AgentCommand beforeModel(List<Message> previousMessages, RunnableConfig config) {
      // 从消息中提取用户问题
      String userQuestion = extractUserQuestion(previousMessages);
      if (userQuestion == null || userQuestion.isEmpty()) {
          return new AgentCommand(previousMessages);
      }

      // Step 1: 检索相关文档
      List<Document> relevantDocs = vectorStore.similaritySearch(
          org.springframework.ai.vectorstore.SearchRequest.builder()
              .query(userQuestion)
              .topK(TOP_K)
              .build()
      );

      // Step 2: 构建上下文
      String context = relevantDocs.stream()
          .map(Document::getText)
          .collect(Collectors.joining("

"));

      // Step 3: 构建增强的消息列表
      List<Message> enhancedMessages = new ArrayList<>();
      
      // 添加系统提示（包含检索到的上下文）
      String systemPrompt = String.format("""
          你是一个有用的助手。基于以下上下文回答问题。
          如果上下文中没有相关信息，请说明你不知道。
          
          上下文：
          %s
          """, context);
      enhancedMessages.add(new SystemMessage(systemPrompt));
      
      // 保留原有的消息
      enhancedMessages.addAll(previousMessages);

      // 使用 REPLACE 策略替换消息
      return new AgentCommand(enhancedMessages, UpdatePolicy.REPLACE);
  }

  private String extractUserQuestion(List<Message> messages) {
      // 从消息列表中提取最后一个用户消息
      for (int i = messages.size() - 1; i >= 0; i--) {
          Message msg = messages.get(i);
          if (msg instanceof UserMessage) {
              return ((UserMessage) msg).getText();
          }
      }
      return null;
  }
}

// 创建带有 RAG Hook 的 Agent
ReactAgent ragAgent = ReactAgent.builder()
  .name("rag_agent")
  .model(chatModel)
  .hooks(new RAGMessagesHook(vectorStore))
  .build();

// 调用 Agent
AssistantMessage response = ragAgent.call("Spring AI Alibaba支持哪些模型？");
System.out.println("答案: " + response.getText());
```

#### 使用 ModelInterceptor 实现

通过 `ModelInterceptor` 检索文档后附加到 systemPrompt：

**使用 ModelInterceptor 实现两步RAG**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/RAGExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelInterceptor;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelRequest;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelResponse;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelCallHandler;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.chat.messages.SystemMessage;
import java.util.List;
import java.util.stream.Collectors;

// 假设你已经有一个配置好的向量存储
VectorStore vectorStore = ...; // 配置你的向量存储（如Milvus、Pinecone等）

// 创建 RAG Interceptor：检索文档后附加到 systemPrompt
class RAGModelInterceptor extends ModelInterceptor {
  private final VectorStore vectorStore;
  private static final int TOP_K = 5;

  public RAGModelInterceptor(VectorStore vectorStore) {
      this.vectorStore = vectorStore;
  }

  @Override
  public ModelResponse interceptModel(ModelRequest request, ModelCallHandler handler) {
      // 从用户消息中提取查询
      String userQuery = extractUserQuery(request);
      if (userQuery == null || userQuery.isEmpty()) {
          return handler.call(request);
      }

      // Step 1: 检索相关文档
      List<Document> relevantDocs = vectorStore.similaritySearch(
          org.springframework.ai.vectorstore.SearchRequest.builder()
              .query(userQuery)
              .topK(TOP_K)
              .build()
      );

      // Step 2: 构建上下文
      String context = relevantDocs.stream()
          .map(Document::getText)
          .collect(Collectors.joining("

"));

      // Step 3: 增强 systemPrompt
      String enhancedSystemPrompt = String.format("""
          你是一个有用的助手。基于以下上下文回答问题。
          如果上下文中没有相关信息，请说明你不知道。
          
          上下文：
          %s
          """, context);

      // 合并原有的 systemPrompt 和检索到的上下文
      SystemMessage enhancedSystemMessage;
      if (request.getSystemMessage() == null) {
          enhancedSystemMessage = new SystemMessage(enhancedSystemPrompt);
      } else {
          enhancedSystemMessage = new SystemMessage(
              request.getSystemMessage().getText() + "

" + enhancedSystemPrompt
          );
      }

      // 创建增强的请求
      ModelRequest enhancedRequest = ModelRequest.builder(request)
          .systemMessage(enhancedSystemMessage)
          .build();

      // 调用处理器
      return handler.call(enhancedRequest);
  }

  private String extractUserQuery(ModelRequest request) {
      // 从消息列表中提取用户查询
      return request.getMessages().stream()
          .filter(msg -> msg instanceof org.springframework.ai.chat.messages.UserMessage)
          .map(msg -> ((org.springframework.ai.chat.messages.UserMessage) msg).getText())
          .reduce((first, second) -> second) // 获取最后一个用户消息
          .orElse("");
  }

  @Override
  public String getName() {
      return "rag_model_interceptor";
  }
}

// 创建带有 RAG Interceptor 的 Agent
ReactAgent ragAgent = ReactAgent.builder()
  .name("rag_agent")
  .model(chatModel)
  .interceptors(new RAGModelInterceptor(vectorStore))
  .build();

// 调用 Agent
AssistantMessage response = ragAgent.call("Spring AI Alibaba支持哪些模型？");
System.out.println("答案: " + response.getText());
```

#### 使用 AgentHook 实现（只检索一次）

如果不想在每次 Agent reasoning 循环中都检索 RAG，可以使用 `AgentHook` 在 Agent 开始时只检索一次，然后将检索结果存储到状态中供后续使用：

**使用 AgentHook 实现两步RAG（只检索一次）**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/RAGExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.hook.AgentHook;
import com.alibaba.cloud.ai.graph.agent.hook.HookPosition;
import com.alibaba.cloud.ai.graph.agent.hook.HookPositions;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelInterceptor;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelRequest;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelResponse;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelCallHandler;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.chat.messages.SystemMessage;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

// 假设你已经有一个配置好的向量存储
VectorStore vectorStore = ...; // 配置你的向量存储（如Milvus、Pinecone等）

// 在 Agent 开始时检索文档（只执行一次）
@HookPositions({HookPosition.BEFORE_AGENT})
class RAGAgentHook extends AgentHook {
  private final VectorStore vectorStore;
  private static final int TOP_K = 5;
  private static final String RAG_CONTEXT_KEY = "rag_context";

  public RAGAgentHook(VectorStore vectorStore) {
      this.vectorStore = vectorStore;
  }

  @Override
  public String getName() {
      return "rag_agent_hook";
  }

  @Override
  public CompletableFuture<Map<String, Object>> beforeAgent(OverAllState state, RunnableConfig config) {
      // 从状态中提取用户问题
      Optional<Object> messagesOpt = state.value("messages");
      if (messagesOpt.isEmpty()) {
          return CompletableFuture.completedFuture(Map.of());
      }

      @SuppressWarnings("unchecked")
      List<org.springframework.ai.chat.messages.Message> messages = 
          (List<org.springframework.ai.chat.messages.Message>) messagesOpt.get();
      
      // 提取最后一个用户消息作为查询
      String userQuery = messages.stream()
          .filter(msg -> msg instanceof org.springframework.ai.chat.messages.UserMessage)
          .map(msg -> ((org.springframework.ai.chat.messages.UserMessage) msg).getText())
          .reduce((first, second) -> second) // 获取最后一个
          .orElse("");

      if (userQuery.isEmpty()) {
          return CompletableFuture.completedFuture(Map.of());
      }

      // Step 1: 检索相关文档（只执行一次，在整个 Agent 执行过程中）
      List<Document> relevantDocs = vectorStore.similaritySearch(
          org.springframework.ai.vectorstore.SearchRequest.builder()
              .query(userQuery)
              .topK(TOP_K)
              .build()
      );

      // Step 2: 构建上下文
      String context = relevantDocs.stream()
          .map(Document::getText)
          .collect(Collectors.joining("

"));

      config.metadata().ifPresent(meta -> {
		meta.put(RAG_CONTEXT_KEY, context);
	});

      // Step 3: 将检索到的上下文存储到状态中，供后续 ModelInterceptor 使用
      // 存储到 state 中，ModelInterceptor 可以通过 request.getContext() 访问
      return CompletableFuture.completedFuture(Map.of());
  }
}

// 在模型调用时使用存储的上下文
class RAGContextInterceptor extends ModelInterceptor {
  private static final String RAG_CONTEXT_KEY = "rag_context";

  @Override
  public ModelResponse interceptModel(ModelRequest request, ModelCallHandler handler) {
      // 从请求上下文中获取检索到的 RAG 上下文
      // RAG 上下文在 AgentHook 的 beforeAgent 中已经存储到状态中
      Map<String, Object> context = request.getContext();
      String ragContext = (String) context.get(RAG_CONTEXT_KEY);

      if (ragContext == null || ragContext.isEmpty()) {
          // 如果没有检索到上下文，直接调用处理器
          return handler.call(request);
      }

      // 增强 systemPrompt
      String enhancedSystemPrompt = String.format("""
          你是一个有用的助手。基于以下上下文回答问题。
          如果上下文中没有相关信息，请说明你不知道。
          
          上下文：
          %s
          """, ragContext);

      // 合并原有的 systemPrompt 和检索到的上下文
      SystemMessage enhancedSystemMessage;
      if (request.getSystemMessage() == null) {
          enhancedSystemMessage = new SystemMessage(enhancedSystemPrompt);
      } else {
          enhancedSystemMessage = new SystemMessage(
              request.getSystemMessage().getText() + "

" + enhancedSystemPrompt
          );
      }

      // 创建增强的请求
      ModelRequest enhancedRequest = ModelRequest.builder(request)
          .systemMessage(enhancedSystemMessage)
          .build();

      return handler.call(enhancedRequest);
  }

  @Override
  public String getName() {
      return "rag_context_interceptor";
  }
}

// 创建带有 RAG Hook 和 Interceptor 的 Agent
ReactAgent ragAgent = ReactAgent.builder()
  .name("rag_agent")
  .model(chatModel)
  .hooks(new RAGAgentHook(vectorStore))
  .interceptors(new RAGContextInterceptor())
  .build();

// 调用 Agent（RAG 检索只会在 Agent 开始时执行一次）
AssistantMessage response = ragAgent.call("Spring AI Alibaba支持哪些模型？");
System.out.println("答案: " + response.getText());
```

**三种方式对比**：

**选择建议**：

- 如果查询在 Agent 执行过程中不会变化，使用 **AgentHook** 可以显著提升性能
- 如果需要根据每次推理的结果动态调整检索，使用 **MessagesModelHook** 或 **ModelInterceptor**

所有方式都能实现两步 RAG：检索文档 → 增强上下文 → 生成答案。

#### 构建知识库

使用 ETL 管道（Extract、Transform、Load）可以轻松构建知识库。Spring AI 提供了统一的 ETL 接口，支持链式处理：

**构建知识库示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/RAGExample.java)

```java
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import java.util.List;

// 1. 加载文档
Resource resource = new FileSystemResource("path/to/document.txt");
TextReader textReader = new TextReader(resource);
List<Document> documents = textReader.get();

// 2. 分割文档为块
TokenTextSplitter splitter = new TokenTextSplitter();
List<Document> chunks = splitter.apply(documents);

// 3. 将块添加到向量存储
vectorStore.add(chunks);

// 现在你可以使用向量存储进行检索
List<Document> results = vectorStore.similaritySearch("查询文本");
```

更多关于 ETL 管道的详细说明和高级用法，请参考 [ETL Pipeline 文档](https://www.java2ai.com/integration/rag/etl-pipeline)。

### Agentic RAG

**Agentic 检索增强生成（RAG）将检索增强生成的优势与基于 Agent 的推理相结合。Agent（由 LLM 驱动）不是在回答之前检索文档，而是逐步推理并决定在交互过程中何时**以及**如何**检索信息。

提示

Agent 启用 RAG 行为所需的唯一条件是访问一个或多个可以获取外部知识的**工具**——例如文档加载器、Web API 或数据库查询。

![image](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-021.png)

#### Java 实现示例

**Agentic RAG实现示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/RAGExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.document.Document;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.ai.vectorstore.VectorStore;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

// 创建文档检索工具
class DocumentSearchTool {
  private final VectorStore vectorStore;

  public DocumentSearchTool(VectorStore vectorStore) {
      this.vectorStore = vectorStore;
  }

  public record Request(String query) {}
  public record Response(String content) {}

  public Response search(Request request) {
      // 从向量存储检索相关文档
      List<Document> docs = vectorStore.similaritySearch(request.query());

      // 合并文档内容
      String combinedContent = docs.stream()
          .map(Document::getText)
          .collect(Collectors.joining("

"));

      return new Response(combinedContent);
  }
}

DocumentSearchTool searchTool = new DocumentSearchTool(vectorStore);

// 创建工具回调
ToolCallback searchCallback = FunctionToolCallback.builder("search_documents",
  (Function<DocumentSearchTool.Request, DocumentSearchTool.Response>)
  request -> searchTool.search(request))
  .description("搜索文档以查找相关信息")
  .inputType(DocumentSearchTool.Request.class)
  .build();

// 创建带有检索工具的Agent
ReactAgent ragAgent = ReactAgent.builder()
  .name("rag_agent")
  .model(chatModel)
  .instruction("你是一个智能助手。当需要查找信息时，使用search_documents工具。" +
             "基于检索到的信息回答用户的问题，并引用相关片段。")
  .tools(searchCallback)
  .build();

// Agent会自动决定何时调用检索工具
ragAgent.invoke("Spring AI Alibaba支持哪些向量数据库？");
```

在这个例子中：

1. Agent 接收用户问题
2. Agent 推理并决定是否需要检索文档
3. 如果需要，Agent 调用 `search_documents` 工具
4. Agent 使用检索到的信息生成答案
5. 如果信息不足，Agent 可以再次调用工具

#### 多工具 Agentic RAG

**多工具Agentic RAG示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/RAGExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.document.Document;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.ai.vectorstore.VectorStore;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

// 创建多个检索工具
class WebSearchTool {
  public record Request(String query) {}
  public record Response(String content) {}
  
  public Response search(Request request) {
      return new Response("从网络搜索到的信息: " + request.query());
  }
}

class DatabaseQueryTool {
  public record Request(String query) {}
  public record Response(String content) {}
  
  public Response query(Request request) {
      return new Response("从数据库查询到的信息: " + request.query());
  }
}

class DocumentSearchTool {
  private final VectorStore vectorStore;
  
  public DocumentSearchTool(VectorStore vectorStore) {
      this.vectorStore = vectorStore;
  }
  
  public record Request(String query) {}
  public record Response(String content) {}
  
  public Response search(Request request) {
      List<Document> docs = vectorStore.similaritySearch(request.query());
      String content = docs.stream()
          .map(Document::getText)
          .collect(Collectors.joining("

"));
      return new Response(content);
  }
}

WebSearchTool webSearchTool = new WebSearchTool();
DatabaseQueryTool dbQueryTool = new DatabaseQueryTool();
DocumentSearchTool docSearchTool = new DocumentSearchTool(vectorStore);

ToolCallback webSearchCallback = FunctionToolCallback.builder("web_search",
  (Function<WebSearchTool.Request, WebSearchTool.Response>)
  req -> webSearchTool.search(req))
  .description("搜索互联网以获取最新信息")
  .inputType(WebSearchTool.Request.class)
  .build();

ToolCallback databaseQueryCallback = FunctionToolCallback.builder("database_query",
  (Function<DatabaseQueryTool.Request, DatabaseQueryTool.Response>)
  req -> dbQueryTool.query(req))
  .description("查询内部数据库")
  .inputType(DatabaseQueryTool.Request.class)
  .build();

ToolCallback documentSearchCallback = FunctionToolCallback.builder("document_search",
  (Function<DocumentSearchTool.Request, DocumentSearchTool.Response>)
  req -> docSearchTool.search(req))
  .description("搜索文档库")
  .inputType(DocumentSearchTool.Request.class)
  .build();

// Agent可以访问多个检索源
ReactAgent multiSourceAgent = ReactAgent.builder()
  .name("multi_source_rag_agent")
  .model(chatModel)
  .instruction("你可以访问多个信息源：" +
             "1. web_search - 用于最新的互联网信息
" +
             "2. database_query - 用于内部数据
" +
             "3. document_search - 用于文档库
" +
             "根据问题选择最合适的工具。")
  .tools(webSearchCallback, databaseQueryCallback, documentSearchCallback)
  .build();

multiSourceAgent.invoke("比较我们的产品文档中的功能和最新的市场趋势");
```

### 混合 RAG

混合 RAG 结合了两步 RAG 和 Agentic RAG 的特点。它引入了中间步骤，如查询预处理、检索验证和生成后检查。这些系统比固定管道提供更多灵活性，同时保持对执行的一定控制。

典型组件包括：

- **查询增强**：修改输入问题以提高检索质量。这可能涉及重写不清晰的查询、生成多个变体或用额外上下文扩展查询。
- **检索验证**：评估检索到的文档是否相关且充分。如果不够，系统可能会优化查询并再次检索。
- **答案验证**：检查生成的答案的准确性、完整性以及与源内容的一致性。如果需要，系统可以重新生成或修订答案。

架构通常支持这些步骤之间的多次迭代：

![image](/Ai/spring-ai-alibaba/saa-04-hooks-interceptors/img-022.png)

#### Java 实现示例

混合 RAG 使用 ReactAgent 整合多工具检索和验证步骤：

**混合RAG实现示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/RAGExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.hook.AgentHook;
import com.alibaba.cloud.ai.graph.agent.hook.HookPosition;
import com.alibaba.cloud.ai.graph.agent.hook.HookPositions;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelInterceptor;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelRequest;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelResponse;
import com.alibaba.cloud.ai.graph.agent.interceptor.ModelCallHandler;
import com.alibaba.cloud.ai.graph.OverAllState;
import com.alibaba.cloud.ai.graph.RunnableConfig;
import org.springframework.ai.document.Document;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;

// 假设你已经有一个配置好的向量存储和 ChatModel
VectorStore vectorStore = ...;
ChatModel chatModel = ...;

// ========== 1. 多工具检索（来自 Agentic RAG） ==========

// 文档搜索工具
class DocumentSearchTool {
  private final VectorStore vectorStore;
  
  public DocumentSearchTool(VectorStore vectorStore) {
      this.vectorStore = vectorStore;
  }
  
  public record Request(String query) {}
  public record Response(String content) {}
  
  public Response search(Request request) {
      List<Document> docs = vectorStore.similaritySearch(
          org.springframework.ai.vectorstore.SearchRequest.builder()
              .query(request.query())
              .topK(5)
              .build()
      );
      String content = docs.stream()
          .map(Document::getText)
          .collect(Collectors.joining("

"));
      return new Response(content);
  }
}

// 网络搜索工具（示例）
class WebSearchTool {
  public record Request(String query) {}
  public record Response(String content) {}
  
  public Response search(Request request) {
      // 实际实现中调用网络搜索 API
      return new Response("网络搜索结果: " + request.query());
  }
}

DocumentSearchTool docSearchTool = new DocumentSearchTool(vectorStore);
WebSearchTool webSearchTool = new WebSearchTool();

ToolCallback documentSearchCallback = FunctionToolCallback.builder("document_search",
  (Function<DocumentSearchTool.Request, DocumentSearchTool.Response>)
  req -> docSearchTool.search(req))
  .description("从文档库中搜索相关信息")
  .inputType(DocumentSearchTool.Request.class)
  .build();

ToolCallback webSearchCallback = FunctionToolCallback.builder("web_search",
  (Function<WebSearchTool.Request, WebSearchTool.Response>)
  req -> webSearchTool.search(req))
  .description("从互联网搜索最新信息")
  .inputType(WebSearchTool.Request.class)
  .build();

// ========== 2. 查询增强 Hook（来自两步 RAG） ==========

@HookPositions({HookPosition.BEFORE_AGENT})
class QueryEnhancementHook extends AgentHook {
  private final ChatModel chatModel;
  private static final String ENHANCED_QUERY_KEY = "enhanced_query";
  
  public QueryEnhancementHook(ChatModel chatModel) {
      this.chatModel = chatModel;
  }
  
  @Override
  public String getName() {
      return "query_enhancement";
  }
  
  @Override
  public CompletableFuture<Map<String, Object>> beforeAgent(OverAllState state, RunnableConfig config) {
      // 从状态中提取用户查询
      Optional<Object> messagesOpt = state.value("messages");
      if (messagesOpt.isEmpty()) {
          return CompletableFuture.completedFuture(Map.of());
      }
      
      @SuppressWarnings("unchecked")
      List<Message> messages = (List<Message>) messagesOpt.get();
      
      // 提取最后一个用户消息作为查询
      String userQuery = messages.stream()
          .filter(msg -> msg instanceof UserMessage)
          .map(msg -> ((UserMessage) msg).getText())
          .reduce((first, second) -> second) // 获取最后一个
          .orElse("");
      
      if (userQuery.isEmpty()) {
          return CompletableFuture.completedFuture(Map.of());
      }
      
      // 使用 LLM 增强查询（只执行一次，在整个 Agent 执行过程中）
      // 简化示例：实际可以使用 RewriteQueryTransformer
      String enhancedQuery = enhanceQuery(userQuery);
      
      // 如果查询被增强，更新消息列表
      if (!enhancedQuery.equals(userQuery)) {
          List<Message> enhancedMessages = new ArrayList<>();
          // 保留系统消息和其他消息，只替换用户消息
          for (Message msg : messages) {
              if (msg instanceof UserMessage) {
                  enhancedMessages.add(new UserMessage(enhancedQuery));
              } else {
                  enhancedMessages.add(msg);
              }
          }
          
          // 将增强后的查询存储到 metadata 中，供后续使用
          config.metadata().ifPresent(meta -> {
              meta.put(ENHANCED_QUERY_KEY, enhancedQuery);
          });
          
          // 返回更新后的消息列表
          return CompletableFuture.completedFuture(Map.of("messages", enhancedMessages));
      }
      
      return CompletableFuture.completedFuture(Map.of());
  }
  
  private String enhanceQuery(String query) {
      // 简化示例：实际可以使用 RewriteQueryTransformer 或调用 LLM 进行查询重写
      // 这里只是示例，实际应该调用 LLM 增强查询
      // 例如：使用 RewriteQueryTransformer.builder().chatClientBuilder(...).build().transform(query)
      return query; // 实际实现中会调用 LLM 增强查询
  }
}

// ========== 3. 答案验证 Interceptor（来自两步 RAG） ==========

class AnswerValidationInterceptor extends ModelInterceptor {
  private final ChatModel chatModel;
  private static final double MIN_CONFIDENCE = 0.7;
  
  public AnswerValidationInterceptor(ChatModel chatModel) {
      this.chatModel = chatModel;
  }
  
  @Override
  public ModelResponse interceptModel(ModelRequest request, ModelCallHandler handler) {
      // 先调用模型生成答案
      ModelResponse response = handler.call(request);
      
      // 验证答案质量（简化示例）
      AssistantMessage answer = response.getResult().getOutput();
      boolean isValid = validateAnswer(answer.getText(), request);
      
      if (!isValid) {
          // 如果答案质量不足，可以添加提示要求重新生成
          SystemMessage validationPrompt = new SystemMessage(
              "请重新检查你的答案，确保基于提供的上下文信息，并且准确完整。"
          );
          
          ModelRequest retryRequest = ModelRequest.builder(request)
              .systemMessage(validationPrompt)
              .build();
          
          // 可以选择重试或返回当前答案
          return handler.call(retryRequest);
      }
      
      return response;
  }
  
  private boolean validateAnswer(String answer, ModelRequest request) {
      // 简化示例：实际可以使用 LLM 验证答案与上下文的一致性
      // 检查答案长度、是否包含关键信息等
      return answer != null && answer.length() > 20; // 简单验证
  }
  
  @Override
  public String getName() {
      return "answer_validation";
  }
}

// ========== 4. 创建混合 RAG Agent ==========

ReactAgent hybridRAGAgent = ReactAgent.builder()
  .name("hybrid_rag_agent")
  .model(chatModel)
  .instruction("""
      你是一个智能助手，可以访问多个信息源来回答问题。
      
      使用工具时：
      1. 优先使用 document_search 搜索文档库
      2. 如果需要最新信息，使用 web_search
      3. 基于检索到的信息生成准确、完整的答案
      4. 如果信息不足，可以多次调用工具
      """)
  .tools(documentSearchCallback, webSearchCallback)
  .hooks(new QueryEnhancementHook(chatModel))
  .interceptors(new AnswerValidationInterceptor(chatModel))
  .build();

// ========== 5. 使用混合 RAG Agent ==========

AssistantMessage response = hybridRAGAgent.call("Spring AI Alibaba支持哪些向量数据库？");
System.out.println("答案: " + response.getText());
```

**混合 RAG 的特点**：

1. **多工具检索（Agentic RAG）**：Agent 可以自主选择使用文档搜索、网络搜索等工具
2. **查询增强（两步 RAG）**：在 Agent 开始时通过 `AgentHook` 增强查询（**只执行一次**，避免每次 reasoning 循环都调用，降低成本），提高检索质量
3. **答案验证（两步 RAG）**：在生成后通过 Interceptor 验证答案质量，必要时重新生成
4. **灵活组合**：结合了 Agentic RAG 的灵活性和两步 RAG 的质量控制

**性能优化**：使用 `AgentHook` 进行查询增强，只在 Agent 开始时执行一次，而不是每次模型调用前都执行，显著降低了 LLM 调用成本。

这种架构适用于：

- 具有模糊或不明确查询的应用
- 需要验证或质量控制步骤的系统
- 领域特定的问答系统，要求高准确性

## 最佳实践

1. **选择合适的架构**：

- 简单 FAQ → 两步 RAG
- 复杂研究任务 → Agentic RAG
- 需要质量保证 → 混合 RAG

# 多智能体（Multi-agent）

# 工作流（Workflow）

## 不同行业Workflow实战
