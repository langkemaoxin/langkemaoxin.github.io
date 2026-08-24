---
title: "etcd 与 List-Watch：控制面的心跳与自愈心脏"
sidebarGroup: Kubernetes
shortTitle: 32 etcd 内幕
order: 32
date: 2026-08-24T00:00:00.000Z
category: "云原生"
tag:
  - "Kubernetes"
  - "云原生"
  - "K8s系列"
description: "【占位待学】etcd 与 List-Watch——控制面的心跳与自愈心脏——对应总纲阶段 8 · 单元 8.4。学完本篇应能：画出「kubectl apply 到 Pod Running」的完整时序图；说清组件挂掉时集群的具体症状；手写一个裸控制器体验协调循环"
---

> **Kubernetes 系列 · 第 32/35 篇 · 🚧 占位待学**
> 上一篇：[《事件驱动伸缩与集群监控——KEDA 与监控 UI》](/云原生/k8s/k8s-31-keda-monitoring)
> 下一篇：[《RBAC 与安全加固：认证、鉴权、准入三道关》](/云原生/k8s/k8s-33-rbac-security)
> 学习大纲：[《K8s 学习总纲》](/云原生/k8s/k8s-00-roadmap)

---

> **状态：待学习。** 本文为占位文档：要解决的问题、知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 8 · 单元 8.4「etcd 内幕」**（★「会扩」档的第一个深水单元）

## 一、本文要解决的问题

前面 31 篇里「Pod 会自愈」「apply 就生效」都是黑盒。本篇拆开控制面：**apiserver 是唯一读写 etcd 的入口，其它组件全是「旁观者 + 协调者」**——它们靠 List-Watch 感知变化，靠控制循环收敛状态。这层膜捅破之前，你学的都是「背命令」；捅破之后，排障有了依据（知道去看哪个组件的日志）、扩展有了章法（知道 Operator 为什么能工作）。

## 二、知识点清单

- 控制面四大组件的读写关系图：谁读 etcd、谁写 etcd（只有 apiserver 写）
- etcd 基础：Raft 多数派、watch 机制、为什么 K8s 对象存进去是 kv 而不是表
- List-Watch 双 API：先 list 拿全量、再 watch 增量——为什么轮询会打死 apiserver
- Informer 两级缓存：本地 store + delta 队列，客户端不直接打 apiserver 的原因
- 控制器模式：期望状态 vs 实际状态的收敛循环（Reconcile）
- 水平触发 vs 边沿触发：为什么 K8s 选前者、它如何容忍「错过事件」
- 组件故障的症状对照表：scheduler 挂 → 新 Pod Pending；controller-manager 挂 → 删了 Deployment 没人管；etcd 不可用 → 整个集群只读
- kubectl 的本质：apiserver 的 REST 客户端（`kubectl -v=8` 看请求）

## 三、动手实验（学习时必须真跑）

- `kubectl get pods -w` 盯事件的同时，观察 apiserver 的 watch 连接（`ss -tnp | grep 6443` 或 metrics）
- 停掉 kube-scheduler（minikube ssh / kind 环境内），提交新 Pod，记录它停在 Pending 的现象；恢复后再看它被调走
- 停掉 kube-controller-manager，删除一个 Deployment，观察「没有 RS 替你重建」的现象
- **手写 30 行裸控制器**：list Pod → 发现缺 label 就补上 → 循环；体验「协调循环」的写法（Python/Go 均可）
- `kubectl get --raw` 直读 apiserver，理解「一切皆 REST 资源」

> ➡️ 下一篇：[《RBAC 与安全加固：认证、鉴权、准入三道关》](/云原生/k8s/k8s-33-rbac-security)

- [ ] 不查资料画出「kubectl apply 一个 Deployment 到 Pod Running」的完整时序图，标出四大组件各在哪一步出手
- [ ] 说清「为什么控制器用 watch 不用轮询」以及 Informer 两级缓存解决了什么
- [ ] 裸控制器跑通：删掉一个 Pod 的 label，循环在下一轮把它补回来

## 五、写作提示（补正文时遵守）

- 开篇问题驱动：从「Pod 为什么会自愈」这个前 21 篇一直悬着的问题切入
- 结构走「是什么 → 为什么 → 怎么做 → 背景知识」；时序图是本篇主图，逐步构建不要一次抛出
- 所有命令、输出必须先在本机跑通再写入，不得杜撰；组件停机的实验注明环境（kind/minikube）与恢复步骤
- 版本口径：以写作时 kubernetes.io 当前稳定版文档为准并标注核验时间
