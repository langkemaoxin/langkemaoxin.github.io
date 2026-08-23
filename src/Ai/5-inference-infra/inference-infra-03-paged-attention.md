---
title: "PagedAttention 与 Continuous Batching：vLLM 的两板斧"
sidebarGroup: "阶段 5 · 推理与 AI Infra"
shortTitle: "03 PagedAttention"
order: 3
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "推理优化"
description: "【占位待学】PagedAttention 与 Continuous Batching：vLLM 的两板斧——对应总纲阶段 5 · 单元 5.3。学完本篇应能：能说清「碎片」和「批内等待」分别怎么被解决、各自借鉴了什么 OS 思想"
---

> **AICon 2026 学习系列 · 阶段 5 · 推理与 AI Infra · 第 29/43 篇 · 🚧 占位待学**
> 上一篇：[《KV cache 账本：显存为什么是瓶颈》](/Ai/5-inference-infra/inference-infra-02-kv-cache-ledger)
> 下一篇：[《前缀复用：SGLang RadixAttention 与缓存命中》](/Ai/5-inference-infra/inference-infra-04-prefix-cache)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.3**

## 一、本文要解决的问题

vLLM 为什么成了事实标准？两板斧：PagedAttention 治显存碎片，continuous batching 治批内等待。操作系统课的虚拟内存与调度，在大模型推理里重演。

## 二、知识点清单

- 显存碎片与预留浪费：按最大长度预留 KV 空间的浪费率
- PagedAttention：KV cache 分页管理（借鉴 OS 虚拟内存），按需分配、近乎零碎片
- static batching 的问题：批内短请求等长请求，整批占用
- continuous batching：步级调度，完成即退出、新请求即插入
- 吞吐提升的数量级与适用场景（高并发短请求收益最大）

## 三、动手实验（学习时必须真跑）

- 精读 vLLM 论文（Efficient Memory Management for LLM Serving with PagedAttention）前两节
- 同一负载对比关闭与开启 continuous batching 的吞吐差异（vLLM 参数实验或文档数据）

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能说清「碎片」和「批内等待」分别怎么被解决、各自借鉴了什么 OS 思想

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
