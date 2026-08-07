/**
 * 将 permissions 平铺文件物理拆到卷目录，重写链接与索引、章末导航。
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/Windows/permissions");

/**
 * oldFileName (在 permissions 根下) -> { dir, file, label, order, sidebarGroup }
 * sidebarGroup 用卷中文名，与 Windows.mjs title 一致以便告警少一点；
 * 实际 title 以 Windows.mjs 为准。
 */
const moves = [
  // vol1
  ["v1-00-overview.md", "vol1-invent", "00-overview.md", "卷一导读", 0, "卷一·发明权限"],
  ["01-no-permission.md", "vol1-invent", "01-no-permission.md", "第 0 站：没有权限", 1, "卷一·发明权限"],
  ["02-account.md", "vol1-invent", "02-account.md", "第 1 站：账户", 2, "卷一·发明权限"],
  ["03-sid.md", "vol1-invent", "03-sid.md", "第 2 站：SID", 3, "卷一·发明权限"],
  ["04-name-sid-lsa.md", "vol1-invent", "04-name-sid-lsa.md", "第 3 站：名字 ↔ SID", 4, "卷一·发明权限"],
  ["05-logon-lsa.md", "vol1-invent", "05-logon-lsa.md", "第 4 站：登录与 LSA", 5, "卷一·发明权限"],
  ["06-access-token.md", "vol1-invent", "06-access-token.md", "第 5 站：Access Token", 6, "卷一·发明权限"],
  ["07-owner.md", "vol1-invent", "07-owner.md", "第 6 站：Owner", 7, "卷一·发明权限"],
  ["08-permission-bits.md", "vol1-invent", "08-permission-bits.md", "第 7 站：权限位", 8, "卷一·发明权限"],
  ["09-groups.md", "vol1-invent", "09-groups.md", "第 8 站：组", 9, "卷一·发明权限"],
  ["10-ace-dacl.md", "vol1-invent", "10-ace-dacl.md", "第 9 站：ACE 与 DACL", 10, "卷一·发明权限"],
  ["11-access-check.md", "vol1-invent", "11-access-check.md", "第 10 站：访问检查", 11, "卷一·发明权限"],
  ["12-security-descriptor.md", "vol1-invent", "12-security-descriptor.md", "第 11 站：安全描述符", 12, "卷一·发明权限"],
  ["13-inheritance.md", "vol1-invent", "13-inheritance.md", "第 12 站：继承", 13, "卷一·发明权限"],
  ["14-effective-permissions.md", "vol1-invent", "14-effective-permissions.md", "第 13 站：有效权限", 14, "卷一·发明权限"],
  ["15-sacl.md", "vol1-invent", "15-sacl.md", "第 14 站：SACL", 15, "卷一·发明权限"],
  // vol2
  ["v2-00-overview.md", "vol2-identity", "00-overview.md", "卷二导读", 0, "卷二·网上的身份"],
  ["16-domain-dc.md", "vol2-identity", "01-domain-dc.md", "第 15 站：域与域控", 1, "卷二·网上的身份"],
  ["17-kerberos.md", "vol2-identity", "02-kerberos.md", "第 16 站：Kerberos", 2, "卷二·网上的身份"],
  ["v2-ntlm.md", "vol2-identity", "03-ntlm.md", "NTLM 与协商", 3, "卷二·网上的身份"],
  ["v2-logon-types.md", "vol2-identity", "04-logon-types.md", "登录类型", 4, "卷二·网上的身份"],
  ["v2-spn.md", "vol2-identity", "05-spn.md", "SPN", 5, "卷二·网上的身份"],
  // vol3
  ["v3-00-overview.md", "vol3-rights-uac", "00-overview.md", "卷三导读", 0, "卷三·权利与 UAC"],
  ["18-rights-uac.md", "vol3-rights-uac", "01-rights-uac.md", "权利与 UAC（合章）", 1, "卷三·权利与 UAC"],
  ["v3-user-rights.md", "vol3-rights-uac", "02-user-rights.md", "用户权利专章", 2, "卷三·权利与 UAC"],
  ["v3-uac.md", "vol3-rights-uac", "03-uac.md", "UAC 专章", 3, "卷三·权利与 UAC"],
  ["v3-gpo-rights.md", "vol3-rights-uac", "04-gpo-rights.md", "GPO 权利分配", 4, "卷三·权利与 UAC"],
  ["v3-adminsdholder.md", "vol3-rights-uac", "05-adminsdholder.md", "AdminSDHolder", 5, "卷三·权利与 UAC"],
  // vol4
  ["v4-00-overview.md", "vol4-beyond-files", "00-overview.md", "卷四导读", 0, "卷四·不只是文件"],
  ["v4-registry.md", "vol4-beyond-files", "01-registry.md", "注册表 ACL", 1, "卷四·不只是文件"],
  ["v4-services.md", "vol4-beyond-files", "02-services.md", "服务权限", 2, "卷四·不只是文件"],
  ["v4-ad-delegation.md", "vol4-beyond-files", "03-ad-delegation.md", "AD 委派", 3, "卷四·不只是文件"],
  // vol5
  ["v5-00-overview.md", "vol5-ops", "00-overview.md", "卷五导读", 0, "卷五·排障与设计"],
  ["v5-share-design.md", "vol5-ops", "01-share-design.md", "共享设计", 1, "卷五·排障与设计"],
  ["v5-effective-access-practice.md", "vol5-ops", "02-effective-access-practice.md", "有效权限实战", 2, "卷五·排障与设计"],
  ["v5-troubleshooting-cases.md", "vol5-ops", "03-troubleshooting-cases.md", "排障案例集", 3, "卷五·排障与设计"],
  // vol6
  ["v6-00-overview.md", "vol6-dotnet", "00-overview.md", "卷六导读", 0, "卷六·用代码改权限"],
  ["v6-dotnet-identity.md", "vol6-dotnet", "01-identity.md", ".NET 身份", 1, "卷六·用代码改权限"],
  ["v6-dotnet-acl.md", "vol6-dotnet", "02-acl.md", ".NET 改 ACL", 2, "卷六·用代码改权限"],
  ["v6-dotnet-impersonation.md", "vol6-dotnet", "03-impersonation.md", ".NET 模拟", 3, "卷六·用代码改权限"],
  // appendix
  ["a-00-overview.md", "appendix", "00-overview.md", "附录导读", 0, "附录"],
  ["19-map.md", "appendix", "01-map.md", "总图", 1, "附录"],
  ["a-sddl.md", "appendix", "02-sddl.md", "SDDL", 2, "附录"],
  ["a-event-ids.md", "appendix", "03-event-ids.md", "事件 ID", 3, "附录"],
  ["a-lab.md", "appendix", "04-lab.md", "实验室", 4, "附录"],
  ["20-references.md", "appendix", "05-references.md", "参考", 5, "附录"],
];

/** old basename -> new relative from permissions root */
const oldToNew = new Map();
/** any historical basename (old or intermediate) -> new rel path */
const basenameToNew = new Map();

for (const [oldName, dir, newName, label, order, vol] of moves) {
  const rel = `${dir}/${newName}`;
  oldToNew.set(oldName, { dir, newName, rel, label, order, vol });
  basenameToNew.set(oldName, rel);
  basenameToNew.set(newName, rel);
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function setFmField(text, key, value) {
  const quoted = `"${value}"`;
  if (new RegExp(`^${key}:`, "m").test(text)) {
    return text.replace(new RegExp(`^${key}:\\s*.*$`, "m"), `${key}: ${quoted}`);
  }
  return text.replace(/^sidebarGroup:\s*.*$/m, (m) => `${m}\n${key}: ${quoted}`);
}

function setOrder(text, order) {
  if (/^order:/m.test(text)) {
    return text.replace(/^order:\s*.*$/m, `order: ${order}`);
  }
  return text.replace(/^sidebarGroup:\s*.*$/m, (m) => `${m}\norder: ${order}`);
}

// 1) move files
for (const [oldName, dir, newName, label, order, vol] of moves) {
  const src = path.join(root, oldName);
  if (!fs.existsSync(src)) {
    // maybe already moved
    const dest = path.join(root, dir, newName);
    if (fs.existsSync(dest)) {
      console.log("skip exists", dest);
      continue;
    }
    console.warn("missing", oldName);
    continue;
  }
  ensureDir(path.join(root, dir));
  const dest = path.join(root, dir, newName);
  let text = fs.readFileSync(src, "utf8");
  text = setFmField(text, "sidebarGroup", vol);
  text = setOrder(text, order);
  fs.writeFileSync(dest, text, "utf8");
  fs.unlinkSync(src);
  console.log("moved", oldName, "->", `${dir}/${newName}`);
}

/**
 * 把 markdown 里的 ./old.md 或 old.md 链到正确相对路径
 * @param {string} fromRel 当前文件相对 permissions 的路径，如 vol1-invent/10-ace-dacl.md
 * @param {string} text
 */
function rewriteLinks(fromRel, text) {
  const fromDir = path.posix.dirname(fromRel.replace(/\\/g, "/"));

  return text.replace(
    /\]\((\.\/)?([A-Za-z0-9._\-]+\.md)(#[^)]*)?\)/g,
    (full, dot, target, hash = "") => {
      const base = path.posix.basename(target);
      // already a path with slash — try rewrite last segment if known
      if (target.includes("/")) {
        const tBase = path.posix.basename(target);
        const mapped = basenameToNew.get(tBase);
        if (!mapped) return full;
        let rel = path.posix.relative(fromDir, mapped);
        if (!rel.startsWith(".")) rel = "./" + rel;
        return `](${rel}${hash})`;
      }
      const mapped = basenameToNew.get(base);
      if (!mapped) {
        // same-dir file after rename? or 00-index
        if (base === "00-index.md") {
          let rel = path.posix.relative(fromDir, "00-index.md");
          if (!rel.startsWith(".")) rel = "./" + rel;
          return `](${rel}${hash})`;
        }
        return full;
      }
      let rel = path.posix.relative(fromDir, mapped);
      if (!rel.startsWith(".")) rel = "./" + rel;
      return `](${rel}${hash})`;
    },
  );
}

// Also rewrite links that use known old paths like ./v2-ntlm.md already handled by basename

function walkMd(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkMd(full, acc);
    else if (name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

// 2) rewrite all links under permissions
for (const full of walkMd(root)) {
  const rel = path.relative(root, full).replace(/\\/g, "/");
  let text = fs.readFileSync(full, "utf8");
  const next = rewriteLinks(rel, text);
  if (next !== text) {
    fs.writeFileSync(full, next, "utf8");
    console.log("links", rel);
  }
}

// 3) chapter nav for: index + all volume files in sidebar order
const navChapters = [
  { file: "00-index.md", label: "书稿索引" },
  ...moves.map(([, dir, newName, label]) => ({
    file: `${dir}/${newName}`,
    label,
  })),
];

const MARK_START = "<!-- chapter-nav:start -->";
const MARK_END = "<!-- chapter-nav:end -->";

for (let i = 0; i < navChapters.length; i++) {
  const cur = navChapters[i];
  const prev = i > 0 ? navChapters[i - 1] : null;
  const next = i + 1 < navChapters.length ? navChapters[i + 1] : null;
  const fromDir = path.posix.dirname(cur.file);

  function href(toFile) {
    let rel = path.posix.relative(fromDir === "." ? "" : fromDir, toFile);
    if (!rel.startsWith(".")) rel = "./" + rel;
    // when fromDir is ., relative(".", "00-index") might be odd
    if (fromDir === "." || fromDir === "") {
      rel = "./" + toFile;
    }
    return rel.replace(/\\/g, "/");
  }

  // fix href for index (fromDir .)
  function linkTo(toFile) {
    if (cur.file === "00-index.md") return `./${toFile}`;
    const rel = path.posix.relative(path.posix.dirname(cur.file), toFile);
    return (rel.startsWith(".") ? rel : "./" + rel).replace(/\\/g, "/");
  }

  const parts = ["---", "", MARK_START];
  if (prev) parts.push(`← 上一章：[${prev.label}](${linkTo(prev.file)})`);
  parts.push(`· [回书稿索引](${linkTo("00-index.md")})`);
  if (next) parts.push(`→ 下一章：[${next.label}](${linkTo(next.file)})`);
  parts.push(MARK_END, "");
  const nav = parts.join("\n");

  const fp = path.join(root, cur.file);
  let text = fs.readFileSync(fp, "utf8");
  if (text.includes(MARK_START)) {
    text = text.replace(new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}\\n?`), "");
  }
  text = text.replace(/\s*$/, "\n\n") + nav;
  fs.writeFileSync(fp, text, "utf8");
}
console.log("nav done");

// 4) rewrite 00-index.md completely with new paths
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

| 卷 | 目录 | 导读 |
|----|------|------|
| 卷一·发明权限 | \`vol1-invent/\` | [导读](./vol1-invent/00-overview.md) |
| 卷二·网上的身份 | \`vol2-identity/\` | [导读](./vol2-identity/00-overview.md) |
| 卷三·权利与 UAC | \`vol3-rights-uac/\` | [导读](./vol3-rights-uac/00-overview.md) |
| 卷四·不只是文件 | \`vol4-beyond-files/\` | [导读](./vol4-beyond-files/00-overview.md) |
| 卷五·排障与设计 | \`vol5-ops/\` | [导读](./vol5-ops/00-overview.md) |
| 卷六·用代码改权限 | \`vol6-dotnet/\` | [导读](./vol6-dotnet/00-overview.md) |
| 附录 | \`appendix/\` | [导读](./appendix/00-overview.md) |

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
| [NTLM 与协商](./vol2-identity/03-ntlm.md) | 待写 | |
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

建议从 [卷一导读](./vol1-invent/00-overview.md) 或 [第 0 站](./vol1-invent/01-no-permission.md) 开始。
`;

fs.writeFileSync(path.join(root, "00-index.md"), index, "utf8");
// re-apply nav on index only (nav loop already did — but we overwrote index). Re-run nav for index:
{
  const cur = navChapters[0];
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

console.log("done migrate");
