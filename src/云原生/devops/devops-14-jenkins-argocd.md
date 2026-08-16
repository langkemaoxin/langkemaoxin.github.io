---
title: Jenkins × Argo CD——端到端发布
sidebarGroup: DevOps / GitOps
shortTitle: 14 Jenkins × Argo CD
order: 14
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - Jenkins
  - Argo CD
description: Jenkins × Argo CD——Pipeline 推镜像并更新部署仓，避免 Jenkins 直连 kubectl 改生产
---

> **DevOps / GitOps · 第 14/15 篇**  
> 上一篇：[《GitHub Actions × Argo CD》](/云原生/devops/devops-13-github-actions-argocd)  
> 下一篇预告：[《多集群发布与回滚》](/云原生/devops/devops-15-multicluster-rollback)

---

## 开头：Jenkins 能不能继续 kubectl？

能，但不推荐作为本系列默认。Jenkins 长期挂着生产 kubeconfig，等于把「集群管理员」放在 CI 里。GitOps 下 Jenkins 的职责收敛为：

> 构建验证 → 推 Harbor → **提交部署仓** → 结束。

Argo CD 再同步。需要「一键同步」时，可用只授 `argocd` 权限的 Token 调 API——仍优于万能 kubeconfig。

> **待本机验证**

---

## 一、凭据清单

在 Jenkins Credentials 中准备：

| ID（示例） | 类型 | 用途 |
|------------|------|------|
| `harbor-cred` | Username/Password | docker login |
| `deploy-git-ssh` 或 `deploy-git-https` | SSH 私钥 / 用户名密码 | 推部署仓 |
| （可选）`argocd-token` | Secret text | 触发 sync |

应用仓仍用「Pipeline from SCM」。

---

## 二、Jenkinsfile 示例

```groovy
pipeline {
  agent any

  environment {
    HARBOR = 'harbor.example.com'
    IMAGE  = "${HARBOR}/demo/api"
    DEPLOY_URL = 'git@git.example.com:team/deploy-repo.git'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Test') {
      steps { sh 'echo test' }
    }

    stage('Build & Push') {
      steps {
        script {
          env.SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        }
        withCredentials([usernamePassword(
          credentialsId: 'harbor-cred',
          usernameVariable: 'U',
          passwordVariable: 'P'
        )]) {
          sh '''
            echo "$P" | docker login "$HARBOR" -u "$U" --password-stdin
            docker build -t "$IMAGE:sha-$SHORT" .
            docker push "$IMAGE:sha-$SHORT"
          '''
        }
      }
    }

    stage('Update deploy repo') {
      steps {
        dir('deploy') {
          git credentialsId: 'deploy-git-ssh', url: "${DEPLOY_URL}", branch: 'main'
          sh '''
            # 确保 Agent 有 yq
            yq -i ".image.tag = \\"sha-$SHORT\\"" charts/api/values.yaml
            git config user.email "jenkins@example.com"
            git config user.name "jenkins"
            git add charts/api/values.yaml
            git commit -m "deploy: api sha-$SHORT" || true
          '''
          sshagent(credentials: ['deploy-git-ssh']) {
            sh 'git push origin main'
          }
        }
      }
    }
  }
}
```

按你实际的 Git 插件/`checkout` 写法微调；HTTPS Token 时用对应绑定替换 `sshagent`。

---

## 三、可选：触发 Argo sync

若未开 automated：

```groovy
stage('Argo sync') {
  steps {
    withCredentials([string(credentialsId: 'argocd-token', variable: 'TOKEN')]) {
      sh '''
        argocd login argocd.example.com --grpc-web --auth-token "$TOKEN" --insecure
        argocd app sync demo-api
      '''
    }
  }
}
```

Agent 需安装与 server 匹配的 `argocd` CLI；Token 来自 Argo CD 账户或本地账号。

---

## 四、和旧「Jenkins 直接部署」笔记的对比

| 旧做法 | 本篇 |
|--------|------|
| Publish over SSH / kubectl | 改 Git |
| 参数化选 tag 后 Jenkins 部署 | 参数化构建仍可保留，但产物是「写哪次 tag 进部署仓」 |
| 密钥在 Jenkins 万能 | Harbor + 部署仓写权限拆分 |

---

## 小结

- 三条 CI（12–14）对 Argo 的交界面统一：**部署仓中的镜像引用**  
- Jenkins 仍适合重企业插件场景，但不要把生产集群密钥当默认  
- 下一篇：多集群注册与回滚，并说明为何文章里绝不能贴真实 kubeconfig  

相关：第 4 篇（Jenkins CI 骨架）、第 10 篇（Application）。
