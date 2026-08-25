---
title: "钱包连接：EIP-1193、EIP-6963 与多钱包"
sidebarGroup: "DApp 全栈"
shortTitle: "02 钱包连接"
order: 2
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "DApp"
  - "前端"
description: "【占位待学】钱包连接：EIP-1193、EIP-6963 与多钱包——对应总纲阶段 5 · 单元 5.2。学完本篇应能：能说清 EIP-1193 与 6963 各解决什么问题"
---

> **Web3 区块链系列 · 阶段 5 · DApp 全栈 · 第 29/57 篇 · 🚧 占位待学**
> 上一篇：[《客户端 API：viem/ethers 与 JSON-RPC 封装》](/web3区块链/05-dapp/dapp-01-viem)
> 下一篇：[《DApp 前端实战：从 0 到 1 一个完整应用》](/web3区块链/05-dapp/dapp-03-frontend-dapp)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.2**

## 一、本文要解决的问题

「Connect Wallet」按钮背后发生了什么？为什么 2024 年后要换成 EIP-6963 多钱包发现？连接、断开、切链、加链的完整生命周期怎么处理才健壮？

## 二、知识点清单

- EIP-1193 provider 标准：request 方法与 accountsChanged / chainChanged 事件
- EIP-6963：多钱包发现协议（解决 window.ethereum 被先装钱包抢占的问题）
- 连接生命周期：connect / disconnect / 账户切换 / 网络切换的状态同步
- wallet_switchEthereumChain / wallet_addEthereumChain
- wallet_connect 库（AppKit/RainbowKit）的取舍：裸写 vs 用库

## 三、动手实验（学习时必须真跑）

- 不用任何连接库，裸写 EIP-6963 钱包发现与连接组件
- 连接后故意切账户、切网络，验证前端状态正确刷新

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能说清 EIP-1193 与 6963 各解决什么问题
- [ ] 能实现一个处理全生命周期的钱包连接组件

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
