---
title: "第 34 讲：Windows Hello 与无密码登录"
sidebarGroup: "卷七·安全防护"
shortTitle: "第 34 讲：Windows Hello"
order: 1
date: 2026-08-11
category: "Windows"
tag:
  - "Windows"
  - "安全"
  - "身份认证"
  - "Windows Hello"
  - "书稿"
---

# 第 34 讲：Windows Hello 与无密码登录

### 麻烦

公司群里一封通报：某同事账号被盗，攻击者拿他的身份登进了 OA、邮箱、甚至工资系统。事后复盘——密码没错在「复杂度」，错在它**是一串能被复制、被转发、被存在服务器上的字符**。

密码有三宗罪：

- **钓鱼**：假登录页骗你输一遍，密码就被搬走了；
- **撞库**：你在小网站用的密码泄露，攻击者拿去试大网站；
- **服务器端泄露**：哪怕你从不被骗，服务方的密码库被拖库，hash 被离线爆破。

共同病根：密码是「**你知道的**」——而你知道的东西，别人也能知道。

### 这一讲只发明：把「你知道的」换成「你拥有 + 你是谁」

Windows Hello 的核心，是把登录凭证从「一个字符串」换成「一把锁在设备里的非对称私钥」：

- 你**拥有**：这台设备（私钥绑死在它的 TPM 芯片里，拷不走）；
- 你**是谁 / 你知道**：你的人脸、指纹，或一个只在本机有效的 PIN。

认证时，设备用私钥签个名，服务器用对应公钥验签。**私钥永远不出 TPM**，哪怕全盘被恶意软件翻一遍也拿不走。

来源：[Windows Hello for Business](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/)

### 先澄清一个常见误解：PIN 不是密码

很多人觉得「用 PIN 代替密码，不还是一串数字？」——区别在 **PIN 只在本机有效，且只用来解锁本机的私钥**：

| | 密码 | Hello PIN |
|---|------|-----------|
| 存在哪 | 服务器（ hash 后） | 只在你这台机器 |
| 传输 | 登录时传到服务器比对 | **从不离开本机** |
| 服务器知道吗 | 知道 | 不知道 |
| 拿到就能登？ | 在任意机器上都能试 | 没有你**这台机器**就没用 |

所以别人就算知道了你的 PIN，没有你**这台设备**也登不进去。

### Hello for Business：域里为什么也不怕 mimikatz

第 4 讲讲过，LSA 是存凭据的保险箱，mimikatz 一抓一堆。Hello for Business 把域登录也改成「设备里的非对称密钥」：

- 你不再有「域密码」可以被抓；
- 域控 / Entra ID 上只存**公钥**，被抓了也没用（公钥本来就该公开）；
- 私钥封在 TPM 里，下一讲的 Credential Guard 再给它加一层隔离。

来源：[Hello for Business 身份验证](https://learn.microsoft.com/en-us/windows/security/identity-protection/hello-for-business/authentication/)

### Passkeys / FIDO2：把这套思路搬到全网

Hello 解决的是「登录 Windows」。Passkeys（通行密钥，基于 FIDO2 / WebAuthn 标准）解决的是「登录一切网站」。

逻辑和 Hello 一模一样：每个网站给你一对非对称密钥，私钥存你设备，网站只存公钥。钓鱼页骗不到私钥（私钥只会在**真实域名**下解锁），拖库拖到的也只是公钥。

在 Windows 上，**Windows Hello 就是 Passkey 的存储与验证器之一**——你用指纹解锁某个网站时，背后正是 Hello。

来源：[Passkeys（FIDO 联盟）](https://fidoalliance.org/passkeys/)

### 回到令牌：Hello 只换了「开门的方式」

这是和第 5 讲最关键的衔接点：

> Hello 验证你（生物特征 / PIN 解锁私钥）通过后，**LSA 照样创建一个 Access Token**，挂到你的进程上——和用密码登录产出的令牌**没有任何区别**。

换句话说，Hello 改造的是第 4 讲的「认证」那一步；门后的世界（令牌 → DACL → 访问检查）原封不动。你用指纹登录后跑 `whoami /all`，看到的 SID、组、权利，和密码登录一模一样。

口诀：

> **密码是「你知道的」，Hello 是「设备持有 + 你本人解锁」。**  
> **Hello 只换了开门的方式，门后还是那套令牌。**

### 怎么看见

**界面**：设置 → 账户 → 登录选项 → Windows Hello（人脸 / 指纹 / PIN）。

**命令**——看本机 Hello（NGC）状态：

```bat
dsregcmd /status | findstr /i "Ngc"
```

输出关键字段：

```
NgcSet            : YES        ← 已设置 Windows Hello（NO = 没设）
NgcUserGroupSid   : S-1-...    ← 允许使用 Hello 的用户组
```

（`Ngc` = Next Generation Credentials，Windows Hello 的内部代号。）

**看本机存的 Passkey**：Win11 22H2+ 在「设置 → 账户 → Passkey 设置」能列出所有通行密钥并删除。

来源：[dsregcmd](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/dsregcmd)

### 收束

**你现在会了：** 密码为什么防不住（三宗罪），Hello 怎么用「设备 + 生物特征 / PIN」替代密码，以及它和 Passkey、和第 5 讲令牌的关系。  
**下一讲才需要：** 既然密码被换掉了，那以前藏在 LSASS 里**还没换掉**的那些凭据怎么办——这就是 Credential Guard 要解决的事。

---

---

---

---

<!-- chapter-nav:start -->
← 上一章：[第 33 讲：.NET 模拟](../vol6-dotnet/03-impersonation.md)
· [回书稿索引](../00-index.md)
→ 下一章：[第 35 讲：Credential Guard](./02-credential-guard.md)
<!-- chapter-nav:end -->
