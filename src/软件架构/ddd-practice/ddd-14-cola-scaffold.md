---
title: "COLA 应用架构与工业级脚手架"
sidebarGroup: "落地实践"
shortTitle: "14 COLA 与脚手架"
order: 14
date: 2026-11-08
category: "软件架构"
tag:
  - "DDD"
  - "COLA"
  - "微服务"
  - "CQRS"
  - "脚手架"
---

> **DDD 领域驱动设计 · 第 14/15 篇**  
> 上一篇：[《Interface 与 Application：编排与协作》](/软件架构/ddd-tactics/ddd-13-application-interface)  
> 下一篇：[《防腐层、生命值模型与系列复盘》](/软件架构/ddd-practice/ddd-15-acl-summary)

---

## 开头：从限界上下文到可运行代码

战略设计给出限界上下文，战术设计要落到**微服务内部结构**与**可复用脚手架**。本篇串联：微服务拆分与内部架构（分层、六边形、洋葱、CQRS），再以阿里开源 **COLA**（Clean Object-oriented & Layered Architecture）为例，说明工业级包结构与 CQE 流程如何落地。

---

## 一、战术微服务设计

### 1.1 限界上下文与微服务

微服务拆分要求：**足够内聚、足够独立、足够完备**——与限界上下文特征（最小完备、自我履行、稳定空间、独立进化）高度吻合。实践中常将 BC 与微服务一一对应，但并非绝对：

- BC 是逻辑边界；微服务还要考虑物理边界与质量属性（性能、可用性、安全）
- CQRS 下命令模型与查询模型同属一个 BC，却可能物理隔离

![限界上下文与微服务关系](/软件架构/bible/p147-01.png)

划分步骤：先按团队规模定粒度 → 再按语义相关、业务/非业务功能相关切分。同一概念在不同 BC 中含义不同——订单上下文里的「商品」是单价与折扣，库存上下文里是库存量与存放位置。

**一个 BC 是否等于一个微服务？** 相关性高的多个 BC 可共置一服务；访问量极大的领域可单独部署。BC 是拆分**指导**，还需结合技术因素。

### 1.2 微服务内部架构选型

领域层只关注领域模型，与基础设施完全脱钩；基础设施变化不应迫使领域层改动。常见模式：

| 模式 | 要点 |
|------|------|
| **分层架构** | 每层只与下方层耦合（严格/松散两种） |
| **六边形架构** | 端口-适配器，内外分离，一致地被用户/测试/批处理驱动 |
| **洋葱架构** | 在六边形基础上细分 Application / Domain Service / Domain Model |
| **CQRS** | 命令与查询职责分离，可独立部署与存储 |

![DDD 微服务四层骨架](/软件架构/bible/p149-01.png)

| 层 | 核心职能 |
|----|----------|
| 用户接口层 | 协议转换与适配、鉴权、参数校验、异常处理 |
| 应用层 | 编排领域服务、事务管理、发布应用事件 |
| 领域层 | 以聚合为基本单元组织代码 |
| 基础设施层 | Repository/防腐层接口的实现 |

分层优点：关注点分离、可替换实现、降低层间依赖、利于复用与标准化。代价：性能开销（可缓存缓解）、可能级联修改（依赖倒置可缓解）。

![六边形架构](/软件架构/bible/p150-01.png)

![洋葱架构](/软件架构/bible/p152-01.png)

### 1.3 CQRS 简述

CQS：对象方法要么改状态（Command），要么返回值（Query），不可兼得。CQRS 将读写分离到 API 甚至物理存储层面。

- **Command**：引起数据变更的操作（增删改）
- **Query**：不改变状态的查询

CQRS 常与 DDD、Event Sourcing 结合，提升各服务可扩展性、可维护性与可测试性。COLA 4.0 之前曾有 Command Bus / Query Bus，现已移除以简化架构。

![CQRS 架构示意](/软件架构/bible/p172-01.png)

---

## 二、COLA 架构概览

[COLA](https://github.com/alibaba/COLA) 是阿里团队开源的分层应用架构，目标降低复杂系统的熵值。COLA 4.0 拆为两部分：

- **COLA 架构（Archetype）**：代码模板，固化分层与分包
- **COLA 组件（Components）**：DTO、异常、状态机、扩展点、CatchLog 等通用组件

![COLA 分层对比传统三层](/软件架构/bible/p157-01.png)

传统「业务逻辑层」拆为 **Application + Domain + Infrastructure**：

| COLA 层 | 职责 |
|---------|------|
| **Adapter（展现/适配）** | Web / Wireless / WAP 路由适配，相当于更高层次的 Controller |
| **Application** | 获取输入、组装上下文、校验、调用领域层、发消息 |
| **Domain** | 核心业务逻辑，DomainService + Entity |
| **Infrastructure** | Tunnel（数据通道）、Config、Common；Gateway 实现与防腐 |

Application 层理论上可绕过 Domain 直接访问 Infrastructure（松散分层），但业务逻辑仍应优先落在 Domain。

![COLA 完整架构与包结构](/软件架构/bible/p158-01.png)

### 2.1 COLA v4 包结构

顶层按**领域**分包，领域内再按**功能**分包——功能内聚 + 领域内聚兼顾：

![领域 × 功能分包](/软件架构/bible/p163-01.png)

| 层次 | 包 | 功能 | 必选 |
|------|-----|------|------|
| Adapter | web / wireless / wap | 各端 Controller | 否 |
| App | executor | 处理 Command / Query | 是 |
| App | consumer | 外部消息 | 否 |
| App | scheduler | 定时任务 | 否 |
| Domain | model | 领域模型 | 否 |
| Domain | ability | DomainService | 否 |
| Domain | gateway | 领域网关（SPI） | 是 |
| Infra | gatewayimpl | 网关实现 | 是 |
| Infra | mapper / config | 持久化与配置 | 否 |
| Client | api / dto | 对外 API 与 DTO | 是 |

**Domain model 为何可选？** COLA 首先是应用架构，不是纯 DDD 架构。「无必要勿增实体」——错误抽象不如不抽象。但统一语言、限界上下文、防腐层思想仍应贯彻。

### 2.2 各层代码示例

**Adapter 层**——不叫 Controller 而叫 Adapter，因现代应用常同时支持 Web / Mobile / WAP：

```java
@RestController
public class CustomerController {
    @Autowired
    private CustomerServiceI customerService;

    @GetMapping(value = "/customer")
    public MultiResponse<CustomerDTO> listCustomerByName(
            @RequestParam(required = false) String name) {
        CustomerListByNameQry qry = new CustomerListByNameQry();
        qry.setName(name);
        return customerService.listByName(qry);
    }
}
```

**Client 模块**——服务接口定义（类似传统 Service Interface），含 api、dto、Command/Query：

Adapter 调 Client 接口，**实现在 App 层**：

```java
@Service
@CatchAndLog
public class CustomerServiceImpl implements CustomerServiceI {
    @Resource
    private CustomerListByNameQryExe customerListByNameQryExe;

    @Override
    public MultiResponse<CustomerDTO> listByName(CustomerListByNameQry qry) {
        return customerListByNameQryExe.execute(qry);
    }
}
```

App 层按业务（customer / order）分包，内含 executor、consumer、scheduler：

![App 层结构](/软件架构/bible/p167-01.png)

**Domain 层**——充血模型 + Gateway 解耦：

```java
@Data
@Entity
public class Customer {
    private String customerId;
    private long registeredCapital;
    private String companyName;

    public boolean isBigCompany() {
        return registeredCapital > 10000000;
    }

    public void checkConflict() {
        if ("ConflictCompanyName".equals(this.companyName)) {
            throw new BizException(this.companyName + " has already existed");
        }
    }
}

public interface CustomerGateway {
    Customer getById(String customerId);
}
```

Infra 层 `CustomerGatewayImpl` 通过 MyBatis 查询 DO 并转为 Domain Entity，完成**依赖倒置**。

![Gateway 解耦外部依赖](/软件架构/bible/p177-01.png)

电商下单需联动商品、库存、营销等多系统时，订单域应通过 Gateway 只取所需字段，而非直接 RPC 吞大 DTO。

**Infrastructure + Start**：gatewayimpl、mapper、config；Start 模块仅负责 Spring Boot 启动与全局配置，结构清晰。

![Infra 与 Start 模块](/软件架构/bible/p179-01.png)

### 2.3 COLA 组件与脚手架

| 组件 | 功能 |
|------|------|
| cola-component-dto | 分页等 DTO 规范 |
| cola-component-exception | BizException / SysException |
| cola-component-statemachine | 状态机 |
| cola-component-extension-starter | 扩展点 |
| cola-component-catchlog-starter | 异常与日志 |

**创建项目**（web 工程示例）：

```bash
mvn archetype:generate \
  -DgroupId=com.alibaba.cola.demo.web \
  -DartifactId=demo-web \
  -Dversion=1.0.0-SNAPSHOT \
  -Dpackage=com.alibaba.demo \
  -DarchetypeArtifactId=cola-framework-archetype-web \
  -DarchetypeGroupId=com.alibaba.cola \
  -DarchetypeVersion=4.3.1
```

纯后端用 `cola-framework-archetype-service`。生成后 `mvn install`，在 start 目录 `mvn spring-boot:run`，访问 `http://localhost:8080/helloworld` 验证。

也可用 [阿里云应用生成器](https://start.aliyun.com/bootstrap.html) 选择 COLA 模板。

---

## 三、CQE 与领域命令流程

战术设计中，**CQE** 连接外部用例与内部状态变更：

- 外部视角：用例图、四色建模、领域故事
- 内外衔接：**CQE 建模**
- 内部视角：流程图（逻辑分支）、时序图（交互）、状态机（状态流转）——「流程三剑客」

领域命令修改聚合根状态后，常发布**领域事件**，其他 BC 或子域监听后续处理。通用流程：

1. **BeforeOperating**：资格校验（远程校验如库存/优惠，本地校验实现 Qualification 接口）
2. **UpdateState**：事务性状态变更
3. **Publish Domain Event**：事件总线分发，监听方后续处理

![领域命令通用流程](/软件架构/bible/p181-01.png)

订单状态机示例：

| 领域命令 | 订单状态 |
|----------|----------|
| createOrder | CREATE |
| payOrder | PAID |
| refundOrder | REFUND |
| closeOrder | CLOSED |
| deliverOrder / deliverGoods / receiveGoods / returnGoods | 履约与物流状态流转 |

![订单状态机](/软件架构/bible/p182-01.png)

此流程可套用到任何「状态变更命令」场景。

---

## 四、实践建议

1. **领域模型慎用**：没把握时宁可不用 Entity，但 Gateway、统一语言、BC 思想要坚持
2. **先业务后功能分包**：customer/order 顶层，其下 executor/consumer/gateway
3. **Gateway 统一防腐**：DB、搜索引擎、RPC 均视为外部依赖，Domain 定义接口、Infra 实现
4. **CQE 进 App.executor**：与 ddd-13 的 Application 层规范一致，Query/Command 分离

COLA 把 DDD 战术思想固化成可生成、可运行的骨架；下一篇聚焦防腐层深化与全系列复盘。

---

## 本篇小结

- 限界上下文指导微服务拆分，内部可选分层/六边形/洋葱/CQRS
- COLA 将三层细化为 Adapter / App / Domain / Infra + Client，按领域×功能分包
- Gateway 实现依赖倒置；CQE + 状态机描述命令与事件流程
- Archetype 一键生成项目，组件库提供 DTO、异常、扩展点等基础设施
