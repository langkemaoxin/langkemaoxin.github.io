---
title: "ERC-20 与 OpenZeppelin：亲手发一个代币"
sidebarGroup: "代币标准"
shortTitle: "01 ERC-20"
order: 1
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "代币标准"
  - "OpenZeppelin"
  - "实战"
description: "【占位待学】ERC-20 与 OpenZeppelin：亲手发一个代币——对应总纲阶段 4 · 单元 4.1。学完本篇应能：能背出 ERC-20 六函数二事件及各自语义"
---

> **Web3 区块链系列 · 阶段 4 · 代币标准 · 第 23/57 篇 · 🚧 占位待学**
> 上一篇：[《部署与验证：forge script、Sepolia 与 Etherscan》](/web3区块链/03-solidity/solidity-08-deploy-verify)
> 下一篇：[《ERC-721 / ERC-1155：NFT 与元数据》](/web3区块链/04-tokens/tokens-02-erc721-1155)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 4 · 单元 4.1**

## 一、本文要解决的问题

USDT、UNI、PEPE 背后都是同一个接口标准——为什么标准如此重要（不标准就没人能集成你）？approve/transferFrom 授权模型怎么工作，又埋着什么坑？

## 二、知识点清单

- ERC-20 六函数二事件：totalSupply / balanceOf / transfer / approve / transferFrom + Transfer / Approval
- approve 授权模型：为什么转账给别人要两步（授权 → 转移）
- 无限授权的便利与风险、approve 竞态问题
- decimals 约定与最小单位换算（18 位惯例）
- OpenZeppelin ERC20 实现精读：站在巨人肩膀上的正确姿势
- 扩展：mintable / burnable / capped 的组合方式

## 三、动手实验（学习时必须真跑）

- 基于 OZ 发行自己的测试代币并部署到 Sepolia
- 在浏览器上完成「授权 → 第三方 transferFrom」全流程
- 写一个用 IERC20 接口与任意代币交互的小合约

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能背出 ERC-20 六函数二事件及各自语义
- [ ] 能解释 approve 竞态问题及缓解方式（先置 0 再设值）

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
