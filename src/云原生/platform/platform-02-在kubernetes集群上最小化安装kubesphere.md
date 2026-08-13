---
title: 在kubernetes集群上最小化安装kubesphere
sidebarGroup: 平台与实战
shortTitle: 02 在kubernetes集群上最小化安装kubes
order: 2
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - PaaS 平台
  - 云原生
  - 课程笔记
description: 在kubernetes集群上最小化安装kubesphere 除了在 Linux 机器上安装 KubeSphere 之外，您还可以将其直接部署在现有的 Kubernetes 集群上。 一、准备工作 1....
---

> **PaaS 平台 · 第 2 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 在kubernetes集群上最小化安装kubesphere

除了在 Linux 机器上安装 KubeSphere 之外，您还可以将其直接部署在现有的 Kubernetes 集群上。

# 一、准备工作

## 1.1 kubernetes集群节点硬件要求

- 确保您的机器满足最低硬件要求：CPU 大于或等于4 核，内存 大于或等于8 GB。

## 1.2  部署kubernetes集群

>- 如需在 Kubernetes 上安装 KubeSphere 3.2.1，您的 Kubernetes 版本必须为：1.19.x、1.20.x、1.21.x 或 1.22.x（实验性支持）。

可参考使用kubeadm部署kubernetes集群方法。

> 本案例采用4个节点，其中3个节点用于部署kubernetes集群，1个节点用于提供存储动态供给。

## 1.3 后端存储动态供给准备

> 在安装之前，需要配置kubernetes个课程上的默认存储类型。

### 1.3.1  准备硬盘

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

### 1.3.2  安装NFS软件

~~~powershell
安装NFS软件，即是客户端也是服务器端
# yum -y install nfs-utils
~~~

### 1.3.3  NFS配置

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

### 1.3.4 验证

~~~powershell
本地验证目录是否共享
# showmount -e
Export list for nfsserver:
/netshare *
~~~

~~~powershell
在k8s master节点验证目录是否共享
# showmount -e nfsserver.kubemsb.com
Export list for nfsserver.kubemsb.com:
/netshare *
~~~

~~~powershell
在k8s worker01节点验证目录是否共享
# showmount -e nfsserver.kubemsb.com
Export list for nfsserver.kubemsb.com:
/netshare *
~~~

~~~powershell
在k8s worker02节点验证目录是否共享
# showmount -e nfsserver.kubemsb.com
Export list for nfsserver.kubemsb.com:
/netshare *
~~~

### 1.3.5  部署存储动态供给

#### 1.3.5.1  获取资源清单文件

~~~powershell
在k8s master节点获取NFS后端存储动态供给配置资源清单文件

# for file in class.yaml deployment.yaml rbac.yaml  ; do wget https://raw.githubusercontent.com/kubernetes-incubator/external-storage/master/nfs-client/deploy/$file ; done
~~~

~~~powershell
查看是否下载
# ls
class.yaml  deployment.yaml  rbac.yaml
~~~

#### 1.3.5.2 应用资源清单文件

~~~powershell
应用rbac资源清单文件
# kubectl apply -f rbac.yaml
~~~

~~~powershell
应用class（存储类）资源清单文件
# kubectl apply -f class.yaml
storageclass.storage.k8s.io/managed-nfs-storage created
~~~

~~~powershell
应用deployment资源清单文件之前修改其配置，主要配置NFS服务器及其共享的目录
# vim deployment.yaml

注意修改处内容

env:
            - name: PROVISIONER_NAME
              value: fuseim.pri/ifs
            - name: NFS_SERVER
              value: nfsserver.kubemsb.com 远程NFS服务器地址
            - name: NFS_PATH
              value: /netshare 共享出来的目录
      volumes:
        - name: nfs-client-root
          nfs:
            server: nfsserver.kubemsb.com 远程NFS服务器地址
            path: /netshare 共享出来的目录

~~~

~~~powershell
应用资源清单文件
# kubectl apply -f deployment.yaml
~~~

~~~powershell
查看pod运行情况

# kubectl get pods
出现以下表示成功运行
NAME                                                     READY   STATUS    RESTARTS   AGE

nfs-client-provisioner-f66d6fbdb-mcrpk                   1/1     Running   0          73s
~~~

> 以下为特别注意事项。

~~~powershell
k8s 1.21版本存在问题：无法创建PV，修改api文件，此文件被自动监视，修改后会自动关闭原有Pod，拉起拉的Pod
# cat /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubeadm.kubernetes.io/kube-apiserver.advertise-address.endpoint: 192.168.10.10:6443
  creationTimestamp: null
  labels:
    component: kube-apiserver
    tier: control-plane
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --feature-gates=RemoveSelfLink=false 添加此行内容
    - --advertise-address=192.168.10.10
    - --allow-privileged=true
    - --authorization-mode=Node,RBAC
~~~

>使用新的不基于 SelfLink 功能的 provisioner 镜像，重新创建 provisioner 容器。镜像：registry.cn-beijing.aliyuncs.com/pylixm/nfs-subdir-external-provisioner:v4.0.0

~~~powershell
设置默认存储类
# kubectl patch storageclass managed-nfs-storage -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
~~~

#### 1.3.5.3 测试用例验证动态供给是否可用

> 使用测试用例测试NFS后端存储是否可用

~~~powershell
测试用例：
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
      imagePullSecrets:
      - name: huoban-harbor
      terminationGracePeriodSeconds: 10
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
      storageClassName: "managed-nfs-storage"
      resources:
        requests:
          storage: 1Gi
~~~

# 二、部署Kubesphere

## 2.1 最小化安装

~~~powershell
kubectl apply -f https://github.com/kubesphere/ks-installer/releases/download/v3.2.1/kubesphere-installer.yaml
   
kubectl apply -f https://github.com/kubesphere/ks-installer/releases/download/v3.2.1/cluster-configuration.yaml
~~~

> 如需求开启更多功能，可在cluster-configuration.yaml文件中配置。

## 2.2 检查安装日志

~~~powershell
kubectl logs -n kubesphere-system $(kubectl get pod -n kubesphere-system -l app=ks-install -o jsonpath='{.items[0].metadata.name}') -f
~~~

## 2.3 检查kubesphere安装是否正常

使用 `kubectl get pod --all-namespaces` 查看所有 Pod 是否在 KubeSphere 的相关命名空间中正常运行。如果是，请通过以下命令检查控制台的端口（默认为 `30880`）：

~~~powershell
kubectl get svc/ks-console -n kubesphere-system
~~~

- 通过 NodePort `(IP:30880)` 使用默认帐户和密码 `(admin/P@88w0rd)` 访问 Web 控制台。

## 2.4 访问kubesphere

![image-20220517132857802](/云原生/platform/platform-02-在kubernetes集群上最小化安装kubesphere/image-20220517132857802.png)

![image-20220517132926979](/云原生/platform/platform-02-在kubernetes集群上最小化安装kubesphere/image-20220517132926979.png)

![image-20220517133015625](/云原生/platform/platform-02-在kubernetes集群上最小化安装kubesphere/image-20220517133015625.png)

![image-20220517133041644](/云原生/platform/platform-02-在kubernetes集群上最小化安装kubesphere/image-20220517133041644.png)

![image-20220517133221266](/云原生/platform/platform-02-在kubernetes集群上最小化安装kubesphere/image-20220517133221266.png)

