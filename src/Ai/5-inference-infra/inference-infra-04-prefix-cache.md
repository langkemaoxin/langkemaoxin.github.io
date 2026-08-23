---
title: "前缀复用：SGLang RadixAttention 与缓存命中"
sidebarGroup: "阶段 5 · 推理与 AI Infra"
shortTitle: "04 前缀复用"
order: 4
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "推理优化"
  - "实战"
  - "SGLang"
description: "【占位待学】前缀复用：SGLang RadixAttention 与缓存命中——对应总纲阶段 5 · 单元 5.4。学完本篇应能：说清「树结构缓存命中 = 相同前缀只算一次」"
---

> **AICon 2026 学习系列 · 阶段 5 · 推理与 AI Infra · 第 30/43 篇 · 🚧 占位待学**
> 上一篇：[《PagedAttention 与 Continuous Batching：vLLM 的两板斧》](/Ai/5-inference-infra/inference-infra-03-paged-attention)
> 下一篇：[《长上下文与 PD 分离：百万 token 的工程》](/Ai/5-inference-infra/inference-infra-05-long-context-pd)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.4**

## 一、本文要解决的问题

一百个用户的对话共享同一段超长系统提示，这段的 KV 每人重算一遍？RadixAttention 用一棵基数树把「相同前缀只算一次」变成自动——多轮对话与 Agent 场景的吞吐倍增器。

## 二、知识点清单

- 前缀 KV 复用的前提：相同 token 前缀 → 相同 KV（确定性计算）
- RadixAttention：基数树组织历史前缀，自动匹配最长可复用前缀
- 命中场景：多轮对话（历史逐轮复用）、共享 system prompt、Agent 循环（每步重发上下文）
- 缓存淘汰：LRU 与容量压力；命中率与延迟 / 吞吐的关系
- 对照 AICon《百万上下文下的 DeepSeek V4：SGLang 推理优化实战》的复用思路

## 三、动手实验（学习时必须真跑）

- 多轮对话压测：观察前缀缓存命中率随轮数的上升与延迟下降（SGLang 或 vLLM 的 prefix caching 均可）
- 共享长 system prompt 的并发场景，对比开关缓存的效果

## 四、验收标准（全部通过才进入下一篇）

- [ ] 说清「树结构缓存命中 = 相同前缀只算一次」
- [ ] 有自己的命中率-延迟对照数据

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
