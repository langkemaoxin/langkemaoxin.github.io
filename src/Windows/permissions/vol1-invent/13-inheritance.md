---
title: "第 12 讲：继承——从「子文件太多」一步步发明（重点）"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 12 讲：继承"
order: 13
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：不先背 OI/CI/IO/NP，而是搭一棵三层小树、做八个实验，从现象里把五个继承括号一个个「发明」出来。八连实验全部在 C:\Lab\inh 重跑，每棵树的根/子/孙三层输出逐行实录，最后才对接 .NET 两套枚举与 GUI「适用于」。
---

# 第 12 讲：继承——从「子文件太多」一步步发明（重点）

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生。这一讲我们**假设还没听过** OI、CI、InheritanceFlags 这些词——只带着已经会的东西做最小实验，看到现象再起名字。实验沙盒 `C:\Lab\inh\`（[C:\Lab](../appendix/04-lab.md) 约定）。

---

## 开场

**🧑‍🏫 老师：**

项目目录下有成百上千个文件，你不可能对每个文件单独 `/grant` 一遍。问题变成：**能不能在父文件夹上写一次，让下面的对象自动带上规则？**

**🧑‍🎓 学生：** 我猜可以？权限不是「跟着对象走」吗，那跟着目录走应该也行？

**🧑‍🏫 老师：**

别猜——搭一棵最小的树，看系统实际怎么做。骨架（每个实验换一棵干净的，避免上次实验的 ACE 搅局）：

```text
LabNN\
├── file-root.txt          ← 根上的文件
└── Sub\                   ← 直接子文件夹
    ├── file-sub.txt       ← 子文件
    └── Sub1\              ← 孙文件夹
        └── file-sub1.txt  ← 孙文件
```

读结果时**只盯你刚加上的那一行**（`JZFZ\chengongyi`），从 `C:\Lab` 继承来的其它行一律从略。

---

## 第 1 课：实验 0 + 实验 1——还没写规则，树上已经有「流下来的」东西

**🧑‍🏫 老师：**

先摸底：你还没改任何权限时，树上长什么样？

```text
PS> icacls C:\Lab\inh\Lab01
C:\Lab\inh\Lab01 JZFZ\chengongyi:(RX)                     ← 待会儿实验 1 加的，先忽略
                 BUILTIN\Administrators:(I)(OI)(CI)(F)     ← 注意这行
                 NT AUTHORITY\SYSTEM:(I)(OI)(CI)(F)
```

**现象**：你一行都没写，很多行已经带个 `(I)`。**推导**：某些 ACE 可以**从父文件夹流到子对象**；`(I)` 是系统打的结果标记——「这条不是你在本层新写的，是流下来的」。你**不会**在 `/grant` 时手写 `(I)`，它是查看时才看到的。同行还有 `(OI)(CI)` 这些「行李」，后面逐个认。

现在写第一条规则试试——最朴素的 `/grant`，不带任何括号：

```bat
icacls C:\Lab\inh\Lab01 /grant "JZFZ\chengongyi:RX"
```

再看树上六层（本机实测，只盯我的行）：

```text
Lab01                         me:(RX)          ← 根上有，无 (I)：本层显式写的
Lab01\file-root.txt           (none)           ← 子女全都没有！
Lab01\Sub                     (none)
Lab01\Sub\file-sub.txt        (none)
Lab01\Sub\Sub1                (none)
Lab01\Sub\Sub1\file-sub1.txt  (none)
```

**🧑‍🎓 学生：** 和我猜的相反——朴素 grant **只贴当前这一层**，完全不往下流！

**🧑‍🏫 老师：**

对。要让下面成百上千个文件生效，要么逐个 grant（开头的麻烦），要么系统藏着「请往下流」的开关。下一课去找它。

---

## 第 2 课：实验 2 + 实验 3——两个独立开关：朝文件走、朝文件夹走

**🧑‍🏫 老师：**

在朴素的 `:RX` 前面加个括号 `(OI)` 试试（O 常和 object 有关——先当黑盒按钮）：

```bat
icacls C:\Lab\inh\Lab02 /grant "JZFZ\chengongyi:(OI)RX"
```

```text
Lab02                         me:(OI)(RX)            ← 根：显式 + (OI)
Lab02\file-root.txt           me:(I)(RX)             ← 文件吃到了！带 (I)
Lab02\Sub                     me:(I)(OI)(IO)(RX)     ← 子文件夹也有，但多了个 (IO)
Lab02\Sub\file-sub.txt        me:(I)(RX)
Lab02\Sub\Sub1                me:(I)(OI)(IO)(RX)
Lab02\Sub\Sub1\file-sub1.txt  me:(I)(RX)
```

**现象**：所有**文件**都吃到了规则；子文件夹也有、但带个新面孔 `(IO)`。**推导**：`(OI)` = **Object Inherit——朝文件方向传**。子文件夹上那个 `(IO)` 先记着现象：「文件夹拿到的不一定是给自己用的访问权，也可能是**继续往文件送的中转模板**」——第 4 课专门验它。

对称地，换 `(CI)`（C 常和 container = 容器 = 文件夹有关）：

```bat
icacls C:\Lab\inh\Lab03 /grant "JZFZ\chengongyi:(CI)RX"
```

```text
Lab03                         me:(CI)(RX)
Lab03\file-root.txt           (none)                 ← 文件完全没有！
Lab03\Sub                     me:(I)(CI)(RX)         ← 文件夹链有
Lab03\Sub\file-sub.txt        (none)
Lab03\Sub\Sub1                me:(I)(CI)(RX)
Lab03\Sub\Sub1\file-sub1.txt  (none)
```

**🧑‍🎓 学生：** 明白了——`(OI)` 偏文件、`(CI)` 偏文件夹，是**两个独立开关**，不是同义词。

---

## 第 3 课：实验 4——两开关齐开，整树统一（日常写法）

**🧑‍🏫 老师：**

日常最常见的「父文件夹写一次、下面文件和文件夹全跟上」，就是两开关一起：

```bat
icacls C:\Lab\inh\Lab04 /grant "JZFZ\chengongyi:(OI)(CI)RX"
```

```text
Lab04                         me:(OI)(CI)(RX)        ← 根：显式 + 双开关
Lab04\file-root.txt           me:(I)(RX)             ← 文件
Lab04\Sub                     me:(I)(OI)(CI)(RX)     ← 子文件夹：还带着双开关
Lab04\Sub\file-sub.txt        me:(I)(RX)
Lab04\Sub\Sub1                me:(I)(OI)(CI)(RX)     ← 孙文件夹：还在传
Lab04\Sub\Sub1\file-sub1.txt  me:(I)(RX)
```

现在可以**完整读一行**了：

```text
JZFZ\chengongyi:(I)(OI)(CI)(RX)
   谁          │     │     │    └ 读执行
               │     │     └ 还会传给子文件夹
               │     └ 还会传给子文件
               └ 这条是流下来的（继承的）
```

注意子文件夹上仍带 `(OI)(CI)`——它还是传播源，往更深层传；文件上只剩 `(I)(RX)`——文件不是容器，不再携带传播标志。

---

## 第 4 课：实验 5——`(IO)`：当前自己不吃，专当种子

**🧑‍🎓 学生：** 实验 2 里子文件夹上那个 `(IO)` 一直悬着。而且我想到一种需求：`Lab05` 只是个入口目录，我**不靠这条规则开它自己**，只想把规则**种给下面的**——有办法吗？

**🧑‍🏫 老师：**

问到了 `(IO)` 的本职。在双开关上再加 `(IO)`：

```bat
icacls C:\Lab\inh\Lab05 /grant "JZFZ\chengongyi:(OI)(CI)(IO)RX"
```

```text
Lab05                         me:(OI)(CI)(IO)(RX)    ← 根：行还在，多了 (IO)
Lab05\file-root.txt           me:(I)(RX)             ← 子孙照常吃到（无 IO）
Lab05\Sub                     me:(I)(OI)(CI)(RX)
Lab05\Sub\file-sub.txt        me:(I)(RX)
Lab05\Sub\Sub1                me:(I)(OI)(CI)(RX)
Lab05\Sub\Sub1\file-sub1.txt  me:(I)(RX)
```

子孙侧和实验 4 一模一样；**唯一差别在根自己**。这里要先分清两件事（第 9/10 讲已会）：

| | 在干什么 |
|--|----------|
| `icacls` 查看 | 「门上写了什么字？」 |
| 访问检查 | 「按这些字，现在允不允许你对这个对象做某件事？」 |

`(IO)` 卡在第二步、不卡第一步：**带 `(IO)` 的 ACE 仍然出现在 `icacls` 输出里（你看得到）；但对「当前这个文件夹自己」做访问检查时，系统把它跳过，不当本层的放行依据。**

对照表（差别只在「根自己」）：

| | 实验 4 `(OI)(CI)` | 实验 5 加 `(IO)` |
|--|------------------|------------------|
| 根上 `icacls` 看不看得到 | 看得到 | 也看得到 |
| 打开**根**时这条参不参与对表 | 参与 | **不参与** |
| 打开子孙时流下去的那份 | 参与 | 参与 |

生活比喻：没有 IO，大门上的告示**既管大门**、也复印给里面每间房；有 IO，大门上贴的是「请把复印件发给里面房间」的**通知模板**——大门自己不按这张告示放行，里面房间按复印件执行。

> `(IO)` = **Inherit Only（仅继承）**：当前不拿来开门，专给子孙用。回头看实验 2：子文件夹上自动出现的 `(I)(OI)(IO)…` 就是同一味道——文件夹常常只是「给文件的规则」的**中转站**。适用场景：共享根/挂载点只是入口结构，不想让父对象因这条变宽。

---

## 第 5 课：实验 6 + 实验 7——`(NP)`：只传一层

**🧑‍🎓 学生：** 还有一种需求：规则只覆盖**直接子级**，别渗进孙子（临时目录、外包一层）。做得到吗？

**🧑‍🏫 老师：**

`(NP)` 就是它（No Propagate）：

```bat
icacls C:\Lab\inh\Lab06 /grant "JZFZ\chengongyi:(OI)(CI)(NP)RX"
```

```text
Lab06                         me:(OI)(CI)(NP)(RX)
Lab06\file-root.txt           me:(I)(RX)             ← 直接子有
Lab06\Sub                     me:(I)(RX)             ← 直接子有——注意：剥掉了传播标志！
Lab06\Sub\file-sub.txt        (none)                 ← 孙子全没有
Lab06\Sub\Sub1                (none)
Lab06\Sub\Sub1\file-sub1.txt  (none)
```

**现象**：直接子有、再往下没有；关键是 `Sub` 上是 `(I)(RX)`——**已经没有** `(OI)(CI)`。**推导**：直接子拿到的是「剥掉传播标志」的生效 ACE，于是它不再是新的传播源——传一层就停。对照实验 4：没有 `(NP)` 时 `Sub` 上仍是 `(I)(OI)(CI)(RX)` 会继续传。

最后把「自己不吃」和「只传一层」叠起来：

```bat
icacls C:\Lab\inh\Lab07 /grant "JZFZ\chengongyi:(OI)(CI)(IO)(NP)RX"
```

```text
Lab07                         me:(OI)(CI)(NP)(IO)(RX)   ← 括号顺序可能互换，按集合读
Lab07\file-root.txt           me:(I)(RX)
Lab07\Sub                     me:(I)(RX)
（Sub 以下更深 → 没有）
```

根自己不吃 + 直接子吃一层——两个开关的简单叠加，没有第三种魔法。

---

## 第 6 课：收束——五个括号都是「长出来的」

**🧑‍🏫 老师：**

把八个实验钉成一张表：

| 记号 | 你亲眼见过的作用 |
|------|------------------|
| `(I)` | 结果标记：「流下来的」 |
| `(OI)` | 朝**文件**传 |
| `(CI)` | 朝**文件夹**传 |
| `(IO)` | 当前对象**不吃**，当种子 |
| `(NP)` | 只到直接子级，**停传** |

| 实验 | 命令要点 | 根 | 直接子 | 孙子 |
|------|----------|----|--------|------|
| 1 | `:RX` | 有 | 无 | 无 |
| 2 | `:(OI)RX` | 有 | 文件有；文件夹带 IO 模板 | 文件有 |
| 3 | `:(CI)RX` | 有 | 仅文件夹 | 仅文件夹 |
| 4 | `:(OI)(CI)RX` | 有 | 都有 | 都有 |
| 5 | `…(IO)…` | 有行但不吃 | 有 | 有 |
| 6 | `…(NP)…` | 有 | 有（停传） | 无 |
| 7 | `…(IO)(NP)…` | 有行但不吃 | 有（停传） | 无 |

---

## 插问：现在才起学名——.NET 和 GUI 里叫什么？

**🧑‍🎓 学生：** 我在 C# 文档里见过 `InheritanceFlags`、`PropagationFlags`，和这五个括号什么关系？

**🧑‍🏫 老师：**

口诀：**一组管「传给谁」，一组管「自己吃不吃、传多深」**：

| 你已经会的 | .NET 枚举 | 枚举值 |
|------------|-----------|--------|
| `(OI)` / `(CI)` | **`InheritanceFlags`**（传给谁） | `ObjectInherit` / `ContainerInherit`（可按位或） |
| `(IO)` / `(NP)` | **`PropagationFlags`**（吃不吃、传多深） | `InheritOnly` / `NoPropagateInherit` |
| `(I)` | （显示结果，不是授予参数） | — |

与 GUI「适用于」对照：

| 适用于（GUI） | 对应实验 | 等价命令 |
|---------------|----------|----------|
| 只有该文件夹 | 1 | `…:RX` |
| 该文件夹和文件 | 2 | `…:(OI)RX` |
| 该文件夹和子文件夹 | 3 | `…:(CI)RX` |
| 该文件夹、子文件夹和文件 | 4 | `…:(OI)(CI)RX` |
| 只有子文件夹和文件 | 5 | `…:(OI)(CI)(IO)RX` |
| （只要直接一层） | 6 | `…:(OI)(CI)(NP)RX` |

C# 里复现同一套实验（一个辅助函数 + 七次调用）：

```csharp
static void Grant(string path, InheritanceFlags inh, PropagationFlags prop)
{
    var rule = new FileSystemAccessRule(
        new NTAccount(@"JZFZ\chengongyi"),
        FileSystemRights.ReadAndExecute, inh, prop,
        AccessControlType.Allow);
    var acl = Directory.GetAccessControl(path);
    acl.AddAccessRule(rule);
    Directory.SetAccessControl(path, acl);
}

Grant(path, InheritanceFlags.None,                     PropagationFlags.None);                    // 实验1
Grant(path, InheritanceFlags.ObjectInherit,            PropagationFlags.None);                    // 实验2
Grant(path, InheritanceFlags.ContainerInherit,         PropagationFlags.None);                    // 实验3
Grant(path, InheritanceFlags.ContainerInherit
              | InheritanceFlags.ObjectInherit,        PropagationFlags.None);                    // 实验4
Grant(path, InheritanceFlags.ContainerInherit
              | InheritanceFlags.ObjectInherit,        PropagationFlags.InheritOnly);             // 实验5
Grant(path, InheritanceFlags.ContainerInherit
              | InheritanceFlags.ObjectInherit,        PropagationFlags.NoPropagateInherit);      // 实验6
Grant(path, InheritanceFlags.ContainerInherit
              | InheritanceFlags.ObjectInherit,        PropagationFlags.InheritOnly
                                                              | PropagationFlags.NoPropagateInherit); // 实验7
```

顺带 `icacls` 的继承开关三件套（第 6/9 讲用过 `/inheritance:r`）：`/inheritance:d` 关继承但**复制**继承项为显式、`/inheritance:e` 打开继承、`/inheritance:r` 关继承并**丢弃**。实操三个坑：禁用继承时「复制 vs 移除」后果不同；显式与继承 ACE 可并存（显式压继承——第 7 讲铁律二）；**根上一条错误 Deny + `(OI)(CI)` 会杀伤整棵树**。

---

## 收束

**你现在会了：** 用八个最小实验自己「发明」了继承的五个括号；能写出日常「整目录授权」并逐层验证；事后对接了 `InheritanceFlags` / `PropagationFlags` 与 GUI「适用于」。

**下一讲才需要：** 规则叠太多时，如何一眼看到「最终能不能访问」——有效权限。

---

<!-- chapter-nav:start -->
← 上一章：[第 11 讲：安全描述符](./12-security-descriptor.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 13 讲：有效权限](./14-effective-permissions.md)
<!-- chapter-nav:end -->
