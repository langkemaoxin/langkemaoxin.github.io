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
description: Docker 网络模式与实操——从 docker0 到 overlay / macvlan：本机实测默认 bridge、自定义 DNS、host/none/container，以及 Swarm overlay 与 macvlan
---

> **Docker 系列 · 第 11/24 篇**
> 上一篇：[《Harbor 私有镜像仓库——按步骤从安装到第一次 push》](/云原生/docker/docker-10-harbor) · 下一篇：[《数据持久化——Volume、Bind Mount 与 tmpfs：容器删了，数据凭什么还在》](/云原生/docker/docker-12-data-persistence)

---

## 开头：微服务上了 Docker，为什么 localhost 有时通有时不通？

你把 Web 和 MySQL 拆成两个容器：Web 配置里写 `localhost:3306`，容器起来却连不上库。

- 在宿主机上，`localhost` 是宿主机本身  
- 默认 **bridge** 下，**每个容器有独立的网络视图**：自己的网卡、自己的 IP、自己的 `localhost`  
- Web 容器里的 `localhost` 只指向 **Web 自己**，不是隔壁 MySQL 容器  

大规模用 Docker 后，网络往往是踩坑最多的一块。本篇按一条线走完：

1. 先补够本篇用的背景（Network Namespace 白话）  
2. 默认 bridge + 端口映射（本机实测）  
3. **自定义 bridge + 容器名 DNS**（多容器推荐解法）  
4. host / none / container  
5. **overlay（跨主机）与 macvlan（二层独立 MAC）展开讲解 + 本机实测**  
6. 选型与命令速查  

> **实验环境**（文中输出均来自本机）：Docker Client / Server **29.1.3**，后端 OS 显示为 **Ubuntu 22.04.4 LTS**（Docker Desktop → WSL2 Linux 引擎）。  
> **Desktop 注意**：你在 Windows 上看不到引擎里的 `docker0` / `veth`；容器 IP、`ip a`、`iptables` 都以 **Linux 引擎（VM）** 为准。`host` / `macvlan` 在 Desktop 上语义与「裸 Linux」有差异，文中会标明。  
> 官方参考：[Networking overview](https://docs.docker.com/engine/network/)、[bridge](https://docs.docker.com/engine/network/drivers/bridge/)、[overlay](https://docs.docker.com/engine/network/drivers/overlay/)、[macvlan](https://docs.docker.com/engine/network/drivers/macvlan/)。

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

```bash
docker network ls
```

本机：

```text
NETWORK ID     NAME      DRIVER    SCOPE
…              bridge    bridge    local
…              host      host      local
…              none      null      local
```

| 网络 | 驱动 | 是什么 |
|------|------|--------|
| **bridge** | bridge | 默认；容器挂到 docker0 一类网桥 |
| **host** | host | 与宿主机（引擎）共享网络栈 |
| **none** | null | 有独立 namespace，但不配网卡，只剩 lo |

自定义网络用 `docker network create`；跨主机用 **overlay**，二层独立 MAC 用 **macvlan**——后文展开。

验收：能看到上述三种内置网络即可。

---

## 三、bridge 模式（默认）——本机主路径

### 3.1 是什么 / 为什么

**是什么**：容器进独立 Network Namespace，经 **veth pair** 接到宿主机网桥（默认网桥常叫 **docker0**），从网段拿 IP，出网靠 **NAT**；对外暴露靠 **`-p` / `-P` 端口映射**。

**为什么当默认**：隔离够用、端口映射成熟、单机最省事。

示意：

```text
[容器 eth0] ---- veth ---- [docker0 172.17.0.1] ---- NAT / -p ---- 外界
```

### 3.2 怎么做：跑一个能从宿主机访问的 Nginx

```bash
docker run -d --name lab-net-web -p 18080:80 nginx:alpine
```

看它挂在哪个网、IP 是多少：

```bash
docker network inspect bridge --format \
  'Subnet={{(index .IPAM.Config 0).Subnet}} Gateway={{(index .IPAM.Config 0).Gateway}}'

docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-net-web
```

本机：

```text
Subnet=172.17.0.0/16 Gateway=172.17.0.1
172.17.0.4
```

容器内视角：

```bash
docker exec lab-net-web sh -c 'ip -4 addr show eth0; ip route'
```

本机（节选）：

```text
inet 172.17.0.4/16 … scope global eth0
default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 scope link  src 172.17.0.4
```

宿主机访问端口映射：

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:18080/
```

本机：`HTTP 200`。

**验收**：`inspect` 有 IP；容器默认路由指向网关；`-p` 后本机 `curl` 返回 200。

### 3.3 同默认 bridge：IP 能通，容器名不通

再起一个 Redis：

```bash
docker run -d --name lab-net-db redis:alpine
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-net-db
```

本机：`172.17.0.5`。

用 **IP** ping：

```bash
docker exec lab-net-web ping -c 2 172.17.0.5
```

本机：`2 packets transmitted, 2 packets received, 0% packet loss`。

用 **容器名** ping：

```bash
docker exec lab-net-web ping -c 1 lab-net-db
```

本机：`ping: bad address 'lab-net-db'`。

**结论**：

- 默认 `bridge` 上，同网段 **IP 互通**  
- **没有**「用容器名当主机名」的内置 DNS（这是历史行为）  
- 代码里写死 `172.17.0.x` 会在重启后翻车——IP 会变  

### 3.4 端口映射在干什么（点到为止）

`-p 18080:80` 在引擎的 NAT 表里做 **DNAT**：访问引擎 `18080` → 转到容器 `172.17.0.4:80`。  
Desktop 上再从 Windows 访问 `127.0.0.1:18080`，是 Desktop 把端口转发进 Linux 引擎——你日常只要记住：**映射的是「引擎端口 → 容器端口」**。

---

## 四、自定义 bridge + 容器名 DNS（多容器推荐）

### 4.1 是什么 / 为什么

**是什么**：你自己 `docker network create` 出来的 **user-defined bridge**。挂在同一自定义网络上的容器，Docker 内置 DNS（容器里常见 `127.0.0.11`）会把 **容器名** 解析成当前 IP。

**为什么**：解决「别写死 IP」；也是后面 Compose 里服务名互访的同一套机制（[第 13 篇](/云原生/docker/docker-13-compose)）。

### 4.2 怎么做（本机实测）

```bash
docker network create -d bridge lab-app-net

# 把已有容器接入（也可用 run --network lab-app-net 直接创建）
docker network connect lab-app-net lab-net-web
docker network connect lab-app-net lab-net-db

docker exec lab-net-web ping -c 2 lab-net-db
docker exec lab-net-web nslookup lab-net-db 127.0.0.11
```

本机 ping：

```text
--- lab-net-db ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
```

本机 DNS：

```text
Server:		127.0.0.11
Address:	127.0.0.11:53
Name:	lab-net-db
Address: 172.21.0.3
```

```bash
docker network inspect lab-app-net --format \
  'Subnet={{(index .IPAM.Config 0).Subnet}} Containers={{len .Containers}}'
```

本机：`Subnet=172.21.0.0/16 Containers=2`。

**验收**：同一自定义网络上，`ping 容器名` 成功；`nslookup` 指向 `127.0.0.11`。

> 🔑 **默认 bridge vs 自定义 bridge**：前者主要靠 IP；后者有容器名 DNS。单机多容器通信，优先自定义网络（或 Compose 默认创建的项目网络）。

### 4.3 `--link`（历史，不推荐）

老资料里的 `--link` 会在 `/etc/hosts` 注入单向解析，官方已不推荐。新项目用自定义网络即可；遇到老脚本知道它是什么就行。

---

## 五、host 模式

### 5.1 是什么 / 为什么 / 怎么做

**是什么**：容器与 **引擎宿主机** 共享 Network Namespace——不配独立 `eth0`/容器 IP，直接用主机网络栈。

**为什么**：少一层 veth/NAT，延迟更低；适合对网络极敏感、且能接受「和主机抢端口」的场景（如部分监控 agent）。

```bash
docker run -d --name lab-net-host --network host nginx:alpine
docker exec lab-net-host ip -4 addr
```

本机（节选）：能直接看到引擎上的 `eth0`、`docker0`、各 `br-…`，例如：

```text
inet 172.22.212.111/20 … eth0
inet 172.17.0.1/16 … docker0
```

### 5.2 取舍与 Desktop 差异

| | |
|--|--|
| 优点 | 无 NAT；端口即主机端口 |
| 缺点 | **无端口隔离**；隔离性最弱；容器名 DNS 等「Docker 网络能力」也不走这套 |
| Desktop | `host` 走的是 **Linux VM** 的网络栈，不是 Windows 主机网卡；且 Desktop 对 host 模式有额外限制（见[官方 host driver](https://docs.docker.com/engine/network/drivers/host/)） |

适用：明确需要共享主机网络、并接受上述代价时。日常 Web/DB **不要**默认用 host。

---

## 六、none 模式

**是什么**：仍有独立 Network Namespace，但 **不创建 veth、不配 IP**，通常只剩 `lo`。

**为什么**：极端隔离、离线计算、或你要自己手动往 namespace 里塞网卡时。

```bash
docker run -d --name lab-net-none --network none alpine:3.21 sleep infinity
docker exec lab-net-none sh -c 'ip -4 addr; ip route'
```

本机：只有 `127.0.0.1/8` 的 `lo`，路由表为空。

**验收**：无 `eth0`、无容器 IP、出不了网。

---

## 七、container 模式（共享另一个容器的网络栈）

### 7.1 是什么 / 为什么

**是什么**：`--network container:NAME`——与 **指定容器** 共享同一 Network Namespace（不是与宿主机）。

**为什么**：两个容器可以用 **`localhost` 互访**（类似 Kubernetes 同 Pod 多容器 / Sidecar）。

### 7.2 怎么做（本机实测）

```bash
docker run -d --name lab-net-s1 nginx:alpine
docker run -d --name lab-net-s2 --network container:lab-net-s1 alpine:3.21 sleep infinity

docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lab-net-s1
docker inspect -f '{{json .NetworkSettings.Networks}}' lab-net-s2
docker exec lab-net-s2 wget -qO- http://127.0.0.1/ | head -c 80
```

本机：

- `lab-net-s1` IP：`172.17.0.6`（挂在默认 bridge）  
- `lab-net-s2` 的 `Networks`：`{}`（自己不再单独占一张网）  
- `wget http://127.0.0.1/` 拿到 Nginx 欢迎页 HTML  

**验收**：共享栈的容器里，访问 `127.0.0.1` 就是「被共享的那个容器」在听的端口。

---

## 八、overlay 模式（跨主机覆盖网络）——展开

### 8.1 是什么

**Overlay** 在已有物理/云网络之上，用隧道（常见 **VXLAN**）再铺一层逻辑网络，让 **不同主机上的容器** 像在同一二层/三层网段里通信。

官方定位：主要服务 **Swarm 服务**；加 `--attachable` 后，**独立 `docker run` 的容器** 也能加入（见 [overlay driver](https://docs.docker.com/engine/network/drivers/overlay/)）。

### 8.2 为什么需要它

| 只用 bridge | 上了 overlay |
|-------------|--------------|
| 网络是 **local** scope，出不了本机 | 网络是 **swarm** scope，可跨节点 |
| 跨主机要靠对外 `-p`、额外路由或 K8s CNI | 容器名 / 服务名可在 overlay 上解析互通 |
| 单机开发够用 | 多机 Swarm、部分迁移期架构会用到 |

今天很多人跨主机直接上 Kubernetes CNI；但理解 overlay，有助于读 Swarm 文档、排「多机容器互通」类问题。

### 8.3 怎么做（本机单节点 Swarm 实测）

> 单节点也能练：先 `swarm init`，再创建 **attachable** overlay，两容器用名字 ping。练完请 `docker swarm leave --force`，避免本机一直留在 Swarm 状态。

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

**验收**：`Scope=swarm`；两容器可用 **名字** ping 通。

多机时：其它节点 `docker swarm join …`，同一 overlay 上的任务/attachable 容器即可跨主机互通（需放行 Swarm/VXLAN 相关端口，以当前官方 Swarm 文档为准）。

### 8.4 关键概念（背景知识）

| 概念 | 含义 |
|------|------|
| **ingress** | Swarm 默认的路由网格相关 overlay（发布服务端口时会碰到） |
| **docker_gwbridge** | 节点上连接 overlay 与宿主对外通信的网桥 |
| **`--attachable`** | 允许非 Swarm Service 的普通容器加入 overlay |
| **加密** | 可对 overlay 开启加密选项（有 CPU 开销，按合规需要开启） |

### 8.5 清理 Swarm 实验

```bash
docker rm -f lab-ov-1 lab-ov-2
docker network rm lab-overlay-net
docker swarm leave --force
```

本机实验后已 `leave`，Swarm 回到 `inactive`。

---

## 九、macvlan 模式——展开

### 9.1 是什么

**macvlan** 让容器拥有 **独立 MAC 地址**，在二层上像「插在交换机上的另一台机器」：

- 指定宿主机一块 **parent** 网卡（如 `eth0`）  
- 容器从你规划的子网拿 IP  
- 流量走 macvlan 子接口，**不经过 docker0 那套 NAT 路径**（拓扑更「像物理机」）

### 9.2 为什么用 / 为什么慎用

**为什么用**：

- 需要容器在局域网里呈现为独立设备（监控、传统网络设备对接、部分 IDC 规范）  
- 想减少 bridge + NAT 路径上的开销  

**为什么慎用**：

- 官方经典限制：**宿主机与 macvlan 容器通常不能直接用 IP 互访**（要额外子接口或路由技巧）  
- 依赖真实二层环境；地址规划、网关、VLAN 都要和网络同事对齐  
- **Docker Desktop / WSL2**：parent 往往是 VM 里的虚拟 `eth0`，容器能起来、能拿到 IP，但 **不等于** 已经出现在你办公室 LAN 的交换机上  

### 9.3 怎么做（本机实测）

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

**验收（引擎内）**：`Driver=macvlan`，容器拿到规划子网内 IP。

**验收（真实 LAN）**：到同网段其它机器上 `ping` 该 MAC/IP——这步取决于你的物理/云网络，**Desktop 学习环境经常 ping 不通网关或局域网**，属环境限制，不代表命令写错。

### 9.4 常见模式与注意点

| 点 | 说明 |
|----|------|
| **bridge 模式 macvlan** | 最常见：同一 parent 下的 macvlan 网络内容器互通 |
| **子网规划** | `--subnet` / `--gateway` 必须与 parent 所在二层匹配，避免和现网冲突 |
| **主机访问容器** | 默认困难；生产若必须，按官方文档做 macvlan 子接口，而不是指望 docker0 |
| **云上** | 许多云厂商对杂散 MAC 有限制，上云前先查是否允许 macvlan/混杂模式 |

```bash
docker rm -f lab-mac-1
docker network rm lab-macvlan-net
```

---

## 十、模式选型速查

| 需求 | 推荐 |
|------|------|
| 一般 Web / 数据库，要 `-p` | **bridge**（默认） |
| 多容器用名字互访（单机） | **自定义 bridge**（或 Compose 网络） |
| 极致性能且可共享主机端口 | **host**（慎用；注意 Desktop 语义） |
| Sidecar 与主容器 `localhost` 通信 | **container:** 或日后 K8s Pod |
| 完全断网 | **none** |
| 跨多台 Docker 主机（Swarm 语境） | **overlay** + Swarm（`--attachable` 可挂普通容器） |
| 容器要在二层像物理机 | **macvlan**（先确认网络策略与 Desktop/云限制） |

---

## 十一、网络命令速查

```bash
# 查看
docker network ls
docker network ls -f 'driver=bridge'
docker network inspect bridge
docker network inspect lab-app-net

# 创建 / 删除
docker network create -d bridge lab-app-net
docker network create -d bridge --subnet 192.168.100.0/24 --gateway 192.168.100.1 lab-subnet
docker network create --driver overlay --attachable lab-overlay-net   # 需 Swarm
docker network create -d macvlan --subnet 192.168.200.0/24 --gateway 192.168.200.1 -o parent=eth0 lab-macvlan-net

docker network rm lab-app-net
docker network prune   # 删未使用网络

# 运行时指定 / 动态插拔
docker run -d --network lab-app-net --name web nginx:alpine
docker network connect lab-app-net running_container
docker network disconnect lab-app-net running_container
```

`host` 与 `none` 是内置网络，不要重复 `create`。

---

## 十二、本篇实验清理（可照抄）

若中途打断，统一清掉：

```bash
docker rm -f lab-net-web lab-net-db lab-net-host lab-net-none \
  lab-net-s1 lab-net-s2 lab-ov-1 lab-ov-2 lab-mac-1 2>/dev/null

docker network rm lab-app-net lab-overlay-net lab-macvlan-net 2>/dev/null

# 若做过 overlay 实验且不再需要 Swarm：
docker swarm leave --force 2>/dev/null
```

---

## 小结

- 容器默认各自一份 **Network Namespace**：`localhost` 只属于自己。  
- **默认 bridge**：IP 互通 + `-p` 对外；**容器名 DNS 没有**。  
- **自定义 bridge**：内置 DNS，容器名互访——单机多容器首选。  
- **host / none / container**：共享主机栈、断网、共享指定容器栈，按场景选用。  
- **overlay**：Swarm 覆盖网络，跨主机；本机可用 attachable 单节点练通，用完 `swarm leave`。  
- **macvlan**：独立 MAC、像物理机；本机能创建并拿到 IP，真实 LAN 可达性取决于二层环境与 Desktop 限制。  

---

## 思考题

> 默认 bridge 与 user-defined bridge 在「容器名 DNS」上有何区别？若 Web 与 MySQL 已在自定义网络上，应用连接串应写 `localhost`、容器 IP，还是 MySQL 的**容器名**？为什么？

---

## 下篇预告

**第 12 篇：《数据持久化》**

网络打通之后，下一个坑往往是：容器一删，MySQL 数据没了。下一篇讲清 Volume、Bind Mount 与 tmpfs，再接到 Compose 编排。

下一篇见 🐳
