---
title: "CRD 与 Operator 开发：把运维经验写成控制器"
sidebarGroup: Kubernetes
shortTitle: 34 CRD 与 Operator
order: 34
date: 2026-08-24T00:00:00.000Z
category: "云原生"
tag:
  - "Kubernetes"
  - "云原生"
  - "K8s系列"
description: "【占位待学】CRD 与 Operator 开发——把运维经验写成控制器——对应总纲阶段 8 · 单元 8.6。学完本篇应能：用 kubebuilder 跑通一个自定义控制器；说清 Operator = CRD + 控制循环 的本质"
---

> **Kubernetes 系列 · 第 34/35 篇 · 🚧 占位待学**
> 上一篇：[《RBAC 与安全加固：认证、鉴权、准入三道关》](/云原生/k8s/k8s-33-rbac-security)
> 下一篇：[《DRA 与 GPU 调度：AI 时代的资源分配》](/云原生/k8s/k8s-35-dra-gpu-scheduling)
> 学习大纲：[《K8s 学习总纲》](/云原生/k8s/k8s-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：要解决的问题、知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 8 · 单元 8.6「Operator 实战」**

## 一、本文要解决的问题

K8s 只认识内置对象，而你的应用有自己的领域概念（「一个数据库实例」「一套消息队列」）。Operator 模式的回答是：**把人的运维经验写成控制器**——自定义资源（CRD）描述期望，控制循环负责收敛，人类的 runbook 变成代码。这是「会扩」档位的入场券，也是 CNCF 生态爆炸式增长的引擎。第 8 篇讲过 CRI/CNI/CSI/CRD 四个扩展点，本篇深入最后一个：CRD 怎么从「存数据的对象」长成「会干活的系统」。

## 二、知识点清单

- CRD 三步走：定义 CRD → 提交 CR → 控制器协调；spec（期望）与 status（实际）的分界
- Operator = CRD + 控制循环；与第 22 篇裸控制器的递进关系（Informer → client-go → controller-runtime）
- kubebuilder 脚手架：项目结构、Reconcile 函数、RBAC 标记（kubebuilder:rbac）
- 状态机设计：Status 子资源、Conditions 习惯用法
- 幂等与重入：Reconcile 会被反复调用，为什么不能写「一次性」逻辑
- finalizer：删除前清理外部资源的钩子
- Webhook 补强：Defaulting / Validation 什么时候需要（衔接第 23 篇准入链）
- 生态巡礼：为什么 EtcdOperator/MySQL Operator/各种 Operator 都长一个样

## 三、动手实验（学习时必须真跑）

- 用 kubebuilder 生成最小 Operator（如 `MyApp` CRD）
- 实现 Reconcile：提交 CR → 协调出一个 Deployment + Service → 删除 CR → 联动清理（finalizer 实验）
- 人为删除协调出来的 Deployment，验证控制器下一轮把它拉回（自愈的可视化）
- 给 CR 加一个 Validation webhook：拒绝非法字段值
- （可选进阶）把 Operator 打包成 helm chart 安装到 kind 集群

> ➡️ 下一篇：[《DRA 与 GPU 调度：AI 时代的资源分配》](/云原生/k8s/k8s-35-dra-gpu-scheduling)

- [ ] 说清「Operator = CRD + 控制循环」，以及它和第 22 篇裸控制器的层次关系
- [ ] 说清 Reconcile 为什么必须幂等，以及 finalizer 解决什么问题
- [ ] 跑通最小 Operator 全链路：提交 CR → 资源被创建 → 删 CR → 资源被清理

## 五、写作提示（补正文时遵守）

- 开篇问题驱动：从「凌晨三点爬起来执行数据库故障恢复 runbook」切入，Operator 是把这个 runbook 写成代码
- 结构走「是什么 → 为什么 → 怎么做 → 背景知识」；Reconcile 时序图是主图
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰；开发环境搭建可衔接[《Windows 主机构建 k8s operator 开发环境》](/云原生/extend/extend-07-windows主机中构建适用于k8s-operator开发环境)
- 版本口径：kubebuilder v4+ / Go 版本以写作时官方脚手架为准并标注核验时间
