---
title: "语法 II：引用类型与数据位置（师生对话实录）"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "03 语法 II 数据位置"
order: 3
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "对话实录"
description: 师生对话实录课：storage 引用一改本体就变 99、memory 拷贝怎么改都隔着一层、calldata 参数比 memory 省 40%——三种数据位置的赋值语义、默认规则与编译器报错，用 LocLab 实测钉死，Solidity 第一道坎一步跨过。
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 17/57 篇**
> 上一篇：[《Solidity 语法 I：合约骨架、值类型与函数》](/web3区块链/03-solidity/solidity-02-syntax-basics) · 下一篇：[《语法 III：映射、数组、结构体与事件》](/web3区块链/03-solidity/solidity-04-mappings-events)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

上一课的类型表是「值类型」——赋值即拷贝，简单。真正的新手坎是**引用类型**（数组、结构体、string）：同一个变量名，写在不同位置，行为天差地别——2.3 篇那句「同功能 gas 差数倍」的机关全在这里。

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课的核心实验是一个「双胞胎函数」：一个用 storage 引用、一个用 memory 拷贝，各改一个数组元素——**改完链上的值一个变了、一个没变**，看懂这一幕，数据位置就毕业了。

课程路线图：

> ① 三个位置回顾 → ② 赋值语义：引用 vs 拷贝 → ③ 默认规则与强制标注 → ④ string/bytes 的特殊性 → ⑤ Gas 账与军规 → ⑥ 编译器报错导读

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；实验合约 LocLab（`forge test --gas-report` 实跑）。官方：[Solidity Docs — Data Layout](https://docs.soliditylang.org/en/latest/internals/layout_in_memory.html)。

---

## 第 1 课：三个位置——把 2.3 篇的格子接上语法

**🧑‍🏫 老师：**

2.3 篇讲 EVM 时你见过这四个格子；Solidity 语法层把它们变成**类型声明的一部分**：

```solidity
uint256[] storage s = nums;      // s 是 nums 的「别名」（同一间房）
uint256[] memory m = nums;       // m 是 nums 的「复印件」（新开一间）
function f(uint256[] calldata a) // a 是交易信封里的原文（只读）
```

| 位置 | 存活期 | 可写 | 代价 |
|---|---|---|---|
| `storage` | 链上永久 | ✓ | 天价（SSTORE 20000 起；2.5 篇的槽） |
| `memory` | 本次调用 | ✓ | 中（按量扩容计费） |
| `calldata` | 本次交易 | ✗ 只读 | 最便宜（读交易自带的） |

关键认知先摆正：**「位置」不是变量的属性，是「这份值的存放地」**——同一份 `nums` 数组，我可以拿它的 storage 引用、也可以复印到 memory；参数可以从 calldata 原文读、也可以先复印到 memory。**语法 = 让你说清楚「这次我要哪种」**。

> 一一句话收口：**storage 是房、memory 是复印件、calldata 是信封原文——声明位置 = 选择「这次用哪种形态」。**

---

## 第 2 课：赋值语义——本课的主实验

**🧑‍🎓 学生：** 「引用 vs 拷贝」背得出，但没亲眼看过差别。

**🧑‍🏫 老师：**

上双胞胎（LocLab，状态数组 `nums = [1,2,3]`）：

```solidity
function viaStorageRef() external returns (uint256) {
    uint256[] storage s = nums;   // ← 引用：s 和 nums 是同一间房的两个名字
    s[0] = 99;                    // 改 s = 改 nums = 改链上状态
    return s[0];
}

function viaMemoryCopy() external returns (uint256 oldVal) {
    uint256[] memory m = nums;    // ← 拷贝：把 nums 抄一份进 memory
    oldVal = m[1];
    m[1] = 77;                    // 只改复印件，本体无感
}
```

实测结果（forge test）：

```text
[PASS] test_StorageRefMutatesState()    ← viaStorageRef() 之后 nums[0] == 99（断言通过）
[PASS] test_MemoryCopyDoesNot()         ← viaMemoryCopy() 之后 nums[1] 仍是 2（断言通过）
```

两个测试的名字就是结论：

- **storage 赋值 = 挂别名**：`s[0] = 99` 之后，链上的 `nums[0]` 永久变成 99——**改动直达世界状态**（这笔 gas 一分不少：真实发生了 SSTORE）；
- **memory 赋值 = 做复印**：`m[1] = 77` 玩得再欢，`nums[1]` 还是 2——副本随函数调用一起焚毁（2.3 篇：memory 交易结束即清）。

「storage 局部变量被意外修改」的经典事故场景就长这样：你以为在草稿上算，实际在账本上写——本篇实验的断言就是这类 bug 的探测器。反向的「惊喜」同样存在：想改状态却拷贝到 memory，改完啥也没发生（静默失败，比崩溃更阴险）。

> 一句话收口：**storage 赋值挂别名（改 = 动账本），memory 赋值做复印（改 = 玩草稿）——一念之差，一个写链一个白写。**

---

## 第 3 课：默认规则与强制标注——什么时候必须写

**🧑‍🎓 学生：** 有些代码不写位置也能编译，有些又强制要求——规则到底怎么走的？

**🧑‍🏫 老师：**

一张「谁默认在哪」的表（0.8 的现状）：

| 变量/参数 | 默认位置 | 可选 | 说明 |
|---|---|---|---|
| 状态变量（合约级） | **storage** | —（没得选） | 它就是本体 |
| 函数参数（引用类型） | memory | calldata（外部函数） | **该写 calldata**（第 5 课军规） |
| 函数内局部变量 | 「storage 引用」语义 | memory / 显式 storage | 见下 |
| 返回值（引用类型） | memory | — | 返回的是拷贝 |

局部变量那条最有讲究：**`uint256[] storage s = nums;` 里的 storage 必须显式写**——因为「局部变量指向 storage」是个危险动作，编译器逼你亲手签名（0.7 时代甚至更严）。反过来 `uint256[] memory m = nums;` 的 memory 是默认（新开副本最安全），写出来只为可读性。

继承一个小验证（连回上篇的可见性）：**`external` 函数的数组参数才能用 calldata**——public/internal 的参数可能来自合约内部调用（那时数据已经在 memory 里，没有「信封原文」可指）。「external+calldata」是天生一对，2.3 篇那 40% 差价的语法前提。

> 一句话收口：**状态变量天然 storage、参数默认 memory（该改 calldata）、局部引用必须显式写 storage——默认值给安全，强制标注给危险。**

---

## 第 4 课：string 与 bytes——为什么它们是「贵」族

**🧑‍🎓 学生：** 表里 string/bytes 没提——它们算值类型还是引用？

**🧑‍🏫 老师：**

**引用类型**，而且是里面最「坑」的一族，三个原因：

- **变长**：`string` 是动态字节数组——长度可变意味着 storage 里要按 2.5 篇的「动态户型」住（低 31 字节存长度、数据从 keccak 散射地址开始排——上篇思考题的答案），memory 里按扩容计费——**比定长 bytes32 贵一个档次**；
- **不能直接比**：`keccak256(bytes(a)) == keccak256(bytes(b))` 是标准比较姿势——`a == b` 对 string 不存在（动态数据比等要逐字节，语言干脆不给运算符）；传值和比较全要走转换；
- **calldata 的诱惑最大也最常见**：只读的 string 参数标 calldata 同样省 40% 量级——但改一个字符都不行。**「接进来只为了记个日志/比个哈希」的 string，永远 calldata**。

一个实务组合拳（本篇不展开、留个印象）：**能用 `bytes32` 就别用 string**——定长、单槽、可比较，哈希、标识符、小尺寸常量全适合；string 留给「真·人读文本」（name、symbol 这类）。

> 一句话收口：**string/bytes = 变长引用族：storage 户型复杂、比较要靠哈希、calldata 收益最大——能用 bytes32 就别用 string。**

---

## 第 5 课：Gas 账——同一功能的价差与军规

**🧑‍🎓 学生：** 把 2.3 篇的实测接进来，正式立军规吧。

**🧑‍🏫 老师：**

LocLab 里那对求和函数（本次实跑，5 元素数组）：

```text
| sumCalldata | 2245 |   ← 信封原文直接读
| sumMemory   | 3698 |   ← 先复印进内存再读
```

**差 1453 gas（39%）**，全花在「复印」上。三条军规按使用频率排：

1. **只读参数标 calldata**（external 函数）——零风险纯省钱，本条没有例外场景；
2. **函数内临时数据用 memory**，用完即焚——别为「可能要改」留 storage 痕迹（写了就是 SSTORE 的钱 + 状态膨胀的公德债，2.1 篇第 6 课）；
3. **storage 访问最小化**：开头一次性读进局部变量、算完一次性写回——「每圈都去 storage 读」是 gas report 里的头号冤案（2.3 篇 sumStorageNaive 8475 的教训）。

配套的阅读技能：拿到一份 gas report，**先看有没有「memory 参数的只读函数」和「循环里的 storage 读」**——这两个是新手代码最稳定的两处漏水点。

> 一句话收口：**军规三条：只读必 calldata、临时用 memory、storage 一次读一次写——39% 的差价买的是「不复印」。**

---

## 第 6 课：编译器报错导读——真实样例

**🧑‍🎓 学生：** 位置写错时，编译器的报错看得懂吗？

**🧑‍🏫 老师：**

看一个真实的（本机 forge build 实录——动态数组赋给定长数组）：

```solidity
uint256[] memory m = nums;
uint256[3] memory fixed3 = m;    // ← 动态 → 定长
```

```text
Error (9574): Type uint256[] memory is not implicitly convertible
to expected type uint256[3] memory.
  --> src/BadLoc.sol:9:9
```

读报错的姿势（也是读一切编译错误的姿势）：

- **错误码 9574 = 类型不可隐式转换**——「你给的是 uint256[]（动态），我要的是 uint256[3]（定长）」，位置（memory）反而是陪衬——**真正的错在类型形状**；
- 动态和定长是**两种不同的类型**（不是「同一个类型的大小差异」）——定长在 memory 里是连续预分配，动态是「指针+长度」结构，当然不能悄悄转。想转要显式：循环逐个拷，或用固定长度再切。

数据位置相关的报错家族还有两个高频货，样式类似：「`storage` 与 `memory` 之间不能隐式转换」（想要哪个请显式写）和「`calldata` 数据不可写」。**共同点：报错说的是「形状/位置不匹配」，行号指的就是那行赋值**——照着念一遍，多半就懂了。

> 一句话收口：**报错导读第一课：错误码 + 「你给的类型 → 我要的类型」两行对照；动态/定长是两种类型，位置不匹配就显式写清楚。**

---

## 小结

1. **三个位置接上语法**：storage 房、memory 复印件、calldata 信封原文——声明即选择。
2. **赋值语义**（实测）：storage 挂别名（nums[0] 永久变 99）、memory 做复印（nums[1] 纹丝不动）。
3. **默认规则**：状态变量天然 storage、参数默认 memory（该改 calldata）、局部 storage 引用必须显式签名。
4. **external+calldata 天生一对**：内部调用没有「信封」可指。
5. **string/bytes**：变长贵族——户型复杂、比较靠哈希、能用 bytes32 就别用。
6. **Gas 军规**：只读必 calldata（实测 2245 vs 3698）、临时用 memory、storage 一次读一次写。
7. **报错导读**：9574 = 类型形状不匹配——错误码 + 两行类型对照。

**验收清单**（做完再进下一篇）：

- [ ] 能对任意变量说出它该在哪个位置及原因（拿 Bank/LocLab 的每个变量过一遍）
- [ ] 能预测引用赋值与拷贝赋值的行为差异（第 2 课双胞胎——换你写断言，预测再验证）

**思考题**：`function f(string memory s)` 和 `function f(string calldata s)`——如果函数体只做 `keccak256(bytes(s))`，两者结果一样吗？gas 呢？如果函数体还要 `s = "x"`（重新赋值），calldata 版会发生什么？（提示：结果一样、gas 差一档；calldata 不可写——编译期直接拒绝。）

下一篇：[《语法 III：映射、数组、结构体与事件》](/web3区块链/03-solidity/solidity-04-mappings-events)——链上的「表」怎么建、事件这个「免费的只读数据库」怎么用。

---

## 本篇实验（可照抄）

```bash
# LocLab.sol / LocLab.t.sol 见第 2 课（双胞胎函数 + 断言），放入 src/ 与 test/
cd /root/w3-lab2
forge test --match-path test/LocLab.t.sol --gas-report    # 三绿 + 价差表

# 编译错误亲测（第 6 课）
cat > src/BadLoc.sol <<'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;
contract BadLoc {
    function bad() internal pure returns (uint256[3] memory f) {
        uint256[] memory m = new uint256[](3);
        f = m;    // ← 动态赋定长
        return f;
    }
}
EOF
forge build    # 读一遍 Error (9574) 的两行类型对照，然后删掉它
```

---

## 参考资料

- [Solidity Docs — Data Layout（memory/calldata/storage 语义）](https://docs.soliditylang.org/en/latest/internals/layout_in_memory.html)
- [Solidity Docs — Types: Arrays & Strings](https://docs.soliditylang.org/en/latest/types.html#arrays)
- 2.3 篇 gas 价目（本篇军规的定量来源）、2.5 篇槽位规则（string 的动态户型）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36（三测试全绿 + 真实报错实录）
