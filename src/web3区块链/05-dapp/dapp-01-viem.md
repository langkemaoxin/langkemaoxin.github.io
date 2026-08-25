---
title: "客户端 API：viem/ethers 与 JSON-RPC 封装"
sidebarGroup: "DApp 全栈"
shortTitle: "01 viem 客户端"
order: 1
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "DApp"
  - "前端"
description: "【占位待学】客户端 API：viem/ethers 与 JSON-RPC 封装——对应总纲阶段 5 · 单元 5.1。学完本篇应能：能独立用 viem 完成读 + 写全流程"
---

> **Web3 区块链系列 · 阶段 5 · DApp 全栈 · 第 28/57 篇 · 🚧 占位待学**
> 上一篇：[《合约工程模式：工厂、多签与时间锁》](/web3区块链/04-tokens/tokens-05-patterns)
> 下一篇：[《钱包连接：EIP-1193、EIP-6963 与多钱包》](/web3区块链/05-dapp/dapp-02-wallet-connect)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.1**

## 一、本文要解决的问题

前端怎么和链说话？viem（Wagmi 生态新一代，TypeScript 优先）如何把裸 JSON-RPC 封装成人类可读的 API？存量代码里的大量 ethers v6 又怎么读？

## 二、知识点清单

- viem 核心概念：PublicClient / WalletClient / Chain 配置与 transport
- 读合约：readContract + ABI 类型化调用
- 写合约：writeContract → 等待确认 → 拿回执
- 工具函数：formatEther / parseEther、地址 checksum 校验
- ethers.js v6 对照：Provider / Signer / Contract（读存量代码用）
- 事件监听：watchEvent vs 轮询的取舍

## 三、动手实验（学习时必须真跑）

- 用 viem 完成读余额、读 ERC-20、发交易、调用自写合约四件事
- 把其中两件事改写成裸 JSON-RPC 请求，对照封装的价值

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能独立用 viem 完成读 + 写全流程
- [ ] 能看懂 ethers v6 写的老代码

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
