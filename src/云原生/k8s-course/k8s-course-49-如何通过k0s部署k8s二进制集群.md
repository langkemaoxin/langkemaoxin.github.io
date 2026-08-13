---
title: 如何通过K0S部署K8S二进制集群？
sidebarGroup: K8s 课程笔记
shortTitle: 49 如何通过K0S部署K8S二进制集群？
order: 49
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - K8s 课程笔记
  - 云原生
  - 课程笔记
description: 如何通过K0S部署K8S二进制集群？ 一、K0S是什么？ k0s 是一个下游的 Kubernetes 发行版，与原生 Kubernetes 相比，k0s 并未阉割大量 Kubernetes 功能；k0...
---

> **K8s 课程笔记 · 第 49 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何通过K0S部署K8S二进制集群？

# 一、K0S是什么？

![image-20231225134055314](/云原生/k8s-course/k8s-course-49-如何通过k0s部署k8s二进制集群/image-20231225134055314.png)

k0s 是一个下游的 Kubernetes 发行版，与原生 Kubernetes 相比，k0s 并未阉割大量 Kubernetes 功能；k0s 主要阉割部分基本上只有Cloud provider，其他的都与原生 Kubernetes 相同。

k0s 自行编译 Kubernetes 源码生成 Kubernetes 二进制文件，然后在安装后将二进制文件释放到宿主机再启动；这种情况下所有功能几乎与原生 Kubernetes 没有差异。

[k0s](https://k8slens.dev/kubernetes)是一个包罗万象的 Kubernetes 发行版，它配置了构建 Kubernetes 集群所需的所有功能，并备份为单个二进制文件以方便使用。

k0s 非常适合任何云环境，但由于其简单的设计、灵活的部署选项和熟悉的系统要求，也可用于物联网网关、边缘和裸机部署。

**主要特征**

- 不同的安装方式：[单节点](https://github.com/k0sproject/k0s/blob/main/docs/install.md)、[多节点](https://github.com/k0sproject/k0s/blob/main/docs/k0sctl-install.md)、[airgap](https://github.com/k0sproject/k0s/blob/main/docs/airgap-install.md)、[Docker](https://github.com/k0sproject/k0s/blob/main/docs/k0s-in-docker.md)
- 使用k0sctl自动生命周期管理：[升级](https://github.com/k0sproject/k0s/blob/main/docs/upgrade.md)、[备份和恢复](https://github.com/k0sproject/k0s/blob/main/docs/backup.md)
- 学习的[系统要求](https://github.com/k0sproject/k0s/blob/main/docs/system-requirements.md)（1个vCPU、1 GB RAM）
- 最初 Kubernetes 上游（没有任何变化）
- 作为单个二进制文件提供，除了内核之外没有[外部运行时依赖项](https://github.com/k0sproject/k0s/blob/main/docs/external-runtime-deps.md)
- 灵活的部署，默认[控制平面隔离](https://github.com/k0sproject/k0s/blob/main/docs/networking.md#controller-worker-communication)
- 可从单个集群大型、高[分布供应](https://github.com/k0sproject/k0s/blob/main/docs/high-availability.md)
- 支持自定义[容器网络接口 (CNI)](https://github.com/k0sproject/k0s/blob/main/docs/networking.md)插件（默认为 Kube-Router，Calico 作为预配置替代方案提供）
- 支持自定义[容器运行时接口（CRI）](https://github.com/k0sproject/k0s/blob/main/docs/runtime.md)插件（默认为containerd）
- [通过容器存储接口 (CSI)](https://github.com/k0sproject/k0s/blob/main/docs/storage.md)支持所有 Kubernetes 存储选项
- 支持各种[存储数据](https://github.com/k0sproject/k0s/blob/main/docs/configuration.md#specstorage)：etcd（多节点默认集群）、SQLite（单节点集群默认）、MySQL 和 PostgreSQL
- 支持x86-64、ARM64和ARMv7
- [Konnectivity服务](https://github.com/k0sproject/k0s/blob/main/docs/networking.md#controller-worker-communication)、CoreDNS、指标服务器

# 二、k0sctl安装

k0sctl 是 k0s 为了方便快速部署集群所提供的工具，有点类似于 kubeadm，但是其扩展性要比 kubeadm 好得多。在多节点的情况下，k0sctl 通过 SSH 链接目标主机然后按照步骤释放文件并启动 Kubernetes 相关服务，从而完成集群初始化。

![image-20231225131808947](/云原生/k8s-course/k8s-course-49-如何通过k0s部署k8s二进制集群/image-20231225131808947.png)

![image-20231225131833554](/云原生/k8s-course/k8s-course-49-如何通过k0s部署k8s二进制集群/image-20231225131833554.png)

![image-20231225131916827](/云原生/k8s-course/k8s-course-49-如何通过k0s部署k8s二进制集群/image-20231225131916827.png)

![image-20231225131956378](/云原生/k8s-course/k8s-course-49-如何通过k0s部署k8s二进制集群/image-20231225131956378.png)

~~~powershell
# wget https://github.com/k0sproject/k0sctl/releases/download/v0.16.0/k0sctl-linux-x64
~~~

~~~powershell
# chmod +x k0sctl-linux-x64
~~~

~~~powershell
# mv k0sctl-linux-x64 /usr/bin/k0sctl
~~~

# 三、准备K8S集群部署文件

~~~powershell
# mkdir k0sdir
# cd k0sdir/
~~~

~~~powershell
# k0sctl init --k0s > k0sctl.yaml
~~~

~~~powershell
# cat k0sctl.yaml
apiVersion: k0sctl.k0sproject.io/v1beta1
kind: Cluster
metadata:
  name: k0s-cluster
spec:
  hosts:
  - ssh:
      address: 192.168.10.160
      user: root
      port: 22
      keyPath: /root/.ssh/id_rsa
    role: controller+worker
  - ssh:
      address: 192.168.10.161
      user: root
      port: 22
      keyPath: /root/.ssh/id_rsa
    role: controller+worker
  - ssh:
      address: 192.168.10.162
      user: root
      port: 22
      keyPath: /root/.ssh/id_rsa
    role: controller+worker
  - ssh:
      address: 192.168.10.163
      user: root
      port: 22
      keyPath: /root/.ssh/id_rsa
    role: worker
  - ssh:
      address: 192.168.10.164
      user: root
      port: 22
      keyPath: /root/.ssh/id_rsa
    role: worker
  k0s:
    version: v1.28.4+k0s.0
    dynamicConfig: false
    config:
      apiVersion: k0s.k0sproject.io/v1beta1
      kind: Cluster
      metadata:
        name: k0s
      spec:
        api:
          address: 192.168.10.160
          k0sApiPort: 9443
          port: 6443
          sans:
          - 192.168.10.160
          - 192.168.10.161
          - 192.168.10.162
        installConfig:
          users:
            etcdUser: etcd
            kineUser: kube-apiserver
            konnectivityUser: konnectivity-server
            kubeAPIserverUser: kube-apiserver
            kubeSchedulerUser: kube-scheduler
        konnectivity:
          adminPort: 8133
          agentPort: 8132
        network:
          kubeProxy:
            disabled: false
            mode: ipvs
          kuberouter:
            autoMTU: true
            mtu: 0
            peerRouterASNs: ""
            peerRouterIPs: ""
          podCIDR: 10.244.0.0/16
          provider: kuberouter
          serviceCIDR: 10.96.0.0/12
        podSecurityPolicy:
          defaultPolicy: 00-k0s-privileged
        storage:
          type: etcd
          etcd:
            peerAddress: 192.168.10.160
        telemetry:
          enabled: true
~~~

# 四、使用k0sctl部署K8S集群

## 4.1 生成免密密钥对

~~~powershell
# ssh-keygen
~~~

~~~powershell
# cd /root/.ssh/
# ls
id_rsa  id_rsa.pub
[root@k8s-master01 .ssh]# cp id_rsa.pub authorized_keys

[root@k8s-master01 .ssh]# ls
authorized_keys  id_rsa  id_rsa.pub
~~~

~~~powershell
[root@k8s-master01 ~]# for i in 161 162 163 164
 do
 scp -r /root/.ssh 192.168.10.$i:/root
 done
~~~

## 4.2 修改machine-id

~~~powershell
# cat /etc/machine-id
~~~

~~~powershell
# rm -rf /etc/machine-id
~~~

~~~powershell
# dbus-uuidgen --ensure=/etc/machine-id
~~~

## 4.3 使用k0sctl部署K8S集群

~~~powershell
# k0sctl apply -c k0sctl.yaml
~~~

~~~powershell
输出内容如下：

⠀⣿⣿⡇⠀⠀⢀⣴⣾⣿⠟⠁⢸⣿⣿⣿⣿⣿⣿⣿⡿⠛⠁⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀█████████ █████████ ███
⠀⣿⣿⡇⣠⣶⣿⡿⠋⠀⠀⠀⢸⣿⡇⠀⠀⠀⣠⠀⠀⢀⣠⡆⢸⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀███          ███    ███
⠀⣿⣿⣿⣿⣟⠋⠀⠀⠀⠀⠀⢸⣿⡇⠀⢰⣾⣿⠀⠀⣿⣿⡇⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀███          ███    ███
⠀⣿⣿⡏⠻⣿⣷⣤⡀⠀⠀⠀⠸⠛⠁⠀⠸⠋⠁⠀⠀⣿⣿⡇⠈⠉⠉⠉⠉⠉⠉⠉⠉⢹⣿⣿⠀███          ███    ███
⠀⣿⣿⡇⠀⠀⠙⢿⣿⣦⣀⠀⠀⠀⣠⣶⣶⣶⣶⣶⣶⣿⣿⡇⢰⣶⣶⣶⣶⣶⣶⣶⣶⣾⣿⣿⠀█████████    ███    ██████████
k0sctl v0.16.0 Copyright 2023, k0sctl authors.
Anonymized telemetry of usage will be sent to the authors.
By continuing to use k0sctl you agree to these terms:
https://k0sproject.io/licenses/eula
INFO ==> Running phase: Connect to hosts
INFO [ssh] 192.168.10.160:22: connected
INFO [ssh] 192.168.10.162:22: connected
INFO [ssh] 192.168.10.161:22: connected
INFO [ssh] 192.168.10.163:22: connected
INFO [ssh] 192.168.10.164:22: connected
INFO ==> Running phase: Detect host operating systems
INFO [ssh] 192.168.10.160:22: is running CentOS Linux 7 (Core)
INFO [ssh] 192.168.10.161:22: is running CentOS Linux 7 (Core)
INFO [ssh] 192.168.10.162:22: is running CentOS Linux 7 (Core)
INFO [ssh] 192.168.10.163:22: is running CentOS Linux 7 (Core)
INFO [ssh] 192.168.10.164:22: is running CentOS Linux 7 (Core)
INFO ==> Running phase: Acquire exclusive host lock
INFO ==> Running phase: Prepare hosts
INFO ==> Running phase: Gather host facts
INFO [ssh] 192.168.10.163:22: using k8s-worker01 as hostname
INFO [ssh] 192.168.10.162:22: using k8s-master03 as hostname
INFO [ssh] 192.168.10.164:22: using k8s-worker02 as hostname
INFO [ssh] 192.168.10.160:22: using k8s-master01 as hostname
INFO [ssh] 192.168.10.161:22: using k8s-master02 as hostname
INFO [ssh] 192.168.10.162:22: discovered ens33 as private interface
INFO [ssh] 192.168.10.163:22: discovered ens33 as private interface
INFO [ssh] 192.168.10.164:22: discovered ens33 as private interface
INFO [ssh] 192.168.10.160:22: discovered ens33 as private interface
INFO [ssh] 192.168.10.161:22: discovered ens33 as private interface
INFO ==> Running phase: Validate hosts
INFO ==> Running phase: Gather k0s facts
INFO ==> Running phase: Validate facts
INFO ==> Running phase: Configure k0s
INFO [ssh] 192.168.10.160:22: validating configuration
INFO [ssh] 192.168.10.162:22: validating configuration
INFO [ssh] 192.168.10.161:22: validating configuration
INFO [ssh] 192.168.10.162:22: configuration was changed, installing new configuration
INFO [ssh] 192.168.10.160:22: configuration was changed, installing new configuration
INFO [ssh] 192.168.10.161:22: configuration was changed, installing new configuration
INFO ==> Running phase: Initialize the k0s cluster
INFO [ssh] 192.168.10.160:22: installing k0s controller
INFO [ssh] 192.168.10.160:22: waiting for the k0s service to start
INFO [ssh] 192.168.10.160:22: waiting for kubernetes api to respond
INFO ==> Running phase: Install controllers
INFO [ssh] 192.168.10.160:22: generating token
INFO [ssh] 192.168.10.161:22: writing join token
INFO [ssh] 192.168.10.161:22: installing k0s controller
INFO [ssh] 192.168.10.161:22: starting service
INFO [ssh] 192.168.10.161:22: waiting for the k0s service to start
INFO [ssh] 192.168.10.161:22: waiting for kubernetes api to respond
INFO [ssh] 192.168.10.160:22: generating token
INFO [ssh] 192.168.10.162:22: writing join token
INFO [ssh] 192.168.10.162:22: installing k0s controller
INFO [ssh] 192.168.10.162:22: starting service
INFO [ssh] 192.168.10.162:22: waiting for the k0s service to start
INFO [ssh] 192.168.10.162:22: waiting for kubernetes api to respond
INFO ==> Running phase: Install workers
INFO [ssh] 192.168.10.163:22: validating api connection to https://192.168.10.160:6443
INFO [ssh] 192.168.10.164:22: validating api connection to https://192.168.10.160:6443
INFO [ssh] 192.168.10.160:22: generating token
INFO [ssh] 192.168.10.163:22: writing join token
INFO [ssh] 192.168.10.164:22: writing join token
INFO [ssh] 192.168.10.163:22: installing k0s worker
INFO [ssh] 192.168.10.164:22: installing k0s worker
INFO [ssh] 192.168.10.164:22: starting service
INFO [ssh] 192.168.10.163:22: starting service
INFO [ssh] 192.168.10.164:22: waiting for node to become ready
INFO [ssh] 192.168.10.163:22: waiting for node to become ready
INFO ==> Running phase: Release exclusive host lock
INFO ==> Running phase: Disconnect from hosts
INFO ==> Finished in 1m25s
INFO k0s cluster version v1.28.4+k0s.0 is now installed
~~~

# 五、K0S部署K8S二进制集群可用性验证

## 5.1 kubectl安装

~~~powershell
# cat > /etc/yum.repos.d/k8s.repo <<EOF
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.28/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.28/rpm/repodata/repomd.xml.key
#exclude=kubelet kubeadm kubectl cri-tools kubernetes-cni
EOF
~~~

~~~powershell
# yum -y install kubectl
~~~

## 5.2 准备Kubeconfig文件

~~~powershell
#  k0sctl kubeconfig --config ./k0sctl.yaml > k0s.config
~~~

## 5.3 查看K8S集群资源

~~~powershell
# kubectl get nodes --kubeconfig=k0s.config
NAME           STATUS   ROLES           AGE     VERSION
k8s-master01   Ready    control-plane   8m7s    v1.28.4+k0s
k8s-master02   Ready    control-plane   7m54s   v1.28.4+k0s
k8s-master03   Ready    control-plane   7m48s   v1.28.4+k0s
k8s-worker01   Ready    <none>          7m49s   v1.28.4+k0s
k8s-worker02   Ready    <none>          7m44s   v1.28.4+k0s
~~~

~~~powershell
# kubectl get pods -n kube-system --kubeconfig=k0s.config
NAME                              READY   STATUS    RESTARTS   AGE
coredns-85df575cdb-gl26d          1/1     Running   0          8m19s
coredns-85df575cdb-svvr5          1/1     Running   0          8m3s
konnectivity-agent-5qv4c          1/1     Running   0          7m46s
konnectivity-agent-d6blv          1/1     Running   0          7m46s
konnectivity-agent-ntbpv          1/1     Running   0          7m46s
konnectivity-agent-shsqs          1/1     Running   0          7m46s
konnectivity-agent-vxs2t          1/1     Running   0          7m47s
kube-proxy-2cdwj                  1/1     Running   0          8m
kube-proxy-79cfq                  1/1     Running   0          8m19s
kube-proxy-hrrnw                  1/1     Running   0          8m1s
kube-proxy-nnk6w                  1/1     Running   0          8m6s
kube-proxy-v6jtc                  1/1     Running   0          7m56s
kube-router-6d8lw                 1/1     Running   0          8m19s
kube-router-h4g77                 1/1     Running   0          8m
kube-router-jx987                 1/1     Running   0          8m1s
kube-router-lmlxn                 1/1     Running   0          7m56s
kube-router-x6f8b                 1/1     Running   0          8m6s
metrics-server-7556957bb7-ds5qh   1/1     Running   0          8m19s
~~~

## 5.4 部署Nginx应用

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
# kubectl apply -f nginx.yaml --kubeconfig=k0s.config
deployment.apps/nginxweb created
service/nginxweb-service created
~~~

~~~powershell
# kubectl get pods --kubeconfig=k0s.config -o wide
NAME                        READY   STATUS    RESTARTS   AGE    IP           NODE           NOMINATED NODE   READINESS GATES
nginxweb-64c569cccc-29hfc   1/1     Running   0          112s   10.244.4.5   k8s-worker02   <none>           <none>
nginxweb-64c569cccc-5nxqj   1/1     Running   0          112s   10.244.2.5   k8s-worker01   <none>           <none>
nginxweb-64c569cccc-c6jk9   1/1     Running   0          112s   10.244.2.6   k8s-worker01   <none>           <none>
nginxweb-64c569cccc-rbt4x   1/1     Running   0          112s   10.244.4.4   k8s-worker02   <none>           <none>
nginxweb-64c569cccc-xjnm7   1/1     Running   0          112s   10.244.4.3   k8s-worker02   <none>           <none>
~~~

![image-20231225134008069](/云原生/k8s-course/k8s-course-49-如何通过k0s部署k8s二进制集群/image-20231225134008069.png)

