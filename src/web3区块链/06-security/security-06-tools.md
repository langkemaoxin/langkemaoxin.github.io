---
title: "工具链：Slither、fuzz 与形式化验证"
sidebarGroup: "安全攻防"
shortTitle: "06 安全工具链"
order: 6
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "安全"
description: "【占位待学】工具链：Slither、fuzz 与形式化验证——对应总纲阶段 6 · 单元 6.6。学完本篇应能：能配置一条本地安全扫描流水线"
---

> **Web3 区块链系列 · 阶段 6 · 安全攻防 · 第 38/57 篇 · 🚧 占位待学**
> 上一篇：[《MEV：抢跑、三明治与闪电贷攻击》](/web3区块链/06-security/security-05-mev)
> 下一篇：[《审计方法论：像审计师一样审查合约》](/web3区块链/06-security/security-07-audit-method)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 6 · 单元 6.6**

## 一、本文要解决的问题

人眼会累，机器不会。2026 年审计标配 = Slither 静态扫描 + Foundry fuzz/invariant + 人工复核；形式化验证在关键路径开始落地——工具的价值取决于你会不会读它的输出。

## 二、知识点清单

- Slither：检测器矩阵、常见误报与 triage 方法、自定义检测器（了解）
- echidna / medusa 与 Foundry invariant 的分工
- 形式化验证：Certora / Halmos 的能力边界——写规格比跑工具更难
- 依赖安全：npm 依赖投毒事件、lockfile 与供应链审查
- CI 集成：build → test → slither → fuzz 流水线
- 怎么读审计报告：severity 分级、PoC、修复验证

## 三、动手实验（学习时必须真跑）

- 用 Slither 扫自己阶段 3~5 的全部合约，逐条修复或豁免告警
- 给众筹合约写一份 echidna/Halmos 规格并跑通
- 读一份社区公开审计报告并做笔记

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能配置一条本地安全扫描流水线
- [ ] 能读懂公开审计报告并复现其中的 PoC

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
