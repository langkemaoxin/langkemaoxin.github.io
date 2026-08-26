---
title: "第 9 讲：ACE 与 DACL——规则列表"
sidebarGroup: "卷一·发明权限"
shortTitle: "第 9 讲：ACE 与 DACL"
order: 10
date: 2026-08-26T00:00:00.000Z
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "安全"
  - "对话实录"
description: 师生对话实录课：把「谁能碰这个对象」写成挂在对象上的一张表——ACE 三格（对谁 × 允许/拒绝 × 哪些位），DACL 就是整张表。本机实测：三 ACE 表的构造与 icacls 读法、owner 无读权限照样读不了正文的呼应、DACL 备份文件里现出 SDDL 原文、/save+/restore 往返。
---

# 第 9 讲：ACE 与 DACL——规则列表

> **卷一 · 发明权限（共 15 讲）**
> 师生对话实录课：AI 当老师、我当 0 基础学生，每讲只发明一个概念。实验场 [C:\Lab](../appendix/04-lab.md)，本讲沙盒 `C:\Lab\acetest\`。

---

## 开场

**🧑‍🏫 老师：**

第 7 讲有了「权限位」，第 8 讲有了「组」。现实马上变成：同一个文件要对很多人/很多组写规则；还会出现「财务组允许读，同时又有一条拒绝某人修改」的冲突。需要一张**挂在对象上的规则表**，而不是只在口头说「给 Alice 只读」。

Microsoft Learn（[Appendix B](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory)）的层级：施加在**可保护对象**（文件系统、注册表、服务、AD 对象……）上的 **Permissions**，由关联的 **ACL** 表达；ACL 里是一条条 **ACE**，对安全主体（用户、服务、计算机、组）**授予或拒绝**操作。本讲主角是「谁能碰」那张表——**DACL**（审计用的 SACL 第 14 讲）。

一句话定位：**人带着令牌去敲门；门上贴的是 DACL。** 本讲把「门上的字」写清楚；下一讲讲系统怎么对照令牌读这些字。

---

## 第 1 课：DACL 保存在哪——跟对象走的元数据，不是文件正文

**🧑‍🏫 老师：**

先对齐一个词：**NTFS**（New Technology File System）是现代 Windows 的**默认文件系统**——除了存你的文档内容，还支持安全描述符、加密、配额等丰富元数据（[NTFS overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/ntfs-overview)）。和本讲的关系就一句：**正因为 NTFS 支持安全描述符并用 ACL 做文件级访问控制，DACL 才能作为元数据贴在每个文件旁边**。

所以「DACL 是写在文件内容里的吗？」——**不是**：

| 东西 | 存哪 |
|------|------|
| 文件内容（报表文字、像素） | 数据流（你打开文件看到的） |
| Owner、DACL、SACL… | NTFS 为该文件维护的**安全描述符元数据** |

推论：U 盘格式化成 FAT/exFAT（不支持这套安全描述符）再拷文件，**NTFS ACL 常常带不过去**——权限不在「内容」里，在文件系统元数据里。换对象类型模型一样、载体不同：注册表键的 DACL 跟注册表键走、AD 对象的跟目录对象走——都是「对象自带安全描述符」，没有另一张与文件无关的全局权限总表。

**🧑‍🎓 学生：** 「跟对象走」能实证吗？

**🧑‍🏫 老师：**

两个角度。① 改 ACL 不碰正文——一会儿的实验里，文件的 `hello` 内容从头到尾没变，变的只是门上的表。② **DACL 可以整体导出成独立文件备份再还原**（本身就说明它是一份可搬运的元数据）：

```bat
icacls D:\Share\* /save D:\Share-acl-backup.txt /t   :: 备份整棵树的 DACL
icacls D:\Share\ /restore D:\Share-acl-backup.txt    :: 还原
```

---

## 第 2 课：ACE 解剖——一行规则里有什么

**🧑‍🏫 老师：**

一条 ACE 先记成**三个格子**：

```text
┌──────────────┬──────────┬────────────────────┐
│ 对谁（SID）    │ 允许/拒绝 │ 哪些权限位（操作）    │
│ 用户或组…      │ Allow/Deny│ 读 / 写 / 完全控制… │
└──────────────┴──────────┴────────────────────┘
```

- **对谁**：最终是 SID（账户名只是给人看的，写入前系统先 Translate——第 3 讲）；
- **允许还是拒绝**：Allow 或 Deny；
- **哪些操作**：第 7 讲的权限位。

多条 ACE 排在一起就是该对象的 **DACL**。现在亲手造一张（拿实验场的组员做角色：LabReaders 组 + LabUser2）：

```powershell
PS> New-Item C:\Lab\acetest\Q1.txt -Value 'hello' -Force
PS> icacls C:\Lab\acetest\Q1.txt /inheritance:r          # 关继承（下一讲细讲）
PS> icacls C:\Lab\acetest\Q1.txt /grant:r 'LabReaders:(RX)'   # 重置成只有一条：组可读执行
PS> icacls C:\Lab\acetest\Q1.txt /grant 'PC3507\LabUser2:(R)' # 追加：LabUser2 只读
PS> icacls C:\Lab\acetest\Q1.txt /deny 'PC3507\LabUser2:(W)'  # 追加拒绝：LabUser2 不得写
PS> icacls C:\Lab\acetest\Q1.txt

C:\Lab\acetest\Q1.txt PC3507\LabUser2:(DENY)(W)
                      PC3507\LabUser2:(DENY)(W)
                      PC3507\LabReaders:(RX)
                      PC3507\LabUser2:(R)
```

一张真实的 DACL 摆出来了（本机输出原样）。读法：`/grant` 写 Allow ACE、`/deny` 写 Deny ACE——`icacls` 列表里 Deny 行标着 `(DENY)`。**顺带一个诚实记录**：那两条一模一样的 `(DENY)(W)` 是我实验跑了两次 `/deny` 留下的重复条目——而且它们**扛过了中间的 `/inheritance:r` 和 `/grant:r` 重置都没被清掉**。这是个真实现象：**显式 Deny ACE 很顽固，`/grant:r` 只重置授权、不清拒绝**；要删显式 Deny 得用 `/remove:d <主体>`。「随手 Deny」的杀伤力，从工具行为上就可见一斑。

再补一个呼应第 6 讲的实测——此刻这张表里**没有我**（我锁了继承又只授了别人），读读看：

```powershell
PS> Get-Content C:\Lab\acetest\Q1.txt
Get-Content : 对路径"…"的访问被拒绝。          ← owner 也读不了正文！

PS> icacls C:\Lab\acetest\Q1.txt /grant 'jzfz\chengongyi:(F)'   # owner 凭隐式 WRITE_DAC 给自己补了 F
PS> Get-Content C:\Lab\acetest\Q1.txt
hello                                          ← 内容从头到尾没变过
```

owner ≠ 数据权限（第 6 讲的结论在新场景里又活了一遍）；而 `hello` 始终是 `hello`——改的全是**元数据**，不是正文。

---

## 第 3 课：走读这张表——三条判定直觉

**🧑‍🏫 老师：**

拿刚造的表走读（精确求值算法下一讲，先把 Appendix B 的三条直觉立住）：

| 来访者令牌里有谁 | 想做什么 | 粗结果 |
|------------------|----------|--------|
| LabUser1（在 LabReaders 组） | 读 | 通常可以——令牌里的**组 SID 命中** `(RX)` 那行 |
| LabUser2 | 读 | 通常可以——命中自己的 `(R)` |
| LabUser2 | 写 | **通常不行——Deny 压过 Allow**（哪怕它同时命中允许行） |

三条直觉逐一说：

**① 没有任何匹配的 ACE → 不能访问。** 门上没写你的名字（也没写你的组），默认不是「随便进」，而是**进不去**——刚才我自己就是活例子。

**② Deny 一般压过 Allow。** 同一对象上对你令牌里某个 SID 既有允许又有拒绝时，拒绝通常说了算——LabUser2 的 `(DENY)(W)` 会压住它的 `(R)` 里可能隐含的写路径（`/deny` 文档还说明：它会从显式授予中去掉相同权限）。「随手 Deny」杀伤力大，尤其将来铺到继承里。

**③ 令牌里的组 SID 也会命中 ACE。** ACE 常写给组而不是每个人——你令牌里带着组 SID（第 5、8 讲），就会命中「授给该组」的那行。Appendix B 还举了 AD 的常见模式：很多对象的 ACL 含有「允许 Authenticated Users 读取一般信息」的宽而浅的 ACE——域里验过身份的主体令牌默认带这个 SID，所以「已登录的普通人」能读到大量一般属性；真正敏感的操作靠更细的 ACE 收紧。

---

## 插问：DACL 备份文件里到底是什么？——SDDL 现形

**🧑‍🎓 学生：** 你说 `/save` 导出的是「可搬运的元数据」——备份文件里长什么样？

**🧑‍🏫 老师：**

打开看（本机 `acl-backup.txt`，按 Unicode 读的那行）：

```text
D:PAI(D;;0x100116;;;S-1-5-21-...-1010)(D;;0x100116;;;S-1-5-21-...-1010)(A;;FA;;;S-1-5-21-...-279405)(A;;0x1200a9;;;S-1-5-21-...-1011)(A;;FR;;;S-1-5-21-...-1010)
```

这就是 **SDDL（Security Descriptor Definition Language）**——安全描述符的文本表示。逐个字母拆一角：`D:` 开头是 DACL 段；`PAI` 是保护+自动继承标志；每个括号是一条 **ACE 的原文**——`(D;;…)` 的 D = Deny、`(A;;…)` 的 A = Allow；中间那串 `0x100116`/`FA`/`FR` 是**权限位的十六进制**（access mask！第 7 讲的「位」在这现了原形：`FR` = File Read、`FA` = File All）；分号分隔的最后一段是**SID**（-1010 是 LabUser2、-1011 是 LabReaders、-279405 是我）。

对照刚才 `icacls` 的五行输出：两 `(DENY)(W)` + LabReaders `(RX)` + 我 `(F)` + LabUser2 `(R)`——**一一对应**。`icacls` 给人看，SDDL 给机器看。完整语法在[附录·SDDL](../appendix/02-sddl.md)，这里混个脸熟。

**还原也实测了**（真跑）：把表砸烂（重置成只剩 SYSTEM）→ `icacls C:\Lab\acetest /restore C:\Lab\acl-backup.txt` → 表原样回来（连那两条顽固的重复 Deny 都回来了——备份忠实到这个地步）。

---

## 第 4 课：Permissions ≠ User rights（点破不展开）

**🧑‍🏫 老师：**

Appendix B 特意区分两个词：

| 词 | 管什么 |
|----|--------|
| **Permissions（本讲）** | 某个**对象**上的 ACL/ACE：能不能读这个文件、改这个 AD 属性 |
| **User rights / privileges** | **系统范围**的能力：取得所有权、备份、改系统时间……通过组策略等分配 |

原文给了个扎心的冲突例：即便某对象 ACL **拒绝** Administrators 读写，Administrators 成员仍可能凭用户权利 **Take ownership** 取得所有权、再改写 ACL 给自己完全控制——第 6 讲的 takeown 实验就是这个例子的实操版。所以文档的建议是**不要用高权账户做日常操作**，而不是幻想「靠 ACL Deny 挡住决心用高权的人」。

> **DACL 很重要，但不是宇宙尽头。**「权利压过权限」的细节第 20 讲（用户权利专讲）展开。

---

## 第 5 课：怎么改 DACL——命令行与 C#

**命令行**（改的就是 ACE）：

```bat
icacls <文件>                                    :: 查看
icacls <文件> /grant LabReaders:R                :: 加一条 Allow
icacls <文件> /deny "PC3507\LabUser2:M"           :: 加一条显式 Deny
icacls <目录>\* /save <备份文件> /t               :: 备份整棵树
icacls <目录> /restore <备份文件>                 :: 还原
```

**C#**（构造一条 ACE 并加入——刚才命令行做的事的代码版）：

```csharp
var file = new FileInfo(@"C:\Lab\acetest\Q1.txt");
FileSecurity security = file.GetAccessControl();

// 一条 Allow ACE：对组 LabReaders 授予读执行
security.AddAccessRule(new FileSystemAccessRule(
    new NTAccount(@"PC3507\LabReaders"),
    FileSystemRights.ReadAndExecute,
    AccessControlType.Allow));

// 一条 Deny ACE：拒绝 LabUser2 写
security.AddAccessRule(new FileSystemAccessRule(
    new NTAccount(@"PC3507\LabUser2"),
    FileSystemRights.Write,
    AccessControlType.Deny));

file.SetAccessControl(security);
```

三个参数正是 ACE 的三个格子：主体（对谁）、`FileSystemRights`（哪些位）、`AccessControlType`（Allow/Deny）。（继承相关参数第 12 讲再加，先写「作用于当前对象」的最简 ACE。）

---

## 概念图

```text
可保护对象（文件 / 注册表 / AD 对象…）
        │  NTFS 等以「安全元数据」形式保存（不是文件正文）
        ▼
   Security Descriptor（第 11 讲拼全）
        │
        └── DACL  ← 本讲主角
              ├── ACE: Deny   PC3507\LabUser2  写
              ├── ACE: Allow  PC3507\LabReaders 读+执行
              ├── ACE: Allow  JZFZ\chengongyi   完全控制
              └── ACE: Allow  PC3507\LabUser2   读
```

---

## 收束

**你现在会了：**

- Permissions 是对象上的访问控制；**DACL 是跟对象走的安全元数据**，不是文件正文（改 ACL 不改内容；FAT/exFAT 带不走；可 `/save`/`/restore` 整体搬运）。
- **ACE 三格**：对谁（SID）× Allow/Deny × 哪些权限位；DACL 是整张表。
- 三条直觉：无匹配 ACE → 不能访问；**Deny 一般压过 Allow**（显式 Deny 还很顽固，`/grant:r` 清不掉）；令牌里的组 SID 也命中 ACE。
- 备份文件里的 **SDDL** 是安全描述符的机器可读形式（`D:`/`(A;;…)`/`(D;;…)` + 十六进制 access mask + SID）。
- 权限与用户权利不是同一类设置——ACL Deny 挡不住特权（第 20 讲）。

**下一讲才需要：** 打开文件时，系统如何拿你令牌里的 SID，去和这张 DACL **逐条对表**（Access Check）——LabUser1 能不能读、LabUser2 到底能不能写，下一讲见分晓。

---

<!-- chapter-nav:start -->
← 上一章：[第 8 讲：组](./09-groups.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 10 讲：访问检查](./11-access-check.md)
<!-- chapter-nav:end -->
