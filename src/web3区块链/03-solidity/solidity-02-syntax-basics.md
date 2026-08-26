---
title: "Solidity 语法 I：合约骨架、值类型与函数（师生对话实录）"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "02 语法 I 骨架与类型"
order: 2
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "对话实录"
description: 师生对话实录课：在四件套上写第一个 Bank 合约——public/private 与 view/pure/payable 两套标注各管什么、immutable 与 constant 差在哪、0.8 的溢出检查默认开而 unchecked 实测回绕到 4，forge build/test 全绿实录。
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 16/57 篇**
> 上一篇：[《Foundry 上手：forge、anvil、cast、chisel》](/web3区块链/03-solidity/solidity-01-foundry-setup) · 下一篇：[《语法 II：引用类型与数据位置》](/web3区块链/03-solidity/solidity-03-data-location)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

工具就位，开写代码。但打开 Solidity 文档第一眼就懵了：一个函数名前面能摞四个词——`function foo() public view returns (uint256)`，这每个词都是修饰？还有老资料里满屏的 SafeMath，新代码里一个都没有？

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课写**第一个结构清晰的 Bank 合约**（存钱、查钱、统计），两套标注一次讲透，溢出行为当场实测。

课程路线图：

> ① 合约骨架与 pragma → ② 值类型全家福 → ③ 可见性：谁能调 → ④ 可变性：动不动状态 → ⑤ Bank 实战 → ⑥ 溢出与 unchecked

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + **Solidity 0.8.36**；项目 `/root/w3-lab2`。官方：[Solidity Docs — Language](https://docs.soliditylang.org/)（本篇基准 0.8.36——「只有最新版本收安全补丁」）。

---

## 第 1 课：骨架——一个 .sol 文件的最小解剖

**🧑‍🏫 老师：**

```solidity
// SPDX-License-Identifier: MIT        ← 许可声明：编译器非要不可（开源友好）
pragma solidity ^0.8.36;              // 版本策略：允许 0.8.36 到 <0.9.0

contract Bank {                        // 合约 = 状态 + 函数的封装体
    uint256 public total;              // 状态变量（住 storage，2.5 篇的槽）
    address public immutable owner;    // 部署时写死的一次性变量

    constructor() {                    // 构造函数：只在部署交易里跑一次
        owner = msg.sender;
    }

    function deposit() external payable {   // 函数 = 对外服务窗口
        total += msg.value;
    }
}
```

四个骨架零件各自记一句：

- **`pragma ^0.8.36`**：`^` 是「同主版本内向上兼容」——0.8.x 的补丁更新都能编。宁可收紧不要放松：`>=0.6.0 <0.9.0` 这种宽 pragma 是老项目的常见债（不同版本编译行为可能不同，锁定才有可复现性）；
- **`contract`**：Solidity 的「类」，但实例一旦部署**永不可改**（1.4 篇「不可篡改是双刃剑」的代码级落点）；
- **`constructor`**：只在**部署那笔交易**里执行（3.8 篇会看到「部署 = 发一笔 to 为空、data 是字节码的交易」——constructor 就跑在那笔里）；2.1 篇问过「合约的 nonce 数什么」——数的就是它 CREATE 子合约；
- **`msg.sender` / `msg.value`**：交易的上下文（「谁在调我」「带了多少钱」）——0.3 篇签名体系在 EVM 里的化身。

> 一句话收口：**骨架四件：pragma 锁版本、contract 封装、constructor 跑在部署交易里、msg.* 是交易上下文。**

---

## 第 2 课：值类型全家福——EVM 的 256 位世界观

**🧑‍🎓 学生：** 类型表我背过，但 uint256 这种「256 位起步」的默认值很反直觉——为什么？

**🧑‍🏫 老师：**

因为 **EVM 的字长就是 256 位**（2.3 篇第 1 课那个栈）——`uint256` 是「原生尺寸」，其它尺寸反而要额外转换指令。全家福按「值语义」过一遍（赋值 = 拷贝本体）：

| 类型 | 说明 / 陷阱 |
|---|---|
| `uint256` / `int256` | 默认尺寸、最便宜；`uint8` 这类小尺寸只在**存储打包**时省（2.5 篇实测：两个 uint64 挤一槽） |
| `address` / `address payable` | 20 字节地址；payable 版多出 `.transfer/.send/.call` 收款权（3.6 篇主角） |
| `bool` | 1 字节存储（打包友好），运算时占满 256 位栈字 |
| `bytes32` | 定长 32 字节——**和 `bytes` 完全两回事**（后者是动态数组，2.5 篇思考题） |
| `enum` | 用户定义的小整数（uint8 起步），给可读性不给性能 |
| `fixed` 浮点 | **不存在**（EVM 无浮点）——`1/2 == 0`，小数全靠「放大 N 位存整数」的技巧（7 篇 DeFi 的 decimals 世界） |

两个 EVM 特色类型成员顺带收编：`address.balance`（查这个地址的 ETH 余额——只读、免 gas）、`block.timestamp`（当前块时间，`block.*` 家族是合约感知世界的唯一窗口——2.1 篇「EVM 没有时钟，只有交易带来的信息」的具体清单）。

> 一句话收口：**uint256 是原生字长；无浮点、bytes32 ≠ bytes、enum 是语法糖——类型表背后全是 EVM 的形状。**

---

## 第 3 课：可见性——谁能调它

**🧑‍🎓 学生：** public/private/external/internal 四个词都管「谁能调」？一个不够吗？

**🧑‍🏫 老师：**

四个词是两个维度的组合（「外界」vs「自家及子孙」）：

```text
                 外界（其他合约 / EOA）
                        │
        ┌────── public ─┴─ internal ───────┐
        │        ✓          ✓              │
   （谁能调）                 ↑ 自家合约与子合约
        │        ✓          ✗              │
        └────── external ── private ───────┘
```

| 标注 | 外界 | 自家/子合约 | 备注 |
|---|---|---|---|
| `public` | ✓ | ✓ | 默认（状态变量的 public 还自动生成 getter！） |
| `external` | ✓ | ✗ | 只对外；参数可用 calldata（省 gas，2.3 实测） |
| `internal` | ✗ | ✓ | 状态变量默认；「留给继承体系」 |
| `private` | ✗ | 仅自家 | **不等于保密**！ |

`private` 那行加粗的误解必须当场拆掉：**private 只是「合约层的访问控制」，不是「链上保密」**——2.5 篇已经实测过：槽号是公开的数学，任何人 `cast storage` 都能读出 private 变量的值。想保密，别上链（或在 9 篇外研究密码学方案）。

> 一句话收口：**可见性四档 = 「外界×自家」的两个维度；public 变量送 getter，private 不是保密——链上没有秘密，只有哈希的遮挡。**

---

## 第 4 课：可变性——动不动状态

**🧑‍🎓 学生：** view/pure/payable 这组呢？感觉跟可见性很容易混。

**🧑‍🏫 老师：**

完全正交的另一个维度：**这个函数对状态干不干什么**。这组标注直接连着钱（2.3 篇的价目表）：

| 标注 | 对状态的承诺 | 谁能免费调 | 对应 EVM 场景 |
|---|---|---|---|
| `view` | 只读不写 | `eth_call` 免费试跑 | SLOAD 但无 SSTORE |
| `pure` | 读写都不 | `eth_call` 免费 | 纯计算 |
| （不标） | 可能写 | 必须发交易、花 gas | 有 SSTORE |
| `payable` | **可能写 + 能收 ETH** | 同上 | msg.value > 0 合法 |

三条工程军规：

- **能标 view 就标 view，能 pure 就 pure**——不（只）是风格：外部调用方/编译器据此优化，更重要的是**读代码的人一眼知道这个函数动不动钱和状态**；
- **`payable` 是「收钱许可证」**——不带 payable 的函数收到 ETH 直接 revert（合约怎么「被动收钱」的边缘路径 3.6 篇讲）；
- 两套标注**可以同时出现**：`function balanceOf(address) external view returns (uint256)` = 「对外 + 只读」——本篇验收点「解释每个标注」的最小组合。

（`immutable`/`constant` 也归在这个维度：它们是「**永远不变**」的声明，编译器把值直接嵌进字节码——2.3 篇实测过三兄弟价差：561/584/2662 gas。语义区别记半句：**constant 编译期已知（写死在源码）、immutable 部署期定死（constructor 里赋一次）**。）

> 一句话收口：**view/pure/payable 是对「状态与钱」的承诺：只读、纯算、能收钱——标注即文档，也连着 gas 和安全。**

---

## 第 5 课：Bank 实战——第一个结构清晰的合约

**🧑‍🎓 学生：** 讲够了，上主菜。

**🧑‍🏫 老师：**

把前四课的标注全部用上（先不含取款——那是 3.6 的课题）：

```solidity
contract Bank {
    address public immutable owner;             // 部署时写死
    uint256 public constant FEE_BPS = 10;       // 编译期常量（0.1%）

    mapping(address => uint256) private balances;   // private：不给自动 getter
    address[] public depositors;                    // 键集合（3.4 展开）

    event Deposited(address indexed who, uint256 amount);

    constructor() { owner = msg.sender; }

    function deposit() external payable {       // 写 + 收钱
        require(msg.value > 0, "zero deposit");
        if (balances[msg.sender] == 0) depositors.push(msg.sender);
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function balanceOf(address who) external view returns (uint256) {
        return balances[who];                   // 只读
    }

    function totalDeposits() public view returns (uint256 total) {
        for (uint256 i = 0; i < depositors.length; i++)
            total += balances[depositors[i]];   // 内部也复用 → public 而非 external
    }

    function stats() external view returns (uint256 count, uint256 total) {
        return (depositors.length, totalDeposits());
    }
}
```

逐个标注自问自答（验收标准的「解释每个选择」）：

- `deposit` 为什么 **external payable**：对外服务 + 必须能收 ETH；
- `balanceOf` 为什么 **external view**：对外只读查询——前端免 gas 调用（2.4 篇金句「能 call 的绝不上链」的落地）；
- `totalDeposits` 为什么 **public** 而非 external：`stats()` 这个**同合约函数**要调它——external 函数自家调用要走外部调用协议（贵且绕）；
- `balances` 为什么 **private**：不想自动生成「人人可读全表」的 getter（虽然读还是读得到——第 3 课），访问统一走 `balanceOf` 的接口。

跑测试（测试的写法 3.7 篇系统讲，现在先当「可执行的验收」看）：

```text
$ forge test --match-path test/Bank.t.sol -vv
[PASS] test_CheckedOverflowReverts() (gas: 9421)
[PASS] test_DepositAndBalance() (gas: 88221)
[PASS] test_UncheckedWraps() (gas: 6745)
Suite result: ok. 3 passed; 0 failed
```

`test_DepositAndBalance` 里那行 `vm.deal(address(this), 10 ether)` 是作弊码（无中生有 ETH）——3.7 篇的主角提前露脸。

> 一句话收口：**每个标注都是一个可解释的决策：external=对外、view=只读免费、payable=收钱许可、private=不给自动 getter——写得清楚，读的人（含半年后的你）少踩坑。**

---

## 插问 1：SafeMath 哪去了？0.8 之前的代码为什么满屏它？

**🧑‍🎓 学生：** 老教程里 `a.add(b)` 这种写法到处都是——现在直接写 `a + b` 不怕溢出吗？

**🧑‍🏫 老师：**

不怕，因为 **0.8 起溢出检查默认开启**。实测两种写法的行为差异：

```solidity
contract OverflowDemo {
    function checkedAdd(uint8 a, uint8 b) external pure returns (uint8) {
        return a + b;                    // 0.8 默认：溢出即 revert
    }
    function uncheckedAdd(uint8 a, uint8 b) external pure returns (uint8) {
        unchecked { return a + b; }      // 手动关掉检查
    }
}
```

测试实测（uint8 最大 255，喂 250 + 10）：

```text
[PASS] test_CheckedOverflowReverts()   ← checkedAdd：revert（默认检查拦住）
[PASS] test_UncheckedWraps()           ← uncheckedAdd：返回 4（260 mod 256 = 4，回绕！）
```

历史与现状一句话各自说清：**0.7 及以前**，`250 + 10` 会安静地变成 4——整数回绕是无数盗案的温床（Beauty Chain 事件：一行 `balanceOf += value` 溢出归零，秒提天量代币），SafeMath 库就是「手动检查版运算符」；**0.8 起**运算符自带检查、超限即 revert，SafeMath 退役（总纲「旧教程的 SafeMath 内容已是历史」的原文出处）。

`unchecked` 什么时候合法使用？**当你能数学证明不溢时**——比如循环计数器 `i++`（上界就是数组长度）、或刻意利用回绕。省的是每条运算几个 gas 的检查费——**为了这点钱关掉安全网，先问自己证明书写没写**。

> 一句话收口：**0.8 = 溢出默认 revert（SafeMath 退役）；unchecked 是「我有证明」的声明——实测 250+10 回绕成 4，这个画面记住一辈子。**

---

## 小结

1. **骨架**：pragma 锁版本、contract 一次部署永不可改、constructor 跑在部署交易里、msg.* 是交易上下文。
2. **值类型**：uint256 原生最便宜；无浮点、bytes32≠bytes、enum 是糖。
3. **可见性四档**：public 送 getter、external 只对外、internal 留继承、private ≠ 保密（槽是公开数学）。
4. **可变性三诺**：view 只读免费、pure 纯算、payable 收钱许可——与可见性正交。
5. **Bank 实战**：每个标注都可解释（external+payable 的存款口、view 的查询口、public 的内部复用口）；forge test 三绿。
6. **溢出史**：0.8 默认 revert、SafeMath 退役、unchecked=「我有证明」——250+10 回绕 4 实测钉死。

**验收清单**（做完再进下一篇）：

- [ ] 能独立写出含正确可见性/可变性标注的合约并解释每个选择（把 Bank 默写一遍，标注各写一句理由）
- [ ] 能说出 immutable 与 constant 的区别（编译期写死 vs constructor 定死；561 vs 584 gas 的 2.3 实测）

**思考题**：`totalDeposits()` 每次都遍历整个 depositors 数组——存款人到 10 万个时这个函数还便宜吗？能既保持 view 又不遍历吗？（提示：加一个「总额」状态变量随存随加——空间换时间在链上的价格怎么算？3.4 篇回来对账。）

下一篇：[《语法 II：引用类型与数据位置》](/web3区块链/03-solidity/solidity-03-data-location)——storage/memory/calldata 三位置的赋值语义与实测差价，Solidity 第一道坎。

---

## 本篇实验（可照抄）

```bash
# Bank.sol / Bank.t.sol 见第 5、6 课（可整段粘贴），放入 w3-lab2 的 src/ 与 test/
cd /root/w3-lab2
forge build
forge test --match-path test/Bank.t.sol -vv

# chisel 里手验类型行为
chisel   # 试: type(uint8).max / 250 + 10 (uint8 上下文) / uint256(1 ether)
```

---

## 参考资料

- [Solidity Docs — Contracts / Types / Visibility](https://docs.soliditylang.org/en/latest/contracts.html)（本篇口径 0.8.36）
- [Checks-Effects-Interactions 与溢出检查（0.8 breaking changes）](https://docs.soliditylang.org/en/latest/080-breaking-changes.html)（插问 1）
- [checks-effects-interactions 与 Beauty Chain 溢出事件](https://github.com/openzeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/SafeMath.sol)（历史背景）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36（三测试全绿实录）
