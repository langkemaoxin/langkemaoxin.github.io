---
title: "34.2 m3db上手搭建"
sidebarGroup: "Prometheus"
shortTitle: "105 34.2 m3db上手搭建"
order: 105
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 单机版m3db安装 - 安装 - 和prometheus 通过remote_read整合 - 配置文件解读 单机版安装 下载二进制 shell wget https://gith..."
---

> **Prometheus · 第 105 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 单机版m3db安装
  - 安装
  - 和prometheus 通过remote_read整合
- 配置文件解读

# 单机版安装

## 下载二进制

```shell
wget https://github.com/m3db/m3/releases/download/v1.1.0/m3_1.1.0_linux_amd64.tar.gz
```

## 准备文件

- 依赖文件`m3dbnodem3dbnode.service``m3dbnode_single.yaml`
- 执行`m3db_single_install.sh`

## 执行 m3db_single_install.sh

```shell
#!/bin/bash
# 下载 包
wget https://github.com/m3db/m3/releases/download/v1.1.0/m3_1.1.0_linux_amd64.tar.gz
# 解压

systemctl stop m3dbnode
# 慎重哦
rm -rf /opt/app/m3db
# 创建目录
mkdir -p /opt/app/m3db/data/{m3db,m3kv}
# 拷贝文件
/bin/cp -f  m3dbnode /opt/app/m3db/m3dbnode
/bin/cp -f  m3dbnode_single.yaml /opt/app/m3db/m3dbnode_single.yaml
# 设置内核参数
sysctl -w vm.max_map_count=3000000
sysctl -w vm.swappiness=1
sysctl -w fs.file-max=3000000
sysctl -w fs.nr_open=3000000
ulimit -n 3000000

grep 'vm.max_map_count = 3000000' /etc/sysctl.conf || cat >> /etc/sysctl.conf <<'EOF'
# m3db
vm.max_map_count = 3000000
vm.swappiness = 1
fs.file-max = 3000000
fs.nr_open = 3000000
EOF

# 复制service文件
sudo /bin/cp -f -a m3dbnode.service /etc/systemd/system/m3dbnode.service
systemctl daemon-reload
systemctl start m3dbnode
systemctl status m3dbnode

# sleep 10 等等服务启动
sleep 10
# 创建namespace和placement
curl -X POST http://localhost:7201/api/v1/database/create -d '{
  "type": "local",
  "namespaceName": "default",
  "retentionTime": "48h",
  "numShards": "8"
}'

# 查看初始化状态
curl http://localhost:7201/api/v1/services/m3db/placement  |python -m json.tool
# ready一下

#!/bin/bash
curl -X POST http://localhost:7201/api/v1/services/m3db/namespace/ready -d '{
  "name": "default"
}'

# 写入测试数据
#!/bin/bash
curl -X POST http://localhost:7201/api/v1/json/write -d '{
  "tags":
    {
      "__name__": "third_avenue",
      "city": "new_york",
      "checkout": "1"
    },
    "timestamp": '\"$(date "+%s")\"',
    "value": 3347.26
}'
# 查询测试数据

curl -X "POST" -G "http://localhost:7201/api/v1/query_range" \
  -d "query=third_avenue" \
  -d "start=$(date "+%s" -d "45 seconds ago")" \
  -d "end=$( date +%s )" \
  -d "step=5s"
```

# 集群版安装教程

> 过程

- https://m3db.io/docs/cluster/binaries_cluster/

# 配置文件讲解

## 注意事项

- 单机版内嵌了etcd进程，如果测试机上有etcd的需要注意下端口冲突
- `m3dbnode`可以选择是否开启内嵌的`m3coordinator`

## 配置文件解读

```yaml

# 是否开启内嵌的 M3Coordinator
coordinator:
  # Address for M3Coordinator to listen for traffic.
  listenAddress: 0.0.0.0:7201
  # 所有m3db namespace(理解为表)都必须列在这里，
  # 如果少了则读写丢数据
  # All configured M3DB namespaces must be listed in this config if running an
  # embedded M3Coordinator instance.
  local:
    namespaces:
      - namespace: default
        type: unaggregated
        retention: 48h

  # M3Coordinator 日志
  logging:
    level: info

  # M3Coordinator metric
  metrics:
    scope:
      # Prefix to apply to all metrics.
      prefix: "coordinator"
    prometheus:
      # Path and address to expose Prometheus scrape endpoint.
      handlerPath: /metrics
      listenAddress: 0.0.0.0:7203 # until https://github.com/m3db/m3/issues/682 is resolved
    sanitization: prometheus
    # Sampling rate for metrics, use 1.0 for no sampling.
    samplingRate: 1.0
    extended: none

  tagOptions:
    # Configuration setting for generating metric IDs from tags.
    idScheme: quoted

db:
  # Minimum log level which will be emitted.
  logging:
    level: info

  # Configuration for emitting M3DB metrics.
  metrics:
    prometheus:
      # Path to expose Prometheus scrape endpoint.
      handlerPath: /metrics
    sanitization: prometheus
    # Sampling rate for metrics, use 1.0 for no sampling.
    samplingRate: 1.0
    extended: detailed

  # 9000 是本实例的 thrift/tchannel接收数据接口
  # Address to listen on for local thrift/tchannel APIs.
  listenAddress: 0.0.0.0:9000
  # 9001 是集群间实例的 thrift/tchannel接收数据接口
  # Address to listen on for cluster thrift/tchannel APIs.
  clusterListenAddress: 0.0.0.0:9001
  # 9002 是本实例的json/http接口 (主要用来debug)
  # Address to listen on for local json/http APIs (used for debugging primarily).
  httpNodeListenAddress: 0.0.0.0:9002
  # Address to listen on for cluster json/http APIs (used for debugging primarily).
  httpClusterListenAddress: 0.0.0.0:9003
  # Address to listen on for debug APIs (pprof, etc).
  debugListenAddress: 0.0.0.0:9004

  # Configuration for resolving the instances host ID.
  hostID:
    # "Config" resolver states that the host ID will be resolved from this file.
    resolver: config
    value: m3db_local

  client:
    # Consistency level for writes.
    writeConsistencyLevel: majority
    # Consistency level for reads.
    readConsistencyLevel: unstrict_majority
    # Timeout for writes.
    writeTimeout: 10s
    # Timeout for reads.
    fetchTimeout: 15s
    # Timeout for establishing a connection to the cluster.
    connectTimeout: 20s
    # Configuration for retrying writes.
    writeRetry:
        initialBackoff: 500ms
        backoffFactor: 3
        maxRetries: 2
        jitter: true
    # Configuration for retrying reads.
    fetchRetry:
        initialBackoff: 500ms
        backoffFactor: 2
        maxRetries: 3
        jitter: true
    # Number of times we background health check for a node can fail before
    # considering the node unhealthy.
    backgroundHealthCheckFailLimit: 4
    backgroundHealthCheckFailThrottleFactor: 0.5

  # Sets GOGC value.
  gcPercentage: 100

  # Whether new series should be created asynchronously (recommended value
  # of true for high throughput.)
  writeNewSeriesAsync: true
  writeNewSeriesBackoffDuration: 2ms

  bootstrap:
    commitlog:
      # Whether tail end of corrupted commit logs cause an error on bootstrap.
      returnUnfulfilledForCorruptCommitLogFiles: false

  cache:
    # Caching policy for database blocks.
    series:
      policy: lru

  commitlog:
    # Maximum number of bytes that will be buffered before flushing the commitlog.
    flushMaxBytes: 524288
    # Maximum amount of time data can remain buffered before flushing the commitlog.
    flushEvery: 1s
    # Configuration for the commitlog queue. High throughput setups may require higher
    # values. Higher values will use more memory.
    queue:
      calculationType: fixed
      size: 2097152

  filesystem:
    # Directory to store M3DB data in.
    filePathPrefix: /opt/app/m3db/data
    # Various fixed-sized buffers used for M3DB I/O.
    writeBufferSize: 65536
    dataReadBufferSize: 65536
    infoReadBufferSize: 128
    seekReadBufferSize: 4096
    # Maximum Mib/s that can be written to disk by background operations like flushing
    # and snapshotting to prevent them from interfering with the commitlog. Increasing
    # this value can make node adds significantly faster if the underlyign disk can
    # support the throughput.
    throughputLimitMbps: 1000.0
    throughputCheckEvery: 128

  # This feature is currently not working, do not enable.
  repair:
    enabled: false
    throttle: 2m
    checkInterval: 1m

  # etcd configuration.
  discovery:
    config:
        service:
            # KV environment, zone, and service from which to write/read KV data (placement
            # and configuration). Leave these as the default values unless you know what
            # you're doing.
            env: default_env
            zone: embedded
            service: m3db
            # Directory to store cached etcd data in.
            cacheDir: /opt/app/m3db/m3kv
            # Configuration to identify the etcd hosts this node should connect to.
            etcdClusters:
                - zone: embedded
                  endpoints:
                      - 127.0.0.1:2379
        # Should only be present if running an M3DB cluster with embedded etcd.
        seedNodes:
            initialCluster:
                - hostID: m3db_local
                  endpoint: http://127.0.0.1:2380

```

# 和prometheus整合

```shell
# 在prometheus.yml 添加remote_read/write 段即可
remote_write:
  - url: "http://192.168.3.201:7201/api/v1/prom/remote/write"
remote_read:
  - url: "http://192.168.3.201:7201/api/v1/prom/remote/read"
    read_recent: true

# 在m3dnode上抓包查看
tcpdump -i any tcp dst port 9000 -nn -vv -p -A

```

# 找一个prometheus只做query remote_read m3coor

```shell
remote_read:
  - url: "http://192.168.0.107:7201/api/v1/prom/remote/read"
    read_recent: true
```

## 测试查询数据

- 截图![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743345000/70d231dc64a5441cabf5196a312e05c5.png)
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743345000/c2ef32bceb1844b2a26bb1843d9738dc.png)

# 本节重点总结 :

- 单机版m3db安装
  - 安装
  - 和prometheus 通过remote_read整合
- 配置文件解读

