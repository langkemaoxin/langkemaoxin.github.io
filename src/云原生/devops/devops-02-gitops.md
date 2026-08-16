---
title: GitOps：用 Git 当交付真相源
sidebarGroup: DevOps / GitOps
shortTitle: 02 GitOps
order: 2
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - GitOps
  - Argo CD
description: GitOps：用 Git 当交付真相源——和传统 CI 推集群有何不同，Pull 模型如何工作
---

> **DevOps / GitOps · 第 2/15 篇**  
> 上一篇：[《DevOps 是什么？》](/云原生/devops/devops-01-what-is-devops)  
> 下一篇预告：[《CI 入门：仓库、构建、制品怎么串》](/云原生/devops/devops-03-ci-basics)

---

## 开头：谁才是「线上该长什么样」的权威？

CI 流水线跑完，最后一步往往是 `kubectl apply` 或 `helm upgrade`。能用，但时间一长会出现：

- 有人 SSH 进集群「临时改一下」；  
- 某次发布只改了测试环境的 YAML，生产还是旧的；  
- 出事时问「现在线上到底是哪一版配置？」——答案散落在聊天记录和本机目录里。

**GitOps** 把回答钉死在一处：**Git 仓库里的声明式描述，才是期望状态的真相源（Source of Truth）**。集群里跑着的东西，应当被持续拉齐到这份描述。

---

## 一、是什么：GitOps 与 DevOps 的关系

| | DevOps | GitOps |
|--|--------|--------|
| 层级 | 文化 + 工程实践（整条交付环） | 一种**持续交付**实现方式，尤其适合 Kubernetes |
| 核心 | 协作、自动化、反馈 | Git 存期望状态 + 自动化代理同步到集群 |
| 工具 | 多种多样 | 常见：Argo CD、Flux |

可以记：

> DevOps 说「我们要更快更稳地交付」；GitOps 说「交付到 K8s 时，以 Git 为准、用控制器去对齐」。

GitOps 继承 DevOps「能自动化就自动化」的理念，但把 **CD 的权威**从「流水线最后一步推上去」改成「仓库声明 + 集群内/旁路控制器拉取同步」。

---

## 二、为什么：Push CD 的痛点

传统「流水线推集群」（Push）：

```text
开发 push 代码 → CI 构建镜像 → CI 拿 kubeconfig → kubectl/helm 改集群
```

问题包括：

1. **权限外泄**：CI 往往握有生产集群凭证，流水线被攻破面更大  
2. **漂移难发现**：人手改了集群，Git 不知情，下次发布可能被覆盖或行为诡异  
3. **审计弱**：谁在何时把集群改成什么样，不如 Git commit / PR 清晰  
4. **多环境复制难**：测试/预发/生产各一套脚本，容易分叉  

GitOps（常见 **Pull** 模型）：

```text
开发 push 应用代码 → CI 只负责测与推镜像
开发/流水线更新「部署仓库」里的镜像 tag / Helm values
Argo CD（等）在集群侧侦测 Git 变化 → 同步到集群
```

CI **不必**长期持有生产 `kubectl` 权限；它最多有权改 Git（或发 PR）。集群同步由 Argo CD 的 ServiceAccount 在可控范围内完成。

---

## 三、怎么做：两条仓库、一个控制器

实践中常见拆法（本系列后续实操按此组织）：

| 仓库 | 内容 | 谁写 |
|------|------|------|
| **应用仓库** | 业务代码、Dockerfile、单元测试 | 开发 |
| **部署仓库（manifests）** | Deployment/Helm/Kustomize、镜像 tag、环境差异 | 开发或 CI 机器人 |

控制器（本系列用 **Argo CD**）持续对比：

- **Desired**：Git 某 revision 渲染出的清单  
- **Live**：集群当前对象  

不一致则标记 **OutOfSync**，可自动或手动 **Sync**；也可按 commit / tag **回滚**到历史期望状态。

支持的清单形式包括：纯 YAML 目录、Kustomize、Helm、Jsonnet，以及 Config Management Plugin。

---

## 四、背景知识：你需要先会什么？

1. **Git 分支与 PR**：部署变更最好走评审，而不是直推 `main`  
2. **声明式 K8s**：Deployment / Service 等「描述期望」而非「一步步命令」  
3. **镜像不可变**：用 digest 或不可变 tag（如 git sha），避免 `latest` 漂  
4. **密钥不进明文 Git**：Sealed Secrets、External Secrets、云厂商 Secret Store（进阶，系列末可扩展）

Harbor、Docker 镜像推送见 Docker 专栏；本篇只定原则。

---

## 五、本系列选用的参考链路

课堂笔记时代常见组合，今天仍然成立，版本需钉死：

```text
GitLab / GitHub（代码 + CI）
    → 构建镜像 → Harbor（或 GHCR 等）
    → 更新部署仓库中的 tag
Argo CD 监视部署仓库 → 同步到 Kubernetes
```

官方安装示例（写作时稳定版）：**Argo CD [v3.5.1](https://github.com/argoproj/argo-cd/releases/tag/v3.5.1)**（2026-08）。详见第 9 篇。

---

## 小结

- GitOps = **Git 为真相源** + **自动化代理对齐集群**  
- 相对 Push CD：更易审计、减 CI 持有生产凭证、便于发现漂移  
- 落地时拆开「应用仓」与「部署仓」，用 Argo CD 做同步与回滚  

下一篇先把 **CI 入门**讲清：不管你用哪家流水线，仓库、构建、制品这三件事怎么串。
