---
title: Prometheus 第36章：kube-prometheus
sidebarGroup: 可观测性
shortTitle: 48 kube-prometheus
order: 48
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第36章（kube-prometheus）合并笔记
---

> **Prometheus · 第 36 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 36.1 kube-prometheus项目讲解和安装部署

# 本节重点总结 :

# kube-prometheus 优点

- 与手动添加指标目标和服务提供者相比，使用 Prometheus Operator 框架及其自定义资源定义具有显着优势
- 手动添加指标目标和服务提供者对于大型部署来说会变得很麻烦，并且不能充分利用 Kubernetes 的编排器功能。

# kube-prometheus解决了哪些问题

- 一键化部署k8s-prometheus中的所有组件
- 复杂的k8s采集自动生成
- 内置了很多alert和record rule，专业的promql，不用我们自己写了
- 多级嵌套的record计算如apiserver的slo
- 自定义指标的接入可以由业务方自行配置，无需监控管理员介入

# kube-prometheus项目介绍

# 安装部署 kube-prometheus

## 根据k8s集群版本选择kube-prometheus 版本

| kube-prometheus 版本 | Kubernetes 1.18 | Kubernetes 1.19 | Kubernetes 1.20 | Kubernetes 1.21 |
| -------------------- | --------------- | --------------- | --------------- | --------------- |
| `release-0.5`      | ✔              | ✗              | ✗              | ✗              |
| `release-0.6`      | ✗              | ✔              | ✗              | ✗              |
| `release-0.7`      | ✗              | ✔              | ✔              | ✗              |
| `release-0.8`      | ✗              | ✗              | ✔              | ✔              |
| `HEAD`             | ✗              | ✗              | ✔              | ✔              |

## 下载kube-prometheus 源码

- clone代码

```shell
git clone https://github.com/prometheus-operator/kube-prometheus.git
```

- 根据k8s集群版本切换到指定的分支

```shell
git checkout -b release-0.8 remotes/origin/release-0.8
```

## 创建命名空间和CRD

- 执行命令

```shell
kubectl create -f manifests/setup

```

- 结果输出

```shell
kubectl create -f manifests/setup
namespace/monitoring created
customresourcedefinition.apiextensions.k8s.io/alertmanagerconfigs.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/alertmanagers.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/podmonitors.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/probes.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/prometheuses.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/prometheusrules.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/servicemonitors.monitoring.coreos.com created
customresourcedefinition.apiextensions.k8s.io/thanosrulers.monitoring.coreos.com created
clusterrole.rbac.authorization.k8s.io/prometheus-operator created
clusterrolebinding.rbac.authorization.k8s.io/prometheus-operator created
deployment.apps/prometheus-operator created
service/prometheus-operator created
serviceaccount/prometheus-operator created
```

### 解读 setup4部分

- 01 创建命名空间 monitoring
- 02 创建鉴权相关
- 03 创建prometheus-operator的deployment
- 04 创建所需的CRD

### 02 创建授权信息和直接创建prometheus是一样的

- 创建clusterrole 和 clusterrolebinding并赋给serviceaccount
- clusterrole
- clusterrolebinding
- serviceaccount

#### 创建名为prometheus-operator 的serviceaccount

- manifests\setup\prometheus-operator-serviceAccount.yaml

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/name: prometheus-operator
    app.kubernetes.io/part-of: kube-prometheus
    app.kubernetes.io/version: 0.47.0
  name: prometheus-operator
  namespace: monitoring

```

#### k8s 获取 apigroups

- 执行命令  kubectl api-resources  -o wide
- 字段解读
  - NAME 名称
  - SHORTNAMES 简写
  - APIVERSION api版本
  - NAMESPACED 应用在namespace维度的
  - KIND 类型
  - VERBS 动作
- 输出显示

```shell
 kubectl api-resources  -o wide
NAME                              SHORTNAMES   APIVERSION                             NAMESPACED   KIND                             VERBS
bindings                                       v1                                     true         Binding                          [create]
componentstatuses                 cs           v1                                     false        ComponentStatus                  [get list]
configmaps                        cm           v1                                     true         ConfigMap                        [create delete deletecollection get list patch update watch]
endpoints                         ep           v1                                     true         Endpoints                        [create delete deletecollection get list patch update watch]
events                            ev           v1                                     true         Event                            [create delete deletecollection get list patch update watch]
limitranges                       limits       v1                                     true         LimitRange                       [create delete deletecollection get list patch update watch]
namespaces                        ns           v1                                     false        Namespace                        [create delete get list patch update watch]
nodes                             no           v1                                     false        Node                             [create delete deletecollection get list patch update watch]
persistentvolumeclaims            pvc          v1                                     true         PersistentVolumeClaim            [create delete deletecollection get list patch update watch]
persistentvolumes                 pv           v1                                     false        PersistentVolume                 [create delete deletecollection get list patch update watch]
pods                              po           v1                                     true         Pod                              [create delete deletecollection get list patch update watch]
podtemplates                                   v1                                     true         PodTemplate                      [create delete deletecollection get list patch update watch]
replicationcontrollers            rc           v1                                     true         ReplicationController            [create delete deletecollection get list patch update watch]
resourcequotas                    quota        v1                                     true         ResourceQuota                    [create delete deletecollection get list patch update watch]
secrets                                        v1                                     true         Secret                           [create delete deletecollection get list patch update watch]
serviceaccounts                   sa           v1                                     true         ServiceAccount                   [create delete deletecollection get list patch update watch]
services                          svc          v1                                     true         Service                          [create delete get list patch update watch]
mutatingwebhookconfigurations                  admissionregistration.k8s.io/v1        false        MutatingWebhookConfiguration     [create delete deletecollection get list patch update watch]
validatingwebhookconfigurations                admissionregistration.k8s.io/v1        false        ValidatingWebhookConfiguration   [create delete deletecollection get list patch update watch]
customresourcedefinitions         crd,crds     apiextensions.k8s.io/v1                false        CustomResourceDefinition         [create delete deletecollection get list patch update watch]
apiservices                                    apiregistration.k8s.io/v1              false        APIService                       [create delete deletecollection get list patch update watch]
controllerrevisions                            apps/v1                                true         ControllerRevision               [create delete deletecollection get list patch update watch]
daemonsets                        ds           apps/v1                                true         DaemonSet                        [create delete deletecollection get list patch update watch]
deployments                       deploy       apps/v1                                true         Deployment                       [create delete deletecollection get list patch update watch]
replicasets                       rs           apps/v1                                true         ReplicaSet                       [create delete deletecollection get list patch update watch]
statefulsets                      sts          apps/v1                                true         StatefulSet                      [create delete deletecollection get list patch update watch]
tokenreviews                                   authentication.k8s.io/v1               false        TokenReview                      [create]
localsubjectaccessreviews                      authorization.k8s.io/v1                true         LocalSubjectAccessReview         [create]
selfsubjectaccessreviews                       authorization.k8s.io/v1                false        SelfSubjectAccessReview          [create]
selfsubjectrulesreviews                        authorization.k8s.io/v1                false        SelfSubjectRulesReview           [create]
subjectaccessreviews                           authorization.k8s.io/v1                false        SubjectAccessReview              [create]
horizontalpodautoscalers          hpa          autoscaling/v1                         true         HorizontalPodAutoscaler          [create delete deletecollection get list patch update watch]
cronjobs                          cj           batch/v1beta1                          true         CronJob                          [create delete deletecollection get list patch update watch]
jobs                                           batch/v1                               true         Job                              [create delete deletecollection get list patch update watch]
certificatesigningrequests        csr          certificates.k8s.io/v1                 false        CertificateSigningRequest        [create delete deletecollection get list patch update watch]
leases                                         coordination.k8s.io/v1                 true         Lease                            [create delete deletecollection get list patch update watch]
bgpconfigurations                              crd.projectcalico.org/v1               false        BGPConfiguration                 [delete deletecollection get list patch create update watch]
bgppeers                                       crd.projectcalico.org/v1               false        BGPPeer                          [delete deletecollection get list patch create update watch]
blockaffinities                                crd.projectcalico.org/v1               false        BlockAffinity                    [delete deletecollection get list patch create update watch]
clusterinformations                            crd.projectcalico.org/v1               false        ClusterInformation               [delete deletecollection get list patch create update watch]
felixconfigurations                            crd.projectcalico.org/v1               false        FelixConfiguration               [delete deletecollection get list patch create update watch]
globalnetworkpolicies                          crd.projectcalico.org/v1               false        GlobalNetworkPolicy              [delete deletecollection get list patch create update watch]
globalnetworksets                              crd.projectcalico.org/v1               false        GlobalNetworkSet                 [delete deletecollection get list patch create update watch]
hostendpoints                                  crd.projectcalico.org/v1               false        HostEndpoint                     [delete deletecollection get list patch create update watch]
ipamblocks                                     crd.projectcalico.org/v1               false        IPAMBlock                        [delete deletecollection get list patch create update watch]
ipamconfigs                                    crd.projectcalico.org/v1               false        IPAMConfig                       [delete deletecollection get list patch create update watch]
ipamhandles                                    crd.projectcalico.org/v1               false        IPAMHandle                       [delete deletecollection get list patch create update watch]
ippools                                        crd.projectcalico.org/v1               false        IPPool                           [delete deletecollection get list patch create update watch]
kubecontrollersconfigurations                  crd.projectcalico.org/v1               false        KubeControllersConfiguration     [delete deletecollection get list patch create update watch]
networkpolicies                                crd.projectcalico.org/v1               true         NetworkPolicy                    [delete deletecollection get list patch create update watch]
networksets                                    crd.projectcalico.org/v1               true         NetworkSet                       [delete deletecollection get list patch create update watch]
endpointslices                                 discovery.k8s.io/v1beta1               true         EndpointSlice                    [create delete deletecollection get list patch update watch]
events                            ev           events.k8s.io/v1                       true         Event                            [create delete deletecollection get list patch update watch]
ingresses                         ing          extensions/v1beta1                     true         Ingress                          [create delete deletecollection get list patch update watch]
flowschemas                                    flowcontrol.apiserver.k8s.io/v1beta1   false        FlowSchema                       [create delete deletecollection get list patch update watch]
prioritylevelconfigurations                    flowcontrol.apiserver.k8s.io/v1beta1   false        PriorityLevelConfiguration       [create delete deletecollection get list patch update watch]
alertmanagerconfigs                            monitoring.coreos.com/v1alpha1         true         AlertmanagerConfig               [delete deletecollection get list patch create update watch]
alertmanagers                                  monitoring.coreos.com/v1               true         Alertmanager                     [delete deletecollection get list patch create update watch]
podmonitors                                    monitoring.coreos.com/v1               true         PodMonitor                       [delete deletecollection get list patch create update watch]
probes                                         monitoring.coreos.com/v1               true         Probe                            [delete deletecollection get list patch create update watch]
prometheuses                                   monitoring.coreos.com/v1               true         Prometheus                       [delete deletecollection get list patch create update watch]
prometheusrules                                monitoring.coreos.com/v1               true         PrometheusRule                   [delete deletecollection get list patch create update watch]
servicemonitors                                monitoring.coreos.com/v1               true         ServiceMonitor                   [delete deletecollection get list patch create update watch]
thanosrulers                                   monitoring.coreos.com/v1               true         ThanosRuler                      [delete deletecollection get list patch create update watch]
ingressclasses                                 networking.k8s.io/v1                   false        IngressClass                     [create delete deletecollection get list patch update watch]
ingresses                         ing          networking.k8s.io/v1                   true         Ingress                          [create delete deletecollection get list patch update watch]
networkpolicies                   netpol       networking.k8s.io/v1                   true         NetworkPolicy                    [create delete deletecollection get list patch update watch]
runtimeclasses                                 node.k8s.io/v1                         false        RuntimeClass                     [create delete deletecollection get list patch update watch]
installations                                  operator.tigera.io/v1                  false        Installation                     [delete deletecollection get list patch create update watch]
tigerastatuses                                 operator.tigera.io/v1                  false        TigeraStatus                     [delete deletecollection get list patch create update watch]
poddisruptionbudgets              pdb          policy/v1beta1                         true         PodDisruptionBudget              [create delete deletecollection get list patch update watch]
podsecuritypolicies               psp          policy/v1beta1                         false        PodSecurityPolicy                [create delete deletecollection get list patch update watch]
clusterrolebindings                            rbac.authorization.k8s.io/v1           false        ClusterRoleBinding               [create delete deletecollection get list patch update watch]
clusterroles                                   rbac.authorization.k8s.io/v1           false        ClusterRole                      [create delete deletecollection get list patch update watch]
rolebindings                                   rbac.authorization.k8s.io/v1           true         RoleBinding                      [create delete deletecollection get list patch update watch]
roles                                          rbac.authorization.k8s.io/v1           true         Role                             [create delete deletecollection get list patch update watch]
priorityclasses                   pc           scheduling.k8s.io/v1                   false        PriorityClass                    [create delete deletecollection get list patch update watch]
crontabs                          ct           stable.example.com/v1                  true         CronTab                          [delete deletecollection get list patch create update watch]
csidrivers                                     storage.k8s.io/v1                      false        CSIDriver                        [create delete deletecollection get list patch update watch]
csinodes                                       storage.k8s.io/v1                      false        CSINode                          [create delete deletecollection get list patch update watch]
storageclasses                    sc           storage.k8s.io/v1                      false        StorageClass                     [create delete deletecollection get list patch update watch]
volumeattachments                              storage.k8s.io/v1                      false        VolumeAttachment                 [create delete deletecollection get list patch update watch]
```

#### 创建名为prometheus-operator 的clusterrole

- manifests\setup\prometheus-operator-clusterRole.yaml
- apiGroups=monitoring.coreos.com 能够操作几乎所有的资源，verbs=*代表没限制

```yaml
- apiGroups:
  - monitoring.coreos.com
  resources:
  - alertmanagers
  - alertmanagers/finalizers
  - alertmanagerconfigs
  - prometheuses
  - prometheuses/finalizers
  - thanosrulers
  - thanosrulers/finalizers
  - servicemonitors
  - podmonitors
  - probes
  - prometheusrules
  verbs:
  - '*'
```

- apiGroups=apps 可以对statefulsets执行所有动作

```yaml
- apiGroups:
  - apps
  resources:
  - statefulsets
  verbs:
  - '*'
```

- apiGroups="" 代表对core即v1中的 configmaps和secrets执行所有动作

```yaml
- apiGroups:
  - ""
  resources:
  - configmaps
  - secrets
  verbs:
  - '*'
```

- 下面的就不一一解读了

#####

- 创建clusterrole 和 clusterrolebinding
- 创建serviceaccount
- 创建

#### 创建名为prometheus-operator 的ClusterRoleBinding

- 并且将prometheus-operator的ClusterRole绑定给ServiceAccount prometheus-operator
- 位置 manifests\setup\prometheus-operator-clusterRoleBinding.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/name: prometheus-operator
    app.kubernetes.io/part-of: kube-prometheus
    app.kubernetes.io/version: 0.47.0
  name: prometheus-operator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus-operator
subjects:
- kind: ServiceAccount
  name: prometheus-operator
  namespace: monitoring

```

### 03 创建prometheus-operator的deployment

#### 创建prometheus-operator的service

- 位置 manifests\setup\prometheus-operator-service.yaml
- 指定后端的pod名称为prometheus-operator
- pod端口为443,
- service的端口为8443

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/name: prometheus-operator
    app.kubernetes.io/part-of: kube-prometheus
    app.kubernetes.io/version: 0.47.0
  name: prometheus-operator
  namespace: monitoring
spec:
  clusterIP: None
  ports:
  - name: https
    port: 8443
    targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/name: prometheus-operator
    app.kubernetes.io/part-of: kube-prometheus
```

#### 创建prometheus-operator的deployment 部署两个容器

- 位置 manifests\setup\prometheus-operator-deployment.yaml

> 容器01 prometheus-operator

```yaml
      - args:
        - --kubelet-service=kube-system/kubelet
        - --prometheus-config-reloader=quay.io/prometheus-operator/prometheus-config-reloader:v0.47.0
        image: quay.io/prometheus-operator/prometheus-operator:v0.47.0
        name: prometheus-operator
        ports:
        - containerPort: 8080
          name: http
        resources:
          limits:
            cpu: 200m
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 100Mi
        securityContext:
          allowPrivilegeEscalation: false
```

> 容器02 kube-rbac-proxy

- 项目地址 https://github.com/brancz/kube-rbac-proxy
- 目的是为了http请求级别的鉴权而不是pod级别

```yaml
      - args:
        - --logtostderr
        - --secure-listen-address=:8443
        - --tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305
        - --upstream=http://127.0.0.1:8080/
        image: quay.io/brancz/kube-rbac-proxy:v0.8.0
        name: kube-rbac-proxy
        ports:
        - containerPort: 8443
          name: https
        resources:
          limits:
            cpu: 20m
            memory: 40Mi
          requests:
            cpu: 10m
            memory: 20Mi
        securityContext:
          runAsGroup: 65532
          runAsNonRoot: true
          runAsUser: 65532
```

#### 04 创建所需的CRD

- 位置 manifests\setup\prometheus-operator-xxxxCustomResourceDefinition.yaml

## 创建资源

- 执行命令

```shell
kubectl create -f manifests/

```

- 结果输出

```shell
kubectl create -f manifests/
alertmanager.monitoring.coreos.com/main created
poddisruptionbudget.policy/alertmanager-main created
prometheusrule.monitoring.coreos.com/alertmanager-main-rules created
secret/alertmanager-main created
service/alertmanager-main created
serviceaccount/alertmanager-main created
servicemonitor.monitoring.coreos.com/alertmanager created
clusterrole.rbac.authorization.k8s.io/blackbox-exporter created
clusterrolebinding.rbac.authorization.k8s.io/blackbox-exporter created
configmap/blackbox-exporter-configuration created
deployment.apps/blackbox-exporter created
service/blackbox-exporter created
serviceaccount/blackbox-exporter created
servicemonitor.monitoring.coreos.com/blackbox-exporter created
secret/grafana-datasources created
configmap/grafana-dashboard-apiserver created
configmap/grafana-dashboard-cluster-total created
configmap/grafana-dashboard-controller-manager created
configmap/grafana-dashboard-k8s-resources-cluster created
configmap/grafana-dashboard-k8s-resources-namespace created
configmap/grafana-dashboard-k8s-resources-node created
configmap/grafana-dashboard-k8s-resources-pod created
configmap/grafana-dashboard-k8s-resources-workload created
configmap/grafana-dashboard-k8s-resources-workloads-namespace created
configmap/grafana-dashboard-kubelet created
configmap/grafana-dashboard-namespace-by-pod created
configmap/grafana-dashboard-namespace-by-workload created
configmap/grafana-dashboard-node-cluster-rsrc-use created
configmap/grafana-dashboard-node-rsrc-use created
configmap/grafana-dashboard-nodes created
configmap/grafana-dashboard-persistentvolumesusage created
configmap/grafana-dashboard-pod-total created
configmap/grafana-dashboard-prometheus-remote-write created
configmap/grafana-dashboard-prometheus created
configmap/grafana-dashboard-proxy created
configmap/grafana-dashboard-scheduler created
configmap/grafana-dashboard-statefulset created
configmap/grafana-dashboard-workload-total created
configmap/grafana-dashboards created
deployment.apps/grafana created
service/grafana created
serviceaccount/grafana created
servicemonitor.monitoring.coreos.com/grafana created
prometheusrule.monitoring.coreos.com/kube-prometheus-rules created
clusterrole.rbac.authorization.k8s.io/kube-state-metrics created
clusterrolebinding.rbac.authorization.k8s.io/kube-state-metrics created
deployment.apps/kube-state-metrics created
prometheusrule.monitoring.coreos.com/kube-state-metrics-rules created
service/kube-state-metrics created
serviceaccount/kube-state-metrics created
servicemonitor.monitoring.coreos.com/kube-state-metrics created
prometheusrule.monitoring.coreos.com/kubernetes-monitoring-rules created
servicemonitor.monitoring.coreos.com/kube-apiserver created
servicemonitor.monitoring.coreos.com/coredns created
servicemonitor.monitoring.coreos.com/kube-controller-manager created
servicemonitor.monitoring.coreos.com/kube-scheduler created
servicemonitor.monitoring.coreos.com/kubelet created
clusterrole.rbac.authorization.k8s.io/node-exporter created
clusterrolebinding.rbac.authorization.k8s.io/node-exporter created
daemonset.apps/node-exporter created
prometheusrule.monitoring.coreos.com/node-exporter-rules created
service/node-exporter created
serviceaccount/node-exporter created
servicemonitor.monitoring.coreos.com/node-exporter created
apiservice.apiregistration.k8s.io/v1beta1.metrics.k8s.io created
clusterrole.rbac.authorization.k8s.io/prometheus-adapter created
clusterrole.rbac.authorization.k8s.io/system:aggregated-metrics-reader created
clusterrolebinding.rbac.authorization.k8s.io/prometheus-adapter created
clusterrolebinding.rbac.authorization.k8s.io/resource-metrics:system:auth-delegator created
clusterrole.rbac.authorization.k8s.io/resource-metrics-server-resources created
configmap/adapter-config created
deployment.apps/prometheus-adapter created
poddisruptionbudget.policy/prometheus-adapter created
rolebinding.rbac.authorization.k8s.io/resource-metrics-auth-reader created
service/prometheus-adapter created
serviceaccount/prometheus-adapter created
servicemonitor.monitoring.coreos.com/prometheus-adapter created
clusterrole.rbac.authorization.k8s.io/prometheus-k8s created
clusterrolebinding.rbac.authorization.k8s.io/prometheus-k8s created
prometheusrule.monitoring.coreos.com/prometheus-operator-rules created
servicemonitor.monitoring.coreos.com/prometheus-operator created
poddisruptionbudget.policy/prometheus-k8s created
prometheus.monitoring.coreos.com/k8s created
prometheusrule.monitoring.coreos.com/prometheus-k8s-prometheus-rules created
rolebinding.rbac.authorization.k8s.io/prometheus-k8s-config created
rolebinding.rbac.authorization.k8s.io/prometheus-k8s created
rolebinding.rbac.authorization.k8s.io/prometheus-k8s created
rolebinding.rbac.authorization.k8s.io/prometheus-k8s created
role.rbac.authorization.k8s.io/prometheus-k8s-config created
role.rbac.authorization.k8s.io/prometheus-k8s created
role.rbac.authorization.k8s.io/prometheus-k8s created
role.rbac.authorization.k8s.io/prometheus-k8s created
service/prometheus-k8s created
serviceaccount/prometheus-k8s created
servicemonitor.monitoring.coreos.com/prometheus-k8s created
```

# 海外镜像替换国内的方法 k8s.gcr.io拉取不到

- 在阿里的个人账号上做容器镜像服务  地址https://cr.console.aliyun.com/cn-beijing/instance/repositories
- 在你自己的GitHub上fork你想要拉去镜像的仓库 ，比如ksm
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/78b5ed813d9343b0b128d77960ee3e25.png)
- 到阿里云的容器镜像创建仓库，选公开
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/c68653b1bdf449eb8c3e77f13598bd97.png)
- 绑定GitHub仓库
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/1d63a835fcdb430196bccae14a266b92.png)
- 添加构建规则
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/e8ba1f23f23c432ca104594ec7375dbc.png)
- 根据tag添加规则
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/e73a437eb14045ebb2ef4c4a94751a97.png)
- 点击立即构建
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/d84d3ddcd6a941568392a6b289dfa66a.png)
- 等待构建结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/8624c81385e9417a8777e473082a3f80.png)
- prometheus-adapter 构建失败
- ```
  --------------------
  361 | ARG GO_VERSION
  372 |
  383 | >>> FROM golang:${GO_VERSION} as build
  394 |
  405 | WORKDIR /go/src/sigs.k8s.io/prometheus-adapter
  41--------------------
  42error: failed to solve: rpc error: code = Unknown desc = failed to solve with frontend dockerfile.v0: failed to create LLB definition: failed to parse stage name "golang:": invalid reference format
  43Build artifact registry.cn-beijing.aliyuncs.com/ning1875_k8s_image/prometheus-adapter:v0.9.0 fail: "exit status 1"
  44[build failed, takes 0s.]
  45==============================
  ```
- prometheus-adapter官方的dockerfile的问题
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/8d01472aa51644d58b737ecc1c04436f.png)
- 你自己GitHub仓库 fork那个 要制定
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/3d07c863188e4120a92957457aa3f0c0.png)
- 阿里云构建的时候关闭缓存
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/c0444a82da904c9fbf2d4dc12a07d77c.png)
- 最终构建成功了
- 修改manifest中的yaml，仓库改为阿里云的
  - F:\go_path\src\github.com\prometheus-operator\kube-prometheus\manifests\prometheus-adapter-deployment.yaml 中 改为

    ```
    registry.cn-beijing.aliyuncs.com/ning1875_k8s_image/ksm:v2.2.0
    ```

    ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/3fa29947912541cd80d02d8971650527.png)
  - F:\go_path\src\github.com\prometheus-operator\kube-prometheus\manifests\kube-state-metrics-deployment.yaml 中改为

    ```
    registry.cn-beijing.aliyuncs.com/ning1875_k8s_image/ksm:v2.2.0
    ```
- 使用ctr拉取镜像
- ```
  ctr --namespace k8s.io images pull  registry.cn-beijing.aliyuncs.com/ning1875_k8s_image/ksm:v2.2.0
  [root@prome-node01 ~]# ctr --namespace k8s.io images pull  registry.cn-beijing.aliyuncs.com/ning1875_k8s_image/prometheus-adapter::v0.9.0
  ctr: failed to resolve reference "registry.cn-beijing.aliyuncs.com/ning1875_k8s_image/prometheus-adapter::v0.9.0": registry.cn-beijing.aliyuncs.com/ning1875_k8s_image/prometheus-adapter::v0.9.0: not found
  [root@prome-node01 ~]# ctr --namespace k8s.io images pull  registry.cn-beijing.aliyuncs.com/ning1875_k8s_image/ksm:v2.2.0
  registry.cn-beijing.aliyuncs.com/ning1875_k8s_image/ksm:v2.2.0:                   resolved       |++++++++++++++++++++++++++++++++++++++| 
  manifest-sha256:aab96b9ef13781733e14dcab949c4a7ed82f77a9699ca5cb4e37f3aeb67d229c: done           |++++++++++++++++++++++++++++++++++++++| 
  layer-sha256:dd130a3176d3a361de083c4424439686a50f075e12f28498543fb436c65ec519:    done           |++++++++++++++++++++++++++++++++++++++| 
  config-sha256:65944f1754b76f64e76e37b053c77a583236abdf6db039950225fd40f80c7dc0:   done           |++++++++++++++++++++++++++++++++++++++| 
  layer-sha256:b49b96595fd4bd6de7cb7253fe5e89d242d0eb4f993b2b8280c0581c3a62ddc2:    done           |++++++++++++++++++++++++++++++++++++++| 
  elapsed: 0.4 s                                                                    total:   0.0 B (0.0 B/s)   
  unpacking linux/amd64 sha256:aab96b9ef13781733e14dcab949c4a7ed82f77a9699ca5cb4e37f3aeb67d229c...
  done

  ctr --namespace k8s.io images pull  registry.cn-beijing.aliyuncs.com/ning1875_haiwai_image/kube-state-metrics:v2.2.0

  ```

## 检查最终部署情况

- 部署了3个alertmanager
- 部署了1个blackbox-exporter
- 部署了1个grafana
- 部署了1个kube-state-metrics
- 部署了2个node_exporter(节点数量)
- 部署了1个kube-state-metrics
- 部署了2个prometheus-adapter
- 部署了2个prometheus-k8s

```shell
[root@k8s-master01 kube-prometheus]# kubectl -n monitoring get pod 

NAME                                   READY   STATUS    RESTARTS   AGE
alertmanager-main-0                    2/2     Running   0          83s
alertmanager-main-1                    2/2     Running   0          83s
alertmanager-main-2                    2/2     Running   0          83s
blackbox-exporter-55c457d5fb-rzn7l     3/3     Running   0          82s
grafana-9df57cdc4-tf6qj                1/1     Running   0          82s
kube-state-metrics-76f6cb7996-27dc2    3/3     Running   0          81s
node-exporter-7rqfg                    2/2     Running   0          81s
node-exporter-b5pnx                    2/2     Running   0          81s
prometheus-adapter-59df95d9f5-28n4c    1/1     Running   0          81s
prometheus-adapter-59df95d9f5-glwk7    1/1     Running   0          81s
prometheus-k8s-0                       2/2     Running   1          81s
prometheus-k8s-1                       2/2     Running   1          81s
prometheus-operator-7775c66ccf-hkmpr   2/2     Running   0          44m
[root@k8s-master01 kube-prometheus]# 
```

## 删除的命令

```shell
kubectl delete --ignore-not-found=true -f manifests/ -f manifests/setup\
```

# 访问部署成果

## prometheus-k8s 的svc改为NodePort型

- kubectl edit  svc -n monitoring prometheus-k8s
  - type: NodePort
  - nodePort: 6090
- yaml实例

```shell

spec:
  clusterIP: 10.96.200.87
  clusterIPs:
  - 10.96.200.87
  externalTrafficPolicy: Cluster
  ports:
  - name: web
    nodePort: 6090
    port: 9090
    protocol: TCP
    targetPort: web
  selector:
    app: prometheus
    app.kubernetes.io/component: prometheus
    app.kubernetes.io/name: prometheus
    app.kubernetes.io/part-of: kube-prometheus
    prometheus: k8s
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
  type: NodePort
status:
  loadBalancer: {}
```

### 浏览器访问node 的6090端口

- 截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/495a628e51444b88a3993d77469e96d6.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/14bb09ab504c42a8ba19fa5a8059f8b8.png)

### 采集项目

```shell
serviceMonitor/monitoring/alertmanager/0 (3/3 up)
serviceMonitor/monitoring/blackbox-exporter/0 (1/1 up)
serviceMonitor/monitoring/grafana/0 (1/1 up)
serviceMonitor/monitoring/kube-apiserver/0 (1/1 up)
serviceMonitor/monitoring/kube-state-metrics/0 (1/1 up)
serviceMonitor/monitoring/kube-state-metrics/1 (1/1 up)
serviceMonitor/monitoring/kubelet/0 (2/2 up)
serviceMonitor/monitoring/kubelet/1 (2/2 up)
serviceMonitor/monitoring/kubelet/2 (2/2 up)
serviceMonitor/monitoring/node-exporter/0 (2/2 up)
serviceMonitor/monitoring/prometheus-adapter/0 (2/2 up)
serviceMonitor/monitoring/prometheus-k8s/0 (2/2 up)
serviceMonitor/monitoring/prometheus-operator/0 (1/1 up)
```

## grafana 的svc改为nodePort型

- kubectl edit  svc -n monitoring grafana
  - type: NodePort
  - nodePort: 3003
- yaml实例

```yaml
spec:
  clusterIP: 10.96.171.57
  clusterIPs:
  - 10.96.171.57
  externalTrafficPolicy: Cluster
  ports:
  - name: http
    nodePort: 3003
    port: 3000
    protocol: TCP
    targetPort: http
  selector:
    app.kubernetes.io/component: grafana
    app.kubernetes.io/name: grafana
    app.kubernetes.io/part-of: kube-prometheus
  sessionAffinity: None
  type: NodePort
```

### 浏览器访问节点 的3003端口

- 内置的dashboard查看，截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/db89ef25da0d4f86b52868501c8d5956.png)
- apiserver的大盘
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/072194d909864b16be4594da689f559d.png)
- k8s-cluster
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/3cc375565fb84036874885e63bc67099.png)
- node-截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407698000/9c1ced9b85174b6eaa4d0af28bab8bfd.png)

# 总结一下

- 安装部署，其实是很方便的，我们的网络环境
  - 如何利用阿里云构建国外的镜像
- svc改为nodeport检查页面
- grafana非常炫酷的大盘图

## 36.2 内置的k8s采集任务分析

# 本节重点总结 :

- prometheus 采集分析

# prometheus 采集分析

## serviceMonitor/monitoring/kube-state-metrics/0 代表采集ksm 资源指标

- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/040f5a69cb19465ab8bb3b34bc086ad0.png)
- 带上target显示的标签过来 查询 {​job="kube-state-metrics",container="kube-rbac-proxy-main"}
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/325a69b7f177442b94586df524230ab9.png)
- 全量yaml如下

```yaml
- job_name: serviceMonitor/monitoring/kube-state-metrics/0
  honor_labels: true
  honor_timestamps: true
  scrape_interval: 30s
  scrape_timeout: 30s
  metrics_path: /metrics
  scheme: https
  authorization:
    type: Bearer
    credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  tls_config:
    insecure_skip_verify: true
  follow_redirects: true
  relabel_configs:
  - source_labels: [job]
    separator: ;
    regex: (.*)
    target_label: __tmp_prometheus_job_name
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_component]
    separator: ;
    regex: exporter
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
    separator: ;
    regex: kube-state-metrics
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_part_of]
    separator: ;
    regex: kube-prometheus
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https-main
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_endpoint_address_target_kind, __meta_kubernetes_endpoint_address_target_name]
    separator: ;
    regex: Node;(.*)
    target_label: node
    replacement: ${1}
    action: replace
  - source_labels: [__meta_kubernetes_endpoint_address_target_kind, __meta_kubernetes_endpoint_address_target_name]
    separator: ;
    regex: Pod;(.*)
    target_label: pod
    replacement: ${1}
    action: replace
  - source_labels: [__meta_kubernetes_namespace]
    separator: ;
    regex: (.*)
    target_label: namespace
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_service_name]
    separator: ;
    regex: (.*)
    target_label: service
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_pod_name]
    separator: ;
    regex: (.*)
    target_label: pod
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_pod_container_name]
    separator: ;
    regex: (.*)
    target_label: container
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_service_name]
    separator: ;
    regex: (.*)
    target_label: job
    replacement: ${1}
    action: replace
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
    separator: ;
    regex: (.+)
    target_label: job
    replacement: ${1}
    action: replace
  - separator: ;
    regex: (.*)
    target_label: endpoint
    replacement: https-main
    action: replace
  - separator: ;
    regex: (pod|service|endpoint|namespace)
    replacement: $1
    action: labeldrop
  - source_labels: [__address__]
    separator: ;
    regex: (.*)
    modulus: 1
    target_label: __tmp_hash
    replacement: $1
    action: hashmod
  - source_labels: [__tmp_hash]
    separator: ;
    regex: "0"
    replacement: $1
    action: keep
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - monitoring
```

### 首先采用的k8s的endpoint的sd

- 指定namespace为 monitoring

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - monitoring
```

### monitoring下的endpoint查看

```
[root@prome-master01 kube-prometheus]# kubectl get endpoints -n monitoring
NAME                    ENDPOINTS                                                           AGE
alertmanager-main       10.100.71.17:9093,10.100.71.50:9093,10.100.71.60:9093               20m
alertmanager-operated   10.100.71.17:9094,10.100.71.50:9094,10.100.71.60:9094 + 6 more...   20m
blackbox-exporter       10.100.71.48:9115,10.100.71.48:19115                                20m
grafana                 10.100.71.51:3000                                                   20m
kube-state-metrics      10.100.71.52:8443,10.100.71.52:9443                                 20m
node-exporter           192.168.3.200:9100,192.168.3.201:9100                               20m
prometheus-adapter      10.100.71.53:6443,10.100.71.54:6443                                 20m
prometheus-k8s          10.100.71.18:9090,10.100.71.58:9090                                 20m
prometheus-operated     10.100.71.18:9090,10.100.71.58:9090                                 20m
prometheus-operator     10.100.71.42:8443                                                   137m

```

### 下面这4个relabel代表过滤 kube-state-metrics的endpoint

- yaml如下

```yaml
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_component]
    separator: ;
    regex: exporter
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
    separator: ;
    regex: kube-state-metrics
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_part_of]
    separator: ;
    regex: kube-prometheus
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https-main
    replacement: $1
    action: keep
```

- kubectl describe endpoints kube-state-metrics  -n monitoring
- 这里的几个label和上面的relabel刚好匹配中，意思就是过滤  monitoring namespace下的kube-state-metrics的endpoint
- 同时这个job只采集 portname=https-main 也就是8443端口的指标

```shell
kubectl describe endpoints kube-state-metrics  -n monitoring 
Name:         kube-state-metrics
Namespace:    monitoring
Labels:       app.kubernetes.io/component=exporter
              app.kubernetes.io/name=kube-state-metrics
              app.kubernetes.io/part-of=kube-prometheus
              app.kubernetes.io/version=2.0.0
              service.kubernetes.io/headless=
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2021-09-06T04:36:42Z
Subsets:
  Addresses:          10.100.85.238
  NotReadyAddresses:  <none>
  Ports:
    Name        Port  Protocol
    ----        ----  --------
    https-main  8443  TCP
    https-self  9443  TCP

```

#### kube-stats-metrics 8443端口是 ksm主服务的端口

- yaml地址 manifests\kube-state-metrics-deployment.yaml
- ksm服务listen 127.0.0.1 8081端口

```yaml
      containers:
      - args:
        - --host=127.0.0.1
        - --port=8081
        - --telemetry-host=127.0.0.1
        - --telemetry-port=8082
        image: k8s.gcr.io/kube-state-metrics/kube-state-metrics:v2.0.0
        name: kube-state-metrics
        resources:
          limits:
            cpu: 100m
            memory: 250Mi
          requests:
            cpu: 10m
            memory: 190Mi
        securityContext:
          runAsUser: 65534
```

- kube-rbac-proxy 代理服务监听8443端口，代理来自127.0.0.1:8081的请求

```yaml
      - args:
        - --logtostderr
        - --secure-listen-address=:8443
        - --tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305
        - --upstream=http://127.0.0.1:8081/
        image: quay.io/brancz/kube-rbac-proxy:v0.8.0
        name: kube-rbac-proxy-main
        ports:
        - containerPort: 8443
          name: https-main
        resources:
          limits:
            cpu: 40m
            memory: 40Mi
          requests:
            cpu: 20m
            memory: 20Mi
        securityContext:
          runAsGroup: 65532
          runAsNonRoot: true
          runAsUser: 65532
```

- kube-rbac-proxy 的作用就是将之前ksm暴露的指标 保护起来
- 因为在攻击者可能获得对 Pod 的完全控制的场景中，该攻击者将能够发现有关工作负载以及相应工作负载的当前负载的大量信息。
- 所以加了一层代理，只能通过代理来访问具体的指标。这样只有部署了kube-rbac-proxy sidecar的容器才能访问

### 同时去掉 pod|service|endpoint|namespace 标签

- 最终的sd结果标签中只保留三个
  - container
  - instance
  - job
- yaml配置如下

```yaml
  - separator: ;
    regex: (pod|service|endpoint|namespace)
    replacement: $1
    action: labeldrop
```

### 同时做了hashmod ，猜测为了扩容准备的

```yaml
  - source_labels: [__address__]
    separator: ;
    regex: (.*)
    modulus: 1
    target_label: __tmp_hash
    replacement: $1
    action: hashmod
  - source_labels: [__tmp_hash]
    separator: ;
    regex: "0"
    replacement: $1
    action: keep
```

## 修改ksm的副本数

- vim manifests/kube-state-metrics-deployment.yaml
- replicas由1改为2
- 可以在target页面看到ksm相关的两个job endpoint数量改为2了
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/64890e5f574f4f96a8e4167975cb9dce.png)
- 查询数据可以看到采集已经有两个了，通过instance标签区分
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/944f6ba5ce5f42158321f3ba94a84d93.png)

## serviceMonitor/monitoring/kube-state-metrics/1 代表ksm自身的指标

- 指标查询

```shell
{endpoint="https-self", job="kube-state-metrics", namespace="monitoring"}
```

- 所有的配置和0一致
- 只是port_name由 https-main改为了https-self，即9443端口

```yaml
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https-self
    replacement: $1
    action: keep
```

### 对应ksm容器端口 8082

- 位置 manifests\kube-state-metrics-deployment.yaml
- ksm的 telemetry-port=8082代表将自身指标暴露在 8082端口上
- target页面![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/db024813b00b4be9850b7bf4fda03f75.png)
- 查询 {​job="kube-state-metrics",container="kube-rbac-proxy-self"}
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/bb15d3b479294e95979548b67897bdbb.png)

```yaml
      containers:
      - args:
        - --host=127.0.0.1
        - --port=8081
        - --telemetry-host=127.0.0.1
        - --telemetry-port=8082
        image: k8s.gcr.io/kube-state-metrics/kube-state-metrics:v2.0.0
        name: kube-state-metrics
        resources:
          limits:
            cpu: 100m
            memory: 250Mi
          requests:
            cpu: 10m
            memory: 190Mi
        securityContext:
          runAsUser: 65534
```

- kube-rbac-proxy 9443代理8082端口流量

```yaml
      - args:
        - --logtostderr
        - --secure-listen-address=:9443
        - --tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305
        - --upstream=http://127.0.0.1:8082/
        image: quay.io/brancz/kube-rbac-proxy:v0.8.0
        name: kube-rbac-proxy-self
        ports:
        - containerPort: 9443
          name: https-self
        resources:
          limits:
            cpu: 20m
            memory: 40Mi
          requests:
            cpu: 10m
            memory: 20Mi
        securityContext:
          runAsGroup: 65532
          runAsNonRoot: true
          runAsUser: 65532
```

## serviceMonitor/monitoring/node-exporter/0

- 使用endpoints的k8s_sd ,namespace为 monitoring

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - monitoring
```

- 过滤 node-exporter endpoints

```yaml
  - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
    separator: ;
    regex: node-exporter
    replacement: $1
    action: keep
```

- kubectl describe endpoints node-exporter   -n monitoring

```shell
[root@k8s-master01 kube-prometheus]# kubectl describe endpoints node-exporter   -n monitoring              
Name:         node-exporter
Namespace:    monitoring
Labels:       app.kubernetes.io/component=exporter
              app.kubernetes.io/name=node-exporter
              app.kubernetes.io/part-of=kube-prometheus
              app.kubernetes.io/version=1.1.2
              service.kubernetes.io/headless=
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2021-09-06T04:36:40Z
Subsets:
  Addresses:          172.20.70.205,172.20.70.215
  NotReadyAddresses:  <none>
  Ports:
    Name   Port  Protocol
    ----   ----  --------
    https  9100  TCP

Events:  <none>
```

- 直接访问https的node-exporter报错
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407729000/1ec5340f997c49bab740229448b57c9a.png)
- 可以通过127.0.0.1:9100访问 http的
- ```
  [root@prome-master01 kube-prometheus]# curl localhost:9100
  <html>
  			<head><title>Node Exporter</title></head>
  			<body>
  			<h1>Node Exporter</h1>
  			<p><a href="/metrics">Metrics</a></p>
  			</body>
  			</html>[root@prome-master01 
  ```

```shell

```

### kube-rbac-proxy 通过9100代理node-exporter

- manifests\node-exporter-daemonset.yaml
- node-exporter改为listen 127.0.0.1:9100，只能在node上访问自己
- 外面想要访问必须要通过 kube-rbac-proxy
- yaml配置

```yaml
      - args:
        - --web.listen-address=127.0.0.1:9100
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        - --no-collector.wifi
        - --no-collector.hwmon
        - --collector.filesystem.ignored-mount-points=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/pods/.+)($|/)
        - --collector.netclass.ignored-devices=^(veth.*|[a-f0-9]{15})$
        - --collector.netdev.device-exclude=^(veth.*|[a-f0-9]{15})$
        image: quay.io/prometheus/node-exporter:v1.1.2
        name: node-exporter
        resources:
          limits:
            cpu: 250m
            memory: 180Mi
          requests:
            cpu: 102m
            memory: 180Mi
        volumeMounts:
        - mountPath: /host/sys
          mountPropagation: HostToContainer
          name: sys
          readOnly: true
        - mountPath: /host/root
          mountPropagation: HostToContainer
          name: root
          readOnly: true
      - args:
        - --logtostderr
        - --secure-listen-address=[$(IP)]:9100
        - --tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305
        - --upstream=http://127.0.0.1:9100/
        env:
        - name: IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        image: quay.io/brancz/kube-rbac-proxy:v0.8.0
        name: kube-rbac-proxy
        ports:
        - containerPort: 9100
          hostPort: 9100
          name: https
        resources:
          limits:
            cpu: 20m
            memory: 40Mi
          requests:
            cpu: 10m
            memory: 20Mi
        securityContext:
          runAsGroup: 65532
          runAsNonRoot: true
          runAsUser: 65532
      hostNetwork: true
      hostPID: true
      nodeSelector:
        kubernetes.io/os: linux
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
      serviceAccountName: node-exporter
      tolerations:
      - operator: Exists
      volumes:
      - hostPath:
          path: /sys
        name: sys
      - hostPath:
          path: /
        name: root
```

## serviceMonitor/monitoring/kube-apiserver/0

- 使用endpoints的k8s_sd ,namespace为 default
- 原因是集群默认在default ns中创建 kubernetes 的 svc 和endpoints
- ```shell
  [root@prome-master01 kube-prometheus]# kubectl get endpoints
  NAME                ENDPOINTS            AGE
  grafana-node-port   10.100.71.41:3000    20d
  kubernetes          192.168.3.200:6443   20d
  [root@prome-master01 kube-prometheus]# kubectl get svc
  NAME                TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE
  grafana-node-port   NodePort    10.96.132.2   <none>        80:30000/TCP   20d
  kubernetes          ClusterIP   10.96.0.1     <none>        443/TCP        20d

  ```

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - default
```

### 过滤endpoint

```yaml
  - source_labels: [__meta_kubernetes_service_label_component]
    separator: ;
    regex: apiserver
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_service_label_provider]
    separator: ;
    regex: kubernetes
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https
    replacement: $1
    action: keep
```

### 同时使用 metric_relabel_configs drop掉了大量的无用指标

```yaml
 metric_relabel_configs:
    regex: apiserver_admission_controller_admission_latencies_seconds_.*
    replacement: $1
    action: drop
  - source_labels: [__name__]
    separator: ;
    regex: apiserver_admission_step_admission_latencies_seconds_.*
    replacement: $1
    action: drop
  - source_labels: [__name__, le]
    separator: ;
    regex: apiserver_request_duration_seconds_bucket;(0.15|0.25|0.3|0.35|0.4|0.45|0.6|0.7|0.8|0.9|1.25|1.5|1.75|2.5|3|3.5|4.5|6|7|8|9|15|25|30|50)
    replacement: $1
    action: drop

```

## 从 kubelet上采集 serviceMonitor/monitoring/kubelet

### 通用的配置

- kube-system命名空间下的endpoints

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - kube-system
```

- 过滤kubelet endpoints
- kubectl describe endpoints kubelet -n kube-system

```shell
[root@k8s-master01 kube-prometheus]# kubectl describe endpoints kubelet -n kube-system
Name:         kubelet
Namespace:    kube-system
Labels:       app.kubernetes.io/managed-by=prometheus-operator
              app.kubernetes.io/name=kubelet
              k8s-app=kubelet
Annotations:  <none>
Subsets:
  Addresses:          172.20.70.205,172.20.70.215
  NotReadyAddresses:  <none>
  Ports:
    Name           Port   Protocol
    ----           ----   --------
    https-metrics  10250  TCP
    http-metrics   10255  TCP
    cadvisor       4194   TCP

Events:  <none>
```

- 过滤port_name为https-metrics也就是 10250端口

```yaml
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: https-metrics
    replacement: $1
    action: keep
```

### serviceMonitor/monitoring/kubelet/0 代表采集kubelet自身指标

- 对应的为 https://172.20.70.205:10250/metrics

```yaml
metrics_path: /metrics
```

### serviceMonitor/monitoring/kubelet/1 代表采集kubelet内置的cadvisor指标也就是容器指标

- 对应的为 https://172.20.70.205:10250/metrics/cadvisor

```yaml
 metrics_path: /metrics/cadvisor
```

### serviceMonitor/monitoring/kubelet/2 代表采集kubelet对容器的Liveness Readiness探测的结果

- 对应的为 https://172.20.70.205:10250/metrics/probes

```yaml
metrics_path: /metrics/probes
```

- 容器探活的 Liveness Readiness 指标

```shell

prober_probe_total{container="prometheus", endpoint="https-metrics", instance="172.20.70.215:10250", job="kubelet", metrics_path="/metrics/probes", namespace="kube-system", node="k8s-node01", pod="prometheus-0", pod_uid="e27c9fe7-9d82-4228-86fb-b9c920611c15", probe_type="Liveness", result="successful", service="kubelet"}
148299
prober_probe_total{container="prometheus", endpoint="https-metrics", instance="172.20.70.215:10250", job="kubelet", metrics_path="/metrics/probes", namespace="kube-system", node="k8s-node01", pod="prometheus-0", pod_uid="e27c9fe7-9d82-4228-86fb-b9c920611c15", probe_type="Readiness", result="successful", service="kubelet"}
148300
prober_probe_total{container="prometheus", endpoint="https-metrics", instance="172.20.70.215:10250", job="kubelet", metrics_path="/metrics/probes", namespace="monitoring", node="k8s-node01", pod="prometheus-k8s-0", pod_uid="8898c8f2-1ea7-412f-8a25-ce98a8ca47c2", probe_type="Readiness", result="successful", service="kubelet"}
3084
prober_probe_total{container="prometheus", endpoint="https-metrics", instance="172.20.70.215:10250", job="kubelet", metrics_path="/metrics/probes", namespace="monitoring", node="k8s-node01", pod="prometheus-k8s-1", pod_uid="937e07bc-5cea-4e3d-83ac-a2e68e072340", probe_type="Readiness", result="successful", service="kubelet"}
3083

```

## serviceMonitor/monitoring/prometheus-operator/0 代表prometheus-operator的指标

- 过滤monitoring的  prometheus-operator

```yaml
  kubernetes_sd_configs:
  - role: endpoints
    follow_redirects: true
    namespaces:
      names:
      - monitoring
```

### prometheus-operator的作用

![image](https://bxdc-static.oss-cn-beijing.aliyuncs.com/images/20200407180510.png)

- 根据配置查询prometheus中的指标，作为用户自定义HPA的依据
- kube-aggregator 允许开发人员编写一个自己的服务，把这个服务注册到 Kubernetes 的 APIServer 里面去，这样我们就可以像原生的 APIServer 提供的 API 使用自己的 API 了，我们把自己的服务运行在 Kubernetes 集群里面，然后 Kubernetes 的 Aggregator 通过 Service 名称就可以转发到我们自己写的 Service 里面去了。这样这个聚合层就带来了很多好处：

  - 增加了 API 的扩展性，开发人员可以编写自己的 API 服务来暴露他们想要的 API。
  - 丰富了 API，核心 kubernetes 团队阻止了很多新的 API 提案，通过允许开发人员将他们的 API 作为单独的服务公开，这样就无须社区繁杂的审查了。
  - 开发分阶段实验性 API，新的 API 可以在单独的聚合服务中开发，当它稳定之后，在合并会 APIServer 就很容易了。
  - 确保新 API 遵循 Kubernetes 约定，如果没有这里提出的机制，社区成员可能会被迫推出自己的东西，这样很可能造成社区成员和社区约定不一致。
- 除了基于 CPU 和内存来进行自动扩缩容之外，我们还可以根据自定义的监控指标来进行
- 这个我们就需要使用 Prometheus Adapter，Prometheus 用于监控应用的负载和集群本身的各种指标
- Prometheus Adapter 可以帮我们使用 Prometheus 收集的指标并使用它们来制定扩展策略
- 这些指标都是通过 APIServer 暴露的，而且 HPA 资源对象也可以很轻易的直接使用。

### 对应的配置文件 manifests\prometheus-adapter-configMap.yaml

```yaml
apiVersion: v1
data:
  config.yaml: |-
    "resourceRules":
      "cpu":
        "containerLabel": "container"
        "containerQuery": "sum(irate(container_cpu_usage_seconds_total{<<.LabelMatchers>>,container!=\"\",pod!=\"\"}[5m])) by (<<.GroupBy>>)"
        "nodeQuery": "sum(1 - irate(node_cpu_seconds_total{mode=\"idle\"}[5m]) * on(namespace, pod) group_left(node) node_namespace_pod:kube_pod_info:{<<.LabelMatchers>>}) by (<<.GroupBy>>) or sum (1- irate(windows_cpu_time_total{mode=\"idle\", job=\"windows-exporter\",<<.LabelMatchers>>}[5m])) by (<<.GroupBy>>)"
        "resources":
          "overrides":
            "namespace":
              "resource": "namespace"
            "node":
              "resource": "node"
            "pod":
              "resource": "pod"
      "memory":
        "containerLabel": "container"
        "containerQuery": "sum(container_memory_working_set_bytes{<<.LabelMatchers>>,container!=\"\",pod!=\"\"}) by (<<.GroupBy>>)"
        "nodeQuery": "sum(node_memory_MemTotal_bytes{job=\"node-exporter\",<<.LabelMatchers>>} - node_memory_MemAvailable_bytes{job=\"node-exporter\",<<.LabelMatchers>>}) by (<<.GroupBy>>) or sum(windows_cs_physical_memory_bytes{job=\"windows-exporter\",<<.LabelMatchers>>} - windows_memory_available_bytes{job=\"windows-exporter\",<<.LabelMatchers>>}) by (<<.GroupBy>>)"
        "resources":
          "overrides":
            "instance":
              "resource": "node"
            "namespace":
              "resource": "namespace"
            "pod":
              "resource": "pod"
      "window": "5m"
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/component: metrics-adapter
    app.kubernetes.io/name: prometheus-adapter
    app.kubernetes.io/part-of: kube-prometheus
    app.kubernetes.io/version: 0.8.4
  name: adapter-config
  namespace: monitoring

```

## 其余自身指标

- serviceMonitor/monitoring/prometheus-k8s/0 代表两个prometheus采集器的指标
- serviceMonitor/monitoring/prometheus-operator/0 代表 prometheus-operator的指标
- serviceMonitor/monitoring/alertmanager/0 三个alertmanager的指标
- serviceMonitor/monitoring/grafana/0 1个grafana的指标

# 本节重点总结 :

- prometheus 采集分析

## 36.3 grafana-dashboard看图分析

# kube-prometheus中的grafana总结

- db使用 sqlit，volume类型为emptydir 无法持久化，pod扩缩就重新创建
- 通过configMap设置的prometheus DataSource
  - 通过 prometheus-k8s svc对应的 域名访问
  - 下面对应两个prometheus容器，有HA
- 各个dashboard通过 configMap挂载，grafana动态加载，不能修改
- 内置了22张大盘图，包含预聚合指标，很全面

# grafana deployment部署分析

## sqlit db文件

- manifests\grafana-deployment.yaml

```yaml
        volumeMounts:
        - mountPath: /var/lib/grafana
          name: grafana-storage
          readOnly: false
```

- 对应的grafana-storage为 emptyDir类型，属于pod临时的目录

```yaml
      volumes:
      - emptyDir: {}
        name: grafana-storage
```

## 通过配置的方式进行datasource设置

- 对应的volume配置

```yaml
        volumeMounts:
        - mountPath: /etc/grafana/provisioning/datasources
          name: grafana-datasources
          readOnly: false
      - name: grafana-datasources
      volumes:
        secret:
          secretName: grafana-datasources
```

### [grafana provisioning](http://docs.grafana.org/administration/provisioning/#provisioning-grafana)

- 是grafana 5.0后引入的功能，用以支持通过配置的方式进行datasource和dashboard的配置。
- 首先要在grafana的配置中增加provisioning的选项

```shell
[paths]
# folder that contains provisioning config files that grafana will apply on startup and while running.
;provisioning = /etc/grafana/provisioning
```

- 而后在/etc/grafana/provisioning中增加dashboards和datasources文件夹

```shell
[root@local provisioning]# ll
total 0
drwxr-xr-x 2 root grafana 25 Nov 28 03:09 dashboards
drwxr-xr-x 2 root grafana 25 Nov 28 03:09 datasources
```

- datasource只支持静态配置，即，在datasources中配置好后，grafana启动时候将会进行加载。在grafana启动后在加入该文件夹，需要重启才能生效。
- datasoures文件夹下需要放置对应的datasource的yaml文件，进到grafana容器内部查看内容

```shell
/etc/grafana/provisioning $ cat /etc/grafana/provisioning/datasources/datasources.yaml 
{
    "apiVersion": 1,
    "datasources": [
        {
            "access": "proxy",
            "editable": false,
            "name": "prometheus",
            "orgId": 1,
            "type": "prometheus",
            "url": "http://prometheus-k8s.monitoring.svc:9090",
            "version": 1
        }
    ]
}
```

### 对应的secret内容

- 将manifests\grafana-dashboardDatasources.yaml 中的data做base64解码可以得到 datasources.yaml 的内容

```yaml

apiVersion: v1
data:
  datasources.yaml: ewogICAgImFwaVZlcnNpb24iOiAxLAogICAgImRhdGFzb3VyY2VzIjogWwogICAgICAgIHsKICAgICAgICAgICAgImFjY2VzcyI6ICJwcm94eSIsCiAgICAgICAgICAgICJlZGl0YWJsZSI6IGZhbHNlLAogICAgICAgICAgICAibmFtZSI6ICJwcm9tZXRoZXVzIiwKICAgICAgICAgICAgIm9yZ0lkIjogMSwKICAgICAgICAgICAgInR5cGUiOiAicHJvbWV0aGV1cyIsCiAgICAgICAgICAgICJ1cmwiOiAiaHR0cDovL3Byb21ldGhldXMtazhzLm1vbml0b3Jpbmcuc3ZjOjkwOTAiLAogICAgICAgICAgICAidmVyc2lvbiI6IDEKICAgICAgICB9CiAgICBdCn0=
kind: Secret
metadata:
  labels:
    app.kubernetes.io/component: grafana
    app.kubernetes.io/name: grafana
    app.kubernetes.io/part-of: kube-prometheus
    app.kubernetes.io/version: 7.5.4
  name: grafana-datasources
  namespace: monitoring
type: Opaque

```

- base64解码结果

```shell
[root@k8s-master01 kube-prometheus]# echo "ewogICAgImFwaVZlcnNpb24iOiAxLAogICAgImRhdGFzb3VyY2VzIjogWwogICAgICAgIHsKICAgICAgICAgICAgImFjY2VzcyI6ICJwcm94eSIsCiAgICAgICAgICAgICJlZGl0YWJsZSI6IGZhbHNlLAogICAgICAgICAgICAibmFtZSI6ICJwcm9tZXRoZXVzIiwKICAgICAgICAgICAgIm9yZ0lkIjogMSwKICAgICAgICAgICAgInR5cGUiOiAicHJvbWV0aGV1cyIsCiAgICAgICAgICAgICJ1cmwiOiAiaHR0cDovL3Byb21ldGhldXMtazhzLm1vbml0b3Jpbmcuc3ZjOjkwOTAiLAogICAgICAgICAgICAidmVyc2lvbiI6IDEKICAgICAgICB9CiAgICBdCn0" |base64   --decode  
{
    "apiVersion": 1,
    "datasources": [
        {
            "access": "proxy",
            "editable": false,
            "name": "prometheus",
            "orgId": 1,
            "type": "prometheus",
            "url": "http://prometheus-k8s.monitoring.svc:9090",
            "version": 1
        }
    ]
}
```

## 动态加载dashboards

- 不同于datasource，dashboards是支持动态加载的
- 在grafana容器内部看到的dashboards

```shell
cat /etc/grafana/provisioning/dashboards/dashboards.yaml 
{
    "apiVersion": 1,
    "providers": [
        {
            "folder": "Default",
            "name": "0",
            "options": {
                "path": "/grafana-dashboard-definitions/0"
            },
            "orgId": 1,
            "type": "file"
        }
    ]
}
```

- path  /grafana-dashboard-definitions/0 代表加载这个目录下的json文件
- folder Default代表加载后的dashboard放在 Default folder下
- 查看dashboards加载目录

```shell
/grafana-dashboard-definitions/0 $ ls -lrt /grafana-dashboard-definitions/0
total 0
drwxrwsrwx    3 root     nobody          81 Sep  6 04:36 scheduler
drwxrwsrwx    3 root     nobody          93 Sep  6 04:36 node-cluster-rsrc-use
drwxrwsrwx    3 root     nobody          93 Sep  6 04:36 namespace-by-workload
drwxrwsrwx    3 root     nobody          94 Sep  6 04:36 k8s-resources-workload
drwxrwsrwx    3 root     nobody          90 Sep  6 04:36 k8s-resources-node
drwxrwsrwx    3 root     nobody          85 Sep  6 04:36 cluster-total
drwxrwsrwx    3 root     nobody          81 Sep  6 04:36 apiserver
drwxrwsrwx    3 root     nobody          95 Sep  6 04:36 prometheus-remote-write
drwxrwsrwx    3 root     nobody          82 Sep  6 04:36 prometheus
drwxrwsrwx    3 root     nobody          85 Sep  6 04:36 node-rsrc-use
drwxrwsrwx    3 root     nobody         105 Sep  6 04:36 k8s-resources-workloads-namespace
drwxrwsrwx    3 root     nobody          90 Sep  6 04:36 controller-manager
drwxrwsrwx    3 root     nobody          77 Sep  6 04:36 proxy
drwxrwsrwx    3 root     nobody          88 Sep  6 04:36 namespace-by-pod
drwxrwsrwx    3 root     nobody          95 Sep  6 04:36 k8s-resources-namespace
drwxrwsrwx    3 root     nobody          86 Sep  6 04:36 workload-total
drwxrwsrwx    3 root     nobody          94 Sep  6 04:36 persistentvolumesusage
drwxrwsrwx    3 root     nobody          77 Sep  6 04:36 nodes
drwxrwsrwx    3 root     nobody          79 Sep  6 04:36 kubelet
drwxrwsrwx    3 root     nobody          89 Sep  6 04:36 k8s-resources-pod
drwxrwsrwx    3 root     nobody          93 Sep  6 04:36 k8s-resources-cluster
drwxrwsrwx    3 root     nobody          83 Sep  6 04:36 statefulset
drwxrwsrwx    3 root     nobody          81 Sep  6 04:36 pod-total
```

### 以node-exporter大盘为例

- 目录 定义

```yaml
        - mountPath: /grafana-dashboard-definitions/0/nodes
          name: grafana-dashboard-nodes
      - configMap:
          name: grafana-dashboard-nodes
        name: grafana-dashboard-nodes
```

- 对应的configmap grafana-dashboard-nodes，位置 manifests\grafana-dashboardDefinitions.yaml

```yaml
  kind: ConfigMap
  metadata:
    labels:
      app.kubernetes.io/component: grafana
      app.kubernetes.io/name: grafana
      app.kubernetes.io/part-of: kube-prometheus
      app.kubernetes.io/version: 7.5.4
    name: grafana-dashboard-nodes
    namespace: monitoring
```

### dashboard是不能修改的

- Cannot save provisioned dashboard

## 数据源地址dns解析

- 地址 http://prometheus-k8s.monitoring.svc:9090

### grafana 容器内部访问prometheus

```shell
[root@k8s-master01 kube-prometheus]# kubectl get pod -n monitoring  -o wide                                       
NAME                                   READY   STATUS    RESTARTS   AGE     IP              NODE           NOMINATED NODE   READINESS GATES
alertmanager-main-0                    2/2     Running   0          6h32m   10.100.85.235   k8s-node01     <none>           <none>
alertmanager-main-1                    2/2     Running   0          6h32m   10.100.85.233   k8s-node01     <none>           <none>
alertmanager-main-2                    2/2     Running   0          6h32m   10.100.85.234   k8s-node01     <none>           <none>
blackbox-exporter-55c457d5fb-rzn7l     3/3     Running   0          6h32m   10.100.85.236   k8s-node01     <none>           <none>
grafana-9df57cdc4-tf6qj                1/1     Running   0          6h32m   10.100.85.237   k8s-node01     <none>           <none>
kube-state-metrics-76f6cb7996-27dc2    3/3     Running   0          6h32m   10.100.85.238   k8s-node01     <none>           <none>
node-exporter-7rqfg                    2/2     Running   0          6h32m   172.20.70.215   k8s-node01     <none>           <none>
node-exporter-b5pnx                    2/2     Running   0          6h32m   172.20.70.205   k8s-master01   <none>           <none>
prometheus-adapter-59df95d9f5-28n4c    1/1     Running   0          6h32m   10.100.85.241   k8s-node01     <none>           <none>
prometheus-adapter-59df95d9f5-glwk7    1/1     Running   0          6h32m   10.100.85.242   k8s-node01     <none>           <none>
prometheus-k8s-0                       2/2     Running   1          6h32m   10.100.85.240   k8s-node01     <none>           <none>
prometheus-k8s-1                       2/2     Running   1          6h32m   10.100.85.239   k8s-node01     <none>           <none>
prometheus-operator-7775c66ccf-hkmpr   2/2     Running   0          7h16m   10.100.85.232   k8s-node01     <none>           <none>
[root@k8s-master01 kube-prometheus]# 
[root@k8s-master01 kube-prometheus]# kubectl -n monitoring exec  grafana-9df57cdc4-tf6qj  -ti -- /bin/sh          
/usr/share/grafana $ cat /etc/resolv.conf 
search monitoring.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
/usr/share/grafana $ ping prometheus-k8s.monitoring.svc
PING prometheus-k8s.monitoring.svc (10.96.200.87): 56 data bytes
ping: permission denied (are you root?)
/usr/share/grafana $ 
```

### k8s 会为service创建[cordns解析](https://kubernetes.io/zh/docs/concepts/services-networking/dns-pod-service/)

- 解析域名为`${service_name}.${namespace}.svc.cluster.local`
- 其中 cluster.local代表集群的后缀
- 那么prometheus-k8s的域名为`prometheus-k8s.monitoring.svc.cluster.local`

### pod中dns的配置

- 同时pod中的dns配置为search 3个域，我们可以exec进入grafana 容器中查看，如下面的实例所示。

```shell
[root@k8s-master01 kube-prometheus]# kubectl get pod -n monitoring  -o wide                                       
NAME                                   READY   STATUS    RESTARTS   AGE     IP              NODE           NOMINATED NODE   READINESS GATES
alertmanager-main-0                    2/2     Running   0          6h32m   10.100.85.235   k8s-node01     <none>           <none>
alertmanager-main-1                    2/2     Running   0          6h32m   10.100.85.233   k8s-node01     <none>           <none>
alertmanager-main-2                    2/2     Running   0          6h32m   10.100.85.234   k8s-node01     <none>           <none>
blackbox-exporter-55c457d5fb-rzn7l     3/3     Running   0          6h32m   10.100.85.236   k8s-node01     <none>           <none>
grafana-9df57cdc4-tf6qj                1/1     Running   0          6h32m   10.100.85.237   k8s-node01     <none>           <none>
kube-state-metrics-76f6cb7996-27dc2    3/3     Running   0          6h32m   10.100.85.238   k8s-node01     <none>           <none>
node-exporter-7rqfg                    2/2     Running   0          6h32m   172.20.70.215   k8s-node01     <none>           <none>
node-exporter-b5pnx                    2/2     Running   0          6h32m   172.20.70.205   k8s-master01   <none>           <none>
prometheus-adapter-59df95d9f5-28n4c    1/1     Running   0          6h32m   10.100.85.241   k8s-node01     <none>           <none>
prometheus-adapter-59df95d9f5-glwk7    1/1     Running   0          6h32m   10.100.85.242   k8s-node01     <none>           <none>
prometheus-k8s-0                       2/2     Running   1          6h32m   10.100.85.240   k8s-node01     <none>           <none>
prometheus-k8s-1                       2/2     Running   1          6h32m   10.100.85.239   k8s-node01     <none>           <none>
prometheus-operator-7775c66ccf-hkmpr   2/2     Running   0          7h16m   10.100.85.232   k8s-node01     <none>           <none>
[root@k8s-master01 kube-prometheus]# 
[root@k8s-master01 kube-prometheus]# kubectl -n monitoring exec  grafana-9df57cdc4-tf6qj  -ti -- /bin/sh          
/usr/share/grafana $ cat /etc/resolv.conf 
search monitoring.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5

```

- 所以在容器中可以ping一下 kube-state-metrics，可以看到解析的ip地址

```shell
/usr/share/grafana $ ping prometheus-k8s.monitoring.svc
PING prometheus-k8s.monitoring.svc (10.96.200.87): 56 data bytes
ping: permission denied (are you root?)
/usr/share/grafana $ 
```

- 在node上用这个ip访问以下 prometheus页面

```shell
[root@k8s-master01 kube-prometheus]# curl 10.96.200.87:9090/api/v1/status/buildinfo
{"status":"success","data":{"version":"2.26.0","revision":"3cafc58827d1ebd1a67749f88be4218f0bab3d8d","branch":"HEAD","buildUser":"root@a67cafebe6d0","buildDate":"20210331-11:56:23","goVersion":"go1.16.2"}}
 
```

# kube-prometheus中的grafana总结

- db使用 sqlit，volume类型为emptydir 无法持久化，pod扩缩就重新创建
- 通过configMap设置的prometheus DataSource
  - 通过 prometheus-k8s svc对应的 域名访问
  - 下面对应两个prometheus容器，有HA
- 各个dashboard通过 configMap挂载，grafana动态加载，不能修改
- 内置了22张大盘图，包含预聚合指标，很全面

## 36.4 prometheus告警和预聚合分析

# 总结

- 内置了很多alert和record rule
- 专业的promql，不用我们自己写了
- 多级嵌套的record计算如apiserver的slo

# prometheus ui查看配置看到配置了rule

```yaml
rule_files:
- /etc/prometheus/rules/prometheus-k8s-rulefiles-0/*.yaml
```

## 进入prometheus-k8s容器中查看

```shell
 kubectl -n monitoring exec  prometheus-k8s-0 -ti -- /bin/sh

/prometheus $ ls -rtl /etc/prometheus/rules/prometheus-k8s-rulefiles-0
total 0
lrwxrwxrwx    1 root     root            48 Sep  6 04:36 monitoring-prometheus-operator-rules.yaml -> ..data/monitoring-prometheus-operator-rules.yaml
lrwxrwxrwx    1 root     root            54 Sep  6 04:36 monitoring-prometheus-k8s-prometheus-rules.yaml -> ..data/monitoring-prometheus-k8s-prometheus-rules.yaml
lrwxrwxrwx    1 root     root            42 Sep  6 04:36 monitoring-node-exporter-rules.yaml -> ..data/monitoring-node-exporter-rules.yaml
lrwxrwxrwx    1 root     root            50 Sep  6 04:36 monitoring-kubernetes-monitoring-rules.yaml -> ..data/monitoring-kubernetes-monitoring-rules.yaml
lrwxrwxrwx    1 root     root            47 Sep  6 04:36 monitoring-kube-state-metrics-rules.yaml -> ..data/monitoring-kube-state-metrics-rules.yaml
lrwxrwxrwx    1 root     root            44 Sep  6 04:36 monitoring-kube-prometheus-rules.yaml -> ..data/monitoring-kube-prometheus-rules.yaml
lrwxrwxrwx    1 root     root            46 Sep  6 04:36 monitoring-alertmanager-main-rules.yaml -> ..data/monitoring-alertmanager-main-rules.yaml
/prometheus $ 

```

# 告警规则总结

- monitoring-alertmanager-main-rules.yaml alertmanager 运行相关
- monitoring-kube-prometheus-rules.yaml  prometheus target相关
- monitoring-kube-state-metrics-rules.yaml ksm指标
- monitoring-kubernetes-monitoring-rules.yaml  服务组件指标
- monitoring-node-exporter-rules.yaml node_exporter指标
- monitoring-prometheus-k8s-prometheus-rules.yaml prometheus运行相关
- monitoring-prometheus-operator-rules.yaml   operator指标

## 部分告警规则举例

- pod重启过就报警

```yaml
    - alert: KubePodCrashLooping
      annotations:
        description: Pod {{ $labels.namespace }}/{{ $labels.pod }} ({{ $labels.container }}) is restarting {{ printf "%.2f" $value }} times / 10 minutes.
        runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/kubepodcrashlooping
        summary: Pod is crash looping.
      expr: |
        rate(kube_pod_container_status_restarts_total{job="kube-state-metrics"}[10m]) * 60 * 5 > 0
      for: 15m
      labels:
        severity: warning
```

- StatefulSet运行副本数不对

```yaml
    - alert: KubeStatefulSetReplicasMismatch
      annotations:
        description: StatefulSet {{ $labels.namespace }}/{{ $labels.statefulset }} has not matched the expected number of replicas for longer than 15 minutes.
        runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/kubestatefulsetreplicasmismatch
        summary: Deployment has not matched the expected number of replicas.
      expr: |
        (
          kube_statefulset_status_replicas_ready{job="kube-state-metrics"}
            !=
          kube_statefulset_status_replicas{job="kube-state-metrics"}
        ) and (
          changes(kube_statefulset_status_replicas_updated{job="kube-state-metrics"}[10m])
            ==
          0
        )
      for: 15m
      labels:
        severity: warning
```

- 容器waiting状态

```yaml
    - alert: KubeContainerWaiting
      annotations:
        description: Pod {{ $labels.namespace }}/{{ $labels.pod }} container {{ $labels.container}} has been in waiting state for longer than 1 hour.
        runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/kubecontainerwaiting
        summary: Pod container waiting longer than 1 hour
      expr: |
        sum by (namespace, pod, container) (kube_pod_container_status_waiting_reason{job="kube-state-metrics"}) > 0
      for: 1h
      labels:
        severity: warning
```

- apiserver 挂了

```yaml
    - alert: KubeAPIDown
      annotations:
        description: KubeAPI has disappeared from Prometheus target discovery.
        runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/kubeapidown
        summary: Target disappeared from Prometheus target discovery.
      expr: |
        absent(up{job="apiserver"} == 1)
      for: 15m
      labels:
        severity: critical
```

## 对应的runbook解读

- https://runbooks.thaum.xyz/runbooks/kubernetes/kubeapierrorbudgetburn/

# 预聚合规则总结

## kubernetes-api-server 大盘图

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407782000/af497b3b08ac4c1ebf23d5bd4e6535c4.png)

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407782000/d0fa1373f5444b5cb4c7200054c0a756.png)

### apiserver 30天内的可用性

- Availability (30d) > 99.000%

```shell
apiserver_request:availability30d{verb="all", cluster=""}
```

- 在rule文件中查询

```shell
/etc/prometheus/rules/prometheus-k8s-rulefiles-0 $ grep  "apiserver_request:availability30d"  /etc/prometheus/rules/prometheus-k8s-rulefiles-0/*
/etc/prometheus/rules/prometheus-k8s-rulefiles-0/monitoring-kubernetes-monitoring-rules.yaml:    record: apiserver_request:availability30d
/etc/prometheus/rules/prometheus-k8s-rulefiles-0/monitoring-kubernetes-monitoring-rules.yaml:    record: apiserver_request:availability30d
/etc/prometheus/rules/prometheus-k8s-rulefiles-0/monitoring-kubernetes-monitoring-rules.yaml:    record: apiserver_request:availability30d
```

- 对应的rule文件 位置 manifests\kubernetes-prometheusRule.yaml
- verb=all对应的record
- 总结下来就是1-  (write too slow + read too slow + errors)增量/总的增量

````yaml
    - expr: |
        1 - (
          (
            # write too slow
            sum(increase(apiserver_request_duration_seconds_count{verb=~"POST|PUT|PATCH|DELETE"}[30d]))
            -
            sum(increase(apiserver_request_duration_seconds_bucket{verb=~"POST|PUT|PATCH|DELETE",le="1"}[30d]))
          ) +
          (
            # read too slow
            sum(increase(apiserver_request_duration_seconds_count{verb=~"LIST|GET"}[30d]))
            -
            (
              (
                sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope=~"resource|",le="0.1"}[30d]))
                or
                vector(0)
              )
              +
              sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope="namespace",le="0.5"}[30d]))
              +
              sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope="cluster",le="5"}[30d]))
            )
          ) +
          # errors
          sum(code:apiserver_request_total:increase30d{code=~"5.."} or vector(0))
        )
        /
        sum(code:apiserver_request_total:increase30d)
      labels:
        verb: all
      record: apiserver_request:availability30d
````

- 对应的read write 30天增量 code:apiserver_request_total:increase30d

```yaml
    - expr: |
        sum by (code) (code_verb:apiserver_request_total:increase30d{​verb=~"LIST|GET"})
      labels:
        verb: read
      record: code:apiserver_request_total:increase30d
    - expr: |
        sum by (code) (code_verb:apiserver_request_total:increase30d{​verb=~"POST|PUT|PATCH|DELETE"})
      labels:
        verb: write
      record: code:apiserver_request_total:increase30d
```

- code_verb:apiserver_request_total:increase30d 由 code_verb:apiserver_request_total:increase1h算出

```yaml
    - expr: |
        avg_over_time(code_verb:apiserver_request_total:increase1h[30d]) * 24 * 30
      record: code_verb:apiserver_request_total:increase30d
```

- code_verb:apiserver_request_total:increase1h由各个verb的增量算出

```yaml
    - expr: |
        sum by (code, verb) (increase(apiserver_request_total{​job="apiserver",verb="LIST",code=~"2.."}[1h]))
      record: code_verb:apiserver_request_total:increase1h
```

#### 总结

- 预聚合1 通过 apiserver_request_total中每个动作verb和对应的code算出  code_verb的1小时增量

```shell
    - expr: |
        sum by (code, verb) (increase(apiserver_request_total{​job="apiserver",verb="LIST",code=~"2.."}[1h]))
      record: code_verb:apiserver_request_total:increase1h
```

- 预聚合2 通过 code_verb的1小时增量 30天的平均值算出 code_verb的30天增量

```shell
    - expr: |
        avg_over_time(code_verb:apiserver_request_total:increase1h[30d]) * 24 * 30
      record: code_verb:apiserver_request_total:increase30d
```

- 预聚合3 通过 code_verb的30天增量中List或Get算出 read的 code30天增量

```shell
    - expr: |
        sum by (code) (code_verb:apiserver_request_total:increase30d{​verb=~"LIST|GET"})
      labels:
        verb: read
      record: code:apiserver_request_total:increase30d
```

- 预聚合3 通过 code_verb的30天增量中POST|PUT|PATCH|DELETE算出 write的 code30天增量

```shell
    - expr: |
        sum by (code) (code_verb:apiserver_request_total:increase30d{​verb=~"POST|PUT|PATCH|DELETE"})
      labels:
        verb: write
      record: code:apiserver_request_total:increase30d
```

- 预聚合4 最终版的结果 1 - (write too slow + read too slow + errors)增量/总的增量
  - write too slow  ：写请求verb(POST|PUT|PATCH|DELETE)的30天增量

    - 正常的写请求： 耗时1秒内的写请求： apiserver_request_duration_seconds_bucket{verb=~"POST|PUT|PATCH|DELETE",le="1"}
    - 全部的写请求增量 ：sum(increase(apiserver_request_duration_seconds_count{verb=~"POST|PUT|PATCH|DELETE"}[30d]))
    - 写请求过慢的30天增量 = 全部的写请求增量 - 正常的写请求增量
  - read too slow ：读请求过慢的30天增量

    - 全部读请求增量 ： sum(increase(apiserver_request_duration_seconds_count{verb=~"LIST|GET"}[30d]))
    - scope="cluster" 5秒内认为正常  sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope="cluster",le="5"}[30d]))
    - scope="namespace" 单一namespace的请求，0.5秒内认为正常 sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope="namespace",le="0.5"}[30d]))
    - scope="resource" 单一资源的请求，0.1秒内认为正常  sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope=~"resource|",le="0.1"}[30d]))
    - 读请求过慢的30天增量 = 全部读请求增量 - 集群维度请求耗时5秒内请求增量 -  单一namespace的请求耗时0.5秒内请求增量 - 单一资源的请求耗时0.1秒内请求增量
  - errors： 错误请求30天增量

    - code维护预聚合结果中code=5xx sum(code:apiserver_request_total:increase30d{code=~"5.."} or vector(0))

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407782000/504e231b758545128a5674ad340dd680.png)

## 36.5 自定义指标接入prometheus-operator

# prometheus-operator优势总结

- 自定义的采集配置接入更方便，只要定义serviceMonitor即可
- 采集的参数修改也很方便，对比之前只能由prometheus管理员修改job段配置
- 告警配置也是

# prometheus-operator劣势总结

- 数据的长期存储没有解决
- 高可用性和扩展性没解决

# 什么是 Kubernetes Operator？

- Operator 是特定于 Kubernetes 的应用程序 (pod)，可自动配置、管理和优化其他 Kubernetes 部署。它们作为自定义控制器实现。
- Kubernetes 操作员封装了部署和扩展应用程序的专有技术，并直接执行与 API 通信的算法决策。

## Kubernetes Operator 能做什么：

> 基本上，任何可以由人工管理员表示为代码的内容都可以在 Kubernetes Operator 内实现自动化。

- 根据 Kubernetes 集群的规格，为您的部署安装并提供合理的初始配置和大小调整。
- 执行部署和 Pod 的实时重新加载，以适应任何用户请求的参数修改（热配置重新加载）。
- 根据性能指标自动扩大或缩小。
- 执行备份、完整性检查或任何其他维护任务。

# Prometheus Operator

- Prometheus Operator提供k8s service 和 deployment 监控的定义，并且管理普罗米修斯实例的部署

## Prometheus Operator具体能做什么

- 执行完整 Kubernetes-Prometheus 堆栈的初始安装和配置

  - Prometheus servers
  - Alertmanager
  - Grafana
  - Host node_exporter
  - kube-state-metrics
- 使用ServiceMonitor实体定义监控指标endpoint，并自动配置到prometheus中
- 使用 Operator CRD 和 ConfigMap 自定义和扩展服务，使我们的配置完全可移植且具有声明性

## Operator 定义了下面的CRD

- Prometheus，它定义了所需的 Prometheus 部署。Operator 始终确保与资源定义匹配的部署正在运行。
- ServiceMonitor，它以声明方式指定应如何监视服务组。Operator 根据定义自动生成 Prometheus 抓取配置。
- PrometheusRule，它定义了所需的 Prometheus 规则文件，该文件可由包含 Prometheus 警报和记录规则的 Prometheus 实例加载。
- Alertmanager，它定义了所需的 Alertmanager 部署。Operator 始终确保与资源定义匹配的部署正在运行。
- Operator 存储库中的kube-prometheus目录包含默认服务和配置，因此您不仅可以获得 Prometheus Operator 本身，还可以获得完整的设置，您可以从一开始就开始使用和自定义。

## kube-prometheus和prometheus-operator的关系

- Operator 项目中的kube-prometheus目录包含默认服务和配置
- 从中不仅可以获得 Prometheus Operator 本身，还可以获得完整的设置，您可以从一开始就开始使用和自定义。

## 架构图

![image](https://sysdig.com/wp-content/uploads/2018/09/prometheus_operator_diagram.png)

# ServiceMonitor作用

![image](https://sysdig.com/wp-content/uploads/2018/09/prometheus_operator_servicemonitor.png)

- ServiceMonitor 描述了 Prometheus 监视的目标集
- 如果存在与 ServiceMonitor 条件匹配的新指标端点，则此目标将自动添加到选择该 ServiceMonitor 的所有 Prometheus 服务器。
- ServiceMonitor 的目标是 Kubernetes 服务，而不是 pod 直接公开的端点
- 按命名空间、标签等过滤端点
- 定义不同的抓取端口
- 定义所有额外的抓取参数，如抓取间隔、使用的协议、TLS 凭证、重新标记策略等。

# 使用serviceMonitor采集我们自定义的指标

## 部署之前的ink8s-pod-metrics 在第19章中

## 编写 myPod_serviceMonitor

- endpoints代表最后采集的targets
  - interval采集间隔
  - port 采集端口
  - scheme采集协议
- jobLabel: app.kubernetes.io/name 的意思是最后job标签使用这个标签的value
- namespaceSelector代表过滤哪个ns下的svc
- selector代表svc的标签选择器

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/name: ink8s-pod-metrics
  name: ink8s-pod-metrics
  namespace: monitoring
spec:
  endpoints:
    - interval: 15s
      port: https-self
      scheme: http
  jobLabel: app.kubernetes.io/name
  namespaceSelector:
    matchNames:
      - default
  selector:
    matchLabels:
      app.kubernetes.io/name: ink8s-pod-metrics

```

## 编写 myPod_svc

- 在default ns下的svc
- 打上标签app.kubernetes.io/name: ink8s-pod-metrics 和上面的serviceMonitor对应
- 端口和容器端口对应上，端口名字和上面的serviceMonitor对应

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/name: ink8s-pod-metrics

  name: ink8s-pod-metrics
  namespace: default
spec:
  clusterIP: None
  ports:
    - name: https-self
      port: 8080
      targetPort: 8080
  selector:
    app: ink8s-pod-metrics

```

## 部署

```yaml
 kubectl apply -f .
```

## 检查target页面和discovery页面结果

- target页面的截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/be0c7a07186a40b7a047d5dddf12ab38.png)
- discovery的结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/c2a4994617e74dce979f9c2ec318cf0e.png)
- graph查询的结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/8b0a17105afa460b9b21384fcece920b.png)

# 使用PrometheusRule添加自定义指标的告警规则

## yaml

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  labels:
    app.kubernetes.io/name: ink8s-pod-metrics
    prometheus: k8s
    role: alert-rules
  name: ink8s-pod-metrics-k8s-prometheus-rules
  namespace: monitoring
spec:
  groups:
    - name: ink8s-pod-metrics-k8s-prometheus-rules01
      rules:
        - alert: pod_control_plane_pod_detail01
          annotations:
            description: Prometheus {​{$labels.namespace}}/{​{$labels.pod}} has failed to reload its configuration.
            runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/prometheusbadconfig
            summary: test
          expr: |
            ink8s_pod_metrics_get_pod_control_plane_pod_detail > 0
          for: 1m
          labels:
            severity: critical
```

- 元信息中的标签要和prometheus-k8s ruleSelector对应上
  - prometheus: k8s
  - role: alert-rules

```yaml
  ruleSelector:
    matchLabels:
      prometheus: k8s
      role: alert-rules
```

## 应用

## rule规则页面查看效果

- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/999c380f51304877829ef96d26539a0d.png)
- firing的结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407803000/c76fb4ffa9884f1ca054c13a1cf8e9b0.png)

# prometheus-operator优势总结

- 自定义的采集配置接入更方便，只要定义serviceMonitor即可
- 采集的参数修改也很方便，对比之前只能由prometheus管理员修改job段配置
- 告警配置也是

# prometheus-operator劣势总结

- 数据的长期存储没有解决
- 高可用性和扩展性没解决

