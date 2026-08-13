---
title: Knative Eventing
sidebarGroup: Serverless
shortTitle: 10 Knative Eventing
order: 10
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: Knative Eventing 一、Eventing介绍 Knative Eventing充当架构不同部分之间的 glue（粘合剂） ，使得你应用架构不同部分之间可以轻松进行通信，并具备较好的容错（...
---

> **Serverless · 第 10 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Knative Eventing

# 一、Eventing介绍

Knative Eventing充当架构不同部分之间的`glue（粘合剂）`，使得你应用架构不同部分之间可以轻松进行通信，并具备较好的容错（fault-tolerant）等特性。一些使用场景例子如下：

- 创建和响应Kubernetes API事件；
- 创建一个图像处理地管道（pipeline）；
- 一些AI边缘地场景；

所以说，一些简单实现，甚至特别复杂的事件驱动场景，都可以考虑用Knative Eventing来实现。

对于knative的组件来说，目前可以先了解最基本的几个组件：

- Sources：事件源，向 Broker 发出事件的 Kubernetes 自定义资源；
- Brokers：事件中心，用于发送事件；
- Trigger：触发器，对broker里的事件进行过滤，也可以配置事件所需的属性；
- Sinks：事件最终到达的目的地。

其关系图如下：

![image-20211229132453440](/云原生/serverless/serverless-10-knative-eventing/image-20211229132453440.png)

![image-20211230174915786](/云原生/serverless/serverless-10-knative-eventing/image-20211230174915786.png)

![image-20211230174946358](/云原生/serverless/serverless-10-knative-eventing/image-20211230174946358.png)

>knative的服务即可以作为事件的source也可以作为事件的sink，理由很简单，比如你可能想从broker来消费某些事件，或者将修改后的事件发送回到broker里，如同在一些管道（pipeline）用例中一样。

# 二、Eventing安装

## 2.1 安装前说明

参考官网安装过程：[Knative Install Eventing with YAML](https://knative.dev/docs/install/eventing/install-eventing-with-yaml/)。

## 2.2 基本安装

### 2.2.1 CRD安装

> 不涉及镜像文件

~~~powershell
如有需要，下载资源清单文件
# wget https://github.com/knative/eventing/releases/download/knative-v1.1.0/eventing-crds.yaml
~~~

~~~powershell
应用资源清单文件
# kubectl apply -f eventing-crds.yaml
~~~

~~~powershell
输出：
customresourcedefinition.apiextensions.k8s.io/apiserversources.sources.knative.dev created
customresourcedefinition.apiextensions.k8s.io/brokers.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/channels.messaging.knative.dev created
customresourcedefinition.apiextensions.k8s.io/containersources.sources.knative.dev created
customresourcedefinition.apiextensions.k8s.io/eventtypes.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/parallels.flows.knative.dev created
customresourcedefinition.apiextensions.k8s.io/pingsources.sources.knative.dev created
customresourcedefinition.apiextensions.k8s.io/sequences.flows.knative.dev created
customresourcedefinition.apiextensions.k8s.io/sinkbindings.sources.knative.dev created
customresourcedefinition.apiextensions.k8s.io/subscriptions.messaging.knative.dev created
customresourcedefinition.apiextensions.k8s.io/triggers.eventing.knative.dev created
~~~

### 2.2.2 核心组件

> 涉及容器镜像文件，请提前准备。

~~~powershell
下载资源清单文件
# wget https://github.com/knative/eventing/releases/download/knative-v1.1.0/eventing-core.yaml
~~~

~~~powershell
应用资源清单文件，以安装eventing核心组件
# kubectl apply -f eventing-core.yaml
~~~

~~~powershell
输出：
namespace/knative-eventing created
serviceaccount/eventing-controller created
clusterrolebinding.rbac.authorization.k8s.io/eventing-controller created
clusterrolebinding.rbac.authorization.k8s.io/eventing-controller-resolver created
clusterrolebinding.rbac.authorization.k8s.io/eventing-controller-source-observer created
clusterrolebinding.rbac.authorization.k8s.io/eventing-controller-sources-controller created
clusterrolebinding.rbac.authorization.k8s.io/eventing-controller-manipulator created
serviceaccount/pingsource-mt-adapter created
clusterrolebinding.rbac.authorization.k8s.io/knative-eventing-pingsource-mt-adapter created
serviceaccount/eventing-webhook created
clusterrolebinding.rbac.authorization.k8s.io/eventing-webhook created
rolebinding.rbac.authorization.k8s.io/eventing-webhook created
clusterrolebinding.rbac.authorization.k8s.io/eventing-webhook-resolver created
clusterrolebinding.rbac.authorization.k8s.io/eventing-webhook-podspecable-binding created
configmap/config-br-default-channel created
configmap/config-br-defaults created
configmap/default-ch-webhook created
configmap/config-ping-defaults created
configmap/config-features created
configmap/config-kreference-mapping created
configmap/config-leader-election created
configmap/config-logging created
configmap/config-observability created
configmap/config-tracing created
deployment.apps/eventing-controller created
deployment.apps/pingsource-mt-adapter created
horizontalpodautoscaler.autoscaling/eventing-webhook created
Warning: policy/v1beta1 PodDisruptionBudget is deprecated in v1.21+, unavailable in v1.25+; use policy/v1 PodDisruptionBudget
poddisruptionbudget.policy/eventing-webhook created
deployment.apps/eventing-webhook created
service/eventing-webhook created
customresourcedefinition.apiextensions.k8s.io/apiserversources.sources.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/brokers.eventing.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/channels.messaging.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/containersources.sources.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/eventtypes.eventing.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/parallels.flows.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/pingsources.sources.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/sequences.flows.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/sinkbindings.sources.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/subscriptions.messaging.knative.dev unchanged
customresourcedefinition.apiextensions.k8s.io/triggers.eventing.knative.dev unchanged
clusterrole.rbac.authorization.k8s.io/addressable-resolver created
clusterrole.rbac.authorization.k8s.io/service-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/serving-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/channel-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/broker-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/flows-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/eventing-broker-filter created
clusterrole.rbac.authorization.k8s.io/eventing-broker-ingress created
clusterrole.rbac.authorization.k8s.io/eventing-config-reader created
clusterrole.rbac.authorization.k8s.io/channelable-manipulator created
clusterrole.rbac.authorization.k8s.io/meta-channelable-manipulator created
clusterrole.rbac.authorization.k8s.io/knative-eventing-namespaced-admin created
clusterrole.rbac.authorization.k8s.io/knative-messaging-namespaced-admin created
clusterrole.rbac.authorization.k8s.io/knative-flows-namespaced-admin created
clusterrole.rbac.authorization.k8s.io/knative-sources-namespaced-admin created
clusterrole.rbac.authorization.k8s.io/knative-bindings-namespaced-admin created
clusterrole.rbac.authorization.k8s.io/knative-eventing-namespaced-edit created
clusterrole.rbac.authorization.k8s.io/knative-eventing-namespaced-view created
clusterrole.rbac.authorization.k8s.io/knative-eventing-controller created
clusterrole.rbac.authorization.k8s.io/knative-eventing-pingsource-mt-adapter created
clusterrole.rbac.authorization.k8s.io/podspecable-binding created
clusterrole.rbac.authorization.k8s.io/builtin-podspecable-binding created
clusterrole.rbac.authorization.k8s.io/source-observer created
clusterrole.rbac.authorization.k8s.io/eventing-sources-source-observer created
clusterrole.rbac.authorization.k8s.io/knative-eventing-sources-controller created
clusterrole.rbac.authorization.k8s.io/knative-eventing-webhook created
role.rbac.authorization.k8s.io/knative-eventing-webhook created
validatingwebhookconfiguration.admissionregistration.k8s.io/config.webhook.eventing.knative.dev created
mutatingwebhookconfiguration.admissionregistration.k8s.io/webhook.eventing.knative.dev created
validatingwebhookconfiguration.admissionregistration.k8s.io/validation.webhook.eventing.knative.dev created
secret/eventing-webhook-certs created
mutatingwebhookconfiguration.admissionregistration.k8s.io/sinkbindings.webhook.sources.knative.dev created
~~~

### 2.2.3 验证

~~~powershell
验证是否安装成功
# kubectl get ns
NAME                   STATUS   AGE
default                Active   47h
ingress-nginx          Active   40h
istio-system           Active   12h
knative-eventing       Active   22s
knative-serving        Active   12h
kube-node-lease        Active   47h
kube-public            Active   47h
kube-system            Active   47h
kubernetes-dashboard   Active   42h
metallb-system         Active   14h
~~~

~~~powershell
查看eventing对应的pod
# kubectl get pod -n knative-eventing
NAME                                  READY   STATUS    RESTARTS   AGE
eventing-controller-df9748688-drbm7   1/1     Running   0          45s
eventing-webhook-5f8484fd45-vtw9n     1/1     Running   0          45s
~~~

## 2.3 Channel安装

### 2.3.1 介绍

Channels是Kubernetes Custom Resources，可以看作就是消息通道，类似消息队列（MQ）的模式。它定义了一个单一的事件转发和持久层。消息实现可以通过Kubernetes Custom Resource提供Channel的实现，支持不同的技术，比如kafaka、google cloud Pub/Sub channel、In_Memory、NATS Channel等等。

本地学习环境，我们只需要安装最简单的In-Memory的Channel即可。

### 2.3.2 安装

> 涉及容器镜像：
>
> gcr.io/knative-releases/knative.dev/eventing/cmd/in_memory/channel_controller:latest
>
> gcr.io/knative-releases/knative.dev/eventing/cmd/in_memory/channel_dispatcher:latest

~~~powershell
如有需要，下载该资源清单文件
# wget https://github.com/knative/eventing/releases/download/knative-v1.1.0/in-memory-channel.yaml
~~~

~~~powershell
应用该资源清单文件
# kubectl apply -f in-memory-channel.yaml
~~~

~~~powershell
输出：
namespace/knative-eventing unchanged
serviceaccount/imc-controller created
clusterrolebinding.rbac.authorization.k8s.io/imc-controller created
rolebinding.rbac.authorization.k8s.io/imc-controller created
clusterrolebinding.rbac.authorization.k8s.io/imc-controller-resolver created
serviceaccount/imc-dispatcher created
clusterrolebinding.rbac.authorization.k8s.io/imc-dispatcher created
configmap/config-imc-event-dispatcher created
configmap/config-observability unchanged
configmap/config-tracing configured
deployment.apps/imc-controller created
service/inmemorychannel-webhook created
service/imc-dispatcher created
deployment.apps/imc-dispatcher created
customresourcedefinition.apiextensions.k8s.io/inmemorychannels.messaging.knative.dev created
clusterrole.rbac.authorization.k8s.io/imc-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/imc-channelable-manipulator created
clusterrole.rbac.authorization.k8s.io/imc-controller created
clusterrole.rbac.authorization.k8s.io/imc-dispatcher created
role.rbac.authorization.k8s.io/knative-inmemorychannel-webhook created
mutatingwebhookconfiguration.admissionregistration.k8s.io/inmemorychannel.eventing.knative.dev created
validatingwebhookconfiguration.admissionregistration.k8s.io/validation.inmemorychannel.eventing.knative.dev created
secret/inmemorychannel-webhook-certs created
~~~

### 2.3.3 验证

~~~powershell
查看Pod创建情况
# kubectl get pods -n knative-eventing
NAME                                  READY   STATUS    RESTARTS   AGE
eventing-controller-df9748688-drbm7   1/1     Running   0          20m
eventing-webhook-5f8484fd45-vtw9n     1/1     Running   0          20m
imc-controller-5c7888846b-hsf78       1/1     Running   0          29s
imc-dispatcher-c764c8486-xwzb6        1/1     Running   0          29s
~~~

## 2.4 Broker安装

### 2.4.1 介绍

作为事件的中心（hub），事件被发送到Broker的入口（Ingress），然后被发送到对该事件感兴趣的任何订阅者。

![image-20211230181818396](/云原生/serverless/serverless-10-knative-eventing/image-20211230181818396.png)

### 2.4.2 安装

在本地学习环境，我们选择一个内存的broker来进行安装：

~~~powershell
如有需要，下载该资源清单文件
# wget https://github.com/knative/eventing/releases/download/knative-v1.1.0/mt-channel-broker.yaml
~~~

~~~powershell
应用资源清单文件
# kubectl apply -f mt-channel-broker.yaml
~~~

~~~powershell
输出：
clusterrole.rbac.authorization.k8s.io/knative-eventing-mt-channel-broker-controller created
clusterrole.rbac.authorization.k8s.io/knative-eventing-mt-broker-filter created
serviceaccount/mt-broker-filter created
clusterrole.rbac.authorization.k8s.io/knative-eventing-mt-broker-ingress created
serviceaccount/mt-broker-ingress created
clusterrolebinding.rbac.authorization.k8s.io/eventing-mt-channel-broker-controller created
clusterrolebinding.rbac.authorization.k8s.io/knative-eventing-mt-broker-filter created
clusterrolebinding.rbac.authorization.k8s.io/knative-eventing-mt-broker-ingress created
deployment.apps/mt-broker-filter created
service/broker-filter created
deployment.apps/mt-broker-ingress created
service/broker-ingress created
deployment.apps/mt-broker-controller created
horizontalpodautoscaler.autoscaling/broker-ingress-hpa created
horizontalpodautoscaler.autoscaling/broker-filter-hpa created
~~~

~~~powershell
查看Pod创建情况
# kubectl get pods -n knative-eventing
NAME                                   READY   STATUS    RESTARTS   AGE
eventing-controller-df9748688-drbm7    1/1     Running   0          44m
eventing-webhook-5f8484fd45-vtw9n      1/1     Running   0          44m
imc-controller-5c7888846b-hsf78        1/1     Running   0          24m
imc-dispatcher-c764c8486-xwzb6         1/1     Running   0          24m
mt-broker-controller-599559b57-n945d   1/1     Running   0          17s
mt-broker-filter-ddb868884-fwjt7       1/1     Running   0          17s
mt-broker-ingress-6444dd6fb6-vjclt     1/1     Running   0          17s
~~~

### 2.4.3 手动创建基于内存的Broker

>官网也提供其他broker的安装，比如kafka，但是前提是你得需要先安装kakfa的channel。

~~~powershell
# vim imc-broker.yaml
# cat imc-broker.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  annotations:
    eventing.knative.dev/broker.class: MTChannelBasedBroker
  name: example-broker
  namespace: default
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: config-br-default-channel
    namespace: knative-eventing
~~~

~~~powershell
# kubectl apply -f imc-broker.yaml
broker.eventing.knative.dev/example-broker created
~~~

### 2.4.4 验证Broker安装是否正确

~~~powershell
# kubectl get broker
NAME             URL                                                                               AGE     READY   REASON
example-broker   http://broker-ingress.knative-eventing.svc.cluster.local/default/example-broker   2m42s   True
~~~

## 2.5 CloudEvents Player应用

### 2.5.1 介绍

官方提供了一个简单的有可视化页面的CloudEvents Player，可以学习Knative Eventing的一些核心概念。其体系结构图如下：

![image-20211229133044464](/云原生/serverless/serverless-10-knative-eventing/image-20211229133044464.png)

### 2.5.2 创建CloudEvents Player服务

创建一个CloudEvents Player服务，创建一个yml，名为`cloudevents-player.yaml`，内容如下：

~~~powershell
# vim cloudevents-player.yaml
# # cat cloudevents-player.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: cloudevents-player
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
    spec:
      containers:
        - image: ruromero/cloudevents-player:latest
          imagePullPolicy: IfNotPresent
          env:
            - name: BROKER_URL
              value: http://broker-ingress.knative-eventing.svc.cluster.local/default/example-broker
~~~

~~~powershell
# kubectl apply -f cloudevents-player.yaml
service.serving.knative.dev/cloudevents-player created
~~~

### 2.5.3 验证服务是否创建

~~~powershell
# kubectl get ksvc
NAME                     URL                                                         LATESTCREATED                  LATESTREADY                    READY   REASON
cloudevents-player       http://cloudevents-player.default.knative.kubemsb.com       cloudevents-player-00001       cloudevents-player-00001       True
~~~

~~~powershell
# kubectl get pods
NAME                                                   READY   STATUS    RESTARTS   AGE
cloudevents-player-00001-deployment-56c55b549b-r74f9   2/2     Running   0          13m
~~~

### 2.5.4 访问CloudEvents Player

~~~powershell
方法一：
# curl -I  http://cloudevents-player.default.knative.kubemsb.com
HTTP/1.1 200 OK
accept-ranges: bytes
content-length: 2312
content-type: text/html
date: Wed, 22 Dec 2021 03:03:55 GMT
last-modified: Thu, 01 Jan 1970 00:00:00 GMT
x-envoy-upstream-service-time: 2
server: istio-envoy
~~~

~~~powershell
方法二：
在物理机上添加域名解析至/etc/hosts文件，通过物理机浏览器访问即可。
192.168.10.200是istio-ingress从metallb负载均衡器获取的IP地址。

# vim /etc/hosts
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.200 cloudevents-player.default.knative.kubemsb.com
~~~

### 2.5.5 验证CloudEvents Player是否可用

>直接在浏览器中打开该url,可使用物理机或K8S集群主机（有桌面情况下）。

![image-20211222123043853](/云原生/serverless/serverless-10-knative-eventing/image-20211222123043853.png)

> create event内容是随便输入内容，此处按图片内容输入即可。
>
> Status为事件状态，>表示没有被接收，√表示被接收。

## 2.6 Trigger

>如何才能让事件被接收呢？很明显，需要指定一个触发器`Trigger`。

## 2.6.1 创建Trigger

>

创建一个简单的Trigger，先创建一个yaml文件，名为`ce-trigger.yaml`，内容如下：

~~~powershell
# vim ce-trigger.yaml
# cat ce-trigger.yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: cloudevents-trigger
  annotations:
    knative-eventing-injection: enabled
spec:
  broker: example-broker
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: cloudevents-player
~~~

~~~powershell
# kubectl apply -f ce-trigger.yaml
trigger.eventing.knative.dev/cloudevents-trigger created
~~~

## 2.6.2 验证Trigger

~~~powershell
# kubectl get trigger
NAME                  BROKER           SUBSCRIBER_URI                                        AGE   READY   REASON
cloudevents-trigger   example-broker   http://cloudevents-player.default.svc.cluster.local   9s    True

~~~

进入cloudevents-player页面，刷新一下，重新创建一个event:

![image-20211222124028786](/云原生/serverless/serverless-10-knative-eventing/image-20211222124028786.png)

Status为√表示事件已经被正常接收了。

~~~powershell
特别说明：
  这种模式称之为`Event-Driven Architecture`（事件驱动架构），它可以用来在Kubernetes上创建`FaaS as a Service`（ 函数即服务）。
~~~

