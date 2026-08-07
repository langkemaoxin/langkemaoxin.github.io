---
title: "第 24 讲：AdminSDHolder 与保护组"
sidebarGroup: "卷三·权利与 UAC"
shortTitle: "第 24 讲：AdminSDHolder"
order: 5
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 第 24 讲：AdminSDHolder 与保护组

> **状态：待写**（占位章）  
> **分卷：卷三·权利、UAC、特权账户**  
> 成文时须遵守：案例引入 + 西蒙讲述（见仓库写作规范）。

## 这一章打算讲什么

案例：改完 Domain Admins 相关对象 ACL，过一会儿又变回去——引出 AdminSDHolder / SDProp 在保护特权组。

## 计划大纲（写作时按此展开）

1. 小王改 ACL「不生效/被还原」的现场
2. 发明：特权组由特殊模板保护
3. 和日常文件 ACL 运维的差别（该找谁、不该硬刚）
4. 不写攻击利用，只建立正确地图

## 依赖与衔接

先读 [域与域控](../vol2-identity/01-domain-dc.md)、特权账户相关 Learn 附录。

## 验收标准（写完后自检）

- 有一条完整故事弧，而不是名词清单  
- 读者能回答「这一章只发明了什么」  
- 有「怎么看见」（命令 / 界面 / 最小实验）  
- 索引里的一句话简介已同步更新

---

---

<!-- chapter-nav:start -->
← 上一章：[第 23 讲：GPO 权利分配](./04-gpo-rights.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 25 讲：注册表 ACL](../vol4-beyond-files/01-registry.md)
<!-- chapter-nav:end -->
