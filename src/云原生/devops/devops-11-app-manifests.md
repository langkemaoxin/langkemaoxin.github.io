---
title: 应用仓库与 Helm 清单——给 Argo CD 可同步的期望状态
sidebarGroup: DevOps / GitOps
shortTitle: 11 应用与 Helm 清单
order: 11
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - Helm
  - Argo CD
description: 应用仓库与 Helm 清单——拆应用仓与部署仓，让 Argo CD 能稳定渲染并同步
---

> **DevOps / GitOps · 第 11/15 篇**  
> 上一篇：[《Argo CD 日常管理》](/云原生/devops/devops-10-argocd-ops)  
> 下一篇预告：[《GitLab CI × Argo CD》](/云原生/devops/devops-12-gitlab-ci-argocd)

---

## 开头：guestbook 会了，自己的服务怎么放进 Git？

第 10 篇同步的是官方示例。真实项目通常要：

1. **应用仓**：源码 + Dockerfile + CI  
2. **部署仓**：Helm Chart 或 Kustomize，镜像 tag 由 CI 改写  

本篇给出一套最小结构，供 12–14 篇流水线改 tag。

---

## 一、应用仓最小集

```text
app-repo/
  Dockerfile
  src/ ...
  .gitlab-ci.yml          # 或 .github/workflows、Jenkinsfile
  README.md
```

Dockerfile 示意（语言可换）：

```dockerfile
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app ./cmd/app

FROM gcr.io/distroless/static:nonroot
COPY --from=build /out/app /app
USER nonroot:nonroot
ENTRYPOINT ["/app"]
```

CI 产出：`harbor.example.com/demo/api:sha-<commit>`。

---

## 二、部署仓：Helm Chart 最小集

```text
deploy-repo/
  charts/api/
    Chart.yaml
    values.yaml
    templates/
      deployment.yaml
      service.yaml
```

`Chart.yaml`：

```yaml
apiVersion: v2
name: api
type: application
version: 0.1.0
appVersion: "0.1.0"
```

`values.yaml`（**镜像由 CI 更新**）：

```yaml
image:
  repository: harbor.example.com/demo/api
  tag: "sha-replace-me"
  pullPolicy: IfNotPresent
replicaCount: 1
service:
  port: 8080
```

`templates/deployment.yaml` 片段：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
```

若私有 Harbor，还需 `imagePullSecrets`（Secret 不进明文 Git，用 External Secrets 等——进阶）。

---

## 三、Argo CD 指向 Helm 路径

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-api
  namespace: argocd
spec:
  project: demo
  source:
    repoURL: https://git.example.com/team/deploy-repo.git
    targetRevision: main
    path: charts/api
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
```

也可用 `argocd app create ... --helm-set image.tag=sha-xxx` 做一次性实验，但**长期仍以 Git 中的 values 为准**。

---

## 四、CI 如何改 tag（约定）

流水线在推镜像成功后：

```bash
# 伪代码：克隆部署仓，改 values，提交
git clone "$DEPLOY_REPO"
cd deploy-repo
sed -i "s/tag: \".*\"/tag: \"sha-${CI_COMMIT_SHORT_SHA}\"/" charts/api/values.yaml
git commit -am "deploy: api sha-${CI_COMMIT_SHORT_SHA}"
git push
```

更稳妥：用 `yq` 改 YAML，或发 MR 等人审再合。SSH Deploy Key / Project Access Token 只授部署仓写权限。

---

## 五、背景知识：Helm vs 纯 YAML vs Kustomize

| 方式 | 适合 |
|------|------|
| 纯 YAML | 最少概念，环境差异靠目录复制 |
| Kustomize | overlay 清晰，Argo 原生支持 |
| Helm | 配置项多、要打包复用 |

旧笔记同时有「裸 YAML demo」和「Helm demo」——本系列默认 Helm，便于 `image.tag` 单点修改。

---

## 小结

- 应用仓出镜像；部署仓存期望状态  
- values 里的 tag 是 CI 与 Argo 的交接面  
- 下一篇起：三条 CI 分别把「推镜像 + 改部署仓」跑通  

> 勿把集群证书、Harbor 密码写进部署仓；公开文档中粘贴完整 kubeconfig（含 client-key）的做法已废弃。
