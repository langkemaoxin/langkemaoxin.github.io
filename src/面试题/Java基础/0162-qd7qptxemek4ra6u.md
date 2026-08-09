---
title: "Java五种文件拷贝方式"
sidebarGroup: "Java基础"
shortTitle: "Java五种文件拷贝方式"
order: 162
date: 2026-06-04
category: "面试题"
tag:
  - "面试题"
description: "在 Java 中，文件拷贝主要有以下几种方式，不同场景下效率差异显著。以下从实现方式、效率对比和适用场景三方面详细解析：一、文件拷贝的 5 种实现方式1. 传统字节流拷贝（FileInputStream + FileOutputStream"
article: false
---

> 来源：[Java五种文件拷贝方式](https://www.yuque.com/tulingzhouyu/db22bv/qd7qptxemek4ra6u)

在 Java 中，文件拷贝主要有以下几种方式，不同场景下效率差异显著。以下从**实现方式**、**效率对比**和**适用场景**三方面详细解析：

---

# 一、文件拷贝的 5 种实现方式

### 1. 传统字节流拷贝（`FileInputStream` + `FileOutputStream`）

```java
public static void main(String[] args) throws IOException {
    try (InputStream is = new FileInputStream("source.txt");
         OutputStream os = new FileOutputStream("target.txt")) {
        byte[] buffer = new byte[1024];
        int length;
        while ((length = is.read(buffer)) > 0) {
            os.write(buffer, 0, length);
        }
    }
}
```

- **特点**：基础方法，直接逐字节或缓冲区读写。
- **效率**：最低（适合小文件）。

---

### 2. 缓冲流优化拷贝（`BufferedInputStream` + `BufferedOutputStream`）

```java
public static void main(String[] args) throws IOException {
    try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream("source.txt"));
         BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream("target.txt"))) {
        byte[] buffer = new byte[8192]; // 缓冲区越大，性能越好（通常 8KB~64KB）
        int len;
        while ((len = bis.read(buffer)) != -1) {
            bos.write(buffer, 0, len);
        }
    }
}
```

- **特点**：通过缓冲区减少 I/O 次数。
- **效率**：比传统字节流提升 2~5 倍。

---

### 3. NIO `Files.copy` 方法（Java 7+）

```java
public static void main(String[] args) throws IOException {
    Path source = Paths.get("source.txt");
    Path target = Paths.get("target.txt");
    Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
}
```

- **特点**：单行代码完成拷贝，底层自动优化。
- **效率**：接近最高效（适合大多数场景）。

---

### 4. NIO `FileChannel` 通道拷贝

```java
public static void main(String[] args) throws IOException {
    try (FileChannel sourceChannel = new FileInputStream("source.txt").getChannel();
         FileChannel targetChannel = new FileOutputStream("target.txt").getChannel()) {
        sourceChannel.transferTo(0, sourceChannel.size(), targetChannel);
    }
}
```

- **特点**：利用通道（Channel）直接传输数据。
- **效率**：大文件性能最佳（利用零拷贝技术）。

---

### 5. 内存映射文件拷贝（`MappedByteBuffer`）

```java
public static void main(String[] args) throws IOException {
    try (RandomAccessFile sourceFile = new RandomAccessFile("source.txt", "r");
         RandomAccessFile targetFile = new RandomAccessFile("target.txt", "rw")) {
        FileChannel sourceChannel = sourceFile.getChannel();
        MappedByteBuffer buffer = sourceChannel.map(FileChannel.MapMode.READ_ONLY, 0, sourceChannel.size());
        targetFile.getChannel().write(buffer);
    }
}
```

- **特点**：将文件映射到内存直接操作。
- **效率**：适合超大文件（但实现复杂，需谨慎处理内存）。

---

# 二、效率对比（1GB 文件测试）

**方法**
**耗时（毫秒）**
**适用场景**

传统字节流
4500~5000
小文件（<10MB）

缓冲流
1200~1500
通用场景

`Files.copy`
800~1000
简单代码 + 快速开发

`FileChannel.transfer`
600~800
大文件（>100MB）

内存映射文件
500~700
超大文件（>1GB）

---

# 三、如何选择最高效方式？

1. **小文件（ 直接使用 `Files.copy`，代码简洁且性能足够。
2. **大文件（100MB~1GB）** 优先选择 `FileChannel.transferTo()`，利用零拷贝减少内核态与用户态数据复制。
3. **超大文件（>1GB）** 用内存映射文件（`MappedByteBuffer`），但需注意：

- 避免频繁映射/释放内存（开销大）。
- 处理内存溢出风险（`OutOfMemoryError`）。

1. **通用场景** `Files.copy` 或缓冲流，平衡代码可读性与性能。

---

# 四、终极建议

- **优先使用 **`Files.copy`：Java 7+ 自带优化，简单高效。
- **大文件必用 **`FileChannel`：性能碾压传统流。
- **避免手动逐字节读写**：除非处理特殊格式（如加密流）。
