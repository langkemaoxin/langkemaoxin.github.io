---
title: "第 7 讲：权限位——读、写、完全控制……"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 7 讲：权限位"
order: 8
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

# 第 7 讲：权限位——读、写、完全控制……

### 麻烦

到上一讲为止，每个对象有了「主人」（Owner）。但「主人」只回答了「这算谁的」，还回答不了协作里最常见的那类需求：

> 他能**看**、她能**改**、另一组能**看但不能删**、王五什么都能干还能**把钥匙发给别人**。

「主人全能 / 别人全不能」没法表达这种**精细的能力勾选**。这一讲就来发明这套"精细勾选"——它叫**权限位（permission bits）**。

### 先打个比方：带密码锁的文件柜

想象一个带密码锁的文件柜。柜门上能挂好几把**钥匙**，每把钥匙给不同的人。但"钥匙"太粗——一把钥匙要么能开、要么不能开。真实需求是得把"操作文件柜"这件事，**拆成一堆小开关**，每个人按需勾选：张三勾「看」、李四勾「改」、谁都不许勾「删」。这些小开关，就是**权限位**。

### 一个文件，能对它做哪些事？

别急着背术语。先想：拿到一个文件，你**可能想对它做什么**？

- 看它里面写了什么 —— **读内容**
- 在里面写字、改字 —— **写内容**
- 双击运行它（如果是程序）—— **执行**
- 知道它叫什么名字、在哪个文件夹里 —— **列目录**（这是文件夹的事）
- 把它扔进回收站 —— **删除**
- 改它的"只读/隐藏"这种属性 —— **改属性**
- ……

Windows 把这些动作拆成了**十几个最小颗粒**。你在"属性 → 安全 → 高级"里看到的那个一堆勾选项，就是它们——微软把它们叫**特殊权限（special permissions）**。这十几个颗粒，就是本讲的"权限位"。**先别全背**，下面会挑几个最常用的讲透，剩下的用到再查（全表在文末）。

### 为什么叫"位"：它真的是一串二进制位

"权限位"里的"位"，不是"位置"，是 **bit**。微软原话：

> In an ACE, permissions are represented by one or more bits in a 32-bit value called an access mask. ... Each bit corresponds to an access right — a particular operation or set of operations that can be performed on the object.
> （在一条 ACE 里，权限由一个 32 位值里的若干**位**表示，这个值叫**访问掩码（access mask）**。每一位对应一项访问权——即能对对象执行的某个操作。）

来源：[How Permissions Work - Access Masks（Microsoft Learn）](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2003/cc783530(v=ws.10))

说人话：**「读」是一个开关、「写」是另一个开关……它们各占 access mask 里的一位**。你勾上"读"，就是把"读"那一位置 1；不勾就是 0。一张权限表（DACL）里某个人能干什么，本质上就是"这一串位里哪些是 1"。你在 GUI 里点的"读取/写入/修改/完全控制"，底层都是这些位的组合——下一节就讲这些组合。

> 这个"位"的视角贯穿后面所有讲：第 9 讲的 ACE、第 10 讲的访问检查，都是拿"令牌想要的位"去和"DACL 里允许的位"做**按位比对**。权限的底层就是位运算。

### 最常用的几个权限位（挑重要的讲）

不用一次记 14 个。先把这 5 个最常用的记住，覆盖 90% 的日常：

| 权限位 | 能干什么 | 一句话 |
|---|---|---|
| **读取数据 / 列出文件夹** | 看文件内容 / 看文件夹里有哪些东西 | "能不能看" |
| **写入数据 / 创建文件** | 改文件内容 / 在文件夹里新建文件 | "能不能改/加" |
| **执行 / 遍历** | 运行程序；对文件夹叫"遍历"（能穿过它走到里面的东西） | "能不能跑/过" |
| **删除** | 把文件或文件夹删掉 | "能不能删" |
| **读取权限** | 看这个文件的权限是怎么设的 | "能不能看门禁设置" |

剩下还有几个，**名字会骗人**，微软原文特意点名，单独拎出来讲。

### 两个名字会骗人的位（微软原话点名）

**①「写入属性」不等于能建文件、能删文件。**

它只是让你改"只读/隐藏"那几个属性，**不含建、不含删**。微软原话：

> The Write Attributes permission does not imply creating or deleting files or folders, it only includes the permission to make changes to the attributes of a file or folder.
> （「写入属性」权限**不代表**能创建或删除文件/文件夹，它只包含修改文件或文件夹属性的能力。）

别被名字骗了：要建文件得有「创建文件/写入数据」位，要删得有「删除」位。「写入属性」这位，只管那几个属性。（「写入扩展属性」同理，也不含建/删。）

**②「删除子文件夹及文件」是个大招——能越过子项自己的权限。**

只要你在**父文件夹**上有这个位，**哪怕子文件本身没给你删除权限，你照样能删它**。微软原话：

> Delete Subfolders and Files: Allows or denies deleting subfolders and files, **even if the Delete permission has not been granted on the subfolder or file.**
>
> （「删除子文件夹及文件」：允许或拒绝删除子文件夹和文件，**即使子文件夹或文件本身没授予删除权限**。）

换句话说：**「删不删得掉一个文件」不只看文件自己的 ACL，还看它所在文件夹的 ACL**。后面讲「套餐」时会看到，这正是「完全控制」能删文件夹里任何东西的根源。

> 同源文档还有一句更直白的补充：「Groups or users that are granted Full Control on a folder can delete any files in that folder, regardless of the permissions protecting the file.」（对文件夹有完全控制的人，能删里面任何文件，不管文件自己的权限设成啥。）

### 套餐：Windows 帮你打包好的几组勾选

那你在"属性 → 安全"里看到的**读取 / 写入 / 修改 / 完全控制**又是什么？——它们是**套餐**。Windows 知道大多数人懒得一个个勾，就把常用的勾选组合**起了名字、打包卖**。每个套餐，就是上面那些"位"的一个固定组合（下面"勾了哪些"据微软《Special Permissions》对照表）：

| 套餐 | 大白话 | 勾了哪些位（要点） |
|---|---|---|
| **读取（Read）** | 只能看 | 读数据 + 读属性 + 读扩展属性 + 读权限 + 同步 |
| **写入（Write）** | 能写能建（**不含读、不含删、不含执行**） | 写数据/建文件 + 建文件夹/追加 + 写属性 + 写扩展属性 + 读权限 + 同步 |
| **读取和执行（Read & Execute）** | 能看 + 能运行/穿过 | 读取的全部 + 遍历/执行 |
| **修改（Modify）** | 能看、能改、**能删**，但**管不了权限、夺不了主** | 读取和执行的全部 + 写入的全部 + 删除 |
| **完全控制（Full Control）** | 全都能，**还能改权限、删子项、夺主** | **全部 14 位**（唯一含「删除子文件夹及文件」「更改权限」「取得所有权」） |

来源：[How Permissions Work - Special Permissions 对照表（Microsoft Learn）](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2003/cc783530(v=ws.10))

> **几个最容易踩的套餐误区：**
> - **「写入」套餐不能读！** 它只有写，没有读。给某人「写入」权限，他**并不能打开看文件内容**。要"又能看又能改"，得给「修改」。
> - **「修改」能删文件，但改不了权限。** 要让某人能调整"谁能访问这个文件"，得给「完全控制」（或单独勾「更改权限」）。
> - **给了文件夹「完全控制」的人，能删里面任何文件**——不管那文件自己权限设成啥。因为「完全控制」含那个「删除子文件夹及文件」大招（见上一节）。

下面用真机把这两条最反直觉的——**「写入」不能读**、**「写入」其实能写**——验证一遍。

### 真机演示①：`icacls` 怎么读权限

GUI 点来点去太慢。命令行 `icacls` 能一眼看清权限表。先看个**刚建的文件**长什么样（本机 `C:\Users\chengongyi` 下建沙盒目录 `perm_sandbox`，和第 6 讲的 `owner_sandbox` 一个意思）：

```powershell
PS> $sb = "$HOME\perm_sandbox"
PS> New-Item -ItemType Directory -Path $sb -Force | Out-Null
PS> New-Item -Path "$sb\fresh.txt" -Value 'x' -Force | Out-Null
PS> icacls "$sb\fresh.txt"
C:\Users\chengongyi\perm_sandbox\fresh.txt NT AUTHORITY\SYSTEM:(I)(F)
                                           BUILTIN\Administrators:(I)(F)
                                           JZFZ\chengongyi:(I)(F)

已成功处理 1 个文件; 处理 0 个文件时失败
```

> 命令里的 `C:\Users\chengongyi\...` 是**作者机器上的真实路径**。你照着敲时，把 `chengongyi` 换成自己的用户名（或直接用 `$HOME\perm_sandbox\...`）。输出是作者真跑出来的，原样贴在这里。

每行就是一个 **ACE**（谁、什么权限、是否继承）。先认三个符号：

- **权限字母**：`F` 完全控制、`M` 修改、`RX` 读取和执行、`R` 只读、`W` 只写、`N` 无访问、`D` 删除。这就是上面那几个"套餐"在命令行里的缩写——`icacls` 的"简单权限"。微软原表（[icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)）：

| 字母 | 含义 |
|---|---|
| `N` | 无访问（No access） |
| `F` | 完全控制（Full） |
| `M` | 修改（Modify） |
| `RX` | 读取和执行（Read + eXecute） |
| `R` | 只读（Read） |
| `W` | 只写（Write） |
| `D` | 删除（Delete） |

> 还有一套**更细的"高级权限"**，用括号写，如 `(RC)` 读权限、`(WDAC)` 改权限、`(WO)` 改 owner、`(DC)` 删子项、`(WD)` 写数据……用到再查 icacls 文档，日常 `F/M/RX/R/W` 够了。

- **`(I)`**：这条权限是**从上层继承来的**（Inherited），不是这层自己设的。`fresh.txt` 三条都带 `(I)`，因为它们是从父目录 `C:\Users\chengongyi` 继承下来的。
- **`(F)` 等**：上面说的权限字母。

**字母背后到底是哪些位？** `icacls` 只给字母，要看"位"的全名，用 PowerShell 的 `Get-Acl`——它把权限翻成 .NET 的 `FileSystemRights` 枚举。本机对照（给五个文件分别授 `F/M/RX/R/W`，再读 `FileSystemRights`）：

```powershell
PS> # 每个文件关继承、只授一个字母，再看 Get-Acl 翻出来的位
PS> icacls "$sb\lt_F.txt"  /inheritance:r /grant:r 'JZFZ\chengongyi:F'  | Out-Null
PS> icacls "$sb\lt_RX.txt" /inheritance:r /grant:r 'JZFZ\chengongyi:RX' | Out-Null
...（M / R / W 同理）
PS> foreach($l in 'F','M','RX','R','W'){
     "$l -> " + ((Get-Acl "$sb\lt_$l.txt").Access |
                 Where-Object IdentityReference -like '*chengongyi').FileSystemRights
   }
F -> FullControl
M -> Modify, Synchronize
RX -> ReadAndExecute, Synchronize
R -> Read, Synchronize
W -> Write, Synchronize
```

一眼看清：`F` 就是 `FullControl`（所有位）；`M`/`RX`/`R`/`W` 各自是几个位的组合，且都带个 `Synchronize`（同步，多线程等句柄用的，普通用户无感）。**注意 `W`（写入）翻出来是 `Write, Synchronize`——里面没有 `Read`、没有 `ReadData`。** 这正是下一节要验证的「写入不含读」。

**`(OI)`/`(CI)` 是什么？看文件夹就懂了。** 给文件夹授权时，`icacls` 会带上"这条权限往下怎么传"的标志：

```powershell
PS> New-Item -ItemType Directory -Path "$sb\demo_folder" -Force | Out-Null
PS> icacls "$sb\demo_folder" /grant 'JZFZ\chengongyi:(M)' | Out-Null
PS> icacls "$sb\demo_folder"
C:\Users\chengongyi\perm_sandbox\demo_folder JZFZ\chengongyi:(M)
                                             NT AUTHORITY\SYSTEM:(I)(OI)(CI)(F)
                                             BUILTIN\Administrators:(I)(OI)(CI)(F)
                                             JZFZ\chengongyi:(I)(OI)(CI)(F)

已成功处理 1 个文件; 处理 0 个文件时失败
```

第一行 `JZFZ\chengongyi:(M)` 是我**刚在这层显式授**的（所以没 `(I)`、没继承标志）；下面三条带 `(I)(OI)(CI)` 的是从父目录继承来的。各标志含义（icacls 原表）：

| 标志 | 含义 |
|---|---|
| `(I)` | **继承来的**（Inherited），不是本层设的 |
| `(OI)` | **对象继承**（Object Inherit）：文件夹里的**文件**会继承这条 |
| `(CI)` | **容器继承**（Container Inherit）：文件夹里的**子文件夹**会继承这条 |
| `(IO)` | **只继承**（Inherit Only）：这条只往下传、**对本对象自己不生效** |
| `(NP)` | **不再传播**（No Propagate）：只传给直接子项，不再往下嵌套 |

> 排查"这权限哪来的"，先看有没有 `(I)`——有就是继承来的（要去父目录找源头）；没有就是本层显式设的。`fresh.txt` 那三条全带 `(I)`，所以都不是它自己设的。

### 真机演示②：「写入」套餐到底能不能读？

上面一直在说「写入不含读」「写入其实能写」——这两条最反直觉，本机各做一个文件验证。先建一个**只有 `(W)`** 的文件（关继承、ACL 重置成只含我:`(W)`；这两个开关第 6 讲讲过：`/inheritance:r` 关继承并丢弃继承项，`/grant:r` 把 ACL 重置成只含指定项）：

```powershell
PS> New-Item -Path "$sb\ro.txt" -Value 'hello' -Force | Out-Null
PS> icacls "$sb\ro.txt" /inheritance:r /grant:r 'JZFZ\chengongyi:(W)'
已处理的文件: C:\Users\chengongyi\perm_sandbox\ro.txt
已成功处理 1 个文件; 处理 0 个文件时失败
PS> icacls "$sb\ro.txt"
C:\Users\chengongyi\perm_sandbox\ro.txt JZFZ\chengongyi:(W)

已成功处理 1 个文件; 处理 0 个文件时失败
PS> (Get-Acl "$sb\ro.txt").Access | Select IdentityReference, FileSystemRights

IdentityReference   FileSystemRights
-----------------   ----------------
JZFZ\chengongyi   Write, Synchronize
```

ACL 干干净净：只有我、只有 `(W)`，`Get-Acl` 翻成 `Write, Synchronize`——**没有 `Read`**。（顺带，我是这个文件的 owner，但这不影响结论：上一讲说过 owner 只隐式带「改 DACL / 读安全描述符」，不带读数据。）

**① 验证「不能读」。** 直接读内容：

```powershell
PS> Get-Content "$sb\ro.txt"
Get-Content : 对路径"C:\Users\chengongyi\perm_sandbox\ro.txt"的访问被拒绝。
```

读取被拒。`(W)` 不含「读取数据」位——**「写入」套餐确实不能读**，实锤。

**② 验证「能写」。** 那它到底能不能写？换一个**新**的 `(W)` 文件来测写（另起一个文件，避免互相干扰），用只写方式追加一行：

```powershell
PS> New-Item -Path "$sb\wo.txt" -Value 'hello' -Force | Out-Null
PS> icacls "$sb\wo.txt" /inheritance:r /grant:r 'JZFZ\chengongyi:(W)' | Out-Null
PS> [System.IO.File]::AppendAllText("$sb\wo.txt", ' WORLD')   # 用只写方式追加，不报错
```

`(W)` 下我自己也读不出来，怎么证明真写进去了？临时给自己加回 `(F)` 再读：

```powershell
PS> icacls "$sb\wo.txt" /grant:r 'JZFZ\chengongyi:(F)' | Out-Null
PS> Get-Content "$sb\wo.txt"
hello WORLD
```

`hello` 变成了 `hello WORLD`——**`(W)` 确实允许写，只是不允许读**。它不是"坏的写"，是"只写不读"。

**③ 一个真实坑：PowerShell 的 `Set-Content` / `Add-Content` 在 `(W)` 下也写不了。** 这正是第 6 讲测试一步骤 5 埋的梗。再造一个 `(W)` 文件，用 `Set-Content` 写：

```powershell
PS> New-Item -Path "$sb\wp.txt" -Value 'hello' -Force | Out-Null
PS> icacls "$sb\wp.txt" /inheritance:r /grant:r 'JZFZ\chengongyi:(W)' | Out-Null
PS> Set-Content "$sb\wp.txt" 'ps'
Set-Content : 对路径"C:\Users\chengongyi\perm_sandbox\wp.txt"的访问被拒绝。
```

明明 `(W)` 允许写（②刚证过），`Set-Content` 却被拒——因为 PowerShell 的 `Set-Content`/`Add-Content` 是以**读+写**模式打开文件的，光有"写数据"位不够、还差一个"读"位。**结论：权限位是按"打开文件时要的访问类型"逐位卡的，工具要的位不全，照样进不去。**

**④ 对照：「读取和执行」能读。** 同样的文件给 `(RX)`：

```powershell
PS> New-Item -Path "$sb\rx.txt" -Value 'hello' -Force | Out-Null
PS> icacls "$sb\rx.txt" /inheritance:r /grant:r 'JZFZ\chengongyi:(RX)' | Out-Null
PS> Get-Content "$sb\rx.txt"
hello
```

读出来了。所以"又要看又要改"不能给「写入」，得给「修改」`(M)` 或「读取和执行 + 写入」。

**这四步各证明了什么：**

| 步 | 文件权限 | 操作 | 真实结果 | 证明什么 |
|---|---|---|---|---|
| ① | `(W)` | `Get-Content` 读 | 被拒 | **「写入」不含读** |
| ② | `(W)` | `.NET AppendAllText` 写 + 回读 | `hello WORLD` | **`(W)` 真的允许写**（不是坏的写） |
| ③ | `(W)` | `Set-Content` 写 | 被拒 | 工具以"读+写"打开时，**位不全照样被卡**（呼应第 6 讲） |
| ④ | `(RX)` | `Get-Content` 读 | `hello` | 「读取」套餐才含读 |

> 一句话收口：**「写入」套餐 = 只写不读。** 它是有效的写权限，但碰巧不含"读"那一位；而不少写文件的程序（PowerShell 的 `Set-Content`/`Add-Content`、各种"打开再保存"的编辑器）一上来就要"读+写"，于是只给「写入」时它们反而写不了——这不是权限设错了，是位没给全。

### 两条铁律：解释"为什么权限怪怪的"

理解了上面这些，再记两条贯穿始终的规则，就能解释 90% 的"权限怎么和我以为的不一样"：

**铁律一：没给，就是拒绝。**

微软原话：

> When permission to perform an operation is not explicitly granted, it is implicitly denied.
> （当执行某操作未被明确授予时，它被**隐式拒绝**。）

说人话：**默认啥都不给**。只有明确"允许"的动作才放行；谁都没提的动作，一律拒绝。这就是为什么"不给权限 = 进不去"——不是被谁挡了，是压根没人给你开门。

**铁律二：你亲手设的，压过继承来的。**

微软原话（同源文档 Notes）：

> Explicit permissions take precedence over inherited permissions, even inherited Deny permissions.
> （**显式权限优先于继承权限**，哪怕继承来的是 Deny。）

说人话：如果你在**这个文件夹自己**上显式设了"允许张三读取"，那么**从上层继承下来的**"拒绝张三"挡不住他。这解释了一个常见困惑：明明父文件夹拒绝了某人，子文件夹他却进得来——因为子文件夹显式允许了他。

> 注意这条只讲"显式 vs 继承"。**显式 Allow 和显式 Deny 同时存在时，Deny 赢**（拒绝优先）；这些冲突的逐条裁决，是第 10 讲「访问检查」的事。

### 一个高频坑：共享权限和 NTFS 权限，取更严的

从**网络**访问共享文件夹时，最终权限不是只看上面这套 NTFS 权限，而是**两套权限取更严的那个**。微软原话：

> Share permissions and NTFS permissions are independent in the sense that neither changes the other. The final access permissions on a shared folder are determined by taking into consideration both the share permission and the NTFS permission entries. **The more restrictive permissions are then applied.**
>
> （共享权限和 NTFS 权限彼此独立、互不改写。共享文件夹的最终访问权限，由共享权限和 NTFS 权限**共同**决定，**取其中更严格的那个**生效。）

经典踩坑：你在 NTFS 上给人"完全控制"，但**共享权限**还是默认的"读取"——他通过网络就只能读、改不了。改半天 NTFS 没反应，因为被共享权限卡住了。

记住一个区分（同源文档）：**NTFS 权限本地、网络都管；共享权限只管网络。** 所以"本机改得好好的、一走网络共享就不行"，九成是共享权限在作怪。

> 老运维的省心做法（微软原文也提）：**共享权限一律设「完全控制 给 Everyone」，把所有限制全交给 NTFS**——只维护一套，不易出错。

### 想深入了解：14 个特殊权限全表

前面只挑了最常用的几个讲。如果你要把每个开关都摸清楚，下面是微软官方定义的**全部 14 个特殊权限**。用到了再回来查这张表：

| 特殊权限 | 能干什么 |
|---|---|
| 遍历文件夹 / 执行文件 | 穿过一个文件夹走到里面的东西（即使对经过的文件夹没权限）；对文件是"运行程序" |
| 列出文件夹 / 读取数据 | 看文件夹里有什么；对文件是看内容 |
| 读取属性 | 看只读、隐藏这些属性 |
| 读取扩展属性 | 看程序自定义的扩展属性 |
| 创建文件 / 写入数据 | 文件夹里新建文件；对文件是改内容、覆盖 |
| 创建文件夹 / 附加数据 | 文件夹里新建子文件夹；对文件是只能在末尾追加 |
| 写入属性 | 改只读、隐藏属性（**不含建/删**） |
| 写入扩展属性 | 改扩展属性（**不含建/删**） |
| 删除子文件夹及文件 | 删文件夹**里面的**子项（**哪怕子项没给删除权限**） |
| 删除 | 删自己这个文件/文件夹（父文件夹有"删除子项"时也能删） |
| 读取权限 | 看权限是怎么设的 |
| 更改权限 | 改权限（谁能访问） |
| 取得所有权 | 把所有者变成自己 |
| 同步 | 多线程等文件句柄用的，普通用户用不到 |

来源：[How Permissions Work - Permissions for Files and Folders（Microsoft Learn）](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2003/cc783530(v=ws.10))

### 收束

**你现在会了：**

- **权限位是什么**——把"能对文件做什么"拆成一堆**最小开关**，每个开关是 access mask 里的**一位（bit）**；GUI 的"读取/写入/修改/完全控制"只是这些位的**套餐**（固定组合）。
- **最常用的 5 个位**（读/写/执行/删/读权限），以及几个**反直觉点**——「写入属性」不含建/删、「删除子文件夹及文件」能越过子项权限、**「写入」套餐不含读**（真机验过：`(W)` 下读被拒、写能成，但 PowerShell 的 `Set-Content` 因"读+写"打开也被拒）。
- **两条铁律**：没给就是拒、你设的（显式）压过继承的。
- 用 `icacls` 读权限（字母 `F/M/RX/R/W/N/D` + 标志 `(I)(OI)(CI)(IO)(NP)`），用 `Get-Acl` 看位全名（`FileSystemRights`）。
- 从网络访问共享时，**共享权限和 NTFS 权限取更严的那个**。

**下一讲才需要：** 人一多，不能对每个人单独维护时怎么办——组（Groups）。

<!-- chapter-nav:start -->
← 上一章：[第 6 讲：Owner](./07-owner.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 8 讲：组](./09-groups.md)
<!-- chapter-nav:end -->
