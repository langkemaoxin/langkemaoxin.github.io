---
title: 36.1 kube-prometheus项目讲解和安装部署
sidebarGroup: Prometheus
shortTitle: 114 36.1 kube-prometheus项目...
order: 114
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点总结 : kube-prometheus 优点 - 与手动添加指标目标和服务提供者相比，使用 Prometheus Operator 框架及其自定义资源定义具有显着优势 - 手动添加指标目标和...'
---

> **Prometheus · 第 114 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

