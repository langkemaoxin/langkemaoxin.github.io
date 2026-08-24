---
title: "Solidity 语法 I：合约骨架、值类型与函数"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "02 语法 I 骨架与类型"
order: 2
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
description: "【占位待学】Solidity 语法 I：合约骨架、值类型与函数——对应总纲阶段 3 · 单元 3.2。学完本篇应能：能独立写出含正确可见性/可变性标注的合约并解释每个选择"
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 16/57 篇 · 🚧 占位待学**
> 上一篇：[《Foundry 上手：forge、anvil、cast、chisel》](/web3区块链/solidity/solidity-01-foundry-setup)
> 下一篇：[《语法 II：引用类型与数据位置》](/web3区块链/solidity/solidity-03-data-location)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.2**

## 一、本文要解决的问题

一个 .sol 文件由什么组成？uint256 / address / bool 在 EVM 层面对应什么？public/private 与 view/pure 分别控制什么？——先写出第一个结构清晰的合约。（基准 Solidity 0.8.36）

## 二、知识点清单

- pragma 与编译器版本策略（0.8.36；只有最新版收安全补丁）
- 合约、状态变量、函数的最小骨架与 SPDX 声明
- 值类型：uint/int 系列、address、bool、bytes32、enum
- address 的成员：balance 与转账三兄弟初见
- 函数可见性（public/private/internal/external）与状态可变性（view/pure/payable）
- 构造函数、immutable、constant 的初始化时机
- unchecked 块：0.8 默认溢出检查的例外与适用场景

## 三、动手实验（学习时必须真跑）

- 写一个 Bank 合约：存款、查余额、只读统计三个函数，可见性/可变性标注正确
- forge build 编译通过 + forge test 跑通第一个测试
- 在 chisel 里故意触发溢出，对比 checked 与 unchecked 的行为

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能独立写出含正确可见性/可变性标注的合约并解释每个选择
- [ ] 能说出 immutable 与 constant 的区别

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
