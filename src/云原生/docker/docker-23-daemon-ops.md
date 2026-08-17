---
title: Daemon 运维——daemon.json、live-restore 与远程管理
sidebarGroup: Docker 系列
shortTitle: 24 Daemon 运维
order: 24
date: 2026-08-28T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: Daemon 运维——daemon.json、live-restore 与远程管理
---

> **Docker 系列 · 第 24/24 篇**
> 上一篇：[《构建进阶——多阶段构建、缓存优化与 BuildKit》](/云原生/docker/docker-22-build-advanced)

---

## 开头：改一行配置，业务断多久？

要升级 Docker 版本、调整日志配置、换数据盘——这些都要**重启 dockerd**。第 21 篇讲过：真正跑容器的是 containerd-shim，dockerd 只是「大脑」。那么大脑重启，手脚（容器）必须跟着停吗？

默认答案：**必须**。本篇实测证明这个代价，再证明 `"live-restore": true` 一行配置怎么把它消掉，顺带讲透 daemon 的控制面板 `daemon.json`、Prometheus 指标端点、`docker context` 远程管理。本机环境：Docker 29.1.3（WSL2 Ubuntu-22.04），机上跑着 RabbitMQ 三节点集群和一个应用栈——正好当「业务」的活体实验对象（实验后已还原配置）。

---

## 一、daemon.json：daemon 的总控制台

dockerd 启动时读 `/etc/docker/daemon.json`，本机的真实配置（日志篇讲过一半）：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```

运维最常用的一张地图（改完都要 `systemctl restart docker` 生效；`docker info` 可验证大部分结果）：

| 配置项 | 作用 | 验证方式 |
|------|------|------|
| `registry-mirrors` | 镜像拉取加速（配置步骤与验收见[第 4 篇](/云原生/docker/docker-04-install)） | `docker info` Registry Mirrors |
| `log-driver` / `log-opts` | 全局日志驱动与轮转（[第 15 篇](/云原生/docker/docker-20-logging-monitoring/)） | `docker info` Logging Driver |
| `live-restore` | daemon 重启/升级时容器不断（本篇主角） | `docker info` Live Restore |
| `metrics-addr` | 暴露 Prometheus 指标端点 | `curl :9323/metrics` |
| `data-root` | 数据目录迁移（默认 `/var/lib/docker`） | `docker info` Docker Root Dir |
| `storage-driver` | 存储驱动（现代默认 `overlayfs`，即原 overlay2 演进） | `docker info` Storage Driver |
| `insecure-registries` | HTTP 私有仓库白名单；HTTPS + 已信任 CA 的 Harbor 主路径通常不必靠它（细节见[第 10 篇](/云原生/docker/docker-09-harbor)） | `docker info` Insecure Registries |
| `debug` | daemon 调试日志 | daemon 日志变详细 |

```
$ docker info | grep -E "Server Version|Storage Driver|Docker Root Dir|Live Restore"
 Server Version: 29.1.3
 Storage Driver: overlayfs
 Docker Root Dir: /var/lib/docker
 Live Restore Enabled: false          ← 本篇要把它变 true
```

---

## 二、默认行为的代价：daemon 一重启，容器全体火葬式重启（实测）

重启 daemon 前后对比容器状态（机上真实业务：RabbitMQ 集群 + 应用栈）：

```bash
$ systemctl restart docker

# 重启前                                    # 重启后
rabbit2   Up 4 hours                        rabbit2   Up 17 seconds
rabbit1   Up 4 hours                        rabbit1   Up 16 seconds
rabbit3   Up 4 hours                        rabbit3   Up 16 seconds
new-api   Up 4 hours (healthy)              new-api   Up 9 seconds (health: starting)
```

**所有容器被杀掉再拉起**（幸亏配了 `restart: unless-stopped`，见 [第 12 篇](/云原生/docker/docker-19-data-persistence/)——但「重启」本身就是一次服务中断：连接断开、内存态丢失、数据库要做崩溃恢复）。对生产上有状态服务，这就是升级窗口的痛。

---

## 三、live-restore：大脑重启，手脚不停（实测）

### 3.1 开启与第一次重启的陷阱

配置加上一行，重启 daemon：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true,
  "metrics-addr": "127.0.0.1:9323"
}
```

> ⚠️ **实测踩到的细节**：改完配置后的**第一次** `systemctl restart docker`，容器照样被杀了——因为执行关停动作的是**旧 daemon 进程**，它内存里加载的还是旧配置（live-restore=false），杀不杀容器由它说了算。**从第二次重启开始**（此时运行中的 daemon 已加载 live-restore=true），保护才真正生效。启用 live-restore 时要按「改配置 → 重启（业务还会断一次）→ 之后的重启都不再断」规划窗口。

### 3.2 真正的验证：Up 时间跨重启连续

```bash
$ docker ps --format '{{.Names}}\t{{.Status}}' | head -3     # 重启前
rabbit2   Up 40 seconds

$ systemctl restart docker && sleep 8

$ docker ps --format '{{.Names}}\t{{.Status}}' | head -3     # 重启后
rabbit2   Up 50 seconds        ← 时间连续累加 = 容器全程没停过
...
 Live Restore Enabled: true
```

「Up 40s → Up 50s」——**daemon 关停期间容器照常运行**（此刻 `docker ps` 不可用，但宿主机 `ps` 能看到 containerd-shim 进程还在、业务端口还在响应）。再用业务本身验证：

```bash
$ curl -s -o /dev/null -w '%{http_code}\n' -u guest:guest http://localhost:15672/api/overview
200                                          # RabbitMQ 管理 API 全程存活

$ docker exec rabbit1 rabbitmq-diagnostics cluster_status | grep -A4 "Running Nodes"
rabbit@rabbit1
rabbit@rabbit2
rabbit@rabbit3                               # 集群三节点完好
```

### 3.3 适用边界

| 场景 | live-restore 能救吗 |
|------|:---:|
| 重启 dockerd（升级 Docker、改配置） | ✅ 本篇实测 |
| dockerd 崩溃 | ✅（容器本来就独立于 daemon 生命周期，[第 21 篇](/云原生/docker/docker-12-daemon-runtime/)的 shim 机制） |
| **重启/升级 containerd** | ❌（shim 是 containerd 的孩子，它动容器就动） |
| 宿主机重启 | ❌（靠 restart 策略拉起） |
| daemon 停太久（跨版本超兼容期） | ⚠️ 升级跨大版本时官方建议别依赖它停太久 |

---

## 四、metrics-addr：给 Prometheus 开一扇窗（实测）

同一份 daemon.json 里的 `"metrics-addr": "127.0.0.1:9323"` 让 daemon 暴露 [Prometheus 格式指标](https://docs.docker.com/engine/daemon/prometheus/)：

```bash
$ curl -s http://127.0.0.1:9323/metrics | head
# HELP engine_daemon_container_actions_seconds The number of seconds it takes to process each container action
engine_daemon_container_actions_seconds_bucket{action="changes",le="0.005"} 1
...
```

`engine_daemon_*` 系列指标覆盖容器动作耗时、engine 状态、镜像/构建统计。配上 Prometheus 抓取任务 + Grafana 面板（或直接用现成的 docker engine dashboard），[第 15 篇](/云原生/docker/docker-20-logging-monitoring/)说的「机器采集」就闭环了。**只绑 127.0.0.1**，需要远程采集用反代加认证，别裸奔公网。

---

## 五、data-root 迁移：/var/lib/docker 换个家

系统盘小、数据盘大——把 `/var/lib/docker`（镜像、容器、卷、构建缓存全在里面）搬到数据盘是常见需求。标准动作（**顺序不能乱**）：

```bash
systemctl stop docker                                   # 1. 停 daemon（配合 live-restore 更稳：容器不中断）
rsync -aHAX /var/lib/docker/ /data/docker/              # 2. 完整复制（保留硬链接/属性）
mv /var/lib/docker /var/lib/docker.bak                  # 3. 旧的改名保底
# daemon.json 加 "data-root": "/data/docker"
systemctl start docker                                  # 4. 起新配置启动
docker info | grep "Docker Root Dir"                    # 5. 验证 → 确认无误后删 .bak
```

> ⚠️ 用 `rsync -aHAX` 而不是 `cp`：镜像层里有硬链接和稀疏文件，拷错参数磁盘直接翻倍。操作前先 `docker system df` 评估体积（[第 15 篇](/云原生/docker/docker-20-logging-monitoring/)）。

---

## 六、docker context：一个人管 N 台机器的 daemon

CLI 怎么连「别的机器上的 daemon」？两件事：daemon 侧开远程访问（TCP+TLS 或 SSH），CLI 侧用 **context** 记住多套连接方式。实测：

```bash
$ docker context ls
NAME       DESCRIPTION                              DOCKER ENDPOINT                        ...
default * Current DOCKER_HOST based configuration   unix:///var/run/docker.sock

# 建一个 context（演示指向本机 socket；生产写 ssh://user@10.0.0.5 或 tcp://...）
$ docker context create demo-remote --docker "host=unix:///var/run/docker.sock"
$ docker context use demo-remote
Current context is now: "demo-remote"

$ docker context ls
default        ...   unix:///var/run/docker.sock
demo-remote *        unix:///var/run/docker.sock     ← * 跟着 context 走

$ docker context use default && docker context rm demo-remote   # 用完还原
```

之后所有 `docker ...` 命令自动作用于当前 context 指向的 daemon——服务器批量操作、本地开发连测试机，不用每次敲 `-H`。

> ⚠️ 远程暴露 daemon = 远程 root（[第 22 篇](/云原生/docker/docker-21-container-security/)）：优先走 **SSH**（`ssh://user@host`，免证书管理、有审计），要开 TCP 必须配 TLS 双向认证，绝不裸 2375。

---

## 七、daemon 运维 checklist

| 事项 | 做法 |
|------|------|
| 日志轮转 | daemon.json 全局 `log-opts`（第 15 篇） |
| 升级不断业务 | `live-restore: true`（注意启用后第一次重启仍会断）+ 重启策略兜底 |
| 监控 | `metrics-addr` + Prometheus（第 15 篇三板斧做人工侧） |
| 磁盘治理 | `docker system df` 巡检 + 计划性 `prune`（第 12/15 篇） |
| 数据盘 | `data-root` 迁移，`rsync -aHAX` |
| 远程管理 | `docker context` + SSH 优先 |
| 版本策略 | 固定小版本、看 release notes 再升级（deprecated 列表官方有维护） |

---

## 小结

- `daemon.json` 是 daemon 总控台：镜像加速、日志、live-restore、metrics、data-root、存储驱动都在这一个文件。
- **默认重启 daemon = 全部容器重启**（实测 Up 4h → 17s）；`"live-restore": true` 后容器跨 daemon 重启存活（实测 Up 40s → 50s 连续、业务 API 200）。
- 启用 live-restore 的第一次重启仍会中断——**杀不杀容器由执行关停的旧 daemon 决定**；containerd 重启/宿主机重启不在保护范围。
- `metrics-addr` 暴露 Prometheus 指标（`engine_daemon_*`），绑 127.0.0.1。
- 迁移 data-root 用 `rsync -aHAX` 五步走；多 daemon 管理用 `docker context`，远程优先 SSH。

**思考题**：live-restore 开启期间你升级了 Docker 大版本、daemon 停了 40 分钟，容器一直在跑——重启回来的新 daemon 会怎么对待这些「旧版本 shim 管着的容器」？（提示：daemon 与 shim 协议兼容性、官方对 live-restore 时长的建议。）

---

## 参考资料

- [Docker Docs · Configure and run Docker with systemd / daemon.json](https://docs.docker.com/engine/daemon/configuration/)
- [Live restore](https://docs.docker.com/engine/daemon/live-restore/) — 官方边界说明
- [Collect Docker metrics with Prometheus](https://docs.docker.com/engine/daemon/prometheus/)
- [docker context 参考](https://docs.docker.com/reference/cli/docker/context/)
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.1.3（实验后已还原 daemon.json 原始配置）
