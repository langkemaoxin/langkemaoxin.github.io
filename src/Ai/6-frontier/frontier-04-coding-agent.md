---
title: "Coding Agent 与研发范式：AI 吃掉 SDLC"
sidebarGroup: "阶段 6 · 前沿扫描"
shortTitle: "04 Coding Agent"
order: 4
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "前沿"
description: "【占位待学】Coding Agent 与研发范式：AI 吃掉 SDLC——对应总纲阶段 6 · 单元 6.4。学完本篇应能：有一份自己的 Coding Agent 使用复盘"
---

> **AICon 2026 学习系列 · 阶段 6 · 前沿扫描 · 第 39/43 篇 · 🚧 占位待学**
> 上一篇：[《端侧智能与超级 App：端云协同》](/Ai/6-frontier/frontier-03-edge-superapp)
> 下一篇：[《商业与组织：超级个体、蜂群与增长》](/Ai/6-frontier/frontier-05-business-org)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 6 · 单元 6.4**

## 一、本文要解决的问题

你天天用的 Claude Code / Copilot 就是 AICon「研发新范式」专题的主角。从 autocomplete 到独立领任务的 Agent，再到重造整个 SDLC——这场变革卡在质量与规模化两道坎上。

## 二、知识点清单

- Coding Agent 的构成：模型 + 仓库上下文 + 工具（读写文件 / 跑命令 / 搜索）+ 循环——阶段 3 全部知识的合体
- scaffold 工程：仓库地图、规则文件（CLAUDE.md 类）、任务拆解
- 评测：SWE-bench 类基准在测什么（真实 issue 修复率）
- AI Native SDLC：需求 → 设计 → 编码 → 测试 → 发布的全流程重构；人机分工点
- 规模化双困局：流程（评审与质量门怎么设）与成本（token 经济学）

## 三、动手实验（学习时必须真跑）

- 用 Claude Code 完成一个真实小任务（一个 bug 修复或小功能），全程记录：它哪步神勇、哪步翻车、你补了什么
- 写一份复盘：哪些环节你选择接管、依据什么信号
- 读 AICon《从 AI Coding 到 AI Native SDLC》《跨越 Coding Agent 规模化后的流程与成本双困局》议题摘要

## 四、验收标准（全部通过才进入下一篇）

- [ ] 有一份自己的 Coding Agent 使用复盘
- [ ] 能说清 SWE-bench 在测什么、规模化困局指哪两件事

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
