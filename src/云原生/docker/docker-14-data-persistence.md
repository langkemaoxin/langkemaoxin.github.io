---
title: 数据持久化——从容器一删数据就没，滚到三种挂载（师生对话实录）
sidebarGroup: Docker 系列
shortTitle: 14 数据持久化
order: 14
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - 数据持久化
  - 对话实录
description: 师生对话实录课：0 基础学生与教学大师的 Docker 数据持久化控制台逐字稿，从「容器一删数据就没」一路问到命名卷、bind、tmpfs、匿名卷与备份，实验全部 WSL 实机真跑。
---

> **Docker 系列 · 第 14/33 篇**
> 上一篇：[《Harbor 使用——用案例拉取与推送镜像》](/云原生/docker/docker-13-harbor-usage) · 下一篇：[《Docker 网络——从 localhost 不通滚到能用名字互访》](/云原生/docker/docker-15-network)

---

## 写在前面

Docker 系列学到第 14 篇，容器命令、自制镜像都熟了，但有个问题一直没敢细想：我在容器里跑了个 MySQL，测试数据灌了两周。某天要升级镜像版本，按套路 `docker rm` 旧容器、`docker run` 新容器——**库没了，两周白干**。

容器不是挺好用的吗，怎么数据说没就没？「把数据存到容器外面」这句话到处都能搜到，可 Volume、bind mount、tmpfs 这些名词我始终分不清谁是谁。

所以继续用上一个办法：**让 AI 当老师，我当学生，每课只讲一个概念，我有问题就打断，没问题就继续**。这场对话从「容器里写的文件到底放在哪」开始，一路问到三种挂载各自的脾气、匿名卷怎么悄悄堆满磁盘、以及数据库的卷到底该怎么备份。

课程路线图（走到哪算哪）：

> ① 容器里写的文件去哪了 → ② 命名卷：数据活得比容器久 → ③ 打开卷看真身 → ④ bind：宿主机和容器同一份文件 → ⑤ 只读与严格模式 → ⑥ 挂上去 = 盖住 → ⑦ tmpfs：不想落盘的数据 → ⑧ 匿名卷与 prune → ⑨ 备份与迁移 → ⑩ 进阶：借工具与换后端

环境：WSL2 Ubuntu-22.04（root）+ Docker Engine 29.1.3。为了实验轻快，全程用 busybox + `/data` 里的一个 `note.txt` 当「数据库」的替身——镜像小、命令短，道理和数据完全一样。官方入口：[Storage](https://docs.docker.com/engine/storage/)。

---

## 第 1 课：容器里写的文件，第二天怎么没了

**🧑‍🏫 老师：**

先把你丢数据的事故复现一遍，看清楚它到底是怎么丢的。

起一个容器，往 `/tmp` 写一个文件：

```bash
docker run --name no-vol-demo busybox sh -c 'echo written-in-container > /tmp/note.txt && cat /tmp/note.txt'
```

```text
written-in-container
```

文件写进去了，当场能读。现在删掉这个容器，再起一个全新的，去找同一个文件：

```bash
docker rm no-vol-demo
docker run --rm busybox cat /tmp/note.txt
```

```text
no-vol-demo
cat: can't open '/tmp/note.txt': No such file or directory
```

没了。注意这两步里镜像都是同一个 busybox，变的只有容器。

要解释这件事，得回到你在[第 5 篇](/云原生/docker/docker-05-container-and-image)学过的分层。容器的文件系统是两层叠出来的：

```text
┌─ 容器 ─────────────────────────────┐
│  可写层（容器自己的、薄的）        │ ← 你 echo 进去的 note.txt 在这
│────────────────────────────────────│
│  只读镜像层（busybox 自带）         │ ← rm 容器不影响它
└────────────────────────────────────┘
```

镜像层是只读的，谁都不许改。容器里写文件，实际落在**可写层**——这一层不属于镜像，属于**这个容器**。`docker rm` 删的就是容器，可写层跟着一起被删，写在里面的东西自然就没了。

一句话总结本课：

> **容器文件系统 = 只读镜像层 + 可写层；可写层随容器生灭。想让数据活得比容器久，就得在写的时候让它落到容器外面去。**

接下来几课讲的就是「怎么落出去」。先讲最主流的一种：卷。

---

## 插问 1：镜像里的文件和我写的文件，到底什么关系？

**🧑‍🎓 学生：** 你说镜像层只读、可写层是容器的——那我在容器里改一个镜像自带的文件，比如改 busybox 里的 `/etc/motd`，改的是镜像吗？会不会把镜像改坏？

**🧑‍🏫 老师：**

不会，镜像永远改不坏。这里有个机制叫**写时复制**（copy-on-write）：你第一次要改镜像层的某个文件时，Docker 先把它从镜像层复制一份到可写层，然后在副本上改。之后你再读这个路径，看到的都是可写层里那份副本，镜像里的原件被「盖」在下头，原封不动。

所以同一个路径在容器里有两个身份：

- 只**读**它 → 读到的是镜像层原件（还没被改过时）；
- 一**写**它 → 触发复制，从此这个文件在可写层里有了自己的副本。

验证只要一条命令：起两个容器，一个改 `/etc/motd`，另一个再去看——

```bash
docker run --rm busybox sh -c 'echo CHANGED > /etc/motd'
docker run --rm busybox cat /etc/motd
```

第二个容器看到的还是原来的内容，因为第一个容器改的那份在它自己的可写层里，随它一起消失了。

这也顺手解释了你的 MySQL 事故：数据库写入的是 `/var/lib/mysql`，路径在容器文件系统里，写的每一笔都落在可写层。`docker rm` 一执行，两周的数据跟着可写层一起被删。

> 一句话收口：**写镜像里的文件 = 写时复制到可写层；镜像永远只读，可写层永远随容器生灭。**

---

## 第 2 课：命名卷——第一次让数据活得比容器久

**🧑‍🏫 老师：**

思路现在很直白：数据不能放可写层，那就换一个地方放。Docker 里这个地方叫**卷**（volume），由 Docker 统一保管，跟容器是分开的两样东西。

先建一个卷，再让容器把 `/data` 指到这个卷上：

```bash
docker volume create mydata
docker run --rm -v mydata:/data busybox sh -c 'echo persist-me > /data/note.txt'


# =====================================================
# docker volume create mydata
# =====================================================
# 作用：在宿主机上显式创建一个名为 mydata 的 Docker 卷。
# 本质：Docker 会在宿主机（通常是 /var/lib/docker/volumes/mydata/_data）创建一个目录，由 Docker 托管，用于持久化数据。
```

`-v mydata:/data` 读作「把名为 mydata 的卷，挂到容器内的 `/data`」。冒号前是卷名，冒号后是容器内的路径。这条跑完容器就退出了（`--rm` 连容器都删了）。

见证时刻——起一个全新容器，挂上**同一个卷**，去读：

```bash
docker run --rm -v mydata:/data busybox cat /data/note.txt
```

```text
persist-me
```

还在。容器是新的、可写层是全新的，但 `note.txt` 活得好好的——因为上一容器写的时候，这个路径底下垫着的不是可写层，而是卷。

图钉成这样：

```text
┌─ 容器（会被 rm）──────────────────────┐
│  /data   ← 挂上之后，读写都落在卷上    │
└──────────────┬─────────────────────────┘
               │
┌─ Docker 保管（不受 rm 影响）─┴──────────┐
│  命名卷 mydata                          │
└─────────────────────────────────────────┘
```

回到 MySQL：`-v mysql-data:/var/lib/mysql`，之后随便删容器、换镜像版本，数据不动。这就是解法。

> 一句话收口：**命名卷 = Docker 替你保管的一块目录，容器生灭与它无关；`-v 卷名:容器路径` 把这块目录垫到路径下。**

---

## 插问 2：不先 `volume create`，直接 `-v` 行不行？

**🧑‍🎓 学生：** 你刚才先跑了 `docker volume create mydata`，再 `-v mydata:/data`。我懒得记两步，直接 `-v` 一个没建过的卷名，会报错吗？

**🧑‍🏫 老师：**

不报错，而且这正是要小心的地方。`-v` 遇到不存在的卷名会**静默创建**：

```bash
docker run --rm -v autodata:/data busybox echo auto-created-ok
docker volume ls | grep -E "autodata|mydata"
```

```text
auto-created-ok
local     autodata
local     mydata
```

卷悄悄就被造出来了。方便是方便，但埋着一个坑：**卷名打错一个字母，Docker 不会提醒你**，它直接给你建个新的空卷，应用「看起来正常地」对着一个空库跑起来了。等你发现数据不对，可能已经写进去不少了。

所以生产上的习惯是两个：

- 脚本里显式 `docker volume create` 先建，再挂——卷的存在与否一目了然；
- 或者用后面第 5 课讲的 `--mount` 严格写法，它对「不存在」的态度不一样。

> 一句话收口：**`-v` 挂不存在的卷名会静默新建；拼错卷名不报错，是最常见的「数据好像丢了」现场。**

---

## 第 3 课：打开卷，看数据躺在哪

**🧑‍🎓 学生：** 数据现在「在卷里」——可卷是什么？是内存？是云上的某个东西？我能不能亲眼看到那个 `note.txt` 现在存在哪？

**🧑‍🏫 老师：**

能看，一条 `inspect` 就把卷的底细翻出来：

```bash
docker volume inspect mydata
```

```text
[
    {
        "CreatedAt": "2026-08-25T14:46:55+08:00",
        "Driver": "local",
        "Labels": null,
        "Mountpoint": "/var/lib/docker/volumes/mydata/_data",
        "Name": "mydata",
        "Options": null,
        "Scope": "local"
    }
]
```

盯住 `Mountpoint`：`/var/lib/docker/volumes/mydata/_data`。卷不是什么神秘空间，就是宿主机文件系统里的**一个普通目录**，由 Docker 起名、Docker 管理。

验证同一份文件——容器里再补一行，宿主机直接去这个目录读：

```bash
docker run --rm -v mydata:/data busybox sh -c 'echo second-line >> /data/note.txt'
ls -l /var/lib/docker/volumes/mydata/_data/
cat /var/lib/docker/volumes/mydata/_data/note.txt
```

```text
total 4
-rw-r--r-- 1 root root 23 Aug 25 14:47 note.txt
persist-me
second-line
```

两行都在。所谓「挂载」，就是把这个宿主目录**盖**在容器内 `/data` 这条路径上：容器里对 `/data` 的读写，实际落在右边这个目录。

不过这里必须马上泼一盆冷水。官方文档（Storage 总览）的原话是：直接访问或操作卷里的数据属于 **unsupported、未定义行为**，可能把卷或数据弄坏。上面这样直接 `cat`，是为了看清原理；生产里备份卷有专门的姿势，第 9 课讲。另外 `Driver: local` 表示数据落在本机磁盘——这个驱动还能换成 NFS、云盘，那是第 10 课的事。

> 一句话收口：**卷 = `/var/lib/docker/volumes/<卷名>/_data` 这个 Docker 管的宿主目录；看得见，但生产里别直接伸手。**

---

## 第 4 课：bind——宿主机和容器同一份文件

**🧑‍🏫 老师：**

卷把「数据存哪」交给 Docker 保管，真身在 `_data` 深处，路径是哈希式的。但有两个很常见的需求它不顺手：

- 开发时改宿主机上的源码，希望容器里**立刻**看到，不想重新构建镜像；
- 配置文件、构建产物必须落在**我自己指定的路径**，比如工程目录里，不能藏到 Docker 的目录里去。

这种时候用第二种挂载：**bind**。写法跟卷只差一点——`-v` 的第一段从「卷名」换成**以 `/` 开头的宿主机绝对路径**：

```bash
mkdir -p /root/bind-demo
echo host-file-content > /root/bind-demo/host.txt
docker run --rm -v /root/bind-demo:/src busybox cat /src/host.txt
```

```text
host-file-content
```

反过来，容器里写，宿主机上也能看到：

```bash
docker run --rm -v /root/bind-demo:/src busybox sh -c 'echo data-by-container > /src/from-container.txt'
ls -l /root/bind-demo
cat /root/bind-demo/from-container.txt
```

```text
total 8
-rw-r--r-- 1 root root 18 Aug 25 14:49 from-container.txt
-rw-r--r-- 1 root root 18 Aug 25 14:48 host.txt
data-by-container
```

两份文件躺在同一个目录里。注意 `from-container.txt` 的属主是 `root:root`——容器里默认 root 干活，写出来的东西落到宿主机也是 root 的，这个细节在多用户机器上偶尔会咬人。

再验「立刻看到」。起一个**长驻**容器，宿主机上追加一行，不重启容器，再进去读：

```bash
docker run -d --name bind-live -v /root/bind-demo:/src busybox sleep infinity
docker exec bind-live cat /src/host.txt
echo hot-update-line >> /root/bind-demo/host.txt
docker exec bind-live cat /src/host.txt
docker rm -f bind-live
```

```text
host-file-content
host-file-content
hot-update-line
```

容器没重启，第二次 `exec` 就读到了新行。所谓「双向实时」其实没有任何魔法：两边操作的是**同一份磁盘文件**，不存在复制，也就不存在延迟。这就是本地开发挂源码目录的原理，[第 16 篇](/云原生/docker/docker-16-compose)里它会写成 `./html:/usr/share/nginx/html`。

顺带说一句，bind 不只能挂目录，单个文件也能挂——官方文档举的例子就是把宿主机的 `/etc/resolv.conf` 挂进容器管 DNS：

```bash
echo 'nameserver 8.8.8.8' > /root/single.conf
docker run --rm -v /root/single.conf:/etc/resolv.conf busybox cat /etc/resolv.conf
```

```text
nameserver 8.8.8.8
```

> 一句话收口：**bind = 把宿主机的一个路径原样盖进容器，两边同一份文件；开发热更新和「路径我说了算」用它在行。**

---

## 插问 3：卷和 bind 都是「放到容器外面」，什么时候用哪个？

**🧑‍🎓 学生：** 我看卷和 bind 好像干的是同一件事——都是把数据放到容器外面。那到底怎么选？

**🧑‍🏫 老师：**

判断标准就一条：**这块数据的「家」应该由谁定。**

- 数据的家由 **Docker 定**（它起名、它管理、你只引用名字）→ 用卷。数据库的数据目录是典型：你不关心文件具体落在哪，只关心它别丢、别被随手改坏。
- 数据的家由 **你定**（就是宿主机上某个具体路径）→ 用 bind。源码、配置文件是典型：它们本来就在工程目录里，进 Git、被编辑器打开，你不可能把它们搬进 `/var/lib/docker/volumes/` 的某个哈希目录。

还有几条实际差别，列表对着记：

| | 命名卷 | bind |
|---|---|---|
| 源由谁定 | Docker，路径带哈希 | 你，绝对路径 |
| 换台机器 | 卷名照用，Docker 搬家 | 路径必须一模一样，否则对不上 |
| 首次挂到非空路径 | 镜像内容先拷进卷（第 6 课看） | 宿主目录直接盖上去 |
| 适合 | 数据库、中间件数据 | 源码热更新、共享配置 |

官方的建议也简单：**存数据，优先卷**。bind 强耦合宿主机路径，把它留在开发机和配置分发这两个场景里。

> 一句话收口：**数据的家 Docker 定 → 卷；的家你定 → bind；存数据优先卷。**

---

## 第 5 课：只读挂载，以及 `-v` 的一个静默坑

**🧑‍🏫 老师：**

挂配置文件给容器时经常有一个要求：容器只许读，不许改。加一个 `:ro` 就行：

```bash
docker run --rm -v /root/bind-demo:/src:ro busybox sh -c 'echo x > /src/new.txt'
```

```text
sh: line 0: can't create /src/new.txt: Read-only file system
```

注意这个报错的名字：`Read-only file system`。拒绝发生在**内核的文件系统层**，不是 Docker 在用户态模拟的——容器里的进程无论怎么绕，都绕不过内核的这道拒绝。读完全不受影响。[第 17 篇](/云原生/docker/docker-17-https-nginx)里给 nginx 挂私钥时用的就是这个：就算容器被打穿，攻击者也改不了、偷不走钥匙。

一个容器可以同时挂好几种东西，怎么看它到底挂了什么？`inspect` 里的 `Mounts` 字段是总账：

```bash
docker run -d --name lab-mount-demo -v mydata:/data -v /root/bind-demo:/src:ro busybox sleep infinity
docker inspect --format '{{json .Mounts}}' lab-mount-demo
```

```text
[
    {
        "Type": "volume",
        "Name": "mydata",
        "Source": "/var/lib/docker/volumes/mydata/_data",
        "Destination": "/data",
        "Driver": "local",
        "Mode": "z",
        "RW": true,
        "Propagation": ""
    },
    {
        "Type": "bind",
        "Source": "/root/bind-demo",
        "Destination": "/src",
        "Mode": "ro",
        "RW": false,
        "Propagation": "rprivate"
    }
]
```

两条记录并排读：

| 字段 | 第一条 | 第二条 |
|------|--------|--------|
| `Type` | `volume`（卷） | `bind`（bind 挂载） |
| `Source` | 卷的真身目录 | 你指定的宿主路径 |
| `RW` | `true` 可写 | `false`——`:ro` 的铁证 |

删卷之前先查「谁在用它」，一条过滤命令的事：

```bash
docker ps --filter volume=mydata --format '{{.Names}}'
```

```text
lab-mount-demo
```

演示完删掉这个容器，接着说本课的坑。`-v` 对 bind 的源路径有个非常宽容的行为：**路径不存在时，它不报错，默默给你建一个空目录**。演示「想挂 `/root/no-such-dir`，但这个目录其实不存在」：

```bash
ls /root/no-such-dir
docker run --rm -v /root/no-such-dir:/src busybox ls -A /src
ls -ld /root/no-such-dir
```

```text
ls: cannot access '/root/no-such-dir': No such file or directory
（第二条命令没有任何输出——容器内 /src 是空的）
drwxr-xr-x 2 root root 4096 Aug 25 14:49 /root/no-such-dir
```

三次输出连起来读：跑之前目录不存在；容器里的 `/src` 是空的、没有任何报错；跑完之后，宿主机上**多了一个空目录**。路径打错一个字母，你得到的就是这么一个「看似正常」的空挂载。

想挂**文件**时这个坑更阴——文件名打错了，Docker 建不出文件，只会建目录：

```bash
docker run --rm -v /root/no-such.conf:/etc/app.conf busybox ls -ld /etc/app.conf
```

```text
drwxr-xr-x    2 root     root        4096 Aug 25 06:48 /etc/app.conf
```

应用等的是配置文件，拿到的却是一个**空目录**，报出来的错误经常离题万里。

所以脚本里推荐用严格写法 `--mount`，源路径不存在时**立刻报错**，绝不自作主张：

```bash
docker run --rm --mount type=bind,source=/root/no-such-dir,target=/src busybox echo hi
```

```text
docker: Error response from daemon: invalid mount config for type "bind":
bind source path does not exist: /root/no-such-dir

Run 'docker run --help' for more information
```

`-v` 短、适合手敲；`--mount` 啰嗦、但每一段都显式（`type=bind`、`source=`、`target=`），写进脚本和文档里更不容易出事。

> 一句话收口：**`:ro` 是内核级只读；`-v` 源路径不存在会静默建空目录，脚本里用 `--mount` 让它当场报错。**

---

## 第 6 课：挂上去 = 盖住

**🧑‍🎓 学生：** 我刚才自己试了个东西：给 nginx 挂了个空目录到它的网页目录，结果网页打不开了，进去一看 `index.html` 都没了——镜像里明明自带的，怎么挂一下还把文件挂丢了？

**🧑‍🏫 老师：**

文件没丢，它只是被**盖住**了。这正是本课要讲的「遮蔽」。

先看正常状态，nginx 镜像的网页目录里有两个文件：

```bash
docker run --rm nginx:alpine ls -A /usr/share/nginx/html
```

```text
50x.html
index.html
```

现在按你说的，bind 一个**空目录**盖上去：

```bash
mkdir -p /root/empty-dir
docker run --rm -v /root/empty-dir:/usr/share/nginx/html nginx:alpine ls -A /usr/share/nginx/html
```

```text
（空——什么都没有）
```

`index.html` 不见了。但注意，它没有被删——挂载的本质是「把一块东西**盖**到某条路径上」，盖上去之后，这条路径看到的就是盖上的那块，底下原有的内容只是暂时看不见。官方文档的类比很形象：往 `/mnt` 挂一块 U 盘，你看到的是 U 盘的内容，磁盘上原有文件并没有被删。把挂载去掉（不挂直接跑），上面第一条命令证明了文件都好好的。

有意思的对照来了。同样挂到这个路径，换成**空命名卷**：

```bash
docker volume create html-vol
docker run --rm -v html-vol:/usr/share/nginx/html nginx:alpine ls -A /usr/share/nginx/html
```

```text
50x.html
index.html
```

文件**在**。因为卷有个特殊待遇：第一次把一个**空卷**挂到容器里**已有内容**的路径时，Docker 会先把这个路径下的镜像内容**拷贝进卷**（术语叫 pre-populate，垫底），再完成挂载。卷里面不是空的，所以看得到文件。甚至换个容器挂这个卷，文件还在：

```bash
docker run --rm -v html-vol:/x busybox ls -A /x
```

```text
50x.html
index.html
```

三行对照钉成一张表：

| 挂载方式 | 挂到该路径后看到 | 为什么 |
|------|------|------|
| 不挂载 | `50x.html  index.html` | 镜像层自带 |
| bind 一个空目录 | 空 | 宿主目录原样盖上去，没有垫底 |
| 空命名卷 | `50x.html  index.html` | 首次挂载先把镜像内容拷进卷 |

所以你的 nginx 打不开，不是数据丢了，是空目录把 `index.html` 盖住了。反过来这个行为也能被利用：第 9 课备份、以及「想保留镜像默认配置再覆盖一部分」的场景，靠的就是卷的垫底。

> 一句话收口：**挂载是「盖」不是「搬」：bind 原样盖住底下内容；空命名卷首次挂载会先把镜像内容拷进卷。**

---

## 第 7 课：tmpfs——不想落盘的数据

**🧑‍🏫 老师：**

前面所有数据的目标都是「留在磁盘上」。现在反过来看一类需求：有些数据**恰恰不该**写成任何磁盘文件——登录令牌、会话缓存、一次性的敏感中间结果。磁盘上的东西会进快照、进备份、被恢复软件翻出来，这类数据理想的家是**内存**。

Docker 给的第三种挂载就是 tmpfs：

```bash
docker run --rm --tmpfs /scratch busybox sh -c 'mount | grep scratch; echo hello > /scratch/f && cat /scratch/f'

# --tmpfs /scratch	在容器内挂载一个 tmpfs 文件系统到 /scratch 目录	
```

```bash
tmpfs on /scratch type tmpfs (rw,nosuid,nodev,noexec,relatime)
hello

# 文件系统类型	tmpfs	这是一个内存文件系统
# 挂载点	/scratch	挂载在容器内的这个目录
# 类型	tmpfs	文件系统类型（再次确认）
# 挂载选项	rw	读写：可读可写
# nosuid	禁止 SUID/SGID：不允许设置特殊权限位，防止提权攻击
# nodev	禁止设备文件：不能在此文件系统上创建设备节点（如 /dev/sda）
# noexec	禁止执行：不能在此文件系统上运行任何二进制程序
# relatime	相对更新时间：只在文件被修改或访问时间早于修改时间时更新访问时间戳，减少磁盘I/O
# size=65536k	大小限制：此 tmpfs 最大为 64MB（65536 KB）
```

`mount` 的输出证明 `/scratch` 是一块真正的 tmpfs（内存文件系统），写得进、读得出。它也有 `--mount type=tmpfs,dst=/app` 的写法，如：

```bash
docker run --rm \
  --mount type=tmpfs,destination=/scratch,tmpfs-size=128M,tmpfs-mode=1777 \
  busybox sh -c 'df -h /scratch'
```

`inspect` 里 `Type` 是 `tmpfs`、`Source` 为空——内存挂载没有「源」,举个例子

```bash
# 先运行一个带有 tmpfs 的容器
docker run -d --name test-tmpfs --tmpfs /app:size=128M busybox sleep 3600

# 查看完整的 Mounts 信息
docker inspect test-tmpfs --format='{{json .Mounts}}' | jq

[{"Type":"tmpfs","Source":"","Destination":"/app","Mode":"","RW":true,"Propagation":""}]
```

容器一停，这块内存随之回收，数据消失得干干净净——这正是这类数据想要的待遇。

跟第 6 课呼应一下：tmpfs 盖上去同样会遮蔽原内容。盖在 `/etc` 上看一眼：

```bash
docker run --rm --tmpfs /etc busybox ls -A /etc
```

```text
hostname
hosts
resolv.conf
```

镜像自带的 `passwd`、`group` 都被盖住了。剩下的三个不是 tmpfs 里「原来就有」的，而是 Docker 挂完之后**重新注入**的网络文件。

然后是两个必须知道的脾气。第一，不传参数时，tmpfs 的容量上限默认是**宿主机内存的一半**：

```bash
free -m | head -2
docker run --rm --tmpfs /scratch busybox df -h /scratch


# free	显示系统内存使用情况
# -m	以 MB 为单位显示（-m = megabytes）
# |	管道符，将前一个命令的输出传递给后一个命令
# head -2	只显示前 2 行（标题行 + 第一行数据）
```

```text
              total        used        free      shared  buff/cache   available
Mem:            7942        1581        5651          35         709        6164
Filesystem                Size      Used Available Use% Mounted on
tmpfs                     3.9G         0      3.9G   0% /scratch
```

本机内存 7942MB，一半正好 3.9G。生产上不设限，等于给容器留了「吃掉宿主一半内存」的口子。用 `size=1m` 设硬上限，再故意灌 3MiB 撞墙：

```bash
docker run --rm --tmpfs /scratch:size=1m busybox sh -c 'dd if=/dev/zero of=/scratch/f bs=1M count=3; ls -l /scratch'


# dd if=/dev/zero of=/scratch/f bs=1M count=3	
# 关键操作：从 /dev/zero（无限空字符）读取数据，每次写 1MB（bs=1M），共写 3 次（count=3），目标文件是 /scratch/f
```

结果返回如下：

```text
dd: error writing '/scratch/f': No space left on device
2+0 records in
1+0 records out
1048576 bytes (1.0MB) copied, 0.000992 seconds, 1008.1MB/s
total 1024
-rw-r--r--    1 root     1048576 Aug 25 06:50 f
```

`dd` 计划写 3 块×1MiB，写到第 2 块就撞上 `No space left on device`——`size` 是硬顶，不是建议。其它常用参数还有 `mode`（挂载点权限）、`uid`/`gid`（属主）、`noexec`（禁止执行里面的程序）：

```bash
docker run --rm --tmpfs /scratch busybox ls -ld /scratch
# =================================执行结果==================================
drwxrwxrwt    2 root     root            40 Aug 25 06:50 /scratch
# ===========================================================================



# 挂载 tmpfs 到 /scratch，并设置权限模式为 700，所有者为 uid=1000，gid=1000
docker run --rm --tmpfs /scratch:mode=700,uid=1000,gid=1000 busybox ls -ld /scratch
# =================================执行结果==================================
drwx------    2 1000     1000            40 Aug 25 06:50 /scratch
# ===========================================================================


docker run --rm --tmpfs /t:noexec busybox sh -c 'printf "#!/bin/sh\necho pwned\n" > /t/s && chmod +x /t/s && /t/s'
# =================================执行结果==================================
sh: line 0: /t/s: Permission denied
# ===========================================================================
```

第三个实验里，往 noexec 的 tmpfs 放了一个加过执行权限的脚本，照样被拒——临时目录拿来执行来路不明的二进制，这条路被焊死了。

> 一句话收口：**tmpfs = 内存盘，容器停了就没了；默认能吃宿主一半内存，生产必设 `size=`。**

---

## 插问 4：tmpfs 和「限了容量的小卷」，到底差在哪？

**🧑‍🎓 学生：** 既然 tmpfs 也是「一块空间、可限容量」，那我建个小容量的卷，效果不是一样吗？为什么不统一用卷？

**🧑‍🏫 老师：**

差在一个根本问题：**数据到底碰不碰磁盘**。

卷再小，也是磁盘上的目录（第 3 课看过真身），写入会落盘、会进快照和备份、容器删了也还在。tmpfs 的数据从头到尾在内存里，容器一停、内存一回收，什么都不剩——**这份「留不下」本身就是要的效果**。放令牌就是典型：你巴不得它消失得越干净越好。

另外还有几条实际差别：

- 性能方向相反：tmpfs 是内存速度，但吃内存预算；卷走磁盘，容量便宜；
- tmpfs 只在 Linux 上有（Windows 容器没有）；
- tmpfs 不能在容器之间共享——两个容器各挂各的，是两块不同的内存；卷挂同名就是同一份。

一条流行说法顺手修正一下：tmpfs 常被讲成「绝不落盘」。严格说不对——内存吃紧时，tmpfs 里的页**可能被换出到 swap**（本机 `free -m` 就躺着 4096MB swap）。「不写容器文件系统」永远成立；真有「物理上绝不落盘」的硬需求，得从部署层面把 swap 关掉。

> 一句话收口：**小卷 = 磁盘上小一块，还在；tmpfs = 内存里一块，消失是特性；严格不落盘还要看 swap。**

---

## 第 8 课：匿名卷——`prune` 到底删什么

**🧑‍🏫 老师：**

到目前为止，卷都是你起名字的。还有一种：只给容器内路径、不给卷名：

```bash
docker run --rm -d --name anon-rm-demo -v /data busybox sleep 60
```

`-v /data` 只有一段。Docker 会自动挂一个卷上去，名字是一串 64 位哈希——你叫不出它、也没打算复用它。这就是**匿名卷**。看它的档案：

```bash
docker inspect anon-rm-demo --format '{{json .Mounts}}'
```

```text
[
    {
        "Type": "volume",
        "Name": "8663d0ce4637adce0a7d00ee02b0c483f1776ef5f3e478158a22f78e2baa2426",
        "Source": "/var/lib/docker/volumes/8663d0ce4637adce0a7d00ee02b0c483f1776ef5f3e478158a22f78e2baa2426/_data",
        "Destination": "/data",
        "Driver": "local",
        "Mode": "",
        "RW": true,
        "Propagation": ""
    }
]
```

Type 还是 volume，Name 是哈希。为什么会有这种东西？因为很多官方镜像的 Dockerfile 里写了 `VOLUME /xxx`（[第 9 篇](/云原生/docker/docker-09-dockerfile)提过），它**声明**了「这个路径该挂卷」；你 `docker run` 时没给卷名，引擎就自动补一个匿名卷。开头那个 MySQL，如果一直没挂命名卷，数据其实一直躺在匿名卷里——而匿名卷的命运，取决于容器怎么被删。三种删法，三种命运。

**一、`--rm` 退出：匿名卷连带一起删。** 就是最上面那个 `anon-rm-demo`，停掉它：

```bash
docker stop anon-rm-demo
docker volume ls -f dangling=true
```

dangling（悬空）列表里**没有**那串哈希——容器退出时 `--rm` 把它的匿名卷一起带走了。

**二、`docker rm` 不带 `-v`：卷留下来，变成悬空卷。**

```bash
docker run --name anon-keep -v /data busybox sh -c 'echo keep > /data/f'
docker rm anon-keep
docker volume ls -f dangling=true
```

```text
DRIVER    VOLUME NAME
local     0bdca559ef5ae320af3135666bf559c26c509c4b237760a01dee192689c9b566
local     4a050c9a131017852fed1f132c4555e44bda52f01ab82c61f2a5dead5c335383
local     85a415343a779b7d5c80a1be465bcd710875b399f67c5eb45342041235a84d33
local     890d9531d7279de5dcce30acaf6b70e99cb7893822a2f3ac4a2c380514508349
local     autodata
local     compose-lab_redis-data
local     mydata
```

容器没了、卷还在、再没有任何容器引用它——这就是悬空卷。列表里那几串哈希就是这台机器日积月累攒下的（有我这次实验造的，也有更早留下的）。**生产机器磁盘悄悄变满，一大元凶就是它**：每次 `docker run` 一个带 `VOLUME` 的镜像再 `docker rm`，就多一个没人认领的哈希目录。

**三、`docker rm -v`：手动连卷一起删。**（和 `--rm` 效果一样，只是时机由你定）

```bash
docker run --name lab-rmv-demo -v /data busybox sh -c 'echo x > /data/f'
docker rm -v lab-rmv-demo
```

删完之后悬空列表里找不到它的哈希——卷被一并带走了。而命名卷哪怕遇到 `rm -v` 也**原样保留**：

```bash
docker run --name lab-named-rm -v mydata:/data busybox echo hi
docker rm -v lab-named-rm
docker volume inspect mydata --format 'mydata still alive: {{.Name}}'
```

```text
mydata still alive: mydata
```

两条安全边界就齐了：`rm -v` 只连带**匿名**卷，数据库的命名卷不会被它误伤；想让匿名卷跟容器同生共死，要么 `run --rm`、要么 `rm -v`，两条都不做，悬空卷就攒下了。

清悬空卷用 `prune`。先故意建一个从未被使用的命名卷 `orphan`，再 prune，看它敢删谁：

```bash
docker volume create orphan
docker volume prune -f
docker volume ls | grep -E "orphan|mydata"
```

```text
Deleted Volumes:
890d9531d7279de5dcce30acaf6b70e99cb7893822a2f3ac4a2c380514508349
0bdca559ef5ae320af3135666bf559c26c509c4b237760a01dee192689c9b566
85a415343a779b7d5c80a1be465bcd710875b399f67c5eb45342041235a84d33
4a050c9a131017852fed1f132c4555e44bda52f01ab82c61f2a5dead5c335383

Total reclaimed space: 89.9MB
local     mydata
local     orphan
```

prune 删掉了四个匿名悬空卷、回收 89.9MB；`orphan` 这个显式命名的卷哪怕从未被任何容器用过，**也没被删**。`--help` 里写明：要连未使用的命名卷一起删，得显式加 `-a`（`--all`）——生产上慎用，除非你很清楚机器上每个卷的来历。要删指定卷，永远用 `docker volume rm <卷名>`。

> 一句话收口：**匿名卷 = 引擎自动挂的哈希卷；`--rm`/`rm -v` 连带删、`rm` 不带 `-v` 变悬空；`prune` 默认只清悬空匿名卷，`-a` 才动命名卷。**

---

## 插问 5：`docker run -v` 和 `docker rm -v`，同一个 v 是一个意思吗？

**🧑‍🎓 学生：** 这俩 `-v` 长得一模一样，我有点慌——不会哪天把挂载的卷误删了吧？

**🧑‍🏫 老师：**

慌得有道理，但结论先放心：**它俩是两个不同命令各自的旗标，只是恰好都选了字母 v**。

- `docker run -v`：volume 挂载，**挂上**；
- `docker rm -v`：`--volumes` 的缩写，删容器时**连带删掉它创建的匿名卷**。

一个是「给」，一个是「带走」。而且刚才第三种删法验证过：`rm -v` 只带走匿名卷，`-v mydata:/data` 挂的命名卷毫发无损。所以「升级 MySQL 容器」的安全流程是成立的：

```bash
docker rm -v old-mysql            # 匿名卷（如果有）带走，命名卷不动
docker run -v mysql-data:/var/lib/mysql ... mysql:new-tag   # 数据原样回来
```

真正要慌的不是 `rm -v`，而是两件事：`docker volume rm` 敲错卷名（它删卷是不商量的），以及 `docker volume prune -a`（连未使用的命名卷一起清）。这两个动手前先 `docker ps --filter volume=<名>` 确认没有容器在用。

```shell
# 删除 名为 mydata的数据卷
docker volume rm mydata

# -f 或 --force：强制删除正在被容器使用的卷
docker volume rm -f mydata

# 清理所有没有被容器使用的卷
docker volume prune

# 强制清理，不提示确认
docker volume prune -f
```



> 一句话收口：**`run -v` 是挂、`rm -v` 是删容器时带走匿名卷；命名卷对两者都免疫，怕的是 `volume rm` 和 `prune -a`。**

---

## 第 9 课：备份与迁移——临时容器 + tar

**🧑‍🏫 老师：**

第 3 课说过，直接去 `/var/lib/docker/volumes/…/_data` 里操作是官方 unsupported。那卷里的数据怎么备份、怎么搬到另一台机器？官方套路与存储位置无关：**起一个一次性容器，把卷挂进去，用 `tar` 打包到一个 bind 目录里带走**。继续用 `mydata` 开工：

```bash
mkdir -p /root/backup
docker run --rm -v mydata:/data -v /root/backup:/backup busybox tar cvf /backup/mydata.tar -C /data .
# docker run --rm	运行一个一次性容器，执行完后自动删除
# -v mydata:/data	把名为 mydata 的 Docker 卷挂载到容器内的 /data
# -v /root/backup:/backup	把宿主机的 /root/backup 目录挂载到容器内的 /backup 
# busybox	使用轻量级 Linux 镜像
# tar cvf /backup/mydata.tar -C /data .	把 /data 目录下的所有内容打包成 /backup/mydata.tar


ls -l /root/backup
docker run --rm -v /root/backup:/backup busybox tar tvf /backup/mydata.tar
```

```text
./
./note.txt
total 4
-rw-r--r-- 1 root root 2560 Aug 25 14:53 mydata.tar
drwxr-xr-x root/root         0 2026-08-25 06:46:58 ./
-rw-r--r-- root/root         23 2026-08-25 06:47:23 ./note.txt
```

拆开看这条命令干了三件事：`-v mydata:/data` 把要备份的卷挂进来；`-v /root/backup:/backup` 用第 4 课的 bind 当出口；`tar cvf /backup/mydata.tar -C /data .` 先进 `/data` 再打包——所以归档里是 `./note.txt` 这种相对路径，恢复时不会拼出奇怪的绝对路径。

顺带一个时区细节：`tar` 列表里的时间（06:47）比宿主机 `ls`（14:53）小 8 小时——`tar` 显示的是容器内 UTC，宿主机是东八区，**同一份文件，两个时区的表**。在实验输出里看到时间对不上，先想起这一条。

恢复 = 一个空白新卷 + 把 `cvf` 换成 `xvf`：

```bash
docker volume create mydata-restored
docker run --rm -v mydata-restored:/data -v /root/backup:/backup busybox tar xvf /backup/mydata.tar -C /data
docker run --rm -v mydata-restored:/data busybox cat /data/note.txt
```

```text
./
./note.txt
persist-me
second-line
```

两行笔记原样回来了。跨主机迁移也就是把 `mydata.tar` 拷到新机器，重复这三条。

真实容器可能挂了好几个卷，一个个卷名去查很烦。`--volumes-from <容器>` 让新容器**原样继承**目标容器挂着的全部卷和 bind：

```bash
docker run -d --name db-like -v mydata:/var/lib/data busybox sleep infinity
docker run -d --name helper --volumes-from db-like busybox sleep infinity
docker inspect --format '{{range .Mounts}}{{.Type}}  {{.Source}} -> {{.Destination}}{{println}}{{end}}' helper
docker exec helper cat /var/lib/data/note.txt
```

```text
volume  /var/lib/docker/volumes/mydata/_data -> /var/lib/data

persist-me
second-line
```

helper 的 `docker run` 里**一个 `-v` 都没写**，挂载却原样跟来了。于是「备份某个容器的全部数据」缩成一行：

```bash
docker run --rm --volumes-from db-like -v /root/backup:/backup busybox tar cvf /backup/db-like.tar /var/lib/data
```

```text
tar: removing leading '/' from member names
var/lib/data/
var/lib/data/note.txt
```

（`tar` 会把成员名开头的 `/` 去掉，提示属正常行为。）

> 一句话收口：**备份 = 临时容器把卷挂进去、tar 到 bind 目录带走；恢复 = 空卷 + xvf；整容器用 `--volumes-from`。**

---

## 第 10 课：进阶——借工具与换后端

**🧑‍🎓 学生：** 主线三种挂载我会了。但我在别处还看到过两种说法：一种说可以把别的镜像「挂」进容器里当工具箱，一种说卷能落到 NFS 上——这两个是怎么回事？

**🧑‍🏫 老师：**

两个都真实存在，各用一小节讲清边界，用到再回来查。

### Image Mount：把另一张镜像只读挂进来

[第 7 篇](/云原生/docker/docker-07-enter-container)排障靠 `docker exec … sh`，但有的镜像故意不带 shell。Image Mount 的思路是：把 busybox 这张镜像的内容**只读盖**进当前容器，原镜像一个字节不动：

```bash
docker run --rm --mount type=image,source=busybox,dst=/dbg alpine ls /dbg/bin | head -6
```

```text
[
[[
acpid
add-shell
addgroup
adduser
```

busybox 的工具全在 `/dbg/bin` 下了（本机 29.1.3 上每次跑 `type=image` 还会先打一行 `WARNING: Image mount is an experimental feature`——实验特性，别上生产）。

马上撞一个坑：**文件看得见 ≠ 跑得动**。默认 `busybox:latest` 按 glibc 构建，alpine 是 musl libc，直接执行报错还特别误导：

```bash
docker run --rm --mount type=image,source=busybox,dst=/dbg alpine /dbg/bin/echo hi
```

```text
exec /dbg/bin/echo: no such file or directory
```

文件明明在，报的却是「没有这个文件」——musl 系统加载不了 glibc 二进制时的经典症状。换 musl 构建的 busybox 就好：

```bash
docker run --rm --mount type=image,source=busybox:musl,dst=/dbg alpine /dbg/bin/echo hello-from-mounted-image
```

```text
hello-from-mounted-image
```

只读同样是内核拒绝：`touch /dbg/x` → `Read-only file system`。还有三条边界：只认 `--mount type=image`，没有 `-v` 写法（`-v busybox:/dbg` 会被解析成名为 busybox 的**命名卷**）；需要 containerd image store（本机 `docker info` 已是）；源镜像不会自动 pull。注意它**不是持久化**——不产生任何数据，只是借工具。

### 卷驱动：数据不一定在本机磁盘

第 3 课 `inspect` 里的 `Driver: local` 表示数据在本机目录树。换成 NFS 驱动，数据就能落到一台共享存储上（命令来自官方文档，本机没接 NFS，未实测）：

```bash
docker volume create --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw,nfsvers=4 \
  --opt device=:/path/on/nfs \
  nfs-data
```

之后 `-v nfs-data:/data` 照常用，容器无感。同一思路还能对接 CIFS、云盘。这也是第 9 课「备份不抠宿主机目录」的另一个理由：换了驱动之后，本机压根没有 `_data` 目录可抠。细节以[官方卷文档](https://docs.docker.com/engine/storage/volumes/)为准。

> 一句话收口：**image mount 是借工具不是存数据（只读、实验特性、注意 glibc/musl）；卷驱动把「local 目录」换成 NFS 等远端，容器侧用法不变。**

---

## 小结

十课连起来，其实是同一个问题「数据凭什么还在」的十层答案：

| 课 | 你带走的 | 一句话 |
|---|---|---|
| 1 | 可写层 | 数据写在容器可写层，容器一删就没 |
| 2 | 命名卷 | `-v 卷名:路径`，数据活得比容器久 |
| 3 | 真身 | `/var/lib/docker/volumes/<名>/_data`，别直接伸手 |
| 4 | bind | 宿主与容器同一份文件，热更新零延迟 |
| 5 | `:ro` / `--mount` | 内核级只读；`-v` 打错路径会静默建空目录 |
| 6 | 遮蔽 | 挂上去是盖住；空卷会先拷镜像内容垫底 |
| 7 | tmpfs | 内存盘，默认上限宿主内存一半，设 `size=` |
| 8 | 匿名卷 | `rm` 不带 `-v` 变悬空；`prune` 默认只清匿名 |
| 9 | 备份 | 临时容器 + tar；整容器 `--volumes-from` |
| 10 | 进阶 | image mount 借工具；卷驱动上 NFS |

按需求选型的速查表：

| 需求 | 用什么 |
|------|--------|
| 数据库/中间件数据目录 | 命名卷 |
| 开发热更新、共享配置 | bind（开发机；能 `:ro` 就加） |
| 令牌等不该落盘的数据 | tmpfs（记得 `size=`；严格不落盘看 swap） |
| 容器里没有 shell，借工具 | image mount（不是持久化） |
| 跨主机共享数据 | 卷驱动（NFS 等） |
| 迁移/备份 | 临时容器 + tar |

下一篇 Compose 里，这篇的挂载写成 YAML 就长这样（认个脸即可，[第 16 篇](/云原生/docker/docker-16-compose)细讲）：

```yaml
services:
  db:
    image: mysql:8.4
    volumes:
      - db-data:/var/lib/mysql
      - ./init:/docker-entrypoint-initdb.d:ro

volumes:
  db-data: {}
```

**思考题**：为什么数据库镜像的 Dockerfile 要写 `VOLUME /var/lib/mysql`？不写会怎样？（提示：第 8 课——没挂命名卷时，数据落在哪、容器按哪种方式删除后，命运如何。）

下一篇：[《Docker 网络——从 localhost 不通滚到能用名字互访》](/云原生/docker/docker-15-network)。

---

## 本篇实验清理（可照抄）

```bash
docker rm -f lab-mount-demo bind-live tmp-demo anon-rm-demo anon-keep \
    lab-rmv-demo lab-named-rm db-like helper 2>/dev/null
docker volume rm mydata autodata mydata-restored orphan html-vol 2>/dev/null
rm -rf /root/bind-demo /root/backup /root/empty-dir /root/single.conf
```

---

## 参考资料

- [Docker Docs · Storage](https://docs.docker.com/engine/storage/) — 挂载类型总览；直接访问卷数据属 unsupported
- [Volumes](https://docs.docker.com/engine/storage/volumes/) — 生命周期、备份套路、卷驱动
- [Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/) / [tmpfs mounts](https://docs.docker.com/engine/storage/tmpfs/) / [Image mounts](https://docs.docker.com/engine/storage/image-mounts/)（实验特性）
- Linux 侧「挂载 = 盖上去」的内核版：[bind mount 实操](/Linux/basics/linux-06-bind-mount)
- 本机：WSL2 Ubuntu-22.04 + Docker Engine 29.1.3
