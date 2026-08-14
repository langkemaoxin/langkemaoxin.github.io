---
title: "6.Multi-agent（多Agent编排）"
sidebarGroup: "Spring AI Alibaba"
shortTitle: "6.Multi-agent（多Agent编排）"
order: 7
date: 2026-07-22
category: "AI"
tag:
  - "Spring AI Alibaba"
  - "Agent"
description: "代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/course-50. 背景：为什么要用Multi-agent“模式”Agent 就是一个能自己干活的 AI 实习生。它"
---

> 来源：[6.Multi-agent（多Agent编排）](https://www.yuque.com/geren-t8lyq/sk9iuh/bfr0x9ufa4gqyzg5?singleDoc#)  
> 配套代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs.git

## 代码：

[https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/course-5](https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/course-5)

## 0. 背景：为什么要用Multi-agent“模式”

**Agent 就是一个能自己干活的 AI 实习生**。它会规划步骤、调用工具、看数据、推理、产出结果。你给它一句话,它真的把事做完。

听上去很爽对吧?那为什么我们还要搞"多 Agent"?

来看一个具体场景。假设你是一个分析师,老板周一早上甩给你一个题目:

"**研究一下 2026 年全球电动汽车市场**——主要厂商都在干什么?各国政策有什么变化?消费者偏好有没有转向?三天后给我一份 30 页的报告。"

你打开一个 Agent,把这句话原封不动塞进去。然后你看到的画面大概是这样的:

```plain
你:    "研究一下 2026 年全球电动汽车市场……"

   Agent:
       ⏳ 正在搜索"全球电动汽车市场 2026"……(15 条结果)
       ⏳ 正在阅读第 1 篇……
       ⏳ 正在阅读第 2 篇……
       ⏳ 正在搜索"特斯拉 2026 财报"……
       ⏳ 正在阅读……
       ⏳ 正在搜索"比亚迪 2026 出口"……
       ⏳ 正在阅读……
       ⏳ 正在搜索"欧盟 2026 EV 政策"……
       ⏳ 正在阅读……

       ……(20 分钟后)……

       ⚠️ 上下文已用 92%,模型开始遗忘前面读过的内容
       ⚠️ 检索越往后越偏离主题
       ❌ 最终输出:一份逻辑混乱、信息重复、
           关键结论自相矛盾的"报告"
```

这就是**单 Agent 跑长任务时最经典的翻车现场**。原因极其朴素:

- **上下文有限**——它读着读着就忘了开头说什么
- **顺序执行**——一件件来,慢得像蜗牛,你眼睁睁看着它一篇一篇地搜
- **角色混乱**——又要查、又要分析、又要写、又要校对,样样都自己做,结果样样都没做透

你心里咯噔一下:**这事我一个人也干不完啊**。

那现实里你会怎么干?

```plain
你:           "我一个人三天搞不定。"

   你做的事:     找了 4 个人帮忙——
                ├── 小张:专门负责查厂商动态
                ├── 小李:专门负责查各国政策
                ├── 小王:专门负责查消费者数据
                └── 小赵:专门负责把三个人收集的资料汇总成报告

                你自己:总指挥,分配任务、合并结果、最后定稿
```

**这就是多 Agent 系统的原型**——一个聪明的指挥官 + 几个专心干一件事的执行者。

![image.png](/Ai/spring-ai-alibaba/saa-06-multi-agent/img-001.png)

在复杂应用里，把能力交给**单个 Agent**往往会带来两个问题：
一是工具/上下文堆得太多，决策容易出错；二是任务需要更专业的分工。
因此 Multi-agent 的思路是：**把应用拆成多个协作的专业 Agent**，再通过“模式”规定流程编排与上下文传递。

模式讨论的核心通常围绕三件事：

1. **谁来控制流程/决策**（集中还是去中心化）
2. **怎么把状态与数据传给下一个Agent**（上下文工程、outputKey、占位符）
3. **什么时候结束**（例如 FINISH）

---

## 1. 重点：Handoffs（交接）方式到底是什么

文中把 Multi-agent 的两大类控制方式对照为：

- **Tool Calling（集中控制）**：由一个 Supervisor/控制者调用其他 Agent 去完成步骤，更像“编排与调度”。
- **Handoffs（去中心化）**：由当前 Agent **把对话/控制权交接给另一个 Agent**，新的“活动Agent”继续与用户交互；直到它再次交接或完成任务。

**Handoffs 更像“专家接力”：当前 Agent 把任务接管权交给下一个专家 Agent。**

### 一句话先记住

**多 Agent 系统(Multi-Agent System)就是让多个 AI Agent 各自负责一块,通过分工和协作,完成一个单 Agent 啃不动的复杂任务。**

听上去这么自然,你可能已经在想:那肯定多 Agent 比单 Agent 好啊!越多越好啊!

**完全错。**

事实上,从 2024 年到 2025 年,业界经历了一次惨烈的"多 Agent 热潮 + 多 Agent 反思"。最后发现——**多 Agent 不是越多越好,它有一套非常严格的"该用 / 不该用"的判断标准**。先理解这一点,后面所有内容才不会被带跑偏。

### 跟单 Agent 的区别,一眼就懂

![image.png](/Ai/spring-ai-alibaba/saa-06-multi-agent/img-002.png)

---

## 2. 上下文工程：Multi-agent质量的关键（outputKey + 占位符）

无论你用 Handoffs 还是 Tool Calling，各Agent协作都离不开“上下文工程”。

文中强调的关键机制是：**用占位符在instruction中动态引用状态数据**，并借助 `outputKey` 实现“前序输出 → 后序输入”的连接。

你可以这样讲“为什么重要”：

- 如果每个 Agent 都要“自己猜”前面的结果，就会丢失一致性
- 如果用 `outputKey`+占位符把结构化输出准确传递，就能稳定实现流程编排与状态管理

讲解时建议点名这几个要点：

- `instruction` 支持占位符引用状态数据（例如用 `{key}` 引用对应字段）
- `outputKey` 用来给某个 Agent 的输出命名，供后续 Agent 引用
- 占位符未命中时系统可能保留原文本：这意味着**命名必须严谨**
- 通过参数控制上下文注入范围（例如是否包含父流程内容、是否返回推理内容等），用于减少上下文污染、提升效率与质量

---

## 3. 六种关键模式（你需要的：Sequential / Parallel / LlmRouting / Supervisor / Customized / Hybrid）

### 3.1 顺序执行（Sequential Agent）

**定义**：多个 Agent 按**预定义顺序**依次执行；前一个 Agent 的输出作为后一个 Agent 的输入。
**流程**：

流程：

1. **Agent A**处理初始输入
2. **Agent A**的输出传递给**Agent B**
3. **Agent B**处理并传递给**Agent C**
4. 最后一个Agent返回最终结果

![image](/Ai/spring-ai-alibaba/saa-06-multi-agent/img-003.png)

**SequentialAgent 实现**

```java
import com.alibaba.cloud.ai.graph.agent.flow.agent.SequentialAgent;
import com.alibaba.cloud.ai.graph.OverAllState;

// 创建专业化的子Agent
ReactAgent writerAgent = ReactAgent.builder()
  .name("writer_agent")
  .model(chatModel)
  .description("专业写作Agent")
  .instruction("你是一个知名的作家，擅长写作和创作。请根据用户的提问进行回答：{input}。") 
  .outputKey("article") 
  .build();

ReactAgent reviewerAgent = ReactAgent.builder()
  .name("reviewer_agent")
  .model(chatModel)
  .description("专业评审Agent")
  .instruction("你是一个知名的评论家，擅长对文章进行评论和修改。" +
               "对于散文类文章，请确保文章中必须包含对于西湖风景的描述。待评论文章：

 {article}" + 
               "最终只返回修改后的文章，不要包含任何评论信息。")
  .outputKey("reviewed_article") 
  .build();

// 创建顺序Agent
SequentialAgent blogAgent = SequentialAgent.builder() 
  .name("blog_agent")
  .description("根据用户给定的主题写一篇文章，然后将文章交给评论员进行评论")
  .subAgents(List.of(writerAgent, reviewerAgent)) 
  .build();

// 使用
Optional<OverAllState> result = blogAgent.invoke("帮我写一个100字左右的散文");

if (result.isPresent()) {
  OverAllState state = result.get();

  // 访问第一个Agent的输出
  state.value("article").ifPresent(article -> { 
      if (article instanceof AssistantMessage) {
          System.out.println("原始文章: " + ((AssistantMessage) article).getText());
      }
  });

  // 访问第二个Agent的输出
  state.value("reviewed_article").ifPresent(reviewedArticle -> { 
      if (reviewedArticle instanceof AssistantMessage) {
          System.out.println("评审后文章: " + ((AssistantMessage) reviewedArticle).getText());
      }
  });
}
```

#### 关键特性

1. **按顺序执行**：Agent按照 `subAgents` 列表中定义的顺序执行
2. **状态传递**：每个Agent的输出通过 `outputKey` 存储在状态中，可被后续Agent访问
3. **消息历史**：默认情况下，所有Agent共享消息历史
4. **推理内容控制**：使用 `returnReasoningContents` 控制是否在消息历史中包含中间推理

#### 控制推理内容

```java
ReactAgent writerAgent = ReactAgent.builder()
  .name("writer_agent")
  .model(chatModel)
  .returnReasoningContents(true) 
  .outputKey("article")
  .build();

ReactAgent reviewerAgent = ReactAgent.builder()
  .name("reviewer_agent")
  .model(chatModel)
  .instruction("请对文章进行评审修正：
{article}，最终返回评审修正后的文章内容") 
  .includeContents(true) // 包含上一个Agent的推理内容 
  .returnReasoningContents(true) 
  .outputKey("reviewed_article")
  .build();

SequentialAgent blogAgent = SequentialAgent.builder()
  .name("blog_agent")
  .subAgents(List.of(writerAgent, reviewerAgent))
  .build();

Optional<OverAllState> result = blogAgent.invoke("帮我写一个100字左右的散文");

if (result.isPresent()) {
  // 消息历史将包含所有工具调用和推理过程
  List<Message> messages = (List<Message>) result.get().value("messages").orElse(List.of()); 
  System.out.println("消息数量: " + messages.size()); // 包含所有中间步骤
}
```

---

### 3.2 并行执行（Parallel Agent）

**定义**：多个 Agent 对同一个输入进行并行处理，并把结果汇总输出。

1. 输入同时发送给**所有Agent**
2. 所有Agent**并行**处理
3. 结果被**合并**成单一输出

![image](/Ai/spring-ai-alibaba/saa-06-multi-agent/img-004.png)

#### 实现

**ParallelAgent 实现示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/MultiAgentExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.flow.agent.ParallelAgent;

// 创建多个专业化Agent
ReactAgent proseWriterAgent = ReactAgent.builder()
  .name("prose_writer_agent")
  .model(chatModel)
  .description("专门写散文的AI助手")
  .instruction("你是一个知名的散文作家，擅长写优美的散文。" +
               "用户会给你一个主题：{input}，你只需要创作一篇100字左右的散文。") 
  .outputKey("prose_result") 
  .build();

ReactAgent poemWriterAgent = ReactAgent.builder()
  .name("poem_writer_agent")
  .model(chatModel)
  .description("专门写现代诗的AI助手")
  .instruction("你是一个知名的现代诗人，擅长写现代诗。" +
               "用户会给你的主题是：{input}，你只需要创作一首现代诗。") 
  .outputKey("poem_result") 
  .build();

ReactAgent summaryAgent = ReactAgent.builder()
  .name("summary_agent")
  .model(chatModel)
  .description("专门做内容总结的AI助手")
  .instruction("你是一个专业的内容分析师，擅长对主题进行总结和提炼。" +
               "用户会给你一个主题：{input}，你只需要对这个主题进行简要总结。") 
  .outputKey("summary_result") 
  .build();

// 创建并行Agent
ParallelAgent parallelAgent = ParallelAgent.builder() 
  .name("parallel_creative_agent")
  .description("并行执行多个创作任务，包括写散文、写诗和做总结")
  .mergeOutputKey("merged_results") 
  .subAgents(List.of(proseWriterAgent, poemWriterAgent, summaryAgent)) 
  .mergeStrategy(new ParallelAgent.DefaultMergeStrategy()) 
  .build();

// 使用
Optional<OverAllState> result = parallelAgent.invoke("以'西湖'为主题");

if (result.isPresent()) {
  OverAllState state = result.get();

  // 访问各个Agent的输出
  state.value("prose_result").ifPresent(r -> 
          System.out.println("散文: " + r));
  state.value("poem_result").ifPresent(r -> 
          System.out.println("诗歌: " + r));
  state.value("summary_result").ifPresent(r -> 
          System.out.println("总结: " + r));

  // 访问合并后的结果
  state.value("merged_results").ifPresent(r -> 
          System.out.println("合并结果: " + r));
}
```

#### 自定义合并策略

你可以实现自定义的合并策略来控制如何组合多个Agent的输出：

**自定义合并策略完整示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/MultiAgentExample.java)

```java
public class CustomMergeStrategy implements ParallelAgent.MergeStrategy {

  @Override
  public Map<String, Object> merge(Map<String, Object> mergedState, OverAllState state) { 
      // 从每个Agent的状态中提取输出
      state.data().forEach((key, value) -> {
          if (key.endsWith("_result")) {
              Message message = (Message) value;
              Object existing = mergedState.get("all_results");
              if (existing == null) {
                  mergedState.put("all_results", message.getText());
              }
              else {
                  mergedState.put("all_results", existing + "

---

" + message.getText());
              }
          }
      });
      return mergedState;
  }
}

// 使用自定义合并策略
ParallelAgent parallelAgent = ParallelAgent.builder()
  .name("parallel_agent")
  .subAgents(List.of(agent1, agent2, agent3))
  .mergeStrategy(new CustomMergeStrategy()) 
  .mergeOutputKey("final_merged_result") 
  .build();
```

---

### 3.3 路由（LlmRoutingAgent）

在**路由模式**中，使用大语言模型（LLM）动态决定将请求路由到哪个子Agent。这种模式非常适合需要智能选择不同专家Agent的场景。

流程：

1. **路由Agent**接收用户输入
2. **LLM**分析输入并决定最合适的子Agent
3. **选中的子Agent**处理请求
4. 结果返回给用户

![image](/Ai/spring-ai-alibaba/saa-06-multi-agent/img-005.png)

#### 实现

**LlmRoutingAgent 实现示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/MultiAgentExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.flow.agent.LlmRoutingAgent;
import com.alibaba.cloud.ai.graph.agent.ReactAgent;

// 创建专业化的子Agent
ReactAgent writerAgent = ReactAgent.builder()
  .name("writer_agent")
  .model(chatModel)
  .description("擅长创作各类文章，包括散文、诗歌等文学作品")
  .instruction("你是一个知名的作家，擅长写作和创作。请根据用户的提问进行回答。")
  .outputKey("writer_output")
  .build();

ReactAgent reviewerAgent = ReactAgent.builder()
  .name("reviewer_agent")
  .model(chatModel)
  .description("擅长对文章进行评论、修改和润色")
  .instruction("你是一个知名的评论家，擅长对文章进行评论和修改。" +
               "对于散文类文章，请确保文章中必须包含对于西湖风景的描述。")
  .outputKey("reviewer_output")
  .build();

ReactAgent translatorAgent = ReactAgent.builder()
  .name("translator_agent")
  .model(chatModel)
  .description("擅长将文章翻译成各种语言")
  .instruction("你是一个专业的翻译家，能够准确地将文章翻译成目标语言。")
  .outputKey("translator_output")
  .build();

// 创建路由Agent
LlmRoutingAgent routingAgent = LlmRoutingAgent.builder()
  .name("content_routing_agent")
  .description("根据用户需求智能路由到合适的专家Agent")
  .model(chatModel) 
  .subAgents(List.of(writerAgent, reviewerAgent, translatorAgent)) 
  .build();

// 使用 - LLM会自动选择最合适的Agent
Optional<OverAllState> result1 = routingAgent.invoke("帮我写一篇关于春天的散文");
// LLM会路由到 writerAgent

Optional<OverAllState> result2 = routingAgent.invoke("请帮我修改这篇文章：春天来了，花开了。");
// LLM会路由到 reviewerAgent

Optional<OverAllState> result3 = routingAgent.invoke("请将以下内容翻译成英文：春暖花开");
// LLM会路由到 translatorAgent
```

#### 关键特性

1. **智能路由**：LLM根据输入内容和子Agent的描述自动选择最合适的Agent
2. **灵活扩展**：可以轻松添加新的专家Agent，LLM会自动识别并路由
3. **描述驱动**：子Agent的 `description` 非常重要，它告诉LLM何时应该选择该Agent
4. **单次执行**：每次请求只路由到一个Agent执行

#### 优化路由准确性

为了提高路由的准确性，需要注意以下几点：

**优化路由准确性示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/MultiAgentExample.java)

```java
// 1. 提供清晰明确的Agent描述
ReactAgent codeAgent = ReactAgent.builder()
  .name("code_agent")
  .model(chatModel)
  .description("专门处理编程相关问题，包括代码编写、调试、重构和优化。" + 
               "擅长Java、Python、JavaScript等主流编程语言。") 
  .instruction("你是一个资深的软件工程师...")
  .build();

// 2. 明确Agent的职责边界
ReactAgent businessAgent = ReactAgent.builder()
  .name("business_agent")
  .model(chatModel)
  .description("专门处理商业分析、市场研究和战略规划问题。" + 
               "不处理技术实现细节。") 
  .instruction("你是一个资深的商业分析师...")
  .build();

// 3. 使用不同领域的Agent避免重叠
LlmRoutingAgent routingAgent = LlmRoutingAgent.builder()
  .name("multi_domain_router")
  .model(chatModel)
  .subAgents(List.of(codeAgent, businessAgent, writerAgent))
.build();
```

#### 自定义系统提示和指令

`LlmRoutingAgent` 支持通过 `systemPrompt` 和 `instruction` 来自定义路由决策行为，提供更精确的路由控制。

##### 使用 SystemPrompt

`systemPrompt` 用于设置路由决策的系统提示，会替换默认的系统提示。你可以通过它提供详细的决策规则和上下文：

**LlmRoutingAgent 自定义系统提示示例**

```java
final String ROUTING_SYSTEM_PROMPT = """
你是一个智能的内容路由Agent，负责根据用户需求将任务路由到最合适的专家Agent。

## 你的职责
1. 仔细分析用户输入的意图和需求
2. 根据任务特性，选择最合适的专家Agent
3. 确保路由决策准确、高效

## 可用的子Agent及其职责

### writer_agent
- **功能**: 擅长创作各类文章，包括散文、诗歌等文学作品
- **适用场景**: 
* 用户需要创作新文章、散文、诗歌等原创内容
* 简单的写作任务
- **输出**: writer_output

### reviewer_agent
- **功能**: 擅长对文章进行评论、修改和润色
- **适用场景**: 
* 用户需要修改、评审或优化现有文章
* 需要提高文章质量
- **输出**: reviewer_output

### translator_agent
- **功能**: 擅长将文章翻译成各种语言
- **适用场景**: 
* 用户需要将内容翻译成其他语言
* 多语言转换需求
- **输出**: translator_output

## 决策规则

1. **写作任务**: 如果用户需要创作新内容，选择 writer_agent
2. **修改任务**: 如果用户需要修改或优化现有内容，选择 reviewer_agent
3. **翻译任务**: 如果用户需要翻译内容，选择 translator_agent

## 响应格式
只返回Agent名称（writer_agent、reviewer_agent、translator_agent），不要包含其他解释。
""";

LlmRoutingAgent routingAgent = LlmRoutingAgent.builder()
  .name("content_routing_agent")
  .description("根据用户需求智能路由到合适的专家Agent")
  .model(chatModel)
  .systemPrompt(ROUTING_SYSTEM_PROMPT) 
  .subAgents(List.of(writerAgent, reviewerAgent, translatorAgent))
  .build();
```

##### 使用 Instruction

`instruction` 用于设置路由决策的用户指令，会作为 `UserMessage` 添加到消息列表中。你可以通过它提供额外的上下文信息或特定的路由指导：

**LlmRoutingAgent 使用指令示例**

```java
// 使用 instruction 提供额外的路由指导
final String ROUTING_INSTRUCTION = """
请根据用户的需求，选择最合适的Agent来处理任务。

特别注意：
- 如果用户明确提到"写"、"创作"、"生成"等词汇，优先选择 writer_agent
- 如果用户提到"修改"、"优化"、"评审"等词汇，选择 reviewer_agent
- 如果用户提到"翻译"、"转换语言"等词汇，选择 translator_agent
""";

LlmRoutingAgent routingAgent = LlmRoutingAgent.builder()
  .name("content_routing_agent")
  .description("根据用户需求智能路由到合适的专家Agent")
  .model(chatModel)
  .instruction(ROUTING_INSTRUCTION) 
  .subAgents(List.of(writerAgent, reviewerAgent, translatorAgent))
  .build();
```

##### 同时使用 SystemPrompt 和 Instruction

你可以同时使用 `systemPrompt` 和 `instruction` 来提供更完整的路由决策上下文：

**LlmRoutingAgent 同时使用 SystemPrompt 和 Instruction 示例**

```java
final String ROUTING_SYSTEM_PROMPT = """
你是一个智能的内容路由Agent，负责根据用户需求将任务路由到最合适的专家Agent。

## 可用的子Agent及其职责

### writer_agent
- **功能**: 擅长创作各类文章
- **输出**: writer_output

### reviewer_agent
- **功能**: 擅长对文章进行评论、修改和润色
- **输出**: reviewer_output

### translator_agent
- **功能**: 擅长将文章翻译成各种语言
- **输出**: translator_output

## 响应格式
只返回Agent名称，不要包含其他解释。
""";

final String ROUTING_INSTRUCTION = """
请仔细分析用户输入，根据以下规则选择最合适的Agent：
1. 创作新内容 -> writer_agent
2. 修改现有内容 -> reviewer_agent
3. 翻译内容 -> translator_agent
""";

LlmRoutingAgent routingAgent = LlmRoutingAgent.builder()
  .name("content_routing_agent")
  .description("根据用户需求智能路由到合适的专家Agent")
  .model(chatModel)
  .systemPrompt(ROUTING_SYSTEM_PROMPT) 
  .instruction(ROUTING_INSTRUCTION) 
  .subAgents(List.of(writerAgent, reviewerAgent, translatorAgent))
  .build();
```

##### SystemPrompt 和 Instruction 的区别

💡 **提示**：

- 使用 `systemPrompt` 来定义路由Agent的整体行为和决策框架
- 使用 `instruction` 来提供特定场景的路由指导或额外上下文
- 两者可以配合使用，提供更精确的路由控制

---

### 3.4 监督者（SupervisorAgent）1.1.2已移除

在**监督者模式**中，使用大语言模型（LLM）作为监督者，动态决定将任务路由到哪个子Agent，并支持**多步骤循环路由**。与 `LlmRoutingAgent` 不同，`SupervisorAgent` 支持子Agent执行完成后返回监督者，监督者可以根据执行结果继续路由到其他Agent或完成任务。

流程：

1. **监督者Agent**接收用户输入或前序Agent的输出
2. **LLM**分析当前状态并决定最合适的子Agent
3. **选中的子Agent**处理任务
4. **子Agent执行完成后返回监督者**
5. **监督者**根据结果决定：

- 继续路由到另一个子Agent（多步骤任务）
- 返回 `FINISH` 完成任务

![Gemini_Generated_Image_n1zpqwn1zpqwn1zp.png](/Ai/spring-ai-alibaba/saa-06-multi-agent/img-006.png)

#### 使用 Instruction 占位符

`SupervisorAgent` 支持通过 `instruction` 使用占位符来读取前序Agent的输出，这在 `SupervisorAgent` 作为 `SequentialAgent` 的子Agent时特别有用：

```java
// 第一个Agent：写文章
ReactAgent articleWriterAgent = ReactAgent.builder()
  .name("article_writer")
  .model(chatModel)
  .description("专业写作Agent，负责创作文章")
  .instruction("你是一个知名的作家，擅长写作和创作。请根据用户的提问进行回答：{input}。")
  .outputKey("article_content") 
  .build();

// 监督者的子Agent
ReactAgent translatorAgent = ReactAgent.builder()
  .name("translator_agent")
  .model(chatModel)
  .description("擅长将文章翻译成各种语言")
  .instruction("你是一个专业的翻译家，能够准确地将文章翻译成目标语言。待翻译文章：

 {article_content}。")
  .outputKey("translator_output")
  .build();

ReactAgent reviewerAgent = ReactAgent.builder()
  .name("reviewer_agent")
  .model(chatModel)
  .description("擅长对文章进行评审和修改")
  .instruction("你是一个知名的评论家，擅长对文章进行评论和修改。待评审文章：

 {article_content}。")
  .outputKey("reviewer_output")
  .build();

// 监督者的instruction使用占位符读取前序Agent的输出
final String SUPERVISOR_INSTRUCTION = """
你是一个智能的内容处理监督者，你可以看到前序Agent的聊天历史与任务处理记录。当前，你收到了以下文章内容：

{article_content} 

请根据文章内容的特点，决定是进行翻译还是评审：
- 如果文章是中文且需要翻译，选择 translator_agent
- 如果文章需要评审和改进，选择 reviewer_agent
- 如果任务完成，返回 FINISH
""";

final String SUPERVISOR_SYSTEM_PROMPT = """
你是一个智能的内容处理监督者，负责协调翻译和评审任务。

## 可用的子Agent及其职责

### translator_agent
- **功能**: 擅长将文章翻译成各种语言
- **输出**: translator_output

### reviewer_agent
- **功能**: 擅长对文章进行评审和修改
- **输出**: reviewer_output

## 响应格式
只返回Agent名称（translator_agent、reviewer_agent）或FINISH，不要包含其他解释。
""";

// 创建SupervisorAgent，instruction中包含占位符
SupervisorAgent supervisorAgent = SupervisorAgent.builder()
  .name("content_supervisor")
  .description("内容处理监督者，根据前序Agent的输出决定翻译或评审")
  .model(chatModel)
  .systemPrompt(SUPERVISOR_SYSTEM_PROMPT)
  .instruction(SUPERVISOR_INSTRUCTION) 
  .subAgents(List.of(translatorAgent, reviewerAgent))
  .build();

// 创建SequentialAgent，SupervisorAgent作为子Agent
SequentialAgent sequentialAgent = SequentialAgent.builder()
  .name("content_processing_workflow")
  .description("内容处理工作流：先写文章，然后根据文章内容决定翻译或评审")
  .subAgents(List.of(articleWriterAgent, supervisorAgent)) 
  .build();

// 使用
Optional<OverAllState> result = sequentialAgent.invoke("帮我写一篇关于春天的短文，然后翻译成英文");
```

---

### 自定义（了解即可，不建议）

#### FlowAgent 架构

`FlowAgent` 是所有流程型Agent（如 `SequentialAgent`、`ParallelAgent`、`LlmRoutingAgent`）的基类，它提供了以下核心能力：

**FlowAgent 架构示例**

```java
public abstract class FlowAgent extends Agent {

  protected List<Agent> subAgents;  // 子Agent列表
  protected CompileConfig compileConfig;  // 编译配置

  // 核心抽象方法：子类必须实现具体的图构建逻辑
  protected abstract StateGraph buildSpecificGraph(
      FlowGraphBuilder.FlowGraphConfig config
  ) throws GraphStateException;

  // 提供给子类使用的工具方法
  public List<Agent> subAgents() { return this.subAgents; }
  public CompileConfig compileConfig() { return compileConfig; }
}
```

#### 实现自定义FlowAgent

下面展示如何创建一个自定义的 `ConditionalAgent`，它根据条件选择不同的Agent分支：

**实现自定义FlowAgent示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/MultiAgentExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.flow.agent.FlowAgent;
import com.alibaba.cloud.ai.graph.agent.flow.builder.FlowAgentBuilder;
import com.alibaba.cloud.ai.graph.agent.flow.builder.FlowGraphBuilder;
import com.alibaba.cloud.ai.graph.StateGraph;
import com.alibaba.cloud.ai.graph.CompileConfig;
import com.alibaba.cloud.ai.graph.agent.Agent;

import java.util.List;
import java.util.function.Predicate;

/**
* 条件路由Agent：根据条件函数选择不同的Agent分支
*/
public class ConditionalAgent extends FlowAgent {

  private final Predicate<Map<String, Object>> condition;
  private final Agent trueAgent;
  private final Agent falseAgent;

  protected ConditionalAgent(ConditionalAgentBuilder builder) throws GraphStateException {
      super(builder.name, builder.description, builder.compileConfig,
            List.of(builder.trueAgent, builder.falseAgent));
      this.condition = builder.condition;
      this.trueAgent = builder.trueAgent;
      this.falseAgent = builder.falseAgent;
  }

  @Override
  protected StateGraph buildSpecificGraph(FlowGraphBuilder.FlowGraphConfig config)
          throws GraphStateException {
      // 使用 FlowGraphBuilder 构建自定义图结构
      return FlowGraphBuilder.buildConditionalGraph(
          config,
          this.condition,
          this.trueAgent,
          this.falseAgent
      );
  }

  public static ConditionalAgentBuilder builder() {
      return new ConditionalAgentBuilder();
  }

  /**
   * Builder for ConditionalAgent
   */
  public static class ConditionalAgentBuilder
          extends FlowAgentBuilder<ConditionalAgent, ConditionalAgentBuilder> {

      private Predicate<Map<String, Object>> condition;
      private Agent trueAgent;
      private Agent falseAgent;

      public ConditionalAgentBuilder condition(Predicate<Map<String, Object>> condition) {
          this.condition = condition;
          return this;
      }

      public ConditionalAgentBuilder trueAgent(Agent trueAgent) {
          this.trueAgent = trueAgent;
          return this;
      }

      public ConditionalAgentBuilder falseAgent(Agent falseAgent) {
          this.falseAgent = falseAgent;
          return this;
      }

      @Override
      public ConditionalAgent build() throws GraphStateException {
          if (condition == null || trueAgent == null || falseAgent == null) {
              throw new IllegalStateException(
                  "Condition, trueAgent and falseAgent must be set");
          }
          return new ConditionalAgent(this);
      }

      @Override
      protected ConditionalAgentBuilder self() {
          return this;
      }
  }
}
```

#### 使用自定义Agent

**使用自定义Agent示例**

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import java.util.Map;

// 创建两个分支Agent
ReactAgent urgentAgent = ReactAgent.builder()
  .name("urgent_handler")
  .model(chatModel)
  .description("处理紧急请求")
  .instruction("你需要快速响应紧急情况...")
  .outputKey("urgent_result")
  .build();

ReactAgent normalAgent = ReactAgent.builder()
  .name("normal_handler")
  .model(chatModel)
  .description("处理常规请求")
  .instruction("你可以详细分析和处理常规请求...")
  .outputKey("normal_result")
  .build();

// 定义条件：检查输入是否包含"紧急"关键字
Predicate<Map<String, Object>> isUrgent = state -> {
  Object input = state.get("input");
  if (input instanceof String) {
      return ((String) input).contains("紧急") || ((String) input).contains("urgent");
  }
  return false;
};

// 创建条件路由Agent
ConditionalAgent conditionalAgent = ConditionalAgent.builder()
  .name("priority_router")
  .description("根据紧急程度路由请求")
  .condition(isUrgent) 
  .trueAgent(urgentAgent) 
  .falseAgent(normalAgent) 
  .build();

// 使用
Optional<OverAllState> result1 = conditionalAgent.invoke("这是一个紧急问题需要立即处理");
// 会路由到 urgentAgent

Optional<OverAllState> result2 = conditionalAgent.invoke("请帮我分析一下这个问题");
// 会路由到 normalAgent
```

#### 实现复杂的循环Agent

你还可以创建更复杂的自定义Agent，例如带有循环逻辑的 `LoopAgent`：

**循环Agent实现示例**

```java
/**
* 循环Agent：重复执行直到满足退出条件
*/
public class CustomLoopAgent extends FlowAgent {

  private final Predicate<Map<String, Object>> exitCondition;
  private final int maxIterations;

  protected CustomLoopAgent(CustomLoopAgentBuilder builder)
          throws GraphStateException {
      super(builder.name, builder.description, builder.compileConfig, builder.subAgents);
      this.exitCondition = builder.exitCondition;
      this.maxIterations = builder.maxIterations;
  }

  @Override
  protected StateGraph buildSpecificGraph(FlowGraphBuilder.FlowGraphConfig config)
          throws GraphStateException {
      // 构建带有循环逻辑的图
      return FlowGraphBuilder.buildLoopGraph(
          config,
          this.exitCondition,
          this.maxIterations
      );
  }

  // Builder implementation...
}

// 使用示例
CustomLoopAgent refinementAgent = CustomLoopAgent.builder()
  .name("iterative_refinement")
  .subAgents(List.of(drafterAgent, reviewerAgent))
  .exitCondition(state -> {
      // 当质量分数 >= 8 时退出循环
      Object score = state.get("quality_score");
      return score != null && (int) score >= 8;
  })
  .maxIterations(5) // 最多循环5次
  .build();
```

#### 关键要点

扩展 `FlowAgent` 时需要注意：

1. **实现 buildSpecificGraph**：这是核心方法，定义了Agent的工作流逻辑
2. **使用 FlowGraphBuilder**：提供了构建图的工具方法
3. **继承 FlowAgentBuilder**：保持一致的构建器模式
4. **管理子Agent**：通过 `subAgents` 列表管理所有子Agent
5. **状态传递**：通过 `StateGraph` 控制状态在Agent之间的流动

通过自定义 `FlowAgent`，你可以实现任意复杂的多Agent协作模式，满足各种业务场景需求。

### 混合模式示例

你可以组合不同的模式创建复杂的工作流：

**混合模式示例**

```java
// 1. 创建研究Agent（并行执行）
ReactAgent webResearchAgent = ReactAgent.builder()
  .name("web_research")
  .model(chatModel)
  .description("从互联网搜索信息")
  .instruction("请搜索并收集关于以下主题的信息：{input}") 
  .outputKey("web_data")
  .build();

ReactAgent dbResearchAgent = ReactAgent.builder()
  .name("db_research")
  .model(chatModel)
  .description("从数据库查询信息")
  .instruction("请从数据库中查询并收集关于以下主题的信息：{input}") 
  .outputKey("db_data")
  .build();

ParallelAgent researchAgent = ParallelAgent.builder()
  .name("parallel_research")
  .description("并行收集多个数据源的信息")
  .subAgents(List.of(webResearchAgent, dbResearchAgent))
  .mergeOutputKey("research_data")
  .build();

// 2. 创建分析Agent
ReactAgent analysisAgent = ReactAgent.builder()
  .name("analysis_agent")
  .model(chatModel)
  .description("分析研究数据")
  .instruction("请分析以下收集到的数据并提供见解：{research_data}") 
  .outputKey("analysis_result")
  .build();

// 3. 创建报告Agent（路由选择格式）
ReactAgent pdfReportAgent = ReactAgent.builder()
  .name("pdf_report")
  .model(chatModel)
  .description("生成PDF格式报告")
  .instruction("""
              请根据研究结果和分析结果生成一份PDF格式的报告。
              
              研究结果：{research_data}
              分析结果：{analysis_result}
              """) 
  .outputKey("pdf_report")
  .build();

ReactAgent htmlReportAgent = ReactAgent.builder()
  .name("html_report")
  .model(chatModel)
  .description("生成HTML格式报告")
  .instruction("""
              请根据研究结果和分析结果生成一份HTML格式的报告。
              
              研究结果：{research_data}
              分析结果：{analysis_result}
              """) 
  .outputKey("html_report")
  .build();

LlmRoutingAgent reportAgent = LlmRoutingAgent.builder()
  .name("report_router")
  .description("根据需求选择报告格式")
  .model(chatModel)
  .subAgents(List.of(pdfReportAgent, htmlReportAgent))
  .build();

// 4. 组合成顺序工作流
SequentialAgent hybridWorkflow = SequentialAgent.builder()
  .name("research_workflow")
  .description("完整的研究工作流：并行收集 -> 分析 -> 路由生成报告")
  .subAgents(List.of(researchAgent, analysisAgent, reportAgent))
  .build();

// 使用
Optional<OverAllState> result = hybridWorkflow.invoke("研究AI技术趋势并生成HTML报告");
```
