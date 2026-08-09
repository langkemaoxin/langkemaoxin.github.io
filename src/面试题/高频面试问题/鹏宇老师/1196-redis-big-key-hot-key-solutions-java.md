---
title: "面试官问 Redis Key 怎么拆？Javaer 吃透这篇稳了：大 Key / 热点 Key 破解 + 4 大策略 + 集群实战（附代码）"
sidebarGroup: "鹏宇老师"
shortTitle: "面试官问 Redis Key 怎么拆？Javaer 吃透这篇稳了：大 Key / 热点 Key 破解 + 4 大策略 + 集群实战（附代码）"
order: 1196
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "一、核心问题：为什么必须拆分 Redis Key？1.1 大 Key 问题：体积过大引发的连锁故障大 Key 定义：通常认为String 类型 &gt; 10KB、Hash/List/ZSet 包含元素 &gt; 10000 个的 Key "
article: false
---

> 来源：[面试官问 Redis Key 怎么拆？Javaer 吃透这篇稳了：大 Key / 热点 Key 破解 + 4 大策略 + 集群实战（附代码）](https://www.yuque.com/tulingzhouyu/db22bv/quf705rzffp6afi1)

## 一、核心问题：为什么必须拆分 Redis Key？

### 1.1 大 Key 问题：体积过大引发的连锁故障

大 Key 定义：通常认为**String 类型 > 10KB、Hash/List/ZSet 包含元素 > 10000 个**的 Key 为大 Key，其危害主要体现在 3 个维度：

- **单线程阻塞**：Redis 采用单线程处理命令，大 Key 的读写操作（如`hgetall user:all`、`lrange order:list 0 -1`）会占用大量 CPU 时间，导致后续命令排队等待，甚至引发 “Redis 无响应”。
- **内存风险**：大 Key 集中占用大量内存，过期或主动删除时，Redis 需一次性释放 GB 级内存，可能触发内存重分配，导致服务卡顿 100ms+。
- **网络瓶颈**：大 Key 序列化 / 反序列化耗时（如 1MB 字符串需 10ms + 处理），且传输时占用带宽，导致接口响应延迟从 “毫秒级” 升至 “秒级”。

**对应 PPT 页：大 Key 问题分析**（此处插入 PPT 中 “大 Key 问题” 截图，包含 “单线程阻塞”“内存风险”“网络瓶颈” 模块）

### 1.2 热点 Key 问题：高并发下的单点压力

热点 Key 定义：**每秒访问量 > 1000 次**的 Key（如秒杀库存、热门商品计数器），会导致 Redis 集群负载失衡：

- **集群节点过载**：Redis 集群中，热点 Key 会被路由到固定节点，该节点 CPU / 内存使用率飙升至 90%+，其他节点却处于闲置状态。
- **锁竞争加剧**：若业务中对热点 Key 加分布式锁（如`SETNX stock:lock`），会导致数千线程同时竞争同一把锁，锁等待时间超 500ms，甚至引发超时重试风暴。
- **响应延迟飙升**：单 Key 并发请求排队，Redis 命令响应时间从 2ms 增至 200ms+，最终导致业务接口超时。

**对应 PPT 页：热点 Key 问题分析**（此处插入 PPT 中 “热点 Key 问题” 截图，包含 “集群负载不均”“锁竞争加剧”“响应延迟” 模块）

### 1.3 总结：Key 拆分的本质

Key 拆分是 “分而治之” 思想在 Redis 中的应用：

- 对大 Key：拆分为多个小 Key，降低单个 Key 的体积与操作耗时；
- 对热点 Key：拆分为多个子 Key，分散并发访问压力，利用集群多节点能力分担负载。

## 二、4 大 Key 拆分策略（附 Java 实现）

### 2.1 哈希取模拆分（最常用，适合静态数据）

#### 2.1.1 核心原理

通过对原始 Key 的核心标识（如用户 ID、SKU ID）计算哈希值，再对**拆分份数 N**取模，得到子 Key 索引，实现数据均匀分布。公式：`子Key索引 = hash(核心标识) % 拆分份数N`示例：SKU ID=10076，拆分份数 N=5，计算得`10076%5=1`，子 Key 为`SKU:1:10076`。

**对应 PPT 页：哈希取模拆分原理与示例**（此处插入 PPT 中 “哈希取模拆分” 截图，包含 “原始数据→哈希计算→取模→子 Key” 流程图）

#### 2.1.2 Java 代码实现（Spring Data Redis）

```java
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class SkuHashSplitService {
    private final RedisTemplate<String, Object> redisTemplate;
    // 拆分份数（建议取2的幂，如5/8/16，保证数据均匀分布）
    private static final int SPLIT_COUNT = 5;

    // 构造注入RedisTemplate
    public SkuHashSplitService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 生成子Key：格式为 "SKU:索引:SKU_ID"
     * @param skuId 商品SKU ID
     * @return 子Key
     */
    private String generateSubKey(Long skuId) {
        // 取模计算索引（处理负数哈希值）
        int index = Math.abs(skuId.hashCode()) % SPLIT_COUNT;
        return "SKU:" + index + ":" + skuId;
    }

    /**
     * 存储SKU信息（拆分子Key存储）
     * @param skuId 商品SKU ID
     * @param skuInfo 商品信息（JSON/Map格式）
     */
    public void saveSkuInfo(Long skuId, Object skuInfo) {
        String subKey = generateSubKey(skuId);
        redisTemplate.opsForValue().set(subKey, skuInfo);
        // 可选：设置过期时间（如24小时）
        redisTemplate.expire(subKey, 86400, java.util.concurrent.TimeUnit.SECONDS);
    }

    /**
     * 查询SKU信息（通过子Key定位）
     * @param skuId 商品SKU ID
     * @return 商品信息
     */
    public Object getSkuInfo(Long skuId) {
        String subKey = generateSubKey(skuId);
        return redisTemplate.opsForValue().get(subKey);
    }
}
```

#### 2.1.3 优势与局限

**维度**
**说明**

优势
1. 实现简单，一行代码即可完成子 Key 计算；2. 数据分布均匀（N 为 2 的幂时最优）；3. 查询时可快速定位子 Key

局限
1. 扩缩容时需全量迁移数据（如 N 从 5→6，所有 Key 的取模结果变化）；2. 拆分份数 N 需提前规划，不适合动态调整

典型场景
商品信息存储、用户购物车、库存计数器、固定维度统计数据

### 2.2 时间维度拆分（适合时序数据）

#### 2.2.1 核心原理

按**时间粒度**（秒、分、时、天、月）拆分 Key，每个时间单元对应一个独立子 Key，利用时间属性实现数据的 “分区存储与查询”。示例：系统日志原 Key 为`log:all`，按天拆分为`log:20231010`、`log:20231011`，按小时拆分为`log:20231010:09`、`log:20231010:10`。

**对应 PPT 页：时间维度拆分示例**（此处插入 PPT 中 “时间维度拆分” 截图，包含 “时间序列→按时间拆分→子 Key 集合” 流程图）

#### 2.2.2 Java 伪代码实现

```java
import org.springframework.data.redis.core.RedisTemplate;
import java.text.SimpleDateFormat;
import java.util.Date;

@Component
public class LogTimeSplitService {
    private final RedisTemplate<String, String> redisTemplate;
    // 时间格式（按天拆分：yyyyMMdd；按小时拆分：yyyyMMddHH）
    private static final SimpleDateFormat DAY_FORMAT = new SimpleDateFormat("yyyyMMdd");
    private static final SimpleDateFormat HOUR_FORMAT = new SimpleDateFormat("yyyyMMddHH");

    public LogTimeSplitService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 生成时间维度子Key（支持按天/按小时）
     * @param baseKey 基础Key（如"log"）
     * @param date 日志产生时间
     * @param isHourSplit 是否按小时拆分（true=按小时，false=按天）
     * @return 子Key
     */
    private String generateTimeSubKey(String baseKey, Date date, boolean isHourSplit) {
        String timeSuffix = isHourSplit ? HOUR_FORMAT.format(date) : DAY_FORMAT.format(date);
        return baseKey + ":" + timeSuffix;
    }

    /**
     * 存储日志（按时间拆分）
     * @param logContent 日志内容
     * @param date 日志时间
     * @param isHourSplit 是否按小时拆分
     */
    public void saveLog(String logContent, Date date, boolean isHourSplit) {
        String subKey = generateTimeSubKey("log", date, isHourSplit);
        // 用List存储日志（右推新增日志）
        redisTemplate.opsForList().rightPush(subKey, logContent);
        // 按天拆分的日志设置7天过期（自动清理历史数据）
        if (!isHourSplit) {
            redisTemplate.expire(subKey, 7 * 86400, java.util.concurrent.TimeUnit.SECONDS);
        }
    }

    /**
     * 查询指定时间的日志（如20231010当天的日志）
     * @param date 目标日期
     * @param isHourSplit 是否按小时拆分
     * @return 日志列表
     */
    public java.util.List&lt;String&gt; getLogByDate(Date date, boolean isHourSplit) {
        String subKey = generateTimeSubKey("log", date, isHourSplit);
        // 查询所有日志（lrange 0 -1，大数量时建议分页）
        return redisTemplate.opsForList().range(subKey, 0, -1);
    }
}
```

#### 2.2.3 优势与局限

**维度**
**说明**

优势
1. 便于历史数据归档与清理（设置过期时间自动删除）；2. 查询时可按时间范围精准定位，减少扫描范围；3. 时间粒度可动态调整

局限
1. 仅适用于带时间属性的数据（如日志、统计指标），非时序数据无法使用；2. 时间分布不均可能导致热点（如峰值时段的日志 Key 访问量高）

典型场景
系统操作日志、接口访问统计、用户行为追踪、监控指标（如 CPU 使用率、接口 QPS）

### 2.3 业务维度拆分（适合按属性分类的数据）

#### 2.3.1 核心原理

按**业务固有属性**（地区、用户等级、商品品类等）拆分 Key，每个属性值对应一个独立子 Key，拆分逻辑与业务逻辑强绑定，便于理解与维护。示例：用户信息原 Key 为`user:info`，按地区拆分为`user:info:bj`（北京用户）、`user:info:sh`（上海用户）；商品按品类拆分为`product:elect`（家电）、`product:cloth`（服装）。

**对应 PPT 页：业务维度拆分示例**（此处插入 PPT 中 “业务维度拆分” 截图，包含 “业务数据→业务属性拆分→子 Key” 流程图）

#### 2.3.2 Java 代码实现

```java
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
public class UserBizSplitService {
    private final HashOperations<String, String, Map<String, Object>> hashOps;
    // 业务属性：地区编码（bj=北京，sh=上海，gz=广州）
    private static final String[] REGIONS = {"bj", "sh", "gz"};

    public UserBizSplitService(RedisTemplate<String, Object> redisTemplate) {
        this.hashOps = redisTemplate.opsForHash();
    }

    /**
     * 生成业务维度子Key（按地区拆分）
     * @param userId 用户ID
     * @param region 地区编码（需在REGIONS中）
     * @return 子Key
     */
    private String generateBizSubKey(Long userId, String region) {
        // 校验地区合法性
        if (!java.util.Arrays.asList(REGIONS).contains(region)) {
            throw new IllegalArgumentException("不支持的地区编码：" + region);
        }
        return "user:info:" + region;
    }

    /**
     * 存储用户信息（按地区拆分）
     * @param userId 用户ID
     * @param region 地区编码
     * @param userInfo 用户信息（如name、age、phone）
     */
    public void saveUserByRegion(Long userId, String region, Map<String, Object> userInfo) {
        String subKey = generateBizSubKey(userId, region);
        // 用Hash存储：Key=子Key，HashKey=userId，HashValue=用户信息
        hashOps.put(subKey, userId.toString(), userInfo);
    }

    /**
     * 查询指定地区的用户信息
     * @param region 地区编码
     * @param userId 用户ID
     * @return 用户信息
     */
    public Map<String, Object> getUserByRegion(String region, Long userId) {
        String subKey = generateBizSubKey(userId, region);
        return hashOps.get(subKey, userId.toString());
    }

    /**
     * 查询指定地区的所有用户（批量操作）
     * @param region 地区编码
     * @return 该地区所有用户（Key=userId，Value=用户信息）
     */
    public Map<String, Map<String, Object>> getAllUserByRegion(String region) {
        String subKey = "user:info:" + region;
        return hashOps.entries(subKey);
    }
}
```

#### 2.3.3 优势与局限

**维度**
**说明**

优势
1. 拆分规则与业务逻辑一致，易于理解和维护；2. 可针对不同业务维度单独扩展（如北京用户增多时，单独扩容对应子 Key 的存储）；3. 批量查询效率高（如查询某地区所有用户）

局限
1. 依赖业务属性分布均匀性，若某属性值数据过多（如北京用户占比 60%），会导致子 Key 倾斜；2. 业务属性变更时需调整拆分策略（如新增 “深圳” 地区）

典型场景
地区化用户数据、分级商品（VIP 商品 / 普通商品）、分类订单（线上订单 / 线下订单）

### 2.4 一致性哈希拆分（适合动态扩缩容场景）

#### 2.4.1 核心原理

1. **构建哈希环**：定义哈希值范围为`0 ~ 2^32 - 1`，将该范围首尾相连形成闭合 “哈希环”；
2. **节点映射**：将 Redis 子 Key 和集群节点通过哈希算法（如 CRC32）映射到哈希环上；
3. **Key 定位**：子 Key 映射到哈希环后，顺时针找到最近的节点，即为存储目标；
4. **虚拟节点**：为解决 “节点过少导致数据倾斜”，给每个物理节点生成多个虚拟节点（如 1 个物理子节点对应 5 个虚拟节点），分散到哈希环上。

**对应 PPT 页：一致性哈希拆分原理**（此处插入 PPT 中 “一致性哈希拆分” 截图，包含 “哈希环 + 节点 + Key 映射” 图示）

#### 2.4.2 Java 伪代码实现（基于 Guava 一致性哈希工具）

```java
import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
public class ConsistentHashSplitService {
    private final RedisTemplate<String, Object> redisTemplate;
    // 哈希函数（CRC32）
    private final HashFunction hashFunction = Hashing.crc32();
    // 物理子Key列表（如"user:sub:0"~"user:sub:4"）
    private final List&lt;String&gt; physicalSubKeys = new ArrayList<>();
    // 虚拟节点映射：Key=虚拟节点哈希值，Value=物理子Key
    private final SortedMap<Long, String> virtualNodeMap = new TreeMap<>();
    // 每个物理子Key对应的虚拟节点数量（建议5~10个）
    private static final int VIRTUAL_NODE_COUNT = 5;

    public ConsistentHashSplitService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
        // 初始化物理子Key（5个）
        for (int i = 0; i < 5; i++) {
            physicalSubKeys.add("user:sub:" + i);
        }
        // 初始化虚拟节点
        initVirtualNodes();
    }

    /**
     * 初始化虚拟节点：将物理子Key映射为多个虚拟节点，存入SortedMap
     */
    private void initVirtualNodes() {
        for (String physicalKey : physicalSubKeys) {
            for (int i = 0; i < VIRTUAL_NODE_COUNT; i++) {
                // 虚拟节点名称：物理子Key + 虚拟节点索引
                String virtualNodeName = physicalKey + ":" + i;
                // 计算虚拟节点的哈希值
                long virtualNodeHash = hashFunction.hashString(virtualNodeName, StandardCharsets.UTF_8).asLong();
                // 存入SortedMap（按哈希值排序，便于后续顺时针查找）
                virtualNodeMap.put(virtualNodeHash, physicalKey);
            }
        }
    }

    /**
     * 根据原始Key找到对应的物理子Key
     * @param originalKey 原始Key（如"user:10086"）
     * @return 物理子Key
     */
    private String getPhysicalSubKey(String originalKey) {
        // 计算原始Key的哈希值
        long originalKeyHash = hashFunction.hashString(originalKey, StandardCharsets.UTF_8).asLong();
        // 1. 找到哈希环上大于等于原始Key哈希值的所有虚拟节点
        SortedMap<Long, String> tailMap = virtualNodeMap.tailMap(originalKeyHash);
        // 2. 若有匹配的虚拟节点，取第一个；若无，取哈希环的第一个虚拟节点（循环查找）
        Long virtualNodeHash = tailMap.isEmpty() ? virtualNodeMap.firstKey() : tailMap.firstKey();
        // 3. 返回对应的物理子Key
        return virtualNodeMap.get(virtualNodeHash);
    }

    /**
     * 存储数据（一致性哈希拆分）
     * @param originalKey 原始Key
     * @param data 数据
     */
    public void saveData(String originalKey, Object data) {
        String physicalKey = getPhysicalSubKey(originalKey);
        redisTemplate.opsForValue().set(physicalKey + ":" + originalKey, data);
    }

    /**
     * 查询数据
     * @param originalKey 原始Key
     * @return 数据
     */
    public Object getData(String originalKey) {
        String physicalKey = getPhysicalSubKey(originalKey);
        return redisTemplate.opsForValue().get(physicalKey + ":" + originalKey);
    }

    /**
     * 新增物理子Key（扩缩容时调用）
     * @param newPhysicalKey 新物理子Key
     */
    public void addPhysicalSubKey(String newPhysicalKey) {
        physicalSubKeys.add(newPhysicalKey);
        // 新增对应的虚拟节点
        for (int i = 0; i < VIRTUAL_NODE_COUNT; i++) {
            String virtualNodeName = newPhysicalKey + ":" + i;
            long virtualNodeHash = hashFunction.hashString(virtualNodeName, StandardCharsets.UTF_8).asLong();
            virtualNodeMap.put(virtualNodeHash, newPhysicalKey);
        }
    }
}
```

#### 2.4.3 优势与局限

**维度**
**说明**

优势
1. 扩缩容时仅迁移少量数据（如新增 1 个物理子 Key，仅迁移 “新增子 Key 与前一个子 Key 之间” 的 Key）；2. 支持动态集群调整，适合云原生弹性伸缩场景；3. 虚拟节点可避免数据倾斜

局限
1. 实现复杂度高，需维护虚拟节点映射与哈希环；2. 数据分布均匀性依赖虚拟节点数量（数量过少仍可能倾斜）；3. 查询时需多一次虚拟节点查找，性能略低于哈希取模

典型场景
动态扩缩容的 Redis 集群（如客户端分片）、分布式存储系统（如 Cassandra）、云原生环境下的弹性缓存

## 三、集群落地：拆分后的 Key 如何分配到节点？

### 3.1 核心机制：哈希槽（Hash Slot）

Redis 集群预先定义**16384 个哈希槽**（编号 0~16383），通过 “Key→哈希槽→节点” 的映射关系，实现子 Key 的分布式存储：

1. **Key→哈希槽**：对每个子 Key 计算`CRC16(key) % 16384`，结果即为该 Key 所属的哈希槽；
2. **哈希槽→节点**：集群中每个节点负责一部分哈希槽（如 3 节点集群，节点 A 负责 0~5460、节点 B 负责 5461~10922、节点 C 负责 10923~16383）；
3. **客户端路由**：Java 客户端（如 Lettuce、Jedis）会自动获取集群拓扑，根据子 Key 的哈希槽路由到对应节点，无需手动指定。

**对应 PPT 页：哈希槽分配机制**（此处插入 PPT 中 “Key→哈希槽→节点” 流程图及节点槽分配示例截图）

### 3.2 集群扩缩容：哈希槽自动迁移

当集群新增 / 下线节点时，Redis 会自动调整哈希槽分配：

- **新增节点**：从现有节点中 “匀出” 部分哈希槽分配给新节点，子 Key 随哈希槽自动迁移；
- **下线节点**：将该节点的哈希槽分配给其他存活节点，子 Key 同步迁移，保证数据不丢失。

示例：3 节点集群新增节点 D，集群会将节点 A 的 0~1000 号槽、节点 B 的 5461~6000 号槽迁移到 D，迁移过程中服务不中断，客户端自动感知槽的新归属。

### 3.3 Java 集群配置示例（Spring Boot）

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisClusterConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import java.util.Arrays;

@Configuration
public class RedisClusterConfig {

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        // 1. 配置集群节点地址（IP:端口）
        RedisClusterConfiguration clusterConfig = new RedisClusterConfiguration(
                Arrays.asList("192.168.1.101:6379", "192.168.1.102:6379", "192.168.1.103:6379")
        );
        // 2. 配置最大重定向次数（集群路由时的重试次数）
        clusterConfig.setMaxRedirects(3);
        // 3. 初始化Lettuce连接工厂（支持集群模式）
        LettuceConnectionFactory factory = new LettuceConnectionFactory(clusterConfig);
        factory.afterPropertiesSet();
        return factory;
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(LettuceConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        // 4. 配置序列化器（避免Key/Value乱码）
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }
}
```

## 四、拆分注意事项（实战 & 面试重点）

### 4.1 聚合查询优化

拆分后查询全量数据需聚合多个子 Key（如查询所有地区的用户），可通过以下方式优化：

- **预聚合**：非实时场景下，用定时任务（如 Quartz）将子 Key 数据聚合到 “总 Key”（如`user:info:total`），查询时直接读总 Key；
- **分页聚合**：实时场景下，按分页范围聚合对应子 Key（如查询第 1 页用户，仅聚合前 2 个物理子 Key）；
- **Pipeline 批量查询**：用 Redis Pipeline 减少多 Key 查询的网络往返次数（如批量查询 5 个子 Key，仅需 1 次网络请求）。

### 4.2 数据一致性保证

- **原子操作**：对单个子 Key 的更新需用 Redis 原子命令（如`DECR`库存、`HSETNX`新增 Hash 字段），避免分布式事务；
- **回滚机制**：若操作失败（如库存扣减后发现超卖），需用原子命令回滚（如`INCR`恢复库存）；
- **过期时间统一**：同一原始 Key 拆分的子 Key 需设置相同的过期时间，避免部分子 Key 过期导致数据不一致。

### 4.3 拆分粒度选择

拆分粒度（子 Key 数量）需平衡 “分散效果” 与 “聚合成本”：

- **粒度太小**（如 2 个子 Key）：分散效果差，仍可能出现大 Key / 热点 Key；
- **粒度太大**（如 1000 个子 Key）：聚合查询时需访问大量子 Key，网络开销高；
- **推荐粒度**：根据数据量和并发量选择`2^n`（如 16、32、64），兼顾分散均匀性与聚合效率。

## 五、面试高频问题与解答

### Q1：如何检测 Redis 中的大 Key 和热点 Key？

- **大 Key 检测**：

1. 用 Redis 自带命令：`redis-cli --bigkeys`（扫描所有 Key，统计各类型 Key 的最大体积）、`MEMORY USAGE key`（查看单个 Key 的内存占用）；
2. 用监控工具：Redis Insight、Prometheus+Grafana（配置大 Key 告警阈值）。

- **热点 Key 检测**：

1. 用 Redis 命令：`INFO commandstats`（统计各 Key 的命令执行次数）；
2. 用业务日志：分析接口调用日志，统计访问频率高的 Key；
3. 用第三方工具：Redis Cluster 的`CLUSTER NODES`（查看各节点的 Key 访问量）。

### Q2：哈希取模拆分和一致性哈希拆分的核心区别是什么？

- **依赖条件**：哈希取模依赖 “固定拆分份数 N”，一致性哈希不依赖固定 N；
- **扩缩容迁移**：哈希取模需全量迁移数据，一致性哈希仅迁移少量数据；
- **实现复杂度**：哈希取模极简（一行代码），一致性哈希需维护哈希环与虚拟节点；
- **适用场景**：哈希取模适合静态场景（如固定库存拆分），一致性哈希适合动态扩缩容场景。

### Q3：Redis 集群中，拆分后的 Key 为什么能分散压力？

因为子 Key 通过`CRC16(key) % 16384`映射到 16384 个哈希槽，集群节点均匀分配这些哈希槽，子 Key 随哈希槽分散到不同节点，避免单个节点承载所有请求压力。

### Q4：跨哈希槽操作有什么限制？如何解决？

- **限制**：Redis 集群不支持跨哈希槽的原子操作（如`MSET`操作多个不同槽的 Key、`MULTI/EXEC`事务包含多个不同槽的 Key）；
- **解决方式**：

1. 批量查询用 Pipeline 减少网络往返，放弃跨槽原子性；
2. 业务层补偿：若部分 Key 操作失败，通过重试或日志记录后续处理；
3. 避免跨槽设计：若需原子操作，确保所有 Key 落在同一哈希槽（不推荐，会失去分散意义）。

## 六、总结

Redis Key 拆分是解决大 Key 和热点 Key 问题的核心手段，Java 开发者需掌握 “4 大拆分策略” 的适用场景与实现逻辑，理解 “哈希槽机制” 在集群中的作用，同时结合实战注意事项（如聚合优化、一致性保证），才能在面试中脱颖而出，在项目中落地高效的 Redis 缓存方案。
