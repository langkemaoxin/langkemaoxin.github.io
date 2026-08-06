---
layout: post
author:     "Corey"
header-img: "img/post-bg-circuit-board.jpg"
header-mask: 0.25
title: "从零开始：在 Windows 上装 Ubuntu、Docker，并跑起 Hadoop"
subtitle: "WSL 权限、镜像加速、镜像 tag 踩坑全记录"
date: 2026-06-05
tags: [Windows, WSL, Ubuntu, Docker, Hadoop, 问题解决]
---

## 开头：表面问题 vs 真实问题

表面上的目标很简单：在 Windows 本机的 Ubuntu 22.04 里，用 Docker 跑一个 Hadoop（HDFS）容器。

实际跑下来，先后撞上了 **三层不同性质的问题**：

1. **权限问题** —— 用户不在 `docker` 组，无法访问 `/var/run/docker.sock`
2. **网络问题** —— 直连 Docker Hub 超时，需要国内镜像加速
3. **镜像 tag 问题** —— `harisekhon/hadoop:2.7.1` 根本不存在，导致 Docker 回退直连官方源再次超时

最后一层最容易被忽略：**镜像加速配置已经生效，但 tag 写错时，Docker 仍会尝试访问 `registry-1.docker.io`**，报错看起来像是「镜像源没配好」，其实是「镜像名/版本写错了」。

---

## 第一部分：从 0 安装 Ubuntu（WSL）

### 1.1 环境说明

本文环境：

- 宿主系统：Windows 10/11
- Linux 子系统：Ubuntu 22.04（WSL2）
- 终端提示符示例：`chengongyi@pc3507:~$`

WSL（Windows Subsystem for Linux）让你在 Windows 里直接运行 Linux，不必装双系统或虚拟机，对开发、跑 Docker 都很方便。

### 1.2 安装步骤

**方式一：一条命令（Windows 11 / 较新 Windows 10 推荐）**

在 **PowerShell（管理员）** 中执行：

```powershell
wsl --install -d Ubuntu-22.04
```

安装完成后重启，按提示创建 Linux 用户名和密码（这个密码后面 `sudo` 会用到）。

**方式二：手动安装**

```powershell
# 启用 WSL 功能
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 重启后设置 WSL2 为默认
wsl --set-default-version 2

# 从 Microsoft Store 安装「Ubuntu 22.04 LTS」，或：
wsl --install -d Ubuntu-22.04
```

验证：

```powershell
wsl -l -v
```

应看到 `Ubuntu-22.04` 且 `VERSION` 为 `2`。

进入 Ubuntu：

```powershell
wsl -d ubuntu-22.04
```

---

## 第二部分：在 Ubuntu 中安装 Docker

### 2.1 安装 Docker Engine

在 Ubuntu 终端执行（官方推荐方式）：

```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install -y ca-certificates curl gnupg

# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加 apt 源
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

验证服务：

```bash
sudo systemctl status docker
# 应显示 active (running)
```

### 2.2 踩坑一：permission denied

第一次运行容器时报错：

```text
permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
```

**原因分析：**

- Docker 守护进程监听 Unix 套接字 `/var/run/docker.sock`
- 该文件权限为 `srw-rw---- root docker`，只有 **root** 和 **docker 组成员** 能访问
- 当前用户组里没有 `docker`：

```text
groups
# chengongyi adm cdrom sudo dip plugdev   ← 没有 docker
```

**解决方法：**

```bash
sudo usermod -aG docker $USER
```

然后 **重新登录 WSL 终端**，或执行：

```bash
newgrp docker
```

验证：

```bash
groups          # 应包含 docker
docker ps       # 不应再报 permission denied
```

### 2.3 关于 sudo 要输密码

执行 `sudo usermod -aG docker $USER` 时提示输入密码，这是 **正常现象**：

- 输入的是 **当前 Linux 用户自己的密码**，不是 root 密码
- 输入时终端 **不显示任何字符**，直接敲完回车即可
- `sudo` 的含义是「以管理员身份执行」，修改用户组属于系统级操作，必须验证身份

如果忘记 WSL 用户密码，可在 Windows PowerShell（管理员）中重置：

```powershell
wsl -d ubuntu-22.04 -u root passwd chengongyi
```

---

## 第三部分：配置 Docker 国内镜像加速

### 3.1 踩坑二：拉镜像超时

权限问题解决后，运行：

```bash
docker run -d --name hdfs \
  -p 9870:9870 \
  -p 9000:9000 \
  harisekhon/hadoop:2.7.1
```

报错：

```text
Unable to find image 'harisekhon/hadoop:2.7.1' locally
docker: Error response from daemon: Get "https://registry-1.docker.io/v2/": context deadline exceeded
```

配置镜像源后，错误变为：

```text
Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)
```

**背景：** 2024 年后，国内大量 Docker Hub 加速站（阿里云、腾讯云、高校镜像等）停服或限内网。目前社区镜像仍可用，但稳定性因地区和时间而异。

### 3.2 配置 registry-mirrors

创建 `/etc/docker/daemon.json`：

```bash
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.m.daocloud.io",
    "https://docker.xuanyuan.me"
  ]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

验证：

```bash
docker info | grep -A 5 "Registry Mirrors"
```

期望输出：

```text
Registry Mirrors:
  https://docker.1ms.run/
  https://docker.m.daocloud.io/
  https://docker.xuanyuan.me/
```

**连通性自测（可选）：**

```bash
curl -s -o /dev/null -w "1ms: %{http_code}\n" --connect-timeout 5 https://docker.1ms.run/v2/
curl -s -o /dev/null -w "daocloud: %{http_code}\n" --connect-timeout 5 https://docker.m.daocloud.io/v2/
curl -s -o /dev/null -w "dockerhub: %{http_code}\n" --connect-timeout 5 https://registry-1.docker.io/v2/
```

- 镜像站返回 `401` 通常表示 **可达**（`/v2/` 未带认证时的正常响应）
- `dockerhub` 返回 `000` 或超时，说明 **直连官方源不可用** —— 这在国内很常见

---

## 第四部分：安装 Hadoop —— 真正的根因

### 4.1 镜像加速其实已生效

配置 mirror 后，用镜像前缀拉取测试镜像成功：

```bash
docker pull docker.1ms.run/library/hello-world:latest
# Status: Downloaded newer image
```

说明 **网络与镜像站本身没问题**。

### 4.2 踩坑三：tag 写错了

继续排查 `harisekhon/hadoop:2.7.1` 时发现：

| 尝试方式 | 结果 |
|----------|------|
| `docker pull docker.m.daocloud.io/harisekhon/hadoop:2.7.1` | 不在 DaoCloud 白名单 |
| `docker pull docker.1ms.run/harisekhon/hadoop:2.7.1` | `manifest unknown`，资源不存在 |
| `docker pull docker.1ms.run/harisekhon/hadoop:2.7` | **成功** |

查阅 [harisekhon/hadoop Docker Hub](https://hub.docker.com/r/harisekhon/hadoop/tags) 可知：

- 可用 tag 为 `2.7`、`2.8`、`2.6` 等 **大版本号**
- **没有** `2.7.1` 这种 patch 版本 tag

因此 Docker 的行为是：

1. 本地没有该镜像
2. 通过 mirror 拉取 `2.7.1` → 镜像站返回「不存在」
3. **回退尝试直连** `registry-1.docker.io`
4. 国内直连超时 → 报错里仍出现 `registry-1.docker.io`

**这不是 mirror 没配好，而是 tag 不存在触发了回退。**

若必须使用 Hadoop **2.7.1** 小版本，可换镜像：

```bash
docker pull docker.1ms.run/sequenceiq/hadoop-docker:2.7.1
docker tag docker.1ms.run/sequenceiq/hadoop-docker:2.7.1 sequenceiq/hadoop-docker:2.7.1
```

### 4.3 最终成功的命令

**方案 A：harisekhon/hadoop（Hadoop 2.7 大版本）**

```bash
# 推荐：显式走镜像站前缀，避免回退 docker.io
docker pull docker.1ms.run/harisekhon/hadoop:2.7
docker tag docker.1ms.run/harisekhon/hadoop:2.7 harisekhon/hadoop:2.7

docker run -d --name hdfs \
  -p 50070:50070 \
  -p 9000:9000 \
  harisekhon/hadoop:2.7
```

**方案 B：sequenceiq/hadoop-docker（精确 2.7.1）**

```bash
docker pull docker.1ms.run/sequenceiq/hadoop-docker:2.7.1
docker tag docker.1ms.run/sequenceiq/hadoop-docker:2.7.1 sequenceiq/hadoop-docker:2.7.1

docker run -d --name hdfs \
  -p 50070:50070 \
  -p 9000:9000 \
  sequenceiq/hadoop-docker:2.7.1
```

### 4.4 端口也要配对

原命令映射了 `9870:9870`，这是 **Hadoop 3.x** NameNode Web UI 端口。

`harisekhon/hadoop:2.7` 属于 **Hadoop 2.x**，官方示例端口如下：

| 服务 | 端口 |
|------|------|
| HDFS NameNode Web UI | **50070** |
| HDFS DataNode | 50075 |
| YARN ResourceManager | 8088 |
| YARN NodeManager | 8042 |

启动后在 Windows 浏览器访问：

```text
http://localhost:50070
```

---

## 第五部分：完整排查时间线

```text
1. docker run harisekhon/hadoop:2.7.1
   → permission denied（docker.sock）

2. sudo usermod -aG docker $USER + 重新登录
   → 权限 OK

3. 再次 docker run
   → registry-1.docker.io 超时

4. 配置 /etc/docker/daemon.json 国内 mirror
   → 仍报 registry-1.docker.io 超时

5. curl 测试 mirror 可达（401），dockerhub 不可达
   → mirror 配置有效，问题不在「没配源」

6. docker pull docker.1ms.run/library/hello-world
   → 成功，确认镜像站可用

7. docker pull docker.1ms.run/harisekhon/hadoop:2.7.1
   → manifest unknown（tag 不存在）

8. docker pull docker.1ms.run/harisekhon/hadoop:2.7
   → 成功

9. 修正端口 50070，容器正常运行
```

---

## 第六部分：节点启动成功 —— Web UI 截图与功能说明

容器启动后，在 Windows 浏览器访问 **NameNode 管理界面**：

```text
http://localhost:50070
```

页面会自动跳转到 `dfshealth.html`。当前集群实测状态（JMX API）：

- **Hadoop 版本**：2.7.4
- **NameNode 状态**：active（活跃）
- **Safemode**：off（已退出安全模式，可正常读写）
- **Live Nodes**：1（1 个 DataNode 在线）
- **Dead Nodes**：0
- **HDFS 已用空间**：约 28 KB（刚启动，几乎为空）

> 说明：`harisekhon/hadoop:2.7` 镜像 tag 是 2.7，容器内实际运行的是 **2.7.4** 小版本，这是正常现象。

### 6.1 Overview（集群总览）

![](/img/post-hadoop/hdfs-namenode-overview.png)

顶部导航栏功能：

| 菜单 | 作用 |
|------|------|
| **Overview** | 集群总览：版本、容量、节点数、内存、日志状态 |
| **Datanodes** | 查看每个 DataNode 的磁盘使用率与健康状态 |
| **Datanode Volume Failures** | 磁盘卷故障统计 |
| **Snapshot** | HDFS 快照管理 |
| **Startup Progress** | NameNode 启动各阶段进度 |
| **Utilities → Browse the file system** | 图形化浏览 HDFS 目录 |
| **Utilities → Logs** | 查看 NameNode 日志 |

Overview 页核心指标解读：

| 区域 | 关键字段 | 含义 |
|------|----------|------|
| Overview 表格 | Started / Version / Cluster ID | 启动时间、Hadoop 版本、集群唯一标识 |
| Summary | Safemode is off | 集群已就绪，可执行 `hdfs dfs` 读写 |
| Summary | Live Nodes: 1 | 至少有 1 个 DataNode 注册成功，**说明 HDFS 存储层已连通** |
| 容量表 | Configured Capacity ~1006 GB | 容器可见的总磁盘容量 |
| 容量表 | DFS Used 28 KB (0%) | HDFS 实际存储占用，新集群几乎为空 |
| 容量表 | DFS Remaining ~951 GB | 可用于 HDFS 的剩余空间 |
| Journal Status | Current transaction ID | 元数据编辑日志事务 ID，反映 NameNode 元数据变更进度 |
| NameNode Storage | IMAGE_AND_EDITS | 元数据镜像（fsimage）与编辑日志（edits）存储正常 |

### 6.2 Datanodes（存储节点）

![](/img/post-hadoop/hdfs-namenode-datanodes.png)

这一页是验证 **「HDFS 真的跑起来了」** 的关键证据：

| 字段 | 当前值 | 说明 |
|------|--------|------|
| Node | `2083fa0650f3:50010 (172.17.0.2:50010)` | DataNode 主机名与 Docker 内网 IP |
| Last Contact | 2 sec | 与 NameNode 心跳间隔，越小越健康 |
| Admin State | **In Service** | 节点处于服务中，可接收数据块 |
| Capacity | 1006.85 GB | 该节点可用总容量 |
| Used | 28 KB | 该节点 HDFS 已用空间 |
| Blocks | 0 | 尚未写入数据块（空集群正常） |
| Version | 2.7.4 | 与 NameNode 版本一致 |

上方 **Disk usage histogram** 显示各 DataNode 磁盘使用率分布。当前仅 1 个节点，使用率接近 0%。

### 6.3 Browse Directory（HDFS 文件浏览器）

![](/img/post-hadoop/hdfs-explorer-root.png)

路径：`Utilities → Browse the file system`，或直接访问 `http://localhost:50070/explorer.html`

| 功能 | 说明 |
|------|------|
| 路径输入框 + Go! | 输入 HDFS 路径（如 `/user`）后跳转 |
| Permission / Owner / Group | 文件权限与所属用户、组 |
| Size / Replication / Block Size | 文件大小、副本数、块大小 |
| Name | 文件或目录名，可点击进入子目录 |

当前根目录 `/` 为空，表示 HDFS 已初始化但尚未写入业务数据。可通过命令验证：

```bash
# 进入容器
docker exec -it hdfs bash

# 创建目录并上传测试文件
hdfs dfs -mkdir -p /user/test
echo "hello hdfs" | hdfs dfs -put - /user/test/hello.txt
hdfs dfs -ls /
hdfs dfs -cat /user/test/hello.txt
```

刷新 Explorer 页面即可看到新建目录和文件。

### 6.4 其他 Web 界面（需额外映射端口）

`harisekhon/hadoop` 镜像在同一容器内还启动了 YARN 等组件，常用端口如下：

| 服务 | 容器端口 | 说明 |
|------|----------|------|
| HDFS NameNode UI | **50070** | 本文已映射，可直接访问 |
| HDFS RPC | **9000** | 客户端连接 HDFS 的 RPC 端口 |
| YARN ResourceManager UI | 8088 | 查看 MapReduce/Spark 作业与队列 |
| YARN NodeManager UI | 8042 | 单个 NodeManager 状态 |
| MapReduce JobHistory | 19888 | 历史作业查看 |

若需从 Windows 浏览器访问 YARN，启动时需额外映射：

```bash
docker run -d --name hdfs \
  -p 50070:50070 \
  -p 9000:9000 \
  -p 8088:8088 \
  -p 8042:8042 \
  -p 19888:19888 \
  harisekhon/hadoop:2.7
```

然后访问 `http://localhost:8088/cluster` 查看 YARN 集群页面。

---

## 相关知识点

### WSL 与 Docker 的关系

- 可以在 WSL2 内直接安装 Docker Engine（本文做法）
- 也可以使用 Docker Desktop，通过 WSL Integration 共享 daemon
- 两种方式不要混用配置，避免搞不清「到底连的是哪个 Docker」

### registry-mirrors 的工作方式

- 配置在 `/etc/docker/daemon.json` 的 `registry-mirrors` 仅对 **docker.io** 生效
- Docker 会依次尝试 mirror；失败时可能 **回退官方源**
- 国内环境下，**显式使用镜像前缀** 往往比依赖 daemon mirror 更稳：

```bash
docker pull docker.1ms.run/namespace/image:tag
docker tag docker.1ms.run/namespace/image:tag namespace/image:tag
```

### 如何快速判断是「网络问题」还是「镜像不存在」

| 现象 | 更可能的原因 |
|------|----------------|
| 所有镜像都超时 | 网络 / mirror 未生效 |
| 只有某个镜像超时，且报错含 `registry-1.docker.io` | tag 错误或 mirror 无缓存，触发回退 |
| `manifest unknown` / `not found` | tag 或镜像名写错 |
| `pull access denied` + 白名单提示 | 该镜像不在 mirror 允许列表 |

---

## 可复用经验

1. **Docker 报错先看权限，再看网络，最后看镜像名/tag**
2. **`sudo` 要密码是正常安全机制**，记好自己的 WSL 用户密码
3. **国内拉镜像：daemon.json + 镜像前缀双保险**
4. **看到 `registry-1.docker.io` 超时不等于 mirror 没配好**，也可能是 tag 不存在导致回退
5. **Hadoop 2.x 与 3.x 端口不同**：2.x NameNode UI 是 `50070`，3.x 才是 `9870`
6. **拉取前先查 tag 是否存在**：[Docker Hub Tags 页](https://hub.docker.com/r/harisekhon/hadoop/tags) 或 `docker pull 镜像前缀/xxx:tag` 试拉

---

## 最终结果

- Ubuntu 22.04（WSL2）运行正常
- Docker Engine 已安装，用户已加入 `docker` 组
- 国内镜像加速已配置
- Hadoop 容器通过 `harisekhon/hadoop:2.7` 成功启动
- HDFS NameNode Web UI 可通过 `http://localhost:50070` 访问
- Overview 显示 **Live Nodes: 1**、**Safemode off**，DataNode 状态 **In Service**
- Web UI 截图已保存至 `img/post-hadoop/` 并写入本文第六部分

---

## 参考链接

- [Docker 官方 Ubuntu 安装文档](https://docs.docker.com/engine/install/ubuntu/)
- [DaoCloud 公共镜像加速](https://github.com/DaoCloud/public-image-mirror)
- [harisekhon/hadoop 镜像说明](https://hub.docker.com/r/harisekhon/hadoop)
- [Docker Hub 国内可用镜像源汇总（持续更新）](https://github.com/dongyubin/DockerHub)
