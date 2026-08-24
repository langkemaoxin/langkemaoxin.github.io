---
title: "Foundry 上手：forge、anvil、cast、chisel"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "01 Foundry 上手"
order: 1
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "实战"
description: "【占位待学】Foundry 上手：forge、anvil、cast、chisel——对应总纲阶段 3 · 单元 3.1。学完本篇应能：独立完成「建项目 → 起本地链 → 部署示例合约 → cast 调用」全流程"
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 15/57 篇 · 🚧 占位待学**
> 上一篇：[《状态存储：MPT、RLP 与存储槽（了解级）》](/web3区块链/evm/evm-05-storage)
> 下一篇：[《Solidity 语法 I：合约骨架、值类型与函数》](/web3区块链/solidity/solidity-02-syntax-basics)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.1**

## 一、本文要解决的问题

2026 年的以太坊开发标准工具链是 Foundry（v1.0 稳定版）——一条命令装好编译、测试、本地链、调试、交互五件套。先把工具用顺，后面所有代码都在它上面跑。

## 二、知识点清单

- foundryup 安装（WSL2 下官方脚本）与版本管理
- forge init 项目结构：src / test / script / lib / foundry.toml
- anvil：秒起本地链、预置账户、时间旅行（为测试埋钩子）
- cast：发交易 / 调合约 / 查链 / 算 keccak / 管钱包的多面手
- chisel：Solidity REPL，快速试语法
- 工具链选型：Foundry vs Hardhat vs Remix（为什么主线选 Foundry）

## 三、动手实验（学习时必须真跑）

- WSL2 安装 Foundry 并 forge init 第一个项目
- 起 anvil，用 cast 给预置账户互转一笔 ETH，再查余额
- 在 chisel 里计算 1 ether 等于多少 wei、keccak256("hello") 是什么

## 四、验收标准（全部通过才进入下一篇）

- [ ] 独立完成「建项目 → 起本地链 → 部署示例合约 → cast 调用」全流程

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
