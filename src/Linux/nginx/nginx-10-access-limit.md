---
title: Nginx 访问控制与限流——allow/deny、Basic Auth 与 limit_req
sidebarGroup: Nginx
shortTitle: 10 访问控制与限流
order: 10
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - 限流
  - 安全
  - 性能
description: 在 Ubuntu Nginx 上配置 IP allow/deny、HTTP Basic Auth、limit_req/limit_conn；理解漏桶直觉与限流对雪崩防护的作用。
---

> **Nginx 系列 · 第 10/12 篇**  
> 上一篇：[《缓存与压缩》](/Linux/nginx/nginx-09-cache-gzip) · 下一篇：[《日志与排障》](/Linux/nginx/nginx-11-logging-debug)  
> 参考：[Restricting Access with HTTP Basic Authentication](https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/)、[ngx_http_limit_req_module](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)、[ngx_http_access_module](https://nginx.org/en/docs/http/ngx_http_access_module.html)

---

## 开头：入口要能说「不」

管理后台只给办公室 IP、登录接口防刷、下载站限制并发连接——这些都应在 Nginx 挡住，而不是等应用线程打满。

<!-- 配图占位: IP 控制、鉴权与限流叠加在 location 上 | /Linux/nginx/10/p01-01.png -->

---

## 一、IP allow / deny

```nginx
location /admin/ {
    allow 10.0.0.0/8;
    allow 192.168.1.0/24;
    deny  all;

    proxy_pass http://127.0.0.1:8080/admin/;
    # ... 头转发
}
```

规则 **自上而下，先匹配先生效**。常见写法：先列允许网段，最后 `deny all`。

若 Nginx 前还有 LB，`$remote_addr` 可能是 LB IP，需 `real_ip` 信任代理后再限制（见模块 `ngx_http_realip_module`）。

<!-- 配图占位: allow/deny 顺序匹配 | /Linux/nginx/10/p02-01.png -->

---

## 二、HTTP Basic Auth

```bash
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd alice   # -c 仅首次创建文件
# sudo htpasswd /etc/nginx/.htpasswd bob
sudo chmod 640 /etc/nginx/.htpasswd
sudo chown root:www-data /etc/nginx/.htpasswd
```

```nginx
location /private/ {
    auth_basic           "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;

    root /var/www/site-a;
    try_files $uri $uri/ =404;
}
```

```bash
curl -IH 'Host: www.example.com' http://127.0.0.1/private/          # 401
curl -u alice:密码 -IH 'Host: www.example.com' http://127.0.0.1/private/
```

Basic Auth 仅适合内网工具、演示环境；公网正式账号体系应走应用 SSO/OIDC（Plus 有更多集成，OSS 可用 `auth_request` 反代鉴权服务）。

<!-- 配图占位: Basic Auth 401 与成功访问 | /Linux/nginx/10/p03-01.png -->

---

## 三、limit_req：请求速率

```nginx
# http 块
limit_req_zone $binary_remote_addr zone=perip:10m rate=5r/s;

server {
    location /login {
        limit_req zone=perip burst=10 nodelay;
        proxy_pass http://127.0.0.1:8080/login;
        # ...
    }
}
```

| 概念 | 含义 |
|------|------|
| `rate` | 平均速率（漏桶稳态） |
| `burst` | 允许短时积压的令牌/桶深 |
| `nodelay` | 突发请求立即处理（仍受桶限制），否则可能延迟 |

超限默认 **503**（可用 `limit_req_status 429;`）。

按 URI 维度：

```nginx
limit_req_zone $binary_remote_addr$uri zone=perip_uri:20m rate=2r/s;
```

---

## 四、limit_conn：并发连接

```nginx
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    location /download/ {
        limit_conn addr 4;
        root /var/www/files;
    }
}
```

限制的是 **连接数**，适合大文件、慢客户端占连接的场景；和 `limit_req`（请求速率）互补。

<!-- 配图占位: limit_req 漏桶与 limit_conn 并发上限 | /Linux/nginx/10/p04-01.png -->

---

## 五、原理：限流与雪崩

- 上游过载时，入口限流是 **断路器的第一层**：用 429/503 换下游存活。  
- `rate` 过小误伤正常用户；过大等于没开——要按压测与业务峰值为准。  
- 键选 `$binary_remote_addr` 在 NAT 出口下会「连坐」；可改为 API Key、`$http_x_api_key` 等（需防伪造）。  
- zone 内存：`10m` 量级可存大量键，耗尽后新键行为需查文档/监控。

---

## 六、本篇小结

- 内网路径：`allow`/`deny`；工具页：Basic Auth。  
- 防刷：`limit_req_zone` + `burst`；占连接：`limit_conn`。  
- 限流是性能与稳定性工具，不是替代应用鉴权。

下一篇：用 **日志与调试** 把 502、限流、选错 server 一次查清。
