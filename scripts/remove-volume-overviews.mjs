/**
 * 删除各卷 00-overview，统一卷图标为 book，重建章末导航与索引表。
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/Windows/permissions");

const overviews = [
  "vol1-invent/00-overview.md",
  "vol2-identity/00-overview.md",
  "vol3-rights-uac/00-overview.md",
  "vol4-beyond-files/00-overview.md",
  "vol5-ops/00-overview.md",
  "vol6-dotnet/00-overview.md",
  "appendix/00-overview.md",
];

for (const rel of overviews) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log("deleted", rel);
  }
}

/** @type {{ file: string, label: string }[]} */
const navChapters = [
  { file: "00-index.md", label: "书稿索引" },
  { file: "vol1-invent/01-no-permission.md", label: "第 0 站：没有权限" },
  { file: "vol1-invent/02-account.md", label: "第 1 站：账户" },
  { file: "vol1-invent/03-sid.md", label: "第 2 站：SID" },
  { file: "vol1-invent/04-name-sid-lsa.md", label: "第 3 站：名字 ↔ SID" },
  { file: "vol1-invent/05-logon-lsa.md", label: "第 4 站：登录与 LSA" },
  { file: "vol1-invent/06-access-token.md", label: "第 5 站：Access Token" },
  { file: "vol1-invent/07-owner.md", label: "第 6 站：Owner" },
  { file: "vol1-invent/08-permission-bits.md", label: "第 7 站：权限位" },
  { file: "vol1-invent/09-groups.md", label: "第 8 站：组" },
  { file: "vol1-invent/10-ace-dacl.md", label: "第 9 站：ACE 与 DACL" },
  { file: "vol1-invent/11-access-check.md", label: "第 10 站：访问检查" },
  { file: "vol1-invent/12-security-descriptor.md", label: "第 11 站：安全描述符" },
  { file: "vol1-invent/13-inheritance.md", label: "第 12 站：继承" },
  { file: "vol1-invent/14-effective-permissions.md", label: "第 13 站：有效权限" },
  { file: "vol1-invent/15-sacl.md", label: "第 14 站：SACL" },
  { file: "vol2-identity/01-domain-dc.md", label: "第 15 站：域与域控" },
  { file: "vol2-identity/02-kerberos.md", label: "第 16 站：Kerberos" },
  { file: "vol2-identity/03-ntlm.md", label: "NTLM 与协商" },
  { file: "vol2-identity/04-logon-types.md", label: "登录类型" },
  { file: "vol2-identity/05-spn.md", label: "SPN" },
  { file: "vol3-rights-uac/01-rights-uac.md", label: "权利与 UAC（合章）" },
  { file: "vol3-rights-uac/02-user-rights.md", label: "用户权利专章" },
  { file: "vol3-rights-uac/03-uac.md", label: "UAC 专章" },
  { file: "vol3-rights-uac/04-gpo-rights.md", label: "GPO 权利分配" },
  { file: "vol3-rights-uac/05-adminsdholder.md", label: "AdminSDHolder" },
  { file: "vol4-beyond-files/01-registry.md", label: "注册表 ACL" },
  { file: "vol4-beyond-files/02-services.md", label: "服务权限" },
  { file: "vol4-beyond-files/03-ad-delegation.md", label: "AD 委派" },
  { file: "vol5-ops/01-share-design.md", label: "共享设计" },
  { file: "vol5-ops/02-effective-access-practice.md", label: "有效权限实战" },
  { file: "vol5-ops/03-troubleshooting-cases.md", label: "排障案例集" },
  { file: "vol6-dotnet/01-identity.md", label: ".NET 身份" },
  { file: "vol6-dotnet/02-acl.md", label: ".NET 改 ACL" },
  { file: "vol6-dotnet/03-impersonation.md", label: ".NET 模拟" },
  { file: "appendix/01-map.md", label: "总图" },
  { file: "appendix/02-sddl.md", label: "SDDL" },
  { file: "appendix/03-event-ids.md", label: "事件 ID" },
  { file: "appendix/04-lab.md", label: "实验室" },
  { file: "appendix/05-references.md", label: "参考" },
];

const MARK_START = "<!-- chapter-nav:start -->";
const MARK_END = "<!-- chapter-nav:end -->";

function linkTo(fromFile, toFile) {
  if (fromFile === "00-index.md") return `./${toFile}`;
  const rel = path.posix.relative(path.posix.dirname(fromFile), toFile);
  return (rel.startsWith(".") ? rel : "./" + rel).replace(/\\/g, "/");
}

for (let i = 0; i < navChapters.length; i++) {
  const cur = navChapters[i];
  const prev = i > 0 ? navChapters[i - 1] : null;
  const next = i + 1 < navChapters.length ? navChapters[i + 1] : null;
  const parts = ["---", "", MARK_START];
  if (prev) parts.push(`← 上一章：[${prev.label}](${linkTo(cur.file, prev.file)})`);
  parts.push(`· [回书稿索引](${linkTo(cur.file, "00-index.md")})`);
  if (next) parts.push(`→ 下一章：[${next.label}](${linkTo(cur.file, next.file)})`);
  parts.push(MARK_END, "");
  const nav = parts.join("\n");

  const fp = path.join(root, cur.file);
  let text = fs.readFileSync(fp, "utf8");
  if (text.includes(MARK_START)) {
    text = text.replace(new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}\\n?`), "");
  }
  // collapse trailing --- clutter
  text = text.replace(/(?:\r?\n---)+\s*$/, "\n");
  text = text.replace(/\s*$/, "\n\n") + nav;
  fs.writeFileSync(fp, text, "utf8");
}
console.log("nav rebuilt");

const index = `---
title: "书稿索引：Windows 权限（分卷）"
sidebarGroup: "权限"
shortTitle: "书稿索引"
order: 0
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
---

# 书稿索引：Windows 权限（分卷）

> 假设世界上本来没有「权限」这回事。  
> **案例引入 → 西蒙式一次发明一个概念 → 专有名词后置。**

正文按**物理卷目录**存放；本页是总导航。标「待写」的是占位章。

## 分卷一览

| 卷 | 目录 | 入口 |
|----|------|------|
| 卷一·发明权限 | \`vol1-invent/\` | [第 0 站](./vol1-invent/01-no-permission.md) |
| 卷二·网上的身份 | \`vol2-identity/\` | [第 15 站](./vol2-identity/01-domain-dc.md) |
| 卷三·权利与 UAC | \`vol3-rights-uac/\` | [权利与 UAC](./vol3-rights-uac/01-rights-uac.md) |
| 卷四·不只是文件 | \`vol4-beyond-files/\` | [注册表 ACL](./vol4-beyond-files/01-registry.md) |
| 卷五·排障与设计 | \`vol5-ops/\` | [共享设计](./vol5-ops/01-share-design.md) |
| 卷六·用代码改权限 | \`vol6-dotnet/\` | [.NET 身份](./vol6-dotnet/01-identity.md) |
| 附录 | \`appendix/\` | [总图](./appendix/01-map.md) |

## 卷一·发明权限

| 章 | 状态 | 说明 |
|----|------|------|
| [第 0 站](./vol1-invent/01-no-permission.md) | 已有 | 为何需要权限 |
| [第 1 站](./vol1-invent/02-account.md) | 已有 | 账户 |
| [第 2 站](./vol1-invent/03-sid.md) | 已有 | SID |
| [第 3 站](./vol1-invent/04-name-sid-lsa.md) | 已有 | 名字 ↔ SID |
| [第 4 站](./vol1-invent/05-logon-lsa.md) | 已有 | 登录与 LSA |
| [第 5 站](./vol1-invent/06-access-token.md) | 已有 | Access Token |
| [第 6 站](./vol1-invent/07-owner.md) | 已有 | Owner |
| [第 7 站](./vol1-invent/08-permission-bits.md) | 已有·待加厚 | 权限位 |
| [第 8 站](./vol1-invent/09-groups.md) | 已有·待加厚 | 组 |
| [第 9 站](./vol1-invent/10-ace-dacl.md) | 已有 | ACE / DACL |
| [第 10 站](./vol1-invent/11-access-check.md) | 已有 | 访问检查与共享两道门 |
| [第 11 站](./vol1-invent/12-security-descriptor.md) | 已有·待加厚 | 安全描述符 |
| [第 12 站](./vol1-invent/13-inheritance.md) | 已有 | 继承 |
| [第 13 站](./vol1-invent/14-effective-permissions.md) | 已有 | 有效权限 |
| [第 14 站](./vol1-invent/15-sacl.md) | 已有·待加厚 | SACL |

## 卷二·网上的身份

| 章 | 状态 | 说明 |
|----|------|------|
| [第 15 站](./vol2-identity/01-domain-dc.md) | 已有 | 域与域控 |
| [第 16 站](./vol2-identity/02-kerberos.md) | 已有 | Kerberos |
| [NTLM 与协商](./vol2-identity/03-ntlm.md) | 已有 | 盖章走不通时为何会出现 NTLM |
| [登录类型](./vol2-identity/04-logon-types.md) | 待写 | |
| [SPN](./vol2-identity/05-spn.md) | 待写 | |

## 卷三·权利与 UAC

| 章 | 状态 | 说明 |
|----|------|------|
| [权利与 UAC（合章）](./vol3-rights-uac/01-rights-uac.md) | 已有·待拆 | |
| [用户权利专章](./vol3-rights-uac/02-user-rights.md) | 待写 | |
| [UAC 专章](./vol3-rights-uac/03-uac.md) | 待写 | |
| [GPO 权利分配](./vol3-rights-uac/04-gpo-rights.md) | 待写 | |
| [AdminSDHolder](./vol3-rights-uac/05-adminsdholder.md) | 待写 | |

## 卷四·不只是文件

| 章 | 状态 | 说明 |
|----|------|------|
| [注册表 ACL](./vol4-beyond-files/01-registry.md) | 待写 | |
| [服务权限](./vol4-beyond-files/02-services.md) | 待写 | |
| [AD 委派](./vol4-beyond-files/03-ad-delegation.md) | 待写 | |

## 卷五·排障与设计

| 章 | 状态 | 说明 |
|----|------|------|
| [共享设计](./vol5-ops/01-share-design.md) | 待写 | |
| [有效权限实战](./vol5-ops/02-effective-access-practice.md) | 待写 | |
| [排障案例集](./vol5-ops/03-troubleshooting-cases.md) | 待写 | |

## 卷六·用代码改权限

| 章 | 状态 | 说明 |
|----|------|------|
| [.NET 身份](./vol6-dotnet/01-identity.md) | 待写 | |
| [.NET 改 ACL](./vol6-dotnet/02-acl.md) | 待写 | |
| [.NET 模拟](./vol6-dotnet/03-impersonation.md) | 待写 | |

## 附录

| 章 | 状态 | 说明 |
|----|------|------|
| [总图](./appendix/01-map.md) | 已有·待升级 | |
| [SDDL](./appendix/02-sddl.md) | 待写 | |
| [事件 ID](./appendix/03-event-ids.md) | 待写 | |
| [实验室](./appendix/04-lab.md) | 待写 | |
| [参考](./appendix/05-references.md) | 已有·待升级 | |

建议从 [第 0 站](./vol1-invent/01-no-permission.md) 开始。
`;

fs.writeFileSync(path.join(root, "00-index.md"), index, "utf8");
// append nav for index
{
  const next = navChapters[1];
  const nav = [
    "---",
    "",
    MARK_START,
    `· [回书稿索引](./00-index.md)`,
    `→ 下一章：[${next.label}](./${next.file})`,
    MARK_END,
    "",
  ].join("\n");
  let text = fs.readFileSync(path.join(root, "00-index.md"), "utf8");
  text = text.replace(/\s*$/, "\n\n") + nav;
  fs.writeFileSync(path.join(root, "00-index.md"), text, "utf8");
}

console.log("done");
