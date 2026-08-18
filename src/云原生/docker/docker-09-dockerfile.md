---
title: Dockerfile 自制镜像——从最小实验到完整静态站案例
sidebarGroup: Docker 系列
shortTitle: 09 Dockerfile 自制镜像
order: 9
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

> **Docker 系列 · 第 9/24 篇**
> 上一篇：[《Docker 本地镜像载入与载出——离线环境的镜像搬运工》](/云原生/docker/docker-08-image-transfer) · 下一篇：[《Harbor 安装》](/云原生/docker/docker-10-harbor)

---

## 开头：拉别人的镜像总不对劲，能不能自己做一个？

常见痛点：

- 官方镜像太大，你的业务其实只需要一个静态页或一个二进制
- 在容器里手改配置再 `docker commit`——同事复现不了，CI 也接不上
- 想把「安装依赖 + 拷文件 + 启动命令」写成**可版本管理的配方**

Docker 提供两条路：`commit`（临时救急，见[第 5 篇](/云原生/docker/docker-05-container-and-image)）与 **`docker build` + Dockerfile**（正式交付）。本篇把第二条**从最小实验跑到一个完整案例**。

> **实验环境**（文中输出均来自本机）：WSL2 Ubuntu-22.04 + Docker Engine **29.1.3**（传统构建器，输出 Step n/m 格式）。官方参考：[Dockerfile reference](https://docs.docker.com/reference/dockerfile/)、[docker build](https://docs.docker.com/reference/cli/docker/build/)、[Best practices](https://docs.docker.com/build/building/best-practices/)。多阶段构建与缓存深挖见[第 23 篇](/云原生/docker/docker-23-build-advanced)。

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
| **层（layer）** | 多数会改文件系统的指令会产生新层；层可缓存、可复用（直觉见下文 `history`，原理见[第 17 篇](/云原生/docker/docker-17-unionfs)） |
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

容器启动时，引擎最终要拉起**一条进程**，可以想成：

```text
最终命令 ≈ 「程序」 + 「参数」
```

两者分工就是：

| | **ENTRYPOINT** | **CMD** |
|--|----------------|---------|
| **用来做什么** | 定死这个镜像的**主程序 / 入口**（「这个容器是干什么的」） | 给出**默认参数**；若没写 ENTRYPOINT，则 CMD 本身就是整条默认命令 |
| **心态** | 「怎么 run，主程序都还是它」 | 「没人多写东西时，用这套默认值」 |
| **`docker run 镜像 后面跟的内容`** | **一般不换入口**，多半变成传给入口的**参数** | **整段被替换**（不再用 Dockerfile 里的 CMD） |

拼装公式（exec 格式、两者都写时）：

```text
实际执行 = ENTRYPOINT 里的数组成员  +  （run 后面的参数；若没有，就用 CMD）
```

### 5.1 三种写法：究竟解决什么问题

**① 只写 CMD** —— 「默认启动命令，允许整条换掉」

```dockerfile
FROM alpine:3.21
CMD ["echo", "only-cmd-default"]
```

- `docker run --rm lab-cmd:1.0` → 执行 `echo only-cmd-default`
- `docker run --rm lab-cmd:1.0 echo replaced-entirely` → **整段 CMD 被换掉**，变成跑 `echo replaced-entirely`  
  （适合通用工具镜像、临时覆盖命令；本机输出见 §5.3）

**② 只写 ENTRYPOINT** —— 「一启动就跑这个程序」

入口固定；`run` 后面跟的都是参数。适合「镜像本身就是一个固定服务」。

**③ ENTRYPOINT + CMD（最常见）** —— 「入口固定，默认参数可改」

这是生产里最有用的组合：主程序不变，端口/子命令/配置开关可以改。

### 5.2 本机实验：两者一起写时谁说了算

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

对照公式：

| 你敲的命令 | 实际相当于 |
|------------|------------|
| `docker run … lab-ep:1.0` | `echo fixed-prefix default-arg`（用了 CMD） |
| `docker run … lab-ep:1.0 overridden-arg` | `echo fixed-prefix overridden-arg`（**只换了 CMD**，ENTRYPOINT 还在） |

所以：`run` 后面跟的不是「再开一个无关命令」，而是**塞给入口的参数**——这就是 ENTRYPOINT 存在的意义。

### 5.3 对照：只有 CMD 时，「后面跟的东西」完全不同

```dockerfile
FROM alpine:3.21
CMD ["echo", "only-cmd-default"]
```

```bash
docker build -t lab-cmd:1.0 -f Dockerfile.cmd .
docker run --rm lab-cmd:1.0
docker run --rm lab-cmd:1.0 echo replaced-entirely
```

本机输出：

```text
only-cmd-default
replaced-entirely
```

第二次**没有**再打印 `only-cmd-default`——因为没有 ENTRYPOINT 托底，`run` 后面的内容替换了整条 CMD。

**口诀**：

- 想「主程序永远不变」→ 用 **ENTRYPOINT**
- 想「默认参数 / 默认可被换掉的命令」→ 用 **CMD**
- 两者一起 → 固定入口 + 可改参数（推荐）

### 5.4 写法：优先 exec 格式（JSON 数组）

```dockerfile
# 推荐：exec 格式 —— 直接 exec 进程，信号转发更干净
CMD ["echo", "hi"]
ENTRYPOINT ["nginx", "-g", "daemon off;"]

# 不推荐当默认习惯：shell 格式 —— 实际是 /bin/sh -c "…"
CMD echo hi
```

shell 格式里环境变量容易「看起来能展开」；exec 格式更直白，需要展开时再显式写 `["sh", "-c", "…"]`。日常优先 JSON 数组。

### 5.5 回扣 `lab-web`：为什么案例里没写这两项？

`nginx:alpine` **已经**带了合适的 `ENTRYPOINT`（入口脚本）和 `CMD`（前台跑 nginx）。你的 Dockerfile 只 `COPY` 首页即可——站在基础镜像的入口上定制内容，而不必重写「怎么启动 Nginx」。

若你自己做业务镜像（例如 `java -jar app.jar`），典型写法是：

```dockerfile
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
CMD ["--spring.profiles.active=prod"]
```

换环境时：`docker run myapp --spring.profiles.active=test`，入口仍是 `java -jar`，只改参数。

---

## 六、构建完如何发布？

本地验证通过后，打上私有仓前缀再推（先装 Harbor 见[第 10 篇](/云原生/docker/docker-10-harbor)，tag / push 见[使用篇](/云原生/docker/docker-10-harbor-usage)）：

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
| 多阶段 / BuildKit 缓存调优 | 镜像过大、构建太慢 → [第 23 篇](/云原生/docker/docker-23-build-advanced) |
| 分层与 UnionFS 原理 | [第 17 篇](/云原生/docker/docker-17-unionfs) |

---

## 八、三个真实语言打包案例：FastAPI、Spring Boot、ASP.NET（实测）

前面的案例只往镜像里拷过一个静态文件。真实后端项目长这样：几十个源文件、一堆第三方依赖、（多数语言还要）编译。把三个主流栈各打包一遍，套路会自己浮出来：**选基础镜像 → 装依赖 → 拷代码 → 声明启动命令**；编译型语言再加一手「多阶段构建」。三个案例的完整对照先行（大小均本机 `docker images` 实测）：

| | Python · FastAPI | Java · Spring Boot | .NET · ASP.NET |
|------|------|------|------|
| 语言类型 | 解释型（不用编译） | 编译到 JVM 字节码 | 编译到 IL 中间码 |
| 依赖清单 | `requirements.txt` | `pom.xml` | `MyApp.csproj` |
| 构建工具链镜像 | —（运行时装依赖即可） | `maven:3.9-eclipse-temurin-21`（811MB） | `dotnet/sdk:8.0-alpine`（989MB） |
| 运行时镜像 | `python:3.12-slim`（179MB） | `eclipse-temurin:21-jre`（493MB） | `dotnet/aspnet:8.0-alpine`（158MB） |
| Dockerfile 阶段数 | 1 | 2（多阶段） | 2（多阶段） |
| **最终镜像** | **fastapi-app:1.0 = 212MB** | **springboot-app:1.0 = 526MB** | **aspnet-app:1.0 = 158MB** |
| 验证 | `curl :8000/hello` | `curl :8081/hello` | `curl :8083/hello` |

### 8.1 Python · FastAPI：解释型，单阶段就够

Python 不用编译，运行时装好依赖就能跑——所以一个 `FROM` 到底。先备项目三件套（`mkdir -p /root/labs/fastapi-app && cd /root/labs/fastapi-app`）：

```bash
$ cat > main.py <<'EOF'
from fastapi import FastAPI

app = FastAPI()

@app.get("/hello")
def hello():
    return {"msg": "hello from fastapi"}
EOF

$ cat > requirements.txt <<'EOF'
fastapi
uvicorn
EOF
```

三个名词：**FastAPI** 是 Python 的 web 框架（给函数加个装饰器就是一个接口）；**requirements.txt** 是依赖清单，交给 **pip**（Python 的包管理器，地位相当于 apt）去装；**uvicorn** 是跑这类应用的 web 服务器进程。Dockerfile 逐行拆：

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

| 指令 | 干什么 |
|------|--------|
| `FROM python:3.12-slim` | 官方 Python 的 **slim 变体**（精简 Debian 底座，179MB）。解释型语言「运行时 = 生产运行时」，一个镜像两用 |
| `COPY requirements.txt .` | **先只拷依赖清单，不拷代码**——用意见本节末「怎么读」 |
| `RUN pip install --no-cache-dir -r …` | 按清单装依赖；`--no-cache-dir` 不留 pip 下载缓存，镜像更小 |
| `COPY main.py .` | 清单装完才拷代码 |
| `CMD ["uvicorn", "main:app", …]` | 启动 uvicorn 跑 `main.py` 里的 `app` 对象。**`--host 0.0.0.0` 必须写**：默认只听 127.0.0.1，`-p` 映射进来的流量到不了容器内回环（第 11 篇的坑） |

构建并验收（实跑输出，`Step n/7` 是传统构建器的步骤计数）：

```bash
$ docker build -t fastapi-app:1.0 .
Step 1/7 : FROM python:3.12-slim
Step 2/7 : WORKDIR /app
Step 3/7 : COPY requirements.txt .
Step 4/7 : RUN pip install --no-cache-dir -r requirements.txt
Successfully installed … fastapi-0.141.1 … uvicorn-0.52.3    ← Step 4 的输出：依赖装进了这一层
Step 5/7 : COPY main.py .
Step 6/7 : EXPOSE 8000
Step 7/7 : CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
Successfully built 9a041350737c
Successfully tagged fastapi-app:1.0

$ docker run -d --name fastapi-demo -p 8000:8000 fastapi-app:1.0
$ sleep 2 && curl -s localhost:8000/hello
{"msg":"hello from fastapi"}

$ docker images fastapi-app --format '{{.Repository}}:{{.Tag}} {{.Size}}'
fastapi-app:1.0 212MB
```

**怎么读**：212MB = 179MB 底座 + 33MB 依赖；`main.py` 那层只有几百字节。**改代码重建时，前四层全部命中缓存、秒过，从第 5 步才开始重跑**——「先拷清单、再拷代码」就是为这一刻埋的伏笔（缓存深挖见第 23 篇）。

### 8.2 Java · Spring Boot：编译型，多阶段构建登场

Java 的麻烦在于：源码要先用 **Maven**（Java 的构建工具：下依赖、编译、打 jar）加工，而「Maven + JDK」工具链有 811MB；但**运行**一个 jar 只需要 JRE（Java 精简运行时，493MB）。全塞进一个镜像＝又大又乱。

**多阶段构建**＝一份 Dockerfile 写两个 `FROM`：第一阶段用「大而全」的工具链镜像干活；第二阶段从精简运行时起步，`COPY --from` 只把**产物**搬过来——工具链留在构建期，一克不进最终镜像。先备最小 Spring Boot 项目（一个启动类 + 一个接口）：

```bash
$ mkdir -p /root/labs/springboot-app/src/main/java/com/example/demo && cd /root/labs/springboot-app

$ cat > pom.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.4</version>
    <relativePath/>
  </parent>
  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>1.0</version>
  <properties>
    <java.version>21</java.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
EOF
```

（`parent` 挂上 `spring-boot-starter-parent` 后，依赖不用写版本号、打包方式自动是可执行 fat jar。）Java 侧就两个类：

```java
// src/main/java/com/example/demo/DemoApplication.java（路径即包名，一条 mkdir -p 建到底）
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}

@RestController
class HelloController {
    @GetMapping("/hello")
    public String hello() {
        return "hello from spring boot";
    }
}
```

Dockerfile 及关键行拆解：

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/demo-1.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

| 关键行 | 干什么 |
|--------|--------|
| `FROM maven:… AS build` | 第一阶段，起名 `build`；eclipse-temurin 是主流开源 JDK 发行版 |
| `COPY pom.xml .` + `RUN mvn … dependency:go-offline` | `pom.xml` 是 Maven 的项目与依赖清单；`go-offline` 把依赖**全部预下载**。只拷清单不拷源码——和 8.1 拷 `requirements.txt` 同款套路第二回 |
| `RUN mvn -q package -DskipTests` | 编译打包成 `target/demo-1.0.jar`（`-DskipTests` 跳测试加快演示，**生产别跳**） |
| `FROM eclipse-temurin:21-jre` | **第二阶段从零开始**：换用 JRE 运行时镜像 |
| `COPY --from=build …/demo-1.0.jar app.jar` | 从第一阶段**只**搬产物 jar |
| `ENTRYPOINT ["java", "-jar", "app.jar"]` | 运行时入口：java 直接跑 jar |

实跑（`Step 7` 是两个阶段的分水岭）：

```bash
$ docker build -t springboot-app:1.0 .
Step 1/11 : FROM maven:3.9-eclipse-temurin-21 AS build
Step 2/11 : WORKDIR /src
Step 3/11 : COPY pom.xml .
Step 4/11 : RUN mvn -q dependency:go-offline
Step 5/11 : COPY src ./src
Step 6/11 : RUN mvn -q package -DskipTests
Step 7/11 : FROM eclipse-temurin:21-jre
Step 8/11 : WORKDIR /app
Step 9/11 : COPY --from=build /src/target/demo-1.0.jar app.jar
Step 10/11 : EXPOSE 8080
Step 11/11 : ENTRYPOINT ["java", "-jar", "app.jar"]
Successfully built c20f893836fe
Successfully tagged springboot-app:1.0

$ docker run -d --name springboot-demo -p 8081:8080 springboot-app:1.0
$ sleep 8 && curl -s localhost:8081/hello
hello from spring boot

$ docker images springboot-app --format '{{.Repository}}:{{.Tag}} {{.Size}}'
springboot-app:1.0 526MB
```

**怎么读**：前 6 步活在 811MB 的构建镜像里，后 5 步从 493MB 的 JRE 起步；最终 526MB ≈ JRE 底座 + 一个 **fat jar**（Spring Boot 把全部依赖打进单个可执行 jar 的打包方式）。811MB 的 Maven 工具链没有进最终镜像。

### 8.3 .NET · ASP.NET：同一个套路，产物是一个目录

项目骨架不手写，用 SDK 容器生成（宿主机不用装 .NET——SDK 镜像本身就是工具链；`-v` 挂载让产物直接落进宿主机目录）：

```bash
$ mkdir -p /root/labs/aspnet-app && cd /root/labs/aspnet-app
$ docker run --rm -v /root/labs/aspnet-app:/src -w /src \
    mcr.microsoft.com/dotnet/sdk:8.0-alpine dotnet new web -n MyApp -o .
Restored /src/MyApp.csproj (in 90 ms).
Restore succeeded.

$ ls
MyApp.csproj  Program.cs  Properties  appsettings.Development.json  appsettings.json  obj
```

`dotnet new web`＝官方「空 web 项目」模板。给 `Program.cs` 加一个 `/hello` 端点（`MapGet`＝注册一条 GET 路由）：

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello World!");
app.MapGet("/hello", () => "hello from aspnet");

app.Run();
```

Dockerfile 关键行拆解：

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY MyApp.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

| 关键行 | 干什么 |
|--------|--------|
| `FROM …/sdk:8.0-alpine AS build` | SDK＝编译工具链全量，989MB。注意仓库是 **mcr.microsoft.com**（微软自己的镜像仓，不在 Docker Hub）；国内直连较慢——本篇实验里它就是最慢的一步 |
| `COPY MyApp.csproj .` + `RUN dotnet restore` | `csproj` 是项目与依赖清单；`restore` 从 **NuGet**（.NET 的包仓库）下依赖。先拷清单，同款套路第三回 |
| `RUN dotnet publish -c Release -o /app/publish` | 编译并**发布成一个目录**（一堆 dll，不是单文件——与 Java 的单个 fat jar 不同） |
| `FROM …/aspnet:8.0-alpine` | ASP.NET 官方运行时镜像，仅 158MB |
| `COPY --from=build /app/publish .` | 只搬发布目录 |

实跑：

```bash
$ docker build -t aspnet-app:1.0 .
Step 1/11 : FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
…
Step 6/11 : RUN dotnet publish -c Release -o /app/publish
Step 7/11 : FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
…
Step 11/11 : ENTRYPOINT ["dotnet", "MyApp.dll"]
Successfully built 367524fdc2c7
Successfully tagged aspnet-app:1.0

$ docker run -d --name aspnet-demo -p 8083:8080 aspnet-app:1.0
$ sleep 3 && curl -s localhost:8083/hello
hello from aspnet

$ docker images aspnet-app --format '{{.Repository}}:{{.Tag}} {{.Size}}'
aspnet-app:1.0 158MB
```

**怎么读**：最终镜像 158MB 与运行时底座**同尺寸**——模板级项目的产物小到几乎不占；对比构建期 989MB 的 SDK，这是多阶段收益最极端的一例。两个细节：.NET 8 起 ASP.NET 默认监听 **8080**（不再是 80），所以 `EXPOSE`/`-p` 都写 8080；`COPY . .` 会把骨架生成的 `obj/` 也带进构建阶段，真实项目应配 `.dockerignore` 排除 `bin/`、`obj/`（第 23 篇实测过它还能拦住 `.env`）。

### 8.4 提取公因数：四步套路

三个栈走完，公因数就四条：

1. **选底座**：解释型用 slim 运行时；编译型准备「工具链 + 运行时」两个底座
2. **锁依赖清单**：`requirements.txt` / `pom.xml` / `*.csproj`——清单进 Git，构建才可复现
3. **先清单后代码**：依赖层与代码层分开，改代码时依赖层缓存命中、重建飞快
4. **声明启动命令**：`CMD`/`ENTRYPOINT` 用 exec 格式（第五节），监听 `0.0.0.0`

编译型再加第五条：**产物搬运工 `COPY --from`**——工具链再大也不进最终镜像。

### 8.5 打包之后：需要 Jenkins / DevOps 吗？

直接回答：**不是「必须」，是「升级」**。它们回答的是不同问题：

| 层 | 回答的问题 | 本系列落点 |
|------|------|------|
| Dockerfile（本篇） | 镜像**怎么做**出来 | `docker build` |
| Registry | 镜像**放哪**、怎么共享 | [第 10 篇安装](/云原生/docker/docker-10-harbor) · [使用](/云原生/docker/docker-10-harbor-usage) |
| 部署 | **在哪跑**、怎么起一整套 | [第 13 篇](/云原生/docker/docker-13-compose) compose |
| CI/CD 流水线 | **何时做**（谁触发）、做完**送哪**、**谁来验** | Jenkins / GitLab CI / GitHub Actions |

单人项目、本地开发：手敲 `build`/`run` 完全够。什么时候需要流水线？**团队协作**（每人本地环境必须一致）、**频繁发布**（一天多次，手敲必错）、**要自动验证**（构建后自动跑测试再推送）。典型流水线一图流：`git push` → CI 机器自动 `docker build` → 自动测试 → `docker push` 到 Harbor → 部署机 `pull` + `compose up`。一条最小的 Jenkins 流水线长这样（示意——流水线搭建超出本篇范围，属第 10/13 篇之后的工程化话题，本篇未实测）：

```groovy
pipeline {
  agent any
  stages {
    stage('构建') { steps { sh 'docker build -t harbor.daemon.io/demo/springboot-app:1.0 .' } }
    stage('推送') { steps { sh 'docker push harbor.daemon.io/demo/springboot-app:1.0' } }
  }
}
```

GitHub Actions 同理，一个 `.github/workflows/build.yml` 就是一条流水线：

```yaml
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t demo/app:${{ github.sha }} .
```

三家一句话定位：**Jenkins**＝自建老牌（公司内网常见、插件生态最大）；**GitLab CI**＝代码托管在 GitLab 就顺手；**GitHub Actions**＝代码在 GitHub、配置即代码。比喻收尾：**Dockerfile 是配方，流水线是厨房里的自动炒菜机**——先把配方写对（本篇），再谈自动化（工程化实践）。

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
| 多阶段取产物 | `COPY --from=build <路径> .`（第八节） |

---

## 小结

- Dockerfile 把「怎么做出镜像」写成可重复配方；`build` 的上下文决定你能 `COPY` 什么。
- 先跑通最小 `CMD`，再做一个**完整静态站案例**：`FROM nginx:alpine` → `COPY` 首页 → `-p` 映射 → `curl` 验收。
- `EXPOSE` 不替你开宿主机端口；`COPY` 优先于 `ADD`；`CMD`/`ENTRYPOINT` 分工用本机小实验记牢。
- 发布走 tag + Registry；瘦身与缓存优化留给第 23 篇。
- 三个真实栈同套路（第八节实测）：**选底座 → 锁依赖清单 → 先清单后代码 → 声明启动命令**；解释型（Python）单阶段，编译型（Java/.NET）两阶段——`COPY --from` 只搬产物，工具链不进最终镜像（989MB SDK → 158MB 镜像）。
- Jenkins/DevOps 与 Dockerfile 是上下游不是替代：配方（本篇）→ 仓库（第 10 篇）→ 部署（第 13 篇）→ 自动化流水线（工程化实践）。

---

## 思考题

> 若把 `COPY index.html …` 写成 `ADD index.html …`，构建结果通常一样吗？什么情况下你才会故意用 `ADD`？

下一篇见 🐳
