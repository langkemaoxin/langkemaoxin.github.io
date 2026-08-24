---
title: Nginx 是什么？——Web 入口、反向代理与事件驱动模型
sidebarGroup: Nginx
shortTitle: 01 Nginx 是什么
order: 1
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - Linux
  - 反向代理
  - 性能
description: 从运维视角认识 Nginx Open Source：它能做什么、和 Apache 的差异、master/worker 与事件驱动为何能扛高并发，以及本系列在 Ubuntu 上的学习路径。
---

> **Nginx 系列 · 第 1/12 篇**（开篇）  
> 下一篇：[《Ubuntu 安装与进程控制》](/Linux/nginx/nginx-02-install-and-control)  
> 实验环境约定：本系列默认 **Ubuntu 22.04/24.04 LTS** + **Nginx Open Source**（文中以写作时官方 **stable 1.30.x / mainline 1.31.x** 为参照，安装后以 `nginx -v` 为准）。

---

## 开头：流量先撞到谁？

微服务拆完了，前端静态资源、后端 API、WebSocket 各跑各的端口。公网只开放 80/443 时，所有请求必须先经过一个「门口」：做 TLS、按域名分流、把 `/api` 转到后端、必要时再做一点限流与缓存。

这个门口，生产里最常见的就是 **Nginx**。

<!-- 配图占位: Nginx 作为流量入口：静态、反代、负载均衡示意 | /Linux/nginx/01/p01-01.png -->

---

## 一、Nginx 能做什么

官方定位里，Nginx 既是 **HTTP 服务器**，也是 **反向代理 / 负载均衡器**，还可做邮件代理与 TCP/UDP（`stream`）代理。运维日常用得最多的是前三项：

| 角色 | 典型场景 | 你改的主要配置 |
|------|----------|----------------|
| Web 服务器 | 托管前端构建产物、下载站 | `root` / `alias`、`index`、`location` |
| 反向代理 | 把请求转给 Tomcat、Node、Go、uvicorn | `proxy_pass`、超时与缓冲 |
| 负载均衡 | 多台后端水平扩展 | `upstream`、算法与失败摘除 |
| TLS 终结 | 证书挂在 Nginx，后端走内网明文或再加密 | `listen 443 ssl`、证书路径 |
| 限流与访问控制 | 防刷、内网管理台 | `limit_req`、`allow`/`deny`、Basic Auth |

本系列只讲 **Nginx Open Source（开源版）**。商业版 **NGINX Plus** 多主动健康检查 API、动态 upstream、JWT/OIDC 等能力，文中仅在对比处点到为止。

官方入口：[nginx documentation](https://nginx.org/en/docs/)、[Admin Guide](https://docs.nginx.com/nginx/admin-guide/)。

---

## 二、为什么运维爱用它（对比直觉）

传统多进程/多线程模型（例如经典 Apache prefork）大致是「一个连接一套工作单元」。连接一多，内存与上下文切换一起涨。

Nginx 走的是另一条路：**少量 worker 进程 + 每个 worker 里事件驱动、非阻塞处理大量连接**。在 Linux 上默认用 **epoll** 等机制，把「等 socket 可读/可写」交给内核，进程自己不傻等。

<!-- 配图占位: 多进程阻塞模型 vs Nginx 事件驱动模型对比 | /Linux/nginx/01/p01-02.png -->

直觉上记住三句话即可：

1. **CPU 核数决定 worker 数量的大致上限**（常见 `worker_processes auto`）。
2. **单个 worker 可扛大量空闲/慢连接**，瓶颈往往先出在 fd 上限、带宽、后端，而不是「进程数不够」。
3. **配置改错可以 `nginx -t` 先验再 reload**，不必整机重启。

更细的 worker、连接数与 epoll，会在第 12 篇收成生产清单。

---

## 三、进程模型：master 与 worker

跑起来之后你会看到两类进程：

| 进程 | 职责 |
|------|------|
| **master** | 读配置、绑端口、拉起/管理 worker、处理信号（reload、quit 等） |
| **worker** | 真正 accept 连接、读请求、回响应、跑反代 |

另有可选的 **cache loader / cache manager**（开了 proxy_cache 时）。Ubuntu 包安装后用 `ps -ef | grep nginx` 一眼能分清。

<!-- 配图占位: master 管理多个 worker 的进程关系 | /Linux/nginx/01/p01-03.png -->

**优雅重载（reload）**：master 加载新配置 → 起新 worker → 旧 worker 处理完已有连接再退出。这是改配置的主路径；硬 `kill -9` 会丢掉连接，生产忌用。第 2 篇会把信号与 `systemctl` 对照讲清。

---

## 四、配置怎么长在脑子里

配置文件是分层上下文，不是「全局一锅粥」：

```text
main
 ├─ events { ... }          # 连接处理（worker_connections 等）
 └─ http {
      upstream { ... }
      server {              # 一个虚拟主机
        location { ... }    # URI 匹配
      }
    }
 # 还可有 stream { ... }   # TCP/UDP，本系列后续扩展
```

指令只能写在合法上下文里——例如 `proxy_pass` 在 `location`，不能随便扔进 `events`。第 3 篇会用最小可运行配置把这条规则钉死。

---

## 五、本系列地图与关联阅读

| 篇 | 你会带走什么 |
|----|----------------|
| 02 | Ubuntu 装好、systemd、reload/quit |
| 03–04 | 配置语法、静态站、多域名 |
| 05–06 | 反代与负载均衡（实战核心） |
| 07–10 | HTTPS、rewrite、缓存压缩、限流鉴权 |
| 11–12 | 日志排障、性能与生产检查清单 |

容器里跑 Nginx、证书挂卷的做法见云原生系列：[《HTTPS Nginx——从浏览器红页滚到本机全绿》](/云原生/docker/docker-17-https-nginx)。本系列聚焦 **Ubuntu 宿主机上的 Nginx 本体**。

---

## 六、开篇小结

- Nginx 是 Linux 上常见的 **HTTP 入口**：静态、反代、负载均衡、TLS。
- 性能底子是 **master/worker + 事件驱动（Linux 上多为 epoll）**，适合高并发连接。
- 学配置先记 **上下文层级**；改配置走 **`-t` → reload**。

下一篇动手：在 Ubuntu 上装官方包（或发行版包），并搞清楚 `systemctl` 与 Nginx 信号分别干什么。
