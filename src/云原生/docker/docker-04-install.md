---
title: Docker 安装三种方式——离线、在线与现成虚拟机
sidebarGroup: Docker 系列
shortTitle: 04 安装三种方式
order: 4
date: 2026-08-11T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: Docker 安装三种方式——离线、在线与现成虚拟机
---

> **Docker 系列 · 第 4/33 篇**
> 上一篇：[《Docker Engine 与平台架构——Client、daemon、containerd、runc 怎么协作》](/云原生/docker/docker-03-engine-platform) · 下一篇：[《容器与镜像——类与实例、读写层与生命周期》](/云原生/docker/docker-05-container-and-image)

---

## 开头：内网机器上不了外网，Docker 怎么装？

公司测试区 CentOS 7 服务器**不能访问公网**，运维要求用审批过的离线包；家里学习环境则能直连镜像站，希望 `yum install` 一把梭；还有人不想折腾内核升级和磁盘扩容，想直接导入一台**预装好 Docker 的 Linux 虚拟机**开练。

这三种情况对应 Docker 安装的三种典型路径。装 Docker 时涉及两个主要组件：

| 组件 | 说明 |
|------|------|
| **Docker CLI** | 客户端，执行 `docker` 命令 |
| **Docker daemon（dockerd）** | 服务端/引擎，管理容器与镜像 |

下面按**离线安装 → 在线安装 → 现成环境**说明。示例以 **CentOS 7** 与 **Docker 19.03.x** 静态包为例，其他版本步骤类似，请以[官方文档](https://docs.docker.com/)为准。

---

## 一、环境准备（硬件与本地虚拟机）

学习 Docker 及后续 K8s，建议预留足够资源。参考常见 lab 配置：

| 序号 | 项目 | 要求 |
|------|------|------|
| 1 | CPU | 至少 2 核 |
| 2 | 内存 | 至少 8 GB |
| 3 | 硬盘 | 至少 100 GB |

若在 **Windows** 本机用虚拟机练习，常见组合：

| 软件 | 版本建议 |
|------|----------|
| Windows | Win10 及以上 |
| VirtualBox | 6 及以上 |
| Vagrant | 2 及以上 |

Docker + K8s 学习环境涉及内核版本、磁盘、网络等，手工从零搭往往要折腾较久。**方式三**即通过导入 OVA/Box 镜像等方式跳过大部分基建；也可自行用 Vagrant 定义一台 CentOS 并脚本化安装 Docker（本系列不展开 K8s 集群搭建）。

---

## 二、方式一：离线安装（无公网场景）

适用于**无法直接访问互联网**的内网机器。以 **Docker 19.03.9** 静态二进制包为例（[官方静态包文档](https://docs.docker.com/install/linux/docker-ce/binaries/#install-static-binaries)）。

**基础环境：**

- 操作系统：CentOS 7.3（或兼容的 Linux）  
- Docker 版本：19.03.9（可换其他 stable 静态包）

### 步骤 1：下载

在有网络的机器下载后拷贝到目标机，或在目标机用内网镜像站：

```bash
wget https://download.docker.com/linux/static/stable/x86_64/docker-19.03.9.tgz
```

若已下载可跳过。

### 步骤 2：解压

```bash
tar -zxvf docker-19.03.9.tgz
```

解压后可见 `docker/` 目录，内含 `dockerd`、`docker`、`containerd`、`runc`、`ctr` 等二进制。

### 步骤 3：安装到 PATH

```bash
cp docker/* /usr/bin/
```

### 步骤 4：注册为 systemd 服务

创建 `/etc/systemd/system/docker.service`：

```ini
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TimeoutStartSec=0
Delegate=yes
KillMode=process
Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s

[Install]
WantedBy=multi-user.target
```

### 步骤 5：启动并设置开机自启

```bash
chmod +x /etc/systemd/system/docker.service
systemctl daemon-reload
systemctl start docker
systemctl enable docker.service
```

### 步骤 6：验证

```bash
systemctl status docker
docker -v
docker info
```

成功时 `systemctl status` 应显示 **active (running)**，且进程树中可见 `dockerd` 与 `containerd`。

---

## 三、方式二：在线安装（推荐，有公网或镜像站）

能连接公网时，优先用包管理器安装 **Docker CE**，便于后续升级。

**注意：** 较新的 Docker CE 可能依赖较新的操作系统（例如需 CentOS 8+ 或改用 Rocky/Alma 等）。安装前核对[官方支持矩阵](https://docs.docker.com/engine/install/)。

以 **yum + 国内镜像源** 为例（阿里云源；亦可用腾讯云等）：

```bash
# 1. 更新 yum
yum update -y

# 2. 安装工具包
yum -y install yum-utils

# 3. 添加 Docker CE 源（示例：阿里云）
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

# 4. 安装 Docker CE
yum install -y docker-ce

# 5. 确认版本
docker -v
```

### 配置镜像加速（国内常用）

国内直连 Docker Hub（`docker.io`）经常很慢或超时。配置 **`registry-mirrors`** 后，`docker pull`（以及后面装 Harbor 时 `install.sh` 拉组件镜像）会优先走加速站。

**是什么**：`daemon.json` 里的仓库镜像列表，给引擎当「拉取中转」。  
**为什么现在配**：装完 Docker 立刻配，后面所有 pull 都受益；拖到装 Harbor 再配也行，但 `./install.sh` 会白等很久。

#### Linux（systemd）主路径

```bash
sudo mkdir -p /etc/docker

# 若已有 daemon.json，先备份，再合并字段——不要整文件覆盖丢掉其它配置
sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.bak 2>/dev/null || true
```

若文件不存在或可以整段重写（确认没有要保留的项），最小示例如下。加速地址以你当前能通的为准（云厂商、DaoCloud 等会调整，失效就换一个）：

```bash
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io"
  ]
}
EOF
```

若文件里已有别的配置（日志、`insecure-registries` 等），应**手工合并**成一个 JSON，例如：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

注意：JSON 必须是 **无 BOM 的 UTF-8**。Windows 记事本「另存为 UTF-8」有时会带 BOM，Docker 启动会报类似 `invalid character 'ï'`——用 VS Code / 正确无 BOM 方式保存。

重启引擎并验收：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker

docker info | grep -A8 'Registry Mirrors'
```

应能看到你写入的地址。再测拉取：

```bash
docker pull alpine:3.21
```

比直连 Hub 明显更快或不再超时，说明加速生效。

#### Docker Desktop

打开 **Settings → Docker Engine**，在 JSON 中加入同样的 `"registry-mirrors": [...]`，点 **Apply & restart**。  
仅改 `%USERPROFILE%\.docker\daemon.json` 有时不会进引擎；改完同样用 `docker info` 看 Registry Mirrors。

#### 和后续文章的关系

- 装 **Harbor**（[第 12 篇](/云原生/docker/docker-12-harbor)）前，请先完成本节验收；在线安装包很小，慢通常慢在 `install.sh` 拉镜像。  
- `daemon.json` 其它项（live-restore、日志等）见[第 28 篇](/云原生/docker/docker-28-daemon-ops)。

### 启动与验证

```bash
systemctl start docker
systemctl enable docker
docker ps
```

空列表亦表示 daemon 正常（无运行中容器）。

---

## 四、方式三：使用现成虚拟机环境

Docker 与 K8s 学习栈涉及 Linux 内核、存储、网络等多方面配置。若时间紧，可以：

1. 使用 **VirtualBox / VMware** 导入已配置好的 Linux OVA 镜像  
2. 使用 **Vagrant Box** 一键 `vagrant up` 获得带 Docker 的 guest  
3. 使用云厂商**预装 Docker 的镜像**创建 ECS/CVM  

核心思路：**把 OS 调优、Docker 安装、基础工具链打包进镜像**，本地只需导入或开机，即可进入 `docker run` 实操。后续学 K8s 时可在同一 lab 上扩展 master/node，避免重复踩「内核升级、磁盘扩容」的坑。

选择现成环境时仍建议确认：

- Docker 与 containerd 版本  
- `/etc/docker/daemon.json` 是否含所需镜像加速或 insecure-registries  
- 磁盘与 cgroup 驱动是否与计划中的 K8s 版本兼容  

---

## 五、安装后自检清单

| 检查项 | 命令 | 期望 |
|--------|------|------|
| 守护进程状态 | `systemctl status docker` | active (running) |
| 客户端版本 | `docker -v` | 输出版本号 |
| 引擎信息 | `docker info` | 无致命错误，Storage Driver 等正常 |
| 基本能力 | `docker run --rm hello-world` | 能 pull/run（在线环境） |
| 镜像加速（国内） | `docker info \| grep -A5 'Registry Mirrors'` | 列表非空且地址可用 |

---

## 小结

- 安装产物 = **Docker CLI + dockerd**（及依赖的 containerd/runc 等）。  
- **离线**：静态 tgz → `/usr/bin` → systemd unit → `systemctl start`。  
- **在线**：yum/apt + CE 源 → `docker-ce` → **建议立刻**配 `registry-mirrors` 并用 `docker info` 验收。  
- **现成 VM/云镜像**：跳过基建，适合快速上手与 K8s 联调；仍建议确认加速是否已配。  
- 后面装 Harbor（第 12 篇）若 `install.sh` 拉镜像很慢，先回到本节把加速跑通。

下一篇讲 **容器与镜像** 的关系：只读镜像层、可写容器层，以及「类与实例」模型。
