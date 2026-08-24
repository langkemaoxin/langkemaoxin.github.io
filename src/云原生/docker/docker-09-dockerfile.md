---
title: Dockerfile——从一句 echo 滚到三个能 curl 的自制镜像
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
description: 从两行 alpine + echo 开始，每次只加一种能力：COPY 静态页、分层、ENTRYPOINT、先清单后代码、多阶段构建，像滚雪球一样学会自制镜像。
---

> **Docker 系列 · 第 9/33 篇**
> 上一篇：[《Docker 本地镜像载入与载出——离线环境的镜像搬运术》](/云原生/docker/docker-08-image-transfer) · 下一篇：[《构建进阶——同一个镜像从 1.44GB 滚到 20MB》](/云原生/docker/docker-10-build-advanced)

---

## 开头：拉别人的镜像总不对劲，能不能自己做一个？

官方镜像太大，业务其实只要一个静态页或一个二进制；在容器里手改配置再 `docker commit`，同事复现不了，CI 也接不上。

根因就一句：`commit` 是过程式的「把这台容器现在的样子拍下来」（[第 5 篇](/云原生/docker/docker-05-container-and-image)）；**Dockerfile + `docker build`** 换成声明式——一份文本配方，同一套步骤，可审查、可进 Git。

本篇不先背指令表。先在空目录里做出能 `run` 的最小镜像，再让**同一个「自制镜像」一路长大**：

| 雪球 | 你加上去的 | 当场能看见的效果 |
|------|------------|------------------|
| **1** | `FROM alpine` + `CMD echo` | `docker run` 打出 `hello-from-dockerfile` |
| **2** | 换成 nginx + `COPY` 首页 | `curl :8088` 出你的 `<h1>` |
| **3** | `docker history` | 看见 `COPY` 那一层只有 24.6kB |
| **4** | `ENTRYPOINT` + `CMD` | `run` 后面跟的只换参数，前缀还在 |
| **5** | Python：先拷 `requirements.txt` | `curl :8000/hello`；改代码重建前几层秒过 |
| **6** | Java：第二段 `FROM` + `COPY --from` | `curl :8081/hello`；811MB Maven 不进最终镜像 |
| **7** | .NET：同一套路，产物是目录 | `curl :8083/hello`；989MB SDK → 158MB |
| **8** | tag / 推仓库 / 流水线边界 | 配方进 Git；自动化是升级不是必须 |

第一次读走 **1～4** 就有「会做镜像」的手感；5～7 是同一四步套路在真实语言里加厚。多阶段缓存深挖见[第 10 篇](/云原生/docker/docker-10-build-advanced)。

输出均来自本机：WSL2 Ubuntu-22.04 + Docker Engine **29.1.3**（传统构建器，`Step n/m` 格式）。官方：[Dockerfile reference](https://docs.docker.com/reference/dockerfile/)、[docker build](https://docs.docker.com/reference/cli/docker/build/)、[Best practices](https://docs.docker.com/build/building/best-practices/)。

---

## 雪球 1：两行配方，一条命令，打出 hello

空目录，只放一个 Dockerfile：

```dockerfile
FROM alpine:3.21
CMD ["echo", "hello-from-dockerfile"]
```

```bash
docker build -t lab-mini:1.0 .
docker run --rm lab-mini:1.0
```

```text
hello-from-dockerfile
```

`docker build -t <名字>:<标签> <上下文目录>`：最后那个 `.` 就是**构建上下文**——`COPY`/`ADD` 只能从这里取文件，不能 `COPY ../../秘密`。这一球还没 COPY，先记住「`.` 不是随手写的」。

做到这里：你会用 Dockerfile 造镜像并跑起来。配方按指令从上往下执行，结果是只读镜像；`run` 起来才有容器可写层。

---

## 雪球 2：换成 Nginx，把首页拷进去

目标改成能用浏览器/`curl` 验收的页面。实验目录：

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

相对上一球，Dockerfile **只多了：换基础镜像、拷文件、声明端口**：

```dockerfile
FROM nginx:alpine
LABEL maintainer="docker-series@example.com"
LABEL version="1.0"
LABEL description="Static site lab for Dockerfile chapter"

COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80
```

| 指令 | 这一球新加上的作用 |
|------|------------------|
| `FROM nginx:alpine` | 基于官方轻量 Nginx；默认已有启动入口 |
| `LABEL` | 元数据，方便检索，几乎不增大体积 |
| `COPY` | 把上下文里的首页盖到 Nginx 默认站点目录 |
| `EXPOSE 80` | **声明**容器听 80；真正映射靠 `run -p`（文档性质，不是开端口） |

未再写 `CMD`：沿用基础镜像的 `ENTRYPOINT` + `CMD`（Nginx 前台跑）——「站在别人肩膀上定制」。谁说了算，雪球 4 补。

在 `lab-web/` 目录：

```bash
docker build -t lab-web:1.0 .
```

```text
[2/2] COPY index.html /usr/share/nginx/html/index.html
… naming to docker.io/library/lab-web:1.0
```

```text
REPOSITORY   TAG   IMAGE ID       SIZE
lab-web      1.0   fe5964eaf073   92.7MB
```

体积主要来自 `nginx:alpine`；你的 `COPY` 只有几十 KB。

```bash
docker run -d --name lab-web -p 8088:80 lab-web:1.0
curl -sS http://127.0.0.1:8088/
```

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

官方最佳实践：**多数情况用 `COPY`**。`ADD` 会自动解压本地 tar、还能拉远程 URL，读者看不懂「到底拷了什么」。远程文件更推荐在 `RUN` 里 `curl`/`wget` 并校验。本球只有一个 HTML → `COPY` 足够。思考题会再问一次 `ADD`。

`VOLUME` 用来声明数据目录挂载点。静态站不需要；真正挂载仍靠 `run -v`，见[第 14 篇雪球 6](/云原生/docker/docker-14-data-persistence)。

跑完可 `docker rm -f lab-web`。下一球还要用这张 `lab-web:1.0` 看层。

---

## 雪球 3：history——你的改动落在哪一层

**只多一条命令**，镜像还是上一球那张：

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

对照雪球 1 的 `lab-mini`：

```text
IMAGE          CREATED BY                            SIZE
7d41b5fb18ed   CMD ["echo" "hello-from-dockerfile"]  0B
…              ADD alpine-minirootfs-…               8.5MB
```

多数会改文件系统的指令产生**一层**；层可缓存、可复用。`EXPOSE` / `CMD` 往往是 0B——只改了元数据。原理见[第 22 篇](/云原生/docker/docker-22-unionfs)；怎么让「改一行代码重建飞快」，雪球 5 用 FastAPI 当场看见，深挖留给第 10 篇。

验收：build 成功 → 容器 Up → curl 出你的 HTML → history 里能看到 `COPY`。

---

## 雪球 4：CMD 与 ENTRYPOINT，谁说了算？

雪球 2 没写启动命令，是因为 nginx 镜像已经写好了。自己做业务镜像时，引擎最终要拉起**一条进程**：

```text
最终命令 ≈ 「程序」 + 「参数」
实际执行 = ENTRYPOINT 里的数组成员  +  （run 后面的参数；若没有，就用 CMD）
```

| | **ENTRYPOINT** | **CMD** |
|--|----------------|---------|
| 用来做什么 | 定死**主程序 / 入口** | **默认参数**；若没写 ENTRYPOINT，CMD 就是整条默认命令 |
| `docker run 镜像 后面跟的内容` | 多半变成传给入口的**参数** | **整段被替换** |

这一球换两份最小配方（和静态站互斥，单独 build），只为看清「后面跟的东西」到底换了哪一段。

**两者都写**（生产最常见：入口固定，默认参数可改）：

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

```text
fixed-prefix default-arg
fixed-prefix overridden-arg
```

| 你敲的命令 | 实际相当于 |
|------------|------------|
| `docker run … lab-ep:1.0` | `echo fixed-prefix default-arg`（用了 CMD） |
| `docker run … lab-ep:1.0 overridden-arg` | `echo fixed-prefix overridden-arg`（**只换了 CMD**，ENTRYPOINT 还在） |

**只有 CMD**（适合通用工具镜像、临时覆盖命令）：

```dockerfile
FROM alpine:3.21
CMD ["echo", "only-cmd-default"]
```

```bash
docker build -t lab-cmd:1.0 -f Dockerfile.cmd .
docker run --rm lab-cmd:1.0
docker run --rm lab-cmd:1.0 echo replaced-entirely
```

```text
only-cmd-default
replaced-entirely
```

第二次**没有**再打印 `only-cmd-default`——没有 ENTRYPOINT 托底，`run` 后面的内容替换了整条 CMD。雪球 1 的 `lab-mini` 就是这种。

**口诀**：想「主程序永远不变」→ `ENTRYPOINT`；想「默认可被换掉」→ `CMD`；两者一起 → 固定入口 + 可改参数（推荐）。

写法优先 **exec 格式**（JSON 数组）：直接 exec 进程，信号转发更干净。

```dockerfile
CMD ["echo", "hi"]
ENTRYPOINT ["nginx", "-g", "daemon off;"]

# 不推荐当默认习惯：实际是 /bin/sh -c "…"
CMD echo hi
```

shell 格式里环境变量容易「看起来能展开」；exec 需要展开时再显式写 `["sh", "-c", "…"]`。

回扣 `lab-web`：`nginx:alpine` **已经**带了入口脚本和前台 `CMD`。你只 `COPY` 首页即可。自己做 `java -jar` 时典型是：

```dockerfile
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
CMD ["--spring.profiles.active=prod"]
```

换环境：`docker run myapp --spring.profiles.active=test`，入口仍是 `java -jar`。

---

## 雪球 5：真实后端——Python FastAPI，先清单后代码

前面只拷过一个静态文件。真实项目：源文件 + 第三方依赖。三个栈各打包一遍，套路会自己浮出来。对照先行（大小均本机 `docker images`）：

| | Python · FastAPI | Java · Spring Boot | .NET · ASP.NET |
|------|------|------|------|
| 语言类型 | 解释型（不用编译） | 编译到 JVM 字节码 | 编译到 IL |
| 依赖清单 | `requirements.txt` | `pom.xml` | `MyApp.csproj` |
| 构建工具链镜像 | — | `maven:3.9-eclipse-temurin-21`（811MB） | `dotnet/sdk:8.0-alpine`（989MB） |
| 运行时镜像 | `python:3.12-slim`（179MB） | `eclipse-temurin:21-jre`（493MB） | `dotnet/aspnet:8.0-alpine`（158MB） |
| Dockerfile 阶段数 | 1 | 2（下一球） | 2（再下一球） |
| **最终镜像** | **fastapi-app:1.0 = 212MB** | **526MB** | **158MB** |
| 验证 | `curl :8000/hello` | `curl :8081/hello` | `curl :8083/hello` |

Python 不用编译，运行时装好依赖就能跑——一个 `FROM` 到底。目录 `/root/labs/fastapi-app`：

```bash
cat > main.py <<'EOF'
from fastapi import FastAPI

app = FastAPI()

@app.get("/hello")
def hello():
    return {"msg": "hello from fastapi"}
EOF

cat > requirements.txt <<'EOF'
fastapi
uvicorn
EOF
```

**FastAPI** 是 Python 的 web 框架；**requirements.txt** 交给 **pip** 去装；**uvicorn** 是跑这类应用的进程。

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

相对静态站，新加上的是 **`WORKDIR` / `RUN` / 先拷清单再拷代码`**：

| 指令 | 干什么 |
|------|--------|
| `FROM python:3.12-slim` | 官方 Python 的 slim 变体（精简 Debian，179MB）。解释型语言「运行时 = 生产运行时」 |
| `WORKDIR /app` | 以后的 `COPY`/`RUN` 都相对这里；少写 `RUN cd …` |
| `COPY requirements.txt .` | **先只拷依赖清单，不拷代码** |
| `RUN pip install --no-cache-dir -r …` | 按清单装依赖；`--no-cache-dir` 不留 pip 缓存 |
| `COPY main.py .` | 清单装完才拷代码 |
| `CMD [… "--host", "0.0.0.0" …]` | **必须听 0.0.0.0**：默认只听 127.0.0.1，`-p` 进来的流量到不了容器回环（[第 15 篇](/云原生/docker/docker-15-network)） |

```bash
docker build -t fastapi-app:1.0 .
```

```text
Step 1/7 : FROM python:3.12-slim
Step 2/7 : WORKDIR /app
Step 3/7 : COPY requirements.txt .
Step 4/7 : RUN pip install --no-cache-dir -r requirements.txt
Successfully installed … fastapi-0.141.1 … uvicorn-0.52.3    ← Step 4：依赖装进了这一层
Step 5/7 : COPY main.py .
Step 6/7 : EXPOSE 8000
Step 7/7 : CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
Successfully built 9a041350737c
Successfully tagged fastapi-app:1.0
```

```bash
docker run -d --name fastapi-demo -p 8000:8000 fastapi-app:1.0
sleep 2 && curl -s localhost:8000/hello
docker images fastapi-app --format '{{.Repository}}:{{.Tag}} {{.Size}}'
```

```text
{"msg":"hello from fastapi"}
fastapi-app:1.0 212MB
```

212MB = 179MB 底座 + 33MB 依赖；`main.py` 那层只有几百字节。**改代码重建时，前四层全部命中缓存、秒过，从第 5 步才开始重跑**——「先拷清单、再拷代码」就是为这一刻埋的。`RUN` 里把「安装 + 清理」串在同一条，减少无用层（这里 `--no-cache-dir` 已经在管 pip 缓存）。

---

## 雪球 6：Java Spring Boot——第二段 FROM，只搬走 jar

Java 的麻烦：源码要先用 **Maven**（下依赖、编译、打 jar）加工，工具链 811MB；**运行**一个 jar 只需要 JRE（493MB）。全塞进一个镜像＝又大又乱。

**只加一件事**：一份 Dockerfile 写两个 `FROM`。第一阶段用大工具链干活；第二阶段从精简运行时起步，`COPY --from` 只把**产物**搬过来。目录 `/root/labs/springboot-app`：

```bash
mkdir -p /root/labs/springboot-app/src/main/java/com/example/demo && cd /root/labs/springboot-app
```

`pom.xml`（`parent` 挂上 `spring-boot-starter-parent` 后，依赖不用写版本号、打包自动是可执行 fat jar）：

```xml
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
```

`src/main/java/com/example/demo/DemoApplication.java`（路径即包名）：

```java
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

| 关键行 | 相对 FastAPI 新加上的 |
|--------|----------------------|
| `FROM maven:… AS build` | 第一阶段起名 `build`；eclipse-temurin 是开源 JDK 发行版 |
| `COPY pom.xml .` + `dependency:go-offline` | 只拷清单不拷源码——雪球 5 同款套路第二回 |
| `RUN mvn -q package -DskipTests` | 打出 `target/demo-1.0.jar`（演示跳测试，**生产别跳**） |
| `FROM eclipse-temurin:21-jre` | **第二阶段从零开始** |
| `COPY --from=build … app.jar` | 从第一阶段**只**搬产物 |
| `ENTRYPOINT ["java", "-jar", "app.jar"]` | 雪球 4 的「入口固定」 |

```bash
docker build -t springboot-app:1.0 .
```

```text
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
```

`Step 7` 是两个阶段的分水岭。

```bash
docker run -d --name springboot-demo -p 8081:8080 springboot-app:1.0
sleep 8 && curl -s localhost:8081/hello
docker images springboot-app --format '{{.Repository}}:{{.Tag}} {{.Size}}'
```

```text
hello from spring boot
springboot-app:1.0 526MB
```

前 6 步活在 811MB 的构建镜像里，后 5 步从 493MB 的 JRE 起步；最终 526MB ≈ JRE + 一个 **fat jar**（全部依赖打进单个可执行 jar）。Maven 工具链没有进最终镜像。

---

## 雪球 7：.NET ASP.NET——同一套路，产物是一个目录

相对 Java，**只换一件事**：`publish` 出来的不是单个 jar，而是一堆 dll 的目录。项目骨架用 SDK 容器生成（宿主机不用装 .NET；`-v` 让产物落进宿主机）：

```bash
mkdir -p /root/labs/aspnet-app && cd /root/labs/aspnet-app
docker run --rm -v /root/labs/aspnet-app:/src -w /src \
    mcr.microsoft.com/dotnet/sdk:8.0-alpine dotnet new web -n MyApp -o .
```

```text
Restored /src/MyApp.csproj (in 90 ms).
Restore succeeded.
```

```text
MyApp.csproj  Program.cs  Properties  appsettings.Development.json  appsettings.json  obj
```

`dotnet new web`＝官方空 web 模板。给 `Program.cs` 加 `/hello`（`MapGet`＝注册一条 GET 路由）：

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello World!");
app.MapGet("/hello", () => "hello from aspnet");

app.Run();
```

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

| 关键行 | 和 Java 球的对应 |
|--------|------------------|
| `FROM …/sdk:8.0-alpine AS build` | 工具链 989MB。仓库是 **mcr.microsoft.com**（不在 Docker Hub）；国内直连较慢 |
| `COPY MyApp.csproj .` + `dotnet restore` | 清单进 NuGet——同款套路第三回 |
| `dotnet publish -c Release -o /app/publish` | 发布成**目录**（不是单文件） |
| `FROM …/aspnet:8.0-alpine` | 运行时仅 158MB |
| `COPY --from=build /app/publish .` | 只搬发布目录 |

```bash
docker build -t aspnet-app:1.0 .
```

```text
Step 1/11 : FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
…
Step 6/11 : RUN dotnet publish -c Release -o /app/publish
Step 7/11 : FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
…
Step 11/11 : ENTRYPOINT ["dotnet", "MyApp.dll"]
Successfully built 367524fdc2c7
Successfully tagged aspnet-app:1.0
```

```bash
docker run -d --name aspnet-demo -p 8083:8080 aspnet-app:1.0
sleep 3 && curl -s localhost:8083/hello
docker images aspnet-app --format '{{.Repository}}:{{.Tag}} {{.Size}}'
```

```text
hello from aspnet
aspnet-app:1.0 158MB
```

最终镜像与运行时底座**同尺寸**——模板级产物小到几乎不占；对比构建期 989MB SDK，这是多阶段收益最极端的一例。.NET 8 起 ASP.NET 默认听 **8080**（不再是 80）。`COPY . .` 会把骨架生成的 `obj/` 也带进构建阶段，真实项目应配 `.dockerignore` 排除 `bin/`、`obj/`（[第 10 篇](/云原生/docker/docker-10-build-advanced) 还实测过它能拦住 `.env`）。

三个栈走完，公因数四条：

1. **选底座**：解释型用 slim 运行时；编译型准备「工具链 + 运行时」两个底座
2. **锁依赖清单**：`requirements.txt` / `pom.xml` / `*.csproj`——清单进 Git，构建才可复现
3. **先清单后代码**：改代码时依赖层缓存命中
4. **声明启动命令**：`CMD`/`ENTRYPOINT` 用 exec 格式，监听 `0.0.0.0`

编译型再加第五条：**`COPY --from` 只搬产物**——工具链再大也不进最终镜像。

---

## 雪球 8：构建完放哪、要不要 Jenkins？

本地验证通过后，打上私有仓前缀再推（Harbor 见[第 12 篇](/云原生/docker/docker-12-harbor)，tag / push 见[使用篇](/云原生/docker/docker-13-harbor-usage)）：

```bash
docker tag lab-web:1.0 harbor.daemon.io/demo/lab-web:1.0
docker login harbor.daemon.io
docker push harbor.daemon.io/demo/lab-web:1.0
```

没有 Harbor 时，至少把 `lab-web:1.0` 与 Dockerfile 进 Git——**配方进仓库，比只传一个匿名 IMAGE ID 更重要**。

Jenkins / GitLab CI / GitHub Actions **不是必须，是升级**。它们回答的是不同问题：

| 层 | 回答的问题 | 本系列落点 |
|------|------|------|
| Dockerfile（本篇） | 镜像**怎么做**出来 | `docker build` |
| Registry | 镜像**放哪** | [第 12 篇](/云原生/docker/docker-12-harbor) |
| 部署 | **在哪跑**一整套 | [第 16 篇](/云原生/docker/docker-16-compose) |
| CI/CD | **何时做**、做完**送哪**、**谁来验** | Jenkins / GitLab CI / GitHub Actions |

单人本地：手敲 `build`/`run` 够。团队协作、一天多次发布、构建后要自动测——再上流水线。最小示意（本篇未实测）：

```groovy
pipeline {
  agent any
  stages {
    stage('构建') { steps { sh 'docker build -t harbor.daemon.io/demo/springboot-app:1.0 .' } }
    stage('推送') { steps { sh 'docker push harbor.daemon.io/demo/springboot-app:1.0' } }
  }
}
```

```yaml
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t demo/app:${{ github.sha }} .
```

**Jenkins**＝自建老牌；**GitLab CI**＝代码在 GitLab 就顺手；**GitHub Actions**＝代码在 GitHub。Dockerfile 是配方，流水线是自动炒菜机——先把配方写对。

---

## 命令怎么记、两个历史包袱

| 阶段 | 命令 / 指令 | 你在哪一球用过 |
|------|-------------|----------------|
| 最小能跑 | `FROM` + `CMD`，`docker build -t … .` | 1 |
| 拷进内容 | `COPY`、`EXPOSE`、`LABEL`，`run -p` | 2 |
| 看层 | `docker history` | 3 |
| 入口 | `ENTRYPOINT` + `CMD`（exec 格式） | 4 |
| 先清单后代码 | `WORKDIR`、`RUN pip/mvn/dotnet` | 5～7 |
| 多阶段 | 第二个 `FROM`、`COPY --from=build` | 6、7 |
| 发布 | `docker tag` / `push` | 8 |

| 做法 | 何时用 |
|------|--------|
| `docker commit` | 临时留存实验现场；不作为交付（第 5 篇） |
| **Dockerfile + build**（本篇） | 可复现的日常交付 |
| 多阶段 / BuildKit 缓存调优 | 镜像过大、构建太慢 → [第 10 篇](/云原生/docker/docker-10-build-advanced) |
| 分层与 UnionFS | [第 22 篇](/云原生/docker/docker-22-unionfs) |

**包袱一**：`EXPOSE` 不替你在宿主机开端口，真正开门的是 `run -p`（雪球 2）。  
**包袱二**：多数情况不要用 `ADD`；远程 URL 不要 `ADD https://…`。`VOLUME` 只声明挂载点，不会帮你建好命名卷（[第 14 篇](/云原生/docker/docker-14-data-persistence)）。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|------|----------------------|
| [第 5 篇](/云原生/docker/docker-05-container-and-image) | 开头：`commit` vs 配方 |
| [第 15 篇](/云原生/docker/docker-15-network) | 雪球 5：必须听 `0.0.0.0` |
| [第 14 篇](/云原生/docker/docker-14-data-persistence) | `VOLUME` 只声明；真正挂靠 `-v` |
| [第 16 篇](/云原生/docker/docker-16-compose) | 雪球 7：`build:` 现场构建 |
| [第 12 篇](/云原生/docker/docker-12-harbor) | 雪球 8：镜像放哪 |
| [第 17 / 23 篇](/云原生/docker/docker-22-unionfs) | 层的原理；缓存与瘦身 |

---

## 本篇实验清理（可照抄）

```bash
docker rm -f lab-web fastapi-demo springboot-demo aspnet-demo 2>/dev/null
```

---

## 小结

从两行 `echo` 开始，每次只加一种能力：

1. **`FROM` + `CMD` + `build`**：配方变成能跑的镜像；`.` 是上下文。
2. **`COPY` 首页 + `EXPOSE`**：`curl` 出你的 HTML；`EXPOSE` 不等于 `-p`。
3. **`history`**：你的改动是叠上去的一层，往往只有几十 KB。
4. **`ENTRYPOINT` + `CMD`**：`run` 后面跟的是参数还是整段替换，差在有没有入口托底。
5. **先清单后代码**：改 `main.py` 重建时依赖层秒过。
6. **多阶段**：第二个 `FROM` + `COPY --from`，工具链不进最终镜像。
7. **.NET 同套路**：产物是目录；989MB SDK → 158MB。
8. **发布与流水线**：配方进 Git；CI 是升级。

**思考题**：若把 `COPY index.html …` 写成 `ADD index.html …`，构建结果通常一样吗？什么情况下你才会故意用 `ADD`？（提示：雪球 2。）

下一篇：[《Harbor 安装》](/云原生/docker/docker-12-harbor)。

---

## 参考资料

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [docker build](https://docs.docker.com/reference/cli/docker/build/)
- [Best practices](https://docs.docker.com/build/building/best-practices/)
- 本机：WSL2 Ubuntu-22.04 + Docker Engine 29.1.3（传统构建器）
