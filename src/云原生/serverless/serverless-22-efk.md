---
title: EFK
sidebarGroup: Serverless
shortTitle: 22 EFK
order: 22
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: 'Knative 日志收集方案 EFK 一、后端存储动态供给 1.1 准备硬盘 ~~~powershell 查看准备的磁盘 [root@nfsserver ~] lsblk NAME MAJ:MIN R...'
---

> **Serverless · 第 22 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Knative 日志收集方案 EFK

# 一、后端存储动态供给

## 1.1 准备硬盘

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

## 1.2 安装NFS软件

~~~powershell
安装NFS软件，即是客户端也是服务器端
# yum -y install nfs-utils
~~~

## 1.3 NFS配置

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

## 1.4 验证

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

## 1.5 部署存储动态供给

### 1.5.1 获取资源清单文件

~~~powershell
在k8s master节点获取NFS后端存储动态供给配置资源清单文件

# for file in class.yaml deployment.yaml rbac.yaml  ; do wget https://raw.githubusercontent.com/kubernetes-incubator/external-storage/master/nfs-client/deploy/$file ; done
~~~

~~~powershell
查看是否下载
# ls
class.yaml  deployment.yaml  rbac.yaml
~~~

### 1.5.2 应用资源清单文件

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

### 1.5.3 测试用例验证动态供给是否可用

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

# 二、部署EFK

## 2.1 获取EFK部署资源清单文件

~~~powershell
把EFK部署资源清单文件复制到本地主机，本次本地主机主要指k8s master节点
# git clone https://github.com/kubernetes/kubernetes.git
~~~

~~~powershell
进入目录并查看目录内容
# cd kubernetes/
# ls
api           cluster             docs    LICENSE   Makefile.generated_files  plugin             SUPPORT.md
build         cmd                 go.mod  LICENSES  OWNERS                    README.md          test
CHANGELOG     code-of-conduct.md  go.sum  logo      OWNERS_ALIASES            SECURITY_CONTACTS  third_party
CHANGELOG.md  CONTRIBUTING.md     hack    Makefile  pkg                       staging            vendor
~~~

~~~powershell
进入目录并查看目录内容
# cd cluster/addons/fluentd-elasticsearch
# ls
create-logging-namespace.yaml  es-statefulset.yaml        fluentd-es-image        OWNERS
es-image                       fluentd-es-configmap.yaml  kibana-deployment.yaml  podsecuritypolicies
es-service.yaml                fluentd-es-ds.yaml         kibana-service.yaml     README.md

~~~

## 2.2 安装ES

### 2.2.1 创建命名空间

~~~powershell
应用资源清单文件创建命名空间
# kubectl apply -f create-logging-namespace.yaml
~~~

### 2.2.2 部署ES

~~~powershell
部署ES，注意部署前的配置
# kubectl apply -f es-statefulset.yaml
~~~

~~~powershell
应用前，请注释此文件中ClusterIP:None，并修改type类型为:NodePort，再执行
# kubectl apply -f es-service.yaml
~~~

### 2.2.3 查看安装情况

~~~powershell
查看ES部署的pod是否运行
# kubectl get pods -n logging
NAME                      READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0   1/1     Running   0          8m
elasticsearch-logging-1   1/1     Running   1          5m50s
~~~

~~~powershell
查看ES部署后的SVC，验证其访问的方法
# kubectl get svc -n logging
NAME                    TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)                         AGE
elasticsearch-logging   NodePort   10.107.97.124   <none>        9200:31885/TCP,9300:32214/TCP   68s
~~~

### 2.2.4 验证集群是否健康

~~~powershell
查看ES集群是否健康，下面状态为健康。
# curl 10.107.97.124:9200/_cat/health?pretty
1640939218 08:26:58 kubernetes-logging green 2 2 6 3 0 0 0 0 - 100.0%
~~~

## 2.3 部署fluentd

### 2.3.1 部署fluentd

~~~powershell
部署前对fluentd configmap进行配置，主要修改其连接ES的地址及对应的端口，此两项根据使用环境的不同，配置也不相同。
# vim fluentd-es-configmap.yaml

456   output.conf: |-
457     <match **>
458       @id elasticsearch
459       @type elasticsearch
460       @log_level info
461       type_name _doc
462       include_tag_key true
463       host elasticsearch-logging 修改此处为es主机地址
464       port 9200 使用NodePort时，此处也需要修改对应映射端口
465       logstash_format true
466       <buffer>

~~~

~~~powershell
应用资源清单文件
# kubectl apply -f fluentd-es-configmap.yaml
~~~

~~~powershell
修改资源清单文件
# vim fluentd-es-ds.yaml
 
 55   selector:
 56     matchLabels:
 57       k8s-app: fluentd-es
 58       version: v3.1.1
 59   template:
 60     metadata:
 61       labels:
 62         k8s-app: fluentd-es
 63         version: v3.1.1
 64     spec:
 65       #securityContext:
 66       #  seccompProfile:
 67       #    type: RuntimeDefault

~~~

~~~powershell
应用资源清单文件
# kubectl apply -f fluentd-es-ds.yaml
~~~

### 2.3.2 查看部署状态

~~~powershell
查看已部署的组件pod运行情况
# kubectl get pods -n logging
~~~

~~~powershell
输出结果：
NAME                      READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0   1/1     Running   0          20m
elasticsearch-logging-1   1/1     Running   1          18m
fluentd-es-v3.1.1-2chjb   1/1     Running   0          64s
fluentd-es-v3.1.1-5gpmd   1/1     Running   0          64s
~~~

## 2.4 部署Kibana

### 2.4.1 部署Kibana

~~~powershell
修改资源清单文件
# vim kibana-deployment.yaml

 18     spec:
 		以下三行注释掉
 19      # securityContext: 
 20      #   seccompProfile:
 21      #     type: RuntimeDefault
 22       containers:
 23         - name: kibana-logging
 24           image: docker.elastic.co/kibana/kibana-oss:7.10.2
 25           resources:
 26             # need more cpu upon initialization, therefore burstable class
 27             limits:
 28               cpu: 1000m
 29             requests:
 30               cpu: 100m
 31           env:
 32             - name: ELASTICSEARCH_HOSTS
 33               value: http://elasticsearch-logging:9200
 34             - name: SERVER_NAME
 35               value: kibana-logging
 				以下两行注释掉
 36             #- name: SERVER_BASEPATH
 37             #  value: /api/v1/namespaces/logging/services/kibana-logging/proxy

~~~

~~~powershell
应用资源清单文件
# kubectl apply -f kibana-deployment.yaml
~~~

~~~powershell
修改kibana service资源清单文件，以NodePort类型暴露服务，供K8S集群外用户访问
# vim kibana-service.yaml

spec:
  ports:
  - port: 5601
    protocol: TCP
    targetPort: ui
  selector:
    k8s-app: kibana-logging
  type: NodePort 添加此行内容

~~~

~~~powershell
应用资源清单文件
# kubectl apply -f kibana-service.yaml
~~~

### 2.4.2 查看Kibana部署状态

~~~powershell
查看已部署组件pod运行状态
# kubectl get pods -n logging
NAME                             READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0          1/1     Running   0          25m
elasticsearch-logging-1          1/1     Running   1          22m
fluentd-es-v3.1.1-2chjb          1/1     Running   0          5m45s
fluentd-es-v3.1.1-5gpmd          1/1     Running   0          5m45s
kibana-logging-c46f6b9c5-g9fsl   1/1     Running   0          11s
~~~

~~~powershell
获取kibana对外提供的主机地址及对应的端口
# kubectl get svc -n logging
NAME                    TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)                         AGE
elasticsearch-logging   NodePort   10.107.97.124   <none>        9200:31885/TCP,9300:32214/TCP   15m
kibana-logging          NodePort   10.99.171.38    <none>        5601:31739/TCP                  7s

~~~

~~~powershell
在K8S集群任意主机查看是否打开kibana对外的端口（服务类型为NodePort）

# ss -anput | grep "31739"
tcp    LISTEN     0      4096      *:31739                 *:*                   users:(("kube-proxy",pid=4569,fd=23))
~~~

> 通过浏览器访问kibana web界面。

![image-20211231164228950](/云原生/serverless/serverless-22-efk/image-20211231164228950.png)

# 三、Knative 日志收集

![image-20220108184836426](/云原生/serverless/serverless-22-efk/image-20220108184836426.png)

![image-20220109120152413](/云原生/serverless/serverless-22-efk/image-20220109120152413.png)

## 3.1 部署收集器（collector）

> 由于转发器(forward)需要使用到收集器(collector)地址，所以先部署。

### 3.1.1 获取收集器部署文件

> 由于涉及到本地K8S集群应用的问题，所以建议下载修改后再应用此文件。

~~~powershell
# kubectl apply -f https://github.com/knative/docs/raw/main/docs/serving/observability/logging/fluent-bit-collector.yaml
~~~

~~~powershell
# wget https://github.com/knative/docs/raw/main/docs/serving/observability/logging/fluent-bit-collector.yaml
~~~

### 3.1.2 修改收集器文件

> 本次直接使用fluent bit输出到ES

~~~powershell
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: log-collector-config
  namespace: logging
  labels:
    k8s-app: log-collector
data:
  # Configuration files: server, input, filters and output
  # ======================================================
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    @INCLUDE input-forward.conf
    @INCLUDE filter-simplify.conf
    @INCLUDE output-elasticsearch.conf 添加此行内容
~~~

~~~powershell
data:
 ......

  input-forward.conf: |
    .......
    
  添加如下内容
  output-elasticsearch.conf: |
    [OUTPUT]
        Name            es
        Match           *
        Host            192.168.10.10
        Port            31213
        Logstash_Format On
        Replace_Dots    On
        Retry_Limit     False

~~~

~~~powershell
 添加storageClassName部分
 volumeClaimTemplates:
  - metadata:
      name: logs
    spec:
      storageClassName: managed-nfs-storage 添加此行内容
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 40Gi
~~~

~~~powershell
应用资源清单文件
# kubectl apply -f fluent-bit-collector.yaml
~~~

~~~powershell
查看collector pod运行情况
# kubectl get pods -n logging
NAME                             READY   STATUS    RESTARTS   AGE
log-collector-0                  2/2     Running   0          14m
~~~

## 3.2 部署转发器(forward)

> 部署参考网址：https://docs.fluentbit.io/manual/installation/kubernetes

### 3.2.1 在k8s集群中安装fluent bit准备

> 根据集群版本的不同，部署文件也不相同。

![image-20220108233955770](/云原生/serverless/serverless-22-efk/image-20220108233955770.png)

> K8S 1.21及以下版本

~~~powershell
如果默认已添加，可以不添加
# kubectl create namespace logging
~~~

~~~powershell
# kubectl create -f https://raw.githubusercontent.com/fluent/fluent-bit-kubernetes-logging/master/fluent-bit-service-account.yaml
~~~

~~~powershell
# kubectl create -f https://raw.githubusercontent.com/fluent/fluent-bit-kubernetes-logging/master/fluent-bit-role.yaml
~~~

~~~powershell
# kubectl create -f https://raw.githubusercontent.com/fluent/fluent-bit-kubernetes-logging/master/fluent-bit-role-binding.yaml
~~~

> K8S 1.22版本

~~~powershell
如果默认已添加，可以不添加
# kubectl create namespace logging
~~~

~~~powershell
# kubectl create -f https://raw.githubusercontent.com/fluent/fluent-bit-kubernetes-logging/master/fluent-bit-service-account.yaml
~~~

~~~powershell
# kubectl create -f https://raw.githubusercontent.com/fluent/fluent-bit-kubernetes-logging/master/fluent-bit-role-1.22.yaml
~~~

~~~powershell
# kubectl create -f https://raw.githubusercontent.com/fluent/fluent-bit-kubernetes-logging/master/fluent-bit-role-binding-1.22.yaml
~~~

下面命令可直接在k8s集群版本上部署，不区分版本。

> create a ConfigMap that will be used by our Fluent Bit DaemonSet
>
> 建议直接使用knative官方提供的链接地址下载资源清单文件：https://knative.dev/docs/serving/observability/logging/fluent-bit-configmap.yaml

~~~powershell
应用configmap资源清单文件
# vim fluent-bit-configmap.yaml
# cat fluent-bit-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
  labels:
    k8s-app: fluent-bit
data:
  # Configuration files: server, input, filters and output
  # ======================================================
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    @INCLUDE input-kubernetes.conf
    @INCLUDE filter-kubernetes.conf
    @INCLUDE output-forward.conf   注意此行内容，这是官方配置好的，可不用修改

  input-kubernetes.conf: |
    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            docker
        DB                /var/log/flb_kube.db
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On
        Refresh_Interval  10

  filter-kubernetes.conf: |
    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        Merge_Log_Key       log_processed
        K8S-Logging.Parser  On
        K8S-Logging.Exclude Off

  output-null.conf: |
    [OUTPUT]
        Name            null
        Match           *

  output-forward.conf: |  注意这个配置文件，这是官方配置好的，不用修改，注意即可。
    [OUTPUT]
        Name            forward
        Host            log-collector.logging
        Port            24224
        Require_ack_response  True

  parsers.conf: |
    [PARSER]
        Name   apache
        Format regex
        Regex  ^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z

    [PARSER]
        Name   apache2
        Format regex
        Regex  ^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^ ]*) +\S*)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z

    [PARSER]
        Name   apache_error
        Format regex
        Regex  ^\[[^ ]* (?<time>[^\]]*)\] \[(?<level>[^\]]*)\](?: \[pid (?<pid>[^\]]*)\])?( \[client (?<client>[^\]]*)\])? (?<message>.*)$

    [PARSER]
        Name   nginx
        Format regex
        Regex ^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z

    [PARSER]
        Name   json
        Format json
        Time_Key time
        Time_Format %d/%b/%Y:%H:%M:%S %z

    [PARSER]
        Name        docker
        Format      json
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L
        Time_Keep   On

    [PARSER]
        Name        syslog
        Format      regex
        Regex       ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
        Time_Key    time
        Time_Format %b %d %H:%M:%S
~~~

### 3.2.2 部署fluent bit

>Fluent Bit DaemonSet ready to be used with Elasticsearch on a normal Kubernetes Cluster

~~~powershell
应用部署fluent bit资源清单文件
# kubectl create -f https://raw.githubusercontent.com/fluent/fluent-bit-kubernetes-logging/master/output/elasticsearch/fluent-bit-ds.yaml
~~~

### 3.2.3 验证是否启动

~~~powershell
# kubectl get pods -n logging
NAME                             READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0          1/1     Running   1          7h25m
elasticsearch-logging-1          1/1     Running   0          7h22m
fluent-bit-82cv6                 1/1     Running   0          20m
fluent-bit-q55c5                 1/1     Running   0          20m
fluent-bit-r7l9b                 1/1     Running   0          20m
fluentd-es-v3.1.1-7fv8j          1/1     Running   6          3h54m
fluentd-es-v3.1.1-pjcjs          1/1     Running   6          3h54m
kibana-logging-c46f6b9c5-xjnv7   1/1     Running   0          7h8m
log-collector-0                  2/2     Running   0          132m
~~~

# 四、Knative日志可视化

![image-20220108235441311](/云原生/serverless/serverless-22-efk/image-20220108235441311.png)

![image-20220108235552604](/云原生/serverless/serverless-22-efk/image-20220108235552604.png)

![image-20220108235615254](/云原生/serverless/serverless-22-efk/image-20220108235615254.png)

![image-20220108235644339](/云原生/serverless/serverless-22-efk/image-20220108235644339.png)

![image-20220108235943059](/云原生/serverless/serverless-22-efk/image-20220108235943059.png)

![image-20220109000008453](/云原生/serverless/serverless-22-efk/image-20220109000008453.png)

![image-20220109000034125](/云原生/serverless/serverless-22-efk/image-20220109000034125.png)

![image-20220109000234650](/云原生/serverless/serverless-22-efk/image-20220109000234650.png)

![image-20220109000440346](/云原生/serverless/serverless-22-efk/image-20220109000440346.png)

![image-20220109000703503](/云原生/serverless/serverless-22-efk/image-20220109000703503.png)

# 五、关于EFK的补充

## 5.1 原有Fluentd

~~~powershell
查看原有的
# kubectl get pods -n logging
NAME                             READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0          1/1     Running   0          4h14m
elasticsearch-logging-1          1/1     Running   0          4h12m
fluent-bit-6g42d                 1/1     Running   0          15m
fluent-bit-dgwnv                 1/1     Running   0          13m
fluent-bit-nvfwf                 1/1     Running   0          14m
fluentd-es-v3.1.1-6nvz4          1/1     Running   0          5m47s
fluentd-es-v3.1.1-xwpz4          1/1     Running   0          5m47s
kibana-logging-c58b4fffc-ctqvj   1/1     Running   0          3h27m
log-collector-0                  2/2     Running   0          17m
~~~

~~~powershell
删除
# kubectl delete -f fluentd-es-configmap.yaml
# kubectl delete -f fluentd-es-ds.yaml
~~~

~~~powershell
查看现有的
# kubectl get pods -n logging
NAME                             READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0          1/1     Running   0          4h16m
elasticsearch-logging-1          1/1     Running   0          4h14m
fluent-bit-6g42d                 1/1     Running   0          17m
fluent-bit-dgwnv                 1/1     Running   0          16m
fluent-bit-nvfwf                 1/1     Running   0          16m
kibana-logging-c58b4fffc-ctqvj   1/1     Running   0          3h29m
log-collector-0                  2/2     Running   0          20m
~~~

## 5.2 关于fluent bit报错处理

~~~powershell
无法找到收集器，创建或启动即
[error] [io] connection #54 failed to: log-collector.logging:24224
~~~

~~~powershell
可以调整内存中的缓存大小来解决
[error] [output:forward:forward.0] cannot get ack
[ warn] [engine] failed to flush chunk '1-1641710896.577811610.flb', retry in 8 seconds: task_id=1, input=tail.0 > output=forward.0
~~~

~~~powershell
转发器配置文件
# vim fluent-bit-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
  labels:
    k8s-app: fluent-bit
data:
  # Configuration files: server, input, filters and output
  # ======================================================
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    @INCLUDE input-kubernetes.conf
    @INCLUDE filter-kubernetes.conf
    @INCLUDE output-forward.conf

  input-kubernetes.conf: |
    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            docker
        DB                /var/log/flb_kube.db
        Mem_Buf_Limit     512MB
        Skip_Long_Lines   Off
        Refresh_Interval  10
       增加了以下内容
        Buffer_Chunk_Size 2MB
        Buffer_MAX_Size   4MB
~~~

~~~powershell
收集器配置文件
# vim fluent-bit-collector.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: log-collector-config
  namespace: logging
  labels:
    k8s-app: log-collector
data:
  # Configuration files: server, input, filters and output
  # ======================================================
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    @INCLUDE input-forward.conf
    @INCLUDE filter-simplify.conf
    @INCLUDE output-elasticsearch.conf

  input-forward.conf: |
    [INPUT]
        Name              forward
        Port              ${FLUENT_PORT}
        Listen          0.0.0.0
        Buffer_Chunk_Size    4MB
        Buffer_Max_Size      8MB
~~~

~~~powershell
# kubectl get pods -n logging
NAME                             READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0          1/1     Running   0          4h25m
elasticsearch-logging-1          1/1     Running   0          4h23m
fluent-bit-6g42d                 1/1     Running   0          26m 转发器
fluent-bit-dgwnv                 1/1     Running   0          24m 转发器
fluent-bit-nvfwf                 1/1     Running   0          25m 转发器
kibana-logging-c58b4fffc-ctqvj   1/1     Running   0          3h38m
log-collector-0                  2/2     Running   0          29m  收集器
~~~

~~~powershell
查看转发器日志
# kubectl logs fluent-bit-nvfwf -n logging
Fluent Bit v1.5.7
* Copyright (C) 2019-2020 The Fluent Bit Authors
* Copyright (C) 2015-2018 Treasure Data
* Fluent Bit is a CNCF sub-project under the umbrella of Fluentd
* https://fluentbit.io

[2022/01/09 06:59:56] [ info] [engine] started (pid=1)
[2022/01/09 06:59:56] [ info] [storage] version=1.0.5, initializing...
[2022/01/09 06:59:56] [ info] [storage] in-memory
[2022/01/09 06:59:56] [ info] [storage] normal synchronization mode, checksum disabled, max_chunks_up=128
[2022/01/09 06:59:56] [ info] [filter:kubernetes:kubernetes.0] https=1 host=kubernetes.default.svc port=443
[2022/01/09 06:59:56] [ info] [filter:kubernetes:kubernetes.0] local POD info OK
[2022/01/09 06:59:56] [ info] [filter:kubernetes:kubernetes.0] testing connectivity with API server...
[2022/01/09 06:59:56] [ info] [filter:kubernetes:kubernetes.0] API server connectivity OK
[2022/01/09 06:59:56] [ info] [http_server] listen iface=0.0.0.0 tcp_port=2020
[2022/01/09 06:59:56] [ info] [sp] stream processor started
[2022/01/09 06:59:56] [ info] inotify_fs_add(): inode=68227572 watch_fd=1 name=/var/log/containers/alertmanager-stable-kube-prometheus-sta-alertmanager-0_default_alertmanager-01be702786e7d76bcb28b06806b3f28871af6ab199732578fb42978f5020cd28.log
[2022/01/09 06:59:56] [ info] inotify_fs_add(): inode=4329146 watch_fd=2 name=/var/log/containers/alertmanager-stable-kube-prometheus-sta-alertmanager-0_default_alertmanager-44ee526fe765afbd7819bf0b76dbc16ef7f2af79217099642aa28cca4a119d6c.log
[2022/01/09 06:59:56] [ info] inotify_fs_add(): inode=34915529 watch_fd=3 name=/var/log/containers/alertmanager-stable-kube-prometheus-sta-alertmanager-0_default_config-reloader-0b898d313769a1768cca506296e6fb03ab0deb633a7711778e884a153a16a51e.log
[2022/01/09 06:59:56] [ info] inotify_fs_add(): inode=68458464 watch_fd=4 name=/var/log/containers/alertmanager-stable-kube-prometheus-sta-alertmanager-0_default_config-reloader-50d4cef09b4b5c74ea1bdc0c94acfeb2686bda11c0d78b5c96a0fe1236afe87f.log
[2022/01/09 06:59:56] [ info] inotify_fs_add(): inode=103929790 watch_fd=5 name=/var/log/containers/bash_default_bash-5bfde879974dd5669fa6eea9b176e8ab6ee9a431066dd318e6e87311797336b4.log
~~~

~~~powershell
查看收集器日志
# kubectl logs log-collector-0 -n logging -c fluent-bit
Fluent Bit v1.5.7
* Copyright (C) 2019-2020 The Fluent Bit Authors
* Copyright (C) 2015-2018 Treasure Data
* Fluent Bit is a CNCF sub-project under the umbrella of Fluentd
* https://fluentbit.io

[2022/01/09 06:56:03] [ info] [engine] started (pid=1)
[2022/01/09 06:56:03] [ info] [storage] version=1.0.5, initializing...
[2022/01/09 06:56:03] [ info] [storage] in-memory
[2022/01/09 06:56:03] [ info] [storage] normal synchronization mode, checksum disabled, max_chunks_up=128
[2022/01/09 06:56:03] [ info] [input:forward:forward.0] listening on 0.0.0.0:24224
[2022/01/09 06:56:03] [ info] [http_server] listen iface=0.0.0.0 tcp_port=2020
[2022/01/09 06:56:03] [ info] [sp] stream processor started
~~~

![image-20220109154212055](/云原生/serverless/serverless-22-efk/image-20220109154212055.png)

