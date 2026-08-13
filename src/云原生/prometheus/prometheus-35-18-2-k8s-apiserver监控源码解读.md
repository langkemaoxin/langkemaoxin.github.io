---
title: "18.2 k8s-apiserver监控源码解读"
sidebarGroup: "Prometheus"
shortTitle: "35 18.2 k8s-apiserver监控源码..."
order: 35
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - k8s代码库和模块地址 - 下载 apiserver源码 - apiserver中监控源码阅读 k8s源码地址分布 k8s代码库 - 访问github上k8s仓库，readme中..."
---

> **Prometheus · 第 35 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

