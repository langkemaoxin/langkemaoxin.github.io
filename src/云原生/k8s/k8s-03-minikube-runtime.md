---
title: K8s 运行时实操——Minikube 安装、排障与 Helm
sidebarGroup: Kubernetes
shortTitle: 03 Minikube 实操
order: 3
date: 2026-08-27T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: Minikube 安装、镜像加速、Harbor/VirtualBox 排障、Dashboard 与 Helm 实操清单。
---

> **Kubernetes 系列 · 第 3/35 篇**  
> 上一篇：[《穿透 K8S 八大宏观架构——Master、Worker 与数据流》](/云原生/k8s/k8s-02-macro-architecture)  
> 下一篇：[《Kubernetes 基本概念与 kubectl——对象模型与常用命令》](/云原生/k8s/k8s-04-objects-kubectl)

---

## 开头：徒手搭集群太折磨，Minikube 把 K8s 搬进笔记本

K8s 主流部署方式有三类：**kubeadm**（快速搭单节点/集群）、**minikube**（本地学习与实验）、**二进制包**（逐组件安装，利于理解原理）。本文聚焦 **Minikube**：在单机虚拟机或 Docker 容器里跑完整 K8s，适合入门、CI 实验与本文后续所有 kubectl 练习。

下文保留**完整安装步骤、命令清单与国内镜像/Harbor/VirtualBox 排障**，便于按章节对照操作。

---

## 一、K8s 部署方式与 Minikube 是什么

| 方式 | 特点 |
|------|------|
| **kubeadm** | 官方工具，快速初始化控制平面与工作节点 |
| **minikube** | 本地单节点 K8s，资源占用小，插件丰富 |
| **二进制包** | 从官网下载各组件二进制逐安装，理解最深 |

**Minikube** 特点：

- 可执行文件约 **100MB**，运行镜像约 **1GB**，却集成 K8s 绝大多数能力。
- 插件：Dashboard、GPU、Ingress、Istio、Kong、Registry 等。
- 支持 **Windows / macOS / Linux**；按平台下载虚拟机镜像并在其中安装 K8s。

![Minikube 与部署方式](/云原生/k8s/p063-01.png)

徒手搭建 K8s 常卡在认证、证书与组件配置；Minikube 基于 Go 开发，**单机快速可用**，多数在线 K8s 实验环境也基于它。

---

## 二、Kubernetes 集群架构 vs Minikube 架构

### 2.1 常规 K8s 集群

![常规 K8s 集群架构](/云原生/k8s/p064-01.png)

完整集群至少 **Master + Node**：Master 协调调度，容器运行在 Node；**kubectl** 通常配置在能访问 APIServer 的客户端上。

### 2.2 Minikube 架构

![Minikube 架构](/云原生/k8s/p065-01.png)

Minikube 将 **Master 与 Worker 合并**到同一虚拟机/容器，宿主机用 **kubectl**（或 `minikube kubectl`）管理，更省资源。

![Minikube 架构细节](/云原生/k8s/p066-01.png)

支持能力包括：DNS、NodePort、ConfigMap/Secret、Dashboard、Docker/containerd/rkt 运行时、CNI、Ingress 等。

**使用方式**：`minikube` CLI 管理本地 K8s 环境（启动/停止/删除/状态）；集群就绪后，用 **kubectl** 操作集群——与 [宏观架构篇](/云原生/k8s/k8s-02-macro-architecture) 中的 APIServer 数据流一致。

---

## 三、安装前准备

推荐 **Linux（如 CentOS）** 作为宿主机。

### 3.1 主机最低配置

- CPU ≥ 2 核
- 内存 ≥ 2GB 可用（建议 4GB+）
- 磁盘 ≥ 20GB 可用
- 可访问互联网
- 容器或虚拟机管理器：Docker、VirtualBox、KVM、Hyper-V 等

### 3.2 Docker 安装与镜像加速

Docker 安装详见 [Docker 系列](/云原生/docker/docker-04-install)。国内建议配置 **`/etc/docker/daemon.json`** 镜像加速：

```bash
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://bjtzu1jb.mirror.aliyuncs.com",
    "http://f1361db2.m.daocloud.io",
    "https://hub-mirror.c.163.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://reg-mirror.qiniu.com",
    "https://dockerhub.azk8s.cn",
    "https://registry.docker-cn.com"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

**Docker 版本**：建议 ≥ **18.09.0**；存储驱动优先 **overlay2**（避免 devicemapper 性能问题）。

验证：

```bash
docker version
```

示例输出（Client/Server 20.10.x 即可）：

```text
Client: Docker Engine - Community
 Version:           20.10.23
 ...
Server: Docker Engine - Community
 Engine:
  Version:          20.10.23
 ...
```

### 3.3 关闭 swap、SELinux、firewalld

```bash
# 临时关闭 swap（永久关闭可注释 /etc/fstab 中 swap 行后 reboot）
swapoff -a

# 临时关闭 SELinux（永久：/etc/selinux/config → SELINUX=permissive）
setenforce 0

# 关闭防火墙
systemctl stop firewalld
systemctl disable firewalld
```

### 3.4 配置 hosts

与 kubeadm 类似，需主机名解析（示例主机名 `test1`）：

```bash
echo "127.0.0.1 test1" >> /etc/hosts
```

否则启动可能出现：

```text
[WARNING Hostname]: hostname "test1" could not be reached
[WARNING Hostname]: hostname "test1": lookup test1 on 172.18.3.4:53: no such host
```

### 3.5 阿里云容器镜像服务（可选）

注册阿里云账号，开通容器镜像服务，便于拉取与推送：

```bash
docker login --username=<你的账号> registry.cn-hangzhou.aliyuncs.com
docker tag [ImageId] registry.cn-hangzhou.aliyuncs.com/<命名空间>/<仓库>:[版本]
docker push registry.cn-hangzhou.aliyuncs.com/<命名空间>/<仓库>:[版本]
```

### 3.6 用户与 Docker 组

```bash
useradd minikube
groupadd docker
usermod -aG docker minikube
usermod -aG docker $USER
newgrp docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

本地实验若需 **minikube 用户具备 root 权限**，可选（**生产勿用**）：

```bash
# 方法三：/etc/passwd 中将 minikube 的 UID 改为 0（仅实验）
# 或方法二：/etc/sudoers 添加
# minikube   ALL=(ALL)     ALL
```

![用户与权限配置](/云原生/k8s/p070-01.png)

---

## 四、安装与启动 Minikube

官网：[minikube start](https://minikube.sigs.k8s.io/docs/start/)

**推荐版本（下文示例）**：

| 组件 | 版本 |
|------|------|
| minikube | v1.23.1 |
| Kubernetes | v1.23.1 |
| kube-prometheus | v0.11.0 |

### 4.1 安装 minikube 二进制

**阿里云镜像（推荐）：**

```bash
curl -Lo minikube https://kubernetes.oss-cn-hangzhou.aliyuncs.com/minikube/releases/v1.23.1/minikube-linux-amd64
chmod +x minikube
sudo mv minikube /usr/local/bin/
```

**官方源：**

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

浏览器下载慢时，可放到共享目录再复制：

```bash
cp /vagrant/minikube-linux-amd64 /usr/local/bin/minikube
chmod +x /usr/local/bin/minikube
```

### 4.2 启动 minikube

root 下 `--driver=docker` 可能报 **The "docker" driver should not be used with root privileges**。本地实验可强制：

```bash
minikube start --force --driver=docker
```

**国内推荐启动命令（综合镜像加速）：**

```bash
minikube start \
  --kubernetes-version=v1.23.1 \
  --image-mirror-country='cn' \
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' \
  --registry-mirror='https://bjtzu1jb.mirror.aliyuncs.com' \
  --force \
  --driver=docker \
  --cpus 4 \
  --memory 5120
```

![启动报错示例](/云原生/k8s/p072-01.png)

![镜像拉取失败](/云原生/k8s/p072-02.png)

### 4.3 minikube start 常用参数

| 参数 | 说明 |
|------|------|
| `--image-mirror-country cn` | 使用 `registry.cn-hangzhou.aliyuncs.com/google_containers` 等国内源 |
| `--iso-url=***` | 指定 minikube ISO 下载地址（阿里云 OSS） |
| `--cpus=2` | 分配 CPU 核数 |
| `--memory=2000mb` | 分配内存 |
| `--kubernetes-version=v1.23.1` | K8s 版本 |
| `--vm-driver=docker` | Docker 驱动（也可 virtualbox、kvm2、hyperv、none） |
| `--docker-env http_proxy` | 传递代理 |

非 root 用户若配置在 `/root/.kube`，需迁移：

```bash
sudo mv /root/.kube /root/.minikube $HOME
sudo chown -R $USER $HOME/.kube $HOME/.minikube
```

或设置 `CHANGE_MINIKUBE_NONE_USER=true`。

**Hyper-V 示例（Windows）：**

```powershell
minikube.exe start --image-mirror-country cn `
  --iso-url=https://kubernetes.oss-cn-hangzhou.aliyuncs.com/minikube/iso/minikube-v1.5.0.iso `
  --registry-mirror=https://xxxxxx.mirror.aliyuncs.com `
  --vm-driver="hyperv" `
  --hyperv-virtual-switch="MinikubeSwitch" `
  --memory=4096
```

**none 驱动（Linux 裸机，组件直接装宿主机）：**

```bash
sudo minikube start --vm-driver=none \
  --docker-env http_proxy=http://10.0.2.15:8118 \
  --docker-env https_proxy=https://10.0.2.15:8118
```

---

## 五、排障实录：镜像、网络与依赖

### Q1：拉取镜像缓慢

进入 minikube 内部改 Docker 镜像源：

```bash
minikube logs
minikube ssh
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{"registry-mirrors": ["http://hub-mirror.c.163.com"]}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
minikube delete --all
# 重新 start，并指定 kubernetes 版本与国内 image-repository
sudo minikube start --kubernetes-version=v1.23.1 \
  --image-mirror-country='cn' \
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers'
```

### Q2：基础镜像 kicbase 拉不下来 / SHA 校验失败

手动拉取、打 tag，并用 `--base-image` 跳过 SHA 校验：

```bash
docker pull registry.aliyuncs.com/google_containers/kicbase:v0.0.27
docker tag registry.aliyuncs.com/google_containers/kicbase:v0.0.27 \
  registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.27
docker rmi registry.aliyuncs.com/google_containers/kicbase:v0.0.27

minikube start \
  --kubernetes-version=v1.23.1 \
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' \
  --registry-mirror='https://bjtzu1jb.mirror.aliyuncs.com' \
  --image-mirror-country='cn' \
  --force --driver=docker \
  --extra-config=kubelet.cgroup-driver=systemd \
  --base-image="registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.27"
```

| 参数 | 说明 |
|------|------|
| `--base-image` | 指定基础镜像，可忽略 SHA 校验 |

![kicbase 镜像问题](/云原生/k8s/p081-01.png)

### Q3：coredns 镜像找不到

```bash
docker pull coredns/coredns:1.8.4
docker tag coredns/coredns:1.8.4 \
  registry.cn-hangzhou.aliyuncs.com/google_containers/coredns/coredns:v1.8.4
docker rmi coredns/coredns:1.8.4
# 若路径不一致，按 describe 中 Image 字段调整 tag
```

### Q4：批量预拉控制平面镜像

```bash
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/etcd:3.5.1-0
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver:v1.23.1
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-controller-manager:v1.23.1
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:v1.23.1
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kube-proxy:v1.23.1
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.5
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/coredns/coredns:v1.8.4
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/k8s-minikube/storage-provisioner:v5
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetesui/dashboard:v2.3.1
docker pull registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetesui/metrics-scraper:v1.0.7
```

![批量镜像](/云原生/k8s/p082-01.png)

### Q5：k8s.gcr.io 国内不可达——阿里云代理三步法

国内无法直接 `docker pull k8s.gcr.io/...` 时：

1. 从**国内代理仓库**拉取（如 `registry.aliyuncs.com/google_containers/...`）。
2. **docker tag** 成 `k8s.gcr.io/...` 所需名称。
3. **docker rmi** 代理仓库 tag；确保 Pod **`imagePullPolicy: IfNotPresent`**，或推送到 Harbor 私仓。

示例（coredns 1.6.5）：

```bash
# 失败示例
docker pull k8s.gcr.io/coredns:1.6.5

# 从阿里云代理拉取
docker pull registry.aliyuncs.com/google_containers/coredns:1.6.5

# 打 tag
docker tag registry.aliyuncs.com/google_containers/coredns:1.6.5 k8s.gcr.io/coredns:1.6.5

# 删除代理 tag
docker rmi registry.aliyuncs.com/google_containers/coredns:1.6.5

docker images
# 应只剩 k8s.gcr.io/coredns:1.6.5
```

Deployment YAML 中建议：

```yaml
image: k8s.gcr.io/coredns:1.6.5
imagePullPolicy: IfNotPresent
```

---

## 六、VirtualBox 与 none 驱动排障

### Q1：嵌套虚拟化

VirtualBox 默认未启用 **Nested VT-x/AMD-V**。在 Windows PowerShell 中：

```powershell
cd 'C:\Program Files\Oracle\VirtualBox\'
.\VBoxManage.exe list vms
.\VBoxManage.exe modifyvm "cdh1" --nested-hw-virt on
```

启用后 VirtualBox 设置 → 系统 → 处理器 → 「启用嵌套 VT-x/AMD-V」应已勾选。

![嵌套虚拟化](/云原生/k8s/p086-01.png)

### Q2：conntrack 依赖（none 驱动）

```bash
yum install conntrack -y
minikube start --registry-mirror="https://na8xypxe.mirror.aliyuncs.com" --driver=none
```

`--driver=none`：root 直接跑、无 VM 隔离，**仅适合学习**；无法 `--cpus`/`--memory` 限制资源。详见 [none driver 文档](https://minikube.sigs.k8s.io/docs/reference/drivers/none/)。

### Q3：bridge-nf-call-iptables

```bash
echo '1' > /proc/sys/net/bridge/bridge-nf-call-iptables
# 永久：/etc/sysctl.d/k8s.conf
```

### Q4：安装 kubectl / kubelet

```bash
# /etc/yum.repos.d/kubernetes.repo
cat <<'EOF' | sudo tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg
       https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

yum makecache
yum install -y kubelet-1.23.1 kubectl-1.23.1 kubeadm-1.23.1
systemctl enable kubelet
kubectl version
```

### Q5：内核 / cgroups（CONFIG_CGROUP_PIDS）

报错 `missing required cgroups: pids` 时，需内核支持 **CONFIG_CGROUP_PIDS**，可升级内核（elrepo）：

```bash
rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
rpm -Uvh http://www.elrepo.org/elrepo-release-7.0-2.elrepo.noarch.rpm
yum --enablerepo=elrepo-kernel install kernel-ml -y
# 编辑 /etc/default/grub → GRUB_DEFAULT=0
grub2-mkconfig -o /boot/grub2/grub.cfg
reboot
uname -sr
```

![内核升级](/云原生/k8s/p087-01.png)

---

## 七、启动成功：Dashboard 与 kubectl

```bash
minikube addons enable dashboard
minikube addons enable metrics-server
minikube dashboard
```

Dashboard 默认绑定 `127.0.0.1`，从 Windows 宿主机访问可：

- **SSH 端口转发** 或 **Nginx/OpenResty 反向代理**
- `minikube service` / `kubectl port-forward`

```bash
kubectl get pods -A
alias kubectl="minikube kubectl --"
kubectl get nodes
```

![Dashboard Pod 列表](/云原生/k8s/p093-01.png)

![Dashboard 访问](/云原生/k8s/p093-02.png)

### minikube 重建

```bash
minikube delete
minikube start --driver=docker
```

---

## 八、docker-compose 转 K8s 示例

`docker-compose.yaml`：

```yaml
version: "3.0"
services:
  swagger-ui:
    image: swaggerapi/swagger-ui
    container_name: swagger_ui_container
    ports:
      - "9092:8080"
    volumes:
      - ../docs/openapi:/usr/share/nginx/html/doc
    environment:
      API_URL: ./doc/api.yaml
```

等价 **Deployment + Service + ConfigMap**（节选）：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    io.minikube.service: swagger-ui
  name: swagger-ui
spec:
  replicas: 1
  selector:
    matchLabels:
      io.minikube.service: swagger-ui
  template:
    metadata:
      labels:
        io.minikube.service: swagger-ui
    spec:
      containers:
        - env:
            - name: SWAGGER_JSON
              value: /openapi/api.yaml
          image: swaggerapi/swagger-ui
          name: swagger-ui
          ports:
            - containerPort: 8080
          imagePullPolicy: IfNotPresent
          volumeMounts:
            - mountPath: /openapi
              name: swagger-ui-cm
      volumes:
        - name: swagger-ui-cm
          configMap:
            name: swagger-ui-cm
---
apiVersion: v1
kind: Service
metadata:
  name: swagger-ui
  labels:
    io.minikube.service: swagger-ui
spec:
  ports:
    - port: 8080
      protocol: TCP
      targetPort: 8080
  selector:
    io.minikube.service: swagger-ui
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: swagger-ui-cm
data:
  api.yaml: |
    openapi: 3.0.0
    info:
      version: "1.0"
    ...
```

---

## 九、Minikube 网络与镜像常见问题

### 9.1 外部访问 / NodePort

minikube 底层可能是 docker-machine，**NodePort 从 host 未必直达**，常用：

```bash
minikube ip
# 192.168.49.2

minikube service hello-minikube --url
# http://192.168.49.2:30660

kubectl port-forward --address=0.0.0.0 service/hello-minikube 7080:8080
```

### 9.2 镜像与 imagePullPolicy

minikube **内部 Docker 与 host 隔离**；host 的 `daemon.json` 与 `docker images` 对集群内不可见。做法：

```bash
docker pull <image>
minikube image load <image>
```

**imagePullPolicy 默认规则**：

| 条件 | 默认策略 |
|------|----------|
| tag 为 `:latest` 或未指定 tag | `Always` |
| 指定非 latest 的 tag | `IfNotPresent` |

建议显式写 **`imagePullPolicy: IfNotPresent`**。

### 9.3 常用 kubectl 命令（Minikube 环境）

```bash
kubectl get pods -A
kubectl describe node
kubectl describe node <nodename> | grep Taints
kubectl -n <ns> logs -f --tail 200 <pod>
kubectl exec -it -n <ns> <pod> -- sh
kubectl get services,pods -o wide
kubectl describe pod <pod> -n <ns>
kubectl delete deployment <name> -n <ns>
```

### 9.4 ImagePullBackOff 示例：storage-provisioner

```bash
kubectl get pods -A
kubectl describe pod storage-provisioner -n kube-system
```

若 `imagePullPolicy: IfNotPresent`，可先在 host 拉取并 tag 为 manifest 中的镜像名，再 `minikube image load` 或在本机 docker 中准备好镜像后重启 Pod。

---

## 十、Harbor 私仓与 Minikube

### 10.1 启动时指定 insecure registry

若集群已创建，先 **`minikube delete`** 再：

```bash
minikube start \
  --kubernetes-version=v1.23.1 \
  --image-mirror-country='cn' \
  --force --driver=docker \
  --registry-mirror=https://harbor.example.com \
  --insecure-registry=192.168.56.121:85 \
  --cpus 4 --memory 5120
```

验证：

```bash
minikube ssh
curl http://192.168.56.121:85/v2/_catalog
```

![Harbor 验证](/云原生/k8s/p101-01.png)

### 10.2 证书与 scp

Harbor HTTPS 需在 minikube 内配置 Docker 证书目录：

```text
/etc/docker/certs.d/<registry-hostname>/
  ├── ca.crt
  ├── client.cert
  └── client.key
```

操作示例：

```bash
minikube ssh
sudo passwd docker   # 设置 docker 用户密码便于 scp

# 从宿主机复制证书
scp -r /etc/docker/certs.d docker@$(minikube ip):/etc/docker/

# 或从 Harbor 服务器复制
scp -r root@192.168.56.121:/etc/docker/certs.d /etc/docker/
```

`/etc/hosts` 增加解析：

```bash
echo "192.168.56.121  harbor.daemon.io" >> /etc/hosts
```

在 minikube 内测试：

```bash
docker pull harbor.daemon.io/demo/nginx:latest
docker pull 192.168.56.121:85/demo/nginx:latest
```

证书域名不匹配时报 `x509: certificate is valid for ...`——需使用与证书 CN/SAN 一致的域名，或导入正确 CA。

### 10.3 方法二：minikube ssh 内改 daemon.json

```bash
minikube ssh
sudo su
cat <<'EOF' >> /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://bjtzu1jb.mirror.aliyuncs.com",
    "http://192.168.56.121:85"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
docker pull test/springboot:1.0.0
```

![Harbor daemon 配置](/云原生/k8s/p101-02.png)

---

## 十一、Minikube 常用命令

### 基本命令

| 命令 | 说明 |
|------|------|
| `minikube start` | 启动集群 |
| `minikube status` | 状态 |
| `minikube stop` | 停止 |
| `minikube delete` | 删除 |
| `minikube pause` / `unpause` | 暂停 / 恢复 |

### 镜像与环境

| 命令 | 说明 |
|------|------|
| `minikube docker-env` | 使用 minikube 内 Docker |
| `minikube cache add\|list\|reload` | 镜像缓存 |
| `minikube image load <image>` | 导入本地镜像 |

### 网络与调试

| 命令 | 说明 |
|------|------|
| `minikube service <svc> --url` | 服务 URL |
| `minikube tunnel` | LoadBalancer 隧道 |
| `minikube ssh` | 进入 minikube 节点 |
| `minikube kubectl -- <args>` | 集群匹配版本的 kubectl |
| `minikube ip` / `minikube logs` | IP / 日志 |

### 推荐完整启动清单（含 Harbor + Dashboard）

```bash
minikube delete

minikube start \
  --kubernetes-version=v1.23.1 \
  --force --driver=docker \
  --cpus 4 --memory 5120

kubectl get pods -A

minikube ssh
# ... 配置 daemon.json、certs.d、hosts ...
exit

minikube addons enable dashboard
minikube addons enable metrics-server
minikube dashboard
```

---

## 十二、Helm 原理、安装与使用

Helm 是 K8s 的**包管理器**（类似 yum/apt）：管理 **Chart**（一组 YAML 模板），一条 `install` 可部署 Deployment + Service + Ingress 等组合。

| 术语 | 说明 |
|------|------|
| **Helm** | CLI 客户端 |
| **Chart** | 打包的 K8s 资源模板（tar） |
| **Release** | `helm install` 后在集群中的 Chart 实例 |
| **Repository** | Chart 仓库 |

Helm 3 **无 Tiller**，客户端直接通过 K8s API 安装 Release。

### 安装 Helm 3

```bash
wget https://get.helm.sh/helm-v3.6.3-linux-amd64.tar.gz
tar -zxvf helm-v3.6.3-linux-amd64.tar.gz
cp linux-amd64/helm /usr/bin/
helm version
```

### 添加 Chart 源

```bash
helm repo add apphub https://apphub.aliyuncs.com
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add azure http://mirror.azure.cn/kubernetes/charts/
helm repo update
helm repo list
```

### 搜索、安装、卸载

```bash
helm search repo nginx
helm search repo mysql

helm install nginx bitnami/nginx
kubectl get svc -n default

helm list
helm uninstall nginx
```

创建空 Chart：

```bash
helm create test
```

![Helm 工作流](/云原生/k8s/p103-01.png)

---

## 小结

- **Minikube** 适合本地单节点 K8s；Master/Worker 合一，省资源。
- 国内环境重点：**镜像加速**、`image-repository`、`--base-image`、预拉 tag、Harbor 证书。
- **none / VirtualBox** 各有依赖：conntrack、bridge-nf、嵌套 VT-x、内核 cgroups。
- 集群就绪后：**Dashboard**、`kubectl` alias、**Helm** 装应用；下一篇系统讲 **对象模型与 kubectl**。

---

## 附录：minikube start 命令清单（排障参考）

以下命令来自多次安装试错，可按环境删减参数；**推荐以「国内 image-repository + docker driver + 指定 k8s 版本」为主**：

```bash
minikube start --force --driver=docker
minikube start --force --driver=docker --image-mirror-country cn \
  --iso-url=https://kubernetes.oss-cn-hangzhou.aliyuncs.com/minikube/iso/minikube-v1.5.0.iso \
  --registry-mirror=https://xxxxxx.mirror.aliyuncs.com

minikube start --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers \
  --registry-mirror=https://ovfftd6p.mirror.aliyuncs.com \
  --image-mirror-country='cn' --force --driver=docker

minikube start --kubernetes-version=v1.23.1 \
  --image-mirror-country='cn' \
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' \
  --registry-mirror='https://ovfftd6p.mirror.aliyuncs.com' \
  --force --driver=docker

minikube start --kubernetes-version=v1.23.1 \
  --image-mirror-country='cn' \
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' \
  --force --driver=docker --cpus 4 --memory 5120 \
  --feature-gates=EphemeralContainers=true

minikube delete
minikube start --driver=docker
```
