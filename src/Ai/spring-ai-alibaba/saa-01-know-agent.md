---
title: "1.认识Agent"
sidebarGroup: "Spring AI Alibaba"
shortTitle: "1.认识Agent"
order: 1
date: 2026-03-01
category: "AI"
tag:
  - "Spring AI Alibaba"
  - "Agent"
description: "认识 Agent / ReAct，以及 Spring AI Alibaba 与 AgentScope 的选型对比。"
---

> 来源：[1.认识Agent](https://www.yuque.com/geren-t8lyq/sk9iuh/ph05ta39fgy3oumz?singleDoc#)  
> 配套代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs.git

# 介绍Agents

Agents 将大语言模型(LLM)与工具(Tool)结合，创建具备：任务推理、工具使用决策、工具调用的自动化系统，系统具备持续推理、工具调用的循环迭代能力，直至问题解决。

Spring AI Alibaba 提供了基于 `ReactAgent` 的生产级 Agent 实现。

> ReAct（Reasoning and Acting）是一种结合了推理（reasoning）和行动（acting）的方法，旨在提高大型语言模型（LLMs）在解决复杂任务时的性能和可解释性。
> **思考（Reasoning）**：分析当前情况，决定下一步该做什么
> **行动（Acting）**：执行工具调用或生成最终答案
> **观察（Observation）**：接收工具执行的结果
> **迭代**：基于观察结果继续思考和行动，直到完成任务

![image](/Ai/spring-ai-alibaba/saa-01-know-agent/img-001.gif)

**一个 LLM Agent 在循环中通过运行工具来实现目标**。Agent 会一直运行直到满足停止条件 —— 即当模型输出最终答案或达到迭代限制时。

# Agent框架选型

在 Java 的世界里，我们习惯了用 Spring Boot 构建微服务，用 BPMN 管理流程。但在 AI 时代，**AI Agent（人工智能体）** 正在重塑规则。

![image](/Ai/spring-ai-alibaba/saa-01-know-agent/img-002.png)

很多开发者都在问：**Spring AI Alibaba** 和 **AgentScope-JAVA** 到底怎么选？今天，我们就从架构设计的角度，把这层窗户纸捅破。

**01. 什么是 AI Agent？**

别把 Agent 简单理解为“聊天机器人”。如果说 ChatGPT 是“百科全书”，那 Agent 就是**“全能实习生”**。

![image](/Ai/spring-ai-alibaba/saa-01-know-agent/img-003.png)

**02. 核心考点：两种主流模式**

![image](/Ai/spring-ai-alibaba/saa-01-know-agent/img-004.png)

**🚄 模式一：Workflow (工作流)**

---

**核心逻辑：**SOP 标准作业程序。
**框架：**Spring AI Alibaba

**特点：**像画流程图一样，把每一步都规定死。
**适用：**银行审批、售后工单等企业级业务。

```java
// Workflow: 逻辑是写死的
if(input.contains("天气")) {
        return weatherService.query();
} else {
    return chatService.talk();
}
```

**🚙 模式二：Agentic (自主代理)**

---

**核心逻辑：**目标驱动 (Goal-Driven)。
**框架：**AgentScope-Java

**特点：**只给目标，不给步骤。AI 自主思考：“我得先查A，再做B”。
**案例：**Manus。遇到问题自己想办法解决。

```java
// Agentic: 只给目标，路径未知

Agent agent = new Agent();
// AI自己决定调用什么工具
agent.setGoal("帮我策划一次旅行");
agent.run(); // -> 思考 -> 查票 -> 订房
```

**03. 该怎么选？**

阿里官方给出了非常明确的界限，请大家作为选型的**金标准**：

**🎯 场景 A：追求稳定、流程可控**

如果你在做 RAG、客服、辅助工具，需要业务完美嵌入。

![image](/Ai/spring-ai-alibaba/saa-01-know-agent/img-005.png)

**👉 推荐：Spring AI Alibaba(基于Workflow模）**

**🎯 场景 B：追求自主、多角色博弈**

如果你在做类似 Manus、虚拟员工团队、复杂任务规划。

![image](/Ai/spring-ai-alibaba/saa-01-know-agent/img-006.png)

**👉 推荐：AgentScope-Java（基于Agentic模式）**

**04. 未来的融合路线**

![image](/Ai/spring-ai-alibaba/saa-01-know-agent/img-007.png)

也可以两套框架都用， 阿里未来会将AgentScope-java集成到SpringAiAlibaba框架中，官方截图：

![image](/Ai/spring-ai-alibaba/saa-01-know-agent/img-008.png)

所以我们从SpringAi ALibaba Agent Framework开始学， 反正以后AgentScope-java会集成进来

# SpringAi VS Spring Ai Alibaba Agent Framwork

![image.png](/Ai/spring-ai-alibaba/saa-01-know-agent/img-009.png)

![image.png](/Ai/spring-ai-alibaba/saa-01-know-agent/img-010.png)

![image.png](/Ai/spring-ai-alibaba/saa-01-know-agent/img-011.png)

# Spring AI Alibaba 介绍

一个用于构建Agentic, Workflow和 Multi-agent应用的Java框架。

![image](/Ai/spring-ai-alibaba/saa-01-know-agent/img-012.png)

Agent Framework会解析成Graph, Graph最终通过SpringAi的API 实现大模型的通信；

Agent Framework是方便版的Graph

Graph是自由版的Agent

SpringAi 完成了基础设施

## 特性：

- [多智能体编排](https://java2ai.com/docs/frameworks/agent-framework/advanced/multi-agent)：组合多个内置模式的智能体，包括 `SequentialAgent`、`ParallelAgent`、`LlmRoutingAgent` 和 `LoopAgent`，以执行复杂任务。
- [上下文工程](https://java2ai.com/docs/frameworks/agent-framework/tutorials/hooks)：内置上下文工程策略的最佳实践，以提升代理的可靠性和性能，包括人工参与、上下文压缩、上下文编辑、模型与工具调用限制、工具重试、规划、动态工具选择。
- [基于图的工作流程](https://java2ai.com/docs/frameworks/graph-core/quick-start)：基于图的工作流程运行时和 API，用于条件路由、嵌套图、并行执行和状态管理。导出工作流程为 PlantUML 和 Mermaid 格式。
- [A2A 支持](https://java2ai.com/docs/frameworks/agent-framework/advanced/a2a)：支持代理间通信，支持 Nacos 集成，实现分布式代理间的协调与协作。
- [丰富的模型、工具和 MCP 支持](https://java2ai.com/integration/chatmodels/dashScope)：利用 Spring AI 的核心理念，支持多个 LLM 提供商（DashScope、OpenAI 等）、工具调用和模型上下文协议（MCP）。
- [一站式代理平台](https://java2ai.com/ecosystem/admin/quick-start)：以可视化方式构建代理，无需代码部署代理，或导出为独立的 Java 项目。
