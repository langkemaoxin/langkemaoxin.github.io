---
title: 容器日志与监控——盯住同一个容器，从 logs 第一行滚到磁盘账单
sidebarGroup: Docker 系列
shortTitle: 27 日志与监控
order: 27
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 盯住同一个容器滚雪球：logs 第一行、json-file 落盘解剖、轮转实测 2000 行剩 16 行、none 驱动当场翻车、stats/events/system df 三板斧。
---

> **Docker 系列 · 第 27/33 篇**
> 上一篇：[《Rootless 模式——不给 root 也能跑 Docker》](/云原生/docker/docker-26-rootless) · 下一篇：[《Daemon 运维——从重启容器全灭滚到升级不断业务》](/云原生/docker/docker-28-daemon-ops)

---

## 开头：磁盘 100%，凶手是三个 json.log

两件经典事故，你可能迟早遇到一件：

1. 线上服务器磁盘告警，`df -h` 一查 `/var/lib/docker` 几十 G——罪魁是一个容器跑了半年、从没配过日志轮转的 `-json.log` 文件；
2. 出了事故想翻日志，`docker logs` 只剩最近几行——因为日志全进了远端收集器，或者被轮转策略悄悄丢了。

根因一句话：**Docker 只把容器里 PID 1 写进 stdout/stderr 的行当日志，而落盘的 json.log 默认没有上限**——写对了地方又没配「丢弃阀」，磁盘早晚爆；写错了地方，`docker logs` 一行都不给你。

所以本篇不先背驱动列表、不先抄配置模板。主线就一件事：**盯住同一个容器 `log-demo`**，亲眼看它的日志从 stdout 流到磁盘、再被轮转吃掉；最后抬头看整台机器的资源账单。日志和监控是容器「可运维」的底线，这一路滚完正好补齐。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 一个会打日志的容器 log-demo | `docker logs` 冒出 5 行 |
| **2** | 顺着 inspect 挖落盘文件 | `cat` 出每行一条的原始 JSON |
| **3** | 反例：写文件的日志看不见 | 一张 ASCII 图分清「写流」和「写文件」 |
| **4** | 读法三件套 `--tail`/`-f`/`--since` | 想看哪段看哪段 |
| **5** | 轮转配置（daemon 全局 + 容器级） | `LogConfig` 里出现 max-size/max-file |
| **6** | 极端参数 1k×2 实测轮转 | 2000 行只剩 16 行，磁盘上躺着两个文件 |
| **7** | 换日志驱动 `none` | `docker logs` 当场报错 |
| **8** | `stats` | 每个容器的 CPU/内存/网络账单 |
| **9** | `events` | 一行行看见容器的一生 |
| **10** | `system df` | 磁盘 1.9G 里 98% 可回收 |
| 🧗 | Prometheus 指标端点 | 只指路，实测放在第 28 篇 |

环境指纹：本机实测于 WSL2 Ubuntu-22.04 + Docker 29.x（daemon.json 已配全局轮转，雪球 5 会看到本机真实配置）。官方入口：[Logging 文档](https://docs.docker.com/engine/logging/)、[Configure logging drivers](https://docs.docker.com/engine/logging/configure/)。

---

## 雪球 1：起一个会打日志的容器，`docker logs` 第一眼

用 busybox 起个最简单的容器：循环打 5 行日志就退出。

```bash
docker run -d --name log-demo busybox sh -c 'i=0; while [ $i -lt 5 ]; do echo "log line $i"; i=$((i+1)); done'
docker logs log-demo
```

本机输出：

```text
log line 0
log line 1
log line 2
log line 3
log line 4
```

三件事值得停下看：

- `echo` 写的是 **stdout**——这就是它能被 `docker logs` 接住的唯一原因，雪球 3 会拿反例验证；
- 容器打完 5 行就退出了，但日志照样能读——说明**日志不在进程里，在磁盘上**，雪球 2 去把它挖出来；
- 你没进容器、没装任何工具，光凭 `docker logs` 就看到了全部输出。

这个 `log-demo` 就是本篇的主角，后面几球反复解剖它。

---

## 雪球 2：顺着 inspect 挖到磁盘上的原始日志

日志文件在哪，`inspect` 里写得明明白白：

```bash
docker inspect log-demo --format '{{.LogPath}}'
```

```text
/var/lib/docker/containers/cb460bb3.../cb460bb3...-json.log
```

路径规则：`/var/lib/docker/containers/<容器长ID>/<容器长ID>-json.log`。直接 `cat` 看原始内容（本机节选）：

```bash
cat /var/lib/docker/containers/cb460bb3.../cb460bb3...-json.log
```

```text
{"log":"log line 0\n","stream":"stdout","time":"2026-08-14T13:18:56.602382666Z"}
{"log":"log line 1\n","stream":"stdout","time":"2026-08-14T13:18:56.60292656Z"}
...
```

雪球 1 看到的 5 行，在磁盘上是 **5 条 JSON**，每条三个字段，立刻钉成表：

| 字段 | 装的什么 | log-demo 里的值 |
|------|----------|----------------|
| `log` | 原始一行的内容，连换行符 `\n` 一起收 | `"log line 0\n"` |
| `stream` | 从哪个流来 | `stdout` |
| `time` | Docker 收到这一行的时间戳 | `2026-08-14T13:18:56.602382666Z` |

这就是默认驱动 **json-file** 的存法：一行日志一条 JSON。`docker logs` 的本质就是读这个文件、剥掉 JSON 外壳只打印 `log` 字段——所以它快、不用 `exec` 进容器；但也因此**只对「写文件」类驱动有效**（雪球 7 会实测这个坑）。

---

## 雪球 3：反过来看——写进文件的日志，`docker logs` 为什么看不见

前两球都在看「被看见」的日志。现在反过来问：log-demo 凭什么被看见？就凭它写 stdout。**凡是绕开 stdout 的，Docker 一概不收**。把两条路画成一张图：

```text
容器里的应用进程
 ├── 写 stdout/stderr ──> Docker 接住 ──> logging driver ──> <id>-json.log   ✅ docker logs 可见
 └── 写 /var/log/app.log ──> 只是可写层里的普通文件                        ❌ docker logs 看不见
                                                                （轮转、读取都得自己想办法）
```

两个佐证：

- 往容器里的 `/var/log/app.log` 写文件，`docker logs` 一行没有——那只是[第 14 篇](/云原生/docker/docker-14-data-persistence/)讲过的可写层文件，想读到它只能靠挂载把目录暴露出来，轮转也得自己做；
- Nginx 这类天生写文件日志的软件，官方镜像都做了适配：`nginx` 镜像把 `/var/log/nginx/access.log` 软链到了 `/dev/stdout`——硬把「写文件」掰回「写流」，就是为了进左边那条路。

这套模型来自 [12-Factor](https://12factor.net/zh_cn/logs)：**应用只管往 stdout/stderr 打日志，收集、轮转、转发交给外面**。接日志的是容器里 **PID 1** 进程的两个流——PID 1 与容器生死绑定，[第 24 篇](/云原生/docker/docker-24-process-view/)会对照实验。

> 🔑 判断一个镜像日志姿势对不对，就看一条：`docker logs` 能不能看到它的业务日志。

---

## 雪球 4：想看哪段看哪段——`--tail` / `-f` / `--since` / `-t`

日志攒多了，全量翻不现实。四个读法（`web` 是当时一个日志量大的容器，换成 `log-demo` 一样用）：

```bash
docker logs -f web            # 跟随输出（tail -f 的感觉）
docker logs --tail 3 web      # 只看最后 3 行（实测输出：line 97/98/99）
docker logs --since 10m web   # 最近 10 分钟
docker logs -t web            # 显示时间戳
```

| 参数 | 干什么的 | 记法 |
|------|----------|------|
| `-f` | 挂住不动，新日志实时滚出来 | 排查「正在发生」的问题 |
| `--tail 3` | 只取最后 3 行 | 实测输出是 `line 97/98/99`——总量近百行时只取尾部三条 |
| `--since 10m` | 只取最近一段时间 | 支持 `10m`、`1h` 这类相对时间 |
| `-t` | 每行前补时间戳 | 补的正是雪球 2 JSON 里的 `time` 字段 |

> 先记一个现象：`--tail 3` 拿到的「最后 3 行」，未必是你印象里全部历史的最后 3 行——雪球 6 会亲眼看到日志被吃掉。

---

## 雪球 5：给 json.log 上「丢弃阀」——两级轮转配置

防开头那种磁盘事故的唯一手段就是**日志轮转**：限制单文件大小、限制保留份数。配置有两级。

**daemon 级**写在 `/etc/docker/daemon.json`，所有容器继承——本机的真实配置：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```

`log-driver` 指定默认驱动；`log-opts` 里 `max-size=10m` 是单文件上限，`max-file=3` 是最多保留 3 份——单个容器的日志顶格也就 30M 左右，涨不穿磁盘。

**容器级**用 `--log-opt` 覆盖全局（也可以写在 Compose 的 `logging:` 字段里，见[第 16 篇](/云原生/docker/docker-16-compose/)）：

```bash
docker run -d --log-opt max-size=10m --log-opt max-file=3 nginx
```

配置到底落没落，回头看主角 `log-demo`——它出生时就继承了 daemon 的全局配置：

```bash
docker inspect log-demo --format '{{json .HostConfig.LogConfig}}'
```

```text
{"Type":"json-file","Config":{"max-file":"3","max-size":"10m"}}    ← 本机 daemon 配了默认轮转，见雪球 5
```

`Type` 是驱动名，`Config` 就是轮转参数——和 daemon.json 里的两行对得上。

> ⚠️ 不配轮转 = 无限增长的 json.log，就是开头那种磁盘事故。**装完 Docker 第一件事建议就是把这两行写进 daemon.json**（本机就是这么做的）。
>
> 但 `10m × 3` 太温和，肉眼根本看不见轮转发生——雪球 6 用极端参数当场验证。

---

## 雪球 6：让轮转当场发生——2000 行只剩 16 行

这一球换个一次性实验容器 `rotate-demo`（极端参数不值得给主角用），把限制拉到最小：单文件 1k、保留 2 份，然后一口气打 2000 行：

```bash
docker run -d --name rotate-demo --log-opt max-size=1k --log-opt max-file=2 \
    busybox sh -c 'i=0; while [ $i -lt 2000 ]; do echo "aaaa... $i"; i=$((i+1)); done'
```

等它打完，去雪球 2 学过的那个目录看文件：

```bash
ls -lh /var/lib/docker/containers/75f0a584.../
```

```text
...-json.log       784B    ← 当前活跃文件
...-json.log.1    1008B    ← 轮转出来的旧文件（最多保留 max-file 份）
```

磁盘上正好两个文件——`max-file=2` 的效果，每个都没超过 1k。轮转的机制钉成一张图：

```text
max-file=2 时，磁盘上最多两个文件：

...-json.log      ← 活跃文件，写满 max-size 就被改名 ↓
...-json.log.1    ← 上一份；新的 .log 要进来时，它被顶掉删除

更旧的？已经没了——这就是轮转的「丢弃」
```

被丢弃的日志去哪了？问 `docker logs`：

```bash
docker logs rotate-demo | wc -l
```

```text
16
```

**2000 行只剩 16 行**——`docker logs` 读到的是轮转后幸存的内容。这行实测同时回答了「轮转会丢日志吗」：会，这正是它存在的目的（用有限磁盘换最近日志）。雪球 4 埋的现象也在此收口：`--tail` 的「最后几行」，只是**幸存者里的**最后几行。

---

## 雪球 7：日志不一定落本地——换个驱动当场翻车

json-file 只是十几种驱动之一（官方 [Logging 文档](https://docs.docker.com/engine/logging/)），按「日志去哪」分类：

| 驱动 | 去向 | 适用 |
|------|------|------|
| `json-file`（默认） | 本地 JSON 文件 | 单机、开发、小规模生产 |
| `local` | 本地二进制格式（**自带压缩、更省磁盘**） | 想要本地文件又要高密度保留 |
| `syslog` / `journald` | 系统日志服务 | 已有统一 syslog/journald 采集体系 |
| `fluentd` / `gelf` | 日志中间件（→ ES/Graylog/Loki） | 容器化日志平台 |
| `splunk` / `awslogs` / `gcplogs` | 商业/云厂商 | 对应平台托管 |
| `none` | **丢弃** | 不要日志（一次性任务） |

雪球 2 留的坑现在补上——「`docker logs` 只对写文件的驱动有效」是什么体验？起一个 `none` 驱动的容器试试：

```bash
docker run -d --name nolog-demo --log-driver none busybox sleep 30
docker logs nolog-demo
```

```text
Error response from daemon: configured logging driver does not support reading
```

报错说得直白：这个驱动**不支持读**。只有落本地的 `json-file`/`local` 支持 `docker logs`；日志一旦进了 fluentd/splunk，就得去对应平台查——**采集体系迁移前先想好排查路径**，别等出了事故才发现手里没有入口。

---

## 雪球 8：抬头看资源——`stats` 实时账单

看完单个容器的日志，抬头看整台机器。`--no-stream` 表示只出一张快照、不持续刷新：

```bash
docker stats --no-stream
```

```text
CONTAINER ID   NAME               CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
8bcc40336e87   rabbit2            0.33%     126.5MiB / 7.757GiB   1.59%     53.2MB / 57.1MB   36.2MB / 807kB    33
9a29fee69910   rabbit1            0.32%     126.2MiB / 7.757GiB   1.59%     68.7MB / 64.9MB   109MB / 831kB    33
183b75dfd378   rabbit3            0.29%     124.8MiB / 7.757GiB   1.57%     50.7MB / 58MB     16.9MB / 860kB    34
d4ebafc773e4   new-api            0.05%     23.57MiB / 7.757GiB   0.30%     5.14MB / 4.45MB   133MB / 0B        14
90f6c151295d   new-api-postgres   0.01%     47.05MiB / 7.757GiB   0.59%     4.17MB / 5.08MB   199MB / 19.5MB    7
1c507b876b7e   new-api-redis      0.21%     7.176MiB / 7.757GiB   0.09%     283kB / 55.7kB    13.5MB / 20.5kB   6
```

（本机真实负载：RabbitMQ 三节点集群 + 一个 Go 应用栈。）

先注意一个细节：`log-demo`、`rotate-demo` 都不在这张表里——它们打完日志就退出了，`stats` 默认只列**运行中**的容器。

逐列解读——每一列背后都是前面讲过的机制：

| 列 | 含义 | 背后机制 |
|------|------|------|
| CPU % | 占宿主机 CPU 的百分比 | cgroups CPU 统计（后文[第 21 篇](/云原生/docker/docker-21-cgroups/)） |
| MEM USAGE / LIMIT | 已用内存 / 上限（`-m` 没配就是宿主机内存） | cgroups memory；LIMIT 显示 7.757GiB = 没限额，**生产该配** |
| NET I/O / BLOCK I/O | 网络/块设备累计流量 | cgroups netcls/blkio |
| PIDS | 容器内进程/线程数 | cgroups pids（防进程炸弹） |

> 🔑 `MEM LIMIT` 等于宿主机总内存 = 这个容器没配 `-m`。用 stats 巡检时，**LIMIT 列就是限额检查表**。

---

## 雪球 9：容器的一生被记成了 5 行——`events`

`stats` 看状态，`events` 看动作。实时输出 daemon 的所有事件流（容器生命周期、镜像拉取、卷挂载……），过滤出容器类事件：

```bash
docker events --filter type=container --format '{{.Time}} {{.Action}} {{.Actor.Attributes.name}}'
# 另一个终端: docker run --rm --name evt-demo busybox echo hi
```

另一个终端一敲回车，这边滚出：

```text
1786713587 create evt-demo
1786713587 attach evt-demo
1786713588 start evt-demo
1786713589 die evt-demo
1786713589 destroy evt-demo
```

一行容器的一生，逐行读：

| 事件 | 含义 |
|------|------|
| `create` | 容器对象被建出来（还没跑） |
| `attach` | 日志流接上（正是雪球 2 看到的那条管道） |
| `start` | 容器启动 |
| `die` | 主进程退出 |
| `destroy` | 尸首没了——因为 `--rm`，退出即删除 |

最前面的 `1786713587` 是 Unix 秒级时间戳。排查「容器为什么没了」「谁重启了它」，先看 `events`；再配 `--since` 还能回溯已经发生过的历史。

---

## 雪球 10：磁盘都被谁占了——`system df`

监控三板斧的最后一把：磁盘账本。

```bash
docker system df
```

```text
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          7         5         1.916GB   1.897GB (98%)
Containers      7         6         53.25kB   4.096kB (7%)
Local Volumes   6         6         70.26MB   0B (0%)
Build Cache     0         0         0B        0B
```

四类对象各占多少、多少可回收：

- **Images 7 个 1.9G、98% 可回收**——存在大量未使用镜像，`docker image prune` 的时机判断就靠这张表；
- **Containers 的 SIZE 是可写层大小**（[第 14 篇](/云原生/docker/docker-14-data-persistence/)的知识）；
- **Local Volumes 的 RECLAIMABLE 是 0**——命名卷不算可回收（第 14 篇讲过为什么）。

一个容易漏的盲区：**这张表查不到开头那种 json.log 事故**——日志文件不计入任何一行。磁盘被日志吃掉时，还得回到雪球 2 的 `containers/<id>/` 目录去 `ls`。`system df` + `ls` 两个视角合起来，才算把磁盘看全。

---

## 🧗 再滚一步：把监控交给机器（第 28 篇）

`stats`/`events` 是人看的；机器采集走 daemon 的 **Prometheus 指标端点**：daemon.json 配 `"metrics-addr": ":9323"` 后，`/metrics` 暴露容器 CPU/内存/网络等全套指标，配 Prometheus + Grafana（或 cAdvisor）就是完整的容器监控体系。配置和实测放在[第 28 篇 daemon 运维](/云原生/docker/docker-28-daemon-ops/)（涉及 daemon 重启，正好一起讲）。主线到此可以跳过。

---

## 怎么记：命令对照哪一球

| 想干什么 | 命令 | 在哪一球用过 |
|------|------|------|
| 看日志 | `docker logs` / `-f` / `--tail` / `--since` / `-t` | 1、4 |
| 找日志文件 | `inspect --format '{{.LogPath}}'` | 2 |
| 看落盘格式 | `cat containers/<长ID>/<长ID>-json.log` | 2 |
| 看轮转配置 | `inspect --format '{{json .HostConfig.LogConfig}}'` | 5 |
| 配轮转 | daemon.json 的 `log-opts` / `--log-opt` | 5、6 |
| 换日志去向 | `--log-driver` | 7 |
| 看资源 | `stats --no-stream` | 8 |
| 看动作 | `events --filter type=container` | 9 |
| 看磁盘 | `system df` | 10 |

---

## 历史包袱

- **json-file 默认不轮转是长期现状**：官方默认配置一直没带上限，老教程也几乎不提——开头的磁盘事故就是这么攒出来的。所以「装完就写 daemon.json」是经验教训，不是多此一举。
- **更早的年代没有 `local` 驱动**（18.09 才加入，自带压缩）。那时教程的通用解法是「挂个卷把日志文件暴露出来、自己跑 logrotate」——如今按雪球 3 的原则把日志交回 stdout 更省心，老方案留着当历史语境看。
- **`docker events` 的正式命令路径是 `docker system events`**，`docker events` 是同一命令的短形式；老脚本里两种写法都会见到，别当成两个功能。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|------|----------------------|
| [第 14 篇](/云原生/docker/docker-14-data-persistence/) 持久化 | 雪球 3 写文件日志的挂载自救；雪球 10 可写层与卷的 RECLAIMABLE |
| [第 16 篇](/云原生/docker/docker-16-compose/) Compose | 雪球 5 的容器级轮转还能写进 `logging:` 字段 |
| [第 24 篇](/云原生/docker/docker-24-process-view/) 进程视角 | 雪球 3 的 PID 1 对照实验 |
| [第 21 篇](/云原生/docker/docker-21-cgroups/) CGroup | 雪球 8 stats 每一列的底层机制 |
| [第 28 篇](/云原生/docker/docker-28-daemon-ops/) daemon 运维 | 🧗 Prometheus 端点、daemon.json 的管理 |

---

## 小结

盯住 `log-demo` 一路滚下来，每次只加一种能力：

1. **一个会打日志的容器**：写 stdout，`docker logs` 就能看到；容器退了日志还在。
2. **json-file 落盘解剖**：`containers/<长ID>/<长ID>-json.log`，每行一条 JSON（`log`/`stream`/`time`）；`docker logs` 本质是读这个文件。
3. **第一原则**：只有 PID 1 的 stdout/stderr 会被收集；写文件日志 `docker logs` 看不见，nginx 官方镜像用软链掰回流。
4. **读法三件套**：`-f`/`--tail`/`--since`/`-t`，排查时按需取。
5. **轮转两级配置**：daemon.json 全局默认 + `--log-opt`（或 Compose `logging:`）容器级覆盖；`inspect LogConfig` 可验证。
6. **轮转实测**：1k×2 份下 2000 行只剩 16 行——轮转是有代价的丢弃，这正是它存在的目的。
7. **驱动家族**：换 `none` 后 `docker logs` 报「不支持读取」；只有 `json-file`/`local` 支持读取，迁移采集体系前先想好排查路径。
8. **stats**：资源实时账单，LIMIT 列就是限额检查表（没配 `-m` 会显示宿主机总内存）。
9. **events**：Docker 的审计日志，`create → attach → start → die → destroy` 一生可回溯。
10. **system df**：四类对象的磁盘账 + 可回收比例；但它不含 json.log，日志吃磁盘要回 `containers/` 目录查。

**思考题**：一个没配 `max-size` 的容器跑了两年后，你怎么安全地清理它的 json.log 而不影响业务？（提示：直接 `rm` 文件行不行？文件被进程持有后会怎样——`truncate` 和重启容器两种方案的差别。）

下一篇：[《Docker 技术底座——沿着「又轻又像一台机器」逐层解开 Namespace、Cgroups 与 UnionFS》](/云原生/docker/docker-19-tech-foundation)。

---

## 参考资料

- [Docker Docs · View logs for a container application](https://docs.docker.com/engine/logging/) — 驱动体系、默认行为
- [Configure logging drivers](https://docs.docker.com/engine/logging/configure/) — daemon.json/容器级配置、轮转参数
- [docker stats 参考](https://docs.docker.com/reference/cli/docker/container/stats/) / [docker events 参考](https://docs.docker.com/reference/cli/docker/system/events/)
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.x（daemon.json 全局轮转配置为本机真实内容）
