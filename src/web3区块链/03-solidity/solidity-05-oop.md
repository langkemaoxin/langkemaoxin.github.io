---
title: "继承、接口、库与抽象合约（师生对话实录）"
sidebarGroup: "Solidity 与 Foundry"
shortTitle: "05 继承与接口"
order: 5
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "Solidity"
  - "Foundry"
  - "对话实录"
description: 师生对话实录课：Grandpa→Papa→Son 三代继承链用事件打点，实测构造顺序最基类先、super 一路打到顶再折返；IERC20 十行接口现场读主网 USDC——Solidity 的组合术和「跟任何已部署合约说话」的 ABI 机制一次讲透。
---

> **Web3 区块链系列 · 阶段 3 · Solidity 与 Foundry · 第 19/57 篇**
> 上一篇：[《语法 III：映射、数组、结构体与事件》](/web3区块链/03-solidity/solidity-04-mappings-events) · 下一篇：[《收付款实战：payable、fallback 与转账三种方式》](/web3区块链/03-solidity/solidity-06-payable-eth)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

写到现在，我的合约都是「独栋」的。但 OpenZeppelin 的合约满屏 `is ERC20`、接口文件里全是纯函数声明——**Solidity 的面向对象和 Java 是一套东西吗**？还有最实际的：想读主网上一个已部署的合约，我总不能把它源码搬过来吧？

继续对话老办法：AI 当老师我当学生，有问题就打断。这堂课搭一条三代继承链、给每一层装上事件打点，**用实测的事件顺序把「构造顺序」和「super 路径」钉死**；下半场用十行接口直接读主网 USDC。

课程路线图：

> ① is 与 C3 线性化 → ② 实测：构造顺序与 super 路径 → ③ 接口与 ABI：跟任何合约说话 → ④ 库与 using…for → ⑤ abstract 的位置 → ⑥ Solidity OOP vs Java

环境：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；Inherit.sol 部署于本地 anvil。官方：[Solidity Docs — Contracts: Inheritance](https://docs.soliditylang.org/en/latest/contracts.html#inheritance)。

---

## 第 1 课：is 与 C3 线性化——先把「顺序」说清

**🧑‍🏫 老师：**

Solidity 的继承是**编译期复制粘贴**（不是运行期的类查找）——这句先埋着，第 2 课的实测会反过来说明它。语法与铁律：

```solidity
contract Papa is Grandpa { … }        // 单继承
contract Son is Papa { … }            // 链式

// 多继承：书写顺序 = 基类优先级（most-base-first）
contract Diamond is Base1, Base2, Base3 { … }
```

**C3 线性化**：多继承时，编译器把所有基类压平成一条**全序**（菱形继承的共同祖先只出现一次、位置最靠后），`super` 沿这条线往上走。规则浓缩成一句话：**你写的 `is A, B` 顺序就是优先级**——`super.f()` 先找 A 链再找 B 链。

两个和 Java 明显不同的点先摆出来：

- **override 要显式双向标注**：基类函数写 `virtual`（可被覆盖），子类写 `override`（我在覆盖）——漏一边编译器当场拒绝（比 Java 的 `@Override` 可选严格）；
- **构造函数参数**在 `is` 列表里传：`contract Son is Papa(42) { }` 或在子类 constructor 里 `Papa(42)`——没有 Java 的 `super(...)` 调用语法。

> 一句话收口：**is 的书写顺序 = 优先级；C3 线性化把继承图压成一条全序，super 就沿这条线走——virtual/override 双向显式标注，没有隐式覆盖。**

---

## 第 2 课：实测——构造顺序与 super 路径

**🧑‍🎓 学生：** 「最基类先构造」我背过——能看见吗？

**🧑‍🏫 老师：**

上三代链，每层 constructor 和 who() 里都打事件（上一课刚学的技能当探针）：

```solidity
contract Grandpa {
    event Log(string tag);
    constructor() { emit Log("Grandpa constructor"); }
    function who() public virtual returns (string memory) {
        emit Log("Grandpa.who");
        return "grandpa";
    }
}
contract Papa is Grandpa {
    constructor() { emit Log("Papa constructor"); }
    function who() public virtual override returns (string memory) {
        emit Log("Papa.who enter");
        string memory up = super.who();          // 沿线性化往上
        emit Log("Papa.who after super");
        return string.concat("papa <- ", up);
    }
}
contract Son is Papa { /* 同款结构，super.who() 再包一层 */ }
```

部署 `Son` 到本地链，再调 `who()`，把两块的全部事件按时序解码出来（本机实跑）：

```text
共 8 条 Log 事件
  block 13  logIndex 0: Grandpa constructor      ┐ 部署交易
  block 13  logIndex 1: Papa constructor         │ 构造顺序：
  block 13  logIndex 2: Son constructor          ┘ 最基类先！

  block 14  logIndex 0: Son.who enter            ┐ 调用 who()
  block 14  logIndex 1: Papa.who enter           │ super 一路到顶
  block 14  logIndex 2: Grandpa.who              │ 再逐层折返
  block 14  logIndex 3: Papa.who after super     │ 完整的「下→上→下」
  block 14  logIndex 4: Son.who after super      ┘

who() 返回: "son <- papa <- grandpa"
```

两个结构性结论当场坐实：

- **构造顺序 = 线性化的逆序**（Grandpa → Papa → Son）：为什么必须最基类先？——子类的 constructor 可能依赖基类已初始化的状态（想象 Papa 的构造函数读 Grandpa 设的 owner）。依赖图决定了「地基先浇」；
- **super 的路径是单程票往返**：Son 的 `super.who()` 跳到 **Papa**（不是 Grandpa！），Papa 的 `super.who()` 才到 Grandpa——`super` 不是「找父类」，是「**找线性化序列里的下一个**」。这正是 C3 线性化存在的意义：多继承时大家都按同一条全序走，不会打架。

（这里还有个我踩的坑如实记下：一开始我把 `who()` 写成 `external`，编译器报 `Member "who" not found … in type(contract super Papa)`——**external 函数不能被 super 内部调用**（3.2 课「自家调用要走外部协议」的继承版）。改成 `public virtual` 立即通过。）

> 一句话收口：**实测钉死两条：构造最基类先（依赖决定）、super 沿线性化一格格走（不是「跳到父类」）——事件打点是把执行顺序变成可见数据的好探针。**

---

## 第 3 课：接口与 ABI——跟主网任何合约说话

**🧑‍🎓 学生：** 下半场那个问题：读主网 USDC，我不可能把它的源码拷进项目吧？

**🧑‍🏫 老师：**

只需要**接口**——声明「它有哪些函数」的最小契约：

```solidity
interface IERC20 {
    function name() external view returns (string memory);
    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}
```

十行以内的接口（只写签名、不写函数体），配合 cast 直接读主网（本机实跑）：

```text
$ cast call 0xA0b8…eB48 'name()(string)' --rpc-url $MRPC
"USD Coin"
$ cast call 0xA0b8…eB48 'totalSupply()(uint256)' --rpc-url $MRPC
50558662010058926 [5.055e16]        ← ≈ 505.6 亿枚 USDC
```

**凭什么这么少的信息就够**？回看 2.2 篇插问 1 的 calldata 结构——「调合约」的全部内容是 `4 字节选择器 + ABI 参数`，而选择器 = `keccak("name()")[:4]`。**接口就是选择器的生产说明书**：知道签名就知道怎么编码 calldata、怎么解码返回值——**合约的「API 文档」和「调用协议」是同一份东西**（这就是 ABI，Application Binary Interface）。

三个工程要点顺出来：

- **接口是「对方承诺的形状」**：调用方按接口编码、被调方按实现解码——两边版本独立演进。Solidity 世界的通用礼节：对外交互一律走 `IERC20(token).transfer(…)` 这种接口调用（而不是 import 对方实现）；
- **cast 其实跳过了接口**：命令行的 `'name()(string)'` 直接现场算选择器——cast 就是「把 ABI 编码自动化了的 curl」（2.4 篇「亲自当客户端」的完成体）；
- **接口不带构造函数、不存状态、不能有实现**（0.8.x 起连 internal 函数都不行）——它是纯粹的「契约声明」，与第 5 课的 abstract 对照着记。

> 一句话收口：**接口 = 选择器的说明书：知道签名就能编码调用、解码返回——跟主网任何合约说话不需要它的源码，只需要它的 ABI。**

---

## 第 4 课：库（library）与 using…for

**🧑‍🎓 学生：** 还有一种 `library`——跟合约什么区别？

**🧑‍🏫 老师：**

`library` 是**无状态的工具箱**，两个关键词：

```solidity
library Math {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        return a + b;
    }
}

contract C {
    using Math for uint256;              // 把库挂到类型上
    function f(uint256 x) public pure returns (uint256) {
        return x.add(1);                 // 第一个参数自动成为「调用者」
    }
}
```

- **internal 库函数被编译器内联**——`x.add(1)` 编译后就是普通代码，**没有跨合约调用、没有 CALL 开销**（等于把工具函数「抄进」你的合约）；external 库函数则是真调用（库单独部署、地址链接）——现代实践几乎只用 internal；
- **using…for 的甜头**：`x.add(1)` 读作「给 x 这个类型的变量装上 Math 的方法」——链式写法（`amount.mul(rate).div(1e18)`）的可读性来源；代价是「方法从哪来」变隐式，review 时要认得。

选型的直觉：**纯函数工具（数学、编码、断言辅助）→ library；有状态、有生命周期 → 合约；只声明形状 → interface；形状 + 部分共享实现 → 下一课的 abstract**。

> 一句话收口：**library = 被内联的无状态工具箱，using…for 给类型挂方法——纯函数进库，CALL 一分不花。**

---

## 第 5 课：abstract——接口和实现之间的过渡态

**🧑‍🎓 学生：** 抽象合约夹在中间，什么时候用它而不是接口？

**🧑‍🏫 老师：**

`abstract contract` = **可以有自己的状态变量和已实现函数，但至少留一个未实现（抽象）函数**的合约。它不能被部署，只能被继承。三者边界一张表收齐（本篇验收点）：

| | interface | abstract contract | （普通）contract |
|---|---|---|---|
| 状态变量 | ❌ | ✅ | ✅ |
| 已实现函数 | ❌（0.8.x） | ✅ | ✅ |
| 构造函数 | ❌ | ✅ | ✅ |
| 可直接部署 | ❌ | ❌ | ✅ |
| 语义 | 「我承诺这个形状」 | 「我实现了大半，留个洞给子类填」 | 完整产品 |

经典用法：**模板方法模式**——基类写好流程骨架（含状态与通用逻辑），把「每家不一样的一步」留成抽象函数。OpenZeppelin 的 `ERC20` 本体可以视作「基本完整、留扩展点」的富基类，而它的 `IERC20` 是对外的接口声明——**工程里的常见组合：对外 interface、对内 abstract、落地 contract**。

> 一句话收口：**interface 承诺形状、abstract 完成大半留洞、contract 是产品——三层按「实现完成度」排，对外永远只暴露最薄的那层。**

---

## 插问 1：Solidity 的 OOP 和 Java 到底差在哪？

**🧑‍🎓 学生：** 学到现在感觉像又学了一遍 Java——但老师说「编译期复制粘贴」，差别的本质是什么？

**🧑‍🏫 老师：**

一句话版本：**Java 的继承在运行时，Solidity 的继承在编译时**。展开三层：

- **编译期展平**：`contract Son is Papa` 编译出的字节码里**没有 Papa 这个实体**——Papa 的代码被「抄」进 Son 的字节码，运行时只有一份。所以没有 Java 的虚方法表、没有运行时类型查找——**super 的路径编译时就定死了**（第 2 课实测的那条线，是编译产物不是运行时行为）；
- **部署单位是最终合约**：你部署的是 Son，不是「Son + Papa 两个对象」；跨合约的运行时交互只有一种——**消息调用**（CALL，2.3 篇的跨合约档），那才是真正的「对象边界」；
- **不可变性的约束**：Java 类可以热加载新版本，Solidity 合约部署即冻结——所以「继承」只发生在写代码时，「组合」发生在运行时（通过接口互相调用）。可升级性要靠代理模式「换实现」（4.4 篇，把「组合」玩成继承的替身）。

记忆锚点：**继承 = 写作期的代码复用；调用 = 运行期的对象交互**——两件事在 Java 里混在一起，在 Solidity 里被部署的不可变性彻底分开了。

> 一句话收口：**Java 运行时找类，Solidity 编译期抄码——继承只是写作工具，运行时唯一的对象边界是 CALL。**

---

## 小结

1. **is 与 C3 线性化**：书写顺序即优先级，菱形共同祖先只出现一次；virtual/override 双向显式。
2. **实测顺序**（8 条事件钉死）：构造 = 最基类先（Grandpa→Papa→Son）；super = 沿线性化逐级（Son→Papa→Grandpa→折返）。
3. **踩坑实录**：external 函数不能被 super 调用——继承链内的可覆盖函数用 `public virtual`。
4. **接口与 ABI**：签名即协议——知道函数签名就能编码调用；cast 的 `'name()(string)'` 就是现场 ABI 编码（主网 USDC 实读）。
5. **library**：无状态工具箱，internal 函数被内联零 CALL 开销；using…for 挂方法。
6. **三层选型**：interface（形状）/ abstract（大半实现留洞）/ contract（产品）——对外只暴露最薄层。
7. **与 Java 的本质差**：编译期抄码 vs 运行时查类；继承是写作工具，CALL 是唯一运行时边界。

**验收清单**（做完再进下一篇）：

- [ ] 能画出多继承合约的线性化顺序（拿 `contract X is A, B` 且 A、B 都继承 Base 的菱形，写出 C3 全序——`forge inspect X linearization` 可以对答案）
- [ ] 能解释 interface、library、abstract 三者的使用边界（第 4、5 课两张表）

**思考题**：`interface IERC20` 里只写了三个函数，USDC 实际有二十来个函数（transfer、approve、mint…）——用这个「残缺接口」调 `transfer` 会发生什么？（提示：选择器是按签名算的，接口「不知道」的函数……你的接口里根本没有那个签名，编译期就拒绝。那 cast 为什么调得了任意函数？）

下一篇：[《收付款实战：payable、fallback 与转账三种方式》](/web3区块链/03-solidity/solidity-06-payable-eth)——合约的钱怎么收、怎么转、怎么「带着钱调别人」——重入攻击的种子在此埋下。

---

## 本篇实验（可照抄）

```bash
# Inherit.sol 见第 2 课；部署 + 调用 + 解码事件
forge create src/Inherit.sol:Son --rpc-url http://127.0.0.1:18545 \
    --private-key … --broadcast
SON=<部署地址>
cast send $SON 'who()' --private-key … --rpc-url $RPC
cast call $SON 'who()(string)' --rpc-url $RPC        # "son <- papa <- grandpa"
cast logs --from-block 1 'Log(string)' --address $SON --rpc-url $RPC   # 8 条打点

# 线性化对答案（多继承时）
forge inspect Son linearization

# 接口读主网（第 3 课）
cast call 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 'name()(string)' \
    --rpc-url https://ethereum-rpc.publicnode.com
cast call 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 'balanceOf(address)(uint256)' \
    0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --rpc-url https://ethereum-rpc.publicnode.com
```

---

## 参考资料

- [Solidity Docs — Inheritance / Interfaces / Libraries](https://docs.soliditylang.org/en/latest/contracts.html#inheritance)（C3 线性化与 most-base-first 的原文）
- [Solidity Docs — ABI Specification](https://docs.soliditylang.org/en/latest/abi-spec.html)（第 3 课「签名即协议」的规范）
- 2.2 篇插问 1（选择器与 calldata 的底层）、2.3 篇（CALL 与内联 JUMP 的 gas 差）
- 本机：WSL2 Ubuntu-22.04 + Foundry 1.7.1 + solc 0.8.36；Inherit.sol 部署于本地 anvil（8 条事件实录）
