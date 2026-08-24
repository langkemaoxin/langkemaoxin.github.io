---
title: 构建进阶——同一个镜像从 1.44GB 滚到 20MB
sidebarGroup: Docker 系列
shortTitle: 10 构建进阶
order: 10
date: 2026-08-27T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 从 1.44GB 的单阶段反面教材滚起，每次只加一个因素：多阶段只搬产物、Using cache、.dockerignore 拦 .env、先清单后代码、ARG 注版本、认清 buildx——同一个镜像滚到 20MB，重建滚到秒级。
---

> **Docker 系列 · 第 10/33 篇**
> 上一篇：[《Dockerfile——从一句 echo 滚到三个能 curl 的自制镜像》](/云原生/docker/docker-09-dockerfile) · 下一篇：[《buildx 与多平台构建——从一个镜像滚到 amd64+arm64 双架构》](/云原生/docker/docker-11-buildx-bake)

---

## 开头：一个 hello world，镜像 1.44GB

团队写了个 Go 的 HTTP 服务，二十来行代码。Dockerfile 很直觉：`FROM golang` → `COPY` 源码 → `go build` → 完事。构建成功，镜像 **1.44GB**——每次发布推 1.44G、拉 1.44G，服务器磁盘被各种版本挤爆。

根因一句话：**单阶段构建把「盖楼的脚手架」（编译器、标准库源码、git、shell）焊死在了楼里**——构建依赖和运行依赖没分开。

本篇不先背概念。**同一份 `main.go` 全程不动，只动 Dockerfile 和构建环境**：先看它的镜像怎么从 1.44GB 一路滚到 20MB（瘦身线索），再让「改一行代码」的重建滚到秒级（缓存线索），最后把参数、构建器、基础镜像选型收尾。和[第 9 篇](/云原生/docker/docker-09-dockerfile)的分工：09 用 Python / Java / .NET 把多阶段「怎么写」入了门，本篇拿 Go 深挖**为什么能瘦、缓存怎么配才命中、构建器该用谁**，入门写法不再重讲。前置知识：[第 22 篇](/云原生/docker/docker-22-unionfs)的「一条指令 ≈ 一层」。

| 雪球 | 你加上去的 | 当场能看见的效果 |
|------|------------|------------------|
| **1** | 最直觉的单阶段 Dockerfile | build 成功，`docker images` 报 **1.44GB** |
| **2** | 第二个 `FROM`，只搬产物 | **20MB**（72 倍）；`curl` 出 `hello multi-stage` |
| **3** | 什么都不改，再 build 一次 | 三步打出 `---> Using cache` |
| **4** | 给 `main.go` 加一行注释 | 前面的层仍命中，只有编译重跑 |
| **5** | 目录里新建一个 `.env` | 内容没变的 `COPY . .` 也缓存失效 |
| **6** | `.dockerignore` 拦住 `.env` | `ls /app` 里没有 `.env`；缓存不再被它打穿 |
| **7** | 先拷依赖清单，再拷源码 | 改业务代码不重装依赖 |
| **8** | `ARG` 注入版本号 | 版本进二进制、不进镜像 |
| **9** | 认清当前用的是哪个构建器 | `buildx` 没装时输出是 `Step n/m`，BuildKit 是 `#n` |
| **10** | 基础镜像选型 | 知道这条瘦身路的尽头是 `scratch` |

实验目录固定 `/root/labs/build-advanced`。输出均来自本机：WSL2 Ubuntu-22.04 + Docker 29.x（CLI 没装 buildx 插件，走传统构建器——雪球 9 会看到它长什么样）。官方入口：[Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)、[Build images · Best practices](https://docs.docker.com/build/building/best-practices/)。

---

## 雪球 1：最直觉的单阶段 Dockerfile——实测 1.44GB

建实验目录，放入全部家当：一个 Go 服务 + 一份 Dockerfile。服务起 HTTP :8080，根路径回一句问候（这句问候雪球 2 拿来当验收）：

```bash
mkdir -p /root/labs/build-advanced && cd /root/labs/build-advanced
```

`main.go`（里面那个 `version` 变量现在看着多余，雪球 8 会用 `-ldflags` 往里注值）：

```go
package main

import (
	"fmt"
	"net/http"
)

var version = "dev"

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "hello multi-stage")
	})
	http.ListenAndServe(":8080", nil)
}
```

最直觉的 Dockerfile——因为它是反面教材，直接留档成 `Dockerfile.bad`：

```dockerfile
FROM golang:1.24
WORKDIR /app
COPY . .
RUN go build -o server main.go
CMD ["./server"]
```

五行在干什么：站在官方 Go 工具链上，把源码拷进去、现场编译、跑二进制：

```bash
docker build -f Dockerfile.bad -t demo-fat .
```

构建后 `docker images` 看体积（真实输出）：

```text
REPOSITORY        TAG          SIZE
demo-fat          latest       1.44GB     ← 我们的镜像
golang            1.24         1.32GB     ← 基础镜像
```

解读：demo-fat 比 golang 底座只大一百来 MB——**镜像的 92% 是 Go 工具链**。golang 基础镜像带着完整编译器、标准库源码、git、shell……而运行期只需要一个**静态编译的二进制**（几 MB）。工具链是「脚手架」，盖完楼就该拆掉——但单阶段构建把脚手架焊死在了楼里：

```text
demo-fat（1.44GB）
├── golang:1.24 底座 1.32GB：编译器/标准库源码/git/shell   ← 92%，脚手架
├── 你的源码 + 编译出的 server                             ← 几 MB，楼本体
└── 脚手架没拆，跟楼一起交付了
```

---

## 雪球 2：第二个 FROM——只搬产物，实测 20MB

多阶段构建（multi-stage build）只改一件事：**第一阶段用重型镜像编译，第二阶段用轻量镜像只装产物**。新增 `Dockerfile.multi`：

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

构建、对比、**跑起来验证**（真实输出）：

```text
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

逐行读：

| 行 | 说明 |
|----|------|
| `Successfully built de07bef64a3c` | 新镜像 ID，下面 `docker images` 里能对上 |
| `demo-fat … 1.44GB` | 雪球 1 的反面教材还在，作对照 |
| `demo-slim … 20MB` | **72 倍瘦身**（行尾多出的 348MB / 5.99MB 是这条命令输出的另一列，本篇用不上，盯着尺寸列即可） |
| `alpine 3.20 … 12.2MB` | 新底座本身只有 12.2MB；20MB ≈ 底座 + 一个几 MB 的静态二进制 |
| `hello multi-stage` | 瘦身镜像真的能跑，雪球 1 埋的问候在这里验收 |

编译命令里那两个参数，文件里的 ↑ 注释再展开一遍：

- `CGO_ENABLED=0`：纯静态编译，不依赖 libc，才能塞进任何基础镜像（包括雪球 10 的 `scratch`）；
- `-ldflags="-s -w"`：去掉符号表和调试信息，二进制再小 30%。

套路总结（构建阶段选工具链，运行阶段能多轻就多轻）：

| 语言 | 构建阶段 | 运行阶段可选 |
|------|------|------|
| Go | `golang:x` | `alpine`（20MB）/ `scratch`（连 shell 都没有，更小）/ distroless |
| Java | `maven` / `gradle` | `eclipse-temurin:*-jre`（别用完整 JDK）、或 `jlink` 裁剪运行时 |
| 前端 | `node` 构建 | `nginx:alpine` 只装 dist 静态文件 |
| 静态编译型一律 | 任意 | **`scratch`**（空镜像，二进制即镜像） |

> 🔑 多阶段的本质是把「构建依赖」和「运行依赖」分离——镜像里多出来的每一 MB，都会乘以拉取次数、节点数、版本数。瘦身不只是省钱，是缩小攻击面（[第 25 篇](/云原生/docker/docker-25-container-security)：装得越少，漏洞越少）。

---

## 雪球 3：什么都不改，再 build 一次——Using cache

镜像瘦了 72 倍，接着治第二个痛点：每次 build 都全量重跑？[第 22 篇](/云原生/docker/docker-22-unionfs)讲过「指令一层、上层变则下层全部重建」。原样重建上面的多阶段 Dockerfile，看真实输出：

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

七步里三处 `---> Using cache`：Step 2 的 `WORKDIR`、Step 6 的 `COPY --from`、Step 7 的 `CMD`——指令的输入都没变，直接复用上一次的层，不再重跑。缓存的最小单位是**层**，判据是**这条指令的输入变没变**：

```text
指令输入没变 ──→ 打 Using cache，复用上一次的层
指令输入变了 ──→ 这一层重跑，它后面的层跟着全部重跑
```

那「输入」到底包括什么？下一球做个最小实验：改一个最不该影响编译的地方。

---

## 雪球 4：只给 main.go 加一行注释——击穿点以下全部重跑

改动小到不能再小：**只给 `main.go` 加一行注释**，逻辑零变化，再建——`COPY . .` 的输入变了，它和它后面的 `RUN go build` 必须重建，其余层仍然命中：

```bash
 ---> Using cache                                    ← 前面的层不动
Step 4/7 : RUN CGO_ENABLED=0 go build ...           ← 编译重跑
Successfully built 651951ad8e27
```

三行读下来：第一行 `Using cache` 是击穿点之前没动的层；`Step 4/7` 的 `go build` 重跑——注释虽然不参与逻辑，但 `COPY . .` 拷的文件内容变了；`Successfully built 651951ad8e27` 是新镜像 ID，和雪球 2 的 `de07bef64a3c` 不同，因为产物层变了。

把模型补全：

```text
FROM golang:1.24    ← 底座，不动
WORKDIR /app        ← 输入没变，Using cache
COPY . .            ← main.go 变了：击穿点
RUN go build        ← 击穿点之后，跟着重跑
```

反过来就是工程铁律：**变更最频繁的内容，放在 Dockerfile 最后**——雪球 7 把它落成写法。

---

## 雪球 5：目录里多出一个 .env，缓存也跟着碎

改 `main.go` 击穿缓存，天经地义——编译输入确实变了。但实测踩到一个反直觉的细节：我在目录里**新建了 `.env` 文件**后，连**内容没变的 `COPY . .` 也不命中了**。

原因：`COPY . .` 拷的不是「你指定的几个文件」，而是**整个构建上下文**；它的缓存键是「整个构建上下文的哈希」——上下文里**任何**文件变化（哪怕程序根本不用它）都会击穿缓存。你可以复现：在实验目录 `touch .env` 再 build，上一球还命中的 `COPY . .` 就不再打 `Using cache`。

这个现象一次暴露两个病：

1. **缓存被无关文件绑架**：多一个日志、多一个临时文件，编译就得重跑；
2. 更糟的是——这个 `.env` 还会被**真的拷进镜像**（雪球 6 当场看）。

要一味药同时治两个病，得在「门口」把无关文件拦下来。这正是 `.dockerignore` 的第二重价值（雪球 6）。

---

## 雪球 6：.dockerignore——门口的安检，实测拦下 .env

`docker build` 第一步是把**整个目录**（构建上下文）发给 daemon——`.git`、`node_modules`、`.env` 全都会被发送，还都参与 `COPY . .` 的缓存键和拷贝。`.dockerignore` 是门口的安检。先造一个「专门拷全目录」的 `Dockerfile.ctx`，三行：

```dockerfile
FROM alpine:3.20
WORKDIR /app
COPY . .
```

再模拟一个敏感文件、声明排除、构建后进容器列出 `/app`（真实输出）：

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

`ls /app` 四行逐个对上：`Dockerfile.bad`（雪球 1 的反面教材）、`Dockerfile.ctx`、`Dockerfile.multi`、`main.go`——全进来了；**`.env` 不在：被 .dockerignore 拦下了**。安检没放行，它就不进上下文、不进缓存键、也不会被 COPY。

三个作用一次说清：**上下文更小（传输快、缓存键稳定）、镜像更小、密钥不进镜像**。推荐起步模板：

```text
.git
node_modules
__pycache__
*.log
.env
dist/
```

> ⚠️ `COPY . .` 是最常见的「密钥泄漏进镜像」事故来源——`.env`、证书、kubeconfig 这类文件必须进 `.dockerignore`。已进镜像的密钥？**删不掉（层还在，见[第 22 篇](/云原生/docker/docker-22-unionfs)），只能换密钥 + 重建镜像**。

回看雪球 5 的两个病：`.env` 进了 `.dockerignore` 之后，再新建、再修改它都不打穿 `COPY . .` 的缓存，也不会再被拷进镜像——一味药治两病。

---

## 雪球 7：先拷依赖清单，再拷源码——改代码不重装依赖

雪球 4 里，加一行注释就重跑 `go build`，这躲不开（编译输入真的变了）。但很多 Dockerfile 把**更贵的东西也搭进去了**：`COPY . .` 在前、装依赖在后，改一行业务代码连依赖都得重装。本篇实验小到没有 go.mod（单文件直接 `go build`）；真实项目的构建阶段应该把清单和源码**拆开拷**：

```dockerfile
FROM golang:1.24 AS build
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server main.go
```

三条工程化建议：

- **变动最频繁的内容放最后**：依赖清单（`go.mod`/`pom.xml`/`package.json`）单独先 COPY + 下载依赖，再 COPY 源码——改业务代码不触发依赖重装；
- 指令顺序 = 变更频率从低到高：`FROM → 装依赖 → COPY 源码 → 编译`；
- 构建日志盯 `Using cache`（传统构建器）或 `CACHED`（BuildKit）的行数，就是缓存健康度。

「先清单后代码」这套写法，[第 9 篇](/云原生/docker/docker-09-dockerfile)已在 Python / Java / .NET 三回实测过：`requirements.txt` / `pom.xml` / `*.csproj` 先行，改代码重建时依赖层秒过。本篇只是用雪球 4 的实验把「为什么」钉死了。

---

## 雪球 8：ARG——把版本号打进二进制，而不是打进镜像

镜像里不该有密钥，但构建确实常需要参数（版本号、目标平台）。`ARG` 只在构建期存在、不留在最终镜像。给 `Dockerfile.multi` 的构建阶段加上它（雪球 1 埋的 `var version` 这时回收）：

```dockerfile
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -ldflags="-X main.version=${VERSION}" -o server main.go

# docker build --build-arg VERSION=v1.2.3 .
```

- `ARG VERSION=dev`：声明构建参数，不传就用默认值；
- `-X main.version=${VERSION}`：链接期把 `main.version` 变量的初始值替换成传入的值——二进制自己知道自己是哪个版本；
- `--build-arg VERSION=v1.2.3`：构建时从命令行注入。

效果：版本号**进了二进制**（程序运行时能读到），**不进镜像**；换了版本号，也只有用到它的那条 `RUN` 起被击穿（雪球 4 的规则同样适用），前面的层照常命中。

但别把 `ARG` 当万能：构建期真需要密钥（拉私有仓库等）用 BuildKit 的 `--secret`（挂内存、不进层），绝不要 `ARG`/`ENV` 传密钥——它们都会被 `docker history` 记录，翻镜像历史就能看到。

---

## 雪球 9：认清你正在用哪个构建器——buildx 没装会静默回退

以上用的还是 Docker 内置的**传统构建器**。证据就在眼前：本篇从雪球 3 开始的构建输出都是 `Step n/m` 格式——这是传统构建器；BuildKit 的输出是 `#n` 开头。现代构建器是 **BuildKit**（默认集成在 Docker Desktop；Linux 上通过 `docker buildx` 插件使用），能力一栏：

| 能力 | 说明 |
|------|------|
| 并行构建 | 无依赖的阶段同时跑（多阶段提速明显） |
| `--mount=type=cache` | 编译缓存在多次构建间复用（go mod/maven 的福音） |
| `--mount=type=secret` | 构建期密钥挂内存，不进镜像层 |
| 多平台构建 | `--platform linux/amd64,linux/arm64` 一条命令出多架构镜像 |
| 远程缓存后端 | 缓存推 S3/registry/GitHub Actions，CI 提速 |
| Attestations | 构建 SBOM、provenance 签名（[第 25 篇](/云原生/docker/docker-25-container-security/)供应链安全的落点） |

> ⚠️ 本机实测环境的一个真实坑：**CLI 没装 buildx 插件时 `docker build` 会静默回退到传统构建器**（`docker buildx version` 报 `unknown command`，构建输出是 `Step n/m` 而非 BuildKit 的 `#n`）。Ubuntu 上装法：`apt install docker-buildx-plugin`（docker 官方源）或从 [buildx releases](https://github.com/docker/buildx/releases) 下载放入 `~/.docker/cli-plugins/`。判断当前用的哪个构建器，看输出格式最直接。

[第 16 篇](/云原生/docker/docker-16-compose)雪球 7 里 `compose build` 冒出的那条 `buildx isn't installed` warning，就是同一件事的另一张面孔。

---

## 雪球 10：基础镜像选型——这条瘦身路的尽头是 scratch

雪球 2 的运行阶段用了 alpine（12.2MB），还能更小吗？把常见底座摆在一起看：

| 基础镜像 | 体积 | 有 shell/libc | 适用 |
|------|:---:|:---:|------|
| `scratch` | 0B | ❌ | 静态编译二进制（Go/Rust），极致最小 |
| distroless | ~2-20MB | ❌（有运行时库） | 有运行时依赖但要安全（无 shell 可被攻击者利用） |
| `alpine` | ~5MB | ✅（musl libc） | 通用轻量；注意 musl 与 glibc 的兼容性坑（DNS/JVM） |
| `*-slim`（debian slim） | ~30-80MB | ✅（glibc） | 兼容性优先的折中 |
| 完整发行版 | 200MB+ | ✅ | 仅构建阶段用 |

Go + `CGO_ENABLED=0` 产出纯静态二进制，连 alpine 那十几 MB 都可以省——`FROM scratch`，二进制即镜像。回头看雪球 2 的语言套路表：每门语言「运行阶段可选」那一列，都是沿这张表往下走。而选小的另一个理由还是安全：装得越少，漏洞越少、攻击面越小（[第 25 篇](/云原生/docker/docker-25-container-security)）。

---

## 命令怎么记、一个历史包袱

按滚雪球的顺序记：

| 手段 | 命令 / 写法 | 你在哪一球用过 |
|------|-------------|----------------|
| 构建 | `docker build -f <Dockerfile> -t <名> .` | 1～4 |
| 看体积 | `docker images` | 1、2 |
| 多阶段 | 第二个 `FROM … AS build` + `COPY --from=build` | 2 |
| 更小的二进制 | `CGO_ENABLED=0`、`-ldflags="-s -w"` | 2 |
| 看缓存健康度 | 盯 `Using cache` / `CACHED` 的行数 | 3、4、7 |
| 拦无关文件 | `.dockerignore` | 6 |
| 先清单后代码 | `COPY go.mod` → 下载依赖 → `COPY . .` | 7 |
| 构建参数 | `ARG` + `--build-arg` | 8 |
| 验构建器 | `docker buildx version`；看 `Step n/m` 还是 `#n` | 9 |
| 选底座 | scratch / distroless / alpine / slim | 2、10 |

**历史包袱：传统构建器**。BuildKit 已是 Docker Desktop 与新版 Engine 的默认，但 CLI 没装 buildx 插件时 `docker build` **静默**回退传统构建器——不报错，只换输出格式。本机 `docker buildx version` 就报 `unknown command`（雪球 9 实测）。另外，老教程里用 `ENV`/`ARG` 传构建密钥的做法也别学：`docker history` 全记着，现代替代是 BuildKit 的 `--secret`。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|------|----------------------|
| [第 9 篇](/云原生/docker/docker-09-dockerfile) Dockerfile | 开头分工：09 三语言入门，本篇深挖；雪球 7 的先清单后代码 |
| [第 22 篇](/云原生/docker/docker-22-unionfs) 分层 | 雪球 3、4 的层缓存原理；雪球 6 的「密钥删层删不掉」 |
| [第 25 篇](/云原生/docker/docker-25-container-security) 安全 | 雪球 2、10 的攻击面；雪球 9 的 attestations |
| [第 16 篇](/云原生/docker/docker-16-compose) Compose | 雪球 9 的 buildx warning |
| [第 28 篇](/云原生/docker/docker-28-daemon-ops) Daemon 运维 | 下一篇 |

---

## 小结

从 1.44GB 的反面教材开始，每次只加一个因素：

1. **单阶段**：镜像的 92% 是工具链脚手架——实测 1.44GB。
2. **多阶段**：第二个 `FROM` + `COPY --from` 只搬产物——20MB（72 倍），且 `curl` 验证真的能跑。
3. **原样重建**：输入没变的层打 `Using cache`。
4. **加一行注释**：`COPY . .` 被击穿，其后的层全部重跑。
5. **新建 `.env`**：上下文里任何文件变化都击穿 `COPY . .`——缓存键是整个上下文的哈希。
6. **`.dockerignore`**：拦下 `.env`，上下文小、缓存稳、密钥不进镜像；已泄漏的密钥只能换，删层删不掉。
7. **先清单后代码**：依赖清单单独先拷，改业务代码不重装依赖。
8. **`ARG`**：版本号进二进制、不进镜像；密钥走 BuildKit `--secret`。
9. **构建器**：buildx 没装会静默回退，`Step n/m` 对 `#n` 一眼分辨。
10. **选型**：scratch / distroless / alpine / slim，越小学越安全。

**思考题**：Java 应用能像 Go 一样用 `scratch` 吗？差在哪一步？（提示：JVM 需要什么、`jlink` 和 `jdeps` 能裁掉什么。）

下一篇：[《Daemon 运维》](/云原生/docker/docker-28-daemon-ops)。

---

## 参考资料

- [Docker Docs · Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Build images · Best practices](https://docs.docker.com/build/building/best-practices/) — 官方最佳实践（含 .dockerignore、USER、指令级建议）
- [BuildKit](https://docs.docker.com/build/buildkit/) / [buildx](https://docs.docker.com/build/concepts/builder/) / [Build secrets](https://docs.docker.com/build/building/secrets/)
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.x（golang:1.24 + alpine:3.20 真实构建；未装 buildx 插件，构建输出为传统构建器 `Step n/m` 格式）
