---
title: Rootless 模式——不给 root 也能跑 Docker
sidebarGroup: Docker 系列
shortTitle: 26 Rootless 模式
order: 26
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - 安全
description: 无 root 跑 dockerd：subuid/subgid 与 UID/GID 映射、rootless 网络栈（gvisor-tap-vsock 已成默认）、与 rootful 的功能边界、共享宿主机场景的加固选型。对应学习总纲阶段 7 单元 7.2。
---

> **Docker 系列 · 第 26/33 篇**
> 上一篇：[《容器安全——同一个容器，从 --privileged 全裸滚到最小权限》](/云原生/docker/docker-25-container-security) · 下一篇：[《容器日志与监控——盯住同一个容器，从 logs 第一行滚到磁盘账单》](/云原生/docker/docker-27-logging-monitoring)

---

> 🚧 **本文撰写中（占位文件）**
> 本篇是[学习总纲](./docker-00-roadmap.md)阶段 7（生产化：安全、日志、Daemon 运维）的缺口篇目，编号已排入学习路线；正文按下述大纲撰写。**本篇不阻塞主线**——第 25 篇容器安全的前置知识（capabilities/user namespace）先行。

## 这一篇要解决什么问题

第 25 篇把容器内的权限锁到了最小，但 daemon 本身还是以 root 跑的：**拿到 root 的 dockerd 等于拿到整台机器**（想想多少 CI 把 `docker.sock` 直接挂进容器）。共享服务器、公共 CI 节点、多人实验环境里，正确的姿势是让整个 Docker 栈——daemon、容器运行时、网络——**一个 root 进程都没有**：这就是 rootless 模式。

## 计划覆盖的知识单元（西蒙学习法拆解）

| 单元 | 回答的核心问题 | 动手实验（撰写时必须真跑） | 吃透的标准 |
|------|----------------|--------------------------|------------|
| 26.1 用户命名空间回炉 | 容器里的 root 为什么可以不是宿主机的 root？ | 复查 user namespace remap：subuid/subgid 文件、`docker info` 的 userns 配置 | 说清 UID 映射链：容器 root → 中间区间 → 普通用户 |
| 26.2 rootless 安装 | 不给 root 怎么起 dockerd？ | `dockerd-rootless-setuptool.sh install` 全程实操；前后 `ps` 对比进程属主 | 说清 rootless daemon 监听的 socket 路径差异与 `DOCKER_HOST` |
| 26.3 rootless 网络栈 | 没有 root 配不了 iptables，容器怎么出网？ | 观察 29.x 默认网络驱动（gvisor-tap-vsock，29.5 起取代 slirp4netns）；容器 ping 外网验证 | 说清 rootless 网络是用户态代理、性能代价在哪一跳 |
| 26.4 功能边界 | rootless 什么干不了？ | 逐项实测：绑定 <1024 端口、挂载宿主目录权限、overlay 网络限制 | 给「共享宿主机」「公共 CI」场景开出选型处方 |
| 26.5 与 K8s 的接口 | rootless 思想在编排层怎么延续？ | 认脸：K8s 的 User Namespaces（v1.36 GA）与 rootless containerd | 说清「无 root 运行时」是 2026 安全基线的方向 |

## 与前后篇的关系

- 前置：第 25 篇容器安全（capabilities 分级）——本篇把「锁容器」升级为「锁整套栈」；
- 后续：第 28 篇 daemon 运维会把 rootless 纳入 daemon 配置全景复查。

## 官方资料锚点（撰写时以此为准，注意核验版本）

- [Rootless mode](https://docs.docker.com/engine/security/rootless/)——含 UID/GID mapping、Tips、Troubleshooting（核验于 2026-08-24）
- 版本事实：29.5（2025-05）起 rootless 默认网络驱动换为 `gvisor-tap-vsock`，slirp4netns 不再随包安装（29.x 发行注记）
