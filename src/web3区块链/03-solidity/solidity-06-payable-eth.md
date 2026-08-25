---
title: "收付款实战：payable、fallback 与转账三种方式"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "06 收付款实战"
order: 6
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
description: "【占位待学】收付款实战：payable、fallback 与转账三种方式——对应总纲阶段 3 · 单元 3.6。学完本篇应能：能说清三种转账方式在 gas 与安全上的差异及推荐选择"
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 20/57 篇 · 🚧 占位待学**
> 上一篇：[《继承、接口、库与抽象合约》](/web3区块链/03-solidity/solidity-05-oop)
> 下一篇：[《Foundry 测试：cheatcodes、fuzz 与 invariant》](/web3区块链/03-solidity/solidity-07-testing)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.6**

## 一、本文要解决的问题

合约怎么收钱、怎么转钱、怎么「带着钱调用别人」？transfer/send/call 三兄弟为什么要背熟？——重入攻击的种子就在这一篇埋下（阶段 6 回来拆弹）。

## 二、知识点清单

- payable 函数与 msg.value；不带 payable 收钱的隐式路径（coinbase/自毁）
- receive() 与 fallback() 的触发规则与区别
- 三种转账：transfer（2300 gas 固定）、send（同上限不回滚）、call{value:}()（推荐）
- call 带 calldata：带钱调用其他合约的函数
- 地址 payable 类型与类型转换
- selfdestruct 的现状（EIP-6780 后语义变化，了解）
- push vs pull 支付模式初见（为安全篇埋钩子）

## 三、动手实验（学习时必须真跑）

- 实现「给合约转账 + 合约按指令转出」全流程
- 分别用三种方式向一个 revert 的合约转账，对比 gas 消耗与失败表现

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能说清三种转账方式在 gas 与安全上的差异及推荐选择
- [ ] 能解释 receive 和 fallback 分别在什么场景被触发

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
