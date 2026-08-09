---
title: "MySQL 时区问题"
sidebarGroup: "综合篇"
shortTitle: "MySQL 时区问题"
order: 139
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "MySQL 时区问题"
article: false
---

> 来源：[MySQL 时区问题](https://www.yuque.com/tulingzhouyu/db22bv/hnlxgbitizg8lksb)

其实针对这个问题，有实际开发工作的小伙伴应该都可以做到一点通，一点就通。

比如下边的代码，根本原因就是毫秒数在作怪，当然我们在进行分析的需要做到知其所以然。

```java
LocalDateTime currentTime = LocalDateTime.now();
LocalDateTime futureTime = currentTime.plus(2, ChronoUnit.DAYS);

// 问题1 (核心)：这里虽然设置了时分秒，但毫秒/纳秒部分依然存在！
LocalDateTime resultTime = futureTime.withHour(23).withMinute(59).withSecond(59);

for (int i = 0; i < 100; i++) {
    BlackAccount entity = new BlackAccount();
    // 实体字段类型为 Date，数据库是 timestamp
    entity.setDeblockTime(Date.from(resultTime.atZone(ZoneId.systemDefault()).toInstant()));
}
```

当遇到标题这种情况，需要从两个方面进行排查：

- 应用时区与数据库时间是否存在差异
- 数据库类型精度是否足够

而这两个方面的根本原因其实是同一个，看一下模拟流程：

### **时间是如何存储到数据库的**：从 Java 到数据库

我们可以把这个过程分为四个关键阶段：

1. **阶段一：时间的诞生 (Java 应用程序)**
2. **阶段二：时间的翻译 (JDBC 驱动程序)**
3. **阶段三：时间的旅途 (网络传输)**
4. **阶段四：时间的归宿 (数据库服务器)**

---

#### 阶段一：时间的诞生 ( Java 代码)

1. **创建 **`LocalDateTime`:

- 代码 `LocalDateTime.now()` 创建了一个 `LocalDateTime` 对象。
- **关键特性**: **不包含任何时区信息**，**只表示“年月日时分秒”**。无法区分这个钟是在北京还是在伦敦。内部精度可以达到**纳秒**。

1. **设置时分秒**:

- 代码 `.withHour(23).withMinute(59).withSecond(59)` 修改了这个对象。
- **陷阱**: 如我们之前分析，这一步**只修改了时、分、秒，但 **`now()`** 带来的纳秒部分被完整保留了下来**。此时 `resultTime` 的值可能是 `2025-07-30T23:59:59.123456789`。

1. **转换为 **`Instant`** (生成“时间戳”)**:

- 代码是 `resultTime.atZone(ZoneId.systemDefault()).toInstant()`。
- `atZone(ZoneId.systemDefault())`: 指定当前时间时区，**JVM默认时区**下的时间。
- `toInstant()`: 程序将这个带有时区的时间点，转换为一个**全球唯一的、标准的 **`Instant`** 对象**。`Instant` 的本质可以理解为一个**自UTC纪元（1970-01-01 00:00:00Z）以来的纳秒数（或毫秒数）**。

1. **转换为 **`java.util.Date`:

- `Date.from(...)` 将 `Instant` 包装成了一个 `java.util.Date` 对象。`Date` 对象内部同样是存储了一个`long`类型的、自UTC纪元以来的**毫秒数**。

#### 阶段二：时间的翻译 (JDBC 驱动程序)

**这是最关键也最容易被忽略的环节**。 `Date` 对象并不会直接把那个 `long` 类型的毫秒数扔给数据库。

1. **序列化**: 当 `blackAccountService.save()` 执行时，JPA/Hibernate框架会将 `Date` 对象交给 JDBC 驱动程序。
2. **格式转换**: JDBC 驱动程序（例如 MySQL Connector/J）会负责将这个 `Date` 对象**翻译成数据库认识的格式**。它通常不会直接发送一个`long`数字，而是会将其转换为一个**标准的日期时间字符串**。

- 例如，它会把 `Date` 对象代表的UTC时间点，格式化成类似 `'2025-07-30 23:59:59.123'` 这样的字符串。

1. **时区处理**: 这个翻译过程会受到**JDBC连接串中的时区参数**（如 `serverTimezone=UTC`）的强烈影响。驱动程序会根据这个参数来决定如何格式化这个字符串，以及如何与数据库进行“沟通”。如果设置不当，这里就可能发生一次意外的时区转换。

#### 阶段三：时间的旅途 (网络传输)

这个阶段比较简单。包含了 `INSERT INTO ... VALUES ('... 23:59:59.123', ...)` 的SQL语句，通过网络协议（如TCP/IP）从您的应用程序服务器发送到数据库服务器。

#### 阶段四：时间的归宿 (数据库服务器)

数据库收到了包含时间字符串的SQL语句，开始它的工作。

1. **解析**: 数据库解析SQL语句，看到了这个时间字符串 `'2025-07-30 23:59:59.123'`。
2. **存储转换**: 这是决定最终结果的最后一步，取决于您表字段的类型。

- **如果字段是 **`DATETIME`** (MySQL)**: 直接把字符串的字面值 `'2025-07-30 23:59:59'` 存下来（如果精度不够，毫秒会被丢弃或四舍五入）。它不关心任何时区。
- **如果字段是 **`TIMESTAMP`** (MySQL/PostgreSQL)**:

- a. 它会认为收到的这个时间字符串是基于**数据库当前会话的时区** (`session.time_zone`)。
- b. 然后，它会将这个时间**从会话时区转换为UTC时间**。
- c. 最后，它将这个**UTC时间对应的那个长整型数字（时间戳）** 存储在磁盘上。
- d. 当您 `SELECT` 这个值时，它又会把存好的UTC时间戳，根据您**当前查询会话的时区**，转换成本地时间再展示给您。

### 问题触发原因:

- 假设数据库收到的字符串是 `'2025-07-30 23:59:59.999'`。
- 您的数据库字段是 `TIMESTAMP(0)`，精度只到秒。
- 数据库在准备存储时，会进行**四舍五入**。`.999` 被进位，`59`秒变成了`60`秒。
- `23:59:60` 导致连锁进位，最终变成了 `2025-07-31 00:00:00`。

### 关键节点与风险总结

阶段
核心工作
潜在风险点

**1. Java应用**
创建时间对象，赋予时区，生成`Instant`
1. **精度残留**：`now()`带来的纳秒未被处理。
2. **隐式时区**：`ZoneId.systemDefault()` 导致代码在不同服务器上行为不一。

**2. JDBC驱动**
将Java `Date`/`Instant` 对象翻译成字符串
**连接串时区配置错误** (`serverTimezone`)，导致驱动在“翻译”时发生意外的时区转换。

**3. 网络传输**
传递SQL语句
（无）

**4. 数据库**
解析字符串，根据字段类型存储
1. **字段精度不足**：`TIMESTAMP(0)`遇到毫秒，触发**四舍五入**。
2. **数据库时区混乱**：`TIMESTAMP`类型受数据库`time_zone`变量影响，导致存储和读取时发生非预期的转换。
