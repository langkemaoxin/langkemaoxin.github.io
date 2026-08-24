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

> **Docker 系列 · 第 6/33 篇**
> 上一篇：[《容器与镜像——类与实例、读写层与生命周期》](/云原生/docker/docker-05-container-and-image) · 下一篇：[《进入 Docker 容器的四种方式——exec、attach、SSH 与 nsenter》](/云原生/docker/docker-07-enter-container)

---

## 开头：镜像有了，接下来怎么「用」起来？

第 5 篇分清了：镜像是模板，容器是实例。日常真正高频的问题是另一类：

- 怎么把镜像**跑起来**，还要能记住名字、映射端口？
- 跑起来以后怎么**看状态、看日志、看进程**？
- 怎么**停、再启、删干净**，又不误删镜像？

本篇只盯这条**容器生命周期日常线**：`run → ps → logs/top → stop/start → rm`，篇尾用一个综合案例把它们串起来，顺便尝鲜「自制镜像怎么发给别人」。进容器的多种姿势留给第 7 篇；镜像搬运的系统展开（save/export 对比、压缩、私仓）留给第 8 篇；私有仓库与 `daemon.json` 细节留给 Harbor 篇。

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

这是「该容器命名空间里有哪些进程」；容器内外 PID、shim 进程树见**第 24 篇**。进容器开 shell 的取舍见第 7 篇。

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
| 固化容器为镜像 | `docker commit CONTAINER 新名:TAG` |
| 导出镜像为文件 | `docker save -o 文件.tar 镜像:TAG` |
| 从文件导入镜像 | `docker load -i 文件.tar` |

引擎是否在跑：Linux 常用 `systemctl status docker`；Docker Desktop 看托盘/仪表板。镜像源、加速器、`insecure-registries` 写在 daemon 配置里（Linux 多为 `/etc/docker/daemon.json`），改完需重启引擎——完整私有仓与证书见后续 Harbor 篇。

---

## 六、综合案例：自己做了一个镜像，怎么发给别人？

场景很常见：你用本篇的命令起了一个 Nginx，还顺手把首页改成了团队定制版。同事看到后说「这个不错，发我一份」。问题来了——私有仓库还没搭（Harbor 篇），同事的机器也连不上你这台 Docker，**镜像怎么变成一个「能拷走的文件」？**

三步走：`commit` 固化成自制镜像 → `save` 导出成 tar → 对方 `load` 导入后 `run`。

> 本节实跑于 WSL Ubuntu-22.04 内的 Docker Client / Server **29.1.3**（linux/amd64），命令行为与上文 29.1.2 一致，仅 `docker images` 默认列有变化（见 6.2）。

### 6.1 起容器，改成自己的样子

```bash
docker run -d --name myweb -p 8081:80 nginx:alpine

# 用 exec 往容器里写一个自定义首页（写进的是该容器的可写层）
docker exec myweb sh -c "printf 'hello, this is MY image (myweb:v1)\n' > /usr/share/nginx/html/index.html"

# 容器内自测：内容确实变了
docker exec myweb sh -c "wget -qO- http://127.0.0.1/"
```

本机输出（先是 run 返回的容器 ID，再是首页内容）：

```text
4b49d35ae94ddde2b5b5a5adc362f2a5afc0c9fdb02566581db0f8996702241c
hello, this is MY image (myweb:v1)
```

### 6.2 固化成自制镜像：`docker commit`

改动目前只存在于**这个容器**的可写层里，`rm` 一删就没。`docker commit` 把「镜像只读层 + 当前可写层」定格成一枚新镜像（`commit` 的定位见第 5 篇 4.7：救急好用；正式生产线用 Dockerfile，第 9 篇）：

```bash
docker commit -m "custom homepage" myweb myweb:v1
docker images myweb
docker image inspect myweb:v1 --format "{{.Id}}"
```

本机输出：

```text
IMAGE      ID             DISK USAGE   CONTENT SIZE   EXTRA
myweb:v1   542727e8abea       92.8MB         26.1MB
sha256:542727e8abeabc17ae891fb17353a24fc56e7b2c66cf27983d780ec10db6984e
```

两处注解：

- 29.x 新版 `docker images` 默认列不再是上文的 REPOSITORY/TAG/SIZE，而是 IMAGE / DISK USAGE / CONTENT SIZE——先认 ID 就够了。
- 最后那串完整 ID 是这枚自制镜像的**指纹**，后面导出、导入时都要靠它「对账」。

### 6.3 导出成文件：`docker save`

```bash
docker save -o myweb-v1.tar myweb:v1
ls -lh myweb-v1.tar
file myweb-v1.tar
```

本机输出：

```text
-rw------- 1 root 25M Aug 18 17:01 myweb-v1.tar
myweb-v1.tar: POSIX tar archive
```

tar 里装的是引擎自己认的**完整格式：所有层 + tag + 元数据**（含 `nginx:alpine` 的基础层，所以对方机器不需要预先 pull 任何镜像）。体积对得上：tar 25 MB ≈ 上表的 CONTENT SIZE 26.1MB（全部分层内容的体积），而不是 DISK USAGE 92.8MB（那是因为与本机其他镜像共享基础层才显示的磁盘占用）。

把这个文件用 U 盘、`scp`、网盘或聊天工具发出去都行。想压得更小、多条镜像打一个包，第 8 篇展开。

### 6.4 同事那边：`docker load` 进来直接跑

模拟一台「没有这枚镜像」的机器——先删掉本地的，再从 tar 导入：

```bash
docker rmi myweb:v1
docker load -i myweb-v1.tar
docker image inspect myweb:v1 --format "{{.Id}}"
```

本机输出：

```text
Untagged: myweb:v1
Deleted: sha256:542727e8abea...
Loaded image: myweb:v1
sha256:542727e8abeabc17ae891fb17353a24fc56e7b2c66cf27983d780ec10db6984e
```

load 之后的 ID 与 6.2 固化时**一模一样**——搬过去的是同一枚镜像，不是「长得像的另一份文件」。同事拿到后直接按本篇第一节的套路跑：

```bash
docker run -d --name myweb-recv -p 8082:80 myweb:v1
curl http://127.0.0.1:8082/
```

本机输出——自定义首页原样到达：

```text
hello, this is MY image (myweb:v1)
```

### 6.5 清理现场

```bash
docker rm -f myweb myweb-recv   # 实测输出：myweb、myweb-recv 两行容器名
docker rmi myweb:v1             # Untagged + Deleted
rm myweb-v1.tar
```

本机清理后 `docker images myweb` 已查不到任何条目，实验环境还原。

这个案例把本篇主线完整串了一遍：`run` 起实例 → `exec` 进去改 → `stop`/`rm` 收尾，再加两步「交付」——`commit` 固化、`save`/`load` 离线交货。`save` 与 `export` 的区别、压缩与多镜像打包、以及更长期的解法「推私有仓库」，都在**第 8 篇**展开。

---

## 小结

- 本篇解决的问题：镜像变成**可管理的容器实例**——跑、看、停、清。
- 骨干：`run -d --name -p` → `ps` → `logs`/`top` → `stop`/`start` → `rm`；镜像另用 `image rm`。
- `-it` 给交互，`-d` 给服务；一次性任务才用 `--rm`。
- 综合案例：`run` → `exec` 改内容 → `commit` 固化成自制镜像 → `save` 打包、`load` 给别人——接收端镜像 ID 与导出端一致。
- 进容器深挖 → 第 7 篇；镜像怎么离线搬走 → 第 8 篇。

下一篇见 🐳
