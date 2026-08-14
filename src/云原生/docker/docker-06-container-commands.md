---
title: 容器日常命令——run、ps、stop、exec 与常用运维
sidebarGroup: Docker 系列
shortTitle: 06 容器日常命令
order: 6
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 容器日常命令——run、ps、stop、exec 与常用运维
---

> **Docker 系列 · 第 6/18 篇**  
> 上一篇：[《容器与镜像——类与实例、读写层与生命周期》](/云原生/docker/docker-05-container-and-image)  
> 下一篇预告：进入容器专题——attach、exec、nsenter 等方式（系列第 7 篇）

---

## 开头：容器起来了，名字忘了怎么办？

测试机上一堆容器，`docker ps` 里只有 CONTAINER ID 前几位，脚本里要写 `docker stop` 却记不住名字。更常见的是：镜像 pull 下来了，端口映射怎么写、怎么看进程、怎么批量清理退出容器——这些**日常命令**比背架构图更常用。

本篇整理 **Docker 本地容器与镜像** 的高频 CLI，均基于 Engine 客户端调用 dockerd；示例环境为 Linux 宿主机。

---

## 一、命令速查表

| 目的 | 命令 |
|------|------|
| 创建并运行容器 | `docker run [OPTIONS] IMAGE [COMMAND]` |
| 查看运行中容器 | `docker ps` |
| 查看全部容器 | `docker ps -a` 或 `docker container ls -a` |
| 停止容器 | `docker stop CONTAINER` |
| 删除容器 | `docker rm CONTAINER` |
| 删除镜像 | `docker image rm IMAGE` |
| 列出所有容器 ID | `docker container ls -aq` |
| 批量删除容器 | `docker rm $(docker container ls -aq)` |
| 查看容器内进程 | `docker top CONTAINER` |
| 查看镜像 | `docker image ls` |
| 查看 daemon | `systemctl status docker` |
| 查看 Registry 配置 | `cat /etc/docker/daemon.json` |

---

## 二、创建容器：`docker run`

最基础：

```bash
docker run centos
```

交互式终端（`-i` 保持 STDIN，`-t` 分配伪终端）：

```bash
docker run -it centos
```

**后台运行 + 端口映射** 示例（拉取远程镜像并映射端口）：

```bash
docker run -itd -p 6080:80 -p 6022:22 docker.io/lemonbar/centos6-ssh:latest
```

参数说明：

| 参数 | 含义 |
|------|------|
| `-d` | detached，后台运行 |
| `-i` | 交互 |
| `-t` | TTY |
| `-p 宿主机端口:容器端口` | 发布端口 |

首次运行若本地无镜像，会先 **Pull**，再创建容器。成功时 CLI 输出 **容器 ID**（64 位十六进制，可只写前几位操作）。

---

## 三、查看容器

**仅运行中：**

```bash
docker ps
```

**含已停止：**

```bash
docker ps -a
# 等价
docker container ls -a
```

**只取容器名称**（脚本友好）：

```bash
docker ps --format "{{.Names}}"
```

---

## 四、停止与删除

```bash
# 优雅停止（发 SIGTERM，超时后 SIGKILL）
docker stop <容器ID或名称>

# 删除已停止的容器
docker rm <容器ID或名称>

# 强制删除运行中容器
docker rm -f <容器ID或名称>
```

删除镜像（需无容器引用或先删容器）：

```bash
docker image rm <镜像ID或名称>
```

**批量清理**所有容器（慎用，生产勿随意执行）：

```bash
docker rm $(docker container ls -aq)
```

---

## 五、查看容器内进程：`docker top`

容器内未必有 `/bin/bash` 或 `top` 命令，宿主机上可用：

```bash
docker top [OPTIONS] CONTAINER [ps OPTIONS]
```

示例（假设有名为 `zookeeper`、`mysql` 的容器）：

```bash
docker top zookeeper
docker top mysql
```

等价于在宿主机视角查看该容器 cgroup/namespace 下的进程，支持透传 `ps` 参数。

---

## 六、最常用的一组「三板斧」

日常排障常循环这三类命令：

```bash
# 1. 引擎是否在跑
systemctl status docker

# 2. 本地有哪些镜像
docker image ls

# 3. 哪些容器在跑
docker ps
```

---

## 七、Docker Registry 配置查看

镜像拉取加速、私有 Registry、insecure registry 等写在 **`/etc/docker/daemon.json`**。查看当前配置：

```bash
cat /etc/docker/daemon.json
```

**私有仓库 + 镜像加速** 示例（内网 Harbor 或 registry 场景；IP 按实际替换）：

```bash
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "http://10.24.2.30:5000",
    "https://tnxkcso1.mirrors.aliyuncs.com"
  ],
  "insecure-registries": ["10.24.2.30:5000"]
}
EOF

systemctl daemon-reload
systemctl restart docker
```

修改后需 **`daemon-reload` + 重启 docker** 生效。Harbor 完整部署与证书属于系列后续篇章；本篇仅涉及 **daemon 侧配置格式**。

---

## 八、进入容器的四种方式（概览）

需要登录容器排查时，常见做法有四种（系列第 7 篇会展开）：

| 方式 | 命令/思路 | 特点 |
|------|-----------|------|
| **docker attach** | 附加到主进程 STDIO | 适合前台进程；误 Ctrl+C 可能停容器 |
| **SSH** | 容器内跑 sshd，ssh 登录 | 需镜像自带 sshd，安全面需评估 |
| **nsenter** | 进入容器 namespace | 底层调试，需安装 nsenter 工具 |
| **docker exec** | 在运行中容器启动新进程 | **最常用**，如 `docker exec -it name bash` |

日常开发运维优先 **`docker exec -it <容器> /bin/bash`**（或 `/bin/sh`）。

---

## 九、实战小流程：从 run 到清理

```bash
# 启动 Nginx 并命名
docker run -d --name demo-nginx -p 8080:80 nginx:latest

# 确认
docker ps
docker top demo-nginx

# 进入容器
docker exec -it demo-nginx bash

# 停止并删除
docker stop demo-nginx
docker rm demo-nginx

# 若不再需要镜像
docker image rm nginx:latest
```

---

## 小结

- **`docker run`**：创建 + 启动，`-d`/`-it`/`-p` 最常用。  
- **`docker ps` / `ps -a`**：看运行态与历史容器；`--format` 取名称。  
- **`stop` → `rm`** 删容器；**`image rm`** 删镜像；批量用 `ls -aq`。  
- **`docker top`** 在宿主机看容器进程；**`systemctl status docker`** 看引擎。  
- **`daemon.json`** 管镜像加速与私有 Registry；改后重启 docker。  
- 进容器优先 **`docker exec`**；attach/SSH/nsenter 按需选用。  

下一篇将专题讲解 **进入容器的四种方式** 及进程视角下的 namespace 隔离。
