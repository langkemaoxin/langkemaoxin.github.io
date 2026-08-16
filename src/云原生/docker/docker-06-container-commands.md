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
> 下一篇：[《进入 Docker 容器的四种方式》](/云原生/docker/docker-07-enter-container)

---

## 开头：镜像有了，接下来怎么「用」起来？

第 5 篇分清了：镜像是模板，容器是实例。日常真正高频的问题是另一类：

- 怎么把镜像**跑起来**，还要能记住名字、映射端口？
- 跑起来以后怎么**看状态、看日志、看进程**？
- 怎么**停、再启、删干净**，又不误删镜像？

本篇只盯这条**容器生命周期日常线**：`run → ps → logs/top → stop/start → rm`。进容器的多种姿势留给第 7 篇；镜像离线搬运留给第 8 篇；私有仓库与 `daemon.json` 细节留给 Harbor 篇。

> **实验环境**：Docker Client / Server **29.1.2**（Docker Desktop，Windows）。文中输出均来自本机对 `nginx:alpine` 的实操。官方参考：[container run](https://docs.docker.com/reference/cli/docker/container/run/)、[container ls](https://docs.docker.com/reference/cli/docker/container/ls/)、[container logs](https://docs.docker.com/reference/cli/docker/container/logs/)、[container stop](https://docs.docker.com/reference/cli/docker/container/stop/)。

---

## 一、背景：命令对应生命周期哪一步？

把第 5 篇的状态机换成「你每天敲的命令」：

| 你想做的事 | 常用命令 | 发生了什么 |
|------------|----------|------------|
| 从镜像创建并启动 | `docker run` | create + start（可一步完成） |
| 看谁在跑 / 谁退出了 | `docker ps` / `ps -a` | 列容器，不是列镜像 |
| 看应用吐了什么 | `docker logs` | 读容器主进程的 stdout/stderr |
| 看里面有哪些进程 | `docker top` | 宿主机视角看该容器里的进程 |
| 优雅停 / 再开 / 重启 | `stop` / `start` / `restart` | 停发信号；删容器不等于删镜像 |
| 删掉这个实例 | `docker rm` | 去掉容器；镜像通常还在 |

记住一句话：**`rm` 容器 ≠ `rmi` 镜像**。删实例不影响模板，除非你再执行 `docker image rm`。

---

## 二、主线演练：从 run 到清理

下面用官方文档里也常用的 `nginx:alpine` 走一遍。本地没有镜像时，`run` 会先 pull。

### 2.1 创建并后台运行

```bash
docker run -d --name demo-nginx -p 8080:80 nginx:alpine
```

本机输出（容器 ID，可只写前几位操作）：

```text
d2220cc6b7fe94f571878e0dfed3faf0f383db8a518b317db787247f53625036
```

这几个参数分别解决什么问题：

| 参数 | 解决什么问题 |
|------|----------------|
| `-d` / `--detach` | 后台跑，CLI 立刻返回 ID；适合 Nginx 这类常驻服务 |
| `--name demo-nginx` | 不用死记长 ID；脚本与排障都好写 |
| `-p 8080:80` | 把容器 80 映射到宿主机 8080，浏览器/curl 才能从外面访问 |

对照：交互排障常用 `-it`（挂 STDIN + 分配 TTY），例如临时进一个 shell 镜像。**服务进程用 `-d`，临时终端用 `-it`**，别混着用错场景。

首次 pull 本机得到：

```text
Status: Downloaded newer image for nginx:alpine
docker.io/library/nginx:alpine
```

镜像摘要（本机）：`sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752`。

### 2.2 确认在跑：`ps`

```bash
docker ps --filter name=demo-nginx
```

```text
CONTAINER ID   IMAGE          STATUS                  PORTS                                     NAMES
d2220cc6b7fe   nginx:alpine   Up Less than a second   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp   demo-nginx
```

- 只看运行中：`docker ps`（别名 `docker container ls`）
- 含已退出：`docker ps -a`
- 脚本只要名字：`docker ps --format "{{.Names}}"` → 本机得到 `demo-nginx`

### 2.3 看日志：`logs`

容器里未必方便装编辑器；应用往标准输出打的日志，宿主机用：

```bash
docker logs demo-nginx
# 持续跟踪：docker logs -f demo-nginx
```

本机可见 entrypoint 配置完成后 Nginx 启动（节选）：

```text
/docker-entrypoint.sh: Configuration complete; ready for start up
2026/08/16 08:07:34 [notice] 1#1: nginx/1.31.3
```

宿主机访问映射端口（本机 `http://127.0.0.1:8080/`）返回 **HTTP 200**——说明「进程在跑 + 端口映射生效」。

### 2.4 看进程：`top`

容器内不一定有 `top`/`ps` 命令；在宿主机执行：

```bash
docker top demo-nginx
```

本机可见 master + 多个 worker（节选）：

```text
UID     PID   PPID  CMD
root    794   771   nginx: master process nginx -g daemon off;
statd   839   794   nginx: worker process
...
```

这是「该容器命名空间里有哪些进程」，细节与进 namespace 的关系见第 7 篇。

### 2.5 看元数据：`inspect`（字段释义见第 5 篇）

```bash
docker inspect demo-nginx --format "Name={{.Name}} State={{.State.Status}} Image={{.Config.Image}}"
```

本机：

```text
Name=/demo-nginx State=running Image=nginx:alpine
```

完整 JSON 里 `State` / `Config` / `HostConfig` / `NetworkSettings` / `Mounts` 各表示什么，以及常用 `--format` 配方，见第 5 篇「读懂 `docker inspect`」。日常排障多数情况 `ps` + `logs` 就够；端口、环境变量、挂载对不上时再 `inspect`。

### 2.6 停止、再启动、重启

官方说明：`docker stop` 先向容器主进程发 **SIGTERM**，超过宽限期再 **SIGKILL**（可用 `-t` 调超时，也可用 Dockerfile 的 `STOPSIGNAL` / `run --stop-signal` 改首信号）。

```bash
docker stop demo-nginx
docker ps -a --filter name=demo-nginx
```

```text
CONTAINER ID   STATUS                     NAMES
d2220cc6b7fe   Exited (0) ...             demo-nginx
```

容器还在，只是退出了——所以还能：

```bash
docker start demo-nginx    # 再起来
docker restart demo-nginx  # 停再起
```

本机 `start` 后再次 `Up`；`restart` 返回容器名 `demo-nginx`。

### 2.7 进容器执行一条命令（预告）

日常最快的是在**已运行**容器里起一个新进程：

```bash
docker exec demo-nginx nginx -v
```

本机：

```text
nginx version: nginx/1.31.3
```

交互式 shell 用 `docker exec -it demo-nginx sh`（alpine 往往是 `sh` 不是 `bash`）。attach / SSH / nsenter 的取舍见**第 7 篇**，本篇不展开。

### 2.8 删除容器（以及可选删镜像）

```bash
docker stop demo-nginx
docker rm demo-nginx
# 运行中强制删：docker rm -f demo-nginx
```

删完后 `demo-nginx` 从 `ps -a` 消失；镜像仍在：

```text
REPOSITORY   TAG       IMAGE ID       SIZE
nginx        alpine    4a73073bd557   93.6MB
```

若确定本地不再需要该模板：

```bash
docker image rm nginx:alpine
```

有容器还引用该镜像时，需先删容器（或加强制策略，慎用）。

---

## 三、`--rm`：退出即删，适合一次性任务

官方：`--rm` 会在容器退出时自动删除容器及其匿名 volume。

```bash
docker run --rm --name demo-rm nginx:alpine nginx -v
docker ps -a --filter name=demo-rm
```

本机打印版本后，`ps -a` 已找不到 `demo-rm`——适合跑完就扔的命令；**长驻服务不要加 `--rm`**，否则一退出实例就没了，日志也不好事后翻。

---

## 四、清理与批量删除（慎用）

| 场景 | 做法 |
|------|------|
| 删一个 | `docker rm <名或ID>` |
| 删多个已退出 | `docker container prune`（交互确认） |
| 危险：删光所有容器 | `docker rm $(docker ps -aq)` —— 测试机才考虑，生产勿随手敲 |

批量命令不区分有用没用，**先 `docker ps -a` 看清楚再动手**。

---

## 五、命令速查（读完主线再当索引）

| 目的 | 命令 |
|------|------|
| 创建并运行 | `docker run [OPTIONS] IMAGE [COMMAND]` |
| 后台 / 命名 / 端口 | `-d`、`--name`、`-p 宿主机:容器` |
| 退出即删 | `--rm` |
| 运行中 / 含退出 | `docker ps` / `docker ps -a` |
| 日志 | `docker logs [-f] CONTAINER` |
| 进程 | `docker top CONTAINER` |
| 停 / 启 / 重启 | `stop` / `start` / `restart` |
| 删容器 / 删镜像 | `docker rm` / `docker image rm` |
| 容器内执行 | `docker exec [-it] CONTAINER CMD` |

引擎是否在跑：Linux 常用 `systemctl status docker`；Docker Desktop 看托盘/仪表板。镜像源、加速器、`insecure-registries` 写在 daemon 配置里（Linux 多为 `/etc/docker/daemon.json`），改完需重启引擎——完整私有仓与证书见后续 Harbor 篇。

---

## 小结

- 本篇解决的问题：镜像变成**可管理的容器实例**——跑、看、停、清。
- 骨干：`run -d --name -p` → `ps` → `logs`/`top` → `stop`/`start` → `rm`；镜像另用 `image rm`。
- `-it` 给交互，`-d` 给服务；一次性任务才用 `--rm`。
- 进容器深挖 → 第 7 篇；镜像怎么离线搬走 → 第 8 篇。

下一篇见 🐳
