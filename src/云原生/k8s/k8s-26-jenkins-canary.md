---
title: Jenkins + Ingress 自动化灰度发布流水线
sidebarGroup: Kubernetes
shortTitle: 26 Jenkins 灰度
order: 26
date: 2026-09-01T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - Jenkins
  - Ingress
  - 云原生
  - Kubernetes系列
description: Jenkins Pipeline 驱动 Ingress 灰度：按 Header/权重的自动化发布流水线。
---

> **Kubernetes 系列 · 第 26/35 篇**  
> 上一篇：[《Harbor + K8s 手动部署 SpringCloud——镜像构建与推送》](/云原生/k8s/k8s-25-harbor-springcloud) · 下一篇：[《发布进阶——Argo Rollouts 金丝雀与 OpenKruise 原地升级》](/云原生/k8s/k8s-27-advanced-rollout)

---

## 开头：灰度靠改 YAML 权重，凌晨两点还在 kubectl apply

生产环境做 SpringCloud + Jenkins + K8s Ingress 灰度发布，常见做法是部署两套 Deployment 和 Service（stable / canary），通过 Ingress 注解把流量按比例或按 Header 切到新版本。

手工流程通常是：改镜像 tag → `kubectl apply` → 调 `canary-weight` → 观察监控 → 再调权重或回滚。步骤一多，就容易在凌晨发版时出错。

本文从 Nginx Ingress 金丝雀原理出发，讲清 **基于 Header（用户）** 与 **基于权重** 两种灰度方式，再搭建 Jenkins Pipeline，把 **制品构建 → A/B 测试 → 渐进式灰度 → 正式切换** 串成可重复执行的 CI/CD 流水线。

---

## 一、Nginx Ingress 灰度架构回顾

Nginx Ingress Controller 通过前置 LoadBalancer / NodePort Service 接收入站流量，在 Pod 内解析 Ingress 规则后转发到后端 Service，最终到达业务容器。

![Nginx Ingress 架构](/云原生/k8s/p436-01.png)

与传统 Nginx 手写 `conf` 不同，Ingress Controller 把 **YAML 注解** 转成 Nginx 配置并 **动态 reload**。Controller 通过 ServiceAccount + RoleBinding 调用 Kubernetes API，感知 Ingress 变更。

典型金丝雀拓扑：

```text
Client → Ingress Controller → stable Service → stable Deployment
                            ↘ canary Service  → canary Deployment
```

---

## 二、灰度前的准备：两套 Deployment + Service

### 2.1 Stable 版本

```yaml
# app-stable-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-stable
  labels:
    app: demo
    track: stable
spec:
  replicas: 3
  selector:
    matchLabels:
      app: demo
      track: stable
  template:
    metadata:
      labels:
        app: demo
        track: stable
    spec:
      containers:
        - name: app
          image: harbor.example.com/demo/app:v1.0.0
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: demo-stable
  labels:
    app: demo
spec:
  selector:
    app: demo
    track: stable
  ports:
    - port: 80
      targetPort: 8080
```

部署并验证：

```bash
kubectl apply -f app-stable-deployment.yaml
curl http://<node-ip>:<nodeport>   # 应返回 stable 版本标识
```

![Stable Deployment 与 Service](/云原生/k8s/p437-01.png)

### 2.2 Canary 版本

```yaml
# app-canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-canary
  labels:
    app: demo
    track: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: demo
      track: canary
  template:
    metadata:
      labels:
        app: demo
        track: canary
    spec:
      containers:
        - name: app
          image: harbor.example.com/demo/app:v1.1.0
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: demo-canary
  labels:
    app: demo
spec:
  selector:
    app: demo
    track: canary
  ports:
    - port: 80
      targetPort: 8080
```

![Canary Deployment 与 Service](/云原生/k8s/p438-01.png)

---

## 三、基于 Request Header 的灰度（用户 / A/B）

适用场景：指定用户、地域或内测账号先访问新版本，其余流量仍走 stable。

### 3.1 核心注解

| 注解 | 含义 |
|------|------|
| `nginx.ingress.kubernetes.io/canary: "true"` | 标记为金丝雀 Ingress |
| `nginx.ingress.kubernetes.io/canary-by-header: "<name>"` | 按 Header 名匹配 |
| `nginx.ingress.kubernetes.io/canary-by-header-value: "<value>"` | Header 值匹配时走 canary |

特殊值 `always` / `never` 可强制全部 / 永不进入 canary，此处用自定义 Header 做 A/B。

### 3.2 Ingress 示例

**Stable Ingress**（主入口，无 canary 注解）：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-stable-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
    - host: foo.bar.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: demo-stable
                port:
                  number: 80
```

**Canary Ingress**（带 Header 规则）：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-canary-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: region
    nginx.ingress.kubernetes.io/canary-by-header-value: beijing
spec:
  rules:
    - host: foo.bar.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: demo-canary
                port:
                  number: 80
```

![基于 Header 的灰度规则示意](/云原生/k8s/p441-01.png)

### 3.3 验证

```bash
# 无 Header → 仅 stable
while sleep 1; do curl -s http://foo.bar.com/ | grep -o 'flag=[^ ]*'; done

# Header region=beijing → 仅 canary
while sleep 1; do curl -s http://foo.bar.com/ -H "region: beijing" | grep -o 'flag=[^ ]*'; done
```

![Header 灰度 curl 效果](/云原生/k8s/p443-01.png)

生产实践中，参与 A/B 的用户可在数据库配置，前端请求自动带上测试标志 Header。

---

## 四、基于权重的灰度

适用场景：蓝绿过渡、按比例逐步放量，权重范围 **0–100**（百分比）。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-canary-weight
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "30"   # 30% 流量到 canary
spec:
  rules:
    - host: foo.bar.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: demo-canary
                port:
                  number: 80
```

![基于权重的 Canary 规则](/云原生/k8s/p445-01.png)

验证（多次请求统计比例）：

```bash
while sleep 1; do curl -s http://foo.bar.com/ | grep -o 'flag=[^ ]*'; done
```

![权重灰度访问效果](/云原生/k8s/p446-01.png)

- `weight: 0` → 规则不生效，无流量进 canary  
- `weight: 100` → 全部流量进 canary

---

## 五、Jenkins 安装

### 5.1 WAR 本机部署（快速试用）

```bash
mkdir -p /usr/local/jenkins && cd /usr/local/jenkins
# 下载 jenkins.war（示例 2.375.1 LTS）
wget https://get.jenkins.io/war-stable/2.375.1/jenkins.war
chmod +x start-jenkins.sh && sh start-jenkins.sh start
tail -f nohup.out
```

### 5.2 Docker Compose（推荐，JDK 隔离）

新版本 Jenkins 依赖 JDK 11+；若宿主机必须 JDK 8，用容器隔离更稳妥：

```yaml
# docker-compose.yml
version: "3.8"
services:
  jenkins:
    image: jenkins/jenkins:lts-jdk11
    ports:
      - "8980:8080"
    volumes:
      - ./data:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker
      - /usr/local/bin/docker-compose:/usr/local/bin/docker-compose
    user: root
```

```bash
docker compose up -d
cat ./data/secrets/initialAdminPassword   # 首次登录密码
```

插件镜像加速（Manage Jenkins → Plugins → Advanced）：

```text
https://mirrors.tuna.tsinghua.edu.cn/jenkins/updates/update-center.json
```

![Jenkins Docker Compose 启动](/云原生/k8s/p453-01.png)

必装插件：**Pipeline**、**Git**、**SSH Pipeline Steps**、**Kubernetes CLI**（按需）。

---

## 六、Pipeline 语法与远程执行

### 6.1 声明式 Pipeline 骨架

```groovy
pipeline {
    agent any
    environment {
        BUILD_USER = ""
    }
    triggers {
        pollSCM('H/3 * * * *')   // 每 3 分钟检测代码变更
    }
    stages {
        stage('Clone') {
            steps {
                echo '拉取代码'
            }
        }
        stage('Build') {
            steps {
                echo '构建'
            }
        }
    }
}
```

推荐 **Pipeline script from SCM**：Jenkinsfile 与业务代码同仓，版本可追溯。

![Pipeline Hello World 构建记录](/云原生/k8s/p458-01.png)

### 6.2 SSH Pipeline Steps

在 K8s Master 或跳板机上执行 `kubectl`、部署脚本：

```groovy
stage('Deploy to K8s') {
    steps {
        script {
            def remote = [:]
            remote.name = 'k8s-master'
            remote.host = '192.168.1.100'
            remote.allowAnyHosts = true
            withCredentials([usernamePassword(
                credentialsId: 'k8s-ssh',
                usernameVariable: 'username',
                passwordVariable: 'password')]) {
                remote.user = username
                remote.password = password
            }
            sshCommand remote: remote, command: 'kubectl apply -f /opt/canary/canary-ingress.yaml'
        }
    }
}
```

---

## 七、Ingress 灰度 CI/CD 流水线设计

### 7.1 总体流程

![Ingress 灰度三段式流程](/云原生/k8s/p466-01.png)

| 阶段 | 动作 |
|------|------|
| Step 1 | Git 提交 → 构建镜像 → 推送 Harbor → 触发部署 |
| Step 2 | 生产 A/B 测试（Header 定向新版本） |
| Step 3 | 渐进式权重灰度（如 30% → 60% → 90% → 100%） |
| Step 4 | 善后：canary 升为 stable，删除旧资源 |

灰度期间 **stable 与 canary 并存**，便于秒级回滚——线上发布回退概率不低，双版本并行是稳健做法。

![完整 CICD 流水线预览](/云原生/k8s/p467-01.png)

### 7.2 Step 1：自动化制品发布

GitLab Webhook 触发 Jenkins：

```groovy
stage('Clone') {
    steps {
        git url: 'https://gitee.com/org/springboot-dubbo.git', branch: 'master'
        script {
            build_tag = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
        }
    }
}
stage('Maven Build') {
    steps {
        sh '''cd provider/
            mvn clean package -DskipTests'''
    }
}
stage('Docker Build') {
    steps {
        sh """cd provider/
            docker build -t harbor.example.com/demo/app:${build_tag} ."""
    }
}
stage('Push') {
    steps {
        sh """
            docker login harbor.example.com -u \$HARBOR_USER -p \$HARBOR_PASS
            docker push harbor.example.com/demo/app:${build_tag}
        """
    }
}
```

![制品构建流水线](/云原生/k8s/p459-01.png)

### 7.3 Step 2：生产 A/B 测试

部署 canary Deployment + **带 `canary-by-header` 的 Ingress**；仅 `region=beijing`（或业务自定义 Header）访问新版本。

![A/B 测试流量架构](/云原生/k8s/p471-01.png)

A/B 流水线可手动触发，脚本核心：

```bash
kubectl apply -f canary-deployment.yaml
kubectl apply -f canary-ab-ingress.yaml   # canary: true + canary-by-header
```

### 7.4 Step 3：渐进式权重灰度

四轮示例（定时步进，每轮间隔 30s）：

| 轮次 | `canary-weight` | 等待 |
|------|-----------------|------|
| 1 | 30 | 30s |
| 2 | 60 | 60s |
| 3 | 90 | 60s |
| 4 | 100 | — |

Pipeline 中可用 `sleep 30` + `sed` 改 YAML 再 `kubectl apply`，或 Groovy 直接 patch Ingress 注解：

```groovy
def weights = [30, 60, 90, 100]
for (w in weights) {
    sh """
      kubectl patch ingress demo-canary-weight -n prod \
        -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"${w}"}}}'
    """
    if (w < 100) { sleep 30 }
}
```

![灰度阶段流量示意](/云原生/k8s/p473-01.png)

![灰度流水线示意](/云原生/k8s/p472-01.png)

**回滚**：终止流水线，执行 **灰度撤销流水线**——将 weight 置 0 或删除 canary Ingress。

![灰度撤销流水线](/云原生/k8s/p474-01.png)

### 7.5 Step 4：正式切换（善后）

canary 稳定后：

1. 将 **stable Service 的 selector** 指向 canary Pod（或更新 stable Deployment 镜像为 canary 版本）  
2. 删除 canary Ingress  
3. 删除 canary Service  
4. 删除旧 stable Deployment  

```bash
kubectl patch service demo-stable -p '{"spec":{"selector":{"track":"canary"}}}'
kubectl delete ingress demo-canary-weight
kubectl delete svc demo-canary
kubectl delete deployment demo-stable-old
```

---

## 八、与 Argo Rollouts 的对比

上述流程部分环节仍可人工确认（如 A/B 通过后再点「开始灰度」）。若希望 **CRD 驱动、GitOps 化**，可评估 [Argo Rollouts](https://argoproj.github.io/rollouts/) + Argo CD。

但线上发布建议保留 **人工审批节点**——全自动无值守意味着更高风险；预发通过 ≠ 生产无事故。

---

## 小结

| 能力 | 实现方式 |
|------|----------|
| 按用户/Header 灰度 | `canary-by-header` + `canary-by-header-value` |
| 按权重灰度 | `canary-weight: 0–100` |
| 自动化 | Jenkins Pipeline + SSH/kubectl |
| 渐进放量 | 循环 patch weight + sleep |
| 快速回滚 | 删 canary Ingress 或 weight=0 |

> ➡️ 下一篇：[《发布进阶——Argo Rollouts 金丝雀与 OpenKruise 原地升级》](/云原生/k8s/k8s-27-advanced-rollout)
