---
title: 22.3 解读k8s服务发现源码
sidebarGroup: Prometheus
shortTitle: 45 22.3 解读k8s服务发现源码
order: 45
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - discovery.Manager服务发现管理员 - 注册各个服务发现源 - 启动各个服务发现源 - 处理服务发现的结果 - k8s服务发现 - k8s-client infor...'
---

> **Prometheus · 第 45 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

