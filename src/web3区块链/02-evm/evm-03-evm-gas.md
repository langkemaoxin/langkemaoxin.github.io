---
title: "EVM 执行模型与 Gas：逐条执行一笔交易（师生对话实录）"
sidebarGroup: "以太坊核心"
shortTitle: "03 EVM 与 Gas"
order: 3
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "以太坊"
  - "EVM"
  - "对话实录"
description: 师生对话实录课：把 EVM 拆成「栈 + 内存 + calldata + storage」四个格子，用 GasLab 合约实测 calldata 与 memory 差 40%、读动态变量比 constant 贵 4.7 倍——每个语法选择从此有价格标签，全部 forge build/test 实跑。
---

> **Web3 区块链系列 · 阶段 2 · 以太坊核心 · 第 12/57 篇**
> 上一篇：[《交易全解：类型、签名与 EIP-1559 费用》](/web3区块链/02-evm/evm-02-transactions) · 下一篇：[《节点与 JSON-RPC：亲手当一次客户端》](/web3区块链/02-evm/evm-04-nodes-rpc)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

上一篇发交易时冒出的 `gasUsed 21000` 我一直没追问：**这个数怎么来的？** 更大的疑问是圈子里那句老话——「同样的功能，有人写花 50 万 gas、有人只花 10 万」。差 5 倍的钱差在哪？

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课把 EVM 拆开看（它就是一台计算机，部件比你想象的少），再写一个 GasLab 合约**实测**几组写法差价——从此写 Solidity 时每个选择都自带价签。

课程路线图：

> ① EVM 的四个格子 → ② 字节码与选择器实查 → ③ Gas 价目表 → ④ 实测：calldata vs memory → ⑤ 实测：constant/immutable vs 动态变量 → ⑥ out of gas 与回滚 → ⑦ 为什么这么定价

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + **Solidity 0.8.36**（solc 手动安装实录见脚注）；实验项目 `/root/w3-lab2`（forge init，forge-std v1.16.2）。官方：[EVM Playground 文档](https://www.evm.codes/)——本篇反复对照的价目表。

---

## 第 1 课：EVM 的四个格子——一台极简计算机

**🧑‍🏫 老师：**

先把神话卸掉：EVM 是一台**字长 256 位的栈式计算机**，部件列表短到一张名片：

```text
┌─ EVM（每笔交易执行时现场搭一台）───────────────┐
│                                                │
│  ① 栈 stack：256 位 × 最多 1024 层             │ ← 算术、逻辑全在这做
│     （PUSH/POP，几乎每个 opcode 的舞台）        │
│                                                │
│  ② 内存 memory：临时字节数组，交易结束即焚       │ ← 函数内的临时变量、
│     （按 32 字节 word 扩容，越用越贵）           │   动态数据的副本
│                                                │
│  ③ calldata：交易带来的只读数据                 │ ← 上篇那坨「选择器+参数」，
│     （不可写、最便宜、用完即弃）                 │   只能读不能改
│                                                │
│  ④ storage：合约的持久仓库                     │ ← 状态变量住这，
│     （32 字节一格的 key-value，全网永久保存）     │   最贵、上篇说的「状态」
│                                                │
│  ⑤ 程序：合约的 bytecode（只读，存在账户 code）  │
└────────────────────────────────────────────────┘
```

对照 Bitcoin Script（1.3 篇）看血缘：同样是栈机，**比特币删掉了循环和内存**（图灵不完备），**以太坊全留着但每一步明码标价**（Gas）——1.4 篇那句「用经济约束替代物理约束」的兑现。

「你在 Solidity 里写的东西住哪」，一张速查表钉住（3.3 篇整篇展开赋值语义）：

| 你写的 | 住哪 |
|---|---|
| 函数参数（数组/string） | calldata（可指定 memory） |
| 函数里的局部变量（值类型） | 栈 |
| 函数里的临时数组/结构体副本 | memory |
| 状态变量（合约级） | storage |

> 一句话收口：**EVM = 256 位栈机 + 两个易失区（memory/calldata）+ 一个持久区（storage）；Solidity 的变量声明位置，就是给这四个格子选房间。**

---

## 第 2 课：字节码实查——你的 Solidity 变成了什么

**🧑‍🎓 学生：** 编译之后到底发生了什么？「函数」这个概念在 EVM 里还存在吗？

**🧑‍🏫 老师：**

**不存在**。Solidity 的每个函数在字节码里只是一段「标签地址」，靠上篇插问 1 的**选择器**路由。实测——刚才的 GasLab 编译后查方法标识符：

```bash
forge inspect GasLab methodIdentifiers
```

```text
╭------------------------+------------╮
| Method                 | Identifier |
+=====================================+
| dynamic()              | 4bd54f04   |
| nums(uint256)          | fd1ee54c   |
| readConstant()         | e69b67ab   |
| readDynamic()          | 6da30dba   |
+ ...                                   
```

每个标识符 = `keccak256("函数名(参数类型)")[0:4]`——上篇说的「合约靠 data 前 4 字节认函数」，这些就是那张对照表（可以 `cast keccak "readConstant()"` 验证，截前 8 位 hex 就是 e69b67ab）。

调用的完整旅程串起来：

```text
你的交易 data:  e69b67ab…
                  │
合约字节码开头:  CALLDATASIZE / CALLDATALOAD ← 读 data
                  ↓
              4 字节与编译期跳转表逐一比对（EVM 无 hash 表，就是一串比较）
                  ↓
              JUMP 到 readConstant() 的代码段
                  ↓
              执行 opcode（PUSH1 0x65 …）→ RETURN
```

Solidity 语句到 opcode 的对应关系，两条最典型的映射先记着（完整对照用 `forge debug` 单步跟，3.7 篇实战）：

- `s += arr[i]` → 一串 `SLOAD`（读格）/ `ADD` / `SSTORE`（写格）；
- 函数调用（同合约内）→ 编译器直接 **JUMP**（不产生新调用上下文）；跨合约调用 → `CALL`/`STATICCALL`（新开一台 EVM）。

> 一句话收口：**字节码里没有「函数」，只有选择器路由到的一段段代码；Solidity 语句 = opcode 序列的糖衣——糖衣多少钱一斤，下一课标价。**

---

## 第 3 课：Gas 价目表——每条指令都有价签

**🧑‍🎓 学生：** Gas 的「价」到底怎么定？为什么有的指令贵几十倍？

**🧑‍🏫 老师：**

Gas 是**执行成本的抽象单位**（不是 ETH，1 gwei = 10⁹ gas 的换算是市场定的）。定价哲学一句话：**让节点最疼的操作最贵**。抽几档看（[evm.codes](https://www.evm.codes/) 全表）：

| 档位 | 代表 opcode | 定价（gas） | 为什么这个价 |
|---|---|---|---|
| 几乎免费 | `ADD`、`NOT`、比较 | 3 | 纯 CPU，纳秒级 |
| 便宜 | `CALLDATALOAD` | 3 | 读交易自带的只读数据 |
| 中档 | `MLOAD`/`MSTORE`（内存） | 3 + 扩容费 | 内存易失，但扩容要计费防滥用 |
| **贵** | `SLOAD`（读 storage） | 冷 2100 / 热 100 | **全网要永久保持这份数据的一致性** |
| **天价** | `SSTORE`（写 storage，0→非0） | 20000 起 | 改的是**世界状态**，每个全节点都要存到磁盘 |
| 开销王 | `CREATE`/`CALL` 跨合约 | 2600~32000 起 | 新执行上下文 + 预冻结 gas |

三档价差背后是 2.1 篇第 6 课的伏笔兑现：**CPU 操作只疼一下，状态修改疼一辈子**——21000 那个「转账底价」（上篇）拆开就是 21000 ≈ intrinsic（基本费 21000 含签名校验等固定开销），合约调用在此基础上叠加 opcode 计费。

冷/热（cold/warm）之分也顺带理解：同一笔交易里**第一次**碰某存储槽（冷）2100，**同一交易内再碰**（热）只 100——激励「一次交易里批量做完」，也解释了为什么「缓存到局部变量再算」是万能优化（第 5 课实测）。

> 一句话收口：**Gas 价目 = 按节点疼痛定价：CPU 几乎白送，读状态中等，写状态天价——「贵的东西永久、便宜的东西易失」。**

---

## 第 4 课：实测一——calldata vs memory，同一功能差 40%

**🧑‍🎓 学生：** 上理论了，来实数。同一个「数组求和」，参数用 calldata 和 memory 差多少？

**🧑‍🏫 老师：**

写一个 GasLab，两个函数**除参数位置外一字不差**：

```solidity
contract GasLab {
    function sumCalldata(uint256[] calldata arr) external pure returns (uint256 s) {
        for (uint256 i = 0; i < arr.length; i++) s += arr[i];
    }
    function sumMemory(uint256[] memory arr) external pure returns (uint256 s) {
        for (uint256 i = 0; i < arr.length; i++) s += arr[i];
    }
}
```

`forge test --gas-report` 本机实测（5 个元素的数组求和）：

```text
| Function Name | Min  | Avg  |
|---------------|------|------|
| sumCalldata   | 2223 | 2223 |
| sumMemory     | 3721 | 3721 |
```

**3721 − 2223 = 1498 gas，calldata 省 40%**。差价从哪来？`memory` 版在函数入口要**把整个数组从 calldata 拷贝进内存**（分配 + 逐字复制），然后才能开始算；`calldata` 版直接原地读——「只读的数据不搬家」值这么多钱。数组越长差价越大（拷贝费 ∝ 长度）。

结论落成军规：**只读参数永远写 `calldata`**——它是 Solidity 里少数「零风险纯省钱」的选择（3.3 篇数据位置课的定量地基）。

> 一句话收口：**同功能实测 calldata 2223 vs memory 3721——省的是「搬数组进内存」的拷贝费；只读参数无脑 calldata。**

---

## 第 5 课：实测二——读一个变量，三种价

**🧑‍🎓 学生：** 那合约自己的状态变量呢？听说 constant 特别便宜？

**🧑‍🏫 老师：**

三兄弟一起测——同一个「读出来 +1 返回」的功能，用三种方式存：

```solidity
uint256 constant C = 100;      // constant：编译期常量，根本不存在 storage
uint256 immutable I;           // immutable：部署时写死进字节码
constructor() { I = 42; }
uint256 public dynamic = 7;    // 动态：真正的 storage 变量

function readConstant()  external pure returns (uint256) { return C + 1; }
function readImmutable() external view returns (uint256) { return I + 1; }
function readDynamic()   external view returns (uint256) { return dynamic + 1; }
```

本机实测：

```text
| Function Name | Avg |
|---------------|-----|
| readConstant  | 561 |
| readImmutable | 584 |
| readDynamic   | 2662 |
```

**读动态变量比 constant 贵 4.7 倍**。原因拆开：

- `constant`：**编译时直接把 100 写进字节码**（`PUSH1 0x64`）——storage 里根本没有它，读它 = 读程序自己；
- `immutable`：值在部署时嵌进 code 副本——同样一次 PUSH 的价；
- `dynamic`：一次真的 `SLOAD`（还要先算槽地址）——**touch 了世界状态**，按价目表付费。

推论直接可执行：**写死的配置用 constant、部署时确定的参数用 immutable、运行中会变的才用普通变量**。1.2 篇难度调整「没有捷径，纯试」的对照在这里很有喜感：Solidity 里最大的捷径就是「别真的碰存储」。

（第三组数据也放上：每圈都从 storage 读的 `sumStorageNaive` 8475 gas——对比第 4 课的纯 calldata 版 2223，**慢在每圈的冷热 SLOAD 上**。优化套路「函数开头一次性读到局部变量」由 3.3 篇定量展开。）

> 一句话收口：**constant/immutable 是「写进程序」、动态变量是「住进世界状态」——一个 PUSH 和一次 SLOAD 的差价，4.7 倍。**

---

## 插问 1：gasLimit 花完了会怎样？「回滚」到底回滚了什么？

**🧑‍🎓 学生：** 上篇说 gasLimit 是「肯付的上限」——真跑到一半没钱了，发生什么？

**🧑‍🏫 老师：**

这是 EVM 最重要的一条异常路径，叫 **out of gas**：

```text
执行中 gas 计数器扣到 0，而 opcode 还没跑完
   ↓
EVM 立即停机，整笔交易 REVERT
   ↓
回滚什么：
   ✓ 本交易造成的所有 storage 变更 —— 全部撤销（S' 作废，状态回到 S）
   ✓ 本交易发出的 ETH 转账 —— 撤销
   ✘ 已消耗的 gas 费 —— 照！扣！不！退！
```

「状态退回、油钱不退」是精心设计的：**节点已经真实跑了这些指令**（烧了电），不能白干；同时「全撤销」保住了原子性（2.1 篇第 3 课：没有改一半的状态）。你付的钱买到的不是「结果」，是「尝试」。

这条规则反过来塑造了整个生态的行为：

- **钱包的 gas 估算**：先 `eth_estimateGas` 模拟一遍再签名，就是为了别签出一个会 out-of-gas 的交易；
- **合约里的循环要小心**：1.3 篇说比特币没有循环是「物理封印」，以太坊有循环但**跑不完就回滚还扣钱**——经济上同样封死了「无限循环拖垮节点」；
- **DoS 攻击的经济学**：想用昂贵交易拖节点？先押上 gas 押金——攻击者自己先破产。

> 一句话收口：**out of gas = 状态全回滚、油钱不退——原子性和「节点不能白干」同时成立；「付费买的是尝试，不是结果」。**

---

## 插问 2：为什么要把「读」和「写」的价差拉到 20 倍？定价背后是什么账？

**🧑‍🎓 学生：** SLOAD 2100、SSTORE 20000——差一个数量级。这价是谁定的、按什么逻辑？

**🧑‍🏫 老师：**

价是**硬编码进协议的**（各 EIP 逐步调整：EIP-150、EIP-2929、EIP-3529 都动过刀），逻辑是一笔「全网的账」：

- **写贵，因为写是永久的**：一次 SSTORE = 每个全节点往磁盘上写一笔、往后每次快照都要带着它（2.1 篇状态增长）。20k gas 是在向全网的未来存储成本付费——你今天写的一格，节点们要存很多年；
- **读次贵，因为读要走状态树**：一次 SLOAD 不是读个变量，是从几百 GB 的默克尔树里找到那格并取值（2.5 篇）——冷读 2100 是磁盘与树查找的钱；
- **计算便宜，因为算完就完**：ADD 烧的是一瞬间的 CPU，不留痕迹。

于是整套定价其实是一个**行为引导系统**：贵的东西恰好是「伤害去中心化的东西」（让状态膨胀、让节点变贵）——1.4 篇插问 1「区块大小 = 向所有节点永久征的税」的 gas 微缩版。你在 3.x 篇做的每个「gas 优化」，本质都是在替全网减负。

（一个诚实的脚注：SSTORE 在「清零」时会退一部分 gas——EIP-3529 之前退更多，现在退得少了；鼓励清理状态的力度一直在权衡。这属于进阶细节，知道「写贵、清也贵」就够用。）

> 一句话收口：**Gas 定价 = 全网成本的分摊表：写最贵（永久存储）、读次贵（树查找）、算最便宜（烧完即逝）——贵的东西恰好都在伤害去中心化。**

---

## 第 6 课：EVM 的「目标版本」——prague 是什么

**🧑‍🎓 学生：** foundry.toml 里见过 `evm_version = "prague"`，还有 shanghai/cancun——EVM 也分版本？

**🧑‍🏫 老师：**

分，而且直接决定**你的字节码能用哪些 opcode**。EVM 随硬分叉逐次添加指令（就像语言标准库的版本）：

| evm_version | 硬分叉 | 新能力（示例） |
|---|---|---|
| shanghai | Shanghai 2023 | `PUSH0`（一个字的便宜推送） |
| cancun | Dencun 2024 | blob 相关（`BLOBHASH`）、`TSTORE`（临时存储） |
| **prague** | **Pectra 2025**（当前默认） | 7702 相关系统操作 |
| osaka | Fusaka 2025-12 | PeerDAS 相关（8.2 篇） |

两层实务影响：

- **编译器检查**：用了新版特性（如 `PUSH0`）但目标版本填 shanghai 之前——编译直接报错；反过来，**部署到旧链**（比如某些还没升级的 L2）时要手动降版本，否则字节码里有对方不认识的 opcode，交易必失败——跨链部署的经典坑；
- **「Solidity 0.8.30 起支持 prague 目标」**这类版本说明，说的就是编译器与新 EVM 版本的对应——总纲「版本口径」里 Solidity 0.8.36 / Foundry 1.7 / prague 目标这一整套对齐了才省心。

> 一句话收口：**EVM 版本 = opcode 集的档位；编译目标、部署链、工具链三者的版本要对齐——错位就是「字节码对方不认识」。**

---

## 小结

1. **四个格子**：栈（算）、memory（临时）、calldata（只读）、storage（永久）——Solidity 声明位置 = 选房间。
2. **字节码里没有函数**：选择器路由到代码段；`methodIdentifiers` 实查了 GasLab 的每张门牌。
3. **价目哲学**：CPU 白送、读状态中等、写状态天价——「永久的东西最贵」。
4. **实测一**：calldata 2223 vs memory 3721（省 40%）——只读参数永远 calldata。
5. **实测二**：constant 561 / immutable 584 / dynamic 2662（4.7 倍）——能写进程序就别住进状态。
6. **out of gas**：状态全回滚、油钱不退——原子性与「节点不白干」并存。
7. **定价的账**：贵的东西恰好伤害去中心化——gas 优化 = 替全网减负。
8. **EVM 版本**：opcode 档位随硬分叉增长，编译目标与部署链必须对齐。

**验收清单**（做完再进下一篇）：

- [ ] 能把一段简单 Solidity 编译后的 opcode 与源码行对应起来（用 `forge inspect … methodIdentifiers` + [evm.codes](https://www.evm.codes/) 对照第 2 课映射）
- [ ] 能解释「为什么存储读写最贵、calldata 最便宜」（插问 2 的全网成本账）

**思考题**：`uint256` 数组循环求和，把循环上限写成 `arr.length`（每圈读一次）和先存进局部变量 `uint256 len = arr.length` 再用——哪个省 gas？省在哪类 opcode 上？（提示：calldata 长度读是免费的 `CALLDATALOAD`；但如果 arr 是 storage 数组呢？）

下一篇：[《节点与 JSON-RPC：亲手当一次客户端》](/web3区块链/02-evm/evm-04-nodes-rpc)——绕过 MetaMask，直接跟节点对话：查、读、发三件事，再fork 主网当王爷。

---

## 本篇实验（可照抄）

```bash
# 项目（3.1 篇 forge init 的产物）
forge init w3-lab2 && cd w3-lab2
# 注：若 forge 自动装不上 solc 0.8.36，手动放二进制到 ~/.svm/0.8.36/
#   https://binaries.soliditylang.org/linux-amd64/list.json 查路径 → 下载 → chmod +x

# 合约与测试见正文第 4、5 课；跑价签
forge build
forge test --gas-report            # 本篇所有实测数字的来源
forge inspect GasLab methodIdentifiers   # 函数门牌（选择器）

# 交互验证（选器器对照）
cast keccak "readConstant()"       # 截前 8 位 = e69b67ab
```

（GasLab.sol / GasLab.t.sol 全文见第 4、5 课代码块，可整段粘贴。）

---

## 参考资料

- [evm.codes — opcode 与 Gas 价目表](https://www.evm.codes/)（本篇的对照圣经，按分叉版本切换）
- [ethereum.org — EVM](https://ethereum.org/zh/developers/docs/evm/)、[Gas](https://ethereum.org/zh/developers/docs/gas/)
- [EIP-2929（冷热访问定价）](https://eips.ethereum.org/EIPS/eip-2929)、[EIP-3529（退款缩减）](https://eips.ethereum.org/EIPS/eip-3529)（插问 2）
- Solidity 0.8.36 二进制：[binaries.soliditylang.org](https://binaries.soliditylang.org/linux-amd64/list.json)（本机手动安装实录见脚注）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36（forge-std v1.16.2）
