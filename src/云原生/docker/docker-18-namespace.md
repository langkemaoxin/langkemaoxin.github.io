---
title: Namespace 隔离——从一个容器里的怪现象滚穿六大命名空间
sidebarGroup: Docker 系列
shortTitle: 18 Namespace 隔离
order: 18
date: 2026-08-22T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 进容器一看：进程表只剩两行、PID 从 1 重新编号、hostname 也换了。同一个 busybox 容器一路滚过 PID/UTS/IPC/NET/MNT/USER 六大 namespace，条条命令当场验证，最后用 /proc 的 inode 一把尺量出全部隔离。
---

> **Docker 系列 · 第 18/24 篇**
> 上一篇：[《UnionFS 与镜像分层——从两个目录滚出一个容器文件系统》](/云原生/docker/docker-17-unionfs) · 下一篇：[《进程视角看容器——从两边 ps 对不上号，滚到亲手杀掉 PID 1》](/云原生/docker/docker-19-process-view)

---

## 开头：同一条内存、同一个内核，凭什么像两台机器？

排障时你 `docker exec` 进容器，第一眼就觉得不对劲：`ps` 出来只有两三个进程，业务进程的 PID 居然是 **1**；`hostname` 不是宿主机的名字；`ls /` 底下的目录虽然眼熟，内容却全是镜像自带的。再开一个容器 B，它也有自己的 PID=1——可宿主机上 PID 是全局唯一编号的，**Docker 又不是虚拟机**，没有第二套内核，哪来的第二个「1 号进程」？

根因一句话：**容器不是新机器，而是「创建进程那一刻被换过视图的普通进程」**。Linux 创建进程时可以带上 `clone()` 的 flags，让内核把进程表、网卡、挂载点、主机名这些系统资源各复制一份**独立视图**——这就是 **Linux Namespaces**。容器里的世界之所以和宿主不一样，是因为它翻的每一册「资源清单」都是单独印的。

本篇不先背 namespace 对照表。整篇只用一个容器 `ns-lab`：先把怪现象一个个记下来，再用命令逐个拆穿——每滚一球，拆穿一个。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 起一个容器 ns-lab | 进程表只剩 2 行、PID=1、hostname 变成容器 ID |
| **2** | 拆穿 PID | 容器里的 1 = 宿主机的 70988，`NSpid` 一行两个号 |
| **3** | `clone()` 与 PidMode | `--pid=host` 的容器里能看到宿主机全部进程 |
| **4** | UTS namespace | hostname 跟着容器走；`--uts=host` 变回宿主机名 |
| **5** | IPC namespace | 宿主机建的 SysV 消息队列，容器里 `ipcs` 看不见 |
| **6** | NET namespace | 容器只有 lo + eth0；宿主机侧找到配对的 veth 和 docker0 |
| **7** | 连通：veth + 桥 + NAT | `-p 6379` 后 iptables 多一条 DNAT；宿主机 127.0.0.1:6379 直达容器 PONG |
| **8** | Libnetwork 的 CNM 三名词 | Sandbox / Endpoint / Network 钉到刚才看见的东西上 |
| **9** | MNT namespace + rootfs | 容器挂载表 24 行 vs 宿主机 52 行；`/` 是 overlay |
| **10** | chroot / pivot_root | 容器里 `ls /host` 不存在——够不到宿主机路径 |
| **11** | USER namespace | 容器里的 root 在宿主机侧还是 uid 0：默认没隔离 user |
| **12** 🧗 | 一把尺量全部 | `/proc/<pid>/ns/` 的 inode 判同 + 八种 namespace 全景表 |

贯穿全文的故事：WSL2 里一个 busybox 容器 `ns-lab`，主人是一条 `sleep 600`。环境指纹：WSL2 Ubuntu-22.04 + Docker 29.1.3 + busybox:latest + iptables v1.8.7（legacy），全程 root。前置知识在 Linux 板块：[/Linux/basics/linux-01-nsenter-prerequisites](/Linux/basics/linux-01-nsenter-prerequisites)（`/proc`、NSpid、亲手 unshare/nsenter）。官方入口：[namespaces(7) 手册](https://man7.org/linux/man-pages/man7/namespaces.7.html)。

---

## 雪球 1：起一个容器，先撞见三个「不一样」

先看宿主机的样子（WSL 里进程不算多，普通服务器上 `ps -ef` 常有几百行）：

```bash
hostname
ps -ef | wc -l
ps -ef | head -5
```

本机输出：

```text
pc3507
63
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 Aug17 ?        00:00:08 /sbin/init
root           2       1  0 Aug17 ?        00:00:00 /init
root           9       2  0 Aug17 ?        00:00:00 plan9 --control-socket 7 --log-level 4 --server-fd 8 --pipe-fd 10 --log-truncate
root          81       1  0 Aug17 ?        00:00:02 /lib/systemd/systemd-journald
```

逐行拆：宿主机 63 个进程；**PID 1 是 `/sbin/init`**（systemd，万进程之祖）；普通发行版上 **PID 2 常是 `kthreadd`**——由 idle 进程创建、负责内核线程调度；本机是 WSL，2 号是 `/init`、9 号是 plan9（WSL 特有的 9P 文件系统服务），这是环境差异，不影响结论。

现在请出本篇主角，再进它肚子里看同样的三样东西：

```bash
docker run -d --name ns-lab busybox sleep 600
docker exec ns-lab ps -ef
docker exec ns-lab hostname
docker exec ns-lab ls /
```

本机输出：

```text
c79cde6ce18c682fe4327d6a9dc498a1943f695b9f40bc122086552e2e2a39d1
PID   USER     TIME  COMMAND
    1 root      0:00 sleep 600
    7 root      0:00 ps -ef
c79cde6ce18c
bin
dev
etc
home
lib
lib64
proc
root
sys
tmp
usr
var
```

三个「不一样」当场齐了：

| 现象 | 宿主机 | 容器 ns-lab |
|------|--------|-------------|
| 进程表 | 63 个 | 2 个（sleep + 你敲的 ps） |
| PID 1 | `/sbin/init` | **你起的 `sleep 600`** |
| hostname | `pc3507` | `c79cde6ce18c` |

细节别放过：第一行那串长十六进制是 `docker run` 返回的**容器 ID**，hostname `c79cde6ce18c` 正是它的**前 12 位**——Docker 默认拿容器 ID 当主机名。进程表里的 7 号是本次 `exec` 派进来的 `ps` 自己：容器内的 PID 一直在往下发号，不必纠结具体数值。

还有第四个不一样：`ls /` 里装的是 busybox 镜像的内容，宿主机 `/etc` 里的东西一样都看不到。四个现象分别压在 PID、UTS、MNT 三类 namespace 上（进程表和 PID 1 同属 PID），后面逐个拆。先把现象都记下：**同一个内核、同一份内存，看到的清单却不一样**。

---

## 雪球 2：容器里的 1 号进程，在宿主机上是谁？

先记住一个事实：**内核只维护一张真的进程表**——就是宿主机这张。容器里的进程全在里面躺着，`sleep 600` 也不例外，只是编号不同。Docker 知道它的真身：

```bash
docker inspect -f '{{.State.Pid}}' ns-lab
```

```text
70988
```

拿这个号回宿主机查档案（`/proc` 档案室的用法，Linux 板块[第 1 篇](/Linux/basics/linux-01-nsenter-prerequisites)滚过）：

```bash
ps -o pid,ppid,user,args -p 70988
grep NSpid /proc/70988/status
docker top ns-lab
```

本机输出：

```text
    PID    PPID USER     COMMAND
  70988   70964 root     sleep 600
NSpid:	70988	1
UID                 PID                 PPID                C                   STIME               TTY                 TIME                CMD
root                70988               70964               2                   11:17               ?                   00:00:00            sleep 600
```

逐行拆：

- `ps`：同一个 `sleep 600`，在宿主机这张真进程表里是 **70988**，爹是 70964。
- `NSpid: 70988 1`：一行两个号——**同一进程在两层 PID namespace 里的编号**，宿主层 70988、容器层 1。
- `docker top`：Docker 干的就是刚才的手工活——拿着容器进程在宿主机上的真实 PID，用宿主机视角列给你看。

那个爹（PPID 70964）是谁？`ps -o pid,ppid,args -p 70964` 一查便知：

```text
    PID    PPID COMMAND
  70964       1 /usr/bin/containerd-shim-runc-v2 -namespace moby -id c79cde6ce18c682fe4327d6a9dc498a1943f695b9f40bc122086552e2e2a39d1 -address /run/containerd/containerd.sock
```

是 **containerd-shim**——容器进程在宿主机上的「监护人」，`-id` 正是容器 ID（跟 hostname 同源）。宿主机上一直能看到 dockerd、shim 这些 Docker 自身的进程。

于是开头「两个容器都有 PID 1」的答案出来了，钉成小模型：

```text
宿主机进程表（唯一一张真的）
  1 /sbin/init
  ...
  70964 containerd-shim ... -id c79cde6...
  └─ 70988 sleep 600   ← 容器 ns-lab 的 PID 1
        │
        │  容器内视图：编号从 1 重新来
        ▼
  容器 A 看到的：1 sleep 600     容器 B 看到的：1 redis-server
  （互相看不见，也看不见 70988）
```

**容器内进程对宿主机其他进程一无所知；反过来，站在 namespace 外（宿主机上），通过 `/proc` 或 `docker top` 仍能看到容器内进程的真实 PID**——隔离是「视图单向变窄」，不是把进程搬走。shim 为什么存在、`exec` 进去的进程爹是谁，是[第 19 篇](/云原生/docker/docker-19-process-view)的主菜。

---

## 雪球 3：隔离是「创建进程那一刻」给的——clone()

两套编号已经坐实，但**新视图是哪来的**？Linux 创建进程的系统调用是 `clone()`：

```c
int clone(int (*fn)(void *), void *child_stack,
          int flags, void *arg, ...);
```

平时用的 `fork()` 在 Linux 内部走的就是它。关键是第三个参数 **flags**：传入 `CLONE_NEWPID` 时，新进程获得**独立 PID 空间**，其内 PID 可从 1 重新编号——雪球 2 的第二层编号就是它给的。其他资源同理：`CLONE_NEWNET` 给独立网络栈、`CLONE_NEWUTS` 给独立主机名……完整对照表放在雪球 12，先按下不表。

Docker 在 `docker run` / `docker start` 时创建 OCI Spec（容器怎么造的标准说明书），经 `setNamespaces` 设置各类 namespace，再交给 `containerd` → `runc` 创建容器进程。简化调用链：

```text
containerRouter.postContainersStart
└── daemon.ContainerStart
    └── daemon.createSpec
        └── setNamespaces
            └── setNamespace (pid / net / ipc / uts / user / ...)
```

也就是说，你 `docker run` 敲下的每一行，最终都变成 clone flags 交给内核。**flags 不是写死的**——`PidMode` 就支持：

- **默认**：新建 PID namespace
- **`--pid=host`**：与宿主机共享 PID namespace（`oci.RemoveNamespace`）
- **`--pid=container:<name>`**：与指定容器共享 PID namespace

空口无凭，把隔离当场关掉试试：

```bash
docker run --rm --pid=host busybox ps -ef | head -5
```

本机输出：

```text
PID   USER     TIME  COMMAND
    1 root      0:08 {systemd} /sbin/init
    2 root      0:00 {init-systemd(Ub} /init
    9 root      0:00 {init} plan9 --control-socket 7 --log-level 4 --server-fd 8 --pipe-fd 10 --log-truncate
   81 root      0:00 {systemd-journal} /lib/systemd/systemd-journald
  115 root      0:00 {systemd-udevd} systemd-udevd
```

同一个 busybox 镜像，这次容器里的 `ps` 看到了宿主机的 init、journald、udevd……（花括号里是内核记账用的进程短名 comm。）因为 `--pid=host` 少给了 `CLONE_NEWPID`，**这个孩子直接生在宿主机的 PID namespace 里**。隔离不是容器的固有魔法，是创建那一刻给不给某个 flag。

---

## 雪球 4：UTS——hostname 为什么换了一套

雪球 1 的第二个现象。三种玩法摆在一起：

```bash
docker exec ns-lab hostname
docker run --rm --uts=host busybox hostname
docker run --rm --hostname snowball-uts busybox hostname
```

本机输出：

```text
c79cde6ce18c
pc3507
snowball-uts
```

| 命令 | 结果 | 原因 |
|------|------|------|
| 默认容器 | `c79cde6ce18c`（容器 ID 前 12 位） | 新建 UTS ns，Docker 顺手把 hostname 设成容器 ID |
| `--uts=host` | `pc3507`，和宿主机一模一样 | 共享宿主机的 UTS ns，没发 `CLONE_NEWUTS` |
| `--hostname snowball-uts` | 你起的名字 | 还是新建 UTS ns，只是 hostname 换成你指定的 |

**UTS namespace（flag `CLONE_NEWUTS`）隔离的就是主机名和 NIS 域名**这两样「机器身份」。它是最不起眼的一类，但不是没用：很多软件拿 hostname 当配置键、当集群成员名——同一台宿主机上几十个容器若共用一个 hostname，光看日志就没法分辨谁是谁了。

hostname 具体写在容器里哪个文件？

```bash
docker exec ns-lab cat /etc/hostname
```

```text
c79cde6ce18c
```

Docker 把它写进了容器 `/etc/hostname`——这个文件是怎么「塞」进容器的，雪球 9 的挂载表里有它的下落。

---

## 雪球 5：IPC——宿主机的消息队列，容器里装看不见

进程间通信（System V IPC：消息队列、信号量、共享内存，外加 POSIX 消息队列）也有自己的一册清单。这个演示要「造一个再藏一个」。先在宿主机上建一条 SysV 消息队列并确认它存在：

```bash
ipcmk -Q && ipcs -q
```

```text
Message queue id: 0

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
0xef6ed0ea 0          root       644        0            0
```

`ipcmk -Q` 回了句「队列 id 是 0」；下面 `ipcs -q` 列出它：key `0xef6ed0ea`、属主 root、空队列。

再进容器看同一张表：

```bash
docker exec ns-lab ipcs -q
```

```text

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
```

表头之下空空如也——宿主机明明刚建了一条 `msqid=0` 的队列，容器里就是看不见。**IPC namespace（flag `CLONE_NEWIPC`）隔离 System V IPC 和 POSIX 消息队列**：容器里的进程用不了宿主机（以及其他容器）的队列、信号量、共享内存，各玩各的，想配合也没门。

收工清理：`ipcrm -q 0`。注意 `-q` 接的是 id、`-Q` 接的是 key——我在实验时就敲反过一次，队列纹丝不动，重敲 `-q` 才删掉。

---

## 雪球 6：NET——容器自己的网卡、IP 和路由表

最值钱的现象来了：网络。默认每个 `docker run` 的容器都拥有**独立 Network Namespace（flag `CLONE_NEWNET`）**——一间独立的「网络屋子」，屋里网卡、路由表、端口、iptables 规则全是自己的：

```bash
docker exec ns-lab ip a
docker exec ns-lab ip route
```

本机输出：

```text
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0@if540: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue
    link/ether 2a:9f:98:4d:82:bd brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.5/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 scope link  src 172.17.0.5
```

屋里只有两块网卡：`lo` 回环 + `eth0`（172.17.0.5/16）；路由表两条：默认网关 `172.17.0.1` 从 eth0 出去。宿主机上可远不止这点东西。那容器的 eth0 是谁给的？默认 **Bridge** 模式下 Docker 做三件事（[第 11 篇](/云原生/docker/docker-11-network)详述，这里只对证据）：

1. 创建 **docker0** 虚拟网桥
2. 为容器分配 IP，默认网关指向 docker0
3. 创建 **veth pair**（一对虚拟网线）：一端塞进容器内当 `eth0`，一端接在 docker0 上

到宿主机侧对证据：

```bash
ip a show docker0
ip -o link show | grep '^540:'
```

第二条为什么是 540？容器里网卡叫 `eth0@if540`，**@后面的数字就是对面的编号**，按编号去宿主机点它名。本机输出：

```text
6: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether de:1e:d5:5a:6e:d1 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::dc1e:d5ff:fe5a:6ed1/64 scope link
       valid_lft forever preferred_lft forever
540: veth1f21549@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP mode DEFAULT group default \    link/ether aa:bf:3f:ed:1a:3b brd ff:ff:ff:ff:ff:ff link-netnsid 3
```

- docker0 的 IP `172.17.0.1` 正是容器路由表里那条 default via 的网关——**网关就是网桥本身**。
- 宿主机这条 `540: veth1f21549@if2` 与容器里的 `2: eth0@if540` 名字互指：容器侧编号 2、宿主侧编号 540，**一根 veth 网线两头当场对上**。`master docker0` 说明宿主这头插在网桥上。

宿主机上同时跑着别的容器，所以 veth 不止一根（本机 4 根），认准编号就不错。veth 两头分放两间屋的最小实验，Linux 板块[第 5 篇](/Linux/basics/linux-05-netns-iptables)雪球 2 手搓过。

---

## 雪球 7：隔离归隔离，外面怎么打得进去——DNAT

NET namespace 一隔，容器有独立网卡独立端口，宿主机的 127.0.0.1 怎么访问得到它？起个带端口映射的 redis 试试：

```bash
docker run -d --name ns-redis -p 6379:6379 redis:7
iptables -t nat -S DOCKER | grep 6379
```

本机输出：

```text
29f1f5efcc958bcbce05456829ca496c59181bc2b2d8df6256491c8ed9a461fd
-A DOCKER ! -i docker0 -p tcp -m tcp --dport 6379 -j DNAT --to-destination 172.17.0.6:6379
```

`-p 6379:6379` 的真相：Docker 向宿主机 **iptables NAT** 追加规则——凡不是从 docker0 进来的（`! -i docker0`）、目标端口 6379 的 tcp 包，统统 DNAT 改写到 `172.17.0.6:6379`（ns-redis 的 eth0）。用列表视图看更直观：

```bash
iptables -t nat -L DOCKER -n | head -5
```

```text
Chain DOCKER (2 references)
target     prot opt source               destination
DNAT       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:19090 to:172.17.0.3:80
DNAT       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:10000 to:172.17.0.4:8000
DNAT       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:6379 to:172.17.0.6:6379
```

前两条是机器上另外两个容器早就建好的映射，第三条才是刚才那条。单独摘一条看它在 `iptables -t nat -L` 里通用的样子（宿主网段不同，容器 IP 也不同）：

```text
DNAT tcp -- anywhere anywhere tcp dpt:6379 to:192.168.0.4:6379
```

验货：宿主机上连 127.0.0.1:6379，再让 redis 自证身份：

```bash
(echo > /dev/tcp/127.0.0.1/6379) && echo "port 6379 open on host"
docker exec ns-redis redis-cli ping
```

```text
port 6379 open on host
PONG
```

完整链路：外部访问 `127.0.0.1:6379`，包进**宿主机协议栈**，在 **PREROUTING** 链被 DNAT 改写成 `172.17.0.6:6379`，经 docker0 / veth 送进容器那间屋，FILTER 检查后直达 redis；回包沿原路 POSTROUTING 再改回来。一句话（本篇题眼）：

**隔离靠 Network Namespace，连通靠 veth + 网桥 + iptables。**

Docker 的四种网络模式（Host、Container、None、Bridge）、自定义网络与服务名 DNS，[第 11 篇](/云原生/docker/docker-11-network)整篇在讲；想在没有任何 Docker 的机器上亲手搓一套 netns + veth + DNAT，看 Linux 板块[第 5 篇](/Linux/basics/linux-05-netns-iptables)。

---

## 雪球 8：给刚才看到的东西钉上名字——Libnetwork 与 CNM

滚到这里，Docker 网络模型（**Container Network Model，CNM**）的全部零件其实已被你摸了一遍。Docker 把网络功能拆到 **libnetwork** 这个库，目标是为应用提供一致的编程接口与网络抽象。三个核心概念：

| 组件 | 含义 | 刚才在雪球 6/7 的对应物 |
|------|------|------------------------|
| **Sandbox** | 容器网络栈（接口、路由、DNS）；Linux 上即 Network Namespace | `ip a` 看到的那间屋子 |
| **Endpoint** | 接入网络的端点，常为 veth 一端 | `eth0@if540` / `veth1f21549@if2` |
| **Network** | 逻辑网络（bridge、overlay、macvlan 等） | docker0（默认 bridge） |

Sandbox 通过 Endpoint 加入 Network；bridge 模式下 Network 对应 docker0 或用户自定义 bridge。名词就位之后，再回头看 `docker network ls`、`docker network connect` 这些命令，操作的分别是哪个零件，就不再是黑盒了。

---

## 雪球 9：MNT——容器看到的是另一张挂载表

第五个现象：容器里的 `/` 装的是镜像内容。这归 **Mount Namespace（flag `CLONE_NEWNS`）** 管：创建新挂载 namespace 同样是在 `clone()` 里传 flag——子进程获得**父进程挂载点的拷贝**，此后两边各自 mount/umount 互不影响；若不传，子进程对文件系统的变更就会反映到宿主机。

「挂载点拷贝」太抽象，看实物。先数各自的挂载表行数：

```bash
docker exec ns-lab cat /proc/mounts | wc -l
wc -l < /proc/mounts
```

```text
24
52
```

容器 24 条、宿主机 52 条。再抽容器挂载表前 10 行看内容：

```bash
docker exec ns-lab cat /proc/mounts | head -10
```

```text
overlay / overlay rw,relatime,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/1081/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/113/fs,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/1082/fs,workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/1082/work 0 0
proc /proc proc rw,nosuid,nodev,noexec,relatime 0 0
tmpfs /dev tmpfs rw,nosuid,size=65536k,mode=755 0 0
devpts /dev/pts devpts rw,nosuid,noexec,relatime,gid=5,mode=620,ptmxmode=666 0 0
sysfs /sys sysfs ro,nosuid,nodev,noexec,relatime 0 0
cgroup /sys/fs/cgroup cgroup2 ro,nosuid,nodev,noexec,relatime,nsdelegate 0 0
mqueue /dev/mqueue mqueue rw,nosuid,nodev,noexec,relatime 0 0
shm /dev/shm tmpfs rw,nosuid,noexec,relatime,size=65536k 0 0
/dev/sdd /etc/resolv.conf ext4 rw,relatime,discard,errors=remount-ro,data=ordered 0 0
/dev/sdd /etc/hostname ext4 rw,relatime,discard,errors=remount-ro,data=ordered 0 0
```

挑要紧的拆：

- `overlay / overlay ...lowerdir...upperdir...`：容器的根目录是 overlayfs 叠出来的——[第 17 篇](/云原生/docker/docker-17-unionfs)的主角，镜像分层读写就落在这行里。容器启动需要这份 **rootfs**（根文件系统）：所有二进制必须在 rootfs 内执行，所以 `/proc`、`/sys`、`/dev` 这些伪文件系统必须挂进去。
- `proc /proc`：**`/proc` 是重新挂的**。PID namespace 换了编号体系，就必须配一张新的 `/proc`，`ps` 才能列出容器里那张表——雪球 1 那两行进程的源头在这。
- `sysfs /sys ... ro`：只读挂载，容器改不了内核设备信息。
- `cgroup /sys/fs/cgroup cgroup2 ... nsdelegate`：cgroup 文件系统也挂进来了——资源限额那条线归[第 20 篇](/云原生/docker/docker-20-cgroups)。
- `/dev/sdd /etc/hostname`、`/etc/resolv.conf`：**单文件 bind 挂载**。雪球 4 的 hostname 文件，就是 Docker 把宿主机 `/var/lib/docker/containers/<id>/` 下的同名文件盖到容器 `/etc/hostname` 上的；DNS 配置同理。bind 挂载的内核层实现在 Linux 板块[第 6 篇](/Linux/basics/linux-06-bind-mount)。

一张挂载表，把雪球 1、2、4 的三个伏笔全收了。

---

## 雪球 10：chroot / pivot_root——把「够不到」钉死

MNT namespace 决定「看哪些挂载点」，但容器还差最后一步：把**根目录整个换掉**。容器进程看到的 `/` 必须是镜像的 rootfs，而不是宿主机的 `/`，否则前面全是白隔。验证「够不到」：

```bash
docker exec ns-lab ls /host
```

```text
ls: /host: No such file or directory
```

容器的世界里根本没有宿主机那棵目录树。这靠换根操作——libcontainer 使用 **`pivot_root`** 或 **`chroot`**，两套思路：

```c
// pivot_root 思路
put_old = mkdir(...);
pivot_root(rootfs, put_old);
chdir("/");
unmount(put_old, MS_DETACH);
rmdir(put_old);

// chroot 思路
mount(rootfs, "/", NULL, MS_MOVE, NULL);
chroot(".");
chdir("/");
```

**chroot（change root）** 把进程的根目录从 `/` 换到指定目录，新根下无法访问旧系统路径，形成与原系统隔离的目录树——这是文件系统隔离的**经典老手段**，常与 MNT Namespace 配合使用。`pivot_root` 则是「把整个根换到新挂载点、旧根挪去别处再卸载」，配 MNT ns 用更干净、更难逃逸，是 runc 的首选，chroot 作回退。两者的历史账，章末「历史包袱」细算。

一句话归位：**MNT namespace 给「有哪些挂载点」，pivot_root / chroot 给「`/` 在哪」**——雪球 9 和 10 是一套组合拳。

---

## 雪球 11：USER——容器里的 root，还是宿主机的 root 吗？

最后一个容易想当然的：**USER namespace（flag `CLONE_NEWUSER`）隔离 UID/GID**，可以让「容器里的 0 号」映射成「宿主机上的普通号」。听起来默认就该开？当场测。让容器里的 root 往 bind 挂载目录写个文件，再回宿主机看这个文件的属主：

```bash
docker exec ns-lab id
mkdir -p /tmp/userns-check
docker run --rm -v /tmp/userns-check:/x busybox sh -c "id; touch /x/from-container"
ls -ln /tmp/userns-check/from-container
```

本机输出：

```text
uid=0(root) gid=0(root) groups=0(root),10(wheel)
uid=0(root) gid=0(root) groups=0(root),10(wheel)
-rw-r--r-- 1 0 0 0 Aug 19 11:18 /tmp/userns-check/from-container
```

第一行是常驻的 ns-lab 报身份：uid 0；第二行是临时容器报身份：也是 uid 0；第三行是宿主机视角看那个文件——属主 **0:0**。**容器里的 root 落到宿主机，还是 root**。也就是说，**Docker 默认并不启用 USER namespace 隔离**：要开得在 daemon 级配置 `--userns-remap`（容器里的 0 映射成宿主机的高位 uid，如 100999），属于全局改动、还会影响镜像与卷的属主显示，见[官方文档](https://docs.docker.com/engine/security/userns-remap/)，默认不碰。

这条冷知识值得记牢：**容器内的 root 对宿主机文件有真 root 的权力**——所以 `-v /:/host` 这类挂载、`--privileged`，都是在把宿主机的钥匙递进容器。反过来，user ns 真开起来之后，「容器 root == 宿主 root」就变成「容器 root == 宿主某个无名小号」，安全上一大截，代价是宿主侧看容器文件属主全成了别的号码。

---

## 雪球 12 🧗：一把尺量全部——/proc/<pid>/ns/ 的 inode 判同

十一球滚完，各 namespace 全靠「现象 + 命令」各拆各的。最后上一把**统一的尺**：内核给每个进程拥有的每种 namespace 都发了一个 inode（内核对象的身份证号），**编号相同 = 同一间，编号不同 = 各一间**。拿雪球 2 查到的 70988，把它和宿主机 1 号进程的清单并排看：

```bash
P=$(docker inspect -f '{{.State.Pid}}' ns-lab)   # 本机 = 70988
ls -l /proc/$P/ns/
```

```text
total 0
lrwxrwxrwx 1 root root 0 Aug 19 11:17 cgroup -> cgroup:[4026532450]
lrwxrwxrwx 1 root root 0 Aug 19 11:17 ipc -> ipc:[4026532448]
lrwxrwxrwx 1 root root 0 Aug 19 11:17 mnt -> mnt:[4026532446]
lrwxrwxrwx 1 root root 0 Aug 19 11:17 net -> net:[4026532451]
lrwxrwxrwx 1 root root 0 Aug 19 11:17 pid -> pid:[4026532449]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 pid_for_children -> pid:[4026532449]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 time -> time:[4026531834]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 time_for_children -> time:[4026531834]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 user -> user:[4026531837]
lrwxrwxrwx 1 root root 0 Aug 19 11:17 uts -> uts:[4026532447]
```

（`pid_for_children` / `time_for_children` 是「将来给子进程预留的那间」的门牌，本篇不用管。）宿主机 PID 1 的同一目录：

```bash
ls -l /proc/1/ns/
```

```text
total 0
lrwxrwxrwx 1 root root 0 Aug 19 11:18 cgroup -> cgroup:[4026531835]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 ipc -> ipc:[4026532206]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 mnt -> mnt:[4026532217]
lrwxrwxrwx 1 root root 0 Aug 19 16:13 net -> net:[4026531840]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 pid -> pid:[4026532219]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 pid_for_children -> pid:[4026532219]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 time -> time:[4026531834]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 time_for_children -> time:[4026531834]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 user -> user:[4026531837]
lrwxrwxrwx 1 root root 0 Aug 19 11:18 uts -> uts:[4026532218]
```

逐对判同，本篇全部结论一屏收齐：

| 种类 | 容器 70988 | 宿主 init | 判定 |
|------|-----------|-----------|------|
| mnt | 4026532446 | 4026532217 | 不同 → 新开（雪球 9） |
| uts | 4026532447 | 4026532218 | 不同 → 新开（雪球 4） |
| ipc | 4026532448 | 4026532206 | 不同 → 新开（雪球 5） |
| pid | 4026532449 | 4026532219 | 不同 → 新开（雪球 2） |
| cgroup | 4026532450 | 4026531835 | 不同 → 新开（第 20 篇） |
| net | 4026532451 | 4026531840 | 不同 → 新开（雪球 6/7） |
| **user** | **4026531837** | **4026531837** | **相同 → 共享**（雪球 11 的根源） |
| **time** | **4026531834** | **4026531834** | 相同 → 共享 |

还有更省事的汇总视图 `lsns`（每行一间屋，附屋主）：

```bash
lsns -p 70988 -o NS,TYPE,NPROCS,PID,COMMAND
```

```text
        NS TYPE   NPROCS   PID COMMAND
4026531834 time       67     1 /sbin/init
4026531837 user       67     1 /sbin/init
4026532446 mnt         1 70988 sleep 600
4026532447 uts         1 70988 sleep 600
4026532448 ipc         1 70988 sleep 600
4026532449 pid         1 70988 sleep 600
4026532450 cgroup      1 70988 sleep 600
4026532451 net         1 70988 sleep 600
```

time/user 两行的屋主是宿主机 1 号（全机 67 个进程共住），其余六间的屋主都是 70988——ns-lab 的容器进程。谁隔离、谁共享，一目了然。

现在可以放全家福了。Linux 至今共八种 namespace，flags 与隔离内容对照（[namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)）：

| Namespace | Flag | 隔离内容 |
|-----------|------|----------|
| **Cgroup** | `CLONE_NEWCGROUP` | Cgroup 根目录 |
| **IPC** | `CLONE_NEWIPC` | System V IPC、POSIX 消息队列 |
| **Network** | `CLONE_NEWNET` | 网络设备、协议栈、端口等 |
| **Mount** | `CLONE_NEWNS` | 文件系统挂载点 |
| **PID** | `CLONE_NEWPID` | 进程 ID |
| **Time** | `CLONE_NEWTIME` | Boot 与 monotonic 时钟 |
| **User** | `CLONE_NEWUSER` | UID/GID |
| **UTS** | `CLONE_NEWUTS` | 主机名、NIS 域名 |

（Mount 的 flag 叫 `CLONE_NEWNS` 而非 `CLONE_NEWMNT`——它是最早的一个，出生时还没「全家福」的概念，历史包袱章末见。）Docker 默认启用其中大部分（视 `--pid`、`--network` 等模式而定）；日常容器隔离的主干是 **pid / net / ipc / mnt / uts / user** 六类——前五类 Docker 默认就开（外加 cgroup），user 类默认与宿主共享（雪球 11 的实验），要显式配置才生效。这张表的每一行，雪球 2~11 里都有一段现场。

---

## 命令怎么记

按滚雪球的顺序，把「想看什么 → 敲什么」收进一张表：

| 想看什么 | 命令 | 哪一球用过 |
|----------|------|-----------|
| 容器内的进程表 | `docker exec <容器> ps -ef` | 1 |
| 容器 1 号进程的真身 | `docker inspect -f '{{.State.Pid}}' <容器>` | 2、12 |
| 一行两个 PID | `grep NSpid /proc/<pid>/status` | 2 |
| 宿主视角看容器进程 | `docker top <容器>` | 2 |
| 关掉某类隔离 | `--pid=host` / `--uts=host` | 3、4 |
| IPC 现场造/看/删队列 | `ipcmk -Q` / `ipcs -q` / `ipcrm -q <id>` | 5 |
| 容器网络栈 | `docker exec <容器> ip a` / `ip route` | 6 |
| 宿主侧找 veth、网桥 | `ip -o link show` / `ip a show docker0` | 6 |
| 端口映射的真相 | `iptables -t nat -S DOCKER` | 7 |
| 挂载表 | `cat /proc/mounts` | 9 |
| user ns 是否隔离 | 容器 `-v` 落盘 + 宿主 `ls -ln` | 11 |
| 一把尺判同 | `ls -l /proc/<pid>/ns/` / `lsns -p <pid>` | 12 |

---

## 历史包袱

- **chroot 是爷爷辈**：1979 年就进了 Unix V7，比第一个 namespace（Mount ns，Linux 2.4.19，2002 年）早了二十多年。它出生时是给系统构建换根用的，**从来不是安全边界**——经典的「chroot 逃逸」手法（root 进程先留一个指向旧根的文件描述符，换根后再 `chdir("..")` 爬出去）流传至今。所以单独的 chroot 不算隔离；现代容器用 **pivot_root + MNT namespace** 组合：换根、卸旧根、视图隔离三保险——雪球 10 那两段代码，就是新规矩和旧手艺两条路。
- **`CLONE_NEWNS` 的名字也是包袱**：Mount namespace 排老大，起名时没料到后面会有七个弟弟，占了宽泛的 `NEWNS`；后来者只好叫 `CLONE_NEWCGROUP`、`CLONE_NEWTIME` 这种「资源名」式 flag。看到 `NEWNS` 想到 Mount 就行。
- 最年轻的 **TIME namespace** 2020 年（Linux 5.6）才落地，全家福八口到齐。它主要服务容器 checkpoint/restore 场景，Docker 目前默认与宿主共享（雪球 12 实测相同 inode）。

---

## 和系列其它篇

| 相关篇 | 在这一路上的位置 |
|--------|------------------|
| [第 7 篇 · 进入容器的四种方式](/云原生/docker/docker-07-enter-container) | `exec` / `attach` / SSH / `nsenter` 怎么选、`nsenter -n` 借宿主工具查容器网络——动手篇；本篇解释它为什么「进得去、为什么容器看不见宿主机进程」 |
| [第 11 篇 · Docker 网络](/云原生/docker/docker-11-network) | 雪球 6/7 的四种网络模式、自定义 bridge、服务名 DNS 的展开 |
| [第 17 篇 · UnionFS 与镜像分层](/云原生/docker/docker-17-unionfs) | 雪球 9 挂载表第一行 overlay 的详解 |
| [第 19 篇 · 进程视角看容器](/云原生/docker/docker-19-process-view)（下一篇） | 雪球 2 的两套 PID、shim 监护人、杀掉 PID 1 容器为何退出 |
| [第 20 篇 · Cgroups](/云原生/docker/docker-20-cgroups) | namespace 管「看得见什么」，cgroup 管「用得了多少」——隔离的另一半，雪球 9/12 都埋了线 |
| [Linux 第 1 篇 · nsenter 前置知识](/Linux/basics/linux-01-nsenter-prerequisites) | `/proc` 档案室、NSpid、亲手 unshare 出一个 namespace、nsenter 钻容器 |
| [Linux 第 5 篇 · 手搓迷你容器网络](/Linux/basics/linux-05-netns-iptables) | 雪球 6/7 的 netns、veth、DNAT 在无 Docker 环境的手搓版 |
| [Linux 第 6 篇 · bind 挂载实操](/Linux/basics/linux-06-bind-mount) | 雪球 9 的 bind mount（含 `-v` 单文件挂载）内核层前置 |

---

## 小结

一个 busybox 容器滚完十二球，开头每个怪现象都各有出处：

1. **雪球 1 现象清单**：进程表骤减、PID=1、hostname 换、根目录是镜像的——四件怪事，三条线索。
2. **雪球 2 PID ns**：内核只有一张真进程表；`NSpid` 一行两号；`docker top` 就是宿主视角。容器 1 号 = 宿主 70988。
3. **雪球 3 clone()**：隔离在创建进程那一刻由 `CLONE_NEW*` flags 决定；`--pid=host` 是关掉开关的现场。
4. **雪球 4 UTS**：hostname/NIS 域名单独一册；默认设成容器 ID，`--hostname` 可改。
5. **雪球 5 IPC**：SysV/POSIX IPC 各一间，`ipcmk`/`ipcs` 当场互看不见。
6. **雪球 6 NET**：独立网卡路由是间「网络屋子」；docker0 是网关，veth 两头连屋。
7. **雪球 7 连通**：`-p` 的本质是宿主 iptables 里的 DNAT；隔离靠 netns，连通靠 veth+桥+NAT。
8. **雪球 8 CNM**：Sandbox（netns）/ Endpoint（veth 端）/ Network（bridge）三名词对号入座。
9. **雪球 9 MNT + rootfs**：挂载表是拷贝来的另一张；`/` 是 overlay，`/proc` 重挂，hostname 文件单挂。
10. **雪球 10 换根**：pivot_root/chroot 把 `/` 钉在镜像 rootfs 上，宿主机路径够不到。
11. **雪球 11 USER**：默认共享，容器 root == 宿主 root；userns-remap 才隔离。
12. **雪球 12 一把尺**：`/proc/<pid>/ns/` 的 inode 判同（配 `lsns`），八种 namespace 一屏收全。

**思考题**：使用 `--network=host` 时，容器还会创建独立的 Network Namespace 吗？这对端口冲突和安全边界有何影响？提示：拿雪球 12 的尺子去量，`net -> net:[...]` 的编号会和谁相同？再进一步：`--uts=host` 和 `--network=host` 各拆哪面墙，两个一起给会怎样？

下一篇：[《进程视角看容器——从两边 ps 对不上号，滚到亲手杀掉 PID 1》](/云原生/docker/docker-19-process-view)——把雪球 2 的两套 PID、雪球 3 的 shim，在排障现场用透。

---

## 参考资料

- [namespaces(7) 手册](https://man7.org/linux/man-pages/man7/namespaces.7.html)——八种 namespace 与 flags 的权威对照
- [clone(2) 手册](https://man7.org/linux/man-pages/man2/clone.2.html)——`CLONE_NEW*` flags 语义
- [pivot_root(2) 手册](https://man7.org/linux/man-pages/man2/pivot_root.2.html)、[chroot(2) 手册](https://man7.org/linux/man-pages/man2/chroot.2.html)
- [Docker 官方：Isolate containers with a user namespace](https://docs.docker.com/engine/security/userns-remap/)（userns-remap 的配置与代价）
- 本机：WSL2 Ubuntu-22.04 + Docker 29.1.3 + busybox:latest + iptables v1.8.7（legacy）
