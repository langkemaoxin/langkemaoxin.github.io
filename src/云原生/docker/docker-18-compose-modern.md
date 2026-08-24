---
title: Compose 现代特性——watch 热更、profiles 分组与 init 容器
sidebarGroup: Docker 系列
shortTitle: 18 Compose 现代特性
order: 18
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Compose
description: compose watch 文件同步热更、profiles 按需分组、init 容器、provider services、多 compose 文件 merge/include、生命周期钩子——把第 16 篇的主线语法升级成现代工作流。对应学习总纲阶段 5。
---

> **Docker 系列 · 第 18/33 篇**
> 上一篇：[《从零理解 HTTPS——Nginx 容器从红页到可信（师生对话实录）》](/云原生/docker/docker-17-https-nginx) · 下一篇：[《Docker 技术底座——沿着「又轻又像一台机器」逐层解开 Namespace、Cgroups 与 UnionFS》](/云原生/docker/docker-19-tech-foundation)

---

> 🚧 **本文撰写中（占位文件）**
> 本篇是[学习总纲](./docker-00-roadmap.md)阶段 5（编排：Compose 单机组队）的缺口篇目，编号已排入学习路线；正文按下述大纲撰写。**本篇不阻塞主线**——主线语法见第 16 篇，HTTPS 综合实战见第 17 篇，可先行。

## 这一篇要解决什么问题

第 16 篇学会了 compose.yaml 的主线语法，但日常开发里还有三类烦人时刻：

1. 改一行代码要手动 `up --build` 重启——**想要保存即热更**；
2. 一个工程里 debug 工具、压测工具、管理后台平时不想起——**想要按需分组启停**；
3. 通用 mysql 定义在每个项目里复制粘贴——**想要一份配置处处 include**。

这三件事 Compose 近年都给了官方答案：`watch`、`profiles`、`include`。加上 2026 年新转正的 init 容器与 provider services，这一篇把「会用 Compose」升级成「用得现代」。

## 计划覆盖的知识单元（西蒙学习法拆解）

| 单元 | 回答的核心问题 | 动手实验（撰写时必须真跑） | 吃透的标准 |
|------|----------------|--------------------------|------------|
| 18.1 compose watch | 改代码怎么保存即生效？ | `develop.watch` 配 sync/rebuild 两种动作，改源码看容器内实时变化 | 说清 sync（同步文件）与 rebuild（重建容器）各自适配什么场景 |
| 18.2 profiles | 一套编排怎么按场景分组启停？ | 同一 yaml 拆 dev/debug 两 profile，`--profile` 启停对照 | 说清「没标 profile 的服务永远起、标了的不点名不起」 |
| 18.3 include 与多文件 | 公共中间件定义怎么复用？ | 主 yaml `include` 一份公共 mysql 编排；override 文件分层合并 | 说清 include（拉别的文件）与 merge/override（同名覆盖）的边界 |
| 18.4 init 容器与钩子 | 服务起来前要先跑一次性任务怎么办？ | init 容器（2026 新）等 DB 建表再起应用；lifecycle 钩子认脸 | 说清与 `depends_on: condition: service_completed_successfully` 的关系 |
| 18.5 provider services 与 GPU | 「外部资源」也能声明进编排？ | provider services 认脸（把外部服务当依赖声明）；`deploy.resources` 挂 GPU 认脸 | 知道什么时候该把外部依赖写进 yaml、什么时候别写 |
| 18.6 生产定位复查 | Compose 到底能不能上生产？ | 官方 "Use Compose in production" 逐条对照自家工程 | 能列出不适宜单机 Compose 的三个信号（多机/自愈/滚动发布） |

## 与前后篇的关系

- 前置：第 16 篇 Compose 主线语法、第 17 篇综合实战——本篇全部建立在这两篇之上；
- 后续：阶段 6 起进入原理篇，Compose 的编排思想会在第 29 篇 Swarm 与 K8s 学习总纲里反复回响。

## 官方资料锚点（撰写时以此为准，注意核验版本）

- [Compose how-tos](https://docs.docker.com/compose/how-tos/)——Use Compose Watch / Use service profiles / Use multiple Compose files / Use init containers (2026 新) / Use provider services（核验于 2026-08-24）
- 本机注意：`docker compose exec` 不带 `-T` 会吞管道 stdin，喂脚本一律加 `-T` 或走独立 .sh 文件
