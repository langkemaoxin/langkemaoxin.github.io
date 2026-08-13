---
title: "36.4 prometheus告警和预聚合分析"
sidebarGroup: "Prometheus"
shortTitle: "117 36.4 prometheus告警和预聚合分..."
order: 117
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "总结 - 内置了很多alert和record rule - 专业的promql，不用我们自己写了 - 多级嵌套的record计算如apiserver的slo prometheus ui查看配置看到配置..."
---

> **Prometheus · 第 117 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 总结

- 内置了很多alert和record rule
- 专业的promql，不用我们自己写了
- 多级嵌套的record计算如apiserver的slo

# prometheus ui查看配置看到配置了rule

```yaml
rule_files:
- /etc/prometheus/rules/prometheus-k8s-rulefiles-0/*.yaml
```

## 进入prometheus-k8s容器中查看

```shell
 kubectl -n monitoring exec  prometheus-k8s-0 -ti -- /bin/sh

/prometheus $ ls -rtl /etc/prometheus/rules/prometheus-k8s-rulefiles-0
total 0
lrwxrwxrwx    1 root     root            48 Sep  6 04:36 monitoring-prometheus-operator-rules.yaml -> ..data/monitoring-prometheus-operator-rules.yaml
lrwxrwxrwx    1 root     root            54 Sep  6 04:36 monitoring-prometheus-k8s-prometheus-rules.yaml -> ..data/monitoring-prometheus-k8s-prometheus-rules.yaml
lrwxrwxrwx    1 root     root            42 Sep  6 04:36 monitoring-node-exporter-rules.yaml -> ..data/monitoring-node-exporter-rules.yaml
lrwxrwxrwx    1 root     root            50 Sep  6 04:36 monitoring-kubernetes-monitoring-rules.yaml -> ..data/monitoring-kubernetes-monitoring-rules.yaml
lrwxrwxrwx    1 root     root            47 Sep  6 04:36 monitoring-kube-state-metrics-rules.yaml -> ..data/monitoring-kube-state-metrics-rules.yaml
lrwxrwxrwx    1 root     root            44 Sep  6 04:36 monitoring-kube-prometheus-rules.yaml -> ..data/monitoring-kube-prometheus-rules.yaml
lrwxrwxrwx    1 root     root            46 Sep  6 04:36 monitoring-alertmanager-main-rules.yaml -> ..data/monitoring-alertmanager-main-rules.yaml
/prometheus $ 

```

# 告警规则总结

- monitoring-alertmanager-main-rules.yaml alertmanager 运行相关
- monitoring-kube-prometheus-rules.yaml  prometheus target相关
- monitoring-kube-state-metrics-rules.yaml ksm指标
- monitoring-kubernetes-monitoring-rules.yaml  服务组件指标
- monitoring-node-exporter-rules.yaml node_exporter指标
- monitoring-prometheus-k8s-prometheus-rules.yaml prometheus运行相关
- monitoring-prometheus-operator-rules.yaml   operator指标

## 部分告警规则举例

- pod重启过就报警

```yaml
    - alert: KubePodCrashLooping
      annotations:
        description: Pod {{ $labels.namespace }}/{{ $labels.pod }} ({{ $labels.container }}) is restarting {{ printf "%.2f" $value }} times / 10 minutes.
        runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/kubepodcrashlooping
        summary: Pod is crash looping.
      expr: |
        rate(kube_pod_container_status_restarts_total{job="kube-state-metrics"}[10m]) * 60 * 5 > 0
      for: 15m
      labels:
        severity: warning
```

- StatefulSet运行副本数不对

```yaml
    - alert: KubeStatefulSetReplicasMismatch
      annotations:
        description: StatefulSet {{ $labels.namespace }}/{{ $labels.statefulset }} has not matched the expected number of replicas for longer than 15 minutes.
        runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/kubestatefulsetreplicasmismatch
        summary: Deployment has not matched the expected number of replicas.
      expr: |
        (
          kube_statefulset_status_replicas_ready{job="kube-state-metrics"}
            !=
          kube_statefulset_status_replicas{job="kube-state-metrics"}
        ) and (
          changes(kube_statefulset_status_replicas_updated{job="kube-state-metrics"}[10m])
            ==
          0
        )
      for: 15m
      labels:
        severity: warning
```

- 容器waiting状态

```yaml
    - alert: KubeContainerWaiting
      annotations:
        description: Pod {{ $labels.namespace }}/{{ $labels.pod }} container {{ $labels.container}} has been in waiting state for longer than 1 hour.
        runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/kubecontainerwaiting
        summary: Pod container waiting longer than 1 hour
      expr: |
        sum by (namespace, pod, container) (kube_pod_container_status_waiting_reason{job="kube-state-metrics"}) > 0
      for: 1h
      labels:
        severity: warning
```

- apiserver 挂了

```yaml
    - alert: KubeAPIDown
      annotations:
        description: KubeAPI has disappeared from Prometheus target discovery.
        runbook_url: https://github.com/prometheus-operator/kube-prometheus/wiki/kubeapidown
        summary: Target disappeared from Prometheus target discovery.
      expr: |
        absent(up{job="apiserver"} == 1)
      for: 15m
      labels:
        severity: critical
```

## 对应的runbook解读

- https://runbooks.thaum.xyz/runbooks/kubernetes/kubeapierrorbudgetburn/

# 预聚合规则总结

## kubernetes-api-server 大盘图

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407782000/af497b3b08ac4c1ebf23d5bd4e6535c4.png)

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407782000/d0fa1373f5444b5cb4c7200054c0a756.png)

### apiserver 30天内的可用性

- Availability (30d) > 99.000%

```shell
apiserver_request:availability30d{verb="all", cluster=""}
```

- 在rule文件中查询

```shell
/etc/prometheus/rules/prometheus-k8s-rulefiles-0 $ grep  "apiserver_request:availability30d"  /etc/prometheus/rules/prometheus-k8s-rulefiles-0/*
/etc/prometheus/rules/prometheus-k8s-rulefiles-0/monitoring-kubernetes-monitoring-rules.yaml:    record: apiserver_request:availability30d
/etc/prometheus/rules/prometheus-k8s-rulefiles-0/monitoring-kubernetes-monitoring-rules.yaml:    record: apiserver_request:availability30d
/etc/prometheus/rules/prometheus-k8s-rulefiles-0/monitoring-kubernetes-monitoring-rules.yaml:    record: apiserver_request:availability30d
```

- 对应的rule文件 位置 manifests\kubernetes-prometheusRule.yaml
- verb=all对应的record
- 总结下来就是1-  (write too slow + read too slow + errors)增量/总的增量

````yaml
    - expr: |
        1 - (
          (
            # write too slow
            sum(increase(apiserver_request_duration_seconds_count{verb=~"POST|PUT|PATCH|DELETE"}[30d]))
            -
            sum(increase(apiserver_request_duration_seconds_bucket{verb=~"POST|PUT|PATCH|DELETE",le="1"}[30d]))
          ) +
          (
            # read too slow
            sum(increase(apiserver_request_duration_seconds_count{verb=~"LIST|GET"}[30d]))
            -
            (
              (
                sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope=~"resource|",le="0.1"}[30d]))
                or
                vector(0)
              )
              +
              sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope="namespace",le="0.5"}[30d]))
              +
              sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope="cluster",le="5"}[30d]))
            )
          ) +
          # errors
          sum(code:apiserver_request_total:increase30d{code=~"5.."} or vector(0))
        )
        /
        sum(code:apiserver_request_total:increase30d)
      labels:
        verb: all
      record: apiserver_request:availability30d
````

- 对应的read write 30天增量 code:apiserver_request_total:increase30d

```yaml
    - expr: |
        sum by (code) (code_verb:apiserver_request_total:increase30d{verb=~"LIST|GET"})
      labels:
        verb: read
      record: code:apiserver_request_total:increase30d
    - expr: |
        sum by (code) (code_verb:apiserver_request_total:increase30d{verb=~"POST|PUT|PATCH|DELETE"})
      labels:
        verb: write
      record: code:apiserver_request_total:increase30d
```

- code_verb:apiserver_request_total:increase30d 由 code_verb:apiserver_request_total:increase1h算出

```yaml
    - expr: |
        avg_over_time(code_verb:apiserver_request_total:increase1h[30d]) * 24 * 30
      record: code_verb:apiserver_request_total:increase30d
```

- code_verb:apiserver_request_total:increase1h由各个verb的增量算出

```yaml
    - expr: |
        sum by (code, verb) (increase(apiserver_request_total{job="apiserver",verb="LIST",code=~"2.."}[1h]))
      record: code_verb:apiserver_request_total:increase1h
```

#### 总结

- 预聚合1 通过 apiserver_request_total中每个动作verb和对应的code算出  code_verb的1小时增量

```shell
    - expr: |
        sum by (code, verb) (increase(apiserver_request_total{job="apiserver",verb="LIST",code=~"2.."}[1h]))
      record: code_verb:apiserver_request_total:increase1h
```

- 预聚合2 通过 code_verb的1小时增量 30天的平均值算出 code_verb的30天增量

```shell
    - expr: |
        avg_over_time(code_verb:apiserver_request_total:increase1h[30d]) * 24 * 30
      record: code_verb:apiserver_request_total:increase30d
```

- 预聚合3 通过 code_verb的30天增量中List或Get算出 read的 code30天增量

```shell
    - expr: |
        sum by (code) (code_verb:apiserver_request_total:increase30d{verb=~"LIST|GET"})
      labels:
        verb: read
      record: code:apiserver_request_total:increase30d
```

- 预聚合3 通过 code_verb的30天增量中POST|PUT|PATCH|DELETE算出 write的 code30天增量

```shell
    - expr: |
        sum by (code) (code_verb:apiserver_request_total:increase30d{verb=~"POST|PUT|PATCH|DELETE"})
      labels:
        verb: write
      record: code:apiserver_request_total:increase30d
```

- 预聚合4 最终版的结果 1 - (write too slow + read too slow + errors)增量/总的增量
  - write too slow  ：写请求verb(POST|PUT|PATCH|DELETE)的30天增量

    - 正常的写请求： 耗时1秒内的写请求： apiserver_request_duration_seconds_bucket{verb=~"POST|PUT|PATCH|DELETE",le="1"}
    - 全部的写请求增量 ：sum(increase(apiserver_request_duration_seconds_count{verb=~"POST|PUT|PATCH|DELETE"}[30d]))
    - 写请求过慢的30天增量 = 全部的写请求增量 - 正常的写请求增量
  - read too slow ：读请求过慢的30天增量

    - 全部读请求增量 ： sum(increase(apiserver_request_duration_seconds_count{verb=~"LIST|GET"}[30d]))
    - scope="cluster" 5秒内认为正常  sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope="cluster",le="5"}[30d]))
    - scope="namespace" 单一namespace的请求，0.5秒内认为正常 sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope="namespace",le="0.5"}[30d]))
    - scope="resource" 单一资源的请求，0.1秒内认为正常  sum(increase(apiserver_request_duration_seconds_bucket{verb=~"LIST|GET",scope=~"resource|",le="0.1"}[30d]))
    - 读请求过慢的30天增量 = 全部读请求增量 - 集群维度请求耗时5秒内请求增量 -  单一namespace的请求耗时0.5秒内请求增量 - 单一资源的请求耗时0.1秒内请求增量
  - errors： 错误请求30天增量

    - code维护预聚合结果中code=5xx sum(code:apiserver_request_total:increase30d{code=~"5.."} or vector(0))

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1631407782000/504e231b758545128a5674ad340dd680.png)

