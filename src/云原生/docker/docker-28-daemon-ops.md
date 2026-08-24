---
title: Daemon 运维——从重启容器全灭滚到升级不断业务
sidebarGroup: Docker 系列
shortTitle: 28 Daemon 运维
order: 28
date: 2026-08-28T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 从实测「重启 daemon 容器全体陪葬」开始，每球只往 daemon.json 加一行：live-restore、metrics-addr、data-root，最后滚到 docker context 远程管理，学会把 daemon 当生产服务来运维。
---

> **Docker 系列 · 第 28/33 篇**
> 上一篇：[《容器日志与监控——盯住同一个容器，从 logs 第一行滚到磁盘账单》](/云原生/docker/docker-27-logging-monitoring) · 下一篇：[《Swarm 多机编排——从一台 docker run 滚到一个小集群》](/云原生/docker/docker-29-swarm)

---

## 开头：改一行配置，业务要断多久？

机器跑得越久，越躲不开三件事：升级 Docker 版本、调日志上限、把数据搬去大盘。这些事最后都落到同一个动作上——**重启 dockerd**。问题是，[第 23 篇](/云原生/docker/docker-23-daemon-runtime/)讲过：真正扛着容器的是 containerd-shim，dockerd 只是「大脑」。那大脑重启，手脚（容器里的业务）必须跟着停吗？

默认答案：**必须**。本篇先把这笔账实测出来，再让 `daemon.json` 里的一行配置把它消掉。不先背概念——贯穿全文的产物就一份 `/etc/docker/daemon.json`，**一球只加一行，改完就重启、就验证**。实验对象也不是临时起的玩具容器，而是这台机上跑着的真实业务：RabbitMQ 三节点集群 + 一个应用栈（实验后已还原配置）。

| 雪球 | 你加上去的 | 当场能看见的效果 |
|------|------------|------------------|
| **1** | 打开 daemon.json 对账 | `docker info` 里每个字段都知道是谁配的 |
| **2** | 什么都不加，试一次重启 | `Up 4 hours` 变 `Up 17 seconds`——容器全体陪葬 |
| **3** | 加 `"live-restore": true` | 第一次重启**照样断**——旧 daemon 说了算 |
| **4** | 再重启一次 | `Up 40s → Up 50s` 连续累加，容器没停过 |
| **5** | 换业务视角再验 | 管理 API 全程 200，集群三节点完好 |
| **6** | 认清保护边界 | 一张表回答 containerd/宿主机重启它管不管 |
| **7** | 加 `"metrics-addr"` | `curl :9323/metrics` 冒出 `engine_daemon_*` 指标 |
| **8** | 加 `"data-root"` 搬家 | `Docker Root Dir` 指向新数据盘 |
| **9** | 加 `docker context` | `*` 跟着 context 走，一条命令切到另一台机的 daemon |
| **10** | 加升级策略 | 一张能贴墙的 daemon 运维 checklist |

本机环境：WSL2 Ubuntu-22.04 + Docker 29.1.3。官方入口：[daemon 配置参考](https://docs.docker.com/engine/daemon/configuration/)、[Live restore](https://docs.docker.com/engine/daemon/live-restore/)。

---

## 雪球 1：先对账——daemon.json 里已有的三行，都是谁配的

dockerd 每次启动都会读 `/etc/docker/daemon.json`，没有这个文件就全用默认值。这台机上它现在真实长这样：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```bash

这三行不是新面孔：`registry-mirrors` 是[第 4 篇](/云原生/docker/docker-04-install)配的镜像拉取加速；`log-driver` / `log-opts` 是[第 27 篇](/云原生/docker/docker-27-logging-monitoring/)配的日志轮转（单文件 10m、最多留 3 份）。它们背后是一个固定回路，也是后面每一球的固定动作：

```text
改 /etc/docker/daemon.json → systemctl restart docker → docker info 验证
```bash

改完必须重启才生效，因为这份配置只在 daemon 启动时读一次。先用 `docker info` 把现状拍张照：

```bash
$ docker info | grep -E "Server Version|Storage Driver|Docker Root Dir|Live Restore"
 Server Version: 29.1.3
 Storage Driver: overlayfs
 Docker Root Dir: /var/lib/docker
 Live Restore Enabled: false          ← 本篇要把它变 true
```bash

逐行认人：

- `Server Version: 29.1.3`——daemon 自己的版本，升级前后看它。
- `Storage Driver: overlayfs`——存储驱动，现代默认（就是原 overlay2 演进来的，历史包袱一节再聊）。
- `Docker Root Dir: /var/lib/docker`——镜像、容器、卷、构建缓存的老家，雪球 8 要搬的就是它。
- `Live Restore Enabled: false`——本篇主角，现在还关着。

这张控制台上还有哪些旋钮？把运维最常用的先列全（改完都要 `systemctl restart docker` 生效，`docker info` 可验证大部分结果；本篇会亲手拧到其中三个，其余先混个脸熟）：

| 配置项 | 作用 | 验证方式 | 在本篇 |
|------|------|------|------|
| `registry-mirrors` | 镜像拉取加速（配置步骤与验收见[第 4 篇](/云原生/docker/docker-04-install)） | `docker info` Registry Mirrors | 雪球 1 对账 |
| `log-driver` / `log-opts` | 全局日志驱动与轮转（[第 27 篇](/云原生/docker/docker-27-logging-monitoring/)） | `docker info` Logging Driver | 雪球 1 对账 |
| `live-restore` | daemon 重启/升级时容器不断（本篇主角） | `docker info` Live Restore | 雪球 3 |
| `metrics-addr` | 暴露 Prometheus 指标端点 | `curl :9323/metrics` | 雪球 7 |
| `data-root` | 数据目录迁移（默认 `/var/lib/docker`） | `docker info` Docker Root Dir | 雪球 8 |
| `storage-driver` | 存储驱动（现代默认 `overlayfs`，即原 overlay2 演进） | `docker info` Storage Driver | 不动它 |
| `insecure-registries` | HTTP 私有仓库白名单；HTTPS + 已信任 CA 的 Harbor 主路径通常不必靠它（细节见[第 12 篇](/云原生/docker/docker-12-harbor)） | `docker info` Insecure Registries | 不动它 |
| `debug` | daemon 调试日志 | daemon 日志变详细 | 排障时再开 |

控制台认完了。下一球先不加任何东西——先弄清「拧旋钮」这个动作本身要付出什么代价。

---

## 雪球 2：什么都不加，试一次重启——看默认的代价

上面那张表里不管改哪项，最后一步都是 `systemctl restart docker`。那就在不加任何新配置的前提下，拿真实业务试一次（rabbit1/2/3 是 RabbitMQ 三节点集群，new-api 是应用栈）：

```bash
$ systemctl restart docker

# 重启前                                    # 重启后
rabbit2   Up 4 hours                        rabbit2   Up 17 seconds
rabbit1   Up 4 hours                        rabbit1   Up 16 seconds
rabbit3   Up 4 hours                        rabbit3   Up 16 seconds
new-api   Up 4 hours (healthy)              new-api   Up 9 seconds (health: starting)
```bash

逐行读这份「案发现场」：

- `Up 4 hours → Up 17 seconds`：不是「又续了 17 秒」，是**容器被杀掉之后重新拉起了 17 秒**——`Up` 计时从进程重新启动那刻清零。
- `new-api (healthy) → (health: starting)`：健康检查也得从头再跑一遍，才算恢复「健康」身份。
- 三台 rabbit 全灭再全起：对一个三节点集群，这就是一次整体重启，谁也没躲过。

它们还能爬回来，是因为都配了 `restart: unless-stopped`（[第 14 篇](/云原生/docker/docker-14-data-persistence/)）。但 restart 策略只负责「拉回来」，不负责「不中断」：重启那一瞬间连接全断、内存态全丢、数据库要做崩溃恢复。对生产上的有状态服务，这就是每次升级窗口的真实价格。

把这个痛记牢——后面每一球，都在回答「怎么让这个窗口消失」。

---

## 雪球 3：加第一行新配置 live-restore——第一次重启居然还断

想让重启不断业务，`daemon.json` 里有现成的一行。加上（这是当时的完整文件，可整份照抄）：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true
}
```bash

存盘，重启 daemon——**实测当场翻车**：容器照样全体被杀了一次，跟雪球 2 一模一样。

不是配置写错了，而是：**决定杀不杀容器的，是执行关停动作的那个「旧 daemon」进程**。它内存里加载的还是旧配置（live-restore=false），关门这件事它说了算；这次重启唯一的功劳，是把新配置装进了 daemon。**从下一次重启开始**，跑着的才是带着 live-restore=true 的 daemon，保护才真正生效。所以启用 live-restore 要按这个节奏规划窗口：

```text
改配置 → 重启（业务还会断最后一次）→ 之后的重启都不再断
```bash

坑先记在这里，下一球马上补上证据。

---

## 雪球 4：第二次重启——Up 时间跨重启连续，容器真没停

现在机器上跑着的 daemon，已经带着 live-restore=true 了。再重启一次：

```bash
$ docker ps --format '{{.Names}}\t{{.Status}}' | head -3     # 重启前
rabbit2   Up 40 seconds

$ systemctl restart docker && sleep 8

$ docker ps --format '{{.Names}}\t{{.Status}}' | head -3     # 重启后
rabbit2   Up 50 seconds        ← 时间连续累加 = 容器全程没停过
...
 Live Restore Enabled: true
```bash

两处关键证据：

- `Up 40 seconds → Up 50 seconds`：时间**连续累加**。中间明明隔了一次 daemon 重启加 8 秒等待（`sleep 8` 是等 daemon 起回来），容器的 Up 计时却没清零——它压根没死过。对照雪球 2 的 `4 hours → 17 seconds`，一眼分清「活了 50 秒」和「才拉起来 50 秒」。
- 块尾 `Live Restore Enabled: true`（`...` 是省略的其余输出）：顺手用 `docker info` 确认新配置在位。

还有个反直觉的细节：重启进行的那几秒，`docker ps` 是**连不上**的——CLI 连的是 dockerd，它正在换班。但宿主机上 `ps` 能看到 containerd-shim 进程还在、业务端口还在响应。[第 23 篇](/云原生/docker/docker-23-daemon-runtime/)画的调用链在这里兑现：容器挂在 shim 下面，不挂在 dockerd 下面。

所以 live-restore 保的是**容器**，不是 **docker CLI**：daemon 不在的那几秒，你看得见业务，管不了容器。

---

## 雪球 5：别只看 Up 时间——让业务自己开口

Up 时间只能证明「进程没死」。业务到底伤没伤着，得让业务自己说话——在重启 daemon 的同时，从外面连它：

```bash
$ curl -s -o /dev/null -w '%{http_code}\n' -u guest:guest http://localhost:15672/api/overview
200                                          # RabbitMQ 管理 API 全程存活

$ docker exec rabbit1 rabbitmq-diagnostics cluster_status | grep -A4 "Running Nodes"
rabbit@rabbit1
rabbit@rabbit2
rabbit@rabbit3                               # 集群三节点完好
```bash

- `200`：RabbitMQ 管理 API 全程存活，一次都没拒连。
- `cluster_status` 里 rabbit@rabbit1/2/3 三行全在：没有节点掉队，也没有发生分区再恢复。

对有状态服务，「进程还在」不等于「没事」——真正的杀伤是连接断开、内存态丢失、崩溃恢复。这次三样都没发生，才算真正做到「升级不断业务」。

---

## 雪球 6：认清边界——它保「大脑换班」，不保「心脏停跳」

live-restore 不是万能护身符。先把架构钉在墙上，再对照着看它管到哪一层：

```text
宿主机
├── dockerd             ← live-restore 只保「它换班」（重启/崩溃 ✅）
├── containerd          ← 它一动，容器跟着动 ❌
│   └── containerd-shim
│       └── 容器/业务    ← 真正扛业务的，平时就不归 dockerd 管
└── 宿主机自己重启 ❌——只能靠 restart 策略拉回
```bash

| 场景 | live-restore 能救吗 |
|------|:---:|
| 重启 dockerd（升级 Docker、改配置） | ✅ 本篇实测 |
| dockerd 崩溃 | ✅（容器本来就独立于 daemon 生命周期，[第 23 篇](/云原生/docker/docker-23-daemon-runtime/)的 shim 机制） |
| **重启/升级 containerd** | ❌（shim 是 containerd 的孩子，它动容器就动） |
| 宿主机重启 | ❌（靠 restart 策略拉起） |
| daemon 停太久（跨版本超兼容期） | ⚠️ 升级跨大版本时官方建议别依赖它停太久 |

所以 restart 策略照样要配：live-restore 管升级窗口，restart 策略管断电和宿主机重启，两个兜底不冲突。

---

## 雪球 7：再加一行 metrics-addr——给 Prometheus 开一扇窗

业务不断了，还得看得住。`daemon.json` 再加一行（完整文件）：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true,
  "metrics-addr": "127.0.0.1:9323"
}
```bash

重启后先手动扒一次指标：

```bash
$ curl -s http://127.0.0.1:9323/metrics | head
# HELP engine_daemon_container_actions_seconds The number of seconds it takes to process each container action
engine_daemon_container_actions_seconds_bucket{action="changes",le="0.005"} 1
...
```bash

- `# HELP` 开头的行是这个指标的「自带说明书」，Prometheus 文本格式的固定写法。
- `engine_daemon_container_actions_seconds_bucket{action="changes",le="0.005"} 1`：容器动作耗时的直方图桶——「changes 这类动作里，耗时不超过 0.005 秒的，出现过 1 次」。
- `engine_daemon_*` 系列覆盖容器动作耗时、engine 状态、镜像/构建统计。

给它配上 Prometheus 抓取任务 + Grafana 面板（或直接用现成的 docker engine dashboard），[第 27 篇](/云原生/docker/docker-27-logging-monitoring/)说的「机器采集」就在 daemon 这一侧闭环了。

注意这行只绑 `127.0.0.1`：指标里带着主机信息，要远程采集就在前面加反代带认证，别把它裸奔到公网。

---

## 雪球 8：最重的一行 data-root——把 /var/lib/docker 搬去数据盘

雪球 1 里那个 `Docker Root Dir: /var/lib/docker`：镜像、容器、卷、构建缓存全在里头，而且默认落在系统盘。系统盘小、数据盘大时，就得给它搬家。标准动作五步，**顺序不能乱**：

```bash
systemctl stop docker                                   # 1. 停 daemon（配合 live-restore 更稳：容器不中断）
rsync -aHAX /var/lib/docker/ /data/docker/              # 2. 完整复制（保留硬链接/属性）
mv /var/lib/docker /var/lib/docker.bak                  # 3. 旧的改名保底
# daemon.json 加 "data-root": "/data/docker"
systemctl start docker                                  # 4. 起新配置启动
docker info | grep "Docker Root Dir"                    # 5. 验证 → 确认无误后删 .bak
```bash

为什么一步都省不得：

- **第 1 步先停 daemon**：不停的话边拷边写，拷出来的就是一份「半途而废」的数据。有雪球 3 的 live-restore，这一步容器不断——第一次享受到它的红利。
- **第 2 步用 `rsync -aHAX` 而不是 `cp`**：镜像层里有硬链接和稀疏文件，参数拷错磁盘直接翻倍。
- **第 3 步改名保底**，不直接删：出了问题还能把 `.bak` 改回去。
- **第 4 步**才是把 `"data-root": "/data/docker"` 写进 daemon.json、按新配置启动。
- **第 5 步**用 `docker info | grep "Docker Root Dir"` 确认变成 `/data/docker`，跑稳一阵子再删 `.bak`。

动手前先 `docker system df` 评估体积（[第 27 篇](/云原生/docker/docker-27-logging-monitoring/)），顺手做一轮计划性 prune，别带着垃圾搬家。

---

## 雪球 9：一台机管明白了，N 台呢——docker context

前八球都在一台机器里转。真到生产，一个人往往要管 N 台机器的 daemon：CLI 怎么连「别的机器上的 daemon」？两件事：daemon 侧开远程访问（TCP+TLS 或 SSH），CLI 侧用 **context** 记住多套连接方式。实测：

```bash
$ docker context ls
NAME       DESCRIPTION                              DOCKER ENDPOINT                        ...
default * Current DOCKER_HOST based configuration   unix:///var/run/docker.sock
```bash

初始只有一个 `default`，名字后面的 `*` 表示「当前正在用」，endpoint 是本机 socket `unix:///var/run/docker.sock`。建一个新 context 并切过去：

```bash
# 建一个 context（演示指向本机 socket；生产写 ssh://user@10.0.0.5 或 tcp://...）
$ docker context create demo-remote --docker "host=unix:///var/run/docker.sock"
$ docker context use demo-remote
Current context is now: "demo-remote"
```bash

（演示先指向本机 socket；生产写 `ssh://user@10.0.0.5` 或 `tcp://...`。）切完再看一眼：

```bash
$ docker context ls
default        ...   unix:///var/run/docker.sock
demo-remote *        unix:///var/run/docker.sock     ← * 跟着 context 走

$ docker context use default && docker context rm demo-remote   # 用完还原
```bash

`*` 已经移到 `demo-remote` 头上了；最后一行用完还原。之后所有 `docker ...` 命令自动作用于当前 context 指向的 daemon——服务器批量操作、本地开发连测试机，都不用每次敲 `-H`。

安全红线：**远程暴露 daemon = 远程 root**（[第 25 篇](/云原生/docker/docker-25-container-security/)）。优先走 SSH（`ssh://user@host`，免证书管理、有审计）；要开 TCP 就必须配 TLS 双向认证，绝不裸 2375。

---

## 雪球 10：拼成一份能贴墙的 daemon 运维 checklist

九个球滚完，把散落的动作叠成一张表，升级或巡检前对着过一遍：

| 事项 | 做法 |
|------|------|
| 日志轮转 | daemon.json 全局 `log-opts`（第 27 篇） |
| 升级不断业务 | `live-restore: true`（注意启用后第一次重启仍会断）+ 重启策略兜底 |
| 监控 | `metrics-addr` + Prometheus（第 27 篇三板斧做人工侧） |
| 磁盘治理 | `docker system df` 巡检 + 计划性 `prune`（第 12/15 篇） |
| 数据盘 | `data-root` 迁移，`rsync -aHAX` |
| 远程管理 | `docker context` + SSH 优先 |
| 版本策略 | 固定小版本、看 release notes 再升级（deprecated 列表官方有维护） |

这张表每一行都有出处：日志轮转是雪球 1 对的账，升级不断业务是雪球 3、4 实测的，监控是雪球 7，数据盘是雪球 8，远程管理是雪球 9。

---

## 这些命令怎么记

按滚雪球的顺序记，比背清单好使：

| 动作 | 命令 / 论断 | 你在哪一球用过 |
|------|------|----------------|
| 固定回路 | 改 daemon.json → `systemctl restart docker` → `docker info` 验证 | 1 |
| 重启的三种结局 | 同一条 `systemctl restart docker`：全灭（2、3）→ 不断（4） | 2、3、4 |
| 看容器死没死 | `docker ps --format '{{.Names}}\t{{.Status}}'` | 2、4 |
| 让业务自己作证 | `curl` 管理 API、`docker exec ... diagnostics` | 5 |
| 扒指标 | `curl http://127.0.0.1:9323/metrics` | 7 |
| 搬家五步 | `rsync -aHAX` + 改名保底 + 验证 | 8 |
| 切机器 | `docker context create/use/ls/rm` | 9 |

---

## 历史包袱

- **存储驱动的名字**：老教程里到处写 `overlay2`，新版本 `docker info` 里显示的是 `overlayfs`——同一个东西演进而来的改名，不是两个驱动，认老名字别慌。
- **裸 TCP 2375 远程管理**：早期教程常用 `docker -H tcp://主机:2375` 直连。明文端口等于把 root 送出去（雪球 9 的红线），现在 TCP 必须配 TLS，更省心的是直接 `ssh://`。
- **手敲 `-H` 或设 `DOCKER_HOST` 切环境**：老办法能用，但多套环境来回切容易忘、容易连错机器；`docker context` 就是为取代这种手忙脚乱而生的。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|------|----------------------|
| [第 23 篇](/云原生/docker/docker-23-daemon-runtime/) Daemon 与 runtime | 雪球 2、4 的 shim 调用链，雪球 6 的边界判断 |
| [第 14 篇](/云原生/docker/docker-14-data-persistence/) 数据持久化 | 雪球 2 的 restart 策略兜底 |
| [第 4 篇](/云原生/docker/docker-04-install) 安装 | 雪球 1 对账的 registry-mirrors |
| [第 12 篇](/云原生/docker/docker-12-harbor) Harbor | 雪球 1 表里的 insecure-registries |
| [第 27 篇](/云原生/docker/docker-27-logging-monitoring/) 日志与监控 | 雪球 1 的 log-opts、雪球 7 的采集闭环、雪球 8 的 `system df` |
| [第 25 篇](/云原生/docker/docker-25-container-security/) 容器安全 | 雪球 9 的「远程暴露 = 远程 root」 |
| [第 10 篇](/云原生/docker/docker-10-build-advanced) 构建进阶 | 上一篇 |

---

## 小结

把这份 daemon.json 从三行滚成生产配置，一路验证：

1. **对账**：`registry-mirrors`、`log-opts` 早就在管这台机；固定回路是「改文件 → 重启 → `docker info` 验证」。  
2. **默认代价**：重启 daemon = 容器全体被杀再拉起（`Up 4 hours → 17 seconds`）；restart 策略只管拉回，不管不中断。  
3. **加 `live-restore`**：启用后的第一次重启仍会断——杀不杀容器由执行关停的**旧 daemon** 决定。  
4. **第二次起生效**：`Up 40s → 50s` 连续累加，`Live Restore Enabled: true`。  
5. **业务作证**：管理 API 全程 200，集群三节点完好，无崩溃恢复。  
6. **边界**：dockerd 重启/崩溃能救；containerd 重启、宿主机重启救不了；跨大版本停太久别依赖。  
7. **加 `metrics-addr`**：`engine_daemon_*` 指标喂给 Prometheus，只绑 127.0.0.1。  
8. **加 `data-root`**：`rsync -aHAX` 五步搬家，先停 daemon、改名保底、验证后再删。  
9. **`docker context`**：记住多套 daemon 连接，`*` 跟着 context 走；远程优先 SSH，绝不裸 2375。  
10. **收口**：九个球叠成升级/巡检 checklist，版本固定小版本、看 release notes 再动手。

**思考题**：live-restore 开启期间你升级了 Docker 大版本、daemon 停了 40 分钟，容器一直在跑——重启回来的新 daemon 会怎么对待这些「旧版本 shim 管着的容器」？（提示：daemon 与 shim 协议兼容性、官方对 live-restore 时长的建议。）

---

## 参考资料

- [Docker Docs · Configure and run Docker with systemd / daemon.json](https://docs.docker.com/engine/daemon/configuration/)
- [Live restore](https://docs.docker.com/engine/daemon/live-restore/) — 官方边界说明
- [Collect Docker metrics with Prometheus](https://docs.docker.com/engine/daemon/prometheus/)
- [docker context 参考](https://docs.docker.com/reference/cli/docker/context/)
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.1.3（实验后已还原 daemon.json 原始配置）
