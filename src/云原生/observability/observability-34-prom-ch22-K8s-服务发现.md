---
title: Prometheus 第22章：K8s 服务发现
sidebarGroup: 可观测性
shortTitle: 34 K8s 服务发现
order: 34
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第22章（K8s 服务发现）合并笔记
---

> **Prometheus · 第 22 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 22.1 k8s不同role级别的服务发现

# 本节重点介绍 :

- 服务发现的应用
- 3种采集的k8s服务发现role
  - 容器基础资源指标  role :node
  - k8s服务组件指标  role :endpoint
  - 部署在pod中业务埋点指标  role :pod

# 服务发现的应用

- 所有组件将自身指标暴露在各自的服务端口上，prometheus通过pull过来拉取指标
- 但是prometheus需要知道各个目标的地址是多少，而且需要及时感知他们的变化
- 所以采用服务发现是最好的解决方式

## 容器基础资源指标

- 我们可以看到prometheus采用k8s服务发现，其中`role :node` 代表发现所有的node。

```yaml
- job_name: kubernetes-nodes-cadvisor
  kubernetes_sd_configs:
  - role: node
```

- 其中的原理是通过监听k8s node，一旦node加入(扩容)，node离开(缩容)，prometheus可以及时收到node的信息
- 通过访问节点的cadvisor指标path如`node_ip:10250/metrics/cadvisor`获取到相关指标
- 通过prometheus的target展示页面(`/targets`)可以看到`cadvisor` node发现的结果，
- target结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/0e6978f1c03a4798a9608feb9120d746.png)
- discovery 结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/00e27c3fadd44d62a528ea222e1d3af5.png)

## k8s服务组件指标

### kube-scheduler

- 采集配置如下

```yaml
- job_name: kube-scheduler
  kubernetes_sd_configs:
  - role: endpoints
    kubeconfig_file: ""
    follow_redirects: true
```

- 采用k8s服务发现，其中`role :endpoints` 代表发现所有的endpoints
- [endpoint](https://image-static.segmentfault.com/261/604/2616041299-5f0817faf31d9) 可以理解为service向其发送流量的对象的IP地址
- 在之前我们创建的控制平面暴露的service中，kube-scheduler的配置如下

```yaml
---
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-scheduler
  labels:
    k8s-app: kube-scheduler
spec:
  selector:
    component: kube-scheduler
  ports:
  - name: http-metrics
    port: 10259
    targetPort: 10259
    protocol: TCP

```

- 那么对应的endpoint可以describe到，就是下面所示的172.20.70.205:10259

```shell
[root@k8s-master01 ~]# kubectl describe svc kube-scheduler -n kube-system  
Name:              kube-scheduler
Namespace:         kube-system
Labels:            k8s-app=kube-scheduler
Annotations:       <none>
Selector:          component=kube-scheduler
Type:              ClusterIP
IP Families:       <none>
IP:                10.96.208.114
IPs:               10.96.208.114
Port:              http-metrics  10259/TCP
TargetPort:        10259/TCP
Endpoints:         172.20.70.205:10259
Session Affinity:  None
Events:            <none>
```

- 这个和prometheus kube-scheduler target页面是一致的
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/c7a32bf0e868417c83d50b186d93f902.png)

### kube-controller-manager

- 采集配置如下

```yaml
- job_name: kube-controller-manager
  kubernetes_sd_configs:
  - role: endpoints
    kubeconfig_file: ""
    follow_redirects: true
```

- 采用k8s服务发现，其中`role :endpoints` 代表发现所有的endpoints
- 在之前我们创建的控制平面暴露的service中，kube-controller-manager的配置如下

```yaml
---
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-controller-manager
  labels:
    k8s-app: kube-controller-manager
spec:
  selector:
    component: kube-controller-manager
  ports:
  - name: http-metrics
    port: 10257
    targetPort: 10257
    protocol: TCP

```

- 那么对应的endpoint可以describe到，就是下面所示的172.20.70.205:10257

```shell
[root@k8s-master01 ~]# kubectl describe svc kube-controller-manager -n kube-system                              
Name:              kube-controller-manager
Namespace:         kube-system
Labels:            k8s-app=kube-controller-manager
Annotations:       <none>
Selector:          component=kube-controller-manager
Type:              ClusterIP
IP Families:       <none>
IP:                10.96.35.204
IPs:               10.96.35.204
Port:              http-metrics  10257/TCP
TargetPort:        10257/TCP
Endpoints:         172.20.70.205:10257
Session Affinity:  None
Events:            <none>
```

- 这个和prometheus kube-controller-manager target页面是一致的

### kube-etcd

- 采集配置如下

```yaml
- job_name: kube-etcd
  kubernetes_sd_configs:
  - role: endpoints
    kubeconfig_file: ""
    follow_redirects: true
```

- 采用k8s服务发现，其中`role :endpoints` 代表发现所有的endpoints
- 在之前我们创建的控制平面暴露的service中，kube-etcd的配置如下

```yaml
---
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-etcd
  labels:
    k8s-app: kube-etcd
spec:
  selector:
    component: etcd
    tier: control-plane
  ports:
  - name: http-metrics
    port: 2379
    targetPort: 2379
    protocol: TCP

```

- 那么对应的endpoint可以describe到，就是下面所示的172.20.70.205:2379

```shell
[root@prome-master01 ~]# kubectl describe  svc kube-etcd -n kube-system
Name:              kube-etcd
Namespace:         kube-system
Labels:            k8s-app=kube-etcd
Annotations:       <none>
Selector:          component=etcd,tier=control-plane
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.96.136.217
IPs:               10.96.136.217
Port:              http-metrics  2379/TCP
TargetPort:        2379/TCP
Endpoints:         192.168.3.200:2379
Session Affinity:  None
Events:            <none>

```

- 这个和prometheus kube-etcd target页面是一致的
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/245c3de4b44746ae94ccb305d10ccf38.png)

## 部署在pod中业务埋点指标

- 采集配置如下

```yaml
- job_name: kubernetes-pods
  kubernetes_sd_configs:
  - role: pod
    kubeconfig_file: ""
    follow_redirects: true
```

- 采用k8s服务发现，其中`role :pods` 代表发现所有的pods，相当于执行`kubectl get pod -A`

```shell
[root@k8s-master01 ~]# kubectl get pod -A
NAMESPACE         NAME                                           READY   STATUS    RESTARTS   AGE
calico-system     calico-kube-controllers-854b9dcf89-gct84       1/1     Running   5          139d
calico-system     calico-node-58m74                              1/1     Running   7          139d
calico-system     calico-node-8pwz5                              1/1     Running   1          42d
calico-system     calico-typha-56958ddd97-9zpd2                  1/1     Running   2          42d
calico-system     calico-typha-56958ddd97-gnt8k                  1/1     Running   8          139d
default           grafana-d5d85bcd6-f74ch                        1/1     Running   0          4d5h
default           grafana-d5d85bcd6-l44mx                        1/1     Running   0          4d5h
default           ink8s-pod-metrics-deployment-85d9795d6-95lsp   1/1     Running   0          20h
ingress-nginx     ingress-nginx-controller-6cb6fdd64b-p4s65      1/1     Running   0          4d5h
kube-admin        k8s-mon-daemonset-z6sfw                        1/1     Running   1          42d
kube-admin        k8s-mon-deployment-6d7d58bdc8-rxj42            1/1     Running   0          4d5h
kube-system       coredns-68b9d7b887-ckwgh                       1/1     Running   2          139d
kube-system       coredns-68b9d7b887-vfmft                       1/1     Running   2          139d
kube-system       etcd-k8s-master01                              1/1     Running   7          125d
kube-system       kube-apiserver-k8s-master01                    1/1     Running   2          74d
kube-system       kube-controller-manager-k8s-master01           1/1     Running   66         136d
kube-system       kube-proxy-kc258                               1/1     Running   1          42d
kube-system       kube-proxy-zx87g                               1/1     Running   2          139d
kube-system       kube-scheduler-k8s-master01                    1/1     Running   64         83d
kube-system       kube-state-metrics-564668c858-dnmnh            1/1     Running   0          4d3h
kube-system       metrics-server-7dbf6c4558-zwp5m                1/1     Running   0          4d5h
kube-system       prometheus-0                                   2/2     Running   0          4d3h
tigera-operator   tigera-operator-cf6b69777-mlgk9                1/1     Running   85         139d
```

- 然后访问的时候pod的ip，因为在k8s中是pod之间网络是扁平的，所以prometheus的pod可以访问到其他的pod
- target结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/84ab9859b5d641b793085c99c96c2eac.png)
- discovery结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110919000/97a066508ebb46d991c73ffda13932de.png)

# 本节重点总结 :

- 服务发现的应用
- 3种采集的k8s服务发现role
  - 容器基础资源指标  role :node
  - k8s服务组件指标  role :endpoint
  - 部署在pod中业务埋点指标  role :pod

## 22.2 k8s中ksm采集的使用的dns解析

# 本节重点介绍 :

- k8s 会为service创建cordns解析
- pod中dns的搜索域
- 模拟prometheus进行dns解析后访问数据

# k8s对象资源指标 [kube-stats-metrics项目](https://github.com/kubernetes/kube-state-metrics)

- prometheus 采集kube-state-metrics通过下面的配置段，

```yaml
- job_name: kube-state-metrics
  honor_timestamps: true
  scrape_interval: 30s
  scrape_timeout: 10s
  metrics_path: /metrics
  scheme: http
  static_configs:
  - targets:
    - kube-state-metrics:8080
```

## 采集配置解读

- target这里配置的是`kube-state-metrics:8080`。

```yaml
  - targets:
    - kube-state-metrics:8080
```

- 因为kube-state-metrics部署好之后有个service。它的配置如下。

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/name: kube-state-metrics
    app.kubernetes.io/version: v1.9.7
  name: kube-state-metrics
  namespace: kube-system
spec:
  clusterIP: None
  ports:
  - name: http-metrics
    port: 8080
    targetPort: http-metrics
  - name: telemetry
    port: 8081
    targetPort: telemetry
  selector:
    app.kubernetes.io/name: kube-state-metrics

```

### k8s 会为service创建[cordns解析](https://kubernetes.io/zh/docs/concepts/services-networking/dns-pod-service/)

- 解析域名为`${service_name}.${namespace}.svc.cluster.local`
- 其中 cluster.local代表集群的后缀
- 那么kube-state-metrics的域名为`kube-state-metrics.kube-system.svc.cluster.local`

### pod中dns的配置

- 同时pod中的dns配置为search 3个域，我们可以exec进入prometheus容器中查看，如下面的实例所示。

```shell
search kube-system.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5

```

- 所以在容器中可以ping一下 kube-state-metrics，可以看到解析的ip地址

```shell
/prometheus $ ping kube-state-metrics
PING kube-state-metrics (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)
/prometheus $
```

所以采集kube-state-metrics的target配置成 `kube-state-metrics:8080`是可以的，当然也可以配置成 `kube-state-metrics.kube-system.svc:8080` 和 `kube-state-metrics.kube-system.svc.cluster.local:8080`。

- 下面演示了不同搜索域的结果

```shell
/prometheus $ cat /etc/resolv.conf 
search kube-system.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
/prometheus $ ping kube-state-metrics
PING kube-state-metrics (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)
/prometheus $ ping kube-state-metrics.kube-system
PING kube-state-metrics.kube-system (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)
/prometheus $ ping kube-state-metrics.kube-system.svc
PING kube-state-metrics.kube-system.svc (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)
/prometheus $ ping kube-state-metrics.kube-system.svc.cluster.local
PING kube-state-metrics.kube-system.svc.cluster.local (10.100.71.4): 56 data bytes
ping: permission denied (are you root?)

```

### 在节点上模拟prometheus访问 ksm

- prometheus通过访问coredns，解析kube-state-metrics的域名，拿到相关ip，在访问kube-state-metrics 指标。
- 我们可以在node上模拟这一过程
- 在master上拿到coredns service 的ip

```shell
kubectl get svc  -n kube-system |grep dns
  kube-dns             ClusterIP   10.96.0.10     <none>        53/UDP,53/TCP,9153/TCP   73d

```

- 在node上请求 coredns 解析 kube-stats-metrics 域名，以为node上的 /etc/resolv.conf配置配置相关的解析域，所以要写全域名FQDN

```shell

[root@k8s-master01 ~]#  dig  kube-state-metrics.kube-system.svc.cluster.local @10.96.0.10  

; <<>> DiG 9.11.4-P2-RedHat-9.11.4-26.P2.el7_9.5 <<>> kube-state-metrics.kube-system.svc.cluster.local @10.96.0.10
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 26378
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;kube-state-metrics.kube-system.svc.cluster.local. IN A

;; ANSWER SECTION:
kube-state-metrics.kube-system.svc.cluster.local. 30 IN A 10.100.85.200

;; Query time: 0 msec
;; SERVER: 10.96.0.10#53(10.96.0.10)
;; WHEN: Tue Aug 24 16:38:18 CST 2021
;; MSG SIZE  rcvd: 141
```

- 访问这个ip的8080/metrics接口可以看到相关的数据

```shell
[root@k8s-master01 ~]# curl -s 10.100.85.200:8080/metrics |head
# HELP kube_certificatesigningrequest_labels Kubernetes labels converted to Prometheus labels.
# TYPE kube_certificatesigningrequest_labels gauge
# HELP kube_certificatesigningrequest_created Unix creation timestamp
# TYPE kube_certificatesigningrequest_created gauge
# HELP kube_certificatesigningrequest_condition The number of each certificatesigningrequest condition
# TYPE kube_certificatesigningrequest_condition gauge
# HELP kube_certificatesigningrequest_cert_length Length of the issued cert
# TYPE kube_certificatesigningrequest_cert_length gauge
# HELP kube_configmap_info Information about configmap.
# TYPE kube_configmap_info gauge
```

# 本节重点总结 :

- k8s 会为service创建cordns解析
- pod中dns的搜索域
- 模拟prometheus进行dns解析后访问数据

## 22.3 解读k8s服务发现源码

# 本节重点介绍 :

- discovery.Manager服务发现管理员
  - 注册各个服务发现源
  - 启动各个服务发现源
  - 处理服务发现的结果
- k8s服务发现
  - k8s-client informer机制

# 架构图补充

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110991000/b20c7d450a114289b6c458449569bc5a.png)

# 注册各个服务发现源

- 位置 D:\go_path\src\github.com\prometheus\prometheus\discovery\manager.go
- 去掉部分细节 ， m.registerProviders代表注册服务发现源

```go
func (m *Manager) ApplyConfig(cfg map[string]Configs) error {
    	for name, scfg := range cfg {
    		failedCount += m.registerProviders(scfg, name)
    		discoveredTargets.WithLabelValues(m.name, name).Set(0)
    	}
}
```

- 在registerProviders 调用各个服务发现源的NewDiscoverer方法，然后构造providers对象

```go
		d, err := cfg.NewDiscoverer(DiscovererOptions{
			Logger: log.With(m.logger, "discovery", typ),
		})
		m.providers = append(m.providers, &provider{
			name:   fmt.Sprintf("%s/%d", typ, len(m.providers)),
			d:      d,
			config: cfg,
			subs:   []string{setName},
		})
```

- 对应在k8s中就是，在 D:\go_path\src\github.com\prometheus\prometheus\discovery\kubernetes\kubernetes.go

### k8s中的NewDiscoverer方法如下

```go
// New creates a new Kubernetes discovery for the given role.
func New(l log.Logger, conf *SDConfig) (*Discovery, error) {
	if l == nil {
		l = log.NewNopLogger()
	}
	var (
		kcfg *rest.Config
		err  error
	)
	if conf.KubeConfig != "" {
		kcfg, err = clientcmd.BuildConfigFromFlags("", conf.KubeConfig)
		if err != nil {
			return nil, err
		}
	} else if conf.APIServer.URL == nil {
		// Use the Kubernetes provided pod service account
		// as described in https://kubernetes.io/docs/admin/service-accounts-admin/
		kcfg, err = rest.InClusterConfig()
		if err != nil {
			return nil, err
		}
		level.Info(l).Log("msg", "Using pod service account via in-cluster config")
	} else {
		rt, err := config.NewRoundTripperFromConfig(conf.HTTPClientConfig, "kubernetes_sd", config.WithHTTP2Disabled())
		if err != nil {
			return nil, err
		}
		kcfg = &rest.Config{
			Host:      conf.APIServer.String(),
			Transport: rt,
		}
	}

	kcfg.UserAgent = userAgent

	c, err := kubernetes.NewForConfig(kcfg)
	if err != nil {
		return nil, err
	}
	return &Discovery{
		client:             c,
		logger:             l,
		role:               conf.Role,
		namespaceDiscovery: &conf.NamespaceDiscovery,
		discoverers:        make([]discovery.Discoverer, 0),
		selectors:          mapSelector(conf.Selectors),
	}, nil
}
```

- 如果 用户指定了 kubeconfig_file或者 api_server那么用制定的地址和配置初始化k8s的client
- 不然使用rest.InClusterConfig方式配合service account初始化

# discovery.manager中startProvider开启服务发现worker和结果处理任务

- 代码如下

```go
func (m *Manager) startProvider(ctx context.Context, p *provider) {
	level.Debug(m.logger).Log("msg", "Starting provider", "provider", p.name, "subs", fmt.Sprintf("%v", p.subs))
	ctx, cancel := context.WithCancel(ctx)
	updates := make(chan []*targetgroup.Group)

	m.discoverCancel = append(m.discoverCancel, cancel)

	go p.d.Run(ctx, updates)
	go m.updater(ctx, p, updates)
}
```

## p.d.Run(ctx, updates) 开启服务发现worker

- 对应k8s的Discovery.Run在 位置 D:\go_path\src\github.com\prometheus\prometheus\discovery\kubernetes\kubernetes.go
- 以发现node为例，代码如下

```go
func (d *Discovery) Run(ctx context.Context, ch chan<- []*targetgroup.Group) {
    namespaces := d.getNamespaces()
    switch d.role {
        	case RoleNode:
        		nlw := &cache.ListWatch{
        			ListFunc: func(options metav1.ListOptions) (runtime.Object, error) {
        				options.FieldSelector = d.selectors.node.field
        				options.LabelSelector = d.selectors.node.label
        				return d.client.CoreV1().Nodes().List(ctx, options)
        			},
        			WatchFunc: func(options metav1.ListOptions) (watch.Interface, error) {
        				options.FieldSelector = d.selectors.node.field
        				options.LabelSelector = d.selectors.node.label
        				return d.client.CoreV1().Nodes().Watch(ctx, options)
        			},
        		}
        		node := NewNode(
        			log.With(d.logger, "role", "node"),
        			cache.NewSharedInformer(nlw, &apiv1.Node{}, resyncPeriod),
        		)
        		d.discoverers = append(d.discoverers, node)
        		go node.informer.Run(ctx.Done())
}
}
```

- 解读一下：创建node的list 和watch方法，执行对应k8s-client informer的Run方法
- K8S的informer模块封装list-watch API，用户只需要指定资源，编写事件处理函数，AddFunc,UpdateFunc和DeleteFunc等
- 这样就可以实现对指定资源的变更监听了

### 执行具体role的run方法

```go
	var wg sync.WaitGroup
	for _, dd := range d.discoverers {
		wg.Add(1)
		go func(d discovery.Discoverer) {
			defer wg.Done()
			d.Run(ctx, ch)
		}(dd)
	}
```

- 对应role=node的run

```go
// Run implements the Discoverer interface.
func (n *Node) Run(ctx context.Context, ch chan<- []*targetgroup.Group) {
	defer n.queue.ShutDown()

	if !cache.WaitForCacheSync(ctx.Done(), n.informer.HasSynced) {
		if ctx.Err() != context.Canceled {
			level.Error(n.logger).Log("msg", "node informer unable to sync cache")
		}
		return
	}

	go func() {
		for n.process(ctx, ch) {
		}
	}()

	// Block until the target provider is explicitly canceled.
	<-ctx.Done()
}

```

- 调用node.process方法处理结果

```go
func (n *Node) process(ctx context.Context, ch chan<- []*targetgroup.Group) bool {
	keyObj, quit := n.queue.Get()
	if quit {
		return false
	}
	defer n.queue.Done(keyObj)
	key := keyObj.(string)

	_, name, err := cache.SplitMetaNamespaceKey(key)
	if err != nil {
		return true
	}

	o, exists, err := n.store.GetByKey(key)
	if err != nil {
		return true
	}
	if !exists {
		send(ctx, ch, &targetgroup.Group{Source: nodeSourceFromName(name)})
		return true
	}
	node, err := convertToNode(o)
	if err != nil {
		level.Error(n.logger).Log("msg", "converting to Node object failed", "err", err)
		return true
	}
	send(ctx, ch, n.buildNode(node))
	return true
}

```

- 内部的send方法是将node结果发往ch，对应就是 discoveryManager.startProvider中的updates

## discoveryManager.updater(ctx, p, updates) 处理服务发现的结果

- 位置 D:\go_path\src\github.com\prometheus\prometheus\discovery\manager.go

```go
func (m *Manager) updater(ctx context.Context, p *provider, updates chan []*targetgroup.Group) {
	for {
		select {
		case <-ctx.Done():
			return
		case tgs, ok := <-updates:
			receivedUpdates.WithLabelValues(m.name).Inc()
			if !ok {
				level.Debug(m.logger).Log("msg", "Discoverer channel closed", "provider", p.name)
				return
			}

			for _, s := range p.subs {
				m.updateGroup(poolKey{setName: s, provider: p.name}, tgs)
			}

			select {
			case m.triggerSend <- struct{}{}:
			default:
			}
		}
	}
}
```

- 调用 更新对象到target map中

```go
func (m *Manager) updateGroup(poolKey poolKey, tgs []*targetgroup.Group) {
	m.mtx.Lock()
	defer m.mtx.Unlock()

	if _, ok := m.targets[poolKey]; !ok {
		m.targets[poolKey] = make(map[string]*targetgroup.Group)
	}
	for _, tg := range tgs {
		if tg != nil { // Some Discoverers send nil target group so need to check for it to avoid panics.
			m.targets[poolKey][tg.Source] = tg
		}
	}
}

```

### updater和sender通过triggerSend通信，告诉 scrapeManager有新的target来了，开始采集

- 位置 D:\go_path\src\github.com\prometheus\prometheus\cmd\prometheus\main.go

```go
	{
		// Scrape manager.
		g.Add(
			func() error {
				// When the scrape manager receives a new targets list
				// it needs to read a valid config for each job.
				// It depends on the config being in sync with the discovery manager so
				// we wait until the config is fully loaded.
				<-reloadReady.C

				err := scrapeManager.Run(discoveryManagerScrape.SyncCh())
				level.Info(logger).Log("msg", "Scrape manager stopped")
				return err
			},
			func(err error) {
				// Scrape manager needs to be stopped before closing the local TSDB
				// so that it doesn't try to write samples to a closed storage.
				level.Info(logger).Log("msg", "Stopping scrape manager...")
				scrapeManager.Stop()
			},
		)
	}
```

# 本节重点总结 :

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630110991000/87871866b7c843e49638ecbba9b1c0f5.png)

- discovery.Manager服务发现管理员
  - 注册各个服务发现源
  - 启动各个服务发现源
  - 处理服务发现的结果
- k8s服务发现
  - k8s-client informer机制

