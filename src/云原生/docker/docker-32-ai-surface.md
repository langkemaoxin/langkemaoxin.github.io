---
title: Docker 的 AI 表面——Model Runner 本地跑大模型（含 Sandboxes/MCP 认脸）
sidebarGroup: Docker 系列
shortTitle: 32 AI 表面
order: 32
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - AI
  - ModelRunner
description: 2026 年 Docker 挂在名字下的新表面：Model Runner 本地跑模型（docker model run + REST 推理接口）、Sandboxes 给 AI 编码智能体做隔离环境、MCP Catalog/Toolkit、Gordon 与 Docker Agent 认脸——容器技术成为 AI 工程地基。对应学习总纲阶段 8 单元 8.4。
---

> **Docker 系列 · 第 32/33 篇**
> 上一篇：[《Engine API 与插件——用 curl 也能创建容器》](/云原生/docker/docker-31-engine-api) · 下一篇：[《把 TruFor 打成可交付镜像——从 git clone 翻车滚到 curl 通的 HTTP 服务》](/云原生/docker/docker-33-trufor-image-packaging)

---

> 🚧 **本文撰写中（占位文件）**
> 本篇是[学习总纲](./docker-00-roadmap.md)阶段 8（深水区与毕业）的缺口篇目，编号已排入学习路线；正文按下述大纲撰写。**本篇不阻塞主线**——它是本系列与 AI 板块的接口篇，认脸级定位。

## 这一篇要解决什么问题

学到第 31 篇，你掌握的是「2013 年的那个 Docker」。但打开 2026 年的官方文档，第一板块已经叫 **AI and agents**——Docker 公司把宝押在了「AI 时代的本地运行时」上。作为容器方向的从业者，不需要精通每样东西，但**面试聊到「Docker 在 AI 里干什么」时能接得住**，需要认全这张新地图并亲手跑通其中一样。

## 计划覆盖的知识单元（西蒙学习法拆解）

| 单元 | 回答的核心问题 | 动手实验（撰写时必须真跑） | 吃透的标准 |
|------|----------------|--------------------------|------------|
| 32.1 版图认脸 | 官方「AI and agents」板块里都有谁？ | 对照 2026-08 手册目录：Sandboxes / MCP Catalog & Toolkit / Model Runner / Gordon / Docker Agent，各自一句话定位 | 拿到任何一个 AI×Docker 名词能归位 |
| 32.2 Model Runner | 本地跑大模型为什么是容器公司的活？ | `docker model pull` + `docker model run` 起一个小模型（CPU 可跑），curl 它的推理 REST 接口 | 说清「模型镜像化」与镜像分发同构的直觉；与 Ollama 的分工 |
| 32.3 Sandboxes | AI 编码智能体的「防爆间」怎么搭？ | 认脸级：隔离分层/默认策略/凭据模型（对照第 26 篇 rootless 的隔离思想） | 说清「为什么智能体执行环境天然是容器问题」 |
| 32.4 MCP 生态 | 工具调用协议和 Docker 什么关系？ | 认脸级：MCP Catalog 把 MCP server 当镜像分发；Toolkit 一键起 | 能讲出「镜像注册中心模式被复制到 MCP 世界」这条主线 |
| 32.5 与本系列的接口 | 前面 31 篇哪几篇直接喂给了 AI 表面？ | 回链：第 9 篇镜像打包、第 15 篇网络、第 25/26 篇安全隔离、第 31 篇 API | 说清「AI 工程的地基就是容器工程」——这是通往 [AI 总纲](/Ai/roadmap/aicon-2026-roadmap) 的桥 |

## 与前后篇的关系

- 前置：无新增硬前置，但第 31 篇 API 视角会让你更快看懂 Model Runner 的 REST 面；
- 去向：[AICon 2026 学习总纲](/Ai/roadmap/aicon-2026-roadmap)——那边的阶段 0（本地跑模型）与本篇 32.2 直接接壤。

## 官方资料锚点（撰写时以此为准，注意核验版本）

- [AI and agents 手册](https://docs.docker.com/manuals/)——Sandboxes / MCP Catalog and Toolkit (Beta) / Model Runner / Gordon / Docker Agent（核验于 2026-08-24）
- [Model Runner](https://docs.docker.com/ai/model-runner/)——含 REST API 与推理引擎说明
