---
title: "安全容器运行时  Kata"
sidebarGroup: "K8s 课程笔记"
shortTitle: "11 安全容器运行时  Kata"
order: 11
date: 2026-08-13
category: "云原生"
tag:
  - "K8s 课程笔记"
  - "云原生"
  - "课程笔记"
description: "安全容器运行时 Kata Container 一、安全容器运行时 Kata Container出现的原因 Kubernetes目前作为企业级容器平台，企业生产最重要的是安全。众所周知，Docker 容..."
---

> **K8s 课程笔记 · 第 11 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 安全容器运行时  Kata Container

# 一、安全容器运行时 Kata Container出现的原因

Kubernetes目前作为企业级容器平台，企业生产最重要的是安全。众所周知，Docker 容器通过Linux Namespace和Cgroups实现容器之间的资源限制和隔离，在实际运行中各容器资源（网络、存储、计算）仍由宿主机直接提供，这就可能出现某个容器进程夺取整个宿主机控制权的问题，在安全问题上存在一定的隐患。于是，Kata Container和gVisor等安全容器运行时应用而生。

Kata Containers弥补了传统容器技术安全性的缺点，Kata Containers通过使用硬件虚拟化来达到容器隔离的目的。每一个container/pod 都是基于一个独立的kernel实例来作为一个轻量级的虚拟机。自从每一个container/pod运行与独立的虚拟机上，它们不再从宿主机内核上获取相应所有的权限。

Kata Container 来源于 Intel Clear Containers 和 Hyper runV 项目的合并，它使用传统的虚拟化技术，通过虚拟硬件模拟出了一台“小虚拟机”，然后再这台小虚拟机中安装了一个裁剪后的Linux内核来实现容器建的隔离。

gVisor由谷歌公司发布，它通过为容器进程配置一个用Go语言实现的、在用户态实现的、极小的“独立内核”，通过这个内核控制容器进程向宿主机发起有限可控的系统调用。

![img](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/3b0303524297467b99e53be9e55802bb.png)

1. `  kata containers是由OpenStack基金会管理的容器项目。kata containers整合了Intel的 Clear Containers 和 Hyper.sh 的 runV，能够支持不同平台的硬件，并符合Open Container Initiative规范，同时还可以兼容k8s的 CRI（Container Runtime Interface）接口规范。项目包含几个配套组件，即Runtime，Agent， Proxy，Shim等。项目已于6月份release了1.0版本。  `
2. `  从docker架构上看，kata-container和原来的runc是平级的。大家知道docker只是管理容器生命周期的框架，真正启动容器最早用的是LXC，然后是runc，现在也可以换成kata了。所以说kata-container可以当做docker的一个插件，启动kata-container可以通过docker命令。`

# 二、Kubernetes集成安全运行时 Kata Container

## 2.1 集成原理

Kata Container支持OCI运行时规范，可以以插件形式嵌入到 Docker 中作为低层的容器运行时；也支持 Kubernetes 的 CRI 接口，可以与 CRI-O 和 containerd 集成。由于目前Kubernetes默认的运行时是containerd，下面主要讲解Kata Container如何与containerd集成以及集成后Kubernetes如何使用Kata Container创建负载。

由于Kata Container使用虚拟化技术实现，首先需要集成的Kubernetes环境支持Intel VT-x technology、ARM Hyp mode、IBM Power Systems或IBM Z manframes四种中的任意一种**CPU虚拟化技术**。

## 2.2 集成过程

### 2.2.1 集成前说明

![image-20230717160203046](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230717160203046.png)

Kata Container支持OCI运行时规范，可以以插件形式嵌入到 Docker 中作为低层的容器运行时；也支持 Kubernetes 的 CRI 接口，可以与 CRI-O 和 containerd 集成。由于目前Kubernetes默认的运行时是containerd，下面主要讲解Kata Container如何与containerd集成以及集成后Kubernetes如何使用Kata Container创建负载。

由于Kata Container使用虚拟化技术实现，首先需要集成的Kubernetes环境支持Intel VT-x technology、ARM Hyp mode、IBM Power Systems或IBM Z manframes四种中的任意一种**CPU虚拟化技术**。

**报错**

![image-20230718101647530](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230718101647530.png)

**解决办法**

1、点电脑的开始——搜索[cmd](https://so.csdn.net/so/search?q=cmd&spm=1001.2101.3001.7020) ——鼠标右键以管理员运行，然后输入services.msc回车；
2、在服务中找到 HV主机服务，启动类型设置为禁用；

![image-20230718101816306](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230718101816306.png)

3、再搜索Windows [PowerShell](https://so.csdn.net/so/search?q=PowerShell&spm=1001.2101.3001.7020)（管理员）同样要右键以管理员身份运行（否则可能无法运行）
4、运行命令：bcdedit /set hypervisorlaunchtype off

 最后，重启电脑即可 。

### 2.2.2 k8s集群主机准备

#### 2.2.2.1 主机名配置

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

#### 2.2.2.2  主机IP地址配置

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

#### 2.2.2.3 主机名与IP地址解析

> 所有集群主机均需要进行配置。

~~~powershell
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.140 k8s-master01
192.168.10.141 k8s-worker01
192.168.10.142 k8s-worker02
~~~

#### 2.2.2.4  防火墙配置

> 所有主机均需要操作。

~~~powershell
关闭现有防火墙firewalld
# systemctl disable firewalld
# systemctl stop firewalld
# firewall-cmd --state
not running
~~~

#### 2.2.2.5 SELINUX配置

> 所有主机均需要操作。修改SELinux配置需要重启操作系统。

~~~powershell
# sed -ri 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
~~~

#### 2.2.2.6 时间同步配置

>所有主机均需要操作。最小化安装系统需要安装ntpdate软件。

~~~powershell
# crontab -l
0 */1 * * * /usr/sbin/ntpdate time1.aliyun.com
~~~

#### 2.2.2.7 升级操作系统内核

> 所有主机均需要操作。

~~~powershell
导入elrepo gpg key
# rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
~~~

~~~powershell
安装elrepo YUM源仓库
# yum -y install https://www.elrepo.org/elrepo-release-7.0-4.el7.elrepo.noarch.rpm
~~~

~~~powershell
安装kernel-ml版本，ml为长期稳定版本，lt为长期维护版本
# yum --enablerepo="elrepo-kernel" -y install kernel-lt.x86_64
~~~

~~~powershell
设置grub2默认引导为0
# grub2-set-default 0
~~~

~~~powershell
重新生成grub2引导文件
# grub2-mkconfig -o /boot/grub2/grub.cfg
~~~

~~~powershell
更新后，需要重启，使用升级的内核生效。
# reboot
~~~

~~~powershell
重启后，需要验证内核是否为更新对应的版本
# uname -r
~~~

#### 2.2.2.8  配置内核转发及网桥过滤

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
设置modprobe命令开机执行，此方法不安全，建议使用下小节中的方法。
[root@k8s-master01 ~]# vim /etc/rc.d/rc.local
[root@k8s-master01 ~]# cat /etc/rc.d/rc.local
#!/bin/bash
# THIS FILE IS ADDED FOR COMPATIBILITY PURPOSES
#
# It is highly advisable to create own systemd services or udev rules
# to run scripts during boot instead of using this file.
#
# In contrast to previous versions due to parallel execution during boot
# this script will NOT be run after all other services.
#
# Please note that you must run 'chmod +x /etc/rc.d/rc.local' to ensure
# that this script will be executed during boot.

touch /var/lock/subsys/local
modprobe br_netfilter
[root@k8s-master01 ~]# ls -l /etc/rc.d/rc.local
-rw-r--r-- 1 root root 495 7月  18 07:52 /etc/rc.d/rc.local

[root@k8s-master01 ~]# chmod +x /etc/rc.d/rc.local
[root@k8s-master01 ~]# ls -l /etc/rc.d/rc.local
-rwxr-xr-x 1 root root 495 7月  18 07:52 /etc/rc.d/rc.local
~~~

#### 2.2.2.9 安装ipset及ipvsadm

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

#### 2.2.2.10 关闭SWAP分区

> 修改完成后需要重启操作系统，如不重启，可临时关闭，命令为swapoff -a

~~~powershell
永远关闭swap分区，需要重启操作系统
# cat /etc/fstab
......

# /dev/mapper/centos-swap swap                    swap    defaults        0 0

在上一行中行首添加#
~~~

### 2.2.3 Containerd安装

#### 2.2.3.1 Containerd部署文件获取

![image-20230404104037517](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404104037517.png)

![image-20230404104105753](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404104105753.png)

![image-20230404104133243](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404104133243.png)

![image-20230404110339317](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404110339317.png)

~~~powershell
# wget https://github.com/containerd/containerd/releases/download/v1.7.1/cri-containerd-cni-1.7.1-linux-amd64.tar.gz
~~~

~~~powershell
# tar xf cri-containerd-cni-1.7.1-linux-amd64.tar.gz  -C /
~~~

#### 2.2.3.2 Containerd配置文件生成并修改

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

#### 2.2.3.3 Containerd启动及开机自启动

~~~powershell
# systemctl enable --now containerd
~~~

~~~powershell
验证其版本
# containerd --version
~~~

#### 2.2.3.4 runc准备

![image-20230404110955173](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404110955173.png)

![image-20230404111012599](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404111012599.png)

![image-20230404111058832](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404111058832.png)

##### 2.2.3.4.1 libseccomp准备

![image-20230404111223856](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404111223856.png)

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

##### 2.2.3.4.2 runc安装

![image-20230404111621805](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404111621805.png)

~~~powershell
# wget https://github.com/opencontainers/runc/releases/download/v1.1.5/runc.amd64
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

### 2.2.4 Kata Container安装

![image-20230717223039071](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230717223039071.png)

![image-20230717223116987](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230717223116987.png)

![image-20230717223200258](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230717223200258.png)

![image-20230717223246504](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230717223246504.png)

![image-20230717223328369](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230717223328369.png)

~~~powershell
[root@k8s-XXX ~]# wget https://github.com/kata-containers/kata-containers/releases/download/3.1.3/kata-static-3.1.3-x86_64.tar.xz
~~~

~~~powershell
[root@k8s-XXX ~]# ls
kata-static-3.1.3-x86_64.tar.xz
~~~

~~~powershell
[root@k8s-XXX ~]# tar xf kata-static-3.1.3-x86_64.tar.xz
~~~

~~~powershell
[root@k8s-XXX ~]# ls
opt
~~~

~~~powershell
[root@k8s-XXX ~]# mv opt/kata /opt
[root@k8s-XXX ~]# ls /opt
kata
~~~

~~~powershell
[root@k8s-XXX ~]# mkdir /etc/kata-containers
~~~

~~~powershell
[root@k8s-XXX ~]# cp /opt/kata/share/defaults/kata-containers/configuration.toml /etc/kata-containers/configuration.toml
~~~

~~~powershell
[root@k8s-XXX ~]# ln -sf /opt/kata/bin/containerd-shim-kata-v2 /usr/local/bin/containerd-shim-kata-v2
[root@k8s-XXX ~]# ln -sf /opt/kata/bin/kata-runtime /usr/local/bin/kata-runtime
[root@k8s-XXX ~]# ln -sf /opt/kata/bin/kata-monitor /usr/local/bin/kata-monitor
~~~

~~~powershell
[root@k8s-XXX ~]# kata-runtime check --no-network-checks
WARN[0000] modprobe insert module failed                 arch=amd64 error="exit status 1" module=vhost_vsock name=kata-runtime output="modprobe: ERROR: could not insert 'vhost_vsock': Device or resource busy\n" pid=94441 source=runtime
ERRO[0000] kernel property vhost_vsock not found         arch=amd64 description="Host Support for Linux VM Sockets" name=vhost_vsock pid=94441 source=runtime type=module
System is capable of running Kata Containers
System can currently create Kata Containers

上述报错原因：linux 检测到在 vmware 环境中运行时，会加载一些 vmware 的模块并使用 vsock 从而产生了冲突，解决方法：
cat > /etc/modprobe.d/blacklist-vmware.conf << EOF 
blacklist vmw_vsock_virtio_transport_common
blacklist vmw_vsock_vmci_transport 
EOF

查看
[root@k8s-XXX ~]# cat /etc/modprobe.d/blacklist-vmware.conf
blacklist vmw_vsock_virtio_transport_common
blacklist vmw_vsock_vmci_transport

重启操作系统后再执行：
[root@k8s-XXX ~]# kata-runtime check --no-network-checks
System is capable of running Kata Containers
System can currently create Kata Containers
~~~

~~~powershell
[root@k8s-XXX ~]# kata-runtime --version
kata-runtime  : 3.1.3
   commit   : ee57732fe08504773b1b5474f2248834ae1fbd66
   OCI specs: 1.0.2-dev
~~~

### 2.2.5 集成Kata-Container到Containerd

~~~powershell
[root@k8s-XXX ~]# vim /etc/containerd/config.toml
[root@k8s-XXX ~]# cat /etc/containerd/config.toml
disabled_plugins = []
imports = []
oom_score = 0
plugin_dir = ""
required_plugins = []
root = "/var/lib/containerd"
state = "/run/containerd"
temp = ""
version = 2

[cgroup]
  path = ""

[debug]
  address = ""
  format = ""
  gid = 0
  level = ""
  uid = 0

[grpc]
  address = "/run/containerd/containerd.sock"
  gid = 0
  max_recv_message_size = 16777216
  max_send_message_size = 16777216
  tcp_address = ""
  tcp_tls_ca = ""
  tcp_tls_cert = ""
  tcp_tls_key = ""
  uid = 0

[metrics]
  address = ""
  grpc_histogram = false

[plugins]

  [plugins."io.containerd.gc.v1.scheduler"]
    deletion_threshold = 0
    mutation_threshold = 100
    pause_threshold = 0.02
    schedule_delay = "0s"
    startup_delay = "100ms"

  [plugins."io.containerd.grpc.v1.cri"]
    cdi_spec_dirs = ["/etc/cdi", "/var/run/cdi"]
    device_ownership_from_security_context = false
    disable_apparmor = false
    disable_cgroup = false
    disable_hugetlb_controller = true
    disable_proc_mount = false
    disable_tcp_service = true
    drain_exec_sync_io_timeout = "0s"
    enable_cdi = false
    enable_selinux = false
    enable_tls_streaming = false
    enable_unprivileged_icmp = false
    enable_unprivileged_ports = false
    ignore_image_defined_volumes = false
    image_pull_progress_timeout = "1m0s"
    max_concurrent_downloads = 3
    max_container_log_line_size = 16384
    netns_mounts_under_state_dir = false
    restrict_oom_score_adj = false
    sandbox_image = "registry.k8s.io/pause:3.9"
    selinux_category_range = 1024
    stats_collect_period = 10
    stream_idle_timeout = "4h0m0s"
    stream_server_address = "127.0.0.1"
    stream_server_port = "0"
    systemd_cgroup = false
    tolerate_missing_hugetlb_controller = true
    unset_seccomp_profile = ""

    [plugins."io.containerd.grpc.v1.cri".cni]
      bin_dir = "/opt/cni/bin"
      conf_dir = "/etc/cni/net.d"
      conf_template = ""
      ip_pref = ""
      max_conf_num = 1
      setup_serially = false

    [plugins."io.containerd.grpc.v1.cri".containerd]
      default_runtime_name = "runc"
      disable_snapshot_annotations = true
      discard_unpacked_layers = false
      ignore_blockio_not_enabled_errors = false
      ignore_rdt_not_enabled_errors = false
      no_pivot = false
      snapshotter = "overlayfs"

      [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        privileged_without_host_devices_all_devices_allowed = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = ""
        sandbox_mode = ""
        snapshotter = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime.options]

      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]

        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
          base_runtime_spec = ""
          cni_conf_dir = ""
          cni_max_conf_num = 0
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          privileged_without_host_devices_all_devices_allowed = false
          runtime_engine = ""
          runtime_path = ""
          runtime_root = ""
          runtime_type = "io.containerd.runc.v2"
          sandbox_mode = "podsandbox"
          snapshotter = ""

          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            BinaryName = ""
            CriuImagePath = ""
            CriuPath = ""
            CriuWorkPath = ""
            IoGid = 0
            IoUid = 0
            NoNewKeyring = false
            NoPivotRoot = false
            Root = ""
            ShimCgroup = ""
            SystemdCgroup = false

        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata] 在此处添加14行内容，可以从上面复制，修改既可。
          base_runtime_spec = ""
          cni_conf_dir = ""
          cni_max_conf_num = 0
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          privileged_without_host_devices_all_devices_allowed = false
          runtime_engine = ""
          runtime_path = ""
          runtime_root = ""
          runtime_type = "io.containerd.kata.v2" 复制后，此处要由runc修改为kata
          sandbox_mode = "podsandbox"
          snapshotter = ""

      [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        privileged_without_host_devices_all_devices_allowed = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = ""
        sandbox_mode = ""
        snapshotter = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime.options]

    [plugins."io.containerd.grpc.v1.cri".image_decryption]
      key_model = "node"

    [plugins."io.containerd.grpc.v1.cri".registry]
      config_path = ""

      [plugins."io.containerd.grpc.v1.cri".registry.auths]

      [plugins."io.containerd.grpc.v1.cri".registry.configs]

      [plugins."io.containerd.grpc.v1.cri".registry.headers]

      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]

    [plugins."io.containerd.grpc.v1.cri".x509_key_pair_streaming]
      tls_cert_file = ""
      tls_key_file = ""

  [plugins."io.containerd.internal.v1.opt"]
    path = "/opt/containerd"

  [plugins."io.containerd.internal.v1.restart"]
    interval = "10s"

  [plugins."io.containerd.internal.v1.tracing"]
    sampling_ratio = 1.0
    service_name = "containerd"

  [plugins."io.containerd.metadata.v1.bolt"]
    content_sharing_policy = "shared"

  [plugins."io.containerd.monitor.v1.cgroups"]
    no_prometheus = false

  [plugins."io.containerd.nri.v1.nri"]
    disable = true
    disable_connections = false
    plugin_config_path = "/etc/nri/conf.d"
    plugin_path = "/opt/nri/plugins"
    plugin_registration_timeout = "5s"
    plugin_request_timeout = "2s"
    socket_path = "/var/run/nri/nri.sock"

  [plugins."io.containerd.runtime.v1.linux"]
    no_shim = false
    runtime = "runc"
    runtime_root = ""
    shim = "containerd-shim"
    shim_debug = false

  [plugins."io.containerd.runtime.v2.task"]
    platforms = ["linux/amd64"]
    sched_core = false

  [plugins."io.containerd.service.v1.diff-service"]
    default = ["walking"]

  [plugins."io.containerd.service.v1.tasks-service"]
    blockio_config_file = ""
    rdt_config_file = ""

  [plugins."io.containerd.snapshotter.v1.aufs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.btrfs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.devmapper"]
    async_remove = false
    base_image_size = ""
    discard_blocks = false
    fs_options = ""
    fs_type = ""
    pool_name = ""
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.native"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.overlayfs"]
    root_path = ""
    upperdir_label = false

  [plugins."io.containerd.snapshotter.v1.zfs"]
    root_path = ""

  [plugins."io.containerd.tracing.processor.v1.otlp"]
    endpoint = ""
    insecure = false
    protocol = ""

  [plugins."io.containerd.transfer.v1.local"]
    config_path = ""
    max_concurrent_downloads = 3
    max_concurrent_uploaded_layers = 3

    [[plugins."io.containerd.transfer.v1.local".unpack_config]]
      differ = ""
      platform = "linux/amd64"
      snapshotter = "overlayfs"

[proxy_plugins]

[stream_processors]

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar"

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar.gzip"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+gzip+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar+gzip"

[timeouts]
  "io.containerd.timeout.bolt.open" = "0s"
  "io.containerd.timeout.metrics.shimstats" = "2s"
  "io.containerd.timeout.shim.cleanup" = "5s"
  "io.containerd.timeout.shim.load" = "5s"
  "io.containerd.timeout.shim.shutdown" = "3s"
  "io.containerd.timeout.task.state" = "2s"

[ttrpc]
  address = ""
  gid = 0
  uid = 0
~~~

~~~powershell
[root@k8s-XXX ~]# systemctl daemon-reload
[root@k8s-XXX ~]# systemctl restart containerd
[root@k8s-XXX ~]# systemctl status containerd
~~~

~~~powershell
[root@k8s-XXX ~]# ctr image pull docker.io/library/busybox:latest
~~~

~~~powershell
[root@k8s-XXX ~]# ctr run --rm -t docker.io/library/busybox:latest test-kata
/ #
/ # uname -r
5.4.213-1.el7.elrepo.x86_64
~~~

~~~powershell
[root@k8s-XXX ~]# ctr run --runtime "io.containerd.kata.v2" --rm -t docker.io/library/busybox:latest test-kata
/ # uname -r
5.19.2
~~~

~~~powershell
查看kata-env环境变量

[root@k8s-master01 ~]# kata-runtime env
[Kernel]
  Path = "/opt/kata/share/kata-containers/vmlinux-5.19.2-100"
  Parameters = "systemd.unit=kata-containers.target systemd.mask=systemd-networkd.service systemd.mask=systemd-networkd.socket scsi_mod.scan=none"

[Meta]
  Version = "1.0.26"

[Image]
  Path = "/opt/kata/share/kata-containers/kata-ubuntu-latest.image"

[Initrd]
  Path = ""

[Hypervisor]
  MachineType = "q35"
  Version = "QEMU emulator version 7.2.0 (kata-static)\nCopyright (c) 2003-2022 Fabrice Bellard and the QEMU Project developers"
  Path = "/opt/kata/bin/qemu-system-x86_64"
  BlockDeviceDriver = "virtio-scsi"
  EntropySource = "/dev/urandom"
  SharedFS = "virtio-fs"
  VirtioFSDaemon = "/opt/kata/libexec/virtiofsd"
  SocketPath = ""
  Msize9p = 8192
  MemorySlots = 10
  PCIeRootPort = 0
  HotplugVFIOOnRootBus = false
  Debug = false

[Runtime]
  Path = "/opt/kata/bin/kata-runtime"
  GuestSeLinuxLabel = ""
  Debug = false
  Trace = false
  DisableGuestSeccomp = true
  DisableNewNetNs = false
  SandboxCgroupOnly = false
  [Runtime.Config]
    Path = "/etc/kata-containers/configuration.toml"
  [Runtime.Version]
    OCI = "1.0.2-dev"
    [Runtime.Version.Version]
      Semver = "3.1.3"
      Commit = "ee57732fe08504773b1b5474f2248834ae1fbd66"
      Major = 3
      Minor = 1
      Patch = 3

[Host]
  Kernel = "5.4.213-1.el7.elrepo.x86_64"
  Architecture = "amd64"
  VMContainerCapable = true
  SupportVSocks = true
  [Host.Distro]
    Name = "CentOS Linux"
    Version = "7"
  [Host.CPU]
    Vendor = "GenuineIntel"
    Model = "Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz"
    CPUs = 4
  [Host.Memory]
    Total = 4002964
    Free = 186284
    Available = 1873480

[Agent]
  Debug = false
  Trace = false
~~~

### 2.2.6 部署K8S集群

#### 2.2.6.1 K8S集群软件YUM源准备

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

#### 2.2.6.2  K8S集群软件安装

> 所有节点均可安装,本次安装1.27.3

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
# yum -y install  kubeadm-1.27.X-0  kubelet-1.27.X-0 kubectl-1.27.X-0
~~~

#### 2.2.6.3  配置kubelet

>为了实现docker使用的cgroupdriver与kubelet使用的cgroup的一致性，建议修改如下文件内容。

~~~powershell
# vim /etc/sysconfig/kubelet
KUBELET_EXTRA_ARGS="--cgroup-driver=systemd"
~~~

~~~powershell
设置kubelet为开机自启动即可，由于没有生成配置文件，集群初始化后自动启动
# systemctl enable kubelet
~~~

#### 2.2.6.3 K8S集群初始化

~~~powershell
[root@k8s-master01 ~]# kubeadm init --kubernetes-version=v1.27.3 --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=192.168.10.140  --cri-socket unix:///var/run/containerd/containerd.sock
~~~

~~~powershell
输出如下：
[init] Using Kubernetes version: v1.27.3
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
[apiclient] All control plane components are healthy after 4.005070 seconds
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
[kubelet] Creating a ConfigMap "kubelet-config" in namespace kube-system with the configuration for the kubelets in the cluster
[upload-certs] Skipping phase. Please see --upload-certs
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the labels: [node-role.kubernetes.io/control-plane node.kubernetes.io/exclude-from-external-load-balancers]
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the taints [node-role.kubernetes.io/control-plane:NoSchedule]
[bootstrap-token] Using token: 4rb4gz.8g6pqzsk6397gg4f
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

kubeadm join 192.168.10.140:6443 --token 4rb4gz.8g6pqzsk6397gg4f \
        --discovery-token-ca-cert-hash sha256:89da9d3568bdd7a49cb2f52c142cf3332bdcc4850f808102a72b4716804b5fa1
~~~

#### 2.2.6.4  工作节点加入集群

~~~powershell
[root@k8s-worker01 ~]# kubeadm join 192.168.10.140:6443 --token 4rb4gz.8g6pqzsk6397gg4f \
        --discovery-token-ca-cert-hash sha256:89da9d3568bdd7a49cb2f52c142cf3332bdcc4850f808102a72b4716804b5fa1
~~~

~~~powershell
[root@k8s-worker02 ~]#kubeadm join 192.168.10.140:6443 --token 4rb4gz.8g6pqzsk6397gg4f \
        --discovery-token-ca-cert-hash sha256:89da9d3568bdd7a49cb2f52c142cf3332bdcc4850f808102a72b4716804b5fa1
~~~

#### 2.2.6.5  验证K8S集群节点是否可用

~~~powershell
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS   ROLES           AGE   VERSION
k8s-master01   Ready    control-plane   15m   v1.27.3
k8s-worker01   Ready    <none>          13m   v1.27.3
k8s-worker02   Ready    <none>          13m   v1.27.3
~~~

#### 2.2.6.6 网络插件calico部署

> calico访问链接：https://projectcalico.docs.tigera.io/about/about-calico

![image-20230404115348450](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404115348450.png)

![image-20230404115500987](/云原生/k8s-course/k8s-course-11-安全容器运行时-kata/image-20230404115500987.png)

~~~powershell
# kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.25.1/manifests/tigera-operator.yaml
~~~

~~~powershell
# wget https://raw.githubusercontent.com/projectcalico/calico/v3.25.1/manifests/custom-resources.yaml
~~~

~~~powershell
# vim custom-resources.yaml

# cat custom-resources.yaml

# This section includes base Calico installation configuration.
# For more information, see: https://projectcalico.docs.tigera.io/master/reference/installation/api#operator.tigera.io/v1.Installation
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
      cidr: 10.244.0.0/16 修改此行内容为初始化时定义的pod network cidr
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()

---

# This section configures the Calico API server.
# For more information, see: https://projectcalico.docs.tigera.io/master/reference/installation/api#operator.tigera.io/v1.APIServer
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
~~~

~~~powershell
# kubectl create -f custom-resources.yaml

installation.operator.tigera.io/default created
apiserver.operator.tigera.io/default created
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods -n calico-system
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-6bb86c78b4-cnr9l   1/1     Running   0          2m26s
calico-node-86cs9                          1/1     Running   0          2m26s
calico-node-gjgcc                          1/1     Running   0          2m26s
calico-node-hlr69                          1/1     Running   0          2m26s
calico-typha-6f877c9d8f-8f5fb              1/1     Running   0          2m25s
calico-typha-6f877c9d8f-spxqf              1/1     Running   0          2m26s
csi-node-driver-9b8nd                      2/2     Running   0          2m26s
csi-node-driver-rg6dc                      2/2     Running   0          2m26s
csi-node-driver-tf82w                      2/2     Running   0          2m26s
~~~

## 2.3 Kubernetes配置使用Kata Container

配置了Kata Container之后，我们就可以在Kubernetes集群中使用Kata Container进行容器管理了。如上所述，目前containerd中存在两个低层运行时，分别是默认的runC和新接入的Kata Container。那我们该如何告诉 Kubernetes 哪些负载需要使用 Kata Container呢？根据不同的版本，Kata 提供了不同的方式：

- 使用 Kubernetes 的 RuntimeClass（推荐）

- 使用 Kubernetes的untrusted_workload_runtime

### 2.3.1 使用RuntimeClass

#### 2.3.1.1 创建RuntimeClass资源对象

> 上述集成过程中对于Containerd配置既可使用RuntimeClass
>
> 把[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata] 中的 kata 将被作为 RuntimeClass handler 关键字。

~~~powershell
查看containerd配置文件

[root@k8s-master01 ~]# cat /etc/containerd/config.toml
disabled_plugins = []
imports = []
oom_score = 0
plugin_dir = ""
required_plugins = []
root = "/var/lib/containerd"
state = "/run/containerd"
temp = ""
version = 2

[cgroup]
  path = ""

[debug]
  address = ""
  format = ""
  gid = 0
  level = ""
  uid = 0

[grpc]
  address = "/run/containerd/containerd.sock"
  gid = 0
  max_recv_message_size = 16777216
  max_send_message_size = 16777216
  tcp_address = ""
  tcp_tls_ca = ""
  tcp_tls_cert = ""
  tcp_tls_key = ""
  uid = 0

[metrics]
  address = ""
  grpc_histogram = false

[plugins]

  [plugins."io.containerd.gc.v1.scheduler"]
    deletion_threshold = 0
    mutation_threshold = 100
    pause_threshold = 0.02
    schedule_delay = "0s"
    startup_delay = "100ms"

  [plugins."io.containerd.grpc.v1.cri"]
    cdi_spec_dirs = ["/etc/cdi", "/var/run/cdi"]
    device_ownership_from_security_context = false
    disable_apparmor = false
    disable_cgroup = false
    disable_hugetlb_controller = true
    disable_proc_mount = false
    disable_tcp_service = true
    drain_exec_sync_io_timeout = "0s"
    enable_cdi = false
    enable_selinux = false
    enable_tls_streaming = false
    enable_unprivileged_icmp = false
    enable_unprivileged_ports = false
    ignore_image_defined_volumes = false
    image_pull_progress_timeout = "1m0s"
    max_concurrent_downloads = 3
    max_container_log_line_size = 16384
    netns_mounts_under_state_dir = false
    restrict_oom_score_adj = false
    sandbox_image = "registry.k8s.io/pause:3.9"
    selinux_category_range = 1024
    stats_collect_period = 10
    stream_idle_timeout = "4h0m0s"
    stream_server_address = "127.0.0.1"
    stream_server_port = "0"
    systemd_cgroup = false
    tolerate_missing_hugetlb_controller = true
    unset_seccomp_profile = ""

    [plugins."io.containerd.grpc.v1.cri".cni]
      bin_dir = "/opt/cni/bin"
      conf_dir = "/etc/cni/net.d"
      conf_template = ""
      ip_pref = ""
      max_conf_num = 1
      setup_serially = false

    [plugins."io.containerd.grpc.v1.cri".containerd]
      default_runtime_name = "runc"
      disable_snapshot_annotations = true
      discard_unpacked_layers = false
      ignore_blockio_not_enabled_errors = false
      ignore_rdt_not_enabled_errors = false
      no_pivot = false
      snapshotter = "overlayfs"

      [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        privileged_without_host_devices_all_devices_allowed = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = ""
        sandbox_mode = ""
        snapshotter = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime.options]

      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]

        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
          base_runtime_spec = ""
          cni_conf_dir = ""
          cni_max_conf_num = 0
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          privileged_without_host_devices_all_devices_allowed = false
          runtime_engine = ""
          runtime_path = ""
          runtime_root = ""
          runtime_type = "io.containerd.runc.v2"
          sandbox_mode = "podsandbox"
          snapshotter = ""

          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            BinaryName = ""
            CriuImagePath = ""
            CriuPath = ""
            CriuWorkPath = ""
            IoGid = 0
            IoUid = 0
            NoNewKeyring = false
            NoPivotRoot = false
            Root = ""
            ShimCgroup = ""
            SystemdCgroup = false
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata] 注意此处
          base_runtime_spec = ""
          cni_conf_dir = ""
          cni_max_conf_num = 0
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          privileged_without_host_devices_all_devices_allowed = false
          runtime_engine = ""
          runtime_path = ""
          runtime_root = ""
          runtime_type = "io.containerd.kata.v2"
          sandbox_mode = "podsandbox"
          snapshotter = ""

      [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        privileged_without_host_devices_all_devices_allowed = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = ""
        sandbox_mode = ""
        snapshotter = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime.options]

    [plugins."io.containerd.grpc.v1.cri".image_decryption]
      key_model = "node"

    [plugins."io.containerd.grpc.v1.cri".registry]
      config_path = ""

      [plugins."io.containerd.grpc.v1.cri".registry.auths]

      [plugins."io.containerd.grpc.v1.cri".registry.configs]

      [plugins."io.containerd.grpc.v1.cri".registry.headers]

      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]

    [plugins."io.containerd.grpc.v1.cri".x509_key_pair_streaming]
      tls_cert_file = ""
      tls_key_file = ""

  [plugins."io.containerd.internal.v1.opt"]
    path = "/opt/containerd"

  [plugins."io.containerd.internal.v1.restart"]
    interval = "10s"

  [plugins."io.containerd.internal.v1.tracing"]
    sampling_ratio = 1.0
    service_name = "containerd"

  [plugins."io.containerd.metadata.v1.bolt"]
    content_sharing_policy = "shared"

  [plugins."io.containerd.monitor.v1.cgroups"]
    no_prometheus = false

  [plugins."io.containerd.nri.v1.nri"]
    disable = true
    disable_connections = false
    plugin_config_path = "/etc/nri/conf.d"
    plugin_path = "/opt/nri/plugins"
    plugin_registration_timeout = "5s"
    plugin_request_timeout = "2s"
    socket_path = "/var/run/nri/nri.sock"

  [plugins."io.containerd.runtime.v1.linux"]
    no_shim = false
    runtime = "runc"
    runtime_root = ""
    shim = "containerd-shim"
    shim_debug = false

  [plugins."io.containerd.runtime.v2.task"]
    platforms = ["linux/amd64"]
    sched_core = false

  [plugins."io.containerd.service.v1.diff-service"]
    default = ["walking"]

  [plugins."io.containerd.service.v1.tasks-service"]
    blockio_config_file = ""
    rdt_config_file = ""

  [plugins."io.containerd.snapshotter.v1.aufs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.btrfs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.devmapper"]
    async_remove = false
    base_image_size = ""
    discard_blocks = false
    fs_options = ""
    fs_type = ""
    pool_name = ""
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.native"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.overlayfs"]
    root_path = ""
    upperdir_label = false

  [plugins."io.containerd.snapshotter.v1.zfs"]
    root_path = ""

  [plugins."io.containerd.tracing.processor.v1.otlp"]
    endpoint = ""
    insecure = false
    protocol = ""

  [plugins."io.containerd.transfer.v1.local"]
    config_path = ""
    max_concurrent_downloads = 3
    max_concurrent_uploaded_layers = 3

    [[plugins."io.containerd.transfer.v1.local".unpack_config]]
      differ = ""
      platform = "linux/amd64"
      snapshotter = "overlayfs"

[proxy_plugins]

[stream_processors]

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar"

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar.gzip"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+gzip+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar+gzip"

[timeouts]
  "io.containerd.timeout.bolt.open" = "0s"
  "io.containerd.timeout.metrics.shimstats" = "2s"
  "io.containerd.timeout.shim.cleanup" = "5s"
  "io.containerd.timeout.shim.load" = "5s"
  "io.containerd.timeout.shim.shutdown" = "3s"
  "io.containerd.timeout.task.state" = "2s"

[ttrpc]
  address = ""
  gid = 0
  uid = 0
~~~

~~~powershell
创建runtime-kata.yaml文件

[root@k8s-master01 ~]# vim runtime-kata.yaml

[root@k8s-master01 ~]# cat runtime-kata.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata
~~~

~~~powershell
执行部署文件
[root@k8s-master01 ~]# kubectl apply -f runtime-kata.yaml
~~~

~~~powershell
查看已创建runtimeclass
[root@k8s-master01 ~]# kubectl get runtimeclass
NAME   HANDLER   AGE
kata   kata      100m
~~~

#### 2.3.1.2 创建workload使用RuntimeClass

##### 2.3.1.2.1 案例1

~~~powershell
[root@k8s-master01 ~]# vim busybox.yaml
[root@k8s-master01 ~]# cat busybox.yaml
apiVersion: v1
kind: Pod
metadata:
  name: busybox
spec:
  runtimeClassName: kata
  containers:
  - name: busybox
    image: docker.io/library/busybox:latest
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f busybox.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods
NAME      READY   STATUS    RESTARTS   AGE
busybox   1/1     Running   0          110m
[root@k8s-master01 ~]# kubectl get pods -o wide
NAME      READY   STATUS    RESTARTS   AGE    IP             NODE           NOMINATED NODE   READINESS GATES
busybox   1/1     Running   0          110m   10.244.79.67   k8s-worker01   <none>           <none>
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl exec busybox -- uname -r
5.19.2
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl exec -it busybox /bin/sh
kubectl exec [POD] [COMMAND] is DEPRECATED and will be removed in a future version. Use kubectl exec [POD] -- [COMMAND] instead.
/ # ping www.baidu.com
PING www.baidu.com (120.232.145.144): 56 data bytes
64 bytes from 120.232.145.144: seq=0 ttl=127 time=42.869 ms
64 bytes from 120.232.145.144: seq=1 ttl=127 time=43.183 ms
64 bytes from 120.232.145.144: seq=2 ttl=127 time=43.897 ms
64 bytes from 120.232.145.144: seq=3 ttl=127 time=42.970 ms
^C
--- www.baidu.com ping statistics ---
4 packets transmitted, 4 packets received, 0% packet loss
round-trip min/avg/max = 42.869/43.229/43.897 ms
/ # exit
~~~

##### 2.3.1.2.2 案例2

~~~powershell
[root@k8s-master01 ~]# vim deploy-nginx-kata.yaml
[root@k8s-master01 ~]# cat deploy-nginx-kata.yaml
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
      runtimeClassName: kata
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
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f deploy-nginx-kata.yaml
deployment.apps/deploy-nginx-kata created
service/deploy-nginx-kata created
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
deploy-nginx-kata-95cdc45bf-2rf5n   1/1     Running   0          14m
deploy-nginx-kata-95cdc45bf-frr6c   1/1     Running   0          14m
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get svc
NAME                TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
deploy-nginx-kata   ClusterIP   10.105.50.49   <none>        80/TCP    14m
~~~

~~~powershell
[root@k8s-master01 ~]# curl http://10.105.50.49
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
~~~

### 2.3.2 使用untrusted_workload_runtime

> 对于有些版本不匹配的情况，可以使用untrusted_workload_runtime的方式。

~~~powershell
修改containerd配置文件
[root@k8s-XXX ~]# vim /etc/containerd/config.toml
[root@k8s-xxx ~]# cat /etc/containerd/config.toml
disabled_plugins = []
imports = []
oom_score = 0
plugin_dir = ""
required_plugins = []
root = "/var/lib/containerd"
state = "/run/containerd"
temp = ""
version = 2

[cgroup]
  path = ""

[debug]
  address = ""
  format = ""
  gid = 0
  level = ""
  uid = 0

[grpc]
  address = "/run/containerd/containerd.sock"
  gid = 0
  max_recv_message_size = 16777216
  max_send_message_size = 16777216
  tcp_address = ""
  tcp_tls_ca = ""
  tcp_tls_cert = ""
  tcp_tls_key = ""
  uid = 0

[metrics]
  address = ""
  grpc_histogram = false

[plugins]

  [plugins."io.containerd.gc.v1.scheduler"]
    deletion_threshold = 0
    mutation_threshold = 100
    pause_threshold = 0.02
    schedule_delay = "0s"
    startup_delay = "100ms"

  [plugins."io.containerd.grpc.v1.cri"]
    cdi_spec_dirs = ["/etc/cdi", "/var/run/cdi"]
    device_ownership_from_security_context = false
    disable_apparmor = false
    disable_cgroup = false
    disable_hugetlb_controller = true
    disable_proc_mount = false
    disable_tcp_service = true
    drain_exec_sync_io_timeout = "0s"
    enable_cdi = false
    enable_selinux = false
    enable_tls_streaming = false
    enable_unprivileged_icmp = false
    enable_unprivileged_ports = false
    ignore_image_defined_volumes = false
    image_pull_progress_timeout = "1m0s"
    max_concurrent_downloads = 3
    max_container_log_line_size = 16384
    netns_mounts_under_state_dir = false
    restrict_oom_score_adj = false
    sandbox_image = "registry.k8s.io/pause:3.9"
    selinux_category_range = 1024
    stats_collect_period = 10
    stream_idle_timeout = "4h0m0s"
    stream_server_address = "127.0.0.1"
    stream_server_port = "0"
    systemd_cgroup = false
    tolerate_missing_hugetlb_controller = true
    unset_seccomp_profile = ""

    [plugins."io.containerd.grpc.v1.cri".cni]
      bin_dir = "/opt/cni/bin"
      conf_dir = "/etc/cni/net.d"
      conf_template = ""
      ip_pref = ""
      max_conf_num = 1
      setup_serially = false

    [plugins."io.containerd.grpc.v1.cri".containerd]
      default_runtime_name = "runc"
      disable_snapshot_annotations = true
      discard_unpacked_layers = false
      ignore_blockio_not_enabled_errors = false
      ignore_rdt_not_enabled_errors = false
      no_pivot = false
      snapshotter = "overlayfs"

      [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        privileged_without_host_devices_all_devices_allowed = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = ""
        sandbox_mode = ""
        snapshotter = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime.options]

      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]

        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
          base_runtime_spec = ""
          cni_conf_dir = ""
          cni_max_conf_num = 0
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          privileged_without_host_devices_all_devices_allowed = false
          runtime_engine = ""
          runtime_path = ""
          runtime_root = ""
          runtime_type = "io.containerd.runc.v2"
          sandbox_mode = "podsandbox"
          snapshotter = ""

          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            BinaryName = ""
            CriuImagePath = ""
            CriuPath = ""
            CriuWorkPath = ""
            IoGid = 0
            IoUid = 0
            NoNewKeyring = false
            NoPivotRoot = false
            Root = ""
            ShimCgroup = ""
            SystemdCgroup = false
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata]
          base_runtime_spec = ""
          cni_conf_dir = ""
          cni_max_conf_num = 0
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          privileged_without_host_devices_all_devices_allowed = false
          runtime_engine = ""
          runtime_path = ""
          runtime_root = ""
          runtime_type = "io.containerd.kata.v2"
          sandbox_mode = "podsandbox"
          snapshotter = ""

      [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        privileged_without_host_devices_all_devices_allowed = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = "io.containerd.kata.v2" 修改此行内容，添加io.containerd.kata.v2
        sandbox_mode = ""
        snapshotter = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime.options]

    [plugins."io.containerd.grpc.v1.cri".image_decryption]
      key_model = "node"

    [plugins."io.containerd.grpc.v1.cri".registry]
      config_path = ""

      [plugins."io.containerd.grpc.v1.cri".registry.auths]

      [plugins."io.containerd.grpc.v1.cri".registry.configs]

      [plugins."io.containerd.grpc.v1.cri".registry.headers]

      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]

    [plugins."io.containerd.grpc.v1.cri".x509_key_pair_streaming]
      tls_cert_file = ""
      tls_key_file = ""

  [plugins."io.containerd.internal.v1.opt"]
    path = "/opt/containerd"

  [plugins."io.containerd.internal.v1.restart"]
    interval = "10s"

  [plugins."io.containerd.internal.v1.tracing"]
    sampling_ratio = 1.0
    service_name = "containerd"

  [plugins."io.containerd.metadata.v1.bolt"]
    content_sharing_policy = "shared"

  [plugins."io.containerd.monitor.v1.cgroups"]
    no_prometheus = false

  [plugins."io.containerd.nri.v1.nri"]
    disable = true
    disable_connections = false
    plugin_config_path = "/etc/nri/conf.d"
    plugin_path = "/opt/nri/plugins"
    plugin_registration_timeout = "5s"
    plugin_request_timeout = "2s"
    socket_path = "/var/run/nri/nri.sock"

  [plugins."io.containerd.runtime.v1.linux"]
    no_shim = false
    runtime = "runc"
    runtime_root = ""
    shim = "containerd-shim"
    shim_debug = false

  [plugins."io.containerd.runtime.v2.task"]
    platforms = ["linux/amd64"]
    sched_core = false

  [plugins."io.containerd.service.v1.diff-service"]
    default = ["walking"]

  [plugins."io.containerd.service.v1.tasks-service"]
    blockio_config_file = ""
    rdt_config_file = ""

  [plugins."io.containerd.snapshotter.v1.aufs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.btrfs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.devmapper"]
    async_remove = false
    base_image_size = ""
    discard_blocks = false
    fs_options = ""
    fs_type = ""
    pool_name = ""
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.native"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.overlayfs"]
    root_path = ""
    upperdir_label = false

  [plugins."io.containerd.snapshotter.v1.zfs"]
    root_path = ""

  [plugins."io.containerd.tracing.processor.v1.otlp"]
    endpoint = ""
    insecure = false
    protocol = ""

  [plugins."io.containerd.transfer.v1.local"]
    config_path = ""
    max_concurrent_downloads = 3
    max_concurrent_uploaded_layers = 3

    [[plugins."io.containerd.transfer.v1.local".unpack_config]]
      differ = ""
      platform = "linux/amd64"
      snapshotter = "overlayfs"

[proxy_plugins]

[stream_processors]

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar"

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar.gzip"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+gzip+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar+gzip"

[timeouts]
  "io.containerd.timeout.bolt.open" = "0s"
  "io.containerd.timeout.metrics.shimstats" = "2s"
  "io.containerd.timeout.shim.cleanup" = "5s"
  "io.containerd.timeout.shim.load" = "5s"
  "io.containerd.timeout.shim.shutdown" = "3s"
  "io.containerd.timeout.task.state" = "2s"

[ttrpc]
  address = ""
  gid = 0
  uid = 0
~~~

~~~powershell
[root@k8s-XXX ~]# systemctl restart containerd
~~~

> untrusted_workload_runtime 使用 annotations 告诉 Kubernetes 集群哪些负载需要使用 kata-runtime。因此需要使用kata-runtime的资源，只需要在annotations中声明即可。

~~~powershell
[root@k8s-master01 ~]# vim busybox.yaml
[root@k8s-master01 ~]# cat busybox.yaml
apiVersion: v1
kind: Pod
metadata:
  name: busybox-untrusted-workload
  annotations:
    io.kubernetes.cri.untrusted-workload: "true"
spec:
  containers:
  - name: busybox
    image: docker.io/library/busybox:latest
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl create -f busybox.yaml
pod/busybox-untrusted-workload created
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
busybox-untrusted-workload          1/1     Running   0          38s
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl exec -it busybox-untrusted-workload -- uname -r
5.19.2
~~~

### 2.3.3 把kata设置为默认容器运行时

如果想直接把Kata Container作为Kubernetes默认的运行时也是可以的。我们知道Kubernetes默认的低层运行时是runC，如果想把Kata Container设置为默认的低层运行时，在containerd的配置文件中设置default_runtime，重启containerd（systemctl daemon-reload & systemctl restart containerd）后，创建的负载就自动使用Kata Container来进行管理了。

~~~powershell
[root@k8s-master01 ~]# vim /etc/containerd/config.toml
[root@k8s-master01 ~]# cat /etc/containerd/config.toml
disabled_plugins = []
imports = []
oom_score = 0
plugin_dir = ""
required_plugins = []
root = "/var/lib/containerd"
state = "/run/containerd"
temp = ""
version = 2

[cgroup]
  path = ""

[debug]
  address = ""
  format = ""
  gid = 0
  level = ""
  uid = 0

[grpc]
  address = "/run/containerd/containerd.sock"
  gid = 0
  max_recv_message_size = 16777216
  max_send_message_size = 16777216
  tcp_address = ""
  tcp_tls_ca = ""
  tcp_tls_cert = ""
  tcp_tls_key = ""
  uid = 0

[metrics]
  address = ""
  grpc_histogram = false

[plugins]

  [plugins."io.containerd.gc.v1.scheduler"]
    deletion_threshold = 0
    mutation_threshold = 100
    pause_threshold = 0.02
    schedule_delay = "0s"
    startup_delay = "100ms"

  [plugins."io.containerd.grpc.v1.cri"]
    cdi_spec_dirs = ["/etc/cdi", "/var/run/cdi"]
    device_ownership_from_security_context = false
    disable_apparmor = false
    disable_cgroup = false
    disable_hugetlb_controller = true
    disable_proc_mount = false
    disable_tcp_service = true
    drain_exec_sync_io_timeout = "0s"
    enable_cdi = false
    enable_selinux = false
    enable_tls_streaming = false
    enable_unprivileged_icmp = false
    enable_unprivileged_ports = false
    ignore_image_defined_volumes = false
    image_pull_progress_timeout = "1m0s"
    max_concurrent_downloads = 3
    max_container_log_line_size = 16384
    netns_mounts_under_state_dir = false
    restrict_oom_score_adj = false
    sandbox_image = "registry.k8s.io/pause:3.9"
    selinux_category_range = 1024
    stats_collect_period = 10
    stream_idle_timeout = "4h0m0s"
    stream_server_address = "127.0.0.1"
    stream_server_port = "0"
    systemd_cgroup = false
    tolerate_missing_hugetlb_controller = true
    unset_seccomp_profile = ""

    [plugins."io.containerd.grpc.v1.cri".cni]
      bin_dir = "/opt/cni/bin"
      conf_dir = "/etc/cni/net.d"
      conf_template = ""
      ip_pref = ""
      max_conf_num = 1
      setup_serially = false

    [plugins."io.containerd.grpc.v1.cri".containerd]
      default_runtime_name = "runc"
      disable_snapshot_annotations = true
      discard_unpacked_layers = false
      ignore_blockio_not_enabled_errors = false
      ignore_rdt_not_enabled_errors = false
      no_pivot = false
      snapshotter = "overlayfs"

      [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        privileged_without_host_devices_all_devices_allowed = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = "io.containerd.kata.v2" 修改此处，添加io.containerd.kata.v2
        sandbox_mode = ""
        snapshotter = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime.options]

      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]

        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
          base_runtime_spec = ""
          cni_conf_dir = ""
          cni_max_conf_num = 0
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          privileged_without_host_devices_all_devices_allowed = false
          runtime_engine = ""
          runtime_path = ""
          runtime_root = ""
          runtime_type = "io.containerd.runc.v2" 
          sandbox_mode = "podsandbox"
          snapshotter = ""

          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            BinaryName = ""
            CriuImagePath = ""
            CriuPath = ""
            CriuWorkPath = ""
            IoGid = 0
            IoUid = 0
            NoNewKeyring = false
            NoPivotRoot = false
            Root = ""
            ShimCgroup = ""
            SystemdCgroup = false
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata]
          base_runtime_spec = ""
          cni_conf_dir = ""
          cni_max_conf_num = 0
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          privileged_without_host_devices_all_devices_allowed = false
          runtime_engine = ""
          runtime_path = ""
          runtime_root = ""
          runtime_type = "io.containerd.kata.v2"
          sandbox_mode = "podsandbox"
          snapshotter = ""

      [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        privileged_without_host_devices_all_devices_allowed = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = "io.containerd.kata.v2"
        sandbox_mode = ""
        snapshotter = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime.options]

    [plugins."io.containerd.grpc.v1.cri".image_decryption]
      key_model = "node"

    [plugins."io.containerd.grpc.v1.cri".registry]
      config_path = ""

      [plugins."io.containerd.grpc.v1.cri".registry.auths]

      [plugins."io.containerd.grpc.v1.cri".registry.configs]

      [plugins."io.containerd.grpc.v1.cri".registry.headers]

      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]

    [plugins."io.containerd.grpc.v1.cri".x509_key_pair_streaming]
      tls_cert_file = ""
      tls_key_file = ""

  [plugins."io.containerd.internal.v1.opt"]
    path = "/opt/containerd"

  [plugins."io.containerd.internal.v1.restart"]
    interval = "10s"

  [plugins."io.containerd.internal.v1.tracing"]
    sampling_ratio = 1.0
    service_name = "containerd"

  [plugins."io.containerd.metadata.v1.bolt"]
    content_sharing_policy = "shared"

  [plugins."io.containerd.monitor.v1.cgroups"]
    no_prometheus = false

  [plugins."io.containerd.nri.v1.nri"]
    disable = true
    disable_connections = false
    plugin_config_path = "/etc/nri/conf.d"
    plugin_path = "/opt/nri/plugins"
    plugin_registration_timeout = "5s"
    plugin_request_timeout = "2s"
    socket_path = "/var/run/nri/nri.sock"

  [plugins."io.containerd.runtime.v1.linux"]
    no_shim = false
    runtime = "runc"
    runtime_root = ""
    shim = "containerd-shim"
    shim_debug = false

  [plugins."io.containerd.runtime.v2.task"]
    platforms = ["linux/amd64"]
    sched_core = false

  [plugins."io.containerd.service.v1.diff-service"]
    default = ["walking"]

  [plugins."io.containerd.service.v1.tasks-service"]
    blockio_config_file = ""
    rdt_config_file = ""

  [plugins."io.containerd.snapshotter.v1.aufs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.btrfs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.devmapper"]
    async_remove = false
    base_image_size = ""
    discard_blocks = false
    fs_options = ""
    fs_type = ""
    pool_name = ""
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.native"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.overlayfs"]
    root_path = ""
    upperdir_label = false

  [plugins."io.containerd.snapshotter.v1.zfs"]
    root_path = ""

  [plugins."io.containerd.tracing.processor.v1.otlp"]
    endpoint = ""
    insecure = false
    protocol = ""

  [plugins."io.containerd.transfer.v1.local"]
    config_path = ""
    max_concurrent_downloads = 3
    max_concurrent_uploaded_layers = 3

    [[plugins."io.containerd.transfer.v1.local".unpack_config]]
      differ = ""
      platform = "linux/amd64"
      snapshotter = "overlayfs"

[proxy_plugins]

[stream_processors]

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar"

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar.gzip"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+gzip+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar+gzip"

[timeouts]
  "io.containerd.timeout.bolt.open" = "0s"
  "io.containerd.timeout.metrics.shimstats" = "2s"
  "io.containerd.timeout.shim.cleanup" = "5s"
  "io.containerd.timeout.shim.load" = "5s"
  "io.containerd.timeout.shim.shutdown" = "3s"
  "io.containerd.timeout.task.state" = "2s"

[ttrpc]
  address = ""
  gid = 0
  uid = 0
~~~

~~~powershell
[root@k8s-XXX ~]# systemctl restart containerd
~~~

~~~powershell
[root@k8s-master01 ~]# vim busybox.yaml
[root@k8s-master01 ~]# cat busybox.yaml
apiVersion: v1
kind: Pod
metadata:
  name: busybox
spec:
  containers:
  - name: busybox
    image: docker.io/library/busybox:latest
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl apply -f busybox.yaml
pod/busybox created
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods
NAME      READY   STATUS    RESTARTS   AGE
busybox   1/1     Running   0          4s
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl exec busybox -- uname -r
5.19.2
~~~

