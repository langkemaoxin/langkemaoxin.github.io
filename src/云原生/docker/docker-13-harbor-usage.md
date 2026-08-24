---
title: Harbor 使用——用案例拉取与推送镜像
sidebarGroup: Docker 系列
shortTitle: 13 Harbor 使用
order: 13
date: 2026-08-18T00:00:00.000Z
author: Corey
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Harbor
  - 镜像
description: Harbor 已经装好之后怎么用：两个真实案例——从仓库拉镜像跑起来，以及把自己做的镜像推上去。
---

> **Docker 系列 · 第 13/33 篇**
> 上一篇：[《Harbor 私有镜像仓库——从检查环境到浏览器能登录》](/云原生/docker/docker-12-harbor) · 下一篇：[《数据持久化——从容器一删库没了，滚到三种挂载》](/云原生/docker/docker-14-data-persistence)

---

## 开头：仓库已经在了，怎么用？

[上一篇](/云原生/docker/docker-12-harbor)只负责把 Harbor **装起来**。本篇假定仓库已经存在——可以是你自己装的，也可以是公司那台 `192.168.13.21:8000`。

推送案例用的是 TruFor 交付镜像，源码在 [code-corey/trufor-deploy](https://github.com/code-corey/trufor-deploy)。

用法就两件事，用两个案例走完：

| 案例 | 你要做的 | 过关 |
|------|----------|------|
| **一、拉取** | 从 Harbor 把别人（或自己）推好的镜像拉下来跑 | 容器起来，浏览器能打开页面 |
| **二、推送** | 把本机制作好的镜像打 tag，推进指定项目 | UI 里能看到仓库和标签，末行有 digest |

镜像全名永远是：

```text
<仓库地址>:<端口>/<项目>/<仓库名>:<标签>
```

少写地址，`docker push` 会当成推 Docker Hub。

---

## 案例一：从 Harbor 拉取镜像并运行

**场景**：仓库里已经有镜像。你要在自己的机器上跑它，不从 Docker Hub 拉。

下面用两种真实地址，命令形态一样，只换前缀：

| 环境 | 拉取地址 |
|------|----------|
| 本机刚装的 Harbor（Desktop） | `localhost:85/demo/nginx:alpine` |
| 公司 HTTP Harbor（pc3507） | `192.168.13.21:8000/other/trufor-api:cvpr2023` |

先讲 Nginx（轻、好验收），再给 TruFor 的拉取命令。

### 1. HTTP 仓先允许明文，再 login

Docker 默认走 HTTPS。Harbor 若是 HTTP，会报：

```text
http: server gave HTTP response to HTTPS client
```

在跑 docker 的 Linux 上合并 `/etc/docker/daemon.json`（不要覆盖已有 mirrors / dns）：

```json
{
  "insecure-registries": [
    "localhost:85",
    "192.168.13.21:8000"
  ]
}
```

只保留你实际在用的那一条即可。然后：

```bash
sudo systemctl restart docker
docker info | grep -A 8 "Insecure Registries"
docker login localhost:85 -u admin
# 公司仓则是：
# docker login 192.168.13.21:8000 -u admin
```

验收：`Login Succeeded`。公开项目有时可以不登录就 pull；私有项目必须 login。

Desktop 用户改 **Settings → Docker Engine**，不要只改 WSL 的 `daemon.json`。本机往本机 Harbor 推拉，优先 `localhost:端口`。

### 2. 拉取 Nginx 并运行

```bash
docker pull localhost:85/demo/nginx:alpine
docker run -d --name harbor-nginx -p 8088:80 localhost:85/demo/nginx:alpine
curl -sI http://127.0.0.1:8088/ | head -5
```

本机成功时类似：

```text
alpine: Pulling from demo/nginx
Digest: sha256:1d40e3eb3bf4f138de1d67193f2aa5309fcaf343eb5ffadbf5e9439de1eb1ebb
Status: Downloaded newer image for localhost:85/demo/nginx:alpine
HTTP/1.1 200 OK
Server: nginx/1.31.3
```

浏览器打开 `http://127.0.0.1:8088/` 应看到 Nginx 欢迎页。

想确认「确实是从 Harbor 拉的」，可先删再拉：

```bash
docker rmi localhost:85/demo/nginx:alpine
docker pull localhost:85/demo/nginx:alpine
```

清理：

```bash
docker stop harbor-nginx && docker rm harbor-nginx
```

| | Docker Hub | 本案例 |
|--|------------|--------|
| 地址 | `nginx:alpine` | `localhost:85/demo/nginx:alpine` |
| 来源 | 公网 | 内网 Harbor |

### 3. 拉取 TruFor 并运行

公司仓里已经有 `other/trufor-api:cvpr2023` 时：

```bash
docker pull 192.168.13.21:8000/other/trufor-api:cvpr2023
docker run -d --name imageTest -p 8088:8088 192.168.13.21:8000/other/trufor-api:cvpr2023
curl http://127.0.0.1:8088/health
```

必须 `-p 8088:8088`。镜像里的 `EXPOSE 8088` 不会在宿主机开端口；没有映射时浏览器打开 `/docs` 会没反应。

---

## 案例二：把本机制作好的镜像推到 Harbor

**场景**：构建机 `pc3507` 上已经有镜像，要推进公司 HTTP Harbor 的项目 `other`。镜像由 [code-corey/trufor-deploy](https://github.com/code-corey/trufor-deploy) 构建而来。

当时本地镜像：

```text
$ docker images | grep trufor
trufor-api:cvpr2023    c53226f00e0f    10.1GB    3.4GB
```

目标全名：

```text
192.168.13.21:8000/other/trufor-api:cvpr2023
│                │     │          │
│                │     │          └─ 标签
│                │     └─ 仓库名
│                └─ 项目（网页里必须先有）
└─ 仓库地址:端口
```

### 1. 浏览器确认项目还在

打开 `http://192.168.13.21:8000`，用账号登录。项目 **other** 没有就先新建。账号要有这个项目的推送权限（实验可用 `admin`，团队不要共用 admin）。

### 2. 客户端信任 HTTP 仓并 login

若尚未做案例一的 insecure / login：

```bash
# daemon.json 已写入 192.168.13.21:8000 并重启 docker 之后：
docker login 192.168.13.21:8000 -u admin
```

必须出现 `Login Succeeded`。三处地址（insecure、login、tag）必须写成同一串，含端口。

### 3. 打标签

本地名 `trufor-api:cvpr2023` 没有仓库前缀。`tag` 只是给同一镜像多一个名字：

```bash
docker tag trufor-api:cvpr2023 192.168.13.21:8000/other/trufor-api:cvpr2023
docker images | grep trufor
```

应看到两行：原名，以及带 `192.168.13.21:8000/other/` 的那条。

### 4. 推送

```bash
docker push 192.168.13.21:8000/other/trufor-api:cvpr2023
```

约 10GB，第一次较慢。成功时最后一行有 `digest: sha256:...`。

不要写成 `docker push other/trufor-api:cvpr2023`（没地址会往 Docker Hub 推）。

### 5. 核对

浏览器：项目 **other** → 仓库 **trufor-api** → 标签 **cvpr2023**。

别人按案例一第 3 步 `pull` 即可。

---

## 换一台仓库时怎么套用

把案例二里的四段换成运维给的值：

```bash
docker tag myweb:v1 仓库地址:端口/项目/myweb:v1
docker push 仓库地址:端口/项目/myweb:v1
```

| 仓库类型 | 客户端还要做什么 |
|----------|------------------|
| HTTP（本案例） | `insecure-registries` 写 `地址:端口`，重启 Docker |
| 正规 CA 的 HTTPS | 直接 `docker login 域名` |
| 自签 HTTPS | 把 `ca.crt` 放到 `/etc/docker/certs.d/<地址>/ca.crt` 后重启 |

`curl -sI http://地址:端口/v2/`（或 https）返回 **401** 是正常的：仓库活着，需要认证。超时、`Connection refused` 才是网络/端口问题。

发给同事的最短说明：

```text
1. HTTP 仓：insecure-registries 加上 192.168.13.21:8000，重启 Docker
2. docker login 192.168.13.21:8000 -u 你的账号
3. docker pull 192.168.13.21:8000/other/trufor-api:cvpr2023
```

公开项目可以跳过 login 再 pull；**push 一定要登录**。

---

## 使用时常见报错

| 报错 | 意思 | 处理 |
|------|------|------|
| `http: server gave HTTP response to HTTPS client` | Docker 走 HTTPS，仓是 HTTP | insecure 写 `IP:端口`，重启后再 login |
| `unauthorized` | 没登录或密码错 | 重新 `docker login` |
| `denied: requested access to the resource is denied` | 登录了但这个项目不能推 | 项目名对不对；找管理员加 Developer |
| `name unknown: project … not found` | 项目不存在 | 网页里先建项目 |
| push 目标变成 `docker.io/...` | tag 没带仓库地址 | 重打 `地址:端口/项目/名字:标签` |
| Desktop 上 FQDN 超时 / 502 | 引擎在 VM 里绕不过你的域名 | 同机改用 `localhost:端口` |

凭证在 `~/.docker/config.json` 里是 base64，不是加密。不要把这份文件提交进 Git。

---

## 小结

1. **拉**：`docker pull 地址:端口/项目/仓库:标签`，再 `docker run`（别忘了 `-p`）。  
2. **推**：`docker tag` 打上同一套全名 → `docker login` → `docker push`。  
3. HTTP 仓先配 `insecure-registries`。缺地址的 tag 会推到 Docker Hub。

安装步骤回到[第 12 篇](/云原生/docker/docker-12-harbor)。下一篇：[《Docker 网络——从 localhost 不通滚到能用名字互访》](/云原生/docker/docker-15-network)。
