---
title: Docker Daemon 与 runtime——一条 docker run 经过了谁的手
sidebarGroup: Docker 系列
shortTitle: 23 Daemon 与 runtime
order: 23
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - OCI
  - containerd
  - runc
  - CRI
  - 对话实录
description: 师生对话实录课：0 基础学生与教学大师的 runtime 链路逐字稿。从「升级 dockerd 会不会杀死全部容器」的悬念出发，在本机实拍 dockerd/containerd/shim/runc 家族进程树，亲手打开 OCI 合同（runc spec）、验证 runtime 状态机（docker create 的 Created）、用 ctr 从 containerd 视角看到 moby 命名空间，最后讲清 K8s 弃用的 dockershim 到底是什么。
---

> **Docker 系列 · 第 23/33 篇**
> 上一篇：[《从零理解 Docker 镜像分层——两个目录叠出一个文件系统（师生对话实录）》](/云原生/docker/docker-22-unionfs) · 下一篇：[《进程视角看容器——从两边 ps 对不上号，滚到亲手杀掉 PID 1》](/云原生/docker/docker-24-process-view)
>
> 阶段 6「内幕」的架构主线：第 20 篇拆了 Namespace、第 22 篇拆了镜像分层，这篇把整条执行链 CLI → dockerd → containerd → shim → runc 按职责拆开——下一篇再回到进程树上排障。

---

## 写在前面

学到第 23 篇，容器「是什么」已经拆透了，但两个很现实的问题我答不上来：

1. 机器要升级 Docker 版本，`systemctl restart docker` 敲下去之前犹豫半天——上面十几个正在跑的容器，会不会跟着全没？
2. 在宿主机 `ps -ef`，看到一排 `containerd-shim-runc-v2` 进程，不知道是谁起的、能不能杀。

答不上来，是因为不清楚 `docker run` 背后不是一个人在干活，而是五级调用在接力。所以这篇继续用老办法：**让 AI 当老师，我当学生，每课只讲一个概念，有问题就打断，没问题就继续**。全文只用一条命令当线索——`docker run -d busybox sleep 600`——看它到底经过了谁的手。

课程路线图（走到哪算哪）：

> ① 实拍家族进程树 → ② 装一个 Docker 来了一家人 → ③ CLI 只发令 → ④ dockerd 接单记账 → ⑤ OCI 合同与 bundle → ⑥ 上半页 image-spec → ⑦ 下半页 runtime-spec 状态机 → ⑧ containerd 大管家 → ⑨ shim 陪跑与 daemon 重启悬念 → ⑩ runc 动手 + 全景拼图 → ⑪ CRI：K8s 弃用的到底是什么

环境：WSL2 Ubuntu-22.04（root）· Docker Engine 29.1.3 · containerd（独立 systemd 服务）· runc 1.3.4（实现 runtime-spec 1.2.1）。全部进程树与命令输出为本机 2026-08-25 实拍——这篇的老版本借用过别人实验机的输出，这次全部换成自己机器的真实现场。

---

## 第 1 课：docker run 之后，宿主机上多了谁

**🧑‍🏫 老师：**

先不谈架构，直接动手。我这台机器上正跑着十几个容器，把 Docker 一家人的进程拍出来：

```bash
ps -eo pid,ppid,args | grep -E 'dockerd|containerd|containerd-shim' | grep -v grep
```

```text
  506       1 /usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
  254       1 /usr/bin/containerd
 1016       1 /usr/bin/containerd-shim-runc-v2 -namespace moby -id 3bde51d700e2...
 1056       1 /usr/bin/containerd-shim-runc-v2 -namespace moby -id 79173ecc131c...
 ...（每行一个 shim，共 13 个）
```

先盯着最意外的一点：**dockerd（506）和 containerd（254）的父进程都是 1 号**，而且 containerd 的 PID 比 dockerd 还小——它比 dockerd 启动得还早。教材上那句「containerd 是 dockerd 拆出来的、挂在它下面」，在这台机器上不成立。这个疑点插问 1 专门拆。

现在请出本篇的主角容器，再顺着它把链路走一遍：

```bash
docker run -d --name n23-lab busybox sleep 600
P=$(docker inspect -f '{{.State.Pid}}' n23-lab)
```

容器进程在宿主机上的真实 PID 是 **84760**。查它的爹，再查爹的爹：

```text
    PID    PPID COMMAND
  84760   84736 sleep 600                ← 容器内 PID 1（宿主侧真身）
  84736       1 /usr/bin/containerd-shim-runc-v2 -namespace moby -id 324690c6... -address /run/containerd/containerd.sock
```

两级就到头了：**容器进程的爹是 shim，shim 的爹是 1 号**——它不挂在 containerd 下面，更不挂在 dockerd 下面。

再验证「每容器一个 shim」：把所有 shim 的 `-id` 参数抽出来和运行中容器对账——本机 13 个运行容器、13 个 shim，一一对应，`-id` 后面跟的就是容器完整 ID（`docker inspect -f '{{.Id}}'` 逐字节相符）。

把冒出来的名字钉成一张图。注意这是**调用关系**，不是父子关系——刚才已经看到，真实的进程树比这张链扁平得多：

```text
docker（CLI）──> dockerd ────> containerd ──> shim ──> runc ──> 容器进程
   发请求        管全局         管生命周期     每容器一个  动手创建  容器内 PID 1
```

留两个悬念：dockerd 重启时，最底下那个 84760 会不会死？那排 shim 到底能不能杀？第 9 课一起解。

一句话总结本课：

> **容器进程的爹是 shim，不是 dockerd；shim 的 -id 就是容器完整 ID——这是把容器和宿主机进程对上号的最可靠钥匙。**

---

## 插问 1：containerd 不是 dockerd 的孩子？教材是不是骗我

**🧑‍🎓 学生：** 你说第 1 课「最意外」，可我看的教程都画着 dockerd 下面挂着 containerd——到底谁对？为什么你这台机器上两个都直接挂在 1 号下面？

**🧑‍🏫 老师：**

两种画法都对，它们说的是**不同的部署形态**。看本机的证据链：

```bash
systemctl is-active docker containerd
grep ExecStart /usr/lib/systemd/system/docker.service
```

```text
active
active
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
```

两条 systemd 服务都是 active；dockerd 的启动命令里带着 `--containerd=/run/containerd/containerd.sock`——**「containerd 我不自己生，我去连现成的」**。装 Docker 引擎时同时装了 containerd 包，它注册成独立的 systemd 服务，开机自启、和 docker.service 平级，所以父进程都是 1 号、PID 还更小。教材上「dockerd 挂着 containerd」的画法对应 dockerd 自行拉起 containerd 的形态（不传那个旗标时它就这么干）。

但这只是**出生方式的差异**。两种形态下，谁跟谁说话完全一样，靠的都是 socket——把两个套接字摆出来：

```bash
ls -l /var/run/docker.sock /run/containerd/containerd.sock
```

```text
/run/containerd/containerd.sock
/var/run/docker.sock
```

对应两级协议：CLI 敲 `docker ps`，请求进 `/var/run/docker.sock`（REST API，给 dockerd）；dockerd 要干活，经 `/run/containerd/containerd.sock`（gRPC，给 containerd）。第 1 课 shim 的参数里那个 `-address`，连的也是后者。

一句话收口：

> **进程树的父子关系是「谁生谁」，随部署形态变；socket 的调用关系是「谁跟谁说话」，永远不变——看架构看 socket，别只看进程树。**

---

## 第 2 课：装一个 Docker，来了一家人——daemon 三段演进

**🧑‍🏫 老师：**

第 1 课树上的名字，来历是一段拆分史。Docker 守护进程从早期集成在 `docker` 命令中，逐步独立：

| 版本 | 启动命令 | 形态 |
|------|----------|------|
| Docker 1.8 之前 | `docker -d` | 守护进程是 client 的一个选项 |
| Docker 1.8 | `docker daemon` | 守护进程是 docker 命令的模块 |
| Docker 1.11+ | `dockerd` | **独立二进制**，与 client 分离 |

也是在 1.11（2016）这版，容器执行链被拆出 containerd 和 runc——**「五级接力」的格局就是这时定型的**。老教程里 `docker -d`、`docker daemon` 两种写法早已废弃，看到别照抄。

现在这家人在本机的合影（`ls -l /usr/bin/...`）：

```text
/usr/bin/docker                    31 MB   # CLI 客户端
/usr/bin/dockerd                   84 MB   # 守护进程
/usr/bin/containerd                48 MB   # 容器运行时（中间层）
/usr/bin/containerd-shim-runc-v2    8 MB   # 容器垫片
/usr/bin/runc                      11 MB   # OCI 运行时实现
```

五个二进制正好对上第 1 课那棵树——装一个 Docker 引擎，来的其实是一家人，各有各的岗位。接下来每课拜访一位。

一句话总结本课：

> **`docker -d` → `docker daemon` → `dockerd` 三代写法是历史；今天 `/usr/bin` 里站着的是一家人，各司其职。**

---

## 第 3 课：第一只手 CLI——只发请求，不建容器

**🧑‍🏫 老师：**

你在终端敲 `docker run -d busybox sleep 600`，`docker` 这个程序只做三件事：解析参数、组一个 REST 请求、发给 `/var/run/docker.sock` 另一头的 dockerd。**请求发完，CLI 进程就退出了。**

这解释了第 1 课进程树里一个「缺席者」：树里根本没有 docker CLI——它不是常驻进程。几个直接推论：

- 关掉终端、CLI 崩掉，容器照跑（容器跟 CLI 没有进程关系）；
- 把客户端装在另一台机器上、用 `DOCKER_HOST=tcp://宿主:2375` 指过来，一样能管容器——CLI 和 daemon 天生可分离，这也是 daemon 远程管理与 TLS 加密的入口（[第 28 篇](/云原生/docker/docker-28-daemon-ops)）；
- 所以「Docker 客户端」升级（那 31MB）从不影响正在跑的容器——换的只是发令的嘴。

一句话总结本课：

> **CLI 是发令的，不是干活的——它连进程树都不进，凭什么影响容器生死？**

---

## 第 4 课：第二只手 dockerd——接单、记账、派活

**🧑‍🏫 老师：**

CLI 的请求打到 dockerd。它的职责四条，翻成白话就是「接单、记账、派活、挡变化」：

1. **接单**：开着 API 服务等请求（那个 socket 的另一头）；
2. **记账**：镜像、网络（[第 15 篇](/云原生/docker/docker-15-network)的 bridge）、卷（[第 14 篇](/云原生/docker/docker-14-data-persistence)）这些「资产」都归它管——`docker ps`、`docker images` 的答案从这来；
3. **派活**：真正创建容器进程这步**不亲自干**，经 gRPC 派给 containerd；
4. **挡变化**：底层 runtime 换版本甚至换实现，对外 API 不变——你手里的 docker 命令不用跟着改。

管的事多，daemon 就重。本机实测它攥着多少家当：

```bash
ls /proc/$(pidof dockerd)/fd | wc -l
```

```text
135
```

135 个打开的文件句柄——镜像层、容器元数据、日志、网络、卷，账本都在它手里。daemon 越重，重启的代价越大：**重启那几十秒里，`docker ps` 都没人回答**。这就是「daemon 重启容器死不死」让人紧张的原因——第 9 课给完整答案，先记一个官方开关的名字：`live-restore`（本机 `docker info` 显示 `Live Restore Enabled: false`，默认关着，[第 28 篇](/云原生/docker/docker-28-daemon-ops)落地它）。

一句话总结本课：

> **dockerd 是账房先生：什么都在它账上，但容器进程不是它的孩子——账本丢了可以重建，人（进程）不用死。**

---

## 第 5 课：先签合同——OCI 与 filesystem bundle

**🧑‍🏫 老师：**

dockerd 派活、containerd 接活、runc 干活，三层来自不同的项目，凭什么能互相配合？因为动手之前先签了份合同。

设想没有标准的世界：每家容器引擎的镜像格式、启动方式都是私有的——A 家构建的镜像 B 家跑不了，K8s 想换 runtime 就得整套重写。所以 2015 年 Docker、CoreOS 等公司共同发起 **OCI**（Open Container Initiative，开放容器倡议），制定容器**镜像格式**与**运行时**的开放标准，并维护参考实现 runc。

合同不用背——**在本机就能打印一份原件**。runc 自带 `spec` 子命令，生成标准模板：

```bash
mkdir /tmp/runc23 && cd /tmp/runc23 && runc spec && head -c 160 config.json
```

```json
{
	"ociVersion": "1.2.1",
	"process": {
		"terminal": true,
		"user": { "uid": 0, "gid": 0 },
		"args": [ "sh" ],
		"env": [ "PATH=/usr/local/sb...
```

这份 `config.json` 就是合同的下半页原文：版本号、跑什么（args）、什么身份（uid/gid）、什么环境（env）…… OCI 用 **filesystem bundle**（文件系统包）这个标准格式把合同两页接起来：

```text
image-spec（镜像长什么样）
        │  解包（unpack）：镜像 → bundle
        ▼
bundle = 一个目录：rootfs + config.json
        │  runtime 读懂 bundle
        ▼
runtime-spec（容器怎么跑：状态 + 操作）
```

一句话总结本课：

> **合同两页：image-spec 管镜像长什么样，runtime-spec 管容器怎么跑；`runc spec` 一条命令把合同打印给你看。**

---

## 第 6 课：合同上半页——image-spec 里装了什么

**🧑‍🏫 老师：**

OCI 镜像四件套，拿本机 busybox 逐个对：

```bash
docker image inspect busybox -f 'layers={{len .RootFS.Layers}} env={{.Config.Env}} cmd={{.Config.Cmd}}'
```

```text
layers=1 env=[PATH=/usr/local/sbin:...] cmd=[sh]
```

| 组件 | 说明 | 对应 |
|------|------|------|
| **layers** | 每层存「相对上层的改动」，层带 hash 可共享 | busybox 就 1 层；[第 22 篇](/云原生/docker/docker-22-unionfs)把它们叠成 rootfs |
| **config** | 环境变量、工作目录、CMD | 上面那行 env/cmd 就是它的内容——`docker inspect <镜像>` 打的这份 |
| **manifest** | 指明用哪份 config、拉哪些层 | 「提货单」 |
| **index**（可选） | 跨平台清单 | 一个 tag 里装着 amd64/arm64 多份 manifest |

index 这件我在本机没演示成：`docker manifest inspect busybox` 要直连 registry，本机走镜像加速、到 registry-1.docker.io 超时——多平台的实操在[第 11 篇 buildx](/云原生/docker/docker-11-buildx-bake)，那里专门构建 amd64+arm64 双平台镜像。读完这节，`docker pull` 刷出来的「一串 hash 层 + 一份清单」各是什么角色，你都能对号入座。

一句话总结本课：

> **镜像 = layers（可共享的积木）+ config（出厂设置）+ manifest（提货单）+ index（多平台目录）。**

---

## 第 7 课：合同下半页——runtime-spec 状态机，docker create 亲眼见

**🧑‍🏫 老师：**

runtime-spec 规定容器的**状态**和 runtime 必须会做的**动作**：

```text
creating → created → running → stopped
                ↘         ↗
                  paused
```

关键是 **create 和 start 分成两步**——`create` 只把容器「造」出来（namespace、cgroup、rootfs 就位，用户进程没跑），`start` 才把 init 进程拉起来。这不只是规范条文，Docker 的命令行直接把它暴露给你：

```bash
docker create --name n23-ghost busybox sleep 600
docker ps -a --filter name=n23-ghost --format '{{.Names}} {{.Status}}'
```

```text
eb5ab57babde...
n23-ghost Created        ← 状态机的 created 节点，实物
```

容器造好了、没启动——正是「配置就位但进程未跑」的检查点。再补一刀：

```bash
docker start n23-ghost
docker ps --filter name=n23-ghost --format '{{.Names}} {{.Status}}'
```

```text
n23-ghost Up Less than a second    ← created → running
```

`docker ps` 里的 Created / Up / Exited，底层说的就是这套状态机的语言（paused 对应 `docker pause`，用的正是[第 21 篇](/云原生/docker/docker-21-cgroups)讲过的 freezer 思路）。

一句话总结本课：

> **状态机不是纸面概念：`docker create` 停在 created，`docker start` 才进 running——两步之间的容器，是一个「造好没通电」的检查点。**

---

## 第 8 课：第三只手 containerd——独立的大管家

**🧑‍🏫 老师：**

第 1 课插问里已经看到它在独立服务里活着。职责三条：**镜像管理**（pull、unpack、snapshot——第 5 课模型里「镜像 → bundle」那步是它干的）、**容器执行**（派 shim、用 runc）、**即使 dockerd 不在也能管容器**（需相应 CLI）。

最后这条本机可以直接演示——containerd 自带的 CLI 叫 `ctr`，从**containerd 的视角**看这台机器：

```bash
ctr -n moby containers list | head -3
```

```text
CONTAINER                                                           IMAGE
06136fab34de...                                                    docker.io/calciumion/n...
324690c63e47...                                                    docker.io/library/busybox:latest
3bde51d700e2...                                                    docker.io/library/redis...
```

两件事值得盯：第二行 `324690c6...` 正是我的 n23-lab——**dockerd 记的账和 containerd 记的账，说的是同一个容器**；而 `-n moby` 这个参数是关键——Docker 在 containerd 里占的命名空间叫 **moby**（Docker 上游项目名），K8s 的 kubelet 走的是 `k8s.io` 命名空间——**同一台机器、同一个 containerd，两套账本互不打架**。单独装 containerd、用 `ctr` 从 pull 一路跑到 exec 的完整实操在附篇 [a02](/云原生/docker/docker-a02-containerd)。

一句话总结本课：

> **containerd 是独立大管家：dockerd 只是它的客户之一；moby/k8s.io 两个命名空间，就是 Docker 和 K8s 在同一管家处的两个账户。**

---

## 插问 2：容器跑起来之后，磁盘上留了什么运行时档案？

**🧑‍🎓 学生：** 你说 bundle = rootfs + config.json——那我这个正在跑的 n23-lab，bundle 在哪？能看到实物吗？

**🧑‍🏫 老师：**

能，而且这页档案信息量极大。containerd 为每个容器开的任务目录在 `/run/containerd` 下，目录名就是容器完整 ID：

```bash
CID=$(docker inspect -f '{{.Id}}' n23-lab)
ls /run/containerd/io.containerd.runtime.v2.task/moby/$CID/
```

```text
bootstrap.json  config.json  init.pid  log  log.json
options.json    rootfs       runtime   shim-binary-path  work
```

三样要认：

1. **`config.json`**——第 5 课那份合同原件的真实副本，头几个字段：`{"ociVersion":"1.2.1","process":{"args":["sleep","600"],...}}`——**版本号和 runc 自报的 spec 1.2.1 一致，args 就是我起的 `sleep 600`**。这份文件就是 runc 创建容器时照着执行的说明书。
2. **`init.pid`**——里面一个数字：`84760`。跟 `docker inspect -f '{{.State.Pid}}'` 对，分毫不差。**容器 1 号进程在宿主机上的 PID，白纸黑字记在档案里**。
3. **`rootfs/`**——[第 22 篇](/云原生/docker/docker-22-unionfs)叠出来的根文件系统挂在这；`log` 系列是 shim 替容器收着的输出（`docker logs` 的源头）。

一句话收口：

> **一个运行中的容器 = 一个任务目录：config.json 是出生证明、init.pid 是真身住址、rootfs 是身体、log 是日记——全在 `/run/containerd` 下可查。**

---

## 第 9 课：第四只手 shim——陪跑的保姆，与那个悬念的答案

**🧑‍🏫 老师：**

每启动**一个容器**，就多**一个** shim（第 1 课对过账：13 容器 13 shim）。它的启动参数三项，第 1 课抓的实拍逐个对：

- `-namespace moby`：在 containerd 的哪个账户下（接第 8 课）；
- `-id 324690c6...`：容器完整 ID——对容器和 shim 的钥匙；
- `-address /run/containerd/containerd.sock`：向谁汇报工作。

shim 拿到任务后拼装 `runc create` / `runc start` 两条命令（正好踩在第 7 课状态机的两个节点上），然后接管余生。**存在的三大意义**：

1. **runc 可退出**：创建完容器 runc 就走，不必每个容器养一个常驻 runtime；
2. **IO 保活**：容器的 stdin/stdout/stderr 由 shim 扛着——插问 2 任务目录里那些 log 文件就是实体——即使 daemon 全挂，容器输出不断流；
3. **上报退出状态**：容器退出时把 exit code 报给 containerd。

第 1 条当场验证——13 个容器跑着，宿主机上找 runc 进程：

```bash
pgrep -x runc | wc -l
```

```text
0
```

**零个**。runc 是一次性工具，干完就走（这也是为什么直接拿 `runc list` 查 Docker 的容器会报 `container does not exist`——台账在 shim 手里，runc 早退场了）。

顺手再做一次诚实记录：我试过 `runc --root <任务目录> list` 想看它的台账，报了一排 `load container ...: does not exist`——shim v2 时代 runc 不留传统状态文件，这次失败本身就是「runc 是临时工」的证据。

现在解开头两个悬念。**dockerd 重启，容器死不死？** 看第 1 课的树：容器进程（84760）的爹是 shim（84736），shim 的爹是 1 号；shim 只认 containerd 的 socket，根本不知道 dockerd 的死活；runc 更是早退场了。所以**结构上，这条链没有任何一环攥在 dockerd 手里**——dockerd 崩了（kill -9），shim 带着容器原地不动。但注意边界：`systemctl restart docker` 是**优雅关闭**，默认（本机 `Live Restore Enabled: false`）dockerd 退出前会主动停掉容器——容器活不活取决于「怎么个重启法」，生产上要保容器得开 `live-restore`，这是 [第 28 篇](/云原生/docker/docker-28-daemon-ops)的主课。**那排 shim 能不能杀？** 现在你自己能推出来：杀 shim = 杀掉容器的监护人和 IO 管道，容器跟着完——它看着像杂鱼，其实是命脉。

一句话总结本课：

> **shim 是陪跑保姆：runc 干完就走、IO 由它扛、exit code 由它报——daemon 的死活在结构上与容器无关，但优雅重启的清场行为除外。**

---

## 第 10 课：第五只手 runc，与全景拼图

**🧑‍🏫 老师：**

链路走到底才轮到真正碰内核的这位。runc 从 Docker 的 libcontainer 迁移而来，负责：容器创建/启动/删除、**Namespace 隔离**（[第 20 篇](/云原生/docker/docker-20-namespace)六大件全是它设置的）、**Cgroup 限额**（[第 21 篇](/云原生/docker/docker-21-cgroups)的枷锁是它给容器戴上的）。前面四只手都没碰过内核；到 runc，才真正执行那些系统调用。

本机版本自报家门：

```bash
runc --version | head -2
```

```text
runc version 1.3.4-0ubuntu1~22.04.1
spec: 1.2.1      ← 它实现的 runtime-spec 版本
```

只要守合同就能换人：`dockerd --add-runtime "custom=/path/to/别的实现"` 注册替代 runtime——gVisor、Kata 这类安全沙箱 runtime 走的就是这条路（分类见附篇 [a01](/云原生/docker/docker-a01-container-runtime-docker)）。

十课攒下的名字，按调用顺序摆进全景图：

```text
┌─────────────┐
│  docker     │  CLI：发 REST 请求，非常驻
└──────┬──────┘
       ▼ /var/run/docker.sock
┌─────────────┐
│  dockerd    │  接单、记账（镜像/网络/卷）、挡变化
└──────┬──────┘
       ▼ /run/containerd/containerd.sock（gRPC）
┌─────────────┐
│ containerd  │  unpack bundle、派 shim、管生命周期
└──────┬──────┘
       ▼ 每容器一个
┌─────────────────────┐
│ containerd-shim     │  拼runc命令、扛IO、报exit code
└──────┬──────────────┘
       ▼ runc create / start（干完即退）
┌─────────────┐
│    runc     │  设 namespace + cgroup，创建容器进程
└──────┬──────┘
       ▼
┌─────────────┐
│ 容器内进程   │  sleep 600 / nginx / your-app（PID 1）
└─────────────┘
```

顺着图把 `docker run -d busybox sleep 600` 走一遍：CLI 发请求 → dockerd 记账派活 → containerd unpack 出 bundle、派 shim → shim 拼 `runc create`/`start` → runc 设好 namespace/cgroup 创建出 84760 然后退出 → 此后陪着容器的只有 shim。**每一级的联系方式都是 socket，每一级都可以独立替换**——这就是「五级接力」的全部。

一句话总结本课：

> **CLI 发令、dockerd 记账、containerd 管家、shim 陪跑、runc 动手——五级靠 socket 相连，靠 OCI 合同配合。**

---

## 插问 3：「K8s 抛弃了 Docker」，我 Docker 构建的镜像还能在 K8s 上跑吗？

**🧑‍🎓 学生：** 都说 K8s 1.24 抛弃了 Docker——那我用 `docker build` 打的镜像，上了 K8s 集群还能跑吗？

**🧑‍🏫 老师：**

能跑，而且这句话本身就只对了一半。K8s 与 Docker 的关系三段演进：

```text
早期 K8s
  kubelet → 对接 Docker 的代码写死在 kubelet 里

K8s 1.5+ 推出 CRI（Container Runtime Interface）
  kubelet → CRI → dockershim（翻译层，K8s 社区维护）→ dockerd → containerd → shim → runc

K8s 1.24+ 移除 dockershim
  kubelet → CRI → containerd（内置 CRI 插件）→ shim → runc
  或：kubelet → CRI → CRI-O → runc
```

读三段：早期对接代码写死，runtime 一换 kubelet 就得改源码——所以 1.5 起有了 **CRI** 这个统一接口；Docker 当时没实现 CRI，K8s 只好自己维护一个**dockershim** 翻译层（CRI → Docker API），白白多一层、还是 K8s 社区替 Docker 打工；1.24 起 K8s 删掉 dockershim，走 containerd 内置的 CRI 插件或 CRI-O 直连。

所以「抛弃」掉的只是 **dockershim 这层翻译**，不是 Docker 的镜像——因为镜像格式走的是第 6 课那份 **OCI image-spec 合同**，containerd/CRI-O 都认。两个缩写别再混：

| 名字 | 是什么 | 给谁用 |
|------|--------|--------|
| **OCI** | 镜像格式 + 运行时行为的标准（image-spec / runtime-spec） | 所有容器工具的「普通话」 |
| **CRI** | kubelet 与 runtime 之间的接口，带 Pod / PodSandbox 语义 | Kubernetes 的「方言」 |

一句话收口：

> **K8s 抛弃的是 dockershim 翻译层，不是 OCI 镜像——你 Docker 构建的镜像在任何 OCI runtime 上照跑，合同还在生效。**

---

## 命令速查

| 想看什么 | 命令 | 哪课用过 |
|----------|------|-----------|
| 家族进程合影 | `ps -eo pid,ppid,args \| grep -E 'dockerd\|containerd'` | 1 |
| 容器真身与爹链 | `docker inspect -f '{{.State.Pid}}'` + `ps -o pid,ppid,args -p` | 1 |
| shim 对容器 | shim 参数 `-id` vs `docker inspect .Id` | 1、9 |
| daemon 怎么起的 | `grep ExecStart /usr/lib/systemd/system/docker.service` | 插问 1 |
| daemon 有多重 | `ls /proc/$(pidof dockerd)/fd \| wc -l` | 4 |
| 合同原件 | `runc spec`（生成 config.json 模板） | 5 |
| 状态机两步 | `docker create` → `docker start` | 7 |
| containerd 视角 | `ctr -n moby containers list` | 8 |
| 运行时档案 | `ls /run/containerd/io.containerd.runtime.v2.task/moby/<cid>/` | 插问 2 |
| runc 是否常驻 | `pgrep -x runc \| wc -l`（跑着容器时=0） | 9 |

---

## 小结

1. **进程树（第 1 课）**：容器进程的爹是 shim；本机 dockerd/containerd/shim 都直挂 1 号——父子关系随部署形态变，调用关系看 socket。
2. **一家人（第 2 课）**：`docker -d` → `dockerd` 三代演进；`/usr/bin` 五个二进制各司其职。
3. **CLI（第 3 课）**：只发 REST 请求，非常驻；`DOCKER_HOST` 可远程。
4. **dockerd（第 4 课）**：接单、记账（本机 135 个 fd）、派活、挡变化；`live-restore` 默认关。
5. **OCI（第 5 课）**：合同两页 + bundle；`runc spec` 打印原件。
6. **image-spec（第 6 课）**：layers + config + manifest（+ index 多平台）。
7. **runtime-spec（第 7 课）**：状态机 creating→created→running→stopped；`docker create` 亲眼停在 created。
8. **containerd（第 8 课）**：独立服务、moby 命名空间；`ctr -n moby` 第二本账。
9. **运行时档案（插问 2）**：任务目录里 config.json / init.pid / rootfs / log——出生证明与真身住址。
10. **shim（第 9 课）**：runc 可退（实测 0 常驻）、IO 保活、报 exit code；daemon 崩溃容器不死，优雅重启另说。
11. **runc 与全景（第 10 课）**：碰内核的只有它；五级靠 socket 相连、靠 OCI 合同配合。
12. **CRI（插问 3）**：K8s 弃用的是 dockershim 翻译层，OCI 镜像照跑。

**思考题**：生产机 `systemctl restart docker` 后容器全停了，同事说「你不是讲过容器不归 dockerd 管吗」——你该向他解释哪两个概念的差别？（提示：第 9 课「结构上不攥命」与「优雅关闭主动清场」；解药叫什么、默认开没开？）

下一篇：[《进程视角看容器——从两边 ps 对不上号，滚到亲手杀掉 PID 1》](/云原生/docker/docker-24-process-view)——本篇的 84760 和 84736，到那边要亲手抓出来、亲手杀掉。

---

## 参考资料

- [OCI 官网与规范索引](https://opencontainers.org/)、[image-spec](https://github.com/opencontainers/image-spec) / [runtime-spec](https://github.com/opencontainers/runtime-spec)
- [runc（OCI 参考实现）](https://github.com/opencontainers/runc)——`runc spec` 生成合同模板
- [containerd 官网](https://containerd.io/) 与 [ctr/containerd 实操附篇](/云原生/docker/docker-a02-containerd)
- [Docker Engine 文档](https://docs.docker.com/engine/)、[live-restore](https://docs.docker.com/engine/daemon/live-restore/)（第 28 篇落地）
- [Kubernetes Container Runtimes（CRI）](https://kubernetes.io/docs/concepts/architecture/cri/)
- 本机实测：WSL2 Ubuntu-22.04 · Docker 29.1.3 · containerd（独立 systemd 服务）· runc 1.3.4（spec 1.2.1），实测日期 2026-08-25
