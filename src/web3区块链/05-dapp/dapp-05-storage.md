---
title: "去中心化存储：IPFS 与 Arweave"
sidebarGroup: "DApp 全栈"
shortTitle: "05 去中心化存储"
order: 5
date: 2026-08-24
category: "web3区块链"
tag:
  - "web3区块链"
  - "DApp"
  - "前端"
description: "【占位待学】去中心化存储：IPFS 与 Arweave——对应总纲阶段 5 · 单元 5.5。学完本篇应能：能解释内容寻址与 URL 寻址的本质区别"
---

> **Web3 区块链系列 · 阶段 5 · DApp 全栈 · 第 32/57 篇 · 🚧 占位待学**
> 上一篇：[《链上数据与 The Graph 子图》](/web3区块链/05-dapp/dapp-04-graph)
> 下一篇：[《攻击面与威胁模型：OWASP 智能合约 Top 10》](/web3区块链/06-security/security-01-threat-model)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 5 · 单元 5.5**

## 一、本文要解决的问题

NFT 的图片、DApp 的前端静态文件放哪？链上太贵、中心化服务器违背初衷——IPFS/Arweave 补上 Web3 存储版图的这块拼图。

## 二、知识点清单

- 内容寻址 vs 位置寻址：CID 即地址、哈希即内容指纹
- IPFS：DAG 结构、pinning（谁负责保活）、公共网关
- Arweave：一次性付费永久存储与 endowment 模型
- NFT 元数据最佳实践：tokenURI → IPFS CID（而非某个 http 域名）
- DApp 前端部署到 IPFS：完全去中心化的最后一块
- Filecoin 等存储激励层（了解）

## 三、动手实验（学习时必须真跑）

- 把 NFT 元数据与图片上传 IPFS，铸造一个指向 CID 的 NFT
- 分别从两个不同公共网关访问同一 CID，验证内容寻址与网关无关

## 四、验收标准（全部通过才进入下一篇）

- [ ] 能解释内容寻址与 URL 寻址的本质区别
- [ ] 能说出 IPFS 与 Arweave 的付费与保活模型差异

## 五、阶段验收（本篇是阶段 5收尾篇）

- [ ] 众筹 DApp 完整体：合约 + 测试 + 前端 + 子图 + IPFS 元数据，本地全链路演示

## 六、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
