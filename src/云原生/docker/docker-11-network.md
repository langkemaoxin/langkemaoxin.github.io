---
title: Docker 网络模式与实操——从 docker0 到 overlay / macvlan
sidebarGroup: Docker 系列
shortTitle: 11 网络模式与实操
order: 11
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - bridge
  - overlay
  - macvlan
description: Docker 网络模式与实操——从 docker0 到 overlay / macvlan / ipvlan：本机实测默认 bridge、端口发布全集、自定义 DNS、多网络与 --internal 分区、host/none/container，以及 Swarm overlay 与 macvlan/ipvlan；命令与输出逐段带读
---

> **Docker 系列 · 第 11/24 篇**
> 上一篇：[《Harbor 私有镜像仓库——按步骤从安装到第一次 push》](/云原生/docker/docker-10-harbor) · 下一篇：[《数据持久化——Volume、Bind Mount 与 tmpfs：容器删了，数据凭什么还在》](/云原生/docker/docker-12-data-persistence)

---

## 开头：微服务上了 Docker，为什么 localhost 有时通有时不通？

你把 Web 和 MySQL 拆成两个容器：Web 配置里写 `localhost:3306`，容器起来却连不上库。

- 在宿主机上，`localhost` 是宿主机本身  
- 默认 **bridge** 下，**每个容器有独立的网络视图**：自己的网卡、自己的 IP、自己的 `localhost`  
- Web 容器里的 `localhost` 只指向 **Web 自己**，不是隔壁 MySQL 容器  

大规模用 Docker 后，网络往往是踩坑最多的一块。本篇按一条线走完，并且**每条关键命令都会写清：要查什么 → 命令 → 本机结果 → 怎么读**。

1. 先补够本篇用的背景（Network Namespace 白话）  
2. 默认 bridge + 端口发布全集（本机实测）  
3. **自定义 bridge + 容器名 DNS + 网段从哪来**（多容器推荐解法）  
4. **多网络、别名与网络分区**（`--alias` / `--internal` / `gw-priority`）  
5. host / none / container  
6. **overlay（跨主机）与 macvlan / ipvlan 展开实测**  
7. 选型与命令速查  

> **实验环境**（文中输出均来自本机）：WSL2 Ubuntu-22.04 里的**原生 Docker Engine 29.1.3**（systemd 拉起，非 Docker Desktop）。`docker0`、`veth` 都在这个 Linux 环境里，`ip` / `ss` / `iptables` 命令直接可用。  
> **WSL2 注意**：引擎的 `eth0`（`172.22.x.x`）是 Windows 分配的虚拟网卡，不是你办公室的物理网卡；`host` / `macvlan` 语境里的「宿主机」指这台 WSL 虚拟机，文中会标明。  
> **前置（可选）**：对 `Subnet` / `/16` / 网关陌生，先看 [《读 Docker 网络前要懂的 IP、网段与网关》](/Linux/basics/linux-02-ip-subnet-gateway)；对 tcpdump 抓包用法陌生，先看 [《tcpdump 抓包入门》](/Linux/basics/linux-03-tcpdump)；对 NAT / DNAT / MASQUERADE 陌生，先看 [《NAT 白话拆解》](/Linux/basics/linux-04-nat)。  
> 官方参考：[Networking overview](https://docs.docker.com/engine/network/)、[bridge](https://docs.docker.com/engine/network/drivers/bridge/)、[overlay](https://docs.docker.com/engine/network/drivers/overlay/)、[macvlan](https://docs.docker.com/engine/network/drivers/macvlan/)、[ipvlan](https://docs.docker.com/engine/network/drivers/ipvlan/)。

---

## 一、背景知识：容器为什么各自有一套「网络世界」？

**是什么**：Linux **Network Namespace** 给一组进程一份独立的网络栈——网卡、路由表、端口、`localhost` 都是「这一份」的。Docker 默认给每个容器一份。

**为什么**：否则所有容器抢同一套端口、互相看见对方的监听，隔离就塌了；也没法给每个容器分配独立 IP。

**和本篇的关系**（够用即可，内核 `clone()` 细节见[第 18 篇](/云原生/docker/docker-18-namespace)）：

| 你在容器里看到的 | 实际含义 |
|------------------|----------|
| `eth0` + 如 `172.17.0.4` | 这份 namespace 里的虚拟网卡与地址 |
| `localhost` / `127.0.0.1` | **只属于这个容器** |
| 默认网关 `172.17.0.1` | 通常是宿主机上的 **docker0** 网桥 |

一句话：**容器不是小虚拟机，但是「网络看起来像一台小机器」。**

---

## 二、先看清：Docker 装好后有哪些网络？

**要查什么**：引擎里已经内置了哪些网络？名字、驱动、作用范围分别是什么？

```bash
docker network ls
```

本机（节选；你机器上可能还有 Compose 建的其它 bridge）：

```text
NETWORK ID     NAME      DRIVER    SCOPE
…              bridge    bridge    local
…              host      host      local
…              none      null      local
```

**怎么读这张表**：

| 列 | 含义 |
|----|------|
| **NAME** | 网络名字；`docker run` 不写 `--network` 时，默认用名为 `bridge` 的那个 |
| **DRIVER** | 用哪种驱动实现：`bridge` / `host` / `null`（显示为 none）等 |
| **SCOPE** | `local` = 只在本机引擎有效；后面 overlay 会看到 `swarm`（集群范围） |

| 网络 | 驱动 | 是什么 |
|------|------|--------|
| **bridge** | bridge | 默认；容器挂到 docker0 一类网桥 |
| **host** | host | 与宿主机（引擎）共享网络栈 |
| **none** | null | 有独立 namespace，但不配网卡，只剩 lo |

自定义网络用 `docker network create`；跨主机用 **overlay**，二层独立 MAC 用 **macvlan**——后文展开。

**验收**：能看到上述三种内置网络即可。

---

## 三、bridge 模式（默认）——本机主路径

### 3.1 是什么 / 为什么

**是什么（一句总括）**：默认 bridge 下，每个容器有自己的网络世界，再通过「虚拟网线」接到宿主机上的虚拟交换机，由 Docker 分配内网 IP；出网靠 NAT，外人访问靠 `-p` 端口映射。

**为什么当默认**：隔离够用、端口映射成熟、单机最省事。

### 3.1.1 这句话拆开看（五个零件）

原话里塞了五个概念，分开就不难：

| # | 术语 | 白话 | 在链路里干什么 |
|---|------|------|----------------|
| 1 | **Network Namespace** | 容器自己的网络世界 | 自带网卡视图、路由、`localhost` |
| 2 | **veth pair** | 一根网线的两端 | 一端进容器叫 `eth0`，另一端留在宿主机，接到网桥 |
| 3 | **docker0** | 宿主机上的小交换机 | 多根 veth 都插在它上面；默认地址常是 `172.17.0.1` |
| 4 | **从网段拿 IP** | 自动分内网地址 | 例如分到 `172.17.0.4`，网关指向 docker0 |
| 5 | **NAT** 与 **`-p`** | 出门 / 进站两套机制 | 容器访问外网靠 NAT 伪装；外面访问你靠端口映射 |

进出站不要混：

| 方向 | 机制 | 白话 |
|------|------|------|
| 容器 → 外网 | **NAT** | 出去时换成宿主机（引擎）的地址，外面看不到容器内网 IP |
| 外网/本机 → 容器 | **`-p` / `-P`** | 例如 `-p 18080:80`：打到引擎 `18080`，再转到容器 `80` |

稍细一点的示意：

```text
┌─ 容器 Network Namespace ─────────────────┐
│  进程 (nginx)                             │
│  eth0 = 172.17.0.4   ←── veth 的「里头」 │
│  localhost 只属于这个容器                 │
└───────────────────────────┬───────────────┘
                            │ veth pair（虚拟网线）
┌─ 引擎宿主机 ──────────────┴───────────────┐
│  veth 的「外头」插在 docker0 上           │
│  docker0 = 172.17.0.1（网关 / 小交换机）  │
│  出网：NAT          进站：-p 端口映射     │
└───────────────────────────────────────────┘
```

下面用本机命令，把这张图上的数字对出来。

### 3.2 怎么做：跑一个能从宿主机访问的 Nginx

**要查什么**：容器起来后，有没有分到 bridge 网段的 IP？默认网关是不是 docker0？`-p` 后能不能从本机浏览器/ curl 打到 Nginx？

**① 启动并映射端口**

```bash
docker run -d --name lab-net-web -p 18080:80 nginx:alpine
```

| 参数 | 干什么 |
|------|--------|
| `-d` | 后台跑 |
| `--name lab-net-web` | 起个好记的名字，后面 `exec` / `inspect` 用 |
| `-p 18080:80` | **引擎** `18080` → **容器内** `80`（Nginx 默认听 80） |
| 未写 `--network` | 自动挂到默认网络 `bridge` |

**② 看默认 bridge 的网段和网关**

```bash
docker network inspect bridge --format \
  'Subnet={{(index .IPAM.Config 0).Subnet}} Gateway={{(index .IPAM.Config 0).Gateway}}'
```

本机：

```text
Subnet=172.17.0.0/16 Gateway=172.17.0.1
```

**怎么读（地址池白话）**：

把 Docker 默认 bridge 想成公司给容器划的一片 **内网工位号**：

| 字段 | 本机值 | 白话 |
|------|--------|------|
| **Subnet** | `172.17.0.0/16` | **地址池** = 这片可用号码的范围（大约从 `172.17.0.0` 到 `172.17.255.255`）。新容器的 IP **只能从这里领**，不能随便编一个公网号 |
| **Gateway** | `172.17.0.1` | **网关** = 这片网的「出门岗亭」，一般就是 **docker0** 的地址；容器出网先送到这里 |

`/16` 先记成：「前两段固定是 `172.17`，后面可变」——**一排连续号码**。不必先学二进制才能读 Docker。

> 若「IP / 网段 / 网关 / 私有地址」整块都陌生，先读 Linux 短文：[《读 Docker 网络前要懂的 IP、网段与网关》](/Linux/basics/linux-02-ip-subnet-gateway)，再继续下面的容器 IP。

**③ 看这个容器分到的 IP**

```bash
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-net-web
```

本机：

```text
172.17.0.4
```

**怎么读**：`172.17.0.4` 落在上面的地址池 `172.17.0.0/16` 里——等于 **从池子里领到的一个工位号**。说明它挂在默认 bridge 上。  
这是**引擎内部的私有 IP**，不是 Windows 宿主机的局域网 IP，也不是公网 IP。别的机器通常不能直接访问 `172.17.0.4`，所以才需要 `-p` 在宿主机上「开一扇门」。

**④ 进容器看网卡和路由（和上面数字对上）**

```bash
docker exec lab-net-web sh -c 'ip -4 addr show eth0; ip route'
```

本机（节选）：

```text
inet 172.17.0.4/16 … scope global eth0
default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 scope link  src 172.17.0.4
```

**怎么读**：

| 输出 | 含义 |
|------|------|
| `inet 172.17.0.4/16 … eth0` | 容器里的网卡叫 `eth0`，地址就是刚才 `inspect` 到的 |
| `default via 172.17.0.1` | 默认路由指向网关 = docker0；出网先送到网桥再 NAT |
| `172.17.0.0/16 … link` | 同网段（别的默认 bridge 容器）直接二层可达，不必绕网关 |

**⑤ 从本机验收端口映射**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:18080/
```

本机：`HTTP 200`。

**怎么读**：

- 你访问的是 **本机/引擎的 18080**，不是容器 IP 的 80  
- 返回 `200` 说明：映射规则生效 → 流量进了容器 → Nginx 正常响应  
- Windows 侧访问 `localhost:18080` 时流量由 WSL 转发进引擎；日常记住「映射的是引擎端口 → 容器端口」即可  

**验收**：`inspect` 有 IP；容器默认路由指向 `172.17.0.1`；`-p` 后 `curl` 返回 200。

### 3.3 同默认 bridge：IP 能通，容器名不通

**要查什么**：两个都挂在默认 `bridge` 上的容器，用 IP 能不能通？用**容器名**当主机名能不能通？

**① 再起一个 Redis，并查它的 IP**

```bash
docker run -d --name lab-net-db redis:alpine
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-net-db
```

本机：`172.17.0.5`。

**怎么读**：和 Web 一样落在 `172.17.0.0/16`，所以理论上同网段应能 ping 通。

**② 用 IP ping（期望成功）**

```bash
docker exec lab-net-web ping -c 2 172.17.0.5
```

本机：

```text
2 packets transmitted, 2 packets received, 0% packet loss
```

**怎么读**：`0% packet loss` = 同默认 bridge 上 **按 IP 互通**成立。Web 配置里如果写 `172.17.0.5:6379`，此刻能通，但容器一重建 IP 可能变。

**③ 用容器名 ping（期望失败）**

```bash
docker exec lab-net-web ping -c 1 lab-net-db
```

本机：`ping: bad address 'lab-net-db'`。

**怎么读**：`bad address` = **名字解析失败**，不是「网络线断了」。默认名为 `bridge` 的网络**不提供**「容器名 → IP」的内置 DNS（历史行为）。所以 Web 里写 `lab-net-db` 或 `localhost` 都会错：前者解析不到，后者指向 Web 自己。

**结论**：

- 默认 `bridge`：同网段 **IP 互通**  
- 默认 `bridge`：**没有**容器名 DNS  
- 生产/开发多容器：不要写死 `172.17.0.x`，改用下一节自定义网络  

### 3.4 端口映射在干什么：DNAT、写法全集与防火墙

`-p 18080:80` 在引擎侧做 **DNAT**：访问 `18080` → 转到 `172.17.0.4:80`。这行的两侧抓包拆解（DNAT 规则真身、回程怎么找到容器）见 [《NAT 白话拆解》](/Linux/basics/linux-04-nat)。

#### 3.4.1 `-p` 写法全集

| 写法 | 效果 | 本机验证 |
|------|------|----------|
| `-p 18080:80` | 绑**所有**地址的 18080 | 第三节 `curl 127.0.0.1:18080` → 200 |
| `-p 127.0.0.1:18081:80` | **只绑回环**，其它地址进不来 | 下面实测 |
| `-p 18086:53/udp` | 映射 **UDP**（DNS 之类记得加，缺省按 TCP） | 下面实测 |
| `-p 18083-18085:80-82` | **范围**映射（宿主与容器段等长一一对应） | 下面实测 |
| `-P`（大写） | 自动分配**随机**宿主端口（32768 起） | 下面实测 |

**实测一：只绑回环**（安全基本款——数据库、管理台只许本机访问时用）：

```bash
$ docker run -d --name lab-pub-loop -p 127.0.0.1:18081:80 nginx:alpine

$ curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:18081/
HTTP 200

$ curl -s -m 3 -o /dev/null -w "HTTP %{http_code}\n" http://172.22.212.111:18081/ || echo "connection failed"
HTTP 000
connection failed

$ ss -tln | grep 18081
LISTEN 0      4096       127.0.0.1:18081      0.0.0.0:*
```

**怎么读**：`ss` 显示监听地址是 `127.0.0.1:18081` 而不是 `0.0.0.0`——**门只开在本机回环上**，从 eth0 的地址敲门（`HTTP 000` = 连接建立失败）被拒之门外，符合预期。对比 `docker port lab-net-web` 的 `0.0.0.0:18080`（全网卡可达），两种写法的差别一目了然。

**谁在监听？——docker-proxy**。上面 `ss` 里守着 `127.0.0.1:18081` 的不是 Nginx（它在容器里），是宿主机上的**用户态代理进程 docker-proxy**。每个 `-p` 映射都会伴生一个（IPv4/IPv6 各一，看 `lab-net-web` 的实测）：

```bash
$ ss -tlnp | grep 18080
LISTEN 0      4096    0.0.0.0:18080    0.0.0.0:*    users:(("docker-proxy",pid=5337,fd=7))
LISTEN 0      4096       [::]:18080       [::]:*   users:(("docker-proxy",pid=5344,fd=7))
```

外部流量走 iptables DNAT（内核态，快）；docker-proxy 兜 netfilter 够不着的场景——最典型的就是**回环访问**：实测一里 `curl 127.0.0.1:18081` 能通，正是它在用户态把流量转进容器。多一跳用户态转发有开销，性能敏感可在 daemon.json 里 `"userland-proxy": false` 关掉（需重启引擎，本文不实操）。

**实测二：UDP、范围与 `-P`**（`docker port` 一次看全）：

```bash
$ docker run -d --name lab-pub-range -p 18083-18085:80-82 -p 18086:53/udp nginx:alpine

$ docker port lab-pub-range
53/udp -> 0.0.0.0:18086
53/udp -> [::]:18086
80/tcp -> 0.0.0.0:18083
80/tcp -> [::]:18083
81/tcp -> 0.0.0.0:18084
81/tcp -> [::]:18084
82/tcp -> 0.0.0.0:18085
82/tcp -> [::]:18085

$ docker run -d --name lab-pub-rand -P nginx:alpine

$ docker port lab-pub-rand
80/tcp -> 0.0.0.0:32768
80/tcp -> [::]:32768
```

**怎么读**：范围映射按位对应（80→18083、81→18084、82→18085）；`-P` 从 32768 起自动挑端口，适合「临时起一批服务」；`docker port 容器名` 随时查实际映射，巡检脚本常用。

> ⚠️ **host 模式下 `-p` 会被直接丢弃**——不是报错，是一条警告加容器照跑（实测原文）：
> ```text
> WARNING: Published ports are discarded when using host network mode
> ```
> host 模式里「映射」这个概念本身不存在（容器端口就是主机端口），见第六节。

#### 3.4.2 防火墙与 28.x 的默认加固

Docker 的端口规则全写在 iptables 里，其中有一条链**专门留给用户**：`DOCKER-USER`。容器进出的流量先过它、再走 Docker 自己的规则——「限制某些容器只能被哪些网段访问」的企业防火墙规则就挂在这里（本机实测，默认是空的，等你来写）：

```bash
$ iptables -L DOCKER-USER -n
Chain DOCKER-USER (1 references)
num  target     prot opt source               destination
```

另外，Docker 28 起网络默认行为整体**收紧**（官方称 hardening）。升级后「感觉容器网络变了」不是错觉，三项最常碰到：

- 容器网卡的 **MAC 地址随机生成**（此前可由容器 IP 推出，有被追踪风险；本机 bridge 容器实测 MAC 就是随机值）
- **未经 `-p` 发布的端口，外部直连路由被默认阻断**（旧版 filter 表 FORWARD 放行时，知道容器 IP 就能直达任意端口）；确有直连需求要用网络选项 `gateway_mode_ipv[46]=nat-unprotected` 显式放开
- 28.3.3 修复 CVE-2025-54388：firewalld reload 后，原本只绑回环的端口会被局域网直达

细节见 [Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/) 与 [28.x release notes](https://docs.docker.com/engine/release-notes/28/)。

---

## 四、自定义 bridge + 容器名 DNS（多容器推荐）

### 4.1 是什么 / 为什么

**是什么**：你自己 `docker network create` 出来的 **user-defined bridge**。挂在同一自定义网络上的容器，Docker 内置 DNS（容器里常见 `127.0.0.11`）会把 **容器名** 解析成当前 IP。

**为什么**：解决「别写死 IP」；也是后面 Compose 里服务名互访的同一套机制（[第 13 篇](/云原生/docker/docker-13-compose)）。

### 4.2 怎么做（本机实测）

**要查什么**：接上自定义网络后，能否用**容器名** ping 通？DNS 是不是 Docker 嵌入的 `127.0.0.11`？

**① 建网并把两个容器接上去**

```bash
docker network create -d bridge lab-app-net
docker network connect lab-app-net lab-net-web
docker network connect lab-app-net lab-net-db
```

| 命令 | 干什么 |
|------|--------|
| `network create -d bridge …` | 新建一个用户自定义 bridge（另有自己的网段，本机后面看到是 `172.21.0.0/16`） |
| `network connect …` | 让**已在跑**的容器多挂一张网（也可创建时就 `--network lab-app-net`） |

**② 用容器名 ping**

```bash
docker exec lab-net-web ping -c 2 lab-net-db
```

本机：

```text
--- lab-net-db ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
```

**怎么读**：和上一节对比——同样两个容器，换到自定义网络后，**名字就能通**。应用连接串应写 `lab-net-db:6379`（或 Compose 里的服务名），而不是 `localhost`、也不是写死 IP。

**③ 看 DNS 谁在回答**

```bash
docker exec lab-net-web nslookup lab-net-db 127.0.0.11
```

本机：

```text
Server:		127.0.0.11
Address:	127.0.0.11:53
Name:	lab-net-db
Address: 172.21.0.3
```

**怎么读**：

| 行 | 含义 |
|----|------|
| `Server: 127.0.0.11` | 问的是容器里的 **Docker 嵌入 DNS**，不是公网 DNS |
| `Name: lab-net-db` / `Address: 172.21.0.3` | 名字解析到自定义网络上的 IP（注意：这是 **lab-app-net** 上的地址，可以和默认 bridge 上的 `172.17.0.5` 不同——同一容器可以挂多张网、有多个 IP） |

**④ 确认自定义网络自身的网段**

```bash
docker network inspect lab-app-net --format \
  'Subnet={{(index .IPAM.Config 0).Subnet}} Containers={{len .Containers}}'
```

本机：`Subnet=172.21.0.0/16 Containers=2`。

**怎么读**：`Containers=2` 表示当前有两个容器挂在这张网上；`172.21.0.0/16` 是这张网自己的地址池，与默认 `172.17.0.0/16` 分开。

**验收**：`ping 容器名` 成功；`nslookup` 的 Server 是 `127.0.0.11`。

> 🔑 **默认 bridge vs 自定义 bridge**：前者主要靠 IP；后者有容器名 DNS。单机多容器通信，优先自定义网络（或 Compose 默认创建的项目网络）。

### 4.3 `--link`（历史，不推荐）

老资料里的 `--link` 会在 `/etc/hosts` 注入单向解析，官方已不推荐。新项目用自定义网络即可；遇到老脚本知道它是什么就行。它的遗产也正在正式退场：28.4 起 legacy links 相关的环境变量兼容已标记废弃，计划 v30 移除（[28.x release notes](https://docs.docker.com/engine/release-notes/28/)）。

### 4.4 DNS 到底怎么配：两套机制与四个旗标

第三节看到「默认 bridge 容器名不通」，根子是两套 DNS 机制（同一台机器实测对比）：

| | 默认 bridge | 自定义网络 |
|---|---|---|
| `/etc/resolv.conf` 写谁 | **照抄宿主机**的 nameserver | **`127.0.0.11`**（Docker 嵌入式 DNS） |
| 容器名解析 | ❌ 无 | ✅ 有 |
| 查外部域名 | 容器直接问宿主的 DNS | 先问 `127.0.0.11`，由它**转发**给宿主配置的上游 |

```bash
$ docker run --rm busybox cat /etc/resolv.conf
nameserver 172.22.208.1
# Based on host file: '/etc/resolv.conf' (legacy)   ← 「抄宿主的」

$ docker run --rm --network lab-alias-net busybox cat /etc/resolv.conf
nameserver 127.0.0.11
options ndots:0
# ExtServers: [host(172.22.208.1)]   ← 嵌入式 DNS 的上游，正是宿主那台
```

（`172.22.208.1` 是本机 WSL 宿主的 DNS；注释行是 Docker 生成文件时写进去的说明。）

要改容器的 DNS 行为，`docker run` 有四个旗标：

| 旗标 | 干什么 |
|------|--------|
| `--dns 223.5.5.5` | 指定 DNS 服务器（可写多个） |
| `--dns-search example.com` | 非全限定主机名的搜索域 |
| `--dns-opt ndots:2` | 透传 resolv.conf 选项 |
| `--hostname mybox` | 容器自见的主机名（默认是容器 ID） |

实测前两个一起用：

```bash
$ docker run --rm --dns 223.5.5.5 --hostname mybox busybox sh -c 'cat /etc/resolv.conf; hostname'
nameserver 223.5.5.5
mybox
```

> 配套还有 `--add-host 名字:IP`：往容器 `/etc/hosts` 追加条目（地址写 `host-gateway` 可拿到宿主地址）。另一条 28.0 起的行为变化：宿主 resolv.conf 里的 nameserver 一律从**宿主网络命名空间**访问，容器侧本地 DNS 代理不再被绕路。

### 4.5 网段从哪来：地址池、自选子网与 IPv6

4.2 节的自定义网络拿到 `172.21.0.0/16`——谁分的？不写 `--subnet` 时，Docker 从**默认地址池**顺序切网段（实测连建两张）：

```bash
$ docker network create lab-pool-1 && docker network create lab-pool-2

$ docker network inspect lab-pool-1 lab-pool-2 --format '{{.Name}}: {{(index .IPAM.Config 0).Subnet}}'
lab-pool-1: 172.27.0.0/16
lab-pool-2: 172.28.0.0/16
```

默认池等价于 `daemon.json` 里这段（官方文档）：

```json
{
  "default-address-pools": [
    { "base": "172.17.0.0/12", "size": 16 },
    { "base": "192.168.0.0/16", "size": 20 }
  ]
}
```

`base` 是可切的总范围，`size` 是每张网切多长：默认从 `172.17.0.0/12` 切 `/16`——其中 172.17 已归 docker0，自定义网络从 172.18 往后排，`/12` 总共也就十几张；不够就轮到 192.168 池（切 `/20`）。**报「pool exhausted」建不了网时，把 `size` 调小**（如 24）就能扩出几百张。改 `daemon.json` 要重启引擎，本文不实操。

两个本机实测细节：

- **分配会避开宿主已用前缀**：本机 `/16` 分配一路跳过 `172.22`——因为宿主 `eth0` 是 `172.22.212.111/20`，占了这段
- **29.0 新写法**：`--subnet` 地址写 0、只给前缀长度，即「从池里要一个指定大小的网段」。实测 `--subnet 0.0.0.0/24` 拿到了 `172.22.0.0/24`——`/24` 与宿主那个 `/20` 不冲突，这段就能用：

```bash
$ docker network create --subnet 0.0.0.0/24 lab-unspec

$ docker network inspect lab-unspec --format '{{(index .IPAM.Config 0).Subnet}}'
172.22.0.0/24
```

> 此写法 Docker 29.0.0 引入；官方注明降级到旧版后这样建的网会不可用。

**IPv6**：`docker network create --ipv6 ...` 开启，子网不指定时自动从 ULA 前缀分配；28.0 起还可用 `--ipv4=false` 建**纯 IPv6** 网络。嵌入式 DNS 没有对应 IPv6 地址——`127.0.0.11` 这个 IPv4 地址在 IPv6-only 容器里照常工作。本篇实验网均为 IPv4，IPv6 实操见[官方 Networking 文档的 IPv6 章节](https://docs.docker.com/engine/network/)。

### 4.6 给容器指定固定 IP：`--ip`

自动分配的 IP 重启会变；遗留系统写死地址时，就得把号钉住。前提：**IP 必须落在该网络的子网内**——所以实操套路是「建网时显式给子网 + 起容器时给 IP」：

```bash
$ docker network create --subnet 172.30.0.0/16 lab-fixed-net

$ docker run -d --name lab-fixed-1 --network lab-fixed-net --ip 172.30.0.10 \
    alpine:3.21 sleep infinity

$ docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-fixed-1
172.30.0.10
```

给了子网外的地址直接被拒（实测报错原文）：

```bash
$ docker run --rm --network lab-fixed-net --ip 192.168.50.10 alpine:3.21 true
docker: Error response from daemon: invalid config for network lab-fixed-net: invalid endpoint settings:
no configured subnet contains IP address 192.168.50.10
```

运行中的容器补固定 IP 用 `docker network connect --ip`（和 4.2 节的「后挂网」同一姿势）：

```bash
$ docker run -d --name lab-fixed-2 alpine:3.21 sleep infinity      # 先起在默认 bridge
$ docker network connect --ip 172.30.0.11 lab-fixed-net lab-fixed-2

$ docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}={{$v.IPAddress}} {{end}}' lab-fixed-2
bridge=172.17.0.5 lab-fixed-net=172.30.0.11
```

**怎么读**：`lab-fixed-2` 两张网各一个号，固定号只在 `--subnet` 明确的那张网上有效。

> 🔑 **固定 IP 是给遗留系统的迁就，不是推荐架构**——新应用一律用容器名/别名（DNS 自动跟随拓扑变化），官方文档也是这个取向。

---

## 五、多网络、别名与网络分区（实测）

4.2 节里 `lab-net-web` 同时挂了默认 bridge 和自定义网、拿到两个 IP——「一个容器多张网卡」是正式能力，本节补齐三件配套工具。

### 5.1 `gw-priority`：多张网，默认网关听谁的

容器挂多张网时 `default via ...` 只能有一条，Docker 自己挑，且网络增减时会变。要固定，用 28.0 新增的 `gw-priority`（数字大者优先，默认 0）——注意它只能走 `--network` 的**长语法**：

```bash
$ docker network create lab-gw-a && docker network create lab-gw-b

$ docker run -d --name lab-gw-demo \
    --network name=lab-gw-a \
    --network name=lab-gw-b,gw-priority=1 \
    alpine:3.21 sleep infinity

$ docker exec lab-gw-demo ip route
default via 172.26.0.1 dev eth0
172.25.0.0/16 dev eth1 scope link  src 172.25.0.2
172.26.0.0/16 dev eth0 scope link  src 172.26.0.2
```

**怎么读**：容器里 `eth0`/`eth1` 两张网卡；`default via 172.26.0.1` 走的是 `lab-gw-b`（172.26.0.0/16，优先级 1），另一张降级为普通直连。场景：一张网上外网、一张连内网，想让出网固定走某张时用。

### 5.2 `--network-alias`：网络里的「外号」

容器名全局唯一，但同一网络内可以用**别名**互称——Compose 里 `network_aliases:` 的底层就是它。实测一个容器挂两个别名：

```bash
$ docker run -d --name lab-alias-1 --network lab-alias-net \
    --network-alias db.local --network-alias cache alpine:3.21 sleep infinity

$ docker run --rm --network lab-alias-net busybox nslookup db.local 127.0.0.11
Server:		127.0.0.11
Address:	127.0.0.11:53

Non-authoritative answer:
Name:	db.local
Address: 172.24.0.2
```

（`cache` 同样解析到 `172.24.0.2`。）

「一组容器共享同一个别名」是更有用的形态——嵌入式 DNS 会把**所有成员**都报出来（实测）：

```bash
$ docker run -d --name lab-rr-1 --network lab-rr-net --network-alias web.local alpine:3.21 sleep infinity
$ docker run -d --name lab-rr-2 --network lab-rr-net --network-alias web.local alpine:3.21 sleep infinity

$ docker run --rm --network lab-rr-net busybox nslookup web.local 127.0.0.11
Server:		127.0.0.11
Address:	127.0.0.11:53

Non-authoritative answer:
Name:	web.local
Address: 172.21.0.3
Name:	web.local
Address: 172.21.0.2
```

**怎么读**：一次查询返回**两条** A 记录——嵌入式 DNS 对同别名成员轮询（round-robin），客户端每次从中取一个，等于最朴素的负载均衡。这也坐实了开头那句用法：一组「都提供 db 服务」的容器共享别名 `db.local`，客户端连别名——加副本就是多一条解析记录，客户端配置一个字不用改。

### 5.3 `--internal`：不给出口的「纯内网」

`--internal` 建的网**不接外网**：容器没有默认路由、没有出网 NAT，只有同网互访。数据库、缓存这类「根本不该自己上网」的服务用它做分区（官方文档的示例拓扑正是「前端普通网 + 后端 internal 网」）。实测：

```bash
$ docker network create --internal lab-int-net

$ docker network inspect lab-int-net --format \
  'Internal={{.Internal}} Subnet={{(index .IPAM.Config 0).Subnet}}'
Internal=true Subnet=172.21.0.0/16

$ docker run -d --name lab-int-1 --network lab-int-net alpine:3.21 sleep infinity
$ docker run -d --name lab-int-2 --network lab-int-net alpine:3.21 sleep infinity

$ docker exec lab-int-1 ip route
172.21.0.0/16 dev eth0 scope link  src 172.21.0.2

$ docker exec lab-int-1 ping -c 2 lab-int-2
2 packets transmitted, 2 packets received, 0% packet loss

$ docker exec lab-int-1 ping -c 2 223.5.5.5
ping: sendto: Network unreachable
```

**怎么读**：路由表里**没有 `default via`**——内核不知道外网包往哪送，直接报 `Network unreachable`（不是丢包超时，是干脆没有路）。隔离做在路由层，比一层层防火墙规则更干脆。

**验收**：`Internal=true`；容器路由表无 default；同网 ping 通、出网 `Network unreachable`。

---

## 六、host 模式

### 6.1 是什么 / 为什么 / 怎么做

**是什么**：容器与 **引擎宿主机** 共享 Network Namespace——不配独立容器 IP，直接用主机网络栈。

**为什么**：少一层 veth/NAT，延迟更低；适合对网络极敏感、且能接受「和主机抢端口」的场景（如部分监控 agent）。

**要查什么**：`--network host` 之后，容器里看到的网卡是不是「整台引擎」的，而不再是单独的 `172.17.0.x`？

```bash
docker run -d --name lab-net-host --network host nginx:alpine
docker exec lab-net-host ip -4 addr
```

本机（节选）：

```text
inet 172.22.212.111/20 … eth0
inet 172.17.0.1/16 … docker0
```

**怎么读**：

| 你看到的 | 含义 |
|----------|------|
| 出现引擎的 `eth0`、`docker0`、各种 `br-…` | 容器**没有**自己那份隔离网卡视图，看到的就是主机网络栈 |
| `172.22.212.111` | WSL 虚拟机的地址，**不是**你办公室 Windows 网卡 IP |
| 看不到单独的 `172.17.0.x` 容器 IP | 正常：host 模式本来就不给容器再分一份 bridge IP |

### 6.2 取舍与 WSL2 差异

| | |
|--|--|
| 优点 | 无 NAT；端口即主机端口 |
| 缺点 | **无端口隔离**；隔离性最弱；容器名 DNS 等「Docker 网络能力」也不走这套 |
| WSL2 | `host` 共享的是 **WSL 虚拟机**的网络栈，不是 Windows 主机网卡（见[官方 host driver](https://docs.docker.com/engine/network/drivers/host/)） |

适用：明确需要共享主机网络、并接受上述代价时。日常 Web/DB **不要**默认用 host。

---

## 七、none 模式

**是什么**：仍有独立 Network Namespace，但 **不创建 veth、不配 IP**，通常只剩 `lo`。

**为什么**：极端隔离、离线计算、或你要自己手动往 namespace 里塞网卡时。

**要查什么**：`--network none` 后是不是真的「没网」——只有回环、没有 `eth0`？

```bash
docker run -d --name lab-net-none --network none alpine:3.21 sleep infinity
docker exec lab-net-none sh -c 'ip -4 addr; ip route'
```

本机：只有 `127.0.0.1/8` 的 `lo`，路由表为空。

**怎么读**：

| 现象 | 含义 |
|------|------|
| 只有 `lo` | 没有接到 docker0 的 veth，故无 `eth0` |
| 路由表空 | 没有默认网关，容器访问不了其它容器，也出不了网 |
| 仍有独立 namespace | 和「没有 namespace」不同；只是这份世界里没配对外接口 |

**验收**：无 `eth0`、无容器 IP、出不了网。

---

## 八、container 模式（共享另一个容器的网络栈）

### 8.1 是什么 / 为什么

**是什么**：`--network container:NAME`——与 **指定容器** 共享同一 Network Namespace（不是与宿主机）。

**为什么**：两个容器可以用 **`localhost` 互访**（类似 Kubernetes 同 Pod 多容器 / Sidecar）。

### 8.2 怎么做（本机实测）

**要查什么**：共享网络后，第二个容器是否不再单独占一张网？在它里面访问 `127.0.0.1` 是否等于打到第一个容器的端口？

```bash
docker run -d --name lab-net-s1 nginx:alpine
docker run -d --name lab-net-s2 --network container:lab-net-s1 alpine:3.21 sleep infinity

docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-net-s1
docker inspect -f '{{json .NetworkSettings.Networks}}' lab-net-s2
docker exec lab-net-s2 wget -qO- http://127.0.0.1/ | head -c 80
```

本机：

- `lab-net-s1` IP：`172.17.0.6`（自己挂在默认 bridge）  
- `lab-net-s2` 的 `Networks`：`{}`  
- `wget http://127.0.0.1/` 返回 Nginx 欢迎页 HTML 开头  

**怎么读**：

| 结果 | 含义 |
|------|------|
| s1 有 `172.17.0.6` | 真正「占网」的是 s1；对外 IP/端口都算在它头上 |
| s2 的 `Networks` 为 `{}` | s2 **没有**自己的网络端点，复用 s1 的 namespace |
| s2 里 `wget 127.0.0.1` 得到 Nginx | s2 的 `localhost` = s1 的 `localhost`；Nginx 在 s1 里听 80，所以通 |

**验收**：共享栈的容器里，访问 `127.0.0.1` 就是「被共享的那个容器」在听的端口。

> ⚠️ **container: 模式下这些旗标不可用**（官方明列）：`--hostname`、`--dns`、`--dns-search`、`--dns-option`、`--publish`、`--publish-all`、`--expose`、`--add-host`、`--mac-address`——网络配置属于「被共享的那个容器」，跟班容器说了不算。实测报错原文：
> ```text
> docker: Error response from daemon: conflicting options: hostname and the network mode
> docker: Error response from daemon: conflicting options: port publishing and the container type network mode
> ```
> 要改主机名、要发布端口，去改 `lab-net-s1`（占网的那个）。

---

## 九、overlay 模式（跨主机覆盖网络）——展开

### 9.1 是什么

**Overlay** 在已有物理/云网络之上，用隧道（常见 **VXLAN**）再铺一层逻辑网络，让 **不同主机上的容器** 像在同一二层/三层网段里通信。

官方定位：主要服务 **Swarm 服务**；加 `--attachable` 后，**独立 `docker run` 的容器** 也能加入（见 [overlay driver](https://docs.docker.com/engine/network/drivers/overlay/)）。

### 9.2 为什么需要它

| 只用 bridge | 上了 overlay |
|-------------|--------------|
| 网络是 **local** scope，出不了本机 | 网络是 **swarm** scope，可跨节点 |
| 跨主机要靠对外 `-p`、额外路由或 K8s CNI | 容器名 / 服务名可在 overlay 上解析互通 |
| 单机开发够用 | 多机 Swarm、部分迁移期架构会用到 |

今天很多人跨主机直接上 Kubernetes CNI；但理解 overlay，有助于读 Swarm 文档、排「多机容器互通」类问题。

### 9.3 怎么做（本机单节点 Swarm 实测）

> 单节点也能练：先 `swarm init`，再创建 **attachable** overlay，两容器用名字 ping。练完请 `docker swarm leave --force`，避免本机一直留在 Swarm 状态。

**要查什么**：overlay 网络的 `Scope` 是否为 `swarm`？同一 overlay 上两个容器能否用**名字** ping 通？

```bash
# 若 Swarm 为 inactive
docker swarm init --advertise-addr 127.0.0.1

docker network create --driver overlay --attachable lab-overlay-net

docker run -d --name lab-ov-1 --network lab-overlay-net alpine:3.21 sleep infinity
docker run -d --name lab-ov-2 --network lab-overlay-net alpine:3.21 sleep infinity

docker exec lab-ov-1 ping -c 2 lab-ov-2
docker network inspect lab-overlay-net --format \
  'Driver={{.Driver}} Scope={{.Scope}} Subnet={{(index .IPAM.Config 0).Subnet}}'
```

本机：

```text
Swarm initialized: current node (…) is now a manager.
…
2 packets transmitted, 2 packets received, 0% packet loss
Driver=overlay Scope=swarm Subnet=10.0.1.0/24
```

**怎么读**：

| 输出 / 参数 | 含义 |
|-------------|------|
| `swarm init` 成功 | 本机成为 Swarm manager；没有这一步，一般建不出 overlay |
| `--attachable` | 允许普通 `docker run` 容器加入（否则多留给 Swarm Service） |
| `ping lab-ov-2` 成功 | overlay 上也有名字解析；单节点时隧道是「退化」的，但 API/行为与多机一致 |
| `Driver=overlay` | 确认不是 bridge |
| `Scope=swarm` | **关键**：集群范围网络，不是 `local` |
| `Subnet=10.0.1.0/24` | overlay 自己的地址池（本机此次分配；你机器上可能不同） |

**验收**：`Scope=swarm`；两容器可用 **名字** ping 通。

多机时：其它节点 `docker swarm join …`，同一 overlay 上的任务/attachable 容器即可跨主机互通（需放行 Swarm/VXLAN 相关端口，以当前官方 Swarm 文档为准）。

### 9.4 关键概念（背景知识）

| 概念 | 含义 |
|------|------|
| **ingress** | Swarm 默认的路由网格相关 overlay（发布服务端口时会碰到） |
| **docker_gwbridge** | 节点上连接 overlay 与宿主对外通信的网桥 |
| **`--attachable`** | 允许非 Swarm Service 的普通容器加入 overlay |
| **加密** | 可对 overlay 开启加密选项（有 CPU 开销，按合规需要开启） |

### 9.5 清理 Swarm 实验

```bash
docker rm -f lab-ov-1 lab-ov-2
docker network rm lab-overlay-net
docker swarm leave --force
```

| 命令 | 干什么 |
|------|--------|
| `rm` 容器 / `network rm` | 删实验对象 |
| `swarm leave --force` | 单节点强制退出 Swarm，避免本机一直停在 `active` |

本机实验后已 `leave`，Swarm 回到 `inactive`。

---

## 十、macvlan 模式——展开

### 10.1 是什么

**macvlan** 让容器拥有 **独立 MAC 地址**，在二层上像「插在交换机上的另一台机器」：

- 指定宿主机一块 **parent** 网卡（如 `eth0`）  
- 容器从你规划的子网拿 IP  
- 流量走 macvlan 子接口，**不经过 docker0 那套 NAT 路径**（拓扑更「像物理机」）

### 10.2 为什么用 / 为什么慎用

**为什么用**：

- 需要容器在局域网里呈现为独立设备（监控、传统网络设备对接、部分 IDC 规范）  
- 想减少 bridge + NAT 路径上的开销  

**为什么慎用**：

- 官方经典限制：**宿主机与 macvlan 容器通常不能直接用 IP 互访**（要额外子接口或路由技巧）  
- 依赖真实二层环境；地址规划、网关、VLAN 都要和网络同事对齐  
- **WSL2 / 云主机**：parent 往往是虚拟 `eth0`，容器能起来、能拿到 IP，但 **不等于** 已经出现在你办公室 LAN 的交换机上  

### 10.3 怎么做（本机实测）

**要查什么**：能否用 `macvlan` 驱动建网？容器是否拿到你规划的子网地址？`parent` 是否指向预期网卡？

```bash
# parent 选引擎里的业务网卡；本机候选为 eth0
docker network create -d macvlan \
  --subnet=192.168.200.0/24 \
  --gateway=192.168.200.1 \
  -o parent=eth0 \
  lab-macvlan-net

docker run -d --name lab-mac-1 --network lab-macvlan-net alpine:3.21 sleep infinity

docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-mac-1
docker network inspect lab-macvlan-net --format \
  'Driver={{.Driver}} Parent={{index .Options "parent"}}'
```

本机：

```text
mac IP=192.168.200.2
Driver=macvlan Parent=eth0
```

**怎么读**：

| 字段 / 值 | 含义 |
|-----------|------|
| `--subnet` / `--gateway` | 你**人为规划**的地址空间；必须和真实二层匹配，学习环境可先用独立网段避免撞现网 |
| `-o parent=eth0` | 从哪块宿主机（引擎）网卡「派生」出 macvlan |
| `192.168.200.2` | 容器拿到的地址，落在你设的 `/24` 里 → 建网成功 |
| `Driver=macvlan` | 确认不是 bridge/overlay |
| `Parent=eth0` | 与创建时指定一致 |

**验收（引擎内）**：`Driver=macvlan`，容器拿到规划子网内 IP。

**验收（真实 LAN）**：到同网段其它机器上 `ping` 该 IP——取决于物理/云网络；**WSL2 学习环境经常 ping 不通网关或局域网**，属环境限制，不代表命令写错。

### 10.4 常见模式与注意点

| 点 | 说明 |
|----|------|
| **bridge 模式 macvlan** | 最常见：同一 parent 下的 macvlan 网络内容器互通 |
| **子网规划** | `--subnet` / `--gateway` 必须与 parent 所在二层匹配，避免和现网冲突 |
| **主机访问容器** | 默认困难；生产若必须，按官方文档做 macvlan 子接口，而不是指望 docker0 |
| **云上** | 许多云厂商对杂散 MAC 有限制；受限时换 ipvlan（下一节），别硬扛 |

```bash
docker rm -f lab-mac-1
docker network rm lab-macvlan-net
```

---

## 十一、ipvlan 模式——macvlan 的兄弟（实测）

### 11.1 是什么

和 macvlan 一样「不走 docker0、直接从宿主网卡派生」，差别在**二层身份**——ipvlan 的容器**共用父接口的 MAC**，交换机眼里始终只有宿主机一台设备。

| | macvlan | ipvlan |
|---|---------|--------|
| 容器二层身份 | **独立 MAC**（交换机眼里另一台机器） | **共用父接口 MAC** |
| 常用模式 | bridge | `l2`（默认）/ `l3`（宿主机当路由器，无广播） |
| 云上可用性 | 多数云**禁止**杂散 MAC | 通常可行——ipvlan 的主场景 |
| 经典限制 | 宿主机与容器默认不能互访 | 同样默认不能互访（设计使然） |

这个差别不是文档空话，本机三方实测（建网：`docker network create -d ipvlan -o parent=eth0 --subnet 192.168.210.0/24 --gateway 192.168.210.1 lab-ipv-p`）：

```bash
$ docker run --rm busybox ip link show eth0 | awk '/ether/{print $2}'
7e:f4:e9:ae:a6:7a                          # bridge 容器：随机 MAC（28.0+ 行为）

$ docker run --rm --network lab-ipv-p busybox ip link show eth0 | awk '/ether/{print $2}'
00:15:5d:94:91:57                          # ipvlan 容器

$ ip link show eth0 | awk '/ether/{print $2}'
00:15:5d:94:91:57                          # 宿主机 eth0——和 ipvlan 容器一字不差
```

### 11.2 为什么 / 什么时候选它

- 云或虚拟化平台**不给每容器一个 MAC**（端口安全策略）时，ipvlan 是 macvlan 的正解
- `l3` 模式没有 ARP/广播，规模大、行为可预测（代价：上游网络要有到容器网段的路由）
- 和 macvlan 一样：直连物理网络、低开销、无需 `-p`

### 11.3 怎么做（本机实测）

学习环境可以**不指定 parent**：驱动自建一个 `dummy` 类型接口当父口，网络完全本地化（官方文档明示的行为）：

```bash
$ docker network create -d ipvlan \
    --subnet 192.168.210.0/24 --gateway 192.168.210.1 lab-ipvlan-net

$ docker run -d --name lab-ipv-1 --network lab-ipvlan-net alpine:3.21 sleep infinity
$ docker run -d --name lab-ipv-2 --network lab-ipvlan-net alpine:3.21 sleep infinity

$ docker network inspect lab-ipvlan-net --format 'Driver={{.Driver}} Parent={{index .Options "parent"}}'
Driver=ipvlan Parent=

$ docker exec lab-ipv-1 ip -4 addr show eth0
    inet 192.168.210.2/24 brd 192.168.210.255 scope global eth0

$ docker exec lab-ipv-1 ping -c 2 lab-ipv-2
2 packets transmitted, 2 packets received, 0% packet loss
```

**怎么读**：流程与 macvlan 实验几乎同形（建网 → 拿规划子网内 IP → 同网互 ping 通），差别全在二层身份。注意无 parent 时容器共享的是 dummy 父口的 MAC、不是宿主 eth0 的——验证「真共享」要像 11.1 那样指定 `-o parent=eth0`。

生产接真实网络：`-o parent=eth0`（或 VLAN 子接口 `eth0.10`，Docker 自动建删）、`-o ipvlan_mode=l2|l3`；子网规划要求与 macvlan 相同——**必须与 parent 所在网络匹配**。

**验收（引擎内）**：`Driver=ipvlan`，容器拿到规划子网内 IP，同网互 ping 通。

---

## 十二、模式选型速查

| 需求 | 推荐 |
|------|------|
| 一般 Web / 数据库，要 `-p` | **bridge**（默认） |
| 多容器用名字互访（单机） | **自定义 bridge**（或 Compose 网络） |
| 后端服务不允许出网 | 自定义 bridge + **`--internal`**（路由层隔离） |
| 极致性能且可共享主机端口 | **host**（慎用；注意 WSL2 语义） |
| Sidecar 与主容器 `localhost` 通信 | **container:** 或日后 K8s Pod |
| 完全断网 | **none** |
| 跨多台 Docker 主机（Swarm 语境） | **overlay** + Swarm（`--attachable` 可挂普通容器） |
| 容器要在二层像物理机（自建机房） | **macvlan**（先确认网络策略） |
| 云/虚拟化上直连网络（禁杂散 MAC） | **ipvlan**（`l2`/`l3`） |

---

## 十三、网络命令速查

下面这张表回答「命令是用来干嘛的」；具体输出解读见上文对应章节。

| 命令 | 干什么 |
|------|--------|
| `docker network ls` | 列出网络：名字 / 驱动 / scope |
| `docker network inspect NAME` | 看网段、网关、挂了哪些容器、驱动选项 |
| `docker network create -d bridge …` | 建自定义 bridge（多容器 DNS 的前提） |
| `docker network create --internal …` | 建无出口的纯内网（后端分区） |
| `docker network create --driver overlay --attachable …` | 建可挂普通容器的 overlay（需 Swarm） |
| `docker network create -d macvlan … -o parent=…` | 建 macvlan |
| `docker network create -d ipvlan … -o parent=… -o ipvlan_mode=l2` | 建 ipvlan（云上替代 macvlan） |
| `docker network connect / disconnect` | 给运行中容器插拔网络 |
| `docker network rm` / `prune` | 删除指定网 / 清理未使用网络 |
| `docker run -p 主机端口:容器端口` | 端口映射（进站；写法全集见 3.4.1） |
| `docker port 容器` | 查看容器实际的端口映射 |
| `docker run --network 名 --ip 172.30.0.10` | 钉固定 IP（必须落在该网子网内） |
| `docker run --network-alias 名字` | 给容器挂网络别名（多容器共享时 DNS 轮询） |
| `docker run --dns … / --hostname …` | 覆盖容器 DNS / 主机名 |
| `docker inspect -f '…IPAddress…'` | 快速取出容器 IP |
| `docker exec … ip addr` / `ip route` / `ping` / `nslookup` | 从容器内部验证网卡、路由、连通、DNS |

```bash
# 查看
docker network ls
docker network ls -f 'driver=bridge'
docker network inspect bridge
docker network inspect lab-app-net

# 创建 / 删除
docker network create -d bridge lab-app-net
docker network create -d bridge --internal lab-int-net
docker network create -d bridge --subnet 192.168.100.0/24 --gateway 192.168.100.1 lab-subnet
docker network create --subnet 0.0.0.0/24 lab-any24        # 29.0+：只要一个 /24，网段让 Docker 挑
docker network create --driver overlay --attachable lab-overlay-net   # 需 Swarm
docker network create -d macvlan --subnet 192.168.200.0/24 --gateway 192.168.200.1 -o parent=eth0 lab-macvlan-net
docker network create -d ipvlan --subnet 192.168.210.0/24 --gateway 192.168.210.1 -o parent=eth0 -o ipvlan_mode=l2 lab-ipvlan-net

docker network rm lab-app-net
docker network prune

# 运行时指定 / 动态插拔 / 多网络
docker run -d --network lab-app-net --name web nginx:alpine
docker run -d --network lab-fixed-net --ip 172.30.0.10 --name db0 alpine:3.21 sleep infinity
docker run -d --network name=lab-gw-a --network name=lab-gw-b,gw-priority=1 alpine:3.21 sleep infinity
docker run -d --network lab-alias-net --network-alias db.local --name db1 alpine:3.21 sleep infinity
docker network connect lab-app-net running_container
docker network disconnect lab-app-net running_container

# 端口
docker port lab-net-web
```

`host` 与 `none` 是内置网络，不要重复 `create`。

---

## 十四、本篇实验清理（可照抄）

若中途打断，统一清掉：

```bash
docker rm -f lab-net-web lab-net-db lab-net-host lab-net-none \
  lab-net-s1 lab-net-s2 lab-ov-1 lab-ov-2 lab-mac-1 lab-ipv-1 lab-ipv-2 \
  lab-pub-loop lab-pub-range lab-pub-rand lab-host-p lab-alias-1 \
  lab-gw-demo lab-int-1 lab-int-2 lab-ct-a lab-fixed-1 lab-fixed-2 \
  lab-rr-1 lab-rr-2 2>/dev/null

docker network rm lab-app-net lab-overlay-net lab-macvlan-net lab-ipvlan-net \
  lab-int-net lab-alias-net lab-gw-a lab-gw-b lab-pool-1 lab-pool-2 \
  lab-unspec lab-ipv-p lab-fixed-net lab-rr-net 2>/dev/null

# 若做过 overlay 实验且不再需要 Swarm：
docker swarm leave --force 2>/dev/null
```

---

## 小结

- 容器默认各自一份 **Network Namespace**：`localhost` 只属于自己。  
- **默认 bridge** = Namespace + veth + docker0 + 分 IP；出网 NAT，进站 `-p`；**无**容器名 DNS。  
- **自定义 bridge**：内置 DNS（`127.0.0.11`），容器名互访——单机多容器首选。两套 DNS 机制：默认 bridge 抄宿主 resolv.conf，自定义网由 127.0.0.11 转发上游；`--dns` / `--hostname` 可覆盖。  
- **端口发布**：`-p 127.0.0.1:…` 只开本机、`-P` 随机、`/udp` 与范围写法；`docker port` 查映射；host 模式下 `-p` 被丢弃。每个 `-p` 伴生一个 **docker-proxy** 用户态代理兜底回环场景。防火墙规则挂 `DOCKER-USER` 链；28 起默认加固（随机 MAC、未发布端口外部直连被阻断）。  
- **网段从哪来**：默认地址池按 `size` 顺序切（`daemon.json` 可调），会避开宿主已用前缀；29.0 支持 `--subnet 0.0.0.0/24` 只要长度不要网段；固定 IP 用 `--ip`（必须在子网内，网段外直接报错）。  
- **多网络**：`gw-priority` 定默认网关；`--network-alias` 网内外号（多容器共享别名时 DNS 轮询返回全部成员）；`--internal` 纯内网（路由表无 default，隔离在路由层）。  
- **host / none / container**：共享主机栈、断网、共享指定容器栈；container: 模式下 `--hostname` / `-p` 等旗标不可用（conflicting options）。  
- **overlay**：看 `Scope=swarm` + 名字 ping；用完 `swarm leave`。  
- **macvlan / ipvlan**：都直连物理网络、无需 `-p`；macvlan 独立 MAC（云上常被禁），ipvlan 共用父口 MAC（实测与宿主 eth0 一字不差）；WSL2 上「能起来」≠「进了办公室 LAN」。  

---

## 思考题

> 1. 默认 bridge 与 user-defined bridge 在「容器名 DNS」上有何区别？若 Web 与 MySQL 已在自定义网络上，应用连接串应写 `localhost`、容器 IP，还是 MySQL 的**容器名**？为什么？
> 2. `-p 127.0.0.1:18081:80` 起的服务，为什么局域网另一台机器访问 `你的IP:18081` 不通？数据库镜像如果不小心用 `-p 3306:3306` 跑在了公司服务器上，比 `--internal` 网络里的数据库多了什么风险？

（提示一：对照第三节 `bad address` 与第四节 `nslookup` / `ping lab-net-db` 的本机结果。提示二：对照 3.4.1 的 `ss` 监听地址与 5.3 的路由表。）

---

## 下篇预告

**第 12 篇：《数据持久化》**

网络打通之后，下一个坑往往是：容器一删，MySQL 数据没了。下一篇讲清 Volume、Bind Mount 与 tmpfs，再接到 Compose 编排。

下一篇见 🐳
