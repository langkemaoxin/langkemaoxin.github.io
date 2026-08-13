---
title: 国产化OpenEuler（欧拉）操作系统部署K8S集群
sidebarGroup: K8s 运维笔记
shortTitle: 36 国产化OpenEuler（欧拉）操作系统部署K8
order: 36
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: 国产化OpenEuler（欧拉）操作系统部署K8S集群 需要提前准备好OpenEuler操作系统虚拟机3台，本文使用模板机创建。 一、主机硬件要求 1.1 主机操作系统说明 | 序号 | 操作系统及版...
---

> **K8s 课程笔记 · 第 38 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 国产化OpenEuler（欧拉）操作系统部署K8S集群

> 需要提前准备好OpenEuler操作系统虚拟机3台，本文使用模板机创建。

# 一、主机硬件要求

## 1.1 主机操作系统说明

![image-20230203144251072](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203144251072.png)

![image-20230203144320865](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203144320865.png)

![image-20230203144401430](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203144401430.png)

![image-20230203144502985](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203144502985.png)

![image-20230203144549484](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203144549484.png)

![image-20230203144839193](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203144839193.png)

![image-20230203144924395](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203144924395.png)

| 序号 |     操作系统及版本      |                             备注                             |
| :--: | :---------------------: | :----------------------------------------------------------: |
|  1   | openEuler-22.03-LTS-SP1 | 下载链接：https://repo.openeuler.org/openEuler-22.03-LTS-SP1/ISO/x86_64/openEuler-22.03-LTS-SP1-x86_64-dvd.iso |

## 1.2 主机硬件配置说明

| 需求 | CPU  | 内存 | 硬盘 | 角色         | 主机名       |
| ---- | ---- | ---- | ---- | ------------ | ------------ |
| 值   | 4C   | 4G   | 1TB  | master       | k8s-master01 |
| 值   | 4C   | 4G   | 1TB  | worker(node) | k8s-worker01 |
| 值   | 4C   | 4G   | 1TB  | worker(node) | k8s-worker02 |

# 二、主机准备

## 2.1  主机名配置

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

## 2.2 主机IP地址配置

~~~powershell
k8s-master01节点IP地址为：192.168.10.160/24
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
IPADDR="192.168.10.160"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"
~~~

~~~powershell
k8s-worker1节点IP地址为：192.168.10.161/24
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
IPADDR="192.168.10.161"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"
~~~

~~~powershell
k8s-worker2节点IP地址为：192.168.10.162/24
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
IPADDR="192.168.10.162"
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"

~~~

## 2.3 主机名与IP地址解析

> 所有集群主机均需要进行配置。

~~~powershell
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.160 k8s-master01
192.168.10.161 k8s-worker01
192.168.10.162 k8s-worker02
~~~

## 2.4  防火墙配置

> 所有主机均需要操作。

~~~powershell
关闭现有防火墙firewalld
# systemctl disable firewalld
# systemctl stop firewalld
# firewall-cmd --state
not running
~~~

## 2.5 SELINUX配置

> 所有主机均需要操作。修改SELinux配置需要重启操作系统。

~~~powershell
# sed -ri 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
~~~

## 2.6 时间同步配置

>所有主机均需要操作。最小化安装系统需要安装ntpdate软件。

~~~powershell
# crontab -l
0 */1 * * * /usr/sbin/ntpdate time1.aliyun.com
~~~

## 2.7  配置内核转发及网桥过滤

>所有主机均需要操作。

~~~powershell
开启内核路由转发
# vim /etc/sysctl.conf
# cat /etc/sysctl.conf
......
net.ipv4.ip_forward=1
......
~~~

~~~powershell
添加网桥过滤及内核转发配置文件
# cat /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
vm.swappiness = 0
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
使用默认配置文件生效
# sysctl -p 
~~~

~~~powershell
使用新添加配置文件生效
# sysctl -p /etc/sysctl.d/k8s.conf
~~~

## 2.8 安装ipset及ipvsadm

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

## 2.9 关闭SWAP分区

> 修改完成后需要重启操作系统，如不重启，可临时关闭，命令为swapoff -a

~~~powershell
临时关闭
# swapoff -a
~~~

~~~powershell
永远关闭swap分区，需要重启操作系统
# cat /etc/fstab
......

# /dev/mapper/openeuler-swap none                    swap    defaults        0 0

在上一行中行首添加#
~~~

# 三、容器运行时工具安装及运行

~~~powershell
查看是否存在docker软件
# yum list | grep docker
pcp-pmda-docker.x86_64                                  5.3.7-2.oe2203sp1                                                                                                               @anaconda
docker-client-java.noarch                               8.11.7-2.oe2203sp1                                                                                                              everything
docker-client-java.src                                  8.11.7-2.oe2203sp1                                                                                                              source
docker-compose.noarch                                   1.22.0-4.oe2203sp1                                                                                                              everything
docker-compose.src                                      1.22.0-4.oe2203sp1                                                                                                              source
docker-engine.src                                       2:18.09.0-316.oe220                                                                                3sp1                         source
docker-engine.x86_64                                    2:18.09.0-316.oe220                                                                                3sp1                         OS
docker-engine.x86_64                                    2:18.09.0-316.oe220                                                                                3sp1                         everything
docker-engine-debuginfo.x86_64                          2:18.09.0-316.oe220                                                                                3sp1                         debuginfo
docker-engine-debugsource.x86_64                        2:18.09.0-316.oe220                                                                                3sp1                         debuginfo
docker-runc.src                                         1.1.3-9.oe2203sp1                                                                                                               update-source
docker-runc.x86_64                                      1.1.3-9.oe2203sp1                                                                                                               update
podman-docker.noarch                                    1:0.10.1-12.oe2203s                                                                                p1                           everything
python-docker.src                                       5.0.3-1.oe2203sp1                                                                                                               source
python-docker-help.noarch                               5.0.3-1.oe2203sp1                                                                                                               everything
python-docker-pycreds.src                               0.4.0-2.oe2203sp1                                                                                                               source
python-dockerpty.src                                    0.4.1-3.oe2203sp1                                                                                                               source
python-dockerpty-help.noarch                            0.4.1-3.oe2203sp1                                                                                                               everything
python3-docker.noarch                                   5.0.3-1.oe2203sp1                                                                                                               everything
python3-docker-pycreds.noarch                           0.4.0-2.oe2203sp1                                                                                                               everything
python3-dockerpty.noarch                                0.4.1-3.oe2203sp1                                                                                                               everything
~~~

~~~powershell
安装docker
# dnf install docker

Last metadata expiration check: 0:53:18 ago on 2023年02月03日 星期五 11时30分19秒.
Dependencies resolved.
===========================================================================================================================================================
 Package                                Architecture                    Version                                          Repository                   Size
===========================================================================================================================================================
Installing:
 docker-engine                          x86_64                          2:18.09.0-316.oe2203sp1                          OS                           38 M
Installing dependencies:
 libcgroup                              x86_64                          0.42.2-3.oe2203sp1                               OS                           96 k

Transaction Summary
===========================================================================================================================================================
Install  2 Packages

Total download size: 39 M
Installed size: 160 M
Is this ok [y/N]: y
Downloading Packages:
(1/2): libcgroup-0.42.2-3.oe2203sp1.x86_64.rpm                                                                             396 kB/s |  96 kB     00:00
(2/2): docker-engine-18.09.0-316.oe2203sp1.x86_64.rpm                                                                       10 MB/s |  38 MB     00:03
-----------------------------------------------------------------------------------------------------------------------------------------------------------
Total                                                                                                                       10 MB/s |  39 MB     00:03
Running transaction check
Transaction check succeeded.
Running transaction test
Transaction test succeeded.
Running transaction
  Preparing        :                                                                                                                                   1/1
  Running scriptlet: libcgroup-0.42.2-3.oe2203sp1.x86_64                                                                                               1/2
  Installing       : libcgroup-0.42.2-3.oe2203sp1.x86_64                                                                                               1/2
  Running scriptlet: libcgroup-0.42.2-3.oe2203sp1.x86_64                                                                                               1/2
  Installing       : docker-engine-2:18.09.0-316.oe2203sp1.x86_64                                                                                      2/2
  Running scriptlet: docker-engine-2:18.09.0-316.oe2203sp1.x86_64                                                                                      2/2
Created symlink /etc/systemd/system/multi-user.target.wants/docker.service → /usr/lib/systemd/system/docker.service.

  Verifying        : docker-engine-2:18.09.0-316.oe2203sp1.x86_64                                                                                      1/2
  Verifying        : libcgroup-0.42.2-3.oe2203sp1.x86_64                                                                                               2/2

Installed:
  docker-engine-2:18.09.0-316.oe2203sp1.x86_64                                     libcgroup-0.42.2-3.oe2203sp1.x86_64

Complete!
~~~

~~~powershell
设置docker开机启动并启动
# systemctl enable --now docker
~~~

~~~powershell
查看docker版本
# docker version
Client:
 Version:           18.09.0
 EulerVersion:      18.09.0.316
 API version:       1.39
 Go version:        go1.17.3
 Git commit:        9b9af2f
 Built:             Tue Dec 27 14:25:30 2022
 OS/Arch:           linux/amd64
 Experimental:      false

Server:
 Engine:
  Version:          18.09.0
  EulerVersion:     18.09.0.316
  API version:      1.39 (minimum version 1.12)
  Go version:       go1.17.3
  Git commit:       9b9af2f
  Built:            Tue Dec 27 14:24:56 2022
  OS/Arch:          linux/amd64
  Experimental:     false
~~~

# 四、K8S软件安装

~~~powershell
安装k8s依赖，连接跟踪
# dnf install conntrack
~~~

~~~powershell
k8s master节点安装
# dnf install -y kubernetes-kubeadm kubernetes-kubelet kubernetes-master
~~~

~~~powershell
k8s worker节点安装
# dnf install -y kubernetes-kubeadm kubernetes-kubelet kubernetes-node
~~~

~~~powershell
# systemctl enable kubelet
~~~

# 五、K8S集群初始化

~~~powershell
[root@k8s-master01 ~]# kubeadm init --apiserver-advertise-address=192.168.10.160 --image-repository registry.aliyuncs.com/google_containers --kubernetes-version v1.20.2 --service-cidr=10.1.0.0/16 --pod-network-cidr=10.244.0.0/16
~~~

~~~powershell
输出：
[init] Using Kubernetes version: v1.20.2
[preflight] Running pre-flight checks
        [WARNING IsDockerSystemdCheck]: detected "cgroupfs" as the Docker cgroup driver. The recommended driver is "systemd". Please follow the guide at https://kubernetes.io/docs/setup/cri/
        [WARNING FileExisting-socat]: socat not found in system path
[preflight] Pulling images required for setting up a Kubernetes cluster
[preflight] This might take a minute or two, depending on the speed of your internet connection
[preflight] You can also perform this action in beforehand using 'kubeadm config images pull'
[certs] Using certificateDir folder "/etc/kubernetes/pki"
[certs] Generating "ca" certificate and key
[certs] Generating "apiserver" certificate and key
[certs] apiserver serving cert is signed for DNS names [k8s-master01 kubernetes kubernetes.default kubernetes.default.svc kubernetes.default.svc.cluster.local] and IPs [10.1.0.1 192.168.10.160]
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
[apiclient] All control plane components are healthy after 6.502722 seconds
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
[kubelet] Creating a ConfigMap "kubelet-config-1.20" in namespace kube-system with the configuration for the kubelets in the cluster
[upload-certs] Skipping phase. Please see --upload-certs
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the labels "node-role.kubernetes.io/master=''" and "node-role.kubernetes.io/control-plane='' (deprecated)"
[mark-control-plane] Marking the node k8s-master01 as control-plane by adding the taints [node-role.kubernetes.io/master:NoSchedule]
[bootstrap-token] Using token: jvx2bb.pfd31288qyqcfsn7
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

kubeadm join 192.168.10.160:6443 --token jvx2bb.pfd31288qyqcfsn7 \
    --discovery-token-ca-cert-hash sha256:740fa71f6c5acf156195ce6989cb49b7a64fd061b8bf56e4b1b684cbedafbd40
~~~

~~~powershell
[root@k8s-master01 ~]# mkdir -p $HOME/.kube
[root@k8s-master01 ~]# sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
[root@k8s-master01 ~]# sudo chown $(id -u):$(id -g) $HOME/.kube/config
~~~

# 六、K8S集群工作节点加入

~~~powershell
[root@k8s-worker01 ~]# kubeadm join 192.168.10.160:6443 --token jvx2bb.pfd31288qyqcfsn7 \
    --discovery-token-ca-cert-hash sha256:740fa71f6c5acf156195ce6989cb49b7a64fd061b8bf56e4b1b684cbedafbd40
~~~

~~~powershell
[root@k8s-worker02 ~]# kubeadm join 192.168.10.160:6443 --token jvx2bb.pfd31288qyqcfsn7 \
    --discovery-token-ca-cert-hash sha256:740fa71f6c5acf156195ce6989cb49b7a64fd061b8bf56e4b1b684cbedafbd40
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS     ROLES                  AGE     VERSION
k8s-master01   NotReady   control-plane,master   3m59s   v1.20.2
k8s-worker01   NotReady   <none>                 18s     v1.20.2
k8s-worker02   NotReady   <none>                 10s     v1.20.2
~~~

# 七、K8S集群网络插件使用

~~~powershell
[root@k8s-master01 ~]# wget https://docs.projectcalico.org/v3.19/manifests/calico.yaml
~~~

~~~powershell
[root@k8s-master01 ~]# vim calico.yaml
以下两行默认没有开启，开始后修改第二行为kubeadm初始化使用指定的pod network即可。
3680             # The default IPv4 pool to create on startup if none exists. Pod IPs will be
3681             # chosen from this range. Changing this value after installation will have
3682             # no effect. This should fall within `--cluster-cidr`.
3683             - name: CALICO_IPV4POOL_CIDR
3684               value: "10.244.0.0/16"
3685             # Disable file logging so `kubectl logs` works.
3686             - name: CALICO_DISABLE_FILE_LOGGING
3687               value: "true"
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl create -f calico.yaml
configmap/calico-config created
customresourcedefinition.apiextensions.k8s.io/bgpconfigurations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/bgppeers.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/blockaffinities.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/clusterinformations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/felixconfigurations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/globalnetworkpolicies.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/globalnetworksets.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/hostendpoints.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipamblocks.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipamconfigs.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipamhandles.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ippools.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/kubecontrollersconfigurations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/networkpolicies.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/networksets.crd.projectcalico.org created
clusterrole.rbac.authorization.k8s.io/calico-kube-controllers created
clusterrolebinding.rbac.authorization.k8s.io/calico-kube-controllers created
clusterrole.rbac.authorization.k8s.io/calico-node created
clusterrolebinding.rbac.authorization.k8s.io/calico-node created
daemonset.apps/calico-node created
serviceaccount/calico-node created
deployment.apps/calico-kube-controllers created
serviceaccount/calico-kube-controllers created
poddisruptionbudget.policy/calico-kube-controllers created
~~~

~~~powershell
[root@k8s-master01 calicodir]# kubectl get pods -n kube-system
NAME                                       READY   STATUS    RESTARTS   AGE
calico-kube-controllers-848c5d445f-rq4h2   1/1     Running   0          10m
calico-node-kjrcb                          1/1     Running   0          10m
calico-node-ssx5m                          1/1     Running   0          10m
calico-node-v9fgt                          1/1     Running   0          10m
coredns-7f89b7bc75-9j4rw                   1/1     Running   0          166m
coredns-7f89b7bc75-srhxf                   1/1     Running   0          166m
etcd-k8s-master01                          1/1     Running   0          166m
kube-apiserver-k8s-master01                1/1     Running   0          166m
kube-controller-manager-k8s-master01       1/1     Running   0          166m
kube-proxy-4xhms                           1/1     Running   0          163m
kube-proxy-njg9s                           1/1     Running   0          166m
kube-proxy-xfb97                           1/1     Running   0          163m
kube-scheduler-k8s-master01                1/1     Running   0          166m
~~~

# 八、应用部署验证及访问验证

~~~powershell
cat >  nginx.yaml  << "EOF"
---
apiVersion: v1
kind: ReplicationController
metadata:
  name: nginx-web
spec:
  replicas: 2
  selector:
    name: nginx
  template:
    metadata:
      labels:
        name: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.19.6
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service-nodeport
spec:
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30001
      protocol: TCP
  type: NodePort
  selector:
    name: nginx
EOF
~~~

~~~powershell
# kubectl create -f nginx.yaml
replicationcontroller/nginx-web created
service/nginx-service-nodeport created
~~~

~~~powershell
# kubectl get pods
NAME              READY   STATUS    RESTARTS   AGE
nginx-web-7lkfz   1/1     Running   0          31m
nginx-web-n4tj5   1/1     Running   0          31m
~~~

~~~powershell
# kubectl get svc
NAME                     TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE
kubernetes               ClusterIP   10.1.0.1      <none>        443/TCP        30m
nginx-service-nodeport   NodePort    10.1.236.15   <none>        80:30001/TCP   10s
~~~

![image-20230203153028826](/云原生/k8s-ops/k8s-ops-36-国产化openeuler-欧拉-操作系统部署k8s集群/image-20230203153028826.png)

