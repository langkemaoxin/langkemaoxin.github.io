---
title: "Foundry 测试：cheatcodes、fuzz 与 invariant"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "07 测试三连"
order: 7
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "实战"
description: "【占位待学】Foundry 测试：cheatcodes、fuzz 与 invariant——对应总纲阶段 3 · 单元 3.7。学完本篇应能：能为任意合约设计至少 3 条有意义的 invariant"
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 21/57 篇 · 🚧 占位待学**
> 上一篇：[《收付款实战：payable、fallback 与转账三种方式》](/web3区块链/03-solidity/solidity-06-payable-eth)
> 下一篇：[《部署与验证：forge script、Sepolia 与 Etherscan》](/web3区块链/03-solidity/solidity-08-deploy-verify)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.7**

## 一、本文要解决的问题

合约代码「写完」不等于「对」——fuzz 让机器帮你枚举刁钻输入，invariant 让机器随机组合操作序列找协议级漏洞。这两个技能是资深与入门的分水岭之一。

## 二、知识点清单

- forge test 命令体系与 -vv/-vvv 的失败诊断层级
- 断言：assertTrue / assertEq / assertApproxEqRel 与错误断言
- cheatcodes：vm.deal / vm.prank / vm.warp / vm.expectRevert / vm.expectEmit
- 基于性质的 fuzz：参数随机化、vm.assume 与 bound
- invariant 测试：targetContract、handler 模式、不变式怎么设计
- forge coverage 覆盖率与 forge snapshot / gas-report

## 三、动手实验（学习时必须真跑）

- 给 Bank 合约写单测 + fuzz（「存后即取，余额归零」性质）+ invariant（「总账守恒」）
- 故意在合约里埋一个 bug（如减法下溢），验证 fuzz/invariant 能抓到

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能为任意合约设计至少 3 条有意义的 invariant
- [ ] 能让 fuzz 抓到自己埋的 bug 并读懂反例输出

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
