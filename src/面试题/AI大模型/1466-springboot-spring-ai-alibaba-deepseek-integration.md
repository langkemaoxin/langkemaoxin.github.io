---
title: "SpringBoot + Spring AI Alibaba 整合阿里云百炼DeepSeek大模型，小白也能轻松上手"
sidebarGroup: "AI大模型"
shortTitle: "SpringBoot + Spring AI Alibaba 整合阿里云百炼DeepSeek大模型，小白也能轻松上手"
order: 1466
date: 2026-06-21
category: "面试题"
tag:
  - "面试题"
description: "Spring 官方开源了 Spring AI 框架，用来简化 Spring 开发者开发智能体应用的过程。随后阿里巴巴开源了 Spring AI Alibaba，它基于 Spring AI，同时与阿里云百炼大模型服务、通义系列大模型做了深度集"
article: false
---

> 来源：[SpringBoot + Spring AI Alibaba 整合阿里云百炼DeepSeek大模型，小白也能轻松上手](https://www.yuque.com/tulingzhouyu/db22bv/dh09g2gfy7zb18qd)

Spring 官方开源了 Spring AI 框架，用来简化 Spring 开发者开发智能体应用的过程。随后阿里巴巴开源了 Spring AI Alibaba，它基于 Spring AI，同时与阿里云百炼大模型服务、通义系列大模型做了深度集成与最佳实践。基于 Spring AI Alibaba，Java 开发者可以非常方便地开发 AI 智能体应用。

![image](/面试题/AI大模型/1466-springboot-spring-ai-alibaba-deepseek-integration/img-767d41472e46.webp)

**开通阿里云百炼账号，获取API-KEY**

[官网卡顿怎么办？亲测有效！6种DeepSeek-R1满血模型替代方案分享](https://mp.weixin.qq.com/s?__biz=MzU1ODk1NTQ0Mg==&mid=2247485221&idx=1&sn=18f2cfc6b1fcf9ac39fa171e99ae964a&scene=21#wechat_redirect)

https://bailian.console.aliyun.com/#/model-market

其中 deepseek-r1 与 deepseek-v3 分别有 100
万的免费 Token，部分蒸馏模型限时免费体验。

![image](/面试题/AI大模型/1466-springboot-spring-ai-alibaba-deepseek-integration/img-c2d8948a1b1f.webp)

**SpringBoot接入deepseek实战**

使用 Spring AI Alibaba 开发应用与使用普通 Spring Boot 没有什么区别，只需要增加 `spring-ai-alibaba-starter` 依赖，将 `ChatClient` Bean 注入就可以实现与模型聊天了。

注意：因为 Spring AI Alibaba 基于 Spring Boot 3.x 开发，因此本地 JDK 版本要求为 17 及以上。

1. **添加依赖**

首先，需要在项目中添加 `spring-ai-alibaba-starter` 依赖，它将通过 Spring Boot 自动装配机制初始化与阿里云通义大模型通信的 `ChatClient`、`ChatModel` 相关实例。

```plain

&lt;dependency&gt;
  &lt;groupId&gt;com.alibaba.cloud.ai&lt;/groupId&gt;
  &lt;artifactId&gt;spring-ai-alibaba-starter&lt;/artifactId&gt;
  &lt;version&gt;1.0.0-M5.1&lt;/version&gt;
&lt;/dependency&gt;
```

注意：由于 spring-ai 相关依赖包还没有发布到中央仓库，如出现 spring-ai-core 等相关依赖解析问题，请在您项目的 pom.xml 依赖中加入如下仓库配置。

```plain
&lt;repositories&gt;
  &lt;repository&gt;
    &lt;id&gt;spring-milestones&lt;/id&gt;
    &lt;name&gt;Spring Milestones&lt;/name&gt;
    &lt;url&gt;https://repo.spring.io/milestone&lt;/url&gt;
    &lt;snapshots&gt;
      &lt;enabled&gt;false&lt;/enabled&gt;
    &lt;/snapshots&gt;
  &lt;/repository&gt;
&lt;/repositories&gt;
```

完整的pom文件如下

```plain
&lt;?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    &lt;modelVersion&gt;4.0.0&lt;/modelVersion&gt;
    &lt;parent&gt;
        &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
        &lt;artifactId&gt;spring-boot-starter-parent&lt;/artifactId&gt;
        &lt;version&gt;3.4.3&lt;/version&gt;
        &lt;relativePath/&gt; &lt;!-- lookup parent from repository --&gt;
    &lt;/parent&gt;
    &lt;groupId&gt;com.fox&lt;/groupId&gt;
    &lt;artifactId&gt;alibaba-ai-demo&lt;/artifactId&gt;
    &lt;version&gt;0.0.1-SNAPSHOT&lt;/version&gt;
    &lt;name&gt;alibaba-ai-demo&lt;/name&gt;
    &lt;description&gt;alibaba-ai-demo&lt;/description&gt;
    &lt;url/&gt;

    &lt;properties&gt;
        <java.version>17</java.version>
        <spring-ai.version>1.0.0-M5</spring-ai.version>
        <spring-ai-alibaba.version>1.0.0-M5.1</spring-ai-alibaba.version>
    &lt;/properties&gt;

    &lt;dependencies&gt;

     &lt;dependency&gt;
            &lt;groupId&gt;com.alibaba.cloud.ai&lt;/groupId&gt;
            &lt;artifactId&gt;spring-ai-alibaba-starter&lt;/artifactId&gt;
            &lt;version&gt;${spring-ai-alibaba.version}&lt;/version&gt;
        &lt;/dependency&gt;

        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-starter-web&lt;/artifactId&gt;
        &lt;/dependency&gt;

        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-starter-test&lt;/artifactId&gt;
            &lt;scope&gt;test&lt;/scope&gt;
        &lt;/dependency&gt;
    &lt;/dependencies&gt;

    &lt;dependencyManagement&gt;
        &lt;dependencies&gt;
            &lt;dependency&gt;
                &lt;groupId&gt;org.springframework.ai&lt;/groupId&gt;
                &lt;artifactId&gt;spring-ai-bom&lt;/artifactId&gt;
                &lt;version&gt;${spring-ai.version}&lt;/version&gt;
                &lt;type&gt;pom&lt;/type&gt;
                &lt;scope&gt;import&lt;/scope&gt;
            &lt;/dependency&gt;
        &lt;/dependencies&gt;
    &lt;/dependencyManagement&gt;

    &lt;repositories&gt;
        &lt;!-- spring-ai 相关依赖包还没有发布到中央仓库--&gt;
        &lt;repository&gt;
            &lt;id&gt;spring-milestones&lt;/id&gt;
            &lt;name&gt;Spring Milestones&lt;/name&gt;
            &lt;url&gt;https://repo.spring.io/milestone&lt;/url&gt;
            &lt;snapshots&gt;
                &lt;enabled&gt;false&lt;/enabled&gt;
            &lt;/snapshots&gt;
        &lt;/repository&gt;
    &lt;/repositories&gt;

    &lt;build&gt;
        &lt;plugins&gt;
            &lt;plugin&gt;
                &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
                &lt;artifactId&gt;spring-boot-maven-plugin&lt;/artifactId&gt;
            &lt;/plugin&gt;
        &lt;/plugins&gt;
    &lt;/build&gt;

&lt;/project&gt;
```

**2.配置 **`application.yml`** **

指定 API-KEY（可通过访问阿里云百炼模型服务平台获取，有免费额度可用）

```plain
spring:
  application:
    name: alibaba-ai-demo

  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}   # api key
      chat:
        options:
          model: deepseek-r1   # 模型名称
```

**3.注入智能体代理 ChatClient**

接下来，在普通 Controller Bean 中注入 `ChatClient` 实例，这样你的 Bean 就具备与 AI 大模型智能对话的能力了。

```plain
@RestController
public class ChatController {

    private final ChatClient chatClient;

    public ChatController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @GetMapping("/chat")
    public String chat(@RequestParam(value = "input") String input) {
        return this.chatClient.prompt()
                .user(input)
                .call()
                .content();
    }
}
```

以上示例中，ChatClient 使用默认参数调用大模型，Spring AI Alibaba 还支持通过 `DashScopeChatOptions` 调整与模型对话时的参数，`DashScopeChatOptions` 支持两种不同维度的配置方式：

- 全局默认值，即 `ChatClient` 实例初始化参数

可以在 `application.yml` 文件中指定

spring.ai.dashscope.chat.options.*

或调用构造函数

ChatClient.Builder.defaultOptions(options)完成配置初始化。

- 每次 Prompt 调用前动态指定

```plain
String result = dashScopeChatClient
  .prompt(query)
  .options(DashScopeChatOptions.builder().withTopP(0.8).build())
  .call()
  .content();
```

4.启动服务后测试

![image](/面试题/AI大模型/1466-springboot-spring-ai-alibaba-deepseek-integration/img-4906bd51f9f1.webp)
