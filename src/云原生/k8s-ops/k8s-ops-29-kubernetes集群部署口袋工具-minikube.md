---
title: Kubernetes集群部署口袋工具 minikube
sidebarGroup: K8s 运维笔记
shortTitle: 29 Kubernetes集群部署口袋工具 minik
order: 29
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: 'Kubernetes集群部署口袋工具 minikube 一、minikube介绍 minikube is local Kubernetes, focusing on making it easy to...'
---

> **K8s 课程笔记 · 第 29 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Kubernetes集群部署口袋工具 minikube

# 一、minikube介绍

**minikube is local Kubernetes, focusing on making it easy to learn and develop for Kubernetes.**

**Minikube是一个本地的Kubernetes，专注于使其易于学习和开发Kubernetes。**

# 二、容器运行时Docker安装

## 2.1 Docker安装YUM源准备

>使用阿里云开源软件镜像站。

~~~powershell
# wget https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -O /etc/yum.repos.d/docker-ce.repo
~~~

## 2.2 Docker安装

~~~powershell
# yum -y install docker-ce
~~~

## 2.3 启动Docker服务

~~~powershell
# systemctl enable --now docker
~~~

## 2.4 验证docker版本

~~~powershell
# docker version
Client: Docker Engine - Community
 Version:           24.0.7
 API version:       1.43
 Go version:        go1.20.10
 Git commit:        afdd53b
 Built:             Thu Oct 26 09:11:35 2023
 OS/Arch:           linux/amd64
 Context:           default

Server: Docker Engine - Community
 Engine:
  Version:          24.0.7
  API version:      1.43 (minimum version 1.12)
  Go version:       go1.20.10
  Git commit:       311b9ff
  Built:            Thu Oct 26 09:10:36 2023
  OS/Arch:          linux/amd64
  Experimental:     false
 containerd:
  Version:          1.6.25
  GitCommit:        d8f198a4ed8892c764191ef7b3b06d8a2eeb5c7f
 runc:
  Version:          1.1.10
  GitCommit:        v1.1.10-0-g18a0cb0
 docker-init:
  Version:          0.19.0
  GitCommit:        de40ad0
~~~

# 三、minikube安装

![image-20231129152754554](/云原生/k8s-ops/k8s-ops-29-kubernetes集群部署口袋工具-minikube/image-20231129152754554.png)

![image-20231129152829281](/云原生/k8s-ops/k8s-ops-29-kubernetes集群部署口袋工具-minikube/image-20231129152829281.png)

![image-20231129152904769](/云原生/k8s-ops/k8s-ops-29-kubernetes集群部署口袋工具-minikube/image-20231129152904769.png)

![image-20231129152943327](/云原生/k8s-ops/k8s-ops-29-kubernetes集群部署口袋工具-minikube/image-20231129152943327.png)

~~~powershell
# wget https://github.com/kubernetes/minikube/releases/download/v1.32.0/minikube-1.32.0-0.x86_64.rpm
~~~

~~~powershell
# yum -y install minikube-1.32.0-0.x86_64.rpm
~~~

~~~powershell
# minikube version
minikube version: v1.32.0
commit: 8220a6eb95f0a4d75f7f2d7b14cef975f050512d
~~~

~~~powershell
# minikube --help
minikube 提供并管理针对开发工作流程优化的本地 Kubernetes 集群。

基本命令：
  start            启动本地 Kubernetes 集群
  status           获取本地 Kubernetes 集群状态
  stop             停止正在运行的本地 Kubernetes 集群
  delete           删除本地的 Kubernetes 集群
  dashboard        访问在 minikube 集群中运行的 kubernetes dashboard
  pause            暂停 Kubernetes
  unpause          恢复 Kubernetes

镜像命令
  docker-env       提供将终端的 docker-cli 指向 minikube 内部 Docker Engine 的说明。（用于直接在 minikube 内构建 docker 镜像）
  podman-env       配置环境以使用 minikube's Podman service
  cache            管理 images 缓存
  image            管理 images

配置和管理命令：
  addons           启用或禁用 minikube 插件
  config           修改持久配置值
  profile          获取或列出当前配置文件（集群）
  update-context   IP或端口更改的情况下更新 kubeconfig 配置文件

网络和连接命令：
  service          返回用于连接到 service 的 URL
  tunnel           连接到 LoadBalancer 服务

高级命令：
  mount            将指定的目录挂载到 minikube
  ssh              登录到 minikube 环境（用于调试）
  kubectl          运行与集群版本匹配的 kubectl 二进制文件
  node             添加，删除或者列出其他的节点
  cp               将指定的文件复制到 minikube

故障排除命令
  ssh-key          检索指定节点的 ssh 密钥路径
  ssh-host         检索指定节点的 ssh 主机密钥
  ip               检索指定节点的IP地址
  logs             返回用于调试本地 Kubernetes 集群的日志
  update-check     打印当前版本和最新版本
  version          打印 minikube 版本
  options          显示全局命令行选项列表 (应用于所有命令)。

Other Commands:
  completion       生成命令补全的 shell 脚本
  license          将依赖项的 licenses 输出到一个目录

Use "minikube <command> --help" for more information about a given command.
~~~

# 四、minikube部署K8S集群

## 4.1 启动一个K8S集群

~~~powershell
# minikube start --driver=docker
* Centos 7.9.2009 上的 minikube v1.32.0
* 根据用户配置使用 docker 驱动程序
* The "docker" driver should not be used with root privileges. If you wish to continue as root, use --force.
* 如果您在VM中运行 minikube，请考虑使用 --driver=none:
*   https://minikube.sigs.k8s.io/docs/reference/drivers/none/

X 因 DRV_AS_ROOT 错误而退出：docker 驱动不应使用 root 权限。
~~~

~~~powershell
# minikube start --driver=docker --force
* Centos 7.9.2009 上的 minikube v1.32.0
! 当提供 --force 参数时，minikube 将跳过各种验证，这可能会导致意外行为
* 根据用户配置使用 docker 驱动程序
* The "docker" driver should not be used with root privileges. If you wish to continue as root, use --force.
* 如果您在VM中运行 minikube，请考虑使用 --driver=none:
*   https://minikube.sigs.k8s.io/docs/reference/drivers/none/
* 使用具有 root 权限的 Docker 驱动程序
* 正在集群 minikube 中启动控制平面节点 minikube
* 正在拉取基础镜像 ...
* 正在下载 Kubernetes v1.28.3 的预加载文件...
~~~

~~~powershell
# minikube start --driver=docker --force
* Centos 7.9.2009 上的 minikube v1.32.0
! 当提供 --force 参数时，minikube 将跳过各种验证，这可能会导致意外行为
* 根据用户配置使用 docker 驱动程序
* The "docker" driver should not be used with root privileges. If you wish to continue as root, use --force.
* 如果您在VM中运行 minikube，请考虑使用 --driver=none:
*   https://minikube.sigs.k8s.io/docs/reference/drivers/none/
* 使用具有 root 权限的 Docker 驱动程序
* 正在集群 minikube 中启动控制平面节点 minikube
* 正在拉取基础镜像 ...
* 正在下载 Kubernetes v1.28.3 的预加载文件...
    > preloaded-images-k8s-v18-v1...:  403.35 MiB / 403.35 MiB  100.00% 9.31 Mi
    > gcr.io/k8s-minikube/kicbase...:  453.90 MiB / 453.90 MiB  100.00% 9.58 Mi
* Creating docker container (CPUs=2, Memory=2200MB) ...
! This container is having trouble accessing https://registry.k8s.io
* To pull new external images, you may need to configure a proxy: https://minikube.sigs.k8s.io/docs/reference/networking/proxy/
* 正在 Docker 24.0.7 中准备 Kubernetes v1.28.3…
  - 正在生成证书和密钥...
  - 正在启动控制平面...
  - 配置 RBAC 规则 ...
* 配置 bridge CNI (Container Networking Interface) ...
  - 正在使用镜像 gcr.io/k8s-minikube/storage-provisioner:v5
* 正在验证 Kubernetes 组件...
* 启用插件： storage-provisioner, default-storageclass
* kubectl not found. If you need it, try: 'minikube kubectl -- get pods -A'
* 完成！kubectl 现在已配置，默认使用"minikube"集群和"default"命名空间
~~~

或

~~~powershell
# minikube start --driver=docker --force --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers
* Centos 7.9.2009 上的 minikube v1.32.0
! 当提供 --force 参数时，minikube 将跳过各种验证，这可能会导致意外行为
* 根据现有的配置文件使用 docker 驱动程序
* The "docker" driver should not be used with root privileges. If you wish to continue as root, use --force.
* 如果您在VM中运行 minikube，请考虑使用 --driver=none:
*   https://minikube.sigs.k8s.io/docs/reference/drivers/none/
* 提示：要删除此 root 拥有的集群，请运行：sudo minikube delete
* 正在集群 minikube 中启动控制平面节点 minikube
* 正在拉取基础镜像 ...
* 正在更新运行中的 docker "minikube" container ...
* 正在 Docker 24.0.7 中准备 Kubernetes v1.28.3…
* 正在验证 Kubernetes 组件...
  - 正在使用镜像 gcr.io/k8s-minikube/storage-provisioner:v5
* 启用插件： storage-provisioner, default-storageclass
* kubectl not found. If you need it, try: 'minikube kubectl -- get pods -A'
* 完成！kubectl 现在已配置，默认使用"minikube"集群和"default"命名空间
~~~

## 4.2 验证K8S集群状态

~~~powershell
# docker ps
CONTAINER ID   IMAGE                                 COMMAND                   CREATED          STATUS          PORTS                                                                                                                                  NAMES
ab8662e57c97   gcr.io/k8s-minikube/kicbase:v0.0.42   "/usr/local/bin/entr…"   11 minutes ago   Up 11 minutes   127.0.0.1:32772->22/tcp, 127.0.0.1:32771->2376/tcp, 127.0.0.1:32770->5000/tcp, 127.0.0.1:32769->8443/tcp, 127.0.0.1:32768->32443/tcp   minikube
~~~

~~~powershell
# minikube kubectl -- get nodes
    > kubectl.sha256:  64 B / 64 B [-------------------------] 100.00% ? p/s 0s
    > kubectl:  47.56 MiB / 47.56 MiB [-------------] 100.00% 7.87 MiB p/s 6.2s
NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   82s   v1.28.3
~~~

~~~powershell
# minikube kubectl -- get pods -A
NAMESPACE     NAME                               READY   STATUS    RESTARTS   AGE
kube-system   coredns-5dd5756b68-nn5b6           1/1     Running   0          98s
kube-system   etcd-minikube                      1/1     Running   0          112s
kube-system   kube-apiserver-minikube            1/1     Running   0          112s
kube-system   kube-controller-manager-minikube   1/1     Running   0          112s
kube-system   kube-proxy-r59wm                   1/1     Running   0          99s
kube-system   kube-scheduler-minikube            1/1     Running   0          112s
kube-system   storage-provisioner                1/1     Running   0          111s
~~~

# 五、K8S集群客户端Kubectl安装及使用

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

~~~powershell
# yum -y install kubectl
~~~

~~~powershell
# kubectl get nodes
NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   14m   v1.28.3

# kubectl get pods -n kube-system
NAME                               READY   STATUS    RESTARTS        AGE
coredns-5dd5756b68-nn5b6           1/1     Running   1 (5m45s ago)   14m
etcd-minikube                      1/1     Running   1 (5m50s ago)   15m
kube-apiserver-minikube            1/1     Running   1 (5m40s ago)   15m
kube-controller-manager-minikube   1/1     Running   1 (5m50s ago)   15m
kube-proxy-r59wm                   1/1     Running   1 (5m50s ago)   14m
kube-scheduler-minikube            1/1     Running   1 (5m50s ago)   15m
storage-provisioner                1/1     Running   2 (5m32s ago)   15m
~~~

~~~powershell
# kubectl run nginxweb1 --image=nginx:latest
~~~

# 六、使用minikube对K8S集群进行管理

## 6.1 查看K8S集群状态

~~~powershell
获取取本地 Kubernetes 集群状态
# minikube status
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured

~~~

## 6.2暂停、取消暂停、停止K8S、启动已有停止K8S集群

~~~powershell
暂停虚拟机
# minikube pause
* 正在暂停节点 minikube ...
* 已暂停命名空间：kube-system, kubernetes-dashboard, storage-gluster, istio-operator 中 14 个容器
~~~

~~~powershell
# minikube unpause
* 取消暂停节点 minikube ...
* 已取消暂停在命名空间：kube-system, kubernetes-dashboard, storage-gluster, istio-operator 中 14 个容器
~~~

~~~powershell
# minikube stop
* 正在停止节点 "minikube" ...
* 正在通过 SSH 关闭“minikube”…
* 1 个节点已停止。
~~~

~~~powershell
启动本地已经存在K8S集群
# minikube start --force
* Centos 7.9.2009 上的 minikube v1.32.0
! 当提供 --force 参数时，minikube 将跳过各种验证，这可能会导致意外行为
* 根据现有的配置文件使用 docker 驱动程序
* The "docker" driver should not be used with root privileges. If you wish to continue as root, use --force.
* 如果您在VM中运行 minikube，请考虑使用 --driver=none:
*   https://minikube.sigs.k8s.io/docs/reference/drivers/none/
* 提示：要删除此 root 拥有的集群，请运行：sudo minikube delete
* 正在集群 minikube 中启动控制平面节点 minikube
* 正在拉取基础镜像 ...
* Restarting existing docker container for "minikube" ...
* 正在 Docker 24.0.7 中准备 Kubernetes v1.28.3…
* 配置 bridge CNI (Container Networking Interface) ...
* 正在验证 Kubernetes 组件...
  - 正在使用镜像 gcr.io/k8s-minikube/storage-provisioner:v5
* 启用插件： storage-provisioner, default-storageclass
* 完成！kubectl 现在已配置，默认使用"minikube"集群和"default"命名空间

~~~

## 6.3 addons管理

~~~powershell
查看minikube安装目录列表

# minikube addons list
|-----------------------------|----------|--------------|--------------------------------|
|         ADDON NAME          | PROFILE  |    STATUS    |           MAINTAINER           |
|-----------------------------|----------|--------------|--------------------------------|
| ambassador                  | minikube | disabled     | 3rd party (Ambassador)         |
| auto-pause                  | minikube | disabled     | minikube                       |
| cloud-spanner               | minikube | disabled     | Google                         |
| csi-hostpath-driver         | minikube | disabled     | Kubernetes                     |
| dashboard                   | minikube | disabled     | Kubernetes                     |
| default-storageclass        | minikube | enabled ✅   | Kubernetes                     |
| efk                         | minikube | disabled     | 3rd party (Elastic)            |
| freshpod                    | minikube | disabled     | Google                         |
| gcp-auth                    | minikube | disabled     | Google                         |
| gvisor                      | minikube | disabled     | minikube                       |
| headlamp                    | minikube | disabled     | 3rd party (kinvolk.io)         |
| helm-tiller                 | minikube | disabled     | 3rd party (Helm)               |
| inaccel                     | minikube | disabled     | 3rd party (InAccel             |
|                             |          |              | [info@inaccel.com])            |
| ingress                     | minikube | disabled     | Kubernetes                     |
| ingress-dns                 | minikube | disabled     | minikube                       |
| inspektor-gadget            | minikube | disabled     | 3rd party                      |
|                             |          |              | (inspektor-gadget.io)          |
| istio                       | minikube | disabled     | 3rd party (Istio)              |
| istio-provisioner           | minikube | disabled     | 3rd party (Istio)              |
| kong                        | minikube | disabled     | 3rd party (Kong HQ)            |
| kubeflow                    | minikube | disabled     | 3rd party                      |
| kubevirt                    | minikube | disabled     | 3rd party (KubeVirt)           |
| logviewer                   | minikube | disabled     | 3rd party (unknown)            |
| metallb                     | minikube | disabled     | 3rd party (MetalLB)            |
| metrics-server              | minikube | disabled     | Kubernetes                     |
| nvidia-device-plugin        | minikube | disabled     | 3rd party (NVIDIA)             |
| nvidia-driver-installer     | minikube | disabled     | 3rd party (Nvidia)             |
| nvidia-gpu-device-plugin    | minikube | disabled     | 3rd party (Nvidia)             |
| olm                         | minikube | disabled     | 3rd party (Operator Framework) |
| pod-security-policy         | minikube | disabled     | 3rd party (unknown)            |
| portainer                   | minikube | disabled     | 3rd party (Portainer.io)       |
| registry                    | minikube | disabled     | minikube                       |
| registry-aliases            | minikube | disabled     | 3rd party (unknown)            |
| registry-creds              | minikube | disabled     | 3rd party (UPMC Enterprises)   |
| storage-provisioner         | minikube | enabled ✅   | minikube                       |
| storage-provisioner-gluster | minikube | disabled     | 3rd party (Gluster)            |
| storage-provisioner-rancher | minikube | disabled     | 3rd party (Rancher)            |
| volumesnapshots             | minikube | disabled     | Kubernetes                     |
|-----------------------------|----------|--------------|--------------------------------|
~~~

~~~powershell
# minikube addons --help
插件使用诸如 "minikube addons enable dashboard" 的子命令修改 minikube 的插件文件

Available Commands:
  configure     在 minikube 中配置插件 w/ADDON_NAME（例如：minikube addons configure registry-creds）。查看相关可用的插件列表，请使用：minikube
addons list
  disable       禁用 minikube 中的 ADDON_NAME 插件（示例：minikube addons disable dashboard）。要获取可用插件的列表，请使用 minikube addons list
  enable        在 minikube 中启用 ADDON_NAME 插件。要获取可用插件的列表，请使用 minikube addons list
  images        List image names the addon w/ADDON_NAME used. For a list of available addons use: minikube addons list
  list          Lists all available minikube addons as well as their current statuses (enabled/disabled)
  open          Opens the addon w/ADDON_NAME within minikube (example: minikube addons open dashboard). For a list of
available addons use: minikube addons list

Usage:
  minikube addons SUBCOMMAND [flags] [options]

Use "minikube addons <command> --help" for more information about a given command.
Use "minikube options" for a list of global command-line options (applies to all commands).
~~~

## 6.4 开启metallb addons

~~~powershell
# minikube addons enable metallb
! metallb 是第三方插件，不由 minikube 维护者进行维护或验证，启用需自担风险。
! metallb 目前没有相关的维护者。
  - 正在使用镜像 quay.io/metallb/speaker:v0.9.6
  - 正在使用镜像 quay.io/metallb/controller:v0.9.6
* 启动 'metallb' 插件
~~~

~~~powershell
# kubectl get configmap -n metallb-system
NAME               DATA   AGE
config             1      51m
kube-root-ca.crt   1      51m
~~~

~~~powershell
# kubectl describe  configmap config -n metallb-system
Name:         config
Namespace:    metallb-system
Labels:       <none>
Annotations:  <none>

Data
====
config:
----
address-pools:
- name: default
  protocol: layer2
  addresses:
  - -

BinaryData
====

Events:  <none>
~~~

~~~powershell
# kubectl edit  configmap config -n metallb-system
configmap/config edited
~~~

~~~powershell
# ip a s
......
6: br-96abeb6ad3ab: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:32:ec:6b:5a brd ff:ff:ff:ff:ff:ff
    inet 192.168.49.1/24 brd 192.168.49.255 scope global br-96abeb6ad3ab
       valid_lft forever preferred_lft forever
    inet6 fe80::42:32ff:feec:6b5a/64 scope link
       valid_lft forever preferred_lft forever
~~~

~~~powershell
# kubectl describe  configmap config -n metallb-system
Name:         config
Namespace:    metallb-system
Labels:       <none>
Annotations:  <none>

Data
====
config:
----
address-pools:
- name: default
  protocol: layer2
  addresses:
  - 192.168.49.200-192.168.49.250

BinaryData
====

Events:  <none>
~~~

## 6.5 开启ingress addons

~~~powershell
# minikube addons enable ingress
* ingress 是由 Kubernetes 维护的插件。如有任何问题，请在 GitHub 上联系 minikube。
您可以在以下链接查看 minikube 的维护者列表：https://github.com/kubernetes/minikube/blob/master/OWNERS
  - 正在使用镜像 registry.k8s.io/ingress-nginx/controller:v1.9.4
  - 正在使用镜像 registry.k8s.io/ingress-nginx/kube-webhook-certgen:v20231011-8b53cabe0
  - 正在使用镜像 registry.k8s.io/ingress-nginx/kube-webhook-certgen:v20231011-8b53cabe0
* 正在验证 ingress 插件...
* 启动 'ingress' 插件
~~~

~~~powershell
# kubectl get ns
NAME              STATUS   AGE
default           Active   95m
ingress-nginx     Active   3m6s
kube-node-lease   Active   95m
kube-public       Active   95m
kube-system       Active   95m
metallb-system    Active   67m
~~~

~~~powershell
# kubectl get pods -n ingress-nginx
NAME                                        READY   STATUS      RESTARTS   AGE
ingress-nginx-admission-create-qqj4q        0/1     Completed   0          3m17s
ingress-nginx-admission-patch-dmgdg         0/1     Completed   0          3m17s
ingress-nginx-controller-7c6974c4d8-n2mx4   1/1     Running     0          3m17s
~~~

~~~powershell
# kubectl get svc -n ingress-nginx
NAME                                 TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE
ingress-nginx-controller             NodePort    10.111.64.247    <none>        80:32137/TCP,443:30682/TCP   3m26s
ingress-nginx-controller-admission   ClusterIP   10.108.172.203   <none>        443/TCP                      3m26s
~~~

~~~powershell
# kubectl edit service ingress-nginx-controller -n ingress-nginx
service/ingress-nginx-controller edited
type由NodePort改为LoadBalancer
~~~

~~~powershell
# kubectl get svc -n ingress-nginx
NAME                                 TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.111.64.247    192.168.49.200   80:32137/TCP,443:30682/TCP   8m24s
ingress-nginx-controller-admission   ClusterIP      10.108.172.203   <none>           443/TCP                      8m24s
~~~

~~~powershell
# vim deploy-nginx.yaml
# cat deploy-nginx.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webtest
  namespace: default
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
      - name: web
        image: nginx:latest
        imagePullPolicy: IfNotPresent
---
apiVersion: v1
kind: Service
metadata:
  name: webtest-service
  namespace: default
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: nginx
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webtes-ingress
  namespace: default
spec:
  ingressClassName: nginx
  rules:
  - host: www.kubemsb.com
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: webtest-service
            port:
              number: 80
~~~

~~~powershell
# kubectl apply -f deploy-nginx.yaml
deployment.apps/webtest created
service/webtest-service created
ingress.networking.k8s.io/webtes-ingress created
~~~

~~~powershell
# kubectl get pods
NAME                       READY   STATUS    RESTARTS   AGE
webtest-7cb786dfc4-456tt   1/1     Running   0          2m41s

# kubectl get service
NAME              TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
kubernetes        ClusterIP   10.96.0.1      <none>        443/TCP   117m
webtest-service   ClusterIP   10.96.74.253   <none>        80/TCP    12s
~~~

~~~powershell
# vim /etc/hosts
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.49.200 www.kubemsb.com
~~~

~~~powershell
# curl http://www.kubemsb.com
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

## 6.6 开启dashboard addons

~~~powershell
# minikube addons list
|-----------------------------|----------|--------------|--------------------------------|
|         ADDON NAME          | PROFILE  |    STATUS    |           MAINTAINER           |
|-----------------------------|----------|--------------|--------------------------------|
| ambassador                  | minikube | disabled     | 3rd party (Ambassador)         |
| auto-pause                  | minikube | disabled     | minikube                       |
| cloud-spanner               | minikube | disabled     | Google                         |
| csi-hostpath-driver         | minikube | disabled     | Kubernetes                     |
| dashboard                   | minikube | disabled     | Kubernetes                     |
| default-storageclass        | minikube | enabled ✅   | Kubernetes                     |
| efk                         | minikube | disabled     | 3rd party (Elastic)            |
| freshpod                    | minikube | disabled     | Google                         |
| gcp-auth                    | minikube | disabled     | Google                         |
| gvisor                      | minikube | disabled     | minikube                       |
| headlamp                    | minikube | disabled     | 3rd party (kinvolk.io)         |
| helm-tiller                 | minikube | disabled     | 3rd party (Helm)               |
| inaccel                     | minikube | disabled     | 3rd party (InAccel             |
|                             |          |              | [info@inaccel.com])            |
| ingress                     | minikube | enabled ✅   | Kubernetes                     |
| ingress-dns                 | minikube | disabled     | minikube                       |
| inspektor-gadget            | minikube | disabled     | 3rd party                      |
|                             |          |              | (inspektor-gadget.io)          |
| istio                       | minikube | disabled     | 3rd party (Istio)              |
| istio-provisioner           | minikube | disabled     | 3rd party (Istio)              |
| kong                        | minikube | disabled     | 3rd party (Kong HQ)            |
| kubeflow                    | minikube | disabled     | 3rd party                      |
| kubevirt                    | minikube | disabled     | 3rd party (KubeVirt)           |
| logviewer                   | minikube | disabled     | 3rd party (unknown)            |
| metallb                     | minikube | enabled ✅   | 3rd party (MetalLB)            |
| metrics-server              | minikube | disabled     | Kubernetes                     |
| nvidia-device-plugin        | minikube | disabled     | 3rd party (NVIDIA)             |
| nvidia-driver-installer     | minikube | disabled     | 3rd party (Nvidia)             |
| nvidia-gpu-device-plugin    | minikube | disabled     | 3rd party (Nvidia)             |
| olm                         | minikube | disabled     | 3rd party (Operator Framework) |
| pod-security-policy         | minikube | disabled     | 3rd party (unknown)            |
| portainer                   | minikube | disabled     | 3rd party (Portainer.io)       |
| registry                    | minikube | disabled     | minikube                       |
| registry-aliases            | minikube | disabled     | 3rd party (unknown)            |
| registry-creds              | minikube | disabled     | 3rd party (UPMC Enterprises)   |
| storage-provisioner         | minikube | enabled ✅   | minikube                       |
| storage-provisioner-gluster | minikube | disabled     | 3rd party (Gluster)            |
| storage-provisioner-rancher | minikube | disabled     | 3rd party (Rancher)            |
| volumesnapshots             | minikube | disabled     | Kubernetes                     |
|-----------------------------|----------|--------------|--------------------------------|
~~~

~~~powershell
# minikube addons enable dashboard
* dashboard 是由 Kubernetes 维护的插件。如有任何问题，请在 GitHub 上联系 minikube。
您可以在以下链接查看 minikube 的维护者列表：https://github.com/kubernetes/minikube/blob/master/OWNERS
  - 正在使用镜像 docker.io/kubernetesui/dashboard:v2.7.0
  - 正在使用镜像 docker.io/kubernetesui/metrics-scraper:v1.0.8
* 某些 dashboard 功能需要启用 metrics-server 插件。为了启用所有功能，请运行以下命令：

        minikube addons enable metrics-server

* 启动 'dashboard' 插件
~~~

~~~powershell
# minikube addons enable metrics-server
* metrics-server 是由 Kubernetes 维护的插件。如有任何问题，请在 GitHub 上联系 minikube。
您可以在以下链接查看 minikube 的维护者列表：https://github.com/kubernetes/minikube/blob/master/OWNERS
  - 正在使用镜像 registry.k8s.io/metrics-server/metrics-server:v0.6.4
* 启动 'metrics-server' 插件
~~~

~~~powershell
# kubectl get ns
NAME                   STATUS   AGE
default                Active   127m
ingress-nginx          Active   34m
kube-node-lease        Active   127m
kube-public            Active   127m
kube-system            Active   127m
kubernetes-dashboard   Active   94s
metallb-system         Active   98m

# kubectl get pods,svc -n kubernetes-dashboard
NAME                                             READY   STATUS    RESTARTS   AGE
pod/dashboard-metrics-scraper-7fd5cb4ddc-v9t7c   1/1     Running   0          117s
pod/kubernetes-dashboard-8694d4445c-b9zkg        1/1     Running   0          117s

NAME                                TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/dashboard-metrics-scraper   ClusterIP   10.96.190.106   <none>        8000/TCP   117s
service/kubernetes-dashboard        ClusterIP   10.105.220.41   <none>        80/TCP     117s
~~~

~~~powershell
# kubectl edit service kubernetes-dashboard -n kubernetes-dashboard
service/kubernetes-dashboard edited

把type由ClusterIP改为LoadBalancer
~~~

~~~powershell
# kubectl get svc -n kubernetes-dashboard
NAME                        TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
dashboard-metrics-scraper   ClusterIP      10.96.190.106   <none>           8000/TCP       4m55s
kubernetes-dashboard        LoadBalancer   10.105.220.41   192.168.49.201   80:32077/TCP   4m55s
~~~

~~~powershell
[root@minikube ~]# firefox http://192.168.49.201 &
~~~

![image-20231129180705351](/云原生/k8s-ops/k8s-ops-29-kubernetes集群部署口袋工具-minikube/image-20231129180705351.png)

## 6.7  minikube镜像管理

~~~powershell
# minikube image ls
registry.k8s.io/pause:3.9
registry.k8s.io/kube-scheduler:v1.28.3
registry.k8s.io/kube-proxy:v1.28.3
registry.k8s.io/kube-controller-manager:v1.28.3
registry.k8s.io/kube-apiserver:v1.28.3
registry.k8s.io/etcd:3.5.9-0
registry.k8s.io/coredns/coredns:v1.10.1
registry.cn-hangzhou.aliyuncs.com/google_containers/storage-provisioner:v5
registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.9
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:v1.28.3
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-proxy:v1.28.3
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-controller-manager:v1.28.3
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver:v1.28.3
registry.cn-hangzhou.aliyuncs.com/google_containers/etcd:3.5.9-0
registry.cn-hangzhou.aliyuncs.com/google_containers/coredns:v1.10.1
gcr.io/k8s-minikube/storage-provisioner:v5
~~~

~~~powershell
# docker pull nginx
~~~

~~~powershell
# docker save -o nginx.tar nginx:latest
~~~

~~~powershell
# ls
nginx.tar
~~~

~~~powershell
# minikube image load nginx.tar
~~~

~~~powershell
# minikube image ls
registry.k8s.io/pause:3.9
registry.k8s.io/kube-scheduler:v1.28.3
registry.k8s.io/kube-proxy:v1.28.3
registry.k8s.io/kube-controller-manager:v1.28.3
registry.k8s.io/kube-apiserver:v1.28.3
registry.k8s.io/etcd:3.5.9-0
registry.k8s.io/coredns/coredns:v1.10.1
registry.cn-hangzhou.aliyuncs.com/google_containers/storage-provisioner:v5
registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.9
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-scheduler:v1.28.3
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-proxy:v1.28.3
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-controller-manager:v1.28.3
registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver:v1.28.3
registry.cn-hangzhou.aliyuncs.com/google_containers/etcd:3.5.9-0
registry.cn-hangzhou.aliyuncs.com/google_containers/coredns:v1.10.1
gcr.io/k8s-minikube/storage-provisioner:v5
docker.io/library/nginx:latest
~~~

## 6.8 删除K8S集群

~~~powershell
# minikube delete --all
* 正在删除 docker 中的“minikube”…
* 正在移除 /root/.minikube/machines/minikube…
* 已删除所有关于 "minikube" 集群的痕迹。
* 成功删除所有配置文件
~~~

