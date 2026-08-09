---
title: "第 2 集：Spring AI 后端核心与 Prompt 架构设计"
sidebarGroup: "AI代码助手"
shortTitle: "第 2 集：Spring AI 后端核心与 Prompt 架构设计"
order: 1301
date: 2026-01-15
category: "面试题"
tag:
  - "面试题"
description: "摘要：本节我们将完成“AI 代码审查助手”的大脑构建。你将学会如何配置 Spring AI 连接阿里通义千问模型，如何设计“人设”提示词，以及如何使用 WebFlux 实现流式（Stream）响应。1. 核心依赖配置 (pom.xml)虽然"
article: false
---

> 来源：[第 2 集：Spring AI 后端核心与 Prompt 架构设计](https://www.yuque.com/tulingzhouyu/db22bv/pvqx50ss1vnwbqhp)

**摘要**：本节我们将完成“AI 代码审查助手”的大脑构建。你将学会如何配置 Spring AI 连接阿里通义千问模型，如何设计“人设”提示词，以及如何使用 WebFlux 实现流式（Stream）响应。

## 1. 核心依赖配置 (pom.xml)

虽然我们使用的是阿里云的模型，但为了保持代码的通用性（以后想换 DeepSeek 或 ChatGPT 随时能换），我们使用 Spring AI 的 **OpenAI 标准协议** 驱动。

请确保你的 pom.xml 包含以下依赖：

**codeXml**

```plain
&lt;dependencies&gt;
    &lt;!-- Web 模块：提供 REST 接口 --&gt;
    &lt;dependency&gt;
        &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
        &lt;artifactId&gt;spring-boot-starter-web&lt;/artifactId&gt;
    &lt;/dependency&gt;

    &lt;!-- Spring AI OpenAI：通用 AI 接入层 --&gt;
    &lt;dependency&gt;
        &lt;groupId&gt;org.springframework.ai&lt;/groupId&gt;
        &lt;artifactId&gt;spring-ai-openai-spring-boot-starter&lt;/artifactId&gt;
    &lt;/dependency&gt;

    &lt;!-- Lombok：简化代码 --&gt;
    &lt;dependency&gt;
        &lt;groupId&gt;org.projectlombok&lt;/groupId&gt;
        &lt;artifactId&gt;lombok&lt;/artifactId&gt;
        &lt;optional&gt;true&lt;/optional&gt;
    &lt;/dependency&gt;
&lt;/dependencies&gt;

&lt;!-- ⚠️ 重要：Spring AI 需要版本管理 (BOM) --&gt;
&lt;dependencyManagement&gt;
    &lt;dependencies&gt;
        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.ai&lt;/groupId&gt;
            &lt;artifactId&gt;spring-ai-bom&lt;/artifactId&gt;
            &lt;version&gt;1.0.0-SNAPSHOT&lt;/version&gt; &lt;!-- 请使用最新稳定版 --&gt;
            &lt;type&gt;pom&lt;/type&gt;
            &lt;scope&gt;import&lt;/scope&gt;
        &lt;/dependency&gt;
    &lt;/dependencies&gt;
&lt;/dependencyManagement&gt;
```

---

## 2. 连接“大脑”：配置文件 (application.yml)

这是最容易出错的地方。我们需要将 Spring AI 指向阿里云百炼的 **OpenAI 兼容接口**。

**codeYaml**

```plain
spring:
  application:
    name: ai-code-reviewer
  ai:
    openai:
      # 👇 核心配置：阿里云百炼的兼容地址 (不要漏掉 /compatible-mode/v1)
      base-url: https://dashscope.aliyuncs.com/compatible-mode/v1
      # 你的 API Key (从第一集教程中获取)
      api-key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      chat:
        options:
          # 👇 模型选择：
          # qwen-turbo (免费/便宜，速度快，适合测试)
          # qwen-plus (能力更强，适合复杂逻辑)
          model: qwen-turbo
          # 温度值：0-1。代码审查建议 0.2-0.7，太高容易胡言乱语
          temperature: 0.7
```

---

## 3. 核心代码：流式控制器 (CodeReviewController)

为什么不用普通的 String 返回，而要用 Flux&lt;String&gt;？

- **普通 String**: 用户等 10 秒，页面一片空白，然后突然显示全部内容。
- **Flux (SSE)**: AI 生成一个字，前端显示一个字。**用户体验极佳**。

**codeJava**

```plain
package com.example.aicodereviewer.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api")
@CrossOrigin // 允许跨域，方便前端调试
public class CodeReviewController {

    private final ChatClient chatClient;

    // 构造注入，利用 Builder 构建 Client
    public CodeReviewController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    /**
     * 核心流式接口
     * produce = TEXT_EVENT_STREAM_VALUE 表示这是一个 SSE (Server-Sent Events) 接口
     */
    @PostMapping(value = "/review", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux&lt;String&gt; reviewCode(@RequestBody String userCode) {

        // 1. 定义 Prompt (提示词工程的核心)
        // 这里的 System Text 决定了 AI 的"人设"和"能力"
        String systemPrompt = """
            你是一位拥有 20 年经验的资深 Java 架构师，擅长代码优化和重构。
            
            你的任务是审查用户提交的代码，请严格按照以下格式输出 Markdown 报告：
            
            1. 📊 **综合评分**：(0-100分，请客观打分)
            2. 🐞 **问题分析**：(列出 3 个最核心的 Bug、性能隐患或不规范点)
            3. ✨ **重构建议**：(给出优化后的代码，并加上详细注释)
            
            请保持语气专业、客观，重点关注：空指针风险、循环性能、并发安全。
            """;

        // 2. 发起请求并返回流
        return chatClient.prompt()
                .system(systemPrompt)  // 设定人设
                .user(userCode)        // 填入用户代码
                .stream()              // ⚠️ 关键：使用 stream() 而不是 call()
                .content();            // 获取内容流
    }
}
```

---

## 4. 🧙‍♂️ Prompt Engineering (提示词工程) 实战指南

在 AI 开发中，**“代码写得好，不如 Prompt 写得好”**。以下是三种不同风格的 Prompt 设计，你可以让粉丝试着替换到代码里体验。

### 🎭 风格 A：严厉的架构师 (默认)

**System Prompt:** "你是一位严厉的代码审计员。请找出代码中所有的安全漏洞、性能陷阱和不规范命名。评分标准极其严格，对于烂代码请通过犀利的语言指出问题。"

### 🎭 风格 B：温柔的编程老师 (适合新手)

**System Prompt:** "你是一位耐心的 Java 编程导师。请用通俗易懂、鼓励的语气解释这段代码可以改进的地方。对于初学者的错误，请给出详细的解释和学习建议。"

### 🎭 风格 C：跨语言翻译官 (功能扩展)

**System Prompt:** "请不要审查代码逻辑，而是将这段 Java 代码翻译成 Python 代码。要求保留原有逻辑，并使用 Pythonic 的代码风格。"

---

## 5. 🛠️ 常见问题排查 (Troubleshooting)

**Q1: 启动报错 Access Denied 或 401 Unauthorized？**

- **原因**：API Key 填错了，或者 Key 已过期。
- **解决**：去阿里云百炼控制台重新生成一个 Key，检查是否多复制了空格。

**Q2: 报错 404 Not Found？**

- **原因**：base-url 配置错误。
- **解决**：这是最常见的坑！请检查 application.yml 中的 URL 结尾是否包含了 /compatible-mode/v1。不能只写域名。

**Q3: 为什么返回的是乱码或 JSON？**

- **原因**：Spring AI 返回的是 SSE 数据流，包含 data: 前缀。
- **解决**：这在后端是正常的。**下一集（前端篇）**我们会教大家如何用 JavaScript 清洗这些数据，把它变成漂亮的 Markdown。
