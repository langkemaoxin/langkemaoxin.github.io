---
title: "节点与 JSON-RPC：亲手当一次客户端（师生对话实录）"
sidebarGroup: "以太坊核心"
shortTitle: "04 节点与 RPC"
order: 4
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "以太坊"
  - "EVM"
  - "对话实录"
description: 师生对话实录课：绕过 MetaMask 直接跟节点对话——cast 完成查余额、读合约、发交易三件事，再 anvil 分叉主网给 vitalik 无中生有 100 ETH（主网原样对照）——你和链之间从此没有中间商。
---

> **Web3 区块链系列 · 阶段 2 · 以太坊核心 · 第 13/57 篇**
> 上一篇：[《EVM 执行模型与 Gas：逐条执行一笔交易》](/web3区块链/02-evm/evm-03-evm-gas) · 下一篇：[《状态存储：MPT、RLP 与存储槽（了解级）》](/web3区块链/02-evm/evm-05-storage)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

我突然意识到一件从没想过的事：装了 MetaMask，它问我要 RPC 地址——**它背后连的是谁的节点？** 我一直在用「别人的眼睛」看链。而且 `eth_call` 和 `eth_sendRawTransaction` 这两个名字，一个不用 gas 一个要——凭什么？

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课把中间商全部扒开：亲手当一次客户端，最后还在**主网的分叉副本上当了回王爷**（给 vitalik 无中生有 100 ETH，主网原样无损）。

课程路线图：

> ① 节点长什么样：合并后的双客户端 → ② JSON-RPC：跟节点说话的方言 → ③ 读与写的本质分野 → ④ RPC 提供商谱系 → ⑤ anvil 分叉：王爷模式 → ⑥ 开发者网络谱系

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1；公共 RPC（ethereum-rpc.publicnode.com）+ 本地 anvil 分叉。官方：[ethereum.org — Nodes](https://ethereum.org/zh/developers/docs/nodes-and-clients/)、[JSON-RPC API](https://ethereum.org/zh/developers/docs/apis/json-rpc/)。

---

## 第 1 课：节点长什么样——合并后的双客户端

**🧑‍🏫 老师：**

「以太坊节点」在 2022 年 The Merge 之后是**两个程序的组合**：

```text
一台完整的以太坊节点
├── 执行层客户端（EL）：Geth / Nethermind / Besu / Reth 任选其一
│    ├── 跑 EVM：执行每笔交易，维护【世界状态】（2.1 篇那张表）
│    ├── 对外提供 JSON-RPC —— 你（和 MetaMask）说话的对象就是它
│    └── 保存执行侧数据：状态树、交易、收据（几百 GB）
│
└── 共识层客户端（CL）：Prysm / Lighthouse / Teku …
     ├── 跑 PoS：验证者集、出块提议、罚没（8.1 篇）
     └── 两个客户端之间靠 Engine API 互通（EL 执行 CL 认定的块）
```

分工一句话：**共识层决定「下一个块是谁」，执行层算出「这个块造成的状态变化」**——PoS 的账和 EVM 的账各记各的，一个节点两个大脑（8.1 篇开头会回到这张图）。

对你当下更重要的是右边那个方框：**JSON-RPC 是执行层的对外窗口**。浏览器、钱包、DApp 前端、你昨天的 cast——全部是这扇窗的客户端。「跑自己的节点」= 自己开一扇窗，不排队、不限速、不信第三方。

> 一句话收口：**节点 = 执行层（EVM + 状态 + RPC 窗口）+ 共识层（PoS 记账）；你的一切链上操作都从那扇 JSON-RPC 窗口进。**

---

## 第 2 课：JSON-RPC——跟节点说话的方言

**🧑‍🎓 学生：** 这个「方言」长什么样？我直接说 HTTP 吗？

**🧑‍🏫 老师：**

对，就是 HTTP POST + JSON（也有 WebSocket 版）。一条请求的裸样子（第 1 篇其实发过）：

```json
{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}
→ {"jsonrpc":"2.0","result":"0x18a2f31","id":1}
```

`method` 是动作、`params` 是参数、`result` 是回答。常用方法按「干什么」分三类背：

| 类别 | 方法 | 干什么 |
|---|---|---|
| **读链** | `eth_blockNumber` / `eth_getBalance` / `eth_getTransactionReceipt` | 查块高、查余额、查回执 |
| **读状态** | `eth_call`（+ `eth_getStorageAt`、`eth_getLogs`） | 调合约的 view 函数、读槽、查事件 |
| **写链** | `eth_sendRawTransaction` | 广播一笔**已签名**的交易 |
| （辅助） | `eth_estimateGas` / `eth_feeHistory` | 估 gas、查费率历史 |

注意最后一行的措辞：节点**只收签名后的交易**（`sendRawTransaction` 的 Raw 就是「已序列化+签名」）——**你的私钥永远不出现在 RPC 请求里**。签名在本地（钱包/cast）完成，节点只负责广播。这就是「节点作恶也偷不了你钱」的边界，也是 3.8 篇私钥管理的地基。

> 一句话收口：**JSON-RPC = HTTP+JSON 的节点方言；读三类、写一类，节点只见签名不见私钥。**

---

## 第 3 课：读与写的本质分野——三件事实测

**🧑‍🎓 学生：** 「读不花钱、写花钱」我背得出来，但**为什么**？

**🧑‍🏫 老师：**

因为**只有写才需要全网的共识劳动**。读完这组实验再回来答题——三件事连着做（公共 RPC 查主网）：

```bash
RPC=https://ethereum-rpc.publicnode.com
USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
VITALIK=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# 第一件：查余额（eth_getBalance）
cast balance $VITALIK --rpc-url $RPC --ether
# 第二件：读合约（eth_call）
cast call $USDC "name()(string)" --rpc-url $RPC
cast call $USDC "totalSupply()(uint256)" --rpc-url $RPC
cast call $USDC "balanceOf(address)(uint256)" $VITALIK --rpc-url $RPC
```

本机实跑（2026-08-26）：

```text
===== [1] 读：查余额（eth_getBalance）=====
6.642178165221340300

===== [2] 读：读合约（eth_call）=====
USDC name:        "USD Coin"
USDC totalSupply: 50568510828693673 [5.056e16]   ← 6 位小数 → ≈ 505.7 亿枚
vitalik 的 USDC:  37192124 [3.719e7]             ← ≈ 3719 万枚
```

第三件事（写）上一课已经做过：`cast send` 本质是「本地签名 → `eth_sendRawTransaction` 广播」——它上了链、改了状态、花了 gas（回执里那个 21000）。

现在回答「凭什么」：**`eth_call` 是「在你指定的状态上免费试跑一遍」**——节点本地把 EVM 跑一遍、把结果告诉你，但**不广播、不上链、状态不动**。既然没有请求全网共识劳动（没有矿工/验证者要记账），自然没有 gas。反过来 `sendRawTransaction` 要求几千个节点执行、存储、达成一致——2.3 篇那笔「全网的账」必须有人付。

一个工程金句就此成立：**前端能 `eth_call` 的绝不发交易**——读余额、查 allowance、预览 swap 结果全部本地试跑，只有真正改状态那一下才签名付费。

> 一句话收口：**读 = 节点本地免费试跑（状态不动），写 = 全网共识劳动（必须付费）；eth_call 能解决的绝不上链。**

---

## 插问 1：cast 没连 MetaMask，它怎么「有权」查我的余额？

**🧑‍🎓 学生：** 我一直以为查余额要「登录」。cast 一个命令就查了 vitalik 的资产明细——权限在哪？

**🧑‍🏫 老师：**

**链上数据没有「权限」这回事，只有「公开」**。回看 0.1 篇第 3 课：分布式账本的卖点就是**人人可读**——任何人、任何节点、任何工具，都可以查任何地址的一切：

- 你查 vitalik 的余额，不需要 vitalik 同意——就像你读创世块里的泰晤士报头条不需要中本聪同意；
- 「登录」是 Web2 的概念：**数据在平台库里，平台做守门人**。链上数据在每个节点副本里，没有门可守。

真正的边界在**写**：花 vitalik 的钱需要他的**签名**——权限不在「谁能看」，在「谁能签」。0.3 篇的整套非对称密码学，守的就是这条线。（隐私话题顺带校准：**公开 ≠ 关联到人**——地址本身匿名，但一旦地址和身份关联（交易所 KYC、公开捐赠），全部历史就裸奔——这就是「链上隐私」问题的结构，9 篇之外的扩展话题。）

> 一句话收口：**链上读无权限、写靠签名；「登录看数据」是 Web2 的库房思维，链的世界里只有「公开的账本 + 私钥的笔」。**

---

## 第 4 课：RPC 提供商谱系——窗户是谁开的

**🧑‍🎓 学生：** 自己跑节点要几百 GB 磁盘——大多数人不跑，那窗户是谁开的？

**🧑‍🏫 老师：**

一扇窗的成本 ≈ 一台常年在线的服务器，于是市场分层了：

| 档 | 提供 | 免费额度 | 适合 |
|---|---|---|---|
| **公共 RPC**（ethereum-rpc.publicnode.com、cloudflare-eth 等） | 无注册、即用 | 有限速、不承诺 | 学习、低频调用（**本系列默认**） |
| **托管商**（Alchemy / Infura / QuickNode） | 注册拿 API key、高配额、仪表盘、归档查询 | 慷慨的免费档 | DApp 生产（5.x 前端起步） |
| **自建节点** | 自己的窗：无限速、隐私、归档 | —（全是成本） | 协议方、重度用户、理想主义者 |
| **本地 anvil** | 本地假链/分叉 | 无限 | 开发与测试（下一课的主角） |

实务要点两条：

- **速率限制**是免费档的真实约束：批量脚本一会儿就 429（too many requests）——重试+退避是标准姿势，生产换 key；
- **信任假设**要拎清：托管商看得见你的**请求**（IP、查了什么、发了什么交易——但看不到私钥），理论上可作恶（审查你的交易、喂假数据）。去中心化 RPC 市场（如各类 rpc 聚合器）就是冲这个痛点来的——了解即可。

> 一句话收口：**窗有四档：公共（学习）、托管（生产）、自建（重度/理想）、本地（开发）；私钥永远不出本地，其余皆可换。**

---

## 第 5 课：anvil 分叉主网——王爷模式

**🧑‍🎓 学生：** 你开头说的「王爷」呢？

**🧑‍🏫 老师：**

来。`anvil --fork-url` 起一条**主网的分叉**：本地链，但状态是主网当下时刻的完整副本：

```bash
anvil --fork-url https://ethereum-rpc.publicnode.com --port 18546
```

本机实跑（对照第 3 课的主网数据）：

```text
===== [3] anvil 主网分叉 =====
分叉的块高: 25835986
分叉上查 USDC totalSupply: 50568510828693673 [5.056e16]   ← 与主网一字不差
分叉上查 vitalik ETH 余额: 6.642178165221340300           ← 同上

—— 在分叉上给 vitalik 无中生有 100 ETH ——
$ cast rpc anvil_setBalance $VITALIK 0x56bc75e2d63100000
改后 vitalik 余额: 100.000000000000000000

—— 主网原样（对照）：6.642178165221340300 ETH           ← 毫发无损
```

看懂这三个瞬间就懂了分叉的全部价值：

1. **副本诞生**：分叉那刻起，本地链从主网块高 25835986 继续——之前的 2500 多万块历史与状态按需从主网 RPC 拉取，本地只存增量；
2. **王爷权限**：`anvil_setBalance` 是本地链的**作弊码**（cheatcode）——改余额、拨时间、扮任何地址发交易……3.7 篇测试课的主角就是它家族；
3. **主网无损**：你在分叉上烧掉 USDC、把 vitalik 变巨富、重放历史盗案——**主网一个字节都不会变**。这是一台「平行宇宙模拟器」。

工程用途立刻能列：在不花一分钱的前提下试真实协议（拿真实流动性池跑你的 swap 策略）、复现历史攻击（6 篇安全课的实验室）、给前端提供「看起来是主网」的本地环境。**主网数据的真实 + 本地环境的自由**，两个世界的好处全占。

> 一句话收口：**分叉 = 主网状态的本地副本 + 作弊码全开：王爷只在平行宇宙里当，主网毫发无损——开发与安全实验的标配。**

---

## 插问 2：分叉和测试网（Sepolia）到底差在哪？什么时候用哪个？

**🧑‍🎓 学生：** 都是不花真钱的环境——随便选一个行吗？

**🧑‍🏫 老师：**

不行，它们是两种「假」法，用途正交：

| | anvil 分叉 | Sepolia 测试网 |
|---|---|---|
| 状态 | **主网的真实副本**（真 USDC、真价格、真流动性） | 独立的玩具世界（假币、假池子） |
| 共识 | 没有真共识（你说啥是啥，作弊码全开） | 真共识、真验证者、真出块节奏 |
| 数据能信吗 | 历史可信、未来随意 | 一切都是玩具 |
| 钱从哪来 | 作弊码 `anvil_setBalance` | 水龙头领（免费但要申请） |
| 适合 | 跟真实协议交互的实验、攻击复现、状态断言 | 全流程演练（部署、验证、前端连接） |

经验法则：**「我要真实数据」→ 分叉；「我要真实体验」→ 测试网**。写一个跟 USDC 交互的合约，先在分叉上对真实状态测（totalSupply 对得上、真实地址有真实余额），再去 Sepolia 走一遍部署-验证-前端全流程（3.8 篇），最后才碰主网。三级跳的顺序别乱。

（诚实提醒：公共 fork 的拉取是按需的，某些冷门槽第一次访问会慢；深度归档查询对上游 RPC 有要求——重活计建议托管商的归档端点。）

> 一句话收口：**分叉给你真实的数据+作弊的自由，测试网给你真实的流程+玩具的数据——一个练「内容」，一个练「仪式」。**

---

## 第 6 课：开发者网络谱系——总地图

**🧑‍🏫 老师：**

收官，把所有「链」摆进一张谱系图（本系列全程就在这上面切换）：

```text
                      ┌─ 本地（秒级、免费、可控）
                      │   ├─ anvil 纯本地链        → 3.x 语法与测试的主场
                      │   └─ anvil --fork-url      → 真实数据实验（本课）
开发环境 ─────────────┤
                      └─ 远程测试网（真共识、假资产）
                          ├─ Sepolia               → 部署验证演练（3.8）
                          └─ Holesky               → 质押/节点实验（8.1 的习惯场）
生产环境 ─ 主网（一切皆真，一字千金）
```

配套的切换成本记一笔：本地↔分叉只是换个命令行参数；本地→Sepolia 要水龙头+等确认；Sepolia→主网**审查清单陡增**（3.8 篇的临门一脚）。**环境的「真实度」和「犯错成本」严格正相关**——本系列把 80% 的实验压在最左端，就是这个道理。

> 一句话收口：**谱系 = 本地链 → 分叉 → 测试网 → 主网，真实度与犯错成本同步上升；聪明的开发者把错误尽量留在左边。**

---

## 小结

1. **双客户端**：节点 = 执行层（EVM+状态+RPC 窗）+ 共识层（PoS 记账）；你的一切操作从那扇窗进。
2. **JSON-RPC**：HTTP+JSON 的方言；读三类、写一类，节点只见签名不见私钥。
3. **读写分野**（实测）：eth_call 本地免费试跑、sendRawTransaction 全网付费劳动——前端能 call 的绝不上链。
4. **公开与权限**：链上读无权限、写靠签名——「登录看数据」是库房思维。
5. **窗的四档**：公共/托管/自建/本地——速率限制是真实约束，私钥永远不出本地。
6. **分叉**（实测）：主网状态副本 + 作弊码全开——给 vitalik 造 100 ETH，主网分毫未动。
7. **分叉 vs 测试网**：真实数据+作弊自由 vs 真实流程+玩具数据——练内容与练仪式之别。
8. **网络谱系**：本地→分叉→Sepolia→主网，真实度与犯错成本严格正相关。

**验收清单**（做完再进下一篇）：

- [ ] 能脱稿列出常用 RPC 方法并按读/写分类（第 2 课表格）
- [ ] 能解释 MetaMask、RPC 节点、区块链三者的关系（MetaMask=签名工具+窗户选择器；节点=看门人无关的执行窗；链=账本本体）

**思考题**：DApp 前端显示「你的余额」用 eth_call，点「转账」用 sendRawTransaction——如果把余额显示也改成每 3 秒轮询一次，免费档公共 RPC 会遇到什么？该怎么设计节流？（提示：速率限制、事件订阅 eth_subscribe 对比轮询——5.x 前端的老话题。）

下一篇：[《状态存储：MPT、RLP 与存储槽（了解级）》](/web3区块链/02-evm/evm-05-storage)——几百 GB 的世界状态存在什么结构里、为什么轻节点只下载区块头就能验证、你的状态变量住在第几号房间。

---

## 本篇实验命令（可照抄）

```bash
RPC=https://ethereum-rpc.publicnode.com
USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
VITALIK=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

cast balance $VITALIK --rpc-url $RPC --ether                    # eth_getBalance
cast call $USDC "name()(string)" --rpc-url $RPC                 # eth_call
cast call $USDC "totalSupply()(uint256)" --rpc-url $RPC
cast call $USDC "balanceOf(address)(uint256)" $VITALIK --rpc-url $RPC

# 主网分叉 + 作弊码（王爷模式）
anvil --fork-url $RPC --port 18546                               # 另一终端
FRPC=http://127.0.0.1:18546
cast call $USDC "totalSupply()(uint256)" --rpc-url $FRPC         # 与主网一致
cast rpc anvil_setBalance $VITALIK 0x56bc75e2d63100000 --rpc-url $FRPC   # +100 ETH
cast balance $VITALIK --rpc-url $RPC --ether                     # 主网原样对照
```

---

## 参考资料

- [ethereum.org — Nodes and Clients](https://ethereum.org/zh/developers/docs/nodes-and-clients/)（执行层/共识层分工）
- [JSON-RPC Methods](https://ethereum.org/zh/developers/docs/apis/json-rpc/)、[eth_call vs sendRawTransaction 语义](https://ethereum.org/zh/developers/docs/apis/json-rpc/#eth_call)
- [Foundry Book — anvil（fork 模式与 cheatcodes）](https://book.getfoundry.sh/reference/anvil/)
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1；主网数据 2026-08-26 实查
