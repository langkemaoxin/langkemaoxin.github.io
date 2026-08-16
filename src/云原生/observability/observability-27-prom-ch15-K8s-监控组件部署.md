---
title: Prometheus 第15章：K8s 监控组件部署
sidebarGroup: 可观测性
shortTitle: 27 K8s 监控组件部署
order: 27
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第15章（K8s 监控组件部署）合并笔记
---

> **Prometheus · 第 15 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 15.1 使用kubeadm 10分钟部署k8集群

# 本节重点介绍 : 
- 使用kubeadm安装kubernetes_v1.21.x

# 地址
- https://kuboard.cn/install/install-k8s.html
# 准备工作
```shell script

# 修改 hostname
hostnamectl set-hostname your-new-host-name
# 查看修改结果
hostnamectl status
# 设置 hostname 解析
echo "127.0.0.1   $(hostname)" >> /etc/hosts

```

# 必备包安装
```shell script

# 在 master 节点和 worker 节点都要执行
# 最后一个参数 1.21.0 用于指定 kubenetes 版本，支持所有 1.21.x 版本的安装
# 腾讯云 docker hub 镜像
# export REGISTRY_MIRROR="https://mirror.ccs.tencentyun.com"
# DaoCloud 镜像
# export REGISTRY_MIRROR="http://f1361db2.m.daocloud.io"
# 华为云镜像
# export REGISTRY_MIRROR="https://05f073ad3c0010ea0f4bc00b7105ec20.mirror.swr.myhuaweicloud.com"
# 阿里云 docker hub 镜像
export REGISTRY_MIRROR=https://registry.cn-hangzhou.aliyuncs.com
curl -sSL https://kuboard.cn/install-script/v1.21.x/install_kubelet.sh | sh -s 1.21.0

```

# master 
```shell script

# 只在 master 节点执行
# 替换 x.x.x.x 为 master 节点实际 IP（请使用内网 IP）
# export 命令只在当前 shell 会话中有效，开启新的 shell 窗口后，如果要继续安装过程，请重新执行此处的 export 命令
export MASTER_IP=192.168.0.112
# 替换 apiserver.demo 为 您想要的 dnsName
export APISERVER_NAME=apiserver.demo
# Kubernetes 容器组所在的网段，该网段安装完成后，由 kubernetes 创建，事先并不存在于您的物理网络中
export POD_SUBNET=10.100.0.1/16
echo "${MASTER_IP}    ${APISERVER_NAME}" >> /etc/hosts
curl -sSL https://kuboard.cn/install-script/v1.21.x/init_master.sh | sh -s 1.21.0
 

```

# worker
```shell script

export MASTER_IP=192.168.0.112
# 替换 apiserver.demo 为初始化 master 节点时所使用的 APISERVER_NAME
export APISERVER_NAME=apiserver.demo
echo "${MASTER_IP}    ${APISERVER_NAME}" >> /etc/hosts

```

# 本节重点总结: 
- 使用kubeadm安装kubernetes_v1.21.x

## 15.10 在k8s部署grafana-deployment并导入k8s大盘

# 本节重点介绍 :

- grafana deployment部署
- k8s大盘导入

# 准备yaml

# 部署工作

## 1. 修改yaml中的节点选择器标签 k8s-node01改为你自己的节点

## 2. 在节点上创建数据目录

```shell
mkdir -pv /data/grafana

```

## 3. 部署grafana

```shell
# 部署
kubectl apply -f deployment.yaml
# 检查 
[root@prome-master01 grafana]# kubectl get pod 
NAME                       READY   STATUS    RESTARTS   AGE
grafana-756fb84d84-h2jf7   1/1     Running   0          45s
[root@prome-master01 grafana]# 

```

## 4. 访问 节点的 :30000端口  账户密码 : admin/admin

## 5. 添加prometheus数据源，如果prometheus是 hostnetwork的，直接写node的ip:port即可

# 导入grafana大盘

## 基础大盘

- https://grafana.com/grafana/dashboards/13105
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512090000/7263a68146434016bede3587665513f4.png)

## Deployment Statefulset Daemonset 统计

- https://grafana.com/grafana/dashboards/8588
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512090000/60f013b99f8c4294a0a728fcfe392301.png)

## 集群汇总大盘

- https://grafana.com/grafana/dashboards/8685![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512090000/19ef24956b434b67a713c7d184ee9e05.png)

## apiserver 健康度

- https://grafana.com/grafana/dashboards/12006
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512090000/7a122c4ffef54b199345925464ee5d77.png)

# 本节重点总结 :

- grafana deployment部署
- k8s大盘导入

## 15.2 定义一个prometheus数据存储使用的pv

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

## 15.3 StorageClass和volumeClaimTemplates

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

## 15.4 prometheus使用的ClusterRole等RBAC对象

# 本节重点介绍 :

- k8s的rbac权限模型
- prometheus使用的ClusterRole
- prometheus使用的ClusterRoleBinding
- prometheus使用的serviceAccount

# rbac

- 基于角色（Role）的访问控制（RBAC）是一种基于组织中用户的角色来调节控制对 计算机或网络资源的访问的方法。

## RBAC API 声明了四种 Kubernetes 对象

- Role
- ClusterRole
- RoleBinding
- ClusterRoleBinding

## 可操作的资源

- Pods
- ConfigMaps
- Deployments
- Nodes
- Secrets
- Namespaces

# Role 与 ClusterRole

- Role 总是用来在某个名字空间 内设置访问权限
- ClusterRole 对象可以授予与 Role 对象相同的权限，但由于它们属于集群范围对象

## 定义 prometheus 使用的clusterRole

### rule 规则

- 规则是一组属于不同 API Group 资源上的一组操作的集合
- 规则可以配置属性如下

#### resources 代表可以操作的资源对象

- 如下面的nodes、endpoints、pods等

```yaml
  resources: # 资源
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
```

### apigroups 代表k8s的api集合

- apiGroups: [""] # 空字符串"" 表明使用 core API group
- 而Deployements属于 apps API Group

#### verbs代表可以执行的动作

- 比如下面的

```yaml
  verbs: ["get", "list", "watch"] 
```

#### nonResourceURLs:

- 在非资源型的URL 对象，如下面的/metrics接口可以执行get操作

```yaml
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
```

#### 完整的prometheus使用的clusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1 # api的version
kind: ClusterRole # 类型
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources: # 资源
  - nodes
  - nodes/metrics  
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"] 
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
```

# RoleBinding 与 ClusterRoleBinding

- 角色绑定将一个角色中定义的各种权限授予一个或者一组用户
- 角色绑定包含了一组相关主体（即 subject, 包括用户 ——User、用户组 ——Group、或者服务账户 ——Service Account）以及对被授予角色的引用。
- 在命名空间中可以通过 RoleBinding 对象授予权限，而集群范围的权限授予则通过 ClusterRoleBinding 对象完成。

## 定义prometheus使用的clusterRoleBinding

### roleRef指定与某 Role 或 ClusterRole 的绑定关系

```yaml
roleRef: # 选择需要绑定的Role
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
```

### Subject：主题，对应在集群中尝试操作的对象，集群中定义了3种类型的主题资源：

- User Account：用户，
- Group：组，这是用来关联多个账户的，集群中有一些默认创建的组，比如cluster-admin
- Service Account：服务帐号，通过Kubernetes API 来管理的一些用户帐号，和 namespace 进行关联的，适用于集群内部运行的应用程序
- 比如下面的 ServiceAccount对象

```yaml
subjects: # 对象
- kind: ServiceAccount
  name: prometheus
  namespace: kube-system
```

### 完整的prometheus使用的ClusterRoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef: # 选择需要绑定的Role
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects: # 对象
- kind: ServiceAccount
  name: prometheus
  namespace: kube-system
```

# 完整的prometheus rbac.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1 # api的version
kind: ClusterRole # 类型
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources: # 资源
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"] 
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus # 自定义名字
  namespace: kube-system # 命名空间
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef: # 选择需要绑定的Role
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects: # 对象
- kind: ServiceAccount
  name: prometheus
  namespace: kube-system

```

# 将完整的RBAC 配置写入 rbac.yaml中

# 本节重点总结 :

- k8s的rbac权限模型
- prometheus使用的ClusterRole
- prometheus使用的ClusterRoleBinding
- prometheus使用的serviceAccount

## 15.5 创建监控控制平面的service

# 本节重点介绍 :

- k8s中service的作用和类型
- 创建k8s控制平面的service 给prometheus采集用， 类型clusterIp
  - kube-scheduler
  - kube-controller-manager
  - kube-etcd

# service的作用

- Kubernetes Service定义了这样一种抽象： Service是一种可以访问 Pod逻辑分组的策略， Service通常是通过 Label Selector访问 Pod组。
- 当Pod宕机后重新生成时，其IP等状态信息可能会变动，Service会根据Pod的Label对这些状态信息进行监控和变更，保证上游服务不受Pod的变动而影响。

## service 类型

> Service在 K8s中有以下四种类型：

### ClusterIp

- 默认类型
- 自动分配一个仅 Cluster内部可以访问的虚拟 IP

### NodePort

- 在 ClusterIP基础上为 Service在每台机器上绑定一个端口
- 这样就可以通过 : NodePort来访问该服务

### LoadBalancer

- 在NodePort的基础上，借助 Cloud Provider创建一个外部负载均衡器，并将请求转发到 NodePort

### ExternalName

- 把集群外部的服务引入到集群内部来，在集群内部直接使用。没有任何类型代理被创建
- 只有 Kubernetes 1.7或更高版本的 kube-dns才支持。

# 为何这里要使用service

- 因为我们要监控控制平面组件，采用service让prometheus能够访问到他们

# 创建控制平面的service

## kube-scheduler的service

```yaml
---
apiVersion: v1
kind: Service
metadata:
  # 元信息
  namespace: kube-system
  name: kube-scheduler
  labels:
    k8s-app: kube-scheduler
spec:
  selector:
    # 标签选择器，因为对应的kube-scheduler的pod 有component=kube-scheduler这个标签
    component: kube-scheduler
  ports:
  - name: http-metrics
    port: 10259  # service的端口
  
    targetPort: 10259 # pod 的端口
    protocol: TCP #协议

```

## kube-controller-manager 的service

```yaml
--- 
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-controller-manager
  labels:
    k8s-app: kube-controller-manager
spec:
  selector:
    component: kube-controller-manager
  ports:
  - name: http-metrics
    port: 10257
    targetPort: 10257
    protocol: TCP

```

## kube-etcd 的service

```yaml
---
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-etcd
  labels:
    k8s-app: kube-etcd
spec:
  selector:
    component: etcd
    tier: control-plane
  ports:
  - name: http-metrics
    port: 2379
    targetPort: 2379
    protocol: TCP

```

# 将上述service写入一个yaml中，control_plane_service.yaml

# 本节重点总结 :

- k8s中service的作用和类型
- 创建k8s控制平面的service 给prometheus采集用， 类型clusterIp
  - kube-scheduler
  - kube-controller-manager
  - kube-etcd

## 15.6 创建prometheus使用的配置configmap

# 本节重点介绍 : 
- config简介
- prometheus configmap编写

# configmap
## 作用
- ConfigMap 是一种 API 对象，用来将非机密性的数据保存到键值对中
- 使用时， Pods 可以将其用作环境变量、命令行参数或者存储卷中的配置文件。

## 为何prometheus需要configmap 
- prometheus的配置文件需要以configmap形式挂载

# 编写prometheus 的configmap
- 字段中具体含义再后面的章节中再一一解释
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: kube-system
data:
  prometheus.yml: |
    global:
      scrape_interval:     30s
      evaluation_interval: 30s
      external_labels:
        cluster: "01"
    scrape_configs:
    - job_name: kube-etcd
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name]
        action: keep
        regex: kube-system;kube-etcd
      tls_config:
        ca_file: /etc/prometheus/secrets/etcd-certs/ca.crt
        cert_file: /etc/prometheus/secrets/etcd-certs/healthcheck-client.crt
        key_file: /etc/prometheus/secrets/etcd-certs/healthcheck-client.key
        insecure_skip_verify: true
    - job_name: 'kube-scheduler'
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name]
        action: keep
        regex: kube-system;kube-scheduler
    - job_name: 'kube-controller-manager'
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name]
        action: keep
        regex: kube-system;kube-controller-manager
    - job_name: 'kubernetes-apiservers'
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https
    - job_name: kube-state-metrics
      metrics_path: /metrics
      scheme: http
      static_configs:
      - targets:
        - kube-state-metrics:8080

    - job_name: kubernetes-nodes-kubelet
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    - job_name: kubernetes-nodes-cadvisor
      metrics_path: /metrics
      scheme: https
      kubernetes_sd_configs:
      - role: node
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      relabel_configs:
      - action: replace
        regex: (.+)
        source_labels:
        - __meta_kubernetes_node_label_kubernetes_io_hostname
        target_label: node
      - separator: ;
        regex: __meta_kubernetes_node_label_(.+)
        replacement: $1
        action: labelmap
      - separator: ;
        regex: (.*)
        target_label: __metrics_path__
        replacement: /metrics/cadvisor
        action: replace
    - job_name: kubernetes-pods
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - action: keep
        regex: true
        source_labels:
        - __meta_kubernetes_pod_annotation_prometheus_io_scrape
      - action: replace
        regex: (.+)
        source_labels:
        - __meta_kubernetes_pod_annotation_prometheus_io_path
        target_label: __metrics_path__
      - action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        source_labels:
        - __address__
        - __meta_kubernetes_pod_annotation_prometheus_io_port
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - action: replace
        source_labels:
        - __meta_kubernetes_namespace
        target_label: kubernetes_namespace
      - action: replace
        source_labels:
        - __meta_kubernetes_pod_name
        target_label: kubernetes_pod_name
    - job_name: 'kubernetes-service-endpoints'
      kubernetes_sd_configs:
      - role: endpoints
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scheme]
        action: replace
        target_label: __scheme__
        regex: (https?)
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
      - action: labelmap
        regex: __meta_kubernetes_service_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_service_name]
        action: replace
        target_label: kubernetes_name
      - source_labels: [__address__]
        action: replace
        target_label: instance
        regex: (.+):(.+)
        replacement: $1

```

# 本节重点介绍 : 
- config简介
- prometheus configmap编写

## 15.7 创建prometheus的statsfulset配置

# 本节重点介绍 : prometheus statsfulset yaml配置

- 设置statsfulset副本反亲和性
- 设置pod运行优先级
- 设置volumeClaimTemplates
- 设置配置文件热更新容器 configmap-reload
- 设置prometheus主容器

# statsfulset

## 设置元信息

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
  namespace: kube-system
  labels:
    k8s-app: prometheus
    kubernetes.io/cluster-service: "true"
```

## 设置定义标签和标签选择器

```yaml
spec:
  serviceName: "prometheus"
  podManagementPolicy: "Parallel"
  replicas: 1
  selector:
    matchLabels:
      k8s-app: prometheus
  template:
    metadata:
      labels:
        k8s-app: prometheus
    
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
```

## 设置副本反亲和性

- spec.template.spec.affinity
- 多个statsfulset副本不要调度到同一个节点上
-

```yaml
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: k8s-app
                operator: In
                values:
                - prometheus
            topologyKey: "kubernetes.io/hostname"
```

## 设置为 Pod 提供的卷 volumes

- spec.template.spec.volumes
- 挂载etcd证书和配置文件

```yaml
      volumes:
        - name: config-volume
          configMap:
            name: prometheus-config
        - name: secret-volume
          secret:
            secretName: etcd-certs   
```

## 关键插件 Pod 的调度保证 priorityClassName

- 设置如下

```yaml
      priorityClassName: system-cluster-critical
```

- priorityClassName设置pod 的优先级
- system-cluster-critical代表将 pod 标记为关键性（critical）
- 这样设置可以 使当Pod 无法被调度，调度程序会尝试抢占（驱逐）较低优先级的 Pod， 以使悬决 Pod 可以被调度。.

## 为了访问prometheus更方便，设置主机网络

```yaml
hostNetwork: true
dnsPolicy: ClusterFirstWithHostNet
```

- 代表prometheus可以使用和主机一样的网络
- 同时设置 dns策略为 hostNetwork

## 设置serviceAccountName

```yaml
serviceAccountName: prometheus
```

## 设置volumeClaimTemplates

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

## 设置第一个容器 prometheus-server-configmap-reload

- configmap-reload[项目地址](https://github.com/jimmidyson/configmap-reload)
- 它监视已安装的卷目录并通知目标进程配置的configmap已更改，然后发送http请求
- 我们使用它来做prometheus热更新配置

```yaml
      containers:
      - name: prometheus-server-configmap-reload
        image: "jimmidyson/configmap-reload:v0.4.0"
        imagePullPolicy: "IfNotPresent"
        args:
          - --volume-dir=/etc/config
          - --webhook-url=http://localhost:8091/-/reload
        volumeMounts:
          - name: config-volume
            mountPath: /etc/config
            readOnly: true
        resources:
          limits:
            cpu: 10m
            memory: 10Mi
          requests:
            cpu: 10m
            memory: 10Mi
```

- imagePullPolicy=IfNotPresent代表 镜像不存在时再拉取
- args代表启动的命令行参数
- volumeMounts代表 声明卷在容器中的挂载位置
- resources代表cpu内存资源情况
  - requests请求量
  - limits限制量

## 设置第二个容器 prometheus

```yaml
      - image: prom/prometheus:v2.29.1
        imagePullPolicy: IfNotPresent
        name: prometheus
        command:
          - "/bin/prometheus"
        args:
          - "--config.file=/etc/prometheus/prometheus.yml"
          - "--storage.tsdb.path=/prometheus"
          - "--storage.tsdb.retention=24h"
          - "--web.console.libraries=/etc/prometheus/console_libraries"
          - "--web.console.templates=/etc/prometheus/consoles"
          - "--web.enable-lifecycle"
          - "--web.listen-address=0.0.0.0:8091"
        ports:
          - containerPort: 8091
            protocol: TCP
        volumeMounts:
          - mountPath: "/prometheus"
            name: prometheus-data
          - mountPath: "/etc/prometheus"
            name: config-volume
          - name: secret-volume
            mountPath: "/etc/prometheus/secrets/etcd-certs"
            #readOnly: true
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 8091
          initialDelaySeconds: 30
          timeoutSeconds: 30
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 8091
          initialDelaySeconds: 30
          timeoutSeconds: 30
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 1000m
            memory: 2500Mi
        securityContext:
            runAsUser: 65534
            privileged: true
```

### readinessProbe 就绪探针

- kubelet 使用就绪探测器可以知道容器什么时候准备好了并可以开始接受请求流量
- 当一个 Pod 内的所有容器都准备好了，才能把这个 Pod 看作就绪了
- 这种信号的一个用途就是控制哪个 Pod 作为 Service 的后端
- 在 Pod 还没有准备好的时候，会从 Service 的负载均衡器中被剔除的。

### livenessProbe 存活探针

- kubelet 使用存活探测器来知道什么时候要重启容器
- 例如，存活探测器可以捕捉到死锁（应用程序在运行，但是无法继续执行后面的步骤）
- 这样的情况下重启容器有助于让应用程序在有问题的情况下更可用。

### securityContext 为 Pod 或容器配置安全性上下文

- runAsUser 以特定user运行容器
- privileged	运行特权容器

# 全部的配置 写入 statsfulset.yaml

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
  namespace: kube-system
  labels:
    k8s-app: prometheus
    kubernetes.io/cluster-service: "true"
spec:
  serviceName: "prometheus"
  podManagementPolicy: "Parallel"
  replicas: 1
  selector:
    matchLabels:
      k8s-app: prometheus
  template:
    metadata:
      labels:
        k8s-app: prometheus
      
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: k8s-app
                operator: In
                values:
                - prometheus
            topologyKey: "kubernetes.io/hostname"
      priorityClassName: system-cluster-critical
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: prometheus-server-configmap-reload
        image: "jimmidyson/configmap-reload:v0.4.0"
        imagePullPolicy: "IfNotPresent"
        args:
          - --volume-dir=/etc/config
          - --webhook-url=http://localhost:8091/-/reload
        volumeMounts:
          - name: config-volume
            mountPath: /etc/config
            readOnly: true
        resources:
          limits:
            cpu: 10m
            memory: 10Mi
          requests:
            cpu: 10m
            memory: 10Mi
      - image: prom/prometheus:v2.29.1
        imagePullPolicy: IfNotPresent
        name: prometheus
        command:
          - "/bin/prometheus"
        args:
          - "--config.file=/etc/prometheus/prometheus.yml"
          - "--storage.tsdb.path=/prometheus"
          - "--storage.tsdb.retention=24h"
          - "--web.console.libraries=/etc/prometheus/console_libraries"
          - "--web.console.templates=/etc/prometheus/consoles"
          - "--web.enable-lifecycle"
          - "--web.listen-address=0.0.0.0:8091"
        ports:
          - containerPort: 8091
            protocol: TCP
        volumeMounts:
          - mountPath: "/prometheus"
            name: prometheus-data
          - mountPath: "/etc/prometheus"
            name: config-volume
          - name: secret-volume
            mountPath: "/etc/prometheus/secrets/etcd-certs"
            #readOnly: true
        readinessProbe:
          httpGet:
            path: /-/ready
            port: 8091
          initialDelaySeconds: 30
          timeoutSeconds: 30
        livenessProbe:
          httpGet:
            path: /-/healthy
            port: 8091
          initialDelaySeconds: 30
          timeoutSeconds: 30
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 1000m
            memory: 2500Mi
        securityContext:
            runAsUser: 65534
            privileged: true
      serviceAccountName: prometheus
      volumes:
        - name: config-volume
          configMap:
            name: prometheus-config
        - name: secret-volume
          secret:
            secretName: etcd-certs   
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

# 本节重点总结 : prometheus statsfulset yaml配置

- 设置statsfulset副本反亲和性
- 设置pod运行优先级
- 设置volumeClaimTemplates
- 设置配置文件热更新容器 configmap-reload
- 设置prometheus主容器

## 15.8 在k8s部署prometheus statefulset

# 本节重点介绍 :

- 准备好这些yaml文件
- 部署ksm
- 部署prometheus

# 准备好这些yaml文件

| yaml文件名                   | 作用                       |
| ---------------------------- | -------------------------- |
| pv.yaml                      | prometheus数据目录使用的pv |
| rbac.yaml                    | prometheus使用的权限相关   |
| control_plane_service.yaml   | 服务组件暴露指标的service  |
| prometheus_config.yaml       | 配置文件configmap          |
| prometheus_storageclass.yaml | storageclass               |
| statsfulset.yaml             | pod主yaml                  |

# 部署工作

## 1.监控etcd需要创建 secret

```shell
#  在master上创建
kubectl create secret generic etcd-certs --from-file=/etc/kubernetes/pki/etcd/healthcheck-client.crt --from-file=/etc/kubernetes/pki/etcd/healthcheck-client.key --from-file=/etc/kubernetes/pki/etcd/ca.crt -n kube-system

# 查看
[root@prome-master01 prometheus]# kubectl get secret etcd-certs  -n kube-system
NAME         TYPE     DATA   AGE
etcd-certs   Opaque   3      18s
[root@prome-master01 prometheus]# kubectl describe secret etcd-certs  -n kube-system
Name:         etcd-certs
Namespace:    kube-system
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
ca.crt:                  1058 bytes
healthcheck-client.crt:  1159 bytes
healthcheck-client.key:  1675 bytes

```

## 2. 创建数据目录

```shell
# 在节点上创建数据目录
mkdir -pv /data/prometheus
chown -R nfsnobody:nfsnobody /data/prometheus/
```

## 3. 修改pv.yaml中的节点选择器标签 k8s-node01改为你自己的节点名字

## 4. 部署kube-stats-metrics

```shell
# 第一种方式，使用课程提供的yaml zip包 
kubectl apply -f kube-stats-metrics
# 第二种方式 ，去github上下载最新的yaml 部署  ，位置在 https://github.com/kubernetes/kube-state-metrics/tree/master/examples/standard

# 检查部署结果
[root@prome-master01 prometheus]# kubectl get pod -n kube-system
NAME                                     READY   STATUS    RESTARTS   AGE
coredns-7d75679df-7f7tx                  1/1     Running   0          86m
coredns-7d75679df-qmzbg                  1/1     Running   0          86m
etcd-prome-master01                      1/1     Running   0          86m
kube-apiserver-prome-master01            1/1     Running   0          86m
kube-controller-manager-prome-master01   1/1     Running   0          86m
kube-proxy-48dwz                         1/1     Running   0          84m
kube-proxy-gmvvn                         1/1     Running   0          86m
kube-scheduler-prome-master01            1/1     Running   0          86m
kube-state-metrics-647444dd74-h4tfk      1/1     Running   0          16s
[root@prome-master01 prometheus]# kubectl   -n kube-system logs kube-state-metrics-647444dd74-h4tfk -f 
[root@prome-master01 prometheus]# kubectl   -n kube-system logs kube-state-metrics-647444dd74-h4tfk -f 
I0822 08:43:44.211403       1 main.go:86] Using default collectors
I0822 08:43:44.211479       1 main.go:98] Using all namespace
I0822 08:43:44.211488       1 main.go:139] metric white-blacklisting: blacklisting the following items: 
W0822 08:43:44.211505       1 client_config.go:543] Neither --kubeconfig nor --master was specified.  Using the inClusterConfig.  This might not work.
I0822 08:43:44.213107       1 main.go:184] Testing communication with server
I0822 08:43:44.222378       1 main.go:189] Running with Kubernetes cluster version: v1.21. git version: v1.21.4. git tree state: clean. commit: 3cce4a82b44f032d0cd1a1790e6d2f5a55d20aae. platform: linux/amd64
I0822 08:43:44.222401       1 main.go:191] Communication with server successful
I0822 08:43:44.222515       1 main.go:225] Starting metrics server: 0.0.0.0:8080
I0822 08:43:44.222779       1 metrics_handler.go:96] Autosharding disabled
I0822 08:43:44.223338       1 builder.go:146] Active collectors: certificatesigningrequests,configmaps,cronjobs,daemonsets,deployments,endpoints,horizontalpodautoscalers,ingresses,jobs,limitranges,mutatingwebhookconfigurations,namespaces,networkpolicies,nodes,persistentvolumeclaims,persistentvolumes,poddisruptionbudgets,pods,replicasets,replicationcontrollers,resourcequotas,secrets,services,statefulsets,storageclasses,validatingwebhookconfigurations,volumeattachments
I0822 08:43:44.223913       1 main.go:200] Starting kube-state-metrics self metrics server: 0.0.0.0:8081

```

## 5 部署prometheus服务

```shell
# 部署，到prometheus yaml目录下 apply即可
kubectl apply -f /opt/app/prome_in_k8s_install/prometheus

# 检查，kube-system ns
[root@prome-master01 prometheus]# kubectl get pod -n kube-system
NAME                                     READY   STATUS    RESTARTS   AGE
coredns-7d75679df-7f7tx                  1/1     Running   0          88m
coredns-7d75679df-qmzbg                  1/1     Running   0          88m
etcd-prome-master01                      1/1     Running   0          88m
kube-apiserver-prome-master01            1/1     Running   0          88m
kube-controller-manager-prome-master01   1/1     Running   0          88m
kube-proxy-48dwz                         1/1     Running   0          87m
kube-proxy-gmvvn                         1/1     Running   0          88m
kube-scheduler-prome-master01            1/1     Running   0          88m
kube-state-metrics-647444dd74-h4tfk      1/1     Running   0          3m6s
prometheus-0                             2/2     Running   0          87s

```

## 6. 使用node的ip:8091即可访问prometheus服务

```shell
curl localhost:8091
```

# 7. 排查问题

- 容器基础资源和node kubelet metrics采集报403错误，现象如下
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512057000/ad1b4fae387c405bbd312c14023311fb.png)
- 解决方案 rbac.yaml resource添加 node/metrics即可
- kube-scheduler和kube-controller-manager 采集报错，如下
- ![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512057000/b74b416f2fc74b0fb0fcb087f92a9d91.png)
- 原因是因为 上述两个服务bind的地址是127.0.0.1 ,修改成0.0.0.0即可
- ```
  vim /etc/kubernetes/manifests/kube-scheduler.yaml
  vim /etc/kubernetes/manifests/kube-controller-manager.yaml 
  -bind-address=0.0.0.0 

  ```

# 最终的效果图![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512057000/6535e5abdbb745fe8d0e212586e54571.png)

![image.png](http://jutibolg.oss-cn-shenzhen.aliyuncs.com/908/1629512057000/fe9bfe0b4a914444a41d9edd5bfa2f74.png)

# 本节重点总结 :

- 准备好这些yaml文件
- 部署ksm
- 部署prometheus

## 15.9 grafana-deployment-yaml讲解

# 本节重点介绍 :

- grafana yaml讲解

## grafana 需要的pv

- 对应的路径为 /var/lib/grafana，主要存放的内容有
  - 本地sqlit db存放 grafana.db
  - 本地插件
  - 本地告警截图
- yaml如下

```yaml
---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: grafana-pv
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: grafana-storageclass
  local:
    path: /data/grafana
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - k8s-node01
```

## grafana-storageclass

- WaitForFirstConsumer 延迟挂载

```yaml
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: grafana-storageclass
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer

```

## pvc

```yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: grafana-storageclass
  resources:
    requests:
      storage: 1Gi
```

## 对外暴露服务的nodeport

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: grafana-node-port
  labels:
    name: grafana-node-port
spec:
  type: NodePort      #这里代表是NodePort类型的
  ports:
  - port: 80          #这里的端口和clusterIP 对应，即80,供内部访问。
    targetPort: 3000  #端口一定要和container暴露出来的端口对应，nodejs暴露出来的端口是8081，所以这里也应是8081
    protocol: TCP
    nodePort: 30000   # 所有的节点都会开放此端口，此端口供外部调用。
  selector:
    app: grafana           #这里选择器一定要选择容器的标签，之前写name:kube-node是错的。
```

## grafana deployment

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: grafana
  name: grafana
spec:
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      securityContext:
        fsGroup: 472
        supplementalGroups:
        - 0
      containers:
        - name: grafana
          image: grafana/grafana:7.5.2
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http-grafana
              protocol: TCP
          readinessProbe:
            failureThreshold: 3
            httpGet:
              path: /robots.txt
              port: 3000
              scheme: HTTP
            initialDelaySeconds: 10
            periodSeconds: 30
            successThreshold: 1
            timeoutSeconds: 2
          livenessProbe:
            failureThreshold: 3
            initialDelaySeconds: 30
            periodSeconds: 10
            successThreshold: 1
            tcpSocket:
              port: 3000
            timeoutSeconds: 1
          resources:
            requests:
              cpu: 250m
              memory: 750Mi
          volumeMounts:
            - mountPath: /var/lib/grafana
              name: grafana-pv
      volumes:
        - name: grafana-pv
          persistentVolumeClaim:
            claimName: grafana-pvc
```

- 就绪探针使用 /robots.txt
- 存活探针使用 tcp 3000端口的检测
- securityContext.fsGroup= 472 表示允许id=472的 用户组使用卷
- supplementalGroups:0 控制容器可以添加的组 ID

# 完整的grafana deployment yaml如下

```yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: grafana-storageclass
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: grafana
  name: grafana
spec:
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      securityContext:
        fsGroup: 472
        supplementalGroups:
        - 0
      containers:
        - name: grafana
          image: grafana/grafana:7.5.2
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http-grafana
              protocol: TCP
          readinessProbe:
            failureThreshold: 3
            httpGet:
              path: /robots.txt
              port: 3000
              scheme: HTTP
            initialDelaySeconds: 10
            periodSeconds: 30
            successThreshold: 1
            timeoutSeconds: 2
          livenessProbe:
            failureThreshold: 3
            initialDelaySeconds: 30
            periodSeconds: 10
            successThreshold: 1
            tcpSocket:
              port: 3000
            timeoutSeconds: 1
          resources:
            requests:
              cpu: 250m
              memory: 750Mi
          volumeMounts:
            - mountPath: /var/lib/grafana
              name: grafana-pv
      volumes:
        - name: grafana-pv
          persistentVolumeClaim:
            claimName: grafana-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: grafana-node-port
  labels:
    name: grafana-node-port
spec:
  type: NodePort      #这里代表是NodePort类型的
  ports:
  - port: 80          #这里的端口和clusterIP 对应，即80,供内部访问。
    targetPort: 3000  #端口一定要和container暴露出来的端口对应，nodejs暴露出来的端口是8081，所以这里也应是8081
    protocol: TCP
    nodePort: 30000   # 所有的节点都会开放此端口，此端口供外部调用。
  selector:
    app: grafana           #这里选择器一定要选择容器的标签，之前写name:kube-node是错的。
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: grafana-storageclass
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer

---

apiVersion: v1
kind: PersistentVolume
metadata:
  name: grafana-pv
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: grafana-storageclass
  local:
    path: /data/grafana
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - k8s-node01

```

# 本节重点总结 :

- grafana yaml讲解

