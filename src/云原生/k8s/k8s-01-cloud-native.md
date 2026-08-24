---
title: 云原生原理与演进——从 CNCF 到 Service Mesh
sidebarGroup: Kubernetes
shortTitle: 01 云原生演进
order: 1
date: 2026-08-26T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: 从 CNCF 定义、四要素与时间轴讲清云原生，并引出 Service Mesh 与 Istio 的背景。
---

> **Kubernetes 系列 · 第 1/35 篇**  
> 建议先读完 [Docker 系列](/云原生/docker/docker-01-what-is-docker)；下一篇：[《穿透 K8S 八大宏观架构——Master、Worker 与数据流》](/云原生/k8s/k8s-02-macro-architecture)

---

## 开头：「云原生」到底是什么？

「云原生」没有唯一、固定的教科书定义——它随技术演进不断扩展，解释权也不属于某一家公司。要理解 Cloud Native，先从字面入手：**生在云上、长在云上**，而不是「把传统应用搬到机房再套一层云」。

这一概念建立在**云基础设施**之上：虚拟服务器、虚拟容器、编排平台等，其中容器编排的代表作就是 **Kubernetes（K8s）**。读完 [Docker 系列](/云原生/docker/docker-01-what-is-docker) 后，你已经知道「一个进程怎么进沙箱」；本系列接下来要回答的是：**成百上千个容器怎么调度、发现、扩缩与自愈**——而云原生，正是这套方法论的总背景。

---

## 一、什么是云原生（Cloud Native）？

### 1.1 早期定义：Pivotal 与 CNCF

**Pivotal** 的 Matt Stine 于 **2013** 年首次提出「云原生」概念。2015 年他在《迁移到云原生架构》中归纳了若干特征：

- 符合 **12-Factor** 应用
- **面向微服务**架构
- **自服务敏捷**架构
- 基于 **API** 协作
- 具备**抗脆弱性**

Pivotal 同期推出 **Pivotal Cloud Foundry** 与 **Spring** 框架，是云原生应用架构的早期探路者之一（2018 年上市，2019 年被 VMware 以 27 亿美元收购，并入 **Tanzu** 产品线）。

**2015 年**，Google 主导成立 **CNCF（Cloud Native Computing Foundation，云原生计算基金会）**，围绕云原生打造开源生态。起初 CNCF 对云原生的定义包含三方面：

1. **应用容器化**（Containerized software stack）
2. **面向微服务**（Microservices oriented）
3. **支持容器编排调度**（Dynamically orchestrated）

2017 年，Pivotal 官网将云原生概括为**四大特征**，这也是许多人对 Cloud Native 的基础印象：

![云原生四要素](/云原生/k8s/p026-01.png)

| 要素 | 含义 |
|------|------|
| **DevOps** | 开发、运维一体化，覆盖持续开发、测试、集成、部署、监控 |
| **持续交付** | 小步快跑、不停机更新，开发版与稳定版并存，依赖 CI/CD 流水线 |
| **微服务** | 相对单体应用，服务按业务边界拆分；理论基础包括**康威定律** |
| **容器** | 2013 Docker、2014 K8s 开源；Docker 为广泛使用的容器引擎，K8s 负责编排与负载均衡 |

**DevOps** 最佳实践工具链：Git、Jenkins、Bamboo、Docker、Kubernetes。

**持续交付** 常见工具：GitLab、Jenkins、Pipeline、Tekton 等。

---

## 二、云原生发展时间轴

![云原生发展时间轴](/云原生/k8s/p028-01.png)

### 2.1 从微服务到服务网格

| 项目 | 要点 |
|------|------|
| **微服务** | Martin Fowler 2014 年定义；可独立部署、服务粒度越来越细 |
| **Kubernetes** | 2014.6 Google 开源 → 2015.7 发布 1.0 并进入 CNCF → 2018.3 毕业，成为容器编排事实标准 |
| **Linkerd** | Scala/JVM 编写；Service Mesh 名词创造者；2016.01 0.0.7 → 2017 加入 CNCF → 2017.04 1.0 |
| **Envoy** | C++ 服务代理，Lyft 出品；2016.09 1.0 → 2017.09 加入 CNCF |
| **Istio** | Google、IBM、Lyft 联合发布；希腊语「起航」；开源微服务治理、保护与监控框架 |

### 2.2 微服务架构的局限

Spring Cloud 解决了大量分布式问题，但仍存在典型痛点：

1. **侵入式框架**：业务代码需引入 Maven 依赖、注解、配置，非业务代码与业务 jar 打包在一起。
2. **多语言成本**：各语言都要维护一套非业务中间件代码。
3. **学习曲线**：业务开发者应聚焦业务，而非网络、限流、熔断等横切关注点。
4. **版本升级**：频繁发版时，非业务代码随版本一起变更，多语言调用下排障困难。
5. **拆分悖论**：服务越细，看似解耦，**运维与治理成本**反而上升。

Spring Cloud 仍是主流方案之一；指出其局限，是为了引出 **Service Mesh** 的设计思路——**不是否定 Spring Cloud，而是说明另一种「下沉基础设施」的路径**。

### 2.3 解决思路：非业务代码下沉

本质上要解决**服务间通信**：客户端请求应顺利到达目标服务，且**通信过程尽量与业务代码无关**——服务发现、负载均衡、版本路由、熔断等都应可配置、可观测。

单体时代也曾把通信逻辑写在业务里；后来网络问题下沉到 **TCP/UDP** 与**七层模型**，非业务功能从应用层剥离。

![网络七层与非业务下沉](/云原生/k8s/p029-01.png)

同理：**能否给每个服务配一个代理**，把通信细节交给代理？Nginx、HAProxy 的反向代理思路，为 Service Mesh 提供了原型。

### 2.4 Sidecar（旁车 / 边车）模式

**Sidecar** 将应用功能从应用进程剥离为**独立进程**，降低微服务架构复杂度，并提供负载均衡、服务发现、流量管理、熔断、遥测、故障注入等基础能力。

![Sidecar 模式示意](/云原生/k8s/p030-01.png)

每个服务绑定 Sidecar，**所有流量经 Sidecar 转发**；业务开发者只写业务，通信交给 Sidecar。Sidecar 为通用基础设施设计，**对业务框架无侵入**。

借鉴 Proxy 模式的产品包括 Netflix **Prana**（2014）、蚂蚁金服 **SofaMesh** 等；2016 年 Twitter 基础设施工程师发布第一款 Service Mesh 项目 **Linkerd**。

![Sidecar 与代理演进](/云原生/k8s/p030-02.png)

---

## 三、2018 年 CNCF 对云原生的重新定义

![CNCF Landscape](/云原生/k8s/p032-01.png)

2018 年，主流云厂商均已加入 CNCF，**Cloud Native Landscape** 有意覆盖原先「非云原生」应用的地盘。旧定义限制了生态扩展，CNCF 发布 **v1.0** 新定义：

**英文原文（节选）：**

> Cloud native technologies empower organizations to build and run scalable applications in modern, dynamic environments such as public, private, and hybrid clouds. Containers, service meshes, microservices, immutable infrastructure, and declarative APIs exemplify this approach.

**中文要点：**

云原生技术帮助组织在公有云、私有云、混合云等动态环境中构建和运行**可弹性扩展**的应用。代表技术包括：**容器、服务网格、微服务、不可变基础设施、声明式 API**。这些技术构建**松耦合、容错、易管理、可观测**的系统；配合可靠自动化，工程师可以**频繁、可预测**地做出高影响变更。

新定义中仍保留**容器**与**微服务**，但有两点特别值得注意：

- **服务网格**被单独列出，而非作为微服务的子项——体现其在云原生生态中的独立地位。
- **不可变基础设施**与**声明式 API** 作为设计指导思想写入定义，强调对架构演进的长远影响。

### 3.1 服务网格（Service Mesh）

微服务架构分**侵入式**与**非侵入式**：

| 类型 | 说明 |
|------|------|
| **侵入式** | 框架嵌入代码，开发者组合 RPC、负载均衡、熔断等 |
| **非侵入式** | 以代理形式与应用同部署，接管网络且对应用透明；以 Service Mesh 为代表 |

Service Mesh 将服务通信、容错、认证等**专业度极高**的能力产品化，对中小企业是降本选项。开源实现包括 Istio、Linkerd、Envoy、Dubbo Mesh 等；Mesh 常运行在 **Kubernetes** 之上以获得更好的底层支撑。

### 3.2 不可变基础设施（Immutable Infrastructure）

「不可变」类似编程中的不可变变量：赋值后不再修改，只能**整体替换**。

对基础设施而言：**服务器完成部署后不再就地修改**；若需变更，用新实例替换旧实例，变更可追溯、可回滚。

可变基础设施的问题：

- 灾难恢复时难以用标准镜像**重建等效服务**（手工操作多、缺乏记录）。
- 持续修改服务器引入**中间状态**，类似并发中的可变变量，带来不可预期故障。

**总结**：生产环境基础设施尽量**不就地改**；若必须改，一切应有记录、可回溯。

### 3.3 声明式 API（Declarative APIs）

对 Kubernetes API 对象，通常编写 **YAML** 提交「期望的最终状态」，即**声明式**；若逐步下发命令指导如何达到状态，则为**命令式**。

- **命令式 API**：请求逐个实现，可能冲突。
- **声明式 API**：一次处理多个写操作，具备 **Merge** 能力。

Kubernetes 能力通过各类 **API 对象**暴露；操作这些对象即使用 K8s 能力。**声明式 API 将资源抽象为标准 API，形成规范。**

---

## 四、CNCF 组织与生态

官网：[https://www.cncf.io/](https://www.cncf.io/)

**CNCF** 由 Linux 基金会于 **2015** 年发起，标志云原生进入高速发展。Google、Cisco、Docker 等纷纷加入，围绕 Cloud Native 构建具体工具。

成立目的之一：通过**容器与 K8s** 打破云巨头垄断，使底层 IaaS **无差异化**——当时 CNCF 的拳头项目就是 **Kubernetes**，因此早期定义也偏**容器编排生态**。

使命：**Building sustainable ecosystems for cloud native software**——为云原生软件建立可持续生态系统。

CNCF 是众多快速增长开源项目的**厂商中立**宿主，包括 Kubernetes、Prometheus、Envoy 等。从 2015 到 2018，AWS、Azure、Alibaba Cloud 等大厂加入，技术方向扩展到容器、Service Mesh、微服务、不可变基础设施、Serverless、FaaS 等。

### 4.1 CNCF 解决什么问题？

统一基础平台与配套选型：

| 需求 | 常见 CNCF 项目 |
|------|----------------|
| 容器编排 | **Kubernetes** |
| 监控告警 | **Prometheus** |
| 代理 / 数据面 | **Envoy** |
| 分布式链路追踪 | **Jaeger** |
| 容器运行时 | **Containerd** |
| 日志 | **Fluentd** |
| 包管理 | **Helm** |
| 网络标准 | **CNI** |
| 键值存储 | **etcd** |

### 4.2 已毕业与孵化中的代表项目

**已毕业（Graduated）示例：**

- **Kubernetes**：最受欢迎的容器编排平台，CNCF 第一个项目。
- **Prometheus**：云原生监控、告警、查询与可视化。
- **Jaeger**：Uber 出品的分布式追踪，与 OpenTracing、K8s、Prometheus 集成。
- **Containerd**：Docker 贡献的行业标准容器运行时。
- **Envoy**：Lyft 创建的服务代理 / Mesh 数据面，C++ 实现，低内存 CPU 占用。
- **Fluentd**：统一日志采集、过滤、路由。

**孵化中示例：** OpenTracing、gRPC、CNI、Helm 等。

![CNCF 项目与 etcd](/云原生/k8s/p036-01.png)

**Helm**：Kubernetes 的包管理器，类似 yum，用于查找、下载、安装 Chart。

**etcd**：高可用分布式键值库，内部采用 **Raft** 一致性算法，Go 实现；K8s 中常用作**注册中心与集群状态存储**。

---

## 五、架构演进：单体 → 微服务 → Service Mesh

### 5.1 单体服务时代

2010 年前，论坛、聊天、邮箱等业务常**耦合在一台小型机 + 一台数据库**上。故障或发版影响整站；为保可用并快速响应变更，需**垂直拆分**为多个子应用。

![单体垂直拆分](/云原生/k8s/p037-01.png)

优点：应用解耦、容错提升、可独立发布。

用户量增长后需**水平扩展**。接入层引入**负载均衡**：

![负载均衡与水平扩展](/云原生/k8s/p037-02.png)

阿里巴巴 2008 年提出去「IOE」（IBM 小型机、Oracle、EMC 存储），改为集群化负载均衡；2013 年支付宝最后一台 IBM 小型机下线。优点：解耦、独立发布、水平扩展提升并发。

### 5.2 微服务时代

微服务希望**一个服务只负责一个独立功能**；拆分原则：任一需求的发布或维护**不影响无关服务**，可**独立部署运维**。「用户中心」可能拆成买家、卖家、商家等服务。

典型代表 **Spring Cloud**：HTTP 作 RPC，配合 Eureka、Zuul、Config 等。Martin Fowler 微服务定义：[https://martinfowler.com/articles/microservices.html](https://martinfowler.com/articles/microservices.html)（2014）。Spring Cloud：[https://spring.io/projects/spring-cloud](https://spring.io/projects/spring-cloud)

集群部署增多后，重复功能（注册、配置、网关）被抽取为 **XX Service**。服务间调用需要 **RPC**，使远程调用像本地一样简单。

![微服务与 RPC](/云原生/k8s/p039-01.png)

### 5.3 服务网格新时期

Service Mesh 与微服务的本质区别：**业务服务**与**非业务基础服务**解耦——非业务交给基础框架（Sidecar + 控制面）统一管理，形成**服务网格**。

![服务网格数据面与控制面](/云原生/k8s/p040-01.png)

为何叫「网格」：每个格子是一个 **Sidecar 数据单元**，彼此通信组成**数据面**；统一控制/配置组件（类似注册中心）组成**控制面**。宏观上：**服务网格 = 数据面 + 控制面**。

特点：

- **基础设施层**：处理服务间通信。
- **支撑云原生**：复杂拓扑下可靠传递请求。
- **网络代理**：轻量代理执行治理逻辑。
- **对应用透明**：与业务同部署，业务仍按原方式工作。

---

## 六、Service Mesh 原理与价值

![Istio Service Mesh 概念](/云原生/k8s/p042-01.png)

Istio 官方定义（[What is a service mesh](https://istio.io/latest/docs/concepts/what-is-istio/#what-is-a-service-mesh)）：描述微服务应用及其交互的网络；随规模与复杂度增长，需发现、负载均衡、故障恢复、指标、监控，以及 A/B 测试、金丝雀、限流、访问控制、端到端认证等。

![Sidecar 网格拓扑](/云原生/k8s/p042-02.png)

Service Mesh 将 **「业务服务」** 与 **「基础设施」** 解耦：Sidecar 支撑上层应用，开发者可用 Java、Go 等专注业务。

**价值要点：**

- 职责解耦、责任清晰——不像 Spring Cloud 把治理交给研发，也不把所有职责塞进 K8s 造成混乱。
- Istio 通过 **Agent Sidecar** 提供服务发现、负载均衡、限流、链路跟踪、鉴权等。
- Istio **与 K8s 结合设计**，可落地微服务架构；相对传统框架，功能更强且**业务代码改动极少**。

### 6.1 Linkerd

2016 年 1 月，前 Twitter 基础设施工程师打造 **Linkerd**，第一个 Service Mesh 项目由此诞生。设计思想与 Sidecar 类似：屏蔽网络通信细节。

重要创举：

- 无需侵入工作负载代码即可监视与管理通信。
- 统一配置服务间与边缘通信。
- 除 K8s 外支持多种底层平台。

每个 K8s Node 部署 Linkerd 实例，Mesh 内 Pod 通信经 Linkerd 转接。2017 年加入 CNCF，处理千亿次生产请求后发布 1.0。

**局限**：早期需同时部署业务与 Sidecar，运维负担大；Linkerd 实现了**数据面**，但**控制面**管理不足——这是 Istio 后来超越的关键之一。

![Linkerd 架构](/云原生/k8s/p044-01.png)

### 6.2 Istio

Google、IBM、Lyft 联合发起的开源项目，Go 编写。[Why use Istio](https://istio.io/latest/docs/concepts/what-is-istio/#why-use-istio)

通过部署 **Sidecar 代理**拦截微服务间所有网络通信，并用**控制平面**配置与管理，可在**很少或无需修改服务代码**的情况下获得负载均衡、服务间认证、监控等能力。

相对 Spring Cloud「加依赖、加注解、改配置」，Istio 提供完整的**控制平面**管理**数据平面（Sidecar）**。

![Istio 控制面与数据面](/云原生/k8s/p045-01.png)

Istio 能力概览：

1. HTTP、gRPC、WebSocket、TCP 流量自动负载均衡。
2. 路由、重试、故障转移、错误注入等细粒度流量控制。
3. 访问控制、速率限制、配置 API。
4. 集群内流量（含入口/出口）自动度量、日志、追踪。
5. 基于身份的服务间认证与授权。

**总结**：Istio 同时拥有**数据平面**与**控制平面**，具备数据接管与集中控制能力。

![Istio 能力清单](/云原生/k8s/p046-01.png)

### 6.3 国内 Service Mesh

蚂蚁金服 **Sofa Mesh**（前身 SOFA RPC，2018.07 开源）、腾讯 **Tencent Service Mesh**、华为 **CSE Mesher** 等，均借鉴 Sidecar、Envoy、Istio 等设计思想。

![国内 Mesh 产品](/云原生/k8s/p047-01.png)

---

## 七、云原生应用 vs 传统应用

![云原生 vs 传统应用](/云原生/k8s/p048-01.png)

支持云原生的应用可以很简单：容器化部署、K8s 编排、CI/CD、Prometheus 监控等。云原生在更好基础平台上提供**更多应用能力**：

| 维度 | 云原生倾向 | 传统应用倾向 |
|------|------------|--------------|
| 操作系统 | 容器化，不绑定特定 OS | 强依赖指定 OS 与手工环境 |
| 伸缩 | K8s 调度 + HPA 弹性 | 代码协调伸缩策略，较麻烦 |
| 协作 | DevOps 全流程自动化 | 瀑布模型、人工运维 |
| 架构 | 微服务独立、高内聚低耦合 | 单体或耦合部署 |
| 运维 | 自动化、快速恢复、自愈 | 人工介入多 |

![云原生特征对比](/云原生/k8s/p048-02.png)

**总结**：云原生更倡导**敏捷、自动化、容错**；传统应用多仍处于瀑布开发与人工运维阶段。

---

## 八、云原生涉及的核心项目

![云原生核心项目 Landscape](/云原生/k8s/p048-03.png)

除上文 CNCF 毕业项目外，日常还会接触：Docker / containerd、Harbor、Ingress Controller、Jenkins / GitLab CI、Prometheus / Grafana、Jaeger / Zipkin 等。本系列后续篇章会按「宏观架构 → 工作负载 → 网络存储 → 灰度发布 → Mesh → 实战流水线」逐步展开。

---

## 九、云原生架构的生产需求（参考）

![生产架构需求](/云原生/k8s/p049-01.png)

### Java 场景典型验收维度

1. **架构**：基于 Spring Cloud，网关作流量入口，统一鉴权与安全（如 Spring Cloud Gateway）。
2. **弹性**：多微服务，可弹性伸缩；单节点宕机不影响连续服务（K8s + **HPA**）。
3. **性能**：接口平均响应 &lt; 200ms，并发 ≥ 1500 TPS（缓存、多节点等）。
4. **流水线**：GitLab + Harbor + Jenkins + Ingress 灰度，贯穿研发并兼容容器化部署。

![Java 云原生架构示意](/云原生/k8s/p050-01.png)

### 多语言场景

![多语言云原生](/云原生/k8s/p051-01.png)

除 Java 外，Go、Node 等语言服务同样容器化上 K8s；Service Mesh 对**多语言治理**的价值在于：通信、观测、安全策略**下沉到 Sidecar**，各语言业务代码保持轻量。

![多语言 + Mesh](/云原生/k8s/p052-01.png)

---

## 小结

- **云原生**建立在云基础设施之上，强调容器、微服务、DevOps、持续交付与自动化。
- **CNCF 2018 定义**突出 Service Mesh、不可变基础设施、声明式 API。
- 架构演进：**单体 → 微服务 → Service Mesh**；Sidecar 将网络治理从业务代码中剥离。
- **Linkerd** 开创 Mesh 品类；**Istio** 补齐控制面，与 K8s 深度结合。
- 学 K8s 之前，建议已理解 Docker 镜像与容器运行时（见 Docker 系列）。

> ➡️ 下一篇：[《穿透 K8S 八大宏观架构——Master、Worker 与数据流》](/云原生/k8s/k8s-02-macro-architecture)
