---
title: Argo CD 日常管理——CLI、Project 与第一个 Application
sidebarGroup: DevOps / GitOps
shortTitle: 10 Argo CD 日常管理
order: 10
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - Argo CD
description: Argo CD 日常管理——CLI 登录改密、Project 边界，以及用官方 guestbook 创建第一个 Application
---

> **DevOps / GitOps · 第 10/15 篇**  
> 上一篇：[《Argo CD 部署》](/云原生/devops/devops-09-argocd-install)  
> 下一篇预告：[《应用仓库与 Helm 清单》](/云原生/devops/devops-11-app-manifests)

---

## 开头：UI 能点，为什么还要 CLI 与 Project？

UI 适合演示；日常与 GitOps 声明更依赖：

- **CLI**：脚本化登录、同步、差量  
- **Project**：限制「哪些 Git、哪些集群/命名空间可被部署」——多团队时的安全边界  
- **Application CR**：期望状态本身也可进 Git（App of Apps）

本篇把第 9 篇装好的实例用起来。

> **待本机验证**

---

## 一、安装 CLI 并登录

从 [Releases](https://github.com/argoproj/argo-cd/releases/tag/v3.5.1) 下载与 server 匹配的 CLI，或：

```bash
# 示例：Linux amd64，版本号与集群保持一致
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/download/v3.5.1/argocd-linux-amd64
chmod +x argocd && sudo mv argocd /usr/local/bin/
```

port-forward 保持开启时：

```bash
argocd login localhost:8080 --username admin --password '<初始密码>' --insecure
argocd account update-password
argocd version
```

---

## 二、Project：先定边界再放应用

`default` Project 很宽。建议学习时也建一个收紧的 Project：

```bash
argocd proj create demo \
  -d https://kubernetes.default.svc,demo \
  -s https://github.com/argoproj/argocd-example-apps.git
```

含义示意：目的地仅本集群 `demo` 命名空间；源仓库仅 example-apps。生产按团队继续收紧。

也可用 YAML（可提交到 Git）：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: demo
  namespace: argocd
spec:
  description: learning project
  sourceRepos:
    - 'https://github.com/argoproj/argocd-example-apps.git'
  destinations:
    - namespace: demo
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
```

---

## 三、创建第一个 Application（guestbook）

```bash
kubectl create namespace demo

argocd app create guestbook \
  --project demo \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace demo
```

同步并看状态：

```bash
argocd app sync guestbook
argocd app get guestbook
```

UI 中应看到资源树与 Healthy/Synced。

### 等价：Application 清单

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: demo
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

`automated.selfHeal`：有人在集群手改资源时，Argo 会拉回 Git 状态——这正是 GitOps 的「防漂移」。

---

## 四、背景知识：Synced / OutOfSync / Healthy

| 状态 | 含义 |
|------|------|
| Synced | Live 与 Desired 清单一致 |
| OutOfSync | 有差异，需 sync 或查手改/渲染差异 |
| Healthy / Degraded | 工作负载健康度（与 Synced 正交） |

常见坑：Helm values 没进 Git、忽略了 `IgnoreDifferences`、CRD 未装全。

---

## 小结

- CLI 与 server 版本对齐；登录后改掉初始密码  
- Project 限制源与目的地，再创建 Application  
- 官方 guestbook 是最小验证；下一篇换成**自有应用 + Helm** 结构  

自动同步适合学习与只读环境；生产是否开 `automated` 按变更评审制度决定。
