---
title: 构建进阶——多阶段构建、缓存优化与 BuildKit
sidebarGroup: Docker 系列
shortTitle: 22 构建进阶
order: 22
date: 2026-08-27T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 构建进阶——多阶段构建、缓存优化与 BuildKit
---

> **Docker 系列 · 第 22/23 篇**  
> 上一篇：[《容器安全》](/云原生/docker/docker-21-container-security/) · 下一篇：[《Daemon 运维》](/云原生/docker/docker-23-daemon-ops/)

---

## 开头：一个 hello world，镜像 1.44GB

团队写了个 Go 的 HTTP 服务，二十行代码。Dockerfile 很直觉：`FROM golang` → `COPY` 源码 → `go build` → 完事。构建成功，镜像 **1.44GB**——每次发布推 1.44G、拉 1.44G，服务器磁盘被各种版本挤爆。

问题出在哪、怎么把镜像压到 **20MB（72 倍瘦身）**、构建缓存怎么配才能「改一行代码秒级重建」——本篇在本机（Docker 29.x，WSL2）从反面教材开始实测。前置知识：[第 10 篇 Dockerfile 基础](/云原生/docker/docker-10-dockerfile/)、[第 14 篇分层与缓存](/云原生/docker/docker-14-unionfs/)。

---

## 一、反面教材：单阶段构建（实测 1.44GB）

二十行代码的 Go 服务（`main.go` 起 HTTP :8080），最直觉的 Dockerfile：

```dockerfile
FROM golang:1.24
WORKDIR /app
COPY . .
RUN go build -o server main.go
CMD ["./server"]
```

构建后看体积（真实输出）：

```
REPOSITORY        TAG          SIZE
demo-fat          latest       1.44GB     ← 我们的镜像
golang            1.24         1.32GB     ← 基础镜像
```

**镜像的 92% 是 Go 工具链**：golang 基础镜像带着完整编译器、标准库源码、git、shell……而运行期只需要一个**静态编译的二进制**（几 MB）。工具链是「脚手架」，盖完楼就该拆掉——但单阶段构建把脚手架焊死在了楼里。

---

## 二、多阶段构建：脚手架与楼分开（实测 20MB）

多阶段构建（multi-stage build）的思路：**第一阶段用重型镜像编译，第二阶段用轻量镜像只装产物**：

```dockerfile
# ---- 阶段 1：构建（重型，会被丢弃）----
FROM golang:1.24 AS build
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server main.go
#      ↑ CGO_ENABLED=0：纯静态编译，不依赖 libc，才能塞进任何基础镜像
#      ↑ -ldflags="-s -w"：去掉符号表和调试信息，二进制再小 30%

# ---- 阶段 2：运行（轻量，最终镜像）----
FROM alpine:3.20
COPY --from=build /app/server /server    ← 只拷产物，工具链全部留在阶段 1
CMD ["/server"]
```

实测对比与**运行验证**：

```
$ docker build -f Dockerfile.multi -t demo-slim .
Successfully built de07bef64a3c

$ docker images
demo-fat    latest    199dc9166fb0    1.44GB     348MB
demo-slim   latest    de07bef64a3c    20MB       5.99MB     ← 72 倍瘦身
golang      1.24      d2d2bc1c84f7    1.32GB
alpine      3.20      d9e853e87e55    12.2MB

$ docker run -d -p 18080:8080 demo-slim
$ curl http://localhost:18080/
hello multi-stage                          ← 瘦身镜像真的能跑
```

套路总结：

| 语言 | 构建阶段 | 运行阶段可选 |
|------|------|------|
| Go | `golang:x` | `alpine`（20MB）/ `scratch`（连 shell 都没有，更小）/ distroless |
| Java | `maven` / `gradle` | `eclipse-temurin:*-jre`（别用完整 JDK）、或 `jlink` 裁剪运行时 |
| 前端 | `node` 构建 | `nginx:alpine` 只装 dist 静态文件 |
| 静态编译型一律 | 任意 | **`scratch`**（空镜像，二进制即镜像） |

> 🔑 多阶段的本质是把「构建依赖」和「运行依赖」分离——镜像里多出来的每一 MB，都会乘以拉取次数、节点数、版本数。瘦身不只是省钱，是缩小攻击面（[第 21 篇](/云原生/docker/docker-21-container-security/)：装得越少，漏洞越少）。

---

## 三、构建缓存：改一行代码，为什么有的层要重建

### 3.1 实测看缓存命中

[第 14 篇](/云原生/docker/docker-14-unionfs/)讲过「指令一层、上层变则下层全部重建」。原样重建上面的多阶段 Dockerfile，看真实输出：

```bash
$ docker build -f Dockerfile.multi -t demo-slim .
Step 1/7 : FROM golang:1.24 AS build
Step 2/7 : WORKDIR /app
 ---> Using cache
Step 3/7 : COPY . .
Step 4/7 : RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server main.go
Step 5/7 : FROM alpine:3.20
Step 6/7 : COPY --from=build /app/server /server
 ---> Using cache
Step 7/7 : CMD ["/server"]
 ---> Using cache
```

然后**只给 `main.go` 加一行注释**再建——`COPY . .` 的输入变了，它和它后面的 `RUN go build` 必须重建，其余层仍然命中：

```bash
 ---> Using cache                                    ← 前面的层不动
Step 4/7 : RUN CGO_ENABLED=0 go build ...           ← 编译重跑
Successfully built 651951ad8e27
```

一个实测中踩到的细节：我在目录里新建了 `.env` 文件后，连**内容没变的 `COPY . .` 也不命中了**——因为 `COPY . .` 的缓存键是「整个构建上下文的哈希」，上下文里任何文件变化都会击穿缓存。这正是 `.dockerignore` 的第二重价值（下一节）。

### 3.2 工程化建议

- **变动最频繁的内容放最底层之后**：依赖清单（`go.mod`/`pom.xml`/`package.json`）单独先 COPY + 下载依赖，再 COPY 源码——改业务代码不触发依赖重装；
- 指令顺序 = 变更频率从低到高：`FROM → 装依赖 → COPY 源码 → 编译`；
- 构建日志盯 `Using cache`（传统构建器）或 `CACHED`（BuildKit）的行数，就是缓存健康度。

---

## 四、.dockerignore：构建上下文的门卫（实测）

`docker build` 第一步是把**整个目录**（构建上下文）发给 daemon——`.git`、`node_modules`、`.env` 全都会被发送，还都参与 `COPY . .` 的缓存键和拷贝。`.dockerignore` 是门口的安检：

```bash
$ echo 'SECRET_TOKEN=abc123' > .env          # 模拟敏感文件
$ printf '.env\n' > .dockerignore            # 声明排除

# Dockerfile 里 COPY . . 全拷进 /app 再列出
$ docker build -f Dockerfile.ctx -t demo-ctx .
$ docker run --rm demo-ctx ls /app
Dockerfile.bad
Dockerfile.ctx
Dockerfile.multi
main.go
                                             ← .env 不在：被 .dockerignore 拦下了
```

三个作用一次说清：**上下文更小（传输快、缓存键稳定）、镜像更小、密钥不进镜像**。推荐起步模板：

```
.git
node_modules
__pycache__
*.log
.env
dist/
```

> ⚠️ `COPY . .` 是最常见的「密钥泄漏进镜像」事故来源——`.env`、证书、kubeconfig 这类文件必须进 `.dockerignore`。已进镜像的密钥？**删不掉（层还在），只能换密钥 + 重建镜像**。

---

## 五、ARG：构建参数的 正确用法

镜像里不该有密钥，但构建确实常需要参数（版本号、目标平台）。`ARG` 只在构建期存在、不留在最终镜像：

```dockerfile
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -ldflags="-X main.version=${VERSION}" -o server main.go

# docker build --build-arg VERSION=v1.2.3 .
```

构建期真需要密钥（拉私有仓库等）用 BuildKit 的 `--secret`（挂内存、不进层），绝不要 `ARG`/`ENV` 传密钥——它们都会被 `docker history` 记录。

---

## 六、BuildKit 与 buildx：现代构建器

以上用的还是 Docker 内置的传统构建器。现代构建器是 **BuildKit**（默认集成在 Docker Desktop；Linux 上通过 `docker buildx` 插件使用），能力一栏：

| 能力 | 说明 |
|------|------|
| 并行构建 | 无依赖的阶段同时跑（多阶段提速明显） |
| `--mount=type=cache` | 编译缓存在多次构建间复用（go mod/maven 的福音） |
| `--mount=type=secret` | 构建期密钥挂内存，不进镜像层 |
| 多平台构建 | `--platform linux/amd64,linux/arm64` 一条命令出多架构镜像 |
| 远程缓存后端 | 缓存推 S3/registry/GitHub Actions，CI 提速 |
| Attestations | 构建 SBOM、provenance 签名（[第 21 篇](/云原生/docker/docker-21-container-security/)供应链安全的落点） |

> ⚠️ 本机实测环境的一个真实坑：**CLI 没装 buildx 插件时 `docker build` 会静默回退到传统构建器**（`docker buildx version` 报 `unknown command`，构建输出是 `Step n/m` 而非 BuildKit 的 `#n`）。Ubuntu 上装法：`apt install docker-buildx-plugin`（docker 官方源）或从 [buildx releases](https://github.com/docker/buildx/releases) 下载放入 `~/.docker/cli-plugins/`。判断当前用的哪个构建器，看输出格式最直接。

---

## 七、基础镜像选型速查

| 基础镜像 | 体积 | 有 shell/libc | 适用 |
|------|:---:|:---:|------|
| `scratch` | 0B | ❌ | 静态编译二进制（Go/Rust），极致最小 |
| distroless | ~2-20MB | ❌（有运行时库） | 有运行时依赖但要安全（无 shell 可被攻击者利用） |
| `alpine` | ~5MB | ✅（musl libc） | 通用轻量；注意 musl 与 glibc 的兼容性坑（DNS/JVM） |
| `*-slim`（debian slim） | ~30-80MB | ✅（glibc） | 兼容性优先的折中 |
| 完整发行版 | 200MB+ | ✅ | 仅构建阶段用 |

---

## 小结

- **多阶段构建**分离构建依赖与运行依赖：实测 Go 服务 1.44GB → 20MB（72 倍），且瘦身镜像真实可跑；`COPY --from=阶段名` 是关键指令。
- **构建缓存**按层失效：改源码只击穿 `COPY` 之后的层；依赖清单先行拷贝是提速铁律；上下文任何文件变化都会击穿 `COPY . .`（实测 `.env` 触发）。
- **`.dockerignore`** 三重价值：上下文小、缓存稳、**密钥不进镜像**；已泄漏的密钥删层删不掉，只能换。
- `ARG` 传参数、BuildKit `--secret` 传密钥；buildx 未安装时 `docker build` 静默回退传统构建器（本机实测的坑）。
- 基础镜像从 `scratch`/distroless/alpine 到 slim 按需选，越小越安全。

**思考题**：Java 应用能像 Go 一样用 `scratch` 吗？差在哪一步？（提示：JVM 需要什么、`jlink` 和 `jdeps` 能裁掉什么。）

下一篇：[《Daemon 运维》](/云原生/docker/docker-23-daemon-ops/)。

---

## 参考资料

- [Docker Docs · Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Build images · Best practices](https://docs.docker.com/build/building/best-practices/) — 官方最佳实践（含 .dockerignore、USER、指令级建议）
- [BuildKit](https://docs.docker.com/build/buildkit/) / [buildx](https://docs.docker.com/build/concepts/builder/) / [Build secrets](https://docs.docker.com/build/building/secrets/)
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.x（golang:1.24 + alpine:3.20 真实构建）
