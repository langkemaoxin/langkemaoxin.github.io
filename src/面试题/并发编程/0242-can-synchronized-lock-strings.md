---
title: "synchronized可以锁字符串吗"
sidebarGroup: "并发编程"
shortTitle: "synchronized可以锁字符串吗"
order: 242
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "在日常项目开发中为了解决用户数据并发操作的问题，需要对代码块进行加锁保护。例如：一个教务系统， 提供不同学校使用， 有一个考试场景， 需要记录不同学校的考试次数， 这里想尽可能把锁的对象放小，因此通常都是锁用户而不是锁整个类或者代码块；然而"
article: false
---

> 来源：[synchronized可以锁字符串吗](https://www.yuque.com/tulingzhouyu/db22bv/qx9qao0sah6mveha)

在日常项目开发中为了解决用户数据并发操作的问题，需要对代码块进行加锁保护。

例如：一个教务系统， 提供不同学校使用， 有一个考试场景， 需要记录不同学校的考试次数， 这里想尽可能把锁的对象放小，因此通常都是锁用户而不是锁整个类或者代码块；然而在用`synchronized(school)`
的时候可能会存在一些问题。

## synchronized 锁字符串的问题

### 使用synchronized锁一个字符串👇

```java
@RequestMapping("/saving")
public String saving(String school) {
// 常量池  全局
synchronized (school) {
    System.out.println(school + "学生交卷");
    save(school);
    System.out.println(school + "学生交卷完成");
    return "ok";
}
}
```

### 测试：

模拟http接口请求， Spring底层会通过new String()方式传入字符串参数， 而不是传入“”常量值

```java

static Map<String, Integer> values=new ConcurrentHashMap<>();
private  void extracted() throws InterruptedException {

Thread thread = new Thread(() -> saving(new String("北大")));
Thread thread1 = new Thread(() -> saving(new String("清华")));
Thread thread2 = new Thread(() -> saving(new String("清华")));
thread.start();
thread1.start();;
thread2.start();;
thread.join();
thread1.join();
thread2.join();
System.out.println(values);
}
```

### 运行结果如下：

3个同时并行：

![image](/面试题/并发编程/0242-can-synchronized-lock-strings/img-26863b25df19.png)

发生线程安全问题：

![image](/面试题/并发编程/0242-can-synchronized-lock-strings/img-4e7e2c803f18.png)

可以发现还是并发执行了，因为`synchronized (new String("字符串常量"))`
**锁的对象不是同一个，仅仅是值相等**，此时的字符串是在堆栈中。将代码修改为如下

```java
 @RequestMapping("/saving")
    public String saving(String school) { 
        // 常量池  全局
        synchronized (school.intern()) {
            System.out.println(school + "学生交卷");
            save(school);
            System.out.println(school + "学生交卷完成");
            return "ok";
        }
    }
```

得到运行结果为：

不同学校并行:

![image](/面试题/并发编程/0242-can-synchronized-lock-strings/img-c85a51c8dff0.png)

同一个学校串行：

![image](/面试题/并发编程/0242-can-synchronized-lock-strings/img-b3ccc1801d77.png)

通过上面结果可以看出此时通过**school.intern()把字符串对象放入常量池中，则"清华”地址是同一个**。

## synchronized 锁字符串用String的intern()存在的问题

通过上面的demo可以得出，使用synchronized 锁字符串，需要将字符串添加到字符串常量池中。日常使用中通过通过new对象的方式创建对象，再取对象的字段，因此需要使用intern把字符串放入常量池中，但是**直接使用String的intern全部把字符串放入常量池会存在一些问题**。显然在数据量很大的情况下，将所有字符串都放入常量池是不合理的，常量池大小依赖服务器内存，且只有等待fullGC，极端情况下会导致**频繁fullGC**。并且在数据量很大的情况下，将字符串放入常量会**存在性能问题**。

可以用google的guava包的interner类：

```java
public class test{
    private static Interner&lt;String&gt; lock = Interners.newWeakInterner();
    public void test() {
        synchronized (lock.intern(id.toString())){
            //do...
        }
    }
}
```

Interner是通过MapMaker构造ConcurrentMap来实现弱引用，ConcurrentMap用分段的方式保证安全。这里个人觉得比常量池的**优点**就在于这里是**弱引用的方式，便于map的回收，常量池只能依赖于fullGC，这里的回收在不使用或内存不够用条件下即可被回收**（Minor GC阶段）。

## 总结

- synchronized可以锁存活于字符串常量池中的值，不能锁存活于堆栈中的字符串（字符串地址要相同）
- 可以使用`String对象.intern()` 将该字符串放入字符串常量池中，但是常量池的回收只能依赖于fullGC，故不推荐使用
- 推荐使用guava包下的interner类，使用弱引用的方式，在内存不足的时候自动进行垃圾回收
