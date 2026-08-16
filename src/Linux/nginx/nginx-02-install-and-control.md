---
title: Ubuntu 安装 Nginx 与进程控制——apt、官方源与优雅重载
sidebarGroup: Nginx
shortTitle: 02 安装与进程控制
order: 2
date: 2026-08-16T00:00:00.000Z
category: Linux
tag:
  - Nginx
  - Ubuntu
  - systemd
  - 运维
description: 在 Ubuntu 上用 apt 默认源或 nginx.org 官方源安装 Nginx Open Source，用 systemctl 与信号完成 start/reload/quit，理解优雅重载与硬重启的差别。
---

> **Nginx 系列 · 第 2/12 篇**  
> 上一篇：[《Nginx 是什么》](/Linux/nginx/nginx-01-what-is-nginx) · 下一篇：[《配置体系与请求处理》](/Linux/nginx/nginx-03-config-and-request)  
> 环境：**Ubuntu 22.04 / 24.04 LTS**。写作时官方包版本对应 **stable ≈ 1.30.x、mainline ≈ 1.31.x**（以你机器 `nginx -v` 为准）。

---

## 开头：先跑起来，再谈配置

空谈 `proxy_pass` 之前，运维要先保证三件事：装对包、服务由 systemd 管着、改配置能 **校验 + 热加载** 而不丢连接。

<!-- 配图占位: Ubuntu 上 Nginx 安装与控制路径总览 | /Linux/nginx/02/p01-01.png -->

官方参考：[Installing NGINX Open Source](https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/)、[Controlling nginx](https://nginx.org/en/docs/control.html)。

---

## 一、两条安装路径怎么选

| 方式 | 优点 | 注意 |
|------|------|------|
| **Ubuntu 默认仓库** `apt install nginx` | 一步到位，和系统集成好 | 版本往往滞后于 nginx.org |
| **nginx.org 官方源** | 可跟 **stable / mainline** 最新包 | 需配 keyring、源、可选 pin |

生产若要跟安全修复与新特性，优先官方源；实验机、只要「能反代」用默认源也够。

**Stable vs Mainline**：stable 偏生产稳妥；mainline 功能更新更快。官方说明见 [Stable and mainline](https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/#stable-and-mainline-versions)。本系列命令以官方源 **stable** 为主，换 mainline 只改源地址即可。

---

## 二、方式 A：Ubuntu 默认源（最快）

```bash
sudo apt update
sudo apt install -y nginx
nginx -v
sudo systemctl enable --now nginx
sudo systemctl status nginx --no-pager
```

浏览器访问 `http://<服务器IP>/`，应看到默认欢迎页。防火墙若开了 ufw：

```bash
sudo ufw allow 'Nginx Full'   # 或分别 allow 80,443
sudo ufw status
```

<!-- 配图占位: apt 安装成功与默认欢迎页 | /Linux/nginx/02/p02-01.png -->

Ubuntu 包常见路径：

| 路径 | 用途 |
|------|------|
| `/etc/nginx/nginx.conf` | 主配置 |
| `/etc/nginx/sites-available/`、`sites-enabled/` | 站点（软链启用） |
| `/var/log/nginx/` | access / error 日志 |
| `/var/www/html` | 默认站点根目录 |
| `/usr/share/nginx/` | 包自带静态资源等 |

> 官方 nginx.org 包的目录布局与 Debian/Ubuntu 包略有差异（不一定用 sites-available 这一套）。下文以 **Ubuntu 包布局** 写示例；若你装的是官方包，把站点写进 `conf.d/*.conf` 或改 `nginx.conf` 的 `include` 即可，指令本身相同。

---

## 三、方式 B：nginx.org 官方源（推荐跟版）

按官方 Ubuntu 流程（摘要，完整步骤以文档为准）：

```bash
sudo apt update
sudo apt install -y curl gnupg2 ca-certificates lsb-release ubuntu-keyring

curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
  | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null

# stable
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
https://nginx.org/packages/ubuntu $(lsb_release -cs) nginx" \
  | sudo tee /etc/apt/sources.list.d/nginx.list

# 若要 mainline，把上面 URL 换成：
# https://nginx.org/packages/mainline/ubuntu

# 让 apt 优先选 nginx.org 的包
echo -e "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" \
  | sudo tee /etc/apt/preferences.d/99nginx

sudo apt update
sudo apt install -y nginx
nginx -v
sudo systemctl enable --now nginx
```

<!-- 配图占位: 配置 nginx.org 源与 pin 优先级 | /Linux/nginx/02/p03-01.png -->

动态模块（如 `nginx-module-njs`）可按需 `apt install`，再在配置里 `load_module`。见官方 [Dynamic modules](https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/#dynamic-modules)。

---

## 四、systemd 日常操作

```bash
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx    # 硬重启进程（会断连接）
sudo systemctl reload nginx     # 优雅重载配置（优先）
sudo systemctl status nginx
```

校验配置再 reload（习惯养成）：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

<!-- 配图占位: nginx -t 通过后 reload | /Linux/nginx/02/p04-01.png -->

---

## 五、原理：信号与优雅重载

Nginx 认的是发给 **master** 的信号（也可用 `nginx -s <信号>`）：

| 信号 / `-s` | 效果 |
|-------------|------|
| `reload` / `HUP` | 重新加载配置，优雅替换 worker |
| `quit` / `QUIT` | 优雅退出（处理完再停） |
| `stop` / `TERM` | 快速停止 |
| `reopen` / `USR1` | 重新打开日志文件（配合 logrotate） |

**reload 在干什么（性能相关）**：

1. master 解析新配置，失败则保持旧配置继续跑（`-t` 已大幅降低此风险）。
2. 拉起 **新 worker**。
3. 旧 worker 不再接新连接，把存量请求做完后退出。

因此：长连接、大文件上传期间 reload，旧连接仍可能挂在旧 worker 上一段时间——这是预期行为，不是「没 reload 成功」。

`restart` / `stop`+`start` 会拆掉监听与连接，适合升级二进制或排查卡死；**日常改配置用 reload**。

<!-- 配图占位: reload 时新旧 worker 交替示意 | /Linux/nginx/02/p05-01.png -->

查看进程：

```bash
ps -ef | grep [n]ginx
# 或
sudo systemctl show nginx -p MainPID
```

---

## 六、安装后 5 分钟自检

```bash
curl -I http://127.0.0.1/
sudo nginx -t
ls -l /etc/nginx/
sudo tail -n 20 /var/log/nginx/error.log
```

若 `bind() failed (98: Address already in use)`：80/443 被占用，用 `sudo ss -tlnp | grep -E ':80|:443'` 查冲突（常见 Apache、其他容器映射）。

---

## 七、本篇小结

- Ubuntu 可走 **默认 apt** 或 **nginx.org 官方源**；生产跟版用官方源 + pin。
- 日常：`nginx -t && systemctl reload nginx`。
- reload = 优雅换 worker；restart = 断连接，非必要不用。

下一篇：读懂 `nginx.conf` 上下文，并用最小站点看清「请求如何被选中」。
