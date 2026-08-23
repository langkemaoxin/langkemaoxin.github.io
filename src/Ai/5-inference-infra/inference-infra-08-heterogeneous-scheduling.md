---
title: "异构算力调度：从 HAMi 到 HAMi-DRA"
sidebarGroup: "阶段 5 · 推理与 AI Infra"
shortTitle: "08 异构算力调度"
order: 8
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "推理优化"
  - "实战"
  - "K8s"
description: "【占位待学】异构算力调度：从 HAMi 到 HAMi-DRA——对应总纲阶段 5 · 单元 5.8。学完本篇应能：说清「虚拟切卡解决了什么、DRA 又补了什么」"
---

> **AICon 2026 学习系列 · 阶段 5 · 推理与 AI Infra · 第 34/43 篇 · 🚧 占位待学**
> 上一篇：[《投机解码与 MoE：一眼对照》](/Ai/5-inference-infra/inference-infra-07-spec-decoding-moe)
> 下一篇：[《RL Infra 概念级：从 RLHF 到 Diffusion RL》](/Ai/5-inference-infra/inference-infra-09-rl-infra)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.8**

## 一、本文要解决的问题

一台机器 N 张卡、几种卡型，多个团队抢——GPU 的「虚拟化与调度」是 K8s 时代的资源管理新战场。HAMi 做虚拟切卡，K8s DRA 做动态资源分配，AICon 议题讲的是两者的合流。你的 K8s 功底在这里兑现。

## 二、知识点清单

- GPU 共享的三种粒度：整卡 / 时间片 / 显存切分（MIG 与 vGPU）
- HAMi：异构算力虚拟化中间层，统一纳管不同厂商卡，屏蔽差异
- K8s DRA（Dynamic Resource Allocation）：与 Device Plugin 的差异、版本现状
- HAMi-DRA：把 HAMi 的切分能力接到 DRA 框架上——两边优势的合并
- 调度之外的算力管理：拓扑亲和、池化与碎片整理

## 三、动手实验（学习时必须真跑）

- Kind/Minikube 起集群部署 HAMi，提交两个共享一张（假）GPU 的任务，观察切分与限额
- 读 AICon《从 HAMi 到 HAMi-DRA》议题摘要，写半页「DRA 补了 Device Plugin 的什么短板」

## 四、验收标准（全部通过才进入下一篇）

- [ ] 说清「虚拟切卡解决了什么、DRA 又补了什么」
- [ ] 亲手在 K8s 上跑通过 HAMi 的共享调度

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
