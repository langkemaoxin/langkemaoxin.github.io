---
title: HTTPS Nginx——从浏览器红页滚到本机全绿
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
description: 从「连接不是私密连接」出发，同一站点每次只加一块：自签 HTTPS、301 跳转、只读挂载、自建 CA、Compose 反代，把端口、bind、服务名 DNS 拼成第一个完整项目。
---

> **Docker 系列 · 第 14/24 篇**
> 上一篇：[《Docker Compose 编排——从一个 Nginx 滚成一整栈》](/云原生/docker/docker-13-compose) · 下一篇：[《容器日志与监控——logs 原理、日志轮转与 stats/events 三板斧》](/云原生/docker/docker-15-logging-monitoring)
>
> 主线实战篇：端口发布（11）、挂载（12）、Compose（13）在这里拼成第一个完整项目。Nginx 本体见 [Linux/Nginx 系列](/Linux/nginx/nginx-01-what-is-nginx)。

---

## 开头：差的不是 Nginx，是证书怎么进容器

`docker run -d -p 80:80 nginx`，两分钟就能跑起一个 HTTP 站点。地址栏把 `http` 换成 `https`，浏览器立刻甩红页：「您的连接不是私密连接」。

根因就一句：HTTPS = HTTP 外面套一层 TLS。加密防偷看，**证书**防冒名。证书和配置躺在宿主机，还得让容器里的 Nginx 看见——就是 [第 12 篇](/云原生/docker/docker-12-data-persistence) 的 bind。

本篇不先背握手过程。实验目录始终是 `/root/https-lab`，域名 `lab.test`（`.test` 是保留给测试的顶级域），**同一个站点一路长大**：

| 雪球 | 你加上去的 | 当场能看见的效果 |
|------|------------|------------------|
| **1** | 自签证书 + 三份 bind + `-p 443` | `curl -k` 出页面；不带 `-k` 报 `self-signed certificate` |
| **2** | `listen 80` + 301 | `http://` 从 `Connection reset` 变成 301 |
| **3** | 核对 `:ro` | 容器内改证书 → `Read-only file system`；宿主改 html，curl 立刻变 |
| **4** | 自建 CA + 装进信任库 | 不带 `-k` 出页面；`Verify return code: 0 (ok)` |
| **5** | Compose + whoami 反代 | `/api/` 回显 Hostname；`RemoteAddr` 是 nginx 的 IP |
| **6** | 生产证书从哪来 | Let's Encrypt 90 天 / 6 天 / 2028→45 天（无本机签发，只给路线） |

第一次读走 **1～5**。TLS 握手细节不懂不妨碍部署；想深挖见 [Mozilla TLS 入门](https://developer.mozilla.org/zh-CN/docs/Web/Security/Transport_Layer_Security)。浏览器见到 `https://` 没写端口，就是去敲 443。

输出均来自本机：WSL2 Ubuntu-22.04（root）+ Docker 29.1.3 + Compose v2.40.3 + OpenSSL 3.0.2；`nginx:latest` 实测 **1.31.3**（2026-08 拉取）。

---

## 雪球 1：自签证书，先让 curl -k 见到页面

目标只有一条：`curl -k https://lab.test/` 返回页面。先跑通。

三个目录分开——[第 12 篇](/云原生/docker/docker-12-data-persistence) 讲过 bind 的最小单位是目录：配置、证书、网页各挂各的，权限才能分开。

```bash
mkdir -p /root/https-lab/nginx/conf.d
mkdir -p /root/https-lab/nginx/certs
mkdir -p /root/https-lab/app
echo 'https-lab page v1' > /root/https-lab/app/index.html
echo '127.0.0.1 lab.test' >> /etc/hosts
```

`/etc/hosts` 是本机的「域名→IP 私账」，比 DNS 优先。生产这个活由 DNS 负责，思路相同。从 Windows 浏览器访问 WSL，改的是 `C:\Windows\System32\drivers\etc\hosts`。

一条命令生成自签证书：

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
    -keyout /root/https-lab/nginx/certs/lab.test.key \
    -out    /root/https-lab/nginx/certs/lab.test.crt \
    -subj "/CN=lab.test" \
    -addext "subjectAltName=DNS:lab.test"
```

（执行时会刷几行 `....+++`，是生成密钥的正常噪音。）

| 段 | 含义 |
|----|------|
| `openssl req -x509` | `req` = 造证书；`-x509` = 直接输出自签正式证书（不加它输出的是 CSR，雪球 4 会用到） |
| `-newkey rsa:2048` | 顺手生成 2048 位 RSA 私钥 |
| `-nodes` | 私钥不加密存储（no DES）；服务器私钥加口令的话每次重启都要人输 |
| `-days 30` | 自签随便填；公共 CA 给你多久是它定的 |
| `-keyout` / `-out` | **`.key` 私钥、`.crt` 证书**，后缀是约定，内容都是 PEM 文本 |
| `-subj "/CN=lab.test"` | CN 填域名，免交互问答 |
| `-addext "subjectAltName=..."` | **SAN**——现代浏览器实际比对的字段 |

```bash
ls -l /root/https-lab/nginx/certs/
openssl x509 -in /root/https-lab/nginx/certs/lab.test.crt -noout \
    -subject -issuer -dates -ext subjectAltName
```

```text
-rw-r--r-- 1 root root 1139 lab.test.crt        # 证书：可公开，644
-rw------- 1 root root 1704 lab.test.key        # 私钥：仅 root 可读，600
subject=CN = lab.test
issuer=CN = lab.test                             # ← 签发者=持有者：自签铁证
notBefore=Aug 18 02:53:14 2026 GMT
notAfter=Sep 17 02:53:14 2026 GMT
X509v3 Subject Alternative Name:
    DNS:lab.test                                 # ← SAN
```

> **为什么 CN 写了还要 SAN？** RFC 6125 之后主流浏览器（Chrome 58 起）**只认 SAN、无视 CN**。漏掉 `-addext`，证书照样生成、照样能配进 Nginx，但现代浏览器一律报「域名不匹配」。**SAN 必写，CN 顺手写。**

最小 Nginx 配置，写入 `/root/https-lab/nginx/conf.d/default.conf`：

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

`listen 443 ssl` 里的 **`ssl` 就是 HTTPS 和 HTTP 配置的全部差别**。路径是**容器内**的，不是 `/root/https-lab/...`——下一张挂载表对上。TLS 版本不用配：Nginx 1.23.4 起默认 `TLSv1.2 TLSv1.3`（[官方文档](https://nginx.org/en/docs/http/ngx_http_ssl_module.html#ssl_protocols)）。老教程抄来的 `ssl_protocols TLSv1.1 …` 反而是倒退。

```bash
docker run -d --name https-lab-nginx \
    -p 80:80 -p 443:443 \
    -v /root/https-lab/nginx/conf.d:/etc/nginx/conf.d:ro \
    -v /root/https-lab/nginx/certs:/etc/nginx/certs:ro \
    -v /root/https-lab/app:/usr/share/nginx/html:ro \
    --restart always \
    nginx:latest
```

| 段 | 含义 |
|----|------|
| `-p 443:443` | HTTPS 的门面 |
| `-p 80:80` | 先占上；此刻容器里还没人听 80，下一球补 |
| `-v …:ro` ×3 | 三次 bind（[第 12 篇雪球 3](/云原生/docker/docker-12-data-persistence)）。`-v` 源路径不存在会静默建空目录 |
| `:ro` | 证书私钥尤其该只读；内核层表现下一球核对 |
| `--restart always` | 对外 Web 的常规姿势（[第 6 篇](/云原生/docker/docker-06-container-commands)） |

| 宿主机（真身） | 容器内（Nginx 视角） | 装什么 |
|----------------|----------------------|--------|
| `…/nginx/conf.d` | `/etc/nginx/conf.d` | server 块。官方镜像 `nginx.conf` 最后 `include conf.d/*.conf;`；同时**盖住**镜像默认配置（bind 的遮蔽） |
| `…/nginx/certs` | `/etc/nginx/certs` | 证书 + 私钥 |
| `…/app` | `/usr/share/nginx/html` | 网页 |

```bash
docker exec https-lab-nginx nginx -v
docker ps --filter name=https-lab-nginx --format '{{.Status}} | {{.Ports}}'
```

```text
nginx version: nginx/1.31.3
Up 1 second | 0.0.0.0:80->80/tcp, [::]:80->80/tcp, 0.0.0.0:443->443/tcp, [::]:443->443/tcp
```

三种问法：

```bash
curl -k https://lab.test/
```

```text
https-lab page v1
```

通了。**这一球的目标已达成。** `-k` 跳过证书验证，只测站点通不通。

不带 `-k`，让信任干活：

```bash
curl -sS https://lab.test/
```

```text
curl: (60) SSL certificate problem: self-signed certificate
```

curl 收到了证书、看懂了内容，只是**信任库里没有「lab.test 自己」这个 CA**。这不是故障。证书体系里就两个角色：

- **CA**：公证处，用自己的私钥给你的证书盖章
- **证书**：域名 + 公钥 + 某个 CA 的签名。浏览器/curl 预装了一张信任库。验证就一句：盖章的 CA 在不在库里

自签 = 自己给自己盖章，永远不在别人的信任库里。雪球 4 才把 CA 装进去。

```bash
curl -k -sv https://lab.test/ -o /dev/null 2>&1 | grep -i 'SSL connection'
```

```text
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
```

没配 `ssl_protocols` 也是 TLS 1.3。

敲 80：

```bash
curl -sSI http://lab.test/
```

```text
curl: (56) Recv failure: Connection reset by peer
```

> `-p 80:80` 发布了 80，为什么还是连不上？[第 11 篇](/云原生/docker/docker-11-network)：`-p` 只负责「宿主 → 容器」转发，**容器内得有进程在听**。配置只写了 `listen 443`。先把现象记下，雪球 2 补上 80 的 server 块。

从 TLS 层取证（`echo |` 喂一个回车让它别挂着等）：

```bash
echo | openssl s_client -connect lab.test:443 2>/dev/null | grep -E 'subject=|issuer=|Verify return code' | head -3
```

```text
subject=CN = lab.test
issuer=CN = lab.test
Verify return code: 18 (self-signed certificate)
```

和 curl 的结论一字不差。记住 `Verify return code`，雪球 4 还要用它看另外两种状态。

---

## 雪球 2：80 只做一件事——301 到 https

用户敲 `lab.test` 不带协议时，浏览器默认走 80。生产姿势：80 上 **301 永久重定向到 https**。相对上一球，配置只新增第一个 server 块：

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

| 段 | 含义 |
|----|------|
| `listen 80;`（没有 `ssl`） | 明文接待——雪球 1 问法③缺的那个监听 |
| `return 301 …` | 直接 301，不再进 location |
| `$host` / `$request_uri` | 域名不变、路径不变，只把协议换成 https |

改配置必须「先 `-t` 后 reload」。`-t` 是安全门：坏配置拦在这一步。就算跳过直接 reload，主进程校验失败也会**继续用旧配置**（站点不死）。把 key 路径故意写错时本机：

```text
nginx: [emerg] cannot load certificate key "/etc/nginx/certs/no-such.key": BIO_new_file() failed (SSL: ...)
nginx: configuration file /etc/nginx/nginx.conf test failed
```

改回正确配置：

```bash
docker exec https-lab-nginx nginx -t 2>&1 | tail -1
docker exec https-lab-nginx nginx -s reload
```

```text
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

```bash
curl -sI http://lab.test/
curl -k -sL http://lab.test/
```

```text
HTTP/1.1 301 Moved Permanently
Server: nginx/1.31.3
Location: https://lab.test/

https-lab page v1
```

`-I` 只拿头；`-L` 跟随跳转。雪球 1 的 `Connection reset` 从此变成 301。

---

## 雪球 3：`:ro` 焊死容器内改写，宿主照样能热更新

容器内 Nginx 以 root 跑。万一被攻破，攻击者能改证书私钥。`:ro` 在挂载那一刻就把这条路焊死——[第 12 篇雪球 4](/云原生/docker/docker-12-data-persistence) 的 EROFS，这里在三个目录上核对：

```bash
docker exec https-lab-nginx sh -c 'echo hack >> /etc/nginx/certs/lab.test.key'
docker exec https-lab-nginx sh -c 'echo hack >> /etc/nginx/conf.d/default.conf'
docker exec https-lab-nginx sh -c 'echo hack >> /usr/share/nginx/html/index.html'
```

```text
sh: 1: cannot create /etc/nginx/certs/lab.test.key: Read-only file system
sh: 1: cannot create /etc/nginx/conf.d/default.conf: Read-only file system
sh: 1: cannot create /usr/share/nginx/html/index.html: Read-only file system
```

三连拒，都是内核 `EROFS`。

> `:ro` 锁的是**容器视角**。bind 的只读是那条挂载记录的属性，不是文件本身的属性。宿主机照常能写：

```bash
echo 'https-lab page v2 (hot update)' > /root/https-lab/app/index.html
curl -k https://lab.test/
```

```text
https-lab page v2 (hot update)
```

宿主改、容器读，内容更新不需要动容器。

---

## 雪球 4：自建 CA，让 curl 不再需要 -k

雪球 1 的死结在信任库。解法不是把每张服务器证书塞进每台客户机，而是**只信任一个 CA，让 CA 去签任意多张服务器证书**：

```text
   雪球 1（自签）                      这一球（自建 CA）
   ┌─────────────┐                    信任库: [Lab Test Root CA] ✓
   │ lab.test 证书 │ ←自己盖的章         ┌─────────────┐
   └─────────────┘                    │ lab.test 证书 │ ←章是 CA 盖的
   客户端:不认识你 → 红                 └─────────────┘
                                      客户端:认识盖章的 CA → 绿
```

这也是 Let's Encrypt、企业内网 root CA 共同的原理，只是它们的 CA 公钥已预装（或管理员统一装）进信任库。全程在 `/root/https-lab/ca`：

```bash
# ① 造根：CA 的私钥 + 自签的根证书（根天生就是自签——信任的起点）
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -subj "/CN=Lab Test Root CA" -days 3650 -out ca.crt

# ② 造服务器身份：新私钥 + CSR（注意：不带 -x509，不是给自己签的）
openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "/CN=lab.test" -out server.csr

# ③ 盖章：SAN 照样必写
printf 'subjectAltName=DNS:lab.test\n' > san.ext
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out server.crt -days 825 -sha256 -extfile san.ext
```

```bash
openssl x509 -in ca.crt -noout -subject -issuer
openssl x509 -in server.crt -noout -subject -issuer -ext subjectAltName | head -3
```

```text
subject=CN = Lab Test Root CA
issuer=CN = Lab Test Root CA                # 根：自己给自己签
subject=CN = lab.test
issuer=CN = Lab Test Root CA                # ← 换人了！章是 CA 盖的
X509v3 Subject Alternative Name:
```

换证、reload：

```bash
cp server.crt /root/https-lab/nginx/certs/lab.test.crt
cp server.key /root/https-lab/nginx/certs/lab.test.key
docker exec https-lab-nginx nginx -s reload
```

此刻不带 `-k` 仍会失败，但**报错换了内容**：

```bash
curl -sS https://lab.test/
```

```text
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

| 报错原文 | 含义 | 对应阶段 |
|----------|------|----------|
| `self-signed certificate` / `Verify return code: 18` | 自己给自己签 | 雪球 1 |
| `unable to get local issuer certificate` / `Verify return code: 21` | 有签发者，信任库里没有它的根 | **现在**——离绿只差装根 |
| `Verify return code: 0 (ok)` | 绿 | 下一步 |

Debian/Ubuntu 装根（RHEL 系是 `update-ca-trust`）：

```bash
cp ca.crt /usr/local/share/ca-certificates/lab-test-root-ca.crt
update-ca-certificates
```

```text
1 added, 0 removed; done.
```

```bash
curl -sS https://lab.test/
echo | openssl s_client -connect lab.test:443 2>/dev/null | grep 'Verify return code' | head -1
```

```text
https-lab page v2 (hot update)
Verify return code: 0 (ok)
```

从 `18` → `21` → `0`，就是 HTTPS 证书排障的完整地图。

本地开发可换成 [mkcert](https://github.com/FiloSottile/mkcert)，原理与上面三步一模一样。Firefox 自带独立信任库；Windows 侧在 `certmgr.msc`。

---

## 雪球 5：Compose + 反代，站点后面再挂一个服务

十几段 `docker run` 没人背得动。用 [第 13 篇](/云原生/docker/docker-13-compose) 收尾，并加一块生产标配：Nginx 在 443 收 HTTPS，把 `/api/` 转给内部 whoami。

在 443 那个 server 块的 `location /` 后面追加：

```nginx
    location /api/ {
        proxy_pass http://whoami/;
    }
```

| 段 | 含义 |
|----|------|
| `location /api/` | 最长前缀匹配，比 `/` 优先 |
| `proxy_pass http://whoami/` | `whoami` 是 **Compose 网络里的服务名**（[第 11 篇雪球 3](/云原生/docker/docker-11-network) 的内嵌 DNS） |
| 末尾 `/` | 去掉 `/api` 前缀再转发。**不带斜杠则原样拼接**，一斜杠之差语义全变（[Nginx 系列 05](/Linux/nginx/nginx-05-reverse-proxy)） |

`compose.yaml`（相对上一球，把 `docker run` 翻成声明式，并**新增** whoami）：

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

| docker run | compose.yaml | 备注 |
|------------|--------------|------|
| `--name https-lab-nginx` | 项目名 + 服务名 → `https-lab-nginx-1` | [第 13 篇](/云原生/docker/docker-13-compose) 命名规则 |
| `-p 80:80 -p 443:443` | `ports:` | 建议加引号 |
| `-v …:ro` ×3 | `volumes:`，`./` 相对 yaml 所在目录 | 原样搬进 YAML |
| `--restart always` | `restart: always` | 同一策略 |
| （无） | `depends_on: [whoami]` | 只保证先 start，不保证就绪；whoami 秒起，够用 |
| （无） | whoami **无** `ports:` | 后端只活在网内，不暴露到宿主 |

起 stack 前先 `docker rm -f https-lab-nginx`，不然 80/443 撞车。

```bash
cd /root/https-lab
docker compose config --services
docker compose up -d
docker compose ps --format '{{.Name}}  {{.Status}}'
```

```text
nginx
whoami
 Container https-lab-whoami-1  Started
 Container https-lab-nginx-1   Started
https-lab-nginx-1  Up 3 seconds
https-lab-whoami-1  Up 4 seconds
```

四连验证（信任已装，无 `-k`）：

```bash
curl -sS https://lab.test/
curl -sS https://lab.test/api/ | head -6
curl -sI http://lab.test/ | head -2
```

```text
https-lab page v1

Hostname: ea8846a4c0f1
IP: 127.0.0.1
IP: ::1
IP: 172.26.0.2
RemoteAddr: 172.26.0.3:50406
GET / HTTP/1.1

HTTP/1.1 301 Moved Permanently
Server: nginx/1.31.3
```

（静态页若仍是 v2，取决于你有没有改回 `index.html`；本机当时 compose 起来读到的是 v1。）

| 行 | 怎么读 |
|----|--------|
| `Hostname: ea8846a4c0f1` | whoami **容器自己的**主机名——你访问的是 lab.test，应答的却是它 |
| `IP: 172.26.0.2` | whoami 在 `https-lab_default` 里的内网 IP |
| `RemoteAddr: 172.26.0.3:50406` | **谁连的我**——nginx 容器的 IP。客户端 → nginx(443, TLS) → whoami(HTTP) 的铁证 |
| `GET / HTTP/1.1` | 到达 whoami 的路径是 `/` 不是 `/api/`——末尾斜杠在干活 |

```bash
docker compose down
rm -f /usr/local/share/ca-certificates/lab-test-root-ca.crt
update-ca-certificates --fresh
sed -i '/lab.test/d' /etc/hosts
```

`--fresh` 才会真正移除根。`/root/https-lab` 目录保留，`docker compose up -d` 随时能复原。

---

## 雪球 6：生产的证书从哪来

自建 CA 是内网标准答案；**公网站点**用公共 CA。本节为官方文档指引，需公网域名和 80 端口可达，本文的 WSL **无法实测，不贴杜撰输出**。

- **Let's Encrypt 仍是免费首选**。默认 **90 天**；2026 年 1 月起 **6 天短证书已正式可用**（`shortlived` profile）；官方已公布 **2028 年 2 月起默认缩短到 45 天**（[GA 公告](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability)、[45 天计划](https://letsencrypt.org/2025/12/02/from-90-to-45)）。周期越短，自动续期越是生命线。
- **工具叫 certbot**（ACME）。官方[安装指引](https://certbot.eff.org/instructions)首选宿主机 snap；容器化用 `certbot/certbot`，官方明确：容器里的 certbot **只管签发（certonly）**，装进 Web 服务器和续期定时任务要自己做（[镜像页](https://hub.docker.com/r/certbot/certbot)）。思路：证书落到 `/etc/letsencrypt` → bind 给 nginx（和雪球 1 同一招）→ 续期后 `nginx -s reload`。
- 云厂商一年期免费证书：到了要人工换，和上面是两种取舍。
- 内网/自建：就是雪球 4（生产化工具如 cfssl、step-ca，原理相同）。

---

## 命令怎么记、两个历史包袱

| 阶段 | 命令 | 你在哪一球用过 |
|------|------|----------------|
| 目录 / hosts / 自签 | `mkdir`、`echo >> /etc/hosts`、`openssl req -x509` | 1 |
| 投递 | `docker run -p 80,443` + 三份 `:ro` bind | 1 |
| 通断 / 信任 | `curl -k`、不带 `-k`、`openssl s_client` | 1、4 |
| 跳转 | `listen 80` + `return 301`；`nginx -t` 再 `reload` | 2 |
| 只读核对 | `docker exec … echo hack >>` | 3 |
| CA | `genrsa` / `req -new` / `x509 -req` / `update-ca-certificates` | 4 |
| 编排 | `docker compose up -d`；`proxy_pass http://whoami/` | 5 |

老教程里的 `ssl_protocols TLSv1.1` 不要抄。`curl -k` 只验通断，不当生产验收。

排障：

| 症状 | 病根 | 查哪 |
|------|------|------|
| `Failed to connect ... 443` | 端口没发布 / 容器没活 | `docker ps` 的 PORTS |
| `Connection reset by peer`（http） | 容器里没人听 80 | 有没有 `listen 80` |
| curl 60 + `self-signed` | 自签 | `-k`（测试）或换 CA + 装信任 |
| curl 60 + `unable to get local issuer` | 根不在信任库 | `update-ca-certificates`；Firefox 另有库 |
| `hostname mismatch` | SAN 漏写 | `openssl x509 -noout -ext subjectAltName` |
| nginx 反复重启 | 配置有错 | `docker logs` + `nginx -t` |

照抄顺序（宿主侧，域名 `lab.test`）：

```bash
mkdir -p /root/https-lab/{nginx/conf.d,nginx/certs,app}
echo 'hello https' > /root/https-lab/app/index.html
echo '127.0.0.1 lab.test' >> /etc/hosts

openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
  -keyout /root/https-lab/nginx/certs/lab.test.key \
  -out    /root/https-lab/nginx/certs/lab.test.crt \
  -subj "/CN=lab.test" -addext "subjectAltName=DNS:lab.test"

cd /root/https-lab && docker compose up -d

curl -k  https://lab.test/
curl -sS https://lab.test/
curl -sI http://lab.test/
echo | openssl s_client -connect lab.test:443 2>/dev/null | grep 'Verify return code'
```

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|------|----------------------|
| [第 11 篇](/云原生/docker/docker-11-network) | 雪球 1：`-p` 不等于有人在听；雪球 5：服务名 DNS |
| [第 12 篇](/云原生/docker/docker-12-data-persistence) | 雪球 1、3：bind、`:ro`、遮蔽、静默建目录 |
| [第 13 篇](/云原生/docker/docker-13-compose) | 雪球 5：`up`/`down`、depends_on |
| [Nginx 系列](/Linux/nginx/nginx-01-what-is-nginx) | server 块、反代斜杠 |
| [第 15 篇](/云原生/docker/docker-15-logging-monitoring) | 下一篇：站点起来之后看日志 |

---

## 小结

从一个自签欢迎页开始，每次只加一块：

1. **自签 + bind + 443**：`curl -k` 通；不带 `-k` 报 self-signed；80 被 reset。SAN 必写。
2. **301**：明文 80 只跳转到 https；改配置先 `-t` 后 reload。
3. **`:ro`**：容器内改证书被 EROFS 拦住；宿主改 html 立刻生效。
4. **自建 CA**：`18` → `21` → `0 (ok)`；装根后可以去掉 `-k`。
5. **Compose + 反代**：`proxy_pass http://服务名/`；后端不发布端口；`RemoteAddr` 看见 nginx。
6. **生产证书**：Let's Encrypt 自动续期是生命线；certbot 容器化只管签。

**思考题**：

1. 雪球 1 把 `-p 80:80` 去掉、只发布 443，问法③会从 `Connection reset by peer` 变成什么？这能反过来证明「reset 是 docker-proxy 转发后被容器拒绝」而不是「宿主上没人听 80」吗？（提示：[第 11 篇雪球 4](/云原生/docker/docker-11-network)。）
2. 把 `proxy_pass http://whoami/` 末尾斜杠去掉，`curl https://lab.test/api/` 会返回什么？用 whoami 回显的哪一行确认？（提示：不带斜杠 = 路径原样拼接。）

下一篇：[《容器日志与监控》](/云原生/docker/docker-15-logging-monitoring)。

---

## 参考资料

- [nginx · ngx_http_ssl_module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html) — `ssl_certificate` / 默认 `ssl_protocols TLSv1.2 TLSv1.3`（1.23.4 起）
- [nginx 官方镜像](https://hub.docker.com/_/nginx) — 挂载 `conf.d/`
- [openssl-req(1)](https://man7.org/linux/man-pages/man1/openssl-req.1.html) ｜ [openssl-x509(1)](https://man7.org/linux/man-pages/man1/openssl-x509.1.html) ｜ [RFC 6125](https://www.rfc-editor.org/rfc/rfc6125)
- [update-ca-certificates(8)](https://manpages.debian.org/bookworm/ca-certificates/update-ca-certificates.8.en.html) ｜ [mkcert](https://github.com/FiloSottile/mkcert)
- [Let's Encrypt 6 天 GA（2026-01-15）](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability) ｜ [45 天路线图](https://letsencrypt.org/2025/12/02/from-90-to-45) ｜ [certbot](https://certbot.eff.org/instructions) ｜ [certbot 镜像](https://hub.docker.com/r/certbot/certbot)
- [Mozilla TLS 入门](https://developer.mozilla.org/zh-CN/docs/Web/Security/Transport_Layer_Security)（选读）
- 本机：WSL2 Ubuntu-22.04（root）、Docker 29.1.3、Compose v2.40.3、OpenSSL 3.0.2、nginx 1.31.3（2026-08-18）、traefik/whoami:latest
