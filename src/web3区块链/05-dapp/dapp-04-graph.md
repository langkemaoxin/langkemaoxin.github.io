---
title: "链上数据与 The Graph 子图"
sidebarGroup: "DApp 全栈"
shortTitle: "04 子图索引"
order: 4
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "DApp"
  - "前端"
description: "【占位待学】链上数据与 The Graph 子图——对应总纲阶段 5 · 单元 5.4。学完本篇应能：能独立完成「合约加事件 → 子图索引 → GraphQL 查询」全链路"
---

> **Web3 区块链系列 · 阶段 5 · DApp 全栈 · 第 31/57 篇 · 🚧 占位待学**
> 上一篇：[《DApp 前端实战：从 0 到 1 一个完整应用》](/web3区块链/05-dapp/dapp-03-frontend-dapp)
> 下一篇：[《去中心化存储：IPFS 与 Arweave》](/web3区块链/05-dapp/dapp-05-storage)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.4**

## 一、本文要解决的问题

「这个地址的全部历史交易」「全平台 NFT 持有分布」这类查询为什么不能靠 RPC 直接做？事件日志 + 索引器 = 链上数据库——The Graph 是这套范式的标准答案。

## 二、知识点清单

- 事件日志结构与 eth_getLogs 的过滤参数（地址/主题/区块范围）
- eth_getLogs 的局限：无聚合、无分页语义、性能差
- The Graph：subgraph.yaml 清单、schema.graphql 实体建模
- mapping handler：把事件映射成实体写入索引库
- GraphQL 查询：过滤、排序、分页
- 本地 graph-node + anvil 的开发流程与部署选择

## 三、动手实验（学习时必须真跑）

- 为众筹合约写一个子图：索引所有参与事件
- 用 GraphQL 查询「某地址全部参与记录」与「金额 Top10」

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能独立完成「合约加事件 → 子图索引 → GraphQL 查询」全链路

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
