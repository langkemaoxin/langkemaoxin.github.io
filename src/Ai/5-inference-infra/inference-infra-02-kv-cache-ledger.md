---
title: "KV cache 账本：显存为什么是瓶颈"
sidebarGroup: "阶段 5 · 推理与 AI Infra"
shortTitle: "02 KV cache 账本"
order: 2
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "推理优化"
description: "【占位待学】KV cache 账本：显存为什么是瓶颈——对应总纲阶段 5 · 单元 5.2。学完本篇应能：三笔账算对（数量级）"
---

> **AICon 2026 学习系列 · 阶段 5 · 推理与 AI Infra · 第 28/43 篇 · 🚧 占位待学**
> 上一篇：[《推理两阶段：prefill 算得快，decode 取得慢》](/Ai/5-inference-infra/inference-infra-01-prefill-decode)
> 下一篇：[《PagedAttention 与 Continuous Batching：vLLM 的两板斧》](/Ai/5-inference-infra/inference-infra-03-paged-attention)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.2**

## 一、本文要解决的问题

「上下文 100 万 token」「并发 100 路」——这些数字最后都变成同一句话：显存不够。亲手算一遍 KV cache 的账，长上下文与高并发的困难立刻物理化。

## 二、知识点清单

- KV cache 体积公式：2 × 层数 × KV 头数 × 头维度 × 序列长度 × 精度字节
- 用一个 7B 级模型（GQA 结构）手算 32k 上下文单路要多少显存
- 批次的乘法效应：100 路并发 = 100 份 KV cache
- 模型权重 vs KV cache vs 激活的显存三分账
- 由此推出两条优化路：省 KV（GQA / 线性注意力）与换地方（卸载 / 分离）

## 三、动手实验（学习时必须真跑）

- 手算三笔账：32k 单路 / 8k × 100 路 / 1M 单路各需多少 KV 显存，与单卡 80G 对照
- 读 AICon《面向 Qwen 系列模型线性注意力的高性能优化实践》摘要，对照它省的正是这笔账

## 四、验收标准（全部通过才进入下一篇）

- [ ] 三笔账算对（数量级）
- [ ] 说清「长上下文与高并发本质是同一堵墙：KV cache 显存」

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
