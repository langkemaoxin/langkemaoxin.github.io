---
title: Nginx 反向代理实战——proxy_pass、头转发与缓冲
sidebarGroup: Nginx
shortTitle: 05 反向代理
order: 5
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - 反向代理
  - proxy_pass
  - 性能
description: 在 Ubuntu 上用 Nginx 做 HTTP 反向代理：proxy_pass 写法、X-Forwarded-* 头、超时与缓冲；理解缓冲与 keepalive 对延迟和后端压力的影响。
---

> **Nginx 系列 · 第 5/12 篇**  
> 上一篇：[《静态站与虚拟主机》](/Linux/nginx/nginx-04-static-and-vhost) · 下一篇：[《负载均衡》](/Linux/nginx/nginx-06-load-balancing)  
> 参考：[NGINX Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)、[ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

---

## 开头：浏览器只认 80，应用却在 8080

后端 Spring Boot / Node 监听 `127.0.0.1:8080`，公网只该看到 Nginx。Nginx 负责：收请求 →（可选改 URI）→ 转到上游 → 把响应原样或加工后回给客户端。这就是 **反向代理**。

<!-- 配图占位: 浏览器 → Nginx → 上游应用 | /Linux/nginx/05/p01-01.png -->

---

## 一、最小反代（动手）

假设本机已有上游（示例用 Python 一行服务；也可用真实 jar）：

```bash
# 另开终端
python3 -m http.server 8080 --bind 127.0.0.1
```

Nginx：

```nginx
# /etc/nginx/sites-available/api-proxy
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/api-proxy /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -H 'Host: api.example.com' http://127.0.0.1/
```

<!-- 配图占位: 反代成功时上游日志看到来自 Nginx 的请求 | /Linux/nginx/05/p02-01.png -->

---

## 二、`proxy_pass` 带不带尾斜杠

这是最高频坑：

```nginx
# URI：/app/foo
location /app/ {
    proxy_pass http://127.0.0.1:8080/;     # 上游收到 /foo   （/app/ 被换成 /）
}

location /app/ {
    proxy_pass http://127.0.0.1:8080;      # 上游收到 /app/foo（URI 原样拼接）
}
```

| `proxy_pass` | 行为 |
|--------------|------|
| 只有主机端口（无路径） | 把完整原 URI 传给上游 |
| 带 URI 路径（含是否以 `/` 结尾） | 用该路径 **替换** location 匹配前缀 |

写完用 access 日志或上游日志核对路径，不要凭感觉。

<!-- 配图占位: proxy_pass 尾斜杠导致 URI 替换差异 | /Linux/nginx/05/p03-01.png -->

---

## 三、必须会的请求头

上游若根据 `Host`、客户端 IP、HTTP/HTTPS 做逻辑，需要 Nginx 显式传递：

| 头 | 作用 |
|----|------|
| `Host` | 虚拟主机名；常用 `$host` |
| `X-Real-IP` | 直连 Nginx 的客户端 IP |
| `X-Forwarded-For` | 代理链；`$proxy_add_x_forwarded_for` 追加 |
| `X-Forwarded-Proto` | `http` / `https`，给上游生成正确绝对链接 |

若前面还有一层 LB，要用 `real_ip` 模块信任特定网段，再取真实 IP（第 10/11 篇会再遇到）。

WebSocket 额外需要：

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 3600s;
```

官方：[WebSocket proxying](https://nginx.org/en/docs/http/websocket.html)。

---

## 四、超时：先调这几个

```nginx
proxy_connect_timeout 5s;
proxy_send_timeout    60s;
proxy_read_timeout    60s;
```

| 指令 | 含义 |
|------|------|
| `proxy_connect_timeout` | 连上游 TCP 的超时 |
| `proxy_send_timeout` | 向上游写请求的超时 |
| `proxy_read_timeout` | 等上游响应的超时（SSE/长轮询要加大） |

超时在 error 日志里常见 `upstream timed out`。

---

## 五、原理/性能：缓冲与连接复用

### 1. 缓冲（`proxy_buffering`）

默认 **开启**：Nginx 尽量把上游响应先读进内存/临时文件，再送给客户端。

| 开缓冲 | 关缓冲（`proxy_buffering off`） |
|--------|----------------------------------|
| 上游更快释放连接，适合多数 API/页面 | 适合 SSE、部分流式场景 |
| 大响应可能打磁盘临时文件 | 上游被慢客户端拖住的风险更高 |

相关：`proxy_buffers`、`proxy_buffer_size`、`proxy_max_temp_file_size`。慢客户端 + 大包体时，缓冲能保护上游；调太大则占内存。

### 2. 到上游的 keepalive

```nginx
upstream backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

复用 Nginx→上游的连接，减少握手与 TIME_WAIT，**高 QPS 时收益明显**。下一篇 upstream 负载均衡会继续用这个块。

<!-- 配图占位: 缓冲与上游 keepalive 对延迟/连接数的影响 | /Linux/nginx/05/p04-01.png -->

### 3. 客户端体大小

上传大文件：

```nginx
client_max_body_size 50m;
```

默认偏小（常见 1m），不够会 413。

---

## 六、静态 + API 同域

```nginx
server {
    listen 80;
    server_name www.example.com;
    root /var/www/site-a;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;  # 注意斜杠
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 七、本篇小结

- 反代核心：`location` + `proxy_pass` + 转发头 + 超时。
- **尾斜杠决定 URI 是否被替换**——用日志验证。
- 缓冲保护上游；`upstream` + `keepalive` 降连接开销。

下一篇：多台上游、`upstream` 算法与失败摘除。
