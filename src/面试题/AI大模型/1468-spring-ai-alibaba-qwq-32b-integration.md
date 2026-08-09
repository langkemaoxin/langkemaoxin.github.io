---
title: "Spring AI Alibaba整合阿里最新开源的QwQ-32B 模型，性能媲美DeepSeek R1，参数量仅用其1/20"
sidebarGroup: "AI大模型"
shortTitle: "Spring AI Alibaba整合阿里最新开源的QwQ-32B 模型，性能媲美DeepSeek R1，参数量仅用其1/20"
order: 1468
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "3月6日凌晨，阿里巴巴发布并开源全新的推理模型通义千问QwQ-32B。通过大规模强化学习，千问QwQ-32B在数学、代码及通用能力上实现质的飞跃，整体性能比肩DeepSeek-R1。在保持强劲性能的同时，千问QwQ-32B还大幅降低了部署使"
article: false
---

> 来源：[Spring AI Alibaba整合阿里最新开源的QwQ-32B 模型，性能媲美DeepSeek R1，参数量仅用其1/20](https://www.yuque.com/tulingzhouyu/db22bv/uw8gzo7gpbbqvzil)

3月6日凌晨，阿里巴巴发布并开源全新的推理模型通义千问QwQ-32B。通过大规模强化学习，千问QwQ-32B在数学、代码及通用能力上实现质的飞跃，整体性能比肩DeepSeek-R1。在保持强劲性能的同时，千问QwQ-32B还大幅降低了部署使用成本，在消费级显卡上也能实现本地部署。

![image](/面试题/AI大模型/1468-spring-ai-alibaba-qwq-32b-integration/img-b64f5a0bdb4d.webp)

目前，千问QwQ-32B已在魔搭社区、HuggingFace及GitHub等平台基于宽松的Apache2.0协议开源，所有人都可免费下载模型进行本地部署，或者通过阿里云百炼平台直接调用模型API服务。
具体链接如下：
• https://huggingface.co/Qwen/QwQ-32B
• https://modelscope.cn/models/Qwen/QwQ-32B
• https://ollama.com/library/qwq

**如何实现本地部署QwQ-32B**
如果想要快速本地部署尝试，可以借助Ollama快速部署

![image](/面试题/AI大模型/1468-spring-ai-alibaba-qwq-32b-integration/img-2d6e593a834f.webp)

具体细节可以参考我之前的文章：
[三分钟轻松搞定！Windows本地部署DeepSeek-R1推理模型，小白也能快速上手！](https://mp.weixin.qq.com/s?__biz=MzU1ODk1NTQ0Mg==&mid=2247485207&idx=1&sn=d8ac478fa0d83edde16df959ef616c91&scene=21#wechat_redirect)

**Spring AI Alibaba集成QwQ-32B实战**
**通过阿里云百炼平台直接调用模型API服务**
https://bailian.console.aliyun.com/#/model-market

![image](/面试题/AI大模型/1468-spring-ai-alibaba-qwq-32b-integration/img-236d43a884f7.webp)

模型调用限时免费

![image](/面试题/AI大模型/1468-spring-ai-alibaba-qwq-32b-integration/img-5adda60644e4.webp)

**开通阿里云百炼账号，获取API-KEY**

![image](/面试题/AI大模型/1468-spring-ai-alibaba-qwq-32b-integration/img-2568403a9082.webp)

![image](/面试题/AI大模型/1468-spring-ai-alibaba-qwq-32b-integration/img-4283c652c8d5.webp)

**SpringBoot接入QwQ-32B实战**
使用 Spring AI Alibaba 开发应用与使用普通 Spring Boot 没有什么区别，只需要增加 spring-ai-alibaba-starter 依赖，将 ChatClient Bean 注入就可以实现与模型聊天了。
注意：因为 Spring AI Alibaba 基于 Spring Boot 3.x 开发，因此本地 JDK 版本要求为 17 及以上。
**1添加依赖**
首先，需要在项目中添加 spring-ai-alibaba-starter 依赖，它将通过 Spring Boot 自动装配机制初始化与阿里云通义大模型通信的 ChatClient、ChatModel 相关实例。

```plain
&lt;dependency&gt;
  &lt;groupId&gt;com.alibaba.cloud.ai&lt;/groupId&gt;
  &lt;artifactId&gt;spring-ai-alibaba-starter&lt;/artifactId&gt;
  &lt;version&gt;1.0.0-M5.1&lt;/version&gt;
&lt;/dependency&gt;
```

**2.配置 application.yml**
指定 API-KEY（可通过访问阿里云百炼模型服务平台获取，有免费额度可用）

```plain
spring:
  application:
    name: qwq-demo

  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwq-32b
```

**3.注入智能体代理 ChatClient**
ChatClient 类似于应用程序开发中的服务层，它为应用程序直接提供 AI 服务，开发者可以使用 ChatClient Fluent API 快速完成一整套 AI 交互流程的组装。
接下来，在普通 Controller Bean 中注入 ChatClient 实例，这样你的 Bean 就具备与 AI 大模型智能对话的能力了。

```plain
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
    public class ChatController {

      private final ChatClient chatClient;

      public ChatController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
      }

      @GetMapping(value = "/stream",produces = "text/html;charset=utf-8")
      public Flux&lt;String&gt; stream(String input) {
        return this.chatClient.prompt()
            .user(input)
            .stream()
            .content();
      }
    }
```

**4.启动服务后测试**

![image](/面试题/AI大模型/1468-spring-ai-alibaba-qwq-32b-integration/img-d4bea025a86a.webp)

若有收获，就点个赞吧
