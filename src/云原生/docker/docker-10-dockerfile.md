---
title: Dockerfile 自制镜像——从语法到发布
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
description: Dockerfile 自制镜像——从语法到发布
---

> **Docker 系列 · 第 10/18 篇**  
> 上一篇：[《Harbor 私有镜像仓库》](/云原生/docker/docker-09-harbor)  
> 下一篇：[《进程视角看容器》](/云原生/docker/docker-11-process-view)

---

## 开头：拉别人的镜像总有冗余，能不能自己做一个？

官方 `ubuntu` 镜像几百 MB，你的 Go 程序编译后只有一个 10 MB 的二进制文件——塞进完整 OS 镜像里太浪费。

Docker 镜像的本质是 **root filesystem + metadata 的分层集合**。你可以：

1. 用 **Dockerfile** 声明式构建（推荐）
2. 用 **`docker commit`** 把容器改动提交为新镜像

本文按 PDF 原文梳理 Dockerfile 语法、最佳实践，以及镜像发布流程。

---

## 一、什么是 Docker Image？

- 文件与 metadata 的集合（root filesystem）
- **分层（layered）**：每一层可增删改文件，形成新 image
- 不同 image 可**共享相同 layer**
- Image 本身 **只读**；容器是在其上增加可写层

### 获取镜像的两种方式

| 方式 | 命令/方法 |
|------|-----------|
| Build | `docker build` + Dockerfile |
| Pull | `docker pull` 从 Registry（默认 Docker Hub） |

```bash
docker pull ubuntu:14.04
docker image ls
```

---

## 二、制作最小 Base Image（FROM scratch）

`scratch` 是空镜像，适合打包**静态编译**的单文件程序。

### 2.1 编写 C 语言 hello 程序

```c
// hello.c
#include <stdio.h>
int main() {
    printf("Hello Docker\n");
    return 0;
}
```

```bash
gcc -static -o hello hello.c
```

### 2.2 Dockerfile

```dockerfile
FROM scratch
ADD hello /
CMD ["/hello"]
```

### 2.3 构建与运行

```bash
docker build -t yunduan/hello-world .
docker image ls
docker history yunduan/hello-world
docker run yunduan/hello-world
```

`docker history` 可查看每层构建指令及大小。

---

## 三、两种构建镜像的方式

### 3.1 docker commit

在运行中的容器里做了修改后，提交为新镜像：

```bash
docker commit <容器ID> my-centos:v2
```

会在原镜像上**新增一层**，记录容器内的变更。适合临时调试，**不推荐**作为正式交付方式（不可复现、无 Dockerfile 文档）。

### 3.2 docker build（推荐）

```bash
docker image build -t myapp:1.0 .
```

从 Dockerfile 逐条指令构建，可版本管理、CI 集成。

---

## 四、Dockerfile 指令详解

### 4.1 FROM

指定基础镜像。

```dockerfile
FROM scratch          # 空镜像，制作 base image
FROM centos           # 使用官方 centos
FROM ubuntu:14.04     # 指定 tag
```

**原则**：尽量使用官方 image 作为 base。

### 4.2 LABEL

镜像元数据，相当于注释。

```dockerfile
LABEL maintainer="yunduan@gmail.com"
LABEL version="1.0"
LABEL description="This is description"
```

**原则**：Metadata 不可少，便于运维和合规。

### 4.3 RUN

执行命令并**创建新 Image Layer**。

```dockerfile
RUN yum update && yum install -y vim \
    python-dev

RUN apt-get update && apt-get install -y perl \
    pwgen --no-install-recommends && rm -rf \
    /var/lib/apt/lists/*

RUN /bin/bash -c 'source $HOME/.bashrc; echo $HOME'
```

**原则**：

- 复杂 RUN 用 `\` 换行
- 合并多条命令为一行，减少无用分层
- 安装包后清理 cache（`rm -rf /var/lib/apt/lists/*`）

### 4.4 WORKDIR

设定工作目录，类似 `cd`。

```dockerfile
WORKDIR /root
WORKDIR /test    # 不存在则自动创建
WORKDIR demo
RUN pwd            # 输出 /test/demo
```

**原则**：用 WORKDIR，不要用 `RUN cd`；尽量用绝对路径。

### 4.5 ADD 与 COPY

把本地文件添加到镜像。

```dockerfile
ADD hello /
ADD test.tar.gz /          # 自动解压 tar.gz
COPY hello test/           # 仅复制，不解压
```

**原则**：

- 大部分情况 **COPY 优先于 ADD**
- ADD 额外支持自动解压
- 远程文件用 `curl`/`wget` + COPY，不要用 ADD URL

### 4.6 ENV

设置环境变量，便于引用和维护。

```dockerfile
ENV MYSQL_VERSION 5.6
RUN apt-get install -y mysql-server="${MYSQL_VERSION}" \
    && rm -rf /var/lib/apt/lists/*
```

**原则**：用 ENV 增加可维护性，避免硬编码。

### 4.7 VOLUME 与 EXPOSE

```dockerfile
VOLUME /data
EXPOSE 8080
```

- `VOLUME`：声明挂载点
- `EXPOSE`：声明容器监听端口（文档性质，实际映射靠 `-p`）

### 4.8 CMD 与 ENTRYPOINT

| 指令 | 作用 | 特点 |
|------|------|------|
| **CMD** | 容器启动默认命令 | `docker run` 指定其他命令时 CMD 被覆盖；多个 CMD 只执行最后一个 |
| **ENTRYPOINT** | 容器启动必执行命令 | 不会被 `docker run` 参数覆盖；适合把容器当「服务」运行 |

**最佳实践**：写 shell 脚本作为 entrypoint，CMD 传默认参数。

#### Shell 格式

```dockerfile
RUN apt-get install -y vim
CMD echo "hello docker"
ENTRYPOINT echo "hello docker"
```

Shell 格式会包一层 `/bin/sh -c`。

#### Exec 格式（推荐）

```dockerfile
RUN ["apt-get", "install", "-y", "vim"]
CMD ["/bin/echo", "hello docker"]
ENTRYPOINT ["/bin/echo", "hello docker"]
```

#### Shell vs Exec 的关键差异

**Dockerfile A**（Shell 格式 ENTRYPOINT）：

```dockerfile
FROM centos
ENV name Docker
ENTRYPOINT echo "hello $name"
```

`docker run` 时，`$name` 会被 shell 展开 → 输出 `hello Docker`。

**Dockerfile B**（Exec 格式 ENTRYPOINT）：

```dockerfile
FROM centos
ENV name Docker
ENTRYPOINT ["/bin/bash", "-c", "echo hello $name"]
```

Exec 格式不经过 shell，`$name` 需显式用 bash -c 才能展开。

---

## 五、完整 Dockerfile 示例

```dockerfile
FROM centos:7
LABEL maintainer="ops@example.com"
LABEL version="1.0"

ENV APP_HOME /opt/app
WORKDIR ${APP_HOME}

RUN yum install -y vim \
    && yum clean all

COPY app.jar ${APP_HOME}/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
CMD ["--spring.profiles.active=prod"]
```

构建：

```bash
docker build -t myapp:1.0 .
docker run -d -p 8080:8080 myapp:1.0
```

---

## 六、镜像发布

构建完成后推送到 Registry（如 Harbor）：

```bash
# 登录私有仓库
docker login harbor.daemon.io

# 打 tag
docker tag myapp:1.0 harbor.daemon.io/demo/myapp:1.0

# 推送
docker push harbor.daemon.io/demo/myapp:1.0
```

---

## 七、指令速查表

| 指令 | 作用 | 是否新建层 |
|------|------|------------|
| FROM | 基础镜像 | 是（首层） |
| RUN | 执行命令 | 是 |
| COPY/ADD | 复制文件 | 是 |
| ENV | 环境变量 | 否（metadata） |
| WORKDIR | 工作目录 | 否 |
| EXPOSE | 声明端口 | 否 |
| VOLUME | 声明卷 | 否 |
| CMD | 默认启动命令 | 否 |
| ENTRYPOINT | 固定入口 | 否 |

---

## 下篇预告

**第 11 篇：《进程视角看容器》**

- 容器 PID 在宿主机上是几号？
- `/proc/<pid>` 与 cgroup 目录 walkthrough

---

## 思考题

> 为什么 Dockerfile 里要尽量合并 RUN 指令，而不是每条命令写一个 RUN？

提示：每条 RUN 产生一层，层越多镜像越大，构建缓存粒度也越碎。

下一篇见 🐳
