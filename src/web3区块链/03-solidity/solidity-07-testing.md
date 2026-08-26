---
title: "Foundry 测试：cheatcodes、fuzz 与 invariant（师生对话实录）"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "07 测试三连"
order: 7
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "实战"
  - "对话实录"
description: 师生对话实录课：给 Bank 配上单测、fuzz、invariant 三层测试——invariant 引擎 256 轮轰出 12.8 万次调用验证总账守恒；在 BuggyBank 里埋一个 unchecked 下溢，fuzz 第一次随机就用「余额 0−167 = 2^256−167」的天量数字抓了现行，反例与 seed 全程实录。
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 21/57 篇**
> 上一篇：[《收付款实战：payable、fallback 与转账三种方式》](/web3区块链/03-solidity/solidity-06-payable-eth) · 下一篇：[《部署与验证：forge script、Sepolia 与 Etherscan》](/web3区块链/03-solidity/solidity-08-deploy-verify)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

前面几课的「测试」都是顺手写的断言，从没正眼看过这套体系。但所有人都说 fuzz 和 invariant 是「资深与入门的分水岭」——**让机器帮你发明刁钻输入、让机器随机组合操作序列找协议级漏洞**，这到底是什么体验？

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课给 Bank 升级三层测试，然后**亲手埋一个 bug 看 fuzz 多快抓到**——中途还踩了 `vm.prank` 的坑，一并如实记录。

课程路线图：

> ① 单测与断言 → ② cheatcodes：测试宇宙的物理外挂 → ③ fuzz：让机器发明输入 → ④ 实战：埋 bug 被抓现行 → ⑤ invariant：协议级不变量 → ⑥ 覆盖率与诊断层级

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36 + forge-std v1.16.2。官方：[Foundry Book — Testing](https://book.getfoundry.sh/forge/tests)。

---

## 第 1 课：单测与断言——可执行的验收标准

**🧑‍🏫 老师：**

升级版 Bank（带提款与总账）配第一个测试：

```solidity
contract BankV2Test is Test {
    BankV2 bank;

    receive() external payable {}     // ← 敲黑板，见下

    function setUp() public { bank = new BankV2(); }

    function test_DepositThenWithdrawAll() public {
        vm.deal(address(this), 10 ether);
        bank.deposit{value: 3 ether}();
        assertEq(bank.balances(address(this)), 3 ether);
        bank.withdraw(3 ether);
        assertEq(bank.balances(address(this)), 0, "deposit-then-withdraw zeroes");
        assertEq(address(this).balance, 10 ether);
    }
}
```

结构约定：`setUp` 每个测试前重建环境（隔离）；`test_` 前缀即测试；断言家族 `assertEq / assertLt / assertApproxEqRel…`（近似比较是 DeFi 数学的常客）。`-vv` 提高日志详细度（`-vvv` 给调用 trace）。

那行 `receive` 是我**当堂踩的坑**：第一版测试报 `transfer failed`——`withdraw` 里 `msg.sender.call{value}` 把钱转回**测试合约**，而测试合约没有 receive、收不了钱（3.6 课的规则反咬）。**测试合约自己也是个合约**，涉及收款回流的测试都得给它开 receive。上一课的知识点在测试里的回马枪，教学价值拉满。

> 一句话收口：**单测 = 可执行的验收标准；setUp 保隔离、断言家族各司其职——别忘了测试合约自己也要能收钱。**

---

## 第 2 课：cheatcodes——测试宇宙的物理外挂

**🧑‍🎓 学生：** `vm.deal` 平白无故给钱——测试凭什么能违反链的规则？

**🧑‍🏫 老师：**

因为测试跑在 **Foundry 的 EVM 模拟器**（就是 anvil 同款内核）里，而 `vm.*` 系列是**模拟器开后门**——cheatcode，测试宇宙的物理外挂。常用四大类：

| 类别 | 代表 | 干什么 |
|---|---|---|
| 造钱造人 | `vm.deal(addr, x)` / `makeAddr("bob")` | 无中生有 ETH、凭空造身份 |
| 换身份 | `vm.prank(bob)` / `vm.startPrank(bob)` | 下一笔/连续以别人身份调用 |
| 时空操作 | `vm.warp(t)` / `vm.roll(n)` | 拨时钟、跳块高（测锁仓/过期必备） |
| 预言断言 | `vm.expectRevert()` / `vm.expectEmit()` | 「下一句必须 revert」「必须发这个事件」 |

两个纪律要立：

- **cheatcode 只属于测试**——生产代码里出现 `vm.` 是编译不过的（它是个只存在于测试环境的地址上的魔法合约）；
- `vm.prank` **只管「下一次调用」**——我在第 4 课踩的真实坑：prank 之后先调了一个 view（读余额），**prank 被这个 view 消耗掉了**，真正的 withdraw 换回原身份执行，测试结果完全失真。**先读完状态、再 prank、立刻做动作**——顺序就是正确性。

（这些外挂和 2.4 篇 anvil 分叉的 `anvil_setBalance` 同宗——一个是模拟器的 RPC 后门、一个是测试框架的语言级后门。）

> 一句话收口：**vm.* = 模拟器后门：造钱、换身份、拨时空、验预期——威力越大越要守纪律（prank 只管一次、只活在测试里）。**

---

## 第 3 课：fuzz——让机器发明输入

**🧑‍🎓 学生：** 单测的输入都是我编的——机器怎么「替我编」？

**🧑‍🏫 老师：**

给测试函数**加参数**，它就从单测变成 fuzz：

```solidity
function testFuzz_DepositThenWithdrawAll(uint96 amount) public {
    vm.assume(amount > 0);                       // 过滤无意义的输入
    vm.deal(address(this), uint256(amount));
    bank.deposit{value: uint256(amount)}();
    bank.withdraw(uint256(amount));
    assertEq(bank.balances(address(this)), 0);   // 性质：存后即取必归零
}
```

跑起来的区别（`-vv` 输出）：

```text
[PASS] testFuzz_DepositThenWithdrawAll(uint96) (runs: 256, μ: 55711, ~: 55516)
```

**256 次随机输入，每次都验证同一性质**。思维方式的转变是本质：单测问「这个输入对不对」，fuzz 问「**这条性质对不对所有输入成立**」——你不再枚举用例，而是**声明不变量**（properties），机器负责找反例。找不到 → 256 个随机样本都通过；找到 → 直接把反例甩你脸上（下一课）。

参数类型选 `uint96` 而不是 `uint256` 也有讲究：**随机 256 位几乎全是天文数字**，有意义区间（以太坊金额量级）被抽中的概率≈0——收窄类型 + `vm.assume` 是 fuzz 的常规操作（`bound(x, min, max)` 是它的精细版）。

> 一句话收口：**fuzz = 声明性质、机器发明输入：256 次随机验证「存后即取归零」——从枚举用例到声明不变量，是测试思维的一次升维。**

---

## 第 4 课：实战——埋 bug 被抓现行

**🧑‍🎓 学生：** 重头戏：故意埋一个 bug，看 fuzz 能不能抓到。

**🧑‍🏫 老师：**

BuggyBank 的提款函数埋一个 `unchecked` 减法（3.2 课那个「250+10」的提款版）：

```solidity
function withdraw(uint256 amount) external {
    unchecked { balances[msg.sender] -= amount; }   // ← bug：没查余额，可下溢
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok);
}
```

对应的性质测试（**任何提款后，提款者余额不许增加**）：

```solidity
function testFuzz_WithdrawNeverInflates(uint96 depositAmt, uint96 withdrawAmt) public {
    vm.assume(withdrawAmt > 0 && withdrawAmt <= 1 ether && depositAmt >= 1 ether);
    vm.deal(address(this), uint256(depositAmt));
    buggy.deposit{value: 1 ether}();                  // 让合约有钱可付

    uint256 before = buggy.balances(victim);          // 先读！（prank 只管下一次）
    vm.prank(victim);                                 // 切换成余额为 0 的受害者
    buggy.withdraw(uint256(withdrawAmt));             // 0 - amount = 下溢
    assertLe(buggy.balances(victim), before, "withdraw must not inflate");
}
```

结果（本机实录）——**fuzz 第一次随机就抓到了**：

```text
[FAIL: withdraw must not inflate:
 115792089237316195423570985008687907853269984665640564039457584007913129639769 > 0;
 counterexample: args=[156067585619406146316233247, 167]]

Fuzz seed: 0x89b9af728f4fb643c5269e73e866cb7a1cdcee0dab3c667765405e32d422de62
(use --fuzz-seed to reproduce)
```

验尸这条输出，三个部件各有深意：

- **反例**：`withdrawAmt = 167`——受害者余额 0，`0 − 167` 在 unchecked 里回绕成 **2²⁵⁶−167**（就是那串 78 位的天文数字）；depositAmt 是凑数的 1.56e26；
- **`runs: 0`**：第 0 轮（第一次随机）就命中——下溢对 fuzzer 来说毫无遮掩；换个更隐蔽的 bug 可能要几千轮，`--fuzz-runs 10000` 加码就是；
- **Fuzz seed**：整场随机的种子——**同事拿着这个 seed 在他机器上跑出完全相同的反例**。可复现性把「我这过了你那没过」的玄学掐死了。

对比一下「单测发现这个 bug」的概率：你得恰好手写一个「余额 0 的人提款 167」的用例——fuzz 把「恰好」自动化了。

> 一句话收口：**fuzz 抓 bug 的姿势：反例参数 + 天量余额实锤 + seed 可复现——0−167 回绕成 2²⁵⁶−167，第一次随机就现行。**

---

## 第 5 课：invariant——协议级不变量

**🧑‍🎓 学生：** fuzz 测的还是「单函数的性质」——整只合约的「协议级正确」怎么测？

**🧑‍🏫 老师：**

`invariant_` 前缀开启第三层：**Foundry 自动对合约的全部 public/external 函数狂轰滥炸，每轮轰完检查你的不变量**：

```solidity
function invariant_TotalLedgerConserved() public view {
    assertEq(bank.totalDeposits(), bank.bankBalance(), "ledger conserved");
    // 不变量：账面总额 == 合约实际余额 —— 任何操作序列后都必须成立
}
```

本机实录（这行测试自己没写任何「调用」）：

```text
[PASS] invariant_TotalLedgerConserved() (runs: 256, calls: 128000, reverts: 60118)

╭----------+----------+-------+---------+----------╮
| Contract | Selector | Calls | Reverts | Discards |
+==================================================+
| BankV2   | deposit  | 63932 | 0       | 0        |
| BankV2   | withdraw | 64068 | 60118   | 0        |
╰----------+----------+-------+---------+----------╯
```

读这份「轰击报告」：256 轮、**12.8 万次随机调用**（deposit 六万多次、withdraw 六万多次——其中六万次因随机超额被 require 拦下 revert，正常），**每次调用后守恒式都验过**。这是 fuzz 的「主动版」：fuzz 你给输入它执行；invariant **它自己发明操作序列**——「随机存款随机取款随机混着来，账永远要平」。

设计不变量是资深的核心技能，三个起点：

- **守恒类**：总量 = Σ 份额（ERC-4626 的 4.3 篇主场）；
- **单调类**：某值只减不增 / 只增不减；
- **可达类**：任何人随时能拿回属于自己的东西（「提款权」不变量）。

（进阶的 handler 模式——让轰击「像真实用户」而不是纯随机——6.7 篇审计方法论再展开。）

> 一句话收口：**invariant = 你声明不变量、机器发明操作序列：256 轮 12.8 万次调用验证「总账守恒」——协议级正确性的自动化压力测试。**

---

## 插问 1：覆盖率 100% 就安全了吗？

**🧑‍🎓 学生：** 老板要求覆盖率——`forge coverage` 跑到 100% 是不是就稳了？

**🧑‍🏫 老师：**

不是，而且这个误解值得专门拆。覆盖率度量的是「**哪些行被执行过**」——它回答「测到没有」，不回答「**测得对不对**」：

```text
线覆盖率 100% 的三种虚假安全感：
├── 只跑不验：调用了 withdraw，但没断言余额变化 —— 行覆盖了，性质没测
├── 断言恒真：assert(balances(x) >= 0) —— uint 永远 ≥ 0，写了等于没写
└── 分支不均：溢出路径走到了 revert 就返回 —— 「失败分支」被覆盖但 bug 藏在成功路径
```

正确的层级观：**行覆盖是底线（没跑过的代码肯定没测），性质覆盖是主体（fuzz/invariant），语义正确是目标（审计）**。OWASP 智能合约 Top 10 时代的安全标配（总纲「安全基准」）是「Slither 静扫 + fuzz/invariant + 人工复核」三层——覆盖率只是第一层的仪表盘。`forge coverage` 该跑（找漏测的分支），但 100% 之后工作才刚开始。

> 一句话收口：**覆盖率测「执行过」不测「验证过」——它是底线不是目标；100% 行覆盖 + 0 条有意义的 invariant 是常见的虚假安全。**

---

## 小结

1. **单测**：setUp 隔离、断言家族、`-vv` 诊断；**测试合约自己要能收款**（receive 的回马枪）。
2. **cheatcodes**：vm.deal/prank/warp/expectRevert 四类外挂；**prank 只管下一次调用**（先读状态再 prank——亲测的坑）。
3. **fuzz**：参数化 + 性质声明，256 次随机；uint96 收窄 + vm.assume 是常规操作。
4. **抓 bug 实录**：unchecked 下溢被第一次随机命中——反例 args、2²⁵⁶−167 实锤、seed 可复现。
5. **invariant**：机器发明操作序列，256 轮 12.8 万次调用验证总账守恒；守恒/单调/可达三类起点。
6. **覆盖率观**：测「执行过」不测「验证过」——底线仪表盘，不是安全证书。

**验收清单**（做完再进下一篇）：

- [ ] 能为任意合约设计至少 3 条有意义的 invariant（拿 Leaderboard 试：总额守恒、键集合无重复、top() 输出长度 = 键集合长度）
- [ ] 能让 fuzz 抓到自己埋的 bug 并读懂反例输出（复现第 4 课，换 bug 类型再来一次：把 `+=` 埋成 `-=`）

**思考题**：BuggyBank 的 bug 是「余额检查缺失 + unchecked」——只修一半（加回 require 但保留 unchecked）安全吗？反过来（去 unchecked 但不修顺序）呢？（提示：两个修复各挡住哪条攻击路径；fuzz 的性质断言要不要改？）

下一篇：[《部署与验证：forge script、Sepolia 与 Etherscan》](/web3区块链/03-solidity/solidity-08-deploy-verify)——阶段 3 收官：把测好的合约送出本地，送到全世界面前。

---

## 本篇实验（可照抄）

```bash
# BankV2.sol / BankV2.t.sol 见正文；三层测试一次跑
cd /root/w3-lab2
forge test --match-path test/BankV2.t.sol -vv          # 单测 + fuzz
forge test --match-contract BankV2Test -vv              # invariant 轰击报告
forge test --match-contract BuggyBankTest -vv           # 看 fuzz 抓 bug 的反例
forge test --fuzz-seed 0x89b9af728f4fb643c5269e73e866cb7a1cdcee0dab3c667765405e32d422de62 \
    --match-contract BuggyBankTest                      # 复现同一次随机

forge coverage                                          # 覆盖率仪表盘（记得它测什么）
```

---

## 参考资料

- [Foundry Book — Writing Tests / Fuzz Testing / Invariant Testing](https://book.getfoundry.sh/forge/tests)
- [forge-std — Cheatcodes Reference](https://github.com/foundry-rs/forge-std/blob/master/src/Vm.sol)（vm.* 全家族）
- [Foundry Book — forge coverage](https://book.getfoundry.sh/forge/coverage/)（插问 1 的边界）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36 + forge-std v1.16.2（反例与 seed 实录）
