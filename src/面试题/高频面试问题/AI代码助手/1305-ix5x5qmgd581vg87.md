---
title: "缓存一致性解决方案 - 技术实现文档"
sidebarGroup: "AI代码助手"
shortTitle: "缓存一致性解决方案 - 技术实现文档"
order: 1305
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "缓存一致性解决方案 - 技术实现文档📋 目录方案一：先删缓存再更新数据库（不推荐）方案二：先更新数据库再删缓存（基础方案）方案三：延迟双删方案四：异步重试+消息队列方案五：Canal订阅Binlog（生产推荐）读写分离场景处理完整工程实践"
article: false
---

> 来源：[缓存一致性解决方案 - 技术实现文档](https://www.yuque.com/tulingzhouyu/db22bv/ix5x5qmgd581vg87)

# 缓存一致性解决方案 - 技术实现文档

## 📋 目录

- 方案一：先删缓存再更新数据库（不推荐）
- 方案二：先更新数据库再删缓存（基础方案）
- 方案三：延迟双删
- 方案四：异步重试+消息队列
- 方案五：Canal订阅Binlog（生产推荐）
- 读写分离场景处理
- 完整工程实践

---

## 方案一：先删缓存再更新数据库（❌不推荐）

### 实现代码

```java
@Service
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    /**
     * 方案一：先删缓存，再更新数据库
     * 问题：高并发下容易产生脏数据
     */
    @Transactional
    public void updateUser(User user) {
        String cacheKey = "user:" + user.getId();
        
        // 1. 先删除缓存
        redisTemplate.delete(cacheKey);
        
        // 2. 更新数据库
        userMapper.updateById(user);
        
        // 问题：在步骤1和2之间，如果有查询请求，会读取旧数据并写回缓存
    }
    
    public User getUser(Long userId) {
        String cacheKey = "user:" + userId;
        
        // 先查缓存
        User user = (User) redisTemplate.opsForValue().get(cacheKey);
        if (user != null) {
            return user;
        }
        
        // 缓存没有，查数据库
        user = userMapper.selectById(userId);
        if (user != null) {
            // 写回缓存
            redisTemplate.opsForValue().set(cacheKey, user, 30, TimeUnit.MINUTES);
        }
        return user;
    }
}
```

### 并发问题演示

```java
// 时间线示例
// T1: 线程A删除缓存
// T2: 线程B查询，缓存miss，查数据库得到旧数据（value=100）
// T3: 线程A更新数据库（value=200）
// T4: 线程B把旧数据写回缓存（value=100）
// 结果：数据库是200，缓存是100，不一致！
```

---

## 方案二：先更新数据库再删缓存（⭐基础推荐）

### 实现代码

```java
@Service
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    /**
     * 方案二：先更新数据库，再删除缓存
     * 优点：不一致概率极低
     * 缺点：极端情况仍可能不一致
     */
    @Transactional
    public void updateUser(User user) {
        String cacheKey = "user:" + user.getId();
        
        // 1. 先更新数据库
        userMapper.updateById(user);
        
        // 2. 再删除缓存
        redisTemplate.delete(cacheKey);
    }
    
    public User getUser(Long userId) {
        String cacheKey = "user:" + userId;
        
        // 查询缓存
        User user = (User) redisTemplate.opsForValue().get(cacheKey);
        if (user != null) {
            return user;
        }
        
        // 缓存未命中，查数据库
        user = userMapper.selectById(userId);
        if (user != null) {
            redisTemplate.opsForValue().set(cacheKey, user, 30, TimeUnit.MINUTES);
        }
        return user;
    }
}
```

### 为什么比方案一好？

```java
/**
 * 极端并发场景分析：
 * T1: 线程A查询，缓存miss，查数据库（旧数据）
 * T2: 线程B更新数据库（新数据）
 * T3: 线程B删除缓存
 * T4: 线程A把旧数据写回缓存
 * 
 * 为什么概率低？
 * - 写数据库（T2）通常比读数据库（T1）慢
 * - 实际上T4大概率在T3之前就完成了
 * - 但极端情况下仍可能发生
 */
```

---

## 方案三：延迟双删

### 核心实现

```java
@Service
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private ThreadPoolExecutor asyncExecutor;
    
    /**
     * 方案三：延迟双删
     * 步骤：删缓存 -> 更新DB -> 延迟 -> 再删缓存
     */
    @Transactional
    public void updateUser(User user) {
        String cacheKey = "user:" + user.getId();
        
        // 第一次删除缓存
        redisTemplate.delete(cacheKey);
        
        // 更新数据库
        userMapper.updateById(user);
        
        // 延迟后再次删除缓存（异步执行）
        asyncExecutor.execute(() -> {
            try {
                // 延迟时间根据业务场景调整（500ms-1s）
                Thread.sleep(500);
                redisTemplate.delete(cacheKey);
                log.info("延迟双删：第二次删除缓存成功, key={}", cacheKey);
            } catch (InterruptedException e) {
                log.error("延迟双删失败", e);
                Thread.currentThread().interrupt();
            }
        });
    }
}
```

### 线程池配置

```java
@Configuration
public class ThreadPoolConfig {
    
    @Bean("asyncExecutor")
    public ThreadPoolExecutor asyncExecutor() {
        return new ThreadPoolExecutor(
            5,                      // 核心线程数
            10,                     // 最大线程数
            60L,                    // 空闲线程存活时间
            TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(1000),  // 队列容量
            new ThreadFactoryBuilder()
                .setNameFormat("cache-delete-%d")
                .build(),
            new ThreadPoolExecutor.CallerRunsPolicy()  // 拒绝策略
        );
    }
}
```

### 延迟时间如何确定？

```java
/**
 * 延迟时间评估方法：
 * 1. 测量读数据库的平均响应时间（如：100ms）
 * 2. 测量写缓存的平均响应时间（如：10ms）
 * 3. 加上网络抖动的容忍时间（如：200ms）
 * 4. 最终延迟时间 = 100 + 10 + 200 = 310ms，可设置为 500ms
 * 
 * 注意：
 * - 不同业务场景差异很大
 * - 需要通过监控和压测来调优
 * - 过长影响性能，过短无法清除脏数据
 */
```

---

## 方案四：异步重试+消息队列

### 架构图

```plain
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌─────────┐
│ 更新DB  │ -> │ 发MQ消息 │ -> │  Kafka  │ -> │ 删缓存  │
└─────────┘    └──────────┘    └─────────┘    └─────────┘
                                      ↓
                                 ┌─────────┐
                                 │ 重试机制 │
                                 └─────────┘
```

### 依赖配置

```xml
&lt;!-- pom.xml --&gt;
&lt;dependencies&gt;
    &lt;!-- Spring Kafka --&gt;
    &lt;dependency&gt;
        &lt;groupId&gt;org.springframework.kafka&lt;/groupId&gt;
        &lt;artifactId&gt;spring-kafka&lt;/artifactId&gt;
    &lt;/dependency&gt;
    
    &lt;!-- Redis --&gt;
    &lt;dependency&gt;
        &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
        &lt;artifactId&gt;spring-boot-starter-data-redis&lt;/artifactId&gt;
    &lt;/dependency&gt;
&lt;/dependencies&gt;
```

### Kafka配置

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      # 消息发送失败重试次数
      retries: 3
      # 消息确认机制（all表示所有副本都确认）
      acks: all
    consumer:
      group-id: cache-delete-group
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      # 手动提交offset
      enable-auto-commit: false
      properties:
        spring.json.trusted.packages: "*"
```

### 消息实体类

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CacheDeleteMessage {
    private String cacheKey;
    private Long timestamp;
    private String bizType;  // 业务类型
    private Integer retryCount;  // 重试次数
}
```

### 生产者（更新数据时发送消息）

```java
@Service
@Slf4j
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private KafkaTemplate<String, CacheDeleteMessage> kafkaTemplate;
    
    private static final String CACHE_DELETE_TOPIC = "cache-delete-topic";
    
    @Transactional
    public void updateUser(User user) {
        String cacheKey = "user:" + user.getId();
        
        // 1. 先删除缓存（立即删除）
        redisTemplate.delete(cacheKey);
        
        // 2. 更新数据库
        userMapper.updateById(user);
        
        // 3. 发送延迟删除消息到Kafka
        CacheDeleteMessage message = new CacheDeleteMessage(
            cacheKey,
            System.currentTimeMillis(),
            "USER",
            0
        );
        
        kafkaTemplate.send(CACHE_DELETE_TOPIC, cacheKey, message)
            .addCallback(
                success -> log.info("消息发送成功: {}", cacheKey),
                failure -> log.error("消息发送失败: {}", cacheKey, failure)
            );
    }
}
```

### 消费者（接收消息并删除缓存）

```java
@Component
@Slf4j
public class CacheDeleteConsumer {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private KafkaTemplate<String, CacheDeleteMessage> kafkaTemplate;
    
    private static final String CACHE_DELETE_TOPIC = "cache-delete-topic";
    private static final Integer MAX_RETRY_COUNT = 3;
    
    @KafkaListener(topics = CACHE_DELETE_TOPIC, groupId = "cache-delete-group")
    public void consumeCacheDelete(ConsumerRecord<String, CacheDeleteMessage> record,
                                   Acknowledgment ack) {
        CacheDeleteMessage message = record.value();
        String cacheKey = message.getCacheKey();
        
        try {
            // 延迟500ms后删除缓存
            Thread.sleep(500);
            
            // 删除缓存
            Boolean deleted = redisTemplate.delete(cacheKey);
            
            if (Boolean.TRUE.equals(deleted)) {
                log.info("缓存删除成功: key={}, retryCount={}", cacheKey, message.getRetryCount());
                // 手动提交offset
                ack.acknowledge();
            } else {
                // 删除失败，进行重试
                handleDeleteFailure(message, ack);
            }
            
        } catch (Exception e) {
            log.error("缓存删除异常: key={}", cacheKey, e);
            handleDeleteFailure(message, ack);
        }
    }
    
    /**
     * 处理删除失败的情况
     */
    private void handleDeleteFailure(CacheDeleteMessage message, Acknowledgment ack) {
        if (message.getRetryCount() < MAX_RETRY_COUNT) {
            // 增加重试次数
            message.setRetryCount(message.getRetryCount() + 1);
            message.setTimestamp(System.currentTimeMillis());
            
            // 重新发送消息
            kafkaTemplate.send(CACHE_DELETE_TOPIC, message.getCacheKey(), message);
            log.warn("缓存删除失败，重试第{}次: key={}", message.getRetryCount(), message.getCacheKey());
            
            // 提交offset（避免重复消费当前消息）
            ack.acknowledge();
        } else {
            log.error("缓存删除失败，已达最大重试次数: key={}", message.getCacheKey());
            // 可以发送到死信队列或告警
            // 仍然提交offset，避免阻塞后续消息
            ack.acknowledge();
        }
    }
}
```

### 死信队列配置（可选）

```java
@Configuration
public class KafkaConfig {
    
    @Bean
    public KafkaTemplate<String, CacheDeleteMessage> kafkaTemplate(
            ProducerFactory<String, CacheDeleteMessage> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }
    
    /**
     * 死信队列配置
     */
    @Bean
    public NewTopic deadLetterTopic() {
        return TopicBuilder
            .name("cache-delete-dlq")
            .partitions(3)
            .replicas(2)
            .build();
    }
}

@Component
@Slf4j
public class DeadLetterConsumer {
    
    @KafkaListener(topics = "cache-delete-dlq", groupId = "cache-delete-dlq-group")
    public void handleDeadLetter(ConsumerRecord<String, CacheDeleteMessage> record) {
        CacheDeleteMessage message = record.value();
        log.error("死信队列消息: key={}, retryCount={}", 
            message.getCacheKey(), message.getRetryCount());
        
        // 发送告警、记录日志、人工处理等
        // 可以发送到监控系统或告警平台
    }
}
```

---

## 方案五：Canal订阅Binlog（🏆生产推荐）

### 整体架构

```plain
┌─────────┐    ┌─────────┐    ┌────────┐    ┌────────┐    ┌─────────┐
│ 应用层  │ -> │ MySQL   │ -> │ Binlog │ -> │ Canal  │ -> │  Kafka  │
│更新数据 │    │ 主库    │    │        │    │ Server │    │         │
└─────────┘    └─────────┘    └────────┘    └────────┘    └─────────┘
                                                                 ↓
                                                           ┌─────────┐
                                                           │ 消费者  │
                                                           │删除缓存 │
                                                           └─────────┘
```

### 1. MySQL配置（开启Binlog）

```bash
# /etc/my.cnf
[mysqld]
# 开启binlog
log-bin=mysql-bin
# binlog格式设置为ROW（必须）
binlog-format=ROW
# server-id（集群中唯一）
server-id=1
# 指定需要记录binlog的数据库
binlog-do-db=your_database
```

```sql
-- 创建Canal用户并授权
CREATE USER 'canal'@'%' IDENTIFIED BY 'canal123';
GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'canal'@'%';
FLUSH PRIVILEGES;

-- 查看binlog是否开启
SHOW VARIABLES LIKE 'log_bin';
-- 查看binlog格式
SHOW VARIABLES LIKE 'binlog_format';
```

### 2. Canal Server 部署

#### Docker方式部署

```bash
# 拉取Canal镜像
docker pull canal/canal-server:latest

# 启动Canal Server
docker run -d \
  --name canal-server \
  -p 11111:11111 \
  -e canal.instance.master.address=mysql_host:3306 \
  -e canal.instance.dbUsername=canal \
  -e canal.instance.dbPassword=canal123 \
  -e canal.instance.connectionCharset=UTF-8 \
  -e canal.instance.filter.regex=.*\\..* \
  canal/canal-server:latest
```

#### Canal配置文件（canal.properties）

```properties
# Canal Server配置
canal.port = 11111
canal.zkServers = localhost:2181

# instance配置
canal.destinations = example
canal.instance.example.master.address = 127.0.0.1:3306
canal.instance.example.dbUsername = canal
canal.instance.example.dbPassword = canal123
canal.instance.example.connectionCharset = UTF-8

# binlog过滤规则（订阅哪些表）
canal.instance.filter.regex = your_database\\.user,your_database\\.order
# 或者订阅所有表
# canal.instance.filter.regex = .*\\..*
```

### 3. Spring Boot集成Canal

#### 依赖配置

```xml
&lt;!-- pom.xml --&gt;
&lt;dependencies&gt;
    &lt;!-- Canal Client --&gt;
    &lt;dependency&gt;
        &lt;groupId&gt;com.alibaba.otter&lt;/groupId&gt;
        &lt;artifactId&gt;canal.client&lt;/artifactId&gt;
        &lt;version&gt;1.1.6&lt;/version&gt;
    &lt;/dependency&gt;
    
    &lt;!-- Kafka --&gt;
    &lt;dependency&gt;
        &lt;groupId&gt;org.springframework.kafka&lt;/groupId&gt;
        &lt;artifactId&gt;spring-kafka&lt;/artifactId&gt;
    &lt;/dependency&gt;
    
    &lt;!-- Redis --&gt;
    &lt;dependency&gt;
        &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
        &lt;artifactId&gt;spring-boot-starter-data-redis&lt;/artifactId&gt;
    &lt;/dependency&gt;
&lt;/dependencies&gt;
```

#### Canal配置类

```java
@Configuration
public class CanalConfig {
    
    @Value("${canal.server.host:127.0.0.1}")
    private String canalHost;
    
    @Value("${canal.server.port:11111}")
    private Integer canalPort;
    
    @Value("${canal.destination:example}")
    private String destination;
    
    @Bean
    public CanalConnector canalConnector() {
        return CanalConnectors.newSingleConnector(
            new InetSocketAddress(canalHost, canalPort),
            destination,
            "",  // username
            ""   // password
        );
    }
}
```

#### Canal监听器

```java
@Component
@Slf4j
public class CanalClient implements InitializingBean, DisposableBean {
    
    @Autowired
    private CanalConnector canalConnector;
    
    @Autowired
    private KafkaTemplate<String, BinlogMessage> kafkaTemplate;
    
    private static final String BINLOG_TOPIC = "binlog-change-topic";
    
    private volatile boolean running = false;
    private Thread workThread;
    
    @Override
    public void afterPropertiesSet() {
        // 启动Canal监听
        workThread = new Thread(this::process);
        workThread.setName("canal-client-thread");
        running = true;
        workThread.start();
        log.info("Canal客户端启动成功");
    }
    
    /**
     * 处理binlog数据
     */
    private void process() {
        int batchSize = 1000;
        
        try {
            canalConnector.connect();
            canalConnector.subscribe(".*\\..*");  // 订阅所有表
            canalConnector.rollback();
            
            while (running) {
                // 获取指定数量的数据
                Message message = canalConnector.getWithoutAck(batchSize);
                long batchId = message.getId();
                int size = message.getEntries().size();
                
                if (batchId == -1 || size == 0) {
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                } else {
                    handleEntry(message.getEntries());
                }
                
                // 提交确认
                canalConnector.ack(batchId);
            }
        } catch (Exception e) {
            log.error("Canal处理异常", e);
        } finally {
            canalConnector.disconnect();
        }
    }
    
    /**
     * 处理binlog条目
     */
    private void handleEntry(List&lt;Entry&gt; entries) {
        for (Entry entry : entries) {
            if (entry.getEntryType() != EntryType.ROWDATA) {
                continue;
            }
            
            try {
                RowChange rowChange = RowChange.parseFrom(entry.getStoreValue());
                EventType eventType = rowChange.getEventType();
                
                // 只处理INSERT、UPDATE、DELETE事件
                if (eventType == EventType.INSERT || 
                    eventType == EventType.UPDATE || 
                    eventType == EventType.DELETE) {
                    
                    String tableName = entry.getHeader().getTableName();
                    String database = entry.getHeader().getSchemaName();
                    
                    for (RowData rowData : rowChange.getRowDatasList()) {
                        handleRowChange(database, tableName, eventType, rowData);
                    }
                }
            } catch (Exception e) {
                log.error("解析binlog失败", e);
            }
        }
    }
    
    /**
     * 处理行数据变更
     */
    private void handleRowChange(String database, String tableName, 
                                 EventType eventType, RowData rowData) {
        // 获取主键ID（用于构造缓存key）
        String primaryKey = getPrimaryKey(rowData, eventType);
        
        if (primaryKey == null) {
            return;
        }
        
        // 构造缓存key
        String cacheKey = buildCacheKey(tableName, primaryKey);
        
        // 发送消息到Kafka
        BinlogMessage message = BinlogMessage.builder()
            .database(database)
            .table(tableName)
            .eventType(eventType.name())
            .cacheKey(cacheKey)
            .timestamp(System.currentTimeMillis())
            .build();
        
        kafkaTemplate.send(BINLOG_TOPIC, cacheKey, message);
        
        log.info("Binlog变更事件: database={}, table={}, eventType={}, cacheKey={}", 
            database, tableName, eventType, cacheKey);
    }
    
    /**
     * 获取主键值
     */
    private String getPrimaryKey(RowData rowData, EventType eventType) {
        List&lt;Column&gt; columns = eventType == EventType.DELETE 
            ? rowData.getBeforeColumnsList() 
            : rowData.getAfterColumnsList();
        
        for (Column column : columns) {
            if (column.getIsKey()) {
                return column.getValue();
            }
        }
        return null;
    }
    
    /**
     * 构造缓存key
     */
    private String buildCacheKey(String tableName, String primaryKey) {
        return tableName + ":" + primaryKey;
    }
    
    @Override
    public void destroy() {
        running = false;
        if (workThread != null) {
            workThread.interrupt();
        }
        log.info("Canal客户端关闭");
    }
}
```

#### Binlog消息实体

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BinlogMessage {
    private String database;
    private String table;
    private String eventType;  // INSERT/UPDATE/DELETE
    private String cacheKey;
    private Long timestamp;
}
```

#### Kafka消费者（删除缓存）

```java
@Component
@Slf4j
public class BinlogCacheConsumer {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    private static final String BINLOG_TOPIC = "binlog-change-topic";
    
    @KafkaListener(topics = BINLOG_TOPIC, groupId = "binlog-cache-group")
    public void handleBinlogChange(ConsumerRecord<String, BinlogMessage> record,
                                   Acknowledgment ack) {
        BinlogMessage message = record.value();
        String cacheKey = message.getCacheKey();
        
        try {
            // 根据事件类型处理
            switch (message.getEventType()) {
                case "INSERT":
                case "UPDATE":
                case "DELETE":
                    // 删除缓存
                    Boolean deleted = redisTemplate.delete(cacheKey);
                    log.info("Canal触发缓存删除: table={}, eventType={}, cacheKey={}, result={}", 
                        message.getTable(), message.getEventType(), cacheKey, deleted);
                    break;
                default:
                    log.warn("未知事件类型: {}", message.getEventType());
            }
            
            // 手动提交offset
            ack.acknowledge();
            
        } catch (Exception e) {
            log.error("处理binlog消息失败: cacheKey={}", cacheKey, e);
            // 这里可以选择重试或者发送到死信队列
            ack.acknowledge();
        }
    }
}
```

### 4. Canal高可用部署（可选）

```yaml
# 使用Canal集群模式（基于ZooKeeper）
canal:
  destinations:
    - name: example
      # 使用集群模式
      mode: cluster
      zookeeper:
        servers: zk1:2181,zk2:2181,zk3:2181
      # HA配置
      ha:
        enable: true
```

---

## 读写分离场景处理

### 问题场景

```java
/**
 * 读写分离导致的缓存不一致：
 * 
 * 1. 更新主库，删除缓存
 * 2. 查询请求查从库（主从延迟，从库还是旧数据）
 * 3. 旧数据写回缓存
 * 4. 主从同步完成
 * 
 * 结果：缓存是旧数据，数据库是新数据
 */
```

### 解决方案一：强制读主库

```java
@Service
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    // 用于标记是否强制读主库
    private static final ThreadLocal&lt;Boolean&gt; FORCE_MASTER = new ThreadLocal<>();
    
    @Transactional
    public void updateUser(User user) {
        String cacheKey = "user:" + user.getId();
        
        // 更新数据库
        userMapper.updateById(user);
        
        // 删除缓存
        redisTemplate.delete(cacheKey);
        
        // 设置短时间内强制读主库的标记
        String forceReadMasterKey = "force_master:" + user.getId();
        redisTemplate.opsForValue().set(forceReadMasterKey, "1", 1, TimeUnit.SECONDS);
    }
    
    public User getUser(Long userId) {
        String cacheKey = "user:" + userId;
        String forceReadMasterKey = "force_master:" + userId;
        
        // 查缓存
        User user = (User) redisTemplate.opsForValue().get(cacheKey);
        if (user != null) {
            return user;
        }
        
        // 检查是否需要强制读主库
        Boolean forceMaster = redisTemplate.hasKey(forceReadMasterKey);
        
        if (Boolean.TRUE.equals(forceMaster)) {
            // 强制读主库
            FORCE_MASTER.set(true);
            try {
                user = userMapper.selectById(userId);
            } finally {
                FORCE_MASTER.remove();
            }
        } else {
            // 正常读从库
            user = userMapper.selectById(userId);
        }
        
        // 写回缓存
        if (user != null) {
            redisTemplate.opsForValue().set(cacheKey, user, 30, TimeUnit.MINUTES);
        }
        
        return user;
    }
}
```

### MyBatis动态数据源配置

```java
@Configuration
public class DataSourceConfig {
    
    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.master")
    public DataSource masterDataSource() {
        return DataSourceBuilder.create().build();
    }
    
    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.slave")
    public DataSource slaveDataSource() {
        return DataSourceBuilder.create().build();
    }
    
    @Bean
    public DataSource dynamicDataSource() {
        DynamicDataSource dynamicDataSource = new DynamicDataSource();
        
        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put("master", masterDataSource());
        targetDataSources.put("slave", slaveDataSource());
        
        dynamicDataSource.setTargetDataSources(targetDataSources);
        dynamicDataSource.setDefaultTargetDataSource(masterDataSource());
        
        return dynamicDataSource;
    }
}

public class DynamicDataSource extends AbstractRoutingDataSource {
    
    private static final ThreadLocal&lt;String&gt; CONTEXT_HOLDER = new ThreadLocal<>();
    
    @Override
    protected Object determineCurrentLookupKey() {
        return getDataSource();
    }
    
    public static void setDataSource(String dataSource) {
        CONTEXT_HOLDER.set(dataSource);
    }
    
    public static String getDataSource() {
        return CONTEXT_HOLDER.get() == null ? "slave" : CONTEXT_HOLDER.get();
    }
    
    public static void clearDataSource() {
        CONTEXT_HOLDER.remove();
    }
}
```

### AOP拦截器（自动切换数据源）

```java
@Aspect
@Component
@Order(1)
public class DataSourceAspect {
    
    @Around("execution(* com.example.mapper.*.*(..))")
    public Object around(ProceedingJoinPoint point) throws Throwable {
        MethodSignature signature = (MethodSignature) point.getSignature();
        Method method = signature.getMethod();
        String methodName = method.getName();
        
        // 如果ThreadLocal中有标记，强制使用主库
        if (UserService.FORCE_MASTER.get() != null && UserService.FORCE_MASTER.get()) {
            DynamicDataSource.setDataSource("master");
        } else {
            // 根据方法名判断：select/get开头用从库，其他用主库
            if (methodName.startsWith("select") || methodName.startsWith("get")) {
                DynamicDataSource.setDataSource("slave");
            } else {
                DynamicDataSource.setDataSource("master");
            }
        }
        
        try {
            return point.proceed();
        } finally {
            DynamicDataSource.clearDataSource();
        }
    }
}
```

### 解决方案二：订阅从库Binlog

```java
/**
 * 推荐方案：订阅从库的Binlog
 * 
 * 优点：
 * 1. 等从库同步完成后再删缓存，彻底解决主从延迟问题
 * 2. 不增加主库压力
 * 3. 业务代码无侵入
 * 
 * 配置Canal订阅从库：
 */
```

```properties
# Canal配置从库地址
canal.instance.master.address = slave_host:3306
canal.instance.dbUsername = canal
canal.instance.dbPassword = canal123

# 或者同时订阅主库和从库（双Canal实例）
# 主库Canal用于实时性要求高的业务
# 从库Canal用于缓存删除
```

---

## 完整工程实践建议

### 1. 缓存工具类封装

```java
@Component
public class CacheHelper {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    /**
     * 查询缓存，缓存未命中时执行查询函数
     */
    public &lt;T&gt; T getOrLoad(String cacheKey, 
                           Supplier&lt;T&gt; dataLoader, 
                           long timeout, 
                           TimeUnit unit) {
        // 查缓存
        T value = (T) redisTemplate.opsForValue().get(cacheKey);
        if (value != null) {
            return value;
        }
        
        // 缓存未命中，查数据库
        value = dataLoader.get();
        if (value != null) {
            redisTemplate.opsForValue().set(cacheKey, value, timeout, unit);
        }
        
        return value;
    }
    
    /**
     * 删除缓存（支持模糊匹配）
     */
    public void deletePattern(String pattern) {
        Set&lt;String&gt; keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
```

### 2. 业务使用示例

```java
@Service
public class UserService {
    
    @Autowired
    private UserMapper userMapper;
    
    @Autowired
    private CacheHelper cacheHelper;
    
    @Autowired
    private KafkaTemplate<String, CacheDeleteMessage> kafkaTemplate;
    
    /**
     * 查询用户（自动缓存）
     */
    public User getUser(Long userId) {
        String cacheKey = "user:" + userId;
        return cacheHelper.getOrLoad(
            cacheKey,
            () -> userMapper.selectById(userId),
            30,
            TimeUnit.MINUTES
        );
    }
    
    /**
     * 更新用户（自动删缓存）
     */
    @Transactional
    public void updateUser(User user) {
        String cacheKey = "user:" + user.getId();
        
        // 更新数据库
        userMapper.updateById(user);
        
        // 发送删除缓存消息
        sendCacheDeleteMessage(cacheKey);
    }
    
    /**
     * 批量更新（批量删缓存）
     */
    @Transactional
    public void batchUpdateUsers(List&lt;User&gt; users) {
        // 批量更新数据库
        userMapper.batchUpdate(users);
        
        // 批量发送删除缓存消息
        users.forEach(user -> {
            String cacheKey = "user:" + user.getId();
            sendCacheDeleteMessage(cacheKey);
        });
    }
    
    private void sendCacheDeleteMessage(String cacheKey) {
        CacheDeleteMessage message = new CacheDeleteMessage(
            cacheKey,
            System.currentTimeMillis(),
            "USER",
            0
        );
        kafkaTemplate.send("cache-delete-topic", cacheKey, message);
    }
}
```

### 3. 监控和告警

```java
@Component
@Slf4j
public class CacheMonitor {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    /**
     * 缓存命中率监控
     */
    @Scheduled(fixedRate = 60000)  // 每分钟执行一次
    public void monitorCacheHitRate() {
        RedisInfo info = getRedisInfo();
        
        long hits = info.getHits();
        long misses = info.getMisses();
        double hitRate = (double) hits / (hits + misses);
        
        log.info("缓存命中率: {}%", hitRate * 100);
        
        // 命中率过低告警
        if (hitRate < 0.7) {
            log.warn("缓存命中率过低: {}%", hitRate * 100);
            // 发送告警
        }
    }
    
    /**
     * 缓存删除失败监控
     */
    public void recordDeleteFailure(String cacheKey, String reason) {
        log.error("缓存删除失败: key={}, reason={}", cacheKey, reason);
        
        // 记录到监控系统
        // 发送告警通知
    }
    
    private RedisInfo getRedisInfo() {
        // 实现获取Redis统计信息的逻辑
        return new RedisInfo();
    }
    
    @Data
    static class RedisInfo {
        private long hits;
        private long misses;
    }
}
```

### 4. 配置文件完整示例

```yaml
# application.yml
spring:
  # Redis配置
  redis:
    host: localhost
    port: 6379
    password: 
    database: 0
    lettuce:
      pool:
        max-active: 20
        max-idle: 10
        min-idle: 5
        max-wait: 2000ms
  
  # Kafka配置
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      retries: 3
      acks: all
    consumer:
      group-id: cache-delete-group
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      enable-auto-commit: false
      auto-offset-reset: latest
  
  # 数据源配置（读写分离）
  datasource:
    master:
      jdbc-url: jdbc:mysql://master-host:3306/db_name
      username: root
      password: password
      driver-class-name: com.mysql.cj.jdbc.Driver
    slave:
      jdbc-url: jdbc:mysql://slave-host:3306/db_name
      username: root
      password: password
      driver-class-name: com.mysql.cj.jdbc.Driver

# Canal配置
canal:
  server:
    host: localhost
    port: 11111
  destination: example
  
# 缓存配置
cache:
  default-expire-time: 1800  # 默认30分钟
  delay-delete-time: 500     # 延迟双删时间（毫秒）
  max-retry-count: 3         # 最大重试次数
```

### 5. 方案选择指南

场景
推荐方案
原因

小型项目，并发量不大
方案二：先更新DB再删缓存
简单，成本低

中型项目，有一定并发
方案四：异步重试+MQ
可靠性高，复杂度适中

大型项目，高并发
方案五：Canal订阅Binlog
解耦，可靠，大厂方案

有读写分离
Canal+订阅从库Binlog
解决主从延迟问题

金融/交易场景
分布式事务（Seata）
强一致性要求

### 6. 性能优化建议

```java
/**
 * 1. 缓存预热
 *    系统启动时预加载热点数据
 */
@Component
public class CacheWarmer implements ApplicationRunner {
    
    @Override
    public void run(ApplicationArguments args) {
        // 加载热点用户数据
        List&lt;Long&gt; hotUserIds = getHotUserIds();
        hotUserIds.forEach(this::loadUserToCache);
    }
}

/**
 * 2. 批量操作优化
 *    使用Pipeline批量删除缓存
 */
public void batchDeleteCache(List&lt;String&gt; cacheKeys) {
    redisTemplate.executePipelined((RedisCallback&lt;Object&gt;) connection -> {
        cacheKeys.forEach(key -> connection.del(key.getBytes()));
        return null;
    });
}

/**
 * 3. 缓存空值（防止缓存穿透）
 */
public User getUser(Long userId) {
    String cacheKey = "user:" + userId;
    User user = (User) redisTemplate.opsForValue().get(cacheKey);
    
    if (user != null) {
        return user;
    }
    
    user = userMapper.selectById(userId);
    
    // 即使user为null也缓存（设置较短过期时间）
    if (user == null) {
        redisTemplate.opsForValue().set(cacheKey, new User(), 5, TimeUnit.MINUTES);
    } else {
        redisTemplate.opsForValue().set(cacheKey, user, 30, TimeUnit.MINUTES);
    }
    
    return user;
}
```

---

## 总结

### 核心要点

1. **没有银弹**：根据业务场景选择合适方案
2. **追求最终一致性**：分布式环境很难做到强一致
3. **监控和告警**：缓存删除失败必须有监控
4. **容错机制**：消息队列+重试+死信队列
5. **性能和一致性平衡**：不要过度设计

### 推荐组合

- **基础项目**：方案二（先更新DB再删缓存）
- **生产环境**：方案五（Canal + Kafka + Redis）
- **读写分离**：订阅从库Binlog
- **高可用**：Canal集群 + Kafka集群 + Redis集群

以上就是缓存一致性问题的完整技术实现方案，从简单到复杂，从理论到实践，应有尽有！
