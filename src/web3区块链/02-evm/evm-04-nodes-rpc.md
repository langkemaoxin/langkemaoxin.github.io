---
title: "节点与 JSON-RPC：亲手当一次客户端"
sidebarGroup: "以太坊核心"
shortTitle: "04 节点与 RPC"
order: 4
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "以太坊"
  - "EVM"
description: "【占位待学】节点与 JSON-RPC：亲手当一次客户端——对应总纲阶段 2 · 单元 2.4。学完本篇应能：能脱稿列出常用 RPC 方法并按读/写分类"
---

> **Web3 区块链系列 · 阶段 2 · 以太坊核心 · 第 13/57 篇 · 🚧 占位待学**
> 上一篇：[《EVM 执行模型与 Gas：逐条执行一笔交易》](/web3区块链/02-evm/evm-03-evm-gas)
> 下一篇：[《状态存储：MPT、RLP 与存储槽（了解级）》](/web3区块链/02-evm/evm-05-storage)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 2 · 单元 2.4**

## 一、本文要解决的问题

MetaMask 背后连的是谁的节点？eth_call 和 eth_sendRawTransaction 有什么本质区别？本地 anvil 与远程节点各适合什么场景？这一篇之后，你和链之间不再有中间商。

## 二、知识点清单

- 执行层客户端（Geth/Nethermind…）与共识层客户端的分工（The Merge 后）
- JSON-RPC 常用方法：eth_getBalance / eth_call / eth_sendRawTransaction / eth_getLogs / eth_blockNumber
- 读 vs 写的本质：状态查询不花 Gas、交易改变状态必须花 Gas
- RPC 提供商（Alchemy/Infura/公共 RPC）与速率限制
- 开发者网络谱系：anvil 本地链、Sepolia/Holesky 测试网、主网 fork

## 三、动手实验（学习时必须真跑）

- 用 cast 直接调 JSON-RPC 完成查余额、读合约、发交易三件事
- 用 anvil --fork-url 主网分叉，查询真实合约状态（如某 ERC-20 总量）

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能脱稿列出常用 RPC 方法并按读/写分类
- [ ] 能解释 MetaMask、RPC 节点、区块链三者的关系

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
