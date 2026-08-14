---
title: 如何通过kube-vip实现K8S集群高可用
sidebarGroup: K8s 运维笔记
shortTitle: 44 如何通过kube-vip实现K8S集群高可用
order: 44
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: '如何通过kube-vip实现K8S集群高可用及Service LB 软件列表及软件版本：CentOS7U9, Linux kernel 5.4,docker-ce 24.0.7,cri-dockerd...'
---

> **K8s 课程笔记 · 第 46 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何通过kube-vip实现K8S集群高可用及Service LB

![image-20231207223257866](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20231207223257866.png)

> 软件列表及软件版本：CentOS7U9, Linux kernel 5.4,docker-ce 24.0.7,cri-dockerd v0.3.8,k8s集群为1.28.2

# 一、k8s集群节点准备

## 1.1 配置主机名

~~~powershell
# hostnamectl set-hostname k8s-xxx
修改xxx为当前主机分配的主机名
~~~

## 1.2 配置主机IP地址

~~~powershell
[root@xxx ~]# vim /etc/sysconfig/network-scripts/ifcfg-ens33 

[root@xxx ~]# cat  /etc/sysconfig/network-scripts/ifcfg-ens33 
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
UUID="063bfc1c-c7c2-4c62-89d0-35ae869e44e7"
DEVICE="ens33"
ONBOOT="yes"
IPADDR="192.168.10.16X" 修改X为当前主机分配的IP地址
PREFIX="24"
GATEWAY="192.168.10.2"
DNS1="119.29.29.29"

[root@xxx ~]# systemctl restart network
~~~

## 1.3 配置主机名与IP地址解析

~~~powershell
[root@xxx ~]# cat > /etc/hosts <<EOF
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.160 k8s-master01
192.168.10.161 k8s-master02
192.168.10.162 k8s-master03
192.168.10.163 k8s-worker01
192.168.10.164 k8s-worker02
192.168.10.200 lb.kubemsb.com
EOF
~~~

## 1.4 主机安全设置

~~~powershell
# systemctl disable --now firewalld
~~~

~~~powershell
# sed -ri 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config

# sestatus

注意：修改后需要重启计算机才能生效
~~~

## 1.5 时钟同步

~~~powershell
# crontab -l
0 */1 * * * /usr/sbin/ntpdate time1.aliyun.com
~~~

## 1.6 升级操作系统内核

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

## 1.7 配置内核路由转发及网桥过滤

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
~~~

## 1.8 安装ipset及ipvsadm

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

## 1.9 关闭SWAP分区

> 修改完成后需要重启操作系统，如不重启，可临时关闭，命令为swapoff -a

~~~powershell
永远关闭swap分区，需要重启操作系统
# cat /etc/fstab
......

# /dev/mapper/centos-swap swap                    swap    defaults        0 0

在上一行中行首添加#
~~~

## 1.10 配置ssh免密登录

~~~powershell
在k8s-master01节点生成证书，并创建authorized_keys文件
[root@k8s-master01 ~]# ssh-keygen
Generating public/private rsa key pair.
Enter file in which to save the key (/root/.ssh/id_rsa):
Created directory '/root/.ssh'.
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /root/.ssh/id_rsa.
Your public key has been saved in /root/.ssh/id_rsa.pub.
The key fingerprint is:
SHA256:4khS62jcABgQd7BIAEu/soZCf7ngqZLD1P4i0rrz+Ho root@k8s-master01
The key's randomart image is:
+---[RSA 2048]----+
|X+o..            |
|+=.o             |
|= ...            |
| . ...           |
| o+.o . S        |
|oo+O o..         |
|===o+o.          |
|O=Eo+ .          |
|B@=ooo           |
+----[SHA256]-----+
~~~

~~~powershell
[root@k8s-master01 ~]# cd /root/.ssh
[root@k8s-master01 .ssh]# ls
id_rsa  id_rsa.pub
~~~

~~~powershell
[root@k8s-master01 .ssh]# cp id_rsa.pub authorized_keys
[root@k8s-master01 .ssh]# ls
authorized_keys  id_rsa  id_rsa.pub
~~~

~~~powershell
[root@k8s-master01 ~]# for i in 161 162 163 164
> do
> scp -r /root/.ssh 192.168.10.$i:/root/
> done
~~~

~~~powershell
需要在每台主机上验证是否可以相互免密登录。
~~~

# 二、etcd集群部署

本次在k8s-master01、k8s-master02、k8s-master03上进行etcd集群部署

## 2.1 在k8s集群master节点上安装etcd

~~~powershell
# wget https://github.com/coreos/etcd/releases/download/v3.5.0/etcd-v3.5.0-linux-amd64.tar.gz
# tar xzvf etcd-v3.5.0-linux-amd64.tar.gz
# cd etcd-v3.5.0-linux-amd64/
# mv etcd* /usr/local/bin
~~~

## 2.2 生成etcd配置相关文件

~~~powershell
# tee /usr/lib/systemd/system/etcd.service <<-'EOF'
[Unit]
Description=Etcd Server
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/etcd \
--name=k8s-master01 \
--data-dir=/var/lib/etcd/default.etcd \
--listen-peer-urls=http://192.168.10.160:2380 \
--listen-client-urls=http://192.168.10.160:2379,http://127.0.0.1:2379 \
--advertise-client-urls=http://192.168.10.160:2379 \
--initial-advertise-peer-urls=http://192.168.10.160:2380 \
--initial-cluster=k8s-master01=http://192.168.10.160:2380,k8s-master02=http://192.168.10.161:2380,k8s-master03=http://192.168.10.162:2380 \
--initial-cluster-token=smartgo \
--initial-cluster-state=new 
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
~~~

~~~powershell
# tee /usr/lib/systemd/system/etcd.service <<-'EOF'
[Unit]
Description=Etcd Server
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/etcd \
--name=k8s-master02 \
--data-dir=/var/lib/etcd/default.etcd \
--listen-peer-urls=http://192.168.10.161:2380 \
--listen-client-urls=http://192.168.10.161:2379,http://127.0.0.1:2379 \
--advertise-client-urls=http://192.168.10.161:2379 \
--initial-advertise-peer-urls=http://192.168.10.161:2380 \
--initial-cluster=k8s-master01=http://192.168.10.160:2380,k8s-master02=http://192.168.10.161:2380,k8s-master03=http://192.168.10.162:2380 \
--initial-cluster-token=smartgo \
--initial-cluster-state=existing 
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
~~~

~~~powershell
# tee /usr/lib/systemd/system/etcd.service <<-'EOF'
[Unit]
Description=Etcd Server
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/etcd \
--name=k8s-master03 \
--data-dir=/var/lib/etcd/default.etcd \
--listen-peer-urls=http://192.168.10.162:2380 \
--listen-client-urls=http://192.168.10.162:2379,http://127.0.0.1:2379 \
--advertise-client-urls=http://192.168.10.162:2379 \
--initial-advertise-peer-urls=http://192.168.10.162:2380 \
--initial-cluster=k8s-master01=http://192.168.10.160:2380,k8s-master02=http://192.168.10.161:2380,k8s-master03=http://192.168.10.162:2380 \
--initial-cluster-token=smartgo \
--initial-cluster-state=existing 
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
~~~

## 2.3 在k8s集群master节点上启动etcd

~~~powershell
# systemctl enable --now etcd
~~~

## 2.4 检查etcd集群是否正常

~~~powershell
[root@k8s-master01 ~]# etcdctl member list
5c6e7b164c56b0ef: name=k8s-master03 peerURLs=http://192.168.10.162:2380 clientURLs=http://192.168.10.162:2379 isLeader=false
b069d39a050d98b3: name=k8s-master02 peerURLs=http://192.168.10.161:2380 clientURLs=http://192.168.10.161:2379 isLeader=false
f83acb046b7e55b3: name=k8s-master01 peerURLs=http://192.168.10.160:2380 clientURLs=http://192.168.10.160:2379 isLeader=true
~~~

~~~powershell
[root@k8s-master01 ~]# etcdctl endpoint health
~~~

# 三、容器运行时 Docker准备

## 3.1 docker安装

### 3.1.1  Docker安装YUM源准备

>使用阿里云开源软件镜像站。

~~~powershell
# wget https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -O /etc/yum.repos.d/docker-ce.repo
~~~

### 3.1.2 Docker安装

~~~powershell
# yum -y install docker-ce
~~~

### 3.1.3 启动Docker服务

~~~powershell
# systemctl enable --now docker
~~~

### 3.1.4 修改cgroup方式

>/etc/docker/daemon.json 默认没有此文件，需要单独创建

~~~powershell
在/etc/docker/daemon.json添加如下内容

# cat > /etc/docker/daemon.json << EOF
{
        "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF
~~~

~~~powershell
# systemctl restart docker
~~~

## 3.2 cri-dockerd安装

![image-20220507120653090](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20220507120653090.png)

![image-20220507120725815](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20220507120725815.png)

![image-20230420112920039](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20230420112920039.png)

![image-20230420113003265](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20230420113003265.png)

![image-20230420113038258](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20230420113038258.png)

~~~powershell
# wget https://github.com/Mirantis/cri-dockerd/releases/download/v0.3.8/cri-dockerd-0.3.8-3.el7.x86_64.rpm
~~~

~~~powershell
# yum -y install cri-dockerd-0.3.8-3.el7.x86_64.rpm
~~~

~~~powershell
# vim /usr/lib/systemd/system/cri-docker.service

修改第10行内容
ExecStart=/usr/bin/cri-dockerd --pod-infra-container-image=registry.k8s.io/pause:3.9 --container-runtime-endpoint fd://
~~~

~~~powershell
# systemctl start cri-docker
# systemctl enable cri-docker
~~~

# 四、K8S集群软件准备

## 4.1 K8S软件YUM源准备

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

## 4.2 K8S软件安装

### 4.2.1 软件安装

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
# yum -y install  kubeadm-1.28.2-0  kubelet-1.28.2-0 kubectl-1.28.2-0
~~~

### 4.2.2 kubelet配置

>为了实现docker使用的cgroupdriver与kubelet使用的cgroup的一致性，建议修改如下文件内容。

~~~powershell
# vim /etc/sysconfig/kubelet
KUBELET_EXTRA_ARGS="--cgroup-driver=systemd"
~~~

~~~powershell
设置kubelet为开机自启动即可，由于没有生成配置文件，集群初始化后自动启动
# systemctl enable kubelet
~~~

# 五、kube-vip准备

![image-20231207141350306](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20231207141350306.png)

~~~powershell
export  VIP=192.168.10.200
export INTERFACE=ens33
export KVVERSION=v0.6.4
~~~

~~~powershell
docker run -it --rm --net=host ghcr.io/kube-vip/kube-vip:$KVVERSION manifest pod \
--interface $INTERFACE \
--address $VIP \
--controlplane \
--services \
--arp \
--enableLoadBalancer \
--leaderElection | tee /etc/kubernetes/manifests/kube-vip.yaml
~~~

~~~powershell
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
    - name: vip_ddns
      value: "false"
    - name: svc_enable
      value: "true"
    - name: svc_leasename
      value: plndr-svcs-lock
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
    - name: prometheus_server
      value: :2112
    image: ghcr.io/kube-vip/kube-vip:v0.6.4
    imagePullPolicy: Always
    name: kube-vip
    resources: {}
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
~~~

~~~powershell
[root@k8s-master01 ~]# scp /etc/kubernetes/manifests/kube-vip.yaml k8s-master02:/etc/kubernetes/manifests/
~~~

~~~powershell
[root@k8s-master01 ~]# scp /etc/kubernetes/manifests/kube-vip.yaml k8s-master03:/etc/kubernetes/manifests/
~~~

# 六、K8S集群初始化

## 6.1 k8s集群容器镜像准备

> 可使用VPN实现下载。

~~~powershell
# kubeadm config images list --kubernetes-version=v1.28.2
~~~

~~~powershell
# kubeadm config images pull --kubernetes-version=v1.28.2 --cri-socket=unix:///var/run/cri-dockerd.sock
~~~

~~~powershell
# cat image_download.sh
#!/bin/bash
images_list='
镜像列表'

for i in $images_list
do
        docker pull $i
done

docker save -o k8s-1-28-2.tar $images_list
~~~

## 6.2 K8S集群初始化配置文件准备

### 6.2.1 查看不同 kind默认配置

~~~powershell
kubeadm config print init-defaults --component-configs KubeletConfiguration
kubeadm config print init-defaults --component-configs InitConfiguration
kubeadm config print init-defaults --component-configs ClusterConfiguration
~~~

### 6.2.2 生成配置文件样例 kubeadm-config.yaml

~~~powershell
[root@k8s-master01 ~]# kubeadm config print init-defaults --component-configs KubeProxyConfiguration > kubeadm.yaml
~~~

~~~powershell
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
  external:
    endpoints:
      - http://192.168.10.160:2379
      - http://192.168.10.161:2379
      - http://192.168.10.162:2379
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
bindAddress: 0.0.0.0
bindAddressHardFail: false
clientConnection:
  acceptContentTypes: ""
  burst: 0
  contentType: ""
  kubeconfig: /var/lib/kube-proxy/kubeconfig.conf
  qps: 0
clusterCIDR: ""
configSyncPeriod: 0s
conntrack:
  maxPerCore: null
  min: null
  tcpCloseWaitTimeout: null
  tcpEstablishedTimeout: null
detectLocal:
  bridgeInterface: ""
  interfaceNamePrefix: ""
detectLocalMode: ""
enableProfiling: false
healthzBindAddress: ""
hostnameOverride: ""
iptables:
  localhostNodePorts: null
  masqueradeAll: false
  masqueradeBit: null
  minSyncPeriod: 0s
  syncPeriod: 0s
ipvs:
  excludeCIDRs: null
  minSyncPeriod: 0s
  scheduler: ""
  strictARP: true
  syncPeriod: 0s
  tcpFinTimeout: 0s
  tcpTimeout: 0s
  udpTimeout: 0s
kind: KubeProxyConfiguration
logging:
  flushFrequency: 0
  options:
    json:
      infoBufferSize: "0"
  verbosity: 0
metricsBindAddress: ""
mode: "ipvs"
nodePortAddresses: null
oomScoreAdj: null
portRange: ""
showHiddenMetricsForVersion: ""
winkernel:
  enableDSR: false
  forwardHealthCheckVip: false
  networkName: ""
  rootHnsEndpointName: ""
  sourceVip: ""
EOF
~~~

## 6.3 使用初始化配置文件初始化集群第一个master节点

~~~powershell
# kubeadm init --config kubeadm.yaml --upload-certs --v=9
~~~

~~~powershell
输出以下内容，说明初始化成功。
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

You can now join any number of the control-plane node running the following command on each as root:

  kubeadm join lb.kubemsb.com:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:d2e611304c8f0277c9228378d5d2d1776970f638e90d9482444946a0b2ad3343 \
        --control-plane --certificate-key 7bcb6b9e1571631f2349de1972519120830882b27debaa5de62bbd460bccba37

Please note that the certificate-key gives access to cluster sensitive data, keep it secret!
As a safeguard, uploaded-certs will be deleted in two hours; If necessary, you can use
"kubeadm init phase upload-certs --upload-certs" to reload certs afterward.

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join lb.kubemsb.com:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:d2e611304c8f0277c9228378d5d2d1776970f638e90d9482444946a0b2ad3343
~~~

## 6.4  准备kubectl配置文件

~~~powershell
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
~~~

## 6.5 加入其它K8S集群master节点

~~~powershell
kubeadm join lb.kubemsb.com:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:d2e611304c8f0277c9228378d5d2d1776970f638e90d9482444946a0b2ad3343 \
        --control-plane --certificate-key 7bcb6b9e1571631f2349de1972519120830882b27debaa5de62bbd460bccba37 \
        --cri-socket unix:///var/run/cri-dockerd.sock
~~~

~~~powershell
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS     ROLES           AGE     VERSION
k8s-master01   NotReady   control-plane   6m39s   v1.28.2
k8s-master02   NotReady   control-plane   67s     v1.28.2
k8s-master03   NotReady   control-plane   28s     v1.28.2
~~~

## 6.6  加入worker节点

~~~powershell
kubeadm join lb.kubemsb.com:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:d2e611304c8f0277c9228378d5d2d1776970f638e90d9482444946a0b2ad3343 --cri-socket unix:///var/run/cri-dockerd.sock
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS     ROLES           AGE    VERSION
k8s-master01   NotReady   control-plane   26m    v1.28.2
k8s-master02   NotReady   control-plane   5m6s   v1.28.2
k8s-master03   NotReady   control-plane   3m2s   v1.28.2
k8s-worker01   NotReady   <none>          68s    v1.28.2
k8s-worker02   NotReady   <none>          71s    v1.28.2
~~~

## 6.7  网络插件calico部署及验证

> 使用calico部署集群网络
>
> 安装参考网址：https://projectcalico.docs.tigera.io/about/about-calico

![image-20230220180313085](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20230220180313085.png)

![image-20230220180556878](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20230220180556878.png)

~~~powershell
应用operator资源清单文件
[root@k8s-master01 ~]# kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.25.1/manifests/tigera-operator.yaml
~~~

~~~powershell
通过自定义资源方式安装
[root@k8s-master01 ~]# wget https://raw.githubusercontent.com/projectcalico/calico/v3.25.1/manifests/custom-resources.yaml
~~~

~~~powershell
修改文件第13行，修改为使用kubeadm init ----pod-network-cidr对应的IP地址段
[root@k8s-master01 ~]# vim custom-resources.yaml
......
 11     ipPools:
 12     - blockSize: 26
 13       cidr: 10.244.0.0/16 
 14       encapsulation: VXLANCrossSubnet
......
~~~

~~~powershell
应用资源清单文件
[root@k8s-master01 ~]# kubectl create -f custom-resources.yaml
~~~

~~~powershell
监视calico-sysem命名空间中pod运行情况
[root@k8s-master01 ~]# watch kubectl get pods -n calico-system
~~~

>Wait until each pod has the `STATUS` of `Running`.

~~~powershell
[root@k8s-master01 ~]# kubectl get nodes
NAME           STATUS   ROLES           AGE   VERSION
k8s-master01   Ready    control-plane   54m   v1.28.2
k8s-master02   Ready    control-plane   49m   v1.28.2
k8s-master03   Ready    control-plane   48m   v1.28.2
k8s-worker01   Ready    <none>          29m   v1.28.2
k8s-worker02   Ready    <none>          29m   v1.28.2
~~~

# 七、使用kube-vip实现Service LB

## 7.1 指定LB注解或使用loadBalancerIP

当 kube-vip 启动后，将在所有匹配类型为 loadBalancer 的服务上启用一个名为 watcher 的监听器。只有在填充了 `metadata.annotations["kube-vip.io/loadbalancerIPs"]` 或 `spec.loadBalancerIP` 的情况下，watcher 才会发布一个 Kubernetes service。

~~~powershell
[root@k8s-master01 ~]# mkdir kubevip
~~~

~~~powershell
[root@k8s-master01 ~]# cd kubevip
~~~

~~~powershell
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
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl apply -f nginx.yaml
deployment.apps/nginx-deployment created
service/nginx created
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7c79c4bf97-hmnff   1/1     Running   0          51s
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl get svc
NAME         TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
kubernetes   ClusterIP      10.96.0.1       <none>           443/TCP        120m
nginx        LoadBalancer   10.110.91.135   192.168.10.210   80:31037/TCP   20s
~~~

~~~powershell
[root@k8s-master01 kubevip]# curl http://192.168.10.210
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

![image-20231207195928576](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20231207195928576.png)

~~~powershell
[root@k8s-master01 kubevip]# cat > nginx.yaml<<EOF
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
  annotations:
    kube-vip.io/loadbalancerIPs: "192.168.10.211"
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl apply -f nginx.yaml
deployment.apps/nginx-deployment created
service/nginx created
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl get svc
NAME         TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
kubernetes   ClusterIP      10.96.0.1       <none>           443/TCP        148m
nginx        LoadBalancer   10.110.15.123   192.168.10.211   80:30756/TCP   4s
~~~

~~~powershell
[root@k8s-master01 kubevip]# curl http://192.168.10.211
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

![image-20231207201148877](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20231207201148877.png)

## 7.2 使用本地DHCP服务获取LoadBalancer EXTERNAL-IP

kube-vip 支持使用本地网络 DHCP 服务器为 kube-vip 提供负载均衡器地址，该地址可用于访问网络上的 Kubernetes 服务。

为了实现这一点，我们需要通过 `--load-balancer-ip=0.0.0.0` 来告诉 kube-vip 和云提供商不需要它们管理 LoadBalancer 的地址。

~~~powershell
[root@k8s-master01 kubevip]# cat > nginx-lb0.yaml <<EOF
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
  loadBalancerIP: 0.0.0.0
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl apply -f nginx-lb0.yaml
deployment.apps/nginx-deployment created
service/nginx created
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl get pods
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7c79c4bf97-m59x4   1/1     Running   0          38s
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl get svc
NAME         TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)        AGE
kubernetes   ClusterIP      10.96.0.1     <none>           443/TCP        165m
nginx        LoadBalancer   10.96.80.32   192.168.10.199   80:30888/TCP   67s
~~~

![image-20231207202700869](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20231207202700869.png)

## 7.3 使用kube-vip Cloud Provider提供IP地址

kube-vip Cloud Provider 可用于为类型为 LoadBalancer 的服务填充 IP 地址，类似于公共云提供商通过 Kubernetes CCM 的方式。同时也支持类似 MetalLB 通过 CIDR 或者 IP 范围分配 LoadBalancer 的 IP。

### 7.3.1 安装 kube-vip Cloud Provider

可以使用以下命令从 main 分支中的最新版本安装 kube-vip cloud provider：

~~~powershell
[root@k8s-master01 kubevip]# kubectl apply -f https://raw.githubusercontent.com/kube-vip/kube-vip-cloud-provider/main/manifest/kube-vip-cloud-controller.yaml

serviceaccount/kube-vip-cloud-controller created
clusterrole.rbac.authorization.k8s.io/system:kube-vip-cloud-controller-role created
clusterrolebinding.rbac.authorization.k8s.io/system:kube-vip-cloud-controller-binding created
deployment.apps/kube-vip-cloud-provider created
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl get deployment -n kube-system
NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
coredns                   2/2     2            2           3h4m
kube-vip-cloud-provider   1/1     1            1           112s
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl get pods -n kube-system
NAME                                       READY   STATUS    RESTARTS   AGE
coredns-5dd5756b68-g6lbj                   1/1     Running   0          3h2m
coredns-5dd5756b68-qcwm5                   1/1     Running   0          3h2m
kube-apiserver-k8s-master01                1/1     Running   0          3h5m
kube-apiserver-k8s-master02                1/1     Running   0          3h
kube-apiserver-k8s-master03                1/1     Running   0          3h
kube-controller-manager-k8s-master01       1/1     Running   0          3h5m
kube-controller-manager-k8s-master02       1/1     Running   0          3h
kube-controller-manager-k8s-master03       1/1     Running   0          3h
kube-proxy-76zf9                           1/1     Running   0          3h
kube-proxy-h4phb                           1/1     Running   0          160m
kube-proxy-hsc8k                           1/1     Running   0          3h
kube-proxy-jcv7q                           1/1     Running   0          3h2m
kube-proxy-zfdp5                           1/1     Running   0          161m
kube-scheduler-k8s-master01                1/1     Running   0          3h6m
kube-scheduler-k8s-master02                1/1     Running   0          3h
kube-scheduler-k8s-master03                1/1     Running   0          3h
kube-vip-cloud-provider-65f5dd4865-x2p5t   1/1     Running   0          49s
kube-vip-k8s-master01                      1/1     Running   0          3h3m
kube-vip-k8s-master02                      1/1     Running   0          3h
kube-vip-k8s-master03                      1/1     Running   0          3h
~~~

### 7.3.2 创建全局 CIDR 或 IP 地址范围

#### 7.3.2.1 创建全局 CIDR

要让 kube-vip 为 LoadBalancer 设置 IP 地址，它需要有可用的 IP 地址来分配。这些信息存储在一个 Kubernetes ConfigMap 中，并且允许 kube-vip 可以访问该 ConfigMap。你可以使用 ConfigMap 中的键来控制 IP 地址分配的范围。可以指定 CIDR 块或 IP 地址范围，并将其范围限定在全局（集群内）或每个命名空间内。

首先，该 ConfigMap 的名称要求是 `kubevip`，如果要创建全局的 CIDR 块，键的名称必须为 `cidr-global`，例如：

~~~powershell
[root@k8s-master01 kubevip]# kubectl create configmap -n kube-system kubevip --from-literal cidr-global=192.168.10.215/29
~~~

~~~powershell
[root@k8s-master01 kubevip]# cat > nginx-cidr.yaml <<EOF
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
  name: nginx-cidr
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl apply -f nginx-cidr.yaml
deployment.apps/nginx-deployment created
service/nginx-cidr created
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl get svc
NAME         TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
kubernetes   ClusterIP      10.96.0.1       <none>           443/TCP        3h40m
nginx-cidr   LoadBalancer   10.107.144.56   192.168.10.208   80:32389/TCP   5s
~~~

~~~powershell
[root@k8s-master01 kubevip]# curl http://192.168.10.208
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

![image-20231207213149882](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20231207213149882.png)

#### 7.3.2.2 IP地址范围

与 CIDR 块类似，可通过 range-global 设置可分配的 IP 地址范围：

~~~powershell
[root@k8s-master01 kubevip]# kubectl create configmap -n kube-system kubevip --from-literal range-global=192.168.10.220-192.168.10.230

configmap/kubevip created
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl describe cm kubevip -n kube-system
Name:         kubevip
Namespace:    kube-system
Labels:       <none>
Annotations:  <none>

Data
====
range-global:
----
192.168.10.220-192.168.10.230

BinaryData
====

Events:  <none>
~~~

~~~powershell
[root@k8s-master01 kubevip]# cat > nginx-range.yaml << EOF
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
  name: nginx-range
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: 80
EOF
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl apply -f nginx-range.yaml
deployment.apps/nginx-deployment created
service/nginx-range created
~~~

~~~powershell
[root@k8s-master01 kubevip]# kubectl get svc
NAME         TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)        AGE
kubernetes   ClusterIP      10.96.0.1      <none>           443/TCP        3h58m
nginx-range   LoadBalancer   10.96.74.245   192.168.10.220   80:30807/TCP   5s
~~~

![image-20231207214247729](/云原生/k8s-ops/k8s-ops-44-如何通过kube-vip实现k8s集群高可用/image-20231207214247729.png)

现在，在任何命名空间中创建类型为 LoadBalancer 的服务将从 ConfigMap 中定义的全局地址池中获取地址。

同时，kube-vip 也支持为单个命名空间来分配 CIDR 块或者 IP 范围，只需要将 `cidr-global` 或 `range-global` 替换为 `cidr-` 或 `range-` 即可。

