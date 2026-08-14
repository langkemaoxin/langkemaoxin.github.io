---
title: "为何学并发编程——线程与等待通知入门"
sidebarGroup: "并发基础"
shortTitle: "01 为何学并发"
order: 1
date: 2026-11-07
category: "并发编程"
tag:
  - "并发编程"
  - "Java"
---

> **并发基础 · 第 1/5 篇**  
> 下一篇：[《线程等待与通知机制深入》](/并发编程/basics/juc-02-wait-notify)

---

## 开头：为什么后端开发绕不开并发？

订单、库存、支付各自跑在不同线程里；网关要同时处理成千上万连接；报表任务和接口请求共享同一台机器——**并发不是「高级特性」，而是日常工作的默认背景**。不懂线程怎么创建、怎么协作，排查「偶发卡死」「数据不对」时会非常被动。

本篇从**为什么要学并发**出发，梳理进程与线程、上下文切换、并发与并行，再到 Java 里如何创建线程、认识线程状态与常用 API，为后续 wait/notify 和 JMM 打底。

---

## 一、为什么要学并发编程

并发编程与性能优化密切相关，常见收益有三类：

### 1. 加快响应用户的时间

多线程下载比单线程快，是最直观的例子。互联网服务里，页面响应哪怕快 1 秒，在大流量下都可能带来可观转化。前端把静态资源拆到两三个子域名加载，也是为了让浏览器多开连接并行拉取，本质同样是「多线程/多连接缩短等待」。

### 2. 让代码模块化、异步化、简单化

电商下单后，发短信、发邮件可以拆成独立模块，交给其他线程执行：主流程更快返回，模块边界也更清晰。多线程不只是「跑得快」，也是一种**职责拆分**手段。

### 3. 充分利用 CPU 资源

当前机器几乎都是多核。若设计仍停留在单线程，算力会被闲置。合理的多线程程序可以同时在多个核上推进任务，减少 CPU 空闲。

**单核是否也需要并发？** 需要。以聊天程序为例：键盘输入、网络收发、界面刷新往往交织发生；若不能并发处理，对话就只能严格一问一答。单核上的「同时」是时间片交替，但用户体验上仍像并行。

---

## 二、进程与线程

应用程序由指令和数据组成。未运行时，它们是磁盘上的二进制；运行时，指令要进 CPU、数据要进内存，还可能用到磁盘、网络——**进程**就是操作系统用来加载指令、管理内存与 I/O 的单位。

- **进程**：程序的一次运行实例，是资源分配（以内存为主）的最小单位。多数程序可开多个实例（记事本、浏览器），也有程序限制单实例。
- **线程**：CPU 调度的最小单位，依附于进程；自身资源很少（程序计数器、一组寄存器、栈），但共享进程的内存等资源。同一进程可有多个线程。

| 维度 | 进程 | 线程 |
|------|------|------|
| 关系 | 相互相对独立 | 进程内的子集 |
| 资源 | 拥有独立地址空间等 | 共享进程资源，切换更轻量 |
| 通信 | IPC；跨机器还需网络协议 | 共享变量即可，相对简单 |
| 调度 | 资源分配单位 | CPU 调度单位 |

同一时刻，一个 **CPU 核心**通常只跑一个线程（1:1）。Intel 超线程引入**逻辑处理器**后，可能出现「6 核 12 线程」这种 1:2 关系。Java 中：

```java
int n = Runtime.getRuntime().availableProcessors(); // 逻辑处理器数
```

线程池大小等调优，经常要参考这个值。

---

## 三、上下文切换、并发与并行

### 上下文切换

线程使用 CPU 时依赖寄存器、程序计数器等状态。操作系统在线程间调度时，需要：

1. 暂停当前线程，把其 CPU 状态（上下文）存到内存；
2. 取出下一个线程的上下文，恢复到寄存器；
3. 从程序计数器指示的位置继续执行。

一次上下文切换大约需要数千到数万时钟周期，相对「几条普通指令」成本很高。线程/进程切换、系统调用等都会触发切换——这也是「线程不是越多越好」的原因之一。

### 并发 vs 并行

- **并发（Concurrent）**：单位时间内交替执行多个任务。单核多线程时，CPU 在任务间快速切换，宏观上像同时进行，微观上仍是串行——常说「微观串行，宏观并行」。
- **并行（Parallel）**：多核上多个任务**真正同时**执行，例如一边吃饭一边打电话。

离开「单位时间」谈并发量没有意义；谈并行则要看是否有多个可同时工作的执行单元（多核）。

---

## 四、Java 天生是多线程程序

从 `main` 启动的程序，执行入口本身就是名为 `main` 的线程。即使用户代码不 `new Thread`，JVM 通常还会有 Reference Handler、Finalizer、Signal Dispatcher、Attach Listener 等系统线程（具体名单随 JDK 版本略有差异）。

```java
public class OnlyMain {
    public static void main(String[] args) {
        ThreadMXBean threadMXBean = ManagementFactory.getThreadMXBean();
        ThreadInfo[] threadInfos = threadMXBean.dumpAllThreads(false, false);
        for (ThreadInfo threadInfo : threadInfos) {
            System.out.println("[" + threadInfo.getThreadId() + "] "
                    + threadInfo.getThreadName());
        }
    }
}
```

这说明：Java 程序从第一天起就活在多线程环境里，并发不是「可选项」。

---

## 五、创建与启动线程

### 三种常见写法

**方式 1：继承 / 匿名 `Thread`（线程与任务合在一起）**

```java
Thread t1 = new Thread("t1") {
    @Override
    public void run() {
        log.debug("Hello Thread");
    }
};
t1.start();
```

**方式 2：实现 `Runnable`（任务与线程分离，更灵活）**

```java
Runnable task = () -> log.debug("hello");
Thread t2 = new Thread(task, "t2");
t2.start();
```

**方式 3：`FutureTask` + `Callable`（可返回结果）**

`Runnable.run()` 无返回值；`Callable.call()` 可返回泛型结果，也可抛出受检异常。`Thread` 构造不直接收 `Callable`，需要用 `FutureTask` 包成 `Runnable`，再 `get()` 取结果：

```java
FutureTask<Integer> task3 = new FutureTask<>(() -> {
    log.debug("hello");
    return 100;
});
new Thread(task3, "t3").start();
Integer result = task3.get(); // 阻塞等待结果
```

小结：

- `Thread` 才是 Java 对「线程」的抽象；`Runnable` / `Callable` 是对「任务」的抽象。
- 方式 2 让任务脱离 `Thread` 继承体系，更容易交给线程池等高级 API。

### 面试：创建线程有几种方式？

按 `Thread` 源码注释的官方说法：**两种**——派生 `Thread`，或实现 `Runnable`。

本质上真正启动 OS 线程只有一条路：`new Thread(...).start()`。`Callable` 经 `FutureTask` 包装后仍是 `Runnable` 路径；线程池是池化复用，并不算新的「创建方式」。

### `start()` 与 `run()`

- `start()`：进入就绪队列等待调度，最终由新线程执行 `run()`；内部会调 native `start0()`，与操作系统相关；**每个线程对象只能 `start` 一次**，重复调用会抛 `IllegalThreadStateException`。
- `run()`：普通成员方法，可重复调用，也可单独调用——**不会启动新线程**。

---

## 六、线程状态与常用方法

### 六种状态（`Thread.State`）

| 状态 | 含义 |
|------|------|
| `NEW` | 已创建对象，尚未 `start()` |
| `RUNNABLE` | 就绪或运行中（Java 把 ready/running 合称 Runnable） |
| `BLOCKED` | 阻塞在锁上 |
| `WAITING` | 无限期等待其他线程的特定动作（通知/中断等） |
| `TIMED_WAITING` | 带超时的等待（如 `sleep`、带超时的 `join`） |
| `TERMINATED` | 已结束，不再转换到其他状态 |

从操作系统视角还可细分为：初始（未与 OS 线程关联）、可运行、运行、阻塞（如 BIO）、终止。CPU 时间片用完会从运行回到可运行，并伴随上下文切换；调用阻塞 API 进入阻塞后，调度器在唤醒前不会再调度该线程。

掌握状态机，对排查卡住、调优很有帮助。

### 常用方法

| 方法 | 作用 | 注意 |
|------|------|------|
| `start()` | 启动新线程执行 `run` | 只可调用一次 |
| `run()` | 任务逻辑 | 直接调用不会起新线程 |
| `join()` / `join(long)` | 等待线程结束 | 可限时 |
| `getId()` / `getName()` / `setName` | 标识与命名 | id 唯一 |
| `getPriority()` / `setPriority(1~10)` | 优先级提示 | 调度器可忽略 |
| `getState()` | 取六种状态之一 | — |
| `isInterrupted()` | 是否被中断 | **不**清除中断标记 |
| `interrupted()` | 当前线程是否被中断 | **会**清除标记 |
| `isAlive()` | 是否仍存活 | — |
| `interrupt()` | 中断线程 | 若在 sleep/wait/join，常抛 `InterruptedException` 并清除标记 |
| `sleep(long)` | 休眠让出 CPU | 进入 `TIMED_WAITING`，**不释放锁** |
| `yield()` | 提示让出 CPU | 进入 `RUNNABLE`，**不释放锁** |
| `currentThread()` | 当前正在执行的线程 | static |

已过时、易破坏同步的方法（如 `stop` / `suspend` / `resume`）不要再使用。

### sleep 与 yield

- `sleep`：从 Running 进入 Timed Waiting；可被 `interrupt` 打断并抛异常；醒了未必立刻执行；推荐 `TimeUnit.SECONDS.sleep(...)` 提高可读性；参数为 0 时效果接近 `yield`。
- `yield`：提示调度器让出 CPU，给优先级更高（或相同）的线程机会；具体行为依赖 OS。

没有有效计算时，不要 `while (true)` 空转。`ConcurrentHashMap#initTable` 里用 `yield`，是为了在「只允许一个线程初始化 table」时，避免其他线程阻塞等待带来的上下文切换——初始化很快，让出 CPU 往往更划算。

`sleep` 适合**无需锁同步**的等待；若要和锁/条件变量配合，更常见的是 `wait` 或条件队列（下篇展开）。

### 线程优先级

`priority` 范围 1～10，默认 5。忙时高优先级可能多分时间片，闲时几乎没作用；不同 JVM/OS 甚至会忽略设定。正确性**不能**依赖优先级——频繁阻塞的线程可略调高，重计算线程可略调低，仅作提示。

---

## 七、join：同步等待异步结果

主线程与工作线程并行时，若主线程过早读取共享变量，可能读到旧值：

```java
private static int count = 0;

public static void main(String[] args) throws InterruptedException {
    Thread t1 = new Thread(() -> {
        SleepTools.second(1);
        count = 5;
    }, "t1");
    t1.start();
    log.debug("结果为:{}", count); // 很可能仍是 0
}
```

在读取前 `t1.join()`，调用方会等到 `t1` 结束，再继续——从调用方角度看，这是**同步**等待异步任务完成。

```java
t1.start();
t1.join();
log.debug("结果为:{}", count); // 5
```

![join 等待线程结束示意](/并发编程/basics/01/p15-01.png)

**经典题**：让 T1、T2、T3 按序执行——可在 T2 里 `t1.join()`，在 T3 里 `t2.join()`。

![join 同步语义](/并发编程/basics/01/p18-01.png)

---

## 八、守护线程

**守护线程（Daemon）**：当进程中所有非守护线程都结束后，JVM 会退出，守护线程会被强制终止（典型如 GC 相关线程）。

- `setDaemon(true)` 必须在 `start()` **之前**调用。
- 适合心跳、后台监听等「进程退出即可丢弃」的工作；不要把必须落盘的关键逻辑放在守护线程里。

---

## 小结

1. 学并发，是为了**更快响应、更清晰的异步拆分、吃满多核**——单核也需要「交替推进」的并发模型。  
2. 先分清**进程 / 线程、上下文切换、并发 / 并行**，再谈 Java API。  
3. 创建执行路径：官方口径两种（`Thread` / `Runnable`）；`Callable`+`FutureTask` 仍归任务抽象；关键是 `start` vs `run`。  
4. 六种状态 + `sleep` / `yield` / `join` / 中断 / 守护线程，是后续 wait/notify、JMM、锁与线程池的地基。

下一篇：[《线程等待与通知机制深入》](/并发编程/basics/juc-02-wait-notify)——两阶段终止、`volatile`、`wait/notify` 与 `LockSupport`。
