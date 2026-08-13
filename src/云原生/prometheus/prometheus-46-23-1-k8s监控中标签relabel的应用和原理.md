---
title: 23.1 k8s监控中标签relabel的应用和原理
sidebarGroup: Prometheus
shortTitle: 46 23.1 k8s监控中标签relabel的应...
order: 46
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - relabel的源码在 7.7节做过详细的解读 - 强大的relabel能力 在k8s中的应用 - 应用1： labelmap 在采集cadvisor指标时 对服务发现标签key...'
---

> **Prometheus · 第 46 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- relabel的源码在 7.7节做过详细的解读
- 强大的relabel能力 在k8s中的应用
  - 应用1： labelmap 在采集cadvisor指标时 对服务发现标签key名字截取
  - 应用2： 采集pod自定义指标中replace 和 keep的应用
  - 应用3： k8s服务组件采集时的endpoint过滤
  - 应用4： hashmod 解决k8s大集群采集问题
  - 应用5： drop 去掉不想要采集的指标

# 强大的relabel能力 做标签截取、变换、静态分片

## prometheus relabel说明

- [relabel官方文档](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- 其中 action有六个配置项，含义如下

| action_name | 含义                                                   |
| ----------- | ------------------------------------------------------ |
| replace     | 将 source_labels 中正则匹配的结果赋值到 target_label中 |
| keep        | 保留source_labels 中正则 匹配的目标                    |
| drop        | 去掉source_labels 中正则 匹配的目标                    |
| hashmod     | 将source_labels 中正则 匹配的目标 做分片               |
| labelmap    | 将正则匹配到的所有标签名称做替换                       |
| labeldrop   | 去掉正则匹配到的标签                                   |
| labelkeep   | 保留正则匹配到的标签                                   |

## 在采集k8s中relabel的应用

### 应用1： labelmap 在采集cadvisor指标时 对服务发现标签key名字截取

- 在采集cadvisor时可以看到服务发现源给添加了很多`__meta_kubernetes_node_label_`开头的标签
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111303000/475c276fa7684cdfa868e48085644796.png)
- /service-discovery页面查看 kubernetes-nodes-cadvisor的结果![](/img/bVcSC9K)
- 但是这些标签名字太长了，需要精简。我们使用如下的relabel配置

```yaml
relabel_configs:
- separator: ;
  regex: __meta_kubernetes_node_label_(.+)
  replacement: $1
  action: labelmap
```

- 以这个标签为例，`__meta_kubernetes_node_label_kubernetes_io_os="linux"`
- 上面的配置代表匹配_meta_kubernetes_node_label_开头的key，只保留后面的部分
- 所以在最终的标签看到的就是`kubernetes_io_os="linux"`
- labelmap代表匹配到的标签赋值给目标标签
- 源码位置 D:\go_path\src\github.com\prometheus\prometheus\pkg\relabel\relabel.go

```go
func relabel(lset labels.Labels, cfg *Config) labels.Labels {
	case LabelMap:
		for _, l := range lset {
			if cfg.Regex.MatchString(l.Name) {
				res := cfg.Regex.ReplaceAllString(l.Name, cfg.Replacement)
				lb.Set(res, l.Value)
			}
		}
}
```

### 应用2： 采集pod自定义指标中replace 和 keep的应用

- 我们在使用pod自定义指标时在pod yaml 的spec.template.metadata.annotations中需要定义三个以`prometheus.io`开头的配置
- 分别代表是否需要prometheus采集、metrics暴露的端口、metrics的http path信息
- 我们之前写的go代码 ink8s_pod_metrics项目中的deployment配置如下

```yaml
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ink8s-pod-metrics
  template:
    metadata:
      labels:
        app: ink8s-pod-metrics
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '8080'
        prometheus.io/path: 'metrics'
```

- 在采集pod自定义指标时采用如下(job=kubernetes-pods)

```yaml
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    separator: ;
    regex: "true"
    replacement: $1
    action: keep
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    separator: ;
    regex: (.+)
    target_label: __metrics_path__
    replacement: $1
    action: replace
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    separator: ;
    regex: ([^:]+)(?::\d+)?;(\d+)
    target_label: __address__
    replacement: $1:$2
    action: replace
```

#### 其中keep的应用

- 配置如下

```yaml
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    separator: ;
    regex: "true"
    replacement: $1
    action: keep
```

- 含义是保留 __meta_kubernetes_pod_annotation_prometheus_io_scrape这个标签为true的pod
- 也就是pod的yaml中 spec.template.metadata.annotations 配置`prometheus.io/scrape: 'true'`的才需要采集
- 其余的pod不采集
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111303000/0ed77cd9f20a43b284e1be01d09c06d5.png)

#### 其中replace的应用

- 设置__metrics_path__标签

```yaml
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    separator: ;
    regex: (.+)
    target_label: __metrics_path__
    replacement: $1
    action: replace
```

- 意思是将`__meta_kubernetes_pod_annotation_prometheus_io_path`赋值给`__metrics_path__`
- 设置__address__标签

```yaml
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    separator: ;
    regex: ([^:]+)(?::\d+)?;(\d+)
    target_label: __address__
    replacement: $1:$2
    action: replace
```

- 意思是将相关`__meta_kubernetes_pod_annotation_prometheus_io_port`作为端口赋值给`__address__`
- 也就是是告诉prometheus 这个pod的采集地址为` ${pod_ip}:${pod_port}/${path}`

### 应用3： k8s服务组件采集时的endpoint过滤

- endpoint资源是暴露**一个服务的ip地址和port的列表**
- 代表采用k8s服务发现 endpoint，endpoint会非常多，所以需要过滤apiserver的

```yaml
kubernetes_sd_configs:
- role: endpoints
```

- 相应的relabel配置为

```yaml
relabel_configs:
-   source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
    separator: ;
    regex: default;kubernetes;https
    replacement: $1
    action: keep

```

#### 解读一下

- 过滤手段为

  - 标签 __meta_kubernetes_namespace=default
  - 并且 __meta_kubernetes_service_name=kubernetes
  - 并且 __meta_kubernetes_endpoint_port_name 匹配https，
- 最后的动作为keep，也就是只采集满足上面三个标签组的endpoint
- k8s 会在default namespace中创建apiserver的 service

```shell
$ kubectl get svc -A |grep  443
default         kubernetes                                     ClusterIP   10.96.0.1       <none>        443/TCP                  9d
```

- 最后获取到的endpoint转换为采集路径为：`https://masterip:6443/metrics`

### 应用4 ：hashmod 解决k8s大集群采集问题

#### 场景说明

- 有的k8s集群数据量太大了，一个prometheus采集会导致内存消耗过多，采集效率下降
- 此时需要启动多个prometheus，使用hashmod做静态分片
- hashmod需要和keep或drop做配合

#### 配置说明

- 第1个prometheus配置

```yaml
relabel_configs:
  - source_labels: [__address__]
    regex: (.*)
    modulus: 2
    target_label: __tmp_hash
    replacement: $1
    action: hashmod
  - source_labels: [__tmp_hash]
    regex: ^0$
    replacement: $1
    action: keep

```

- 第2个prometheus配置

```yaml
relabel_configs:
  - source_labels: [__address__]
    regex: (.*)
    modulus: 2
    target_label: __tmp_hash
    replacement: $1
    action: hashmod
  - source_labels: [__tmp_hash]
    regex: ^1$
    replacement: $1
    action: keep

```

- 解读一下，两个prometheus的   modulus=2代表一共两个分片
- 其中第1个 regex: ^0$ 第二个 regex: ^1$ ，然后通过action: keep做保留
- 意思是target的__address__做hash之后对2取模
- =0由第1个prometheus采集，=1由第2个prometheus采集

#### 源码解读

```go
	case HashMod:
		mod := sum64(md5.Sum([]byte(val))) % cfg.Modulus
		lb.Set(cfg.TargetLabel, fmt.Sprintf("%d", mod))
```

### 应用5 ：drop 去掉不想要采集的指标

#### 场景说明

- 有些指标数据量很大，可以达到百万的量级，这种指标对监控系统是很大的压力
- 有些指标我们不关心
- 所以我们就可以使用drop将这些指标去掉
- 配置样例，如下面的例子：drop掉以`kubelet_|apiserver_|storage_`开头的指标

```yaml
- source_labels: [__name__]
    separator: ;
    # 标签key前缀匹配到的drop
    regex: '(kubelet_|apiserver_|container_fs_).*'
    replacement: $1
    action: drop
```

# 本节重点总结 :

- relabel的源码在 7.7节做过详细的解读
- 强大的relabel能力 在k8s中的应用
  - 应用1： labelmap 在采集cadvisor指标时 对服务发现标签key名字截取
  - 应用2： 采集pod自定义指标中replace 和 keep的应用
  - 应用3： k8s服务组件采集时的endpoint过滤
  - 应用4： hashmod 解决k8s大集群采集问题
  - 应用5： drop 去掉不想要采集的指标

