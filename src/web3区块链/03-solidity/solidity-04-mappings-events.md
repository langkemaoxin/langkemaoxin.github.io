---
title: "语法 III：映射、数组、结构体与事件（师生对话实录）"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "04 语法 III 映射与事件"
order: 4
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "对话实录"
description: 师生对话实录课：写一个真排行榜——mapping 存表、地址数组补遍历、结构体一行记录；部署后 cast logs 看 indexed 参数进 topics、eth_getLogs 按 who 过滤从 3 条缩到 1 条；custom error 三种写法实测 gas，结果和传说不太一样。
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 18/57 篇**
> 上一篇：[《语法 II：引用类型与数据位置》](/web3区块链/03-solidity/solidity-03-data-location) · 下一篇：[《继承、接口、库与抽象合约》](/web3区块链/03-solidity/solidity-05-oop)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

Bank 会存钱了，但真实业务马上要问：怎么存「谁存了多少次、共多少」这样的**表**？「存款排行」怎么查？还有圈子里那句「事件是免费的只读数据库」——免费在哪、又为什么**不能**拿它当真账本？

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课写一个 Leaderboard（真排行榜合约），部署到本地链上发事件、再亲手把日志查出来过滤掉——**最后一段实测结果和社区传说对不上，如实记录**。

课程路线图：

> ① mapping：O(1) 的主表 → ② 结构体与键集合模式 → ③ 事件：写到哪、谁付钱 → ④ 实测：topics 与 data → ⑤ 查询：eth_getLogs 过滤 → ⑥ 错误处理三件套与 custom error 实测

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；Leaderboard 部署在本地 anvil（`0x8A79…C318`）。官方：[Solidity Docs — Events & Errors](https://docs.soliditylang.org/en/latest/contracts.html#events)。

---

## 第 1 课：mapping——O(1) 的主表

**🧑‍🏫 老师：**

链上「存表」的主力是 mapping（2.5 篇住址已经查过）：

```solidity
mapping(address => uint256) public balances;   // 一张 address → uint256 的表
// balances[某地址] = 100;      写 O(1)
// return balances[某地址];     读 O(1)
```

三条性格全来自它的物理结构（keccak 散射，2.5 篇第 5 课实测过 `0x9c35…` 那个槽）：

- **读写 O(1)**：不管表里有一万条还是一亿条，访问都是「哈希一下直奔房间」——对比数组遍历的 O(n)；
- **没有长度、不可遍历**：散射结构根本不维护「有哪些键」——`balances.length` 不存在。要遍历？下一课补；
- **没写过的键 = 零值**：`balances[新地址]` 读出来是 0——「不存在」和「值是 0」无法区分，这个模糊性是无数业务 bug 的温床（转账前查余额为 0：是没开户还是真没钱？）。

> 一句话收口：**mapping = O(1) 主表，代价是无长度、不可遍历、零值歧义——快是物理结构送的，坑也是。**

---

## 第 2 课：结构体与键集合——把表补完整

**🧑‍🎓 学生：** 一行 `uint256` 不够用了——我想同时存「总额 + 次数」，还要能列出所有存款人。

**🧑‍🏫 老师：**

两件配套零件（Leaderboard 的真实代码）：

```solidity
struct Depositor {          // 结构体：一行的多列
    uint256 total;
    uint64  count;
}

mapping(address => Depositor) private table;   // 主表：值是结构体
address[] private keys;                        // 键集合：遍历能力的补丁
mapping(address => bool) private seen;         // 去重标记

function deposit() external payable {
    if (msg.value == 0) revert ZeroAmount();
    if (!seen[msg.sender]) {                   // 首次来的，登记进键集合
        seen[msg.sender] = true;
        keys.push(msg.sender);
    }
    Depositor storage d = table[msg.sender];   // 3.3 课的 storage 引用
    d.total += msg.value;
    d.count += 1;
    emit Deposited(msg.sender, msg.value, d.total);
}
```

**键集合模式**（keys + seen 双 mapping）是「mapping 不可遍历」的标准解法——代价要认清：多两次 SSTORE（首笔存款时）、数组无限增长（提款/清退时要不要从键集合里删？删了又破坏「seen」语义——**模式有税，用前想清**）。

结构体的两条手感：`Depositor storage d = table[who]` 拿的是**那间房的引用**（改 d 即改链上——3.3 课双胞胎的复习）；`d.total += x` 每次都是真实的 SSTORE（2.3 篇天价档）。

实测读回（本地链，0 号存了 1+2、1 号存了 5 ETH 后）：

```text
$ cast call $LB "top()(address[],uint256[])"
[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x70997970C51812dc3A010C7d01B50e0d17dc79C8]
[3000000000000000000 [3e18], 5000000000000000000 [5e18]]
```

两行对齐读：第一个地址 3 ETH、第二个 5 ETH——键集合 + 主表的组合交货了。

> 一句话收口：**结构体给「行」、键集合补「遍历」——O(1) 的快和 O(n) 的全，各花各的钱。**

---

## 第 3 课：事件——写到哪、谁付钱、为什么便宜

**🧑‍🎓 学生：** `emit Deposited(…)` 那行——它写到哪去了？为什么说它「便宜」？

**🧑‍🏫 老师：**

事件写到**日志区（logs / receipts）**——2.5 篇三棵树里的第三棵（receiptsRoot 管辖）。它的存储位置决定了全部性格：

```text
交易执行 → 改 storage（贵、是状态树的一部分）
        → emit 事件（便宜得多、进收据树的日志区）

日志区的特点：
├── 不进世界状态：下一个块的状态里没有它 —— 合约自己读不到！
├── 永久保存：跟着区块走，谁都能查（本课实测）
└── 便宜的原因：不需要全网在「当前状态」上对它达成一致，
    只需要「历史里发生过」——存档比活账本便宜
```

最反直觉也最重要的一条加粗：**合约自己读不到事件**——事件是「从合约向外界喊话」的单向广播，接收方是链下的你（浏览器、索引器、前端）。想在合约里查「上次存款多少」？事件帮不了你，只能自己用状态变量记。

「免费的只读数据库」这句流行语的准确版：**对读的人免费**（查日志不走 EVM、不花 gas），写的人照样按日志字节数付钱（只是比 storage 便宜一个量级）。而「为什么不适合存关键业务状态」的答案在第 3 课第一行：**它不在共识的状态里**——回滚语义、重放、其它合约的读取，全都指望不上它。

> 一句话收口：**事件 = 单向广播：写进收据树的日志区、链下随便查、合约自己看不见；读免费，写便宜，但不参与共识——所以永远只是「侧记」，不是「正账」。**

---

## 第 4 课：实测——topics 与 data 的分工

**🧑‍🏫 老师：**

本地链发三笔存款（0 号账户两笔、1 号一笔），`cast logs` 拉出事件原文：

```text
$ cast logs --from-block 1 "Deposited(address,uint256,uint256)" --rpc-url $RPC
- address: 0x8A79…C318            ← 谁发的（合约地址）
  blockNumber: 10
  topics: [
    0x73a19dd210f1a7f902193214c0ee91dd35ee5b4d920cba8d519eca65a7b488ca   ← topics[0]：事件指纹
    0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266   ← topics[1]：indexed 的 who
  ]
  data: 0x…0de0b6b3a7640000…0de0b6b3a7640000    ← 非 indexed 的 amount、newTotal
```

结构完全对应声明：

```solidity
event Deposited(address indexed who, uint256 amount, uint256 newTotal);
//                        ↑ indexed → 进 topics（可过滤）
//                                    ↑↑ 没 indexed → 挤进 data（纯载荷）
```

- **topics[0] 永远是事件签名的 keccak**（`keccak256("Deposited(address,uint256,uint256)")` = `0x73a19dd2…`）——查日志时「按事件类型过滤」就是拿它比对；
- **每个 indexed 参数占一个 topic**（最多 3 个 + 签名共 4 个槽）：地址左填充成 32 字节——它们是「索引列」；
- **其余参数 ABI 编码挤在 data 里**：想拿值必须解码整个 data——它们是「载荷列」。

设计的取舍直白：**topics 是索引、data 是正文**——想被查询的进 indexed，只是记录的别进（topic 槽贵且有限）。

> 一句话收口：**indexed 进 topics（索引列、可过滤）、其余进 data（载荷、要整体解码）——事件声明就是「给查询引擎设计表结构」。**

---

## 第 5 课：查询——eth_getLogs 的过滤实测

**🧑‍🎓 学生：** 「可过滤」到底怎么过滤？

**🧑‍🏫 老师：**

RPC 层的方法是 `eth_getLogs`，topics 是**按位置对齐的过滤数组**。实测（本地链）：

```text
=== 过滤 1：只按事件签名 ===
topics: [0x73a19dd2…]                          → 命中 3 条

=== 过滤 2：签名 + who = 0x7099…（1 号账户）===
topics: [0x73a19dd2…, 0x0000…70997970c518…]   → 命中 1 条
  block: 12   who: 0x70997970…   data: 5e18, 5e18
```

**同一张日志表，加一个 topic 从 3 条缩到 1 条**——过滤在节点侧完成，不用把日志拉到本地再筛。这正是「indexed = 索引列」的含义：节点的日志索引按 topics 建了倒排，`eth_getLogs` 是索引查询而不是全文扫描。

（工程视角的量级感：主网上 Uniswap 一类高频合约的事件以亿计——**没有 topics 过滤的日志查询等于让节点全表扫**，公共 RPC 直接拒答；5.x 篇 The Graph 子图做的事，本质就是「替你持续地做这种过滤+索引」。）

> 一句话收口：**eth_getLogs 的 topics 是按位置对齐的索引查询——签名、地址、区块范围逐层收窄，节点侧完成过滤。**

---

## 插问 1：require / revert / assert 到底怎么分工？

**🧑‍🎓 学生：** 三个「报错」关键字，我一直混着用。

**🧑‍🏫 老师：**

按「检查什么」分工，语义清晰不重叠：

| 关键字 | 检查什么 | 语义 | 典型用例 |
|---|---|---|---|
| `require(cond, "…")` | **外部输入/权限** | 「调用方的条件不满足」 | `require(msg.value > 0)`、`require(msg.sender == owner)` |
| `revert CustomError()` | 同上（另一种形态） | 同 require，见第 6 课 | 带参数的结构化错误 |
| `assert(cond)` | **代码自身的不变量** | 「我自己的逻辑炸了——这不该发生」 | 理论上不可达的分支（除零防御） |

记忆口诀：**require 防人，assert 防己**。实践铁律：**对外输入永远 require/revert；assert 几乎不该出现**——0.8 之后溢出有自动检查、大多数「不变量」场景归它管的都被语言层接管了。工具视角的分诊也值得知道：`require` 失败 = 「你用错了」，`assert` 失败 = 「合约有 bug」——后者该触发的是安全应急流程而不是客服话术。

> 一句话收口：**require 防人（输入/权限）、assert 防己（不变量）；对外一律 require/revert，assert 是留给「不可能发生」的最后一道闸。**

---

## 第 6 课：custom error 实测——和传说不太一样

**🧑‍🎓 学生：** 社区口诀说「custom error 比 require 字符串省 gas」——我专门测了，结果有点意外。

**🧑‍🏫 老师：**

好现象，说给你听。三种写法（0.8.4+ 的 custom error、0.8.24+ 的 require-with-error）：

```solidity
error ZeroAmount();                                    // 全局声明
function withCustomError(uint256 v)  external pure returns (uint256) {
    if (v == 0) revert ZeroAmount();  return v;
}
function withRequireString(uint256 v) external pure returns (uint256) {
    require(v != 0, "zero amount not allowed");       return v;
}
function withRequireCustom(uint256 v)  external pure returns (uint256) {
    require(v != 0, ZeroAmount());                    return v;   // 0.8.24+ 语法
}
```

本机实测（**不触发 revert 的正常路径**）：

```text
| withCustomError  | 593 |
| withRequireString| 615 |
| withRequireCustom| 637 |
```

**正常路径三者只差几十 gas，甚至 require(字符串) 还不是最贵的**——口诀里的「省一大截」去哪了？诚实的账要拆两层：

- **部署体积**：错误字符串整个进 bytecode（758 字节里 `"zero amount not allowed"` 原样躺着）；custom error 只有一个 4 字节选择器——**合约越大差距越大**，一次性部署成本；
- **revert 触发路径**：字符串要塞进返回数据（`Error(string)` 的 ABI 编码），custom error 的返回数据短得多——**触发越频繁的场景差距越明显**（fuzz 测试里海量 revert 的场景）。

所以准确的说法是：**custom error 省的是「部署体积 + revert 载荷」，正常路径几乎同价**。选它的首要理由其实不是 gas，是**工程质量**：错误有名字、可带参数（`error InsufficientBalance(uint256 have, uint256 want)`）、前端可以精确匹配处理——字符串匹配是脆的。

> 一句话收口：**实测正常路径三者同价（593/615/637）——custom error 真正省的是部署体积与 revert 载荷，但选它的第一理由是「错误有名字有参数」的工程性。**

---

## 小结

1. **mapping**：O(1) 主表；无长度、不可遍历、零值歧义——快与坑同源。
2. **键集合模式**：keys + seen 补遍历——模式有税（多写、只增），用前想清。
3. **事件**：写进收据树日志区、链下可查、**合约自己读不到**——不参与共识，只是侧记不是正账。
4. **topics/data**（实测）：indexed 进索引列（地址左填充）、其余进载荷；topics[0] 是事件指纹。
5. **eth_getLogs**（实测）：topics 按位置对齐过滤，3 条 → 1 条在节点侧完成。
6. **三件套分工**：require 防人、assert 防己（几乎不该用）、revert 是 require 的结构化形态。
7. **custom error 实测**：正常路径同价；省在部署体积与 revert 载荷——第一理由是工程性。

**验收清单**（做完再进下一篇）：

- [ ] 能解释事件存哪、谁付钱、怎么查、为什么不适合存关键业务状态（第 3 课四连答）
- [ ] 能列出 require/revert/assert 各自的适用场景（第 6 课表格）

**思考题**：Leaderboard 的 `top()` 遍历键集合——如果存款人有一万个，这个 view 函数会不会把调用方卡死？（提示：eth_call 免费但不是无限——节点有 gas cap；遍历越界的「免费查询」会怎么失败？5.x 前端的分页怎么绕？）

下一篇：[《继承、接口、库与抽象合约》](/web3区块链/03-solidity/solidity-05-oop)——合约的组合术：is、super、interface 与「跟主网上任何合约说话」的 ABI。

---

## 本篇实验（可照抄）

```bash
# Leaderboard.sol 见第 2 课；部署 + 存款 + 查询
forge create src/Leaderboard.sol:Leaderboard --rpc-url http://127.0.0.1:18545 \
    --private-key 0xac09…ff80 --broadcast
LB=<部署地址>
cast send $LB "deposit()" --value 1ether --private-key … --rpc-url $RPC   # ×3（两个账户）
cast call $LB "top()(address[],uint256[])" --rpc-url $RPC

# 事件原文与指纹
cast logs --from-block 1 "Deposited(address,uint256,uint256)" --rpc-url $RPC
cast keccak "Deposited(address,uint256,uint256)"      # = topics[0]

# topics 过滤（原生 eth_getLogs，按位置对齐）
cast rpc eth_getLogs '{"fromBlock":"0x1","topics":["0x73a19dd2…","0x0000…7099…"]}' --rpc-url $RPC
```

（ErrGas.t.sol 三写法对比见第 6 课，forge test --gas-report 复现。）

---

## 参考资料

- [Solidity Docs — Events / Errors / Structs](https://docs.soliditylang.org/en/latest/contracts.html#events)
- [EIP-6160 与 custom error 语义](https://docs.soliditylang.org/en/latest/contracts.html#errors)（0.8.4 / 0.8.24 语法节点）
- 2.5 篇收据树与散射槽（本篇 mapping 住址的来历）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；Leaderboard 部署于本地 anvil
