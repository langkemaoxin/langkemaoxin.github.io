---
title: Docker 网络——从 localhost 不通滚到能用名字互访
sidebarGroup: Docker 系列
shortTitle: 11 Docker 网络
order: 11
date: 2026-08-22T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 师生对话实录课：0 基础学生与教学大师的 Docker Network 控制台逐字稿，从「为什么 localhost 不通」一路滚到「能用名字互访」，实验全部 WSL 实机真跑。
---

> **Docker 系列 · 第 11/24 篇**
> 上一篇：[《Harbor 私有仓库使用》](/云原生/docker/docker-10-harbor-usage) · 下一篇：[《Docker 数据持久化——从容器一删库没了，滚到三种挂载》](/云原生/docker/docker-12-data-persistence)

---

# 课堂实录（控制台逐字稿）

> **体例说明**：本文是师生对话的**控制台回放逐字稿**，按时间顺序记录——学生原话、老师原文（与控制台输出一字不差）、操作记录（实验、建文件），不加整理。环境：Windows 10 + WSL 里跑 Docker，所有实验真机执行，输出不造假。

---

## 【2026-08-22 · 第 1 次对话】

### 学生原话

> [互动式教学-教室场景模拟]
>
> 你是一名全球最为顶尖的教学大师，精通各类技术。你的目标就是培养我某一个专业领域的大师。而我是一名0基础的学生。
>
> 在开始教授前，你会通过获取最新的官方文档，通过西蒙学习法一点点拆碎，形成自己的教学大纲，确保这个教学大纲我学习完后，可以成为一个资深的技术专家。
> 然后你使用费曼技巧，给我讲解最为基本的知识块，而你每次只会给我讲解一个概念，如果我有问题，我就会提出来问你，如果没有问题则继续讲解。
>
> ## 要求：
> 1、我们之间的所有对话记录都要保留下来，做成那种课堂问答的形式。每次我们对话完，都要及时的写入文件中。
> 2、我的要的是控制台回放的逐字稿：学生原话、老师原文（含控制台里那版完整的开场白）、操作记录（实验、建文件），全部按时间顺序，不加整理。
>
> 我们需要学习的内容是 [docker的Network]
> 把记录保存在，覆盖这篇文中 [E:\MyGithub\langkemaoxin.github.io\src\云原生\docker\docker-11-network.md]
>
> 开始教学

### 操作记录（课前备课，按时间顺序）

1. 读 `E:\MyGithub\langkemaoxin.github.io\src\云原生\docker\docker-11-network.md` → 空文件（仅两行空行），确认可覆盖，无旧内容丢失。
2. WebFetch 抓 `https://docs.docker.com/engine/network/` → 被网络策略拦截（"Unable to verify if domain docs.docker.com is safe to fetch"）。
3. 改用 webReader 成功抓取官方 Networking overview 全文（页面元数据 `og:updated_time: 2026-07-21`，即 2026 年 7 月 21 日更新的现行版）。
4. `ls src/云原生/docker/` 摸清系列结构（24 篇闭环 + 2 附录）；读 `docker-12-data-persistence.md` 头部确认 frontmatter 与前后篇导航格式，本篇标题沿用《Docker 网络——从 localhost 不通滚到能用名字互访》以保持导航一致。
5. 读目录下历史残留 `_lab_net_out.txt` → 内容是一次失败的 WSL 实验脚本报错（`set: pipefail: invalid option name`，PowerShell→wsl 的 `\r` 换行符坑），与本次课程无关，留档未删。
6. 建本文件，写入第 1 次对话实录。

### 老师原文（控制台开场白 + 教学大纲 + 第 1 课）

（以下与控制台输出一字不差）

---

同学，你好。我是这门课的老师。

在开讲之前，我先交代一下我是怎么备这门课的，你可以把它当成这门课的"入学须知"：

我备课的方式是这样的——先去把 Docker 官方文档里 Networking 的全部内容拉下来通读（我拿到的是 2026 年 7 月 21 日更新的现行版，不是道听途说的旧版），然后用西蒙学习法把它拆碎：官方文档是按"参考手册"组织 的，适合查，不适合学；我会把它的知识重新排成一条"从已知到未知"的线，每一课只新增一个知识点，后面的课只建立在前面讲过的东西上。等这条线走完，你手里就有了官方文档的全部内容，而且是按"人脑能吸收"的顺序排好的。

讲的方式是费曼技巧：我每节课只讲**一个**概念，用大白话讲，讲完就停。你有问题就问，没问题我们就进下一课。课里的每个实验我都会在这台机器上真跑，你看到的每一行输出都是真的——这台机器上跑不了的，我会明说是演示，绝不编造输出。

下面是教学大纲，一共 20 课，四个阶段，难度是一条上坡路：

## 教学大纲（依据 docs.docker.com/engine/network，2026-07-21 版拆解）

**阶段一：默认网络——先看清"容器为什么是台小电脑"**

1. 为什么容器需要网络——三个问题一根线（今天这课）
2. 容器眼里的网络——网卡、IP、网关、路由表、DNS 五件套
3. docker0 与默认 bridge——宿主机上到底多了什么东西（实验）
4. 默认 bridge 实战——两个容器用 IP 互 ping（实验）
5. 容器怎么上网——masquerading（NAT 伪装）
6. 端口发布 `-p`——外面的世界怎么进来（实验）

**阶段二：自定义网络——生产环境真正的用法**

7. 默认 bridge 的痛——只能用 IP，不能用名字（实验）
8. 自定义网络与内嵌 DNS（127.0.0.11）——用名字互访（实验）
9. 网络即隔离墙——两个网络之间为什么不通
10. 一个容器连多个网络——`docker network connect`

**阶段三：其他网络驱动——换掉"虚拟交换机"这个方案本身**

11. `none`——彻底断网给谁用
12. `host`——不要小电脑的网络了，直接用宿主机的
13. `container:` 模式——两个容器共用一副网络
14. `macvlan` / `ipvlan`——容器伪装成一台物理设备
15. `overlay`——跨主机的容器大网（概念课）

**阶段四：运维进阶——管网络的人**

16. 网络命令全家桶——`ls` / `inspect` / `create` / `rm` / `prune`
17. 子网规划与 `default-address-pools`
18. DNS 进阶——`--dns` / `--hostname` / `--alias` / `gw-priority`
19. IPv6 网络开关
20. 毕业设计——综合实战串讲

---

好，现在开始第一课。深呼吸，我们从零开始。

# 第 1 课：为什么容器需要网络？

## 从一个你会立刻撞上的问题讲起

假设你已经在自己电脑上跑起来了两个容器（跑的命令现在不用管，后面课里会教）：

- 一个 **Nginx** 容器——网页服务器
- 一个 **Redis** 容器——数据库

它们就跑在同一台电脑上，肩并肩。现在 Nginx 想把数据存进 Redis，问题来了：**它俩怎么"说话"？**

你的第一反应多半是：同一台电脑嘛，用 `localhost`（也就是 `127.0.0.1`）连过去呗。这个直觉非常自然，但在容器世界**恰好是错的**。

## 心智模型：每个容器是一台配了网卡的独立小电脑

为什么错？回想一下你已经学过的容器知识（隔离）：每个容器都是一个被隔离出来的环境——有自己的文件系统、自己的进程空间。今天我要在这个模型上**加一块砖**：容器还有**自己的网卡、自己的 IP 地址**。

所以更准确的心智模型是：

> 你的电脑不是一台电脑，而是"一台真电脑 + N 台迷你小电脑"。每台小电脑都有自己的一块网卡，插在 Docker 给你装的"虚拟交换机"上。

带着这个模型再看 `localhost`：`localhost` 的意思是"**我自己这台电脑**"。Nginx 容器里的 localhost，指的是 **Nginx 这台小电脑自己**——不是宿主机，更不是隔壁的 Redis。所以在 Nginx 容器里连 `localhost:6379`，等于在小电脑里自己跟自己握 手，Redis 根本听不见。

这就是容器网络要解决的第一个问题：**隔离出来的小电脑们，怎么互相联网？**

## 三个问题一根线

光解决"互相联网"还不够。把容器网络想全，一共三个问题，也是我们这门课的骨架：

1. **容器 ↔ 容器**：Nginx 怎么访问 Redis？（用 IP？用名字？）
2. **外界 → 容器**：你的浏览器在真电脑上，Nginx 在小电脑里，浏览器怎么打开 Nginx 的网页？——剧透：默认也**进不去**，需要"端口发布"（第 6 课）。
3. **容器 → 外界**：容器里想 `apt-get install` 装个软件、想调外网 API，能出去吗？——这个默认**可以**，Docker 偷偷帮你做了"伪装上网"（第 5 课）。

一门 20 课的课，其实就是把这三个问题一层层剥开。

## 官方文档的第一句话

Docker 官方文档对容器网络的定义就一句话（我直译）：

> Container networking refers to the ability for containers to connect to and communicate with each other, and with non-Docker network services.
>
> 容器网络，指的是容器之间、以及容器与非 Docker 的网络服务之间，建立连接并通信的能力。

注意后半句"与非 Docker 服务通信"——不只是容器互连，容器还要能跟你局域网里的 MySQL、能跟互联网上的 API 说话。三个问题对应上了。

还有一个反直觉但极其重要的事实，官方原话是：

> A container has no information about what kind of network it's attached to, or whether its network peers are also Docker containers.
>
> 容器根本不知道自己连的是什么网络，也不知道对面那台是不是容器。

那容器能看到什么？官方的清单是：**一块网络接口（网卡）+ 一个 IP 地址 + 一个网关 + 一张路由表 + DNS 服务**。就这些。

翻译成人话：容器开机后看到的东西，和你给一台真电脑插上网线后看到的东西**一模一样**。为什么这么设计？因为容器的整个承诺就是"应用不用改，搬进容器照样跑"。如果容器里的程序还要写特殊代码才能上网，这个承诺就破了。所以 Docker 把网络也伪装成"一台普通电脑该有的样子"——这是整个容器网络设计的**第一性原理**，后面 19 课的所有设计都从这句话推出来。

## 本课小结

- 心智模型：一台真电脑 + N 台带独立网卡的迷你小电脑
- `localhost` 在容器里 = 小电脑自己，不是宿主机
- 三个问题一根线：容器↔容器、外界→容器、容器→外界
- 第一性原理：容器眼里，网络就长成"一台普通电脑"的样子

## 课后思考题（不查资料，凭直觉答我）

你在宿主机的浏览器里访问 `http://localhost:80`，Nginx 容器里确实监听着 80 端口。**默认情况下，网页能打开吗？为什么？**

把你的答案和理由告诉我——答对答错都没关系，我要看的是你的直觉走到哪了。然后我们进第 2 课。

---

## 【2026-08-22 · 第 2 次对话】

### 学生原话

> 默认是打不开的，因为如果不做任何设置，我打开的http://localhost:80只是打开我本机的地址，和Docker容器没有关系

### 操作记录（第 2 课课前实验，全部真机执行，环境：Windows 10 + WSL 内 Docker Engine 29.1.3）

1. `wsl -e bash -lc 'docker version --format "Server: {{.Server.Version}}"'` → `Server: 29.1.3`（daemon 在线）
2. `docker run --rm alpine ip addr` → 输出 `lo: 127.0.0.1/8` 与 `eth0@if40: 172.17.0.9/16, link/ether f2:a5:bb:9e:02:ca`
3. `docker run --rm alpine ip route` → 输出两条路由：`default via 172.17.0.1 dev eth0` 与 `172.17.0.0/16 dev eth0 scope link src 172.17.0.9`
4. `docker run --rm alpine cat /etc/resolv.conf` → `nameserver 223.5.5.5 / 114.114.114.114 / 8.8.8.8`，头部注释含 `Generated by Docker Engine.` 与 `Based on host file: '/etc/resolv.conf' (legacy)`
5. `docker run --rm alpine hostname` → `516d68c0d34d`（容器 ID 短哈希）
6. 本对话实录追加进本文件。

### 老师原文（判卷 + 第 2 课）

（以下与控制台输出一字不差）

---

**先判卷。**

结论：**对**，默认打不开。✓

理由：**对了一半**。你说"localhost 是我本机的地址"——这部分完全正确。但"和 Docker 容器没有关系"这句，把墙说得太厚了。

精确版是这样的：浏览器访问 `localhost:80`，找的是**宿主机自己的 80 端口**。而宿主机的 80 端口上，没有任何进程在监听——Nginx 监听的是**另一台"小电脑"的 80 端口**。注意这里的坑：**每台"电脑"有自己独立的一套端口空间**。宿主机的 80 号房间是空的，Nginx 坐在容器那台小电脑的 80 号房间里，两间房门牌号一样，但根本不是同一间房。

另外给你留个钩子：宿主机和容器之间其实**有一扇半开的门**，比你想象的近得多——第 3 课你会亲眼看到。现在先记住：默认打不开，因为敲门敲错了门。

80 分。比我带过的大多数初学者的第一答好——多数人答"能打开，因为就在本机"。

那我们进第 2 课。

---

# 第 2 课：容器眼里的网络——五件套

上一课官方文档说了，容器能看到的东西只有五样：**一块网卡、一个 IP、一个网关、一张路由表、DNS 服务**。

当时我说这是"容器网络的全部地基"。今天我们就把这五样挨个打开看——而且不是看我画图，是看**真容器里跑出来的真输出**。我刚在这台机器上跑了四条命令（命令本身你先不用背，先看懂输出）：

## 实验一：网卡——`ip addr`

```
$ docker run --rm alpine ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0@if40: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP
    link/ether f2:a5:bb:9e:02:ca brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.9/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

这台小电脑开机后一共有**两块网卡**：

- `lo`——"自言自线路"。挂在上面的地址就是 `127.0.0.1`。**上一课的 localhost 谜底就在这**：容器里的 localhost，就是这个 lo，绕一圈回到自己，永远出不了这台小电脑。
- `eth0`——真正的对外网口，插在 Docker 那台"虚拟交换机"上。它有三个看点：
  - **IP 地址 `172.17.0.9`**：门牌号。注意，我们**从没申请过 IP**，容器一开机它就自动有了——是 Docker 从一个"号码池"里动态租给它的。
  - **MAC 地址 `f2:a5:bb:9e:02:ca`**：网卡的出厂编号，顺带认识一下，本文不展开。
  - **名字后面的 `@if40`**：现在你只需要记住这个彩蛋存在——eth0 不是一根线，是一根**线的一半**，另一半在宿主机上，编号 40。第 3 课揭晓它。

还有一个细节值得停下来看一眼：为什么是 `172.17.0.9`，不是 `172.17.0.2`？——因为这台机器的 Docker 网络里已经有别的容器先占了坑。**IP 是先到先得动态分配的**，容器重启后号码还可能变。现在把这个事实放兜里，第 7 课它会变成一场事故。

## 实验二：路由表与网关——`ip route`

```
$ docker run --rm alpine ip route
default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 scope link  src 172.17.0.9
```

整张表就两行，但这两行就是这台小电脑**所有出门决策的全部规则**：

- 第二行先看（更具体的规则优先）：**目的地在 `172.17.0.0/16` 这个网段里的（也就是同小区的邻居），直接从 eth0 喊话**，不用经过任何人。`scope link` 的意思就是"近到一根线直接连着"。
- 第一行兜底规则 `default`：**其余的一切目的地，交给 `172.17.0.1`，从 eth0 出去**。

而 `172.17.0.1` 这个地址，就是**网关（gateway）**——小区大门。它是谁？它是 Docker 那台"虚拟交换机"在宿主机一侧的地址。所有出小区的流量（上互联网、去别的网段）都从它手里过。第 3 课我们会站在宿主机上亲眼看到这扇门。

路由表和网关的关系一句话总结：**路由表是规则清单，网关是清单里那条兜底规则指定的收件人。**

## 实验三：DNS——`cat /etc/resolv.conf`

```
$ docker run --rm alpine cat /etc/resolv.conf
# Generated by Docker Engine.
# This file can be edited; Docker Engine will not make further changes once it
# has been modified.

nameserver 223.5.5.5
nameserver 114.114.114.114
nameserver 8.8.8.8

# Based on host file: '/etc/resolv.conf' (legacy)
# Overrides: [nameservers]
```

网络世界只认 IP，但人只记得住名字。所以需要**查号台**：你报 `www.baidu.com`，它告诉你 IP。`nameserver` 开头的三行就是查号台的三个号码。

这里有个**藏得很深的官方文档证据**，最后那行注释：`Based on host file: '/etc/resolv.conf' (legacy)`——默认 bridge 网络上的容器，用的是**宿主机 DNS 配置的一个拷贝**。我这台机器（WSL）配了三个查号台：223.5.5.5（阿里）、114.114.114.114、8.8.8.8（谷歌），容器照单全收。

把"默认 bridge = 拷贝宿主机的 DNS"这句话放兜里，第 8 课你会发现自定义网络里这个文件会**彻底变样**（变成一个 Docker 自己的神秘地址），那是容器网络最好玩的一幕之一。

## 实验四（附赠）：hostname

```
$ docker run --rm alpine hostname
516d68c0d34d
```

这台小电脑的名字是一串乱码？——它就是**容器 ID**。官方文档原话：容器的 hostname 默认就是容器 ID。也就是说，小电脑出厂时顶着一个"身份证号"当名字，没有人类友好名。这也放兜里：第 8 课我们会看到名字在容器网络里扮演的核心角色。

## 五件套全家福

| 件 | 在哪看到的 | 是什么（一句话） |
| --- | --- | --- |
| 网卡 | `eth0@if40` | 对外网口，插在虚拟交换机上 |
| IP | `172.17.0.9` | 动态租来的门牌号，会变 |
| 网关 | `172.17.0.1` | 小区大门，所有出小区流量的收件人 |
| 路由表 | `ip route` 两行 | 出门决策规则：邻居直呼，其余交大门 |
| DNS | `resolv.conf` | 查号台，名字换 IP |

回头看第 1 课那句第一性原理——"容器眼里，网络就长成一台普通电脑的样子"——现在你有实证了：这五件套，跟一台插了网线的真电脑**一模一样**，一件不多，一件不少。

## 本课小结

- localhost 谜底：容器里的 `127.0.0.1` 挂在 `lo` 网卡上，永远出不了小电脑
- IP 是 Docker 动态租的（`.9` 而不是 `.2` 就是证据），**别把 IP 写死**——第 7 课见
- 路由表两行规则：同网段直连，其余交给网关 `172.17.0.1`
- 默认 bridge 的 DNS = 宿主机配置的拷贝
- 容器默认 hostname = 容器 ID

## 课后思考题（不查资料，用今天学的五件套推理）

在容器里执行 `curl http://www.baidu.com`，**五件套被用到几件、按什么顺序、各干了什么活**？把你能推出来说的都说给我听。

---

## 【2026-08-22 · 第 3 次对话】

### 学生原话

> 第一步应该是把百度的域名，通过DNS去换取IP地址，然后通过路由表一看，这个IP不是令居，然后再把这个请求去交给网关，网关把这个请求，顺着网卡，转发到了宿主机上。宿主机再通过自己的网卡把请求转发出去

### 操作记录（第 3 课课前实验，全部真机执行）

1. 宿主机 `ip addr show docker0` → `inet 172.17.0.1/16`，MAC `66:c5:ef:c2:a7:88`——第 2 课网关之谜的答案浮出水面。
2. `docker ps` → 机器上现存 7 个容器：`box1`、`box2`（busybox，上次课遗留，Up 42 分钟）、`s-net-db`（redis:alpine）、`s-net-web`、`lab-net-web`（nginx:alpine）、`jzfz-redis`（redis:7）、`jzfz-pg`（postgres:15）——第 2 课"为什么新容器拿到 .9"的答案。
3. `docker exec box1 ip addr show eth0` → `2: eth0@if38 ... inet 172.17.0.7/16`（容器内 ifindex=2）。
4. 宿主机 `ip link show type veth` → 7 根 `vethXXXXXX@if2`，全部 `master docker0`，其中第 38 号 `vetha5b2c4c@if2` 与 box1 的 `eth0@if38` 编号互指——7 容器恰好 7 根线。
5. 宿主机 `ping -c 2 -W 1 172.17.0.7` → 2 发 2 收，0% 丢包，rtt 0.095ms——"半开的门"验证通过。
6. `docker network ls` → `bridge` / `host` / `none` 三个默认网络 + 本机遗留的 4 个自定义网络（`docker_gwbridge`、`new-api_new-api-network`、`rabbitmq-cluster_default`、`rabbitmq_default`）。
7. 本对话实录追加进本文件。box1/box2 保留不删，留作第 4 课互 ping 实验用。

### 老师原文（判卷 + 第 3 课）

（以下与控制台输出一字不差）

---

**先判卷。**

你的推理链：**DNS 换 IP → 查路由表 → 不是邻居 → 交网关 → 网关转到宿主机 → 宿主机网卡转发出去**。

顺序全对，五件套用上了四件（lo 确实用不上）。88 分。今天我要在这条链上给你拧三个升级螺栓：

**螺栓一（嵌套）**：你说"第一步是 DNS 换 IP"——但查号台 `223.5.5.5` 自己就**不在小区里**！它也是外网地址。所以"问 DNS"这一步，自己就要先走一遍"查路由表 → 不是邻居 → 交网关"。也就是说你描述的流程发生了**两轮**：第一轮问路（DNS 查询出门），第二轮才是真正的 HTTP 请求。DNS 不是流程外的准备动作，它本身就是第一个出门的包。

**螺栓二（措辞）**：你说"网关把请求**转发到了**宿主机上"——今天实验会给你修正：网关不是把包转交给宿主机，**网关就是宿主机本人**。`172.17.0.1` 这扇"小区大门"，其实是一块**长在宿主机身上的网卡**。门不是通向宿主机的门，门就是宿主机。

**螺栓三（魔术预告）**：你说"宿主机通过自己的网卡把请求转发出去"——大方向对，但"转发"这个词里藏着整个容器出网最大的一个魔术：宿主机**不是原样转发的**，它在出门前偷偷改了包裹上的寄件人。改成了谁？为什么不改就收不到回信？第 5 课专门拆这个魔术。

好，三个螺栓都拧在第 3、5 课的位置上。现在进第 3 课。

---

# 第 3 课：docker0 与默认 bridge——宿主机上到底多了什么

## 视角切换

前两课我们一直**站在容器小电脑里**往外看：看到了五件套、看到了大门 172.17.0.1、看到了一根"有另一半的网线" eth0@if40。

今天我们爬出小电脑，**站到宿主机（真电脑）上**，回答一个问题：Docker 装好、跑起来之后，宿主机上**多了哪些东西**？

## 实验一：小区大门的真身

在宿主机上执行（我真机跑了）：

```
$ ip addr show docker0
4: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 66:c5:ef:c2:a7:88 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
```

看到了吗——宿主机上有一块网卡，名字叫 **docker0**，IP 是 **172.17.0.1**。

第 2 课容器里看到的"小区大门 172.17.0.1"，谜底揭晓：**它就是宿主机上的 docker0 这块网卡**。大门不是通往宿主机的门，大门就是宿主机伸进小区的一只手。

## 是什么：bridge（网桥）

那 docker0 这块网卡是什么东西？它的类型是 **bridge（网桥）**。

是什么：网桥是 Linux 内核自带的一个功能——**用软件模拟出来的交换机**。物理交换机你可能在机房见过：一排网口，插几根网线进去，插在上面的设备就互通。网桥就是同样功能的软件版：一块"虚拟网卡"，别的网卡可以"插"在它上面，插上的设备彼此互通。

为什么 Docker 要用它：容器一台一台地起、一删就没，你不可能真去插拔物理网线。软件交换机可以随时创建虚拟网口、随时拔掉，天生为容器的"用完即走"设计。

Docker 出厂自带的第一台软件交换机，就叫 **docker0**。而官方文档说的"**默认 bridge 网络**"，就是指"插在 docker0 这台交换机上的那个小区"——我们前两课里的所有容器，住的都 是这个小区。

顺带解一个旧案：为什么第 2 课新容器拿到的是 `172.17.0.9` 而不是 `.2`？我在宿主机上跑 `docker ps` 看了一眼——这台机器上正跑着 **7 个容器**（上次课遗留的 box1、box2，还有别的项目留下的 redis、nginx、postgres）。7 个业主先占了门牌，新房客只能从 `.9` 开始拿号。

## 实验二：网线的另一半（第 2 课彩蛋兑现）

第 2 课我说 eth0 名字里的 `@if40` 是彩蛋，"另一半在宿主机上"。今天兑现。我在容器 box1 里和宿主机上**各看了一眼网卡**：

```
# 容器 box1 里：
$ docker exec box1 ip addr show eth0
2: eth0@if38: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue
    link/ether a6:bf:2e:dd:55:d7 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.7/16 brd 172.17.255.255 scope global eth0

# 宿主机上（节选）：
$ ip link show type veth
15: veth5efa696@if2: ... master docker0 ...
16: vethb08adfc@if2: ... master docker0 ...
31: veth2476840@if2: ... master docker0 ...
38: vetha5b2c4c@if2: ... master docker0 ...
...（共 7 根）
```

两个关键读法：

1. **编号互指**：容器里 box1 的网卡叫 `eth0@if38`——它在说"我的另一半，是宿主机上的 38 号接口"。宿主机上恰好在第 38 号位置有一根 `vetha5b2c4c@if2`——它在说"我的另一半，是那边的 2 号接口"（box1 容器内 eth0 的编号正是 2）。一根线的两半，互相报出对方的编号。
2. **`master docker0`**：宿主机上这 7 根 veth，全部标注 `master docker0`——意思是"插在 docker0 这台交换机上"。7 个容器，恰好 7 根线，一根不多。

这个东西有个名字：**veth pair（虚拟以太网设备对）**——一对总是成对出现的虚拟网卡，**从一头进去的数据包，会原封不动地从另一头出来**。Docker 的用法是：生一对，一半塞进容器当 eth0，另一半插在 docker0 上。容器于是"插上了交换机的网线"。

## 全景图（前 3 课的总装）

```
              宿主机（真电脑）
  ┌─────────────────────────────────────────┐
  │        docker0 = 软件交换机 (172.17.0.1)  │── 物理网卡 eth0 ──→ 互联网
  │          │       │       │   ...        │
  │        veth38  veth15  veth16  （7 根）  │
  └──────────┼───────┼───────┼──────────────┘
             │       │       │      ← veth pair：一根虚拟网线的两半
         ┌───┴──┐ ┌──┴───┐ ┌─┴─────┐
         │ box1 │ │ box2 │ │ jzfz… │   容器 = 小电脑
         │ eth0 │ │ eth0 │ │ eth0  │   （每台有独立五件套）
         │ .0.7 │ │      │ │       │
         └──────┘ └──────┘ └───────┘
```

到今天为止你学到的所有零散事实——五件套、大门 172.17.0.1、@if40、默认 bridge——现在全部装进这一张图里了。

## 实验三：半开的门（第 1 课钩子兑现）

第 1 课我说"宿主机和容器之间有一扇半开的门"。现在站在宿主机上，直接 ping 容器 box1 的门牌：

```
$ ping -c 2 -W 1 172.17.0.7
PING 172.17.0.7 (172.17.0.7) 56(84) bytes of data.
64 bytes from 172.17.0.7: icmp_seq=1 ttl=64 time=0.095 ms
64 bytes from 172.17.0.7: icmp_seq=2 ttl=64 time=0.037 ms

--- 172.17.0.7 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss
```

通了。0.095 毫秒——比任何互联网延迟快几千倍，因为它压根没出过这台机器。

为什么宿主机能 ping 通"另一台电脑"？因为 **docker0 就长在宿主机身上**——宿主机自己也是小区的业主，跟容器是邻居，走的是第 2 课路由表里那条"邻居直呼"的规则。这就是"半开"的意思：**宿主机 ↔ 容器是通的，外界 ↔ 容器是不通的**。哪半边开着、哪半边关着，就是这个模块后面所有戏的来源。

## 实验四（认个脸）：docker network ls

```
$ docker network ls
NETWORK ID     NAME                       DRIVER    SCOPE
7a200f8e3db9   bridge                     bridge    local
ac4fc42e94be   docker_gwbridge            bridge    local
de3d35e41f61   host                       host      local
d4438b6fccbf   new-api_new-api-network    bridge    local
6494333c3c80   none                       null      local
c88cb4c6fe5f   rabbitmq-cluster_default   bridge    local
232b31f9d168   rabbitmq_default           bridge    local
```

这是"小区清单"。三个是 Docker 出厂自带的：`bridge`（就是 docker0 小区）、`host`、`none`——后两个是第 11、12 课的主角，先混个脸熟。另外四个是我这台机器上别的项目（rabbitmq 集群等）留下的自定义小区——**自定义小区长什么样，是第 8 课的大戏**。命令细节第 16 课统一讲，今天只认脸。

## 本课小结

- `docker0` = 宿主机上一块 bridge 类型的网卡 = 软件交换机 = 第 2 课那个网关 `172.17.0.1`
- "默认 bridge 网络" = 插在 docker0 上的小区；Docker 出厂自带
- **veth pair** = 成对虚拟网卡，一头在容器里当 eth0，一头插在 docker0 上；`@ifN` 是两半互相报出的对方编号
- 半开的门：宿主机 ↔ 容器**通**（docker0 是宿主机自己的网卡），外界 ↔ 容器**不通**
- `docker network ls`：默认三件套 bridge / host / none

## 课后思考题（不查资料，用前三课推）

同一个 box1，门牌 `172.17.0.7`：

- 你的宿主机 ping 它，**通**（今天实测）；
- 你办公室**同事的电脑** ping `172.17.0.7`，通不通？

答我两问：通/不通；**为什么宿主机能、同事不能**——用前三课学过的概念把推理链说出来。

---

## 【2026-08-22 · 第 4 次对话（插播问答）】

### 学生原话

> 你怎么知道 docker0的？为什一上来就直接 ip addr show docker0

### 操作记录（"还原现场"实验，全部真机执行）

1. 宿主机 `ip -br addr`（无参数撒网）→ 全部网卡：`lo`、`eth0`（172.22.212.111/20，WSL 真网卡）、`docker0`（172.17.0.1/16）、`docker_gwbridge`（172.23.0.1/16，DOWN）、`br-c88cb4c6fe5f`（172.20.0.1/16，DOWN）、`br-d4438b6fccbf`（172.18.0.1/16，DOWN）、`br-232b31f9d168`（172.19.0.1/16，DOWN）、veth ×5（UP）。
2. `docker network inspect bridge`（截取前 2000 字符）→ 账本 Options 里白纸黑字：`"com.docker.network.bridge.name": "docker0"`、`"com.docker.network.bridge.default_bridge": "true"`、**`"com.docker.network.bridge.enable_ip_masquerade": "true"`**（第 5 课 NAT 魔术的官方预告）、IPAM：`Subnet 172.17.0.0/16, Gateway 172.17.0.1`。
3. 名册核对 `docker network inspect bridge`（Containers 全量）→ 业主 5 名：jzfz-pg(.2)、jzfz-redis(.3)、lab-net-web(.4)、s-net-web(.5)、s-net-db(.6)——**box1/box2 不在册**，与第 3 课"box1 拿着 172.17.0.7 且 ping 通"矛盾。
4. 对质 `docker inspect box1` → `NetworkMode=bridge`，但 `Networks.bridge` 的 `EndpointID=""`、`IPAddress=""`——endpoint 是空壳：上次课的容器经历过环境重启，Docker 账本已注销该连接，内核里 veth38 还插在 docker0 上（所以能 ping）。
5. 本对话实录追加进本文件。

### 老师原文（插播问答：知识从哪来）

（以下与控制台输出一字不差）

---

这个问题的质量，比你前三道答题都高。答题是"验证你听懂了没有"，这个问题是"**老师的东西是哪来的**"——这是从学生往大师走的那个岔路口。我分层诚实回答。

## 第一层（老实话）：我是先知道答案，再去看的

docker0 不是我"发现"的，是我"背过"的。它是 Docker 的**官方固定默认行为**：装完 Docker 必有这块网卡、名字必然叫 docker0、默认必然是 172.17.0.1/16——写死在官方文档里，全世界的工程师都背过。所以我上课"一上来就直接 `ip addr show docker0`"，那是**确认**，不是**发现**。你看到我行云流水，不是因为我会算命，是因为我备过课。

承认这个很重要：**"知道答案的人"没什么了不起，了不起的是"不知道时知道怎么找"**。所以第二层才是这节课真正要教你的。

## 第二层：如果你不知道，你怎么自己找到它——三板斧

### 第一板斧：撒网（无参数命令，先看全貌）

`ip addr` 不带任何参数，就是把宿主机**所有网卡一网打尽**。我真机跑了（`ip -br addr` 是它的紧凑版）：

```
$ ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0             UP             172.22.212.111/20 fe80::215:5dff:fe83:83a2/64
docker0          UP             172.17.0.1/16 fe80::64c5:efff:fec2:a788/64
docker_gwbridge  DOWN           172.23.0.1/16
br-c88cb4c6fe5f  DOWN           172.20.0.1/16
br-d4438b6fccbf  DOWN           172.18.0.1/16
br-232b31f9d168  DOWN           172.19.0.1/16
veth5efa696@if2  UP             fe80::6036:9bff:fec5:6fc5/64
vethb08adfc@if2  UP             fe80::a843:2eff:fe99:4227/64
...（共 5 根 UP 的 veth）
```

一台"干净"的 Linux，网卡应该只有 `lo` 和 `eth0` 两个。多出来的每一块都是"嫌疑人"。看名单——`docker0` 这名字自己都招了：**docker 前缀**，"0"是编号。旁边的 `br-c88cb4c6fe5f` 三个 `br-` 开头的，是第 3 课 `docker network ls` 里那几个自定义小区的交换机（`br-` + 网络 ID 前缀拼的设备名，第 8 课细讲）。**撒网的收获：嫌疑人名单 + 名字里的线索。**

### 第二板斧：对暗号（两个观察对上了，就不是巧合）

撒网看到 docker0 的 IP 是 `172.17.0.1`——这个数字眼熟吗？**第 2 课容器里的网关就是它**。容器说"我的大门是 172.17.0.1"，宿主机上恰好有块网卡的 IP 是 172.17.0.1。两个独立观察撞在一起，就不是巧合，是同一件事的两面。

### 第三板斧：查账（回到权威源头求证）

猜测要拿证据坐实。Docker 自己的账本——`docker network inspect bridge`——我真机跑了，节选：

```
"Driver": "bridge",
"IPAM": { "Config": [ { "Subnet": "172.17.0.0/16", "Gateway": "172.17.0.1" } ] },
"Options": {
  "com.docker.network.bridge.default_bridge": "true",
  "com.docker.network.bridge.name": "docker0",
  "com.docker.network.bridge.enable_ip_masquerade": "true",
  ...
}
```

白纸黑字：`"com.docker.network.bridge.name": "docker0"`——Docker 亲口承认，bridge 小区绑定的内核设备就是 docker0。查账完毕，铁证。

顺手给你指个金矿：注意 Options 里那行 **`enable_ip_masquerade: true`**——"启用 IP 伪装"。这是第 5 课那个魔术的**官方预告片**，Docker 账本里自己写着的。到时候回来重读这一行，你会拍腿。

## 课堂意外（白送的第四板斧：账本和现实打架时，对质）

今天查账时撞出一个真意外，正好当教材。Docker 的业主名册里，bridge 小区在册的只有 5 个容器——**box1、box2 不在册**！但第 3 课我们明明 ping 通了 box1（172.17.0.7）。账本和现实打架了。

接着查 box1 自己的档案：`NetworkMode=bridge` 没错，但网络条目里 `EndpointID` 和 `IPAddress` **全是空的**——这是个空壳记录。定性：box1 是上次课遗留的容器，中间这台机器的环境重启过，Docker 重启后**账本上把这条连接注销了，但内核里那根 veth38 还插在 docker0 上、IP 还挂着**，所以照常能 ping。

给你一句能用十年的话：**内核才是现实，Docker 只是记账员。账本会脱节，现实不会撒谎。** 所以第四板斧是：当两条证据矛盾时，别急着信任何一方，继续往下查到它们汇合为止——今天"ping 得通"（内核现实）和"不在册"（Docker 账本）就是这样汇合的。

## 本课小结

你问"我怎么知道 docker0"，我给你的答案是一套**可复制的探索流程**：

1. **撒网**：无参数命令看全貌（`ip addr`），找陌生脸，读名字里的线索
2. **对暗号**：新观察和旧观察撞上了，就不是巧合
3. **查账**：回到权威源头（`docker network inspect`）拿铁证
4. **对质**：证据矛盾时，查到汇合为止；内核是现实，账本是记录

老师比你多的不是"知道 docker0"这个事实，是这四板斧。从下节课起，你也可以开始用它——下次你在任何陌生机器上看到一块叫 `br-` 什么的陌生网卡，你就已经知道怎么把它查个底掉了。

---

上一课的思考题还挂着：**同事的电脑 ping 172.17.0.7，通不通？为什么宿主机能、同事不能？** 答完它，我们进第 4 课。

---

## 【2026-08-22 · 第 5 次对话（插播问答二）】

### 学生原话

> ip link show type veth 这个究竟什么？

### 操作记录（全部真机执行）

1. 三连对照实验首跑：`ip -br link` / `ip -br link type veth` / `ip -br link type bridge` → 后两条报错 `Command "type" is unknown`（此版本 iproute2 不接受 `-br` 与 `type` 过滤组合）；全量清单正常：11 块（eth0、docker0、docker_gwbridge、br-×3、veth×5）。
2. 正确语法重跑：`ip link show type veth`（grep 编号行）→ **只剩 5 根** veth，全部 `master docker0`；`ip link show type bridge` → **5 台交换机**（docker0、docker_gwbridge、br-c88/br-d44/br-232）。
3. 新意外：第 3 课同样命令出 7 根 veth，现在 5 根——box1/box2 的 38/39 号 veth 消失。验证三连：宿主机 `ping 172.17.0.7` → 100% 丢包；`docker exec box1` → `Error: container ... is not running`；`docker ps -a --filter name=box` → **box1/box2 均 Exited (0)，24 分钟前退出**。
4. 结论：撤销第 4 次对话中"环境重启导致账本脱节"的定性。真相：busybox 容器跑的命令结束、正常退出；退出时容器网络空间销毁 → veth 成对拆除 → Docker 账本除名。ping 由通变不通、名册除名、endpoint 空壳，全部是**正常清理流程**，不是脱节。
5. 本对话实录追加进本文件。

### 老师原文（命令拆解 + 当堂纠错）

（以下与控制台输出一字不差）

---

你问的这条命令，是第 3 课实验二的"取材命令"。它值得单独拆一课，因为拆完它，`ip` 命令**全家**你都会读了——那是你以后在网络世界天天用的瑞士军刀。

## 一、逐词拆解：`ip link show type veth`

先给你一个语法公式，Linux 的 `ip` 命令全家族都长这样：

```
ip   <对象>   <动作>   [筛选条件]
     link     show     type veth
     ↓        ↓        ↓
   操作谁？  干什么？  只挑哪些？
```

- **`ip`**：工具本身。Linux 网络的一切物件——网卡、地址、路由——都用它查看和配置。
- **`link`**：对象。"link"指链路层设备，说白了就是**网卡这个物件本身**。它有两个亲兄弟，你前几课全见过：`ip addr`（看网卡上挂的 IP 地址）和 `ip route`（看路由表）。**link 管物件，addr 管门牌，route 管出门规则**——三兄弟各管一层。
- **`show`**：动作，"显示"。不写它也默认是 show（`ip link` = `ip link show`）。
- **`type veth`**：筛选条件，**只显示"型号"为 veth 的设备**。这是今天的核心，下面细讲。

## 二、核心概念：网卡是一"大类"，每块都有型号

很多人以为"网卡"就是一种东西。错——网卡是一**大类设备**，每块网卡都有一个**型号（type）**，就像"车"是大类，下面分轿车、卡车、公交。

你这台宿主机上，此刻就跑着好几种型号。我做了一组对照实验（全量 vs 按型号筛）：

**A. 全量——所有网卡一网打尽：**

```
$ ip -br link
eth0             UP             00:15:5d:83:83:a2 ...
docker0          UP             66:c5:ef:c2:a7:88 ...
docker_gwbridge  DOWN           2a:d8:8b:59:c0:e9 ...
br-c88cb4c6fe5f  DOWN           d6:29:9c:72:82:85 ...
br-d4438b6fccbf  DOWN           66:d2:84:73:7b:61 ...
br-232b31f9d168  DOWN           5e:64:53:2c:a7:32 ...
veth5efa696@if2  UP             62:36:9b:c5:6f:c5 ...
vethb08adfc@if2  UP             aa:43:2e:99:42:27 ...
...（veth 共 5 根）
```

**B. 只看 veth 型号——`ip link show type veth`：**

```
15: veth5efa696@if2: ... master docker0 state UP ...
16: vethb08adfc@if2: ... master docker0 state UP ...
31: veth2476840@if2: ... master docker0 state UP ...
32: veth917df32@if2: ... master docker0 state UP ...
33: veth1d30c12@if2: ... master docker0 state UP ...
```

**C. 只看 bridge 型号——`ip link show type bridge`：**

```
4: docker0:          ... state UP ...
5: docker_gwbridge:  ... state DOWN ...
7: br-c88cb4c6fe5f:  ... state DOWN ...
8: br-d4438b6fccbf:  ... state DOWN ...
9: br-232b31f9d168:  ... state DOWN ...
```

看出规律了吗：**A = B + C + eth0**（物理网卡）。`type` 过滤器就像文件管理器里"只显示 PDF"——网卡清单按型号分拣，每次只捞一种。

你机器上现有的三种型号，正好就是 Docker 网络世界的三种积木：

| 型号（type） | 是什么 | Docker 里的角色 |
| --- | --- | --- |
| `eth0`（物理/虚拟网卡） | 普通网卡，有门牌能上网 | 宿主机联外网的腿 |
| `bridge` | 软件交换机 | docker0、br-xxx 小区的交换机 |
| `veth` | 成对网线 | 容器插交换机的那根线 |

**第 3 课的全景图，翻译成今天的型号语言就是：用 veth（网线）把容器和 bridge（交换机）连起来，交换机再通过物理网卡（腿）出门。Docker 网络 = 三种积木的拼装。**

所以当时为什么用 `type veth`：宿主机上十来块网卡，veth 混在里面，按型号一筛，"网线的另一半们"全部现形，还每根都标着 `master docker0`（插在哪台交换机上）。撒网技术第二式：**按型号捞**。

## 三、课堂意外终章：veth 从 7 根变 5 根，以及老师的错误

你看到了：第 3 课这条命令输出 **7 根** veth，今天只剩 **5 根**。box1/box2 的 38、39 号网线，没了。我顺手做了验证：

```
$ ping -c 2 -W 1 172.17.0.7
2 packets transmitted, 0 received, 100% packet loss    ← 第 3 课还是 0% 丢包！

$ docker exec box1 ip -br link
Error response from daemon: container ... is not running

$ docker ps -a --filter name=box
box2   Exited (0)   24 minutes ago
box1   Exited (0)   24 minutes ago
```

真相：box1/box2 里跑的命令结束了，**两个容器 24 分钟前正常退出**。容器一退出：它的网络空间销毁 → veth 这根"成对网线"一端报废、整对拆除 → IP 还回号码池 → Docker 账本除名。所以 veth 少两根、ping 不通、名册除名、endpoint 空壳——**全是正常清理流程，环环自洽**。

现在说我的错误。上一堂课（第 4 次对话），我看到"名册除名 + endpoint 空壳"，结合"这台 WSL 以前杀过容器"的记忆，给你讲了一个"环境重启导致账本脱节"的故事。**那个定性是错的。** 真相平凡得多：容器就是退出了。我错在哪？**我当时没跑 `docker ps -a`**——一条十秒钟的命令就能看到"Exited (0) 24 minutes ago"，我却停在了一个"讲得通"的故事上。这恰好违反了我自己教你的第四板斧：查到证据链闭合为止。

所以今天给你的金句，比上一课那句更狠：

> **讲得通的解释 ≠ 对的解释。证据链没闭合之前，任何"合理的故事"都只是嫌疑犯。**

这个错误我留着不改（实录里原样放着），因为它比一百次正确更有教学价值——你以后也会犯同样的错：脑补一个顺滑的解释，然后停止查证。记住今天的 box1。

## 本课小结

- `ip` 语法公式：`ip <对象> <动作> [筛选条件]`；三兄弟 `link`（物件）/ `addr`（门牌）/ `route`（出门规则）
- 网卡分型号：`type` 过滤 = 文件管理器的"按类型筛选"
- Docker 网络三种积木：物理网卡（腿）、bridge（交换机）、veth（网线）
- 容器退出 → veth 成对拆除 → IP 回池 → 账本除名，全链自动
- 老师当堂纠错：证据链闭合前，别信"讲得通"的故事

---

**思考题更新**：box1 已退房，题目例子换成在册住户 **jzfz-pg（172.17.0.2）**——你的宿主机 ping 它通，**同事的电脑** ping 172.17.0.2 通不通？为什么宿主机能、同事不能？答完进第 4 课。

---

## 【2026-08-22 · 第 6 次对话】

### 学生原话

> 根据刚刚学到的 veth虚拟网线，容器和宿主机是有一条网线相连的，但是容器和容器之间没有网线相连，所以容器之间不能ping得通

### 操作记录（第 4 课实验，全部真机执行）

1. 起两个新容器：`docker run -d --name lab-a busybox sleep 1800`、`lab-b` 同款 → lab-a 得 `172.17.0.8`、lab-b 得 `172.17.0.9`（首次取 IP 的模板 `.NetworkSettings.IPAddress` 报错 map no entry，换 `{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}` 成功）。
2. 互 ping：`lab-a ping 172.17.0.9` → 2 发 2 收 0% 丢包（0.083ms avg）；`lab-b ping 172.17.0.8` → 同样 0% 丢包（0.085ms avg）。**双向全通。**
3. `docker exec lab-a cat /proc/net/arp` → ARP 表里有一条：`172.17.0.9 → f6:b1:0e:b7:a8:97`（lab-b 的 MAC）。
4. 数 veth：`ip link show type veth` 编号行 `grep -c` → **8 根**。预期 5+2=7，对不上 → 查 `docker ps`：8 个容器在跑——**box1 复活了**（Up 9 minutes）。查 restart 策略：`box1 RestartPolicy=no`，`StartedAt=2026-08-21T23:58:13Z`（北京 07:58，与 Up 9min 吻合）→ 是被某种方式手动 start 的，非策略自动拉起；谁拉的现有证据查不到，到此为止。8 容器 ↔ 8 根 veth，账平。
5. 本对话实录追加进本文件。

### 老师原文（判卷 + 第 4 课）

（以下与控制台输出一字不差）

---

**先判卷。**

你的推理链：veth 连着容器和宿主机 → 容器之间没有直连网线 → 所以容器之间 ping 不通。

推理的**形式**很漂亮——用刚学的概念做预测，这正是学网络该有的姿势。前半句对了一半，结论**错**。错在哪？一句话：**你把"交换机"当成了"宿主机"本身。**

修正模型：veth 这根网线，不是插在"宿主机"上的，是插在 **docker0（那台软件交换机）**上的。docker0 确实长在宿主机身上，但它的角色是**交换机**，不是网线的终点。而交换机存在的意义、它天生的本职工作就是一件事：**让插在它身上的所有设备互通**。

换个类比：宿主机是一栋办公楼，docker0 是楼里机房的那台交换机，veth 是每个工位到机房的网线。工位 A 和工位 B 之间确实没有直连网线——**你这半句说对了**——但它们的线都插在同一台交换机上。在同一个交换机上的设备，就是同一间屋里的邻居，喊一嗓子彼此都听得见。

不用信我嘴说。60 秒实验，让事实判卷。

## 第 4 课：默认 bridge 实战——两个容器用 IP 互 ping

### 实验设计

起两个新容器，用最土的办法验证你的预测：

```
$ docker run -d --name lab-a busybox sleep 1800
$ docker run -d --name lab-b busybox sleep 1800
$ docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" lab-a   → 172.17.0.8
$ docker inspect -f "..." lab-b                                                        → 172.17.0.9
```

你的预测：ping 不通。开牌：

```
$ docker exec lab-a ping -c 2 -W 2 172.17.0.9
64 bytes from 172.17.0.9: seq=0 ttl=64 time=0.097 ms
64 bytes from 172.17.0.9: seq=1 ttl=64 time=0.070 ms
--- 172.17.0.9 ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss

$ docker exec lab-b ping -c 2 -W 2 172.17.0.8
2 packets transmitted, 2 packets received, 0% packet loss
```

**双向全通，0% 丢包，0.09 毫秒。** 你的预测被实验打脸了——恭喜，这是学实验科学最好的时刻。

### 铁证：lab-a 的 ARP 邻居表

光"通"还不够，我再给你一个更硬的证据。查 lab-a 内心深处的邻居记录：

```
$ docker exec lab-a cat /proc/net/arp
IP address       HW type     Flags       HW address            Mask     Device
172.17.0.9       0x1         0x2         f6:b1:0e:b7:a8:97     *        eth0
```

解释一下你看到什么了：网络底层不认 IP 认 MAC（第 2 课那个"网卡出厂编号"）。同一根线路段上的设备互相通信前，会先**广播喊话**："谁是 172.17.0.9？把你的 MAC 报给我！"——这种喊话**只有同一链路段上的设备听得到**（它不会被转发到网关外面去）。lab-a 的表里清清楚楚记着 lab-b 的 MAC `f6:b1:0e:b7:a8:97`——说明 lab-a 是通过"同一根线路段上的广播"直接找到 lab-b 的。**它俩在同一个链路段上，中间没有任何网关。**这就是"插在同一台交换机上"的铁证。

### 第 2 课伏笔兑现：什么叫"邻居"

还记得第 2 课路由表那两行吗？

```
default via 172.17.0.1 dev eth0          ← 其余的，交大门
172.17.0.0/16 dev eth0 scope link ...    ← 邻居，直接喊话
```

当时我说"邻居 = 同小区住户"，含糊带过。今天可以给出精确版了：**"邻居"就是"插在同一台交换机上的设备"**。lab-a ping lab-b，路由表一查：目的地 172.17.0.9 在 172.17.0.0/16 里 → 走第二条规则 → 直接从 eth0 喊话（ARP 广播找 MAC）→ docker0 这台交换机把喊话转给 lab-b 的网线 → 完成。**全程没碰大门，没出小区。**

### 包的完整旅程（全景图升级）

```
lab-a                                  lab-b
┌──────────┐                          ┌──────────┐
│ eth0     │                          │ eth0     │
│ 172.17.0.8│                         │ 172.17.0.9│
└────┬─────┘                          └────▲─────┘
     │ veth（网线的一半）                   │
     ▼                                    │ veth
┌─────────────────────────────────────────────┐
│                docker0 交换机                  │  ← 在宿主机肚子里
└─────────────────────────────────────────────┘
```

包从 lab-a 的 eth0 出发 → 顺着 veth 网线滑到 docker0 → docker0 查着 MAC 把它从另一根 veth 转给 lab-b → lab-b 的 eth0 收到。**容器之间确实没有直连网线，但交换机替它们"接了头"。**

### 官方文档佐证 + 一颗延时炸弹

官方文档原话（意译）：*默认配置下，默认 bridge 上的容器之间可以用**容器 IP 地址**无限制地互相访问。它们**不能通过名字互相访问**。*

前半句今天兑现了。后半句请抄在便签上贴显示器边：**"不能用名字互访"**——这是默认 bridge 最大的坑，第 7 课它将引爆一场真实事故，第 8 课用它换来自定义网络的真谛。

### 课堂支线：veth 为什么数出 8 根

实验时我数 veth：预期 5 旧 + 2 新 = 7 根，实际 **8 根**。按第 5 次对话立的规矩，数字对不上就查——`docker ps` 一看：8 个容器，其中 **box1 复活了**（Up 9 minutes）。查它的重启策略是 `no`，说明不是自动拉起，是被某种方式重新 start 的（谁拉的，现有证据查不到，到此为止，不编故事）。重要的是事实链完整：**8 个容器 ↔ 8 根 veth，一一对应，账平了**。顺带这也实证了上一课的逆过程：**容器启动 → veth 自动重建 → 重新入册**。

## 本课小结

- 容器 ↔ 宿主机之间**没有**点对点网线；veth 是"容器 ↔ docker0 交换机"的网线
- 同一 bridge 网络上的容器 = 同一台交换机上的邻居 = 同一链路段 → **用 IP 互 ping 通**（实测双向 0% 丢包）
- ARP 表是"同一链路段"的铁证：里面有对方 MAC = 广播直呼过 = 没过网关
- 第 2 课"邻居直呼"规则兑现：邻居 = 同一台交换机上的设备
- 官方文档：默认 bridge 容器间**IP 互访无限制**、**名字互访不行**（第 7 课炸弹）

## 课后思考题（第 5 课的门票）

lab-a 现在能和 lab-b 互通了。那它能不能出门？在 lab-a 里 `ping 223.5.5.5`（阿里 DNS，公网地址），你觉得通不通？

更关键的是第二问：**如果通了**——lab-a 发出的包裹，寄件人地址写的是 `172.17.0.8`。可是 172.17.x.x 这种门牌在互联网上**根本不存在**（它是"私网门牌"，出了小区没人认识）。那阿里的回程包裹，是怎么一路找到这台小电脑的？

提示：答案就藏在第 4 次对话查账时你见过的那一行 Docker 账本里。

---

## 【2026-08-22 · 第 7 次对话（插播问答三）】

### 学生原话

> root@pc3507:~# docker exec box1 ip addr show eth0
> 2: eth0@if50: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue
>     link/ether 0a:da:f1:d1:9f:9c brd ff:ff:ff:ff:ff:ff
>     inet 172.17.0.7/16 brd 172.17.255.255 scope global eth0
>        valid_lft forever preferred_lft forever
> root@pc3507:~# ip link show type veth
> 15: veth5efa696@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP mode DEFAULT group default
>     link/ether 62:36:9b:c5:6f:c5 brd ff:ff:ff:ff:ff:ff link-netnsid 0
> 16: vethb08adfc@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP mode DEFAULT group default
>     link/ether aa:43:2e:99:42:27 brd ff:ff:ff:ff:ff:ff link-netnsid 1
> 31: veth2476840@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP mode DEFAULT group default
>     link/ether 42:1a:96:83:b7:82 brd ff:ff:ff:ff:ff:ff link-netnsid 2
> 32: veth917df32@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP mode DEFAULT group default
>     link/ether c2:28:43:92:ca:27 brd ff:ff:ff:ff:ff:ff link-netnsid 3
> 33: veth1d30c12@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP mode DEFAULT group default
>     link/ether 4e:ac:7f:b6:0c:ed brd ff:ff:ff:ff:ff:ff link-netnsid 4
> 50: veth1a7c2fb@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP mode DEFAULT group default
>     link/ether 3e:05:ac:2c:11:56 brd ff:ff:ff:ff:ff:ff link-netnsid 5
>
> 你刚刚不是说容器里面是 eth0,然后和对应编号的什么绑定在一起了么，和docker0有什么关系

（学生首次**自主上机**，在同一台 PC3507 的 WSL 环境跑了两条课上的命令）



### 老师原文（veth 的两层关系） 

---

先记一笔：**这是你第一次自己上机拿证据来问问题，而不是听我讲。**这个转折比这个问题的答案重要十倍——你已经开始用第 4 次对话那套"撒网—对暗号"了。而且运气极好：你这两条输出里，正好藏着你要的答案，还藏着两个连我都没安排的彩蛋。逐个拆。

## 你混淆的：一根线上的两层关系

你的疑问其实是："eth0@if50 这个'编号绑定'，跟 docker0 是什么关系？"

答案是：**它们是两层完全不同的关系，在你自己的输出里用两种不同的标记写着，你把它们看成一层了。**

### 第一层：`@if50` / `@if2` ——网线**内部**的事（跟 docker0 无关）

看你自己抓到的这对：

```
容器 box1 里：2: eth0@if50          ← "我是 2 号，我的另一半是 50 号"
宿主机上：  50: veth1a7c2fb@if2     ← "我是 50 号，我的另一半是 2 号"
```

`@ifN` 是 veth 网线**两半互相报对方编号**——纯粹是这一对内部的事。一对 veth 生来就连通：从一端塞进去的包，会原封不动从另一端掉出来，**哪怕这根线哪儿都没插**。这层关系里，docker0 没有任何戏份。

### 第二层：`master docker0` ——网线**插上交换机**的事

再看你的每根 veth 后面都拖着的那半句：`master docker0`。这句话的主语是**宿主机那半根线**（veth1a7c2fb），意思是："我把自己插在了 docker0 这台交换机的端口上。"——这才是"和 docker0 的关系"。

### 合起来：一条完整的链

```
   box1 容器                                  宿主机
┌───────────────────┐
│ 2: eth0@if50       │ ← 网线的一半（容器侧）
└─────────┬─────────┘
          │ ══════ veth pair（@if50 与 @if2 互相报对方编号）══════
┌─────────▼─────────┐
│ 50: veth1a7c2fb@if2│ ← 网线的另一半（宿主机侧）
│    master docker0  │ ← 这一半插在交换机上
└─────────┬─────────┘
          ▼
    ┌───────────┐
    │  docker0  │  ← 交换机（bridge 型号）
    └───────────┘
```

一句话总结：**`@ifN` 是线自己的两根芯，`master docker0` 是线插上了哪台机器。容器里的 eth0 从头到尾不认识 docker0——它只认识自己手里那根线，线那头通到哪，是 Docker 布线时决定的。**

 

## 本课小结

- veth 两层关系两层标记：`@ifN` = 线的两半互报编号（线的内部）；`master docker0` = 线插上交换机（线与交换机）
- 容器 eth0 不直接认识 docker0，只认识自己的网线
- 容器重启 = 拆旧线、做新线、重租门牌（IP 可能相同可能不同，不保证）
- 从 veth 清清单可以反推容器存活数——账本会说话

---

第 6 课的思考题还挂着：**lab-a 里 ping 223.5.5.5 通不通？公网不认识 172.17.0.8 这个私网门牌，回程包裹是怎么找到它的？**——提示再看一眼：第 4 次对话 Docker 账本里的那一行。答完进第 5 课。

---
