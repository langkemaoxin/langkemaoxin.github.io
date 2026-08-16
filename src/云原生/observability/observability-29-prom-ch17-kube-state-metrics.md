---
title: Prometheus 第17章：kube-state-metrics
sidebarGroup: 可观测性
shortTitle: 29 kube-state-metrics
order: 29
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第17章（kube-state-metrics）合并笔记
---

> **Prometheus · 第 17 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 17.1ksm关注指标讲解 pod和node状态的统计

# 本节重点介绍 :

- 主要的应用

  - 看状态
  - 数个数
- 根据13105大盘模板看ksm指标

  - 节点指标
  - pod和容器指标
  - 资源对象按namespace分布指标
  - 其他资源指标

# 主要的应用

1. 看状态，举例图片![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1629624126000/53587b279f564f6b80bcc58a688f23e0.png)
2. 数个数，举例图片![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1629624126000/08462b26da6e440a98d454d5d892c417.png)

# 根据大盘模板 查看指标

- https://grafana.com/grafana/dashboards/13105
- 根据节点表格查看

# 节点指标

## 节点名

- kube_node_info中的 node标签

```shell

kube_node_info{container_runtime_version="containerd://1.4.4", instance="kube-state-metrics:8080", job="kube-state-metrics", kernel_version="3.10.0-957.1.3.el7.x86_64", kubelet_version="v1.20.1", kubeproxy_version="v1.20.1", node="k8s-master01", os_image="CentOS Linux 7 (Core)", pod_cidr="10.100.0.0/24"}
kube_node_info{container_runtime_version="containerd://1.4.4", instance="kube-state-metrics:8080", job="kube-state-metrics", kernel_version="3.10.0-957.1.3.el7.x86_64", kubelet_version="v1.20.1", kubeproxy_version="v1.20.1", node="k8s-node01", os_image="CentOS Linux 7 (Core)", pod_cidr="10.100.1.0/24"}

```

## cpu

### 节点总cpu核数

```shell
kube_node_status_capacity_cpu_cores
```

### 节点上pod cpu请求核数

```shell
sum(kube_pod_container_resource_requests_cpu_cores{}) by (node)

```

### 节点上pod cpu限制核数

```shell
sum(kube_pod_container_resource_limits_cpu_cores{}) by (node)

```

### 节点上 容器cpu使用核数

```shell
sum (rate (container_cpu_usage_seconds_total{id="/"}[2m]))by (node)
```

### 节点上pod cpu请求百分比

```shell
100 *sum(kube_pod_container_resource_requests_cpu_cores{})by (node) / 
sum(kube_node_status_allocatable_cpu_cores{})by (node)
```

### 节点上pod cpu限制百分比

```shell
100 * sum(kube_pod_container_resource_limits_cpu_cores)by (node) 
/ sum(kube_node_status_allocatable_cpu_cores)by (node)

```

### 节点上容器 cpu使用百分比

```shell
100 *sum (rate (container_cpu_usage_seconds_total{id="/"}[2m]))by (node) /
sum (kube_node_status_capacity_cpu_cores)by (node)
```

## mem

### 节点总内存大小

```shell
- kube_node_status_allocatable_memory_bytes

```

### 节点上pod mem请求大小

```shell
sum(kube_pod_container_resource_requests_memory_bytes{}) by (node)
```

### 节点上pod mem限制大小

```shell
sum(kube_pod_container_resource_limits_memory_bytes{}) by (node)
```

### 节点上pod mem使用大小

```shell
sum(container_memory_working_set_bytes{}) by (node)
```

### 节点上pod mem请求百分比

```shell
100 * sum(kube_pod_container_resource_requests_memory_bytes{}) by (node)/
sum(kube_node_status_allocatable_memory_bytes) by(node)
```

### 节点上pod mem限制百分比

```shell

100 * sum(kube_pod_container_resource_limits_memory_bytes{}) by (node)/
sum(kube_node_status_allocatable_memory_bytes) by(node)
```

### 节点上pod mem使用百分比

```shell

100 * sum(container_memory_working_set_bytes{id="/"}) by (node)/
sum(kube_node_status_allocatable_memory_bytes) by(node)
```

## 节点上可分配pod总数

- kube_node_status_allocatable_pods

## 文件系统

### 节点磁盘总量

```shell
sum (container_fs_limit_bytes{device=~"^/dev/.*$",id="/"}) by (node)
```

### 节点磁盘使用总量

```shell
sum (container_fs_usage_bytes{device=~"^/dev/.*$",id="/"}) by (node)
```

### 使用率

```shell
100 *  sum (container_fs_usage_bytes{device=~"^/dev/.*$",id="/"}) by (node)/
sum (container_fs_usage_bytes{device=~"^/dev/.*$",id="/"}) by (node)
```

## id="/"的容器含义

- 代码位置 D:\go_path\pkg\mod\github.com\google\cadvisor@v0.38.7\manager\manager.go

```go
	// Create root and then recover all containers.
	err = m.createContainer("/", watcher.Raw)
	if err != nil {
		return err
	}
```

- 含义是id="/"代表所有的有的容器和

## node  指标表格

| 指标名                                    | 类型  | 含义                                                                                                                    |
| ----------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| kube_node_status_condition                | gauge | condition:`<br>` NetworkUnavailable `<br>` MemoryPressure `<br>` DiskPressure `<br>` PIDPressure `<br>` Ready |
| kube_node_status_allocatable_cpu_cores    | gauge | 节点可以分配cpu核数                                                                                                     |
| kube_node_status_allocatable_memory_bytes | gauge | 节点可以分配内存总量(单位：字节)                                                                                        |
| kube_node_spec_taint                      | gauge | 节点污点情况                                                                                                            |
| kube_node_status_capacity_memory_bytes    | gauge | 节点内存总量(单位：字节)                                                                                                |
| kube_node_status_capacity_cpu_cores       | gauge | 节点cpu核数                                                                                                             |
| kube_node_status_capacity_pods            | gauge | 节点可运行的pod总数                                                                                                     |

# pod指标

## pod状态

### 运行的pod

```shell
sum(kube_pod_status_phase{phase="Running"})
```

### pending的pod

```shell
sum(kube_pod_status_phase{ phase="Pending"})
```

### Failed的pod

```shell
sum(kube_pod_status_phase{ phase="Failed"})
```

## 容器状态

### Running的容器

```shell
sum(kube_pod_container_status_running{})
```

### pod处于waiting状态原因

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1629624126000/bc1fa014187d469ba431af64be784614.png)

```shell
kube_pod_container_status_waiting_reason==1
```

### pod处于terminated状态原因

```shell
kube_pod_container_status_terminated_reason==1
```

### 最近重启过的容器

```shell
delta(kube_pod_container_status_restarts_total[1m])>0
```

## pod和 container指标表格

| 指标名                                            | 类型    | 含义                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| kube_pod_status_phase                             | gauge   | pod状态统计:`<br>`  Pending `<br>` Succeeded `<br>` Failed `<br>` Running `<br>` Unknown                                                                                                                                                           |
| kube_pod_container_status_waiting                 | counter | pod处于waiting状态，值为1代表waiting                                                                                                                                                                                                                         |
| kube_pod_container_status_waiting_reason          | gauge   | pod处于waiting状态原因 `<br>` ContainerCreating `<br>`CrashLoopBackOff  pod启动崩溃,再次启动然后再次崩溃 `<br>`CreateContainerConfigError `<br>`ErrImagePull `<br>`ImagePullBackOff `<br>`CreateContainerError `<br>`InvalidImageName `<br>` |
| kube_pod_container_status_terminated              | gauge   | pod处于terminated状态，值为1代表terminated                                                                                                                                                                                                                   |
| kube_pod_container_status_terminated_reason       | gauge   | pod处于terminated状态原因 `<br>` 	OOMKilled `<br>` Completed `<br>` Error `<br>` ContainerCannotRun `<br>` DeadlineExceeded `<br>` Evicted `<br>`                                                                                              |
| kube_pod_container_status_restarts_total          | counter | pod中的容器重启次数                                                                                                                                                                                                                                          |
| kube_pod_container_resource_requests_cpu_cores    | gauge   | pod容器cpu limit                                                                                                                                                                                                                                             |
| kube_pod_container_resource_requests_memory_bytes | gauge   | pod容器mem limit(单位:字节)                                                                                                                                                                                                                                  |

# 根据命名空间明细表格 数资源个数

## 资源按ns分布

### pod数

```shell
count(kube_pod_info{}) by (namespace)
```

### 容器数

```shell
count(kube_pod_container_info{}) by (namespace)

```

### svc数

```shell
count(kube_service_info{}) by (namespace)
```

### svc数

```shell
count(kube_service_info{}) by (namespace)
```

### secret数

```shell
count(kube_secret_info{}) by (namespace)
```

### configmap数

```shell
count(kube_configmap_info{}) by (namespace)
```

# 其他资源对象指标表格

## deployment  metrics

| 指标名                                      | 类型  | 含义                  |
| ------------------------------------------- | ----- | --------------------- |
| kube_deployment_status_replicas             | gauge | dep中的pod num        |
| kube_deployment_status_replicas_available   | gauge | dep中的 可用pod num   |
| kube_deployment_status_replicas_unavailable | gauge | dep中的 不可用pod num |

## daemonSet  metrics

| 指标名                                         | 类型  | 含义                     |
| ---------------------------------------------- | ----- | ------------------------ |
| kube_daemonset_status_number_available         | gauge | ds 可用数                |
| kube_daemonset_status_number_unavailable       | gauge | ds 不可用数              |
| kube_daemonset_status_number_ready             | gauge | ds ready数               |
| kube_daemonset_status_number_misscheduled      | gauge | 未经过调度运行ds的节点数 |
| kube_daemonset_status_current_number_scheduled | gauge | ds目前运行节点数         |
| kube_daemonset_status_desired_number_scheduled | gauge | 应该运行ds的节点数       |

## statefulSet  metrics

| 指标名                                   | 类型  | 含义           |
| ---------------------------------------- | ----- | -------------- |
| kube_statefulset_status_replicas         | gauge | ss副本总数     |
| kube_statefulset_status_replicas_current | gauge | ss当前副本数   |
| kube_statefulset_status_replicas_updated | gauge | ss已更新副本数 |
| kube_statefulset_replicas                | gauge | ss目标副本数   |

## Job   metrics

| 指标名                    | 类型  | 含义              |
| ------------------------- | ----- | ----------------- |
| kube_job_status_active    | gauge | job running pod数 |
| kube_job_status_succeeded | gauge | job 成功 pod数    |
| kube_job_status_failed    | gauge | job 失败 pod数    |
| kube_job_complete         | gauge | job 是否完成      |
| kube_job_failed           | gauge | job 是否失败      |

## CronJob   metrics

| 指标名                                 | 类型  | 含义              |
| -------------------------------------- | ----- | ----------------- |
| kube_cronjob_status_active             | gauge | job running pod数 |
| kube_cronjob_spec_suspend              | gauge | =1代表 job 被挂起 |
| kube_cronjob_next_schedule_time        | gauge | job 下次调度时间  |
| kube_cronjob_status_last_schedule_time | gauge | job 下次调度时间  |

## PersistentVolume    metrics

| 指标名                               | 类型  | 含义                                                                                                 |
| ------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------- |
| kube_persistentvolume_capacity_bytes | gauge | pv申请大小                                                                                           |
| kube_persistentvolume_status_phase   | gauge | pv状态:`<br>` Pending `<br>` Available `<br>` Bound `<br>` Released `<br>` Failed `<br>` |

## PersistentVolumeClaim     metrics

| 指标名                                                     | 类型  | 含义                                                  |
| ---------------------------------------------------------- | ----- | ----------------------------------------------------- |
| kube_persistentvolumeclaim_resource_requests_storage_bytes | gauge | pvc request大小                                       |
| kube_persistentvolumeclaim_status_phase                    | gauge | pvc状态:`<br>` Lost `<br>` Bound `<br>` Pending |

# 本节重点总结:

- 主要的应用

  - 看状态
  - 数个数
- 根据13105大盘模板看ksm指标

  - 节点指标
  - pod和容器指标
  - 资源对象按namespace分布指标
  - 其他资源指标

## 17.2 ksm源码讲解

# 本节重点介绍 :

- k8s资源对象的 buildStores构造函数注入MetricFamilies
- k8s client-go 之 Reflector
  - listAndWatch 方法
  - watchHandler 监听更新，调用add等action

## 架构图总结

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110131000/bc34dba18b154bd5abb2f6e99ffc013e.png)

# 项目地址

- [地址](https://github.com/kubernetes/kube-state-metrics)

## go get

```shell
 go get -v  -d  k8s.io/kube-state-metrics/v2@v2.1.1

```

# 源码分析

## main.go 中的主流程

- 位置 D:\go_path\pkg\mod\k8s.io\kube-state-metrics\v2@v2.1.1\main.go

### 初始化store.Builder

```go
	storeBuilder := store.NewBuilder()

```

### 注册registery

```go
	ksmMetricsRegistry := prometheus.NewRegistry()
	ksmMetricsRegistry.MustRegister(version.NewCollector("kube_state_metrics"))
	durationVec := promauto.With(ksmMetricsRegistry).NewHistogramVec(
		prometheus.HistogramOpts{
			Name:        "http_request_duration_seconds",
			Help:        "A histogram of requests for kube-state-metrics metrics handler.",
			Buckets:     prometheus.DefBuckets,
			ConstLabels: prometheus.Labels{"handler": "metrics"},
		}, []string{"method"},
	)
	storeBuilder.WithMetrics(ksmMetricsRegistry)
```

### 解析命令行中启用的resource

```go
	var resources []string
	if len(opts.Resources) == 0 {
		klog.Info("Using default resources")
		resources = options.DefaultResources.AsSlice()
	} else {
		klog.Infof("Using resources %s", opts.Resources.String())
		resources = opts.Resources.AsSlice()
	}
```

- 如果没有指定就用默认的 ，位置 D:\go_path\pkg\mod\k8s.io\kube-state-metrics\v2@v2.1.1\pkg\options\resource.go

```go
	// DefaultResources represents the default set of resources in kube-state-metrics.
	DefaultResources = ResourceSet{
		"certificatesigningrequests":      struct{}{},
		"configmaps":                      struct{}{},
		"cronjobs":                        struct{}{},
		"daemonsets":                      struct{}{},
		"deployments":                     struct{}{},
		"endpoints":                       struct{}{},
		"horizontalpodautoscalers":        struct{}{},
		"ingresses":                       struct{}{},
		"jobs":                            struct{}{},
		"leases":                          struct{}{},
		"limitranges":                     struct{}{},
		"mutatingwebhookconfigurations":   struct{}{},
		"namespaces":                      struct{}{},
		"networkpolicies":                 struct{}{},
		"nodes":                           struct{}{},
		"persistentvolumes":               struct{}{},
		"persistentvolumeclaims":          struct{}{},
		"poddisruptionbudgets":            struct{}{},
		"pods":                            struct{}{},
		"replicasets":                     struct{}{},
		"replicationcontrollers":          struct{}{},
		"resourcequotas":                  struct{}{},
		"secrets":                         struct{}{},
		"services":                        struct{}{},
		"statefulsets":                    struct{}{},
		"storageclasses":                  struct{}{},
		"validatingwebhookconfigurations": struct{}{},
		"volumeattachments":               struct{}{},
	}
```

### 解析命令行中的启用的namespace

```go
	if len(opts.Namespaces) == 0 {
		klog.Info("Using all namespace")
		storeBuilder.WithNamespaces(options.DefaultNamespaces)
	} else {
		if opts.Namespaces.IsAllNamespaces() {
			klog.Info("Using all namespace")
		} else {
			klog.Infof("Using %s namespaces", opts.Namespaces)
		}
		storeBuilder.WithNamespaces(opts.Namespaces)
	}
```

- 如果没传入，则采集所有namespace的资源对象

### 根据命令行传入的 metrics 黑白名单进行设置

```go
	allowDenyList, err := allowdenylist.New(opts.MetricAllowlist, opts.MetricDenylist)
	if err != nil {
		klog.Fatal(err)
	}

	err = allowDenyList.Parse()
	if err != nil {
		klog.Fatalf("error initializing the allowdeny list : %v", err)
	}

	klog.Infof("metric allow-denylisting: %v", allowDenyList.Status())

	storeBuilder.WithAllowDenyList(allowDenyList)
```

### 最为关键的一步

- 具体干什么先不讲，先跳过

```go
storeBuilder.WithGenerateStoresFunc(storeBuilder.DefaultGenerateStoresFunc())
```

### 创建kubeClient

```go
	kubeClient, vpaClient, err := createKubeClient(opts.Apiserver, opts.Kubeconfig)
	if err != nil {
		klog.Fatalf("Failed to create client: %v", err)
	}
	storeBuilder.WithKubeClient(kubeClient)
```

#### 根据apiserver地址+kubeconfig配置文件创建 或者 使用 restclient.InClusterConfig创建client

- 位置 D:\go_path\pkg\mod\k8s.io\client-go@v0.21.2\tools\clientcmd\client_config.go

```go
func BuildConfigFromFlags(masterUrl, kubeconfigPath string) (*restclient.Config, error) {
	if kubeconfigPath == "" && masterUrl == "" {
		klog.Warning("Neither --kubeconfig nor --master was specified.  Using the inClusterConfig.  This might not work.")
		kubeconfig, err := restclient.InClusterConfig()
		if err == nil {
			return kubeconfig, nil
		}
		klog.Warning("error creating inClusterConfig, falling back to default config: ", err)
	}
	return NewNonInteractiveDeferredLoadingClientConfig(
		&ClientConfigLoadingRules{ExplicitPath: kubeconfigPath},
		&ConfigOverrides{ClusterInfo: clientcmdapi.Cluster{Server: masterUrl}}).ClientConfig()
}
```

- 默认不传apiserver地址信息，采用inclusterconfig方式创建，启动日志如下

```shell
W0820 04:31:20.664175       1 client_config.go:543] Neither --kubeconfig nor --master was specified.  Using the inClusterConfig.  This might not work.
```

- inclusterconfig方式验证 sa和token

### oklogrun 启动metrichandler

```go
	var g run.Group

	m := metricshandler.New(
		opts,
		kubeClient,
		storeBuilder,
		opts.EnableGZIPEncoding,
	)
	// Run MetricsHandler
	{
		ctxMetricsHandler, cancel := context.WithCancel(ctx)
		g.Add(func() error {
			return m.Run(ctxMetricsHandler)
		}, func(error) {
			cancel()
		})
	}
```

### metricshandler run

- 位置 D:\go_path\pkg\mod\k8s.io\kube-state-metrics\v2@v2.1.1\pkg\metricshandler\metrics_handler.go

```go
func (m *MetricsHandler) Run(ctx context.Context) error {
	autoSharding := len(m.opts.Pod) > 0 && len(m.opts.Namespace) > 0

	if !autoSharding {
		klog.Info("Autosharding disabled")
		m.ConfigureSharding(ctx, m.opts.Shard, m.opts.TotalShards)
		<-ctx.Done()
		return ctx.Err()
	}
```

- 默认不开启分片，执行m.ConfigureSharding

```go
func (m *MetricsHandler) ConfigureSharding(ctx context.Context, shard int32, totalShards int) {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	if m.cancel != nil {
		m.cancel()
	}
	if totalShards != 1 {
		klog.Infof("configuring sharding of this instance to be shard index %d (zero-indexed) out of %d total shards", shard, totalShards)
	}
	ctx, m.cancel = context.WithCancel(ctx)
	m.storeBuilder.WithSharding(shard, totalShards)
	m.storeBuilder.WithContext(ctx)
	m.metricsWriters = m.storeBuilder.Build()
	m.curShard = shard
	m.curTotalShards = totalShards
}
```

- 这里会根据 storeBuilder执行Build方法

## 请求metric时对应的serveHttp方法

- 位置 D:\go_path\pkg\mod\k8s.io\kube-state-metrics\v2@v2.1.1\pkg\metricshandler\metrics_handler.go

```go
func (m *MetricsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	m.mtx.RLock()
	defer m.mtx.RUnlock()
	resHeader := w.Header()
	var writer io.Writer = w

	resHeader.Set("Content-Type", `text/plain; version=`+"0.0.4")

	if m.enableGZIPEncoding {
		// Gzip response if requested. Taken from
		// github.com/prometheus/client_golang/prometheus/promhttp.decorateWriter.
		reqHeader := r.Header.Get("Accept-Encoding")
		parts := strings.Split(reqHeader, ",")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part == "gzip" || strings.HasPrefix(part, "gzip;") {
				writer = gzip.NewWriter(writer)
				resHeader.Set("Content-Encoding", "gzip")
			}
		}
	}

	for _, w := range m.metricsWriters {
		w.WriteAll(writer)
	}

	// In case we gzipped the response, we have to close the writer.
	if closer, ok := writer.(io.Closer); ok {
		closer.Close()
	}
}

```

- 其中最关键的是,遍历 m.metricsWriters 调用WriteAll

```go
	for _, w := range m.metricsWriters {
		w.WriteAll(writer)
	}
```

## metricsWriters是何方神圣

- 是在ConfigureSharding中执行的m.storeBuilder.Build()

```go
m.metricsWriters = m.storeBuilder.Build()
```

## m.storeBuilder.Build()

- 位置 D:\go_path\pkg\mod\k8s.io\kube-state-metrics\v2@v2.1.1\internal\store\builder.go

```go
// Build initializes and registers all enabled stores.
// It returns metrics writers which can be used to write out
// metrics from the stores.
func (b *Builder) Build() []metricsstore.MetricsWriter {
	if b.allowDenyList == nil {
		panic("allowDenyList should not be nil")
	}

	var metricsWriters []metricsstore.MetricsWriter
	var activeStoreNames []string

	for _, c := range b.enabledResources {
		constructor, ok := availableStores[c]
		if ok {
			stores := constructor(b)
			activeStoreNames = append(activeStoreNames, c)
			if len(stores) == 1 {
				metricsWriters = append(metricsWriters, stores[0])
			} else {
				metricsWriters = append(metricsWriters, metricsstore.NewMultiStoreMetricsWriter(stores))
			}
		}
	}

	klog.Infof("Active resources: %s", strings.Join(activeStoreNames, ","))

	return metricsWriters
}
```

- 其中的核心就是遍历 availableStores，执行他们的 buildXXXXStore函数
- 比如 configmap对应的就是

```go
	"configmaps":                      func(b *Builder) []*metricsstore.MetricsStore { return b.buildConfigMapStores() },
```

- 对应就是

```go
func (b *Builder) buildConfigMapStores() []*metricsstore.MetricsStore {
	return b.buildStoresFunc(configMapMetricFamilies, &v1.ConfigMap{}, createConfigMapListWatch)
}
```

- 看到这里发现每个资源对象都会调用 b.buildStoresFunc 注入MetricFamilies

## b.buildStoresFunc

- 这个buildStoresFunc 对应的就是main中

```go
	storeBuilder.WithGenerateStoresFunc(storeBuilder.DefaultGenerateStoresFunc())

```

- 底层是 buildStores这个函数

```go
func (b *Builder) buildStores(
	metricFamilies []generator.FamilyGenerator,
	expectedType interface{},
	listWatchFunc func(kubeClient clientset.Interface, ns string) cache.ListerWatcher,
) []*metricsstore.MetricsStore {
	metricFamilies = generator.FilterMetricFamilies(b.allowDenyList, metricFamilies)
	composedMetricGenFuncs := generator.ComposeMetricGenFuncs(metricFamilies)
	familyHeaders := generator.ExtractMetricFamilyHeaders(metricFamilies)

	if isAllNamespaces(b.namespaces) {
		store := metricsstore.NewMetricsStore(
			familyHeaders,
			composedMetricGenFuncs,
		)
		listWatcher := listWatchFunc(b.kubeClient, v1.NamespaceAll)
		b.startReflector(expectedType, store, listWatcher)
		return []*metricsstore.MetricsStore{store}
	}

	stores := make([]*metricsstore.MetricsStore, 0, len(b.namespaces))
	for _, ns := range b.namespaces {
		store := metricsstore.NewMetricsStore(
			familyHeaders,
			composedMetricGenFuncs,
		)
		listWatcher := listWatchFunc(b.kubeClient, ns)
		b.startReflector(expectedType, store, listWatcher)
		stores = append(stores, store)
	}

	return stores
}

```

## 每种资源都会调用这个 buildStores函数

```go
func (b *Builder) buildConfigMapStores() []*metricsstore.MetricsStore {
	return b.buildStoresFunc(configMapMetricFamilies, &v1.ConfigMap{}, createConfigMapListWatch)
}

```

> 传入三个参数

- metrics的metricFamilies信息
- 资源对象结构体
- 资源对象对应的 ListWatch方法

## composedMetricGenFuncs metrics gen方法

- 生成一个metricGen的方法
- 然后构造一个MetricsStore

```go
		store := metricsstore.NewMetricsStore(
			familyHeaders,
			composedMetricGenFuncs,
		)
```

- 构造一个listWatcher，一并传入 startReflector

```go
		listWatcher := listWatchFunc(b.kubeClient, v1.NamespaceAll)
		b.startReflector(expectedType, store, listWatcher)
```

## reflector用来watch特定的k8s API资源

```go
func (b *Builder) startReflector(
	expectedType interface{},
	store cache.Store,
	listWatcher cache.ListerWatcher,
) {
	instrumentedListWatch := watch.NewInstrumentedListerWatcher(listWatcher, b.listWatchMetrics, reflect.TypeOf(expectedType).String())
	reflector := cache.NewReflector(sharding.NewShardedListWatch(b.shard, b.totalShards, instrumentedListWatch), expectedType, store, 0)
	go reflector.Run(b.ctx.Done())
}
```

## metrics 更新

- D:\go_path\pkg\mod\k8s.io\kube-state-metrics\v2@v2.1.1\pkg\metrics_store\metrics_store.go

```go
func (s *MetricsStore) Add(obj interface{}) error {
	o, err := meta.Accessor(obj)
	if err != nil {
		return err
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	families := s.generateMetricsFunc(obj)
	familyStrings := make([][]byte, len(families))

	for i, f := range families {
		familyStrings[i] = f.ByteSlice()
	}

	s.metrics[o.GetUID()] = familyStrings

	return nil
}

```

- 当有对象更新时，会调用generateMetricsFunc生成对应的指标，塞入map中

## k8s 的client-go reflector.watchHandler 监听到资源变化时 调用add

- 源码位置 D:\go_path\pkg\mod\k8s.io\client-go@v0.21.2\tools\cache\reflector.go

```go
// watchHandler watches w and keeps *resourceVersion up to date.
func (r *Reflector) watchHandler(start time.Time, w watch.Interface, resourceVersion *string, errc chan error, stopCh <-chan struct{}) error {
	eventCount := 0

	// Stopping the watcher should be idempotent and if we return from this function there's no way
	// we're coming back in with the same watch interface.
	defer w.Stop()

loop:
	for {
		select {
		case <-stopCh:
			return errorStopRequested
		case err := <-errc:
			return err
		case event, ok := <-w.ResultChan():
			if !ok {
				break loop
			}
			if event.Type == watch.Error {
				return apierrors.FromObject(event.Object)
			}
			if r.expectedType != nil {
				if e, a := r.expectedType, reflect.TypeOf(event.Object); e != a {
					utilruntime.HandleError(fmt.Errorf("%s: expected type %v, but watch event object had type %v", r.name, e, a))
					continue
				}
			}
			if r.expectedGVK != nil {
				if e, a := *r.expectedGVK, event.Object.GetObjectKind().GroupVersionKind(); e != a {
					utilruntime.HandleError(fmt.Errorf("%s: expected gvk %v, but watch event object had gvk %v", r.name, e, a))
					continue
				}
			}
			meta, err := meta.Accessor(event.Object)
			if err != nil {
				utilruntime.HandleError(fmt.Errorf("%s: unable to understand watch event %#v", r.name, event))
				continue
			}
			newResourceVersion := meta.GetResourceVersion()
			switch event.Type {
			case watch.Added:
				err := r.store.Add(event.Object)
				if err != nil {
					utilruntime.HandleError(fmt.Errorf("%s: unable to add watch event object (%#v) to store: %v", r.name, event.Object, err))
				}
			case watch.Modified:
				err := r.store.Update(event.Object)
				if err != nil {
					utilruntime.HandleError(fmt.Errorf("%s: unable to update watch event object (%#v) to store: %v", r.name, event.Object, err))
				}
			case watch.Deleted:
				// TODO: Will any consumers need access to the "last known
				// state", which is passed in event.Object? If so, may need
				// to change this.
				err := r.store.Delete(event.Object)
				if err != nil {
					utilruntime.HandleError(fmt.Errorf("%s: unable to delete watch event object (%#v) from store: %v", r.name, event.Object, err))
				}
			case watch.Bookmark:
				// A `Bookmark` means watch has synced here, just update the resourceVersion
			default:
				utilruntime.HandleError(fmt.Errorf("%s: unable to understand watch event %#v", r.name, event))
			}
			*resourceVersion = newResourceVersion
			r.setLastSyncResourceVersion(newResourceVersion)
			if rvu, ok := r.store.(ResourceVersionUpdater); ok {
				rvu.UpdateResourceVersion(newResourceVersion)
			}
			eventCount++
		}
	}

	watchDuration := r.clock.Since(start)
	if watchDuration < 1*time.Second && eventCount == 0 {
		return fmt.Errorf("very short watch: %s: Unexpected watch close - watch lasted less than a second and no items received", r.name)
	}
	klog.V(4).Infof("%s: Watch close - %v total %v items received", r.name, r.expectedTypeName, eventCount)
	return nil
}
```

## 架构图总结

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110131000/8b4831b580e44f059991e57a280a047d.png)

# 本节重点介绍 :

- k8s资源对象的 buildStores构造函数注入MetricFamilies
- k8s client-go 之 Reflector
  - listAndWatch 方法
  - watchHandler 监听更新，调用add等action

