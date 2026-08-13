---
title: "K8S集群网络插件Cilium（网络加速器）部署及使用验证"
sidebarGroup: "K8s 课程笔记"
shortTitle: "37 K8S集群网络插件Cilium（网络加速器）..."
order: 37
date: 2026-08-13
category: "云原生"
tag:
  - "K8s 课程笔记"
  - "云原生"
  - "课程笔记"
description: "K8S集群网络插件Cilium（网络加速器）部署及使用验证 K8S集群网络插件Cilium（网络加速器）部署及使用验证使用Cilium网络插件加速K8S集群网络 一、K8S集群主机准备 1.1 主机操..."
---

> **K8s 课程笔记 · 第 37 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# K8S集群网络插件Cilium（网络加速器）部署及使用验证

> K8S集群网络插件Cilium（网络加速器）部署及使用验证使用Cilium网络插件加速K8S集群网络

# 一、K8S集群主机准备

## 1.1 主机操作系统说明

| 序号 | 操作系统及版本 | 备注 |
| :--: | :------------: | :--: |
|  1   |   CentOS7u9    |      |

## 1.2 主机硬件配置说明

| 需求 | CPU  | 内存 | 硬盘   | 角色         | 主机名       |
| ---- | ---- | ---- | ------ | ------------ | ------------ |
| 值   | 8C   | 8G   | 1024GB | master       | k8s-master01 |
| 值   | 8C   | 16G  | 1024GB | worker(node) | k8s-worker01 |
| 值   | 8C   | 16G  | 1024GB | worker(node) | k8s-worker02 |

## 1.3 主机配置

### 1.3.1  主机名配置

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

### 1.3.2 主机IP地址配置

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
~~~

### 1.3.3 主机名与IP地址解析

> 所有集群主机均需要进行配置。

~~~powershell
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.140 k8s-master01
192.168.10.141 k8s-worker01
192.168.10.142 k8s-worker02
~~~

### 1.3.4  防火墙配置

> 所有主机均需要操作。

~~~powershell
关闭现有防火墙firewalld
# systemctl disable firewalld
# systemctl stop firewalld
# firewall-cmd --state
not running
~~~

### 1.3.5 SELINUX配置

> 所有主机均需要操作。修改SELinux配置需要重启操作系统。

~~~powershell
# sed -ri 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
~~~

~~~powershell
# sestatus
~~~

### 1.3.6 时间同步配置

>所有主机均需要操作。最小化安装系统需要安装ntpdate软件。

~~~powershell
# crontab -l
0 */1 * * * /usr/sbin/ntpdate time1.aliyun.com
~~~

### 1.3.7 升级操作系统内核

> 所有主机均需要操作。

Cilium和其他的cni组件最大的不同在于其底层使用了eBPF技术，而该技术对于Linux的系统内核版本有较高的要求，完成的要求可以查看官网的[详细链接](https://docs.cilium.io/en/latest/operations/system_requirements/)，这里我们着重看内核版本、内核参数这两个部分。

**Linux内核版本**
默认情况下我们可以参考cilium官方给出的一个系统要求总结。因为我们是在k8s集群中部署（使用容器），因此只需要关注Linux内核版本和etcd版本即可。根据以往部署的经验我们可以知道1.23.6版本的k8s默认使用的etcd版本是3.5.+，因此我们要重点关注Linux内核版本。

| Requirement            | Minimum Version | In cilium container |
| ---------------------- | --------------- | ------------------- |
| Linux kernel           | >= 4.9.17       | no                  |
| Key-Value store (etcd) | >= 3.1.0        | no                  |
| clang+LLVM             | >= 10.0         | yes                 |
| iproute2               | >= 5.9.0        | yes                 |

>This requirement is only needed if you run cilium-agent natively. If you are using the Cilium container image cilium/cilium, clang+LLVM is included in the container image.
>
>iproute2 is only needed if you run cilium-agent directly on the host machine. iproute2 is included in the cilium/cilium container image.

毫无疑问CentOS7内置的默认内核版本3.10.x版本的内核是无法满足需求的，但是在升级内核之前，我们再看看其他的一些要求。

cilium官方还给出了[一份列表](https://docs.cilium.io/en/latest/operations/system_requirements/#required-kernel-versions-for-advanced-features)描述了各项高级功能对内核版本的要求：

| Cilium Feature                                               | Minimum Kernel Version |
| ------------------------------------------------------------ | ---------------------- |
| [Bandwidth Manager](https://docs.cilium.io/en/latest/network/kubernetes/bandwidth-manager/#bandwidth-manager) | >= 5.1                 |
| [Egress Gateway](https://docs.cilium.io/en/latest/network/egress-gateway/#egress-gateway) | >= 5.2                 |
| VXLAN Tunnel Endpoint (VTEP) Integration                     | >= 5.2                 |
| [WireGuard Transparent Encryption](https://docs.cilium.io/en/latest/security/network/encryption-wireguard/#encryption-wg) | >= 5.6                 |
| Full support for [Session Affinity](https://docs.cilium.io/en/latest/network/kubernetes/kubeproxy-free/#session-affinity) | >= 5.7                 |
| BPF-based proxy redirection                                  | >= 5.7                 |
| Socket-level LB bypass in pod netns                          | >= 5.7                 |
| L3 devices                                                   | >= 5.8                 |
| BPF-based host routing                                       | >= 5.10                |
| IPv6 BIG TCP support                                         | >= 5.19                |
| IPv4 BIG TCP support                                         | >= 6.3                 |

可以看到如果需要满足上面所有需求的话，需要内核版本高于6.3，我们可以直接[使用elrepo源来升级内核](https://tinychen.com/20190612-centos-update-kernel/)到较新的内核版本。

**elrepo源准备**

~~~powershell
导入elrepo gpg key
# rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
~~~

~~~powershell
安装elrepo YUM源仓库
# yum -y install https://www.elrepo.org/elrepo-release-7.0-4.el7.elrepo.noarch.rpm
~~~

**查看elrepo源中支持的内核版本**

~~~powershell
[root@k8s-master01 ~]# yum --disablerepo="*" --enablerepo="elrepo-kernel" list available

 * elrepo-kernel: elrepo.org
可安装的软件包
kernel-lt-devel.x86_64                                                        5.4.213-1.el7.elrepo                                              elrepo-kernel
kernel-lt-doc.noarch                                                          5.4.213-1.el7.elrepo                                              elrepo-kernel
kernel-lt-headers.x86_64                                                      5.4.213-1.el7.elrepo                                              elrepo-kernel
kernel-lt-tools.x86_64                                                        5.4.213-1.el7.elrepo                                              elrepo-kernel
kernel-lt-tools-libs.x86_64                                                   5.4.213-1.el7.elrepo                                              elrepo-kernel
kernel-lt-tools-libs-devel.x86_64                                             5.4.213-1.el7.elrepo                                              elrepo-kernel
kernel-ml.x86_64                                                              5.19.9-1.el7.elrepo                                               elrepo-kernel
kernel-ml-devel.x86_64                                                        5.19.9-1.el7.elrepo                                               elrepo-kernel
kernel-ml-doc.noarch                                                          5.19.9-1.el7.elrepo                                               elrepo-kernel
kernel-ml-headers.x86_64                                                      5.19.9-1.el7.elrepo                                               elrepo-kernel
kernel-ml-tools.x86_64                                                        5.19.9-1.el7.elrepo                                               elrepo-kernel
kernel-ml-tools-libs.x86_64                                                   5.19.9-1.el7.elrepo                                               elrepo-kernel
kernel-ml-tools-libs-devel.x86_64                                             5.19.9-1.el7.elrepo                                               elrepo-kernel
perf.x86_64                                                                   5.19.9-1.el7.elrepo                                               elrepo-kernel
python-perf.x86_64                                                            5.19.9-1.el7.elrepo                                               elrepo-kernel
~~~

**此处ml版本可以满足要求，因为安装ml版本内核即可**

~~~powershell
# yum --enablerepo=elrepo-kernel install kernel-ml -y
~~~

**使用grubby工具查看系统中已经安装的内核版本信息**

~~~powershell
# grubby --info=ALL
index=0
kernel=/boot/vmlinuz-6.4.11-1.el7.elrepo.x86_64
args="ro rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet LANG=zh_CN.UTF-8"
root=/dev/mapper/centos-root
initrd=/boot/initramfs-6.4.11-1.el7.elrepo.x86_64.img
title=CentOS Linux (6.4.11-1.el7.elrepo.x86_64) 7 (Core)
index=1
kernel=/boot/vmlinuz-5.4.213-1.el7.elrepo.x86_64
args="ro rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet LANG=zh_CN.UTF-8"
root=/dev/mapper/centos-root
initrd=/boot/initramfs-5.4.213-1.el7.elrepo.x86_64.img
title=CentOS Linux (5.4.213-1.el7.elrepo.x86_64) 7 (Core)
index=2
kernel=/boot/vmlinuz-3.10.0-1160.76.1.el7.x86_64
args="ro rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet LANG=zh_CN.UTF-8"
root=/dev/mapper/centos-root
initrd=/boot/initramfs-3.10.0-1160.76.1.el7.x86_64.img
title=CentOS Linux (3.10.0-1160.76.1.el7.x86_64) 7 (Core)
index=3
kernel=/boot/vmlinuz-5.4.212-1.el7.elrepo.x86_64
args="ro rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet LANG=zh_CN.UTF-8"
root=/dev/mapper/centos-root
initrd=/boot/initramfs-5.4.212-1.el7.elrepo.x86_64.img
title=CentOS Linux (5.4.212-1.el7.elrepo.x86_64) 7 (Core)
index=4
kernel=/boot/vmlinuz-3.10.0-957.el7.x86_64
args="ro rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet LANG=zh_CN.UTF-8"
root=/dev/mapper/centos-root
initrd=/boot/initramfs-3.10.0-957.el7.x86_64.img
title=CentOS Linux (3.10.0-957.el7.x86_64) 7 (Core)
index=5
kernel=/boot/vmlinuz-0-rescue-f618107e5de3464bbfc77620a718fdd5
args="ro rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet"
root=/dev/mapper/centos-root
initrd=/boot/initramfs-0-rescue-f618107e5de3464bbfc77620a718fdd5.img
title=CentOS Linux (0-rescue-f618107e5de3464bbfc77620a718fdd5) 7 (Core)
index=6
non linux entry
~~~

**设置新安装的6.4.11版本内核为默认内核版本，此处的index=0要和上面查看的内核版本信息一致**

~~~powershell
# grubby --set-default-index=0
~~~

**查看默认内核是否修改成功**

~~~powershell
# grubby --default-kernel
~~~

**重启系统切换到新内核**

~~~powershell
# reboot
~~~

**重启后检查内核版本是否为新的**

~~~powershell
# uname -r
~~~

**Linux内核参数**
首先我们查看自己当前内核版本的参数，基本上可以分为y、n、m三个选项

- y：yes，Build directly into the kernel. 表示该功能被编译进内核中，默认启用
- n：no，Leave entirely out of the kernel. 表示该功能未被编译进内核中，不启用
- m：module，Build as a module, to be loaded if needed. 表示该功能被编译为模块，按需启用

**查看当前使用的内核版本的编译参数**

~~~powershell
# cat /boot/config-$(uname -r)
~~~

**cilium官方对各项功能所需要开启的[内核参数列举](https://docs.cilium.io/en/latest/operations/system_requirements/#linux-kernel)如下：**

>In order for the eBPF feature to be enabled properly, the following kernel configuration options must be enabled. This is typically the case with distribution kernels. When an option can be built as a module or statically linked, either choice is valid.
>
>为了正确启用 eBPF 功能，必须启用以下内核配置选项。这通常因内核版本情况而异。任何一个选项都可以构建为模块或静态链接，两个选择都是有效的。

**暂时只看最基本的`Base Requirements`**

~~~powershell
CONFIG_BPF=y
CONFIG_BPF_SYSCALL=y
CONFIG_NET_CLS_BPF=y
CONFIG_BPF_JIT=y
CONFIG_NET_CLS_ACT=y
CONFIG_NET_SCH_INGRESS=y
CONFIG_CRYPTO_SHA1=y
CONFIG_CRYPTO_USER_API_HASH=y
CONFIG_CGROUPS=y
CONFIG_CGROUP_BPF=y
~~~

**对比我们使用的`6.4.11-1.el7.elrepo.x86_64`内核可以发现有两个模块是为m**

~~~powershell
# egrep "^CONFIG_BPF=|^CONFIG_BPF_SYSCALL=|^CONFIG_NET_CLS_BPF=|^CONFIG_BPF_JIT=|^CONFIG_NET_CLS_ACT=|^CONFIG_NET_SCH_INGRESS=|^CONFIG_CRYPTO_SHA1=|^CONFIG_CRYPTO_USER_API_HASH=|^CONFIG_CGROUPS=|^CONFIG_CGROUP_BPF=" /boot/config-6.4.11-1.el7.elrepo.x86_64
~~~

~~~powershell
输出：
CONFIG_BPF=y
CONFIG_BPF_SYSCALL=y
CONFIG_BPF_JIT=y
CONFIG_CGROUPS=y
CONFIG_CGROUP_BPF=y
CONFIG_NET_SCH_INGRESS=m
CONFIG_NET_CLS_BPF=m
CONFIG_NET_CLS_ACT=y
CONFIG_CRYPTO_SHA1=y
CONFIG_CRYPTO_USER_API_HASH=y
~~~

**缺少的这两个模块我们可以在`/usr/lib/modules/$(uname -r)`目录下面找到它们：**

~~~powershell
[root@k8s-master01 ~]# cd /usr/lib/mod

modprobe.d/     modules/        modules-load.d/
[root@k8s-master01 ~]# cd /usr/lib/modules/

[root@k8s-master01 modules]# ls
3.10.0-1160.76.1.el7.x86_64  3.10.0-957.el7.x86_64        5.4.213-1.el7.elrepo.x86_64
3.10.0-1160.el7.x86_64       5.4.212-1.el7.elrepo.x86_64  6.4.11-1.el7.elrepo.x86_64

[root@k8s-master01 modules]# cd 6.4.11-1.el7.elrepo.x86_64/
~~~

~~~powershell
[root@k8s-master01 6.4.11-1.el7.elrepo.x86_64]# realpath ./kernel/net/sched/sch_ingress.ko
/usr/lib/modules/6.4.11-1.el7.elrepo.x86_64/kernel/net/sched/sch_ingress.ko
~~~

~~~powershell
[root@k8s-master01 6.4.11-1.el7.elrepo.x86_64]# realpath ./kernel/net/sched/cls_bpf.ko
/usr/lib/modules/6.4.11-1.el7.elrepo.x86_64/kernel/net/sched/cls_bpf.ko
~~~

确认相关内核模块存在我们直接加载内核即可：

**直接使用modprobe命令加载**

~~~powershell
# modprobe cls_bpf
# modprobe sch_ingress
~~~

~~~powershell
# lsmod | egrep "cls_bpf|sch_ingress"
sch_ingress            16384  0
cls_bpf                20480  0
~~~

**配置开机自动加载cilium所需相关模块**

~~~powershell
# cat <<EOF | sudo tee /etc/modules-load.d/cilium-base-requirements.conf
cls_bpf
sch_ingress
EOF
~~~

### 1.3.8  配置内核转发及网桥过滤

>所有主机均需要操作。

>配置内核加载`br_netfilter`和`iptables`放行`ipv6`和`ipv4`的流量，确保集群内的容器能够正常通信。

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

### 1.3.9 安装ipset及ipvsadm

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

### 1.3.10 关闭SWAP分区

> 修改完成后需要重启操作系统，如不重启，可临时关闭，命令为swapoff -a

~~~powershell
永远关闭swap分区，需要重启操作系统
# cat /etc/fstab
......

# /dev/mapper/centos-swap swap                    swap    defaults        0 0

在上一行中行首添加#
~~~

# 二、K8S集群容器运行时 Containerd准备

## 2.1 Containerd准备

### 2.1.1 Containerd部署文件获取

![image-20230404104037517](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230404104037517.png)

![image-20230404104105753](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230404104105753.png)

![image-20230816134446235](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230816134446235.png)

![image-20230816134545079](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230816134545079.png)

~~~powershell
# wget https://github.com/containerd/containerd/releases/download/v1.7.3/cri-containerd-1.7.3-linux-amd64.tar.gz
~~~

~~~powershell
# tar xf cri-containerd-1.7.3-linux-amd64.tar.gz  -C /
~~~

### 2.1.2 Containerd配置文件生成并修改

~~~powershell
# mkdir /etc/containerd
~~~

~~~powershell
# containerd config default > /etc/containerd/config.toml
~~~

~~~powershell
# vim /etc/containerd/config.toml

sandbox_image = "registry.k8s.io/pause:3.9" 由3.8修改为3.9
~~~

### 2.1.3 Containerd启动及开机自启动

~~~powershell
# systemctl enable --now containerd
~~~

~~~powershell
验证其版本
# containerd --version
~~~

## 2.2 runc准备

![image-20230404110955173](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230404110955173.png)

![image-20230404111012599](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230404111012599.png)

![image-20230404111058832](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230404111058832.png)

### 2.2.1 libseccomp准备

![image-20230404111223856](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230404111223856.png)

~~~powershell
# wget https://github.com/opencontainers/runc/releases/download/v1.1.5/libseccomp-2.5.4.tar.gz
~~~

~~~powershell
# tar xf libseccomp-2.5.4.tar.gz
~~~

~~~powershell
# cd libseccomp-2.5.4/
~~~

~~~powershell
# yum install gperf -y
~~~

~~~powershell
# ./configure
~~~

~~~powershell
# make && make install
~~~

~~~powershell
# find / -name "libseccomp.so"
~~~

### 2.2.2 runc安装

![image-20230404111621805](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230404111621805.png)

~~~powershell
# wget https://github.com/opencontainers/runc/releases/download/v1.1.9/runc.amd64
~~~

~~~powershell
# chmod +x runc.amd64
~~~

~~~powershell
查找containerd安装时已安装的runc所在的位置，然后替换
# which runc
~~~

~~~powershell
替换containerd安装已安装的runc
# mv runc.amd64 /usr/local/sbin/runc
~~~

~~~powershell
执行runc命令，如果有命令帮助则为正常
# runc
~~~

> 如果运行runc命令时提示：runc: error while loading shared libraries: libseccomp.so.2: cannot open shared object file: No such file or directory，则表明runc没有找到libseccomp，需要检查libseccomp是否安装，本次安装默认就可以查询到。

# 三、K8S集群部署

## 3.1 K8S集群软件YUM源准备

### 3.1.1 google提供YUM源

~~~powershell
# cat > /etc/yum.repos.d/k8s.repo <<EOF
[kubernetes]
name=Kubernetes
baseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg
        https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
EOF
~~~

### 3.1.2 阿里云提供YUM源

~~~powershell
# cat > /etc/yum.repos.d/k8s.repo <<EOF
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
~~~

## 3.2 K8S集群软件安装

### 3.2.1 集群软件安装

> 所有节点均可安装

~~~powershell
默认安装
# yum -y install  kubeadm  kubelet kubectl
~~~

~~~powershell
查看指定版本
# yum list kubeadm.x86_64 --showduplicates | sort -r
# yum list kubelet.x86_64 --showduplicates | sort -r
# yum list kubectl.x86_64 --showduplicates | sort -r
~~~

~~~powershell
安装指定版本
# yum -y install  kubeadm-1.28.X-0  kubelet-1.28.X-0 kubectl-1.28.X-0
~~~

### 3.2.2  配置kubelet

>为了实现docker使用的cgroupdriver与kubelet使用的cgroup的一致性。

>CentOS7使用的是systemd来初始化系统并管理进程，初始化进程会生成并使用一个 root 控制组 (cgroup), 并充当 cgroup 管理器。 Systemd 与 cgroup 集成紧密，并将为每个 systemd 单元分配一个 cgroup。 我们也可以配置容器运行时和 kubelet 使用 cgroupfs。 连同 systemd 一起使用 cgroupfs 意味着将有两个不同的 cgroup 管理器。而当一个系统中同时存在cgroupfs和systemd两者时，容易变得不稳定，因此最好更改设置，令容器运行时和 kubelet 使用 systemd 作为 cgroup 驱动，以此使系统更为稳定。 对于 Docker, 需要设置 native.cgroupdriver=systemd 参数。

>k8s官方有[详细的文档](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/configure-cgroup-driver/)介绍了如何设置kubelet的`cgroup driver`，需要特别注意的是，在1.22版本开始，如果没有手动设置kubelet的cgroup driver，那么默认会设置为systemd

~~~powershell
# vim /etc/sysconfig/kubelet
KUBELET_EXTRA_ARGS="--cgroup-driver=systemd"
~~~

~~~powershell
设置kubelet为开机自启动即可，由于没有生成配置文件，集群初始化后自动启动
# systemctl enable kubelet
~~~

## 3.3 K8S集群初始化

### 3.3.1 获取kubernetes 1.28组件容器镜像

~~~powershell
[root@k8s-master01 ~]# kubeadm config images list
registry.k8s.io/kube-apiserver:v1.28.0
registry.k8s.io/kube-controller-manager:v1.28.0
registry.k8s.io/kube-scheduler:v1.28.0
registry.k8s.io/kube-proxy:v1.28.0
registry.k8s.io/pause:3.9
registry.k8s.io/etcd:3.5.9-0
registry.k8s.io/coredns/coredns:v1.10.1
~~~

~~~powershell
[root@k8s-master01 ~]# kubeadm config images pull
~~~

### 3.3.2 kubernetes 1.28集群初始化

~~~powershell
[root@k8s-master01 ~]# kubeadm init --kubernetes-version=v1.28.0 --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=192.168.10.140  --cri-socket unix:///var/run/containerd/containerd.sock
~~~

~~~powershell
[init] Using Kubernetes version: v1.28.0
[preflight] Running pre-flight checks
[preflight] Pulling images required for setting up a Kubernetes cluster
[preflight] This might take a minute or two, depending on the speed of your internet connection
[preflight] You can also perform this action in beforehand using 'kubeadm config images pull'
[certs] Using certificateDir folder "/etc/kubernetes/pki"
[certs] Generating "ca" certificate and key
[certs] Generating "apiserver" certificate and key
[certs] apiserver serving cert is signed for DNS names [k8s-master01 kubernetes kubernetes.default kubernetes.default.svc kubernetes.default.svc.cluster.local] and IPs [10.96.0.1 192.168.10.140]
[certs] Generating "apiserver-kubelet-client" certificate and key
[certs] Generating "front-proxy-ca" certificate and key
[certs] Generating "front-proxy-client" certificate and key
[certs] Generating "etcd/ca" certificate and key
[certs] Generating "etcd/server" certificate and key
[certs] etcd/server serving cert is signed for DNS names [k8s-master01 localhost] and IPs [192.168.10.140 127.0.0.1 ::1]
[certs] Generating "etcd/peer" certificate and key
[certs] etcd/peer serving cert is signed for DNS names [k8s-master01 localhost] and IPs [192.168.10.140 127.0.0.1 ::1]
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
[apiclient] All control plane components are healthy after 20.502191 seconds
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
[kubelet] Creating a ConfigMap "kubelet-config" in namespace kube-system with the configuration for the kubelets in the cluster
[upload-certs] Skipping phase. Please see --upload-certs
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the labels: [node-role.kubernetes.io/control-plane node.kubernetes.io/exclude-from-external-load-balancers]
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the taints [node-role.kubernetes.io/control-plane:NoSchedule]
[bootstrap-token] Using token: hd74hg.r8l1pe4tivwyjz73
[bootstrap-token] Configuring bootstrap tokens, cluster-info ConfigMap, RBAC Roles
[bootstrap-token] Configured RBAC rules to allow Node Bootstrap tokens to get nodes
[bootstrap-token] Configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
[bootstrap-token] Configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
[bootstrap-token] Configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
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

kubeadm join 192.168.10.140:6443 --token hd74hg.r8l1pe4tivwyjz73 \
        --discovery-token-ca-cert-hash sha256:29a00daed8d96dfa8e913ab4c0a8c4037f1c253a20742ca8913932dd7c8b3bd1
~~~

## 3.3 准备kubectl配置文件

~~~powershell
 mkdir -p $HOME/.kube
 sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
 sudo chown $(id -u):$(id -g) $HOME/.kube/config
~~~

~~~powershell
# echo "source <(kubectl completion bash)" >> ~/.bashrc

# source ~/.bashrc
~~~

## 3.4 工作节点加入集群

~~~powershell
[root@k8s-worker01 ~]# kubeadm join 192.168.10.140:6443 --token hd74hg.r8l1pe4tivwyjz73 \
>         --discovery-token-ca-cert-hash sha256:29a00daed8d96dfa8e913ab4c0a8c4037f1c253a20742ca8913932dd7c8b3bd1 --cri-socket unix:///var/run/containerd/containerd.sock
~~~

~~~powershell
[root@k8s-worker02 ~]# kubeadm join 192.168.10.140:6443 --token hd74hg.r8l1pe4tivwyjz73 \
>         --discovery-token-ca-cert-hash sha256:29a00daed8d96dfa8e913ab4c0a8c4037f1c253a20742ca8913932dd7c8b3bd1 --cri-socket unix:///var/run/containerd/containerd.sock
~~~

## 3.5  验证K8S集群节点是否可用

~~~powershell
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS   ROLES           AGE   VERSION
k8s-master01   Ready    control-plane   15m   v1.28.0
k8s-worker01   Ready    <none>          13m   v1.28.0
k8s-worker02   Ready    <none>          13m   v1.28.0
~~~

# 四、安装K8S集群CNI插件 Cilium

Cilium 是一个用于容器网络领域的开源项目，主要是面向容器而使用，用于提供并透明地保护应用程序工作负载（如应用程序容器或进程）之间的网络连接和负载均衡。

Cilium 在第 3/4 层运行，以提供传统的网络和安全服务，还在第 7 层运行，以保护现代应用协议（如 HTTP, gRPC 和 Kafka）的使用。 Cilium 被集成到常见的容器编排框架中，如 Kubernetes 和 Mesos。

Cilium 的底层基础是 BPF，Cilium 的工作模式是生成内核级别的 BPF 程序与容器直接交互。区别于为容器创建 overlay 网络，Cilium 允许每个容器分配一个 IPv6 地址（或者 IPv4 地址），使用容器标签而不是网络路由规则去完成容器间的网络隔离。它还包含创建并实施 Cilium 规则的编排系统的整合。

![image-20230904111512204](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230904111512204.png)

## 4.1 安装cilium

快速安装的教程可以参考[官网文档](https://docs.cilium.io/en/latest/gettingstarted/k8s-install-default/)，基本的安装思路就是先下载cilium官方的cli工具，然后使用cli工具进行安装。

这种安装方式的优势就是简单快捷，缺点就是缺少自定义参数配置的功能，只能使用官方原先设置的默认参数，比较适合快速初始化搭建可用环境用来学习和测试。

**cilium的cli工具是一个二进制的可执行文件**

~~~powershell
# curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/latest/download/cilium-linux-amd64.tar.gz{,.sha256sum}
~~~

~~~powershell
# sha256sum --check cilium-linux-amd64.tar.gz.sha256sum

cilium-linux-amd64.tar.gz: 确定
~~~

~~~powershell
# tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin

输出：
cilium
~~~

~~~powershell
# cilium version
cilium-cli: v0.15.6 compiled with go1.21.0 on linux/amd64
~~~

**使用该命令即可完成cilium的安装**

~~~powershell
[root@k8s-master01 ~]# cilium install
~~~

~~~powershell
输出：
ℹ️  Using Cilium version 1.14.0
🔮 Auto-detected cluster name: kubernetes
🔮 Auto-detected datapath mode: tunnel
🔮 Auto-detected kube-proxy has been installed
~~~

**查看cilium的状态**

~~~powershell
[root@k8s-master01 ~]# cilium status
    /¯¯\
 /¯¯\__/¯¯\    Cilium:             OK
 \__/¯¯\__/    Operator:           OK
 /¯¯\__/¯¯\    Envoy DaemonSet:    disabled (using embedded mode)
 \__/¯¯\__/    Hubble Relay:       disabled
    \__/       ClusterMesh:        disabled

Deployment             cilium-operator    Desired: 1, Ready: 1/1, Available: 1/1
DaemonSet              cilium             Desired: 3, Ready: 3/3, Available: 3/3
Containers:            cilium             Running: 3
                       cilium-operator    Running: 1
Cluster Pods:          2/2 managed by Cilium
Helm chart version:    1.14.0
Image versions         cilium             quay.io/cilium/cilium:v1.14.0@sha256:5a94b561f4651fcfd85970a50bc78b201cfbd6e2ab1a03848eab25a82832653a: 3
                       cilium-operator    quay.io/cilium/operator-generic:v1.14.0@sha256:3014d4bcb8352f0ddef90fa3b5eb1bbf179b91024813a90a0066eb4517ba93c9: 1
~~~

## 4.2 配置网络流量数据观测服务 hubble

我们先使用cilium-cli工具在k8s集群中部署hubble，只需要下面一条命令即可

~~~powershell
[root@k8s-master01 ~]# cilium hubble enable
~~~

~~~powershell
[root@k8s-master01 ~]# cilium status
    /¯¯\
 /¯¯\__/¯¯\    Cilium:             OK
 \__/¯¯\__/    Operator:           OK
 /¯¯\__/¯¯\    Envoy DaemonSet:    disabled (using embedded mode)
 \__/¯¯\__/    Hubble Relay:       OK
    \__/       ClusterMesh:        disabled

Deployment             hubble-relay       Desired: 1, Ready: 1/1, Available: 1/1
Deployment             cilium-operator    Desired: 1, Ready: 1/1, Available: 1/1
DaemonSet              cilium             Desired: 3, Ready: 3/3, Available: 3/3
Containers:            cilium-operator    Running: 1
                       hubble-relay       Running: 1
                       cilium             Running: 3
Cluster Pods:          3/3 managed by Cilium
Helm chart version:    1.14.0
Image versions         cilium             quay.io/cilium/cilium:v1.14.0@sha256:5a94b561f4651fcfd85970a50bc78b201cfbd6e2ab1a03848eab25a82832653a: 3
                       cilium-operator    quay.io/cilium/operator-generic:v1.14.0@sha256:3014d4bcb8352f0ddef90fa3b5eb1bbf179b91024813a90a0066eb4517ba93c9: 1
                       hubble-relay       quay.io/cilium/hubble-relay:v1.14.0@sha256:bfe6ef86a1c0f1c3e8b105735aa31db64bcea97dd4732db6d0448c55a3c8e70c: 1
~~~

>当 Hubble（哈勃望远镜） 作为 Cilium 管理集群的一部分启用时，每个节点上运行的 Cilium Agent 将**重新启动**，以启用 Hubble gRPC 服务，提供节点本地可观测性（会损耗一部分性能，但这是值得的）。为了实现集群范围内的可观测性，集群中将添加 hubble relay deploy 以及两个附加服务：Hubble Observer 服务和 the Hubble Peer 服务。
>
>
>
>Hubble Relay Deploy 通过充当整个集群的 Hubble Observer 服务和每个 Cilium Agent 提供的 Hubble gRPC 服务之间的中介，提供集群范围内的可观测性。
>
>
>
>Hubble Peer 服务可让 Hubble Relay 在集群中启用新的 Hubble Cilium 代理时进行检测。作为用户，通常会使用 Hubble CLI 工具或 Hubble UI 与 Hubble Observer 服务交互，以便深入了解 Hubble 提供的群集网络流量。

**安装hubble-cli工具，安装逻辑和cilium-cli的逻辑相似**

~~~powershell
[root@k8s-master01 ~]# export HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
~~~

~~~powershell
[root@k8s-master01 ~]# echo $HUBBLE_VERSION
v0.12.0
~~~

~~~powershell
[root@k8s-master01 ~]# curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz{,.sha256sum}
~~~

~~~powershell
[root@k8s-master01 ~]# sha256sum --check hubble-linux-amd64.tar.gz.sha256sum
hubble-linux-amd64.tar.gz: 确定
~~~

~~~powershell
[root@k8s-master01 ~]# tar xzvfC hubble-linux-amd64.tar.gz /usr/local/bin
hubble
~~~

**首先我们要开启hubble的api，使用cilium-cli开启转发**

> 为了访问 Hubble API，请创建一个从本地计算机转发到 Hubble 服务的端口。这将允许您将 Hubble 客户端连接到本地端口`4245`并访问 Kubernetes 集群中的 Hubble Relay 服务。

~~~powershell
[root@k8s-master01 ~]# cilium hubble port-forward &
[1] 52886
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get service -n kube-system
NAME           TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                  AGE
hubble-peer    ClusterIP   10.101.186.92    <none>        443/TCP                  22m
hubble-relay   ClusterIP   10.106.125.127   <none>        80/TCP                   10m
kube-dns       ClusterIP   10.96.0.10       <none>        53/UDP,53/TCP,9153/TCP   42m
~~~

~~~powershell
[root@k8s-master01 ~]# ss -anput | grep 4245
tcp    LISTEN     0      4096   127.0.0.1:4245                  *:*                   users:(("kubectl",pid=52897,fd=8))
~~~

~~~powershell
实际上执行的操作等同于下面这个命令
kubectl port-forward -n kube-system svc/hubble-relay --address 0.0.0.0 --address :: 4245:80
~~~

**测试和hubble-api的连通性**

~~~powershell
[root@k8s-master01 ~]# hubble status
Healthcheck (via localhost:4245): Ok
Current/Max Flows: 8,305/12,285 (67.60%)
Flows/s: 7.24
Connected Nodes: 3/3
~~~

**使用hubble命令查看数据的转发情况**

~~~powershell
[root@k8s-master01 ~]# hubble observe
Aug 22 10:10:44.610: 10.0.1.210:49016 (host) <- 10.0.1.53:4240 (health) to-stack FORWARDED (TCP Flags: ACK)
Aug 22 10:10:44.610: 10.0.1.210:49016 (host) -> 10.0.1.53:4240 (health) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:44.610: 10.0.2.138:44182 (remote-node) <- 10.0.1.53:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:44.611: 10.0.2.138:44182 (remote-node) -> 10.0.1.53:4240 (health) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:46.658: 10.0.0.251:60190 (remote-node) <- 10.0.1.53:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:46.658: 10.0.0.251:60190 (remote-node) -> 10.0.1.53:4240 (health) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:47.079: 10.0.1.210:5353 (host) <> 224.0.0.251:5353 (world) Stale or unroutable IP DROPPED (UDP)
Aug 22 10:10:47.173: 10.0.1.210:5353 (host) <> 224.0.0.251:5353 (world) Stale or unroutable IP DROPPED (UDP)
Aug 22 10:10:47.424: 10.0.1.210:5353 (host) <> 224.0.0.251:5353 (world) Stale or unroutable IP DROPPED (UDP)
Aug 22 10:10:47.675: 10.0.1.210:5353 (host) <> 224.0.0.251:5353 (world) Stale or unroutable IP DROPPED (UDP)
Aug 22 10:10:47.876: 10.0.1.210:5353 (host) <> 224.0.0.251:5353 (world) Stale or unroutable IP DROPPED (UDP)
Aug 22 10:10:48.919: 10.0.1.210:5353 (host) <> 224.0.0.251:5353 (world) Stale or unroutable IP DROPPED (UDP)
Aug 22 10:10:50.965: 10.0.1.210:5353 (host) <> 224.0.0.251:5353 (world) Stale or unroutable IP DROPPED (UDP)
Aug 22 10:10:52.585: 10.0.0.251:5353 (host) <> 224.0.0.251:5353 (world) Stale or unroutable IP DROPPED (UDP)
Aug 22 10:10:55.943: 10.0.2.138:33306 (host) -> kube-system/hubble-relay-755f48648b-qxp6n:4245 (ID:30548) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:55.943: 10.0.2.138:33302 (host) -> kube-system/hubble-relay-755f48648b-qxp6n:4245 (ID:30548) to-endpoint FORWARDED (TCP Flags: ACK, FIN)
Aug 22 10:10:55.943: 10.0.2.138:33302 (host) <- kube-system/hubble-relay-755f48648b-qxp6n:4245 (ID:30548) to-stack FORWARDED (TCP Flags: ACK, PSH)
Aug 22 10:10:55.943: 10.0.2.138:33306 (host) -> kube-system/hubble-relay-755f48648b-qxp6n:4245 (ID:30548) to-endpoint FORWARDED (TCP Flags: ACK, FIN)
Aug 22 10:10:55.943: 10.0.2.138:33302 (host) -> kube-system/hubble-relay-755f48648b-qxp6n:4245 (ID:30548) to-endpoint FORWARDED (TCP Flags: RST)
Aug 22 10:10:55.943: 10.0.2.138:33306 (host) <- kube-system/hubble-relay-755f48648b-qxp6n:4245 (ID:30548) to-stack FORWARDED (TCP Flags: ACK, PSH)
Aug 22 10:10:55.943: 10.0.2.138:33306 (host) -> kube-system/hubble-relay-755f48648b-qxp6n:4245 (ID:30548) to-endpoint FORWARDED (TCP Flags: RST)
Aug 22 10:10:56.549: kube-system/coredns-5dd5756b68-4lb79:53400 (ID:2208) <- 192.168.10.140:443 (host) to-endpoint FORWARDED (TCP Flags: ACK, PSH)
Aug 22 10:10:56.549: kube-system/coredns-5dd5756b68-4lb79:53400 (ID:2208) -> 192.168.10.140:6443 (host) to-stack FORWARDED (TCP Flags: ACK)
Aug 22 10:10:56.558: 10.0.0.251:48318 (host) -> kube-system/coredns-5dd5756b68-4lb79:8181 (ID:2208) to-endpoint FORWARDED (TCP Flags: SYN)
Aug 22 10:10:56.558: 10.0.0.251:48318 (host) <- kube-system/coredns-5dd5756b68-4lb79:8181 (ID:2208) to-stack FORWARDED (TCP Flags: SYN, ACK)
Aug 22 10:10:56.558: 10.0.0.251:41622 (host) -> kube-system/coredns-5dd5756b68-4lb79:8080 (ID:2208) to-endpoint FORWARDED (TCP Flags: SYN)
Aug 22 10:10:56.558: 10.0.0.251:41622 (host) <- kube-system/coredns-5dd5756b68-4lb79:8080 (ID:2208) to-stack FORWARDED (TCP Flags: SYN, ACK)
Aug 22 10:10:56.558: 10.0.0.251:48318 (host) -> kube-system/coredns-5dd5756b68-4lb79:8181 (ID:2208) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:56.558: 10.0.0.251:41622 (host) -> kube-system/coredns-5dd5756b68-4lb79:8080 (ID:2208) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:56.559: 10.0.0.251:41622 (host) -> kube-system/coredns-5dd5756b68-4lb79:8080 (ID:2208) to-endpoint FORWARDED (TCP Flags: ACK, PSH)
Aug 22 10:10:56.559: 10.0.0.251:48318 (host) -> kube-system/coredns-5dd5756b68-4lb79:8181 (ID:2208) to-endpoint FORWARDED (TCP Flags: ACK, PSH)
Aug 22 10:10:56.559: 10.0.0.251:48318 (host) <- kube-system/coredns-5dd5756b68-4lb79:8181 (ID:2208) to-stack FORWARDED (TCP Flags: ACK, PSH)
Aug 22 10:10:56.559: 10.0.0.251:41622 (host) <- kube-system/coredns-5dd5756b68-4lb79:8080 (ID:2208) to-stack FORWARDED (TCP Flags: ACK, PSH)
Aug 22 10:10:56.559: 10.0.0.251:48318 (host) <- kube-system/coredns-5dd5756b68-4lb79:8181 (ID:2208) to-stack FORWARDED (TCP Flags: ACK, FIN)
Aug 22 10:10:56.559: 10.0.0.251:41622 (host) <- kube-system/coredns-5dd5756b68-4lb79:8080 (ID:2208) to-stack FORWARDED (TCP Flags: ACK, FIN)
Aug 22 10:10:56.559: 10.0.0.251:48318 (host) -> kube-system/coredns-5dd5756b68-4lb79:8181 (ID:2208) to-endpoint FORWARDED (TCP Flags: ACK, FIN)
Aug 22 10:10:56.559: 10.0.0.251:41622 (host) -> kube-system/coredns-5dd5756b68-4lb79:8080 (ID:2208) to-endpoint FORWARDED (TCP Flags: ACK, FIN)
Aug 22 10:10:57.691: kube-system/hubble-relay-755f48648b-qxp6n:51940 (ID:30548) -> 192.168.10.141:4244 (host) to-stack FORWARDED (TCP Flags: ACK)
Aug 22 10:10:57.691: kube-system/hubble-relay-755f48648b-qxp6n:55112 (ID:30548) -> 192.168.10.140:4244 (kube-apiserver) to-stack FORWARDED (TCP Flags: ACK)
Aug 22 10:10:57.691: kube-system/hubble-relay-755f48648b-qxp6n:51940 (ID:30548) <- 192.168.10.141:4244 (host) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:57.691: kube-system/hubble-relay-755f48648b-qxp6n:55112 (ID:30548) <- 192.168.10.140:4244 (kube-apiserver) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:57.691: kube-system/hubble-relay-755f48648b-qxp6n:59766 (ID:30548) -> 192.168.10.142:4244 (remote-node) to-stack FORWARDED (TCP Flags: ACK)
Aug 22 10:10:57.691: kube-system/hubble-relay-755f48648b-qxp6n:59766 (ID:30548) <- 192.168.10.142:4244 (remote-node) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.418: 10.0.1.210:47334 (remote-node) -> 10.0.2.137:4240 (health) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.418: 10.0.1.210:47334 (remote-node) <- 10.0.2.137:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.455: 10.0.1.210:35036 (remote-node) -> 10.0.0.221:4240 (health) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.455: 10.0.1.210:35036 (remote-node) <- 10.0.0.221:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.458: 10.0.1.210:49016 (host) -> 10.0.1.53:4240 (health) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.458: 10.0.1.210:49016 (host) <- 10.0.1.53:4240 (health) to-stack FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.458: 10.0.1.210:35036 (remote-node) <> 10.0.0.221:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.458: 10.0.1.210:47334 (remote-node) <> 10.0.2.137:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.739: 10.0.2.138:57972 (host) -> 10.0.2.137:4240 (health) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.739: 10.0.2.138:44182 (remote-node) <> 10.0.1.53:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.739: 10.0.2.138:57972 (host) <- 10.0.2.137:4240 (health) to-stack FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.739: 10.0.2.138:48560 (remote-node) <> 10.0.0.221:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.776: 10.0.2.138:48560 (remote-node) -> 10.0.0.221:4240 (health) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.780: 10.0.2.138:44182 (remote-node) -> 10.0.1.53:4240 (health) to-endpoint FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.780: 10.0.1.210:47334 (remote-node) <> 10.0.2.137:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.780: 10.0.2.138:44182 (remote-node) <- 10.0.1.53:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
Aug 22 10:10:59.920: 10.0.2.138:48560 (remote-node) <> 10.0.0.221:4240 (health) to-overlay FORWARDED (TCP Flags: ACK)
~~~

~~~powershell
[root@k8s-master01 ~]# ss -anput | grep 4240
tcp    ESTAB      0      0      192.168.10.140:42682              192.168.10.142:4240                users:(("cilium-agent",pid=44437,fd=73))
tcp    ESTAB      0      0      192.168.10.140:56314              192.168.10.140:4240                users:(("cilium-agent",pid=44437,fd=70))
tcp    ESTAB      0      0      10.0.0.251:60190              10.0.1.53:4240                users:(("cilium-agent",pid=44437,fd=77))
tcp    ESTAB      0      0      10.0.0.251:45636              10.0.0.221:4240                users:(("cilium-agent",pid=44437,fd=72))
tcp    ESTAB      0      0      10.0.0.251:50278              10.0.2.137:4240                users:(("cilium-agent",pid=44437,fd=76))
tcp    ESTAB      0      0      192.168.10.140:53882              192.168.10.141:4240                users:(("cilium-agent",pid=44437,fd=82))
tcp    LISTEN     0      4096   [::]:4240               [::]:*                   users:(("cilium-agent",pid=44437,fd=74))

~~~

**开启hubble ui组件**

>为了访问 Hubble 收集的可观测性数据,需要开启hubble ui组件。

~~~powershell
[root@k8s-master01 ~]# cilium hubble enable --ui
~~~

~~~powershell
[root@k8s-master01 ~]# cilium status
    /¯¯\
 /¯¯\__/¯¯\    Cilium:             OK
 \__/¯¯\__/    Operator:           OK
 /¯¯\__/¯¯\    Envoy DaemonSet:    disabled (using embedded mode)
 \__/¯¯\__/    Hubble Relay:       OK
    \__/       ClusterMesh:        disabled

DaemonSet              cilium             Desired: 3, Ready: 3/3, Available: 3/3
Deployment             hubble-ui          Desired: 1, Ready: 1/1, Available: 1/1
Deployment             hubble-relay       Desired: 1, Ready: 1/1, Available: 1/1
Deployment             cilium-operator    Desired: 1, Ready: 1/1, Available: 1/1
Containers:            cilium             Running: 3
                       hubble-ui          Running: 1
                       hubble-relay       Running: 1
                       cilium-operator    Running: 1
Cluster Pods:          4/4 managed by Cilium
Helm chart version:    1.14.0
Image versions         cilium             quay.io/cilium/cilium:v1.14.0@sha256:5a94b561f4651fcfd85970a50bc78b201cfbd6e2ab1a03848eab25a82832653a: 3
                       hubble-ui          quay.io/cilium/hubble-ui:v0.12.0@sha256:1c876cfa1d5e35bc91e1025c9314f922041592a88b03313c22c1f97a5d2ba88f: 1
                       hubble-ui          quay.io/cilium/hubble-ui-backend:v0.12.0@sha256:8a79a1aad4fc9c2aa2b3e4379af0af872a89fcec9d99e117188190671c66fc2e: 1
                       hubble-relay       quay.io/cilium/hubble-relay:v1.14.0@sha256:bfe6ef86a1c0f1c3e8b105735aa31db64bcea97dd4732db6d0448c55a3c8e70c: 1
                       cilium-operator    quay.io/cilium/operator-generic:v1.14.0@sha256:3014d4bcb8352f0ddef90fa3b5eb1bbf179b91024813a90a0066eb4517ba93c9: 1
~~~

**实际上这时候我们再查看k8s集群的状态可以看到部署了一个名为hubble-ui的deployment**

~~~powershell
[root@k8s-master01 ~]# kubectl get deployment -n kube-system | grep hubble
hubble-relay      1/1     1            1           18m
hubble-ui         1/1     1            1           2m1s
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get svc -n kube-system | grep hubble
hubble-peer    ClusterIP   10.101.186.92    <none>        443/TCP                  31m
hubble-relay   ClusterIP   10.106.125.127   <none>        80/TCP                   19m
hubble-ui      ClusterIP   10.108.90.48     <none>        80/TCP                   2m39s
~~~

**将hubble-ui这个服务的80端口暴露到宿主机上面的12000端口上面**

~~~powershell
[root@k8s-master01 ~]# cilium hubble ui &
[2] 57395
~~~

![image-20230822182045407](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230822182045407.png)

![image-20230822181819854](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230822181819854.png)

~~~powershell
实际上执行的操作等同于下面这个命令
kubectl port-forward -n kube-system svc/hubble-ui --address 0.0.0.0 --address :: 12000:80
~~~

![image-20230822181940923](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230822181940923.png)

**最后所有的相关服务都部署完成之后，我们再检查一下整个cilium的状态**

~~~powershell
[root@k8s-master01 ~]# cilium status
    /¯¯\
 /¯¯\__/¯¯\    Cilium:             OK
 \__/¯¯\__/    Operator:           OK
 /¯¯\__/¯¯\    Envoy DaemonSet:    disabled (using embedded mode)
 \__/¯¯\__/    Hubble Relay:       OK
    \__/       ClusterMesh:        disabled

DaemonSet              cilium             Desired: 3, Ready: 3/3, Available: 3/3
Deployment             hubble-ui          Desired: 1, Ready: 1/1, Available: 1/1
Deployment             cilium-operator    Desired: 1, Ready: 1/1, Available: 1/1
Deployment             hubble-relay       Desired: 1, Ready: 1/1, Available: 1/1
Containers:            hubble-ui          Running: 1
                       cilium-operator    Running: 1
                       hubble-relay       Running: 1
                       cilium             Running: 3
Cluster Pods:          4/4 managed by Cilium
Helm chart version:    1.14.0
Image versions         cilium             quay.io/cilium/cilium:v1.14.0@sha256:5a94b561f4651fcfd85970a50bc78b201cfbd6e2ab1a03848eab25a82832653a: 3
                       hubble-ui          quay.io/cilium/hubble-ui:v0.12.0@sha256:1c876cfa1d5e35bc91e1025c9314f922041592a88b03313c22c1f97a5d2ba88f: 1
                       hubble-ui          quay.io/cilium/hubble-ui-backend:v0.12.0@sha256:8a79a1aad4fc9c2aa2b3e4379af0af872a89fcec9d99e117188190671c66fc2e: 1
                       cilium-operator    quay.io/cilium/operator-generic:v1.14.0@sha256:3014d4bcb8352f0ddef90fa3b5eb1bbf179b91024813a90a0066eb4517ba93c9: 1
                       hubble-relay       quay.io/cilium/hubble-relay:v1.14.0@sha256:bfe6ef86a1c0f1c3e8b105735aa31db64bcea97dd4732db6d0448c55a3c8e70c: 1

~~~

# 五、部署Nginx应用验证K8S集群可用性

~~~powershell
[root@k8s-master01 ~]# vim nginx.yaml
[root@k8s-master01 ~]# cat nginx.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginxweb
spec:
  selector:
    matchLabels:
      app: nginxweb1
  replicas: 2
  template:
    metadata:
      labels:
        app: nginxweb1
    spec:
      containers:
      - name: nginxwebc
        image: nginx:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80

---

apiVersion: v1
kind: Service
metadata:
  name: nginxweb-service
spec:
  externalTrafficPolicy: Cluster
  selector:
    app: nginxweb1
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
    nodePort: 30080
  type: NodePort
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f nginx.yaml
deployment.apps/nginxweb created
service/nginxweb-service created
~~~

![image-20230904195628388](/云原生/k8s-course/k8s-course-37-k8s集群网络插件cilium-网络加速器-部署及使用验证/image-20230904195628388.png)

