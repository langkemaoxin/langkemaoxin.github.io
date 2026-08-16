---
title: Argo CD 部署——清单安装、访问与初检
sidebarGroup: DevOps / GitOps
shortTitle: 09 Argo CD 部署
order: 9
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - Argo CD
description: Argo CD 部署——按官方清单安装 v3.5.x，获取初始密码并完成本地访问初检
---

> **DevOps / GitOps · 第 9/15 篇**  
> 上一篇：[《环境规划》](/云原生/devops/devops-08-env-planning)  
> 下一篇预告：[《Argo CD 日常管理》](/云原生/devops/devops-10-argocd-ops)

---

## 开头：集群有了，谁来持续对齐 Git？

第 2 篇说清了 GitOps 原则：需要一个控制器盯着 Git 与集群。**Argo CD** 就是 Kubernetes 上最常见的选择之一。本篇按官方清单完成安装与第一次登录。

> **版本**：写作时稳定发布为 **[v3.5.1](https://github.com/argoproj/argo-cd/releases/tag/v3.5.1)**（2026-08-12）。生产请钉版本，不要长期追无标签的 `stable` 而不记录。  
> **文档**：[Installation](https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/)、[Getting Started](https://argo-cd.readthedocs.io/en/stable/getting_started/)。  
> **待本机验证**：以下命令需在你的集群执行后，把真实输出贴回文章。

旧笔记里的 MetalLB + Ingress 长流程：实验阶段可用 **port-forward**；要域名与证书时再上 Ingress（文末可选）。

---

## 一、是什么：装进去有哪些组件

典型 Pod（非 HA）：

| 组件 | 作用 |
|------|------|
| argocd-server | API / UI / CLI 入口 |
| application-controller | 对比 Desired vs Live、执行同步 |
| repo-server | 拉 Git、渲染 Helm/Kustomize 等 |
| redis | 缓存 |
| applicationset-controller | ApplicationSet（多应用生成） |
| dex / notifications | SSO 与通知（可按需） |

HA 清单会复制 server/repo，并使用 redis-ha 等，资源需求更高。

---

## 二、怎么做：非 HA 安装（推荐先跑通）

```bash
kubectl create namespace argocd

kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/v3.5.1/manifests/install.yaml
```

等待就绪：

```bash
kubectl get pods -n argocd -w
# 期望各组件 Ready
```

### HA（可选）

```bash
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/v3.5.1/manifests/ha/install.yaml
```

节点数与资源不足时 HA 会 Pending，学习环境优先非 HA。

---

## 三、访问 UI：port-forward（实验默认）

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d; echo

kubectl port-forward svc/argocd-server -n argocd 8080:443
```

浏览器打开 `https://localhost:8080`（自签证书可先忽略警告）。用户名 **`admin`**，密码为上一命令输出。登录后立刻改密（CLI 见第 10 篇）。

---

## 四、可选：LoadBalancer / Ingress

### 4.1 改 Service 类型

```bash
kubectl patch svc argocd-server -n argocd -p \
  '{"spec":{"type":"LoadBalancer"}}'
```

裸金属需 MetalLB 等提供 EXTERNAL-IP（旧笔记有完整步骤；按你的网络方案配置 IP 池即可）。

### 4.2 Ingress

需 Ingress Controller，并为 UI（HTTPS）与 gRPC（CLI）分别处理——官方有 [Ingress 文档](https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/)。初学可跳过，避免卡在证书与后端协议。

---

## 五、背景知识：和旧笔记版本差异

| 项目 | 旧笔记 | 本篇 |
|------|--------|------|
| 版本 | v2.9.1 | **v3.5.1** |
| apply | 普通 `kubectl apply` | 官方推荐 **server-side apply** |
| 入口 | 先 MetalLB/Ingress | 先 **port-forward** 跑通 |

K8s 版本需落在 Argo CD 支持矩阵内（3.5 测试了较新的 1.33–1.36 等，以官网表为准）。

---

## 小结

- 一键清单进 `argocd` 命名空间，钉死版本号  
- 实验用 port-forward + initial admin secret  
- 下一篇：CLI 登录、改密、Project，以及创建第一个 Application  

官方示例应用仓库：`https://github.com/argoproj/argocd-example-apps.git`（第 10、15 篇会用到）。
