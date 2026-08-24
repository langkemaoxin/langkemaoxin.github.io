---
title: 部署方法横向对比——二进制、RKE/RKE2、k0s、sealos 与 kubespray
sidebarGroup: Kubernetes
shortTitle: 21 部署方法对比
order: 21
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: 六种 K8s 集群部署方法的原理、步骤与选型：二进制、RKE、RKE2、k0s、sealos、kubespray。
---

> **Kubernetes 系列 · 第 21/35 篇**  
> 上一篇：[《生产集群部署——kubeadm 从零到高可用》](/云原生/k8s/k8s-20-deploy-kubeadm-ha)  
> 下一篇：[《国产化 OS 与容器运行时——OpenEuler、麒麟、CRI-O 与 iSula》](/云原生/k8s/k8s-22-os-runtimes)

---

## 开头：kubeadm 之外，生产上还有五条路

[上一篇](/云原生/k8s/k8s-20-deploy-kubeadm-ha)我们用 kubeadm 把一个高可用集群从零拉了起来——这是官方默认路径。但真实生产环境里，你还会遇到各式各样的「非默认」需求：

- 金融/国企客户要求**所有组件以 systemd 进程裸跑**，不接受「控制面跑在静态 Pod 里」，甚至要求离线、全内网部署——这时候要走**二进制部署**；
- 团队已经重度使用 Rancher 生态，希望集群用**声明式配置文件**描述、一条命令建好、和 Rancher UI 无缝集成——RKE / RKE2 登场；
- 边缘机房、研发自建环境，希望**一个二进制文件搞定一切**，宿主机上什么都不用预装——k0s；
- 想要「一条命令交付一个**带 CNI、带应用**的集群」，像装软件一样装 K8s——sealos；
- 几十上百台机器的批量交付，需要**可重复、可审计**的基础设施即代码——kubespray（Ansible）。

这六种方法（含 kubeadm 共七条路）没有绝对优劣，只有场景匹配。本文以 **K8s 1.28 + containerd 的二进制高可用集群**为主线讲清部署的「本质步骤」，再逐个过一遍各自动化工具的核心玩法，最后给一张选型决策表。

---

## 一、六种方法一张表

先把结论放前面。**形态**指组件以什么方式存在于宿主机上：

| 方法 | 形态 | 上手成本 | 可控性 | 适用场景 |
| --- | --- | --- | --- | --- |
| 二进制部署 | 全部组件 systemd 进程裸跑 | 极高（证书/etcd/各组件手工编排） | 极高，每个参数、每张证书都自己掌握 | 深度定制、强合规审计、理解 K8s 内部原理、面试 |
| kubeadm（[上篇](/云原生/k8s/k8s-20-deploy-kubeadm-ha)） | 控制面静态 Pod + worker systemd | 中 | 中，细节被封装但可覆盖 | 官方标准路径，绝大多数生产集群 |
| RKE | 控制面跑在 **Docker 容器**里，无静态 Pod | 低（一个 cluster.yml + `rke up`） | 中 | 已有 Docker 运维经验、配合 Rancher 管理 |
| RKE2 | 单进程托管全部组件，**默认开启**安全基线（CIS） | 低（一个 config.yaml + systemd 服务） | 中偏低 | 对安全合规要求高、Rancher 生态生产集群 |
| k0s | **单个二进制**零外部依赖（除内核） | 低（k0sctl 一个 YAML `apply`） | 中 | 边缘计算、IoT 网关、裸机/任意云 |
| sealos | 以**集群镜像**方式交付，`sealos run` 一次拉起 | 极低（一条命令） | 低 | 快速交付、离线安装包分发、集群+应用整体交付 |
| kubespray | Ansible playbook 部署（默认 kubeadm） | 中高（Python/Ansible 环境准备繁琐） | 高，几百个变量可调 | 大规模批量部署、多环境 IaC、多云异构 OS |

> 💡 一个有用的观察维度：**谁负责生成证书**。二进制部署里你用 cfssl 亲手签每一张证书；kubeadm/kubespray 自动生成；RKE/RKE2/k0s/sealos 也自动生成，但分别保存在 rkestate、`/var/lib/rancher/rke2/server/tls`、k0s 内部存储和集群镜像里。对证书的掌控程度，基本等价于对集群的掌控程度。

---

## 二、二进制部署：把 K8s 拆开揉碎装一遍

### 2.1 定位

二进制部署是唯一能让你**完整经历** K8s 控制面从无到有的方式：自签 CA、签发组件证书、搭 etcd、逐个拉起 apiserver / controller-manager / scheduler / kubelet / kube-proxy。它的价值在于：装完一遍，K8s 的证书体系、认证授权、组件交互对你不再是黑盒。本节以 K8s 1.28 + containerd 的高可用集群为例，只讲骨架和坑，不逐条复述命令。

集群规划：2 台 HA（haproxy + keepalived，VIP `192.168.10.100`）+ 3 master（同时承载 etcd）+ 2 worker：

![image-20230825124755579](/云原生/k8s-ops/k8s-ops-64-基于containerd实现k8s-1-28二进制高可用集群/image-20230825124755579.png)

### 2.2 关键步骤骨架

主机初始化（hostname、/etc/hosts、关防火墙/SELinux/swap、时间同步、ipvs 模块、br_netfilter 与 ip_forward、内核升级）与 kubeadm 路径基本一致，不再展开。二进制独有的五步如下。

**第一步：负载均衡层。** kubeadm 可以用 keepalived 直通 6443，二进制高可用通常在 master 前再放一对 haproxy：

~~~powershell
# haproxy.cfg 核心段：TCP 四层代理三个 apiserver
frontend k8s-master
 bind 0.0.0.0:6443
 mode tcp
 default_backend k8s-master

backend k8s-master
 mode tcp
 balance roundrobin
 server  k8s-master01  192.168.10.142:6443 check
 server  k8s-master02  192.168.10.143:6443 check
 server  k8s-master03  192.168.10.144:6443 check
~~~

keepalived 负责 VIP 漂移，`vrrp_script` 里用脚本探测 haproxy 进程，探测失败则降权触发切换：

~~~powershell
# check_apiserver.sh：连续 3 次找不到 haproxy 进程就停掉 keepalived 释放 VIP
check_code=$(pgrep haproxy)
if [[ $check_code == "" ]]; then
    /usr/bin/systemctl stop keepalived
fi
~~~

**第二步：cfssl 证书体系。** 用 cfssl 自建 CA，再逐个签发 etcd、kube-apiserver、admin（kubectl 用）、kube-controller-manager、kube-scheduler、kubelet/kube-proxy 等组件证书：

~~~powershell
# 1. 初始化 CA（ca-config.json 里定义 kubernetes profile，有效期 87600h）
cfssl gencert -initca ca-csr.json | cfssljson -bare ca

# 2. 以 CA 签发 etcd 证书
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json \
  -profile=kubernetes etcd-csr.json | cfssljson -bare etcd
~~~

⚠️ 证书是二进制部署**最大的坑**，三个细节：

- **apiserver 证书的 hosts 列表**必须包含：所有 master IP、worker IP、VIP、预留扩容 IP、`10.96.0.1`（service 网段第一个 IP）以及 `kubernetes.default.svc` 等域名——漏一个就是日后莫名其妙的 `x509: certificate is valid for ...`；
- **admin 证书的 `O` 必须是 `system:masters`**——K8s 把证书 CN 当 User、O 当 Group，`system:masters` 内置绑定 cluster-admin 超级权限，写错则 kubectl 后续 `create clusterrolebinding` 报权限错误；
- 各组件证书的 CN/O 要用 K8s 预定义身份（如 `system:kube-controller-manager`），才能命中内置的 ClusterRoleBinding，免去手工授权。

**第三步：etcd 集群。** 三个 master 各跑一个 etcd，`ETCD_INITIAL_CLUSTER` 必须三节点一致：

~~~powershell
# /etc/etcd/etcd.conf 关键项（每台只改自己的 IP 和名字）
ETCD_NAME="etcd1"
ETCD_LISTEN_PEER_URLS="https://192.168.10.142:2380"
ETCD_INITIAL_CLUSTER="etcd1=https://192.168.10.142:2380,etcd2=https://192.168.10.143:2380,etcd3=https://192.168.10.144:2380"
ETCD_INITIAL_CLUSTER_STATE="new"    # 加入已有集群时改为 existing
~~~

验证用 `endpoint health` / `endpoint status`，确认 leader 唯一、三个成员全部 started。

**第四步：控制面三大件。** 下载 `kubernetes-server-linux-amd64.tar.gz`，分发二进制到各节点，为每个组件写 `EnvironmentFile`（启动参数）+ systemd unit。apiserver 参数里值得注意的：

~~~powershell
# /etc/kubernetes/kube-apiserver.conf 节选
--etcd-servers=https://192.168.10.142:2379,https://192.168.10.143:2379,https://192.168.10.144:2379 \
--service-cluster-ip-range=10.96.0.0/16 \
--enable-bootstrap-token-auth \          # 开启 kubelet bootstrap 认证（见第五步）
--token-auth-file=/etc/kubernetes/token.csv \
--authorization-mode=Node,RBAC \
--apiserver-count=3                      # 告知 apiserver 副本数，用于请求负载与缓存一致性
~~~

controller-manager 和 scheduler 配 `--leader-elect=true`，三副本抢锁、单活工作；kubectl 的 kubeconfig 用 admin 证书生成：

~~~powershell
# 三段式生成 kubeconfig（cluster → credentials → context）
kubectl config set-cluster kubernetes --certificate-authority=ca.pem \
  --embed-certs=true --server=https://192.168.10.100:6443 --kubeconfig=kube.config
kubectl config set-credentials admin --client-certificate=admin.pem \
  --client-key=admin-key.pem --embed-certs=true --kubeconfig=kube.config
kubectl config set-context kubernetes --cluster=kubernetes --user=admin --kubeconfig=kube.config
kubectl config use-context kubernetes --kubeconfig=kube.config
~~~

**第五步：worker 与 kubelet bootstrap。** worker 上装 containerd（改 `sandbox_image` 为 `pause:3.9`）、替换新版 runc、再装 kubelet/kube-proxy。kubelet 的客户端证书**不手工签**，而是走 TLS Bootstraping：

~~~powershell
# 1. 在 master 上生成 bootstrap token（写入 token.csv，apiserver 加载）
$(head -c 16 /dev/urandom | od -An -t x | tr -d ' '),kubelet-bootstrap,10001,"system:kubelet-bootstrap"

# 2. 为 worker 生成 kubelet-bootstrap.kubeconfig（只含低权限 bootstrap 身份）
kubectl config set-cluster kubernetes ... --kubeconfig=kubelet-bootstrap.kubeconfig

# 3. 把 bootstrap 用户授权给 node-bootstrapper 角色，kubelet 启动后自动向 apiserver
#    申请证书，由 controller-manager 的 cluster-signing-cert-file 动态签署
kubectl create clusterrolebinding kubelet-bootstrap \
  --clusterrole=system:node-bootstrapper \
  --user=kubelet-bootstrap
~~~

> 💡 这是二进制部署里设计最精巧的一环：Node 多时逐台签证书不可维护，TLS Bootstraping 让 kubelet 以低权限 token 换取 apiserver 动态签发的证书，controller-manager 配置 `--cluster-signing-cert-file` 后全自动。kubeadm 路径里同样有这套机制，只是被 `kubeadm init` 藏起来了。

### 2.3 同主线的老版本/不同运行时变体

课程笔记里二进制部署（及 kubeadm 单机版）有多个版本组合，步骤骨架完全同上，差异只在运行时和规模：

| 变体 | K8s 版本 | 运行时 | 拓扑 | 与 64 号主线的差异 |
| --- | --- | --- | --- | --- |
| 二进制 · Docker（老版） | 1.21 时代 | Docker | 3 master + worker，独立 HA | worker 运行时为 docker，容器方案时代产物 |
| 二进制 · containerd（老版） | 1.21 时代 | containerd | 同上 | 与上一条仅运行时不同 |
| 二进制 · CRI-O | 1.28 | CRI-O | 同 64 号主线 | 运行时换 CRI-O（红帽系），kubelet 指向 crio.sock |
| 二进制 · Docker | 1.28 | Docker | 同 64 号主线 | 运行时换 docker，需处理 dockershim 移除后的 CRI 对接 |
| kubeadm · containerd | 1.26 | containerd | **单 master** + 2 worker | `kubeadm init` + `--cri-socket` 指定 containerd |
| kubeadm · containerd | 1.28 | containerd | 单 master + 2 worker | 同上一条，版本更新 |

> ⚠️ 注意后两行：它们是 **kubeadm 单机版**（无 HA、无外部负载均衡），属于[第 21 篇](/云原生/k8s/k8s-20-deploy-kubeadm-ha)的范畴，列在这里只是说明「运行时替换」在 kubeadm 路径下只需改 `--cri-socket` 一个参数，而在二进制路径下要自己装运行时、改 kubelet 的 `--container-runtime-endpoint`。

### 2.4 优缺点

| 优点 | 缺点 |
| --- | --- |
| 完全透明：证书、参数、进程全在自己手里 | 步骤极多，一条命令敲错排查半天 |
| 组件 systemd 裸跑，排障直观（journalctl 即可） | 无生命周期管理，升级/扩容全手工 |
| 不依赖 Docker、不依赖任何发行版工具 | 证书续期、token 管理要自己做 |
| 理解 K8s 最深，面试与源码阅读的最佳铺垫 | 不可复用，第二套集群仍是同样的工作量 |

---

## 三、RKE 与 RKE2：Rancher 系的声明式部署

### 3.1 RKE：把控制面装进 Docker 容器

RKE（Rancher Kubernetes Engine）是 CNCF 认证的 K8s 发行版，思路是：**所有控制面组件（含 etcd、apiserver、kubelet、kube-proxy）都以 Docker 容器运行**，从而「删除大部分主机依赖项」——宿主机只要有 Docker 就够了。

核心工作流是交互式生成一份 `cluster.yml`，然后一条命令建集群：

~~~powershell
# 交互式生成配置（节点地址、角色、网络插件、网段等）
rke config --name cluster.yml

# 一条命令建集群：端口探测 → 签发证书 → 部署 etcd → 控制面 → worker → 插件
rke up
~~~

`cluster.yml` 的节点段是纯声明式的，增删节点就是改文件再 `rke up --update-only`：

~~~yaml
- address: 192.168.10.13
  port: "22"
  role:
  - worker          # controlplane / worker / etcd 三种角色任意组合
  user: "rancher"
  docker_socket: /var/run/docker.sock
  ssh_key_path: ~/.ssh/id_rsa
~~~

前置条件比较「Docker 时代」：所有节点装好 Docker、创建 rancher 用户并入 docker 组、控制机 SSH 免密。完成后生成 `kube_config_cluster.yml`（kubectl 用的 kubeconfig）和 `cluster.rkestate`（**集群状态与证书备份，必须妥善保存**）。源文实测 5 节点集群 `rke up` 约 2 分钟完成，随后还能 `docker run rancher/rancher` 起 Web 面板纳管集群：

![image-20220222120525765](/云原生/k8s-ops/k8s-ops-20-使用rke构建企业生产kubernetes集群/image-20220222120525765.png)

### 3.2 RKE2：k3s 的易用 + 上游一致 + 默认安全

RKE2 是 RKE 的继任者（也叫 RKE Government），定位介于 k3s 与 RKE 之间：继承 k3s 的单进程部署模式，但不魔改上游 K8s（k3s 为边缘优化做了裁剪），并**预设 CIS 安全基线**——默认 PodSecurityPolicies/限制、所有组件间通信强制 TLS。相比 RKE，它不依赖宿主机 Docker，自带 containerd。

每台机器只需一个 config.yaml + 一条安装命令：

~~~powershell
# 第一个 server 节点：/etc/rancher/rke2/config.yaml
token: smartgo                                        # 集群共享 token
node-name: k8s-master01
tls-san: 192.168.10.140                               # 证书 SAN，避免固定注册地址报错
system-default-registry: "registry.cn-hangzhou.aliyuncs.com"  # 国内镜像
kube-proxy-arg:
  - proxy-mode=ipvs
  - ipvs-strict-arp=true

# 安装并启动（国内镜像源）
curl -sfL https://rancher-mirror.oss-cn-beijing.aliyuncs.com/rke2/install.sh | INSTALL_RKE2_MIRROR=cn sh -
systemctl enable --now rke2-server
~~~

后续节点加一行 `server: https://192.168.10.140:9345` 指向首个 server 即可加入（**9345 是注册端口，与 API 的 6443 不是一回事**）；worker 节点用 `INSTALL_RKE2_TYPE="agent"` 安装并启动 `rke2-agent` 服务。kubectl 与 crictl 都在 `/var/lib/rancher/rke2/bin` 下，kubeconfig 在 `/etc/rancher/rke2/rke2.yaml`。私有仓库通过 `registries.yaml` 配置 mirrors 与认证，改完重启服务生效。卸载一条 `rke2-uninstall.sh`。

### 3.3 优缺点

| 优点 | 缺点 |
| --- | --- |
| cluster.yml/config.yaml 声明式，集群即配置文件 | 与 Rancher 生态绑定较深 |
| 证书、端口探测、组件启动全自动 | RKE 依赖 Docker，版本组合受 Rancher 支持矩阵约束 |
| RKE2 默认安全加固，合规场景省心 | kubectl/crictl 等工具路径非标准，上手要适应 |
| 与 Rancher UI 天然集成，多集群纳管方便 | 深度定制不如 kubespray/二进制 |

---

## 四、k0s：一个二进制，零外部依赖

k0s 是一个「包罗万象」的 K8s 发行版：**除 Linux 内核外没有任何外部运行时依赖**——Kubernetes、containerd、runc、CNI、CoreDNS、metrics-server 全部打包进单个二进制。它自行编译上游 K8s 源码，除 Cloud provider 外几乎不裁剪功能；存储支持 etcd（多节点默认）、SQLite（单节点默认）、MySQL/PostgreSQL；系统要求低到 1 vCPU / 1 GB 内存，天然适合边缘、IoT 网关和裸机。

![image-20231225134055314](/云原生/k8s-ops/k8s-ops-47-如何通过k0s部署k8s二进制集群/image-20231225134055314.png)

生产上一般不用 k0s 单机命令，而是用 **k0sctl**（类比 kubeadm 的存在）：控制机一个 YAML 描述全部主机，SSH 过去自动释放文件并启动各服务：

~~~powershell
# 生成配置骨架
k0sctl init --k0s > k0sctl.yaml
~~~

~~~yaml
# k0sctl.yaml 节选：3 个 controller+worker 混布 + 2 个 worker
spec:
  hosts:
  - ssh: {address: 192.168.10.160, user: root, port: 22, keyPath: /root/.ssh/id_rsa}
    role: controller+worker
  # ... 另两台 controller+worker，两台纯 worker
  k0s:
    version: v1.28.4+k0s.0
    config:
      spec:
        network:
          provider: kuberouter      # 默认 Kube-Router，预置 Calico 替代方案
          kubeProxy: {mode: ipvs}
          podCIDR: 10.244.0.0/16
        storage:
          type: etcd                 # 多节点默认 etcd
~~~

~~~powershell
# 一条命令部署（实测 5 节点约 1 分半）
k0sctl apply -c k0sctl.yaml

# 导出 kubeconfig
k0sctl kubeconfig --config ./k0sctl.yaml > k0s.config
~~~

> ⚠️ 源文实操中有个细节：k0sctl 依赖 `/etc/machine-id` 区分主机，如果虚拟机是克隆出来的（machine-id 重复），需要 `rm -rf /etc/machine-id && dbus-uuidgen --ensure=/etc/machine-id` 重新生成后再部署。

| 优点 | 缺点 |
| --- | --- |
| 单二进制零依赖，离线/边缘场景无敌 | 社区规模小于 k3s/RKE2 |
| k0sctl 一条命令全生命周期（部署/升级/备份） | 默认 Kube-Router，用惯 Calico 要改配置 |
| 严格上游 K8s，无魔改 | 控制面与 worker 混布时资源隔离需自己规划 |
| 数据源可选 SQLite/MySQL/PostgreSQL，复用现有 DB | x86/ARM 之外的平台支持有限 |

---

## 五、sealos：像装软件一样装集群

sealos 的核心概念是**集群镜像**：把 K8s 本体、CNI、甚至你的业务应用打成一个 OCI 镜像，`sealos run` 一条命令把整个集群「装」出来。底层基于 kubeadm，但你完全感知不到——从二进制分发、证书、到 hosts 解析全部自动处理，默认使用 containerd。

部署四台机器的集群（3 master + 1 worker）就是这一行：

~~~powershell
# 下载 sealos 二进制
wget -c https://sealyun-home.oss-cn-beijing.aliyuncs.com/sealos-4.0/latest/sealos-amd64 \
  -O sealos && chmod +x sealos && mv sealos /usr/bin

# 一条命令：指定 K8s 集群镜像 + CNI 镜像 + master/node 列表 + root 密码
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 \
    --masters 192.168.10.142,192.168.10.143,192.168.10.144 \
    --nodes 192.168.10.145 \
    --passwd centos
~~~

完成后 `kubectl get nodes` 四节点全部 Ready，kube-system 里除了标准组件，还有 sealos 自带的 `kube-sealyun-lvscare`——worker 上的 VIP 维护组件，负责在多个 master 的 apiserver 之间做健康检查与切换，替代了 keepalived+haproxy 的角色。sealos 同样能一条命令装应用：`sealos run` 一个含 Helm/应用的集群镜像即可「集群+中间件+业务」整体交付。

源文还演示了用 Kuboard（国产 Web 面板）纳管 sealos 集群：docker 起一个 kuboard 容器，在 UI 导入 kubeconfig、apply 一份 agent YAML 即完成接入：

![image-20220712171651634](/云原生/k8s-ops/k8s-ops-23-使用sealos部署kubernetes集群并实现集群管理/image-20220712171651634.png)

| 优点 | 缺点 |
| --- | --- |
| 上手成本全场最低，一条命令出集群 | 底层仍是 kubeadm，深度定制空间有限 |
| 集群镜像可离线分发，内网/保密环境友好 | 集群镜像版本依赖社区维护（labring 仓库） |
| lvscare 内置多 master 容错，免配 keepalived | 出了问题要穿透 sealos 封装去排障 |
| 支持「集群+应用」整体交付 | 与 Rancher 等管理面的集成不如 RKE 系原生 |

---

## 六、kubespray：Ansible 大军压境

kubespray 是 Kubernetes SIG 官方维护的 Ansible playbook 集合，支持 Ubuntu/CentOS/Rocky/RHEL 等主流发行版，可部署到裸机、公有云与私有云，**底层默认用 kubeadm**，但把证书、网络插件、运行时、插件栈全部变量化（几百个可调参数），是大规模、可重复、可审计交付的标准答案。

它的门槛在于**控制机环境**：需要 Python 3.x（CentOS 7 上往往要源码编译 Python 3.10，注意用 openssl11 的 CFLAGS/LDFLAGS），然后 clone 仓库、pip 安装 requirements、生成分支 inventory：

~~~powershell
git clone https://github.com/kubernetes-sigs/kubespray.git && cd kubespray
pip3 install -r requirements.txt

# 复制 sample inventory，用内置脚本从 IP 列表生成 hosts.yaml
cp -rfp inventory/sample inventory/mycluster
declare -a IPS=(192.168.10.160 192.168.10.161 192.168.10.162 192.168.10.163 192.168.10.164)
CONFIG_FILE=inventory/mycluster/hosts.yaml \
  python3 contrib/inventory_builder/inventory.py ${IPS[@]}
~~~

生成的 `hosts.yaml` 按 Ansible group 划分角色，手工微调后就是集群的「拓扑文件」：

~~~yaml
children:
  kube_control_plane:   # 控制面
    hosts: {node1: , node2: , node3: }
  kube_node:            # 工作节点
    hosts: {node4: , node5: }
  etcd:                 # etcd 成员
    hosts: {node1: , node2: , node3: }
~~~

版本与插件在 `group_vars/k8s_cluster/` 下改：`k8s-cluster.yml` 的 `kube_version: v1.26.3`，`addons.yml` 里开关 dashboard/helm/metrics-server 等。之后全是 playbook：

~~~powershell
ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root cluster.yml    # 建集群
ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root scale.yml      # 扩容（先改 hosts.yaml）
ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root remove-node.yml \
  --extra-vars "node=node5"                                                                   # 缩容
ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root upgrade-cluster.yml  # 升级
ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root reset.yml      # 清空重来
~~~

主机初始化也能直接用 Ansible 批量下发（关防火墙、开转发、关 swap），失败可幂等重跑——「执行没成功就再跑一次」正是 playbook 的常态。除了建删节点，还有 `recover-control-plane.yml` 恢复控制面。

| 优点 | 缺点 |
| --- | --- |
| 大规模批量部署、幂等可重跑 | 控制机 Python/Ansible 环境准备繁琐 |
| 参数全变量化，可控性接近二进制 | playbook 执行时间长，排障要读 Ansible 日志 |
| 官方维护，版本跟进快 | 升级跨大版本仍需谨慎规划 |
| 天然 IaC，inventory 即文档 | 对使用者的 Ansible 功底有要求 |

---

## 七、选型建议

按场景倒推：

| 你的场景 | 推荐 | 理由 |
| --- | --- | --- |
| 学习原理、面试备战、强合规要求组件裸跑 | 二进制（本文第 2 节主线） | 一遍下来证书/etcd/bootstrap 全打通 |
| 一般生产集群，要官方支持路径 | kubeadm（[第 21 篇](/云原生/k8s/k8s-20-deploy-kubeadm-ha)） | 文档最全、生态默认 |
| 已用 Rancher，要 UI 多集群管理 | RKE2（新集群）/ RKE（存量 Docker 环境） | 声明式配置 + Rancher 无缝纳管；安全优先选 RKE2 |
| 边缘、IoT、异构裸机、低配环境 | k0s | 单二进制零依赖，1C1G 可跑 |
| 内网/离线交付、快速拉起验证环境 | sealos | 一条命令出集群，集群镜像可离线搬运 |
| 几十上百节点批量交付、多环境 IaC | kubespray | Ansible 幂等 + 全参数暴露 |

> 💡 选型时问自己三个问题：①证书和参数要不要我亲手管？（要 → 二进制/kubespray）②宿主机上允许预装什么？（什么都不能装 → k0s/sealos）③谁负责集群后续升级？（自己 → kubeadm/kubespray；交给发行版 → RKE2/k0s/sealos）

---

## 小结

- 六种方法本质是**自动化程度的排序**：二进制全手工 → kubespray（Ansible 编排 kubeadm）→ RKE/RKE2/k0s（发行版封装）→ sealos（集群镜像一键交付），自动化越高、可控性越低，没有全能选项；
- 二进制部署的三大关键点：**cfssl 证书体系**（hosts 列表、O=system:masters）、**etcd 集群**（INITIAL_CLUSTER 三台一致）、**kubelet TLS Bootstraping**（token 换证书，免逐台签发）——理解了它们，其余工具的报错一眼就能定位；
- RKE 把控制面装进 Docker 容器，RKE2 继承 k3s 易用性但保持上游一致并默认安全加固，注意 RKE2 的 **9345 注册端口**与 6443 分离；
- k0s 单二进制零外部依赖，k0sctl 一个 YAML 管全生命周期；sealos 用集群镜像把「集群+应用」变成一条命令；kubespray 用 Ansible 换来大规模幂等交付与最高可调参数密度；
- 方法会过时（RKE 依赖的 Docker、dockershim 均已退场），但**证书、etcd、bootstrap、负载均衡**这四件事是所有部署方法的公共内核，也是本系列反复出现的主题。

> ➡️ 下一篇：[《国产化 OS 与容器运行时——OpenEuler、麒麟、CRI-O 与 iSula》](/云原生/k8s/k8s-22-os-runtimes)
