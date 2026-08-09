---
title: "使用OAuth2时，如何存储和传输敏感信息，例如用户名和密码"
sidebarGroup: "SpringCloud"
shortTitle: "使用OAuth2时，如何存储和传输敏感信息，例如用户名和密码"
order: 541
date: 2026-01-19
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 在 OAuth2 体系下，你怎么处理敏感信息（如用户名密码）的存储和传输？Fox版标准回答： “Look at me! 如果你还在纠结‘客户端怎么加密传输密码’，那你对 OAuth2 的理解就走偏"
article: false
---

> 来源：[使用OAuth2时，如何存储和传输敏感信息，例如用户名和密码](https://www.yuque.com/tulingzhouyu/db22bv/gu2sx82aq99rqpxq)

#### **一、 标准面试回答模版（建议背诵）**

**面试官：** 在 OAuth2 体系下，你怎么处理敏感信息（如用户名密码）的存储和传输？

**Fox版标准回答：** “**Look at me!** 如果你还在纠结‘客户端怎么加密传输密码’，那你对 OAuth2 的理解就走偏了。 OAuth2 的核心设计理念是 **‘让客户端（Client）永远不要接触用户的密码’**。

我对这个问题的回答分为三个层面：

1. **传输层面（Transmission）：**

- **HTTPS 是底线：** 所有的交互（重定向、Token 交换、API 调用）必须全链路强制使用 **HTTPS (TLS 1.2+)**。没有 HTTPS，任何加密手段在中间人攻击（MITM）面前都是裸奔。
- **拒绝 ROPC 模式：** 坚决废弃 ‘密码模式’（Resource Owner Password Credentials）。在这种模式下，客户端会接触到用户密码，这是极度不安全的。
- **推荐流程：** 必须使用 **授权码模式（Authorization Code）** 配合 **PKCE**（Proof Key for Code Exchange）。在这种模式下，输入密码的动作是在‘授权服务器’的页面上完成的，**客户端连密码的影子都看不到**。

1. **存储层面（Storage）：**

- **密码不存明文：** 在授权服务器（Auth Server）端，密码永远不能明文存储，也不能双向加密存储。必须使用 **加盐哈希算法**（如 **BCrypt**、**Argon2**）。
- **Token 不存敏感信息：** 很多人喜欢把用户的手机号、身份证直接塞进 JWT 的 Payload 里。**大错特错！** JWT 默认只是 Base64 编码（JWS），谁都能解开。如果非要存，必须使用 **JWE (JSON Web Encryption)** 进行加密。

1. **客户端防护（Client Side）：**

- **BFF 模式：** 在浏览器端（SPA/H5），尽量不要把 Access Token 存进 `LocalStorage`，容易被 XSS 攻击偷走。
- **最佳实践：** 采用 **BFF (Backend for Frontend)** 架构，Token 存在后端的 Session 中，前端只拿一个 `HttpOnly Cookie`。”

#### **二、 场景与代码层面的体现**

**1. 场景一：错误的传输方式（ROPC 密码模式 - 这是一个反例！）面试官潜台词：** 千万别说你在用这个模式，除非是自家内部受信任的极老旧系统。

**请求报文（危险）：**

```http
POST /oauth/token HTTP/1.1
Host: auth-server.com
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=fox&password=123456&client_id=app
```

- **Fox 点评：** “看到这个请求了吗？客户端直接持有了 `123456`。如果这个 Client 是一个第三方 App，你敢把银行卡密码输给它吗？这就叫**信任崩塌**。”

**2. 场景二：正确的存储方式（BCrypt 哈希）面试官潜台词：** 数据库里到底存的是什么？

```java
// Spring Security 示例
public class PasswordStorageDemo {
    public static void main(String[] args) {
        // 1. 强哈希算法 (带自适应 Salt)
        PasswordEncoder encoder = new BCryptPasswordEncoder(10); // strength=10

        String rawPassword = "my_secret_password";

        // 2. 存入数据库的是这个 hash
        String encodedPassword = encoder.encode(rawPassword);

        // 结果类似：$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZVzG3ADICo6pUC8LF6.2
        System.out.println("DB存储值: " + encodedPassword);

        // 3. 验证时（只能比对，无法还原）
        boolean isMatch = encoder.matches("my_secret_password", encodedPassword);
        System.out.println("密码正确? " + isMatch);
    }
}
```

#### **三、 Fox 的深度解析**

如果面试官追问：“**如果我的 Access Token 被黑客截获了，那岂不是和密码泄露一样？**”

**Fox版解析：** “**Listen carefully!** 这两者有本质区别，这就是为什么我们要用 OAuth2。

1. **时效性（Expiration）：** 密码是永久有效的（除非用户改密码）。 而 Access Token 是**短命**的（通常 30 分钟 - 2 小时）。黑客截获了 Token，能利用的窗口期很短。
2. **权限范围（Scope）：** 密码代表了‘上帝权限’。 而 Token 是**受限**的。我可以给这个 Token 只开通 `read:profile` 权限，就算丢了，黑客也只能看头像，不能转账（`write:transfer`）。
3. **撤销机制（Revocation）：** 密码泄露了，你要通知用户改密码，用户体验极差。 Token 泄露了，我作为管理员，在后台把这个 `client_id` 或 `user_id` 对应的 **Token 吊销**，或者让 **Refresh Token 失效**，攻击立刻停止。
4. **进阶大杀器 —— Token Rotation（令牌轮转）：** 为了极致安全，我们会在使用 Refresh Token 换取新 Access Token 时，**强制更换 Refresh Token**。 如果黑客偷了 Refresh Token 并在用户之前使用了它，当合法用户再来刷新时，服务器发现‘这个旧 Token 已经被用过了’，说明被盗了，直接**强制该用户下线**。这就是**侦测盗用的能力**。”

**总结：** “所以在 OAuth2 里，密码是‘核武器’，必须锁死在授权服务器的数据库里；而 Token 是‘临时通行证’，通过 HTTPS、BFF 和 轮转机制来降低风险。**这才是分布式安全的精髓。**”
