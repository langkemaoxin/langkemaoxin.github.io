---
title: Swarm 多机编排——从一台 docker run 滚到一个小集群
sidebarGroup: Docker 系列
shortTitle: 29 Swarm 多机编排
order: 29
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Swarm
  - 集群
description: swarm init/join 建集群、service 与 stack 声明式部署、routing mesh 路由网格、overlay 跨主机组网、Raft 一致性、滚动更新与扩缩——单机到多机的最平滑跳板，也是理解 K8s 赢在哪的对照组。对应学习总纲阶段 8 单元 8.1。
---

> **Docker 系列 · 第 29/33 篇**
> 上一篇：[《Daemon 运维——从重启容器全灭滚到升级不断业务》](/云原生/docker/docker-28-daemon-ops) · 下一篇：[《镜像供应链安全——从随手 pull 滚到扫描、签名与加固镜像》](/云原生/docker/docker-30-supply-chain)

---

> 🚧 **本文撰写中（占位文件）**
> 本篇是[学习总纲](./docker-00-roadmap.md)阶段 8（深水区与毕业）的缺口篇目，编号已排入学习路线；正文按下述大纲撰写。**本篇不阻塞主线**——它是深水区第一站，主线阶段 0~7 学完再来。

## 这一篇要解决什么问题

前 28 篇所有实验都在一台机器上。但「Web 挂了自动在另一台拉起」「三台机器分担流量」这类需求，单机 Docker 给不了。Swarm 是**装在 Docker 里的多机方案**——不用装任何新东西，`docker swarm init` 一条命令集群就来了。

它同时是最好的教具：service/滚动更新/服务发现这些概念与 K8s 同构，在 Swarm 里用三条命令就能看清机制，再去 K8s 就不是从零开始。

## 计划覆盖的知识单元（西蒙学习法拆解）

| 单元 | 回答的核心问题 | 动手实验（撰写时必须真跑） | 吃透的标准 |
|------|----------------|--------------------------|------------|
| 29.1 集群组建 | 多台 docker 主机怎么变成一个整体？ | 三节点实验场（WSL 多实例或云虚机）：`swarm init` + `join`；manager/worker 角色 | 说清管理节点与工作节点的分工、为什么奇数个 manager |
| 29.2 service 声明式部署 | 「我要 3 个副本」谁负责变成现实？ | `service create --replicas 3`；故意杀掉一个副本观察自愈；`--limit-cpu/mem` 限额 | 说清「期望状态 + 协调循环」——与第 16 篇 Compose 的单机版思想接上 |
| 29.3 routing mesh | 任意节点 IP 都能访问服务，流量怎么走？ | 对 published port 抓包/抓进程，理解 ingress 网络的负载均衡 | 说清「入口任意节点 → 转发到运行副本的节点」两级跳 |
| 29.4 overlay 网络 | 跨主机的容器怎么像在同一网段？ | 两个主机上的容器互 ping（overlay 网络），对比 bridge 的边界 | 说清 VXLAN 封装直觉 + 与第 15 篇单机网络的边界 |
| 29.5 滚动更新与扩缩 | 发版怎么不停机？ | `service update --image` 滚动更新全程盯 `service ls/ps`；`scale` 扩缩 | 说清 parallelism/failure_action 这些参数换来了什么 |
| 29.6 stack 与配置分发 | Compose 文件能直接上集群吗？ | 第 16 篇的 compose.yaml 改造成 stack 文件 `docker stack deploy` | 说清 compose 与 stack 字段的分界（deploy 段在单机与集群的生效差异） |
| 29.7 Raft 与 secrets | 管理状态存哪？怎么不死机？ | 认脸：Raft 一致性、`docker secret` 加密分发；manager 容错实验（关一个） | 说清「为什么 3 节点容忍 1 个故障」的数学 |
| 29.8 Swarm vs K8s | 市场为什么选了 K8s？ | 概念对照表：service↔Deployment、stack↔Helm、routing mesh↔Service | 给「什么时候 Swarm 够用、什么时候必须 K8s」开出判断框 |

## 与前后篇的关系

- 前置：第 15 篇网络（overlay 是它的跨机延伸）、第 16 篇 Compose（stack 的语法底座）；
- 后续：[K8s 学习总纲](/云原生/k8s/k8s-00-roadmap)——把本篇的概念同构表带过去，阶段 1~5 会轻松一半。

## 官方资料锚点（撰写时以此为准，注意核验版本）

- [Swarm mode 手册](https://docs.docker.com/engine/swarm/)——Getting started / How swarm works / 管理维护全套（核验于 2026-08-24）
- 实验场复用：本博客 WSL 多容器组集群的既有经验（RabbitMQ 三节点集群篇的节点名/保活/重启策略坑同样适用）
