---
title: "部署与验证：forge script、Sepolia 与 Etherscan"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "08 部署与验证"
order: 8
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "实战"
  - "部署"
description: "【占位待学】部署与验证：forge script、Sepolia 与 Etherscan——对应总纲阶段 3 · 单元 3.8。学完本篇应能：全流程独立完成：脚本部署 → 浏览器可读可交互 → 源码验证通过"
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 22/57 篇 · 🚧 占位待学**
> 上一篇：[《Foundry 测试：cheatcodes、fuzz 与 invariant》](/web3区块链/solidity/solidity-07-testing)
> 下一篇：[《ERC-20 与 OpenZeppelin：亲手发一个代币》](/web3区块链/tokens/tokens-01-erc20)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.8**

## 一、本文要解决的问题

合约写好测好，怎么让全世界用上？脚本化部署、私钥安全管理、测试网落地、源码验证——这是「本地玩家」到「主网工程师」的临门一脚。

## 二、知识点清单

- forge script：脚本化部署、broadcast、多网络配置
- 私钥管理三选一：环境变量 / cast wallet / keystore 文件（绝不硬编码进代码）
- Sepolia 测试网与水龙头获取测试 ETH
- Etherscan 源码验证：forge verify 与 API key
- 部署的本质：constructor 在部署交易里执行
- CREATE vs CREATE2：合约地址怎么算、为什么 CREATE2 能预计算（初见）

## 三、动手实验（学习时必须真跑）

- 把 Bank 合约用 forge script 部署到 Sepolia，并在 Etherscan 完成源码验证
- 用 CREATE2 在本地预计算一个合约地址，再部署验证地址一致

## 四、验收标准（全部通过才进入下一篇）

- [ ] 全流程独立完成：脚本部署 → 浏览器可读可交互 → 源码验证通过
- [ ] 能解释 CREATE 与 CREATE2 生成地址的差别

## 五、阶段验收（本篇是阶段 3收尾篇）

- [ ] 综合实验「众筹合约」：目标金额/截止时间/退款逻辑，fuzz + invariant 全覆盖，部署 Sepolia 并验证
- [ ] 口述 Solidity 数据位置与 Gas 的关系

## 六、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
