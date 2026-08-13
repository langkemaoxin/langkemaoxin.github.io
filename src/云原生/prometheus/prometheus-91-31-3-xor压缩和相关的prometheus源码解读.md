---
title: "31.3 XOR压缩和相关的prometheus源码解读"
sidebarGroup: "Prometheus"
shortTitle: "91 31.3 XOR压缩和相关的promethe..."
order: 91
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - xor 压缩value原理 - xor压缩过程讲解 - xor压缩prometheus源码解读 - xor 压缩效果 xor 压缩value原理 - 原理:时序数据库相邻点变化不..."
---

> **Prometheus · 第 91 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

