---
title: location 匹配与 rewrite——优先级、常见坑与性能代价
sidebarGroup: Nginx
shortTitle: 08 location 与 rewrite
order: 8
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - location
  - rewrite
  - 原理
description: 讲清 Nginx location 的前缀、精确、正则匹配优先级，以及 rewrite/return 的常见用法与坑；说明正则过多对性能的影响。
---

> **Nginx 系列 · 第 8/12 篇**  
> 上一篇：[《HTTPS 与 TLS》](/Linux/nginx/nginx-07-https-tls) · 下一篇：[《缓存与压缩》](/Linux/nginx/nginx-09-cache-gzip)  
> 参考：[ngx_http_core_module location](https://nginx.org/en/docs/http/ngx_http_core_module.html#location)、[ngx_http_rewrite_module](https://nginx.org/en/docs/http/ngx_http_rewrite_module.html)、[Converting rewrite rules](https://nginx.org/en/docs/http/converting_rewrite_rules.html)

---

## 开头：同一 URI，谁说了算？

一个 `server` 里多个 `location`，有人写前缀、有人写正则，结果「明明写了规则却不生效」。根因几乎总是：**匹配优先级与查找算法和直觉不一致**。

<!-- 配图占位: 多种 location 同时存在时的选择示意 | /Linux/nginx/08/p01-01.png -->

---

## 一、location 修饰符一览

| 语法 | 类型 | 说明 |
|------|------|------|
| `location /a/` | 普通前缀 | 最长前缀候选 |
| `location = /a` | 精确 | 完全相等则立刻选用 |
| `location ^~ /a/` | 前缀优先 | 最长前缀若带 `^~`，不再找正则 |
| `location ~ \.php$` | 正则（区分大小写） | 按配置顺序，先匹配先生效 |
| `location ~* \.(js|css)$` | 正则（忽略大小写） | 同上 |

---

## 二、官方匹配算法（运维版）

简化步骤：

1. 先找所有 **前缀** location，记下 **最长匹配** 的那一个。  
2. 若最长前缀带 **`=`** 精确匹配成功 → **直接用**，结束。  
3. 若最长前缀带 **`^~`** → **直接用该前缀**，不再考虑正则。  
4. 否则按配置文件顺序测试 **正则** `~` / `~*`，**第一个**匹配成功的胜出。  
5. 若正则都未中 → 用第 1 步的最长前缀。

<!-- 配图占位: location 匹配决策流程图 | /Linux/nginx/08/p02-01.png -->

**实战口诀**：

- 静态目录、API 前缀：优先 **前缀** 或 `^~`，少写正则。  
- 必须正则时：把更具体的规则写在前面，并控制数量。  
- 精确首页、健康检查：用 `=`。

---

## 三、配置示例

```nginx
server {
    listen 80;
    server_name app.example.com;
    root /var/www/site-a;

    location = /health {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }

    location ^~ /static/ {
        alias /var/www/site-a/static/;
        expires 30d;
        access_log off;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 7d;
        access_log off;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

验证：

```bash
curl -iH 'Host: app.example.com' http://127.0.0.1/health
curl -IH 'Host: app.example.com' http://127.0.0.1/static/app.js
```

<!-- 配图占位: health 精确匹配与 static 的 ^~ | /Linux/nginx/08/p03-01.png -->

---

## 四、rewrite 与 return

```nginx
# 优先用 return（清晰、开销小）
location = /old {
    return 301 /new;
}

# rewrite：改写 URI，可带 flag
location /blog {
    rewrite ^/blog/(.*)$ /index.php?post=$1 last;
}
```

常见 flag：

| flag | 含义 |
|------|------|
| `last` | 用新 URI 重新搜索 location |
| `break` | 停止 rewrite 模块，留在当前 location |
| `redirect` / `permanent` | 302 / 301 回客户端 |

**坑**：

- `rewrite ... last` 可能再次进入别的 location，形成难查循环 → error 日志 *rewrite or internal redirection cycle*。  
- 能用 `return 301 https://$host$request_uri;` 就不要写复杂 rewrite。  
- 从 Apache 迁移时用官方 [Converting rewrite rules](https://nginx.org/en/docs/http/converting_rewrite_rules.html)，不要逐条盲翻。

---

## 五、原理/性能：正则不是免费的

- 前缀匹配可走高效结构；**每个请求**对正则 location 可能按序试 PCRE。  
- 站点配置膨胀后，CPU 会耗在「选 location」而不是业务。  
- 优化顺序：合并规则 → `^~` 固定静态前缀 → 正则尽量少且具体 → 热路径避免 `rewrite last` 来回跳。

<!-- 配图占位: 前缀命中 vs 多次正则尝试的成本对比 | /Linux/nginx/08/p04-01.png -->

---

## 六、本篇小结

- 记牢：精确 / `^~` / 正则顺序 / 最长前缀兜底。  
- 跳转优先 `return`；`rewrite` 弄清 `last` vs `break`。  
- 正则与反复 rewrite 都有 CPU 成本，热路径保持简单。

下一篇：用 **proxy_cache 与 gzip** 换带宽与上游压力。
