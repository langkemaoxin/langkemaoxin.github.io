---
title: "Gateway API：七层入口的新标准与 Ingress 迁移"
sidebarGroup: Kubernetes
shortTitle: 14 Gateway API
order: 14
date: 2026-08-24T00:00:00.000Z
category: "云原生"
tag:
  - "Kubernetes"
  - "云原生"
  - "K8s系列"
description: "【占位待学】Gateway API——七层入口的新标准与 Ingress 迁移——对应总纲阶段 4 · 单元 4.2。学完本篇应能：说清 Ingress「注解地狱」的根因与 Gateway API 的角色分工设计；能用 Gateway + HTTPRoute 复刻一篇 Ingress 的全部功能"
---

> **Kubernetes 系列 · 第 14/35 篇 · 🚧 占位待学**
> 上一篇：[《Ingress 七层流量分发——原理、部署模式与动态域名》](/云原生/k8s/k8s-13-ingress-l7)
> 下一篇：[《发布策略实战——蓝绿、金丝雀、滚动与 A/B 测试》](/云原生/k8s/k8s-15-release-strategies)
> 学习大纲：[《K8s 学习总纲》](/云原生/k8s/k8s-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：要解决的问题、知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 4 · 单元 4.2「Gateway API」**

## 一、本文要解决的问题

Ingress 只有「路径 + 域名」两个维度，其余一切（重定向、重写、超时、金丝雀权重）全靠各家控制器的注解硬塞——换一家控制器，注解全部作废，这就是「注解地狱」的根因。Gateway API（2023-10 GA，官方建议新项目直接采用）用**角色分离**的设计解决它：基础设施团队管 Gateway，业务团队管 HTTPRoute，权限和变更范围天然隔离。本篇要把 Ingress 的老经验平移到新标准上，并说清「哪些场景仍可留 Ingress、哪些必须迁移」。

## 二、知识点清单

- Gateway API 的三层数据模型：GatewayClass → Gateway → HTTPRoute（对比 Ingress + IngressClass 两层）
- 角色分离设计：谁创建 Gateway、谁创建 Route，为什么这解决了注解地狱
- 路由能力对比：Header/路径匹配、流量切分（金丝雀权重）、重写重定向、TLS 配置归属
- 跨命名空间挂载：ReferenceGrant 怎么放行「别的 namespace 的 Route 挂到我的 Gateway」
- 实现现状：Gateway API 是标准不是实现——安装哪种控制器（如Envoy Gateway / Traefik / Cilium 的实现）才有实际转发
- 与 Service Mesh 的关系：Gateway API 的 GRPCRoute/TCPRoute 与东西向流量（衔接第 30 篇 Istio）

## 三、动手实验（学习时必须真跑）

- 在 minikube/kind 上安装一个 Gateway API 实现（如 Envoy Gateway）
- 用 Gateway + HTTPRoute 复刻第 13 篇 Ingress 的两条路径路由，验证行为一致
- 实现一次按权重金丝雀（90/10 切流）——对比第 13 篇里靠注解实现同样效果的写法
- 配一次 ReferenceGrant，让另一个 namespace 的 HTTPRoute 挂载成功（先复现「不配就被拒」）

> ➡️ 下一篇：[《发布策略实战——蓝绿、金丝雀、滚动与 A/B 测试》](/云原生/k8s/k8s-15-release-strategies)

- [ ] 说清 Ingress「注解地狱」的根因，以及 Gateway API 用什么设计消除它
- [ ] 说清 GatewayClass / Gateway / HTTPRoute 三层各自的创建者与职责边界
- [ ] 用 Gateway API 独立完成「域名 + 路径 + 金丝雀切流」，不查注解文档

## 五、写作提示（补正文时遵守）

- 开篇问题驱动：从第 13 篇 Ingress 的注解痛点切入，不要一上来摆 CRD 列表
- 结构走「是什么 → 为什么 → 怎么做 → 背景知识」；与第 13 篇做同任务对照表
- 所有命令、YAML、输出必须先在本机跑通再写入，不得杜撰
- 版本口径：Gateway API v1.x（GA 于 2023-10，写作时以 [gateway-api.sigs.k8s.io](https://gateway-api.sigs.k8s.io/) 当前版为准并标注核验时间
