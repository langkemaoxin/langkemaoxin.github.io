---
title: 在Linux上以all in one模式安装kubernetes & kubesphere
sidebarGroup: 平台与实战
shortTitle: 01 在Linux上以all in one模式安装ku
order: 1
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - PaaS 平台
  - 云原生
  - 课程笔记
description: 在Linux上以all in one模式安装kubernetes & kubesphere 于刚接触 KubeSphere 并想快速上手该容器平台的用户，All-in-One 安装模式是最佳的选择，它...
---

> **PaaS 平台 · 第 1 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 在Linux上以all in one模式安装kubernetes & kubesphere

于刚接触 KubeSphere 并想快速上手该容器平台的用户，All-in-One 安装模式是最佳的选择，它能够帮助您零配置快速部署 KubeSphere 和 Kubernetes。

# 一、Linux主机准备

若要以 All-in-One 模式进行安装，您仅需参考以下对机器硬件和操作系统的要求准备一台主机。

>如果您的机器至少有 8 核 CPU 和 16 GB 内存，则建议启用所有组件。

## 1.1 硬件推荐配置

| 操作系统                                               | 最低配置                            |
| :----------------------------------------------------- | :---------------------------------- |
| **Ubuntu** *16.04*, *18.04*                            | 2 核 CPU，4 GB 内存，40 GB 磁盘空间 |
| **Debian** *Buster*, *Stretch*                         | 2 核 CPU，4 GB 内存，40 GB 磁盘空间 |
| **CentOS** *7.x*                                       | 2 核 CPU，4 GB 内存，40 GB 磁盘空间 |
| **Red Hat Enterprise Linux 7**                         | 2 核 CPU，4 GB 内存，40 GB 磁盘空间 |
| **SUSE Linux Enterprise Server 15/openSUSE Leap 15.2** | 2 核 CPU，4 GB 内存，40 GB 磁盘空间 |

>以上的系统要求和以下的教程适用于没有启用任何可选组件的默认最小化安装。

![image-20220517012416510](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517012416510.png)

![image-20220517013504048](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517013504048.png)

![image-20220517013601517](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517013601517.png)

## 1.2 节点要求

- 节点必须能够通过 `SSH` 连接。
- 节点上可以使用 `sudo`/`curl`/`openssl` 命令。

## 1.3 容器运行时

您的集群必须有一个可用的容器运行时。如果您使用 KubeKey 搭建集群，KubeKey 会默认安装最新版本的 Docker。或者，您也可以在创建集群前手动安装 Docker 或其他容器运行时。

| 支持的容器运行时              | 版本     |
| :---------------------------- | :------- |
| Docker                        | 19.3.8 + |
| containerd                    | 最新版   |
| CRI-O（试验版，未经充分测试） | 最新版   |
| iSula（试验版，未经充分测试） | 最新版   |

>如果您想在离线环境中部署 KubeSphere，请务必提前安装一个容器运行时。

~~~powershell
# wget https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -O /etc/yum.repos.d/docker-ce.repo
~~~

~~~powershell
# yum -y install docker-ce
~~~

~~~powershell
# systemctl enable --now docker
~~~

~~~powershell
# cat /etc/docker/daemon.json
{
        "exec-opts": ["native.cgroupdriver=systemd"]
}
~~~

~~~powershell
# systemctl restart docker
~~~

## 1.4 依赖项要求

>KubeKey 是用 Go 语言开发的一款全新的安装工具，代替了以前基于 ansible 的安装程序。KubeKey 为用户提供了灵活的安装选择，可以分别安装 KubeSphere 和 Kubernetes 或二者同时安装，既方便又高效。

KubeKey 可以将 Kubernetes 和 KubeSphere 一同安装。针对不同的 Kubernetes 版本，需要安装的依赖项可能有所不同。您可以参考以下列表，查看是否需要提前在节点上安装相关的依赖项。

| 依赖项      | Kubernetes 版本 ≥ 1.18 | Kubernetes 版本 < 1.18 |
| :---------- | :--------------------- | :--------------------- |
| `socat`     | 必须                   | 可选但建议             |
| `conntrack` | 必须                   | 可选但建议             |
| `ebtables`  | 可选但建议             | 可选但建议             |
| `ipset`     | 可选但建议             | 可选但建议             |

~~~powershell
# yum -y install socat conntrack ebtables ipset
~~~

## 1.5 网络和 DNS 要求

- 请确保 `/etc/resolv.conf` 中的 DNS 地址可用，否则，可能会导致集群中的 DNS 出现问题。
- 如果您的网络配置使用防火墙规则或安全组，请务必确保基础设施组件可以通过特定端口相互通信。建议您关闭防火墙。有关更多信息，请参见[端口要求](https://kubesphere.com.cn/docs/installing-on-linux/introduction/port-firewall/)。
- 支持的 CNI 插件：Calico 和 Flannel。其他插件也适用（例如 Cilium 和 Kube-OVN 等），但请注意它们未经充分测试。

> 提示：
>
> - 建议您的操作系统处于干净状态（不安装任何其他软件），否则可能会发生冲突。
> - 如果您无法从 dockerhub.io 下载容器镜像，建议提前准备仓库的镜像地址（即加速器）。

~~~powershell
# cat /etc/resolv.conf 

nameserver 119.29.29.29
~~~

~~~powershell
# firewall-cmd --state
not running
~~~

~~~powershell
# sestatus 
SELinux status:                 disabled
~~~

# 二、下载 KubeKey

> 2.1与2.2看情况使用。

## 2.1 通过GitHub/Googleapis获取kk

从 [GitHub Release Page](https://github.com/kubesphere/kubekey/releases) 下载 KubeKey 或直接使用以下命令。

~~~powershell
curl -sfL https://get-kk.kubesphere.io | VERSION=v2.0.0 sh -
~~~

~~~powershell
输出：
Downloading kubekey v2.0.0 from https://github.com/kubesphere/kubekey/releases/download/v2.0.0/kubekey-v2.0.0-linux-amd64.tar.gz ...

Kubekey v2.0.0 Download Complete!
~~~

~~~powershell
# ls
kk 绿色
~~~

>执行以上命令会下载最新版 KubeKey (v2.0.0)，您可以修改命令中的版本号下载指定版本。

为 `kk` 添加可执行权限：

> 默认不需要添加，注意观察，如果没有执行权限就添加。

~~~powershell
chmod +x kk
~~~

## 2.2 从正确的区域下载 KubeKey。

~~~powershell
export KKZONE=cn
~~~

执行以下命令下载kubekey

~~~powershell
curl -sfL https://get-kk.kubesphere.io | VERSION=v2.0.0 sh -
~~~

>在您下载 KubeKey 后，如果您将其传至新的机器，且访问 Googleapis 同样受限，在您执行以下步骤之前请务必再次执行 `export KKZONE=cn` 命令。

# 三、开始安装

在本快速入门教程中，您只需执行一个命令即可进行安装，其模板如下所示：

~~~powershell
./kk create cluster [--with-kubernetes version] [--with-kubesphere version]
~~~

若要同时安装 Kubernetes 和 KubeSphere，可参考以下示例命令：

~~~powershell
./kk create cluster --with-kubernetes v1.21.5 --with-kubesphere v3.2.1
~~~

>- 安装 KubeSphere 3.2.1 的建议 Kubernetes 版本：1.19.x、1.20.x、1.21.x 或 1.22.x（实验性支持）。如果不指定 Kubernetes 版本，KubeKey 将默认安装 Kubernetes v1.21.5。有关受支持的 Kubernetes 版本的更多信息，请参见[支持矩阵](https://kubesphere.com.cn/docs/installing-on-linux/introduction/kubekey/#支持矩阵)。
>- 一般来说，对于 All-in-One 安装，您无需更改任何配置。
>- 如果您在这一步的命令中不添加标志 `--with-kubesphere`，则不会部署 KubeSphere，KubeKey 将只安装 Kubernetes。如果您添加标志 `--with-kubesphere` 时不指定 KubeSphere 版本，则会安装最新版本的 KubeSphere。
>- KubeKey 会默认安装 [OpenEBS](https://openebs.io/) 为开发和测试环境提供 LocalPV 以方便新用户。对于其他存储类型，请参见[持久化存储配置](https://kubesphere.com.cn/docs/installing-on-linux/persistent-storage-configurations/understand-persistent-storage/)。

执行该命令后，KubeKey 将检查您的安装环境，结果显示在一张表格中。有关详细信息，请参见节点要求和依赖项要求。

![image-20220517015613194](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517015613194.png)

# 四、验证安装结果

当您看到以下输出时，表明安装已经完成。

![image-20220517012006124](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517012006124.png)

输入以下命令以检查安装结果。

~~~powershell
kubectl logs -n kubesphere-system $(kubectl get pod -n kubesphere-system -l app=ks-install -o jsonpath='{.items[0].metadata.name}') -f
~~~

输出信息会显示 Web 控制台的 IP 地址和端口号，默认的 NodePort 是 `30880`。现在，您可以使用默认的帐户和密码 (`admin/P@88w0rd`) 通过 `<NodeIP>:30880` 访问控制台。

~~~powershell
#####################################################
###              Welcome to KubeSphere!           ###
#####################################################

Console: http://192.168.10.223:30880
Account: admin
Password: P@88w0rd

NOTES：
  1. After you log into the console, please check the
     monitoring status of service components in
     "Cluster Management". If any service is not
     ready, please wait patiently until all components 
     are up and running.
  2. Please change the default password after login.

#####################################################
https://kubesphere.io             20xx-xx-xx xx:xx:xx
#####################################################
~~~

登录至控制台后，您可以在**系统组件**中查看各个组件的状态。如果要使用相关服务，您可能需要等待部分组件启动并运行。您也可以使用 `kubectl get pod --all-namespaces` 来检查 KubeSphere 相关组件的运行状况。

![image-20220517020658982](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517020658982.png)

![image-20220517020739940](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517020739940.png)

![image-20220517020807274](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517020807274.png)

![image-20220517020829592](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517020829592.png)

![image-20220517020857139](/云原生/platform/platform-01-在linux上以all-in-one模式安装kubernetes-kubesphere/image-20220517020857139.png)

