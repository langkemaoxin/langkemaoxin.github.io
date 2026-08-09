---
title: "如果服务器非正常断电，如何保证数据安全？"
sidebarGroup: "楼兰老师"
shortTitle: "如果服务器非正常断电，如何保证数据安全？"
order: 1078
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "开场：一场关于“安全感”的幻觉你应该背过很多高可用的面试题把？一堆服务器，一会这个机器挂了，一会那个服务崩了。然后问你怎么保证服务高可用？怎么保证数据不丢失？还没见过这样的面试题的朋友，可以在评论区敲个888，我看看还有多少如此单纯的程序员"
article: false
---

> 来源：[如果服务器非正常断电，如何保证数据安全？](https://www.yuque.com/tulingzhouyu/db22bv/ehwrfy3ctmmnfdt2)

## 开场：一场关于“安全感”的幻觉

你应该背过很多高可用的面试题把？一堆服务器，一会这个机器挂了，一会那个服务崩了。然后问你怎么保证服务高可用？怎么保证数据不丢失？还没见过这样的面试题的朋友，可以在评论区敲个888，我看看还有多少如此单纯的程序员。

![image](/面试题/高频面试问题/楼兰老师/1078-how-to-ensure-data-safety-on-power-failure/img-f7cca4892a41.png)

这时候很多朋友要吐槽了，这就是典型的“面试造火箭，工作拧螺丝”了。但是，如果抛开这些面试题，真的让你负责一个对数据非常敏感的金融系统，面对非正常断电这种不可抗力，你会怎么保证数据安全呢？你可以把视频先暂停两秒，在评论区留下你的想法。不过，请千万别说你的服务器有UPS这样的答案啊。咱们是来讨论技术的，不是来说相声的。看完视频后，再来看看你的想法是不是成熟。

接下来我们要讨论的核心就两字：刷盘。你可能觉得这东西很理论，工作用不上。那么这次，我也不来虚的。我们会从理论到实战，从RocketMQ、Kafka、RabbitMQ这三个重要的MQ工具来分析下，他们是如何设计刷盘策略的。针对数据安全这个事，他们是怎么“小题撒做”的。

还是要强调。这期内容非常硬核，甚至我估计大部分的朋友看一次是看不明白的。所以，点赞、收藏，这样可以回头多看几遍。我是楼兰，咱们技术走起！

---

## 第一章：你的数据到底怎么丢的？

![image](/面试题/高频面试问题/楼兰老师/1078-how-to-ensure-data-safety-on-power-failure/img-42d9b927fbde.png)

首先，我们要搞清楚，为什么服务器断电会丢数据？ 原因很简单：**内存是易失的，硬盘才是永恒的**。废话。这谁都知道。不过这跟数据有什么关系呢？

我们都知道内存读写快，硬盘读写慢。所以，操作系统为了提升运行速度，也耍了个小聪明。在操作系统的底层，也就是我们常说的内核态，他是不允许用户态的应用程序直接接触磁盘这样的硬件的，只允许应用程序调用内核态暴露的接口-也就是系统调用来完成数据读写。

比如，Linux系统就提供了一个write方法，来完成数据写入。

![image](/面试题/高频面试问题/楼兰老师/1078-how-to-ensure-data-safety-on-power-failure/img-d3e815a2db5a.png)

你只要调用一下write方法，通知操作系统，我要写入数据，剩下的事情就交由操作系统的内核态去完成了。但这时，操作系统耍了个小聪明。他其实并没有真正去写硬盘，只是把数据拷贝到了内存里的 **Page Cache页缓存里**，然后立马骗你说：“写完了，成功了！” 这时候，数据其实还停在内存。 如果这时候断电，Page Cache 里的数据瞬间灰飞烟灭。你以为你存下来了，其实你存了个寂寞。

那要怎么保证数据安全呢？这就需要进行“刷盘”。也就是把页缓存中的数据写入到硬盘当中。这样，即便服务器断电了，硬盘里的数据也不会丢失。

但接下来的问题就是什么时候会刷盘呢？大部分情况下，操作系统是在内核态自己去协调什么时候刷盘的。作为应用程序，你是无法知道操作系统什么时候刷盘的。也就是如果出现非正常断电，作为用户态的应用程序，你也就只能烧个高香，默默祈祷数据不要丢了。

要是这样，那还玩的下去吗？于是，操作系统给我们留了个后门，也是唯一的救命稻草-fsync刷盘。

![image](/面试题/高频面试问题/楼兰老师/1078-how-to-ensure-data-safety-on-power-failure/img-4d51b974c6bd.png)

`fsync` 的指令非常霸道，它会勒令操作系统：**“别废话，现在、立刻、马上，把 Page Cache 里的脏数据刷到物理硬盘上，不写完不许返回！”**

只有 `fsync` 执行成功了，数据才算真正落袋为安。 所以，判断一段代码安不安全，就看它到底是在用 `write` 忽悠你，还是在用 `fsync` 给你托底。

---

## 第二章：招式演练 —— Java 代码里的“生死时速”

原理懂了，但这些操作系统底层的小九九，和我天天写Hello World有什么关系？关系大了。接下来，上Java！

![image](/面试题/高频面试问题/楼兰老师/1078-how-to-ensure-data-safety-on-power-failure/img-0af47f9eccf9.png)

下面有两个方法，都可以实现往操作系统上写入一个文件：

方法一、

```plain
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * @author ：楼兰
 **/

public class FileIODemo1 {
    public static void main(String[] args) throws IOException {
        File f = new File("./test1.txt");
        if(!f.exists()){
            f.createNewFile();
        }
        FileOutputStream fis = new FileOutputStream(f);
        for (int i = 0; i < 100; i++) {
            //每一次write就会调用一次write的系统调用
            fis.write("a".getBytes("utf-8"));
            //这个flush是个空方法，什么都没做
            fis.flush();
            //write系统调用只会把内容写入到page cache，不会写到磁盘。需要进行一次fsync系统调用才会写入硬件。
            //对于写到page cache里的文件，程序可以正常读，但是服务器重启后就会丢数据。
            //操作系统会有统一的机制将page cache写入硬盘。但是不及时。
            //他是通过统计page cache中修改过的页(脏页)的比例。达到一个阈值后就会统一将page cache写入到硬件。
        }
        fis.close();
    }
}
```

方法二、

```plain
import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;

/**
 * @author ：楼兰
 **/

public class FileIODemo2 {
    public static void main(String[] args) throws IOException {
        File f = new File("./test2.txt");
        if(!f.exists()){
            f.createNewFile();
        }
        RandomAccessFile raf = new RandomAccessFile(f,"rw");
        final FileChannel fc = raf.getChannel();

        fc.map(FileChannel.MapMode.READ_WRITE,0,5);
        final ByteBuffer byteBuffer = ByteBuffer.allocate(100);
        for (int i = 0; i < 100; i++) {
            byteBuffer.put(i,(byte)'a');
        }
        System.out.println(byteBuffer.toString());
        //这里也是将数据缓存到一起，进行一次write系统调用。
        fc.position(0).write(byteBuffer);
        //这个force方法会真正触发一次fsync系统调用，将数据写入硬盘。
        fc.force(true);
        fc.close();
        raf.close();
    }
}
```

执行后效果都是一样的，往文件里写入一堆字符。但是他们底层执行过程有什么区别呢？在Linux中，提供了一个指令strace，可以查看Java程序的所有系统调用。

```plain
strace -ff -o f1 java FileIODemo1
```

执行Java程序后，会生成一系列f1开头的日志文件。这些日志文件就是这个Java程序每一个线程执行的系统调用的日志。

可以看到，哪怕执行一个最简单的Hello World，Java也需要启动很多个线程。下次，你还会觉得AQS、并发这些东西，跟你写CRUD没关系吗？

查看日志，你会发现，方法一的核心系统调用日志是这样的：

```plain
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
write(4, "a", 1)                        = 1
close(4)                                = 0
mmap(0x7fdf0a6c6000, 12288, PROT_NONE, MAP_PRIVATE|MAP_FIXED|MAP_ANONYMOUS|MAP_NORESERVE, -1, 0) = 0x7fdf0a6c6000
```

老老实实调用了100次write方法。然后就关闭文件了。并没有调用fsync。也就是说，FileOutputStream的flush方法，在系统调用层面，完全是虚晃一枪。啥都没干。

此时这些a都是写入到了PageCache缓存，要等待操作系统进行刷盘。如果操作系统没刷盘，但服务器又非正常断电了，那这些数据就丢了。

下面方法二的系统调用是什么样的呢？能看到两行很重要的系统调用日志

```plain
write(4, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"..., 100) = 100
fsync(4)                                = 0
```

一方面，写入数据时，把100个a缓存到了一起，通过一次write调用写入数据。

另一方面，fc.force(true)方法，立即出发了一次操作系统的fsync。数据就会尽快写入到硬盘当中。

这意味着，哪怕操作系统出现了非正常断电，数据尽快写入到了硬盘，也是不会丢失的。

**看懂了吗？你的每一行Java代码，都不是信手拈来的工具！**

---

## 第三章：高手过招 —— MQ 三巨头的“刷盘哲学”

能够用好write和fsync这两个绝世武器之后，接下来就是如何在项目中规划这些系统调用了。这个事，说起来就太复杂了。用功夫来比喻，那就是已经进入乾坤大挪移的最高境界了。怎么说呢？就是，**看到了你也不一定会。会了也不一定就是绝顶高手。**

![image](/面试题/高频面试问题/楼兰老师/1078-how-to-ensure-data-safety-on-power-failure/img-ac3ff7c2c75a.png)

wirte虽然不安全，但是他只要写Page cache，快啊。fsync虽然更安全，但是他要写磁盘，相比write肯定要慢很多，频繁调用会加大操作系统的负担。

到底要怎么进行取舍呢？这事太难了，我就不再自己瞎设计什么方案了。直接带你来看看RocketMQ、Kafka、RabbitMQ这三个真正的武林高手，他们是怎么在“极限性能”和“数据安全”之间做平衡的。

**1. RocketMQ：太极宗师（读写分离 + 组提交）**

我们知道RocketMQ是可以在配置文件中，简单配置同步刷盘还是异步刷盘的。其中异步刷盘比较好理解，就是不主动进行刷盘，把刷盘这事交给操作系统去处理。我们重点就看这个同步刷盘的机制，简直就是教科书级别的设计。

所谓同步刷盘，字面理解就是来一个消息就调一次fsync，刷盘完成了，再同步告诉客户端，消息发成功了。但是，你要知道RocketMQ可是设计为单机每秒几十万TPS的超高性能系统。这么频繁的刷盘，操作系统能撑得住吗？

于是RocketMQ针对同步刷盘，来了一招精妙至极的“移花接木”。它设计了两个队列：一个叫 **写队列**requestsWriter，一个叫 **读队列 **requestsRead。

- 生产者发过来的刷盘请求，不管是哪个线程的，先全部怼到**写队列**里。
- 后台有一个线程GroupCommitService，负责定时把**写队列**和**读队列**进行互换。默认是每10毫秒进行一次。
- 然后，它对着**读队列**里这一批积攒的请求，执行一次 `fsync`，把一批数据一起进行刷盘。

这招就叫**Group Commit组提交策略**。用一次 `fsync` 的成本，搞定了一批消息的持久化。既保证了数据绝对不丢，又把性能拉到了极限。这种精妙的设计，就是RocketMQ作为MQ中的后来者，爆发出的能量。

**2. RabbitMQ：稳健剑客（缓冲区 + 持久化）**

RabbitMQ 比较传统。对于经典的传统对列classic queue。你只需要把对列声明为持久化对列即可。接下来，只要往这个队列里发消息，RabbitMQ就会把数据进行持久化操作，保证数据安全。

但是，数据真的安全吗？他的持久化对列是怎么处理刷盘问题的呢？这个不用我做详细分析，官网上的一段说明，很直白的解释了他的策略：

![image](/面试题/高频面试问题/楼兰老师/1078-how-to-ensure-data-safety-on-power-failure/img-6e78cc9cec11.png)

很明确的告诉了你，RabbitMQ并不会给每个消息调用fsync。如果你要确保消息安全，那么换成他的publisher confirms机制。这个机制是通过生产者确认或者重试，来保证消息安全。另外，RabbitMQ也设计了Quorum、Stream等其他类型的对列，用另外的思路来保证数据安全。

也就是说，在数据刷盘这个场景下，RabbitMQ是没有做过于精细的设计的。其目的，就是为了提高执行速度。

**3. Kafka：狂战士（放弃防守，全力输出）**

再来看Kafka，他对性能的追求最极致，所以他的刷盘招式也最激进。在Kafka的配置文件中，针对日志刷盘，提供了一系列的参数，可以自由配置。最关键的是这两个：

![image](/面试题/高频面试问题/楼兰老师/1078-how-to-ensure-data-safety-on-power-failure/img-937cd7f2cdf0.png)

很简单的配置了有多少条消息触发一次刷盘，以及每隔多长时间触发一次刷盘。关注下他的默认值。这种参数配置意味着在 Kafka 的默认配置里，它**完全放弃**了主动调用 `fsync`。 它把刷盘的工作全权扔给了操作系统。 这意味着，单机 Kafka 遇到服务器非正常断电，数据也是会丢失的。

当然，这也并不意味着Kafka的数据就这么不甘泉。实际上，Kafka还可以靠他的ACK应答机制，集群Replica多副本机制等其他机制整体保证数据安全。只不过，在日志刷盘这件事上，Kafka优先选择的是极致性能，而数据安全，放在了次要位置。

---

## 结尾：人生的 Fsync

![image](/面试题/高频面试问题/楼兰老师/1078-how-to-ensure-data-safety-on-power-failure/img-21c04240495b.png)

看懂了这几个高手的刷盘招式，你当然没有必要全盘照搬他们的设计。因为不同的系统总是会有不同的设计。就像倚天屠龙记里的乾坤大挪移，你很厉害，但总有比你更厉害的武功。

而且，针对刷盘这个问题，配上UPS，使用带电池的RAID卡，或者直接升级到更安全的云服务器，你几乎就不用考虑服务器非正常断电的情况了。但是，这些前人留下的经验和思考，始终都是助你快速成长的养分。就像打仗当然是要靠火药的，但是强身健体，练武防身也是每个战士的必修课。

最后，我想送大家一句话。

我们在职场上、生活中，经常会有很多灵光一闪的想法，会有很多完美的计划。 但请记住，**“想到了”仅仅是写入了 Page Cache，“做到了”才是执行了 Fsync。**

那些停留在 Page Cache 里的想法，看似美好，但一场突如其来的“断电”——可能是岁月的变迁，可能是环境的动荡——就能让它们瞬间归零。

**认知是虚幻的缓存，执行才是落地的磁盘。** 别让你的才华，死在断电的那一刻。 记得，给你的人生，多做几次 Fsync。

我是楼兰，关注我，IT路上一起进步。接下来，我们评论区见！
