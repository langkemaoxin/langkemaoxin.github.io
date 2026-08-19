---
title: Docker 网络——从 localhost 不通滚到能用名字互访
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
description: 从 Web 连不上隔壁的库开始，每次只加一个因素：默认 bridge、容器名 DNS、端口只绑回环、host/none/container，像滚雪球一样看清 Docker 网络。
---

> **Docker 系列 · 第 11/24 篇**
> 上一篇：[《Harbor 使用——用案例拉取与推送镜像》](/云原生/docker/docker-10-harbor-usage) · 下一篇：[《数据持久化——从容器一删库没了，滚到三种挂载》](/云原生/docker/docker-12-data-persistence)

---

## 开头：Web 里的 localhost，为什么连不上隔壁的库

你把 Web 和 MySQL 拆成两个容器。Web 配置里写 `localhost:3306`，容器起来却连不上库。

根因就一句：**每个容器默认有一份自己的网络世界**——自己的网卡、自己的 IP、自己的 `localhost`。Web 容器里的 `localhost` 只指向 Web 自己，不是隔壁那台库。

本篇不先背模式名词。实验容器始终叫 **`lab-net-web` / `lab-net-db`**，**同一对邻居一路长大**：

| 雪球 | 你加上去的 | 当场能看见的效果 |
|------|------------|------------------|
| **1** | 一个 nginx + `-p 18080:80` | `curl` 本机 200；容器有自己的 IP，`localhost` 只属于它 |
| **2** | 再加一个 redis（仍默认 bridge） | IP 能 ping；`ping lab-net-db` → `bad address` |
| **3** | 自定义网络，把两个容器接上去 | 容器名 ping 通；`nslookup` 的 Server 是 `127.0.0.11` |
| **4** | `-p` 只绑回环 | `127.0.0.1` 通，eth0 地址不通；`ss` 看见 docker-proxy |
| **5** | `--network host` | 这次 `localhost` 通到宿主机服务；`-p` 被丢弃 |
| **6** | `--network none` | 只剩 `lo`，路由表空 |
| **7** | `--network container:` | sidecar 里 `wget 127.0.0.1` 就是隔壁 nginx |
| **8** 🧗 | overlay / macvlan / ipvlan | `Scope=swarm`；独立 MAC vs 共用父口 MAC |
| **9** 🧗 | 多网、别名、`--internal`、地址池、固定 IP、防火墙 | 分区、发号、钉 IP |

第一次读只走 **1～7**。带 🧗 的用到再回头。

> **Docker Desktop**（Windows/Mac）：`docker` / `docker exec` 照做；宿主侧 `ip`、`ss`、`iptables` 跑在 Desktop 内置的 Linux 虚拟机里，你的终端没有——这些段落**看结论跳实操**即可。

输出均来自本机：WSL2 Ubuntu-22.04 + 原生 Docker Engine **29.1.3**（非 Desktop）。`host` / `macvlan` 语境里的「宿主机」指这台 WSL 虚拟机，不是 Windows 本机。官方：[Networking overview](https://docs.docker.com/engine/network/)、[bridge](https://docs.docker.com/engine/network/drivers/bridge/)、[overlay](https://docs.docker.com/engine/network/drivers/overlay/)、[macvlan](https://docs.docker.com/engine/network/drivers/macvlan/)、[ipvlan](https://docs.docker.com/engine/network/drivers/ipvlan/)。

对 `Subnet` / 网关陌生，可先看 [《IP、网段与网关》](/Linux/basics/linux-02-ip-subnet-gateway)；对 NAT 陌生看 [《NAT 白话拆解》](/Linux/basics/linux-04-nat)；想徒手搓 netns 看 [《netns 与 iptables 实操》](/Linux/basics/linux-05-netns-iptables)。

---

## 雪球 1：一个 nginx，先从本机 curl 通

起一个能从宿主机访问的页面。不写 `--network`，自动挂到默认网络 `bridge`：

```bash
docker run -d --name lab-net-web -p 18080:80 nginx:alpine
```

| 参数 | 干什么 |
|------|--------|
| `-d` | 后台跑 |
| `--name lab-net-web` | 后面 `exec` / `inspect` 用 |
| `-p 18080:80` | **引擎** `18080` → **容器内** `80` |

看默认 bridge 划了哪片内网：

```bash
docker network inspect bridge --format \
  'Subnet={{(index .IPAM.Config 0).Subnet}} Gateway={{(index .IPAM.Config 0).Gateway}}'
```

`inspect` 完整输出是一大坨 JSON；`--format` 是挑字段的模板。`index .IPAM.Config 0` = 取网段配置数组的第一项，再取 `.Subnet` / `.Gateway`。全文还会再用，认过这一次即可。

本机：

```text
Subnet=172.17.0.0/16 Gateway=172.17.0.1
```

| 字段 | 本机值 | 白话 |
|------|--------|------|
| **Subnet** | `172.17.0.0/16` | 地址池。新容器的 IP 只能从这里领 |
| **Gateway** | `172.17.0.1` | 出门岗亭，一般就是 **docker0** |

`/16` 先记成：前两段固定 `172.17`，后面可变。

这个容器领到的号：

```bash
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-net-web
```

```text
172.17.0.4
```

落在刚才的池子里。这是**引擎内部的私有 IP**，别的机器通常不能直接访问，所以才需要 `-p` 开一扇门。

进容器把网卡和路由对上：

```bash
docker exec lab-net-web sh -c 'ip -4 addr show eth0; ip route'
```

```text
inet 172.17.0.4/16 … scope global eth0
default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 scope link  src 172.17.0.4
```

| 输出 | 含义 |
|------|------|
| `inet 172.17.0.4/16 … eth0` | 容器里的网卡叫 `eth0`，就是刚才 `inspect` 到的 |
| `default via 172.17.0.1` | 出网先送到 docker0，再 NAT |
| `172.17.0.0/16 … link` | 同网段直接二层可达 |

从本机验收映射：

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:18080/
```

本机：`HTTP 200`。你访问的是**引擎的 18080**，不是容器 IP 的 80。返回 200 = 映射生效，Nginx 在听。

现在回头看刚才冒出来的名字，网络模型才有着落：

```text
┌─ 容器自己的网络世界 ─────────────────────┐
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

Linux 管这份「自己的网络世界」叫 **Network Namespace**：网卡、路由、端口、`localhost` 都是这一份的。Docker 默认给每个容器一份——否则所有容器抢同一套端口，开头那个 `localhost` 坑也不会成立。容器不是小虚拟机，但是**网络看起来像一台小机器**。内核细节见[第 18 篇](/云原生/docker/docker-18-namespace)；徒手建一间 netns 见 [《netns 与 iptables》](/Linux/basics/linux-05-netns-iptables)。

进出站先不要混：容器 → 外网靠 **NAT**；外网/本机 → 容器靠 **`-p`**。这一球只验证了进站。邻居还没有，`localhost` 连库的坑下一球才现形。

---

## 雪球 2：再加一个 redis——IP 通，名字不通

**只新增一个邻居**，仍不写 `--network`，还是默认 `bridge`：

```bash
docker run -d --name lab-net-db redis:alpine
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-net-db
```

本机：`172.17.0.5`。和 Web 一样落在 `172.17.0.0/16`。

用 IP ping：

```bash
docker exec lab-net-web ping -c 2 172.17.0.5
```

```text
2 packets transmitted, 2 packets received, 0% packet loss
```

`0% packet loss` = 同默认 bridge 上 **按 IP 互通**。Web 配置里写 `172.17.0.5:6379` 此刻能通，但容器一重建 IP 可能变。

用容器名 ping：

```bash
docker exec lab-net-web ping -c 1 lab-net-db
```

本机：`ping: bad address 'lab-net-db'`。

`bad address` = **名字解析失败**，不是网线断了。默认名为 `bridge` 的网络**不提供**「容器名 → IP」的内置 DNS。所以 Web 里写 `lab-net-db` 或 `localhost` 都会错：前者解析不到，后者指向 Web 自己——开头那个坑，这一球一半落地了。

结论先记下：默认 `bridge` 同网段 IP 互通，**没有**容器名 DNS。生产不要写死 `172.17.0.x`。下一球用自定义网络补上名字。

---

## 雪球 3：自定义网络，用容器名找到对方

**只新增一张网，把已在跑的两个容器接上去**（不重建）：

```bash
docker network create -d bridge lab-app-net
docker network connect lab-app-net lab-net-web
docker network connect lab-app-net lab-net-db
```

`create -d bridge` 新建用户自定义 bridge（另有自己的网段）；`connect` 让**已在跑**的容器多挂一张网。创建时写 `--network lab-app-net` 也行，这一球要证明的是「后挂也行」。

再用容器名 ping——和上一球同一对容器，只换了网：

```bash
docker exec lab-net-web ping -c 2 lab-net-db
```

```text
--- lab-net-db ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
```

同样两个容器，换到自定义网络后，**名字就能通**。应用连接串应写 `lab-net-db:6379`（或 [第 13 篇](/云原生/docker/docker-13-compose) 里的服务名），而不是 `localhost`、也不是写死 IP。

看 DNS 谁在回答：

```bash
docker exec lab-net-web nslookup lab-net-db 127.0.0.11
```

末尾的 `127.0.0.11` 是「点名让这台 DNS 来答」，不是要查的东西。

```text
Server:		127.0.0.11
Address:	127.0.0.11:53
Name:	lab-net-db
Address: 172.21.0.3
```

| 行 | 含义 |
|----|------|
| `Server: 127.0.0.11` | 问的是容器里的 **Docker 嵌入 DNS**，不是公网 DNS |
| `Address: 172.21.0.3` | 自定义网上的 IP，可以和默认 bridge 上的 `172.17.0.5` 不同——同一容器可以挂多张网、有多个 IP |

确认这张网自己的池子：

```bash
docker network inspect lab-app-net --format \
  'Subnet={{(index .IPAM.Config 0).Subnet}} Containers={{len .Containers}}'
```

本机：`Subnet=172.21.0.0/16 Containers=2`。`Containers=2` = 两个容器挂在这；`172.21` 与默认 `172.17` 分开。

为什么雪球 2 名字不通、这一球通？根子是两套 DNS（同一台机器对比）：

```bash
docker run --rm busybox cat /etc/resolv.conf
```

```text
nameserver 172.22.208.1
# Based on host file: '/etc/resolv.conf' (legacy)
```

```bash
docker run --rm --network lab-app-net busybox cat /etc/resolv.conf
```

```text
nameserver 127.0.0.11
options ndots:0
# ExtServers: [host(172.22.208.1)]
```

| | 默认 bridge | 自定义网络 |
|---|---|---|
| `/etc/resolv.conf` 写谁 | **照抄宿主机** | **`127.0.0.11`** |
| 容器名解析 | ❌ 无 | ✅ 有 |
| 查外部域名 | 直接问宿主 DNS | 先问 `127.0.0.11`，由它转发上游 |

> 🧰 `busybox`：约 1MB 的探针镜像，自带 `cat` / `ping` / `nslookup` / `ip`。本篇 `docker run --rm busybox …` 都是一次性探针，跑完即删。

要改 DNS 行为，常用四个旗标：`--dns`、`--dns-search`、`--dns-opt`、`--hostname`。本机把前两个叠在一起：

```bash
docker run --rm --dns 223.5.5.5 --hostname mybox busybox sh -c 'cat /etc/resolv.conf; hostname'
```

```text
nameserver 223.5.5.5
mybox
```

另有 `--add-host 名字:IP` 往 `/etc/hosts` 追加（地址写 `host-gateway` 可拿到宿主地址）。老资料里的 `--link` 也是改 hosts，官方已不推荐，见文末历史包袱。

> 🔍 **拆穿（🧗，赶时间可跳）**：`nameserver 127.0.0.11` 不是镜像带来的，是 dockerd 在启动时**现写的**——挂了任何自定义网络就写 `127.0.0.11`；只挂默认 bridge / none / host 就抄宿主。翻译员也不直接听 53：它在容器 netns 的回环上开随机端口，再写一条 NAT，把「访问 `127.0.0.11:53`」改写到真口：
>
> ```bash
> docker run -d --name lab-dns-d --network lab-app-net alpine:3.21 sleep 60
> nsenter -t $(docker inspect -f '{{.State.Pid}}' lab-dns-d) -n iptables -t nat -S | grep 'dport 53'
> ```
>
> ```text
> -A OUTPUT -d 127.0.0.11/32 -j DOCKER_OUTPUT
> -A DOCKER_OUTPUT -d 127.0.0.11/32 -p tcp --dport 53 -j DNAT --to-destination 127.0.0.11:39611
> -A DOCKER_OUTPUT -d 127.0.0.11/32 -p udp --dport 53 -j DNAT --to-destination 127.0.0.11:36846
> ```
>
> 所以 `nslookup … 127.0.0.11` 能通，通的是 **DNAT**。偏偏用 `127.0.0.11` 不用 `127.0.0.1`，是为了不碰 localhost 自己的 53 口。系统读法见 [《netns 与 iptables》](/Linux/basics/linux-05-netns-iptables)。

单机多容器通信，优先自定义网络（或 Compose 默认创建的项目网络）。网段怎么发号、如何钉死 IP，雪球 9 再补。

---

## 雪球 4：端口怎么进站——只开本机这一扇门

雪球 1 的 `-p 18080:80` 在引擎侧做 **DNAT**：访问 `18080` → 转到容器 `80`。两侧抓包见 [《NAT 白话拆解》](/Linux/basics/linux-04-nat)。这一球只加一件事：**门开在哪**。

| 写法 | 效果 |
|------|------|
| `-p 18080:80` | 绑**所有**地址的 18080（雪球 1 已验证） |
| `-p 127.0.0.1:18081:80` | **只绑回环** |
| `-p 18086:53/udp` | 映射 **UDP**（缺省按 TCP） |
| `-p 18083-18085:80-82` | **范围**映射（等长一一对应） |
| `-P`（大写） | 自动分配随机宿主端口（32768 起） |

只绑回环——数据库、管理台只许本机访问时用：

```bash
docker run -d --name lab-pub-loop -p 127.0.0.1:18081:80 nginx:alpine

curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:18081/
curl -s -m 3 -o /dev/null -w "HTTP %{http_code}\n" http://172.22.212.111:18081/ || echo "connection failed"
ss -tln | grep 18081
```

本机：

```text
HTTP 200
HTTP 000
connection failed
LISTEN 0      4096       127.0.0.1:18081      0.0.0.0:*
```

`ss` 显示监听是 `127.0.0.1:18081` 而不是 `0.0.0.0`——**门只开在本机回环上**。从 eth0 敲门（`HTTP 000` = 连接失败）被拒。对比雪球 1 `docker port lab-net-web` 的 `0.0.0.0:18080`（全网卡可达）。

守着这扇门的不是容器里的 Nginx，是宿主机上的 **docker-proxy**：

```bash
ss -tlnp | grep 18080
```

```text
LISTEN 0      4096    0.0.0.0:18080    0.0.0.0:*    users:(("docker-proxy",pid=5337,fd=7))
LISTEN 0      4096       [::]:18080       [::]:*   users:(("docker-proxy",pid=5344,fd=7))
```

外部流量走 iptables DNAT（内核态）；docker-proxy 兜 netfilter 够不着的场景——最典型就是**回环访问**：`curl 127.0.0.1:18081` 能通，正是它在用户态把流量转进容器。性能敏感可在 daemon.json 里 `"userland-proxy": false` 关掉（需重启引擎，本文不实操）。

UDP、范围与 `-P`：

```bash
docker run -d --name lab-pub-range -p 18083-18085:80-82 -p 18086:53/udp nginx:alpine
docker port lab-pub-range

docker run -d --name lab-pub-rand -P nginx:alpine
docker port lab-pub-rand
```

```text
53/udp -> 0.0.0.0:18086
80/tcp -> 0.0.0.0:18083
81/tcp -> 0.0.0.0:18084
82/tcp -> 0.0.0.0:18085

80/tcp -> 0.0.0.0:32768
```

范围按位对应；`-P` 从 32768 起自动挑端口；`docker port` 随时查实际映射。

> host 模式下 `-p` **会被直接丢弃**（不是报错，一条警告加容器照跑）。先把现象记下，雪球 5 亲眼看。防火墙链、28.x 加固见雪球 9。

---

## 雪球 5：host——localhost 这次真的是宿主机

前面都是给容器**单独配一套网络**。host 反着来：**不配了——直接用宿主机那一套**。

比喻：之前是一人一间出租屋；host 是搬进房东客厅——没有自己的门牌（无容器 IP），房东的网卡路由全能用，占的端口就是宿主机的端口，容器名互访失效。图的是**快**（少一层 NAT），代价是**几乎没有网络隔离**。

**① 网卡清单变成宿主机的**

```bash
docker run --rm --network host busybox ip -4 addr | grep inet
```

```text
    inet 127.0.0.1/8 scope host lo
    inet 172.22.212.111/20 brd 172.22.223.255 scope global eth0
    inet 172.19.0.1/16 brd 172.19.255.255 scope global br-232b31f9d168
    …
```

对照雪球 1：bridge 容器里只有一块自己的 `eth0`（`172.17.0.x`）；这里冒出来的 `eth0` 和一排 `br-` **全是宿主机的网卡**。`inspect` 去查容器 IP，得到的是空的。

**② localhost：开头那问的另一半答案**

先在**宿主机的** localhost 上开个服务，再让两种容器分别去访问：

```bash
python3 -m http.server 18095 --bind 127.0.0.1 &

docker run --rm --network host busybox wget -qO- http://127.0.0.1:18095/ >/dev/null && echo 通

docker run --rm busybox wget -qO- http://127.0.0.1:18095/
```

```text
通
wget: can't connect to remote host (127.0.0.1): Connection refused
```

host 容器通了——它的 localhost 和宿主机是同一个；bridge 容器被拒绝——屋里没有这个服务。「localhost 有时通有时不通」，就是这两行。

**③ 不用 `-p`，端口就是宿主机的**

```bash
docker run -d --name lab-host-srv --network host \
    busybox sh -c 'mkdir -p /tmp/www && echo host-mode-ok > /tmp/www/index.html && httpd -f -p 18096 -h /tmp/www'

curl -s http://127.0.0.1:18096/
```

```text
host-mode-ok
```

没写任何 `-p`，宿主机 `curl` 直接通。这也解释了雪球 4 记下的警告：

```text
WARNING: Published ports are discarded when using host network mode
```

host 里没有「映射」这回事，`-p` 写了也被扔掉。

**④ 和宿主机抢端口，撞了就起不来**

```bash
python3 -m http.server 18097 --bind 0.0.0.0 &

docker run -d --name lab-host-conflict --network host busybox httpd -f -p 18097
docker ps -a --filter name=lab-host-conflict --format '{{.Status}}'
docker logs lab-host-conflict
```

```text
Exited (1)
httpd: bind: Address already in use
```

同一个端口只能一个人听。宿主机 nginx 占了 80，再 `docker run --network host nginx:alpine`，容器里的 nginx 绑不上就退出。

**⑤ 容器名：查无此人**

```bash
docker run --rm --network host busybox cat /etc/resolv.conf
docker run --rm --network host busybox nslookup lab-net-db
```

```text
nameserver 172.22.208.1
# Based on host file: '/etc/resolv.conf' (legacy)
;; connection timed out; no servers could be reached
```

雪球 3 讲过：嵌入 DNS（`127.0.0.11`）只有自定义网络才有。host 用的是宿主机的 DNS，它不认识 Docker 容器名。多容器互访，请回雪球 3。

| | |
|--|--|
| 优点 | 性能最好；localhost 与宿主机互通 |
| 缺点 | 抢端口、无隔离、容器名互访失效 |
| 适合 | 高吞吐网关、监控——明确要「就用这台机器的网络」 |
| 不适合 | 日常 Web / 数据库 |

WSL2 里这个「宿主机」指 WSL 虚拟机。安全边界见[第 22 篇](/云原生/docker/docker-22-container-security)。

---

## 雪球 6：none——断网，只剩 lo

仍有独立 Network Namespace，但 **不创建 veth、不配 IP**，通常只剩 `lo`。极端隔离、离线计算、或你要自己往 namespace 里塞网卡时用。

```bash
docker run -d --name lab-net-none --network none alpine:3.21 sleep infinity
docker exec lab-net-none sh -c 'ip -4 addr; ip route'
```

本机：只有 `127.0.0.1/8` 的 `lo`，路由表为空。

| 现象 | 含义 |
|------|------|
| 只有 `lo` | 没有接到 docker0 的 veth，故无 `eth0` |
| 路由表空 | 没有默认网关，访问不了其它容器，也出不了网 |
| 仍有独立 namespace | 和「没有 namespace」不同；只是这份世界里没配对外接口 |

---

## 雪球 7：container:——两个容器共用 localhost

`--network container:NAME`：与**指定容器**共享同一 Network Namespace（不是与宿主机）。两个容器可以用 **`localhost` 互访**（类似 Kubernetes 同 Pod 多容器 / Sidecar）。

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

| 结果 | 含义 |
|------|------|
| s1 有 `172.17.0.6` | 真正「占网」的是 s1；对外 IP/端口都算在它头上 |
| s2 的 `Networks` 为 `{}` | s2 **没有**自己的网络端点，复用 s1 的 namespace |
| s2 里 `wget 127.0.0.1` 得到 Nginx | s2 的 `localhost` = s1 的 `localhost` |

> ⚠️ **container: 下这些旗标不可用**：`--hostname`、`--dns`、`--publish`、`--expose`、`--add-host`、`--mac-address`——网络配置属于占网的那个。本机报错：
> ```text
> docker: Error response from daemon: conflicting options: hostname and the network mode
> docker: Error response from daemon: conflicting options: port publishing and the container type network mode
> ```
> 要改主机名、要发布端口，去改 `lab-net-s1`。

主线到这里：默认 bridge 看见隔离 → 名字不通 → 自定义网补上 DNS → 端口开在哪 → host/none/container 三种「不走默认那套」的对照。跨主机、像物理机、多网分区，是雪球 8、9。

---

## 雪球 8 🧗：跨主机 overlay，以及像物理机的 macvlan / ipvlan

> 进阶块。单机日常用自定义 bridge 就够；多机 Swarm、或容器要出现在办公网里，再读。

### overlay：不同主机上的容器像在同一张网

**Overlay** 在已有物理/云网络之上用隧道（常见 VXLAN）再铺一层，让**不同主机上的容器**像在同一网段。官方定位：主要服务 Swarm；加 `--attachable` 后，普通 `docker run` 也能加入（[overlay driver](https://docs.docker.com/engine/network/drivers/overlay/)）。

| 只用 bridge | 上了 overlay |
|-------------|--------------|
| `local` scope，出不了本机 | `swarm` scope，可跨节点 |
| 跨主机要靠 `-p` 或 K8s CNI | 容器名 / 服务名可在 overlay 上解析 |

单节点也能练。练完请 `docker swarm leave --force`，避免本机一直留在 Swarm：

```bash
docker swarm init --advertise-addr 127.0.0.1
docker network create --driver overlay --attachable lab-overlay-net

docker run -d --name lab-ov-1 --network lab-overlay-net alpine:3.21 sleep infinity
docker run -d --name lab-ov-2 --network lab-overlay-net alpine:3.21 sleep infinity

docker exec lab-ov-1 ping -c 2 lab-ov-2
docker network inspect lab-overlay-net --format \
  'Driver={{.Driver}} Scope={{.Scope}} Subnet={{(index .IPAM.Config 0).Subnet}}'
```

```text
Swarm initialized: current node (…) is now a manager.
…
2 packets transmitted, 2 packets received, 0% packet loss
Driver=overlay Scope=swarm Subnet=10.0.1.0/24
```

| 输出 | 含义 |
|------|------|
| `swarm init` 成功 | 没有这一步，一般建不出 overlay |
| `--attachable` | 允许普通 `docker run` 加入（否则多留给 Swarm Service） |
| `ping lab-ov-2` 成功 | overlay 上也有名字解析；单节点时隧道是「退化」的 |
| `Scope=swarm` | **关键**：集群范围，不是 `local` |

多机时其它节点 `docker swarm join …`，需放行 Swarm/VXLAN 端口，以官方 Swarm 文档为准。会碰到的名字：**ingress**（路由网格相关 overlay）、**docker_gwbridge**（节点上连 overlay 与宿主对外的网桥）。可对 overlay 开加密（有 CPU 开销）。

```bash
docker rm -f lab-ov-1 lab-ov-2
docker network rm lab-overlay-net
docker swarm leave --force
```

### macvlan：容器在二层像另一台机器

指定宿主机一块 **parent** 网卡，容器拿**独立 MAC**，流量**不经过 docker0 那套 NAT**。需要容器在局域网里呈现为独立设备时用；官方限制：宿主机与 macvlan 容器通常不能直接用 IP 互访。WSL2 / 云主机的 parent 往往是虚拟 `eth0`——容器能起来、能拿到 IP，**不等于**已经出现在办公室交换机上。

```bash
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

```text
mac IP=192.168.200.2
Driver=macvlan Parent=eth0
```

`--subnet` / `--gateway` 必须和真实二层匹配；学习环境可先用独立网段避免撞现网。引擎内验收：`Driver=macvlan`，容器拿到规划子网内 IP。真实 LAN 上 `ping` 该 IP 取决于物理/云网络；**WSL2 经常 ping 不通网关**，属环境限制。

许多云厂商禁止杂散 MAC；受限时换 ipvlan，别硬扛。

```bash
docker rm -f lab-mac-1
docker network rm lab-macvlan-net
```

### ipvlan：共用父口 MAC（云上替代 macvlan）

和 macvlan 一样不走 docker0，差别在二层身份——ipvlan 容器**共用父接口的 MAC**。

| | macvlan | ipvlan |
|---|---------|--------|
| 容器二层身份 | **独立 MAC** | **共用父接口 MAC** |
| 常用模式 | bridge | `l2`（默认）/ `l3` |
| 云上 | 多数云**禁止**杂散 MAC | 通常可行 |
| 经典限制 | 宿主机与容器默认不能互访 | 同样默认不能互访 |

本机三方 MAC：

```bash
docker network create -d ipvlan -o parent=eth0 \
    --subnet 192.168.210.0/24 --gateway 192.168.210.1 lab-ipv-p

docker run --rm busybox ip link show eth0 | awk '/ether/{print $2}'
docker run --rm --network lab-ipv-p busybox ip link show eth0 | awk '/ether/{print $2}'
ip link show eth0 | awk '/ether/{print $2}'
```

```text
7e:f4:e9:ae:a6:7a                          # bridge 容器：随机 MAC（28.0+）
00:15:5d:94:91:57                          # ipvlan 容器
00:15:5d:94:91:57                          # 宿主机 eth0
```

后两行一字不差——ipvlan 确实共用宿主 eth0 的 MAC。

学习环境可以**不指定 parent**：驱动自建 `dummy` 父口，网络完全本地化：

```bash
docker network create -d ipvlan \
    --subnet 192.168.210.0/24 --gateway 192.168.210.1 lab-ipvlan-net

docker run -d --name lab-ipv-1 --network lab-ipvlan-net alpine:3.21 sleep infinity
docker run -d --name lab-ipv-2 --network lab-ipvlan-net alpine:3.21 sleep infinity

docker network inspect lab-ipvlan-net --format 'Driver={{.Driver}} Parent={{index .Options "parent"}}'
docker exec lab-ipv-1 ip -4 addr show eth0
docker exec lab-ipv-1 ping -c 2 lab-ipv-2
```

```text
Driver=ipvlan Parent=
    inet 192.168.210.2/24 brd 192.168.210.255 scope global eth0
2 packets transmitted, 2 packets received, 0% packet loss
```

`Parent=` 为空 = dummy 父口。`ping lab-ipv-2` 通，说明 ipvlan 也是自定义网，同样享受容器名 DNS（雪球 3 那套 `127.0.0.11`）。无 parent 时共享的是 dummy 的 MAC，不是宿主 eth0——验证「真共享」要像上面那样指定 `-o parent=eth0`。

生产接真实网络：`-o parent=eth0`（或 VLAN 子接口 `eth0.10`）、`-o ipvlan_mode=l2|l3`；子网必须与 parent 所在网络匹配。

---

## 雪球 9 🧗：多网分区、发号机与固定 IP

> 进阶块。主线玩熟自定义网之后，再看「一张容器多张网、网段从哪来、必须钉死 IP、防火墙加固」。

### 多张网，默认网关听谁的：`gw-priority`

容器挂多张网时 `default via` 只能有一条。28.0 新增 `gw-priority`（数字大者优先），**只能走 `--network` 的长语法**：

```bash
docker network create lab-gw-a && docker network create lab-gw-b

docker run -d --name lab-gw-demo \
    --network name=lab-gw-a \
    --network name=lab-gw-b,gw-priority=1 \
    alpine:3.21 sleep infinity

docker exec lab-gw-demo ip route
```

```text
default via 172.26.0.1 dev eth0
172.25.0.0/16 dev eth1 scope link  src 172.25.0.2
172.26.0.0/16 dev eth0 scope link  src 172.26.0.2
```

默认网关走了 **lab-gw-b** 段（优先级 1）；lab-gw-a 降成普通直连，走 `eth1`。一张网上外网、一张连内网，想让出网固定走某张时用。你机器上的 `172.25` / `172.26` 可能不同，记下哪张是哪段即可。

### `--network-alias`：网络里的外号

容器名全局唯一，同一网络内可以用别名互称——Compose 里 `network_aliases:` 的底层就是它。

```bash
docker network create lab-alias-net
docker run -d --name lab-alias-1 --network lab-alias-net \
    --network-alias db.local --network-alias cache alpine:3.21 sleep infinity

docker run --rm --network lab-alias-net busybox nslookup db.local 127.0.0.11
```

```text
Name:	db.local
Address: 172.24.0.2
```

一组容器共享同一个别名时，DNS 一次返回多条 A 记录（轮询）：

```bash
docker network create lab-rr-net
docker run -d --name lab-rr-1 --network lab-rr-net --network-alias web.local alpine:3.21 sleep infinity
docker run -d --name lab-rr-2 --network lab-rr-net --network-alias web.local alpine:3.21 sleep infinity

docker run --rm --network lab-rr-net busybox nslookup web.local 127.0.0.11
```

```text
Name:	web.local
Address: 172.21.0.3
Name:	web.local
Address: 172.21.0.2
```

加副本就是多一条解析，客户端配置一个字不用改。

### `--internal`：不给出口的纯内网

建的网不接外网：没有默认路由、没有出网 NAT，只有同网互访。数据库、缓存「根本不该自己上网」时用。

```bash
docker network create --internal lab-int-net
docker network inspect lab-int-net --format \
  'Internal={{.Internal}} Subnet={{(index .IPAM.Config 0).Subnet}}'

docker run -d --name lab-int-1 --network lab-int-net alpine:3.21 sleep infinity
docker run -d --name lab-int-2 --network lab-int-net alpine:3.21 sleep infinity

docker exec lab-int-1 ip route
docker exec lab-int-1 ping -c 2 lab-int-2
docker exec lab-int-1 ping -c 2 223.5.5.5
```

```text
Internal=true Subnet=172.21.0.0/16
172.21.0.0/16 dev eth0 scope link  src 172.21.0.2
2 packets transmitted, 2 packets received, 0% packet loss
ping: sendto: Network unreachable
```

路由表只有一条、没有 `default via`；同网 ping 通；出网是 **Network unreachable**（不是丢包超时）——隔离做在路由层。

### 网段从哪来：地址池

不写 `--subnet` 时，Docker 的 **IPAM** 从默认地址池领网段。池子等价于 `daemon.json`：

```json
{
  "default-address-pools": [
    { "base": "172.17.0.0/12", "size": 16 },
    { "base": "192.168.0.0/16", "size": 20 }
  ]
}
```

`base` 是大地皮，`size` 是每张网切多大。第一块 `172.17.0.0/12` 按 `/16` 切：第一段永远归 docker0，其余排队发给自定义网络。本机当时：`172.18`～`172.21` 已有 Compose / 雪球 3 的网，`172.22` 被宿主 eth0 占掉整段让开（候选段与宿主有一丁点重叠就整段不发），`172.23` 归 `docker_gwbridge`。

连建两张验证：

```bash
docker network create lab-pool-1 && docker network create lab-pool-2
docker network inspect lab-pool-1 lab-pool-2 --format '{{.Name}}: {{(index .IPAM.Config 0).Subnet}}'
```

```text
lab-pool-1: 172.27.0.0/16
lab-pool-2: 172.28.0.0/16
```

发号机永远取当前最小空闲段；网络删掉，段就回池。真把池子建满（24 张）会报：

```text
Error response from daemon: all predefined address pools have been fully subnetted
```

解法：把 `size` 调小（地皮总面积不变、每张网变小）。改 `daemon.json` 需重启引擎。

29.0 起可以 `--subnet 0.0.0.0/24`：「从默认池里给我挑一块这么大的」——本机挑中 `172.22.0.0/24`，只占一小段，不碰宿主的 `172.22.208.0/20`。降级到旧版后这样建的网会不可用。

IPv6 走同一套发号机，地皮换成 ULA（`fd00::/8`）；嵌入式 DNS 没有对应 IPv6 地址，`127.0.0.11` 在 IPv6-only 容器里照常工作。

### `--ip`：钉固定 IP（迁就遗留，不是推荐）

钉的号必须落在该网 `--subnet` 里：

```bash
docker network create --subnet 172.30.0.0/16 lab-fixed-net
docker run -d --name lab-fixed-1 --network lab-fixed-net --ip 172.30.0.10 \
    alpine:3.21 sleep infinity
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-fixed-1
```

```text
172.30.0.10
```

给子网外的地址，整条创建被拒：

```text
no configured subnet contains IP address 192.168.50.10
```

运行中后补：

```bash
docker run -d --name lab-fixed-2 alpine:3.21 sleep infinity
docker network connect --ip 172.30.0.11 lab-fixed-net lab-fixed-2
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}={{$v.IPAddress}} {{end}}' lab-fixed-2
```

```text
bridge=172.17.0.5 lab-fixed-net=172.30.0.11
```

一张网一个号。新应用一律用容器名/别名，官方也是这个取向。

### 防火墙与 28.x 加固

Docker 的端口规则写在 iptables 里，专门留给用户的链是 `DOCKER-USER`（容器进出先过它）：

```bash
iptables -L DOCKER-USER -n
```

```text
Chain DOCKER-USER (1 references)
num  target     prot opt source               destination
```

默认是空的，等你来写企业防火墙规则。主线只需记住：**没 `-p` 发布的端口，外面进不来**。

Docker 28 起默认收紧：容器 MAC 随机生成；未经 `-p` 发布的端口，外部直连路由默认阻断；28.3.3 修复 CVE-2025-54388（firewalld reload 后只绑回环的端口会被局域网直达）。细节见 [Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/) 与 [28.x release notes](https://docs.docker.com/engine/release-notes/28/)。

---

## 命令怎么记、两个历史包袱

按刚才滚雪球的顺序记：

| 阶段 | 命令 | 你在哪一球用过 |
|------|------|----------------|
| 默认证件 | `docker run`（不写 `--network`）+ `inspect` IP / `exec ip route` | 1、2 |
| 进站 | `-p` / `-P` / `docker port` / `ss` 看 docker-proxy | 1、4 |
| 建网 / 挂上 | `network create`、`network connect` | 3 |
| 名字 | `ping 容器名`、`nslookup … 127.0.0.11` | 2 失败、3 成功 |
| 对照模式 | `--network host` / `none` / `container:NAME` | 5、6、7 |
| 跨主机 / 二层 | `overlay --attachable`、`macvlan` / `ipvlan` | 8 |
| 分区 / 钉号 | `--internal`、`--network-alias`、`gw-priority`、`--ip` | 9 |
| 查 / 删 | `network ls` / `inspect` / `rm` / `prune` | 贯穿；`ls` 能看见内置的 `bridge` / `host` / `none` |

`host` 与 `none` 是内置网络，不要重复 `create`。

老资料里的 **`--link`** 会在 `/etc/hosts` 注入单向解析，官方已不推荐。新项目用自定义网络即可。28.4 起 legacy links 相关环境变量已标记废弃，计划 v30 移除（[28.x release notes](https://docs.docker.com/engine/release-notes/28/)）。

host 模式下 `-p` 被丢弃（雪球 5 的警告原文），不是 bug。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|------|----------------------|
| [第 13 篇](/云原生/docker/docker-13-compose) Compose | 雪球 3：服务名 DNS 就是自定义网上的容器名 |
| [第 18 篇](/云原生/docker/docker-18-namespace) | 雪球 1：Network Namespace |
| [第 22 篇](/云原生/docker/docker-22-container-security) | 雪球 5：host 的安全边界 |
| [第 12 篇](/云原生/docker/docker-12-data-persistence) 持久化 | 下一篇：网络通了，数据还在不在 |
| [Linux：IP / NAT / netns](/Linux/basics/linux-02-ip-subnet-gateway) | 网段、DNAT、徒手 veth 的前置 |

---

## 模式选型

| 需求 | 推荐 |
|------|------|
| 一般 Web / 数据库，要 `-p` | **bridge**（默认） |
| 多容器用名字互访（单机） | **自定义 bridge**（或 Compose 网络） |
| 后端服务不允许出网 | 自定义 bridge + **`--internal`** |
| 极致性能且可共享主机端口 | **host**（慎用） |
| Sidecar 与主容器 `localhost` 通信 | **container:** 或日后 K8s Pod |
| 完全断网 | **none** |
| 跨多台 Docker 主机（Swarm） | **overlay** + `--attachable` |
| 容器要在二层像物理机 | **macvlan** |
| 云上直连（禁杂散 MAC） | **ipvlan** |

---

## 本篇实验清理（可照抄）

```bash
docker rm -f lab-net-web lab-net-db lab-net-none lab-host-srv lab-host-conflict \
  lab-net-s1 lab-net-s2 lab-ov-1 lab-ov-2 lab-mac-1 lab-ipv-1 lab-ipv-2 \
  lab-pub-loop lab-pub-range lab-pub-rand lab-alias-1 lab-dns-d \
  lab-gw-demo lab-int-1 lab-int-2 lab-fixed-1 lab-fixed-2 \
  lab-rr-1 lab-rr-2 2>/dev/null

docker network rm lab-app-net lab-overlay-net lab-macvlan-net lab-ipvlan-net \
  lab-int-net lab-alias-net lab-gw-a lab-gw-b lab-pool-1 lab-pool-2 \
  lab-ipv-p lab-fixed-net lab-rr-net 2>/dev/null

docker swarm leave --force 2>/dev/null
```

---

## 小结

从一个 nginx 欢迎页开始，每次只加一种能力：

1. **默认 bridge + `-p`**：各有一份网络世界；出网 NAT，进站映射；`localhost` 只属于自己。
2. **同默认 bridge 加邻居**：IP 通，容器名 `bad address`。
3. **自定义网络**：内置 DNS（`127.0.0.11`），用容器名互访——单机多容器首选。
4. **`-p` 开在哪**：只绑回环则局域网进不来；守门的是 docker-proxy。
5. **host**：localhost 通到宿主机；`-p` 被丢弃；抢端口、无容器名 DNS。
6. **none**：只剩 `lo`。
7. **container:**：sidecar 的 `127.0.0.1` 就是隔壁在听的端口。
8. **overlay / macvlan / ipvlan**：跨主机看 `Scope=swarm`；独立 MAC vs 共用父口 MAC。
9. **分区与发号**：`--internal`、别名轮询、`gw-priority`、地址池、`--ip`、`DOCKER-USER`。

**思考题**：

1. 默认 bridge 与自定义 bridge 在「容器名 DNS」上有何区别？若 Web 与 MySQL 已在自定义网络上，应用连接串应写 `localhost`、容器 IP，还是 MySQL 的**容器名**？为什么？
2. `-p 127.0.0.1:18081:80` 起的服务，为什么局域网另一台机器访问 `你的IP:18081` 不通？数据库如果用 `-p 3306:3306` 跑在公司服务器上，比 `--internal` 网络里的数据库多了什么风险？

（提示一：对照雪球 2 的 `bad address` 与雪球 3 的 `nslookup`。提示二：对照雪球 4 的 `ss` 监听地址与雪球 9 的路由表。）

下一篇：[《数据持久化——从容器一删库没了，滚到三种挂载》](/云原生/docker/docker-12-data-persistence)。

---

## 参考资料

- 官方：[Networking overview](https://docs.docker.com/engine/network/)、[bridge](https://docs.docker.com/engine/network/drivers/bridge/)、[overlay](https://docs.docker.com/engine/network/drivers/overlay/)、[macvlan](https://docs.docker.com/engine/network/drivers/macvlan/)、[ipvlan](https://docs.docker.com/engine/network/drivers/ipvlan/)、[Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/)、[28.x release notes](https://docs.docker.com/engine/release-notes/28/)
- Linux 前置：[IP、网段与网关](/Linux/basics/linux-02-ip-subnet-gateway) → [tcpdump](/Linux/basics/linux-03-tcpdump) → [NAT 白话拆解](/Linux/basics/linux-04-nat) → [netns 与 iptables](/Linux/basics/linux-05-netns-iptables)
- 本机：WSL2 Ubuntu-22.04 + 原生 Docker Engine 29.1.3
