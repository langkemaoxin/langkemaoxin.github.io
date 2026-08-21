---
title: Docker 网络——从 localhost 不通滚到能用名字互访（师生对话完整实录）
sidebarGroup: Docker 系列
shortTitle: 11 Docker 网络
order: 11
date: 2026-08-22
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - 对话实录
description: 容器网络师生对话逐字实录：从「两套隔离的网络栈凭什么能互通」这个矛盾出发，一小步一小步拆完 docker0 网桥、netns、veth、iptables 端口映射、内置 DNS 与 host/none/container 模式。
---

> **Docker 系列 · 第 11/24 篇**
> 上一篇：[《Harbor 使用——用案例拉取与推送镜像》](/云原生/docker/docker-10-harbor-usage/) · 下一篇：[《数据持久化——从容器一删库没了，滚到三种挂载》](/云原生/docker/docker-12-data-persistence/)

---

## 关于本文件的格式

> 学生要求："我的要的是控制台回放的逐字稿：学生原话、老师原文（含控制台里那版完整的开场白）、操作记录（实验、建文件），全部按时间顺序，不加整理。"

因此本文件是**逐字实录**：🧑‍🎓 = 学生在控制台输入的原文；🧑‍🏫 = 老师在控制台输出的原文（markdown 原样保留）；🔧 = 老师在控制台执行的操作（跑实验、建文件），实验的原始输出一并附上。按时间顺序编排，不删减、不重排、不润色。

实验环境：Windows 宿主机 + WSL2 Ubuntu，Docker Engine 29.1.3（2026-08）。

---

## 对话 1（课程开始）

**🧑‍🎓 学生：**

> [互动式教学-教室场景模拟]
> 假设你是一名资深的技术专家，我是学生，你从0开始给我讲解一大块知识点，但是你自己会使用西蒙学习法，把一个整块大的知识拆分成很细致。
> 而你每次只会给我讲解一个概念，如果我有问题，我就会提出来问你，如果没有问题则继续讲解。
>
> ## 要求：
> 1、我们之间的所有对话记录都要保留下来，做成那种课堂问答的形式。每次我们对话完，都要及时的写入文件中。
> 2、我的要的是控制台回放的逐字稿：学生原话、老师原文（含控制台里那版完整的开场白）、操作记录（实验、建文件），全部按时间顺序，不加整理。
>
> 我们需要学习的内容是 [docker的Network]
> 把记录保存在，覆盖这篇文中 [E:\MyGithub\langkemaoxin.github.io\src\云原生\docker\docker-11-network.md]
>
> 开始教学

🔧 **老师操作**：

1. 读取目标文件 `docker-11-network.md`，确认为空文件，可安全覆盖。
2. 检查 WSL Docker 环境：`docker version` → server=29.1.3；`docker ps -a` 发现历史实验容器 `s-net-db`、`s-net-web`、`lab-net-web`、`jzfz-redis` 在运行，不动它们。
3. 查看系列目录（确认第 10/12 篇文件名，用于导航链接）；读上一篇对话实录（`agent-docker-sandbox-dialogue.md`）确认逐字稿格式；读第 12 篇 frontmatter 确认本系列元数据写法。
4. 实验：启动两个 busybox 容器并查看各自 eth0：
   ```text
   $ docker run -d --name box1 busybox sleep 3600
   $ docker run -d --name box2 busybox sleep 3600
   $ docker exec box1 ip addr show eth0
   2: eth0@if34: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue
       link/ether 6a:c9:ad:e0:53:50 brd ff:ff:ff:ff:ff:ff
       inet 172.17.0.7/16 brd 172.17.255.255 scope global eth0
          valid_lft forever preferred_lft forever
   $ docker exec box2 ip addr show eth0
   2: eth0@if35: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue
       link/ether e6:32:09:8b:41:5d brd ff:ff:ff:ff:ff:ff
       inet 172.17.0.8/16 brd 172.17.255.255 scope global eth0
          valid_lft forever preferred_lft forever
   ```
5. 实验：box1 分别按 IP、按名字 ping box2（第一次运行时 stderr 与 stdout 串行显示，重跑一遍取干净输出）：
   ```text
   $ docker exec box1 ping -c 2 -W 2 172.17.0.8
   PING 172.17.0.8 (172.17.0.8): 56 data bytes
   64 bytes from 172.17.0.8: seq=0 ttl=64 time=0.068 ms
   64 bytes from 172.17.0.8: seq=1 ttl=64 time=0.082 ms

   --- 172.17.0.8 ping statistics ---
   2 packets transmitted, 2 packets received, 0% packet loss
   round-trip min/avg/max = 0.068/0.075/0.082 ms

   $ docker exec box1 ping -c 1 -W 2 box2
   ping: bad address 'box2'
   exit=0
   ```
6. 创建本文件（即你现在读到的这份），写入开场白与第 1 课。实验容器 box1、box2 保持运行，后续课程继续用。

**🧑‍🏫 老师：**

同学你好。今天开始讲一个大块：**Docker 的容器网络**。

先说为什么它值得单独开一门课。Docker 的常用命令你基本都会了，但网络是绝大多数人「会用但不懂」的重灾区：

- `-p 8080:80` 一加，宿主机就能访问容器了——它背后干了什么？
- 为什么默认网络上，容器之间 **ping IP 通、ping 名字不通**？
- 为什么容器里的 `localhost` 和宿主机的 `localhost` 根本不是一回事？

这些现象底下，藏着一整套 Linux 网络机制：网桥、veth、iptables、DNS。不懂机制，网络一出问题就只能「删容器重开碰运气」；懂了机制，你能顺着包的路径把问题定位出来。

讲法上我用**西蒙学习法**：把「容器网络」这整块知识切成一连串非常细的小知识点，**每次只讲一个**，讲完就停。你有问题就问，没问题我们再往下走。全程在本机 WSL 的 Docker 环境里做真实验——你看到的每个命令、每行输出，都是真实跑出来的，不是编的。

环境交代（版本相关结论以它为准）：Windows 宿主机 + WSL2 Ubuntu，Docker Engine **29.1.3**，2026-08。

整门课的地图（现在不用记，走到哪看到哪）：

| # | 课 | 拆解的疑问 |
|---|---|------|
| 1 | 容器网络要解决什么问题 | 为什么「隔离」和「互通」是一对矛盾 |
| 2 | 装完 Docker 后宿主机多了什么 | docker0 网桥到底是什么 |
| 3 | 网络命名空间（netns） | 容器「自己的网卡」从哪来 |
| 4 | veth pair | 容器和外界之间那根「虚拟网线」 |
| 5 | bridge 网络全景 | 一个包从容器到宿主机的完整路径 |
| 6 | 端口映射 `-p` 的真相 | iptables DNAT；为什么不 -p 就不通 |
| 7 | 默认 bridge 的容器间通信 | IP 直连为什么通、有什么短板 |
| 8 | 自定义网络 | 为什么自定义网络上能用「名字」互访（内置 DNS） |
| 9 | none 网络 | 彻底断网长什么样，用来干什么 |
| 10 | host 网络 | 直接共用宿主机网络栈，快在哪、险在哪 |
| 11 | container 模式 | 两个容器共用同一套网络栈 |
| 12 | docker network 命令详解 | create / inspect / connect 日常操作 |
| 13 | 选学：macvlan / overlay | 容器直接出现在局域网 / 跨主机组网 |

好，地图给完，开始第 1 课。

---

## 第 1 课：容器网络到底要解决什么问题

这一课只有一个概念，一句话：

> **网络栈被隔离了，但通信需求一个都没少。**

你已经知道容器本质是「带隔离的进程」，隔离靠 Linux namespace。隔离的不只是进程号和文件系统——**网络也在隔离清单上**，用的叫 network namespace（[第 18 篇](/云原生/docker/docker-18-namespace/)会专门拆它，这里先记住名字）。这意味着每个容器有自己独立的一套东西：

- 网卡：自己的 `lo`、自己的 `eth0`
- IP 地址
- 路由表
- iptables 规则
- 端口空间——容器里的 80、宿主机的 80、另一个容器里的 80，三者互不冲突

隔离到这个程度，问题立刻来了：一个真实部署至少有三个通信需求，一个都躲不掉：

1. **容器 ↔ 容器**：Tomcat 容器要连 MySQL 容器，两套隔离的网络栈之间怎么通？
2. **容器 ↔ 宿主机**：服务在容器里，宿主机上的你怎么访问它？
3. **容器 ↔ 外部世界**：容器里 `apt-get install` 要出网，包怎么出去、响应怎么找回来？

**「容器网络」这整块知识，就是 Docker 对这三个问题交出的答案。**后面 12 课都是在把这个答案一层层拆开。

光说不练假把式。我起了两个 busybox 容器 `box1`、`box2`，先看它们各自眼里的网卡长什么样：

```text
===== box1 eth0 =====
2: eth0@if34: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue
    link/ether 6a:c9:ad:e0:53:50 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.7/16 brd 172.17.255.255 scope global eth0
===== box2 eth0 =====
2: eth0@if35: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue
    link/ether e6:32:09:8b:41:5d brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.8/16 brd 172.17.255.255 scope global eth0
```

两个观察：

- box1、box2 各有一块自己的 `eth0`、自己的 MAC、自己的 IP（172.17.0.7 / 172.17.0.8）——**隔离是真的**，这就是 network namespace 在起作用。还有个细节：两块网卡在各自容器里都排「2 号」（`2: eth0@...`），各自数各自的，互不干扰，这也是隔离的证据。
- 输出里 `eth0@if34` 这个 `@if34` 小尾巴是什么，**先不管**，第 4 课它会变成主角。

然后看「互通」这个方向。box1 去 ping box2 的 IP：

```text
PING 172.17.0.8 (172.17.0.8): 56 data bytes
64 bytes from 172.17.0.8: seq=0 ttl=64 time=0.068 ms
64 bytes from 172.17.0.8: seq=1 ttl=64 time=0.082 ms
--- 172.17.0.8 ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
round-trip min/avg/max = 0.068/0.075/0.082 ms
```

通了，0.075ms。再换成用**名字** ping 一次：

```text
ping: bad address 'box2'
```

直接报 `bad address`——名字解析不了。

于是第 1 课结束，你手上攥着两个「知其然不知其所以然」：

1. 明明是两套互相隔离的网络栈，包居然能从一套钻到另一套——**从哪钻过去的？**（第 2、4、5 课拆）
2. 同样的两台「机器」，IP 通、名字不通——**差在哪儿？**（第 8 课拆）

这两个问号，就是后面所有课的发动机。最后把这一课收成一句话：**隔离是真的，通信也是刚需；容器网络这门课讲的，就是怎么在隔离的世界之间架桥。**

有问题现在就问。没问题的话，下一课我们去看：**装完 Docker 之后，你的宿主机上到底多出来一个什么东西**——它就是那座桥的第一块砖。

---

（课程进行中，后续对话按时间顺序追加。）
