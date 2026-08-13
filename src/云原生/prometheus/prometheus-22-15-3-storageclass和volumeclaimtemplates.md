---
title: 15.3 StorageClass和volumeClaimTemplates
sidebarGroup: Prometheus
shortTitle: 22 15.3 StorageClass和volu...
order: 22
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - 了解pvc和pv的关系 - 动态创建pvc的模板volumeClaimTemplates - 动态的资源供应StorageClass - WaitForFirstConsumer...'
---

> **Prometheus · 第 22 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 了解pvc和pv的关系
- 动态创建pvc的模板volumeClaimTemplates
- 动态的资源供应StorageClass
  - WaitForFirstConsumer 延迟绑定

# pvc简介

- PVC全称是Persistent Volume Claim，是用来描述希望使用什么样的或者说是满足什么条件的存储
- 开发人员使用这个来描述该容器需要一个什么存储
- PVC就相当于是容器和PV之间的一个接口

# 定义pvc

## 核心参数解析

### 资源请求（Resources）

- 描述对存储资源的请求，目前仅支持request.storage的设置，即是存储空间的大小
- 比如申请8GB的存储空间

```yaml
  resources: #申请资源，8Gi存储空间
    requests:
      storage: 8Gi
```

### 访问模式（AccessModes）

- 用于描述对存储资源的访问权限，与PV设置相同

```yaml
  accessModes:  #访问模式
  - ReadWriteOnce
```

### PV选择条件（Selector）

- 通过对Label Selector的设置，可使PVC对于系统中已存在的各种PV进行筛选。
- 比如 过滤 release=stable ，environment=dev 的pv

```yaml
  selector:
    matchLabels:
      release: "stable"
    matchExpressions:
    - {key: environment, operator: In, values: [dev]}
```

### 存储类别（Class）

- 有设置了该Class的PV才能被系统选出，并与该PVC进行绑定
- 比如

```yaml
storageClassName: prometheus-lpv
```

### 最后给出一个完整的pvc配置

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc
spec:
  accessModes:  #访问模式
  - ReadWriteOnce
  resources: #申请资源，8Gi存储空间
    requests:
      storage: 8Gi
  storageClassName: slow #存储类别
  selector:
    matchLabels:
      release: "stable"
    matchExpressions:
    - {key: environment, operator: In, values: [dev]}
```

# volumeClaimTemplates

- 可看作pvc的模板
- 根据volumeClaimTemplates创建PVC，指定pvc名称大小，将自动创建pvc，且pvc必须由存储类供应。

## 比如写出一个prometheus使用的 volumeClaimTemplates

- 下面的例子代表定一个pvc模板
- accessModes为 ReadWriteOnce
- 过滤 设置了storageClassName为prometheus-lpv的pv
- 请求5GB大小

```yaml
  volumeClaimTemplates:
    - metadata:
        name: prometheus-data
      spec:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: "prometheus-lpv"
        resources:
          requests:
            storage: 5Gi

```

# StorageClass简介

- StorageClass作为对存储资源的抽象定义
- 对用户设置的PVC申请屏蔽后端存储的细节
- 一方面减少了用户对存储资源细节的关注
- 另一方面减少了管理员手工管理PV的工作
- 由系统自动完成PV的创建和绑定，实现了动态的资源供应

> 最终效果

- 用户提交PVC，里面指定存储类型，如果符合我们定义的StorageClass，则会为其自动创建PV并进行绑定。

## 定义StorageClass

- StorageClass的定义主要包括名称、后端存储的提供者（privisioner）和后端存储的相关参数配置
- StorageClass一旦被创建，就无法修改，如需修改，只能删除重建。

## 定义prometheus存储使用的StorageClass

- 将下面的内容写入 storage_class.yaml 中，作为prometheus所使用的

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: prometheus-lpv
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer

```

- 这里的volumeBindingMode: WaitForFirstConsumer很关键，意思就是延迟绑定，
- 延迟绑定的好处是，POD的调度要参考卷的分布
- 当开始调度POD的时候看看它要求的PV在哪里，然后就调度到该节点，然后进行PVC的绑定，最后在挂载到POD中
- 这样就保证了POD所在的节点就一定是PV所在的节点

# 本节重点介绍 :

- 了解pvc和pv的关系
- 动态创建pvc的模板volumeClaimTemplates
- 动态的资源供应StorageClass
  - WaitForFirstConsumer 延迟绑定

