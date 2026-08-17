---
title: Docker 网络模式与实操——从 docker0 到 overlay
sidebarGroup: Docker 系列
shortTitle: 11 网络模式与实操
order: 11
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: Docker 网络模式与实操——从 docker0 到 overlay
---

> **Docker 系列 · 第 11/24 篇**
> 上一篇：[《Harbor 私有镜像仓库——按步骤从安装到第一次 push》](/云原生/docker/docker-09-harbor) · 下一篇：[《数据持久化——Volume、Bind Mount 与 tmpfs：容器删了，数据凭什么还在》](/云原生/docker/docker-19-data-persistence)

---

## 开头：微服务上了 Docker，为什么 localhost 有时通有时不通？

你把 Web 和 MySQL 拆成两个容器：Web 配置里写 `localhost:3306`，容器起来却连不上库。

- 在宿主机上，`localhost` 是宿主机本身
- 在 bridge 模式下，**每个容器有独立 Network Namespace 和自己的 `eth0` IP**
- `localhost` 指向容器自身，不是隔壁 MySQL 容器

大规模使用 Docker 后，网络往往是运维与开发踩坑最多的部分。本篇按「模式理论 → docker0 实操 → 多容器通信 → 命令汇总」讲清默认与自定义网络。

---

## 一、Docker 安装后的默认网络

```bash
docker network ls
```

通常可见三种内置网络：

| 网络 | 驱动 | 用途 |
|------|------|------|
| **bridge** | bridge | 默认模式，容器经 docker0 通信 |
| **host** | host | 与宿主机共享网络栈 |
| **none** | null | 无网络配置，仅 lo |

自定义场景还可创建 **overlay**（跨主机）、**macvlan**（二层 MAC 地址）等。

---

## 二、六种网络模式总览

| 模式 | 启动参数 | 说明 |
|------|----------|------|
| **bridge** | `--net=bridge`（默认） | 独立 Network NS，接入 docker0，NAT 出网 |
| **host** | `--net=host` | 与宿主机共享 NS，无独立 IP |
| **container** | `--net=container:NAME\|ID` | 与指定容器共享 NS（类似 K8s Pod 多容器） |
| **none** | `--net=none` | 独立 NS，但不配置 veth/IP，仅 lo |
| **overlay** | 需 Swarm 或插件 | 跨主机 VXLAN 覆盖网络 |
| **macvlan** | `--driver macvlan` | 容器带独立 MAC，像物理机一样接在二层网络 |

---

## 三、bridge 模式（默认，重点）

### 3.1 原理

Docker 使用 Linux **网桥**，在宿主机创建 **docker0**。每个 bridge 模式容器：

1. 获得独立 Network Namespace
2. 通过 **veth pair** 一端接 docker0，一端在容器内为 **eth0**
3. 从 bridge 网段分配 **Container-IP**（如 172.17.0.0/16）
4. 默认网关为 docker0（如 172.17.0.1）

**同一宿主机、同一 bridge 上的容器** 可通过 Container-IP 直接互访。  
**外部网络** 无法路由到 Container-IP，需 **端口映射**（`-p` / `-P`）经 iptables DNAT 访问。

### 3.2 实现步骤（veth pair）

1. 宿主机创建 veth0、veth1
2. veth0 接入 docker0
3. veth1 放入容器 network namespace，改名为 eth0
4. 分配 IP、设置默认网关

veth 成对出现：**进一端、出一端**，是容器与网桥的数据通道。

### 3.3 bridge 的优缺点

**优点**：端口映射成熟；容器与宿主机网络隔离；多容器同网段互通简单。

**缺点**：

- 容器无公网 IP，对外依赖 NAT，多一层转发
- 宿主机端口需竞争；服务发现需额外机制（DNS、服务名）
- NAT 在三层实现，对极端性能场景有开销

### 3.4 docker0 实操

```bash
# 查看 docker0，默认 172.17.0.1/16
ip a show docker0

docker network inspect bridge

docker run -itd --name nginx1 nginx:1.19.3-alpine
docker network inspect bridge   # 查看 Containers 节点

# 宿主机上会多出 veth@ifN
ip a
```

未指定 `--network` 时，容器默认挂到 **docker0**，网关为 docker0 地址。

安装 `bridge-utils` 后：

```bash
yum install -y bridge-utils   # 或 apt install bridge-utils
brctl show
```

### 3.5 端口映射与 iptables

```bash
docker run -d -p 6379:6379 redis
iptables -t nat -L DOCKER
```

典型 DNAT 规则：

```text
DNAT tcp -- anywhere anywhere tcp dpt:6379 to:172.17.0.4:6379
```

访问宿主机 `127.0.0.1:6379` → PREROUTING DNAT 到容器 IP → 容器内 Redis 响应。Network Namespace 与 iptables 的内核侧叙述，见后文[第 18 篇](/云原生/docker/docker-15-namespace)。

---

## 四、host 模式

```bash
docker run -itd --name nginx2 --network host nginx:1.19.3-alpine
docker exec -it nginx2 ip a
# 输出与宿主机 ip a 基本一致
```

- **不创建独立 Network Namespace**（与宿主机共享）
- 无虚拟网卡，直接使用宿主机 IP 与端口
- **网络性能最好**，无 NAT
- **无端口隔离**：宿主机已占用 80 则容器不能再绑 80
- **隔离性最弱**

适用：对网络延迟极敏感、且可接受与宿主机共享端口的场景（如监控 agent、网络探测工具）。

---

## 五、container 模式

```bash
docker run -itd --name nginx2 --network container:nginx1 nginx:alpine
```

- 与 **指定容器共享** Network Namespace（不是与宿主机）
- 两容器可通过 **localhost** 高效通信（类似 K8s 同 Pod 多容器）
- 仍无法直接替代「对外服务发现」；与宿主机外通信能力取决于被共享容器

**link 是单向 DNS 的老方案**（见下文），container 模式是另一种共享栈手段。

---

## 六、none 模式

```bash
docker run -itd --name nginx1 --network none nginx:alpine
docker exec -it nginx1 ip a
# 仅 lo，无 eth0、无 IP
```

- 有独立 Network Namespace，但 **不配置任何网络**
- 完全封闭，仅适合极高安全隔离、后续手动配网或仅本地计算的场景

---

## 七、overlay 模式

**Overlay（覆盖网络）** 主要用于 **Docker Swarm 或多主机集群**：

- 基于 **VXLAN** 等隧道，在现有物理网络之上构建逻辑二层/三层网络
- 实现 **跨主机容器** 直接通信，无需手动维护路由
- 创建依赖 Swarm 或支持 overlay 的 network driver

适用：成百上千跨主机容器、需要统一 overlay 网段的集群环境。单机开发较少直接使用。

---

## 八、macvlan 模式

**macvlan** 让容器拥有 **独立 MAC 地址**，在二层交换网络上像**物理设备**一样出现：

- 宿主机充当二层交换机角色，维护 MAC 转发表
- 容器 IP 与主机 IP 同级，**主机与容器不能靠 IP 直接互访**（需 macvlan 子接口或路由技巧）
- 绕过 Linux bridge 的部分路径，**性能与拓扑 simplicity** 在某些 IDC 场景有优势

常见模式：**macvlan bridge**——同一 parent 接口（如 `eth0`）上的 macvlan 网络彼此隔离，同子网内容器可互通。

适用：需要容器在 LAN 上呈现为独立物理机、或对接传统网络设备的场景。

---

## 九、多容器通信

### 9.1 同 bridge 下用 IP

```bash
docker run -itd --name nginx1 nginx:1.19.3-alpine
docker run -itd --name nginx2 nginx:1.19.3-alpine
docker network inspect bridge
docker exec -it nginx1 ping 172.17.0.3
```

**问题**：容器重启后 IP 可能变化，代码里写死 IP 不可维护。

### 9.2 link（已不推荐）

```bash
docker run -itd --name nginx1 nginx:alpine
docker run -itd --name nginx2 --link nginx1 nginx:alpine
docker exec -it nginx2 ping nginx1
```

`--link` 在 `/etc/hosts` 注入解析，**单向**（nginx2 → nginx1，反向不通）。官方已不推荐，仅作老项目兼容了解。

### 9.3 自定义 bridge + 内置 DNS（推荐）

```bash
docker network create -d bridge my-net

docker run -itd --name nginx3 --network my-net nginx:alpine
docker network connect my-net nginx2   # 运行中容器接入网络

docker exec -it nginx2 ping nginx3   # 用容器名解析
```

**同一 user-defined bridge 上，Docker 内置 DNS 将容器名解析为当前 IP**，优于默认 bridge（默认 bridge 不支持容器名 DNS，需 link 或自定义网络）。

---

## 十、网络命令汇总

### 查看

```bash
docker network ls
docker network ls -f 'driver=bridge'
docker network inspect bridge
docker network inspect my-net
```

### 创建与删除

```bash
docker network create -d bridge my-bridge
docker network create -d bridge \
  --subnet 192.168.0.0/16 \
  --gateway 192.168.0.1 \
  my-subnet

docker network rm my-bridge
docker network prune   # 清理未使用网络
```

`host` 与 `none` 各只能存在一个，不可重复创建。

### 运行指定网络

```bash
docker run -d --network my-net --name web nginx
docker create --network host ...
```

### 动态连接 / 断开

```bash
docker network connect my-net running_container
docker network disconnect -f my-net running_container
```

### 帮助

```bash
docker network --help
# connect | create | disconnect | inspect | ls | prune | rm
```

---

## 十一、模式选型速查

| 需求 | 推荐模式 |
|------|----------|
| 一般 Web / 数据库，要端口映射 | **bridge**（默认） |
| 极致网络性能，可接受端口共享 | **host** |
| Sidecar 与主容器 localhost 通信 | **container** 或 K8s Pod |
| 完全断网批处理 | **none** |
| 跨多台 Docker 主机 | **overlay** + Swarm |
| 容器要像物理机一样接 VLAN | **macvlan** |
| 多容器用名字互访 | **自定义 bridge** |

---

## 本节小结

| 概念 | 一句话 |
|------|--------|
| **docker0** | 默认 bridge，172.17.0.0/16 |
| **veth pair** | 连接容器 eth0 与网桥 |
| **bridge** | 默认；NAT + 端口映射 |
| **host** | 共享宿主机网络栈 |
| **自定义 bridge** | 容器名 DNS，替代 link |
| **overlay / macvlan** | 跨主机与二层物理网络场景 |

---

## 下篇预告

**第 12 篇：《数据持久化》**

网络打通之后，下一个坑往往是：容器一删，MySQL 数据没了。下一篇讲清 Volume、Bind Mount 与 tmpfs，再接到 Compose 编排。

---

## 思考题

> 默认 bridge 与 user-defined bridge 在「容器名 DNS」上有何区别？生产环境为何更推荐后者？

下一篇见 🐳
