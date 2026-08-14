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

---

## 一、ThreadLocal 是什么

官方定义：提供**线程内部局部变量**；`get`/`set` 保证各线程数据相互独立。常见声明：`private static final ThreadLocal<T>`。

| 特性 | 说明 |
|------|------|
| 线程安全 | 无跨线程共享，无竞争 |
| 传递数据 | 同线程跨层传递，避免参数层层透传 |
| 线程隔离 | 各线程副本互不影响 |

### 常用 API

| 方法 | 作用 |
|------|------|
| `set(T)` | 绑定当前线程 |
| `get()` | 读取当前线程副本 |
| `remove()` | 移除，**线程池场景必调** |
| `initialValue()` | 首次 get 无值时的默认值（可重写） |

---

## 二、线程隔离示例

共享实例字段时，多线程 `setContent` 会互相覆盖：

```java
public class ThreadLocalDemo {
    private String content;
    // 多线程共享 demo 实例 → 输出混乱，如「线程0--->线程1的数据」
}
```

改为 ThreadLocal 后：

```java
public class ThreadLocalDemo2 {
    private static ThreadLocal<String> threadLocal = new ThreadLocal<>();

    private String getContent() { return threadLocal.get(); }
    private void setContent(String content) { threadLocal.set(content); }

    public static void main(String[] args) {
        ThreadLocalDemo2 demo = new ThreadLocalDemo2();
        for (int i = 0; i < 5; i++) {
            Thread thread = new Thread(() -> {
                demo.setContent(Thread.currentThread().getName() + "的数据");
                System.out.println(Thread.currentThread().getName() + "--->"
                    + demo.getContent());
            });
            thread.setName("线程" + i);
            thread.start();
        }
    }
}
// 输出：线程i--->线程i的数据
```

![未使用 ThreadLocal 时多线程数据串扰](/并发编程/async/03/p05-01.png)

![使用 ThreadLocal 后各线程数据隔离](/并发编程/async/03/p06-01.png)

---

## 三、与 synchronized 的区别

| | synchronized | ThreadLocal |
|---|--------------|-------------|
| 原理 | 以时间换空间，**共享一份** | 以空间换时间，**每线程一份** |
| 侧重点 | 多线程访问**同步** | 多线程**隔离** |

读多写少、工具类本身非线程安全时，ThreadLocal 往往**并发度更高**（无锁竞争）。

![synchronized 与 ThreadLocal 对比](/并发编程/async/03/p07-01.png)

![ThreadLocal 传递数据与线程隔离优势](/并发编程/async/03/p07-02.png)

---

## 四、Spring 事务为何用 ThreadLocal

JDBC 事务三阶段：

1. 取 Connection，设 `autoCommit=false`  
2. 执行业务 SQL  
3. `commit` 或 `rollback`  

Service 调多个 DAO 时，若每次新建连接无法共用一个事务边界；若每层传 Connection 参数，代码耦合严重。

**做法**：从连接池取 Connection 放入 ThreadLocal，同请求线程内 DAO 都取同一条连接；Web 请求一线程一周期，配合 IOC/AOP 隐式传递。

```java
Connection con = dbc.getConnection();
con.setAutoCommit(false);
con.executeUpdate(...);
con.commit();
```

---

## 五、内部结构（JDK 8+）

**常见误解**：每个 ThreadLocal 一个 Map，key 为 Thread——**JDK 早期设计，已废弃**。

**现设计**：

- 每个 **`Thread`** 持有 **`ThreadLocalMap threadLocals`**  
- Map 的 **key 是 ThreadLocal 实例**（弱引用），**value 是副本**  
- 由 ThreadLocal 的 get/set/remove 操作 Map  

**优势**：

1. Entry 数量随 ThreadLocal **种类**走，通常少于线程数。  
2. Thread 销毁时 Map 一并回收，减少内存占用。

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

ThreadLocalMap getMap(Thread t) {
    return t.threadLocals;
}

void createMap(Thread t, T firstValue) {
    t.threadLocals = new ThreadLocalMap(this, firstValue);
}
```

![ThreadLocal set 方法流程](/并发编程/async/03/p14-01.png)

### get

有 Map 且 Entry 存在 → 返回值；否则 **`setInitialValue()`**（调 `initialValue()` 并写入 Map）。`initialValue()` 默认返回 null，可子类重写；**首次 get 前未 set 时延迟调用，通常每线程最多一次**。

### remove

```java
public void remove() {
    ThreadLocalMap m = getMap(Thread.currentThread());
    if (m != null)
        m.remove(this);
}
```

线程池复用时释放 value——**防泄漏第一手段**。

---

## 七、ThreadLocalMap 与 Entry

- 开放定址 + **线性探测** 解决 hash 冲突（非链表）。  
- **`Entry extends WeakReference<ThreadLocal<?>>`**：key 弱引用，ThreadLocal 对象无强引用时可 GC。  
- **value 仍是强引用**。

### 内存泄漏真相

**泄漏根因**：ThreadLocalMap 生命周期 = Thread 生命周期（线程池里线程长期存活）。  
若未 `remove()`，Entry 的 value 无法被访问却仍存在强引用链：

```text
Thread → ThreadLocalMap → Entry → value（泄漏）
```

**强引用 key vs 弱引用 key**：无论哪种，只要 Thread 存活且未 remove，**value 都可能泄漏**。弱引用 key 不能保证避免泄漏。

**为何仍用弱引用 key**：ThreadLocal 实例无强引用被 GC 后，key 变 null；下次 set/get/remove 会清理 **stale Entry**（`replaceStaleEntry` / `cleanSomeSlots`），多一层保障。

**避免泄漏**：

1. 使用完 **`remove()`**  
2. 或 Thread 结束（线程池场景往往不满足）

---

## 八、hash 与冲突

- `threadLocalHashCode`：全局 `AtomicInteger` 递增 + 魔数 **`0x61c88647`**（斐波那契散列），使 hash 均匀分布在 2^n 数组中。  
- 索引：`hashCode & (length - 1)`，要求 **table 长度为 2 的幂**。  

**set 流程**：

1. 计算索引 i  
2. 线性探测：slot 已有相同 key → 覆盖 value；key 为 null（stale）→ `replaceStaleEntry`；否则 `nextIndex` 继续  
3. 必要时 `rehash`（负载因子约 2/3）

```java
private void set(ThreadLocal<?> key, Object value) {
    Entry[] tab = table;
    int i = key.threadLocalHashCode & (len - 1);
    for (Entry e = tab[i]; e != null; e = tab[i = nextIndex(i, len)]) {
        ThreadLocal<?> k = e.get();
        if (k == key) { e.value = value; return; }
        if (k == null) { replaceStaleEntry(key, value, i); return; }
    }
    tab[i] = new Entry(key, value);
    // cleanSomeSlots / rehash ...
}
```

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
- 异步切换到其它线程时，ThreadLocal **不会自动传递**（需 TransmittableThreadLocal 等或显式传参）。  
- 不要用 ThreadLocal 替代本该 **synchronized** 保护的共享写。

---

## 小结

- ThreadLocal = **每线程一份 Map 条目**，key 为 ThreadLocal 自身。  
- Spring 事务、traceId、非线程安全工具类的 per-thread 实例都依赖它。  
- **泄漏**：线程常驻 + 未 remove → value 常驻；弱引用 key 只是减轻 ThreadLocal 对象本身滞留。  
- **异步编程**系列至此结束；后续 **锁与同步** 系列从 CAS、synchronized 展开。
