---
title: Harbor 私有镜像仓库——按步骤从安装到第一次 push
sidebarGroup: Docker 系列
shortTitle: 10 Harbor 私有仓库
order: 10
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Harbor
  - HTTPS
  - SAN证书
description: Harbor 私有镜像仓库——按步骤从安装到第一次 push，可照做的操作手册
---

> **Docker 系列 · 第 10/24 篇**
> 上一篇：[《Dockerfile 自制镜像——从最小实验到完整静态站案例》](/云原生/docker/docker-10-dockerfile) · 下一篇：[《Docker 网络模式与实操——从 docker0 到 overlay》](/云原生/docker/docker-17-network)

---

## 开头：镜像散落各处，怎样变成「一个港口」？

第 8 篇解决的是**离线搬运**（`save` / `load`）。团队日常还差一步：大家往**同一个私有仓库**里 `push` / `pull`，有网页可以管项目和权限——这就是 **Harbor**。

本篇是**可照做的操作手册**：按 **步骤 1 → 10** 做完，再跟 **拉取运行案例** 与 **团队账号说明**，你应能：

1. 浏览器登录 Harbor  
2. 用 `docker login` / `tag` / `push` 把镜像推进去  
3. 从 Harbor `pull` 镜像并 `run` 起来（见步骤 10 后的案例）  
4. 知道团队场景下何时要登录、如何开账号（勿共用 admin）  

先走 **HTTP** 把整条链路跑通；**HTTPS + 证书**放在文末「可选加固」，不挡主路径。

> **实验环境（本机实装）**：WSL2 Ubuntu + Docker **29.1.2**（Docker Desktop 后端）、Compose **v2.40.3**。Harbor **[v2.15.2](https://github.com/goharbor/harbor/releases/tag/v2.15.2)**（2026-07）。  
> **主路径假设**：一台 **Linux** 机器上同时跑 Harbor 和 `docker` 客户端（最简单）。Docker Desktop 额外注意点见各步骤旁注。  
> 官方文档：[Harbor Installation and Configuration](https://goharbor.io/docs/latest/install-config/)。

### 总路线图（先看一眼再动手）

| 步骤 | 做什么 | 怎样算过关 |
|------|--------|------------|
| **1** | 检查 Docker / Compose | 能看到 Server 版本 |
| **2** | 弄懂 FQDN，写 hosts | `ping` 能解析到本机 IP |
| **3** | 下载并解压安装包 | 目录里有 `install.sh` |
| **4** | 改 `harbor.yml`（只开 HTTP） | hostname / 端口 / 密码 / 数据目录正确，`https` 已注释 |
| **5** | （建议先做）确认 `registry-mirrors` → 再 `prepare` + `install` | 加速见第 4 篇；安装成功 + 容器在跑 |
| **6** | 浏览器登录 UI，认识侧栏 | admin 进入「项目」页；菜单见步骤 6 截图 |
| **7** | 配置 `insecure-registries` | `docker info` 列表里有该地址 |
| **8** | `docker login` | `Login Succeeded`（Desktop 用 `localhost:85`） |
| **9** | UI 创建项目 `demo` | 项目列表出现 demo |
| **10** | `tag` + `push` + UI 核对 | 有 digest；Desktop 用 `localhost:85/...` |
| **案例** | 从 Harbor `pull` + `run` Nginx | `http://127.0.0.1:8088` 出现欢迎页 |
| **团队** | 登录规则、开账号、别共用 admin | 每人/机器人有独立凭据；按项目授权 |
| **可选** | 升级 HTTPS + SAN | 主路径跑通后再做 |

安装目录下文统一为：

```text
/tmp/harbor-install/harbor
```

---

## 步骤 1：检查 Docker 与 Compose

**做什么**：确认引擎能用，后面 Harbor 全靠它拉镜像、起容器。

```bash
docker version
docker compose version
```

本机（WSL）节选：

```text
Server: Docker Engine 29.1.2
Docker Compose version v2.40.3-desktop.1
```

**验收**：`docker version` 的 **Server** 一段有版本号（不是只有 Client）。若没有 Server，先启动 Docker / Docker Desktop。

没有 Compose V2 时，旧命令 `docker-compose` 也可，后文一律写 `docker compose`。

---

## 步骤 2：定访问名（FQDN）并写 hosts

### 2.1 什么是 FQDN？

**FQDN** = **写全了的主机名**，用 `.` 分层。

| 写法 | 例子 | 像什么 |
|------|------|--------|
| 短主机名 | `harbor`、`cdh1` | 只写「小明」——含糊 |
| **FQDN** | `harbor.daemon.io` | 地址写全——明确 |
| IP | `192.168.1.10` | 直接写门牌号 |

Docker 里短名最容易踩坑：

```bash
# 短名：常被当成「Docker Hub 上的用户名 harbor」
docker push harbor/demo/nginx

# FQDN：明确推到你自己的私有仓
docker push harbor.daemon.io/demo/nginx
```

后文 `hostname`、`login`、`tag`、`insecure-registries`、证书一律用 **FQDN 或 IP**。

### 2.2 本篇约定 + 写 hosts

| 项 | 取值 |
|----|------|
| FQDN | `harbor.daemon.io` |
| HTTP 端口 | `85`（避开常用 80；你也可改成 80） |
| 管理员 | `admin` / 密码下文设为 `Harbor12345`（装完请立刻改） |
| 项目 | `demo` |
| 数据目录 | `/data/harbor` |

查本机 IP 并写入 hosts（把 IP 换成你的）：

```bash
hostname -I | awk '{print $1}'
# 假设得到 172.31.73.95，则：
echo '172.31.73.95 harbor.daemon.io' | sudo tee -a /etc/hosts
grep harbor.daemon.io /etc/hosts
```

本机实装时 hosts 为：

```text
172.31.73.95 harbor.daemon.io
```

**验收**：

```bash
ping -c 1 harbor.daemon.io
```

能解析到你写入的 IP（不必要求外网通）。

> Docker Desktop：还要保证 **Windows 的 hosts**（或引擎能解析该名字），否则浏览器 / 引擎可能找不到 `harbor.daemon.io`。

---

## 步骤 3：下载并解压 Harbor 安装包

**做什么**：拿到官方安装脚本。版本以 [Releases](https://github.com/goharbor/harbor/releases) 为准；下文用 **v2.15.2** 在线包（体积小；组件镜像仍要在步骤 5 拉取，请先做好[第 4 篇镜像加速](/云原生/docker/docker-04-install)）。

国内直连 `github.com` 经常很慢或失败，**优先用 GitHub 文件加速前缀**（把完整官方 URL 接在代理后面）。下文默认用本机验证可用的 `ghfast.top`；若失效，换 `gh-proxy.com` 等同类型前缀，或浏览器下好再 `scp` 上来：

```bash
# 目录用当前用户创建即可，不要 sudo mkdir（否则 curl 会 Permission denied）
mkdir -p /tmp/harbor-install && cd /tmp/harbor-install

# 若曾经用 sudo 建过目录，先改回属主再下载：
# sudo chown -R "$USER:$USER" /tmp/harbor-install

# 推荐：国内 GitHub 文件加速（在线包约 12KB；代理失效则换下一个）
curl -fL --retry 3 -o harbor.tgz \
  "https://ghfast.top/https://github.com/goharbor/harbor/releases/download/v2.15.2/harbor-online-installer-v2.15.2.tgz"

# 备用加速前缀（哪个通用来哪个）
# "https://gh-proxy.com/https://github.com/goharbor/harbor/releases/download/v2.15.2/harbor-online-installer-v2.15.2.tgz"

# 外网畅通时可用官方直连
# "https://github.com/goharbor/harbor/releases/download/v2.15.2/harbor-online-installer-v2.15.2.tgz"

tar xzf harbor.tgz
cd harbor
ls
```

内网完全下不了 GitHub 时：在有网机器用上面任一地址下好 `harbor.tgz`，拷到服务器同一目录后再 `tar xzf`。若 Docker Hub 也慢/不通，改下 **offline** 包（体积约数百 MB，但 `install.sh` 少拉外网镜像）：

```bash
# 同样可用加速前缀；文件名换成 offline
curl -fL --retry 3 -o harbor.tgz \
  "https://ghfast.top/https://github.com/goharbor/harbor/releases/download/v2.15.2/harbor-offline-installer-v2.15.2.tgz"
```

**验收**：当前目录能看到这三个文件：

```text
install.sh
prepare
harbor.yml.tmpl
```

---

## 步骤 4：编辑 `harbor.yml`（只开 HTTP）

**做什么**：告诉 Harbor「用什么名字访问、听哪个端口、密码和数据放哪」。HTTP 阶段**先不要启用 https**。

```bash
cd /tmp/harbor-install/harbor
cp harbor.yml.tmpl harbor.yml
sudo mkdir -p /data/harbor
```

用编辑器打开 `harbor.yml`，保证下面几项与示例一致（其余可先保持模板默认）：

```yaml
hostname: harbor.daemon.io

http:
  # port for http, default is 80. If https enabled, this port will redirect to https port
  port: 85

# https:                    # ← 整段 https 都注释掉（行首加 #）
#   port: 443
#   certificate: /your/certificate/path
#   private_key: /your/private/key/path

harbor_admin_password: Harbor12345

data_volume: /data/harbor
```

要点：

1. `hostname` 必须是步骤 2 的 FQDN（或你改用的 IP）  
2. `http.port` 与后面 login/push 端口一致（本文用 `85`）  
3. 模板里的 **`https:` 整块注释掉**，否则会去找证书文件而失败  

**验收**：在文件里搜到 `hostname: harbor.daemon.io`、`port: 85`，且 `https:` 行是注释状态。

---

## 步骤 5：prepare 与 install

**做什么**：生成配置并拉起 Harbor 全部容器。

### 5.0 安装前先确认镜像加速（强烈建议）

在线安装包本身很小；`./install.sh` 会从 Registry **拉取 Harbor 各组件镜像**，国内直连 Docker Hub 时这里往往最慢。

请先按[第 4 篇 · 配置镜像加速](/云原生/docker/docker-04-install)写好 `registry-mirrors`，并验收：

```bash
docker info | grep -A8 'Registry Mirrors'
docker pull alpine:3.21
```

能看到加速地址、且 `pull` 不再长时间卡住，再继续下面的 `prepare` / `install`。  
若完全无外网，改用 Harbor **offline** 安装包（见第 4 篇思路：包提前拷进内网），而不是干等在线拉镜像。

### 5.1 执行安装

```bash
cd /tmp/harbor-install/harbor
sudo ./prepare
sudo ./install.sh
```

成功时末尾类似：

```text
✔ ----Harbor has been installed and started successfully.----
```

再查容器：

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

应能看到 `nginx`、`harbor-core`、`registry`、`harbor-db`、`harbor-portal` 等；`nginx` 端口类似：

```text
0.0.0.0:85->8080/tcp
```

等半分钟让组件变 healthy，再测：

```bash
curl -sI http://harbor.daemon.io:85/ | head -5
curl -s -o /dev/null -w '%{http_code}\n' http://harbor.daemon.io:85/api/v2.0/health
```

本机健康检查曾得到 **`200`**，响应头含：

```text
HTTP/1.1 200 OK
Server: nginx
```

以后启停（始终在**含有 `docker-compose.yml` 的安装目录**执行；若解压多套了一层，可能是 `/tmp/harbor-install/harbor/harbor`）：

```bash
# 先找到真正的安装目录
find /tmp/harbor-install -name docker-compose.yml 2>/dev/null

cd /tmp/harbor-install/harbor   # 或上一步找到的目录
docker compose up -d      # 启动
docker compose stop       # 停止
docker compose restart    # 重启
```

若曾用 `sudo ./prepare` / `sudo ./install.sh`，`common/` 里配置文件往往属主是 **root**，普通用户执行 `docker compose` 会报：

```text
open .../common/config/registryctl/env: permission denied
```

处理：把配置改回当前用户后再 compose（推荐），或临时 `sudo docker compose up -d`：

```bash
sudo chown -R "$USER:$USER" common docker-compose.yml
docker compose up -d
```

**验收**：安装成功字样 + `health` 返回 `200` + `docker ps` 里核心容器为 Up。

---

## 步骤 6：浏览器登录 Web UI

**做什么**：确认「网站」能用，并认一遍控制台布局（后面建项目、看镜像都在这里点）。

### 6.1 打开登录页

在 **Harbor 所在 Linux / WSL** 上，可用：

```text
http://harbor.daemon.io:85/
```

在 **Windows 本机浏览器**访问时（Docker Desktop 已把 85 映射出来），可先用：

```text
http://127.0.0.1:85/
```

若也想用域名，在 Windows 的 `C:\Windows\System32\drivers\etc\hosts`（管理员）增加一行：`127.0.0.1 harbor.daemon.io`，详见前文 Windows 访问说明。

本机登录页（Harbor v2.15.2，界面为中文）：

![Harbor 登录页](/云原生/docker/docker-09-harbor/01-login.png)

1. 用户名：`admin`  
2. 密码：步骤 4 里 `harbor_admin_password`（本文为 `Harbor12345`）  
3. 点击 **登录**

**验收**：进入控制台，而不是停在登录失败。登录后建议立刻改掉默认管理员密码（右上角 `admin` → 改密码/用户设置，以你版本菜单为准）。

### 6.2 登录后主界面（项目页）

登录成功默认进入 **项目** 列表。本机截图：

![Harbor 项目页与侧栏](/云原生/docker/docker-09-harbor/02-projects.png)

页面可以分成三块看：

| 区域 | 你看到什么 | 干什么用 |
|------|------------|----------|
| 顶栏 | Harbor Logo、搜索框、「admin」 | 全局搜索；退出/用户相关操作 |
| **侧栏菜单** | 项目 / 日志 / 系统管理… | 日常切换功能（见下一小节） |
| 主区 | 项目统计、**新建项目**、项目表格 | 创建/进入项目（步骤 9、10 会用到） |

主区表格里本机已有 `library`（安装自带）和 `demo`（若你已创建）；访问级别为「公开」、角色为「项目管理员」等列，用来区分权限与可见性。

### 6.3 侧栏菜单与功能（admin 视角）

侧栏对 **管理员** 会展开「系统管理」子菜单。本机界面名称如下（Harbor 2.15 中文）：

#### 日常最常用

| 菜单 | 作用（白话） | 本篇会不会用到 |
|------|--------------|----------------|
| **项目** | 所有镜像仓库的「文件夹」。`docker push harbor…/demo/nginx` 里的 `demo` 就是一个项目 | ✅ 步骤 9、10：新建项目、看仓库 |
| **日志** | 谁在什么时间 pull/push/删镜像等审计记录 | 排障时查「有没有推成功」 |

日志页本机截图：

![Harbor 日志](/云原生/docker/docker-09-harbor/03-logs.png)

#### 系统管理（展开后）

| 菜单 | 作用（白话） |
|------|--------------|
| **用户管理** | 本地用户增删、是否管理员；多人协作时在这里开账号（做法见后文「团队怎么用」） |
| **机器人账户** | 给 CI/CD 用的令牌账号，别把 admin 密码写进流水线（见后文「团队怎么用」） |
| **仓库管理** | 登记外部 Registry（别的 Harbor / Docker Hub 等），供复制用 |
| **复制管理** | 配置「从 A 仓同步镜像到 B 仓」的规则 |
| **分布式分发** | P2P 分发相关实例（如 Dragonfly）；入门可先忽略 |
| **标签** | 全局标签，给镜像/资源打标记，方便筛选 |
| **项目定额** | 限制每个项目能占多少存储 |
| **审查服务** | 漏洞扫描（Trivy 等）相关配置与任务 |
| **清理服务** | 垃圾回收，清掉已删除镜像留下的层，回收磁盘 |
| **任务中心** | 后台任务队列状态（复制、扫描、GC 等跑没跑完） |
| **配置管理** | 认证方式、邮箱、只读模式等**全局开关** |

用户管理、配置管理本机截图：

![Harbor 用户管理](/云原生/docker/docker-09-harbor/04-users.png)

![Harbor 配置管理](/云原生/docker/docker-09-harbor/05-configs.png)

侧栏底部还有：

- **浅色主题 / 深色主题**：切换 UI 外观  
- **Harbor API V2.0**：打开内置 API 文档（脚本、自动化会用到）

右侧可能还有 **事件日志** 抽屉，显示进行中/失败的后台任务，与「任务中心」互补。

### 6.4 新手只需记住

1. **项目** = 推镜像的命名空间（下一步会「新建项目」）。  
2. **日志** = 出问题先看有没有 push 记录。  
3. **系统管理** = 用户、扫描、清理、全局配置；个人实验前期很少动。  

**验收**：能打开登录页 → 用 admin 登录 → 侧栏能看到「项目」「日志」「系统管理」。

---

## 步骤 7：配置 Docker 客户端（HTTP 白名单）

**做什么**：HTTP 私有仓默认不被 Docker 信任，需要把地址写进 `insecure-registries`。

### 先分清：你到底该改哪份配置？

很多人卡在「改不了 `/etc/docker/daemon.json`」——多半不是权限玄学，而是**改错了路径**。

| 你的环境 | `/etc/docker/daemon.json` 能不能当主配置改？ | 正确做法 |
|----------|-----------------------------------------------|----------|
| **纯 Linux**（systemd 装的 Docker） | ✅ 可以（通常要 `sudo`） | 编辑该文件 → `systemctl restart docker` |
| **Windows + Docker Desktop** | ❌ 不要当主路径 | **Settings → Docker Engine** 里改 JSON → Apply & restart |
| **WSL2 里用 Desktop 的引擎**（`docker context` 常为 `desktop-linux`） | ❌ WSL 里即使有这份文件、属主还是 root | 仍改 **Docker Desktop → Docker Engine**；只 `sudo vim /etc/docker/daemon.json` 往往**不进 Desktop 引擎** |

本机常见现象：

- Windows 资源管理器里**找不到** Linux 路径 `/etc/docker/…`（那是容器/WSL 里的路径）
- WSL 里 `ls -l /etc/docker/daemon.json` 显示属主 `root`，普通用户直接写会失败，需要 `sudo`——但即使用 sudo 改成功，**Desktop 后端也可能完全不读它**
- 只改 `%USERPROFILE%\.docker\daemon.json` 有时只影响客户端侧，**不一定**写进正在跑的引擎

**一句话**：Desktop 用户用图形界面里的 **Docker Engine**；Linux 引擎用户才主攻 `/etc/docker/daemon.json`。

### Linux（systemd）主路径

编辑 `/etc/docker/daemon.json`（没有就新建；已有内容则**合并**字段，不要整文件覆盖丢配置）。最小示例：

```json
{
  "insecure-registries": [
    "harbor.daemon.io:85"
  ]
}
```

若本来就有镜像加速，应类似：

```json
{
  "registry-mirrors": [
    "https://docker.1ms.run"
  ],
  "insecure-registries": [
    "harbor.daemon.io:85"
  ]
}
```

注意：JSON **不要带 BOM**（Windows 记事本另存为有时会加 BOM，Docker 会报 `invalid character 'ï'`）。

然后重启引擎，并确认 Harbor 还在：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
cd /tmp/harbor-install/harbor && docker compose up -d
docker info | grep -A5 'Insecure Registries'
```

**验收**：输出里能看到 `harbor.daemon.io:85`。

### Docker Desktop（Windows / Mac）怎么改

1. 打开 **Docker Desktop → Settings → Docker Engine**
2. 在已有 JSON 上**追加/合并** `insecure-registries`（保留你原来的 `registry-mirrors`、`builder` 等，不要整段抹掉）
3. 点 **Apply & restart**，等引擎起来
4. 本机或 WSL 里执行：`docker info`，确认 **Insecure Registries** 中有 `harbor.daemon.io:85`

合并后形态示例（字段以你界面里已有的为准，只保证 insecure 这一项在）：

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://docker.1ms.run"
  ],
  "insecure-registries": [
    "harbor.daemon.io:85",
    "localhost:85",
    "127.0.0.1:85"
  ]
}
```

> Desktop 本机推送主要靠 `localhost:85`；写上 `harbor.daemon.io:85` 方便以后其它客户端文档统一。引擎侧 `127.0.0.0/8` 往往已在默认 insecure 列表中，显式写出更清晰。

---

## 步骤 8：`docker login`

**做什么**：让 CLI 拿到推送凭证。

### 纯 Linux（Harbor 与 docker 同机）

```bash
docker login harbor.daemon.io:85
# Username: admin
# Password: Harbor12345（或你改过的密码）
```

### Docker Desktop / WSL2 用 Desktop 引擎（本机实装必看）

浏览器能打开 `http://harbor.daemon.io:85` 或 `http://127.0.0.1:85`，**不代表** `docker login harbor.daemon.io:85` 一定成功。

原因：真正发 Registry 请求的是 **Docker Desktop 里的 Linux 引擎（VM）**，不是你的 WSL shell。WSL 的 `/etc/hosts` 把 `harbor.daemon.io` 指到 `172.x` 时，引擎从 VM 再访问该地址，容易 **超时** 或后面 push 时 **502 Bad Gateway**。

本机实测：

| 命令 | 结果 |
|------|------|
| `docker login harbor.daemon.io:85` | 常超时 |
| `docker login localhost:85` / `127.0.0.1:85` | `Login Succeeded` |

因此在 Desktop 上请：

```bash
docker login localhost:85 -u admin
# 密码同上
```

`insecure-registries` 里一般已有 `127.0.0.0/8`（覆盖本机环回）；若仍失败，在 Docker Engine JSON 里再显式加上 `"localhost:85"`、`"127.0.0.1:85"` 后 Apply & restart。

**验收**：出现 `Login Succeeded`。

若报 TLS / 超时：  
- Desktop → 先改用 `localhost:85` 再查 insecure；  
- 纯 Linux → 确认 insecure 含 `harbor.daemon.io:85` 且引擎已重启、JSON 无 BOM。

---

## 步骤 9：创建项目 `demo`

Harbor 里镜像落在「项目」下，名字会出现在 tag 路径里：`…/demo/…`。

### 方式 A：Web UI（推荐新手）

1. 打开 `http://harbor.daemon.io:85/` 并登录  
2. 左侧或顶部进入 **Projects**  
3. 点 **New Project**  
4. Project Name 填：`demo`  
5. 访问级别选 Public 或 Private（实验可选 Public）  
6. 保存后，项目列表中应出现 `demo`

### 方式 B：API（可选）

```bash
printf '%s' '{"project_name":"demo","public":true}' > /tmp/proj.json
curl -s -u 'admin:Harbor12345' -H 'Content-Type: application/json' \
  -X POST 'http://harbor.daemon.io:85/api/v2.0/projects' \
  -d @/tmp/proj.json -w '\nHTTP %{http_code}\n'
```

本机成功时状态码为 **`201`**。

**验收**：UI 项目列表有 `demo`（或 API 返回 201）。

---

## 步骤 10：打 tag、push，并在 UI 核对

**做什么**：完成第一次「使用」闭环。

镜像名格式：

```text
<仓库地址>:<端口>/<项目>/<仓库名>:<标签>
```

### 10.1 纯 Linux：用 FQDN

```bash
docker pull nginx:alpine
docker tag nginx:alpine harbor.daemon.io:85/demo/nginx:alpine
docker push harbor.daemon.io:85/demo/nginx:alpine
```

### 10.2 Docker Desktop（本机 Harbor）：用 localhost

与步骤 8 相同：**本机 Desktop 往本机 Harbor 推，请用 `localhost:85`（或 `127.0.0.1:85`）**，不要用 `harbor.daemon.io:85`。

```bash
docker pull nginx:alpine
docker tag nginx:alpine localhost:85/demo/nginx:alpine
docker push localhost:85/demo/nginx:alpine
```

本机按此路径 push 成功时，末尾类似：

```text
alpine: digest: sha256:1d40e3eb3bf4f138de1d67193f2aa5309fcaf343eb5ffadbf5e9439de1eb1ebb size: 2495
```

过程中层可能先显示 `Unavailable` 再变成 `Pushed`，属重试过程；**以最后是否出现 digest、有无 502 为准**。

#### 若仍用 `harbor.daemon.io:85` 会怎样？

常见报错：

```text
unknown: unexpected status from HEAD request to
http://harbor.daemon.io:85/v2/demo/nginx/blobs/sha256:…: 502 Bad Gateway
```

含义简述：

- **502**：请求到了前面的 nginx，但后面 Registry/链路在引擎那一侧不通或异常（本机 Desktop 场景多为「引擎访问 `harbor.daemon.io`→WSL IP」绕坏了）。  
- UI/`curl` 正常、组件 `healthy`，**仍可能** docker push 502——两者不是同一条网络路径。  
- 处理：改用 `localhost:85` 重新 `login` + `tag` + `push`（见上）。

| 场景 | login / tag / push 里的仓库地址 |
|------|----------------------------------|
| 本机 Docker Desktop ↔ 本机 Harbor | `localhost:85` 或 `127.0.0.1:85` |
| 另一台 Linux 客户端 ↔ 这台 Harbor | `harbor.daemon.io:85`（客户端 hosts + insecure） |
| 纯 Linux 同机 | `harbor.daemon.io:85` 即可 |

本机拉取 nginx 时摘要示例：

```text
Digest: sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752
Status: Image is up to date for nginx:alpine
```

push 成功后：

1. 浏览器打开 `http://127.0.0.1:85/`（或 `http://harbor.daemon.io:85/`）进入项目 **demo**  
2. 应能看到仓库 **nginx**（标签 `alpine`）

其它机器拉取示例：

```bash
docker pull harbor.daemon.io:85/demo/nginx:alpine
```

**验收**：CLI push 成功（有 digest）+ UI 项目 `demo` 下能看到 `nginx`。

![Harbor 登录页](/云原生/docker/docker-09-harbor/成功推送镜像.png)

---

## 案例：从 Harbor 拉取并运行 Nginx

push 只是把镜像「存进仓库」。真正用起来，是：**不从 Docker Hub 拉，而是从自己的 Harbor 拉下来跑**。

下面用你刚推上去的 `demo/nginx:alpine`，在本机走一遍「删本地 → pull → run → 访问」。

### 场景说明

| 角色 | 做什么 |
|------|--------|
| 已完成 | 某人本机把 `nginx:alpine` 打 tag 推到 Harbor 项目 `demo` |
| 本案例 | 模拟「另一台开发机 / 清空本地缓存后」：只从 Harbor 取镜像并启动 |

本机 Docker Desktop 场景继续用 **`localhost:85`**（与步骤 8、10.2 一致）。若是另一台 Linux 访问这台 Harbor，把下面所有 `localhost:85` 换成 `harbor.daemon.io:85`，并做好 hosts + `insecure-registries` + `docker login`。

### 1. 登录（若尚未登录）

```bash
docker login localhost:85
# 用户名 admin，密码与 harbor.yml 中一致（本机实验为 Harbor12345）
```

成功时应看到：

```text
Login Succeeded
```

### 2.（可选）删掉本机同名镜像，强制走 Harbor

若本机还留着刚 push 时的本地副本，`docker pull` 可能几乎不下载。想确认「确实是从 Harbor 拉的」，先删再拉：

```bash
docker rmi localhost:85/demo/nginx:alpine
```

本机曾得到：

```text
Untagged: localhost:85/demo/nginx:alpine
```

### 3. 从 Harbor 拉取

```bash
docker pull localhost:85/demo/nginx:alpine
```

本机成功时类似：

```text
alpine: Pulling from demo/nginx
Digest: sha256:1d40e3eb3bf4f138de1d67193f2aa5309fcaf343eb5ffadbf5e9439de1eb1ebb
Status: Downloaded newer image for localhost:85/demo/nginx:alpine
localhost:85/demo/nginx:alpine
```

要点：

- 仓库路径是 **`demo/nginx`**，不是 Docker Hub 的 `library/nginx`。  
- digest 应与 push 成功时一致（步骤 10 本机为 `sha256:1d40e3eb…`）。  
- 全程走内网 Harbor，**不必再访问 Docker Hub**。

### 4. 运行容器

```bash
docker run -d --name harbor-nginx -p 8088:80 localhost:85/demo/nginx:alpine
```

本机返回容器 ID，例如：

```text
19d285c64473fbe1e2a5d7cc8167bcac5d94c424bd170eaddd4393631394fef4
```

含义：容器内 Nginx 监听 80，映射到宿主机 **8088**（避免和本机其它 80/8080 冲突）。

### 5. 验证服务

```bash
curl -sI http://127.0.0.1:8088/ | head -5
curl -s http://127.0.0.1:8088/ | head -8
```

本机响应摘要：

```text
HTTP/1.1 200 OK
Server: nginx/1.31.3
...
<title>Welcome to nginx!</title>
```

浏览器打开 `http://127.0.0.1:8088/` 也应看到 Nginx 欢迎页。

**验收**：`200 OK` + 欢迎页 HTML → 说明「Harbor 里的镜像」已经能当普通镜像用。

### 6. 清理

```bash
docker stop harbor-nginx
docker rm harbor-nginx
# 需要时可再：docker rmi localhost:85/demo/nginx:alpine
```

### 和「直接 docker pull nginx」差在哪？

| | Docker Hub | 本案例（Harbor） |
|--|------------|------------------|
| 镜像来源 | 公网 | 内网私有仓库 |
| 地址写法 | `nginx:alpine` | `localhost:85/demo/nginx:alpine` |
| 适用 | 个人实验、公开镜像 | 团队统一版本、内网离线/受限环境 |

团队日常可以约定：业务镜像只推 Harbor，部署机只 `pull` Harbor 地址，版本和权限都在 Harbor 项目里管。下一节专门讲：**要不要人人登录、要不要把密码发给所有人**。

---

## 团队怎么用：登录、开账号、别共用 admin

个人实验用 `admin` 推一把镜像没问题。Harbor 一旦给**整组开发**用，就要分清两件事：

1. **什么时候必须 `docker login`？**  
2. **账号怎么发？——绝不要把 `admin` 密码告诉所有人。**

### 使用 Harbor 一定要登录吗？

| 操作 | 公开项目（Public） | 私有项目（Private） |
|------|-------------------|---------------------|
| **pull** | 通常**可不登录**（匿名拉取） | **必须登录** |
| **push** | **必须登录** | **必须登录** |
| 进 Web 管项目 / 看设置 | **必须登录** | **必须登录** |

结合本篇：

- 步骤 9 里若把 `demo` 建成**公开**项目，同事在配好 `insecure-registries`（以及跨机时的 hosts）后，有时可以直接：

  ```bash
  docker pull localhost:85/demo/nginx:alpine
  # 跨机则多为：docker pull harbor.daemon.io:85/demo/nginx:alpine
  ```

  不必先 login。  
- 一要 **`docker push`**，就一定要有账号，并且该账号对该项目有推送权限。  
- 案例里的 `docker login`：本机刚 push 过、或项目是私有时，登录最省事；公开项目仅 pull 时可以跳过。

**选型直觉**：基础镜像、只读公共库 → 可公开，方便大家匿名 pull；业务/含密钥配置的镜像 → 用**私有项目**，强制登录。

### 不要把 admin 密码发给全员

`admin` 是整仓最高权限：能删项目、改全局配置、清镜像。泄露等于把仓库钥匙给所有人。

正确做法：**每人（或每个自动化任务）用自己的凭据**，`admin` 只留给 1～2 个运维。

### 推荐落地（小团队）

#### 1. 为每个人创建本地用户

侧栏：**系统管理 → 用户管理 → 创建用户**。

![Harbor 用户管理](/云原生/docker/docker-09-harbor/04-users.png)

- 用户名、邮箱、密码各自一套（可要求对方首次登录后改密）。  
- **不要**把这些账号勾成系统管理员（除非对方真要管整台 Harbor）。

#### 2. 按项目加人，而不是人人 admin

打开具体项目（如 `demo`）→ **成员**（或「成员管理」，以你版本文案为准）→ 添加用户，并选角色，例如：

| 常见角色（名称因语言包略有差异） | 大致权限 |
|----------------------------------|----------|
| **访客 / Guest** | 一般只能 pull |
| **开发人员 / Developer** | 可 pull、push |
| **维护人员 / Maintainer** | 比开发多一些项目管理能力 |
| **项目管理员 / Project Admin** | 管该项目成员与设置（仍不等于整站 admin） |

开发日常推镜像：给 **Developer** 即可。

#### 3. CI / 脚本用机器人账户

侧栏：**系统管理 → 机器人账户**（也有项目级 Robot，视版本而定）。

- 给 Jenkins / GitLab CI / GitHub Actions 发**专用 Token**。  
- **不要**把个人密码或 `admin` 密码写进流水线变量长期共用。

#### 4. 人多时接公司账号体系

**系统管理 → 配置管理** 可改认证方式（如 LDAP / OIDC）。人少时本地用户够用；人一多，用域账号登录更省事、也好回收权限。

### 一张表对照

| 做法 | 是否推荐 | 说明 |
|------|----------|------|
| 全员共用 `admin` / `Harbor12345` | ❌ | 权限过大、无法追责、离职难收回 |
| 每人本地用户 + 项目成员角色 | ✅ 小团队首选 | 步骤见上 |
| 公开项目匿名 pull + 开发账号 push | ✅ 很常见 | 拉基础镜像省事，推送仍可控 |
| 私有项目 + 全员登录 | ✅ 业务镜像 | 权限更严 |
| Robot 给 CI | ✅ | 与人对账分离 |
| LDAP / OIDC | ✅ 中大型团队 | 少维护一堆本地密码 |

**一句话**：Harbor 给团队用时——**pull 看项目是否公开；push 一定要登录；密码按人/按机器人发，永远别群发 admin。**

---

## 做到这里你已经完成主路径

| 已具备 | 说明 |
|--------|------|
| Harbor 服务 | 步骤 5 |
| Web 管理 | 步骤 6、9 |
| CLI 推送 | 步骤 7～10 |
| 从 Harbor 拉取并运行 | 上文「案例」 |
| 团队账号与权限思路 | 上文「团队怎么用」 |

日常实验到此够用。下面是**可选**：去掉 HTTP 明文、用 HTTPS + 自签证书。

---

## 可选：升级 HTTPS + SAN（加固）

适合：内网也想去掉 `insecure-registries`，或需要浏览器/客户端走 HTTPS。

### 可选-A：为什么要 SAN？

较新 Docker / Go 校验证书时**优先看 SAN**。只有 CN、没有 SAN 时常见：

```text
x509: certificate relies on legacy Common Name field
```

规则：`harbor.yml` 的 `hostname`、证书 SAN、`docker login`/`tag` 三者一致。

### 可选-B：生成 CA 与服务器证书

```bash
sudo mkdir -p /data/harbor-certs && cd /data/harbor-certs

openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -sha512 -days 3650 \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=lab/OU=docker/CN=harbor-ca" \
  -key ca.key -out ca.crt

openssl genrsa -out harbor.daemon.io.key 4096
openssl req -sha512 -new \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=lab/OU=docker/CN=harbor.daemon.io" \
  -key harbor.daemon.io.key -out harbor.daemon.io.csr

# IP 换成步骤 2 的真实 IP
cat > v3.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:harbor.daemon.io,IP:172.31.73.95
EOF

openssl x509 -req -sha512 -days 3650 \
  -extfile v3.ext -CA ca.crt -CAkey ca.key -CAcreateserial \
  -in harbor.daemon.io.csr -out harbor.daemon.io.crt

cp harbor.daemon.io.crt harbor.daemon.io.cert
openssl x509 -in harbor.daemon.io.crt -noout -ext subjectAltName
```

本机曾得到：

```text
X509v3 Subject Alternative Name:
    DNS:harbor.daemon.io, IP Address:172.31.73.95
```

### 可选-C：改回启用 https 并重装配置

编辑 `/tmp/harbor-install/harbor/harbor.yml`：

```yaml
hostname: harbor.daemon.io

http:
  port: 80

https:
  port: 443
  certificate: /data/harbor-certs/harbor.daemon.io.cert
  private_key: /data/harbor-certs/harbor.daemon.io.key
```

```bash
cd /tmp/harbor-install/harbor
sudo ./prepare
sudo ./install.sh
```

**验收**：

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://harbor.daemon.io/api/v2.0/health
```

应为 `200`。浏览器访问 `https://harbor.daemon.io/`（自签证书会有告警，内网可先继续）。

### 可选-D：客户端信任 CA，再 login / push

```bash
sudo mkdir -p /etc/docker/certs.d/harbor.daemon.io
sudo cp /data/harbor-certs/ca.crt /etc/docker/certs.d/harbor.daemon.io/ca.crt
sudo systemctl restart docker
cd /tmp/harbor-install/harbor && docker compose up -d
```

从 `daemon.json` **删掉** `harbor.daemon.io:85` 的 insecure 项后重启引擎，然后：

```bash
docker login harbor.daemon.io
docker tag nginx:alpine harbor.daemon.io/demo/nginx:alpine
docker push harbor.daemon.io/demo/nginx:alpine
```

注意：HTTPS 走 443 时，tag **一般不再写 `:85`**。

---

## 排障 checklist

| 卡在哪一步 | 常见现象 | 处理 |
|------------|----------|------|
| 1 | 没有 Server | 启动 Docker / Desktop |
| 2 | ping 不到名字 | 检查 `/etc/hosts`（Linux）或 Windows `hosts` |
| 3 | `Failed to open … Permission denied` | `/tmp/harbor-install` 属主是 root：`sudo chown -R "$USER:$USER" /tmp/harbor-install` 后再 curl |
| 3 | `curl` GitHub 很慢 / 失败 | 换步骤 3 里的 **加速前缀**（本机可用 `ghfast.top`）；或浏览器下好再拷；勿与「install 拉镜像慢」混淆（后者看第 4 篇 mirrors） |
| 4～5 | prepare 要证书 | `https` 块没注释干净 |
| 5 | `install.sh` 拉镜像极慢 / 超时 | 先做[第 4 篇镜像加速](/云原生/docker/docker-04-install)；或改用 offline 安装包 |
| 5 | 端口冲突 | 换 `http.port` 或释放 85 |
| 5 | `docker compose`：`…/registryctl/env: permission denied` | `sudo` 装过后 `common/` 属 root：`sudo chown -R "$USER:$USER" common docker-compose.yml` |
| 6 | Windows 浏览器打不开域名 | 用 `http://127.0.0.1:85/`；或 Windows hosts 加 `127.0.0.1 harbor.daemon.io` |
| 6 | 打不开网页 | hosts、防火墙、`docker ps` 看 nginx 映射 |
| 7 | 改了 WSL 的 `/etc/docker/daemon.json` 不生效 | Desktop 用户改 **Settings → Docker Engine**；确认 JSON 无 BOM |
| 7～8 | login 超时 / TLS（Desktop） | 改用 `docker login localhost:85`；不要死磕 `harbor.daemon.io:85` |
| 7～8 | login 超时 / TLS（纯 Linux） | insecure 含 `host:port`；引擎已重启；JSON 无 BOM |
| 10 | 推到 docker.io | tag 必须带仓库地址与端口，如 `localhost:85/demo/...` |
| 10 | `502 Bad Gateway` + 层 `Unavailable`（Desktop） | UI 虽正常，引擎访问 `harbor.daemon.io` 失败；改用 `localhost:85` 重新 login/tag/push |
| 可选 HTTPS | unknown authority | `certs.d/.../ca.crt` + 重启 Docker |
| Desktop | 同机 login/push 失败 | insecure 进 Engine；推送地址用 **localhost:85** |

**铁律**：改访问名时，hosts、`harbor.yml` 的 `hostname`、证书 SAN、`login`/`tag` 一起改。  
**Desktop 铁律**：浏览器可以用域名或 `127.0.0.1`；**docker login/push 优先 `localhost:85`**。

---

## 和系列其它篇

| 需求 | 篇目 |
|------|------|
| 安装 Docker、**配置 registry-mirrors** | [第 4 篇](/云原生/docker/docker-04-install) |
| 离线 `save`/`load`、tag 命名 | [第 8 篇](/云原生/docker/docker-08-image-transfer) |
| Harbor 安装到 push（本篇） | 本文 |
| Dockerfile 构建后再发布 | [第 9 篇](/云原生/docker/docker-10-dockerfile) |
| `daemon.json` 全貌 | [第 24 篇](/云原生/docker/docker-23-daemon-ops) |

---

## 小结

1. 按 **步骤 1～10** 走完 = Harbor 可安装、可登录、可 push；再跟案例 = 能从 Harbor pull 并 run。  
2. **团队**：公开项目可匿名 pull；**push 必须登录**；**勿共用 admin**，用本地用户 / Robot + 项目角色。  
3. **先 HTTP 闭环，再考虑 HTTPS**。  
4. 名字用 **FQDN 或 IP**，短主机名容易推错到 Docker Hub。  
5. **Docker Desktop 本机推送**：login/tag/push 用 **`localhost:85`**，避免 `harbor.daemon.io` 在引擎侧 502/超时。  
6. 每一步都有**验收**；过不了先查排障表，再往下。

---

## 思考题

> 若步骤 10 写成 `docker push demo/nginx:alpine`（没有仓库地址），镜像会往哪推？若升 HTTPS 后 tag 仍带着 `:85`，又会发生什么？

下一篇见 🐳
