---
title: "Clash Verge TUN 模式下 Git SSH 连接失败的解决过程"
sidebarGroup: "Git / 代理"
shortTitle: "TUN 模式 Git SSH"
order: 11
date: 2026-03-30
category: "工具"
tag:
  - "Git"
  - "GitHub"
  - "Clash Verge"
  - "TUN 模式"
  - "问题解决"
---

## 问题背景

在开启 Clash Verge 的 TUN 模式下，执行 `git pull` 命令时遇到 SSH 连接失败错误：

```
Connection closed by 198.18.0.30 port 22
fatal: Could not read from remote repository.
Please make sure you have the correct access rights
and the repository exists.
```

## 问题分析

### 表面问题
- Git 使用 SSH 协议（22 端口）连接 GitHub
- 连接被阻断，提示 "Connection closed"

### 隐藏问题
- Clash Verge TUN 模式会拦截所有流量（包括 SSH）
- SSH 协议无法直接通过代理隧道
- 需要让 Git 走 HTTP/HTTPS 代理

## 解决过程

### 步骤 1：配置 Git HTTP 代理

首先查看 Clash Verge 的代理端口（通常是 7890，用户的实际端口是 7897）：

```bash
git config --global http.proxy "http://127.0.0.1:7897"
git config --global https.proxy "http://127.0.0.1:7897"
```

### 步骤 2：安装 GitHub CLI

在 MINGW64 环境下，无法使用 winget 或 choco，采用手动下载安装：

```bash
# 下载 GitHub CLI
curl -Ls https://github.com/cli/cli/releases/download/v2.63.2/gh_2.63.2_windows_amd64.zip -o /tmp/gh.zip

# 解压并移动到 PATH
unzip -q /tmp/gh.zip -d /tmp
mv /tmp/bin/gh.exe /usr/bin/
```

### 步骤 3：GitHub 认证

运行 GitHub CLI 登录：

```bash
gh auth login
```

按提示完成 GitHub 账号认证。

### 步骤 4：配置 Git 使用 GitHub CLI 认证

```bash
gh auth setup-git
```

### 步骤 5：切换到 HTTPS 协议

检查当前远程仓库 URL：

```bash
git remote -v
# origin  git@github.com:username/repo.git (fetch)
# origin  git@github.com:username/repo.git (push)
```

将 SSH URL 转换为 HTTPS：

```bash
git remote set-url origin https://github.com/username/repo.git
```

### 步骤 6：验证

```bash
git pull
# Already up to date.
```


### 如果需要移除  设置的全局 Git HTTP 代理，你可以使用 --unset 命令
```
git config --global --unset http.proxy
git config --global --unset https.proxy
```

如何验证是否移除成功？
你可以运行以下命令来查看当前的全局配置列表。如果输出中不再出现 http.proxy 或 https.proxy 相关行，说明已成功移除：
```
git config --global --list
```



## 技术知识点

### TUN 模式 vs 代理模式
- **代理模式（Proxy）**：只代理 HTTP/HTTPS 流量
- **TUN 模式**：拦截所有网络流量，包括 TCP/UDP

### SSH vs HTTPS
- **SSH**：使用 22 端口，需要配置 SSH 密钥
- **HTTPS**：使用 443 端口，可以通过 GitHub CLI 自动处理认证

### Git 认证方式
1. **SSH Key**：传统方式，TUN 模式下可能失效
2. **HTTPS + PAT**：需要创建 Personal Access Token
3. **GitHub CLI**：自动处理认证，推荐使用

## 经验总结

1. **TUN 模式下优先使用 HTTPS**：避免 SSH 协议被拦截
2. **GitHub CLI 是最佳方案**：认证管理更简便，`gh auth setup-git` 自动配置
3. **代理端口因软件而异**：Clash Verge 默认 7890，但需以实际配置为准
4. **记住代理配置命令**：
   ```bash
   git config --global http.proxy "http://127.0.0.1:7897"
   ```

## 相关命令速查

```bash
# 配置代理
git config --global http.proxy "http://127.0.0.1:<端口>"
git config --global https.proxy "http://127.0.0.1:<端口>"

# 查看/修改远程仓库 URL
git remote -v
git remote set-url origin https://github.com/username/repo.git

# GitHub CLI 常用命令
gh auth login      # 登录
gh auth setup-git  # 配置 Git 使用 GitHub CLI 认证
gh auth status     # 查看认证状态
```

---

*本文记录于 2026-03-30，解决环境：Windows + MINGW64 + Clash Verge*
