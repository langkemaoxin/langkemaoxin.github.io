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

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738822443431-606e20f9-bfb5-472c-b537-7320bc5a5ca7.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

安装完成后，在右侧便可以看到`continue`的图标。

## 添加配置 DeepSeek-R1 模型：

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738822549404-9a8fd674-9277-446d-91b9-8f7a0733072c.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

选择DeepSeek模型。下面选择`DeepSeek Coder`

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738822654394-ae4c34e6-9b34-4e88-a7db-a2342a824df7.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

## API key 来源：

至于 API key 的来源就容易了，到官网进行注册。www.deepseek.com

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738822721549-8ba3dead-d6eb-4d8e-a04a-6a9ddb312165.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

注册完成后，登录并创建API

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738822800861-80047b79-577a-4373-a503-8999ea38503b.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

复制KEY后，我们便可以使用了。在使用之前，我们需要`@`指定的文件。并说明想要实现的功能。

如：“这是一个 orc 的实现逻辑，请优化识别效率与正确率”

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738822901581-fe7f55b6-4f80-4fb9-8dd9-6f24e82623a1.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

点击图标，代码自动插入。

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738823154474-d43276f9-39a7-4522-a67b-a72e43e3af60.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**注意：由于恶意攻击，可能导致响应比较缓慢。**

# 2、使用 CodeGPT 插件

## 安装 CodeGPT 插件

首先在IDEA中点击`设置`-`插件`。搜索插件`codeGPT`

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738823754399-ffbc5394-13d1-4aba-8253-56d41475ffac.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

安装完成后，在右侧便可以看到 codeGPT 的图标。

## 修改 CodeGPT 配置：

在 settings 下面的 **CodeGPT--Providers-Custom OpenAI 下**的 URL 下修改为：

**API key：**填入 DeepSeek API key

**URL：** https://api.deepseek.com/chat/completions

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738824890811-d161fc98-5612-49b1-bd9d-fa4a49858329.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

参考配置文档https://api-docs.deepseek.com/zh-cn/   **将模型改为 R1 模型**

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738826899911-0deac04f-01f6-43b0-9fd4-9a7d6b1ef789.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

## API Key 来源：

重新申请一个

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738824545562-abd50085-6f42-4bb8-9b62-ead3c34745b2.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

## 代码补全提示：

FIM template：选择**DeepSeek Coder**

URL：填入 **https://api.deepseek.com/beta/completions**

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738824249253-bbb999e6-a7e7-40bf-9b26-c0804025acba.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

参考配置文档[https://api-docs.deepseek.com/zh-cn/guides/chat_prefix_completion](https://api-docs.deepseek.com/zh-cn/guides/chat_prefix_completion)   **将模型改为 R1 模型**

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738826931384-e774abd8-3e86-4de1-b059-bf2ad36b0b6d.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

修改完保存，测试：

“这是一个 orc 的实现逻辑，请优化识别效率与正确率”

![image](https://cdn.nlark.com/yuque/0/2025/png/35268836/1738827116562-9d069555-946d-490b-8f8d-91c712817989.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_73%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)
