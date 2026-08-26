---
title: "收付款实战：payable、fallback 与转账三种方式（师生对话实录）"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "06 收付款实战"
order: 6
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "对话实录"
description: 师生对话实录课：PaymentLab 三合约实测——receive 与 fallback 谁接哪类转账、向拒收合约转账时 transfer 当场 revert、send 静默返回 false、call 把 revert 原因原样带回——三兄弟的差异全部用主数据说话，重入的种子就此埋下。
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 20/57 篇**
> 上一篇：[《继承、接口、库与抽象合约》](/web3区块链/03-solidity/solidity-05-oop) · 下一篇：[《Foundry 测试：cheatcodes、fuzz 与 invariant》](/web3区块链/03-solidity/solidity-07-testing)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

Bank 只会收钱（`deposit` 带 payable），但真实的合约要会**转出**、会「带着钱调别人的函数」——而且圈子里有一句祖训：「转账只有 `call` 是对的」。transfer/send 到底错哪了？receive 和 fallback 这两个长得差不多的神秘函数又各管什么？

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课搭一个 PaymentLab 三合约（收钱的、拒收的、转钱的），把**向拒收合约转账**的三种失败表现实测出来——第三种的返回数据会给你惊喜。

课程路线图：

> ① payable 与 msg.value → ② receive/fallback：两个兜底入口 → ③ 转账三兄弟 → ④ 实测：向拒收者转账的三种死相 → ⑤ 带 calldata 的 call → ⑥ 重入的种子与 push/pull

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；PaymentLab 部署于本地 anvil。官方：[Solidity Docs — receive & fallback](https://docs.soliditylang.org/en/latest/contracts.html#receive-ether-function)。

---

## 第 1 课：payable 与 msg.value——收钱的许可证

**🧑‍🏫 老师：**

3.2 课立过规矩：**payable 是「收钱许可证」**——没有它，交易带的 ETH 一进门就 revert。现在把细节补全：

```solidity
function deposit() external payable {        // 有许可证
    require(msg.value > 0, "zero");
    balances[msg.sender] += msg.value;       // msg.value：这笔交易带了多少钱
}
```

- `msg.value` 是**这笔交易**携带的 ETH（wei）——它来自交易的 `value` 字段（2.2 篇骨架图），EVM 在入口处就把钱记到合约账上，函数体只是「记账认可」；
- **函数执行完钱已经在合约里**——不管函数体有没有「接收」动作。所以「忘了写收款逻辑」不会丢钱（2.1 篇：合约账户有 balance 字段），只会丢账目（钱进来了但没记是谁的）；
- **同一笔交易里钱只能进一个合约**：`A.call{value: 1 ether}(…)` 的钱进 A——「带着钱调别人」就是第 5 课的事。

还有两条**隐式收钱路径**（不用 payable 也能进钱的历史后门）：coinbase 交易把手续费直接记给矿工地址、以及已名存实亡的 SELFDESTRUCT（EIP-6780 后仅在自毁与创建同交易时才真的转账，3.6 了解级）——**所以合约的 balance 可能大于账面之和**，「用 address(this).balance 当账本」是错的，账要用自己记的。

> 一句话收口：**payable 是收钱许可证，msg.value 是随交易进门的现金；钱进门不需要函数同意，记账才需要——余额和账本是两回事。**

---

## 第 2 课：receive 与 fallback——两个兜底入口

**🧑‍🎓 学生：** 有人裸转账给我合约（不带任何 calldata），合约里根本没有对应函数——钱去哪了？

**🧑‍🏫 老师：**

这就是 `receive()` 的岗位——**纯转账（calldata 为空）的兜底入口**：

```solidity
contract Receiver {
    event Got(string via, uint256 amount, bytes data);
    receive() external payable { emit Got("receive", msg.value, ""); }
    fallback() external payable { emit Got("fallback", msg.value, msg.data); }
}
```

两个入口的分工规则一句话：**看 calldata 空不空**——

```text
交易到达合约
   ├─ data 为空（纯转账）→ receive()            （没定义 → fallback；再没有 → revert）
   └─ data 非空（调用）  → 先查函数表
                            ├─ 找到 → 正常执行
                            └─ 没找到 → fallback()（没定义 → revert）
```

实测（PaymentLab 部署后）：

```text
Sender.viaCall(Receiver)      → Receiver 触发 Got(via="receive")    ← call 带空 data
Sender.callWithData(Receiver) → Receiver 触发 Got(via="fallback")   ← call 带 ping(42) 的 calldata
（eth_getLogs 实查：Got 事件共 2 条，via 一条 receive 一条 fallback）
```

三个工程要点：

- 两个函数都有 `external payable` 的固定签名，**各最多一个**、不带函数名参数；
- 它们是**闪电通道**：裸转账默认只给 2300 gas（下一课的源头），写复杂逻辑必炸；正常用途就是 `emit` 个事件或干脆空着；
- **fallback 的正经用途**是「代理合约」——把所有未知调用转发给逻辑合约（4.4 篇的主角预备役）；「接住打错函数的调用」只是兼职。

> 一句话收口：**data 空 → receive；data 里的函数不存在 → fallback——两个兜底入口，前者接裸转账，后者是代理转发的地基。**

---

## 第 3 课：转账三兄弟——transfer / send / call

**🧑‍🎓 学生：** 转出 ETH 有三个语法，祖训说只用 call——另外两个的罪状是什么？

**🧑‍🏫 老师：**

先把三兄弟的规格表摆齐（对照着记）：

| | `to.transfer(x)` | `to.send(x)` | `to.call{value: x}("")` |
|---|---|---|---|
| 失败时 | **revert 整笔交易** | **只返回 false** | 只返回 false（原因在返回数据里） |
| 给对方的 gas | **固定 2300** | **固定 2300** | **自己指定**（默认慷慨） |
| 能带 calldata | ❌ | ❌ | ✅（顺便调函数） |
| 现代推荐 | ❌ | ❌ | ✅ |

罪状的核心是那个 **2300 gas 上限**（历史遗留的防重入措施）：转账时只给对方 2300 gas——刚好够 `receive()` 里 emit 个事件，**不够干任何坏事**（比如回调你）。听起来很安全？但它同时意味着：

- **对方不能有任何逻辑**：想收款时记个账、更新个状态？gas 不够，转账失败；
- **transfer 失败 = 你的交易整个 revert**：遇到一个「收款要做事」的合约（今天越来越多），你的合约就永远没法给他打钱——**兼容性死锁**；
- **send 静默返回 false**：不 revert 了，但**不检查返回值的话钱没转出去都不知道**（忘记 `if (!ok) revert` 是经典漏洞形态）。

`call` 把选择权还给调用方：gas 自己定（默认 63/64 给足）、失败不自动 revert、**revert 原因装在返回的 bytes 里**（下一课实测给你看）——代价是**2300 的「防重入护栏」也没了**：安全性从「语法保证」变成「你的责任」（第 6 课的正题）。

> 一句话收口：**transfer/send 的 2300 上限是「用兼容性换来的假安全」；call 还你自由也还你责任——祖训「只用 call」的完整版是「用 call，并且自己管好重入」。**

---

## 第 4 课：实测——向拒收者转账的三种死相

**🧑‍🎓 学生：** 光看表不过瘾，来真的。

**🧑‍🏫 老师：**

PaymentLab 里的 `Reverter` 是个铁公鸡（receive/fallback 全 revert）。用三种方式各转它一次（本机实跑）：

```text
--- 方式一：transfer ---
$ cast send $SENDER "attackTransfer(address)" $REVERTER …
Error: Failed to estimate gas: execution reverted:
       Error("no thanks")   ← 整笔交易直接炸（gas 估算阶段就 revert）

--- 方式二：send（读返回值）---
$ cast call $SENDER "attackSend(address)(bool)" $REVERTER
false                      ← 交易能成功，函数告诉你「没转出去」

--- 方式三：call ---
$ cast call $SENDER "attackCall(address)(bool,bytes)" $REVERTER
false
0x08c379a0…00096e6f207468616e6b73…    ← 返回数据 = Error("no thanks") 的完整 ABI！
```

三种死相逐个验尸：

- **transfer**：对方的 revert **穿透上来**，你的交易整笔回滚——错误信息就是对方的 `no thanks`（gas 估算就报错，交易根本没发出去）；
- **send**：交易本身成功，拿到一个 `false`——**如果你不检查它，这笔「转账」就无声无息地没了**（漏洞高发区：`send` 后忘了 `require(ok)`）；
- **call**：拿到 `false` **加一坨返回数据**——解码出来正是对方的错误（`0x08c379a0` 是 `Error(string)` 的选择器，`6e6f207468616e6b73` 是 "no thanks" 的 hex）。**call 把「为什么失败」完整带回来了**——这是排障时三兄弟里唯一能说人话的。

（有个细节值得咀嚼：三种方式在**静态调用**（`cast call`）下都能演示，因为它们不依赖真实广播——「免费试跑」的又一用处。）

> 一句话收口：**transfer 炸给你看、send 吞进肚里、call 带回尸检报告——同一笔失败转账的三种呈现，工程上只值得要第三种。**

---

## 第 5 课：带 calldata 的 call——「带着钱调函数」

**🧑‍🎓 学生：** call 的第二行规格「能带 calldata」——为什么这是大事？

**🧑‍🏫 老师：**

因为它把「转账」和「调用」合并成了一次原子操作。第 2 课的 `callWithData` 实测就是例子：

```solidity
(ok, ) = to.call{value: 1 ether}(abi.encodeWithSignature("ping(uint256)", 42));
//         ↑ 带 1 ETH            ↑ 同时调用对方的 ping(42)
```

对方（Receiver）收到后触发的是 **fallback**（它没有 ping 函数）——第 2 课实测的 `via="fallback"` 那条事件。如果对方真有 payable 的 `ping`，就是一次「带钱调用」。

真实世界的用法密度极高：**给 ERC-20 合约发「买币」交易、给 WETH 存款（`deposit()` 带 value）、一切「一手交钱一手调用」的场景**。对照「先转再调」的两笔交易方案：中间可能失败、可能被抢跑——**call{value} 的原子性**是 DeFi 组合的基石（7 篇大量出现）。

也顺带把 `address payable` 讲了：只有 `address payable` 类型才有 `.transfer/.send` 和被 `call{value}` 的资格——普通 `address` 想转钱要先转换（`payable(addr)`），这个类型门槛是编译器在提醒你「转钱要过脑子」。

> 一句话收口：**call{value}(calldata) = 转账与调用的一次原子合并——「带着钱调函数」是 DeFi 组合的原子动作。**

---

## 插问 1：selfdestruct 现在还能干什么？

**🧑‍🎓 学生：** 老资料里 selfdestruct 是「强制送钱」的后门（炸掉自己把钱塞给任何合约，绕过 receive）——还灵吗？

**🧑‍🏫 老师：**

**基本不灵了**（EIP-6780，随 Cancun 2023 生效）：`selfdestruct` 只剩两种情况还真的转钱——**同一笔交易里创建又自毁**的合约（等于创建撤销）；其它情况只剩「删除代码与存储」，**不再强制转账**。

为什么砍它：这个后门破坏了「合约对自己收款逻辑的自主权」——你可以不收钱，但我炸自己塞给你（2300 gas 都不用给你）。历史漏洞姿势还包括「合约依赖 selfdestruct 清理存储回 gas」（旧退款机制）——都随 EIP 一并成为历史。它留下的是一条 3.2 课讲过的现代规则：**合约 balance 可能与账目不一致的隐式路径，如今几乎只剩 coinbase 一条**。

> 一句话收口：**selfdestruct 的强制转账已被 EIP-6780 关闭——「绕过 receive 塞钱」成为历史，收款的自主权还给合约。**

---

## 第 6 课：重入的种子与 push/pull

**🧑‍🎓 学生：** 你一直在说「重入的种子」——本篇到底埋了什么？

**🧑‍🏫 老师：**

埋的是**结构**。看这个「再普通不过」的提款函数：

```solidity
function withdraw() external {
    uint256 amount = balances[msg.sender];
    (bool ok, ) = msg.sender.call{value: amount}("");   // ← 把钱 call 给用户
    require(ok);
    balances[msg.sender] = 0;                            // ← 事后清零
}
```

时序藏着一个窗口：`call` 执行时，控制权**临时交给对方**（用户的 EOA 没代码无事；但用户可以是合约！）——对方在 `receive()` 里**再次调用 `withdraw()`**，此时 `balances[msg.sender]` **还没清零**……第二次提款又拿到全款。如此循环，合约被抽干。这就是**重入攻击**（reentrancy），2016 年 The DAO 六千万美元的死亡方式。

注意因果链的每一环都是本篇零件：**call 的慷慨 gas**（transfer 的 2300 反而炸不了这么远）+ **先转后记的顺序** + 对方是合约。修复留两个钩子（6.2 篇正面拆弹）：

- **检查-生效-交互**（CEI）：先清零再转——窗口期内第二次调用读到 0，无害；
- **push/pull 模式**：合约**永远不主动 push 钱给用户**，只登记「可领取」，用户自己来 pull（`call` 的发起方变成用户，重入结构消失）——占位大纲「为安全篇埋钩子」的落点。

> 一一句话收口：**call 的慷慨 + 先转后记 + 对方是合约 = 重入三要素；CEI 调顺序、pull 改方向——弹在 6.2 篇拆，结构今天先认清。**

---

## 小结

1. **payable/msg.value**：收钱许可证与随交易进门的现金；钱进门不需要函数同意，**余额 ≠ 账本**（隐式路径只剩 coinbase）。
2. **receive/fallback**（实测 2 条 Got 事件）：data 空 → receive；函数不存在 → fallback——后者是代理转发的地基。
3. **三兄弟规格**：transfer（revert、2300）、send（false、2300）、call（false+原因、gas 自定）。
4. **三种死相实测**：transfer 炸整笔、send 静默 false、call 带回 `Error("no thanks")` 的完整 ABI。
5. **call{value}(data)**：转账与调用的原子合并——DeFi 组合的原子动作；address payable 是类型层的过脑子提醒。
6. **selfdestruct**：EIP-6780 后强制转账已死——历史包袱认知。
7. **重入三要素**：call 慷慨 + 先转后记 + 对方是合约；CEI 与 push/pull 的两个修复钩子留给 6.2。

**验收清单**（做完再进下一篇）：

- [ ] 能说清三种转账方式在 gas 与安全上的差异及推荐选择（第 3 课规格表 + 第 4 课三种死相）
- [ ] 能解释 receive 和 fallback 分别在什么场景被触发（第 2 课分工图 + 实测）

**思考题**：把 withdraw 的 `call` 换回 `transfer`（2300 gas），重入还可能发生吗？（提示：对方在 receive 里连一行 SSTORE 都跑不动——那 2016 年的 The DAO 是怎么被重入的？查一下当年用的是哪种转账。）

下一篇：[《Foundry 测试：cheatcodes、fuzz 与 invariant》](/web3区块链/03-solidity/solidity-07-testing)——给 Bank 配上单测、fuzz 和 invariant，再故意埋个 bug 让机器抓。

---

## 本篇实验（可照抄）

```bash
# PaymentLab.sol 见第 2、3 课；三合约部署
forge create src/PaymentLab.sol:Receiver --rpc-url … --private-key … --broadcast
forge create src/PaymentLab.sol:Reverter --rpc-url … --private-key … --broadcast
forge create src/PaymentLab.sol:Sender   --rpc-url … --private-key … --broadcast
cast send $SENDER --value 5ether --private-key … --rpc-url $RPC      # 注资（触发 receive）

cast send $SENDER "viaCall(address)" $RECEIVER --private-key … --rpc-url $RPC       # → receive
cast send $SENDER "callWithData(address)" $RECEIVER --private-key … --rpc-url $RPC  # → fallback
cast logs --from-block 1 'Got(string,uint256,bytes)' --address $RECEIVER --rpc-url $RPC

# 三种死相（对 Reverter）
cast send $SENDER "attackTransfer(address)" $REVERTER …      # 整笔 revert
cast call $SENDER "attackSend(address)(bool)" $REVERTER …     # false
cast call $SENDER "attackCall(address)(bool,bytes)" $REVERTER # false + Error("no thanks")
```

---

## 参考资料

- [Solidity Docs — receive / fallback](https://docs.soliditylang.org/en/latest/contracts.html#receive-ether-function)
- [Solidity Docs — Address members（transfer/send/call）](https://docs.soliditylang.org/en/latest/types.html#members-of-addresses)
- [EIP-6780 — selfdestruct 语义变更](https://eips.ethereum.org/EIPS/eip-6780)（插问 1）
- [Checks-Effects-Interactions 模式](https://docs.soliditylang.org/en/latest/security-considerations.html#use-the-checks-effects-interactions-pattern)（第 6 课，6.2 篇展开）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；PaymentLab 三合约部署于本地 anvil
