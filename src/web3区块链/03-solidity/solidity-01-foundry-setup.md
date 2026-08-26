---
title: "Foundry 上手：forge、anvil、cast、chisel（师生对话实录）"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "01 Foundry 上手"
order: 1
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "实战"
  - "对话实录"
description: 师生对话实录课：foundryup 安装实录（含 solc 0.8.36 手动安放的小坑）、forge init 项目解剖、anvil 本地链互转、chisel 里算 1 ether 与 keccak——四件套就位，阶段 3 开始盖房子。
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 15/57 篇**
> 上一篇：[《状态存储：MPT、RLP 与存储槽（了解级）》](/web3区块链/02-evm/evm-05-storage) · 下一篇：[《Solidity 语法 I：合约骨架、值类型与函数》](/web3区块链/03-solidity/solidity-02-syntax-basics)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

阶段 2 把链的原理吃透了，现在要「在上面盖房子」——先得有趁手的工具。总纲说 2026 年的标准答案是 **Foundry v1.0**（Truffle 已停维、Hardhat 退居第二），但我的机器上连它都没有。

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课纯动手：安装（踩了一个 solc 的小坑）、建项目、起链、互转、REPL——**把阶段 2 手里那几个零散命令，整合成一套工作流**。

课程路线图：

> ① 安装与四件套分工 → ② forge init 项目解剖 → ③ anvil：秒起的本地链 → ④ cast：多面手回炉 → ⑤ chisel：Solidity 计算器 → ⑥ 为什么是 Foundry

环境：WSL2 Ubuntu-22.04（root）；Foundry 1.7.1（2026-05-08 构建）、forge-std v1.16.2、solc 0.8.36。官方：[getfoundry.sh](https://getfoundry.sh/)、[Foundry Book](https://book.getfoundry.sh/)。

---

## 第 1 课：安装——foundryup 与一个小坑

**🧑‍🏫 老师：**

安装本体一条命令（官方脚本装的是**版本管理器** foundryup，再由它装工具链）：

```bash
curl -L https://foundry.paradigm.xyz | sh
foundryup          # 拉 forge / cast / anvil / chisel 四件套
```

本机实录（2026-08-26）：

```text
foundryup: use - cast 1.7.1 (4072e48705 2026-05-08T07:50:55Z)
foundryup: use - anvil 1.7.1 (4072e48705 2026-05-08T07:50:55Z)
foundryup: use - chisel 1.7.1 (4072e48705 2026-05-08T07:50:55Z)
foundryup: done!
```

然后是我踩的**第一个坑**：第一次 `forge build` 时报：

```text
Error: No solc version exists that matches the version requirement: ^0.8.36
```

foundryup 装的svm（编译器管理）版本清单停在了旧版本、认不出 0.8.36。解法是**手动安放 solc 二进制**到 svm 的目录（soliditylang 的二进制源可达）：

```bash
# 从官方 list.json 查到 0.8.36 的下载路径
mkdir -p ~/.svm/0.8.36
curl -o ~/.svm/0.8.36/solc-0.8.36 \
    https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-v0.8.36+commit.8a079791
chmod +x ~/.svm/0.8.36/solc-0.8.36
~/.svm/0.8.36/solc-0.8.36 --version    # → Version: 0.8.36+commit.8a079791 ✓
```

之后一切正常。**教训通用**：工具链的「版本口径」是三件套的对齐——Foundry 版本、solc 版本、EVM 目标版本（2.3 篇第 6 课），任何一环对不上，报错往往长得莫名其妙。

四件套的分工一句话各自记住：

| 工具 | 一句话 | 你在哪里见过 |
|---|---|---|
| **forge** | 编译、测试、部署脚本（瑞士军刀的主刀） | 2.3 篇 gas-report |
| **anvil** | 秒起的本地链（含主网分叉模式） | 2.2 nonce 实验、2.4 王爷模式 |
| **cast** | 跟链对话、算哈希、管钱包（多面手） | 阶段 2 全程 |
| **chisel** | Solidity REPL（一行一试的计算器） | 本篇第 5 课首发 |

> 一句话收口：**foundryup 装的是管理器，四件套各管一摊；solc 手动安放是版本对齐的常见操作——三件套口径对齐，后面才有太平日子。**

---

## 第 2 课：forge init——项目解剖

**🧑‍🎓 学生：** 装好了，开个项目看看结构。

**🧑‍🏫 老师：**

```bash
cd /root && forge init w3-lab2
```

```text
Initializing /root/w3-lab2...
Installing forge-std in /root/w3-lab2/lib/forge-std ...
    Installed forge-std tag=v1.16.2@bf647bd…
    Initialized forge project
```

解剖这张目录表——本系列**所有合约代码**都住这个项目里：

```text
w3-lab2/
├── foundry.toml      # 项目配置：solc 版本、EVM 目标、优化器、rpc…
├── src/              # 合约源码（你已经来过：GasLab.sol、StorageLab.sol）
├── test/             # 测试（3.7 篇的主角）
├── script/           # 部署脚本（3.8 篇的主角）
├── lib/              # 依赖（git submodule；forge install 添加）
│   └── forge-std/    #   标准测试库（assertEq、vm.* 全在这）
└── foundry.lock      # 依赖锁定（版本可复现）
```

三个值得马上知道的点：

- **依赖即 git 子模块**：`forge install OpenZeppelin/openzeppelin-contracts` 装依赖——没有 npm 那种 node_modules 黑洞，就是 git 仓库引用，干净可复现（4.x 用 OpenZeppelin 时见真章）；
- **foundry.toml 是行为的开关**：`solc_version = "0.8.36"`、`evm_version = "prague"`、优化器 runs……全项目的口径在这里统一（2.3 篇第 6 课的落点）；
- **模板自带的 Counter.sol**：一行 `forge build` 编译、`forge test` 跑通它自带的测试——**新机器装完工具链，用模板项目跑一遍绿，就证明环境健康**（我删了它，换成了自己的 GasLab/StorageLab）。

> 一句话收口：**src/test/script/lib 四室一厅 + toml 总开关；依赖是 git 子模块——Foundry 项目结构本身就是「合约工程」的形状。**

---

## 第 3 课：anvil——秒起的本地链

**🧑‍🎓 学生：** 之前一直在「用」anvil，这次正式介绍一下？

**🧑‍🏫 老师：**

```bash
anvil --port 18545
```

启动横幅（本机实录，节选）：

```text
Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01B50e0d17dc79C8 (10000 ETH)
…（共 10 个）

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
…
```

三条实用情报：

- **预置账户是公开的**：10 个地址各带 10000 ETH，私钥直接印在横幅上——因为这是一条**假链**，谁都能随意起一条一模一样的（2.2 篇我们一直用 0 号账户发交易，就是这把 `0xac09…`）。「私钥印在屏幕上」仅在此地合法，**这把钥匙碰任何真链等于送钱**；
- **automine 默认开**：每笔交易立即出块（2.2 篇实验为什么「秒确认」）；要模拟真实的排队与内存池，用 `--no-mine`；
- **时间旅行等作弊码**：`cast rpc evm_increaseTime`、`anvil_setBalance`（2.4 篇的王爷模式）——3.7 测试课把它们编成 vm.* 家族系统讲。

用 cast 完成本课的验收动作（账户互转）——2.2 篇做过，这次当成「肌肉记忆」再来一遍（0 号给 1 号转 0.5 ETH，回执 `status 1`，`gasUsed 21000`）：

```bash
cast send 0x7099…79C8 --value 0.5ether \
    --private-key 0xac09…ff80 --rpc-url http://127.0.0.1:18545
```

> 一句话收口：**anvil = 秒起、预置巨款、automine、作弊码全开的假链——公开私钥是它「假」的证明，也是它「好用」的来源。**

---

## 第 4 课：cast——多面手回炉

**🧑‍🎓 学生：** 阶段 2 用了不少 cast，还有什么漏掉的？

**🧑‍🏫 老师：**

把你已经会的按场景重新归类，再补几个新招——这张表本身就是「开发者的一天」：

| 场景 | 命令 | 出处 |
|---|---|---|
| 查链 | `cast block-number / balance / nonce / code` | 2.1 篇 |
| 读合约 | `cast call $USDC "totalSupply()(uint256)"` | 2.4 篇 |
| 发交易 | `cast send …` | 2.2 篇 |
| 读存储槽 | `cast storage / cast index` | 2.5 篇 |
| **算东西** | `cast keccak "hello"`、`cast --to-unit 1ether wei`、`cast calldata "f(uint256)" 7` | 阶段 2 零散用过，本课正式收编 |
| **管钱包** | `cast wallet new`（0.4 篇的 python 派生，它也能干）、`cast wallet sign/verify` | 3.8 篇部署时正式用 |
| **主网分叉** | `anvil --fork-url` + `cast rpc anvil_*` | 2.4 篇 |

新招当场验两个（对照 0.2 篇的手算结果）：

```text
$ cast --to-unit 1ether wei
1000000000000000000
$ cast keccak "hello"
0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8
```

这个 keccak 值你应该眼熟——0.2 篇哈希实验、刚才 chisel 里算的，**三个工具同一个答案**（keccak 的确定性，跨工具可验证）。

> 一句话收口：**cast = 查/读/发/算/管五合一的命令行瑞士军刀；「同一个问题三个工具同一答案」是密码学给工程上的保险。**

---

## 第 5 课：chisel——Solidity 计算器

**🧑‍🎓 学生：** 「Solidity REPL」是什么体验？

**🧑‍🏫 老师：**

就像 python 的交互窗口，只不过语言是 Solidity——**不用建项目、不用编译文件，一行代码立即求值**：

```text
$ chisel
➜ 1 ether
├ Hex: 0xde0b6b3a7640000
└ Decimal: 1000000000000000000

➜ keccak256("hello")
Type: bytes32
└ Data: 0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8
```

典型用法三个：**单位心算**（`0.1 ether`、`5 gwei`、`uint256 max` 这类「写代码时想确认一下」的数）；**表达式试跑**（`type(uint128).max * 1e18` 溢不溢？）；** ABI 手感**（`abi.encode(…)` 的输出长什么样——2.2 篇 calldata 的手动实验室）。下一课讲语法时，它就是我们的草稿纸。

> 一句话收口：**chisel = 不用建项目的 Solidity 草稿纸——确认单位、试表达式、看 ABI，随手一行。**

---

## 插问 1：为什么主线选 Foundry，不是 Hardhat 或 Remix？

**🧑‍🎓 学生：** 老教程里 Hardhat 满地走，Remix 更是零门槛——总纲凭什么把宝押在 Foundry？

**🧑‍🏫 老师：**

三个工程理由，一个时代理由：

| | Foundry | Hardhat | Remix |
|---|---|---|---|
| 语言 | **Rust 单二进制**（快） | Node.js 插件生态 | 浏览器 |
| 测试 | **Solidity 原生** + fuzz/invariant | JS/TS 写测试 | 手点 |
| 速度 | 编译测试快一个量级 | 慢（node_modules + JS） | 依赖浏览器 |
| 心智 | 一套语言到底 | 双语言切换（合约+测试） | 零工程化 |

- **测试语言是胜负手**：合约用 Solidity 写、测试还得换 JS 写一遍——双倍心智负担；Foundry 让**测试也是 Solidity**，fuzz 更是原生能力（3.7 篇你会体验到「参数都不用自己想」的爽）；
- **速度改变习惯**：编译+测试秒级完成，你才敢「改一行跑一次」——慢工具会驯化出「攒一大把再测」的坏习惯；
- **时代理由**：2024 年起新项目与新文档默认 Foundry（总纲「版本现状」核验过），Truffle 停维、Hardhat 维护减速——学新东西的时机成本也是成本。

Remix 的正确位置：**浏览器里五分钟看一眼合约长什么样**的速览工具，不上主线。

> 一句话收口：**Foundry 赢在「测试同语言 + Rust 级速度 + 原生 fuzz」；工具选型跟生态走，2026 年的新文档都站在它这边。**

---

## 小结

1. **安装**：foundryup 装管理器再装四件套（1.7.1）；solc 0.8.36 认不出时手动安放 `~/.svm/0.8.36/`——版本三件套对齐是太平的前提。
2. **项目解剖**：src/test/script/lib + foundry.toml；依赖是 git 子模块，没有 node_modules。
3. **anvil**：预置 10 个巨款账户（私钥公开=假链的证明）、automine、作弊码。
4. **cast 五合一**：查/读/发/算/管；三工具同一 keccak 答案是密码学的保险。
5. **chisel**：Solidity 草稿纸——单位、表达式、ABI 随手一行。
6. **选型**：测试同语言 + 速度 + 原生 fuzz；生态已收敛。

**验收清单**（做完再进下一篇）：

- [ ] 独立完成「建项目 → 起本地链 → 部署示例合约 → cast 调用」全流程——本篇三课连做就是完整闭环（部署那步用 `forge create … --broadcast`，2.5 篇已走过一遍）

**思考题**：anvil 的预置私钥人人皆知，为什么用它发交易不会丢钱？同一把私钥连到 MetaMask 并切到主网，会发生什么？（提示：假链与真链是两个世界；「网络切换」时钱包用同一把钥匙开不同的门。）

下一篇：[《Solidity 语法 I：合约骨架、值类型与函数》](/web3区块链/03-solidity/solidity-02-syntax-basics)——在四件套上写第一个 Bank 合约：可见性、可变性、immutable，每个标注都有讲究。

---

## 本篇实验命令（可照抄）

```bash
# 安装（第 1 课，含 solc 手动安放）
curl -L https://foundry.paradigm.xyz | sh && foundryup
mkdir -p ~/.svm/0.8.36 && curl -o ~/.svm/0.8.36/solc-0.8.36 \
  https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-v0.8.36+commit.8a079791 \
  && chmod +x ~/.svm/0.8.36/solc-0.8.36

# 项目与本地链（第 2、3 课）
forge init w3-lab2 && cd w3-lab2 && forge build && forge test
anvil --port 18545                              # 另一终端
cast send 0x70997970C51812dc3A010C7d01B50e0d17dc79C8 --value 0.5ether \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:18545

# 算与 REPL（第 4、5 课）
cast --to-unit 1ether wei
cast keccak "hello"
chisel        # 里面试 1 ether / keccak256("hello") / type(uint256).max
```

---

## 参考资料

- [Foundry Book](https://book.getfoundry.sh/)（四件套官方文档）、[getfoundry.sh](https://getfoundry.sh/)
- [Solidity 二进制列表](https://binaries.soliditylang.org/linux-amd64/list.json)（第 1 课手动安装的来源）
- 工具链现状：总纲「版本现状」节（Truffle 停维 / Hardhat 退居第二的口径）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36（全程实跑）
