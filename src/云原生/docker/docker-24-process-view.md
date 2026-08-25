---
title: 进程视角看容器——容器里说 1 号，宿主机说 83125（师生对话实录）
sidebarGroup: Docker 系列
shortTitle: 24 进程视角看容器
order: 24
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - PID Namespace
  - 对话实录
description: 师生对话实录课：同一个 nginx，容器里 ps 是 PID 1、宿主机 docker top 是 83125——双编号、/proc 证据、exec 的爸爸是 shim、亲手杀掉 PID 1，实验全部 WSL 实机真跑。
---

> **Docker 系列 · 第 24/33 篇**
> 上一篇：[《Docker Daemon 与 runtime——一条 docker run 经过了谁的手》](/云原生/docker/docker-23-daemon-runtime) · 下一篇：[《容器安全——同一个容器，从 --privileged 全裸滚到最小权限》](/云原生/docker/docker-25-container-security)

---

## 写在前面

第 23 篇把 `docker run` 的调用链走完了。今天我在排查一个怪现象时顺手敲了两条命令，结果把自己整懵了：

```text
docker exec lab-proc ps -ef        → nginx master 是 PID 1
docker top lab-proc                 → 同一个 master 是 PID 83125
```

同一个 nginx，一个说 1 号、一个说 83125 号。**谁对？难道起了两个 nginx？** 顺着往下想还有一连串问题：`docker exec` 进去的进程算谁的孩子？容器里那个「1 号进程」被杀了会怎样？

所以继续用对话的老办法：**让 AI 当老师，我当学生，每课只讲一个概念，我有问题就打断，没问题就继续**。整场就围着**同一个 nginx 容器**，用「同一台机器、两种视角」把这些问题一个个钉死——每个结论都有本机 `/proc` 里的证据。

课程路线图（走到哪算哪）：

> ① 容器里看自己 → ② 宿主机看同一个 → ③ 为什么两个号都对 → ④ /proc 钉死「同一个进程」 → ⑤ 父子关系两边对照 → ⑥ exec 的爸爸是谁 → ⑦ 杀掉 PID 1 → ⑧ cgroup 归属 → ⑨ --pid=host 共享眼镜 → ⑩ 排障四步手册

环境：WSL2 Ubuntu-22.04（root）+ Docker Engine 29.1.3，引擎就在 WSL 里，所以**宿主机**一词本篇指 WSL 本身，root 可以直接翻 `/proc`。示例容器：`lab-proc`（nginx:alpine）、`lab-kill`（alpine:3.21）。官方入口：[docker top](https://docs.docker.com/reference/cli/docker/container/top/)、[docker run 的 `--pid` / `--init`](https://docs.docker.com/reference/cli/docker/container/run/)、[docker stop](https://docs.docker.com/reference/cli/docker/container/stop/)。

---

## 第 1 课：容器里看自己——nginx master 是 1 号进程

**🧑‍🏫 老师：**

先把实验对象跑起来：

```bash
docker run -d --name lab-proc nginx:alpine
docker ps --filter name=lab-proc
```

```text
3ebdadc4873e007f155eeb70ecc7c38bfa3bc037c78b11dd5580f94f27ac9b31
CONTAINER ID   IMAGE          STATUS        NAMES
3ebdadc4873e   nginx:alpine   Up 1 second   lab-proc
```

`3ebdadc4873e` 是完整容器 ID 的前 12 位——记住它，第 6、8 课还要跟它对暗号。

第一视角：**钻进容器里看自己**。我第一次跑的时候抓到了一个有趣的过渡态——刚起的瞬间，PID 1 还不是 nginx：

```text
PID   USER     TIME  COMMAND
    1 root      0:00 {docker-entrypoi} /bin/sh /docker-entrypoint.sh nginx -g daemon off;
   17 root      0:00 {docker-entrypoi} /bin/sh /docker-entrypoint.sh nginx -g daemon off;
   18 root      0:00 {10-listen-on-ip} /bin/sh /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
```

PID 1 是官方镜像的启动脚本 `docker-entrypoint.sh`。等几秒它忙完初始化，再 `ps -ef`：

```bash
docker exec lab-proc ps -ef
```

```text
PID   USER     TIME  COMMAND
    1 root      0:00 nginx: master process nginx -g daemon off;
   36 nginx     0:00 nginx: worker process
   37 nginx     0:00 nginx: worker process
   38 nginx     0:00 nginx: worker process
   39 nginx     0:00 nginx: worker process
   40 nginx     0:00 nginx: worker process
   41 nginx     0:00 nginx: worker process
   42 root      0:00 ps -ef
```

**PID 1 变成了 `nginx: master process`**——不是换了进程，是 entrypoint 脚本用 `exec` 把自己**替换**成了 nginx（同一个进程、同一个 1 号，命令行换了）。这个细节记住：「PID 1 是谁」是镜像设计出来的：`daemon off;` 这个参数就是故意让 master 别躲后台、老老实实当 1 号——1 号退了会怎样，第 7 课见。

容器视角钉成小图：

```text
容器视角（lab-proc 自己的 PID namespace）
PID 1      nginx: master process     ← 一号进程（root）
└─ PID 36~41  nginx: worker process  ← master 的孩子（nginx 用户）
```

在容器里看，这真像一台独立小机器：编号从 1 开始，master 是老大。你的 83125 之谜，就是从这张「太整齐的进程表」开始的。

> 一句话收口：**容器内 PID 1 是镜像设计出来的（entrypoint 最终 exec 成 nginx master）；worker 挂它下面，编号从 1 重新起算。**

---

## 第 2 课：换到宿主机看——同一个 master，编号 83125

**🧑‍🏫 老师：**

第二视角：**站在宿主机上看**。`docker top` 干的就是这件事：

```bash
docker top lab-proc
```

```text
UID                 PID                 PPID                C  STIME  TTY  TIME     CMD
root                83125               83102               0  16:56  ?    00:00:00  nginx: master process nginx -g daemon off;
systemd+            83238               83125               0  16:56  ?    00:00:00  nginx: worker process
systemd+            83239               83125               0  16:56  ?    00:00:00  nginx: worker process
…（共 6 个 worker）
```

还是那个 master，宿主机说它 PID 是 **83125**、PPID 是 **83102**。Docker 还给了官方换算口：

```bash
docker inspect -f '{{.State.Pid}}' lab-proc
```

```text
83125
```

**验收**：`State.Pid` = `docker top` 里 master 那行的 PID。两套号对上了：

| 视角 | nginx master | 怎么来的 |
|------|--------------|----------|
| 容器内 `ps` | PID **1** | 容器自己的 PID namespace |
| `docker top` / `State.Pid` | **83125** | 宿主机真实 PID |

顺带看一个耐人寻味的小细节：worker 那几行的 UID 显示 **`systemd+`**，容器里明明是 `nginx`。没出鬼——UID 是一串数字（这里是 101），两边拿**各自的用户库**去查名字：容器里 `/etc/passwd` 说 101 叫 nginx，宿主机说 101 叫 systemd-network（显示截断成 systemd+）。**人还是那个人，两边的花名册不同。**

还有 83125 的爸爸 83102 是谁——这条线索第 6 课揭晓，先挂着。

> 一句话收口：**`docker top` / `State.Pid` 给宿主机号，容器 `ps` 给容器号；inspect 就是那张官方换算表。**

---

## 插问 1：两个号，到底哪个是真的？是不是起了两个 nginx？

**🧑‍🎓 学生：** 一个说 1、一个说 83125——总有一个是「假」的吧？还是说我机器上真的跑了两个 nginx？

**🧑‍🏫 老师：**

都不是。**两个号都是真的，进程只有一个**——这正是 PID Namespace 的设计。

第 19、20 篇讲过 namespace 是「每进程一副眼镜」，PID namespace 是其中最反直觉的一副：它不是把进程藏起来，而是给**同一批进程准备了两套编号**——

```text
              同一个 nginx master 进程
             ↙                    ↘
    容器 PID ns 里的编号           宿主机 PID ns 里的编号
    PID 1                        PID 83125
```

为什么要有两套？因为「每个容器都有自己的 1 号」这件事太重要了——大量软件默认「我是 1 号进程」来决定行为（要不要后台化、怎么收信号、怎么收僵尸）。没有独立编号空间，八个容器挤在一张进程表里，谁的 1 号都不是 1 号。PID namespace 让每个容器**各自**从 1 编号，同时它们在宿主机那张「总表」里另有一个真实编号——**两套账本，记的是同一批人**。

所以排障时永远先问一句：「你说的是哪套号？」在容器里用 `ps`，在宿主机用 `docker top`，换算靠 `State.Pid`。至于「真的只有一个进程吗」——下一课直接去内核里翻证据。

> 一句话收口：**PID namespace = 两套编号记同一批进程；容器号从 1 起算给软件用，宿主机号是总账上的真实编号。**

---

## 第 3 课：拿 /proc 把「同一个进程」钉死

**🧑‍🏫 老师：**

光说「同一个进程」不算数，去内核的 `/proc` 里拿三个证据——每个进程在 `/proc/<宿主机PID>/` 下有个目录，root 可以直接翻（本机引擎就在 WSL 里，所以直接查；**Docker Desktop 用户**请注意：引擎在那台 Linux VM 里，Windows 上没有这个目录，要用第 9 课的 `--pid=host` 借道）：

```bash
tr '\0' ' ' < /proc/83125/cmdline; echo
ls -l /proc/83125/exe /proc/83125/ns/pid
```

```text
nginx: master process nginx -g daemon off;
lrwxrwxrwx 1 root root 0 Aug 25 16:56 /proc/83125/exe -> /usr/sbin/nginx
lrwxrwxrwx 1 root root 0 Aug 25 16:56 /proc/83125/ns/pid -> pid:[4026532940]
```

三行三个钉子：

- **`cmdline`**——83125 号的启动命令，和第 1 课容器里 `ps` 看到的 COMMAND **一字不差**。`tr '\0' ' '` 是把参数间的 NUL 分隔符换成空格（`cmdline` 是原样存的）；
- **`exe`**——这个进程跑的二进制就这一个：`/usr/sbin/nginx`。不是「容器里一份、宿主机一份」，磁盘上只有一份；
- **`ns/pid`**——`pid:[4026532940]`，这就是第 20 篇看过的「眼镜编号牌」：这个进程戴的 PID namespace 在内核里的实体是 4026532940 号 inode。容器里其它进程的 `ns/pid` 也是它；宿主机 init 进程的是另一个号——两副不同的眼镜，白纸黑字。

常用节点收成表（按需查，不必背）：

| 路径 | 含义 | 本课用处 |
|------|------|----------|
| `cmdline` | 启动命令 | 证明命令一致 |
| `exe` | 跑的二进制 | 证明只有一份 |
| `ns/pid` | 所属 PID namespace | 证明「独立编号空间」存在 |
| `cgroup` | 归属哪个 cgroup | 第 8 课 |

> 一句话收口：**cmdline、exe、ns/pid 三钉子：命令一致、二进制一份、眼镜编号牌是实体——「同一个进程」板上钉钉。**

---

## 第 4 课：把 worker 也对上——父子关系两边一个样

**🧑‍🎓 学生：** master 对上了。那容器里的 worker（36~41）和宿主机那 6 个 83238~83243，也一一对应吗？父子关系会不会两套编号下不一样？

**🧑‍🏫 老师：**

不用敲新命令，把第 1、2 课的输出并排读，专看 **PPID**：

```text
容器视角                          宿主机视角
PID 1      master               PID 83125 master（PPID 83102）
└─ PID 36~41  worker            └─ PID 83238~83243 worker（PPID 83125）
```

worker 的宿主机 PPID 是 **83125**——正是 master 的宿主机 PID。也就是说：容器里 worker 挂在 1 号下面，宿主机上 worker 挂在 83125 下面。**父子关系不随视角变，变的只有编号**——两棵树形状一模一样，只是换了号。这也好理解：进程还是那批进程、fork 关系还是那次 fork，编号只是两本账的记法。

还有一个**不对称**值得记下来：容器里的 `ps` 只看得到自己 namespace 里的进程，宿主机却看得到所有容器——`docker top` 看得见你，你看不见别人。**隔离是单向的**，原理（namespace 只往里隔离）在第 20 篇拆过。这也是为什么「从容器里排障」有死角，第 10 课的排障手册要两个视角来回切。

> 一句话收口：**两棵树形状一样、编号不同（1→36 对 83125→83238）；宿主看得见容器、容器看不见宿主，隔离单向。**

---

## 第 5 课：`docker exec` 再拉一个进程——它爸爸是谁？

**🧑‍🏫 老师：**

自然的新问题：用 `docker exec` 往容器里塞的进程，挂在这棵树的哪儿？塞一个 `sleep`（`-d` 后台跑）：

```bash
docker exec -d lab-proc sleep 2000
docker exec lab-proc ps -ef
```

```text
PID   USER     TIME  COMMAND
    1 root      0:00 nginx: master process …
   36 nginx     0:00 nginx: worker process
   …
   48 root      0:00 sleep 2000
   54 root      0:00 ps -ef
```

容器视角：sleep 拿到 PID **48**，和 master、worker 同在一张进程表里——exec 出的进程进了**同一个 PID namespace**。宿主机再看：

```bash
docker top lab-proc | grep sleep
```

```text
root   83578  83102  0  16:56  ?  00:00:00  sleep 2000
```

有意思的地方来了。对照表：

| | nginx master | sleep（exec 拉起） |
|--|--------------|-------------------|
| 容器内 PID | 1 | 48 |
| 宿主机 PID | 83125 | 83578 |
| 宿主机 PPID | **83102** | **83102** |

sleep 的宿主机 PPID 是 **83102**——和 master 的爸爸**同一个**，不是 83125！**它的爸爸不是容器里的 PID 1**。83102 到底是谁？查它的真身：

```bash
ps -o pid,ppid,args -p 83102
```

```text
    PID    PPID COMMAND
  83102       1 /usr/bin/containerd-shim-runc-v2 -namespace moby -id 3ebdadc4873e007f155eeb70ecc7c38bfa3bc037c78b11dd5580f94f27ac9b31 -address /run/containerd/containerd.sock
```

`containerd-shim-runc-v2`——命令行参数里的 `-id 3ebdadc4873e…` 正是 lab-proc 的**完整容器 ID**，对上了第 1 课记的暗号。宿主机进程树因此长这样：

```text
宿主机进程树（局部）
containerd-shim-runc-v2（PID 83102，PPID 1）
├─ nginx master（83125）    ← 容器内 PID 1
│   └─ 6 × worker
└─ sleep 2000（83578）      ← 容器内 PID 48，exec 拉起
```

master 和 exec 来的 sleep，在宿主机进程树上**都挂在这个 shim 下面**。

> 一句话收口：**exec 的进程进同一 namespace / cgroup，但宿主机上它的爸爸是 shim，不是容器 PID 1——一个容器一家公司，shim 是「母公司派驻的法人」。**

---

## 插问 2：shim 为什么存在？没有它会怎样？

**🧑‍🎓 学生：** 为什么要多这么一层？master 直接挂 dockerd 名下不行吗？

**🧑‍🏫 老师：**

不行，而且后果很实际：**没有 shim，daemon 一重启，你所有容器全部暴毙。**

想一下如果 master 的爸爸是 dockerd：daemon 升级 / 崩溃 / 重启时，它名下的所有子进程会怎样——孤儿被 init 收养是小事，关键是 daemon 重启后**再也接不回**这些容器（IO 管道断了、状态表丢了）。2016 年之前真是这样，Docker 1.11 引入 shim 就是为了解耦：

- **shim 是每个容器一个的「驻场代表」**：daemon 只负责下令（创建/删除），下完令就退场；陪伴容器终身的是这个小进程——管它的 stdin/stdout 管道、收集退出码、上报状态；
- **daemon 死了，shim 还在，容器照跑**。daemon 回来后顺着 shim 把容器重新「认领」回来。第 23 篇讲过的 live-restore 能力，物理基础就是这层垫片；
- exec 的进程也由它拉起——所以 sleep 的爸爸是 shim 而不是 master：**exec 是「管理面」的动作，不是容器里 master 主动 fork 的**。

一句话：**shim 把「容器的生命周期」和「daemon 的生命周期」解开了**。你在宿主机 `ps` 里看到的 `containerd-shim-runc-v2 -id <容器ID>`，一眼就能认出哪个容器归它管。

> 一句话收口：**shim = 每容器一个的驻场垫片，daemon 死活与容器解耦；exec 是管理面动作，所以爸爸是 shim。**

---

## 第 6 课：杀掉容器里的 PID 1——容器当场没了

**🧑‍🏫 老师：**

开头攒的最后一个问题：动 1 号会怎样？nginx master 不好单独摆弄，另起一个主进程就是 `sleep` 的容器，1 号看得明明白白：

```bash
docker run -d --name lab-kill alpine:3.21 sleep infinity
docker exec lab-kill ps -ef
```

```text
PID   USER     TIME  COMMAND
    1 root      0:00 sleep infinity
    7 root      0:00 ps -ef
```

PID 1 就是 `sleep infinity` 本人。现在用第 2 课的换算口拿到宿主机号，直接杀它：

```bash
docker inspect -f '{{.State.Pid}}' lab-kill
# → 83910
kill -9 83910
docker ps -a --filter name=lab-kill
docker inspect lab-kill --format 'Status={{.State.Status}} OOMKilled={{.State.OOMKilled}} ExitCode={{.State.ExitCode}}'
```

```text
NAMES      STATUS
lab-kill   Exited (137) 37 seconds ago
Status=exited OOMKilled=false ExitCode=137
```

容器没了，退出码 **137**——第 21 篇见过的公式：**137 = 128 + 9（SIGKILL）**，和我们发的 `kill -9` 正好对上（`OOMKilled=false` 排除了 OOM，就是被我们杀的）。

把「停止容器」的信号真相一次说全（依据官方 [stop 参考](https://docs.docker.com/reference/cli/docker/container/stop/)）：

| 动作 | 实际发生什么 |
|------|--------------|
| `docker stop` | 给**容器内 PID 1** 发 SIGTERM，默认等 10 秒，没退再 SIGKILL |
| `docker kill` | 直接 SIGKILL，没有商量 |
| 本课的 `kill -9 宿主机PID` | 效果同 SIGKILL，但**绕过了 Docker 管理面**——仅实验用 |

核心规律：**容器生命周期与容器内 PID 1 绑定**。PID 1 退出，容器结束，同 namespace 里的其它进程被内核一并清掉。日常请用 `docker stop` / `docker kill`，别在宿主机乱杀——这里只为看清关系。

补一句背景：正因为 PID 1 位置特殊（收信号、回收子进程都和普通进程不一样），有些镜像让 init 程序（如 tini）当 1 号，`docker run --init` 就是让 Docker 替你垫一个——第 21 篇「僵尸占坑」的坑，它就是解药。

> 一句话收口：**容器生死绑定容器内 PID 1；stop 是 SIGTERM→10 秒→SIGKILL，kill 直接 SIGKILL，137 = 128+9。**

---

## 插问 3：docker stop 为什么要傻等 10 秒？

**🧑🎓 学生：** 既然 SIGKILL 一刀就行，stop 还要先发 SIGTERM 等 10 秒——多慢啊。直接 `docker kill` 不是更利索？

**🧑‍🏫 老师：**

利索和体面是两回事。两种信号的本质区别：

- **SIGTERM 是「请你收尾」**：进程收到后可以做完该做的事——flush 缓冲、落盘、关连接、通知依赖方——然后自己退出。数据库优雅停机、应用处理完手头请求，靠的都是它；
- **SIGKILL 是「当场蒸发」**：内核直接回收进程，**进程没有任何机会执行任何代码**。正在写的文件可能写一半，连接对端收到的是断崖。

stop 的 10 秒就是在等「体面」：先给 PID 1 发 SIGTERM 请它收尾；它收完尾自己退出，完美；10 秒还不退（写死了、卡住了），说明已经没能力体面了，这才补一刀 SIGKILL。**先礼后兵，礼的时间窗默认 10 秒**（`-t` 可改）。

所以选型：日常停止用 stop（给应用机会收尾）；确认进程已死锁、或 CI 里不在乎干净退出，才用 kill。生产上最常见的翻车是反过来的——**应用没处理 SIGTERM**（比如 shell 脚本当 entrypoint 不转发信号），10 秒白等，每次停止都被 SIGKILL 掐死，还以为 stop「本来就慢」。这就是很多镜像垫 tini 的原因。

> 一句话收口：**stop 的 10 秒是给 PID 1 处理 SIGTERM 收尾的窗口；应用不接信号就每次都白等然后被杀——治本靠 --init 或应用自己接 SIGTERM。**

---

## 第 7 课：资源账单也挂着这个容器——cgroup 一眼

**🧑🎓 学生：** 进程的两套编号和父子关系都清楚了。这个 nginx 的资源账单（CPU、内存限额）挂在哪？第 21 篇说每个容器一个 cgroup 档案袋，能从进程这儿直接看到吗？

**🧑‍🏫 老师：**

能，还是 `/proc`——每个进程的 `cgroup` 文件记着它属于哪个袋子：

```bash
cat /proc/83125/cgroup
```

```text
0::/system.slice/docker-3ebdadc4873e007f155eeb70ecc7c38bfa3bc037c78b11dd5580f94f27ac9b31.scope
```

开头 `0::` 是 cgroup v2 统一层级的写法（第 21 课讲过）；路径里那串长十六进制就是**完整容器 ID**——和第 1 课记的 `3ebdadc4873e` 对上了。**从宿主机随便一个进程号，一步就能查到它属于哪个容器**——「这进程是谁家的」排查口诀就是它。exec 进来的 sleep（83578）`cat` 一下也是同一个袋子——所以它的资源消耗和限额，都算在 lab-proc 头上。

（老教程里 `/sys/fs/cgroup/memory/docker/<id>/` 那种路径是 v1 布局，v2 机器上别照抄——第 21 篇历史包袱有对照表。）

> 一句话收口：**`/proc/PID/cgroup` 一步查出「这个进程属于哪个容器」；exec 的进程同袋，账单一起算。**

---

## 第 8 课：`--pid=host`——跟宿主机共用一副眼镜

**🧑‍🎓 学生：** 第 4 课说容器看不到宿主机进程。那有没有办法让容器「看见」宿主机的进程表？我记得老师你在 Desktop 用户那儿提过一嘴。

**🧑‍🏫 老师：**

有，就是 `--pid=host`——**不给这个容器发新眼镜，让它直接戴宿主机那副**。先看默认行为：

```bash
docker run --rm alpine:3.21 ps -ef
```

```text
PID   USER     TIME  COMMAND
    1 root      0:00 ps -ef
```

普通容器里 `ps -ef` 只看到它自己（PID 1 就是这条 ps 自己——连个 1 号进程的「常驻」都没有）。换 `--pid=host`：

```bash
docker run --rm --pid=host alpine:3.21 ps -ef | grep -E 'PID|83102|83125' 
```

```text
PID   USER     TIME  COMMAND
83102 root      0:00 /usr/bin/containerd-shim-runc-v2 -namespace moby -id 3ebdadc4873e…-address /run/containerd/containerd.sock
83125 root      0:00 nginx: master process nginx -g daemon off;
```

宿主机的进程表直接可见——编号就是宿主机那套（83125 不用换算了，一眼就是它）。两个用途：

- **排障与观测**：在容器里用宿主机视角看进程（Docker Desktop 用户没有宿主 shell 时，这是翻引擎 `/proc` 的标准姿势——第 3 课的三个钉子，在 `--pid=host` + `--privileged` 的临时容器里一样能查）；
- **Sidecar 模式**：监控 agent（如 node-exporter、cadvisor 类）需要看到全机进程才有意义。

风险也要说明白：**这是把隔离拆了一角**——看到宿主机进程表意味着能拿到所有进程的 PID，配合其它手段（`--privileged` 之类的权限滥用）攻击面直接扩大。所以 `--pid=host` 只给可信的工具容器用，不进业务镜像。信号旗标一族还有 `--network=host`、`--ipc=host`，思路同款：**不建新 namespace、共用宿主的那副**，用到时举一反三。

> 一句话收口：**`--pid=host` = 不发新眼镜、共用宿主 PID 视图；排障观测利器、业务容器禁用。**

---

## 第 9 课：收成——排障四步手册

**🧑‍🏫 老师：**

最后把整场对话收成四步，下次「容器里进程不对劲」直接照抄（以 lab-proc 为例）：

```bash
# 1. 容器内看见什么（内视角）
docker exec lab-proc ps -ef

# 2. 宿主机 PID 对照（外视角 + 官方换算口）
docker top lab-proc
docker inspect -f '{{.State.Pid}}' lab-proc

# 3. /proc 核实（cmdline / exe / ns/pid；进程是哪一个、哪副眼镜）
ls -l /proc/83125/exe /proc/83125/ns/pid
cat /proc/83125/cgroup          # 顺带：属于哪个容器

# 4. 父进程是不是 shim（进程树归谁管）
ps -o pid,ppid,args -p 83102
```

四步对应的正是前面各课：**容器内看什么**（第 1 课）→ **宿主机几号**（第 2 课）→ **内核里对不对得上**（第 3、7 课）→ **它爸爸是谁**（第 5 课）。Docker Desktop 用户把第 3、4 步放进 `--pid=host --privileged` 的临时容器里跑（第 8 课）。

记不住命令就记问题链：**容器里看到啥 → 宿主上是几号 → 内核对不对得上 → 它爸爸是谁**。

> 一句话收口：**排障四步 = 内视角 → 外编号 → /proc 证据 → 父进程身份；一条问题链走完，容器进程的「户口」就查清了。**

---

## 历史包袱：两处老资料别照抄

1. **「容器进程的父进程是 dockerd」**。Docker 1.11（2016）引入 containerd-shim 之前确实如此；如今实测父进程是 `containerd-shim-runc-v2`（第 5 课 83102 的输出为证）。老博客的进程树图已经过时。
2. **cgroup v1 老路径**。`/sys/fs/cgroup/memory/docker/<id>/` 是 v1 布局；本机第 7 课输出是 `0::` 开头的 v2。判断方法就一条：`cat /proc/PID/cgroup`，以本机实际输出为准（第 21 篇有完整新旧对照表）。

---

## 和系列其它篇的分工

| 你想搞清楚的事 | 去哪篇 | 在这条路上出现的位置 |
|----------------|--------|----------------------|
| exec / attach / nsenter 怎么选 | [第 7 篇](/云原生/docker/docker-07-enter-container) | 第 5 课的 `exec -d` |
| Namespace 隔离原理 | [第 20 篇](/云原生/docker/docker-20-namespace) | 插问 1、第 3、4 课 |
| Cgroups 限资源 | [第 21 篇](/云原生/docker/docker-21-cgroups) | 第 7 课的袋子 |
| dockerd → containerd → shim → runc | [第 23 篇](/云原生/docker/docker-23-daemon-runtime) | 插问 2 的垫片 |
| 技术底座总览 | [第 19 篇](/云原生/docker/docker-19-tech-foundation) | 前置：三张视图一道限额 |
| 容器安全 | [第 25 篇](/云原生/docker/docker-25-container-security)（下一篇） | 第 8 课 `--pid=host` 的风险面 |

---

## 小结

同一台机器、两种视角，十课收账：

1. **容器内**：PID 1 是镜像设计的（entrypoint 最终 exec 成 nginx master），worker 挂下面。
2. **宿主机**：`docker top` / `State.Pid` 说它是 83125；UID 两边名字不同（nginx vs systemd+），人还是那个 uid。
3. **PID Namespace**：两套编号记同一批进程；排障先问「哪套号」。
4. **/proc 三钉子**：cmdline 一致、exe 一份、ns/pid 是眼镜实体——「同一个进程」钉死。
5. **父子关系**：两棵树形状一样（1→36 对 83125→83238）；隔离单向，宿主看得见你、你看不见宿主。
6. **exec 的爸爸**：进同一 namespace / cgroup，宿主机上父进程是 shim（83102），不是 PID 1。
7. **shim**：每容器一个驻场垫片，daemon 与容器生命周期解耦。
8. **杀 PID 1**：容器当场 `Exited (137)`；stop 是 SIGTERM→10 秒→SIGKILL；应用要会接 SIGTERM。
9. **cgroup 归属**：`/proc/PID/cgroup` 一步查「这进程属于哪个容器」；`--pid=host` 可共享宿主视角（排障利器、业务慎用）。
10. **排障四步**：内视角 → 外编号 → /proc 证据 → 父进程身份。

**思考题**：

1. 两个容器各有一个「PID 1」，宿主机上会撞号吗？用插问 1 的两本账模型推一推（提示：每本「容器账」独立从 1 记，宿主机总账从不重号）。
2. `docker exec` 进去的进程被 `kill -9` 了，容器会退出吗？（提示：第 6 课的绑定关系绑的是谁。）

下一篇：[《容器安全——同一个容器，从 --privileged 全裸滚到最小权限》](/云原生/docker/docker-25-container-security)。

---

## 本篇实验清理（可照抄）

```bash
docker rm -f lab-proc lab-kill
```

---

## 参考资料

- [docker top（CLI 参考）](https://docs.docker.com/reference/cli/docker/container/top/)
- [docker container run（`--pid`、`--init`）](https://docs.docker.com/reference/cli/docker/container/run/)
- [docker container exec](https://docs.docker.com/reference/cli/docker/container/exec/)
- [docker container stop（SIGTERM / SIGKILL、默认 10 秒）](https://docs.docker.com/reference/cli/docker/container/stop/)
- [pid_namespaces(7)](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html)、[proc(5)](https://man7.org/linux/man-pages/man5/proc.5.html)
- 本机：WSL2 Ubuntu-22.04 + Docker Engine 29.1.3
