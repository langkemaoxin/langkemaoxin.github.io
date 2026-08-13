---
title: "19.1 使用k8s的sdk编写一个项目获取pod和node信息"
sidebarGroup: "Prometheus"
shortTitle: "36 19.1 使用k8s的sdk编写一个项目获取..."
order: 36
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 引入k8s sdk获取k8s 的node和pod信息 - 定义相关metrics - 初始化k8s-client - 使用k8s-client get node - 使用k8s-..."
---

> **Prometheus · 第 36 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

