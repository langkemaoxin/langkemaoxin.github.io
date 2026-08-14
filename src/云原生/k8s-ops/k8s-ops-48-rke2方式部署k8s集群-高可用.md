---
title: RKE2方式部署K8S集群（高可用）
sidebarGroup: K8s 运维笔记
shortTitle: 48 RKE2方式部署K8S集群（高可用）
order: 48
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: 注重K8S安全 RKE2方式部署K8S高可用集群（含IPVS） 一、RKE2部署方式介绍 k8s官方部署安装集群的是使用kubeadm方式，但是该方式比较复杂繁琐，所以产生了一些新的部署安装集群方式，...
---

> **K8s 课程笔记 · 第 50 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 注重K8S安全 RKE2方式部署K8S高可用集群（含IPVS）

# 一、RKE2部署方式介绍

k8s官方部署安装集群的是使用kubeadm方式，但是该方式比较复杂繁琐，所以产生了一些新的部署安装集群方式，比如k3s和rke2等新方式

k3s有着非常庞大的社区支持，部署安装也非常简单，设计为轻量级的k8s，可以很好的运行在物联网设备或者边缘计算设备上面

据rke2官方文档描述说该部署是继承了k3s的可用性、易操作性和部署模式，继承了与上游 Kubernetes 的紧密一致性，在一些地方，K3s 与上游的 Kubernetes 有分歧(k3s魔改了一些k8s组件)，以便为边缘部署进行优化，rke2同时也预设了安全配置，符合各项安全测试规范，但是部署方式上比k3s更复杂一些

整体来看选择k3s和rke2都是可以用于生产环境的选择，如果更注重安全性，可以选择rke2

# 二、主机准备

## 2.1 主机需求说明

- 本次采用Ubuntu操作系统，操作系统版本为22.04。
- 一个注册用IP地址，即主机IP地址。
- 一个奇数Server管理节点（推荐3个），用于运行etcd，kubernetes API以及其它操作平面服务。
- N台工作节点（Node）,用于运行应用程序及服务。
- 执行命令过程中需要sudo权限或切换至root用户运行。

## 2.2 主机硬件配置说明

| 序号 | 主机硬件配置          | IP地址及主机名                 |
| ---- | --------------------- | ------------------------------ |
| 1    | 4CPU,8G内存,1024G硬盘 | 192.168.10.140/24 k8s-master01 |
| 2    | 4CPU,8G内存,1024G硬盘 | 192.168.10.141/24 k8s-master02                               |
| 3    | 4CPU,8G内存,1024G硬盘 | 192.168.10.142/24 k8s-master03                               |
| 4    |          8CPU,8G内存,1024G硬盘             | 192.168.10.143/24 k8s-worker01                          |
| 5    |          8CPU,8G内存,1024G硬盘             |  192.168.10.144/24 k8s-worker02                         |

## 2.3 主机名及IP地址配置

~~~powershell
# hostnamectl set-hostname k8s-XXX
~~~

~~~powershell
# vim /etc/netplan/00-net-manager-all.yaml
# cat /etc/netplan/00-net-manager-all.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: no
      addresses:
        - 192.168.10.14X/24
      routes:
        - to: default
          via: 192.168.10.2
      nameservers:
        addresses: [119.29.29.29,114.114.114.114,8.8.8.8]
~~~

~~~powershell
# netplan apply 
~~~

~~~powershell
# vim /etc/hosts
# cat /etc/hosts
127.0.0.1 localhost
127.0.1.1 node

# The following lines are desirable for IPv6 capable hosts
::1     ip6-localhost ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
192.168.10.140 k8s-master01
192.168.10.141 k8s-master02
192.168.10.142 k8s-master03
192.168.10.143 k8s-worker01
192.168.10.144 k8s-worker02
~~~

## 2.4 配置内核转发及网桥过滤

>所有主机均需要操作。

~~~powershell
# cat << EOF | tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
~~~

~~~powershell
# modprobe overlay
# modprobe br_netfilter
~~~

~~~powershell
# lsmod | egrep "overlay"
overlay               151552  0

# lsmod | egrep "br_netfilter"
br_netfilter           32768  0
bridge                307200  1 br_netfilter
~~~

~~~powershell
添加网桥过滤及内核转发配置文件
# cat << EOF| tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF
~~~

~~~powershell
加载内核参数
# sysctl --system
~~~

## 2.5 安装ipset及ipvsadm

> 所有主机均需要操作。

~~~powershell
安装ipset及ipvsadm
# apt install ipset ipvsadm
~~~

~~~powershell
配置ipvsadm模块加载
添加需要加载的模块
# cat << EOF | tee /etc/modules-load.d/ipvs.conf
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
nf_conntrack
EOF
~~~

~~~powershell
# cat << EOF | tee ipvs.sh
#!/bin/sh
modprobe -- ip_vs
modprobe -- ip_vs_rr
modprobe -- ip_vs_wrr
modprobe -- ip_vs_sh
modprobe -- nf_conntrack
EOF
~~~

~~~powershell
# sh ipvs.sh
~~~

# 三、通过RKE2部署K8S集群

## 3.1 管理节点部署

### 3.1.1 第一台管理节点部署

> 主机IP地址：192.168.10.140/24 主机名：k8s-master01

#### 3.1.1.1 创建配置文件目录及配置文件

~~~powershell
# mkdir -p /etc/rancher/rke2
~~~

~~~powershell
# vim /etc/rancher/rke2/config.yaml
# cat /etc/rancher/rke2/config.yaml
token: smartgo
node-name: k8s-master01
tls-san: 192.168.10.140
system-default-registry: "registry.cn-hangzhou.aliyuncs.com"
kube-proxy-arg:
  - proxy-mode=ipvs
  - ipvs-strict-arp=true
~~~

~~~powershell
解释说明：
token参数表示自定义一个token标识
node-name表示配置节点名，该名称是全局唯一的，用于dns路由
tls-san表示TLS证书上添加额外的主机名或IPv4/IPv6地址作为备用名称，此处填写本机IP，该参数是为了避免固定注册地址的证书错误
system-default-registry表示使用国内镜像
~~~

#### 3.1.1.2 获取RKE2安装程序

~~~powershell
# curl -sfL https://rancher-mirror.oss-cn-beijing.aliyuncs.com/rke2/install.sh | INSTALL_RKE2_MIRROR=cn sh -
~~~

~~~powershell
[INFO]  finding release for channel stable
[INFO]  using v1.25.13-rke2r1 as release
[INFO]  downloading checksums at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local
~~~

~~~powershell
# find / -name rke2
/usr/local/bin/rke2
/usr/local/share/rke2
/etc/rancher/rke2
~~~

#### 3.1.1.3 启动RKE2服务

~~~powershell
# systemctl enable --now rke2-server
~~~

~~~powershell
# systemctl status rke2-server
~~~

~~~powershell
# ps aux | grep rke2
~~~

#### 3.1.1.4 关于集群文件查看

> 此文件包含集群信息

~~~powershell
# ls /etc/rancher/rke2/rke2.yaml
/etc/rancher/rke2/rke2.yaml
root@node:~# cat /etc/rancher/rke2/rke2.yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJlVENDQVIrZ0F3SUJBZ0lCQURBS0JnZ3Foa2pPUFFRREFqQWtNU0l3SUFZRFZRUUREQmx5YTJVeUxYTmwKY25abGNpMWpZVUF4TmprME5ETXpNRFkyTUI0WERUSXpNRGt4TVRFeE5URXdObG9YRFRNek1Ea3dPREV4TlRFdwpObG93SkRFaU1DQUdBMVVFQXd3WmNtdGxNaTF6WlhKMlpYSXRZMkZBTVRZNU5EUXpNekEyTmpCWk1CTUdCeXFHClNNNDlBZ0VHQ0NxR1NNNDlBd0VIQTBJQUJDK3I2MjNVbXBBRzRrNmhaVktrdkwycERvS3JIZHBNdjU4bkpGZmkKTU9SbjVodnBJZXM5ZmtCdWt4cGVWNmlXMWZQdHRuMUxEOTI1Y3BsZjNjTGdaWk9qUWpCQU1BNEdBMVVkRHdFQgovd1FFQXdJQ3BEQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01CMEdBMVVkRGdRV0JCVGF6cWExYWJNdG5nWlFGTHhpCjJ1K2sycWducVRBS0JnZ3Foa2pPUFFRREFnTklBREJGQWlBWGFJVDltVTg5R1Q0OTF5aXczdUZHWGpQTnJ1cHYKSGZscTRsZUZoajNPQUFJaEFOUk9wUVhxakZ0ZUttdmJhNEVGeU9jSGpiM3pMTFZEeStYTTJHcXF1RUQ3Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
    server: https://127.0.0.1:6443
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
kind: Config
preferences: {}
users:
- name: default
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJrakNDQVRpZ0F3SUJBZ0lJRGNRY09xU3ZoQll3Q2dZSUtvWkl6ajBFQXdJd0pERWlNQ0FHQTFVRUF3d1oKY210bE1pMWpiR2xsYm5RdFkyRkFNVFk1TkRRek16QTJOakFlRncweU16QTVNVEV4TVRVeE1EWmFGdzB5TkRBNQpNVEF4TVRVeE1EWmFNREF4RnpBVkJnTlZCQW9URG5ONWMzUmxiVHB0WVhOMFpYSnpNUlV3RXdZRFZRUURFd3h6CmVYTjBaVzA2WVdSdGFXNHdXVEFUQmdjcWhrak9QUUlCQmdncWhrak9QUU1CQndOQ0FBUkhSUnh2L2FlWkREOHoKVzNQZllCTXVWTDI3SDNLOXJhV1pqWEJ6T3NjWkFmRm9ac3ltS0kxK3hkUmtBUXBIWXNtM3Jvd0Vqd1d2QmJkUApVcDFLcG1Ndm8wZ3dSakFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUhBd0l3Ckh3WURWUjBqQkJnd0ZvQVVzWmdUWjg2dlRkWGdHNmxDUEhia2ZjbU1XOUV3Q2dZSUtvWkl6ajBFQXdJRFNBQXcKUlFJaEFKc1dHR2FwZHNpTGlVYUFTUFBHN0dFNy95cUJDK3lCMmpYYnRtOUNjMUVLQWlCblBZTVBiZ2xHZDQ4YgpFd2ZET3RwcDBPYXhpN2JoTGFoajVFRlNRK3NqN1E9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCi0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlCZVRDQ0FSK2dBd0lCQWdJQkFEQUtCZ2dxaGtqT1BRUURBakFrTVNJd0lBWURWUVFEREJseWEyVXlMV05zCmFXVnVkQzFqWVVBeE5qazBORE16TURZMk1CNFhEVEl6TURreE1URXhOVEV3TmxvWERUTXpNRGt3T0RFeE5URXcKTmxvd0pERWlNQ0FHQTFVRUF3d1pjbXRsTWkxamJHbGxiblF0WTJGQU1UWTVORFF6TXpBMk5qQlpNQk1HQnlxRwpTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCRDdEcWZVYkdvbUpBcmxOdzRnK2Rvd0F1YzAvUWNZODNwczMyWHR2CkNETGdMTmhJMkplUlJCOG5JVmpTOFNwNVY4bXlCMTBOSDloVFYrOWoyVjJhcnhhalFqQkFNQTRHQTFVZER3RUIKL3dRRUF3SUNwREFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQjBHQTFVZERnUVdCQlN4bUJObnpxOU4xZUFicVVJOApkdVI5eVl4YjBUQUtCZ2dxaGtqT1BRUURBZ05JQURCRkFpRUE0MERjSExLTkFDU0M2TmV6ZHUwYVRPMmZ2Z1hVClhibTZTeVk4S2Q1UHk3MENJRGQvTzlFR0xVWDd4WExrQ2FJeENVZ0t6OVFWOEEwZk11bmVQWVZVcU9HYwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSUpwYXJuU3hFSWJZbEM4UCtVU0ptMDkrY1JNeWNyc1M5NURyUnVMV3hET0pvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFUjBVY2IvMm5tUXcvTTF0ejMyQVRMbFM5dXg5eXZhMmxtWTF3Y3pySEdRSHhhR2JNcGlpTgpmc1hVWkFFS1IyTEp0NjZNQkk4RnJ3VzNUMUtkU3Faakx3PT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=

~~~

> 此目录中包含二进制文件，用于启动容器等。

~~~powershell
# ls /var/lib/rancher/rke2/bin/
containerd  containerd-shim  containerd-shim-runc-v1  containerd-shim-runc-v2  crictl  ctr  kubectl  kubelet  runc
~~~

> 把上述目录添加到主机PATH路径中

~~~powershell
# vim /etc/profile.d/rke2.sh

# cat /etc/profile.d/rke2.sh
export PATH=$PATH:/var/lib/rancher/rke2/bin
~~~

~~~powershell
# source /etc/profile
~~~

#### 3.1.1.5 关于kubectl使用的kubeconfig文件准备

~~~powershell
# kubectl get nodes
The connection to the server localhost:8080 was refused - did you specify the right host or port?
~~~

~~~powershell
临时指定环境变量
# KUBECONFIG=/etc/rancher/rke2/rke2.yaml kubectl get nodes
NAME           STATUS   ROLES                       AGE   VERSION
k8s-master01   Ready    control-plane,etcd,master   22m   v1.25.13+rke2r1
~~~

或

~~~powershell
修改/etc/profile.d/rke2.sh新增如下内容：

# vim /etc/profile.d/rke2.sh

# cat /etc/profile.d/rke2.sh
export PATH=$PATH:/var/lib/rancher/rke2/bin
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
~~~

~~~powershell
# source /etc/profile
~~~

~~~powershell
# kubectl get nodes
NAME           STATUS   ROLES                       AGE   VERSION
k8s-master01   Ready    control-plane,etcd,master   27m   v1.25.13+rke2r1
~~~

### 3.1.2 第二台管理节点部署

>主机IP地址：192.168.10.141/24 主机名：k8s-master02

#### 3.1.2.1 创建配置文件目录及配置文件

~~~powershell
# mkdir -p /etc/rancher/rke2
~~~

~~~powershell
# vim /etc/rancher/rke2/config.yaml
# cat /etc/rancher/rke2/config.yaml
server: https://192.168.10.140:9345
token: smartgo
node-name: k8s-master02
tls-san: 192.168.10.141
system-default-registry: "registry.cn-hangzhou.aliyuncs.com"
kube-proxy-arg:
  - proxy-mode=ipvs
  - ipvs-strict-arp=true
~~~

~~~powershell
解释说明：
server参数表示第一个管理节点IP，使用https协议
token参数表示自定义一个token标识
node-name表示配置节点名，该名称是全局唯一的，用于dns路由
tls-san表示TLS证书上添加额外的主机名或IPv4/IPv6地址作为备用名称，此处填写本机IP，该参数是为了避免固定注册地址的证书错误
system-default-registry表示使用国内镜像
~~~

~~~powershell
第一个管理节点的rke2 server进程会开放9345端口监听新节点的注册(正常情况下，Kubernetes API 的服务端口是6443，这个开放端口是不同的)，其他节点加入该集群的时候需要在/etc/rancher/rke2/config.yaml配置文件当中加入一行数据：
server: https://192.168.10.140:9345
~~~

#### 3.1.2.2 获取RKE2安装程序

~~~powershell
# curl -sfL https://rancher-mirror.oss-cn-beijing.aliyuncs.com/rke2/install.sh | INSTALL_RKE2_MIRROR=cn sh -
~~~

~~~powershell
[INFO]  finding release for channel stable
[INFO]  using v1.25.13-rke2r1 as release
[INFO]  downloading checksums at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local
~~~

~~~powershell
# find / -name rke2
/usr/local/bin/rke2
/usr/local/share/rke2
/etc/rancher/rke2
~~~

#### 3.1.2.3 启动RKE2服务

~~~powershell
# systemctl enable --now rke2-server
~~~

~~~powershell
# systemctl status rke2-server
~~~

~~~powershell
# ps aux | grep rke2
~~~

#### 3.1.2.4 关于集群文件查看

> 此文件包含集群信息

~~~powershell
# ls /etc/rancher/rke2/rke2.yaml
/etc/rancher/rke2/rke2.yaml
root@node:~# cat /etc/rancher/rke2/rke2.yaml

apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJlVENDQVIrZ0F3SUJBZ0lCQURBS0JnZ3Foa2pPUFFRREFqQWtNU0l3SUFZRFZRUUREQmx5YTJVeUxYTmwKY25abGNpMWpZVUF4TmprME5ETXpNRFkyTUI0WERUSXpNRGt4TVRFeE5URXdObG9YRFRNek1Ea3dPREV4TlRFdwpObG93SkRFaU1DQUdBMVVFQXd3WmNtdGxNaTF6WlhKMlpYSXRZMkZBTVRZNU5EUXpNekEyTmpCWk1CTUdCeXFHClNNNDlBZ0VHQ0NxR1NNNDlBd0VIQTBJQUJDK3I2MjNVbXBBRzRrNmhaVktrdkwycERvS3JIZHBNdjU4bkpGZmkKTU9SbjVodnBJZXM5ZmtCdWt4cGVWNmlXMWZQdHRuMUxEOTI1Y3BsZjNjTGdaWk9qUWpCQU1BNEdBMVVkRHdFQgovd1FFQXdJQ3BEQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01CMEdBMVVkRGdRV0JCVGF6cWExYWJNdG5nWlFGTHhpCjJ1K2sycWducVRBS0JnZ3Foa2pPUFFRREFnTklBREJGQWlBWGFJVDltVTg5R1Q0OTF5aXczdUZHWGpQTnJ1cHYKSGZscTRsZUZoajNPQUFJaEFOUk9wUVhxakZ0ZUttdmJhNEVGeU9jSGpiM3pMTFZEeStYTTJHcXF1RUQ3Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
    server: https://127.0.0.1:6443
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
kind: Config
preferences: {}
users:
- name: default
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJrekNDQVRpZ0F3SUJBZ0lJZlNoWnBoNWt6aDh3Q2dZSUtvWkl6ajBFQXdJd0pERWlNQ0FHQTFVRUF3d1oKY210bE1pMWpiR2xsYm5RdFkyRkFNVFk1TkRRek16QTJOakFlRncweU16QTVNVEV4TVRVeE1EWmFGdzB5TkRBNQpNVEF4TWpJNE1UbGFNREF4RnpBVkJnTlZCQW9URG5ONWMzUmxiVHB0WVhOMFpYSnpNUlV3RXdZRFZRUURFd3h6CmVYTjBaVzA2WVdSdGFXNHdXVEFUQmdjcWhrak9QUUlCQmdncWhrak9QUU1CQndOQ0FBUjRuVlR0ZXB6SEZLY0IKUEpaTVJjcnRiOWpRTHFmN3JDM3FITDRjMEw2ajRqNno2cWUwMGRsVGV4dGIvaW4wMkg3VE0wR0hMeHRoYUczOApPLy9pYndiWW8wZ3dSakFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUhBd0l3Ckh3WURWUjBqQkJnd0ZvQVVzWmdUWjg2dlRkWGdHNmxDUEhia2ZjbU1XOUV3Q2dZSUtvWkl6ajBFQXdJRFNRQXcKUmdJaEFOU3RvcUtzMTNNeERRaUNISE9oWVdyN3FzRUtGbFlPWithWWJ6a29PUHc5QWlFQXBmL1N4Ykdpa0NJeQpHS0NYQzBZaDQzVThkd0ZvNkdNR3YvUm9zc3J0c1hNPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCi0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlCZVRDQ0FSK2dBd0lCQWdJQkFEQUtCZ2dxaGtqT1BRUURBakFrTVNJd0lBWURWUVFEREJseWEyVXlMV05zCmFXVnVkQzFqWVVBeE5qazBORE16TURZMk1CNFhEVEl6TURreE1URXhOVEV3TmxvWERUTXpNRGt3T0RFeE5URXcKTmxvd0pERWlNQ0FHQTFVRUF3d1pjbXRsTWkxamJHbGxiblF0WTJGQU1UWTVORFF6TXpBMk5qQlpNQk1HQnlxRwpTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCRDdEcWZVYkdvbUpBcmxOdzRnK2Rvd0F1YzAvUWNZODNwczMyWHR2CkNETGdMTmhJMkplUlJCOG5JVmpTOFNwNVY4bXlCMTBOSDloVFYrOWoyVjJhcnhhalFqQkFNQTRHQTFVZER3RUIKL3dRRUF3SUNwREFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQjBHQTFVZERnUVdCQlN4bUJObnpxOU4xZUFicVVJOApkdVI5eVl4YjBUQUtCZ2dxaGtqT1BRUURBZ05JQURCRkFpRUE0MERjSExLTkFDU0M2TmV6ZHUwYVRPMmZ2Z1hVClhibTZTeVk4S2Q1UHk3MENJRGQvTzlFR0xVWDd4WExrQ2FJeENVZ0t6OVFWOEEwZk11bmVQWVZVcU9HYwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSUJoTkpMREY5SnBUOUlScDc0cnN0Yk0wem1Hc1R6R1oyVndVaXBDM3dHMHJvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFZUoxVTdYcWN4eFNuQVR5V1RFWEs3Vy9ZMEM2bis2d3Q2aHkrSE5DK28rSStzK3FudE5IWgpVM3NiVy80cDlOaCswek5CaHk4YllXaHQvRHYvNG04RzJBPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=
~~~

> 此目录中包含二进制文件，用于启动容器等。

~~~powershell
# ls /var/lib/rancher/rke2/bin/
containerd  containerd-shim  containerd-shim-runc-v1  containerd-shim-runc-v2  crictl  ctr  kubectl  kubelet  runc
~~~

> 把上述目录添加到主机PATH路径中

~~~powershell
# vim /etc/profile.d/rke2.sh

# cat /etc/profile.d/rke2.sh
export PATH=$PATH:/var/lib/rancher/rke2/bin
~~~

~~~powershell
# source /etc/profile
~~~

#### 3.1.2.5 关于kubectl使用的kubeconfig文件准备

~~~powershell
# kubectl get nodes
The connection to the server localhost:8080 was refused - did you specify the right host or port?
~~~

~~~powershell
临时指定环境变量
# KUBECONFIG=/etc/rancher/rke2/rke2.yaml kubectl get nodes
NAME           STATUS   ROLES                       AGE   VERSION
k8s-master01   Ready    control-plane,etcd,master   22m   v1.25.13+rke2r1
~~~

或

~~~powershell
修改/etc/profile.d/rke2.sh新增如下内容：

# vim /etc/profile.d/rke2.sh

# cat /etc/profile.d/rke2.sh
export PATH=$PATH:/var/lib/rancher/rke2/bin
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
~~~

~~~powershell
# source /etc/profile
~~~

~~~powershell
# kubectl get nodes
NAME           STATUS   ROLES                       AGE     VERSION
k8s-master01   Ready    control-plane,etcd,master   40m     v1.25.13+rke2r1
k8s-master02   Ready    control-plane,etcd,master   2m16s   v1.25.13+rke2r1
~~~

### 3.1.3 第三台管理节点部署

>主机IP地址：192.168.10.142/24 主机名：k8s-master03

#### 3.1.3.1 创建配置文件目录及配置文件

~~~powershell
# mkdir -p /etc/rancher/rke2
~~~

~~~powershell
# vim /etc/rancher/rke2/config.yaml
# cat /etc/rancher/rke2/config.yaml
server: https://192.168.10.140:9345
token: smartgo
node-name: k8s-master03
tls-san: 192.168.10.142
system-default-registry: "registry.cn-hangzhou.aliyuncs.com"
kube-proxy-arg:
  - proxy-mode=ipvs
  - ipvs-strict-arp=true
~~~

~~~powershell
解释说明：
server参数表示第一个管理节点IP，使用https协议
token参数表示自定义一个token标识
node-name表示配置节点名，该名称是全局唯一的，用于dns路由
tls-san表示TLS证书上添加额外的主机名或IPv4/IPv6地址作为备用名称，此处填写本机IP，该参数是为了避免固定注册地址的证书错误
system-default-registry表示使用国内镜像
~~~

~~~powershell
第一个管理节点的rke2 server进程会开放9345端口监听新节点的注册(正常情况下，Kubernetes API 的服务端口是6443，这个开放端口是不同的)，其他节点加入该集群的时候需要在/etc/rancher/rke2/config.yaml配置文件当中加入一行数据：
server: https://192.168.10.140:9345
~~~

#### 3.1.3.2 获取RKE2安装程序

~~~powershell
# curl -sfL https://rancher-mirror.oss-cn-beijing.aliyuncs.com/rke2/install.sh | INSTALL_RKE2_MIRROR=cn sh -
~~~

~~~powershell
[INFO]  finding release for channel stable
[INFO]  using v1.25.13-rke2r1 as release
[INFO]  downloading checksums at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local
~~~

~~~powershell
# find / -name rke2
/usr/local/bin/rke2
/usr/local/share/rke2
/etc/rancher/rke2
~~~

#### 3.1.3.3 启动RKE2服务

~~~powershell
# systemctl enable --now rke2-server
~~~

~~~powershell
# systemctl status rke2-server
~~~

~~~powershell
# ps aux | grep rke2
~~~

#### 3.1.3.4 关于集群文件查看

> 此文件包含集群信息

~~~powershell
# ls /etc/rancher/rke2/rke2.yaml
/etc/rancher/rke2/rke2.yaml

# cat /etc/rancher/rke2/rke2.yaml

# cat /etc/rancher/rke2/rke2.yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJlVENDQVIrZ0F3SUJBZ0lCQURBS0JnZ3Foa2pPUFFRREFqQWtNU0l3SUFZRFZRUUREQmx5YTJVeUxYTmwKY25abGNpMWpZVUF4TmprME5ETXpNRFkyTUI0WERUSXpNRGt4TVRFeE5URXdObG9YRFRNek1Ea3dPREV4TlRFdwpObG93SkRFaU1DQUdBMVVFQXd3WmNtdGxNaTF6WlhKMlpYSXRZMkZBTVRZNU5EUXpNekEyTmpCWk1CTUdCeXFHClNNNDlBZ0VHQ0NxR1NNNDlBd0VIQTBJQUJDK3I2MjNVbXBBRzRrNmhaVktrdkwycERvS3JIZHBNdjU4bkpGZmkKTU9SbjVodnBJZXM5ZmtCdWt4cGVWNmlXMWZQdHRuMUxEOTI1Y3BsZjNjTGdaWk9qUWpCQU1BNEdBMVVkRHdFQgovd1FFQXdJQ3BEQVBCZ05WSFJNQkFmOEVCVEFEQVFIL01CMEdBMVVkRGdRV0JCVGF6cWExYWJNdG5nWlFGTHhpCjJ1K2sycWducVRBS0JnZ3Foa2pPUFFRREFnTklBREJGQWlBWGFJVDltVTg5R1Q0OTF5aXczdUZHWGpQTnJ1cHYKSGZscTRsZUZoajNPQUFJaEFOUk9wUVhxakZ0ZUttdmJhNEVGeU9jSGpiM3pMTFZEeStYTTJHcXF1RUQ3Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
    server: https://127.0.0.1:6443
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
kind: Config
preferences: {}
users:
- name: default
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJrakNDQVRpZ0F3SUJBZ0lJVlZKOWV3V3UveUF3Q2dZSUtvWkl6ajBFQXdJd0pERWlNQ0FHQTFVRUF3d1oKY210bE1pMWpiR2xsYm5RdFkyRkFNVFk1TkRRek16QTJOakFlRncweU16QTVNVEV4TVRVeE1EWmFGdzB5TkRBNQpNVEF4TWpNME1qQmFNREF4RnpBVkJnTlZCQW9URG5ONWMzUmxiVHB0WVhOMFpYSnpNUlV3RXdZRFZRUURFd3h6CmVYTjBaVzA2WVdSdGFXNHdXVEFUQmdjcWhrak9QUUlCQmdncWhrak9QUU1CQndOQ0FBVGhqd3hyVTNCeGhrcnkKMHpHWlpDRmx5VmZOc0IvZElxS3Fab28xeHJQMDZ1UUpvR3NzM3JNeFdMTlFwMGZENjBkRCs1RjdSY0FkYXpZcQp2Z3pFZjBHaW8wZ3dSakFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUhBd0l3Ckh3WURWUjBqQkJnd0ZvQVVzWmdUWjg2dlRkWGdHNmxDUEhia2ZjbU1XOUV3Q2dZSUtvWkl6ajBFQXdJRFNBQXcKUlFJZ0ZobHRva2dTbmxLcTk4NmZGekQzZHhhVE8xTWxxNUgwZHVVUE9kSEg2bDhDSVFDVDlwODQ0ai9LOUwvRgppWmRYcTl6aE53KzAyRXRiMzFxRjJsNUZjQXkzeWc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCi0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlCZVRDQ0FSK2dBd0lCQWdJQkFEQUtCZ2dxaGtqT1BRUURBakFrTVNJd0lBWURWUVFEREJseWEyVXlMV05zCmFXVnVkQzFqWVVBeE5qazBORE16TURZMk1CNFhEVEl6TURreE1URXhOVEV3TmxvWERUTXpNRGt3T0RFeE5URXcKTmxvd0pERWlNQ0FHQTFVRUF3d1pjbXRsTWkxamJHbGxiblF0WTJGQU1UWTVORFF6TXpBMk5qQlpNQk1HQnlxRwpTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCRDdEcWZVYkdvbUpBcmxOdzRnK2Rvd0F1YzAvUWNZODNwczMyWHR2CkNETGdMTmhJMkplUlJCOG5JVmpTOFNwNVY4bXlCMTBOSDloVFYrOWoyVjJhcnhhalFqQkFNQTRHQTFVZER3RUIKL3dRRUF3SUNwREFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQjBHQTFVZERnUVdCQlN4bUJObnpxOU4xZUFicVVJOApkdVI5eVl4YjBUQUtCZ2dxaGtqT1BRUURBZ05JQURCRkFpRUE0MERjSExLTkFDU0M2TmV6ZHUwYVRPMmZ2Z1hVClhibTZTeVk4S2Q1UHk3MENJRGQvTzlFR0xVWDd4WExrQ2FJeENVZ0t6OVFWOEEwZk11bmVQWVZVcU9HYwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSVA3dXBmZVFndEVBTUpVYzdXNXRRWkJMSHpCN24yMTZERmROQTh2cCtqZUpvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFNFk4TWExTndjWVpLOHRNeG1XUWhaY2xYemJBZjNTS2lxbWFLTmNhejlPcmtDYUJyTE42egpNVml6VUtkSHcrdEhRL3VSZTBYQUhXczJLcjRNeEg5Qm9nPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=
~~~

> 此目录中包含二进制文件，用于启动容器等。

~~~powershell
# ls /var/lib/rancher/rke2/bin/
containerd  containerd-shim  containerd-shim-runc-v1  containerd-shim-runc-v2  crictl  ctr  kubectl  kubelet  runc
~~~

> 把上述目录添加到主机PATH路径中

~~~powershell
# vim /etc/profile.d/rke2.sh

# cat /etc/profile.d/rke2.sh
export PATH=$PATH:/var/lib/rancher/rke2/bin
~~~

~~~powershell
# source /etc/profile
~~~

#### 3.1.3.5 关于kubectl使用的kubeconfig文件准备

~~~powershell
# kubectl get nodes
The connection to the server localhost:8080 was refused - did you specify the right host or port?
~~~

~~~powershell
临时指定环境变量
# KUBECONFIG=/etc/rancher/rke2/rke2.yaml kubectl get nodes
NAME           STATUS   ROLES                       AGE   VERSION
k8s-master01   Ready    control-plane,etcd,master   40m     v1.25.13+rke2r1
k8s-master02   Ready    control-plane,etcd,master   2m16s   v1.25.13+rke2r1
~~~

或

~~~powershell
修改/etc/profile.d/rke2.sh新增如下内容：

# vim /etc/profile.d/rke2.sh

# cat /etc/profile.d/rke2.sh
export PATH=$PATH:/var/lib/rancher/rke2/bin
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
~~~

~~~powershell
# source /etc/profile
~~~

~~~powershell
# kubectl get nodes
NAME           STATUS   ROLES                       AGE     VERSION
k8s-master01   Ready    control-plane,etcd,master   44m     v1.25.13+rke2r1
k8s-master02   Ready    control-plane,etcd,master   6m27s   v1.25.13+rke2r1
k8s-master03   Ready    control-plane,etcd,master   67s     v1.25.13+rke2r1
~~~

## 3.2 工作节点部署

### 3.2.1 第一台工作节点部署

#### 3.2.1.1 创建配置文件目录及配置文件

~~~powershell
# mkdir -p /etc/rancher/rke2
~~~

~~~powershell
# vim /etc/rancher/rke2/config.yaml
# cat /etc/rancher/rke2/config.yaml
server: https://192.168.10.140:9345
token: smartgo
node-name: k8s-worker01
system-default-registry: "registry.cn-hangzhou.aliyuncs.com"
kube-proxy-arg:
  - proxy-mode=ipvs
  - ipvs-strict-arp=true
~~~

~~~powershell
解释说明：
server参数表示第一个管理节点IP，使用https协议
token参数表示自定义一个token标识
node-name表示配置节点名，该名称是全局唯一的，用于dns路由
system-default-registry表示使用国内镜像
~~~

~~~powershell
第一个管理节点的rke2 server进程会开放9345端口监听新节点的注册(正常情况下，Kubernetes API 的服务端口是6443，这个开放端口是不同的)，其他节点加入该集群的时候需要在/etc/rancher/rke2/config.yaml配置文件当中加入一行数据：
server: https://192.168.10.140:9345
~~~

#### 3.2.1.2 获取RKE2安装程序

~~~powershell
# curl -sfL https://rancher-mirror.oss-cn-beijing.aliyuncs.com/rke2/install.sh | INSTALL_RKE2_MIRROR=cn INSTALL_RKE2_TYPE="agent"  sh -
~~~

~~~powershell
[INFO]  finding release for channel stable
[INFO]  using v1.25.13-rke2r1 as release
[INFO]  downloading checksums at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local
~~~

~~~powershell
# find / -name rke2
/usr/local/bin/rke2
/usr/local/share/rke2
/etc/rancher/rke2
~~~

#### 3.2.1.3 启动RKE2 agent服务

~~~powershell
# systemctl enable --now rke2-agent
~~~

~~~powershell
# systemctl status rke2-agent
~~~

~~~powershell
# ps aux | grep rke2
~~~

~~~powershell
# kubectl get nodes
NAME           STATUS   ROLES                       AGE     VERSION
k8s-master01   Ready    control-plane,etcd,master   53m     v1.25.13+rke2r1
k8s-master02   Ready    control-plane,etcd,master   15m     v1.25.13+rke2r1
k8s-master03   Ready    control-plane,etcd,master   9m42s   v1.25.13+rke2r1
k8s-worker01   Ready    <none>                      109s    v1.25.13+rke2r1
~~~

### 3.2.2 第二台工作节点部署

#### 3.2.2.1 创建配置文件目录及配置文件

~~~powershell
# mkdir -p /etc/rancher/rke2
~~~

~~~powershell
# vim /etc/rancher/rke2/config.yaml
# cat /etc/rancher/rke2/config.yaml
server: https://192.168.10.140:9345
token: smartgo
node-name: k8s-worker02
system-default-registry: "registry.cn-hangzhou.aliyuncs.com"
kube-proxy-arg:
  - proxy-mode=ipvs
  - ipvs-strict-arp=true
~~~

~~~powershell
解释说明：
server参数表示第一个管理节点IP，使用https协议
token参数表示自定义一个token标识
node-name表示配置节点名，该名称是全局唯一的，用于dns路由
system-default-registry表示使用国内镜像
~~~

~~~powershell
第一个管理节点的rke2 server进程会开放9345端口监听新节点的注册(正常情况下，Kubernetes API 的服务端口是6443，这个开放端口是不同的)，其他节点加入该集群的时候需要在/etc/rancher/rke2/config.yaml配置文件当中加入一行数据：
server: https://192.168.10.140:9345
~~~

#### 3.2.2.2 获取RKE2安装程序

~~~powershell
# curl -sfL https://rancher-mirror.oss-cn-beijing.aliyuncs.com/rke2/install.sh | INSTALL_RKE2_MIRROR=cn INSTALL_RKE2_TYPE="agent"  sh -
~~~

~~~powershell
[INFO]  finding release for channel stable
[INFO]  using v1.25.13-rke2r1 as release
[INFO]  downloading checksums at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/sha256sum-amd64.txt
[INFO]  downloading tarball at https://rancher-mirror.rancher.cn/rke2/releases/download/v1.25.13-rke2r1/rke2.linux-amd64.tar.gz
[INFO]  verifying tarball
[INFO]  unpacking tarball file to /usr/local
~~~

~~~powershell
# find / -name rke2
/usr/local/bin/rke2
/usr/local/share/rke2
/etc/rancher/rke2
~~~

#### 3.2.2.3 启动RKE2 agent服务

~~~powershell
# systemctl enable --now rke2-agent
~~~

~~~powershell
# systemctl status rke2-agent
~~~

~~~powershell
# ps aux | grep rke2
~~~

~~~powershell
# kubectl get nodes
NAME           STATUS   ROLES                       AGE     VERSION
k8s-master01   Ready    control-plane,etcd,master   57m     v1.25.13+rke2r1
k8s-master02   Ready    control-plane,etcd,master   19m     v1.25.13+rke2r1
k8s-master03   Ready    control-plane,etcd,master   14m     v1.25.13+rke2r1
k8s-worker01   Ready    <none>                      6m16s   v1.25.13+rke2r1
k8s-worker02   Ready    <none>                      72s     v1.25.13+rke2r1
~~~

# 四、配置kubectl命令补全及Containerd客户端功能

> 在k8s-master01节点上操作

~~~powershell
# apt-get install bash-completion
~~~

~~~powershell
# vim ~/.bashrc

# tail -5 ~/.bashrc
#if [ -f /etc/bash_completion ] && ! shopt -oq posix; then
#    . /etc/bash_completion
#fi
source /usr/share/bash-completion/bash_completion
source <(kubectl completion bash)
~~~

~~~powershell
# source ~/.bashrc
~~~

> 以下为准备containerd客户端命令

~~~powershell
# /var/lib/rancher/rke2/bin/ctr --address /run/k3s/containerd/containerd.sock --namespace k8s.io container ls
~~~

~~~powershell
# export CRI_CONFIG_FILE=/var/lib/rancher/rke2/agent/etc/crictl.yaml
# /var/lib/rancher/rke2/bin/crictl ps
# /var/lib/rancher/rke2/bin/crictl images
~~~

# 五、配置RKE2使用容器镜像仓库

>在k8s-master01节点上操作

## 5.1 私有容器镜像仓库部署

~~~powershell
# vim /etc/hosts

# cat /etc/hosts
127.0.0.1 localhost
127.0.1.1 node

# The following lines are desirable for IPv6 capable hosts
::1     ip6-localhost ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
192.168.10.140 k8s-master01
192.168.10.141 k8s-master02
192.168.10.142 k8s-master03
192.168.10.143 k8s-worker01
192.168.10.144 k8s-worker02
192.168.10.145 www.kubemsb.com 添加此行
~~~

### 5.1.1  docker-ce安装

#### 5.1.1.1 添加Docker官方GPG密钥

~~~powershell
# curl -fsSL https://mirrors.ustc.edu.cn/docker-ce/linux/ubuntu/gpg | sudo apt-key add -
~~~

#### 5.1.1.2 设置稳定版仓库 

~~~powershell
# add-apt-repository \
 "deb [arch=amd64] https://mirrors.ustc.edu.cn/docker-ce/linux/ubuntu/ \
 $(lsb_release -cs) \
 stable"
~~~

#### 5.1.1.3 列出可用版本 

~~~powershell
# apt-cache madison docker-ce
~~~

#### 5.1.1.4 安装docker-ce

~~~powershell
# apt-get install -y docker-ce docker-ce-cli containerd.io
~~~

#### 5.1.1.5 启动docker-ce

~~~powershell
# systemctl enable --now docker
~~~

~~~powershell
# docker version
Client: Docker Engine - Community
 Version:           24.0.6
 API version:       1.43
 Go version:        go1.20.7
 Git commit:        ed223bc
 Built:             Mon Sep  4 12:31:44 2023
 OS/Arch:           linux/amd64
 Context:           default

Server: Docker Engine - Community
 Engine:
  Version:          24.0.6
  API version:      1.43 (minimum version 1.12)
  Go version:       go1.20.7
  Git commit:       1a79695
  Built:            Mon Sep  4 12:31:44 2023
  OS/Arch:          linux/amd64
  Experimental:     false
 containerd:
  Version:          1.6.22
  GitCommit:        8165feabfdfe38c65b599c4993d227328c231fca
 runc:
  Version:          1.1.8
  GitCommit:        v1.1.8-0-g82f18fe
 docker-init:
  Version:          0.19.0
  GitCommit:        de40ad0
~~~

~~~powershell
# docker run -d -p 80:80 nginx:latest

# docker ps
CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS          PORTS                               NAMES
1ddc91cbc5e9   nginx:latest   "/docker-entrypoint.…"   11 seconds ago   Up 10 seconds   0.0.0.0:80->80/tcp, :::80->80/tcp   admiring_swanson
~~~

~~~powershell
# docker stop 1ddc && docker rm 1ddc
~~~

### 5.1.2  docker compose安装

~~~powershell
下载docker-compose二进制文件

# wget https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-linux-x86_64
~~~

~~~powershell
查看已下载二进制文件
# ls
docker-compose-Linux-x86_64
~~~

~~~powershell
移动二进制文件到/usr/bin目录，并更名为docker-compose
# mv docker-compose-Linux-x86_64 /usr/bin/docker-compose
~~~

~~~powershell
为二进制文件添加可执行权限
# chmod +x /usr/bin/docker-compose
~~~

~~~powershell
安装完成后，查看docker-compse版本
# docker-compose version
docker-compose version 2.21.0
~~~

### 5.1.3 harbor安装

#### 5.1.3.1 harbor下载

![image-20220125232445910](/云原生/k8s-ops/k8s-ops-48-rke2方式部署k8s集群-高可用/image-20220125232445910.png)

![image-20220125232519365](/云原生/k8s-ops/k8s-ops-48-rke2方式部署k8s集群-高可用/image-20220125232519365.png)

![image-20230902094921129](/云原生/k8s-ops/k8s-ops-48-rke2方式部署k8s集群-高可用/image-20230902094921129.png)

![image-20230902094957355](/云原生/k8s-ops/k8s-ops-48-rke2方式部署k8s集群-高可用/image-20230902094957355.png)

~~~powershell
下载harbor离线安装包
# wget https://github.com/goharbor/harbor/releases/download/v2.9.0/harbor-offline-installer-v2.9.0.tgz
~~~

~~~powershell
查看已下载的离线安装包
# ls
harbor-offline-installer-v2.9.0.tgz
~~~

#### 5.1.3.2   修改配置文件

~~~powershell
解压harbor离线安装包
# tar xf harbor-offline-installer-v2.9.0.tgz
~~~

~~~powershell
查看解压出来的目录
# ls
harbor 
~~~

~~~powershell
查看harbor目录
# ls harbor
common.sh  harbor.v2.9.0.tar.gz  harbor.yml.tmpl  install.sh  LICENSE  prepare
~~~

~~~powershell
创建配置文件
# cd harbor/
root@harbor-server:~/harbor# mv harbor.yml.tmpl harbor.yml
~~~

~~~powershell
修改配置文件内容

# Configuration file of Harbor

# The IP address or hostname to access admin UI and registry service.
# DO NOT use localhost or 127.0.0.1, because Harbor needs to be accessed by external clients.
hostname: www.kubemsb.com

# http related config
http:
  # port for http, default is 80. If https enabled, this port will redirect to https port
  port: 80

# https related config
#https:
  # https port for harbor, default is 443
 # port: 443
  # The path of cert and key files for nginx
 # certificate: /your/certificate/path
 # private_key: /your/private/key/path

# # Uncomment following will enable tls communication between all harbor components
# internal_tls:
#   # set enabled to true means internal tls is enabled
#   enabled: true
#   # put your cert and key files on dir
#   dir: /etc/harbor/tls/internal
#   # enable strong ssl ciphers (default: false)
#   strong_ssl_ciphers: false

# Uncomment external_url if you want to enable external proxy
# And when it enabled the hostname will no longer used
# external_url: https://reg.mydomain.com:8433

# The initial password of Harbor admin
# It only works in first time to install harbor
# Remember Change the admin password from UI after launching Harbor.
harbor_admin_password: 12345
~~~

#### 5.1.3.3  执行预备脚本

~~~powershell
root@harbor-server:~/harbor# ./prepare
~~~

~~~powershell
输出
prepare base dir is set to /root/harbor
Clearing the configuration file: /config/portal/nginx.conf
Clearing the configuration file: /config/log/logrotate.conf
Clearing the configuration file: /config/log/rsyslog_docker.conf
Generated configuration file: /config/portal/nginx.conf
Generated configuration file: /config/log/logrotate.conf
Generated configuration file: /config/log/rsyslog_docker.conf
Generated configuration file: /config/nginx/nginx.conf
Generated configuration file: /config/core/env
Generated configuration file: /config/core/app.conf
Generated configuration file: /config/registry/config.yml
Generated configuration file: /config/registryctl/env
Generated configuration file: /config/registryctl/config.yml
Generated configuration file: /config/db/env
Generated configuration file: /config/jobservice/env
Generated configuration file: /config/jobservice/config.yml
Generated and saved secret to file: /data/secret/keys/secretkey
Successfully called func: create_root_cert
Generated configuration file: /compose_location/docker-compose.yml
Clean up the input dir
~~~

#### 5.1.3.4  执行安装脚本

~~~powershell
root@harbor-server:~/harbor# ./install.sh
~~~

~~~powershell
输出
[Step 0]: checking if docker is installed ...

Note: docker version: 24.0.5

[Step 1]: checking docker-compose is installed ...

Note: Docker Compose version v2.20.2

[Step 2]: loading Harbor images ...

[Step 3]: preparing environment ...

[Step 4]: preparing harbor configs ...
prepare base dir is set to /root/harbor

[Step 5]: starting Harbor ...
Creating network "harbor_harbor" with the default driver
Creating harbor-log ... done
Creating harbor-db     ... done
Creating registry      ... done
Creating registryctl   ... done
Creating redis         ... done
Creating harbor-portal ... done
Creating harbor-core   ... done
Creating harbor-jobservice ... done
Creating nginx             ... done
✔ ----Harbor has been installed and started successfully.----
~~~

#### 5.1.3.5 验证运行情况

~~~powershell
root@harbor-server:~/harbor# docker ps
CONTAINER ID   IMAGE                                COMMAND                  CREATED         STATUS                   PORTS                                   NAMES
e0ce8610be85   goharbor/harbor-jobservice:v2.9.0    "/harbor/entrypoint.…"   2 minutes ago   Up 2 minutes (healthy)                                           harbor-jobservice
62814f1b1e2b   goharbor/nginx-photon:v2.9.0         "nginx -g 'daemon of…"   2 minutes ago   Up 2 minutes (healthy)   0.0.0.0:80->8080/tcp, :::80->8080/tcp   nginx
960b65e90a9c   goharbor/harbor-core:v2.9.0          "/harbor/entrypoint.…"   2 minutes ago   Up 2 minutes (healthy)                                           harbor-core
327662886d71   goharbor/harbor-portal:v2.9.0        "nginx -g 'daemon of…"   2 minutes ago   Up 2 minutes (healthy)                                           harbor-portal
fc20c2cc5a67   goharbor/harbor-registryctl:v2.9.0   "/home/harbor/start.…"   2 minutes ago   Up 2 minutes (healthy)                                           registryctl
330bea086e71   goharbor/registry-photon:v2.9.0      "/home/harbor/entryp…"   2 minutes ago   Up 2 minutes (healthy)                                           registry
885a974a1ade   goharbor/redis-photon:v2.9.0         "redis-server /etc/r…"   2 minutes ago   Up 2 minutes (healthy)                                           redis
29cbce94d331   goharbor/harbor-db:v2.9.0            "/docker-entrypoint.…"   2 minutes ago   Up 2 minutes (healthy)                                           harbor-db
fc011a06b1bc   goharbor/harbor-log:v2.9.0           "/bin/sh -c /usr/loc…"   2 minutes ago   Up 2 minutes (healthy)   127.0.0.1:1514->10514/tcp               harbor-log

~~~

#### 5.1.3.6 访问harbor UI界面

![image-20230902100239104](/云原生/k8s-ops/k8s-ops-48-rke2方式部署k8s集群-高可用/image-20230902100239104.png)

![image-20230902100309853](/云原生/k8s-ops/k8s-ops-48-rke2方式部署k8s集群-高可用/image-20230902100309853.png)

#### 5.1.3.7 配置docker使用本地非安全容器镜像仓库Harbor

~~~powershell
root@harbor-server:~/harbor# vim /etc/docker/daemon.json
root@harbor-server:~/harbor# cat /etc/docker/daemon.json
{
        "insecure-registries": ["http://www.kubemsb.com"]
}
~~~

~~~powershell
root@harbor-server:~/harbor# docker-compose down
~~~

~~~powershell
root@harbor-server:~/harbor# systemctl daemon-reload 

root@harbor-server:~/harbor# systemctl restart docker
~~~

~~~powershell
root@harbor-server:~/harbor# docker-compose up -d
~~~

~~~powershell
root@harbor-server:~/harbor# docker login www.kubemsb.com
Username: admin
Password:
WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded
~~~

~~~powershell
root@harbor-server:~/harbor# docker tag nginx:latest www.kubemsb.com/library/nginx:latest
~~~

~~~powershell
root@harbor-server:~/harbor# docker push www.kubemsb.com/library/nginx:latest
~~~

![image-20230911222011867](/云原生/k8s-ops/k8s-ops-48-rke2方式部署k8s集群-高可用/image-20230911222011867.png)

## 5.2 配置rke2使用容器镜像仓库

> 参考链接：https://docs.rke2.io/install/containerd_registry_configuration/

### 5.2.1 使用非安全的harbor容器镜像仓库

~~~powershell
# vim /etc/rancher/rke2/registries.yaml

# cat /etc/rancher/rke2/registries.yaml
mirrors:
  www.kubemsb.com:
    endpoint:
      - "http://www.kubemsb.com"
configs:
  "http://www.kubemsb.com":
    auth:
      username: admin
      password: 12345
~~~

~~~powershell
说明：
mirrors字段说明
表示当拉取镜像的时候，国内的镜像网站http://www.kubemsb.com

configs字段说明
该段内容表示配置私有镜像仓库，企业自己搭建的harbor仓库，如果没有私人仓库，则configs段配置可以省略

www.kubemsb.com填写镜像仓库的地址

auth块下面的username和password填写仓库的登录账号密码

每个节点都需要配置该文件确保获取镜像
~~~

~~~powershell
# cat /var/lib/rancher/rke2/agent/etc/containerd/config.toml

# File generated by rke2. DO NOT EDIT. Use config.toml.tmpl instead.
version = 2

[plugins."io.containerd.internal.v1.opt"]
  path = "/var/lib/rancher/rke2/agent/containerd"
[plugins."io.containerd.grpc.v1.cri"]
  stream_server_address = "127.0.0.1"
  stream_server_port = "10010"
  enable_selinux = false
  enable_unprivileged_ports = true
  enable_unprivileged_icmp = true
  sandbox_image = "registry.cn-hangzhou.aliyuncs.com/rancher/pause:3.6"

[plugins."io.containerd.grpc.v1.cri".containerd]
  snapshotter = "overlayfs"
  disable_snapshot_annotations = true

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true

[plugins."io.containerd.grpc.v1.cri".registry.mirrors]

[plugins."io.containerd.grpc.v1.cri".registry.mirrors."www.kubemsb.com"]
  endpoint = ["http://www.kubemsb.com"]

[plugins."io.containerd.grpc.v1.cri".registry.configs."http://www.kubemsb.com".auth]
  username = "admin"
  password = "12345"
~~~

### 5.2.2 使用安全的harbor容器镜像仓库

> 添加证书后重新运行harbor

~~~powershell
root@harbor-server:~/harbor# ls
common  common.sh  docker-compose.yml  harbor.v2.9.0.tar.gz  harbor.yml  install.sh  LICENSE  prepare  www.kubemsb.com
~~~

~~~powershell
root@harbor-server:~/harbor# ls www.kubemsb.com/
www.kubemsb.com.key  www.kubemsb.com.pem
~~~

~~~powershell
root@harbor-server:~/harbor# vim harbor.yml

root@harbor-server:~/harbor# cat harbor.yml
# Configuration file of Harbor

# The IP address or hostname to access admin UI and registry service.
# DO NOT use localhost or 127.0.0.1, because Harbor needs to be accessed by external clients.
hostname: www.kubemsb.com

# http related config
http:
  # port for http, default is 80. If https enabled, this port will redirect to https port
  port: 80

# https related config
https:
  # https port for harbor, default is 443
  port: 443
  # The path of cert and key files for nginx
  certificate: /root/harbor/www.kubemsb.com/www.kubemsb.com.pem
  private_key: /root/harbor/www.kubemsb.com/www.kubemsb.com.key
......
~~~

> 重新修改registries.yaml文件内容,需要重启rke2-server及rke2-agent

~~~powershell
# vim /etc/rancher/rke2/registries.yaml

# cat /etc/rancher/rke2/registries.yaml
mirrors:
  www.kubemsb.com:
    endpoint:
      - "https://www.kubemsb.com"
configs:
  "https://www.kubemsb.com":
    auth:
      username: admin
      password: 12345
    tls:
      cert_file: /etc/rancher/rke2/www.kubemsb.com/www.kubemsb.com.pem
      key_file: /etc/rancher/rke2/www.kubemsb.com/www.kubemsb.com.key

~~~

> 查看文件中变化 

~~~powershell
# cat /var/lib/rancher/rke2/agent/etc/containerd/config.toml

# File generated by rke2. DO NOT EDIT. Use config.toml.tmpl instead.
version = 2

[plugins."io.containerd.internal.v1.opt"]
  path = "/var/lib/rancher/rke2/agent/containerd"
[plugins."io.containerd.grpc.v1.cri"]
  stream_server_address = "127.0.0.1"
  stream_server_port = "10010"
  enable_selinux = false
  enable_unprivileged_ports = true
  enable_unprivileged_icmp = true
  sandbox_image = "registry.cn-hangzhou.aliyuncs.com/rancher/pause:3.6"

[plugins."io.containerd.grpc.v1.cri".containerd]
  snapshotter = "overlayfs"
  disable_snapshot_annotations = true

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true

[plugins."io.containerd.grpc.v1.cri".registry.mirrors]

[plugins."io.containerd.grpc.v1.cri".registry.mirrors."www.kubemsb.com"]
  endpoint = ["https://www.kubemsb.com"]

[plugins."io.containerd.grpc.v1.cri".registry.configs."https://www.kubemsb.com".auth]
  username = "admin"
  password = "12345"

[plugins."io.containerd.grpc.v1.cri".registry.configs."https://www.kubemsb.com".tls]

  cert_file = "/etc/rancher/rke2/www.kubemsb.com/www.kubemsb.com.pem"
  key_file = "/etc/rancher/rke2/www.kubemsb.com/www.kubemsb.com.key"

~~~

# 六、部署Nginx应用并访问

~~~powershell
# vim nginx.yaml
# cat nginx.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginxweb
spec:
  selector:
    matchLabels:
      app: nginxweb1
  replicas: 5
  template:
    metadata:
      labels:
        app: nginxweb1
    spec:
      containers:
      - name: nginxwebc
        image: www.kubemsb.com/library/nginx:latest
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
# kubectl apply -f nginx.yaml
~~~

# 七、通过RKE2卸载K8S集群

~~~powershell
# rke2-uninstall.sh
~~~

或

~~~powershell
# which rke2-uninstall.sh
/usr/local/bin/rke2-uninstall.sh

# /usr/local/bin/rke2-uninstall.sh
~~~

