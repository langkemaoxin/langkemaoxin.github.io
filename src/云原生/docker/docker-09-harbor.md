---
title: Harbor 私有镜像仓库——从安装到 SAN 证书与 push 排障
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
description: Harbor 私有镜像仓库——从安装到 SAN 证书与 push 排障
---

> **Docker 系列 · 第 9/23 篇**  
> 上一篇：[《Docker 本地镜像载入与载出》](/云原生/docker/docker-08-image-transfer)  
> 下一篇：[《Dockerfile 自制镜像》](/云原生/docker/docker-10-dockerfile)

---

## 开头：团队镜像散落各处，怎么统一管理？

开发 A 把镜像 push 到自己的笔记本 Registry，测试 B 从另一个地址 pull，CI 又写死了 Docker Hub 地址——**三套源、三种 tag 规则**，上线前才发现镜像对不上。

企业级方案是搭建 **Harbor**（港口）：带 Web UI、RBAC、漏洞扫描、分层传输的私有 Registry。本文覆盖 **完整安装流程、HTTPS/SAN 证书生成、Docker 客户端配置、push 失败排查**，一步不漏。

---

## 一、Harbor 相对 Docker Registry 的优势

| 能力 | 说明 |
|------|------|
| **分层传输** | 镜像按 layer UUID 增量同步，避免 FTP 式全量传输 |
| **Web UI** | 登录、搜索、区分公有/私有项目 |
| **水平扩展** | 多节点分担 pull/push 压力 |
| **权限管理** | 按角色分配 push/pull/管理权限 |

Harbor 本身通过 **docker-compose** 编排，安装前需确认宿主机已安装 Docker 与 docker-compose：

```bash
docker -v
# Docker version 20.10.23, build 7155243

docker-compose -version
# docker-compose version 1.25.1, build a82fef07
```

---

## 二、Harbor 安装（HTTP 快速体验版）

### 2.1 下载并解压

使用离线安装包 `harbor-offline-installer-v2.3.2.tgz`（可从 [Harbor Releases](https://github.com/goharbor/harbor/releases) 获取）：

```bash
cd /usr/local/
mkdir harbor && cd harbor
tar -zxvf harbor-offline-installer-v2.3.2.tgz
cd harbor
```

### 2.2 生成简单自签证书（初版）

```bash
mkdir -p /usr/local/harbor/ssl && cd /usr/local/harbor/ssl

# 生成私钥
openssl genrsa -out tls.key 4096

# 自签证书（3650 天有效，CN 填 IP 或域名）
openssl req -x509 -new -nodes -sha512 -days 3650 \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=cdh1" \
  -key tls.key \
  -out tls.cert
```

> **注意**：Go 1.15+ / Docker 新版本对证书校验更严格，此简单自签证书**不含 SAN**，后续 login/push 会报错。生产环境请直接看 [第四节 SAN 证书完整流程](#四生成含-san-的证书完整流程)。

### 2.3 配置 harbor.yml

```bash
cd /usr/local/harbor/harbor
cp harbor.yml.tmpl harbor.yml
vim harbor.yml
```

关键配置项：

```yaml
hostname: 192.168.56.121          # Harbor 访问地址（IP 或域名）
http:
  port: 85                          # HTTP 端口（启用 HTTPS 时通常改为 80 并重定向）
harbor_admin_password: 123456       # admin 默认密码 Harbor12345，建议修改
data_volume: /harbor/data           # 数据存储路径

# 若启用 HTTPS，还需配置：
# https:
#   port: 443
#   certificate: /usr/local/harbor/ssl/tls.cert
#   private_key: /usr/local/harbor/ssl/tls.key
```

### 2.4 prepare 与 install

```bash
# 预置：生成配置、拉取依赖镜像（需 Docker 服务已启动）
./prepare

# 安装启动
./install.sh
```

安装完成后浏览器访问：

```
http://192.168.56.121:85/
```

默认账号：`admin` / `Harbor12345`（或你在 `harbor.yml` 中设置的密码）。

### 2.5 停止与重启 Harbor

```bash
cd /usr/local/harbor/harbor

docker-compose up -d      # 启动
docker-compose start      # 启动已停止的服务
docker-compose stop       # 停止
docker-compose restart    # 重启
docker-compose down -v    # 停止并删除数据卷（慎用）
```

---

## 三、配置 Docker 客户端支持 Harbor

### 3.1 编辑 daemon.json

在**需要使用 Harbor 的 Docker 客户端**上：

```bash
cat /etc/docker/daemon.json
```

示例（HTTP + 自签证书场景，加入 insecure-registries）：

```json
{
  "registry-mirrors": [
    "https://bjtzu1jb.mirror.aliyuncs.com",
    "https://hub-mirror.c.163.com"
  ],
  "insecure-registries": ["192.168.56.121:85"]
}
```

重启 Docker：

```bash
systemctl daemon-reload
systemctl restart docker
# 或 service docker restart
```

### 3.2 跨机器访问：配置 hosts

若 Harbor 使用域名（如 `cdh1`），客户端需解析：

```bash
echo '192.168.56.121 cdh1' >> /etc/hosts
```

### 3.3 复制 CA 证书到 Docker 信任目录

自签证书不被系统信任，需手动放入 Docker 证书目录：

```bash
# 从 Harbor 服务器复制（远程客户端）
mkdir -p /etc/docker/certs.d/cdh1
scp 192.168.56.121:/usr/local/harbor/ssl/tls.cert /etc/docker/certs.d/cdh1/ca.crt

# 本机 Harbor 即 Docker 客户端
mkdir -p /etc/docker/certs.d/cdh1
cp /usr/local/harbor/ssl/tls.cert /etc/docker/certs.d/cdh1/ca.crt

# 若用 IP:端口访问
mkdir -p /etc/docker/certs.d/192.168.56.121:85
cp /usr/local/harbor/ssl/tls.cert /etc/docker/certs.d/192.168.56.121:85/ca.crt
```

目录规则：`/etc/docker/certs.d/<hostname[:port]>/ca.crt`

### 3.4 登录 Harbor

```bash
# 非 80 端口必须带端口号
docker login cdh1:85
# 或
docker login 192.168.56.121:85
```

常见报错：**证书不含 SAN** —— 见下一节完整修复。

---

## 四、生成含 SAN 的证书（完整流程）

### 4.1 为什么需要 SAN？

**SAN（Subject Alternative Name）** 是 X.509 v3 扩展，允许一个证书支持多个域名/IP。

- Docker 新版本（golang 1.15+）校验证书时，**优先看 SAN，忽略 CN**
- 只有 CN、没有 SAN 的老式自签证书会触发：`x509: certificate relies on legacy Common Name field`
- Chrome/Firefox 访问 HTTPS 也可能报 `NET::ERR_CERT_COMMON_NAME_INVALID`

SAN 可包含：DNS 名、IP 地址、Email、URI 等：

```
SubjectAltName ::= GeneralNames
  dNSName      [2] IA5String
  iPAddress    [7] OCTET STRING
  ...
```

### 4.2 SSL 证书格式速查

| 格式 | 说明 |
|------|------|
| `.key` | PEM 格式私钥 |
| `.crt` / `.cert` | 证书文件；Docker 将 `.crt` 当 CA  cert、`.cert` 当客户端 cert |
| `.csr` | 证书签名请求 |
| `.pem` | Base64 编码，含 `BEGIN/END CERTIFICATE` 头尾 |

Harbor HTTPS 需要：**CA 私钥 + CA 证书 + 服务器私钥 + 服务器证书（含 SAN）**。

### 4.3 步骤 1：生成 CA 私钥

```bash
mkdir -p /opt/CA/harbor/cert && cd /opt/CA/harbor/cert

openssl genrsa -out ca.key 4096
```

### 4.4 步骤 2：生成 CA 自签证书

```bash
openssl req -x509 -new -nodes -sha512 -days 3650 \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=cdh1" \
  -key ca.key \
  -out ca.crt
```

自签 CA 适合内网/测试，浏览器默认不信任。

### 4.5 步骤 3：生成服务器私钥与 CSR

```bash
openssl genrsa -out cdh1.key 4096

openssl req -sha512 -new \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=cdh1" \
  -key cdh1.key \
  -out cdh1.csr
```

CSR 含公钥与申请者信息，需 CA 签名后才成为有效服务器证书。

### 4.6 步骤 4：创建 v3.ext（SAN 扩展）

```bash
cat > v3.ext <<-EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:cdh1,IP:192.168.56.121
EOF
```

> `subjectAltName` 必须包含你实际用于访问 Harbor 的**域名和/或 IP**，否则 push/login 仍会报证书域名不匹配。

### 4.7 步骤 5：CA 签发服务器证书 cdh1.crt

```bash
openssl x509 -req -sha512 -days 3650 \
  -extfile v3.ext \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -in cdh1.csr \
  -out cdh1.crt
```

CA 签名过程：对证书信息 Hash → 用 CA 私钥加密 → 附加 Certificate Signature。

### 4.8 步骤 6：转换 crt → cert（供 Docker 使用）

```bash
openssl x509 -inform PEM -in cdh1.crt -out cdh1.cert
```

Docker 守护进程约定：

- `.crt` → 解释为 CA 证书
- `.cert` → 解释为客户端/服务器证书

### 4.9 步骤 7：更新 harbor.yml 启用 HTTPS

```yaml
hostname: cdh1

http:
  port: 80    # 启用 HTTPS 时 HTTP 会重定向到 HTTPS

https:
  port: 443
  certificate: /opt/CA/harbor/cert/cdh1.cert
  private_key: /opt/CA/harbor/cert/cdh1.key

harbor_admin_password: 123456
data_volume: /harbor/data
```

### 4.10 步骤 8：prepare + install

```bash
cd /usr/local/harbor/harbor

./prepare
./install.sh
```

验证配置：

```bash
egrep -v "^$|^#" harbor.yml | head -10
```

### 4.11 步骤 9：证书复制到 Docker 并重启

```bash
mkdir -p /etc/docker/certs.d/cdh1
cp /opt/CA/harbor/cert/cdh1.cert /etc/docker/certs.d/cdh1/ca.crt

systemctl daemon-reload && systemctl restart docker
```

登录：

```bash
docker login cdh1
# 或 docker login cdh1:443
```

---

## 五、push 失败：hostname 与 FQDN 问题

### 5.1 现象

push 本地镜像到 Harbor 时，镜像却去了 `docker.io`：

```bash
docker push cdh1/demo/nginx:latest
# 实际推送到 docker hub 而非 harbor
```

### 5.2 原因

`insecure-registries` 和镜像 tag 中的 Registry 地址必须是 **FQDN（完全限定域名）或 IP**，不能是短 hostname（如 `cdh1`）。

**FQDN** = 主机名 + 域名，例如 `harbor.daemon.io`（通过 `.` 分隔）。

Docker 解析 Registry 地址时，短 hostname 可能无法正确匹配 `insecure-registries` 配置。

### 5.3 解决步骤

**① Harbor 服务器配置 hosts + 改 hostname**

```bash
# /etc/hosts
192.168.56.121  harbor.daemon.io

# 停止 Harbor
cd /usr/local/harbor/harbor
docker-compose down -v

# 修改 harbor.yml
hostname: harbor.daemon.io

./prepare
docker-compose up -d
```

**② 客户端配置 hosts（若跨机器）**

```bash
echo '192.168.56.121 harbor.daemon.io' >> /etc/hosts
```

**③ 更新 daemon.json**

```json
{
  "registry-mirrors": [
    "https://bjtzu1jb.mirror.aliyuncs.com",
    "https://hub-mirror.c.163.com"
  ],
  "insecure-registries": ["harbor.daemon.io:85"]
}
```

```bash
systemctl restart docker
```

**④ 镜像 tag 必须使用 FQDN**

```bash
docker tag nginx:latest harbor.daemon.io/demo/nginx:latest
docker push harbor.daemon.io/demo/nginx:latest
```

---

## 六、push 失败：证书域名不匹配

### 6.1 现象

```bash
docker push harbor.daemon.io/demo/nginx:latest
# x509: certificate is valid for cdh1, not harbor.daemon.io
```

证书 SAN/CN 是 `cdh1`，但访问用的是 `harbor.daemon.io`。

### 6.2 重新生成匹配 FQDN 的 SAN 证书

```bash
cd /opt/CA/harbor/cert

# 重新生成 CA（或复用原 ca.key/ca.crt）
openssl req -x509 -new -nodes -sha512 -days 3650 \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=harbor.daemon.io" \
  -key ca.key \
  -out ca.crt

# 服务器私钥与 CSR
openssl genrsa -out harbor.daemon.io.key 4096

openssl req -sha512 -new \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=example/OU=Personal/CN=harbor.daemon.io" \
  -key harbor.daemon.io.key \
  -out harbor.daemon.io.csr

# v3.ext — SAN 必须包含 harbor.daemon.io
cat > harbor.daemon.io.v3.ext <<-EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:harbor.daemon.io
EOF

# 签发
openssl x509 -req -sha512 -days 3650 \
  -extfile harbor.daemon.io.v3.ext \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -in harbor.daemon.io.csr \
  -out harbor.daemon.io.crt

# 转 cert
openssl x509 -inform PEM -in harbor.daemon.io.crt -out harbor.daemon.io.cert
```

### 6.3 更新 Harbor 与 Docker 信任

```yaml
# harbor.yml
hostname: harbor.daemon.io
https:
  port: 443
  certificate: /opt/CA/harbor/cert/harbor.daemon.io.cert
  private_key: /opt/CA/harbor/cert/harbor.daemon.io.key
```

```bash
mkdir -p /etc/docker/certs.d/harbor.daemon.io
cp /opt/CA/harbor/cert/harbor.daemon.io.cert /etc/docker/certs.d/harbor.daemon.io/ca.crt

docker-compose down
./prepare
./install.sh

systemctl restart docker
```

---

## 七、推送镜像完整流程（成功路径）

### 7.1 在 Harbor Web UI 创建项目

访问 `http://harbor.daemon.io:85/`（或 HTTPS 443），登录 admin，新建项目 `demo`（公开或私有）。

### 7.2 标记并推送

```bash
# 登录
docker login harbor.daemon.io

# 打 tag（格式：<registry>/<project>/<repo>:<tag>）
docker tag nginx:latest harbor.daemon.io/demo/nginx:latest

# 推送
docker push harbor.daemon.io/demo/nginx:latest
```

成功输出类似：

```
The push refers to repository [harbor.daemon.io/demo/nginx]
...
latest: digest: sha256:xxxx size: xxxx
```

### 7.3 验证

在 Harbor Web UI 的 `demo` 项目下应能看到 `nginx:latest` 镜像及层信息。

---

## 八、排障 checklist

| 症状 | 可能原因 | 处理 |
|------|----------|------|
| `certificate relies on legacy Common Name` | 证书无 SAN | 按第四节重新生成 SAN 证书 |
| `certificate is valid for X, not Y` | SAN/CN 与访问域名不一致 | 重新生成含正确 DNS/IP 的 SAN |
| push 去了 docker.io | tag 未含 Registry / hostname 非 FQDN | 用 FQDN 打 tag，配置 insecure-registries |
| `x509: certificate signed by unknown authority` | 客户端未信任 CA | 复制 cert 到 `/etc/docker/certs.d/<host>/ca.crt` |
| login 超时 | 防火墙/端口未开放 | 检查 harbor.yml 端口与防火墙规则 |
| `./prepare` 失败 | Docker 未启动 | `systemctl start docker` |

---

## 下篇预告

**第 10 篇：《Dockerfile 自制镜像》**

- `FROM scratch` 制作最小 Base Image
- Dockerfile 指令详解与 CMD/ENTRYPOINT 区别

---

## 思考题

> 为什么 Harbor 的 `hostname`、镜像 tag 中的 Registry 地址、证书 SAN 三者必须一致？

欢迎在评论区留下你的理解。下一篇见 🐳
