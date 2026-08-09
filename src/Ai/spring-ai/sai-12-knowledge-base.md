---
title: "12.《基于RAG技术的个人知识库AI问答系统》实战"
sidebarGroup: "Spring AI"
shortTitle: "12.《基于RAG技术的个人知识库AI问答系统》实战"
order: 12
date: 2026-06-22
category: "AI"
tag:
  - "Spring AI"
  - "Agent"
description: "基于 RAG 的个人知识库问答系统实战。"
---

> 来源：[12.《基于RAG技术的个人知识库AI问答系统》实战](https://www.yuque.com/geren-t8lyq/ncgl94/rn5hadlk846y4tc0?singleDoc#)

**不对外公开， VIP同学请仔细班主任看详细课程和笔记， 社区同学请联系徐庶老师**

### 代码

#### V1.0

1. 基本功能+核心功能
2. 前端和后端分开2个文件夹

#### V2.0

1. 前端和后端在一个文件夹， 方便vibe coding
2. 加入supersql实现text-tosql
3. 实现跨向量聚合问题
4. 实现来源追溯
5. 实现文档更新
6. 继续更新...

![image](/Ai/spring-ai/sai-12-knowledge-base/img-001.png)

链接:  (不对外提供）

### 核心功能

上传资料

![image.png](/Ai/spring-ai/sai-12-knowledge-base/img-002.png)

AI对话

![image.png](/Ai/spring-ai/sai-12-knowledge-base/img-003.png)

### 其他功能

对话记录

![image.png](/Ai/spring-ai/sai-12-knowledge-base/img-004.png)

敏感词管理

![image.png](/Ai/spring-ai/sai-12-knowledge-base/img-005.png)

热词统计

![image.png](/Ai/spring-ai/sai-12-knowledge-base/img-006.png)

前端（提供）：  Vue 3 + TypeScript + Vite

后端：

- Spring Boot: 3.4.2
- JDK: 17
- spring-ai: 1.0.0 GA
- spring-ai-alibaba: 1.0.0.2
- maven: 3.9.6
- Mysql 5.7
- Milvus(向量存储)
- LLM使用的通义千问
- 对象存储使用阿里云OSS (上传RAG资料）
