---
title: "语法 II：引用类型与数据位置"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "03 语法 II 数据位置"
order: 3
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
description: "【占位待学】语法 II：引用类型与数据位置——对应总纲阶段 3 · 单元 3.3。学完本篇应能：能对任意变量说出它该在哪个位置及原因"
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 17/57 篇 · 🚧 占位待学**
> 上一篇：[《Solidity 语法 I：合约骨架、值类型与函数》](/web3区块链/03-solidity/solidity-02-syntax-basics)
> 下一篇：[《语法 III：映射、数组、结构体与事件》](/web3区块链/03-solidity/solidity-04-mappings-events)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.3**

## 一、本文要解决的问题

storage / memory / calldata 三个数据位置是 Solidity 新手的第一道坎，也是 Gas 优化的第一战场——同一个函数签名换一个位置，Gas 能差数倍。

## 二、知识点清单

- 三种位置：storage（链上持久）、memory（临时副本）、calldata（只读入参）
- 赋值语义：什么时候是引用（改一个另一个也变）、什么时候是拷贝
- string 与 bytes 的特殊性（为什么不便宜）
- 结构体/数组在不同位置之间传递的拷贝成本
- 数据位置的默认规则（参数默认 calldata/memory、局部变量默认 storage 引用）
- Gas 实测：同功能不同位置的消耗对比

## 三、动手实验（学习时必须真跑）

- 同一函数分别用 memory 和 calldata 参数，forge test 里用 gas-report 对比
- 故意写错位置触发编译错误，逐条读懂编译器报错
- 写一个「storage 引用被意外修改」的例子，验证两处变量同变

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能对任意变量说出它该在哪个位置及原因
- [ ] 能预测引用赋值与拷贝赋值的行为差异

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
