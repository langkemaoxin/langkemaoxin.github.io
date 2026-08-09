---
title: "面试官问：Redis 阻塞的核心原因和优化方案，一文吃透！"
sidebarGroup: "鹏宇老师"
shortTitle: "面试官问：Redis 阻塞的核心原因和优化方案，一文吃透！"
order: 1158
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "在高并发场景中，Redis 凭借其高性能成为缓存首选，但 “阻塞问题” 却常常成为服务稳定性的 “绊脚石”。很多开发者都会有疑问：Redis 不是基于 “非阻塞 IO 多路复用” 吗？为何还会出现阻塞？答案的核心在于 Redis 的单线程工"
article: false
---

> 来源：[面试官问：Redis 阻塞的核心原因和优化方案，一文吃透！](https://www.yuque.com/tulingzhouyu/db22bv/ksmi8ff12vtv71t4)

在高并发场景中，Redis 凭借其高性能成为缓存首选，但 “阻塞问题” 却常常成为服务稳定性的 “绊脚石”。很多开发者都会有疑问：Redis 不是基于 “非阻塞 IO 多路复用” 吗？为何还会出现阻塞？

答案的核心在于 Redis 的**单线程工作模型**——IO 多路复用解决了网络连接的并发问题，但所有命令的执行、数据的处理都必须在单个线程中串行执行。一旦线程中出现耗时操作，后续请求就会排队等待，最终表现为服务阻塞。

本文将结合实战场景，详细拆解 Redis 阻塞的 7 大核心场景，剖析底层原因，并提供可直接落地的优化方案。

## 一、O (n) 命令阻塞：单线程的 “遍历陷阱”

### 1. 问题本质

Redis 单线程模型下，执行遍历全量数据的 O (n) 命令时，线程会被长时间占用，期间无法处理其他请求，导致服务瞬间 “卡死”。这类命令的执行时间与数据量正相关，数据量越大，阻塞时间越长。

### 2. 高危命令清单

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-9e03c4bd148f.png)

以下命令是生产环境的 “禁忌”，需严格规避：

- `KEYS *`：全表扫描所有键，数据量达百万级时阻塞时间以秒计
- `HGETALL key`：返回 Hash 结构的所有键值对，无分页机制
- `LRANGE key 0 -1`：返回 List 所有元素，等同于全量遍历
- `SMEMBERS key`/`SINTER key1 key2`：集合全量查询 / 交集运算
- `ZRANGE key 0 -1`：返回有序集合所有元素，无视范围限制

### 3. 解决方案

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-971314c1dd76.png)

#### （1）替代高危命令

用 SCAN 系列命令实现分批遍历，避免全量扫描：

- `KEYS *` → `SCAN 0 MATCH * COUNT 100`（游标式遍历，每次返回 100 条）
- `HGETALL key` → `HSCAN key 0 COUNT 50`（Hash 分批查询）
- `SMEMBERS key` → `SSCAN key 0 COUNT 50`（集合分批查询）

**SCAN 命令使用示例（Java + Jedis）**：

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.ScanParams;
import redis.clients.jedis.ScanResult;
import java.util.List;

public class RedisScanExample {
    // 循环遍历所有键，每次返回100条，避免阻塞
    public void scanAllKeys(Jedis jedis) {
        String cursor = "0"; // 初始游标
        ScanParams scanParams = new ScanParams().match("*").count(100); // 匹配所有键，每次返回100条
        do {
            ScanResult&lt;String&gt; scanResult = jedis.scan(cursor, scanParams);
            List&lt;String&gt; keys = scanResult.getResult();
            if (keys != null && !keys.isEmpty()) {
                System.out.println("获取到键：" + keys);
            }
            cursor = scanResult.getStringCursor(); // 更新游标
        } while (!"0".equals(cursor)); // 游标为0时遍历结束
    }

    public static void main(String[] args) {
        // 建立Jedis连接（实际生产中建议使用连接池）
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            new RedisScanExample().scanAllKeys(jedis);
        }
    }
}
```

#### （2）严格控制命令范围

执行范围类命令时，明确限制数据量：

```java
import redis.clients.jedis.Jedis;

public class RedisRangeExample {
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            // 错误：获取List所有元素（O(n)）
            // List&lt;String&gt; allElements = jedis.lrange("user_list", 0, -1);

            // 正确：只获取前10条元素（O(10)）
            List&lt;String&gt; limitedElements = jedis.lrange("user_list", 0, 9);
            System.out.println("获取前10条元素：" + limitedElements);
        }
    }
}
```

#### （3）监控命令执行耗时

通过 `info commandstats` 分析命令执行开销，及时发现慢命令：

```java
import redis.clients.jedis.Jedis;
import java.util.Map;

public class RedisCommandStatsExample {
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            String commandStats = jedis.info("commandstats");
            // 解析命令统计信息（格式：cmdstat_命令:calls=调用次数,usec=总耗时,usec_per_call=平均耗时）
            String[] statsLines = commandStats.split("\r\n");
            for (String line : statsLines) {
                if (line.startsWith("cmdstat_")) {
                    System.out.println(line);
                    // 示例输出：cmdstat_hgetall:calls=5,usec=800,usec_per_call=160.00
                }
            }
        }
    }
}
```

## 二、持久化阻塞：性能与安全的 “权衡陷阱”

Redis 持久化机制（RDB + AOF）是数据安全的保障，但不当配置会引发阻塞，核心矛盾是 “磁盘 IO 操作” 与 “单线程” 的冲突。

### 1. RDB 持久化阻塞

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-4ec555f35ed1.png)

RDB 通过生成内存快照实现持久化，有两种触发命令，差异极大：

**命令**
**执行方式**
**阻塞情况**
**生产环境适用性**

SAVE
单线程同步执行
阻塞主线程直到快照完成
❌ 绝对禁止

BGSAVE
fork 子进程执行
仅 fork 瞬间轻微阻塞
✅ 推荐使用

**底层原理**：BGSAVE 会通过 `fork()` 创建子进程，子进程负责写入快照文件，主进程继续处理请求。但 `fork()` 操作会复制进程地址空间，内存越大，复制耗时越长（毫秒级到秒级），期间主线程阻塞。

#### 优化建议：

- 禁用手动 `SAVE` 命令，依赖自动触发（`save 900 1` 等配置）
- 避免在内存峰值时触发 BGSAVE（如业务高峰期）
- 配置 `stop-writes-on-bgsave-error no`，允许快照失败时继续写入

### 2. AOF 持久化阻塞

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-433b45cc6fd9.png)

AOF 通过记录命令日志实现持久化，存在 3 个潜在阻塞点，流程如下：

1. 执行命令 → 写入内存 → 写入 AOF 缓冲区（非阻塞）
2. 主线程将缓冲区数据写入磁盘（可能阻塞）
3. 根据 `appendfsync` 策略刷盘（可能阻塞）

#### （1）核心阻塞点解析

- **阻塞点 2**：AOF 缓冲区满时，主线程需等待数据写入磁盘才能继续接收命令
- **阻塞点 3**：`appendfsync` 策略决定刷盘频率，直接影响阻塞风险

#### （2）`appendfsync` 策略对比

**策略**
**刷盘频率**
**阻塞风险**
**数据安全性**
**性能**

always
每执行 1 条命令刷盘 1 次
高
最高
最差

everysec
每秒刷盘 1 次
中
较高
均衡

no
由操作系统决定刷盘时机
低
最低
最好

#### （3）AOF 优化方案

- 生产环境首选 `appendfsync everysec`，平衡性能与安全
- 开启 AOF 重写（`BGREWRITEAOF`），定期压缩日志文件，减少 IO 压力
- 配置 `aof-rewrite-incremental-fsync yes`，重写时每 32MB 刷盘 1 次，避免长时间阻塞

**AOF 核心配置示例**：

```bash
appendonly yes  # 开启AOF
appendfsync everysec  # 每秒刷盘
auto-aof-rewrite-percentage 100  # 日志文件增长100%时触发重写
auto-aof-rewrite-min-size 64mb  # 日志文件≥64MB时触发重写
```

## 三、大 Key 阻塞：“重量级数据” 的连锁反应

大 Key 是 Redis 阻塞的 “隐形杀手”，不仅占用大量内存，还会引发查询、删除、迁移等一系列耗时操作，最终导致单线程阻塞。

### 1. 大 Key 的定义

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-58e040e9ff25.png)

- String 类型：大小 > 1MB（如存储 Base64 编码的图片）
- 复合类型（List/Hash/Set/ZSet）：元素数量 > 5000 个（或总大小 > 10MB）

### 2. 大 Key 的核心危害

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-ea484ee23259.png)

- 查询耗时：获取大 Key 需遍历全量数据，阻塞单线程
- 网络拥堵：大 Key 传输占用大量带宽（GB 级），导致其他请求超时
- 删除阻塞：`DEL 大Key` 是 O (n) 操作，删除百万级元素需秒级时间
- 迁移故障：集群扩容时，大 Key 迁移耗时过长，触发故障转移

### 3. 大 Key 完整解决流程

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-3154d1b5c48b.png)

#### （1）检测大 Key

使用官方工具 `redis-cli --bigkeys` 快速识别大 Key，或通过 Java 代码自定义检测：

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.ScanParams;
import redis.clients.jedis.ScanResult;
import redis.clients.jedis.util.ByteUtils;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;

public class BigKeyDetector {
    private static final long STRING_BIG_KEY_THRESHOLD = 1024 * 1024; // String类型大Key阈值：1MB
    private static final long COMPLEX_BIG_KEY_THRESHOLD = 5000; // 复合类型大Key阈值：5000个元素

    // 自定义检测大Key
    public List<Map<String, Object>> detectBigKeys(Jedis jedis) {
        List<Map<String, Object>> bigKeys = new ArrayList<>();
        String cursor = "0";
        ScanParams scanParams = new ScanParams().match("*").count(100);

        do {
            ScanResult&lt;String&gt; scanResult = jedis.scan(cursor, scanParams);
            List&lt;String&gt; keys = scanResult.getResult();
            if (keys != null && !keys.isEmpty()) {
                for (String key : keys) {
                    String type = jedis.type(key);
                    switch (type) {
                        case "string":
                            long strLen = jedis.strlen(key);
                            if (strLen > STRING_BIG_KEY_THRESHOLD) {
                                bigKeys.add(Map.of("key", key, "type", "string", "size", strLen + "B"));
                            }
                            break;
                        case "hash":
                            long hashLen = jedis.hlen(key);
                            if (hashLen > COMPLEX_BIG_KEY_THRESHOLD) {
                                bigKeys.add(Map.of("key", key, "type", "hash", "size", hashLen + " elements"));
                            }
                            break;
                        case "list":
                            long listLen = jedis.llen(key);
                            if (listLen > COMPLEX_BIG_KEY_THRESHOLD) {
                                bigKeys.add(Map.of("key", key, "type", "list", "size", listLen + " elements"));
                            }
                            break;
                        case "set":
                            long setLen = jedis.scard(key);
                            if (setLen > COMPLEX_BIG_KEY_THRESHOLD) {
                                bigKeys.add(Map.of("key", key, "type", "set", "size", setLen + " elements"));
                            }
                            break;
                        case "zset":
                            long zsetLen = jedis.zcard(key);
                            if (zsetLen > COMPLEX_BIG_KEY_THRESHOLD) {
                                bigKeys.add(Map.of("key", key, "type", "zset", "size", zsetLen + " elements"));
                            }
                            break;
                    }
                }
            }
            cursor = scanResult.getStringCursor();
        } while (!"0".equals(cursor));

        return bigKeys;
    }

    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            List<Map<String, Object>> bigKeys = new BigKeyDetector().detectBigKeys(jedis);
            System.out.println("检测到的大Key：" + bigKeys);
        }
    }
}
```

#### （2）拆分大 Key

根据数据类型选择拆分策略，核心思路是 “化整为零”：

**数据类型**
**拆分策略**
**示例**

String
按业务分片（如用户 ID 尾号）
`user_avatar:10086`
 → `user_avatar:10086_0`、`user_avatar:10086_1`

Hash
按字段前缀分片
`user_info:10086`
 → `user_info:10086_basic`、`user_info:10086_extra`

List
按时间 / 页码分片
`msg_list:10086`
 → `msg_list:10086_202405`、`msg_list:10086_202406`

**String 大 Key 拆分示例（Java）**：

```java
import redis.clients.jedis.Jedis;
import java.nio.charset.StandardCharsets;

public class BigStringSplitter {
    private static final int CHUNK_SIZE = 512 * 1024; // 每个分片512KB（按字节计算）

    // 拆分String类型大Key（适用于Base64编码图片、大文本等）
    public void splitBigString(Jedis jedis, String key) {
        // 获取大Key的字节数组（避免字符串编码问题）
        byte[] bigValue = jedis.get(key.getBytes(StandardCharsets.UTF_8));
        if (bigValue == null || bigValue.length == 0) {
            System.out.println("Key不存在或值为空");
            return;
        }

        // 分片并存储
        int chunkCount = (int) Math.ceil((double) bigValue.length / CHUNK_SIZE);
        for (int i = 0; i < chunkCount; i++) {
            int start = i * CHUNK_SIZE;
            int end = Math.min((i + 1) * CHUNK_SIZE, bigValue.length);
            // 截取分片
            byte[] chunk = new byte[end - start];
            System.arraycopy(bigValue, start, chunk, 0, end - start);
            // 存储分片（键格式：原键_分片索引）
            jedis.set((key + "_" + i).getBytes(StandardCharsets.UTF_8), chunk);
        }

        // 存储分片数量（用于后续合并）
        jedis.set((key + "_chunk_count").getBytes(StandardCharsets.UTF_8), 
                 String.valueOf(chunkCount).getBytes(StandardCharsets.UTF_8));
        // 删除原大Key
        jedis.del(key);
        System.out.println("大Key拆分完成，共" + chunkCount + "个分片");
    }

    // 合并拆分后的大Key
    public byte[] mergeBigString(Jedis jedis, String key) {
        byte[] chunkCountBytes = jedis.get((key + "_chunk_count").getBytes(StandardCharsets.UTF_8));
        if (chunkCountBytes == null) {
            return null;
        }
        int chunkCount = Integer.parseInt(new String(chunkCountBytes, StandardCharsets.UTF_8));

        // 计算总长度
        int totalLength = 0;
        byte[][] chunks = new byte[chunkCount][];
        for (int i = 0; i < chunkCount; i++) {
            byte[] chunk = jedis.get((key + "_" + i).getBytes(StandardCharsets.UTF_8));
            chunks[i] = chunk;
            totalLength += chunk.length;
        }

        // 合并所有分片
        byte[] mergedValue = new byte[totalLength];
        int offset = 0;
        for (byte[] chunk : chunks) {
            System.arraycopy(chunk, 0, mergedValue, offset, chunk.length);
            offset += chunk.length;
        }

        return mergedValue;
    }

    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            BigStringSplitter splitter = new BigStringSplitter();
            // 拆分大Key
            splitter.splitBigString(jedis, "user_avatar:10086");
            // 合并大Key
            byte[] mergedValue = splitter.mergeBigString(jedis, "user_avatar:10086");
            System.out.println("合并后的大Key长度：" + (mergedValue != null ? mergedValue.length + "B" : "null"));
        }
    }
}
```

#### （3）分批删除大 Key

避免使用 `DEL 大Key`（O (n) 阻塞），改用 `UNLINK`（异步删除）或分批删除：

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.ScanParams;
import redis.clients.jedis.ScanResult;
import java.util.List;

public class BigKeyDeleter {
    // 分批删除Hash类型大Key（避免一次性删除万级字段）
    public void batchDeleteHash(Jedis jedis, String key) {
        String cursor = "0";
        ScanParams scanParams = new ScanParams().count(100); // 每次删除100个字段
        do {
            ScanResult<Map.Entry<String, String>> scanResult = jedis.hscan(key, cursor, scanParams);
            List<Map.Entry<String, String>> fields = scanResult.getResult();
            if (fields != null && !fields.isEmpty()) {
                // 提取字段名数组
                String[] fieldNames = fields.stream()
                        .map(Map.Entry::getKey)
                        .toArray(String[]::new);
                // 批量删除字段
                jedis.hdel(key, fieldNames);
            }
            cursor = scanResult.getStringCursor();
        } while (!"0".equals(cursor));

        // 删除空Hash键
        jedis.del(key);
        System.out.println("Hash大Key删除完成");
    }

    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            BigKeyDeleter deleter = new BigKeyDeleter();
            // 异步删除（Redis 4.0+支持）
            // jedis.unlink("big_hash_key");

            // 分批删除Hash大Key
            deleter.batchDeleteHash(jedis, "big_hash_key");
        }
    }
}
```

#### （4）长期预防

- 业务层限制单 Key 大小：String 不超过 512KB，复合类型元素不超过 1000 个
- 定时巡检：每周执行 `redis-cli --bigkeys`，提前发现大 Key
- 内存告警：配置 `maxmemory-policy allkeys-lru`，并设置内存使用率告警（如超过 80%）

## 四、集群扩容阻塞：数据迁移的 “同步陷阱”

Redis 集群扩容时，需将哈希槽（Slot）及对应数据从旧节点迁移到新节点，这个过程是**同步执行**的，容易引发阻塞。

### 1. 核心阻塞原因

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-28449c52a961.png)

- 同步迁移：每个 Key 的迁移需经历 “源节点读取 → 目标节点写入 → 源节点删除” 三步，全程同步，阻塞该 Key 所在的哈希槽
- 大 Key 瓶颈：大 Key 迁移耗时过长，导致对应哈希槽长时间不可用，甚至触发集群故障转移

### 2. 优化方案

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-6c97e9606813.png)

#### （1）迁移前预处理大 Key

扩容前扫描所有节点的大 Key，拆分后再迁移（参考大 Key 拆分方案），避免迁移过程中阻塞。

#### （2）选择业务低峰期扩容

避开高峰期（如电商秒杀、工作日 10-18 点），选择凌晨等低流量时段执行迁移操作，减少对业务的影响。

#### （3）监控迁移进度

通过 `cluster nodes` 命令实时查看迁移状态，及时发现异常：

```java
import redis.clients.jedis.JedisCluster;
import java.util.Set;

public class ClusterMigrationMonitor {
    public void monitorMigrationStatus(JedisCluster jedisCluster) {
        Set&lt;String&gt; nodes = jedisCluster.getClusterNodes().keySet();
        for (String node : nodes) {
            String nodeInfo = jedisCluster.clusterNodes();
            // 解析节点信息，判断是否有迁移中的槽
            if (nodeInfo.contains("migrating")) {
                System.out.println("节点 " + node + " 存在迁移中的哈希槽：" + nodeInfo);
            }
        }
    }

    public static void main(String[] args) {
        // 集群连接配置（实际生产中需配置所有节点）
        Set&lt;HostAndPort&gt; nodes = Set.of(new HostAndPort("localhost", 6379));
        try (JedisCluster jedisCluster = new JedisCluster(nodes)) {
            new ClusterMigrationMonitor().monitorMigrationStatus(jedisCluster);
        }
    }
}
```

#### （4）控制迁移速率

使用 `cluster setslot ... migrating` 命令手动迁移时，可通过脚本控制迁移速率，避免单次迁移过多 Key：

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.ScanParams;
import redis.clients.jedis.ScanResult;
import java.util.List;

public class ClusterSlotMigrator {
    // 分批迁移哈希槽，每次迁移100个Key
    public void migrateSlot(Jedis sourceJedis, String targetNode, int slot) {
        // 1. 标记槽为迁移中（targetNode格式：ip:port）
        sourceJedis.clusterSetSlot(slot, "migrating", targetNode);

        String cursor = "0";
        ScanParams scanParams = new ScanParams().count(100);
        do {
            // 2. 扫描槽内所有Key
            ScanResult&lt;String&gt; scanResult = sourceJedis.clusterGetKeysInSlot(slot, 100);
            List&lt;String&gt; keys = scanResult.getResult();
            if (keys != null && !keys.isEmpty()) {
                // 3. 迁移Key到目标节点（5000ms超时）
                String[] targetParts = targetNode.split(":");
                sourceJedis.migrate(
                        targetParts[0], // 目标节点IP
                        Integer.parseInt(targetParts[1]), // 目标节点端口
                        "", // 迁移的Key（空字符串表示迁移所有扫描到的Key）
                        0, // 数据库索引
                        5000, // 超时时间（ms）
                        true, // COPY：保留源节点Key（迁移完成后手动删除）
                        true  // REPLACE：覆盖目标节点已存在的Key
                );
                // 4. 删除源节点的Key
                sourceJedis.del(keys.toArray(new String[0]));
            }
            cursor = scanResult.getStringCursor();
        } while (!"0".equals(cursor));

        // 5. 标记槽为已迁移（关联到目标节点）
        sourceJedis.clusterSetSlot(slot, "node", targetNode);
        System.out.println("哈希槽 " + slot + " 迁移完成");
    }

    public static void main(String[] args) {
        try (Jedis sourceJedis = new Jedis("localhost", 6379)) {
            new ClusterSlotMigrator().migrateSlot(sourceJedis, "192.168.1.101:6379", 1000);
        }
    }
}
```

## 五、Swap 内存交换：性能的 “致命陷阱”

Swap 是操作系统的内存调度机制，当物理内存不足时，会将部分内存数据换出到硬盘（Swap 分区），需要时再换入内存。但对 Redis 而言，Swap 是 “致命伤”。

### 1. 核心危害

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-973fec834e61.png)

- 性能暴跌：内存访问速度是磁盘的 10 万倍以上，Redis 访问 Swap 分区时，响应时间从毫秒级飙升至秒级
- 主线程阻塞：频繁的 Swap 读写会导致 Redis 线程等待 IO 完成，无法处理请求

### 2. 检测 Swap 使用

通过以下命令确认 Redis 是否使用 Swap，也可通过 Java 调用系统命令实现（适用于 Linux 环境）：

```java
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class RedisSwapDetector {
    // 检测Redis进程的Swap使用情况（Linux环境）
    public void checkSwapUsage(int redisPid) throws Exception {
        // 执行命令：cat /proc/[pid]/smaps | grep Swap
        Process process = Runtime.getRuntime().exec(new String[]{"bash", "-c", "cat /proc/" + redisPid + "/smaps | grep Swap"});
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
                // 健康状态：所有Swap值均为0KB或4KB（少量元数据）
            }
        }
        process.waitFor();
    }

    // 获取Redis进程ID
    public int getRedisPid(String host, int port) {
        try (Jedis jedis = new Jedis(host, port)) {
            String info = jedis.info("server");
            String[] lines = info.split("\r\n");
            for (String line : lines) {
                if (line.startsWith("process_id:")) {
                    return Integer.parseInt(line.split(":")[1]);
                }
            }
        }
        return -1;
    }

    public static void main(String[] args) throws Exception {
        RedisSwapDetector detector = new RedisSwapDetector();
        int redisPid = detector.getRedisPid("localhost", 6379);
        if (redisPid != -1) {
            System.out.println("Redis进程ID：" + redisPid);
            detector.checkSwapUsage(redisPid);
        } else {
            System.out.println("获取Redis进程ID失败");
        }
    }
}
```

### 3. 解决方案

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-7bc8a3762f89.png)

- 关闭 Swap：生产环境禁止使用 Swap，通过 `swapoff -a` 临时关闭，修改 `/etc/fstab` 永久禁用
- 充足物理内存：确保 Redis 可用内存 ≥ 最大内存使用量 + 20% 冗余
- 合理配置 `maxmemory`：限制 Redis 最大使用内存，避免内存溢出触发 Swap

```bash
maxmemory 16gb  # Redis最大使用内存16GB
maxmemory-policy allkeys-lru  # 内存满时淘汰最少使用的Key
```

## 六、CPU 竞争：资源争夺的 “性能陷阱”

Redis 是 CPU 密集型应用，单线程对 CPU 资源极其敏感，一旦出现 CPU 竞争，会直接导致命令执行延迟。

### 1. 核心竞争场景

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-47f1e6198050.png)

- 同机部署竞争：Redis 与数据库（MySQL）、大数据计算（Spark）等 CPU 密集型服务共用服务器
- 内部命令竞争：Redis 执行大量复杂命令（如 `SORT`、`ZUNIONSTORE`），占用过多 CPU 时间

### 2. 优化方案

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-79c6265b6cdf.png)

- 独立部署：Redis 单独部署在物理机或虚拟机上，不与其他 CPU 密集型服务共存
- 监控 CPU 利用率：通过 `top`/`htop` 实时监控，或通过 Java 调用系统命令获取（适用于 Linux）

```java
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class RedisCpuMonitor {
    // 监控Redis进程CPU利用率（Linux环境）
    public void monitorCpuUsage(int redisPid) throws Exception {
        // 执行命令：top -p [pid] -n 1
        Process process = Runtime.getRuntime().exec(new String[]{"top", "-p", String.valueOf(redisPid), "-n", "1"});
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("redis-server")) {
                    System.out.println("Redis CPU利用率：" + line);
                    // 输出示例：12345 redis    20   0 16.8g  12g  128k R  65.0  75.0   2:30.12 redis-server
                }
            }
        }
        process.waitFor();
    }

    public static void main(String[] args) throws Exception {
        RedisSwapDetector detector = new RedisSwapDetector();
        int redisPid = detector.getRedisPid("localhost", 6379);
        if (redisPid != -1) {
            new RedisCpuMonitor().monitorCpuUsage(redisPid);
        }
    }
}
```

- 优化复杂命令：减少 `SORT`、`ZUNIONSTORE` 等命令使用，通过业务逻辑替代

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.Tuple;
import java.util.List;
import java.util.Comparator;
import java.util.ArrayList;

public class ComplexCommandOptimizer {
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            // 错误：Redis内排序（CPU密集）
            // List&lt;String&gt; sortedKeys = jedis.sort("user_scores", new SortingParams().desc());

            // 正确：业务层排序（分摊CPU压力）
            // 1. 获取所有分数（ZSet示例）
            Set&lt;Tuple&gt; scoreSet = jedis.zrangeWithScores("user_scores", 0, -1);
            // 2. 转换为List并排序
            List&lt;Tuple&gt; scoreList = new ArrayList<>(scoreSet);
            scoreList.sort(Comparator.comparingDouble(Tuple::getScore).reversed());
            // 3. 获取前10条
            List&lt;Tuple&gt; top10 = scoreList.subList(0, Math.min(10, scoreList.size()));
            System.out.println("Top10用户分数：" + top10);
        }
    }
}
```

## 七、网络问题：最后一道 “阻塞防线”

网络问题是 Redis 阻塞的 “外部诱因”，排查时通常放在最后（排除内部问题后），但危害同样不可忽视。

### 1. 常见网络阻塞场景

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-d9ac8e1d3f1d.png)

- 连接拒绝：端口占用、防火墙拦截、Redis 最大连接数耗尽（`maxclients` 限制）
- 网络延迟：跨机房部署、带宽瓶颈、TCP 重传（网络不稳定）
- 网卡软中断：高并发网络 IO 导致 CPU 处理中断压力过大，无法及时响应 Redis 请求

### 2. 优化方案

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-91cdde86887d.png)

- 同机房部署：Redis 与应用服务部署在同一机房，网络延迟控制在 1ms 内
- 合理配置连接数：根据业务需求调整 `maxclients`，避免连接耗尽

```bash
maxclients 10000  # 最大客户端连接数（默认10000）
```

- 调整 TCP 参数：优化网络连接稳定性

```bash
# Redis配置文件
tcp_keepalive 300  # 300秒无数据传输时发送心跳包，保持连接
tcp-backlog 511    # TCP连接队列大小，高并发场景增大
```

- 监控网络延迟：通过 `redis-cli --latency` 测试，或通过 Java 代码实现：

```java
import redis.clients.jedis.Jedis;
import java.util.ArrayList;
import java.util.List;

public class RedisLatencyMonitor {
    // 测试Redis网络延迟（单位：毫秒）
    public void testLatency(Jedis jedis, int testCount) {
        List&lt;Double&gt; latencies = new ArrayList<>();
        for (int i = 0; i < testCount; i++) {
            long start = System.nanoTime();
            jedis.ping(); // 发送ping命令测试延迟
            long end = System.nanoTime();
            double latency = (end - start) / 1_000_000.0; // 转换为毫秒
            latencies.add(latency);
        }

        // 计算统计信息
        double min = latencies.stream().min(Double::compare).orElse(0.0);
        double max = latencies.stream().max(Double::compare).orElse(0.0);
        double avg = latencies.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

        System.out.printf("延迟统计（%d次测试）：min=%.3fms, max=%.3fms, avg=%.3fms%n",
                testCount, min, max, avg);
    }

    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            new RedisLatencyMonitor().testLatency(jedis, 100);
        }
    }
}
```

## 八、核心防护原则：从根源规避阻塞

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-29c2cffacd18.png)

Redis 阻塞的本质是 “单线程遇到耗时操作”，结合前文场景，总结 3 条核心防护原则：

### 1. 避免长时间单线程操作

- 禁用 O (n) 高危命令，所有操作尽量控制在 O (1) 或 O (log n) 复杂度
- 大 Key、数据迁移、持久化等耗时操作，通过 “异步化”“分批处理” 拆分

### 2. 全方位监控系统资源

建立完善的监控体系，覆盖：

- 命令层面：`info commandstats`（慢命令）
- 内存层面：`info memory`（内存使用率、碎片率）
- 系统层面：CPU、Swap、网络延迟、磁盘 IO

### 3. 提前规避高危场景

- 制定规范：禁用 `KEYS`、`SAVE` 等危险命令，限制单 Key 大小
- 定期巡检：每周扫描大 Key、慢命令、集群状态
- 配置优化：持久化、内存、网络等配置按生产标准优化，避免 “默认配置” 直接上线

## 总结

Redis 阻塞并非不可避免，核心是理解 “单线程模型” 的限制，针对性规避耗时操作。本文拆解的 7 大场景（O (n) 命令、持久化、大 Key、集群扩容、Swap、CPU 竞争、网络）覆盖了生产环境 99% 的阻塞案例，对应的 Java 优化方案可直接落地。

面试中遇到该问题时，可按 “场景→原因→解决方案” 的逻辑展开，结合本文的实战代码（如 SCAN 遍历、大 Key 拆分、持久化配置），既能体现技术深度，又能展示实战经验，轻松拿捏面试官！

![image](/面试题/高频面试问题/鹏宇老师/1158-redis-blocking-causes-and-optimization/img-cbc03a3eb11f.png)

### 依赖说明

文中 Java 代码基于 Jedis 客户端实现，需引入以下 Maven 依赖：

```xml
&lt;dependency&gt;
    &lt;groupId&gt;redis.clients&lt;/groupId&gt;
    &lt;artifactId&gt;jedis&lt;/artifactId&gt;
    &lt;version&gt;4.4.6&lt;/version&gt; &lt;!-- 推荐使用稳定版 --&gt;
&lt;/dependency&gt;
```
