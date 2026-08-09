---
title: "IDEA集成满血DeepSeek，写代码比抄作业还快！"
sidebarGroup: "AI大模型"
shortTitle: "IDEA集成满血DeepSeek，写代码比抄作业还快！"
order: 1478
date: 2026-01-27
category: "面试题"
tag:
  - "面试题"
description: "1、使用 Continue 插件安装 Continue 插件：首先在IDEA中点击设置-插件。搜索插件continue安装完成后，在右侧便可以看到continue的图标。添加配置 DeepSeek-R1 模型：选择DeepSeek模型。下面"
article: false
---

> 来源：[IDEA集成满血DeepSeek，写代码比抄作业还快！](https://www.yuque.com/tulingzhouyu/db22bv/mdm69mxldu64dfld)

# 1、使用 Continue 插件

## 安装 Continue 插件：

首先在IDEA中点击`设置`-`插件`。搜索插件`continue`

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-8c61e51481e3.png)

安装完成后，在右侧便可以看到`continue`的图标。

## 添加配置 DeepSeek-R1 模型：

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-47686efc0ebf.png)

选择DeepSeek模型。下面选择`DeepSeek Coder`

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-ea60c6ab6319.png)

## API key 来源：

至于 API key 的来源就容易了，到官网进行注册。www.deepseek.com

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-06b6238fa0b4.png)

注册完成后，登录并创建API

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-6643448ff9d0.png)

复制KEY后，我们便可以使用了。在使用之前，我们需要`@`指定的文件。并说明想要实现的功能。

如：“这是一个 orc 的实现逻辑，请优化识别效率与正确率”

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-0e6bf8704f31.png)

点击图标，代码自动插入。

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-9ce23d21291f.png)

**注意：由于恶意攻击，可能导致响应比较缓慢。**

# 2、使用 CodeGPT 插件

## 安装 CodeGPT 插件

首先在IDEA中点击`设置`-`插件`。搜索插件`codeGPT`

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-de32ec6edf12.png)

安装完成后，在右侧便可以看到 codeGPT 的图标。

## 修改 CodeGPT 配置：

在 settings 下面的 **CodeGPT--Providers-Custom OpenAI 下**的 URL 下修改为：

**API key：**填入 DeepSeek API key

**URL：** https://api.deepseek.com/chat/completions

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-ac2e4f0224cf.png)

参考配置文档https://api-docs.deepseek.com/zh-cn/   **将模型改为 R1 模型**

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-06a9fb0f4816.png)

## API Key 来源：

重新申请一个

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-098f9311e377.png)

## 代码补全提示：

FIM template：选择**DeepSeek Coder**

URL：填入 **https://api.deepseek.com/beta/completions**

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-3b40a08ae0a8.png)

参考配置文档[https://api-docs.deepseek.com/zh-cn/guides/chat_prefix_completion](https://api-docs.deepseek.com/zh-cn/guides/chat_prefix_completion)   **将模型改为 R1 模型**

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-951d01641a0f.png)

修改完保存，测试：

“这是一个 orc 的实现逻辑，请优化识别效率与正确率”

![image](/面试题/AI大模型/1478-idea-full-deepseek-integration/img-122774a9cfa3.png)
