---
title: 基于K8S构建机器学习平台KubeFlow
sidebarGroup: 扩展专题
shortTitle: 04 基于K8S构建机器学习平台KubeFlow
order: 4
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 大数据与 ML
  - 云原生
  - 课程笔记
description: 基于K8S构建机器学习平台KubeFlow 一、KubeFlow介绍 KubeFlow 是一个开源的项目，旨在为 Kubernetes 提供可组合、便携式、可扩展的机器学习技术栈。它最初是为了解决在 ...
---

> **大数据与 ML · 第 4 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 基于K8S构建机器学习平台KubeFlow

# 一、KubeFlow介绍

KubeFlow 是一个开源的项目，旨在为 Kubernetes 提供可组合、便携式、可扩展的机器学习技术栈。它最初是为了解决在 Kubernetes 上运行分布式机器学习任务所带来的挑战而创建的。

Kubernetes 本身是一个容器平台，但在近年来，越来越多的公司开始用它来运行各种工作负载，特别是机器学习任务。由于分布式机器学习任务通常需要不同的参数服务器（PS）和工作节点（worker），并且不同领域的学习任务对 PS 和 worker 有不同的需求，因此 Kubernetes 在处理机器学习任务时存在一些困难。

KubeFlow 的核心组件是 TFJob，它是一个 Kubernetes 资源类型，用于定义 TensorFlow 作业。使用 TFJob，机器学习工程师可以按照他们对业务的理解，确定 PS 与 worker 的个数以及数据与日志的输入输出，而不需要编写繁杂的配置。KubeFlow 还提供了许多其他功能，如作业调度、多租户、网络隔离等，以简化机器学习任务在 Kubernetes 上的部署和管理。KubeFlow 的目标是让机器学习任务在 Kubernetes 上变得简单、可靠、可扩展和高效。

# 二、KubeFlow安装前准备

## 2.1 Kubernetes集群准备

> 基于Kubekey快速部署K8S集群

### 2.1.1 主机准备

| 主机名       | IP地址            | 备注   |
| ------------ | ----------------- | ------ |
| k8s-master01 | 192.168.10.160/24 | master |
| k8s-worker01 | 192.168.10.161/24 | worker |
| k8s-worker02 | 192.168.10.162/24 | worker |

~~~powershell
# vim /etc/hosts
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.160 k8s-master01
192.168.10.161 k8s-worker01
192.168.10.162 k8s-worker02
~~~

### 2.1.2 软件准备

> kubernetes版本大于等于1.18

| 软件名称  | 是否安装         |
| --------- | ---------------- |
| socat     | 必须安装         |
| conntrack | 必须安装         |
| ebtables  | 可选，但推荐安装 |
| ipset     | 可选，但推荐安装 |
| ipvsadm   | 可选，但推荐安装 |

~~~powershell
# yum -y install socat conntrack ebtables ipset ipvsadm
~~~

### 2.1.3 使用Kubekey部署多节点K8S集群

#### 2.1.3.1 Kubekey工具下载

![image-20230707180154343](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20230707180154343.png)

~~~powershell
[root@k8s-master01 ~]# curl -sfL https://get-kk.kubesphere.io | sh -
~~~

~~~powershell
[root@k8s-master01 ~]# ls
kk kubekey-v3.0.7-linux-amd64.tar.gz
~~~

~~~powershell
[root@k8s-master01 ~]# mv kk /usr/local/bin/
~~~

#### 2.1.3.2 多节点K8S集群部署

> 参考网址：https://www.kubesphere.io/zh/docs/v3.3/installing-on-linux/introduction/multioverview/
>
> 参考网址：https://github.com/kubesphere/kubekey

##### 2.1.3.2.1 创建kk部署K8S集群配置文件

~~~powershell
[root@k8s-master01 ~]# kk create config -f k8s.yaml

输出内容如下：
Generate KubeKey config file successfully
~~~

~~~powershell
[root@k8s-master01 ~]# ls
k8s.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# vim k8s.yaml
[root@k8s-master01 ~]# cat k8s.yaml

apiVersion: kubekey.kubesphere.io/v1alpha2
kind: Cluster
metadata:
  name: member1
spec:
  hosts:
  - {name: k8s-master01, address: 192.168.10.160, internalAddress: 192.168.10.160, user: root, password: "centos"}
  - {name: k8s-worker01, address: 192.168.10.161, internalAddress: 192.168.10.161, user: root, password: "centos"}
  - {name: k8s-worker02, address: 192.168.10.162, internalAddress: 192.168.10.162, user: root, password: "centos"}
  roleGroups:
    etcd:
    - k8s-master01
    control-plane:
    - k8s-master01
    worker:
    - k8s-worker01
    - k8s-worker02
  controlPlaneEndpoint:
    ## Internal loadbalancer for apiservers
    # internalLoadbalancer: haproxy

    domain: lb.kubemsb.com
    address: ""
    port: 6443
  kubernetes:
    version: v1.26.5
    clusterName: cluster.local
    autoRenewCerts: true
    containerManager: containerd
  etcd:
    type: kubekey
  network:
    plugin: calico
    kubePodsCIDR: 10.244.0.0/16
    kubeServiceCIDR: 10.96.0.0/16
    ## multus support. https://github.com/k8snetworkplumbingwg/multus-cni
    multusCNI:
      enabled: false
  registry:
    privateRegistry: ""
    namespaceOverride: ""
    registryMirrors: []
    insecureRegistries: []
  addons: []
~~~

> 关于认证方式，也可参考如下：
>
> 默认为root用户
>
> hosts:
>
>   - &#123;​name: master, address: 192.168.10.160, internalAddress: 192.168.10.160, password: centos&#125;
>
> 使用ssh密钥实现免密登录
>
> hosts:
>
>   - &#123;​name: master, address: 192.168.10.160, internalAddress: 192.168.10.160, privateKeyPath: "~/.ssh/id_rsa"&#125;

##### 2.1.3.2.2 执行kk创建k8s集群

~~~powershell
[root@k8s-master01 ~]# kk create cluster -f k8s.yaml
~~~

~~~powershell
执行安装结束后：
18:28:03 CST Pipeline[CreateClusterPipeline] execute successfully
Installation is complete.

Please check the result using the command:

        kubectl get pod -A
~~~

## 2.2 k8s集群持久存储动态供给准备

## 2.2.1  准备硬盘

~~~powershell
查看准备的磁盘
[root@nfsserver ~]# lsblk
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda               8:0    0  100G  0 disk
├─sda1            8:1    0    1G  0 part /boot
└─sda2            8:2    0   99G  0 part
  ├─centos-root 253:0    0   50G  0 lvm  /
  ├─centos-swap 253:1    0    2G  0 lvm  [SWAP]
  └─centos-home 253:2    0   47G  0 lvm  /home
sdb               8:16   0  100G  0 disk
~~~

## 2.2.2  安装NFS软件

~~~powershell
安装NFS软件，即是客户端也是服务器端
# yum -y install nfs-utils
~~~

## 2.2.3  NFS配置

~~~powershell
创建挂载点
# mkdir /netshare
~~~

~~~powershell
格式化硬盘
# mkfs.xfs /dev/sdb
~~~

~~~powershell
编辑文件系统配置文件
# vim /etc/fstab
在文件最后添加此行内容
/dev/sdb                /netshare               xfs     defaults        0 0
~~~

~~~powershell
手动挂载全部分区
# mount -a
~~~

~~~powershell
在本地查看文件系统挂载情况
# df -h
文件系统                 容量  已用  可用 已用% 挂载点

/dev/sdb                 100G   33M  100G    1% /netshare
~~~

~~~powershell
添加共享目录到配置文件
# vim /etc/exports
# cat /etc/exports
/netshare       *(rw,sync,no_root_squash)
~~~

~~~powershell
启动服务及设置开机自启动
# systemctl enable nfs-server
# systemctl start nfs-server
~~~

## 2.2.4 验证

~~~powershell
本地验证目录是否共享
# showmount -e
Export list for nfsserver:
/netshare *
~~~

~~~powershell
在k8s master节点验证目录是否共享
# showmount -e 192.168.10.163
Export list for 192.168.10.163:
/netshare *
~~~

~~~powershell
在k8s worker01节点验证目录是否共享
# showmount -e 192.168.10.163
Export list for 192.168.10.163:
/netshare *
~~~

## 2.2.5  部署存储动态供给

### 2.2.5.1  获取资源清单文件

~~~powershell
在k8s master节点获取NFS后端存储动态供给配置资源清单文件

# for file in class.yaml deployment.yaml rbac.yaml  ; do wget https://raw.githubusercontent.com/kubernetes-incubator/external-storage/master/nfs-client/deploy/$file ; done
~~~

~~~powershell
查看是否下载
# ls
class.yaml  deployment.yaml  rbac.yaml
~~~

### 2.2.5.2 应用资源清单文件

~~~powershell
应用rbac资源清单文件
# kubectl apply -f rbac.yaml
~~~

~~~powershell
修改存储类名称
# vim class.yaml
# cat class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client
provisioner: fuseim.pri/ifs # or choose another name, must match deployment's env PROVISIONER_NAME'
parameters:
  archiveOnDelete: "false"
~~~

~~~powershell
应用class（存储类）资源清单文件
# kubectl apply -f class.yaml
storageclass.storage.k8s.io/nfs-client created
~~~

~~~powershell
应用deployment资源清单文件之前修改其配置，主要配置NFS服务器及其共享的目录
# vim deployment.yaml

注意修改处内容

# vim deployment.yaml
# cat deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-client-provisioner
  labels:
    app: nfs-client-provisioner
  # replace with namespace where provisioner is deployed
  namespace: default
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: nfs-client-provisioner
  template:
    metadata:
      labels:
        app: nfs-client-provisioner
    spec:
      serviceAccountName: nfs-client-provisioner
      containers:
        - name: nfs-client-provisioner
          image: registry.cn-beijing.aliyuncs.com/pylixm/nfs-subdir-external-provisioner:v4.0.0
          volumeMounts:
            - name: nfs-client-root
              mountPath: /persistentvolumes
          env:
            - name: PROVISIONER_NAME
              value: fuseim.pri/ifs
            - name: NFS_SERVER
              value: 192.168.10.163
            - name: NFS_PATH
              value: /netshare
      volumes:
        - name: nfs-client-root
          nfs:
            server: 192.168.10.163
            path: /netshare

~~~

~~~powershell
应用资源清单文件
# kubectl apply -f deployment.yaml
~~~

~~~powershell
查看pod运行情况

# kubectl get pods
出现以下表示成功运行
NAME                                     READY   STATUS    RESTARTS   AGE
nfs-client-provisioner-8bcf6c987-7cb8p   1/1     Running   0          74s
~~~

~~~powershell
设置默认存储类
# kubectl patch storageclass nfs-client -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
~~~

~~~powershell
# kubectl get sc
NAME                   PROVISIONER      RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
nfs-client (default)   fuseim.pri/ifs   Delete          Immediate           false                  18m
~~~

### 2.2.5.3 测试用例验证动态供给是否可用

> 使用测试用例测试NFS后端存储是否可用

~~~powershell
测试用例：
# vim nginx.yaml
# cat nginx.yaml
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
    app: nginx
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  selector:
    matchLabels:
      app: nginx
  serviceName: "nginx"
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "nfs-client"
      resources:
        requests:
          storage: 1Gi
~~~

~~~powershell
# kubectl apply -f nginx.yaml
service/nginx created
statefulset.apps/web created
~~~

~~~powershell
# kubectl get pvc
NAME        STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
www-web-0   Bound    pvc-57bee742-326b-4d41-b241-7f2b5dd22596   1Gi        RWO            nfs-client     3m19s
~~~

## 2.3 Kustomize准备

> 从 Kubeflow 1.3 开始，所有组件都只能使用 kustomize 进行部署。
>
> k8s集群为1.26，原则上仅支持4.5.7版本kustomize，但是由于KubeFlow新版本需要用到5.0版本

~~~powershell
[root@k8s-master01 ~]# curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh"  | bash
v5.2.1
kustomize installed to //root/kustomize
~~~

~~~powershell
[root@k8s-master01 ~]# ls
kustomize
~~~

~~~powershell
[root@k8s-master01 ~]# mv kustomize /usr/bin/
~~~

~~~powershell
[root@k8s-master01 ~]# kustomize version
v5.2.1
~~~

## 2.4 KubeFlow安装源准备

~~~powershell
[root@k8s-master01 ~]# git clone https://github.com/kubeflow/manifests.git
~~~

~~~powershell
[root@k8s-master01 ~]# cd manifests/
[root@k8s-master01 manifests]# ls
apps  common  contrib  docs  example  go.mod  go.sum  hack  LICENSE  OWNERS  proposals  prow_config.yaml  README.md  tests
~~~

# 三、KubeFlow安装

## 3.1 一键 式安装

~~~powershell
[root@k8s-master01 manifests]# while ! kustomize build example | awk '!/well-defined/' | kubectl apply -f -; do echo "Retrying to apply resources"; sleep 10; done
~~~

~~~powershell
命令说明：
该命令使用kustomize工具来构建并输出example目录下的所有Kubernetes对象（如Deployment、Service等）。然后，它将这些对象传递给awk命令，以便过滤掉所有包含字符串“well-defined”的行。接下来，这些经过过滤的对象被传递给kubectl apply命令，以将其部署到集群中。
整个过程在一个while循环中运行，如果在任何一步中出现错误或失败，那么就会打印出一条消息，并等待10秒后再试一次。这个循环会一直持续到所有资源都成功部署为止。
~~~

~~~powershell
[root@k8s-master01 manifests]# kubectl get ns
NAME               STATUS   AGE
auth               Active   2m2s
cert-manager       Active   2m2s
default            Active   112m
istio-system       Active   2m2s
knative-eventing   Active   2m2s
knative-serving    Active   2m2s
kube-node-lease    Active   112m
kube-public        Active   112m
kube-system        Active   112m
kubeflow           Active   2m2s
kubekey-system     Active   112m
~~~

~~~powershell
[root@k8s-master01 manifests]# kubectl get pods -n cert-manager
NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-5d77b478-wm2jw                1/1     Running   0          16m
cert-manager-cainjector-576655b654-s94zp   1/1     Running   0          16m
cert-manager-webhook-795dc979b6-fnwn6      1/1     Running   0          16m
[root@k8s-master01 manifests]# kubectl get pods -n istio-system
NAME                                     READY   STATUS    RESTARTS   AGE
cluster-local-gateway-68d65cbd8c-9sv96   1/1     Running   0          16m
istio-ingressgateway-8f46b776-g4lj5      1/1     Running   0          16m
istiod-788f458f4b-tnlqk                  1/1     Running   0          16m
oidc-authservice-0                       1/1     Running   0          16m
[root@k8s-master01 manifests]# kubectl get pods -n auth
NAME                   READY   STATUS    RESTARTS   AGE
dex-6555448c78-gcvzx   1/1     Running   0          16m
[root@k8s-master01 manifests]# kubectl get pods -n knative-eventing
NAME                                  READY   STATUS    RESTARTS   AGE
eventing-controller-69c5d5659-n926g   1/1     Running   0          17m
eventing-webhook-5496bb69df-z6hgq     1/1     Running   0          17m
[root@k8s-master01 manifests]# kubectl get pods -n knative-serving
NAME                                     READY   STATUS    RESTARTS   AGE
activator-57888f4455-z4xmd               2/2     Running   0          16m
autoscaler-55449c6c49-vqnt2              2/2     Running   0          16m
controller-76bfc57447-dp7fj              2/2     Running   0          16m
domain-mapping-687fdbbfd-4bfp9           2/2     Running   0          16m
domainmapping-webhook-758fbc96c6-d9rnf   2/2     Running   0          16m
net-istio-controller-5f66f65c68-qpt75    2/2     Running   0          16m
net-istio-webhook-5694575876-dlplk       2/2     Running   0          16m
webhook-8d4d56959-7x8jv                  2/2     Running   0          16m
[root@k8s-master01 manifests]# kubectl get pods -n kubeflow
NAME                                                     READY   STATUS    RESTARTS        AGE
admission-webhook-deployment-7bcb7b4bb-7sgzh             1/1     Running   0               16m
cache-server-6ff6f476c9-nxgxv                            2/2     Running   0               16m
centraldashboard-56bd644999-kmt6q                        2/2     Running   0               16m
jupyter-web-app-deployment-776876677d-mvxl8              2/2     Running   0               16m
katib-controller-5976454f4-r295d                         1/1     Running   0               16m
katib-db-manager-885969977-trgmt                         1/1     Running   1 (14m ago)     16m
katib-mysql-66c8cdff4f-646mq                             1/1     Running   0               16m
katib-ui-657bfbcfbc-h5wzf                                2/2     Running   0               16m
kserve-controller-manager-666c9599b7-hlwz8               2/2     Running   0               16m
kserve-models-web-app-9fbcd79f5-2lgll                    2/2     Running   0               16m
kubeflow-pipelines-profile-controller-6f6bc888df-c7km9   1/1     Running   0               16m
metacontroller-0                                         1/1     Running   0               16m
metadata-envoy-deployment-5768dd6555-h92fv               1/1     Running   0               16m
metadata-grpc-deployment-6d744c66bb-p2mpj                2/2     Running   1 (6m44s ago)   16m
metadata-writer-7ddc76b8fb-mgdnv                         2/2     Running   1 (6m55s ago)   16m
minio-549846c488-52jbf                                   2/2     Running   0               16m
ml-pipeline-dd6ff7956-4wg7k                              2/2     Running   0               16m
ml-pipeline-persistenceagent-c6b85f7c5-mdnsg             2/2     Running   0               16m
ml-pipeline-scheduledworkflow-78c866877-46g2q            2/2     Running   0               16m
ml-pipeline-ui-69bbfd4f84-2856z                          2/2     Running   0               16m
ml-pipeline-viewer-crd-5c7767968b-mm8wm                  2/2     Running   1 (12m ago)     16m
ml-pipeline-visualizationserver-b8fd86c7c-pzrm9          2/2     Running   0               16m
mysql-5f968d4688-tjcw6                                   2/2     Running   0               16m
notebook-controller-deployment-6ddd9d745c-m7t4r          2/2     Running   1 (13m ago)     16m
profiles-deployment-85cf77f56b-6lwlj                     3/3     Running   2 (8m7s ago)    16m
pvcviewer-controller-manager-6d59c4d6c7-tvch6            3/3     Running   1 (7m58s ago)   16m
tensorboard-controller-deployment-5ccf8cf786-bmbnw       3/3     Running   2 (8m1s ago)    16m
tensorboards-web-app-deployment-dcd8774cc-knzhf          2/2     Running   0               16m
training-operator-754d664965-ffbfd                       1/1     Running   0               16m
volumes-web-app-deployment-f9d8f7fcb-km7t8               2/2     Running   0               16m
workflow-controller-545cbd7ddb-nd7pc                     2/2     Running   1 (12m ago)     16m
[root@k8s-master01 manifests]# kubectl get pods -n kubeflow-user-example-com
NAME                                              READY   STATUS    RESTARTS   AGE
ml-pipeline-ui-artifact-5d57748649-rj9mb          2/2     Running   0          8m14s
ml-pipeline-visualizationserver-58d948d4c-cnwqm   2/2     Running   0          8m14s
[root@k8s-master01 manifests]#
[root@k8s-master01 manifests]# kubectl get svc -n istio-system
NAME                    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                                 AGE
authservice             ClusterIP   10.233.38.140   <none>        8080/TCP                                18m
cluster-local-gateway   ClusterIP   10.233.57.1     <none>        15020/TCP,80/TCP                        18m
istio-ingressgateway    ClusterIP   10.233.38.105   <none>        15021/TCP,80/TCP,443/TCP                18m
istiod                  ClusterIP   10.233.58.97    <none>        15010/TCP,15012/TCP,443/TCP,15014/TCP   18m
knative-local-gateway   ClusterIP   10.233.20.214   <none>        80/TCP                                  18m
~~~

~~~powershell
[root@k8s-master01 manifests]# kubectl get pv
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                          STORAGECLASS   REASON   AGE
pvc-11358692-bd68-43df-a816-a5eeac00e730   20Gi       RWO            Delete           Bound    kubeflow/minio-pvc             nfs-client              18m
pvc-601d0876-7584-4e27-831b-82d5d64d9978   10Gi       RWO            Delete           Bound    kubeflow/katib-mysql           nfs-client              18m
pvc-665102fc-de3f-4dad-817f-888d2c3bd1ec   20Gi       RWO            Delete           Bound    kubeflow/mysql-pv-claim        nfs-client              18m
pvc-67d23ff8-7107-4923-a94c-acf552e104b9   10Gi       RWO            Delete           Bound    istio-system/authservice-pvc   nfs-client              18m
~~~

## 3.2 分步骤组件安装

目前Kubeflow 主要包含开发、构建、训练、部署四个环节，可全面支持企业用户的机器学习、深度学习完整使用过程。

![image-20231128102641601](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231128102641601.png)

通过Kubeflow用户可以使用Jupyter开发模型，然后使用fairing（SDK）等工具构建容器，并创建Kubernetes资源训练其模型。模型训练完成后，用户还可以使用KFServing创建和部署用于推理的服务器。再结合pipeline（流水线）功能可实现端到端机器学习系统的自动化敏捷构建，实现AI领域的DevOps。

仅使用 kubectl 和 kustomize 分别安装每个 Kubeflow 官方组件（在 apps目录 中）和每个公共服务（在 common 目录中）
kubectl apply 命令可能在第一次尝试时失败。这是 Kubernetes 和 kubectl 工作方式所支持的（例如，CR 必须在 CRD 准备就绪后创建）。解决方案是简单地重新运行该命令，直到成功为止。对于一键部署命令，包含了一个 bash 单行命令”awk '!/well-defined/“来重试该命令。

### 3.2.1 Cert-manager

Kubeflow 组件使用 cert-manager 来为准入 Webhooks 提供证书。
Install cert-manager:

~~~powershell
kustomize build common/cert-manager/cert-manager/base | kubectl apply -f -
~~~

~~~powershell
kubectl wait --for=condition=ready pod -l 'app in (cert-manager,webhook)' --timeout=180s -n cert-manager

说明：
这条命令的作用是在 cert-manager 命名空间中等待所有带有 app=cert-manager 或 app=webhook 标签的 Pod 达到 ready 状态，最多等待 180 秒。这通常用于部署或更新过程中，以确保相关的 Pod 已经正确启动并运行。
~~~

~~~powershell
kustomize build common/cert-manager/kubeflow-issuer/base | kubectl apply -f -
~~~

### 3.2.2 istio

Kubeflow 组件使用 Istio 来保护其流量、强制网络授权和实施路由策略。
Install Istio:

~~~powershell
kustomize build common/istio-1-17/istio-crds/base | kubectl apply -f -
~~~

~~~powershell
kustomize build common/istio-1-17/istio-namespace/base | kubectl apply -f -
~~~

~~~powershell
kustomize build common/istio-1-17/istio-install/base | kubectl apply -f -
~~~

### 3.2.3 Dex

Dex 是一个身份验证服务，它的主要作用是充当 OpenID Connect (OIDC) 提供者，提供与多种身份验证后端的集成。在这个背景下，Dex 的作用可以分为几个关键方面：

1. **身份验证中介**：Dex 充当一个中介，连接客户端应用和身份验证提供者。客户端应用通过 Dex 进行用户身份验证，而 Dex 再与后端的身份验证提供者（如 LDAP, SAML, OAuth2 等）进行交互。
2. **OpenID Connect 提供者**：作为一个 OIDC 提供者，Dex 支持 OpenID Connect 协议，这是一个基于 OAuth 2.0 的身份验证层。这允许它与支持 OIDC 的各种客户端和应用进行交互。
3. **多后端支持**：Dex 的一个关键特点是它能够与多种身份验证后端集成。这意味着它可以接入不同的身份源，如社交网络登录、企业身份系统等，提供统一的身份验证接口。
4. **安全性和标准遵从性**：作为 OIDC 提供者，Dex 遵循标准的安全协议和最佳实践，保障用户身份数据的安全。
5. **集成和扩展性**：由于其对多种身份验证后端的支持，Dex 可以在各种环境中部署，包括但不限于云环境、本地部署等。它的灵活性使其适用于多种不同的应用场景。
6. **简化身份验证流程**：Dex 通过提供一个统一的身份验证入口，简化了应用和服务的身份验证流程。这对于那些需要与多个身份提供者集成的大型系统尤为有益。

总之，Dex 在现代云原生和分布式系统中发挥着重要作用，它通过支持多种身份验证后端和遵循 OpenID Connect 标准，提供了一个灵活、安全的身份验证解决方案。

在此默认安装中，它包括一个电子邮件地址为 user@example.com 的静态用户。默认情况下，用户的密码为 12341234。对于任何生产 Kubeflow 部署，你应该按照相关部分更改默认密码。

~~~powershell
kustomize build common/dex/overlays/istio | kubectl apply -f -
~~~

### 3.2.4 OIDC AuthService

OIDC（OpenID Connect）AuthService 是一种用于身份验证的服务，主要用于在微服务架构和分布式系统中管理用户身份和访问控制。其核心作用可以概括为以下几点：

1. **身份验证**：OIDC AuthService 的主要功能是验证用户的身份。它使用 OpenID Connect 协议来安全地验证用户身份，确保只有经过验证的用户才能访问受保护的资源。
2. **单点登录（SSO）**：通过使用 OIDC，AuthService 可以实现单点登录，允许用户使用一组凭据在多个应用程序和服务之间进行无缝切换，提高用户体验和安全性。
3. **集成第三方身份提供者**：OIDC AuthService 允许系统集成第三方身份提供者（如 Google, Facebook, Okta 等），使得用户可以使用这些服务的账户进行身份验证。
4. **标准化协议**：OpenID Connect 是 OAuth 2.0 协议的扩展，提供了一种标准化的方式来获取用户身份信息。这使得 AuthService 可以与遵循这些标准的各种客户端和身份提供者协同工作。
5. **安全令牌交换**：OIDC AuthService 负责生成、验证和交换安全令牌（如 ID 令牌和访问令牌）。这些令牌包含了用户的认证和授权信息，用于保护资源访问。
6. **减轻应用负担**：通过中央处理身份验证，单个应用或服务不需要独立处理复杂的认证逻辑。这减轻了每个应用的开发和维护负担。
7. **扩展性和兼容性**：作为一个独立服务，OIDC AuthService 可以轻松集成到现有的架构中，支持微服务和容器化部署，提高整体架构的灵活性和可扩展性。

总之，OIDC AuthService 为分布式系统和微服务架构提供了一种安全、高效、可扩展的身份验证解决方案，它通过标准化的协议简化了身份管理，并提高了系统的安全性和用户体验。

OIDC AuthService 扩展了你的 Istio Ingress-Gateway 功能，使其能够充当 OIDC 客户端：

~~~powershell
 kustomize build common/oidc-client/oidc-authservice/base | kubectl apply -f -
~~~

### 3.2.5 Knative

Knative 由 KServe 官方 Kubeflow 组件提供。
Install Knative Serving:

~~~powershell
kustomize build common/knative/knative-serving/overlays/gateways | kubectl apply -f -
~~~

~~~powershell
kustomize build common/istio-1-17/cluster-local-gateway/base | kubectl apply -f -
~~~

或者，您可以安装 Knative Eventing，它可用于推理请求日志记录：

~~~powershell
kustomize build common/knative/knative-eventing/base | kubectl apply -f -
~~~

### 3.2.6 Kubeflow命名空间

创建 Kubeflow 组件所在的命名空间。该命名空间名为 kubeflow。

~~~powershell
kustomize build common/kubeflow-namespace/base | kubectl apply -f -
~~~

### 3.2.7 KubeFlow Roles

创建 Kubeflow ClusterRoles、kubeflow-view、kubeflow-edit 和 kubeflow-admin。 Kubeflow 组件将权限聚合到这些 ClusterRoles。

~~~powershell
kustomize build common/kubeflow-roles/base | kubectl apply -f -
~~~

### 3.2.8 Kubeflow Istio Resources

Kubeflow 与 Istio 结合使用时，Istio Resources 在 Kubeflow 中的作用主要体现在几个关键方面：

1. **服务网格管理**：Istio 是一个服务网格，提供了一种将微服务网络通信逻辑从应用程序代码中分离出来的方式。在 Kubeflow 环境中，Istio 用于管理和控制微服务间的网络流量。
2. **安全性和访问控制**：Istio 提供了强大的安全性特性，包括服务间的身份验证和授权。在 Kubeflow 中，这意味着可以更安全地管理服务对服务的访问，确保只有授权的服务可以互相通信。
3. **流量管理**：Istio Resources 使 Kubeflow 能够精细地控制服务间的流量，包括路由规则、重试、故障注入和流量分割。这对于在 Kubeflow 中实现复杂的微服务策略至关重要。
4. **可观测性**：Istio 为 Kubeflow 中的服务提供了丰富的度量标准、日志记录和跟踪功能。这些信息对于监控和分析服务性能和问题解决非常有用。
5. **灵活的负载均衡**：Istio 在 Kubeflow 中提供了灵活的负载均衡功能，包括基于权重的路由和自动缩放。
6. **网关管理**：Istio 网关允许 Kubeflow 控制进出集群的流量。通过配置网关，可以管理入口和出口流量，以及与外部服务的连接。
7. **跨集群通信**：对于跨 Kubernetes 集群部署的 Kubeflow 环境，Istio 可以帮助实现集群间的安全和高效通信。

综上所述，Istio Resources 在 Kubeflow 中的作用是提供一个全面的、基于网络的解决方案，它不仅增强了服务通信的安全性和可靠性，还提供了高级的流量管理和可观测性功能，这对于管理复杂的机器学习工作流程和微服务架构至关重要。

创建 Kubeflow 所需的 Istio 资源。此 kustomization 当前在命名空间 kubeflow 中创建一个名为 kubeflow-gateway 的 Istio 网关。

~~~powershell
kustomize build common/istio-1-17/kubeflow-istio-resources/base | kubectl apply -f -
~~~

### 3.2.9 Kubeflow Pipelines

Kubeflow Pipelines 是 Kubeflow 项目的一个重要组成部分，专门用于构建、部署和管理机器学习 (ML) 管道。它在 Kubernetes 上提供了一个平台，用于自动化、监控和管理机器学习工作流程。其主要作用包括：

1. **自动化机器学习工作流**：Kubeflow Pipelines 允许用户定义、部署和管理复杂的机器学习工作流（pipelines），这些工作流可以自动执行各种机器学习任务，如数据预处理、模型训练、模型评估和部署。
2. **组件重用和共享**：通过定义可重用的组件，Kubeflow Pipelines 促进了代码和资源的重用。这些组件可以被不同的管道共享，从而减少重复工作，提高效率。
3. **可伸缩和可扩展**：Kubeflow Pipelines 在 Kubernetes 上运行，从而继承了 Kubernetes 的可伸缩性和弹性。这意味着它可以很容易地扩展以处理大型数据集和复杂的机器学习任务。
4. **端到端的机器学习流程**：Kubeflow Pipelines 支持从数据准备到模型训练、验证、部署直至监控的整个机器学习生命周期，使得整个过程更加一体化和自动化。
5. **实验跟踪和版本控制**：Kubeflow Pipelines 提供了实验跟踪和版本控制功能，允许数据科学家跟踪、比较和复现不同的实验和模型版本。
6. **界面和可视化**：它提供了一个用户友好的界面，用于构建、监控和管理机器学习管道。此外，还支持各种可视化工具，帮助用户更好地理解和分析机器学习流程和结果。
7. **集成和互操作性**：Kubeflow Pipelines 可以与各种机器学习工具和平台集成，如 TensorFlow, PyTorch, MXNet 等，提供广泛的互操作性。

总的来说，Kubeflow Pipelines 是机器学习工程师和数据科学家的一个强大工具，它利用 Kubernetes 的强大功能，提供了一个灵活、可伸缩的平台来简化和自动化机器学习流程。

安装多用户 Kubeflow Pipelines 官方 Kubeflow 组件：

~~~powershell
kustomize build apps/pipeline/upstream/env/cert-manager/platform-agnostic-multi-user | awk '!/well-defined/' | kubectl apply -f -
~~~

不要再使用已弃用且不安全的 PNS 执行器

~~~powershell
kustomize build apps/pipeline/upstream/env/platform-agnostic-multi-user-pns | kubectl apply -f -
~~~

### 3.2.10 KServe

KServe（原名 KFServing），是 Kubeflow 生态系统中的一个关键组件，专门用于简化和优化在 Kubernetes 上部署和服务化机器学习（ML）模型的过程。KServe 的主要作用可以概括为以下几点：

1. **模型部署**：KServe 提供了一个简单的方法来部署机器学习模型。它支持多种机器学习框架，如 TensorFlow, PyTorch, Scikit-learn 等，允许用户快速将这些模型部署为可扩展的、生产级别的服务。
2. **模型服务化**：一旦模型部署完成，KServe 使其可以作为一个服务进行访问。这包括处理入口请求、模型推断、响应输出等。
3. **自动缩放**：KServe 支持基于负载的自动水平缩放，可以根据请求的数量自动增加或减少服务实例的数量，这有助于处理不同的流量需求。
4. **多模型服务**：KServe 支持在单个服务中托管多个模型，这有助于优化资源利用率和管理多个模型。
5. **模型版本控制**：通过支持模型版本控制，KServe 允许用户轻松管理、更新和回滚模型版本。
6. **模型监控和日志记录**：KServe 提供了模型性能监控和日志记录功能，使得用户可以跟踪模型的运行状态和性能指标。
7. **集成其他 Kubeflow 组件**：KServe 可以与 Kubeflow 的其他组件（如 Kubeflow Pipelines）集成，提供端到端的机器学习工作流程。
8. **支持高级功能**：例如，A/B 测试、金丝雀部署等，这些功能有助于在生产环境中安全地测试和部署模型。

总而言之，KServe 在 Kubeflow 生态系统中扮演着模型部署和服务化的核心角色，它提供了一种高效、灵活的方式来将机器学习模型带入生产环境，同时保证了模型的可管理性、可扩展性和高性能。

KFServing 更名为 KServe。

Install the KServe component:

~~~powershell
kustomize build contrib/kserve/kserve | kubectl apply -f -
~~~

nstall the Models web app:

~~~powershell
kustomize build contrib/kserve/models-web-app/overlays/kubeflow | kubectl apply -f -
~~~

### 3.2.11 Katib

Katib 是 Kubeflow 生态系统中的一个组件，专门用于自动化机器学习（ML）模型的超参数调优。Katib 的主要作用和特点可以概括如下：

1. **自动化超参数调优**：Katib 的核心作用是自动化机器学习模型的超参数调优过程。在机器学习中，超参数是指那些在学习过程开始之前设置的参数，如学习率、层数等。Katib 自动运行多个训练试验，每次试验使用不同的超参数组合，以找到最优化模型性能的参数设置。
2. **支持多种调优算法**：Katib 支持多种超参数调优算法，包括网格搜索、随机搜索、贝叶斯优化等，用户可以根据自己的需求选择最适合的算法。
3. **可扩展和灵活**：由于是构建在 Kubernetes 之上，Katib 可以轻松扩展以满足大规模的超参数调优需求。同时，它的设计允许灵活地适配不同的机器学习框架和环境。
4. **实验跟踪和管理**：Katib 提供了一个用户界面和 API，用于创建、管理和跟踪超参数调优实验。用户可以通过这些界面查看实验的进度和结果。
5. **集成其他 Kubeflow 组件**：Katib 可以与 Kubeflow 的其他组件（如 Kubeflow Pipelines）集成，形成一个完整的机器学习工作流程。
6. **提高模型性能和效率**：通过自动化和优化超参数调优过程，Katib 帮助提高模型的性能，并减少手动试验和错误的时间和资源消耗。
7. **适用于各种机器学习任务**：无论是分类、回归还是其他更复杂的机器学习任务，Katib 都能有效地进行超参数调优。

总之，Katib 在 Kubeflow 生态系统中提供了一个高效、灵活的超参数调优工具，通过自动化和优化模型参数选择过程，它帮助用户更快地达到更好的模型性能。

Install the Katib official Kubeflow component:

~~~powershell
kustomize build apps/katib/upstream/installs/katib-with-kubeflow | kubectl apply -f -
~~~

### 3.2.12 Central Dashboard

Central Dashboard 是 Kubeflow 生态系统中的一个关键组件，它提供了一个统一的用户界面（UI），通过这个界面用户可以访问和管理 Kubeflow 的各种功能和资源。Central Dashboard 的主要作用和特点包括：

1. **统一的访问点**：Central Dashboard 作为 Kubeflow 生态系统的中心界面，为用户提供了一个单一的入口来访问和使用各种 Kubeflow 组件和服务。
2. **资源管理和监控**：通过 Central Dashboard，用户可以轻松地管理和监控在 Kubeflow 中运行的资源，如训练作业、管道、模型部署等。
3. **用户友好的界面**：它提供了一个直观、易于使用的图形界面，使得即使是对 Kubernetes 不太熟悉的用户也能轻松上手使用 Kubeflow。
4. **快速导航和操作**：用户可以通过 Central Dashboard 快速导航到不同的 Kubeflow 组件，如 Katib、Pipelines、Notebooks 等，并执行各种操作。
5. **多租户支持**：Central Dashboard 支持 Kubeflow 的多租户功能，允许不同的用户和团队在同一 Kubeflow 实例中安全地共享资源，同时保持数据和资源的隔离。
6. **集成 Kubeflow 组件**：它整合了 Kubeflow 中的各种组件，如 Notebooks、Pipelines、Katib 等，使得用户能够从一个地方监控和管理所有机器学习活动。
7. **个性化和定制**：Central Dashboard 允许一定程度的个性化和定制，用户可以根据自己的需求和偏好调整界面和设置。
8. **快速访问文档和支持**：它还提供了对文档和支持资源的快速访问，帮助用户更好地了解和使用 Kubeflow。

总的来说，Central Dashboard 为 Kubeflow 用户提供了一个方便、高效的方式来管理和操作整个 Kubeflow 生态系统，从而简化了机器学习工作流程的管理和监控。

Install the Central Dashboard official Kubeflow component:

~~~powershell
kustomize build apps/centraldashboard/upstream/overlays/kserve | kubectl apply -f -
~~~

### 3.2.13 Admission Webhook

在 Kubernetes 中，Admission Webhooks 是一种强大的机制，用于拦截对 Kubernetes API 的请求，并在对象被持久化到集群存储之前或之后执行自定义的逻辑。Admission Webhooks 主要有两种类型：Mutating Admission Webhooks 和 Validating Admission Webhooks。它们的作用如下：

1. **Mutating Admission Webhooks**：
   - 这类 Webhooks 在对象被持久化之前修改（“变异”）API请求中的对象。例如，它们可以用来设置默认值、添加额外的注解、修改 Pod 模板等。
   - 它们可以确保即使用户提交的对象定义不完整或不符合某些默认标准，对象也能被正确地创建或更新。
2. **Validating Admission Webhooks**：
   - 这些 Webhooks 在对象被持久化之前对 API 请求进行校验。它们用来确保提交的对象符合集群策略或用户定义的规则。
   - 如果请求的对象不符合规定的标准或策略，Validating Admission Webhook 会拒绝请求，并返回错误信息。
3. **集群安全和政策执行**：
   - Admission Webhooks 是实施集群级安全策略和规则的关键工具。例如，它们可以防止非授权用户创建特定类型的资源，或者确保所有的 Pods 都符合安全标准。
4. **自定义和扩展 Kubernetes 功能**：
   - 通过 Admission Webhooks，开发者和集群管理员可以在不修改 Kubernetes 核心代码的情况下扩展 Kubernetes 的功能。这使得 Kubernetes 更加灵活和可定制。
5. **集成外部服务和逻辑**：
   - Admission Webhooks 可以用来将 Kubernetes 集群与外部系统和服务集成，例如，用于验证、日志记录、监控或与其他管理工具的集成。
6. **灵活性和动态配置**：
   - 相比于其他扩展和定制 Kubernetes 的方法，Admission Webhooks 提供了更高的灵活性。它们可以动态地添加到集群中，而无需重启 API 服务器或影响集群的其他部分。

总之，Admission Webhooks 在 Kubernetes 中提供了一个强大的机制，用于自定义和增强 API 请求的处理。它们对于保障集群的安全性、实施策略、以及集成外部逻辑和服务至关重要。

Install the Admission Webhook for PodDefaults:

~~~powershell
kustomize build apps/admission-webhook/upstream/overlays/cert-manager | kubectl apply -f -
~~~

### 3.2.14 Notebooks

在 Kubeflow 中，Notebooks 是一个重要的组件，用于提供 Jupyter Notebook 的云原生集成。Kubeflow Notebooks 允许数据科学家和机器学习工程师在 Kubernetes 环境中方便地创建、管理和共享 Jupyter 笔记本。其作用可以从以下几个方面进行阐述：

1. **交互式数据科学和机器学习环境**：Kubeflow Notebooks 提供了一个交互式环境，用于探索数据、训练机器学习模型、可视化结果等。这种环境非常适合于实验性和探索性的数据工作。
2. **容器化和云原生**：Notebooks 在 Kubeflow 中是容器化的，这意味着它们可以充分利用 Kubernetes 提供的弹性、可伸缩性和故障恢复功能。
3. **支持多种机器学习框架**：Kubeflow Notebooks 支持多种机器学习和数据科学框架，如 TensorFlow, PyTorch, Scikit-learn 等，提供了灵活性来选择最适合项目需求的工具。
4. **资源隔离和管理**：通过 Kubeflow，用户可以为每个 Notebook 分配特定的资源（如 CPU、GPU、内存），实现有效的资源管理和隔离。
5. **便于协作和共享**：Kubeflow Notebooks 支持共享，使得团队成员可以轻松协作，共享笔记本、数据和模型。
6. **集成 Kubeflow 组件**：Notebooks 可以无缝集成 Kubeflow 的其他组件，例如，可以从 Notebook 直接访问 Kubeflow Pipelines，方便地构建和部署机器学习管道。
7. **可重复性和版本控制**：在 Kubeflow 中，Notebooks 的环境和依赖可以被版本控制和重现，这对于保证实验的可重复性和结果的一致性至关重要。
8. **适合于教育和演示**：由于 Jupyter Notebooks 的交互性和易用性，它们在教育和演示机器学习概念和技术时非常受欢迎。

总体来说，Kubeflow Notebooks 为数据科学家和机器学习工程师提供了一个强大、灵活和用户友好的工具，使他们能够在一个统一且强大的云原生环境中进行数据科学和机器学习工作。

Install the Notebook Controller official Kubeflow component:

~~~powershell
kustomize build apps/jupyter/notebook-controller/upstream/overlays/kubeflow | kubectl apply -f -
~~~

Install the Jupyter Web App official Kubeflow component:

~~~powershell
kustomize build apps/jupyter/jupyter-web-app/upstream/overlays/istio | kubectl apply -f -
~~~

### 3.2.15 Profiles + KFAM

在 Kubeflow 生态系统中，Profiles 和 KFAM（Kubeflow Access Management）共同工作，提供了一种用于管理多租户环境和访问控制的机制。这些组件的作用可以从以下几个方面进行详细解释：

1. **多租户管理（Profiles）**：
   - Profiles 是 Kubeflow 中用于实现多租户隔离的组件。在 Kubeflow 中，一个 Profile 对应一个 Kubernetes 命名空间，并且附带有一组定制的资源和访问策略。
   - 通过创建不同的 Profiles，Kubeflow 可以为不同的用户或团队提供隔离的工作空间，每个工作空间都有自己的资源、角色和权限设置。
2. **访问管理（KFAM）**：
   - KFAM（Kubeflow Access Management）是用于管理用户对 Kubeflow 资源的访问权限的组件。
   - 它处理与用户和权限相关的操作，如添加或删除用户、分配角色和权限等。
3. **资源和权限控制**：
   - Profiles 和 KFAM 结合使用，可以精细地控制用户和团队对 Kubeflow 资源的访问。例如，可以限制用户只能在其自己的命名空间中创建和管理资源。
4. **简化的用户体验**：
   - 这些组件为用户提供了一种简化的方式来管理 Kubeflow 环境。用户可以通过简单的界面操作来管理权限和访问控制，而无需深入了解 Kubernetes 的复杂权限系统。
5. **安全性和合规性**：
   - 在多租户环境中，保障数据和资源的隔离对于维护整体系统的安全性和合规性至关重要。Profiles 和 KFAM 提供了必要的工具来确保这种隔离。
6. **适应不同组织结构**：
   - 这一组合允许 Kubeflow 灵活地适应不同组织的结构和需求，无论是小团队还是大企业，都能有效地管理其机器学习工作流程和资源。

综上所述，Profiles 和 KFAM 在 Kubeflow 中的作用是建立一个安全、易于管理的多租户环境，使得不同的用户和团队可以在同一个 Kubeflow 实例中协作，同时保持必要的资源隔离和安全控制。这对于大规模部署和企业级应用尤其重要。

Install the Profile Controller and the Kubeflow Access-Management (KFAM) official Kubeflow components:

~~~powershell
kustomize build apps/profiles/upstream/overlays/kubeflow | kubectl apply -f -
~~~

### 3.2.16 Volumes Web App

在 Kubeflow 生态系统中，Volumes Web App 是一个用户界面组件，它专门用于管理 Kubernetes 卷（Volumes）。卷在 Kubernetes 中是用于存储的对象，它们可以被附加到 Pods 中以使容器可以访问存储资源。在 Kubeflow 中，Volumes Web App 的作用包括：

1. **简化卷的管理**：Volumes Web App 提供了一个简单直观的界面，允许用户轻松创建、查看、编辑和删除 Kubernetes 卷。这使得用户无需直接与 Kubernetes API 交互即可管理卷。
2. **支持数据持久化**：通过管理卷，该应用程序支持在 Kubeflow 中的数据科学项目的数据持久化。这对于机器学习项目特别重要，因为它们通常需要存储和访问大量数据。
3. **集成 Kubeflow Notebook Servers**：Volumes Web App 通常与 Kubeflow Notebook Servers 集成，使得用户可以在创建或管理笔记本服务器时轻松附加存储卷。
4. **支持各种存储解决方案**：该应用程序可以与 Kubernetes 集群中配置的各种存储解决方案一起使用，如云存储服务（AWS S3, Google Cloud Storage等）、本地存储、NFS等。
5. **提高工作流程效率**：通过提供一种简化的方式来处理存储需求，Volumes Web App 有助于提高数据科学家和机器学习工程师在 Kubeflow 中的工作流程效率。
6. **支持多租户环境**：在 Kubeflow 的多租户环境中，该应用程序允许不同的用户在他们自己的命名空间中管理卷，进一步增强了数据隔离和安全性。
7. **易于访问和使用**：作为 Kubeflow 中的一个 Web 应用程序，Volumes Web App 可以从 Kubeflow 的中央仪表板轻松访问，为用户提供了一致且集成的体验。

总体来说，Volumes Web App 在 Kubeflow 中的作用是提供一个用户友好的界面来管理 Kubernetes 卷，从而支持数据持久化和存储需求，这对于运行和管理机器学习工作流程至关重要。

Install the Volumes Web App official Kubeflow component:

~~~powershell
kustomize build apps/volumes-web-app/upstream/overlays/istio | kubectl apply -f -
~~~

### 3.2.17 Tensorboard

在 Kubeflow 生态系统中，TensorBoard 是一个关键组件，用于可视化机器学习训练过程中产生的数据。TensorBoard 原本是 TensorFlow 的一个组件，但在 Kubeflow 中，它被扩展以适应更广泛的机器学习任务和框架。TensorBoard 在 Kubeflow 中的作用包括：

1. **训练过程可视化**：TensorBoard 允许用户可视化训练过程中的各种指标，如损失函数、准确率、其他自定义指标等。这有助于监控模型的训练过程并及时调整训练参数。
2. **模型结构展示**：TensorBoard 可以展示模型的结构，包括不同层的细节和维度，这有助于理解和调试模型。
3. **超参数调优**：结合 Kubeflow 的其他组件，如 Katib，TensorBoard 可以用来可视化和分析不同超参数设置对模型性能的影响。
4. **嵌入向量分析**：TensorBoard 提供了嵌入向量的可视化工具，使用户能够检查和分析高维数据的低维表示。
5. **集成 Kubeflow 环境**：在 Kubeflow 中，TensorBoard 可以与其他组件（如 Kubeflow Pipelines 或 Notebooks）集成，为机器学习工作流程提供无缝的可视化支持。
6. **跨框架兼容性**：尽管最初是为 TensorFlow 设计的，但在 Kubeflow 中，TensorBoard 已经被扩展，可以与其他机器学习框架（如 PyTorch、MXNet）一起使用。
7. **支持多个实验对比**：TensorBoard 允许用户同时加载和对比多个实验，这对于评估不同模型版本和实验设置非常有用。
8. **日志和历史数据分析**：它还能够分析历史日志数据，帮助用户了解模型训练的长期趋势和模式。

总之，在 Kubeflow 中，TensorBoard 作为一个强大的可视化工具，不仅提高了模型训练和调试的效率，也增强了模型分析和评估的能力，这对于任何进行机器学习实验的数据科学家和工程师来说都是非常宝贵的。

Install the Tensorboards Web App official Kubeflow component:

~~~powershell
kustomize build apps/tensorboard/tensorboards-web-app/upstream/overlays/istio | kubectl apply -f -
~~~

Install the Tensorboard Controller official Kubeflow component:

~~~powershell
kustomize build apps/tensorboard/tensorboard-controller/upstream/overlays/kubeflow | kubectl apply -f -
~~~

### 3.2.18 Training Operator

在 Kubeflow 生态系统中，Training Operator 是一个关键组件，用于简化和优化在 Kubernetes 上进行机器学习模型训练的过程。它主要通过定义和管理各种机器学习框架的自定义 Kubernetes 资源来实现这一目标。Training Operator 的作用可以从以下几个方面进行详细解释：

1. **支持多种训练框架**：Training Operator 提供对多个流行的机器学习框架的支持，如 TensorFlow, PyTorch, MXNet 等。这使得用户可以根据自己的需求选择合适的框架来进行模型训练。
2. **简化分布式训练**：对于需要进行大规模分布式训练的场景，Training Operator 能够简化配置和管理的复杂度。它自动处理集群中资源的分配和协调，使得分布式训练更加容易实现。
3. **资源管理和调度**：Training Operator 有效地管理和调度 Kubernetes 集群中的资源，以优化训练任务的执行。这包括管理 GPU 等硬件资源的分配。
4. **自定义资源定义（CRD）**：通过使用 Kubernetes 的自定义资源定义（CRD），Training Operator 允许用户以声明式的方式定义训练任务。这种方式使得训练任务的配置更加灵活和可扩展。
5. **提高训练效率**：Training Operator 通过优化资源使用和简化配置过程，提高了模型训练的效率，尤其是在复杂的分布式训练场景中。
6. **集成 Kubeflow 组件**：Training Operator 可以与 Kubeflow 的其他组件（如 Kubeflow Pipelines、Katib 等）集成，提供完整的机器学习工作流程。
7. **提供统一的操作界面**：无论使用哪种机器学习框架，Training Operator 都提供了一致的操作方式，这降低了用户在不同框架间迁移时的学习成本。

总体而言，Training Operator 在 Kubeflow 中的作用是提供一个统一、灵活且高效的方式来管理和执行各种机器学习训练任务，特别是在分布式和多框架的环境中。通过简化配置和自动化资源管理，它极大地提高了机器学习训练的可访问性和效率。

Install the Training Operator official Kubeflow component:

~~~powershell
kustomize build apps/training-operator/upstream/overlays/kubeflow | kubectl apply -f -
~~~

### 3.2.19 User Namespace

Finally, create a new namespace for the the default user (named kubeflow-user-example-com).

~~~powershell
kustomize build common/user-namespace/base | kubectl apply -f -
~~~

安装后，所有Pod都需要一段时间才能准备就绪。在尝试连接之前，请确保所有Pod都已准备好，否则可能会出现意外错误。要检查所有与Kubeflow相关的Pod是否已就绪，请使用以下命令：

~~~powershell
kubectl get pods -n cert-manager
kubectl get pods -n istio-system
kubectl get pods -n auth
kubectl get pods -n knative-eventing
kubectl get pods -n knative-serving
kubectl get pods -n kubeflow
kubectl get pods -n kubeflow-user-example-com
~~~

###### 修改密码

注：一般在部署之前调整或部署 Dex之前调整
为默认用户user@example.com修改密码，使用bcrypt对密码进行哈希

```scala
python3 -c 'from passlib.hash import bcrypt; import getpass; print(bcrypt.using(rounds=12, ident="2y").hash(getpass.getpass()))'
```

编辑common/dex/base/config-map.yaml，用上面生产的密码哈希值填充相关字段：

```yml
...
  staticPasswords:
  - email: user@example.com
    hash: <enter the generated hash here>
```

# 四、KubeFlow访问

>默认用户名/密码：user@example.com/12341234

## 4.1 负载均衡器metallb部署

### 4.1.1 修改kube-proxy代理模式

~~~powershell
[root@k8s-master01 ~]# kubectl get configmap -n kube-system
NAME                                                   DATA   AGE
......
kube-proxy                                             2      35h
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl edit configmap kube-proxy -n kube-system
   ipvs:
      excludeCIDRs: null
      minSyncPeriod: 0s
      scheduler: ""
      strictARP: true 由原来的flase修改为true
      syncPeriod: 0s
      tcpFinTimeout: 0s
      tcpTimeout: 0s
      udpTimeout: 0s
    kind: KubeProxyConfiguration
    logging:
      flushFrequency: 0
      options:
        json:
          infoBufferSize: "0"
      verbosity: 0
    metricsBindAddress: ""
    mode: "ipvs" 默认为空，添加ipvs
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl rollout restart daemonset kube-proxy -n kube-system
~~~

### 4.1.2 metallb部署 

#### 4.1.2.1 metallb部署

![image-20231013093528604](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231013093528604.png)

![image-20231013093709673](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231013093709673.png)

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.11/config/manifests/metallb-native.yaml
~~~

#### 4.1.2.2 IP地址池准备

~~~powershell
[root@k8s-master01 ~]# vim ippool.yaml
[root@k8s-master01 ~]# cat ippool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: first-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.10.240-192.168.10.250
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f ippool.yaml
~~~

#### 4.1.2.3 开启二层通告

~~~powershell
[root@k8s-master01 ~]# vim l2.yaml
[root@k8s-master01 ~]# cat l2.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: example
  namespace: metallb-system
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f l2.yaml
~~~

## 4.2 服务代理 Ingress nginx部署

### 4.2.1 获取ingress nginx部署文件

![image-20231013094055365](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231013094055365.png)

![image-20231013094123408](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231013094123408.png)

![image-20231013094243973](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231013094243973.png)

![image-20231013094322906](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231013094322906.png)

![image-20231013094402166](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231013094402166.png)

~~~powershell
[root@k8s-master01 ~]# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
~~~

### 4.2.2 修改ingress nginx部署文件

~~~powershell
[root@k8s-master01 ~]# vim deploy.yaml
[root@k8s-master01 ~]# cat deploy.yaml
......
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
    app.kubernetes.io/version: 1.8.2
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  externalTrafficPolicy: Cluster 由Local修改为Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - appProtocol: http
    name: http
    port: 80
    protocol: TCP
    targetPort: http
  - appProtocol: https
    name: https
    port: 443
    protocol: TCP
    targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
  type: LoadBalancer 此处为LoadBalancer
......
~~~

### 4.2.3 部署ingress nginx

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f deploy.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get ns
NAME               STATUS   AGE
......
ingress-nginx      Active   10h
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get svc -n ingress-nginx
NAME                                 TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.111.3.227     192.168.10.241   80:32757/TCP,443:31886/TCP   10h
ingress-nginx-controller-admission   ClusterIP      10.106.142.161   <none>           443/TCP                      10h
~~~

## 4.3创建ingress资源对象

### 4.3.1 创建secret

~~~powershell
[root@k8s-master01 ~]# cd www.kubemsb.com/
[root@k8s-master01 www.kubemsb.com]# ls
www.kubemsb.com.key  www.kubemsb.com.pem
[root@k8s-master01 www.kubemsb.com]# kubectl create secret tls istio-ingressgateway-secret --cert=www.kubemsb.com.pem --key=www.kubemsb.com.key -n istio-system
secret/istio-ingressgateway-secret created
~~~

~~~powershell
[root@k8s-master01 www.kubemsb.com]# kubectl get secret -n istio-system
NAME                          TYPE                DATA   AGE
istio-ca-secret               istio.io/ca-root    5      4h26m
istio-ingressgateway-secret   kubernetes.io/tls   2      17s
oidc-authservice-client       Opaque              2      4h21m
~~~

### 4.3.2 创建ingress

~~~powershell
[root@k8s-master01 www.kubemsb.com]# vim istio-ingressgateway-ingress.yaml
[root@k8s-master01 www.kubemsb.com]# cat istio-ingressgateway-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: istio-ingressgateway-ingress
  namespace: istio-system
  annotations:
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - www.kubemsb.com                                             
    secretName: istio-ingressgateway-secret                       
  rules:
  - host: www.kubemsb.com                                         
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: istio-ingressgateway                   
            port:
              number: 80
~~~

~~~powershell
[root@k8s-master01 www.kubemsb.com]# kubectl apply  -f istio-ingressgateway-ingress.yaml
ingress.networking.k8s.io/istio-ingressgateway-ingress created
~~~

~~~powershell
[root@k8s-master01 www.kubemsb.com]# kubectl get ingress -n istio-system
NAME                           CLASS   HOSTS             ADDRESS   PORTS     AGE
istio-ingressgateway-ingress   nginx   www.kubemsb.com             80, 443   19s
~~~

## 4.4 去除K8S集群节点污点

~~~powershell
[root@k8s-master01 www.kubemsb.com]# kubectl taint nodes --all node-role.kubernetes.io/control-plane-
~~~

## 4.5 kubeflow访问

![image-20231124233719275](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231124233719275.png)

## 4.6 创建NoteBook

![image-20231124234112252](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231124234112252.png)

![image-20231124234224156](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231124234224156.png)

![image-20231124234330888](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231124234330888.png)

![image-20231124234658250](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231124234658250.png)

![image-20231124234727903](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231124234727903.png)

![image-20231124234817547](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231124234817547.png)

![image-20231124235509960](/云原生/extend/extend-04-基于k8s构建机器学习平台kubeflow/image-20231124235509960.png)

