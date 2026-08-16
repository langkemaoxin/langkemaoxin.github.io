---
title: Harbor 私有镜像仓库——HTTPS、SAN 证书与 push 金路径
sidebarGroup: Docker 系列
shortTitle: 09 Harbor 私有仓库
order: 9
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Harbor
  - HTTPS
  - SAN证书
description: Harbor 私有镜像仓库——HTTPS、SAN 证书与 push 金路径
---

> **Docker 系列 · 第 9/18 篇**  
> 上一篇：[《Docker 本地镜像载入与载出》](/云原生/docker/docker-08-image-transfer)  
> 下一篇：[《Dockerfile 自制镜像》](/云原生/docker/docker-10-dockerfile)

---

## 开头：团队镜像散落各处，怎么统一管理？

开发 A 把镜像 push 到自己的笔记本 Registry，测试 B 从另一个地址 pull，CI 又写死了 Docker Hub——**三套源、三种 tag 规则**，上线前才发现镜像对不上。

第 8 篇用 `save/load` 解决「离线搬运」；日常协作则需要一座**港口（Harbor）**：Web UI、项目/RBAC、漏洞扫描，以及按 layer 增量的 `push`/`pull`。

本篇只走一条**金路径**：

> 先钉死 FQDN → 生成**带 SAN** 的 HTTPS 证书 → 安装 Harbor → 客户端信任 → `login` / `tag` / `push`。

踩坑（无 SAN、短 hostname 推到 docker.io、证书域名不一致）收成文末 checklist，不当主线重演。

---

## 一、Harbor 相对裸 Registry 多什么？

| 能力 | 说明 |
|------|------|
| **分层传输** | 按 layer 增量同步，比每次全量 tar 省 |
| **Web UI** | 登录、搜镜像、公有/私有项目 |
| **权限（RBAC）** | 按项目分配 push / pull / 管理 |
| **扫描等企业能力** | 漏洞扫描、复制策略等（装好即可在 UI 里开） |

Harbor 用 Compose 编排一堆组件；宿主机需已安装 **Docker Engine**，并用 **Compose V2**（`docker compose`；旧文档里的 `docker-compose` 同理）。

---

## 二、实验约定（先钉死，后面少返工）

全文示例统一用下面这套——**`hostname`、证书 SAN、镜像 tag 里的 Registry 地址三者必须一致**：

| 项 | 本篇取值 |
|----|----------|
| FQDN | `harbor.daemon.io` |
| 解析到的 IP（示例） | `192.168.56.121` |
| HTTPS | `443`（推荐主路径） |
| 项目 / 仓库示例 | `demo` / `nginx` |
| 管理员 | `admin`（密码在 `harbor.yml` 里设，默认常见为 `Harbor12345`） |

环境说明：

- Harbor **装在 Linux 宿主机**上（或能跑完整 Linux Docker 的环境）；本系列客户端侧概念与第 8 篇衔接。
- 安装包版本以 [Harbor Releases](https://github.com/goharbor/harbor/releases) 为准；下文命令示例用 **v2.15.2** 离线包文件名，你可换成当时最新的 `harbor-offline-installer-vX.Y.Z.tgz`。
- 仅内网 HTTP 快速摸 UI 可以，但 Docker 客户端对 HTTPS/证书更敏感——**建议直接 HTTPS + SAN**，少走弯路。

---

## 三、生成含 SAN 的证书（一次做对）

### 3.1 为什么必须有 SAN？

**SAN（Subject Alternative Name）** 列出证书合法的 DNS / IP。较新的 Docker / Go 校验证书时**优先看 SAN**；只有 CN、没有 SAN 时常见：

```text
x509: certificate relies on legacy Common Name field
```

浏览器也可能报证书域名无效。因此：**访问 Harbor 用哪个名字，SAN 里就要有哪个名字**（本例 `DNS:harbor.daemon.io`，需要时再加 `IP:192.168.56.121`）。

### 3.2 证书文件角色（实用即可）

| 文件 | 用途 |
|------|------|
| `ca.key` / `ca.crt` | 自签 CA（内网测试够用；浏览器默认不信任） |
| `harbor.daemon.io.key` | 服务器私钥 → 写进 `harbor.yml` |
| `harbor.daemon.io.crt` / `.cert` | 服务器证书（含 SAN）→ Harbor HTTPS；客户端信任常用 CA 或该证副本 |

Harbor HTTPS 需要：**CA + 服务器私钥 + 含 SAN 的服务器证书**。

### 3.3 一键流程（在 Harbor 服务器上）

```bash
mkdir -p /opt/CA/harbor/cert && cd /opt/CA/harbor/cert

# 1) CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -sha512 -days 3650 \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=harbor.daemon.io" \
  -key ca.key \
  -out ca.crt

# 2) 服务器私钥 + CSR
openssl genrsa -out harbor.daemon.io.key 4096
openssl req -sha512 -new \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=harbor.daemon.io" \
  -key harbor.daemon.io.key \
  -out harbor.daemon.io.csr

# 3) SAN 扩展（名字必须与访问用的 FQDN 一致）
cat > harbor.daemon.io.v3.ext <<'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:harbor.daemon.io,IP:192.168.56.121
EOF

# 4) CA 签发服务器证书
openssl x509 -req -sha512 -days 3650 \
  -extfile harbor.daemon.io.v3.ext \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -in harbor.daemon.io.csr \
  -out harbor.daemon.io.crt

# 5) 转成 Docker/Harbor 常用的 .cert 后缀（内容仍是 PEM）
openssl x509 -inform PEM -in harbor.daemon.io.crt -out harbor.daemon.io.cert
```

> 反例（不要当主路径）：只做「CN=某主机、无 SAN」的一纸自签，后面 `login`/`push` 几乎必炸——直接按上面做。

---

## 四、安装 Harbor

### 4.1 下载并解压

```bash
cd /usr/local
# 示例版本；请对照 GitHub Releases 替换文件名
tar -zxvf harbor-offline-installer-v2.15.2.tgz
cd harbor
```

### 4.2 配置 `harbor.yml`

```bash
cp harbor.yml.tmpl harbor.yml
# 编辑 harbor.yml
```

关键项（与第三节证书路径对齐）：

```yaml
hostname: harbor.daemon.io

http:
  port: 80    # 启用 HTTPS 后，访问常会重定向到 HTTPS

https:
  port: 443
  certificate: /opt/CA/harbor/cert/harbor.daemon.io.cert
  private_key: /opt/CA/harbor/cert/harbor.daemon.io.key

harbor_admin_password: Harbor12345   # 务必改成自己的强密码
data_volume: /data/harbor            # 数据盘路径按机器规划
```

服务器 `/etc/hosts`（本机解析示例）：

```bash
echo '192.168.56.121 harbor.daemon.io' | sudo tee -a /etc/hosts
```

### 4.3 prepare 与 install

```bash
# Docker 服务需已启动
./prepare
./install.sh
```

浏览器访问：`https://harbor.daemon.io/`（证书自签时浏览器会警告——内网可先继续；CLI 侧靠下一节 `certs.d`）。

### 4.4 启停

在安装目录：

```bash
docker compose up -d      # 启动
docker compose stop       # 停止
docker compose restart    # 重启
docker compose down       # 停止并移除容器（勿随意加 -v，会动数据卷）
```

旧环境若只有独立二进制，把 `docker compose` 换成 `docker-compose` 即可。

---

## 五、配置 Docker 客户端信任 Harbor

凡要 `login` / `push` / `pull` 的机器都要配。

### 5.1 解析 FQDN

```bash
echo '192.168.56.121 harbor.daemon.io' | sudo tee -a /etc/hosts
```

### 5.2 放入 Docker 信任目录

目录规则：`/etc/docker/certs.d/<hostname[:port]>/ca.crt`

自签场景把 **CA 证书**（推荐 `ca.crt`）拷过去；若你习惯拷服务器证，也需保证客户端能完成校验链。

```bash
# 远程客户端示例
sudo mkdir -p /etc/docker/certs.d/harbor.daemon.io
scp user@192.168.56.121:/opt/CA/harbor/cert/ca.crt \
  /tmp/harbor-ca.crt
sudo cp /tmp/harbor-ca.crt /etc/docker/certs.d/harbor.daemon.io/ca.crt

# Harbor 与 Docker 同机
sudo mkdir -p /etc/docker/certs.d/harbor.daemon.io
sudo cp /opt/CA/harbor/cert/ca.crt /etc/docker/certs.d/harbor.daemon.io/ca.crt
```

改完后重启 Docker（Linux 常见）：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 5.3 何时需要 `insecure-registries`？

| 场景 | 做法 |
|------|------|
| **HTTPS + 客户端已信任 CA**（本篇主路径） | 一般**不必**把 Harbor 写进 `insecure-registries` |
| 明文 HTTP 或证书暂时搞不定 | 才在 `daemon.json` 里加 `"insecure-registries": ["harbor.daemon.io"]`（或带端口） |

`registry-mirrors`、日志、live-restore 等其它 daemon 项见[第 23 篇](/云原生/docker/docker-23-daemon-ops)；本篇只关心「能不能安全地连上这座私有仓」。

---

## 六、成功路径：login → tag → push

### 6.1 在 Web UI 创建项目

打开 `https://harbor.daemon.io/`，用 `admin` 登录，新建项目 **`demo`**（公开或私有按团队规范）。

### 6.2 标记并推送

镜像名格式（第 8 篇已强调）：

```text
<registry 主机>[:端口]/<项目>/<仓库>:<标签>
```

```bash
docker login harbor.daemon.io
# Username: admin
# Password: （harbor.yml 里设的密码）

docker tag nginx:alpine harbor.daemon.io/demo/nginx:alpine
docker push harbor.daemon.io/demo/nginx:alpine
```

成功时会出现类似：

```text
The push refers to repository [harbor.daemon.io/demo/nginx]
...
alpine: digest: sha256:… size: …
```

### 6.3 验证

- UI：`demo` 项目下能看到 `nginx:alpine` 及层信息  
- CLI：另起一台已配好信任的客户端 `docker pull harbor.daemon.io/demo/nginx:alpine`

Dockerfile 构建完再推仓，见[第 10 篇](/云原生/docker/docker-10-dockerfile)「镜像发布」。

---

## 七、排障 checklist

| 症状 | 可能原因 | 处理 |
|------|----------|------|
| `certificate relies on legacy Common Name` | 证书无 SAN | 按第三节重做含 `subjectAltName` 的证，再改 `harbor.yml` 后 `./prepare` 并重启 |
| `certificate is valid for X, not Y` | SAN/访问名不一致 | SAN、`hostname`、`docker tag`/`login` 主机名改成**同一个** FQDN |
| push 实际去了 docker.io | tag 未带 Registry，或用了短名如 `cdh1` | 必须用 **FQDN 或 IP** 打 tag；短 hostname 常被当成 Docker Hub 命名空间 |
| `x509: certificate signed by unknown authority` | 客户端未信任 CA | 放入 `/etc/docker/certs.d/<host>/ca.crt` 后重启 Docker |
| `login` 超时 / 连不上 | 防火墙、端口、DNS | 查 443/80、hosts、Harbor 是否 `up` |
| `./prepare` 失败 | Docker 未启动或缺依赖 | `systemctl status docker`；按安装脚本提示补 Compose |

**铁律**：改访问域名时，**证书 SAN、`harbor.yml` 的 `hostname`、客户端 hosts、镜像 tag** 要一起改——只改一处必炸。

---

## 八、和系列其它篇的分工

| 你想搞清楚的事 | 去哪篇 |
|----------------|--------|
| 离线 `save` / `load`、打私有仓 tag 的命名 | [第 8 篇](/云原生/docker/docker-08-image-transfer) |
| Harbor 安装、HTTPS/SAN、push 金路径（本篇） | 本文 |
| Dockerfile 构建后再 `push` | [第 10 篇](/云原生/docker/docker-10-dockerfile) |
| `daemon.json` 全貌（加速器、live-restore…） | [第 23 篇](/云原生/docker/docker-23-daemon-ops) |

---

## 命令速查

| 目的 | 命令 / 位置 |
|------|-------------|
| 安装 | `./prepare` → `./install.sh` |
| 启停 | `docker compose up -d` / `stop` / `restart` |
| 信任 CA | `/etc/docker/certs.d/harbor.daemon.io/ca.crt` |
| 登录 | `docker login harbor.daemon.io` |
| 打 tag | `docker tag SRC harbor.daemon.io/<项目>/<仓>:<tag>` |
| 推送 | `docker push harbor.daemon.io/<项目>/<仓>:<tag>` |

---

## 小结

- Harbor = 带 UI / RBAC / 扫描的私有 Registry；协作靠它，离线靠第 8 篇 `save/load`。
- **先钉 FQDN，再签带 SAN 的证，再装仓**——比「先装再补证书」省事。
- 客户端三件套：hosts 解析、`certs.d` 信任、（仅 HTTP 等例外才）`insecure-registries`。
- `login` → 建项目 → `tag`（必须带 Registry）→ `push`；三者主机名与证书一致。

---

## 思考题

> 为什么 Harbor 的 `hostname`、镜像 tag 里的 Registry 地址、证书 SAN **三者必须一致**？不一致时分别会踩哪类错？

下一篇见 🐳
