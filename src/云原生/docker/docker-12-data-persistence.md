---
title: 数据持久化——从容器一删库没了，滚到三种挂载
sidebarGroup: Docker 系列
shortTitle: 12 数据持久化
order: 12
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 从 MySQL 容器一删库没了开始，每次只加一种挂载：命名卷、bind、tmpfs、匿名卷与备份，像滚雪球一样看清数据凭什么还在。
---

> **Docker 系列 · 第 12/24 篇**
> 上一篇：[《Docker 网络——从 localhost 不通滚到能用名字互访》](/云原生/docker/docker-11-network) · 下一篇：[《Docker Compose 编排——从一个 Nginx 滚成一整栈》](/云原生/docker/docker-13-compose)

---

## 开头：MySQL 容器一删，库没了

你用容器跑了个 MySQL，测试数据灌了两周。某天升级镜像：`docker rm` 旧容器、`docker run` 新容器——**库没了，两周白干**。

根因就一句：容器文件系统 = **只读镜像层 + 一层可写层**（[第 5 篇](/云原生/docker/docker-05-container-and-image/)）。可写层属于这个容器，容器一删，写在里面的数据就没了。要让数据活得比容器久，得把「数据所在的那条路径」挂到容器外面去。

本篇不先背 Volume / Bind / tmpfs 名词表。实验始终用 **busybox + `/data`** 当「库」的替身（镜像小、命令短），**同一份笔记一路长大**：

| 雪球 | 你加上去的 | 当场能看见的效果 |
|------|------------|------------------|
| **1** | `-v mydata:/data` 命名卷 | 容器 `--rm` 没了，新容器里 `note.txt` 还在 |
| **2** | `volume inspect` | 真身在 `/var/lib/docker/volumes/mydata/_data` |
| **3** | bind 宿主目录 | 宿主机改文件，容器不重启就读到新行 |
| **4** | `:ro` | 容器内写被 `Read-only file system` 拦住 |
| **5** | `--tmpfs /scratch` | 写得进，容器一停就没了；`df` 能看到上限 |
| **6** | 只写 `-v /data`（匿名卷） | `--rm` 带走；`rm` 不带 `-v` 变悬空；`prune` 只删匿名 |
| **7** | 临时容器 + `tar` | 新卷里再 `cat` 出 `persist-me` |
| **8** 🧗 | 空卷垫底、子路径、Image Mount、NFS 驱动 | 借工具、跨主机，不是主线三种挂载 |

第一次读只走 **1～7**。带 🧗 的用到再回头。

输出均来自本机：WSL2 Ubuntu-22.04 + 原生 Docker Engine **29.1.3**。官方：[Storage](https://docs.docker.com/engine/storage/)、[Volumes](https://docs.docker.com/engine/storage/volumes/)、[Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)、[tmpfs](https://docs.docker.com/engine/storage/tmpfs/)、[Image mounts](https://docs.docker.com/engine/storage/image-mounts/)。

Linux 里「挂载是把一块东西盖到某条路径上」的内核版，见 [《bind mount 实操》](/Linux/basics/linux-06-bind-mount)。

---

## 雪球 1：命名卷——容器没了，笔记还在

这就是开头 MySQL 故事的解法。`--rm` 表示容器退出即删除——专门用来证明「容器没了，数据还在」。

```bash
docker volume create mydata
docker run --rm -v mydata:/data busybox sh -c 'echo "persist-me" > /data/note.txt'
```

一个全新容器挂上**同一个卷名**：

```bash
docker run --rm -v mydata:/data busybox cat /data/note.txt
```

```text
persist-me
```

容器是新的、镜像层是全新的，但 `note.txt` 还在——**数据跟着卷走，不跟着容器走**。MySQL 同理：`-v mysql-data:/var/lib/mysql`，之后随便删容器、换镜像版本，数据不动。

`-v mydata:/data` 里第一段没有 `/`，Docker 认成**卷名**。脚本里引用一个还不存在的命名卷，`-v` 会静默创建：

```bash
docker run --rm -v autodata:/data busybox echo 'auto-created ok'
docker volume ls | grep autodata
```

```text
auto-created ok
local     autodata
```

卷就这样被悄悄造出来了。拼错卷名时，应用会「看起来正常地」对着空卷丢数据。严格写法 `--mount` 放到雪球 3 和 bind 一起对照。

现在回头看刚才发生的事，挂载才有着落：

```text
┌─ 容器（会被 rm）──────────────────────┐
│  只读镜像层                            │
│  可写层  ← 不挂的话，笔记写在这里      │
│  /data   ← 盖上之后，读写都落在卷上    │
└──────────────┬─────────────────────────┘
               │ 挂载点替换
┌─ 宿主机（不受 rm 影响）─┴──────────────┐
│  命名卷 mydata（Docker 保管）          │
└────────────────────────────────────────┘
```

官方建议先记一句：**存数据用 Volume**。共享/开发文件、不想留在磁盘上的临时数据，后面几球再加。

---

## 雪球 2：打开卷，看数据躺在哪

**只多一条** `inspect`，还是那份 `note.txt`：

```bash
docker volume inspect mydata
```

```text
[
    {
        "CreatedAt": "2026-08-14T13:14:01Z",
        "Driver": "local",
        "Labels": null,
        "Mountpoint": "/var/lib/docker/volumes/mydata/_data",
        "Name": "mydata",
        "Options": null,
        "Scope": "local"
    }
]
```

`Mountpoint` 就是真身：`/var/lib/docker/volumes/<卷名>/_data`。再写一次并在宿主机直接读，对上同一份文件：

```bash
docker run --rm -v mydata:/data busybox sh -c 'echo "persist-me" > /data/note.txt && cat /data/note.txt'
ls -l /var/lib/docker/volumes/mydata/_data/
cat /var/lib/docker/volumes/mydata/_data/note.txt
```

```text
persist-me
-rw-r--r-- 1 root root 11 Aug 14 21:14 note.txt
persist-me
```

> ⚠️ 官方口径（Storage 总览，2026-07）：卷目录虽然在宿主机上、root 也确实读得到——上面就是这么演示的——但**直接访问/操作卷数据属于 unsupported、未定义行为**，可能把卷弄坏。本文这样演示是为了看清原理；生产里的正确姿势是雪球 7「挂进容器再 tar」。

`Driver: local` = 数据在本机这棵目录树里。换驱动落到 NFS/云盘，是雪球 8。

---

## 雪球 3：bind——宿主机改一行，容器立刻读到

命名卷把「数据存哪」交给 Docker，真身在 `_data` 深处。下面两个需求它反而不顺手：

- **开发热更新**：改宿主机源码，容器不必重建镜像
- **路径必须由我定**：配置、构建产物要落在工程目录，不能是哈希目录

`-v` 的第一段换成**以 `/` 开头的绝对路径**，Docker 就认成 bind。实验室目录：`/root/bind-demo`。

```bash
mkdir -p /root/bind-demo
echo 'host-file-content' > /root/bind-demo/host.txt

docker run --rm -v /root/bind-demo:/src busybox cat /src/host.txt
```

```text
host-file-content
```

反过来，容器内写入也会落到宿主机：

```bash
docker run --rm -v /root/bind-demo:/src busybox sh -c 'echo data-by-container > /src/from-container.txt'
ls -l /root/bind-demo
cat /root/bind-demo/from-container.txt
```

```text
total 8
-rw-r--r-- 1 root root 18 Aug 17 20:19 from-container.txt
-rw-r--r-- 1 root root 18 Aug 17 20:19 host.txt
data-by-container
```

属主是 `root:root`——容器内默认 root 干活，落到宿主机也是 root。所谓「双向实时」，本质是**两边操作的是同一份磁盘文件**，不存在复制、也不存在延迟。

单文件也能挂（官方例子：把宿主机 `/etc/resolv.conf` 挂进每个容器做 DNS）：

```bash
echo 'nameserver 8.8.8.8' > /root/single.conf
docker run --rm -v /root/single.conf:/etc/resolv.conf busybox cat /etc/resolv.conf
rm /root/single.conf
```

```text
nameserver 8.8.8.8
```

热更新：起一个**长驻**容器，宿主机改文件，不重启再看：

```bash
docker run -d --name bind-live -v /root/bind-demo:/src busybox sleep infinity
docker exec bind-live cat /src/host.txt
echo 'hot-update-line' >> /root/bind-demo/host.txt
docker exec bind-live cat /src/host.txt
docker rm -f bind-live
```

```text
host-file-content
host-file-content
hot-update-line
```

容器**没重启**，第二次 `exec` 就读到了新行。把 `/root/bind-demo` 换成工程目录，就是本地开发的日常。[第 13 篇](/云原生/docker/docker-13-compose) 会写成 `./html:/usr/share/nginx/html`，这里会这一条 `-v` 就够了。

`--mount` 是严格模式：源路径不存在，立刻失败，不会偷偷建目录：

```bash
docker run --rm --mount type=bind,source=/root/no-such-dir,target=/src busybox echo hi
```

```text
docker: Error response from daemon: invalid mount config for type "bind":
bind source path does not exist: /root/no-such-dir
```

> 🔑 脚本里推荐 `--mount`：拼错立刻报错。`-v` 打错路径会怎样，下一球对照。

---

## 雪球 4：只读，以及 bind 会盖住、会静默建目录

共享配置给容器，但明确它不许改——加 `:ro`：

```bash
docker run --rm -v /root/bind-demo:/src:ro busybox sh -c 'echo x > /src/new.txt'
```

```text
sh: line 0: can't create /src/new.txt: Read-only file system
```

拒绝发生在**内核文件系统层**（`EROFS`），不是 Docker 模拟的，容器内进程绕不过去。读不受影响。

两种挂载都见过了，看这容器挂了什么：

```bash
mkdir -p /root/bind-demo
docker run -d --name lab-mount-demo -v mydata:/data -v /root/bind-demo:/src:ro \
    busybox sleep infinity
docker inspect --format '{{json .Mounts}}' lab-mount-demo
```

```text
[{"Type":"volume","Name":"mydata","Source":"/var/lib/docker/volumes/mydata/_data","Destination":"/data","Driver":"local","Mode":"z","RW":true,"Propagation":""},{"Type":"bind","Source":"/root/bind-demo","Destination":"/src","Mode":"ro","RW":false,"Propagation":"rprivate"}]
```

| 字段 | 卷那条 | bind 那条 |
|------|--------|-----------|
| `Type` | `volume` | `bind` |
| `Name` / `Source` | 卷名 `mydata`；真身在 `_data` | 没有卷名，`Source` 就是宿主目录 |
| `RW` | `true` | `false`——`:ro` 的铁证 |

删卷前必查谁在用：`docker ps --filter volume=mydata`。本机：`lab-mount-demo`。演示完 `docker rm -f lab-mount-demo`。

**坑①：挂上去 = 盖住。** 还是 nginx 自带 html，bind 一个**空目录**：

```bash
docker run --rm nginx:alpine ls -A /usr/share/nginx/html
mkdir -p /root/empty-dir
docker run --rm -v /root/empty-dir:/usr/share/nginx/html nginx:alpine ls -A /usr/share/nginx/html
rm -rf /root/empty-dir
```

```text
50x.html
index.html
```

第二下输出为空——`index.html` 不见了。官方类比：往 `/mnt` 挂 U 盘，看到的是 U 盘，原有内容被盖住而**不是被删**。

| 挂载方式 | 挂到该路径后看到 | 为什么 |
|------|------|------|
| 不挂载 | `50x.html  index.html` | 镜像层自带 |
| bind 一个空目录 | **空** | 宿主目录原样盖上去 |
| 空命名卷 | `50x.html  index.html` | 首次挂载把镜像内容**先拷进卷**（雪球 8） |

**坑②：路径拼错不报错，`-v` 会静默建一个空目录。** 同一条 `/root/no-such-dir`，雪球 3 用 `--mount` 直接报错；换成 `-v`：

```bash
ls /root/no-such-dir
docker run --rm -v /root/no-such-dir:/src busybox ls -A /src
ls -ld /root/no-such-dir
rm -rf /root/no-such-dir
```

```text
ls: cannot access '/root/no-such-dir': No such file or directory
drwxr-xr-x 2 root root 4096 Aug 17 20:19 /root/no-such-dir
```

容器内 `/src` 是空的，且没有任何报错。官方 bind 文档（2026-07）：`--mount` 默认报错；确需自动创建，得显式加 `bind-create-src`。

「永远是目录」在**挂文件**时尤其阴——想挂配置文件，名字打错了：

```bash
docker run --rm -v /root/no-such.conf:/etc/app.conf busybox ls -ld /etc/app.conf
ls -ld /root/no-such.conf
rm -rf /root/no-such.conf
```

```text
drwxr-xr-x    2 root     root     4096 Aug 17 12:42 /etc/app.conf
drwxr-xr-x 2 root root 4096 Aug 17 20:42 /root/no-such.conf
```

应用期望文件，拿到的却是**空目录**。

**坑③：强耦合宿主机，且默认可写。** 源是这台机器的绝对路径，换台机器就对不上。生产数据用命名卷，bind 留给开发机的源码与配置——能只读就加 `:ro`。

---

## 雪球 5：tmpfs——写进内存，停了就没了

前几球的数据都想留在磁盘上。令牌、会话缓存恰恰相反——**不该写成任何磁盘文件**。tmpfs 给这类数据一块内存盘。

```bash
docker run --rm --tmpfs /scratch busybox sh -c 'mount | grep scratch; echo hello > /scratch/f && cat /scratch/f'
```

```text
tmpfs on /scratch type tmpfs (rw,nosuid,nodev,noexec,relatime)
hello
```

`--mount type=tmpfs,dst=/app` 同义。inspect 里 `Type` 为 `tmpfs`、`Source` 为空（内存挂载没有「源」）：

```bash
docker run -d --name tmp-demo --mount type=tmpfs,dst=/app nginx:alpine
docker inspect tmp-demo --format '{{json .Mounts}}'
docker rm -f tmp-demo
```

```text
[{"Type":"tmpfs","Source":"","Destination":"/app","Mode":"","RW":true,"Propagation":""}]
```

和 bind 一样会**遮蔽**挂载点原有内容——盖在 `/etc` 上：

```bash
docker run --rm --tmpfs /etc busybox ls -A /etc
```

```text
hostname
hosts
resolv.conf
```

镜像自带的 passwd、group 被盖住了。剩下三个不是 tmpfs 里「原来就有」的，而是 Docker 挂完之后**重新注入**的网络文件。

不传参数，容量上限 = **宿主机内存的 50%**：

```bash
free -m | head -2
docker run --rm --tmpfs /scratch busybox df -h /scratch
```

```text
              total        used        free      shared  buff/cache  available
Mem:            7942         505         7067           4         370        7276
Filesystem                Size      Used Available Use% Mounted on
tmpfs                     3.9G         0      3.9G   0% /scratch
```

7.9G 的一半。生产上不设限就是给容器留了「吃掉宿主一半内存」的口子。`size=1m` 再灌 3MiB：

```bash
docker run --rm --tmpfs /scratch:size=1m busybox sh -c 'dd if=/dev/zero of=/scratch/f bs=1M count=3; ls -l /scratch'
```

```text
dd: error writing '/scratch/f': No space left on device
2+0 records in
1+0 records out
1048576 bytes (1.0MB) copied, 0.000943 seconds, 1.0GB/s
-rw-r--r--    1 root     root     1048576 Aug 17 12:39 /scratch/f
```

`dd` 按块复制：`bs × count` 计划写 3MiB，上限 1MiB，写到第 2 块撞上 `ENOSPC`。`size=` 是硬顶。

| 参数 | 干什么 | 默认 |
|------|------|------|
| `size` | 容量上限 | 宿主内存 50% |
| `mode` | 挂载点权限 | `1777`（`drwxrwxrwt`） |
| `uid` / `gid` | 挂载点属主 | root(0) |
| `noexec` | 禁止执行里面的二进制 | 允许执行 |

```bash
docker run --rm --tmpfs /scratch busybox ls -ld /scratch
docker run --rm --tmpfs /scratch:mode=700,uid=1000,gid=1000 busybox ls -ld /scratch
docker run --rm --tmpfs /t:noexec busybox sh -c 'printf "#!/bin/sh\necho pwned\n" > /t/s && chmod +x /t/s && /t/s'
```

```text
drwxrwxrwt    2 root     root            40 Aug 17 12:39 /scratch
drwx------    2 1000     1000            40 Aug 17 12:39 /scratch
sh: line 0: /t/s: Permission denied
```

三个限制：不能在容器间共享；仅 Linux；挂载点权限可能在重启后重置。另有一句流行说法要修正：tmpfs **不是**「绝不落盘」——内存吃紧时可能被换出到 swap（本机 `free -m` 里就躺着 4G swap）。「不写容器文件系统」永远成立；真有严格不落盘的需求，得从部署层面禁用 swap。

---

## 雪球 6：匿名卷——prune 到底删什么

不给卷名、只给容器内路径（`-v /data`），Docker 会生成一个 **64 位哈希名的匿名卷**。你叫不出名字。

[第 9 篇](/云原生/docker/docker-09-dockerfile/) 的 `VOLUME /xxx` 只是**声明挂载点**。很多数据库官方镜像写了这句，你 `docker run` 时又没 `-v 卷名:…`，引擎就会自动挂一个匿名卷——数据仍在卷上，但不在你起的那个名字里。开头那个 MySQL，若从没挂命名卷，删容器时命运就取决于下面三种删法。

> ⚠️ 下面的 `-v` 是 **`docker rm` 自己的旗标**（`--volumes`），意思是「删容器时，把它创建的匿名卷一起删」——和 `docker run -v` 的「挂载」**完全是两码事**。

**方式一：`--rm` 退出——匿名卷连带一起删**

```bash
docker run --rm -d --name anon-rm-demo -v /data busybox sleep 60
docker inspect anon-rm-demo --format '{{range .Mounts}}type={{.Type}} name={{.Name}} dst={{.Destination}}{{println}}{{end}}'
docker stop anon-rm-demo
docker volume inspect 12aa00229028ff1ff4c71a66fe49d8b53811bcfb1b60782cfde410c9b7546291
```

```text
type=volume name=12aa00229028ff1ff4c71a66fe49d8b53811bcfb1b60782cfde410c9b7546291 dst=/data
[]
Error response from daemon: get 12aa00229028ff1ff4c71a66fe49d8b53811bcfb1b60782cfde410c9b7546291: no such volume
```

**方式二：`docker rm`（不带 `-v`）——留下来，变成悬空卷**

```bash
docker run --name anon-keep -v /data busybox sh -c 'echo keep > /data/f'
docker inspect anon-keep --format '{{range .Mounts}}type={{.Type}} name={{.Name}} dst={{.Destination}}{{println}}{{end}}'
docker rm anon-keep
docker volume ls -f dangling=true
```

```text
type=volume name=057fcecb958d190946c93b684407c9691213bc36d4848f584c984dc98bd2eb05 dst=/data
DRIVER    VOLUME NAME
local     057fcecb958d190946c93b684407c9691213bc36d4848f584c984dc98bd2eb05
```

容器没了、卷还在、再没有任何容器引用——这就是**悬空卷**。生产上真正堆出来的，正是这种日常用法。

**方式三：`docker rm -v`——手动连卷一起删**（和 `--rm` 效果一样，只是时机不同）：

```bash
docker run --name lab-rmv-demo -v /data busybox sh -c 'echo x > /data/f'
docker inspect lab-rmv-demo --format '{{range .Mounts}}{{.Name}}{{end}}'
docker rm -v lab-rmv-demo
docker volume inspect 4973a95b0df7d9fd1042eaf64d57c0d4aa4253976eb9dfa0088770f79f3d32b8
```

```text
4973a95b0df7d9fd1042eaf64d57c0d4aa4253976eb9dfa0088770f79f3d32b8
Error response from daemon: get 4973a95b0df7…: no such volume
```

两条安全边界：

- `rm -v` **只连带匿名卷**；命名卷哪怕容器 `rm -v`，卷也原样保留——数据库命名卷不会被这个旗标误伤
- 想让匿名卷跟容器一起走：要么 `run --rm`，要么 `rm -v`；两条都不做，悬空卷就攒下了

`docker volume prune` 的边界（先显式建一个从未被使用的命名卷 `orphan`）：

```bash
docker volume create orphan
docker volume prune -f
docker volume ls | grep orphan
```

```text
Deleted Volumes:
057fcecb958d190946c93b684407c9691213bc36d4848f584c984dc98bd2eb05

Total reclaimed space: 5B
local     orphan
```

prune **只删了那个匿名悬空卷**；`orphan` 这个显式命名的卷哪怕从未被使用，也没被删。`docker volume prune --help` 写明：`-a, --all` 才会连未使用的命名卷一起删。生产慎用 `-a`。要删指定卷，用 `docker volume rm <卷名>`。

---

## 雪球 7：备份——临时容器 + tar，不抠宿主机目录

雪球 2 看过真身路径，root 直接 `tar` 那个目录**能用，但官方说 unsupported**。换到 NFS 驱动后本地压根没有 `_data`。官方套路与存储位置无关：**起一个一次性容器，把卷挂进去，tar 到一个 bind 目录里带走**。继续用雪球 1 的 `mydata`。

```bash
mkdir -p /root/backup
docker run --rm -v mydata:/data -v /root/backup:/backup busybox tar cvf /backup/mydata.tar -C /data .
ls -l /root/backup
docker run --rm -v /root/backup:/backup busybox tar tvf /backup/mydata.tar
```

```text
./
./note.txt
-rw-r--r-- 1 root root 2560 Aug 17 20:21 mydata.tar
drwxr-xr-x root/root         0 2026-08-17 12:21:05 ./
-rw-r--r-- root/root        11 2026-08-17 12:21:05 ./note.txt
```

三件事：`-v mydata:/data` 把要备份的卷挂进来；`-v /root/backup:/backup` 用雪球 3 的 bind 当出口；`tar … -C /data .` 先进 `/data` 再打包，归档里是 `./note.txt` 而不是绝对路径。`tar` 列出的是容器内 UTC，宿主机 `ls` 是本地时区，相差 8 小时——同一份文件。

恢复 = 空白新卷 + 把 `cvf` 换成 `xvf`：

```bash
docker volume create mydata-restored
docker run --rm -v mydata-restored:/data -v /root/backup:/backup busybox tar xvf /backup/mydata.tar -C /data
docker run --rm -v mydata-restored:/data busybox cat /data/note.txt
```

```text
./
./note.txt
persist-me
```

跨主机：把 `mydata.tar` 拷到新机器，重复这三条。

真实数据库可能挂了好几个卷。`--volumes-from <容器>` 让新容器**原样继承**目标已经挂上的全部卷和 bind：

```bash
docker run -d --name db-like -v mydata:/var/lib/data busybox sleep infinity
docker run -d --name helper --volumes-from db-like busybox sleep infinity
docker inspect --format '{{range .Mounts}}{{.Type}}  {{.Source}} -> {{.Destination}}{{println}}{{end}}' helper
docker exec helper cat /var/lib/data/note.txt
docker rm -f helper
```

```text
volume  /var/lib/docker/volumes/mydata/_data -> /var/lib/data
persist-me
```

helper 的 `docker run` 里**一个 `-v` 都没写**。于是「备份某容器的全部数据」一行化：

```bash
docker run --rm --volumes-from db-like -v /root/backup:/backup busybox tar cvf /backup/db-like.tar /var/lib/data
docker rm -f db-like
```

```text
var/lib/data/
var/lib/data/note.txt
```

（`tar` 会去掉成员名开头的 `/`，属正常行为。）

---

## 雪球 8 🧗：空卷垫底、只挂子目录、借工具、换驱动

> 进阶块。主线三种挂载 + 备份已经够用。

### 空命名卷会把镜像内容拷进去

第一次把**空**命名卷挂到容器里**已有内容**的路径，Docker 会把镜像该路径先拷进卷（pre-populate）：

```bash
docker run --rm nginx:alpine ls -A /usr/share/nginx/html
docker volume create html-vol
docker run --rm -v html-vol:/usr/share/nginx/html nginx:alpine ls -A /usr/share/nginx/html
docker run --rm -v html-vol:/x busybox ls -A /x
docker volume rm html-vol
```

```text
50x.html
index.html
50x.html
index.html
50x.html
index.html
```

换 busybox 也看得到——文件是真的拷进了卷。对照雪球 4：bind **没有**这个垫底。不想要？`--mount` 加 `volume-nocopy`，或 `-v` 加 `:nocopy`，输出为空。

### 只挂卷的一小块：`volume-subpath`

仅 `--mount`。子目录必须先存在：

```bash
docker volume create logs-vol
docker run --rm -v logs-vol:/data busybox mkdir /data/app1 /data/app2
docker run --rm --mount type=volume,source=logs-vol,target=/var/log/app,volume-subpath=app1 \
    busybox sh -c 'echo log-from-app1 > /var/log/app/run.log'
docker run --rm -v logs-vol:/data busybox find /data -type f
```

```text
/data/app1/run.log
```

子目录不存在时的报错会把真身路径暴露出来：

```text
cannot access path /var/lib/docker/volumes/logs-vol/_data/not-exist: lstat … no such file or directory
```

### Image Mount：把另一张镜像只读挂进来（不是持久化）

排障靠 `docker exec … sh`（[第 7 篇](/云原生/docker/docker-07-enter-container/)）。有的镜像故意不装 `sh`。Image Mount 把 busybox 的文件盖到当前容器的 `/dbg`，强制只读，原镜像不动。

```bash
docker run --rm --mount type=image,source=busybox,dst=/dbg alpine ls /dbg/bin 2>/dev/null | head -6
```

```text
[
[[
acpid
add-shell
adduser
```

（本机 29.1.3 每条 `type=image` 都会先打一行 `WARNING: Image mount is an experimental feature`，走 stderr。）

三条约束：只认 `--mount type=image`，没有 `-v` 写法（`-v busybox:/dbg` 会被解析成名为 busybox 的**命名卷**）；需要 containerd image store（本机 `docker info` 里 `driver-type: io.containerd.snapshotter.v1`）；源镜像不会自动 pull。

文件看得见 ≠ 跑得动：默认 `busybox:latest` 按 glibc 构建，alpine 是 musl，直接跑 `/dbg/bin/echo` 会报误导性的 `no such file or directory`。换成 `busybox:musl`：

```bash
docker pull busybox:musl
docker run --rm --mount type=image,source=busybox:musl,dst=/dbg alpine /dbg/bin/echo hello-from-mounted-image
```

```text
hello-from-mounted-image
```

只读由内核拒绝：`touch /dbg/x` → `Read-only file system`。`image-subpath=bin` 只挂子目录。本地没有该 tag：`No such image: busybox:no-such-tag`。

inspect 里 `Type` 是 `image`，`"RW":false`：

```text
[{"Type":"image","Name":"busybox:musl","Source":"/var/lib/docker/rootfs/overlayfs/6432…c6d","Destination":"/dbg","Mode":"","RW":false,"Propagation":"rprivate"}]
```

Compose 用长语法 `type: image`（`image.subpath` 需 Compose ≥ 2.35.0）。**这不是持久化**——不产生任何数据。

### 卷驱动：数据不一定在本地磁盘

`Driver: local` 换成 NFS 等，数据就可以落到别处。本节命令来自官方文档，**本机未接 NFS，没有实测输出**：

```bash
docker volume create --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw,nfsvers=4 \
  --opt device=:/path/on/nfs \
  nfs-data
```

之后 `docker run -v nfs-data:/data ...` 照常用。同一思路还能对接 CIFS、云盘、rclone。细节以[官方卷文档](https://docs.docker.com/engine/storage/volumes/)为准。

---

## 命令怎么记、两个历史包袱

| 阶段 | 命令 | 你在哪一球用过 |
|------|------|----------------|
| 建 / 挂命名卷 | `volume create`、`run -v 卷名:/data` | 1 |
| 查真身 | `volume inspect`、宿主机 `cat …/_data/`（仅演示） | 2 |
| bind / 热更新 | `-v /宿主路径:容器路径` | 3 |
| 只读 / 排障 | `:ro`、`inspect '{{json .Mounts}}'`、`ps --filter volume=` | 4 |
| 内存盘 | `--tmpfs` / `--mount type=tmpfs` | 5 |
| 匿名 / 清理 | `-v /data`、`rm -v`、`volume ls -f dangling=true`、`volume prune` | 6 |
| 备份 | 临时容器 + `tar`、`--volumes-from` | 7 |
| 严格挂载 | `--mount type=bind/volume/image/tmpfs` | 3、5、8 |

| 需求 | 用什么 |
|------|--------|
| 数据库/中间件数据目录 | 命名卷 |
| 开发热更新、共享配置 | bind（开发机；能 `:ro` 就加） |
| 密钥等临时数据 | tmpfs（记得 `size=`；严格不落盘还要看 swap） |
| 容器里没有 shell，临时借工具 | image mount（不是持久化） |
| 跨主机共享 | 卷驱动 |
| 迁移/备份 | tar 套路 |

**包袱一**：`docker run -v` 是挂载；`docker rm -v` 是删匿名卷。同一个字母，两件事。

**包袱二**：直接操作 `/var/lib/docker/volumes/…/_data` 是官方 unsupported；生产用雪球 7。`volume prune -a` 才会动命名卷。

下一篇 Compose 里，本篇的挂载写成 YAML 长这样（现在认个脸即可）：

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

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|------|----------------------|
| [第 5 篇](/云原生/docker/docker-05-container-and-image/) 镜像与容器 | 开头：可写层随容器生灭 |
| [第 9 篇](/云原生/docker/docker-09-dockerfile/) Dockerfile | 雪球 6：`VOLUME` 只声明挂载点 |
| [第 11 篇](/云原生/docker/docker-11-network) 网络 | `inspect --format` 同款 |
| [第 13 篇](/云原生/docker/docker-13-compose) Compose | 雪球 3 的 bind、雪球 1 的命名卷写成 YAML |
| [Linux bind mount](/Linux/basics/linux-06-bind-mount) | 雪球 3、4 的内核版 |

---

## 本篇实验清理（可照抄）

```bash
docker rm -f lab-mount-demo bind-live tmp-demo img-demo helper db-like 2>/dev/null
docker volume rm mydata autodata mydata-restored orphan html-vol logs-vol nocopy-vol 2>/dev/null
rm -rf /root/bind-demo /root/backup
```

---

## 小结

从一个 `note.txt` 开始，每次只加一种能力：

1. **命名卷**：容器删、数据在；`-v` 引用不存在的卷名会悄悄创建。
2. **真身路径**：`/var/lib/docker/volumes/<名>/_data`；直接访问是 unsupported。
3. **bind**：两边同一份文件；宿主机改、容器立刻读到。
4. **`:ro`**：内核 EROFS；bind 会盖住镜像内容；`-v` 打错路径会静默建目录。
5. **tmpfs**：停了就没了；默认上限宿主内存 50%；可能换出到 swap。
6. **匿名卷**：`--rm` / `rm -v` 带走；`rm` 不带 `-v` 变悬空；`prune` 默认不删命名卷。
7. **备份**：临时容器 + tar；整容器用 `--volumes-from`。
8. **进阶**：空卷垫底、`volume-subpath`、Image Mount 借工具、卷驱动。

**思考题**：为什么数据库镜像的 Dockerfile 要写 `VOLUME /var/lib/mysql`？不写会怎样？（提示：雪球 6——没挂命名卷时，数据落在哪、容器删除后命运如何。）

下一篇：[《Docker Compose 编排——从一个 Nginx 滚成一整栈》](/云原生/docker/docker-13-compose)。

---

## 参考资料

- [Docker Docs · Storage](https://docs.docker.com/engine/storage/) — 挂载类型总览（2026-07：五种挂载；直接访问卷数据 unsupported）
- [Volumes](https://docs.docker.com/engine/storage/volumes/) — 生命周期、备份、卷驱动
- [Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)（2026-07：遮蔽、`-v` 自动建目录与 `bind-create-src`）/ [tmpfs](https://docs.docker.com/engine/storage/tmpfs/)（默认 50% 内存、可能换出 swap）
- [Image mounts](https://docs.docker.com/engine/storage/image-mounts/)（实验特性；前提 [containerd image store](https://docs.docker.com/engine/storage/containerd/)）
- 本机：WSL2 Ubuntu-22.04 + Docker 29.1.3
