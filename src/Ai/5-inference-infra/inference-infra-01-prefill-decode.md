---
title: "推理两阶段：prefill 算得快，decode 取得慢"
sidebarGroup: "阶段 5 · 推理与 AI Infra"
shortTitle: "01 推理两阶段"
order: 1
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "推理优化"
  - "实战"
  - "vLLM"
description: "【占位待学】推理两阶段：prefill 算得快，decode 取得慢——对应总纲阶段 5 · 单元 5.1。学完本篇应能：能说清「首 token 慢与后续 token 慢是两种病」各自卡在哪"
---

> **AICon 2026 学习系列 · 阶段 5 · 推理与 AI Infra · 第 27/43 篇 · 🚧 占位待学**
> 上一篇：[《可控 Agent 体系：事前-事中-事后》](/Ai/4-harness/harness-05-controllable-agent)
> 下一篇：[《KV cache 账本：显存为什么是瓶颈》](/Ai/5-inference-infra/inference-infra-02-kv-cache-ledger)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.1**

## 一、本文要解决的问题

为什么大模型回答是「一个字一个字蹦」的？为什么首字要等半天、后面反而快？prefill 与 decode 一算力密集、一访存密集——这是所有推理优化的出发点，也是听懂 TTFT/TPOT 类议题的钥匙。

## 二、知识点清单

- prefill：整段输入并行计算，产出 KV cache，算力密集（一次搞定）
- decode：逐 token 生成，每步都读 KV cache，访存密集（内存带宽是瓶颈）
- 两个关键指标：TTFT（首 token 时延）与 TPOT（每 token 时延）
- 「算力 bound vs 访存 bound」的 roofline 直觉
- 两阶段瓶颈不同 → 优化手段完全不同（后面单元逐个展开）

## 三、动手实验（学习时必须真跑）

- vLLM 起本地服务（小模型即可），压测并发 1/4/16 三档，记录 TTFT 与 TPOT 曲线
- 输入长度从 100 拉到 8000 token，观察 TTFT 怎么涨、TPOT 为什么几乎不动

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能说清「首 token 慢与后续 token 慢是两种病」各自卡在哪
- [ ] 有一张自己压测出来的并发-延迟曲线

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
