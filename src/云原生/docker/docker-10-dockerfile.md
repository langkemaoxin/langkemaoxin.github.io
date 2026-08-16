---
title: Dockerfile 自制镜像——从最小实验到完整静态站案例
sidebarGroup: Docker 系列
shortTitle: 10 Dockerfile 自制镜像
order: 10
date: 2026-08-17T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Dockerfile
  - 镜像
description: Dockerfile 自制镜像——从最小实验到完整静态站案例
---

> **Docker 系列 · 第 10/18 篇**  
> 上一篇：[《Harbor 私有镜像仓库》](/云原生/docker/docker-09-harbor)  
> 下一篇：[《进程视角看容器》](/云原生/docker/docker-11-process-view)

---

## 开头：拉别人的镜像总不对劲，能不能自己做一个？

常见痛点：

- 官方镜像太大，你的业务其实只需要一个静态页或一个二进制
- 在容器里手改配置再 `docker commit`——同事复现不了，CI 也接不上
- 想把「安装依赖 + 拷文件 + 启动命令」写成**可版本管理的配方**

Docker 提供两条路：`commit`（临时救急，见[第 5 篇](/云原生/docker/docker-05-container-and-image)）与 **`docker build` + Dockerfile**（正式交付）。本篇把第二条**从最小实验跑到一个完整案例**。

> **实验环境**（文中输出均来自本机）：Docker Client / Server **29.1.2**（Docker Desktop）。官方参考：[Dockerfile reference](https://docs.docker.com/reference/dockerfile/)、[docker build](https://docs.docker.com/reference/cli/docker/build/)、[Best practices](https://docs.docker.com/build/building/best-practices/)。多阶段构建与缓存深挖见[第 22 篇](/云原生/docker/docker-22-build-advanced)。

---

## 一、是什么：Dockerfile 在解决什么？

**是什么**：Dockerfile 是一份文本配方，引擎按指令顺序构建镜像（层叠文件系统 + 配置元数据）。

**为什么**：同一份文件 → 同一套步骤 → 可审查、可 CI；比「某台机器上 commit 出来的神秘镜像」靠谱。

**怎么做**：在目录里放 `Dockerfile`（以及要拷进镜像的文件），执行：

```bash
docker build -t <名字>:<标签> <上下文目录>
```

**背景**：

| 概念 | 白话 |
|------|------|
| **构建上下文** | `build` 最后那个路径（常写 `.`）；`COPY`/`ADD` **只能**从上下文里取文件，不能 `COPY ../../秘密` |
| **层（layer）** | 多数会改文件系统的指令会产生新层；层可缓存、可复用（直觉见下文 `history`，原理见第 14 / 22 篇） |
| **只读镜像** | 构建结果是模板；跑起来才有容器可写层 |

获取镜像的两条日常路：`docker pull`（别人做好的）与 `docker build`（自己声明式做）。

---

## 二、最小实验：先建立「build → run」直觉

新建空目录，只放一个 Dockerfile：

```dockerfile
FROM alpine:3.21
CMD ["echo", "hello-from-dockerfile"]
```

```bash
docker build -t lab-mini:1.0 .
docker run --rm lab-mini:1.0
```

本机输出：

```text
hello-from-dockerfile
```

`history` 能看到你加的 `CMD` 叠在 alpine 之上（节选）：

```text
IMAGE          CREATED BY                            SIZE
7d41b5fb18ed   CMD ["echo" "hello-from-dockerfile"]  0B
…              ADD alpine-minirootfs-…               8.5MB
```

做到这里：你已经会用 Dockerfile 造镜像并跑起来。下面做一个**能用浏览器/curl 验收**的完整案例。

---

## 三、完整案例：用 Dockerfile 定制 Nginx 静态站

目标：把自定义首页打进 `nginx:alpine`，映射端口后能打开页面。

### 3.1 准备目录与文件

```text
lab-web/
├── Dockerfile
└── index.html
```

`index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>lab-web</title>
</head>
<body>
  <h1>Hello from Dockerfile</h1>
  <p>Built with nginx:alpine - Docker series lab.</p>
</body>
</html>
```

`Dockerfile`：

```dockerfile
FROM nginx:alpine
LABEL maintainer="docker-series@example.com"
LABEL version="1.0"
LABEL description="Static site lab for Dockerfile chapter"

COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80
```

说明（用到再讲）：

| 指令 | 在本案例里的作用 |
|------|------------------|
| `FROM nginx:alpine` | 基于官方轻量 Nginx；默认已有启动入口与 `CMD` |
| `LABEL` | 元数据，方便检索与合规，不增大多少体积 |
| `COPY` | 把上下文里的首页覆盖到 Nginx 默认站点目录 |
| `EXPOSE 80` | **声明**容器听 80；真正映射靠 `run -p`（文档性质） |

未再写 `CMD`：沿用基础镜像的 `ENTRYPOINT` + `CMD`（Nginx 前台跑）——这正是「站在别人肩膀上定制」的常见写法。

### 3.2 构建

在 `lab-web/` 目录：

```bash
docker build -t lab-web:1.0 .
```

本机构建末尾类似：

```text
[2/2] COPY index.html /usr/share/nginx/html/index.html
… naming to docker.io/library/lab-web:1.0
```

本机镜像：

```text
REPOSITORY   TAG   IMAGE ID       SIZE
lab-web      1.0   fe5964eaf073   92.7MB
```

（体积主要来自 `nginx:alpine` 基础层；你的 `COPY` 只有几十 KB 量级。）

### 3.3 运行并验收

```bash
docker run -d --name lab-web -p 8088:80 lab-web:1.0
curl -sS http://127.0.0.1:8088/
```

本机响应正文：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>lab-web</title>
</head>
<body>
  <h1>Hello from Dockerfile</h1>
  <p>Built with nginx:alpine - Docker series lab.</p>
</body>
</html>
```

响应头可见 `Server: nginx/1.31.3`、`HTTP/1.1 200 OK`。浏览器打开 `http://127.0.0.1:8088/` 应看到同一标题。

### 3.4 看分层：你的改动落在哪

```bash
docker history lab-web:1.0
```

本机顶部与本案例相关的几行（精简）：

```text
CREATED BY                                         SIZE
EXPOSE [80/tcp]                                    0B
COPY index.html /usr/share/nginx/html/index.html   24.6kB
LABEL description=… / version=… / maintainer=…     0B
…（其下是 nginx:alpine / alpine 官方层）
```

**验收清单**：build 成功 → 容器 Up → curl 出你的 HTML → history 里能看到 `COPY`。跑完可清理：`docker rm -f lab-web`。

---

## 四、案例延伸：指令怎么选？

### 4.1 `COPY` vs `ADD`

官方最佳实践：**多数情况用 `COPY`**。`ADD` 额外能力（本地 tar 自动解压等）容易让读者看不懂「到底拷了什么」；远程 URL 更推荐在 `RUN` 里 `curl`/`wget` 并校验，而不是 `ADD https://…`。

本案例只有一个 HTML → `COPY` 足够。

### 4.2 `WORKDIR` / `ENV` / `RUN`

本案例没装包；若基础镜像是「空 OS + 自己装运行时」，常见模式：

```dockerfile
WORKDIR /app
ENV APP_ENV=prod
RUN apk add --no-cache curl \
    && rm -rf /var/cache/apk/*
COPY . .
```

原则（现行最佳实践口径）：

- 用 `WORKDIR`，少写 `RUN cd …`
- `RUN` 里把「安装 + 清理缓存」串在同一条，减少无用层、缩小体积
- 需要变量就用 `ENV`，避免魔法字符串散落

### 4.3 `VOLUME`

声明挂载点（数据目录）。静态站案例不需要；有状态数据时再声明，真正挂载仍靠 `run -v`（存储篇再展开）。

---

## 五、`CMD` 与 `ENTRYPOINT`：谁说了算？

| | **CMD** | **ENTRYPOINT** |
|--|---------|----------------|
| 角色 | 默认参数 / 默认命令 | 固定入口（容器「主程序」） |
| `docker run 镜像 新参数` | 常会**整段替换** CMD | 入口仍在，新参数多半当**传给入口的参数** |

推荐 **exec 格式**（JSON 数组），信号转发更干净，例如 `CMD ["echo", "hi"]`，而不是 `CMD echo hi`（后者包一层 `sh -c`）。

本机小实验：

```dockerfile
FROM alpine:3.21
ENTRYPOINT ["echo", "fixed-prefix"]
CMD ["default-arg"]
```

```bash
docker build -t lab-ep:1.0 -f Dockerfile.ep .
docker run --rm lab-ep:1.0
docker run --rm lab-ep:1.0 overridden-arg
```

本机输出：

```text
fixed-prefix default-arg
fixed-prefix overridden-arg
```

`lab-web` 没写 CMD，是因为 `nginx:alpine` 已经提供了合适的 `ENTRYPOINT`/`CMD`；你只 `COPY` 内容即可。

---

## 六、构建完如何发布？

本地验证通过后，打上私有仓前缀再推（Harbor 的信任与 hostname 见[第 9 篇](/云原生/docker/docker-09-harbor)）：

```bash
docker tag lab-web:1.0 harbor.daemon.io/demo/lab-web:1.0
docker login harbor.daemon.io
docker push harbor.daemon.io/demo/lab-web:1.0
```

没有 Harbor 时，至少保留 `lab-web:1.0` 与 Dockerfile 进 Git——**配方进仓库，比只传一个匿名 IMAGE ID 更重要**。

---

## 七、和 `commit`、进阶构建的边界

| 做法 | 何时用 |
|------|--------|
| `docker commit` | 临时留存实验现场；不作为交付（第 5 篇） |
| **Dockerfile + build**（本篇） | 可复现的日常交付 |
| 多阶段 / BuildKit 缓存调优 | 镜像过大、构建太慢 → [第 22 篇](/云原生/docker/docker-22-build-advanced) |
| 分层与 UnionFS 原理 | [第 14 篇](/云原生/docker/docker-14-unionfs) |

---

## 命令与指令速查

| 目的 | 命令 / 指令 |
|------|-------------|
| 构建 | `docker build -t NAME:TAG .` |
| 运行案例 | `docker run -d --name lab-web -p 8088:80 lab-web:1.0` |
| 看层 | `docker history IMAGE` |
| 基础镜像 | `FROM` |
| 拷文件 | `COPY`（优先于 `ADD`） |
| 元数据 | `LABEL` |
| 声明端口 | `EXPOSE` |
| 入口 / 默认参数 | `ENTRYPOINT` / `CMD`（优先 exec 格式） |

---

## 小结

- Dockerfile 把「怎么做出镜像」写成可重复配方；`build` 的上下文决定你能 `COPY` 什么。
- 先跑通最小 `CMD`，再做一个**完整静态站案例**：`FROM nginx:alpine` → `COPY` 首页 → `-p` 映射 → `curl` 验收。
- `EXPOSE` 不替你开宿主机端口；`COPY` 优先于 `ADD`；`CMD`/`ENTRYPOINT` 分工用本机小实验记牢。
- 发布走 tag + Registry；瘦身与缓存优化留给第 22 篇。

---

## 思考题

> 若把 `COPY index.html …` 写成 `ADD index.html …`，构建结果通常一样吗？什么情况下你才会故意用 `ADD`？

下一篇见 🐳
