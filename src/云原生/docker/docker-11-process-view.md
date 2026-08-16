---
title: 进程视角看容器——PID 命名空间与宿主机对照
sidebarGroup: Docker 系列
shortTitle: 11 进程视角看容器
order: 11
date: 2026-08-18T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - PID Namespace
  - cgroup
  - proc
description: 进程视角看容器——PID 命名空间与宿主机对照
---

> **Docker 系列 · 第 11/18 篇**  
> 上一篇：[《Dockerfile 自制镜像》](/云原生/docker/docker-10-dockerfile)  
> 下一篇：[《Docker Daemon 与 runtime》](/云原生/docker/docker-12-daemon-runtime)

---

## 开头：容器里 PID 是 1，宿主机上是几号？

你在容器内 `ps -ef` 看到 nginx 的 PID 是 1，以为它是「系统第一个进程」。但在宿主机上 `docker top` 一看，同一个 nginx 却是 PID 9955。

**容器不是虚拟机**——它只是宿主机上的普通进程，套了一层 PID 命名空间。本文从 Linux `/proc` 文件系统出发，完整 walkthrough 容器进程在宿主机上的真实身份、cgroup 路径，以及 `docker exec` 与 PID 1 的关系。

---

## 一、Linux /proc 与进程信息

每个进程在 `/proc/<pid>/` 下有完整信息目录：

```bash
ls -l /proc/27880
```

| 文件/目录 | 含义 |
|-----------|------|
| `cmdline` | 启动命令 |
| `cwd` | 当前工作目录（符号链接） |
| `environ` | 环境变量 |
| `exe` | 可执行文件路径（符号链接） |
| `fd` | 文件描述符 |
| `maps` | 内存映射 |
| `root` | 根目录 |
| `stat` / `status` | 进程状态 |
| `ns` | 命名空间 inode（关键！） |

通过 `exe` 可定位进程对应的二进制：

```bash
ls -l /proc/27880/exe
# exe -> /usr/sbin/sshd
```

---

## 二、PID 命名空间（Namespace）

Docker 进程管理的基础是 Linux **PID Namespace**：

- 不同 PID 命名空间中，进程 ID **相互独立**
- 两个不同命名空间可以有相同 PID 数字
- 每个 Container 默认拥有**独立 PID 命名空间**
- 容器进程**本质上仍运行在宿主机**，只是看到的 PID 编号不同

> 容器内 PID 1 ≠ 宿主机 PID 1。容器内 PID 1 是「容器视角的第一个进程」，在宿主机上通常是几千、几万的普通 PID。

---

## 三、找出容器 ID 与 inspect

```bash
docker ps
```

示例：

```
CONTAINER ID   IMAGE                          COMMAND                  PORTS                    NAMES
460d68823930   lemonbar/centos6-ssh:latest    "/bin/sh -c '/usr/sb…"   0.0.0.0:6021->22/tcp     centos6-2
```

查看详细信息：

```bash
docker inspect 460d68823930
```

关键字段：

```json
"State": {
  "Pid": 4962,
  "Status": "running"
},
"GraphDriver": {
  "Data": {
    "MergedDir": "/var/lib/docker/overlay2/.../merged"
  }
},
"NetworkSettings": {
  "SandboxKey": "/var/run/docker/netns/ea66261fb6d8",
  "IPAddress": "172.17.0.6"
}
```

**`State.Pid`** = 容器内 init 进程在**宿主机**上的 PID（本例 4962）。

快捷命令：

```bash
docker inspect -f '{{.State.Pid}}' centos6-2
# 4962
```

---

## 四、进入 cgroup 目录

每个容器在 cgroup 中有独立目录，路径含完整容器 ID：

```bash
cd /sys/fs/cgroup/memory/docker/460d688239304172f39bb9586bfc5959e0c3db64e7c3a0937f1003f94408ebbd/
ls -l
```

常见文件：

| 文件 | 含义 |
|------|------|
| `cgroup.procs` | 属于该 cgroup 的进程 PID 列表 |
| `tasks` | 同 cgroup.procs（兼容旧接口） |
| `memory.usage_in_bytes` | 内存使用量 |
| `memory.limit_in_bytes` | 内存限制 |

PIDs cgroup 路径：

```bash
cd /sys/fs/cgroup/pids/docker/460d688239304172f39bb9586bfc5959e0c3db64e7c3a0937f1003f94408ebbd/
cat cgroup.procs
# 4962
cat pids.max
# max
```

---

## 五、docker top：宿主机视角看容器进程

```bash
docker top centos6-2
```

输出：

```
UID    PID    PPID   C   STIME   TTY   TIME       CMD
root   4962   4948   0   16:24   pts/0 00:00:00   /usr/sbin/sshd -D
```

对照容器内：

```bash
docker exec centos6-2 ps -ef
```

```
UID   PID  PPID  CMD
root    1     0  /usr/sbin/sshd -D
```

| 视角 | sshd PID | PPID |
|------|----------|------|
| 容器内 | 1 | 0 |
| 宿主机 | 4962 | 4948（containerd-shim） |

---

## 六、实验：docker exec 启动 sleep 进程

### 6.1 在容器内启动后台 sleep

```bash
docker exec -d centos6-2 sleep 2000
```

### 6.2 容器内查看

```bash
docker exec centos6-2 ps -ef
```

```
UID   PID  PPID  CMD
root    1     0  /usr/sbin/sshd -D
root    6     0  sleep 2000
root   10     0  ps -ef
```

容器内 sleep 的 PID 是 6，PPID 显示 0（PID 命名空间隔离效果）。

### 6.3 宿主机查看

```bash
docker top centos6-2
```

```
UID    PID     PPID   CMD
root   4962    4948   /usr/sbin/sshd -D
root   11539   4948   sleep 2000
```

**关键发现**：

- sleep 属于 centos6-2 的 **PID 命名空间**（容器内 PID 6）
- 但在宿主机上是 PID 11539
- **PPPID 是 4948（containerd-shim）**，不是容器内 PID 1

### 6.4 cgroup 验证

```bash
cat /sys/fs/cgroup/pids/docker/460d68823930.../cgroup.procs
# 4962
# 11539
```

两个 PID 都在同一容器的 cgroup 中。

### 6.5 进程树

```bash
docker exec centos6-2 pstree -p
# sshd(1)

docker exec centos6-2 ps -auxf
```

容器内看不到 shim 父进程——命名空间隔离。

---

## 七、dockerd 与进程父子关系

`docker run` 时，Docker 为每个容器启动 **containerd-shim-runc-v2**：

```bash
ps -ef | grep containerd-shim
```

```
root  3401  1  0 12:06 ?  00:00:00 /usr/bin/containerd-shim-runc-v2 \
  -namespace moby -id e9eaef999da9... -address /run/containerd/containerd.sock
root  3473  3401 0 12:06 ?  00:00:00 sh mqbroker -c /opt/rocketmq.../broker.conf
```

- shim 跑在特定 **namespace** 和 **cgroup** 下
- 容器内应用进程（3473）的父进程是 shim（3401）
- shim 以为自己在一台独立机器上

### docker exec 的特殊性

`docker exec` 可以进入容器 PID 命名空间启动进程，但：

- 新进程属于容器的 namespace 和 cgroup ✅
- **父进程是 Docker Daemon / containerd**，而非容器 PID 1 ⚠️

Redis 容器示例：

```bash
docker exec -d redis sleep 2000
docker exec redis ps -ef
# redis  1  0  redis-server *:6379
# root  11  0  sleep 2000

docker top redis
# redis  9955  1264  redis-server *:6379
# root   9984  1264  sleep 2000
```

sleep 的宿主机 PPID 是 1264（shim），不是 9955（redis-server）。

### 杀掉 PID 1 会怎样？

```bash
PID=$(docker inspect -f '{{.State.Pid}}' redis)
sudo kill $PID
docker ps -a
# redis 容器 Status: Exited
```

**容器生命周期 = PID 1 生命周期**。PID 1 退出，命名空间内所有进程随之退出。

---

## 八、Docker 文件目录结构

Docker 默认数据目录：`/var/lib/docker/`

```
/var/lib/docker/
├── containers/    # 每个容器的 config、日志、hosts 等
├── image/         # 镜像层与元数据
├── network/       # 网络配置
├── overlay2/      # 存储驱动（层文件）
├── volumes/       # 数据卷
├── tmp/
└── trust/
```

单个容器目录：

```
/var/lib/docker/containers/<完整容器ID>/
├── config.v2.json
├── hostname
├── hosts
├── resolv.conf
└── <容器ID>-json.log
```

### 在容器内看 /proc

```bash
docker exec centos6-2 ls /proc
```

容器内 `/proc` 只显示**本 PID 命名空间**可见的进程——通常只有容器内进程 + 内核线程，看不到宿主机其他进程。

---

## 九、三个实用命令总结

```bash
docker top <容器名>              # 宿主机视角：容器进程 PID 映射
docker inspect -f '{{.State.Pid}}' <容器>   # 容器 init 进程宿主机 PID
ps -ef | grep <shim_pid>         # 查看 shim 父进程链
```

完整排障链：

```bash
# 1. 容器内
docker exec myapp ps -ef

# 2. 宿主机对照
docker top myapp

# 3. 宿主机 PID → 命名空间
ls -l /proc/<宿主机PID>/ns/

# 4. cgroup 归属
cat /sys/fs/cgroup/pids/docker/<容器完整ID>/cgroup.procs
```

---

## 十、核心结论

| 概念 | 说明 |
|------|------|
| 容器 = 进程组 | 不是 VM，是带 namespace/cgroup 的进程 |
| PID 1 | 容器内 init；宿主机上是普通 PID |
| 生命周期 | 与 PID 1 绑定；kill PID 1 → 容器退出 |
| docker exec | 进入 namespace 启动进程；父进程是 shim/daemon |
| cgroup | `/sys/fs/cgroup/*/docker/<容器ID>/` 可审计资源与进程 |

---

## 下篇预告

**第 12 篇：《Docker Daemon 与 runtime》**

- dockerd → containerd → containerd-shim → runc 调用链
- OCI image-spec / runtime-spec 与 CRI

---

## 思考题

> 为什么 containerd-shim 要让 runc 启动容器后立即退出，而不是一直驻留？

提示：这样 dockerd/containerd 升级或重启时，已运行容器不会中断。

下一篇见 🐳
