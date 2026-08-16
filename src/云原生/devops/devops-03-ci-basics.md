---
title: CI 入门：仓库、构建、制品怎么串
sidebarGroup: DevOps / GitOps
shortTitle: 03 CI 入门
order: 3
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - CI
  - CI/CD
description: CI 入门：仓库、构建、制品怎么串——三条流水线路径共用的心智模型
---

> **DevOps / GitOps · 第 3/15 篇**  
> 上一篇：[《GitOps》](/云原生/devops/devops-02-gitops)  
> 下一篇预告：[《Jenkins 流水线》](/云原生/devops/devops-04-jenkins-pipeline)

---

## 开头：换了三家 CI，为什么还是同一套逻辑？

Jenkins、GitHub Actions、GitLab CI 界面差很多，但健康团队的流水线几乎都在做同一件事：

> **代码变更进来 → 可重复地验证 → 产出可部署制品 →（可选）触发发布。**

本篇不绑具体产品，先把这条链的词汇与阶段对齐；后面 04–05、12–14 只是同一模型在不同引擎上的写法。

---

## 一、是什么：持续集成（CI）

**持续集成**指：开发者频繁把变更合入共享主干，每次合入（或每次 MR/PR）都触发自动化：**检出代码 → 构建 → 测试 →（常还有）扫描与打包**。

目标不是「有一个绿灯」，而是：

1. 冲突与破坏尽早暴露  
2. 构建步骤不依赖某台同事笔记本  
3. 下游拿到的是**同一套规则产出的制品**

---

## 二、为什么：没有 CI 时会发生什么？

- 「在我机器上能编过」——JDK、Node、依赖源不一致  
- 临上线才合并大分支——冲突爆炸、回归测不完  
- 制品来历不清——无法回答「这个镜像对应哪次 commit」  

CI 把「怎么编、怎么测」写成配置（Jenkinsfile / workflow YAML / `.gitlab-ci.yml`），让机器执行，人做评审与设计。

---

## 三、怎么做：一条最小 CI 的骨架

无论引擎，建议阶段拆开（失败尽早停）：

```text
checkout → lint / unit test → build → (quality gate) → package image → push registry
                                              ↑
                                         第 6 篇 Sonar
                                                              ↑
                                                         第 7 篇 Harbor
```

### 3.1 仓库侧约定

| 约定 | 建议 |
|------|------|
| 主干 | `main`（或 `master`，团队统一即可） |
| 合入方式 | MR/PR + 必需流水线通过 |
| 版本信息 | 用 git commit SHA 或 semver tag 标识制品 |
| 密钥 | 用 CI Variables / Secrets，不写进仓库 |

### 3.2 构建侧约定

- 固定工具链版本（容器内构建或 tool cache），避免「本机 Maven 3.6、CI 3.9」  
- 依赖缓存（Maven repo、npm cache）降低时长，但缓存失效策略要清晰  
- 产出**不可变**镜像 tag，例如：`registry.example.com/demo/api:sha-a1b2c3d`

### 3.3 制品侧约定

| 制品类型 | 例子 | 存放 |
|----------|------|------|
| 语言包 | jar、wheel | 制品库 / 对象存储 |
| 容器镜像 | OCI image | Harbor、GHCR、ACR… |
| 部署描述 | Helm chart、纯 YAML | **部署仓库**（GitOps） |

在 GitOps 模式下，CI 成功后通常还要：**更新部署仓库里的镜像引用**（commit 或发 PR），而不是直接 `kubectl apply`。细节见 12–14 篇。

---

## 四、三条路径怎么选？（预告）

| 引擎 | 适合 | 本系列篇目 |
|------|------|------------|
| **Jenkins** | 自建、插件生态、复杂企业流程 | 04、14 |
| **GitHub Actions** | 代码在 GitHub、与 PR 集成紧 | 05、13 |
| **GitLab CI** | GitLab 一体（仓 + CI + Runner） | 12（与 GitOps 主线结合） |

没有绝对赢家：看代码托管在哪、谁运维 Runner、合规是否要求完全私有化。

---

## 五、背景知识：CI 与 CD 的交界

```text
        CI 负责到这里 ────────────┐
checkout → test → image push → 更新 Git 中的期望状态
                                 │
                                 ▼
                          Argo CD Sync（CD / GitOps）
```

若流水线末尾仍直接改集群，那是 **Push 式 CD**；本系列主推 GitOps 时，请把「改集群」交给 Argo CD。

---

## 小结

- CI = 频繁合入 + 自动化验证 + 可追溯制品  
- 骨架：检出 → 测 → 构建 →（门禁）→ 推镜像 →（更新部署仓）  
- 换引擎不换模型；下篇用 Jenkins 把骨架写成可运行的 Pipeline  

> **实验说明**：本篇无集群依赖。从第 4 篇起的安装命令待你本机验证后再补真实输出。
