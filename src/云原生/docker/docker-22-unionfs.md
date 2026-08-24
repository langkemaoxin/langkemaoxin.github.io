---
title: 从零理解 Docker 镜像分层——两个目录叠出一个文件系统（师生对话实录）
sidebarGroup: Docker 系列
shortTitle: 22 UnionFS 与分层
order: 22
date: 2026-08-21T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - 对话实录
description: 让 AI 当老师、我当学生，每课只讲一个概念：从「两个目录各放一个文件」出发，一路叠出联合挂载、可写层、写时复制、whiteout，最后亲眼看到真容器的根目录就是同一套结构，层与 build 缓存随之解开。全程 WSL 实测。
---

> **Docker 系列 · 第 22/33 篇**
> 上一篇：[《CGroups 限资源——给同一个容器逐项上枷锁》](/云原生/docker/docker-21-cgroups) · 下一篇：[《Docker Daemon 与 runtime——一条 docker run 经过了谁的手》](/云原生/docker/docker-23-daemon-runtime)
>
> 原理篇第 4 篇：总览、Namespace、CGroups 都过了，这一篇拆「两个目录叠出一个文件系统」这根支柱。

---

## 写在前面

写 Docker 系列写到原理篇，[第 19 篇](/云原生/docker/docker-19-tech-foundation)认了 Namespace / Cgroups / UnionFS 三根支柱。前两根都好懂，唯独 UnionFS 让我发怵——「联合文件系统」几个字拆开都认识，合起来不知道在说什么。而镜像的种种好处全挂在它身上：400 MB 的镜像 10 台节点共用、改一行代码重建只要几秒，凭什么？

所以换个办法：**让 AI 当老师，我当学生，每课只讲一个概念，我有问题就打断**。这场对话从「两个目录各放一个文件」开始，一路讲到了真容器的根挂载和 build 缓存，全程实验都在本机跑通。

课程路线图（走到哪算哪）：

> ① 两个目录 → ② 叠到一起 → ③ 写落在谁家 → ④ 改楼下的文件 → ⑤ 删除是挡板 → ⑥ 真容器就是这套 → ⑦ 层从哪来 → ⑧ 缓存 → ⑨ 老教程的 AUFS

环境：WSL2 Ubuntu-22.04（root）+ Docker 29.1.3，实验目录 `/root/union-lab`。官方入口：[Storage drivers](https://docs.docker.com/engine/storage/drivers/)。

---

## 第 1 课：从你已经会的东西开始

**🧑‍🏫 老师：**

先不聊镜像。建两个目录，各放一个文件：

```bash
mkdir -p /root/union-lab/company /root/union-lab/home
cd /root/union-lab
echo "hello from company" > company/code
echo "employee canteen" > home/eat
```

确认现状：

```bash
cat company/code
ls company
ls home
```

```text
hello from company
code
eat
```

`company` 里放着 `code`，`home` 里放着 `eat`。两个互不相干的普通目录。本课完。

**🧑‍🎓 学生：** 就这？这也算一课？

**🧑‍🏫 老师：** 算，而且是全文最重要的一课。接下来所有东西都从这两个目录长出来，一步都不跳。咱们立个规矩：**任何一步你觉得没看懂，立刻打断我**——你觉得懵的地方，就是我没讲干净的地方。

---

## 第 2 课：把两个目录叠到同一个窗口上

**🧑‍🏫 老师：**

提个要求：**不许复制任何文件，有没有办法让一个 `ls` 同时看到两个目录的内容？**

直觉做法是 `cp` 到一个新目录里合并——但那是拷贝，改了一边另一边不知道，两份数据各自为政。换个思路：不合并内容，把两个目录**叠起来**，对着一个窗口看。就像两张透明胶片摞在投影仪上，你看到的是合起来的画面，而每张胶片还是它自己。

再建一个空目录 `mnt` 当「窗口」，用一条 `mount` 命令把它们叠上去（命令先照抄，拆解马上到）：

```bash
mkdir -p /root/union-lab/work /root/union-lab/mnt
mount -t overlay overlay \
    -o lowerdir=/root/union-lab/company,upperdir=/root/union-lab/home,workdir=/root/union-lab/work \
    /root/union-lab/mnt
```

看结果：

```bash
ls mnt
cat mnt/code
cat mnt/eat
```

```text
code
eat
hello from company
employee canteen
```

两个目录的文件出现在了同一个视图里，谁也没被复制。刚才这件事有名字：**联合挂载（union mount）**——`mnt` 不是真实目录，是叠出来的视图。提供这种能力的内核机制叫 **OverlayFS**，Docker 镜像分层的全部秘密都在这。

拆开那条命令：

| 段 | 含义 |
|----|------|
| `-t overlay` | 用 overlay 这类文件系统来挂（Linux 内核自带） |
| `lowerdir=…/company` | 参与叠加的**下层**目录 |
| `upperdir=…/home` | 参与叠加的**上层**目录 |
| `workdir=…/work` | 内核的配套工作目录（插问马上讲） |
| `overlay`（第二处） | 设备名——没有真实磁盘参与，习惯就填 overlay |
| `/root/union-lab/mnt` | 挂载点：叠出来的视图落在哪 |

（对照：[第 14 篇](/云原生/docker/docker-14-data-persistence)的 bind mount 是把**一个**目录接到一个路径上；这里是把**多个**目录叠成一个视图，是它的加强版。）

「下层/上层」现在只是**位置词**，还没说谁能写、谁不能写。这两个词下一课就会变成角色。

**🧑‍🎓 学生：** 插一句，`workdir` 平白多一个空目录，干嘛用的？它也不出现在 `mnt` 里。

**🧑‍🏫 老师：** 问得细。它是内核的**配套工作目录**：OverlayFS 保证写入原子性的手法是「先把内容写进 workdir 里的临时文件，再一步改名（rename）挪到该去的位置」——中途断电，最多留个临时文件，不会出现写了一半的坏文件。它不参与你看到的视图，保持为空、照抄即可。

---

## 第 3 课：往视图里写个新文件，落在了谁家

**🧑‍🏫 老师：**

视图能看，那能写吗？写了算谁的？试一下：

```bash
echo "nap time" > mnt/sleep2
ls mnt
ls home
ls company
```

```text
code
eat
sleep2
eat
sleep2
code
```

注意看：`sleep2` 出现在了视图里，也出现在了 `home` 里——**`company` 纹丝不动**。

写，只落上层。现在给第 2 课那两个位置词正式转正：`upperdir`（home）的角色叫**可写层**，`lowerdir`（company）的角色叫**只读层**。写入永远进可写层，只读层一个字节不会被碰。

> 一句话总结：**视图里写新文件 = 直接写进上层；下层只是垫着看的。**

**🧑‍🎓 学生：** 凭什么 home 能写、company 就不能？是不是 company 的权限位被设成只读了？

**🧑‍🏫 老师：** 好问题，这里藏着一个常见误会：**「只读层」的只读，是挂载角色，不是文件权限**。验证很简单——绕开视图，直接在宿主机上改楼下的 `company`：

```bash
echo "written from host, not via view" > company/note
cat mnt/note
```

```text
written from host, not via view
```

改得动，而且改动立刻反映进了视图。所以「只读」锁的只是**从视图进去的写**（第 3 课开头那种写法），不锁宿主侧对目录本身的操作。打个比方：楼下开了扇**单向门**——从视图这侧推不开，绕到楼后面随便进。

顺便留道题给下一课：刚才证明了「宿主直改楼下 → 视图会变」。那反过来，**从视图改楼下的旧文件**，楼下会变吗？

---

## 第 4 课：改一个「住在楼下」的文件

> **课堂检查回放**（上节课留的题：从视图改楼下的旧文件，楼下会变吗？）
>
> **🧑‍🎓 学生答：**「不会。写 `sleep2` 那次 company 就没动过；从视图进去的写永远落上层。」
>
> **🧑‍🏫 老师点评：** 完全正确。一正一反正好划清了边界：宿主 → 楼下 → 视图，这条链通；视图 → 楼下，锁死。但「改楼下的**旧文件**」比「写新文件」多一层机关，看：

**🧑‍🏫 老师：**

`code` 来自楼下的 `company`。往视图里改它：

```bash
echo apple > mnt/code
cat mnt/code
cat company/code
cat home/code
```

```text
apple
hello from company
apple
```

三行输出逐个看：

- 视图里的 `code`：**apple**——改成功了，视图上没人拦你
- `company/code`：**hello from company**——楼下一个字节没动
- `home/code`：**apple**——一份副本悄悄出现在了楼上

改楼下的文件，不是真去改楼下，而是**先把内容复制到楼上、再在副本上改**。这个套路叫**写时复制（Copy-on-Write，CoW）**——平时不动它，真写到才复制。

类比：图书馆的书不许涂改，你要改，就先整本复印、改自己的复印本——原书永远干净，馆里其他人照看原版。

还注意到一个事实：此刻 `code` 在磁盘上有两份（company 原件 + home 副本），但 `cat mnt/code` 只显示 apple——**楼上那份盖住了楼下那份**。记住「上盖下」，第 6 课要靠它数镜像层。

> 一句话总结：**改楼下的文件 = 先复制到楼上再改（CoW）；读的时候，楼上盖楼下。**

---

## 第 5 课：删掉它——挡板现身

**🧑‍🏫 老师：**

还剩最后一个动作：删。`code` 住在楼下、楼下删不动，视图里能删掉它吗？

```bash
rm mnt/code
ls mnt
cat company/code
ls -la home
```

```text
eat
sleep2
hello from company
total 16
drwxr-xr-x 2 root root 4096 Aug 21 21:49 .
drwxr-xr-x 6 root root 4096 Aug 21 21:49 ..
c--------- 2 root root  0, 0 Aug 21 21:49 code
-rw-r--r--  1 root root   17 Aug 21 21:49 eat
-rw-r--r--  1 root root    9 Aug 21 21:49 sleep2
```

新现象，而且眼见为实：

- 视图里 `code` 没了
- `company/code` 原件还在
- **`home` 里多了一个奇怪的 `code`：`c---------` 开头、主次设备号 `0, 0` 的字符设备**——这不是普通文件，是内核放的一块「挡板」，声明「这个路径已删除」

这块挡板叫 **whiteout（遮挡标记）**。删除从来不是撕掉楼下的书页，而是在楼上的胶片贴一张不透明的贴纸——视图里看不见了，楼下原封不动。

至此，整套机制齐了，钉成一张图：

```text
下层 company（只读层）──┐
                        ├─联合挂载─→ 视图 mnt
上层 home   （可写层）──┘
   读：上下合并，楼上盖楼下
   新建：直接落上层
   修改：先复制上来再改（CoW）
   删除：楼上放挡板（whiteout）
```

> 一句话总结：**删除 = 楼上放挡板盖住视图，不是擦掉楼下的文件。**

**🧑‍🎓 学生：** 那我在容器里 `rm` 一个大文件，磁盘空间能省下来吗？

**🧑‍🏫 老师：** 省不下来——挡板只遮视图，原件还躺在楼下占着地方。同理，`rm` 之后 `docker commit` 成新镜像，文件在新镜像里「不在」了，空间仍在底下的层里。真要瘦身，得从 Dockerfile 里去掉这个文件重新 build——多阶段构建就是干这个的，先埋个伏笔，[第 10 篇](/云原生/docker/docker-10-build-advanced)展开。

---

## 第 6 课：你的容器根目录，就是这套把戏

**🧑‍🏫 老师：**

手工玩具到此为止，看真家伙。起一个 nginx 容器，从宿主机侧看它**根目录的挂载记录**：

```bash
docker run -d --name union-demo nginx:alpine
PID=$(docker inspect -f '{{.State.Pid}}' union-demo)
grep ' - overlay ' /proc/$PID/mountinfo
```

本机输出（重复的路径用 `…` 省略，结构完整）：

```text
643 573 0:89 / / rw,relatime - overlay overlay rw,lowerdir=/var/lib/containerd/…/snapshots/1097/fs:…/snapshots/311/fs:…/snapshots/282/fs,upperdir=/var/lib/containerd/…/snapshots/1098/fs,workdir=/var/lib/containerd/…/snapshots/1098/work
```

对着前五课逐个认：

- **`- overlay overlay`**：容器根目录就是一个 overlay 联合挂载——和你第 2 课手敲的是同一种东西
- **`lowerdir=` 一长串**：不止一个下层，冒号分隔。**镜像的每一层，就是一个下层目录**——第 2 课埋的位置词，在这对上号了
- **`upperdir=`**：容器可写层——你在容器里新建、修改、删除，全落这（第 3~5 课的三种行为）
- **`workdir=`**：内核配套目录，插问里讲过

一句话对号入座：**镜像的每一层 = 一个 lowerdir；容器可写层 = upperdir；容器里 `ls /` 看到的根 = mnt。**

打个总比方：**镜像是教材，印一次全校共用；每个容器是学生自己的草稿本**——100 个容器跑起来，磁盘上不是 100 份镜像，而是 1 份共享教材 + 100 本薄薄的草稿本。第 3 课你亲眼见过草稿本有多薄（几个文件而已）。

数一数下层有几条：

```bash
grep ' - overlay ' /proc/$PID/mountinfo | grep -o 'lowerdir=[^,]*' | tr ':' '\n' | wc -l
```

```text
9
```

**🧑‍🎓 学生：** 9 条下层，谁盖谁？总得有个先后吧。

**🧑‍🏫 老师：** 「上盖下」在第 4 课见过单层的版本，多层的规矩做个最小实验——两个下层各放一个同名文件：

```bash
mkdir -p A B U W M
echo "written in A" > A/code
echo "written in B" > B/code
mount -t overlay overlay -o lowerdir=$PWD/A:$PWD/B,upperdir=$PWD/U,workdir=$PWD/W $PWD/M
cat M/code        # written in A —— 左边的 A 赢
umount M
# 把参数换成 lowerdir=$PWD/B:$PWD/A 再挂一次：cat M/code 变成 written in B
```

**下层列表里靠左的，盖住靠右的。** 所以真容器那条 `lowerdir=1097:311:310:…` 是在告诉你：最左边的 1097 是**最新**一层，越往右越老。镜像「后执行的指令在上层」，说的就是这个位置关系。

**🧑‍🎓 学生：** 我拿 `docker history nginx:alpine` 数了一下，非 0B 的层是 8 条，跟 9 对不上啊？

**🧑‍🏫 老师：** 数得仔细。两个数字不必严格相等：`history` 里还躺着 `ENV`/`CMD`/`EXPOSE` 这类 **0B 的纯元数据行**（第 7 课讲它们为什么不占层），而快照器自己也有管理条目。量级对得上，「一条下层目录 = 一层」这个理解就成立，别跟数字较劲。

> 一句话总结：**容器根 = 镜像各层（lowerdir 串）+ 可写层（upperdir）的联合挂载；靠左的新，盖住靠右的旧。**

---

## 第 7 课：层从哪来——build 一步一层

**🧑‍🏫 老师：**

第 6 课看到的那串下层目录，是 build 的时候一层层长出来的。看一份教学配方（Dockerfile 语法[第 9 篇](/云原生/docker/docker-09-dockerfile)教过，这里只盯「层」）：

```dockerfile
FROM python:2.7-slim
WORKDIR /app
COPY . /app
RUN pip install --trusted-host pypi.python.org -r requirements.txt
EXPOSE 80
ENV NAME World
CMD ["python", "app.py"]
```

> **老资料别照抄**：`python:2.7-slim` 是历史教学配方——Python 2.7 已于 2020 年 1 月 EOL，语法照学，镜像别再用于生产。

```text
Step 1/7 : FROM python:2.7-slim
 ---> 804b0a01ea83
Step 2/7 : WORKDIR /app
 ---> 6d93c5b91703
...
Successfully built a5ccd4e1b15d
```

先说看哪几行，再逐类读：

- **`Step 1/7` … `Step 7/7`**：7 条指令从上往下执行，一步叠一层——第 6 课的 9 条下层就是这么长出来的
- **`---> 804b0a01ea83`**：每步做完拿到的层 ID——`history` 表里的 ID 就是这么来的
- **`Successfully built a5ccd4e1b15d`**：最终镜像 ID——整摞叠完后的整体指代
- **未变更的步骤显示 `Using cache`**——复用已有的层，一个字节不重算

**🧑‍🎓 学生：** `WORKDIR` 只是设个工作目录，又没写文件，为什么也产生了一个层 ID？

**🧑‍🏫 老师：** 因为**层 ≠ 大**。`EXPOSE`/`CMD`/`ENV` 这类只改元数据的层甚至是 0B——上一课那个「对不上」的插问，根源就在这。但层多了有个副作用：**缓存判断的单位变多了**，一层一层挨个比对。这正好是下一课的入口。

（`Step n/m` 格式来自**传统构建器**；新版 BuildKit 显示 `[2/2] COPY …`——第 9 篇 lab-web 的 build 见过。层与缓存行为一致，长相不同。）

> 一句话总结：**build 一步叠一层；层可能是 0B 的元数据层，也可能是几百 MB 的文件层。**

---

## 第 8 课：缓存——变一层，重算一层

**🧑‍🏫 老师：**

把 `Using cache` 展开成规则：

| 情况 | 行为 |
|------|------|
| Dockerfile 某行及之前均未变 | 该层及以下全部复用缓存 |
| 仅中间某行变更 | 从变更层开始重新 build，其下仍复用 |
| 仅顶层变更 | 只重建最后一层 |

所以 Dockerfile 优化的第一原则：**把变动少的指令放前面、变动多的放后面**。

拿第 9 篇的 FastAPI 配方对账：`requirements.txt`（几乎不变）在前、`main.py`（天天变）在后——改代码重建时前 4 层全部命中缓存、秒过，从第 5 步才开始重跑。

现在回收开头那笔账：**10 台节点跑同一镜像**，每层磁盘只存一份、已存在的层不重拉（[第 5 篇](/云原生/docker/docker-05-container-and-image) pull 输出的 `Image is up to date` 就是层没变）；**改一行代码**，只重建顶上一两层，下面全 `Using cache`。400 MB 的焦虑，就是被「层」这么拆没的。

多阶段构建、BuildKit 缓存挂载这些深水区，[第 10 篇构建进阶](/云原生/docker/docker-10-build-advanced)展开。

验证一步：拿手头任意镜像跑 `docker history <镜像>`，一行一层；再改一行 Dockerfile 重新 build，看哪些 Step 显示 `Using cache`。

留道题：**把 `COPY . /app` 放在 `FROM` 之后的第一行，对缓存有什么影响？怎么排更合理？**（提示：变一层，重算一层。）

> 一句话总结：**缓存以层为单位：变一层，从那层起重算、其下全复用——所以少变的写前面。**

---

## 第 9 课 🧗：老教程里的 AUFS 去哪了

**🧑‍🎓 学生：** 我看过一些老教程，命令跟你的不一样：`mount -t aufs -o dirs=./home:./company none ./mnt`，还把目录叫 branch，把顺序叫 Stack？

**🧑‍🏫 老师：**

那是 **AUFS**（Advanced UnionFS）——早期 Docker 用的实现，和本篇的 OverlayFS 语义一一对应：

| AUFS 老讲法 | OverlayFS（本篇） |
|---|---|
| `dirs=./home:./company` 的顺序 | `lowerdir` 的排列顺序 |
| 第一个 branch 可写 | `upperdir` |
| branch / Stack | 下层目录 / 上下位置 |

但 AUFS **没能进入 Linux 主线内核**，aufs 存储驱动也已在 Docker Engine 24.0（2023）移除。当面验证你的机器上有没有：

```bash
grep aufs /proc/filesystems
```

本机（WSL2 内核 6.6.87.2-microsoft-standard-WSL2）：**没有任何输出**——内核压根没编译 aufs，`/proc/filesystems` 里躺着的是 overlay。命令没输出，本身就是答案。

Docker 实际用哪个驱动，`docker info` 说得明白：

```bash
docker info | grep Storage
```

```text
 Storage Driver: overlayfs
```

传统 Docker Engine 直装 Linux 时这里多显示 `overlay2`；Engine 29 起新装默认启用 containerd 镜像存储（containerd 是 Docker 内部管镜像和容器的组件，[第 23 篇](/云原生/docker/docker-23-daemon-runtime)展开），同一个 OverlayFS 机制的显示名变成 `overlayfs`。老资料里的 `devicemapper` 同样早已不推荐。**实现换了几茬，「只读层垫底 + 可写层在顶 + 写时复制 + whiteout」的语义一步没变**——这也是本篇敢拿 OverlayFS 手工实验代替老教程 AUFS 实验的原因。

---

## 小结

九节课，每课一个概念，串起来就是一条线：

1. **联合挂载**：多个目录叠到同一个挂载点，视图合并、零复制。
2. **可写层/只读层**：从视图写入永远落上层；「只读」是挂载角色，不是权限位。
3. **写时复制**：改楼下文件=先复制到楼上再改；楼上盖楼下。
4. **whiteout**：删除=楼上放挡板字符设备；原件还在楼下，磁盘没省。
5. **容器即同款**：真容器的根挂载就是 `lowerdir 一串（镜像层）+ upperdir（可写层）+ workdir`；靠左的新、盖住靠右的旧。
6. **教材与草稿本**：镜像共享一份，每个容器一本薄薄的草稿本。
7. **build 一步一层**：`Step n/m` 一层一个 ID；元数据步骤是 0B 层。
8. **缓存**：变一层，从那层起重算、其下全复用——少变的写前面。
9. **驱动演进**：AUFS（老教程）→ overlay2/overlayfs，实现换了语义没换。

第 8 课留的题文末收个尾：`COPY . /app` 放第一行，任何一行源码变动都会击穿它**及之后所有层**的缓存；把不常变的（依赖清单）放它前面、常变的（源码）放后面，才是合理排序。

清理实验现场（`/root/union-lab` 目录保留，随时可重做）：

```bash
umount /root/union-lab/mnt
docker rm -f union-demo
```

---

## 参考资料

- [Storage drivers](https://docs.docker.com/engine/storage/drivers/) ｜ [OverlayFS storage driver](https://docs.docker.com/engine/storage/drivers/overlayfs-driver/) ｜ [Select a storage driver](https://docs.docker.com/engine/storage/drivers/select-storage-driver/)
- [OverlayFS 文档（kernel.org）](https://docs.kernel.org/filesystems/overlayfs.html) — lowerdir/upperdir/workdir 与 whiteout 的权威定义
- [Docker Engine 24.0 release notes（移除 aufs 驱动）](https://docs.docker.com/engine/release-notes/24.0/) ｜ [deprecated features](https://docs.docker.com/engine/deprecated/)
- 本机实测（2026-08-21）：WSL2 Ubuntu-22.04（root）、内核 6.6.87.2（无 aufs、有 overlay）、Docker Engine 29.1.3（overlayfs）、nginx:alpine；`/root/union-lab` 与真容器挂载检查的全部命令与输出为本机真实运行结果；`Step n/m` 构建输出为传统构建器的历史教学示例
