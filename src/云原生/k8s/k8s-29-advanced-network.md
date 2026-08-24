---
title: 网络进阶——Cilium、Hybridnet、双栈与 Traefik
sidebarGroup: Kubernetes
shortTitle: 29 网络进阶 Cilium
order: 29
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: K8s 网络进阶四题：Cilium eBPF 网络加速、Hybridnet Underlay 方案、IPv4/IPv6 双栈集群与 Traefik 服务暴露。
---

> **Kubernetes 系列 · 第 29/35 篇**  
> 上一篇：[《项目上云实战——Java/Python/Golang 与中间件部署》](/云原生/k8s/k8s-28-app-onboarding)  
> 下一篇：[《Service Mesh 与 Istio——Sidecar 架构与 Bookinfo》](/云原生/k8s/k8s-30-service-mesh-istio)

---

## 开头：从概念到落地，四个具体的网络方案

前面第 [10 篇](/云原生/k8s/k8s-10-network-dns)讲了 Underlay/Overlay 与 CNI 的概念模型，第 [9 篇](/云原生/k8s/k8s-09-service-l4)讲了 Service 的四层转发，第 [12 篇](/云原生/k8s/k8s-13-ingress-l7)用 ingress-nginx 做了七层暴露。概念清楚了，本篇把它们落到四个具体的落地方案上：

- **Cilium**：用 eBPF 取代 iptables/kube-proxy，给集群网络「提速」，顺带获得 Hubble 可观测性；
- **Hybridnet**：阿里开源的 Underlay 方案，让 Pod 直接拿到物理网段 IP；
- **IPv4/IPv6 双栈**：从节点、kube-apiserver 到 CNI 的完整双栈集群配置；
- **Traefik**：ingress-nginx 之外的另一款 Ingress Controller，CRD 路由 + 中间件生态。

四个方案互相独立，可以按需跳读；最后给一张选型速查表。

---

## 一、Cilium：eBPF 网络加速

### 1.1 eBPF 取代 iptables 的收益

Cilium 与其他 CNI 插件最大的不同在于其底层使用了 **eBPF** 技术：它生成内核级别的 BPF 程序与容器直接交互，在 Linux 内核中直接完成转发、负载均衡与安全策略，而不需要像 kube-proxy 那样维护庞大的 iptables/ipvs 规则链。

| 维度 | iptables/kube-proxy | Cilium/eBPF |
|------|--------------------|-------------|
| 转发路径 | 内核 netfilter 规则链，规则数随 Service 线性增长 | eBPF 程序在内核态直接查表转发，规模增大时性能衰减小 |
| 观测能力 | 需抓包/conntrack，缺少 L7 视角 | Hubble 直接导出 L3/L4/L7 流量事件 |
| 策略执行 | iptables 规则，基于 IP/端口 | 基于容器标签的 eBPF 策略，可精确到 HTTP/gRPC/Kafka |
| 配置更新 | 规则全量刷新，Service 多时延迟明显 | BPF map 增量更新 |

Cilium 在第 3/4 层提供传统的网络和安全服务，也在第 7 层运行以保护现代应用协议（HTTP、gRPC、Kafka）的使用；它允许每个容器分配一个 IPv4/IPv6 地址，使用容器标签而不是网络路由规则去完成容器间的网络隔离。

![Cilium 架构](/云原生/k8s-ops/k8s-ops-35-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230904111512204.png)

> 💡 eBPF 对 Linux 内核版本有较高要求，这是 Cilium 与 Flannel/Calico 在部署成本上最大的差异点，见下一节。

### 1.2 内核版本要求与升级

Cilium 官方给出的基础系统要求：

| Requirement | Minimum Version | In cilium container |
|-------------|-----------------|---------------------|
| Linux kernel | >= 4.9.17 | no |
| Key-Value store (etcd) | >= 3.1.0 | no |
| clang+LLVM | >= 10.0 | yes |
| iproute2 | >= 5.9.0 | yes |

各项高级功能对内核版本还有进一步要求：Bandwidth Manager >= 5.1、Egress Gateway >= 5.2、WireGuard 透明加密 >= 5.6、BPF-based host routing >= 5.10、IPv6 BIG TCP >= 5.19。要满足全部需求，内核需要高于 6.3。

CentOS 7 默认的 3.10.x 内核显然不满足要求，使用 elrepo 源升级 kernel-ml：

~~~powershell
导入elrepo gpg key并安装YUM源仓库
# rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
# yum -y install https://www.elrepo.org/elrepo-release-7.0-4.el7.elrepo.noarch.rpm

安装ml版本内核（mainline，长期稳定版本）
# yum --enablerepo=elrepo-kernel install kernel-ml -y

设置新内核为默认内核并重启
# grubby --set-default-index=0
# reboot

重启后检查内核版本是否为新的
# uname -r
~~~

内核版本达标后还要确认 eBPF 相关的编译参数。基础项需要 `CONFIG_BPF`、`CONFIG_BPF_SYSCALL`、`CONFIG_BPF_JIT`、`CONFIG_CGROUP_BPF` 等为 `y` 或 `m`：

~~~powershell
对比当前内核的编译参数，发现两个模块为m（模块方式）
# egrep "^CONFIG_BPF=|^CONFIG_BPF_SYSCALL=|^CONFIG_NET_CLS_BPF=|^CONFIG_BPF_JIT=|^CONFIG_NET_CLS_ACT=|^CONFIG_NET_SCH_INGRESS=|^CONFIG_CRYPTO_SHA1=|^CONFIG_CRYPTO_USER_API_HASH=|^CONFIG_CGROUPS=|^CONFIG_CGROUP_BPF=" /boot/config-6.4.11-1.el7.elrepo.x86_64

CONFIG_BPF=y
CONFIG_BPF_SYSCALL=y
CONFIG_BPF_JIT=y
CONFIG_CGROUPS=y
CONFIG_CGROUP_BPF=y
CONFIG_NET_SCH_INGRESS=m
CONFIG_NET_CLS_BPF=m
CONFIG_NET_CLS_ACT=y
CONFIG_CRYPTO_SHA1=y
CONFIG_CRYPTO_USER_API_HASH=y
~~~

~~~powershell
缺少的这两个模块直接用modprobe加载，并配置开机自动加载
# modprobe cls_bpf
# modprobe sch_ingress

# cat <<EOF | sudo tee /etc/modules-load.d/cilium-base-requirements.conf
cls_bpf
sch_ingress
EOF
~~~

> ⚠️ 主机准备（主机名、双栈网卡、网桥过滤 `br_netfilter`、ipvs 模块、关闭 swap 等）与第 [21 篇](/云原生/k8s/k8s-20-deploy-kubeadm-ha)的 kubeadm 部署流程一致，本篇不再重复；区别只在内核必须升级。

### 1.3 部署 Cilium

kubeadm 完成 1.28 集群初始化后（`--pod-network-cidr=10.244.0.0/16`），下载 cilium-cli 并一键安装：

~~~powershell
# curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/latest/download/cilium-linux-amd64.tar.gz{,.sha256sum}
# tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin
# cilium version
cilium-cli: v0.15.6 compiled with go1.21.0 on linux/amd64
~~~

~~~powershell
使用该命令即可完成cilium的安装
[root@k8s-master01 ~]# cilium install

ℹ️  Using Cilium version 1.14.0
🔮 Auto-detected cluster name: kubernetes
🔮 Auto-detected datapath mode: tunnel
🔮 Auto-detected kube-proxy has been installed
~~~

查看状态，cilium DaemonSet 与 operator 均已就绪：

~~~powershell
[root@k8s-master01 ~]# cilium status
    /¯¯\
 /¯¯\__/¯¯\    Cilium:             OK
 \__/¯¯\__/    Operator:           OK
 /¯¯\__/¯¯\    Envoy DaemonSet:    disabled (using embedded mode)
 \__/¯¯\__/    Hubble Relay:       disabled
    \__/       ClusterMesh:        disabled

Deployment             cilium-operator    Desired: 1, Ready: 1/1, Available: 1/1
DaemonSet              cilium             Desired: 3, Ready: 3/3, Available: 3/3
Cluster Pods:          2/2 managed by Cilium
Helm chart version:    1.14.0
~~~

> 💡 这种 cilium-cli 快速安装方式简单快捷，缺点是缺少自定义参数配置能力，只使用官方默认参数，适合快速初始化学习/测试环境；生产环境建议用 Helm 按需定制。

### 1.4 Hubble：网络流量观测

Cilium 的「加速器」之外，Hubble 是它对比传统 CNI 的另一大卖点。启用后每个节点上的 Cilium Agent 会重启以开启 Hubble gRPC 服务，提供节点本地可观测性；hubble-relay 作为集群级中介汇聚各节点数据：

~~~powershell
[root@k8s-master01 ~]# cilium hubble enable --ui
[root@k8s-master01 ~]# cilium hubble port-forward &
~~~

~~~powershell
测试和hubble-api的连通性
[root@k8s-master01 ~]# hubble status
Healthcheck (via localhost:4245): Ok
Current/Max Flows: 8,305/12,285 (67.60%)
Flows/s: 7.24
Connected Nodes: 3/3
~~~

`hubble observe` 可以直接看到每一条转发决策（FORWARDED/DROPPED），这是 iptables 时代需要抓包才能做到的事：

~~~powershell
[root@k8s-master01 ~]# hubble observe
Aug 22 10:10:55.943: 10.0.2.138:33306 (host) -> kube-system/hubble-relay-755f48648b-qxp6n:4245 (ID:30548) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:55.943: 10.0.2.138:33302 (host) -> kube-system/hubble-relay-755f48648b-qxp6n:4245 (ID:30548) to-endpoint FORWARDED (TCP Flags: ACK, FIN)
Aug 22 10:10:47.079: 10.0.1.210:5353 (host) <> 224.0.0.251:5353 (world) Stale or unroutable IP DROPPED (UDP)
Aug 22 10:10:56.558: 10.0.0.251:48318 (host) -> kube-system/coredns-5dd5756b68-4lb79:8181 (ID:2208) to-endpoint FORWARDED (TCP Flags: SYN)
Aug 22 10:10:56.558: 10.0.0.251:48318 (host) <- kube-system/coredns-5dd5756b68-4lb79:8181 (ID:2208) to-stack FORWARDED (TCP Flags: SYN, ACK)
~~~

Hubble UI 会以 Deployment 方式部署在 kube-system，`cilium hubble ui` 把服务 80 端口转发到宿主机 12000 端口（等同 `kubectl port-forward -n kube-system svc/hubble-ui 12000:80`）：

![Hubble UI 流量视图](/云原生/k8s-ops/k8s-ops-35-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230822181940923.png)

![Hubble UI 服务依赖](/云原生/k8s-ops/k8s-ops-35-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230822181819854.png)

### 1.5 连通性验证

部署一个 Nginx 应用（Deployment + NodePort Service）验证集群可用性：

~~~powershell
[root@k8s-master01 ~]# cat nginx.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginxweb
spec:
  selector:
    matchLabels:
      app: nginxweb1
  replicas: 2
  template:
    metadata:
      labels:
        app: nginxweb1
    spec:
      containers:
      - name: nginxwebc
        image: nginx:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80

---

apiVersion: v1
kind: Service
metadata:
  name: nginxweb-service
spec:
  externalTrafficPolicy: Cluster
  selector:
    app: nginxweb1
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
    nodePort: 30080
  type: NodePort
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f nginx.yaml
deployment.apps/nginxweb created
service/nginxweb-service created
~~~

![通过 NodePort 访问验证](/云原生/k8s-ops/k8s-ops-35-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230904195628388.png)

### 1.6 顺带一提：NetworkPolicy 支持

Cilium 对 Kubernetes **NetworkPolicy** 提供完整支持，且策略由 eBPF 在内核态执行，比 iptables 实现更高效、可观测（被策略 DROP 的流量会直接出现在 Hubble 流里）。网络策略的概念与写法在[第 10 篇](/云原生/k8s/k8s-10-network-dns)中已专门展开，此处不重复。

---

## 二、Hybridnet：Underlay 方案

### 2.1 Underlay 直通的需求

第 [10 篇](/云原生/k8s/k8s-10-network-dns)讲过三种 Pod 跨节点通信模型，这里从「为什么选 Underlay」的角度再对比一次：

| 模型 | 典型实现 | 特点 |
|------|----------|------|
| Overlay | Flannel VXLAN、Calico VXLAN | Pod 地址封装在宿主机报文内，兼容性好、可跨子网，但有封装/解封开销 |
| 直接路由 | Flannel host-gw、Calico BGP | 基于主机路由直接转发，不做报文叠加，性能优于 Overlay |
| Underlay | MAC VLAN、IP VLAN、Hybridnet | 直接使用宿主机物理网络，Pod 可被 K8s 集群外的节点直接访问，性能最好 |

Underlay 场景下 Pod 相当于「桥接模式的虚拟机」：K8s 环境之外的客户端无需 NodePort/Ingress 即可直连 Pod IP，这对已有固定网段规划、要求 Pod IP 可被外部直接路由的传统机房非常友好。

![Overlay 与 Underlay 报文路径对比](/云原生/k8s-ops/k8s-ops-67-k8s-1-26-underlay网络方案-hybridnet/image-20230404151314708.png)

![Pod 通信三种模式](/云原生/k8s-ops/k8s-ops-67-k8s-1-26-underlay网络方案-hybridnet/image-20230404151837989.png)

### 2.2 集群初始化要点

基于 kubeadm 部署 K8s 1.26 集群（部署细节见[第 21 篇](/云原生/k8s/k8s-20-deploy-kubeadm-ha)），Hybridnet 场景下 `--service-cidr` 有两种取法：

~~~powershell
方案1：Pod 可选 overlay 或 underlay，SVC 使用 overlay 网段
kubeadm init --apiserver-advertise-address=192.168.10.160 \
--kubernetes-version=v1.26.3 \
--pod-network-cidr=10.244.0.0/16 \
--service-cidr=10.96.0.0/12 \
--service-dns-domain=cluster.local \
--image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers \
--cri-socket unix:///var/run/cri-dockerd.sock

方案2：SVC 使用 underlay 网段，通过 SVC 可以直接访问 pod
kubeadm init --apiserver-advertise-address=192.168.10.160 \
--kubernetes-version=v1.26.3 \
--pod-network-cidr=10.244.0.0/16 \
--service-cidr=192.168.200.0/24 \
--service-dns-domain=cluster.local \
--image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers \
--cri-socket unix:///var/run/cri-dockerd.sock

--service-cidr= 与已存在的网段不能冲突
~~~

> 💡 方案 2 中 `--pod-network-cidr` 仍保留给后期 Overlay 场景，Underlay 的 CIDR 后期单独指定，Overlay 与 Underlay 在 Hybridnet 里是并存的。

### 2.3 Helm 部署 Hybridnet

Hybridnet 通过 Helm 部署，先安装 helm 二进制（v3.11.2），再添加仓库：

~~~powershell
[root@k8s-master01 ~]# helm repo add hybridnet https://alibaba.github.io/hybridnet/
"hybridnet" has been added to your repositories
[root@k8s-master01 ~]# helm repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "hybridnet" chart repository
Update Complete. ⎈Happy Helming⎈
~~~

~~~powershell
[root@k8s-master01 ~]# helm install hybridnet hybridnet/hybridnet -n kube-system --set init.cidr=10.244.0.0/16
NAME: hybridnet
LAST DEPLOYED: Tue Apr  4 12:14:47 2023
NAMESPACE: kube-system
STATUS: deployed
REVISION: 1
~~~

部署完成后发现 `hybridnet-manager`、`hybridnet-webhook` 的 Pod 一直 Pending，`describe` 排查：

~~~powershell
[root@k8s-master01 ~]# kubectl describe pods hybridnet-manager-55f5488b46-2x5qw -n kube-system
...
Node-Selectors:              node-role.kubernetes.io/master=
Events:
  Warning  FailedScheduling  3m32s (x2 over 3m34s)  default-scheduler  0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector.
~~~

原因是这些组件通过 nodeSelector 选中打了 `node-role.kubernetes.io/master` 标签的节点，而 kubeadm 新版本只打 `control-plane` 标签。补上标签即可：

~~~powershell
[root@k8s-master01 ~]# kubectl label node k8s-master01 node-role.kubernetes.io/master=
node/k8s-master01 labeled

[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS   ROLES                  AGE   VERSION
k8s-master01   Ready    control-plane,master   15h   v1.26.3
k8s-worker01   Ready    <none>                 15h   v1.26.3
k8s-worker02   Ready    <none>                 15h   v1.26.3
~~~

### 2.4 创建 Underlay 网络池

先为参与 Underlay 的节点打标签，再创建 `Network` + `Subnet` 两个 CRD 对象，把物理网段 192.168.10.0/24 中的 10~20 号地址划为 Pod 可用地址池：

~~~powershell
[root@k8s-master01 hybridnet]# kubectl label node k8s-master01 network=underlay-nethost
[root@k8s-master01 hybridnet]# kubectl label node k8s-worker01 network=underlay-nethost
[root@k8s-master01 hybridnet]# kubectl label node k8s-worker02 network=underlay-nethost
~~~

~~~powershell
[root@k8s-master01 hybridnet]# cat 01-create-underlay-network.yaml
---
apiVersion: networking.alibaba.com/v1
kind: Network
metadata:
  name: underlay-network1
spec:
  netID: 0
  type: Underlay
  nodeSelector:
    network: "underlay-nethost"

---
apiVersion: networking.alibaba.com/v1
kind: Subnet
metadata:
  name: underlay-network1
spec:
  network: underlay-network1
  netID: 0
  range:
    version: "4"
    cidr: "192.168.10.0/24"
    gateway: "192.168.10.2"
    start: "192.168.10.10"
    end: "192.168.10.20"
~~~

~~~powershell
[root@k8s-master01 hybridnet]# kubectl create -f 01-create-underlay-network.yaml

[root@k8s-master01 hybridnet]# kubectl get network
NAME                NETID   TYPE       MODE   V4TOTAL   V4USED   V4AVAILABLE   LASTALLOCATEDV4SUBNET
init                4       Overlay           65534     2        65532         init
underlay-network1   0       Underlay          11        0        11            underlay-network1

[root@k8s-master01 hybridnet]# kubectl get subnet
NAME                VERSION   CIDR              START           END             GATEWAY        TOTAL   USED   AVAILABLE   NETID   NETWORK
init                4         10.244.0.0/16                                                    65534   2      65532               init
underlay-network1   4         192.168.10.0/24   192.168.10.10   192.168.10.20   192.168.10.2   11             11          0       underlay-network1
~~~

可以看到 `init`（Overlay，10.244.0.0/16）与 `underlay-network1`（Underlay，192.168.10.0/24）并存，这就是 Hybridnet「双栈并存」的网络池模型。

### 2.5 Underlay Pod 与 Service

给 Pod 的 template 加一个 annotation 即可声明使用 Underlay 网络：

~~~powershell
[root@k8s-master01 hybridnet]# cat 03-tomcat-app1-underlay.yaml
kind: Deployment
apiVersion: apps/v1
metadata:
  name: myserver-tomcat-app1-deployment-underlay
  namespace: myserver
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myserver-tomcat-app1-underlay-selector
  template:
    metadata:
      labels:
        app: myserver-tomcat-app1-underlay-selector
      annotations:
        networking.alibaba.com/network-type: Underlay  # 重点：声明使用underlay网络
    spec:
      containers:
      - name: myserver-tomcat-app1-container
        image: registry.cn-hangzhou.aliyuncs.com/zhangshijie/tomcat-app1:v2
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
          protocol: TCP
          name: http
~~~

~~~powershell
[root@k8s-master01 hybridnet]# kubectl get pods -n myserver -o wide
NAME                                                        READY   STATUS    RESTARTS   AGE   IP              NODE
myserver-tomcat-app1-deployment-overlay-5bb44b6bf6-lnp68    1/1     Running   0          5m13s 10.244.0.17     k8s-worker02
myserver-tomcat-app1-deployment-underlay-7f65f45449-mvkj7   1/1     Running   0          10m   192.168.10.10    k8s-worker01
~~~

Underlay Pod 直接拿到了物理网段地址 `192.168.10.10`，集群外可直连验证：

~~~powershell
[root@k8s-master01 hybridnet]# curl http://192.168.10.10:8080/myapp/
tomcat app1 v2
~~~

![Underlay Pod 直接使用物理网段 IP](/云原生/k8s-ops/k8s-ops-67-k8s-1-26-underlay网络方案-hybridnet/image-20230404131724427.png)

若还想让 **Service 的 ClusterIP 也落在物理网段**（即 2.2 节的方案 2），需在初始化时指定 `--service-cidr=192.168.200.0/24`，并给 Service 加同样的 annotation：

~~~powershell
kind: Service
apiVersion: v1
metadata:
  name: myserver-tomcat-app1-service-underlay
  namespace: myserver
  annotations:
    networking.alibaba.com/network-type: Underlay  # 重点注意这里
spec:
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: 8080
  selector:
    app: myserver-tomcat-app1-underlay-selector
~~~

~~~powershell
[root@k8s-master01 hybridnet]# kubectl get svc -n myserver -o wide
NAME                                    TYPE        CLUSTER-IP        EXTERNAL-IP   PORT(S)   AGE   SELECTOR
myserver-tomcat-app1-service-underlay   ClusterIP   192.168.200.234   <none>        80/TCP    61m   app=myserver-tomcat-app1-underlay-selector
~~~

集群外的 Windows 主机只要加一条静态路由即可直接访问 Underlay Service：

~~~powershell
C:\WINDOWS\system32>route add 192.168.200.0 mask 255.255.255.0 -p 192.168.10.160
说明：去往192.168.200.0/24网段通过192.168.10.160，这个IP为k8s集群节点地址
~~~

![Windows 外部主机加路由后直接访问 Underlay Service](/云原生/k8s-ops/k8s-ops-67-k8s-1-26-underlay网络方案-hybridnet/image-20230406144215187.png)

---

## 三、IPv4/IPv6 双栈

### 3.1 双栈的意义

IPv4 地址枯竭与物联网/5G 场景的海量接入需求，使新建机房越来越多地分配 IPv6 网段。Kubernetes 从 1.21 起 DualStack 转正，支持：

- 每个 Pod 同时拥有 IPv4 与 IPv6 两个 IP；
- 每个 Service 同时拥有 IPv4 与 IPv6 两个 ClusterIP；
- 节点、Pod、Service 全链路双栈，客户端用任一协议族都能访问。

本节基于 K8s 1.22.11 实操（其他版本请自行验证），使用 Antrea 作为 CNI，且必须使用 Open vSwitch 功能。

> ⚠️ 双栈集群要求 **CNI、kube-apiserver、kube-controller-manager、kubelet 全部支持双栈**，任何一环只配了单栈，对应的 Pod/Service 就只有单族地址。

### 3.2 节点双栈 IP 配置

三台节点的 `ifcfg-ens33` 在 IPv4 之外追加 IPv6 静态地址（网段 2003::/64）：

~~~powershell
[root@k8s-master01 ~]# cat /etc/sysconfig/network-scripts/ifcfg-ens33
TYPE="Ethernet"
...
IPADDR="192.168.10.160"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"
IPV6INIT="yes"
IPV6_AUTOCONF="no"
IPV6_DEFROUTE="yes"
IPV6_FAILURE_FATAL="no"
IPV6_ADDR_GEN_MODE="stable-privacy"
IPV6ADDR=2003::11/64
IPV6_DEFAULTGW=2003::1
~~~

~~~powershell
[root@k8s-master01 ~]# systemctl restart network

重启后验证 IPv6 邻居可达（其余两台同理配置为 2003::12/64、2003::13/64）
[root@k8s-master01 ~]# ping6 -c 4 2003::12
PING 2003::12(2003::12) 56 data bytes
64 bytes from 2003::12: icmp_seq=1 ttl=64 time=0.323 ms
64 bytes from 2003::12: icmp_seq=2 ttl=64 time=0.557 ms
64 bytes from 2003::12: icmp_seq=3 ttl=64 time=0.552 ms
64 bytes from 2003::12: icmp_seq=4 ttl=64 time=1.30 ms

--- 2003::12 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3050 ms
~~~

### 3.3 kube-apiserver 与 kubeadm 双栈配置要点

双栈集群的核心是 **Pod 网段与 Service 网段都写成「IPv4 CIDR,IPv6 CIDR」**。kubeadm 会据此自动为 kube-apiserver 生成 `--service-cluster-ip-range=10.96.0.0/16,2005::/110`、为 kube-controller-manager 生成双栈的 CIDR 分配参数：

~~~powershell
[root@k8s-master01 ~]# cat kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  podSubnet: 10.244.0.0/16,2004::/64      # Pod 双栈网段
  serviceSubnet: 10.96.0.0/16,2005::/110  # Service 双栈网段（IPv6 子网掩码最大 /110）
controllerManager:
  extraArgs:
    "node-cidr-mask-size-ipv4": "25"      # 每节点 IPv4 Pod 子网掩码
    "node-cidr-mask-size-ipv6": "80"      # 每节点 IPv6 Pod 子网掩码
imageRepository: ""
clusterName: "smartgo-cluster"
kubernetesVersion: "v1.22.11"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: "192.168.10.160"
  bindPort: 6443
nodeRegistration:
  kubeletExtraArgs:
    node-ip: 192.168.10.160,2003::11      # kubelet 注册双栈节点 IP
~~~

worker 节点 join 时同样要用 `node-ip` 声明双栈地址：

~~~powershell
[root@k8s-worker01 ~]# cat kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: JoinConfiguration
discovery:
  bootstrapToken:
    apiServerEndpoint: 192.168.10.160:6443
    token: "tf68fl.pj4xsh62osypb4bj"
    caCertHashes:
    - "sha256:e4960afef684bbee72ae904356321997a6eef5bb0394a8d74b72ebaa0b638ecd"
nodeRegistration:
  kubeletExtraArgs:
    node-ip: 192.168.10.161,2003::12

[root@k8s-worker01 ~]# kubeadm join --config=kubeadm-config.yaml
~~~

> 💡 掩码规则：默认每 node 使用 /24（IPv4）与 /64（IPv6）为 Pod 分配地址；K8s 强制限制 node 掩码不能比 CIDR 掩码小 16 以上，因此当 IPv6 CIDR 为 /64 时，node 掩码最大 /80。

### 3.4 CNI 双栈配置（Antrea）

Antrea 基于 Open vSwitch 提供数据平面（节点需提前编译安装 OVS 并 `modprobe openvswitch`）。双栈场景下要修改其配置中的三处：封装模式、SNAT 与 Service 双栈网段：

~~~powershell
[root@k8s-master01 ~]# wget https://github.com/antrea-io/antrea/releases/download/v1.11.0/antrea.yml
[root@k8s-master01 ~]# vim antrea.yml

1、禁用overlay封装模式（encap -> noencap）
trafficEncapMode: "noencap"

2、Pod CIDR 可从外部路由到达时，出集群流量不做SNAT（false -> true）
noSNAT: true

3、配置Service的IPv4及IPv6地址段，需与kube-apiserver的配置一致
serviceCIDR: "10.96.0.0/16"
serviceCIDRv6: "2005::/110"

[root@k8s-master01 ~]# kubectl create -f antrea.yml
~~~

![Antrea 架构](/云原生/k8s-ops/k8s-ops-68-k8s-1-22-版本双栈协议-ipv4-ipv6-集群部署/image-20230324174008962.png)

部署完成后节点上会出现 IPv4/IPv6 两套路由，Pod 网段经 `antrea-gw0` 与对端节点直接路由（noencap）：

~~~powershell
[root@k8s-master01 ~]# route -6
Kernel IPv6 routing table
Destination                    Next Hop                   Flag Met Ref Use If
2003::/64                      [::]                       U    100 7      0 ens33
2004::/80                      [::]                       U    256 3      0 antrea-gw0
2004::1:0:0:0/80               k8s-worker01               UG   1024 1      0 ens33
2004::2:0:0:0/80               k8s-worker02               UG   1024 1      0 ens33
~~~

> ⚠️ noencap 模式下 Pod 网段不走隧道，**需要在集群外部设备上设置静态路由**使得 Pod 地址可路由，否则集群外无法直达 Pod。

### 3.5 双栈验证

部署两个 Nginx Pod，每个 Pod 都同时拿到两个协议族的 IP：

~~~powershell
[root@k8s-master01 ~]# kubectl get pods -o yaml | grep ip
    - ip: 10.244.0.130
    - ip: 2004::1:0:0:2
    - ip: 10.244.1.2
    - ip: 2004::2:0:0:2
~~~

直接用 IPv6 地址访问 Pod（curl 访问 IPv6 需加 `-g` 且地址用方括号）：

~~~powershell
[root@k8s-master01 ~]# curl -g -6 [2004::1:0:0:2]
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
...
~~~

Service 的双栈由 `ipFamilyPolicy` 控制，可选 `SingleStack`（默认 IPv4）、`PreferDualStack`、`RequireDualStack`：

~~~powershell
[root@k8s-master01 ~]# cat service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginxweb-v6
spec:
  selector:
    app: nginxweb
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: NodePort
  ipFamilyPolicy: RequireDualStack
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl describe svc nginxweb-v6
Name:                     nginxweb-v6
IP Family Policy:         RequireDualStack
IP Families:              IPv4,IPv6
IP:                       10.96.53.221
IPs:                      10.96.53.221,2005::2c47
Port:                     <unset>  80/TCP
TargetPort:               80/TCP
NodePort:                 <unset>  32697/TCP
Endpoints:                10.244.0.130:80,10.244.1.2:80
~~~

通过 IPv6 ClusterIP 访问 Service 成功：

~~~powershell
[root@k8s-master01 ~]# curl -g -6 [2005::2c47]
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
...
~~~

![IPv6 访问 Service 验证](/云原生/k8s-ops/k8s-ops-68-k8s-1-22-版本双栈协议-ipv4-ipv6-集群部署/image-20230324202324615.png)

---

## 四、Traefik：另一款 Ingress Controller

### 4.1 与 ingress-nginx 的差异

第 [12 篇](/云原生/k8s/k8s-13-ingress-l7)用了 ingress-nginx 暴露七层流量，Traefik 是另一个主流选择。它是一个为微服务部署而生的现代 HTTP 反向代理、负载均衡工具，由 Go 编写的单一可执行文件实现、无需其他依赖，原生支持 Docker、Kubernetes、Consul、Etcd 等多种后端，并会在后端变化时**自动应用新配置**。

| 维度 | ingress-nginx | Traefik |
|------|---------------|---------|
| 配置载体 | 标准 Ingress + 注解扩展 | 原生 Ingress / CRD IngressRoute / Gateway API 三选一 |
| 配置变更 | nginx reload | 热更新，无需重启进程 |
| 功能扩展 | 依赖注解或 Lua，能力有限 | Middleware 中间件链（限流、重定向、认证、白名单…） |
| 非 HTTP | TCP/UDP 暴露能力弱 | IngressRouteTCP / IngressRouteUDP 原生支持 |
| 可视化 | 需另配 dashboard | 自带 Dashboard |
| 证书 | cert-manager 等外部方案 | 内置 Let's Encrypt 自动申请与续期 |

![Traefik 与 Nginx Ingress 对比](/云原生/k8s-ops/k8s-ops-61-kubernetes集群服务暴露-traefik/image-20220419021708805.png)

### 4.2 核心概念

Traefik 是一个**边缘路由器**：拦截外部请求，按规则决定处理方式，并实时检测服务自动更新路由。请求路径为 `entrypoints -> rules 匹配 -> middlewares -> services`：

![Traefik 请求处理能力](/云原生/k8s-ops/k8s-ops-61-kubernetes集群服务暴露-traefik/traefik能力.png)

| 组件 | 职责 |
|------|------|
| **Providers** | 配置发现的基础组件（编排器/容器引擎/键值存储），查询其 API 获取路由信息，检测到变化即动态更新路由 |
| **Entrypoints** | 网络入口，定义接收请求的端口及 TCP/UDP 协议 |
| **Routers** | 分析请求并连接到对应服务，过程中可套用 Middlewares |
| **Services** | 配置如何到达最终处理请求的实际服务 |
| **Middlewares** | 在请求发到服务前（或响应返回客户端前）修改请求或做出判断（认证、限流、改 Header 等） |

![Traefik 功能全景](/云原生/k8s-ops/k8s-ops-61-kubernetes集群服务暴露-traefik/traefik功能.png)

### 4.3 部署

部署分四步：CRD、RBAC、配置文件、工作负载。Traefik 部署在 kube-system 命名空间下。

**第 1 步：创建 CRD**（IngressRoute、IngressRouteTCP、IngressRouteUDP、Middleware、TLSOption、TLSStore、TraefikService 等，完整清单可在 traefik.io 官网 v2.5 文档直接复制，此处不全文展开）：

~~~powershell
# vim traefik-crd.yaml
# kubectl apply -f traefik-crd.yaml
~~~

**第 2 步：创建 RBAC**，为 traefik 的 ServiceAccount 授予 services/endpoints/secrets/ingresses 以及全部 traefik CRD 的 get/list/watch 权限：

~~~powershell
# kubectl apply -f traefik-rbac.yaml
~~~

**第 3 步：ConfigMap 配置文件**，定义入口点、Provider 与日志：

~~~powershell
# vim traefik-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik
  namespace: kube-system
data:
  traefik.yaml: |-
    serversTransport:
      insecureSkipVerify: true  ## 略过验证代理服务的 TLS 证书
    api:
      insecure: true   ## 允许 HTTP 方式访问 API
      dashboard: true  ## 启用 Dashboard
      debug: true      ## 启用 Debug 调试模式
    metrics:
      prometheus: ""   ## 使用 Prometheus 默认配置暴露指标
    entryPoints:
      web:
        address: ":80"        ## 80 端口，入口名称为 web
      websecure:
        address: ":443"       ## 443 端口，入口名称为 websecure
      metrics:
        address: ":8082"      ## 8082 端口，metrics 入口
      tcpep:
        address: ":8083"      ## 8083 端口，TCP 入口
      udpep:
        address: ":8084/udp"  ## 8084 端口，UDP 入口
    providers:
      kubernetesCRD: ""       ## 启用 Kubernetes CRD 方式配置路由规则
      kubernetesingress: ""   ## 同时兼容原生 Ingress
    log:
      filePath: ""
      level: error
      format: json
    accessLog:
      filePath: ""
      format: json
      bufferingSize: 0
      filters:
        retryAttempts: true
        minDuration: 20
~~~

**第 4 步：以 DaemonSet 部署**，通过 hostPort 把 80/443 直接映射到物理机，方便集群外访问：

~~~powershell
# vim traefik-deploy.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  namespace: kube-system
  name: traefik
  labels:
    app: traefik
spec:
  selector:
    matchLabels:
      app: traefik
  template:
    metadata:
      labels:
        app: traefik
    spec:
      serviceAccountName: traefik-ingress-controller
      containers:
        - name: traefik
          image: traefik:v2.5.7
          args:
            - --configfile=/config/traefik.yaml
          volumeMounts:
            - mountPath: /config
              name: config
          ports:
            - name: web
              containerPort: 80
              hostPort: 80       ## 容器 80 端口绑定物理机 80
            - name: websecure
              containerPort: 443
              hostPort: 443      ## 容器 443 端口绑定物理机 443
            - name: admin
              containerPort: 8080  ## Dashboard 端口
            - name: tcpep
              containerPort: 8083
              hostPort: 8083
            - name: udpep
              containerPort: 8084
              hostPort: 8084
              protocol: UDP
      volumes:
        - name: config
          configMap:
            name: traefik
      tolerations:               ## 容忍所有污点，防止节点被设置污点
        - operator: "Exists"
      nodeSelector:              ## 只在打了标签的节点上运行
        IngressProxy: "true"
~~~

~~~powershell
为节点设置标签后应用
# kubectl label nodes --all IngressProxy=true
# kubectl apply -f traefik-deploy.yaml

再创建一个 ClusterIP Service 汇聚各入口端口
# kubectl apply -f traefik-service.yaml
~~~

### 4.4 路由配置

**HTTP 路由**：用 CRD `IngressRoute` 暴露 Traefik 自身的 Dashboard，`match` 用 Host + PathPrefix 表达：

~~~powershell
# vim traefik-dashboard-ingress-route.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: traefik
  namespace: kube-system
spec:
  entryPoints:
    - web
  routes:
  - match: Host(`traefik.kubemsb.com`) && PathPrefix(`/`)
    kind: Rule
    services:
    - name: traefik
      port: 8080

# kubectl apply -f traefik-dashboard-ingress-route.yaml

集群外主机把域名解析到任意节点 IP 后即可访问
# vim /etc/hosts
192.168.10.12 traefik.kubemsb.com
~~~

![Traefik Dashboard](/云原生/k8s-ops/k8s-ops-61-kubernetes集群服务暴露-traefik/image-20220416095227915.png)

> 💡 Traefik 创建路由规则有三种方式：原生 Ingress（加注解 `kubernetes.io/ingress.class: traefik`）、CRD IngressRoute（功能最全）以及 Gateway API；providers 同时开启了 `kubernetesCRD` 与 `kubernetesingress`，两种方式可混用。

**HTTPS 路由**：监听 `websecure` 入口点并引用 TLS 证书 Secret：

~~~powershell
自签名证书并创建secret
# openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=whoamissl.kubemsb.com"
# kubectl create secret tls who-tls --cert=tls.crt --key=tls.key

# vim whoamissl-ingressroute.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: ingressroutetls
spec:
  entryPoints:
    - websecure
  routes:
  - match: Host(`whoamissl.kubemsb.com`)
    kind: Rule
    services:
    - name: whoami
      port: 80
  tls:
    secretName: who-tls
~~~

**TCP 路由**：这是 ingress-nginx 难以做到的场景。以 MySQL 为例，在 ConfigMap 中新增 `mysql` 入口点（`:3312`）、DaemonSet 中将容器 3312 映射到宿主机 3306 后，一条 `IngressRouteTCP` 即可把物理机 3306 代理到集群内 MySQL：

~~~powershell
# vim mysql-ingressroutetcp.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRouteTCP
metadata:
  name: mysql
  namespace: default
spec:
  entryPoints:
    - mysql
  routes:
  - match: HostSNI(`*`)
    services:
    - name: mysql
      port: 3306
~~~

~~~powershell
集群外主机添加域名解析后直连验证
# mysql -h mysql.kubemsb.com -uroot -pabc123 -P3306
mysql>
~~~

> ⚠️ `HostSNI` 是 TLS 协议扩展，只有 TLS 路由能用它指定域名；非 TLS 的 TCP 路由必须使用 `HostSNI(`*`)` 表示接管该入口点上的所有请求。

**中间件**：以 IP 白名单为例，`Middleware` 与 `IngressRoute` 解耦、可复用。比如不希望 Prometheus/Grafana 等管理入口对外暴露：

~~~powershell
# vim middleware-ipwhitelist.yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: gs-ipwhitelist
spec:
  ipWhiteList:
    sourceRange:
      - 127.0.0.1
      - 10.244.0.0/16
      - 10.96.0.0/12
      - 192.168.10.0/24
~~~

在路由中挂载中间件后，白名单之外的来源会直接收到 `Forbidden`。此外 TraefikService 还支持多 Service 负载均衡、按权重轮询（灰度发布）与流量复制（镜像压测），写法与上面的 IngressRoute 一脉相承，需要时参考官方 CRD 文档即可。

---

## 五、方案选型速查表

| 方案 | 解决的问题 | 适用场景 | 关键要点 |
|------|------------|----------|----------|
| **Cilium** | iptables/kube-proxy 转发性能与可观测性瓶颈 | 大规模集群、需要 L7 流量观测与精细网络策略 | 内核 >= 4.9（高级功能 5.x~6.3+），CentOS 7 需先升级 kernel-ml |
| **Hybridnet** | Pod 需要物理网段 IP、外部直连 Pod/SVC | 传统机房 Underlay 网段规划、Overlay 与 Underlay 并存 | Network + Subnet CRD 定义地址池，Pod/SVC 用 annotation 选择网络类型 |
| **IPv4/IPv6 双栈** | IPv4 枯竭、IPv6-only 客户端接入 | 新机房分配 IPv6、等保/行业要求双栈 | podSubnet/serviceSubnet 写成「v4,v6」，kubelet 双栈 node-ip，CNI 配 serviceCIDRv6 |
| **Traefik** | ingress-nginx 扩展性弱、缺 TCP/UDP 暴露 | 需要 Middleware 中间件链、灰度/流量复制、自带 Dashboard | CRD IngressRoute 功能最全；DaemonSet + hostPort 部署 |

四者可组合使用：例如 Hybridnet 负责 Pod 拿物理 IP，Traefik 负责七层暴露，双栈负责地址族覆盖，Cilium 则是整体替换 CNI 层的方案。

---

## 小结

本篇把前面讲过的网络概念落到了四个具体方案上：

- **Cilium** 用 eBPF 在内核态完成转发与策略，换来更高的性能上限和 Hubble 级别的可观测性，代价是对内核版本的要求——CentOS 7 必须先升级内核；
- **Hybridnet** 通过 Network/Subnet CRD 管理 Underlay 地址池，Pod 加一个 annotation 就能拿到物理网段 IP，Overlay 与 Underlay 可以并存；
- **双栈集群**的关键在三个「双」：节点 node-ip 双栈、podSubnet/serviceSubnet 双 CIDR、CNI 的 serviceCIDR/serviceCIDRv6 双配置；
- **Traefik** 用 CRD IngressRoute + Middleware 提供了比 ingress-nginx 更强的表达能力，还原生支持 TCP/UDP 路由，适合替代或补充现有 Ingress 体系。

> ➡️ 下一篇：[《应用持久化存储——Volume、PV 与 PVC》](/云原生/k8s/k8s-11-pv-pvc)
