---
title: "第 12 站：继承——从「子文件太多」一步步发明（重点）"
sidebarGroup: "权限"
shortTitle: "第 12 站：继承"
order: 13
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "NTFS"
  - "Active Directory"
  - "权限"
  - "安全"
---

# 第 12 站：继承——从「子文件太多」一步步发明（重点）

前面你会：用 `icacls` 看/改**某一个**对象上的 DACL。  
本站假设你**还没听过** OI、CI、InheritanceFlags 这些词——我们只带着已经会的东西，做最小实验，根据现象再起名字。

> **练习约定：** 只在 `E:\WindowsTest\...` 上改 ACL。主体固定为作者环境账户 `JZFZ\chengongyi`（你机器上请换成自己的 `域名\用户名`）。  
> 看结果时**只盯你刚加上的那一行**；同路径上从 `E:\` 继承来的其它行一律从略。  
> `icacls` 文档：[icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)

### 麻烦

项目目录下有成百上千个文件。你不可能对每个文件单独 `/grant` 一遍。  
问题变成：**能不能在父文件夹上写一次，让下面的对象自动带上规则？**

先不要猜答案。搭一棵最小的树，看系统实际怎么做。

### 12.0 准备：一棵三层小树

后面每一步都会换一棵**干净的**子树（避免上次实验的 ACE 搅局）。骨架如下：

```text
某 Lab\
├── file-root.txt
└── Sub\
    ├── file-sub.txt
    └── Sub1\
        └── file-sub1.txt
```

PowerShell（一次建齐本站要用的目录；每步只用其中一棵）：

```powershell
$labs = @('Lab00','Lab01','Lab02','Lab03','Lab04','Lab05','Lab06','Lab07')
foreach ($lab in $labs) {
  $root = "E:\WindowsTest\$lab"
  New-Item -ItemType Directory -Force -Path "$root\Sub\Sub1" | Out-Null
  '' | Set-Content "$root\file-root.txt"
  '' | Set-Content "$root\Sub\file-sub.txt"
  '' | Set-Content "$root\Sub\Sub1\file-sub1.txt"
}
```

查看某一层：

```bat
icacls 路径
```

每个实验固定读法：先看 **想做什么** 与 **标记预告** → 再跑命令看输出 → 最后读 **推导**（完整含义在这里才说透）。

---

### 12.1 实验 0：什么都没 grant，先看树上有什么

**想做什么：** 先摸清——在你还没改任何权限时，这棵树上已经长什么样。  
**标记预告：** 输出里若出现 `(I)`，先当神秘符号盯着它；完整含义做完本实验再下结论。其它括号本步先忽略。

```bat
icacls E:\WindowsTest\Lab00
icacls E:\WindowsTest\Lab00\file-root.txt
```

你会看到类似（组名随磁盘父级 ACL 而变，重点看括号）：

```text
E:\WindowsTest\Lab00 BUILTIN\Administrators:(I)(F)
                     NT AUTHORITY\SYSTEM:(I)(OI)(CI)(IO)(F)
                     ...（其它行从略）

已成功处理 1 个文件; 处理 0 个文件时失败
```

**现象：** 你还没写任何规则，很多行已经带一个 `(I)`。

**推导：**

- 对象上的某些 ACE，可以**从父文件夹流到子对象**——这就是后文说的「继承」要解决的事。  
- `(I)` = 系统打的**结果标记**：意思是「这条不是你在本层新写的显式规则，是流下来的」。  
- 你**不会**在 `/grant` 时手写 `(I)`；它是查看时看到的。  
- 同行里还有 `(OI)(CI)(IO)` 等——本步先当「别人传下来时带的行李」，后面实验逐个认。

**你现在会了：** 树上本来就会有「流下来的」规则；`(I)` 表示「流下来的」。  
**下一步才问：** 我自己 `/grant` 一条，会不会自动流下去？

---

### 12.2 实验 1：最朴素的 grant——只写 `:RX`

**想做什么：** 只给**当前这一个文件夹**授读执行，看子文件 / 子文件夹会不会自动带上。  
**标记预告：** 本步**不加**任何继承括号，权限部分只有 `:RX`（读执行）。

在干净的 `Lab01` 上：

```bat
icacls E:\WindowsTest\Lab01 /grant "JZFZ\chengongyi:RX"
```

回显（实测）：

```text
已处理的文件: E:\WindowsTest\Lab01
已成功处理 1 个文件; 处理 0 个文件时失败
```

再看各层（只摘你的账户那一行）：

```bat
icacls E:\WindowsTest\Lab01
icacls E:\WindowsTest\Lab01\file-root.txt
icacls E:\WindowsTest\Lab01\Sub
icacls E:\WindowsTest\Lab01\Sub\file-sub.txt
```

```text
E:\WindowsTest\Lab01 JZFZ\chengongyi:(RX)

E:\WindowsTest\Lab01\file-root.txt  → 没有 JZFZ\chengongyi
E:\WindowsTest\Lab01\Sub            → 没有 JZFZ\chengongyi
E:\WindowsTest\Lab01\Sub\file-sub.txt → 没有
（更深同样没有）
```

**现象：** 规则**只贴在你 grant 的那一层**；子文件、子文件夹都没有你这条。根上是 `(RX)`，**没有** `(I)`——说明是本层显式写的。

**推导：**

- 默认的 `/grant …:RX` **只作用于当前对象**，**不会**自动传播到子级。  
- 若要对下面成百上千个文件生效，要么逐个 grant（正是本站开头的麻烦），要么系统还藏着「请往下流」的开关——下一实验去找。  
- 对照实验 0：别人流下来的行带 `(I)`；你刚写的显式行通常**不带** `(I)`。

**你现在会了：** 朴素 grant = 只贴当前。  
**下一步才问：** 怎样让**子文件**也自动带上？

---

### 12.3 实验 2：试 `(OI)`——让规则朝文件走

**想做什么：** 在父文件夹上写一次，希望下面的**文件**也自动带上同一套读执行。  
**标记预告：** 试加 `(OI)`。名字里的 O 常和 object（非文件夹对象，一般就是**文件**）有关——先当黑盒按钮，看现象再下完整结论。

```bat
icacls E:\WindowsTest\Lab02 /grant "JZFZ\chengongyi:(OI)RX"
```

```text
已处理的文件: E:\WindowsTest\Lab02
已成功处理 1 个文件; 处理 0 个文件时失败
```

```bat
icacls E:\WindowsTest\Lab02
icacls E:\WindowsTest\Lab02\file-root.txt
icacls E:\WindowsTest\Lab02\Sub
icacls E:\WindowsTest\Lab02\Sub\file-sub.txt
icacls E:\WindowsTest\Lab02\Sub\Sub1
icacls E:\WindowsTest\Lab02\Sub\Sub1\file-sub1.txt
```

关键输出（实测）：

```text
E:\WindowsTest\Lab02                         JZFZ\chengongyi:(OI)(RX)
E:\WindowsTest\Lab02\file-root.txt           JZFZ\chengongyi:(I)(RX)
E:\WindowsTest\Lab02\Sub                     JZFZ\chengongyi:(I)(OI)(IO)(RX)
E:\WindowsTest\Lab02\Sub\file-sub.txt        JZFZ\chengongyi:(I)(RX)
E:\WindowsTest\Lab02\Sub\Sub1                JZFZ\chengongyi:(I)(OI)(IO)(RX)
E:\WindowsTest\Lab02\Sub\Sub1\file-sub1.txt  JZFZ\chengongyi:(I)(RX)
```

**现象：**

1. 根上：`(OI)(RX)`，无 `(I)` → 本层显式写的。  
2. **所有文件**：`(I)(RX)` → 你的规则流到了文件上。  
3. **子文件夹**：`(I)(OI)(IO)(RX)` → 也有你的行，但多了一个 `(IO)`。

**推导：**

- `(OI)` 的完整直觉：**Object Inherit**——请朝**文件（object）**方向把规则传下去。  
- 文件上出现 `(I)`，符合实验 0：流下来的结果会打 `(I)`。  
- 子文件夹上为何也有、还带 `(IO)`？先记下现象：「文件夹拿到的不一定是给自己用的访问权，也可能是**继续往文件送的中转模板**」——`(IO)` 的完整含义留到实验 5 专门验证。  
- 和实验 1 对比：加上 `(OI)` 之后，文件终于吃到了规则。

**你现在会了：** `(OI)` 能让子**文件**吃到规则。  
**下一步才问：** 若只想让子**文件夹**有、文件没有？

---

### 12.4 实验 3：试 `(CI)`——让规则朝文件夹走

**想做什么：** 只要**子文件夹**跟着有权，**文件不要**因这条而获权（和实验 2 对称）。  
**标记预告：** 试加 `(CI)`。C 常和 container（**容器 = 文件夹**）有关——同样先看现象。

```bat
icacls E:\WindowsTest\Lab03 /grant "JZFZ\chengongyi:(CI)RX"
```

```text
已处理的文件: E:\WindowsTest\Lab03
已成功处理 1 个文件; 处理 0 个文件时失败
```

```text
icacls E:\WindowsTest\Lab03              JZFZ\chengongyi:(CI)(RX)
icacls E:\WindowsTest\Lab03\file-root.txt → 没有
icacls E:\WindowsTest\Lab03\Sub          JZFZ\chengongyi:(I)(CI)(RX)
icacls E:\WindowsTest\Lab03\Sub\file-sub.txt → 没有
icacls E:\WindowsTest\Lab03\Sub\Sub1     JZFZ\chengongyi:(I)(CI)(RX)
（file-sub1.txt 同样没有）
```

**现象：** 文件夹链有你的规则；**文件完全没有**。

**推导：**

- `(CI)` 的完整直觉：**Container Inherit**——请朝**子文件夹**方向传。  
- 与 `(OI)` 对照：

| 你按下的 | 文件吃到？ | 子文件夹吃到？ |
|----------|------------|----------------|
| `(OI)` | 是 | 是（但常带 `(IO)` 模板味） |
| `(CI)` | 否 | 是 |

- 所以：OI 偏文件，CI 偏文件夹；两者不是同义词，而是两个独立开关。

**你现在会了：** `(CI)` 管文件夹链。  
**下一步才问：** 整棵树文件+文件夹都要同一套时怎么写？

---

### 12.5 实验 4：`(OI)(CI)` 一起——整树统一

**想做什么：** 父文件夹写一次，下面**文件和文件夹**都带上同一套权限（日常最常见需求）。  
**标记预告：** 同时写上已经认识的 `(OI)` 和 `(CI)`。

```bat
icacls E:\WindowsTest\Lab04 /grant "JZFZ\chengongyi:(OI)(CI)RX"
```

```text
已处理的文件: E:\WindowsTest\Lab04
已成功处理 1 个文件; 处理 0 个文件时失败
```

```text
E:\WindowsTest\Lab04                         JZFZ\chengongyi:(OI)(CI)(RX)
E:\WindowsTest\Lab04\file-root.txt           JZFZ\chengongyi:(I)(RX)
E:\WindowsTest\Lab04\Sub                     JZFZ\chengongyi:(I)(OI)(CI)(RX)
E:\WindowsTest\Lab04\Sub\file-sub.txt        JZFZ\chengongyi:(I)(RX)
E:\WindowsTest\Lab04\Sub\Sub1                JZFZ\chengongyi:(I)(OI)(CI)(RX)
E:\WindowsTest\Lab04\Sub\Sub1\file-sub1.txt  JZFZ\chengongyi:(I)(RX)
```

**现象：** 各层都有规则；子文件夹保留 `(OI)(CI)`；文件变成 `(I)(RX)`。

**推导：**

- `(OI)(CI)` = 「文件向 + 文件夹向」都开 → 整树最常用的「写一次、下面都跟着」。  
- 子文件夹上仍带 `(OI)(CI)`：表示它还会继续当传播源，往更深层传。  
- 文件上只剩 `(I)(RX)`：文件不是容器，一般不再携带「继续传给别人」的那套标志。  
- 现在可以完整读一行：

```text
JZFZ\chengongyi:(I)(OI)(CI)(RX)
```

= 谁 + 继承来的 + 还会传给子文件/子文件夹 + 读执行。

**你现在会了：** 日常「整目录授权」怎么写、怎么验。  
**下一步才问：** 实验 2 里子文件夹上的 `(IO)` 到底是什么？能不能主动用？

---

### 12.6 实验 5：加上 `(IO)`——当前自己不吃

**想做什么：**  
实验 4 是「当前文件夹**自己有权**，下面也有权」。  
有时你要的是反过来的一种：

> `Lab05` 这个入口目录，**我不靠这条规则开门**；  
> 但我仍希望这条规则**种给下面的**文件 / 子文件夹。

**标记预告：** 在 `(OI)(CI)` 上再加 `(IO)`。字面像 Inherit Only（「仅继承」）——先当「只负责往下传、不当自己通行证」的按钮，做完再下完整结论。

```bat
icacls E:\WindowsTest\Lab05 /grant "JZFZ\chengongyi:(OI)(CI)(IO)RX"
```

```text
已处理的文件: E:\WindowsTest\Lab05
已成功处理 1 个文件; 处理 0 个文件时失败
```

```bat
icacls E:\WindowsTest\Lab05
icacls E:\WindowsTest\Lab05\file-root.txt
icacls E:\WindowsTest\Lab05\Sub
icacls E:\WindowsTest\Lab05\Sub\file-sub.txt
icacls E:\WindowsTest\Lab05\Sub\Sub1
icacls E:\WindowsTest\Lab05\Sub\Sub1\file-sub1.txt
```

关键输出（实测）：

```text
E:\WindowsTest\Lab05                         JZFZ\chengongyi:(OI)(CI)(IO)(RX)
E:\WindowsTest\Lab05\file-root.txt           JZFZ\chengongyi:(I)(RX)
E:\WindowsTest\Lab05\Sub                     JZFZ\chengongyi:(I)(OI)(CI)(RX)
E:\WindowsTest\Lab05\Sub\file-sub.txt        JZFZ\chengongyi:(I)(RX)
E:\WindowsTest\Lab05\Sub\Sub1                JZFZ\chengongyi:(I)(OI)(CI)(RX)
E:\WindowsTest\Lab05\Sub\Sub1\file-sub1.txt  JZFZ\chengongyi:(I)(RX)
```

**现象：** 根上**仍有**你的行，但多了 `(IO)`；下面的文件 / `Sub` 仍然吃到规则（和实验 4 的子孙侧很像）。

**关键先分清：查看 ≠ 访问检查**（第 9 / 10 站已会）

| | 在干什么 |
|--|----------|
| `icacls` 查看 | 「门上写了什么字？」（列出 ACE） |
| 访问检查 | 「按这些字，**现在**允不允许你对**这个对象**做某件事？」（令牌对 DACL 对表） |

`(IO)` 卡在第二步，不卡在第一步：

- 带 `(IO)` 的 ACE **仍然会出现在** `icacls` 输出里 → 你**看得到**  
- 但当系统对**当前这个文件夹自己**做访问检查时，会把带 `(IO)` 的这条 **跳过，不当成本层的允许/拒绝依据**  
- 「不拿它当自己的权限」= **本层对表时忽略这条**；不是「这条从磁盘上删掉了」

用 `Lab05` 只盯你这条实验 ACE 想一遍（其它继承行先忘掉）：

```text
Lab05              …(OI)(CI)(IO)(RX)     ← 贴在 Lab05 上，带 IO
Lab05\Sub          …(I)(OI)(CI)(RX)      ← 流到 Sub，通常已变成子孙可用的形式（无 IO）
```

- 问：我靠「**这一条**」能不能打开 `Lab05`？  
  → 查的是 `Lab05` 的 DACL → **跳过**带 `(IO)` 的那条 → 就这一条而言，**不算**你在本层有 RX。  
  （现实中你往往还能进 `Lab05`，是因为还有 `Administrators` / `Users` 等**别的** ACE；这里说的是**实验这条**的效果。）
- 问：我靠「**这一条**」能不能打开 `Lab05\Sub`？  
  → 查的是 `Sub` 的 DACL → 上面是 `(I)(OI)(CI)(RX)`，**没有** `(IO)` → **会拿来对表** → 对 `Sub` 生效。

同一条「种子」：在写下它的那一层本层对表**不用**；流到子孙上之后子孙对表**要用**。

**先和实验 4 对照（差别只在「根自己」）：**

| | 实验 4 `(OI)(CI)` | 实验 5 `(OI)(CI)(IO)` |
|--|------------------|----------------------|
| 根上 `icacls` 看不看得到你的行 | 看得到 | 也看得到 |
| 根上这一行有没有 `(IO)` | 没有 | **有** |
| 打开**根文件夹**时，这条参不参与对表 | **参与** | **不参与** |
| 打开**子文件夹/文件**时，流下去的那份 | 参与 | 参与 |

一句话：**看得到 ACE ≠ 自己能用这条 ACE 通过访问检查。**  
有 `(IO)` 时：行还在，但是「种子说明书」，不是「本层门禁卡」。

**生活比喻：**

- **没有 IO**：大门上的告示既管大门，也复印给里面每间房。  
- **有 IO**：大门上贴的是「请把复印件发给里面房间」的**通知模板**；大门自己**不按这张告示放行**，里面房间才按复印件执行。

**推导：**

- `(IO)` 的完整名字：**Inherit Only（仅继承）**。  
- 口诀：`(IO)` = **当前不拿来开门，专给子孙用**  
  （更拆开一点：本层访问检查忽略它；子孙上的继承副本才参与对表。）  
- 回头看实验 2：子文件夹上自动出现的 `(I)(OI)(IO)…`，就是同一味道——文件夹常常只是**中转站**，把「给文件的规则」接着往下送。  
- 适用：共享根 / 挂载点只是入口结构；或者「规则必须写在父对象上才能继承」，又不想让父对象因这条而变宽。

**你现在会了：** 如何让规则「跳过当前、种给下面」；以及为何「门上有字」不等于「本层靠它放行」。  
**下一步才问：** 能不能只影响直接子级，别污染孙子？

---

### 12.7 实验 6：加上 `(NP)`——只传一层

**想做什么：** 规则只覆盖**直接子文件 / 直接子文件夹**，不要再渗进孙子目录（临时目录、外包一层等场景）。  
**标记预告：** 在 `(OI)(CI)` 上再加 `(NP)`。字面像 No Propagate（「不继续传播」）。

```bat
icacls E:\WindowsTest\Lab06 /grant "JZFZ\chengongyi:(OI)(CI)(NP)RX"
```

```text
已处理的文件: E:\WindowsTest\Lab06
已成功处理 1 个文件; 处理 0 个文件时失败
```

```text
E:\WindowsTest\Lab06                         JZFZ\chengongyi:(OI)(CI)(NP)(RX)
E:\WindowsTest\Lab06\file-root.txt           JZFZ\chengongyi:(I)(RX)
E:\WindowsTest\Lab06\Sub                     JZFZ\chengongyi:(I)(RX)
E:\WindowsTest\Lab06\Sub\file-sub.txt        → 没有
E:\WindowsTest\Lab06\Sub\Sub1                → 没有
E:\WindowsTest\Lab06\Sub\Sub1\file-sub1.txt  → 没有
```

**现象：** 直接子有；**再往下没有**。`Sub` 上是 `(I)(RX)`——**已经没有** `(OI)(CI)`。

**推导：**

- `(NP)` 的完整直觉：**No Propagate**——传到**直接子级**就停，不再往孙子传。  
- 机制上：直接子拿到的往往是「剥掉传播标志」之后的生效 ACE（这里是 `(I)(RX)`），于是它不再是新的传播源。  
- 与实验 4 对比：没有 `(NP)` 时 `Sub` 上仍是 `(I)(OI)(CI)(RX)`，会继续往下传；有 `(NP)` 则停在一层。

**你现在会了：** 如何「只包一层」。  
**下一步才问：** `(IO)` 与 `(NP)` 组合；然后才给现象起 .NET / GUI 学名。

---

### 12.8 实验 7：`(IO)` + `(NP)` 一起

**想做什么：** 入口自己不吃权，并且只包直接一层——把实验 5 和 6 叠在一起。  
**标记预告：** 同时写 `(OI)(CI)(IO)(NP)`。

```bat
icacls E:\WindowsTest\Lab07 /grant "JZFZ\chengongyi:(OI)(CI)(IO)(NP)RX"
```

```text
已处理的文件: E:\WindowsTest\Lab07
已成功处理 1 个文件; 处理 0 个文件时失败
```

```text
E:\WindowsTest\Lab07                         JZFZ\chengongyi:(OI)(CI)(NP)(IO)(RX)
E:\WindowsTest\Lab07\file-root.txt           JZFZ\chengongyi:(I)(RX)
E:\WindowsTest\Lab07\Sub                     JZFZ\chengongyi:(I)(RX)
（Sub 以下更深 → 没有）
```

**现象：** 根上带 `(IO)`（自己不吃）；直接子有 `(I)(RX)`；更深没有。

**推导：**

- 这就是「当前不吃」+「只传一层」的叠加，没有新的第三种魔法。  
- 括号顺序在输出里可能是 `(NP)(IO)` 或 `(IO)(NP)`，以本机为准；含义按标志集合读，不按排列焦虑。

**你现在会了：** 五个继承相关括号都已在实验里见过完整作用。  
**下一步：** 收成一张表，再对接 .NET / GUI 学名。

---
### 12.9 现象收束：五个括号都是「长出来的」

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
| 2 | `:(OI)RX` | 有 | 文件有；文件夹常带 IO 模板 | 文件有 |
| 3 | `:(CI)RX` | 有 | 仅文件夹 | 仅文件夹 |
| 4 | `:(OI)(CI)RX` | 有 | 都有 | 都有 |
| 5 | `…(IO)…` | 有行但不吃 | 有 | 有 |
| 6 | `…(NP)…` | 有 | 有（停传） | 无 |
| 7 | `…(IO)(NP)…` | 有行但不吃 | 有（停传） | 无 |

---

### 12.10 现在才起学名：两套标志

把上面的直觉映射到 .NET（以及资源管理器「适用于」）。  
口诀：**一组管「传给谁」，一组管「自己吃不吃、传多深」。**

| 你已经会的 | .NET 枚举 | 枚举值 |
|------------|-----------|--------|
| `(OI)` / `(CI)` / 两者 | **`InheritanceFlags`**（传给谁） | `ObjectInherit` / `ContainerInherit` / 按位或 |
| `(IO)` / `(NP)` | **`PropagationFlags`**（当前吃不吃、传多深） | `InheritOnly` / `NoPropagateInherit` |
| `(I)` | （显示结果，不是授予参数） | — |

来源：[icacls Remarks](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)。

与 GUI「适用于」对照（这时再看才不懵；命令与上文各实验一致）：

| 适用于（GUI） | 对应实验 | 等价命令 |
|---------------|----------|----------|
| 只有该文件夹 | 实验 1 | `icacls E:\WindowsTest\Lab01 /grant "JZFZ\chengongyi:RX"` |
| 该文件夹和文件 | 实验 2（记子文件夹上的 IO 模板） | `icacls E:\WindowsTest\Lab02 /grant "JZFZ\chengongyi:(OI)RX"` |
| 该文件夹和子文件夹 | 实验 3 | `icacls E:\WindowsTest\Lab03 /grant "JZFZ\chengongyi:(CI)RX"` |
| 该文件夹、子文件夹和文件 | 实验 4 | `icacls E:\WindowsTest\Lab04 /grant "JZFZ\chengongyi:(OI)(CI)RX"` |
| 只有子文件夹和文件 | 实验 5 | `icacls E:\WindowsTest\Lab05 /grant "JZFZ\chengongyi:(OI)(CI)(IO)RX"` |
| （只要直接一层；常配合「不传播」） | 实验 6 | `icacls E:\WindowsTest\Lab06 /grant "JZFZ\chengongyi:(OI)(CI)(NP)RX"` |
| （当前不吃 + 只一层） | 实验 7 | `icacls E:\WindowsTest\Lab07 /grant "JZFZ\chengongyi:(OI)(CI)(IO)(NP)RX"` |

### 12.11 C#：用代码复现实验 1～7

`icacls` 括号 ↔ .NET 两套枚举（与 12.10 同一张心智图）。下面每个实验对应一棵 `Lab0N` 树；跑之前请先按 12.0 建好目录。

```csharp
using System.IO;
using System.Security.AccessControl;
using System.Security.Principal;

static void Grant(
    string path,
    InheritanceFlags inheritance,
    PropagationFlags propagation)
{
    var rule = new FileSystemAccessRule(
        new NTAccount(@"JZFZ\chengongyi"),
        FileSystemRights.ReadAndExecute,
        inheritance,
        propagation,
        AccessControlType.Allow);

    var acl = Directory.GetAccessControl(path);
    acl.AddAccessRule(rule);
    Directory.SetAccessControl(path, acl);
}

// 实验 1：只有该文件夹（无 OI/CI）
// 等价：icacls ...\Lab01 /grant "JZFZ\chengongyi:RX"
Grant(
    @"E:\WindowsTest\Lab01",
    InheritanceFlags.None,
    PropagationFlags.None);

// 实验 2：该文件夹和文件 → (OI)
// 等价：icacls ...\Lab02 /grant "JZFZ\chengongyi:(OI)RX"
Grant(
    @"E:\WindowsTest\Lab02",
    InheritanceFlags.ObjectInherit,
    PropagationFlags.None);

// 实验 3：该文件夹和子文件夹 → (CI)
// 等价：icacls ...\Lab03 /grant "JZFZ\chengongyi:(CI)RX"
Grant(
    @"E:\WindowsTest\Lab03",
    InheritanceFlags.ContainerInherit,
    PropagationFlags.None);

// 实验 4：该文件夹、子文件夹和文件 → (OI)(CI)
// 等价：icacls ...\Lab04 /grant "JZFZ\chengongyi:(OI)(CI)RX"
Grant(
    @"E:\WindowsTest\Lab04",
    InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
    PropagationFlags.None);

// 实验 5：只有子文件夹和文件 → (OI)(CI)(IO)
// 等价：icacls ...\Lab05 /grant "JZFZ\chengongyi:(OI)(CI)(IO)RX"
Grant(
    @"E:\WindowsTest\Lab05",
    InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
    PropagationFlags.InheritOnly);

// 实验 6：只传一层 → (OI)(CI)(NP)
// 等价：icacls ...\Lab06 /grant "JZFZ\chengongyi:(OI)(CI)(NP)RX"
Grant(
    @"E:\WindowsTest\Lab06",
    InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
    PropagationFlags.NoPropagateInherit);

// 实验 7：当前不吃 + 只一层 → (OI)(CI)(IO)(NP)
// 等价：icacls ...\Lab07 /grant "JZFZ\chengongyi:(OI)(CI)(IO)(NP)RX"
Grant(
    @"E:\WindowsTest\Lab07",
    InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
    PropagationFlags.InheritOnly | PropagationFlags.NoPropagateInherit);
```

对照速查：

| 实验 | InheritanceFlags | PropagationFlags | icacls 括号 |
|------|------------------|------------------|------------|
| 1 | `None` | `None` | （无） |
| 2 | `ObjectInherit` | `None` | `(OI)` |
| 3 | `ContainerInherit` | `None` | `(CI)` |
| 4 | `CI \| OI` | `None` | `(OI)(CI)` |
| 5 | `CI \| OI` | `InheritOnly` | `(OI)(CI)(IO)` |
| 6 | `CI \| OI` | `NoPropagateInherit` | `(OI)(CI)(NP)` |
| 7 | `CI \| OI` | `InheritOnly \| NoPropagateInherit` | `(OI)(CI)(IO)(NP)` |

写完后用前文同一套 `icacls E:\WindowsTest\Lab0N\...` 查看，应看到与对应实验相同的关键行（只盯 `JZFZ\chengongyi`）。

### 12.12 附：icacls 常用操作

基本缩写：`N` / `F` / `M` / `RX` / `R` / `W` / `D`。  
高级权利须括号逗号分隔，例如 `(RX,WD,WEA,WA)`。完整列表见 Learn 的 icacls 页。

```bat
icacls E:\WindowsTest\Lab04\Sub\file-sub.txt
icacls E:\WindowsTest\Lab01\file-root.txt /grant JZFZ\chengongyi:R
icacls E:\WindowsTest\Lab01\file-root.txt /grant:r JZFZ\chengongyi:RX
icacls E:\WindowsTest\Lab01\file-root.txt /deny JZFZ\chengongyi:W
icacls E:\WindowsTest\Lab01\file-root.txt /remove JZFZ\chengongyi
icacls E:\WindowsTest\Lab04\Sub /inheritance:d
icacls E:\WindowsTest\* /save E:\WindowsTest\acl-backup.txt /t
icacls E:\WindowsTest\ /restore E:\WindowsTest\acl-backup.txt
```

实操坑：禁用继承「复制 vs 移除」后果不同；显式与继承 ACE 可并存；根上错误 Deny + `(OI)(CI)` 杀伤整树。

### 收束

**你现在会了：** 用最小实验自己「发明」了继承与五个括号；事后才对接 InheritanceFlags / PropagationFlags；能在 `E:\WindowsTest` 上验证并读输出。  
**下一站才需要：** 规则叠太多时，如何一眼看到「最终能不能访问」。

---

---

<!-- chapter-nav:start -->
← 上一章：[第 11 站：安全描述符](./12-security-descriptor.md)
· [回索引](./00-index.md)
→ 下一章：[第 13 站：有效权限](./14-effective-permissions.md)
<!-- chapter-nav:end -->
