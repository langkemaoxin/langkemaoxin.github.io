---
title: 容器安全——同一个容器，从 --privileged 全裸滚到最小权限
sidebarGroup: Docker 系列
shortTitle: 25 容器安全
order: 25
date: 2026-08-26T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 从一条 --privileged 全裸实测起步，每一球收紧一层：默认 14 项能力、cap_drop 摘能力、非 root 身份、seccomp 白名单，像堆雪球一样学会容器降权。
---

> **Docker 系列 · 第 25/33 篇**
> 上一篇：[《进程视角看容器——从两边 ps 对不上号，滚到亲手杀掉 PID 1》](/云原生/docker/docker-24-process-view) · 下一篇：[《Rootless 模式——不给 root 也能跑 Docker》](/云原生/docker/docker-26-rootless)

---

## 开头：一条 `--privileged`，把安全底裤全脱了

你在网上搜某个报错，答案第一条说「加 `--privileged` 就好了」——很多容器就这样带着**全部 root 权限**上了生产。某天镜像里一个被投毒的依赖执行了 `mount`、加载内核模块、读写宿主机磁盘……容器一破，宿主机跟着破。

先把立场立住：**容器是隔离工具，不是安全边界**（[第 2 篇](/云原生/docker/docker-02-container-vs-vm/)讲过它共享内核）。共享内核之上的安全，靠的是一层层「降权」：capabilities 切细、seccomp 拦系统调用、非 root 运行、必要时的更强隔离。

本篇不先背概念。实验对象从头到尾是**同一类容器**——`docker run --rm busybox …` 这条命令一路加参数，从「全裸」一球球收紧到「最小权限」：

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 安全模型的地图 | `docker info` 里看到 seccomp `Profile: builtin` |
| **2** | 一个 `--privileged` 全裸容器 | CapEff 全量，和宿主机 root 一模一样；mount 能挂 |
| **3** | 摘掉 `--privileged`（默认容器） | CapEff 只剩 14 项；root 也 mount 不上 |
| **4** | `--cap-drop=NET_RAW` 摘一项 | root 也 ping 不通 |
| **5** | `--cap-drop=ALL` 全禁再按需加 | CapEff 归零；nginx 只领一项就能跑 |
| **6** | `--user 1000:1000` 降身份 | `id` 变普通用户，写 `/etc` 被拒 |
| **7** | seccomp 白名单 | 300+ 系统调用收敛到约 250 个 |
| **8** 🧗 | AppArmor/SELinux 视角 | WSL 内核没启用 AppArmor，`docker info` 里没列 |
| **9** | `--privileged` 的精确替代 | 想干的每件事都有专用参数 |
| **10** 🧗 | userns 重映射 / Rootless | 容器里的 root 只是宿主机高位 UID |
| **11** | 镜像供应链 | scout/Trivy 扫 CVE、SBOM 溯源 |

所有 CapEff 位图、报错都是本机真实输出：WSL2 Ubuntu-22.04 + Docker 29.1.3。官方入口：[Docker Engine Security](https://docs.docker.com/engine/security/)。

---

## 雪球 1：先看清本机开了哪些防线

动手之前先知道战场长什么样。官方 [Security 文档](https://docs.docker.com/engine/security/) 把容器安全归为四块：

| 防线 | 管什么 | 本系列对应 |
|------|------|------|
| ① 内核命名空间/cgroups | 视图与资源隔离（隔离的「底座」） | [第 20 篇](/云原生/docker/docker-20-namespace/) / [第 21 篇](/云原生/docker/docker-21-cgroups/) |
| ② **容器配置** | capabilities、seccomp、非 root | **本篇主线** |
| ③ 内核加固特性 | AppArmor/SELinux | 本篇简述 |
| ④ daemon 攻击面 | socket 权限、TLS、rootless | 本篇简述 + [第 28 篇](/云原生/docker/docker-28-daemon-ops/) |

第 ① 道前面几篇已经拆完了，第 ④ 道留给第 28 篇。本篇主线是第 ② 道「容器配置」——同一容器一路降权。本机 daemon 实际启用了哪些安全机制，`docker info` 直接给出：

```bash
docker info | grep -iA3 security
```

```text
 Security Options:
  seccomp
   Profile: builtin          ← 默认 seccomp 白名单在生效
  cgroupns
```

两行信息：`seccomp` + `Profile: builtin` 说明默认的系统调用白名单已经挂上了（雪球 7 展开）；`cgroupns` 是 cgroup 命名空间（[第 21 篇](/云原生/docker/docker-21-cgroups/)）。注意这里**没列 `apparmor`**——WSL 内核没启用它，雪球 8 再说。防线清点完毕，下一球把最危险的那种容器跑起来。

---

## 雪球 2：全裸起步——`--privileged` 的 CapEff 和宿主机 root 一模一样

要看清 `--privileged` 给了什么，得先有个「尺子」。Linux 把传统 root 的特权拆成了约 40 块 **capability**（如 `CAP_NET_RAW` 收发原始网络包、`CAP_SYS_ADMIN` 挂载文件系统）。容器里 `whoami` 虽然还是 root，但**能拿到的 capability 是 Docker 白名单发放的**。发放结果就写在 `/proc/self/status` 的 `CapEff` 里——当前生效集的位图。

先量宿主机（WSL 的 Ubuntu，默认用户加 `sudo`）：

```bash
sudo grep CapEff /proc/self/status
```

```text
CapEff:	000001ffffffffff
```

位图里全是 1：宿主机 root 的**全量**能力（约 40 项全开）。再看全裸容器：

```bash
docker run --rm --privileged busybox grep Cap /proc/self/status
```

```text
CapInh:	0000000000000000
CapPrm:	000001ffffffffff
CapEff:	000001ffffffffff
CapBnd:	000001ffffffffff
CapAmb:	0000000000000000
```

五行逐个看：`CapInh`（继承集）、`CapAmb`（环境集）是空；`CapPrm`（许可集）、`CapEff`（生效集）、`CapBnd`（边界集——再怎么 `cap-add` 也够不着的天花板）全是 `000001ffffffffff`——和宿主机 root **一字不差**，连上限都被打开了。眼见为实，拿它干一件普通容器干不了的事：

```bash
docker run --rm --privileged busybox sh -c 'mkdir -p /mnt/t && mount -t tmpfs none /mnt/t && echo "mount OK: tmpfs mounted"'
```

```text
mount OK: tmpfs mounted                      ← privileged 下 SYS_ADMIN 回来了
```

挂载文件系统依赖 `CAP_SYS_ADMIN`，全裸容器里它回来了——tmpfs 说挂就挂。这就是很多生产容器的真实起点：**`--privileged` 的容器，就是宿主机 root 本尊**。从下一球开始，一球拆一层。

---

## 雪球 3：摘掉 `--privileged`——默认容器只领 14 项白名单

同一条命令，只去掉 `--privileged`：

```bash
docker run --rm busybox grep Cap /proc/self/status
```

```text
CapInh:	0000000000000000
CapPrm:	00000000a80425fb
CapEff:	00000000a80425fb
CapBnd:	00000000a80425fb
CapAmb:	0000000000000000
```

这次 `CapPrm` = `CapEff` = `CapBnd` = `00000000a80425fb`：发放的、生效的、够得着的上限，都是同一份白名单。位图里数一数 1 的个数——**14 项**。对照雪球 2：

| 运行环境 | CapEff（实测） | 解读 |
|------|------|------|
| 宿主机 root | `000001ffffffffff` | **全量**（约 40 项全开） |
| `--privileged` 容器 | `000001ffffffffff` | **全量**——和宿主机 root 无异！ |
| 普通容器（默认） | `00000000a80425fb` | **只有白名单里的 14 项** |

默认那 14 项（官方文档可查）：`CHOWN`、`DAC_OVERRIDE`、`FSETID`、`FOWNER`、`MKNOD`、`NET_RAW`、`SETGID`、`SETUID`、`SETFCAP`、`SETPCAP`、`NET_BIND_SERVICE`、`SYS_CHROOT`、`KILL`、`AUDIT_WRITE`——日常应用够用，**危险的 `SYS_ADMIN`（挂载）、`SYS_MODULE`（内核模块）、`SYS_TIME`（改时钟）都不在**。

白名单是「名单里没有就不给」，root 身份救不了你。雪球 2 那条 mount 原样再来一遍：

```bash
docker run --rm busybox sh -c 'mkdir -p /mnt/t && mount -t tmpfs none /mnt/t'
```

```text
mount: permission denied (are you root?)
```

报错在问「你是 root 吗」——是 root 也没用：缺的是 `CAP_SYS_ADMIN` 这块**能力**，不是身份。这就是 capability 的核心：能力和身份是两套账。

---

## 雪球 4：单摘一项 `--cap-drop=NET_RAW`——root 也 ping 不通

雪球 3 是「Docker 替你定的白名单」，这一球自己动手摘。`NET_RAW` 在默认白名单里，所以默认容器 ping 得通：

```bash
docker run --rm busybox ping -c1 -W1 127.0.0.1 && echo 'ping OK'
```

```text
ping OK
```

只摘这一项，别的都不动：

```bash
docker run --rm --cap-drop=NET_RAW busybox ping -c1 -W1 127.0.0.1
```

```text
ping: permission denied (are you root?)     ← root 也 ping 不了：缺的不是身份，是能力
```

报错和雪球 3 的 mount 一模一样。ping 要发 ICMP 原始包，靠 `CAP_NET_RAW`；摘掉它，root 也只是个「没有这块能力的 root」。能摘一项，就能摘光——下一球直接全禁。

---

## 雪球 5：`--cap-drop=ALL` 全禁起步，缺什么加什么

最狠的一步，把白名单整个倒掉：

```bash
docker run --rm --cap-drop=ALL busybox grep CapEff /proc/self/status
```

```text
CapEff:	0000000000000000
```

一项没有。从雪球 2 到这一球，四行对照表收官：

| 运行环境 | CapEff（实测） | 解读 |
|------|------|------|
| 宿主机 root | `000001ffffffffff` | **全量**（约 40 项全开） |
| `--privileged` 容器 | `000001ffffffffff` | **全量**——和宿主机 root 无异！ |
| 普通容器（默认） | `00000000a80425fb` | **只有白名单里的 14 项** |
| `--cap-drop=ALL` 容器 | `0000000000000000` | 一项没有 |

全禁之后按需发——典型 Web 服务几乎不需要任何特权：

```bash
# 典型 Web 服务：几乎不需要任何特权
docker run -d --cap-drop=ALL --cap-add=NET_BIND_SERVICE nginx   # 只留"绑 80 端口"能力
```

Compose 写法（[第 16 篇](/云原生/docker/docker-16-compose)字段表的落地）：

```yaml
services:
  web:
    cap_drop: [ ALL ]
    cap_add: [ NET_BIND_SERVICE ]
```

> 🔑 **最小权限不是「少给 root」，是「先全禁再按需加」**。`--cap-drop=ALL` 起步、缺什么 `--cap-add` 什么——应用跑不起来时加的那一项，就是它真正需要的全部特权。

---

## 雪球 6：`--user 1000:1000`——连 root 身份都不给

capability 管「root 能干什么」，非 root 连身份都不给。实测：

```bash
docker run --rm --user 1000:1000 busybox id
```

```text
uid=1000 gid=1000 groups=1000
```

```bash
docker run --rm --user 1000:1000 busybox sh -c 'touch /etc/x'
```

```text
touch: /etc/x: Permission denied            ← 普通用户碰不了系统目录
```

这次连位图都不用看——普通用户的**身份**先把你挡在 `/etc` 外面。两层降权叠上了：能力归能力（雪球 5），身份归身份（这一球）。

镜像层面用 Dockerfile 的 `USER` 指令固化（[第 9 篇](/云原生/docker/docker-09-dockerfile/)）：

```dockerfile
RUN groupadd -r app -g 1000 && useradd -r -g app -u 1000 app
USER 1000:1000            # 官方最佳实践：非 root + 显式 UID/GID
```

> ⚠️ 注意副作用：非 root 无法绑 1024 以下端口（要么配合 `NET_BIND_SERVICE` cap，要么让应用监听高位端口由外部映射 80）。

---

## 雪球 7：seccomp——系统调用防火墙

Capability 管权限级别，**seccomp 管系统调用白名单**：Docker 默认加载一份内置 profile（雪球 1 里的 `Profile: builtin`），把容器可用的系统调用从 300+ 收敛到约 250 个——直接封掉 `kexec_load`（换内核）、`bpf`（加载 eBPF）、`mount` 等高危调用。这是「容器逃逸难度」的重要一环：即使代码有漏洞，能调用的攻击面也小得多。

```bash
# 查看容器实际生效的 profile
docker inspect <容器> --format '{{.HostConfig.SecurityOpt}}'
# 自定义：--security-opt seccomp=<profile.json>（审计自己的白名单，默认 builtin 几乎不用改）
```

`builtin` 是 daemon 内置的默认档，不会写进容器配置；上面这条命令更多用来确认「有没有被人用 `--security-opt` 显式改过」。真要审计自己的白名单时，才用 `--security-opt seccomp=<profile.json>` 覆盖——日常几乎不用动默认档。

---

## 雪球 8 🧗：AppArmor / SELinux——同一维度再叠一层

内核加固特性（AppArmor/SELinux）在 seccomp 同一维度再叠一层**发行版策略**：seccomp 管「哪些系统调用」，它们管「哪个进程能访问哪个文件/能力」，粒度互补。WSL 内核未启用 AppArmor——所以雪球 1 的 `docker info` 里没列它。生产 Ubuntu/RHEL 建议开启，见官方 [AppArmor profiles](https://docs.docker.com/engine/security/apparmor/)。

---

## 雪球 9：把 `--privileged` 干的每件事换成专用参数

雪球 2 实测已经说明一切：`--privileged` = **全量 capability + 全部设备访问 + 关闭 seccomp 部分保护 + 可挂载宿主机文件系统**。它等于告诉内核「这个容器就是宿主机 root」。正确姿势是**精确替代**：

| 你想用 `--privileged` 干的事 | 精确做法 |
|------|------|
| 访问某个设备（GPU、串口） | `--device /dev/ttyUSB0` |
| 需要挂载能力 | `--cap-add SYS_ADMIN`（并想清楚为什么） |
| 绑低端口 | `--cap-add NET_BIND_SERVICE` |
| 改网络栈 | `--cap-add NET_ADMIN` |
| 在 CI 里跑 Docker | 挂载 socket + 使用 rootless/ sibling 容器方案 |

确实需要 privileged 的场景（DinD、某些硬件调试）应当**隔离到专用节点/虚拟机**里跑，别和业务混部。

---

## 雪球 10 🧗：更深的隔离——userns 重映射与 Rootless

两个进阶方向，生产遇到「容器内 root 也不能等于宿主机 root」的需求时启用：

- **User Namespace 重映射**（`userns-remap`）：daemon 配置后，容器里的 root 实际是宿主机上的一个高位 UID（如 165536:165536）——容器攻破后拿到的「root」在宿主机上连普通文件都读不了。LXC/ Podman 用户已经很熟这个模型。
- **Rootless 模式**：整个 dockerd 都跑在普通用户下（配合 systemd 用户服务），daemon 本身被攻破也没有 root 权限。官方有专门文档：[Rootless mode](https://docs.docker.com/engine/security/rootless/)。

daemon 侧的攻击面（socket 权限、`DOCKER_HOST`、TLS）在[第 28 篇 daemon 运维](/云原生/docker/docker-28-daemon-ops/)展开。

---

## 雪球 11：跑之前的最后一关——镜像供应链

容器安全的另一半在**镜像本身**——前面十球都在管「跑起来之后」，这一球管「跑之前」：

- **可信来源**：优先 Docker Official Images / Verified Publisher；`docker pull` 看清来源，别拉来路不明的镜像。
- **签名验证**：Content Trust（`DOCKER_CONTENT_TRUST=1`）只拉签名镜像，生产可配 daemon 强制校验。
- **漏洞扫描**：`docker scout`（官方）或 Trivy 对镜像做 CVE 扫描并纳入 CI；Harbor 内置 Trivy（[第 12 篇](/云原生/docker/docker-12-harbor/)提过的漏洞扫描能力就是它）。
- **SBOM/来源证明**：构建时生成软件物料清单与 provenance 证明（[第 10 篇](/云原生/docker/docker-10-build-advanced/)实测 buildx 的 attestation）。

---

## 怎么记：论点落在哪一球

按滚雪球的顺序记：

| 命令 / 论点 | 在哪一球用过 |
|------|------|
| `docker info`（Security Options） | 1（seccomp 细看在 7、AppArmor 缺席在 8） |
| `grep CapEff /proc/self/status` | 2、3、5 |
| `--privileged` | 2（给了什么）、9（怎么替掉） |
| `--cap-drop=NET_RAW` | 4 |
| `--cap-drop=ALL` / `--cap-add=…` | 5 |
| `--user 1000:1000` / Dockerfile `USER` | 6 |
| `docker inspect … SecurityOpt` / `--security-opt seccomp=…` | 7 |
| AppArmor / SELinux | 8 |
| `--device`、`NET_ADMIN` 等 | 9 |
| userns-remap / rootless | 10 |
| Content Trust / scout / SBOM | 11 |

再对照一遍安全自检清单，每条都能指出实测证据：

| 检查项 | 命令/做法 | 本篇实测证据 |
|------|------|------|
| 特权收敛 | `--cap-drop=ALL` 起步按需加 | 雪球 3→5：CapEff `a80425fb` → `0` |
| 非 root 运行 | `--user` / Dockerfile `USER` | 雪球 6：`uid=1000`，写 `/etc` 被拒 |
| seccomp 默认在 | `docker info` Security Options | 雪球 1：`Profile: builtin` |
| 不用 privileged | 用 `--device`/精确 cap-add 替代 | 雪球 2/9：privileged = 宿主机全量 cap |
| 镜像可信 + 扫描 | Official/VP 镜像 + scout/Trivy | 雪球 11 |
| daemon socket 保护 | 不随意 `-v /var/run/docker.sock` 进容器 | 第 28 篇展开 |

---

## 历史包袱

- **「加 `--privileged` 就好了」本身就是历史包袱**。它是为 Docker-in-Docker、硬件调试准备的大开关，被早期博客互相抄成了万能报错修复。雪球 2 已经量过它的 CapEff——这句话今天还在把全裸容器送上生产。
- **Rootless 曾长期标「实验性」**，老教程会劝你别上生产。它从 Docker 20.10（2020-12）起 GA 转正，现在（本机 29.1.3）是官方推荐的生产加固方向，别再按旧文档把它排除在外。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|------|----------------------|
| [第 2 篇](/云原生/docker/docker-02-container-vs-vm/) 容器 vs VM | 开头：共享内核，容器不是安全边界 |
| [第 20 篇](/云原生/docker/docker-20-namespace/) / [第 21 篇](/云原生/docker/docker-21-cgroups/) | 雪球 1：第 ① 道防线（命名空间/cgroups） |
| [第 16 篇](/云原生/docker/docker-16-compose) Compose | 雪球 5：`cap_drop` / `cap_add` 的 YAML 写法 |
| [第 9 篇](/云原生/docker/docker-09-dockerfile/) Dockerfile | 雪球 6：`USER` 固化非 root |
| [第 12 篇](/云原生/docker/docker-12-harbor/) Harbor | 雪球 11：内置 Trivy 扫描 |
| [第 10 篇](/云原生/docker/docker-10-build-advanced/) 构建进阶 | 雪球 11：SBOM/provenance；也是下一篇 |
| [第 28 篇](/云原生/docker/docker-28-daemon-ops/) daemon 运维 | 雪球 1/10：第 ④ 道防线（socket/TLS/rootless） |

---

## 小结

从一条 `--privileged` 全裸命令开始，一球收紧一层：

1. **防线地图**：四道防线，本机已开 seccomp `Profile: builtin`。  
2. **全裸容器**：CapEff `000001ffffffffff`，和宿主机 root 无异；mount 说挂就挂。  
3. **默认容器**：只领 14 项白名单；`SYS_ADMIN` 不在，root 也 mount 被拒。  
4. **摘一项**：`--cap-drop=NET_RAW` 后 root 也 ping 不通——缺的是能力，不是身份。  
5. **全禁再按需加**：CapEff 归零起步；nginx 只领 `NET_BIND_SERVICE`。  
6. **降身份**：`--user 1000:1000` / Dockerfile `USER`，注意低端口与 `NET_BIND_SERVICE` 的配合。  
7. **seccomp**：系统调用从 300+ 收敛到约 250，封 `kexec_load`/`bpf`/`mount`。  
8. **AppArmor/SELinux**：发行版再叠一层；WSL 未启用。  
9. **精确替代**：`--device` / 单项 `--cap-add`；DinD 隔离到专用节点。  
10. **更深隔离**：userns 重映射、rootless——容器 root ≠ 宿主机 root。  
11. **镜像供应链**：可信来源、签名、扫描、SBOM，跑之前的最后一关。

**思考题**：为什么 `--cap-drop=ALL` 之后连 `ping` 都不行，但 Web 服务（nginx）却基本不受影响？（提示：nginx 需要的 capability 清单和默认 14 项的白名单差在哪。）

下一篇：[《构建进阶——同一个镜像从 1.44GB 滚到 20MB》](/云原生/docker/docker-10-build-advanced/)。

---

## 参考资料

- [Docker Docs · Security](https://docs.docker.com/engine/security/) — 官方安全模型总览
- [Capabilities](https://docs.docker.com/engine/security/#linux-kernel-capabilities) / [Seccomp profiles](https://docs.docker.com/engine/security/seccomp/) / [AppArmor profiles](https://docs.docker.com/engine/security/apparmor/) / [Rootless mode](https://docs.docker.com/engine/security/rootless/)
- [Runtime privilege and Linux capabilities](https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities) — `--cap-add` / `--cap-drop` / `--privileged` 官方口径
- [Dockerfile Best Practices · USER](https://docs.docker.com/build/building/best-practices/) — 非 root 最佳实践
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.1.3（本文所有 CapEff 位图与报错均为此机真实输出）
