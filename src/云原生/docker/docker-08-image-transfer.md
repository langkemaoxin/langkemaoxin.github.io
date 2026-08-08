---
title: "Docker 本地镜像载入与载出——离线环境的镜像搬运术"
sidebarGroup: "Docker 系列"
shortTitle: "08 镜像搬运"
order: 8
date: 2026-08-15
category: "云原生"
tag:
  - "Docker"
  - "云原生"
  - "Docker系列"
  - "镜像"
---

> **Docker 系列 · 第 8/18 篇**  
> 上一篇：[《进入 Docker 容器的四种方式》](/云原生/docker/docker-07-enter-container)  
> 下一篇：[《Harbor 私有镜像仓库》](/云原生/docker/docker-09-harbor)

---

## 开头：内网服务器上不了 Docker Hub，怎么办？

你在公司内网部署 Kubernetes 集群，节点**无法访问公网**。应用镜像在 Docker Hub 上，直接 `docker pull` 会超时。

常见解法：

1. 在有网络的机器上 **拉取 → 打包 → 拷贝**
2. 在内网机器上 **载入 → 打 tag → 推送到私有仓库**

这就是 Docker 镜像「载入与载出」要解决的问题。本文梳理两种搬运路径及其差异。

---

## 一、两种搬运思路

| 方式 | 命令 | 载入后镜像 ID |
|------|------|---------------|
| **保存镜像** | `docker save` → `docker load` | 与原镜像 **相同** |
| **保存容器** | `docker export` → `docker import` | 与原镜像 **不同**（新镜像） |

**推荐优先用 `save/load`**：保留镜像层历史、元数据和 tag 信息。`export/import` 会丢失层历史和大部分元数据，只适合快速导出容器文件系统快照。

---

## 二、从 Registry 拉取镜像

默认从 **Docker Hub** 拉取：

```bash
docker image pull <仓库>:<标签>

# 示例
docker image pull rancher/rke-tools:v0.1.52
```

拉取完成后查看：

```bash
docker image ls
```

---

## 三、保存镜像（save）

将镜像（含所有层）导出为 tar 包：

```bash
# 方式一：-o 指定输出文件
docker save <镜像ID> -o /home/mysql.tar

# 方式二：重定向
docker save <镜像ID> > /home/mysql.tar

# 按镜像名保存
docker save docker.io/rancher/rancher-agent -o /home/rancher-agent.tar
docker save f29ece87a195 -o /home/rancher-agent.tar
docker save docker.io/rancher/rke-tools -o /home/rke-tools-v0.1.52.tar
```

`save` 保留：

- 每一层的 UUID 和内容
- 镜像 config 与 manifest
- 原有 tag（若指定完整镜像名）

---

## 四、载入镜像（load）

```bash
docker load -i mysql.tar

# 实际案例
docker load -i /usr/local/rancher-v2.3.5.tar
docker load -i /usr/local/rancher-agent.tar
docker load -i /usr/local/rke-tools-v0.1.52.tar
```

载入过程会逐层解压，终端输出类似：

```
43c67172d1d1: Loading layer [==================================================>]  65.57MB/65.57MB
21ec61b65b20: Loading layer [==================================================>]  991.2kB/991.2kB
...
Loaded image: rancher/rancher:v2.3.5
```

载入后可用 `docker inspect` 核对镜像 ID 是否与源端一致：

```bash
docker inspect f29ece87a1954772accb8a2332ee8c3fe460697e3f102ffbdc76eb9bc4f4f1d0
```

---

## 五、打 tag——让镜像指向私有仓库

载入后若需推送到 Harbor 等私有仓库，必须 **重新打 tag**，使镜像名包含 Registry 地址：

```bash
# 本地命名
docker tag f29ece87a1954772accb8a2332ee8c3fe460697e3f102ffbdc76eb9bc4f4f1d0 \
  rancher/rancher-agent:v2.3.5

# 指向私有仓库 IP
docker tag f29ece87a195 \
  172.18.8.104/rancher/rancher-agent:v2.3.5

docker tag 6e421b8753a2 \
  172.18.8.104/rancher/rke-tools:v0.1.52
```

格式：`[<registry>/]<namespace>/<repo>:<tag>`

---

## 六、删除镜像

```bash
docker rmi <image_name>
docker rmi -f 172.18.8.104/rancher/coredns-coredns:1.6.5
docker rmi -f 172.18.8.104/rancher/coredns-coredns:v3.4.3-rancher1
docker rmi hub.doge.net/ubuntu:latest
```

---

## 七、保存容器（export）与载入（import）

若要从**运行中的容器**导出文件系统（不含层历史）：

```bash
# 导出容器文件系统
docker export <容器ID> -o /home/mysql-export.tar

# 也可对镜像 tag 使用 save（注意：save 针对镜像，export 针对容器）
docker save <镜像tag> -o /home/mysql-export.tar
```

载入为新镜像：

```bash
docker import mysql-export.tar
```

`import` 会创建一个**全新镜像**，丢失：

- 原有 layer 历史
- Dockerfile 构建信息
- 大部分 ENV、ENTRYPOINT 等元数据

---

## 八、典型离线搬运流程

```bash
# === 有网络的机器（跳板机）===
docker pull nginx:latest
docker save nginx:latest -o nginx-latest.tar

# scp 到内网
scp nginx-latest.tar user@内网IP:/tmp/

# === 内网机器 ===
docker load -i /tmp/nginx-latest.tar
docker tag nginx:latest harbor.example.com/demo/nginx:latest
docker push harbor.example.com/demo/nginx:latest
```

---

## 九、save/load 与 export/import 对比

| 维度 | save / load | export / import |
|------|-------------|-----------------|
| 对象 | 镜像（含层） | 容器文件系统快照 |
| 层历史 | ✅ 保留 | ❌ 丢失 |
| 镜像 ID | ✅ 一致 | ❌ 新建 |
| 元数据 | ✅ 较完整 | ❌ 极简 |
| 适用 | 离线分发、备份 | 快速快照、迁移单容器 |

---

## 下篇预告

**第 9 篇：《Harbor 私有镜像仓库》**

- Harbor 安装与 HTTPS 配置
- SAN 证书生成（Go 1.15+ 必需）
- `docker push` 常见 hostname 报错与修复

---

## 思考题

> 为什么 Docker 镜像不适合用 FTP 全量传输，而要用 `save/load` 或 Registry 的分层 push？

提示：镜像由多个 layer 组成，每层有 UUID，Registry 可只传变化的层。

下一篇见 🐳
