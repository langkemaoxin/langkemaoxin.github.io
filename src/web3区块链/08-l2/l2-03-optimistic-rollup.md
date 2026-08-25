---
title: "Optimistic Rollup 与 OP Stack 实操"
sidebarGroup: "共识与扩容"
shortTitle: "03 Optimistic Rollup"
order: 3
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Layer2"
  - "扩容"
  - "实战"
description: "【占位待学】Optimistic Rollup 与 OP Stack 实操——对应总纲阶段 8 · 单元 8.3。学完本篇应能：能解释欺诈证明为什么只需要「一个诚实参与者」"
---

> **Web3 区块链系列 · 阶段 8 · 共识与扩容 · 第 50/57 篇 · 🚧 占位待学**
> 上一篇：[《扩容路线图：Rollup-centric、blobs 与 PeerDAS》](/web3区块链/08-l2/l2-02-scaling-roadmap)
> 下一篇：[《ZK Rollup：零知识证明与有效性证明》](/web3区块链/08-l2/l2-04-zk-rollup)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 8 · 单元 8.3**

## 一、本文要解决的问题

OP Stack 成了发 L2 的标准模板（Base 就是它）——乐观 Rollup 凭什么「先执行、后挑战」？七天挑战期又是怎么回事？亲手把合约部署到 OP 测试网。

## 二、知识点清单

- Optimistic Rollup 原理：排序器 → 批量提交 L1 → 挑战期 → 欺诈证明
- 七日挑战期与提款体验（为什么快充桥有市场）
- OP Stack 模块化：execution / derivation / settlement 分层
- Superchain：共享标准的一族链
- Stage 0/1/2 去中心化分级（L2BEAT；Base/Arbitrum/OP 已达 Stage 1，2026-01 核验）
- 排序器中心化风险与强制 inclusion 逃生舱

## 三、动手实验（学习时必须真跑）

- 把众筹合约部署到 OP Sepolia 并完成一笔 L1→L2 测试网桥操作
- 在 L2BEAT 查一条链的 Stage 与风险评级并写解读

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能解释欺诈证明为什么只需要「一个诚实参与者」
- [ ] 能读懂 L2BEAT 的风险评估表

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
