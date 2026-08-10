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

只有「主人全能 / 别人全不能」无法协作。

### 这一讲只发明：权限位（能做什么）

先把「动作」拆成可勾选的能力。资源管理器里常见打包名：

| 说法 | 直觉 |
|------|------|
| 读取 | 打开看、列目录 |
| 写入 / 修改 | 改内容 |
| 读取和执行 | 读 + 运行 |
| 修改 | 读写下删（通常不含改权限本身） |
| 完全控制 | 一切，含改权限 |

`icacls` 里常见缩写：`F` 完全控制、`RX` 读执行、`N` 无访问等。  
本讲还不改 ACL，只先认识缩写；查看某个文件当前权限时可这样看输出里的字母：

```bat
icacls D:\Share\Q1.xlsx
:: 输出里可能出现类似：(F)、(RX)、(R) —— 对应完全控制 / 读执行 / 读取
```

来源：[icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)

> 本讲只发明「有哪些开关」。  
> **还没发明**「把开关授给谁、怎样写成一张表」——那是后面 ACE/DACL。

### 收束

**你现在会了：** 权限是一堆可组合的能力位。  
**下一讲才需要：** 人一多，不能对每个人单独维护时怎么办。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 6 讲：Owner](./07-owner.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 8 讲：组](./09-groups.md)
<!-- chapter-nav:end -->
