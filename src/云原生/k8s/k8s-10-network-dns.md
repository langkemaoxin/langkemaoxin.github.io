---
title: Underlay/Overlay 网络与集群 DNS 解析
sidebarGroup: Kubernetes
shortTitle: 10 网络与 DNS
order: 10
date: 2026-08-29T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - CNI
  - DNS
description: Underlay/Overlay、IPVLAN 与集群内外 DNS 解析规律。
---

> **Kubernetes 系列 · 第 10/35 篇**  
> 上一篇：[《Service 四层流量分发——iptables、IPVS 与四类 Port》](/云原生/k8s/k8s-09-service-l4) · 下一篇：[《应用持久化存储——Volume、PV 与 PVC》](/云原生/k8s/k8s-11-pv-pvc)

---

## 开头：Pod 跨节点能通，靠的是什么网络？

上一篇讲了 Service 如何在 Node 上用 iptables/ipvs 做四层转发。但 Pod 与 Pod 之间、Node 与 Node 之间的 **Pod IP 如何路由可达**，取决于 CNI 插件选择的 **Underlay** 或 **Overlay** 模型。与此同时，集群内应用很少手写 ClusterIP，而是依赖 **CoreDNS** 解析 `<service>.<namespace>.svc.cluster.local`。

本篇梳理 Underlay/Overlay 的差异、Flannel/Calico 等典型实现、IPVLAN 等高性能方案，以及 Service/Pod 的 DNS 域名规则与验证方法。

---

## 一、Underlay 与 Overlay 是什么

![Underlay 与 Overlay 概念对比](/云原生/k8s/p275-01.png)

| 概念 | 定义 |
|------|------|
| **Underlay** | 由交换机、路由器、DWDM 等物理设备构成的承载网，负责真实数据包传输 |
| **Overlay** | 在 Underlay 之上用隧道/虚拟化技术构建的逻辑网络，业务与物理拓扑解耦 |

Overlay 的多实例化可服务同一租户的多业务或不同租户，是 SD-WAN、数据中心组网的核心技术之一。

### 1.1 为什么需要 Overlay

传统 Underlay 依赖硬件转发，存在局限：

- 路径依赖物理拓扑，变更耗时长；
- 难以在互联网上保证私密通信；
- 网络切片、多路径负载分担实现复杂。

Overlay 通过 **隧道封装**（VXLAN、IPIP、GRE 等）在现有 Underlay 上叠加逻辑网络：

- 流量不绑定特定物理线路；
- 可按需建立虚拟拓扑，无需改底层布线；
- 支持加密、分段、多路径。

![Overlay 在 Underlay 之上构建逻辑网络](/云原生/k8s/p276-01.png)

---

## 二、Kubernetes 中的 Underlay 网络

Underlay Network 指 Node、交换机、路由器等基础设施组成的物理/二层/三层拓扑。

![K8s 场景下的 Underlay 拓扑](/云原生/k8s/p277-01.png)

- **二层 Underlay**：以太网 + VLAN；
- **三层 Underlay**：Internet 式路由，域内 OSPF/IS-IS，域间 BGP；广域也可用 MPLS。

在 Kubernetes 中，典型 Underlay 做法是 **把 Node 当作路由器**，Pod 网段以路由条目形式发布到集群，实现跨节点直连。

![K8s Underlay：Node 作路由器，Pod 路由可达](/云原生/k8s/p277-02.png)

### 2.1 Flannel host-gw 模式

Flannel **host-gw** 要求所有 Node 处于**同一二层网络**，Node 作为网关，跨节点通信走**路由表**而非隧道。

![Flannel host-gw 二层以太网拓扑](/云原生/k8s/p278-01.png)

**注意**：集群 Pod CIDR 建议至少 `/16`，以便「每 Node 一个子网、同 Node 上 Pod 共子网」。若子网划分不当，会出现路由不可达。

### 2.2 Calico BGP 模式

Calico 用 **BGP**（Border Gateway Protocol）在 Node 间分发 Pod 路由，去中心化、无集中控制面瓶颈。

与 host-gw 网络模型相近，但实现不同：

- Flannel：`flanneld` 维护路由；
- Calico：**Felix** 写本机路由/iptables，**BIRD** 作为 BGP 客户端与 Route Reflector 或 ToR 交换路由。

![Calico 网络架构：Felix + BIRD](/云原生/k8s/p279-01.png)

同一 IBGP 域内，BGP 客户端只需连接 RR，减少全互联连接数。

---

## 三、IPVLAN 与 MACVLAN

IPVLAN / MACVLAN 是**网卡虚拟化**技术，严格说更接近把 Pod 网络「拉平」到 Node 同级，而非传统 Overlay 隧道。

| 技术 | 特点 |
|------|------|
| **IPVLAN** | 一个物理网卡多个 IP，虚拟接口**共享同一 MAC** |
| **MACVLAN** | 一个物理网卡多个 MAC，每个虚拟接口可有独立 IP |

常见 Pod 联网模型对比：

1. **veth + 网桥**：veth pair 一头在 Pod、一头在宿主机 root ns，经网桥接入（Docker 默认 bridge 类似）；
2. **多路复用**：中间设备多虚拟接口，按 MAC/IP 区分报文；
3. **硬件交换 / SR-IOV**：每 Pod 分配 VF，接近物理机互通性能。

![IPVLAN 将 Pod 网络与 Node 网络拉平](/云原生/k8s/p279-02.png)

支持 SR-IOV 的网卡可将单一 PF 虚拟为多个 VF，Pod 绑定 VF 获得接近线速的 IO。

### 3.1 Kubernetes 中的 IPVLAN 实践

典型 CNI：**Multus**、**DANM**（诺基亚开源，面向电信级网络）。

**Multus** 组合「默认 CNI + 额外网络」：

- 默认 `eth0` 仍由 Flannel 等提供集群网络；
- 额外 VF（如 `south0`/`north0`）可走 SR-IOV + DPDK，用于高性能面。

![Multus + SR-IOV 多接口 Pod](/云原生/k8s/p280-01.png)

也可将主机物理接口直接移入 Pod netns（需接口存在且不与默认网络冲突），此时 Pod 与 Node 处于同一 L2/L3 平面。

![Multus Overlay 与 IPVLAN 架构](/云原生/k8s/p281-01.png)

**DANM** 同样支持 SR-IOV/DPDK 与 IPVLAN，面向 telco 级 K8s 部署。

---

## 四、Overlay 网络模型

Overlay 使用 **隧道协议** 封装帧/包，在 Underlay 上传输，对端解封装，Underlay 无感知。

![Overlay 隧道封装示意](/云原生/k8s/p281-02.png)

### 4.1 常见隧道技术

| 协议 | 层级 | 说明 |
|------|------|------|
| **GRE** | L3 | 通用路由封装 |
| **IPIP** | L3 | IP in IP，Linux `ipip.ko` |
| **VXLAN** | L2 over L4 UDP | 默认端口 4789，VNID 24 位（约 1600 万逻辑网） |
| **NVGRE / Geneve** | 其他 Overlay 标准 | 各厂商/场景选用 |

Flannel、Calico 的 VXLAN/IPIP 模式均属 Overlay。

### 4.2 IPIP

IPIP 通过内核模块封装 IP 包。检查/加载模块：

```bash
lsmod | grep ipip
modprobe ipip
```

与 VXLAN 不同：VXLAN 外层是 UDP，IPIP 外层仍是 IP 头。

![IPIP 工作流](/云原生/k8s/p282-01.png)

![Kubernetes 中 IPIP 跨 Node 通信](/云原生/k8s/p282-02.png)

**注意**：部分公有云（如 Azure）可能禁止 IPIP 流量。

### 4.3 VXLAN

Linux 自 3.7+ 支持 VXLAN，生产建议 3.9/3.10+。

Flannel 维护 `flannel.1` 等 VTEP 设备，跨 Node 时查 FDB/MAC 表，封装 UDP 发往对端 VTEP。

```bash
bridge fdb show dev flannel.1
# 26:5e:87:90:91:fc dev flannel.1 dst 10.0.0.3 self permanent
```

![VXLAN 简单拓扑](/云原生/k8s/p283-01.png)

![Kubernetes 中 VXLAN 跨 Node](/云原生/k8s/p283-02.png)

Flannel 在 Linux 上默认 VXLAN 端口 **8472**（非 IANA 4789），Wireshark 可能只显示为 UDP。

![VXLAN 抓包解封装](/云原生/k8s/p284-01.png)

### 4.4 Weave Net（fastdp）

Weave 使用 VXLAN + Linux **openvswitch datapath**（fastdp），并对流量加密。内核 **≥ 3.12** 走 fastdp；更低版本回退 **sleeve** 用户态模式，性能较差。

![Weave fastdp 拓扑](/云原生/k8s/p284-02.png)

![Weave 网络模式](/云原生/k8s/p285-01.png)

---

## 五、Underlay vs Overlay 选型参考

| 场景 | 倾向 |
|------|------|
| 同机房二层、追求简单高性能 | Flannel host-gw、Calico BGP（Underlay 路由） |
| 跨三层、公有云、多租户 | Flannel/Calico VXLAN、Cilium |
| 极低延迟、NFV、DPDK | IPVLAN/SR-IOV + Multus |
| 云厂商禁止 IPIP | 优先 VXLAN 或其他 |

Service 的 ClusterIP 转发（第 9 篇）解决「稳定入口」；CNI 解决「Pod IP 如何跨 Node 可达」——二者配合才构成完整集群网络。

---

## 六、集群内 Service DNS

在集群内，**Service 名是稳定的**，即使 ClusterIP 由控制面自动分配。应用应优先使用 DNS 而非硬编码 IP。

### 6.1 Service 域名格式

```
<servicename>.<namespace>.svc.<clusterdomain>
```

- `servicename`：Service 名称；
- `namespace`：命名空间；
- `clusterdomain`：默认 **`cluster.local`**（可在 kubelet 配置 `--cluster-domain` 修改）。

示例：`nginx-gateway-svc.default.svc.cluster.local`

同 Namespace 内可简写为 `nginx-gateway-svc` 或 `nginx-gateway-svc.default`。

### 6.2 Pod 域名格式

```
<pod-ip-dashed>.<namespace>.pod.cluster.local
```

例如 Pod IP `10.244.1.5` → `10-244-1-5.default.pod.cluster.local`（Headless / 调试场景）。

### 6.3 实操验证

**1. 创建 Namespace**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nginx-ns
  labels:
    name: lb-nginx-ns
```

**2. 创建 Deployment**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-gateway-deployment
  labels:
    app: nginx-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-gateway
  template:
    metadata:
      labels:
        app: nginx-gateway
    spec:
      containers:
        - name: nginx-gateway
          image: nginx:1.25
          ports:
            - containerPort: 8008
```

**3. 创建 Service**

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
    - port: 8008
      targetPort: 8008
      nodePort: 31090
      protocol: TCP
```

**4. 在 Pod 内测试 DNS**

```bash
kubectl run dns-test -i --tty --image=busybox --restart=Never --rm -- /bin/sh
# wget -O- http://nginx-gateway-svc.nginx-ns.svc.cluster.local:8008
```

**重要**：在**宿主机**上 `curl` Service 域名通常**不通**——CoreDNS 解析与 ClusterIP 路由是集群内机制，宿主机 DNS 未指向集群 DNS 或未加入集群网络。

---

## 七、DNS 解析链路简述

1. Pod `/etc/resolv.conf` 指向 kube-dns/CoreDNS Service（通常 `10.96.0.10`）；
2. 查询 `*.svc.cluster.local` 由 CoreDNS **`kubernetes` 插件** 从 apiserver 读取 Service/Endpoint；
3. 普通 Service 返回 ClusterIP；Headless 返回 Pod IP 列表。

自定义 `cluster.local` 后缀时，需同步修改 kubelet、CoreDNS ConfigMap 与应用配置。

---

## 八、NetworkPolicy：Pod 级网络防火墙

前文解决的是「**怎么通**」（Underlay/Overlay 打通 Pod 网络），NetworkPolicy 解决「**该不该通**」——默认 K8s 网络是**全通**的：任何 Pod 可以访问任何 Pod 与 Service。生产上（尤其多租户/前后端分离）需要按白名单收紧（官方 [docs](https://kubernetes.io/docs/concepts/services-networking/network-policies/)）。

**心智模型三条**：

- NetworkPolicy **作用于 Pod**（通过 `podSelector` 选中），描述「谁能进（ingress）/谁能出（egress）」；
- **一旦某 Pod 被任意 Policy 选中，它就进入白名单模式**——没被规则允许的流量一律丢弃；
- 没被任何 Policy 选中的 Pod 保持全通。

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow-web-only
  namespace: prod
spec:
  podSelector:
    matchLabels:
      app: api                  # 作用于 api Pod
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: web          # 只允许 web 进
      ports:
        - protocol: TCP
          port: 8080
```

| 要点 | 说明 |
|------|------|
| **必须 CNI 支持** | NetworkPolicy 由 **CNI 插件实现**（Calico、Cilium 等），Flannel 等不支持时写了也不生效——先确认插件（[Cilium 部署](/云原生/k8s/k8s-29-advanced-network/)） |
| 默认全通 → 先加「deny all」 | 常见起步：给 namespace 加一条「禁止所有入站」的策略，再逐条放行 |
| 命名空间间隔离 | `from` 里用 `namespaceSelector` 可按 ns 放行/禁止 |

> 💡 Service 层面的访问控制是 RBAC（管 API），**数据面**的访问控制就是 NetworkPolicy——一个管「能不能操作对象」，一个管「包能不能过去」，二者互补，见 [16 篇安全节](/云原生/k8s/k8s-12-secret-configmap)。

---

## 九、小结

| 主题 | 要点 |
|------|------|
| Underlay | 物理/路由承载；host-gw、Calico BGP 把 Node 当路由器 |
| Overlay | VXLAN/IPIP/GRE 隧道；跨三层、云环境常见 |
| IPVLAN | 高性能、Pod 与 Node 同平面；Multus/DANM |
| Service DNS | `<svc>.<ns>.svc.cluster.local` |
| Pod DNS | `<ip-dashed>.<ns>.pod.cluster.local` |
| 访问范围 | Service DNS **仅集群内**有效 |

> ➡️ 下一篇：[《Ingress 七层流量分发——原理、部署模式与动态域名》](/云原生/k8s/k8s-13-ingress-l7)

---

## 延伸阅读

- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Flannel / Calico 官方文档](https://github.com/flannel-io/flannel)
