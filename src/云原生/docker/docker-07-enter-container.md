---
title: 进入 Docker 容器的四种方式——以及六大命名空间
sidebarGroup: Docker 系列
shortTitle: 07 进入容器四法
order: 7
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Namespace
  - nsenter
description: 进入 Docker 容器的四种方式——以及六大命名空间
---

> **Docker 系列 · 第 7/23 篇**  
> 上一篇：[《容器日常命令》](/云原生/docker/docker-06-container-commands)  
> 下一篇：[《Docker 本地镜像载入与载出》](/云原生/docker/docker-08-image-transfer)

---

## 开头：容器跑起来了，怎么进去排障？

凌晨 2 点，告警说某个微服务容器「连不上数据库」。你 `docker ps` 看到容器还在跑，但 `curl` 健康检查失败。

接下来你要做三件事：

1. **进到容器里** —— 看进程、看配置、看日志
2. **在宿主机上对照** —— 容器里的 PID 1 在宿主机上是几号进程？
3. **必要时只进网络命名空间** —— 用宿主机的 `ping`、`tcpdump` 调试容器网络

Docker 提供了多种「进入容器」的手段，适用场景各不相同。本文梳理四种方式，**详解 `nsenter`（是什么/能做什么/怎么做/边界，附本机真实实测）**，并把 Docker 隔离依赖的 Linux 命名空间**逐个讲透**（共 8 种，含 Docker 默认启用情况与实测证据）。

---

## 一、方式 1：`docker attach`

`docker attach` 可以附加到**已在运行的容器**的标准输入/输出/错误流上。

```bash
# 先启动一个守护态容器
docker run -itd ubuntu:14.04 /bin/bash

# 查看容器 ID
docker ps

# 附加到容器
docker attach <容器ID>
```

### 局限性

- **多窗口同步**：多个终端同时 `attach` 同一容器时，所有窗口输出同步；一个窗口阻塞，其他窗口也无法操作
- **不适合生产**：更适合本地开发调试

---

## 二、方式 2：SSH 进入容器

传统做法是在镜像里安装 SSH Server，多人通过 SSH 登录，互不干扰。

**不推荐在 Docker 场景使用**：

- 容器设计理念是「一个进程/一组紧密相关进程」，SSH 守护进程增加复杂度
- 镜像体积变大，攻击面扩大
- 官方推荐用 `docker exec` 或 `nsenter`

---

## 三、方式 3：`nsenter`——在容器的命名空间里执行命令（详解 + 本机实测）

### 3.1 前置知识：命名空间，两句话说清

> 🔗 如果下列概念（/proc、命名空间、系统调用、capabilities）有陌生的，可先看 [Linux 板块开篇：《用西蒙学习法拆解 nsenter——前置知识地图》](/Linux/basics/linux-01-nsenter-prerequisites)——把前置知识拆成 7 个组块，每块配验证命令。

**第一句**：Linux 允许给一组进程指定一套「独立配置」——独立的主机名、独立的网卡/IP/端口、独立的进程编号表、独立的文件系统视图、独立的进程间通信资源。每套独立配置，叫做一个**命名空间（namespace）**。

**第二句**：容器不是虚拟机。容器里的进程就是宿主机上的普通进程，区别只有一个——Docker 为它们创建了一整套新的命名空间。于是容器里的程序查询主机名、网卡、进程列表时，读到的都是这套新命名空间的数据，看起来就像运行在一台独立机器上。

在此基础上，nsenter 的定义只有一行：

> **nsenter：让你在宿主机上执行的一条命令，运行在指定进程的命名空间配置下。**

也就是说，命令本身还是宿主机的程序（用宿主机安装的工具），但它执行时读取的主机名、网卡、进程表、文件系统，全部换成目标进程的那一套。

### 3.2 完整排障演示：容器连不上数据库，怎么办

以下命令与输出全部来自本机真实运行（环境：WSL2 Ubuntu 22.04 / 内核 6.6.87.2 / Docker 29.1.3 / util-linux 2.37.2）。测试容器特意选 `alpine:3.20`——它几乎没有预装任何排障工具，用来模拟生产里的精简镜像。

**第 1 步：先试 `docker exec`——失败，镜像里没有工具**

```bash
$ docker run -d --name ns-demo alpine:3.20 sleep infinity   # 模拟"微服务"
$ docker exec ns-demo ss        # 想查端口监听情况
OCI runtime exec failed: exec failed: unable to start container process:
exec: "ss": executable file not found in $PATH
```

`docker exec` 的原理是把命令**送进容器里执行**，所以命令必须容器里本来就有。生产镜像为了体积，普遍不带 ss、tcpdump 甚至 shell——这条路走不通。

**第 2 步：拿到容器进程在宿主机上的 PID**

nsenter 不需要容器里有东西，它只需要知道「目标进程在宿主机上的编号」。Docker 直接提供：

```bash
$ PID=$(docker inspect -f '{{.State.Pid}}' ns-demo)
$ echo $PID
101646
$ ps -o pid,ppid,cmd -p $PID          # 宿主机上确认：普通进程一个
    PID    PPID CMD
 101646  101622 sleep infinity
$ ps -o pid,cmd -p 101622             # 看它的父进程
    PID    CMD
 101622 /usr/bin/containerd-shim-runc-v2 -namespace moby -id 83ecc6fa...
```

结论很直白：容器里的 1 号进程，就是宿主机上编号 101646 的 `sleep`；它的父进程是 containerd-shim（[第 2 篇](/云原生/docker/docker-02-engine-platform)讲的架构，这里得到实证）。后面所有命令都用这个 101646。

**第 3 步：只切换网络——查看容器的网卡**

```bash
$ ip -br addr | head -4                       # 先看宿主机自己的（节选）
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0             UP             172.22.212.111/20 fe80::215:5dff:fe22:df4b/64
br-232b31f9d168  DOWN           172.19.0.1/16
docker0          UP             172.17.0.1/16 fe80::22:29ff:fe0a:fd2a/64

$ nsenter -t 101646 -n ip -br addr           # -n = 只切换网络命名空间
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0@if127       UP             172.17.0.2/16
```

读这条命令：`-t 101646` 指定目标进程，`-n` 表示只把**网络**切换成它的，然后执行 `ip addr`。结果：宿主机的 ip 命令（我们的工具）读到了**容器的**网络配置——一张 lo、一张 172.17.0.2 的 eth0。`eth0@if127` 里的 `@if127` 表示这是一对虚拟网卡（veth）的一端，另一端是宿主机的 127 号接口，接在 docker0 网桥上。**排障价值**：容器里没有 ip/ping/tcpdump 也没关系，我们可以用宿主机的这些工具，检查容器的网络。

**第 4 步：查端口——宿主机上根本看不到容器的监听**

在容器里启动一个 8080 监听，两边对照：

```bash
$ docker exec -d ns-demo nc -l -p 8080        # 容器里监听 8080

$ ss -tln | grep 8080                          # 宿主机上查：查不到
（无输出）
$ nsenter -t 101646 -n ss -tln                 # 切换到容器网络再查：找到了
State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process
LISTEN 0      1                  *:8080            *:*
```

这就是「连不上数据库」类问题的标准排查姿势：端口和连接属于网络命名空间，**宿主机的 ss/netstat 天生看不到容器内的监听和连接**，必须切到容器的网络里查。

还有一个细节值得注意：输出里 `Process` 列是**空的**。因为我们只切换了网络、没切换进程编号表，ss 查得出端口，却无法把端口对应到「另一套编号体系里的进程」。想让它显示进程，把 `-p` 一起加上。

**第 5 步：多切几项，得到完整的容器内视角**

想看容器的进程列表和文件系统，加 `-m`（文件系统）和 `-p`（进程编号表）：

```bash
$ nsenter -t 101646 -m -p -- ps -ef
PID   USER     TIME  COMMAND
    1 root      0:00 sleep infinity
   13 root      0:00 nc -l -p 8080
   19 root      0:00 ps -ef

$ nsenter -t 101646 -m -- ls /
bin  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

同一个 `sleep` 进程：宿主机视角编号 101646，容器视角编号 1。`ls /` 看到的也是容器自己的 Alpine 文件系统。到这里，我们看到的和 `docker exec` 进去看到的完全一致——但用的全是宿主机的工具。注意 `ps` 这条必须 `-m -p` 同时给：只给 `-p` 时，ps 读取的还是宿主机的 `/proc` 文件，看到的仍是宿主机进程表。

**第 6 步：必须知道的边界——资源限制不会跟着切换**

nsenter 能切换的只有上面这些「命名空间」；**cgroup（CPU/内存限额）不在切换范围内**。验证：

```bash
$ cat /proc/101646/cgroup                # 容器进程的真实 cgroup 位置
0::/system.slice/docker-83ecc6fa0c4a....scope

$ nsenter -t 101646 -n cat /proc/self/cgroup   # 切换后，我们自己呢？
0::/
```

切换后我们的命令运行在宿主机的根 cgroup 里，**不受容器资源限额约束**。两面性：好处是排障工具不会被容器的限额卡死；风险是在容器网络里跑大流量 tcpdump 时，消耗的是宿主机资源——使用要有节制。

### 3.3 复盘：nsenter 的完整用法

**命令读法**（一条命令三个部分）：

```
nsenter -t 101646 -n -- ss -tln
        └──┬───┘  └┬┘
        目标进程是哪个  切换哪些命名空间   执行什么（工具来自宿主机）
```

**三步用法**：

```bash
# ① 拿到容器首进程的宿主机 PID
docker inspect -f '{{.State.Pid}}' <容器名>

# ② 按需选择切换项
#    -m 文件系统   -u 主机名   -i 进程间通信
#    -n 网络       -p 进程编号表

# ③ 执行（不带命令则启动一个 shell）
sudo nsenter -t <PID> -m -u -i -n -p          # 全部切换 = 等效"进入容器"
sudo nsenter -t <PID> -n -- ss -tln           # 只切网络，查端口
```

**安装**：主流发行版的 util-linux 预装就有，先确认（本机实测输出）：

```bash
$ nsenter --version
nsenter from util-linux 2.37.2
```

没有则 `apt install util-linux`（RHEL 系用 yum）；源码编译仅在 util-linux < 2.23 的极老系统才需要。

**历史**：nsenter 比 `docker exec` 资历更老——Docker 1.3（2014）之前，官方推荐的进容器方式就是基于它的脚本 [jpetazzo/nsenter](https://github.com/jpetazzo/nsenter)。`exec` 出现后日常运维让位，但 nsenter 的底层调试能力无可替代。

### 3.4 什么时候用它：与 `docker exec` 的分工

| | `docker exec` | `nsenter` |
|---|---------------|-----------|
| 原理 | 把命令送进容器内执行 | 让命令在容器的命名空间下执行 |
| 工具来源 | 必须容器里有 | 用宿主机的（scratch/distroless 镜像也能排障） |
| 切换粒度 | 全部命名空间 | 任意子集（可以只切网络） |
| cgroup | 在容器限额内运行 | 在宿主机 root cgroup 内（不受容器限额） |
| 依赖 daemon | 是（dockerd 挂了不可用） | 否（只要容器进程还在） |
| 权限要求 | docker 客户端权限 | root 或 `CAP_SYS_ADMIN` |
| 定位 | 日常运维 | 底层调试、应急排障 |

典型场景：精简镜像无排障工具（第 1 步的问题）；容器没有 shell；dockerd 异常但容器仍在运行；只想抓容器网络包（`nsenter -n tcpdump`）；对照容器内外的进程/网络视图。

---

## 四、容器隔离的命名空间：逐个讲透

> 依据：[man7.org namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)（man-pages 6.18，2026-02 版）及各子手册，全部结论在本机（内核 6.6）验证。

### 4.0 总览：Linux 有 8 种命名空间，Docker 默认用几种

内核手册的权威定义：**命名空间把一个全局系统资源包装成抽象，让组内进程以为自己拥有该资源的独立实例**——对组内进程可见，对组外不可见。Linux 现共有 **8 种**：

| Namespace | Clone 标志 | 隔离的资源 | 内核版本 |
|-----------|-----------|-----------|---------|
| Mount | `CLONE_NEWNS` | 挂载点 | 2.4.19 |
| UTS | `CLONE_NEWUTS` | 主机名 / NIS 域名 | 2.6.19 |
| IPC | `CLONE_NEWIPC` | SysV IPC、POSIX 消息队列 | 2.6.19 |
| PID | `CLONE_NEWPID` | 进程 ID | 2.6.24 |
| Network | `CLONE_NEWNET` | 网卡、协议栈、端口 | 2.6.29 |
| User | `CLONE_NEWUSER` | UID / GID | 3.8 |
| Cgroup | `CLONE_NEWCGROUP` | cgroup 根目录 | 4.6 |
| Time | `CLONE_NEWTIME` | boot/monotonic 时钟 | 5.6 |

Docker 每个容器默认创建**私有的前六种**（mnt/uts/ipc/pid/net + **cgroup**——较新版本在 cgroup v2 主机上默认启用，[Docker 20.10 起](https://serverfault.com/questions/1001203/why-does-docker-use-the-same-user-and-cgroup-namespaces-by-default-when-startin)）；**user 和 time 默认不隔离**（与宿主机共用 initial 命名空间）。本机可以直接验证——列出容器进程（PID 101646）持有的全部命名空间句柄：

```bash
$ ls -l /proc/101646/ns/ | awk '{print $1, $9, $10, $11}'
lrwxrwxrwx cgroup -> cgroup:[4026532234]
lrwxrwxrwx ipc    -> ipc:[4026532232]
lrwxrwxrwx mnt    -> mnt:[4026532223]
lrwxrwxrwx net    -> net:[4026532235]
lrwxrwxrwx pid    -> pid:[4026532233]
lrwxrwxrwx pid_for_children -> pid:[4026532233]
lrwxrwxrwx time   -> time:[4026531834]
lrwxrwxrwx time_for_children -> time:[4026531834]
lrwxrwxrwx user   -> user:[4026531837]
lrwxrwxrwx uts    -> uts:[4026532224]
```

**判定「两个进程是否在同一个命名空间」的标准方法**（手册规定）：比较 `/proc/<pid>/ns/xxx` 符号链接的**设备号 + inode 号**——编号相同就是同一个。对照宿主机 shell：

```bash
$ readlink /proc/self/ns/uts    # 宿主机
uts:[4026532218]
$ readlink /proc/101646/ns/uts  # 容器
uts:[4026532224]                 # ← 编号不同：UTS 各自独立

$ readlink /proc/self/ns/net
net:[4026531840]
$ readlink /proc/101646/ns/net
net:[4026532235]                 # ← 编号不同：NET 各自独立
```

结论一目了然：容器的 cgroup/ipc/mnt/net/pid/uts 句柄编号都是**新的**（各自独立），而 `user:[4026531837]`、`time:[4026531834]` 与宿主机的 initial 命名空间编号相同——**user 和 time 默认没有隔离**。

### 4.1 PID 命名空间：进程号的「平行宇宙」

**机制**：每个 pid ns 是一棵独立的进程号树；同一进程在不同层级里有不同的编号。ns 之间**可嵌套**——子 ns 里的进程能看见祖先 ns 的进程，反之不行（祖先看子孙要用不同编号）。

**容器中的表现**（3.2 节第 5 步）：

- 容器内 `sleep infinity` 是 **PID 1**，宿主机上是 101646；
- PID 1 特殊性：它是容器内所有孤儿进程的收养者，且对未注册 handler 的信号有**不按默认行为退出的例外规则**——这也是「容器内 PID 1 挂了容器就退出」的根源；
- 手册细节：`/proc/<pid>/ns/` 里还有一个 `pid_for_children`——进程可以给**未来的子进程**指定另一个 pid ns（nsenter/docker exec 进入新 pid ns 就是这个原理），自身所属的 pid ns 终身不可变。

**坑**：容器内 `ps` 看不到容器外进程（前提是容器的 `/proc` 挂载正确）；反过来宿主机能看到容器全部进程，只是编号不同。想以容器内编号视角调试，用 `nsenter -m -p`。

### 4.2 Network 命名空间：独立网络栈

**机制**：每个 net ns 拥有独立的一套：网络设备、IPv4/IPv6 协议栈、IP 地址、路由表、防火墙规则、`/proc/net`、端口号空间。**新建 net ns 时里面只有一张 down 状态的 `lo`**——什么都没有，需要外部接线。

**容器中的表现**（3.2 节第 3、4 步）：

- Docker 的标准接法：创建 **veth pair**，一端留在宿主机挂到 **docker0 网桥**，另一端塞进容器 net ns 命名 `eth0`——第 3 步里 `eth0@if127` 的 `@if127` 就是对端接口编号；
- 端口隔离的直接证据：容器监听 8080，宿主机 `ss` 看不到（第 4 步）——「端口冲突」只在同一个 net ns 里才成立，这也是容器能同时起几百个 nginx 的原因；
- `-p 8080:80` 端口映射的本质：宿主机 net ns 里的 iptables DNAT / docker-proxy 把流量转进容器 net ns。

**坑**：跨 net ns 抓包必须在目标 ns 里抓（`nsenter -n tcpdump`），宿主机 `tcpdump -i any` 抓到的是转发前的流量。

### 4.3 IPC 命名空间：进程间通信的边界

**机制**：隔离 System V 信号量/共享内存/消息队列和 POSIX 消息队列。每个 IPC 资源带命名空间信息，不同 ns 里的资源互相不可见、也**不能互相操作**。

**容器中的表现**：

- 容器 A 里的进程和容器 B 里的进程**无法**通过 SysV 共享内存通信——尽管它们在宿主机上是同一颗进程树；
- 与 VM 的微妙区别：同一容器**内部**的多个进程用 IPC 完全正常（它们本来就在同一个 IPC ns）；
- 手册补充：IPC ns 的存活可被对应 `mqueue` 文件系统的挂载「钉住」。

**坑**：某些科学计算/老应用依赖 `/dev/shm`，容器里默认只有 64MB——`--shm-size` 调的就是这个 ns 里的共享内存上限。

### 4.4 Mount 命名空间：文件系统视图

**机制**：创建新 mount ns 时**复制一份当时的挂载树**，此后各自修改互不影响（写时复制）。与 `chroot` 的本质区别：mount ns 只在 `/proc/mounts` 里**显示本空间的挂载点**，而 chroot 只是改了根目录、挂载信息仍全局可见。

**容器中的表现**（3.2 节第 5 步）：

- 容器 rootfs 就是 mount ns 里的一棵独立挂载树：镜像层（只读）+ 容器层（可写）联合挂载（UnionFS，见[第 14 篇](/云原生/docker/docker-14-unionfs)）；
- runc 启动容器的最后一步 `pivot_root()` 把进程根目录切到这棵树上；
- 容器里的挂载传播属性（`private/shared/slave`）决定了挂载事件会不会「漏」到宿主机——Docker 默认 `private`。

**坑**：nsenter 时若只给 `-m` 不给 `-p`，`ps` 读的是宿主机 `/proc`；`-m -p` 都给，看到的才是容器视角（3.2 节第 5 步特意两个都给了）。

### 4.5 UTS 命名空间：主机名

**机制**：UTS（UNIX Time-sharing System）ns 隔离 `hostname` 和 `domainname` 两个系统调用。是 8 种 ns 里最简单的一种——就两个字符串。

**容器中的表现**：

```bash
$ hostname                          # 宿主机
pc3507
$ nsenter -t 101646 -u hostname     # 切到容器的 UTS ns 再执行
83ecc6fa0c4a
```

容器 hostname 默认是容器 ID 前 12 位；`--hostname` 参数改的就是它。价值在于：让集群里的容器在网络上「自报家门」时像独立节点——Hadoop/Kafka 这类依赖 hostname 的应用能跑进容器，全靠它。

### 4.6 User 命名空间：UID 映射（Docker 默认不开）

**机制**：最复杂的一种。ns 内外通过 **uid/gid 映射表**对应：容器里的 root（uid 0）可以映射到宿主机上的普通用户；且一个进程在 user ns 内拥有完整 capabilities，出了 ns 就没有——「容器内称王，宿主机是平民」。

**三个手册要点**：

- Linux 3.8 起**创建 user ns 不需要任何特权**（其他 ns 都要 `CAP_SYS_ADMIN`）——无 root 也能跑「伪 root」容器；
- user ns 可以嵌套（最多 32 层）；
- user ns 可以「拥有」其他 ns——后者里的特权只在映射范围内有效。

**Docker 的现状**：**默认不启用**（4.0 的实测：容器的 user 句柄与宿主机编号相同）。要开需配置 daemon 级的 [`userns-remap`](https://docs.docker.com/engine/security/userns-remap/)——开完后所有容器默认带 user ns（可按容器关闭）。收益是容器逃逸后拿到的只是宿主机无名用户；代价是文件权限、卷挂载、部分镜像的兼容性问题，所以不少生产环境权衡后不开。

### 4.7 Cgroup 命名空间：第七个（现代 Docker 默认）

很多老教材说「六大命名空间」，**这个说法过时了**：内核 4.6 加入 cgroup ns，Docker 20.10 起在 cgroup v2 主机上**默认启用**——现代容器默认是**七个**私有 ns。

**机制**：只隔离一件事——**cgroup 根目录的视图**。创建 cgroup ns 时，进程当前所在的 cgroup 目录成为它眼中的根。

**容器中的表现**（本机实测）：

```bash
$ cat /proc/101646/cgroup                     # 宿主机视角：真实路径
0::/system.slice/docker-83ecc6fa0c4a....scope
$ docker exec ns-demo cat /proc/self/cgroup   # 容器内视角：被虚拟化成根
0::/
```

容器进程实际在 `system.slice/docker-xxx.scope` 深处，容器内看到的却是根 `/`——干净得像在独立机器上。价值：容器内读取自身 cgroup 路径的工具（systemd、Java 的 `-XX:+UseContainerSupport` 探测）拿到的是虚拟化路径，避免泄漏宿主机 cgroup 布局。

### 4.8 Time 命名空间：第八个（Docker 默认不用）

内核 5.6 加入的最新成员。隔离的是 **`CLOCK_MONOTONIC` 与 `CLOCK_BOOTTIME`** 两个时钟——允许给 ns 设置时间偏移，让进程「以为」系统已运行多久。**不隔离墙上时钟**（`CLOCK_REALTIME`，即 `date` 看到的时间全局一致），且偏移只能**向前**设置。典型用途：容器检查点/恢复（CRIU）后修正单调时钟，或让测试进程看到「已经运行了 30 天」。

Docker **默认不启用**；Podman 等运行时可用 `--time` 开启。日常开发用不到，知道它存在即可。

### 4.9 命名空间的生命周期

手册规定：**ns 内最后一个进程退出（或离开）时，ns 自动销毁**——除非被「钉住」：有指向 `/proc/<pid>/ns/*` 的打开 fd 或 bind mount、有子 ns 存在、PID ns 对应的 `/proc` 挂载还在等。nsenter 会话期间就持有目标 ns 的 fd，这也是它稳定可用的原因。

**容器的本质是进程**——shim 跑在特定 namespace 和 cgroup 下，以为自己在一台独立机器上（与第六节的进程树相互印证）。


## 五、方式 4：`docker exec`（推荐）

Docker 1.3+ 提供 `exec`，是**生产环境最常用**的进入方式：

```bash
docker exec --help

# 进入交互式 shell
docker exec -it <容器ID> /bin/bash

# 在容器内执行单条命令
docker exec -it rmqbroker-ha-b /bin/bash -c "ps -ef"
```

优点：

- 不依赖 attach 的 IO 共享问题
- 每次 exec 启动新进程，多人可同时操作
- 可指定进入容器的 PID 命名空间执行应用

---

## 六、容器内外进程对照

### 6.1 容器内看进程

```bash
docker exec -it rmqbroker-ha-b /bin/bash
ps -ef
```

容器内 PID 1 通常是启动命令（如 `sh mqbroker -c /opt/rocketmq.../broker.conf`），具有特殊意义——容器生命周期与 PID 1 绑定。

### 6.2 宿主机看同一批进程

```bash
docker top rmqbroker-ha-b
```

示例输出：容器内 PID 1 的 `mqbroker` 进程，在宿主机上可能是 PID 3473。

### 6.3 三个关键命令

```bash
docker top rmqbroker-ha-b    # 从宿主机看容器进程
ps -ef | grep 3401           # 查看父进程 containerd-shim
ps aux | grep 3473           # 查看子进程（容器内应用）
```

### 6.4 进程树关系

`docker run` 启动容器时，Docker 会为每个容器启动 **containerd-shim-runc-v2** 作为父进程：

```
containerd-shim-runc-v2  (宿主机 PID 3401)
  └── sh mqbroker ...     (宿主机 PID 3473，容器内 PID 1)
```

- `namespace` 参数：命名空间隔离
- `cgroup` 参数：资源限制

**容器的本质是进程**——shim 跑在特定 namespace 和 cgroup 下，以为自己在一台独立机器上。

---

## 七、四种方式对比

| 方式 | 适用场景 | 生产推荐 |
|------|----------|----------|
| `docker attach` | 本地快速调试 | ❌ |
| SSH | 传统 VM 思维 | ❌ |
| `nsenter` | 网络/命名空间级调试 | ⚠️ 高级场景 |
| `docker exec` | 日常运维、排障 | ✅ |

---

## 下篇预告

**第 8 篇：《Docker 本地镜像载入与载出》**

- `docker save` / `docker load` 与 `docker export` / `docker import` 的区别
- 离线搬运镜像、`docker tag` 重命名

---

## 思考题

> 容器里没有 `ping` 命令，你如何测试它能否访问外网？（提示：`nsenter -n`）

欢迎在评论区留下你的做法。下一篇见 🐳

---

## 参考资料

- [namespaces(7) - Linux man page（man7.org，man-pages 6.18）](https://man7.org/linux/man-pages/man7/namespaces.7.html) 及各子页：pid_namespaces(7)、network_namespaces(7)、mount_namespaces(7)、user_namespaces(7)、cgroup_namespaces(7)、time_namespaces(7)
- [Docker 官方文档：Isolate containers with a user namespace](https://docs.docker.com/engine/security/userns-remap/)
- [Datadog Security Labs：Container Security Fundamentals](https://securitylabs.datadoghq.com/articles/container-security-fundamentals-part-2/)
- [jpetazzo/nsenter（历史上第一个 Docker 进容器方案）](https://github.com/jpetazzo/nsenter)
- 本文实测环境：WSL2 Ubuntu 22.04（内核 6.6.87.2）/ Docker 29.1.3 / util-linux 2.37.2，测试镜像 `alpine:3.20`
