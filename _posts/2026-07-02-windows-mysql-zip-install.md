---
layout: post
author:     "Corey"
header-img: "img/post-bg-circuit-board.jpg"
header-mask: 0.25
title: "Windows 10 无包管理器环境下，用 ZIP 包安装 MySQL 8.0 的完整复盘"
subtitle: "CDN 404 探测、initialize-insecure、Windows 服务注册全记录"
date: 2026-07-02
tags: [MySQL, Windows, 本地开发, 运维, 问题解决]
---

## 开头：表面问题 vs 真实问题

表面上的目标很简单：**在 Windows 本机安装 MySQL，账号和密码都设为 `root`**。

实际跑下来，隐藏约束比预期多：

1. **没有包管理器** —— 机器上未安装 `winget`、`Chocolatey`
2. **Docker 不可用** —— WSL 异常，无法用容器替代
3. **CDN 版本号陷阱** —— 较新的 MySQL 8.0.x ZIP 链接直接 404，必须先探测可用版本
4. **脚本化安装** —— 需要 ZIP + 初始化 + 服务注册，而不是点安装向导

所以，这次任务的本质不是「装个数据库」，而是：**在没有自动化工具的前提下，找到可用的官方 ZIP 包，并完成初始化、服务注册和密码配置**。

---

## 一、安装前的环境检查

在真正动手之前，先做了环境摸底：

| 检查项 | 结果 |
|--------|------|
| 操作系统 | Windows 10 企业版 LTSC，64 位 |
| 管理员权限 | 有 |
| 已安装 MySQL | 无 |
| winget | 未安装 |
| Chocolatey | 未安装 |
| Docker | WSL 报错，暂不可用 |
| MySQL 服务 | 未检测到 |

结论：**不能走 `winget install MySQL` 或 `choco install mysql` 这类捷径**，只能使用 MySQL 官方 ZIP 包，并手动完成配置。

---

## 二、真实执行时间线

### 2.1 尝试下载较新版本，全部失败

最初尝试直接从 CDN 下载以下 ZIP 包：

- `mysql-8.0.43-winx64.zip`
- `mysql-8.0.42-winx64.zip`
- `mysql-8.0.41-winx64.zip`

结果全部返回 **Not found**。

这说明：**不能假设「最新版本号」一定存在于 CDN 固定路径**，必须先验证 URL 是否可用。

### 2.2 批量探测 CDN，找到可用版本

对多个候选 URL 发送 `HEAD` 请求，逐个确认是否存在：

```powershell
$candidates = @(
  "https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.40-winx64.zip",
  "https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.39-winx64.zip",
  "https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.38-winx64.zip",
  "https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.37-winx64.zip"
)

foreach ($url in $candidates) {
  try {
    $r = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 30
    Write-Host "OK $($r.StatusCode) $url size=$($r.Headers['Content-Length'])"
  } catch {
    Write-Host "FAIL $url"
  }
}
```

最终确认可用的是：

```
https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.37-winx64.zip
```

文件大小约 **242 MB**（242,718,064 bytes）。

### 2.3 下载并解压

```powershell
$installDir = "C:\Program Files\MySQL\MySQL Server 8.0"
$dataDir = "C:\ProgramData\MySQL\MySQL Server 8.0\Data"
$configFile = "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"
$downloadDir = "$env:TEMP\mysql-install"
$zipPath = Join-Path $downloadDir "mysql-8.0.37-winx64.zip"
$url = "https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.37-winx64.zip"

New-Item -ItemType Directory -Force -Path $downloadDir, $dataDir | Out-Null
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
Expand-Archive -Path $zipPath -DestinationPath $installDir -Force
```

解压后，ZIP 内还有一层 `mysql-8.0.37-winx64` 目录，需要把内容**上提一层**，让 `bin`、`lib` 等目录直接位于安装目录下。

### 2.4 编写配置文件 my.ini

MySQL 在 Windows 上需要明确指定 `basedir` 和 `datadir`：

```ini
[mysqld]
basedir=C:\Program Files\MySQL\MySQL Server 8.0
datadir=C:\ProgramData\MySQL\MySQL Server 8.0\Data
port=3306
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
default_authentication_plugin=mysql_native_password

[client]
port=3306
default-character-set=utf8mb4
```

配置文件路径：

```
C:\ProgramData\MySQL\MySQL Server 8.0\my.ini
```

这里额外设置了 `default_authentication_plugin=mysql_native_password`，是为了兼容一些老客户端；如果只用 MySQL 8 自带工具，也可以保留默认的 `caching_sha2_password`。

### 2.5 初始化数据目录

```powershell
& "$installDir\bin\mysqld.exe" --defaults-file="$configFile" --initialize-insecure
```

`--initialize-insecure` 的含义是：

- 创建系统库和数据目录
- **初始不设置 root 密码**
- 便于下一步启动服务后，再用 SQL 主动设置密码

这比安装过程中直接写死密码更灵活，也更适合脚本化安装。

### 2.6 注册并启动 Windows 服务

```powershell
& "$installDir\bin\mysqld.exe" --install MySQL80 --defaults-file="$configFile"
Set-Service MySQL80 -StartupType Automatic
Start-Service MySQL80
```

实际输出：

```
Service successfully installed.
Service status: Running
```

### 2.7 设置 root 密码

服务启动后，执行：

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY 'root';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

这样本地通过 `localhost` 和 `127.0.0.1` 都能用 `root/root` 登录。

### 2.8 加入 PATH 并验证

把以下目录加入系统 PATH：

```
C:\Program Files\MySQL\MySQL Server 8.0\bin
```

验证命令：

```powershell
mysql -u root -proot -e "SELECT VERSION() AS version, USER() AS user;"
```

实际输出：

```
version   user
8.0.37    root@localhost
```

进一步确认：

```powershell
Get-Service MySQL80
netstat -ano | findstr ":3306"
mysql -u root -proot -e "SHOW DATABASES;"
```

结果：

- 服务 `MySQL80`：Running，Automatic
- 端口 `3306` 正在监听
- 默认库正常：`information_schema`、`mysql`、`performance_schema`、`sys`

安装完成。

---

## 三、为什么最终选择 ZIP，而不是 Installer

这次没有选 MySQL Installer，主要原因有三点：

1. **机器缺少包管理器**，无法一条命令安装
2. **多个 MSI / Installer 链接探测失败**，而 ZIP 包路径可用
3. **ZIP 方式更适合脚本化**：下载、解压、写配置、初始化、注册服务、改密码，全流程可重复

如果环境里有 `winget` 或 `Chocolatey`，通常会更省事；但在当前环境下，ZIP 方案是最稳妥的。

---

## 四、相关知识点

### 4.1 `--initialize` 和 `--initialize-insecure` 的区别

- `--initialize`：初始化时会生成随机 root 密码，需要到错误日志里找
- `--initialize-insecure`：初始化后 root 无密码，适合自动化脚本后续自行设密

### 4.2 Windows 下为什么要 `--install`

Linux 上常见做法是 `systemd` 管理服务；Windows 上则由 `mysqld --install` 把 MySQL 注册为系统服务，例如 `MySQL80`。

### 4.3 程序目录和数据目录为什么要分开

- 程序目录：`C:\Program Files\MySQL\MySQL Server 8.0`
- 数据目录：`C:\ProgramData\MySQL\MySQL Server 8.0\Data`

这样升级或替换程序文件时，不会误删业务数据。

### 4.4 弱密码的安全边界

`root/root` 对于本机开发可以接受，但不适合：

- 远程访问
- 多人共用机器
- 生产环境

如果后续要对外开放，务必改成强密码，并限制访问来源。

---

## 五、最终结果

| 项目 | 值 |
|------|-----|
| 版本 | MySQL 8.0.37 |
| 用户名 | root |
| 密码 | root |
| 端口 | 3306 |
| 服务名 | MySQL80 |
| 程序目录 | `C:\Program Files\MySQL\MySQL Server 8.0` |
| 数据目录 | `C:\ProgramData\MySQL\MySQL Server 8.0\Data` |
| 配置文件 | `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini` |

连接方式：

```powershell
mysql -u root -proot
```

或：

```
mysql://root:root@127.0.0.1:3306
```

---

## 六、可复用经验

以后在 Windows 上手动安装 MySQL，可以按这个模型思考：

```text
1. 先检查有没有 winget / choco / Docker
2. 没有的话，优先探测 MySQL CDN 哪些版本真实可用
3. 下载 ZIP，而不是死磕最新版本号
4. 写 my.ini，明确 basedir / datadir
5. initialize-insecure 初始化
6. 注册 Windows 服务并设为自启
7. 启动后再设置 root 密码
8. 用 SELECT VERSION() 和 SHOW DATABASES 做最终验收
```

一句话总结：

> **这次安装的关键，不是「知道怎么装 MySQL」，而是先确认环境约束，再找到真正可下载的官方包，最后用 ZIP + 服务注册的方式完成自动化安装。**

---

## 附：一键安装脚本骨架

如果以后要重装，可以把核心步骤收敛成下面这个 PowerShell 骨架：

```powershell
$installDir = "C:\Program Files\MySQL\MySQL Server 8.0"
$dataDir = "C:\ProgramData\MySQL\MySQL Server 8.0\Data"
$configFile = "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"
$url = "https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.37-winx64.zip"

# 1. 下载并解压
# 2. 写 my.ini
# 3. mysqld --initialize-insecure
# 4. mysqld --install MySQL80
# 5. Start-Service MySQL80
# 6. mysql -u root -e "ALTER USER ..."
# 7. 验证
```

注意：正式使用前，仍建议先 `HEAD` 探测一下 CDN 链接是否还有效。
