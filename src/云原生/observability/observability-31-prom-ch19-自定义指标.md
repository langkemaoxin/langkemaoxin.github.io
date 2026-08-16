---
title: Prometheus 第19章：自定义指标
sidebarGroup: 可观测性
shortTitle: 31 自定义指标
order: 31
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第19章（自定义指标）合并笔记
---

> **Prometheus · 第 19 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 19.1 使用k8s的sdk编写一个项目获取pod和node信息

# 本节重点介绍 : 
- 引入k8s sdk获取k8s 的node和pod信息
    - 定义相关metrics
    - 初始化k8s-client
    -  使用k8s-client get node 
    -  使用k8s-client get pod
    -  打点

# k8s中关注四大块指标总结
- 之前在k8s中关注4块指标有过总结 

指标类型 | 采集源 | 应用举例  |发现类型| grafana截图
|  ----  | ----  | ---- | ---- | ---- |
容器基础资源指标 | kubelet 内置cadvisor metrics接口 | 查看容器cpu、mem利用率等 |k8s_sd node级别直接访问node_ip|  [容器基础资源](pic/k8s_node.png) |
k8s对象资源指标 | [kube-stats-metrics](https://github.com/kubernetes/kube-state-metrics) (简称ksm) | 具体可以看<br> 看pod状态如pod waiting状态的原因 <br> 数个数如：查看node pod按namespace分布情况 |通过coredns访问域名| [k8s对象资源指标](pic/k8s_obj.png) | 
k8s服务组件指标| 服务组件 metrics接口 | 查看apiserver 、scheduler、etc、coredns请求延迟等 | k8s_sd endpoint级别 | [k8s服务组件指标](pic/k8s_server.png) |
部署在pod中业务埋点指标| pod 的metrics接口 |  依据业务指标场景 | k8s_sd pod级别，访问pod ip的metricspath |

# 使用golang引入sdk编写一个项目跑在k8s中
## 需求分析
- 编写一个go的项目，引用k8s的sdk 获取节点信息，获取pod信息
- 将获取到的信息通过prometheus sdk打点打出来
- 编写dockerfile 将该项目打成镜像
- 编写k8s 的yaml运行改项目
- prometheus采集该项目的pod指标

## 新建项目 ink8s-pod-metrics
- go 1.16以上，初始化项目
```shell script
go mod init ink8s-pod-metrics
```

## 编写go代码
### 1. 定义相关metrics
```go
const (
	namespace = "ink8s_pod_metrics"
	getNode   = "get_node"
	getPod    = "get_pod"
)

var (
    // 将每个node的信息打印出来
	k8sNodeDetail = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: prometheus.BuildFQName(namespace, getNode, "detail"),
		Help: "k8s node detail each",
	}, []string{"ip", "hostname", "containerRuntimeVersion", "kubeletVersion"})

    // 计算获取节点的耗时
	getNodeDuration = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: prometheus.BuildFQName(namespace, getNode, "last_duration_seconds"),
		Help: "get node last duration seconds",
	})
     // 将每个控制平面的pod信息打印出来
	k8sPodDetail = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: prometheus.BuildFQName(namespace, getPod, "control_plane_pod_detail"),
		Help: "k8s pod detail of control plane",
	}, []string{"ip", "pod_name", "component"})
    // 计算获取pod的耗时
	getPodDuration = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: prometheus.BuildFQName(namespace, getPod, "last_duration_seconds"),
		Help: "get pod last duration seconds",
	})
)

```
- metrics讲解
    -  k8sNodeDetail  将每个node的信息打印出来
    -  getNodeDuration  计算获取节点的耗时
    -  k8sPodDetail  将每个控制平面的pod信息打印出来
    -  getPodDuration  计算获取pod的耗时
-  `prometheus.BuildFQName(namespace, getNode, "detail")` 代表使用共同前缀，namespace + subsystem

### 2. 注册metrics
```go
func newMetrics() {
	prometheus.DefaultRegisterer.MustRegister(k8sNodeDetail)
	prometheus.DefaultRegisterer.MustRegister(k8sPodDetail)
	prometheus.DefaultRegisterer.MustRegister(getNodeDuration)
	prometheus.DefaultRegisterer.MustRegister(getPodDuration)
}
```

### 3. 初始化k8s-client
- 使用包 	"k8s.io/client-go/kubernetes"
- 使用包 	"k8s.io/client-go/rest"
- 配合后面的serviceaccount +clusterrole+clusterrolebinding
- 封装一个getK8sClient 方法
```go

func getK8sClient() *kubernetes.Clientset {
	// creates the in-cluster config
	config, err := rest.InClusterConfig()
	if err != nil {
		logger.Errorf("[create_k8s_InClusterConfig_err][err:%v]", err)
		return nil
	}
	// creates the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		logger.Errorf("[create_the_clientset_error][err:%v]", err)
		return nil
	}
	return clientset
}

```

### 4. 使用k8s-client get node 
- `clientset.CoreV1().Nodes().List`代表 get node
- 遍历nodes
    -  获取ip地址 `p.Status.Addresses` 中的类型为 apiv1.NodeInternalIP 就是内网ip
    - containerRuntimeVersion和kubeletVersion信息在  p.Status.NodeInfo中
- 在结尾的时候打印个日志，记录下节点数和耗时，并把耗时打个metrics上报
- 完整代码如下
```go
func doGetNode() {
	start := time.Now()

	clientset := getK8sClient()
	if clientset == nil {
		return
	}

	nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		logger.Errorf("list_kube-system_pod_error:%v", err)
		return
	}

	if len(nodes.Items) == 0 {
		return
	}
	for _, p := range nodes.Items {
		var ip string
		addr := p.Status.Addresses
		if len(addr) == 0 {
			continue
		}

		for _, a := range addr {
			if a.Type == apiv1.NodeInternalIP {
				ip = a.Address
			}
		}

		k8sNodeDetail.With(prometheus.Labels{
			"ip":                      ip,
			"hostname":                p.Name,
			"containerRuntimeVersion": p.Status.NodeInfo.ContainerRuntimeVersion,
			"kubeletVersion":          p.Status.NodeInfo.KubeletVersion,
		}).Set(1)
	}
	timeTook := time.Since(start).Seconds()
	getNodeDuration.Set(timeTook)
	logger.Infof("server_node_ips_result][num_node:%v][time_took_seconds:%v]", len(nodes.Items), timeTook)

}

```

### 5. 使用k8s-client get pod
- ` clientset.CoreV1().Pods("kube-system").List` 代表获取kube-system namespace下面的pods
- 遍历pods
    - 控制平面中的pod 都会有 tie=control-plane的标签
    - 打点即可

- 完整代码如下
```go
func doGetPod() {
	start := time.Now()
	clientset := getK8sClient()
	if clientset == nil {
		return
	}

	pods, err := clientset.CoreV1().Pods("kube-system").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		logger.Errorf("list_kube-system_pod_error:%v", err)
		return
	}

	if len(pods.Items) == 0 {
		return
	}
	for _, p := range pods.Items {
		logger.Infof("[pod.label:%v]", p.Labels)
		if p.Labels["tier"] == "control-plane" {
			ip := p.Status.PodIP
			component := p.Labels["component"]
			k8sPodDetail.With(prometheus.Labels{
				"ip":        ip,
				"pod_name":  p.Name,
				"component": component,
			}).Set(1)

		}
	}

	timeTook := time.Since(start).Seconds()
	getPodDuration.Set(timeTook)
	logger.Infof("server_pod_ips_result][num_pod:%v][time_took_seconds:%v]", len(pods.Items), timeTook)

}
``` 

### 6. 编写运行的ticker函数
- 每隔10秒就执行一下getnode 和getpod上报数据
- 外部的ctx被cancel会导致for退出
```go
func getK8sObjTicker(ctx context.Context) {
	ticker := time.NewTicker(time.Second * 10)
	logger.Infof("GetK8sObjTicker start....")

	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			go doGetNode()
			go doGetPod()
		case <-ctx.Done():
			return
		}
	}

}

```

### 7. 编写main函数
- newMetrics 注册metrics
- `go getK8sObjTicker(ctx)` 开启获取 k8s对象的协程 
- `http.Handle("/metrics", promhttp.Handler()) ` 开启prometheus metric path
```go
func main() {
	// 注册metrics
	newMetrics()
	ctx := context.Background()
	// 开启获取 k8s对象的协程
	go getK8sObjTicker(ctx)
	// 开启prometheus metric path
	http.Handle("/metrics", promhttp.Handler())
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		logger.Errorf("failed to start prometheus metrics web :%v", err)
	}
}

```

# 本节重点总结 : 
- 引入k8s sdk获取k8s 的node和pod信息
    - 定义相关metrics
    - 初始化k8s-client
    -  使用k8s-client get node 
    -  使用k8s-client get pod
    -  打点

## 19.2 编写dockerfile和k8s yaml

# 本节重点介绍 : 
- 编写Dockerfile
- 编写k8s需要的yaml

# 编写Dockerfile

## 1. FROM 指定基础镜像
- 必须有的指令，并且必须是第一条指令
- Alpine 操作系统是一个面向安全的轻型 Linux 发行版。它不同于通常 Linux 发行版，Alpine 采用了 musl libc 和 busybox 以减小系统的体积和运行时资源消耗，但功能上比 busybox 又完善的多，因此得到开源社区越来越多的青睐。
```shell script
FROM golang:1.16-alpine as builder
```

## 2. WORKDIR 指定工作目录
- 使用 WORKDIR 指令可以来指定工作目录（或者称为当前目录），以后各层的当前目录就被改为指定的目录
- 如果目录不存在，WORKDIR 会帮你建立目录
```shell script
WORKDIR /usr/src/app
```

## 3. COPY 复制
- COPY 指令将从构建上下文目录中 <源路径> 的文件/目录复制到新的一层的镜像内的 <目标路径> 位置
- 格式
```shell script
COPY <源路径>... <目标路径>
COPY ["<源路径1>",... "<目标路径>"]
```
- 将go.mod 和 go.sum文件拷贝过来
```shell script
COPY ./go.mod ./
COPY ./go.sum ./
```

## 4. RUN 用于执行命令行命令
- 把镜像替换成阿里云，并且安装upx  ca-certificates tzdata包
```shell script
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
  apk add --no-cache upx ca-certificates tzdata
```

- 下载这个go项目中的依赖包
```shell script
RUN go mod download
```

- 执行编译命令
```shell script
RUN  CGO_ENABLED=0 go build -o ink8s-pod-metrics
```

## 5. ENTRYPOINT 带参数的执行
- 示例
```shell script
ENTRYPOINT [ "curl", "-s", "http://ip.cn" ]
```

## 完整的Dockerfile
```shell script
FROM golang:1.16-alpine as builder
WORKDIR /usr/src/app
ENV GOPROXY=https://goproxy.cn
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
  apk add --no-cache upx ca-certificates tzdata
COPY ./go.mod ./
COPY ./go.sum ./
RUN go mod download
COPY . .
RUN  CGO_ENABLED=0 go build -o ink8s-pod-metrics

FROM yauritux/busybox-curl  as runner
COPY --from=builder /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/src/app/ink8s-pod-metrics /opt/app/ink8s-pod-metrics
ENTRYPOINT [ "/opt/app/ink8s-pod-metrics" ]

```

# 编写k8s的yaml

## 编写rbac.yaml

### ServiceAccount
- default namespace
```shell script
--- 
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ink8s-pod-metrics
  namespace: default
```

### ClusterRole
- 需要获取pod和node
- 动作就是list
```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ink8s-pod-metrics
rules:
  - apiGroups:
      - ""
    resources:
      - nodes
      - pods
    verbs:
      - list
```

### ClusterRoleBinding
```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ink8s-pod-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ink8s-pod-metrics
subjects:
  - kind: ServiceAccount
    name: ink8s-pod-metrics
    namespace: default
```

### 完整的rbac.yaml
```yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ink8s-pod-metrics
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ink8s-pod-metrics
rules:
  - apiGroups:
      - ""
    resources:
      - nodes
      - nodes/metrics
      - services
      - endpoints
      - pods
    verbs:
      - get
      - list
      - watch
  - nonResourceURLs:
      - "/metrics"
    verbs:
      - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ink8s-pod-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ink8s-pod-metrics
subjects:
  - kind: ServiceAccount
    name: ink8s-pod-metrics
    namespace: default
```

## 编写deployment的yaml

### metadata段
- 部署在 default namespace下
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ink8s-pod-metrics-deployment
  namespace: default
  labels:
    app: ink8s-pod-metrics-deployment
```

### prometheus 采集的相关配置
- 我们在使用pod自定义指标时在pod yaml 的spec.template.metadata.annotations中需要定义三个以`prometheus.io`开头的配置
- 释义
    - `prometheus.io/scrape ` 是否需要prometheus采集
    - `prometheus.io/port` metrics暴露的端口
    - `prometheus.io/path` metrics的http path信息
详细配置如下：

```yaml
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ink8s-pod-metrics
  template:
    metadata:
      labels:
        app: ink8s-pod-metrics
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '8080'
        prometheus.io/path: 'metrics'
```

### 容器配置
- 端口是8080，和go代码中的一致
- 使用的镜像名字和dockerfile中 一致 ink8s-pod-metrics
```yaml
    spec:
      containers:
        - name: ink8s-pod-metrics
          image:  ink8s-pod-metrics:v1
          command:
            - /opt/app/ink8s-pod-metrics
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 100Mi
            limits:
              cpu: 200m
              memory: 800Mi
      serviceAccountName: ink8s-pod-metrics
```

### 完整的
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ink8s-pod-metrics-deployment
  namespace: default
  labels:
    app: ink8s-pod-metrics-deployment

spec:
  replicas: 1
  selector:
    matchLabels:
      app: ink8s-pod-metrics
  template:
    metadata:
      labels:
        app: ink8s-pod-metrics
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '8080'
        prometheus.io/path: 'metrics'
    spec:
      containers:
        - name: ink8s-pod-metrics
          image:  ink8s-pod-metrics:v1
          command:
            - /opt/app/ink8s-pod-metrics
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 100Mi
            limits:
              cpu: 200m
              memory: 800Mi
      serviceAccountName: ink8s-pod-metrics
```

# 本节重点总结 : 
- 编写Dockerfile
- 编写k8s需要的yaml

## 19.3 打镜像部署到k8s中，prometheus配置采集并在grafana看图

# 本节重点介绍 :

- 打镜像，导出镜像，传输到各个节点并导入
- 运行该项目
- 配置prometheus和grafana

# 打镜像

## 本地build

```shell

docker build -t ink8s-pod-metrics:v1 .
```

##  build过程

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/9087b9c5fa544576a57c6b2a8d3205e8.png)

## 导出镜像

```shell

docker save  ink8s-pod-metrics > ink8s-pod-metrics.tar 

```

## 传输到各个node节点上

```shell
scp ink8s-pod-metrics.tar k8s-node01:~
```

## 各个node节点上导入镜像

### 使用docker

```shell
docker load < ink8s-pod-metrics.tar
```

### 使用containerd

```shell
ctr --namespace k8s.io images import ink8s-pod-metrics.tar

```

# 运行该项目

```shell
 kubectl apply -f rbac.yaml
 kubectl apply -f deployment.yaml

```

## 检查

```shell
[root@k8s-master01 ink8s-pod-metrics]# kubectl get pod -o wide 
NAME                                           READY   STATUS    RESTARTS   AGE    IP              NODE         NOMINATED NODE   READINESS GATES
grafana-d5d85bcd6-f74ch                        1/1     Running   0          3d9h   10.100.85.199   k8s-node01   <none>           <none>
grafana-d5d85bcd6-l44mx                        1/1     Running   0          3d9h   10.100.85.198   k8s-node01   <none>           <none>
ink8s-pod-metrics-deployment-85d9795d6-95lsp   1/1     Running   0          13m    10.100.85.207   k8s-node01   <none>           <none>
```

- 日志

```shell
[root@k8s-master01 ink8s-pod-metrics]# kubectl logs -l app=ink8s-pod-metrics  -f  
2021-08-23 20:34:35.377256 INFO app/get_k8s_objs.go:128 [pod.label:map[component:etcd tier:control-plane]]
2021-08-23 20:34:35.377266 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-apiserver tier:control-plane]]
2021-08-23 20:34:35.377274 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-controller-manager tier:control-plane]]
2021-08-23 20:34:35.377292 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:85c698c6d4 k8s-app:kube-proxy pod-template-generation:1]]
2021-08-23 20:34:35.377299 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:85c698c6d4 k8s-app:kube-proxy pod-template-generation:1]]
2021-08-23 20:34:35.377317 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-scheduler tier:control-plane]]
2021-08-23 20:34:35.377324 INFO app/get_k8s_objs.go:128 [pod.label:map[app.kubernetes.io/name:kube-state-metrics app.kubernetes.io/version:v1.9.7 pod-template-hash:564668c858]]
2021-08-23 20:34:35.377331 INFO app/get_k8s_objs.go:128 [pod.label:map[k8s-app:metrics-server pod-template-hash:7dbf6c4558]]
2021-08-23 20:34:35.377336 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:prometheus-5b9cdcfd6c k8s-app:prometheus statefulset.kubernetes.io/pod-name:prometheus-0]]
2021-08-23 20:34:35.377358 INFO app/get_k8s_objs.go:143 server_pod_ips_result][num_pod:11][time_took_seconds:6.189551999]
2021-08-23 20:34:39.197614 INFO app/get_k8s_objs.go:107 server_node_ips_result][num_node:2][time_took_seconds:0.009575987]
2021-08-23 20:34:39.200824 INFO app/get_k8s_objs.go:128 [pod.label:map[k8s-app:kube-dns pod-template-hash:68b9d7b887]]
2021-08-23 20:34:39.200857 INFO app/get_k8s_objs.go:128 [pod.label:map[k8s-app:kube-dns pod-template-hash:68b9d7b887]]
2021-08-23 20:34:39.200871 INFO app/get_k8s_objs.go:128 [pod.label:map[component:etcd tier:control-plane]]
2021-08-23 20:34:39.200889 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-apiserver tier:control-plane]]
2021-08-23 20:34:39.200903 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-controller-manager tier:control-plane]]
2021-08-23 20:34:39.200920 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:85c698c6d4 k8s-app:kube-proxy pod-template-generation:1]]
2021-08-23 20:34:39.200934 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:85c698c6d4 k8s-app:kube-proxy pod-template-generation:1]]
2021-08-23 20:34:39.200947 INFO app/get_k8s_objs.go:128 [pod.label:map[component:kube-scheduler tier:control-plane]]
2021-08-23 20:34:39.200961 INFO app/get_k8s_objs.go:128 [pod.label:map[app.kubernetes.io/name:kube-state-metrics app.kubernetes.io/version:v1.9.7 pod-template-hash:564668c858]]
2021-08-23 20:34:39.200981 INFO app/get_k8s_objs.go:128 [pod.label:map[k8s-app:metrics-server pod-template-hash:7dbf6c4558]]
2021-08-23 20:34:39.200992 INFO app/get_k8s_objs.go:128 [pod.label:map[controller-revision-hash:prometheus-5b9cdcfd6c k8s-app:prometheus statefulset.kubernetes.io/pod-name:prometheus-0]]
2021-08-23 20:34:39.201022 INFO app/get_k8s_objs.go:143 server_pod_ips_result][num_pod:11][time_took_seconds:0.013052527]
```

## node上请求 pod 的metrics

- curl pod的ip:8080/metrics

```shell
[root@k8s-master01 ink8s-pod-metrics]# curl -s 10.100.85.207:8080/metrics |grep ink8s
# HELP ink8s_pod_metrics_get_node_detail k8s node detail each
# TYPE ink8s_pod_metrics_get_node_detail gauge
ink8s_pod_metrics_get_node_detail{containerRuntimeVersion="containerd://1.4.4",hostname="k8s-master01",ip="172.20.70.205",kubeletVersion="v1.20.1"} 1
ink8s_pod_metrics_get_node_detail{containerRuntimeVersion="containerd://1.4.4",hostname="k8s-node01",ip="172.20.70.215",kubeletVersion="v1.20.1"} 1
# HELP ink8s_pod_metrics_get_node_last_duration_seconds get node last duration seconds
# TYPE ink8s_pod_metrics_get_node_last_duration_seconds gauge
ink8s_pod_metrics_get_node_last_duration_seconds 0.008066143
# HELP ink8s_pod_metrics_get_pod_control_plane_pod_detail k8s pod detail of control plane
# TYPE ink8s_pod_metrics_get_pod_control_plane_pod_detail gauge
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="etcd",ip="172.20.70.205",pod_name="etcd-k8s-master01"} 1
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="kube-apiserver",ip="172.20.70.205",pod_name="kube-apiserver-k8s-master01"} 1
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="kube-controller-manager",ip="172.20.70.205",pod_name="kube-controller-manager-k8s-master01"} 1
ink8s_pod_metrics_get_pod_control_plane_pod_detail{component="kube-scheduler",ip="172.20.70.205",pod_name="kube-scheduler-k8s-master01"} 1
# HELP ink8s_pod_metrics_get_pod_last_duration_seconds get pod last duration seconds
# TYPE ink8s_pod_metrics_get_pod_last_duration_seconds gauge
ink8s_pod_metrics_get_pod_last_duration_seconds 0.01159838
```

# prometheus target页面检查pod 

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/aae77dfdc78442fcb9632f13f9f209c9.png)

- 发现pod已经发现到了，但是 报错：向http的server发送https的请求

# prometheus和grafana配置

## 检查 kubernetes-pods的job

- 如果之前配置的https，需要改为http的

```yaml
- job_name: kubernetes-pods
  honor_timestamps: true
  scrape_interval: 30s
  scrape_timeout: 10s
  metrics_path: /metrics
  scheme: http
  follow_redirects: true
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    separator: ;
    regex: "true"
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    separator: ;
    regex: (.+)
    target_label: __metrics_path__
    replacement: $1
    action: replace
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    separator: ;
    regex: ([^:]+)(?::\d+)?;(\d+)
    target_label: __address__
    replacement: $1:$2
    action: replace
  - separator: ;
    regex: __meta_kubernetes_pod_label_(.+)
    replacement: $1
    action: labelmap
  - source_labels: [__meta_kubernetes_namespace]
    separator: ;
    regex: (.*)
    target_label: kubernetes_namespace
    replacement: $1
    action: replace
  - source_labels: [__meta_kubernetes_pod_name]
    separator: ;
    regex: (.*)
    target_label: kubernetes_pod_name
    replacement: $1
    action: replace
  kubernetes_sd_configs:
  - role: pod
    kubeconfig_file: ""
    follow_redirects: true
```

## 在prometheus中检查指标

- 查询 ink8s_pod_metrics_get_node_detail
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/b50170e9dea24ee4b0f67abd3d7d8195.png)

```shell
ink8s_pod_metrics_get_node_detail{app="ink8s-pod-metrics", containerRuntimeVersion="containerd://1.4.4", hostname="k8s-master01", instance="10.100.85.207:8080", ip="172.20.70.205", job="kubernetes-pods", kubeletVersion="v1.20.1", kubernetes_namespace="default", kubernetes_pod_name="ink8s-pod-metrics-deployment-85d9795d6-95lsp", pod_template_hash="85d9795d6"}
1
ink8s_pod_metrics_get_node_detail{app="ink8s-pod-metrics", containerRuntimeVersion="containerd://1.4.4", hostname="k8s-node01", instance="10.100.85.207:8080", ip="172.20.70.215", job="kubernetes-pods", kubeletVersion="v1.20.1", kubernetes_namespace="default", kubernetes_pod_name="ink8s-pod-metrics-deployment-85d9795d6-95lsp", pod_template_hash="85d9795d6"}
```

## 配置grafana

- 举例图片
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/58fdb9e57b7d43baac99021109a7cf1d.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/234876ad0b4c47d4a6c3f02a927a5cf8.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/4e765de3d7b1439bb92e17be00b18c6b.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110670000/e31ed3d5e8c84c0eaebf0722ddf8eddb.png)

# 本节重点总结 :

- 打镜像，导出镜像，传输到各个节点并导入
- 运行该项目
- 配置prometheus和grafana

