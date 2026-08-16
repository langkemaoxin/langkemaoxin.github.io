---
title: Prometheus 第18章：APIServer 监控
sidebarGroup: 可观测性
shortTitle: 30 APIServer 监控
order: 30
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第18章（APIServer 监控）合并笔记
---

> **Prometheus · 第 18 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 18.1 k8s服务组件之4大黄金指标讲解

# 本节重点介绍 :

- 监控4大黄金指标
  - Latency：延时
  - Utilization：使用率
  - Saturation：饱和度
  - Errors：错误数或错误率
- apiserver指标
  - 400、500错误qps
  - 访问延迟
  - 队列深度
- etcd指标
- kube-scheduler和kube-controller-manager

# 监控4大黄金指标

> Google的Google SRE Books一书中提出了系统监控的四个黄金指标

- Latency：延时
- Utilization：使用率
- Saturation：饱和度
- Errors：错误数或错误率

## 为什么是这4个

- 这个四个黄金指标在在任何系统中都是很好的性能状态指标
- 他们之所以被称为”黄金“指标，很大一个因素是因为他们反映了终端用户的感知
- 因此任何监控系统都会提供被监控对象的这些指标或其变形，并在此基础上辅助

## 两种系统分类

- 资源提供系统 ： 对外提供简单的资源，比如CPU（计算资源），存储，网络带宽
- 服务提供系统 ： 对外提供更高层次与业务相关的任务处理能力，比如订票，购物等等

## 站在资源角度分析

- Utilization ：往往体现为资源使用的百分比
- Saturation ： 资源使用的饱和度或过载程度，过载的系统往往意味着系统需要辅助的排队系统完成相关任务
  - 以CPU为例，Utilization往往是CPU的使用百分比
  - Saturation则是当前等待调度CPU的线程或进程队列长度
- Errors : 这个可能是使用资源的出错率或出错数量，比如网络的丢包率或误码率等等

## 站在服务角度分析

- Rate ： 单位时间内完成服务请求的能力
- Errors ： 错误率或错误数量：单位时间内服务出错的比列或数量
- Duration ： 平均单次服务的持续时长（或用户得到服务响应的时延）

# k8s服务组件服务组件指标

> 站在k8s集群管理员的角度，服务组件的健康状况需要额外的关注。

## apiserver指标

> apiserver作为k8s中消息总线

### 成功率和qps

- 请求成功率 ：`apiserver_request_total`代表apiserver的请求计数器，所以我们可以使用下面promql来计算apiserver请求成功的qps。

```shell
sum(rate(apiserver_request_total{job="kubernetes-apiservers",code=~"2.."}[5m]))
```

- 成功率低于95%的告警 ： 响应=2xx的qps除以总的qps就是apiserver的请求成功率
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110304000/57ba3695433f4930b8edc9d92e7b04f6.png)

```shell
100 * sum(rate(apiserver_request_total{job="kubernetes-apiservers",code=~"2.."}[5m])) /sum(rate(apiserver_request_total{job="kubernetes-apiservers"}[5m]))
```

- 同理也可以关注4xx和5xx的错误qps，表达式如下

```shell
sum(rate(apiserver_request_total{job="kubernetes-apiservers",code=~"[45].."}[5m]))
```

- 错误的qps过高，可能是服务组件有问题，需要尽快排查。

### 延迟

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110304000/6cb86ae70aeb4c68be4c7a687ea38bbd.png)

- 对于延迟，可以使用下面的表达式计算。

```shell
histogram_quantile(0.99, sum(rate(apiserver_request_duration_seconds_bucket{job="kubernetes-apiservers"}[5m])) by (verb, le))
```

- 可以得到各个http的请求方法的99分位延迟值。

```shell
{verb="WATCH"}	60
{verb="DELETE"}	NaN
{verb="PATCH"}	0.0495
{verb="PUT"}	0.08797499999999975
{verb="GET"}	0.06524999999999985
{verb="LIST"}	0.09421428571428572
{verb="POST"}	0.0495
```

- 如果99分位延迟值很高，可能是apiserver处理能力达到上限，可以考虑扩容一下。

### 饱和度

- 对于饱和度可以查看apiserver请求队列的情况，如`apiserver_current_inqueue_requests`很大的话，说明排队严重。
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110304000/bdd3e7b1a47649b8ab8000b08dbaf72a.png)

## etcd指标

> etcd作为k8s中元信息存储的数据库也需要额外关注下

- etcd存储文件大小相关指标，比如`etcd_db_total_size_in_bytes`表征db物理文件大小。
- 使用下面表达式可以得到etcd存储空间使用率： 当前使用量/配额。如果使用率大于80%需要扩容

```shell
(etcd_mvcc_db_total_size_in_bytes / etcd_server_quota_backend_bytes)*100

```

- 关于etcd的网络流量可以使用下面两个指标表示。

```shell
# 代表client调etcd的流量。
etcd_network_client_grpc_received_bytes_total
# 代表etcd发送的流量。
etcd_network_client_grpc_sent_bytes_total
```

- etcd中存储key和相关key操作的qps指标，如`etcd_debugging_mvcc_keys_total`代表etcd中存储的key总数，数量太多也会影响性能。
- 同时关于etcd key的操作的qps，`rate(etcd_debugging_mvcc_put_total[1m])`代表put的qps，同理`rate(etcd_debugging_mvcc_delete_total[1m])`代表删除的qps。
- 存储的fsync刷盘99分位延迟可以使用下面的分位值计算得到
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110304000/6d4c30a2e0e44742a412e4f7f6f6f55c.png)

```shell
histogram_quantile(0.99, sum(rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])) by (instance, le))

```

## kube-scheduler和kube-controller-manager

> kube-scheduler是调度器，所以有关调度成功统计的指标都应被关注。

- 如`scheduler_pod_scheduling_attempts_sum/scheduler_pod_scheduling_attempts_count`代表成功调度一个pod 的平均尝试次数。如果尝试次数过高，可能当前node剩余量不多，或者集群出错，建议排查下。
- 如`histogram_quantile(0.99, sum(rate(scheduler_pod_scheduling_duration_seconds_bucket[5m])) by ( le))` 代码pod调度的99分位延迟，如果过高，考虑schduler压力大或者其他原因。

> 在kube-controller-manager负责集群内的 Node、Pod 等所有资源的管理。

- 如`rate(workqueue_adds_total[2m])`表征工作队列新增的qps，其实就是请求的qps，太高考虑压力大。
- 如`histogram_quantile(0.99, sum(rate(rest_client_request_latency_seconds_bucket{job="kube-controller-manager"}[5m])) by (verb, url, le))"`，可以查看和apiserver通信的延迟99分位值，太高考虑扩容下apiserver。

# 本节重点总结 :

- 监控4大黄金指标
  - Latency：延时
  - Utilization：使用率
  - Saturation：饱和度
  - Errors：错误数或错误率
- apiserver指标
  - 400、500错误qps
  - 访问延迟
  - 队列深度
- etcd指标
- kube-scheduler和kube-controller-manager

## 18.2 k8s-apiserver监控源码解读

# 本节重点介绍 :

- k8s代码库和模块地址

  - 下载 apiserver源码
- apiserver中监控源码阅读

# k8s源码地址分布

## k8s代码库

- 访问github上k8s仓库，readme中给出了k8s 模块的代码地址
- 举例图片
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110338000/cd0ebb69005b4a10b3175ea5210bbfa8.png)

### 组件仓库列表 [地址](https://github.com/kubernetes/kubernetes/blob/master/staging/README.md)

Repositories currently staged here:

- [`k8s.io/api`](https://github.com/kubernetes/api)
- [`k8s.io/apiextensions-apiserver`](https://github.com/kubernetes/apiextensions-apiserver)
- [`k8s.io/apimachinery`](https://github.com/kubernetes/apimachinery)
- [`k8s.io/apiserver`](https://github.com/kubernetes/apiserver)
- [`k8s.io/cli-runtime`](https://github.com/kubernetes/cli-runtime)
- [`k8s.io/client-go`](https://github.com/kubernetes/client-go)
- [`k8s.io/cloud-provider`](https://github.com/kubernetes/cloud-provider)
- [`k8s.io/cluster-bootstrap`](https://github.com/kubernetes/cluster-bootstrap)
- [`k8s.io/code-generator`](https://github.com/kubernetes/code-generator)
- [`k8s.io/component-base`](https://github.com/kubernetes/component-base)
- [`k8s.io/controller-manager`](https://github.com/kubernetes/controller-manager)
- [`k8s.io/cri-api`](https://github.com/kubernetes/cri-api)
- [`k8s.io/csi-api`](https://github.com/kubernetes/csi-api)
- [`k8s.io/csi-translation-lib`](https://github.com/kubernetes/csi-translation-lib)
- [`k8s.io/kube-aggregator`](https://github.com/kubernetes/kube-aggregator)
- [`k8s.io/kube-controller-manager`](https://github.com/kubernetes/kube-controller-manager)
- [`k8s.io/kube-proxy`](https://github.com/kubernetes/kube-proxy)
- [`k8s.io/kube-scheduler`](https://github.com/kubernetes/kube-scheduler)
- [`k8s.io/kubectl`](https://github.com/kubernetes/kubectl)
- [`k8s.io/kubelet`](https://github.com/kubernetes/kubelet)
- [`k8s.io/legacy-cloud-providers`](https://github.com/kubernetes/legacy-cloud-providers)
- [`k8s.io/metrics`](https://github.com/kubernetes/metrics)
- [`k8s.io/mount-utils`](https://github.com/kubernetes/mount-utils)
- [`k8s.io/pod-security-admission`](https://github.com/kubernetes/pod-security-admission)
- [`k8s.io/sample-apiserver`](https://github.com/kubernetes/sample-apiserver)
- [`k8s.io/sample-cli-plugin`](https://github.com/kubernetes/sample-cli-plugin)
- [`k8s.io/sample-controller`](https://github.com/kubernetes/sample-controller)

## 下载 apiserver 源码

```shell
go get -d  k8s.io/apiserver

```

# 分析apiserver 监控源码

## 以qps指标 apiserver_request_total为例

### 定位源码位置

- 在源码目录全文搜索`apiserver_request_total`，选择.go文件
- 举例图片
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110338000/0b04af9c6eed47d6aab11648b50c3e23.png)
- 发现位于 D:\go_path\pkg\mod\k8s.io\apiserver@v0.22.1\pkg\endpoints\metrics\metrics.go

```go
	requestCounter = compbasemetrics.NewCounterVec(
		&compbasemetrics.CounterOpts{
			Name:           "apiserver_request_total",
			Help:           "Counter of apiserver requests broken out for each verb, dry run value, group, version, resource, scope, component, and HTTP response code.",
			StabilityLevel: compbasemetrics.STABLE,
		},
		[]string{"verb", "dry_run", "group", "version", "resource", "subresource", "scope", "component", "code"},
	)
```

- 分析，在这里定义了指标，并且指定了相关的标签，可以和我们在prometheus中查询到的结果匹配上

```shell

apiserver_request_total{code="0", component="apiserver", contentType="application/json", group="apiregistration.k8s.io", instance="172.20.70.205:6443", job="kubernetes-apiservers", resource="apiservices", scope="cluster", verb="WATCH", version="v1beta1"}
9014
apiserver_request_total{code="0", component="apiserver", contentType="application/json", group="apps", instance="172.20.70.205:6443", job="kubernetes-apiservers", resource="daemonsets", scope="cluster", verb="WATCH", version="v1"}
8863
apiserver_request_total{code="0", component="apiserver", contentType="application/json", group="apps", instance="172.20.70.205:6443", job="kubernetes-apiservers", resource="deployments", scope="cluster", verb="WATCH", version="v1"}
8830
apiserver_request_total{code="0", component="apiserver", contentType="application/json", group="crd.projectcalico.org", instance="172.20.70.205:6443", job="kubernetes-apiservers", resource="bgpconfigurations", scope="cluster", verb="WATCH", version="v1"}
5575
apiserver_request_total{code="0", component="apiserver", contentType="application/json", group="crd.projectcalico.org", instance="172.20.70.205:6443", job="kubernetes-apiservers", resource="bgppeers", scope="cluster", verb="WATCH", version="v1"}
2791
apiserver_request_total{code="0", component="apiserver", contentType="application/json", group="crd.projectcalico.org", instance="172.20.70.205:6443", job="kubernetes-apiservers", resource="blockaffinities", scope="cluster", verb="WATCH", version="v1"}
2942
apiserver_request_total{code="0", component="apiserver", contentType="application/json", group="crd.projectcalico.org", instance="172.20.70.205:6443", job="kubernetes-apiservers", resource="clusterinformations", scope="cluster", verb="WATCH", version="v1"}
2770
```

### 处理请求的metric 函数 MonitorRequest

- 代码位置 D:\go_path\pkg\mod\k8s.io\apiserver@v0.22.1\pkg\endpoints\metrics\metrics.go
- 源码如下

```go
// MonitorRequest handles standard transformations for client and the reported verb and then invokes Monitor to record
// a request. verb must be uppercase to be backwards compatible with existing monitoring tooling.
func MonitorRequest(req *http.Request, verb, group, version, resource, subresource, scope, component string, deprecated bool, removedRelease string, httpCode, respSize int, elapsed time.Duration) {
	// We don't use verb from <requestInfo>, as this may be propagated from
	// InstrumentRouteFunc which is registered in installer.go with predefined
	// list of verbs (different than those translated to RequestInfo).
	// However, we need to tweak it e.g. to differentiate GET from LIST.
	reportedVerb := cleanVerb(CanonicalVerb(strings.ToUpper(req.Method), scope), verb, req)

	dryRun := cleanDryRun(req.URL)
	elapsedSeconds := elapsed.Seconds()
	requestCounter.WithContext(req.Context()).WithLabelValues(reportedVerb, dryRun, group, version, resource, subresource, scope, component, codeToString(httpCode)).Inc()
	// MonitorRequest happens after authentication, so we can trust the username given by the request
	info, ok := request.UserFrom(req.Context())
	if ok && info.GetName() == user.APIServerUser {
		apiSelfRequestCounter.WithContext(req.Context()).WithLabelValues(reportedVerb, resource, subresource).Inc()
	}
	if deprecated {
		deprecatedRequestGauge.WithContext(req.Context()).WithLabelValues(group, version, resource, subresource, removedRelease).Set(1)
		audit.AddAuditAnnotation(req.Context(), deprecatedAnnotationKey, "true")
		if len(removedRelease) > 0 {
			audit.AddAuditAnnotation(req.Context(), removedReleaseAnnotationKey, removedRelease)
		}
	}
	requestLatencies.WithContext(req.Context()).WithLabelValues(reportedVerb, dryRun, group, version, resource, subresource, scope, component).Observe(elapsedSeconds)
	// We are only interested in response sizes of read requests.
	if verb == "GET" || verb == "LIST" {
		responseSizes.WithContext(req.Context()).WithLabelValues(reportedVerb, group, version, resource, subresource, scope, component).Observe(float64(respSize))
	}
}

```

- 其中 WithLabelValues设置metric的值 ，Inc()代表counter +1

```go
requestCounter.WithContext(req.Context()).WithLabelValues(reportedVerb, dryRun, group, version, resource, subresource, scope, component, codeToString(httpCode)).Inc()

```

- 这个是k8s在prometheus sdk上做的封装，位置 D:\go_path\pkg\mod\k8s.io\component-base@v0.22.1\metrics\counter.go

```go
func (v *CounterVec) WithLabelValues(lvs ...string) CounterMetric {
	if !v.IsCreated() {
		return noop // return no-op counter
	}
	if v.LabelValueAllowLists != nil {
		v.LabelValueAllowLists.ConstrainToAllowedList(v.originalLabels, lvs)
	}
	return v.CounterVec.WithLabelValues(lvs...)
}

```

#### 自己请求的计数

- 如果userName是 system:apiserver ，那么把代表自身请求的metric  apiserver_selfrequest_total +1

```go
	info, ok := request.UserFrom(req.Context())
	if ok && info.GetName() == user.APIServerUser {
		apiSelfRequestCounter.WithContext(req.Context()).WithLabelValues(reportedVerb, resource, subresource).Inc()
	}
```

#### 要被废弃的api被请求

- metric丢弃的设置，apiserver_requested_deprecated_apis代表要被废弃的api被请求了，打印信息

```go
	if deprecated {
		deprecatedRequestGauge.WithContext(req.Context()).WithLabelValues(group, version, resource, subresource, removedRelease).Set(1)
		audit.AddAuditAnnotation(req.Context(), deprecatedAnnotationKey, "true")
		if len(removedRelease) > 0 {
			audit.AddAuditAnnotation(req.Context(), removedReleaseAnnotationKey, removedRelease)
		}
	}
```

- prometheus查询结果

```shell
apiserver_requested_deprecated_apis{group="apiregistration.k8s.io", instance="172.20.70.205:6443", job="kubernetes-apiservers", removed_release="1.22", resource="apiservices", version="v1beta1"}
1
apiserver_requested_deprecated_apis{group="authorization.k8s.io", instance="172.20.70.205:6443", job="kubernetes-apiservers", removed_release="1.22", resource="subjectaccessreviews", version="v1beta1"}
1
apiserver_requested_deprecated_apis{group="certificates.k8s.io", instance="172.20.70.205:6443", job="kubernetes-apiservers", removed_release="1.22", resource="certificatesigningrequests", version="v1beta1"}
1
apiserver_requested_deprecated_apis{group="extensions", instance="172.20.70.205:6443", job="kubernetes-apiservers", removed_release="1.22", resource="ingresses", version="v1beta1"}
1
apiserver_requested_deprecated_apis{group="networking.k8s.io", instance="172.20.70.205:6443", job="kubernetes-apiservers", removed_release="1.22", resource="ingressclasses", version="v1beta1"}
1
apiserver_requested_deprecated_apis{group="networking.k8s.io", instance="172.20.70.205:6443", job="kubernetes-apiservers", removed_release="1.22", resource="ingresses", version="v1beta1"}
1
apiserver_requested_deprecated_apis{group="scheduling.k8s.io", instance="172.20.70.205:6443", job="kubernetes-apiservers", removed_release="1.22", resource="priorityclasses", version="v1beta1"}
1

```

#### 设置请求延迟值

- 代码如下

```go
requestLatencies.WithContext(req.Context()).WithLabelValues(reportedVerb, dryRun, group, version, resource, subresource, scope, component).Observe(elapsedSeconds)

```

- requestLatencies定义了从0.05到60秒的bucket

```go
	requestLatencies = compbasemetrics.NewHistogramVec(
		&compbasemetrics.HistogramOpts{
			Name: "apiserver_request_duration_seconds",
			Help: "Response latency distribution in seconds for each verb, dry run value, group, version, resource, subresource, scope and component.",
			// This metric is used for verifying api call latencies SLO,
			// as well as tracking regressions in this aspects.
			// Thus we customize buckets significantly, to empower both usecases.
			Buckets: []float64{0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
				1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 40, 50, 60},
			StabilityLevel: compbasemetrics.STABLE,
		},
		[]string{"verb", "dry_run", "group", "version", "resource", "subresource", "scope", "component"},
	)
```

- 分位值查询

```shell
histogram_quantile(0.99, sum(rate(apiserver_request_duration_seconds_bucket{job="kubernetes-apiservers"}[5m])) by (verb, le))

```

- 结果图片![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110338000/083791eee9b7408cad3bb0acac6e99b4.png)

#### 设置 http响应的大小histogram

- 设置代码

```go
	if verb == "GET" || verb == "LIST" {
		responseSizes.WithContext(req.Context()).WithLabelValues(reportedVerb, group, version, resource, subresource, scope, component).Observe(float64(respSize))
	}
```

- responseSizes定义了 1KB 到1GB的大小的bucket

```go
	responseSizes = compbasemetrics.NewHistogramVec(
		&compbasemetrics.HistogramOpts{
			Name: "apiserver_response_sizes",
			Help: "Response size distribution in bytes for each group, version, verb, resource, subresource, scope and component.",
			// Use buckets ranging from 1000 bytes (1KB) to 10^9 bytes (1GB).
			Buckets:        compbasemetrics.ExponentialBuckets(1000, 10.0, 7),
			StabilityLevel: compbasemetrics.ALPHA,
		},
		[]string{"verb", "group", "version", "resource", "subresource", "scope", "component"},
	)
```

## 追踪MonitorRequest调用链

### InstrumentRouteFunc在prometheus的HandlerFunc基础上封装了k8s的go-restful

```go
// InstrumentRouteFunc works like Prometheus' InstrumentHandlerFunc but wraps
// the go-restful RouteFunction instead of a HandlerFunc plus some Kubernetes endpoint specific information.
func InstrumentRouteFunc(verb, group, version, resource, subresource, scope, component string, deprecated bool, removedRelease string, routeFunc restful.RouteFunction) restful.RouteFunction {
	return restful.RouteFunction(func(req *restful.Request, response *restful.Response) {
		requestReceivedTimestamp, ok := request.ReceivedTimestampFrom(req.Request.Context())
		if !ok {
			requestReceivedTimestamp = time.Now()
		}

		delegate := &ResponseWriterDelegator{ResponseWriter: response.ResponseWriter}

		//lint:file-ignore SA1019 Keep supporting deprecated http.CloseNotifier
		_, cn := response.ResponseWriter.(http.CloseNotifier)
		_, fl := response.ResponseWriter.(http.Flusher)
		_, hj := response.ResponseWriter.(http.Hijacker)
		var rw http.ResponseWriter
		if cn && fl && hj {
			rw = &fancyResponseWriterDelegator{delegate}
		} else {
			rw = delegate
		}
		response.ResponseWriter = rw

		routeFunc(req, response)

		MonitorRequest(req.Request, verb, group, version, resource, subresource, scope, component, deprecated, removedRelease, delegate.Status(), delegate.ContentLength(), time.Since(requestReceivedTimestamp))
	})
}
```

### registerResourceHandlers 中根据不同的verb处理

- 位置 D:\go_path\pkg\mod\k8s.io\apiserver@v0.22.1\pkg\endpoints\installer.go
- LIST的verb代码如下

```go
		case "LIST": // List all resources of a kind.
			doc := "list objects of kind " + kind
			if isSubresource {
				doc = "list " + subresource + " of objects of kind " + kind
			}
			handler := metrics.InstrumentRouteFunc(action.Verb, group, version, resource, subresource, requestScope, metrics.APIServerComponent, deprecated, removedRelease, restfulListResource(lister, watcher, reqScope, false, a.minRequestTimeout))
			handler = utilwarning.AddWarningsHandler(handler, warnings)
			route := ws.GET(action.Path).To(handler).
				Doc(doc).
				Param(ws.QueryParameter("pretty", "If 'true', then the output is pretty printed.")).
				Operation("list"+namespaced+kind+strings.Title(subresource)+operationSuffix).
				Produces(append(storageMeta.ProducesMIMETypes(action.Verb), allMediaTypes...)...).
				Returns(http.StatusOK, "OK", versionedList).
				Writes(versionedList)
```

- 上层被APIInstaller调用

```go
// Install handlers for API resources.
func (a *APIInstaller) Install() ([]metav1.APIResource, []*storageversion.ResourceInfo, *restful.WebService, []error) {
	var apiResources []metav1.APIResource
	var resourceInfos []*storageversion.ResourceInfo
	var errors []error
	ws := a.newWebService()

	// Register the paths in a deterministic (sorted) order to get a deterministic swagger spec.
	paths := make([]string, len(a.group.Storage))
	var i int = 0
	for path := range a.group.Storage {
		paths[i] = path
		i++
	}
	sort.Strings(paths)
	for _, path := range paths {
		apiResource, resourceInfo, err := a.registerResourceHandlers(path, a.group.Storage[path], ws)
		if err != nil {
			errors = append(errors, fmt.Errorf("error in registering resource: %s, %v", path, err))
		}
		if apiResource != nil {
			apiResources = append(apiResources, *apiResource)
		}
		if resourceInfo != nil {
			resourceInfos = append(resourceInfos, resourceInfo)
		}
	}
	return apiResources, resourceInfos, ws, errors
}
```

# 本节重点总结 :

- k8s代码库和模块地址

  - 下载 apiserver源码
- apiserver中监控源码阅读

