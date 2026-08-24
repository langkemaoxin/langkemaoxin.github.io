---
title: Nginx HTTPS 与 TLS——证书、强制跳转与 HTTP/2·QUIC 简述
sidebarGroup: Nginx
shortTitle: 07 HTTPS 与 TLS
order: 7
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - HTTPS
  - TLS
  - 性能
description: 在 Ubuntu 上为 Nginx 配置 TLS 证书、HTTP 跳转 HTTPS、安全头与基础套件；理解握手成本，并简述 HTTP/2 与 QUIC/HTTP/3。
---

> **Nginx 系列 · 第 7/12 篇**  
> 上一篇：[《负载均衡》](/Linux/nginx/nginx-06-load-balancing) · 下一篇：[《location 与 rewrite》](/Linux/nginx/nginx-08-location-rewrite)  
> 参考：[Configuring HTTPS servers](https://nginx.org/en/docs/http/configuring_https_servers.html)、[QUIC and HTTP/3](https://nginx.org/en/docs/quic.html)  
> 容器证书挂载另见：[HTTPS Nginx——从浏览器红页滚到本机全绿](/云原生/docker/docker-17-https-nginx)

---

## 开头：443 上终结 TLS

证书挂在 Nginx，浏览器只信入口；上游可在内网明文，或再走 TLS。本篇在 Ubuntu 上完成：**监听 443、跳转、基础加固**，并讲清性能账。

<!-- 配图占位: TLS 在 Nginx 终结，上游内网转发 | /Linux/nginx/07/p01-01.png -->

---

## 一、准备证书文件

假设已有（Let’s Encrypt、公司 CA 或自签测试）：

```text
/etc/nginx/ssl/example.com.crt      # 或 fullchain.pem
/etc/nginx/ssl/example.com.key
```

自签仅供实验：

```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/example.com.key \
  -out /etc/nginx/ssl/example.com.crt \
  -subj "/CN=example.com"
sudo chmod 600 /etc/nginx/ssl/example.com.key
```

生产推荐 **Let’s Encrypt + certbot**（或公司证书平台），并配置自动续期后 `nginx -s reload`。

<!-- 配图占位: 证书与私钥文件权限 | /Linux/nginx/07/p02-01.png -->

---

## 二、最小 HTTPS server

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;   # 较新版本推荐；旧写法可能是 listen ... http2
    server_name example.com www.example.com;

    ssl_certificate     /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;

    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_protocols       TLSv1.2 TLSv1.3;
    # 套件可按公司基线调整；勿盲目复制过时密文套件列表

    add_header Strict-Transport-Security "max-age=31536000" always;

    root /var/www/site-a;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -kI https://127.0.0.1/ -H 'Host: example.com'
```

> `http2 on;` 与 `listen ... ssl http2` 的写法随版本演变，以你安装的 `nginx -v` 对应文档为准；`-t` 不通过就改回该版本支持的写法。

<!-- 配图占位: HTTPS 与 80→443 跳转 | /Linux/nginx/07/p03-01.png -->

反代时别忘了：

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

否则上游可能生成 `http://` 链接。

---

## 三、原理/性能：TLS 不便宜

| 成本 | 说明 |
|------|------|
| **握手** | 非对称运算 + 证书校验；新建连接贵 |
| **会话复用** | `ssl_session_cache` / tickets 降低重复全握手 |
| **CPU** | 高并发 HTTPS 常先打满算力，再谈 worker 数 |
| **证书链** | 缺中间证会导致部分客户端失败，用 fullchain |

运维直觉：

1. 能 **HTTP/2** 就开：多路复用减少连接数与握手次数。  
2. 短连接狂刷 API，优先保证 **keepalive（浏览器↔Nginx）** 与会话复用。  
3. 压测要分「新建 TLS」与「复用连接」两组，数字会差一个数量级。

<!-- 配图占位: TLS 全握手 vs 会话复用 | /Linux/nginx/07/p04-01.png -->

---

## 四、HTTP/3 / QUIC 简述

较新的官方包可启用 **QUIC / HTTP/3**（UDP 443，需内核/权限与编译选项支持）。价值是弱网、建连与队头阻塞改善；落地要开防火墙 UDP、证书适配、灰度验证。细节以 [Support for QUIC and HTTP/3](https://nginx.org/en/docs/quic.html) 为准，本系列不展开完整排障。

---

## 五、常见问题

| 现象 | 排查 |
|------|------|
| `SSL_CTX_use_certificate` 失败 | 证书/私钥不匹配或权限 |
| 浏览器不受信 | 自签、链不完整、域名不符 |
| 跳转死循环 | 上游或另一层代理又把 HTTPS 打成 HTTP，检查 `X-Forwarded-Proto` |
| 仅部分套件失败 | `ssl_protocols` 过旧或过严 |

```bash
sudo openssl x509 -in /etc/nginx/ssl/example.com.crt -noout -subject -dates
sudo nginx -t
sudo tail -n 50 /var/log/nginx/error.log
```

---

## 六、本篇小结

- HTTPS：`listen 443 ssl` + 证书密钥 +（建议）80 永久跳转。
- 打开会话缓存与 TLS1.2/1.3；反代传 `X-Forwarded-Proto`。
- TLS 吃 CPU；HTTP/2/会话复用是入口性能的第一刀。

下一篇：把 URI 路由吃透——**location 匹配优先级与 rewrite**。
