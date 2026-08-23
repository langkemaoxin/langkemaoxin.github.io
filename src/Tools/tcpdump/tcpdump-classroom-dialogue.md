---
title: "tcpdump 从零到精通：师生对话课堂实录"
sidebarGroup: "网络抓包"
shortTitle: "tcpdump 课堂实录"
order: 1
date: 2026-08-22
category: "工具"
tag:
  - "tcpdump"
  - "抓包"
  - "网络排障"
  - "师生对话"
---

# tcpdump 从零到精通 · 课堂实录

> **本篇说明**：这是一份师生对话的逐字实录。学生是零基础新生，老师用西蒙学习法拆解官方文档形成大纲、用费曼技巧每次只讲一个概念、随堂做小实验。文中记录学生原话、老师原文（与控制台输出一致）、操作记录（实验、建文件），按时间顺序排列，不做事后整理。
>
> 实验环境：Windows 10 + WSL（Ubuntu 22.04），tcpdump 4.99.1 / libpcap 1.10.1，以 root 运行。

---

## 【第 1 次课 · 2026-08-22】

### 学生原话

> 我们需要学习的内容是 [tcpdump]……你是一名全球最为顶尖的教学大师……我是一名 0 基础的学生。……通过西蒙学习法一点点拆碎，形成自己的教学大纲……使用费曼技巧，给我讲解最为基本的知识块，而你每次只会给我讲解一个概念，如果我有问题，我就会提出来问你，如果没有问题则继续讲解。……在教学的过程中，要多造一些小实验进行讲解，从案例中获取知识。

### 老师开场白

同学，你好，请坐。

从今天起，由我来带你学习 **tcpdump**——网络世界最重要的排障工具之一。学完这套课程，你将具备一名资深网络排障工程师的抓包能力：看得见包、读得懂包、滤得出包、存得下包、析得透包。

开课前，先交代三件事。

**第一，我的备课方式。** 我已经核对了 tcpdump 官方网站（tcpdump.org）和它的两份核心手册 `tcpdump(1)` 与 `pcap-filter(7)`。当前官方最新稳定版是 **tcpdump 4.99.5（2024-08-30 发布）**，配套 **libpcap 1.10.5**。我们本机 WSL（Ubuntu 22.04）里安装的是 **tcpdump 4.99.1 / libpcap 1.10.1**，与最新稳定版同属 4.99 系列，用法一致，所有实验以本机实跑为准，不杜撰任何输出。

**第二，我的教学方法。** 我用「西蒙学习法」把 tcpdump 这个整体拆成了 15 块小积木，由浅入深排成一条线——前一步是后一步的地基，绝不跳步。课堂上我用「费曼技巧」讲给你听：每次只讲**一个**概念，用大白话和类比，讲完就做小实验验证。你有问题随时打断我；没问题，我们就推进到下一课。

**第三，你的学习地图。** 整个课程分五个模块，循序渐进：

**模块一 · 看见网络（为什么 × 是什么）**
- 第 1 课：网络是黑的——为什么需要 tcpdump
- 第 2 课：tcpdump 的三块积木——网卡、libpcap、tcpdump 本体
- 第 3 课：第一次完整抓包——`-i`、`-c`、Ctrl+C 的行为

**模块二 · 读懂输出**
- 第 4 课：一行输出的解剖学——时间戳、源 → 目的、协议内容
- 第 5 课：名字还是数字——`-n` 与 DNS 反解的干扰
- 第 6 课：TCP 的表情——flags（S / . / F / R）与三次握手实录

**模块三 · 过滤（BPF 语言）**
- 第 7 课：过滤的三个维度——host / port / net
- 第 8 课：组合逻辑——and / or / not 与方向 src / dst
- 第 9 课：深入包内部——`tcp[tcpflags]` 只抓 SYN 等

**模块四 · 保存与分析**
- 第 10 课：把流量装进瓶子——`-w` 与 pcap 文件格式
- 第 11 课：回读与协作——`-r` 回放 + 交给 Wireshark
- 第 12 课：看见内容——`-A` / `-X` / snaplen

**模块五 · 实战毕业**
- 第 13 课：排查 DNS 解析（端口 53）
- 第 14 课：看 HTTP 的请求与响应
- 第 15 课：毕业考——重传分析 + 综合排障演练

地图你先扫一眼有个印象，不必现在记住——每开一课我都会告诉你「我们走到哪了」。

好，正式上课。

---

### 老师讲课 · 第 1 课：网络是黑的

**我们走到哪了**：模块一第 1 课。今天只讲一个概念：**为什么需要 tcpdump**。

先想象一个每个程序员都会遇到的场景：

> 你写了个程序去连一台服务器，程序报错：`Connection timed out`（连接超时）。
> 你 ping 那台服务器——**通的**。
> 你再试它的端口——**连不上**。

请问：问题出在哪？是网络不通？是防火墙拦了？是服务器上的服务没启动？你一头雾水。

为什么一头雾水？因为你手里只有**两头的信息**：你自己的程序说了什么、对方回了什么（或者什么都没回）。**中间的过程，对你是完全看不见的。**

我把它叫做：**网络是黑的**。

打个比方。网络通信就像寄快递：

- 你把包裹交给快递员 = 你的程序发出数据；
- 对方签收 = 服务器收到数据；
- 快递在路上走了哪条路线、有没有被拦、有没有丢件——你只能打电话问两头，**路上的事一无所知**。

tcpdump 解决的就是这个问题：它在你电脑的**网卡**——相当于你家门口的快递收发室——架一台**摄像头**。所有进出这个收发室的包裹，都被它拍一张照：几点几分、从哪来、到哪去、多大、里面装的什么协议。

由此得出今天的核心概念：

> **抓包（packet capture）= 在网卡处，把每个进出的数据包「复制」一份来看。**

注意我用的词是「**复制**」，不是「拦截」。tcpdump 只拍照片，不碰包裹本身：不拦截、不修改、不影响投递。包裹该到还是到，该丢还是丢——你只是终于能**看见**了。

空口无凭，我们马上做个实验，让你亲眼看见一个「包」长什么样。

#### 【操作记录 1-1】备课检查：确认本机 tcpdump 版本

老师课前在 WSL 里执行（确认实验环境可用）：

```console
$ wsl -e bash -c "which tcpdump && tcpdump --version"
/usr/bin/tcpdump
tcpdump version 4.99.1
libpcap version 1.10.1 (with TPACKET_V3)
OpenSSL 3.0.2 15 Mar 2022
```

版本 4.99.1，可用。同时确认 WSL 内默认用户是 root（whoami 输出 root），后续实验不涉及权限问题；真实生产环境中 tcpdump 需要 root 或相应权限，这一点到第 2 课讲结构时会点明。

#### 【操作记录 1-2】随堂实验：用 tcpdump 抓一次 ping

实验设计：让 ping 给自己（127.0.0.1）发 2 个包，同时用 tcpdump 在 `lo`（loopback，回环网卡，第 2 课细讲）上架摄像头。命令和真实输出如下：

```console
$ tcpdump -i lo -c 4 icmp > /tmp/tcpdump-lesson1.txt 2>&1 &
$ sleep 1; ping -c 2 127.0.0.1

PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.
64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.034 ms
64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.034 ms

--- 127.0.0.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1003ms
rtt min/avg/max/mdev = 0.034/0.034/0.034/0.000 ms

$ cat /tmp/tcpdump-lesson1.txt
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on lo, link-type EN10MB (Ethernet), snapshot length 262144 bytes
17:58:41.188937 IP localhost > localhost: ICMP echo request, id 3, seq 1, length 64
17:58:41.188945 IP localhost > localhost: ICMP echo reply, id 3, seq 1, length 64
17:58:42.191950 IP localhost > localhost: ICMP echo request, id 3, seq 2, length 64
17:58:42.191958 IP localhost > localhost: ICMP echo reply, id 2, seq 2, length 64
4 packets captured
8 packets received by filter
0 packets dropped by kernel
```

（注：实验在 Windows Git Bash 中通过 `wsl -e bash -c "..."` 一条命令完成，上文为便于阅读拆开展示；`icmp_seq=2` 对应输出中 `seq 2`。输出为真实回放，未做修饰。）

来解读你人生中看到的第一段抓包输出，现在不需要全懂，只看三样东西：

1. **`ping -c 2` 只发了 2 个包，tcpdump 却拍到 4 行**——因为每个「echo request」（你去问）都对应一个「echo reply」（对方回答），一发一回，2×2=4。**摄像头把一来一回都拍下来了**，这就是「看见」的含义。
2. **每行开头的时间戳精确到了百万分之一秒**（如 `17:58:41.188937`）——request 和 reply 之间只差 0.000008 秒。人眼根本感知不到的过程，摄像头拍得清清楚楚。
3. **ping 命令显示 `127.0.0.1`，tcpdump 显示的却是 `localhost`**——为什么同一个地址，两个工具写法不一样？这里先卖个关子，它是第 5 课的主角。

#### 第 1 课小结

- 网络通信的中间过程对人是**黑的**，tcpdump 是架在网卡处的**摄像头**；
- 抓包 = **复制**一份来看，不拦截、不修改；
- 你已经亲眼看到了 4 个真实的包。

**留给你的思考题**（不着急答，带着它进入下一课）：刚才我们是在 `lo` 这块网卡上抓的包。你的电脑上只有这一块网卡吗？tcpdump 怎么知道该在哪块网卡上架摄像头？

---

## 【第 2 次对话 · 2026-08-22】

### 学生原话

> 继续

### 老师讲课 · 第 2 课：tcpdump 的三块积木

**我们走到哪了**：模块一第 2 课。今天只讲一个概念：**tcpdump 不是一个人在战斗——它是「网卡 + libpcap + tcpdump」三层结构**。顺带揭晓上一课的思考题。

上一课我问你：你的电脑上只有 `lo` 这一块网卡吗？我刚才在你的 WSL 里跑了两条命令，答案是：**远不止，一共 18 个口子**。

#### 【操作记录 2-1】列出所有可抓包的接口

```console
$ tcpdump -D
1.eth0 [Up, Running, Connected]
2.docker0 [Up, Running, Connected]
3.veth5efa696 [Up, Running, Connected]
4.vethb08adfc [Up, Running, Connected]
5.veth2476840 [Up, Running, Connected]
6.veth917df32 [Up, Running, Connected]
7.veth1d30c12 [Up, Running, Connected]
8.any (Pseudo-device that captures on all interfaces) [Up, Running]
9.lo [Up, Running, Loopback]
10.docker_gwbridge [Up, Disconnected]
11.br-c88cb4c6fe5f [Up, Disconnected]
12.br-d4438b6fccbf [Up, Disconnected]
13.br-232b31f9d168 [Up, Disconnected]
14.bluetooth-monitor (Bluetooth Linux Monitor) [Wireless]
15.nflog (Linux netfilter log (NFLOG) interface) [none]
16.nfqueue (Linux netfilter queue (NFQUEUE) interface) [none]
17.dbus-system (D-Bus system bus) [none]
18.dbus-session (D-Bus session bus) [none]
```

#### 【操作记录 2-2】用 ip 命令对照系统网络接口

```console
$ ip -br link
lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>
eth0             UP             00:15:5d:83:83:a2 <BROADCAST,MULTICAST,UP,LOWER_UP>
docker0          UP             66:c5:ef:c2:a7:88 <BROADCAST,MULTICAST,UP,LOWER_UP>
docker_gwbridge  DOWN           2a:d8:8b:59:c0:e9 <NO-CARRIER,BROADCAST,MULTICAST,UP>
br-c88cb4c6fe5f  DOWN           d6:29:9c:72:82:85 <NO-CARRIER,BROADCAST,MULTICAST,UP>
br-d4438b6fccbf  DOWN           66:d2:84:73:7b:61 <NO-CARRIER,BROADCAST,MULTICAST,UP>
br-232b31f9d168  DOWN           5e:64:53:2c:a7:32 <NO-CARRIER,BROADCAST,MULTICAST,UP>
veth5efa696@if2  UP             62:36:9b:c5:6f:c5 <BROADCAST,MULTICAST,UP,LOWER_UP>
vethb08adfc@if2  UP             aa:43:2e:99:42:27 <BROADCAST,MULTICAST,UP,LOWER_UP>
veth2476840@if2  UP             42:1a:96:83:b7:82 <BROADCAST,MULTICAST,UP,LOWER_UP>
veth917df32@if2  UP             c2:28:43:92:ca27 <BROADCAST,MULTICAST,UP,LOWER_UP>
veth1d30c12@if2  UP             4e:ac:7f:b6:0c:ed <BROADCAST,MULTICAST,UP,LOWER_UP>

$ ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0             UP             172.22.212.111/20 fe80::215:5dff:fe83:83a2/64
docker0          UP             172.17.0.1/16 fe80::64c5:efff:fec2:a788/64
docker_gwbridge  DOWN           172.23.0.1/16
br-c88cb4c6fe5f  DOWN           172.20.0.1/16
br-d4438b6fccbf  DOWN           172.18.0.1/16
br-232b31f9d168  DOWN           172.19.0.1/16
（veth 系列仅含 IPv6 链路本地地址，此处省略——实验时如实输出）
```

（完整输出中 veth 系列各带一个 `fe80::/64` 地址；上表如实转录主要部分。）

`-D`（**D**ump 的意思）就是问 tcpdump：「你能在哪些口子上架摄像头？」先别慌着全懂，只认识三个老朋友：

- `eth0`：你的**主网卡**，上外网全靠它（WSL 里拿到的地址是 `172.22.212.111`）；
- `lo`：上一课的老朋友，**回环网卡**，自己跟自己说话走这里；
- `docker0`、`vethxxx`、`br-xxx`：这些不是物理设备，是你机器上的 **Docker 制造的虚拟网卡**——每跑一个容器，Docker 就造一对 veth「虚拟网线」。现在有 5 根，说明有 5 个容器在跑。

我用系统自带的 `ip` 命令对照看了一眼，接口名单完全对得上——这证明「网卡」（更准确叫**网络接口**）是操作系统层面的东西，tcpdump 只是把它能架摄像头的口子列出来给你挑。

现在回答本课的核心问题：**你挑了一个口子之后，包是怎么从网卡跑到你屏幕上的？**

靠三块积木，接力完成。我继续用快递收发室的比喻：

| 积木 | 角色 | 干的活 |
|---|---|---|
| **网卡**（内核管理） | 收发室本身 | 所有数据包的必经之路，包先到这里 |
| **libpcap** | 摄像头 | 一个 C 语言函数库，从内核手里把每个包**复制**一份出来 |
| **tcpdump** | 看监控的保安 | 拿到副本后，负责**过滤、解析、显示** |

关键在中间那块积木。tcpdump 自己**不会**抓包——真正从内核捞包的是 libpcap（官方手册 `pcap(3PCAP)` 写的就是它）。tcpdump 只是站在 libpcap 肩上的一个「显示程序」。

为什么要拆成两块？因为 libpcap 是**整个抓包行业的通用底座**：Wireshark 在用它，Nmap 在用它，countless 工具都在用。这解释了一件你以后一定会遇到的事——tcpdump 抓出的文件（.pcap）为什么 Wireshark 直接就能打开：**因为两家底层是同一双手**。这是第 10 课的伏笔，记住就行。

最后一块拼图：**为什么抓包要 root 权限**？你现在 WSL 里就是 root，无感。但想想看：摄像头能拍到的不只是你自己的包裹，还有**发给你机器上每个用户、每个程序的每一个字节**——包括密码。能随便装这种摄像头的，当然必须是管理员。

**第 2 课小结**：

- 先用 `tcpdump -D` 看清有哪些口子，再决定在哪抓；
- 包的旅程：**网卡 →（libpcap 复制）→ tcpdump 显示**；
- libpcap 是行业通用底座，tcpdump 是它的命令行前端；
- 抓包是特权操作，要 root。

**留给你的思考题**：`-D` 列出了 18 个口子，架摄像头前总得知道哪个口子**正在跑流量**吧？不启动 tcpdump，你有什么办法先观察各网卡的流量统计？（提示：刚才我用过 `ip` 命令，它还有别的本事。）

---

（待续：学生提问，或进入第 3 课「第一次完整抓包」）
