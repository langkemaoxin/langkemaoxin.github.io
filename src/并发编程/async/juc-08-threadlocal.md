---
title: "ThreadLocal 原理与内存泄漏"
sidebarGroup: "异步编程"
shortTitle: "03 ThreadLocal"
order: 3
date: 2026-11-14
category: "并发编程"
tag:
  - "并发编程"
  - "ThreadLocal"
---

> **异步编程 · 第 3/3 篇**  
> 上一篇：[《CompletableFuture 异步编排实战》](/并发编程/async/juc-07-completable-future)

---

## 开头：同一段代码，为什么每个线程读到的不一样？

日志 traceId、Spring 事务绑定的 Connection、SimpleDateFormat——若用实例字段共享，多线程会串数据；若每次 `new` 又浪费。**ThreadLocal** 给每个线程一份独立副本：**线程隔离、同线程内传递、以空间换时间**。

本篇从使用场景到 **Thread → ThreadLocalMap → Entry** 源码，再到**内存泄漏**与 **hash 冲突**处理。

![ThreadLocal 系列定位](/并发编程/async/03/p02-page.png)

---

## 一、ThreadLocal 是什么

官方定义：提供**线程内部局部变量**；`get`/`set` 保证各线程数据相互独立。常见声明：`private static final ThreadLocal<T>`。

| 特性 | 说明 |
|------|------|
| 线程安全 | 无跨线程共享，无竞争 |
| 传递数据 | 同线程跨层传递，避免参数层层透传 |
| 线程隔离 | 各线程副本互不影响 |

![ThreadLocal 三大特性](/并发编程/async/03/p03-page.png)

### 常用 API

| 方法 | 作用 |
|------|------|
| `set(T)` | 绑定当前线程 |
| `get()` | 读取当前线程副本 |
| `remove()` | 移除，**线程池场景必调** |
| `initialValue()` | 首次 get 无值时的默认值（可重写） |

![ThreadLocal 常用方法](/并发编程/async/03/p04-page.png)

---

## 二、线程隔离示例

共享实例字段时，多线程 `setContent` 会互相覆盖：

```
线程0--->线程1的数据   // 错误：读到别的线程写的值
```

改为 ThreadLocal 后：

```java
private static ThreadLocal<String> threadLocal = new ThreadLocal<>();

private void setContent(String content) {
    threadLocal.set(content);
}
private String getContent() {
    return threadLocal.get();
}
// 输出：线程i--->线程i的数据
```

![未使用 ThreadLocal 的混乱输出](/并发编程/async/03/p05-01.png)

![使用 ThreadLocal 后正确隔离](/并发编程/async/03/p06-01.png)

---

## 三、与 synchronized 的区别

| | synchronized | ThreadLocal |
|---|--------------|-------------|
| 思路 | 以时间换空间，共享一份 | 以空间换时间，每线程一份 |
| 侧重 | 多线程访问**同步** | 多线程**隔离** |

读多写少、对象本身无状态时，ThreadLocal 往往**并发度更高**（无锁）。

![synchronized 与 ThreadLocal 对比](/并发编程/async/03/p07-01.png)

![ThreadLocal 适用场景](/并发编程/async/03/p07-02.png)

---

## 四、Spring 事务为何用 ThreadLocal

JDBC 事务三阶段：取 Connection → 业务 SQL → commit/rollback。  
Service 调多个 DAO 时，若每次新建连接无法共用一个事务边界。

**做法**：从连接池取 Connection 放入 ThreadLocal，同请求线程内 DAO 都取同一条连接；配合 IOC/AOP，无需每层传参。

![Spring 事务与 ThreadLocal](/并发编程/async/03/p08-page.png)

![三层架构中 Connection 传递问题](/并发编程/async/03/p09-page.png)

![ThreadLocal 解决跨层隐式传参](/并发编程/async/03/p10-page.png)

---

## 五、内部结构（JDK 8+）

**常见误解**：每个 ThreadLocal 一个 Map，key 为 Thread——**早期设计，已废弃**。

**现设计**：

- 每个 **`Thread`** 持有 **`ThreadLocalMap threadLocals`**  
- Map 的 **key 是 ThreadLocal 实例**（弱引用），**value 是副本**  
- 由 ThreadLocal 负责 get/set/remove 操作 Map  

优势：Entry 数量随 ThreadLocal 种类走，通常少于线程数；线程销毁时 Map 一并回收。

![JDK8 ThreadLocal 结构](/并发编程/async/03/p11-page.png)

![Thread 与 ThreadLocalMap 关系](/并发编程/async/03/p12-page.png)

![get/set 数据流](/并发编程/async/03/p13-page.png)

---

## 六、核心方法源码要点

### set

```java
public void set(T value) {
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    if (map != null)
        map.set(this, value);
    else
        createMap(t, value);
}
```

![set 方法流程](/并发编程/async/03/p14-01.png)

### get

有 Map 且 Entry 存在 → 返回值；否则 **`setInitialValue()`**（调 `initialValue()` 并写入 Map）。

![get 与 setInitialValue](/并发编程/async/03/p15-page.png)

### remove

当前线程 Map 存在则 **`map.remove(this)`**——线程池复用时释放 value，**防泄漏第一手段**。

![remove 方法](/并发编程/async/03/p16-page.png)

![initialValue 延迟初始化](/并发编程/async/03/p17-page.png)

---

## 七、ThreadLocalMap 与 Entry

- 开放定址 + **线性探测** 解决 hash 冲突（非链表）。  
- **`Entry extends WeakReference<ThreadLocal<?>>`**：key 弱引用，ThreadLocal 对象无强引用时可 GC。  
- **value 仍是强引用**，key 被回收后若未 remove，value 成为**无法访问的泄漏对象**。

### 内存泄漏真相

泄漏根因：**ThreadLocalMap 生命周期 = Thread 生命周期**（线程池里线程长期存活）。  
弱引用 key 只能保证 ThreadLocal 实例被回收；**value 泄漏与 key 强弱无关**，必须 **remove** 或线程结束。

key 弱引用的额外好处：ThreadLocal 被回收后，下次 set/get/remove 会清理 **key=null 的 stale Entry**（`replaceStaleEntry` / `cleanSomeSlots`）。

![Entry 弱引用结构](/并发编程/async/03/p19-page.png)

![强引用 key 时的泄漏链](/并发编程/async/03/p20-page.png)

![弱引用 key 时的泄漏链](/并发编程/async/03/p21-page.png)

![内存泄漏根因总结](/并发编程/async/03/p22-page.png)

---

## 八、hash 与冲突

- `threadLocalHashCode`：全局原子递增 + 魔数 `0x61c88647`（斐波那契散列），减少冲突。  
- 索引：`hashCode & (length - 1)`，要求 **table 长度为 2 的幂**。  
- 冲突：**开放定址**，`nextIndex` 环形探测；遇到 stale Entry 则替换并清理。

![hash 计算与构造 ThreadLocalMap](/并发编程/async/03/p23-page.png)

---

## 九、最佳实践

```java
private static final ThreadLocal<Context> CTX = new ThreadLocal<>();

try {
    CTX.set(context);
    // 业务
} finally {
    CTX.remove();  // 线程池必做
}
```

- 线程池 + ThreadLocal：**finally remove**。  
- 异步切换到其它线程时，ThreadLocal **不会自动传递**（需 TTL 等框架或显式传参）。  
- 不要用 ThreadLocal 替代本该 **synchronized** 保护的共享写。

---

## 小结

- ThreadLocal = **每线程一份 Map 条目**，key 为 ThreadLocal 自身。  
- Spring 事务、traceId、非线程安全工具类的 per-thread 实例都依赖它。  
- **泄漏**：线程常驻 + 未 remove → value 常驻；弱引用 key 只是减轻 ThreadLocal 对象本身滞留。  
- **异步编程**系列至此结束；后续 **锁与同步** 系列从 CAS、synchronized 展开。

![ThreadLocal 实践检查清单](/并发编程/async/03/p23-page.png)
