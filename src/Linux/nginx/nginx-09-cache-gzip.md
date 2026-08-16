---
title: Nginx 缓存与压缩——proxy_cache、gzip 与带宽/CPU 权衡
sidebarGroup: Nginx
shortTitle: 09 缓存与压缩
order: 9
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - 缓存
  - gzip
  - 性能
description: 在 Ubuntu 上配置 Nginx proxy_cache 与 gzip：缓存路径、key、状态码与 bypass；理解命中率，以及压缩对 CPU 与带宽的权衡。
---

> **Nginx 系列 · 第 9/12 篇**  
> 上一篇：[《location 与 rewrite》](/Linux/nginx/nginx-08-location-rewrite) · 下一篇：[《访问控制与限流》](/Linux/nginx/nginx-10-access-limit)  
> 参考：[NGINX Content Caching](https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/)、[Compression and Decompression](https://docs.nginx.com/nginx/admin-guide/web-server/compression/)

---

## 开头：上游不必每次都算

热点 GET、不变的 JSON/HTML 片段，可以由 Nginx **代理缓存**；文本响应可用 **gzip** 换带宽。两者都是用入口资源换上游与网络成本——要用对场景。

<!-- 配图占位: 未缓存 vs proxy_cache 命中路径 | /Linux/nginx/09/p01-01.png -->

---

## 一、开启 gzip（先做简单的）

在 `http` 块（或 server）中：

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types
    text/plain
    text/css
    text/xml
    application/json
    application/javascript
    application/xml
    image/svg+xml;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -IH 'Accept-Encoding: gzip' -H 'Host: www.example.com' http://127.0.0.1/ | grep -i content-encoding
```

<!-- 配图占位: 响应头出现 Content-Encoding: gzip | /Linux/nginx/09/p02-01.png -->

| 参数 | 直觉 |
|------|------|
| `gzip_comp_level` | 1–9，越高越省带宽、越吃 CPU；5 左右常够用 |
| `gzip_min_length` | 太小的文件压完可能更大，设下限 |
| 已压缩格式 | 不要对 jpeg/mp4/zip 再 gzip |

Brotli 多为动态模块/第三方，需额外安装；本篇以官方 gzip 为准。

---

## 二、proxy_cache 最小可用

```nginx
# 放在 http 块
proxy_cache_path /var/cache/nginx/api
    levels=1:2
    keys_zone=api_cache:20m
    max_size=2g
    inactive=60m
    use_temp_path=off;

server {
    listen 80;
    server_name cache.example.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_cache api_cache;
        proxy_cache_valid 200 301 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;

        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

```bash
sudo mkdir -p /var/cache/nginx/api
sudo chown -R www-data:www-data /var/cache/nginx
sudo nginx -t && sudo systemctl reload nginx

curl -IH 'Host: cache.example.com' http://127.0.0.1/api/ping   # MISS
curl -IH 'Host: cache.example.com' http://127.0.0.1/api/ping   # HIT
```

`$upstream_cache_status` 常见：`MISS` / `HIT` / `BYPASS` / `EXPIRED` / `STALE` / `UPDATING`。

<!-- 配图占位: X-Cache-Status 从 MISS 到 HIT | /Linux/nginx/09/p03-01.png -->

---

## 三、缓存键、绕过与私有数据

默认键大致含 scheme、host、URI 等；带 Cookie 的个性化页面 **不要盲目缓存**。

```nginx
# 有登录 Cookie 则绕过
proxy_cache_bypass $cookie_session;
proxy_no_cache     $cookie_session;

# 或只缓存干净的 GET
# limit_except GET { deny all; } 等按需
```

```nginx
proxy_cache_key $scheme$host$request_uri;
```

**切记**：缓存用户私有响应是安全事故。只缓存明确公共、可幂等的 GET。

---

## 四、原理/性能权衡

| 手段 | 收益 | 代价 |
|------|------|------|
| gzip | 降带宽、加快传输 | worker CPU；压缩级别越高越明显 |
| proxy_cache | 降上游 QPS、降延迟（命中时） | 磁盘/内存；过期与一致性；配置复杂度 |
| `use_stale` + background update | 上游抖动时仍可服务 | 可能短期返回旧数据 |

调优顺序建议：

1. 先确认 **哪些 URL 可公共缓存**。  
2. 看 `X-Cache-Status` 与上游 QPS，而不是只看 Nginx CPU。  
3. gzip 对已是 CDN 压缩的流量可能重复劳动——有上层 CDN 时避免双压。

<!-- 配图占位: 命中率、上游 QPS 与 CPU 的三角关系 | /Linux/nginx/09/p04-01.png -->

清理缓存（运维手段）：删 `proxy_cache_path` 目录文件并 reload，或使用第三方/Plus 的 purge；OSS 无官方万能 PURGE 指令。

---

## 五、本篇小结

- gzip：文本类打开、控制 level 与 `gzip_types`。  
- `proxy_cache_path` + `proxy_cache` + `proxy_cache_valid`；用 `X-Cache-Status` 验证。  
- **私有响应不进缓存**；命中率与一致性要一起设计。

下一篇：入口侧 **鉴权、IP 控制与限流**，防止被打穿。
