---
title: "28.3 一致性哈希和推送数据的redirect流程"
sidebarGroup: "Prometheus"
shortTitle: "71 28.3 一致性哈希和推送数据的redire..."
order: 71
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 开启一致性哈希环变更监听处理 - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置 - 开启结果监听和watch服务 - 编写pgw的http接收端 - 推送数据的red..."
---

> **Prometheus · 第 71 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 开启一致性哈希环变更监听处理
  - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置
- 开启结果监听和watch服务
- 编写pgw的http接收端
  - 推送数据的redirect流程

一致性哈希和推送数据的redirect流程

# 开启一致性哈希环变更监听处理

- 位置 sd/rings.go
- 当这个服务的节点变更了(节点宕机、扩容)
- 通过consul的watch操作会通知到这里，也就是  this.NodeUpdateChan会有数据
- 这时需要从 哈希环中获取节点信息`oldNodes := this.ring.Members()`，然后两边对对比
- 如果节点不同则，更新哈希环`this.ReShardRing(nodes)`

```go
func RunReshardHashRing(ctx context.Context, logger log.Logger) {

	level.Info(logger).Log("msg", "RunRefreshServiceNode start....")
	for {
		select {
		case nodes := <-NodeUpdateChan:

			oldNodes := PgwNodeRing.ring.Members()
			sort.Strings(nodes)
			sort.Strings(oldNodes)
			isEq := StringSliceEqualBCE(nodes, oldNodes)
			if isEq == false {
				level.Info(logger).Log("msg", "RunReshardHashRing_node_update_reshard", "old_num", len(oldNodes), "new_num", len(nodes), "oldnodes", strings.Join(oldNodes, ","), "newnodes", strings.Join(nodes, ","), )
				PgwNodeRing.ReShardRing(nodes)
			} else {
				level.Info(logger).Log("msg", "RunReshardHashRing_node_same", "nodes", strings.Join(nodes, ","))

			}
		case <-ctx.Done():
			level.Info(logger).Log("msg", "RunReshardHashRingQuit")
			return
		}

	}
}

```

## 两个string切片比较 的函数

```go
    func StringSliceEqualBCE(a, b []string) bool {
    if len(a) != len(b) {
        return false
    }
  
    if (a == nil) != (b == nil) {
        return false
    }
  
    b = b[:len(a)]
    for i, v := range a {
        if v != b[i] {
            return false
        }
    }
  
    return true
    }
```

# 开启结果监听和watch服务

- sd/sd.go RunRefreshServiceNode函数中
- 开启Reshard任务，并启动watch

```go
func (c *client) RunRefreshServiceNode(ctx context.Context, srvName string, consulServerAddr string) error {
	level.Info(c.logger).Log("msg", "RunRefreshServiceNode start....")
	go RunReshardHashRing(ctx, c.logger)

	errchan := make(chan error, 1)
	go func() {
		errchan <- c.WatchService(ctx, srvName, consulServerAddr)

	}()
	select {
	case <-ctx.Done():
		level.Info(c.logger).Log("msg", "RunRefreshServiceNode_receive_quit_signal_and_quit")
		return nil
	case err := <-errchan:
		level.Error(c.logger).Log("msg", "WatchService_get_error", "err", err)
		return err
	}
	return nil
}
```

## 启动watch

- sd/sd.go
- 如果节点变化了就通过NodeUpdateChan通知 RunReshardHashRing

```go
func (c *client) WatchService(ctx context.Context, srvName string, consulServerAddr string) error {

	watchConfig := make(map[string]interface{})

	watchConfig["type"] = "service"
	watchConfig["service"] = srvName
	watchConfig["handler_type"] = "script"
	watchConfig["passingonly"] = true
	watchPlan, err := watch.Parse(watchConfig)
	if err != nil {
		level.Error(c.logger).Log("msg", "create_Watch_by_watch_config_error", "srv_name", srvName, "error", err)
		return err

	}

	watchPlan.Handler = func(lastIndex uint64, result interface{}) {
		if entries, ok := result.([]*consul.ServiceEntry); ok {
			var hs []string

			for _, a := range entries {

				hs = append(hs, fmt.Sprintf("%s:%d", a.Service.Address, a.Service.Port))
			}
			if len(hs) > 0 {
				level.Info(c.logger).Log("msg", "service_node_change_by_healthy_check", "srv_name", srvName, "num", len(hs), "detail", strings.Join(hs, " "))
				NodeUpdateChan <- hs
			}

		}

	}
	if err := watchPlan.Run(consulServerAddr); err != nil {
		level.Error(c.logger).Log("msg", "watchPlan_run_error", "srv_name", srvName, "error", err)
		return err
	}
	return nil

}
```

# 编写pgw的http接收端

- web/http.go
- 使用gin 启动web
- 添加pushgateway路由

```go
package web

import (
	"time"
	"net/http"

	"github.com/gin-gonic/gin"

	"dynamic-sharding/pkg/web/controller/pushgateway"
)

func StartGin(port string, r *gin.Engine) error {

	pushgateway.Routes(r)
	s := &http.Server{
		Addr:           port,
		Handler:        r,
		ReadTimeout:    time.Duration(5) * time.Second,
		WriteTimeout:   time.Duration(5) * time.Second,
		MaxHeaderBytes: 1 << 20,
	}

	err := s.ListenAndServe()
	return err

}

```

## main中 oklog.run 开启web

```go
	var g run.Group

	{
		// Termination handler.
		term := make(chan os.Signal, 1)
		signal.Notify(term, os.Interrupt, syscall.SIGTERM)
		cancel := make(chan struct{})
		g.Add(

			func() error {
				select {
				case <-term:
					level.Warn(logger).Log("msg", "Received SIGTERM, exiting gracefully...")
					cancelAll()
					return nil
					//TODO clean work here
				case <-cancel:
					level.Warn(logger).Log("msg", "server finally exit...")
					return nil
				}
			},
			func(err error) {
				close(cancel)

			},
		)
	}
	{
		// metrics web handler.
		g.Add(func() error {
			level.Info(logger).Log("msg", "start web service Listening on address", "address", sc.HttpListenAddr)
			gin.SetMode(gin.ReleaseMode)
			routes := gin.Default()
			errchan := make(chan error, 1)

			go func() {
				errchan <- web.StartGin(sc.HttpListenAddr, routes)
			}()
			select {
			case err := <-errchan:
				level.Error(logger).Log("msg", "Error starting HTTP server", "err", err)
				return err
			case <-ctxAll.Done():
				level.Info(logger).Log("msg", "Web service Exit..")
				return nil

			}

		}, func(err error) {
			cancelAll()
		})
	}
	g.Run()
```

## pushgateway的路由

- web/controller/pushgateway/pgw_route.go
- 需要处理的是 /metrics/job的get 、put和post方法

```go
package pushgateway

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Routes(r *gin.Engine) {

	authapi := r.Group("/metrics/job")
	authapi.GET("/*any", PushMetricsGetHash)
	authapi.PUT("/*any", PushMetricsRedirect)
	authapi.POST("/*any", PushMetricsRedirect)

	tapi := r.Group("/test")
	tapi.GET("/v1", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello, I'm pgw gateway+ (｡A｡)")
	})
}

```

# 推送数据的redirect流程

- web/controller/pushgateway/pgw_controller.go
- 获取请求的path
- 根据path在哈希环上找到要调度的真实pgw node
- 拼接redirect url，返回给client
- client再发起请求即可到真实的pgw上

```go
func PushMetricsRedirect(c *gin.Context) {

	path := c.Request.URL.Path

	node, err := sd.PgwNodeRing.GetNode(path)
	if err != nil {
		c.String(http.StatusInternalServerError, "get_node_from_hashring_error")
	}

	nextUrl := "http://" + node + path
	log.Printf("[PushMetrics][request_path:%s][redirect_url:%s]", path, nextUrl)
	//c.Redirect(http.StatusMovedPermanently, nextUrl)
	c.Redirect(http.StatusTemporaryRedirect, nextUrl)
	//c.Redirect(http.StatusPermanentRedirect, nextUrl)
	c.Abort()

}
func PushMetricsGetHash(c *gin.Context) {

	path := c.Request.URL.Path

	node, err := sd.PgwNodeRing.GetNode(path)
	if err != nil {
		c.String(http.StatusInternalServerError, "get_node_from_hashring_error")
	}

	nextUrl := "http://" + node + path
	log.Printf("[PushMetrics][request_path:%s][redirect_url:%s]", path, nextUrl)
	c.String(http.StatusOK, "nextUrl:"+nextUrl)

}

```

# 本节重点总结 :

- 开启一致性哈希环变更监听处理
  - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置
- 开启结果监听和watch服务
- 编写pgw的http接收端
  - 推送数据的redirect流程

