---
title: "EVM 执行模型与 Gas：逐条执行一笔交易"
sidebarGroup: "以太坊核心"
shortTitle: "03 EVM 与 Gas"
order: 3
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "以太坊"
  - "EVM"
description: "【占位待学】EVM 执行模型与 Gas：逐条执行一笔交易——对应总纲阶段 2 · 单元 2.3。学完本篇应能：能把一段简单 Solidity 编译后的 opcode 与源码行对应起来"
---

> **Web3 区块链系列 · 阶段 2 · 以太坊核心 · 第 12/57 篇 · 🚧 占位待学**
> 上一篇：[《交易全解：类型、签名与 EIP-1559 费用》](/web3区块链/02-evm/evm-02-transactions)
> 下一篇：[《节点与 JSON-RPC：亲手当一次客户端》](/web3区块链/02-evm/evm-04-nodes-rpc)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 2 · 单元 2.3**

## 一、本文要解决的问题

EVM 是一台什么样的计算机？为什么每条指令都要收费？同样一个功能，为什么有人写花 50 万 Gas、有人只花 10 万？看懂这一篇，Solidity 的每个语法选择都有了价格标签。

## 二、知识点清单

- EVM 架构：栈（1024 深）、内存（临时）、calldata（只读）、storage（持久）、字节码
- 常用 opcode 分类：算术 / 比较 / 栈操作 / 环境 / 内存 / 存储 / 调用
- ABI 编码：函数选择器与参数怎么变成 calldata
- Gas 计费：intrinsic cost、opcode 单价、SLOAD/SSTORE 的存储天价
- gasLimit 耗尽 → out of gas → 整笔回滚
- EVM 目标版本（shanghai / prague）与差分（了解）

## 三、动手实验（学习时必须真跑）

- 用 forge debug 单步跟踪一笔简单调用，观察栈与存储的变化
- 同功能两种写法（calldata vs memory 参数、storage 重复读 vs 缓存局部变量）实测 Gas 差

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能把一段简单 Solidity 编译后的 opcode 与源码行对应起来
- [ ] 能解释「为什么存储读写最贵、calldata 最便宜」

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
