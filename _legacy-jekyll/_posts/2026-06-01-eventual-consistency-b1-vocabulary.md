---
layout:     post
title:      "用 B1 英语读 ACM 论文：最终一致性（Eventual Consistency）生词精讲"
subtitle:   "从一篇分布式系统经典文章出发，整理 60+ 高频词，附中文释义与记忆提示"
date:       2026-06-01
author:     "Hux"
header-img: "img/post-bg-2015.jpg"
catalog: true
tags:
    - English
    - B1
    - Vocabulary
    - Distributed Systems
---

> 原文：Peter Bailis & Ali Ghods, *Eventual Consistency Today: Limitations, Extensions, and Beyond*, Communications of the ACM, May 2013. DOI: [10.1145/2447976.2447992](https://doi.org/10.1145/2447976.2447992)  
> 学习目标：在 **B1** 词汇量基础上，先背生词再读原文，不要求一次读懂全部证明。

---

## 一、这篇文章在讲什么？

2000 年，Eric Brewer 提出 **CAP 定理**：分布式系统在网络分区时，很难同时保证 **一致性（consistency）** 和 **可用性（availability）**。

很多互联网服务因此采用 **eventual consistency（最终一致性）**——允许短时间内数据不一致，但相信系统最终会“收敛”到相同状态。

作者的问题很直白：**保证这么弱，为什么还能做出可用产品？** 文章从三个方向回答：

1. “最终”到底有多快？（可测量、可预测）
2. 程序员如何在弱保证下写代码？（补偿、CALM、CRDT）
3. 能否比“最终一致”更强，又保留其好处？

---

## 二、核心概念词（建议先背这 20 个）

| 英文 | 中文 | 记忆提示 |
|------|------|----------|
| **eventual consistency** | 最终一致性 | 停止更新后，各副本最终会一致 |
| **distributed** | 分布式的 | 数据/服务在多台机器上 |
| **consistency** | 一致性 | 各处读到的数据是否“对得上” |
| **availability** | 可用性 | 出故障时能否继续响应 |
| **partition** | 分区 / 网络割裂 | 部分节点之间无法通信 |
| **replica** | 副本 | 同一份数据的复制件 |
| **replication** | 复制 | 把数据同步到多个节点 |
| **guarantee** | 保证 | 系统承诺的行为（本文常说很“弱”） |
| **converge** | 收敛 | 各副本最终变成相同状态 |
| **inconsistent** | 不一致的 | 不同节点或不同时间读到不同数据 |
| **update** | 更新 | 对数据的写入或修改 |
| **latency** | 延迟 | 请求多久才有响应 |
| **infrastructure** | 基础设施 | 底层存储、网络等 |
| **architect** | 架构师 | 设计系统的人 |
| **deploy** | 部署 | 把系统跑在生产环境 |
| **database** | 数据库 | 存储与查询数据的系统 |
| **theorem** | 定理 | CAP **theorem** |
| **tolerance** | 容忍度 | partition **tolerance** |
| **trade-off** | 权衡 | 一致性 vs 可用性 vs 延迟 |
| **propagate** | 传播 | 把更新扩散到其他节点 |

---

## 三、通用学术词汇（B1 以上，文中高频）

| 英文 | 词性 | 中文 | 例句语境 |
|------|------|------|----------|
| **postulate** | v. | 提出（理论） | Brewer *postulated* the CAP theorem |
| **conjecture** | n. | 猜想 | Brewer's *conjecture* |
| **prescient** | adj. | 有先见之明的 | proved *prescient* |
| **coherent** | adj. | 连贯的、一致的 | *coherent* single-system operation |
| **arbitrary** | adj. | 任意的 | return *arbitrary* values |
| **apparent** | adj. | 表面的 | *apparent* lack of guarantees |
| **pragmatic** | adj. | 务实的 | a *pragmatic* introduction |
| **preliminary** | adj. | 初步的 | *preliminary* answers |
| **quantify** | v. | 量化 | *quantify* system behavior |
| **advocate** | v. | 提倡 | architects *advocate* eventual consistency |
| **practitioner** | n. | 从业者 | for *practitioners* in the wild |
| **takeaway** | n. | 要点 | immediately applicable *takeaways* |
| **notable** | adj. | 值得注意的 | *notable* developments |
| **strengthen** | v. | 加强 | *strengthen* weak models |
| **violation** | n. | 违反 | safety *violations* |
| **compensation** | n. | 补偿 | external *compensation* |
| **speculation** | n. | 推测式做法 | programming is similar to *speculation* |
| **retroactively** | adv. | 事后地 | restore guarantees *retroactively* |
| **tangible** | adj. | 实实在在的 | *tangible* monetary consequences |
| **anecdotal** | adj. | 轶事式的 | *anecdotal* evidence |
| **forgo** | v. | 放弃 | *forgo* compensation |
| **onerous** | adj. | 繁重的 | more *onerous* than strong consistency |
| **immutable** | adj. | 不可变的 | *immutable* historical data |
| **retract** | v. | 撤回（已承认的事实） | do not *retract* emitted facts |
| **deviate** | v. | 偏离 | *deviate* from linearizability |
| **probabilistic** | adj. | 概率的 | *probabilistically* bounded staleness |
| **staleness** | n. | 陈旧度 | bounded *staleness* |
| **configuration** | n. | 配置 | system *configuration* |
| **workload** | n. | 工作负载 | under a given *workload* |
| **measurement** | n. | 测量 | runtime *measurement* |
| **prediction** | n. | 预测 | consistency *prediction* |
| **asynchronous** | adj. | 异步的 | *asynchronous* anti-entropy |
| **deterministic** | adj. | 确定性的 | *deterministically* choose a winner |
| **durability** | n. | 持久性 | put data *durability* at risk |
| **safety** | n. | 安全性（形式化） | “nothing bad happens” |
| **liveness** | n. | 活性 | “something good eventually happens” |

---

## 四、计算机专业术语（认识即可，配合原文阅读）

| 英文 | 中文 | 一句话 |
|------|------|--------|
| **CAP (theorem)** | CAP 定理 | 一致性、可用性、分区容忍不可兼得 |
| **linearizability** | 线性一致性 | 很强的“像单机一样”的一致性 |
| **SSI (single-system image)** | 单机映像 | 用起来像只有一台机器 |
| **anti-entropy** | 反熵 | 副本之间交换信息、趋向一致 |
| **NoSQL** | 非关系型数据库 | 如 Cassandra |
| **ACID** | 原子性、一致性、隔离性、持久性 | 传统数据库事务 |
| **causality** | 因果性 | 比最终一致更强的一类保证 |
| **CRDT** | 可交换复制数据类型 | 设计上避免很多不一致 |
| **CALM theorem** | CALM 定理 | 说明哪些程序在最终一致下仍“安全” |
| **PBS** | 概率有界陈旧度 | 预测“多久后读到最新值” |
| **key-value store** | 键值存储 | 简单的数据库模型 |
| **fault tolerance** | 容错 | 部分机器坏了仍可用 |
| **coordination** | 协调 | 节点为一致而协作 |
| **anomaly** | 异常 | 不一致导致的奇怪现象 |
| **idempotence** | 幂等性 | 同一操作多次，结果相同 |
| **commutative** | 可交换的 | 操作顺序不影响结果 |
| **monotonic** | 单调的 | 只增不减、不“收回”已承认的事实 |
| **Monte Carlo simulation** | 蒙特卡洛模拟 | 用随机抽样估计一致性表现 |

---

## 五、三个值得收藏的英文句子（精读用）

1. **Eventual consistency provides few guarantees.**  
   最终一致性提供的保证很少。

2. **At no given time can the user rule out the possibility of inconsistent behavior.**  
   在任意时刻，用户都无法排除读到不一致数据的可能。

3. **The only guarantee is that, at some point in the future, something good will happen.**  
   唯一的保证是：将来某个时刻，“好事”会发生（副本会收敛）。

---

## 六、B1 学习建议（三步走）

1. **第 1 天**：背完第二节 20 个核心词，浏览论文摘要（Abstract 附近的首段）。  
2. **第 2–3 天**：每天 15 个第三节学术词，对照表中“例句语境”在 PDF 里搜原词。  
3. **第 4 天起**：只查第四节术语表，按章节读 *How eventual is eventual consistency?* 和 *Programming eventual consistency*。

全文难度大约 **B2–C1 + 专业英语**；用本表不是为了一次读懂，而是**降低查词成本**，把精力放在思路上。

---

## 七、相关 Skill

本次整理流程已固化为 Skill：**`english-paper-b1-blog`**

- Cursor：`C:\Users\CGY\.cursor\skills\english-paper-b1-blog\SKILL.md`  
- OpenCode：`C:\Users\CGY\.config\opencode\skill\english-paper-b1-blog\SKILL.md`  

需要 **提交并推送到 GitHub Pages** 时，可说「用 blog-repo-publish 推送」，或指定 commit。

---

*本地 PDF 工作区：`D:\论文\2447976.2447992.pdf`*
