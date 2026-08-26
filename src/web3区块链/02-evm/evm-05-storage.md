---
title: "状态存储：MPT、RLP 与存储槽（师生对话实录）"
sidebarGroup: "以太坊核心"
shortTitle: "05 状态存储"
order: 5
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "以太坊"
  - "EVM"
  - "对话实录"
description: 师生对话实录课：部署 StorageLab 逐 slot 读取，看两个 uint64 挤一间房、mapping 的本体槽永远是 0、数组元素住在 keccak 出来的街区分支号——把「几百 GB 世界状态存在哪、轻节点凭什么只下载区块头」一次讲透，阶段 2 收官。
---

> **Web3 区块链系列 · 阶段 2 · 以太坊核心 · 第 14/57 篇（阶段 2 收尾）**
> 上一篇：[《节点与 JSON-RPC：亲手当一次客户端》](/web3区块链/02-evm/evm-04-nodes-rpc) · 下一篇：[《Foundry 上手：forge、anvil、cast、chisel》](/web3区块链/03-solidity/solidity-01-foundry-setup)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

阶段 2 还剩两块没拆的暗物质：几百 GB 的「世界状态」**存在什么结构里**（轻节点凭什么只下载区块头就能验证一笔交易）？以及——写 Solidity 时那些状态变量，**到底住在哪**？老师说后者是 3.x 篇 gas 优化的地基，我就更不敢跳过了。

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课部署一个「户型齐全」的合约，把每个变量的房间号逐一读出来——其中有两个发现（打包和 mapping 的空槽）相当反直觉。

课程路线图：

> ① 三棵树与区块头 → ② MPT：能查能证的字典 → ③ RLP 一眼看懂 → ④ 存储槽实测：值类型与打包 → ⑤ mapping 与数组的神秘街區 → ⑥ 这一切买到什么

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；实验合约部署在本地 anvil（`0xDc64…F6C9`，2026-08-26 实跑）。官方：[Data structures](https://ethereum.org/zh/developers/docs/data-structures-and-encoding/)。

---

## 第 1 课：三棵树与区块头——一个块拍了三张指纹照

**🧑‍🏫 老师：**

0.2 篇的默克尔树在比特币管**一个块里的交易**；以太坊把它升级成三棵，一棵管一样东西：

```text
                        ┌─── 以太坊区块头（拍三张指纹照）───┐
                        │                                   │
        stateRoot ──────┤      transactionsRoot ────────────┤      receiptsRoot
        世界状态树       │      交易树（本块的交易）          │      收据树（本块的执行回执）
        「现在所有人的    │      「这个块里发生了什么」         │      「执行结果：成功/失败、
         一切状态」      │      （树根 = 算出来的）           │       事件日志」）
                        └───────────────────────────────────┘
```

三张照各自的用途：

- **stateRoot**：全网的「世界状态」那张大表（2.1 篇）被组织成一棵树，stateRoot 是它的总指纹——**每出一个新块，状态变，根就变**。「区块头链 + 每块一个 stateRoot」= 完整的世界历史；
- **transactionsRoot**：本块交易的默克尔根（比特币同款）——证明「这笔交易确实在这个块里」的依据（0.2 篇 SPV 的以太坊直系亲属）；
- **receiptsRoot**：执行回执的根——你查「这笔交易成功了吗、它触发了什么事件」走这棵树。

轻节点的底气就来自这个结构：**只下载区块头**（每块 ~500 字节，17 年全头才几十 MB），就同时握住三条「总指纹链」；要验证什么，向全节点要一条**默克尔证明**（0.2 篇第 5 课你手写过的那种），对暗号即可。以太坊版的 SPV。

> 一句话收口：**区块头 = 三张指纹照（state/transactions/receipts）；轻节点握住头链就握住一切的总指纹，验证靠证明不靠下载。**

---

## 第 2 课：MPT——既能查找又能证明的字典

**🧑‍🎓 学生：** 比特币的默克尔树只管「证明在不在」，以太坊的状态树还要「按地址查找」——树怎么同时干两件事？

**🧑‍🏫 老师：**

这就是以太坊的魔改：**默克尔帕特里夏树（Merkle Patricia Trie，MPT）**——「字典的查找效率 + 哈希树的防篡改」杂交体。直觉版拆解：

```text
普通字典（hash map）：查找 O(1)，但没法证明 —— 无根可对
普通默克尔树：        可证明，但按内容排序，查找像二分 —— 慢
MPT：               按键（地址/槽号）的十六进制字符逐层分叉
                    （0-f 共 16 路 + 叶子标记 = 帕特里夏压缩）
                    → 查找是「顺着地址一位位走下去」
                    → 每个节点的内容参与哈希 → 根指纹照常防篡改
```

两个设计收益直接对应你学过的痛点：

- **增量更新便宜**：改一个账户的状态，只需要重算「从那个叶子到根」的一条路径上的哈希（不是重算整棵树）——每出一个块动几万个账户，MPT 让 stateRoot 的更新成本与改动量成正比；
- **路径即前缀**：地址 `0xAB…` 的数据就在「A→B→…」的树枝上——「槽号怎么变成树路径」的答案，也是下一课存储槽的伏笔。

（诚实标注：MPT 是出了名的难实现、性能有诟病，历史上多次提议替换；共识层已经用了新的 **SSZ** 结构，执行层的替换（如 STARK 友好树）还在路线图上。了解级——知道「MPT 是工程妥协的产物、不是完美设计」就够。）

> 一句话收口：**MPT = 字典的查找 + 哈希树的证明，改一条路径只重算一条路径——「能查能证」是状态树的双重身份。**

---

## 第 3 课：RLP——看懂即可的打包带

**🧑‍🎓 学生：** 树里的节点终究是字节串——「结构」怎么变成「字节」？

**🧑‍🏫 老师：**

**RLP（Recursive Length Prefix）**，执行层的序列化格式。规则出奇地短（不用会写，要能认）：

```text
单字节 < 0x80        → 原样
短内容（≤55 字节）   → 0x80+len + 内容          例: "abc" → 0x83 61 62 63
长内容（>55 字节）   → 0xb7+len的长度 + len + 内容
列表                 → 0xc0+总长 + 各元素的 RLP  例: ["abc"] → 0xc4 0x83 61 62 63
```

一个真实样本（0.1 篇拉过的账户数据按 RLP 组织）：

```text
账户的 RLP = RLP([nonce, balance, storageRoot, codeHash])
           = 列表头 + 四个字段各自的 RLP 依次拼接
```

它在哪些地方出场：**交易签名前**的规范化序列化（2.2 篇第 6 课：keccak256(RLP(交易)) 再签）、**树节点**的存储格式、网络上传输的原始形态。配套命令一条：`cast decode-rlp` / `cast encode-rlp`——遇到一坨 0xc7 0x8a… 开头的东西（`0xc0+` 前缀），认出「这是 RLP 的列表」就毕业了。

（以太坊生态的新方向是 **SSZ**（共识层）与 ABI（合约接口）——它们解决各自场景的问题，RLP 仍是执行层的底层打包带。三代序列化并存，各有领地。）

> 一句话收口：**RLP = 长度前缀打包带：树节点和交易签名的字节化方式；认得出 `0x80+/0xc0+` 前缀即达标。**

---

## 第 4 课：存储槽实测——变量住哪间房

**🧑‍🏫 老师：**

下半场进 EVM 视角。**合约的 storage 是一个 2²⁵⁶ 个槽的巨大数组**，每槽 32 字节——Solidity 编译器按规则给每个状态变量分配槽号。部署一个「户型齐全」的合约（本地 anvil 实跑）：

```solidity
contract StorageLab {
    uint256 public a;                            // 声明顺序决定户型
    uint64 public b;
    uint64 public c;
    address public owner;
    mapping(address => uint256) public balances;
    uint256[] public items;
    // set(111,222,333) / push(7) / push(8) / setBal(A1, 555) 已执行
}
```

`cast storage`（= `eth_getStorageAt`）逐槽读：

```text
===== 逐 slot 读取 =====
slot 0 = 0x…000000000000000000000000000000000000000000000000000000000000006f   ← 0x6f = 111（a）
slot 1 = 0x00000000000000000000000000000000000000000000014d00000000000000de   ← 打包！拆开见下
slot 2 = 0x000000000000000000000000000000000000000000000000f39fd6e5…2266     ← owner 地址
slot 3 = 0x0000…0000                                                          ← mapping 本体：空？！
slot 4 = 0x…0002                                                              ← 数组长度 = 2
```

两个反直觉的发现，各自一课（第 5 课讲 slot 3 为什么空）：

**发现一：slot 1 住了两个变量**。拆开那串十六进制：

```text
slot 1 = 0x00000000000000000000000000000000000000000000014d 00000000000000de
         └──────────── 高 32 字节 ────────────────────┘ └──── 低 32 字节 ───┘
         c = 0x14d = 333                                  b = 0xde = 222
```

**打包（packing）**：`uint64` 只占 8 字节，两个正好挤进一个 32 字节的槽——b 占低位、c 顺次往上摞。省的是真金白银：一个 SSTORE 写两个变量，20000 gas 一间房住两户。规则总结：**小于 32 字节的相邻变量按声明顺序从低位打包，塞不下才开新槽**。

**发现二：变量声明顺序就是户型图**。a→0、b/c→1、owner→2、balances→3、items→4，**从 slot 0 顺次分配**。推论即刻可用：调整声明顺序能改变打包效果（把 5 个 uint64 排一起 = 一槽塞五个）——3.x 篇 gas 优化的第一板斧。

> 一句话收口：**storage = 2²⁵⁶ 个 32 字节槽，声明顺序即户型；小类型挤槽（打包）省的是 SSTORE 的真金。**

---

## 第 5 课：mapping 与数组——数据住在 keccak 出来的街区分

**🧑‍🎓 学生：** slot 3 是 mapping，为什么读出来是空的？balances[A1]=555 明明写进去了！

**🧑‍🏫 老师：**

因为 **mapping 的本体槽里永远只有 0**——它的数据根本不住在声明槽里。位置规则：

```text
mapping(address => uint256) 声明在 slot 3
 balances[某地址] 的真实槽 = keccak256( abi.encode(某地址, 3) )
                              └── 把「键」和「声明槽号」拼起来哈希 ──┘
```

实测验证（cast index 就是干这个的）：

```text
balances[A1] 槽 = 0x9c35da83f88043b3115f30d93beacec49ca14b6238430bdff196a249c29baa80
  值 = 0x…022b        ← 0x22b = 555 ✓ 精确命中
```

这个设计的深意值得停一分钟：

- **无边界**：任何键哈希出一个合法槽——mapping 天然「无限大」，不用预分配，也**无法遍历**（不知道有哪些键——3.4 篇「键集合模式」的由来）；
- **防碰撞**：不同键、不同槽，靠 keccak 的抗碰撞性保证不撞车（0.2 篇第一课的伏笔）；
- **初始为零**：没写过的键读出来就是 0（槽默认值）——Solidity「mapping 不存在默认 0」语义的物理基础。

动态数组是第三种户型（本机实测）：

```text
uint256[] items 声明在 slot 4
slot 4 的值 = 2                              ← 这间房只住【长度】
元素数据从 base = keccak256(uint256(4)) 开始连续排列：
  items[0] 槽 = 0x8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b  → 值 7 ✓
  items[1] 槽 = 0x8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19c  → 值 8 ✓（+1！）
```

数组的规则和 mapping 是**同门数学、不同摆法**：同样用 keccak 把「声明槽」散射出一个基地址，但数组元素从 base 开始**连续编号**（+0、+1、+2…），而 mapping 的每个键各自独立散射。为什么要散射而不是顺序住？——顺序住会把「数组多长」和「数组在哪」绑死，散射让两者解耦：**长度变了（slot 4 的数字改了），老数据一个都不用搬**。

（顺带解锁一个技能：既然槽号是纯数学，**任何人都能直接读任何合约的任何状态变量**——不经过 getter 函数。3.4 篇你会用它读出「没写 getter 的私有变量」；6 篇会用它做状态断言。链上没有真正的私密，只有哈希的遮挡。）

> 一句话收口：**mapping 本体槽为空，值住在 keccak(key, slot)；数组槽只放长度、元素从 keccak(slot) 连续排——散射让「在哪」和「多长」解耦，槽号是公开的数学。**

---

## 插问 1：这些「街区分」地址的 keccak 计算，节点每查一次都要算一遍吗？

**🧑‍🎓 学生：** 一次 SLOAD 之前还要先 keccak 一把——这不白费吗？

**🧑‍🏫 老师：**

是的，**每次访问 mapping 元素和数组元素，EVM 都要先算一次 keccak 定位**——它就是价目表里 SLOAD 前 那 30~100 gas 的 `KECCAK256` 开销的来源（2.3 篇 gas report 里函数的真实成本，一部分是「找房间」的钱，一部分才是「读房间」的钱）。

三个工程后果顺出来：

- **mapping 的读天然比定长变量贵一点**（定长变量的槽号是编译期常量，PUSH 就行）——差距不大，但海量调用时可见；
- **嵌套 mapping 逐层哈希**：`mapping(address => mapping(address => uint256))`（ERC-20 的 allowance 就是）——定位一次要两层 keccak，槽号 = keccak(keccak(owner, slot) 拼 spender…)——这是「嵌套查一次、外层先算好」这类微优化的来源；
- **临时存储 TSTORE（cancun 后）的诱惑**：同笔交易内反复访问的值，cancun 硬分叉加了「临时存储」（交易结束即清、读写便宜得多）——7.x 的 Uniswap v4 拿它存锁——8.2 篇的客串嘉宾。

> 一句话收口：**散射不是免费的：每次访问先付 keccak 的「找路费」——价目表里那点开销，就是数学的房钱。**

---

## 第 6 课：这一整套买到什么——把阶段 2 缝合

**🧑‍🎓 学生：** 收官吧——从三棵树到槽号，这套机制到底「买到」了什么？

**🧑‍🏫 老师：**

把阶段 2 五篇拼成一张完整的图，你会看到每一层都在为同一句话服务：

```text
一笔交易的完整旅程（阶段 2 总图）：

钱包签名（2.2：RLP+ECDSA，nonce 防重放，chainId 防跨链）
   ↓ eth_sendRawTransaction
节点收单 → 内存池按 nonce 排队（2.2）
   ↓ 打包进块
验证者出块：区块头带三棵树的根（本篇第 1 课）
   ↓
执行层跑 EVM：栈/内存/calldata/storage 四格逐 opcode 计价（2.3）
   ↓ storage 槽被改写（本篇第 4、5 课）
状态树更新 → stateRoot 变化 → 下一块的历史焊死
   ↓
任何人：全节点重放验证 / 轻节点凭证明验证（MPT 的功劳）
```

**买到的东西一句话：不用信任任何人的验证体系**——全节点重放一遍是「亲自算」，轻节点要证明是「抽查验指纹」，两条路都通向同一个真相，且都没有「因为某某说了算」。这是 0.1 篇「信任锚从机构移到数学」的全部工程兑现。

阶段验收的两条，现在应该闭眼都能画了：

- [ ] **脱稿讲清一笔交易从钱包签名到 EVM 执行再到状态更新的完整旅程（含费用构成）**——上图 + 2.2 的 baseFee/priorityFee 账
- [ ] （附加自检）说出 eth_call 与 eth_sendRawTransaction 的本质区别（2.4 第 3 课：本地试跑 vs 共识劳动）

> 一句话收口：**树买「可证明」，槽买「可寻址」，Gas 买「可计价」——阶段 2 整体买下「不信任任何人的验证」，阶段 3 开始，轮到你在上面盖房子。**

---

## 小结

1. **三棵树**：stateRoot / transactionsRoot / receiptsRoot——区块头拍三张指纹照；轻节点只存头链。
2. **MPT**：字典查找 + 哈希证明的杂交体；改一条路径只重算一条路径（SSZ 是共识层的新答案，了解）。
3. **RLP**：长度前缀打包带——交易签名与树节点的字节化；认得 `0xc0+` 前缀即毕业。
4. **槽位规则**（实测）：声明顺序即户型；小类型从低位打包（b=222 低、c=333 高，一槽两户）。
5. **mapping**（实测）：本体槽永远为 0，值在 keccak(key, slot)——无边界、不可遍历、初始即零。
6. **动态数组**（实测）：声明槽只放长度，元素从 keccak(uint256(slot)) 连续排——散射解耦「在哪」与「多长」。
7. **找路费**：每次散射访问先付 keccak 的钱——嵌套 mapping 逐层加倍。
8. **总图缝合**：签名→内存池→三根→EVM 计价→槽改写→新 stateRoot——不用信任任何人的验证体系。

**验收清单**（做完再进下一篇——阶段 3 开始）：

- [ ] 能画出三棵树与区块头的关系图（第 1 课）
- [ ] 能推出给定合约各变量的 slot 位置（含一个映射和一个动态数组）——拿 StorageLab 的户型默写一遍，再 cast storage 验证

**思考题**：`bytes32` 定长数组和 `bytes` 动态字节数组，槽位规则一样吗？（提示：前者是值类型住自己的槽；后者是动态类型——它更像 uint256[] 还是 uint256？长度和数据分别在哪？）

下一篇：[《Foundry 上手：forge、anvil、cast、chisel》](/web3区块链/03-solidity/solidity-01-foundry-setup)——工具链四件套就位，开始盖房子。

---

## 本篇实验（可照抄）

```bash
# 合约见第 4 课 StorageLab.sol；本地 anvil 部署（forge 1.7 需 --broadcast）
forge create src/StorageLab.sol:StorageLab \
    --rpc-url http://127.0.0.1:18545 \
    --private-key 0xac09…ff80 --broadcast

ADDR=<部署地址>; RPC=http://127.0.0.1:18545
cast send $ADDR "set(uint256,uint64,uint64)" 111 222 333 --private-key … --rpc-url $RPC
cast send $ADDR "push(uint256)" 7 --private-key … --rpc-url $RPC
cast send $ADDR "setBal(address,uint256)" 0x7099…79C8 555 --private-key … --rpc-url $RPC

for s in 0 1 2 3 4; do cast storage $ADDR $s --rpc-url $RPC; done    # 逐槽读
cast index address 0x7099…79C8 3                                      # mapping 值槽
cast storage $ADDR $(cast index address 0x7099…79C8 3) --rpc-url $RPC # = 0x22b = 555
# 数组元素槽（注意：不是 cast index，是 keccak(uint256(slot))+i）：
cast keccak 0x0000000000000000000000000000000000000000000000000000000000000004
cast storage $ADDR 0x8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b --rpc-url $RPC  # = 7
```

---

## 参考资料

- [ethereum.org — Data structures（MPT/RLP/SSZ）](https://ethereum.org/zh/developers/docs/data-structures-and-encoding/)
- [Mastering Ethereum — Trie 与存储布局章节](https://github.com/ethereumbook/ethereumbook)（中译《精通以太坊》第 4、13 章）
- [Solidity Docs — Storage Layout（槽分配与散射公式）](https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html)（第 4、5 课规则原文）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；StorageLab 部署于本地 anvil
