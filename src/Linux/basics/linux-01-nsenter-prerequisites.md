---
title: nsenter 前置知识——从看清一个进程滚到钻进容器
sidebarGroup: Linux 基础
shortTitle: 01 nsenter 前置知识
order: 1
date: 2026-08-17T00:00:00.000Z
category: Linux
tag:
  - Linux
  - 容器
  - 学习方法
  - Namespace
description: 从 ps 给眼前这个 bash 编号开始，每滚一球只加一层：/proc 档案室、进程环境属性、8 种命名空间与 inode 判同、unshare 亲手隔离、CAP_SYS_ADMIN 钥匙，最后用 nsenter 从宿主钻进容器看它的网卡、路由和端口。
---

> **Linux 板块 · 第 1 篇**（开篇）  
> 下一篇：[《IP、网段与网关》](/Linux/basics/linux-02-ip-subnet-gateway)  
> 关联阅读：[《进入 Docker 容器的四种方式》](/云原生/docker/docker-07-enter-container)（nsenter 的实战详解在 Docker 系列这篇）｜[《手搓迷你容器网络》](/Linux/basics/linux-05-netns-iptables)（net ns 的动手深挖）

---

## 开头：一条抄来的排障命令，每个字符都在为难你

容器排障最常见的处境：容器里是精简镜像，`ss`、`ip` 都没装，想看「容器到底在听哪个端口」只能从宿主钻进去。网上的教程甩给你一条命令：

```text
nsenter -t 5308 -n ss -tln
```

命令能跑通，但看不懂：5308 是哪来的数字？`-n` 切换了什么？为什么查到了端口却显示不出进程名？为什么前面要加 `sudo`？抄一次能混过去，换个报错就抓瞎——因为这条命令踩在一串 Linux 概念上：进程是什么、`/proc` 怎么暴露进程信息、命名空间隔离了什么、`setns` 系统调用做了什么、为什么需要 root。

根因一句话：**nsenter 只是「敲开别人命名空间的门」的一条命令，但门牌号住在 `/proc` 里、门本身是内核的 namespace 对象、开门要 root 的能力**——概念没铺平，命令就永远看不懂。

本篇不先背概念。咱们在同一台机器上走一条线：**找到进程 → 看清它的 namespace → 亲手隔离一个 → 再钻进容器**。每滚一球只加一层，当场跑一条命令看效果；跑不出预期结果就说明没懂，别往下走。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 进程与 PID | 眼前这个 bash 有了编号 15337，还看见它爹 15331 |
| **2** | `/proc` 档案室 | 77 个数字目录 = 77 个进程，内核清单肉眼可见 |
| **3** | 进程的环境属性 | `status` 体检表里 Uid 四个 0、NSpid 一个号 |
| **4** | 命名空间 + ns 句柄 + inode 判同 | 两行 `readlink` 同号——我和 1 号进程在同一网络世界 |
| **5** | `unshare` 亲手开新世界（+ 三个搬家动作） | 新世界里只剩一块 DOWN 的 lo；改主机名，外面纹丝不动 |
| **6** | 权限 CAP_SYS_ADMIN | 能力清单里真的抠得出 cap_sys_admin |
| **7** | nsenter 本体 | 命令在宿主跑，看见的却是容器的网卡、路由、端口 |

贯穿全文的终点线（滚完雪球 7 回头验收）：能不查资料回答——`-t` 后面为什么是 5308？`-n` 切换了什么？ss 查到了端口为什么显示不出进程名？为什么前面要 sudo？

**环境指纹**：本文全部输出实测自 WSL2 Ubuntu-22.04（内核 6.6.87.2-microsoft-standard-WSL2），默认用户 root——所以后文命令都没带 `sudo`，普通用户环境记得加。没有 WSL 的话，`docker run -it --rm ubuntu bash` 进个容器、或任意虚拟机/云主机，雪球 1~6 照样滚；只有雪球 7 需要一个运行中的容器当目标（到时候说）。官方入口：[namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)、[nsenter(1)](https://man7.org/linux/man-pages/man1/nsenter.1.html)。

这条「一次一层、跑通再走」的滚法，就是西蒙学习法（Herbert Simon，常被叫作「锥形学习法」——像锥子一样力量集中在一个点上往下钻）的操作化：

| 要点 | 含义 | 在本篇的体现 |
|------|------|-------------|
| **单一目标** | 一段时间只攻一个主题，不做发散阅读 | 目标锁定「看懂并能用 nsenter」，不顺手学整个 Linux |
| **组块拆解** | 拆成能独立理解的最小单元，理清依赖 | 7 个雪球，依赖单向：第 N 球踩着第 N-1 球 |
| **连续攻克** | 组块之间连续学习，不拉长战线 | 雪球 1~6 一个周末下午滚完 |
| **反馈闭环** | 学完立刻动手验证 | 每球一条验证命令，跑不通不前进 |

这几个概念互相咬合（不知道 /proc 就理解不了 ns 句柄，不理解 ns 就看不懂 setns），断续学习会不停回炉，总耗时反而翻倍——所以建议一口气滚完。

---

## 雪球 1：给眼前的东西编号——进程与 PID

一切从「眼前这个东西是什么」开始。你敲命令用的那个 bash，在内核眼里是一个**进程**：运行中的程序实例。内核给每个进程发一个唯一编号（PID），还记着它是谁生的（父进程，PPID）。

先给眼前这个 bash 上户口（`ps` 是查看进程的命令；`-p` 指定看哪个 PID；`-o` 自定义输出列，这里要 PID、父 PID、命令三列）：

```bash
$ ps -o pid,ppid,cmd -p $$
  PID    PPID CMD
15337   15331 bash
```

`$$` 是 shell 的特殊变量，永远等于「当前 shell 自己的 PID」。三行逐行看：

- 第一行是表头：接下来三列分别是 PID、PPID、CMD
- `15337`：你眼前这个 bash 是 15337 号进程
- `15331`：它爹（PPID）——通常是拉起它的那个终端

钉个小模型，程序和进程的区别就在这一步：

```text
硬盘里的程序 bash（躺着不动）
        │ 被 15331 号进程（终端）拉起来
        ▼
进程 15337（跑起来了，就是你眼前这个 shell）
```

回头看开头那条命令：`-t 5308` 里的 5308 就是这样一个号——目标进程的 PID。至于为什么要强调「**宿主上的** PID」（容器里的进程在容器里看自己是另一个号），先把现象记着，**雪球 3 补**。

---

## 雪球 2：打开内核的进程档案室——/proc

上一球知道了进程有编号。那内核把每个进程的详细信息放在哪？答案是个目录：`/proc`。内核把每个进程的信息暴露成文件，`/proc/<pid>/` 一个目录——命令行、环境变量、打开的文件全在里面。你天天用的 `ps`、`top`，本质上就是在读它。

`/proc/self/` 是个快捷方式，永远指向「当前正在读它的进程」自己——下面这条命令是 `ls` 在翻它自己的档案（`head -20` 只取前 20 行）：

```bash
$ ls /proc/self/ | head -20
arch_status
attr
auxv
cgroup
clear_refs
cmdline
comm
coredump_filter
cpuset
cwd
environ
exe
fd
fdinfo
gid_map
io
...
```

最后一行 `...` 是输出里的省略行——这个目录里东西很多。关键的几个条目：

| 条目 | 装着什么 |
|------|----------|
| `cmdline` | 进程的启动命令行 |
| `environ` | 环境变量 |
| `cwd` / `exe` | 工作目录 / 跑的是哪个可执行文件 |
| `fd` | 打开的文件们 |
| `status` | 进程体检表（雪球 3 就翻它） |
| `ns/` | 命名空间句柄——雪球 4 的主角，按字母序排在 n，前 20 行还没翻到 |

再数数整栋档案室住了多少进程（`-d` 只要目录；`[0-9]*` 匹配纯数字目录名；`wc -l` 数行数）：

```bash
$ ls -d /proc/[0-9]* | wc -l
77
```

77 个以数字命名的目录 = 此刻 77 个活着的进程——**内核的进程清单，肉眼可见**。nsenter 要找的门牌号、雪球 4 要用的 ns 句柄，全都住在这栋楼里。

---

## 雪球 3：进程不止是代码——它身上登记着「环境属性」

`/proc` 里最常翻的文件是 `status`，进程的体检表。这一球从里面挑两行出来看（`grep` 按内容过滤；`-E` 开正则；`|` 在正则里表示「或」——只要含 NSpid 或 Uid 的行）：

```bash
$ grep -E 'NSpid|Uid' /proc/self/status
Uid:	0	0	0	0
NSpid:	15344
```

（`Uid:` 和数字之间的空白是制表符——status 文件里字段就用 tab 分隔。）

逐行拆：

- `Uid:	0	0	0	0`——四个数字分别是真实/有效/保存/文件系统用户 ID，全 0 是因为本环境默认 root。这行顺便解释了本文命令为什么都不加 `sudo`：咱本来就是 root（权限这事雪球 6 正式讲）
- `NSpid:	15344`——这个进程的 PID 在**不同 PID 命名空间里**分别叫几号。这里只有一个数字，因为这个进程没被 PID 隔离

回收雪球 1 埋的坑：容器里的进程这一行会是**多个数字**——宿主上看一个号、容器里看另一个号（容器里自己往往是 1 号）。所以开头那条命令的 `-t` 用的必须是「宿主上的 PID」。

这一球真正要立的观念：进程不只是「一段跑着的代码」，它还归属于某套主机名、某套网卡、某张进程表、某个用户身份——这些「环境属性」由内核登记、按进程管理：

```text
进程 = 跑着的代码
     + 一套登记在案的环境属性：
       用户身份（Uid）、PID 视图（NSpid）、
       主机名、网卡、进程表、挂载点……
```

属性这么多，内核怎么管才不会乱？下一球揭晓：分组装箱。

---

## 雪球 4：命名空间——给环境属性分组装箱，用 inode 判同

**命名空间（namespace）**就是那个装箱法：Linux 内核的隔离机制，把上一球说的环境属性**分组装箱**，让一组进程看见一套自己的世界。内核提供 8 种：

| 命名空间 | 隔离什么 | 容器里的直观体现 |
|----------|----------|------------------|
| **pid** | 进程编号空间 | 容器里自己是 1 号进程 |
| **net** | 网卡、路由表、端口、iptables | 容器有独立 eth0 和 IP |
| **mnt** | 文件系统挂载点 | 容器有自己的根目录 |
| **uts** | 主机名 | 容器可以有自己的 hostname |
| ipc | System V IPC、POSIX 消息队列 | 容器间信号量互不可见 |
| user | 用户/组 ID | 容器里的 root ≠ 宿主 root |
| cgroup | cgroup 根视图 | 容器看到自己的 cgroup 树 |
| time | 系统时钟（引导/单调钟） | 较新，容器可微调时钟偏移 |

新问题立刻来了：两个进程，怎么知道它们是不是在同一个「世界」里？答案还是在 `/proc`——每个进程的每种 ns 在内核里是一个对象，`/proc/<pid>/ns/` 下用**符号链接**指过去，链接目标 `[类型:inode号]` 就是这个对象的**身份证号**：

```bash
$ ls -l /proc/self/ns/
total 0
lrwxrwxrwx 1 root root 0 Aug 17 16:13 cgroup -> cgroup:[4026531835]
lrwxrwxrwx 1 root root 0 Aug 17 16:13 ipc -> ipc:[4026532206]
lrwxrwxrwx 1 root root 0 Aug 17 16:13 mnt -> mnt:[4026532217]
lrwxrwxrwx 1 root root 0 Aug 17 16:13 net -> net:[4026531840]
lrwxrwxrwx 1 root root 0 Aug 17 16:13 pid -> pid:[4026532219]
lrwxrwxrwx 1 root root 0 Aug 17 16:13 pid_for_children -> pid:[4026532219]
lrwxrwxrwx 1 root root 0 Aug 17 16:13 time -> time:[4026531834]
lrwxrwxrwx 1 root root 0 Aug 17 16:13 time_for_children -> time:[4026531834]
lrwxrwxrwx 1 root root 0 Aug 17 16:13 user -> user:[4026531837]
lrwxrwxrwx 1 root root 0 Aug 17 16:13 uts -> uts:[4026532218]
```

逐行看关键信息：每行开头的 `lrwxrwxrwx` 说明这是个符号链接；箭头右边的 `net:[4026531840]`，方括号里就是「类型:身份证号」。8 种 ns 对应 8 行；多出的两行 `*_for_children` 是「未来子进程将进入的那份 ns」的句柄，通常与当前相同——比如 `pid_for_children` 和 `pid` 同号 4026532219。

由此得到贯穿容器排障的 **inode 判同法**：两个进程的某类 ns 身份证号相同 → 同一个世界；不同 → 两个世界。验证「我的 shell 和 1 号进程同属一个网络世界」（`readlink` 只取符号链接指向的目标）：

```bash
$ readlink /proc/self/ns/net
net:[4026531840]
$ readlink /proc/1/ns/net
net:[4026531840]
```

同号 4026531840——同一套网卡、路由、端口表。钉住：

```text
      同一个 net ns = 一套网卡表 / 路由表 / 端口表
              身份证同号：net:[4026531840]
   ┌─────────────┴─────────────┐
[你的 shell]              [1 号进程 /sbin/init]
```

到这一球，8 个名词和判同法都齐了。但看的全是「已经存在的世界」——想亲手造一个新世界吗？

---

## 雪球 5：unshare——亲手开一个平行世界，认清三个搬家动作

`unshare` 命令把自己搬进一个**新建**的 net ns，然后在里面执行你给的命令。进去看一眼网卡（`ip addr` 列网卡；`-br` 是 brief 短格式，一行一块）：

```bash
$ unshare -n ip -br addr
lo               DOWN
```

新 net ns 里**只有一块 DOWN 状态的 lo**，宿主的 eth0、docker0 全都不见了——不是被藏起来，是这个「平行世界」里压根没装过它们。代价也直接：在这个世界里你连不上任何网，连 lo 自己都是 DOWN 的。

换更直观的 uts（主机名）隔离再试一次，三个数字看懂「世界各自独立」：

```text
$ hostname
pc3507
$ unshare -u sh -c 'hostname demo-uts; hostname'
demo-uts
$ hostname
pc3507
```

- 第一条：进去前，宿主主机名 pc3507
- 第二条：`unshare -u` 开一个新 uts ns，`sh -c '命令1; 命令2'` 在新世界里先改主机名、再打印——出来的是 demo-uts
- 第三条：退出后回到宿主再看——纹丝不动，还是 pc3507

改的只是新世界的主机名，宿主不受任何影响。命名空间是「操作型概念」，读十遍文档不如亲手跑一次 `unshare -n`，然后盯着那块只剩 lo 的网卡发一会呆。

顺便把刚才动作背后的**三个系统调用**钉成一张表（只记语义，不必看内核代码）：

| 系统调用 | 干什么 | 命令行封装 |
|----------|--------|-----------|
| `clone(2)` | 创建进程，**顺手让新进程进入新 ns** | `docker run` 底层就是它 |
| `unshare(2)` | 把**自己**搬进新建的 ns | `unshare` 命令（刚才用过） |
| `setns(2)` | **加入一个已经存在的 ns** | **`nsenter`——本文主角** |

区别一句话：clone 生孩子进新世界，unshare 自己搬家进新世界，setns 敲开别人世界的门：

```text
clone  ：生孩子，孩子直接落进新世界   → docker run
unshare：自己搬进一个新造的世界       → 刚才的 unshare -n / -u
setns  ：敲开一个已存在的世界的门     → nsenter（雪球 7）
```

容器进程由 clone 生成；而 nsenter 让你从宿主「串门」进去。串门要钥匙吗？要——下一球。

---

## 雪球 6：权限——动别人的世界要 CAP_SYS_ADMIN

`setns` 进别人的命名空间是高危操作（想象任何用户都能钻进任何容器的网络世界），内核要求调用者具备 **`CAP_SYS_ADMIN`** 能力。root 天生拥有全部能力；普通用户的权力被内核拆成几十项命名能力，`CAP_SYS_ADMIN` 是其中管「系统管理」的那把万能钥匙（完整清单见 `capabilities(7)`）。

看看钥匙在不在身上（`capsh --print` 列出当前进程的全部能力；`grep -o` 只抠出匹配的那段原文）：

```bash
$ capsh --print | grep -o 'cap_sys_admin'
cap_sys_admin
```

输出原样抠出了 `cap_sys_admin`——钥匙在。所以本环境（默认 root，呼应雪球 3 那四个 0）直接跑；普通用户环境下，nsenter、unshare 前面加 `sudo`。

钥匙到手，去敲容器的门。

---

## 雪球 7：nsenter——从宿主钻进容器的三步走

万事俱备。三步法：**找 PID → 选 ns 开关 → 跑命令**。

目标：本机一个运行中的 Nginx 容器 `lab-net-web`（随手起一个后台容器也行，比如 `docker run -d --name ns-demo alpine:3.21 sleep infinity`；完整流程见 [Docker 系列 07 篇](/云原生/docker/docker-07-enter-container)）。

**第一步，找 PID。**容器主进程在宿主上的编号，Docker 直接告诉你（`docker inspect` 查容器详情；`-f '{{.State.Pid}}'` 是 Go 模板，只取「主进程 PID」这一个字段）：

```bash
$ docker inspect -f '{{.State.Pid}}' lab-net-web
5308
```

5308——开头那条命令里 `-t` 后面的数字，谜底揭晓：就是雪球 1 说的「宿主上的 PID」。

**切进去之前，先记住宿主视角长什么样**（我们熟悉的世界），待会儿好对照。docker0 网桥在（`ip addr` 又见面了；`-4` 只看 IPv4；`show docker0` 指定网卡）：

```bash
$ ip -br -4 addr show docker0
docker0          UP             172.17.0.1/16
```

宿主上还有 docker-proxy 替容器监听的发布端口 18080（`ss` 查端口：`-t` 只看 TCP、`-l` 只看监听、`-n` 端口用数字显示；`grep 18080` 过滤）：

```bash
$ ss -tln | grep 18080
LISTEN 0      4096         0.0.0.0:18080      0.0.0.0:*
```

**第二、三步合体：`-n` 切进容器的 net ns，再看同样的东西。**先看网卡：

```bash
$ nsenter -t 5308 -n ip -br -4 addr
lo               UNKNOWN        127.0.0.1/8
eth0@if63        UP             172.17.0.4/16
eth1@if161       UP             172.21.0.2/16
```

对比刚才宿主视角的 docker0——这三行全是**只在容器世界里才看得见**的：

1. `lo`：环回口，状态 UNKNOWN（没在用）
2. `eth0@if63`（172.17.0.4）：容器自己的网卡。`@if63` 后缀暴露它是 veth 虚拟网线的一端，对端是宿主的 63 号接口（第 2 篇埋的伏笔，第 5 篇动手做一根）
3. `eth1@if161`（172.21.0.2）：还挂着第二块网卡，因为这个容器同时加入了另一个 Docker 网络

再看路由表（`ip route` 列路由）：

```bash
$ nsenter -t 5308 -n ip route
default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 proto kernel scope link src 172.17.0.4
172.21.0.0/16 dev eth1 proto kernel scope link src 172.21.0.2
```

整套路由是容器自己的：第一行默认路由下一跳是 172.17.0.1——正是宿主那块 docker0 的地址，也就是[第 2 篇](/Linux/basics/linux-02-ip-subnet-gateway)讲过的网关；后两行是「172.17 / 172.21 两段各自走哪块网卡」的直连路由。

最后看端口表——开头那条命令的完整形态：

```bash
$ nsenter -t 5308 -n ss -tln
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess
LISTEN 0      4096      127.0.0.11:46533      0.0.0.0:*
LISTEN 0      511          0.0.0.0:80         0.0.0.0:*
```

- `0.0.0.0:80`：Nginx 在容器里听 80——和宿主上 docker-proxy 听的 18080 是两回事，一个是容器内的真实监听，一个是宿主上的发布端口
- `127.0.0.11:46533`：这是谁？——Docker 的**内嵌 DNS**（[Docker 系列 11 篇](/云原生/docker/docker-15-network)里容器互相用名字访问，靠的就是它；第 5 篇会亲手复刻它的把戏）
- Process 列（表头最后的 `Process`，下面两行都空着）：**查到了端口，却显示不出进程名**——现象先记下，拆完命令就解释

现在把整条命令拆成四个零件，每个都能对应到某一球：

```text
nsenter   -t 5308     -n               ss -tln
   │         │          │                 │
   │         │          │                 └─ 要跑的命令（在目标 ns 的视图里执行）
   │         │          └─ 切 net ns（雪球 4 的 net 句柄；底层是雪球 5 表里的 setns）
   │         └─ 目标进程的 PID（雪球 1 的编号；来自第一步 docker inspect 的 5308）
   └─ 敲门动作本体（setns 的命令行封装；要钥匙，雪球 6）
```

回头验收终点线四问：`-t 5308` 是目标进程在宿主上的 PID（雪球 1/2）；`-n` 把当前进程切进目标进程的 net ns（雪球 4/5）；ss 显示不出进程名，因为**进程表属于 pid ns，`-n` 没切它**（`-p` 才切 pid ns，于是 `-p` 会反过来——能看进程表、看不见容器的网卡；这条留给思考题）；要 sudo 因为动别人的 ns 需要 `CAP_SYS_ADMIN`（雪球 6）。

**边界**：nsenter 只切视图，不切换 cgroup 配置（CPU/内存限制不受影响）；且目标必须是宿主上真实存在的进程。完整实战（四种进容器方式的对比、排障故事）在 [Docker 系列 07 篇](/云原生/docker/docker-07-enter-container)。

---

## 怎么记：每个动作对照哪一球

| 你想干什么 | 命令 | 哪一球用过 |
|------------|------|-----------|
| 看自己是谁 | `ps -o pid,ppid,cmd -p $$` | 雪球 1 |
| 翻进程档案 | `ls /proc/self/` | 雪球 2 |
| 看进程登记信息 | `grep -E 'NSpid|Uid' /proc/self/status` | 雪球 3 |
| 判两个进程是否同一世界 | `readlink /proc/<pid>/ns/<类型>`，比身份证号 | 雪球 4 |
| 亲手开新世界 | `unshare -n` / `unshare -u` | 雪球 5 |
| 查有没有钥匙 | `capsh --print \| grep -o 'cap_sys_admin'` | 雪球 6 |
| 钻进别人世界 | `nsenter -t <pid> -n <命令>` | 雪球 7 |

节奏（对应西蒙学习法的「连续攻克」）：**雪球 1~6 一个下午连续滚完**，别拆到一周里每天看一点——概念咬合太紧，断点即回炉点；每球**先跑验证命令再读资料**，带着「刚才那个输出里的字段是什么」的问题去读，效率远高于干读；雪球 7 学完立刻做一次真实排障（或重走 Docker 07 篇的故事），**72 小时内没有应用的知识遗忘最快**。

---

## 历史包袱：8 种 ns 不是一天建成的

雪球 4 那张 8 种 ns 的表，是内核一个版本一个版本攒出来的（版本出自 [namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)）：

| ns | 加入的内核版本 |
|----|----------------|
| mnt | 2.4.19 |
| uts / ipc | 2.6.19 |
| user | 2.6.23（3.8 才真正可用） |
| pid | 2.6.24 |
| net | 2.6.29 |
| cgroup | 4.6 |
| time | 5.6 |

所以：在老内核上跑雪球 4 的 `ls -l /proc/self/ns/`，会**少 time 那两行**——不是坏了，是那个内核还没有 time ns。本机 6.6 内核 8 种全齐。同理，网上旧教程的 nsenter 选项表也常缺 `--userns` 这类较新选项——以你机器上的 `nsenter --help` 和 man 手册为准，别拿旧文当现行。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|--------|----------------------|
| [Docker 07：进入 Docker 容器的四种方式](/云原生/docker/docker-07-enter-container) | 雪球 7 的完整实战与排障故事 |
| [Docker 11：Docker 网络](/云原生/docker/docker-15-network) | 雪球 7 的 docker0、发布端口 18080、内嵌 DNS |
| [Docker 18：Namespace 隔离](/云原生/docker/docker-20-namespace) | 雪球 4 的 8 种 ns 在 Docker 里怎么落地 |
| [Linux 02：IP、网段与网关](/Linux/basics/linux-02-ip-subnet-gateway) | 雪球 7 的 172.17.0.0/16、default via 网关 |
| [Linux 05：netns 与 iptables 实操](/Linux/basics/linux-05-netns-iptables) | 雪球 7 的 eth0@if63 veth、内嵌 DNS 复刻；雪球 5 的继续深挖 |

---

## 小结

七个雪球，一条线滚完：

1. **进程与 PID**：一切皆有编号；`-t` 后面的数字就是目标进程在宿主上的进程号
2. **/proc**：内核的进程档案室，77 个数字目录肉眼可见；门牌号和 ns 句柄都住这里
3. **环境属性**：Uid 四个号、NSpid 看 PID 视图；容器进程的 NSpid 会有多个号
4. **命名空间**：8 种 ns 分组装箱；`/proc/<pid>/ns/` 句柄 + inode 判同法
5. **unshare**：亲手开新世界（只剩 DOWN 的 lo、改了不算数的 uts 主机名）；clone / unshare / setns 三个搬家动作
6. **CAP_SYS_ADMIN**：动别人的世界要这把钥匙，root 天生有，普通用户加 sudo
7. **nsenter**：找 PID → 选 ns 开关 → 跑命令；只切视图、不切 cgroup

**思考题**：

> 1. 宿主上起了两个容器 A、B。只允许使用 `docker inspect` 和 `readlink`，怎么判断它们的**网络**是否在同一个 net ns 里？如果再要判断「是否共享同一套挂载点」，换成哪个句柄？
> 2. 雪球 7 实测里 `nsenter -t 5308 -n ss -tln` 查到了端口却显示不出进程名；而把 `-n` 换成 `-p` 后会反过来（能看进程表，看不见容器的网卡）。为什么一条命令不能两全？`-n -p` 同时加会发生什么？

（提示：句柄类型见雪球 4 的表；ss 的端口表属 net ns、进程名属 pid ns——见雪球 7 的三步法。）

---

## 参考资料

每球一篇，刻意不发散：

| 雪球 | 资料 | 读法 |
|------|------|------|
| 2 | [proc(5) - Linux man page](https://man7.org/linux/man-pages/man5/proc.5.html) | 只读 `/proc/pid` 一节 |
| 3 | 同上（NSpid/Uid 字段） | 十分钟 |
| 4 | [namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)（man-pages **6.18**，当前最新版，2026 年初发布、4 月已进各发行版） | 8 种 ns 总表 + inode 判同法，一篇够了 |
| 5 | [setns(2)](https://man7.org/linux/man-pages/man2/setns.2.html)、[unshare(2)](https://man7.org/linux/man-pages/man2/unshare.2.html) | 只看 DESCRIPTION 前半 |
| 6 | [capabilities(7)](https://man7.org/linux/man-pages/man7/capabilities.7.html) | 只看 CAP_SYS_ADMIN 相关段落 |
| 7 | [nsenter(1)](https://man7.org/linux/man-pages/man1/nsenter.1.html)（util-linux 手册） | 过一遍选项；较新版本支持 `--userns` 等 |
| 选读 | [Datadog Security Labs: Container Security Fundamentals](https://securitylabs.datadoghq.com/articles/container-security-fundamentals-part-2/) | 容器隔离全景 |

- 实战落点：[进入 Docker 容器的四种方式（Docker 系列第 7 篇）](/云原生/docker/docker-07-enter-container) ｜ [第 5 篇：netns/veth/iptables 实操](/Linux/basics/linux-05-netns-iptables)
- 本机实测环境：WSL2 Ubuntu-22.04（内核 6.6.87.2-microsoft-standard-WSL2），默认用户 root；容器侧使用运行中的 `lab-net-web`（Nginx，主进程宿主 PID 5308）
