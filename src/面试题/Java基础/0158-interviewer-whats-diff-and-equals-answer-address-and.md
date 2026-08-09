---
title: "面试官：==和equals的区别？答“地址和内容”的，出门右转！"
sidebarGroup: "Java基础"
shortTitle: "面试官：==和equals的区别？答“地址和内容”的，出门右转！"
order: 158
date: 2026-08-05
category: "面试题"
tag:
  - "面试题"
description: "写在开头一位 1 年经验 的兄弟找我复盘，说面试挂得有点“冤”，心态崩了。 面试官刚开始为了缓解气氛，暖场问了一个入门级的送分题：“Java 里 == 和"
article: false
---

> 来源：[面试官：==和equals的区别？答“地址和内容”的，出门右转！](https://www.yuque.com/tulingzhouyu/db22bv/gt7vxanzhi7hu7ga)

## **
写在开头**

一位 **1 年经验** 的兄弟找我复盘，说面试挂得有点“冤”，心态崩了。 面试官刚开始为了缓解气氛，**暖场**问了一个入门级的**送分题**：“Java 里 `==` 和 `equals` 有什么区别？”

这哥们心想这还不简单，自信满满地背诵：“`==` 比较地址，`equals` 比较内容。”

没想到面试官听完，笑着连问了三个问题：

1. **“**`Integer a = 1000`**，**`Integer b = 1000`**，用 **`==`** 比较结果是什么？如果是 **`127`** 呢？这个范围能改吗？”**
2. **“**`double d1 = 0.0`**，**`double d2 = -0.0`**，它们二进制位一样吗？**`==`** 结果又是啥？”**
3. **“重写 **`equals`** 必须重写 **`hashCode`** 吗？如果不重写，HashMap 取数据时第一步会发生什么？”**

他瞬间懵了，支支吾吾答不上来，**原本的暖场题直接变成了“送命题”**。

其实，这道题看似简单，实则是考你对 **JVM 内存模型**、**IEEE 754 标准** 和 **JDK 源码** 的理解深度。只背八股文，连源码都没翻过，面试官一挖你就倒。

今天Fox带你彻底拆解这道**“最熟悉的陌生题”**，最后给你一套无懈可击的面试模板。

# **一、 为什么“==比地址”的说法不严谨？**

很多老教材喜欢教一句口诀：“基本类型比值，引用类型比地址”。 **这句话没错，但它只看到了表象，没看到 JVM 的底层真相。** 如果你只记住了这就去面试，遇到“浮点数”或者“装箱拆箱”的题，照样会挂。

**在 JVM 的眼里，根本没有“值”和“地址”的区别，它只认“二进制”。**

我们知道，Java 的变量都存在 **栈（Stack）** 里：

- **基本类型（int a = 10）：** 栈里直接存的是 **10 的二进制**。
- **引用类型（Object o = new Object()）：** 栈里存的是 **堆中对象的内存地址（如 0x5F3）的二进制**。

![image](/面试题/Java基础/0158-interviewer-whats-diff-and-equals-answer-address-and/img-7ea8a12fdde2.webp)

`==`** 操作符的本质**，就是比较这该死的槽位里的二进制位是否完全一样！

让我们看一眼字节码，写一段简单的代码：

```plain
int a = 100;
int b = 100;
Object obj1 = new Object();
Object obj2 = obj1;
```

通过 **javap -c 反编译**，你会发现 JVM 处理 == 时用了不同的指令：

- 比较 int 时，用的是 **if_icmpeq**（比较整数栈顶值）。
- 比较 Object 时，用的是 **if_acmpeq**（比较引用地址）。

**结论：** == 根本不关心对象里存了什么。 它只关心：你栈里存的那串数字（无论是值还是地址），是不是一模一样。

**这里有个极端的反例（加分项）：**

如果你能答出 **浮点数（float/double）** 的特殊性，面试官绝对会对你刮目相看：

- `NaN`（Not a Number）：虽然它的二进制位和自己一样，但 `Double.NaN == Double.NaN` 结果是 **false**。
- `0.0` 和 `-0.0`：在内存里符号位不同（二进制不一样），但 `0.0 == -0.0` 结果是 **true**。

**结论：** 除了浮点数这种奇葩，`==` 永远是在比“栈帧局部变量表中 Slot 的二进制位同一性”。

# **二、 equals 的原罪：它默认就是“==”**

很多同学以为 `equals` 天生就是用来比内容的。 **大错特错！** 让我们扒开 JDK 的祖宗类 `java.lang.Object` 的源码看看：

```plain
// JDK 源码：Object.java
public boolean equals(Object obj) {
    return (this == obj);
}
```

看到没有？**在 Object 类里，equals 就是 **`==`**！** 如果你定义了一个 `User` 类，却没有重写 `equals` 方法，那你写 `user1.equals(user2)`，和写 `user1 == user2` 没有任何区别，比的还是地址。

# **三、 核心进阶：源码里的两个“大坑”**

面试官最喜欢问的“坑”，通常藏在 `String` 和 `Integer` 的源码里。

## **坑位 1：String 的“双标”与 intern()**

`String` 是个叛徒，它重写了 `equals`，变成了比较字符数组的内容。 我们看 String 的源码（JDK 8）：

```plain
public boolean equals(Object anObject) {
    // 1. 先判断地址，如果是同一个对象，直接返回 true（性能优化）
    if (this == anObject) {
        return true;
    }
    // 2. 如果是 String 类型，再逐个字符比较内容
    if (anObject instanceof String) {
        ... // 循环比较 char[] 数组
    }
    return false;
}
```

但这里有个经典面试题：

```plain
String s1 = "Fox";
String s2 = new String("Fox");

System.out.println(s1 == s2); // false
System.out.println(s1 == s2.intern()); // true
```

**深度解析：**

- `s1` 指向 **字符串常量池（String Pool）**。
- `s2` 指向 **堆内存**（因为用了 `new`）。
- `intern()`**的作用：** 这是一个 native 方法，它会尝试把堆里的字符串“塞回”常量池。如果池子里有了，就返回池里的地址。所以 `s2.intern()` 返回的地址和 `s1` 是一样的！

![image](/面试题/Java基础/0158-interviewer-whats-diff-and-equals-answer-address-and/img-90b1a4e5d6e3.webp)

## **坑位 2：Integer 的 128 陷阱与 JVM 调优**

回到开头面试官的问题：

```plain
Integer a = 127, b = 127;
System.out.println(a == b); // true

Integer c = 128, d = 128;
System.out.println(c == d); // false
```

为什么 127 行，128 就不行？ 这涉及到了 Java 的 **自动装箱（Auto-boxing）机制**。当你写 Integer a = 127 时，编译器自动转成了 Integer.valueOf(127)。

让我们钻进 Integer.java 源码：

```plain
public static Integer valueOf(int i) {
    // IntegerCache.low = -128
    // IntegerCache.high = 127 (默认)
    if (i >= IntegerCache.low && i <= IntegerCache.high)
        // 命中缓存！直接返回缓存数组里的对象引用
        return IntegerCache.cache[i + (-IntegerCache.low)];
    
    // 没命中，老老实实 new 一个新对象
    return new Integer(i);
}
```

**真相大白：** Java 为了性能，默认缓存了 **[-128, 127]** 之间的整数对象（`IntegerCache`）。

- **127** 命中缓存，大家拿到的都是缓存池里同一个对象的引用。
- **128** 超出缓存，每次都 `new` 一个新对象。

![image](/面试题/Java基础/0158-interviewer-whats-diff-and-equals-answer-address-and/img-3c797afe3533.webp)

**大神加分项：**

面试官问：“128 就一定不相等吗？”

你可以淡定地回答：“不一定。这个上限 `127` 是可以通过 JVM 参数 `-XX:AutoBoxCacheMax=` 来修改的。如果我看某个应用全是 200 左右的 ID 操作，我完全可以把缓存调大来优化 GC。” **这一句说出来，面试官就知道你是读过源码且懂调优的。**

# **四、 最后的“必杀技”：HashCode 的契约**

如果面试官问：“**我重写了 equals，但不重写 hashCode 会怎样？**”

**答：会导致 HashMap/HashSet 丢数据。**

**原理拆解：** HashMap 在 `get(key)` 的时候，是有“两道门禁”的：

1. **第一道门禁（Hash）：** 先算 key 的 `hashCode()`。如果哈希值不一样，HashMap 直接判定“找不到”，连 `equals` 都懒得调。
2. **第二道门禁（Equals）：** 只有哈希值一样（Hash冲突）且桶里有数据时，才会调用 `equals` 进行最终确认。

![image](/面试题/Java基础/0158-interviewer-whats-diff-and-equals-answer-address-and/img-a691c5544081.webp)

如果你重写了 `equals` 让两个对象“逻辑相等”，却没重写 `hashCode`： HashMap 第一步算出来的哈希值就不同，直接返回 `null`。 这就是经典的 **内存泄漏** 或 **逻辑诡异** bug。

# **五、 面试标准答案模板（直接背诵）**

下次被问到这个问题，请按这个逻辑输出，秒杀全场：

“`==` 和 `equals` 的区别主要体现在 **底层原理** 和 **设计契约** 上：

1. `==`** 的本质：**

- 它是 CPU 指令级的操作符。对于基本类型，它比较**栈中的值**（注意浮点数 IEEE 754 的 NaN 和 -0.0 特例）；对于引用类型，它比较**堆内存地址**。

1. `equals`** 的本质：**

- 它是 Object 类的方法。默认实现就是 `==`。
- 但像 String、Integer 等类重写了它，将其定义为**逻辑相等**（比较内部 value）。

1. **避坑与调优：**

- 使用 `==` 比较 Integer 时要注意 **-128 到 127 的缓存池**，这个范围甚至可以通过 `-XX:AutoBoxCacheMax` 调整。
- **核心契约：** 重写 equals **必须** 重写 hashCode。这是为了配合 HashMap 等散列集合的高效查询，否则会导致哈希定位失败，引发 Bug。”

## **写在最后**

技术面试考的从来不是死记硬背，而是你对 **底层原理的敬畏**。 能提到 `intern()`、`AutoBoxCacheMax` 和 `NaN` 这些细节，说明你不是在背题，而是在**玩技术**。

**觉得有收获的兄弟，点个“在看”，这就是对我最大的支持！**

关注公众号【**Fox爱分享**】，只讲那些书上不写的实战坑。

> 文章首发地址：[https://mp.weixin.qq.com/s/8OZj3l_RGZDdvRqwAImvKQ](https://mp.weixin.qq.com/s/8OZj3l_RGZDdvRqwAImvKQ)
