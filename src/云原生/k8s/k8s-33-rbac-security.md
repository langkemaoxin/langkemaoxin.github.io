---
title: "RBAC 与安全加固：认证、鉴权、准入三道关"
sidebarGroup: Kubernetes
shortTitle: 33 RBAC 安全
order: 33
date: 2026-08-24T00:00:00.000Z
category: "云原生"
tag:
  - "Kubernetes"
  - "云原生"
  - "K8s系列"
description: "【占位待学】RBAC 与安全加固——认证、鉴权、准入三道关——对应总纲阶段 8 · 单元 8.5。学完本篇应能：独立设计多团队集群的权限模型；对照 CKS 考纲完成一次安全自查"
---

> **Kubernetes 系列 · 第 33/35 篇 · 🚧 占位待学**
> 上一篇：[《etcd 与 List-Watch：控制面的心跳与自愈心脏》](/云原生/k8s/k8s-32-etcd-listwatch)
> 下一篇：[《CRD 与 Operator 开发：把运维经验写成控制器》](/云原生/k8s/k8s-34-crd-operator)
> 学习大纲：[《K8s 学习总纲》](/云原生/k8s/k8s-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：要解决的问题、知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 8 · 单元 8.5「安全纵深」**

## 一、本文要解决的问题

默认集群里人人都可能是 cluster-admin——「谁能进集群、进来能干什么、干的事合不合规」是三件不同的事，K8s 用三道关分别把守：认证（Authentication）、鉴权（Authorization/RBAC）、准入（Admission）。这也是 CKS 认证考纲的主体。本篇要把「裸奔的默认配置」逐项加固成生产可用的安全基线，并补上 1.25 移除 PSP 之后的安全新世界（内置 Pod Security Admission、v1.36 GA 的 Mutating Admission Policy）。

## 二、知识点清单

- 认证三道关的位置：请求 → 认证（你是谁：证书/ServiceAccount/OIDC）→ 鉴权（你能干什么：RBAC）→ 准入（这么干行不行：Policy/ValidatingWebhook）
- RBAC 四件套：Role / ClusterRole / RoleBinding / ClusterRoleBinding 的组合矩阵
- ServiceAccount：Pod 的身份；auto-mount 的风险与关闭方法
- `kubectl auth can-i` 的自查与 impersonate 排障法
- 准入控制链：内置准入（如 Pod Security Admission 的 enforce/audit/warn 三模式）→ ValidatingWebhook / MutatingWebhook
- PSP 之死与继任者：1.25 移除 PSP 后，Pod 安全标准（Privileged/Baseline/Restricted）怎么落地到 namespace
- 生产安全基线清单：RBAC 最小化、NetworkPolicy 默认拒绝、镜像准入扫描、secret 不进 YAML、审计日志开启
- 衔接第 23 篇：沙箱运行时（Kata/gVisor）作为「运行时最后防线」

## 三、动手实验（学习时必须真跑）

- 给「开发团队」建只读账号 + 给「发布系统」建限 namespace 的写权限，各自 `can-i --list` 验证权限面
- 故意用只读账号执行 apply，观察 403 与 RBAC 判定的 apiserver 日志
- 对一个 namespace 启用 Pod Security Admission 的 Restricted 模式，提交违规 Pod（privileged: true），观察拒绝信息
- 部署一个最小 ValidatingWebhook（如拒绝没有 resource requests 的 Pod），并复现「Webhook 挂了整个集群写不进对象」的经典事故再修复（failurePolicy 与 namespaceSelector 排除）

> ➡️ 下一篇：[《CRD 与 Operator 开发：把运维经验写成控制器》](/云原生/k8s/k8s-34-crd-operator)

- [ ] 说清认证 / 鉴权 / 准入三道关各拦什么，给一个请求画出过三关的流程
- [ ] 独立设计「多团队共用一个集群」的 RBAC 模型并落地验证
- [ ] 对照 CKS 考纲安全域逐条自查打勾，写出自查清单
- [ ] 说清 PSP 为什么被移除、现在的替代方案是什么

## 五、写作提示（补正文时遵守）

- 开篇问题驱动：从「一次误删 namespace 事故」或「默认 ServiceAccount 的权限面」切入
- 结构走「是什么 → 为什么 → 怎么做 → 背景知识」；权限矩阵表与三道关流程图是主图
- 所有命令、YAML、输出必须先在本机跑通再写入，不得杜撰
- 版本口径：PSP 已于 1.25 移除；Mutating Admission Policy GA 于 v1.36——写作时核验 kubernetes.io/docs 当前状态并标注时间
