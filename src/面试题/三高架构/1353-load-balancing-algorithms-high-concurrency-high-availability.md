---
title: "请介绍一些常用的负载均衡算法，以实现高并发和高可用性"
sidebarGroup: "三高架构"
shortTitle: "请介绍一些常用的负载均衡算法，以实现高并发和高可用性"
order: 1353
date: 2026-01-08
category: "面试题"
tag:
  - "面试题"
description: "在Java后端或架构师的面试中，负载均衡（Load Balancing） 几乎是必考题。很多同学在面对“如何设计一个高并发、高可用的系统”时，张嘴就是“加机器”、“用 Nginx”。但当面试官进一步追问：“Nginx 底层用了什么算法？如果"
article: false
---

> 来源：[请介绍一些常用的负载均衡算法，以实现高并发和高可用性](https://www.yuque.com/tulingzhouyu/db22bv/zpi5pgopwgkqk3vg)

在Java后端或架构师的面试中，**负载均衡（Load Balancing）** 几乎是必考题。

很多同学在面对“如何设计一个高并发、高可用的系统”时，张嘴就是“加机器”、“用 Nginx”。但当面试官进一步追问：“**Nginx 底层用了什么算法？如果后端服务器配置不均怎么办？扩容时缓存雪崩怎么解决？**”

大多数人的回答就只剩下了支支吾吾的“轮询……吧？”。

**Look at me！** 这种程度的回答，连实习生的门槛都够不上。今天我们就结合实战场景，像剥洋葱一样，一层层揭开负载均衡算法的真相。

### 第一层：一切的起点——轮询与随机 (Round Robin & Random)

在最理想的环境下，我们拥有几台配置完全相同的服务器。

- **轮询（Round Robin）：** 也就是大家最熟悉的“你一次、我一次”。请求按顺序分发给服务器 A、B、C，公平公正，无需复杂配置 。
- **随机（Random）：** 闭着眼扔，扔到谁算谁 。

![image](/面试题/三高架构/1353-load-balancing-algorithms-high-concurrency-high-availability/img-408019264047.png)

**面试官的陷阱：** “这看起来很完美，但你确定线上的服务器配置都是一样的吗？”

### 第二层：打破“大锅饭”——加权轮询 (Weighted Round Robin)

现实往往很骨感。你的集群里可能有一台刚采购的 **8核16G** “性能怪兽”，还有一台几年前的 **2核4G** “老破车” 。

如果你继续用简单的轮询，结果就是：高性能机器在“摸鱼”，而低性能机器因为处理不过来，瞬间 CPU 100% 宕机 。这不叫负载均衡，这叫“**定点清除**”！

解决方案：

我们要能者多劳。引入 权重（Weight） 的概念。

Nginx 的 weight 参数就是为此而生 。

- 8核16G的机器，Weight 设为 4。
- 2核4G的机器，Weight 设为 1。

![image](/面试题/三高架构/1353-load-balancing-algorithms-high-concurrency-high-availability/img-101f2170e670.png)

这样，每 5 个请求中，高性能机器处理 4 个，老机器处理 1 个，实现了按能力分配流量 。

### 第三层：会话保持的难题——源地址哈希 (IP Hash)

解决了性能问题，面试官紧接着会问：“**那用户的 Session 怎么办？**”

在分布式环境下，如果用户在服务器 A 登录了，Session 保存在 A 上。下一次请求被负载均衡器（即使是加权的）分发到了服务器 B，B 上面没有 Session，系统就会强制用户重新登录 。

用户体验极差，甚至可能引发投诉。

**解决方案：**

我们需要让同一个用户的请求，永远落在同一台服务器上。

这就是 源地址哈希（IP Hash）。

算法公式：index = hash(client_ip) % N （N为服务器数量） 。

![image](/面试题/三高架构/1353-load-balancing-algorithms-high-concurrency-high-availability/img-41428843c171.png)

只要客户端的 IP 不变，计算出的哈希值就不变，取模后的索引也不变，请求就会死死地“绑定”在某一台服务器上 。

### 第四层：扩容引发的灾难——一致性哈希 (Consistent Hashing)

听到这里，很多同学觉得 IP Hash 已经是终极方案了。

No, no, no! 真正的“面试杀手”在这里。

如果你的业务爆发，需要扩容（增加一台服务器），或者半夜某台服务器宕机了（减少一台），会发生什么？

回顾公式：hash(client_ip) % N。

原本 N=3，现在变成了 N=4。分母变了，几乎所有 IP 的取模结果都会发生变化 。

后果：

原本映射到服务器 A 的请求，现在去了 B；原本在 B 的去了 C。

![image](/面试题/三高架构/1353-load-balancing-algorithms-high-concurrency-high-availability/img-a488920b01f7.png)

这意味着，全局缓存瞬间失效（Cache Avalanche）。海量请求穿透缓存，直接打在数据库上，导致数据库瞬间崩溃 。这就是“扩容即雪崩”。

**解决方案：**

我们要引入 一致性哈希（Consistent Hashing）。

![image](/面试题/三高架构/1353-load-balancing-algorithms-high-concurrency-high-availability/img-bd3b65dd0554.png)

1. **哈希环：** 我们不再对服务器数量 N 取模，而是对 **$2^{32}$** 取模。这就形成了一个首尾相接的巨大哈希环（0 到 $2^{32}-1$） 。
2. **节点映射：** 把服务器的 IP 进行 Hash，落在这个环上 。
3. **请求寻址：** 把请求的 Key（如客户端 IP）也 Hash 到环上，然后**顺时针**寻找最近的一个服务器节点 。

优势：

当节点增加（扩容）或减少（宕机）时，受影响的只有环上那一小段的请求，其他大部分请求的映射关系保持不变 。这就最大程度地避免了缓存雪崩。

### 第五层：解决数据倾斜——虚拟节点 (Virtual Nodes)

故事结束了吗？还没有。

如果你的集群规模很小，比如只有两台服务器 A 和 B。它们在哈希环上可能离得很近。

结果就是：环上 90% 的请求都顺时针找到了 A，只有 10% 给了 B。

这就是 数据倾斜（Data Skew）。旱的旱死，涝的涝死 。

**解决方案：**

引入 虚拟节点（Virtual Nodes）。

![image](/面试题/三高架构/1353-load-balancing-algorithms-high-concurrency-high-availability/img-dec2d77672ed.png)

我们不仅把物理服务器 A 放到环上，还给它创建 100 个“分身”（A1, A2... A100）。

把这些成百上千的虚拟节点均匀地散布在哈希环上 。

这样，即使物理节点很少，请求也能被非常均匀地分发，从根本上解决数据倾斜问题 。

### 第六层：高手进阶——更智能的策略

在某些极端的长连接或处理耗时不均的场景下，还有更高级的策略：

1. **最小连接数 (Least Connections)：** 谁闲着（当前活跃连接数最少），新请求就给谁。适合处理长连接 。

![image](/面试题/三高架构/1353-load-balancing-algorithms-high-concurrency-high-availability/img-06dcb7cb1c08.png)

1. **自适应/最快响应 (Adaptive/Fastest Response)：** 动态监测谁响应最快，就给谁发。这是最智能的动态策略 。

![image](/面试题/三高架构/1353-load-balancing-algorithms-high-concurrency-high-availability/img-0bfb7e8113c4.png)

### 总结：面试通关宝典

下次面试官再问你负载均衡，请直接甩出这张表，告诉他你不仅懂使用，更懂底层原理：

![image](/面试题/三高架构/1353-load-balancing-algorithms-high-concurrency-high-availability/img-8d40528638ad.png)

**记住：技术没有最好的，只有最适合的。** 根据业务场景选择算法，才是架构设计的精髓。
