---
title: "SpringBoot+Spring AI Alibaba接入RAG应用实战，让你的微服务应用具备智能化能力，小白也能快速上手"
sidebarGroup: "AI大模型"
shortTitle: "SpringBoot+Spring AI Alibaba接入RAG应用实战，让你的微服务应用具备智能化能力，小白也能快速上手"
order: 1465
date: 2026-07-19
category: "面试题"
tag:
  - "面试题"
description: "Spring AI Alibaba 开源项目基于 Spring AI 构建，是阿里云通义系列模型及服务在 Java AI 应用开发领域的最佳实践，提供高层次的 AI API 抽象与云原生基础设施集成方案，帮助开发者快速构建 AI 应用。阿里"
article: false
---

> 来源：[SpringBoot+Spring AI Alibaba接入RAG应用实战，让你的微服务应用具备智能化能力，小白也能快速上手](https://www.yuque.com/tulingzhouyu/db22bv/hhgchbh3ai7mpsrz)

Spring AI Alibaba 开源项目基于 Spring AI 构建，是阿里云通义系列模型及服务在 Java AI 应用开发领域的最佳实践，提供高层次的 AI API 抽象与云原生基础设施集成方案，帮助开发者快速构建 AI 应用。

阿里云百炼是一款可视化 AI 智能体应用开发平台，它提供了三种大模型应用开发模式：智能体、工作流与智能体编排，支持知识库检索、互联网搜索、工作流设计及智能体协作等功能。百炼平台上提供了 0 代码基础就能创建 RAG 应用的方案，你只需要关注私有领域知识库的维护即可使用。

本文会演示如何使用百炼**零代码构建**一款简单的**智能体应用**，随后会演示如何将一个普通的 **Spring Boot 微服务应用接入智能体**，让普通应用具备智能化能力。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107192-d9a8f774-62ff-41a7-93fe-8ef1a2899767.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_27%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

## 一、基于阿里云百炼平台0代码构建RAG应用

# **1.背景知识：什么是RAG**

就像你无法回答一个陌生领域的问题一样，大模型也无法回答预训练阶段没有准确掌握的知识。但是我们可以在大模型直接回答私有领域问题之前，给大模型一些参考，让大模型结合参考来回答问题。这一技术被称为**检索增强生成（Retrieval-Augmented Generation，RAG）**，非常适合于在私域知识问答场景中消除大模型幻觉（编造答案）。

**RAG 应用有两个关键过程：**

- **建立索引：**这一阶段你需要将私有领域知识的文档（如 PDF、Word 等格式）存储起来并建立索引。这一过程包含：将文档中的文字提取加载出来、切分成小的分块（chunk）以避免超过大模型提示词长度限制、将文本 chunk 向量化后存储到向量数据库中以便于后续检索。
- **检索和生成**：当你为私有知识建立好索引，并完成相关流程开发后，用户就可以进行提问。你的 RAG 应用收到用户问题后，会去向量数据库中检索和问题相关的 chunk，然后将相关的 chunk 组合到提示词中给到大模型。大模型会结合参考信息给出回答。

以下是常见的 RAG 应用流程图：

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107140-1cb156b1-2e75-4585-b88f-2f997ba24bd4.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_18%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

开发一个 RAG 应用需要你具备一定的代码能力和算法基础，并且也会耗费一些时间。

**2.开通阿里云百炼**

https://bailian.console.aliyun.com/

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107182-899891f2-efa9-42d8-b9ff-6d148131bbb7.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

百炼平台会为首次开通服务的用户提供免费试用额度。

**开通之后进行模型体验**

在左侧导航栏中，选择模型体验>文本模型>文本对话>通义千问-MAX，在下方的输入框中输入你想问的问题。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107208-27ffe527-7754-4c88-8cf7-3b3dff496e4c.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

在正式搭建 RAG 应用之前，我们可以先测试一个问题「**西红市实验十小一年二班的班主任是谁？**」来看下大模型的回答效果

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107190-f792ac0a-024f-44a4-bb05-0e67f8c1cb3f.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

你可能会看到这样的回答：

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107687-16258908-f3a1-47e6-a5b8-1fc93d31c10d.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

因为“西红市实验十小”这个学校是我们虚构的，大模型无法回答这个私有领域的问题。

**3. 创建知识库**

为了能够回答前一步骤的问题，我们需要创建一个知识库，并维护一些私有领域的知识文档。

你可以参考如下步骤完成：

1）下载我们提前准备好的示例知识库文件：

示例知识库.doc

2）单击左侧菜单栏中的**数据管理**，在**默认类目**下，单击**导入数据**。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107698-4c090799-8cf1-4e59-819e-8ac825af6515.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

3）在导入数据界面，单击**本地上传**，上传知识库文件（本实验使用的是示例数据），上传完成后单击**确认**。文档解析需要花费一段时间，请耐心等待，可以主动刷新页面。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107731-bb8587cf-5b47-4ec7-b503-49a2662ad690.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_26%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

4）单击左侧菜单栏中的**数据应用-知识索引**，单击**创建知识库**。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107726-d466f8c7-871d-4e41-92e9-30c731178025.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

5）填写**知识库名称：学校信息库**，其它参数保持**默认**即可，单击**下一步**。为了更好地区分不同的知识库，建议填写知识库描述；选择推荐配置；相似度阈值越高，模型可以从知识库中获取到的知识越精确，但是可能会丢失部分信息，相似度阈值越低，模型可以从知识库中获取的知识越多，但是可能会引入无用的知识，对模型生成的回复造成干扰，建议使用默认的阈值。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045107837-70dfcfed-e4f6-4981-ad35-48042cbcbcd7.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_30%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

6）单击**选择文件**，在**默认类目**中选中上传的**示例文档**，若有多个知识库文档，可以进行多选，单击**下一步**。在**数据处理**区域选择**智能切分**，单击**导入完成**。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108134-2b668c0a-7d27-41c5-b8d5-6a73b2962278.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108146-a23dd093-077e-4bb0-a00d-f600062c1efa.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_27%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

7）当看到状态为**解析完成**时，表示知识库创建完成；单击右侧的**查看切片**即可查看切分完成的文本块。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108183-18322fd4-48b3-49d3-8fbc-b60fcd7cee92.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**4.创建RAG应用**

完成知识库的创建后，我们可以创建一个 RAG 应用，用于回答私有知识：

1）单击左侧边栏的**应用中心-我的应用**，单击**新增应用>直接创建**。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108218-7e5be250-3d95-4d55-935f-5c1871316524.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108332-ee470aa3-d0b2-4f7b-b8db-3d7acd69c9d5.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_30%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

2）应用信息如下，配置好后点击单击

- 应用名称：示例名称-学校信息答疑机器人
- 模型：在模型下拉列表可以查看并选择通义千问系列模型
- 知识检索增强：开启，Prompt栏中会自动填充内容
- 选择知识库：选择创建好的知识库（学校信息库）

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108621-75a1ef3b-c8e4-43a0-8401-ec7527fa5db8.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108758-0c38485e-fe53-4152-95dc-e0558124c96b.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**5. 测试RAG应用**

创建好 RAG 应用后，我们可以再次尝试提问，看看现在大模型是否能正确回答这个问题【**西红市实验十小一年二班的班主任是谁？**】。

1）在右侧边栏体验窗区域，切换为**发布版**。在输入框进行提问 **西红市实验十小一年二班的班主任是谁？**

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108782-1e546d38-1fc9-4925-a31f-f578fbc34b77.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

可以看到，开启知识检索增强的应用已经能够成功回答该问题了。

**6.发布RAG应用**

点击页面右上角的 “发布” 按钮，将智能体正式发布出去。

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108759-d8388afd-d0fc-4129-9426-5a25a4a8f0c2.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

发布完成后，我们就可以通过通过 API 与这个智能体应用进行对话了。接下来我们演示如何在 Spring Boot 应用中快速访问这个智能体应用。

**二、SpringBoot+Spring AI Alibaba接入RAG应用**

为了让 Spring Boot 应用访问百炼中发布的智能体应用，首先我们为应用加入 Spring AI Alibaba 依赖：

&lt;dependency&gt;    &lt;groupId&gt;com.alibaba.cloud.ai&lt;/groupId&gt;    &lt;artifactId&gt;spring-ai-alibaba-starter&lt;/artifactId&gt;    &lt;version&gt;${spring-ai-alibaba.version}&lt;/version&gt;&lt;/dependency&gt;

其次，需要在百炼平台获取应用标识、模型apikey等信息：

spring:  ai:    dashscope:      agent:        app-id: put-your-app-id-here      api-key: ${AI_DASHSCOPE_API_KEY}

- api-key，必填，访问模型服务的 key。
- app-id，必填，每个百炼应用都有一个 id，用户唯一标识这个应用。
- workspace-id，选填，默认使用默认业务空间，如果是在独立业务空间创建的应用则需要指定。

**应用id**

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045108868-3ca0fa74-09a1-4ed6-bf91-faab8d042b83.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_24%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**业务空间**

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045109338-f7b485c1-3ce2-4d75-b011-09372eb32e3a.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**Spring AI Alibaba 使用 **`DashScopeAgent`** 访问**

示例代码：

```plain

```

**测试效果**

![image](https://cdn.nlark.com/yuque/0/2025/webp/12590378/1759045109181-6ea9c55c-2b63-49a5-99a1-f3f96b70abff.webp?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)
