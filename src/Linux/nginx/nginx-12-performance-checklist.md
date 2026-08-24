---
title: Nginx 性能与生产清单——worker、epoll 与上线检查表
sidebarGroup: Nginx
shortTitle: 12 性能与生产清单
order: 12
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - 性能
  - epoll
  - 生产
description: 总结 Nginx 在 Linux/Ubuntu 上的事件模型与 worker 调优优先级，并给出上线前生产检查清单；串联本系列反代、TLS、缓存与限流要点。
---

> **Nginx 系列 · 第 12/12 篇**（收官）  
> 上一篇：[《日志与排障》](/Linux/nginx/nginx-11-logging-debug)  
> 参考：[Connection processing methods](https://nginx.org/en/docs/events.html)、[ngx_core_module](https://nginx.org/en/docs/ngx_core_module.html)、[AOSA nginx 章节](http://www.aosabook.org/en/nginx.html)

---

## 开头：调参前先分清瓶颈

入口慢，不一定是 `worker_connections` 太小——更常见是 **TLS CPU、上游慢、磁盘日志、缓存未命中、fd 耗尽、限流误伤**。本篇给出调优优先级与一份可勾选的生产清单。

<!-- 配图占位: 性能调优优先级金字塔 | /Linux/nginx/12/p01-01.png -->

---

## 一、原理：事件模型（Linux / epoll）

每个 **worker** 是单线程事件循环（模块回调），用 **epoll**（Linux 默认可用方法之一）同时盯大量连接：可读再读、可写再写，不在阻塞 I/O 上睡死。

因此：

- **worker 数 ≈ CPU 核数**（`worker_processes auto;`）通常是好起点。  
- 盲目加 worker 会增加上下文切换与缓存污染。  
- 阻塞在 worker 里的操作（慢磁盘、傻等）会拖住该 worker 上所有连接——所以反代、缓存路径要避免阻塞逻辑。

<!-- 配图占位: 单 worker 内 epoll 事件循环示意 | /Linux/nginx/12/p02-01.png -->

```nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    multi_accept on;   # 一次 accept 多个，视场景
    # use epoll;       # Linux 上通常自动选择
}
```

粗算并发能力直觉：

> 约 `worker_processes × worker_connections`（还受系统 `nofile`、内存、上游能力限制）。

```bash
ulimit -n
# systemd 服务可在 override 里设 LimitNOFILE=
sudo systemctl edit nginx
```

---

## 二、调优优先级（务实顺序）

1. **上游与超时**：502/504、`$upstream_response_time` ——先修应用。  
2. **TLS**：会话复用、HTTP/2、证书链、CPU。  
3. **连接复用**：客户端 keepalive、上游 `keepalive`。  
4. **缓存与压缩**：可缓存 GET、合理 gzip。  
5. **限流与隔离**：保护登录/搜索等热点。  
6. **worker / connections / nofile**：确认 fd 与连接打满后再调。  
7. **sendfile / tcp_nopush / tcp_nodelay**：静态站微优化。  

```nginx
http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
}
```

<!-- 配图占位: 从上游到 worker 的排查顺序 | /Linux/nginx/12/p03-01.png -->

---

## 三、生产检查清单

### 安装与进程

- [ ] 版本已知：`nginx -v`（并记录 stable/mainline 来源）
- [ ] `systemctl enable nginx`；只通过 `-t` + `reload` 变更配置
- [ ] master/worker 数量符合预期：`ps -ef | grep nginx`

### 配置与站点

- [ ] 每个业务域名独立 `server`；`default_server` 不落业务内容
- [ ] `proxy_pass` 尾斜杠已用真实请求验证
- [ ] 反代头：`Host`、`X-Real-IP`、`X-Forwarded-For`、`X-Forwarded-Proto`
- [ ] 上传：`client_max_body_size` 满足业务

### TLS

- [ ] 仅 TLSv1.2+；证书链完整；80→443 跳转
- [ ] `ssl_session_cache` 已开；HSTS 策略已评估
- [ ] 续期流程会 `reload`（certbot deploy hook 等）

### 性能与容量

- [ ] `worker_processes auto`；`worker_rlimit_nofile` / systemd `LimitNOFILE` 一致
- [ ] `worker_connections` 与 ulimit 匹配
- [ ] 上游 `keepalive`（若适用）；超时与业务 SLA 对齐
- [ ] 热点只读路径评估 `proxy_cache`；私有数据未缓存
- [ ] gzip 类型白名单，不对已压缩多媒体再压

### 安全与稳定

- [ ] 管理路径 `allow`/`deny` 或更强鉴权
- [ ] 登录等接口 `limit_req`；大文件 `limit_conn`（按需）
- [ ] 隐藏版本：`server_tokens off;`

### 可观测

- [ ] error 级别 `warn`/`error`；access 含 `$request_time`/`$upstream_*`
- [ ] logrotate + `reopen`；磁盘空间告警
- [ ] 监控：5xx 率、upstream 延迟、连接数、CPU、fd

### 发布

- [ ] 变更必 `nginx -t`
- [ ] 灰度 Host/机器；保留上一版配置可回滚
- [ ] 与容器/K8s 入口职责清晰（避免双层乱改头）

<!-- 配图占位: 上线前检查清单示意 | /Linux/nginx/12/p04-01.png -->

---

## 四、系列回顾与延伸

| 篇 | 关键词 |
|----|--------|
| 01–02 | 事件驱动、安装、reload |
| 03–04 | 上下文、静态站、server_name |
| 05–06 | 反代、upstream、被动摘除 |
| 07–08 | TLS、location/rewrite |
| 09–10 | 缓存压缩、鉴权限流 |
| 11–12 | 日志排障、性能清单 |

延伸阅读：

- 容器 HTTPS：[HTTPS Nginx——从浏览器红页滚到本机全绿](/云原生/docker/docker-17-https-nginx)  
- K8s 前端代理：[集群中部署微服务前端代理 Nginx](/云原生/platform/platform-17-k8s集群中部署微服务项目前端代理服务-nginx)  
- TCP/UDP：`stream{}`、njs、Gateway Fabric / Ingress ——可作为二期专题

---

## 五、收官小结

- Linux 上 Nginx 的底气是 **少量 worker + epoll 事件驱动**。  
- 调参服从瓶颈：上游与 TLS 优先于盲目加大 `worker_connections`。  
- 用本篇清单做上线门禁；配置变更永远 **`-t` → reload**。

至此，Ubuntu 上从安装到反代、安全与性能的 Nginx 入门主线已闭合。后续若加 `stream`/njs 篇，仍挂在本 Linux · Nginx 板块下即可。
