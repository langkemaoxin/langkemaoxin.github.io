---
title: web3区块链
index: false
icon: link
article: false
---

# Web3 区块链

本专栏聚焦 Web3 与区块链技术，以 [**Web3 区块链学习总纲**](./roadmap/web3-00-roadmap.md)（西蒙学习法 · 十大阶段 · 18 周）为主线，从零基础的密码学一路讲到智能合约开发、安全攻防、DeFi 协议与 Layer 2，系列文章按大纲逐步展开。基准版本：以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0（2026-08 核验）。

## 学习路线

- [Web3 区块链学习总纲：零基础到资深专家的完整教学大纲](./roadmap/web3-00-roadmap.md)

## 系列文章（按学习顺序，占位待学）

### 阶段 0 · 地基与密码学（5 篇）

1. [Web3 全景：区块链到底在解决什么问题](./00-foundations/foundations-01-why-blockchain.md)
2. [哈希函数与默克尔树：区块链的指纹术](./00-foundations/foundations-02-hash-merkle.md)
3. [公私钥与数字签名：从私钥到地址](./00-foundations/foundations-03-keys-signatures.md)
4. [钱包与助记词：BIP-39/32/44](./00-foundations/foundations-04-wallets.md)
5. [手写 100 行迷你区块链](./00-foundations/foundations-05-mini-blockchain.md)

### 阶段 1 · 比特币（4 篇）

1. [比特币白皮书精读与 UTXO 模型](./01-bitcoin/bitcoin-01-utxo.md)
2. [挖矿、难度调整与最长链：51% 攻击推演](./01-bitcoin/bitcoin-02-pow.md)
3. [比特币脚本：一种故意不做完的编程语言](./01-bitcoin/bitcoin-03-script.md)
4. [比特币的取舍与现状：为什么需要以太坊](./01-bitcoin/bitcoin-04-tradeoffs.md)

### 阶段 2 · 以太坊核心（5 篇）

1. [账户模型与状态机：以太坊的世界状态](./02-evm/evm-01-accounts.md)
2. [交易全解：类型、签名与 EIP-1559 费用](./02-evm/evm-02-transactions.md)
3. [EVM 执行模型与 Gas：逐条执行一笔交易](./02-evm/evm-03-evm-gas.md)
4. [节点与 JSON-RPC：亲手当一次客户端](./02-evm/evm-04-nodes-rpc.md)
5. [状态存储：MPT、RLP 与存储槽（了解级）](./02-evm/evm-05-storage.md)

### 阶段 3 · Solidity 与 Foundry（8 篇）

1. [Foundry 上手：forge、anvil、cast、chisel](./03-solidity/solidity-01-foundry-setup.md)
2. [Solidity 语法 I：合约骨架、值类型与函数](./03-solidity/solidity-02-syntax-basics.md)
3. [语法 II：引用类型与数据位置](./03-solidity/solidity-03-data-location.md)
4. [语法 III：映射、数组、结构体与事件](./03-solidity/solidity-04-mappings-events.md)
5. [继承、接口、库与抽象合约](./03-solidity/solidity-05-oop.md)
6. [收付款实战：payable、fallback 与转账三种方式](./03-solidity/solidity-06-payable-eth.md)
7. [Foundry 测试：cheatcodes、fuzz 与 invariant](./03-solidity/solidity-07-testing.md)
8. [部署与验证：forge script、Sepolia 与 Etherscan](./03-solidity/solidity-08-deploy-verify.md)

### 阶段 4 · 代币标准（5 篇）

1. [ERC-20 与 OpenZeppelin：亲手发一个代币](./04-tokens/tokens-01-erc20.md)
2. [ERC-721 / ERC-1155：NFT 与元数据](./04-tokens/tokens-02-erc721-1155.md)
3. [ERC-4626 金库标准与通胀攻击](./04-tokens/tokens-03-erc4626.md)
4. [可升级合约：代理模式与存储槽](./04-tokens/tokens-04-upgradeable.md)
5. [合约工程模式：工厂、多签与时间锁](./04-tokens/tokens-05-patterns.md)

### 阶段 5 · DApp 全栈（5 篇）

1. [客户端 API：viem/ethers 与 JSON-RPC 封装](./05-dapp/dapp-01-viem.md)
2. [钱包连接：EIP-1193、EIP-6963 与多钱包](./05-dapp/dapp-02-wallet-connect.md)
3. [DApp 前端实战：从 0 到 1 一个完整应用](./05-dapp/dapp-03-frontend-dapp.md)
4. [链上数据与 The Graph 子图](./05-dapp/dapp-04-graph.md)
5. [去中心化存储：IPFS 与 Arweave](./05-dapp/dapp-05-storage.md)

### 阶段 6 · 安全攻防（7 篇）

1. [攻击面与威胁模型：OWASP 智能合约 Top 10](./06-security/security-01-threat-model.md)
2. [重入攻击：从 The DAO 到今天的变体](./06-security/security-02-reentrancy.md)
3. [访问控制漏洞：权限错置与签名滥用](./06-security/security-03-access-control.md)
4. [算术漏洞与预言机操纵](./06-security/security-04-arithmetic-oracle.md)
5. [MEV：抢跑、三明治与闪电贷攻击](./06-security/security-05-mev.md)
6. [工具链：Slither、fuzz 与形式化验证](./06-security/security-06-tools.md)
7. [审计方法论：像审计师一样审查合约](./06-security/security-07-audit-method.md)

### 阶段 7 · DeFi 协议（8 篇）

1. [DeFi 全景与可组合性](./07-defi/defi-01-landscape.md)
2. [AMM 演进：恒定乘积到集中流动性到 hooks](./07-defi/defi-02-amm.md)
3. [借贷协议：Aave 的利率模型与清算](./07-defi/defi-03-lending.md)
4. [稳定币三形态与监管（GENIUS Act 时代）](./07-defi/defi-04-stablecoins.md)
5. [预言机：Chainlink 价格喂送实操](./07-defi/defi-05-oracles-chainlink.md)
6. [质押与再质押：从 ETH Staking 到 EigenLayer](./07-defi/defi-06-staking-restaking.md)
7. [治理与 DAO：代币投票的工程实现](./07-defi/defi-07-governance-dao.md)
8. [代币经济学：发行、分配与释放曲线](./07-defi/defi-08-tokenomics.md)

### 阶段 8 · 共识与扩容（6 篇）

1. [PoS 共识：验证者、罚没与 Gasper](./08-l2/l2-01-pos-consensus.md)
2. [扩容路线图：Rollup-centric、blobs 与 PeerDAS](./08-l2/l2-02-scaling-roadmap.md)
3. [Optimistic Rollup 与 OP Stack 实操](./08-l2/l2-03-optimistic-rollup.md)
4. [ZK Rollup：零知识证明与有效性证明](./08-l2/l2-04-zk-rollup.md)
5. [跨链桥：机制与史上最大盗案群](./08-l2/l2-05-bridges.md)
6. [账户抽象：ERC-4337 与 EIP-7702](./08-l2/l2-06-account-abstraction.md)

### 阶段 9 · 生态与毕业（4 篇）

1. [多链生态一瞥：Solana、Move 系与比特币 L2](./09-capstone/capstone-01-multichain.md)
2. [RWA 与现实资产上链](./09-capstone/capstone-02-rwa.md)
3. [毕业设计：全栈 DApp 从 0 到 1](./09-capstone/capstone-03-final-project.md)
4. [资深自检 30 问](./09-capstone/capstone-04-self-check.md)
