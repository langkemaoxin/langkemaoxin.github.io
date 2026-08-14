---
title: 容器日志与监控——logs 原理、日志轮转与 stats/events 三板斧
sidebarGroup: Docker 系列
shortTitle: 20 日志与监控
order: 20
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 容器日志与监控——logs 原理、日志轮转与 stats/events 三板斧
---

> **Docker 系列 · 第 20/23 篇**  
> 上一篇：[《数据持久化》](/云原生/docker/docker-19-data-persistence/) · 下一篇：[《容器安全》](/云原生/docker/docker-21-container-security/)

---

## 开头：磁盘 100%，凶手是三个 json.log

两件经典事故，你可能迟早遇到一件：

1. 线上服务器磁盘告警，`df -h` 一查 `/var/lib/docker` 几十 G——罪魁是一个容器跑了半年、从没配过日志轮转的 `-json.log` 文件；
2. 出了事故想翻日志，`docker logs` 只剩最近几行——因为日志全进了远端收集器，或者被轮转策略悄悄丢了。

日志和监控是容器「可运维」的底线。本篇在本机（Docker 29.x，WSL2 Ubuntu-22.04）实测：`docker logs` 的底层原理、日志轮转怎么配怎么验证、logging driver 体系，以及 `stats`/`events`/`system df` 监控三板斧。

---

## 一、容器日志的第一原则：应用写 stdout/stderr

Docker 的日志采集模型来自 [12-Factor](https://12factor.net/zh_cn/logs)：**应用只管往 stdout/stderr 打日志，收集、轮转、转发交给外面**。容器里 PID 1 进程（[第 11 篇](/云原生/docker/docker-11-process-view/)讲过它和容器的生死绑定）写到这两个流的每一行，都会被 Docker 接住、交给 logging driver 处理。

这意味着两件反直觉的事：

- 往容器里的 `/var/log/app.log` 写文件？**`docker logs` 看不到**——那只是可写层里的普通文件，还得自己解决轮转和读取（[第 19 篇](/云原生/docker/docker-19-data-persistence/)的挂载知识这时候才用得上）；
- Nginx 这类默认写文件日志的软件，官方镜像都做了适配：`nginx` 镜像把 `/var/log/nginx/access.log` 软链到了 `/dev/stdout`。

> 🔑 判断一个镜像日志姿势对不对，就看一条：`docker logs` 能不能看到它的业务日志。

---

## 二、docker logs 的原理：json-file 驱动解剖（实测）

默认驱动 `json-file` 会把每行日志写成一条 JSON。起个会打日志的容器：

```bash
$ docker run -d --name log-demo busybox sh -c 'i=0; while [ $i -lt 5 ]; do echo "log line $i"; i=$((i+1)); done'
$ docker logs log-demo
log line 0
log line 1
log line 2
log line 3
log line 4
```

`docker logs` 的读法和日志文件的位置，`inspect` 里全有：

```bash
$ docker inspect log-demo --format '{{json .HostConfig.LogConfig}}'
{"Type":"json-file","Config":{"max-file":"3","max-size":"10m"}}    ← 本机 daemon 配了默认轮转，见第四节

$ docker inspect log-demo --format '{{.LogPath}}'
/var/lib/docker/containers/cb460bb3.../cb460bb3...-json.log

$ cat /var/lib/docker/containers/cb460bb3.../cb460bb3...-json.log
{"log":"log line 0\n","stream":"stdout","time":"2026-08-14T13:18:56.602382666Z"}
{"log":"log line 1\n","stream":"stdout","time":"2026-08-14T13:18:56.60292656Z"}
...
```

每行 JSON 三个字段：`log`（日志内容）、`stream`（stdout 还是 stderr）、`time`（Docker 收到的时间戳）。`docker logs` 本质就是读这个文件再格式化输出——所以它快、不用进容器，但也因此**只对「写文件」类驱动有效**（第五节）。

读日志常用姿势：

```bash
docker logs -f web            # 跟随输出（tail -f 的感觉）
docker logs --tail 3 web      # 只看最后 3 行（实测输出：line 97/98/99）
docker logs --since 10m web   # 最近 10 分钟
docker logs -t web            # 显示时间戳
```

---

## 三、日志轮转：防磁盘爆掉的唯一手段（实测）

### 3.1 两级配置：daemon 全局默认 + 容器级覆盖

**daemon 级**写在 `/etc/docker/daemon.json`，所有容器继承——本机的真实配置：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```

**容器级**用 `--log-opt` 覆盖（也可以在 Compose 的 `logging:` 字段写，见[第 18 篇](/云原生/docker/docker-18-compose/)）：

```bash
docker run -d --log-opt max-size=10m --log-opt max-file=3 nginx
```

> ⚠️ 不配轮转 = 无限增长的 json.log，就是开头那种磁盘事故。**装完 Docker 第一件事建议就是把这两行写进 daemon.json**（本机就是这么做的）。

### 3.2 轮转行为实测验证

用极端参数（`max-size=1k`、`max-file=2`）让轮转立刻发生——打 2000 行日志后看文件系统：

```bash
$ docker run -d --name rotate-demo --log-opt max-size=1k --log-opt max-file=2 \
    busybox sh -c 'i=0; while [ $i -lt 2000 ]; do echo "aaaa... $i"; i=$((i+1)); done'

$ ls -lh /var/lib/docker/containers/75f0a584.../
...-json.log       784B    ← 当前活跃文件
...-json.log.1    1008B    ← 轮转出来的旧文件（最多保留 max-file 份）

$ docker logs rotate-demo | wc -l
16
```

**2000 行只剩 16 行**——轮转是「保留最近 N 份、丢弃更旧的」，`docker logs` 读到的是轮转后幸存的内容。这行实测同时回答了「轮转会不会丢日志」：会，这正是它存在的目的（用有限磁盘换最近日志）。

---

## 四、Logging Driver：日志的去向不止文件

`json-file` 只是十来种驱动之一（官方 [Logging 文档](https://docs.docker.com/engine/logging/)），按「日志去哪」分类：

| 驱动 | 去向 | 适用 |
|------|------|------|
| `json-file`（默认） | 本地 JSON 文件 | 单机、开发、小规模生产 |
| `local` | 本地二进制格式（**自带压缩、更省磁盘**） | 想要本地文件又要高密度保留 |
| `syslog` / `journald` | 系统日志服务 | 已有统一 syslog/journald 采集体系 |
| `fluentd` / `gelf` | 日志中间件（→ ES/Graylog/Loki） | 容器化日志平台 |
| `splunk` / `awslogs` / `gcplogs` | 商业/云厂商 | 对应平台托管 |
| `none` | **丢弃** | 不要日志（一次性任务） |

**切换驱动前必须知道的坑**——`docker logs` 不是万能的：

```bash
$ docker run -d --name nolog-demo --log-driver none busybox sleep 30
$ docker logs nolog-demo
Error response from daemon: configured logging driver does not support reading
```

只有落本地的驱动（`json-file`/`local`）支持 `docker logs`；日志进了 fluentd/splunk，就得去对应平台查——**采集体系迁移前先想好排查路径**。

---

## 五、监控三板斧：stats、events、system df（实测）

### 5.1 docker stats：资源用量的实时仪表盘

```bash
$ docker stats --no-stream
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
8bcc40336e87   rabbit2            0.33%     126.5MiB / 7.757GiB   1.59%     53.2MB / 57.1MB   36.2MB / 807kB    33
9a29fee69910   rabbit1            0.32%     126.2MiB / 7.757GiB   1.59%     68.7MB / 64.9MB   109MB / 831kB    33
183b75dfd378   rabbit3            0.29%     124.8MiB / 7.757GiB   1.57%     50.7MB / 58MB     16.9MB / 860kB    34
d4ebafc773e4   new-api            0.05%     23.57MiB / 7.757GiB   0.30%     5.14MB / 4.45MB   133MB / 0B        14
90f6c151295d   new-api-postgres   0.01%     47.05MiB / 7.757GiB   0.59%     4.17MB / 5.08MB   199MB / 19.5MB    7
1c507b876b7e   new-api-redis      0.21%     7.176MiB / 7.757GiB   0.09%     283kB / 55.7kB    13.5MB / 20.5kB   6
```

（本机真实负载：RabbitMQ 三节点集群 + 一个 Go 应用栈。）

逐列解读——每一列背后都是前面讲过的机制：

| 列 | 含义 | 背后机制 |
|------|------|------|
| CPU % | 占宿主机 CPU 的百分比 | cgroups CPU 统计（[第 16 篇](/云原生/docker/docker-16-cgroups/)） |
| MEM USAGE / LIMIT | 已用内存 / 上限（`-m` 没配就是宿主机内存） | cgroups memory；LIMIT 显示 7.757GiB = 没限额，**生产该配** |
| NET I/O / BLOCK I/O | 网络/块设备累计流量 | cgroups netcls/blkio |
| PIDS | 容器内进程/线程数 | cgroups pids（防进程炸弹） |

> 🔑 `MEM LIMIT` 等于宿主机总内存 = 这个容器没配 `-m`。用 stats 巡检时，**LIMIT 列就是限额检查表**。

### 5.2 docker events：Docker 的「审计日志」

实时输出 daemon 的所有事件流（容器生命周期、镜像拉取、卷挂载……）：

```bash
$ docker events --filter type=container --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}}'
# 另一个终端: docker run --rm --name evt-demo busybox echo hi

1786713587 create evt-demo
1786713587 attach evt-demo
1786713588 start evt-demo
1786713589 die evt-demo
1786713589 destroy evt-demo
```

一行容器的一生：`create → attach → start → die → destroy`，清清楚楚。排查「容器为什么没了」「谁重启了它」时，先看 events；配 `--since` 还能回溯历史。

### 5.3 docker system df：磁盘都在哪

```bash
$ docker system df
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          7         5         1.916GB   1.897GB (98%)
Containers      7         6         53.25kB   4.096kB (7%)
Local Volumes   6         6         70.26MB   0B (0%)
Build Cache     0         0         0B        0B
```

四类对象占了多少磁盘、多少可回收。本机实测：7 个镜像 1.9G、98% 可回收（存在未使用镜像）——`docker image prune` 的时机判断就靠这张表（[第 19 篇](/云原生/docker/docker-19-data-persistence/)讲过 volume 的 RECLAIMABLE 为什么是 0：命名卷不算可回收）。

---

## 六、走向专业监控：Prometheus 指标接口

`stats`/`events` 是人看的；机器采集走 daemon 的 **Prometheus 指标端点**：daemon.json 配 `"metrics-addr": ":9323"` 后，`/metrics` 暴露容器 CPU/内存/网络等全套指标，配 Prometheus + Grafana（或 cAdvisor）就是完整的容器监控体系。配置和实测放在[第 23 篇 daemon 运维](/云原生/docker/docker-23-daemon-ops/)（涉及 daemon 重启，正好一起讲）。

---

## 小结

- 容器日志第一原则：**应用写 stdout/stderr**，`docker logs` 才能看到；写文件日志要自己解决。
- `json-file` 驱动把每行存成 JSON（`log`/`stream`/`time`）在 `containers/<id>/<id>-json.log`；`--tail`/`--since`/`-f` 是排查三件套。
- **轮转必配**：daemon.json 全局默认 + `--log-opt` 容器级覆盖；实测 2000 行在 1k×2 份轮转下只剩 16 行——轮转就是有代价的丢弃。
- 换 logging driver（fluentd/splunk/none…）后 `docker logs` 失效，只有 `json-file`/`local` 支持读取。
- 监控三板斧：`stats`（资源，LIMIT 列即限额检查）、`events`（生命周期审计）、`system df`（磁盘去向）；机器采集用 Prometheus 端点（第 23 篇）。

**思考题**：一个没配 `max-size` 的容器跑了两年后，你怎么安全地清理它的 json.log 而不影响业务？（提示：直接 `rm` 文件行不行？文件被进程持有后会怎样——`truncate` 和重启容器两种方案的差别。）

下一篇：[《容器安全》](/云原生/docker/docker-21-container-security/)。

---

## 参考资料

- [Docker Docs · View logs for a container application](https://docs.docker.com/engine/logging/) — 驱动体系、默认行为
- [Configure logging drivers](https://docs.docker.com/engine/logging/configure/) — daemon.json/容器级配置、轮转参数
- [docker stats 参考](https://docs.docker.com/reference/cli/docker/container/stats/) / [docker events 参考](https://docs.docker.com/reference/cli/docker/system/events/)
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.x（daemon.json 全局轮转配置为本机真实内容）
