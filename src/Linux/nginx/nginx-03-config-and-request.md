---
title: Nginx 配置体系与请求处理——上下文、nginx -t 与匹配流水线
sidebarGroup: Nginx
shortTitle: 03 配置与请求处理
order: 3
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - 配置
  - 原理
description: 弄清 Nginx 配置上下文与 include 结构，用最小 Ubuntu 站点验证 nginx -t，并按官方说明走通「请求如何被处理」的匹配流水线。
---

> **Nginx 系列 · 第 3/12 篇**  
> 上一篇：[《安装与进程控制》](/Linux/nginx/nginx-02-install-and-control) · 下一篇：[《静态站与虚拟主机》](/Linux/nginx/nginx-04-static-and-vhost)  
> 参考：[Beginner’s Guide](https://nginx.org/en/docs/beginners_guide.html)、[How nginx processes a request](https://nginx.org/en/docs/http/request_processing.html)

---

## 开头：配置不是「改一处就灵」

新人常把 `proxy_pass` 写进错误的花括号里，或改完不 `-t` 直接 reload，结果 master 拒绝新配置、线上仍是旧行为。本篇把 **上下文** 和 **请求匹配顺序** 钉死，后面所有实战都建立在这上面。

<!-- 配图占位: 配置上下文树与请求匹配流水线 | /Linux/nginx/03/p01-01.png -->

---

## 一、主配置长什么样（Ubuntu 包）

典型结构（简化）：

```nginx
user www-data;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

events {
    worker_connections 768;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    access_log    /var/log/nginx/access.log;
    sendfile      on;
    keepalive_timeout 65;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

| 块 | 管什么 |
|----|--------|
| **main**（顶层） | 用户、worker 数、pid、error_log |
| **events** | 每 worker 连接数等 |
| **http** | MIME、日志、gzip、upstream、server |
| **server** | 一个虚拟主机（监听 + 域名） |
| **location** | URI 维度的处理 |

指令有「合法上下文」限制：写错位置时，`nginx -t` 会直接报 *directive is not allowed here*。

<!-- 配图占位: Ubuntu nginx.conf 与 sites-enabled 关系 | /Linux/nginx/03/p02-01.png -->

---

## 二、最小可运行站点（动手）

1. 准备内容：

```bash
sudo mkdir -p /var/www/demo
echo '<h1>nginx demo</h1>' | sudo tee /var/www/demo/index.html
```

2. 新建站点（Ubuntu 包风格）：

```bash
sudo tee /etc/nginx/sites-available/demo <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name demo.local;

    root /var/www/demo;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/demo /etc/nginx/sites-enabled/demo
# 避免和 default 抢默认 server 时可先关掉 default：
# sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx
```

3. 本机验证（无 DNS 时用 Host 头）：

```bash
curl -H 'Host: demo.local' http://127.0.0.1/
```

<!-- 配图占位: curl 带 Host 访问 demo 站点 | /Linux/nginx/03/p03-01.png -->

---

## 三、原理：请求如何被处理

官方文档把选择过程拆成几步（HTTP）：

### 1. 先选 `server`

依据是 **监听的 IP:端口**，再在同端口多个 `server` 里用 **`server_name`** 匹配 `Host` 头：

1. 精确名（`example.com`）
2. 最长通配前缀（`*.example.com`）
3. 最长通配后缀（`www.example.*`）
4. 正则 `~` / `~*`（按配置文件中出现顺序，先匹配先生效）
5. 都没有 → 该端口的 **default_server**（显式 `default_server` 或该 listen 上第一个 server）

### 2. 再选 `location`

在已选中的 `server` 内，按 URI 找 location（下一篇会细讲优先级；这里先建立「server → location」两段式）。

### 3. 然后执行内容阶段

静态文件、`proxy_pass`、`return`/`rewrite` 等在对应 location（及继承的指令）里生效。

<!-- 配图占位: Host 选 server 再选 location 的流程图 | /Linux/nginx/03/p04-01.png -->

**性能直觉**：`server_name` 精确匹配走哈希，成本低；大量正则 `server_name` 会按序试，站点极多时更该用精确名或合理拆分。location 里滥用正则同理——第 8 篇展开。

---

## 四、`nginx -t` 到底测什么

```bash
sudo nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

它做的是 **语法 + 部分语义检查**（含文件能否打开等），**不会**保证业务逻辑正确（例如反代指到错误端口仍可能 `-t` 通过）。

习惯：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

测试失败时 **不要 reload**；旧 worker 继续服务，线上不受影响。

---

## 五、常用排错口令

| 现象 | 先查 |
|------|------|
| 改了配置没变化 | 是否 `-t` 失败？是否 reload？是否改错文件（改了 available 没链到 enabled） |
| 打开了别人的站点 | `Host` / `server_name` / 谁是 `default_server` |
| 权限拒绝 | `www-data` 能否读 `root` 目录（目录需执行权限） |
| 端口起不来 | `error.log` + `ss -tlnp` |

```bash
sudo tail -f /var/log/nginx/error.log
```

---

## 六、本篇小结

- 配置是 **分层上下文**；Ubuntu 用 `sites-enabled` include 进 `http`。
- 请求先 **选 server（端口 + server_name）**，再 **选 location**。
- 任何变更：**`-t` 通过再 reload**。

下一篇：把静态资源、`root`/`alias`、多虚拟主机一次跑通。
