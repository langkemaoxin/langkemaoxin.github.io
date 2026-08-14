---
title: "Repository 模式与模型对象规范"
sidebarGroup: "战术与分层"
shortTitle: "11 Repository"
order: 11
date: 2026-11-08
category: "软件架构"
tag:
  - "DDD"
  - "Repository"
  - "Entity"
  - "战术设计"
---

> **DDD 领域驱动设计 · 第 11/15 篇**  
> 上一篇：[10 六边形新应用](/软件架构/ddd-tactics/ddd-10-hexagonal-new-app) · 下一篇：[12 领域层规范](/软件架构/ddd-tactics/ddd-12-domain-layer)

---

## 从 Repository 反向理解 DDD

Entity、Value Object、Aggregate Root 等概念较抽象。本文**从可落地的 Repository 入手**，先确定 DO / Entity / DTO 规范，再回头理解 Entity 与聚合——降低「只会建模、不会写代码」的落差。

### 概念速览

| 概念 | 要点 |
|------|------|
| **Entity** | 有唯一标识，可持久化、可变 |
| **Value Object** | 无标识，不可变，创建后不应再改属性 |
| **Aggregate Root** | 聚合入口；外部只能通过根访问内部实体 |
| **Domain Service** | 不属于 Entity/VO 的重要领域行为 |
| **Domain Event** | 领域内活动的建模 |
| **Factory** | 封装复杂聚合的创建 |
| **Repository** | 隔离领域层与持久化实现 |

---

## 为什么要 Repository

### 贫血模型的问题

JPA `@Entity` 常让开发者把 Entity 当成**表映射**，业务全在 Service / Controller / Utils：

1. 无法保证模型完整性与一致性（属性公开，靠调用方维护）  
2. 操作可发现性差（从字段看不出有哪些业务、边界是什么）  
3. 校验与计算逻辑重复  
4. 表结构一变，全链路跟着改  
5. 强依赖 DB、RPC、中间件  

根因：**混淆了 Data Model（如何持久化）与 Domain Model（业务如何联动）**。Repository 正是连接两者的关键。

### DAO 是「固件」，Repository 是「软件」

Uncle Bob 的比喻：

- **硬件**：数据库选型后难变更  
- **固件**：DAO 强依赖 DB，像路由器固件  
- **软件**：业务代码应像软件一样易演进  

DAO 的「固化」会传播：直接在业务里 `orderDAO.insert` + `cache.put`，加缓存后每个调用点都要改，漏一处即 bug。**Repository 隔离业务与持久化/缓存细节**，让上层保持「软件」特性。

---

## 三种模型对象

![DO、Entity、DTO 在分层中的位置](/软件架构/ali/p53-01.png)

| | DO | Entity | DTO |
|---|-----|--------|-----|
| 目的 | 数据库表映射 | 业务逻辑 | 适配入参/出参 |
| 层级 | Infrastructure | Domain | Application |
| 命名 | `XxxDO` | `Xxx` | `XxxDTO` / `XxxCommand` |
| 字段 | 表字段名/类型 | 通用语言 + DP | 与调用方约定 |
| 序列化 | 否 | 否 | 是 |
| 转化器 | Data Converter | — | DTO Assembler |

**Entity 生命周期在内存中**，字段与表结构不必一致；**DO 仅用于 ORM**，业务代码禁止直接操作 DO。

### 非 1:1:1 的常见关系

![复杂 Entity 拆多表](/软件架构/ali/p53-02.png)

- 大 Entity 拆多表（如商品详情单独存）  
- 多 Entity 合单表（父子订单 + 分库分表）  
- 一 Entity 多 DTO（列表用精简 DTO）  
- 多 Entity 合一 DTO（订单详情带商品，减少 RPC）

![DTO 与 Entity 多种映射关系](/软件架构/ali/p54-01.png)

### 转化器

- **DTO Assembler**（Application 层）：Entity → DTO  
- **Data Converter**（Infrastructure 层）：Entity ↔ DO  

手写示例：

```java
public class DtoAssembler {
    public OrderDTO toDTO(Order order, Item item) {
        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setItemTitle(item.getTitle());
        dto.setDetailAddress(order.getAddress().getDetail());
        return dto;
    }
}
```

推荐 **MapStruct**（编译期生成，性能等同手写）：

```java
@Mapper
public interface DtoAssembler {
    DtoAssembler INSTANCE = Mappers.getMapper(DtoAssembler.class);

    @Mapping(target = "itemTitle", source = "item.title")
    @Mapping(target = "detailAddress", source = "order.address.detail")
    OrderDTO toDTO(Order order, Item item);

    Item toEntity(ItemDTO itemDTO);
}
```

---

## Repository 接口规范

### 三条原则

1. **接口名不用 SQL 语义**：用 `find` / `save` / `remove`，不用 `insert` / `select` / `update` / `delete`  
2. **入参出参是 Entity（Aggregate Root）**，不是 DO；接口定义在 **Domain 层**  
3. **避免「通用 Repository」**（如 Spring Data 全自动 CRUD）——扩展性差，复杂场景仍要重写  

基础接口：

```java
public interface Repository<T extends Aggregate<ID>, ID extends Identifier> {
    void attach(@NotNull T aggregate);
    void detach(@NotNull T aggregate);
    T find(@NotNull ID id);
    void remove(@NotNull T aggregate);
    void save(@NotNull T aggregate);
}

public interface Aggregate<ID extends Identifier> extends Entity<ID> {}
public interface Entity<ID extends Identifier> extends Identifiable<ID> {}
public interface Identifiable<ID extends Identifier> {
    ID getId();
}
public interface Identifier extends Serializable {}
```

业务扩展：

```java
// Domain 层
public interface OrderRepository extends Repository<Order, OrderId> {
    Long count(OrderQuery query);
    Page<Order> query(OrderQuery query);
    Order findInStore(OrderId id, StoreId storeId);
}
```

### 基础实现

```java
@Repository
public class OrderRepositoryImpl implements OrderRepository {
    private final OrderDAO dao;
    private final OrderDataConverter converter;

    @Override
    public Order find(OrderId orderId) {
        OrderDO orderDO = dao.findById(orderId.getValue());
        return converter.fromData(orderDO);
    }

    @Override
    public void save(Order aggregate) {
        if (aggregate.getId() != null && aggregate.getId().getValue() > 0) {
            dao.update(converter.toData(aggregate));
        } else {
            OrderDO orderDO = converter.toData(aggregate);
            dao.insert(orderDO);
            aggregate.setId(converter.fromData(orderDO).getId());
        }
    }
    // remove、query 等省略
}
```

---

## 复杂聚合与 Change-Tracking

父子订单场景：改一条 `LineItem` 价格， naive 实现会 **UPDATE 全部 LineItem**，产生无用写操作。

**变更追踪**让 `save` 只持久化真正变更的实体。主流方案：

- **Snapshot**：取出时存快照，save 时 Diff（Hibernate 思路）  
- **Proxy**：Setter 织入 Dirty 标记（Entity Framework 等）

Snapshot 实现骨架：

```java
public abstract class DbRepositorySupport<T extends Aggregate<ID>, ID extends Identifier>
        implements Repository<T, ID> {

    private final AggregateManager<T, ID> aggregateManager;

    @Override
    public T find(@NotNull ID id) {
        T aggregate = onSelect(id);
        if (aggregate != null) {
            attach(aggregate);
        }
        return aggregate;
    }

    @Override
    public void save(@NotNull T aggregate) {
        if (aggregate.getId() == null) {
            onInsert(aggregate);
            attach(aggregate);
            return;
        }
        EntityDiff diff = aggregateManager.detectChanges(aggregate);
        if (diff.isEmpty()) {
            return;
        }
        onUpdate(aggregate, diff);
        aggregateManager.merge(aggregate);
    }

    protected abstract void onInsert(T aggregate);
    protected abstract T onSelect(ID id);
    protected abstract void onUpdate(T aggregate, EntityDiff diff);
    protected abstract void onDelete(T aggregate);
}
```

![变更追踪：只更新 LineItem2 与 Order](/软件架构/ali/p60-01.png)

**注意**：高并发需乐观锁；未改 Entity 直接 `save` 可能不写 DB（与 Hibernate 一致），强制更新可 touch `gmtModified`。

---

## 迁移路径（以 Order 为例）

1. 创建 `Order` Entity（初期字段可与 DO 一致）  
2. `OrderDataConverter`（MapStruct 约两行）  
3. 单测保证 Entity ↔ DO 正确  
4. `OrderRepository` 接口 + 实现 + 单测  
5. 业务代码 `OrderDO` → `Order`  
6. `OrderDAO` 直接调用 → `OrderRepository`  
7. 回归单测  

完成后 Entity 与业务逻辑可独立演进，底层表结构变化主要改 Converter。

---

## 小结

Repository 的价值：**把业务从 DAO/DB「固件」中解放出来**，配合 DO / Entity / DTO 分层与转化器，形成可测试、可演进的持久化边界。下一篇进入**领域层设计规范**：聚合、领域服务类型，以及用领域事件处理副作用。
