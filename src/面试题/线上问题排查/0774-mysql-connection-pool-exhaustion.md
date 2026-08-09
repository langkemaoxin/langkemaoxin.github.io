---
title: "MySQL数据库连接池爆满如何排查"
sidebarGroup: "线上问题排查"
shortTitle: "MySQL数据库连接池爆满如何排查"
order: 774
date: 2026-07-25
category: "面试题"
tag:
  - "面试题"
description: "当Java应用程序面临MySQL数据库连接池爆满的问题时，通常会导致应用程序性能下降或请求被拒绝。解决这个问题需要深入分析程序的数据库连接管理。以下是具体的排查步骤和过程：1. 确认问题首先，我们需要确认连接池确实爆满了。通常可以通过以下方"
article: false
---

> 来源：[MySQL数据库连接池爆满如何排查](https://www.yuque.com/tulingzhouyu/db22bv/gn5d62blxrrrftko)

当Java应用程序面临MySQL数据库连接池爆满的问题时，通常会导致应用程序性能下降或请求被拒绝。解决这个问题需要深入分析程序的数据库连接管理。以下是具体的排查步骤和过程：

### 确认问题

首先，我们需要确认连接池确实爆满了。通常可以通过以下方式：

- 检查应用日志，查找与数据库连接相关的错误信息，如"无法获取连接"等。
- 查看数据库连接池的监控面板（如果有的话）。
- 使用数据库管理工具查看当前活跃连接数。

### 收集信息

收集以下信息：

- 连接池配置（最大连接数、最小连接数、超时时间等）
- 当前活跃连接数
- 数据库服务器资源使用情况（CPU、内存、磁盘I/O）
- 应用服务器资源使用情况
- 近期是否有代码变更或流量激增

### 分析连接使用情况

使用MySQL命令查看当前连接：

```java
SHOW PROCESSLIST;
```

这会显示所有当前连接，包括它们的状态、执行的查询等。

### 检查慢查询

查看是否有长时间运行的查询占用连接：

```java
SHOW FULL PROCESSLIST;
```

关注"Time"列，看是否有查询执行时间过长。

### 分析应用代码

检查应用代码中的连接使用方式：

- 是否正确关闭连接
- 是否有连接泄露
- 是否有不必要的长连接

例如，以下代码可能导致连接泄露：

```java
public void leakyMethod() {  
    Connection conn = null;  
    try {  
        conn = dataSource.getConnection();  
        // 使用连接进行操作  
    } catch (SQLException e) {  
        e.printStackTrace();  
    }  
    // 没有在 finally 块中关闭连接  
}
```

正确的做法应该是：

```java
public void leakyMethod() {  
    Connection conn = null;  
    try {  
        conn = dataSource.getConnection();  
        // 使用连接进行操作  
    } catch (SQLException e) {  
        e.printStackTrace();  
    }  
    finally {
        conn.close();
    }
}
```

### 检查连接池配置

检查连接池的配置是否合理。以HikariCP为例：

```java
HikariConfig config = new HikariConfig();  
config.setMaximumPoolSize(10);  
config.setConnectionTimeout(30000);  
config.setIdleTimeout(600000);  
config.setMaxLifetime(1800000);
```

确保这些参数设置合理：

- maximumPoolSize：最大连接数
- connectionTimeout：等待连接的最大毫秒数
- idleTimeout：连接允许在池中闲置的最长时间
- maxLifetime：连接最长生命周期

### 使用监控工具

使用如JConsole或VisualVM等Java监控工具，观察连接池的使用情况。

### 数据库性能分析

使用MySQL的性能模式（Performance Schema）来分析数据库性能：

```java
SELECT * FROM performance_schema.events_waits_summary_global_by_event_name  
WHERE event_name LIKE '%wait/synch/mutex/innodb/%'  
ORDER BY sum_timer_wait DESC;
```

这可以帮助识别数据库层面的瓶颈。

### 解决方案

根据分析结果，可能的解决方案包括：

- 优化慢查询
- 增加连接池大小（如果服务器资源允许）
- 修复连接泄露的代码
- 使用读写分离或分库分表来分散负载
- 添加连接池监控和告警机制

### 实施和验证

实施解决方案后，持续监控连接池使用情况，确保问题得到解决。

示例：
假设我们发现了一个导致连接池爆满的问题，原因是某个查询长时间运行导致连接无法释放。

1. 首先，我们通过`SHOW FULL PROCESSLIST`发现了一个长时间运行的查询：

```java
+----+------+-----------------+------+---------+------+---------------+------------------+  
| Id | User | Host            | db   | Command | Time | State         | Info             |  
+----+------+-----------------+------+---------+------+---------------+------------------+  
| 1  | root | localhost:3306  | mydb | Query   | 3600 | Sending data  | SELECT * FROM ... |  
+----+------+-----------------+------+---------+------+---------------+------------------+
```

1. 分析该查询，发现是一个全表扫描的大查询：

```java
SELECT * FROM large_table WHERE non_indexed_column = 'some_value';
```

1. 优化这个查询：

- 添加适当的索引
- 限制返回的行数

```java
ALTER TABLE large_table ADD INDEX idx_non_indexed_column (non_indexed_column);  
SELECT * FROM large_table WHERE non_indexed_column = 'some_value' LIMIT 1000;
```

1. 在应用代码中，我们发现了以下问题：

```java
public List&lt;Data&gt; fetchData(String value) {  
Connection conn = dataSource.getConnection();  
try {  
    PreparedStatement stmt = conn.prepareStatement("SELECT * FROM large_table WHERE non_indexed_column = ?");  
    stmt.setString(1, value);  
    ResultSet rs = stmt.executeQuery();  
    // 处理结果集  
} catch (SQLException e) {  
    e.printStackTrace();  
}  
// 连接未关闭  
return dataList;  
}
```

1. 修改代码以正确管理连接：

```java
public List&lt;Data&gt; fetchData(String value) {  
List&lt;Data&gt; dataList = new ArrayList<>();  
try {Connection conn = dataSource.getConnection();  
     PreparedStatement stmt = conn.prepareStatement("SELECT * FROM large_table WHERE non_indexed_column = ? LIMIT 1000")) {  
    stmt.setString(1, value);  
    try (ResultSet rs = stmt.executeQuery()) {  
        while (rs.next()) {  
            // 处理结果集  
            dataList.add(new Data(rs.getString("column1"), rs.getInt("column2")));  
        }  
    }  
} catch (SQLException e) {  
    logger.error("Error fetching data", e);  
} finally{
    conn.close();
} 
return dataList;  
}
```

1. 调整连接池配置：

```java
HikariConfig config = new HikariConfig();  
config.setMaximumPoolSize(20); // 增加最大连接数  
config.setConnectionTimeout(30000);  
config.setIdleTimeout(600000);  
config.setMaxLifetime(1800000);
```

1. 添加监控：

- 使用Spring Actuator或自定义监控来跟踪连接池使用情况
- 设置告警，当连接使用率接近最大值时通知开发团队

通过这些步骤，我们解决了导致连接池爆满的主要问题，优化了数据库查询，修复了连接泄露，并增强了监控能力。在实施这些更改后，我们会持续监控系统，确保连接池使用正常，并在必要时进行进一步的优化。
