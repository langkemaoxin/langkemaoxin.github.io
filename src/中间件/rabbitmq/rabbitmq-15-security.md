---
title: "RabbitMQ 安全——认证、授权与 TLS"
sidebarGroup: "RabbitMQ"
shortTitle: "15 安全"
order: 15
date: 2026-09-10
category: "中间件"
tag:
  - "RabbitMQ"
  - "中间件"
  - "消息队列"
---

> **RabbitMQ 系列 · 第 15/22 篇**  
> 上一篇：[《网络与连接——心跳、连接恢复与排障》](/中间件/rabbitmq/rabbitmq-14-networking)  
> 下一篇预告：[《Virtual Hosts——隔离、权限与配额》](/中间件/rabbitmq/rabbitmq-16-virtual-hosts)

---

## 开头：默认装好的 RabbitMQ 有多「裸奔」

一个刚装好的 RabbitMQ 节点，自带一个 `guest/guest` 的超级用户、一个 `/` 的默认 vhost，4.x 还默认开了 `ANONYMOUS` 认证机制——如果直接暴露到公网，基本等于不设防。本篇把 RabbitMQ 的安全体系一次讲透：**谁能连（认证）**、**连上能干什么（授权）**、**链路怎么加密（TLS）**，最后给一份生产安全清单。

RabbitMQ 的安全设计有一条清晰的主线——**认证与授权是可插拔的两层**，可以按需替换后端（内置用户库、LDAP、OAuth2、x509 证书），组合使用。理解了这条主线，后面的配置就只是填参数。

---

## 一、AuthN vs AuthZ：先分清两个概念

这俩词长得很像，日常也常混着用，但在 RabbitMQ 里它们是**严格分开的两层**：

| 概念 | 全称 | 中文 | 回答的问题 | 举例 |
|------|------|------|-----------|------|
| **AuthN** | Authentication | 认证 | **你是谁？** | 用户名密码对不对、证书是否可信、JWT 签名是否有效 |
| **AuthZ** | Authorization | 授权 | **你能干什么？** | 能不能访问这个 vhost、能不能往这个 exchange 发消息 |

一句话：**认证验明正身，授权划定边界**。客户端连接 RabbitMQ 时，先过认证关（亮出凭证），认证通过后再按身份查权限（每个操作都要校验）。

RabbitMQ 把这两层都做成了**可插拔的后端（backend）**，你可以自由组合：比如用 LDAP 做认证、用内置库做授权，或者全部交给 OAuth2。这正是它安全体系灵活的地方。

---

## 二、内置用户库（Internal Backend）

### 2.1 默认的 guest 用户

节点首次启动（空数据库）时，RabbitMQ 会自动创建：

- 一个名为 `/` 的虚拟主机
- 一个 `guest` 用户，密码也是 `guest`，对 `/` 拥有全部权限

> **关键限制**：`guest` 用户**默认只能从本机（localhost / loopback）连接**，远程连接会被直接拒绝，日志里会看到：
>
> ```text
> PLAIN login refused: user 'guest' can only connect via localhost
> ```

这个限制由 `loopback_users` 配置项控制，默认只包含 `guest`。

> **危险操作**：官方反复强调，**千万不要**为了图省事把 `loopback_users` 设成 `none` 来放开 guest 的远程访问——这会让任何知道默认密码的人直接拿到超级权限。正确做法是**新建独立用户、删掉 guest 或至少改密码**。

### 2.2 创建用户与设置权限

一套完整的用户管理流程（`rabbitmqctl`）：

```bash
# 1. 创建用户（交互式输入密码，仅用于交互场景）
rabbitmqctl add_user "app-user"

# 2. 或直接带密码（注意 shell 转义：!、&、$、# 等需转义）
rabbitmqctl add_user "app-user" "2a55f70a841f18b97c3a7db939b7adc9e34a0f1b"

# 3. 授予 vhost 权限（三个正则分别是 configure / write / read）
rabbitmqctl set_permissions -p "custom-vhost" "app-user" ".*" ".*" ".*"

# 4. （可选）打标签，控制管理界面访问权限
rabbitmqctl set_user_tags "app-user" "management"

# 5. 列出所有用户
rabbitmqctl list_users

# 6. 删除用户（会同时关闭该用户的所有连接）
rabbitmqctl delete_user "app-user"
```

> **新建用户必须授权**：刚 `add_user` 出来的用户没有任何 vhost 权限，连接会被拒（`access to vhost '/' refused`）。别忘了 `set_permissions`。

### 2.3 密码哈希：别在命令行留明文

RabbitMQ 内部不存明文密码，而是存**加盐哈希**。你可以预先算好哈希再建用户，避免明文出现在命令行或脚本里：

```bash
# 生成加盐哈希
rabbitmqctl hash_password "my-secret-password"

# 用哈希建用户（--pre-hashed-password）
rabbitmqctl add_user --pre-hashed-password "app-user" "{上面输出的哈希值}"
```

> **Shell 转义提醒**：在命令行传密码时，`!`、`?`、`&`、`^`、`"`、`'`、`*`、`~` 等会被 shell 当控制字符。最安全的做法是用 40~100 位的**纯字母数字**密码，或通过标准输入传入，或干脆用预哈希。

### 2.4 用户标签与管理界面

除了 vhost 内的资源权限，用户还能挂**标签（tags）**，目前唯一作用是控制**管理插件（Management UI）**的访问级别：

| 标签 | 管理界面权限 |
|------|-------------|
| `management` | 能登录，看自己有权限的 vhost |
| `policymaker` | management + 能设 policy / 参数 |
| `monitoring` | 能看全局统计、所有 vhost |
| `administrator` | 能管理用户、vhost、权限（最高） |

> 标签**不影响消息收发权限**，只管管理界面。一个没有标签的用户照样能正常生产和消费——只是登不进管理 UI。

### 2.5 消息署名：user-id 属性与 impersonator 标签

发布消息时可以带 `user-id` 属性给消息「署名」，让消费端知道**是谁发的**。Broker 会**强制校验**：一旦设置了该属性，其值必须等于**当前连接的认证用户名**，否则拒绝发布——冒名消息发不进去（官方 [docs/validated-user-id](https://www.rabbitmq.com/docs/validated-user-id)）：

```java
AMQP.BasicProperties props = new AMQP.BasicProperties.Builder()
        .userId("admin")   // 只有连接用户就是 admin 时才发布得出去
        .build();
channel.basicPublish("amq.fanout", "", props, "test".getBytes());
```

- 不设 `user-id` 则完全不校验、发布者身份保持隐私；
- 确有「代理发布」需求（如网关替多个业务方发消息）时，给该用户挂 **`impersonator` 标签**即可豁免校验——注意 `administrator` 标签**不包含**此权限，默认任何用户都不能冒名；
- 认真使用此特性建议配合 TLS 连接（见第五节），否则署名可信但链路内容仍可被窥视。

---

## 三、权限模型详解

### 3.1 三类权限：configure / write / read

RabbitMQ 把对资源（exchange、queue）的操作分成三类，每类用一个**正则表达式**控制，匹配的是资源**名字**：

| 权限 | 含义 | 典型操作 |
|------|------|---------|
| **configure** | 创建 / 删除 / 修改资源 | `queue.declare`、`exchange.declare`、`queue.delete` |
| **write** | 往资源里**写**消息 | `basic.publish`（往 exchange 发）、`queue.bind`（绑定 queue） |
| **read** | 从资源里**读**消息 | `basic.get`、`basic.consume`、`queue.purge` |

权限是 **per-vhost** 的——同一个用户在不同 vhost 里可以有完全不同的权限三元组。设置方式：

```bash
# 格式：set_permissions [-p vhost] 用户  configure  write  read
rabbitmqctl set_permissions -p "orders" "app-user" "^orders\." "^orders\." "^orders\."
```

上面这条表示：在 `orders` 这个 vhost 里，用户 `app-user` 只能操作名字以 `orders.` 开头的资源。

### 3.2 权限矩阵：什么操作需要什么权限

这是官方权限矩阵的精简版，排查「为什么操作被拒」时直接对照：

| 操作 | configure | write | read |
|------|:---:|:---:|:---:|
| `exchange.declare`（建交换机） | exchange | | |
| `exchange.delete` | exchange | | |
| `queue.declare`（建队列） | queue | | |
| `queue.delete` | queue | | |
| `queue.bind`（绑定） | | **queue** | **exchange** |
| `basic.publish`（发消息） | | exchange | |
| `basic.get` / `basic.consume`（收消息） | | | queue |
| `queue.purge`（清空队列） | | | queue |

> **注意 `queue.bind`**：绑定操作需要 queue 的 **write** 权限 **和** exchange 的 **read** 权限——两个都要有，少一个就绑不上。

> **被动声明（passive declare）**：从 **4.3.1** 起，`passive=true` 的声明（只检查资源是否存在、不改它）要求用户**至少有一项权限**（configure / write / read 任一即可），而非像非被动声明那样必须有 configure。

### 3.3 常用正则技巧

| 正则 | 含义 |
|------|------|
| `.*` | 匹配所有资源（完全放权） |
| `^$` 或空串 `''` | 匹配空名，等于**禁止一切**操作 |
| `^(amq\.gen.*\|amq\.default)$` | 只允许服务端生成的名和默认交换机 |
| `^${username}-.*` | 只允许操作「自己用户名开头」的资源（需后端支持变量展开） |

> 默认交换机（名字为空）在权限检查时会被映射成 `amq.default`，所以正则里用它。

### 3.4 Topic 权限：按路由键细控

上面的三类权限只看**资源名**。如果你用 topic 交换机，还想按 **routing key** 控制谁能往哪条路由发消息，就需要 **Topic Authorization**。

它是在已有权限之上叠加的一层：发消息到 topic 交换机时，除了常规的 `basic.publish` write 权限检查，还会**额外用正则匹配 routing key**。

- 内置后端支持**变量展开**：`${username}`、`${vhost}`、`${client_id}`（仅 MQTT）
- 例如配成 `^{username}-.*`，则用户 `tonyg` 只能发路由键以 `tonyg-` 开头的消息
- **默认不开启**：没有定义 topic 权限时，topic 交换机的发布/消费一律放行；要用地需要主动 opt-in

> Topic 权限对 MQTT、STOMP 这类「以 topic 为核心」的协议最有意义；AMQP 0-9-1 里消费者从 queue 消费，用的是常规 read 权限，topic 权限主要约束的是「topic 交换机 ↔ queue/交换机的绑定 routing key」和「往 topic 交换机发布的 routing key」。

### 3.5 查看与回收权限

```bash
# 查看某 vhost 下所有用户的权限
rabbitmqctl list_permissions --vhost /

# 查看某用户在各 vhost 的权限
rabbitmqctl list_user_permissions "app-user"

# 清除某用户在指定 vhost 的权限（不影响已建立的连接，但新操作最终会被拒）
rabbitmqctl clear_permissions -p "orders" "app-user"
```

> **权限缓存的坑**：RabbitMQ 会按连接/信道缓存鉴权结果，**改了权限不会立即生效**，要等用户重连。要立刻踢掉，用 `rabbitmqctl close_all_user_connections "app-user"`。

---

## 四、认证与授权后端

### 4.1 后端配置与组合

用 `auth_backends` 配置项决定用哪些后端、以什么顺序尝试。支持**别名**简化书写：

| 别名 | 对应模块 | 提供能力 |
|------|---------|---------|
| `internal` | `rabbit_auth_backend_internal` | 认证 + 授权（内置用户库，默认） |
| `ldap` | `rabbit_auth_backend_ldap` | 认证 + 授权 |
| `oauth2` / `oauth` | `rabbit_auth_backend_oauth2` | 授权（认证靠 JWT 自验签） |
| `http` | `rabbit_auth_backend_http` | 认证 + 授权（回调你的 HTTP 接口） |

几种典型组合：

```ini
# 组合 1：只用内置库（默认）
auth_backends.1 = internal

# 组合 2：只用 LDAP
auth_backends.1 = ldap

# 组合 3：先查 LDAP，查不到回退到内置库
auth_backends.1 = ldap
auth_backends.2 = internal

# 组合 4：LDAP 做认证、内置库做授权（混合模式）
auth_backends.1.authn = ldap
auth_backends.1.authz = internal
```

> **链式回退规则**：多个认证后端时，**第一个返回成功的即为最终结果**，不再往后查。混合模式（`.authn` / `.authz` 分开）则可以「一个后端验身份、另一个查权限」。

### 4.2 LDAP 后端

LDAP 适合与企业目录服务（OpenLDAP、Active Directory）打通，用户集中管理、不用在 RabbitMQ 里重复建账号。

**启用与基本配置**：

```bash
rabbitmq-plugins enable rabbitmq_auth_backend_ldap
```

```ini
# rabbitmq.conf
auth_backends.1 = ldap

# LDAP 服务器（可多个，按序尝试）
auth_ldap.servers.1  = ldap.eng.megacorp.local
auth_ldap.servers.2  = 192.168.0.100
auth_ldap.port       = 389

# 把客户端传的用户名拼成 DN 去做 simple bind
auth_ldap.user_dn_pattern = cn=${username},ou=People,dc=example,dc=com

# 授权查询用什么身份去 bind（默认 as_user：用刚认证的用户身份）
# 若用户用 EXTERNAL 机制无密码登录，必须改用独立账号或匿名：
# auth_ldap.other_bind.user_dn  = cn=srv,ou=svc,dc=example,dc=com
# auth_ldap.other_bind.password = svc-password
```

**授权映射**：RabbitMQ 的权限模型（vhost / resource / topic）和 LDAP 的目录结构差异很大，所以提供了四种可配置查询（用 Erlang 项式表达，只能写在 `advanced.config`）：

| 查询 | 作用 | 默认值 |
|------|------|--------|
| `vhost_access_query` | 用户能否访问某 vhost | `{constant, true}`（全放行） |
| `resource_access_query` | 用户能否操作某资源 | `{constant, true}` |
| `topic_access_query` | 用户能否按某 routing key 发/收 | `{constant, true}` |
| `tag_queries` | 用户有哪些管理标签 | `administrator` → `{constant, false}` |

> **默认配置的危险**：刚启用 LDAP 时，四个查询默认全是「放行但不给 administrator 标签」——也就是说**所有 LDAP 用户都能访问所有 vhost 的所有资源**。上线前必须把这些查询收紧（如用 `{in_group, ...}` 按组成员控制）。

> **务必加缓存**：LDAP 每次认证/鉴权都打网络，延迟和负载都很可观。官方强烈建议配合 `rabbitmq_auth_backend_cache` 插件，缓存 15~60 秒：

```bash
rabbitmq-plugins enable rabbitmq_auth_backend_cache
```

### 4.3 OAuth2 后端（云原生 / SSO 首选）

OAuth2 后端让客户端用 **JWT access token** 认证，RabbitMQ **不主动问 IdP**，而是本地验签、解析 token 里的 **scope** 翻译成权限。适合 Kubernetes、与 Keycloak / Auth0 / Entra ID / Okta 等对接。

**最小配置**：

```ini
auth_backends.1 = oauth2

# RabbitMQ 作为资源服务器的标识（token 的 aud 里必须包含它）
auth_oauth2.resource_server_id = rabbitmq

# IdP 的 issuer URL（必须是 HTTPS），RabbitMQ 会通过
# /.well-known/openid-configuration 自动发现 JWKS 端点下载验签密钥
auth_oauth2.issuer = https://keycloak:8443/realms/test

# 从哪个 claim 取用户名（默认 sub，再 fallback 到 client_id）
auth_oauth2.preferred_username_claims.1 = user_name
auth_oauth2.preferred_username_claims.2 = preferred_username
```

**Scope 翻译成权限**：scope 格式为 `<权限>:<vhost模式>/<资源名模式>[/ <routing-key模式>]`，以 `resource_server_id` 为前缀：

| Scope | 授予的权限 |
|-------|-----------|
| `rabbitmq.read:*/*` | 任意 vhost 任意资源的读权限 |
| `rabbitmq.write:vhost1/*` | vhost1 下所有资源的写权限 |
| `rabbitmq.configure:vhost1/orders.*` | vhost1 下名字以 `orders.` 开头的 configure 权限 |
| `rabbitmq.write:*/*/routing.key.*` | topic 发布：任意交换机、routing key 以 `routing.key.` 开头 |
| `rabbitmq.tag:administrator` | 管理界面 administrator 标签 |

> **客户端怎么连**：把 JWT 作为**密码**字段传入，**用户名字段被忽略**。token 必须有数字签名、未过期、`aud` 含 `resource_server_id`。

> **token 过期**：AMQP 1.0 连接的 token 过期会**断开连接**，客户端可发 `PUT /auth/tokens` 主动刷新；AMQP 0.9.1 不会断连但会拒绝操作，可用 `update-secret` 方法刷新。

**Scope 别名**：当 IdP 侧无法配置 RabbitMQ 格式的 scope 时（例如只有 `admin`、`developer` 这种角色），用 `scope_aliases` 做映射：

```ini
auth_oauth2.scope_aliases.admin     = rabbitmq.tag:administrator rabbitmq.read:*/*
auth_oauth2.scope_aliases.developer = rabbitmq.tag:management rabbitmq.read:*/* rabbitmq.write:*/* rabbitmq.configure:*/*
```

### 4.4 x509 证书认证（EXTERNAL 机制）

如果已经上了 mTLS，可以直接用**客户端证书的身份**做认证，连用户名密码都省了。需要两个插件配合：

```bash
rabbitmq-plugins enable rabbitmq_auth_mechanism_ssl
# 可选：信任白名单叶证书（不走 CA 链）
rabbitmq-plugins enable rabbitmq_trust_store
```

```ini
# 开启 EXTERNAL 机制
auth_mechanisms.1 = EXTERNAL
auth_mechanisms.2 = PLAIN

# 从证书的哪个字段取用户名
# common_name：取 CN；distinguished_name：取完整 DN；subject_alternative_name：取 SAN
ssl_cert_login_from = common_name
```

> 用 `EXTERNAL` 机制时，客户端传的密码会被**忽略**。RabbitMQ 从证书提取用户名后，仍需在认证后端里找到对应用户（internal 库要建同名用户，LDAP 要有匹配条目）。

### 4.5 认证机制（SASL Mechanisms）

认证机制决定「密码怎么传」，和后端「密码怎么验」是两回事。4.x 默认开启的三种：

| 机制 | 说明 |
|------|------|
| `PLAIN` | SASL PLAIN，明文传用户名密码（靠 TLS 保护），**默认启用** |
| `AMQPLAIN` | PLAIN 的非标变体，兼容用，**默认启用** |
| `ANONYMOUS` | 允许无凭证连接，以 `anonymous_login_user`（默认也是 `guest`）身份操作——**生产环境必须移除** |
| `EXTERNAL` | 用带外方式认证（如 x509 证书），需插件提供 |
| `RABBIT-CR-DEMO` | 演示用 challenge-response，安全性等同 PLAIN，默认不开 |

```ini
# 生产推荐：只留 PLAIN（+ AMQPLAIN 兼容），关掉 ANONYMOUS
auth_mechanisms.1 = PLAIN
auth_mechanisms.2 = AMQPLAIN
```

> **4.x 重要变化**：`ANONYMOUS` 现在默认开启——这意味着不传凭证也能连进来，身份是 `anonymous_login_user`（默认 `guest`）。官方明确要求**生产环境必须把这个机制去掉**。

---

## 五、TLS / SSL：加密链路

### 5.1 为什么要 TLS

不用 TLS 时，AMQP 流量（含用户名密码、消息体）在网络上**明文传输**，抓包即可看到一切。TLS 解决两件事：

1. **加密**：防窃听
2. **身份验证**：防中间人（验证对端证书是否由可信 CA 签发）

RabbitMQ 的 TLS 用于：客户端连接（amqps / 5671）、管理界面（HTTPS）、集群节点间通信、Federation / Shovel 链路、CLI 与节点通信。

### 5.2 启用 TLS 监听

核心是三个文件：**CA 证书包**、**服务器证书**、**服务器私钥**。

```ini
# rabbitmq.conf
listeners.ssl.default = 5671

ssl_options.cacertfile = /path/to/ca_certificate.pem
ssl_options.certfile   = /path/to/server_certificate.pem
ssl_options.keyfile    = /path/to/server_key.pem

# 开启对端验证（mTLS 关键，见下文）
ssl_options.verify               = verify_peer
ssl_options.fail_if_no_peer_cert = true
```

> **端口对照**：AMQP 明文 `5672`，AMQP over TLS（amqps）`5671`；管理界面 HTTP `15672`、HTTPS `15671`。开了 TLS 不一定关明文，要纯 TLS 可显式禁用：`listeners.tcp = none`。

> **Windows 路径**：配置文件里反斜杠会被当转义符，要么写 `c:\\ca.pem`，要么用正斜杠 `c:/ca.pem`。

验证 TLS 是否生效：

```bash
rabbitmq-diagnostics listeners
# 输出里应能看到 protocol: amqp/ssl, port: 5671
```

### 5.3 对端验证与 mTLS

TLS 可以「只加密不验证」也可以「加密 + 双向验证」。控制项是两个：

| 配置 | 作用 |
|------|------|
| `ssl_options.verify = verify_peer` | 开启客户端证书链验证（默认 Erlang 26+ 已开） |
| `ssl_options.verify = verify_none` | 关闭验证（只加密） |
| `ssl_options.fail_if_no_peer_cert = true` | 客户端没证书就拒绝连接 |
| `ssl_options.fail_if_no_peer_cert = false` | 允许不带证书的客户端（单向 TLS） |

**mTLS（双向 TLS）= 服务端验客户端 + 客户端验服务端**，需要两端都开 `verify_peer`。这是最安全的姿态：没被你信任的 CA 签发的客户端证书，根本握不上手。

验证失败时日志会出现：

```text
TLS server generated SERVER ALERT: Fatal - Unknown CA
```

> **验证深度**：客户端证书由中间 CA 签发时，可能要调大 `ssl_options.depth`（默认 1）。depth=1 表示「peer, CA, trusted CA」三层链。

### 5.4 SNI（Server Name Indication）

SNI 让客户端在握手时告诉服务器「我要连哪个域名」，服务器据此返回对应证书——一台机器托管多个证书时必需。对 RabbitMQ 客户端，通常在连接库的 TLS 选项里设置 `server_name_indication` 为目标主机名。

> 客户端默认还会校验服务器证书的 **SAN/CN 与连接主机名是否匹配**。用 `tls-gen` 生成证书时会自动带上本机 hostname；换机器部署记得重新生成或匹配 hostname。

### 5.5 TLS 版本与密码套件

**锁版本**（强烈建议只开 TLS 1.2 / 1.3）：

```ini
# 只开 TLS 1.2
ssl_options.versions.1 = tlsv1.2

# 或只开 TLS 1.3（最安全，但老客户端连不上）
ssl_options.versions.1 = tlsv1.3
ssl_options.ciphers.1  = TLS_AES_256_GCM_SHA384
ssl_options.ciphers.2  = TLS_AES_128_GCM_SHA256
ssl_options.ciphers.3  = TLS_CHACHA20_POLY1305_SHA256

# 让服务端决定密码套件顺序，防止客户端故意挑弱套件
ssl_options.honor_cipher_order = true
ssl_options.honor_ecc_order    = true
```

| Erlang 版本 | 默认启用的 TLS 版本 |
|-------------|:---:|
| 27.x | TLS 1.3 + TLS 1.2 |
| 26.x | TLS 1.3 + TLS 1.2 |

> **TLS 1.0 / 1.1 已被业界废弃**，SSLv3 早被 RabbitMQ 拒绝。生产环境锁到 1.2 起步，条件允许上 1.3。用 `openssl s_client -connect host:5671 -tls1_2` 可验证协商结果。

更彻底的安全评估用 **testssl.sh**：`./testssl.sh localhost:5671`，它会跑数百项检查（POODLE、BEAST、ROBOT、FREAK、DROWN 等已知漏洞）。

### 5.6 证书轮换

证书过期前要换新。步骤：替换磁盘上的三个文件 → 清缓存让节点立即生效：

```bash
# 替换 cacertfile / certfile / keyfile 后，清 TLS 缓存
rabbitmqctl eval 'ssl:clear_pem_cache().'
```

不清缓存的话，新证书要等运行时自己淘汰旧缓存才生效，有一段延迟。

### 5.7 管理界面 HTTPS

管理插件默认监听 HTTP `15672`，开 HTTPS：

```ini
management.listener.port = 15671
management.listener.ssl  = true

management.ssl.opts.cacertfile = /path/to/ca_certificate.pem
management.ssl.opts.certfile   = /path/to/server_certificate.pem
management.ssl.opts.keyfile    = /path/to/server_key.pem
```

---

## 六、生产安全清单速览

把上面所有要点浓缩成一份可勾选的清单，上线 / 巡检时逐条核对：

| # | 措施 | 说明 |
|:-:|------|------|
| 1 | **删除或限制 guest** | 要么删，要么至少改密码；绝不放开 `loopback_users` |
| 2 | **关闭 ANONYMOUS 机制** | `auth_mechanisms` 只留 `PLAIN`（+ `AMQPLAIN`） |
| 3 | **每个应用最小权限** | configure / write / read 三正则收紧到「刚好够用」，别用 `.*` |
| 4 | **按 vhost 隔离** | 不同业务、不同环境用不同 vhost，权限天然隔离 |
| 5 | **启用 TLS（amqps 5671）** | 生产链路必须加密，明文端口可关掉 |
| 6 | **上 mTLS** | 高安全场景双向验证，配合 EXTERNAL 机制做证书登录 |
| 7 | **锁 TLS 1.2+** | 关掉 1.0/1.1，开 `honor_cipher_order` |
| 8 | **复杂环境接 LDAP/OAuth2** | 集中管账号、支持 SSO；LDAP 务必加 cache 后端 |
| 9 | **凭据轮转** | 定期换密码 / 证书，有泄漏迹象立即 `close_all_user_connections` 并重置 |
| 10 | **网络分段** | RabbitMQ 只对可信网段开放，不直接暴露公网；管理界面更要收紧 |

> 清单里的网络、资源、监控相关项会与本系列后续的生产实践篇呼应，这里聚焦认证授权与加密。

---

## 小结

| 主题 | 一句话 |
|------|--------|
| AuthN vs AuthZ | 认证验身份，授权定边界，RabbitMQ 里是可插拔的两层 |
| 内置用户库 | 默认后端，`add_user` + `set_permissions` 三正则，密码存加盐哈希 |
| 权限模型 | per-vhost 的 configure / write / read，操作对应权限见矩阵；topic 权限按 routing key 细控 |
| 后端组合 | `auth_backends` 链式回退，LDAP / OAuth2 / x509 / HTTP 按需组合 |
| TLS | amqps 5671 加密链路，mTLS 双向验证，锁 1.2+，证书轮换记得清缓存 |
| 安全底线 | 删 guest、关 ANONYMOUS、最小权限、上 TLS、网络分段 |

下一篇：Virtual Hosts——隔离、权限与配额。
