---
title: "kubernetes日志收集方案 EFK"
sidebarGroup: "K8s 课程笔记"
shortTitle: "08 kubernetes日志收集方案 EFK"
order: 8
date: 2026-08-13
category: "云原生"
tag:
  - "K8s 课程笔记"
  - "云原生"
  - "课程笔记"
description: "kubernetes 日志收集方案 EFK 一、EFK 1.1 EFK介绍 EFK为elasticsearch、fluentd、kibana的简称，本案例主要对kubernetes集群日志收集。 1...."
---

> **K8s 课程笔记 · 第 8 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# kubernetes 日志收集方案 EFK

# 一、EFK

## 1.1 EFK介绍

EFK为elasticsearch、fluentd、kibana的简称，本案例主要对kubernetes集群日志收集。

## 1.2 Fluentd介绍

fluentd是一款开源的日志收集工具，其于2016年11月8日被云原生计算基金会录取，并于2019年毕业。

![image-20220408232416685](/云原生/k8s-course/k8s-course-08-kubernetes日志收集方案-efk/image-20220408232416685.png)

Fluentd优势：

- 使用 JSON 进行统一日志记录
  - 其尽可能地把数据结构化为JSON，让下游数据处理容易。
- 可插拔架构
  - 利用插件，允许对其功能扩展
- 对计算机资源要求少
  - 其使用c语言和ruby结合编写，需要少量系统资源即可运行。
- 内置可靠性
  - 支持基于内存和文件的缓冲，防止节点间数据丢失
  - 支持强大故障转移并可设置为高可用性

# 二、EFK部署

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
查看分支
# git branch
~~~

~~~powershell
切换对应版本的分支
# git checkout -b v1.21.10
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
应用资源清单文件创建命名空间，非必须，可使用资源清单中默认的命名空间 kube-system
# kubectl create namespace logging
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
 33               value: http://elasticsearch-logging.logging.svc.cluster.local.:9200
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

![image-20211231164228950](/云原生/k8s-course/k8s-course-08-kubernetes日志收集方案-efk/image-20211231164228950.png)

