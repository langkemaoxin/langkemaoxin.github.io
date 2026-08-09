---
title: "两分钟IDEA完美接入满血deepseek R1模型，基于continue插件+硅基流动实现"
sidebarGroup: "AI大模型"
shortTitle: "两分钟IDEA完美接入满血deepseek R1模型，基于continue插件+硅基流动实现"
order: 1467
date: 2026-03-13
category: "面试题"
tag:
  - "面试题"
description: "两分钟IDEA完美接入满血deepseek R1模型，基于continue插件+硅基流动实现"
article: false
---

> 来源：[两分钟IDEA完美接入满血deepseek R1模型，基于continue插件+硅基流动实现](https://www.yuque.com/tulingzhouyu/db22bv/rcf7oafywcn39h0p)

原本想在 IntelliJ IDEA 中接入 deepseek 的，打开官网 API 平台时，我沉默了

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739105096410-1654acad-3311-4acf-bc52-024b65280aac.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_49%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

不能充值了，好吧，到此结束，关灯睡觉。

等等，别急，还有解决方案呢，跟着我一步步实操起来。

## 一、注册硅基流动账号

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739105986181-4a73424a-b6e5-49b1-b9e2-ec819a8a7ef2.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_24%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

访问 [硅基流动](https://cloud.siliconflow.cn/i/wn4Ok7Iz)（[https://cloud.siliconflow.cn/i/wn4Ok7Iz](https://cloud.siliconflow.cn/i/wn4Ok7Iz)），直接点击注册（获得2000万的Tokens）。

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739106079768-aeac6c61-9103-404e-9212-d595aa2a44fc.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_18%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

注册完成后，你会发现这里提供了丰富的模型资源，包括华为云部署的满血 R1 和 V3。

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739106212194-646a808d-906e-4748-bce5-52db177d0998.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

在左侧的 **API 密钥** 菜单栏中，生成你的 API 密钥。

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739106334316-a0c41d6f-b712-4333-bf98-37e5cb55704b.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_54%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

## 二、通过 Continue 插件接入 deepseek

### Continue 插件介绍

[Continue](https://www.continue.dev/) 是一款开源的 AI 代码助手插件，专为 VS Code 和 JetBrains 系列 IDE 设计，能够实时提供代码补全建议，显著提升编码效率。它支持连接多种语言模型。

### Continue 插件安装

在Idea插件市场中搜索 **Continue** 并安装。

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739106487693-7c437afe-1d4f-4212-a706-a36fdc1a3eab.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_34%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

安装完成后，分别点击右侧边栏的 **Continue** 图标和设置按钮。

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739106592104-717b45a2-4d71-4061-9631-1df524b6b9b2.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_30%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

此时，你将看到 Continue 的配置文件。我简单地写了一些配置，你可以直接拷贝以下配置，并替换为你在硅基流动上生成的 API 密钥。如果需要更多配置，请参考插件官网：[配置文件参考](https://docs.continue.dev/reference)([https://docs.continue.dev/reference](https://docs.continue.dev/reference))。

```java
{
"models": [
    {
      "model": "claude-3-5-sonnet-latest",
      "provider": "anthropic",
      "apiKey": "",
      "title": "Claude 3.5 Sonnet"
    },
    {
      "title": "deepseek-ai/DeepSeek-R1",
      "model": "deepseek-ai/DeepSeek-R1",
      "contextLength": 30000,
      "provider": "openai",
      "apiBase": "https://api.siliconflow.cn/v1",
      "apiKey": "输入自己的API keys",
      "requestOptions": {
        "extraBodyProperties": {
          "transforms": []
        }
      }
    },
    {
      "title": "deepseek-ai/DeepSeek-V3",
      "model": "deepseek-ai/DeepSeek-V3",
      "contextLength": 30000,
      "provider": "openai",
      "apiBase": "https://api.siliconflow.cn/v1",
      "apiKey": "输入自己的API keys",
      "requestOptions": {
        "extraBodyProperties": {
          "transforms": []
        }
      }
    },
    {
      "title": "deepseek-ai/DeepSeek-V2.5",
      "provider": "openai",
      "model": "deepseek-ai/DeepSeek-V2.5",
      "contextLength": 30000,
      "apiBase": "https://api.siliconflow.cn/v1",
      "apiKey": "输入自己的API keys",
      "useLegacyCompletionsEndpoint": false
    }
  ],

"tabAutocompleteModel": [
    {
      "title": "deepseek-ai/DeepSeek-V2.5",
      "provider": "openai",
      "model": "deepseek-ai/DeepSeek-V2.5",
      "contextLength": 30000,
      "apiBase": "https://api.siliconflow.cn/v1",
      "apiKey": "输入自己的API keys",
      "useLegacyCompletionsEndpoint": false
    }
  ],
    
"tabAutocompleteOptions": {
    "template": "Please teach me what I should write in the `hole` tag, but without any further explanation and code backticks, i.e., as if you are directly outputting to a code editor. It can be codes or comments or strings. Don't provide existing & repetitive codes. If the provided prefix and suffix contain incomplete code and statement, your response should be able to be directly concatenated to the provided prefix and suffix. Also note that I may tell you what I'd like to write inside comments. \n{​{{prefix}​}}&lt;hole&gt;&lt;/hole&gt;{​{{suffix}​}}\n\nPlease be aware of the environment the hole is placed, e.g., inside strings or comments or code blocks, and please don't wrap your response in ```. You should always provide non-empty output.\n",
    "maxPromptTokens": 2048,
    "prefixPercentage": 0.85,
    "maxSuffixPercentage": 0.15,
    "debounceDelay": 500,
    "multilineCompletions": "always",
    "slidingWindowPrefixPercentage": 0.75,
    "slidingWindowSize": 350,
    "maxSnippetPercentage": 0.6,
    "recentlyEditedSimilarityThreshold": 0.3,
    "useCache": true,
    "onlyMyCode": false,
    "useOtherFiles": false,
    "useRecentlyEdited": true,
    "recentLinePrefixMatchMinLength": 7
  },

"customCommands": [
    {
      "name": "test",
      "prompt": "{​{{ input }​}}\n\nWrite a comprehensive set of unit tests for the selected code. It should setup, run tests that check for correctness including important edge cases, and teardown. Ensure that the tests are complete and sophisticated. Give the tests just as chat output, don't edit any file.",
      "description": "Write unit tests for highlighted code"
    }
  ],
"contextProviders": [
    {
      "name": "diff",
      "params": {}
    },
    {
      "name": "folder",
      "params": {}
    },
    {
      "name": "codebase",
      "params": {}
    }
  ],
"slashCommands": [
    {
      "name": "share",
      "description": "Export the current chat session to markdown"
    },
    {
      "name": "commit",
      "description": "Generate a git commit message"
    }
  ]
}
```

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739104029860-caa8b8cd-c1b2-43ca-b1c4-bea4b00244c5.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_43%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

在对话窗口中，你将看到我们加入的模型。

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739104174940-0fdf3d7e-94f5-4c0a-9036-6e4f9973de0b.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_41%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

我们来测试一下。

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739104425836-de04aa93-4c1f-41c6-a7be-e6652d3cba49.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_33%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

帮我用Java实现一个冒泡排序。

![image](https://cdn.nlark.com/yuque/0/2025/png/12590378/1739104931054-7a9150ae-9db3-40eb-9926-dfef41e1ef6a.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_51%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)
