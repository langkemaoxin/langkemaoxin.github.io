---
title: CGroups 限资源——给同一个容器逐项上枷锁（师生对话实录）
sidebarGroup: Docker 系列
shortTitle: 21 CGroups 限资源
order: 21
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - CGroups
  - 对话实录
description: 师生对话实录课：0 基础学生与教学大师给同一个容器逐项上枷锁——--cpus、绑核、-m、--pids-limit、pause 逐项实测，cpu.max / memory.max / pids.max / cgroup.freeze 看到底，实验全部 WSL 实机真跑。
---

> **Docker 系列 · 第 21/33 篇**
> 上一篇：[《Namespace 隔离——从一个容器里的怪现象滚穿六大命名空间》](/云原生/docker/docker-20-namespace) · 下一篇：[《从零理解 Docker 镜像分层——两个目录叠出一个文件系统（师生对话实录）》](/云原生/docker/docker-22-unionfs)

---

## 写在前面

第 20 篇把 Namespace 摸了个遍，我以为容器的隔离算是学完了。结果上周生产出了个事故，把这份自信砸了：同一台 16C/64G 的机器上跑了 8 个微服务容器，其中一个 Java 服务内存泄漏，RSS 一路涨——**最后整机触发 OOM Killer，把旁边一个关键进程误杀了，全线告警**。

不对啊，容器不是隔离的吗？泄漏的那个容器，怎么把手伸到隔壁去了？

所以继续用对话的老办法：**让 AI 当老师，我当学生，每课只讲一个概念，我有问题就打断，没问题就继续**。主线就一件事：起一个什么都不限的容器 `lab-box`，然后给它**逐项上枷锁**——CPU、绑核、内存、进程数、freezer，每一道锁当场上、当场看到效果，一路看到内核文件里那几行数字。

课程路线图（走到哪算哪）：

> ① Namespace 管不了的事 → ② 找到档案袋 → ③ 白纸状态 → ④ CPU 配额锁 → ⑤ 绑核锁 → ⑥ 内存锁（OOM） → ⑦ 内存账本 → ⑧ 进程数锁（fork 炸弹） → ⑨ 出生戴锁与 Compose → ⑩ freezer 暂停

环境：WSL2 Ubuntu-22.04（root，内核 6.6.87.2-microsoft-standard-WSL2）+ Docker 29.1.3，cgroup v2 + systemd 驱动。官方入口：[资源限制指南](https://docs.docker.com/engine/containers/resource_constraints/)、[内核 cgroup v2 文档](https://docs.kernel.org/admin-guide/cgroup-v2.html)。

---

## 第 1 课：Namespace 管视图，谁管「能用多少」

**🧑‍🏫 老师：**

先把你事故的根因说破：**Namespace 只隔离视图**——你看见几张网卡、哪些进程，它说了算；但 CPU 还是同一颗、内存还是同一块，「互不知情」的容器照样争抢物理资源。泄漏容器的内存涨穿时，内核一看整机内存不够，掏出 OOM Killer 全机找「最肥」的进程杀——它不管 Namespace，隔壁那个关键进程就这么被误杀了。

管「能用多少」的是内核另一套机制：**Cgroups（Control Groups）**。分工钉成一张表，全篇都在用：

| 机制 | 回答的问题 | 典型场景 |
|------|------------|----------|
| **Namespace**（第 20 篇） | 能看见谁、能访问哪些视图 | 进程列表、网络栈、挂载点 |
| **Cgroup** | 能用多少物理资源 | CPU 50%、内存 1G、进程数 12 |

现在起本篇的主角——一个什么都不限的 alpine，主进程 `sleep infinity`（它不会退场，整篇都在它身上做实验）：

```bash
docker run -d --name lab-box alpine sleep infinity
```

看它身上有没有锁：

```bash
docker inspect lab-box --format 'CpuQuota={{.HostConfig.CpuQuota}} Memory={{.HostConfig.Memory}} PidsLimit={{.HostConfig.PidsLimit}} NanoCpus={{.HostConfig.NanoCpus}}'
docker inspect lab-box --format 'Status={{.State.Status}} Pid={{.State.Pid}} OOMKilled={{.State.OOMKilled}}'
docker stats --no-stream lab-box
```

```text
CpuQuota=0 Memory=0 PidsLimit=<no value> NanoCpus=0
Status=running Pid=67770 OOMKilled=false
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT   MEM %     NET I/O      BLOCK I/O    PIDS
f850167d38f4   lab-box   0.00%     504KiB / 7.757GiB   0.01%     516B / 126B   1.36MB / 0B   1
```

三行各说一件事：

- `CpuQuota=0 Memory=0 PidsLimit=<no value>`——CPU、内存、进程数，一个限制都没有；
- `Pid=67770`——它在宿主机上的进程号，第 2 课靠它找 cgroup；
- **`504KiB / 7.757GiB`**——能用多少内存？**整台机的 7.757GiB**。

第三行就是你事故的伏笔：一个「没锁」的容器，能用的上限就是整机。它一旦失控，和裸进程没区别。

> 一句话收口：**Namespace 管「看见什么」，Cgroup 管「能用多少」；没锁的容器上限是整机，失控就拖垮邻居。**

---

## 第 2 课：在宿主机上找到它的档案袋

**🧑‍🎓 学生：** 那 Cgroup 长什么样？是个命令？还是个服务？

**🧑‍🏫 老师：**

都不是，它是一个**挂出来的伪文件系统**——像 `/proc` 一样，「文件」其实是内核数据结构的出口。看它挂在哪、什么版本：

```bash
mount | grep cgroup
stat -f -c %T /sys/fs/cgroup
```

```text
cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime,nsdelegate)
cgroup2fs
```

`cgroup2` / `cgroup2fs` 指的都是 **cgroup v2**：整棵树只有一个统一层级，挂在 `/sys/fs/cgroup` 一个位置。（v1 长什么样、为什么老教程路径完全不同，文末「历史包袱」专门讲。）

Cgroup 的心智模型一句话：**内核把一组进程装进同一个「档案袋」，统一统计、统一限制**。顺着第 1 课的 Pid 找 lab-box 被装进了哪个袋子——每个进程的 `/proc/<pid>/cgroup` 记着它的袋子位置：

```bash
cat /proc/67770/cgroup
```

```text
0::/system.slice/docker-f850167d38f4a7124774c55d51d3c748ea53244844aaf58a163c41f019dc0458.scope
```

`0::` 是 v2 的统一层级标记，后面是它在树上的位置：

```text
/sys/fs/cgroup                          ← 整棵树的根
└── system.slice/                       ← systemd 管的系统服务区
    └── docker-f850167d38f4….scope      ← lab-box 专属的档案袋
```

（`system.slice`、`.scope` 这些名字是 systemd 起的——Docker 的 cgroup 驱动是 systemd。）打开袋子看看里面装了什么：

```bash
ls /sys/fs/cgroup/system.slice/docker-f850167d38f4a7124774c55d51d3c748ea53244844aaf58a163c41f019dc0458.scope
```

```text
cgroup.controllers      cgroup.freeze     cgroup.procs      cgroup.type
cpu.idle   cpu.max   cpu.max.burst   cpu.stat   cpu.weight
cpuset.cpus   cpuset.mems   …
hugetlb.1GB.current   …
（节选，实际约 60 个文件）
```

两大类：`cgroup.*` 管「袋子本身」（谁在袋里、层级、冻结状态），`cpu.*` / `memory.*` / `pids.*` 管资源额度——每类资源叫一个**控制器（controller）**。本机内核支持这些：

```bash
cat /sys/fs/cgroup/cgroup.controllers
```

```text
cpuset cpu io memory hugetlb pids rdma
```

> 一句话收口：**Cgroup = 挂在 /sys/fs/cgroup 的伪文件系统；每个容器一个 `docker-<id>.scope` 档案袋，额度就是袋子里的普通文件。**

---

## 插问 1：Docker 是不是自己实现了一个资源调度器？

**🧑‍🎓 学生：** 我看网上说 Docker 能限 CPU 限内存——它是改了内核调度器，还是自己写了一套分配逻辑？

**🧑‍🏫 老师：**

都没有，Docker 的角色是**填表员**。看它每次起容器时干的三步：

1. 请 systemd 建目录 `docker-<id>.scope`——就是刚才 ls 的那个袋子；
2. 把容器主进程的 PID 写进 `cgroup.procs`——进程入袋；
3. 把 `--cpus`、`-m` 这些参数**换算后写进袋子里的文件**——`cpu.max`、`memory.max` 等。

写完就完事。真正盯着配额、执行限制的**裁判是内核**——调度器每个周期核账，超了就掐。所以第 19 篇那句话在这里又应验了一次：道具（cgroup）全是内核的，Docker 做的是封装。

也正因如此，生产上不推荐手改这些文件——绕过 Docker 的填写，配置就不在 `docker inspect` / Compose / K8s 的账面上了，排查时会懵。正路是参数、Compose、K8s resources（第 9 课演示）。这套东西和 LXC 的关系也顺一句：内核 Cgroup 落地 → LXC 拼装 → Docker 再封装加生态——没有 Cgroup，「多租户同机」的模型根本立不住。

> 一句话收口：**Docker 只填表（建袋子、装进程、写额度），内核才是执行限额的裁判；别手改 cgroup 文件，走参数声明。**

---

## 第 3 课：钻进容器，看它自己的白纸状态

**🧑‍🎓 学生：** 袋子在宿主机上找到了。那容器**自己**眼里，cgroup 长什么样？

**🧑‍🏫 老师：**

三个文件各 cat 一眼：

```bash
docker exec lab-box cat /proc/1/cgroup
docker exec lab-box cat /sys/fs/cgroup/cpu.max
docker exec lab-box cat /sys/fs/cgroup/cgroup.procs
```

```text
0::/
max 100000
1
19
```

三行对照宿主机侧，信息量不小：

- **`0::/`**——容器内看不到 `system.slice/docker-….scope` 那串长路径，它看见自己是**根**。因为 Docker 默认启用了 **cgroup namespace**（第 19 篇的 ns 清单里有它），把 cgroup 视图也隔离了；
- **`max 100000`**——这就是「还没上锁」的白纸状态：`max` 表示没配额，`100000` 是周期 100000 微秒（100ms）；
- **`1` 和 `19`**——袋子里的进程名单。`1` 是主进程 `sleep infinity`；`19` 是谁？——**正在跑的这条 `cat` 自己**。`docker exec` 进来的进程也进同一个 cgroup（第 24 篇会展开）。

顺带一记历史包袱：v1 时代这个「成员名单」文件叫 `tasks`，v2 改名 `cgroup.procs`。老教程让你 `cat tasks`，新机器上会找不到文件。

白纸看清楚了，下一课正式落笔。

> 一句话收口：**容器内 cgroup 视图被 cgroup namespace 隔离成根；`cpu.max = max 100000` 就是没锁的白纸；`cgroup.procs` 是袋内成员名单（v1 叫 tasks）。**

---

## 第 4 课：第一道锁——`--cpus 0.5`，CPU 封顶一半核

**🧑‍🏫 老师：**

Docker 上锁不用重建容器，`docker update` 当场改：

```bash
docker update --cpus 0.5 lab-box
docker exec lab-box cat /sys/fs/cgroup/cpu.max
docker inspect lab-box --format 'CpuQuota={{.HostConfig.CpuQuota}} CpuPeriod={{.HostConfig.CpuPeriod}} NanoCpus={{.HostConfig.NanoCpus}}'
```

```text
lab-box
50000 100000
CpuQuota=0 CpuPeriod=0 NanoCpus=500000000
```

`cpu.max` 从 `max 100000` 变成 **`50000 100000`**：每 100000 微秒（100ms）的周期里，最多用 50000 微秒 CPU 时间——50000 / 100000 = **0.5 核**。这是内核 CFS（完全公平调度器）的配额模型：v1 里拆成 `cpu.cfs_quota_us`、`cpu.cfs_period_us` 两个文件，v2 合并成一行两列。

inspect 那行藏着一个容易踩的坑：明明用了 `--cpus`，**`CpuQuota` 却还是 0**！配额记在 `NanoCpus=500000000`（0.5 核 = 5 亿纳秒/秒），由 daemon 换算成 50000/100000 写进 `cpu.max`。想直接填老字段，用 `--cpu-quota` + `--cpu-period`——第 9 课实测殊途同归。

锁上了没，得压一压才知道。容器里起**两个**死循环：

```bash
docker exec -d lab-box sh -c 'while :; do :; done'
docker exec -d lab-box sh -c 'while :; do :; done'
sleep 3
docker stats --no-stream lab-box
```

```text
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT     MEM %     NET I/O        BLOCK I/O     PIDS
f850167d38f4   lab-box   50.04%    1.648MiB / 7.757GiB   0.02%     726B / 126B    1.51MB / 0B   3
```

两个死循环，合计 **50.04%**——锁是戴在整个 cgroup 头上的。「想跑跑不了」的实锤内核也记了账：

```bash
docker exec lab-box cat /sys/fs/cgroup/cpu.stat
```

```text
usage_usec 2590795
user_usec 2487955
system_usec 102840
nr_periods 51
nr_throttled 48
throttled_usec 7396088
nr_bursts 0
burst_usec 0
```

前三是用了多少；关键是中间三个：`nr_periods 51` 个周期里，`nr_throttled 48` 个被限流，累计少跑了 `throttled_usec 7396088` 微秒。清场：

```bash
docker exec lab-box pkill -f while
docker stats --no-stream lab-box
```

```text
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT   MEM %   NET I/O        BLOCK I/O    PIDS
f850167d38f4   lab-box   0.00%     1.492MiB / 7.757GiB 0.02%   726B / 126B   1.51MB / 0B   1
```

回到 0.00%，PIDS 回到 1。

> 一句话收口：**`--cpus 0.5` → `cpu.max = 50000 100000`，锁在整个 cgroup 头上；`cpu.stat` 的 `nr_throttled` 是被限流的实锤。**

---

## 插问 2：限的是每个进程，还是袋里合计？

**🧑‍🎓 学生：** 等一下，刚才两个死循环合计 50%——所以 0.5 核是「每个进程各限 0.5」还是「所有进程加起来 0.5」？如果是合计，那我袋里 10 个进程岂不是每个只能分到 0.05？

**🧑‍🏫 老师：**

是**合计**，而且这正是 cgroup 的设计核心：**配额属于袋子，不属于进程**。`cpu.max` 里的 50000 微秒，是整个 cgroup 每个 100ms 周期的总预算——袋里 1 个进程也好、10 个也好，加起来超了就一起被摁住（throttle）。

至于「10 个进程每个分多少」，那是**袋子内部**的事，由调度器按优先级自己切——cgroup 配额不关心内部分配，只管总量。这个模型的好处在多租户：你给「这个容器」批了 0.5 核，里面跑 1 个还是 100 个进程，对宿主机来说都是 0.5 核，邻居不受影响。

回头看你刚才能观察到的细节：压测时 `stats` 的 PIDS 是 3（主进程 + 两个死循环），CPU 合计 50.04%——三个进程共享一份配额，两个吃货把预算吃光，主进程照样在袋里安然睡觉。

> 一句话收口：**配额属于袋子不属于进程：袋内进程合起来 0.5 核，内部分配调度器自己切，总量才是 cgroup 管的事。**

---

## 第 5 课：第二道锁——绑核 `--cpuset-cpus 0`

**🧑‍🎓 学生：** CPU 的「量」锁住了。能不能连「在哪个核上跑」也指定？比如我想让这个容器别碰 0 号核——那台核上跑着对延迟敏感的进程。

**🧑‍🏫 老师：**

能，而且你说的场景（给敏感进程留专用核）正是它的用途。方向反一下，演示把它**钉在 0 号核**上：

```bash
docker update --cpuset-cpus 0 lab-box
docker exec lab-box cat /sys/fs/cgroup/cpuset.cpus
docker exec lab-box grep Cpus_allowed_list /proc/1/status
```

```text
lab-box
0
Cpus_allowed_list:	0
```

两处互相印证：cgroup 文件 `cpuset.cpus` 是 `0`；主进程的 `/proc/1/status` 里 `Cpus_allowed_list` 也从原来的 `0-5`（本机 6 核）变成了 `0`——内核调度器从此只把它排上 0 号核。`cpuset` 还能绑内存节点（`cpuset.mems`），NUMA 机器上做亲和性优化用得上。

和第 4 课叠着看：**每周期 50ms 配额 + 只许在 0 号核花** = 半颗 0 号核。两把锁互不干扰，一个管总量、一个管位置。

> 一句话收口：**`--cpuset` 管「在哪跑」，`--cpus` 管「跑多少」，两把锁可叠加；`Cpus_allowed_list` 是进程侧的印证。**

---

## 第 6 课：第三道锁——`-m 128m`，内存越线就被杀

**🧑‍🏫 老师：**

CPU 超限的结果是「等」（throttle），内存超限的结果狠得多：**杀**。上锁：

```bash
docker update -m 128m --memory-swap 128m lab-box
docker exec lab-box cat /sys/fs/cgroup/memory.max
docker exec lab-box cat /sys/fs/cgroup/memory.swap.max
docker exec lab-box cat /sys/fs/cgroup/memory.high
```

```text
lab-box
134217728
0
max
```

`134217728` = 128 × 1024 × 1024，硬上限 `memory.max`；`memory.swap.max=0` 是因为把 `--memory-swap` 也设成了 128m（总盘子 = 内存，一点 swap 不给）。容器里三层水位，先记模型：

| 文件 | 本机值 | 语义 |
|------|--------|------|
| `memory.high` | `max`（没设） | 软限：越线先被限速、加回收压力 |
| `memory.max` | `134217728` | 硬限：越线进 OOM 流程 |
| `memory.swap.max` | `0` | 超出 memory.max 后允许换出的量 |

现在放一个吃内存的进程进去——往 shell 变量里灌 400MB：

```bash
docker exec lab-box sh -c 'v=$(head -c 400000000 /dev/zero | tr "\0" x); echo len=${#v}'
echo "exec exit=$?"
```

```text
exec exit=137
```

`len=` 那行根本没打出来：进程没跑到 echo 就死了。**137 = 128 + 9（SIGKILL）**。谁下的手？看 OOM 账本：

```bash
docker exec lab-box cat /sys/fs/cgroup/memory.events
```

```text
low 0
high 0
max 253
oom 7
oom_kill 1
oom_group_kill 0
```

撞线前后对比着读（之前全是 0）：`max 253`——253 次分配请求撞上 `memory.max`；`oom 7`——7 次进入 OOM 流程；`oom_kill 1`——最终杀了 1 个进程。宿主机内核日志把凶手指纹记得明明白白：

```bash
dmesg | grep -E 'oom|Killed process' | tail -2
```

```text
[7998.735622] oom-kill:constraint=CONSTRAINT_MEMCG,nodemask=(null),cpuset=docker-f850167d38f4….scope,…,task=sh,pid=69735,uid=0
[7998.735684] Memory cgroup out of memory: Killed process 69735 (sh) total-vm:145008kB, anon-rss:129664kB, …
```

两个关键点：

- **`constraint=CONSTRAINT_MEMCG`**——触发原因是 **cgroup 配额**，不是宿主机内存不够。锁只在袋子内部生效，宿主机和邻居容器毫发无损。这正是第 1 课那个事故想要的效果：泄漏的进程被杀在袋里，误伤不到隔壁；
- **`Killed process 69735 (sh) anon-rss:129664kB`**——杀的是袋里吃内存最多的大头 `sh`，死时约 126.6MB，贴着 128MiB 上限动手。

袋子本身呢？

```bash
docker inspect lab-box --format 'Status={{.State.Status}} OOMKilled={{.State.OOMKilled}} ExitCode={{.State.ExitCode}}'
```

```text
Status=running OOMKilled=true ExitCode=0
```

主进程 `sleep infinity` 活着、容器没退；但 daemon 把这次 cgroup 级 OOM 记在了容器账上（`OOMKilled=true`）。**排查时别看到 `OOMKilled=true` 就断定容器死过**，要结合 `Status` 一起读。

要是**主进程自己**就是内存泄漏呢？那就是开头 Java 堆的场景——容器会真死。一次性容器验证（PID 1 自己吃 400MB）：

```bash
docker run -m 100m --memory-swap 100m --name oom-demo alpine \
  sh -c 'v=$(head -c 400000000 /dev/zero | tr "\0" x); echo len=${#v}'
echo "run exit=$?"
docker inspect oom-demo --format 'Status={{.State.Status}} OOMKilled={{.State.OOMKilled}} ExitCode={{.State.ExitCode}}'
```

```text
run exit=137
Status=exited OOMKilled=true ExitCode=137
```

PID 1 被杀，容器退出：`exited` + `OOMKilled=true` + `ExitCode=137` 三件套——这就是第 5 篇 inspect 排障口诀里那两个字段的出处。

> 一句话收口：**`-m` 是硬限：越线内核杀袋内大头（`CONSTRAINT_MEMCG` 只伤自己）；exec 进程死了容器还在，PID 1 死了才有 `Exited (137)`。**

---

## 插问 3：CPU 超限是「等」，内存超限是「杀」，为什么不对称？

**🧑‍🎓 学生：** CPU 锁超了只是 throttle 等一等，内存锁超了直接 SIGKILL——同样是被锁，待遇差这么多？

**🧑‍🏫 老师：**

因为两种资源「超了」之后的**可挽回性**完全不同。

CPU 是**时间片**：这一周期用超了，下个周期少给你排一点就是，什么都不用恢复——等一等，天生的无损伤。所以内核选 throttle：记账、掐断、下周期再见。

内存是**空间**：进程要的这 1MB 是**现在就要**（page fault 已经发生了），你不能跟 CPU 一样说「下个周期再给」。内核能做的只有两件事：先努力**挤**——回收缓存、换出 swap（这就是 `memory.high` 软限干的活）；挤不出来了，而进程还要——那就没有「等」这个选项了，只能挑袋里最肥的杀掉，把空间腾出来。

一句话记：**可再生的资源限速，不可再生的资源拒绝分配**。网络带宽限速（排队/丢包）同 CPU，磁盘空间配额（quota 超了报 ENOSPC）同内存——都是这个规律。

> 一句话收口：**CPU 超限能等（时间片可再生 → throttle），内存超限等不了（空间挤不出 → 先回收后 OOM 杀）；可再生限速、不可再生拒绝。**

---

## 第 7 课：打开内存账本——memory.current / memory.stat

**🧑‍🎓 学生：** 第 27 篇要讲的 `docker stats` 那张表，MEM USAGE 的数字是从哪来的？监控面板上的容器内存曲线呢？

**🧑‍🏫 老师：**

数据源全在这个袋子里。总账和明细各一个文件：

```bash
docker exec lab-box cat /sys/fs/cgroup/memory.current
docker exec lab-box cat /sys/fs/cgroup/memory.stat | head -12
docker stats --no-stream lab-box
```

```text
2244608
anon 98304
file 1519616
kernel 454656
kernel_stack 16384
pagetables 65536
sec_pagetables 0
percpu 3552
sock 0
vmalloc 36864
shmem 0
file_mapped 856064
```

```text
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT   MEM %   NET I/O        BLOCK I/O     PIDS
f850167d38f4   lab-box   0.00%     1.48MiB / 128MiB    1.16%  1.2kB / 126B   3.18MB / 0B   2
```

对着读：

- `memory.current = 2244608`（约 2.1MiB）是**总账**；`memory.stat` 是**明细**：`anon` 是进程堆栈等匿名页、`file` 是文件页缓存、`kernel` 是内核花销——几类加起来约等于总账；
- `stats` 采到 1.48MiB（时刻不同略有出入），注意 **LIMIT 已经从第 1 课的 7.757GiB 变成了 128MiB**，MEM % 一栏也从没意义变成了 1.16%。

监控面板的容器内存曲线，读的就是这几个文件；OOM 复盘「内存怎么涨上去的」，也是先看这份明细——是 `anon` 涨（应用真吃内存）还是 `file` 涨（只是缓存），处置完全不同。

> 一句话收口：**`memory.current` 总账、`memory.stat` 明细，stats 与监控的数据源；OOM 复盘先分清 anon 还是 file 在涨。**

---

## 第 8 课：第四道锁——`--pids-limit 12`，进程数也上锁

**🧑‍🏫 老师：**

内存锁防「吃太多」，进程锁防 **fork 炸弹**——一行 `:(){ :|:& };:` 能瞬间铺满整机进程表，谁都起不来。上锁：

```bash
docker update --pids-limit 12 lab-box
docker exec lab-box cat /sys/fs/cgroup/pids.max
docker exec lab-box cat /sys/fs/cgroup/pids.current
```

```text
lab-box
12
3
```

上限 12，当前 3（主进程 + sh + 正在跑的 cat）。一口气 fork 30 个 sleep：

```bash
docker exec lab-box sh -c 'for i in $(seq 30); do sleep 300 & done'
```

```text
sh: can't fork: Resource temporarily unavailable
```

第 11 次 fork 被内核拒绝。数一数袋里的实际状况：

```bash
docker exec lab-box cat /sys/fs/cgroup/pids.current
docker stats --no-stream lab-box
docker exec lab-box ps
```

```text
12
CONTAINER ID   NAME      CPU %   MEM USAGE / LIMIT    MEM %   NET I/O        BLOCK I/O    PIDS
f850167d38f4   lab-box   0.00%   2.812MiB / 128MiB    2.20%  1.29kB / 126B  3.18MB / 0B  11
PID   USER     TIME  COMMAND
    1 root      0:00 sleep infinity
  121 root      0:00 [sh]
  161 root      0:00 sleep 300
  162 root      0:00 sleep 300
  …（共 10 个 sleep 300）
  177 root      0:00 ps
```

`pids.current` 顶到 12：主进程 + fork 循环的 sh + 10 个 sleep。`stats` 的 **PIDS=11**——「PIDS 列防进程炸弹」说的就是它。

清理时踩到一个真实的坑。杀掉这批 sleep：

```bash
docker exec lab-box pkill -f 'sleep 300'
sleep 1
docker exec lab-box cat /sys/fs/cgroup/pids.current
docker exec lab-box ps
```

```text
12
PID   USER     TIME  COMMAND
    1 root      0:00 sleep infinity
  121 root      0:00 [sh]
  161 root      0:00 [sleep]
  …（10 个 [sleep] 全变成方括号）
  195 root      0:00 ps
```

杀是杀了，`pids.current` **还是 12**——`ps` 里那堆方括号是**僵尸进程**：它们死了，但没人收尸。容器的主进程是 `sleep infinity`，它从不调用 `wait()`，子进程就永远挂在进程表里，**僵尸照样占 pids 配额**。这就是为什么很多镜像用 tini/dumb-init 当 PID 1，或者主程序必须自己回收子进程。眼下最快的解法是重启容器：

```bash
docker restart lab-box
docker exec lab-box sh -c 'cat /sys/fs/cgroup/cpu.max /sys/fs/cgroup/memory.max /sys/fs/cgroup/pids.max /sys/fs/cgroup/pids.current'
```

```text
lab-box
50000 100000
134217728
12
2
```

一举两个的发现：僵尸清干净了（`pids.current` 回到 2），而且**四道锁一道没丢**——`docker update` 的限制写进了容器配置，重启依然生效。

> 一句话收口：**`--pids-limit` 防 fork 炸弹，僵尸也占配额；PID 1 得会收尸（tini/dumb-init），update 的锁重启不丢。**

---

## 第 9 课：出生就戴锁——参数写法与 Compose

**🧑‍🎓 学生：** 前面都是「先跑起来再 update」，生产上应该是创建时就写全吧？还有 YAML 里怎么写？

**🧑‍🏫 老师：**

对，生产的主路径是「出生戴锁」。两种 CPU 写法各起一个：

```bash
docker run -d --name app --cpus="0.5" -m 512m nginx:alpine
docker run -d --name app2 --cpu-quota=50000 --cpu-period=100000 alpine sleep infinity

docker inspect app --format 'CpuQuota={{.HostConfig.CpuQuota}} CpuPeriod={{.HostConfig.CpuPeriod}} NanoCpus={{.HostConfig.NanoCpus}} Memory={{.HostConfig.Memory}} MemorySwap={{.HostConfig.MemorySwap}}'
docker inspect app2 --format 'CpuQuota={{.HostConfig.CpuQuota}} CpuPeriod={{.HostConfig.CpuPeriod}} NanoCpus={{.HostConfig.NanoCpus}}'
```

```text
CpuQuota=0 CpuPeriod=0 NanoCpus=500000000 Memory=536870912 MemorySwap=1073741824
CpuQuota=50000 CpuPeriod=100000 NanoCpus=0
```

| 参数 | 落在 inspect 哪个字段 | 最终写进 cgroup |
|------|----------------------|-----------------|
| `--cpus 0.5` | `NanoCpus=500000000` | `cpu.max` = `50000 100000` |
| `--cpu-quota 50000 --cpu-period 100000` | `CpuQuota=50000` + `CpuPeriod=100000` | 同上 |
| `-m 512m` | `Memory=536870912` | `memory.max` = `536870912` |

进 app 验证殊途同归，顺带看一个默认值：

```bash
docker exec app sh -c 'cat /sys/fs/cgroup/cpu.max /sys/fs/cgroup/memory.max'
docker exec app cat /sys/fs/cgroup/memory.swap.max
```

```text
50000 100000
536870912
536870912
```

`app` 没设 `--memory-swap`，inspect 里 `MemorySwap=1073741824` 正好是 `Memory` 的**两倍**——默认允许在 512MiB 内存之外**再换出 512MiB swap**（`memory.swap.max=536870912`）。想让「512m 就是死线」，得像第 6 课那样显式 `--memory-swap 512m`。

容器没了，袋子去哪？顺手验证第 2 课说的「Docker 只是填表员」——删容器，看目录：

```bash
ls -d /sys/fs/cgroup/system.slice/docker-a4bd22d94c4399868d7dba9fa25a68a4d2af081ffeb0fd960d67a7d8d44532bd.scope
docker rm -f app2
ls /sys/fs/cgroup/system.slice/ | grep -c docker-a4bd22d94c43 || echo 0
```

```text
/sys/fs/cgroup/system.slice/docker-a4bd22d94c4399868d7dba9fa25a68a4d2af081ffeb0fd960d67a7d8d44532bd.scope
0
```

删除前在，`docker rm` 之后计数 0——**容器删除，对应 cgroup 目录跟着被清掉**，不泄漏。哪些锁能事后 `update` 改、哪些只能创建时定，[docker update 参考](https://docs.docker.com/reference/cli/docker/container/update/)有完整清单。

最后是声明式。`/root/cgroup-lab/compose.yaml`：

```yaml
services:
  web:
    image: nginx
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
```

```bash
cd /root/cgroup-lab && docker compose up -d
docker inspect cgroup-lab-web-1 --format 'NanoCpus={{.HostConfig.NanoCpus}} Memory={{.HostConfig.Memory}}'
docker exec cgroup-lab-web-1 sh -c 'cat /sys/fs/cgroup/cpu.max /sys/fs/cgroup/memory.max'
docker compose down
```

```text
NanoCpus=500000000 Memory=536870912
50000 100000
536870912
```

和 `docker run` 的结果**一个字节不差**：YAML 里的 `cpus: '0.50'` / `memory: 512M`，最终照样变成 `NanoCpus` / `Memory`，落进 `cpu.max` 和 `memory.max`。`deploy` 块当年是 Swarm 语义，但 limits 这部分单机 Compose 就认（`replicas` 那些 Swarm 专属字段仍会被忽略）。K8s 的 `resources.limits` 同理——殊途同归到同一个袋子里的同几行文件。

> 一句话收口：**锁在出生时写全：run 参数、Compose、K8s resources 殊途同归，最后都是袋子里的那几行；默认 swap = 2×`-m`，想禁要显式设。**

---

## 第 10 课：freezer——不杀进程的暂停

**🧑‍🎓 学生：** 还剩控制器清单里的 freezer 没讲。它是干嘛的？

**🧑‍🏫 老师：**

「暂停/恢复袋内所有进程」。Docker 把它做成了 `docker pause`：

```bash
docker pause lab-box
docker ps --filter name=lab-box --format '{{.Names}}  {{.Status}}'
```

```text
lab-box
lab-box  Up About a minute (Paused)
```

状态多了 `(Paused)`。宿主机侧看冻结开关：

```bash
cat /sys/fs/cgroup/system.slice/docker-f850167d38f4….scope/cgroup.freeze
docker exec lab-box true
echo "exec exit=$?"
```

```text
1
Error response from daemon: Container lab-box is paused, unpause the container before exec
exec exit=1
```

`cgroup.freeze` 从 0 变 **1**——整个袋子的进程被内核原地冻结，`exec` 直接被 daemon 拒绝。解冻：

```bash
docker unpause lab-box
cat /sys/fs/cgroup/system.slice/docker-f850167d38f4….scope/cgroup.freeze
```

```text
lab-box
0
```

和 `docker stop` 的区别值得记：stop 是**杀掉**主进程（状态、TCP 连接全丢），pause 是把进程组**冻住**——内存里原地站着，连接、程序计数器都在，解冻从断点继续。适合快照、线上「先停住别弄死」的紧急止血。v1 里它是独立子系统 freezer，v2 内建成一个文件，所以第 2 课的控制器清单里找不到它。

> 一句话收口：**pause = `cgroup.freeze=1` 原地冻结（连接还在，可续跑），stop = 杀掉重来；紧急止血用 pause。**

---

## 插问 4：`--cpu-shares` 和 `--cpus` 有什么区别？

**🧑‍🎓 学生：** 我在老教程里还见过 `--cpu-shares 512`，和 `--cpus 0.5` 是一回事吗？

**🧑‍🏫 老师：**

不是一回事，而且这个区别生产上很重要。实测——v1 的老参数在 v2 机器上照收，daemon 换算后写进另一个文件：

```bash
docker update --cpu-shares 512 lab-box
docker exec lab-box cat /sys/fs/cgroup/cpu.weight
```

```text
lab-box
59
```

512 换算成了 `cpu.weight=59`（v2 权重范围 1~10000，不是 v1 的 0~1024）。关键在两个文件的**语义**：

- **`cpu.max`（`--cpus`）是硬上限**：忙也好闲也好，总量不许超——闲时你也用不了更多；
- **`cpu.weight`（`--cpu-shares`）是软权重**：只在 CPU **紧张、大家抢**的时候起作用——按权重比例分。机器闲着时，低权重容器照样能跑到 100%。

所以生产上「限资源」用 `--cpus`（保证上限、给容量规划用），shares/weight 只用来表达「抢的时候谁优先」——拿 shares 当限额用，是老教程遗留的常见误用。

> 一句话收口：**`--cpus` 写 `cpu.max` 是硬顶，`--cpu-shares` 写 `cpu.weight` 是抢时装的优先级；限资源用前者。**

---

## 命令怎么记

每道锁都是「一个参数 + 一个文件」：

| 上锁 | 参数 | 落在哪个 cgroup 文件 | 哪课用过 |
|------|------|--------------------|---------|
| CPU 配额 | `--cpus 0.5`（或 `--cpu-quota` + `--cpu-period`） | `cpu.max` | 4、9 |
| CPU 权重 | `--cpu-shares 512` | `cpu.weight` | 插问 4 |
| 绑核 | `--cpuset-cpus 0` | `cpuset.cpus` | 5 |
| 内存 | `-m 128m`（配 `--memory-swap`） | `memory.max` / `memory.swap.max` | 6、9 |
| 进程数 | `--pids-limit 12` | `pids.max` | 8 |
| 暂停 | `docker pause` / `unpause` | `cgroup.freeze` | 10 |
| 声明式 | Compose `deploy.resources.limits` | 同上，up 时落表 | 9 |

验证类：

| 看什么 | 命令 | 哪课用过 |
|--------|------|---------|
| 容器在哪张袋里 | `cat /proc/<宿主机PID>/cgroup` | 2 |
| 锁的现值 | 容器内 `cat /sys/fs/cgroup/cpu.max` 等 | 3-8 |
| CPU 是否被限流 | `cat cpu.stat`（`nr_throttled`） | 4 |
| OOM 复盘 | `cat memory.events`、`dmesg` | 6 |
| 内存明细 | `cat memory.current` / `memory.stat` | 7 |
| 进程数现值 | `cat pids.current` | 8 |
| 参数落在哪个字段 | `docker inspect --format '{{.HostConfig…}}'` | 1、4、9 |

---

## 历史包袱：cgroup v1 → v2，别死抄旧路径

本机整篇都是 v2（`cgroup2fs` 一棵树）。但 v1 统治了十几年，网上教程、公司老机器、面试题里到处是它的样子——下面这些输出是**老环境（CentOS + v1）的历史真实记录**，认得出就行，别在新机器上照抄。

v1 的第一个特征：每个子系统**各自挂载一处**，`lssubsys -m` 一览（工具来自老包 libcgroup）：

```bash
$ lssubsys -m
cpuset   /sys/fs/cgroup/cpuset
cpu      /sys/fs/cgroup/cpu
cpuacct  /sys/fs/cgroup/cpuacct
memory   /sys/fs/cgroup/memory
devices  /sys/fs/cgroup/devices
freezer  /sys/fs/cgroup/freezer
blkio    /sys/fs/cgroup/blkio
...
```

装了 Docker 后，每个子系统下多一个 `docker` 目录，里面再按容器 ID 建子目录：

```text
/sys/fs/cgroup/cpu/docker/          ← 所有 Docker 容器
└── <container_id>/                 ← 单个容器
    └── tasks                       ← 容器内进程 PID 列表
```

创建容器 = 在各子系统下建 `<容器ID>` 目录、把 PID 写进 `tasks`。和 v2 的三步填表（插问 1）是同一件事，只是 v1 要在**六个子系统各建一份**，v2 一个 scope 目录全搞定。

新旧文件名对照（看到旧名字按这张表换算）：

| v1 | v2 | 哪课见过 v2 侧 |
|----|----|----------------|
| `tasks` | `cgroup.procs` | 3 |
| `cpu.cfs_quota_us` + `cpu.cfs_period_us` | `cpu.max`（一行两列） | 4 |
| `cpu.shares` | `cpu.weight` | 插问 4 |
| `memory.limit_in_bytes` | `memory.max` | 6 |
| `memory.memsw.limit_in_bytes` | `memory.swap.max` | 6 |
| `blkio.*` | `io.*` | — |
| `<子系统>/docker/<id>/` | `system.slice/docker-<id>.scope/` | 2 |

时间线收个尾：cgroup v2 内核 4.5（2016）成型、4.15 起可日常使用；systemd 244、Docker Engine 20.10（2020-12）跟进后，主流发行版陆续默认 v2。2026 年的新环境基本是 v2，但读旧资料时，那句提醒永远适用：**cgroup 路径以本机 `mount | grep cgroup` 为准，不要死抄**。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|--------|----------------------|
| [第 5 篇](/云原生/docker/docker-05-container-and-image) 容器与镜像 | 第 6 课：`OOMKilled` / `ExitCode` 排障字段 |
| [第 16 篇](/云原生/docker/docker-16-compose) Compose | 第 9 课：`deploy.resources.limits` 单机生效 |
| [第 19 篇](/云原生/docker/docker-19-tech-foundation) 技术底座 | 第 2、3 课：填表员模型、cgroup namespace |
| [第 20 篇](/云原生/docker/docker-20-namespace) Namespace | 第 1 课：视图隔离 vs 资源限额的分工 |
| [第 23 篇](/云原生/docker/docker-23-daemon-runtime) Daemon 与 runtime | 下一篇：runc 建 namespace + cgroup 的调用链 |
| [第 24 篇](/云原生/docker/docker-24-process-view) 进程视角 | 第 3、6、8 课：exec 同袋、137、PID 1 收尸 |
| [第 25 篇](/云原生/docker/docker-25-container-security) 容器安全 | 控制器表 devices 行：设备访问控制走 eBPF |
| [第 27 篇](/云原生/docker/docker-27-logging-monitoring) 日志与监控 | 第 1、4、7、8 课：`stats` 各列的 cgroup 来源 |

---

## 小结

一个 `lab-box`，四道锁加一次冻结：

1. **不设限**：LIMIT 显示整机 7.757GiB——这就是要用 Cgroups 的理由；Namespace 管视图，Cgroup 管资源。
2. **档案袋**：v2 一个 `cgroup2fs` 挂 `/sys/fs/cgroup`，容器住 `system.slice/docker-<id>.scope`；Docker 只是填表员，内核才是裁判。
3. **白纸**：cgroup namespace 让容器看见自己是根；`cpu.max = max 100000` 没锁；`cgroup.procs` 是成员名单（v1 叫 `tasks`）。
4. **CPU 配额**：`--cpus 0.5` → `50000 100000`，袋内合计封顶，`nr_throttled` 是实锤。
5. **绑核**：`--cpuset-cpus 0`，管「在哪跑」，与配额叠加不冲突。
6. **内存硬限**：`-m 128m` → `memory.max`，越线杀袋内大头（`CONSTRAINT_MEMCG` 只伤自己）；PID 1 被杀才有 `Exited (137)`。
7. **内存账本**：`memory.current` 总账、`memory.stat` 明细，stats 与监控的数据源。
8. **进程数**：`--pids-limit` 防 fork 炸弹；僵尸不释放配额，PID 1 得会收尸。
9. **出生戴锁**：run 参数、Compose、K8s 殊途同归落同一组文件；默认 swap = 2×`-m`；容器删、袋子清。
10. **freezer**：`docker pause` → `cgroup.freeze=1`，冻住而非杀死。

**思考题**：只设 `-m 512m` 不设 `--memory-swap`，容器能用 swap 吗？（提示：第 9 课的 `MemorySwap=1073741824` 与 `memory.swap.max=536870912` 已经剧透了一半。）再想一题：`--cpus 0.5`、`--cpuset-cpus 0`、`--cpu-shares 512` 三者同时在身，各自在什么时候起作用？

视图隔离（Namespace）与资源限额（Cgroups）都齐了。下一篇把调用链补全：[《Docker Daemon 与 runtime——一条 docker run 经过了谁的手》](/云原生/docker/docker-23-daemon-runtime)——`dockerd → containerd → shim → runc` 如何把这些内核能力串成一次 `docker run`。

---

## 本篇实验清理（可照抄）

```bash
docker rm -f lab-box oom-demo app
cd /root/cgroup-lab && docker compose down
```

---

## 参考资料

- [Docker: 资源限制官方指南](https://docs.docker.com/engine/containers/resource_constraints/)
- [docker run 参考（资源相关参数）](https://docs.docker.com/reference/cli/docker/container/run/)、[docker update 参考](https://docs.docker.com/reference/cli/docker/container/update/)
- [内核文档：cgroup v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)、[cgroup v1（历史）](https://docs.kernel.org/admin-guide/cgroup-v1/index.html)
- 本机：WSL2 Ubuntu-22.04（内核 6.6.87.2-microsoft-standard-WSL2）+ Docker 29.1.3（cgroup v2 + systemd 驱动）
