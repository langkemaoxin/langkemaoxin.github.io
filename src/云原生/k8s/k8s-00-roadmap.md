---
title: Kubernetes 学习总纲：零基础到资深专家的完整教学大纲
sidebarGroup: Kubernetes
shortTitle: 00 学习总纲
order: 0
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - 学习路线
  - K8s系列
description: 以西蒙学习法拆碎 Kubernetes 官方知识域：起步跑通 → 对象与工作负载 → 四层联网 → 配置与存储 → 七层入口与发布 → 可观测排障 → 生产集群从零到高可用 → 交付流水线 → 深水区（Cilium/Istio/etcd/RBAC/Operator/DRA）。九大阶段、约 40 个知识单元，每单元带动手实验与验收标准，总周期约 30 周，四档验收（会用/会修/会建/会扩）锚定 CKA/CKS，基准 Kubernetes v1.36（2026-08 核验）。
---

> **Kubernetes 系列 · 总纲第 0 篇**  
> 本文的目标只有一个：**让一个 K8s 零基础的学生，沿这条线走完，成为能独立部署、排障、从零建生产集群、并向生态深处扩展的资深专家**。本篇是「路线」——先看清整张地图，再决定每一步往哪走；具体知识点的「教材」按本大纲逐篇展开。

---

## 开头：为什么学 K8s 之前，要先写一份大纲？

因为 K8s 的知识点是所有技术里**最像一张网**的：

- 你想学「Pod 怎么暴露给别人访问」→ 讲 Service 的资料说「前提是懂 kube-proxy 和 iptables」→ iptables 又牵出内核 netfilter、Pod 网络、CNI；
- 你想学「为什么我的 Pod 一直 Pending」→ 讲排障的资料说「先看调度器怎么打分」→ 调度又牵出资源请求、亲和性、污点、抢占；
- 你想直接背 YAML 应付工作 → 背到 `securityContext` 时发现不懂 Linux 用户与 capabilities，背到 `resources` 时发现不懂 cgroups，全对不上。

没有路线图的学习是这样的：看 Deployment → 卡在 Service → 回去补网络 → 被 Overlay/VXLAN 劝退 → 又跳去学 Helm → Helm 装的 Istio 又把你拽回流量治理……**每个知识点背后都站着三个前置知识点，学到哪都是黑洞**。

而 2026 年的 K8s 早已不只是「一个跑容器的平台」：Gateway API 取代 Ingress、DRA（动态资源分配）让 GPU 调度成为一等公民、eBPF 重写数据面、Operator 模式撑起整个数据库生态——**不先画地图，必然在 CNCF 几百个项目的迷宫里迷路**。

这份大纲要做的事就一件：**把这张互锁的知识网，压平成一条单向的线**——每个单元只依赖前面的单元，学完一个，就解锁一片区域。这是西蒙学习法在编排领域的落地方式。

**前置要求**：先走完 [Docker 学习总纲](/云原生/docker/docker-00-roadmap)（镜像、容器、网络三篇是硬前置——K8s 操作的最小单元就是镜像里的容器）；[Linux 基础 6 篇](/Linux/basics/linux-01-nsenter-prerequisites)是软前置，阶段 2 抓包、阶段 6 证书时回看即可。

---

## 一、K8s 到底在解决什么问题：一张知识底图

先回答「这个技术为什么存在」。K8s 的一句话本质：**你把「期望状态」写成 YAML 交给它，集群里的一群控制器持续把「实际状态」推向你的期望**——应用挂了自己拉起、副本少了自己补齐、节点废了自己迁移。「运维」从「人盯机器」变成了「写意图、看收敛」。

但这个「自动收敛」不是魔法，它是三层结构的组合，也是本大纲的骨架：

| 层 | 解决什么问题 | 不懂这层会怎样 |
|----|--------------|----------------|
| ① 控制面：API Server + etcd + 控制器 | 所有状态收进一个「事实库」，控制器围着它转 | K8s 对你就是黑魔法；etcd 出事时只会重装集群 |
| ② 数据面：kubelet + 容器运行时 + kube-proxy | 每台机器上的「执行代理人」——拉容器、改 iptables | 排障分不清是「控制面没下令」还是「数据面没执行」 |
| ③ 生态扩展：CRI/CNI/CSI/CRD | 运行时、网络、存储、自定义资源全部插件化 | 以为一切是 K8s 自带的；换一个 CNI 就寸步难行 |

注意两个常被忽略的事实：

1. **K8s 不运行容器**——kubelet 通过 CRI 接口把活儿委托给 containerd，containerd 再调 runc 真正创建容器。听懂了这条链（Docker 总纲阶段 6 讲过），才能听懂「K8s 弃用 Docker」到底弃用了什么：只是 dockershim 那层胶水，容器生态完好无损。
2. **声明式不是「更高级的命令行」**——`kubectl apply` 提交的是「意图」，真正干活的是各控制器的调谐循环（reconcile loop）。理解了「期望 vs 实际」这对概念，一半的 K8s 怪象（Pod 被删了又冒出来、改了 ConfigMap 没生效）会瞬间变直觉。

### 官方文档版图（大纲的取材来源）

以下结构核验自 [kubernetes.io/docs](https://kubernetes.io/docs/home/)，2026-08-24。官方文档六大板块，**这张版图决定了本大纲的广度**：

| 板块 | 覆盖什么 | 在大纲中的位置 |
|------|----------|---------------|
| **Get Started / Tutorials** | 安装、迷你集群、初学者 15 分钟教程 | 阶段 0 |
| **Concepts** | 架构、工作负载、Service 网络、存储、配置、调度、安全、策略、集群管理 | 阶段 1~4、8 主体 |
| **Tasks** | 具体操作步骤（怎么配探针、怎么滚动更新……） | 各阶段实验的操作手册 |
| **Reference** | kubectl 命令、API 规范、组件 CLI 参数 | 全程工具书，随查随用 |
| **Concepts → Security** | ServiceAccount、RBAC、Pod 安全标准、证书 | 阶段 8（CKS 锚点） |
| **Contribute / Blog** | 发行说明、KEP 特性演进 | 版本雷达（见下节） |

### 版本现状（2026-08 核验）

- **当前稳定版 v1.36**；**v1.37 计划 2026-08-26 发布**，亮点集中在 DRA、安全与网络——本大纲写完时它可能刚落地，学的时候以 `kubernetes.io/releases` 实查为准；
- **CKA 考试环境 v1.35**（2 小时实操、66% 及格）；**CKS 同为 v1.35**（报考前提：CKA 在有效期内）——两者都随最新 minor 版滚动，考前查官方 handbook；
- **DRA（Dynamic Resource Allocation，GPU/加速器调度）已于 v1.35 GA**——AI 负载时代最重要的调度进化，旧教材普遍缺失，本大纲已建占位专篇；
- **Gateway API 于 2023-10 发布 v1.0（GA）**，三年后的今天已是 Ingress 的官方继任者，生产采用率持续上升；
- **原生 Sidecar 容器已于 v1.33 GA**——旧文里「用 Init 容器 hack Sidecar」的做法已过时，学习时注意甄别。

---

## 二、学成什么样，才算「资深专家」？

先立靶子。「资深」不是「背得出所有字段」，它有四档验收，逐级递进：

| # | 档位 | 具体表现 |
|---|------|----------|
| 1 | **会用** | 任何应用拿 YAML 声明式部署：工作负载选型、扩缩、暴露、配置、持久化一条龙，全程不抄现成模板 |
| 2 | **会修** | Pod 起不来、Service 不通、OOMKilled、证书过期——能顺着「控制面 → 数据面 → 应用」三层定位根因，而不是删了重建 |
| 3 | **会建** | 从裸机到高可用生产集群：kubeadm、证书、etcd、选型对比（RKE2/k0s/sealos）、安全运行时，关一台 master 业务不倒 |
| 4 | **会扩** | 面向生态深水区：Cilium/eBPF、Istio、etcd 内幕、RBAC 安全纵深、自写 Operator、DRA/GPU 调度——并能讲清每个取舍 |

注意「资深」的定义里**没有**：背 kubectl 全部旗标（有 `--help` 和 Reference）、读 kube-apiserver 源码、手写 CNI 插件（那是最后的可选项，不是必修）。**机制直觉 + 排障路径 + 取舍判断力**才是分水岭——这三样都要靠动手实验喂出来，这正是西蒙学习法强调「及时反馈」的原因。

**认证锚点的 2026 年现状**：云原生技能的市场硬通货是 CNCF 的 **CKA**（阶段 6 结束即可冲刺）与 **CKS**（阶段 8 结束）；KCNA/CKAD 是轻量旁支，本大纲主线覆盖 CKA/CKS 全部知识域，不单独为它们绕路。

---

## 三、西蒙学习法在本领域的四个落法

西蒙学习法的核心：**把领域拆碎成小单元，连续地、单点聚焦地逐个吃掉，每个单元立刻获得反馈**。对应到本大纲：

1. **拆碎**：每个知识单元控制在 0.5 ~ 2 天内可完成。绝不出现「学 K8s 网络」这种大块头，只有「用 iptables-save 找到 Service 的那条 DNAT 规则」这种小块。
2. **单点聚焦**：一次只学一个单元。学 Service 时不要顺手去翻 Cilium——忍住，它排在阶段 8；Istio 排在阶段 8，主线学完前一眼都不要看。
3. **及时反馈**：每个单元都配**动手实验**和**吃透的标准**。实验跑不通 = 没学会，不进下一单元。K8s 的实验成本高于 Docker（要起整个集群），策略是：**阶段 0~5 全程 minikube 单机**（笔记本即可），阶段 6 才上多节点——绝不在第 2 周就去折腾三台虚机。
4. **连续推进**：每天 1.5 ~ 2 小时，每周 5 ~ 6 天，连续推进约 30 周。可以慢，**顺序不要乱**：每个阶段的验收没过，不进下一阶段。30 周看起来长，但这是「从零到能建生产集群并懂安全纵深」的完整距离，比报班速成后再花三年还债要快。

### 学习环境清单（开工前一次备齐）

| 工具 | 版本建议 | 用途 |
|------|----------|------|
| WSL2（Ubuntu）或一台 Linux 虚机 | Ubuntu 22.04+，内存 8G+ | 全程主实验场；容器与 K8s 组件都是 Linux 原生 |
| minikube | 最新稳定版，`--driver=docker` | 阶段 0~5 单机集群（与 Docker 总纲同一实验场） |
| kubectl | 与集群 minor 版本差 ±1 以内 | 全程唯一主力 CLI |
| kind | 最新稳定版 | 阶段 4 起多节点/Gateway API 实验备用 |
| Helm | 3.x | 包管理认脸与实验应用安装 |
| 基础工具 | curl / jq / tree / iptables / tcpdump | 排障与验证输出用，缺什么 `apt install` 什么 |
| 3 台虚机或云主机 | 2C4G 起 | 阶段 6 专用，**提前别买**，用到再开 |

### 已有弹药与缺口

本板块已有 **30 篇**文章（20 篇概念主线 + 10 篇实践），按新大纲归位后是各阶段的「弹药」——学到对应单元时回看，能省下近一半时间（各阶段末尾标注）。同时对照 2026-08 的官方知识域，本系列已按大纲建好 **5 篇占位**（标 🚧：知识点清单、实验与验收标准已就绪，正文按「先学习、先实验、再撰写」补全），全系列共 35 篇、严格按下列九阶段排序：

| 占位 | 落位 | 为什么要补 |
|------|------|-----------|
| 🚧 Gateway API 专篇 | 第 14 篇 · 阶段 4 | Ingress 的官方继任者，GA 三年已到生产成熟；旧文只覆盖 Ingress，且两者的角色模型差异巨大 |
| 🚧 RBAC 与安全纵深 | 第 33 篇 · 阶段 8 | ServiceAccount/RBAC/Pod 安全标准/证书体系——CKS 考试主体，旧文只在 Secret/ConfigMap 篇（第 12 篇）带过 securityContext |
| 🚧 etcd 内幕 | 第 32 篇 · 阶段 8 | 控制面心脏：Raft、watch 机制、备份恢复——排障与建集群的底气，旧文从未深入 |
| 🚧 Operator 实战 | 第 34 篇 · 阶段 8 | 旧文只有 CRD 认知（08 篇），「从零写一个 Operator」是「会扩」档的毕业设计 |
| 🚧 DRA/GPU 调度 | 第 35 篇 · 阶段 8 | AI 负载时代刚需，v1.35 刚 GA——教材市场近乎空白，面试新宠 |

---

## 四、知识全景图

先看地图全貌（自底向上，每层只依赖下层）：

```
                       ┌──────────────────────────────────────────────┐
   阶段 8  会扩         │ Cilium/eBPF · Istio · KEDA · etcd 内幕       │
   （第 28~30 周）      │ RBAC 安全纵深 · Operator · DRA/GPU   → CKS   │
                       ├──────────────────────────────────────────────┤
   阶段 7  交付         │ Harbor · Jenkins · Argo Rollouts · 上云实战  │
   （第 24~27 周）      │ Longhorn/GlusterFS 生产存储                  │
                       ├──────────────────────────────────────────────┤
   阶段 6  会建         │ kubeadm 高可用 · 选型对比 · 国产化            │
   （第 20~23 周）      │ Kata/gVisor 安全容器               → CKA 冲刺 │
                       ├──────────────────────────────────────────────┤
   阶段 5  会修         │ Prometheus · HPA · ELK/EFK · 容器内 JVM      │
   （第 16~19 周）      │                                              │
                       ├──────────────────────────────────────────────┤
   阶段 4  入口         │ Ingress · Gateway API · 发布策略（蓝绿/金丝雀）│
   （第 13~15 周）      │                                              │
                       ├──────────────────────────────────────────────┤
   阶段 3  状态         │ ConfigMap/Secret · PV/PVC · 动态供给          │
   （第 10~12 周）      │                                              │
                       ├──────────────────────────────────────────────┤
   阶段 2  联网         │ Service 四层 · kube-proxy · CNI 网络模型      │
   （第 7~9 周）        │ 集群 DNS · NetworkPolicy                     │
                       ├──────────────────────────────────────────────┤
   阶段 1  会用         │ 对象模型 · Pod · Deployment · StatefulSet     │
   （第 2~6 周）        │ Job/CronJob · HPA · CRI/CNI/CSI/CRD          │
                       ├──────────────────────────────────────────────┤
   阶段 0  起步         │ 云原生全景 · 八大架构 · minikube 实验场       │
   （第 1 周）          │                                              │
                       └──────────────────────────────────────────────┘
```

---

## 五、阶段 0：起步——为什么是 K8s，先把集群跑起来（第 1 周）

**为什么有这个阶段**：先建立「K8s 是来解救谁的」的痛感，再动手。这个阶段结束，K8s 对你不再是「别人嘴里的词」，而是一台能起停自如的本地集群。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 0.1 为什么会有 K8s | 「单机容器」到「成百上千容器」，中间缺了什么？ | 起一个 3 副本 Deployment，手动 kill 一个 Pod，观察它自愈 | 说清「编排」到底编排什么：调度、扩缩、自愈、发现 |
| 0.2 八大宏观架构与数据流 | API Server/etcd/scheduler/controller-manager/kubelet 各是谁？ | `kubectl get --raw /healthz` 探 API Server；翻 scheduler 的日志看它「相中」了哪个节点 | 白板画出「apply → API Server → etcd → scheduler → kubelet → 容器」完整链路 |
| 0.3 minikube 实验场 | 一台笔记本怎么拥有一个真集群？ | minikube start/delete/stop 全流程；dashboard 插件开起来点点看 | 集群起停自如，`get nodes`/`cluster-info`/`version` 三件套零文档跑通 |

**阶段验收**：删掉一个 Pod 看它 30 秒内自愈，并说清「是谁发现、谁决策、谁重建」；minikube 集群从删除到重建全程不查资料。

**弹药**：[云原生原理与演进](./k8s-01-cloud-native.md)、[穿透八大宏观架构](./k8s-02-macro-architecture.md)、[minikube 运行时实操](./k8s-03-minikube-runtime.md)。

---

## 六、阶段 1：会用——对象模型与工作负载（第 2 ~ 6 周）

**为什么有这个阶段**：这是 CKA 的主体知识域，也是「会用」档的全部内容——任何应用到手，能选对负载类型、写对 YAML、配好资源，声明式地交给集群。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 1.1 一切皆对象 | apiVersion/kind/metadata/spec 各是什么？声明式到底声明了什么？ | `--dry-run=client -o yaml` 生成骨架改完再 apply；用 `explain` 逐层查字段 | 说清 `create` 与 `apply` 的本质区别（命令式一次 vs 声明式可重复） |
| 1.2 Pod 深入 | Pause 容器是什么？Init 容器、探针、原生 Sidecar、QoS 各管什么？ | 把 liveness 阈值故意写苛刻，观察杀循环；initContainer 按序执行 | 说清 liveness 与 readiness 失败的不同后果；能判一个 Pod 属于哪档 QoS |
| 1.3 Deployment 与副本控制 | RC→RS→Deployment 怎么演进来的？滚动更新的旋钮是什么？ | `rollout pause/resume/undo` 全走一遍；改 maxSurge/maxUnavailable 观察替换节奏 | 说清滚动更新时 RS 在干什么、回滚为什么不是「重新 apply 旧 YAML」 |
| 1.4 三种特殊负载 | DaemonSet/StatefulSet/Job/CronJob 各自承包哪类应用？ | StatefulSet 起 3 副本，观察 Pod 名与存储的稳定绑定；CronJob 注意时区坑 | 说清「什么场景绝不用 Deployment」并各举一例 |
| 1.5 弹性与扩展点认脸 | HPA 靠什么指标扩容？CRI/CNI/CSI/CRD 各替换了什么？ | 装 metrics-server 后压测触发 CPU 扩容；`get crd` 看集群里已有的自定义资源 | 说清 HPA 为什么需要 metrics-server；四个扩展点对应的「官方只定接口」哲学 |
| 1.6 资源治理 | requests 与 limits 影响的是同一件事吗？Quota 管谁？ | 配 LimitRange 后建不写资源的 Pod 看默认值注入；删 Owner 观察 Deploys 级联消失 | 说清 requests 影响调度、limits 影响运行时这两件独立的事 |

**阶段验收**：不用任何向导，纯 YAML 部署「无状态 Deploy + 有状态 StatefulSet + 定时 CronJob」三件套并全部 Running；滚动更新一次并回滚一次。

**弹药**：[基本概念与 kubectl](./k8s-04-objects-kubectl.md)、[Pod 生命周期](./k8s-05-pod-workload.md)、[Deployment 与副本控制](./k8s-06-deployment-rs.md)、[DaemonSet/StatefulSet/Job](./k8s-07-daemon-stateful-job.md)、[HPA 与扩展点](./k8s-08-hpa-cri-crd.md)。

---

## 七、阶段 2：联网——四层 Service 与集群 DNS（第 7 ~ 9 周）

**为什么有这个阶段**：Pod 是易变的，流量需要稳定的锚点。网络是 K8s 面试与排障的最高频深水区，也是「机制直觉」的试金石——这里不搞懂，后面 Ingress、Mesh 全是玄学。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 2.1 Service 与四类 Port | ClusterIP 没有进程监听，为什么能通？port/targetPort/nodePort 各是谁的口？ | `iptables-save` 里找到 Service 对应的 DNAT 规则（衔接 Linux 基础篇） | 说清「ClusterIP 只是 iptables 里的一个钩子」这件事 |
| 2.2 kube-proxy 三模式 | userspace/iptables/IPVS 差在哪？几千 Service 时谁先趴下？ | 数一数每加一个 Service 多出多少条 iptables 规则；有条件切 IPVS 对比 | 说清大规模集群为什么推荐 IPVS |
| 2.3 集群网络模型与 CNI | Pod 的 IP 从哪来？Underlay 与 Overlay 的取舍是什么？ | 起两个 Pod 互 ping；看 CNI 配置文件确认网段与转发模式 | 说清 K8s 只约定「Pod 网络平坦互通」，实现全权交给 CNI |
| 2.4 集群 DNS | `svc.namespace.svc.cluster.local` 每一段是什么？ndots 坑在哪？ | Pod 内 nslookup 四种 FQDN；看 resolv.conf 对比宿主机 | 说清跨 namespace 访问为什么要写全名、`FQDN vs 短名` 的解析顺序 |
| 2.5 NetworkPolicy | 默认全通还是全禁？策略由谁执行？ | 给 namespace 配 default-deny，再逐条放行，验证连通性变化 | 知道 NetworkPolicy 靠 CNI 实现——CNI 不支持，写再多也是废纸 |

**阶段验收**：画出「集群外 curl → NodePort → Service → 某个 Pod」的完整路径，标出每一步的机制（DNAT/选 Pod/conntrack）；并用 NetworkPolicy 把一个应用锁到「只开 80」。

**弹药**：[Service 四层流量分发](./k8s-09-service-l4.md)、[Underlay/Overlay 网络与集群 DNS](./k8s-10-network-dns.md)。

---

## 八、阶段 3：状态——配置与存储（第 10 ~ 12 周）

**为什么有这个阶段**：容器「用完即弃」，配置与数据必须住在 Pod 之外。存储选型与 Reclaim Policy 理解错，删 PVC 就是删库——这是新手最贵的一类事故。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 3.1 ConfigMap 与 Secret | 注入 env 与挂 volume 两种方式，热更行为为什么不同？ | 同一份 ConfigMap 两种方式注入，改源观察 Pod 内生效差异 | 说清 env 不热更、volume 靠 symlink 原子切换的机制 |
| 3.2 Volume 家族与 PV/PVC | emptyDir/configMap/PV 各活多久？静态与动态供给差在哪？ | 开 StorageClass 动态供给一个 PVC，删 Pod 重建验证数据还在 | 说清 PV-PVC 绑定关系与 Reclaim Policy 三档各自的后果 |
| 3.3 配置排障入门 | Pod 起不来时，第一步看哪里？ | 故意部署错误镜像/错误配置各一次，用 `describe`/`events` 定位 | 掌握 Pending/ImagePullBackOff/CrashLoopBackOff 三类排障树 |

**阶段验收**：给阶段 1 的三件套全部接上 ConfigMap 配置与 PVC 持久化，整体删除重建后状态不丢。

**弹药**：[应用持久化存储](./k8s-11-pv-pvc.md)、[Secret、ConfigMap 与常见部署排障](./k8s-12-secret-configmap.md)。

---

## 九、阶段 4：入口——七层流量与发布（第 13 ~ 15 周）

**为什么有这个阶段**：四层 Service 解决「通不通」，七层入口解决「一个域名怎么路由到 N 个应用、新旧版本怎么切流量」——这是业务方对集群最直接的体感。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 4.1 Ingress 七层 | Ingress 资源与 Ingress Controller 是什么分工？ | minikube 开 ingress 插件，一个 IP 按 path/host 路由到两个应用 | 说清「Ingress 只是 YAML，Controller 才是干活的」；画清与 Service 的层级关系 |
| 4.2 Gateway API | GatewayClass/Gateway/HTTPRoute 怎么把「平台团队」和「业务团队」解耦？ | kind 集群装一个 Gateway API 实现（如 Envoy Gateway），路由两个服务 | 说清它相对 Ingress 的三赢：角色分工、跨命名空间、表达力 |
| 4.3 发布策略 | 蓝绿、金丝雀、滚动、A/B 各适合什么场景？ | 用双 Deployment + Service selector 切换实现蓝绿；原生手段试「10% 流量」发现做不到 | 说清「按流量百分比」原生缺失，为什么需要 Argo Rollouts（阶段 7 埋线） |

**阶段验收**：同一域名蓝绿切换新版本，观察请求全程不 5xx；再用 Gateway API 复刻同样的路由结构。

**弹药**：[Ingress 七层流量分发](./k8s-13-ingress-l7.md)、[发布策略实战](./k8s-15-release-strategies.md)；🚧 [Gateway API 专篇](./k8s-14-gateway-api.md)已占位（第 14 篇）。

---

## 十、阶段 5：会修——可观测与排障（第 16 ~ 19 周）★分水岭之一

**为什么有这个阶段**：「会用」与「会修」的分界。出事时看得见指标、捞得到日志、判得准根因——生产环境里，这比会部署值钱得多。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 5.1 监控体系 | Prometheus Operator 怎么做到「加个 YAML 就被采集」？ | 装 kube-prometheus-stack，看 ServiceMonitor 怎么选中目标 | 说清指标从 exporter 到 Grafana 面板的完整链路 |
| 5.2 弹性进阶 | 除了 CPU/内存，怎么按业务指标（QPS）扩容？ | 部署 Prometheus Adapter + custom-metrics，配一条 QPS 规则触发 HPA | 说清 metrics 链路：业务指标 → Adapter → HPA 决策 |
| 5.3 日志体系 | ELK 与 EFK 差在哪？采集用 sidecar 还是 DaemonSet？ | 部署一套 EFK，把阶段 1 三件套的日志收上来检索 | 说清 stdout 日志、节点文件、中心化检索三级跳的取舍 |
| 5.4 容器里的应用 | JVM 在容器里为什么「看到的核数不对」？OOMKilled 是谁杀的？ | 同一 JVM 应用在错配与正确参数下各跑一次压测，对比 GC 与内存表现 | 说清容器内存限制与 JVM 堆的关系、UseContainerSupport 的作用 |

**阶段验收**：亲手制造三个故障（探针错配、limits 太小、NetworkPolicy 误禁），要求先在监控/日志上「看到」它们，再定位、修复——全程不删集群。

**弹药**：[基于 QPS 的动态扩缩容](./k8s-16-prometheus-hpa.md)、[custom-metrics 规则配置](./k8s-17-custom-metrics.md)、[集群日志收集 ELK/EFK](./k8s-18-logging-elk-efk.md)、[容器内 JVM 参数解析](./k8s-19-jvm-in-container.md)。

---

## 十一、阶段 6：会建——生产集群从零到高可用（第 20 ~ 23 周）★CKA 冲刺点

**为什么有这个阶段**：从「集群的用户」变成「集群的主人」。亲手搭一遍，前面五个阶段的所有机制（证书、etcd、调度、网络）会第一次连成整体——**这一阶段结束即可报名 CKA**。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 6.1 kubeadm 高可用 | 证书怎么签发与轮换？堆叠 etcd 与外置 etcd 差在哪？ | 3 节点 kubeadm 集群从裸机到跑业务，LB+VIP 做 API Server 入口 | 关掉一台 master，业务不掉线，并能说清每个组件此时在干什么 |
| 6.2 部署选型 | 二进制/RKE2/k0s/sealos/kubespray 各适合谁？ | 用第二种方式（推荐 k3s 或 sealos）再搭一次对比体验 | 写出一份「什么场景选什么」的决策表 |
| 6.3 国产化与运行时 | 麒麟/OpenEuler 上有什么不同？CRI-O/iSula 是什么？ | （有条件）在国产 OS 虚机上完成一次部署；否则研读兼容性清单 | 说清 CRI 生态里 containerd/CRI-O/iSula 的关系 |
| 6.4 安全容器 | Kata/gVisor 用什么换安全？性能代价多大？ | 跑一个 Kata 容器，对比普通 runc 容器的启动延迟 | 说清「共享内核 vs 独立内核/microVM」的安全边界差异 |

**阶段验收**：三节点集群从零搭好并部署阶段 1 三件套；手动模拟 master 宕机与节点 NotReady 两次事故并自愈；**此阶段结束，CKA 模拟考稳定过 80% 再报名**（考试环境 v1.35，及格线 66%）。

**弹药**：[kubeadm 从零到高可用](./k8s-20-deploy-kubeadm-ha.md)、[部署方法横向对比](./k8s-21-deploy-methods.md)、[国产化 OS 与容器运行时](./k8s-22-os-runtimes.md)、[安全容器运行时](./k8s-23-sandbox-runtimes.md)。

---

## 十二、阶段 7：交付——从代码到集群（第 24 ~ 27 周）

**为什么有这个阶段**：会建集群只是平台，让业务「一键上云」才是价值闭环。这一阶段把镜像仓库、CI/CD、高级发布、生产存储串成一条真实流水线。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 7.1 生产存储 | Longhorn/GlusterFS 怎么给集群装上「分布式硬盘」？ | 部署 Longhorn 并验证节点故障时副本自动补齐 | 说清副本数、条带、快照在分布式存储里的角色 |
| 7.2 镜像供应链 | 私有仓库怎么建？CI 凭证怎么安全下发？ | 部署 Harbor，把阶段 5 的 JVM 应用推上去并拉取部署 | 说清 imagePullSecrets 与 RBAC 的配合 |
| 7.3 CI/CD 流水线 | git push 之后怎么全自动到集群？ | Jenkins 流水线：构建 → 推镜像 → 更新 Deployment → 灰度 | 说清「镜像 tag 不变」的坑与不可变部署的正确姿势 |
| 7.4 高级发布 | Argo Rollouts 的金丝雀与原生方案的差距？原地升级解决什么？ | Argo Rollouts 按 10%/30%/60% 阶梯发布；OpenKruise 原地升级对比重建 | 说清「原地升级为什么省资源、牺牲了什么」 |
| 7.5 项目上云实战 | 一个真实多语言项目怎么整体搬上集群？ | Java/Python/Golang 三服务 + 中间件全上云 | 能独立产出「上云方案文档」：负载选型、网络、存储、发布全链路 |

**阶段验收**：一条流水线从 git push 触发到金丝雀自动发布全程无人值守；期间手动注入一次构建失败，流水线正确熔断。

**弹药**：[分布式存储方案](./k8s-24-storage-longhorn-glusterfs.md)、[Harbor + K8s 部署 SpringCloud](./k8s-25-harbor-springcloud.md)、[Jenkins 自动化灰度](./k8s-26-jenkins-canary.md)、[Argo Rollouts 与 OpenKruise](./k8s-27-advanced-rollout.md)、[项目上云实战](./k8s-28-app-onboarding.md)。

---

## 十三、阶段 8：会扩——深水区与专家化（第 28 ~ 30 周）★毕业设计

**为什么有这个阶段**：从「用好 K8s」到「扩展 K8s」。这一阶段既是 CKS 的知识域，也是资深工程师与熟练使用者的分水岭——别人换 CNI、写 Operator、排 etcd 故障时，你是团队里那个能拍板的人。

| 单元 | 回答的核心问题 | 动手实验 | 吃透的标准 |
|------|----------------|----------|------------|
| 8.1 网络深水区 | eBPF 数据面与传统 kube-proxy 差在哪？双栈怎么配？ | 部署 Cilium 替换 kube-proxy，验证连通性与可观测性提升 | 说清 eBPF「内核态短路径」解决 iptables 的什么痛 |
| 8.2 Service Mesh | Sidecar 模式把流量治理移到了哪一层？ | Istio + Bookinfo，按比例切流、注入故障、金丝雀 | 说清 Mesh 与 Gateway API 的分工边界 |
| 8.3 事件驱动伸缩 | 没有请求压力时（如队列堆积）怎么扩容？ | KEDA 按 Kafka/RabbitMQ 深度伸缩一个消费者 | 说清 KEDA 与 HPA 的关系（外推指标而非替换） |
| 8.4 etcd 内幕 🚧 | Raft 怎么保证一致性？watch 是怎么推送的？ | etcdctl 备份/恢复一次集群；观察 quorum 丢失时的集群行为 | 说清「3 与 4 节点谁更稳」这类容量问题 |
| 8.5 安全纵深 🚧 | SA/RBAC/PSS 三层各拦住什么？ | 最小权限改造一个应用的 SA；PSS 限制特权 Pod | 过一遍 CKS 知识域清单，锚定安全视角 |
| 8.6 Operator 实战 🚧 | CRD + 控制器怎么把运维知识代码化？ | 从零写一个简单 Operator（如自动管理某配置的 Sidecar） | 说清 reconcile 的「幂等收敛」思想——它就是整个 K8s 的思想 |
| 8.7 DRA/GPU 调度 🚧 | AI 训练负载与传统无状态服务调度差在哪？ | 有 GPU 则跑一个 DRA 示例；无 GPU 则吃透 DeviceClass/ResourceSlice 模型 | 认脸级：知道 DRA 为何而生、v1.35 GA 的意义 |

**阶段验收（毕业设计，二选一）**：① 交付一个自己的 Operator 并写入本博客；② 完成一次 CKS 全真模拟考并复盘。两者都做，直接封神。

**弹药**：[网络进阶——Cilium](./k8s-29-advanced-network.md)、[Service Mesh 与 Istio](./k8s-30-service-mesh-istio.md)、[KEDA 与监控 UI](./k8s-31-keda-monitoring.md)；🚧 [etcd 内幕](./k8s-32-etcd-listwatch.md)、[RBAC 安全](./k8s-33-rbac-security.md)、[Operator 实战](./k8s-34-crd-operator.md)、[DRA/GPU](./k8s-35-dra-gpu-scheduling.md) 四篇已占位（第 32~35 篇）。

---

## 十四、资深自检 10 问

走完全程后，合上资料回答——每题都要能「讲给同事听」：

1. 一个 Pod 从 `kubectl apply` 到 Running，中间每一站发生了什么？（API Server → etcd → scheduler → kubelet → CRI）
2. Service 的 ClusterIP 没有任何进程监听，流量为什么能通？
3. 滚动更新时 maxSurge 与 maxUnavailable 分别牺牲什么换什么？
4. Pod 卡 Pending / ImagePullBackOff / CrashLoopBackOff，各自排障的第一步看哪里？
5. 本地 `docker run` 能跑的镜像，到集群里 ImagePullBackOff——可能坏在哪几环？
6. StatefulSet 为什么必须配 Headless Service？「稳定网络标识」到底稳定的是什么？
7. PVC 一直 Pending，问题可能出在哪几层？各怎么验证？
8. HPA 到了上限但 CPU 仍高——指标链路上可能卡在哪几个环节？
9. NetworkPolicy 的默认行为是什么？怎么验证一条策略真的生效了？
10. etcd quorum 丢失后集群还能读写吗？怎么从备份完整恢复？

十问能答出八问，你已经超过市面上大多数「会用 K8s」的工程师；十问全清，欢迎进入深水区。

---

## 十五、总时间线

| 周次 | 阶段 | 里程碑 | 认证节点 |
|------|------|--------|----------|
| 1 | 0 起步 | minikube 集群起停自如 | |
| 2 ~ 6 | 1 会用 | 三件套纯 YAML 部署 | |
| 7 ~ 9 | 2 联网 | 画通四层流量全路径 | |
| 10 ~ 12 | 3 状态 | 配置与持久化落地 | |
| 13 ~ 15 | 4 入口 | 蓝绿零 5xx 切换 | |
| 16 ~ 19 | 5 会修 | 三故障定位修复 | |
| 20 ~ 23 | 6 会建 | 三节点 HA 集群 + 宕机演练 | **CKA 报名** |
| 24 ~ 27 | 7 交付 | 全自动金丝雀流水线 | |
| 28 ~ 30 | 8 会扩 | Operator / CKS 模拟考 | **CKS 报名** |

按每天 1.5 ~ 2 小时、每周 5 ~ 6 天推进。可以慢，不要乱序——**每个阶段的验收没过，不进下一阶段**，这是 30 周能真正走完的唯一保证。

---

## 十六、参考资料（均已核验为当前状态，核验时间 2026-08-24）

### 官方一手资料

- [Kubernetes 官方文档](https://kubernetes.io/docs/home/)——本大纲的取材母本，Concepts 为主、Tasks 为辅
- [Kubernetes Releases](https://kubernetes.io/releases/)——版本与支持周期实查（v1.37 于 2026-08-26 发布前后留意）
- [v1.37 Sneak Peek 官方博客](https://kubernetes.io/blog/2026/07/31/kubernetes-v1-37-sneak-peek/)——下一版的 DRA/安全/网络方向
- [Gateway API 官网](https://gateway-api.sigs.k8s.io/)——Ingress 继任者的一手资料
- [CKA 官方考试页](https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/)（v1.35 环境、66% 及格）与 [CKS](https://training.linuxfoundation.org/certification/certified-kubernetes-security-specialist/)（需 CKA 有效）

### 衔接资料（本博客内）

- 前置：[Docker 学习总纲](/云原生/docker/docker-00-roadmap)——镜像/容器/网络是 K8s 的地基
- 旁支：[Linux 基础 6 篇](/Linux/basics/linux-01-nsenter-prerequisites)——nsenter/tcudpmp/netns 与阶段 2、6 互补
- 延伸：[Serverless 系列](/云原生/serverless/README.md)——K8s 之上的抽象层，毕业后的下一站

### 认证现状（2026-08-24）

- CKA：v1.35 环境、2 小时实操、66% 及格——阶段 6 后冲刺；
- CKS：v1.35 环境、需 CKA 在有效期内——阶段 8 后冲刺；
- KCNA/CKAD 为轻量旁支，主线知识域已覆盖，不必单独绕路。

---

## 结语：一条线，走到底

K8s 的知识网比 Docker 更密，但拆碎之后，它只是在重复同一件事：**声明期望，让控制器收敛**。Pod 是这样，Deployment 是这样，你将来写的 Operator 也是这样——阶段 8 你会亲手验证这个「万物皆调谐」的世界观。

30 周，从 `minikube start` 到自写 Operator。地图已画好，从阶段 0 的第一个实验开始。

> 本篇是路线图，不是教材——每一步的「怎么做到」与「为什么是这样」，在对应的 35 篇正文中展开。发现路线有问题，随时回来改地图。
