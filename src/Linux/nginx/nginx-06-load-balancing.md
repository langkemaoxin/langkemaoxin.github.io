---
title: Nginx 负载均衡——upstream、算法与被动失败摘除
sidebarGroup: Nginx
shortTitle: 06 负载均衡
order: 6
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - 负载均衡
  - upstream
  - 性能
description: 用 Nginx Open Source 配置 HTTP 负载均衡：round-robin、least_conn、ip_hash、weight，以及 max_fails/fail_timeout 被动健康检查与会话粘滞取舍。
---

> **Nginx 系列 · 第 6/12 篇**  
> 上一篇：[《反向代理》](/Linux/nginx/nginx-05-reverse-proxy) · 下一篇：[《HTTPS 与 TLS》](/Linux/nginx/nginx-07-https-tls)  
> 参考：[Using nginx as HTTP load balancer](https://nginx.org/en/docs/http/load_balancing.html)、[HTTP Load Balancing](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)

---

## 开头：一台后端不够了

反代指向单机时，垂直扩容很快到顶。下一步是 **upstream 池**：Nginx 在多台上游之间分发请求，并在某台连续失败时暂时摘掉。

<!-- 配图占位: Nginx upstream 将请求分到多台上游 | /Linux/nginx/06/p01-01.png -->

> Open Source 主要是 **被动** 健康检查（请求失败才计数）。主动定期探测是 Plus 能力；OSS 可用外部探活 + 改配置/脚本，或第三方模块——本篇聚焦官方 OSS 行为。

---

## 一、最小 upstream

```nginx
upstream app_backend {
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
    server 127.0.0.1:8083;
}

server {
    listen 80;
    server_name lb.example.com;

    location / {
        proxy_pass http://app_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

本地可用三个端口模拟：

```bash
python3 -m http.server 8081 --bind 127.0.0.1 &
python3 -m http.server 8082 --bind 127.0.0.1 &
python3 -m http.server 8083 --bind 127.0.0.1 &
```

多次 `curl -H 'Host: lb.example.com' http://127.0.0.1/`，默认 **加权轮询（round-robin）** 轮流打到各 server。

<!-- 配图占位: 轮询访问三台上游 | /Linux/nginx/06/p02-01.png -->

---

## 二、常用算法与参数

```nginx
upstream app_backend {
    # 默认：加权轮询
    server 10.0.0.11:8080 weight=3;
    server 10.0.0.12:8080 weight=1;
    server 10.0.0.13:8080 backup;           # 仅当其他都不可用时启用
    # server 10.0.0.14:8080 down;           # 手工摘除
}
```

| 方式 | 配置要点 | 适合 |
|------|----------|------|
| 加权轮询 | 默认；`weight` | 无状态 API、机器性能不一 |
| 最少连接 | `least_conn;` | 请求耗时差异大 |
| IP Hash | `ip_hash;` | 需要同一客户端打到同一上游（粗会话粘滞） |
| 哈希 | `hash $request_uri consistent;` 等 | 按 URI/键缓存亲和 |

```nginx
upstream app_backend {
    least_conn;
    server 10.0.0.11:8080;
    server 10.0.0.12:8080;
}

upstream sticky_by_ip {
    ip_hash;
    server 10.0.0.11:8080;
    server 10.0.0.12:8080;
}
```

<!-- 配图占位: least_conn 与 ip_hash 适用场景 | /Linux/nginx/06/p03-01.png -->

**会话粘滞取舍**：`ip_hash` 简单，但客户端经多层 NAT/公司出口时会扎堆；更稳妥是应用层无会话或 Redis 会话，负载层保持无状态轮询。

---

## 三、被动失败摘除（OSS）

```nginx
upstream app_backend {
    server 10.0.0.11:8080 max_fails=3 fail_timeout=30s;
    server 10.0.0.12:8080 max_fails=3 fail_timeout=30s;
}
```

| 参数 | 含义 |
|------|------|
| `max_fails` | 在 `fail_timeout` 窗口内失败多少次视为不可用 |
| `fail_timeout` | 失败计数窗口；摘除后多久再试 |

失败通常包括连接失败、超时，以及（可配）特定 HTTP 状态：

```nginx
proxy_next_upstream error timeout http_502 http_503 http_504;
proxy_next_upstream_tries 2;
```

含义：当前上游失败时，**换下一台再试**（注意：非幂等 POST 要谨慎开启，避免重复提交）。

<!-- 配图占位: max_fails 摘除与 fail_timeout 恢复探测 | /Linux/nginx/06/p04-01.png -->

---

## 四、与 keepalive 组合（性能）

```nginx
upstream app_backend {
    server 10.0.0.11:8080;
    server 10.0.0.12:8080;
    keepalive 32;
}

server {
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        # ... 其它头
    }
}
```

高并发下减少 Nginx↔上游的重复握手。`keepalive` 是 **每个 worker** 维度的空闲连接池直觉，调参结合上游承受能力，不是越大越好。

---

## 五、排障要点

```bash
# 看上游是否被标失败：拉高 error 日志级别临时观察，或压测时盯 error.log
sudo tail -f /var/log/nginx/error.log
```

常见：

| 现象 | 可能原因 |
|------|----------|
| 502/504 | 上游全挂、超时过短、防火墙 |
| 流量不均 | weight、长连接占住某节点、ip_hash 扎堆 |
| 摘除不恢复 | 上游仍失败；或 `fail_timeout` 内未再尝试成功 |

---

## 六、本篇小结

- `upstream` + `proxy_pass http://名字` 即负载均衡。
- 算法按场景选：轮询 / `least_conn` / `ip_hash`；能无状态就别粘滞。
- OSS 靠 **`max_fails` / `fail_timeout` + `proxy_next_upstream`** 做被动容错。

下一篇：给入口加上 **HTTPS**，并弄清 TLS 对 CPU 与延迟的成本。
