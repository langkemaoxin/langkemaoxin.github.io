---
title: 分布式存储方案——Longhorn 与 GlusterFS
sidebarGroup: Kubernetes
shortTitle: 24 存储进阶
order: 24
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: K8s 原生分布式存储两方案：Longhorn 云原生块存储与 GlusterFS，架构、CSI 接入、部署与选型。
---

> **Kubernetes 系列 · 第 24/35 篇**  
> 上一篇：[《安全容器运行时——Kata Containers 与 gVisor》](/云原生/k8s/k8s-23-sandbox-runtimes)  
> 下一篇：[《Harbor + K8s 手动部署 SpringCloud——镜像构建与推送》](/云原生/k8s/k8s-25-harbor-springcloud)

---

## 开头：StorageClass 背后的存储从哪来？

[第 11 篇](/云原生/k8s/k8s-11-pv-pvc)讲了 PV/PVC 与动态供给：开发声明 PVC，StorageClass 里的 Provisioner 自动创建 PV。但 Provisioner 只是「搬运工」——真正承接数据的存储系统长什么样？生产集群里，Pod 会在任意节点漂移、节点会宕机、磁盘会坏，单机 local 卷和一台 NFS 服务器都撑不住有状态应用的可靠性要求。

本篇进入存储的「深水区」，看两套可以在自己机房落地的分布式存储方案：

- **Longhorn**——云原生分布式**块**存储，跑在 K8s 集群内部，CSI 原生接入；
- **GlusterFS + Heketi**——传统分布式**文件**系统，独立于 K8s 部署，通过 RESTful API 动态供给。

---

## 一、为什么需要分布式存储

回顾一下前几篇里用过的存储方案，各有硬伤：

| 方案 | 原理 | 局限 |
|------|------|------|
| emptyDir / hostPath | 节点本地目录 | 与节点绑定，Pod 漂移数据丢失/不可达 |
| local PV | 预绑定节点的本地盘 | 调度受限，节点故障即数据不可用 |
| 单机 NFS | 一台服务器对外共享 | **单点故障 + 单点性能瓶颈**，容量无法横向扩展 |
| 云盘（EBS/CBS…） | 云厂商块存储 | 依赖云厂商，自建机房没有 |

生产级的持久化存储至少要满足四点：

1. **多副本**：一块盘、一个节点坏了，数据仍在，卷可继续读写；
2. **横向扩展**：加节点即扩容量与吞吐，支持数 PB 级；
3. **动态供给**：与 StorageClass 打通，PVC 一提交，卷自动创建；
4. **快照与备份**：误删、升级失败时能回滚，数据能异地容灾。

Longhorn 与 GlusterFS 正是分别从「云原生」与「传统分布式」两条路线给出答案。

---

## 二、Longhorn：云原生分布式块存储

### 2.1 认识 Longhorn

Longhorn 是一个轻量级、可靠且易于使用的 Kubernetes 分布式块存储系统，免费开源，最初由 Rancher Labs 开发，现在是 CNCF 孵化项目（官方文档：https://longhorn.io/docs/1.6.0/）。

它能做的事：

- 为集群中有状态应用提供分布式持久存储，**不依赖云厂商**；
- 跨多个节点复制块存储提高可用性（**每个卷默认 3 副本**）；
- 定期快照，备份到 NFS 或 S3 兼容外部存储；
- 从备份恢复卷，甚至创建**跨集群灾难恢复卷**；
- 不中断持久卷的情况下升级 Longhorn；
- 自带独立 UI，支持 Helm / kubectl / Rancher 应用目录安装。

> 💡 **底层协议**：Longhorn 卷通过 **iSCSI** 暴露。iSCSI 是在 TCP/IP 网络上传输 SCSI 命令的协议，允许主机远程使用块设备，是经典 SAN 技术——所以 Longhorn 提供的是「块设备」，而非共享文件系统（RWX 是在其上再叠一层 NFS 共享实现的，见 2.5）。

### 2.2 架构：每卷一个 engine，多副本落盘

Longhorn 的核心设计可以概括为一句话：**每个卷由一个独立的存储引擎进程（engine）负责，引擎把数据同步写到散布在不同节点上的多个副本（replica）**。

| 组件 | 角色 |
|------|------|
| longhorn-manager | DaemonSet，每节点一个，管理卷/副本的编排与调度 |
| instance-manager | 承载 engine（存储引擎）与 replica（副本）进程 |
| engine | **每个卷一个**，接收 CSI/iSCSI IO，向所有副本同步写入 |
| replica | 卷的数据副本，以差分链（`.img` 文件）形式落在各节点磁盘目录 |
| longhorn-csi-plugin | CSI 驱动，对接 kubelet 的挂载流程 |
| longhorn-ui | 独立 Web 管理界面 |

这样设计的好处：

- engine 进程彼此隔离，单个卷的引擎崩溃不影响其他卷；
- 副本数可按卷设置，写穿（同步写所有副本）保证一致性；
- 节点故障时，manager 自动在其它节点重建副本，实现自愈。

### 2.3 部署前准备：节点磁盘

> 在 K8s 集群所有节点上分别添加 3 块硬盘，作为 Longhorn 的存储盘。

```bash
# lsblk
NAME            MAJ:MIN RM   SIZE RO TYPE
sdd               8:48   0     1T  0 disk
sdb               8:16   0     1T  0 disk
sdc               8:32   0     1T  0 disk
```

格式化并挂载（所有节点）：

```bash
# mkfs.xfs /dev/sdb
# mkfs.xfs /dev/sdc
# mkfs.xfs /dev/sdd

# mkdir /longhorn-sdb /longhorn-sdc /longhorn-sdd
```

写入 `/etc/fstab` 实现开机自动挂载：

```bash
/dev/sdb        /longhorn-sdb                   xfs     defaults        0 0
/dev/sdc        /longhorn-sdc                   xfs     defaults        0 0
/dev/sdd        /longhorn-sdd                   xfs     defaults        0 0
```

Longhorn 默认只使用节点上 `/var/lib/longhorn` 这一个默认磁盘。要让上面准备的多块盘生效，需要给节点打标签并注解磁盘配置——每个节点执行：

```bash
# kubectl edit nodes k8s-master01   # k8s-worker01、k8s-worker02 同理
```

```yaml
metadata:
  labels:
    node.longhorn.io/create-default-disk: "config"
  annotations:
    node.longhorn.io/default-disks-config: '[
    {
        "path":"/longhorn-sdb",
        "allowScheduling":true
    },
    {
        "path":"/longhorn-sdc",
        "allowScheduling":true
    },
    {
        "path":"/longhorn-sdd",
        "allowScheduling":true
    }
]'
```

### 2.4 部署前准备：LoadBalancer 与 Ingress

Longhorn 自带 UI，需要从集群外访问。裸机集群没有云 LoadBalancer，先准备 **MetalLB**（给 Service 分配外部 IP）与 **Ingress-NGINX**（七层转发），这在[第 12 篇 Ingress](/云原生/k8s/k8s-13-ingress-l7)中有过铺垫。

kube-proxy 需开启 IPVS 且 `strictARP: true`：

```bash
[root@k8s-master01 ~]# kubectl edit configmap kube-proxy -n kube-system
......
    ipvs:
      strictARP: true  # 由 false 修改为 true
    mode: ipvs         # 修改这里
```

```bash
[root@k8s-master01 ~]# kubectl rollout restart daemonset kube-proxy -n kube-system
```

部署 MetalLB 并配置 IP 地址池与二层通告：

![metallb 官网](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818160450008.png)

```bash
[root@k8s-master01 ~]# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.10/config/manifests/metallb-native.yaml
```

![IP 地址池配置](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818161330415.png)

```yaml
# ippool.yaml —— IP 地址池
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: first-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.10.240-192.168.10.250
---
# l2.yaml —— 二层通告
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: example
  namespace: metallb-system
```

Ingress-NGINX 部署时把 Service 改为 `type: LoadBalancer`（由 MetalLB 分配 192.168.10.240）：

![ingress 准备](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818161614142.png)

![ingress 准备](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818161657539.png)

![ingress 准备](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818162003835.png)

![ingress 准备](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818162048842.png)

![ingress 准备](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818162127483.png)

```bash
[root@k8s-master01 ~]# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
[root@k8s-master01 ~]# vim deploy.yaml   # externalTrafficPolicy 改为 Cluster，type 改为 LoadBalancer
[root@k8s-master01 ~]# kubectl apply -f deploy.yaml
```

Helm 是 Longhorn 官方推荐的安装方式，若集群尚未安装可参考[第 3 篇](/云原生/k8s/k8s-03-minikube-runtime)：

![helm 安装](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818162831353.png)

![helm 安装](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818163506147.png)

![helm 安装](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20230818163558558.png)

```bash
[root@k8s-master01 ~]# wget https://get.helm.sh/helm-v3.12.3-linux-amd64.tar.gz
[root@k8s-master01 ~]# tar xf helm-v3.12.3-linux-amd64.tar.gz
[root@k8s-master01 ~]# mv linux-amd64/helm /usr/local/bin/helm
[root@k8s-master01 ~]# helm version
```

### 2.5 Helm 部署 Longhorn

![longhorn 部署](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20240328123736815.png)

```bash
# wget https://github.com/longhorn/longhorn/archive/refs/tags/v1.6.0.zip
# unzip v1.6.0.zip
# cd longhorn-1.6.0/
```

先 `--dry-run --debug` 校验渲染，再正式安装。注意 `createDefaultDiskLabeledNodes=true`：**只在使用了 2.3 节磁盘标签的节点上创建默认磁盘**，即只用我们指定的 `/longhorn-sdX` 目录：

```bash
# helm install longhorn ./chart/ --namespace longhorn-system --create-namespace --set defaultSettings.createDefaultDiskLabeledNodes=true --dry-run --debug

# helm install longhorn ./chart/ --namespace longhorn-system --create-namespace --set defaultSettings.createDefaultDiskLabeledNodes=true
```

输出：

```text
NAME: longhorn
LAST DEPLOYED: Thu Mar 28 12:42:15 2024
NAMESPACE: longhorn-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Longhorn is now installed on the cluster!

Please wait a few minutes for other Longhorn components such as CSI deployments, Engine Images, and Instance Managers to be initialized.

Visit our documentation at https://longhorn.io/docs/
```

等几分钟后确认组件全部 Running：

```bash
# kubectl get pods -n longhorn-system
NAME                                                READY   STATUS    RESTARTS        AGE
csi-attacher-57689cc84b-6j7sp                       1/1     Running   2 (6m38s ago)   9m32s
csi-provisioner-6c78dcb664-4ltn4                    1/1     Running   2 (6m42s ago)   9m32s
csi-resizer-7466f7b45f-pr6gv                        1/1     Running   1 (6m43s ago)   9m32s
csi-snapshotter-58bf69fbd5-gvczm                    1/1     Running   1 (6m49s ago)   9m32s
engine-image-ei-acb7590c-bz7vp                      1/1     Running   0               9m43s
engine-image-ei-acb7590c-phhpw                      1/1     Running   0               9m43s
instance-manager-59f169cc89d17d2f5235b8b5ca2a3662   1/1     Running   0               9m43s
instance-manager-96e1ddb5430faa0fae3917a0a974e4c   1/1     Running   0               9m38s
longhorn-csi-plugin-44fpq                           3/3     Running   1 (7m2s ago)    9m32s
longhorn-csi-plugin-8gsbp                           3/3     Running   0               9m32s
longhorn-driver-deployer-5c8b867ccb-9zhns           1/1     Running   0               10m
longhorn-manager-2g86k                              1/1     Running   0               10m
longhorn-manager-sfctk                              1/1     Running   1 (9m43s ago)   10m
longhorn-ui-8447db44b7-frrvb                        1/1     Running   0               10m
longhorn-ui-8447db44b7-nchwl                        1/1     Running   0               10m
```

### 2.6 前端 UI 访问

UI 以 ClusterIP Service 形式存在，通过 Ingress 暴露：

```bash
# kubectl get svc -n longhorn-system
NAME                          TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
longhorn-admission-webhook    ClusterIP   10.104.38.152    <none>        9502/TCP   11m
longhorn-backend              ClusterIP   10.109.198.177   <none>        9500/TCP   11m
longhorn-conversion-webhook   ClusterIP   10.111.0.27      <none>        9501/TCP   11m
longhorn-frontend             ClusterIP   10.98.125.152    <none>        80/TCP     11m
......
```

```yaml
# ingress-longhorn.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: longhorn-frontend
  namespace: longhorn-system
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: longhorn.kubemsb.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: longhorn-frontend
            port:
              number: 80
```

```bash
# kubectl apply -f ingress-longhorn.yaml

# kubectl describe ingress longhorn-frontend -n longhorn-system
Name:             longhorn-frontend
Address:          192.168.10.240
Ingress Class:    nginx
Rules:
  Host                  Path  Backends
  ----                  ----  --------
  longhorn.kubemsb.com
                        /   longhorn-frontend:80 (10.244.69.197:8000,10.244.79.70:8000)
```

![longhorn UI](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20240328130924616.png)

![longhorn UI](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20240328144840200.png)

### 2.7 使用：StorageClass + PVC 实测

Helm 安装完成后，Longhorn CSI 已自动创建好默认 StorageClass：

```bash
# kubectl get sc
NAME                 PROVISIONER          RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
longhorn (default)   driver.longhorn.io   Delete          Immediate           true                   50m
```

提交一个 PVC + Pod 的测试清单，注意 accessModes 用了 **ReadWriteMany**（Longhorn 支持 RWX）：

```yaml
# kubemsb-longhorn-test.yaml
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: kubemsb-claim
spec:
  storageClassName: longhorn
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1024Mi
---
kind: Pod
apiVersion: v1
metadata:
  name: kubemsb-pod
spec:
  containers:
  - name: kubemsb-container
    image: busybox:1.28.4
    imagePullPolicy: IfNotPresent
    command:
      - "/bin/sh"
    args:
      - "-c"
      - "echo 'test' > /mnt/SUCCESS && sleep 36000 || exit 1"
    volumeMounts:
      - name: longhorn-pvc
        mountPath: "/mnt"
  restartPolicy: "Never"
  volumes:
    - name: longhorn-pvc
      persistentVolumeClaim:
        claimName: kubemsb-claim
```

```bash
# kubectl apply -f kubemsb-longhorn-test.yaml

# kubectl get pvc
NAME            STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
kubemsb-claim   Bound    pvc-925841a1-f0bd-4e90-a96b-e70337dc74c5   1Gi        RWX            longhorn       <unset>                 29s

# kubectl get pods
NAME          READY   STATUS    RESTARTS   AGE
kubemsb-pod   1/1     Running   0          73s
```

![卷详情](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20240328145135297.png)

![副本分布](/云原生/k8s-ops/k8s-ops-71-如何基于kubernetes使用分布式块存储longhorn/image-20240328163441442.png)

**验证多副本**：去 worker 节点上看，同一个卷的副本文件确实分布在不同节点上——这正是 2.2 节架构的落地：

```bash
# k8s-worker01 上
# ls /longhorn-sdb/replicas/pvc-a328f6f7-8bda-4c7a-bd7b-4b19df710649-47bfb726/
revision.counter  volume-head-000.img  volume-head-000.img.meta  volume.meta

# k8s-worker02 上
# ls /longhorn-sdc/replicas/pvc-a328f6f7-8bda-4c7a-bd7b-4b19df710649-854f064e/
revision.counter  volume-head-000.img  volume-head-000.img.meta  volume.meta
```

进入容器内确认挂载与容量限制（RWX 模式下挂载点呈现为 Longhorn 内部 NFS 共享）：

```bash
# kubectl exec -it kubemsb-pod -- /bin/sh
/ # df -h
Filesystem                Size      Used Available Use% Mounted on
overlay                  50.0G     11.4G     38.6G  23% /
10.110.79.55:/pvc-b6d669bb-20a3-4849-89a0-40798c361f17
                         974.0M         0    958.0M   0% /mnt

/ # cd /mnt && ls
SUCCESS     lost+found
```

容量是硬限制——写超出 1Gi 直接报错：

```bash
/mnt # dd if=/dev/zero of=./test.log bs=1M count=1200
dd: ./test.log: No space left on device
```

### 2.8 快照与备份

Longhorn 的数据保护能力开箱即用，可在 **UI 或 CSI VolumeSnapshot** 两条路径上使用：

- **快照（snapshot）**：卷的某时刻只读视图，存储在集群内副本盘上，秒级创建；可设置**定期快照**策略（如每 10 分钟保留 5 份）；
- **备份（backup）**：把快照导出到外部目标（NFS 或 S3 兼容存储），是跨机房容灾的基础；同样支持定期策略；
- **灾难恢复卷（DR volume）**：在第二个 K8s 集群创建 standby 卷，持续从备份源集群增量同步，主集群故障时可分钟级提升为主卷；
- **恢复**：从任意备份直接创建新卷，或对已有卷执行 revert。

> 💡 [第 11 篇](/云原生/k8s/k8s-11-pv-pvc)介绍过 VolumeSnapshot CRD——部署 Longhorn 后 `csi-snapshotter` 已就绪，快照类由 CSI 驱动自动创建，数据库升级前的「保险快照」工作流可以直接落地。

---

## 三、GlusterFS：经典分布式文件系统方案

### 3.1 认识 GlusterFS 与 Heketi

**GlusterFS** 是一个开源的分布式文件系统：

- 具有强大的横向扩展能力，通过扩展可支持数 PB 存储容量、处理数千客户端；
- 借助 TCP/IP 或 InfiniBand RDMA 网络把物理分散的存储资源聚在一起，用**单一全局命名空间**管理磁盘。

三个核心概念：

| 概念 | 含义 |
|------|------|
| **brick** | 节点上被导出的存储单元（一个目录/一块盘） |
| **volume** | 多个 brick 的逻辑组合，按组合方式分为 replicate（复制）、distribute（分布式）、disperse（纠删码）等卷类型 |
| **client** | 通过原生协议或 NFS 挂载 volume 使用 |

**Heketi**（https://github.com/heketi/heketi）是一个基于 RESTful API 的 GlusterFS 卷管理框架：

- 提供 RESTful API 供 Kubernetes 调用，实现多 GlusterFS 集群的卷管理——相当于在 GlusterFS 与 K8s 之间架了一座桥；
- 保证 brick 及其副本均匀分布在集群中的不同可用区。

> ⚠️ GlusterFS + Heketi 是「上一代」方案：Heketi 项目长期停滞维护，且 K8s 内置的 `kubernetes.io/glusterfs` Provisioner 已在新版本中弃用移除。本节按老版本集群（v1.21）复现，重点理解「外部存储 + RESTful API 动态供给」的架构思想；新集群块存储需求建议直接用 Longhorn 或 Ceph。

### 3.2 环境规划

GlusterFS 集群**独立于 K8s 集群部署**（3 台专用存储节点），K8s 侧 1 master + 2 worker，Heketi 部署在 master 上：

| 主机 | IP 地址 | 角色 |
| ---- | ------- | --- |
| master01 | 192.168.10.11 | K8s master，heketi + heketi-client |
| worker01 | 192.168.10.12 | K8s worker，heketi-client |
| worker02 | 192.168.10.13 | K8s worker，heketi-client |

| 主机 | IP 地址 | 硬盘 | 硬盘容量 |
| ---- | ------- | ---- | -------- |
| g1 | 192.168.10.60 | /dev/sdb | 100G |
| g2 | 192.168.10.61 | /dev/sdb | 100G |
| g3 | 192.168.10.62 | /dev/sdb | 100G |

### 3.3 GlusterFS 集群部署

三台存储节点做基础准备：主机名解析（`/etc/hosts` 写入 g1/g2/g3）、互信免密、关闭 firewalld 与 SELinux、每小时 ntpdate 时间同步、`/dev/sdb` 格式化为 xfs 并挂载到 `/glustersdb`。

安装 GlusterFS（三节点均执行）：

```bash
[root@gX ~]# yum -y install centos-release-gluster
[root@gX ~]# yum -y install glusterfs glusterfs-server glusterfs-fuse glusterfs-rdma fuse
[root@gX ~]# systemctl enable glusterd && systemctl start glusterd
```

在 g1 上把 g2、g3 加入集群（**trusted storage pool**）：

```bash
[root@g1 ~]# gluster peer probe g2
peer probe: success.
[root@g1 ~]# gluster peer probe g3
peer probe: success.

[root@g1 ~]# gluster peer status
Number of Peers: 2

Hostname: g2
Uuid: 7660736f-056b-414e-8b0c-b5272265946c
State: Peer in Cluster (Connected)

Hostname: g3
Uuid: 75b7c358-edbe-438c-ad72-2ce16ffabf9d
State: Peer in Cluster (Connected)
```

> ⚠️ 如果这台 GlusterFS 集群将来要给 K8s 提供存储，**不要**在生产盘上做下面的验证实验——Heketi 接管设备时要求裸盘。验证完成后请更换新硬盘。

创建并启动一个 **replica 3 复制卷**验证集群可用性：

```bash
[root@g1 ~]# gluster volume create k8s-test-volume replica 3 g1:/glustersdb/r1 g2:/glustersdb/r2 g3:/glustersdb/r3
volume create: k8s-test-volume: success: please start the volume to access data

[root@g1 ~]# gluster volume start k8s-test-volume
volume start: k8s-test-volume: success
```

```bash
[root@g1 ~]# gluster volume info k8s-test-volume
Volume Name: k8s-test-volume
Type: Replicate
Volume ID: 0529c5f6-1ac0-40ea-a29c-6c4f85dc54cb
Status: Started
Number of Bricks: 1 x 3 = 3
Transport-type: tcp
Bricks:
Brick1: g1:/glustersdb/r1
Brick2: g2:/glustersdb/r2
Brick3: g3:/glustersdb/r3
......
```

也可以在 K8s worker 节点装客户端（`yum -y install glusterfs glusterfs-fuse`）手动挂载验证后卸载：

```bash
[root@worker01 ~]# mount -t glusterfs g1:/k8s-test-volume /k8s-glusterfs-test-volume

[root@worker01 ~]# df -h | grep gluster
g1:/k8s-test-volume                        100G  1.1G  99G  2% /k8s-glusterfs-test-volume

[root@worker01 ~]# umount /k8s-glusterfs-test-volume
```

### 3.4 Heketi 部署与拓扑注册

K8s master 上安装 Heketi 与客户端：

```bash
[root@master01 ~]# yum -y install centos-release-gluster
[root@master01 ~]# yum -y install heketi heketi-client
# worker 节点安装 heketi-client
```

修改 `/etc/heketi/heketi.json` 关键项：

```json
{
  "port": "18080",
  "use_auth": true,
  "jwt": {
    "admin": { "key": "adminkey" }
  },
  "glusterfs": {
    "executor": "ssh",
    "sshexec": {
      "keyfile": "/etc/heketi/heketi_key",
      "user": "root",
      "port": "22",
      "fstab": "/etc/fstab"
    },
    "db": "/var/lib/heketi/heketi.db",
    "loglevel": "warning"
  }
}
```

> 💡 Heketi 有三种 executor：**mock**（测试用，不发命令）、**ssh**（SSH 到 GlusterFS 节点执行管理命令）、**kubernetes**（GlusterFS 以容器跑在 K8s 上时用 exec API）。我们独立部署 GlusterFS，选择 ssh 方式——因此需要 master 能免密登录所有存储节点：

```bash
[root@master01 ~]# ssh-keygen -t rsa -f /root/.ssh/id_rsa -N ''
[root@master01 ~]# ssh-copy-id 192.168.10.60
[root@master01 ~]# ssh-copy-id 192.168.10.61
[root@master01 ~]# ssh-copy-id 192.168.10.62
[root@master01 ~]# cp /root/.ssh/id_rsa /etc/heketi/heketi_key
```

> ⚠️ yum 安装后 `/etc/heketi` 与 `/var/lib/heketi` 属主是 root，而 service 文件以 heketi 用户运行，不改权限起不来：

```bash
[root@master01 ~]# chown heketi:heketi /etc/heketi/ -R
[root@master01 ~]# chown heketi:heketi /var/lib/heketi -R
[root@master01 ~]# systemctl enable heketi && systemctl start heketi
```

接着把 GlusterFS 拓扑注册进 Heketi——**创建集群 → 添加节点 → 添加裸设备**：

```bash
# 创建集群
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 --json cluster create
{"id":"dd456dbc15f1206e980fdb5345117085","nodes":[],"volumes":[],"block":true,"file":true,"blockvolumes":[]}

# 添加 g1（g2、g3 同理，换 IP 即可）
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 --json node add --cluster "dd456dbc15f1206e980fdb5345117085" --management-host-name 192.168.10.60 --storage-host-name 192.168.10.60 --zone 1
{"zone":1,"hostnames":{"manage":["192.168.10.60"],"storage":["192.168.10.60"]},"cluster":"dd456dbc15f1206e980fdb5345117085","id":"217899105fa01434f9f29625e7ad9cfb","state":"online","devices":[]}
```

添加设备时注意：**必须是未挂载、无数据的裸盘**。前面验证实验占用的 `/dev/sdb` 会直接报错：

```bash
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 device add --name "/dev/sdb" --node 217899105fa01434f9f29625e7ad9cfb
Error: Setup of device /dev/sdb failed (already initialized or contains data?):   Can't open /dev/sdb exclusively.  Mounted filesystem?
```

为三台节点各加一块新盘 `/dev/sdc`（需记录各 node 的 id）：

```bash
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 device add --name "/dev/sdc" --node 217899105fa01434f9f29625e7ad9cfb
Device added successfully
```

用 `topology info` 验证拓扑，再测试创建一个 5G 双副本卷——Heketi 会自动在 GlusterFS 侧建好卷并均匀分布 brick：

```bash
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 volume create --size=5 --replica=2
Name: vol_80539c6510a73f70ad3453c221901334
Size: 5
Durability Type: replicate
Distribute Count: 1
Replica Count: 2
Mount: 192.168.10.60:vol_80539c6510a73f70ad3453c221901334
Mount Options: backup-volfile-servers=192.168.10.61,192.168.10.62
```

### 3.5 K8s 动态供给：StorageClass + PVC + StatefulSet

GlusterFS 集群与 Heketi 就绪后，K8s 侧只需一个 StorageClass 指向 Heketi API，即可实现「PVC 一提交，卷自动创建」：

```yaml
# storageclass-glusterfs.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: glusterfs
provisioner: kubernetes.io/glusterfs  # 存储分配器，按后端存储不同而变更
parameters:
  resturl: "http://192.168.10.11:18080"  # heketi API 地址（K8s master IP）
  restauthenabled: "true"                # heketi 开启认证时必须为 true
  restuser: "admin"
  restuserkey: "adminkey"
  volumetype: "replicate:2"              # 卷类型：2 副本复制卷；"disperse:4:2" 为纠删码；"none" 为分布式卷
```

```bash
[root@master01 yaml]# kubectl apply -f storageclass-glusterfs.yaml
storageclass.storage.k8s.io/glusterfs created

[root@master01 yaml]# kubectl get sc
NAME        PROVISIONER               RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
glusterfs   kubernetes.io/glusterfs   Delete          Immediate           false                  48s
```

提交 PVC，PV 由 Provisioner 自动创建并绑定：

```yaml
# glusterfs-pvc.yaml
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: glusterfs-mysql
  namespace: default
  annotations:
    volume.beta.kubernetes.io/storage-class: "glusterfs"
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 2Gi
```

```bash
[root@master01 yaml]# kubectl get pv,pvc
NAME                                                        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                   STORAGECLASS   AGE
persistentvolume/pvc-77d6fca6-f284-49fb-a0f3-8f5664690562   2Gi        RWX            Delete           Bound    default/glusterfs-mysql   glusterfs      2s

NAME                                     STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
persistentvolumeclaim/glusterfs-mysql    Bound    pvc-77d6fca6-f284-49fb-a0f3-8f5664690562   2Gi        RWX            glusterfs       3s
```

用 StatefulSet（[第 7 篇](/云原生/k8s/k8s-07-daemon-stateful-job)）跑一个 MySQL 消费该 PVC：

```yaml
# mysql.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-svc
  labels:
    app: mysql-svc
spec:
  ports:
  - port: 3306
    name: mysql
  clusterIP: None
  selector:
    name: mysql
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: default
spec:
  serviceName: mysql-svc
  selector:
    matchLabels:
      name: mysql
  replicas: 1
  template:
    metadata:
      labels:
        name: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:5.7
        imagePullPolicy: IfNotPresent
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "123456"
        ports:
          - containerPort: 3306
            name: mysql
        volumeMounts:
        - name: glusterfs-mysql-data
          mountPath: "/var/lib/mysql"
      volumes:
      - name: glusterfs-mysql-data
        persistentVolumeClaim:
          claimName: glusterfs-mysql
```

Pod Running 后进入容器建库验证：

```bash
[root@master01 ~]# kubectl get pods
NAME                                      READY   STATUS    RESTARTS   AGE
mysql-0                                   1/1     Running   0          27s

[root@master01 ~]# kubectl exec -it mysql-0 sh
# mysql -uroot -p123456
mysql> create database k8sonline;
Query OK, 1 row affected (0.01 sec)
```

到 GlusterFS 节点上看，数据确实落在了 Heketi 管理的 brick 目录中（自动建了 LVM 卷组）：

```bash
[root@g2 ~]# ls /var/lib/heketi/mounts/vg_d62a7a4a632dd4864edc367c952d0fa9/brick_834718f2a0236b913b3aa14609b34819/brick/
auto.cnf         ib_buffer_pool  k8sonline           server-cert.pem
ca-key.pem       ibdata1         mysql               server-key.pem
ca.pem           ib_logfile0     performance_schema  sys
......
```

> 💡 **认证信息用 Secret 保存**：把 `restuserkey` 明文写在 StorageClass 里不安全，官方推荐改用 Secret——先建 `kubernetes.io/glusterfs` 类型的 Secret 存 base64 后的 key，再在 StorageClass 中以 `secretNamespace: "default"` + `secretName: "heketi-secret"` 引用，替换 `restuserkey`；还可加 `clusterid`、`gidMin/gidMax` 限定集群与 GID 范围。

FAQ 两个高频坑：

- **Heketi 卷删不掉**：直接删 `/var/lib/heketi/mounts/` 目录并清空 `heketi.db`，重新注册拓扑；
- **报 `Can't initialize physical volume ... without –ff`**：盘上有残留 PV/VG，用 `vgremove`、`pvremove` 依次清掉再加设备。

---

## 四、对比与选型

| 维度 | Longhorn | GlusterFS + Heketi |
|------|----------|--------------------|
| 定位 | 云原生分布式**块**存储 | 传统分布式**文件**系统 |
| 部署位置 | **K8s 集群内**（Helm 一键装，消费集群节点磁盘） | **独立于 K8s** 的专用存储集群 |
| K8s 接入 | CSI（driver.longhorn.io） | in-tree Provisioner + Heketi RESTful API |
| 副本粒度 | **每卷**可设副本数，engine 进程按卷隔离 | 卷类型（replicate/disperse）在创建时定死 |
| RWX | 支持（块上叠 NFS 共享） | 原生支持（本质是文件系统） |
| 快照/备份 | 内置：定期快照、S3/NFS 备份、DR 卷 | 依赖 GlusterFS 自身快照，能力较弱 |
| UI | 自带 Web UI | 无（靠 heketi-cli / topology info） |
| 运维复杂度 | 低，K8s 原生，升级不中断卷 | 高：两套系统 + SSH 互信 + 裸盘管理 |
| 生态现状 | CNCF 孵化，活跃开发 | Heketi 停滞维护，K8s 侧 provisioner 已弃用 |

**选型建议**：

- 自建机房、存储规模不大（百 TB 内）、团队以 K8s 为中心 → **Longhorn**，运维成本最低；
- 已有独立存储集群、需要原生共享文件系统、多协议访问 → GlusterFS（或其继任者），但新项目建议评估 **Ceph（RBD/CephFS）**；
- 数据库类强 IOPS 块存储需求 → Longhorn/Ceph RBD；多 Pod 共享同一目录的海量小文件 → 文件系统类方案。

---

## 五、小结

| 主题 | 要点 |
|------|------|
| 为什么分布式存储 | 单机 local/NFS 有单点与扩展性硬伤；生产需要多副本、横向扩展、动态供给、快照备份 |
| Longhorn 架构 | 每卷一个 engine 进程 + 多副本落盘，iSCSI 暴露，CSI 接入 |
| Longhorn 部署 | 节点盘标签注解 + Helm 安装（`createDefaultDiskLabeledNodes=true`） |
| Longhorn 使用 | 默认 StorageClass 即开即用；PVC 落地为不同节点上的副本目录；内置快照/备份/DR |
| GlusterFS 架构 | brick → volume（replicate/distribute/disperse）+ Heketi RESTful API 管理卷 |
| GlusterFS 接入 | StorageClass 指向 Heketi，PVC 触发自动建卷；认证建议 Secret 化 |
| 选型 | 新自建集群优先 Longhorn；GlusterFS 方案偏存量/学习，理解其架构思想即可 |

> ➡️ 下一篇：[《HPA 自动伸缩与 CRI/CNI/CSI/CRD 扩展点》](/云原生/k8s/k8s-08-hpa-cri-crd)

---

## 延伸阅读

- [Longhorn 官方文档](https://longhorn.io/docs/1.6.0/)
- [GlusterFS Docs](https://docs.gluster.org/)
- [Heketi 项目](https://github.com/heketi/heketi)
