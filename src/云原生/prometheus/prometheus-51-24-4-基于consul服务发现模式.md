---
title: "24.4 基于consul服务发现模式"
sidebarGroup: "Prometheus"
shortTitle: "51 24.4 基于consul服务发现模式"
order: 51
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - consul 安装 - consul go代码注册服务，注销服务，获取服务 - node_exporter改造为consul服务发现 - 在数量比较大时，在注册服务的时候，关闭c..."
---

> **Prometheus · 第 51 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- consul 安装
- consul go代码注册服务，注销服务，获取服务
- node_exporter改造为consul服务发现
- 在数量比较大时，在注册服务的时候，关闭check，可以降低consul的压力

# consul 安装

## 准备工作

```shell

# 下载consul
wget -O /opt/tgzs/consul_1.9.4_linux_amd64.zip  https://releases.hashicorp.com/consul/1.9.4/consul_1.9.4_linux_amd64.zip 

cd /opt/tgzs/
unzip consul_1.9.4_linux_amd64.zip

/bin/cp -f consul /usr/bin/

```

## 启动单机版consul

```shell

# 
mkdir  /opt/app/consul

# 准备配置文件
cat <<EOF > /opt/app/consul/single_server.json
{
    "datacenter": "dc1",
    "node_name": "consul-svr-01",
    "server": true,
    "bootstrap_expect": 1,
    "data_dir": "/opt/app/consul/",
    "log_level": "INFO",
    "log_file": "/opt/logs/",
    "ui": true,
    "bind_addr": "0.0.0.0",
    "client_addr": "0.0.0.0",
    "retry_interval": "10s",
    "raft_protocol": 3,
    "enable_debug": false,
    "rejoin_after_leave": true,
    "enable_syslog": false
}
EOF

# 多个ip地址时，将bind_addr 改为一个内网的ip

# 写入service文件
cat <<EOF > /etc/systemd/system/consul.service
[Unit]
Description=consul server
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/usr/bin/consul agent  -config-file=/opt/app/consul/single_server.json
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=consul
[Install]
WantedBy=default.target
EOF

# 启动服务
systemctl daemon-reload && systemctl start consul   

systemctl status consul 

```

### 验证访问

- http://localhost:8500/

# node_exporter的job改造为consul的服务发现

## 编写go代码注册服务到consul

### 初始化consul

- 使用包 github.com/hashicorp/consul/api

```go
import (
	"fmt"
	consul "github.com/hashicorp/consul/api"
	"log"
)

type client struct {
	consul *consul.Client
}

func NewConsulClient(addr string) (*client, error) {
	config := consul.DefaultConfig()
	config.Address = addr
	c, err := consul.NewClient(config)
	if err != nil {
		return nil, err
	}
	return &client{consul: c}, nil
}

```

### 编写注册服务方法

- 需要指定参数为
  - 服务的名称
  - 实例地址
  - 实例端口
  - 实例探活path
  - 实例标签map
- check.HTTP 代表使用http类型的check
- 调用 consul.Agent().ServiceRegister(reg)注册服务

```go
// 注册服务
func (c *client) ServiceRegister(srvName, srvHost string, srvPort int, healthyCheckPath string, metaMap map[string]string) error {

	reg := new(consul.AgentServiceRegistration)
	reg.Name = srvName

	thisId := fmt.Sprintf("%s_%d", srvHost, srvPort)
	reg.ID = thisId
	reg.Port = srvPort
	reg.Address = srvHost
	reg.Meta = metaMap
	log.Printf("ServiceRegisterStart :%v", thisId)
	//增加check
	check := new(consul.AgentServiceCheck)
	check.HTTP = fmt.Sprintf("http://%s:%d%s", reg.Address, reg.Port, healthyCheckPath)
	//设置超时 5s。
	check.Timeout = "2s"
	check.DeregisterCriticalServiceAfter = "5s"
	//设置间隔 5s。
	check.Interval = "5s"
	//注册check服务。
	reg.Check = check

	return c.consul.Agent().ServiceRegister(reg)
}

```

### 编写获取服务信息的方法

- 使用consul.Health().Service获取 passing的服务

```go
// Service return a service
func (c *client) GetService(service, tag string) ([]*consul.ServiceEntry, error) {
	passingOnly := true
	ss, _, err := c.consul.Health().Service(service, tag, passingOnly, nil)
	if len(ss) == 0 && err == nil {
		return nil, fmt.Errorf("service ( %s ) was not found", service)
	}

	return ss, err
}

```

### 编写根据服务id注销服务的方法

```go
// 根据server id注销服务
func (c *client) DeRegister(id string) error {
	return c.consul.Agent().ServiceDeregister(id)
}
```

### 注册node_exporter服务

```go
func main() {
	c, err := NewConsulClient("http://172.20.70.205:8500")
	if err != nil {
		log.Printf("NewConsulClient.err:%v", err)
		return
	}

	nodes := []string{
		"172.20.70.205",
		"172.20.70.215",
	}

	nodeExporterSrv := "node_exporter"
	for _, h := range nodes {
		m := map[string]string{"region": "bj", "cloud": "huawei"}
		err = c.ServiceRegister(nodeExporterSrv, h, 9100, "/", m)
		if err != nil {
			log.Printf("[ServiceRegister.err][srv:%v][host:%v][err:%v]", nodeExporterSrv, h, err)
		} else {
			log.Printf("[ServiceRegister.success][srv:%v][host:%v]", nodeExporterSrv, h)
		}
	}

	ss, err := c.GetService(nodeExporterSrv, "")
	for _, s := range ss {
		log.Printf("[c.GetService][service_id:%v][err:%v]", s.Service.ID, err)
		//c.DeRegister(s.Service.ID)
	}

}

```

### 完整的go代码

```go
package main

import (
	"fmt"
	consul "github.com/hashicorp/consul/api"
	"log"
)

type client struct {
	consul *consul.Client
}

func NewConsulClient(addr string) (*client, error) {
	config := consul.DefaultConfig()
	config.Address = addr
	c, err := consul.NewClient(config)
	if err != nil {
		return nil, err
	}
	return &client{consul: c}, nil
}

// 注册服务
func (c *client) ServiceRegister(srvName, srvHost string, srvPort int, healthyCheckPath string, metaMap map[string]string) error {

	reg := new(consul.AgentServiceRegistration)
	reg.Name = srvName

	thisId := fmt.Sprintf("%s_%d", srvHost, srvPort)
	reg.ID = thisId
	reg.Port = srvPort
	reg.Address = srvHost
	reg.Meta = metaMap
	log.Printf("ServiceRegisterStart :%v", thisId)
	//增加check
	check := new(consul.AgentServiceCheck)
	check.HTTP = fmt.Sprintf("http://%s:%d%s", reg.Address, reg.Port, healthyCheckPath)
	//设置超时 5s。
	check.Timeout = "2s"
	check.DeregisterCriticalServiceAfter = "5s"
	//设置间隔 5s。
	check.Interval = "5s"
	//注册check服务。
	reg.Check = check

	return c.consul.Agent().ServiceRegister(reg)
}

// 根据server id注销服务
func (c *client) DeRegister(id string) error {
	return c.consul.Agent().ServiceDeregister(id)
}

// Service return a service
func (c *client) GetService(service, tag string) ([]*consul.ServiceEntry, error) {
	passingOnly := true
	ss, _, err := c.consul.Health().Service(service, tag, passingOnly, nil)
	if len(ss) == 0 && err == nil {
		return nil, fmt.Errorf("service ( %s ) was not found", service)
	}

	return ss, err
}

func main() {
	c, err := NewConsulClient("http://172.20.70.205:8500")
	if err != nil {
		log.Printf("NewConsulClient.err:%v", err)
		return
	}

	nodes := []string{
		"172.20.70.205",
		"172.20.70.215",
	}

	nodeExporterSrv := "node_exporter"
	for _, h := range nodes {
		m := map[string]string{"region": "bj", "cloud": "huawei"}
		err = c.ServiceRegister(nodeExporterSrv, h, 9100, "/", m)
		if err != nil {
			log.Printf("[ServiceRegister.err][srv:%v][host:%v][err:%v]", nodeExporterSrv, h, err)
		} else {
			log.Printf("[ServiceRegister.success][srv:%v][host:%v]", nodeExporterSrv, h)
		}
	}

	ss, err := c.GetService(nodeExporterSrv, "")
	for _, s := range ss {
		log.Printf("[c.GetService][service_id:%v][err:%v]", s.Service.ID, err)
		//c.DeRegister(s.Service.ID)
	}

}

```

### 注册服务的结果

> 注册service
>
> ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111474000/ed455ed6c2e74b3da84da575186b0e2b.png)

> 注销服务

## 配置 node_exporter的job为consul服务发现模式

- [配置文档](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#consul_sd_config)
- 配置文件

```yaml
  - job_name: 'node_exporter'
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
    scheme: http
    consul_sd_configs:
      - server: 172.20.70.205:8500
        services:
          - node_exporter
    relabel_configs:
      - source_labels:  ["__meta_consul_dc"]
        target_label: "dc"
      - separator: ;
        regex: __meta_consul_service_metadata_(.+)
        replacement: $1
        action: labelmap
```

- target页面和service discovery 页面观察服务发现结果
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111474000/ce4f37df7b9544db9e58cefaa4255190.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111474000/24db7ef8f5df43869f5ead82981c3b76.png)

# 本节重点总结 :

- consul 安装
- consul go代码注册服务，注销服务，获取服务
- node_exporter改造为consul服务发现
- 在数量比较大时，在注册服务的时候，关闭check，可以降低consul的压力

