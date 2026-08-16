---
title: Prometheus 第31章：压缩算法
sidebarGroup: 可观测性
shortTitle: 43 压缩算法
order: 43
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第31章（压缩算法）合并笔记
---

> **Prometheus · 第 31 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 31.1 时序数据压缩的必要和facebook-gorilla压缩算法简介

# 本节重点介绍 :

- 海量时序数据存储空间问题
- 为什么要做数据点压缩
- facebook_gorilla压缩算法
  - 压缩比例高达11.6

# 海量时序数据存储空间问题

> 以城市气温为例

- 以城市气温为例，气温采集的传感器通常以一个固定的间隔采样
- 比如每5秒采集一次温度数据进行上报，也就是采集会7*24小时365天不间断。
- 那么我们做个简单的算术题，5秒一个数据点，一分钟会有12个点
- 那么一天就是`12*60*24` 17280个数据点
- 一个月则会有`12*60*24*30` 518400个数据点。这就是时序数据写入的第一个特点：**持续写入，累计数据量大** 。

> 多个采集站和多个传感器

- 同时需要在一个城市设置多个气温采集站，采集站内温度布置多个传感器
- 也就是说同一时刻数百万甚至数千万的数据写入

> 指标占用存储空间计算

- 一个点16 byte 那么一个小时的数据就是 17280* 16/1024/1024=0.26MB，这只是1个指标
- 如果上百万的指标，那么一个小时所需要的存储空间为250GB，一天则为6T的数据

## 分析结论

- 由于海量的监控指标和源源不断的采集
- 时序监控系统的所需的存储空间是很大

# 为什么要做数据点压缩

- 因为存储一般是一套大系统中的资源开销大户
- 以时序监控系统来说，假设查询模块需要10cpu，20G内存，100G磁盘，那么存储模块往往需要100cpu，2000G内存，3T磁盘。
- 所以能对存储中的数据点进行压缩，那么能直接降低内存和磁盘空间/io的开销，所以这也是tsdb开发人员不断努力的地方。

# facebook_gorilla压缩算法

![gorilla_01.jpg](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721787000/d3ecffa7018248f3aacc7b40fd29ef89.jpg)

- Gorilla压缩算法是facebook2016发布的一篇[论文](https://blog.acolyer.org/2016/05/03/gorilla-a-fast-scalable-in-memory-time-series-database/)
  论文中提到了，Facebook内部高速发展的业务对监控系统提出了下列数据要求：

## 要求

- 20亿个不同的Time Series
- 每分钟产生7亿个Data Points，即每秒钟产生1200万Data Points
- 数据需要存储26个小时
- 高峰期的查询高达40000次每秒
- 查询时延需要小于1ms
- 每个Time Series每分钟可产生4个Data Points
- 每年的数据增长率为200%

## 特点

- 在两个小时的block里从16byte压缩到1.37byte，压缩比例高达11.6

# 本节重点总结 :

- 海量时序数据存储空间问题
- 为什么要做数据点压缩
- facebook_gorilla压缩算法
  - 压缩比例高达11.6

## 31.2 DOD压缩和相关的prometheus源码解读

# 本节重点介绍 :

- 时序数据时间的特点
- DOD压缩原理讲解
- dod压缩过程讲解
- dod压缩 prometheus源码解读

# 时序数据时间的特点

- 持续采集
- 采集间隔固定，如prometheus配置job中的scrape_interval参数每隔15秒采集一次

```yaml
  - job_name: node_exporter
    honor_timestamps: true
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
    scheme: http
    follow_redirects: true
    static_configs:
    - targets:
      - 172.20.70.215:9100
```

- 除非有断点，那么点与点之间的间隔相等
- 根据时序数据库特点，采集间隔基本稳定

# DOD压缩原理讲解

- 如下所示的4个点 T1到T4

```shell
    Delta1       Delta2        Delta3
T1 --------> T2 --------> T3 --------> T4
```

- 它们的delta基本相同
- 同时一个时刻使用int64存储，占用64bit
- 那么采用不等长间隔压缩，使用较少bit存储替代原来的 64bit存储达到压缩的目的

# dod压缩过程讲解

- 论文截图![gorilla_02.jpg](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721825000/a2334050f8754bbd94635780479b6ddc.jpg)

## 过程讲解

- ts对象两两做差得到delta
- 然后用delta 做差得到dod
- 判断 dod的大小
  - =0 存储'0'，占用1 bit
  - [-63,64] 存储'10'+dod ，dod占5个bit ，一共7个bit
  - [-255,256] 存储'110'+dod ，dod占6个bit ，一共9个bit
  - [-2047,2048] 存储'1110'+dod ，dod占8个bit ，一共12个bit
  - 其它 存储'1111'+dod ，一共32个bit

### 压缩计算

- 以连续的点为例
- 基准点不能少，存储64bit，然后n个dod存储 1bit
- 所以压缩率为 (64+n-1)/64*n
- n=10的时候为 0.1140625
- 说白了就是 用后面 1bit的dod替换 64bit的原始值

## prometheus dod压缩源码解读

- xorAppender.Append方法 位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\chunkenc\xor.go
- num代表现有stream的历史点数

> 历史点数为0，在ts上什么也不做

```go

func (a *xorAppender) Append(t int64, v float64) {
	var tDelta uint64
	num := binary.BigEndian.Uint16(a.b.bytes())

	if num == 0 {
		buf := make([]byte, binary.MaxVarintLen64)
		for _, b := range buf[:binary.PutVarint(buf, t)] {
			a.b.writeByte(b)
		}
		a.b.writeBits(math.Float64bits(v), 64)

	} e
```

> 历史点数=1，计算第一个delta tDelta

- 并在函数的最后将tDelta赋给 a.tDelta

```go
else if num == 1 {
		tDelta = uint64(t - a.t)

		buf := make([]byte, binary.MaxVarintLen64)
		for _, b := range buf[:binary.PutUvarint(buf, tDelta)] {
			a.b.writeByte(b)
		}

		a.writeVDelta(v)

	}
```

> 历史点数>1，计算dod

- 这次的tDelta = uint64(t - a.t)
- 所以可以得到dod = int64(tDelta - a.tDelta)
- 然后进行dod的值判断写入对应的bit

```go
else {
		tDelta = uint64(t - a.t)
		dod := int64(tDelta - a.tDelta)

		// Gorilla has a max resolution of seconds, Prometheus milliseconds.
		// Thus we use higher value range steps with larger bit size.
		switch {
		case dod == 0:
			a.b.writeBit(zero)
		case bitRange(dod, 14):
			a.b.writeBits(0b10, 2)
			a.b.writeBits(uint64(dod), 14)
		case bitRange(dod, 17):
			a.b.writeBits(0b110, 3)
			a.b.writeBits(uint64(dod), 17)
		case bitRange(dod, 20):
			a.b.writeBits(0b1110, 4)
			a.b.writeBits(uint64(dod), 20)
		default:
			a.b.writeBits(0b1111, 4)
			a.b.writeBits(uint64(dod), 64)
		}

		a.writeVDelta(v)
	}
```

## prometheus dod解压源码解读

- 底层调用的是 xorIterator.Next方法进行解码 ，位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\chunkenc\xor.go

```go
func (it *xorIterator) Next() bool {
	if it.err != nil || it.numRead == it.numTotal {
		return false
	}

	if it.numRead == 0 {
		t, err := binary.ReadVarint(&it.br)
		if err != nil {
			it.err = err
			return false
		}
		v, err := it.br.readBits(64)
		if err != nil {
			it.err = err
			return false
		}
		it.t = t
		it.val = math.Float64frombits(v)

		it.numRead++
		return true
	}
	if it.numRead == 1 {
		tDelta, err := binary.ReadUvarint(&it.br)
		if err != nil {
			it.err = err
			return false
		}
		it.tDelta = tDelta
		it.t = it.t + int64(it.tDelta)

		return it.readValue()
	}

	var d byte
	// read delta-of-delta
	for i := 0; i < 4; i++ {
		d <<= 1
		bit, err := it.br.readBitFast()
		if err != nil {
			bit, err = it.br.readBit()
		}
		if err != nil {
			it.err = err
			return false
		}
		if bit == zero {
			break
		}
		d |= 1
	}
	var sz uint8
	var dod int64
	switch d {
	case 0b0:
		// dod == 0
	case 0b10:
		sz = 14
	case 0b110:
		sz = 17
	case 0b1110:
		sz = 20
	case 0b1111:
		// Do not use fast because it's very unlikely it will succeed.
		bits, err := it.br.readBits(64)
		if err != nil {
			it.err = err
			return false
		}

		dod = int64(bits)
	}

	if sz != 0 {
		bits, err := it.br.readBitsFast(sz)
		if err != nil {
			bits, err = it.br.readBits(sz)
		}
		if err != nil {
			it.err = err
			return false
		}
		if bits > (1 << (sz - 1)) {
			// or something
			bits = bits - (1 << sz)
		}
		dod = int64(bits)
	}

	it.tDelta = uint64(int64(it.tDelta) + dod)
	it.t = it.t + int64(it.tDelta)

	return it.readValue()
}

```

# 压缩率计算

- 假设理想情况采集稳定中间没有丢点，后面timestamp都可以用'0'来填补，压缩率会大大提升
- 使用dod而不直接使用delta我认为还是再次压缩
- 而且D的区间更多会落在前面几个里![gorilla_03.jpg](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721825000/bcb5e0e44c9145f1802b1e16441c8f06.jpg)

# 本节重点总结 :

- 时序数据时间的特点
- DOD压缩原理讲解
- dod压缩过程讲解
- dod压缩 prometheus源码解读
- 压缩率计算

## 31.3 XOR压缩和相关的prometheus源码解读

# 本节重点介绍 :

- xor 压缩value原理
- xor压缩过程讲解
- xor压缩prometheus源码解读
- xor 压缩效果

# xor 压缩value原理

- 原理:时序数据库相邻点变化不大，采用异或压缩float64的前缀和后缀0个数

# xor压缩过程讲解

![gorilla_04.jpg](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721853000/b128205d2cc94e8285c923571d99320b.jpg)

![gorilla_05.jpg](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721853000/ef6ea6df3f98493faeadad1fe3681b9d.jpg)

- 第一个值使用原始点存储
- 计算和前面的值的xor
  - 如果XOR值为0，即两个Value相同，那么存为’0’，只占用一个bit。
  - 如果XOR为非0，首先计算XOR中位于前端的和后端的0的个数，即Leading Zeros与Trailing Zeros。
    - 第一个bit值存为’1’。
    - 如果Leading Zeros与Trailing Zeros与前一个XOR值相同，则第2个bit值存为’0’，而后，紧跟着去掉Leading Zeros与Trailing Zeros以后的有效XOR值部分。
    - 如果Leading Zeros与Trailing Zeros与前一个XOR值不同，则第2个bit值存为’1’，而后，紧跟着5个bits用来描述Leading Zeros的值，再用6个bits来描述有效XOR值的长度，最后再存储有效XOR值部分（这种情形下，至少产生了13个bits的冗余信息）

# xor压缩prometheus源码解读

- xorAppender.Append 中调用的writeVDelta ，位置 D:\go_path\src\github.com\prometheus\prometheus\tsdb\chunkenc\xor.go
- vDelta代表xor的结果值，然后进行判断

```go
func (a *xorAppender) writeVDelta(v float64) {
	vDelta := math.Float64bits(v) ^ math.Float64bits(a.v)

	if vDelta == 0 {
		a.b.writeBit(zero)
		return
	}
	a.b.writeBit(one)

	leading := uint8(bits.LeadingZeros64(vDelta))
	trailing := uint8(bits.TrailingZeros64(vDelta))

	// Clamp number of leading zeros to avoid overflow when encoding.
	if leading >= 32 {
		leading = 31
	}

	if a.leading != 0xff && leading >= a.leading && trailing >= a.trailing {
		a.b.writeBit(zero)
		a.b.writeBits(vDelta>>a.trailing, 64-int(a.leading)-int(a.trailing))
	} else {
		a.leading, a.trailing = leading, trailing

		a.b.writeBit(one)
		a.b.writeBits(uint64(leading), 5)

		// Note that if leading == trailing == 0, then sigbits == 64.  But that value doesn't actually fit into the 6 bits we have.
		// Luckily, we never need to encode 0 significant bits, since that would put us in the other case (vdelta == 0).
		// So instead we write out a 0 and adjust it back to 64 on unpacking.
		sigbits := 64 - leading - trailing
		a.b.writeBits(uint64(sigbits), 6)
		a.b.writeBits(vDelta>>trailing, int(sigbits))
	}
}
```

# xor 压缩效果

![xor.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630721853000/8805869d4ea743b4979188776652751b.png)

- 从结果来看：
- 只占用1个bit的Value比例高达59.06%，这说明约一半以上的Point Value较之上一个Value并未发生变化。
- 30%比例的Value平均占用26.6 bits，即上面的情形2.1。
- 余下的12.64%的Value平均占用39.6 bits，即上面的情形2.2。
- 我认为xor压缩效果取决于series曲线波动情况，越剧烈压缩效果越差，越平滑压缩效果越好

# 本节重点总结 :

- xor 压缩value原理
- xor压缩过程讲解
- xor压缩prometheus源码解读
- xor 压缩效果

