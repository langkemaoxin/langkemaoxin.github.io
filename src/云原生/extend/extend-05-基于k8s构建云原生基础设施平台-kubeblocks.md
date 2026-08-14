---
title: 基于K8S构建云原生基础设施平台 KubeBlocks
sidebarGroup: 扩展专题
shortTitle: 05 基于K8S构建云原生基础设施平台 KubeBlo
order: 5
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 数据服务
  - 云原生
  - 课程笔记
description: 基于K8S构建云原生数据基础设施平台 KubeBlocks 一、基于Kubekey快速部署K8S集群 如果需要使用playgroup功能，容器运行时必须要使用Docker。 1.1 主机准备 | 主机...
---

> **数据服务 · 第 1 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 基于K8S构建云原生数据基础设施平台 KubeBlocks

# 一、基于Kubekey快速部署K8S集群

> 如果需要使用playgroup功能，容器运行时必须要使用Docker。

## 1.1 主机准备

| 主机名       | IP地址            | 备注   |
| ------------ | ----------------- | ------ |
| k8s-master01 | 192.168.10.140/24 | master |
| k8s-worker01 | 192.168.10.141/24 | worker |
| k8s-worker02 | 192.168.10.142/24 | worker |

~~~powershell
# vim /etc/hosts
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.140 k8s-master01
192.168.10.141 k8s-worker01
192.168.10.142 k8s-worker02
~~~

## 1.2 软件准备

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

## 1.3 使用Kubekey部署多节点K8S集群

### 1.3.1 Kubekey工具下载

![image-20230707180154343](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20230707180154343.png)

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

### 1.3.2 多节点K8S集群部署

> 参考网址：https://www.kubesphere.io/zh/docs/v3.3/installing-on-linux/introduction/multioverview/
>
> 参考网址：https://github.com/kubesphere/kubekey

#### 1.3.2.1 创建kk部署K8S集群配置文件

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
  - {name: k8s-master01, address: 192.168.10.140, internalAddress: 192.168.10.140, user: root, password: "centos"}
  - {name: k8s-worker01, address: 192.168.10.141, internalAddress: 192.168.10.141, user: root, password: "centos"}
  - {name: k8s-worker02, address: 192.168.10.142, internalAddress: 192.168.10.142, user: root, password: "centos"}
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
    version: v1.23.10
    clusterName: cluster.local
    autoRenewCerts: true
    containerManager: docker
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
>   - &#123;​name: master, address: 192.168.10.140, internalAddress: 192.168.10.140, password: centos&#125;
>
> 使用ssh密钥实现免密登录
>
> hosts:
>
>   - &#123;​name: master, address: 192.168.10.140, internalAddress: 192.168.10.140, privateKeyPath: "~/.ssh/id_rsa"&#125;

#### 1.3.2.2 执行kk创建k8s集群

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

# 二、为K8S集群提供后端持久存储 NFS

## 2.1  准备硬盘

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

## 2.2  安装NFS软件

~~~powershell
安装NFS软件，即是客户端也是服务器端
# yum -y install nfs-utils
~~~

## 2.3  NFS配置

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

## 2.4 验证

~~~powershell
本地验证目录是否共享
# showmount -e
Export list for nfsserver:
/netshare *
~~~

~~~powershell
在k8s master节点验证目录是否共享
# showmount -e 192.168.10.144
Export list for 192.168.10.144:
/netshare *
~~~

~~~powershell
在k8s worker01节点验证目录是否共享
# showmount -e 192.168.10.144
Export list for 192.168.10.144:
/netshare *
~~~

## 2.5  部署存储动态供给

### 2.5.1  获取资源清单文件

~~~powershell
在k8s master节点获取NFS后端存储动态供给配置资源清单文件

# for file in class.yaml deployment.yaml rbac.yaml  ; do wget https://raw.githubusercontent.com/kubernetes-incubator/external-storage/master/nfs-client/deploy/$file ; done
~~~

~~~powershell
查看是否下载
# ls
class.yaml  deployment.yaml  rbac.yaml
~~~

### 2.5.2 应用资源清单文件

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
              value: 192.168.10.143
            - name: NFS_PATH
              value: /netshare
      volumes:
        - name: nfs-client-root
          nfs:
            server: 192.168.10.143
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

### 2.5.3 测试用例验证动态供给是否可用

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

# 三、KubeBlocks使用

## 3.1 KubeBlocks介绍

KubeBlocks 这个名字来源于 Kubernetes 和 LEGO 积木，这表明在 Kubernetes 上构建数据库和分析型工作负载既高效又愉快，就像玩乐高玩具一样。KubeBlocks 将顶级云服务提供商的大规模生产经验与增强的可用性和稳定性改进相结合，帮助用户轻松构建容器化、声明式的关系型、NoSQL、流计算和向量型数据库服务。

官网：https://kubeblocks.io/。

![img](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/823baf566bab4bd2b2d0e9e8075ab661.png)

![image-20231026181440033](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20231026181440033.png)

**为什么需要 KubeBlocks？**
Kubernetes 已经成为容器编排的事实标准。它利用 ReplicaSet 提供的可扩展性和可用性以及部署提供的推出和回滚功能来管理数量不断增加的无状态工作负载。然而，管理有状态工作负载给 Kubernetes 带来了巨大的挑战。尽管 StatefulSet 提供了稳定的持久存储和唯一的网络标识符，但这些功能对于复杂的有状态工作负载来说远远不够。

为了应对这些挑战，并解决复杂性问题，KubeBlocks 引入了新的 workload——RSM（Replicated State Machines），具有以下能力：

- 基于角色的更新顺序可减少因升级版本、缩放和重新启动而导致的停机时间。
- 维护数据复制的状态，并自动修复复制错误或延迟。

**它带来什么收益？**

-  KubeBlocks 具备构建数据库专业能力，实现了数据库服务容器化的技术壁垒，达到“开箱即用”数据库服务能力。
- KubeBlocks 使数据库服务在Kubernetes中具备自动化运维的专业能力，不仅简化了数据库的云化改造，也使数据库应用交付更加快速和可靠。

## 3.2 KubeBlocks CLI工具安装

> 在k8s-master01节点上执行

~~~powershell
# curl -fsSL https://kubeblocks.io/installer/install_cli.sh | bash
~~~

~~~powershell
Your system is linux_amd64
Installing kbcli ...

Getting the latest kbcli ...
Downloading ...
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 29.4M  100 29.4M    0     0  3549k      0  0:00:08  0:00:08 --:--:-- 7579k
kbcli installed successfully.
Kubernetes: v1.23.10
kbcli: 0.6.4
Make sure your docker service is running and begin your journey with kbcli:

        kbcli playground init

For more information on how to get started, please visit:
  https://kubeblocks.io
~~~

## 3.3 playground初始化

~~~powershell
[root@k8s-master01 ~]# kbcli playground init
~~~

~~~powershell
Create k3d cluster: kb-playground                  OK
Merge kubeconfig to /root/.kube/config             OK
Switch current context to k3d-kb-playground        OK
Write kubeconfig to /root/.kbcli/playground/kubeconfig OK
KubeBlocks will be installed to namespace "kb-system"
Kubernetes version 1.23.8+k3s1
kbcli version 0.6.4
Add and update repo kubeblocks                     OK
Install KubeBlocks 0.6.4                           OK
Wait for addons to be enabled
  alertmanager-webhook-adaptor                     OK
  apecloud-mysql                                   OK
  apecloud-otel-collector                          OK
  csi-hostpath-driver                              OK
  grafana                                          OK
  kafka                                            OK
  mongodb                                          OK
  postgresql                                       OK
  prometheus                                       OK
  pulsar                                           OK
  redis                                            OK
  snapshot-controller                              OK
Create cluster mycluster (ClusterDefinition: apecloud-mysql) OK

KubeBlocks playground init SUCCESSFULLY!

Kubernetes cluster "kb-playground" has been created.
Cluster "mycluster" has been created.
Elapsed time: 5m46s

1. Basic commands for cluster:

  kbcli cluster list                     # list database cluster and check its status
  kbcli cluster describe mycluster       # get cluster information

2. Connect to database

  kbcli cluster connect mycluster

3. View the Grafana:

  kbcli dashboard open kubeblocks-grafana

4. Destroy Playground:

  kbcli playground destroy

--------------------------------------------------------------------
To get more help: kbcli help
Use "kbcli [command] --help" for more information about a command.
~~~

~~~powershell
[root@k8s-master01 ~]# kbcli dashboard open kubeblocks-grafana
Forwarding from 127.0.0.1:13000 -> 3000
Forward successfully! Opening browser ...
~~~

![image-20231027214327173](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20231027214327173.png)

![image-20231027214352678](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20231027214352678.png)

~~~powershell
删除playground演示环境
# kbcli playground destroy
~~~

## 3.4 通过kbcli安装KubeBlocks

> 通过kbcli在kubernetes中安装KubeBlocks

~~~powershell
# kbcli kubeblocks install
~~~

~~~powershell
# kbcli kubeblocks status
KubeBlocks is deployed in namespace: kb-system,version: 0.6.4

KubeBlocks Workloads:
NAMESPACE   KIND         NAME                           READY PODS   CPU(CORES)   MEMORY(BYTES)   CREATED-AT
kb-system   Deployment   kb-addon-snapshot-controller   1/1          N/A          N/A             Oct 26,2023 14:42 UTC+0800
kb-system   Deployment   kubeblocks                     1/1          N/A          N/A             Oct 26,2023 14:41 UTC+0800
kb-system   Deployment   kubeblocks-dataprotection      1/1          N/A          N/A             Oct 26,2023 14:41 UTC+0800

KubeBlocks Addons:
NAME                           STATUS     TYPE   PROVIDER
alertmanager-webhook-adaptor   Disabled   Helm   apecloud
apecloud-mysql                 Enabled    Helm   apecloud
apecloud-otel-collector        Disabled   Helm   apecloud
aws-load-balancer-controller   Disabled   Helm   N/A
csi-hostpath-driver            Disabled   Helm   community
csi-s3                         Disabled   Helm   community
external-dns                   Disabled   Helm   N/A
fault-chaos-mesh               Disabled   Helm   community
grafana                        Disabled   Helm   community
kafka                          Enabled    Helm   community
kubebench                      Disabled   Helm   community
kubeblocks-csi-driver          Disabled   Helm   N/A
loki                           Disabled   Helm   community
migration                      Disabled   Helm   community
milvus                         Disabled   Helm   community
mongodb                        Enabled    Helm   community
nebula                         Disabled   Helm   community
nyancat                        Disabled   Helm   apecloud
opensearch                     Disabled   Helm   community
postgresql                     Enabled    Helm   community
prometheus                     Disabled   Helm   community
pulsar                         Enabled    Helm   community
pyroscope-server               Disabled   Helm   community
qdrant                         Disabled   Helm   community
redis                          Enabled    Helm   community
snapshot-controller            Enabled    Helm   community
tdengine                       Disabled   Helm   community
victoria-metrics-agent         Disabled   Helm   community
weaviate                       Disabled   Helm   community
~~~

~~~powershell
# kbcli kubeblocks uninstall
~~~

## 3.5 通过KubeBlocks部署数据平台

### 3.5.1 MySQL

#### 3.5.1.1 查看addon是否开启

>查看可用于创建集群的所有数据库类型和版本。

~~~powershell
# kbcli clusterdefinition list
NAME               MAIN-COMPONENT-NAME   STATUS      AGE
apecloud-mysql     mysql                 Available   3h49m
kafka              kafka-server          Available   3h49m
mongodb            mongodb               Available   3h49m
mongodb-sharding   mongos                Available   3h49m
postgresql         postgresql            Available   3h49m
pulsar             pulsar-broker         Available   3h49m
redis              redis                 Available   3h49m
~~~

>确保 ApeCloud MySQL 插件已启用

~~~powershell
# kbcli addon list
NAME                           TYPE   PROVIDER    STATUS     AUTO-INSTALL   AUTO-INSTALLABLE-SELECTOR                                                EXTRAS
.......                                                                                     
apecloud-mysql                 Helm   apecloud    Enabled    true                                                                                        
kafka                          Helm   community   Enabled    true                                                                                        
mongodb                        Helm   community   Enabled    true                                                                                        
postgresql                     Helm   community   Enabled    true                                                                                        
pulsar                         Helm   community   Enabled    true                                                                                        
redis                          Helm   community   Enabled    true                                                                                        
snapshot-controller            Helm   community   Enabled    true           {key=KubeGitVersion,op=DoesNotContain,values=[tke aliyun]}
~~~

#### 3.5.1.2  MySQL安装

KubeBlocks 支持创建两种类型的 MySQL 集群：Standalone 和 RaftGroup Cluster。Standalone仅支持一份副本，可用于对可用性要求较低的场景。对于可用性要求较高的场景，建议创建RaftGroup集群，即创建一个三副本集群。并且为了保证高可用性，所有副本默认分布在不同的节点上。

>创建一个独立的,本次部署名称为:mysql-cluster1,如果需要被监控需要使用--monitoring-interval=15

~~~powershell
# kbcli cluster create mysql <clustername>  
~~~

> 创建 RaftGroup 集群

~~~powershell
# kbcli cluster create mysql --mode raftGroup <clustername>
~~~

#### 3.5.1.3  MySQL安装后查看

~~~powershell
# kbcli cluster list
NAME              NAMESPACE   CLUSTER-DEFINITION   VERSION           TERMINATION-POLICY   STATUS    CREATED-TIME
mysql-cluster1    default     apecloud-mysql       ac-mysql-8.0.30   Delete               Running   Oct 26,2023 15:05 UTC+0800
~~~

~~~powershell
# kubectl get pods
NAME                                    READY   STATUS    RESTARTS   AGE
mysql-cluster1-mysql-0                  5/5     Running   0          3h34m
~~~

~~~powershell
# kubectl get svc
NAME                               TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                                                                        AGE
kubernetes                         ClusterIP   10.96.0.1       <none>        443/TCP                                                                        6d21h

mysql-cluster1-mysql               ClusterIP   10.110.111.68   <none>        3306/TCP                                                                       3h35m
mysql-cluster1-mysql-headless      ClusterIP   None            <none>        3306/TCP,13306/TCP,9104/TCP,15100/TCP,16100/TCP,40000/TCP,3501/TCP,50001/TCP   3h35m
~~~

#### 3.5.1.4  连接MySQL

**使用kbcli**

~~~powershell
# kbcli cluster connect mysql-cluster1  --namespace default
example:
# kbcli cluster connect <clustername>  --namespace <name>
~~~

~~~powershell
输出：
Connect to instance mysql-cluster1-mysql-0
Defaulted container "mysql" out of: mysql, metrics, vttablet, kb-checkrole, config-manager
mysql: [Warning] Using a password on the command line interface can be insecure.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 3514
Server version: 8.0.30 WeSQL Server - GPL, Release 5, Revision 5b589f1

Copyright (c) 2000, 2022, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql>
~~~

**使用kubectl**

~~~powershell
# kubectl get secrets -n default  mysql-cluster1-conn-credential -o jsonpath='{.data.\username}' | base64 -d
~~~

~~~powershell
# kubectl get secrets -n default  mysql-cluster1-conn-credential -o jsonpath='{.data.\password}' | base64 -d
~~~

~~~powershell
# kubectl get pods
NAME                                    READY   STATUS    RESTARTS   AGE
mysql-cluster1-mysql-0                  5/5     Running   0          13m
~~~

~~~powershell
# kubectl exec -it -n default mysql-cluster1-mysql-0 -- /bin/bash
Defaulted container "mysql" out of: mysql, metrics, vttablet, kb-checkrole, config-manager
[root@mysql-cluster1-mysql-0 /]# mysql -uroot -p4w2d7vlj
mysql: [Warning] Using a password on the command line interface can be insecure.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 221
Server version: 8.0.30 WeSQL Server - GPL, Release 5, Revision 5b589f1

Copyright (c) 2000, 2022, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> exit
~~~

![image-20231027233708059](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20231027233708059.png)

### 3.5.2 Redis

~~~powershell
# kbcli addon list
~~~

~~~powershell
# kbcli cluster create redis <clustername> --monitoring-interval=0
or
# kbcli cluster create redis --mode replication <clustername> --monitoring-interval=0
~~~

~~~powershell
# kbcli cluster connect <clustername>  --namespace <name>
~~~

![image-20231027214802357](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20231027214802357.png)

## 3.6 通过KubeBlocks部署数据监控平台

> kubeblocks安装后，检查addons开启情况。

~~~powershell
# kbcli kubeblocks install
~~~

~~~powershell
输出内容如下：
KubeBlocks will be installed to namespace "kb-system"
Kubernetes version 1.23.10
kbcli version 0.6.4
Collecting data from cluster                       OK
Kubernetes cluster preflight                       OK

Add and update repo kubeblocks                     OK
Install KubeBlocks 0.6.4                           OK
Wait for addons to be enabled
  apecloud-mysql                                   OK
  kafka                                            OK
  mongodb                                          OK
  postgresql                                       OK
  pulsar                                           OK
  redis                                            OK
  snapshot-controller                              OK

KubeBlocks 0.6.4 installed to namespace kb-system SUCCESSFULLY!

-> Basic commands for cluster:
    kbcli cluster create -h     # help information about creating a database cluster
    kbcli cluster list          # list all database clusters
    kbcli cluster describe <cluster name>  # get cluster information

-> Uninstall KubeBlocks:
    kbcli kubeblocks uninstall
~~~

~~~powershell
列出所有的addon
# kbcli addon list

NAME                           TYPE   PROVIDER    STATUS     AUTO-INSTALL   AUTO-INSTALLABLE-SELECTOR                                                EXTRAS
alertmanager-webhook-adaptor   Helm   apecloud    Disabled   false                                                                                       
apecloud-otel-collector        Helm   apecloud    Disabled   false                                                                                       
aws-load-balancer-controller   Helm               Disabled   false          {key=KubeGitVersion,op=Contains,values=[eks]}                                
csi-hostpath-driver            Helm   community   Disabled   false          {key=KubeGitVersion,op=DoesNotContain,values=[eks aliyun gke tke aks]}       
csi-s3                         Helm   community   Disabled   false                                                                                   daemonset
external-dns                   Helm               Disabled   false                                                                                       
fault-chaos-mesh               Helm   community   Disabled   false                                                                                   chaosDaemon,dashboard,dnsServer
grafana                        Helm   community   Disabled   false                                                                                       
kubebench                      Helm   community   Disabled   false                                                                                       
kubeblocks-csi-driver          Helm               Disabled   false          {key=KubeGitVersion,op=Contains,values=[eks]}                            node
loki                           Helm   community   Disabled   false                                                                                       
migration                      Helm   community   Disabled   false                                                                                       
milvus                         Helm   community   Disabled   false                                                                                       
nebula                         Helm   community   Disabled   false                                                                                       
nyancat                        Helm   apecloud    Disabled   false                                                                                       
opensearch                     Helm   community   Disabled   false                                                                                       
prometheus                     Helm   community   Disabled   false                                                                                   alertmanager
pyroscope-server               Helm   community   Disabled   false                                                                                       
qdrant                         Helm   community   Disabled   false                                                                                       
tdengine                       Helm   community   Disabled   false                                                                                       
victoria-metrics-agent         Helm   community   Disabled   false                                                                                       
weaviate                       Helm   community   Disabled   false                                                                                       
apecloud-mysql                 Helm   apecloud    Enabled    true                                                                                        
kafka                          Helm   community   Enabled    true                                                                                        
mongodb                        Helm   community   Enabled    true                                                                                        
postgresql                     Helm   community   Enabled    true                                                                                        
pulsar                         Helm   community   Enabled    true                                                                                        
redis                          Helm   community   Enabled    true                                                                                        
snapshot-controller            Helm   community   Enabled    true           {key=KubeGitVersion,op=DoesNotContain,values=[tke aliyun]}
~~~

~~~powershell
开启用于监控相关的addon
[root@k8s-master01 ~]# kbcli addon enable grafana
addon.extensions.kubeblocks.io/grafana enabled

[root@k8s-master01 ~]# kbcli addon enable prometheus
addon.extensions.kubeblocks.io/prometheus enabled

[root@k8s-master01 ~]# kbcli addon enable alertmanager-webhook-adaptor
addon.extensions.kubeblocks.io/alertmanager-webhook-adaptor enabled

[root@k8s-master01 ~]# kbcli addon enable apecloud-otel-collector
addon.extensions.kubeblocks.io/apecloud-otel-collector enabled
~~~

~~~powershell
查看所有开启的addon状态
# kbcli kubeblocks status
KubeBlocks is deployed in namespace: kb-system,version: 0.6.4

KubeBlocks Workloads:
NAMESPACE   KIND          NAME                                    READY PODS   CPU(CORES)   MEMORY(BYTES)   CREATED-AT
kb-system   Deployment    kb-addon-alertmanager-webhook-adaptor   1/1          N/A          N/A             Oct 30,2023 15:51 UTC+0800
kb-system   Deployment    kb-addon-grafana                        1/1          N/A          N/A             Oct 30,2023 15:50 UTC+0800
kb-system   Deployment    kb-addon-snapshot-controller            1/1          N/A          N/A             Oct 30,2023 15:41 UTC+0800
kb-system   Deployment    kubeblocks                              1/1          N/A          N/A             Oct 30,2023 15:40 UTC+0800
kb-system   Deployment    kubeblocks-dataprotection               1/1          N/A          N/A             Oct 30,2023 15:40 UTC+0800
kb-system   StatefulSet   kb-addon-prometheus-alertmanager        1/1          N/A          N/A             Oct 30,2023 15:50 UTC+0800
kb-system   StatefulSet   kb-addon-prometheus-server              1/1          N/A          N/A             Oct 30,2023 15:50 UTC+0800
kb-system   DaemonSet     kb-addon-apecloud-otel-collector        2/2          N/A          N/A             Oct 30,2023 15:51 UTC+0800

KubeBlocks Addons:
NAME                           STATUS     TYPE   PROVIDER
alertmanager-webhook-adaptor   Enabled    Helm   apecloud
apecloud-mysql                 Enabled    Helm   apecloud
apecloud-otel-collector        Enabled    Helm   apecloud
aws-load-balancer-controller   Disabled   Helm   N/A
csi-hostpath-driver            Disabled   Helm   community
csi-s3                         Disabled   Helm   community
external-dns                   Disabled   Helm   N/A
fault-chaos-mesh               Disabled   Helm   community
grafana                        Enabled    Helm   community
kafka                          Enabled    Helm   community
kubebench                      Disabled   Helm   community
kubeblocks-csi-driver          Disabled   Helm   N/A
loki                           Disabled   Helm   community
migration                      Disabled   Helm   community
milvus                         Disabled   Helm   community
mongodb                        Enabled    Helm   community
nebula                         Disabled   Helm   community
nyancat                        Disabled   Helm   apecloud
opensearch                     Disabled   Helm   community
postgresql                     Enabled    Helm   community
prometheus                     Enabled    Helm   community
pulsar                         Enabled    Helm   community
pyroscope-server               Disabled   Helm   community
qdrant                         Disabled   Helm   community
redis                          Enabled    Helm   community
snapshot-controller            Enabled    Helm   community
tdengine                       Disabled   Helm   community
victoria-metrics-agent         Disabled   Helm   community
weaviate                       Disabled   Helm   community
~~~

~~~powershell
创建mysql集群
# kbcli cluster create mysql mycluster --monitoring-interval=15
~~~

~~~powershell
查看mysql集群
# kbcli cluster list
NAME        NAMESPACE   CLUSTER-DEFINITION   VERSION           TERMINATION-POLICY   STATUS     CREATED-TIME
mycluster   default     apecloud-mysql       ac-mysql-8.0.30   Delete               Creating   Oct 30,2023 16:24 UTC+0800
~~~

~~~powershell
开启grafana dashboard
# kbcli dashboard open kubeblocks-grafana
~~~

![image-20231030163059996](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20231030163059996.png)

~~~powershell
开启prometheus dashboard
# kbcli dashboard open kubeblocks-prometheus-server
~~~

![image-20231030184053156](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20231030184053156.png)

~~~powershell
设置告警通知方式
# kbcli alert config-smtpserver \
--smtp-from nextgo@126.com \
--smtp-smarthost smtp.126.com:25 \
--smtp-auth-username nextgo@126.com \
--smtp-auth-password RXGFEHFQCLXAMFTP \
--smtp-auth-identity nextgo@126.com
~~~

~~~powershell
检查告警通知
# kbcli alert list-smtpserver
IDENTITY         PASSWORD           USERNAME         FROM             SMARTHOST
nextgo@126.com   RXGFEHFQCLXAMFTP   nextgo@126.com   nextgo@126.com   smtp.126.com:25
~~~

~~~powershell
添加电子邮件接收器
# kbcli alert add-receiver --email='nextgo@126.com'
Receiver receiver-8l7lw added successfully.
~~~

~~~powershell
查看电子邮件接收器
# kbcli alert list-receivers
NAME               WEBHOOK   EMAIL            SLACK   CLUSTER   SEVERITY
default-receiver
receiver-8l7lw               nextgo@126.com
~~~

> KubeBlocks 电子邮件警报现在支持接收来自指定集群且具有一定严重性的电子邮件。您可以使用`--cluster`和`--severity`标志来设置此功能。

>`--cluster`: 表示只接收指定集群的邮件。

~~~powershell
# kbcli alert add-receiver --email='nextgo@126.com,flashgo@126.com' --cluster=mycluster
~~~

>`--severity`：表示仅接收来自指定集群的邮件，警报级别为`warning`。

~~~powershell
# kbcli alert add-receiver --email='nextgo@126.com,flashgo@126.com' --cluster=mycluster --severity=warning
~~~

~~~powershell
开启Alertmanager dashboard
# kbcli dashboard open kubeblocks-prometheus-alertmanager
~~~

![image-20231030183918069](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20231030183918069.png)

~~~powershell
查看集群
# kbcli cluster list
NAME        NAMESPACE   CLUSTER-DEFINITION   VERSION           TERMINATION-POLICY   STATUS    CREATED-TIME
mycluster   default     apecloud-mysql       ac-mysql-8.0.30   Delete               Running   Oct 30,2023 16:24 UTC+0800
~~~

~~~powershell
查看集群运行的pod
# kubectl get pods
NAME                                     READY   STATUS    RESTARTS        AGE
mycluster-mysql-0                        5/5     Running   0               136m
~~~

~~~powershell
删除集群运行的pod
# kubectl delete pods mycluster-mysql-0
pod "mycluster-mysql-0" deleted
~~~

> 登录邮箱查看告警通知

![image-20231030184542526](/云原生/extend/extend-05-基于k8s构建云原生基础设施平台-kubeblocks/image-20231030184542526.png)

