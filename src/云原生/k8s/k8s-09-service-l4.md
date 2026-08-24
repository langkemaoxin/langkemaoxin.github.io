---
title: Service 四层流量分发——iptables、IPVS 与四类 Port
sidebarGroup: Kubernetes
shortTitle: 09 Service 四层
order: 9
date: 2026-08-29T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - Service
  - kube-proxy
description: Service 类型、kube-proxy 的 iptables/IPVS，以及四类 Port 与会话保持。
---

> **Kubernetes 系列 · 第 9/35 篇**  
> 上一篇：[《HPA 自动伸缩与 CRI/CNI/CSI/CRD 扩展点》](/云原生/k8s/k8s-08-hpa-cri-crd) · 下一篇：[《Underlay/Overlay 网络与集群 DNS 解析》](/云原生/k8s/k8s-10-network-dns)

---

## 开头：Pod IP 总在变，集群内怎么稳定访问？

Deployment 扩缩容、节点故障自愈、滚动更新——Pod 随时可能被创建、迁移或销毁，**Pod IP 是动态的**。如果业务直接写死 Pod IP，一旦副本漂移，调用方立刻失联。

Kubernetes 的 **Service** 就是为解决「Pod IP 漂移」而设计的抽象层：对内通过 Label Selector 选中一组 Pod 并维护 Endpoint；对外提供一个相对稳定的访问入口（ClusterIP、NodePort 或云 LB）。本篇从 Service 四种类型讲起，再深入到 kube-proxy 三种代理模式、iptables 四表五链，以及 nodePort / port / targetPort / containerPort 的完整转发链路。

---

## 一、Service 要解决什么问题

![Pod IP 漂移与 NodePort 暴露思路](/云原生/k8s/p245-01.png)

Pod 具有强大的副本控制与自愈能力，但也带来副作用：**任意时刻 Pod 可能出现在任意节点，也可能随时被销毁**。客户端若直接访问 Pod IP，就必须不断感知 IP 变化。

Service 的做法是：

- **对内**：通过 Label Selector 匹配一组 Pod，持续维护 Endpoint 列表，在 Pod IP 变化时自动更新；
- **对外**：暴露 Service IP（或 NodePort / 云 LB），客户端只需记住 Service 地址，不必关心后端 Pod 落在哪台机器。

![Service 对内选副本、对外做代理](/云原生/k8s/p246-01.png)

Service 提供的是 **四层（TCP/UDP over IP）负载均衡**，默认轮询（RR）。若需要按 URL、Host、Header 做七层路由，需要 Ingress 或 Gateway API（见第 12 篇）。

---

## 二、四种 Service 类型

| 类型 | 作用 | 典型场景 |
|------|------|----------|
| **ClusterIP** | 分配集群内虚拟 IP，仅集群内可达 | 微服务间调用、默认类型 |
| **NodePort** | 在 ClusterIP 基础上，每个 Node 开放固定高端口 | 开发测试、无 LB 时的外部访问 |
| **LoadBalancer** | 在 NodePort 基础上，云厂商创建外部 LB | 公有云生产入口 |
| **ExternalName** | 将集群外 DNS 名映射为集群内 CNAME | 访问外部 SaaS、遗留系统 |

类型之间是**叠加关系**：`LoadBalancer = ClusterIP + NodePort + 外部 LB`。

### 2.1 ClusterIP（集群内部访问）

ClusterIP 是默认类型，自动分配一个**仅在集群内路由可达**的虚拟 IP。集群内可通过 `ClusterIP:port` 或 **Service DNS 名**访问（见第 10 篇）。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: apache
  namespace: default
spec:
  type: ClusterIP
  selector:
    app: apache
  ports:
    - port: 80
      protocol: TCP
      targetPort: 80
```

集群内验证：

```bash
kubectl run dns-test -i --tty --image=busybox:latest --restart=Never --rm -- /bin/sh
# 在容器内
curl http://apache.default.svc.cluster.local:80
```

### 2.2 NodePort（节点端口暴露）

NodePort 在每个 Node 上监听同一高端口（默认 **30000–32767**），将流量转发到 Service，再 DNAT 到 Pod。

特征：

1. 每个端口只能绑定一种 Service；
2. 端口范围默认 30000–32767（可通过 `--service-node-port-range` 调整）；
3. YAML 未指定 `nodePort` 时由 apiserver 自动分配。

![NodePort 原理：Node 上开端口，经 kube-proxy 到 Pod](/云原生/k8s/p248-01.png)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-gateway-svc
spec:
  type: NodePort
  selector:
    app: nginx-gateway
  ports:
    - port: 8008        # Service 端口（ClusterIP 上）
      targetPort: 8008  # Pod 容器端口
      nodePort: 32701   # Node 对外端口（可选，省略则自动分配）
      protocol: TCP
```

外部访问：`http://<NodeIP>:32701`。NodePort 适合实验；生产环境端口数量随 Service 增长会难以管理，更推荐 Ingress 或云 LB。

![NodePort 实操示意](/云原生/k8s/p250-01.png)

### 2.3 LoadBalancer

LoadBalancer 在 NodePort 之上，由 **cloud-controller** 向云平台申请 ELB/SLB，将外部流量导入 NodeIP:NodePort。深度绑定 IaaS，私有云需 OpenStack、MetalLB 等替代方案。

### 2.4 ExternalName

无代理、无 ClusterIP，仅创建 CNAME 记录，将集群内 DNS 名指向外部域名（需 kube-dns/CoreDNS 支持）。

---

## 三、Service 与 Pod 的 DNS

| 对象 | DNS 模式 | 解析结果 |
|------|----------|----------|
| 普通 Service | `<svc>.<ns>.svc.cluster.local` | ClusterIP（A 记录） |
| Headless Service | 同上 | 后端 Pod IP 列表（无 ClusterIP） |
| Pod | `<pod-ip-dashed>.<ns>.pod.cluster.local` | Pod IP |

Headless Service（`clusterIP: None`）常用于 StatefulSet，让客户端直接连 Pod IP 或通过 DNS 做 Pod 级发现。

---

## 四、kube-proxy 与 VIP 代理模式

每个 Node 运行 **kube-proxy**，为 Service 实现 VIP（虚拟 IP）形式的四层代理（ExternalName 除外）。

| Kubernetes 版本 | 默认 kube-proxy 模式 |
|-----------------|----------------------|
| 1.0 | userspace |
| 1.1 | 新增 iptables，非默认 |
| 1.2+ | **iptables 默认** |
| 1.4+ | 新增 ipvs，1.11 起生产可用 |
| 1.14+ | ipvs 在大集群中更常见 |

Service 是四层概念；七层路由由 **Ingress**（1.1 beta）承担。

![kube-proxy 监听 Service 变化并生成转发规则](/云原生/k8s/p252-01.png)

创建 Service 时 apiserver 写入 etcd；kube-proxy 通过 List-Watch 感知变化，将 Service/Endpoint 转换为 **userspace / iptables / ipvs** 规则，并在**每个 Node** 上生效——因此任意 Node 上访问 ClusterIP 都能被正确转发。

### 4.1 userspace 模式（已淘汰）

![userspace：流量经 kube-proxy 用户态进程转发](/云原生/k8s/p253-01.png)

kube-proxy 为每个 Service 监听端口，iptables 将 ClusterIP 流量重定向到该端口，再由 kube-proxy 按 RR 选 Pod 并建立连接。

**缺点**：数据包需多次穿越内核/用户态，性能差；kube-proxy 监听 apiserver 压力大。**优点**：可在用户态实现更灵活的 LB 策略。现代集群几乎不再使用。

### 4.2 iptables 模式（长期默认）

![iptables：规则链直接 DNAT 到 Pod，kube-proxy 不转发数据面](/云原生/k8s/p254-01.png)

kube-proxy 为每个 Endpoint 写 iptables 规则，发向 ClusterIP 的包**直接 DNAT** 到某个 Pod IP，数据面不再经过 kube-proxy 进程。

**优点**：稳定、高效，kube-proxy 只负责写规则。**缺点**：规则随 Service/Endpoint 增多而膨胀；默认 RR，后端 Pod 不可用时的重试能力有限。

### 4.3 ipvs 模式（大集群推荐）

![ipvs：内核 IPVS 模块做负载均衡](/云原生/k8s/p255-01.png)

ipvs（IP Virtual Server）运行在内核，在真实服务器前充当四层 LB。kube-proxy 维护 ipvs 规则而非海量 iptables 链。

**调度算法**：`rr`（轮询）、`lc`（最少连接）、`dh`（目标地址哈希）、`sh`（源地址哈希）、`sed`、`nq` 等。

**前提**：Node 已加载 IPVS 内核模块（`modprobe ipip ip_vs` 等）；未安装时会**降级为 iptables**。

| 对比项 | iptables | ipvs |
|--------|----------|------|
| 大规模 Service | 规则线性增长，性能下降 | 哈希表，扩展性更好 |
| LB 算法 | 基本 RR | 多种算法 |
| 健康检查 | 无 | 可配合 |
| 底层 | netfilter | netfilter |

---

## 五、iptables / netfilter 基础

kube-proxy 的 iptables 模式依赖 Linux **netfilter** 框架。

![netfilter 与 iptables 用户态/内核态关系](/云原生/k8s/p257-01.png)

- **netfilter**：内核中的包过滤框架，真正执行规则；
- **iptables**：用户态 CLI，把规则写入 netfilter；
- `systemctl start iptables` 启动的并非独立守护进程，而是加载内核 netfilter 配置。

### 5.1 五链（Hook 点）

报文经过 netfilter 的五个 Hook 点，在 iptables 中称为 **链**：

| 链 | 含义 |
|----|------|
| **PREROUTING** | 路由决策前 |
| **INPUT** | 路由到本机 |
| **FORWARD** | 经本机转发 |
| **OUTPUT** | 本机进程发出 |
| **POSTROUTING** | 出网卡前 |

常见路径：

- 访问本机进程：`PREROUTING → INPUT`
- 本机转发：`PREROUTING → FORWARD → POSTROUTING`
- 本机发出：`OUTPUT → POSTROUTING`

![报文经过各链的流程](/云原生/k8s/p258-01.png)

### 5.2 四表

规则按功能分到四张 **表**，优先级：`raw > mangle > nat > filter`。

| 表 | 作用 |
|----|------|
| **filter** | 过滤（ACCEPT/DROP/REJECT） |
| **nat** | 地址转换（SNAT/DNAT/MASQUERADE） |
| **mangle** | 修改 TTL、Mark 等 |
| **raw** | 连接跟踪前处理，常用于绕过 conntrack 提升性能 |

各链可挂哪些表（节选）：

- PREROUTING：raw、mangle、**nat**
- INPUT：mangle、filter、nat（部分发行版）
- FORWARD：mangle、filter
- OUTPUT：raw、mangle、nat、filter
- POSTROUTING：mangle、**nat**

![链与表的对应关系](/云原生/k8s/p259-01.png)

![数据包穿越防火墙流程图](/云原生/k8s/p260-01.png)

**规则** = 匹配条件（源/目的 IP、端口、协议等）+ 动作（ACCEPT、DROP、DNAT、SNAT、MARK…）。

---

## 六、四类 Port 详解

这是 K8s 网络中最易混淆的概念：**nodePort、port、targetPort、containerPort** 处在转发链路的不同位置。

![四类 Port 在转发链路上的位置](/云原生/k8s/p262-01.png)

### 6.1 nodePort

- **作用**：集群**外部**客户端访问 Service 的入口，形式为 `NodeIP:nodePort`；
- **实现**：kube-proxy 在每个 Node 监听该端口，经 NAT + Service 规则转到 Pod；
- **注意**：生产环境大量 Service 各占一个 NodePort 难以运维，应配合 Ingress / LB。

![nodePort 外部流量经 NAT 进入虚拟 Service 网络](/云原生/k8s/p263-01.png)

### 6.2 port

- **作用**：暴露在 **ClusterIP** 上的端口，集群内访问形式为 `ClusterIP:port` 或 DNS 名 + port；
- **习惯**：常与 `targetPort` 设为相同值，但二者语义不同。

![port 是 ClusterIP 上的 Service 端口](/云原生/k8s/p263-02.png)

### 6.3 targetPort

- **作用**：Service 将流量转发到 **Pod 上**的端口；
- **来源**：通常与容器 `containerPort` 或 Dockerfile `EXPOSE` 一致；
- **可写名称**：`targetPort` 也可引用 Pod 中 `port.name`。

![targetPort 指向 Pod 监听端口](/云原生/k8s/p263-03.png)

### 6.4 containerPort

- **作用**：Pod 模板中声明容器**计划暴露**的端口，主要是文档与规范作用；
- **非必须**：即使不写，只要 Service `targetPort` 正确，流量仍可到达进程监听端口。

![containerPort 在 Pod spec 中的声明](/云原生/k8s/p264-01.png)

### 6.5 转发路径小结

| 访问方 | 路径 |
|--------|------|
| 集群外 | `NodeIP:nodePort` → iptables/ipvs → `PodIP:targetPort` |
| 集群内 | `ClusterIP:port` 或 DNS → iptables/ipvs → `PodIP:targetPort` |
| 同 Pod 内容器 | `localhost:containerPort` |

---

## 七、iptables 在 K8s 中的实现

kube-proxy 主要修改 **filter** 与 **nat** 表，并扩展自定义链：

| 链 | 作用 |
|----|------|
| KUBE-SERVICES | 挂在 PREROUTING/OUTPUT，Service 流量入口 |
| KUBE-NODEPORTS | NodePort 匹配（须在 KUBE-SERVICES 末尾） |
| KUBE-SVC-* | 每个 Service 一条链 |
| KUBE-SEP-* | 每个 Endpoint（Pod）的 DNAT 规则 |
| KUBE-MARK-MASQ | 打 0x4000 标记，POSTROUTING 做 SNAT |
| KUBE-MARK-DROP | 打 0x8000 标记，KUBE-FIREWALL 丢弃 |
| KUBE-POSTROUTING | MASQUERADE 出站 |

**ClusterIP 访问**：目的 IP 为 ClusterIP、目的端口为 Service port → 进入 `KUBE-SVC-*` → `KUBE-SEP-*` → **DNAT** 为 `PodIP:targetPort`。

**NodePort 访问**：目的为本机地址且端口为 nodePort → `KUBE-NODEPORTS` → 同样进入对应 `KUBE-SVC-*`。与 ClusterIP 的差别仅在**匹配条件**（Cluster IP vs 本地 nodePort）。

ClusterIP **不是真实接口 IP**，仅用于在本 Node 的 iptables 中查找 Endpoint；跨 Node 访问 Pod 时实际走 **Pod IP**（依赖 CNI 路由/隧道，见第 10 篇）。

![K8s 节点 iptables 规则结构示意](/云原生/k8s/p270-01.png)

### 7.1 路由实例：heketi NodePort Service

```
ClusterIP:  10.96.125.27:8080
NodePort:   31131
Endpoint:   10.254.20.8:8080
```

外部：`{NodeIP:31131}` → DNAT → `{10.254.20.8:8080}`  
集群内：`{10.96.125.27:8080}` → DNAT → `{10.254.20.8:8080}`

排查建议：`iptables-save` 看完整规则 + `iptables -t nat -nvL` 看链结构；连接状态可查 `/proc/net/nf_conntrack`。

![Service 路由与 DNAT/SNAT 流程](/云原生/k8s/p270-02.png)

---

## 八、Session Affinity（会话保持）

默认 kube-proxy 使用轮询。对依赖 Session 的应用，可在 Service 上启用 **基于客户端 IP 的会话保持**：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: service-clusterip
  namespace: dev
spec:
  type: ClusterIP
  clusterIP: 10.97.97.97
  sessionAffinity: ClientIP
  selector:
    app: nginx-pod
  ports:
    - port: 80
      targetPort: 80
```

同一客户端 IP 的请求会固定转发到同一 Pod（Pod 重启或 Endpoint 变化时仍可能漂移）。更可靠的会话方案应使用 **Cookie、JWT 或无状态设计**。

---

## 九、EndpointSlices 与流量拓扑：Service 背后的数据面

### 9.1 EndpointSlices：Endpoints 的现代形态

前面说「Service 通过 Endpoints 找到 Pod」，更准确地说，1.19 起默认由 **EndpointSlice** 承担这个角色（官方 [docs](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)）：每个 Service 对应**一组** EndpointSlice（默认每片最多 100 个端点），而不是一条巨大的 Endpoints 对象。

| 对比 | Endpoints（老） | EndpointSlices（现） |
|------|-----------------|----------------------|
| 组织方式 | 一个对象塞下**全部**端点 | 切片，每片 ≤100 端点，可分散到多节点 |
| 大规模 Service | 端点一变全量重写，Watch 风暴 | 单片更新，变更开销小 |
| 附加信息 | 只有 IP:Port | 带 **就绪、拓扑（节点/区）、Tolerations** 等元数据 |

```bash
kubectl get endpointslices -l kubernetes.io/service-name=my-svc
# NAME                  ADDRESSTYPE ... ENDPOINTS
# my-svc-abc12   IPv4         10.244.1.5,10.244.2.8,...
```

> 💡 排障时看它比看 Endpoints 直观：`Ready` 列为 false 的端点不会被转发——**Service 通了但请求 503**，先查这里 Pod 是不是 NotReady/探针失败。它带的拓扑信息也是下一节流量策略的基础。

### 9.2 Service Internal Traffic Policy：集群内流量也「就近」

`internalTrafficPolicy: Local`（1.26 起稳定）让 **集群内部**访问 Service 时只路由到**本节点上的端点**，跳过跨节点 SNAT 一跳，降低延迟（调用方与被调方同节点部署时收益明显）：

```yaml
spec:
  type: ClusterIP
  internalTrafficPolicy: Local   # 默认 Cluster（可跨节点）；Local=仅本节点端点
```

> ⚠️ Local 的代价：本节点没有健康端点时**直接连不通**（不会 fallback 到其他节点），只适合「每个节点都有完整服务副本」的形态（如 DaemonSet 服务、配合 [07 篇](/云原生/k8s/k8s-07-daemon-stateful-job)的调度策略）。它和 NodePort 的 `externalTrafficPolicy: Local` 是同一思想的内外两个入口。

---

## 十、小结

| 主题 | 要点 |
|------|------|
| Service 类型 | ClusterIP / NodePort / LoadBalancer / ExternalName |
| kube-proxy | userspace → iptables（默认）→ ipvs（大集群） |
| iptables | 四表五链；Service 流量走 nat 表自定义 KUBE-* 链 |
| 四类 Port | nodePort（Node 外）→ port（ClusterIP）→ targetPort（Pod）→ containerPort（声明） |
| 会话保持 | `sessionAffinity: ClientIP` |

> ➡️ 下一篇：[《Underlay/Overlay 网络与集群 DNS 解析》](/云原生/k8s/k8s-10-network-dns)

---

## 延伸阅读

- [Kubernetes Service 官方文档](https://kubernetes.io/docs/concepts/services-networking/service/)
- [kube-proxy 代理模式](https://kubernetes.io/docs/reference/networking/virtual-ips/)
