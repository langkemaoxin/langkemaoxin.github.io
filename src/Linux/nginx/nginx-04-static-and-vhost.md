---
title: 静态站点与虚拟主机——root、alias 与 server_name
sidebarGroup: Nginx
shortTitle: 04 静态站与虚拟主机
order: 4
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - 静态资源
  - 虚拟主机
description: 在 Ubuntu 上用 Nginx 托管静态站点，区分 root 与 alias，配置多域名虚拟主机，并理解 server_name 与 default_server 的匹配规则。
---

> **Nginx 系列 · 第 4/12 篇**  
> 上一篇：[《配置与请求处理》](/Linux/nginx/nginx-03-config-and-request) · 下一篇：[《反向代理》](/Linux/nginx/nginx-05-reverse-proxy)  
> 参考：[Serving Static Content](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)、[Server names](https://nginx.org/en/docs/http/server_names.html)

---

## 开头：前端包往哪丢？

CI 打出 `dist/`，运维要做的是：放到机器某目录、Nginx `root` 指过去、按域名（或路径）对外提供，并且 **A 站的请求绝不能落到 B 站目录**。

<!-- 配图占位: 多域名静态站点目录与 server 映射 | /Linux/nginx/04/p01-01.png -->

---

## 一、单站点静态托管

```bash
sudo mkdir -p /var/www/site-a
echo 'site-a' | sudo tee /var/www/site-a/index.html
sudo chown -R www-data:www-data /var/www/site-a
```

```nginx
# /etc/nginx/sites-available/site-a
server {
    listen 80;
    server_name site-a.example.com;

    root /var/www/site-a;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # SPA 常回退到 index.html；纯静态站可用 =404
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        access_log off;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/site-a /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -H 'Host: site-a.example.com' http://127.0.0.1/
```

<!-- 配图占位: 静态资源与 expires 缓存头 | /Linux/nginx/04/p02-01.png -->

`sendfile on;`（常在 `http` 块）让内核直接把文件送进 socket，减少用户态拷贝——静态站性能的基础开关之一。

---

## 二、`root` 与 `alias`：别混

| 指令 | 路径怎么拼 | 典型用途 |
|------|------------|----------|
| `root` | `root` + **完整 URI** | 站点根目录 |
| `alias` | `alias` + **location 匹配后的剩余部分** | 把 `/static/` 映射到别处 |

```nginx
location /img/ {
    root /var/www/site-a;          # 请求 /img/a.png → /var/www/site-a/img/a.png
}

location /img/ {
    alias /var/www/site-a/images/; # 请求 /img/a.png → /var/www/site-a/images/a.png
}
```

`alias` 的 location 若以 `/` 结尾，路径拼接规则更严，写完一定用真实文件 `curl` 验证。配错时 access 里常是 404，error 里可能有 *open() failed*。

<!-- 配图占位: root 与 alias 路径拼接对比 | /Linux/nginx/04/p03-01.png -->

---

## 三、多虚拟主机

```bash
sudo mkdir -p /var/www/site-b
echo 'site-b' | sudo tee /var/www/site-b/index.html
```

```nginx
# site-b
server {
    listen 80;
    server_name site-b.example.com;
    root /var/www/site-b;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
    }
}
```

同端口多个 `server` 时，靠 `Host` 选站。本机测试：

```bash
curl -H 'Host: site-a.example.com' http://127.0.0.1/
curl -H 'Host: site-b.example.com' http://127.0.0.1/
curl http://127.0.0.1/   # 无 Host 匹配时走 default_server
```

指定默认站：

```nginx
server {
    listen 80 default_server;
    server_name _;
    return 444;   # 或返回统一提示页，避免扫到别人的内容
}
```

<!-- 配图占位: default_server 兜底未匹配 Host 的请求 | /Linux/nginx/04/p04-01.png -->

---

## 四、原理：`server_name` 匹配与性能

回顾优先级（同 listen）：

1. 精确名  
2. 最长 `*.左右` 通配  
3. 最长 `左右.*` 通配  
4. 正则（配置顺序，先匹配先生效）  
5. default_server  

**运维建议**：

- 生产域名尽量 **精确名**；通配只给明确的多级子域场景。
- 少用正则 `server_name`，可读性与性能都更差。
- 未识别 Host 不要默默落到某个业务站，用独立 default 返回 444/444 页或固定错误页。

官方细表：[Server names](https://nginx.org/en/docs/http/server_names.html)。

---

## 五、权限与目录索引

```bash
# 目录需要可执行位，文件需要可读
namei -l /var/www/site-a/index.html
sudo -u www-data test -r /var/www/site-a/index.html && echo ok
```

目录列表默认关闭；若开启 `autoindex on;` 仅用于受控内网，公网静态站一般保持关闭。

---

## 六、本篇小结

- 静态站核心：`server` + `root` + `location` + `try_files`。
- **`root` 拼完整 URI，`alias` 替换 location 前缀**——写完用 curl 验。
- 多站点靠 `server_name`；配好 **default_server**，防止 Host 乱撞。

下一篇进入系列重点：**反向代理**——把 `/api` 转到后端，并搞清头与缓冲对延迟的影响。
