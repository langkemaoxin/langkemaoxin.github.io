---
title: "什么是不可变对象，对写并发有什么帮助"
sidebarGroup: "并发编程"
shortTitle: "什么是不可变对象，对写并发有什么帮助"
order: 271
date: 2026-01-08
category: "面试题"
tag:
  - "面试题"
description: "一、 标准面试回答模版（建议背诵）面试官： 什么是不可变对象？它对写并发程序有什么帮助？Fox版标准回答：“1. 什么是不可变对象？ 不可变对象（Immutable Object）是指对象一旦被创建，其内部状态（数据）就永远无法被改变的对象"
article: false
---

> 来源：[什么是不可变对象，对写并发有什么帮助](https://www.yuque.com/tulingzhouyu/db22bv/cdgpu3m1h6v33oz5)

### 一、 标准面试回答模版（建议背诵）

**面试官：** 什么是不可变对象？它对写并发程序有什么帮助？

**Fox版标准回答：**

“**1. 什么是不可变对象？** 不可变对象（Immutable Object）是指**对象一旦被创建，其内部状态（数据）就永远无法被改变**的对象。 在 Java 中，典型的例子是 `String`、`Integer` 等包装类。要构建一个不可变对象，通常需要遵守以下 4 条规则：

- 类被 `final` 修饰（防止子类破坏）。
- 所有成员变量都是 `private final` 的。
- **不提供任何 Setter 方法**。
- **关键点**：如果有引用类型的成员变量（如 `List`、`Date`），在构造器和 Getter 方法中必须进行**防御性拷贝（Defensive Copy）**，防止外部修改内部状态。

**2. 对并发编程的帮助（核心价值）：**

- **天生线程安全（Biggest Win）：** 因为状态不可变，所以不存在‘竞态条件’，多线程同时访问**不需要任何加锁同步（synchronized/Lock）**。
- **高性能：** 省去了加锁、解锁、上下文切换的开销，读取性能极高。
- **原子性保证：** 任何操作要么返回一个新对象，要么返回旧对象，永远不会出现‘数据被改了一半’的中间状态（Failure Atomicity）。
- **JMM 内存语义：**`final` 关键字提供了特殊的内存屏障保证（初始化安全性），确保对象只要构造完成，其他线程立马就能看到正确的值，不会发生指令重排导致的‘半初始化’问题。”

### 二、 代码层面对比

面试时，手写出**防御性拷贝**是证明你懂不可变对象的关键细节。

```java
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

// 1. 类用 final 修饰，断子绝孙，防止子类修改
public final class ImmutablePerson {

    // 2. 字段用 final 修饰，一旦赋值不可变
    private final String name;
    private final List&lt;String&gt; hobbies;

    public ImmutablePerson(String name, List&lt;String&gt; hobbies) {
        this.name = name;
        // 【Look at me - 坑点】
        // 千万不能直接 this.hobbies = hobbies; 
        // 必须深拷贝！否则外部持有这个 List 的引用依然能修改它。
        this.hobbies = new ArrayList<>(hobbies);
    }

    public String getName() {
        return name;
    }

    public List&lt;String&gt; getHobbies() {
        // 【Look at me - 坑点】
        // 不能直接返回 internal list，否则外面拿到引用就能 add/remove。
        // 返回一个不可修改的视图
        return Collections.unmodifiableList(hobbies);
    }
}

// 测试并发安全性
class Test {
    public static void main(String[] args) {
        List&lt;String&gt; list = new ArrayList<>();
        list.add("Coding");

        ImmutablePerson person = new ImmutablePerson("Fox", list);

        // 就算我在外面疯狂改原 list
        list.add("Fishing");

        // 不可变对象内部依然稳如泰山，完全不受影响，线程绝对安全
        System.out.println(person.getHobbies()); // 输出 [Coding]
    }
}
```

### 三、 Fox的深度解析（降维打击）

如果面试官问：**“String 为什么要设计成不可变的？”** 或者 **“final 关键字在 JMM 中有什么特殊作用？”**

你要甩出这个**P7级**的底层视角：

**1. JMM 的 Final 域重排序规则：**

“面试官，不可变对象不仅仅是‘不许改’这么简单。 在 Java 内存模型中，`final` 域有特殊的语义。 编译器和处理器会遵守一条规则：**在构造函数内对一个 **`final`** 域的写入，与随后把这个被构造对象的引用赋值给一个引用变量，这两个操作不能重排序。**

**翻译成人话就是：** 只要对象构造完毕（构造器返回了），其他线程看到的 `final` 字段一定是初始化好的值。而不像普通变量，可能因为指令重排，导致其他线程看到一个‘默认值（0或null）’的中间状态。这就是**初始化安全性（Initialization Safety）**。”

**2. 字符串常量池（String Pool）：**

“正是因为 `String` 是不可变的，JVM 才能放心大胆地实现**字符串常量池**。如果是可变的，两个引用指向同一个池里的字符串，一个改了，另一个也跟着变了，世界就乱套了。”
