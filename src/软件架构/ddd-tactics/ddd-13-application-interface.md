---
title: "Interface 与 Application：编排与协作"
sidebarGroup: "战术与分层"
shortTitle: "13 应用层与接口层"
order: 13
date: 2026-11-08
category: "软件架构"
tag:
  - "DDD"
  - "应用层"
  - "接口层"
  - "CQE"
  - "防腐层"
---

> **DDD 领域驱动设计 · 第 13/15 篇**  
> 上一篇：[《领域层设计：聚合、副作用与领域事件》](/软件架构/ddd-tactics/ddd-12-domain-layer)  
> 下一篇：[《COLA 应用架构与工业级脚手架》](/软件架构/ddd-practice/ddd-14-cola-scaffold)

---

## 开头：流水账代码的出路

老系统重构里，常见两类问题：在对外 API 里直接写业务逻辑，或在一个 Service 里堆大量接口，导致逻辑无法收敛、复用性差。DDD 没有固定架构风格，核心是**域模型驱动业务**——四层架构、事件驱动、CQRS、六边形等都可以承载这一思想。

本篇聚焦 **Interface 层**与 **Application 层**的设计规范：如何把 checkout 这类流水账代码拆成职责清晰的模块，以及 Orchestration（编排）与 Choreography（协作）两种流程模式如何选型。

---

## 一、四层架构回顾

传统 DDD 四层：

| 层 | 职责 |
|----|------|
| **User Interface** | 对外访问（API），展示信息、解释用户命令 |
| **Application** | 定义软件要完成的任务，指挥领域对象解决问题 |
| **Domain** | 表达业务概念、状态与规则 |
| **Infrastructure** | 提供通用技术能力（存储、中间件等） |

基础设施层代码相对固化，变动需大量回归；存储与中间件调用应沉淀在此层。

![传统四层架构](/软件架构/ali/p97-01.png)

---

## 二、下单链路：流水账的问题

典型 checkout 接口把 Session、参数校验、查商品、扣库存、算价、建单、持久化全写在一个 Controller 里：

```java
@RestController
@RequestMapping("/")
public class CheckoutController {
    @Resource
    private ItemService itemService;
    @Resource
    private InventoryService inventoryService;
    @Resource
    private OrderRepository orderRepository;

    @PostMapping("checkout")
    public Result<OrderDO> checkout(Long itemId, Integer quantity) {
        Long userId = SessionUtils.getLoggedInUserId();
        if (userId <= 0) {
            return Result.fail("Not Logged In");
        }
        if (itemId <= 0 || quantity <= 0 || quantity >= 1000) {
            return Result.fail("Invalid Args");
        }
        ItemDO item = itemService.getItem(itemId);
        if (item == null) {
            return Result.fail("Item Not Found");
        }
        boolean withholdSuccess = inventoryService.withhold(itemId, quantity);
        if (!withholdSuccess) {
            return Result.fail("Inventory not enough");
        }
        Long cost = item.getPriceInCents() * quantity;
        OrderDO order = new OrderDO();
        order.setItemId(itemId);
        order.setBuyerId(userId);
        order.setSellerId(item.getSellerId());
        order.setCount(quantity);
        order.setTotalCost(cost);
        orderRepository.createOrder(order);
        return Result.success(order);
    }
}
```

**本质问题**：违背 SRP（单一职责）。业务计算、校验、基础设施、通信协议混在一起，任何一部分变更都会牵动整段代码，复杂度与分支不断叠加，最终成为无人敢动的大包袱。

**重构方向**：

1. 分离 **Interface 层**，处理网络协议相关逻辑
2. 从业务场景找出 **Use Case**，用 Command / Query / Event 承接
3. 分离 **Application 层**，编排流程，每个方法代表流程中的一个节点
4. 横切关注点（鉴权、异常、校验、缓存、日志）统一处理

---

## 三、Interface 接口层

### 3.1 为何要单独一层

MVC Controller 不是唯一重灾区。以下入口都可能把协议与业务绑死：

- HTTP：Spring MVC、Spring Cloud
- RPC：Dubbo、gRPC
- MQ 消费者：`onMessage`、`MessageListener`
- WebSocket、文件监听、分布式调度等

共同点：自带网络/协议语义。协议与业务混杂会导致代码无法复用。Interface 层作为**对外门户**，负责协议转化与业务解耦。

**组成**：协议转化、统一鉴权、Session 管理、限流、前置缓存、异常处理、访问日志。有 API 网关时可抽离部分能力，但应用内独立的 Interface 层仍有必要。

### 3.2 Result vs Exception

规范：

- **Interface 层**（HTTP/RPC）：返回 `Result`，捕捉所有异常
- **Application 层**：返回 DTO，不负责统一异常处理

```java
@PostMapping("checkout")
@ResultHandler
public Result<OrderDTO> checkout(Long itemId, Integer quantity) {
    CheckoutCommand cmd = new CheckoutCommand();
    cmd.setItemId(itemId);
    cmd.setQuantity(quantity);
    OrderDTO orderDTO = checkoutService.checkout(cmd);
    return Result.success(orderDTO);
}
```

可用 AOP + `@ResultHandler` 注解统一异常捕获，避免每个接口重复 try-catch。

### 3.3 接口要「小而美」

传统 REST/RPC 习惯同一领域方法收进一个 Controller/Service，但上游业务多时，强行统一会导致参数膨胀、方法膨胀。例如宠物卡与亲子卡共用 `openCard`，未来需求分化后整个类难以维护。

**规范**：一个 Interface 类面向**单一业务**或**同类需求**，避免用同一类承接不同类型业务。

```java
// 反例：参数膨胀、语义丢失、接口膨胀
public interface CardService {
    Result openCard(int petType, int babyAge);
    Result openCardV2(Map<String, Object> params);
    Result openPetCard(int petType);
    Result openBabyCard(int babyAge);
}

// 正例：按业务拆分
public interface PetCardService {
    Result openPetCard(int petType);
}
public interface BabyCardService {
    Result openBabyCard(int babyAge);
}
```

Interface 只是协议层，真实逻辑在 Application 层。**Interface 与 Application 是多对多关系**：

![Interface 与 Application 多对多](/软件架构/ali/p102-01.png)

接口层随业务快速变化；Application 层相对稳定。

---

## 四、Application 应用层

### 4.1 核心组成

- **ApplicationService**：流程编排，不含业务逻辑
- **DTO Assembler**：领域模型 → 对外 DTO
- **Command / Query / Event**：入参
- **DTO**：出参

### 4.2 CQE：语意化参数

CQRS（Command Query Responsibility Segregation）要求：**改状态的是 Command，只读的是 Query**。

| 类型 | 含义 |
|------|------|
| **Command** | 调用方明确想让系统执行的写操作，通常有返回值（同步结果或异步已接受） |
| **Query** | 明确查询，不影响系统状态 |
| **Event** | 已发生的事实，系统需据此改变或响应；Application 层 Event 类似 Domain Event，但更多是外部通知机制 |

![CQE 与 CQRS](/软件架构/ali/p103-01.png)

传统写法的问题：接口膨胀、难扩展、难测试、**参数无语意**。

**规范**：

- ApplicationService 入参**只能是一个** Command、Query 或 Event
- 唯一例外：按单一 ID 查询可省略 Query 对象
- **不同语意禁止复用 CQE**（Create 与 Update 即使字段相同也要分开）

```java
public interface CheckoutService {
    OrderDTO checkout(@Valid CheckoutCommand cmd);
    List<OrderDTO> query(OrderQuery query);
    OrderDTO getOrder(Long orderId);
}

@Data
public class CheckoutCommand {
    @NotNull(message = "用户未登陆")
    private Long userId;
    @NotNull @Positive
    private Long itemId;
    @NotNull @Min(1) @Max(1000)
    private Integer quantity;
}
```

**CQE vs DTO**：CQE 有「意图」，须保证正确性；DTO 是数据容器，与模型一一对应、数量有限。校验应前置到 CQE（JSR 303/380 + `@Valid`），避免在 ApplicationService 里写参数校验。

### 4.3 ApplicationService：只做编排

ApplicationService 是剥离校验、领域计算、持久化后的**胶水层**。交易领域常见 5 个用例：下单、支付成功、支付失败关单、物流更新、关闭订单——对应 5 个 Command/Event 方法。

**三种组织形态**：

1. 一个 ApplicationService 类覆盖完整业务流程（适合简单场景）
2. 复杂流程拆出 `CommandHandler` / `EventHandler`
3. CommandBus / EventBus 动态 dispatch（**不推荐**：运行时路由缺乏静态关联，链路难 trace）

**判断「流程 vs 逻辑」**：

| 规则 | 说明 |
|------|------|
| 避免 if/else 分支 | 循环复杂度尽量为 1；业务判断进 DomainService/Entity。Precondition 式中断（如库存不足抛异常）可接受 |
| 不做计算 | 如 `totalCost = price * quantity` 应进 Entity |
| 转化交给 Assembler | Entity → DTO 用 MapStruct 等 |

**常用套路**：

1. **准备数据**：从外部或 Repository 取 Entity/VO/DTO
2. **执行操作**：创建对象、调用领域方法（纯内存）
3. **持久化**：保存或影响外部系统（分布式事务另议）

**出参规范**：ApplicationService **永远返回 DTO，不返回 Entity**——构建领域边界、降低规则依赖、支持多 Entity 组合封装。

### 4.4 防腐层（ACL）

ApplicationService 直接依赖 `ItemService`、`InventoryService`、`ItemDO` 时，外部变更会传导到应用层。ACL 通过 Facade/Gateway 隔离：

![无防腐层 vs 有防腐层](/软件架构/ali/p113-01.png)

```java
public interface ItemFacade {
    ItemDTO getItem(Long itemId);
}

@Service
public class ItemFacadeImpl implements ItemFacade {
    @Resource
    private ExternalItemService externalItemService;

    @Override
    public ItemDTO getItem(Long itemId) {
        ItemDO itemDO = externalItemService.getItem(itemId);
        if (itemDO == null) return null;
        ItemDTO dto = new ItemDTO();
        dto.setItemId(itemDO.getItemId());
        dto.setTitle(itemDO.getTitle());
        dto.setPriceInCents(itemDO.getPriceInCents());
        dto.setSellerId(itemDO.getSellerId());
        return dto;
    }
}
```

ACL 要点：

1. 返回值必须是本地 VO/DTO/基本类型，不返回外部模型；捕获外部异常并转本地异常
2. 外部错误码转本地异常，不向上透传错误码
3. 按需返回字段，避免大而全 DTO

Repository 可视为特殊 ACL，屏蔽持久化细节。

---

## 五、Orchestration vs Choreography

复杂流程有两种模式（注意：两者都被译作「编排」，含义不同）：

| | Orchestration（编排） | Choreography（协作） |
|---|----------------------|---------------------|
| 类比 | 交响乐团，指挥统一调度 | 舞剧，各舞者自主配合 |
| 触发 | 一个节点/服务主动驱动全流程 | 各服务独立响应事件 |
| 依赖 | 调用方强依赖被调方 | 服务间无直接调用，下游仍可能依赖上游事件类 |
| 扩展 | 新流程常需改代码 | 可增换服务而不改上游 |
| 链路 | Command-Driven | Event-Driven |
| 职责 | 有主动调用方，对全流程负责 | 无单一负责人，各管各的触发条件 |

**案例：下单 → 支付 → 发货**

![Orchestration 编排模式](/软件架构/ali/p116-01.png)

![Choreography 协作模式](/软件架构/ali/p116-02.png)

**选型方法**：

1. **看依赖方向**：下游对上游无感知 → 事件驱动；上游必须感知下游 → 指令驱动
2. **找业务「负责人」**：如下单系统不应负责通知卖家，订单系统推进状态时主动触发更合适

**重要澄清**：指令驱动 ≠ 同步，事件驱动 ≠ 异步。差异在于事情是否**已经发生**。

复杂业务往往两种模式并存；依赖关系或负责人理不清时，可尝试切换模式。勿把 EDA/Reactive 硬套指令驱动业务。

**与 DDD 分层的关系**：

- O & C 是 **Interface 层**关注点：Orchestration = 对外 API，Choreography = 消息/事件
- **Application 层无感知**——ApplicationService 天然处理 Command/Query/Event，驱动力由 Interface 决定

![O&C 与分层关系](/软件架构/ali/p118-01.png)

---

## 六、设计规范总结

### Interface 层

- 协议转化、Session 等横切能力
- 接口小而美，按业务拆分，避免大而全入参
- 统一返回 `Result`，AOP 统一异常处理

### Application 层

- 入参：Command / Query / Event（单 ID 查询除外）
- CQE 不复用、Bean Validation 前置校验
- 出参：DTO + Assembler；异常直接抛出
- 只做编排：无业务分支、无计算
- ACL 隔离外部依赖

---

## 七、DDD 与微服务的区别

![DDD 与微服务对比](/软件架构/ali/p121-01.png)

| 维度 | DDD | 微服务 |
|------|-----|--------|
| 核心诉求 | 业务架构映射到系统架构，业务变则架构随之调整 | 业务层复用、技术层解耦，模块可独立选型与治理 |
| 设计驱动 | 按业务语义抽象领域模型，而非 DB 表驱动 | 服务边界与业务一致，物理部署灵活 |

两者互补：DDD 解决「如何建模」，微服务解决「如何部署与治理」。Interface/Application 分层正是战术落地的基础，下一篇进入 COLA 工业级脚手架。

---

## 本篇小结

- 流水账代码违背 SRP；Interface 解协议、Application 编排用例
- CQE 让入参有语意；ApplicationService 只做胶水，逻辑进 Domain
- ACL 隔离外部变化；Orchestration 与 Choreography 按依赖与负责人选型
- DDD 关注模型与架构映射，微服务关注独立部署与技术自治
