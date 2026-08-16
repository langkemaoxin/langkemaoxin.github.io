---
title: Jenkins 流水线——从任务到 Pipeline as Code
sidebarGroup: DevOps / GitOps
shortTitle: 04 Jenkins 流水线
order: 4
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - Jenkins
  - CI
description: Jenkins 流水线——从任务到 Pipeline as Code，用 Declarative Pipeline 串起构建与推镜像
---

> **DevOps / GitOps · 第 4/15 篇**  
> 上一篇：[《CI 入门》](/云原生/devops/devops-03-ci-basics)  
> 下一篇预告：[《GitHub Actions 流水线》](/云原生/devops/devops-05-github-actions)

---

## 开头：点界面配一百个 Job，谁来版本化？

Jenkins 强在插件和「什么都能接」，弱在：Job 只活在 Jenkins 家里时，**流水线本身不可审、难迁移**。现代做法是 **Pipeline as Code**——仓库根目录放 `Jenkinsfile`，变更走 Git 评审。

本篇解决：如何用 Jenkins 落地第 3 篇的 CI 骨架（测 → 构建 → 推镜像）。与 Argo CD 的对接放到第 14 篇。

---

## 一、是什么

**Jenkins** 是基于 Java 的自动化服务器，通过 Agent（节点）执行构建。核心概念：

| 概念 | 含义 |
|------|------|
| Controller | 调度、存 Job 配置、提供 UI |
| Agent | 实际跑编译/Docker 的机器或容器 |
| Pipeline | 用 Groovy DSL 描述的流水线 |
| Credential | 密码、Token、kubeconfig 等托管项 |

两种常见 Pipeline 语法：**Declarative**（结构化、推荐入门）与 **Scripted**（更灵活）。下文用 Declarative。

---

## 二、为什么还用 Jenkins？

- 代码不在 GitHub/GitLab，或必须完全内网  
- 已有大量 Jenkins Shared Library / 插件资产  
- 需要精细的企业审批、多 Agent 标签调度  

若仓库已在 GitHub 且团队小，第 5 篇的 Actions 往往更轻。三条路径本系列都写，便于对照。

---

## 三、怎么做：最小可维护安装（Docker）

> **待本机验证**。镜像 tag 请到 [jenkins/jenkins](https://hub.docker.com/r/jenkins/jenkins) 查当前 LTS；示例用 `jenkins/jenkins:lts-jdk21`。

```bash
mkdir -p "$HOME/jenkins_home"
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v "$HOME/jenkins_home":/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts-jdk21
```

首次解锁：

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

建议安装插件（名称以插件中心为准）：**Git**、**Pipeline**、**Docker Pipeline**、**Credentials Binding**。若 Agent 与 Controller 分离，不要把 `docker.sock` 挂进 Controller，改为专用 Docker Agent。

挂载 `docker.sock` 等于把宿主机 Docker 权限给了 Jenkins，**仅限信任的实验环境**。

---

## 四、Declarative Pipeline 示例

仓库根目录 `Jenkinsfile`（示意：Go/通用 shell，可按语言改）：

```groovy
pipeline {
  agent any

  environment {
    REGISTRY = 'harbor.example.com'
    IMAGE    = "${REGISTRY}/demo/api"
    // 在 Jenkins 凭据里配置 harbor-cred（Username/Password）
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test') {
      steps {
        sh 'echo "run unit tests here"'
        // 例：sh 'go test ./..." 或 'mvn -B test'
      }
    }

    stage('Build image') {
      steps {
        script {
          def sha = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
          env.TAG = "sha-${sha}"
          sh "docker build -t ${IMAGE}:${TAG} ."
        }
      }
    }

    stage('Push image') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'harbor-cred',
          usernameVariable: 'USER',
          passwordVariable: 'PASS'
        )]) {
          sh '''
            echo "$PASS" | docker login "$REGISTRY" -u "$USER" --password-stdin
            docker push "$IMAGE:$TAG"
          '''
        }
      }
    }
  }
}
```

在 Jenkins 中建 **Pipeline** 类型任务，选择 **Pipeline script from SCM**，指向该仓库与分支。

### 参数化发版（持续交付常见）

需要「选 Git Tag 再构建」时，可装 **Git Parameter** 类插件，在 Pipeline 加 `parameters { ... }`，构建步骤 `checkout` 指定 tag。思想与旧课堂笔记一致：CI 跟主干，CD 跟发行标签——但在 GitOps 下，「选 tag」更常变成**更新部署仓中的镜像引用**，而不是 Jenkins 直接部署。

---

## 五、背景知识与注意点

1. **凭据**：Harbor、Git SSH、Sonar Token 一律进 Credentials，ID 写进 Jenkinsfile  
2. **Shared Library**：多项目重复逻辑抽到 `@Library('xxx')`  
3. **安全**：弃用在 Job 里明文密码；限制匿名可读；Controller 与 Agent 网络隔离  
4. **与第 6、7 篇**：`stage('Sonar')`、推 Harbor 的细节分别展开  

---

## 小结

- Jenkins 的现代用法是 **Jenkinsfile 进 Git**，不是只点 UI  
- 最小阶段：Checkout → Test → Build image → Push  
- 推完镜像后如何进集群：见第 14 篇（Jenkins × Argo CD）  

下一篇用 **GitHub Actions** 写同一骨架，对比「无需自建 Controller」时的体验。
