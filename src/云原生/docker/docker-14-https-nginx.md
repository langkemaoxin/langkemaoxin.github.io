---
title: HTTPS 实战——用 Docker 部署带证书的 Nginx：网络、挂载与 Compose 的第一次合体
sidebarGroup: Docker 系列
shortTitle: 14 HTTPS Nginx 实战
order: 14
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - HTTPS
  - Nginx
description: 从「浏览器提示连接不是私密连接」出发，三个案例递进：自签证书跑通最小 HTTPS 站点、自建 CA 让本机真正信任（无警告）、Compose 化并加反向代理——把端口发布、bind 挂载、服务名 DNS 拼成第一个完整项目。全部命令逐段拆解、本机实测，生产证书（Let's Encrypt 2026 现状）单独指引。
---

> **Docker 系列 · 第 14/24 篇**
> 上一篇：[《Docker Compose 编排——用 YAML 定义一整栈微服务》](/云原生/docker/docker-13-compose) · 下一篇：[《容器日志与监控——logs 原理、日志轮转与 stats/events 三板斧》](/云原生/docker/docker-15-logging-monitoring)
>
> 主线实战篇：系列学过的端口发布（11）、挂载（12）、Compose（13）在这里拼成第一个完整项目；Nginx 本身的系统讲解在 [Linux/Nginx 系列](/Linux/nginx/nginx-01-what-is-nginx)。

---

## 开头：差的不是 Nginx，是三块拼图

`docker run -d -p 80:80 nginx`，两分钟就能跑起一个 HTTP 站点。但只要在地址栏把 `http` 换成 `https`，浏览器立刻甩给你一张红页：「您的连接不是私密连接」。

为什么？HTTP 和 HTTPS 之间差着一整套身份验证机制。把它拆开，其实就三块拼图：

| 拼图 | 是什么 | 本文对应 |
|------|--------|----------|
| **证书** | 一份「我就是这个域名」的证明文件（含公钥），由某个 CA 背书 | 案例一、二 |
| **Nginx 的 TLS 配置** | 告诉 Nginx：证书在哪、私钥在哪、监听 443 | 案例一 |
| **容器投递** | 证书和配置文件躺在宿主机，怎么让容器里的 Nginx 看见——bind 挂载，[第 12 篇](/云原生/docker/docker-12-data-persistence)的知识 | 案例一 |

本文用三个案例递进，每个都是完整可照抄的闭环：

- **案例一**：自签证书 + `docker run`，最小 HTTPS 站点跑通（`curl -k` 见到内容）
- **案例二**：补生产姿势——HTTP→HTTPS 跳转、只读挂载、自建 CA 让本机**真正信任**（浏览器/curl 全绿无警告）
- **案例三**：Compose 化 + 反向代理（Nginx + whoami 两个服务），系列知识的最终合体

最后回答「生产的证书从哪来」——Let's Encrypt 2026 年的现状（90 天仍是默认，6 天证书已正式可用）。

> **实验环境**：WSL2 Ubuntu-22.04（root），Docker 29.1.3，Compose v2.40.3，OpenSSL 3.0.2（Ubuntu 22.04 自带；上游 3.5 是 LTS，本文命令全部通用），实测镜像 `nginx:latest` = **1.31.3**（2026-08 拉取；生产建议钉住版本号如 `nginx:1.31`，教学跟随 latest 并以 `nginx -v` 实测为准）。实验目录 `/root/https-lab`，域名用 `lab.test`（`.test` 是专门保留给测试的顶级域，永远不会有真实网站用它）。

---

## 一、HTTPS 到底多了什么：一张图 + 两个角色

**是什么**：HTTPS = HTTP 外面套一层 TLS。类比寄信：

```text
   HTTP（明信片）                    HTTPS（密封信 + 寄信人证件）
   ┌──────────────┐                 ┌──────────────┐
   │ 内容明文      │  路上谁都读得到   │ 内容加密       │  只有收件人能读
   │ 谁都能冒名写  │                 │ 证件证明寄件人 │  中途调包会露馅
   └──────────────┘                 └──────────────┘
```

加密解决「偷看」，**证书**解决「冒名」——本文的主角是后者。证书体系里只有两个角色，白话记住就够用：

- **CA（证书颁发机构）**：公信力机构，相当于公证处。它用自己的私钥给你的证书「盖章」。
- **证书（certificate）**：网站的身份文件，核心内容是「域名 + 公钥 + 某个 CA 的签名」。浏览器和 curl 里都预装了一张**信任库**（一堆它认的 CA）。验证逻辑一句话：**收到证书 → 看盖章的 CA 在不在信任库里 → 在就放行，不在就报红**。

**为什么这决定了本文的路线**：自签证书（自己给自己盖章）永远不会在任何信任库里，所以案例一必然带着警告跑；案例二自建一个 CA 并**手动装进信任库**，警告消失——这一装，就复现了「企业内网 root CA」和「公共 CA」共同的工作原理。

**背景知识（本文不再展开的）**：TLS 握手过程、非对称加密原理属于密码学，不懂不妨碍把 HTTPS 部署明白；想深挖可看 [Mozilla 的 SSL/TLS 入门](https://developer.mozilla.org/zh-CN/docs/Web/Security/Transport_Layer_Security)。80/443 是 HTTP/HTTPS 的默认端口约定，浏览器见到 `https://` 开头没写端口，就是去敲 443。

---

## 二、案例一：自签证书，最小 HTTPS 站点

目标只有一条：**`curl -k https://lab.test/` 返回页面内容**。先跑通，再回头看每一块。

### 2.1 目录与域名：给三样东西安家

**怎么做**：

```bash
$ mkdir -p /root/https-lab/nginx/conf.d    # 装 Nginx 配置
$ mkdir -p /root/https-lab/nginx/certs     # 装证书和私钥
$ mkdir -p /root/https-lab/app             # 装网页文件
$ echo 'https-lab page v1' > /root/https-lab/app/index.html
```

**为什么要三个目录分开**：第 12 篇讲过 bind 挂载的最小单位是目录——配置、证书、网页分开，才能各挂各的、各给各的权限（证书目录只读、网页目录要热更新，案例二见分晓）。

**域名准备（hosts 是什么）**：我们用的 `lab.test` 在公网不存在。`/etc/hosts` 是本机的「域名→IP 私账」，比 DNS 优先：

```bash
$ echo '127.0.0.1 lab.test' >> /etc/hosts
```

curl 和浏览器查 `lab.test` 时先翻这本账，直接得到 127.0.0.1——不用 DNS。生产环境这个活由 DNS 负责，思路相同：**把域名指到服务器 IP**。（从 Windows 浏览器访问 WSL 的话，改的是 `C:\Windows\System32\drivers\etc\hosts`，WSL2 会把 localhost 转发进去。）

### 2.2 一条命令生成自签证书

**怎么做**：

```bash
$ openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
    -keyout /root/https-lab/nginx/certs/lab.test.key \
    -out    /root/https-lab/nginx/certs/lab.test.crt \
    -subj "/CN=lab.test" \
    -addext "subjectAltName=DNS:lab.test"
```

（执行时会刷几行 `....+++` 的进度符号，是生成密钥的正常噪音。）

**命令逐段拆解**：

| 段 | 含义 |
|----|------|
| `openssl req -x509` | `req` = 造证书的子命令；`-x509` = 直接输出一张自签的正式证书（不加它输出的是「证书申请单」CSR——案例二会用到） |
| `-newkey rsa:2048` | 顺手生成一把 2048 位 RSA 新私钥 |
| `-nodes` | 私钥**不**加密存储（no DES）——服务器私钥加口令的话每次重启都要人输，生产也普遍不加，靠文件权限保护 |
| `-days 30` | 证书有效期 30 天（自签随便填；公共 CA 给你多久是它定的） |
| `-keyout` / `-out` | 私钥和证书分别写到哪。**`.key` 是私钥、`.crt` 是证书**，后缀是约定不是法条，内容格式都是 PEM 文本 |
| `-subj "/CN=lab.test"` | 主题：CN（Common Name）填域名，免交互式问答 |
| `-addext "subjectAltName=..."` | **SAN**（主题备用名）里再写一遍域名——见下面的易混点 |

**眼见为实**（先说看哪：`issuer` 和 `subject` 是不是同一个人；`SAN` 里有没有域名）：

```bash
$ ls -l /root/https-lab/nginx/certs/
-rw-r--r-- 1 root root 1139 lab.test.crt        # 证书：可公开，644
-rw------- 1 root root 1704 lab.test.key        # 私钥：仅 root 可读，600

$ openssl x509 -in /root/https-lab/nginx/certs/lab.test.crt -noout \
    -subject -issuer -dates -ext subjectAltName
subject=CN = lab.test
issuer=CN = lab.test                             # ← 签发者=持有者：自签铁证
notBefore=Aug 18 02:53:14 2026 GMT
notAfter=Sep 17 02:53:14 2026 GMT
X509v3 Subject Alternative Name:
    DNS:lab.test                                 # ← SAN，客户端实际比对的字段
```

> **易混点：为什么 CN 写了还要 SAN？** 历史上客户端比对 CN，但 RFC 6125 之后主流浏览器（Chrome 58 起，2017 年）**只认 SAN、无视 CN**。漏掉 `-addext`，证书照样生成、照样能配进 Nginx，但现代浏览器一律报「域名不匹配」。**结论：SAN 必写，CN 顺手写。**

### 2.3 最小 Nginx 配置：五行关键的

**怎么做**（写入 `/root/https-lab/nginx/conf.d/default.conf`）：

```nginx
server {
    listen      443 ssl;
    server_name lab.test;

    ssl_certificate     /etc/nginx/certs/lab.test.crt;
    ssl_certificate_key /etc/nginx/certs/lab.test.key;

    location / {
        root  /usr/share/nginx/html;
        index index.html;
    }
}
```

**逐行拆解**：

| 行 | 含义 |
|----|------|
| `listen 443 ssl` | 监听 443，且这个端口用 TLS——**`ssl` 这个词就是 HTTPS 和 HTTP 配置的全部差别** |
| `server_name lab.test` | 这个 server 块接待哪个域名的请求（一台 Nginx 可以养很多个 server 块，按域名分流——Nginx 系列第 3 篇细讲） |
| `ssl_certificate` / `ssl_certificate_key` | 证书和私钥的**容器内路径**。注意不是 `/root/https-lab/...`——为什么，看下一节的挂载表 |
| `location / { root …; index …; }` | 「所有路径」的页面从哪找：`/usr/share/nginx/html` 是官方镜像的默认网页目录 |

TLS 协议版本**不用配**：Nginx 1.23.4 起默认就是 `TLSv1.2 TLSv1.3`（[官方文档](https://nginx.org/en/docs/http/ngx_http_ssl_module.html#ssl_protocols)），下面实测会看到握手用的 TLS 1.3。老教程里抄来的 `ssl_protocols TLSv1.1 …` 反而是过时的倒退。

### 2.4 docker run：把三样东西投进容器

**怎么做**：

```bash
$ docker run -d --name https-lab-nginx \
    -p 80:80 -p 443:443 \
    -v /root/https-lab/nginx/conf.d:/etc/nginx/conf.d:ro \
    -v /root/https-lab/nginx/certs:/etc/nginx/certs:ro \
    -v /root/https-lab/app:/usr/share/nginx/html:ro \
    --restart always \
    nginx:latest
```

**命令逐段拆解**：

| 段 | 含义 |
|----|------|
| `-p 443:443` | 发布 443——HTTPS 的门面，不发布外面根本敲不到 |
| `-p 80:80` | 先把 80 也占上（案例二马上要用）；此刻容器里还没人听 80，会发生什么，2.5 的问法③有答案 |
| `-v 宿主:容器:ro` ×3 | 三次 bind 挂载（[第 12 篇](/云原生/docker/docker-12-data-persistence)五、[Linux 基础第 6 篇](/Linux/basics/linux-06-bind-mount)）：`-v` 没有 `--mount` 严格，源路径不存在会静默建空目录——路径打错一个字不会报错，只会得到一个空目录，这是 bind 的经典坑 |
| `:ro` | 只读挂载：容器内进程改不了这些文件（内核层 EROFS 拦截，案例二实测）。**证书私钥尤其该 ro** |
| `--restart always` | 宿主机重启、容器异常退出都自动拉起（[第 6 篇](/云原生/docker/docker-06-container-commands)讲过四种策略；对外的 Web 服务用 always/`unless-stopped` 是常规姿势） |

**挂载对照表**——配置里写的容器路径从哪来，就是这张表：

| 宿主机（真身） | 容器内（Nginx 视角） | 装什么 |
|----------------|----------------------|--------|
| `/root/https-lab/nginx/conf.d` | `/etc/nginx/conf.d` | 我们的 server 块——官方镜像的 `nginx.conf` 最后一行 `include conf.d/*.conf;` 会把它加载进来；同时**盖住**镜像自带的默认配置（bind 的遮蔽，Linux-06 一） |
| `/root/https-lab/nginx/certs` | `/etc/nginx/certs` | 证书 + 私钥 |
| `/root/https-lab/app` | `/usr/share/nginx/html` | 网页文件 |

**眼见为实**：

```bash
$ docker exec https-lab-nginx nginx -v
nginx version: nginx/1.31.3

$ docker ps --filter name=https-lab-nginx --format '{{.Status}} | {{.Ports}}'
Up 1 second | 0.0.0.0:80->80/tcp, [::]:80->80/tcp, 0.0.0.0:443->443/tcp, [::]:443->443/tcp
```

PORTS 列 80/443 都已发布（`宿主->容器`）。容器活了，配置对不对，让 curl 说话。

### 2.5 验证：三种问法，三种结果

**问法① `curl -k`：跳过证书验证，只测「站点通不通」**——预期拿到页面：

```bash
$ curl -k https://lab.test/
https-lab page v1
```

通了。**案例一的目标已达成**。

**问法② 不带 `-k`：让证书验证干活**——预期失败，而且**失败得理直气壮**（`-sS` 的作用：安静但保留报错）：

```bash
$ curl -sS https://lab.test/
curl: (60) SSL certificate problem: self-signed certificate
More details here: https://curl.se/docs/sslcerts.html
```

报错原文值得逐字读：`self-signed certificate`——curl 收到了证书、看懂了内容，只是**信任库里没有「lab.test 自己」这个 CA**。这不是故障，是信任体系在正常工作；案例二来解决它。

顺手看 TLS 细节（`-v` 的过程信息里 grep 出关键行）：

```bash
$ curl -k -sv https://lab.test/ -o /dev/null 2>&1 | grep -i 'SSL connection'
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
```

TLS 1.3，没配 `ssl_protocols` 也是它——2.3 说的默认值在干活。

**问法③ `curl http://`（敲 80）**——预期拒绝，报错长得有点意外：

```bash
$ curl -sSI http://lab.test/
curl: (56) Recv failure: Connection reset by peer
```

> **易混点：`-p 80:80` 发布了 80，为什么还是连不上？** 回顾[第 11 篇](/云原生/docker/docker-11-network)：`-p` 只负责「宿主 80 → 容器 80」的转发（宿主侧 docker-proxy 把 80 占住），**容器内得有进程在听 80** 转发才有终点。我们的配置只写了 `listen 443`，容器里根本没人听 80——连接被重置。「发布端口」和「应用监听端口」是两件事，HTTP→HTTPS 跳转（案例二 3.1）就是补上监听 80 的那个 server 块。

最后用 `openssl s_client` 从 TLS 层直接看一眼服务器下发了什么（`echo |` 是喂一个回环输入让它别挂着等）：

```bash
$ echo | openssl s_client -connect lab.test:443 2>/dev/null | grep -E 'subject=|issuer=|Verify return code' | head -3
subject=CN = lab.test
issuer=CN = lab.test
Verify return code: 18 (self-signed certificate)
```

`s_client` = 充当一次 TLS 客户端，把握手信息打出来。**看 `Verify return code` 这行**：`18 (self-signed certificate)`——和 curl 的结论一字不差，这是排障 HTTPS 时最常用的「从 TLS 层取证」手法，记住它，案例二还要用它看另一种失败。

---

## 三、案例二：生产姿势三件套

案例一能跑，但有三处不像生产：明文 80 敲进去没人管、容器理论上能改写证书目录、证书永远带着自签警告。三件套逐个补。

### 3.1 HTTP→HTTPS 跳转：把 80 也接管了

**为什么**：用户敲 `lab.test` 不带协议时，浏览器默认走 80 明文。生产的姿势是 80 上只干一件事——**301 永久重定向到 https**，明文一次都不多停留。

**怎么做**（配置改为两个 server 块，替换整个文件）：

```nginx
server {
    listen      80;
    server_name lab.test;
    return 301 https://$host$request_uri;
}
server {
    listen      443 ssl;
    server_name lab.test;

    ssl_certificate     /etc/nginx/certs/lab.test.crt;
    ssl_certificate_key /etc/nginx/certs/lab.test.key;

    location / {
        root  /usr/share/nginx/html;
        index index.html;
    }
}
```

新增的只有第一个 server 块，逐段拆：

| 段 | 含义 |
|----|------|
| `listen 80;`（没有 `ssl`） | 明文接待 80——这就是问法③缺的那个监听 |
| `return 301 …` | 直接以 301 状态码回应，不再进入任何 location（比 `rewrite` 简单直接，跳转场景首选） |
| `$host` / `$request_uri` | Nginx 内置变量：请求的域名 / 原始路径加查询串。公式 `https://$host$request_uri` = 「域名不变、路径不变，只把协议换成 https」 |

**改配置的流程必须是「先 `-t` 后 reload」**——`-t` 是安全门：坏配置会在这一步被拦下，`reload` 根本不会执行；就算跳过 `-t` 直接 reload，Nginx 主进程校验失败也会**继续用旧配置服务**（新配置不生效但站点不死）。实测感受一下安全门拦人的样子（把 key 路径故意写错）：

```bash
$ docker exec https-lab-nginx nginx -t 2>&1 | tail -2
nginx: [emerg] cannot load certificate key "/etc/nginx/certs/no-such.key": BIO_new_file() failed (SSL: ...)
nginx: configuration file /etc/nginx/nginx.conf test failed
```

`test failed`——门拦住了，reload 不执行，线上还是好配置。改回正确配置再走一遍：

```bash
$ docker exec https-lab-nginx nginx -t 2>&1 | tail -1
nginx: configuration file /etc/nginx/nginx.conf test is successful
$ docker exec https-lab-nginx nginx -s reload
```

**眼见为实**（先说看哪：状态行是不是 301，`Location` 头指向哪）：

```bash
$ curl -sI http://lab.test/
HTTP/1.1 301 Moved Permanently
Server: nginx/1.31.3
...
Location: https://lab.test/

$ curl -k -sL http://lab.test/
https-lab page v1
```

`-I` 只拿响应头；`-L` 跟随跳转——301 → https → 拿到页面，整条链路闭环。问法③的 `Connection reset` 从此变成 301。

### 3.2 只读挂载：`:ro` 在内核层挡住改写

**为什么**：容器内的 Nginx 以 root 跑。万一镜像里的东西被投毒、或者容器被攻破，攻击者能改写你的**证书私钥**和**配置文件**（改完 reload 一下，把流量镜像到别处）。`:ro` 在挂载那一刻就把这条路焊死——这是[第 12 篇](/云原生/docker/docker-12-data-persistence) 5.3 讲过的内核层写保护（EROFS），这里看它在三个目录上的实际表现：

```bash
$ docker exec https-lab-nginx sh -c 'echo hack >> /etc/nginx/certs/lab.test.key'
sh: 1: cannot create /etc/nginx/certs/lab.test.key: Read-only file system
$ docker exec https-lab-nginx sh -c 'echo hack >> /etc/nginx/conf.d/default.conf'
sh: 1: cannot create /etc/nginx/conf.d/default.conf: Read-only file system
$ docker exec https-lab-nginx sh -c 'echo hack >> /usr/share/nginx/html/index.html'
sh: 1: cannot create /usr/share/nginx/html/index.html: Read-only file system
```

三连拒，报错原文都是 `Read-only file system`（EROFS）——不是 Docker 模拟的，容器内进程绕不过去。

> **易混点：`:ro` 锁的是容器视角，宿主机照常能写。** bind 的只读是那条**挂载记录**的属性（Linux-06 五的「两层选项」），不是文件本身的属性。所以「发布流程在宿主机改配置/换证书 → 容器内 reload 生效」依然顺畅，实测：

```bash
$ echo 'https-lab page v2 (hot update)' > /root/https-lab/app/index.html
$ curl -k https://lab.test/
https-lab page v2 (hot update)
```

宿主改、容器读，这正是 [第 12 篇](/云原生/docker/docker-12-data-persistence) 5.2「双向实时」的日常用法：Nginx 是 `--restart always` 常驻的，内容更新不需要动容器。

### 3.3 自建 CA：让信任名正言顺

**心智模型先行**。案例一的死结在信任库：自签证书的「签发者」是它自己，永远进不了别人的信任库。解法不是想办法把每张服务器证书塞进信任库（那要给每台客户机做手术），而是**只信任一个 CA，让 CA 去签任意多张服务器证书**：

```text
   案例一（自签）                      案例二（自建 CA）
   ┌─────────────┐                    信任库: [Lab Test Root CA] ✓
   │ lab.test 证书 │ ←自己盖的章         ┌─────────────┐
   └─────────────┘                    │ lab.test 证书 │ ←章是 CA 盖的
   客户端:不认识你 → 红                 └─────────────┘
                                      客户端:认识盖章的 CA → 绿
```

「自己盖的章」换成「我认的 CA 盖的章」，只多一步：**CA 用自己的私钥给服务器证书签名**。这也是 Let's Encrypt、企业内网 root CA 共同的全部原理，只是它们的 CA 公钥已预装（或管理员统一装）到成千上万台机器的信任库里。

**怎么做**，三步手搓一个 mini-CA（全程在 `/root/https-lab/ca` 目录）：

```bash
# ① 造根：CA 的私钥 + 自签的根证书（根证书天生就是自签的——信任的起点）
$ openssl genrsa -out ca.key 2048
$ openssl req -x509 -new -nodes -key ca.key -subj "/CN=Lab Test Root CA" -days 3650 -out ca.crt

# ② 造服务器身份：新私钥 + 一张「证书申请单」CSR（注意：不带 -x509，因为它不是给自己签的）
$ openssl genrsa -out server.key 2048
$ openssl req -new -key server.key -subj "/CN=lab.test" -out server.csr

# ③ 盖章：用 CA 的私钥+根证书，按 CSR 签出服务器证书，SAN 照样必写
$ printf 'subjectAltName=DNS:lab.test\n' > san.ext
$ openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out server.crt -days 825 -sha256 -extfile san.ext
```

**眼见为实**（看哪：服务器证书的 `issuer` 从「自己」变成了「CA」）：

```bash
$ openssl x509 -in ca.crt -noout -subject -issuer
subject=CN = Lab Test Root CA
issuer=CN = Lab Test Root CA                # 根：自己给自己签（信任的起点）

$ openssl x509 -in server.crt -noout -subject -issuer -ext subjectAltName | head -3
subject=CN = lab.test
issuer=CN = Lab Test Root CA                # ← 换人了！章是 CA 盖的
X509v3 Subject Alternative Name:
```

**换证**：把 CA 签的证书覆盖进 certs 目录，reload：

```bash
$ cp server.crt /root/https-lab/nginx/certs/lab.test.crt
$ cp server.key /root/https-lab/nginx/certs/lab.test.key
$ docker exec https-lab-nginx nginx -s reload
```

此刻 curl（不带 -k）会失败，但**报错换了内容**——这个对照值得盯一眼：

```bash
$ curl -sS https://lab.test/
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

| 报错原文 | 含义 | 对应阶段 |
|----------|------|----------|
| `self-signed certificate`（curl） / `Verify return code: 18` | 证书自己给自己签，谁也不认 | 案例一 |
| `unable to get local issuer certificate`（curl） / `Verify return code: 21` | 证书有签发者，但**本机信任库里没有它的根** | 现在——离绿只差最后一步 |

**最后一步：把根证书装进本机信任库**（Debian/Ubuntu 的工具；RHEL 系是 `update-ca-trust`）：

```bash
$ cp ca.crt /usr/local/share/ca-certificates/lab-test-root-ca.crt
$ update-ca-certificates
1 added, 0 removed; done.
...
```

`1 added`——本机从此认这个 CA。**验收**：

```bash
$ curl -sS https://lab.test/
https-lab page v2 (hot update)          # ← 没有 -k，没有警告

$ echo | openssl s_client -connect lab.test:443 2>/dev/null | grep 'Verify return code' | head -1
Verify return code: 0 (ok)              # ← 18 → 0，绿的
```

从 `18 (self-signed)` 到 `21 (unable to get local issuer)` 再到 `0 (ok)`——三种状态一条线，这就是 HTTPS 证书排障的完整地图。

**背景知识**：① 本地开发想跳过手搓，[mkcert](https://github.com/FiloSottile/mkcert) 一条命令把「建 CA + 装信任库 + 签证书」全自动化，原理与上面三步一模一样；② Firefox 自带独立信任库（不走系统信任库），要在 Firefox 里绿需要单独导入；③ Windows 侧信任库在 `certmgr.msc`——从 Windows 浏览器访问 WSL 里的站点时才需要操心。

---

## 四、案例三：Compose 化 + 反向代理，最终形态

单容器已经完整，但十几段的 `docker run` 没人背得动，而且真实站点后面几乎一定还挂着别的服务。用[第 13 篇](/云原生/docker/docker-13-compose)的 Compose 收个尾，顺便加一块生产标配：**反向代理**——Nginx 在 443 收 HTTPS，把 `/api/` 开头的请求转给内部的 whoami 服务（一个专门回显请求信息的小工具镜像）。

### 4.1 配置：加一个反代块

在第二个 server 块的 `location /` 后面追加（完整文件见下）：

```nginx
    location /api/ {
        proxy_pass http://whoami/;
    }
```

| 段 | 含义 |
|----|------|
| `location /api/` | 接待 `/api/` 开头的请求（Nginx 按最长前缀匹配 location，`/api/` 比 `/` 更长所以优先） |
| `proxy_pass http://whoami/` | 转发目标 `whoami`——不是 IP，是 **Compose 网络里的服务名**，靠服务名 DNS 解析（[第 11 篇](/云原生/docker/docker-11-network)内嵌 DNS、[第 13 篇](/云原生/docker/docker-13-compose)三的原样复用） |
| 末尾那个 `/` | 路径改写：`location /api/` + `proxy_pass …/`（带斜杠）= 去掉 `/api` 前缀再转发——`/api/` → whoami 的 `/`。**不带斜杠则原样拼着转发**，一斜杠之差语义全变（[Nginx 系列 05](/Linux/nginx/nginx-05-reverse-proxy)系统讲反代） |

### 4.2 compose.yaml：docker run 的声明式翻译

```yaml
name: https-lab

services:
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - ./app:/usr/share/nginx/html:ro
    restart: always
    depends_on:
      - whoami

  whoami:
    image: traefik/whoami:latest
```

和 2.4 的 `docker run` 字段一一对着看：

| docker run | compose.yaml | 备注 |
|------------|--------------|------|
| `--name https-lab-nginx` | 项目名 + 服务名自动拼成 `https-lab-nginx-1` | 13 篇的命名规则 |
| `-p 80:80 -p 443:443` | `ports:` 列表 | 建议加引号。Compose V2 实测不加引号也能正确解析（[第 13 篇](/云原生/docker/docker-13-compose)实测结论；「纯数字被当六十进制」是 V1/PyYAML 时代的历史坑），但写上引号最稳妥 |
| `-v …:ro` ×3 | `volumes:` 列表，`./` 相对 yaml 所在目录 | 内容原样搬进 YAML 而已 |
| `--restart always` | `restart: always` | 同一个策略 |
| （无） | `depends_on: [whoami]` | 只保证 whoami **先启动**，不保证它**就绪**——要就绪得配 healthcheck（13 篇六）；whoami 秒起，这里够用 |
| （无） | whoami 无 `ports:` | **故意不发布**：后端只活在 Compose 网内由 nginx 反代访问，不暴露到宿主——这是反代架构的标准姿势 |

### 4.3 起、验、拆

```bash
$ cd /root/https-lab
$ docker compose config --services      # 先看 compose 眼里的服务清单
nginx
whoami
$ docker compose up -d
 Container https-lab-whoami-1  Started
 Container https-lab-nginx-1   Started
$ docker compose ps --format '{{.Name}}  {{.Status}}'
https-lab-nginx-1  Up 3 seconds
https-lab-whoami-1  Up 4 seconds
```

（起 stack 前记得先把案例二的单容器 `docker rm -f https-lab-nginx` 掉，不然 80/443 撞车。）

**四连验证**——静态、反代、跳转、信任，一网打尽：

```bash
$ curl -sS https://lab.test/               # ① 静态页（信任已装，无 -k）
https-lab page v1

$ curl -sS https://lab.test/api/ | head -6  # ② 反代到 whoami
Hostname: ea8846a4c0f1
IP: 127.0.0.1
IP: ::1
IP: 172.26.0.2
RemoteAddr: 172.26.0.3:50406
GET / HTTP/1.1

$ curl -sI http://lab.test/ | head -2      # ③ 明文 80 依然 301
HTTP/1.1 301 Moved Permanently
Server: nginx/1.31.3
```

②的输出逐行解剖——这是整篇最有味道的一块证据：

| 行 | 怎么读 |
|----|--------|
| `Hostname: ea8846a4c0f1` | whoami **容器自己的**主机名（容器 ID 短格式）——你访问的是 https://lab.test，应答的却是它 |
| `IP: 172.26.0.2` | whoami 在 `https-lab_default` 网络里的内网 IP |
| `RemoteAddr: 172.26.0.3:50406` | **谁连的我**——172.26.0.3 正是 nginx 容器的 IP。客户端 → nginx(443, TLS) → whoami(HTTP) 的反代链，这一行就是铁证 |
| `GET / HTTP/1.1` | 到达 whoami 的路径是 `/` 不是 `/api/`——4.1 那个「末尾斜杠去掉前缀」在工作 |

**清场**（对称收尾，13 篇的规矩）：

```bash
$ docker compose down
 Network https-lab_default  Removed
```

连同信任一起清干净，不留后门：

```bash
$ rm -f /usr/local/share/ca-certificates/lab-test-root-ca.crt
$ update-ca-certificates --fresh          # --fresh 才会真正移除
$ sed -i '/lab.test/d' /etc/hosts
```

（`/root/https-lab` 目录保留，`docker compose up -d` 随时能复原整个项目。）

---

## 五、生产的证书从哪来

案例二的自建 CA 是内网标准答案；**公网站点**的答案是公共 CA。2026 年的现况（本节为官方文档指引，需公网域名和 80 端口可达，本文的 WSL 环境无法实测，不贴杜撰输出）：

- **Let's Encrypt 仍是免费首选**。证书有效期**默认 90 天**；2026 年 1 月起，**6 天短证书已正式可用**（按需选择 `shortlived` profile），且官方已公布 **2028 年 2 月起默认缩短到 45 天**的路线图（[GA 公告](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability)、[45 天计划](https://letsencrypt.org/2025/12/02/from-90-to-45)）。周期越短，「自动续期」越不是加分项而是生命线——任何还靠人工换证书的流程都在倒计时。
- **拿证书的工具叫 certbot**（EFF 出品，说 ACME 协议跟 CA 自动打交道）。官方[安装指引](https://certbot.eff.org/instructions)首选宿主机 snap 方式；容器化路线用官方镜像 `certbot/certbot`，官方说明明确提醒两点：容器里的 certbot **只管签发（certonly），装进 Web 服务器的动作要自己做**；续期也要自己编排定时任务（[官方镜像页](https://hub.docker.com/r/certbot/certbot)）。思路：certbot 把证书落到 `/etc/letsencrypt` → bind 挂给 nginx 容器（和本文 2.4 同一招）→ 续期后 `nginx -s reload`。
- **云厂商的一年期免费证书**适合完全不想碰自动化的低频内部站点；有效期长但**到了要人工换**，和上面恰好是两种取舍。
- **内网/自建**：就是案例二的手搓 CA（生产化工具如 cfssl、step-ca，原理相同：根装信任库、根签服务器证书）。

---

## 六、验收清单：从零到绿

照抄顺序（宿主侧全程，域名以 `lab.test` 为例）：

```bash
# ① 目录与内容
mkdir -p /root/https-lab/{nginx/conf.d,nginx/certs,app}
echo 'hello https' > /root/https-lab/app/index.html
echo '127.0.0.1 lab.test' >> /etc/hosts

# ② 自签证书（教学）；生产换成 CA 签发的 crt/key
openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
  -keyout /root/https-lab/nginx/certs/lab.test.key \
  -out    /root/https-lab/nginx/certs/lab.test.crt \
  -subj "/CN=lab.test" -addext "subjectAltName=DNS:lab.test"

# ③ 写 conf.d/default.conf（见 2.3 / 3.1 / 4.1）后起服务
cd /root/https-lab && docker compose up -d

# ④ 验收四连
curl -k  https://lab.test/        # 站点通
curl -sS https://lab.test/        # 看证书是否被信任（自签预期报错，装信任后绿）
curl -sI http://lab.test/         # 预期 301 + Location: https://
echo | openssl s_client -connect lab.test:443 2>/dev/null | grep 'Verify return code'
```

排障速查（症状 → 病根 → 查哪）：

| 症状 | 病根 | 查哪 |
|------|------|------|
| `Failed to connect ... 443` | 端口没发布 / 容器没活 | `docker ps` 的 PORTS 列 |
| `Connection reset by peer`（http） | 容器里没人听 80 | 配置里有没有 `listen 80` 的 server 块 |
| curl 60 + `self-signed certificate` | 自签证书，信任库里没有它 | 要么 `-k`（测试），要么换 CA 签 + 装信任 |
| curl 60 + `unable to get local issuer` | 证书有 CA 签名，但根不在信任库 | `update-ca-certificates` 装根了吗；Firefox 另有信任库 |
| `SSL certificate problem: hostname mismatch` 类 | 证书里没有该域名（SAN 漏写） | `openssl x509 -noout -ext subjectAltName` |
| nginx 容器反复重启 | 配置有错，起不来 | `docker logs` + `docker compose exec nginx nginx -t` |

---

## 小结

- HTTPS 比 HTTP 多的三块拼图：**证书**（CA 盖章的身份文件）、**Nginx 的 `listen 443 ssl` + 证书两行**、**bind 挂载**把前两样投进容器
- 自签证书一条命令（`openssl req -x509` …），**SAN 必写**（现代客户端只认 SAN）；`curl -k` 只验通断，不带 `-k` 才验信任
- 三种验证状态的完整地图：`18 self-signed` → `21 unable to get local issuer` → `0 (ok)`；自建 CA 三步（根 / CSR / 签发）+ 装信任库，就是 Let's Encrypt 与企业内网 CA 共同的原理
- 生产姿势：80 只做 301 跳转（`return 301 https://$host$request_uri`）；证书/配置 `:ro` 挂载（EROFS 焊死容器内改写，宿主热更新不受影响）；改配置**先 `-t` 后 reload**
- Compose 化 + 反向代理：`proxy_pass http://服务名/` 靠服务名 DNS（11/13 篇），末尾斜杠去前缀；后端**不发布端口**只活在网内；`RemoteAddr` 里能直接看到反代链上 nginx 容器的 IP
- 生产证书：Let's Encrypt（90 天默认、6 天已可用、2028 转 45 天）→ 自动续期是生命线；certbot 容器化只管签，部署与续期自己编排

---

## 思考题

> 1. 2.4 把 `-p 80:80` 去掉、只发布 443，案例一的问法③会从 `Connection reset by peer` 变成什么？这能反过来证明「reset 是 docker-proxy 转发后被容器拒绝」而不是「宿主上没人听 80」吗？（提示：[第 11 篇](/云原生/docker/docker-11-network) 3.4.1 的 docker-proxy 进程模型——发布端口时宿主侧谁在 listen。）
> 2. 把 4.1 的 `proxy_pass http://whoami/` 末尾斜杠去掉（`http://whoami`），其余不动，`curl https://lab.test/api/` 会返回什么？动手改配置 → `nginx -t` → reload → 验证，用 whoami 回显的哪一行确认你的判断？（提示：不带斜杠=路径原样拼接转发。）

---

## 参考资料

- [nginx · ngx_http_ssl_module 官方文档](https://nginx.org/en/docs/http/ngx_http_ssl_module.html) — `ssl_certificate` / 默认 `ssl_protocols TLSv1.2 TLSv1.3`（1.23.4 起）
- [nginx 官方镜像 · Docker Hub](https://hub.docker.com/_/nginx) — 挂载 `conf.d/` 的推荐做法（Complex configuration 一节）
- [openssl-req(1)](https://man7.org/linux/man-pages/man1/openssl-req.1.html) ｜ [openssl-x509(1)](https://man7.org/linux/man-pages/man1/openssl-x509.1.html) — 证书生成/签发/查看；[RFC 6125](https://www.rfc-editor.org/rfc/rfc6125) — SAN 与 CN 的比对规则
- [update-ca-certificates(8)](https://manpages.debian.org/bookworm/ca-certificates/update-ca-certificates.8.en.html) — Debian/Ubuntu 信任库（RHEL 系为 `update-ca-trust`）；[mkcert](https://github.com/FiloSottile/mkcert) — 本地开发的一键版
- [Let's Encrypt：6 天与 IP 证书 GA（2026-01-15）](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability) ｜ [默认 45 天路线图（2025-12-02）](https://letsencrypt.org/2025/12/02/from-90-to-45) ｜ [certbot 官方安装指引](https://certbot.eff.org/instructions) ｜ [certbot/certbot 官方镜像](https://hub.docker.com/r/certbot/certbot)
- [Mozilla · Transport Layer Security 入门](https://developer.mozilla.org/zh-CN/docs/Web/Security/Transport_Layer_Security)（选读）
- 本机实测环境：WSL2 Ubuntu-22.04（root）、Docker 29.1.3、Compose v2.40.3、OpenSSL 3.0.2、nginx:latest（实测 1.31.3，2026-08-18 拉取）、traefik/whoami:latest
