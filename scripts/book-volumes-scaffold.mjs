/**
 * 按书稿六卷+附录：写入 overview/stub、更新已有章 order、重建章末导航与索引。
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/Windows/permissions");

const FM = (title, shortTitle, order, extraTags = []) => `---
title: "${title}"
sidebarGroup: "权限"
shortTitle: "${shortTitle}"
order: ${order}
date: 2026-08-06
category: "Windows"
tag:
  - "Windows"
  - "ACL"
  - "权限"
  - "书稿"
${extraTags.map((t) => `  - "${t}"`).join("\n")}${extraTags.length ? "\n" : ""}---
`;

function stubBody({ volume, title, purpose, outline, depends }) {
  return `
# ${title}

> **状态：待写**（占位章）  
> **分卷：${volume}**  
> 成文时须遵守：案例引入 + 西蒙讲述（见仓库写作规范）。

## 这一章打算讲什么

${purpose}

## 计划大纲（写作时按此展开）

${outline.map((x, i) => `${i + 1}. ${x}`).join("\n")}

## 依赖与衔接

${depends}

## 验收标准（写完后自检）

- 有一条完整故事弧，而不是名词清单  
- 读者能回答「这一章只发明了什么」  
- 有「怎么看见」（命令 / 界面 / 最小实验）  
- 索引里的一句话简介已同步更新  
`;
}

function overviewBody({ volume, title, goal, chapters }) {
  return `
# ${title}

> **分卷导读**  
> ${goal}

## 本卷章节

| 章 | 状态 | 说明 |
|----|------|------|
${chapters.map((c) => `| [${c.label}](./${c.file}) | ${c.status} | ${c.blurb} |`).join("\n")}

读完本卷，应能用自己的话串起本卷主题；细节进各章。
`;
}

/** @type {{ file: string, label: string, order: number, kind: 'index'|'overview'|'existing'|'stub', title?: string, shortTitle?: string, volume?: string, purpose?: string, outline?: string[], depends?: string, goal?: string, chapters?: object[], status?: string, blurb?: string }[]} */
const book = [
  { file: "00-index.md", label: "书稿索引", order: 0, kind: "index" },

  // —— 卷一 ——
  {
    file: "v1-00-overview.md",
    label: "卷一导读",
    order: 1,
    kind: "overview",
    title: "卷一·发明权限（导读）",
    shortTitle: "卷一·导读",
    volume: "卷一·发明权限",
    goal: "从「没有权限」推到账户、令牌、ACL、继承、有效权限与审计——在单机对象上把授权模型发明完整。",
    chapters: [
      { file: "01-no-permission.md", label: "第 0 站", status: "已有", blurb: "为何需要权限" },
      { file: "02-account.md", label: "第 1 站", status: "已有", blurb: "账户" },
      { file: "03-sid.md", label: "第 2 站", status: "已有", blurb: "SID" },
      { file: "04-name-sid-lsa.md", label: "第 3 站", status: "已有", blurb: "名字↔SID" },
      { file: "05-logon-lsa.md", label: "第 4 站", status: "已有", blurb: "登录与 LSA" },
      { file: "06-access-token.md", label: "第 5 站", status: "已有", blurb: "Access Token" },
      { file: "07-owner.md", label: "第 6 站", status: "已有", blurb: "Owner" },
      { file: "08-permission-bits.md", label: "第 7 站", status: "已有·待加厚", blurb: "权限位" },
      { file: "09-groups.md", label: "第 8 站", status: "已有·待加厚", blurb: "组" },
      { file: "10-ace-dacl.md", label: "第 9 站", status: "已有", blurb: "ACE / DACL" },
      { file: "11-access-check.md", label: "第 10 站", status: "已有", blurb: "访问检查与共享两道门" },
      { file: "12-security-descriptor.md", label: "第 11 站", status: "已有·待加厚", blurb: "安全描述符" },
      { file: "13-inheritance.md", label: "第 12 站", status: "已有", blurb: "继承" },
      { file: "14-effective-permissions.md", label: "第 13 站", status: "已有", blurb: "有效权限" },
      { file: "15-sacl.md", label: "第 14 站", status: "已有·待加厚", blurb: "SACL" },
    ],
  },
  { file: "01-no-permission.md", label: "第 0 站：没有权限", order: 2, kind: "existing" },
  { file: "02-account.md", label: "第 1 站：账户", order: 3, kind: "existing" },
  { file: "03-sid.md", label: "第 2 站：SID", order: 4, kind: "existing" },
  { file: "04-name-sid-lsa.md", label: "第 3 站：名字 ↔ SID", order: 5, kind: "existing" },
  { file: "05-logon-lsa.md", label: "第 4 站：登录与 LSA", order: 6, kind: "existing" },
  { file: "06-access-token.md", label: "第 5 站：Access Token", order: 7, kind: "existing" },
  { file: "07-owner.md", label: "第 6 站：Owner", order: 8, kind: "existing" },
  { file: "08-permission-bits.md", label: "第 7 站：权限位", order: 9, kind: "existing" },
  { file: "09-groups.md", label: "第 8 站：组", order: 10, kind: "existing" },
  { file: "10-ace-dacl.md", label: "第 9 站：ACE 与 DACL", order: 11, kind: "existing" },
  { file: "11-access-check.md", label: "第 10 站：访问检查", order: 12, kind: "existing" },
  { file: "12-security-descriptor.md", label: "第 11 站：安全描述符", order: 13, kind: "existing" },
  { file: "13-inheritance.md", label: "第 12 站：继承", order: 14, kind: "existing" },
  { file: "14-effective-permissions.md", label: "第 13 站：有效权限", order: 15, kind: "existing" },
  { file: "15-sacl.md", label: "第 14 站：SACL", order: 16, kind: "existing" },

  // —— 卷二 ——
  {
    file: "v2-00-overview.md",
    label: "卷二导读",
    order: 20,
    kind: "overview",
    title: "卷二·网上的身份（导读）",
    shortTitle: "卷二·导读",
    volume: "卷二·网上的身份",
    goal: "多机之后：域与域控、Kerberos，并补上 NTLM、登录类型、SPN——讲清「网上如何证明我是谁」。",
    chapters: [
      { file: "16-domain-dc.md", label: "第 15 站", status: "已有", blurb: "域与域控" },
      { file: "17-kerberos.md", label: "第 16 站", status: "已有", blurb: "Kerberos" },
      { file: "v2-ntlm.md", label: "NTLM 与协商", status: "待写", blurb: "何时不用/掉到 NTLM" },
      { file: "v2-logon-types.md", label: "登录类型", status: "待写", blurb: "Interactive/Network/…" },
      { file: "v2-spn.md", label: "SPN 与计算机账户", status: "待写", blurb: "服务如何被票认到" },
    ],
  },
  { file: "16-domain-dc.md", label: "第 15 站：域与域控", order: 21, kind: "existing" },
  { file: "17-kerberos.md", label: "第 16 站：Kerberos", order: 22, kind: "existing" },
  {
    file: "v2-ntlm.md",
    label: "NTLM 与协商",
    order: 23,
    kind: "stub",
    title: "卷二·NTLM 与协商（Negotiate）",
    shortTitle: "NTLM 与协商",
    volume: "卷二·网上的身份",
    purpose: "用案例说明：为何有时不是纯 Kerberos；NTLM 与 Negotiate 各解决什么麻烦；读者如何用现象判断「掉级」。",
    outline: [
      "小王只会 klist，却遇到仍要输口令 / 事件里出现 NTLM 的困惑",
      "发明：多种认证协议并存，系统常「协商」选用",
      "对照 Kerberos 章：票据 vs 挑战响应（人话级，不写攻击）",
      "怎么看见：安全事件 / 连接失败时的排查直觉",
    ],
    depends: "先读 [第 16 站 Kerberos](./17-kerberos.md)、[第 15 站域](./16-domain-dc.md)。",
  },
  {
    file: "v2-logon-types.md",
    label: "登录类型",
    order: 24,
    kind: "stub",
    title: "卷二·登录类型（Logon Type）",
    shortTitle: "登录类型",
    volume: "卷二·网上的身份",
    purpose: "讲清同一个人「坐在屏幕前 / 访问共享 / 跑计划任务 / 跑服务」得到的会话与令牌约束为何不同。",
    outline: [
      "案例：共享能访问，但同一账户跑服务失败（或相反）",
      "发明：登录类型影响令牌与可用权利",
      "常见类型对照表（Interactive / Network / Batch / Service 等）",
      "怎么看见：事件日志中的登录类型字段",
    ],
    depends: "衔接 [第 4 站登录](./05-logon-lsa.md)、[第 5 站令牌](./06-access-token.md)、[第 10 站网络访问](./11-access-check.md)。",
  },
  {
    file: "v2-spn.md",
    label: "SPN 与计算机账户",
    order: 25,
    kind: "stub",
    title: "卷二·SPN 与计算机账户",
    shortTitle: "SPN",
    volume: "卷二·网上的身份",
    purpose: "说明 Kerberos 服务票要「认到哪个服务」：SPN、机器账户与常见错配现象（人话 + 怎么查）。",
    outline: [
      "案例：双击共享正常，某应用报「无法获得票据 / 找不到服务」",
      "发明：服务需要可被引用的名字（SPN）",
      "计算机账户在域里的角色（点到为止）",
      "怎么看见：setspn 查询类命令 / 事件线索（不写利用）",
    ],
    depends: "先读 [Kerberos](./17-kerberos.md)。",
  },

  // —— 卷三 ——
  {
    file: "v3-00-overview.md",
    label: "卷三导读",
    order: 30,
    kind: "overview",
    title: "卷三·权利、UAC、特权账户（导读）",
    shortTitle: "卷三·导读",
    volume: "卷三·权利、UAC、特权账户",
    goal: "对象权限之外：用户权利、UAC 双令牌；并补上 GPO 权利分配与 AdminSDHolder 等特权账户现实。",
    chapters: [
      { file: "18-rights-uac.md", label: "权利与 UAC（合章）", status: "已有·待拆", blurb: "当前合订本" },
      { file: "v3-user-rights.md", label: "用户权利", status: "待写", blurb: "从合章拆出并加深" },
      { file: "v3-uac.md", label: "UAC 专章", status: "待写", blurb: "从合章拆出并加深" },
      { file: "v3-gpo-rights.md", label: "GPO 权利分配", status: "待写", blurb: "权利从哪配" },
      { file: "v3-adminsdholder.md", label: "AdminSDHolder", status: "待写", blurb: "保护组 ACL 回滚" },
    ],
  },
  { file: "18-rights-uac.md", label: "第 17 站：权利与 UAC", order: 31, kind: "existing" },
  {
    file: "v3-user-rights.md",
    label: "用户权利专章",
    order: 32,
    kind: "stub",
    title: "卷三·用户权利（Privileges）专章",
    shortTitle: "用户权利专章",
    volume: "卷三·权利、UAC、特权账户",
    purpose: "从现有 [权利与 UAC 合章](./18-rights-uac.md) 故事一拆出独立成章：对象权限 ≠ 用户权利；备份等案例加深；`whoami /priv`。",
    outline: [
      "保留并打磨「Deny 仍能备份」故事弧",
      "权利进令牌的路径（策略 → 登录）",
      "与 ACE 对照表；明确不写绕过利用步骤",
    ],
    depends: "素材见 [18-rights-uac.md](./18-rights-uac.md)；拆完后合章可改为导读或删除重复。",
  },
  {
    file: "v3-uac.md",
    label: "UAC 专章",
    order: 33,
    kind: "stub",
    title: "卷三·UAC 专章",
    shortTitle: "UAC 专章",
    volume: "卷三·权利、UAC、特权账户",
    purpose: "从合章故事二拆出：UAC 能做什么、双令牌、强制标签诊断、hosts 误判案例。",
    outline: [
      "UAC 定位与能力边界",
      "标准令牌 vs 管理员令牌",
      "两窗 whoami 相同的排障故事",
    ],
    depends: "素材见 [18-rights-uac.md](./18-rights-uac.md)。",
  },
  {
    file: "v3-gpo-rights.md",
    label: "GPO 权利分配",
    order: 34,
    kind: "stub",
    title: "卷三·用 GPO 分配用户权利",
    shortTitle: "GPO 权利分配",
    volume: "卷三·权利、UAC、特权账户",
    purpose: "回答「权利在哪配置」：本地安全策略 vs 域 GPO 的用户权利分配；小王如何给备份账户授 SeBackup 类权利（概念+界面路径）。",
    outline: [
      "案例：知道要有备份权利，却找不到该勾哪里",
      "发明：权利来自策略，不是来自文件夹安全页",
      "本机 secpol vs 域 GPO 路径",
      "生效与重新登录的关系",
    ],
    depends: "先有用户权利概念（合章或专章）。",
  },
  {
    file: "v3-adminsdholder.md",
    label: "AdminSDHolder",
    order: 35,
    kind: "stub",
    title: "卷三·AdminSDHolder 与保护组",
    shortTitle: "AdminSDHolder",
    volume: "卷三·权利、UAC、特权账户",
    purpose: "案例：改完 Domain Admins 相关对象 ACL，过一会儿又变回去——引出 AdminSDHolder / SDProp 在保护特权组。",
    outline: [
      "小王改 ACL「不生效/被还原」的现场",
      "发明：特权组由特殊模板保护",
      "和日常文件 ACL 运维的差别（该找谁、不该硬刚）",
      "不写攻击利用，只建立正确地图",
    ],
    depends: "先读 [域与域控](./16-domain-dc.md)、特权账户相关 Learn 附录。",
  },

  // —— 卷四 ——
  {
    file: "v4-00-overview.md",
    label: "卷四导读",
    order: 40,
    kind: "overview",
    title: "卷四·不只是文件（导读）",
    shortTitle: "卷四·导读",
    volume: "卷四·不只是文件",
    goal: "同一套安全描述符模型，换到注册表、服务、AD 对象委派——证明「权限」不绑死在 NTFS 上。",
    chapters: [
      { file: "v4-registry.md", label: "注册表 ACL", status: "待写", blurb: "regedit 安全页" },
      { file: "v4-services.md", label: "服务权限", status: "待写", blurb: "服务账户与 SCM" },
      { file: "v4-ad-delegation.md", label: "AD 委派", status: "待写", blurb: "OU 上谁能改用户" },
    ],
  },
  {
    file: "v4-registry.md",
    label: "注册表 ACL",
    order: 41,
    kind: "stub",
    title: "卷四·注册表上的 ACL",
    shortTitle: "注册表 ACL",
    volume: "卷四·不只是文件",
    purpose: "用「装软件改不了某键 / 策略键拒绝」案例，把 DACL 模型迁到注册表。",
    outline: ["对照文件 ACE", "regedit 权限页", "继承在注册表上的直觉", "最小观察命令/界面"],
    depends: "卷一 ACE/继承；不要求读者先成注册表专家。",
  },
  {
    file: "v4-services.md",
    label: "服务权限",
    order: 42,
    kind: "stub",
    title: "卷四·服务与服务账户权限",
    shortTitle: "服务权限",
    volume: "卷四·不只是文件",
    purpose: "案例：服务用某账户跑起来却读不了目录/注册表——分清「服务登录权利」与「对象 ACL」。",
    outline: ["服务身份从哪来", "对服务对象本身的权限（点到为止）", "和文件/注册表 ACL 联查"],
    depends: "卷三权利；卷一令牌。",
  },
  {
    file: "v4-ad-delegation.md",
    label: "AD 委派",
    order: 43,
    kind: "stub",
    title: "卷四·AD 对象权限与委派",
    shortTitle: "AD 委派",
    volume: "卷四·不只是文件",
    purpose: "案例：帮桌面人员「只能重置某 OU 密码」——AD 对象上也有 ACE，委派向导在做什么。",
    outline: ["AD 对象 ≠ 文件，但 SD 模型同类", "委派向导与手工 ACE 的关系", "常见委派场景与误授风险（概念）"],
    depends: "[域与域控](./16-domain-dc.md)。",
  },

  // —— 卷五 ——
  {
    file: "v5-00-overview.md",
    label: "卷五导读",
    order: 50,
    kind: "overview",
    title: "卷五·排障与设计模式（导读）",
    shortTitle: "卷五·导读",
    volume: "卷五·排障与设计模式",
    goal: "从「会概念」到「会干活」：共享设计取舍、有效权限实战、症状→检查清单案例集。",
    chapters: [
      { file: "v5-share-design.md", label: "共享设计", status: "待写", blurb: "共享∩NTFS 怎么配" },
      { file: "v5-effective-access-practice.md", label: "有效权限实战", status: "待写", blurb: "验收套路" },
      { file: "v5-troubleshooting-cases.md", label: "排障案例集", status: "待写", blurb: "症状导航" },
    ],
  },
  {
    file: "v5-share-design.md",
    label: "共享设计",
    order: 51,
    kind: "stub",
    title: "卷五·共享权限设计模式",
    shortTitle: "共享设计",
    volume: "卷五·排障与设计模式",
    purpose: "在第 10 站「两道门」之上，讨论常见配法（如共享放宽、NTFS 收紧）的利弊与适用场景。",
    outline: ["领导要的「大家只读、少数可改」如何落两道门", "反模式（两道门都乱加）", "验收清单"],
    depends: "[访问检查](./11-access-check.md)。",
  },
  {
    file: "v5-effective-access-practice.md",
    label: "有效权限实战",
    order: 52,
    kind: "stub",
    title: "卷五·有效权限实战",
    shortTitle: "有效权限实战",
    volume: "卷五·排障与设计模式",
    purpose: "把第 13 站验收习惯扩成可重复的实战流程：改权限 → 有效访问 → 真人试开 → UNC 再验。",
    outline: ["标准作业流程", "和 icacls 对照的记录表", "与排障案例集交叉引用"],
    depends: "[有效权限](./14-effective-permissions.md)。",
  },
  {
    file: "v5-troubleshooting-cases.md",
    label: "排障案例集",
    order: 53,
    kind: "stub",
    title: "卷五·排障案例集",
    shortTitle: "排障案例集",
    volume: "卷五·排障与设计模式",
    purpose: "按症状组织：本机能开 UNC 不能、有效访问说能却拒绝、继承切断后新文件怪、进组不生效、两窗 whoami 相同等。",
    outline: ["每案：现象 → 先查什么 → 关联哪一卷哪一章", "禁止写成攻击手册"],
    depends: "卷一～卷三核心章。",
  },

  // —— 卷六 ——
  {
    file: "v6-00-overview.md",
    label: "卷六导读",
    order: 60,
    kind: "overview",
    title: "卷六·用代码改权限（导读）",
    shortTitle: "卷六·导读",
    volume: "卷六·用代码改权限",
    goal: "给开发者：用 .NET 读身份、改文件 ACL、理解模拟——把前几卷模型落到代码。",
    chapters: [
      { file: "v6-dotnet-identity.md", label: "身份 API", status: "待写", blurb: "WindowsIdentity 等" },
      { file: "v6-dotnet-acl.md", label: "改 ACL", status: "待写", blurb: "FileSystemAccessRule" },
      { file: "v6-dotnet-impersonation.md", label: "模拟", status: "待写", blurb: "Impersonation" },
    ],
  },
  {
    file: "v6-dotnet-identity.md",
    label: ".NET 身份",
    order: 61,
    kind: "stub",
    title: "卷六·.NET 里的 Windows 身份",
    shortTitle: ".NET 身份",
    volume: "卷六·用代码改权限",
    purpose: "用最小 C# 示例看见当前用户/组：WindowsIdentity / WindowsPrincipal，对应第 5 站令牌直觉。",
    outline: ["读当前身份", "IsInRole", "和 whoami 对照"],
    depends: "卷一令牌；官方 Learn/.NET 文档。",
  },
  {
    file: "v6-dotnet-acl.md",
    label: ".NET 改 ACL",
    order: 62,
    kind: "stub",
    title: "卷六·用 .NET 读写文件 ACL",
    shortTitle: ".NET 改 ACL",
    volume: "卷六·用代码改权限",
    purpose: "GetAccessControl / FileSystemAccessRule / InheritanceFlags·PropagationFlags 与第 12 站标志对齐。",
    outline: ["读 ACL", "加一条 ACE", "继承标志怎么传", "和 icacls 互证"],
    depends: "卷一 ACE/继承。",
  },
  {
    file: "v6-dotnet-impersonation.md",
    label: ".NET 模拟",
    order: 63,
    kind: "stub",
    title: "卷六·模拟（Impersonation）入门",
    shortTitle: ".NET 模拟",
    volume: "卷六·用代码改权限",
    purpose: "案例：服务需要「临时变成用户」去碰文件——模拟与令牌的关系；边界与风险（概念级）。",
    outline: ["为何需要模拟", "和登录类型/委托的边界（点到为止）", "最小代码路径"],
    depends: "令牌；卷二登录类型（若已写）。",
  },

  // —— 附录 ——
  {
    file: "a-00-overview.md",
    label: "附录导读",
    order: 70,
    kind: "overview",
    title: "附录（导读）",
    shortTitle: "附录·导读",
    volume: "附录",
    goal: "总图、SDDL、事件 ID、实验室与参考链接——查阅用，不替代正文故事。",
    chapters: [
      { file: "19-map.md", label: "总图", status: "已有·待升级", blurb: "串线" },
      { file: "a-sddl.md", label: "SDDL", status: "待写", blurb: "字串形式的 SD" },
      { file: "a-event-ids.md", label: "事件 ID", status: "待写", blurb: "登录/对象访问" },
      { file: "a-lab.md", label: "实验室", status: "待写", blurb: "最小实验环境" },
      { file: "20-references.md", label: "参考", status: "已有·待升级", blurb: "Learn 链接" },
    ],
  },
  { file: "19-map.md", label: "总图", order: 71, kind: "existing" },
  {
    file: "a-sddl.md",
    label: "SDDL",
    order: 72,
    kind: "stub",
    title: "附录·SDDL 速查",
    shortTitle: "SDDL",
    volume: "附录",
    purpose: "安全描述符的字符串写法：能读懂常见 SDDL 片段，并与 icacls/GUI 对照；不当主教材。",
    outline: ["一段 SDDL 拆开看", "常见 ACE 字母", "何时需要它"],
    depends: "[安全描述符](./12-security-descriptor.md)。",
  },
  {
    file: "a-event-ids.md",
    label: "事件 ID",
    order: 73,
    kind: "stub",
    title: "附录·常用安全事件 ID",
    shortTitle: "事件 ID",
    volume: "附录",
    purpose: "登录成功/失败、对象访问审核等常用事件 ID 速查，服务 SACL 与排障章。",
    outline: ["登录相关", "对象访问相关", "和审核策略的关系"],
    depends: "[SACL](./15-sacl.md)。",
  },
  {
    file: "a-lab.md",
    label: "实验室",
    order: 74,
    kind: "stub",
    title: "附录·实验室搭建清单",
    shortTitle: "实验室",
    volume: "附录",
    purpose: "一页清单：本机沙箱目录、可选最小域实验、建议账号与分享路径，供全书实验复用。",
    outline: ["本机 Lab 目录约定", "可选 DC 实验", "安全注意（勿用生产）"],
    depends: "全书。",
  },
  { file: "20-references.md", label: "参考", order: 75, kind: "existing" },
];

function setOrderInFile(file, order) {
  const p = path.join(root, file);
  let text = fs.readFileSync(p, "utf8");
  if (!/^---\r?\n/.test(text)) throw new Error(`no fm: ${file}`);
  if (/^order:/m.test(text)) {
    text = text.replace(/^order:\s*.*$/m, `order: ${order}`);
  } else {
    text = text.replace(/^sidebarGroup:.*$/m, (m) => `${m}\norder: ${order}`);
  }
  fs.writeFileSync(p, text, "utf8");
}

function writeNav() {
  const MARK_START = "<!-- chapter-nav:start -->";
  const MARK_END = "<!-- chapter-nav:end -->";
  const chapters = book.map((b) => ({ file: b.file, label: b.label }));
  for (let i = 0; i < chapters.length; i++) {
    const cur = chapters[i];
    const prev = i > 0 ? chapters[i - 1] : null;
    const next = i + 1 < chapters.length ? chapters[i + 1] : null;
    const parts = ["---", "", MARK_START];
    if (prev) parts.push(`← 上一章：[${prev.label}](./${prev.file})`);
    parts.push(`· [回书稿索引](./00-index.md)`);
    if (next) parts.push(`→ 下一章：[${next.label}](./${next.file})`);
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
}

const indexBody = `---
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

本页是**整本书的导航**。已有正文直接读；标「待写」的是占位章，只说明计划写什么。

## 分卷一览

| 卷 | 导读 | 内容 |
|----|------|------|
| 卷一·发明权限 | [导读](./v1-00-overview.md) | 现第 0～14 站（部分待加厚） |
| 卷二·网上的身份 | [导读](./v2-00-overview.md) | 现第 15～16 站 + NTLM / 登录类型 / SPN（待写） |
| 卷三·权利、UAC、特权账户 | [导读](./v3-00-overview.md) | 现合章待拆 + GPO 权利 / AdminSDHolder（待写） |
| 卷四·不只是文件 | [导读](./v4-00-overview.md) | 注册表 / 服务 / AD 委派（待写） |
| 卷五·排障与设计模式 | [导读](./v5-00-overview.md) | 共享设计 / 有效权限实战 / 案例集（待写） |
| 卷六·用代码改权限 | [导读](./v6-00-overview.md) | .NET 身份 / ACL / 模拟（待写） |
| 附录 | [导读](./a-00-overview.md) | 总图 / SDDL / 事件 ID / 实验室 / 参考 |

## 卷一·发明权限

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [第 0 站](./01-no-permission.md) | 已有 | 为什么需要后面这些发明 |
| [第 1 站](./02-account.md) | 已有 | 系统如何认出「人」 |
| [第 2 站](./03-sid.md) | 已有 | 机器真正认的稳定身份证号 |
| [第 3 站](./04-name-sid-lsa.md) | 已有 | LSA 去哪里查、怎么翻译 |
| [第 4 站](./05-logon-lsa.md) | 已有 | 谁验密码、登录过程怎样 |
| [第 5 站](./06-access-token.md) | 已有 | 登录成功后挂到进程上的通行证 |
| [第 6 站](./07-owner.md) | 已有 | 对象上的「主人」字段 |
| [第 7 站](./08-permission-bits.md) | 已有·待加厚 | 读 / 写 / 完全控制等操作粒度 |
| [第 8 站](./09-groups.md) | 已有·待加厚 | 人太多时如何打包身份 |
| [第 9 站](./10-ace-dacl.md) | 已有 | 门上的规则列表怎么写 |
| [第 10 站](./11-access-check.md) | 已有 | 令牌如何对上规则；共享∩NTFS |
| [第 11 站](./12-security-descriptor.md) | 已有·待加厚 | Owner + DACL（及 SACL 槽位） |
| [第 12 站](./13-inheritance.md) | 已有 | 从最小实验发明 OI/CI/IO/NP |
| [第 13 站](./14-effective-permissions.md) | 已有 | 用有效访问验收「某人最终怎样」 |
| [第 14 站](./15-sacl.md) | 已有·待加厚 | 审计：碰了记不记 |

## 卷二·网上的身份

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [第 15 站](./16-domain-dc.md) | 已有 | 域与域控 |
| [第 16 站](./17-kerberos.md) | 已有 | Kerberos 票据 |
| [NTLM 与协商](./v2-ntlm.md) | 待写 | 非纯 Kerberos 时发生了什么 |
| [登录类型](./v2-logon-types.md) | 待写 | Interactive / Network / Batch / Service… |
| [SPN](./v2-spn.md) | 待写 | 服务如何被票认到 |

## 卷三·权利、UAC、特权账户

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [权利与 UAC（合章）](./18-rights-uac.md) | 已有·待拆 | 当前合订；将拆成下列专章 |
| [用户权利专章](./v3-user-rights.md) | 待写 | 对象权限 ≠ 用户权利 |
| [UAC 专章](./v3-uac.md) | 待写 | 双令牌与诊断 |
| [GPO 权利分配](./v3-gpo-rights.md) | 待写 | 权利从哪配置 |
| [AdminSDHolder](./v3-adminsdholder.md) | 待写 | 保护组 ACL 为何被还原 |

## 卷四·不只是文件

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [注册表 ACL](./v4-registry.md) | 待写 | 同一套 SD，换到注册表 |
| [服务权限](./v4-services.md) | 待写 | 服务账户与对象 ACL |
| [AD 委派](./v4-ad-delegation.md) | 待写 | OU 上谁能改用户 |

## 卷五·排障与设计模式

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [共享设计](./v5-share-design.md) | 待写 | 两道门如何配 |
| [有效权限实战](./v5-effective-access-practice.md) | 待写 | 可重复验收流程 |
| [排障案例集](./v5-troubleshooting-cases.md) | 待写 | 按症状找原因 |

## 卷六·用代码改权限

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [.NET 身份](./v6-dotnet-identity.md) | 待写 | WindowsIdentity / Principal |
| [.NET 改 ACL](./v6-dotnet-acl.md) | 待写 | FileSystemAccessRule 与继承标志 |
| [.NET 模拟](./v6-dotnet-impersonation.md) | 待写 | Impersonation 入门 |

## 附录

| 章 | 状态 | 这一站干什么 |
|----|------|----------------|
| [总图](./19-map.md) | 已有·待升级 | 串回全链路（将纳入新卷节点） |
| [SDDL](./a-sddl.md) | 待写 | 字串形式的安全描述符 |
| [事件 ID](./a-event-ids.md) | 待写 | 登录与对象访问速查 |
| [实验室](./a-lab.md) | 待写 | 最小实验环境清单 |
| [参考](./20-references.md) | 已有·待升级 | Learn 链接与实验顺序 |

## 建议阅读顺序

1. 卷一按站读完（薄章可先跳过加厚，但 ACE / 继承 / 有效权限建议精读）  
2. 卷二域 + Kerberos；其余待写章有需要再盯  
3. 卷三先读合章，再等拆章 / GPO / AdminSDHolder  
4. 卷四～六、附录按职责选读  

下一章从 [卷一导读](./v1-00-overview.md) 或 [第 0 站](./01-no-permission.md) 开始。
`;

// —— main ——
fs.writeFileSync(path.join(root, "00-index.md"), indexBody, "utf8");
console.log("wrote 00-index.md");

for (const item of book) {
  if (item.kind === "index") continue;
  if (item.kind === "overview") {
    const body =
      FM(item.title, item.shortTitle, item.order) +
      overviewBody({
        volume: item.volume,
        title: item.title,
        goal: item.goal,
        chapters: item.chapters,
      });
    fs.writeFileSync(path.join(root, item.file), body, "utf8");
    console.log("overview", item.file);
    continue;
  }
  if (item.kind === "stub") {
    const body =
      FM(item.title, item.shortTitle, item.order) +
      stubBody({
        volume: item.volume,
        title: item.title,
        purpose: item.purpose,
        outline: item.outline,
        depends: item.depends,
      });
    fs.writeFileSync(path.join(root, item.file), body, "utf8");
    console.log("stub", item.file);
    continue;
  }
  if (item.kind === "existing") {
    setOrderInFile(item.file, item.order);
    console.log("order", item.file, item.order);
  }
}

writeNav();
console.log("nav done");
console.log("chapters:", book.length);
