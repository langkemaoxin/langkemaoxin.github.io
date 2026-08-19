---
title: 网络命名空间与 iptables 规则实操——容器网络的两块地基
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
description: 手搓一个迷你容器网络：ip netns 建独立网络栈、veth 连通两个命名空间、逐字段读懂 iptables 表/链/规则，最后在自己建的 netns 里复刻 Docker 嵌入式 DNS 的 DNAT 端口改写把戏——全部本机实测。
---

> **Linux 板块 · 第 5 篇**  
> 上一篇：[《NAT 白话拆解》](/Linux/basics/linux-04-nat)（MASQUERADE/DNAT 的场景与抓包）  
> 下一篇：[《bind 挂载实操》](/Linux/basics/linux-06-bind-mount)（系列从网络转向文件系统：Docker `-v` 的内核层前置）  
> 读完可接着看：[《Docker 网络——从 localhost 不通滚到能用名字互访》](/云原生/docker/docker-11-network)（本文是它雪球 3「拆穿」框的直接前置）

---

## 开头：一段每个字都认识、连起来不知道的话

Docker 系列讲嵌入式 DNS 时有一段「拆穿」：

> 翻译员不直接监听 53 口：它在容器自己 netns 的回环上开**随机端口**，再往 netns 里写一条 **nat 规则**，把「访问 127.0.0.11:53」半路改写到随机真口。

`netns` 是什么？`nat 规则`又是什么？为什么「写到 netns 里」容器外面就看不见？本文动手回答：**从零手搓一个迷你版容器网络**——两间「网络屋子」、一根虚拟网线、一条自己的防火墙规则，最后把 Docker 那个把戏原样复刻一遍。读完再回头看上面那段话，每个词都有落点。

> **实验环境**：WSL2 Ubuntu-22.04，root 用户（netns 和 iptables 都需要）；iptables v1.8.7（legacy 后端）。所有命令可照抄，实验对象删掉即净。

---

## 一、netns：凭空隔出一间「网络屋子」

**是什么**：Network Namespace（网络命名空间，简称 netns）= **一份独立的网络栈**。网卡列表、路由表、防火墙规则、端口与套接字、`localhost`——全套各来一份，互相看不见。一个进程被放进某个 netns，它眼里的网络就是「这间屋子」里的全部。

**为什么**：这是容器网络隔离的基石。所谓「容器有自己的 IP、自己的 localhost、自己的路由」，本质就是**进程被塞进了一间独立的 netns**。Docker 替你自动建房；今天手动建，看清每块砖。

**怎么做**：内核提供，`ip` 命令直接操作。

```bash
$ ip netns add demo-a
$ ip netns add demo-b

$ ip netns list
demo-b
demo-a
```

进 demo-a 这间屋子看看家当（`ip netns exec 名字 命令` = 在该 netns 里执行命令）：

```bash
$ ip netns exec demo-a ip -br addr
lo               DOWN

$ ip netns exec demo-a ip route
（空——一条路由都没有）
```

对照宿主机自己：

```bash
$ ip -br addr | head -4
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0             UP             172.22.212.111/20 fe80::215:5dff:fe94:9157/64
br-232b31f9d168  DOWN           172.19.0.1/16
br-c88cb4c6fe5f  DOWN           172.20.0.1/16
```

**怎么读**：新建的 netns 里**只有一块 `lo`，还是 DOWN 的**；路由表整个是空的。这就是一间「毛坯房」——没有对外网卡、没有路由，里面什么也连不上。宿主机那丰富的网卡列表（eth0、各种网桥），它一概看不见。

**背景知识**：netns 只是 Linux 六种 namespace（pid、net、mnt、uts、ipc、user）之一；其余几种管进程号、文件系统挂载等的隔离，[Docker 第 18 篇](/云原生/docker/docker-18-namespace)系统展开，本文只管网络这一种。

---

## 二、两间屋子通网：veth pair 虚拟网线

**是什么**：veth（virtual ethernet）pair = **一根虚拟网线的两端**，一对接口天生配对，从一端进必然从另一端出。把两端分别放进两个 netns，两间屋子就通了。

**为什么**：两间独立的屋子默认没有任何通道；veth 是最简单的「穿墙网线」。Docker 容器里的 `eth0` 就是 veth 的一端（另一端留在宿主机插在网桥上）。

**怎么做（本机实测）**，四步：建线 → 分端 → 配 IP → 拉起：

```bash
# ① 建一对 veth（在宿主上执行；此刻两端都还在宿主的 netns 里）
$ ip link add veth-a type veth peer name veth-b

# ② 把两端分别塞进两间屋子
$ ip link set veth-a netns demo-a
$ ip link set veth-b netns demo-b

# ③ 各配一个同网段的 IP（网段知识见本系列第 2 篇）
$ ip netns exec demo-a ip addr add 10.99.1.1/24 dev veth-a
$ ip netns exec demo-b ip addr add 10.99.1.2/24 dev veth-b

# ④ 拉起接口（顺带把 lo 也拉起，屋里 127.0.0.1 才能用）
$ ip netns exec demo-a ip link set veth-a up
$ ip netns exec demo-a ip link set lo up
$ ip netns exec demo-b ip link set veth-b up
$ ip netns exec demo-b ip link set lo up
```

验收。看 demo-a 的家当和路由：

```bash
$ ip netns exec demo-a ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128
veth-a@if201     UP             10.99.1.1/24 fe80::3ca9:b5ff:fe04:64fb/64

$ ip netns exec demo-a ip route
10.99.1.0/24 dev veth-a proto kernel scope link src 10.99.1.1
```

**怎么读**：

| 输出 | 含义 |
|------|------|
| `veth-a@if201` | 接口名带 `@if201` 后缀 = **它是一对里的一端，另一端是宿主接口编号 201 的那块**（此刻正是 demo-b 里的 veth-b）。容器里看到的 `eth0@if88` 就是同款 |
| 自动出现的路由 | 给接口配 IP 时内核自动登记：「`10.99.1.0/24` 这片从 veth-a 直连可达」——不需要手写 |

跨屋 ping：

```bash
$ ip netns exec demo-a ping -c 2 10.99.1.2
PING 10.99.1.2 (10.99.1.2) 56(84) bytes of data:
64 bytes from 10.99.1.2: icmp_seq=1 ttl=64 time=0.030 ms
64 bytes from 10.99.1.2: icmp_seq=2 ttl=64 time=0.024 ms

--- 10.99.1.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss
```

**通了**。此刻你手工完成了 Docker 每次 `docker run` 背后做的事：建房（netns）、拉线（veth）、配号（IP）、走路（路由）。再加一个「网桥」把多根 veth 汇聚起来，就是 docker0 的原型——那步留给 Docker 系列看现成的。

---

## 三、每间屋子有自己的防火墙：iptables 的表、链、规则

**是什么**：iptables 是 Linux 的包处理框架，三级结构：

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

**一条真实规则的逐字段解剖**——就用 Docker 嵌入式 DNS 那条（[第 4 篇](/Linux/basics/linux-04-nat)和 Docker 系列都抓到过）：

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
$ iptables -t nat -S POSTROUTING | wc -l        # 宿主：nat 表 POSTROUTING 链
7

$ ip netns exec demo-a iptables -t nat -S       # demo-a 屋里：同一张表，只有默认策略
-P PREROUTING ACCEPT
-P INPUT ACCEPT
-P OUTPUT ACCEPT
-P POSTROUTING ACCEPT
```

**怎么读**：`-P … ACCEPT` 是链的默认策略（没规则命中时放行）；demo-a 的表里**一条 `-A` 规则都没有**——宿主的 7 条 Docker 规则对它**完全不存在**。反过来：往屋里写的规则，宿主上也看不见。

---

## 四、手搓 Docker 的把戏：端口半路改写

目标：在自己建的 netns 里复刻开头那段话——**让「监听 9090、连接 8080」依然通**。

**① 在 demo-a 里挂一条 OUTPUT 链的 DNAT 规则**（OUTPUT = 本机进程发出的包必经的关口）：

```bash
$ ip netns exec demo-a iptables -t nat -A OUTPUT -p tcp --dport 8080 \
    -j DNAT --to-destination 127.0.0.1:9090

$ ip netns exec demo-a iptables -t nat -S OUTPUT
-P OUTPUT ACCEPT
-A OUTPUT -p tcp -m tcp --dport 8080 -j DNAT --to-destination 127.0.0.1:9090
```

**② 在屋里起一个监听 9090 的进程**（`nc -l 9090`，收到的内容存文件）：

```bash
$ timeout 8 ip netns exec demo-a nc -l 9090 > /tmp/recv.txt &
```

**③ 再在屋里用客户端连 8080、发一句话**：

```bash
$ echo hello-via-8080 | timeout 3 ip netns exec demo-a nc 127.0.0.1 8080
```

**④ 验收——9090 那头收到了**：

```bash
$ cat /tmp/recv.txt
hello-via-8080
```

**怎么读**：客户端明确连的是 **8080**，但数据从 **9090** 的监听进程里取了出来——中间正是那条规则在 OUTPUT 关口把目的地改写了。包自己从头到尾不知道 8080 的存在。

对照 Docker 的做法，一模一样、只换了三个数：

| | 本文手搓 | Docker 嵌入式 DNS |
|---|----------|-------------------|
| 表面端口 | `8080` | `127.0.0.11:53`（resolv.conf 里写的） |
| 真实监听口 | `9090` | 随机口（如 `39611`） |
| 规则位置 | 自建 netns 的 OUTPUT 链 | 容器 netns 的 DOCKER_OUTPUT 链（挂在 OUTPUT 下） |
| 监听者 | `nc` | dockerd 的嵌入式翻译员 |

---

## 五、回到 Docker：那段话逐词翻译

现在重读开头引文，每个词都有了落点：

> 「它在**容器自己 netns** 的回环上开随机端口」

→ 容器被放进独立 netns（第一节建的那种屋子）；翻译员进程通过回环地址在这个屋里监听一个随机口（第四节 `nc -l 9090` 的角色）。

> 「再往 **netns 里写一条 nat 规则**，把「访问 127.0.0.11:53」半路改写到随机真口」

→ 第四节那条 OUTPUT DNAT 的 Docker 版；因为规则写在**容器的** netns 里，宿主机上看不见它（第三节的独立性实测），要看必须进屋。

**进屋的两种方式**：

| 命令 | 特点 |
|------|------|
| `ip netns exec 名字 命令` | 按名字进（本文全程用法）；Docker 容器**默认没有**注册名字，直接用不了 |
| `nsenter -t <容器主进程PID> -n 命令` | 按 PID 进（`-n` = 只进网络这一份）；Docker 容器走这条路，PID 用 `docker inspect -f '{{.State.Pid}}'` 取 |

Docker 系列里 4.4 的 `nsenter … -n iptables …` 看规则、第 7 篇 `nsenter` 进容器，用的都是第二种。

**收尾清理**（本文实验对象，删掉即净）：

```bash
$ ip netns del demo-a
$ ip netns del demo-b
$ ip netns list          # 空
```

（veth 两端随屋子一起消失，无需单独删。）

---

## 小结

- **netns** = 一份独立网络栈（网卡/路由/防火墙/localhost 全套独立）；`ip netns add/list/exec/del` 手搓可用，新建的是「毛坯房」：只有 DOWN 的 lo、空路由表
- **veth pair** = 虚拟网线，两端分放两个 netns 即互通；配 IP 后路由自动学会；容器 `eth0@ifNN` 的 `@ifN` 就是配对另一端的编号
- **iptables** 三级结构：表（nat 改地址 / filter 管放行）→ 链（按包的路径时机：PREROUTING/INPUT/FORWARD/OUTPUT/POSTROUTING）→ 规则（匹配条件 + 动作）；**规则属于 netns**，屋内外互相不可见
- **DNAT 半路改写**实测：监听 9090、连 8080、数据照样到——Docker 嵌入式 DNS 的 `127.0.0.11:53 → 随机口` 就是这个把戏
- 进 netns：`ip netns exec`（按名，自建的用）或 `nsenter -t PID -n`（按进程，Docker 容器用）

---

## 思考题

> 1. 本文的 demo-a 里 `ping 172.22.212.111`（宿主的 eth0）会怎样？为什么？（提示：看它路由表里有什么、缺什么。）
> 2. 第四节如果把规则从 `OUTPUT` 链挪到 `PREROUTING` 链，`nc 127.0.0.1 8080` 还能通吗？（提示：本机进程发出的包，路过哪些关口？）

---

## 参考资料

- [ip-netns(8) 手册](https://man7.org/linux/man-pages/man8/ip-netns.8.html) — netns 的创建、命名与 `/var/run/netns`
- [iptables(8) 手册](https://man7.org/linux/man-pages/man8/iptables.8.html) — 表/链/目标定义
- [Docker Docs · Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/) — Docker 写入的规则全景
- 本机实测环境：WSL2 Ubuntu-22.04（root）、iptables v1.8.7 legacy 后端
