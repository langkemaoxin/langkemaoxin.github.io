---
title: "1G内存，如何快速判某个无符号整数是否在40亿数据中"
sidebarGroup: "综合篇"
shortTitle: "1G内存，如何快速判某个无符号整数是否在40亿数据中"
order: 125
date: 2026-03-09
category: "面试题"
tag:
  - "面试题"
description: "方案一：流式读取实时比对核心思想分块读取文件，实时遍历比对目标值。实现步骤分块读取：使用 BufferedInputStream 设置512MB缓冲区。实时比对：遍历当前内存块中的所有整数。示例代码import java.io.*;  pu"
article: false
---

> 来源：[1G内存，如何快速判某个无符号整数是否在40亿数据中](https://www.yuque.com/tulingzhouyu/db22bv/vecuyu37dugscmio)

## **方案一：流式读取实时比对**

### **核心思想**

分块读取文件，实时遍历比对目标值。

### **实现步骤**

1. **分块读取**：使用 `BufferedInputStream` 设置512MB缓冲区。
2. **实时比对**：遍历当前内存块中的所有整数。

### **示例代码**

```java
import java.io.*;

public class StreamChecker {
    public static boolean isExist(String filePath, int target) throws IOException {
        try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(filePath))) {
            byte[] buffer = new byte[512 * 1024 * 1024]; // 512MB缓冲区
            int bytesRead;
            while ((bytesRead = bis.read(buffer)) != -1) {
                // 每4字节转换为一个整数（小端序）
                for (int i = 0; i < bytesRead; i += 4) {
                    int num = (buffer[i] & 0xFF) 
                    | ((buffer[i+1] & 0xFF) << 8) 
                    | ((buffer[i+2] & 0xFF) << 16) 
                    | ((buffer[i+3] & 0xFF) << 24);
                    if (num == target) return true;
                }
            }
        }
        return false;
    }

    public static void main(String[] args) throws IOException {
        System.out.println(isExist("data.bin", 123456));
    }
}
```

### **计算过程**

- **数据总量**：40亿个整数 × 4字节 = 16GB。
- **读取时间**：

- 机械硬盘（100MB/s）：16GB / 100MB/s ≈ 163秒 ≈ 2.7分钟。
- SSD（500MB/s）：16GB / 500MB/s ≈ 32秒。

### **优缺点**

**优点**
**缺点**

1. 无需预处理，零额外内存占用
1. 单次查询时间极长（2分钟以上）

2. 实现简单
2. 多次查询需重复全量读取文件

---

## **方案二：位图**

### **核心思想**

每个整数直接映射到512MB位图中的二进制位。

### **内存计算**

- **位图大小**：232位=8232字节=536,870,912字节≈512MB
- **覆盖范围**：所有32位整数（0 ≤ x < 4,294,967,296）。

### **示例代码**

```java
import java.io.*;

public class BitmapChecker {
    private static final int BITMAP_SIZE = 1 << 29; // 2^32 bits = 512MB
    private final byte[] bitmap = new byte[BITMAP_SIZE];

    public void build(String filePath) throws IOException {
        try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(filePath))) {
            byte[] buffer = new byte[4]; // 每个整数4字节
            while (bis.read(buffer) != -1) {
                int num = (buffer[0] & 0xFF) 
                | ((buffer[1] & 0xFF) << 8) 
                | ((buffer[2] & 0xFF) << 16) 
                | ((buffer[3] & 0xFF) << 24);
                int index = num / 8;
                int offset = num % 8;
                bitmap[index] |= (1 << offset);
            }
        }
    }

    public boolean query(int num) {
        int index = num / 8;
        int offset = num % 8;
        return (bitmap[index] & (1 << offset)) != 0;
    }

    public static void main(String[] args) throws IOException {
        BitmapChecker checker = new BitmapChecker();
        checker.build("data.bin");
        System.out.println(checker.query(123456));
    }
}
```

### **优缺点**

**优点**
**缺点**

1. 查询时间 *O*(1)，零误判
1. 仅支持32位整数（最大42.9亿）

2. 内存固定（512MB）
2. **无法处理超范围数据**

---

### 扩展点：位图为何无法处理超出范围的数据？

#### 1. 位图的内存分配与整数范围

##### (1) 位图设计原理

- **位图大小**：位图需要覆盖所有可能的整数取值。

- 对于 **32位无符号整数**，取值范围为 0≤*x*<232（即0到4,294,967,295）。
- 所需内存计算：
- 
![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-764e18138c32.png)

- **映射规则**： 每个整数 *x* 直接映射到位图中的第 *x* 个二进制位，存在则置1，否则为0。

##### (2) 超范围数据的处理问题

如果输入的整数超过32位（例如64位整数），位图方案将面临以下问题：

**问题**
**原因**

**内存爆炸性增长**
64位整数范围是 0≤*x*<264，位图需 264位≈2EB（远超1G内存限制）。

**索引计算错误**
在位图代码中，索引计算基于32位逻辑，高位数据会被截断或溢出，导致错误映射。

---

#### 2. Java代码示例分析

##### (1) 代码逻辑

```java
public class BitmapChecker {
    private static final int BITMAP_SIZE = 1 << 29; // 2^32 bits = 512MB
    private final byte[] bitmap = new byte[BITMAP_SIZE];

    public void build(String filePath) throws IOException {
        // 读取数据并填充位图
        int num = ...; // 从文件解析的整数
        int index = num / 8;
        int offset = num % 8;
        bitmap[index] |= (1 << offset);
    }

    public boolean query(int num) {
        int index = num / 8;
        int offset = num % 8;
        return (bitmap[index] & (1 << offset)) != 0;
    }
}
```

##### (2) 超范围数据的崩溃场景

假设输入整数为64位的 `x = 5,000,000,000`（超过32位最大值4,294,967,295）：

###### 索引计算溢出：
Java中 `int` 类型为32位有符号整数，当 `num` 超过 231−1 时，计算结果可能为负值或错误值。

```java
int num = 5_000_000_000; // 实际超出int范围，编译报错
int index = num / 8;      // 溢出导致index为负数或错误值
```

###### 数组越界：
若强行用 `long` 存储 `num`，但 `index` 仍为 `int` 类型：

```java
long num = 5_000_000_000L;
int index = (int) (num / 8); // 强制转换导致数据截断（index=705,032,704）
```

- 此时 `index = 5,000,000,000 / 8 = 625,000,000`，但 `int` 最大正值为 231−1=2,147,483,647，未溢出。
- **致命问题**：位图仅覆盖32位整数（0到4.29亿），而 `num=50亿` 超出范围，但代码仍会错误地将其映射到位图的有效区间内，导致：

- **误判**：若位图中 `index=625,000,000` 的位置恰好为1，则系统错误认为50亿存在。
- **数据污染**：写入超范围数据会破坏位图的原始状态。

---

#### 3. 超范围数据的解决方案

##### (1) 分片位图（Sharded Bitmap）

- **核心思想**：将超范围整数哈希映射到多个32位分片。

- 例如，使用哈希函数将64位整数映射到32位空间，再分1024个位图（每个分片512KB）。
- **总内存**：1024×512KB=512MB。

- **代码修改**：

```java
public class ShardedBitmapChecker {
    private static final int SHARD_COUNT = 1024;
    private final byte[][] bitmaps = new byte[SHARD_COUNT][1 << 17]; // 每个分片512KB

    private int getShardId(long num) {
        return (int) (num % SHARD_COUNT);
    }

    private int getIndexInShard(long num) {
        return (int) (num / SHARD_COUNT / 8); // 位图索引
    }

    public void add(long num) {
        int shard = getShardId(num);
        int index = getIndexInShard(num);
        int offset = (int) (num % 8);
        bitmaps[shard][index] |= (1 << offset);
    }

    public boolean contains(long num) {
        int shard = getShardId(num);
        int index = getIndexInShard(num);
        int offset = (int) (num % 8);
        return (bitmaps[shard][index] & (1 << offset)) != 0;
    }
}
```

- **局限性**：

- **哈希冲突**：不同超范围整数可能映射到同一分片位置，导致误判（需额外去重机制）。

##### (2) 压缩位图（Roaring Bitmap）

- **核心思想**：对稀疏数据动态压缩存储，仅记录存在的整数。
- **内存优化**：稀疏数据下内存占用远小于传统位图。
- **Java库**：使用 `org.roaringbitmap.RoaringBitmap`。

```java
import org.roaringbitmap.RoaringBitmap;

public class RoaringBitmapChecker {
    private final RoaringBitmap bitmap = new RoaringBitmap();

    public void add(int num) {
        bitmap.add(num);
    }

    public boolean contains(int num) {
        return bitmap.contains(num);
    }
}
```

- **局限性**：

- 仍无法直接处理超范围整数（需结合分片或其他映射）。

---

#### 4. 总结

**方案**
**原始位图（32位）**
**分片位图（64位→32位）**
**压缩位图（Roaring）**

**支持整数范围**
0 ≤ x < 4.29亿
全范围（需哈希映射）
0 ≤ x < 2^32

**内存占用**
512MB（固定）
512MB（固定分片）
动态（稀疏数据更小）

**误判率**
0%（精确匹配）
>0%（哈希冲突）
0%（精确匹配）

**实现复杂度**
简单
中等
简单（依赖第三方库）

- **位图的硬性限制**： 位图的覆盖范围由初始化时分配的内存大小决定。若输入数据超出预设的整数范围（如32位→4.29亿），则：

1. **写入时**：超范围整数会被错误映射到有效区间，污染数据。
2. **查询时**：超范围整数可能误判为存在，或漏判实际存在的值。

- **解决方案**：

- **分片位图**：通过哈希映射支持超范围数据，但需容忍哈希冲突。
- **压缩位图**：优化稀疏数据的内存占用，但仍受限于预设的整数范围。

---

## **方案三：布隆过滤器（有严重问题）**

### **核心思想**

通过多个哈希函数降低冲突概率，允许可控的误判率。

### **误判率计算**

- **总内存**：*m=*1GB = 8×109 bits
- **元素数量**：*n*=4×10^9
- **哈希函数数量**（理论最优）：

![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-c71fa11041bf.png)

- **误判率**：

![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-907aefbf5915.png)

### **示例代码**

```java
import java.io.*;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class BloomFilterChecker {
    private static final int FILTER_SIZE = 1 << 30; // 1GB = 8,589,934,592 bits
    private final byte[] filter = new byte[FILTER_SIZE];
    private final MessageDigest md5 = MessageDigest.getInstance("MD5");

    public BloomFilterChecker() throws NoSuchAlgorithmException {}

    private int[] getHashes(int num) {
        byte[] hash = md5.digest(String.valueOf(num).getBytes());
        return new int[] {
            (hash[0] & 0xFF) | ((hash[1] & 0xFF) << 8),
            (hash[2] & 0xFF) | ((hash[3] & 0xFF) << 8)
        };
    }

    public void build(String filePath) throws IOException {
        try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(filePath))) {
            byte[] buffer = new byte[4];
            while (bis.read(buffer) != -1) {
                int num = (buffer[0] & 0xFF) 
                | ((buffer[1] & 0xFF) << 8) 
                | ((buffer[2] & 0xFF) << 16) 
                | ((buffer[3] & 0xFF) << 24);
                int[] hashes = getHashes(num);
                for (int h : hashes) {
                    int index = h % FILTER_SIZE;
                    filter[index] = 1;
                }
            }
        }
    }

    public boolean query(int num) {
        int[] hashes = getHashes(num);
        for (int h : hashes) {
            int index = h % FILTER_SIZE;
            if (filter[index] == 0) return false;
        }
        return true; // 可能误判
    }

    public static void main(String[] args) throws Exception {
        BloomFilterChecker checker = new BloomFilterChecker();
        checker.build("data.bin");
        System.out.println(checker.query(123456));
    }
}
```

### **优缺点**

**优点**
**缺点**

支持任意数据类型
**高误判率（1G内存下≈39%）**

内存效率高
无法删除元素

---

### 补充 1：误判率计算与调整影响

布隆过滤器的行为由以下三个参数决定：

1. **位数组大小（m）**：总内存位数（单位：bit）。
2. **元素数量（n）**：需存储的元素总数。
3. **哈希函数数量（k）**：映射元素的独立哈希函数数量。

#### (1) 误判率公式

误判率 *p* 由以下公式决定：

![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-68baf77d109e.png)

#### (2) 最优哈希函数数量

当 *k*=*n**m*ln2 时，误判率最低：

![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-61d2e8ee7d97.png)

#### (3) 内存需求公式

给定目标误判率 *p*，所需内存位数 *m* 为：

![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-f8abd2c0b034.png)

---

#### 1G内存下的参数计算（40亿元素）

##### (1) 已知条件

- **总内存**：*m*=1GB=8×109bits
- **元素数量**：*n*=4×109
- **每个元素分配位数**：
- 
![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-2e439ca34a7c.png)

##### (2) 计算最优哈希函数数量

![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-175dfc528142.png)

##### (3) 计算实际误判率

![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-0c6586f8e400.png)

---

#### 3. 参数调整对误判率的影响

##### 场景一：降低误判率到1%

- **目标误判率**：*p*=0.01
- **所需内存计算**：
- 
![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-d5046664125d.png)
- **最优哈希函数数量**：
- 
![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-4e05f962a745.png)
- **实际误判率**：
- 
![image](/面试题/综合篇/0125-1g-memory-how-to-quickly-determine-whether-an-unsigned/img-89619326e689.png)

##### 场景二：固定内存下的参数权衡

**每个元素分配位数（m/n）**
**哈希函数数量（k）**
**实际误判率（p）**

2 bits
1
~39%

4 bits
3
~14%

8 bits
5
~2%

10 bits
7
~0.8%

---

#### 4. Java代码中的参数问题

##### (1) 代码示例回顾

```java
public class BloomFilterChecker {
    private static final int FILTER_SIZE = 1 << 30; // 1GB = 8,589,934,592 bits
    private final byte[] filter = new byte[FILTER_SIZE];

    // 使用两个哈希函数（MD5生成16字节哈希，取前4字节拆分为两个哈希值）
    private int[] getHashes(int num) {
        byte[] hash = md5.digest(String.valueOf(num).getBytes());
        return new int[] {
            (hash[0] & 0xFF) | ((hash[1] & 0xFF) << 8),
            (hash[2] & 0xFF) | ((hash[3] & 0xFF) << 8)
        };
    }
}
```

##### (2) 参数分析

- **哈希函数数量**：代码中固定使用2个哈希函数，但理论最优值为1（1G内存下）。
- **位数组利用率**：

- 代码声明 `FILTER_SIZE = 1 （即1GB内存），但 `byte[]` 实际占用 1GB×8=8×109bits，与理论计算一致。

- **哈希值范围**：

- MD5生成128位哈希，但代码仅使用前4字节（32位），可能导致哈希冲突率高于预期。

---

#### 5. 参数设计建议

##### (1) 哈希函数选择

- **均匀分布**：选择如MurmurHash3、SHA-256等高质量哈希函数。
- **动态生成多个哈希**：通过单个哈希函数生成多个独立哈希值（如“双重哈希”法）。

##### (2) 误判率与内存的权衡

- **高精度场景**：需保证 *m*/*n*≥10，否则误判率无法接受。
- **内存敏感场景**：允许较高误判率以节省内存。

##### (3) 公式工具

- **在线计算器**：使用[Bloom Filter Calculator](https://hur.st/bloomfilter/)快速验证参数组合。

---

#### 6. 总结

**参数**
**影响**
**设计原则**

**位数组大小**
内存↑ → 误判率↓，但硬件成本↑
根据误判率公式计算最小需求

**哈希函数数**
数量↑ → 冲突率↑ → 误判率↑，但映射覆盖率↑
按 *k*=*n**m*ln2 选择，避免过多或过少

**元素数量**
数量↑ → 误判率↑（固定内存下）
预估最大规模，预留20%冗余

在1G内存下，布隆过滤器仅能为40亿元素提供约39%的误判率，**位图是更优方案**。若必须使用布隆过滤器，需明确告知用户其准确性限制。

---

### 补充 2：**为何说布隆过滤器更适用于非数字元素？**

#### **（1）数字元素的更优方案**

- **小范围整数**：使用位图（Bitmap），零误判且内存可控（如32位整数仅需512MB）。
- **大范围稀疏整数**：使用压缩位图（如Roaring Bitmap）或分片位图，仍可保证零误判。

#### **（2）非数字元素的唯一选择**

- **字符串、二进制数据等**：无法直接映射到整数范围，位图无法使用，布隆过滤器成为唯一可行的空间高效方案。

#### **（3）**布隆过滤器 vs 位图（Bitmap）

**特性**
**布隆过滤器**
**位图（Bitmap）**

**支持数据类型**
任意可哈希类型（通用性）
整数（需有限范围）

**误判率**
>0%（可调）
0%

**内存效率**
高（依赖误判率）
极高（1 bit/元素）

**适用场景**
非数字、大范围稀疏数据
小范围密集整数

---

## **方案对比与选型**

### **性能对比表**

**指标**
**流式读取**
**位图**
**布隆过滤器**

**预处理时间**
无
5-10分钟（SSD）
5-10分钟（SSD）

**查询时间**
*O*(*N*)
*O*(1)
*O*(*k*)

**内存占用**
512MB（缓冲区）
512MB（固定）
1GB（可调）

**误判率**
0%
0%
39%（1G内存）

**适用场景**
单次查询
高频精确查询
低频容忍误判

### **选型建议**

1. **精确查询（32位整数）**：必选位图（零误判，内存可控）。
2. **允许误判的非数字数据**：布隆过滤器（需接受内存与误判率的权衡）。
3. **超范围整数（如64位）**：分片位图或布隆过滤器。
4. **纯单次查询**：流式读取（无需预处理，但延迟不可接受）。

---

## **总结**

- **位图是32位整数的最优解**：零误判、内存低、查询快。
- **布隆过滤器适合非数字数据**：在1G内存下误判率约39%，需权衡准确性。
- **流式读取仅限极低频场景**：无预处理但查询延迟极高。
