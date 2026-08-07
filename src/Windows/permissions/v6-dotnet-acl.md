---
title: "卷六·用 .NET 读写文件 ACL"
sidebarGroup: "权限"
shortTitle: ".NET 改 ACL"
order: 62
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 卷六·用 .NET 读写文件 ACL

> **状态：待写**（占位章）  
> **分卷：卷六·用代码改权限**  
> 成文时须遵守：案例引入 + 西蒙讲述（见仓库写作规范）。

## 这一章打算讲什么

GetAccessControl / FileSystemAccessRule / InheritanceFlags·PropagationFlags 与第 12 站标志对齐。

## 计划大纲（写作时按此展开）

1. 读 ACL
2. 加一条 ACE
3. 继承标志怎么传
4. 和 icacls 互证

## 依赖与衔接

卷一 ACE/继承。

## 验收标准（写完后自检）

- 有一条完整故事弧，而不是名词清单  
- 读者能回答「这一章只发明了什么」  
- 有「怎么看见」（命令 / 界面 / 最小实验）  
- 索引里的一句话简介已同步更新

---

<!-- chapter-nav:start -->
← 上一章：[.NET 身份](./v6-dotnet-identity.md)
· [回书稿索引](./00-index.md)
→ 下一章：[.NET 模拟](./v6-dotnet-impersonation.md)
<!-- chapter-nav:end -->
