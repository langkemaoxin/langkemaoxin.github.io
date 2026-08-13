---
title: 基于OpenEuler操作系统使用isula容器运行时部署K8S集群
sidebarGroup: K8s 运维笔记
shortTitle: 40 基于OpenEuler操作系统使用isula容器
order: 40
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: 基于OpenEuler 22.03操作系统使用isula容器运行时部署K8S集群 一、OpenEuler操作系统安装 1.1 OpenEuler操作系统安装ISO文件获取 1.2 创建虚拟机 1.3 ...
---

> **K8s 课程笔记 · 第 42 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 基于OpenEuler 22.03操作系统使用isula容器运行时部署K8S集群

# 一、OpenEuler操作系统安装

## 1.1 OpenEuler操作系统安装ISO文件获取

![image-20231106105615481](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106105615481.png)

![image-20231106105710014](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106105710014.png)

![image-20231106105833998](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106105833998.png)

![image-20231106105919105](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106105919105.png)

## 1.2 创建虚拟机

![image-20231106111319110](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106111319110.png)

![image-20231106111408166](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106111408166.png)

![image-20231106111442338](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106111442338.png)

![image-20231106111719915](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106111719915.png)

![image-20231106111821456](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106111821456.png)

![image-20231106111852856](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106111852856.png)

![image-20231106111922582](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106111922582.png)

![image-20231106111951664](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106111951664.png)

![image-20231106112024067](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106112024067.png)

![image-20231106112054874](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106112054874.png)

![image-20231106112123675](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106112123675.png)

![image-20231106112150071](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106112150071.png)

![image-20231106112308630](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106112308630.png)

## 1.3 虚拟机安装

![image-20231106112520257](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106112520257.png)

![image-20231106112936181](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106112936181.png)

![image-20231106113040917](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106113040917.png)

![image-20231106113237946](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106113237946.png)

![image-20231106113332007](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106113332007.png)

![image-20231106113924877](/云原生/k8s-ops/k8s-ops-40-基于openeuler操作系统使用isula容器运行时部署k8s集群/image-20231106113924877.png)

## 1.4 OpenEuler操作系统初始配置

~~~powershell
# systemctl disable --now firewalld
~~~

~~~powershell
# sed -ri 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
~~~

~~~powershell
# dnf update
~~~

# 二、使用OpenEuler部署K8S集群

## 2.1 K8S集群主机准备

### 2.1.1 主机操作系统说明

| 序号 | 操作系统及版本 | 备注 |
| :--: | :------------: | :--: |
|  1   | OpenEuler23.09 |      |

### 2.1.2 主机硬件配置说明

| 需求 | CPU  | 内存 | 硬盘   | 角色         | 主机名       |
| ---- | ---- | ---- | ------ | ------------ | ------------ |
| 值   | 8C   | 8G   | 1024GB | master       | k8s-master01 |
| 值   | 8C   | 16G  | 1024GB | worker(node) | k8s-worker01 |
| 值   | 8C   | 16G  | 1024GB | worker(node) | k8s-worker02 |

### 2.1.3 主机配置

#### 2.1.3.1  主机名配置

由于本次使用3台主机完成kubernetes集群部署，其中1台为master节点,名称为k8s-master01;其中2台为worker节点，名称分别为：k8s-worker01及k8s-worker02

~~~powershell
master节点
# hostnamectl set-hostname k8s-master01
~~~

~~~powershell
worker01节点
# hostnamectl set-hostname k8s-worker01
~~~

~~~powershell
worker02节点
# hostnamectl set-hostname k8s-worker02
~~~

#### 2.1.3.2 主机IP地址配置

~~~powershell
k8s-master节点IP地址为：192.168.10.140/24
# vim /etc/sysconfig/network-scripts/ifcfg-ens33
TYPE="Ethernet"
PROXY_METHOD="none"
BROWSER_ONLY="no"
BOOTPROTO="none"
DEFROUTE="yes"
IPV4_FAILURE_FATAL="no"
IPV6INIT="yes"
IPV6_AUTOCONF="yes"
IPV6_DEFROUTE="yes"
IPV6_FAILURE_FATAL="no"
IPV6_ADDR_GEN_MODE="stable-privacy"
NAME="ens33"
DEVICE="ens33"
ONBOOT="yes"
IPADDR="192.168.10.140"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"
DNS2="8.8.8.8"
~~~

~~~powershell
k8s-worker1节点IP地址为：192.168.10.141/24
# vim /etc/sysconfig/network-scripts/ifcfg-ens33
TYPE="Ethernet"
PROXY_METHOD="none"
BROWSER_ONLY="no"
BOOTPROTO="none"
DEFROUTE="yes"
IPV4_FAILURE_FATAL="no"
IPV6INIT="yes"
IPV6_AUTOCONF="yes"
IPV6_DEFROUTE="yes"
IPV6_FAILURE_FATAL="no"
IPV6_ADDR_GEN_MODE="stable-privacy"
NAME="ens33"
DEVICE="ens33"
ONBOOT="yes"
IPADDR="192.168.10.141"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"
DNS2="8.8.8.8"
~~~

~~~powershell
k8s-worker2节点IP地址为：192.168.10.142/24
# vim /etc/sysconfig/network-scripts/ifcfg-ens33
TYPE="Ethernet"
PROXY_METHOD="none"
BROWSER_ONLY="no"
BOOTPROTO="none"
DEFROUTE="yes"
IPV4_FAILURE_FATAL="no"
IPV6INIT="yes"
IPV6_AUTOCONF="yes"
IPV6_DEFROUTE="yes"
IPV6_FAILURE_FATAL="no"
IPV6_ADDR_GEN_MODE="stable-privacy"
NAME="ens33"
DEVICE="ens33"
ONBOOT="yes"
IPADDR="192.168.10.142"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"
DNS2="8.8.8.8"
~~~

~~~powershell
# nmcli c reload
# nmcli c up ens33
~~~

#### 2.1.3.3 主机名与IP地址解析

> 所有集群主机均需要进行配置。

~~~powershell
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.140 k8s-master01
192.168.10.141 k8s-worker01
192.168.10.142 k8s-worker02
~~~

#### 2.1.3.4  防火墙配置

> 所有主机均需要操作。

~~~powershell
关闭现有防火墙firewalld
# systemctl disable firewalld
# systemctl stop firewalld

# firewall-cmd --state
not running
~~~

#### 2.1.3.5 SELINUX配置

> 所有主机均需要操作。修改SELinux配置需要重启操作系统。

~~~powershell
# sed -ri 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
~~~

~~~powershell
# sestatus
~~~

#### 2.1.3.6 时间同步配置

>所有主机均需要操作。最小化安装系统需要安装ntpdate软件。

~~~powershell
# dnf install ntpdate
~~~

~~~powershell
# crontab -l
0 */1 * * * /usr/sbin/ntpdate time1.aliyun.com
~~~

#### 2.1.3.7 配置内核路由转发及网桥过滤

>所有主机均需要操作。

~~~powershell
添加网桥过滤及内核转发配置文件
# cat > /etc/sysctl.d/k8s.conf << EOF
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
vm.swappiness = 0
EOF
~~~

~~~powershell
加载br_netfilter模块
# modprobe br_netfilter
~~~

~~~powershell
查看是否加载
# lsmod | grep br_netfilter
br_netfilter           22256  0
bridge                151336  1 br_netfilter
~~~

~~~powershell
# sysctl --system
或
# sysctl -p /etc/sysctl.d/k8s.conf
~~~

#### 2.1.3.8 安装ipset及ipvsadm

> 所有主机均需要操作。

~~~powershell
安装ipset及ipvsadm
# yum -y install ipset ipvsadm
~~~

~~~powershell
配置ipvsadm模块加载方式
添加需要加载的模块
# cat > /etc/sysconfig/modules/ipvs.modules <<EOF
#!/bin/bash
modprobe -- ip_vs
modprobe -- ip_vs_rr
modprobe -- ip_vs_wrr
modprobe -- ip_vs_sh
modprobe -- nf_conntrack
EOF
~~~

~~~powershell
授权、运行、检查是否加载
# chmod 755 /etc/sysconfig/modules/ipvs.modules && bash /etc/sysconfig/modules/ipvs.modules && lsmod | grep -e ip_vs -e nf_conntrack
~~~

#### 2.1.3.9 关闭SWAP分区

> 修改完成后需要重启操作系统，如不重启，可临时关闭，命令为swapoff -a

~~~powershell
永远关闭swap分区，需要重启操作系统
# cat /etc/fstab
......

# /dev/mapper/centos-swap swap                    swap    defaults        0 0

在上一行中行首添加#
~~~

## 2.2 K8S集群主机容器运行时iSula准备

### 2.2.1 iSulad安装

> 使用默认YUM源，注意区别iSula中字母大小写。

~~~powershell
# dnf install iSulad
~~~

### 2.2.2 iSulad配置

~~~powershell
# vim /etc/isulad/daemon.json

# cat /etc/isulad/daemon.json
{
    "group": "isula",
    "default-runtime": "lcr",
    "graph": "/var/lib/isulad",
    "state": "/var/run/isulad",
    "log-level": "ERROR",
    "pidfile": "/var/run/isulad.pid",
    "log-opts": {
        "log-file-mode": "0600",
        "log-path": "/var/lib/isulad",
        "max-file": "1",
        "max-size": "30KB"
    },
    "log-driver": "stdout",
    "container-log": {
        "driver": "json-file"
    },
    "hook-spec": "/etc/default/isulad/hooks/default.json",
    "start-timeout": "2m",
    "storage-driver": "overlay2",
    "storage-opts": [
        "overlay2.override_kernel_check=true"
    ],
    "registry-mirrors": [
    "docker.io","hub.oepkgs.net"
    ],
    "insecure-registries": [
    ],
    "pod-sandbox-image": "k8s.gcr.io/pause:3.2",
    "native.umask": "normal",
    "network-plugin": "cni",
    "cni-bin-dir": "/opt/cni/bin",
    "cni-conf-dir": "/etc/cni/net.d",
    "image-layer-check": false,
    "use-decrypted-key": true,
    "insecure-skip-verify-enforce": false,
    "cri-runtimes": {
        "kata": "io.containerd.kata.v2"
    }
}
~~~

### 2.2.3 iSulad启动

~~~powershell
# systemctl status isulad
~~~

~~~powershell
# systemctl restart isulad
~~~

~~~powershell
# isula version
Client:
  Version:      2.0.18
  Git commit:   cbbf3711bc84e5f3ef3147b4e15d85888f33cb39
  Built:        2023-09-20T00:13:35.659982233+08:00

Server:
  Version:      2.0.18
  Git commit:   cbbf3711bc84e5f3ef3147b4e15d85888f33cb39
  Built:        2023-09-20T00:13:35.659982233+08:00

OCI config:
  Version:      1.0.1
  Default file: /etc/default/isulad/config.json
~~~

## 2.3 K8S集群部署

### 2.3.1  集群软件及版本说明

|          | kubernetes-kubeadm     | kubernetes-kubelet                            | kubernetes-client      |
| -------- | ---------------------- | --------------------------------------------- | ---------------------- |
| 版本     | 1.20.X                 | 1.20.X                                        | 1.20.X                 |
| 安装位置 | 集群所有主机           | 集群所有主机                                  | 集群所有主机           |
| 作用     | 初始化集群、管理集群等 | 用于接收api-server指令，对pod生命周期进行管理 | 集群应用命令行管理工具 |

### 2.3.2  查看kubernetes YUM源准备

~~~powershell
# dnf list | grep kubernetes
kubernetes-client.x86_64                                1.20.2-16.oe2203sp1                             EPOL
kubernetes-kubeadm.x86_64                               1.20.2-16.oe2203sp1                             EPOL
kubernetes-kubelet.x86_64                               1.20.2-16.oe2203sp1                             EPOL
kubernetes-master.x86_64                                1.20.2-16.oe2203sp1                             EPOL
kubernetes.x86_64                                       1.20.2-16.oe2203sp1                             EPOL
kubernetes-help.x86_64                                  1.20.2-16.oe2203sp1                             EPOL
kubernetes-node.x86_64                                  1.20.2-16.oe2203sp1                             EPOL
python-kubernetes.src                                   21.7.0-1.oe2203sp1                              source
python-kubernetes-help.noarch                           21.7.0-1.oe2203sp1                              everything
python3-kubernetes.noarch                               21.7.0-1.oe2203sp1                              everything
rsyslog-mmkubernetes.x86_64                             8.2110.0-14.oe2203sp1                           update
~~~

### 2.3.3 集群软件安装

> 所有节点均可安装

~~~powershell
master节点安装
# dnf install -y kubernetes-kubeadm kubernetes-kubelet kubernetes-master kubernetes-client
~~~

~~~powershell
worker节点安装
# dnf install -y kubernetes-kubeadm kubernetes-kubelet kubernetes-node
~~~

### 2.3.4 配置kubelet

>为了实现docker使用的cgroupdriver与kubelet使用的cgroup的一致性，建议修改如下文件内容。

~~~powershell
# vim /etc/sysconfig/kubelet
KUBELET_EXTRA_ARGS="--cgroup-driver=systemd"
~~~

~~~powershell
设置kubelet为开机自启动即可，由于没有生成配置文件，集群初始化后自动启动
# systemctl enable kubelet
~~~

### 2.3.5  集群镜像准备

> 可使用VPN实现下载。

~~~powershell
# kubeadm config images list --kubernetes-version=v1.20.2
~~~

~~~powershell
输出如下：
k8s.gcr.io/kube-apiserver:v1.20.2
k8s.gcr.io/kube-controller-manager:v1.20.2
k8s.gcr.io/kube-scheduler:v1.20.2
k8s.gcr.io/kube-proxy:v1.20.2
k8s.gcr.io/pause:3.2
k8s.gcr.io/etcd:3.4.13-0
k8s.gcr.io/coredns:1.7.0
~~~

~~~powershell
# dnf install -y cri-tools
~~~

~~~powershell
# vim /etc/crictl.yaml
[root@k8s-master01 ~]# cat /etc/crictl.yaml
runtime-endpoint: unix:///var/run/isulad.sock
image-endpoint: unix:///var/run/isulad.sock
timeout: 10
debug: false
~~~

~~~powershell
# kubeadm config images pull --kubernetes-version=v1.20.2 --image-repository=k8s.gcr.io
~~~

### 2.3.6 集群初始化

~~~powershell
[root@k8s-master01 ~]# kubeadm init --kubernetes-version=v1.20.2 --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=192.168.10.140  --cri-socket unix:///var/run/isulad.sock --image-repository k8s.gcr.io
~~~

~~~powershell
输出内容：
[init] Using Kubernetes version: v1.20.2
[preflight] Running pre-flight checks
        [WARNING FileExisting-socat]: socat not found in system path
[preflight] Pulling images required for setting up a Kubernetes cluster
[preflight] This might take a minute or two, depending on the speed of your internet connection
[preflight] You can also perform this action in beforehand using 'kubeadm config images pull'
[certs] Using certificateDir folder "/etc/kubernetes/pki"
[certs] Generating "ca" certificate and key
[certs] Generating "apiserver" certificate and key
[certs] apiserver serving cert is signed for DNS names [k8s-master01 kubernetes kubernetes.default kubernetes.default.svc kubernetes.default.svc.cluster.local] and IPs [10.96.0.1 192.168.10.160]
[certs] Generating "apiserver-kubelet-client" certificate and key
[certs] Generating "front-proxy-ca" certificate and key
[certs] Generating "front-proxy-client" certificate and key
[certs] Generating "etcd/ca" certificate and key
[certs] Generating "etcd/server" certificate and key
[certs] etcd/server serving cert is signed for DNS names [k8s-master01 localhost] and IPs [192.168.10.160 127.0.0.1 ::1]
[certs] Generating "etcd/peer" certificate and key
[certs] etcd/peer serving cert is signed for DNS names [k8s-master01 localhost] and IPs [192.168.10.160 127.0.0.1 ::1]
[certs] Generating "etcd/healthcheck-client" certificate and key
[certs] Generating "apiserver-etcd-client" certificate and key
[certs] Generating "sa" key and public key
[kubeconfig] Using kubeconfig folder "/etc/kubernetes"
[kubeconfig] Writing "admin.conf" kubeconfig file
[kubeconfig] Writing "kubelet.conf" kubeconfig file
[kubeconfig] Writing "controller-manager.conf" kubeconfig file
[kubeconfig] Writing "scheduler.conf" kubeconfig file
[kubelet-start] Writing kubelet environment file with flags to file "/var/lib/kubelet/kubeadm-flags.env"
[kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
[kubelet-start] Starting the kubelet
[control-plane] Using manifest folder "/etc/kubernetes/manifests"
[control-plane] Creating static Pod manifest for "kube-apiserver"
[control-plane] Creating static Pod manifest for "kube-controller-manager"
[control-plane] Creating static Pod manifest for "kube-scheduler"
[etcd] Creating static Pod manifest for local etcd in "/etc/kubernetes/manifests"
[wait-control-plane] Waiting for the kubelet to boot up the control plane as static Pods from directory "/etc/kubernetes/manifests". This can take up to 4m0s
[apiclient] All control plane components are healthy after 10.502045 seconds
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
[kubelet] Creating a ConfigMap "kubelet-config-1.20" in namespace kube-system with the configuration for the kubelets in the cluster
[upload-certs] Skipping phase. Please see --upload-certs
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the labels "node-role.kubernetes.io/master=''" and "node-role.kubernetes.io/control-plane='' (deprecated)"
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the taints [node-role.kubernetes.io/master:NoSchedule]
[bootstrap-token] Using token: v05n3g.vy09un3j6x6x4ks3
[bootstrap-token] Configuring bootstrap tokens, cluster-info ConfigMap, RBAC Roles
[bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to get nodes
[bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
[bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
[bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
[bootstrap-token] Creating the "cluster-info" ConfigMap in the "kube-public" namespace
[kubelet-finalize] Updating "/etc/kubernetes/kubelet.conf" to point to a rotatable kubelet client certificate and key
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

kubeadm join 192.168.10.160:6443 --token v05n3g.vy09un3j6x6x4ks3 \
    --discovery-token-ca-cert-hash sha256:a8509e7ea7c53672150ccf9dd1a572718ad21daa03257eeb26bf843e7a27fc19
~~~

### 2.3.6 准备kubectl配置文件

~~~powershell
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS     ROLES                  AGE   VERSION
k8s-master01   NotReady   control-plane,master   19s   v1.20.2
~~~

### 2.3.7 添加工作节点到K8S集群

~~~powershell
[root@k8s-worker01 ~]# kubeadm join 192.168.10.160:6443 --token v05n3g.vy09un3j6x6x4ks3 \
    --discovery-token-ca-cert-hash sha256:a8509e7ea7c53672150ccf9dd1a572718ad21daa03257eeb26bf843e7a27fc19 --cri-socket unix:///var/run/isulad.sock --image-repository k8s.gcr.io
~~~

~~~powershell
[root@k8s-worker01 ~]# kubeadm join 192.168.10.160:6443 --token v05n3g.vy09un3j6x6x4ks3 \
    --discovery-token-ca-cert-hash sha256:a8509e7ea7c53672150ccf9dd1a572718ad21daa03257eeb26bf843e7a27fc19 --cri-socket unix:///var/run/isulad.sock --image-repository k8s.gcr.io
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS     ROLES                  AGE   VERSION
k8s-master01   NotReady   control-plane,master   77s   v1.20.2
k8s-worker01   NotReady   <none>                 19s   v1.20.2
k8s-worker02   NotReady   <none>                 8s    v1.20.2
~~~

### 2.3.8 部署Calico网络插件

>https://projectcalico.docs.tigera.io/about/about-calico

~~~powershell
[root@k8s-master01 ~]# kubectl create -f https://docs.projectcalico.org/archive/v3.21/manifests/tigera-operator.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# wget https://docs.projectcalico.org/archive/v3.21/manifests/custom-resources.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# vim custom-resources.yaml
[root@k8s-master01 ~]# cat custom-resources.yaml
# This section includes base Calico installation configuration.
# For more information, see: https://docs.projectcalico.org/v3.21/reference/installation/api#operator.tigera.io/v1.Installation
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Configures Calico networking.
  calicoNetwork:
    # Note: The ipPools section cannot be modified post-install.
    ipPools:
    - blockSize: 26
      cidr: 10.244.0.0/16
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()

---

# This section configures the Calico API server.
# For more information, see: https://docs.projectcalico.org/v3.21/reference/installation/api#operator.tigera.io/v1.APIServer
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl create -f custom-resources.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods -n calico-system
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-6564f5db75-wppzf   1/1     Running   0          12m
calico-node-hrp98                          1/1     Running   0          12m
calico-node-pkvzt                          1/1     Running   0          12m
calico-node-vcrvc                          1/1     Running   0          12m
calico-typha-cdddcbcf7-vlcgg               1/1     Running   0          12m
calico-typha-cdddcbcf7-zz9tk               1/1     Running   0          12m
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods -n kube-system
NAME                                   READY   STATUS    RESTARTS   AGE
coredns-74ff55c5b-sk9kw                1/1     Running   0          22m
coredns-74ff55c5b-tp4q7                1/1     Running   0          22m
etcd-k8s-master01                      1/1     Running   0          23m
kube-apiserver-k8s-master01            1/1     Running   0          23m
kube-controller-manager-k8s-master01   1/1     Running   0          22m
kube-proxy-hwdnj                       1/1     Running   0          22m
kube-proxy-phmvp                       1/1     Running   0          22m
kube-proxy-qqtg2                       1/1     Running   0          21m
kube-scheduler-k8s-master01            1/1     Running   0          22m
~~~

