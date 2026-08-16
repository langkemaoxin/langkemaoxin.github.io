---
title: Nginx 日志与排障——access/error、变量与调试日志开销
sidebarGroup: Nginx
shortTitle: 11 日志与排障
order: 11
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - 日志
  - 排障
  - 性能
description: 配置 Nginx access/error 日志与自定义格式，用状态码与 upstream 变量排障；说明 debug 日志的启用方式及其性能开销。
---

> **Nginx 系列 · 第 11/12 篇**  
> 上一篇：[《访问控制与限流》](/Linux/nginx/nginx-10-access-limit) · 下一篇：[《性能与生产清单》](/Linux/nginx/nginx-12-performance-checklist)  
> 参考：[Configuring Logging](https://docs.nginx.com/nginx/admin-guide/monitoring/logging/)、[A debugging log](https://nginx.org/en/docs/debugging_log.html)、[ngx_http_log_module](https://nginx.org/en/docs/http/ngx_http_log_module.html)

---

## 开头：502 时先看哪？

反代链路一长，问题可能在证书、location、上游超时、限流或磁盘满。运维默认顺序：**error.log → access 状态码与 upstream 字段 → `nginx -t` / 进程 → 系统 `ss`/`df`**。

<!-- 配图占位: 排障从 error 到 access 再到系统层 | /Linux/nginx/11/p01-01.png -->

---

## 一、默认日志位置（Ubuntu）

| 文件 | 用途 |
|------|------|
| `/var/log/nginx/access.log` | 每请求一行（可关可拆） |
| `/var/log/nginx/error.log` | 启动、配置、上游失败等 |

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

日志切割后让 Nginx 重新打开文件：

```bash
sudo nginx -s reopen
# 或 systemctl kill -s USR1 nginx
```

<!-- 配图占位: tail 跟踪 error 与 access | /Linux/nginx/11/p02-01.png -->

---

## 二、自定义 access 格式（含上游）

```nginx
# http 块
log_format main_ext '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time '
                    'urt=$upstream_response_time '
                    'ucs=$upstream_cache_status '
                    'ups=$upstream_status '
                    'upa=$upstream_addr';

access_log /var/log/nginx/access.log main_ext;
```

| 变量 | 用途 |
|------|------|
| `$request_time` | 请求总耗时（秒） |
| `$upstream_response_time` | 上游响应耗时 |
| `$upstream_status` | 上游 HTTP 状态 |
| `$upstream_addr` | 实际打到的上游 |
| `$upstream_cache_status` | 缓存命中情况 |

静态资源可 `access_log off;` 降磁盘 IO。

<!-- 配图占位: 带 upstream 字段的 access 日志样例 | /Linux/nginx/11/p03-01.png -->

---

## 三、按状态码快速归类

| 状态 | 常见原因 |
|------|----------|
| 400/404/405 | 客户端或 location/`try_files` |
| 413 | `client_max_body_size` |
| 421/495/496 | 证书/SNI 相关（视场景） |
| 429/503 | 限流或主动拒绝 |
| 502 | 上游不可连、协议错、过早关闭 |
| 504 | `proxy_read_timeout` 等超时 |
| 500 | 少见来自 Nginx 自身；更多看上游 |

```bash
# 粗看状态分布（示例）
sudo awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head
```

---

## 四、error 日志级别

```nginx
error_log /var/log/nginx/error.log warn;  # 生产常用 warn/error
```

级别从低到高大致：`debug` < `info` < `notice` < `warn` < `error` < `crit` ...

临时排查某连接可用 `debug_connection`（需 **debug 版二进制** 或带 `--with-debug` 编译的包）：

```nginx
error_log /var/log/nginx/error.log debug;
events {
    debug_connection 192.168.1.100;
}
```

官方：[A debugging log](https://nginx.org/en/docs/debugging_log.html)。

---

## 五、原理/性能：日志不是免费的

| 做法 | 影响 |
|------|------|
| 全站详细 access | 磁盘 IO、journaling；高峰可能拖延迟 |
| `debug` 全局 | 日志量爆炸，严重拖慢，**仅短时、限定 IP** |
| 同步写满盘 | 服务异常；监控 `df -h /var` |
| 缓冲/条件日志 | 降压；注意排障时信息是否够 |

建议：生产默认 `warn`；access 用结构化字段但避免超长 `$request_body`；压测环境可关 access 对比基线。

<!-- 配图占位: debug 日志量与延迟风险示意 | /Linux/nginx/11/p04-01.png -->

---

## 六、排障清单（可收藏）

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
ps -ef | grep [n]ginx
sudo ss -tlnp | grep nginx
sudo tail -n 100 /var/log/nginx/error.log
curl -vH 'Host: your.site' http://127.0.0.1/path
df -h /var/cache/nginx /var/log
```

---

## 七、本篇小结

- error 看失败原因，access 看状态与耗时/上游。  
- 自定义 `log_format` 加上 `$upstream_*` / `$request_time`。  
- **debug 仅限临时+定 IP**；日志 IO 本身影响性能。

下一篇收官：**事件模型、worker 调参与生产检查清单**。
