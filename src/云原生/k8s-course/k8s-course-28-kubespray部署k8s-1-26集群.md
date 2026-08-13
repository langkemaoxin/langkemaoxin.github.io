---
title: kubespray部署k8s 1.26集群
sidebarGroup: K8s 课程笔记
shortTitle: 28 kubespray部署k8s 1.26集群
order: 28
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: kubespray部署k8s 1.26集群指南 前言 Kubespray 是一个自由开源的工具，它提供了 Ansible 剧本(playbook) 来部署和管理 Kubernetes 集群。它旨在简化...
---

> **K8s 课程笔记 · 第 28 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# kubespray部署k8s 1.26集群指南

# 前言

Kubespray 是一个自由开源的工具，它提供了 Ansible *剧本(playbook)* 来部署和管理 Kubernetes 集群。它旨在简化跨多个节点的 Kubernetes 集群的安装过程，允许用户快速轻松地部署和管理生产就绪的 Kubernetes 集群。

它支持一系列操作系统，包括 Ubuntu、CentOS、Rocky Linux 和 Red Hat Enterprise Linux（RHEL），它可以在各种平台上部署 Kubernetes，包括裸机、公共云和私有云。

# 一、K8S集群节点准备

## 1.1 主机列表

| 主机名称     | IP地址            | 硬件配置 | 主机角色 |
| ------------ | ----------------- | -------- | -------- |
| k8s-master01 | 192.168.10.160/24 | 4C4G1T   | master   |
| k8s-master02 | 192.168.10.161/24 | 4C4G1T   | master   |
| k8s-master03 | 192.168.10.162/24 | 4C4G1T   | master   |
| k8s-worker01 | 192.168.10.163/24 | 4C4G1T   | worker   |
| k8s-worker02 | 192.168.10.164/24 | 4C4G1T   | worker   |
| kubespray    | 192.168.10.165/24 | 4C4G1T   | ansible  |

## 1.2  主机名解析

~~~powershell
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.160 k8s-master01
192.168.10.161 k8s-master02
192.168.10.162 k8s-master03
192.168.10.163 k8s-worker01
192.168.10.164 k8s-worker02
192.168.10.165 kubespray
~~~

## 1.3  kubespray节点python3准备

> 本次需要使用python3.10

### 1.3.1 安装 openssl

~~~powershell
[root@kubespray ~]# curl -o /etc/yum.repos.d/epel.repo http://mirrors.aliyun.com/repo/epel-7.repo
~~~

~~~powershell
[root@kubespray ~]# yum install -y ncurses-devel gdbm-devel xz-devel sqlite-devel tk-devel uuid-devel readline-devel bzip2-devel libffi-devel
~~~

~~~powershell
[root@kubespray ~]# yum install -y openssl-devel openssl11 openssl11-devel
~~~

~~~powershell
[root@kubespray ~]# openssl11 version
OpenSSL 1.1.1k  FIPS 25 Mar 2021
~~~

### 1.3.2 安装python 3.10.4

~~~powershell
mkdir -p /doc/temp && cd /doc/temp
wget https://www.python.org/ftp/python/3.10.4/Python-3.10.4.tgz
~~~

>编译主要需要注意的问题是设置编译FLAG，以便使用最新的openssl库。

~~~powershell
export CFLAGS=$(pkg-config --cflags openssl11)
export LDFLAGS=$(pkg-config --libs openssl11)
~~~

~~~powershell
[root@kubespray temp]# echo $CFLAGS
-I/usr/include/openssl11
[root@kubespray temp]# echo $LDFLAGS
-L/usr/lib64/openssl11 -lssl -lcrypto
~~~

~~~powershell
[root@kubespray temp]# tar xf Python-3.10.4.tgz
[root@kubespray temp]# ls
Python-3.10.4  Python-3.10.4.tgz
[root@kubespray temp]# cd Python-3.10.4/
[root@kubespray Python-3.10.4]#
~~~

~~~powershell
[root@kubespray Python-3.10.4]# ./configure --enable-optimizations && make altinstall
~~~

~~~powershell
[root@kubespray Python-3.10.4]# python3.10 --version
Python 3.10.4
[root@kubespray Python-3.10.4]# pip3.10 --version
pip 22.0.4 from /usr/local/lib/python3.10/site-packages/pip (python 3.10)
~~~

~~~powershell
[root@kubespray Python-3.10.4]# ln -sf /usr/local/bin/python3.10 /usr/bin/python3
[root@kubespray Python-3.10.4]# ln -sf /usr/local/bin/pip3.10  /usr/bin/pip3
~~~

~~~powershell
[root@kubespray Python-3.10.4]# pip3 install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple
~~~

~~~powershell
[root@kubespray Python-3.10.4]# pip3 list
Package    Version
---------- -------
pip        23.1.2
setuptools 58.1.0
~~~

## 1.4  kubespray源文件获取

~~~powershell
[root@kubespray ~]# git clone https://github.com/kubernetes-sigs/kubespray.git
~~~

~~~powershell
[root@kubespray ~]# ls
kubespray 
~~~

~~~powershell
[root@kubespray ~]# cd kubespray/
[root@kubespray kubespray]# ls
ansible.cfg         CONTRIBUTING.md  inventory  OWNERS_ALIASES             RELEASE.md             roles              setup.py
cluster.yml         Dockerfile       library    pipeline.Dockerfile        remove-node.yml        run.rc             test-infra
CNAME               docs             LICENSE    playbooks                  requirements-2.11.txt  scale.yml          tests
code-of-conduct.md  extra_playbooks  logo       plugins                    requirements-2.12.txt  scripts            upgrade-cluster.yml
_config.yml         galaxy.yml       Makefile   README.md                  requirements.txt       SECURITY_CONTACTS  Vagrantfile
contrib             index.html       OWNERS     recover-control-plane.yml  reset.yml              setup.cfg
~~~

## 1.5 kubespray环境准备

~~~powershell
[root@kubespray kubespray]# pip3 install -r requirements.txt
~~~

~~~powershell
[root@kubespray kubespray]# ansible --version
ansible [core 2.12.5]
  config file = /root/kubespray/ansible.cfg
  configured module search path = ['/root/kubespray/library']
  ansible python module location = /usr/local/lib/python3.10/site-packages/ansible
  ansible collection location = /root/.ansible/collections:/usr/share/ansible/collections
  executable location = /usr/local/bin/ansible
  python version = 3.10.4 (main, Apr 27 2023, 10:58:46) [GCC 4.8.5 20150623 (Red Hat 4.8.5-44)]
  jinja version = 3.1.2
  libyaml = True
~~~

## 1.6 创建主机清单

~~~powershell
[root@kubespray kubespray]# ls inventory/
local  sample
[root@kubespray kubespray]# cp -rfp inventory/sample inventory/mycluster
[root@kubespray kubespray]# ls inventory/
local  mycluster  sample
~~~

~~~powershell
[root@kubespray kubespray]# declare -a IPS=(192.168.10.160 192.168.10.161 192.168.10.162 192.168.10.163 192.168.10.164)
~~~

~~~powershell
[root@kubespray kubespray]# ls inventory/mycluster/
group_vars  inventory.ini  patches

[root@kubespray kubespray]# CONFIG_FILE=inventory/mycluster/hosts.yaml python3 contrib/inventory_builder/inventory.py ${IPS[@]}

DEBUG: Adding group all
DEBUG: Adding group kube_control_plane
DEBUG: Adding group kube_node
DEBUG: Adding group etcd
DEBUG: Adding group k8s_cluster
DEBUG: Adding group calico_rr
DEBUG: adding host node1 to group all
DEBUG: adding host node2 to group all
DEBUG: adding host node3 to group all
DEBUG: adding host node4 to group all
DEBUG: adding host node5 to group all
DEBUG: adding host node1 to group etcd
DEBUG: adding host node2 to group etcd
DEBUG: adding host node3 to group etcd
DEBUG: adding host node1 to group kube_control_plane
DEBUG: adding host node2 to group kube_control_plane
DEBUG: adding host node1 to group kube_node
DEBUG: adding host node2 to group kube_node
DEBUG: adding host node3 to group kube_node
DEBUG: adding host node4 to group kube_node
DEBUG: adding host node5 to group kube_node
[root@kubespray kubespray]# ls inventory/mycluster/
group_vars  hosts.yaml  inventory.ini  patches
~~~

~~~powershell
[root@kubespray kubespray]# cat inventory/mycluster/hosts.yaml
all:
  hosts:
    node1:
      ansible_host: 192.168.10.160
      ip: 192.168.10.160
      access_ip: 192.168.10.160
    node2:
      ansible_host: 192.168.10.161
      ip: 192.168.10.161
      access_ip: 192.168.10.161
    node3:
      ansible_host: 192.168.10.162
      ip: 192.168.10.162
      access_ip: 192.168.10.162
    node4:
      ansible_host: 192.168.10.163
      ip: 192.168.10.163
      access_ip: 192.168.10.163
    node5:
      ansible_host: 192.168.10.164
      ip: 192.168.10.164
      access_ip: 192.168.10.164
  children:
    kube_control_plane:
      hosts:
        node1:
        node2:
    kube_node:
      hosts:
        node1:
        node2:
        node3:
        node4:
        node5:
    etcd:
      hosts:
        node1:
        node2:
        node3:
    k8s_cluster:
      children:
        kube_control_plane:
        kube_node:
    calico_rr:
      hosts: {}
      
修改为：添加了一个master，删除了二个node
[root@kubespray kubespray]# cat inventory/mycluster/hosts.yaml
all:
  hosts:
    node1:
      ansible_host: 192.168.10.160
      ip: 192.168.10.160
      access_ip: 192.168.10.160
    node2:
      ansible_host: 192.168.10.161
      ip: 192.168.10.161
      access_ip: 192.168.10.161
    node3:
      ansible_host: 192.168.10.162
      ip: 192.168.10.162
      access_ip: 192.168.10.162
    node4:
      ansible_host: 192.168.10.163
      ip: 192.168.10.163
      access_ip: 192.168.10.163
    node5:
      ansible_host: 192.168.10.164
      ip: 192.168.10.164
      access_ip: 192.168.10.164
  children:
    kube_control_plane:
      hosts:
        node1:
        node2:
        node3:
    kube_node:
      hosts:
        node4:
        node5:
    etcd:
      hosts:
        node1:
        node2:
        node3:
    k8s_cluster:
      children:
        kube_control_plane:
        kube_node:
    calico_rr:
      hosts: {}
~~~

## 1.7 准备K8S集群配置文件

~~~powershell
[root@kubespray kubespray]# cat inventory/mycluster/group_vars/k8s_cluster/k8s-cluster.yml
---
# Kubernetes configuration dirs and system namespace.
# Those are where all the additional config stuff goes
# the kubernetes normally puts in /srv/kubernetes.
# This puts them in a sane location and namespace.
# Editing those values will almost surely break something.
kube_config_dir: /etc/kubernetes
kube_script_dir: "{{ bin_dir }}/kubernetes-scripts"
kube_manifest_dir: "{{ kube_config_dir }}/manifests"

# This is where all the cert scripts and certs will be located
kube_cert_dir: "{{ kube_config_dir }}/ssl"

# This is where all of the bearer tokens will be stored
kube_token_dir: "{{ kube_config_dir }}/tokens"

kube_api_anonymous_auth: true

## Change this to use another Kubernetes version, e.g. a current beta release
kube_version: v1.26.3

# Where the binaries will be downloaded.
# Note: ensure that you've enough disk space (about 1G)
local_release_dir: "/tmp/releases"
# Random shifts for retrying failed ops like pushing/downloading
retry_stagger: 5

# This is the user that owns tha cluster installation.
kube_owner: kube

修改：重点观察20、70、76、81、160行等
默认可以不用修改。

~~~

## 1.8 准备k8s集群插件文件

> 要启用 Kuberenetes 仪表板和入口控制器等插件，请在文件`inventory/mycluster/group_vars/k8s_cluster/addons.yml` 中将参数设置为已启用：

~~~powershell
根据自身业务需要开启对应的服务即可。例如：
[root@kubespray kubespray]# vim inventory/mycluster/group_vars/k8s_cluster/addons.yml
1 ---
  2 # Kubernetes dashboard
  3 # RBAC required. see docs/getting-started.md for access details.
  4 dashboard_enabled: true
  5
  6 # Helm deployment
  7 helm_enabled: false
  8
  9 # Registry deployment
 10 registry_enabled: false
 11 # registry_namespace: kube-system
 12 # registry_storage_class: ""
 13 # registry_disk_size: "10Gi"
 14
 15 # Metrics Server deployment
 16 metrics_server_enabled: false
~~~

## 1.9 准备ssh密钥

### 1.9.1 在kubespray主机生成ssh密钥

~~~powershell
[root@kubespray ~]# ssh-keygen
~~~

### 1.9.2 使用ssh-copy-id复制ssh密钥到k8s集群节点主机

~~~powershell
[root@kubespray ~]# ssh-copy-id root@192.168.10.160
[root@kubespray ~]# ssh-copy-id root@192.168.10.161
[root@kubespray ~]# ssh-copy-id root@192.168.10.162
[root@kubespray ~]# ssh-copy-id root@192.168.10.163
[root@kubespray ~]# ssh-copy-id root@192.168.10.164
~~~

### 1.9.3 在K8S集群节点添加sysops用户指行授权

> 所有的k8s集群节点

~~~powershell
echo "sysops ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/sysops
~~~

## 1.10 k8s集群主机安全设置

~~~powershell
[root@kubespray ~]# cd kubespray/
~~~

~~~powershell
[root@kubespray kubespray]# ansible all -i inventory/mycluster/hosts.yaml -m shell -a "systemctl stop firewalld && systemctl disable firewalld"
~~~

## 1.11 k8s集群主机路由转发设置

~~~powershell
[root@kubespray kubespray]# ansible all -i inventory/mycluster/hosts.yaml -m shell -a "echo 'net.ipv4.ip_forward=1' | tee -a /etc/sysctl.conf"
~~~

## 1.12 禁用swap分区

~~~powershell
[root@kubespray kubespray]# ansible all -i inventory/mycluster/hosts.yaml -m shell -a "sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab &&  swapoff -a"
~~~

# 二、k8s集群部署及可用性验证

~~~powershell
[root@kubespray ~]# cd kubespray/
~~~

~~~powershell
[root@kubespray kubespray]# ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root cluster.yml
~~~

> 如果没有执行成功，可以多次执行。

~~~powershell
[root@k8s-master01 ~]# kubectl create deployment demo-nginx-kubespray --image=nginx --replicas=2
deployment.apps/demo-nginx-kubespray created

[root@k8s-master01 ~]# kubectl get pods
NAME                                   READY   STATUS              RESTARTS   AGE
demo-nginx-kubespray-b65cf84cd-jzkzf   1/1     Running             0          16s

demo-nginx-kubespray-b65cf84cd-v2nv4   0/1     ContainerCreating   0          16s
[root@k8s-master01 ~]# kubectl expose deployment demo-nginx-kubespray --type NodePort --port=80
service/demo-nginx-kubespray exposed

[root@k8s-master01 ~]# kubectl get svc
NAME                   TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE
demo-nginx-kubespray   NodePort    10.233.7.87   <none>        80:30532/TCP   4s
kubernetes             ClusterIP   10.233.0.1    <none>        443/TCP        16m

[root@k8s-master01 ~]# kubectl get  deployments.apps
NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
demo-nginx-kubespray   2/2     2            2           116s

[root@k8s-master01 ~]# kubectl get pods
NAME                                   READY   STATUS    RESTARTS   AGE
demo-nginx-kubespray-b65cf84cd-jzkzf   1/1     Running   0          44s
demo-nginx-kubespray-b65cf84cd-v2nv4   1/1     Running   0          44s

[root@k8s-master01 ~]# kubectl get svc demo-nginx-kubespray
NAME                   TYPE       CLUSTER-IP    EXTERNAL-IP   PORT(S)        AGE
demo-nginx-kubespray   NodePort   10.233.7.87   <none>        80:30532/TCP   17s
~~~

![image-20230427123639273](C:\Users\tangf\Desktop\kubespray部署k8s 1.26集群\01-笔记\kubespray部署k8s 1.26集群.assets\image-20230427123639273.png)

# 

# 三、移除节点

> 不用修改hosts.yaml文件

~~~powershell
[root@kubespray kubespray]# ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root remove-node.yml -v -b --extra-vars "node=node5"
~~~

# 四、增加节点

> 需要修改hosts.yaml文件,在inventory/mycluster/hosts.yaml中添加新增节点信息

~~~powershell
[root@kubespray kubespray]# cat inventory/mycluster/hosts.yaml
all:
  hosts:
    node1:
      ansible_host: 192.168.10.160
      ip: 192.168.10.160
      access_ip: 192.168.10.160
    node2:
      ansible_host: 192.168.10.161
      ip: 192.168.10.161
      access_ip: 192.168.10.161
    node3:
      ansible_host: 192.168.10.162
      ip: 192.168.10.162
      access_ip: 192.168.10.162
    node4:  添加
      ansible_host: 192.168.10.163
      ip: 192.168.10.163
      access_ip: 192.168.10.163
    node5:  添加
      ansible_host: 192.168.10.164
      ip: 192.168.10.164
      access_ip: 192.168.10.164
  children:
    kube_control_plane:
      hosts:
        node1:
        node2:
        node3:
    kube_node:
      hosts:
        node4:  添加
        node5:  添加
    etcd:
      hosts:
        node1:
        node2:
        node3:
    k8s_cluster:
      children:
        kube_control_plane:
        kube_node:
    calico_rr:
      hosts: {}
~~~

~~~powershell
[root@kubespray kubespray]# ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root scale.yml -v -b
~~~

# 五、清理k8s集群

~~~powershell
[root@kubespray ~]# cd kubespray/
[root@kubespray kubespray]# ansible-playbook -i inventory/mycluster/hosts.yaml  --become --become-user=root reset.yml
~~~

