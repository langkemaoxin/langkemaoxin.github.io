---
title: 国产化 OS 与容器运行时——OpenEuler、麒麟、CRI-O 与 iSula
sidebarGroup: Kubernetes
shortTitle: 22 国产 OS 与运行时
order: 22
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: 在 OpenEuler/麒麟等国产 OS 上部署 K8s 的坑与差异；Docker、containerd、CRI-O、iSula 四种容器运行时对比。
---

> **Kubernetes 系列 · 第 22/35 篇**  
> 上一篇：[《部署方法横向对比——二进制、RKE/RKE2、k0s、sealos 与 kubespray》](/云原生/k8s/k8s-21-deploy-methods)  
> 下一篇：[《安全容器运行时——Kata Containers 与 gVisor》](/云原生/k8s/k8s-23-sandbox-runtimes)

---

## 开头：主流教程在信创环境里"集体失灵"

信创/国产化改造推进后，越来越多的集群要求跑在 **openEuler（欧拉）**、**麒麟（Kylin）** 等国产 OS 上。照着主流 CentOS 教程走一遍，你会发现处处碰壁：

- `yum install docker-ce` 直接失败——国产 OS 的包仓库结构与 CentOS 不同，openEuler 自带的 `docker-engine` 是 **18.09 老版本**；
- K8s 软件包来源混乱——openEuler 用自家 EPOL 源里的 `kubernetes-*` 包（版本偏旧），麒麟则要手动配阿里云源；
- 运行时选择变多——除了 Docker，还有 **CRI-O**、华为的 **iSula**，socket 路径、cgroup 驱动、pause 镜像版本各不相同。

关于 CRI 接口本身，[第 8 篇](/云原生/k8s/k8s-08-hpa-cri-crd)已经讲过；kubeadm 标准部署流程见[第 21 篇](/云原生/k8s/k8s-20-deploy-kubeadm-ha)。本文聚焦：**四种容器运行时怎么选、两种国产 OS 上怎么装、以及国产化环境的差异坑清单**。

---

## 一、四种容器运行时对比

### 1.1 一张表看懂

| 运行时 | 来源 | CRI 兼容 | 性能/定位 | 适用场景 |
|--------|------|----------|-----------|----------|
| **Docker** | Docker 公司 | 1.24 起需 **cri-dockerd** 桥接 | 功能最全（build/网络/卷），组件多、偏重 | 需要 `docker build`、docker CLI 的存量环境 |
| **containerd** | CNCF（Docker 捐赠） | 原生支持 | 轻量稳定，工业界默认 | kubeadm 默认（`unix:///var/run/containerd/containerd.sock`） |
| **CRI-O** | Red Hat 主导、CNCF 托管 | **专为 K8s 而生**，只实现 CRI | 极简、启动快、无多余功能 | 纯 K8s 节点，OpenShift 默认 |
| **iSula** | 华为 openEuler | 原生支持（`isulad.sock`） | 轻量级、低开销，定制容器引擎 | openEuler 国产化环境 |

> 💡 K8s 1.24 移除 dockershim 后，Docker 方案必须额外部署 cri-dockerd 做 CRI 适配；而 containerd、CRI-O、iSula 都是"开箱即 CRI"。国产化选型时，**OS 与运行时的"亲缘关系"很重要**——openEuler 配 iSula 是华为官方路线，麒麟上则更多用 Docker/containerd。

### 1.2 各运行时安装要点（来自实际部署）

**Docker（CentOS/麒麟）**：

```bash
# 阿里云源安装 docker-ce
# wget https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -O /etc/yum.repos.d/docker-ce.repo
# yum -y install docker-ce

# 统一 cgroup 驱动为 systemd
# cat > /etc/docker/daemon.json << EOF
{
        "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF

# K8s 1.24+ 必须加装 cri-dockerd，并指定 pause 镜像
# vim /usr/lib/systemd/system/cri-docker.service
ExecStart=/usr/bin/cri-dockerd --pod-infra-container-image=registry.k8s.io/pause:3.9 --container-runtime-endpoint fd://
```

**containerd**：随 docker-ce 一同安装，socket 固定为 `unix:///var/run/containerd/containerd.sock`，kubeadm 默认自动识别，无需额外配置。

**CRI-O（CentOS 7）**：从 openSUSE kubic 仓库安装，仓库地址按 `OS` 和 `VERSION` 两个变量拼接：

```bash
# OS=CentOS_7
# VERSION=1.24
# curl -L -o /etc/yum.repos.d/devel:kubic:libcontainers:stable.repo \
  https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/$OS/devel:kubic:libcontainers:stable.repo
# curl -L -o /etc/yum.repos.d/devel:kubic:libcontainers:stable:cri-o:$VERSION.repo \
  https://download.opensuse.org/repositories/devel:kubic:libcontainers:stable:cri-o:$VERSION/$OS/devel:kubic:libcontainers:stable:cri-o:$VERSION.repo
# yum install cri-o
```

**iSula（openEuler）**：一条命令装好，注意 **包名 `iSulad` 区分大小写**：

```bash
# dnf install iSulad
```

> ⚠️ 三种原生 CRI 运行时的 socket 路径必须记牢，`kubeadm init/join` 都要用 `--cri-socket` 指定：
> - CRI-O：`unix:///var/run/crio/crio.sock`
> - iSula：`unix:///var/run/isulad.sock`
> - cri-dockerd：`unix:///var/run/cri-dockerd.sock`

---

## 二、OpenEuler + K8s 完整走查

本节以 openEuler 22.03 LTS SP1 为例完整走一遍（Docker 运行时），2.7 节给出 iSula 变体。麒麟的差异点集中在第三节。

![image-20230203144251072](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203144251072.png)

### 2.1 主机规划

| 需求 | CPU | 内存 | 硬盘 | 角色 | 主机名 |
| ---- | ---- | ---- | ---- | ------------ | ------------ |
| 值 | 4C | 4G | 1TB | master | k8s-master01 |
| 值 | 4C | 4G | 1TB | worker(node) | k8s-worker01 |
| 值 | 4C | 4G | 1TB | worker(node) | k8s-worker02 |

ISO 下载：`https://repo.openeuler.org/openEuler-22.03-LTS-SP1/ISO/x86_64/openEuler-22.03-LTS-SP1-x86_64-dvd.iso`

### 2.2 主机初始化（所有节点）

```bash
# 1、主机名
# hostnamectl set-hostname k8s-master01   # 其余节点改为 k8s-worker01/02

# 2、IP 地址（openEuler 仍是 network-scripts 风格）
# vim /etc/sysconfig/network-scripts/ifcfg-ens33
TYPE="Ethernet"
BOOTPROTO="none"
NAME="ens33"
DEVICE="ens33"
ONBOOT="yes"
IPADDR="192.168.10.160"    # master01；worker01 为 .161，worker02 为 .162
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"

# 3、hosts 解析（三台都要）
# cat /etc/hosts
192.168.10.160 k8s-master01
192.168.10.161 k8s-worker01
192.168.10.162 k8s-worker02

# 4、关闭防火墙与 SELinux
# systemctl disable --now firewalld
# sed -ri 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config

# 5、时间同步（最小化安装需先 dnf install ntpdate）
# crontab -l
0 */1 * * * /usr/sbin/ntpdate time1.aliyun.com
```

### 2.3 内核参数与 IPVS（所有节点）

```bash
# 内核路由转发写入主配置
# vim /etc/sysctl.conf
net.ipv4.ip_forward=1

# 网桥过滤单独放一个文件
# cat /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
vm.swappiness = 0

# 加载 br_netfilter 并生效
# modprobe br_netfilter
# lsmod | grep br_netfilter
# sysctl -p
# sysctl -p /etc/sysctl.d/k8s.conf

# 安装 ipset/ipvsadm 并配置开机自动加载模块
# yum -y install ipset ipvsadm
# cat > /etc/sysconfig/modules/ipvs.modules <<EOF
#!/bin/bash
modprobe -- ip_vs
modprobe -- ip_vs_rr
modprobe -- ip_vs_wrr
modprobe -- ip_vs_sh
modprobe -- nf_conntrack
EOF
# chmod 755 /etc/sysconfig/modules/ipvs.modules && bash /etc/sysconfig/modules/ipvs.modules && lsmod | grep -e ip_vs -e nf_conntrack

# 关闭 SWAP（注释 /etc/fstab 中 swap 行后重启，或临时 swapoff -a）
# swapoff -a
```

### 2.4 容器运行时安装（openEuler 特色）

openEuler **自带 docker-engine 包**，但版本很旧（18.09）：

```bash
# dnf install docker
# systemctl enable --now docker
# docker version
Client:
 Version:           18.09.0
 EulerVersion:      18.09.0.316
```

> ⚠️ 这个 18.09 版本默认 cgroup 驱动是 **cgroupfs**，`kubeadm init` 时会收到 WARNING：`detected "cgroupfs" as the Docker cgroup driver. The recommended driver is "systemd"`。生产环境建议按 2.5 节统一改成 systemd，或直接换 iSula/containerd。

### 2.5 K8s 软件安装（EPOL 源）

openEuler 的 K8s 包来自自家 EPOL 仓库，包名与社区版不同（`kubernetes-*` 前缀），版本为 1.20.2：

```bash
# 安装 k8s 依赖
# dnf install conntrack

# master 节点
# dnf install -y kubernetes-kubeadm kubernetes-kubelet kubernetes-master

# worker 节点
# dnf install -y kubernetes-kubeadm kubernetes-kubelet kubernetes-node

# 所有节点：只设自启，初始化后 kubelet 才会被拉起
# systemctl enable kubelet
```

### 2.6 集群初始化、加入与网络插件

```bash
# master 初始化，镜像走阿里云仓库
# kubeadm init --apiserver-advertise-address=192.168.10.160 \
  --image-repository registry.aliyuncs.com/google_containers \
  --kubernetes-version v1.20.2 \
  --service-cidr=10.1.0.0/16 \
  --pod-network-cidr=10.244.0.0/16

# kubectl 配置
# mkdir -p $HOME/.kube
# cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
# chown $(id -u):$(id -g) $HOME/.kube/config

# worker 节点加入（token 与 hash 来自 init 输出）
# kubeadm join 192.168.10.160:6443 --token jvx2bb.pfd31288qyqcfsn7 \
    --discovery-token-ca-cert-hash sha256:740fa71f6c5acf156195ce6989cb49b7a64fd061b8bf56e4b1b684cbedafbd40
```

Calico 网络插件（manifest 方式，注意把 `CALICO_IPV4POOL_CIDR` 改成 init 时的 Pod 网段）：

```bash
# wget https://docs.projectcalico.org/v3.19/manifests/calico.yaml
# vim calico.yaml
# 以下两行默认未开启，开启后将第二行改为 pod-network-cidr
- name: CALICO_IPV4POOL_CIDR
  value: "10.244.0.0/16"

# kubectl create -f calico.yaml
```

部署一个 nginx（2 副本 + NodePort 30001）验证：

```bash
# kubectl get nodes
NAME           STATUS   ROLES                  AGE     VERSION
k8s-master01   Ready    control-plane,master   3m59s   v1.20.2
k8s-worker01   Ready    <none>                 18s     v1.20.2
k8s-worker02   Ready    <none>                 10s     v1.20.2

# kubectl get svc
NAME                     TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE
nginx-service-nodeport   NodePort    10.1.236.15   <none>        80:30001/TCP   10s
```

![image-20230203153028826](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203153028826.png)

### 2.7 变体：openEuler + iSula 运行时

不想用旧版 Docker？openEuler 23.09 上可以全程用 iSula，主机初始化与 2.2/2.3 完全相同，差异只在运行时和 socket：

**安装并配置 iSulad**（`/etc/isulad/daemon.json` 关注这几个字段）：

```bash
# dnf install iSulad

# vim /etc/isulad/daemon.json 中的关键项
{
    "storage-driver": "overlay2",
    "registry-mirrors": ["docker.io","hub.oepkgs.net"],
    "pod-sandbox-image": "k8s.gcr.io/pause:3.2",   # 必须与集群 pause 版本一致
    "network-plugin": "cni",
    "cni-bin-dir": "/opt/cni/bin",
    "cni-conf-dir": "/etc/cni/net.d"
}

# systemctl restart isulad
# isula version    # 2.0.18
```

**让 crictl 认识 iSula**（需 `dnf install -y cri-tools`）：

```bash
# cat /etc/crictl.yaml
runtime-endpoint: unix:///var/run/isulad.sock
image-endpoint: unix:///var/run/isulad.sock
timeout: 10
debug: false
```

**初始化与加入都要显式指定 socket 和镜像仓库**：

```bash
# kubeadm init --kubernetes-version=v1.20.2 \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.10.140 \
  --cri-socket unix:///var/run/isulad.sock \
  --image-repository k8s.gcr.io

# worker 加入时同样要带 --cri-socket unix:///var/run/isulad.sock --image-repository k8s.gcr.io
```

Calico 用 operator 方式（v3.21）安装后，`kubectl get pods -n calico-system` 全部 Running 即成功。

![image-20231106105615481](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106105615481.png)

---

## 三、麒麟（Kylin）+ K8s 差异点

麒麟 V10 SP3 的主机初始化（主机名、IP、hosts、防火墙、SELinux、时间同步、网桥过滤、IPVS、关 SWAP）与第二节基本一致，不重复。差异集中在 **Docker 与 K8s 包的获取方式**：

### 3.1 Docker 走二进制安装

麒麟没有可用的 docker-ce 仓库，直接用官方静态二进制包：

```bash
# wget https://download.docker.com/linux/static/stable/x86_64/docker-20.10.9.tgz
# tar xf docker-20.10.9.tgz
# chmod +x docker/*
# cp docker/* /usr/bin/
```

手工编写 systemd 单元 `/usr/lib/systemd/system/docker.service`：

```ini
[Unit]
Description=Docker Application Container Engine
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/dockerd
Restart=on-failure
Delegate=yes
KillMode=process

[Install]
WantedBy=multi-user.target
```

```bash
# systemctl enable --now docker

# 统一 cgroup 驱动（daemon.json 需手工创建）
# cat /etc/docker/daemon.json
{
        "exec-opts": ["native.cgroupdriver=systemd"]
}
# systemctl restart docker
# groupadd docker
```

### 3.2 K8s 用阿里云 YUM 源，1.24+ 需 cri-dockerd

```bash
# cat > /etc/yum.repos.d/k8s.repo <<EOF
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=0
repo_gpgcheck=0
EOF

# 安装 1.23（dockershim 还在）或 1.26（需 cri-dockerd）
# yum -y install kubeadm-1.23.6-0 kubelet-1.23.6-0 kubectl-1.23.6-0
或
# yum -y install kubeadm-1.26.X-0 kubelet-1.26.X-0 kubectl-1.26.X-0

# kubelet cgroup 与 docker 保持一致
# vim /etc/sysconfig/kubelet
KUBELET_EXTRA_ARGS="--cgroup-driver=systemd"
# systemctl enable kubelet
```

![image-20220507120653090](/云原生/k8s-ops/k8s-ops-37-国产化麒麟操作系统部署k8s/image-20220507120653090.png)

![image-20220507120725815](/云原生/k8s-ops/k8s-ops-37-国产化麒麟操作系统部署k8s/image-20220507120725815.png)

![image-20230114132158342](/云原生/k8s-ops/k8s-ops-37-国产化麒麟操作系统部署k8s/image-20230114132158342.png)

![image-20230114132317457](/云原生/k8s-ops/k8s-ops-37-国产化麒麟操作系统部署k8s/image-20230114132317457.png)

### 3.3 初始化：不指定 cri-socket 会直接报错

```bash
# 1.23 版本，dockershim 原生支持
# kubeadm init --kubernetes-version=v1.23.6 --pod-network-cidr=10.224.0.0/16 --apiserver-advertise-address=192.168.10.160

# 1.26 版本，必须显式指定 cri-dockerd
# kubeadm init --kubernetes-version=v1.26.0 --pod-network-cidr=10.224.0.0/16 --apiserver-advertise-address=192.168.10.160 \
  --cri-socket unix:///var/run/cri-dockerd.sock
```

> ⚠️ 不加 `--cri-socket` 时，kubeadm 发现主机上同时存在多个 CRI endpoint 会直接报错：
> ```text
> Found multiple CRI endpoints on the host. Please define which one do you wish to use:
> unix:///var/run/containerd/containerd.sock, unix:///var/run/cri-dockerd.sock
> ```
> **worker 节点 join 时同样要带 `--cri-socket` 参数**，这是最容易漏的一步。

### 3.4 Calico operator 方式的两个细节

```bash
# kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.25.0/manifests/tigera-operator.yaml
# wget https://raw.githubusercontent.com/projectcalico/calico/v3.25.0/manifests/custom-resources.yaml
```

- `custom-resources.yaml` 第 13 行 `cidr` 必须改成 init 时的 `--pod-network-cidr`（本例 `10.224.0.0/16`）；
- node 一直起不来时，可给 Installation 加网卡自动发现：

```yaml
      nodeAddressAutodetectionV4:
        interface: ens.*
```

---

## 四、CRI-O 部署（CentOS 7 实测）

CRI-O 部署在 CentOS 7u9 上实测通过（1 master + 2 worker，8C/8-16G）。主机初始化同第二节，但 CentOS 7 多一步 **内核升级**，且运行时部分完全不同。

### 4.1 升级内核（CentOS 7 特有）

CentOS 7 默认 3.10 内核太老，先通过 elrepo 升级：

```bash
# rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
# yum -y install https://www.elrepo.org/elrepo-release-7.0-4.el7.elrepo.noarch.rpm
# yum --enablerepo="elrepo-kernel" -y install kernel-lt.x86_64   # lt 为长期维护版本
# grub2-set-default 0
# grub2-mkconfig -o /boot/grub2/grub.cfg
# reboot
# uname -r    # 验证已切换到新内核
```

### 4.2 安装 CRI-O 并修正 pause 镜像

仓库配置见 1.2 节，装好后 **必须检查 pause 镜像版本**——默认的 3.6 与 K8s 1.27 需要的 3.9 不一致：

```bash
# vim +455 /etc/crio/crio.conf
pause_image = "registry.k8s.io/pause:3.9"   # 原为 3.6，改为 3.9

# systemctl enable --now crio
# systemctl status crio
```

![CRI-O 徽标](/云原生/k8s-ops/k8s-ops-38-基于cri-o容器运行时部署k8s集群/crio-logo.svg)

### 4.3 初始化集群

```bash
# 预拉镜像并确认
# kubeadm config images pull --cri-socket unix:///var/run/crio/crio.sock
# crictl images

# 初始化（阿里云 K8s 源安装 kubeadm-1.27.X）
# kubeadm init --kubernetes-version=v1.27.4 --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.10.160 \
  --cri-socket unix:///var/run/crio/crio.sock

# worker 加入同样带 --cri-socket unix:///var/run/crio/crio.sock

# kubectl get nodes
NAME           STATUS   ROLES           AGE     VERSION
k8s-master01   Ready    control-plane   3m50s   v1.27.4
k8s-worker01   Ready    <none>          112s    v1.27.4
k8s-worker02   Ready    <none>          106s    v1.27.4
```

### 4.4 网络插件：先清空 CNI 配置目录

> ⚠️ CRI-O 安装时会在 `/etc/cni/net.d/` 生成默认 CNI 配置，与 Calico 冲突，装 Calico 前必须先移走：

```bash
# mv /etc/cni/net.d/* /home
# kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.25.1/manifests/tigera-operator.yaml
# kubectl create -f custom-resources.yaml    # cidr 改为 10.244.0.0/16
```

![image-20230404115348450](/云原生/k8s-ops/k8s-ops-38-基于cri-o容器运行时部署k8s集群/image-20230404115348450.png)

![image-20230404115500987](/云原生/k8s-ops/k8s-ops-38-基于cri-o容器运行时部署k8s集群/image-20230404115500987.png)

---

## 五、国产化常见坑清单

| # | 坑 | 表现 | 解法 |
|---|----|------|------|
| 1 | **K8s 包源不统一** | openEuler EPOL 源只有 `kubernetes-*` 1.20.2；麒麟/CentOS 需手动配阿里云源 | 按第 21 篇标准流程配源；openEuler 想上新版本时也改用阿里云源 |
| 2 | **Docker 版本参差** | openEuler `dnf install docker` 装到 18.09 老版本；麒麟无仓库只能二进制装 20.10.9 | 老版本能用但 cgroup 默认 cgroupfs；能换 containerd/iSula 就换 |
| 3 | **cgroup 驱动不一致** | kubelet 报 `detected "cgroupfs" as the Docker cgroup driver` | `daemon.json` 加 `native.cgroupdriver=systemd` + `KUBELET_EXTRA_ARGS="--cgroup-driver=systemd"`，两边必须一致 |
| 4 | **K8s 1.24+ 用 Docker** | kubelet 起不来，找不到 CRI | 部署 cri-dockerd，`init/join` 都带 `--cri-socket unix:///var/run/cri-dockerd.sock` |
| 5 | **多 CRI endpoint 冲突** | `Found multiple CRI endpoints on the host` 直接报错 | 任何多运行时环境，`kubeadm init` **和 join** 都显式指定 `--cri-socket` |
| 6 | **内核/内核参数** | CentOS 7 默认 3.10 内核过老 | elrepo 升级 `kernel-lt` 后 `grub2-set-default 0`；`ip_forward`、网桥过滤、`swappiness=0` 按第二节配置 |
| 7 | **pause 镜像版本不匹配** | Pod 沙箱起不来 | CRI-O 手动改 `pause_image=3.9`；iSulad 检查 `daemon.json` 的 `pod-sandbox-image`；cri-dockerd 检查 `ExecStart` 参数 |
| 8 | **Calico CIDR 不一致** | calico-node 起不来或跨节点不通 | manifest 的 `CALICO_IPV4POOL_CIDR` / operator 的 `cidr` 必须等于 `--pod-network-cidr`；麒麟上必要时加 `nodeAddressAutodetectionV4` |
| 9 | **CNI 残留配置** | CRI-O 自带的 `/etc/cni/net.d/` 默认配置与 Calico 打架 | 装 Calico 前 `mv /etc/cni/net.d/* /home` |
| 10 | **crictl 不认识 iSula** | `crictl` 连不上运行时 | `dnf install cri-tools` 后把 `/etc/crictl.yaml` 的 endpoint 指向 `unix:///var/run/isulad.sock` |

---

## 小结

- 国产化部署的难点不在 K8s 本身，而在 **OS 包生态**：openEuler 走 EPOL 源 + 自带 docker-engine/iSulad，麒麟走二进制 Docker + 阿里云 K8s 源，思路完全不同；
- 四种运行时各归其位：**存量与开发环境用 Docker（+cri-dockerd），默认标准是 containerd，纯 K8s 节点选 CRI-O，openEuler 国产化选 iSula**；
- 无论哪种组合，盯住三件事就不会翻车：**cgroup 驱动一致、`--cri-socket` 显式指定、pause 镜像与 Calico CIDR 版本对齐**。

> ➡️ 下一篇：[《集群日志收集——ELK 与 EFK》](/云原生/k8s/k8s-18-logging-elk-efk)
