---
title: "死锁与活锁，死锁与饥饿的区别"
sidebarGroup: "并发编程"
shortTitle: "死锁与活锁，死锁与饥饿的区别"
order: 264
date: 2026-01-22
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 请说一下死锁、活锁、饥饿的区别。Fox版标准回答：“这三种都是多线程活跃性问题，但表现形式完全不同。1. 死锁 (Deadlock) vs 活锁 (Livelock)状态不同：死锁是‘大家都动不了"
article: false
---

> 来源：[死锁与活锁，死锁与饥饿的区别](https://www.yuque.com/tulingzhouyu/db22bv/ueudfqngzd2ts0a8)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 请说一下死锁、活锁、饥饿的区别。

**Fox版标准回答：**

“这三种都是多线程活跃性问题，但表现形式完全不同。

**1. 死锁 (Deadlock) vs 活锁 (Livelock)**

- **状态不同**：

- **死锁**是‘大家都动不了’。线程处于 **BLOCKED / WAITING** 状态，无法继续执行。
- **活锁**是‘大家都在动，但谁也推不动’。线程一直处于 **RUNNABLE** 状态，一直在做任务（比如重试），但进度一直为 0。

- **CPU 表现（关键区别）**：

- **死锁**通常会导致 CPU 利用率**归零**（因为线程都挂起了）。
- **活锁**通常会导致 CPU 利用率**飙升**（因为线程在疯狂空转重试）。

- **形象比喻**：

- **死锁**：两辆车在单行道相遇，互不相让，都熄火停车，谁也过不去。
- **活锁**：两个人在走廊相遇，A 往左躲，B 也往左躲；A 往右，B 也往右。两人都在动，都在‘礼让’，但谁也过不去。

**2. 死锁 (Deadlock) vs 饥饿 (Starvation)**

- **产生原因不同**：

- **死锁**是基于**资源互斥**和**循环等待**，是‘互相卡死’。
- **饥饿**是基于**调度策略不公**。比如线程优先级过低，或者非公平锁导致某个线程一直抢不到锁。

- **结果不同**：

- **死锁**是必然没救了，必须人工干预（重启或 kill）。
- **饥饿**是有几率恢复的，只要高优先级的任务执行完了，饿着的线程终究有机会吃上一口（虽然机会渺茫）。

- **形象比喻**：

- **饥饿**：你在自助餐厅排队，但是总有 VIP 插队。你一直站在那等，虽然没死，但一直吃不上饭。”

### 二、 代码层面对比

#### 1. 死锁（Deadlock）

最经典的“互相持有对方需要的锁”。

```java
public class DeadlockDemo {
    private static final Object lockA = new Object();
    private static final Object lockB = new Object();

    public static void main(String[] args) {
        new Thread(() -> {
            synchronized (lockA) {
                System.out.println("A拿到锁A，想要锁B");
                try { Thread.sleep(100); } catch (Exception e) {} // 模拟耗时，让B有机会拿锁
                synchronized (lockB) {
                    System.out.println("A拿到锁B");
                }
            }
        }).start();

        new Thread(() -> {
            synchronized (lockB) {
                System.out.println("B拿到锁B，想要锁A");
                try { Thread.sleep(100); } catch (Exception e) {}
                synchronized (lockA) { // 这里卡死
                    System.out.println("B拿到锁A");
                }
            }
        }).start();
    }
}
```

#### 2. 活锁（Livelock）

两个线程互相“谦让”，导致谁也干不成活。 **场景：** 两个人吃饭，只有一双筷子。A 拿到左边，B 拿到右边。A 发现 B 也要吃，就把左边放下；B 发现 A 也要吃，也把右边放下。然后两人又同时拿起……无限循环。

```java
public class LivelockDemo {
    static class Diner {
        private boolean isHungry = true;

        public void eatWith(Diner spouse, Object lock) {
            while (isHungry) {
                synchronized (lock) {
                    if (spouse.isHungry) {
                        System.out.println("你先吃...");
                        try { lock.wait(100); } catch (InterruptedException e) {} // 让出资源
                        continue; // 【关键点】：放弃当前操作，重新重试 -> 导致活锁
                    }
                    // 实际吃饭逻辑（永远到不了这里）
                    isHungry = false;
                }
            }
        }
    }
    // 代码简化示意，核心在于：获取资源失败 -> 主动回滚 -> 立即重试 -> 再次冲突
}
```

---

### 三、 Fox的实战必杀技（生产环境怎么排查）

面试官如果问：**“生产环境怎么判断是死锁还是活锁？”**

**Fox版回答：**

“Look at me! 别只看代码，要看监控！

1. **排查死锁**：

- 直接用命令 `jstack `。
- JVM 会非常贴心地在最后直接打印 `Found one Java-level deadlock`，并把哪些线程互相卡住了列得明明白白。

1. **排查活锁**：

- `jstack` 是看不出来的，因为它没有 BLOCKED。
- 你要结合 **CPU 监控** (`top -H -p `)。
- 如果你发现几个线程的 CPU 占用率常年 **100%**，但日志又不更新，业务进度不走，大概率就是活锁（在做无意义的死循环重试）。”
