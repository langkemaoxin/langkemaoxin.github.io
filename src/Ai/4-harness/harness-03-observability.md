---
title: "可观测性：多步执行的调用树"
sidebarGroup: "阶段 4 · Harness 工程"
shortTitle: "03 可观测性"
order: 3
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "Agent 工程"
description: "【占位待学】可观测性：多步执行的调用树——对应总纲阶段 4 · 单元 4.3。学完本篇应能：亲手产出过一张 Agent 调用树，并能用它定位一次失败"
---

> **AICon 2026 学习系列 · 阶段 4 · Harness 工程 · 第 24/43 篇 · 🚧 占位待学**
> 上一篇：[《评测（Evals）：Agent 的测试工程》](/Ai/4-harness/harness-02-evals)
> 下一篇：[《Agent 安全攻防：间接注入与最小权限》](/Ai/4-harness/harness-04-agent-security)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 4 · 单元 4.3**

## 一、本文要解决的问题

Agent 十步走完炸了，是模型蠢、工具烂还是 prompt 歪？没有 trace 就只能猜。把一次多步执行的全部调用树打出来，失败定位从玄学变成看图说话。

## 二、知识点清单

- 追踪单位：一次 run → N 个 step → 每步的输入 / 输出 / 耗时 / token
- 观测三大件在 Agent 场景的变体：trace（调用树）、metrics（成功率 / 步数 / 成本）、logs（原始输入输出）
- 工具：OpenTelemetry GenAI 语义约定 / Langfuse 类平台 / Spring AI Observability
- 成本观测：每次 run 的 token 与钱

## 三、动手实验（学习时必须真跑）

- 给 Agent 全链路加 trace，把一次多步执行打印成树
- 找一次失败 run，指着调用树说出「这次失败在工具选择，不在模型」

## 四、验收标准（全部通过才进入下一篇）

- [ ] 亲手产出过一张 Agent 调用树，并能用它定位一次失败

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
