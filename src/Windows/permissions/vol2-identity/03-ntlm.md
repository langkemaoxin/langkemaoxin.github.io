---
title: "卷二·NTLM 与协商（Negotiate）"
sidebarGroup: "卷二·网上的身份"
shortTitle: "NTLM 与协商"
order: 3
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 卷二·NTLM 与协商（Negotiate）

> **状态：待写**（占位章）  
> **分卷：卷二·网上的身份**  
> 成文时须遵守：案例引入 + 西蒙讲述（见仓库写作规范）。

## 这一章打算讲什么

用案例说明：为何有时不是纯 Kerberos；NTLM 与 Negotiate 各解决什么麻烦；读者如何用现象判断「掉级」。

## 计划大纲（写作时按此展开）

1. 小王只会 klist，却遇到仍要输口令 / 事件里出现 NTLM 的困惑
2. 发明：多种认证协议并存，系统常「协商」选用
3. 对照 Kerberos 章：票据 vs 挑战响应（人话级，不写攻击）
4. 怎么看见：安全事件 / 连接失败时的排查直觉

## 依赖与衔接

先读 [第 16 站 Kerberos](./02-kerberos.md)、[第 15 站域](./01-domain-dc.md)。

## 验收标准（写完后自检）

- 有一条完整故事弧，而不是名词清单  
- 读者能回答「这一章只发明了什么」  
- 有「怎么看见」（命令 / 界面 / 最小实验）  
- 索引里的一句话简介已同步更新

---

---

<!-- chapter-nav:start -->
← 上一章：[第 16 站：Kerberos](./02-kerberos.md)
· [回书稿索引](../00-index.md)
→ 下一章：[登录类型](./04-logon-types.md)
<!-- chapter-nav:end -->
