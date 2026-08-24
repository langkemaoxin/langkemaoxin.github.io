---
title: 生产集群部署——kubeadm 从零到高可用
sidebarGroup: Kubernetes
shortTitle: 20 kubeadm 高可用
order: 20
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: kubeadm 部署生产级 K8s 集群：单 master 快速起、多 master 高可用、kube-vip 控制面 VIP，附 OS/版本变体速查。
---

> **Kubernetes 系列 · 第 20/35 篇**  
> 上一篇：[《容器内 JVM 参数解析与生产优化》](/云原生/k8s/k8s-19-jvm-in-container)  
> 下一篇：[《部署方法横向对比——二进制、RKE/RKE2、k0s、sealos 与 kubespray》](/云原生/k8s/k8s-21-deploy-methods)

在[第 03 篇](/云原生/k8s/k8s-03-minikube-runtime)里，我们用 minikube 在单主机上拉起了一套集群，用来学习 Pod、Service、容器运行时这些概念绰绰有余。但 minikube 本质是"学习机"：单节点、控制面和工作负载挤在一起、master 挂了集群就没了——它回答不了生产环境的两个基本问题：**多节点怎么装、控制面怎么不停机**。本文就用 kubeadm 把这两个问题一次讲透：先单 master 快速起一套 1.29 集群走通全流程，再扩展到多 master 高可用（HAProxy/Keepalived 与 kube-vip 两种 VIP 方案），最后附一张 OS/版本变体速查表，覆盖课程笔记里做过的十来套不同组合。

## 一、部署方式总览

### 1.1 本地化部署

**kubeadm**

![image-20220324204203839](/云原生/k8s-ops/k8s-ops-31-kubernetes集群部署方式说明/image-20220324204203839.png)

- kubeadm 是一个工具，旨在提供创建 Kubernetes 集群 `kubeadm init` 和 `kubeadm join` 的最佳实践"快速路径"。
- kubeadm 执行必要的操作以启动并运行**最小的可行集群**。
- 按照设计，它**只关心引导，而不关心配置机器**；安装 Kubernetes 仪表盘、监控方案等插件不在其范围内。
- 理想情况下，更高级别的部署工具（如 kubekey、RKE）都以 kubeadm 作为基础，在其之上构建符合要求的集群。
- 用法参考：<https://kubernetes.io/docs/reference/setup-tools/kubeadm/>

**minikube**

- 适合部署本地 Kubernetes 集群，主要用于**测试目的**。
- 可以快速在单主机上部署 Kubernetes 集群，跨平台（Linux、macOS、Windows）。

**二进制部署方式**

- 纯"人肉"方式部署，企业生产级别的部署方式之一。
- 部署时间长，需要自行配置：证书、服务配置文件、systemd 服务管理文件、kubeconfig。

**国内第三方部署工具**

- **rke**：快速的、多功能的集群部署工具，仅通过一个配置文件即可完成部署，方便添加任意数量的节点。
- **kubekey**：

  <img src="/云原生/k8s-ops/k8s-ops-31-kubernetes集群部署方式说明/image-20220324205307087.png" alt="image-20220324205307087" style="zoom:50%;" />

  KubeSphere 基于 Go 语言开发的集群安装工具，可单独或整体安装 Kubernetes 和 KubeSphere，底层使用 kubeadm 在多个节点上并行安装。内置高可用模式，支持一键安装高可用集群，也可作为离线安装解决方案。三种安装场景：仅安装 Kubernetes、一键安装 Kubernetes + KubeSphere、在已有集群上用 ks-installer 部署 KubeSphere。
- **kubeasz**：

  ![image-20220324205820518](/云原生/k8s-ops/k8s-ops-31-kubernetes集群部署方式说明/image-20220324205820518.png)

  基于二进制方式部署并利用 ansible-playbook 实现自动化，既提供一键安装脚本，也可分步执行。集群特性：TLS 双向认证、RBAC 授权、多 Master 高可用、支持 Network Policy、备份恢复、离线安装。项目地址：<https://github.com/easzlab/kubeasz>

### 1.2 公有云平台部署

公有云厂商直接提供托管容器服务：阿里云 ACK、华为云 CCE、腾讯云 EKS。

![image-20220324210529285](/云原生/k8s-ops/k8s-ops-31-kubernetes集群部署方式说明/image-20220324210529285.png)

![image-20220324210634327](/云原生/k8s-ops/k8s-ops-31-kubernetes集群部署方式说明/image-20220324210634327.png)

![image-20220324210727688](/云原生/k8s-ops/k8s-ops-31-kubernetes集群部署方式说明/image-20220324210727688.png)

当然，上述本地化工具（kubeadm、minikube、二进制、rke、kubekey、kubeasz）也都可以在公有云主机上使用。

### 1.3 选型表

| 方式 | 适用场景 | 上手难度 | 可控性 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| minikube | 本地学习、验证 | 极低 | 低 | 单主机，不能用于生产 |
| kubeadm | 标准/生产集群 | 中 | 高 | 官方"快速路径"，本文主线 |
| 二进制部署 | 深度定制、理解原理 | 极高 | 极高 | 证书、systemd、kubeconfig 全手工 |
| rke / kubekey / kubeasz | 自动化批量部署 | 中 | 中 | 在 kubeadm/二进制之上封装 |
| 公有云托管（ACK/CCE/EKS） | 云上业务 | 低 | 低 | 控制面由云厂商托管 |

> 💡 本文聚焦 kubeadm：它是官方推荐路径，也是 kubekey 等工具的底层实现——学会了 kubeadm，其它工具的排障也就有了抓手。各部署方法的深度对比见[下一篇](/云原生/k8s/k8s-21-deploy-methods)。

## 二、kubeadm 单 master 部署全流程

本节以 **CentOS 7.9 + Kubernetes 1.29.0 + Docker + cri-dockerd** 为主线完整走查一遍（对应课程实操环境），Rocky Linux 9.2 + 1.28 的差异在过程中以对照形式补充，其它 OS/版本组合见第四节速查表。

### 2.1 节点规划

| 需求 | CPU | 内存 | 硬盘 | 角色 | 主机名 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| 值 | 8C | 8G | 1024GB | master | k8s-master01 |
| 值 | 8C | 16G | 1024GB | worker(node) | k8s-worker01 |
| 值 | 8C | 16G | 1024GB | worker(node) | k8s-worker02 |

主机 IP：`192.168.10.160/161/162`，网关 `192.168.10.2`。

### 2.2 主机初始化（所有节点）

**主机名与 hosts 解析**

```bash
# 每台分别执行
# hostnamectl set-hostname k8s-master01
# hostnamectl set-hostname k8s-worker01
# hostnamectl set-hostname k8s-worker02
```

```bash
# 所有节点配置主机名与 IP 解析
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost6 localhost6.localdomain6
192.168.10.160 k8s-master01
192.168.10.161 k8s-worker01
192.168.10.162 k8s-worker02
```

> 💡 对照（Rocky Linux 9.x）：IP 不再走 `ifcfg-ens33`，而是 NetworkManager 的 keyfile——`vim /etc/NetworkManager/system-connections/ens33.nmconnection` 中配置 `address1=192.168.10.16x/24,192.168.10.2`、`dns=119.29.29.29;8.8.8.8`、`method=manual`，然后 `nmcli c reload && nmcli c up ens33` 生效。

**IP 地址配置（CentOS 7）**

```bash
# vim /etc/sysconfig/network-scripts/ifcfg-ens33
# 以 k8s-master01 为例，其余节点改 IPADDR 即可
TYPE="Ethernet"
PROXY_METHOD="none"
BROWSER_ONLY="no"
BOOTPROTO="none"
DEFROUTE="yes"
......
NAME="ens33"
DEVICE="ens33"
ONBOOT="yes"
IPADDR="192.168.10.160"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"
```

**关闭防火墙与 SELinux**

```bash
# 关闭 firewalld
# systemctl disable --now firewalld
# firewall-cmd --state
not running

# 关闭 SELinux（需重启生效）
# sed -ri 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
# sestatus
```

**时间同步**

```bash
# CentOS 7：crontab 定时 ntpdate
# crontab -l
0 */1 * * * /usr/sbin/ntpdate time1.aliyun.com
```

```bash
# 对照（Rocky 9.x）：直接用 chrony
# dnf install chrony curl wget
# systemctl status chronyd
```

**升级操作系统内核（CentOS 7 建议）**

```bash
# 导入 elrepo gpg key 并安装 elrepo YUM 源仓库
# rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
# yum -y install https://www.elrepo.org/elrepo-release-7.0-4.el7.elrepo.noarch.rpm

# 安装内核：ml 为最新稳定版本，lt 为长期维护版本
# yum --enablerepo="elrepo-kernel" -y install kernel-lt.x86_64

# 设置 grub2 默认引导为 0 并重新生成引导文件
# grub2-set-default 0
# grub2-mkconfig -o /boot/grub2/grub.cfg

# 重启后验证内核版本
# reboot
# uname -r
```

**内核路由转发及网桥过滤**

```bash
# 添加网桥过滤及内核转发配置文件
# cat > /etc/sysctl.d/k8s.conf << EOF
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF

# 加载 br_netfilter 模块并查看
# modprobe br_netfilter
# lsmod | grep br_netfilter
br_netfilter           22256  0
bridge                151336  1 br_netfilter

# 使其生效
# sysctl --system
```

**安装 ipset 及 ipvsadm（kube-proxy ipvs 模式依赖）**

```bash
# yum -y install ipset ipvsadm

# 配置 ipvs 模块自动加载
# cat > /etc/sysconfig/modules/ipvs.modules <<EOF
#!/bin/bash
modprobe -- ip_vs
modprobe -- ip_vs_rr
modprobe -- ip_vs_wrr
modprobe -- ip_vs_sh
modprobe -- nf_conntrack
EOF

# 授权、运行、检查是否加载
# chmod 755 /etc/sysconfig/modules/ipvs.modules && bash /etc/sysconfig/modules/ipvs.modules && lsmod | grep -e ip_vs -e nf_conntrack
```

> 💡 对照（Rocky 9.x）：模块脚本路径用的是 `/lib/modules/ipvs.modules`，内容一致。

**关闭 SWAP**

```bash
# 永久关闭需注释 /etc/fstab 中的 swap 行后重启
# cat /etc/fstab
......
# /dev/mapper/centos-swap swap                    swap    defaults        0 0

# 不重启可临时关闭
# swapoff -a
```

**SSH 多机互信（多节点环境可选，便于批量分发文件）**

```bash
# 在 master 上生成证书并分发到其它节点
# ssh-keygen
# cd /root/.ssh && cp id_rsa.pub authorized_keys
# for i in 161 162; do scp -r /root/.ssh 192.168.10.$i:/root/; done
```

### 2.3 容器运行时：Docker + cri-dockerd

Kubernetes 自 1.24 起移除了内置的 dockershim，若继续使用 Docker 作为运行时，必须额外安装 cri-dockerd 作为 CRI 适配层。

```bash
# 1. 准备 Docker YUM 源（阿里云镜像站）
# wget https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -O /etc/yum.repos.d/docker-ce.repo

# 2. 安装并启动 Docker
# yum -y install docker-ce
# systemctl enable --now docker

# 3. 修改 cgroup driver 为 systemd（与 kubelet 保持一致）
# cat > /etc/docker/daemon.json <<EOF
{
        "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF
# systemctl restart docker
```

```bash
# 4. 安装 cri-dockerd
# wget https://github.com/Mirantis/cri-dockerd/releases/download/v0.3.8/cri-dockerd-0.3.8-3.el7.x86_64.rpm
# yum -y install cri-dockerd-0.3.8-3.el7.x86_64.rpm
```

![image-20220507120653090](/云原生/k8s-ops/k8s-ops-45-kubeadm快速部署kubernetes-1-29-0版本集群/image-20220507120653090-1702872869337.png)

![image-20220507120725815](/云原生/k8s-ops/k8s-ops-45-kubeadm快速部署kubernetes-1-29-0版本集群/image-20220507120725815-1702872869338.png)

```bash
# 5. 修改 pause 镜像指向（第 10 行）
# vim /usr/lib/systemd/system/cri-docker.service
ExecStart=/usr/bin/cri-dockerd --pod-infra-container-image=registry.k8s.io/pause:3.9 --container-runtime-endpoint fd://

# 6. 启动
# systemctl start cri-docker
# systemctl enable cri-docker
```

> ⚠️ 对照（Rocky 9.x 装 cri-dockerd 0.3.6 时）：需要先从清华镜像补装 `libcgroup-0.41-21.el7.x86_64.rpm` 依赖，再 `dnf install cri-dockerd-0.3.6...rpm`。

> 💡 新版集群（Ubuntu 系列）直接用 containerd 原生运行时，无需 Docker/cri-dockerd，差异见第四节速查表。

### 2.4 安装 kubeadm / kubelet / kubectl

|  | kubeadm | kubelet | kubectl |
| -------- | ------- | ------- | ------- |
| 版本 | 1.29.0 | 1.29.0 | 1.29.0 |
| 安装位置 | 集群所有主机 | 集群所有主机 | 集群所有主机 |
| 作用 | 初始化集群、管理集群等 | 接收 api-server 指令，对 Pod 生命周期进行管理 | 集群应用命令行管理工具 |

```bash
# 使用 kubernetes 社区 YUM 源（1.29 已迁移到 pkgs.k8s.io）
# cat > /etc/yum.repos.d/k8s.repo <<EOF
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/repodata/repomd.xml.key
EOF
```

> 💡 对照（1.28 及之前版本）：社区源为 `https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64`；国内也可用阿里云镜像源 `https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/`。

```bash
# 安装（所有节点）
# yum -y install kubeadm kubelet kubectl

# 或安装指定版本
# yum -y install kubeadm-1.29.0-150500.1.1 kubelet-1.29.0-150500.1.1 kubectl-1.29.0-150500.1.1

# 配置 kubelet 的 cgroup driver 与 docker 一致
# vim /etc/sysconfig/kubelet
KUBELET_EXTRA_ARGS="--cgroup-driver=systemd"

# 只设置开机自启动即可，集群初始化后自动启动
# systemctl enable kubelet
```

### 2.5 集群镜像准备

```bash
# 查看所需镜像列表
# kubeadm config images list --kubernetes-version=v1.29.0
```

```bash
# 离线环境批量下载脚本（images_list 填入上一步列出的镜像）
# cat image_download.sh
#!/bin/bash
images_list='
镜像列表'

for i in $images_list
do
        docker pull $i
done

docker save -o k8s-1-29-0.tar $images_list
```

### 2.6 集群初始化（仅 master 执行）

```bash
[root@k8s-master01 ~]# kubeadm init --kubernetes-version=v1.29.0 --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=192.168.10.160  --cri-socket unix:///var/run/cri-dockerd.sock
```

> ⚠️ 使用 Docker + cri-dockerd 时**必须显式指定 `--cri-socket`**，否则会因主机上同时存在 containerd 与 cri-dockerd 两个 CRI 端点而报错：
>
> ```text
> Found multiple CRI endpoints on the host. Please define which one do you wish to use by setting the 'criSocket' field in the kubeadm configuration file: unix:///var/run/containerd/containerd.sock, unix:///var/run/cri-dockerd.sock
> ```

初始化过程的关键输出（完整走查，便于对照排障）：

```text
[init] Using Kubernetes version: v1.29.0
[preflight] Running pre-flight checks
[preflight] Pulling images required for setting up a Kubernetes cluster
......
[certs] Generating "ca" certificate and key
[certs] Generating "apiserver" certificate and key
[certs] apiserver serving cert is signed for DNS names [k8s-master01 kubernetes kubernetes.default kubernetes.default.svc kubernetes.default.svc.cluster.local] and IPs [10.96.0.1 192.168.10.160]
......
[certs] Generating "etcd/server" certificate and key
[kubeconfig] Writing "admin.conf" kubeconfig file
[kubeconfig] Writing "super-admin.conf" kubeconfig file
[kubeconfig] Writing "kubelet.conf" kubeconfig file
[kubeconfig] Writing "controller-manager.conf" kubeconfig file
[kubeconfig] Writing "scheduler.conf" kubeconfig file
[etcd] Creating static Pod manifest for local etcd in "/etc/kubernetes/manifests"
[control-plane] Creating static Pod manifest for "kube-apiserver"
[control-plane] Creating static Pod manifest for "kube-controller-manager"
[control-plane] Creating static Pod manifest for "kube-scheduler"
[kubelet-start] Starting the kubelet
[wait-control-plane] Waiting for the kubelet to boot up the control plane as static Pods from directory "/etc/kubernetes/manifests". This can take up to 4m0s
[apiclient] All control plane components are healthy after 4.001643 seconds
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
[upload-certs] Skipping phase. Please see --upload-certs
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the labels: [node-role.kubernetes.io/control-plane node.kubernetes.io/exclude-from-external-load-balancers]
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the taints [node-role.kubernetes.io/control-plane:NoSchedule]
[bootstrap-token] Using token: nnyedz.y3ajtpy468lmol2g
......
[addons] Applied essential addon: CoreDNS
[addons] Applied essential addon: kube-proxy

Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

Alternatively, if you are the root user, you can run:

  export KUBECONFIG=/etc/kubernetes/admin.conf

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 192.168.10.160:6443 --token nnyedz.y3ajtpy468lmol2g \
        --discovery-token-ca-cert-hash sha256:da611f922567238facd9c9557bd2e6b40d066b35567ca9696849f005dd15e646
```

> 💡 对照（1.28）：1.29 的 kubeconfig 阶段多了 `super-admin.conf`；1.28 及更早版本给节点打的 taint 是 `node-role.kubernetes.io/master:NoSchedule` 与 `control-plane` 并存。这些只是输出细节，流程完全一致。

### 2.7 准备 kubectl 管理配置

```bash
[root@k8s-master01 ~]# mkdir -p $HOME/.kube
[root@k8s-master01 ~]# cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
[root@k8s-master01 ~]# chown $(id -u):$(id -g) $HOME/.kube/config
[root@k8s-master01 ~]# ls /root/.kube/
config
```

### 2.8 部署 CNI 网络插件 Calico

![image-20231218122240570](/云原生/k8s-ops/k8s-ops-45-kubeadm快速部署kubernetes-1-29-0版本集群/image-20231218122240570.png)

```bash
# 应用 operator 资源清单文件（1.29 实操用 v3.26.4；1.28 实操用 v3.25.1）
[root@k8s-master01 ~]# kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.4/manifests/tigera-operator.yaml

# 通过自定义资源方式安装
[root@k8s-master01 ~]# wget https://raw.githubusercontent.com/projectcalico/calico/v3.26.4/manifests/custom-resources.yaml

# 修改文件第 13 行，改为 kubeadm init --pod-network-cidr 对应的 IP 地址段
[root@k8s-master01 ~]# vim custom-resources.yaml
......
 11     ipPools:
 12     - blockSize: 26
 13       cidr: 10.244.0.0/16
 14       encapsulation: VXLANCrossSubnet
......

# 应用资源清单文件
[root@k8s-master01 ~]# kubectl create -f custom-resources.yaml

# 监视 calico-system 命名空间中 pod 运行情况，直到全部 Running
[root@k8s-master01 ~]# watch kubectl get pods -n calico-system
```

安装参考：<https://projectcalico.docs.tigera.io/about/about-calico>。Pod 网络、Service 网络与 CNI 的关系可回看[第 10 篇](/云原生/k8s/k8s-10-network-dns)。

### 2.9 工作节点加入

> ⚠️ 因容器镜像下载较慢可能导致报错，常见错误是节点提示 CNI 未就绪——有网络耐心等待即可。

```bash
[root@k8s-worker01 ~]# kubeadm join 192.168.10.160:6443 --token nnyedz.y3ajtpy468lmol2g \
        --discovery-token-ca-cert-hash sha256:da611f922567238facd9c9557bd2e6b40d066b35567ca9696849f005dd15e646 --cri-socket unix:///var/run/cri-dockerd.sock

[root@k8s-worker02 ~]# kubeadm join 192.168.10.160:6443 --token nnyedz.y3ajtpy468lmol2g \
        --discovery-token-ca-cert-hash sha256:da611f922567238facd9c9557bd2e6b40d066b35567ca9696849f005dd15e646 --cri-socket unix:///var/run/cri-dockerd.sock
```

### 2.10 集群可用性验证

```bash
# 查看所有的节点
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS   ROLES           AGE   VERSION
k8s-master01   Ready    control-plane   25m   v1.29.0
k8s-worker01   Ready    <none>          24m   v1.29.0
k8s-worker02   Ready    <none>          24m   v1.29.0

# 查看集群健康情况
[root@k8s-master01 ~]# kubectl get cs
Warning: v1 ComponentStatus is deprecated in v1.19+
NAME                 STATUS    MESSAGE   ERROR
scheduler            Healthy   ok
controller-manager   Healthy   ok
etcd-0               Healthy   ok

# 查看 kube-system 命名空间 pod 运行情况
[root@k8s-master01 ~]# kubectl get pods -n kube-system
NAME                                   READY   STATUS    RESTARTS   AGE
coredns-76f75df574-9s28w               1/1     Running   0          25m
coredns-76f75df574-th5zf               1/1     Running   0          25m
etcd-k8s-master01                      1/1     Running   0          26m
kube-apiserver-k8s-master01            1/1     Running   0          26m
kube-controller-manager-k8s-master01   1/1     Running   0          26m
kube-proxy-gjw8d                       1/1     Running   0          25m
kube-proxy-hpdnl                       1/1     Running   0          25m
kube-proxy-l7x5f                       1/1     Running   0          25m
kube-scheduler-k8s-master01            1/1     Running   0          26m

# 查看 calico-system 命名空间 pod 运行情况
[root@k8s-master01 ~]# kubectl get pods -n calico-system
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-7488d78bb5-qdh68   1/1     Running   0          23m
calico-node-2wh6d                          1/1     Running   0          23m
calico-node-cpb72                          1/1     Running   0          23m
calico-node-llm79                          1/1     Running   0          23m
calico-typha-5678bdcbbf-wtz6h              1/1     Running   0          23m
calico-typha-5678bdcbbf-zz6dj              1/1     Running   0          23m
csi-node-driver-7d8wb                      2/2     Running   0          23m
csi-node-driver-l8rdb                      2/2     Running   0          23m
csi-node-driver-rjbjn                      2/2     Running   0          23m
```

三个节点全部 `Ready`、kube-system 与 calico-system 的 Pod 全部 `Running`，单 master 集群即部署完成。

## 三、多 master 高可用

单 master 的致命伤：apiserver 所在节点一宕，整个集群不可写、不可调度。生产环境的标准做法是 **3 个 master 节点 + 1 个对客户端暴露的稳定入口（VIP）**。etcd 采用 kubeadm 默认的**堆叠模式**（stacked etcd）——每个 master 上跑一个 etcd 实例，与控制面组件同机，3 副本满足 Raft 多数派。VIP 的实现有两种主流方案：

| 方案 | 组件 | 原理 | 特点 |
| ---- | ---- | ---- | ---- |
| HAProxy + Keepalived | 两个独立系统服务 | Keepalived VRRP 漂移 VIP，HAProxy 在 16443 反代三台 apiserver | 传统方案，组件多、需单独维护健康检查脚本 |
| kube-vip | 一个静态 Pod | 以 static Pod 运行在控制面，leader election 选主持有 VIP | 云原生方案，无外部依赖，还顺带提供 Service LB |

### 3.1 方案一：HAProxy + Keepalived（K8s 1.21 实操）

#### 3.1.1 集群规划

3 主 2 从，另设一个 VIP：

| 主机名 | IP 地址 | 角色 | 额外组件 |
| ---- | ---- | ---- | ---- |
| master01 | 192.168.10.11 | master | haproxy、keepalived（主） |
| master02 | 192.168.10.12 | master | haproxy、keepalived（备） |
| master03 | 192.168.10.13 | master | - |
| worker01 | 192.168.10.14 | node | - |
| worker02 | 192.168.10.15 | node | - |
| - | 192.168.10.100 | vip | - |

操作系统 CentOS 7.6，节点初始化（主机名、hosts、防火墙、SELinux、时间同步、内核参数、ipvs、swap）与第二节完全一致，此处不再重复。

#### 3.1.2 HAProxy 配置

```bash
# 在 master01、master02 上安装
[root@master01 ~]# yum -y install haproxy keepalived
```

```bash
[root@master01 ~]# vim /etc/haproxy/haproxy.cfg
[root@master01 ~]# cat /etc/haproxy/haproxy.cfg
#---------------------------------------------------------------------
# Global settings
#---------------------------------------------------------------------
global
  maxconn  2000
  ulimit-n  16384
  log  127.0.0.1 local0 err
  stats timeout 30s

defaults
  log global
  mode  http
  option  httplog
  timeout connect 5000
  timeout client  50000
  timeout server  50000
  timeout http-request 15s
  timeout http-keep-alive 15s

frontend monitor-in
  bind *:33305
  mode http
  option httplog
  monitor-uri /monitor

frontend k8s-master
  bind 0.0.0.0:16443
  bind 127.0.0.1:16443
  mode tcp
  option tcplog
  tcp-request inspect-delay 5s
  default_backend k8s-master

backend k8s-master
  mode tcp
  option tcplog
  option tcp-check
  balance roundrobin
  default-server inter 10s downinter 5s rise 2 fall 2 slowstart 60s maxconn 250 maxqueue 256 weight 100
  server master01   192.168.10.11:6443  check
  server master02   192.168.10.12:6443  check
  server master03   192.168.10.13:6443  check
```

```bash
# 启动并分发配置到 master02
[root@master01 ~]# systemctl enable haproxy;systemctl start haproxy
[root@master01 ~]# systemctl status haproxy
```

![image-20220119174750138](/云原生/k8s-ops/k8s-ops-19-kubeadm部署高可用kubernetes集群-1-21-0/image-20220119174750138.png)

```bash
[root@master01 ~]# scp /etc/haproxy/haproxy.cfg master02:/etc/haproxy/haproxy.cfg
[root@master02 ~]# systemctl enable haproxy;systemctl start haproxy
```

![image-20220119175023889](/云原生/k8s-ops/k8s-ops-19-kubeadm部署高可用kubernetes集群-1-21-0/image-20220119175023889.png)

#### 3.1.3 Keepalived 配置（VIP 漂移）

```bash
[root@master01 ~]# vim /etc/keepalived/keepalived.conf
[root@master01 ~]# cat /etc/keepalived/keepalived.conf
! Configuration File for keepalived
global_defs {
    router_id LVS_DEVEL
    script_user root
    enable_script_security
}
vrrp_script chk_apiserver {
    script "/etc/keepalived/check_apiserver.sh" #此脚本需要单独定义，并要调用。
    interval 5
    weight -5
    fall 2
    rise 1
}
vrrp_instance VI_1 {
    state MASTER
    interface ens33 # 修改为正在使用的网卡
    mcast_src_ip 192.168.10.11 #为本master主机对应的IP地址
    virtual_router_id 51
    priority 101
    advert_int 2
    authentication {
        auth_type PASS
        auth_pass abc123
    }
    virtual_ipaddress {
        192.168.10.100 #为VIP地址
    }
    track_script {
       chk_apiserver # 执行上面检查apiserver脚本
    }
}
```

健康检查脚本（haproxy 挂了就停掉本机 keepalived，触发 VIP 漂移）：

```bash
[root@master01 ~]# vim /etc/keepalived/check_apiserver.sh
[root@master01 ~]# cat /etc/keepalived/check_apiserver.sh
#!/bin/bash

err=0
for k in $(seq 1 3)
do
    check_code=$(pgrep haproxy)
    if [[ $check_code == "" ]]; then
        err=$(expr $err + 1)
        sleep 1
        continue
    else
        err=0
        break
    fi
done

if [[ $err != "0" ]]; then
    echo "systemctl stop keepalived"
    /usr/bin/systemctl stop keepalived
    exit 1
else
    exit 0
fi

[root@master01 ~]# chmod +x /etc/keepalived/check_apiserver.sh
```

master02 上复制同一套配置，仅改三处：`state BACKUP`、`mcast_src_ip 192.168.10.12`、`priority 99`：

```bash
[root@master01 ~]# scp /etc/keepalived/keepalived.conf master02:/etc/keepalived/
[root@master01 ~]# scp /etc/keepalived/check_apiserver.sh master02:/etc/keepalived/

[root@master01 ~]# systemctl enable keepalived;systemctl start keepalived
[root@master02 ~]# systemctl enable keepalived;systemctl start keepalived
```

验证：VIP 已漂到 master01，两台机器的 16443 端口均在监听：

```bash
[root@master01 ~]# ip a s ens33
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:0c:29:50:f9:5f brd ff:ff:ff:ff:ff:ff
    inet 192.168.10.11/24 brd 192.168.10.255 scope global noprefixroute ens33
       valid_lft forever preferred_lft forever
    inet 192.168.10.100/32 scope global ens33
       valid_lft forever preferred_lft forever
    ......

[root@master01 ~]# ss -anput | grep ":16443"
tcp    LISTEN     0      2000   127.0.0.1:16443                 *:*                   users:(("haproxy",pid=2983,fd=6))
tcp    LISTEN     0      2000      *:16443                 *:*                   users:(("haproxy",pid=2983,fd=5))

[root@master02 ~]# ss -anput | grep ":16443"
tcp    LISTEN     0      2000   127.0.0.1:16443                 *:*                   users:(("haproxy",pid=2974,fd=6))
tcp    LISTEN     0      2000      *:16443                 *:*                   users:(("haproxy",pid=2974,fd=5))
```

#### 3.1.4 用 kubeadm-config.yaml 初始化第一个 master

HA 场景下不用命令行参数，改用配置文件，关键是 `controlPlaneEndpoint` 指向 **VIP:16443**，并把 VIP 加入 apiserver 证书 SAN：

```bash
[root@master01 ~]# cat kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta2
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: 7t2weq.bjbawausm0jaxury
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.10.11
  bindPort: 6443
nodeRegistration:
  criSocket: /var/run/dockershim.sock
  name: master01
  taints:
  - effect: NoSchedule
    key: node-role.kubernetes.io/master
---
apiServer:
  certSANs:
  - 192.168.10.100
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta2
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controlPlaneEndpoint: 192.168.10.100:16443
controllerManager: {}
dns:
  type: CoreDNS
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.cn-hangzhou.aliyuncs.com/google_containers
kind: ClusterConfiguration
kubernetesVersion: v1.21.0
networking:
  dnsDomain: cluster.local
  podSubnet: 10.244.0.0/16
  serviceSubnet: 10.96.0.0/12
scheduler: {}
```

> ⚠️ 阿里云镜像仓库中的 CoreDNS 镜像下载有错误；若网络可达，可把 `imageRepository` 留空走默认 `k8s.gcr.io`。

```bash
# --upload-certs 把控制面证书加密上传，供其它 master join 时下载
[root@master01 ~]# kubeadm init --config /root/kubeadm-config.yaml --upload-certs
```

成功后的关键输出（务必保留，后续 join 全靠它）：

```text
Your Kubernetes control-plane has initialized successfully!
......
You can now join any number of the control-plane node running the following command on each as root:

  kubeadm join 192.168.10.100:16443 --token 7t2weq.bjbawausm0jaxury \
        --discovery-token-ca-cert-hash sha256:085fc221ad8b5baffdaa567768a10d21eca2fc1f939fe73578ff725feea70ba4 \
        --control-plane --certificate-key 9f74fd2c73a16a79fb9f458cd5874a860564070fd93c3912d910ba2b9c11a2b1

Please note that the certificate-key gives access to cluster sensitive data, keep it secret!
As a safeguard, uploaded-certs will be deleted in two hours; If necessary, you can use
"kubeadm init phase upload-certs --upload-certs" to reload certs afterward.

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 192.168.10.100:16443 --token 7t2weq.bjbawausm0jaxury \
        --discovery-token-ca-cert-hash sha256:085fc221ad8b5baffdaa567768a10d21eca2fc1f939fe73578ff725feea70ba4
```

kubectl 配置文件准备同 2.7 节，不再重复。

#### 3.1.5 加入其余 master 与 worker

```bash
# master02、master03：加 --control-plane --certificate-key
[root@master02 ~]# kubeadm join 192.168.10.100:16443 --token 7t2weq.bjbawausm0jaxury \
>         --discovery-token-ca-cert-hash sha256:085fc221ad8b5baffdaa567768a10d21eca2fc1f939fe73578ff725feea70ba4 \
>         --control-plane --certificate-key 9f74fd2c73a16a79fb9f458cd5874a860564070fd93c3912d910ba2b9c11a2b1

[root@master03 ~]# kubeadm join 192.168.10.100:16443 --token 7t2weq.bjbawausm0jaxury \
>         --discovery-token-ca-cert-hash sha256:085fc221ad8b5baffdaa567768a10d21eca2fc1f939fe73578ff725feea70ba4 \
>         --control-plane --certificate-key 9f74fd2c73a16a79fb9f458cd5874a860564070fd93c3912d910ba2b9c11a2b1

# worker01、worker02：不加 --control-plane
[root@worker01 ~]# kubeadm join 192.168.10.100:16443 --token 7t2weq.bjbawausm0jaxury \
>         --discovery-token-ca-cert-hash sha256:085fc221ad8b5baffdaa567768a10d21eca2fc1f939fe73578ff725feea70ba4

[root@worker02 ~]# kubeadm join 192.168.10.100:16443 --token 7t2weq.bjbawausm0jaxury \
>         --discovery-token-ca-cert-hash sha256:085fc221ad8b5baffdaa567768a10d21eca2fc1f939fe73578ff725feea70ba4
```

Calico 部署与 2.8 节相同（operator + custom-resources）。验证：

```bash
[root@master01 ~]# kubectl get nodes
NAME       STATUS   ROLES                  AGE     VERSION
master01   Ready    control-plane,master   13m     v1.21.0
master02   Ready    control-plane,master   2m25s   v1.21.0
master03   Ready    control-plane,master   87s     v1.21.0
worker01   Ready    <none>                 3m13s   v1.21.0
worker02   Ready    <none>                 2m50s   v1.21.0
```

```bash
# 查看 kube-system 中 pod：三套 etcd/apiserver/controller-manager/scheduler 已堆叠在三个 master 上
[root@master01 ~]# kubectl get pods -n kube-system
NAME                               READY   STATUS    RESTARTS   AGE
coredns-558bd4d5db-smp62           1/1     Running   0          13m
coredns-558bd4d5db-zcmp5           1/1     Running   0          13m
etcd-master01                      1/1     Running   0          14m
etcd-master02                      1/1     Running   0          3m10s
etcd-master03                      1/1     Running   0          115s
kube-apiserver-master01            1/1     Running   0          14m
kube-apiserver-master02            1/1     Running   0          3m13s
kube-apiserver-master03            1/1     Running   0          116s
kube-controller-manager-master01   1/1     Running   1          13m
kube-controller-manager-master02   1/1     Running   0          3m13s
kube-controller-manager-master03   1/1     Running   0          116s
kube-proxy-629zl                   1/1     Running   0          2m17s
......
kube-scheduler-master01            1/1     Running   1          13m
kube-scheduler-master02            1/1     Running   0          3m13s
kube-scheduler-master03            1/1     Running   0          115s
```

> ⚠️ 1.21 上 `kubectl get cs` 常见 scheduler/controller-manager 显示 `Unhealthy ... connection refused`（10251/10252 端口未监听），这是组件健康检查端口默认不再绑定的已知现象，以 Pod 状态为准判断健康。

### 3.2 方案二：kube-vip（K8s 1.28 实操，推荐）

![image-20231207223257866](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20231207223257866.png)

实操环境：CentOS 7.9、Linux kernel 5.4、docker-ce 24.0.7、cri-dockerd v0.3.8、K8s 1.28.2，3 master + 2 worker，VIP `192.168.10.200`（hosts 中登记为 `lb.kubemsb.com`）。节点初始化与第二节一致。

kube-vip 以**静态 Pod** 方式运行在每个 master 上，通过 leader election 选主：只有 leader 节点持有 VIP 并把 6443 流量负载均衡到控制面，master 故障时 VIP 自动"漂移"到新 leader——一个 Pod 替代了 HAProxy + Keepalived 两个组件。

#### 3.2.1 生成 kube-vip 静态 Pod 清单

```bash
# 在第一个 master 上定义变量
export  VIP=192.168.10.200
export INTERFACE=ens33
export KVVERSION=v0.6.4
```

```bash
# 用容器生成 manifest 并直接落到静态 Pod 目录
docker run -it --rm --net=host ghcr.io/kube-vip/kube-vip:$KVVERSION manifest pod \
--interface $INTERFACE \
--address $VIP \
--controlplane \
--services \
--arp \
--enableLoadBalancer \
--leaderElection | tee /etc/kubernetes/manifests/kube-vip.yaml
```

生成的清单（节选关键部分）：

```yaml
[root@k8s-master01 ~]# cat /etc/kubernetes/manifests/kube-vip.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  name: kube-vip
  namespace: kube-system
spec:
  containers:
  - args:
    - manager
    env:
    - name: vip_arp
      value: "true"
    - name: port
      value: "6443"
    - name: vip_interface
      value: ens33
    - name: vip_cidr
      value: "32"
    - name: cp_enable
      value: "true"
    - name: cp_namespace
      value: kube-system
    ......

    - name: vip_leaderelection
      value: "true"
    - name: vip_leasename
      value: plndr-cp-lock
    - name: vip_leaseduration
      value: "5"
    - name: vip_renewdeadline
      value: "3"
    - name: vip_retryperiod
      value: "1"
    - name: lb_enable
      value: "true"
    - name: lb_port
      value: "6443"
    - name: lb_fwdmethod
      value: local
    - name: address
      value: 192.168.10.200
    ......

    image: ghcr.io/kube-vip/kube-vip:v0.6.4
    ......

    securityContext:
      capabilities:
        add:
        - NET_ADMIN
        - NET_RAW
    volumeMounts:
    - mountPath: /etc/kubernetes/admin.conf
      name: kubeconfig
  hostAliases:
  - hostnames:
    - kubernetes
    ip: 127.0.0.1
  hostNetwork: true
  volumes:
  - hostPath:
      path: /etc/kubernetes/admin.conf
    name: kubeconfig
status: {}
```

分发到其它两个 master：

```bash
[root@k8s-master01 ~]# scp /etc/kubernetes/manifests/kube-vip.yaml k8s-master02:/etc/kubernetes/manifests/
[root@k8s-master01 ~]# scp /etc/kubernetes/manifests/kube-vip.yaml k8s-master03:/etc/kubernetes/manifests/
```

> ⚠️ 静态 Pod 目录里落了 manifest，kubelet 一启动就会拉起 kube-vip——所以它必须在 `kubeadm init` **之前**就位，这也是 kube-vip 与 HAProxy/Keepalived（先装外部组件再 init）顺序上最大的区别。

#### 3.2.2 初始化配置文件与 init

```bash
# 可先查看各类 kind 的默认配置
kubeadm config print init-defaults --component-configs KubeletConfiguration
kubeadm config print init-defaults --component-configs InitConfiguration
kubeadm config print init-defaults --component-configs ClusterConfiguration
```

```yaml
[root@k8s-master01 ~]# cat > kubeadm-config.yaml << EOF
---
apiVersion: kubeadm.k8s.io/v1beta3
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.10.160
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/cri-dockerd.sock
  imagePullPolicy: IfNotPresent
  name: k8s-master01
  taints: null
---
apiServer:
  timeoutForControlPlane: 4m0s
  certSANs:
  - lb.kubemsb.com
  - k8s-master01
  - k8s-master02
  - k8s-master03
  - k8s-worker01
  - k8s-worker02
  - 192.168.10.160
  - 192.168.10.161
  - 192.168.10.162
  - 192.168.10.163
  - 192.168.10.164
controlPlaneEndpoint: lb.kubemsb.com:6443
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns: {}
etcd:
  local: {}
imageRepository: registry.k8s.io
kind: ClusterConfiguration
kubernetesVersion: 1.28.2
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16
scheduler: {}
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
.....
mode: "ipvs"
.....
kind: KubeProxyConfiguration
.....
EOF
```

与 3.1.4 的差别：`controlPlaneEndpoint` 直接指向 `lb.kubemsb.com:6443`（即 kube-vip 的 VIP），**不再需要 16443 中转端口**；kube-proxy 显式配置 `mode: "ipvs"`；etcd 用 `local: {}` 堆叠模式。

> 💡 若想要 etcd 与控制面分离（外部 etcd 集群），把 `etcd.local` 替换为 `etcd.external`，填入三个 endpoint，例如 `http://192.168.10.160:2379`、`http://192.168.10.161:2379`、`http://192.168.10.162:2379`——源课程笔记在 master 三节点上用 systemd 服务另行部署过一套 etcd 3.5.0 集群（`etcdctl member list` 验证三个 member、master01 为 leader）。生产上堆叠 etcd 部署简单、延迟低，外部 etcd 便于独立扩缩与备份，按团队运维能力选择。

```bash
# 初始化第一个 master
# kubeadm init --config kubeadm.yaml --upload-certs --v=9
```

成功输出与 3.1.4 同构，join 地址换成了 `lb.kubemsb.com:6443`：

```text
Your Kubernetes control-plane has initialized successfully!
......
You can now join any number of the control-plane node running the following command on each as root:

  kubeadm join lb.kubemsb.com:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:d2e611304c8f0277c9228378d5d2d1776970f638e90d9482444946a0b2ad3343 \
        --control-plane --certificate-key 7bcb6b9e1571631f2349de1972519120830882b27debaa5de62bbd460bccba37
......
Then you can join any number of worker nodes by running the following on each as root:

kubeadm join lb.kubemsb.com:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:d2e611304c8f0277c9228378d5d2d1776970f638e90d9482444946a0b2ad3343
```

#### 3.2.3 加入其余 master、worker 并部署 CNI

```bash
# 其它 master（加 --control-plane --certificate-key，注意补 --cri-socket）
kubeadm join lb.kubemsb.com:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:d2e611304c8f0277c9228378d5d2d1776970f638e90d9482444946a0b2ad3343 \
        --control-plane --certificate-key 7bcb6b9e1571631f2349de1972519120830882b27debaa5de62bbd460bccba37 \
        --cri-socket unix:///var/run/cri-dockerd.sock

# 每个 master 上准备 kubectl 配置
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# worker
kubeadm join lb.kubemsb.com:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:d2e611304c8f0277c9228378d5d2d1776970f638e90d9482444946a0b2ad3343 --cri-socket unix:///var/run/cri-dockerd.sock
```

部署 CNI 前节点为 `NotReady` 属正常：

```bash
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS     ROLES           AGE     VERSION
k8s-master01   NotReady   control-plane   26m    v1.28.2
k8s-master02   NotReady   control-plane   5m6s   v1.28.2
k8s-master03   NotReady   control-plane   3m2s   v1.28.2
k8s-worker01   NotReady   <none>          68s    v1.28.2
k8s-worker02   NotReady   <none>          71s    v1.28.2
```

Calico 部署同 2.8 节（该环境用 v3.25.1），完成后全部 Ready：

```bash
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS   ROLES           AGE   VERSION
k8s-master01   Ready    control-plane   54m   v1.28.2
k8s-master02   Ready    control-plane   49m   v1.28.2
k8s-master03   Ready    control-plane   48m   v1.28.2
k8s-worker01   Ready    <none>          29m   v1.28.2
k8s-worker02   Ready    <none>          29m   v1.28.2
```

#### 3.2.4 附赠能力：kube-vip 充当 Service LoadBalancer

kube-vip 启动后会监听所有 `type: LoadBalancer` 的 Service。只要填了 `spec.loadBalancerIP` 或注解 `kube-vip.io/loadbalancerIPs`，就会为该 Service 发布一个真实 IP：

```yaml
[root@k8s-master01 kubevip]# cat > nginx.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.10.210
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF
```

```bash
[root@k8s-master01 kubevip]# kubectl apply -f nginx.yaml
deployment.apps/nginx-deployment created
service/nginx created

[root@k8s-master01 kubevip]# kubectl get svc
NAME         TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
kubernetes   ClusterIP      10.96.0.1       <none>           443/TCP        120m
nginx        LoadBalancer   10.110.91.135   192.168.10.210   80:31037/TCP   20s
```

![image-20231207195928576](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20231207195928576.png)

也可以用注解方式：`metadata.annotations["kube-vip.io/loadbalancerIPs"]: "192.168.10.211"`，效果相同。更进一步，配合 kube-vip Cloud Provider 还能按 CIDR/范围自动分配：

```bash
# 安装 kube-vip cloud provider 后，创建全局 CIDR 地址池
[root@k8s-master01 kubevip]# kubectl apply -f https://raw.githubusercontent.com/kube-vip/kube-vip-cloud-provider/main/manifest/kube-vip-cloud-controller.yaml
[root@k8s-master01 kubevip]# kubectl create configmap -n kube-system kubevip --from-literal cidr-global=192.168.10.215/29

# 之后创建 LoadBalancer Service 会自动从池中取 IP
[root@k8s-master01 kubevip]# kubectl get svc
NAME         TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
nginx-cidr   LoadBalancer   10.107.144.56   192.168.10.208   80:32389/TCP   5s
```

把 `cidr-global` 换成 `range-global`（如 `192.168.10.220-192.168.10.230`）则按 IP 范围分配；换成 `cidr-<namespace>` / `range-<namespace>` 则限定单个命名空间。

## 四、OS/版本变体速查表

课程笔记里先后用不同 OS 和 K8s 版本完整跑过十几轮部署，流程骨架与第二、三节完全一致，差异只在操作系统初始化、容器运行时与软件源。**流程同上，差异见表**：

| 笔记 | OS | K8s 版本 | 容器运行时 | 差异点/坑 |
| ---- | ---- | ---- | ---- | ---- |
| 18 | CentOS 7.9 | 1.24.0 | docker-ce + cri-dockerd | 1.24 正式移除 dockershim，必须上 cri-dockerd；当时无可用 RPM，需 git clone 源码用 Go 自行构建二进制；pod CIDR 用了 10.224.0.0/16 |
| 24 | Debian 12 | 1.28 | containerd 1.7.5（cri-containerd tar 包） | apt 系软件源；containerd 需手动 `containerd config default > /etc/containerd/config.toml` 并把 `sandbox_image` 从 pause:3.8 改为 3.9 |
| 25 | CentOS 7.9 | 1.27.1 | docker-ce + cri-dockerd 0.3.1 | 老版本社区 yum 源（packages.cloud.google.com）；init/join 均需 `--cri-socket` |
| 32 | CentOS 7.9 | 1.21.0（单 master） | docker-ce 20.10.9（内置 dockershim） | 1.21 无需 cri-dockerd，init 不带 `--cri-socket`；用阿里云 google_containers 镜像仓库拉镜像 |
| 34 | Ubuntu 24.04 | 1.31.0 | containerd 1.7.16 | `sandbox_image` 改 3.9（也可换阿里云 pause 地址）；Calico 升至 v3.26.1 |
| 41 | Ubuntu 22.04 | 1.28 | containerd 1.7.5 | apt 安装 containerd/kubeadm；镜像清单为 registry.k8s.io（pause:3.9、etcd:3.5.9-0） |
| 42 | Ubuntu 23.04 | 1.28 | containerd 1.7.5 | 与 41 流程一致，仅系统版本不同 |
| 43 | Ubuntu 22.04/23.04 | 1.29.0 | containerd 1.7.5 | kubeadm-config 给了两套 imageRepository：registry.k8s.io 与阿里云 google_containers，离线/弱网可切换 |
| 46 | Ubuntu 24.04 | 1.30.0（kube-vip 高可用） | containerd 1.7.16 + nerdctl | 用 nerdctl（非 docker）生成 kube-vip manifest；即第三节 kube-vip 方案的 Ubuntu/containerd 版 |
| 65 | Ubuntu 24.04 | 1.32.0 | containerd 2.0.1 | containerd 2.x 配置结构大改（`io.containerd.cri.v1.images` 段），pause 镜像为 3.10，sandbox 配置项移到 `pinned_images` |

> 💡 读表技巧：K8s ≥1.24 且想继续用 Docker → 准备 cri-dockerd 并在所有 kubeadm 命令带 `--cri-socket`；追求"原生"（Ubuntu 系新笔记全部如此）→ containerd 直装，改 `sandbox_image` 即可；1.29 起 yum 源从 google 仓迁到 pkgs.k8s.io。

## 五、部署后验收清单

集群建起来只是第一步，交付前逐项打勾：

- [ ] `kubectl get nodes`：所有节点 `Ready`，master 均带 `control-plane` 角色，版本号一致。
- [ ] `kubectl get pods -n kube-system`：corens/etcd/apiserver/controller-manager/scheduler/kube-proxy 全部 `Running`；HA 集群应有 N 套 etcd/apiserver（N = master 数）。
- [ ] `kubectl get pods -n calico-system`：calico-node 每个 节点一个、kube-controllers 与 typha 正常（Calico 3.26+ 还有 csi-node-driver）。
- [ ] `kubectl get cs`：etcd-0 为 `Healthy`；scheduler/controller-manager 的 Unhealthy 报警参考 3.1.5 说明以 Pod 状态为准。
- [ ] HA 集群：VIP 当前所在节点 `ip a` 可见 VIP；逐台关停一个 master 后 `kubectl get nodes` 仍可正常执行（验证 VIP 漂移/leader 切换生效）。
- [ ] 建 Pod 与 Service 验证网络连通（参考 3.2.4 的 nginx 例子：Deployment → LoadBalancer Service → curl 返回页面）。
- [ ] 时钟同步、防火墙关闭状态、swap 关闭状态在**所有节点**复核——这是最常见的"过几天节点 NotReady"根因。
- [ ] 妥善保存 `kubeadm init` 输出的 join 命令、`/etc/kubernetes/pki` 证书目录与 kubeadm-config.yaml，后续扩节点与灾备都依赖它们。

## 小结

- 部署方式谱系：minikube 学习用、kubeadm 是官方快速路径、二进制极致可控，rke/kubekey/kubeasz 是自动化封装，云上有 ACK/CCE/EKS 托管。
- 单 master 全流程 = 主机初始化 → 容器运行时（Docker+cri-dockerd 或 containerd）→ kubeadm/kubelet/kubectl → 镜像准备 → `kubeadm init` → Calico → `kubeadm join` → 验证。Docker 运行时的关键坑是 `--cri-socket` 必须显式指定。
- 高可用 = 3 master 堆叠 etcd + 稳定 VIP 入口。VIP 两条路：传统 HAProxy+Keepalived（16443 反代 + VRRP 漂移，配置项多），或 kube-vip 静态 Pod（leader election 持有 VIP，先落 manifest 再 init，还附赠 Service LB）。
- HA 场景用 kubeadm-config.yaml 而非命令行参数：`controlPlaneEndpoint` 指向 VIP、证书 SAN 覆盖 VIP/所有节点、`--upload-certs` + `--control-plane --certificate-key` 完成后续 master 加入。
- 十个 OS/版本变体只是"换壳"：差异集中在软件源、网络配置工具、containerd 版本与 pause 镜像版本，对照第四节速查表即可平移。

> **Kubernetes 系列 · 第 20/35 篇**  
> 上一篇：[《容器内 JVM 参数解析与生产优化》](/云原生/k8s/k8s-19-jvm-in-container)  
> 下一篇：[《部署方法横向对比——二进制、RKE/RKE2、k0s、sealos 与 kubespray》](/云原生/k8s/k8s-21-deploy-methods)
