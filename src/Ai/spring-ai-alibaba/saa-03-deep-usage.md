---
title: "3.深入使用Spring AI Alibaba Agent Framework"
sidebarGroup: "Spring AI Alibaba"
shortTitle: "3.深入使用Spring AI Alibaba Agent Framework"
order: 3
date: 2026-05-14
category: "AI"
tag:
  - "Spring AI Alibaba"
  - "Agent"
description: "SpringAi下的所有Api依然能用， 这里不介绍基于ChatClient的各种用法，SpringAi Alibaba基于这些API进行了扩展封装。"
---

> 来源：[3.深入使用Spring AI Alibaba Agent Framework](https://www.yuque.com/geren-t8lyq/sk9iuh/xiy4st3wfqqf6ag0?singleDoc#)  
> 配套代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs.git

![image](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-001.png)

SpringAi下的所有Api依然能用， 这里不介绍基于ChatClient的各种用法，SpringAi Alibaba基于这些API进行了扩展封装。

![image](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-002.jpg)

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-003.png)

# 与 ReactAgent 集成

## ReactAgent 理论基础

### 什么是 ReAct

![image](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-004.png)

ReAct（Reasoning + Acting）是一种将推理和行动相结合的 Agent 范式。在这个范式中，Agent 会：

1. **思考（Reasoning）**：分析当前情况，决定下一步该做什么
2. **行动（Acting）**：执行工具调用或生成最终答案
3. **观察（Observation）**：接收工具执行的结果
4. **迭代**：基于观察结果继续思考和行动，直到完成任务

这个循环使 Agent 能够：

- 将复杂问题分解为多个步骤
- 动态调整策略基于中间结果
- 处理需要多次工具调用的任务
- 在不确定的环境中做出决策

### ReactAgent 的工作原理

Spring AI Alibaba 中的`ReactAgent` 基于 **Graph 运行时**构建。Graph 由节点（steps）和边（connections）组成，定义了 Agent 如何处理信息。Agent 在这个 Graph 中移动，执行如下节点：

- **Model Node (模型节点)**：调用 LLM 进行推理和决策
- **Tool Node (工具节点)**：执行工具调用
- **Hook Nodes (钩子节点)**：在关键位置插入自定义逻辑

ReactAgent 的核心执行流程：

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-005.png)

## ReactAgent 和Plan-and-Execute  的区别

### 1. ReAct (Reason + Act)：走一步看一步的“摸着石头过河”

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-006.png)

ReAct 的核心逻辑是一个紧密的循环：思考（Thought） -> 行动（Action） -> 观察反馈（Observation）。模型必须在看到上一步工具执行的真实结果后，才会去思考下一步该干什么。

**运行机制**：Agent 接收到一个任务，先想“我第一步该干嘛”，然后调用工具，拿到工具的返回结果后，再去想“根据这个结果，我第二步该干嘛”，如此往复，直到得出最终答案。

**优点**（极其灵活）：它对环境的适应能力极强。如果在某一步工具报错了，或者搜索到了意料之外的信息，它可以立刻在下一个 Thought 中调整策略。

**缺点**（容易迷失）：一旦任务步骤较长（比如超过 5 步），Agent 极其容易“忘记”最初的目标，陷入死循环（比如反复调用同一个工具查询相同的信息），或者被中间某一步的错误信息带偏。

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-007.png)

### 2. Plan-and-Execute：谋定而后动的“工程派”

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-008.png)

Plan-and-Execute 将“大脑（Planner）”和“手脚（Executor）”分开了。它认为大型语言模型在全局规划上的能力，不应该和具体的工具调用混在一起。

运行机制：

**规划阶段**：Planner 模型看着最初的复杂目标，直接在脑海里拆解出一个完整的待办事项列表（Task List），例如：步骤 1 做什么、步骤 2 做什么……步骤 5 汇总。

执行阶段：Executor 模型（或者甚至是用一些简单的无模型代码逻辑）拿到这个列表，挨个去执行。执行器通常不需要理解全局目标，它只要把眼前的单个子任务做好就行。

**优点**（全局观与稳定性）：非常适合长线任务和复杂工程。由于一开始就把大目标切成了小块，Agent 在执行时不会偏离主线。此外，它通常更节省 Token，因为执行每一步时不需要把之前所有的推理过程都塞进上下文里。

**缺点**（应变能力差）：如果“步骤 2”执行失败或者返回了与预期完全不符的结果，死板的 Plan-and-Execute 可能会硬着头皮继续执行“步骤 3”，导致最终结果崩溃。

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-009.png)

### 结论

因为 ReAct 容易迷失，Plan-and-Execute 又太死板，所以现在的先进 Agent 框架：

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-010.png)

Spring AI Alibaba也可以通过多ReactAgent组合实现Plan-and-Execute模式， 一个ReactAgent用来规划，  另一个ReactAgent用来具体执行每一步。

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-011.png)

两者结合：ReactAgent(Plan) -> ReactAgent( Execute -> Replanning（重规划）)。

这样就达到了即先制定一个全局计划，然后去执行第一步，拿到第一步的结果后，再让大模型看一眼全局计划，问它：“基于刚才的结果，剩下的计划需要修改吗？” 这样既保证了有全局视野，又保留了走一步看一步的灵活性。

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-012.png)

# 废话不多说直接整个示例：

# 前置条件

在使用 DashScopeChatModel 之前，你需要：

1. 获取 DashScope API Key：访问 [阿里云百炼](https://www.aliyun.com/product/bailian)
2. 设置环境变量：`export AI_DASHSCOPE_API_KEY=your_api_key`
3. **jdk17  springboot3   maven**

# 添加依赖

```xml
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
    <version>1.1.2.2</version>
</dependency>
```

### 快速运行聊天机器人

为了方便测试先来启动官方提供的UI聊天界面

社区在 examples/chatbot 上提供了一个聊天机器人示例。

1. 加入依赖

```java

        <dependency>
            <groupId>com.alibaba.cloud.ai</groupId>
            <artifactId>spring-ai-alibaba-studio</artifactId>
            <version>1.1.2.2</version>
        </dependency>
```

1. 配置AgentBean
2. 与聊天机器人聊天。

打开浏览器，访问 [http://localhost:8080/chatui/index.html?agent=](http://localhost:8080/chatui/index.html?agent=xs-claw)你配置的agent的name

![image](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-013.gif)

## 基本使用

在 Spring AI Alibaba Agent Framework 中使用 DashScopeChatModel：

- 测试启动思考
- 设置系统消息
- 设置配置项
- 同步请求
- 流式响应
- 其他大模型使用

```java
 

@SpringBootTest
class TestChatModel {

    // 演示：基于ReactAgent设置模型配置项
    // 测试启动思考
    @Test
    public void test1(@Autowired DashScopeChatModel chatModel) throws GraphRunnerException {

        ReactAgent agent = ReactAgent.builder()
                .name("my_agent")       //必须
                .model(chatModel)
                // 设置配置相信
                .chatOptions(DashScopeChatOptions.builder().enableThinking(true).build())
                .systemPrompt("你是一个有帮助的AI助手")
                .instruction("""
                         在回答问题时，请：
                          1. 首先理解用户的核心需求
                          2. 分析可能的技术方案
                          3. 提供清晰的建议和理由
                          4. 如果需要更多信息，主动询问 
                          保持专业、友好的语气。
                        """)
                .build();

        // 调用 Agent
        AssistantMessage response = agent.call("你是谁");

        System.out.println(response.getMetadata());
        System.out.println(response.getMetadata().get("reasoningContent"));
        System.out.println(response.getText());
    }

    // 演示：基于ReactAgent的流式响应
    // 输出思考和正文
    @Test
    public void test2(@Autowired DashScopeChatModel chatModel) throws GraphRunnerException {

        ReactAgent agent = ReactAgent.builder()
                .name("my_agent")
                .model(chatModel)
                // 设置配置相信
                .chatOptions(DashScopeChatOptions.builder().enableThinking(true).build())
                .systemPrompt("你是一个有帮助的AI助手")
                .build();

        // 调用 Agent
        Flux<NodeOutput> stream = agent.stream("你是谁");
        stream.toIterable().forEach(nodeOutput -> {

            if (nodeOutput instanceof StreamingOutput<?> streamingOutput) {
                if (streamingOutput.getOutputType() == OutputType.AGENT_MODEL_FINISHED) {
                    return;
                }
                Message message = streamingOutput.message();
                Object reasoningContent = message.getMetadata().get("reasoningContent");
                if (!StringUtils.isEmpty(reasoningContent.toString())) {
                    System.out.println("思考：" + reasoningContent);
                } else {

                    if (message instanceof AssistantMessage assistantMessage) {
                        System.out.println("正文：" + assistantMessage.getText());
                    }
                }
            }
        });
    }

    // 演示：基于ReactAgent其他模型的兼容性
    // deepseek同样兼容
    @Test
    public void test3(@Autowired DeepSeekChatModel chatModel) throws GraphRunnerException {
        ReactAgent agent = ReactAgent.builder()
                .name("my_agent")
                .model(chatModel)
                // 设置配置相信
                //.chatOptions(DashScopeChatOptions.builder().enableThinking(true).build())
                .systemPrompt("你是一个有帮助的AI助手")
                .build();

        // 调用 Agent
        AssistantMessage response = agent.call("你是谁");
        System.out.println(response.getText());
    }

    // 演示：基于ReactAgent其他模型的兼容性
    // deepseek同样兼容
    @Test
    public void test4(@Autowired DeepSeekChatModel chatModel) throws GraphRunnerException {
        ReactAgent agent = ReactAgent.builder()
                .name("my_agent")
                .model(chatModel)
                .chatOptions(DeepSeekChatOptions.builder().model("deepseek-reasoner").build())
                .systemPrompt("你是一个有帮助的AI助手")
                .build();

        // 调用 Agent

        DeepSeekAssistantMessage assistantMessage=  (DeepSeekAssistantMessage)agent.call("你是谁");
        System.out.println(assistantMessage.getReasoningContent());
        System.out.println("-----------------------------------------");
        System.out.println(assistantMessage.getText());
    }
}

```

# 在 ReactAgent 中使用结构化输出

结构化输出允许 Agent 以特定的、可预测的格式返回数据。相比于解析自然语言响应，您可以直接获得 JSON 对象或 Java POJO 形式的结构化数据，应用程序可以直接使用。

```java
  @Test
    public void testBoolOut(@Autowired DashScopeChatModel chatModel) throws GraphRunnerException {
        ReactAgent agent = ReactAgent.builder()
                .name("analysis_agent")
                .model(chatModel)
                .systemPrompt("""
                            请判断用户信息是否表达了投诉意图? 
                        """)
                .outputType(Boolean.class)
                .build();

        AssistantMessage response = agent.call("你好");

        System.out.println(response.getText());
    }

    public record Address(
            String name,        // 收件人姓名
            String phone,       // 联系电话
            String province,    // 省
            String city,        // 市
            String district,    // 区/县
            String detail       // 详细地址
    ) {}

    @Test
    public void testEntityOut(@Autowired DashScopeChatModel chatModel) throws GraphRunnerException {
        ReactAgent agent = ReactAgent.builder()
                .name("analysis_agent")
                .model(chatModel)
                .systemPrompt("""
                        请从下面这条文本中提取收货信息
                        """)
                .outputType(Address.class)
                .build();

        AssistantMessage response = agent.call("收货人：张三，电话13588888888，地址：浙江省杭州市西湖区文一西路100号8幢202室");

        System.out.println(response.getText());
    }

```

### 错误处理

模型可能不总是返回格式完美的 JSON。以下是处理潜在问题的策略:

#### Try-Catch 模式

```java
ReactAgent agent = ReactAgent.builder()
  .name("data_extractor")
  .model(chatModel)
  .outputType(DataOutput.class)
  .build();

try {
  AssistantMessage result = agent.call("提取数据");
  ObjectMapper mapper = new ObjectMapper();
  DataOutput data = mapper.readValue(result.getText(), DataOutput.class);
  // 处理数据
} catch (JsonProcessingException e) {
  System.err.println("JSON解析失败: " + e.getMessage());
  System.err.println("原始输出: " + result.getText());
  // 回退处理
}
```

#### 验证模式

```java
public class ValidatedOutput {
private String title;
private Integer rating;

public void validate() throws IllegalArgumentException {
if (title == null || title.isEmpty()) {
throw new IllegalArgumentException("标题不能为空");
}
if (rating != null && (rating < 1 || rating > 5)) {
throw new IllegalArgumentException("评分必须在1-5之间");
}
}

// Getter 和 Setter 方法...
}

AssistantMessage result = agent.call("生成评价");
ValidatedOutput output = mapper.readValue(result.getText(), ValidatedOutput.class);
output.validate(); // 如果无效则抛出异常
```

#### 重试模式

```java
int maxRetries = 3;
DataOutput data = null;

for (int i = 0; i < maxRetries; i++) {
    try {
        AssistantMessage result = agent.call("提取数据");
        data = mapper.readValue(result.getText(), DataOutput.class);
        break; // 成功
    } catch (Exception e) {
        if (i == maxRetries - 1) {
            throw new RuntimeException("多次尝试后仍然失败", e);
        }
        System.out.println("第" + (i + 1) + "次尝试失败，重试中...");
    }
}
```

# 在 ReactAgent 中使用短期记忆

## 关于LLM的记忆

LLM本身不存储聊天记录（记忆）= 训练（微调）

记忆：每轮对话的时候将聊天记录发给大模型， 问题：token上限， 聊着聊着之前的记忆就忘了。

三层记忆架构：

短期：10-20对话记录存储（redis\db...）

中期：提取跟当前对话相关联的聊天记录（RAG）

长期：存储核心结构化数据（用户画像、经验信息）   我男性、35岁  ，   （主动） md文件

![Gemini_Generated_Image_58oloi58oloi58ol.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-014.png)

## 短期记忆

Spring AI Alibaba 将短期记忆作为 Agent 状态的一部分进行管理。

通过将这些存储在 Graph 的状态中，Agent 可以访问给定对话的完整上下文，同时保持不同对话之间的分离。状态使用 checkpointer 持久化到数据库（或内存），以便可以随时恢复线程。短期记忆在调用 Agent 或完成步骤（如工具调用）时更新，并在每个步骤开始时读取状态。

### 使用方法

在 Spring AI Alibaba 中，要向 Agent 添加短期记忆（会话级持久化），你需要在创建 Agent 时指定 `checkpointer`。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;

import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.RunnableConfig;

// 配置 checkpointer
ReactAgent agent = ReactAgent.builder()
.name("my_agent")
.model(chatModel)
.tools(getUserInfoTool)
.saver(new MemorySaver())
.build();

// 使用 thread_id 维护对话上下文
RunnableConfig config = RunnableConfig.builder()
.threadId("1") // threadId 指定会话 ID
.build();

agent.call("你好！我叫 Bob。", config);
```

### Redis存储记忆

在生产环境中，使用数据库支持的 checkpointer：

**示例：使用 Redis Checkpointer**：

```java

    @Test
    public void test02(@Autowired DashScopeChatModel chatModel,
    @Autowired RedissonClient redissonClient) throws GraphRunnerException {

        // 配置 Redis checkpointer
        RedisSaver redisSaver = RedisSaver.builder().redisson(redissonClient).build();

        ReactAgent agent = ReactAgent.builder()
                .name("my_agent")
                .model(chatModel)
                .saver(redisSaver)
                .build();

        // 使用 thread_id 维护对话上下文
        RunnableConfig config = RunnableConfig.builder()
                .threadId("1") // threadId 指定会话 ID
                .build();

        System.out.println(agent.call("你好！我叫 徐庶。", config).getText());
        System.out.println("-----------------------------------");
        System.out.println(agent.call("我叫什么。", config).getText());

        System.out.println("-----------------------------------");
        RunnableConfig config2 = RunnableConfig.builder()
                .threadId("2") // threadId 指定会话 ID
                .build();

        System.out.println(agent.call("我叫什么", config2).getText());
    }

```

### 设置消息最大数量

Hook限制发给大模型的最大聊天记录，   不能限制存储最大聊天记录，一直存 （定时如何跑批次，删掉归档数据库，20轮以外的聊天记录--->向量数据库 ----> 判断是不是结构化信息（长期））,

springai限制的是存储的聊天记录（20）

```java
@HookPositions({HookPosition.BEFORE_MODEL})
public class MessageTrimmingHook extends MessagesModelHook {

    private static final int MAX_MESSAGES = 1;

    @Override
    public String getName() {
        return "message_trimming";
    }

    @Override
    public AgentCommand beforeModel(List<Message> previousMessages, RunnableConfig config) {
        // 如果消息数量超过限制，只保留最后 MAX_MESSAGES 条消息
        if (previousMessages.size() > MAX_MESSAGES) {
            List<Message> trimmedMessages = previousMessages.subList(
                previousMessages.size() - MAX_MESSAGES,
                previousMessages.size()
            );
            // 使用 REPLACE 策略替换所有消息
            return new AgentCommand(trimmedMessages, UpdatePolicy.REPLACE);
        }
        // 如果消息数量未超过限制，返回原始消息（不进行修改）
        return new AgentCommand(previousMessages);
    }

}
```

```java
 @Test
    public void test03(@Autowired DashScopeChatModel chatModel,
                       @Autowired RedissonClient redissonClient) throws GraphRunnerException {

        // 配置 Redis checkpointer
        RedisSaver redisSaver = RedisSaver.builder().redisson(redissonClient).build();

        ReactAgent agent = ReactAgent.builder()
                .name("my_agent")
                .model(chatModel)
                .hooks(new MessageTrimmingHook())
                .saver(redisSaver)
                .build();

        // 使用 thread_id 维护对话上下文
        RunnableConfig config = RunnableConfig.builder()
                .threadId("1") // threadId 指定会话 ID
                .build();

        System.out.println(agent.call("你好！我叫 徐庶。", config).getText());
        System.out.println("-----------------------------------");
        System.out.println(agent.call("我叫什么。", config).getText());

        System.out.println("-----------------------------------");
        RunnableConfig config2 = RunnableConfig.builder()
                .threadId("2") // threadId 指定会话 ID
                .build();

        System.out.println(agent.call("我叫什么", config2).getText());
    }
```

# 在 ReactAgent 中使用工具

![image.png](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-015.png)

tool：解决怎么调用自己系统业务Api问题（提供基本的工具能力、自己业务API方法）

ReactAgent 提供了多种方式来提供和使用工具。根据你的使用场景，可以选择最适合的方式。

### **工具提供方式**

#### **1. 直接工具（FunctionToolCallback）**

最直接的方式是使用 **tools()** 方法直接传入 **ToolCallback** 实例。这种方式适合工具数量较少、工具定义明确的场景。

**使用 tools() 方法提供工具**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/ToolsExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;

// 创建工具
ToolCallback weatherTool = FunctionToolCallback
.builder("get_weather", new WeatherFunction())
.description("Get weather for a given city")
.inputType(WeatherInput.class)
.build();

ToolCallback searchTool = FunctionToolCallback
.builder("search", new SearchFunction())
.description("Search for information")
.inputType(String.class)
.build();

// 使用 tools() 方法直接提供工具
ReactAgent agent = ReactAgent.builder()
.name("my_agent")
.model(chatModel)
.tools(weatherTool, searchTool) // 直接传入 ToolCallback 实例
.systemPrompt("You are a helpful assistant with access to weather and search tools.")
.saver(new MemorySaver())
.build();
```

**适用场景**：

- 工具数量较少（通常少于 5 个）
- 工具定义在编译时已知
- 需要类型安全的工具定义

#### **2. 方法工具（@Tool）**

使用 **methodTools()** 方法传入带有 **@Tool** 注解方法的对象。这种方式让工具定义更加简洁，适合将工具逻辑组织在类中。

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

// 定义工具类，使用 @Tool 注解
public class CalculatorTools {
@Tool(description = "Add two numbers together")
public String add(
@ToolParam(description = "First number") int a,
@ToolParam(description = "Second number") int b) {
return String.valueOf(a + b);
}

@Tool(description = "Multiply two numbers together")
public String multiply(
@ToolParam(description = "First number") int a,
@ToolParam(description = "Second number") int b) {
return String.valueOf(a * b);
}
}

// 使用 methodTools() 方法
CalculatorTools calculatorTools = new CalculatorTools();

ReactAgent agent = ReactAgent.builder()
.name("calculator_agent")
.model(chatModel)
.description("An agent that can perform calculations")
.instruction("You are a helpful calculator assistant.")
.methodTools(calculatorTools) // 传入带有 @Tool 注解方法的对象
.saver(new MemorySaver())
.build();

// 可以传入多个 methodTools 对象
WeatherTools weatherTools = new WeatherTools();
ReactAgent multiAgent = ReactAgent.builder()
.name("multi_tool_agent")
.model(chatModel)
.methodTools(calculatorTools, weatherTools) // 多个工具对象
.build();
```

**适用场景**：

- 工具逻辑组织在类中
- 需要将相关工具分组
- 工具方法需要访问类成员变量

#### **3. 工具提供者（toolCallbackProviders）**

使用 **ToolCallbackProvider** 接口动态提供工具。这种方式适合需要根据运行时条件动态决定提供哪些工具的场景。  MCP也是用这种方式。

**使用 toolCallbackProviders() 方法提供工具 **

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.function.FunctionToolCallback;
import java.util.List;

// 实现 ToolCallbackProvider 接口
public class CustomToolCallbackProvider implements ToolCallbackProvider {
private final List<ToolCallback> toolCallbacks;

public CustomToolCallbackProvider(List<ToolCallback> toolCallbacks) {
this.toolCallbacks = toolCallbacks;
}

@Override
public ToolCallback[] getToolCallbacks() {
return toolCallbacks.toArray(new ToolCallback[0]);
}
}

// 创建工具
ToolCallback searchTool = FunctionToolCallback.builder("search", new SearchToolWithContext())
.description("Search for information")
.inputType(String.class)
.build();

// 创建 ToolCallbackProvider
ToolCallbackProvider toolProvider = new CustomToolCallbackProvider(List.of(searchTool));

// 使用 toolCallbackProviders() 方法
ReactAgent agent = ReactAgent.builder()
.name("search_agent")
.model(chatModel)
.description("An agent that can search for information")
.instruction("You are a helpful assistant with search capabilities.")
.toolCallbackProviders(toolProvider) // 使用 ToolCallbackProvider
.saver(new MemorySaver())
.build();
```

**适用场景**：

- 需要根据运行时条件动态提供工具
- 工具来自外部系统或配置
- 需要实现工具的动态加载和卸载

#### **4. 工具名称解析（toolNames + resolver）**

使用 **toolNames()** 方法指定工具名称，配合 **resolver()** 方法提供的 **ToolCallbackResolver** 来解析工具。这种方式适合工具定义和工具使用分离的场景。

**使用 toolNames() 和 resolver() 方法提供工具**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/ToolsExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.ai.tool.resolution.StaticToolCallbackResolver;
import java.util.List;

// 创建工具（使用复合类型）
ToolCallback searchTool = FunctionToolCallback.builder("search", new SearchFunctionWithRequest())
.description("Search for information")
.inputType(SearchRequest.class)
.build();

ToolCallback calculatorTool = FunctionToolCallback.builder("calculator", new CalculatorFunctionWithRequest())
.description("Perform arithmetic calculations")
.inputType(CalculatorRequest.class)
.build();

// 创建 StaticToolCallbackResolver，包含所有工具
StaticToolCallbackResolver resolver = new StaticToolCallbackResolver(
List.of(calculatorTool, searchTool));

// 使用 toolNames() 指定要使用的工具名称，必须配合 resolver() 使用
ReactAgent agent = ReactAgent.builder()
.name("multi_tool_agent")
.model(chatModel)
.description("An agent with multiple tools")
.instruction("You are a helpful assistant with access to calculator and search tools.")
.toolNames("calculator", "search") // 使用工具名称而不是 ToolCallback 实例
.resolver(resolver) // 必须提供 resolver 来解析工具名称
.saver(new MemorySaver())
.build();
```

**重要提示**：**toolNames()** 方法必须与 **resolver()** 方法配合使用，否则会抛出异常。

**适用场景**：

- 工具定义和工具使用分离
- 需要从配置或外部系统读取工具名称
- 工具可能动态变化，但名称保持稳定

#### **5. 工具解析器（resolver）**

直接使用 **resolver()** 方法提供 **ToolCallbackResolver**。解析器可以用于工具节点，也可以与 **toolNames()** 配合使用。

**使用 resolver() 方法提供工具**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/ToolsExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.ai.tool.resolution.StaticToolCallbackResolver;
import java.util.List;

// 创建工具
ToolCallback calculatorTool = FunctionToolCallback.builder("calculator", new CalculatorFunctionWithContext())
.description("Perform arithmetic calculations")
.inputType(String.class)
.build();

// 创建 resolver
StaticToolCallbackResolver resolver = new StaticToolCallbackResolver(
List.of(calculatorTool));

// 使用 resolver，可以直接在 tools 中使用，也可以仅通过 resolver 提供
ReactAgent agent = ReactAgent.builder()
.name("resolver_agent")
.model(chatModel)
.description("An agent using ToolCallbackResolver")
.instruction("You are a helpful calculator assistant.")
.tools(calculatorTool) // 直接指定工具
.resolver(resolver) // 同时设置 resolver 供工具节点使用
.saver(new MemorySaver())
.build();
```

**适用场景**：

- 需要自定义工具解析逻辑
- 工具来自多个来源需要统一管理
- 需要实现工具的动态查找和加载

#### **6. 组合使用多种方式**

你可以同时使用多种工具提供方式，ReactAgent 会将它们合并。

**组合使用多种工具提供方式**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/ToolsExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.function.FunctionToolCallback;
import java.util.List;

// Method tools
CalculatorTools calculatorTools = new CalculatorTools();

// Direct tool
ToolCallback searchTool = FunctionToolCallback.builder("search", new SearchToolWithContext())
.description("Search for information")
.inputType(String.class)
.build();

// ToolCallbackProvider
ToolCallbackProvider toolProvider = new CustomToolCallbackProvider(List.of(searchTool));

// 组合使用多种方式
ReactAgent agent = ReactAgent.builder()
.name("combined_tool_agent")
.model(chatModel)
.description("An agent with multiple tool provision methods")
.instruction("You are a helpful assistant with calculator and search capabilities.")
.methodTools(calculatorTools) // Method-based tools
.toolCallbackProviders(toolProvider) // Provider-based tools
.tools(searchTool) // Direct tools
.saver(new MemorySaver())
.build();
```

**适用场景**：

- 工具来自不同来源
- 需要灵活组合不同类型的工具
- 逐步迁移或扩展现有工具集

### **选择建议**

根据你的具体需求选择合适的工具提供方式：

### **基础使用示例**

在 ReactAgent 中使用工具非常简单：

**在 ReactAgent 中使用工具示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/tutorials/ToolsExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;

// 创建工具
ToolCallback weatherTool = FunctionToolCallback
.builder("get_weather", new WeatherFunction())
.description("Get weather for a given city")
.inputType(String.class)
.build();

ToolCallback searchTool = FunctionToolCallback
.builder("search", new SearchFunction())
.description("Search for information")
.inputType(String.class)
.build();

// 创建带有工具的 Agent
ReactAgent agent = ReactAgent.builder()
.name("my_agent")
.model(chatModel)
.tools(weatherTool, searchTool)
.systemPrompt("You are a helpful assistant with access to weather and search tools.")
.saver(new MemorySaver())
.build();

// 使用 Agent
AssistantMessage response = agent.call("What's the weather like in San Francisco?");
System.out.println(response.getText());
```

## 智能体作为工具（Agent Tool）

在工具调用中，一个Agent（"控制器"）将其他Agent视为工具（AgentTool），在需要时调用。控制器管理编排，而工具Agent执行特定任务并返回结果。

流程：

1. **控制器**接收输入并决定调用哪个工具（子Agent）
2. **工具Agent**根据控制器的指令运行其任务
3. **工具Agent**将结果返回给控制器
4. **控制器**决定下一步或完成任务

![image](/Ai/spring-ai-alibaba/saa-03-deep-usage/img-016.png)

作为工具使用的Agent通常**不期望**与用户继续对话。它们的角色是执行任务并将结果返回给控制器Agent。

### 实现

下面是一个最小示例，其中主Agent通过工具定义访问单个子Agent：

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.AgentTool;
import org.springframework.ai.chat.model.ChatModel;

// 创建子Agent
ReactAgent writerAgent = ReactAgent.builder()
  .name("writer_agent")
  .model(chatModel)
  .description("可以写文章")
  .instruction("你是一个知名的作家，擅长写作和创作。请根据用户的提问进行回答。")
  .build();

// 创建主Agent，将子Agent作为工具
ReactAgent blogAgent = ReactAgent.builder()
  .name("blog_agent")
  .model(chatModel)
  .instruction("根据用户给定的主题写一篇文章。使用写作工具来完成任务。")
  .tools(AgentTool.getFunctionToolCallback(writerAgent)) 
  .build();

// 使用
Optional<OverAllState> result = blogAgent.invoke("帮我写一个100字左右的散文");
```

在这种模式中：

1. 主Agent在决定任务匹配子Agent的描述时调用工具
2. 子Agent独立运行并返回结果
3. 主Agent接收结果并继续编排

### 自定义点

你可以在几个点控制主Agent和子Agent之间的上下文传递：

1. **子Agent名称**（`"writer_agent"`）：这是主Agent引用子Agent的方式。由于它影响提示，请谨慎选择。
2. **子Agent描述**（`"可以写文章"`）：这是主Agent"知道"的关于子Agent的内容。它直接影响主Agent决定何时调用它。
3. **子Agent的输入**：你可以自定义此输入以更好地塑造子Agent如何解释任务。
4. **子Agent的输出**：这是传递回主Agent的**响应**。你可以调整返回的内容以控制主Agent如何解释结果。

### 控制子Agent的输入

有两个主要杠杆来控制主Agent传递给子Agent的输入：

- **修改提示词**——调整主Agent的提示或工具元数据（即子Agent的名称和描述），以更好地指导何时以及如何调用子Agent。
- **上下文注入**——通过使用 `inputSchema` 或 `inputType` 来定义结构化输入，使子Agent能够接收更丰富的上下文信息。

#### 使用 inputSchema

使用标准的 JSON Schema 格式定义输入结构，确保子Agent能够接收结构化的输入信息：

**使用 inputSchema 示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/AgentToolExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.AgentTool;

// 定义子Agent的输入Schema（标准 JSON Schema 格式）
String writerInputSchema = """
  {
      "type": "object",
      "properties": {
          "topic": {
              "type": "string"
          },
          "wordCount": {
              "type": "integer"
          },
          "style": {
              "type": "string"
          }
      },
      "required": ["topic", "wordCount", "style"]
  }
  """;

ReactAgent writerAgent = ReactAgent.builder()
  .name("structured_writer_agent")
  .model(chatModel)
  .description("根据结构化输入写文章")
  .instruction("你是一个专业作家。请严格按照输入的主题、字数和风格要求创作文章。")
  .inputSchema(writerInputSchema) 
  .build();

ReactAgent coordinatorAgent = ReactAgent.builder()
  .name("coordinator_agent")
  .model(chatModel)
  .instruction("你需要调用写作工具来完成用户的写作请求。请根据用户需求，使用结构化的参数调用写作工具。")
  .tools(AgentTool.getFunctionToolCallback(writerAgent))
  .build();

Optional<OverAllState> result = coordinatorAgent.invoke("请写一篇关于春天的散文，大约150字");
```

#### 使用 inputType

使用 Java 类型定义输入，框架会自动生成 JSON Schema：

**使用 inputType 示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/AgentToolExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.AgentTool;

// 定义输入类型
public record ArticleRequest(
  String topic,      // 文章主题
  int wordCount,     // 字数要求
  String style       // 文章风格
) {}

ReactAgent writerAgent = ReactAgent.builder()
  .name("typed_writer_agent")
  .model(chatModel)
  .description("根据类型化输入写文章")
  .instruction("你是一个专业作家。请严格按照输入的 topic（主题）、wordCount（字数）和 style（风格）要求创作文章。")
  .inputType(ArticleRequest.class) 
  .build();

ReactAgent coordinatorAgent = ReactAgent.builder()
  .name("coordinator_with_type_agent")
  .model(chatModel)
  .instruction("你需要调用写作工具来完成用户的写作请求。工具接收 JSON 格式的参数。")
  .tools(AgentTool.getFunctionToolCallback(writerAgent))
  .build();

Optional<OverAllState> result = coordinatorAgent.invoke("请写一篇关于秋天的现代诗，大约100字");
```

### 控制子Agent的输出

塑造主Agent从子Agent接收的内容的常见策略：

- **修改提示词**——优化子Agent的提示以指定应返回的确切内容。

- 当输出不完整、过于冗长或缺少关键细节时很有用。
- 常见的失败模式是子Agent执行工具调用或推理但**不在最终消息中包含结果**。提醒它控制器（和用户）只看到最终输出，因此必须在那里包含所有相关信息。

- **自定义输出格式**——使用 `outputSchema` 或 `outputType` 定义结构化输出格式。

#### 使用 outputType

使用 Java 类型定义输出，框架会自动生成输出 schema：

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.AgentTool;
import org.springframework.ai.converter.BeanOutputConverter;

// 定义输出类型
public class ArticleOutput {
  private String title;
  private String content;
  private int characterCount;

  // getters and setters
}

ReactAgent writerAgent = ReactAgent.builder()
  .name("writer_with_output_type")
  .model(chatModel)
  .description("写文章并返回类型化输出")
  .instruction("你是一个专业作家。请创作文章并返回包含 title、content 和 characterCount 的结构化结果。")
  .outputType(ArticleOutput.class) 
  .build();

ReactAgent coordinatorAgent = ReactAgent.builder()
  .name("coordinator_output_type")
  .model(chatModel)
  .instruction("调用写作工具完成用户请求。")
  .tools(AgentTool.getFunctionToolCallback(writerAgent))
  .build();

Optional<OverAllState> result = coordinatorAgent.invoke("写一篇关于夏天的小诗");
```

### 完整类型化示例

同时使用 `inputType` 和 `outputType` 进行完整的类型化Agent工具调用：

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.AgentTool;

// 定义输入和输出类型
public record ArticleRequest(String topic, int wordCount, String style) {}

public class ArticleOutput {
  private String title;
  private String content;
  private int characterCount;
  // getters and setters
}

public class ReviewOutput {
  private String comment;
  private boolean approved;
  private List<String> suggestions;
  // getters and setters
}

// 创建完整类型化的Agent
ReactAgent writerAgent = ReactAgent.builder()
  .name("full_typed_writer")
  .model(chatModel)
  .description("完整类型化的写作工具")
  .instruction("根据结构化输入（topic、wordCount、style）创作文章，并返回结构化输出（title、content、characterCount）。")
  .inputType(ArticleRequest.class) 
  .outputType(ArticleOutput.class) 
  .build();

ReactAgent reviewerAgent = ReactAgent.builder()
  .name("typed_reviewer")
  .model(chatModel)
  .description("完整类型化的评审工具")
  .instruction("对文章进行评审，返回评审意见（comment、approved、suggestions）。")
  .outputType(ReviewOutput.class) 
  .build();

ReactAgent orchestratorAgent = ReactAgent.builder()
  .name("orchestrator")
  .model(chatModel)
  .instruction("协调写作和评审流程。先调用写作工具创作文章，然后调用评审工具进行评审。")
  .tools(
      AgentTool.getFunctionToolCallback(writerAgent),
      AgentTool.getFunctionToolCallback(reviewerAgent)
  )
  .build();

Optional<OverAllState> result = orchestratorAgent.invoke("请写一篇关于友谊的散文，约200字，需要评审");
```

### 子Agent作为工具

在实际应用中，主Agent通常需要访问多个不同的子Agent工具，根据任务需求选择合适的工具进行调用。这种模式允许你构建更灵活、更强大的多Agent系统。

**多个子Agent作为工具示例**[查看完整代码](https://github.com/alibaba/spring-ai-alibaba/tree/main/examples/documentation/src/main/java/com/alibaba/cloud/ai/examples/documentation/framework/advanced/AgentToolExample.java)

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.AgentTool;

// 创建写作Agent
ReactAgent writerAgent = ReactAgent.builder()
  .name("writer_agent")
  .model(chatModel)
  .description("专门负责创作文章和内容生成")
  .instruction("你是一个专业作家，擅长各类文章创作。")
  .build();

// 创建翻译Agent
ReactAgent translatorAgent = ReactAgent.builder()
  .name("translator_agent")
  .model(chatModel)
  .description("专门负责文本翻译工作")
  .instruction("你是一个专业翻译，能够准确翻译多种语言。")
  .build();

// 创建总结Agent
ReactAgent summarizerAgent = ReactAgent.builder()
  .name("summarizer_agent")
  .model(chatModel)
  .description("专门负责内容总结和提炼")
  .instruction("你是一个内容总结专家，擅长提炼关键信息。")
  .build();

// 创建主Agent，集成多个工具
ReactAgent multiToolAgent = ReactAgent.builder()
  .name("multi_tool_coordinator")
  .model(chatModel)
  .instruction("你可以访问多个专业工具：写作、翻译和总结。" +
          "根据用户需求选择合适的工具来完成任务。")
  .tools(
      AgentTool.getFunctionToolCallback(writerAgent),      
      AgentTool.getFunctionToolCallback(translatorAgent),  
      AgentTool.getFunctionToolCallback(summarizerAgent)   
  )
  .build();

// 使用 - 主Agent会根据需求自动选择合适的工具
Optional<OverAllState> result = multiToolAgent.invoke(
  "请写一篇关于AI的文章，然后翻译成英文，最后给出摘要");
```

在这种模式中：

1. **专业化分工**：每个子Agent专注于特定领域（写作、翻译、总结等）
2. **灵活组合**：主Agent可以根据任务需求调用一个或多个工具
3. **智能路由**：主Agent根据工具的描述和用户需求，自动选择合适的工具
4. **顺序执行**：主Agent可以按顺序调用多个工具，实现复杂的工作流

**提示**：为每个子Agent提供清晰、准确的 `description` 非常重要，这直接影响主Agent如何选择合适的工具。描述应该简洁地说明Agent的职责和能力。

## 访问上下文

登录：xushu

Tool: 登录人userid

springai  alibaba:

CALL:  无论ThreadLocal 还是inhertableThreadLocal 都行     请求---->LLM---->tool   同一个线程

stream:无论ThreadLocal 还是inhertableThreadLocal 都不行 请求---->LLM---->tool   不是同一个线程

**为什么这很重要**：当工具可以访问 Agent 状态、运行时上下文和长期记忆时，它们最强大。这使工具能够做出上下文感知的决策、个性化响应并在对话中维护信息。

工具可以通过 `ToolContext` 参数访问运行时信息，该参数提供：

- **State（状态）** - 通过执行流动的可变数据（消息、计数器、自定义字段）  alibaba graphy

```java
OverAllState state = (OverAllState) toolContext.getContext().get(ToolContextConstants.AGENT_STATE_CONTEXT_KEY);
// 从state中获取消息
List<Message> messages = (List<Message>) state.data().get("messages");
        messages.forEach(message ->
                {
                    if(message instanceof UserMessage userMessage){
                        System.out.println(userMessage.getText());
                    }
                    if(message instanceof AssistantMessage assistantMessage){
                        System.out.println(assistantMessage.getToolCalls());
                    } 
                });
 

```

- **Context（上下文）** - 不可变配置，如用户 ID、会话详细信息或应用程序特定配置

```java
RunnableConfig config = (RunnableConfig) toolContext.getContext().get(ToolContextConstants.AGENT_CONFIG_CONTEXT_KEY);
String userId = (String) config.metadata("user_id").orElse(null);
```

# 《Text-to-sql助手》实战

## 基于提示词完成

SqlAgentConfiguration

```java
@Configuration
public class SqlAgentConfiguration {

	private static final String SYSTEM_PROMPT = """
			你是一个设计用来与SQL数据库交互的代理。
			给定输入问题，创建一个语法正确的SQLite查询以运行，
			然后查看查询结果并返回答案。 
			1. 首次调用list_tables查看可用表格
			2. 然后调用get_schema获取相关表格
			3. 然后调用check_query来验证你的 SQL
			4. 最后打电话execute_query获取结果
			5. 将结果综合成有用的答案
			""";

	private final ChatModel chatModel;

	private final ListTablesTool listTablesTool;

	private final GetSchemaTool getSchemaTool;

	private final QueryCheckerTool queryCheckerTool;

	private final ExecuteQueryTool executeQueryTool;

	public SqlAgentConfiguration(ChatModel chatModel, ListTablesTool listTablesTool, GetSchemaTool getSchemaTool,
			QueryCheckerTool queryCheckerTool, ExecuteQueryTool executeQueryTool) {
		this.chatModel = chatModel;
		this.listTablesTool = listTablesTool;
		this.getSchemaTool = getSchemaTool;
		this.queryCheckerTool = queryCheckerTool;
		this.executeQueryTool = executeQueryTool;
	}

	@Bean
	public ReactAgent sqlAgent() throws GraphStateException {
		return ReactAgent.builder()
			.name("sql-agent")
			.description(SYSTEM_PROMPT)
			.model(chatModel)
			.saver(new MemorySaver())
			.tools(listTablesTool.toolCallback(), getSchemaTool.toolCallback(), queryCheckerTool.toolCallback(),
					executeQueryTool.toolCallback())
			.build();
	}
```

SqlAgentController

```java
@Controller
@RequestMapping("/api/sql")
public class SqlAgentController {

	private static final Logger logger = LoggerFactory.getLogger(SqlAgentController.class);

	private final ReactAgent sqlAgent;

	public SqlAgentController(ReactAgent sqlAgent) {
		this.sqlAgent = sqlAgent;
	}
 

	@PostMapping("/chat")
	@ResponseBody
	public ChatResponse chat(@RequestBody ChatRequest request) {
		logger.info("Received chat request: {}", request.message());

		String threadId = request.threadId();
		if (threadId == null || threadId.isEmpty()) {
			threadId = UUID.randomUUID().toString();
		}

		try {
			RunnableConfig config = RunnableConfig.builder().threadId(threadId).build();

			NodeOutput result = sqlAgent.invokeAndGetOutput(request.message(), config).orElse(null);

			String response = extractResponse(result);

			logger.info("Agent response: {}", response);
			return new ChatResponse(response, threadId, true);
		}
		catch (Exception e) {
			logger.error("Error processing chat request", e);
			return new ChatResponse("Sorry, an error occurred: " + e.getMessage(), threadId, false);
		}
	}
 

	private String extractResponse(NodeOutput result) {
		if (result == null) {
			return "No response generated.";
		}

		OverAllState state = result.state();

		// Try "output" key first (common for ReactAgent)
		Optional<Object> output = state.value("output");
		if (output.isPresent()) {
			return String.valueOf(output.get());
		}

		// Fallback to "messages" key
		Optional<List<AbstractMessage>> messages = state.value("messages");
		if (messages.isPresent() && !messages.get().isEmpty()) {
			List<AbstractMessage> msgList = messages.get();
			return msgList.get(msgList.size() - 1).getText();
		}

		// Last resort: return state string representation
		return state.toString();
	}

	public record ChatRequest(String message, String threadId) {
	}

	public record ChatResponse(String response, String threadId, boolean success) {
	}

}
```

### 4个Tool

📎 [ExecuteQueryTool.java](https://www.yuque.com/attachments/yuque/0/2026/java/22309163/1772342838842-b235b0c8-08e1-4341-9b40-0f52b8df8c85.java)

📎 [GetSchemaTool.java](https://www.yuque.com/attachments/yuque/0/2026/java/22309163/1772342839223-872bbd96-7d42-4d1f-a589-758421ac96b5.java)

📎 [ListTablesTool.java](https://www.yuque.com/attachments/yuque/0/2026/java/22309163/1772342839355-83e9289c-e7f4-479e-9a9e-4cb090b0b23e.java)

📎 [QueryCheckerTool.java](https://www.yuque.com/attachments/yuque/0/2026/java/22309163/1772342839902-1e3ba53f-bd5c-4d92-8e37-e34af3b7a413.java)

### 思考

> 为什么通过提示词可以完成， 还要用Graph  的节点/边 (Nodes/Edges)这些恶心的东西， 我理解：你用提示词只能写死1、2、3每一步应该怎么做，但是如果需要动态编排呢？  我A场景想要1、3、4、2，  B场景想要3、4、5、1、2 呢？  你得定义不同的庞大提示词。
> 
> 
>  但是通过  Graph  将每个工作节点组件化， 进行动态编排。
