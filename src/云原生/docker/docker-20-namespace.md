---
title: Namespace 隔离——从一个容器里的怪现象滚穿六大命名空间
sidebarGroup: Docker 系列
shortTitle: 20 Namespace 隔离
order: 20
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Namespace
  - 对话实录
description: 师生对话实录课：0 基础学生与教学大师的 Linux Namespaces 逐字稿。从一个容器里的怪现象（进程表两行、PID 从 1 编号、hostname 换了）出发，逐个拆穿 PID/UTS/IPC/NET/MNT/USER 六大命名空间，最后用 /proc 的 inode 一把尺量出谁隔离谁共享。实验全部 WSL2 + Engine 29.1.3 实机真跑。
---

> **Docker 系列 · 第 20/33 篇**
> 上一篇：[《Docker 技术底座——容器凭什么又轻又像一台机器（师生对话实录）》](/云原生/docker/docker-19-tech-foundation) · 下一篇：[《CGroups 限资源——给同一个容器逐项上枷锁》](/云原生/docker/docker-21-cgroups)
>
> 阶段 6「内幕」的第二篇：上一篇立起了 Namespace/Cgroups/UnionFS 三根支柱的总框架，这篇把第一根支柱拆到分子级——隔离的另一半「限额」在下一篇 CGroups。

---

## 写在前面

第 19 篇讲了容器技术的三根支柱，我对着 Namespace 那根想了很久，还是觉得它是魔法：排障时 `docker exec` 进容器，`ps` 出来只有两行，业务进程的 PID 居然是 **1**；hostname 不是宿主机的名字；`ls /` 底下的目录眼熟，内容却全是镜像自带的。再开一个容器 B，它也有自己的 PID=1——可宿主机上 PID 是全局唯一编号的，**Docker 又不是虚拟机**，没有第二套内核，哪来的第二个「1 号进程」？

所以这篇继续用老办法：**让 AI 当老师，我当学生，每课只讲一个概念，我有问题就打断，没问题就继续**。整篇只用一个容器 `ns-lab`：先把怪现象一个个记下来，再用命令逐个拆穿——每讲一课，拆穿一个。

课程路线图（走到哪算哪）：

> ① 三个「不一样」 → ② 容器 1 号的真身（NSpid） → ③ clone()：隔离是创建那一刻给的 → ④ UTS 主机名 → ⑤ IPC 藏队列 → ⑥ NET 网络屋子 → ⑦ MNT 另一张挂载表 → ⑧ 换根 pivot_root → ⑨ USER：容器 root 是不是宿主 root → ⑩ 一把尺量全部

环境：WSL2 Ubuntu-22.04（root）· Docker Engine 29.1.3 · busybox:latest · iptables v1.8.7（legacy）。全部输出为本机 2026-08-25 实跑。`/proc` 档案室的用法、亲手 `unshare` 出 namespace 的最小实验，在 [Linux 基础第 1 篇](/Linux/basics/linux-01-nsenter-prerequisites)；官方权威是 [namespaces(7) 手册](https://man7.org/linux/man-pages/man7/namespaces.7.html)。

---

## 第 1 课：进容器，撞见三个「不一样」

**🧑‍🏫 老师：**

魔法要用魔术揭秘的顺序看：先看清观众看见了什么，再找手法。先看宿主机本来的样子：

```bash
hostname
ps -ef | wc -l
ps -ef | head -5
```

```text
pc3507
1393
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 14:19 ?        00:00:02 /sbin/init
root           2       1  0 14:19 ?        00:00:00 /init
root           9       2  0 14:19 ?        00:00:00 plan9 --control-socket 7 --log-level 4 --server-fd 8 --pipe-fd 10 --log-truncate
root          81       1  0 14:19 ?        00:00:00 /lib/systemd/systemd-journald
```

宿主机 1393 个进程；PID 1 是 `/sbin/init`（systemd，万进程之祖）。两处环境细节：本机是 WSL，所以 PID 2 是 `/init`、9 号是 plan9（WSL 特有的 9P 文件系统服务）——普通发行版上 2 号常是 `kthreadd`；1393 这个数偏大是因为我这台机器上正跑着一堆活儿，普通服务器几百行很常见。都不影响结论。

现在请出本篇主角，进它肚子里看同样的三样：

```bash
docker run -d --name ns-lab busybox sleep 600
docker exec ns-lab ps -ef
docker exec ns-lab hostname
docker exec ns-lab ls /
```

```text
a2e75a7299b37f4bddfec2ba0888764accab31915b317c57f0fcf15a582695ec
PID   USER     TIME  COMMAND
    1 root      0:00 sleep 600
    7 root      0:00 ps -ef
a2e75a7299b3
bin dev etc home lib lib64 proc root sys tmp usr var
```

三个「不一样」当场齐了：

| 现象 | 宿主机 | 容器 ns-lab |
|------|--------|-------------|
| 进程表 | 1393 个 | 2 个（sleep + 你敲的 ps） |
| PID 1 | `/sbin/init` | **你起的 `sleep 600`** |
| hostname | `pc3507` | `a2e75a7299b3` |

细节别放过：第一行长十六进制是 `docker run` 返回的**容器 ID**，hostname `a2e75a7299b3` 正是它的**前 12 位**——Docker 默认拿容器 ID 当主机名。进程表里的 7 号是 `exec` 派进来的 `ps` 自己。还有第四个不一样：`ls /` 装的是 busybox 镜像的内容，宿主机 `/etc` 里的东西一样看不到。

四个现象分别压在 PID（进程表+PID 1）、UTS（hostname）、MNT（根目录）三类 namespace 上。今天的路线就是逐个拆穿。先记总纲：**容器不是新机器，而是「创建进程那一刻被换过视图的普通进程」**——同一张内存、同一个内核，它翻的每册「资源清单」都是单独印的。这个「清单」就是 Linux Namespaces。

一句话总结本课：

> **进程表、hostname、根目录三样全变了——不是换了机器，是有人给这个进程换了一套「看系统的眼睛」。**

---

## 第 2 课：容器里的 1 号进程，在宿主机上是谁？

**🧑‍🏫 老师：**

先拆最大的怪：两个 1 号。破案起点是一个事实：**内核只维护一张真的进程表**——就是宿主机这张。容器里的进程全在里面躺着，`sleep 600` 也不例外，只是编号不同。Docker 知道它的真身：

```bash
docker inspect -f '{{.State.Pid}}' ns-lab
```

```text
68973
```

拿这个号回宿主机查档案：

```bash
ps -o pid,ppid,user,args -p 68973
grep NSpid /proc/68973/status
docker top ns-lab
```

```text
    PID    PPID USER     COMMAND
  68973   68949 root     sleep 600
NSpid:	68973	1
UID    PID    PPID  C STIME TTY  TIME CMD
root  68973  68949  0 16:31  ?   00:00:00  sleep 600
```

逐行拆：

- `ps`：同一个 `sleep 600`，在宿主机这张真进程表里是 **68973**，爹是 68949；
- `NSpid: 68973 1`：**一行两个号——同一进程在两层 PID namespace 里的编号**，宿主层 68973、容器层 1；
- `docker top`：Docker 干的就是刚才的手工活——拿容器进程在宿主机上的真实 PID，用宿主机视角列给你看。

那个爹 68949 是谁？`ps -o pid,args -p 68949`：

```text
    PID COMMAND
  68949 /usr/bin/containerd-shim-runc-v2 -namespace moby -id a2e75a7299b37f4bddfec2ba0888764accab31915b317c57f0fcf15a582695ec -address /run/containerd/containerd.sock
```

是 **containerd-shim**——容器进程在宿主机上的「监护人」，`-id` 正是容器 ID（跟 hostname 同源）。shim 为什么存在，是[第 24 篇](/云原生/docker/docker-24-process-view)的主菜，这里先认脸。

开头「两个容器都有 PID 1」的答案钉成小模型：

```text
宿主机进程表（唯一一张真的）
  1 /sbin/init
  ...
  68949 containerd-shim ... -id a2e75a...
  └─ 68973 sleep 600        ← 容器 ns-lab 的 PID 1
        │
        │  容器内视图：编号从 1 重新来
        ▼
  容器 A 看到的：1 sleep 600     容器 B 看到的：1 redis-server
  （互相看不见，也看不见 68973）
```

**容器内进程对宿主机其他进程一无所知；反过来，站在 namespace 外，通过 `/proc` 或 `docker top` 仍能看到容器内进程的真实 PID**——隔离是「视图单向变窄」，不是把进程搬走。

一句话总结本课：

> **内核只有一张真进程表；容器里的 1 = 宿主机的 68973，`NSpid` 一行两个号就是双视图的铁证。**

---

## 插问 1：第二套编号是谁「印」出来的？总不能凭空生一张表

**🧑‍🎓 学生：** 你说容器里那张进程表是「单独印的一册清单」——印刷厂在哪？内核总不能给每个容器真复制一份进程描述符吧，那多浪费。

**🧑‍🏫 老师：**

问到根上了。答案是**没有第二张表，只有第二套编号**。Linux 创建进程的系统调用是 `clone()`：

```c
int clone(int (*fn)(void *), void *child_stack,
          int flags, void *arg, ...);
```

平时用的 `fork()` 在 Linux 内部走的就是它。关键是第三个参数 **flags**：传入 `CLONE_NEWPID` 时，内核给新进程发一套**独立 PID 空间**——此后这个进程及其后代看到的编号都从新空间发号（它自己是 1），但 `task_struct` 还是躺在那张唯一的真表里。第 1 课的三个怪现象同源：`CLONE_NEWUTS` 给独立主机名册、`CLONE_NEWNET` 给独立网络栈、`CLONE_NEWNS` 给独立挂载表……八种 flag 的全家福第 10 课放。

Docker 在 `docker run` 时创建 OCI Spec（容器怎么造的标准说明书），把各类 namespace 写进去，交给 `containerd` → `runc` 落地。你在命令行能摸到的开关是 `--pid`，三档：

- **默认**：新建 PID namespace（今天的 ns-lab）；
- **`--pid=host`**：与宿主机共享 PID namespace；
- **`--pid=container:<名>`**：与指定容器共享（还记得[第 15 篇](/云原生/docker/docker-15-network)的 `--network container:` 吗？同一个思路）。

一句话收口：

> **隔离的成本低得惊人——不是复制资源，是创建进程时多传一个 flag，让内核给这个进程换一套「发号的账本」。**

---

## 第 3 课：--pid=host——把开关当场关掉

**🧑‍🏫 老师：**

插问 1 的说法空口无凭，把隔离当场关掉试试——同一个 busybox 镜像，只多一个参数：

```bash
docker run --rm --pid=host busybox ps -ef
```

```text
    1 root      0:02 {systemd} /sbin/init
    2 root      0:00 {init-systemd(Ub} /init
    9 root      0:00 {init} plan9 --control-socket 7 --log-level 4 --server-fd 8 --pipe-fd 10 --log-truncate
   81 root      0:00 /lib/systemd/systemd-journald
  118 root      0:01 /lib/systemd/systemd-udevd
```

init、journald、udevd——宿主机全家都在。（花括号里是内核记账用的进程短名 comm，不是花屏。）

因为 `--pid=host` 少给了 `CLONE_NEWPID`，**这个孩子直接生在宿主机的 PID namespace 里**。对照第 1 课的 ns-lab：同一个镜像，看到的进程表完全两个世界——差别只在创建那一刻给不给某个 flag。隔离不是容器的固有魔法，是一串可以拆装的开关。

什么时候真的需要开它：容器里的诊断工具要看全机进程（比如 node-exporter 这类监控agent）。代价也明显——看得到就意味着可能 `kill` 得到，非必要不开。

一句话总结本课：

> **`--pid=host` = 不发 `CLONE_NEWPID`；隔离是开关，不是结界。**

---

## 第 4 课：UTS——hostname 自己一册

**🧑‍🏫 老师：**

第 1 课的第二个现象。三种玩法摆在一起，一次跑完：

```bash
docker exec ns-lab hostname
docker run --rm --uts=host busybox hostname
docker run --rm --hostname ns20-uts busybox hostname
```

```text
a2e75a7299b3
pc3507
ns20-uts
```

| 命令 | 结果 | 原因 |
|------|------|------|
| 默认容器 | `a2e75a7299b3`（容器 ID 前 12 位） | 新建 UTS ns，Docker 顺手把 hostname 设成容器 ID |
| `--uts=host` | `pc3507`，和宿主机一模一样 | 共享宿主机的 UTS ns，没发 `CLONE_NEWUTS` |
| `--hostname ns20-uts` | 你起的名字 | 还是新建 UTS ns，只是 hostname 换成你指定的 |

**UTS namespace（flag `CLONE_NEWUTS`）隔离的就是主机名和 NIS 域名**这两样「机器身份」。它是最不起眼的一类，但不是没用：很多软件拿 hostname 当配置键、当集群成员名——同一台宿主机上几十个容器若共用一个 hostname，光看日志就没法分辨谁是谁。

hostname 具体写在容器里哪个文件？

```bash
docker exec ns-lab cat /etc/hostname
```

```text
a2e75a7299b3
```

Docker 把它写进了容器 `/etc/hostname`。这个文件是怎么「塞」进容器的？先按下不表——第 7 课的挂载表里有它的下落。

一句话总结本课：

> **UTS 隔离的是「机器身份牌」；默认 = 容器 ID 前 12 位，`--hostname` 可改，`--uts=host` 可拆。**

---

## 第 5 课：IPC——造一个，藏一个

**🧑‍🏫 老师：**

第三类 namespace 平时最难见到实物：**IPC**（进程间通信——System V 的消息队列、信号量、共享内存，外加 POSIX 消息队列）。它的验证思路是「造一个再藏一个」。先在宿主机上建一条 SysV 消息队列：

```bash
ipcmk -Q && ipcs -q
```

```text
Message queue id: 0

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
0xcb02325c 0          root       644        0            0
```

队列建好了：id 0、key `0xcb02325c`。再进容器看同一张表：

```bash
docker exec ns-lab ipcs -q
```

```text

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
```

表头之下空空如也——宿主机明明刚建了一条 msqid=0 的队列，容器里就是看不见。**IPC namespace（flag `CLONE_NEWIPC`）隔离 System V IPC 和 POSIX 消息队列**：容器里的进程用不了宿主机（以及其他容器）的队列、信号量、共享内存，各玩各的。

收工清理，顺便交个底——我清理时敲反过一次：

```bash
ipcrm -q 0        # 删 id=0 的队列，成功
```

`ipcrm -q` 接的是 **id**、`ipcmk -Q` 建的是队列（大写 Q）——`ipcrm -Q` 接的是 key。第一次我顺手写了 `ipcrm -Q 0`（把 0 当 key），队列纹丝不动，重敲 `-q` 才删掉。命令行里大小写不是装饰。

一句话总结本课：

> **IPC namespace 隔离进程间通信的那几样「公用设施」；宿主建、容器看不见，一藏一个准。**

---

## 第 6 课：NET——一间独立的网络屋子

**🧑‍🏫 老师：**

最值钱的一类：网络。默认每个容器都有**独立 Network Namespace（flag `CLONE_NEWNET`）**——一间独立的「网络屋子」，屋里网卡、路由表、端口、防火墙规则全是自己的：

```bash
docker exec ns-lab ip -o addr
docker exec ns-lab ip route
```

```text
1: lo    inet 127.0.0.1/8 scope host lo
1: lo    inet6 ::1/128 scope host lo
2: eth0    inet 172.17.0.5/16 brd 172.17.255.255 scope global eth0
default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 scope link  src 172.17.0.5
```

屋里只有两块网卡：`lo` 回环 + `eth0`（172.17.0.5/16）；路由两条：默认网关 `172.17.0.1` 从 eth0 出去。宿主机上可远不止这点东西。

那容器的 eth0 是谁给的？Docker 做的三件事（[第 15 篇](/云原生/docker/docker-15-network)整篇在讲，这里只对证据）：造 **docker0** 虚拟网桥、给容器分 IP 网关、造一对 **veth** 虚拟网线——一端塞进容器当 `eth0`，一端插在 docker0 上。到宿主机侧对证据：

```bash
ip -4 addr show docker0 | grep inet
docker exec ns-lab ip link show eth0 | head -1
ip -o link show | grep '^203:'
```

```text
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
2: eth0@if203: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue
203: vethb989fd4@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP
```

三条对上了：docker0 的 IP `172.17.0.1` 正是容器路由表里那条 default via 的网关——**网关就是网桥本身**；容器里 `eth0@if203` 的 `@203` 指着宿主机的 203 号设备，宿主机 `203: vethb989fd4@if2` 的 `@2` 又指回容器里的 2 号——**一根 veth 网线两头当场对上**，`master docker0` 说明宿主这头插在网桥上。

一句话总结本课：

> **NET namespace = 一间独立网络屋子；docker0 是网关交换机，veth 是穿墙网线——屋里独立，墙外连通。**

---

## 插问 2：屋子隔成这样，外面的请求怎么打得进去？

**🧑‍🎓 学生：** 屋子独立到连端口都是自己的——那我宿主机上访问 127.0.0.1:6379，跟容器屋里监听的 6379 明明是两个世界的端口，怎么第 15 篇里一条 `-p` 就通了？

**🧑‍🏫 老师：**

因为 `-p` 不是「开门」，是「改地址」。起个带端口映射的 redis 当场看：

```bash
docker run -d --name ns-redis -p 6379:6379 redis:7
iptables -t nat -S DOCKER | grep 6379
```

```text
-A DOCKER ! -i docker0 -p tcp -m tcp --dport 6379 -j DNAT --to-destination 172.17.0.7:6379
```

（机器上还有一条 `--dport 6390` 的，是别的容器的旧映射，不关本实验的事。）

`-p 6379:6379` 的真相：Docker 向宿主机 **iptables NAT** 追加规则——凡不是从 docker0 进来的、目标端口 6379 的包，统统 **DNAT 改写**成 `172.17.0.7:6379`（ns-redis 的 eth0）。包进宿主机协议栈的第一站（PREROUTING）就被改了目的地，接着按新地址经 docker0/veth 送进容器那间屋；回包沿原路由被改回来。验货：

```bash
$ (echo > /dev/tcp/127.0.0.1/6379) && echo "port 6379 open on host"
port 6379 open on host
$ docker exec ns-redis redis-cli ping
PONG
```

于是有了本篇题眼，也是整个容器网络的一句话：

> **隔离靠 Network Namespace，连通靠 veth + 网桥 + iptables NAT——第 15 篇从使用侧讲过整条链路，今天你看到了它在 namespace 这层的根。**

---

## 插问 3：Docker 网络文档里的 Sandbox / Endpoint / Network 是什么？

**🧑‍🎓 学生：** 翻 Docker 官方网络文档时见过三个词：Sandbox、Endpoint、Network，说是 CNM 模型——跟我这两课看到的东西是一回事吗？

**🧑‍🏫 老师：**

是一回事，就是给零件起学名。Docker 把网络功能拆在 libnetwork 库里，那三个词就是它的三名词，跟刚才摸过的实物一一对号：

| CNM 学名 | 含义 | 刚才的对应物 |
|------|------|------------------------|
| **Sandbox** | 容器网络栈（接口、路由、DNS）；Linux 上即 Network Namespace | `ip a` 看到的那间屋子 |
| **Endpoint** | 接入网络的端点，常为 veth 一端 | `eth0@if203` / `vethb989fd4@if2` |
| **Network** | 逻辑网络（bridge、overlay、macvlan 等） | docker0（默认 bridge） |

Sandbox 通过 Endpoint 加入 Network。名词就位之后，回头看 `docker network connect`（把一个 Sandbox 再接一根线）这些命令，操作的分别是哪个零件，就不再是黑盒了。

一句话收口：

> **CNM 三名词 = netns、veth、bridge 的官方学名——文档说 Sandbox，你听成「那间屋子」就对了。**

---

## 第 7 课：MNT——另一张挂载表

**🧑‍🏫 老师：**

第 1 课的第四个现象：容器里的 `/` 装的是镜像内容。这归 **Mount Namespace（flag `CLONE_NEWNS`）** 管：传了这个 flag，子进程获得**父进程挂载点的一份拷贝**，此后两边各自 mount/umount 互不影响。

「挂载点拷贝」太抽象，看实物。先数各自的挂载表行数：

```bash
docker exec ns-lab cat /proc/mounts | wc -l
wc -l < /proc/mounts
```

```text
24
68
```

容器 24 条、宿主机 68 条。抽容器挂载表看内容：

```bash
docker exec ns-lab cat /proc/mounts | head -10
```

```text
overlay / overlay rw,relatime,lowerdir=/var/lib/containerd/.../snapshots/1802/fs:...,upperdir=.../snapshots/1803/fs,workdir=... 0 0
proc /proc proc rw,nosuid,nodev,noexec,relatime 0 0
tmpfs /dev tmpfs rw,nosuid,size=65536k,mode=755 0 0
devpts /dev/pts devpts rw,nosuid,exec... mode=620,ptmxmode=666 0 0
sysfs /sys sysfs ro,nosuid,nodev,noexec,relatime 0 0
cgroup /sys/fs/cgroup cgroup2 ro,nosuid,nodev,noexec,relatime,nsdelegate 0 0
mqueue /dev/mqueue mqueue rw,nosuid,nodev,noexec,relatime 0 0
shm /dev/shm tmpfs rw,nosuid,nodev,noexec,relatime,size=65536k 0 0
/dev/sdd /etc/resolv.conf ext4 rw,relatime,discard... 0 0
/dev/sdd /etc/hostname ext4 rw,relatime,discard... 0 0
```

挑要紧的拆，这张表把前几课的伏笔全收了：

- 第一行 `overlay / overlay ...lowerdir...upperdir...`：**容器的根目录是 overlayfs 叠出来的**——[第 22 篇](/云原生/docker/docker-22-unionfs)的主角，镜像分层读写就落在这行里。
- `proc /proc`：**`/proc` 是重新挂的**。PID namespace 换了编号体系，就必须配一张新的 `/proc`，`ps` 才能列出容器那张两行的表——第 1 课的源头在这。
- `sysfs /sys ... ro`：只读挂载，容器改不了内核设备信息；`cgroup2` 那行是资源限额的地基，归[第 21 篇](/云原生/docker/docker-21-cgroups)。
- 最后两行 `/dev/sdd /etc/hostname`、`/etc/resolv.conf`：**单文件 bind 挂载**——第 4 课那个 hostname 文件的下落：Docker 把宿主机 `/var/lib/docker/containers/<id>/` 下准备好的文件，逐个盖到容器 `/etc/` 的同名位置上；DNS 配置同理（所以容器才有了第 15 篇里那个 `nameserver 127.0.0.11`）。

一句话总结本课：

> **MNT namespace = 一份拷贝来的挂载表；`/` 是 overlay 叠的、`/proc` 是重挂的、hostname 是单文件盖上去的——四课伏笔一行行收进这张表。**

---

## 第 8 课：换根——把「够不到」钉死

**🧑‍🏫 老师：**

MNT namespace 决定「看哪些挂载点」，但还差最后一步：把**根目录整个换掉**——容器进程看到的 `/` 必须是镜像的 rootfs，否则前面全是白隔。验证「够不到」：

```bash
docker exec ns-lab ls /host
```

```text
ls: /host: No such file or directory
```

容器的世界里根本没有宿主机那棵目录树。这靠换根操作——runc 用 **`pivot_root`**，退路是 **`chroot`**，两套思路：

```c
// pivot_root 思路
put_old = mkdir(...);
pivot_root(rootfs, put_old);     // 整个根换到新挂载点，旧根挪去 put_old
chdir("/");
unmount(put_old, MS_DETACH);     // 旧根卸掉
rmdir(put_old);

// chroot 思路
mount(rootfs, "/", NULL, MS_MOVE, NULL);
chroot(".");                     // 把「/」的定义改指到当前目录
chdir("/");
```

**chroot（change root）** 把进程的根目录换到指定目录——这是文件系统隔离的**爷爷辈老手段**，1979 年就进了 Unix V7，比第一个 namespace（Mount ns，Linux 2.4.19，2002 年）早二十多年。但它出生时是给系统构建换根用的，**从来不是安全边界**：经典的「chroot 逃逸」手法（root 进程先留一个指向旧根的文件描述符，换根后再 `chdir("..")` 爬出去）流传至今。所以现代容器用 **pivot_root + MNT namespace** 组合：换根、卸旧根、视图隔离三保险，chroot 只作回退。

顺带一提全家福里的历史包袱：Mount namespace 的 flag 叫 `CLONE_NEWNS` 而不是 `CLONE_NEWMNT`——它是最早的一个，出生时还没「全家福」的概念，占了最宽泛的名字；后来者只好叫 `CLONE_NEWCGROUP`、`CLONE_NEWTIME` 这种「资源名」式 flag。看到 `NEWNS` 想到 Mount 就行。

一句话总结本课：

> **MNT namespace 给「有哪些挂载点」，pivot_root 给「`/` 在哪」——一套组合拳把容器钉在镜像 rootfs 上。**

---

## 第 9 课：USER——容器里的 root，还是宿主机的 root 吗？

**🧑‍🏫 老师：**

最后一个最容易想当然的：**USER namespace（flag `CLONE_NEWUSER`）隔离 UID/GID**——理论上可以让「容器里的 0 号」映射成「宿主机上的普通号」。听起来默认就该开？当场测。让容器里的 root 往 bind 挂载目录写个文件，回宿主机看属主：

```bash
docker exec ns-lab id
mkdir -p /tmp/userns-check
docker run --rm -v /tmp/userns-check:/x busybox sh -c "id; touch /x/from-container"
ls -ln /tmp/userns-check/from-container
```

```text
uid=0(root) gid=0(root) groups=0(root),10(wheel)
uid=0(root) gid=0(root) groups=0(root),10(wheel)
-rw-r--r-- 1 0 0 0 Aug 25 16:34 /tmp/userns-check/from-container
```

前两行：容器里自报 uid 0；第三行：宿主机视角看那个文件——属主 **0:0**。**容器里的 root 落到宿主机，还是 root**。也就是说，**Docker 默认并不启用 USER namespace 隔离**：要开得在 daemon 级配 `--userns-remap`（容器里的 0 映射成宿主机高位 uid），属于全局改动、还影响镜像与卷的属主显示（[官方文档](https://docs.docker.com/engine/security/userns-remap/)），默认不碰。

这条冷知识值得记牢：**容器内的 root 对宿主机文件有真 root 的权力**——所以 `-v /:/host` 这类挂载、`--privileged`，都是在把宿主机的钥匙递进容器。反过来，user ns 真开起来之后，「容器 root == 宿主 root」变成「容器 root == 宿主某个无名小号」，安全上一大截，代价是宿主侧看容器文件属主全成了别的号码。[第 26 篇](/云原生/docker/docker-26-rootless)的 rootless 模式，地基正是它。

一句话总结本课：

> **六大 namespace 里 USER 是默认不开的一个：容器 root == 宿主 root，权限的账要在宿主机侧算。**

---

## 第 10 课：一把尺量全部——`/proc/<pid>/ns/` 的 inode 判同

**🧑‍🏫 老师：**

九课下来，各 namespace 全靠「现象 + 命令」各拆各的。最后上一把**统一的尺**：内核给每个进程拥有的每种 namespace 发了一个 inode（内核对象的身份证号），**编号相同 = 同一间，编号不同 = 各一间**。拿第 2 课查到的 68973，把它和宿主机 1 号进程的清单并排看：

```bash
ls -l /proc/68973/ns/
ls -l /proc/1/ns/
```

```text
（容器进程 68973）                （宿主机 init）
cgroup -> cgroup:[4026533011]     cgroup -> cgroup:[4026531835]
ipc    -> ipc:[4026533009]        ipc    -> ipc:[4026532206]
mnt    -> mnt:[4026533007]        mnt    -> mnt:[4026532217]
net    -> net:[4026533012]        net    -> net:[4026531840]
pid    -> pid:[4026533010]        pid    -> pid:[4026532219]
time   -> time:[4026531834]       time   -> time:[4026531834]
user   -> user:[4026531837]       user   -> user:[4026531837]
uts    -> uts:[4026533008]        uts    -> uts:[4026532218]
```

逐对判同，本篇全部结论一屏收齐：

| 种类 | 容器 68973 | 宿主 init | 判定 |
|------|-----------|-----------|------|
| mnt | 4026533007 | 4026532217 | 不同 → 新开（第 7 课） |
| uts | 4026533008 | 4026532218 | 不同 → 新开（第 4 课） |
| ipc | 4026533009 | 4026532206 | 不同 → 新开（第 5 课） |
| pid | 4026533010 | 4026532219 | 不同 → 新开（第 2 课） |
| cgroup | 4026533011 | 4026531835 | 不同 → 新开（第 21 篇） |
| net | 4026533012 | 4026531840 | 不同 → 新开（第 6 课） |
| **user** | **4026531837** | **4026531837** | **相同 → 共享**（第 9 课的根源） |
| **time** | **4026531834** | **4026531834** | 相同 → 共享 |

还有更省事的汇总视图 `lsns`（每行一间屋，附屋主）：

```bash
lsns -p 68973 -o NS,TYPE,NPROCS,PID,COMMAND
```

```text
        NS TYPE   NPROCS   PID COMMAND
4026531834 time       108     1 /sbin/init
4026531837 user       108     1 /sbin/init
4026533007 mnt         1 68973 sleep 600
4026533008 uts         1 68973 sleep 600
4026533009 ipc         1 68973 sleep 600
4026533010 pid         1 68973 sleep 600
4026533011 cgroup      1 68973 sleep 600
4026533012 net         1 68973 sleep 600
```

time/user 两行的屋主是宿主机 1 号（全机 108 个进程共住），其余六间的屋主都是 68973——ns-lab 的容器进程。谁隔离、谁共享，一目了然。

全家福收尾。Linux 至今共八种 namespace（[namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)）：

| Namespace | Flag | 隔离内容 |
|-----------|------|----------|
| **Cgroup** | `CLONE_NEWCGROUP` | Cgroup 根目录 |
| **IPC** | `CLONE_NEWIPC` | System V IPC、POSIX 消息队列 |
| **Network** | `CLONE_NEWNET` | 网络设备、协议栈、端口等 |
| **Mount** | `CLONE_NEWNS` | 文件系统挂载点 |
| **PID** | `CLONE_NEWPID` | 进程 ID |
| **Time** | `CLONE_NEWTIME` | Boot 与 monotonic 时钟（2020 年，Linux 5.6 才到齐的最年轻成员，主要服务容器 checkpoint/restore，Docker 默认共享） |
| **User** | `CLONE_NEWUSER` | UID/GID |
| **UTS** | `CLONE_NEWUTS` | 主机名、NIS 域名 |

日常容器隔离的主干是 **pid / net / ipc / mnt / uts / user** 六类——前五类 Docker 默认就开，user 默认与宿主共享（第 9 课的实验）。这张表的每一行，前面十课里都有一段现场。

一句话总结本课：

> **`ls -l /proc/<pid>/ns/` 是判同的尺：inode 相同 = 同一间；一个普通容器，六间新开、两间共享。**

---

## 命令速查

按拆穿的顺序，把「想看什么 → 敲什么」收进一张表：

| 想看什么 | 命令 | 哪课用过 |
|----------|------|-----------|
| 容器内的进程表 | `docker exec <容器> ps -ef` | 1 |
| 容器 1 号的真身 | `docker inspect -f '{{.State.Pid}}' <容器>` | 2、10 |
| 一行两个 PID | `grep NSpid /proc/<pid>/status` | 2 |
| 宿主视角看容器进程 | `docker top <容器>` | 2 |
| 关掉某类隔离 | `--pid=host` / `--uts=host` | 3、4 |
| IPC 造/看/删队列 | `ipcmk -Q` / `ipcs -q` / `ipcrm -q <id>` | 5 |
| 容器网络栈 | `docker exec <容器> ip a` / `ip route` | 6 |
| 宿主侧找 veth、网桥 | `ip -o link show` / `ip a show docker0` | 6 |
| 端口映射的真相 | `iptables -t nat -S DOCKER` | 插问 2 |
| 挂载表 | `cat /proc/mounts` | 7 |
| user ns 是否隔离 | 容器 `-v` 落盘 + 宿主 `ls -ln` | 9 |
| 一把尺判同 | `ls -l /proc/<pid>/ns/` / `lsns -p <pid>` | 10 |

**思考题**：使用 `--network=host` 时，容器还会创建独立的 Network Namespace 吗？对端口冲突和安全边界有何影响？提示：拿第 10 课的尺子去量，`net -> net:[...]` 的编号会和谁相同？再进一步：`--uts=host` 和 `--network=host` 各拆哪面墙，两个一起给会怎样？

下一篇：[《CGroups 限资源——给同一个容器逐项上枷锁》](/云原生/docker/docker-21-cgroups)——namespace 管「看得见什么」，cgroup 管「用得了多少」：隔离的另一半，还是这个 ns-lab 的思路，逐项上锁。

---

## 参考资料

- [namespaces(7) 手册](https://man7.org/linux/man-pages/man7/namespaces.7.html)——八种 namespace 与 flags 的权威对照
- [clone(2) 手册](https://man7.org/linux/man-pages/man2/clone.2.html)——`CLONE_NEW*` flags 语义
- [pivot_root(2)](https://man7.org/linux/man-pages/man2/pivot_root.2.html) / [chroot(2)](https://man7.org/linux/man-pages/man2/chroot.2.html)——换根两套手艺
- [Docker 官方：Isolate containers with a user namespace](https://docs.docker.com/engine/security/userns-remap/)——userns-remap 的配置与代价
- 衔接：[第 15 篇 Docker 网络](/云原生/docker/docker-15-network)（使用侧的完整链路）、[第 22 篇 UnionFS](/云原生/docker/docker-22-unionfs)（挂载表第一行 overlay 的展开）、[第 24 篇 进程视角](/云原生/docker/docker-24-process-view)（两套 PID 与 shim 的排障实战）、[Linux 第 1 篇](/Linux/basics/linux-01-nsenter-prerequisites)（`/proc` 档案室与手搓 unshare）、[Linux 第 5 篇](/Linux/basics/linux-05-netns-iptables)（无 Docker 手搓 netns+veth+DNAT）
- 本机：WSL2 Ubuntu-22.04 + Docker 29.1.3 + busybox:latest + iptables v1.8.7（legacy），实测日期 2026-08-25
