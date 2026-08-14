---
title: "参考（按主题）"
sidebarGroup: "附录"
shortTitle: "参考"
order: 5
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

# 参考（按主题）

### 身份 / SID / 翻译

- [Understand security principals](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)  
- [Understand security identifiers](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-identifiers)  
- [LookupAccountNameW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-lookupaccountnamew)  
- [LSA Lookup performance counters](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/lsa-lookup-performance-counters)  
- [Create a WindowsPrincipal](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-create-a-windowsprincipal-object)

### 登录 / LSA / 令牌

- [Windows logon scenarios](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-logon-scenarios)  
- [Credentials processes in Windows authentication](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)  
- [Windows Authentication Architecture - LSA](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/windows-authentication-architecture)  
- [LSA_AP_LOGON_USER](https://learn.microsoft.com/en-us/windows/win32/api/ntsecpkg/nc-ntsecpkg-lsa_ap_logon_user)  
- [whoami](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/whoami)  
- [How UAC works](https://learn.microsoft.com/en-us/windows/security/identity-protection/user-account-control/how-user-account-control-works)  
- [Key security concepts](https://learn.microsoft.com/en-us/dotnet/standard/security/key-security-concepts)（UAC 双令牌简述）  
- [Appendix B - Privileged accounts](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-b--privileged-accounts-and-groups-in-active-directory)（permissions vs rights；夺所有权）

### ACL / 继承 / 共享

- [icacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls)  
- [cacls](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cacls)  
- [SMB security overview](https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security)  
- [FileSystemAclExtensions](https://learn.microsoft.com/en-us/dotnet/api/system.io.filesystemaclextensions.setaccesscontrol)  
- .NET：`NTAccount` / `SecurityIdentifier` / `FileSystemAccessRule` / `InheritanceFlags` / `PropagationFlags`

### 域 / 目录 / 组

- [Understand security principals](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-principals)（域对象 vs 本机 SAM）  
- [Credentials processes - SAM](https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication)  
- [Install AD DS](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-active-directory-domain-services--level-100-) / [Install a new forest](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-a-new-windows-server-2012-active-directory-forest--level-200-)  
- [Join a computer to a domain](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/join-computer-to-domain) / [Core Network Guide](https://learn.microsoft.com/en-us/windows-server/networking/core-network-guide/core-network-guide)  
- [Object names and identities](https://learn.microsoft.com/en-us/windows/win32/ad/object-names-and-identities)（DN / GUID / SID 名）  
- [Understand security groups](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups)  
- [Securing Domain Admins](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/appendix-f--securing-domain-admins-groups-in-active-directory)  
- [New-ADGroup](https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-adgroup)

### Kerberos

- [Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)  
- [klist](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/klist)  
- [Default accounts - KRBTGT](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-default-user-accounts)

---

## 建议实验顺序

先 `whoami /all` → 再对本机文件看 Owner → 再对测试目录试三组继承标志 → 域环境再 `klist` → 最后对比两个共享路径。每一步只验证**当前讲**学会的概念。

回 [索引](../00-index.md) · [总图](./01-map.md)

---

---

---

<!-- chapter-nav:start -->
← 上一章：[实验室](./04-lab.md)
· [回书稿索引](../00-index.md)
<!-- chapter-nav:end -->
