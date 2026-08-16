---
title: 多集群发布与回滚——注册集群、历史与安全红线
sidebarGroup: DevOps / GitOps
shortTitle: 15 多集群与回滚
order: 15
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - Argo CD
  - 多集群
description: 多集群发布与回滚——向 Argo CD 注册外部集群、按 Git 历史回滚，并守住 kubeconfig 安全红线
---

> **DevOps / GitOps · 第 15/15 篇**  
> 上一篇：[《Jenkins × Argo CD》](/云原生/devops/devops-14-jenkins-argocd)  
> 系列首页：[DevOps / GitOps](/云原生/devops/)

---

## 开头：一套 Argo，能否管测试集群和生产集群？

可以。Argo CD 默认管理**所在集群**（`https://kubernetes.default.svc`）。外部集群需注册凭证；之后不同 Application（或同一 App 的不同 dest）指向不同 `server`。

回滚则回到 GitOps 本义：**期望状态的历史在 Git（以及 Argo 记录的 sync 历史）里**，而不是 SSH 上去手改。

> **待本机验证**  
> **安全红线**：下文只用占位符。旧笔记曾把完整 kubeconfig（含 client-key）贴进博客——**已删除，切勿再发布真实证书与私钥**。

---

## 一、注册外部集群

在能同时访问「管理集群」与「目标集群」的机器上准备 kubeconfig（本地文件，勿提交 Git）：

```bash
# 列出上下文（文件路径自定）
kubectl config --kubeconfig=/path/to/merged-kubeconfig get-contexts

# 登录 Argo（port-forward 或 Ingress 地址）
argocd login <argocd-host> --username admin --password '***' --insecure

# 将目标上下文注册进 Argo CD
# 会在目标集群创建 argocd-manager ServiceAccount（需确认安全策略）
argocd cluster add <context-name> --kubeconfig=/path/to/merged-kubeconfig
argocd cluster list
```

成功后 `cluster list` 会出现外部 API Server 地址。Application 的 `destination.server` 填该地址，或用集群名（视 CLI/UI 选项）。

### Application 指向外部集群（示意）

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook-prod
  namespace: argocd
spec:
  project: demo
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    path: guestbook
    targetRevision: HEAD
  destination:
    # 替换为 cluster list 中的 SERVER，切勿把真实地址与凭证写进公开文章
    server: https://<prod-api-server>:6443
    namespace: demo
```

也可用 UI「New App」选择 Destination Cluster。

---

## 二、多环境推荐结构

| 做法 | 说明 |
|------|------|
| 每环境一个 Application | `api-dev` / `api-prod`，路径或 values 不同 |
| ApplicationSet | 用生成器批量生成 App（集群列表、Git 目录） |
| 分 Project | 生产 Project 仅允许生产集群与受控仓库 |

部署仓可用：

```text
charts/api/
  values.yaml          # 公共
  values-dev.yaml
  values-prod.yaml
```

Application 里 `helm.valueFiles` 指向对应文件；或用 Kustomize overlay。

---

## 三、回滚怎么做

### 3.1 首选：Revert 部署仓

```bash
cd deploy-repo
git revert <bad-commit>   # 或 checkout 旧 tag 再提交
git push
```

Argo 自动/手动 sync 后，集群回到上一期望状态。审计链完整。

### 3.2 Argo 历史

```bash
argocd app history demo-api
argocd app rollback demo-api <history-id>
```

适合紧急场景；仍建议事后把 Git 也对齐，避免下次 sync 又抬回去。

### 3.3 不要做的事

- 只改集群不改 Git（下一轮 selfHeal 或 sync 会覆盖）  
- 在公开文档粘贴 **certificate-authority-data / client-key-data**  
- 用个人 admin kubeconfig 长期挂在 CI  

合并多集群 kubeconfig 时，在**本机加密盘**操作，用完可删除临时文件。

---

## 四、系列收束

你已走完：

1. DevOps / GitOps 概念  
2. CI 三引擎 + Sonar + Harbor  
3. Argo 安装与清单结构  
4. 三引擎 × Argo 端到端  
5. 多集群与回滚  

有实验集群后，建议按顺序实跑并回填命令输出：第 9 篇安装 → 第 10 篇 guestbook → 第 11–12 篇自有应用一条链。

延伸（未单开篇，可后续加餐）：ApplicationSet、App of Apps、Sealed Secrets / External Secrets、与 Tekton 流水线对比（见 Serverless 专栏）。

---

## 小结

- 外部集群用 `argocd cluster add`，Application 改 `destination.server`  
- 回滚以 **Git revert** 为主，`argocd app rollback` 为辅  
- **真实 kubeconfig 永不入库、永不进博客**  

感谢读完 15 篇。返回 [DevOps / GitOps 目录](/云原生/devops/)。
