---
title: "AT 模式 TM/RM 接入与秒杀实战"
sidebarGroup: "Seata"
shortTitle: "04 AT TM/RM 实战"
order: 4
date: 2026-09-06
category: "分布式"
tag:
  - "分布式"
  - "Seata"
description: "Seata AT 客户端接入：TM/RM 交互、registry/file 配置、DataSourceProxy、undo_log 表与秒杀下单扣库存实战及排障。"
---

> **Seata 系列 · 第 4/8 篇**  
> 上一篇：[《搭建 Seata TC：file/db 存储与 Nacos 集群》](/分布式/seata/seata-03-tc-server)  
> 下一篇：[《Seata TCC 模式实战：库存、订单与秒杀》](/分布式/seata/seata-05-tcc-practice)

---

## 开头：TC 有了，业务怎么接？

[TC Server](/分布式/seata/seata-03-tc-server) 启动后，业务侧需要完成三件事：**配置 TM/RM 连接 TC**、**代理数据源写 undo_log**、在入口方法上**开启全局事务**。本文以「秒杀：扣库存 + 下订单」为例走完 AT 接入，并说明如何观察 undo_log 与 TC 表、排查常见配置错误。

---

## 一、TM / RM / TC 交互流程

![TM RM TC 交互总览](/分布式/seata/p043-01.png)

标准五步：

1. **TM** 向 **TC** 申请开启全局事务，TC 生成唯一 **XID**；
2. **XID** 通过 HTTP/Feign 等调用链传递到下游；
3. 各 **RM** 向 TC **注册分支**，纳入该 XID；
4. **TM** 请求 TC 对 XID **提交或回滚**；
5. **TC** 驱动该 XID 下所有分支提交或回滚。

![交互流程简图](/分布式/seata/p043-02.png)

| 组件 | 在秒杀示例中的对应 |
|------|-------------------|
| TC | seata-server（已搭建） |
| TM | seckill 聚合服务，`@GlobalTransactional` |
| RM | order 服务、stock 服务，各自数据库 + undo_log |

---

## 二、版本选型与依赖

Spring Cloud Alibaba 与 Spring Boot / Spring Cloud 版本需对齐，参考官方兼容表。

Maven 依赖示例（Seata **1.3.0** + SCA **2.1.3**）：

```xml
<!-- 分布式事务 Seata -->
<dependency>
  <groupId>com.alibaba.cloud</groupId>
  <artifactId>spring-cloud-starter-alibaba-seata</artifactId>
  <version>2.1.3.RELEASE</version>
  <exclusions>
    <exclusion>
      <groupId>io.seata</groupId>
      <artifactId>seata-spring-boot-starter</artifactId>
    </exclusion>
  </exclusions>
</dependency>
<dependency>
  <groupId>io.seata</groupId>
  <artifactId>seata-spring-boot-starter</artifactId>
  <version>1.3.0</version>
</dependency>
```

**坑点**：若使用 `druid-spring-boot-starter`，可能与 Seata 内置 druid 自动装配冲突，可改用 `druid 1.1.23` 纯依赖或排除冲突类。

---

## 三、数据库准备

### 3.1 业务库

演示创建两个 RM 库（生产应物理隔离；演示可同实例不同 schema）：

```bash
mysql -uroot -p123456 <<EOF
CREATE DATABASE \`seata-order-demo\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE \`seata-stock-demo\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`seata-order-demo\`.* TO 'root'@'%' IDENTIFIED BY '123456';
GRANT ALL PRIVILEGES ON \`seata-stock-demo\`.* TO 'root'@'%' IDENTIFIED BY '123456';
FLUSH PRIVILEGES;
EOF
```

![业务库创建](/分布式/seata/p045-01.png)

### 3.2 undo_log 表（每个 RM 库必建）

脚本：<https://github.com/seata-io/seata/blob/v1.3.0/script/client/at/db/mysql.sql>

```sql
-- 在 seata-order-demo、seata-stock-demo 各执行一次
CREATE TABLE IF NOT EXISTS `undo_log`
(
    `branch_id`     BIGINT       NOT NULL COMMENT 'branch transaction id',
    `xid`           VARCHAR(128) NOT NULL COMMENT 'global transaction id',
    `context`       VARCHAR(128) NOT NULL COMMENT 'undo_log context,such as serialization',
    `rollback_info` LONGBLOB     NOT NULL COMMENT 'rollback info',
    `log_status`    INT(11)      NOT NULL COMMENT '0:normal status,1:defense status',
    `log_created`   DATETIME(6)  NOT NULL COMMENT 'create datetime',
    `log_modified`  DATETIME(6)  NOT NULL COMMENT 'modify datetime',
    UNIQUE KEY `ux_undo_log` (`xid`, `branch_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8 COMMENT ='AT transaction mode undo table';
```

```bash
mysql -uroot -p123456 seata-order-demo -e "source /work/seata/conf/undo.sql;"
mysql -uroot -p123456 seata-stock-demo -e "source /work/seata/conf/undo.sql;"
```

![undo_log 表结构](/分布式/seata/p046-01.png)

**undo_log 作用**：一阶段保存前后镜像；二阶段全局回滚时反解析为反向 SQL。全局提交后异步删除。

---

## 四、registry.conf 与 file.conf

每个 TM/RM 微服务在 `resources` 下放置 **registry.conf**（及按需 **file.conf**）。

### 4.1 registry.conf

```properties
registry {
  type = "nacos"
  nacos {
    application = "seata-server"
    serverAddr = "cdh1:8848"
    namespace = "e385bfe2-e743-4910-8c32-e05759f9f9f4"
    cluster = "default"
    username = "nacos"
    password = "nacos"
  }
}

config {
  type = "file"
  file {
    name = "file.conf"
  }
}
```

`config.type=nacos` 时可将 file.conf 内容放到 Nacos，本地可不要 file.conf。

### 4.2 file.conf 核心：事务分组

```properties
transport {
  type = "TCP"
  server = "NIO"
  heartbeat = true
  enableClientBatchSendRequest = true
  serialization = "seata"
  compressor = "none"
}

service {
  # 事务分组名 -> TC 集群名（seata-server 注册到 Nacos 的 cluster）
  vgroupMapping.seata-seckill-demo-seata-service-group = "default"
  vgroupMapping.seata-order-demo-seata-service-group = "default"
  vgroupMapping.seata-stock-demo-seata-service-group = "default"
  # registry.type=file 时才用直连地址；nacos 模式下以注册中心为准
  default.grouplist = "127.0.0.1:8091"
  enableDegrade = false
  disableGlobalTransaction = false
}

client {
  rm {
    asyncCommitBufferLimit = 10000
    lock {
      retryInterval = 10
      retryTimes = 30
      retryPolicyBranchRollbackOnConflict = true
    }
    reportRetryCount = 5
    tableMetaCheckEnable = false
    reportSuccessEnable = false
    sqlParserType = druid
  }
  tm {
    commitRetryCount = 5
    rollbackRetryCount = 5
  }
  undo {
    dataValidation = true
    logSerialization = "jackson"
    logTable = "undo_log"
  }
  log {
    exceptionRate = 100
  }
}
```

### 4.3 事务分组是什么？

**事务分组（txServiceGroup）** 是 Seata 的**资源逻辑名**，类似「逻辑集群 id」。

解析链路：

1. 应用配置 `tx-service-group`（或 `spring.application.name` 派生）；
2. 在配置中心查 `service.vgroupMapping.<事务分组>` → 得到 **TC 集群名**（如 `default`）；
3. 按集群名从注册中心拉取 **seata-server** 实例列表；
4. 客户端连接可用 TC。

这样设计便于故障时 **failover**，而不把 TC 地址写死在业务里。

Spring Boot 配置示例：

```yaml
seata:
  enabled: true
  application-id: ${spring.application.name}
  tx-service-group: ${spring.application.name}-seata-service-group
  registry:
    type: nacos
    nacos:
      server-addr: cdh1:8848
      namespace: e385bfe2-e743-4910-8c32-e05759f9f9f4
  config:
    type: file
```

**TC 端 Nacos** 中必须有对应的 `service.vgroupMapping.<同上分组名>=default`（见 [第 3 篇](/分布式/seata/seata-03-tc-server)）。

---

## 五、DataSourceProxy：RM 必配

Seata 必须代理数据源，才能解析 SQL、写 undo_log。**未代理则无法回滚**。

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @ConfigurationProperties(prefix = "spring.datasource")
    public DruidDataSource druidDataSource() {
        return new DruidDataSource();
    }

    /**
     * 必须将 DataSourceProxy 设为主数据源，否则事务无法回滚
     */
    @Primary
    @Bean("dataSource")
    public DataSource dataSource(DruidDataSource druidDataSource) {
        return new DataSourceProxy(druidDataSource);
    }
}
```

Seata 1.3+ 若使用 `seata-spring-boot-starter` 自动配置，也可通过 `seata.enable-auto-data-source-proxy=true` 自动代理，但仍需确认 `@Primary` 数据源是代理后的实例。

---

## 六、事务注解

| 位置 | 注解 | 说明 |
|------|------|------|
| TM 入口 | `@GlobalTransactional` | 开启全局事务，绑定 XID |
| RM 业务 | `@Transactional` | 本地分支事务；与全局 XID 关联 |

```java
// TM：秒杀聚合服务
@GlobalTransactional
public void doSeckill(SeckillDTO dto) {
    orderFeignClient.addOrder(dto);
    stockFeignClient.minusStock(dto);
}

// RM：订单服务
@Transactional
public SeckillOrderDTO addOrder(SeckillDTO inDto) { ... }

// RM：库存服务
@Transactional
public SeckillSkuDTO minusStock(SeckillDTO inDto) { ... }
```

---

## 七、秒杀实战：模块与代码

### 7.1 模块架构

![秒杀模块架构](/分布式/seata/p052-01.png)

![模块角色：TM 与 RM](/分布式/seata/p052-02.png)

| 服务 | 角色 | 库 |
|------|------|-----|
| seata-seckill-demo | TM | 无业务库 |
| seata-order-demo | RM | seata-order-demo + undo_log |
| seata-stock-demo | RM | seata-stock-demo + undo_log |

### 7.2 Controller 与 TM 实现

```java
@RestController
@RequestMapping("/api/seckill/seglock/")
public class SeckillController {

    @Resource
    private SeataSeckillServiceImpl seataSeckillService;

    @PostMapping("/doSeckill/v1")
    public RestOut<SeckillDTO> doSeckill(@RequestBody SeckillDTO dto) {
        seataSeckillService.doSeckill(dto);
        return RestOut.success(dto).setRespMsg("秒杀成功");
    }
}
```

```java
public class SeataSeckillServiceImpl {

    @Autowired
    private SeataDemoOrderFeignClient orderFeignClient;
    @Autowired
    private SeataDemoStockFeignClient stockFeignClient;

    @GlobalTransactional
    public void doSeckill(SeckillDTO dto) {
        orderFeignClient.addOrder(dto);
        stockFeignClient.minusStock(dto);
    }
}
```

### 7.3 Feign 客户端

```java
@FeignClient(name = "seata-order-demo", path = "/seata-order-demo/api/seckill/order/")
public interface SeataDemoOrderFeignClient {
    @PostMapping("/addOrder/v1")
    RestOut<SeckillOrderDTO> addOrder(@RequestBody SeckillDTO dto);
}

@FeignClient(name = "seata-stock-demo", path = "/seata-stock-demo/api/seckill/sku/")
public interface SeataDemoStockFeignClient {
    @PostMapping("/minusStock/v1")
    RestOut<SeckillSkuDTO> minusStock(@RequestBody SeckillDTO dto);
}
```

Seata 与 Spring Cloud 集成后，**XID 默认通过 Feign 拦截器传递**；若自定义 HTTP 客户端，需手动传播 `RootContext.KEY_XID` 请求头。

### 7.4 订单 RM

```java
@RestController
@RequestMapping("/api/seckill/order/")
public class OrderController {

    @Resource
    private SeckillOrderServiceImpl seckillOrderService;

    @PostMapping("/addOrder/v1")
    public RestOut<SeckillOrderDTO> addOrder(@RequestBody SeckillDTO dto) {
        SeckillOrderDTO orderDTO = seckillOrderService.addOrder(dto);
        return RestOut.success(orderDTO).setRespMsg("下订单成功");
    }
}
```

```java
@Transactional
public SeckillOrderDTO addOrder(SeckillDTO inDto) {
    long skuId = inDto.getSeckillSkuId();
    Long userId = inDto.getUserId();

    SeckillOrderPO checkOrder = SeckillOrderPO.builder()
        .skuId(skuId).userId(userId).build();
    long insertCount = seckillOrderDao.count(Example.of(checkOrder));
    if (insertCount >= 1) {
        throw BusinessException.builder().errMsg("重复秒杀").build();
    }

    SeckillOrderPO order = SeckillOrderPO.builder()
        .skuId(skuId).userId(userId).build();
    order.setCreateTime(new Date());
    order.setStatus(SeckillConstants.ORDER_VALID);
    seckillOrderDao.save(order);

    SeckillOrderDTO dto = new SeckillOrderDTO();
    BeanUtils.copyProperties(order, dto);
    return dto;
}
```

### 7.5 库存 RM

```java
@RestController
@RequestMapping("/api/seckill/sku/")
public class StockController {

    @Resource
    private SeataStockServiceImpl seckillSkuStockService;

    @PostMapping("/minusStock/v1")
    public RestOut<SeckillSkuDTO> minusStock(@RequestBody SeckillDTO dto,
                                             HttpServletRequest request) {
        String xid = request.getHeader(RootContext.KEY_XID);
        if (xid != null) {
            RootContext.bind(xid);
        }
        SeckillSkuDTO skuDTO = seckillSkuStockService.minusStock(dto);
        return RestOut.success(skuDTO).setRespMsg("减少秒杀库存成功");
    }
}
```

```java
@Transactional
public SeckillSkuDTO minusStock(SeckillDTO inDto) {
    long skuId = inDto.getSeckillSkuId();
    Optional<SeckillSkuPO> optional = seckillSkuDao.findById(skuId);
    if (!optional.isPresent()) {
        throw BusinessException.builder().errMsg("商品不存在").build();
    }
    SeckillSkuPO po = optional.get();
    if (po.getStockCount() <= 0) {
        throw BusinessException.builder().errMsg("库存不够").build();
    }
    seckillSkuDao.decreaseStockCountById(skuId);

    SeckillSkuDTO dto = new SeckillSkuDTO();
    BeanUtils.copyProperties(po, dto);
    dto.setStockCount(po.getStockCount() - 1);
    return dto;
}
```

![秒杀 AT 架构回顾](/分布式/seata/p057-01.png)

---

## 八、实验：观察 undo_log 与 TC 表

同步调用可观察 **三个阶段**：

1. 主事务调用分支**之前**（全局事务开启）；
2. 分支结束**返回之前**（一阶段：业务 + undo_log 已提交）；
3. 分支提交后、主事务提交**之前**（二阶段进行中）。

### 8.1 正常执行

| 阶段 | 观察位置 | 预期 |
|------|----------|------|
| 一阶段全局 | TC 库 `global_table`、`branch_table` | 出现 XID、分支记录 |
| 一阶段分支 | 业务库 `undo_log` | 每个 RM 有 rollback_info |
| 全局锁 | TC 库 `lock_table` | 持有相关行锁记录 |
| 二阶段提交 | `undo_log` | 记录被清理 |
| 二阶段提交 | `global_table` | 状态变为 committed |

![正常执行观察点](/分布式/seata/p065-01.png)

### 8.2 异常回滚

例如在 `addOrder` 后、`minusStock` 中故意抛「库存不够」：

| 观察项 | 预期 |
|--------|------|
| 订单库业务数据 | 回滚，订单未插入 |
| 订单库 undo_log | 回滚后清理 |
| TC `global_table` | 状态 Rollbacked |
| 库存库 | 无扣减 |

---

## 九、常见错误排查

### 9.1 `no available service 'null' found`

![NettyClientChannelManager 报错](/分布式/seata/p064-01.png)

根因多为 **事务分组未配置或未映射**：

1. 确认 `seata.tx-service-group` 与 `file.conf` / Nacos 中 `vgroupMapping.xxx` **名称一致**；
2. 确认 TC 端 Nacos 已配置同名 `service.vgroupMapping.xxx=default`；
3. 确认 Nacos 上 **seata-server** 实例健康、namespace 一致。

![vgroupMapping 配置对应关系](/分布式/seata/p064-02.png)

### 9.2 全局提交但分支未回滚

- 数据源未用 **DataSourceProxy**；
- RM 库缺少 **undo_log** 表；
- 业务 SQL 非 AT 支持类型（如部分复杂 SQL 需检查 parser）。

### 9.3 Feign 调用未纳入全局事务

- XID 未传递：检查 Seata Feign 依赖与 `RootContext.KEY_XID` 请求头；
- 下游未启 Seata 或未代理数据源。

---

## 十、与 TCC 的衔接

同一秒杀场景可用 AT（本文）或 TCC（[第 5 篇](/分布式/seata/seata-05-tcc-practice)）实现。AT 适合快速落地；TCC 在资源预留、性能调优上更灵活，但需编写 Try/Confirm/Cancel。

---

## 小结

- **TM** 用 `@GlobalTransactional` 开全局事务；**RM** 用 **DataSourceProxy + @Transactional + undo_log 表**。
- **事务分组** 通过 `vgroupMapping` 映射到 TC 集群，是与 Nacos 联调时最易踩坑的配置。
- 实验时对照 **undo_log** 与 TC 三表（`global_table` / `branch_table` / `lock_table`）理解 [AT 两阶段](/分布式/seata/seata-02-at-mode)。
- 下一篇进入 **TCC 模式** 实战。
