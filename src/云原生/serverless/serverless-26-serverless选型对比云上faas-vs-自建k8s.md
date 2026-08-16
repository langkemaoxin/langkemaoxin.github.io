---
title: Serverless 选型对比：云上 FaaS vs 自建 K8s
sidebarGroup: Serverless
shortTitle: 26 选型对比总结
order: 26
date: 2026-08-14
category: 云原生
tag:
  - Serverless
  - 云原生
  - 文档精读
description: 系列收尾：AWS Lambda、Knative、OpenFaaS 三条 Serverless 路线的定位对比，工具链全景，以及一张决策表——把 02 篇遗留的"厂商锁定"话题落地成可执行的选型结论。
---

> **Serverless · 第 26 篇（系列收尾）**
>
> 本篇把前三条线（云上 Lambda、Knative、OpenFaaS）拉通对比，回扣 02 篇留下的"厂商锁定"话题，给出选型框架。

---

# 一、三条路线的本质区别

02 篇定义过：Serverless = FaaS + BaaS。三条路线的差别就在于这两件事分别由谁提供：

| | AWS Lambda（24 篇） | Knative（06-12 篇） | OpenFaaS（23 篇） |
| --- | --- | --- | --- |
| 定位 | 公有云托管 FaaS + 全家桶 BaaS | K8s 上的 Serverless 平台层 | K8s 上的函数平台，尽量简单 |
| FaaS 运行时 | 托管执行环境（Firecracker microVM） | 自己搭：Serving + Autoscaler + Kourier/Contour 网关 | 自己搭：Gateway + faas-netes |
| 事件接入 | 200+ AWS 服务原生触发 + ESM | Eventing 体系（Broker/Trigger/Source，CloudEvents 标准） | NATS 队列异步调用，触发器较简单 |
| BaaS | DynamoDB/S3/SQS/Cognito……全部托管 | 无，自选（配合云或自建中间件） | 无，自选 |
| 计费 | 按请求 + GB-秒，闲置零费 | 服务器成本（缩容到零可省闲置，但集群本身常驻） | 同 Knative |
| 运维责任 | 几乎为零 | 平台团队承担（升级、扩容、故障） | 平台团队承担，但组件更少 |
| 迁移性 | 深度厂商锁定 | 标准 K8s，可跨集群/跨云 | 标准 K8s + 镜像函数，可迁移 |
| 冷启动 | 亚秒（暖）/ 秒级；SnapStart/预置并发可压 | 秒级；minScale 预热 | 缩容到零后拉镜像，秒到十秒级 |

一句话总结：

- **Lambda**：把"服务器"和"平台"都外包给云厂商，换来锁定与单云；
- **Knative**：把 Serverless 体验搬进自己的 K8s，换来平台运维成本，但保住标准化和迁移自由——这正是 02 篇说的"谷歌为此发起 Knative"的动机；
- **OpenFaaS**：Knative 的减法版，放弃 Eventing 的完整抽象，换"任何语言打成镜像就是函数"的极简体验。

# 二、工具链全景对照

| 环节 | 云上路线 | 自建 K8s 路线（本系列） |
| --- | --- | --- |
| 资源编排/IaC | Serverless Framework（25 篇）/ SAM / CDK | kubectl + Helm + YAML 清单 |
| 构建/流水线 | GitHub Actions / CodePipeline（托管） | Tekton（13-20 篇，自建） |
| GitOps | （CodePipeline 集成为主） | Argo CD（20 篇） |
| 函数部署单元 | zip 包 / 容器镜像（≤10GB）/ Layers | 容器镜像 + Revision（Knative） |
| 灰度发布 | 版本 + 加权别名 / Safe deployments | Revision + 流量切分 |
| 监控 | CloudWatch + X-Ray + Function Insights | Prometheus + Grafana（21 篇）+ EFK（22 篇） |
| 日志 | CloudWatch Logs（可转 Firehose/S3） | EFK 自建 |
| 事件标准 | 各服务事件格式（部分支持 CloudEvents） | CloudEvents（Knative Eventing 原生） |

注意两边并不互斥：真实项目里常见**混合形态**——Web/API 层跑在自有 K8s（Knative），图片压缩、定时任务、消息消费这类突发型负载用云函数（Lambda/函数计算），事件通过消息队列（如 Kafka/RabbitMQ，见另立的 RabbitMQ 系列）双向打通。

# 三、选型决策表

按约束从硬到软排：

1. **数据合规/必须自有环境**（金融、政务、内网）→ 只能自建：Knative（需要完整事件体系、平台团队）或 OpenFaaS（团队小、只要函数体验）。
2. **已在 AWS 且以函数为中心** → Lambda + SAM（想留在 CFN 体系）或 Serverless Framework（想最快上手，接受 V4 登录/商业条款，见 25 篇）。
3. **多云/避免锁定，但不想自建平台** → 考虑 Terraform + 各云函数服务（AWS Lambda / 阿里云函数计算 / Cloud Functions）做一层薄抽象，或 K8s + Knative 跑在托管 K8s 上（EKS/ACK/GKE），把运维再外包一层。
4. **突发/低频负载（02 篇列的场景：异步高并发、零星请求、无状态短任务）** → 优先云函数，计费模型天然匹配；自建方案省不了这部分钱（集群常驻）。
5. **AI 时代的不可信代码执行/每用户隔离沙箱** → 关注 Lambda MicroVMs 这类新原语（24 篇 2.2），自建侧对应 Kata/Firecracker on K8s。

# 四、回扣 02 篇：厂商锁定的再评估

02 篇把"标准不统一、厂商锁定"列为 Serverless 最大制约。几年过去，两点更新：

1. **CloudEvents 成为 CNCF 毕业标准**，Knative Eventing、Azure Event Grid、阿里云等都支持，事件层的中立性在改善——但**函数 API 层（handler 签名、权限模型、部署格式）仍然各云互不兼容**，跨云迁移依旧是重写级成本；
2. **锁定是双向交易**：换来的托管、弹性、按量计费是真实收益。工程上的正确姿势不是"教条地避免锁定"，而是：**事件与数据经过中立层（消息队列/对象存储标准接口），计算层允许锁定**——这样即使换云，只重写函数不重写架构。

# 五、系列总结

- 01-05（并入 02）：Serverless 概念、FaaS/BaaS、演进史与场景；
- 06-12：Knative（定位、Serving、Eventing、kn 工具、事件组件案例）——K8s 上的 Serverless 平台；
- 13-20：Tekton 构建流水线 + Argo CD GitOps——自建侧的 CI/CD；
- 21-22：可观测性（Prometheus/Grafana、EFK）；
- 23：OpenFaaS——轻量函数平台；
- 24-26（本篇止）：云上 Serverless（AWS Lambda）、Serverless Framework 工具链、选型对比。

至此三条路线闭环：**概念 → 自建（Knative/Tekton/OpenFaaS）→ 云上（Lambda/框架/工具链）→ 选型**。

> 参考：[Serverless Framework Docs](https://www.serverless.com/framework/docs)、[AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)、[CNCF CloudEvents](https://cloudevents.io/)
