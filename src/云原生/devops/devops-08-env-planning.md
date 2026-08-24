---
title: GitOps 环境规划——角色、仓库与网络边界
sidebarGroup: DevOps / GitOps
shortTitle: 08 环境规划
order: 8
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - GitOps
description: GitOps 环境规划——角色、仓库与网络边界，避免把 K8s 安装教程再抄进 DevOps 专栏
---

> **DevOps / GitOps · 第 8/15 篇**  
> 上一篇：[《CI 对接 Harbor》](/云原生/devops/devops-07-harbor-ci)  
> 下一篇预告：[《Argo CD 部署》](/云原生/devops/devops-09-argocd-install)

---

## 开头：笔记里为什么先装三天系统？

旧版 GitOps 笔记从改 IP、关 SELinux、装内核一路写到 Harbor、K8s、Argo CD，单篇过万字，读的人容易迷失：**到底哪一步是 GitOps 必需的？**

本篇只做**规划**：谁负责什么、仓库怎么拆、网络怎么通。具体安装：

- K8s → 本站 Kubernetes / 平台专栏  
- Harbor → [Docker · Harbor](/云原生/docker/docker-12-harbor)  
- Argo CD → 第 9 篇  
- GitLab / Runner → 第 12 篇相关小节  

---

## 一、是什么：最小角色集

逻辑角色（可合并到更少物理机）：

| 角色 | 职责 | 说明 |
|------|------|------|
| 代码托管 + CI | GitLab/GitHub + Runner/Actions | 出镜像、改部署仓 |
| 镜像仓库 | Harbor / GHCR | 存 OCI 制品 |
| Kubernetes | 跑业务 + 通常跑 Argo CD | 真相落地处 |
| 开发者工作站 | IDE、kubectl 只读/调试 | 不直连改生产 |

示意（与旧笔记拓扑同构，IP 请换成你的）：

```text
[Dev laptop] ──git──► [GitLab / GitHub]
                          │ CI build
                          ▼
                      [Harbor]
                          ▲ pull
[Argo CD on K8s] ──watch Git deploy repo──► sync workloads
```

---

## 二、为什么要拆「应用仓」和「部署仓」

| 拆开 | 合仓 |
|------|------|
| 权限分离：业务开发 vs 变更生产清单 | 简单，但易误推生产清单 |
| CI 只对应用仓有写镜像/发 MR 权限 | 配置与代码生命周期耦合 |
| 部署仓可按环境分目录/分支 | 分支策略更绕 |

推荐入门：

```text
app-repo/          # Dockerfile、源码、单元测、.gitlab-ci.yml / workflows
deploy-repo/       # overlays/dev、overlays/prod 或 charts/
```

---

## 三、怎么做：规划检查清单

在动手装 Argo CD 前，勾一下：

1. **集群**：已有可用 K8s，`kubectl get nodes` Ready  
2. **入口**：实验可用 `kubectl port-forward`；长期用 Ingress / LB（MetalLB 等）  
3. **仓库可达**：Argo CD Pod 能否访问 Git（HTTPS/SSH、内网 DNS）  
4. **镜像可达**：节点能否 pull Harbor（证书问题最常见）  
5. **身份**：准备好 Git 只读凭证（Argo）与 CI 写部署仓凭证（机器人）  

### 网络边界建议

- CI Runner 与 Harbor：二层或安全组放行 443/80  
- Argo CD 出站访问 Git；入站仅管理面（UI/API）对运维网段开放  
- 生产集群 API 不对全体开发者开放；开发用只读或独立开发集群  

---

## 四、背景知识：和「课堂六台机」的关系

旧笔记主机表示例：

| 功能 | 软件 |
|------|------|
| 开发机 | Go / IDE |
| GitLab | CE + Runner |
| Harbor | docker-compose |
| K8s master/worker | kubeadm 等 + Argo CD |

学习阶段可**合并**：单节点 K3s + 外置 GitHub + GHCR，也能走通 GitOps。规划的价值是知道合并了什么、牺牲了什么（高可用、权限隔离）。

---

## 小结

- GitOps 环境 = 代码托管/CI + 镜像仓 + K8s(+Argo) + 清晰仓库边界  
- 安装细节外置到对应专栏，本系列聚焦「串起来」  
- 下一篇按官方清单安装 **Argo CD v3.5.x**  

> 作者侧暂无实验集群：第 9 篇起命令以官方文档为准，标「待本机验证」。
