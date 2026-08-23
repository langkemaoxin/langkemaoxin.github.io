---
title: "可控 Agent 体系：事前-事中-事后"
sidebarGroup: "阶段 4 · Harness 工程"
shortTitle: "05 可控 Agent 体系"
order: 5
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "Agent 工程"
description: "【占位待学】可控 Agent 体系：事前-事中-事后——对应总纲阶段 4 · 单元 4.5。学完本篇应能：Agent 具备三段式防线各至少一项"
---

> **AICon 2026 学习系列 · 阶段 4 · Harness 工程 · 第 26/43 篇 · 🚧 占位待学**
> 上一篇：[《Agent 安全攻防：间接注入与最小权限》](/Ai/4-harness/harness-04-agent-security)
> 下一篇：[《推理两阶段：prefill 算得快，decode 取得慢》](/Ai/5-inference-infra/inference-infra-01-prefill-decode)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 4 · 单元 4.5**

## 一、本文要解决的问题

企业敢用 Agent 的前提是「可控」：事前限权、事中审批熔断、事后审计回放。腾讯 AICon 议题把它叫做 Loop Engineering——这是 Harness 阶段的收官，也是「企业级 Harness」专题的完整拼图。

## 二、知识点清单

- 事前：权限清单、数据边界、模型与工具白名单
- 事中：高危动作审批、预算熔断（步数 / 成本 / 时长）、人工接管点
- 事后：全量审计日志、回放重演、责任归因
- 环境分级：开发 / 测试 / 生产对 Agent 权限的不同敞口
- AICon 对照：《Loop Engineering：事前-事中-事后架构》《企业级可控 Agent 体系》《企业级 Harness Engineering 实践》

## 三、动手实验（学习时必须真跑）

- 按三段式重构阶段 3 的 Agent：至少加一个审批点、一个熔断器、一套审计日志
- 对照去哪儿《企业级 Harness Engineering》议题摘要自查清单

## 四、验收标准（全部通过才进入下一篇）

- [ ] Agent 具备三段式防线各至少一项
- [ ] 写出自己 Agent 的威胁模型清单

## 五、阶段验收（本篇是阶段 4收尾篇）

- [ ] Agent 升级到「敢给真实同事用」：评测集 + trace + 权限边界 + 审批点 + 威胁模型清单

## 六、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
