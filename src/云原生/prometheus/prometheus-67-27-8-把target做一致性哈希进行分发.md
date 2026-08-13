---
title: "27.8 把target做一致性哈希进行分发"
sidebarGroup: "Prometheus"
shortTitle: "67 27.8 把target做一致性哈希进行分发"
order: 67
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 编写分发任务 - 执行这个对应的获取target函数 - 对target的地址 在哈希环中寻找节点 - 然后根据node塞入map中 - 然后写json文件 编写分发任务 - 位..."
---

> **Prometheus · 第 67 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 编写分发任务
  - 执行这个对应的获取target函数
  - 对target的地址 在哈希环中寻找节点
  - 然后根据node塞入map中
  - 然后写json文件

# 编写分发任务

- 位置 service/shard_service.go

```go
func (this *ShardService) Dispatch() {
	// 执行这个对应的获取target函数
	targets := this.TargetGetFunc()
	if len(targets) == 0 {
		level.Warn(this.logger).Log("msg", "Dispatch.empty.targets")
		return
	}
	// 先初始化一个map ，key是 节点，value是分配给这个节点的targets 
	nodeMap := make(map[string][]target.ScrapeTarget)

	// 遍历target，
	for _, t := range targets {
		t := t
		if len(t.Targets) != 1 {
			continue
		}
		// 对target的地址 在哈希环中寻找节点
		// 要求每个target的地址都是1个
		// 然后根据node塞入map中
		node := this.GetNode(t.Targets[0])

		preTs, loaded := nodeMap[node]
		if !loaded {
			preTs = make([]target.ScrapeTarget, 0)

		}
		preTs = append(preTs, t)
		nodeMap[node] = preTs

	}
	index := 1
	allNum := len(nodeMap)
	for node, ts := range nodeMap {
		// 拼接一个json文件的名字
		// 服务名_节点ip_索引_分片总数_target总数.json
		jsonFileName := fmt.Sprintf("%s_%s_%d_%d_%d.json",
			this.SrvName,
			node,
			index,
			allNum,
			len(ts),

		)
		// 写json文件
		writeJsonFile(jsonFileName, ts)

		extraVars := make(map[string]interface{})
		extraVars["src_sd_file_name"] = jsonFileName
		extraVars["dest_sd_file_name"] = this.DestSdFileName
		extraVars["service_port"] = this.Port
		level.Info(this.logger).Log(
			"msg", "goansiblerun.run",

			"this.SrvName", this.SrvName,
			"jsonFileName", jsonFileName,
			"node", node,
			"index", index,
			"all", allNum,
			"targetNum", len(ts),

		)
		go goansiblerun.AnsiRunPlay(this.logger, this.SrvName, node, extraVars, this.YamlPath)
		index++
	}

}
```

## 流程说明

- 先初始化一个map ，key是 节点，value是分配给这个节点的targets`nodeMap := make(map[string][]target.ScrapeTarget)`
- 执行这个对应的获取target函数`targets := this.TargetGetFunc()`
- 遍历target，
  - 对target的地址 在哈希环中寻找节点
  - 要求每个target的地址都是1个
  - 然后根据node塞入map中
- 代码如下

```go
	// 遍历target，
	for _, t := range targets {
		t := t
		if len(t.Targets) != 1 {
			continue
		}

		node := this.GetNode(t.Targets[0])

		preTs, loaded := nodeMap[node]
		if !loaded {
			preTs = make([]target.ScrapeTarget, 0)

		}
		preTs = append(preTs, t)
		nodeMap[node] = preTs

	}
```

- 然后遍历结果map，拼接json文件名，写json文件即可
- getNode
- ```go
  func (this *ShardService) GetNode(key string) string {
  	return this.ring.Get(key)

  }
  ```

## 外层ticker周期性的调用这个分发服务

- 每隔1分钟调用1次
- 这样能保证变更的target 最晚1分钟可以在监控中体现

```go
func (this *ShardService) RunDispatch() error {
	level.Info(this.logger).Log("msg", "RunDispatch.start", "name", this.SrvName)
	ticker := time.NewTicker(1 * time.Minute)
	this.Dispatch()
	defer ticker.Stop()
	for {
		select {
		case <-this.ctx.Done():
			level.Info(this.logger).Log("msg", "receive_quit_signal_and_quit")
			return nil
		case <-ticker.C:
			//level.Info(logger).Log("msg", "doIndexSync_run")
			this.Dispatch()
		}

	}
}

```

## main中在遍历创建shardService对象时，启动这份分发的周期任务

```go
for _, i := range sConfig.ShardService {
    ....
    go shardService.RunDispatch()
}

```

# 本节重点总结 :

- 两个均分任务的截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112218000/bf12d826ff0a45fb82aa5d586f42d26e.png)
- 仅有1个存活节点的截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112218000/5ed937981dec41b7af34fcf75c349295.png)
- 编写分发任务

  - 执行这个对应的获取target函数
  - 对target的地址 在哈希环中寻找节点
  - 然后根据node塞入map中
  - 然后写json文件

