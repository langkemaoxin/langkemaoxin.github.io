---
title: "27.7 开启一致性哈希环变更监听处理和consul-watch服务"
sidebarGroup: "Prometheus"
shortTitle: "66 27.7 开启一致性哈希环变更监听处理和co..."
order: 66
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 开启一致性哈希环变更监听处理 - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置 - consul中watch 服务中节点变化 - 遍历所有的service和变更cha..."
---

> **Prometheus · 第 66 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 开启一致性哈希环变更监听处理
  - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置
- consul中watch 服务中节点变化
  - 遍历所有的service和变更chan的map，开启watch

# 开启一致性哈希环变更监听处理

- 位置 service/shard_service.go
- 当这个服务的节点变更了(节点宕机、扩容)
- 通过consul的watch操作会通知到这里，也就是  this.NodeUpdateChan会有数据
- 这时需要从 哈希环中获取节点信息`oldNodes := this.ring.Members()`，然后两边对对比
- 如果节点不同则，更新哈希环`this.ReShardRing(nodes)`

```go
func (this *ShardService) RunReshardHashRing() {

	level.Info(this.logger).Log("msg", "RunRefreshServiceNode start....")
	for {
		select {
		case nodes := <-this.NodeUpdateChan:

			oldNodes := this.ring.Members()
			sort.Strings(nodes)
			sort.Strings(oldNodes)
			isEq := StringSliceEqualBCE(nodes, oldNodes)
			if isEq == false {
				level.Info(this.logger).Log("msg", "RunReshardHashRing_node_update_reshard", "old_num", len(oldNodes), "new_num", len(nodes), "oldnodes", strings.Join(oldNodes, ","), "newnodes", strings.Join(nodes, ","))
				this.ReShardRing(nodes)

			} else {
				level.Info(this.logger).Log("msg", "RunReshardHashRing_node_same", "nodes", strings.Join(nodes, ","))

			}
		case <-this.ctx.Done():
			level.Info(this.logger).Log("msg", "RunReshardHashRingQuit")
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

## reshard函数

```go
func (ss *ShardService) ReShardRing(nodes []string) {
	ss.Lock()
	defer ss.Unlock()
	newRing := consistent.NewConsistent(common.Replicas)
	for _, node := range nodes {
		newRing.Add(node)
	}
	ss.ring = newRing

}
```

## 在初始化完 ShardService后就开启上面的协程

- service/shard_service.go NewShardService函数中

```go
	s.SetNodes(cg.Nodes)
	// 开启一致性哈希环变更监听
	go s.RunReshardHashRing()
	return s
```

# consul中watch 服务中节点变化

- 位置 watch/consul.go WatchService方法
- 调用consul api的watch功能 ，对指定的srvName进行watch
- 并将变化的结果 塞入到nodeUpdateChan srvName对应的chan中

```go
func (c *client) WatchService(srvName string, nodeUpdateChan chan<- []string) error {

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

				//hs = append(hs, fmt.Sprintf("%s:%d", a.Service.Address, a.Service.Port))
				hs = append(hs, a.Service.Address)
			}
			if len(hs) > 0 {
				level.Info(c.logger).Log("msg", "service_node_change_by_healthy_check", "srv_name", srvName, "num", len(hs), "detail", strings.Join(hs, " "))
				nodeUpdateChan <- hs
			}

		}

	}
	if err := watchPlan.Run(c.consulServerAddr); err != nil {
		level.Error(c.logger).Log("msg", "watchPlan_run_error", "srv_name", srvName, "error", err)
		return err
	}
	return nil

}

```

## 遍历所有的service和变更chan的map，开启watch

- 位置 watch/consul.go

```go
func (c *client) RunRefreshServiceNode(ctx context.Context, srvNameChanMap map[string]chan<- []string) error {
	level.Info(c.logger).Log("msg", "RunRefreshServiceNode start....")

	for srvName, upChan := range srvNameChanMap {
		srvName := srvName
		upChan := upChan
		go func() {
			c.WatchService(srvName, upChan)

		}()
	}

	select {
	case <-ctx.Done():
		level.Info(c.logger).Log("msg", "RunRefreshServiceNode_receive_quit_signal_and_quit")
		return nil
	}
}
```

## main中 使用 编排开启这个任务

- main.go中

```go
	{
		// WatchService   manager.
		g.Add(func() error {
			err := client.RunRefreshServiceNode(ctxAll, srvNameChanMap)
			if err != nil {
				level.Error(logger).Log("msg", "watchService_error", "error", err)
			}
			return err
		}, func(err error) {
			cancelAll()
		})
	}
```

## 同时 定义处理 信号的任务

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
```

# 运行结果 3.201是后面启动的

```shell
level=info ts=2021-08-29T15:22:47.400+08:00 caller=main.go:83 msg="NewConsulClient successfully" addr=192.168.3.200:8500
ts=2021-08-29T15:22:47.457+08:00 caller=log.go:168 level=info msg="RunRefreshServiceNode start...."
level=info ts=2021-08-29T15:22:47.457+08:00 caller=consul.go:124 msg="RunRefreshServiceNode start...."
level=info ts=2021-08-29T15:22:47.459+08:00 caller=consul.go:108 msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=1 detai
l=192.168.3.200
ts=2021-08-29T15:22:47.459+08:00 caller=log.go:168 level=info msg=RunReshardHashRing_node_same nodes=192.168.3.200
level=info ts=2021-08-29T15:24:19.122+08:00 caller=consul.go:108 msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=2 detai
l="192.168.3.200 192.168.3.201"
ts=2021-08-29T15:24:19.122+08:00 caller=log.go:168 level=info msg=RunReshardHashRing_node_update_reshard old_num=1 new_num=2 oldnodes=192.168.3.200 newnodes=1
92.168.3.200,192.168.3.201

```

# 本节重点总结 :

- 开启一致性哈希环变更监听处理
  - 这个服务的节点变更了(节点宕机、扩容)就对哈希环进行重置
- consul中watch 服务中节点变化
  - 遍历所有的service和变更chan的map，开启watch

