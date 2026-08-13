---
title: Knative 可观测性 使用prometheus与grafana监控
sidebarGroup: Serverless
shortTitle: 21 Knative 可观测性 使用prometh...
order: 21
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: Knative 可观测性 使用prometheus与grafana监控 本案例中有负载均衡器：metallb 一、安装helm ~~~powershell 本案例通过复制链接下载： wget http...
---

> **Serverless · 第 21 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Knative 可观测性 使用prometheus与grafana监控

> 本案例中有负载均衡器：metallb

# 一、安装helm

![image-20211231123725084](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231123725084.png)

![image-20211231123842545](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231123842545.png)

![image-20211231123920999](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231123920999.png)

![image-20211231124008565](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231124008565.png)

~~~powershell
本案例通过复制链接下载：
# wget https://get.helm.sh/helm-v3.7.2-linux-amd64.tar.gz
~~~

~~~powershell
# ls
 helm-v3.7.2-linux-amd64.tar.gz
~~~

~~~powershell
# tar xf helm-v3.7.2-linux-amd64.tar.gz
~~~

~~~powershell
# ls
linux-amd64 
~~~

~~~powershell
# ls linux-amd64/
helm  LICENSE  README.md
~~~

~~~powershell
# mv linux-amd64/helm /usr/bin
~~~

~~~powershell
验证
# helm version
version.BuildInfo{Version:"v3.7.2", GitCommit:"663a896f4a815053445eec4153677ddc24a0a361", GitTreeState:"clean", GoVersion:"go1.16.10"}
~~~

# 二、通过helm安装prometheus及grafana

## 2.1 添加helm repo

~~~powershell
# helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
~~~

## 2.2 更新repo

~~~powershell
# helm repo update
~~~

## 2.3 搜索prometheus

~~~powershell
# helm search repo prometheus-community
~~~

## 2.4 查看环境变量

~~~powershell
# helm env
HELM_BIN="helm"
HELM_CACHE_HOME="/root/.cache/helm"
HELM_CONFIG_HOME="/root/.config/helm"
HELM_DATA_HOME="/root/.local/share/helm"
HELM_DEBUG="false"
HELM_KUBEAPISERVER=""
HELM_KUBEASGROUPS=""
HELM_KUBEASUSER=""
HELM_KUBECAFILE=""
HELM_KUBECONTEXT=""
HELM_KUBETOKEN=""
HELM_MAX_HISTORY="10"
HELM_NAMESPACE="default"
HELM_PLUGINS="/root/.local/share/helm/plugins"
HELM_REGISTRY_CONFIG="/root/.config/helm/registry.json"
HELM_REPOSITORY_CACHE="/root/.cache/helm/repository"
HELM_REPOSITORY_CONFIG="/root/.config/helm/repositories.yaml"
~~~

## 2.5 确保tgz文件可下载

~~~powershell
# cat /root/.cache/helm/repository/prometheus-community-index.yaml |grep tgz
~~~

## 2.6 安装prometheus

~~~powershell
# helm install stable prometheus-community/kube-prometheus-stack
~~~

## 2.7 查看部署的资源对象

~~~powershell
# kubectl get pods
~~~

~~~powershell
输出结果

NAME                                                     READY   STATUS    RESTARTS   AGE
alertmanager-stable-kube-prometheus-sta-alertmanager-0   2/2     Running   0          102m
prometheus-stable-kube-prometheus-sta-prometheus-0       2/2     Running   0          102m
stable-grafana-5677c65c4b-djjl2                          3/3     Running   0          102m
stable-kube-prometheus-sta-operator-ccdf775-lg9pz        1/1     Running   0          102m
stable-kube-state-metrics-67997bdf84-p4gwl               1/1     Running   0          102m
stable-prometheus-node-exporter-8r946                    1/1     Running   0          102m
stable-prometheus-node-exporter-hwkcn                    1/1     Running   0          102m
stable-prometheus-node-exporter-s2jkq                    1/1     Running   0          102m
~~~

~~~powershell
# kubectl get svc
~~~

## 2.8 编辑资源对象文件修改service暴露模式

~~~powershell
# kubectl edit service stable-kube-prometheus-sta-prometheus
修改type为：LoadBalancer
~~~

~~~powershell
# kubectl edit service stable-grafana
修改type为：LoadBalancer
~~~

~~~powershell
# kubectl get svc
~~~

~~~powershell
输出结果：
stable-grafana                            LoadBalancer   10.98.34.87      192.168.10.201                                         80:30634/TCP                                 103m

stable-kube-prometheus-sta-prometheus     LoadBalancer   10.108.194.89    192.168.10.200                                         9090:32112/TCP                               103m

~~~

## 2.9 通过IP地址访问prometheus

![image-20211231125625791](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231125625791.png)

## 2.10 通过IP地址访问grafana

> 默认用户名为：admin  密码为：prom-operator

![image-20211231125702535](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231125702535.png)

# 三、收集Knative指标数据

## 3.1 创建监控器

~~~powershell
# kubectl apply -f https://raw.githubusercontent.com/knative-sandbox/monitoring/main/servicemonitor.yaml
~~~

> grafana仪表盘:https://github.com/knative-sandbox/monitoring/tree/main/grafana 

![image-20211231140328009](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231140328009.png)

![image-20211231140427140](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231140427140.png)

![image-20211231140450831](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231140450831.png)

![image-20211231140609416](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231140609416.png)

![image-20211231140633514](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231140633514.png)

![image-20211231140823246](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231140823246.png)

![image-20211231140925932](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231140925932.png)

![image-20211231141003714](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231141003714.png)

![image-20211231141054749](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231141054749.png)

## 3.2 创建knative service

### 3.2.1 创建

~~~powershell
# kubectl apply -f java-app/
~~~

~~~powershell
# # kubectl get pods
NAME                                                       READY   STATUS    RESTARTS   AGE
helloworld-java-spring-00001-deployment-5bcdc9ff89-qdvcj   2/2     Running   0          70s
~~~

### 3.2.2 访问

![image-20211231131024875](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231131024875.png)

## 3.3 创建 eventing

~~~powershell
可根据前面的eventing应用案例进行创建后监控。
~~~

# 四、通过grafana实现数据仪表盘

![image-20211231145017706](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231145017706.png)

![image-20211231131228437](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231131228437.png)

![image-20211231125913878](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231125913878.png)

![image-20211231125956563](/云原生/serverless/serverless-21-knative-可观测性-使用prometheus与grafana监控/image-20211231125956563.png)

