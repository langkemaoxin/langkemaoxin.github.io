---
title: "扩容路线图：Rollup-centric、blobs 与 PeerDAS"
sidebarGroup: "共识与扩容"
shortTitle: "02 扩容路线图"
order: 2
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Layer2"
  - "扩容"
description: "【占位待学】扩容路线图：Rollup-centric、blobs 与 PeerDAS——对应总纲阶段 8 · 单元 8.2。学完本篇应能：能解释「为什么 L1 只需保证数据可用而非执行」"
---

> **Web3 区块链系列 · 阶段 8 · 共识与扩容 · 第 49/57 篇 · 🚧 占位待学**
> 上一篇：[《PoS 共识：验证者、罚没与 Gasper》](/web3区块链/08-l2/l2-01-pos-consensus)
> 下一篇：[《Optimistic Rollup 与 OP Stack 实操》](/web3区块链/08-l2/l2-03-optimistic-rollup)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 8 · 单元 8.2**

## 一、本文要解决的问题

以太坊不自己扩容执行，而是把执行外包给 L2、自己专注做「数据可用性」——blobs（EIP-4844）与 Fusaka 的 PeerDAS 是怎么一步步走到今天的？Glamsterdam 又要带来什么？

## 二、知识点清单

- 扩容三板斧的取舍：更大区块 / 分片执行 / rollup-centric 路线
- 数据可用性问题：L1 只需保证「数据可取」而非「亲自执行」
- EIP-4844（Dencun，2024-03）：proto-danksharding、blob 独立费用市场
- Fusaka（2025-12 上线）：PeerDAS 与 blob 吞吐提升
- Glamsterdam（目标 2026 Q3-Q4）：ePBS / BALs / 并行执行展望
- danksharding 终局图景（了解）

## 三、动手实验（学习时必须真跑）

- 查历史数据对比同一 L2 在 EIP-4844 前后的单笔成本变化
- 查当前 blob 目标数/费用并解读对 L2 成本的影响

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能解释「为什么 L1 只需保证数据可用而非执行」
- [ ] 能画出 rollup-centric 的分层架构图

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
