---
title: "Spring AI Alibaba：Java生态的AI原生开发框架深度解析（附从0开始新建一个项目）"
sidebarGroup: "鹏宇老师"
shortTitle: "Spring AI Alibaba：Java生态的AI原生开发框架深度解析（附从0开始新建一个项目）"
order: 1140
date: 2026-01-03
category: "面试题"
tag:
  - "面试题"
description: "一、技术定位与演进路径Spring AI Alibaba 是阿里云与Spring社区联合打造的AI原生开发框架，其设计目标是解决Java开发者在AI应用开发中的三大痛点：模型集成复杂性：传统方式需要处理不同模型API的差异性开发范式割裂：A"
article: false
---

> 来源：[Spring AI Alibaba：Java生态的AI原生开发框架深度解析（附从0开始新建一个项目）](https://www.yuque.com/tulingzhouyu/db22bv/xgawq91i6u3c2wlg)

## 一、技术定位与演进路径

Spring AI Alibaba 是阿里云与Spring社区联合打造的AI原生开发框架，其设计目标是解决Java开发者在AI应用开发中的三大痛点：

1. **模型集成复杂性**：传统方式需要处理不同模型API的差异性
2. **开发范式割裂**：AI能力与业务逻辑分离导致的维护成本
3. **企业级特性缺失**：缺乏可观测性、分布式支持等生产环境要求

该框架在Spring AI基础上进行了深度增强，形成了独特的三层架构体系：

```plain
Application Layer (业务逻辑)
│
├─ Spring AI Alibaba Core (核心抽象层)
│   ├─ ChatClient/VectorStore/FunctionCalling
│   └─ 模型适配器（Qwen/DashScope/OpenAI等）
│
└─ Model & Service Adapters (模型服务层)
    ├─ 通义千问系列（Qwen-Max/Qwen-Plus）
    ├─ 百炼平台(DashScope)
    └─ OpenAI兼容接口
```

## 二、核心架构解析

### 2.1 模块化设计

项目采用Maven多模块结构，关键模块包括：

- **spring-ai-alibaba-core**：核心抽象层，提供统一的ChatModel/EmbeddingModel接口
- **spring-ai-alibaba-graph-core**：基于LangGraph思想的Java实现，支持复杂工作流编排
- **spring-ai-alibaba-mcp**：模型上下文协议实现，支持模型状态持久化
- **spring-ai-alibaba-observation**：集成OpenTelemetry的可观测性扩展
- **spring-ai-alibaba-starter-dashscope**：百炼平台专属starter

### 2.2 关键设计模式

1. **适配器模式**：通过`DashScopeChatModel`实现ChatModel接口，屏蔽不同模型API差异
2. **责任链模式**：Advisor链式处理RAG流程（检索→重排序→记忆增强）
3. **观察者模式**：自动埋点OpenTelemetry追踪数据
4. **模板方法模式**：标准化工具调用流程（参数验证→执行→结果解析）

## 三、企业级特性实现

### 3.1 多模型支持体系

框架支持主流大模型的灵活集成：

- **阿里云系**：通义千问全系列、百炼平台
- **开源社区**：Llama系列、Ollama本地模型
- **国际厂商**：OpenAI GPT系列、Anthropic Claude
- **国内厂商**：百度文心一言、讯飞星火

通过统一的ChatClient接口实现模型切换：

```java
// 通义千问调用
ChatClient qwenClient = ChatClient.builder()
    .withModel("qwen-max")
    .build();

// OpenAI调用
ChatClient openAIClient = ChatClient.builder()
    .withModel("gpt-4")
    .withApiKey("OPENAI_API_KEY")
    .build();
```

### 3.2 工作流引擎（Graph）

基于LangGraph的Java实现，支持：

- **状态管理**：通过State类定义流程状态
- **节点编排**：内置ReAct Agent、Supervisor等智能体模式
- **流式处理**：SSE流式响应支持
- **人类介入**：通过HumanLoopNode实现人工确认节点

示例工作流定义：

```java
GraphBuilder graph = new GraphBuilder();
graph.addNode(new RetrieveNode("retriever", retriever));
graph.addNode(new LLMNode("llm", chatModel));
graph.addEdge("retriever", "llm");
graph.setEntry("retriever");
```

### 3.3 可观测性体系

集成OpenTelemetry的完整可观测方案：

- **自动埋点**：模型调用、工具执行、RAG流程等关键节点
- **分布式追踪**：支持Jaeger/Grafana等主流追踪系统
- **指标监控**：请求延迟、Token消耗量、错误率等核心指标
- **日志增强**：结构化日志包含模型参数、响应内容等元数据

## 四、典型应用场景

### 4.1 智能客服系统

```java
@Bean
public ChatClient customerServiceBot() {
    return ChatClient.builder(qwenPlusModel)
        .withAdvisor(new FAQAdvisor(faqRetriever))
        .withAdvisor(new EscalationAdvisor(ticketSystem))
        .build();
}
```

### 4.2 企业知识库问答

```java
// 知识库检索+重排序+生成
ChatClient kbClient = ChatClient.builder(qwenMaxModel)
    .withAdvisor(new DocumentRetrievalAdvisor(vectorDB))
    .withAdvisor(new ReRankingAdvisor(reranker))
    .build();
```

### 4.3 自动化运维

```java
// 日志分析+故障诊断+工单生成
GraphBuilder opsGraph = new GraphBuilder();
opsGraph.addNode(new LogAnalysisNode(logParser));
opsGraph.addNode(new DiagnosisNode(diagnosisModel));
opsGraph.addNode(new TicketCreationNode(ticketService));
```

## 五、与LangChain的对比分析

特性
LangChain (Python)
Spring AI Alibaba (Java)

开发范式
函数式编程
面向对象编程

模型支持
主要支持OpenAI等
全面支持阿里云+主流厂商模型

企业级特性
需额外集成
内置可观测、分布式支持

工具调用
装饰器模式
注解驱动开发

工作流编排
需自定义实现
内置Graph工作流引擎

部署方式
单体应用
支持微服务/K8s集群

性能优化
无特别优化
集成RocketMQ实现异步处理

## 六、快速入门

### 6.1 项目结构概览

让我们先看看这个天气智能体 Demo 的结构：

```plain
src/
├── main/
│   ├── java/
│   │   └── com.example.weatheragentdemo/
│   │       ├── agent/          # 智能体实现
│   │       ├── controller/     # REST API 控制器
│   │       └── tools/          # 工具类
│   └── resources/
│       └── application.properties  # 配置文件

```

### 6.2 核心组件解析

#### 1. 配置文件 (application.properties)

```plain
# Spring AI Alibaba DashScope 配置
spring.ai.dashscope.api-key=sk-xxxxxxxxxxxxxxxxxxx
spring.ai.chat.model=dashboard

```

关键配置说明：

spring.ai.dashscope.api-key: 阿里云 DashScope API 密钥

spring.ai.chat.model: 指定使用的模型类型

#### 2. 工具类 (WeatherTool.java)

```java
@Service
public class WeatherTool implements BiFunction<String, ToolContext, String> {
    @Override
    public String apply(@ToolParam(description = "城市名称") String city, ToolContext context) {
        return city + "的天气总是晴朗的！";
    }
}

```

核心概念：

实现 BiFunction<String, ToolContext, String> 接口

使用 @ToolParam 注解定义参数描述

使 AI 模型能够理解如何调用此工具

#### 3. 智能体实现 (WeatherAgent.java)

这是框架的核心部分，展示了 ReactAgent 的强大功能：

基础天气查询

```java
public String getWeather(String location) {
    // 创建工具回调对象
    ToolCallback weatherTool = FunctionToolCallback.builder("get_weather", new WeatherTool())
            .description("获取指定城市的天气信息")
            .inputType(String.class)
            .build();

    // 创建天气查询智能体
    ReactAgent agent = ReactAgent.builder()
            .name("weather_agent")
            .model(chatModel) // 注入的ChatModel
            .tools(weatherTool) // 注册工具
            .systemPrompt("你是一个天气助手，可以回答天气相关的问题。请简洁友好地回答。")
            .saver(new MemorySaver()) // 使用内存保存器
            .build();
    
    // 运行智能体
    RunnableConfig runnableConfig = RunnableConfig.builder()
            .threadId("weather-" + location).build();
    
    AssistantMessage response = agent.call("请问" + location + "的天气怎么样？", runnableConfig);
    return response.getText();
}

```

关键组件解析：

ReactAgent: 反应式智能体框架

FunctionToolCallback: 将 Java 方法包装为 AI 可调用的工具

System Prompt: 定义 AI 助手的行为模式

MemorySaver: 维护对话状态

RunnableConfig: 配置智能体运行参数

趣味天气查询

```java
public String getWeatherWithPuns(String location) {
    String systemPrompt = """
        你是一个专业的天气预报员，说话带有双关语。
        你有两个工具:
        - get_weather_for_location: 使用此工具获取特定位置的天气
        - get_user_location: 使用此工具获取用户的位置
        """;
    
    // ... 配置智能体并执行查询
}

```

这个例子展示了如何通过系统提示词来指导 AI 以特定风格（双关语）回答问题。

#### 4. 控制器 (WeatherController.java)

提供 REST API 接口：

```java
@RestController
public class WeatherController {
    @Resource
    private WeatherAgent weatherAgent;

    @GetMapping("/weather")
    public String getWeather(@RequestParam String city) {
        return weatherAgent.getWeather(city);
    }

    @GetMapping("/weather/puns")
    public String getWeatherWithPuns(@RequestParam(defaultValue = "北京") String location) {
        return weatherAgent.getWeatherWithPuns(location);
    }
}

```

### 6.3 核心概念详解

#### 1. ReactAgent 框架

ReactAgent 是 Spring AI Alibaba 1.1 中的核心组件，它实现了 ReAct（Reasoning and Acting）模式：

Reasoning: AI 模型分析用户输入，决定如何处理

Acting: AI 模型调用可用的工具获取信息

Response: AI 模型整合信息并生成响应

#### 2. 工具集成机制

Spring AI Alibaba 提供了强大的工具集成能力：

FunctionToolCallback: 将 Java 方法转换为 AI 可调用的工具

工具发现: AI 模型自动发现可用工具

参数解析: AI 模型根据描述自动解析参数

#### 3. 对话状态管理

通过 MemorySaver 实现对话状态的持久化：

```java
.saver(new MemorySaver()) // 维护多轮对话的上下文
```

## 七、Spring AI Alibaba 1.1 新特性

#### 1. 智能体框架增强

- ReactAgent 更好的错误处理
- 更灵活的配置选项
- 改进的工具调用机制

#### 2. 工具集成改进

- 更简洁的工具定义方式
- 更好的参数验证机制
- 工具调用的链式追踪

#### 3. 配置简化

- 自动配置更加智能
- 默认配置更合理
- 更多可选配置项

## 八、实际应用场景

#### 1. 客服机器人

- 集成公司内部知识库
- 调用业务系统接口
- 提供个性化服务

#### 2. 数据分析助手

- 连接数据库查询工具
- 生成数据报告
- 提供数据洞察

#### 3. 代码辅助工具

- 集成代码分析工具
- 自动生成代码
- 代码审查助手

## 九、最佳实践

#### 1. 系统提示词设计

- 明确角色定义
- 提供具体行为指导
- 包含工具使用说明

#### 2. 工具设计原则

- 功能单一，职责明确
- 参数类型清晰
- 错误处理完善

#### 3. 性能优化

- 合理使用缓存
- 优化工具调用次数
- 适当设置超时时间

## 十、总结

Spring AI Alibaba 1.1 版本为 Java 开发者提供了强大的 AI 集成能力：

- 简单易用: 通过 Spring Boot 自动配置，快速集成
- 功能强大: 支持复杂的智能体交互模式
- 灵活扩展: 可轻松集成自定义工具和功能
- 生态完善: 与 Spring 生态无缝集成

通过这个天气智能体 Demo，我们可以看到 Spring AI Alibaba 在简化 AI 应用开发方面的巨大潜力。无论是构建客服机器人、数据分析助手，还是其他智能应用，这个框架都为我们提供了坚实的基础。

## 附录：从0开始新建项目:

这个项目使用Spring Ai Alibaba的 1.1.0.0-M5  版本做演示

环境要求：JDK 17或以上，Spring Boot 3.4.X或以上，Maven 3.8或以上

#### 1、新建项目：

![image](/面试题/高频面试问题/鹏宇老师/1140-spring-ai-alibaba-java-ai-native-framework/img-a2f53a5481d4.png)

![image](/面试题/高频面试问题/鹏宇老师/1140-spring-ai-alibaba-java-ai-native-framework/img-832c11d24464.png)

#### 2、项目结构：

![image](/面试题/高频面试问题/鹏宇老师/1140-spring-ai-alibaba-java-ai-native-framework/img-071914a83980.png)

#### 3、详细代码

pom.xml:

```xml
&lt;?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    &lt;modelVersion&gt;4.0.0&lt;/modelVersion&gt;
    
    &lt;!-- 继承Spring Boot的父POM，提供自动配置和依赖管理 --&gt;
    &lt;parent&gt;
        &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
        &lt;artifactId&gt;spring-boot-starter-parent&lt;/artifactId&gt;
        &lt;version&gt;3.5.9&lt;/version&gt;
        &lt;relativePath/&gt; &lt;!-- lookup parent from repository --&gt;
    &lt;/parent&gt;
    
    &lt;!-- 项目基本信息 --&gt;
    &lt;groupId&gt;com.example&lt;/groupId&gt;
    &lt;artifactId&gt;weather-agent-demo&lt;/artifactId&gt;
    &lt;version&gt;0.0.1-SNAPSHOT&lt;/version&gt;
    &lt;name&gt;weather-agent-demo&lt;/name&gt;
    &lt;description&gt;weather-agent-demo&lt;/description&gt;
    &lt;url/&gt;
    &lt;licenses&gt;
        &lt;license/&gt;
    &lt;/licenses&gt;
    &lt;developers&gt;
        &lt;developer/&gt;
    &lt;/developers&gt;
    &lt;scm&gt;
        &lt;connection/&gt;
        &lt;developerConnection/&gt;
        &lt;tag/&gt;
        &lt;url/&gt;
    &lt;/scm&gt;
    
    &lt;!-- 项目属性配置 --&gt;
    &lt;properties&gt;
        &lt;!-- Java版本要求：使用Java 21，这是Spring AI Alibaba的推荐版本 --&gt;
        <java.version>21</java.version>
        
        &lt;!-- Spring AI Alibaba版本：使用1.1.0.0-M5里程碑版本，支持智能体框架 --&gt;
        <spring-ai-alibaba.version>1.1.0.0-M5</spring-ai-alibaba.version>
    &lt;/properties&gt;
        &lt;!-- 项目依赖配置 --&gt;
    &lt;dependencies&gt;
        &lt;!-- Spring Boot 核心启动器：提供自动配置、日志和YAML支持 --&gt;
        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-starter&lt;/artifactId&gt;
        &lt;/dependency&gt;

                
        &lt;!-- Spring Boot 测试启动器：提供JUnit、Mockito和AssertJ等测试支持 --&gt;
        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-starter-test&lt;/artifactId&gt;
            &lt;scope&gt;test&lt;/scope&gt;
        &lt;/dependency&gt;

                
        &lt;!-- Spring Boot Web启动器：提供Web开发支持，包括嵌入式Tomcat、RESTful支持等 --&gt;
        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-starter-web&lt;/artifactId&gt;
        &lt;/dependency&gt;

                
        &lt;!-- Spring Boot Actuator：提供生产就绪功能，如健康检查、指标监控等 --&gt;
        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-starter-actuator&lt;/artifactId&gt;
        &lt;/dependency&gt;

                
        &lt;!-- Spring AI Alibaba 智能体框架：提供ReactAgent等智能体核心组件 --&gt;
        &lt;!-- 这是本项目的核心依赖，实现了AI智能体的运行框架 --&gt;
        &lt;dependency&gt;
            &lt;groupId&gt;com.alibaba.cloud.ai&lt;/groupId&gt;
            &lt;artifactId&gt;spring-ai-alibaba-agent-framework&lt;/artifactId&gt;
            &lt;version&gt;${spring-ai-alibaba.version}&lt;/version&gt;
        &lt;/dependency&gt;

                
        &lt;!-- Spring AI Alibaba DashScope启动器：集成阿里云通义千问大模型 --&gt;
        &lt;!-- 提供ChatModel实现，让应用能够调用阿里云的AI服务 --&gt;
        &lt;dependency&gt;
            &lt;groupId&gt;com.alibaba.cloud.ai&lt;/groupId&gt;
            &lt;artifactId&gt;spring-ai-alibaba-starter-dashscope&lt;/artifactId&gt;
            &lt;version&gt;${spring-ai-alibaba.version}&lt;/version&gt;
        &lt;/dependency&gt;

                
        &lt;!-- Spring Boot 配置处理器：在编译时生成配置元数据，提供IDE配置提示 --&gt;
        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-configuration-processor&lt;/artifactId&gt;
            &lt;optional&gt;true&lt;/optional&gt;
        &lt;/dependency&gt;
    &lt;/dependencies&gt;

    &lt;!-- 构建配置 --&gt;
    &lt;build&gt;
        &lt;plugins&gt;
            &lt;!-- Spring Boot Maven插件：提供打包可执行JAR/WAR、运行应用等功能 --&gt;
            &lt;plugin&gt;
                &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
                &lt;artifactId&gt;spring-boot-maven-plugin&lt;/artifactId&gt;
            &lt;/plugin&gt;
        &lt;/plugins&gt;
    &lt;/build&gt;

&lt;/project&gt;

```

application.properties:

```properties
# 应用程序名称
spring.application.name=weather-agent-demo

# Spring AI Alibaba DashScope 配置
# DashScope API密钥 - 用于访问阿里云的AI服务
spring.ai.dashscope.api-key=sk-xxxxxxxxxxxxxxxxx
# 指定使用的聊天模型名称
#spring.ai.chat.model=dashboard
# 可选配置：指定模型的具体类型（例如：qwen-max、qwen-plus等）
# spring.ai.dashscope.chat.options.model=qwen-max
# 可选配置：设置请求的温度参数，控制生成的随机性
# spring.ai.dashscope.chat.options.temperature=0.7
# 可选配置：设置最大输出令牌数
# spring.ai.dashscope.chat.options.max-tokens=2048
# 可选配置：设置请求的顶层采样参数
# spring.ai.dashscope.chat.options.top-p=0.8

# 可选配置：Spring AI 通用配置
# 设置默认的AI服务提供者
# spring.ai.autoconfigure.enabled=true

# 可选配置：日志级别
logging.level.com.alibaba.cloud.ai=DEBUG
logging.level.org.springframework.ai=DEBUG

# 可选配置：服务器端口
# server.port=8082

# 可选配置：启用Actuator监控端点
management.endpoints.web.exposure.include=health,info
```

WeatherTool:

```java
package com.example.weatheragentdemo.tools;

import java.util.function.BiFunction;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/**
 * 天气查询工具类
 * 
 * 实现BiFunction接口，使该类可以作为AI工具被智能体调用
 * 
 * 工具类在Spring AI Alibaba框架中的作用：
 * 1. 提供AI模型可调用的功能接口
 * 2. 扩展AI模型的能力，使其能够执行特定任务（如查询天气）
 * 3. 通过@ToolParam注解定义参数，AI模型可以理解如何调用此工具
 * 
 * @author Administrator
 */
@Service
public class WeatherTool implements BiFunction<String, ToolContext, String> {

    /**
     * 天气查询工具的执行方法
     * 
     * BiFunction接口说明：
     * - 第一个参数类型(String): 城市名称，作为工具的输入参数
     * - 第二个参数类型(ToolContext): 工具上下文，提供执行环境信息
     * - 返回值类型(String): 天气信息，作为工具的输出结果
     * 
     * @ToolParam 注解的作用：
     * - 为AI模型提供参数描述，帮助AI理解参数的用途
     * - description属性描述参数的含义，AI模型会根据此描述决定如何调用工具
     * 
     * @param city 城市名称，AI模型会根据上下文提供此参数
     * @param context 工具执行上下文，包含当前对话和执行环境信息
     * @return 指定城市的天气信息字符串
     */
    @Override
    public String apply(@ToolParam(description = "城市名称") String city, ToolContext context) {
        // 在实际应用中，这里应该调用真实的天气API获取数据
        // 当前返回模拟数据，仅用于演示工具调用流程
        return city + "的天气总是晴朗的！";
    }
}
```

WeatherAgent:

```java
package com.example.weatheragentdemo.agent;

import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.exception.GraphRunnerException;
import com.example.weatheragentdemo.tools.WeatherTool;
import jakarta.annotation.Resource;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.stereotype.Service;

/**
 * 天气智能体服务类
 * 
 * 使用Spring AI Alibaba的ReactAgent框架实现的天气查询智能体
 * 
 * 核心概念说明：
 * - ReactAgent: 反应式智能体，能够根据输入调用工具并生成响应
 * - ToolCallback: 工具回调接口，允许AI模型调用外部函数
 * - FunctionToolCallback: 函数工具回调的具体实现，将Java方法包装为AI可调用的工具
 * - MemorySaver: 内存检查点保存器，用于维护对话状态
 * - RunnableConfig: 配置智能体运行参数，包括线程ID和元数据
 * 
 * 提供两种天气查询功能：
 * 1. getWeather: 简洁的天气信息查询
 * 2. getWeatherWithPuns: 带双关语的趣味天气查询
 * 
 * @author Administrator
 */
@Service
public class WeatherAgent {

    /**
     * 注入ChatModel Bean
     * 
     * ChatModel是Spring AI Alibaba框架的核心接口，提供与大语言模型交互的能力
     * 在应用程序启动时，根据application.properties中的配置自动创建
     * 这里用于为ReactAgent提供底层的AI模型能力
     */
    @Resource
    private ChatModel chatModel;

    /**
     * 注入WeatherTool Bean
     * 
     * WeatherTool是自定义的天气查询工具，实现了BiFunction接口
     * 通过@Service注解标记为Spring组件，可被自动注入
     * 将在创建ReactAgent时作为可调用的工具注册
     */
    @Resource
    private WeatherTool weatherTool;

    /**
     * 简洁的天气回答功能
     * 
     * 创建一个基础的天气查询智能体，能够回答关于天气的问题
     * 
     * 工作流程：
     * 1. 创建FunctionToolCallback包装WeatherTool
     * 2. 使用ReactAgent构建器创建智能体，配置模型、工具和系统提示词
     * 3. 执行智能体调用，传入天气查询请求
     * 4. 处理响应或异常
     * 
     * @param location 位置名称，智能体将查询此位置的天气
     * @return 简洁友好的天气回答
     */
    public String getWeather(String location){
        // 定义天气查询工具 - 创建工具回调对象
        // FunctionToolCallback将WeatherTool包装为AI可调用的工具
        ToolCallback weatherTool = FunctionToolCallback.builder("get_weather", new WeatherTool())
                .description("获取指定城市的天气信息") // 工具描述，AI模型使用此描述理解工具功能
                .inputType(String.class) // 定义工具输入参数类型，AI模型据此传递正确参数
                .build();

        // 创建天气查询智能体 - 配置智能体参数
        ReactAgent agent = ReactAgent.builder()
                .name("weather_agent") // 智能体名称，用于标识和日志记录
                .model(chatModel) // 指定使用的聊天模型
                .tools(weatherTool) // 注册可调用的工具，使AI能够查询天气
                .systemPrompt("你是一个天气助手，可以回答天气相关的问题。请简洁友好地回答。") // 系统提示词，定义AI助手的行为和回答风格
                .saver(new MemorySaver()) // 使用内存保存器维护对话状态
                .build();

        // 运行智能体 - 执行天气查询
        RunnableConfig runnableConfig = RunnableConfig.builder().threadId("weather-" + location).build();
        try {
            AssistantMessage response = agent.call("请问" + location + "的天气怎么样？", runnableConfig);
            return response.getText();
        } catch (GraphRunnerException e) {
            return "处理天气请求时出错: " + e.getMessage();
        }
    }

    /**
     * 获取带有趣味描述的天气信息
     * 
     * 使用系统提示词指导AI以幽默和双关语的方式回答天气问题
     * 
     * 与基础查询的区别：
     * - 使用更复杂的系统提示词，指导AI使用双关语
     * - 展示了更高级的提示工程技巧
     * - 通过系统提示词定义AI的特定行为模式
     * 
     * @param location 位置名称
     * @return 带有趣味描述的天气信息
     */
    public String getWeatherWithPuns(String location) {
        // 定义系统提示词 - 指导AI使用幽默的方式回答天气问题
        // 详细的系统提示词告诉AI如何行为，包括工具使用说明
        String systemPrompt = """
            你是一个专业的天气预报员，说话带有双关语。
            你有两个工具:
            - get_weather_for_location: 使用此工具获取特定位置的天气
            - get_user_location: 使用此工具获取用户的位置
            如果用户询问天气，请确保你知道位置。
            如果你能从问题中看出他们指的是他们所在的地方，
            请使用get_user_location工具来找到他们的位置。
            """;

        // 创建天气查询工具 - 使用Lambda表达式简化
        // 这里直接使用注入的weatherTool Bean而不是创建新实例
        ToolCallback getWeatherTool = FunctionToolCallback
                .builder("getWeatherForLocation",weatherTool) // 工具名称和实现
                .description("获取指定城市的天气信息") // 工具描述
                .inputType(String.class) // 输入参数类型
                .build();

        // 创建高级天气智能体 - 配置智能体参数
        ReactAgent agent = ReactAgent.builder()
                .name("weather_pun_agent") // 智能体名称，区分于基础天气智能体
                .model(chatModel) // 使用相同的聊天模型
                .systemPrompt(systemPrompt) // 使用特殊的系统提示词，引导AI使用双关语
                .tools(getWeatherTool) // 注册天气查询工具
                .saver(new MemorySaver()) // 使用内存保存器
                .build();

        // 运行智能体 - 执行天气查询
        RunnableConfig runnableConfig = RunnableConfig.builder()
                .threadId("advanced-weather-" + location) // 使用位置相关的线程ID，便于跟踪
                .addMetadata("user_id", "1") // 添加用户ID元数据，可用于审计或个性化
                .build();

        try {
            AssistantMessage response = agent.call("请问" + location + "的天气怎么样？", runnableConfig);
            return response.getText();
        } catch (GraphRunnerException e) {
            return "处理天气请求时出错: " + e.getMessage();
        }
    }
}

```

WeatherController:

```java
package com.example.weatheragentdemo.controller;

import com.alibaba.cloud.ai.graph.RunnableConfig;
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.exception.GraphRunnerException;
import com.example.weatheragentdemo.agent.WeatherAgent;
import jakarta.annotation.Resource;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.web.bind.annotation.*;

/**
 * 天气查询API控制器
 * 
 * REST控制器，提供HTTP接口访问天气智能体功能
 * 
 * 注解说明：
 * - @RestController: 标记为REST风格的控制器，自动将返回值序列化为JSON
 * - @Resource: 用于依赖注入，从Spring容器中查找并注入相应组件
 * 
 * 提供三个API端点：
 * 1. /weather: 基础天气查询
 * 2. /weather/puns: 趣味天气查询（带双关语）
 * 3. /chat: 通用AI聊天功能
 * 
 * @author Administrator
 */
@RestController
public class WeatherController {

    /**
     * 注入ChatModel Bean
     * 
     * ChatModel是Spring AI Alibaba框架提供的聊天模型接口
     * 在启动时根据application.properties中的配置自动创建
     * 这里注入是为了在通用聊天功能中直接使用
     */
    @Resource
    private ChatModel chatModel;

    /**
     * 注入WeatherAgent Bean
     * 
     * WeatherAgent是自定义的天气智能体服务类
     * 通过@Service注解标记为Spring组件，可被自动注入
     * 提供了基础和趣味天气查询功能
     */
    @Resource
    private WeatherAgent weatherAgent;

    /**
     * 基础天气查询API端点
     * 
     * HTTP GET请求：/weather?city=城市名称
     * 
     * 功能描述：
     * - 接收城市名称参数
     * - 调用WeatherAgent中的基础天气查询功能
     * - 返回简洁的天气信息
     * 
     * @param city 城市名称，通过@RequestParam从请求参数中获取
     * @return 天气信息字符串
     */
    @GetMapping("/weather")
    public String getWeather(@RequestParam String city) {
        return weatherAgent.getWeather(city);
    }

    /**
     * 趣味天气查询API端点
     * 
     * HTTP GET请求：/weather/puns?location=位置名称
     * 
     * 功能描述：
     * - 接收位置名称参数，默认为"北京"
     * - 调用WeatherAgent中的趣味天气查询功能
     * - 返回带双关语和幽默描述的天气信息
     * 
     * @param location 位置名称，默认值为"北京"，通过@RequestParam注解指定
     * @return 带有趣味描述的天气信息
     */
    @GetMapping("/weather/puns")
    public String getWeatherWithPuns(@RequestParam(defaultValue = "北京") String location) {
        return weatherAgent.getWeatherWithPuns(location);
    }

    /**
     * 通用聊天API端点
     * 
     * HTTP GET请求：/chat?message=消息&threadId=线程ID
     * 
     * 功能描述：
     * - 提供通用的AI聊天功能，不局限于天气查询
     * - 使用ReactAgent构建通用智能体
     * - 支持对话上下文管理
     * 
     * 关键组件说明：
     * - ReactAgent: Spring AI Alibaba的反应式智能体框架
     * - MemorySaver: 内存检查点保存器，维护对话状态
     * - RunnableConfig: 配置智能体运行参数，如线程ID
     * - AssistantMessage: AI助手的响应消息类型
     * 
     * @param message 用户输入的消息，通过@RequestParam从请求参数中获取
     * @param threadId 对话线程ID，默认为"default-thread"，用于区分不同会话
     * @return AI响应消息
     */
    @GetMapping("/chat")
    public String chat(@RequestParam String message, @RequestParam(defaultValue = "default-thread") String threadId) {
        // 创建通用聊天智能体 - 配置智能体参数
        ReactAgent agent = ReactAgent.builder()
                .name("chat_agent") // 智能体名称，用于标识和日志记录
                .model(chatModel) // 使用的聊天模型，注入的ChatModel实例
                .systemPrompt("你是一个有帮助的AI助手。") // 系统提示词，定义AI助手的行为
                .saver(new MemorySaver()) // 使用内存保存器，维护对话上下文
                .build();

        // 运行智能体 - 执行聊天
        RunnableConfig runnableConfig = RunnableConfig.builder().threadId(threadId).build();
        try {
            AssistantMessage response = agent.call(message, runnableConfig);
            return response.getText();
        } catch (GraphRunnerException e) {
            return "处理聊天请求时出错: " + e.getMessage();
        }
    }
}

```

补充说明：

```plain
1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/?apiKey=1&tab=model#/model-market)
2. 获取你的DashScope API Key
3. 在 `application.properties` 文件中配置API Key:spring.ai.dashscope.api-key=your_actual_api_key_here
4. 启动后，可以使用以下API端点:
    `GET /weather?city={city}` - 获取指定城市的天气信息
    `GET /weather/puns?location={location}` - 获取带有趣味描述的天气信息
```

![image](/面试题/高频面试问题/鹏宇老师/1140-spring-ai-alibaba-java-ai-native-framework/img-70f69017e34b.png)
