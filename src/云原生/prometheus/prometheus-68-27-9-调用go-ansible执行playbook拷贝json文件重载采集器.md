---
title: "27.9 调用go-ansible执行playbook拷贝json文件重载采集器"
sidebarGroup: "Prometheus"
shortTitle: "68 27.9 调用go-ansible执行pla..."
order: 68
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - go-ansible执行playbook - 编写分发重载的playbook - 编译执行 - 测试停掉一个节点 - 测试停掉的节点再回来 go-ansible执行playboo..."
---

> **Prometheus · 第 68 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- go-ansible执行playbook
- 编写分发重载的playbook
- 编译执行
  - 测试停掉一个节点
  - 测试停掉的节点再回来

# go-ansible执行playbook

- 新增 goansiblerun/run.go

```go
package goansiblerun

import (
	"context"
	"github.com/apenella/go-ansible/pkg/execute"
	"github.com/apenella/go-ansible/pkg/stdoutcallback/results"
	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"time"

	"github.com/apenella/go-ansible/pkg/options"
	"github.com/apenella/go-ansible/pkg/playbook"
)

func AnsiRunPlay(logger log.Logger, srvName string, remoteHost string, extraVars map[string]interface{}, ansiYamlPath string) {
	ansiblePlaybookConnectionOptions := &options.AnsibleConnectionOptions{
		Connection: "smart",
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(10)*time.Second)
	defer cancel()
	ansiblePlaybookOptions := &playbook.AnsiblePlaybookOptions{
		Inventory: remoteHost + ",",
		ExtraVars: extraVars,
	}

	lplaybook := &playbook.AnsiblePlaybookCmd{
		Playbooks:         []string{ansiYamlPath},
		ConnectionOptions: ansiblePlaybookConnectionOptions,
		Options:           ansiblePlaybookOptions,
		Exec: execute.NewDefaultExecute(
			execute.WithTransformers(
				results.Prepend("Go-ansible example"),
			),
		),
		//StdoutCallback: "json",
	}

	err := lplaybook.Run(ctx)
	if err != nil {
		level.Error(logger).Log("msg", "create_Watch_by_watch_config_error", "srv_name", srvName, "host", remoteHost, "error", err)

	}
}

```

## 解读一下

- 使用 https://github.com/apenella/go-ansible
- ansiYamlPath代表要执行那个playbook
- extraVars代表 playbook中的外部参数
- Inventory代表 执行的host
- 每个执行 设置10秒的超时时间

```go
ctx, cancel := context.WithTimeout(context.Background(), time.Duration(10)*time.Second)
```

## 在Dispatch分发的时候调用ansible playbook

- 位置 service/shard_service.go
- 将配置中的 src_sd_file_name，dest_sd_file_name，yaml_path等参数传入playbook

```go
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

```

# 编写分发重载的playbook

- yaml名字 copy_file_and_reload_prome.yaml
- 先将本地的json文件copy到目标机器上
- 目标目录为 /opt/app/prometheus/sd
- 然后给prometheus采集器发送reload命令

```yaml
- name:  copy_file_and_reload
  hosts: all
  user: root
  gather_facts:  false
  vars:
      target_path: /opt/app/prometheus/sd
  tasks:
      - name: copy target file
        copy:
          src: '{{ item.src }}'
          dest: '{{ item.dest }}'
          owner: root
          group: root
          mode: 0644
          force: true
        with_items:
          - { src: './{{ src_sd_file_name }}', dest: '{{ target_path }}/{{ dest_sd_file_name }}' }

      - name: reload_service
        shell: /usr/bin/curl -X POST http://localhost:{{ service_port }}/-/reload &

```

# prometheus上的配置

- 将blackbox_http改造为管控的

```yaml
  - job_name: 'blackbox-http-shard'
    # metrics的path 注意不都是/metrics
    metrics_path: /probe
    # 传入的参数
    params:
      module: [http_2xx]  # Look for a HTTP 200 response.
    file_sd_configs:
      - files:
          - /opt/app/prometheus/sd/file_sd_by_prome_shared.json
        refresh_interval: 2m
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 172.20.70.205:9115  # The blackbox exporter's real hostname:port.

```

# 编译执行

## 正常执行两个节点均分

```shell
level=info ts=2021-08-26T19:08:09.770+08:00 caller=shard_service.go:103 msg="RunRefreshServiceNode start...."
level=info ts=2021-08-26T19:08:09.771+08:00 caller=shard_service.go:198 msg=RunDispatch.start name=scrape_prometheus_node_exporter
ts=2021-08-26T19:08:09.771+08:00 caller=log.go:124 level=info msg="RunRefreshServiceNode start...."
<nil>
level=info ts=2021-08-26T19:08:09.772+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.215_1_2_2.json node=172.20.70.215 index=1 all=2 targetNum=2
<nil>
level=info ts=2021-08-26T19:08:09.773+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.205_2_2_3.json node=172.20.70.205 index=2 all=2 targetNum=3
ts=2021-08-26T19:08:09.774+08:00 caller=log.go:124 level=info msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=2 detail="172.20.70.205 172.20.70.215"
level=info ts=2021-08-26T19:08:09.774+08:00 caller=shard_service.go:119 msg=RunReshardHashRing_node_same nodes=172.20.70.205,172.20.70.215
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── ok: [172.20.70.205] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.205_2_2_3.json'})
prome-shard ── 
prome-shard ── TASK [reload_service] *************************************************************************************
prome-shard ── ok: [172.20.70.215] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.215_1_2_2.json'})
prome-shard ── 
prome-shard ── TASK [reload_service] *************************************************************************************
[WARNING]: Consider using the get_url or uri module rather than running 'curl'.  If you need to use
command because get_url or uri is insufficient you can add 'warn: false' to this command task or set
'command_warnings=False' in ansible.cfg to get rid of this message.
prome-shard ── changed: [172.20.70.215]
prome-shard ── 
prome-shard ── PLAY RECAP ************************************************************************************************
prome-shard ── 172.20.70.215              : ok=2    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
prome-shard ── 
[WARNING]: Consider using the get_url or uri module rather than running 'curl'.  If you need to use
command because get_url or uri is insufficient you can add 'warn: false' to this command task or set
'command_warnings=False' in ansible.cfg to get rid of this message.
prome-shard ── changed: [172.20.70.205]
prome-shard ── 
prome-shard ── PLAY RECAP ************************************************************************************************
prome-shard ── 172.20.70.205              : ok=2    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
prome-shard ── 
```

## 停掉其中一个节点，全部分配给存活的节点

```shell

ts=2021-08-26T19:09:56.422+08:00 caller=log.go:124 level=info msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=1 detail=172.20.70.215
level=info ts=2021-08-26T19:09:56.423+08:00 caller=shard_service.go:114 msg=RunReshardHashRing_node_update_reshard old_num=2 new_num=1 oldnodes=172.20.70.205,172.20.70.215 newnodes=172.20.70.215
<nil>
level=info ts=2021-08-26T19:09:56.424+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.215_1_1_5.json node=172.20.70.215 index=1 all=1 targetNum=5
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── changed: [172.20.70.215] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.215_1_1_5.json'})
prome-shard ── 
prome-shard ── TASK [reload_service] *************************************************************************************
[WARNING]: Consider using the get_url or uri module rather than running 'curl'.  If you need to use
command because get_url or uri is insufficient you can add 'warn: false' to this command task or set
prome-shard ── changed: [172.20.70.215]
'command_warnings=False' in ansible.cfg to get rid of this message.
prome-shard ── 
prome-shard ── PLAY RECAP ************************************************************************************************
prome-shard ── 172.20.70.215              : ok=2    changed=2    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   
```

## 再启动节点，又再均分

```shell

ts=2021-08-26T19:11:06.439+08:00 caller=log.go:124 level=info msg=service_node_change_by_healthy_check srv_name=scrape_prometheus_node_exporter num=2 detail="172.20.70.205 172.20.70.215"
level=info ts=2021-08-26T19:11:06.440+08:00 caller=shard_service.go:114 msg=RunReshardHashRing_node_update_reshard old_num=1 new_num=2 oldnodes=172.20.70.215 newnodes=172.20.70.205,172.20.70.215
<nil>
level=info ts=2021-08-26T19:11:06.441+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.215_1_2_2.json node=172.20.70.215 index=1 all=2 targetNum=2
<nil>
level=info ts=2021-08-26T19:11:06.441+08:00 caller=shard_service.go:180 msg=goansiblerun.run this.SrvName=scrape_prometheus_node_exporter jsonFileName=scrape_prometheus_node_exporter_172.20.70.205_2_2_3.json node=172.20.70.205 index=2 all=2 targetNum=3
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── 
prome-shard ── PLAY [copy_file_and_reload] *******************************************************************************
prome-shard ── 
prome-shard ── TASK [copy target file] ***********************************************************************************
prome-shard ── changed: [172.20.70.215] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.215_1_2_2.json'})
prome-shard ── 
prome-shard ── TASK [reload_service] *************************************************************************************
prome-shard ── changed: [172.20.70.205] => (item={u'dest': u'/opt/app/prometheus/sd/file_sd_by_prome_shared.json', u'src': u'./scrape_prometheus_node_exporter_172.20.70.205_2_2_3.json'})
prome-shard ── 
```

# 效果图

- target页面
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112247000/b9ce8b9a032e4b9fbbe89e7b5eec794f.png)
- 感知到节点变化的shard日志
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112247000/0c849ec9517f4730901dd323fe794120.png)
- ansible的日志
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112247000/1f1bdd8f9be9486f9c12accd332f7eaa.png)
- consul的服务截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630112247000/e69020bf38584836bbc16b2128615596.png)

# 回顾一下架构图

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111890000/b21b8e5851d347169f9f614b28aa7773.png)

# 本节重点总结 :

- go-ansible执行playbook
- 编写分发重载的playbook
- 编译执行
  - 测试停掉一个节点
  - 测试停掉的节点再回来

