---
title: "如何基于Kubernetes使用分布式块存储Longhorn？"
sidebarGroup: "K8s 存储"
shortTitle: "03 如何基于Kubernetes使用分布式块存储..."
order: 3
date: 2026-08-13
category: "云原生"
tag:
  - "K8s 存储"
  - "云原生"
  - "课程笔记"
description: "如何基于Kubernetes使用分布式块存储Longhorn？ 一、分布式块存储Longhorn介绍 Longhorn是一个轻量级、可靠且易于使用的Kubernetes分布式块存储系统。 Longho..."
---

> **K8s 存储 · 第 3 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何基于Kubernetes使用分布式块存储Longhorn？

# 一、分布式块存储Longhorn介绍

Longhorn是一个轻量级、可靠且易于使用的Kubernetes分布式块存储系统。

Longhorn 是免费的开源软件。它最初由 Rancher Labs 开发，现在作为云原生计算基金会的孵化项目进行开发。

官方文档： https://longhorn.io/docs/1.6.0/

使用 Longhorn，你可以：

- 使用 Longhorn 卷作为 Kubernetes 集群中分布式有状态应用程序的持久存储
- 将块存储分区为 Longhorn 卷，以便您可以在有或没有云提供商的情况下使用 Kubernetes 卷
- 跨多个节点和数据中心复制块存储以提高可用性
- 将备份数据存储在外部存储中，例如 NFS 或 AWS S3
- 创建跨集群灾难恢复卷，以便主 Kubernetes 集群中的数据可以从第二个 Kubernetes 集群中的备份快速恢复
- 计划卷的定期快照，并计划定期备份到 NFS 或 S3 兼容的辅助存储
- 从备份恢复卷
- 在不中断持久卷的情况下升级 Longhorn
- Longhorn 带有独立的 UI，可以使用 Helm、kubectl 或 Rancher 应用程序目录进行安装。

**Longhorn的底层存储协议**

iSCSI（Internet Small Computer Systems Interface）是一种网络协议，用于在 TCP/IP 网络上传输 SCSI 命令，允许两台计算机进行远程存储和检索操作。iSCSI 是一种流行的存储区域网络（SAN）技术，广泛用于连接存储设备，如磁盘阵列和磁带库，与服务器和数据中心。

# 二、分布式块存储Longhorn部署前准备

## 2.1 K8S集群节点存储准备

> 在K8S集群所有节点上分别添加3块硬盘。

~~~powershell
# lsblk
NAME            MAJ:MIN RM   SIZE RO TYPE
sdd               8:48   0     1T  0 disk
sdb               8:16   0     1T  0 disk
sdc               8:32   0     1T  0 disk 
~~~

~~~powershell
# mkdir /longhorn-sdb
# mkdir /longhorn-sdc
# mkdir /longhorn-sdd
~~~

~~~powershell
# mkfs.xfs /dev/sdb
# mkfs.xfs /dev/sdc
# mkfs.xfs /dev/sdd
~~~

~~~powershell
# vim /etc/fstab

# cat /etc/fstab
......
/dev/sdb        /longhorn-sdb                   xfs     defaults        0 0
/dev/sdc        /longhorn-sdc                   xfs     defaults        0 0
/dev/sdd        /longhorn-sdd                   xfs     defaults        0 0
~~~

~~~powershell
# df -Th | grep -E 'sdb|sdc|sdd'
/dev/sdb                                                xfs       1.0T   33M  1.0T    1% /longhorn-sdb
/dev/sdc                                                xfs       1.0T   33M  1.0T    1% /longhorn-sdc
/dev/sdd                                                xfs       1.0T   81M  1.0T    1% /longhorn-sdd
~~~

## 2.2 负载均衡器metallb准备

### 2.2.1 官方网址

![image-20230818160450008](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818160450008.png)

### 2.2.2 修改kube-proxy代理模式及IPVS配置

~~~powershell
[root@k8s-master01 ~]# kubectl get configmap -n kube-system
NAME                                 DATA   AGE
kube-proxy                           2      7h1m
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl edit configmap kube-proxy -n kube-system
......
    ipvs:
      excludeCIDRs: null
      minSyncPeriod: 0s
      scheduler: ""
      strictARP: true 此处由flase修改为true
      syncPeriod: 0s
      tcpFinTimeout: 0s
      tcpTimeout: 0s
      udpTimeout: 0s
    kind: KubeProxyConfiguration
    metricsBindAddress: ""
    mode: ipvs  修改这里
    nodePortAddresses: null
    oomScoreAdj: null
    portRange: ""
    showHiddenMetricsForVersion: ""
    udpIdleTimeout: 0s

~~~

~~~powershell
[root@k8s-master01 ~]# kubectl rollout restart daemonset kube-proxy -n kube-system
~~~

### 2.2.3 部署metallb

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.10/config/manifests/metallb-native.yaml
~~~

### 2.2.4 配置IP地址池及开启二层转发

![image-20230818161330415](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818161330415.png)

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

## 2.3 服务代理ingress准备

![image-20230818161614142](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818161614142.png)

![image-20230818161657539](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818161657539.png)

![image-20230818162003835](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818162003835.png)

![image-20230818162048842](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818162048842.png)

![image-20230818162127483](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818162127483.png)

~~~powershell
[root@k8s-master01 ~]# wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# vim deploy.yaml
......
347   externalTrafficPolicy: Cluster 由Local修改为Cluster
348   ipFamilies:
349   - IPv4
350   ipFamilyPolicy: SingleStack
351   ports:
352   - appProtocol: http
353     name: http
354     port: 80
355     protocol: TCP
356     targetPort: http
357   - appProtocol: https
358     name: https
359     port: 443
360     protocol: TCP
361     targetPort: https
362   selector:
363     app.kubernetes.io/component: controller
364     app.kubernetes.io/instance: ingress-nginx
365     app.kubernetes.io/name: ingress-nginx
366   type: LoadBalancer 注意此处
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f deploy.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get all -n ingress-nginx
NAME                                           READY   STATUS      RESTARTS   AGE
pod/ingress-nginx-admission-create-6trx2       0/1     Completed   0          4h23m
pod/ingress-nginx-admission-patch-xwbsx        0/1     Completed   2          4h23m
pod/ingress-nginx-controller-bdcdb7d6d-758cc   1/1     Running     0          4h23m

NAME                                         TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                      AGE
service/ingress-nginx-controller             LoadBalancer   10.233.32.199   192.168.10.240   80:32061/TCP,443:32737/TCP   4h23m
service/ingress-nginx-controller-admission   ClusterIP      10.233.13.200   <none>           443/TCP                      4h23m

NAME                                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/ingress-nginx-controller   1/1     1            1           4h23m

NAME                                                 DESIRED   CURRENT   READY   AGE
replicaset.apps/ingress-nginx-controller-bdcdb7d6d   1         1         1       4h23m

NAME                                       COMPLETIONS   DURATION   AGE
job.batch/ingress-nginx-admission-create   1/1           43s        4h23m
job.batch/ingress-nginx-admission-patch    1/1           57s        4h23m
~~~

## 2.4 Helm准备

> 在使用kubekey部署K8S集群时，已经部署，如果没有准备，可以使用如下方法实施。

![image-20230818162831353](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818162831353.png)

![image-20230818163506147](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818163506147.png)

![image-20230818163558558](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20230818163558558.png)

~~~powershell
[root@k8s-master01 ~]# wget https://get.helm.sh/helm-v3.12.3-linux-amd64.tar.gz
~~~

~~~powershell
[root@k8s-master01 ~]#  tar xf helm-v3.12.3-linux-amd64.tar.gz
~~~

~~~powershell
[root@k8s-master01 ~]# mv linux-amd64/helm /usr/local/bin/helm
~~~

~~~powershell
[root@k8s-master01 ~]# helm version
~~~

# 三、k8s集群节点配置

~~~powershell
# kubectl taint nodes k8s-master01 node-role.kubernetes.io/control-plane-
node/k8s-master01 untainted
~~~

~~~powershell
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
~~~

~~~powershell
# kubectl edit nodes k8s-master01

~~~

~~~powershell
# kubectl edit nodes k8s-worker01

~~~

~~~powershell
# kubectl edit nodes k8s-worker02

~~~

# 四、分布式块存储Longhorn部署

![image-20240328123736815](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20240328123736815.png)

~~~powershell
# wget https://github.com/longhorn/longhorn/archive/refs/tags/v1.6.0.zip
~~~

~~~powershell
# ls
v1.6.0.zip
~~~

~~~powershell
# unzip v1.6.0.zip
~~~

~~~powershell
# ls
longhorn-1.6.0
~~~

~~~powershell
# cd longhorn-1.6.0/
[root@k8s-master01 longhorn-1.6.0]# ls
CHANGELOG  CODE_OF_CONDUCT.md  deploy  enhancements  LICENSE          MAINTAINERS  scripts
chart      CONTRIBUTING.md     dev     examples      longhorn-ui.png  README.md    uninstall
~~~

~~~powershell
# helm install longhorn ./chart/ --namespace longhorn-system --create-namespace --set defaultSettings.createDefaultDiskLabeledNodes=true --dry-run --debug
~~~

~~~powershell
# helm install longhorn ./chart/ --namespace longhorn-system --create-namespace --set defaultSettings.createDefaultDiskLabeledNodes=true
~~~

~~~powershell
输出：
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
~~~

~~~powershell
# kubectl get pods -n longhorn-system
NAME                                                READY   STATUS    RESTARTS        AGE
csi-attacher-57689cc84b-6j7sp                       1/1     Running   2 (6m38s ago)   9m32s
csi-attacher-57689cc84b-9pvmn                       1/1     Running   2 (6m56s ago)   9m32s
csi-attacher-57689cc84b-pl4v8                       1/1     Running   2 (6m57s ago)   9m32s
csi-provisioner-6c78dcb664-4ltn4                    1/1     Running   2 (6m42s ago)   9m32s
csi-provisioner-6c78dcb664-6t64k                    1/1     Running   0               9m32s
csi-provisioner-6c78dcb664-fhff9                    1/1     Running   0               9m32s
csi-resizer-7466f7b45f-pr6gv                        1/1     Running   1 (6m43s ago)   9m32s
csi-resizer-7466f7b45f-wdk7b                        1/1     Running   1 (6m39s ago)   9m32s
csi-resizer-7466f7b45f-wr2zp                        1/1     Running   2 (6m42s ago)   9m32s
csi-snapshotter-58bf69fbd5-gvczm                    1/1     Running   1 (6m49s ago)   9m32s
csi-snapshotter-58bf69fbd5-xmpkm                    1/1     Running   1 (6m56s ago)   9m32s
csi-snapshotter-58bf69fbd5-zx87z                    1/1     Running   1 (6m44s ago)   9m32s
engine-image-ei-acb7590c-bz7vp                      1/1     Running   0               9m43s
engine-image-ei-acb7590c-phhpw                      1/1     Running   0               9m43s
instance-manager-59f169cc89d17d2f5235b8b5ca2a3662   1/1     Running   0               9m43s
instance-manager-96e1ddb5430faa0fa7e3917a0a974e4c   1/1     Running   0               9m38s
longhorn-csi-plugin-44fpq                           3/3     Running   1 (7m2s ago)    9m32s
longhorn-csi-plugin-8gsbp                           3/3     Running   0               9m32s
longhorn-driver-deployer-5c8b867ccb-9zhns           1/1     Running   0               10m
longhorn-manager-2g86k                              1/1     Running   0               10m
longhorn-manager-sfctk                              1/1     Running   1 (9m43s ago)   10m
longhorn-ui-8447db44b7-frrvb                        1/1     Running   0               10m
longhorn-ui-8447db44b7-nchwl                        1/1     Running   0               10m
~~~

# 五、分布式块存储Longhorn前端UI访问

~~~powershell
# kubectl get svc -n longhorn-system
NAME                          TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
longhorn-admission-webhook    ClusterIP   10.104.38.152    <none>        9502/TCP   11m
longhorn-backend              ClusterIP   10.109.198.177   <none>        9500/TCP   11m
longhorn-conversion-webhook   ClusterIP   10.111.0.27      <none>        9501/TCP   11m
longhorn-engine-manager       ClusterIP   None             <none>        <none>     11m
longhorn-frontend             ClusterIP   10.98.125.152    <none>        80/TCP     11m
longhorn-recovery-backend     ClusterIP   10.100.165.129   <none>        9503/TCP   11m
longhorn-replica-manager      ClusterIP   None             <none>        <none>     11m
~~~

~~~powershell
# vim ingress-longhorn.yaml

# cat ingress-longhorn.yaml
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
~~~

~~~powershell
# kubectl apply -f ingress-longhorn.yaml
~~~

~~~powershell
# kubectl get ingress -n longhorn-system
NAME                CLASS   HOSTS                  ADDRESS   PORTS   AGE
longhorn-frontend   nginx   longhorn.kubemsb.com             80      28s
~~~

~~~powershell
# kubectl describe ingress longhorn-frontend -n longhorn-system
Name:             longhorn-frontend
Labels:           <none>
Namespace:        longhorn-system
Address:          192.168.10.240
Ingress Class:    nginx
Default backend:  <default>
Rules:
  Host                  Path  Backends
  ----                  ----  --------
  longhorn.kubemsb.com
                        /   longhorn-frontend:80 (10.244.69.197:8000,10.244.79.70:8000)
Annotations:            nginx.ingress.kubernetes.io/rewrite-target: /
Events:
  Type    Reason  Age                From                      Message
  ----    ------  ----               ----                      -------
  Normal  Sync    22s (x2 over 74s)  nginx-ingress-controller  Scheduled for sync
~~~

![image-20240328130924616](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20240328130924616.png)

![image-20240328144840200](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20240328144840200.png)

# 六、分布式块存储Longhorn使用测试案例

~~~powershell
# kubectl get sc
NAME                 PROVISIONER          RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
longhorn (default)   driver.longhorn.io   Delete          Immediate           true                   50m
~~~

~~~powershell
# vim kubemsb-longhorn-test.yaml

# cat kubemsb-longhorn-test.yaml
---
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
~~~

~~~powershell
# kubectl apply -f kubemsb-longhorn-test.yaml
persistentvolumeclaim/kubemsb-claim created
~~~

~~~powershell
# kubectl get pvc
NAME            STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
kubemsb-claim   Bound    pvc-925841a1-f0bd-4e90-a96b-e70337dc74c5   1Gi        RWX            longhorn       <unset>                 29s
~~~

~~~powershell
# kubectl get pods
NAME          READY   STATUS    RESTARTS   AGE
kubemsb-pod   1/1     Running   0          73s
~~~

![image-20240328145135297](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20240328145135297.png)

![image-20240328163441442](/云原生/storage/storage-03-如何基于kubernetes使用分布式块存储longhorn/image-20240328163441442.png)

~~~powershell
k8s-worker01
# ls /longhorn-sdb/replicas/pvc-a328f6f7-8bda-4c7a-bd7b-4b19df710649-47bfb726/
revision.counter  volume-head-000.img  volume-head-000.img.meta  volume.meta
~~~

~~~powershell
k8s-worker02
# ls /longhorn-sdc/replicas/pvc-a328f6f7-8bda-4c7a-bd7b-4b19df710649-854f064e/
revision.counter  volume-head-000.img  volume-head-000.img.meta  volume.meta
~~~

~~~powershell
# kubectl exec -it kubemsb-pod -- /bin/sh

/ # df -h
Filesystem                Size      Used Available Use% Mounted on
overlay                  50.0G     11.4G     38.6G  23% /
tmpfs                    64.0M         0     64.0M   0% /dev
tmpfs                     3.9G         0      3.9G   0% /sys/fs/cgroup
10.110.79.55:/pvc-b6d669bb-20a3-4849-89a0-40798c361f17
                        974.0M         0    958.0M   0% /mnt
~~~

~~~powershell
/ # cd /mnt
/mnt # ls
SUCCESS     lost+found
~~~

~~~powershell
/mnt # dd if=/dev/zero of=./test.log bs=1M count=1200
dd: ./test.log: No space left on device
~~~

