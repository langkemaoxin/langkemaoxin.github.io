---
title: 17.2 ksm源码讲解
sidebarGroup: Prometheus
shortTitle: 33 17.2 ksm源码讲解
order: 33
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - k8s资源对象的 buildStores构造函数注入MetricFamilies - k8s client-go 之 Reflector - listAndWatch 方法 - ...'
---

> **Prometheus · 第 33 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

