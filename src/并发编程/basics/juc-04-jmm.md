---
title: "原子性、可见性、有序性与 JMM"
sidebarGroup: "并发基础"
shortTitle: "04 JMM 三特性"
order: 4
date: 2026-11-10
category: "并发编程"
tag:
  - "并发编程"
  - "JMM"
---

> **并发基础 · 第 4/5 篇**  
> 上一篇：[《常用并发设计模式》](/并发编程/basics/juc-03-design-patterns) · 下一篇：[《CPU 缓存架构与多核可见性问题》](/并发编程/basics/juc-05-cpu-cache)

---

## 开头：并发 Bug 从哪来？

十个线程各加一万次，`counter` 却不到十万——不是「运气不好」，是**原子性**丢了。一个线程改了 `flag`，另一个死循环读不到——**可见性**丢了。双重检查单例偶发 NPE——**有序性**（重排序）在作怪。

本篇讲清 Java 并发三大特性，并深入 **JMM 抽象结构**、锁与 volatile 的内存语义、DCL 与 **happens-before**。

---

## 一、原子性（Atomicity）

**定义**：一个或多个操作，要么全部执行且在执行过程中不被任何因素打断，要么全部不执行。

在 Java 中，对基本数据类型的**读取和赋值**通常是原子操作（64 位处理器上）。**不采取任何保障的自增操作并不是原子性的**，比如 `i++`（读-改-写三步）。

```java
public class AtomicTest {
    private static int counter = 0;

    public static void main(String[] args) throws InterruptedException {
        for (int i = 0; i < 10; i++) {
            new Thread(() -> {
                for (int j = 0; j < 10000; j++) {
                    counter++;
                }
            }).start();
        }
        Thread.sleep(3000);
        System.out.println(counter); // 常小于 100000
    }
}
```

**思考**：在 32 位机器上对 `long` 型变量加减是否存在并发隐患？——不能保证原子性，可用 `volatile` 修饰（仍不保证 `long++` 原子，需锁或原子类）。

**保证手段**：

- `synchronized`  
- `Lock`  
- **CAS / 原子类**

---

## 二、可见性（Visibility）

**定义**：当多个线程访问同一个变量时，一个线程修改了变量的值，其他线程能够**立即看到**修改的值。

```java
public class VisibilityTest {
    private boolean flag = true;

    public void refresh() {
        flag = false;
        System.out.println(Thread.currentThread().getName() + "修改flag:" + flag);
    }

    public void load() {
        System.out.println(Thread.currentThread().getName() + "开始执行.....");
        while (flag) {
            // 加载数据
        }
        System.out.println(Thread.currentThread().getName() + "数据加载完成，跳出循环");
    }

    public static void main(String[] args) throws InterruptedException {
        VisibilityTest test = new VisibilityTest();
        Thread threadA = new Thread(() -> test.load(), "threadA");
        threadA.start();
        Thread.sleep(1000);
        Thread threadB = new Thread(() -> test.refresh(), "threadB");
        threadB.start();
    }
}
```

运行结果：`threadA` 可能无法跳出循环——`threadB` 对 `flag` 的更新对 `threadA` **不可见**。

**原因**：各线程有**工作内存（本地内存）**副本，与主内存同步时机由 JMM 规定。

**保证手段**：`volatile`、内存屏障、`synchronized`、`Lock`。

---

## 三、有序性（Ordering）

**定义**：程序执行的顺序按照代码的先后顺序执行。为提升性能，编译器和处理器常做**指令重排序**，单线程下 as-if-serial 不变，多线程下可能踩坑。

经典实验：两线程分别执行 `a=1; x=b;` 与 `b=1; y=a;`，可能出现 **x=0, y=0**（重排序导致）。

```java
public class ReOrderTest {
    private static int x = 0, y = 0;
    private static int a = 0, b = 0;

    public static void main(String[] args) throws InterruptedException {
        int i = 0;
        while (true) {
            i++;
            x = y = a = b = 0;
            Thread thread1 = new Thread(() -> {
                shortWait(20000);
                a = 1;
                x = b;
            });
            Thread thread2 = new Thread(() -> {
                b = 1;
                y = a;
            });
            thread1.start();
            thread2.start();
            thread1.join();
            thread2.join();
            System.out.println("第" + i + "次（" + x + "," + y + ")");
            if (x == 0 && y == 0) break;
        }
    }
}
```

**保证手段**：`volatile`、`synchronized`、`Lock`、内存屏障。

---

## 四、Java 内存模型（JMM）

> 注意：JMM ≠ JVM 内存结构（堆/栈/GC）。面试问 JMM 通常指**并发可见性与重排序**。

并发编程需解决：**多线程如何通信**、**多线程如何同步**。Java 采用**共享内存**模型，由 JMM 控制写入何时对其它线程可见。

### 4.1 抽象结构

- **主内存**：共享变量所在。  
- **工作内存**：线程私有副本（涵盖缓存、写缓冲、寄存器等抽象，并非真实独立区域）。

线程对共享变量的所有操作须在自己的工作内存中进行，不能直接从主内存读。

**通信步骤**（线程 A → 线程 B）：

1. A 把工作内存中更新过的共享变量**刷新到主内存**  
2. B 从主内存**读取** A 更新过的变量  

线程 A 无法直接访问 B 的工作内存；JMM 通过控制主内存与每个线程工作内存的交互，提供可见性保证。

### 4.2 八种原子操作（了解）

| 操作 | 作用 |
|------|------|
| lock / unlock | 主内存变量加锁/解锁 |
| read / load | 主内存 → 工作内存 |
| use / assign | 工作内存 ↔ 执行引擎 |
| store / write | 工作内存 → 主内存 |

**规则摘要**（不必逐条背，理解意图即可）：

- read+load、store+write 须成对出现  
- 不允许丢弃最近 assign、不允许无 assign 就 write 回  
- 新变量只能在主内存诞生  
- lock/unlock 成对；unlock 前须 store+write 回主内存  

### 4.3 可见性案例与底层实现

Java 中可见性底层常见实现：

1. **内存屏障**（如 HotSpot 中 `lock addl $0,0(%rsp)`）  
2. **CPU 上下文切换**带来的副作用（`Thread.yield()`、`sleep(0)` 等）  

结合可见性案例理解：threadB 写 `flag` 后，threadA 的工作内存何时失效、何时从主内存重新 load。

---

## 五、锁的内存语义

- **加锁**：JMM 把该线程对应的工作内存中共享变量置为无效，从主内存重新加载。  
- **解锁**：把工作内存中修改 flush 到主内存。

因此 `synchronized` 在正确使用下同时保证**互斥 + 可见性**。

---

## 六、volatile 内存语义

- **写 volatile**：JMM 把该线程工作内存中的共享变量刷新到主内存。  
- **读 volatile**：JMM 把该线程工作内存中该变量副本置为无效，从主内存读取。

**禁止重排序规则**：

1. 第二个操作是 volatile **写** → 其前面不能重排序  
2. 第一个操作是 volatile **读** → 其后面不能重排序  
3. volatile **写** + volatile **读** → 中间不能重排序  

**实现**：编译器插入 **StoreStore / StoreLoad / LoadLoad / LoadStore** 屏障；x86 上对读-读、读-写、写-写不重排，可省略部分屏障，仅写-读需屏障。

### 双重检查锁定（DCL）

错误写法：`singleton = new Singleton()` 可分解为：

```text
memory = allocate();   // 1. 分配内存
ctorInstance(memory);  // 2. 初始化对象
instance = memory;     // 3. 引用指向内存
```

2 与 3 可能重排序 → 其它线程看到非 null 但未构造完成的对象 → NPE。

**修复**：`private volatile static Singleton singleton;`

---

## 七、happens-before

JMM 给程序员的**可见性承诺**（不要求物理执行顺序一致）：

**定义要点**：

1. 若 A happens-before B，则 A 的结果对 B 可见，且 A 在顺序上排在 B 之前（程序员视角）。  
2. 存在 hb 关系**不意味着** JVM 必须按该顺序执行——只要重排后结果一致即可（对编译器/处理器的约束）。

**JSR-133 规则**：

| 规则 | 含义 |
|------|------|
| 程序顺序 | 同线程内，前操作 hb 后操作 |
| 锁 | unlock hb 后续 lock |
| volatile | 写 hb 后续读 |
| 传递 | A hb B，B hb C → A hb C |
| 线程启动 | start() hb 线程内任意操作 |
| 线程中断 | interrupt() hb 检测到中断 |
| 线程终结 | join() 成功返回 hb 被 join 线程内操作 |
| 对象终结 | 初始化完成 hb finalize 开始 |

**总结**：

- `volatile` 保可见 + 禁部分重排  
- `synchronized` 还保互斥与同步块原子性  
- 底层靠内存屏障；happens-before 是更易用的抽象  
- as-if-serial 保证单线程结果不变；正确同步的多线程程序结果也不变  

---

## 小结

- Bug 源头：**原子性、可见性、有序性**。  
- JMM 管的是**主内存 ↔ 工作内存**交互，不是堆栈布局。  
- **DCL 必须 volatile**；理解 hb 规则比背八种操作更实用。

下一篇从 **CPU 缓存与 MESI** 解释「为什么工作内存会不一致」。
