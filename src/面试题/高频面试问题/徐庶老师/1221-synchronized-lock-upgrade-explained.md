---
title: "synchronized锁升级是怎么回事？"
sidebarGroup: "徐庶老师"
shortTitle: "synchronized锁升级是怎么回事？"
order: 1221
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "JVM 锁机制揭秘：对象头 MarkWord 与锁升级核心流程导读：在 Java 并发编程中，synchronized 锁的性能一直备受关注。从 JDK 1.6 开始，HotSpot 虚拟机引入了偏向锁、轻量级锁和重量级锁的概念，它们通过对"
article: false
---

> 来源：[synchronized锁升级是怎么回事？](https://www.yuque.com/tulingzhouyu/db22bv/ve3rcc2ucqpwnh8b)

# JVM 锁机制揭秘：对象头 MarkWord 与锁升级核心流程

**导读**：在 Java 并发编程中，synchronized 锁的性能一直备受关注。从 JDK 1.6 开始，HotSpot 虚拟机引入了**偏向锁、轻量级锁和重量级锁**的概念，它们通过对象头中的 MarkWord 来记录锁的状态，构成了一个精巧的**锁升级路径**。本文将深入揭秘这一机制，帮你理解为什么你的 synchronized 代码有时候很快，有时候又很慢。

---

## 一、对象头中的秘密：MarkWord 结构

### 什么是 MarkWord？

![image](/面试题/高频面试问题/徐庶老师/1221-synchronized-lock-upgrade-explained/img-3c096a5a3838.png)

每个 Java 对象都包含一个**对象头**，其中最核心的部分就是 **MarkWord**。在 64 位 JVM 中，MarkWord 占据 8 字节（64 位），记录了对象的所有元数据：

### LockState 解读

这 2 bit 就是锁状态的关键：

- **01** → 无锁状态（Normal）
- **01** + **BiasFlag=1** → 偏向锁状态（Biased）
- **00** → 轻量级锁状态（LightWeight）
- **10** → 重量级锁状态（HeavyWeight）

**关键洞察**：Java 对象天生就携带了锁的信息，不需要额外的数据结构来存储锁状态。这正是 synchronized 无锁优化的基础。

---

## 二、偏向锁：为懒人设计的锁

![image](/面试题/高频面试问题/徐庶老师/1221-synchronized-lock-upgrade-explained/img-1046c8ad3a7b.png)

### 现象：大多数锁是偏心的

在实际应用中，**大多数对象的锁只会被同一个线程持久化地访问**。以 HashMap 为例：

```plain
// 单线程场景（99% 的情况）
HashMap<String, String> map = new HashMap<>();
synchronized(map) {
    map.put("key", "value");
}
// 再次使用
synchronized(map) {
    map.put("key2", "value2");
}
```

每次进入同步块，如果都要执行 CAS 操作，那就太浪费了。JVM 的设计者想到了这一点。

### 偏向锁的原理

偏向锁的核心思想很简单：**记住这个线程，下次它再来就不用加锁了**。

1. **第一次进入**：线程 A 执行 CAS 操作，将自己的 ThreadID 写入 MarkWord
2. **第二次进入**：直接比对 MarkWord 中的 ThreadID，如果一致就放行 ✓（**零开销**）
3. **其他线程来了**：偏向被撤销，锁升级到轻量级锁

```plain
// MarkWord 中会记录
[ThreadID: A] [Epoch: 0] [Age: 0] [BiasFlag: 1] [LockState: 01]
```

### 偏向锁的陷阱

⚠️ **一旦对象调用了 hashCode()，偏向锁就永久失效了！**

为什么？因为 MarkWord 中的空间是有限的，不能同时存储 ThreadID 和 HashCode。一旦存储了 HashCode，就没有地方放 ThreadID 了。

```plain
Object obj = new Object();
obj.hashCode();  // 💥 偏向锁从此失效
synchronized(obj) {
    // 此时无法进入偏向锁，直接升级为轻量级锁
}
```

---

## 三、轻量级锁：有竞争的时候

![image](/面试题/高频面试问题/徐庶老师/1221-synchronized-lock-upgrade-explained/img-06aa4ec00658.png)

### 触发场景

偏向被撤销后，如果还有线程竞争，就进入轻量级锁：

```plain
线程 A 在临界区内，线程 B 在等待 → "交替执行"
→ 轻量级锁上场
```

### 工作机制

轻量级锁使用 **CAS（Compare And Swap）+ 自旋**：

1. 线程 B 在自己的**栈帧**中创建 Lock Record
2. 使用 CAS 尝试将 MarkWord 指向这个 Lock Record
3. 如果 CAS 成功 → 锁获取成功，继续执行
4. 如果 CAS 失败 → 进入**适应性自旋**（自动判断要自旋多少次）

```plain
MarkWord: [Ptr to LockRecord] [LockState: 00]
              ↑
          指向栈帧上的 Lock Record
```

### 自旋的艺术

不是无限自旋！JVM 会根据历史信息自动调整：

- 前几次都成功 → 自旋次数多一点
- 前几次都失败 → 自旋次数少一点
- 一直失败 → 升级到重量级锁

这就是**适应性自旋**。

---

## 四、重量级锁：竞争激烈的救世主

![image](/面试题/高频面试问题/徐庶老师/1221-synchronized-lock-upgrade-explained/img-6839849b8878.png)

### 触发场景

当轻量级锁无法高效解决问题时（自旋频繁失败），就需要重量级锁：

```plain
线程 A 持有锁，线程 B 自旋失败，线程 C 也来抢...
→ CAS 连续失败 → 膨胀为 Monitor
```

### 工作机制

此时 JVM 会升级为 **Monitor 对象（监视器）**，这是一个真正的操作系统级别的互斥锁：

```plain
MarkWord: [Ptr to Monitor] [LockState: 10]
               ↑
           指向堆上的 Monitor
```

Monitor 包含几个关键部分：

**部分**
**作用**

**Owner**
记录获得锁的线程

**EntryList**
等待获得锁的线程队列

**WaitSet**
调用了 wait() 的线程队列

**关键行为**：

- 竞争失败的线程进入 **EntryList**，从运行态变为 **BLOCKED** 态
- 由 OS 内核负责线程的调度和唤醒
- 开销大，但能精准控制

---

## 五、锁升级的完整流程图

```plain
    ┌─ 无锁状态 (Normal) ─┐
    │  MarkWord: 001      │
    │  hashCode() 调用 ❌ │
    └──────────┬──────────┘
              │ synchronized 第一次进入
              ↓
    ┌─ 偏向锁 (Biased) ──┐
    │ MarkWord: ThreadID │
    │ 单线程，零开销 ✓    │
    └──────────┬──────────┘
              │ 其他线程来临
              ↓
    ┌─ 轻量级锁 (Light) ─┐
    │ MarkWord: LkRecord │
    │ CAS + 自旋         │
    │ 交替执行时最优 ✓   │
    └──────────┬──────────┘
              │ 竞争激烈，自旋失败
              ↓
    ┌─ 重量级锁 (Heavy) ─┐
    │ MarkWord: Monitor  │
    │ 线程阻塞，OS介入   │
    │ 竞争激烈时最优 ✓   │
    └────────────────────┘
```

**一旦升级，就不会降级！** 这是 JVM 的设计决策。

---

## 六、性能启示录

### 什么时候锁最快？

✅ **偏向锁** < ✅ **轻量级锁** < ⚠️ **重量级锁** < ❌ **无锁**

- 单线程无竞争 → 偏向锁（2 ns 以内）
- 多线程轻度竞争 → 轻量级锁（几十 ns）
- 多线程激烈竞争 → 重量级锁（微秒级别）
- 没有同步 → 最快（内联优化）

### 实战建议

#### 1. **避免调用 hashCode()**

```plain
// ❌ 坏的做法
Object obj = new Object();
System.out.println(obj.hashCode());  // 破坏了偏向锁资格
synchronized(obj) { ... }

// ✓ 好的做法
Object obj = new Object();
synchronized(obj) { 
    // 在这里才需要的话调用 hashCode
}
```

#### 2. **用 ConcurrentHashMap 替代 HashMap**

```plain
// ❌ 不好
Map<String, String> map = new HashMap<>();
synchronized(map) {
    map.put("key", "value");
}

// ✓ 更好
Map<String, String> map = new ConcurrentHashMap<>();
map.put("key", "value");  // 内部已经优化
```

#### 3. **及时释放锁持有的资源**

锁被持有的时间越长，其他线程竞争的概率越大，越容易升级到重量级锁。

```plain
synchronized(obj) {
    // 只在这里做必要的工作
    dataList.add(item);
}
// 不要在 synchronized 块内做 IO 或耗时操作
```

#### 4. **关注 JDK 版本差异**

- **JDK 15+**：偏向锁默认禁用
- **JDK 6-14**：偏向锁默认启用
- 可通过 `-XX:+UseBiasedLocking` 启用/禁用

---

## 七、观察锁状态的方式

想看看你的对象现在是什么锁吗？可以使用 `jol` 库：

```plain
&lt;dependency&gt;
    &lt;groupId&gt;org.openjdk.jol&lt;/groupId&gt;
    &lt;artifactId&gt;jol-core&lt;/artifactId&gt;
    &lt;version&gt;0.16&lt;/version&gt;
&lt;/dependency&gt;
```

```plain
import org.openjdk.jol.info.ClassLayout;

public class LockDemo {
    public static void main(String[] args) {
        Object obj = new Object();
        System.out.println(ClassLayout.parseInstance(obj).toPrintable());
        
        synchronized(obj) {
            System.out.println("在锁内:");
            System.out.println(ClassLayout.parseInstance(obj).toPrintable());
        }
    }
}
```

输出中的 `mark word` 部分就是 MarkWord 的当前状态。

---

## 八、总结

**锁类型**
**场景**
**MarkWord**
**性能**
**CAS 操作**

无锁
无竞争
HashCode
最快
❌

偏向
单线程
ThreadID
极快
1 次

轻量
轻度竞争
LockRecord
快
N 次（自旋）

重量
激烈竞争
Monitor
慢
转入阻塞

**核心认知**：

- synchronized 不是一成不变的，而是**智能自适应**的
- 锁的性能取决于**竞争程度**，而不是 synchronized 本身
- 大多数时候，偏向锁和轻量级锁已经足够高效
- 理解锁升级过程，能帮你写出更高效的并发代码

---

**最后的话**：

下次再看到有人说"synchronized 很慢"时，你可以自信地说："那只是你没用好。" 😎

Java 的设计者通过对象头中的两个 bit，构建了一个精美的性能优化体系。这就是为什么 Java 能在企业级应用中屹立 20+ 年的原因之一。
