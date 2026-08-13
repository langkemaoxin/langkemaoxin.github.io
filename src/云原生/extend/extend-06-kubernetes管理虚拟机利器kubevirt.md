---
title: kubernetes管理虚拟机利器KubeVirt
sidebarGroup: 扩展专题
shortTitle: 06 kubernetes管理虚拟机利器KubeVir
order: 6
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - KubeVirt
  - 云原生
  - 课程笔记
description: 'kubernetes管理虚拟机利器KubeVirt 前言 虚拟化分类： - Paravirtualization（半虚拟化）: 不对硬件设备进行模拟，虚拟机拥有独立的运行环境，通过虚拟机管理程序共享底...'
---

> **KubeVirt · 第 1 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# kubernetes管理虚拟机利器KubeVirt

# 前言

**虚拟化分类：**

- Paravirtualization（半虚拟化）: 不对硬件设备进行模拟，虚拟机拥有独立的运行环境，通过虚拟机管理程序共享底层的硬件资源。大部分操作系统需要进行修改才能运行在半虚拟化环境中。半虚拟化的性能要稍微高于全虚拟化，像Xen。
- Partial Virtualization（部分虚拟化）: 仅仅提供了对关键性计算组件或者指令集的模型，操作系统可能需要做某些修改才能够运行在部分虚拟化环境中。
- Full Virtualization（全虚拟化）: 几乎是完整的模拟一套真实的硬件设备，大部分操作系统无需进行任何修改即可直接运行在全虚拟化环境中，例如KVM技术。

**KubeVirt使用到的虚拟化技术：**

- libvirtd: ibvirtd是一个守护进程，本质上是对不同的hypervisor（如qemu、Xen、LXC等）操作做了封装，并且对外提供了统一的api接口，可以把libvirt看做是一个统一抽象层。

- qemu: QEMU是一套由法布里斯·贝拉(Fabrice Bellard)所编写的以GPL许可证分发源码的模拟处理器软件，在GNU/Linux平台上使用广泛。

- kvm:全称是Kernel-Based Virtual Machine，对应的是2007年加进linux 2.26.20的内核的kvm.ko模块。kvm必须在具备Intel VT(对应kvm-intel.ko)或AMD-V(对应kvm-amd.ko)功能的x86平台上运行，是一种`全虚拟化`的解决方案。kvm可以看作是qemu可执行文件的一个分支，两个团队都积极努力将差异降至最低，并且在减少差异方面取得了进展，最终目标是qemu可以在任何地方运行。当前qemu团队更专注于硬件仿真和可移植性，而kvm团队则专注于内核模块以及与其余用户空间代码的接口。

  qemu虚拟机是可以独立运行的，但是由于qemu完全是软件模拟硬件，在速度上比真正的硬件要差不少。为了解决速度问题，qemu允许使用kvm作为加速器，以便可以使用物理CPU虚拟化扩展。`当qemu独立运行时，qemu模拟cpu、内存和硬件资源；当kvm和qemu协同工作时，kvm负责cpu和内存的访问，而qemu则模拟其它硬件资源。`

补充概念：

- **`Type-1 hypervisor`**

~~~powershell
Type-1是直接在主机硬件上运行的本机或裸机虚拟机监控程序
~~~

- **`Type-2 hypervisor`**:

~~~powershell
Type-2是一个托管的系统管理程序，这意味着它和其他计算机程序一样在传统的操作系统上运行
~~~

基于上述概念，也可以这么理解qemu和kvm：`qemu是在用户空间中运行并执行虚拟硬件仿真的Type-2 hypervisor，而kvm是在内核空间中运行的Type-1 hypevisor。`

![image-20230505170512975](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505170512975.png)

# 一、KubeVirt是什么？

kubevirt是一个容器方式运行虚拟机的项目,用于实现在k8s集群中像对Pod进行编排部署一样管理虚拟机。类似的产品：OpenShift CNV

## 1.1 在k8s中使用虚拟机的理由

一是对不便于容器化的应用，必须运行在虚拟机中；二是应用运行环境可能需要与K8S平台运行不同的内核或OS。

## 1.2 虚拟机与Pod在K8S集群中的关系

![image-20230505164818254](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505164818254.png)

## 1.3 kubevirt架构

kubevirt运行在kubernetes之上，且`调度（scheduling）也是由kubernetes负责`，底层则是在物理资源的基础上，利用虚拟化技术运行不同的操作系统（operating System）。

# 二、KubeVirt部署

## 2.1 本地虚拟化支持

![image-20230505132255477](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505132255477.png)

## 2.2 部署KubeVirt

![image-20230505132346591](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505132346591.png)

![image-20230505132413927](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505132413927.png)

![image-20230505132457231](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505132457231.png)

![image-20230505132549294](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505132549294.png)

~~~powershell
# kubectl apply -f https://github.com/kubevirt/kubevirt/releases/download/v0.59.0/kubevirt-operator.yaml
~~~

~~~powershell
# kubectl get ns
NAME              STATUS   AGE
......
kubevirt          Active   10s

# kubectl get pods -n kubevirt
NAME                               READY   STATUS    RESTARTS      AGE
...
virt-operator-6d56bb6986-jl66g     1/1     Running   1 (39m ago)   8s
virt-operator-6d56bb6986-vnnkn     1/1     Running   1 (39m ago)   8s
~~~

~~~powershell
# kubectl apply -f https://github.com/kubevirt/kubevirt/releases/download/v0.59.0/kubevirt-cr.yaml
~~~

~~~powershell
# kubectl get pods -n kubevirt
NAME                               READY   STATUS    RESTARTS      AGE
virt-api-5888cc84c7-2zstl          1/1     Running   1 (39m ago)   62m
virt-api-5888cc84c7-tscw9          1/1     Running   1 (39m ago)   62m
virt-controller-546465698c-dh644   1/1     Running   1 (39m ago)   61m
virt-controller-546465698c-ptrqm   1/1     Running   1 (39m ago)   61m
virt-handler-jmqwg                 1/1     Running   1 (39m ago)   61m
virt-handler-q22tx                 1/1     Running   1 (39m ago)   61m
virt-operator-6d56bb6986-jl66g     1/1     Running   1 (39m ago)   64m
virt-operator-6d56bb6986-vnnkn     1/1     Running   1 (39m ago)   64m

~~~

![image-20230505162130350](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505162130350.png)

kubevirt组件说明

~~~powershell
virt-controller：
基于informer的list-watch机制，监听VM、VMI等资源的事件，转换成VMI对应的pod，从而达到管理虚拟机的生命周期的功能。
~~~

~~~powershell
virt-api:
virt-api以deployment的形式运行，逻辑上主要包含以下功能：

1、提供VM、VMI等CRD资源mutating+validating webhook接口；

2、通过kubernetes的aggregator特性，对外暴露虚拟机操作的相关接口，包括restart、migrate、start、stop、freeze/unfreeze、softReboot、pause/unpause、console、vnc等操作。
~~~

~~~powershell
virt-handler:
virt-handler以deamonSet的形式运行在每个节点上（配置hostNetwork+hostPID），逻辑上包含以下功能：

1、提供rest接口供virt-api调用，接口功能包括console、vnc、pause/unpause、freeze/unfreeze等功能，这些接口最终操作本节点上对应的VMI对应的虚拟机。virt-api通过VMI的status.nodeName+约定好的端口找到VMI对应节点上的virt-handler https服务，这也是为什么virt-handler要配置hostNetwork网络；

2、通过list-watch机制确保相应的libvirt domain的启动或停止，但是这个过程并不是virt-handler与对应的libvirtd直接交互，而是virt-handler通过unix sock文件访问virt-launcher，virt-launcher再与libvirtd交互。virt-handler与virt-launcher交互的sock文件为/var/run/kubevirt/sockets/{vmi_uid}_sock。
~~~

~~~powershell
virt-launcher:
每一个VMI对应的pod中都运行着一个virt-launcher进程，该进程逻辑上提供如下功能：

1、以unix sock形式启动一个grpc server，该server负责提供接口供virt-hanlder调用；

2、管理VMI对应的pod内的libvirtd、qemu进程的生命周期，例如qemu进程异常后会自动重启。
~~~

~~~powershell
查看kubevirt是否满足VM运行条件，如下是满足运行条件的
# kubectl wait kv kubevirt --for condition=Available -n kubevirt
输出：
kubevirt.kubevirt.io/kubevirt condition met
~~~

## 2.3 安装virtctl客户端工具

> 用于对虚拟机管理使用。

![image-20230505133027013](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505133027013.png)

~~~powershell
# wget https://github.com/kubevirt/kubevirt/releases/download/v0.59.0/virtctl-v0.59.0-linux-amd64
~~~

~~~powershell
# chmod +x virtctl-v0.59.0-linux-amd64
~~~

~~~powershell
# mv virtctl-v0.59.0-linux-amd64 /usr/local/bin/virtctl
~~~

~~~powershell
# virtctl version
~~~

# 三、创建VirtualMachine

> vm(VirtualMachine),是在vmi基础之上更完善的逻辑控制，可以认为是控制器；vmi（VirtualMachineInstance），是虚拟机实例。vm与vmi之间的关系类似于deployment与pod之间的关系。

## 3.1 准备VM部署描述文件

~~~powershell
# vim test.yaml
# cat test.yaml
apiVersion: kubevirt.io/v1alpha3
kind: VirtualMachine
metadata:
  labels:
    kubevirt.io/vm: vm-cirros
  name: vm-cirros
spec:
  running: false
  template:
    metadata:
      labels:
        kubevirt.io/vm: vm-cirros
    spec:
      domain:
        devices:
          disks:
          - disk:
              bus: virtio
            name: containerdisk
          - disk:
              bus: virtio
            name: cloudinitdisk
        machine:
          type: ""
        resources:
          requests:
            memory: 64M
      terminationGracePeriodSeconds: 0
      volumes:
      - name: containerdisk
        containerDisk:
          image: kubevirt/cirros-container-disk-demo:latest
      - cloudInitNoCloud:
          userDataBase64: IyEvYmluL3NoCgplY2hvICdwcmludGVkIGZyb20gY2xvdWQtaW5pdCB1c2VyZGF0YScK
        name: cloudinitdisk
~~~

~~~powershell
KubeVirt 的 VirtualMachine 可以使用以下几种常用的存储卷类型：

1、ephemeral - 其对应的卷 (PVC) 的数据不会以发生变化，因为所有的写入都保存在位于本地存储的临时镜像中。当 VM 停止、重启或删除时，便会丢弃临时镜像。

2、containerDisk - 从 registry 中拉取镜像到运行 VM 的主机节点上，并在 VM 启动时作为磁盘附加到 VM。containerDisk 提供了在容器镜像注册表中存储和分发 VM 磁盘的能力。不过 containerDisk 是临时的，数据将在 VM 停止、重启或删除时丢弃。

3、dataVolume - 可动态创建 PVC 并将外部磁盘、镜像、容器数据导入到这些 PVC 中。为了使用 dataVolume 卷，必须借助 OpenShift Virtualization Operator 安装的 Containerized Data Importer (CDI) 功能。如果不使用 dataVolume 卷，那么可以使用 persistentVolumeClaim 卷，即将一个可用的 PVC 分配给 VM。

4、persistentVolumeClaim - 将可用的 PVC 附加到 VM。将现有 VM 导入到 OpenShift 中的方法是使用 CDI 将现有 VM 的磁盘或容器镜像中的磁盘导入到 PVC 中，然后将 PVC 附加到 VM 实例。

5、emptyDisk - 为 VM 创建额外的 qcow2 磁盘。当 VM 重启，数据会保留下来，但当重新创建 VM，数据将会被丢弃。

6、cloudInitNoCloud - 将所引用的 cloudInitNoCloud 数据源附加给磁盘，以便在 VM 启动后自动执行脚本。VM 内部需要安装 cloud-init。
~~~

## 3.2 执行VM部署描述文件

~~~powershell
# kubectl apply -f test.yaml
~~~

~~~powershell
# kubectl get vm
NAME        AGE   STATUS    READY
vm-cirros   61m   Stopped   False
~~~

## 3.3 启动VirtualMachineInstance

VirtualMachineInstance（VMI），一个VMI对象对应一台虚拟机，实际上这台虚拟机是在一个特殊的kubernetes pod中，该pod里有virt-launcher、libvirtd和qemu进程，因此也就是可以看作kubevirt把虚拟机运行在了pod中。

![image-20230505164456360](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505164456360.png)

~~~powershell
# virtctl start vm-cirros
VM vm-cirros was scheduled to start
~~~

~~~powershell
[root@node2 ~]# kubectl get vm
NAME        AGE   STATUS     READY
vm-cirros   63m   Starting   False
[root@node2 ~]# kubectl get vmi
NAME        AGE   PHASE     IP             NODENAME   READY
vm-cirros   8s    Running   10.233.74.81   node4      True
~~~

# 四、访问虚拟机控制台

~~~powershell
# virtctl console vm-cirros
Successfully connected to vm-cirros console. The escape sequence is ^] 显示这个信息时，需要按回车键，才能出现登录提示。

login as 'cirros' user. default password: 'gocubsgo'. use 'sudo' for root.
vm-cirros login: cirros 用户名
Password: gocubsgo 密码
$ ip a s
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue qlen 1
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc pfifo_fast qlen 1000
    link/ether d6:b9:cf:6a:9b:0c brd ff:ff:ff:ff:ff:ff
    inet 10.233.74.81/32 brd 10.255.255.255 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::d4b9:cfff:fe6a:9b0c/64 scope link
       valid_lft forever preferred_lft forever
~~~

> 退出控制台使用ctrl+]组合键。

# 五、为虚拟机创建service并访问

~~~powershell
# virtctl expose virtualmachine vm-cirros --name vmiservice-node --target-port 22 --port 24 --type NodePort
~~~

~~~powershell
# kubectl get svc
NAME              TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
kubernetes        ClusterIP   10.233.0.1     <none>        443/TCP        15h
vmiservice-node   NodePort    10.233.48.20   <none>        24:30747/TCP   43m
~~~

![image-20230505134644565](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505134644565.png)

![image-20230505134736449](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505134736449.png)

![image-20230505134907408](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505134907408.png)

![image-20230505134941584](/云原生/extend/extend-06-kubernetes管理虚拟机利器kubevirt/image-20230505134941584.png)

