---
title: "31.2 DOD压缩和相关的prometheus源码解读"
sidebarGroup: "Prometheus"
shortTitle: "90 31.2 DOD压缩和相关的promethe..."
order: 90
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 时序数据时间的特点 - DOD压缩原理讲解 - dod压缩过程讲解 - dod压缩 prometheus源码解读 时序数据时间的特点 - 持续采集 - 采集间隔固定，如prome..."
---

> **Prometheus · 第 90 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

