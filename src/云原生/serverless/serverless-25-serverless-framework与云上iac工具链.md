---
title: Serverless Framework 与云上 IaC 工具链
sidebarGroup: Serverless
shortTitle: 25 Serverless Framework
order: 25
date: 2026-08-14
category: 云原生
tag:
  - Serverless
  - 云原生
  - 文档精读
description: 对照 serverless.com 官方文档梳理 Serverless Framework：发展史、serverless.yml 核心模型、事件源清单、Composable 与 Dashboard，以及 V4 商业化（License Key、$2M 门槛）对选型的影响，并对比 SAM/CDK。
---

> **Serverless · 第 25 篇**
>
> 上一篇讲了 AWS Lambda 本体，这一篇讲"怎么把一堆 Lambda + API 网关 + 队列 + 权限描述成一个工程并一键部署"。对照官方文档（[Serverless Framework Docs](https://www.serverless.com/framework/docs)）整理。

---

# 一、Serverless Framework 是什么

按官方文档的自述：

- **2014 年 AWS Lambda 发布，几个月后 Serverless Framework 诞生**——最初就是为了简化 Lambda 部署的开源项目，也是"serverless architectures"这个概念的推广者；
- 今天它是"CLI + 可选 Dashboard（控制台）"的组合：用简化的 YAML 把**代码和基础设施一起部署**，官方定位里特别强调"不需要成为云专家也能部署复杂基础设施模式"；
- 语言无关：Node.js、Python、Java、Go、C#、Ruby、Swift、Kotlin、PHP 等都支持；
- 现由 Serverless Inc.（旧金山）商业公司维护，**已从纯开源项目转型为 SaaS 产品**——这句话是理解 V4 一切变化的钥匙（见第五节）。

对照本系列：Tekton 是"在自有集群上拼流水线的积木"，Serverless Framework 是"面向云上函数应用的整装机"。在 AWS 语境里，它和 SAM、CDK 是同层竞品。

# 二、核心模型：serverless.yml

整个框架的心脏是一个 `serverless.yml`，五个顶层概念：

```yaml
service: my-service        # 应用/服务名
frameworkVersion: '4'      # 框架版本

provider:                  # 云厂商与全局配置
  name: aws
  runtime: nodejs20.x
  region: cn-north-1
  # memorySize / timeout / environment / iam 等

functions:                 # 函数与触发事件
  hello:
    handler: src/hello.handler
    events:
      - httpApi: '*'
      - s3: bucket/${self:provider.environment.BUCKET}

resources:                 # 透传 CloudFormation 资源
  Resources:
    MyTable:
      Type: AWS::DynamoDB::Table

plugins:                   # 插件
  - serverless-plugin-typescript

package:                   # 打包配置
  patterns:
    - '!node_modules/**'
```

## 2.1 Functions + Events：核心抽象

- **function** = handler + 运行时 + 配置（内存、超时、环境变量、IAM、层、VPC……）；
- **event** = 触发器声明。写上 `httpApi`，框架就会顺手把 API Gateway 建好；写上 `s3`，就把桶通知配好。**这是它和裸写 CloudFormation 最大的效率差**——你声明"函数被什么触发"，而不是"怎么搭这些资源"。

官方文档列出的 AWS 事件源（Events 一章），本系列读者可以和 Knative Eventing 的事件源对照着看：

| 类别 | 事件源 |
| --- | --- |
| API | HTTP API（API Gateway v2）、REST API（v1）、Websocket、ALB、Alexa |
| 消息 | SQS、SNS、Kafka/MSK、RabbitMQ、ActiveMQ、Kinesis、DynamoDB Streams |
| 对象/存储 | S3 |
| 定时/事件总线 | Schedule、CloudWatch Event、EventBridge |
| IoT/Cognito/CloudFront/CloudWatch Log | 各自的事件接入 |

## 2.2 Variables（变量系统）

变量来源非常丰富，官方单列一章：`serverless.yml` 自引用、core 变量、环境变量、CLI 选项、外部 YAML/JSON、JS 属性、Git 属性、Doppler；AWS 侧还有 S3 对象、SSM Parameter Store / Secrets Manager、CloudFormation Stack Outputs；甚至支持 HashiCorp Vault 和 Terraform State Output。

对照：这套变量系统 ≈ Helm 的 values + Kustomize 的 overlay 在 serverless 世界的对应物。

## 2.3 其他工程能力

- **Layers**：跨函数共享依赖（同 Lambda Layers）；
- **Composing Services**：大项目拆成多个 service，用 `serverless-compose` 声明依赖关系统一部署——对应 K8s 世界里"多 Helm chart + 依赖排序"的问题；
- **Safe deployments**：部署时自动做 Canary/Linear 流量切换（依赖 CodeDeploy）——对应 Knative 的 revision 流量切分；
- **Version pruning / Deployment Bucket / Domains / IAM**：版本清理、部署桶、域名、权限等周边治理；
- **Stages**：dev/staging/prod 多环境参数化。

# 三、CLI 与开发体验

常用命令（来自官方 CLI Reference）：

```text
serverless deploy          # 部署整个服务
serverless deploy function # 单函数快速更新
serverless invoke / invoke local  # 云上/本地调用
serverless logs            # 拉日志
serverless info / deploy list   # 查看部署产物
serverless remove          # 整体销毁
serverless rollback        # 回滚到历史版本
serverless dev             # 云端开发模式（热更新）
serverless package / print # 只打包不部署 / 解析变量后打印配置
```

`invoke local` 本地跑函数 + `dev` 云端热更，是它相对 SAM CLI `sam local` 的体验差异点之一。

# 四、Dashboard 与新方向

V4 之后官方明显在把产品往平台方向推：

- **Dashboard（SaaS 控制台）**：Monitoring & Observability（指标、链路、故障排查）、SDK（Node/Python）、CI/CD 托管（branch deployments、preview deployments、mono repo 支持）；
- **AI Agents 套件**：Runtime、Gateway、Memory、Browser、Code Interpreter、Dev Mode——面向"用 Serverless 框架搭 AI Agent 后端"的新场景；
- **MCP Server**：官方提供 MCP 接入，让 AI 编码助手直接读写 serverless 工程与 AWS 集成——工具链 AI 化的信号。

# 五、V4 商业化：必须知道的选型前提

V4 是分水岭，变化来自官方 [Upgrading to V4](https://www.serverless.com/framework/docs/guides/upgrading-v4) 与 [License Keys](https://www.serverless.com/framework/docs/guides/license-keys)：

1. **所有用户都要认证**：CLI 使用需要登录（login）或配置 License Key，匿名使用不再可能；
2. **收费门槛**：**年收入超过 200 万美元的组织需要付费订阅**，个人与小团队免费；
3. **AWS 成为默认且主推的 provider**：文档结构已明确"AWS 是默认云厂商，所有文档默认适用于 AWS"，多云 provider 支持弱化；
4. **License Key 要进 CI/CD**：流水线里得安全地注入 Key，这对存量团队是迁移成本。

社区对此有争议（v3 完全开源免费）。选型含义：

- 个人学习、小团队、AWS 单云 → 继续用没毛病；
- 大企业 / 需要多云 / 开源合规要求高 → 更多考虑 **AWS SAM / AWS CDK / AWS CloudFormation / Terraform (AWS provider)**。

# 六、与 SAM / CDK / Terraform 对比

| | Serverless Framework | AWS SAM | AWS CDK | Terraform |
| --- | --- | --- | --- | --- |
| 形态 | YAML + CLI + SaaS | CloudFormation 语法糖（YAML） | 通用语言写 IaC（TS/Py/…） | HCL 声明式 |
| 抽象层级 | 最高（函数+事件一体声明） | 高（serverless 语法糖） | 中（自建 Construct 库） | 中（provider 资源级） |
| 云范围 | 主打 AWS | 仅 AWS | 仅 AWS（CDKtf 另说） | 多云 |
| 本地调试 | invoke local / dev | sam local | 需配工具 | 无 |
| 费用 | 免费（<$2M 收入），需登录 | 免费 | 免费 | 免费（开源） |
| 适合 | 快速起步、函数为主的应用 | 深度 AWS 集成、想留在 CFN 体系 | 团队已有编程化 IaC 习惯 | 多云/已有 TF 资产 |

一个务实的判断：**应用以函数为中心、事件驱动为主 → Framework/SAM；基础设施种类多、要编程能力 → CDK；多云或已有运维资产 → Terraform。**

# 七、小结

- Serverless Framework 是 serverless 运动的发起者工具，`serverless.yml` 的 function+event 抽象至今仍是最好上手的模型；
- V4 的商业化（登录强制、$2M 付费线、AWS 中心化）改变了它的生态位，选型时要把它当"商业产品"而非"开源工具"评估；
- 和本系列的关系：它管的是**云上资源编排**，与你用 Tekton 搭的**构建流水线**不冲突——实际项目常见组合是"CI 用 Tekton/GitHub Actions 跑测试，部署用 `serverless deploy`/`sam deploy`"。

> 参考：[Serverless Framework Docs](https://www.serverless.com/framework/docs)、[Upgrading to V4](https://www.serverless.com/framework/docs/guides/upgrading-v4)、[License Keys](https://www.serverless.com/framework/docs/guides/license-keys)
