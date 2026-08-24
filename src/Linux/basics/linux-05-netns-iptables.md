---
title: 手搓迷你容器网络——从一间空 netns 滚到 DNAT 半路改端口
sidebarGroup: Linux 基础
shortTitle: 05 netns 与 iptables
order: 5
date: 2026-08-17T00:00:00.000Z
category: Linux
tag:
  - Linux
  - 网络
  - netns
  - iptables
  - Docker前置
description: 像滚雪球一样手搓迷你 Docker 网络：ip netns 建独立网络栈（屋里只有 DOWN 的 lo）、veth 两头分放两间屋、配 IP 看路由自动学会、实测 iptables 规则跟着 netns 走，最后手搓 DNAT 复刻嵌入式 DNS 的 53→随机口把戏——全部本机实测。
---

> **Linux 板块 · 第 5 篇**  
> 上一篇：[《NAT 现场实录》](/Linux/basics/linux-04-nat)（MASQUERADE/DNAT 的场景与抓包）  
> 下一篇：[《bind 挂载实操》](/Linux/basics/linux-06-bind-mount)（系列从网络转向文件系统：Docker `-v` 的内核层前置）  
> 读完可接着看：[《Docker 网络——从 localhost 不通滚到能用名字互访》](/云原生/docker/docker-15-network)（本文是它雪球 3「拆穿」框的直接前置）

---

## 开头：容器的独立网络，自己动手也能搓出来

用过 Docker 的人迟早撞上两件怪事：

- 容器里有自己的 eth0、自己的 IP、自己的 `localhost`，还能跟别的容器互通——这套网络是谁给的？
- 宿主机 `iptables` 里躺着 Docker 写的一堆规则，可容器自己那套规则外面愣是看不见——为什么？

Docker 系列讲嵌入式 DNS 时那段「拆穿」，把两件事拧在了一起：

> 翻译员不直接监听 53 口：它在容器自己 netns 的回环上开**随机端口**，再往 netns 里写一条 **nat 规则**，把「访问 127.0.0.11:53」半路改写到随机真口。

`netns` 是什么？`nat 规则`又是什么？为什么「写到 netns 里」容器外面就看不见？

根因一句话：容器的独立网络不是 Docker 变出来的魔法，而是内核现成的两样东西——**netns（一间独立的网络屋子）+ veth（一根虚拟网线）**；Docker 只是替你自动建房、拉线、写规则，这些事没有 Docker 也做得成。

本篇不先背命令。就在宿主机上**手搓一个迷你版 Docker 网络**，一次滚一球，滚到最后一球把开头那个把戏原样复刻一遍：

| 雪球 | 你加上去的 | 当场能看见的效果 |
|------|-----------|------------------|
| **1** | 第一间网络屋子（netns） | 屋里只有一块 DOWN 的 lo，路由表全空 |
| **2** | 一根虚拟网线（veth pair），两头分放两间屋 | 两间屋各多出一块配对的网卡，但还 DOWN 着、没号 |
| **3** | 给两头配 IP、拉起接口 | 路由表自动多出一条；跨屋 ping 通 |
| **4** | 往屋里看 iptables | 宿主 nat 表躺着 Docker 的 7 条规则，屋里干干净净——规则也跟着 netns 走 |
| **5** | 在屋里手写一条 DNAT | 监听 9090、连 8080，数据照样到——复刻嵌入式 DNS 的把戏 |
| **收官 🧗** | 换成真容器再进屋 | `nsenter` 进 Docker 容器看它自己那套规则 |

贯穿全文的故事：宿主机上的两间屋子 `demo-a`、`demo-b`，一路长成一个迷你容器网络。实验全程在宿主机一个终端里以 **root** 跑（netns 和 iptables 都需要）；环境指纹：WSL2 Ubuntu-22.04、iptables v1.8.7（legacy 后端）。命令全部可照抄，实验对象删掉即净。官方入口：[ip-netns(8) 手册](https://man7.org/linux/man-pages/man8/ip-netns.8.html)、[iptables(8) 手册](https://man7.org/linux/man-pages/man8/iptables.8.html)。

---

## 雪球 1：建第一间网络屋子——屋里只有一块 DOWN 的 lo

Docker 每跑一个容器，背后就建一间这样的屋子。先把屋子建出来：

```bash
ip netns add demo-a
ip netns add demo-b

ip netns list
```

```text
demo-b
demo-a
```

两间屋子建好了，`list` 把它们都列出来（顺序不必在意）。进屋看家当——`ip netns exec 名字 命令` = 「进到这间屋里执行命令」，本文全程靠它进出：

```bash
ip netns exec demo-a ip -br addr
```

```text
lo               DOWN
```

```bash
ip netns exec demo-a ip route
```

```text
（空——一条路由都没有）
```

再对照宿主机自己（不用 exec，直接跑）：

```bash
ip -br addr | head -4
```

```text
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0             UP             172.22.212.111/20 fe80::215:5dff:fe94:9157/64
br-232b31f9d168  DOWN           172.19.0.1/16
br-c88cb4c6fe5f  DOWN           172.20.0.1/16
```

逐行读这组对照：

| 输出 | 含义 |
|------|------|
| 屋里的 `lo DOWN` | 新屋子只有一块回环口，还是**断电**状态 |
| 屋里的路由（空） | 整张路由表一条都没有 |
| 宿主 `eth0 UP` | 宿主的对外网卡，带着真实 IP；屋里完全看不见它 |
| 宿主两块 `br-*` | Docker 建的网桥（[第 4 篇](/Linux/basics/linux-04-nat)抓包时见过）；同样与屋里无关 |

一句话：**新建的 netns 是一间「毛坯房」**——没有对外网卡、没有路由，里面什么也连不上。

> 坑，先记现象（雪球 3 补）：此刻在屋里连 `ping 127.0.0.1` 都不通——`lo` 还 DOWN 着。雪球 3 拉起它。

回头看刚冒出来的名字。**netns**（Network Namespace，网络命名空间）= **一份独立的网络栈**：网卡列表、路由表、防火墙规则、端口与套接字、`localhost`——全套各来一份，互相看不见。一个进程被放进某个 netns，它眼里的网络就是「这间屋子」里的全部：

```text
┌── 宿主机 netns（一间屋）──┐        ┌── demo-a netns（另一间）──┐
│ lo + eth0 + br-*（一排网卡）│       │ lo（DOWN）                 │
│ 路由表：一整套              │       │ 路由表：空                 │
│ iptables：Docker 写的规则   │       │ iptables：空表             │
│ 127.0.0.1（这份）           │       │ 127.0.0.1（另一份）        │
└────────────────────────────┘        └────────────────────────────┘
                两间屋互不知道对方的存在
```

**为什么要有它**：这是容器网络隔离的基石。所谓「容器有自己的 IP、自己的 localhost、自己的路由」，本质就是**进程被塞进了一间独立的 netns**。Docker 替你自动建房；今天手动建，看清每块砖。

**背景知识**：netns 只是 Linux 六种 namespace（pid、net、mnt、uts、ipc、user）之一，其余几种管进程号、文件系统挂载等的隔离，[Docker 第 18 篇](/云原生/docker/docker-20-namespace)系统展开，本文只管网络这一种。

---

## 雪球 2：装一根虚拟网线——veth pair 两头分放

两间毛坯房之间默认没有任何通道。本球拉线。

**veth（virtual ethernet）pair = 一根虚拟网线的两端**：一对接口天生配对，从一端进必然从另一端出。把两端分别放进两个 netns，就等于在两间屋之间穿了根网线：

```text
┌──── demo-a ────┐                        ┌──── demo-b ────┐
│     veth-a     ╞════════════════════════╡     veth-b     │
└────────────────┘                        └────────────────┘
        └──── 从 a 进，必从 b 出（反向同理）────┘
```

Docker 容器里的 `eth0` 就是 veth 的一端——另一端留在宿主机，插在网桥上。这个「配对」记号下一球的真实输出里能亲眼看到。

接线一共四步：**建线 → 分端 → 配号 → 拉起**。本球先做前两步（后两步是雪球 3）：

```bash
# ① 建一对 veth（在宿主上执行；此刻两端都还在宿主的 netns 里）
ip link add veth-a type veth peer name veth-b

# ② 把两端分别塞进两间屋子
ip link set veth-a netns demo-a
ip link set veth-b netns demo-b
```

效果：宿主的网卡列表里 veth-a / veth-b 消失了；再进屋看，demo-a 里凭空多出一块 `veth-a`——还 DOWN 着、没配号（它的完整长相下一球的真实输出里见）。

线是通了「物理层」，但现在 **ping 不了任何人**：两头没有 IP，屋里路由表还是雪球 1 那张空表，包想出门都不知道走哪块网卡。差的就是「号」和「路」——下一球配上 IP，你会看到路是内核**自动**学会的，不用手写。

---

## 雪球 3：给两头配 IP——路由自动学会，跨屋 ping 通

接着滚四步接线的后两步（配号 → 拉起）。给两端各配一个**同网段**的 IP——`/24`、`10.99.1.x` 这些网段记号出自[本系列第 2 篇](/Linux/basics/linux-02-ip-subnet-gateway)：

```bash
# ③ 各配一个同网段的 IP
ip netns exec demo-a ip addr add 10.99.1.1/24 dev veth-a
ip netns exec demo-b ip addr add 10.99.1.2/24 dev veth-b

# ④ 拉起接口（顺带把 lo 也拉起——雪球 1 的坑在这补上，屋里 127.0.0.1 从此能用）

ip netns exec demo-a ip link set veth-a up
ip netns exec demo-a ip link set lo up
ip netns exec demo-b ip link set veth-b up
ip netns exec demo-b ip link set lo up
```

验收。看 demo-a 的家当和路由：

```bash
ip netns exec demo-a ip -br addr
```

```text
lo               UNKNOWN        127.0.0.1/8 ::1/128
veth-a@if201     UP             10.99.1.1/24 fe80::3ca9:b5ff:fe04:64fb/64
```

```bash
ip netns exec demo-a ip route
```

```text
10.99.1.0/24 dev veth-a proto kernel scope link src 10.99.1.1
```

**怎么读**：

| 输出 | 含义 |
|------|------|
| `lo UNKNOWN`（原来是 DOWN） | 雪球 1 的坑补上了：回环口通电，127.0.0.1 可用 |
| `veth-a@if201` | 接口名带 `@if201` 后缀 = **它是一对里的一端，另一端是宿主接口编号 201 的那块**（此刻正是 demo-b 里的 veth-b）。容器里看到的 `eth0@if88` 就是同款 |
| `UP` + `10.99.1.1/24` | 接口已拉起、配上了号；后面那串 `fe80::…` 是内核自动生成的 IPv6 链路本地地址 |
| 自动出现的路由 | 给接口配 IP 时内核自动登记：「`10.99.1.0/24` 这片从 veth-a 直连可达」——**不需要手写** |

那条路由逐段念：目的网段 `10.99.1.0/24`，从 `veth-a` 出去；`proto kernel` = 内核配 IP 时自己装的（不是手写的静态路由）；`scope link` = 直连网段；`src 10.99.1.1` = 发往这片时用的源地址。

跨屋 ping：

```bash
ip netns exec demo-a ping -c 2 10.99.1.2
```

```text
PING 10.99.1.2 (10.99.1.2) 56(84) bytes of data:
64 bytes from 10.99.1.2: icmp_seq=1 ttl=64 time=0.030 ms
64 bytes from 10.99.1.2: icmp_seq=2 ttl=64 time=0.024 ms

--- 10.99.1.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss
```

逐行读：`56(84) bytes` = 数据部分 56 字节，连 ICMP+IP 头共 84；`ttl=64` = Linux 默认跳数上限，中间没过任何路由器所以原样返回；`time=0.03 ms` = veth 是内核里倒一手内存，不走路真的网线，所以比真实网卡快两个数量级；末尾两行 = 发 2 收 2、0% 丢包。

**通了**。此刻你手工完成了 Docker 每次 `docker run` 背后做的事：建房（netns）、拉线（veth）、配号（IP）、走路（路由）。再加一个「网桥」把多根 veth 汇聚起来，就是 docker0 的原型——那步留给 Docker 系列看现成的。

---

## 雪球 4：往屋里看防火墙——iptables 规则也跟着 netns 走

网通了，回头拆开头第二个疑问：为什么容器里的 iptables 和宿主不一样？先补齐 iptables 的骨架，再做一组实测对比。

**iptables 是 Linux 的包处理框架**，三级结构：

- **表（table）**：按职能分。最常用两个——`nat` 表管**改写地址**（换头），`filter` 表管**放行/丢弃**（安检）
- **链（chain）**：按**时机**分。包的一生路过几个关口，每个关口一条链：

```text
                ┌──────────── 进入本机的包 ────────────┐
                │  PREROUTING(nat) → 路由判断 → INPUT(filter) → 本机进程
 网卡收到包 ────┤
                │  ┌── 转发的包: FORWARD(filter) ──┐
                │  │                              ↓
 本机进程发包 ──┴─┴→ OUTPUT(nat+filter) ──────→ POSTROUTING(nat) → 网卡发出
```

- **规则（rule）**：挂在链上的一条条判断。「匹配什么（源/目的/协议/端口）→ 做什么（ACCEPT/DROP/DNAT/MASQUERADE…）」

一条真实规则的逐字段解剖——就用 Docker 嵌入式 DNS 那条（[第 4 篇](/Linux/basics/linux-04-nat)和 Docker 系列都抓到过）：

```text
-A DOCKER_OUTPUT -d 127.0.0.11/32 -p tcp -m tcp --dport 53 -j DNAT --to-destination 127.0.0.11:39611
```

| 字段 | 读法 |
|------|------|
| `-A DOCKER_OUTPUT` | Append：把这条规则**追加**到 DOCKER_OUTPUT 链尾 |
| `-d 127.0.0.11/32` | 匹配条件：**目的地址**是 127.0.0.11（`/32` = 精确这一个号） |
| `-p tcp -m tcp --dport 53` | 匹配条件：TCP 协议、**目的端口** 53 |
| `-j DNAT` | 命中后跳给 DNAT 这个动作：**改写目的地址** |
| `--to-destination 127.0.0.11:39611` | 改写成什么：同地址的 39611 端口 |

一句话念出来：「**去往 127.0.0.11 的 53 端口的 TCP 包，把目的地改写成 39611 端口再放行**」。

**关键性质：规则属于 netns**。每间屋子的 iptables 是独立的一套（这正是「容器自己那套规则」的含义）。实测对比——宿主的 nat 表里躺着 Docker 写的一堆规则，而自建 netns 里干干净净：

```bash
iptables -t nat -S POSTROUTING | wc -l        # 宿主：nat 表 POSTROUTING 链
```

```text
7
```

```bash
ip netns exec demo-a iptables -t nat -S       # demo-a 屋里：同一张表，只有默认策略
```

```text
-P PREROUTING ACCEPT
-P INPUT ACCEPT
-P OUTPUT ACCEPT
-P POSTROUTING ACCEPT
```

**怎么读**：`-S` = 按「存储格式」列出全部规则；`-P … ACCEPT` 是链的默认策略（没规则命中时放行）。demo-a 的表里**一条 `-A` 规则都没有**——宿主的 7 条 Docker 规则对它**完全不存在**。反过来：往屋里写的规则，宿主上也看不见。开头那句「写到 netns 里，容器外面就看不见」的原因就在这；下一球就靠这个性质变把戏。

---

## 雪球 5：手搓 Docker 的把戏——OUTPUT 关口 DNAT 半路改端口

目标：在自己建的 netns 里复刻开头那段话——**让「监听 9090、连接 8080」依然通**。

**① 在 demo-a 里挂一条 OUTPUT 链的 DNAT 规则**。为什么是 OUTPUT？回看雪球 4 那张关口图：**本机进程发出的包必经的关口**就是它——嵌入式 DNS 要改的是容器自己进程发出的包，所以 Docker 也挂在容器屋里 OUTPUT 下面：

```bash
ip netns exec demo-a iptables -t nat -A OUTPUT -p tcp --dport 8080 \
    -j DNAT --to-destination 127.0.0.1:9090
```

再列一次这条链，确认写进去了：

```bash
ip netns exec demo-a iptables -t nat -S OUTPUT
```

```text
-P OUTPUT ACCEPT
-A OUTPUT -p tcp -m tcp --dport 8080 -j DNAT --to-destination 127.0.0.1:9090
```

第二行就是刚写的那条，读法跟雪球 4 的解剖表一模一样，只换了两个数：匹配 8080，改成 9090。

**② 在屋里起一个监听 9090 的进程**（`nc -l 9090`，收到的内容存文件）：

```bash
timeout 8 ip netns exec demo-a nc -l 9090 > /tmp/recv.txt &
```

**③ 再在屋里用客户端连 8080、发一句话**：

```bash
echo hello-via-8080 | timeout 3 ip netns exec demo-a nc 127.0.0.1 8080
```

**④ 验收——9090 那头收到了**：

```bash
cat /tmp/recv.txt
```

```text
hello-via-8080
```

**怎么读**：客户端明确连的是 **8080**，但数据从 **9090** 的监听进程里取了出来——中间正是那条规则在 OUTPUT 关口把目的地改写了。包自己从头到尾不知道 8080 的存在。而且这条规则在宿主机上 `iptables -t nat -S` 看不见——它长在 demo-a 屋里（雪球 4 的性质）。

对照 Docker 的做法，一模一样、只换了三个数：

| | 本文手搓 | Docker 嵌入式 DNS |
|---|----------|-------------------|
| 表面端口 | `8080` | `127.0.0.11:53`（resolv.conf 里写的） |
| 真实监听口 | `9090` | 随机口（如 `39611`） |
| 规则位置 | 自建 netns 的 OUTPUT 链 | 容器 netns 的 DOCKER_OUTPUT 链（挂在 OUTPUT 下） |
| 监听者 | `nc` | dockerd 的嵌入式翻译员 |

---

## 收官：重读那段「拆穿」，每个词都有落点

现在重读开头引文，每个词都有了落点：

> 「它在**容器自己 netns** 的回环上开随机端口」

→ 容器被放进独立 netns（雪球 1 建的那种屋子）；翻译员进程通过回环地址在这个屋里监听一个随机口（雪球 5 里 `nc -l 9090` 的角色）。

> 「再往 **netns 里写一条 nat 规则**，把「访问 127.0.0.11:53」半路改写到随机真口」

→ 雪球 5 那条 OUTPUT DNAT 的 Docker 版；因为规则写在**容器的** netns 里，宿主机上看不见它（雪球 4 的独立性实测），要看必须进屋。

### 🧗 进屋的两种方式：自建的用名字，容器用 PID

| 命令 | 特点 |
|------|------|
| `ip netns exec 名字 命令` | 按名字进（本文全程用法）；Docker 容器**默认没有**注册名字，直接用不了 |
| `nsenter -t <容器主进程PID> -n 命令` | 按 PID 进（`-n` = 只进网络这一份）；Docker 容器走这条路，PID 用 `docker inspect -f '{{.State.Pid}}'` 取 |

Docker 系列里 4.4 的 `nsenter … -n iptables …` 看规则、第 7 篇 `nsenter` 进容器，用的都是第二种（nsenter 本身的拆解见[本系列第 1 篇](/Linux/basics/linux-01-nsenter-prerequisites)）。

**收尾清理**（本文实验对象，删掉即净）：

```bash
ip netns del demo-a
ip netns del demo-b
ip netns list          # 空
```

（veth 两端随屋子一起消失，无需单独删。）

---

## 命令怎么记、一个历史包袱

按刚才滚雪球的顺序记命令：

| 意图 | 命令 | 你在哪一球用过 |
|------|------|----------------|
| 建/看/删屋子 | `ip netns add / list / del` | 1（删在收官） |
| 进屋执行 | `ip netns exec 名字 命令` | 1 起全程 |
| 拉线、分端 | `ip link add … type veth peer name …`、`ip link set … netns …` | 2 |
| 配号、拉起 | `ip addr add … dev …`、`ip link set … up` | 3 |
| 看路由 | `ip route` | 1（空的）、3（自动学会那条） |
| 看防火墙 | `iptables -t nat -S [链名]` | 4、5 |
| 写规则 | `iptables -t nat -A OUTPUT … -j DNAT --to-destination …` | 5 |
| 进真容器的屋 | `nsenter -t PID -n 命令` | 收官 🧗 |

**历史包袱：iptables 的两个后端**。`iptables` 命令是老一代前端，底下有两套后端：**legacy**（xtables，本机 v1.8.7 用的就是它）和 **nft**（规则被翻译进内核新框架 nftables，新版 Debian/Ubuntu 默认）。命令长得一样，但两边各记各的规则，混着用会互相看不见——同一台机器排障前先 `iptables --version` 看括号里的后端标注（本机是 legacy），确认大家看的是同一套。Docker 官方对这套后端差异专有一页讲坑，见下面参考资料第三条。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|--------|----------------------|
| [第 2 篇：IP、网段与网关](/Linux/basics/linux-02-ip-subnet-gateway) | 雪球 3 配的 `10.99.1.1/24` 用的就是那篇的网段知识 |
| [第 4 篇：NAT 白话拆解](/Linux/basics/linux-04-nat) | 雪球 4 解剖的那条 DNS 规则两篇都抓到过；雪球 5 等于把第 4 篇的 DNAT 搬进 netns 的 OUTPUT 关口 |
| [第 1 篇：nsenter 前置](/Linux/basics/linux-01-nsenter-prerequisites) | 收官的 `nsenter -t PID -n` |
| [第 6 篇：bind 挂载](/Linux/basics/linux-06-bind-mount) | 下一篇：网络地基完工，系列转向文件系统 |
| [Docker 第 11 篇：网络](/云原生/docker/docker-15-network) | 开头那段「拆穿」出自它 4.4；读完本文回头看它的雪球 3 |
| [Docker 第 18 篇：namespace](/云原生/docker/docker-20-namespace) | 雪球 1 的六种 namespace 全家福 |

---

## 小结

从一间空屋子开始，每次只加一样东西：

1. **雪球 1 · netns**：一份独立网络栈（网卡/路由/防火墙/localhost 全套独立）；新建的是「毛坯房」——只有 DOWN 的 lo、空路由表。  
2. **雪球 2 · veth pair**：虚拟网线，两端分放两个 netns 即互通；容器 `eth0@ifNN` 的 `@ifN` 就是配对另一端的编号。  
3. **雪球 3 · 配 IP**：路由不用手写，内核自动学会；跨屋 ping 通——`docker run` 背后的建房/拉线/配号/走路四步亲手走完。  
4. **雪球 4 · iptables**：三级结构——表（nat 改地址 / filter 管放行）→ 链（按时机：PREROUTING/INPUT/FORWARD/OUTPUT/POSTROUTING）→ 规则（匹配条件 + 动作）；**规则属于 netns**，屋内外互相不可见。  
5. **雪球 5 · DNAT 半路改写**：监听 9090、连 8080、数据照样到——Docker 嵌入式 DNS 的 `127.0.0.11:53 → 随机口` 就是这个把戏。  
6. **收官 · 进屋两条路**：`ip netns exec`（按名，自建的用）或 `nsenter -t PID -n`（按进程，Docker 容器用）。

**思考题**：
> 1. 雪球 3 结束后，在 demo-a 里 `ping 172.22.212.111`（宿主的 eth0）会怎样？为什么？（提示：看它路由表里有什么、缺什么。）
> 2. 雪球 5 如果把规则从 `OUTPUT` 链挪到 `PREROUTING` 链，`nc 127.0.0.1 8080` 还能通吗？（提示：本机进程发出的包，路过哪些关口？）

下一篇：[《bind 挂载实操》](/Linux/basics/linux-06-bind-mount)。

---

## 参考资料

- [ip-netns(8) 手册](https://man7.org/linux/man-pages/man8/ip-netns.8.html) — netns 的创建、命名与 `/var/run/netns`
- [iptables(8) 手册](https://man7.org/linux/man-pages/man8/iptables.8.html) — 表/链/目标定义
- [Docker Docs · Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/) — Docker 写入的规则全景
- 本机实测环境：WSL2 Ubuntu-22.04（root）、iptables v1.8.7 legacy 后端
