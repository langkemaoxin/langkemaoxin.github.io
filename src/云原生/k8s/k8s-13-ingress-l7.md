---
title: Ingress 七层流量分发——原理、部署模式与动态域名
sidebarGroup: Kubernetes
shortTitle: 13 Ingress 七层
order: 13
date: 2026-08-30T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - Ingress
  - nginx-ingress
description: Ingress Controller、资源字段、部署模式与生产侧 LVS/Keepalived 思路。
---

> **Kubernetes 系列 · 第 13/35 篇**  
> 上一篇：[《Secret、ConfigMap 与常见部署排障》](/云原生/k8s/k8s-12-secret-configmap) · 下一篇：[《Gateway API：七层入口的新标准与 Ingress 迁移》](/云原生/k8s/k8s-14-gateway-api)

---

## 开头：几十个微服务，还要开几十个 NodePort 吗？

Service 解决四层负载均衡，但 **NodePort 端口范围有限**（30000–32767），Service 一多端口管理成为灾难；LoadBalancer 又绑定云厂商且可能有额外费用。**Ingress** 用 **少量公网 IP + 七层反向代理**，按 **Host / Path** 把 HTTP(S) 流量分发到不同 Service——可以理解为「Service 的 Service」。

本篇区分 Ingress 资源与 Ingress Controller，讲清 ingress-nginx 部署、IngressClass、路径/主机匹配规则，以及 DaemonSet + hostNetwork + nodeSelector 与 LVS + Keepalived 生产架构，最后说明 **动态域名配置** 的控制循环原理。

---

## 一、Service 的不足与 Ingress 定位

| 暴露方式 | 问题 |
|----------|------|
| ClusterIP | 仅集群内 |
| NodePort | 每 Service 占一端口，规模大时难维护；多一层 NAT |
| LoadBalancer | 依赖云平台，成本与厂商绑定 |
| **Ingress** | 一个入口按域名/路径路由多个 HTTP 服务 |

![集群外访问 Pod/Service 的路径对比](/云原生/k8s/p302-01.png)

Ingress 是 **七层（HTTP/HTTPS）** 抽象：类似 Nginx 的 `server_name` + `location`，由 **Ingress Controller** 实现具体转发。Pod IP 与 ClusterIP 在集群外不可见，Ingress 在集群边缘做统一入口。

![Ingress 工作机制概览](/云原生/k8s/p302-02.png)

---

## 二、Ingress 组成

![Ingress 策略 + Controller 整体架构](/云原生/k8s/p303-01.png)

| 组件 | 角色 |
|------|------|
| **Ingress 资源** | 声明路由规则（Host、Path → Service:Port） |
| **Ingress Controller** | 监听 Ingress/Service/Endpoint，生成并 reload 代理配置 |
| **反向代理（Nginx/Traefik…）** | 数据面，通常写入 **Pod IP** 而非 Service VIP，避免多一层 kube-proxy |

Controller 将请求**直接转发到 Endpoint Pod**，跳过 Service 的 iptables/ipvs 再均衡，降低延迟。

![Ingress Controller 与 kube-proxy 的关系](/云原生/k8s/p304-01.png)

### 2.1 Ingress Controller 能力

- 七层负载均衡；
- TLS 终结（客户端 ↔ Controller 为 HTTPS，Controller ↔ Pod 可为 HTTP）；
- 基于名称的虚拟主机（多域名）；
- 按 Path 前缀/精确匹配。

![Ingress Controller 功能块](/云原生/k8s/p305-01.png)

### 2.2 Controller 实现对比

| 类型 | 代表 | 优点 | 缺点 |
|------|------|------|------|
| 传统 LB | Nginx Ingress、HAProxy | 成熟、高性能 | 动态更新需 reload（Nginx 已优化为热加载 upstream） |
| 云原生 | Traefik、Envoy、Istio Gateway | 原生动态配置 | 生态与运维曲线各异 |

Kubernetes 官方维护的 Controller 主要是 **GCE** 与 **ingress-nginx**；社区还有 Contour、HAProxy Ingress、Traefik 等。

---

## 三、Ingress 资源对象

Ingress 是 API 对象，**本身不转发流量**，只定义规则模板；必须由已部署的 Controller 消费。

### 3.1 示例（networking.k8s.io/v1）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: abc-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"   # 旧版选 Controller 方式
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx                # 推荐：v1.18+ 标准字段
  tls:
    - hosts:
        - api.example.com
      secretName: abc-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: apiserver
                port:
                  number: 80
    - host: www.example.com
      http:
        paths:
          - path: /image
            pathType: Prefix
            backend:
              service:
                name: fileserver
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: feserver
                port:
                  number: 8080
```

**metadata.annotations** 很重要：不同 Controller 读取不同注解（超时、重写、正则、限流等）。ingress-nginx 使用 `nginx.ingress.kubernetes.io/*` 前缀。

![Ingress YAML 结构说明](/云原生/k8s/p307-01.png)

### 3.2 spec 关键字段

| 字段 | 说明 |
|------|------|
| **rules** | Host + paths → backend Service |
| **tls** | HTTPS 证书（Secret type kubernetes.io/tls） |
| **defaultBackend** | 无 rule 匹配时的默认后端 |
| **ingressClassName** | 绑定 IngressClass，指定由哪个 Controller 处理 |

### 3.3 defaultBackend 与 Resource Backend

无 `rules` 时，全部流量进 **defaultBackend**：

```yaml
spec:
  defaultBackend:
    service:
      name: service1
      port:
        number: 8008
```

也可将 backend 指向自定义 **Resource**（如对象存储 CRD），与 Service backend 互斥。

---

## 四、路径类型与主机匹配

### 4.1 pathType

| pathType | 行为 |
|----------|------|
| **Prefix** | 按 `/` 分段前缀匹配，区分大小写 |
| **Exact** | URL 路径精确匹配 |
| **ImplementationSpecific** | 由 IngressClass/Controller 定义 |

Prefix 示例：`/foo` 匹配 `/foo`、`/foo/`、`/foo/bar`；**不匹配** `/foo/bar` 若最后一段只是前缀（如 `/foo/bar` 与 `/foo/barbaz`）。

### 4.2 路径匹配优先级

多条 path 同时匹配时：**最长路径优先**；长度相同时 **Exact 优先于 Prefix**。

### 4.3 主机名通配符

| host 规则 | 匹配 |
|-----------|------|
| `foo.bar.com` | 精确匹配 HTTP Host |
| `*.foo.com` | 单标签通配：`bar.foo.com` ✓；`baz.bar.foo.com` ✗；`foo.com` ✗ |

```yaml
spec:
  rules:
    - host: "foo.bar.com"
      http:
        paths:
          - path: /bar
            pathType: Prefix
            backend:
              service:
                name: service1
                port:
                  number: 8008
    - host: "*.foo.com"
      http:
        paths:
          - path: /foo
            pathType: Prefix
            backend:
              service:
                name: service2
                port:
                  number: 9008
```

![路径与主机匹配示例](/云原生/k8s/p314-01.png)

---

## 五、IngressClass

每个 Ingress 应关联 **IngressClass**，声明由哪个 Controller 处理。

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx
  annotations:
    ingressclass.kubernetes.io/is-default-class: "true"
spec:
  controller: k8s.io/ingress-nginx
```

- **controller** 字段必须与 Controller 启动参数中的 `--controller-class` 一致；
- 仅**一个** IngressClass 可标记为默认，否则准入会拒绝未指定 class 的新 Ingress。

IngressClass 可带 **parameters**（集群级或命名空间级 CR），供特定 Controller 读取扩展配置。

![IngressClass 与 Controller 对应](/云原生/k8s/p315-01.png)

---

## 六、部署 Ingress Controller

### 6.1 Minikube 快速体验

```bash
minikube addons enable ingress
minikube addons disable ingress
```

插件方式适合入门，**生产建议手工/manifest 或 Helm 部署**以理解 RBAC、Admission、Service 暴露方式。

### 6.2 ingress-nginx 手工部署

获取官方 manifest（版本需匹配 K8s；**1.22+ 需 ingress-nginx v1.0+**，因 `networking.k8s.io/v1` 替代 v1beta1）：

```bash
# 示例：controller v1.x
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.0/deploy/static/provider/cloud/deploy.yaml
```

manifest 包含 Namespace、ConfigMap、RBAC、ServiceAccount、Deployment/DaemonSet、Service、ValidatingWebhook 等。

![deploy.yaml 资源清单概览](/云原生/k8s/p308-01.png)

**Deployment 核心片段**：

- 镜像：`registry.k8s.io/ingress-nginx/controller:v1.x`；
- 参数：`--configmap`、`--publish-service`、`--ingress-class=k8s.io/ingress-nginx`；
- 容器端口 80/443，健康检查 10254 `/healthz`；
- `NET_BIND_SERVICE` capability，以非 root 绑定低端口。

![Controller Deployment 结构](/云原生/k8s/p309-01.png)

**版本注意**：

- K8s 1.22 移除 `extensions/v1beta1` Ingress，Webhook 校验失败时需删除旧 ValidatingWebhookConfiguration 或升级 Controller；
- RBAC 使用 `rbac.authorization.k8s.io/v1`。

```bash
kubectl apply -f deploy.yaml
kubectl delete validatingwebhookconfiguration ingress-nginx-admission  # 证书异常时
kubectl get pods -n ingress-nginx -o wide
kubectl get svc -n ingress-nginx
```

![部署后 Pod 与 API 版本兼容](/云原生/k8s/p311-01.png)

### 6.3 创建 Ingress 并测试

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-test
spec:
  ingressClassName: nginx
  defaultBackend:
    service:
      name: service1
      port:
        number: 8008
  rules:
    - host: foo.bar.com
      http:
        paths:
          - path: /bar
            pathType: Prefix
            backend:
              service:
                name: service1
                port:
                  number: 8008
    - host: a.foo.com
      http:
        paths:
          - path: /foo
            pathType: Prefix
            backend:
              service:
                name: service2
                port:
                  number: 9008
```

```bash
# 本地 hosts
echo "192.168.49.2 foo.bar.com" >> /etc/hosts
echo "192.168.49.2 a.foo.com" >> /etc/hosts

# 通过 Controller Service 的 NodePort 访问（示例 32661）
curl http://foo.bar.com:32661/bar/
curl http://a.foo.com:32661/foo/
```

![Ingress 路由测试结果](/云原生/k8s/p316-01.png)

**Webhook 报错** `x509: certificate signed by unknown authority`：删除 `ingress-nginx-admission` ValidatingWebhookConfiguration 后重新 apply Ingress。

![ValidatingWebhook 排障](/云原生/k8s/p312-01.png)

---

## 七、Ingress 三种暴露模式

![三种部署/暴露模式对比](/云原生/k8s/p317-01.png)

### 7.1 模式一：NodePort Service

Deployment 部署 Controller + **type: NodePort** 的 Service。Ingress 暴露在 `NodeIP:随机高端口`，前面 often 再挂硬件/软件 LB。

- 适合 Node IP 固定的机房；
- 多一层 NAT，高并发下可能成为瓶颈。

### 7.2 模式二：DaemonSet + hostNetwork + nodeSelector（生产推荐）

- **DaemonSet**：每个（选定）Node 一个 Controller Pod；
- **hostNetwork: true**：Pod 直接监听 Node 的 80/443，无 NodePort NAT；
- **nodeSelector**：只在边缘节点运行，避免与业务 Pod 争资源；
- **dnsPolicy: ClusterFirstWithHostNet**：hostNetwork 下仍用集群 DNS 解析 Service。

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ingress-nginx
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      nodeSelector:
        ingress: "true"
      serviceAccountName: ingress-nginx
      containers:
        - name: controller
          image: registry.k8s.io/ingress-nginx/controller:v1.11.0
          ports:
            - containerPort: 80
            - containerPort: 443
```

打标签：

```bash
kubectl label node node02 ingress=true
```

**优点**：链路最短、性能最好；**缺点**：每 Node 最多一个实例，需多边缘 Node + 外部 LB 做 HA。

![hostNetwork 下 Pod 监听 Node 端口](/云原生/k8s/p327-01.png)

hostNetwork 下 Pod 可直接用 Node 公网 IP + 80/443 对外；多 Node 部署时在前面加 **LVS + Keepalived**。

![DaemonSet + hostNetwork 流量路径](/云原生/k8s/p327-02.png)

### 7.3 模式三：Deployment + LoadBalancer Service

公有云常用：Deployment + `type: LoadBalancer`，云厂商自动创建 ELB 并绑定公网 IP，DNS 指向 LB 即可。

---

## 八、生产高可用：LVS + Keepalived + 边缘节点

**边缘节点（Edge Node）**：集群内专门对外暴露服务的 Node；集群外流量经边缘 Node 进入。

边缘节点需解决：

1. **高可用**：无单点；
2. **统一入口**：对外单一 VIP/域名。

架构：**Keepalived VIP** + **LVS（DR 模式）** + 多个运行 ingress DaemonSet 的 edge Node。

- DNS A 记录指向 **VIP**；
- LVS 将 80/443 分发到各 Node 上的 ingress-nginx（hostNetwork）；
- DR 模式避免 LVS 成为性能瓶颈。

![LVS + Keepalived + Ingress 边缘节点](/云原生/k8s/p336-01.png)

Kubernetes 内 ingress 负责七层路由；集群外 LVS 负责四层分发与 HA——两层职责分离。

---

## 九、Ingress 工作原理与控制循环

![Ingress 请求完整路径](/云原生/k8s/p319-01.png)

1. **Ingress Controller** List-Watch apiserver 的 Ingress、Service、Endpoint；
2. 将规则编译为 Nginx（或其他）配置——**upstream 写 Pod IP:port**；
3. 写入 Controller Pod 内 `/etc/nginx/nginx.conf`（或 include 目录）；
4. **reload** 使配置生效。

**Ingress 资源** vs **Ingress Controller**：

- Ingress = 告诉 Controller「哪些域名/路径 → 哪个 Service」；
- Controller = 执行转发的程序 + 数据面。

新增服务时，**改 YAML apply Ingress 即可**，无需 SSH 改 Nginx——这就是 **声明式 API + 控制循环**。

### 9.1 动态域名配置原理

传统运维：每加一个域名就要改 `nginx.conf`。  
K8s 做法：把「域名 → Service」抽象为 **Ingress 对象**；Controller 监听变化，**自动生成** virtual host + upstream + location，再 reload。

![动态域名：Ingress 对象 → Nginx 配置](/云原生/k8s/p337-01.png)

流程：

```
新增 Ingress YAML
    → apiserver 持久化
    → Controller 感知
    → 渲染 nginx.conf（server_name / location / upstream Pod IP）
    → reload Nginx
```

![Ingress Controller 控制循环](/云原生/k8s/p337-02.png)

Ingress Controller **不是** kube-controller-manager 内置控制器，需**单独部署**的集群附件。

---

## 十、ingress-nginx 控制器内部逻辑（简述）

1. 监听 API Server 获取全部 Ingress；
2. 合并 Service Endpoints 生成 upstream；
3. 写入 nginx 配置并 `nginx -s reload`；
4. 支持通过 ConfigMap（`nginx-configuration`）全局调参，通过 Ingress annotations  per-Ingress 调参。

日志与排障：

```bash
kubectl logs -f -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
kubectl describe ingress ingress-test
```

---

## 十一、Gateway API：Ingress 的继任者

Ingress 用到深处会撞到两类天花板：**注解堆山**（rewrite、timeout、canary 全塞进 `annotations`，各家 Controller 方言不兼容）；**角色不分**（基础设施与应用团队改的是同一个对象）。官方为此推出了 **Gateway API**（[docs](https://kubernetes.io/docs/concepts/services-networking/gateway-api/)，2023 年发布 v1.0），核心思路是「**角色分离 + 标准化**」：

| 对象 | 谁维护 | 管什么 | 类比 Ingress 时代 |
|------|--------|--------|-------------------|
| **GatewayClass** | 平台/云厂商 | 某类网关的实现（如 Istio、Envoy Gateway） | IngressClass |
| **Gateway** | 基础设施团队 | 网关实例：监听端口、TLS、暴露 IP | Controller 的 Service 暴露 |
| **HTTPRoute / TCPRoute…** | **应用团队** | 路由规则：主机、路径、**权重、超时、重试、镜像**等一等公民字段 | Ingress + 一堆注解 |

```yaml
# 应用团队只写 Route，不碰网关基础设施
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: myapp-route
spec:
  parentRefs:
    - name: edge-gateway        # 绑定基础设施团队的 Gateway
  hostnames: ["api.example.com"]
  rules:
    - matches:
        - path: { type: PathPrefix, value: /v1 }
      backendRefs:
        - name: myapp-v1
          port: 80
          weight: 90            # ← 金丝雀权重是标准字段，不再是注解
        - name: myapp-v2
          port: 80
          weight: 10
```

对现有体系的定位建议：

- **Ingress 不会被移除**——存量稳定、够用就别动；
- 新项目/多团队共享网关、路由规则复杂（加权灰度、跨命名空间引用后端）时优先 Gateway API；
- [13 发布策略篇](/云原生/k8s/k8s-15-release-strategies)与 [17 Jenkins 灰度篇](/云原生/k8s/k8s-26-jenkins-canary)里基于注解的 canary，在 Gateway API 里被 `weight` 字段标准化替代——这也是 [14 Istio 篇](/云原生/k8s/k8s-30-service-mesh-istio)之外更轻量的七层灰度路径。

---

## 十二、小结

| 主题 | 要点 |
|------|------|
| Ingress vs Service | Service 四层；Ingress 七层 HTTP 路由 |
| 两组件 | Ingress 规则 + Ingress Controller 实现 |
| 部署 | Minikube addon / manifest / Helm |
| 暴露 | NodePort（简单）、**DaemonSet+hostNetwork**（自建生产）、LoadBalancer（公有云） |
| HA | 多边缘 Node + LVS DR + Keepalived VIP |
| 动态域名 | Controller watch Ingress → 生成 Nginx 配置 → reload |
| 版本 | K8s 1.22+ 需 ingress-nginx v1.x 与 networking.k8s.io/v1 |

> ➡️ 下一篇：[《Gateway API：七层入口的新标准与 Ingress 迁移》](/云原生/k8s/k8s-14-gateway-api)

---

## 延伸阅读

- [Ingress-NGINX 官方文档](https://kubernetes.github.io/ingress-nginx/)
- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
