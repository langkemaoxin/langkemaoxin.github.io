---
title: "长上下文与 PD 分离：百万 token 的工程"
sidebarGroup: "阶段 5 · 推理与 AI Infra"
shortTitle: "05 长上下文与 PD"
order: 5
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "推理优化"
description: "【占位待学】长上下文与 PD 分离：百万 token 的工程——对应总纲阶段 5 · 单元 5.5。学完本篇应能：说清「为什么 prefill 和 decode 拆到不同机器」"
---

> **AICon 2026 学习系列 · 阶段 5 · 推理与 AI Infra · 第 31/43 篇 · 🚧 占位待学**
> 上一篇：[《前缀复用：SGLang RadixAttention 与缓存命中》](/Ai/5-inference-infra/inference-infra-04-prefix-cache)
> 下一篇：[《量化：拿精度换显存和吞吐》](/Ai/5-inference-infra/inference-infra-06-quantization)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.5**

## 一、本文要解决的问题

上下文冲到百万 token，prefill 的算力海啸和 decode 的显存长尾把一台机器撕成两半——干脆拆开：prefill 机器管算，decode 机器管存。PD 分离是近两年推理架构的主旋律。

## 二、知识点清单

- 长上下文的三重压力：prefill 计算量、KV cache 显存、注意力复杂度
- PD 分离（disaggregation）：prefill 池与 decode 池分离，各自专用硬件
- KV 传输：两池之间的搬运（RDMA / 高速互联）成为新瓶颈
- KVCache 池化与「以存换算」的思想（Mooncake 类架构）
- 对照 AICon《百万上下文 DeepSeek V4》《Omni-Infer》议题的架构选择

## 三、动手实验（学习时必须真跑）

- 读《百万上下文下的 DeepSeek V4：SGLang 推理优化实战》议题详解，画出其架构图（标注 P 池 / D 池 / KV 流动方向）
- 纸面推演：1M token 请求进入 PD 分离集群的完整旅程

## 四、验收标准（全部通过才进入下一篇）

- [ ] 说清「为什么 prefill 和 decode 拆到不同机器」
- [ ] 能画出 PD 分离架构图并标注新瓶颈（KV 传输）

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
