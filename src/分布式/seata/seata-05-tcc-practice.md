---
title: "Seata TCC 模式实战：库存、订单与秒杀"
sidebarGroup: "Seata"
shortTitle: "05 TCC 实战"
order: 5
date: 2026-09-06
category: "分布式"
tag:
  - "分布式"
  - "Seata"
  - "TCC"
description: "TCC 三阶段原理、银行转账模型，以及 10 万 QPS 秒杀场景下库存/订单/秒杀三服务的 Try-Confirm-Cancel 实战代码。"
---

> **Seata 系列 · 第 5/8 篇**  
> 上一篇：[《AT 模式 TM/RM 接入与秒杀实战》](/分布式/seata/seata-04-at-tm-rm)  
> 下一篇：[《TCC 三大优势与空回滚、悬挂、幂等》](/分布式/seata/seata-06-tcc-issues)

---

## 开头：AT 够用，为什么还要 TCC？

[上一篇 AT 秒杀实战](/分布式/seata/seata-04-at-tm-rm) 依赖 `undo_log` 自动回滚，接入成本低。TCC 则把业务拆成 **Try / Confirm / Cancel** 三步，由开发者显式实现资源预留与确认——适合对性能、跨库/非 SQL 资源有更高要求的场景。本文用同一套秒杀业务，走通 TCC 全链路。

---

## 一、TCC 与 AT 的本质差异

**AT 模式**依赖单个数据源本地事务，采用 WAL 思想：提交时写 `undo_log`，全局成功则删日志，失败则用日志回滚。

**TCC 模式**不再依赖 `undo_log`，仍是两阶段提交，但语义不同：

| 阶段 | 操作 | 含义 |
|------|------|------|
| 一阶段 | **Try** | 预留业务资源 / 数据校验 |
| 二阶段 | **Confirm** | 确认执行业务，实际提交数据；Try 成功则 Confirm 必成功，需保证幂等 |
| 二阶段 | **Cancel** | 取消执行业务，实际回滚数据，需保证幂等 |

![Seata TCC 模式流程图](/分布式/seata/p066-01.png)

TCC 是**应用层侵入式**的两阶段提交：Try 对应一阶段，Confirm/Cancel 对应二阶段。核心在于把业务逻辑分解为两个步骤，**不依赖 RM 对分布式事务的内建支持**。

---

## 二、银行转账：经典 TCC 建模

假设用户表有 `available_money`（可用余额）和 `frozen_money`（冻结余额）：

| 服务 | Try | Confirm | Cancel |
|------|-----|---------|--------|
| ServiceA（扣款方） | 校验余额，冻结 1000 | 冻结 -1000，余额 -1000 | 冻结 -1000，余额不变 |
| ServiceB（收款方） | 冻结 +1000 | 冻结 -1000，余额 +1000 | 冻结 -1000 |
| OrderService | 创建转账订单（待转账） | 状态 → 转账成功 | 状态 → 转账失败 |

业务方 `BusinessService` 只调用各服务的 **Try**；全局提交时 TM 驱动 **Confirm**，任意 Try 失败则驱动 **Cancel**——Confirm/Cancel 由框架回调，业务代码不直接调用。

---

## 三、10 万 QPS 秒杀 TCC 架构

![10 万 QPS 秒杀 TCC 分布式事务架构](/分布式/seata/p068-01.png)

三个 RM 服务：

- **库存服务**：Try 扣减库存（Prepare），Confirm 提交，Cancel 回滚
- **订单服务**：Try 创建订单，Confirm/Cancel 对应提交/回滚
- **秒杀服务（TM）**：`@GlobalTransactional` 编排 Try 调用

---

## 四、库存服务

### 4.1 Controller

```java
@Slf4j
@RestController
@RequestMapping("/api/tcc/sku/")
@Api(tags = "商品库存")
public class SeataTCCStockController {

    @Resource
    SeataStockServiceImpl seckillSkuStockService;

    @PostMapping("/minusStock/v1")
    @ApiOperation(value = "减少秒杀库存")
    boolean minusStock(@RequestBody BusinessActionContext actionContext,
                       @RequestParam("sku_id") Long skuId,
                       @RequestParam("uid") Long uId) {
        return seckillSkuStockService.minusStock(actionContext, skuId, uId);
    }

    @PostMapping("/commit/v1")
    @ApiOperation(value = "提交")
    boolean commit(@RequestBody BusinessActionContext actionContext) {
        return seckillSkuStockService.commit(actionContext);
    }

    @PostMapping("/rollback/v1")
    @ApiOperation(value = "回滚")
    boolean rollback(@RequestBody BusinessActionContext actionContext) {
        return seckillSkuStockService.rollback(actionContext);
    }
}
```

### 4.2 Service：Try / Confirm / Cancel

```java
@Slf4j
@Service
public class SeataStockServiceImpl {

    private Map<String, Statement> statementMap = new ConcurrentHashMap<>(100);
    private Map<String, Connection> connectionMap = new ConcurrentHashMap<>(100);

    @Resource
    private DataSource dataSource;

    // Try：查库存 → 不足则抛异常 → 扣减并暂存 Connection/Statement（未 commit）
    public boolean minusStock(BusinessActionContext inDto, Long skuId, Long userId) {
        try {
            log.info("减库存, prepare, xid:{}", inDto.getXid());
            Connection connection = dataSource.getConnection();
            connection.setAutoCommit(false);

            int stock = 0;
            PreparedStatement pstmt = connection.prepareStatement(
                "SELECT `sku_id`, `stock_count` FROM `seckill_sku` WHERE `sku_id`=?");
            pstmt.setLong(1, skuId);
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                stock = rs.getInt("stock_count");
            }
            rs.close();
            pstmt.close();

            if (stock <= 0) {
                connection.close();
                throw BusinessException.builder().errMsg("库存不够").build();
            }

            PreparedStatement stmt = connection.prepareStatement(
                "UPDATE `seckill_sku` SET `stock_count` = `stock_count` - 1 WHERE `sku_id` = ?");
            stmt.setLong(1, skuId);
            stmt.executeUpdate();
            statementMap.put(inDto.getXid(), stmt);
            connectionMap.put(inDto.getXid(), connection);
        } catch (SQLException e) {
            log.error("减库存失败:", e);
            return false;
        }
        return true;
    }

    // Confirm：connection 存在则 rollback（释放预留），清理 Map
    public boolean commit(BusinessActionContext dto) {
        String xid = dto.getXid();
        log.info("减库存, commit, xid:{}", xid);
        PreparedStatement statement = statementMap.get(xid);
        Connection connection = connectionMap.get(xid);
        try {
            if (connection != null) {
                connection.rollback(); // 演示代码：通过 rollback 释放 Try 阶段的未提交变更
            }
        } catch (SQLException e) {
            log.error("提交失败:", e);
            return false;
        } finally {
            cleanup(xid, statement, connection);
        }
        return true;
    }

    // Cancel：connection 存在则 commit（确认 Try 阶段的扣减）或 rollback，视业务设计而定
    public boolean rollback(BusinessActionContext dto) {
        String xid = dto.getXid();
        log.info("减库存, rollback, xid:{}", xid);
        PreparedStatement statement = statementMap.get(xid);
        Connection connection = connectionMap.get(xid);
        try {
            if (connection != null) {
                connection.rollback(); // 回滚 Try 阶段未提交的变更
            }
        } catch (SQLException e) {
            log.error("回滚失败:", e);
            return false;
        } finally {
            cleanup(xid, statement, connection);
        }
        return true;
    }

    private void cleanup(String xid, Statement statement, Connection connection) {
        statementMap.remove(xid);
        connectionMap.remove(xid);
        try {
            if (statement != null) statement.close();
            if (connection != null) connection.close();
        } catch (SQLException e) {
            log.error("归还连接失败:", e);
        }
    }
}
```

> 生产环境应使用「可用库存 + 冻结库存」两字段建模，而非裸 JDBC 暂存 Connection；此处保留讲义原始演示思路，便于理解 Try 阶段**资源预留、本地事务未最终提交**的语义。

---

## 五、订单服务

### 5.1 Controller

```java
@RestController
@RequestMapping("/api/tcc/order/")
@Api(tags = "秒杀练习 订单管理")
public class SeataTCCOrderController {

    @Resource
    TCCOrderServiceImpl seckillOrderService;

    @PostMapping("/addOrder/v1")
    @ApiOperation(value = "下订单")
    boolean addOrder(@RequestBody BusinessActionContext actionContext,
                     @RequestParam("sku_id") Long skuId,
                     @RequestParam("uid") Long uId) {
        return seckillOrderService.addOrder(actionContext, skuId, uId);
    }

    @PostMapping("/commit/v1")
    boolean commit(@RequestBody BusinessActionContext actionContext) {
        return seckillOrderService.commitAddOrder(actionContext);
    }

    @PostMapping("/rollback/v1")
    boolean rollback(@RequestBody BusinessActionContext actionContext) {
        return seckillOrderService.rollbackAddOrder(actionContext);
    }
}
```

### 5.2 Service 要点

Try 阶段：

1. 检查用户是否已下单（防重复秒杀）
2. `INSERT` 订单，`setAutoCommit(false)`，Connection 放入 Map 等待二阶段

Confirm：`connection.commit()` 真正落库。  
Cancel：`connection.rollback()`，并清理 Map（含空回滚判断：`connection == null` 直接返回）。

---

## 六、秒杀服务（TM）

```java
@RestController
@RequestMapping("/api/seckill/seglock/")
@Api(tags = "秒杀练习分布式事务 版本")
public class SeckillTCCController {

    @Resource
    TCCSeckillServiceImpl seataSeckillServiceImpl;

    @PostMapping("/doSeckill/v1")
    @ApiOperation(value = "秒杀")
    RestOut<SeckillDTO> doSeckill(@RequestBody SeckillDTO dto) {
        seataSeckillServiceImpl.doSeckill(dto);
        return RestOut.success(dto).setRespMsg("秒杀成功");
    }
}
```

```java
@Slf4j
@Service
public class TCCSeckillServiceImpl {

    @Autowired
    private OrderApi orderApi;
    @Autowired
    private StockApi stockApi;

    @GlobalTransactional
    public boolean doSeckill(@RequestBody SeckillDTO dto) {
        String xid = RootContext.getXID();
        log.info("-------> 分布式操作开始, xid={}", xid);

        BusinessActionContext actionContext = new BusinessActionContext();
        actionContext.setXid(xid);
        Long skuId = dto.getSeckillSkuId();
        Long uId = dto.getUserId();

        log.info("-------> 扣减库存");
        if (!stockApi.prepare(actionContext, skuId, uId)) {
            throw new RuntimeException("扣减库存失败");
        }

        log.info("-------> 下订单");
        if (!orderApi.prepare(actionContext, skuId, uId)) {
            throw new RuntimeException("保存订单失败");
        }

        log.info("-------> 分布式下订单操作完成");
        // 取消注释可模拟二阶段回滚：
        // throw new RuntimeException("调用二阶段 rollback");
        return true;
    }
}
```

TM 侧只需 `@GlobalTransactional` + 调用各 RM 的 Try（prepare）；Confirm/Cancel 由 Seata TC 在二阶段 RPC 回调。

---

## 七、两个直觉例子

### 7.1 金额扣减

![金额扣减 TCC 两阶段示意](/分布式/seata/p077-01.png)

初始：商品 30 元，账户 `money=100`。

| 阶段 | 操作 | 可用余额 | 冻结余额 |
|------|------|----------|----------|
| Try | 冻结 30 | 70 | 30 |
| Confirm | 确认扣款 | 70（total 变 70） | 0 |
| Cancel | 回滚 | 100 | 0 |

业务只写 Try；Confirm/Cancel 由框架调用。

### 7.2 库存扣减

初始库存 100，下单 30 件：

| 阶段 | 可用库存 | 冻结库存 |
|------|----------|----------|
| Try | 70 | 30 |
| Confirm | 70（total 变 70） | 0 |
| Cancel | 100 | 0 |

---

## 八、实验观察点

对比 AT 模式，TCC 实验可观察：

| 阶段 | 观察位置 | 关注点 |
|------|----------|--------|
| 一阶段全局 | 秒杀服务 → TC 表 | 全局事务记录 |
| 一阶段分支 | 库存/订单服务 | 本地预留状态（非 undo_log） |
| 二阶段全局 | TC 表 | 提交/回滚决议 |
| 二阶段分支 | RM 回调日志 | Confirm/Cancel 执行 |

提交实验：两个 Try 均成功 → TC 驱动 Confirm。  
回滚实验：Try 中抛异常 → TC 驱动 Cancel。

---

## 小结

- TCC = Try（预留）+ Confirm/Cancel（框架回调），业务侵入高于 AT，灵活性更高。
- 秒杀三服务：TM 编排 Try，RM 各自实现三方法；XID 通过 `BusinessActionContext` 传递。
- 金额/库存例子说明「冻结字段」是 TCC 建模的关键。

下一篇展开 TCC 相对 AT 的**三大性能优势**，以及生产必谈的**幂等、空回滚、防悬挂**。

---

## 系列导航

| 篇目 | 主题 |
|------|------|
| [01 场景与总览](/分布式/seata/seata-01-distributed-tx-overview) | 分布式事务场景 |
| [02 AT 模式](/分布式/seata/seata-02-at-mode) | 角色、两阶段、XA 对比 |
| [03 TC Server](/分布式/seata/seata-03-tc-server) | file/db 存储与 Nacos |
| [04 AT 实战](/分布式/seata/seata-04-at-tm-rm) | TM/RM 接入与秒杀 |
| **05 TCC 实战** | 本文 |
| [06 TCC 常见问题](/分布式/seata/seata-06-tcc-issues) | 优势与三大坑 |
| [07 TCC 源码](/分布式/seata/seata-07-tcc-source) | 切面、Fence、XID |
| [08 隔离与面试](/分布式/seata/seata-08-isolation-interview) | RC、脏读写、面试题 |
