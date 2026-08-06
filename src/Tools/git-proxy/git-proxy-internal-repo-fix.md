---
title: "Git 全局代理导致内网仓库拉取失败的解决过程"
sidebarGroup: "Git / 代理"
shortTitle: "Git 代理与内网仓库"
order: 10
date: 2026-03-30
category: "工具"
tag:
  - "Git"
  - "代理"
  - "内网仓库"
  - "问题解决"
---

## 问题背景

在开启 Clash Verge TUN 模式后，为了解决 GitHub 的 SSH 连接问题，之前配置了全局 Git 代理：

```bash
git config --global http.proxy "http://127.0.0.1:7897"
git config --global https.proxy "http://127.0.0.1:7897"
```

随后在拉取内网 GitLab 仓库时遇到错误：

```
fatal: unable to access 'http://bitcentos.jzfz.local/run/jzfz.platform.specialproject.git/': 
Failed to connect to bitcentos.jzfz.local port 80 via 127.0.0.1 after 2053 ms: Could not connect to server
```

## 问题分析

### 表面问题
- Git 尝试通过代理连接内网地址
- 代理服务器无法访问内网（`bitcentos.jzfz.local`）

### 隐藏问题
- 全局代理配置对所有 Git 仓库生效
- 内网地址不应走代理，需要直连
- Git 代理配置的优先级和作用范围

## 解决过程

### 第一次尝试：仅对 GitHub 配置代理

```bash
# 取消全局代理
git config --global --unset http.proxy
git config --global --unset https.proxy

# 只对 GitHub 单独配置代理
git config --global http.https://github.com.proxy "http://127.0.0.1:7897"
git config --global https.https://github.com.proxy "http://127.0.0.1:7897"
```

结果：仍然失败，因为项目级别可能还有代理配置。

### 第二次尝试：在项目目录禁用代理

```bash
cd /path/to/internal/project
git config http.proxy ""
git config https.proxy ""
```

在项目目录下执行：

```bash
git config http.proxy ""
git config https.proxy ""
```

结果：成功解决，项目可以正常 `git pull`。

## 技术知识点

### Git 代理配置层级

Git 代理配置有三个层级，按优先级从高到低：

1. **仓库级配置**（项目目录下 `.git/config` 或 `git config`）
   ```bash
   git config http.proxy ""
   ```

2. **全局级配置**（`~/.gitconfig`）
   ```bash
   git config --global http.proxy "http://proxy:port"
   ```

3. **系统级配置**（`/etc/gitconfig`）
   ```bash
   git config --system http.proxy "http://proxy:port"
   ```

### 代理配置的清除

```bash
# 清除全局代理
git config --global --unset http.proxy
git config --global --unset https.proxy

# 清除当前仓库代理
git config --unset http.proxy
git config --unset https.proxy
```

### 只对特定域名配置代理

可以使用 `url.<base>.insteadOf` 来实现更精细的控制：

```bash
# GitHub 走代理，其他直连
git config --global http.https://github.com.proxy "http://127.0.0.1:7897"
git config --global https.https://github.com.proxy "http://127.0.0.1:7897"
```

或者使用 `insteadOf`：

```bash
# 所有 github.com 的请求走 HTTPS
git config --global url."https://github.com/".insteadOf "git@github.com:"
```

## 经验总结

1. **避免全局代理**：尽量不要配置全局 Git 代理，这会影响所有仓库

2. **分层配置**：内网开发时，优先使用项目级或仓库级代理配置

3. **常用场景配置**：
   - 外网 GitHub：配置代理或使用 GitHub CLI
   - 内网 GitLab：直连，不走代理
   - 混合环境：按域名/项目单独配置

4. **检查代理配置的顺序**：
   ```bash
   # 查看各层级代理配置
   git config --list --show-origin
   ```

## 相关命令速查

```bash
# 查看当前所有代理配置
git config --list --show-origin | grep proxy

# 清除全局代理
git config --global --unset http.proxy
git config --global --unset https.proxy

# 清除当前仓库代理
git config --unset http.proxy
git config --unset https.proxy

# 只对 GitHub 配置代理
git config --global http.https://github.com.proxy "http://127.0.0.1:7897"

# 对特定项目禁用代理
cd /path/to/project
git config http.proxy ""
git config https.proxy ""
```

---

*本文记录于 2026-03-30*
