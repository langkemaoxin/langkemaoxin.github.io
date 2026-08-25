---
title: "语法 III：映射、数组、结构体与事件"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "04 语法 III 映射与事件"
order: 4
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
description: "【占位待学】语法 III：映射、数组、结构体与事件——对应总纲阶段 3 · 单元 3.4。学完本篇应能：能解释事件存哪、谁付钱、怎么查、为什么不适合存关键业务状态"
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 18/57 篇 · 🚧 占位待学**
> 上一篇：[《语法 II：引用类型与数据位置》](/web3区块链/03-solidity/solidity-03-data-location)
> 下一篇：[《继承、接口、库与抽象合约》](/web3区块链/03-solidity/solidity-05-oop)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.4**

## 一、本文要解决的问题

链上怎么存「谁存了多少钱」这样的表？事件日志为什么被称为「免费的只读数据库」？custom error 为什么比 revert 字符串省 Gas？——本篇是状态建模三件套 + 可观测性。

## 二、知识点清单

- mapping：O(1) 读写、不可遍历、键集合模式补遍历
- 数组：memory 数组 vs storage 数组、push/pop/slice、越界行为
- 结构体：定义、嵌套、作为映射的值
- 事件与日志：indexed 参数、topics 与 data、过滤器查询
- 事件存哪里、谁付钱、为什么便宜、删不掉
- 错误处理：require / revert / assert 的语义分工
- custom error（0.8.4+）与 require 的自定义错误形式（0.8.24+）

## 三、动手实验（学习时必须真跑）

- 实现「存款排行」合约：mapping + 地址数组键集合
- 用 cast logs 过滤自己合约发出的事件，观察 indexed 与非 indexed 参数的去向

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能解释事件存哪、谁付钱、怎么查、为什么不适合存关键业务状态
- [ ] 能列出 require/revert/assert 各自的适用场景

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
