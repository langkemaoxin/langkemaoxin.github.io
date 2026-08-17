---
title: NAT 白话拆解——容器为什么能上网，外网为什么进不来
sidebarGroup: Linux 基础
shortTitle: 04 NAT 地址转换
order: 4
date: 2026-08-17T00:00:00.000Z
category: Linux
tag:
  - Linux
  - 网络
  - NAT
  - iptables
  - Docker前置
description: 用两侧同时抓包的实测，看清 NAT 如何改写源/目的地址：MASQUERADE 让容器出网、DNAT 是 -p 端口映射的真身、连接跟踪表负责把回程包还给正确的容器。
---

> **Linux 板块 · 第 4 篇**  
> 上一篇：[《tcpdump 抓包入门》](/Linux/basics/linux-03-tcpdump)（本文两侧抓包用的兵器，在那篇练手）  
> 读完可接着看：[《Docker 网络模式与实操》](/云原生/docker/docker-11-network)（`-p` 端口发布、iptables 规则全集都在那篇展开）

---

## 开头：私有地址的包，凭什么能活着到公网

第 2 篇结尾留了个没拆完的疑问：容器 IP 是 `172.17.0.5` 这样的私有地址，公网上**没有任何人认识它**，可它 ping `223.5.5.5` 就是通了——上一篇 tcpdump 结尾的思考题也问了：这时 eth0 上抓到的源地址会是谁？

```text
64 bytes from 223.5.5.5: seq=0 ttl=113 time=5.168 ms
```

这个包离开容器后必然被**换过头面**才活着到达公网，回来时又被**换了回来**。干这件事的技术叫 NAT。本文用「两侧同时抓包」的实测，把这个换头过程当场拍下来给你看；顺手回答另一个方向的问题：**为什么外网主动进不来，非得 `-p` 开门**。

> **实验环境**：WSL2 Ubuntu-22.04 + 原生 Docker Engine 29.1.3，iptables v1.8.7（legacy 后端）。你的机器号码会不同，结构一致即可对照。抓包工具 `tcpdump`（用法见[上一篇](/Linux/basics/linux-03-tcpdump)），连接跟踪表直接读内核的 `/proc/net/nf_conntrack`（无需装 conntrack 命令）。文中 `iptables`、`tcpdump` 都需要 root（本环境默认用户即 root）。

---

## 一、NAT 是什么：网关手里的「换头术」

**是什么**：NAT（Network Address Translation，网络地址转换）= 网关在包过手时，**改写 IP 包头部地址字段**的技术。改「从哪来」（源地址）叫 SNAT，改「送到哪」（目的地址）叫 DNAT。

**为什么**：IPv4 约 43 亿个号，全球设备远超此数。解法：内网随便用私有地址（RFC 1918 那三段，见上一篇），出门时网关把源地址改成自己的出口地址——**一整个内网共享一个公网身份**，号就够用了。

**白话类比**：小区收发室。住户（内网设备）不对外暴露门牌；所有快递由收发室（网关）**以自己的名义**寄出，收到后再分拣转交。外面的人只认识收发室，不知道也不需要知道里面住了谁。

**背景**：NAT 最早为缓解地址枯竭而生（RFC 1631，1994），后来标准化为 RFC 3022。它本来是个「临时救急」方案，结果活成了互联网基础设施——今天你家路由器、公司出口、云平台、Docker 全在用它。

---

## 二、出方向 MASQUERADE：把「从哪来」改成网关自己

### 2.1 规则长什么样

Docker 装好时就在宿主机 iptables 的 **nat 表**里写好了规则。看本机（多条规则里挑默认 bridge 那条）：

```bash
$ iptables -t nat -S POSTROUTING | grep 172.17
-A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
```

逐段读：

| 片段 | 含义 |
|------|------|
| `-t nat -S POSTROUTING` | 列出 nat 表 POSTROUTING 链的规则（包**即将从网卡发出前**经过这里） |
| `-s 172.17.0.0/16` | 来源在默认 bridge 的网段里（= 从容器出来） |
| `! -o docker0` | 且不从 docker0 网卡出（= 要离开容器网段，去外面） |
| `-j MASQUERADE` | 动作：把源地址改写成**出口网卡当前的地址** |

`MASQUERADE` 是 SNAT 的「动态版」：普通 SNAT 写死改写后的地址，MASQUERADE 自动用出口网卡**此刻**的地址——家庭宽带拨号 IP 会变，也能用。

### 2.2 实测：两侧同时抓包，拍下改写瞬间

光看规则不过瘾，直接抓现行。思路：一边在 `docker0` 上抓、一边在 `eth0` 上抓，然后让容器 ping 公网——**同一个包**过两张网卡的模样对比（`tcpdump` 输出去掉了开头 banner，数据行原样）：

```bash
$ tcpdump -ni docker0 icmp -c 4 &          # ① 网桥侧
$ tcpdump -ni eth0 'icmp and host 223.5.5.5' -c 4 &   # ② 出口侧
$ docker run --rm busybox ping -c 2 223.5.5.5
```

docker0 侧（容器网段内部，**原始模样**）：

```text
13:36:53.641545 IP 172.17.0.5 > 223.5.5.5: ICMP echo request, id 1, seq 0, length 64
13:36:53.646613 IP 223.5.5.5 > 172.17.0.5: ICMP echo reply, id 1, seq 0, length 64
13:36:54.641789 IP 172.17.0.5 > 223.5.5.5: ICMP echo request, id 1, seq 1, length 64
13:36:54.647881 IP 223.5.5.5 > 172.17.0.5: ICMP echo reply, id 1, seq 1, length 64
```

eth0 侧（离开宿主机时，**已换头**）：

```text
13:36:53.641565 IP 172.22.212.111 > 223.5.5.5: ICMP echo request, id 1, seq 0, length 64
13:36:53.646595 IP 223.5.5.5 > 172.22.212.111: ICMP echo reply, id 1, seq 0, length 64
13:36:54.641800 IP 172.22.212.111 > 223.5.5.5: ICMP echo request, id 1, seq 1, length 64
13:36:54.647871 IP 223.5.5.5 > 172.22.212.111: ICMP echo reply, id 1, seq 1, length 64
```

对照着看，证据就在时间戳里：

| | docker0 侧（13:36:53.641**545**） | eth0 侧（13:36:53.641**565**） |
|---|---|---|
| 去程源地址 | `172.17.0.5`（容器） | `172.22.212.111`（WSL 的 eth0） |
| 回程目的地址 | `172.17.0.5` | `172.22.212.111` |

**同一个包**（时间戳只差 20 微秒），过手一次，源地址从 `172.17.0.5` 变成 `172.22.212.111`——这就是 MASQUERADE 的现场。回程包到达 eth0 时目的地址是 `172.22.212.111`，又被改回 `172.17.0.5` 送到 docker0。

### 2.3 回程怎么知道还给谁：连接跟踪

网关同时替成百上千个容器/设备改写，回程包到了它怎么知道该还给谁？靠内核的**连接跟踪表**（conntrack）。刚抓完包立刻读它（ICMP 条目约 30 秒后过期，要看趁早）：

```bash
$ grep 223.5.5.5 /proc/net/nf_conntrack
ipv4  2 icmp  1 26 src=172.17.0.5 dst=223.5.5.5 type=8 code=0 id=1 src=223.5.5.5 dst=172.22.212.111 type=0 code=0 id=1 mark=0 zone=0 use=2
```

一条记录分两半读：

- **前半**（原始方向）：`src=172.17.0.5 dst=223.5.5.5 type=8`——容器发出的 echo request
- **后半**（应答的翻译规则）：`src=223.5.5.5 dst=172.22.212.111 type=0`——凡是符合这个模样的回包，改写成前半的镜像（还给 `172.17.0.5`）

nat 表只管「第一个包」的改写决策，之后同一连接的每个包都按 conntrack 里登记的翻译规则自动往返。**没有这张表，NAT 改完就找不回去了。**

---

## 三、进方向 DNAT：`-p` 端口映射的真身

### 3.1 外面为什么进不来

现在反过来：公网（或局域网里别的机器）想主动连 `172.17.0.5`——连不了。两个原因：

1. **路由不通**：私有地址在公网上不可路由，包根本到不了你机器；
2. **没人翻译**：即便包到了宿主机，目的地址写的是宿主机自己，内核没有任何「该转给哪个容器」的登记——SNAT 那套翻译表只在**你主动发起**连接时才建立。

这就是上一篇说的「进出不对称」的底层原因：**出方向网关主动替你换头，进方向没人替你换**。想让人进来，就得显式登记一条 DNAT 规则——Docker 的 `-p` 干的就是这个。

### 3.2 规则长什么样

本机有个容器发布过 `-p 18080:80`，iptables 里对应的真身（nat 表 DOCKER 链）：

```bash
$ iptables -t nat -S DOCKER | grep 18080
-A DOCKER ! -i docker0 -p tcp -m tcp --dport 18080 -j DNAT --to-destination 172.17.0.4:80
```

逐段读：

| 片段 | 含义 |
|------|------|
| `! -i docker0` | 从 docker0 以外的网卡进来（= 从外部来的包；容器之间互访不走这条） |
| `-p tcp --dport 18080` | TCP，目的端口 18080 |
| `-j DNAT --to-destination 172.17.0.4:80` | 动作：把目的地址改写成容器 `172.17.0.4` 的 80 端口 |

对比 SNAT：**一个改「从哪来」，一个改「送到哪」**；一个自动建（容器出网），一个显式开（`-p` 时 Docker 写入）。

### 3.3 实测：从 Windows 访问发布端口，两侧抓包

宿主机（Windows）直接 curl WSL 的 18080 端口，两侧同时抓：

```bash
$ tcpdump -ni eth0 tcp port 18080 -c 6 &     # ① 进宿主机时（DNAT 前）
$ tcpdump -ni docker0 tcp port 80 -c 6 &     # ② 到容器时（DNAT 后）
```

Windows 侧执行 `curl http://172.22.212.111:18080/`，返回 `HTTP 200`。抓到的包：

eth0 侧（进宿主机时，目的地还是宿主机）：

```text
13:37:09.862301 IP 172.22.208.1.14004 > 172.22.212.111.18080: Flags [SEW], seq 813594299, win 64240, options [mss 1460,nop,wscale 14,nop,nop,sackOK], length 0
13:37:09.862386 IP 172.22.212.111.18080 > 172.22.208.1.14004: Flags [S.], seq 1321109193, ack 813594300, win 64240, options [mss 1460,nop,nop,sackOK,nop,wscale 7], length 0
```

docker0 侧（送进容器网段时，目的地已换成容器）：

```text
13:37:09.862331 IP 172.22.208.1.14004 > 172.17.0.4.80: Flags [SEW], seq 813594299, win 64240, options [mss 1460,nop,wscale 14,nop,nop,sackOK], length 0
13:37:09.862381 IP 172.17.0.4.80 > 172.22.208.1.14004: Flags [S.], seq 1321109193, ack 813594300, win 64240, options [mss 1460,nop,nop,sackOK,nop,wscale 7], length 0
13:37:09.885983 IP 172.22.208.1.14004 > 172.17.0.4.80: Flags [P.], seq 1:85, ack 1, win 128, length 84: HTTP: GET / HTTP/1.1
13:37:09.886211 IP 172.17.0.4.80 > 172.22.208.1.14004: Flags [P.], seq 1:239, ack 85, win 502, length 238: HTTP: HTTP/1.1 200 OK
```

（`SEW` = SYN+ECN+CWR 握手包，`S.` = SYN+ACK 应答，`P.` = 携带数据的包。）三个看点：

1. **目的地址换头**：`172.22.212.111.18080` → `172.17.0.4.80`，时间戳相差 30 微秒，同一个包；
2. **源地址没动**：外部来的包不需要改「从哪来」，容器直接看得见真实客户端 `172.22.208.1`；
3. **客户端是谁**：`172.22.208.1`——正是上一篇里 WSL 的默认网关（Windows 宿主）。这次请求的完整旅程：Windows → WSL 的 DNAT 门 → 容器。

---

## 四、「能出不能进」是一体两面

把两节合起来，NAT 的性格就完整了：

| 方向 | 技术 | 谁触发 | 效果 |
|------|------|--------|------|
| 内网 → 外网 | SNAT/MASQUERADE | 任何内网设备发包即自动生效 | 透明、无感知，「天生能上网」 |
| 外网 → 内网 | DNAT | 必须管理员显式登记（`-p`） | 「不请自来进不来」，进来必经登记的门 |

这不是缺陷，是 NAT 结构自带的**默认安全**：外面的人根本不知道、也无法定位内网里的具体设备。家用路由器「不开端口映射就连不进家里摄像头」、Docker「不 `-p` 就连不进容器」，是同一个机制。

它也有代价：外网无法主动发起，P2P、语音通话这类「双方都要主动」的应用就麻烦，于是有了 STUN 打洞、TURN 中继这些补丁方案（了解即可，本文不展开）。另外 NAT 依赖连接跟踪表，**连接数有上限**（每条占内存，内核有 nf_conntrack_max 限额），高并发 NAT 网关要调这个值——先把名字记住，遇到再说。

---

## 五、和前后文怎么衔接

- **上承第 2 篇**：网关是「决策者」（出网段先交给我），NAT 是它手里的「动作」（换头 + 查表还包）。上一篇的套娃图里每层网关做的事，本文拆开看到了内部
- **下接 Docker 第 11 篇**：本文只看了 Docker 写的两条代表性规则；完整的链（FORWARD 链过滤、自定义网络、容器互访为何不走 DNAT、`docker-proxy` 进程）在那篇展开
- **一句话背景**：iptables 是经典接口，其下本机用的是 legacy 后端；较新的发行版多切到 nft 后端（命令照敲，`iptables-nft` 兼容转换），再新的工具叫 nftables——三套名字，本质都是 netfilter 钩子，Docker 文档对此有说明

---

## 小结

- **NAT** = 网关改写 IP 头地址：改源叫 SNAT（动态版 MASQUERADE），改目的叫 DNAT
- **出网**：容器发包自动被 MASQUERADE 改写成出口网卡地址（两侧抓包实测：`172.17.0.5` → `172.22.212.111`，同包仅差 20µs）；回程靠 **conntrack 连接跟踪表**按登记的翻译规则改回
- **入网**：没人替你翻译，必须显式 DNAT——`-p 18080:80` 的真身就是 `--to-destination 172.17.0.4:80`（实测 Windows curl 经此门进容器，HTTP 200）
- **能出不能进**是 NAT 的结构特性，也是默认安全；代价是 P2P 类应用要打洞/中继，连接跟踪表有上限
- 规则存放处：`iptables -t nat`（本机 legacy 后端；新系统多为 nft 后端，命令兼容）

---

## 思考题

> 1. 本文 MASQUERADE 规则里有 `! -o docker0`——如果去掉这个条件，容器 A 访问同网段容器 B 时会发生什么？
> 2. DNAT 实测里容器看到的客户端是 `172.22.208.1`（Windows 宿主）。若两个容器经 `-p` 互相访问对方发布端口，容器看到的目的地和源分别长什么样、会经过 DNAT 吗？（提示：规则里的 `! -i docker0`。）

---

## 参考资料

- [RFC 3022 · Traditional IP Network Address Translator](https://www.rfc-editor.org/rfc/rfc3022) — NAT 的标准文档（前身为 RFC 1631）
- [Docker Docs · Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/) — Docker 写入 iptables 的规则全景与 nftables 说明
- [netfilter conntrack 文档](https://ipset.netfilter.org/nf_conntrack.html) — 连接跟踪机制
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker Engine 29.1.3（iptables v1.8.7 legacy 后端，tcpdump 4.99）
