---
title: "DRA 与 GPU 调度：AI 时代的资源分配"
sidebarGroup: Kubernetes
shortTitle: 35 DRA 与 GPU
order: 35
date: 2026-08-24T00:00:00.000Z
category: "云原生"
tag:
  - "Kubernetes"
  - "云原生"
  - "K8s系列"
description: "【占位待学】DRA 与 GPU 调度——AI 时代的资源分配——对应总纲阶段 8 · 单元 8.7。学完本篇应能：说清「整卡独占 → 切分虚拟化 → DRA 拓扑感知」的演进线；用 DRA 写法申请 GPU 并理解它比 device plugin 先进在哪"
---

> **Kubernetes 系列 · 第 35/35 篇 · 🚧 占位待学**
> 上一篇：[《CRD 与 Operator 开发：把运维经验写成控制器》](/云原生/k8s/k8s-34-crd-operator)
> 全系列完结——回看[《K8s 学习总纲》](/云原生/k8s/k8s-00-roadmap)做资深自检
> 学习大纲：[《K8s 学习总纲》](/云原生/k8s/k8s-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：要解决的问题、知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 8 · 单元 8.7「DRA/GPU 调度」**

## 一、本文要解决的问题

2026 年 K8s 最热的用法是当 AI 平台的底座，而 AI 负载的核心矛盾是：**GPU 又贵又稀缺，默认调度器却只会「整卡分配」**——一个小推理服务独占一张 80G 卡是巨大的浪费。本篇梳理三代 GPU 分配方案的演进：device plugin（整卡独占）→ 第三方虚拟化（HAMi 等切卡方案）→ DRA 动态资源分配（v1.35 GA，按拓扑申请、按需共享），说清每一代解决了什么、又留下什么。

## 二、知识点清单

- 出发点：为什么 CPU/内存的调度模型（可压缩、可超卖）不适用于 GPU（独占设备、不可压缩）
- 第一代 device plugin：Extended Resource + NVIDIA device plugin 的工作方式与局限（整数卡、无拓扑、无共享）
- 第二代切卡虚拟化：HAMi 等方案的思路（显存/算力切分、vGPU）；为什么它是「外挂」而不是内核机制
- 第三代 DRA（Dynamic Resource Allocation，v1.35 GA）：ResourceClaim / ResourceClaimTemplate / DeviceClass 三件套
- DRA 的拓扑感知：NUMA/PCIe 亲和、驱动协商（DRA driver）——「让驱动参与分配决策」的设计转变
- scheduling Gates 与队列：AI 训练任务（Gang Scheduling 思想）为什么需要「要么全调度要么不调度」
- 生态现状：HAMi 与 DRA 的关系（HAMi-DRA）、Kueue 的定位（写作时核验）

## 三、动手实验（学习时必须真跑）

- 无 GPU 环境的替代实验：用 DRA 的通用示例（如官方 DRA 示例驱动或 kind 上的 CPU 模拟驱动）走通 ResourceClaim 流程
- 云 GPU（按小时租）：device plugin 整卡跑一个推理服务，观察 `nvidia.com/gpu` 的分配与显存利用率（浪费可视化）
- （可选）部署 HAMi 切同一张卡给两个 Pod，对比利用率变化
- 读一份 DRA Pod YAML：指出 ResourceClaimTemplate 在哪、拓扑约束在哪、与旧写法的差异

> ➡️ 全系列完结——回看[《K8s 学习总纲》](/云原生/k8s/k8s-00-roadmap)做资深自检

- [ ] 说清三代方案的演进线：每代解决什么问题、代价是什么
- [ ] 说清 DRA 三件套（ResourceClaim/Template/DeviceClass）各自的职责
- [ ] 解释「为什么 AI 训练需要 Gang 思想的调度」，以及 DRA 为什么比 device plugin 更适合 GPU

## 五、写作提示（补正文时遵守）

- 开篇问题驱动：从「一张 80G 卡跑一个 2G 显存的推理服务」的浪费切入
- 结构走「是什么 → 为什么 → 怎么做 → 背景知识」；三代方案对照表是主表
- 所有命令、YAML、输出必须先真跑再写入（无 GPU 时用文档声明的替代实验），不得杜撰
- 版本口径：DRA GA 于 v1.35、HAMi 生态快速演进——写作时核验 kubernetes.io 与 HAMi 仓库当前状态并标注时间
