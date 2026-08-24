---
title: Engine API 与插件——用 curl 也能创建容器
sidebarGroup: Docker 系列
shortTitle: 31 Engine API 与插件
order: 31
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Engine API
  - 自动化
description: /var/run/docker.sock 背后的 REST API：curl 直接创建/启动容器、API 版本协商、SDK 认脸、docker.sock 挂进容器等于给 root 的安全边界、CLI 插件与日志/网络/卷插件机制——写自己容器平台的入场券。对应学习总纲阶段 8。
---

> **Docker 系列 · 第 31/33 篇**
> 上一篇：[《镜像供应链安全——从随手 pull 滚到扫描、签名与加固镜像》](/云原生/docker/docker-30-supply-chain) · 下一篇：[《Docker 的 AI 表面——Model Runner 本地跑大模型（含 Sandboxes/MCP 认脸）》](/云原生/docker/docker-32-ai-surface)

---

> 🚧 **本文撰写中（占位文件）**
> 本篇是[学习总纲](./docker-00-roadmap.md)阶段 8（深水区与毕业）的缺口篇目，编号已排入学习路线；正文按下述大纲撰写。**本篇不阻塞主线**——前置只有第 23 篇的架构链路认知。

## 这一篇要解决什么问题

`docker run` 敲下去，CLI 到底对 daemon 说了什么？答案：**一次普通的 HTTP 请求**。明白这一点，三扇门同时打开：

1. 任何语言都能驱动 Docker（不需要 shell out 拼 docker 命令）；
2. 你能看懂 Portainer、Jenkins Docker 插件、各种 CI 平台是怎么「管理容器」的；
3. 你会真正理解第 25 篇那句警告——**把 `/var/run/docker.sock` 挂进容器 = 给它 root**——因为 socket 就是 API 的全权入口。

## 计划覆盖的知识单元（西蒙学习法拆解）

| 单元 | 回答的核心问题 | 动手实验（撰写时必须真跑） | 吃透的标准 |
|------|----------------|--------------------------|------------|
| 31.1 socket 与第一请求 | docker 命令的底层是什么？ | `curl --unix-socket /var/run/docker.sock http://localhost/version` 与 `_ping` | 说清 CLI = REST 客户端、daemon = REST 服务端（第 23 篇链路的第一跳落地） |
| 31.2 容器生命周期 API | 用 HTTP 怎么起一个容器？ | `POST /containers/create` + `POST /containers/{id}/start` + `GET /containers/json` 全链 curl 实操 | 能脱稿说出 create/start 两步分离的设计原因（先配后跑） |
| 31.3 API 版本协商 | 客户端老、daemon 新怎么办？ | `/v1.44/...` 前缀实验；`DOCKER_API_VERSION` 认脸 | 说清 29.0 起最低支持 v1.44 的兼容边界 |
| 31.4 流式接口 | logs/attach 的输出怎么通过 HTTP 传？ | `GET /containers/{id}/logs?follow=1` 观察 chunked 流；multiplexed 流认脸 | 说清 stdout/stderr 复用帧（stdcopy 的由来） |
| 31.5 SDK 与生态 | 不拼 curl 用什么？ | Python `docker` SDK 或 Go client 起一个容器（十行以内）；认脸：Testcontainers 就是这么工作的 | 能判断「shell 拼 docker 命令 vs SDK」的取舍 |
| 31.6 socket 安全 | 为什么挂 sock 等于给 root？ | 恶意演示：挂 sock 的容器内 curl 创建 `--privileged` 容器挂载宿主根目录 | 说清最小替代方案（socket proxy、只读、TLS 远程访问） |
| 31.7 插件机制 | Docker 怎么被扩展？ | CLI 插件（`docker buildx` 就是插件）认脸；log/volume/network 驱动插件认脸 | 知道「想给 Docker 加功能」时该插在哪一层 |

## 与前后篇的关系

- 前置：第 23 篇 daemon 架构链路（本篇是它第一跳的解剖）、第 25 篇安全（socket 暴露面）；
- 后续：毕业设计（第 33 篇）可选加分项——给自己的项目写一个迷你管理面板。

## 官方资料锚点（撰写时以此为准，注意核验版本）

- [Engine API 参考](https://docs.docker.com/reference/api/engine/)——最新版 v1.52（29.0），最低协商 v1.44（核验于 2026-08-24）
- [Docker Engine 插件](https://docs.docker.com/engine/plugins/)——Plugin API 与三类驱动插件
