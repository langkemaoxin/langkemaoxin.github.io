---
title: 云上 Serverless 之 AWS Lambda
sidebarGroup: Serverless
shortTitle: 24 AWS Lambda
order: 24
date: 2026-08-14
category: 云原生
tag:
  - Serverless
  - 云原生
  - 文档精读
description: 对照 AWS 官方文档梳理云上 Serverless 主线 AWS Lambda：Lambda Functions 与 MicroVMs 两种计算原语、事件驱动集成、冷启动与并发控制、SnapStart 与 Durable Functions，并与自建 Knative 做概念对照。
---

> **Serverless · 第 24 篇**
>
> 本篇起进入"云上 Serverless"部分。前 23 篇围绕 Knative / Tekton / OpenFaaS 讲的是**自建 K8s 生态**的 Serverless；本篇对照 AWS 官方文档（Lambda Developer Guide 与 serverless 文档入口），补上**公有云 Serverless** 这条主线——毕竟 Serverless 这个词本身就是因为 2014 年 AWS Lambda 的出现才流行的。

---

# 一、为什么要在 Knative 之后看 Lambda

02 概念篇里提过一个结论：各厂商 Serverless 标准不统一、存在厂商锁定，"正因为如此，谷歌发起了 Knative 项目"。

这个论断的前半段说的就是 AWS Lambda。所以理解 Lambda 有两个价值：

1. **它是事实标准**：FaaS 的计费模型（按请求 + 按执行时长）、事件触发模型、冷启动问题，都是 Lambda 定义后被全行业沿用的。Knative 的很多设计（自动缩容到零、按请求扩容）本质上就是把这套体验搬到自有 K8s 集群上。
2. **对照学习**：Knative 里你手工搭建的东西（Autoscaler、Activator、Ingress 路由、Eventing 事件源），在 Lambda 里全部是托管服务，对照着看能更清楚各自解决什么问题。

# 二、Lambda 的两种计算原语

按当前官方文档，AWS Lambda 提供两种计算原语（compute primitives）：

## 2.1 Lambda Functions（函数）

这是经典形态，也是大家默认说的 Lambda：

- 写一个 handler 函数，接上一个触发器（API Gateway、S3、SQS、EventBridge 等 **200+ AWS 服务**），事件来了 Lambda 就执行；
- 每次调用相互独立、无共享状态，靠水平扩容应对流量；
- **单次调用最长 15 分钟**；
- 执行环境（Execution Environment）会被复用以减少冷启动（暖启动 warm start），但状态不保证跨调用持久；
- 一个执行环境同一时刻只处理一个请求；
- 计费：**按请求次数 + 执行时长的 GB-秒**（内存配置越高单价越高，用多少付多少，闲置零费用）。

## 2.2 Lambda MicroVMs（微虚拟机）

这是新增的原语，定位和函数不同：

- 提供隔离的完整计算环境（客户自制 MicroVM 镜像，可以跑自己的二进制、监听端口、用 Linux 系统能力），**状态可保留最长 8 小时**，支持 suspend/resume（挂起时按快照存储计费，运行时按秒计费）；
- 面向"每个用户/每个任务一个专属隔离环境"的负载——典型场景是 AI Agent 产生的不可信代码执行、多租户隔离；
- 开发者通过 API 控制创建、挂起、恢复、销毁，生命周期是自己管的（这点和函数"完全托管"不同）；
- 底层同样是 Firecracker microVM 隔离。

## 2.3 两者对比

|  | Lambda Functions | Lambda MicroVMs |
| --- | --- | --- |
| 适合 | 请求-响应、事件驱动（API、数据处理、自动化） | 每用户/每任务需要持久专属环境，运行不可信代码 |
| 编程模型 | 受支持运行时的 handler 函数 | 任意应用：自己的二进制、监听端口 |
| 时长 | 单次 ≤15 分钟；配合 Durable Functions 可编排长达一年 | 单会话 ≤8 小时，可跨会话挂起恢复 |
| 并发 | 一个执行环境一次一个请求 | 一个 MicroVM 多个并发连接 |
| 扩缩容 |全自动（Lambda 创建/销毁执行环境） | 开发者通过 API 控制 |
| 计费 | 按请求 + GB-秒 | 运行按秒 + 挂起期间快照存储 |

> 和本系列前面的内容对照：**Functions ≈ OpenFaaS/Knative 里"缩容到零的函数"**；**MicroVMs ≈ K8s 里带状态、按需拉起沙箱的 Pod**（Firecracker 隔离），可以类比 Kata Containers 的定位，但计费和生命周期完全托管化。

# 三、事件驱动：Lambda 的集成面

Lambda Developer Guide 的目录结构里，"Integrating other services" 是最大的一章，这也是云上 FaaS 和自建方案差距最大的地方——**BaaS 集成面**：

- **同步调用**：API Gateway（REST/HTTP API）、Application Load Balancer、Function URL（函数自带 HTTPS 端点，免搭 API 网关，支持响应流式传输 response streaming）；
- **异步调用**：S3（对象事件）、SNS、EventBridge Scheduler（定时）、IoT、Cognito；
- **事件源映射（Event Source Mapping，ESM）**：Lambda 主动轮询拉取的服务——SQS（含跨账号）、Kinesis、DynamoDB Streams、MSK/自管 Kafka（含低延迟消费、消费组管理）、MQ/ActiveMQ/RabbitMQ、DocumentDB 变更流。ESM 支持批处理、批内失败上报（partial batch failure）、事件过滤（event filtering）；
- **编排**：Step Functions 状态机调用 Lambda 组成长流程。

对照本系列：

- Knative Eventing 里的 **Broker/Trigger/Source 体系** ≈ EventBridge + ESM 的角色；
- 10 篇讲的 CloudEvents、12 篇讲的 Kafka/消息事件源，在 AWS 侧对应 Kinesis/MSK/SQS 的 ESM 集成。

## 3.1 触发与调用要点

- **同步 / 异步 / ESM 三种调用语义**，错误处理策略不同：异步失败可配重试次数和死信队列（on-failure destination）；ESM（如 SQS）靠批内失败报告做部分重试；
- **递归环检测**：官方内置了 Recursive loop detection，防止 S3 → Lambda → S3 之类的死循环；
- **事件过滤**：ESM 可以在事件源侧过滤 JSON 模式匹配的事件，减少无效调用（省钱）。

# 四、冷启动与并发控制

这是 FaaS 的核心工程问题，02 篇只提了"冷启动一般 3-5 秒"，Lambda 侧的工具箱完整得多：

## 4.1 冷启动缓解

- **执行环境复用**：同版本函数的连续调用会复用执行环境（暖启动），handler 外的初始化代码只跑一次；
- **SnapStart**：针对 Java（现已扩展 Python/.NET）——发布版本时把初始化后的内存快照存下来，调用时从快照恢复，把冷启动从秒级压到亚秒级。要注意快照恢复带来的唯一性问题（随机数、连接需要 runtime hook 重新初始化）；
- **Provisioned Concurrency（预置并发）**：为指定版本常驻预热 N 个执行环境，代价是闲置也计费——这其实就是"花钱把 Serverless 降级成常驻服务"，等价于 Knative 里把 `minScale` 设为 1 以上。

## 4.2 并发控制

- **Reserved Concurrency（预留并发）**：为函数设置并发上限/预留额度，用途有二：给关键函数保底（防被别的函数抢光账号总并发），以及给下游脆弱资源限流（比如数据库连不上就别扩了）；
- 账号有总并发配额（quota），突发扩容有 token bucket 模型的爬升曲线；
- 对照 Knative：`minScale`/`maxScale`/并发数（containerConcurrency）在 K8s 侧要自己配，Lambda 侧对应 reserved/provisioned concurrency。

## 4.3 其他常用配置项

- 内存 128MB–10GB（CPU 按内存比例分配），临时存储 /tmp 最多 10GB（ephemeral storage），可挂 EFS；
- 支持 x86 与 ARM/Graviton 指令集（arm64 更便宜）；
- 部署形态：zip 包 或 容器镜像（最多 10GB）——容器镜像部署这点对熟悉 K8s 的团队很友好，和 OpenFaaS"函数打包成 Docker 镜像"思路一致；
- **Layers（层）**：把依赖包独立发布、多函数共享，等价于 Knative 里把公共依赖做进基础镜像；
- 版本 + 别名（支持加权灰度，alias 流量按权重分到两个版本），等价于 Knative Serving 的 revision + 流量切分。

# 五、Durable Functions（持久化函数）

Lambda 文档新增的 "Durable functions" 一章值得单独说：

- 解决的问题：函数单次 ≤15 分钟，但业务流程可能要跑几小时到几个月；
- 方案：用 Durable execution SDK 写看似同步的代码，底层由服务端持久化执行状态（checkpoint），进程挂了从断点恢复，支持重试、幂等、事件溯源式的执行记录；
- 与 Step Functions 的分工：Step Functions 是**外部编排**（低代码状态机，流程与代码分离），Durable Functions 是**代码内编排**（写普通编程语言，状态由运行时管）；
- 对照：这相当于把 Knative Eventing 里自己拼 Broker/Trigger/Sequence 的活儿，变成了托管编程模型。

# 六、配套工具与可观测性

- **IaC**：AWS SAM（Serverless Application Model，CloudFormation 的 serverless 语法糖）、AWS CDK（用 TypeScript/Python 等写 IaC）、Infrastructure Composer（可视化编排）；
- **本地开发**：SAM CLI 本地模拟调用 `sam local invoke`；Serverless Framework 的 `invoke local`（下一箱讲）；
- **Powertools for AWS Lambda**：官方结构化日志/指标/链路追踪的最佳实践库；
- **可观测**：CloudWatch（指标/日志，日志可送 Firehose/S3）、X-Ray 链路追踪、Function Insights；
- **CI/CD**：官方给了 GitHub Actions 集成方案——对照本系列 13-20 篇用 Tekton 搭的流水线，云上方案是"配置即得"。

# 七、小结

| 自建 K8s 侧（本系列前文） | AWS 托管侧（本篇） |
| --- | --- |
| Knative Serving 自动扩缩 + 缩容到零 | Lambda 执行环境自动扩缩 + 按请求计费 |
| Knative Eventing Broker/Trigger/Source | EventBridge + S3/SQS/SNS 触发 + 事件源映射 |
| Knative revision + 流量切分 | 版本 + 加权别名 |
| K8s minScale 预热 | Provisioned Concurrency / SnapStart |
| 自建 Prometheus/Grafana（21 篇） | CloudWatch + X-Ray + Function Insights |
| Tekton 流水线（13-20 篇） | SAM/CDK + GitHub Actions |
| OpenFaaS 函数打包为镜像 | Lambda 容器镜像部署 |

下一篇讲把这些资源用一个 YAML 描述清楚并一键部署的工具——Serverless Framework。

> 参考：[AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)、[AWS Serverless 文档入口](https://docs.aws.amazon.com/serverless/)
