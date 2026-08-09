---
title: "Redis分布式锁：从踩坑到落地，构建10万QPS工业级方案"
sidebarGroup: "fox老师"
shortTitle: "Redis分布式锁：从踩坑到落地，构建10万QPS工业级方案"
order: 1066
date: 2026-01-11
category: "面试题"
tag:
  - "面试题"
description: "在分布式系统的生产故障统计中，近三成问题源于共享资源竞争——秒杀活动中用户下单后发现多扣了库存、财务对账时出现数百笔重复订单、库存数值突然变成负数触发紧急告警……这些问题的根源，往往不是开发者不懂Redis分布式锁，而是只掌握了“基础实现”"
article: false
---

> 来源：[Redis分布式锁：从踩坑到落地，构建10万QPS工业级方案](https://www.yuque.com/tulingzhouyu/db22bv/qvprpae28slegs04)

在分布式系统的生产故障统计中，近三成问题源于**共享资源竞争**——秒杀活动中用户下单后发现多扣了库存、财务对账时出现数百笔重复订单、库存数值突然变成负数触发紧急告警……这些问题的根源，往往不是开发者不懂Redis分布式锁，而是只掌握了“基础实现”，忽略了工业级场景下对“高可用”“防丢失”“抗并发”的硬性要求。

本文不堆砌理论，而是从实际开发痛点出发，拆解Redis分布式锁的核心原理、高频坑点解决方案、多场景选型逻辑，最终落地一套可直接复用的10万QPS级方案，无论是新手入门还是资深工程师排查线上问题，都能找到实用参考。

## 一、先搞懂：为什么单机锁不行，Redis锁又为何能行？

在写一行锁代码前，必须先明确“分布式锁的本质”——否则从源头就容易踩坑。

### 1. 单机锁的“失效场景”：跨服务器的竞争无法控制

单机应用中，`synchronized`或`ReentrantLock`能轻松控制同一JVM内的线程竞争。但分布式系统中（比如3台Tomcat组成的集群），线程分散在不同服务器，单机锁会完全失效：

**举个真实案例**：某电商用3台Tomcat处理“商品库存扣减”，每台Tomcat的线程都用`synchronized`加锁。当100个请求同时到来时，3台服务器的线程各自拿到单机锁，分别扣减库存1次，最终库存从100变成97（本该扣3次，实际扣了6次），直接导致超卖。

问题核心：**单机锁只能管“自己服务器的线程”，管不了其他服务器的线程**。

### 2. 分布式锁的本质：跨服务器的“互斥协议”

分布式锁的核心是让多台服务器的线程遵守同一套“互斥规则”——就像厕所隔间的锁，无论哪个房间的人，都得等前一个人开门后才能进入。换句话说，就是让所有线程共享一把“跨服务器的钥匙”。

而Redis能成为分布式锁的主流选择，是因为它完美满足分布式锁的3个核心要求：

- **互斥性**：同一时间只有一个线程能拿到锁，避免资源竞争；
- **高可用性**：Redis集群能规避单点故障，锁服务不会中断；
- **高性能**：单节点Redis每秒能处理数万次锁请求，不会拖慢业务。

### 3. Redis锁的核心技术：原子命令+唯一标识

实现Redis分布式锁，有两个“缺一不可”的技术点，少一个都会导致锁失效。

#### （1）加锁：用`SET NX PX`替代`SETNX`

很多新手入门时会用`SETNX`（SET if Not Exists）加锁，但这个命令有个致命缺陷：**加锁后如果线程崩溃，锁会永久残留，导致死锁**。

正确的做法是用`SET`命令的扩展参数，一条命令同时完成“加锁+设过期时间”，避免多命令执行的非原子性问题。实际项目中，我们常用Spring Data Redis的`RedisTemplate`实现：

```java
/**
 * 加锁方法：原子性加锁+过期时间
 * @param lockKey 锁Key（按业务粒度设计，如"lock:stock:1001"，1001是商品ID）
 * @param threadId 线程唯一标识（后面讲实现）
 * @param expireTime 过期时间（毫秒）
 * @return 加锁是否成功
 */
public boolean tryLock(String lockKey, String threadId, long expireTime) {
    // 核心命令：NX（不存在才加锁）、PX（设毫秒过期）
    Boolean result = redisTemplate.opsForValue().setIfAbsent(
        lockKey, 
        threadId, 
        expireTime, 
        TimeUnit.MILLISECONDS
    );
    // 避免null值（RedisTemplate返回null时表示操作失败）
    return Boolean.TRUE.equals(result);
}
```

#### （2）线程唯一标识：避免“误删他人锁”

如果锁的Value不用唯一标识，会出现这样的问题：

1. 线程A加锁成功，过期时间30秒，但业务执行了40秒；
2. 30秒后锁过期，线程B成功加锁；
3. 线程A业务执行完，直接删除锁，把线程B的锁删了——导致“锁丢失”。

所以，锁的Value必须是“线程唯一标识”，解锁前先判断“锁是不是自己的”。这个标识需要包含3部分：

- **服务器IP**：避免不同服务器的线程标识重复；
- **进程ID（PID）**：避免同一服务器不同进程的线程标识重复；
- **线程ID**：避免同一进程不同线程的标识重复。

实现代码：

```java
/**
 * 生成线程唯一标识：IP + PID + 线程ID
 */
public String getUniqueThreadId() {
    try {
        // 1. 获取服务器IP
        String ip = InetAddress.getLocalHost().getHostAddress();
        // 2. 获取进程ID（JDK 9+支持，JDK 8需用ManagementFactory）
        long pid = ProcessHandle.current().pid();
        // 3. 获取线程ID
        long threadId = Thread.currentThread().getId();
        // 拼接标识
        return String.format("%s:%d:%d", ip, pid, threadId);
    } catch (UnknownHostException e) {
        // 异常兜底：用UUID（不推荐，尽量用IP+PID+线程ID）
        return UUID.randomUUID().toString();
    }
}
```

#### （3）解锁：用Lua脚本保证原子性

解锁不能分两步执行（先GET判断，再DEL删除）——因为判断后、删除前，锁可能已经过期被别人加了。必须用Lua脚本将“判断+删除”变成原子操作。

Lua脚本逻辑：先获取锁的Value，和当前线程标识对比，一致则删除，否则返回0。实现代码：

```java
/**
 * 解锁方法：Lua脚本保证原子性
 * @param lockKey 锁Key
 * @param threadId 线程唯一标识
 */
public void unlock(String lockKey, String threadId) {
    // Lua脚本：判断锁归属 → 一致则删除
    String luaScript = "if redis.call('GET', KEYS[1]) == ARGV[1] " +
                       "then return redis.call('DEL', KEYS[1]) " +
                       "else return 0 end";
    
    // 执行脚本（KEYS[1]对应lockKey，ARGV[1]对应threadId）
    redisTemplate.execute(
        new DefaultRedisScript<>(luaScript, Long.class),
        Collections.singletonList(lockKey),
        threadId
    );
}
```

## 二、避坑指南：生产环境最常踩的3个坑及解决方案

基础锁能在测试环境跑通，但到生产环境一定会遇到各种问题。以下3个坑是一线开发的高频痛点，每个都附可落地的解决方案。

### 坑1：锁过期了，业务还没完成

**问题场景**：锁设了30秒过期，但订单处理（比如库存校验+支付回调）需要40秒。30秒后锁自动过期，其他线程抢到锁，导致同一订单被两个线程同时处理，出现数据错乱。

**解决方案：看门狗（Watchdog）机制**

看门狗是一个守护线程，加锁成功后启动，定期检查“业务线程是否还在执行”：如果在执行，就给锁续期；业务完成后，停止续期，释放锁。

核心逻辑：

- 续期间隔 = 锁过期时间的1/3（比如30秒过期，每10秒续一次）；
- 续期时先判断锁归属，避免续期别人的锁；
- 用线程池管理看门狗，避免线程泄漏。

实现代码：

```java
// 标记：业务是否在执行（volatile保证可见性）
private volatile boolean isBusinessRunning = false;
// 看门狗线程池（固定线程数，避免线程泛滥）
private final ExecutorService watchdogPool = Executors.newFixedThreadPool(5);

/**
 * 带看门狗的加锁方法
 * @param lockKey 锁Key
 * @param expireTime 初始过期时间（毫秒）
 * @return 加锁是否成功
 */
public boolean lockWithWatchdog(String lockKey, long expireTime) {
    String threadId = getUniqueThreadId();
    // 1. 尝试加锁
    boolean lockSuccess = tryLock(lockKey, threadId, expireTime);
    if (!lockSuccess) {
        return false;
    }
    
    // 2. 加锁成功，标记业务开始
    isBusinessRunning = true;
    // 3. 计算续期间隔（过期时间的1/3）
    long renewInterval = expireTime / 3;
    
    // 4. 启动看门狗线程
    watchdogPool.submit(() -> {
        try {
            while (isBusinessRunning) {
                // 休眠续期间隔
                Thread.sleep(renewInterval);
                // 续期脚本：判断锁归属 → 一致则延长过期时间
                String renewScript = "if redis.call('GET', KEYS[1]) == ARGV[1] " +
                                     "then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) " +
                                     "else return 0 end";
                // 执行续期（续期时长设为初始的1/2，避免锁长期占用）
                redisTemplate.execute(
                    new DefaultRedisScript<>(renewScript, Long.class),
                    Collections.singletonList(lockKey),
                    threadId,
                    String.valueOf(expireTime / 2)
                );
            }
        } catch (InterruptedException e) {
            // 线程中断，恢复中断状态
            Thread.currentThread().interrupt();
        }
    });
    
    return true;
}

// 业务执行完后，调用此方法停止看门狗
public void finishBusiness() {
    isBusinessRunning = false;
}
```

### 坑2：主从切换导致锁丢失

**问题场景**：生产环境常用Redis主从+哨兵架构。线程A向主节点加锁成功，但主节点没来得及把“锁数据”同步到从节点就宕机了。哨兵触发故障转移，从节点升级为新主节点。此时线程B向新主节点加锁，发现没有锁数据，直接加锁成功——两个线程同时持有锁，破坏互斥性。

某电商曾在618大促中踩过这个坑：主节点因内存溢出宕机，从节点升级后锁数据未同步，5分钟内出现1200笔重复订单，财务对账差异50万元，团队花了3天人工核实订单。

**解决方案：按业务场景选3种方案**

方案
核心逻辑
优点
缺点
适用场景

主从延迟释放
加锁时主节点执行后，休眠100ms（确保从节点同步）再返回；解锁时先删主再删从
实现简单，性能损耗低
极端情况（主节点秒宕）无法避免
普通业务（商品库存、非支付）

Redis Cluster
按`CRC16(key)%16384`分片，锁Key路由到不同节点，单节点故障仅影响该分片
分散压力，无锁丢失风险
需处理跨分片锁场景
高并发（秒杀、直播下单）

红锁（Redlock）
部署3+独立主节点，加锁需超过半数节点成功；解锁删所有节点
强一致性，几乎无锁丢失风险
运维成本高，性能低
金融级（转账、支付确认）

**避坑提示**：不要盲目用红锁！Java环境中，红锁会受GC停顿影响——比如线程加锁成功后进入10秒GC，其他节点的锁已过期，可能导致其他线程加锁成功。90%的业务用Redis Cluster足够。

### 坑3：高并发自旋重试导致CPU飙升

**问题场景**：加锁失败后，很多开发者会用“自旋重试”（每隔500ms重试一次）。高并发时，1000个线程同时自旋，频繁执行“加锁请求+休眠”，导致CPU占用率飙升到100%，业务响应变慢。

**解决方案：本地锁+分布式锁双层过滤**

核心思路：先加本地锁（同一服务器内的线程竞争），只有拿到本地锁的线程才去抢分布式锁。这样能过滤80%的请求，减少分布式锁的竞争压力。

实现代码：

```java
// 本地锁缓存：Key=锁Key，Value=ReentrantLock（线程安全）
private final ConcurrentHashMap<String, ReentrantLock> localLockCache = new ConcurrentHashMap<>();

/**
 * 双层锁逻辑：本地锁过滤 → 分布式锁竞争
 * @param lockKey 锁Key
 */
public void doBusinessWithDoubleLock(String lockKey) {
    // 1. 先拿本地锁（同一服务器内竞争）
    ReentrantLock localLock = localLockCache.computeIfAbsent(lockKey, k -> new ReentrantLock());
    try {
        // 100ms内拿不到本地锁，直接返回
        if (!localLock.tryLock(100, TimeUnit.MILLISECONDS)) {
            throw new RuntimeException("当前请求过多，请稍后再试");
        }
        
        // 2. 拿分布式锁（带看门狗）
        boolean distributedLock = lockWithWatchdog(lockKey, 30000);
        if (!distributedLock) {
            throw new RuntimeException("当前请求过多，请稍后再试");
        }
        
        try {
            // 3. 执行业务（如库存扣减）
            deductStock(lockKey);
        } finally {
            // 4. 释放分布式锁
            unlock(lockKey, getUniqueThreadId());
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        throw new RuntimeException("请求被中断，请重试");
    } finally {
        // 5. 释放本地锁
        if (localLock.isHeldByCurrentThread()) {
            localLock.unlock();
        }
    }
}
```

## 三、选型逻辑：不选贵的，只选对的

除了Redis锁，生产环境还有ZooKeeper锁、数据库锁两种方案。很多团队盲目追求“强一致性”选ZooKeeper，或为省成本用数据库锁，最终导致性能瓶颈。正确的选型要结合“并发量、一致性需求、资源成本”。

### 1. 三种分布式锁核心对比

方案类型
核心原理
性能（TPS）
一致性
运维成本
适用场景
典型问题

Redis锁
SET NX PX + Lua脚本
10万级
最终一致性
中
高并发、低一致性（秒杀、库存）
主从切换锁丢失（需Redisson优化）

ZooKeeper锁
临时有序节点+监听通知
1千级
强一致性
高
低并发、强一致性（分布式事务）
写操作慢（需半数节点确认）

数据库锁
SELECT ... FOR UPDATE行锁
1百级
强一致性
低
极简场景（无中间件、非高并发）
连接池耗尽、死锁

### 2. 三步选型决策树

第一步：判断并发量（TPS）

- 若TPS > 1万：直接选Redis锁（ZooKeeper和数据库锁性能跟不上）；
- 若TPS < 1千：进入第二步。

第二步：判断一致性需求

- 若需“强一致性”（如转账、分布式事务提交）：选ZooKeeper锁；
- 若“最终一致性”即可（如库存扣减后允许10秒内同步）：选Redis锁。

第三步：判断资源成本

- 若无Redis/ZooKeeper集群，且TPS < 500：可临时用数据库锁（不推荐长期使用）；
- 若已有Redis集群：优先复用Redis锁，避免新增ZooKeeper运维成本。

**选型结论**：90%的互联网业务（秒杀、电商、社交）优先选Redis锁（用Redisson实现），只有金融级强一致性场景才需ZooKeeper锁，数据库锁仅作为“应急方案”。

## 四、生产部署：Redis Cluster + Redisson落地全流程

选好方案后，部署环节的“参数配置”“监控告警”直接影响锁服务稳定性。以下是Redis Cluster + Redisson的工业级部署流程，可直接复用。

### 1. Redis Cluster集群部署（3主3从）

#### （1）集群拓扑规划

节点角色
IP地址
端口
职责

主节点1
192.168.1.101
6379
处理分片0-5460的锁Key

主节点2
192.168.1.102
6379
处理分片5461-10922的锁Key

主节点3
192.168.1.103
6379
处理分片10923-16383的锁Key

从节点1
192.168.1.104
6379
主节点1的从节点（备份）

从节点2
192.168.1.105
6379
主节点2的从节点（备份）

从节点3
192.168.1.106
6379
主节点3的从节点（备份）

#### （2）关键配置（redis.conf）

重点配置以下参数，避免锁丢失、内存溢出等问题：

```properties
# 1. 基础配置
port 6379
daemonize yes  # 后台运行
logfile "/var/log/redis/redis_6379.log"  # 日志路径（便于排障）
dir /data/redis  # 数据存储目录

# 2. 集群配置
cluster-enabled yes  # 开启集群模式
cluster-node-timeout 15000  # 节点超时15秒（触发故障转移）
cluster-migration-barrier 1  # 主节点至少1个健康从节点才允许迁移

# 3. 内存配置（避免锁Key占满内存）
maxmemory 8GB  # 限制内存（16GB服务器设8GB，留20%空闲）
maxmemory-policy volatile-lru  # 仅淘汰带过期时间的Key（锁Key都有过期）

# 4. 安全配置（防止误删锁Key）
rename-command FLUSHDB ""  # 禁用清空库命令
rename-command DEL "safe_del_2024"  # 重命名DEL命令
requirepass "Redis@2024_Prod"  # 配置密码（生产必须）
masterauth "Redis@2024_Prod"  # 主从同步密码

# 5. 持久化配置（避免锁Key重启丢失）
appendonly yes  # 开启AOF持久化
appendfsync everysec  # 每秒刷盘（平衡性能与安全性）
```

### 2. Redisson客户端集成（Spring Boot）

Redisson是Redis官方推荐的Java客户端，已封装好“看门狗、主从适配、可重入锁”等工业级特性，比自研锁少90%的坑。

#### （1）引入依赖（pom.xml）

```xml
&lt;!-- Redisson Spring Boot Starter --&gt;
&lt;dependency&gt;
    &lt;groupId&gt;org.redisson&lt;/groupId&gt;
    &lt;artifactId&gt;redisson-spring-boot-starter&lt;/artifactId&gt;
    &lt;version&gt;3.23.3&lt;/version&gt;  &lt;!-- 选稳定版，避免快照版 --&gt;
    &lt;!-- 排除默认Jackson，避免版本冲突 --&gt;
    &lt;exclusions&gt;
        &lt;exclusion&gt;
            &lt;groupId&gt;com.fasterxml.jackson.core&lt;/groupId&gt;
            &lt;artifactId&gt;jackson-databind&lt;/artifactId&gt;
        &lt;/exclusion&gt;
    &lt;/exclusions&gt;
&lt;/dependency&gt;
&lt;!-- 引入Spring Boot默认Jackson --&gt;
&lt;dependency&gt;
    &lt;groupId&gt;com.fasterxml.jackson.core&lt;/groupId&gt;
    &lt;artifactId&gt;jackson-databind&lt;/artifactId&gt;
    &lt;version&gt;${spring-boot.version}&lt;/version&gt;
&lt;/dependency&gt;

```

#### （2）配置文件（application.yml）

```yaml
spring:
  redis:
    cluster:
      nodes:  # 配置所有主从节点
        - 192.168.1.101:6379
        - 192.168.1.102:6379
        - 192.168.1.103:6379
        - 192.168.1.104:6379
        - 192.168.1.105:6379
        - 192.168.1.106:6379
      max-redirects: 3  # 最大重定向次数
    timeout: 3000  # 连接超时3秒
    password: Redis@2024_Prod  # 与Redis密码一致

# Redisson配置
redisson:
  lock:
    watch-dog-timeout: 30000  # 看门狗超时30秒
    retry-interval: 100       # 加锁失败重试间隔100ms
    fair-lock: true           # 开启公平锁（避免线程饥饿）
  cluster-servers-config:
    scan-interval: 2000       # 2秒扫描一次集群拓扑
    ping-connection-interval: 30000  # 30秒检测连接健康
```

#### （3）封装工具类（通用锁工具）

避免业务代码重复写锁逻辑，封装支持Lambda的工具类：

```java
@Component
@Slf4j
public class RedissonLockUtil {

    @Autowired
    private RedissonClient redissonClient;

    /**
     * 加锁并执行业务（默认：等待5秒，锁过期30秒）
     * @param lockKey 锁Key（格式：业务:资源ID，如"stock:1001"）
     * @param business 业务逻辑（Lambda传入）
     */
    public void executeWithLock(String lockKey, Runnable business) {
        // 校验锁Key格式
        validateLockKey(lockKey);
        // 获取公平锁
        RLock lock = redissonClient.getFairLock(lockKey);
        boolean isLocked = false;

        try {
            // 尝试加锁：等待5秒，过期30秒
            isLocked = lock.tryLock(5, 30, TimeUnit.SECONDS);
            if (!isLocked) {
                log.error("获取锁失败，锁Key：{}", lockKey);
                throw new RuntimeException("系统繁忙，请稍后再试");
            }

            // 执行业务
            log.debug("获取锁成功，锁Key：{}，线程ID：{}", lockKey, Thread.currentThread().getId());
            business.run();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("请求被中断，请重试");
        } catch (Exception e) {
            log.error("业务执行异常，锁Key：{}", lockKey, e);
            throw new RuntimeException("业务处理失败，请重试");
        } finally {
            // 释放锁（仅当前线程持有才释放）
            if (isLocked && lock.isHeldByCurrentThread()) {
                try {
                    lock.unlock();
                    log.debug("释放锁成功，锁Key：{}", lockKey);
                } catch (Exception e) {
                    log.warn("释放锁异常，锁Key：{}", lockKey, e);
                }
            }
        }
    }

    // 校验锁Key格式
    private void validateLockKey(String lockKey) {
        if (lockKey == null || lockKey.trim().isEmpty() || !lockKey.contains(":")) {
            throw new IllegalArgumentException("锁Key格式错误，需为'业务:资源ID'（如'stock:1001'）");
        }
    }
}
```

#### （4）业务使用示例（秒杀库存扣减）

```java
@Service
public class SeckillService {

    @Autowired
    private RedissonLockUtil redissonLockUtil;

    @Autowired
    private StockMapper stockMapper;

    /**
     * 秒杀库存扣减（防超卖、防重复下单）
     * @param productId 商品ID
     * @param userId 用户ID
     */
    public String deductSeckillStock(Long productId, Long userId) {
        // 1. 基础参数校验
        if (productId == null || userId == null) {
            throw new IllegalArgumentException("参数非法");
        }

        // 2. 定义锁Key（商品维度，降低竞争）
        String lockKey = "seckill:stock:" + productId;

        // 3. 加锁执行业务
        try {
            redissonLockUtil.executeWithLock(lockKey, () -> {
                // 校验用户是否已下单（防重复）
                if (hasUserOrdered(productId, userId)) {
                    throw new RuntimeException("您已下单该商品，不可重复购买");
                }

                // 校验库存（防超卖）
                SeckillStock stock = stockMapper.selectByProductId(productId);
                if (stock == null || stock.getRemaining() < 1) {
                    throw new RuntimeException("商品已抢完");
                }

                // 扣减库存（数据库行锁兜底）
                int updateCount = stockMapper.deductStock(productId, 1);
                if (updateCount == 0) {
                    throw new RuntimeException("商品已抢完");
                }

                // 创建订单
                createSeckillOrder(productId, userId, stock.getPrice());
            });
            return "秒杀成功！";
        } catch (RuntimeException e) {
            return "秒杀失败：" + e.getMessage();
        }
    }

    // 校验用户是否已下单（数据库唯一索引兜底）
    private boolean hasUserOrdered(Long productId, Long userId) {
        return seckillOrderMapper.countByUserIdAndProductId(userId, productId) > 0;
    }

    // 创建秒杀订单
    private void createSeckillOrder(Long productId, Long userId, BigDecimal price) {
        SeckillOrder order = new SeckillOrder();
        order.setOrderNo(generateOrderNo());
        order.setProductId(productId);
        order.setUserId(userId);
        order.setPrice(price);
        seckillOrderMapper.insert(order);
    }

    // 生成唯一订单号
    private String generateOrderNo() {
        return System.currentTimeMillis() + RandomUtils.nextInt(1000, 9999) + "";
    }
}
```

### 3. 监控告警：避免“隐身故障”

生产环境必须监控锁的核心指标，避免锁丢失、加锁超时等问题无法及时发现。

#### （1）核心监控指标

指标名称
监控逻辑
阈值建议
告警场景

加锁成功率
（成功次数/总次数）×100%
<99.9%
Redis集群故障、锁竞争过于激烈

锁平均持有时间
（释放时间-加锁时间）的平均值
超过业务最大耗时2倍
业务卡顿、看门狗续期异常

Redis节点存活数
集群中主从节点在线数量
主节点下线>30秒
主节点宕机未触发故障转移

锁Key残留数量
Redis中未过期的lock:*前缀Key总数
>10万或环比增长50%
解锁逻辑漏写、看门狗异常续期

#### （2）告警落地（Prometheus+Grafana）

1. **指标采集**：用Prometheus采集Redisson指标（如`redisson_lock_success_count`）；
2. **告警规则**：加锁成功率低于99.9%持续1分钟触发告警；
3. **告警渠道**：通过Alertmanager推送到企业微信/钉钉，示例规则：

```yaml
groups:
  - name: redisson-alerts
    rules:
      - alert: LockSuccessRateLow
        expr: sum(redisson_lock_success_count) / sum(redisson_lock_total_count) < 0.999
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis锁加锁成功率过低"
          description: "当前成功率：{​{ $value | printf \"%.3f\" }​}，请检查Redis集群"
```

## 五、总结：Redis分布式锁落地的3个核心原则

从原理到部署，Redis分布式锁的核心不是“越复杂越好”，而是围绕业务平衡“安全性、性能、可维护性”，记住这3个原则：

1. **拒绝自研，优先成熟组件** 90%的自研锁会遗漏边缘场景（如主从切换、看门狗泄漏），Redisson已封装所有工业级特性，经过阿里、京东等企业验证，故障风险远低于自研。
2. **锁方案+业务兜底，双重保障** 分布式锁无法100%安全（如Redis脑裂、GC停顿），必须配合业务兜底：

- 防超卖：数据库行锁+乐观锁；
- 防重复：唯一索引+用户幂等校验；
- 防故障：定时对账（缓存vs数据库）。

1. **按场景选型，不盲目追求“完美”** 没有万能的锁：高并发选Redis Cluster，强一致性选ZooKeeper，极简场景临时用数据库锁。90%的互联网业务用Redisson+Redis Cluster足够，不要为了“强一致性”盲目用红锁。

最后记住：分布式锁是“第一道防线”，业务兜底是“最后一道防线”。掌握本文的原理、避坑、部署逻辑，你就能构建一套扛住10万QPS、保数据安全的工业级Redis分布式锁方案。
