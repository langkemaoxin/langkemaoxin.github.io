---
title: "部署与验证：forge script、Sepolia 与 Etherscan（师生对话实录）"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "08 部署与验证"
order: 8
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "实战"
  - "部署"
  - "对话实录"
description: 师生对话实录课（阶段 3 收官）：forge script 脚本化部署全流程、私钥走环境变量的纪律、CREATE2 手算预计算地址（踩了一个 20/32 字节填充坑后）与 factory 实际部署一字不差地对上——Sepolia 与 Etherscan 验证留给读者带着清单完成。
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 22/57 篇（阶段 3 收尾）**
> 上一篇：[《Foundry 测试：cheatcodes、fuzz 与 invariant》](/web3区块链/03-solidity/solidity-07-testing) · 下一篇：[《ERC-20 与 OpenZeppelin：亲手发一个代币》](/web3区块链/04-tokens/tokens-01-erc20)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

合约写好、测好——「本地玩家」到「主网工程师」的临门一脚是部署：脚本化、私钥安全、测试网落地、源码验证。还有一个我一直没想通的问题：**CREATE2 凭什么能「先算出地址再部署」**？这对真实工程有什么用？

继续对话老办法：AI 当老师我当学生，有问题就打断。本地把全流程跑通（包括 CREATE2 的手算验证——**踩了一个填充坑、修正后与链上地址一字不差**）；Sepolia 实部署与 Etherscan 验证需要领水与 API key，作为**读者作业**附完整清单。

课程路线图：

> ① 部署的本质 → ② forge script 脚本化 → ③ 私钥管理三选一 → ④ CREATE vs CREATE2 → ⑤ 实测：预计算与实部署对账 → ⑥ Sepolia 与 Etherscan 作业

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；本地 anvil 全流程实跑。官方：[Foundry Book — Deploying](https://book.getfoundry.sh/forge/deploying)。

---

## 第 1 课：部署的本质——一笔特殊的交易

**🧑‍🏫 老师：**

先把神秘感拆掉：**部署 = 一笔 `to` 为空、data 是字节码的交易**（2.2 篇骨架图埋的伏笔）。EVM 收到后：

```text
交易：to = 空（0x∅）、data = 编译产物 initcode
   ↓
EVM 在「一次性上下文」里执行 initcode：
   ├─ 跑 constructor（3.2 课：只在部署交易里执行的那段）
   ├─ 返回 runtime bytecode（真正常驻链上的代码）
   ↓
新账户诞生：地址由规则算出、code = runtime、nonce = 0
   ↓
本笔交易的 contractAddress 字段 = 新地址
```

三个推论即刻可用：

- **constructor 的 gas 是你这笔部署交易付的**——构造函数里的循环、存储写入都是真金白银（2.3 篇价目表照常适用）；
- **initcode ≠ 部署后的代码**：前者是「一次性安装程序」（含 constructor 逻辑 + 返回代码的指令），后者是「装好的程序」——所以 CREATE2 的地址要用 **initcode 的哈希**算（第 5 课的坑与此相关）；
- **合约地址不是随机的**，由两条规则之一算出——下一课。

> 一句话收口：**部署 = to 空、data 装 initcode 的交易；constructor 跑在安装期，常驻的是 runtime——两个「代码」是两样东西。**

---

## 第 2 课：forge script——部署的工程形态

**🧑‍🎓 学生：** 之前用 `forge create` 部署过——为什么还要学 script？

**🧑‍🏫 老师：**

`forge create` 是**单合约、单命令**的快捷方式；真实部署是**多步流程**（先部署依赖库、再主合约、再初始化调用、再转所有权……）——脚本才能表达顺序与参数。标准写法：

```solidity
contract Deploy is Script {
    function run() external returns (BankV2 bank) {
        uint256 pk = vm.envUint("PRIVATE_KEY");     // 私钥从环境变量读
        vm.startBroadcast(pk);                      // ← 从这里开始，一切调用变真交易
        bank = new BankV2();
        vm.stopBroadcast();
    }
}
```

跑起来（本机实录）：

```bash
PRIVATE_KEY=0xac09…ff80 forge script script/Deploy.s.sol \
    --fork-url http://127.0.0.1:18545 --broadcast
```

```text
bank: contract BankV2 0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1
Transactions saved to: /root/w3-lab2/broadcast/Deploy.s.sol/31337/run-latest.json
```

三个要点：

- **`vm.startBroadcast` 是分界线**：之前的一切（算地址、读状态）都是本地模拟；之后的调用会被录制并广播。没有 `--broadcast` 旗标时整个脚本是 dry-run（3.1 课 forge create 同款行为）——**先干跑、再广播**是部署的标准节奏；
- **broadcast 目录是部署档案**：每笔交易存 JSON（链 id 子目录）——出问题时的审计线索，也是 CI 判断「这段部署是否发生过」的依据；
- **多网络**：`--fork-url` 换 RPC、`PRIVATE_KEY` 换身份——同一脚本走本地/Sepolia/主网，把「环境差异」压到两个参数。

> 一句话收口：**script = 部署的源代码：startBroadcast 分界模拟与真实，broadcast 目录留档——先干跑再广播，网络只是参数。**

---

## 第 3 课：私钥管理三选一——绝不硬编码

**🧑‍🎓 学生：** 脚本里那个 `vm.envUint("PRIVATE_KEY")` 为什么这么绕？

**🧑‍🏫 老师：**

因为**私钥出现在代码里 = 资产送人**（提交 Git、截图、日志回显……历史事故堆成山）。三个正路按安全强度排：

| 方式 | 用法 | 适合 | 风险 |
|---|---|---|---|
| **环境变量** | `PRIVATE_KEY=0x… forge script …` | 本地/CI | 进程列表、shell 历史可能泄露——CI 用 secret 注入 |
| **cast wallet** | `forge script --account mykey`（keystore 文件） | 开发机 | 密码加密的 keystore 落盘 |
| **硬件钱包** | `--ledger` / `--trezor` | 主网 | 签名在设备内，私钥不出笼 |

红线只有一条：**0x 开头的私钥明文，永远不出现在命令历史和代码库里**。配套习惯：`.env` 进 `.gitignore`、不同环境**不同身份**（本地用 anvil 预置钥匙、测试网用专用穷号、主网用硬件钱包）——0.4 篇「钥匙管理器」的工程化落地。

> 一句话收口：**私钥三选一（env/keystore/硬件），明文永不上镜——身份分环境，是纪律不是技巧。**

---

## 第 4 课：CREATE vs CREATE2——地址怎么算出来

**🧑‍🎓 学生：** 到正题了：合约地址的「两条规则」是什么？CREATE2 凭什么能预计算？

**🧑‍🏫 老师：**

```text
CREATE（默认，new X()）:
  地址 = keccak(rlp(部署者地址, 部署者nonce))[12:]
  → 由「谁、第几次」决定——nonce 一变地址就变，无法预知

CREATE2（new X{salt: 0x…}() 或工厂合约里的 create2 操作码）:
  地址 = keccak(0xff ++ 工厂地址(20字节) ++ salt(32字节) ++ keccak(initcode))[12:]
  → 由「在哪、加什么料、装什么代码」决定——三者定了，地址就定了
  → 部署前就能算出来！
```

CREATE2 解锁的工程能力（每一项都是真实用法）：

- **地址预知**：众筹还没开始，合约地址可以先公布（用户先转账到「未来合约」，部署后接管）；
- **同处重复部署**：合约自毁后用同 salt 在**原地址重生**（某些状态机设计）；
- **多链同地址**：同一 factory + 同 salt + 同 initcode 在每条链上算出**同一地址**——L2 部署、跨链工具的标配（总纲阶段 8 的「CREATE2 保证双链地址一致」说的就是它）。

注意公式里的第三个输入：**initcode 的哈希**——代码变一个字节，地址就变（第 1 课「两个代码是两样东西」的回响：参与运算的是**安装程序**，不是常驻代码）。

> 一句话收口：**CREATE 地址问「谁、第几次」；CREATE2 地址问「在哪、什么料、什么代码」——把随机性换成确定性，换来预知与跨链一致。**

---

## 第 5 课：实测——手算预计算，再实部署对账

**🧑‍🎓 学生：** 上实验：先手算，再真部署，看对不对得上。

**🧑‍🏫 老师：**

CREATE2 必须由**合约**执行（EOA 的交易触发不了这个操作码），所以先部署一个极简工厂，再走三步（本机实录）：

```solidity
contract Factory {
    function deploy(bytes memory code, bytes32 salt) external returns (address addr) {
        assembly { addr := create2(0, add(code, 0x20), mload(code), salt) }
    }
}
```

```text
[1] Factory 部署于 0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44
[2] 手算（python + keccak）：
    addr = keccak( 0xff ++ factory ++ salt(0x…c0de) ++ keccak(initcode) )[12:]
    预计算地址 = 0xa94c8314a42de034e712925c8df3f760ebfeb71a
[3] 调 factory.deploy(initcode, salt) 真部署：
    Deployed 事件 addr = 0xa94c8314a42de034e712925c8df3f760ebfeb71a
    salt = 0x0000…c0de
```

**手算与链上实部署一字不差**——CREATE2 的确定性被亲手验证。

如实记录我踩的坑：第一版手算**对不上**（算出 0x9fce…），排查发现我把 factory 地址 `zfill(64)`——**20 字节的地址被我填充成了 32 字节**。CREATE2 公式里 factory 恰恰是**唯一不是 32 字节的输入**（0xff 是 1 字节、salt 32、initcode-hash 32），少填多填一个字节，地址面目全非。这类「输入长度差一位」的哈希错误**不会报错、只会得到一个漂亮但错误的地址**——预计算的意义恰恰在于两边独立算出同一结果来互验。

> 一句话收口：**手算 0xa94c…b71a = 链上 0xa94c…b71a——CREATE2 的确定性不是背出来的，是对账对出来的；factory 是 20 字节，这个坑替你踩过了。**

---

## 插问 1：CREATE2 会不会被滥用来搞骗局？

**🧑‍🎓 学生：** 「地址可以预先算出来」——听起来钓鱼网站可以「算一个长得像你朋友地址的合约」？

**🧑‍🏫 老师：**

方向对但概率不对。CREATE2 能让**你自己的**部署地址可预测，但**造不出「指定的任意地址」**——输出是 keccak 的像，你只能选输入（factory/salt/initcode）然后**接受**算出来的结果。想撞一个特定前缀（比如 0x 开头几个 0）要靠海量尝试（虚荣地址，vanity address），想完整撞 20 字节等于撞 keccak——0.2 篇的宇宙级难度。

真实的 CREATE2 骗局姿势是另一回事，值得记：**骗子先公布地址 A（说是「官方合约」），收款后在该地址部署恶意代码**——因为 CREATE2 可以「先给地址、后放代码」，而且**给未部署地址转账的钱会留在那里等合约认领**。防御姿势：转账前查 `cast code <地址>`——**有地址 ≠ 有合约**，空 code 的「官方地址」一律不信。（6 篇的威胁建模会再遇到它。）

> 一句话收口：**CREATE2 算不出任意指定地址（keccak 挡着），但「先地址后代码」给了新骗术空间——转账前查 code，空地址不是合约。**

---

## 第 6 课：Sepolia 与 Etherscan——读者作业

**🧑‍🎓 学生：** 最后一步真上测试网吧？

**🧑‍🏫 老师：**

这步我**代跑不了**（领水要你的 GitHub 账号、验证要你的 Etherscan API key）——但清单给你备齐，照走即可：

```text
□ 1. 造测试身份：cast wallet new（专门给测试网用，别用有资产的身份）
□ 2. 领测试 ETH：Sepolia 水龙头（搜 "Sepolia faucet"，GitHub 账号免费领）
□ 3. 配 RPC：--fork-url https://ethereum-sepolia-rpc.publicnode.com
□ 4. 部署：PRIVATE_KEY=… forge script script/Deploy.s.sol \
        --fork-url <sepolia rpc> --broadcast
□ 5. 浏览器核对：sepolia.etherscan.io/address/<地址>——能看到交易与合约
     （此时合约页是匿名 bytecode——"Contract"未验证状态）
□ 6. 源码验证：
     forge verify-contract <地址> src/BankV2.sol:BankV2 \
        --chain-id 11155111 --etherscan-api-key $ETHERSCAN_KEY --watch
□ 7. 验证通过后：合约页显示绿色 ✓ 与完整源码——
     任何人可在浏览器上直接 Read/Write 你的函数
```

第 6 步的意义值得强调：**验证（verify）= 把源码 + 编译配置提交给 Etherscan，它重新编译并比对链上 bytecode**——对上了才给绿勾。这不是给 Etherscan 交材料，是**给全世界交可读性**：未验证的合约是黑盒（用户只能信你），验证过的合约人人可审计——DeFi 世界「不验证不上线」的行规由此而来。（当然验证只证明「代码如所示」，不证明「代码没 bug」——那是 3.7 与 6 篇的事。）

**阶段验收**（占位大纲两条，读者自查）：

- [ ] 综合实验「众筹合约」：目标金额/截止时间/退款逻辑，fuzz + invariant 全覆盖，部署 Sepolia 并验证（用上 3.2~3.8 全部技能：Bank 系合约 + vm.warp 测截止 + invariant 守恒 + forge script + verify）
- [ ] 口述 Solidity 数据位置与 Gas 的关系（2.3 + 3.3 两篇的实测账）

> 一句话收口：**Sepolia 是主网的彩排厅，验证是给世界的可读性承诺——七步清单走完，你就是「合约在公网上活着」的工程师了。**

---

## 小结

1. **部署本质**：to 空、data 装 initcode 的交易；constructor 在安装期跑，常驻的是 runtime。
2. **forge script**：startBroadcast 分界模拟/真实、broadcast 目录留档、网络是参数——先干跑再广播。
3. **私钥三选一**：env/keystore/硬件钱包，明文永不上镜，身份分环境。
4. **两条地址规则**：CREATE 问「谁、第几次」；CREATE2 问「在哪、什么料、什么代码」——确定性换预知与跨链一致。
5. **实测对账**：手算 0xa94c…b71a = factory 实部署 0xa94c…b71a；踩的坑：factory 是 **20 字节**输入。
6. **骗术边界**：CREATE2 撞不出任意地址，但「先地址后代码」要求你转账前查 code。
7. **Sepolia/Etherscan 作业**：七步清单；验证 = 源码与 bytecode 的公开对账，给世界可读性。

**验收清单**（本篇）：

- [ ] 全流程独立完成：脚本部署 → 浏览器可读可交互 → 源码验证通过（第 6 课清单在 Sepolia 走完）
- [ ] 能解释 CREATE 与 CREATE2 生成地址的差别（第 4 课公式 + 第 5 课对账）

**思考题**：同一份 initcode、同一个 salt、同一个 factory——在以太坊主网和 Arbitrum 上会得到相同地址吗？initcode 里如果嵌了 `block.chainid` 呢？（提示：公式输入只有三样，链 id 不在其中；但 initcode 本身变了地址就变——跨链部署工具为什么要「冻结」编译环境？）

下一篇：[《ERC-20 与 OpenZeppelin：亲手发一个代币》](/web3区块链/04-tokens/tokens-01-erc20)——阶段 4 开讲：全行业复用的合约标准，从你自己的第一个代币开始。

---

## 本篇实验（可照抄）

```bash
# Deploy.s.sol / Factory.sol 见第 2、5 课；本地全流程
PRIVATE_KEY=0xac09…ff80 forge script script/Deploy.s.sol \
    --fork-url http://127.0.0.1:18545 --broadcast
ls broadcast/Deploy.s.sol/31337/        # 部署档案

# CREATE2 三步（第 5 课）
forge create src/Factory.sol:Factory --rpc-url … --private-key … --broadcast
INIT=$(python3 -c "import json; b=json.load(open('out/BankV2.sol/BankV2.json'))['bytecode']['object']; print(b[2:])")
# 手算：addr = keccak(0xff ++ factory(20B!) ++ salt ++ keccak(initcode))[12:]
cast send $FACTORY "deploy(bytes,bytes32)" 0x$INIT \
  0x000000000000000000000000000000000000000000000000000000000000c0de \
  --rpc-url … --private-key …
cast logs --from-block 1 'Deployed(address,bytes32)' --address $FACTORY --rpc-url …   # 对账
```

---

## 参考资料

- [Foundry Book — Deploying / forge script](https://book.getfoundry.sh/forge/deploying)、[forge verify-contract](https://book.getfoundry.sh/forge/verifying-contracts)
- [EIP-1014 — CREATE2](https://eips.ethereum.org/EIPS/eip-1014)（第 4 课公式的原文）
- [Sepolia 水龙头与 Etherscan API](https://sepolia.dev/)（第 6 课作业入口）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36（CREATE2 对账实录：0xa94c…b71a）
