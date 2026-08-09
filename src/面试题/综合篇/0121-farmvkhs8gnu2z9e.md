---
title: "为什么还会有人单纯的认为 UUID 不能当主键"
sidebarGroup: "综合篇"
shortTitle: "为什么还会有人单纯的认为 UUID 不能当主键"
order: 121
date: 2026-07-05
category: "面试题"
tag:
  - "面试题"
description: "很多小伙伴对 UUID 都有一种刻板印象，就是不能用于 MySQL 主键 ID，因为他们 会认为 UUID 只能是随机无序的，这样会导致 MySQL 频繁出现叶节点的分裂，重构，影响 MySQL 整体性能，但实质上这是对 UUID 的片面认"
article: false
---

> 来源：[为什么还会有人单纯的认为 UUID 不能当主键](https://www.yuque.com/tulingzhouyu/db22bv/farmvkhs8gnu2z9e)

很多小伙伴对 UUID 都有一种刻板印象，就是不能用于 MySQL 主键 ID，因为他们 会认为 UUID 只能是随机无序的，这样会导致 MySQL 频繁出现叶节点的分裂，重构，影响 MySQL 整体性能，但实质上这是对 UUID 的片面认识，UUID 不仅仅只能是随机无序，接下来我们通过几分钟全面认识下 UUID。

## 什么是 UUID？

**UUID（Universally Unique Identifier，通用唯一标识符）** 是一个 128 位值，广泛用于分布式系统中的唯一标识。其格式为 32 个十六进制数字，用连字符分隔。

总共分为五段，表现形式为`8-4-4-4-12`的`32`个字符。

`M`表示`UUID`版本，目前是`1-7`版本。

`N`表示`UUID`变体（布局规范），目前是`8`/`9`/`a`/`b`四种情况。

```plain
xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
482fe2d9-5b35-11f0-a229-d7220e1bd181 -- v1
000003e9-5b35-21f0-8100-f7ce94592b00 -- v1mc
008ec445-3ff3-3513-b438-93cba7aa31c8 -- v3
eb80fb46-58be-47e6-b2d4-82765032617d -- v4
39983165-606c-5d83-abfa-b97af8b1ae8d -- v5
1f05b356-9f2d-6619-bb59-459d6964de10 -- v6
0197e50d-6e41-7288-93ba-7e974701d60b -- v7
```

```xml
&lt;dependency&gt;
  &lt;groupId&gt;com.github.f4b6a3&lt;/groupId&gt;
  &lt;artifactId&gt;uuid-creator&lt;/artifactId&gt;
  &lt;version&gt;6.1.1&lt;/version&gt;
&lt;/dependency&gt;
```

## UUID V1 (Version 1 - 基于时间)

```java
import com.github.f4b6a3.uuid.UuidCreator;
import java.util.UUID;

public class UuidVersion1Example {
    public static void main(String[] args) {
        UUID uuid_v1 = UuidCreator.getTimeBased();
        System.out.println("UUID Version 1: " + uuid_v1);
    }
}
```

**版本 1**
(基于时间)
`[时间戳低位] - [时间戳中位] - 1[时间戳高位] - [变体+时钟序列] - [节点MAC地址]`
**• 时间戳**: 60位，从1582年开始的100纳秒间隔数，分散在三部分。
**• 时钟序列**: 14位，防止时钟回拨或并发冲突。
**• 节点**: 48位，通常是计算机的MAC地址。

### 原理

基于时间戳及`MAC`地址。

### 缺点

- 机器的`MAC`地址出厂后不能保证完全唯一，且之后`MAC`地址也可手动修改
- `MAC`地址的暴露会造成了隐私与安全问题
- 若一台机器上的两个进程同时跑，有可能出现重复问题

## UUID V2 (Version 2 - DCE 安全)

### 示例

```java
import com.github.f4b6a3.uuid.UuidCreator;
import com.github.f4b6a3.uuid.enums.UuidLocalDomain;
import java.util.UUID;

public class UuidVersion2Example {
    public static void main(String[] args) {
        // 需要一个本地ID，这里用 1001 作为例子
        int localId = 1001;
        UUID uuid_v2 = UuidCreator.getDceSecurity(UuidLocalDomain.LOCAL_DOMAIN_PERSON, localId);
        System.out.println("UUID Version 2: " + uuid_v2);
    }
}
```

**版本 2**
 (DCE 安全)
`[本地ID] - [时间戳中位] - 2[时间戳高位] - [(变体+时钟序列高位) + (本地域)] - [节点MAC地址]`
**• 目的**: V1的**罕见**修改版，用于嵌入系统安全信息。
**• 本地ID**: 替换了V1的`时间戳低位`，通常是用户ID(UID)。
**• 本地域**: 替换了V1的`时钟序列低位`，用于声明本地ID的类型。

### 原理

版本 2 很少被使用，  基于时间戳，将`V1`的`时间戳低位`替换为“本地ID”（如用户ID），将`时钟序列低位`替换为“本地域”，其他部分（包括MAC地址）与V1基本一致。

## UUID V3 (Version 3 - 基于名称的 MD5)

### 示例

```java
import com.github.f4b6a3.uuid.UuidCreator;
import com.github.f4b6a3.uuid.enums.UuidNamespace;

import java.util.UUID;
import java.nio.charset.StandardCharsets;

public class UuidVersion3Example {
    public static void main(String[] args) {
        String name = "https://github.com/";
        byte[] nameBytes = name.getBytes(StandardCharsets.UTF_8);
        UUID uuid_v3 = UUID.nameUUIDFromBytes(nameBytes); // nameUUIDFromBytes 内部实现了版本3的逻辑

        // 注意：nameUUIDFromBytes 并没有让你直接指定命名空间。
        // 它内部的实现逻辑是固定的，所以要生成真正基于命名空间的UUID，还是推荐用第三方库。

        // 使用 uuid-creator 库可以更精确地控制
        UUID uuid_v3_precise = UuidCreator.getNameBasedMd5(UuidNamespace.NAMESPACE_URL, name);

        System.out.println("UUID Version 3 (Standard Lib): " + uuid_v3);
        System.out.println("UUID Version 3 (uuid-creator): " + uuid_v3_precise);
    }
}
```

**版本 3 和 5**
 (基于名称的哈希)
`[哈希派生数据] - [哈希派生数据] - 3/5[ 哈希派生数据] - [变体+哈希派生数据] - [哈希派生数据]`
**• 生成**: 基于“命名空间UUID+名称”通过MD5(V3)或SHA-1(V5)哈希生成。
**• 特点**: 输入相同，输出永远相同。其内部是**伪随机**的，没有独立的时间或节点字段。

### 原理

版本 3  不依赖与机器信息和时间信息。

但`V3`要求输入命名空间及名称，命名空间本身也是一个`UUID`，用来标识应用环境，名称通常是用户账号、用户名之类的内容，通过命名空间、名称、`MD5`算出`UUID`。

## UUID V4 (Version 4 - 随机)

### 示例

```java
import com.github.f4b6a3.uuid.UuidCreator;
import java.util.UUID;

public class UuidVersion4Example {
    public static void main(String[] args) {
        UUID uuid_v4 = UUID.randomUUID();
        UUID uuid_v4_precise = UuidCreator.getRandomBased();
        System.out.println("UUID Version 4 (Standard Lib): " + uuid_v4);
        System.out.println("UUID Version 4 (uuid-creator): " + uuid_v4_precise);
    }
}
```

**版本 4**
 (随机)
`[随机数] - [随机数] - 4 随机数] - [变体+随机数] - [随机数]`
**• 结构**: 除了固定的6个版本/变体位，其余**122位**全部由高质量随机数填充。
**• 特点**: 最常用、最简单，无任何可预测信息。

### 原理

这是最常用的 UUID 版本，完全随机。可以直接使用 Java 标准库生成。

## UUID V5 (Version 5 - 基于名称的 SHA-1)

### 示例

```java
import com.github.f4b6a3.uuid.UuidCreator;
import java.util.UUID;

public class UuidVersion5Example {
    public static void main(String[] args) {
        UUID uuid_v5 = UuidCreator.getNameBasedSha1(UuidNamespace.NAMESPACE_URL, "https://github.com/");
        System.out.println("UUID Version 5: " + uuid_v5);
    }
}
```

**版本 3 和 5**
 (基于名称的哈希)
`[哈希派生数据] - [哈希派生数据] - 3/5[ 哈希派生数据] - [变体+哈希派生数据] - [哈希派生数据]`
**• 生成**: 基于“命名空间UUID+名称”通过MD5(V3)或SHA-1(V5)哈希生成。
**• 特点**: 输入相同，输出永远相同。其内部是**伪随机**的，没有独立的时间或节点字段。

### 原理

版本 5  跟`V3`差不多，只是把散列算法的`MD5`变成`SHA1`。

## UUID V6 (Version 6 - 重新排序的时间)

### 示例

```java
import com.github.f4b6a3.uuid.UuidCreator;
import java.util.UUID;

public class UuidVersion6Example {
    public static void main(String[] args) {
        UUID uuid_v6 = UuidCreator.getTimeOrdered();
        System.out.println("UUID Version 6: " + uuid_v6);
    }
}
```

**版本 6**
 (重新排序的时间)
`[时间戳高位] - [时间戳中位] - 6[时间戳低位] - [变体+时钟序列] - [节点MAC地址]`
**• 目的**: V1的改良版，对数据库索引友好，可按时间排序。
**• 结构**: 与V1组件完全相同，仅**重新排列**时间戳字节顺序，将最重要的部分前置。

### 原理

版本 6  对`V1`版本的字段顺序进行了调整 ，将时间戳位重新排序，使其在数据库索引中更加友好。

## UUID V7 (Version 7 - Unix 时间戳)

### 示例

```java
import com.github.f4b6a3.uuid.UuidCreator;
import java.util.UUID;

public class UuidVersion7Example {
    public static void main(String[] args) {
        UUID uuid_v7 = UuidCreator.getTimeOrderedEpoch();
        System.out.println("UUID Version 7: " + uuid_v7);
    }
}
```

**版本 7**
(Unix时间戳)
`[Unix毫秒时间戳 (前48位)] - 7[ 随机数 A] - [变体+随机数 B] - [随机数 C]`
**• 目的**: 兼具时间排序性和高并发唯一性，是现代数据库主键的**首选**。
**• 时间戳**: 48位，从1970年开始的毫秒数。
**• 随机数**: 74位，保证同一毫秒内生成的ID唯一。

### 原理

版本 7  基于`Unix`时间戳和随机数， 保证了时间上的单调递增，非常适合作为数据库主键。

## UUID 版本结构汇总表

版本 (Version)
结构布局 (Structural Layout)
属性说明 (Attribute Explanation)

**版本 1**
(基于时间)
`[时间戳低位] - [时间戳中位] - 1[时间戳高位] - [变体+时钟序列] - [节点MAC地址]`
**• 时间戳**: 60位，从1582年开始的100纳秒间隔数，分散在三部分。
**• 时钟序列**: 14位，防止时钟回拨或并发冲突。
**• 节点**: 48位，通常是计算机的MAC地址。

**版本 2**
 (DCE 安全)
`[本地ID] - [时间戳中位] - 2[时间戳高位] - [(变体+时钟序列高位) + (本地域)] - [节点MAC地址]`
**• 目的**: V1的**罕见**修改版，用于嵌入系统安全信息。
**• 本地ID**: 替换了V1的`时间戳低位`，通常是用户ID(UID)。
**• 本地域**: 替换了V1的`时钟序列低位`，用于声明本地ID的类型。

**版本 3 和 5**
 (基于名称的哈希)
`[哈希派生数据] - [哈希派生数据] - 3/5[ 哈希派生数据] - [变体+哈希派生数据] - [哈希派生数据]`
**• 生成**: 基于“命名空间UUID+名称”通过MD5(V3)或SHA-1(V5)哈希生成。
**• 特点**: 输入相同，输出永远相同。其内部是**伪随机**的，没有独立的时间或节点字段。

**版本 4**
 (随机)
`[随机数] - [随机数] - 4 随机数] - [变体+随机数] - [随机数]`
**• 结构**: 除了固定的6个版本/变体位，其余**122位**全部由高质量随机数填充。
**• 特点**: 最常用、最简单，无任何可预测信息。

**版本 6**
 (重新排序的时间)
`[时间戳高位] - [时间戳中位] - 6[时间戳低位] - [变体+时钟序列] - [节点MAC地址]`
**• 目的**: V1的改良版，对数据库索引友好，可按时间排序。
**• 结构**: 与V1组件完全相同，仅**重新排列**时间戳字节顺序，将最重要的部分前置。

**版本 7**
(Unix时间戳)
`[Unix毫秒时间戳 (前48位)] - 7[ 随机数 A] - [变体+随机数 B] - [随机数 C]`
**• 目的**: 兼具时间排序性和高并发唯一性，是现代数据库主键的**首选**。
**• 时间戳**: 48位，从1970年开始的毫秒数。
**• 随机数**: 74位，保证同一毫秒内生成的ID唯一。

## 总结

版本
主要特点
Java 实现方式

**1**
基于时间戳和 MAC 地址
需要第三方库 (`uuid-creator`)

**2**
DCE 安全
需要第三方库 (`uuid-creator`)

**3**
基于名称 (MD5)
标准库 `UUID.nameUUIDFromBytes` 或 `uuid-creator`

**4**
**随机** (最常用)
**标准库 **`UUID.randomUUID()`

**5**
基于名称 (SHA-1)
需要第三方库 (`uuid-creator`)

**6**
时间排序（对数据库友好）
需要第三方库 (`uuid-creator`)

**7**
Unix 时间戳（对数据库友好）
需要第三方库 (`uuid-creator`)

对于大多数日常应用，Java 自带的 `UUID.randomUUID()`（版本 4）就足够了。但如果你对数据库性能有极致要求，或者需要生成可预测的 UUID，那么引入 `uuid-creator` 库并使用版本 6、7 或 5 是非常好的选择。
