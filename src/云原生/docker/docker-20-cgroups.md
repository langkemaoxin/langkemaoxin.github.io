---
title: CGroups 限资源——给同一个容器逐项上枷锁
sidebarGroup: Docker 系列
shortTitle: 20 CGroups 限资源
order: 20
date: 2026-08-23T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 同一个容器一路加锁：--cpus、--cpuset-cpus、-m、--pids-limit、docker pause 逐项实测，cpu.max / memory.max / pids.max / cgroup.freeze 看到底，附 cgroup v1 到 v2 的历史包袱。
---

> **Docker 系列 · 第 20/24 篇**
> 上一篇：[《进程视角看容器——从两边 ps 对不上号，滚到亲手杀掉 PID 1》](/云原生/docker/docker-19-process-view) · 下一篇：[《Docker Daemon 与 runtime——一条 docker run 经过了谁的手》](/云原生/docker/docker-21-daemon-runtime)

---

## 开头：一个失控的 Java 堆，拖垮整台宿主机

你在同一台 16C / 64G 的机器上跑了 8 个微服务容器。某个服务出现内存泄漏，**RSS 持续上涨**；因为没有限额，它会与宿主机和其他容器争抢内存，最终触发 OOM Killer——可能误杀关键进程，全线告警。

根因一句话：[Namespace](/云原生/docker/docker-18-namespace) 只能隔离**视图**（你看见几张网卡、哪些进程），管不了**物理资源**——多个「互不知情」的容器，始终共享同一颗 CPU、同一块内存。给它们上锁的是 Linux 内核的另一套机制 **Cgroups（Control Groups）**。

本篇不先背概念。主线就一件事：**起一个不设限的容器 `lab-box`，然后给它逐项上枷锁**——CPU、绑核、内存、进程数、freezer，每一道锁都是当场 `docker update` 上去、当场看到效果：

| 雪球 | 你加上去的 | 当场能看见的效果 |
|------|------------|------------------|
| **1** | 先跑一个什么都不限的 `lab-box` | `stats` 的内存上限是整台机 7.757GiB |
| **2** | 在宿主机上找到它的 cgroup | `cgroup2fs` + `docker-<id>.scope` 目录 |
| **3** | 钻进容器看自己的视图 | `cpu.max` 还是 `max 100000`（没锁） |
| **4** | 第一道锁：`--cpus 0.5` | `cpu.max` 变 `50000 100000`，CPU 封顶约 50% |
| **5** | 第二道锁：绑核 `--cpuset-cpus 0` | 进程只许跑在 0 号核 |
| **6** | 第三道锁：`-m 128m` | 吃内存的进程被内核杀掉，退出码 137 |
| **7** | 打开内存账本 | `memory.current` / `memory.stat` 与 `stats` 对账 |
| **8** | 第四道锁：`--pids-limit 12` | `sh: can't fork`；僵尸还占坑 |
| **9** | 出生就戴锁 + 两种参数写法 | `--cpus` 与 `--cpu-quota` 殊途同归 |
| **10** | 写进 Compose | `up` 完 inspect 出 `NanoCpus` / `Memory` |
| **11** 🧗 | `docker pause` | `cgroup.freeze=1`，`exec` 直接被拒 |

输出均来自本机：WSL2 Ubuntu-22.04（内核 6.6.87.2-microsoft-standard-WSL2）+ Docker 29.1.3，cgroup v2 + systemd 驱动，命令以 root 运行。官方入口：[Docker 容器资源限制](https://docs.docker.com/engine/containers/resource_constraints/)、[内核 cgroup v2 文档](https://docs.kernel.org/admin-guide/cgroup-v2.html)。

---

## 雪球 1：不设限，先看看「没有枷锁」长什么样

起本篇的主角：一个纯 `alpine`，主进程是 `sleep infinity`（它不会退场，后面十球都在它身上做实验）：

```bash
docker run -d --name lab-box alpine sleep infinity
```

```text
d1425d0953900bde32c4e5bd28438710f7d96407d8279a2fcf44f7746e72a1e9
```

现在看它身上有没有锁：

```bash
docker inspect lab-box --format 'CpuQuota={{.HostConfig.CpuQuota}} Memory={{.HostConfig.Memory}} PidsLimit={{.HostConfig.PidsLimit}} NanoCpus={{.HostConfig.NanoCpus}}'
docker inspect lab-box --format 'Status={{.State.Status}} Pid={{.State.Pid}} OOMKilled={{.State.OOMKilled}}'
docker stats --no-stream lab-box
```

```text
CpuQuota=0 Memory=0 PidsLimit=<no value> NanoCpus=0
Status=running Pid=67333 OOMKilled=false
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT   MEM %     NET I/O      BLOCK I/O    PIDS
d1425d095390   lab-box   0.00%     360KiB / 7.757GiB   0.00%     558B / 84B   655kB / 0B   1
```

三行各说一件事：

- `CpuQuota=0 Memory=0 PidsLimit=<no value>`：CPU、内存、进程数，一个限制都没有
- `Pid=67333`：它在宿主机上的进程号，下一球靠它找 cgroup
- `360KiB / 7.757GiB`：能用多少？**整台机的内存**。`7.757GiB` 就是宿主机总共 7.8GiB——这正是[第 15 篇](/云原生/docker/docker-15-logging-monitoring)说「LIMIT 显示整机内存 = 没限额，生产该配」的原因

没锁的容器一旦失控，就是开头那个 Java 堆的故事。谁来上锁？先把 Namespace 和 Cgroups 的分工钉成一张表（后面全篇都在用）：

| 机制 | 回答的问题 | 典型场景 |
|------|------------|----------|
| **Namespace** | 能看见谁、能访问哪些视图 | 进程列表、网络栈、挂载点 |
| **Cgroup** | 能用多少物理资源 | CPU 50%、内存 1G、I/O 权重 |

两者正交、互补，合起来才是完整容器：**Namespace 隔离 + Cgroup 限额 + UnionFS 根文件系统**。

那 Cgroups 到底是什么？一句话：**内核里把一组进程放进同一个「档案袋」，统一统计、统一限制资源的机制**，能管 CPU、内存、磁盘 I/O、设备访问这些大类（网络带宽只在部分场景管得到）。档案袋还能套娃——子 cgroup 继承父级的限制，形成层级。抽象？别急，下一球就摸到这个档案袋。

---

## 雪球 2：在宿主机上找到它的档案袋

Cgroups 的管理接口不是什么新命令，而是挂出来的一个**伪文件系统**——像 `/proc` 一样，「文件」其实是内核数据结构的出口。看它挂在哪：

```bash
mount | grep cgroup
stat -f -c %T /sys/fs/cgroup
```

```text
cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime,nsdelegate)
cgroup2fs
```

`cgroup2` / `cgroup2fs` 指的都是 **cgroup v2**：整棵树只有**一个**统一层级，挂在 `/sys/fs/cgroup` 一个位置。（v1 长什么样、为什么你搜到的老教程路径完全不同，历史包袱那节专门讲。）

顺着雪球 1 拿到的宿主机 PID，找 `lab-box` 被装进了哪个袋子：

```bash
CPID=$(docker inspect lab-box --format '{{.State.Pid}}')
cat /proc/$CPID/cgroup
```

```text
0::/system.slice/docker-d1425d0953900bde32c4e5bd28438710f7d96407d8279a2fcf44f7746e72a1e9.scope
```

[第 19 篇](/云原生/docker/docker-19-process-view)末尾看过这行：`0::` 是 v2 的统一层级标记，路径就是它在树上的位置：

```text
/sys/fs/cgroup                          ← 整棵树的根
└── system.slice/                       ← systemd 管的系统服务区
    └── docker-d1425d095390….scope      ← lab-box 专属的档案袋
```

`system.slice`、`.scope` 这些名字是 **systemd** 起的（Docker 的 cgroup 驱动是 systemd）。袋子里都装了什么？目录节选：

```bash
CID=$(docker inspect lab-box --format '{{.Id}}')
ls /sys/fs/cgroup/system.slice/docker-$CID.scope
```

```text
cgroup.controllers
cgroup.events
cgroup.freeze
cgroup.kill
cgroup.max.depth
cgroup.max.descendants
cgroup.pressure
cgroup.procs
cgroup.stat
cgroup.subtree_control
cgroup.threads
cgroup.type
cpu.idle
cpu.max
cpu.max.burst
cpu.pressure
cpu.stat
cpu.stat.local
cpu.weight
cpu.weight.nice
cpuset.cpus
cpuset.cpus.effective
cpuset.cpus.partition
cpuset.mems
…
```

两大类文件：`cgroup.*` 管「袋子本身」（谁在袋里、层级关系、冻结状态），`cpu.*` / `memory.*` / `pids.*` 管资源额度——每类资源叫一个**控制器（controller）**，v1 时代叫**子系统（subsystem）**。看看本机内核支持哪些：

```bash
cat /sys/fs/cgroup/cgroup.controllers
```

```text
cpuset cpu io memory hugetlb pids rdma
```

对照着老名字记（左边是 v1 教程里的常见叫法）：

| v1 子系统 | v2 对应 | 作用 |
|-----------|---------|------|
| **cpu** | cpu | CPU 时间片、CFS 配额 |
| **memory** | memory | 内存上限、swap 行为 |
| **blkio** | io | 块设备 I/O 权重与限速 |
| **devices** | 改走 eBPF，不占控制器名 | 允许/拒绝访问的设备节点 |
| **freezer** | 内建为 `cgroup.freeze` 文件 | 暂停/恢复 cgroup 内进程 |
| **cpuset** | cpuset | 绑定特定 CPU 核与内存节点 |
| （v1 没有） | pids | 进程/线程数上限 |

「网络带宽（部分场景）」那类限制 v1 靠 net_cls/net_prio，v2 里没有对应控制器，交给 BPF/CNI 去做，所以清单里看不到它。

这套东西和 Docker、LXC 什么关系？

```text
Cgroup（内核） → LXC（封装） → Docker（再封装 + 镜像生态）
```

Cgroup 在底层落实资源管理；LXC 在 Cgroup 之上叠加 Namespace、Chroot 等，提供容器运行时；Docker 再往上提供镜像、API、CLI。没有 Cgroup，就无法可靠地限制容器 CPU/内存，LXC 与 Docker 的「多租户同机」模型根本不成立。

最后把谜底提前揭了：Docker **并没有实现新的调度器**，它只是这个文件系统的「填表员」，每个容器跑起来就三步：

1. 请 systemd 建目录 `docker-<id>.scope`（就是刚才 ls 的那个袋子）
2. 把容器主进程 PID 写进 `cgroup.procs`
3. 把 `--cpus`、`-m` 这些参数换算后写进 `cpu.max`、`memory.max` 等文件

内核才是真正盯着配额执行的裁判。所以生产上不推荐手改这些文件——参数、Compose、K8s 的 resources 声明才是正路（雪球 9、10 演示）。

---

## 雪球 3：钻进容器，看它自己的 cgroup 视图

袋子在宿主机上找到了，那容器**自己**眼里是什么样？

```bash
docker exec lab-box cat /proc/1/cgroup
docker exec lab-box cat /sys/fs/cgroup/cpu.max
docker exec lab-box cat /sys/fs/cgroup/cgroup.procs
```

```text
0::/
max 100000
1
25
```

三行对照着宿主机侧看，信息量不小：

- `0::/`：容器内看不到 `system.slice/docker-….scope` 那串长路径，它看见自己是**根**。因为 Docker 默认启用 **cgroup namespace**（[第 16 篇](/云原生/docker/docker-16-tech-foundation)提过它），把 cgroup 视图也隔离了
- `max 100000`：`cpu.max` 两个数，`max` 表示**没配额**，`100000` 是周期 100000 微秒。这行就是「还没上锁」的白纸状态
- `1` 和 `25`：袋子里的进程。`1` 是主进程 `sleep infinity`；`25` 是谁？——**正在跑的这条 `cat` 自己**。`docker exec` 进来的进程也进同一个 cgroup，这正对应[第 19 篇](/云原生/docker/docker-19-process-view)说的「exec 出的进程进了同一个容器的 PID namespace / cgroup」

> 顺带一记：v1 时代这个「成员名单」文件叫 `tasks`，v2 改名 `cgroup.procs`。老教程让你 `cat tasks`，在新机器上会找不到文件。

白纸看清楚了，下一球正式落笔。

---

## 雪球 4：第一道锁——`--cpus 0.5`，CPU 封顶一半核

Docker 上锁不用重建容器，`docker update` 当场改：

```bash
docker update --cpus 0.5 lab-box
```

```text
lab-box
```

锁上没上？容器内外各验一遍：

```bash
docker exec lab-box cat /sys/fs/cgroup/cpu.max
docker inspect lab-box --format 'CpuQuota={{.HostConfig.CpuQuota}} CpuPeriod={{.HostConfig.CpuPeriod}} NanoCpus={{.HostConfig.NanoCpus}}'
```

```text
50000 100000
CpuQuota=0 CpuPeriod=0 NanoCpus=500000000
```

`cpu.max` 从 `max 100000` 变成了 **`50000 100000`**，含义是「每 100000 微秒（100ms）的周期里，最多用 50000 微秒 CPU 时间」——50000 / 100000 = **0.5 核**。这就是内核 CFS（完全公平调度器）的配额模型：v1 里它拆成 `cpu.cfs_quota_us` 和 `cpu.cfs_period_us` 两个文件，v2 合并成一行两列。

inspect 那行藏了个容易踩的坑：用的是 `--cpus`，**`CpuQuota` 还是 0**！配额记在 `NanoCpus=500000000`（0.5 核 = 5 亿纳秒/秒），由 daemon 换算成 50000/100000 再写进 `cpu.max`。想直接填 quota/period 两个老字段，用 `--cpu-quota` / `--cpu-period`——雪球 9 实测给你看两条路殊途同归。

锁生效没有，得压一压才知道。容器里起两个死循环，看 `stats`：

```bash
docker exec -d lab-box sh -c 'while :; do :; done'
docker exec -d lab-box sh -c 'while :; do :; done'
sleep 2
docker stats --no-stream lab-box
```

```text
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT     MEM %     NET I/O         BLOCK I/O     PIDS
d1425d095390   lab-box   49.47%    1.004MiB / 7.757GiB   0.01%     768B / 126B     938kB / 0B    3
```

**两个**死循环，合计才 **49.47%**。锁是戴在整个 cgroup 头上的：不是「每个进程限 50%」，而是「袋里所有进程加起来每 100ms 最多用 50ms」。被拦的证据内核也记了账：

```bash
docker exec lab-box cat /sys/fs/cgroup/cpu.stat
```

```text
usage_usec 1918449
user_usec 1878894
system_usec 39555
nr_periods 39
nr_throttled 34
throttled_usec 5061818
nr_bursts 0
burst_usec 0
```

前三是用了多少（总/用户态/内核态）；关键是后三个：`nr_periods 39` 个周期里，有 `nr_throttled 34` 个周期被限流，累计少跑了 `throttled_usec 5061818` 微秒——「想跑跑不了」的实锤。收工清场：

```bash
docker exec lab-box pkill -f while
docker stats --no-stream lab-box
```

```text
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT   MEM %     NET I/O      BLOCK I/O    PIDS
d1425d095390   lab-box   0.00%     860KiB / 7.757GiB   0.01%     768B / 126B   938kB / 0B   1
```

回到 0.00%，PIDS 也回到 1。

---

## 雪球 5：第二道锁——绑核 `--cpuset-cpus 0`

配额管「用多少」，绑核管「在哪用」。把它钉在 0 号核上：

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

两处互相印证：cgroup 文件 `cpuset.cpus` 是 `0`；主进程的 `/proc/1/status` 里 `Cpus_allowed_list` 也变成了 `0`（本机 6 核，原本是 `0-5`）——内核调度器从此只把它排上 0 号核。`cpuset` 还能绑内存节点（`cpuset.mems`），NUMA 机器上做亲和性优化用得上。

和雪球 4 叠在一起：**每周期 50ms 配额 + 只许在 0 号核花** = 半颗 0 号核。两把锁互不干扰，各管一件事。

---

## 雪球 6：第三道锁——`-m 128m`，内存越线就被杀

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

`134217728` = 128 × 1024 × 1024，硬上限 `memory.max`；`memory.swap.max=0` 是因为 `--memory-swap` 也设成了 128m（总盘子 = 内存，一点 swap 不给）。注意：**如果创建时不设 `--memory-swap`，默认是 `-m` 的两倍**——雪球 9 会亲眼看到，也是结尾思考题。

容器里三层水位，先记模型：

| 文件 | 本机值 | 语义 |
|------|--------|------|
| `memory.high` | `max`（没设） | 软限：越线先被限速、加回收压力 |
| `memory.max` | `134217728` | 硬限：越线进 OOM 流程 |
| `memory.swap.max` | `0` | 超出 memory.max 后允许换出的量 |

现在放一个吃内存的进程进去——`tr` 把 400MB 数据灌进 shell 变量：

```bash
docker exec lab-box sh -c 'v=$(head -c 400000000 /dev/zero | tr "\0" x); echo len=${#v}'
echo "exec exit=$?"
```

```text
exec exit=137
```

`len=` 那行根本没打出来：进程没跑到 echo 就死了。**137 = 128 + 9（SIGKILL）**，[第 19 篇](/云原生/docker/docker-19-process-view)里 `docker kill` 出来的 `Exited (137)` 同款。谁下的手？看账本：

```bash
docker exec lab-box cat /sys/fs/cgroup/memory.events
```

```text
low 0
high 0
max 235
oom 2
oom_kill 1
oom_group_kill 0
```

撞线前后对比着读（之前全是 0）：`max 235`——235 次分配请求撞上 `memory.max`；`oom 2`——两次进入 OOM 流程；`oom_kill 1`——最终杀了 1 个进程。宿主机内核日志把凶手动机记得明明白白：

```bash
dmesg | grep -E 'oom|Killed process' | tail -3
```

```text
[175985.235662] tr invoked oom-killer: gfp_mask=0x100cca(GFP_HIGHUSER_MOVABLE), order=0, oom_score_adj=0
[175985.235820] oom-kill:constraint=CONSTRAINT_MEMCG,nodemask=(null),cpuset=docker-d1425d0953900bde32c4e5bd28438710f7d96407d8279a2fcf44f7746e72a1e9.scope,mems_allowed=0,oom_memcg=/system.slice/docker-d1425d0953900bde32c4e5bd28438710f7d96407d8279a2fcf44f7746e72a1e9.scope,task_memcg=/system.slice/docker-d1425d0953900bde32c4e5bd28438710f7d96407d8279a2fcf44f7746e72a1e9.scope,task=sh,pid=68848,uid=0
[175985.236483] Memory cgroup out of memory: Killed process 68848 (sh) total-vm:145008kB, anon-rss:129792kB, file-rss:512kB, shmem-rss:0kB, UID:0 pgtables:308kB oom_score_adj:0
```

三个关键点：

- `constraint=CONSTRAINT_MEMCG`：触发原因是 **cgroup 配额**，不是宿主机内存不够——锁只在袋子内部生效，宿主机和邻居容器毫发无损，这正是开头那个故事想要的保护
- `Killed process 68848 (sh) anon-rss:129792kB`：杀的是袋里吃内存最多的大头 `sh`，死时约 126.8MiB，贴着 128MiB 上限动手
- 袋子还在：

```bash
docker inspect lab-box --format 'Status={{.State.Status}} OOMKilled={{.State.OOMKilled}} ExitCode={{.State.ExitCode}}'
```

```text
Status=running OOMKilled=true ExitCode=0
```

主进程 `sleep infinity` 活着，容器没退（`ExitCode=0`）；但 daemon 把这次 cgroup 级 OOM 记在了容器账上（`OOMKilled=true`）——排查时别看到 `OOMKilled=true` 就断定容器死过，得结合 `Status` 一起读。

要是**主进程自己**就是内存泄漏呢？那就是开头 Java 堆的场景，容器会真死。换个一次性容器验证（PID 1 自己吃内存）：

```bash
docker run -m 100m --memory-swap 100m --name oom-demo alpine \
  sh -c 'v=$(head -c 400000000 /dev/zero | tr "\0" x); echo len=${#v}'
echo "run exit=$?"
docker ps -a --filter name=oom-demo --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker inspect oom-demo --format 'Status={{.State.Status}} OOMKilled={{.State.OOMKilled}} ExitCode={{.State.ExitCode}}'
```

```text
run exit=137
NAMES      STATUS                        IMAGE
oom-demo   Exited (137) 23 seconds ago   alpine
Status=exited OOMKilled=true ExitCode=137
```

PID 1 被杀，容器退出：`Exited (137)` + `OOMKilled=true` + `ExitCode=137` 三件套——这就是[第 5 篇](/云原生/docker/docker-05-container-and-image) inspect 排障口诀里那两个字段的出处。

---

## 雪球 7：打开内存账本——memory.current / memory.stat

第 15 篇的 `docker stats` 那张表说「MEM USAGE 来自 cgroups memory」，现在对账。袋子现在用了多少：

```bash
docker exec lab-box cat /sys/fs/cgroup/memory.current
docker exec lab-box cat /sys/fs/cgroup/memory.stat | head -12
docker stats --no-stream lab-box
```

```text
1216512
anon 106496
file 606208
kernel 438272
kernel_stack 16384
pagetables 61440
sec_pagetables 0
percpu 3552
sock 0
vmalloc 36864
shmem 0
file_mapped 385024
```

```text
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT   MEM %     NET I/O         BLOCK I/O     PIDS
d1425d095390   lab-box   0.00%     648KiB / 128MiB     0.49%     1.36kB / 126B   2.41MB / 0B   2
```

- `memory.current = 1216512`（约 1.16MiB）是总账；`memory.stat` 是明细：`anon` 进程堆栈等匿名页、`file` 文件页缓存、`kernel` 内核花销——三类加起来约等于总账
- `stats` 采到 648KiB（时刻不同略有出入），**LIMIT 已从雪球 1 的 7.757GiB 变成 128MiB**，MEM % 一栏也从没意义变成了 0.49%

监控面板上的容器内存曲线，数据源就是这几个文件。OOM 之后想复盘「内存是怎么涨上去的」，也是先看这份明细。

---

## 雪球 8：第四道锁——`--pids-limit 12`，进程数也上锁

内存锁防「吃太多」，进程锁防 **fork 炸弹**——一个 `:(){ :|:& };:` 能瞬间铺满整机进程表。上锁：

```bash
docker update --pids-limit 12 lab-box
docker exec lab-box cat /sys/fs/cgroup/pids.max
docker exec lab-box cat /sys/fs/cgroup/pids.current
```

```text
lab-box
12
2
```

上限 12，当前 2（主进程 1 个 + 正在跑的 `cat` 自己 1 个）。一口气 fork 30 个 `sleep`：

```bash
docker exec lab-box sh -c 'for i in $(seq 30); do sleep 300 & done'
```

```text
sh: can't fork: Resource temporarily unavailable
```

30 个只起得来 10 个（2 + 10 = 12 到顶），第 11 次 fork 被内核拒绝，busybox sh 报一行 `can't fork` 后放弃剩余循环。数一数袋里实际有多少：

```bash
docker exec lab-box cat /sys/fs/cgroup/pids.current
docker stats --no-stream lab-box
docker exec lab-box ps
```

```text
12
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT   MEM %     NET I/O       BLOCK I/O    PIDS
d1425d095390   lab-box   0.00%     1.758MiB / 128MiB   1.37%     516B / 126B   123kB / 0B   11
```

```text
PID   USER     TIME  COMMAND
    1 root      0:00 sleep infinity
   20 root      0:00 sleep 300
   21 root      0:00 sleep 300
   22 root      0:00 sleep 300
   23 root      0:00 sleep 300
   24 root      0:00 sleep 300
   25 root      0:00 sleep 300
   26 root      0:00 sleep 300
   27 root      0:00 sleep 300
   28 root      0:00 sleep 300
   29 root      0:00 sleep 300
   37 root      0:00 ps
```

`stats` 的 **PIDS=11**（1 个主进程 + 10 个 sleep），[第 15 篇](/云原生/docker/docker-15-logging-monitoring)「PIDS 列防进程炸弹」说的就是它。

清理时踩到一个真实的坑。杀掉这批 sleep：

```bash
docker exec lab-box pkill -f 'sleep 300'
sleep 1
docker exec lab-box cat /sys/fs/cgroup/pids.current
docker exec lab-box ps
```

```text
12
```

```text
PID   USER     TIME  COMMAND
    1 root      0:00 sleep infinity
   20 root      0:00 [sleep]
   21 root      0:00 [sleep]
   22 root      0:00 [sleep]
   23 root      0:00 [sleep]
   24 root      0:00 [sleep]
   25 root      0:00 [sleep]
   26 root      0:00 [sleep]
   27 root      0:00 [sleep]
   28 root      0:00 [sleep]
   29 root      0:00 [sleep]
   55 root      0:00 ps
```

杀是杀了，`pids.current` 还是 12——`ps` 里那堆 `[sleep]` 是**僵尸进程**：它们死了，但没人收尸。容器的主进程是 `sleep infinity`，它从不调用 `wait()`，子进程就永远挂在进程表里，**僵尸照样占 pids 配额**。这就是为什么很多镜像用 tini/dumb-init 当 PID 1，或者你的主程序得自己回收子进程。眼下最快的解法是重启容器：

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

一举两个的发现：僵尸清干净了（`pids.current` 回到 2），而且**四道锁一道都没丢**——`docker update` 的限制写进了容器配置，重启依然生效。

---

## 雪球 9：出生就戴锁——`docker run` 参数与 inspect 字段对上号

前面都是「先跑起来再 update」，生产更常见的是创建时就写全：

```bash
# 限制 0.5 核、512MB 内存
docker run -d --name app --cpus="0.5" -m 512m nginx:alpine
# 老写法：直接填 quota / period 两个原始字段
docker run -d --name app2 --cpu-quota=50000 --cpu-period=100000 alpine sleep infinity
```

```text
c5604361880669cc7c2c05dcb1e790547aba179beaadd4037f7add3390c9e5a2
c4331b84240cc764ff6e656469e72b1bece8b5c11442d7a8fa789d20e55796e4
```

两个容器、两种参数，inspect 出来对比：

```bash
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

验证殊途同归（进 app 一看）：

```bash
docker exec app sh -c 'cat /sys/fs/cgroup/cpu.max /sys/fs/cgroup/memory.max'
docker exec app cat /sys/fs/cgroup/memory.swap.max
```

```text
50000 100000
536870912
536870912
```

`app` 没设 `--memory-swap`，`MemorySwap=1073741824` 正好是 `Memory` 的两倍——默认允许**再换出 512MiB swap**（`memory.swap.max=536870912`）。想让「512m 就是死线」，得显式 `--memory-swap 512m`，像雪球 6 那样。

容器没了，袋子去哪？顺手验证雪球 2 说的「Docker 只是填表员」：

```bash
ls -d /sys/fs/cgroup/system.slice/docker-c4331b84240cc764ff6e656469e72b1bece8b5c11442d7a8fa789d20e55796e4.scope
docker rm -f app2
ls /sys/fs/cgroup/system.slice/ | grep -c docker-c4331b84240cc764ff6e656469e72b1bece8b5c11442d7a8fa789d20e55796e4
```

```text
/sys/fs/cgroup/system.slice/docker-c4331b84240cc764ff6e656469e72b1bece8b5c11442d7a8fa789d20e55796e4.scope
0
```

删除前目录在，`docker rm` 之后计数 0——**容器删除，对应 cgroup 目录跟着被清掉**，不会泄漏。至于哪些锁能事后 `docker update` 改（`--cpus`、`-m`、`--pids-limit` 都行，前几球一路在用），哪些只能创建时定，`docker update --help` 和[官方 update 参考](https://docs.docker.com/reference/cli/docker/container/update/)有完整清单。

---

## 雪球 10：写进 Compose——声明式的锁

[第 13 篇雪球 8](/云原生/docker/docker-13-compose) 已经埋过线：`deploy.resources.limits` 在单机 `docker compose up` 也生效。现在从 cgroup 这头再看一遍。建 `/root/cgroup-lab/compose.yaml`：

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
cd /root/cgroup-lab
docker compose up -d
docker inspect cgroup-lab-web-1 --format 'NanoCpus={{.HostConfig.NanoCpus}} Memory={{.HostConfig.Memory}}'
docker exec cgroup-lab-web-1 sh -c 'cat /sys/fs/cgroup/cpu.max /sys/fs/cgroup/memory.max'
```

```text
 Container cgroup-lab_default  Creating
 Container cgroup-lab_default  Created
 Container cgroup-lab-web-1  Creating
 Container cgroup-lab-web-1  Created
 Container cgroup-lab-web-1  Starting
 Container cgroup-lab-web-1  Started
NanoCpus=500000000 Memory=536870912
50000 100000
536870912
```

和雪球 9 的 `docker run` 结果**一个字节不差**：YAML 里的 `cpus: '0.50'` / `memory: 512M`，最终还是变成 `NanoCpus=500000000` / `Memory=536870912`，落进 `cpu.max` 和 `memory.max`。`deploy` 块当年是 Swarm 语义，但 limits 这部分单机 Compose 就认（`replicas`、`restart_policy` 那些 Swarm 专属字段仍会被忽略）。清场：

```bash
docker compose down
```

```text
 Container cgroup-lab-web-1  Stopping
 Container cgroup-lab-web-1  Stopped
 Container cgroup-lab-web-1  Removing
 Container cgroup-lab-web-1  Removed
 Network cgroup-lab_default  Removing
 Network cgroup-lab_default  Removed
```

---

## 雪球 11 🧗：freezer——不杀进程的暂停

子系统表里有个 freezer：「暂停/恢复 cgroup 内进程」。Docker 把它做成了 `pause`：

```bash
docker pause lab-box
docker ps --filter name=lab-box --format '{{.Names}}  {{.Status}}'
CID=$(docker inspect lab-box --format '{{.Id}}')
cat /sys/fs/cgroup/system.slice/docker-$CID.scope/cgroup.freeze
docker exec lab-box true
echo "exec exit=$?"
```

```text
lab-box
lab-box  Up About a minute (Paused)
1
Error response from daemon: Container lab-box is paused, unpause the container before exec
exec exit=1
```

状态变 `(Paused)`，宿主机侧 `cgroup.freeze` 从 0 变 **1**——整个袋子的进程被内核原地冻结，`exec` 直接被 daemon 拒绝。解冻：

```bash
docker unpause lab-box
cat /sys/fs/cgroup/system.slice/docker-$CID.scope/cgroup.freeze
```

```text
lab-box
0
```

和 `docker stop` 的区别：stop 是**杀掉**主进程（状态、连接全丢），pause 是把进程组**冻住**——内存里原地站着，TCP 连接、程序计数器都还在，解冻后从断点继续。适合快照、线上紧急止血这类「先停住别弄死」的场景。v1 里它是独立子系统 freezer，v2 内建成 `cgroup.freeze` 一个文件，所以雪球 2 的控制器清单里找不到它。

实验全部结束，清场：

```bash
docker rm -f lab-box oom-demo app
```

---

## 命令怎么记

按滚雪球的顺序记——每道锁都是「一个参数 + 一个文件」：

| 上锁 | 参数 | 落在哪个 cgroup 文件 | 哪一球用过 |
|------|------|--------------------|-----------|
| CPU 配额 | `--cpus 0.5`（或 `--cpu-quota` + `--cpu-period`） | `cpu.max` | 4、9 |
| 绑核 | `--cpuset-cpus 0` | `cpuset.cpus` | 5 |
| 内存 | `-m 128m`（配 `--memory-swap`） | `memory.max` / `memory.swap.max` | 6、9 |
| 进程数 | `--pids-limit 12` | `pids.max` | 8 |
| 暂停 | `docker pause` / `unpause` | `cgroup.freeze` | 11 |
| 声明式 | Compose `deploy.resources.limits` | 同上，up 时落表 | 10 |

验证类命令同样按球记：

| 看什么 | 命令 | 哪一球用过 |
|--------|------|-----------|
| 容器在哪张袋里 | `cat /proc/<宿主机PID>/cgroup` | 2 |
| 锁的现值 | 容器内 `cat /sys/fs/cgroup/cpu.max` 等 | 3-8 |
| CPU 是否被限流 | `cat cpu.stat`（`nr_throttled`） | 4 |
| OOM 复盘 | `cat memory.events`、`dmesg` | 6 |
| 内存明细 | `cat memory.current` / `memory.stat` | 7 |
| 进程数现值 | `cat pids.current` | 8 |
| 参数落在哪个字段 | `docker inspect --format '{{.HostConfig…}}'` | 1、4、9、10 |

---

## 历史包袱：cgroup v1 → v2，别死抄旧路径

本机整篇都是 v2（`cgroup2fs` 一棵树）。但 v1 统治了十几年，网上教程、公司老机器、面试题里到处是它的样子——下面这些输出是老环境（CentOS + v1）的真实记录，认得出就行，**别在新机器上照抄**。

v1 的第一个特征：每个子系统**各自挂载一处**，`lssubsys -m` 一览（这工具来自老包 libcgroup）：

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

```bash
$ ls cpu
cgroup.clone_children  cpu.stat  docker  notify_on_release  tasks ...

$ ls cpu/docker/
9c3057f1291b53fd54a3d12023d2644efe6a7db6ddf330436ae73ac92d401cf1
cpu.stat  tasks  ...
```

层级关系长这样：

```text
/sys/fs/cgroup/cpu/docker/          ← 所有 Docker 容器
└── <container_id>/                 ← 单个容器
    └── tasks                       ← 容器内进程 PID 列表
```

创建容器 = 在各子系统下建 `<容器ID>` 目录、把 PID 写进 `tasks`；容器删除，目录移除——和 v2 的三步填表（雪球 2）是同一件事，只是 v1 要在**六个子系统各建一份**，v2 一个 scope 目录全搞定。

新旧文件名对照（看到旧名字按这张表换算）：

| v1 | v2 | 哪一球见过 v2 侧 |
|----|----|-----------------|
| `tasks` | `cgroup.procs` | 3 |
| `cpu.cfs_quota_us` + `cpu.cfs_period_us` | `cpu.max`（一行两列） | 4 |
| `cpu.shares` | `cpu.weight` | 下面实测 |
| `memory.limit_in_bytes` | `memory.max` | 6 |
| `memory.memsw.limit_in_bytes` | `memory.swap.max` | 6 |
| `blkio.*` | `io.*` | — |
| `<子系统>/docker/<id>/` | `system.slice/docker-<id>.scope/` | 2 |

连「新旧参数混用」都能实测给你看——老参数 `--cpu-shares 512`（v1 的 cpu.shares，软权重）在 v2 机器上照收，daemon 换算成 `cpu.weight`：

```bash
docker update --cpu-shares 512 lab-box
docker exec lab-box cat /sys/fs/cgroup/cpu.weight
```

```text
lab-box
59
```

512 换算成了 59（v2 的权重范围 1~10000，不是 v1 的 0~1024）。注意 `cpu.weight` 和 `cpu.max` 的本质区别：**weight 是竞争时的相对份额**（CPU 紧张时按权重分），**max 是硬上限**（闲着也不许超）——生产限资源用 `--cpus`，别拿 shares 当限额。

时间线收个尾：cgroup v2 内核 4.5（2016）成型、4.15 起可日常使用；systemd 244、Docker Engine 20.10（2020-12）跟进支持后，主流发行版（Fedora 31+、Ubuntu 21.10+）陆续默认 v2。所以 2026 年的新环境基本是 v2，但读旧资料时，[第 19 篇](/云原生/docker/docker-19-process-view)那句提醒永远适用：**cgroup 路径以本机 `mount | grep cgroup` 为准，不要死抄**。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|--------|----------------------|
| [第 5 篇](/云原生/docker/docker-05-container-and-image) 容器与镜像 | 雪球 6：`OOMKilled` / `ExitCode` 排障字段 |
| [第 13 篇](/云原生/docker/docker-13-compose) Compose | 雪球 10：`deploy.resources.limits` 单机生效 |
| [第 15 篇](/云原生/docker/docker-15-logging-monitoring) 日志与监控 | 雪球 1/4/7/8：`stats` 各列的 cgroup 来源 |
| [第 16 篇](/云原生/docker/docker-16-tech-foundation) 技术底座 | 开头：Namespace/Cgroup 分工；雪球 3：cgroup namespace |
| [第 18 篇](/云原生/docker/docker-18-namespace) Namespace | 开头：视图隔离 vs 资源限额 |
| [第 19 篇](/云原生/docker/docker-19-process-view) 进程视角 | 雪球 2：`/proc/<pid>/cgroup`；雪球 6：137；雪球 8：PID 1 收尸 |
| [第 21 篇](/云原生/docker/docker-21-daemon-runtime) Daemon 与 runtime | 下一篇：runc 建 namespace + cgroup 的调用链 |
| [第 22 篇](/云原生/docker/docker-22-container-security) 容器安全 | 子系统表 devices 行：设备访问控制走 eBPF |

---

## 小结

一个 `lab-box`，十一次落笔：

1. **不设限**：LIMIT 显示整机内存 7.757GiB——这就是要用 Cgroups 的理由；Namespace 管视图，Cgroup 管资源。  
2. **找到袋子**：v2 一个 `cgroup2fs` 挂 `/sys/fs/cgroup`，容器住在 `system.slice/docker-<id>.scope`；Docker 只是填表员，内核才是裁判。  
3. **容器内视角**：cgroup namespace 让它看见自己是根；`cpu.max = max 100000` 是没锁的白纸；`cgroup.procs`（v1 叫 `tasks`）是成员名单。  
4. **CPU 配额**：`--cpus 0.5` → `cpu.max = 50000 100000`，整个 cgroup 合计封顶 50%，`cpu.stat` 里 `nr_throttled` 是实锤。  
5. **绑核**：`--cpuset-cpus 0` → `cpuset.cpus`，管「在哪跑」，与配额叠加不冲突。  
6. **内存硬限**：`-m 128m` → `memory.max`，越线内核 OOM 杀袋内大头；`CONSTRAINT_MEMCG` 说明只伤自己；PID 1 被杀才有 `Exited (137)`。  
7. **内存账本**：`memory.current` 总账、`memory.stat` 明细，就是 `stats` 和监控的数据源。  
8. **进程数**：`--pids-limit` 防 fork 炸弹；僵尸不释放配额——PID 1 得会收尸。  
9. **出生戴锁**：`--cpus` 记 `NanoCpus`、`--cpu-quota/period` 记 `CpuQuota`，两条路同落 `cpu.max`；默认 `--memory-swap` = 2×`-m`；容器删、目录清。  
10. **声明式**：Compose limits 与 `docker run` 落到完全相同的字段和文件。  
11. **freezer**：`docker pause` → `cgroup.freeze=1`，冻住而非杀死。

**思考题**：只设 `-m 512m` 不设 `--memory-swap`，容器能用 swap 吗？（提示：雪球 9 里 `MemorySwap=1073741824`、`memory.swap.max=536870912` 已经剧透了一半；另一半是：cgroup v1 时代这个默认行为和 swap 记账方式有何不同？）再想一题：`--cpus 0.5` 和 `--cpuset-cpus 0` 同时在身，再叠加 `--cpu-shares 512`，三个参数各在什么时候起作用？

视图隔离（Namespace）与资源限额（Cgroups）都齐了。下一篇把调用链补全：[《Docker Daemon 与 runtime——一条 docker run 经过了谁的手》](/云原生/docker/docker-21-daemon-runtime)——`dockerd → containerd → shim → runc` 如何把这些内核能力串成一次 `docker run`。

---

## 参考资料

- [Docker: 资源限制官方指南](https://docs.docker.com/engine/containers/resource_constraints/)
- [docker run 参考（资源相关参数）](https://docs.docker.com/reference/cli/docker/container/run/)、[docker update 参考](https://docs.docker.com/reference/cli/docker/container/update/)
- [内核文档：cgroup v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)、[cgroup v1（历史）](https://docs.kernel.org/admin-guide/cgroup-v1/index.html)
- 本机：WSL2 Ubuntu-22.04（内核 6.6.87.2-microsoft-standard-WSL2）+ Docker 29.1.3（cgroup v2 + systemd 驱动）
