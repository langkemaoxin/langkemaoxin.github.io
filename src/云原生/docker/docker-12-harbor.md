---
title: Harbor 私有镜像仓库——从检查环境到浏览器能登录
sidebarGroup: Docker 系列
shortTitle: 12 Harbor 安装
order: 12
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Harbor
  - HTTPS
  - SAN证书
description: 只讲 Harbor 怎么装：检查 Docker、改 harbor.yml、prepare/install，直到浏览器能用 admin 登录。拉镜像和推镜像见下一篇。
---

> **Docker 系列 · 第 12/33 篇**
> 上一篇：[《buildx 与多平台构建——从一个镜像滚到 amd64+arm64 双架构》](/云原生/docker/docker-11-buildx-bake) · 下一篇：[《Harbor 使用——用案例拉取与推送镜像》](/云原生/docker/docker-13-harbor-usage)

---

## 开头：本篇只装 Harbor

第 8 篇是离线 `save` / `load`。团队要共用镜像，还需要一个**私有仓库**——Harbor。

**本篇停在「服务起来、网页能登录」。** 从仓库拉镜像、把自己做的镜像推上去，全部放到[下一篇](/云原生/docker/docker-13-harbor-usage)，用案例讲。

先走 **HTTP**；HTTPS 放在文末可选，不挡安装。

> **实验环境（本机实装）**：WSL2 Ubuntu + Docker **29.1.2**（Docker Desktop 后端）、Compose **v2.40.3**。Harbor **[v2.15.2](https://github.com/goharbor/harbor/releases/tag/v2.15.2)**（2026-07）。
> **假设**：一台 Linux 上安装 Harbor。Docker Desktop 注意点见各步骤旁注。
> 官方文档：[Harbor Installation and Configuration](https://goharbor.io/docs/latest/install-config/)。

安装目录：`/tmp/harbor-install/harbor`。实验约定：FQDN `harbor.daemon.io`，HTTP 端口 `85`，管理员 `admin` / `Harbor12345`（装完请改密）。

| 步骤 | 做什么 | 怎样算过关 |
|------|--------|------------|
| **1** | 检查 Docker / Compose | 能看到 Server 版本 |
| **2** | 弄懂 FQDN，写 hosts | `ping` 能解析到本机 IP |
| **3** | 下载并解压安装包 | 目录里有 `install.sh` |
| **4** | 改 `harbor.yml`（只开 HTTP） | hostname / 端口 / 密码 / 数据目录正确，`https` 已注释 |
| **5** | 确认 `registry-mirrors` → `prepare` + `install` | 安装成功 + 容器在跑 |
| **6** | 浏览器登录 UI | admin 进入「项目」页 |
| **可选** | HTTPS + SAN | `https://` 健康检查返回 200 |

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

![Harbor 登录页](/云原生/docker/docker-12-harbor/01-login.png)

1. 用户名：`admin`  
2. 密码：步骤 4 里 `harbor_admin_password`（本文为 `Harbor12345`）  
3. 点击 **登录**

**验收**：进入控制台，而不是停在登录失败。登录后建议立刻改掉默认管理员密码（右上角 `admin` → 改密码/用户设置，以你版本菜单为准）。

### 6.2 登录后主界面（项目页）

登录成功默认进入 **项目** 列表。本机截图：

![Harbor 项目页与侧栏](/云原生/docker/docker-12-harbor/02-projects.png)

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

![Harbor 日志](/云原生/docker/docker-12-harbor/03-logs.png)

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

![Harbor 用户管理](/云原生/docker/docker-12-harbor/04-users.png)

![Harbor 配置管理](/云原生/docker/docker-12-harbor/05-configs.png)

侧栏底部还有：

- **浅色主题 / 深色主题**：切换 UI 外观  
- **Harbor API V2.0**：打开内置 API 文档（脚本、自动化会用到）

右侧可能还有 **事件日志** 抽屉，显示进行中/失败的后台任务，与「任务中心」互补。

### 6.4 新手只需记住

1. **项目** = 镜像的命名空间。新建项目、push / pull 见[下一篇使用手册](/云原生/docker/docker-13-harbor-usage)。  
2. **日志** = 出问题先看有没有 push 记录。  
3. **系统管理** = 用户、扫描、清理、全局配置；个人实验前期很少动。  

**验收**：能打开登录页 → 用 admin 登录 → 侧栏能看到「项目」「日志」「系统管理」。

---


**验收（安装结束）**：步骤 5 容器 Up，步骤 6 能用 admin 进「项目」页。到这里 Harbor 已经装好。

接下来：[《Harbor 使用——用案例拉取与推送镜像》](/云原生/docker/docker-13-harbor-usage)。

---

## 可选：升级 HTTPS + SAN（装好 HTTP 之后）

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


---

## 排障 checklist（安装）

| 卡在哪一步 | 常见现象 | 处理 |
|------------|----------|------|
| 1 | 没有 Server | 启动 Docker / Desktop |
| 2 | ping 不到名字 | 检查 `/etc/hosts`（Linux）或 Windows `hosts` |
| 3 | `Failed to open … Permission denied` | `/tmp/harbor-install` 属主是 root：`sudo chown -R "$USER:$USER" /tmp/harbor-install` 后再 curl |
| 3 | `curl` GitHub 很慢 / 失败 | 换步骤 3 里的加速前缀；或浏览器下好再拷 |
| 4～5 | prepare 要证书 | `https` 块没注释干净 |
| 5 | `install.sh` 拉镜像极慢 / 超时 | 先做[第 4 篇镜像加速](/云原生/docker/docker-04-install)；或改用 offline 安装包 |
| 5 | 端口冲突 | 换 `http.port` 或释放 85 |
| 5 | `docker compose`：`…/registryctl/env: permission denied` | `sudo chown -R "$USER:$USER" common docker-compose.yml` |
| 6 | Windows 浏览器打不开域名 | 用 `http://127.0.0.1:85/`；或 Windows hosts 加 `127.0.0.1 harbor.daemon.io` |
| 6 | 打不开网页 | hosts、防火墙、`docker ps` 看 nginx 映射 |
| 可选 HTTPS | unknown authority | `certs.d/.../ca.crt` + 重启 Docker |

**铁律**：改访问名时，hosts、`harbor.yml` 的 `hostname`、证书 SAN 一起改。

---

## 和系列其它篇

| 需求 | 篇目 |
|------|------|
| 安装 Docker、registry-mirrors | [第 4 篇](/云原生/docker/docker-04-install) |
| 离线 save/load | [第 8 篇](/云原生/docker/docker-08-image-transfer) |
| **从 Harbor 拉取 / 把自己的镜像推上去** | [Harbor 使用](/云原生/docker/docker-13-harbor-usage) |
| Dockerfile 构建 | [第 9 篇](/云原生/docker/docker-09-dockerfile) |
| daemon.json | [第 28 篇](/云原生/docker/docker-28-daemon-ops) |

---

## 小结

1. 本篇只把 Harbor **装起来**：容器 Up + 浏览器能用 admin 登录。
2. 先 HTTP；HTTPS 是可选加固。
3. 拉镜像、推镜像不在本篇，见[使用手册](/云原生/docker/docker-13-harbor-usage)。

---

## 思考题

> `harbor.yml` 里 `https` 块没注释干净时，`prepare` 会要证书。为什么安装主路径要先只开 HTTP？

下一篇：[《Harbor 使用——用案例拉取与推送镜像》](/云原生/docker/docker-13-harbor-usage)
