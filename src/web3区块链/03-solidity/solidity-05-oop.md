---
title: "继承、接口、库与抽象合约"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "05 继承与接口"
order: 5
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
description: "【占位待学】继承、接口、库与抽象合约——对应总纲阶段 3 · 单元 3.5。学完本篇应能：能画出多继承合约的线性化顺序"
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 19/57 篇 · 🚧 占位待学**
> 上一篇：[《语法 III：映射、数组、结构体与事件》](/web3区块链/03-solidity/solidity-04-mappings-events)
> 下一篇：[《收付款实战：payable、fallback 与转账三种方式》](/web3区块链/03-solidity/solidity-06-payable-eth)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.5**

## 一、本文要解决的问题

Solidity 的面向对象和 Java 有什么不同？多继承的线性化顺序为什么重要？为什么「接口」是与任意已部署合约对话的唯一方式？——本篇之后，你写的不再是孤立合约，而是能组合的组件。

## 二、知识点清单

- is 继承与 C3 线性化：most-base-first 的书写顺序
- 构造函数参数传递的两种写法（继承列表里 / 修饰器风格）
- virtual / override 与 super 关键字的调用路径
- 接口 interface 与 ABI 的关系：函数选择器从哪来
- 库 library：internal 调用被编译器内联、using...for 语法
- 抽象合约 abstract：放共享实现 vs 纯接口的选择

## 三、动手实验（学习时必须真跑）

- 写 Father→Son 继承链，用事件打点观察构造顺序与 super 调用路径
- 定义 IERC20 接口，读主网上任意 ERC-20 合约的 name/balanceOf

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能画出多继承合约的线性化顺序
- [ ] 能解释 interface、library、abstract 三者的使用边界

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
