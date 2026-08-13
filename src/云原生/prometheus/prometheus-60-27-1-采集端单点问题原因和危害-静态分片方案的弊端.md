---
title: "27.1 采集端单点问题原因和危害，静态分片方案的弊端"
sidebarGroup: "Prometheus"
shortTitle: "60 27.1 采集端单点问题原因和危害，静态分片..."
order: 60
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 采集器单点问题和危害 - 采集器挂掉的场景原因 - 静态分片的手段和弊端 采集器单点问题 - 采集器由于prometheus进程挂了，导致数据断点 - 数据断点时间取决于 进程挂..."
---

> **Prometheus · 第 60 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- 采集器单点问题和危害
- 采集器挂掉的场景原因
- 静态分片的手段和弊端

# 采集器单点问题

- 采集器由于prometheus进程挂了，导致数据断点
- 数据断点时间取决于 进程挂的持续时间
- 采集器上的所有job数据都将断点

## 模拟数据断点问题

- 将prometheus采集器停止 1分钟
- 断点图片![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111851000/216cebdfbe5547878ca50b0de338f002.png)

## prometheus进程挂的常见原因

- 由于采集target的突增，导致prometheus采集器内存暴涨，oom
  - 动态服务发现举例，k8s中的pod扩容，导致数据暴涨，prometheus，oom
  - 静态配置突增的原因
  - ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111851000/26953feaddfb46ebb70151f0be0bfac0.png)
- 由于prometheus所在机器 down机导致

## 危害

- 采集器宕机时，看图不可用
- 报警不可用，因为查询不到数据

# 静态分片的手段

## 应用：hashmod 解决k8s大集群采集问题

## 场景说明

- 有的k8s集群数据量太大了，一个prometheus采集会导致内存消耗过多，采集效率下降
- 此时需要启动多个prometheus，使用hashmod做静态分片
- hashmod需要和keep或drop做配合

## 配置说明

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

## 源码解读

```go
	case HashMod:
		mod := sum64(md5.Sum([]byte(val))) % cfg.Modulus
		lb.Set(cfg.TargetLabel, fmt.Sprintf("%d", mod))
```

# 静态分片的弊端

- 静态分片虽然将全部数据分成n份采集
- 这时1个分片挂掉，只会影响 1/n的数据
- 但是由于没有接管这 1/n，也会导致部分数据断点

# 本节重点总结:

- 采集器单点问题和危害
- 采集器挂掉的场景原因
- 静态分片的手段和弊端

