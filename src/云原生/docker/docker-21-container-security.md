---
title: 容器安全——Capabilities 降权、Seccomp 与不该用的 --privileged
sidebarGroup: Docker 系列
shortTitle: 21 容器安全
order: 21
date: 2026-08-26T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 容器安全——Capabilities 降权、Seccomp 与不该用的 --privileged
---

> **Docker 系列 · 第 21/23 篇**  
> 上一篇：[《容器日志与监控》](/云原生/docker/docker-20-logging-monitoring/) · 下一篇：[《构建进阶——多阶段构建与 BuildKit》](/云原生/docker/docker-22-build-advanced/)

---

## 开头：一条 `--privileged`，把安全底裤全脱了

你在网上搜某个报错，答案第一条说「加 `--privileged` 就好了」——很多容器就这样带着**全部 root 权限**上了生产。某天镜像里一个被投毒的依赖执行了 `mount`、加载内核模块、读写宿主机磁盘……容器一破，宿主机跟着破。

先把立场立住：**容器是隔离工具，不是安全边界**（[第 3 篇](/云原生/docker/docker-03-container-vs-vm/)讲过它共享内核）。共享内核之上的安全，靠的是一层层「降权」：capabilities 切细、seccomp 拦系统调用、非 root 运行、必要时的更强隔离。本篇在本机（Docker 29.x，WSL2）把每一层都实测一遍——所有 CapEff 值、报错都是真实输出。

---

## 一、Docker 的安全模型：四道防线

官方 [Security 文档](https://docs.docker.com/engine/security/) 把容器安全归为四块：

| 防线 | 管什么 | 本系列对应 |
|------|------|------|
| ① 内核命名空间/cgroups | 视图与资源隔离（隔离的「底座」） | [第 15 篇](/云原生/docker/docker-15-namespace/) / [第 16 篇](/云原生/docker/docker-16-cgroups/) |
| ② **容器配置** | capabilities、seccomp、非 root | **本篇主线** |
| ③ 内核加固特性 | AppArmor/SELinux | 本篇简述 |
| ④ daemon 攻击面 | socket 权限、TLS、rootless | 本篇简述 + [第 23 篇](/云原生/docker/docker-23-daemon-ops/) |

本机 daemon 实际启用了哪些安全机制，`docker info` 直接给出：

```bash
$ docker info | grep -iA3 security
 Security Options:
  seccomp
   Profile: builtin          ← 默认 seccomp 白名单在生效
  cgroupns
```

---

## 二、Capabilities：把 root 拆碎了再按需发放

### 2.1 从 CapEff 看清「容器里的 root 是缩水版」

Linux 把传统 root 的特权拆成了约 40 块 **capability**（如 `CAP_NET_RAW` 收发原始网络包、`CAP_SYS_ADMIN` 挂载文件系统）。容器里 `whoami` 虽然还是 root，但**能拿到的 capability 是 Docker 白名单发放的**。实测对比（`/proc/self/status` 的 `CapEff` 是当前生效集的位图）：

| 运行环境 | CapEff（实测） | 解读 |
|------|------|------|
| 宿主机 root | `000001ffffffffff` | **全量**（约 40 项全开） |
| `--privileged` 容器 | `000001ffffffffff` | **全量**——和宿主机 root 无异！ |
| 普通容器（默认） | `00000000a80425fb` | **只有白名单里的 14 项** |
| `--cap-drop=ALL` 容器 | `0000000000000000` | 一项没有 |

默认那 14 项（官方文档可查）：`CHOWN`、`DAC_OVERRIDE`、`FSETID`、`FOWNER`、`MKNOD`、`NET_RAW`、`SETGID`、`SETUID`、`SETFCAP`、`SETPCAP`、`NET_BIND_SERVICE`、`SYS_CHROOT`、`KILL`、`AUDIT_WRITE`——日常应用够用，**危险的 `SYS_ADMIN`（挂载）、`SYS_MODULE`（内核模块）、`SYS_TIME`（改时钟）都不在**。

### 2.2 实测：drop 掉一项，能力立刻残废

**ping 依赖 `CAP_NET_RAW`**——默认在白名单里，ping 得通：

```bash
$ docker run --rm busybox ping -c1 -W1 127.0.0.1 && echo 'ping OK'
ping OK

$ docker run --rm --cap-drop=NET_RAW busybox ping -c1 -W1 127.0.0.1
ping: permission denied (are you root?)     ← root 也 ping 不了：缺的不是身份，是能力
```

**mount 依赖 `CAP_SYS_ADMIN`**——默认容器里没有，root 也挂不上：

```bash
$ docker run --rm busybox sh -c 'mkdir -p /mnt/t && mount -t tmpfs none /mnt/t'
mount: permission denied (are you root?)

$ docker run --rm --privileged busybox sh -c 'mkdir -p /mnt/t && mount -t tmpfs none /mnt/t && echo mounted'
mount OK: tmpfs mounted                      ← privileged 下 SYS_ADMIN 回来了
```

### 2.3 最佳实践：默认全禁，按需单开

```bash
# 典型 Web 服务：几乎不需要任何特权
docker run -d --cap-drop=ALL --cap-add=NET_BIND_SERVICE nginx   # 只留"绑 80 端口"能力

# Compose 写法（第 18 篇字段表的落地）
services:
  web:
    cap_drop: [ ALL ]
    cap_add: [ NET_BIND_SERVICE ]
```

> 🔑 **最小权限不是「少给 root」，是「先全禁再按需加」**。`--cap-drop=ALL` 起步、缺什么 `--cap-add` 什么——应用跑不起来时加的那一项，就是它真正需要的全部特权。

---

## 三、非 root 运行：身份降权

capability 管「root 能干什么」，非 root 连身份都不给。实测：

```bash
$ docker run --rm --user 1000:1000 busybox id
uid=1000 gid=1000 groups=1000

$ docker run --rm --user 1000:1000 busybox sh -c 'touch /etc/x'
touch: /etc/x: Permission denied            ← 普通用户碰不了系统目录
```

镜像层面用 Dockerfile 的 `USER` 指令固化（[第 10 篇](/云原生/docker/docker-10-dockerfile/)）：

```dockerfile
RUN groupadd -r app -g 1000 && useradd -r -g app -u 1000 app
USER 1000:1000            # 官方最佳实践：非 root + 显式 UID/GID
```

> ⚠️ 注意副作用：非 root 无法绑 1024 以下端口（要么配合 `NET_BIND_SERVICE` cap，要么让应用监听高位端口由外部映射 80）。

---

## 四、Seccomp：系统调用防火墙

Capability 管权限级别，**seccomp 管系统调用白名单**：Docker 默认加载一份内置 profile（上面 `docker info` 里的 `Profile: builtin`），把容器可用的系统调用从 300+ 收敛到约 250 个——直接封掉 `kexec_load`（换内核）、`bpf`（加载 eBPF）、`mount` 等高危调用。这是「容器逃逸难度」的重要一环：即使代码有漏洞，能调用的攻击面也小得多。

```bash
# 查看容器实际生效的 profile
docker inspect <容器> --format '{{.HostConfig.SecurityOpt}}'
# 自定义：--security-opt seccomp=<profile.json>（审计自己的白名单，默认 builtin 几乎不用改）
```

内核加固特性（AppArmor/SELinux）在同一维度再叠一层发行版策略，WSL 内核未启用 AppArmor（所以 `docker info` 里没列）——生产 Ubuntu/RHEL 建议开启，见官方 [AppArmor profiles](https://docs.docker.com/engine/security/apparmor/)。

---

## 五、--privileged：知道它给了什么，才知道为什么不能用

第二节实测已经说明一切：`--privileged` = **全量 capability + 全部设备访问 + 关闭 seccomp 部分保护 + 可挂载宿主机文件系统**。它等于告诉内核「这个容器就是宿主机 root」。

正确姿势是**精确替代**：

| 你想用 `--privileged` 干的事 | 精确做法 |
|------|------|
| 访问某个设备（GPU、串口） | `--device /dev/ttyUSB0` |
| 需要挂载能力 | `--cap-add SYS_ADMIN`（并想清楚为什么） |
| 绑低端口 | `--cap-add NET_BIND_SERVICE` |
| 改网络栈 | `--cap-add NET_ADMIN` |
| 在 CI 里跑 Docker | 挂载 socket + 使用 rootless/ sibling 容器方案 |

确实需要 privileged 的场景（DinD、某些硬件调试）应当**隔离到专用节点/虚拟机**里跑，别和业务混部。

---

## 六、更深的隔离：userns 重映射与 Rootless 模式

两个进阶方向，生产遇到「容器内 root 也不能等于宿主机 root」的需求时启用：

- **User Namespace 重映射**（`userns-remap`）：daemon 配置后，容器里的 root 实际是宿主机上的一个高位 UID（如 165536:165536）——容器攻破后拿到的「root」在宿主机上连普通文件都读不了。LXC/ Podman 用户已经很熟这个模型。
- **Rootless 模式**：整个 dockerd 都跑在普通用户下（配合 systemd 用户服务），daemon 本身被攻破也没有 root 权限。官方有专门文档：[Rootless mode](https://docs.docker.com/engine/security/rootless/)。

daemon 侧的攻击面（socket 权限、`DOCKER_HOST`、TLS）在[第 23 篇 daemon 运维](/云原生/docker/docker-23-daemon-ops/)展开。

---

## 七、镜像供应链安全：跑之前的最后一关

容器安全的另一半在**镜像本身**：

- **可信来源**：优先 Docker Official Images / Verified Publisher；`docker pull` 看清来源，别拉来路不明的镜像。
- **签名验证**：Content Trust（`DOCKER_CONTENT_TRUST=1`）只拉签名镜像，生产可配 daemon 强制校验。
- **漏洞扫描**：`docker scout`（官方）或 Trivy 对镜像做 CVE 扫描并纳入 CI；Harbor 内置 Trivy（[第 9 篇](/云原生/docker/docker-09-harbor/)提过的漏洞扫描能力就是它）。
- **SBOM/来源证明**：构建时生成软件物料清单与 provenance 证明（[第 22 篇](/云原生/docker/docker-22-build-advanced/)实测 buildx 的 attestation）。

---

## 安全自检清单

| 检查项 | 命令/做法 | 本篇实测证据 |
|------|------|------|
| 特权收敛 | `--cap-drop=ALL` 起步按需加 | CapEff `a80425fb` → `0` |
| 非 root 运行 | `--user` / Dockerfile `USER` | `uid=1000`，写 `/etc` 被拒 |
| seccomp 默认在 | `docker info` Security Options | `Profile: builtin` |
| 不用 privileged | 用 `--device`/精确 cap-add 替代 | privileged = 宿主机全量 cap |
| 镜像可信 + 扫描 | Official/VP 镜像 + scout/Trivy | — |
| daemon socket 保护 | 不随意 `-v /var/run/docker.sock` 进容器 | 第 23 篇展开 |

---

## 小结

- 容器安全 = 一层层降权：**capabilities 白名单（默认 14 项）→ seccomp 系统调用过滤 → 非 root 用户 → 内核加固 → rootless**。
- 实测三连：默认容器 CapEff=`a80425fb`（无 SYS_ADMIN，mount 被拒）；`--cap-drop=NET_RAW` 后 root 也 ping 不通；`--privileged` = `000001ffffffffff` 与宿主机 root 等权——**精确替代，别脱光**。
- 非 root：`--user 1000:1000` 或 Dockerfile `USER`，注意低端口与 `NET_BIND_SERVICE` 的配合。
- 镜像侧：可信来源、签名、扫描、SBOM，构建进阶篇接续。

**思考题**：为什么 `--cap-drop=ALL` 之后连 `ping` 都不行，但 Web 服务（nginx）却基本不受影响？（提示：nginx 需要的 capability 清单和默认 14 项的白名单差在哪。）

下一篇：[《构建进阶——多阶段构建与 BuildKit》](/云原生/docker/docker-22-build-advanced/)。

---

## 参考资料

- [Docker Docs · Security](https://docs.docker.com/engine/security/) — 官方安全模型总览
- [Capabilities](https://docs.docker.com/engine/security/#linux-kernel-capabilities) / [Seccomp profiles](https://docs.docker.com/engine/security/seccomp/) / [Rootless mode](https://docs.docker.com/engine/security/rootless/)
- [Dockerfile Best Practices · USER](https://docs.docker.com/build/building/best-practices/) — 非 root 最佳实践
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.x
