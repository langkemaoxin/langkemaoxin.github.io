---
title: 15.2 定义一个prometheus数据存储使用的pv
sidebarGroup: Prometheus
shortTitle: 21 15.2 定义一个prometheus数据存...
order: 21
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - pv的介绍和存在的意义 - pv中的核心参数讲解 - 定义一个prometheus数据存储使用的pv pv 存在的意义 - PV全称叫做Persistent Volume，持久化...'
---

> **Prometheus · 第 21 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- pv的介绍和存在的意义
- pv中的核心参数讲解
- 定义一个prometheus数据存储使用的pv

# pv 存在的意义

- PV全称叫做Persistent Volume，持久化存储卷。它是用来描述或者说用来定义一个存储卷的
- PV是对底层网络共享存储的抽象，将共享存储定义为一种“资源”
- 让我们使用存储更加容易，对上层使用人员屏蔽底层细节

# pv中的核心参数讲解

## 存储能力（Capacity）

- 描述存储设备具备的能力，支持对存储空间的设置（storage=xx）
- 比如10GB的大小

```yaml
  capacity: # 存储能力
    storage: 10Gi
```

## 存储卷模式（Volume Mode）

- volumeMode=xx，可选项包括Filesystem（文件系统）和Block（块设备），默认值是FileSystem。
- 比如filesystem

```yaml
  volumeMode: Filesystem # 存储卷模式 ：使用默认值FileSystem。
```

## 访问模式（Access Modes）

- 用于描述应用对存储资源的访问权限。
  - ReadWriteOnce（RWO）：读写权限，并且只能被单个Node挂载。
  - ReadOnlyMany（ROX）：只读权限，允许被多个Node挂载。
  - ReadWriteMany（RWX）：读写权限，允许被多个Node挂载。
- 比如仅一个节点可挂载，可读可写模式

```yaml
  accessModes:
  - ReadWriteOnce  # 访问模式：仅一个节点可挂载，可读可写模式
```

## 存储类别（Class）

- 设定存储的类别，通过storageClassName参数指定给一个StorageClass资源对象的名称
- 具有特定类别的PV只能与请求了该类别的PVC进行绑定。未绑定类别的PV则只能与不请求任何类别的PVC进行绑定。
- 比如

```yaml
  storageClassName: prometheus-lpv
```

## 回收策略（Reclaim Policy）

- 通过persistentVolumeReclaimPolicy字段设置，
  - Retain 保留：保留数据，需要手工处理。
  - Recycle 回收空间：简单清除文件的操作（例如执行rm -rf /thevolume/* 命令）
  - Delete 删除：与PV相连的后端存储完成Volume的删除操作
- 比如保留的策略

```yaml
 persistentVolumeReclaimPolicy: Retain  # 回收策略 保留数据，需要手工处理
```

## 节点亲和性（Node Affinity）

- 限制只能通过某些Node来访问Volume，可在nodeAffinity字段中设置
- 使用这些Volume的Pod将被调度到满足条件的Node上
- 比如设置节点亲和性为 ：节点的名字在 [prome-node-02]中

```yaml
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - prome-node-02
```

## PV类型

- 支持的部分类型
  - CephFS：一种开源共享存储系统。
  - FC（Fibre Channel）：光纤存储设备。
  - FlexVolume：一种插件式的存储机制。
  - Flocker：一种开源共享存储系统。
  - GCEPersistentDisk：GCE公有云提供的PersistentDisk。
  - Glusterfs：一种开源共享存储系统。
  - HostPath：宿主机目录，仅用于单机测试。
  - iSCSI：iSCSI存储设备。
  - Local：本地存储设备
- 比如使用local的类型

```yaml
  local:
    path: /data/prometheus
```

# 定义prometheus 数据存储所需的pv

```yaml
apiVersion: v1
kind: PersistentVolume

metadata: # PV建立不要加名称空间，因为PV属于集群级别的
  name: prometheus-lpv-0
spec:
  capacity: # 存储能力
    storage: 10Gi
  volumeMode: Filesystem # 存储卷模式 ：使用默认值FileSystem。
  accessModes: # 访问模式：仅一个节点可挂载，可读可写模式
  - ReadWriteOnce  
  persistentVolumeReclaimPolicy: Retain  # 回收策略 保留数据，需要手工处理
  storageClassName: prometheus-lpv 
  local:
    path: /data/prometheus
  nodeAffinity: # 设置节点亲和性
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - prome-node-02

```

# 创建 prometheus statsfulset 使用的yaml目录

- 创建目录，将需要的yaml文件放到指定的目录下，后面安装就可以 apply这个目录了

```shell
mkdir -pv /opt/app/prome_in_k8s_install/{prometheus,grafana}
```

# 本节重点介绍 :

- pv的介绍和存在的意义
- pv中的核心参数讲解
- 定义一个prometheus数据存储使用的pv

