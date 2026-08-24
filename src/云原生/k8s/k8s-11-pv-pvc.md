---
title: 应用持久化存储——Volume、PV 与 PVC
sidebarGroup: Kubernetes
shortTitle: 11 PV 与 PVC
order: 11
date: 2026-08-30T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - PV
  - PVC
  - StorageClass
description: Volume、PV/PVC 生命周期、静态/动态供给与 StorageClass。
---

> **Kubernetes 系列 · 第 11/35 篇**  
> 上一篇：[《Underlay/Overlay 网络与集群 DNS 解析》](/云原生/k8s/k8s-10-network-dns) · 下一篇：[《Secret、ConfigMap 与常见部署排障》](/云原生/k8s/k8s-12-secret-configmap)

---

## 开头：Pod 删了，数据还在吗？

容器文件系统默认可写层随容器删除而消失。Docker 用 **Volume** 把数据落到宿主机或外部存储；Kubernetes 继承了 Volume 概念，并进一步抽象出 **PV（PersistentVolume）** 与 **PVC（PersistentVolumeClaim）**，把「存储资源供给」与「应用消费」解耦——开发只声明 PVC，运维管理 PV 或 StorageClass。

本篇覆盖 emptyDir/hostPath/NFS、PV/PVC 绑定规则与生命周期、Static/Dynamic 供给，以及 StorageClass 动态制备。

---

## 一、Volume 基础

Volume 是 Pod 与外部存储之间的通道，也是 Pod 内容器间、Pod 与集群外共享数据的媒介。

Kubernetes 支持多种 Volume 类型：

| 类别 | 类型 | 说明 |
|------|------|------|
| 本地 | emptyDir | 空目录，随 Pod 生灭 |
| 本地 | hostPath | 挂载 Node 目录/文件 |
| 网络 | nfs、cephfs、iscsi… | 远程存储 |
| 抽象 | persistentVolumeClaim | 引用 PVC 绑定的 PV |
| 投射 | configMap / secret / downwardAPI / **projected** | 把配置与 Pod 元信息「投射」成文件挂载 |

其中 **projected（投射卷）** 是把上述多个来源**合并投射到同一个目录**：一个挂载点同时呈现 ConfigMap、Secret 和 Downward API 文件，避免给容器挂一堆零散卷——`serviceAccountToken` 也以投射卷形式自动挂进 Pod（`/var/run/secrets/kubernetes.io/serviceaccount/`）。

### 1.1 emptyDir

Pod 创建时在 Node 上生成空目录（默认路径在 `/var/lib/kubelet/pods/<uid>/volumes/...`），Pod 删除时目录一并删除。类似 `docker run -v` 的临时卷。

**多容器共享示例**：一个容器写、一个容器读。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-demo
spec:
  volumes:
    - name: myweb
      emptyDir: {}
  containers:
    - name: myapp
      image: nginx:1.25
      volumeMounts:
        - name: myweb
          mountPath: /usr/share/nginx/html/
    - name: busybox
      image: busybox:latest
      volumeMounts:
        - name: myweb
          mountPath: /web
      command: ["/bin/sh", "-c", "while true; do echo $(date) >> /web/index.html; sleep 1; done"]
```

可用 `kubectl describe pod` 或容器 inspect 查看挂载源路径。

### 1.2 hostPath

将 Node 上指定路径挂载进 Pod。**Pod 删除后 Node 上文件保留**；Node 故障则数据不可达。等价于 `docker run -v /HOST/DIR:/CONTAINER/DIR`。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-demo2
spec:
  volumes:
    - name: myweb
      hostPath:
        path: /data/www/
        type: Directory
  containers:
    - name: myapp
      image: nginx:1.25
      volumeMounts:
        - name: myweb
          mountPath: /usr/share/nginx/html/
```

**风险**：无状态 Deployment 多副本若共用同一 hostPath，会写到不同 Node 的不同目录，数据不一致；StatefulSet + 本地盘需配合 Local PV 与调度约束。

### 1.3 NFS 外部存储

数据放在集群外 NFS 服务器，Pod 漂移后仍可挂载同一共享目录。

**NFS 服务端示例**：

```bash
yum -y install nfs-utils
mkdir -p /data/testvol
echo "NFS Test Data" > /data/testvol/index.html
echo "/data/testvol 192.168.100.0/24(rw,no_root_squash)" >> /etc/exports
systemctl start nfs
exportfs -rv
```

**Pod 直接使用 NFS Volume**：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vol-nfs
spec:
  volumes:
    - name: myweb
      nfs:
        server: 192.168.100.172
        path: /data/testvol
  containers:
    - name: myapp
      image: nginx:1.25
      volumeMounts:
        - name: myweb
          mountPath: /usr/share/nginx/html/
```

各 Node 需安装 `nfs-utils` 并能 mount 该导出目录。

---

## 二、PV 与 PVC 解耦模型

普通 Volume 写在 Pod 里，与 Pod **静态绑定**，无法独立创建。  
**PV** 是集群级资源，描述一块存储的配置（类型、容量、访问模式、回收策略）。  
**PVC** 是命名空间级资源，描述应用对存储的**请求**（要多大、要什么访问模式）。

关系：**Pod → PVC → PV → 实际存储后端**。

面向对象类比：PVC 像接口，PV 像实现；开发提交 PVC，运维准备 PV 或 StorageClass。

**PersistentVolume Controller** 持续扫描未绑定的 PVC，按规则匹配可用 PV 并绑定。

### 2.1 PVC 绑定 PV 的规则

候选 PV 需同时满足：

| 条件 | 说明 |
|------|------|
| **VolumeMode** | Filesystem / Block 一致 |
| **AccessModes** | PVC 请求的 mode 必须是 PV 支持的子集 |
| **StorageClassName** | PVC 指定了 SC 时，PV 必须有相同 SC（或 PV 无 SC 的特殊情况） |
| **LabelSelector** | PVC 通过 selector 筛选 PV 标签 |
| **Size** | PV capacity ≥ PVC requests.storage |

多个 PV 都满足时，选 **capacity 最小**且 **accessModes 最短** 的（最小适合原则）。

### 2.2 AccessModes

| 模式 | 缩写 | 含义 |
|------|------|------|
| ReadWriteOnce | RWO | 单 Node 读写 |
| ReadOnlyMany | ROX | 多 Node 只读 |
| ReadWriteMany | RWX | 多 Node 读写 |

### 2.3 PV 状态生命周期

```
Pending → Available → Bound → Released → (Deleted / Failed)
```

| 状态 | 含义 |
|------|------|
| **Available** | 已创建，等待 PVC |
| **Bound** | 已与 PVC 绑定 |
| **Released** | PVC 已删，PV 保留（ReclaimPolicy=Retain 时） |
| **Failed** | 回收失败 |

`Released` 状态的 PV **不能**直接给新 PVC 绑定。复用方式：

1. 备份数据后手动重建 PV 并填回元数据；
2. 删除 Pod 但**保留 PVC**，让其他 Pod 复用同一 PVC。

### 2.4 PV 类型概览

| 类型 | 说明 |
|------|------|
| **Static PV** | 运维预先创建 PV |
| **Dynamic PV** | StorageClass + Provisioner 按 PVC 自动创建 |
| **Local PV** | 本地盘，需考虑调度与 Node 亲和 |

**Local PV 注意**：

- 应使用独立外部磁盘，而非随意挂载 Node 目录；
- 调度器需知晓 PV 拓扑，Pod 必须调度到 PV 所在 Node（`volumeBindingMode: WaitForFirstConsumer` 等）。

### 2.5 整体流程

```
外部存储 (NFS/Ceph/云盘…)
        ↑
   Static PV 或 Dynamic PV (StorageClass → Provisioner)
        ↑
      PVC ← PersistentVolume Controller 绑定
        ↑
      Pod (volumeMounts 引用 claimName)
```

---

## 三、Static PV 实战（NFS）

### 3.1 NFS 准备多个导出目录

```bash
mkdir -p /data/volumes/v{1..4}
echo "<h1>NFS stor 01</h1>" > /data/volumes/v1/index.html
echo "<h1>NFS stor 02</h1>" > /data/volumes/v2/index.html
echo "<h1>NFS stor 03</h1>" > /data/volumes/v3/index.html
echo "<h1>NFS stor 04</h1>" > /data/volumes/v4/index.html

cat > /etc/exports << EOF
/data/volumes/v1 192.168.100.0/24(rw,no_root_squash)
/data/volumes/v2 192.168.100.0/24(rw,no_root_squash)
/data/volumes/v3 192.168.100.0/24(rw,no_root_squash)
/data/volumes/v4 192.168.100.0/24(rw,no_root_squash)
EOF
systemctl start nfs && exportfs -rv
```

### 3.2 创建四个 PV

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv0001
spec:
  capacity:
    storage: 2Gi
  accessModes: ["ReadWriteMany", "ReadWriteOnce"]
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: 192.168.100.172
    path: /data/volumes/v1
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv0002
spec:
  capacity:
    storage: 7Gi
  accessModes: ["ReadWriteOnce"]
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: 192.168.100.172
    path: /data/volumes/v2
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv0003
spec:
  capacity:
    storage: 10Gi
  accessModes: ["ReadWriteMany", "ReadWriteOnce"]
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: 192.168.100.172
    path: /data/volumes/v3
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv0004
spec:
  capacity:
    storage: 15Gi
  accessModes: ["ReadWriteMany", "ReadWriteOnce"]
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: 192.168.100.172
    path: /data/volumes/v4
```

字段说明：

- **capacity.storage**：PV 容量；
- **accessModes**：访问模式；
- **persistentVolumeReclaimPolicy**：`Retain`（保留）、`Delete`（删 PVC 时删 PV 及后端卷）、`Recycle`（已废弃）。

```bash
kubectl get pv
# STATUS 应为 Available
```

### 3.3 创建 PVC

请求 6Gi、RWX——会绑定到 **pv0003**（满足 RWX 且容量 ≥6Gi 的最小 PV）。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mypvc
spec:
  accessModes: ["ReadWriteMany"]
  resources:
    requests:
      storage: 6Gi
```

### 3.4 Pod 引用 PVC

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-demo
spec:
  volumes:
    - name: myvol
      persistentVolumeClaim:
        claimName: mypvc
  containers:
    - name: myapp
      image: nginx:1.25
      volumeMounts:
        - name: myvol
          mountPath: /usr/share/nginx/html/
```

验证：

```bash
kubectl get pv,pvc
# pv0003  STATUS Bound  CLAIM default/mypvc
curl $(kubectl get pod pod-demo -o jsonpath='{.status.podIP}')
# <h1>NFS stor 03</h1>
```

---

## 四、Dynamic PV 与 StorageClass

大规模集群中手工维护成千上万 PV 不现实。**Dynamic Provisioning** 由 **StorageClass** 定义「存储类模板 + Provisioner」，PVC 创建时自动制备 PV。

`volumeClaimTemplates`（StatefulSet）实现 PVC 自动化；StorageClass 实现 PV 自动化。

### 4.1 StorageClass 是什么

StorageClass 定义：

1. **PV 属性**（类型、参数、文件系统等）；
2. **Provisioner**（用哪个插件创建卷）。

PVC 指定 `storageClassName` 后，若无匹配 PV，Provisioner 自动创建并绑定。

### 4.2 StorageClass 示例

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: slow
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
reclaimPolicy: Delete
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: csi-disk
provisioner: diskplugin.csi.alibabacloud.com
parameters:
  type: cloud_ssd
  fsType: ext4
reclaimPolicy: Delete
```

### 4.3 动态 PVC + Pod

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: disk-pvc
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: csi-disk
  resources:
    requests:
      storage: 30Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: mypod
spec:
  containers:
    - name: app
      image: nginx:1.25
      volumeMounts:
        - name: data
          mountPath: /var/www/html
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: disk-pvc
```

### 4.4 NFS 动态供给（外部 Provisioner）

NFS **无内置** in-tree Provisioner，常用 **nfs-subdir-external-provisioner** 等外部组件：

- 自动创建 PV 目录：`${namespace}-${pvcName}-${pvName}`；
- PVC 删除后目录可归档为 `archived-${namespace}-${pvcName}-${pvName}`。

![StorageClass 动态供给流程](/云原生/k8s/p297-01.png)

### 4.5 内置与外部 Provisioner

| 存储 | 内置 Provisioner |
|------|------------------|
| AWS EBS | ✓ |
| GCE PD | ✓ |
| Azure Disk/File | ✓ |
| Ceph RBD | ✓ |
| NFS | ✗（需外部） |
| Local | ✗ |

也可实现符合 [external-provisioner 规范](https://github.com/kubernetes-sigs/sig-storage-lib-external-provisioner) 的自定义 Provisioner。

![PV/PVC/StorageClass 与卷插件关系](/云原生/k8s/p299-01.png)

---

## 五、StatefulSet 与 volumeClaimTemplates

StatefulSet 可为每个副本自动生成独立 PVC：

```yaml
volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast
      resources:
        requests:
          storage: 10Gi
```

Pod 删除后 PVC 默认保留，符合有状态应用「身份 + 存储」持久化需求。

---

## 六、Volume Snapshots：给 PVC 拍快照

PVC 里的数据出了问题想「回到昨天」，逐条恢复备份太重——CSI 标准（官方 [docs](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)）提供了**存储系统原生的快照能力**，模型与 PV/PVC 完全对偶：

| 概念 | 快照体系 | 对偶于 |
|------|----------|--------|
| **VolumeSnapshot** | 用户侧「我要拍/恢复一份快照」 | PVC |
| **VolumeSnapshotContent** | 存储后端的实际快照 | PV |
| **VolumeSnapshotClass** | 快照的参数模板（哪个驱动、是否删除快照时连底层一起删） | StorageClass |

```yaml
# 1. 拍快照（对已有 PVC）
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: db-snap-20260814
spec:
  volumeSnapshotClassName: csi-nfs-snapclass
  source:
    persistentVolumeClaimName: db-data
---
# 2. 从快照建新 PVC（dataSource 指向快照）
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data-restored
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi
  dataSource:                    # ← 关键：从快照克隆出新卷
    apiGroup: snapshot.storage.k8s.io
    kind: VolumeSnapshot
    name: db-snap-20260814
```

三个使用前提：

- 存储后端/CSI 驱动**必须支持快照**，且集群要装 **snapshot-controller**（external-snapshotter 项目，多数发行版已内置，可用 `kubectl get volumesnapshotclasses` 验证）；
- 快照是**存储系统级**操作——强依赖后端能力（NFS 这类要看具体 CSI 实现是否有快照插件）；
- `dataSource` 还能指向另一个 PVC（**卷克隆**），配合快照构成「备份 → 恢复/复制数据卷」的完整链路。

> 💡 典型工作流：升级数据库前先 `kubectl apply` 一份 VolumeSnapshot，失败就从快照 `dataSource` 拉新 PVC 回滚——比任何文件级备份都快。

---

## 七、小结

| 主题 | 要点 |
|------|------|
| Volume | emptyDir（临时）、hostPath（Node 路径）、nfs（共享） |
| PV / PVC | 供给与消费分离；Controller 自动绑定 |
| 绑定规则 | AccessMode、Size、SC、Label、VolumeMode |
| Static | 运维预创建 PV |
| Dynamic | StorageClass + Provisioner 按需创建 |
| 回收 | Retain / Delete；Released PV 需人工处理才能复用 |

> ➡️ 下一篇：[《分布式存储方案——Longhorn 与 GlusterFS》](/云原生/k8s/k8s-24-storage-longhorn-glusterfs)

---

## 延伸阅读

- [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
