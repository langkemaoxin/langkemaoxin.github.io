---
title: 安全容器运行时——Kata Containers 与 gVisor
sidebarGroup: Kubernetes
shortTitle: 23 沙箱运行时
order: 23
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: 容器共享内核的安全风险与两种沙箱方案：Kata（轻量 VM）与 gVisor（用户态内核），原理、部署与选型。
---

> **Kubernetes 系列 · 第 23/35 篇**  
> 上一篇：[《国产化 OS 与容器运行时——OpenEuler、麒麟、CRI-O 与 iSula》](/云原生/k8s/k8s-22-os-runtimes)  
> 下一篇：[《分布式存储方案——Longhorn 与 GlusterFS》](/云原生/k8s/k8s-24-storage-longhorn-glusterfs)

---

## 开头：容器逃逸，只差一个内核漏洞

常规容器（runc）虽然「看起来隔离」，但所有容器**共享同一个宿主机内核**：Namespace 只是视图隔离，Cgroups 只是资源限额，容器进程的系统调用最终都落在宿主机内核上。这意味着：

- 一旦内核或 runc 爆出漏洞（如曾经的 CVE-2019-5736），容器内进程就有机会**逃逸到宿主机**，夺取整个节点甚至集群的控制权；
- 同一节点上「不可信租户的代码」和「你的生产业务」跑在同一个内核上，攻击面巨大。

[第 05 篇](/云原生/k8s/k8s-05-pod-workload)讲过的 `securityContext`、第 16 篇的 Pod Security Standards，都是在**共享内核**这个前提下做「收缩权限」——它们降低被利用的概率，但不改变隔离的**强度等级**。如果业务真的要跑不可信代码（多租户 Serverless、在线代码执行、AI 代码沙箱），就需要换掉 runc，引入**安全容器运行时**。

本文讲两种主流方案：**Kata Containers**（每个 Pod 一台轻量虚拟机）与 **gVisor**（Google 出品的用户态内核沙箱），以及如何通过 RuntimeClass 在 K8s 里按 Pod 粒度启用。

---

## 一、为什么需要安全容器：runc 的风险模型

先看 runc 的隔离到底是怎么做的：

```text
┌─────────────────────────────── 宿主机 ───────────────────────────────┐
│                          宿主机 Linux 内核（共享）                     │
│      ┌──────── Namespace + Cgroups ────────┐                         │
│      │  容器 A          容器 B          容器 C  │                       │
│      │  (Nginx)        (MySQL)        (不可信代码) │                   │
│      └────────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

- **Namespace**（pid / net / mnt / uts / ipc / user）隔离的是「视图」——容器 A 看不到容器 B 的进程和网络；
- **Cgroups** 隔离的是「用量」——CPU、内存有上限；
- 但网络协议栈、文件系统驱动、系统调用入口等**内核核心代码全程共享**。

所以 runc 的安全模型是「**约定式隔离**」：它假设容器内代码不是恶意的。对运行不可信或潜在恶意代码的场景，官方结论非常直白——**容器不是沙箱（Containers are not a sandbox）**：共享内核带来效率与性能的同时，也意味着单个漏洞即可实现容器逃逸。

业界对此的解法分两个方向，共同点是都兼容 OCI 规范、都能以「低层运行时」的身份接入 containerd/CRI-O，对上层 K8s 透明：

| 方向 | 思路 | 代表 |
|------|------|------|
| 硬件虚拟化 | 每个 Pod 独立内核（轻量 VM），逃逸要再攻破硬件级虚拟化边界 | Kata Containers |
| 内核拦截 | 不换内核，但拦截并代答容器的系统调用，收缩攻击面 | gVisor |

![安全容器运行时对比](/云原生/k8s-ops/k8s-ops-11-安全容器运行时-kata/3b0303524297467b99e53be9e55802bb.png)

---

## 二、Kata Containers：每个 Pod 一台轻量虚拟机

### 2.1 原理：用 VM 的边界装容器的体验

Kata Containers 由 Intel 的 **Clear Containers** 和 Hyper.sh 的 **runV** 两个项目合并而来（现由 OpenStack 基金会托管）。思路是「传统虚拟化技术 + 裁剪的 Linux 内核」：

- 每个 Pod（sandbox）对应一台**轻量级虚拟机**，虚拟机里跑一个裁剪过的独立内核；
- 容器进程运行在这台「小 VM」内部，**不再从宿主机内核获取权限**——想逃逸，先得攻破硬件虚拟化层（Intel VT-x / AMD SVM 等）；
- 对外仍暴露标准 OCI 接口，因此从架构上看，kata 与 runc 是**平级的低层运行时**，可以当 docker/containerd 的「插件」替换使用。

配套组件包括 **Runtime**（kata-runtime）、**Agent**（VM 内的代理）、**Shim**（containerd-shim-kata-v2）等。

虚拟机监控器（Hypervisor）默认使用 **QEMU**，也可以换成更轻的 **Cloud Hypervisor** / Firecracker，以进一步压缩启动时间和内存开销；文件系统通过 virtio-fs 共享，网络走虚拟网卡。

> 💡 由于依赖硬件虚拟化，节点 CPU 必须支持并开启虚拟化（Intel VT-x、ARM Hyp mode、IBM Power/Z 等）。云主机和裸金属一般默认开启；但在 VMware Workstation 里嵌套跑 K8s 节点时，要注意**嵌套虚拟化**配置，否则 VM 起不来。

### 2.2 安装 Kata Containers（以 3.1.3 静态包为例）

在所有需要跑 Kata 的节点上执行：

```bash
# 下载官方静态包
wget https://github.com/kata-containers/kata-containers/releases/download/3.1.3/kata-static-3.1.3-x86_64.tar.xz

# 解压后得到 opt/kata 目录，移动到 /opt
tar xf kata-static-3.1.3-x86_64.tar.xz
mv opt/kata /opt

# 准备配置文件
mkdir /etc/kata-containers
cp /opt/kata/share/defaults/kata-containers/configuration.toml /etc/kata-containers/configuration.toml

# 将关键二进制软链到 PATH
ln -sf /opt/kata/bin/containerd-shim-kata-v2 /usr/local/bin/containerd-shim-kata-v2
ln -sf /opt/kata/bin/kata-runtime /usr/local/bin/kata-runtime
ln -sf /opt/kata/bin/kata-monitor /usr/local/bin/kata-monitor
```

检查当前主机是否具备运行条件：

```bash
# kata-runtime check --no-network-checks
System is capable of running Kata Containers
System can currently create Kata Containers
```

> ⚠️ 在 VMware 虚拟机里做实验时，check 可能报 `kernel property vhost_vsock not found`：VMware 自身的 vsock 模块与 Kata 冲突。解决方法是拉黑相关模块后重启：
>
> ```bash
> cat > /etc/modprobe.d/blacklist-vmware.conf << EOF
> blacklist vmw_vsock_virtio_transport_common
> blacklist vmw_vsock_vmci_transport
> EOF
> ```

### 2.3 接入 containerd

Kata 支持 CRI 接口，可与 containerd、CRI-O 集成（CRI 的位置参见[第 08 篇](/云原生/k8s/k8s-08-hpa-cri-crd)）。在 `/etc/containerd/config.toml` 中，仿照已有的 `runtimes.runc` 段落，新增一个 `runtimes.kata` 段：

```toml
[plugins."io.containerd.grpc.v1.cri".containerd]
  default_runtime_name = "runc"     # 默认运行时仍是 runc
  snapshotter = "overlayfs"

  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]

    # 原有的 runc 段保持不变
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
      runtime_type = "io.containerd.runc.v2"
      sandbox_mode = "podsandbox"

    # 新增 kata 段：整段复制 runc 的内容，只改 runtime_type
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata]
      runtime_type = "io.containerd.kata.v2"   # 由 runc 改为 kata
      sandbox_mode = "podsandbox"
```

重启 containerd 并用 ctr 验证（不进 K8s 就能对比两种运行时）：

```bash
systemctl daemon-reload
systemctl restart containerd

ctr image pull docker.io/library/busybox:latest
```

```bash
# 默认 runc：看到的是宿主机内核
# ctr run --rm -t docker.io/library/busybox:latest test-kata
/ # uname -r
5.4.213-1.el7.elrepo.x86_64

# 指定 kata：看到的是 Kata 自带的 guest 内核
# ctr run --runtime "io.containerd.kata.v2" --rm -t docker.io/library/busybox:latest test-kata
/ # uname -r
5.19.2
```

`uname -r` 输出从宿主机内核变成了 Kata 的 guest 内核（`/opt/kata/share/kata-containers/vmlinux-5.19.2-100`），说明容器确实跑在了一台独立 VM 里。用 `kata-runtime env` 还能看到 Hypervisor（QEMU 7.2.0）、virtio-fs 等完整环境信息。

### 2.4 部署 RuntimeClass 并跑负载

containerd 里配置的名字 `kata`，就是 RuntimeClass 的 handler 关键字：

```yaml
# runtime-kata.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata
```

```bash
# kubectl apply -f runtime-kata.yaml

# kubectl get runtimeclass
NAME   HANDLER   AGE
kata   kata      100m
```

创建使用 Kata 的 Pod：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: busybox
spec:
  runtimeClassName: kata    # 一行指定沙箱运行时
  containers:
  - name: busybox
    image: docker.io/library/busybox:latest
```

```bash
# kubectl exec busybox -- uname -r
5.19.2
```

Deployment 也一样，在 `spec.template.spec` 里加 `runtimeClassName: kata` 即可（完整示例见[第五节](#五在-kubernetes-里怎么用-runtimeclass)）。

---

## 三、gVisor：用户态内核沙箱

### 3.1 原理：Sentry + Gofer

![gVisor](/云原生/k8s-ops/k8s-ops-12-新型沙箱安全容器运行时-gvisor/logo.png)

**gVisor** 是 Google 开源的、用 **Go 语言实现的「应用程序内核」**：它在用户态实现了 Linux 系统调用面的大部分功能，并附带一个名为 `runsc` 的 OCI 运行时，在**应用程序与宿主机内核之间**插入一层隔离边界。

两个核心组件：

| 组件 | 角色 |
|------|------|
| **Sentry** | 用户态内核。容器进程的「内核」——拦截它的系统调用，在用户态解释执行，只把少量**受控的**调用转发给宿主机内核 |
| **Gofer** | 文件访问代理。代表容器访问宿主机文件系统，任何文件 I/O 都经过它过滤 |

与 Kata 「换一个真内核」不同，gVisor 不需要虚拟机，也不占用固定物理资源——Sentry/Gofer 本身就是宿主机上的**普通进程**，官方称之为「用 Linux 实现 Linux（implements Linux by way of Linux）」。容器进程期望的系统调用大多都能工作，但真正能触达宿主机内核的面被压缩到极小。

> ⚠️ gVisor 不是容器加固工具的替代品：它防的是「容器内代码攻击宿主机内核」，对于你主动挂进容器的数据、Secret（见[第 16 篇](/云原生/k8s/k8s-12-secret-configmap)），该做的权限收紧照样要做。

![gVisor 架构](/云原生/k8s-ops/k8s-ops-12-新型沙箱安全容器运行时-gvisor/gvisor-high-level-arch.png)

### 3.2 安装 runsc

在所有需要跑 gVisor 的节点上，从官方 release 下载 `runsc` 与配套 shim 并校验：

```bash
(
  set -e
  ARCH=$(uname -m)
  URL=https://storage.googleapis.com/gvisor/releases/release/latest/${ARCH}
  wget ${URL}/runsc ${URL}/runsc.sha512 \
    ${URL}/containerd-shim-runsc-v1 ${URL}/containerd-shim-runsc-v1.sha512
  sha512sum -c runsc.sha512 \
    -c containerd-shim-runsc-v1.sha512
  rm -f *.sha512
  chmod a+rx runsc containerd-shim-runsc-v1
  sudo mv runsc containerd-shim-runsc-v1 /usr/local/bin
)
```

```bash
# runsc --version
runsc version release-20230801.0
spec: 1.1.0-rc.1
```

### 3.3 接入 containerd 并验证

与 Kata 完全同构，在 `config.toml` 里再仿照 runc 加一段 `runtimes.runsc`：

```toml
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
  runtime_type = "io.containerd.runsc.v1"   # 由 runc 改为 runsc
  sandbox_mode = "podsandbox"
```

重启 containerd 后用 ctr 验证：

```bash
systemctl daemon-reload
systemctl restart containerd

ctr image pull docker.io/library/busybox:latest
```

```bash
# 默认 runc：宿主机内核
# ctr run --rm -t docker.io/library/busybox:latest test-runc
/ # uname -r
5.4.213-1.el7.elrepo.x86_64

# 指定 runsc：uname 报告的是 Sentry 伪造的内核版本
# ctr run --runtime "io.containerd.runsc.v1" --rm -t docker.io/library/busybox:latest test-runsc
/ # uname -r
4.4.0
```

`4.4.0` 是 Sentry 自己报告的「内核版本」，容器进程自认为运行在一台独立机器上，实际所有系统调用都被用户态内核接管了。

### 3.4 部署 RuntimeClass 并跑负载

```yaml
# runtime-runsc.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: runsc
handler: runsc
```

```bash
# kubectl apply -f runtime-runsc.yaml

# kubectl get runtimeclass
NAME   HANDLER   AGE
runsc  runsc     100m
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-runsc
spec:
  runtimeClassName: runsc
  containers:
  - image: nginx:latest
    name: nginx-runsc
```

```bash
# kubectl exec -it nginx-runsc -- /bin/sh
# uname -r
4.4.0
```

---

## 四、runc / Kata / gVisor 对比

| 维度 | runc | Kata Containers | gVisor |
|------|------|-----------------|--------|
| 隔离机制 | Namespace + Cgroups（共享内核） | 轻量虚拟机 + 独立 guest 内核 | 用户态内核拦截系统调用 |
| 隔离强度 | 弱，单内核漏洞即可逃逸 | 强，硬件虚拟化边界 | 强，宿主机内核攻击面极小 |
| 性能损耗 | 几乎为零 | 内存开销较大（每个 Pod 一台 VM），I/O 经 virtio 有损耗 | 系统调用密集型应用（fork、网络）损耗明显 |
| 启动速度 | 毫秒级 | 较慢（需拉起 VM，优化后亚秒级） | 快（无需 VM） |
| 硬件要求 | 无 | 需 CPU 支持虚拟化并开启 | 无 |
| 典型场景 | 内部可信业务 | 强隔离多租户、金融/政务合规 | Serverless、在线运行不可信代码、CI 代码沙箱 |

一句话选型：**默认 runc；要「接近虚拟机」的强隔离且能接受资源开销，选 Kata；要轻量、快速、大规模跑不可信短任务，选 gVisor。**

---

## 五、在 Kubernetes 里怎么用：RuntimeClass

无论 Kata 还是 gVisor，接入 K8s 的姿势完全一致，分三步：

1. **节点安装运行时**（kata-static 包 / runsc 二进制），配好 containerd 的 `runtimes.<name>` 段；
2. **创建 RuntimeClass**，`handler` 与 containerd 配置段同名；
3. **负载里声明** `spec.runtimeClassName`（Pod 或 PodTemplate 级别）。

Deployment 完整示例（同时给出 Service）：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deploy-nginx-kata
spec:
  replicas: 2
  selector:
    matchLabels:
      app: deploy-nginx-kata
  template:
    metadata:
      labels:
        app: deploy-nginx-kata
    spec:
      runtimeClassName: kata      # 换成 runsc 即切换到 gVisor
      containers:
      - name: nginxweb
        image: nginx:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
          name: http
          protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: deploy-nginx-kata
spec:
  selector:
    app: deploy-nginx-kata
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
```

RuntimeClass 还支持 `scheduling` 字段，把 workload 自动调度到**装了对应运行时的节点**（配合 nodeSelector/taints），避免 Pod 落到没有 kata/runsc 的节点上起不来。

两个补充用法：

- **untrusted_workload_runtime（旧方案）**：老版本可用 containerd 的 `untrusted_workload_runtime` 段 + Pod annotation `io.kubernetes.cri.untrusted-workload: "true"` 来标记不可信负载，效果与 RuntimeClass 等价，新集群一律推荐 RuntimeClass；
- **设为默认运行时**：把 containerd 的 `default_runtime_name`（default_runtime）指向 kata/runsc，则不声明 runtimeClassName 的负载也全部走沙箱——除非全租户不可信，否则不建议，性能代价太大。

> 💡 注意沙箱的粒度是 **Pod（sandbox）而不是单个容器**：同一个 Pod 里的容器共享同一个 VM（Kata）或同一个 Sentry（gVisor），需要互相隔离的代码请拆到不同 Pod。RuntimeClass 在 CRI 体系中的位置可回看[第 08 篇](/云原生/k8s/k8s-08-hpa-cri-crd)与[第 23 篇](/云原生/k8s/k8s-22-os-runtimes)。

---

## 小结

- runc 的 Namespace/Cgroups 是「约定式隔离」，共享内核意味着**一个漏洞就可能容器逃逸**——`securityContext`、PSS 收缩权限，但不提高隔离强度；
- **Kata Containers** 用轻量虚拟机（QEMU/Cloud Hypervisor）给每个 Pod 一个独立内核，隔离最接近 VM，代价是资源开销和硬件虚拟化要求；
- **gVisor** 用 Go 写的用户态内核（Sentry + Gofer）拦截系统调用，轻量、启动快，适合 Serverless 与不可信代码；
- 两者都兼容 OCI/CRI，在 containerd 里加一段 `runtimes.*` 配置，再建一个 **RuntimeClass**，负载写一行 `runtimeClassName` 即可按 Pod 粒度启用，与现有业务零冲突。

> ➡️ 下一篇：[《发布策略实战——蓝绿、金丝雀、滚动与 A/B 测试》](/云原生/k8s/k8s-15-release-strategies)
