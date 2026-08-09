---
title: "搞定 Java 电商面试：购物车设计全解析（3 种存储方案 + 数据合并逻辑 + 异常处理）"
sidebarGroup: "鹏宇老师"
shortTitle: "搞定 Java 电商面试：购物车设计全解析（3 种存储方案 + 数据合并逻辑 + 异常处理）"
order: 1182
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "1. 文档引言1.1 文档目的本文档针对 “电商购物车设计” 场景，从 Java 技术栈角度提供完整落地方案，涵盖核心功能定义、不同用户状态（登录 / 未登录 / 状态切换）的存储设计、数据同步逻辑及代码实现，同时预留 PPT 截图插入位置"
article: false
---

> 来源：[搞定 Java 电商面试：购物车设计全解析（3 种存储方案 + 数据合并逻辑 + 异常处理）](https://www.yuque.com/tulingzhouyu/db22bv/bqhibl970nr1cll4)

## 1. 文档引言

### 1.1 文档目的

本文档针对 “电商购物车设计” 场景，从 Java 技术栈角度提供完整落地方案，涵盖核心功能定义、不同用户状态（登录 / 未登录 / 状态切换）的存储设计、数据同步逻辑及代码实现，同时预留 PPT 截图插入位置，便于配合演示讲解。

### 1.2 核心背景

购物车是电商系统的 “核心交互模块”，需满足**高频操作性能、数据可靠性、跨设备同步**三大核心需求。面试官通过该模块设计，考察候选人对 “客户端 - 服务端协同”“存储方案权衡”“Java 技术落地” 的综合能力，即 “小模块见大架构”。

## 2. 购物车核心功能定义

### 2.1 基础功能清单

购物车需覆盖用户从 “加购” 到 “结算” 的全流程操作，核心功能如下：

**功能名称**
**功能描述**
**技术关注点**

加入商品
接收用户选择的商品 SKU、数量，完成加购
数据合法性校验、重复加购处理

删除商品
支持单个 / 批量删除购物车商品
原子性操作、删除后数据同步

修改数量
调整商品购买数量（含上限校验，如库存限制）
实时价格重算、库存联动检查

查询购物车
展示所有加购商品（含选中状态、价格、优惠）
数据缓存、快速渲染

商品结算
筛选选中商品，跳转至下单流程
选中状态校验、临时锁库存

优惠计算
自动叠加满减、折扣券、会员价
优惠规则引擎集成、金额精度控制

![image](/面试题/高频面试问题/鹏宇老师/1182-java-ecommerce-shopping-cart-design/img-078837b102eb.png)

### 2.2 Java 功能接口设计（伪代码）

基于 SpringBoot 框架定义`CartService`接口，统一封装核心功能，后续根据用户状态实现不同逻辑：

```java
/**
 * 购物车核心服务接口
 */
public interface CartService {
    /**
     * 加入购物车
     * @param userId 用户ID（登录用户非空，未登录用户为null）
     * @param cartItemDTO 购物车商品DTO（含SKU、数量、选中状态）
     * @return 操作结果（含当前购物车商品总数）
     */
    ResultDTO&lt;CartOperateVO&gt; addItem(String userId, CartItemDTO cartItemDTO);

    /**
     * 删除购物车商品
     * @param userId 用户ID
     * @param skuIds 商品SKU集合
     * @return 操作结果
     */
    ResultDTO&lt;Void&gt; deleteItems(String userId, List&lt;String&gt; skuIds);

    /**
     * 修改商品数量
     * @param userId 用户ID
     * @param skuId 商品SKU
     * @param newNum 新数量（需大于0，小于库存上限）
     * @return 操作结果（含修改后的商品信息）
     */
    ResultDTO&lt;CartItemVO&gt; updateItemNum(String userId, String skuId, Integer newNum);

    /**
     * 查询购物车列表
     * @param userId 用户ID
     * @return 购物车列表（含商品详情、优惠后价格）
     */
    ResultDTO<List&lt;CartItemVO&gt;> queryCartList(String userId);

    /**
     * 商品结算（筛选选中商品）
     * @param userId 用户ID
     * @return 结算商品汇总（含总金额、优惠金额）
     */
    ResultDTO&lt;CartSettlementVO&gt; settleCart(String userId);
}
```

## 3. 登录状态下的服务端存储方案

登录用户数据需 “跨设备同步”，因此存储于服务端，Java 技术栈下有三种主流方案，需结合业务规模选型。

![image](/面试题/高频面试问题/鹏宇老师/1182-java-ecommerce-shopping-cart-design/img-cfb4846d4367.png)

### 3.1 方案 1：仅使用 MySQL 存储

#### 3.1.1 技术原理

基于关系型数据库的 ACID 特性，将购物车数据持久化至 MySQL，通过`user_id`和`sku_id`做唯一索引，避免重复存储。

![image](/面试题/高频面试问题/鹏宇老师/1182-java-ecommerce-shopping-cart-design/img-f304cee749be.png)

#### 3.1.2 Java 实现

1. **数据库表设计**：

```sql
CREATE TABLE `item_cart` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `sku_id` varchar(64) NOT NULL COMMENT '商品SKU',
  `sku_name` varchar(255) NOT NULL COMMENT '商品名称',
  `price` decimal(10,2) NOT NULL COMMENT '商品单价（加购时价格）',
  `num` int NOT NULL DEFAULT '1' COMMENT '购买数量',
  `selected` tinyint NOT NULL DEFAULT '1' COMMENT '是否选中（1-是，0-否）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_sku` (`user_id`,`sku_id`) COMMENT '用户-商品唯一索引',
  KEY `idx_user_id` (`user_id`) COMMENT '用户ID索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车表';
```

1. **实体类与 Mapper**（使用 MyBatis-Plus 简化 CRUD）：

```java
/**
 * 购物车实体类
 */
@Data
@TableName("item_cart")
public class ItemCartDO {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String userId;
    private String skuId;
    private String skuName;
    private BigDecimal price;
    private Integer num;
    private Integer selected;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

/**
 * 购物车Mapper
 */
public interface ItemCartMapper extends BaseMapper&lt;ItemCartDO&gt; {
    /**
     * 批量查询用户购物车
     * @param userId 用户ID
     * @return 购物车列表
     */
    List&lt;ItemCartDO&gt; selectByUserId(@Param("userId") String userId);

    /**
     * 批量更新数量
     * @param list 更新列表（含userId、skuId、newNum）
     * @return 影响行数
     */
    int batchUpdateNum(@Param("list") List&lt;ItemCartDO&gt; list);
}
```

1. **Service 实现**（核心逻辑）：

```java
@Service
public class CartMysqlServiceImpl implements CartService {
    @Autowired
    private ItemCartMapper cartMapper;
    @Autowired
    private SkuFeignClient skuFeignClient; // 商品服务Feign客户端（查库存、价格）

    @Override
    public ResultDTO&lt;CartOperateVO&gt; addItem(String userId, CartItemDTO cartItemDTO) {
        // 1. 校验商品库存（调用商品服务）
        SkuStockVO stockVO = skuFeignClient.getSkuStock(cartItemDTO.getSkuId());
        if (stockVO.getStock() < cartItemDTO.getNum()) {
            return ResultDTO.fail("库存不足，当前库存：" + stockVO.getStock());
        }

        // 2. 构建DO对象（查询商品名称、当前价格）
        SkuInfoVO skuInfo = skuFeignClient.getSkuInfo(cartItemDTO.getSkuId());
        ItemCartDO cartDO = new ItemCartDO();
        cartDO.setUserId(userId);
        cartDO.setSkuId(cartItemDTO.getSkuId());
        cartDO.setSkuName(skuInfo.getSkuName());
        cartDO.setPrice(skuInfo.getSalePrice());
        cartDO.setNum(cartItemDTO.getNum());
        cartDO.setSelected(cartItemDTO.getSelected());

        // 3. 插入或更新（通过唯一索引避免重复）
        LambdaQueryWrapper&lt;ItemCartDO&gt; queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(ItemCartDO::getUserId, userId)
                    .eq(ItemCartDO::getSkuId, cartItemDTO.getSkuId());
        ItemCartDO existDO = cartMapper.selectOne(queryWrapper);
        int count;
        if (existDO != null) {
            existDO.setNum(existDO.getNum() + cartItemDTO.getNum()); // 已存在则叠加数量
            count = cartMapper.updateById(existDO);
        } else {
            count = cartMapper.insert(cartDO);
        }

        // 4. 返回结果（查询当前购物车总数）
        if (count > 0) {
            CartOperateVO vo = new CartOperateVO();
            vo.setTotalNum(getCartTotalNum(userId));
            return ResultDTO.success(vo);
        }
        return ResultDTO.fail("加购失败");
    }

    // 其他方法（deleteItems、updateItemNum等）类似，均通过MyBatis-Plus操作MySQL
    private Integer getCartTotalNum(String userId) {
        LambdaQueryWrapper&lt;ItemCartDO&gt; queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(ItemCartDO::getUserId, userId);
        return cartMapper.selectList(queryWrapper).stream()
                .mapToInt(ItemCartDO::getNum)
                .sum();
    }
}
```

#### 3.1.3 优缺点与适用场景

**维度**
**优点**
**缺点**

数据可靠性
支持事务，数据持久化，无丢失风险
磁盘 IO，高频操作（如秒杀加购）卡顿

性能
支持索引优化，查询性能可控
并发写入需加锁，易出现性能瓶颈

维护成本
无需额外组件，仅依赖 MySQL
分库分表复杂（用户量超 100 万时需拆分）

**适用场景**：日均 UV＜1 万的小型电商、工业用品采购平台（加购频率低）。

### 3.2 方案 2：仅使用 Redis 存储

#### 3.2.1 技术原理

利用 Redis 的`Hash`数据结构（Key = 用户 ID，Field = 商品 SKU，Value = 商品 JSON）实现高频读写，通过`RDB+AOF`持久化降低数据丢失风险，Java 端使用 Redisson 客户端简化分布式操作。

![image](/面试题/高频面试问题/鹏宇老师/1182-java-ecommerce-shopping-cart-design/img-5df6d7bbb8fc.png)

#### 3.2.2 Java 实现

1. **Redisson 配置**：

```java
@Configuration
public class RedissonConfig {
    @Value("${spring.redis.host}")
    private String host;
    @Value("${spring.redis.port}")
    private Integer port;

    @Bean
    public RedissonClient redissonClient() {
        Config config = new Config();
        // 单机模式（生产环境建议集群模式）
        config.useSingleServer()
              .setAddress("redis://" + host + ":" + port)
              .setDatabase(1) // 购物车专用Redis库
              .setConnectionMinimumIdleSize(5) // 最小空闲连接数
              .setConnectionPoolSize(20); // 连接池大小
        return Redisson.create(config);
    }
}
```

1. **Service 实现**（核心逻辑）：

```java
@Service
public class CartRedisServiceImpl implements CartService {
    @Autowired
    private RedissonClient redissonClient;
    @Autowired
    private SkuFeignClient skuFeignClient;
    // Redis Key前缀（避免Key冲突）
    private static final String CART_KEY_PREFIX = "cart:user:";
    // JSON工具（FastJSON）
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    public ResultDTO&lt;CartOperateVO&gt; addItem(String userId, CartItemDTO cartItemDTO) {
        // 1. 校验库存（同MySQL方案）
        SkuStockVO stockVO = skuFeignClient.getSkuStock(cartItemDTO.getSkuId());
        if (stockVO.getStock() < cartItemDTO.getNum()) {
            return ResultDTO.fail("库存不足");
        }

        // 2. 获取Redis Hash对象（Redisson的RLocalMap线程安全）
        RLocalMap<String, String> cartMap = redissonClient.getLocalMap(CART_KEY_PREFIX + userId);
        String skuId = cartItemDTO.getSkuId();
        SkuInfoVO skuInfo = skuFeignClient.getSkuInfo(skuId);

        // 3. 插入或更新购物车数据
        CartItemRedisVO cartItemVO = new CartItemRedisVO();
        cartItemVO.setSkuId(skuId);
        cartItemVO.setSkuName(skuInfo.getSkuName());
        cartItemVO.setPrice(skuInfo.getSalePrice());
        cartItemVO.setSelected(cartItemDTO.getSelected());

        if (cartMap.containsKey(skuId)) {
            // 已存在：叠加数量
            String existJson = cartMap.get(skuId);
            CartItemRedisVO existVO = JSON.parseObject(existJson, CartItemRedisVO.class);
            cartItemVO.setNum(existVO.getNum() + cartItemDTO.getNum());
        } else {
            // 不存在：设置初始数量
            cartItemVO.setNum(cartItemDTO.getNum());
        }

        // 4. 写入Redis（JSON序列化）
        cartMap.put(skuId, JSON.toJSONString(cartItemVO));

        // 5. 返回结果（购物车总数=Hash的size，每个Field对应一个商品）
        CartOperateVO vo = new CartOperateVO();
        vo.setTotalNum(cartMap.size());
        return ResultDTO.success(vo);
    }

    @Override
    public ResultDTO<List&lt;CartItemVO&gt;> queryCartList(String userId) {
        // 1. 获取Redis Hash数据
        RLocalMap<String, String> cartMap = redissonClient.getLocalMap(CART_KEY_PREFIX + userId);
        if (cartMap.isEmpty()) {
            return ResultDTO.success(Collections.emptyList());
        }

        // 2. 反序列化为VO列表（适配前端展示）
        List&lt;CartItemVO&gt; cartList = cartMap.values().stream()
                .map(json -> {
                    CartItemRedisVO redisVO = JSON.parseObject(json, CartItemRedisVO.class);
                    CartItemVO vo = new CartItemVO();
                    BeanUtils.copyProperties(redisVO, vo);
                    // 补充实时数据（如当前库存，避免加购后库存不足）
                    SkuStockVO stockVO = skuFeignClient.getSkuStock(redisVO.getSkuId());
                    vo.setStock(stockVO.getStock());
                    return vo;
                })
                .collect(Collectors.toList());

        return ResultDTO.success(cartList);
    }

    // 其他方法（deleteItems、updateItemNum等）类似，通过Redisson操作Hash
}
```

#### 3.2.3 优缺点与适用场景

**维度**
**优点**
**缺点**

性能
内存操作，毫秒级响应，支持百万级并发
依赖 Redis 集群，维护成本高于 MySQL

数据可靠性
RDB+AOF 持久化，降低丢失风险
极端情况（如 Redis 集群宕机）仍可能丢数据

扩展性
支持 Redis Cluster 分片，用户量无上限
不支持复杂查询（如按商品分类筛选）

**适用场景**：日均 UV 1 万 - 10 万的中小型电商，优先保障高频操作体验。

### 3.3 方案 3：Redis+MySQL 混合存储（主流方案）

#### 3.3.1 技术原理

- **实时层**：Redis 负责高频读写（加购、改数量、查询），保证性能；
- **持久层**：MySQL 负责数据长期存储，避免 Redis 宕机丢失；
- **同步层**：通过 “定时任务 + 消息队列” 实现 Redis 到 MySQL 的异步同步，兼顾实时性与可靠性。

![image](/面试题/高频面试问题/鹏宇老师/1182-java-ecommerce-shopping-cart-design/img-8706b0c5cb56.png)

#### 3.3.2 Java 实现

1. **核心架构组件**：

- 实时操作：复用方案 2 的 Redis 逻辑；
- 异步同步：定时任务（Quartz）批量同步 + MQ（RabbitMQ）实时同步（关键操作）；
- 数据恢复：Redis 启动时从 MySQL 加载历史数据。

1. **定时任务同步（Quartz 配置）**：

```java
/**
 * 购物车Redis→MySQL定时同步任务
 */
@Component
public class CartSyncJob {
    @Autowired
    private RedissonClient redissonClient;
    @Autowired
    private ItemCartMapper cartMapper;
    private static final String CART_KEY_PREFIX = "cart:user:";

    /**
     * 每5分钟执行一次（cron表达式：0 0/5 * * * ?）
     */
    @Scheduled(cron = "0 0/5 * * * ?")
    public void syncRedisToMysql() {
        // 1. 获取所有用户购物车Key（Redis scan命令避免阻塞）
        RKeys keys = redissonClient.getKeys();
        Iterable&lt;String&gt; cartKeys = keys.getKeysByPattern(CART_KEY_PREFIX + "*");

        // 2. 遍历每个用户的购物车，批量同步到MySQL
        for (String cartKey : cartKeys) {
            String userId = cartKey.replace(CART_KEY_PREFIX, "");
            RLocalMap<String, String> cartMap = redissonClient.getLocalMap(cartKey);
            if (cartMap.isEmpty()) {
                continue;
            }

            // 3. 转换为MySQL DO列表
            List&lt;ItemCartDO&gt; cartDOList = cartMap.values().stream()
                    .map(json -> {
                        CartItemRedisVO redisVO = JSON.parseObject(json, CartItemRedisVO.class);
                        ItemCartDO cartDO = new ItemCartDO();
                        cartDO.setUserId(userId);
                        cartDO.setSkuId(redisVO.getSkuId());
                        cartDO.setSkuName(redisVO.getSkuName());
                        cartDO.setPrice(redisVO.getPrice());
                        cartDO.setNum(redisVO.getNum());
                        cartDO.setSelected(redisVO.getSelected());
                        return cartDO;
                    })
                    .collect(Collectors.toList());

            // 4. 批量插入/更新MySQL（使用MyBatis-Plus批量操作）
            batchUpsert(cartDOList);
        }
    }

    // 批量插入或更新（通过唯一索引uk_user_sku实现）
    private void batchUpsert(List&lt;ItemCartDO&gt; cartDOList) {
        // 1. 按userId分组（避免跨用户事务）
        Map<String, List&lt;ItemCartDO&gt;> userGroup = cartDOList.stream()
                .collect(Collectors.groupingBy(ItemCartDO::getUserId));

        // 2. 分组执行批量操作
        for (Map.Entry<String, List&lt;ItemCartDO&gt;> entry : userGroup.entrySet()) {
            List&lt;ItemCartDO&gt; list = entry.getValue();
            // 批量插入SQL：INSERT INTO item_cart(...) VALUES(...) ON DUPLICATE KEY UPDATE ...
            cartMapper.batchUpsert(list);
        }
    }
}
```

1. **MQ 实时同步（关键操作触发）**：

```java
/**
 * 购物车关键操作MQ生产者（如结算、删除）
 */
@Service
public class CartMqProducer {
    @Autowired
    private RabbitTemplate rabbitTemplate;
    // 交换机和队列名称
    private static final String CART_EXCHANGE = "cart.sync.exchange";
    private static final String CART_ROUTING_KEY = "cart.sync.key";

    /**
     * 发送同步消息（如用户结算时，立即同步购物车状态）
     * @param userId 用户ID
     */
    public void sendSyncMsg(String userId) {
        CartSyncMsg msg = new CartSyncMsg();
        msg.setUserId(userId);
        msg.setSyncTime(LocalDateTime.now());
        // 发送消息（JSON序列化）
        rabbitTemplate.convertAndSend(CART_EXCHANGE, CART_ROUTING_KEY, msg);
    }
}

/**
 * MQ消费者（接收同步消息，执行Redis→MySQL同步）
 */
@Component
public class CartMqConsumer {
    @Autowired
    private CartSyncService cartSyncService; // 复用定时任务的同步逻辑

    @RabbitListener(queues = "cart.sync.queue")
    public void handleSyncMsg(CartSyncMsg msg) {
        try {
            // 执行单个用户的同步（避免批量同步压力）
            cartSyncService.syncSingleUser(msg.getUserId());
        } catch (Exception e) {
            // 异常重试（配置RabbitMQ死信队列）
            throw new AmqpRejectAndDontRequeueException("同步失败，进入死信队列", e);
        }
    }
}
```

1. **Redis 宕机数据恢复**：

```java
/**
 * Redis启动时数据恢复服务
 */
@Component
public class CartRedisRecoveryService implements CommandLineRunner {
    @Autowired
    private RedissonClient redissonClient;
    @Autowired
    private ItemCartMapper cartMapper;
    private static final String CART_KEY_PREFIX = "cart:user:";

    @Override
    public void run(String... args) throws Exception {
        // 1. 查询MySQL中所有未过期的购物车数据（如30天内有更新的）
        LambdaQueryWrapper&lt;ItemCartDO&gt; queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.gt(ItemCartDO::getUpdateTime, LocalDateTime.now().minusDays(30));
        List&lt;ItemCartDO&gt; cartDOList = cartMapper.selectList(queryWrapper);

        // 2. 按用户分组，批量加载到Redis
        Map<String, List&lt;ItemCartDO&gt;> userGroup = cartDOList.stream()
                .collect(Collectors.groupingBy(ItemCartDO::getUserId));

        for (Map.Entry<String, List&lt;ItemCartDO&gt;> entry : userGroup.entrySet()) {
            String userId = entry.getKey();
            List&lt;ItemCartDO&gt; list = entry.getValue();
            RLocalMap<String, String> cartMap = redissonClient.getLocalMap(CART_KEY_PREFIX + userId);

            // 3. 转换为Redis VO并写入
            Map<String, String> redisData = list.stream()
                    .collect(Collectors.toMap(
                            ItemCartDO::getSkuId,
                            doObj -> {
                                CartItemRedisVO redisVO = new CartItemRedisVO();
                                BeanUtils.copyProperties(doObj, redisVO);
                                return JSON.toJSONString(redisVO);
                            }
                    ));

            cartMap.putAll(redisData);
        }

        log.info("Redis购物车数据恢复完成，共恢复{}个用户的购物车", userGroup.size());
    }
}
```

#### 3.3.3 优缺点与适用场景

**维度**
**优点**
**缺点**

性能 + 可靠性
Redis 保障高频性能，MySQL 保障数据安全
架构复杂，需维护 Redis、MySQL、MQ、定时任务

扩展性
支持分片、集群，用户量无上限
同步逻辑需处理一致性（如 Redis 与 MySQL 数据差异）

体验
跨设备同步无延迟，数据不丢失
开发成本高，需处理异常场景（如同步失败）

**适用场景**：日均 UV＞10 万的中大型电商、奢侈品平台（数据零丢失要求）。

## 4. 未登录状态下的客户端存储方案

未登录用户（游客）无用户 ID，数据暂存于客户端（浏览器），Java 后端需配合实现 “数据暂存 + 登录后同步”，核心方案为 Cookie 和 LocalStorage。

![image](/面试题/高频面试问题/鹏宇老师/1182-java-ecommerce-shopping-cart-design/img-75c96cb67fb6.png)

### 4.1 方案 1：Cookie 存储

#### 4.1.1 技术原理

- 客户端：浏览器将购物车数据（JSON 格式）存储于 Cookie；
- 服务端：Java 通过`HttpServletRequest`读取 Cookie，`HttpServletResponse`设置 Cookie，自动随请求携带。

#### 4.1.2 Java 实现（Cookie 工具类 + 接口）

1. **Cookie 工具类**：

```java
/**
 * Cookie操作工具类
 */
public class CookieUtils {
    // 购物车Cookie名称
    public static final String CART_COOKIE_NAME = "guest_cart";
    // Cookie有效期（7天，单位：秒）
    public static final int CART_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
    // Cookie路径（全站可见）
    public static final String CART_COOKIE_PATH = "/";

    /**
     * 设置购物车Cookie（加密数据，避免明文泄露）
     * @param response HttpServletResponse
     * @param cartData 购物车数据（JSON字符串）
     */
    public static void setCartCookie(HttpServletResponse response, String cartData) {
        try {
            // 1. 数据加密（Base64，避免特殊字符问题）
            String encryptedData = Base64.getEncoder().encodeToString(cartData.getBytes(StandardCharsets.UTF_8));
            // 2. 创建Cookie
            Cookie cookie = new Cookie(CART_COOKIE_NAME, encryptedData);
            cookie.setMaxAge(CART_COOKIE_MAX_AGE);
            cookie.setPath(CART_COOKIE_PATH);
            cookie.setHttpOnly(true); // 禁止前端JS读取，防止XSS攻击
            cookie.setSecure(false); // 非HTTPS环境（生产环境建议设为true）
            // 3. 写入响应
            response.addCookie(cookie);
        } catch (Exception e) {
            log.error("设置购物车Cookie失败", e);
        }
    }

    /**
     * 读取购物车Cookie
     * @param request HttpServletRequest
     * @return 解密后的购物车数据（JSON字符串），无数据则返回null
     */
    public static String getCartCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (CART_COOKIE_NAME.equals(cookie.getName())) {
                try {
                    // 解密Base64数据
                    byte[] decryptedBytes = Base64.getDecoder().decode(cookie.getValue());
                    return new String(decryptedBytes, StandardCharsets.UTF_8);
                } catch (Exception e) {
                    log.error("解析购物车Cookie失败", e);
                    return null;
                }
            }
        }
        return null;
    }

    /**
     * 删除购物车Cookie（登录后同步完成时调用）
     * @param response HttpServletResponse
     */
    public static void deleteCartCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(CART_COOKIE_NAME, null);
        cookie.setMaxAge(0); // 立即过期
        cookie.setPath(CART_COOKIE_PATH);
        response.addCookie(cookie);
    }
}
```

1. **未登录购物车接口实现**：

```java
@RestController
@RequestMapping("/api/cart/guest")
public class GuestCartController {
    @Autowired
    private SkuFeignClient skuFeignClient;

    /**
     * 未登录用户加购商品（写入Cookie）
     */
    @PostMapping("/add")
    public ResultDTO&lt;CartOperateVO&gt; addGuestItem(HttpServletRequest request, 
                                                 HttpServletResponse response,
                                                 @RequestBody CartItemDTO cartItemDTO) {
        // 1. 校验库存
        SkuStockVO stockVO = skuFeignClient.getSkuStock(cartItemDTO.getSkuId());
        if (stockVO.getStock() < cartItemDTO.getNum()) {
            return ResultDTO.fail("库存不足");
        }

        // 2. 读取现有Cookie数据
        String cookieData = CookieUtils.getCartCookie(request);
        Map<String, CartItemRedisVO> cartMap = new HashMap<>();
        if (StringUtils.hasText(cookieData)) {
            cartMap = JSON.parseObject(cookieData, new TypeReference<Map<String, CartItemRedisVO>>() {});
        }

        // 3. 新增/更新购物车数据
        SkuInfoVO skuInfo = skuFeignClient.getSkuInfo(cartItemDTO.getSkuId());
        CartItemRedisVO cartItemVO = new CartItemRedisVO();
        cartItemVO.setSkuId(cartItemDTO.getSkuId());
        cartItemVO.setSkuName(skuInfo.getSkuName());
        cartItemVO.setPrice(skuInfo.getSalePrice());
        cartItemVO.setNum(cartItemDTO.getNum());
        cartItemVO.setSelected(cartItemDTO.getSelected());

        if (cartMap.containsKey(cartItemDTO.getSkuId())) {
            // 叠加数量
            CartItemRedisVO existVO = cartMap.get(cartItemDTO.getSkuId());
            cartItemVO.setNum(existVO.getNum() + cartItemDTO.getNum());
        }
        cartMap.put(cartItemDTO.getSkuId(), cartItemVO);

        // 4. 写入Cookie
        String newCookieData = JSON.toJSONString(cartMap);
        CookieUtils.setCartCookie(response, newCookieData);

        // 5. 返回结果
        CartOperateVO vo = new CartOperateVO();
        vo.setTotalNum(cartMap.size());
        return ResultDTO.success(vo);
    }

    /**
     * 未登录用户查询购物车（读取Cookie）
     */
    @GetMapping("/list")
    public ResultDTO<List&lt;CartItemVO&gt;> getGuestCartList(HttpServletRequest request) {
        String cookieData = CookieUtils.getCartCookie(request);
        if (!StringUtils.hasText(cookieData)) {
            return ResultDTO.success(Collections.emptyList());
        }

        // 解析Cookie数据并转换为VO
        Map<String, CartItemRedisVO> cartMap = JSON.parseObject(cookieData, new TypeReference<Map<String, CartItemRedisVO>>() {});
        List&lt;CartItemVO&gt; cartList = cartMap.values().stream()
                .map(redisVO -> {
                    CartItemVO vo = new CartItemVO();
                    BeanUtils.copyProperties(redisVO, vo);
                    // 补充实时库存
                    SkuStockVO stockVO = skuFeignClient.getSkuStock(redisVO.getSkuId());
                    vo.setStock(stockVO.getStock());
                    return vo;
                })
                .collect(Collectors.toList());

        return ResultDTO.success(cartList);
    }
}
```

### 4.2 方案 2：LocalStorage 存储

#### 4.2.1 技术原理

- 客户端：浏览器将购物车数据存储于 LocalStorage（容量 5-10MB），前端自主管理数据读写；
- 服务端：Java 仅提供 “数据同步接口”，不主动操作 LocalStorage，由前端在登录时主动上传数据。

#### 4.2.2 Java 实现（同步接口）

```java
@RestController
@RequestMapping("/api/cart/guest")
public class GuestCartSyncController {
    @Autowired
    private CartService cartService; // 复用登录状态的CartService（Redis+MySQL实现）

    /**
     * 未登录→登录时，同步LocalStorage购物车数据
     * @param userId 登录后的用户ID
     * @param guestCartList 前端上传的LocalStorage购物车列表
     * @return 同步结果
     */
    @PostMapping("/sync")
    public ResultDTO&lt;Void&gt; syncGuestCart(@RequestParam String userId,
                                         @RequestBody List&lt;CartItemDTO&gt; guestCartList) {
        if (CollectionUtils.isEmpty(guestCartList)) {
            return ResultDTO.success();
        }

        // 遍历LocalStorage数据，调用登录购物车的addItem方法
        for (CartItemDTO itemDTO : guestCartList) {
            // 此处会自动触发Redis+MySQL的加购逻辑（含库存校验、重复处理）
            cartService.addItem(userId, itemDTO);
        }

        return ResultDTO.success("LocalStorage购物车同步完成");
    }
}
```

#### 4.2.3 前端配合逻辑（伪代码）

```javascript
// 1. 未登录时，LocalStorage存储购物车数据
function addToLocalCart(skuId, num) {
    let cartList = JSON.parse(localStorage.getItem('guest_cart') || '[]');
    let existItem = cartList.find(item => item.skuId === skuId);
    if (existItem) {
        existItem.num += num;
    } else {
        // 调用商品接口获取名称、价格
        let skuInfo = await getSkuInfo(skuId);
        cartList.push({
            skuId: skuId,
            skuName: skuInfo.skuName,
            price: skuInfo.salePrice,
            num: num,
            selected: 1
        });
    }
    localStorage.setItem('guest_cart', JSON.stringify(cartList));
}

// 2. 登录成功后，同步LocalStorage数据到服务端
async function syncLocalCartToServer(userId) {
    let cartList = JSON.parse(localStorage.getItem('guest_cart') || '[]');
    if (cartList.length === 0) return;
    
    // 调用Java同步接口
    await axios.post('/api/cart/guest/sync', cartList, {
        params: { userId: userId }
    });
    
    // 同步完成后清空LocalStorage
    localStorage.removeItem('guest_cart');
}
```

## 5. 未登录→登录的数据合并流程

未登录用户登录后，需将客户端存储（Cookie/LocalStorage）的购物车数据合并至服务端，避免数据丢失，核心流程分 5 步。

![image](/面试题/高频面试问题/鹏宇老师/1182-java-ecommerce-shopping-cart-design/img-3e21dbfbe9bf.png)

### 5.1 合并核心逻辑（Java 实现）

```java
@Service
public class CartMergeService {
    @Autowired
    private CartService cartService; // Redis+MySQL混合实现
    @Autowired
    private ItemCartMapper cartMapper;
    @Autowired
    private RedissonClient redissonClient;
    private static final String CART_KEY_PREFIX = "cart:user:";

    /**
     * 未登录→登录数据合并（支持Cookie和LocalStorage两种来源）
     * @param userId 登录后用户ID
     * @param guestCartSource 客户端数据来源（COOKIE/LOCAL_STORAGE）
     * @param guestCartData 客户端数据（Cookie为Base64字符串，LocalStorage为JSON列表）
     */
    public ResultDTO&lt;Void&gt; mergeGuestCart(String userId, 
                                          String guestCartSource, 
                                          String guestCartData) {
        // 1. 解析客户端数据
        List&lt;CartItemDTO&gt; guestCartList = parseGuestCartData(guestCartSource, guestCartData);
        if (CollectionUtils.isEmpty(guestCartList)) {
            return ResultDTO.success("无客户端数据需合并");
        }

        // 2. 获取服务端已有的购物车数据（Redis）
        RLocalMap<String, String> serverCartMap = redissonClient.getLocalMap(CART_KEY_PREFIX + userId);
        Map<String, CartItemRedisVO> serverCartData = new HashMap<>();
        if (!serverCartMap.isEmpty()) {
            serverCartData = serverCartMap.values().stream()
                    .map(json -> JSON.parseObject(json, CartItemRedisVO.class))
                    .collect(Collectors.toMap(CartItemRedisVO::getSkuId, Function.identity()));
        }

        // 3. 数据合并（核心逻辑）
        List&lt;CartItemDTO&gt; mergeList = new ArrayList<>();
        for (CartItemDTO guestItem : guestCartList) {
            String skuId = guestItem.getSkuId();
            if (serverCartData.containsKey(skuId)) {
                // 服务端已存在：叠加数量（取客户端数量+服务端数量）
                CartItemRedisVO serverItem = serverCartData.get(skuId);
                guestItem.setNum(guestItem.getNum() + serverItem.getNum());
                // 选中状态：客户端选中则优先（用户近期操作）
                guestItem.setSelected(guestItem.getSelected() == 1 ? 1 : serverItem.getSelected());
            }
            mergeList.add(guestItem);
        }

        // 4. 合并后数据写入服务端（调用CartService）
        for (CartItemDTO mergeItem : mergeList) {
            cartService.addItem(userId, mergeItem);
        }

        // 5. 清空客户端数据（返回指令给前端/删除Cookie）
        if ("COOKIE".equals(guestCartSource)) {
            // 若为Cookie，需在Controller层通过HttpServletResponse删除
            return ResultDTO.success("合并完成，请清空客户端Cookie");
        } else {
            // 若为LocalStorage，前端自主清空
            return ResultDTO.success("合并完成，请清空LocalStorage");
        }
    }

    // 解析客户端数据（区分Cookie和LocalStorage）
    private List&lt;CartItemDTO&gt; parseGuestCartData(String source, String data) {
        List&lt;CartItemDTO&gt; result = new ArrayList<>();
        try {
            if ("COOKIE".equals(source)) {
                // Cookie数据：Base64解密→JSON→Map→List
                String decryptedData = new String(Base64.getDecoder().decode(data), StandardCharsets.UTF_8);
                Map<String, CartItemRedisVO> cartMap = JSON.parseObject(decryptedData, new TypeReference<Map<String, CartItemRedisVO>>() {});
                result = cartMap.values().stream()
                        .map(redisVO -> {
                            CartItemDTO dto = new CartItemDTO();
                            BeanUtils.copyProperties(redisVO, dto);
                            return dto;
                        })
                        .collect(Collectors.toList());
            } else if ("LOCAL_STORAGE".equals(source)) {
                // LocalStorage数据：直接解析JSON列表
                result = JSON.parseArray(data, CartItemDTO.class);
            }
        } catch (Exception e) {
            log.error("解析客户端购物车数据失败，source={}, data={}", source, data, e);
            throw new BusinessException("数据格式错误，合并失败");
        }
        return result;
    }
}
```

## 6. 选型建议与常见问题

### 6.1 不同业务规模选型表

**业务规模**
**未登录存储方案**
**登录存储方案**
**核心考量点**

小型电商（UV＜1 万）
Cookie
仅 Redis
低成本，简化架构

中小型电商（1 万＜UV＜10 万）
LocalStorage
仅 Redis
平衡体验与成本，避免过度设计

中大型电商（UV＞10 万）
LocalStorage
Redis+MySQL 混合
性能 + 可靠性双保障，支持高并发

高客单价平台
LocalStorage
Redis+MySQL 混合
数据零丢失，用户体验优先

### 6.2 常见问题与解决方案

**问题场景**
**解决方案**

Redis 宕机数据丢失
1. 配置 RDB+AOF 双持久化；2. 部署 Redis Cluster；3. 启动时从 MySQL 恢复

MySQL 批量同步性能瓶颈
1. 分批次同步（如按用户 ID 分段）；2. 使用 MySQL 批量插入 SQL；3. 避开业务高峰期同步

数据合并时并发冲突
1. 使用 Redis 分布式锁（RedissonLock）；2. 合并操作加用户级锁；3. 乐观锁（版本号）

客户端数据篡改
1. Cookie 设置 HttpOnly+Base64 加密；2. 服务端校验商品合法性（价格、库存）；3. 关键字段签名

## 7. 文档附录

### 7.1 核心 DTO/VO 定义

```java
// 购物车商品DTO（前端传参）
@Data
public class CartItemDTO {
    private String skuId; // 商品SKU
    private Integer num; // 数量
    private Integer selected; // 是否选中（1-是，0-否）
}

// 购物车操作结果VO
@Data
public class CartOperateVO {
    private Integer totalNum; // 购物车商品总数
    private String message; // 操作提示
}

// 购物车列表VO（前端展示）
@Data
public class CartItemVO {
    private String skuId;
    private String skuName;
    private BigDecimal price;
    private Integer num;
    private Integer selected;
    private Integer stock; // 实时库存
    private String imgUrl; // 商品图片（前端展示用）
}

// 购物车结算VO
@Data
public class CartSettlementVO {
    private List&lt;CartItemVO&gt; selectedItems; // 选中商品列表
    private BigDecimal totalAmount; // 总金额
    private BigDecimal discountAmount; // 优惠金额
    private BigDecimal payAmount; // 实付金额
}
```

### 7.2 依赖引用（pom.xml）

```xml
&lt;!-- SpringBoot核心 --&gt;
&lt;dependency&gt;
    &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
    &lt;artifactId&gt;spring-boot-starter-web&lt;/artifactId&gt;
&lt;/dependency&gt;

&lt;!-- MyBatis-Plus --&gt;
&lt;dependency&gt;
    &lt;groupId&gt;com.baomidou&lt;/groupId&gt;
    &lt;artifactId&gt;mybatis-plus-boot-starter&lt;/artifactId&gt;
    &lt;version&gt;3.5.3.1&lt;/version&gt;
&lt;/dependency&gt;

&lt;!-- Redisson --&gt;
&lt;dependency&gt;
    &lt;groupId&gt;org.redisson&lt;/groupId&gt;
    &lt;artifactId&gt;redisson-spring-boot-starter&lt;/artifactId&gt;
    &lt;version&gt;3.23.3&lt;/version&gt;
&lt;/dependency&gt;

&lt;!-- RabbitMQ --&gt;
&lt;dependency&gt;
    &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
    &lt;artifactId&gt;spring-boot-starter-amqp&lt;/artifactId&gt;
&lt;/dependency&gt;

&lt;!-- FastJSON --&gt;
&lt;dependency&gt;
    &lt;groupId&gt;com.alibaba&lt;/groupId&gt;
    &lt;artifactId&gt;fastjson&lt;/artifactId&gt;
    &lt;version&gt;2.0.32&lt;/version&gt;
&lt;/dependency&gt;

&lt;!-- MySQL驱动 --&gt;
&lt;dependency&gt;
    &lt;groupId&gt;com.mysql&lt;/groupId&gt;
    &lt;artifactId&gt;mysql-connector-j&lt;/artifactId&gt;
    &lt;scope&gt;runtime&lt;/scope&gt;
&lt;/dependency&gt;
```
