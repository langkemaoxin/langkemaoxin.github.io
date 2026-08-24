---
title: buildx 与多平台构建——从一个镜像滚到 amd64+arm64 双架构
sidebarGroup: Docker 系列
shortTitle: 11 buildx 与 Bake
order: 11
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - 镜像
  - 构建加速
description: buildx 建 builder、QEMU 跨架构、amd64+arm64 双平台一次构建、--secret 挂构建期密钥、Bake 编排式构建、构建缓存后端与 attestations 认脸。对应学习总纲阶段 2 单元 2.4/2.6。
---

> **Docker 系列 · 第 11/33 篇**
> 上一篇：[《构建进阶——同一个镜像从 1.44GB 滚到 20MB》](/云原生/docker/docker-10-build-advanced) · 下一篇：[《Harbor 私有镜像仓库——从检查环境到浏览器能登录》](/云原生/docker/docker-12-harbor)

---

> 🚧 **本文撰写中（占位文件）**
> 本篇是[学习总纲](./docker-00-roadmap.md)阶段 2（交付：Dockerfile 与构建体系）的缺口篇目，编号已排入学习路线；正文按下述大纲撰写。**本篇不阻塞主线**——多阶段构建（第 10 篇）与镜像分发（第 12 篇）可先行。

## 这一篇要解决什么问题

你打的镜像在 x86 服务器上跑得好好的，同事用 Apple Silicon（arm64）的笔记本 `docker pull` 下来一跑——`exec format error`。ARM 服务器、国产化芯片、M 系列 Mac 已经是日常，**一个镜像只打一个架构，交付就是瘸的**。

顺带的第二个问题：CI 里十几个 Dockerfile 各自 `docker build`，重复参数、重复缓存配置、没有统一入口——官方的答案是 **Bake**（编排式构建，`docker buildx bake`，28.1 起还有 `docker bake` 别名）。

## 计划覆盖的知识单元（西蒙学习法拆解）

| 单元 | 回答的核心问题 | 动手实验（撰写时必须真跑） | 吃透的标准 |
|------|----------------|--------------------------|------------|
| 11.1 BuildKit 时代 | 23.0 起默认构建器早已换人，buildx 与它什么关系？ | 对比经典构建器与 BuildKit 输出；`docker buildx ls` 看清 builder 与平台 | 说清 BuildKit（引擎）/ buildx（CLI 驱动）/ bake（编排）三层关系 |
| 11.2 多平台构建 | 一条命令怎么同时出 amd64+arm64 两个镜像？ | 装 buildx 插件 + QEMU；`--platform linux/amd64,linux/arm64` 构建 nginx 变体；`imagetools inspect` 验证 manifest list | 说清 manifest list 是什么、QEMU 模拟的代价（慢）、原生节点的取舍 |
| 11.3 构建期密钥 | `ARG` 传密码会留在镜像层历史里，怎么办？ | `--secret` 挂私钥拉私有依赖，构建后 `docker history` 验证不落盘 | 说清 secret 与 ARG/ENV 的本质区别（不进层、不进历史） |
| 11.4 Bake | 十几个镜像变体怎么一份配置管完？ | 写最小 docker-bake.hcl：两个 target + 公共变量；对比 shell 循环 build 的写法 | 说清 target/variable/inheritance 三件套；从 Compose 文件 bake 也认脸 |
| 11.5 缓存后端 | CI 每次全量构建 20 分钟怎么破？ | registry 缓存后端推拉各跑一次对比耗时；GHA 缓存认脸 | 知道 local/registry/GHA 三种后端各适用什么环境 |
| 11.6 构建元数据认脸 | 镜像能带「出生证明」吗？ | 带 SBOM + provenance 构建一次，`imagetools inspect` 看到 attestations | 认脸级：SBOM/SLSA 是第 30 篇供应链安全的地基 |

## 与前后篇的关系

- 前置：第 9 篇 Dockerfile 基本功、第 10 篇多阶段构建与缓存——本篇直接在它们之上换构建器、扩平台；
- 后续：第 30 篇供应链安全会回来深挖 attestations（本篇只认脸）。

## 官方资料锚点（撰写时以此为准，注意核验版本）

- [Docker Build 手册](https://docs.docker.com/build/)——Building / Builders / Bake / Cache / Metadata 五大板块（核验于 2026-08-24）
- [多平台构建](https://docs.docker.com/build/building/multi-platform/)
- [Bake](https://docs.docker.com/build/bake/)——含从 Compose 文件构建
- 本机注意：当前 WSL 实验环境**未装 buildx 插件**（apt 装 `docker-buildx-plugin` 后 `docker build` 才走 BuildKit 链路；`docker compose build` 不受影响），撰写时先装再跑
