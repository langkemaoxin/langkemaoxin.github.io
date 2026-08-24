---
title: Secret、ConfigMap 与常见部署排障
sidebarGroup: Kubernetes
shortTitle: 12 Secret/ConfigMap
order: 12
date: 2026-08-31T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - Kubernetes系列
  - Secret
  - ConfigMap
  - ImagePullBackOff
  - CrashLoopBackOff
  - hostPath
description: Secret/ConfigMap/imagePullSecrets，以及 ImagePullBackOff 等常见故障排查。
---

> **Kubernetes 系列 · 第 12/35 篇**  
> 上一篇：[《应用持久化存储——Volume、PV 与 PVC》](/云原生/k8s/k8s-11-pv-pvc)  
> 下一篇：[《Ingress 七层流量分发——原理、部署模式与动态域名》](/云原生/k8s/k8s-13-ingress-l7)

---

## 开头：镜像推上去了，Pod 为什么还起不来？

Harbor 里已有 `demo-provider:v1.0.1`，`kubectl apply` 之后 Pod 却卡在 **ImagePullBackOff** 或 **CrashLoopBackOff**。前者多半是拉镜像/鉴权问题；后者是容器**启动后退出**——Java 缺类、挂载目录空、Redis 域名解析失败等。

本文系统讲 **Secret / ConfigMap** 的用法，以及 **imagePullSecrets、hostAliases、hostPath** 在 Spring Cloud 迁移中的配置方式，并给出 **ImagePullBackOff / CrashLoopBackOff** 的分步排查命令清单。

---

## 一、ConfigMap 与 Secret：配置与敏感数据解耦

两者都是 K8s 的 API 对象，把配置从镜像里拆出来，挂到 Pod 上。

| 类型 | 用途 | 典型内容 |
|------|------|----------|
| **ConfigMap** | 非敏感配置 | 应用 YAML、环境变量、Redis 地址 |
| **Secret** | 敏感数据 | 密码、TLS 证书、**Docker 仓库登录凭据** |

Pod 使用方式三种：

1. **环境变量**（`env` / `envFrom`）
2. **命令行参数**
3. **Volume 挂载**为文件

ConfigMap 单条数据建议 **≤ 1MiB**；更大文件用 PV 或对象存储。

```mermaid
flowchart TB
  CM[ConfigMap / Secret]
  CM -->|env| POD[Pod 容器]
  CM -->|volumeMount| POD
```

---

## 二、Secret：私有镜像拉取凭据

Harbor 私有项目不能匿名 pull；**节点上的 docker login 不会自动给 kubelet 用**，必须在 Pod/SA 上配置 **imagePullSecrets**。

### 2.1 命令行创建 docker-registry Secret

```bash
kubectl create secret docker-registry harbor-secret \
  --docker-server=harbor.example.com \
  --docker-username=admin \
  --docker-password='YourPassword' \
  --docker-email=admin@example.com

kubectl get secret harbor-secret
kubectl describe secret harbor-secret
```

### 2.2 在 Pod / Deployment 中引用

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: demo-provider
spec:
  imagePullSecrets:
    - name: harbor-secret
  containers:
    - name: demo-provider
      image: harbor.example.com/demo/demo-provider:v1.0.1
      imagePullPolicy: IfNotPresent
```

也可绑定到 **ServiceAccount**，同命名空间 Pod 默认继承：

```bash
kubectl patch serviceaccount default -p '{"imagePullSecrets":[{"name":"harbor-secret"}]}'
```

### 2.3 ImagePullPolicy

| 值 | 行为 |
|----|------|
| `Always` | 每次创建 Pod 都拉镜像 |
| `IfNotPresent` | 本地有则不用拉（Minikube 节点本地缓存） |
| `Never` | 只用本地，不存在则失败 |

节点拉取策略由 **kubelet** 执行，与开发机 `docker pull` 是两套路径。

---

## 三、ConfigMap 创建与使用

### 3.1 YAML 创建

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DJANGO_DEBUG: "False"
  REDIS_LOCATION: "redis://default:pass@10.0.0.1:6379"
  application.yml: |
    server:
      port: 7700
    spring:
      application:
        name: demo-provider
```

```bash
kubectl apply -f configmap.yaml
kubectl describe cm app-config
```

### 3.2 命令行创建

```bash
kubectl create cm app-config \
  --from-literal=port=3306 \
  --from-literal=mysql.url=127.0.0.1

kubectl create cm dev-redis-config --from-file=file.yml
```

### 3.3 注入为环境变量

```yaml
env:
  - name: REDIS_LOCATION
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: REDIS_LOCATION
  - name: DJANGO_DEBUG
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: DJANGO_DEBUG
```

### 3.4 Volume 挂载为文件

```yaml
volumeMounts:
  - name: config-volume
    mountPath: /config
    readOnly: true
volumes:
  - name: config-volume
    configMap:
      name: swagger-ui-cm
```

多个 Pod 可引用**同一份** ConfigMap；更新 ConfigMap 后，挂载的 Pod 会在一定延迟后看到新内容（环境变量方式**不会**自动更新，需重启 Pod）。

![ConfigMap 单 Pod / 多 Pod](/云原生/k8s/p419-01.png)

---

## 四、docker-compose 转 K8s 示例

### 4.1 compose 片段

```yaml
services:
  swagger-ui:
    image: swaggerapi/swagger-ui
    ports:
      - "9092:8080"
    volumes:
      - ../docs/openapi:/usr/share/nginx/html/doc
    environment:
      API_URL: ./doc/api.yaml
```

### 4.2 等价 K8s 资源

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: swagger-ui-cm
data:
  api.yaml: |
    openapi: 3.0.0
    info:
      version: "1.0"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: swagger-ui
spec:
  replicas: 1
  selector:
    matchLabels:
      app: swagger-ui
  template:
    metadata:
      labels:
        app: swagger-ui
    spec:
      containers:
        - name: swagger-ui
          image: swaggerapi/swagger-ui
          ports:
            - containerPort: 8080
          env:
            - name: SWAGGER_JSON
              value: /openapi/api.yaml
          volumeMounts:
            - name: swagger-ui-cm
              mountPath: /openapi
      volumes:
        - name: swagger-ui-cm
          configMap:
            name: swagger-ui-cm
---
apiVersion: v1
kind: Service
metadata:
  name: swagger-ui
spec:
  ports:
    - port: 8080
      targetPort: 8080
  selector:
    app: swagger-ui
```

---

## 五、Spring Cloud 环境变量与 JVM 参数

Deployment 中 `env` 会覆盖镜像默认 JVM。含空格的值用引号：

```yaml
env:
  - name: NACOS_SERVER
    value: "192.168.56.121:8848"
  - name: LOG_PATH
    value: "/work/logs"
  - name: JVM_CONF
    value: "-server -Xms64m -Xmx256m"
  - name: SCAFFOLD_DB_HOST
    value: "192.168.56.121"
  - name: SCAFFOLD_DB_PSW
    value: "123456"
  - name: SCAFFOLD_EUREKA_ZONE_HOSTS
    value: "http://192.168.56.121:7777/eureka/"
```

compose 里的 `extra_hosts` 在 K8s 中用 **hostAliases** 替代（见下节）。

---

## 六、hostAliases：自定义 /etc/hosts

K8s 启动容器时会写入 Pod IP 与 hostname；**Dockerfile 里写的 `/etc/hosts` 会被覆盖**。要把 `cdh1` 解析到宿主机中间件 IP，用：

```yaml
spec:
  hostAliases:
    - ip: "192.168.56.121"
      hostnames:
        - "cdh1"
        - "harbor.example.com"
    - ip: "192.168.56.122"
      hostnames:
        - "cdh2"
```

进入 Pod 验证：

```bash
kubectl exec -it <pod> -- cat /etc/hosts
# 应看到 Entries added by HostAliases
```

---

## 七、hostPath：挂载宿主机目录

`hostPath` 把节点本地路径挂进 Pod，常用于日志、开发环境共享目录。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: demo-provider
spec:
  containers:
    - name: app
      image: demo-provider:v1.0.1
      volumeMounts:
        - name: work-dir
          mountPath: /work
  volumes:
    - name: work-dir
      hostPath:
        path: /data/k8s/demo-provider/work
        type: DirectoryOrCreate
```

**注意**：

- 不同节点路径不一致时，行为可能不同（StatefulSet + 固定节点或改用 PVC）。
- Minikube 是虚拟机，**宿主机**上的 `/vagrant/.../work` 不会自动出现于 minikube 节点，需 **scp 复制**或 minikube mount。

```bash
minikube ssh
sudo mkdir -p /data/k8s/demo-provider
sudo scp -r root@192.168.56.121:/path/to/work /data/k8s/demo-provider/
```

---

## 八、ImagePullBackOff 排查清单

**含义**：kubelet 拉取镜像失败，按退避重试。

```mermaid
flowchart TD
  A[ImagePullBackOff] --> B{describe Pod Events}
  B -->|401/403| C[检查 imagePullSecrets]
  B -->|x509| D[证书/SAN/insecure-registry]
  B -->|not found| E[tag 名或项目路径错误]
  B -->|timeout| F[网络/防火墙/Harbor 宕机]
  C --> G[创建 harbor-secret 并挂载]
  D --> H[同步 minikube certs.d]
  E --> I[Harbor UI 核对路径]
  F --> J[docker-compose up Harbor]
```

### 8.1 命令清单

```bash
# 1. 看 Pod 状态与事件
kubectl get pods -A
kubectl describe pod <pod-name> -n <namespace>
# 关注 Events: Failed to pull image / unauthorized / x509

# 2. 核对镜像名与 Harbor 一致
# harbor.example.com/demo/demo-provider:v1.0.1

# 3. 检查 Secret
kubectl get secret harbor-secret
kubectl get pod <pod> -o yaml | grep -A5 imagePullSecrets

# 4. 在 minikube 节点手动 pull
minikube ssh -- docker pull harbor.example.com/demo/demo-provider:v1.0.1

# 5. Harbor 服务
cd /usr/local/harbor/harbor && docker-compose ps
docker-compose stop && docker-compose up -d

# 6. 仍失败：重建 Secret 或 patch SA
kubectl delete secret harbor-secret
kubectl create secret docker-registry harbor-secret ...
```

![ImagePullBackOff 事件](/云原生/k8s/p428-01.png)

**要点**：仅 `docker login` 在开发机不够；**必须** `imagePullSecrets` + 节点能访问 registry。

---

## 九、CrashLoopBackOff 排查清单

**含义**：镜像已拉下，容器启动后**反复崩溃**；K8s 指数退避重启。CrashLoopBackOff 是**结果**，不是根因。

### 9.1 第一步：describe + logs

```bash
kubectl describe pod <pod-name> -n <namespace>
# State: Waiting, Reason: CrashLoopBackOff
# Last State: Terminated, Reason: Completed / Error / OOMKilled

kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous   # 上一次崩溃的日志
kubectl logs -f <pod-name> -c demo-provider         # 多容器指定容器名
```

### 9.2 常见坑与对策

| 坑 | 现象 | 处理 |
|----|------|------|
| **坑 1：依赖未打进镜像** | 日志 `ClassNotFoundException` | 重新 `mvn package` + `docker build` + push |
| **坑 2：Java 进程退出** | Last State Reason: **Completed**（pid 1 脚本 exit） | 检查 `deploy-sit.sh` 是否 `exec java` 前台运行 |
| **坑 3：hostPath 空目录** | 日志找不到 agent/jar | minikube 内 scp 同步 work 目录 |
| **坑 4：中间件域名** | Redis/MySQL connection refused | 加 **hostAliases** 或改 env 为 ClusterIP |
| **坑 5：配置错误** | Nacos/Eureka 连不上 | ConfigMap/env 与 compose 对齐 |

### 9.3 完整修复流程示例

```bash
# 1. 本地 compose 验证镜像
docker run --rm -p 7700:7700 \
  -e NACOS_SERVER=192.168.56.121:8848 \
  harbor.example.com/demo/demo-provider:v1.0.1

# 2. 重新构建推送
cd demo-application/
docker build -t demo-provider:v1.0.1 .
docker tag demo-provider:v1.0.1 harbor.example.com/demo/demo-provider:v1.0.1
docker push harbor.example.com/demo/demo-provider:v1.0.1

# 3. 同步挂载数据到 minikube
minikube ssh
sudo mkdir -p /data/k8s/demo-provider
sudo scp -r root@192.168.56.121:/path/to/work /data/k8s/demo-provider/

# 4. 部署并观察
kubectl apply -f demo-provider.yml
kubectl get pods -w
kubectl logs -f deployment/demo-provider-deployment

# 5. 访问验证
minikube ip
kubectl get svc
curl http://<minikube-ip>:<nodePort>/demo-provider/actuator/health
```

![CrashLoopBackOff describe](/云原生/k8s/p429-01.png)

### 9.4 部署 YAML 综合示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-provider-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: demo-provider
  template:
    metadata:
      labels:
        app: demo-provider
    spec:
      imagePullSecrets:
        - name: harbor-secret
      hostAliases:
        - ip: "192.168.56.121"
          hostnames:
            - "cdh1"
      containers:
        - name: demo-provider
          image: harbor.example.com/demo/demo-provider:v1.0.1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 7700
          env:
            - name: NACOS_SERVER
              value: "cdh1:8848"
            - name: JVM_CONF
              value: "-server -Xms64m -Xmx256m"
          volumeMounts:
            - name: work
              mountPath: /work
      volumes:
        - name: work
          hostPath:
            path: /data/k8s/demo-provider/work
            type: Directory
---
apiVersion: v1
kind: Service
metadata:
  name: demo-provider
spec:
  type: NodePort
  ports:
    - port: 7700
      targetPort: 7700
      nodePort: 32700
  selector:
    app: demo-provider
```

---

## 十、通用排障命令速查

```bash
# 部署 / 删除
kubectl apply -f ./demo-provider.yml
kubectl delete -f ./demo-provider.yml

# 全局视图
kubectl get pods -A
kubectl get svc -A
kubectl get events -n <ns> --sort-by='.lastTimestamp'

# 单 Pod 深挖
kubectl describe pod <name> -n <ns>
kubectl logs -f <name> -n <ns> --previous
kubectl exec -it <name> -n <ns> -- /bin/sh

# 网络
minikube ip
curl http://<ip>:<nodePort>/path

# Harbor
docker login harbor.example.com
docker pull harbor.example.com/demo/demo-provider:v1.0.1
```

---

## 十一、安全三件套：ServiceAccount、RBAC 与 securityContext

Secret 管的是「数据不让别人看」，但 K8s 安全还有另一半：**谁能操作集群（API 层）**、**容器里进程的权限有多大（运行时层）**——正好补齐这两层（官方 [Security 概念](https://kubernetes.io/docs/concepts/security/)）。

### 11.1 ServiceAccount：Pod 在集群里的身份

人用 kubeconfig 里的用户身份访问 API，**Pod 用 ServiceAccount（SA）**。每个 namespace 有个叫 `default` 的 SA，Pod 不指定就自动用它——1.24 起**不再自动生成长效 Secret token**，而是挂一个**投射的临时 token**（到期自动轮换）进 Pod：

```bash
kubectl get sa -n prod
# Pod 里实际挂载的 token：
kubectl exec <pod> -- cat /var/run/secrets/kubernetes.io/serviceaccount/token
```

> ⚠️ `default` SA 默认**几乎零权限**（除集群公开信息外读不了任何对象）——这是刻意的。Pod 里的应用要访问 API 时，正确姿势是**新建专用 SA + 最小授权**，而不是给 default 提权。

### 11.2 RBAC：谁能对什么对象做什么

四个对象两两配对（[Using RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)）：

| 对象 | 作用域 | 定义什么 |
|------|--------|----------|
| **Role / ClusterRole** | ns 内 / 集全局 | 一组权限：** verbs × resources ** |
| **RoleBinding / ClusterRoleBinding** | ns 内 / 集全局 | 把权限**绑定给主体**（User/Group/SA） |

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: prod
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]     # 对哪些资源
    verbs: ["get", "list", "watch"]      # 能做什么
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: prod
subjects:
  - kind: ServiceAccount
    name: ci-bot                        # 授权给谁（SA/User/Group）
roleRef:
  kind: Role
  name: pod-reader
```

验证某人/某 SA 的实际权限，一条命令：

```bash
kubectl auth can-i get pods -n prod --as=system:serviceaccount:prod:ci-bot
# yes / no
```

> 💡 记法：**Role 是「权限包」，Binding 是「发放」**。Jenkins/Argo 这类要操作集群的 CI，就是「专用 SA + RoleBinding」的标准用户（[17 篇](/云原生/k8s/k8s-26-jenkins-canary)的 Jenkins 凭据同理）。

### 11.3 securityContext：容器内进程的权限

容器默认以镜像内 USER（常是 root）跑、且持有默认 capabilities——生产上应显式收紧（[Configure Security Context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)）：

```yaml
spec:                       # Pod 级（作用于所有容器）
  securityContext:
    runAsNonRoot: true      # 禁止 root 跑
    fsGroup: 2000           # 挂载卷的组权限
  containers:
    - name: myapp
      securityContext:      # 容器级（覆盖 Pod 级）
        runAsUser: 1000     # 以 UID 1000 运行
        allowPrivilegeEscalation: false
        capabilities:
          drop: ["ALL"]     # 丢掉全部 Linux 能力
          add: ["NET_BIND_SERVICE"]   # 只留需要的（如绑定 80 端口）
        readOnlyRootFilesystem: true  # 根文件系统只读（写临时文件挂 emptyDir）
```

常用强度排序：`privileged: true`（≈ 宿主机 root，只给特权 DaemonSet）＞ 默认 ＞ drop ALL + nonRoot（推荐基线）。

---

## 十二、Pod Security Standards：命名空间级安全基线

securityContext 要逐个 Pod 手写，容易漏。**PSS（Pod Security Standards）** 把安全要求固化成三档**预置基线**，配合 **Pod Security Admission**（1.25 起替代已移除的 PSP）在**命名空间标签**上一行开启（[docs](https://kubernetes.io/docs/concepts/security/pod-security-standards/)）：

| 基线 | 要求 |
|------|------|
| **Privileged** | 不限制（兼容旧特权负载） |
| **Baseline**（最低防线） | 禁 hostNetwork/hostPath、hostPID、privileged、添加危险 capabilities |
| **Restricted**（最严） | Baseline + 必须 runAsNonRoot、drop ALL capabilities、seccomp 限 RuntimeDefault |

```bash
# 对 namespace 开启：enforce（强制）+ audit（记录）+ warn（警告），模式可分别设置
kubectl label ns prod \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
# 之后不合规的 Pod 创建直接被拒绝，并列出违反哪条
```

> 💡 落地建议：**baseline 起步全集群铺开**（挡住高危写法），核心业务 namespace 再逐个升到 restricted；先只开 `warn`/`audit` 观察存量负载，再切 `enforce`。

---

## 小结

- **Secret** 存镜像仓库密码，通过 **imagePullSecrets** 让 kubelet 能拉 Harbor 私有镜像；仅 docker login 无效。
- **ConfigMap** 存应用配置，支持 env 与 volume；Spring Cloud 的 compose `environment` 映射到 Deployment `env`。
- **hostAliases** 替代 compose `extra_hosts`；**hostPath** 挂节点目录，Minikube 需注意数据同步。
- **ImagePullBackOff** → 查 Events、Secret、节点 pull、Harbor 存活；**CrashLoopBackOff** → 查 **logs --previous**、compose 对照、挂载与 DNS。

> ➡️ 下一篇：[《Harbor + K8s 手动部署 SpringCloud——镜像构建与推送》](/云原生/k8s/k8s-25-harbor-springcloud)
