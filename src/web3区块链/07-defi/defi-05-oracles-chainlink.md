---
title: "预言机：Chainlink 价格喂送实操"
sidebarGroup: "DeFi 协议"
shortTitle: "05 预言机"
order: 5
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "DeFi"
description: "【占位待学】预言机：Chainlink 价格喂送实操——对应总纲阶段 7 · 单元 7.5。学完本篇应能：能写出安全的价格读取合约并解释每个检查防什么"
---

> **Web3 区块链系列 · 阶段 7 · DeFi 协议 · 第 44/57 篇 · 🚧 占位待学**
> 上一篇：[《稳定币三形态与监管（GENIUS Act 时代）》](/web3区块链/07-defi/defi-04-stablecoins)
> 下一篇：[《质押与再质押：从 ETH Staking 到 EigenLayer》](/web3区块链/07-defi/defi-06-staking-restaking)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 7 · 单元 7.5**

## 一、本文要解决的问题

链是封闭世界，外部价格怎么进来？Chainlink 的去中心化喂价网络是 DeFi 的隐形基础设施，也是安全篇「预言机操纵」的正面教材。

## 二、知识点清单

- 为什么链上拿不到链下价格：EVM 无 I/O、无网络
- Chainlink 聚合流程：节点采集 → 中位数聚合 → 链上 Aggregator 合约
- 正确读取：latestRoundData 的 roundId / updatedAt / answeredInRound 与 stale 检查
- TWAP（AMM 内生价）vs 聚合价的适用场景对比
- Data Streams 低延迟方案（了解）
- VRF：链上可验证随机数

## 三、动手实验（学习时必须真跑）

- 在测试网/主网用 cast 与 Solidity 读取 ETH/USD 价格 feed
- 写一个带 stale 与 deviation 检查的安全价格读取合约

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能写出安全的价格读取合约并解释每个检查防什么
- [ ] 能对比 TWAP 与聚合价的取舍

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
