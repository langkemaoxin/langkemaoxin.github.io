---
title: bind 挂载实操——从一行 mount --bind 滚到 Docker -v 的内核真相
sidebarGroup: Linux 基础
shortTitle: 06 bind 挂载
order: 6
date: 2026-08-17T00:00:00.000Z
category: Linux
tag:
  - Linux
  - 文件系统
  - mount
  - Docker前置
description: 从一块 tmpfs 盖布滚起，每次只加一个因素：bind 双入口 inode 同号、逐字段读 mountinfo、--rbind 子挂载差别、:ro 的 EROFS、单文件 bind、mnt namespace 与挂载传播真漏实测、进容器找到 -v 留下的那条记录、fstab 固化——Docker 系列欠下的三笔账逐球销掉。全部本机实测。
---

> **Linux 板块 · 第 6 篇**  
> 上一篇：[《手搓迷你容器网络》](/Linux/basics/linux-05-netns-iptables)（netns/veth/iptables；本篇起从网络转向文件系统）  
> 读完可接着看：[《数据持久化——从容器一删库没了，滚到三种挂载》](/云原生/docker/docker-14-data-persistence)（本文是它雪球 3 Bind Mount 的直接前置）｜[《Docker 的 Namespace》](/云原生/docker/docker-20-namespace)（mnt namespace 的系统展开）

---

## 开头：三笔账，一条雪球滚到底

Docker 系列[第 12 篇](/云原生/docker/docker-14-data-persistence)讲 Bind Mount 时，说过三句很有底气的话：

> 「bind mount 挂进去的就是宿主机目录本身……不存在复制、也不存在延迟」
> 「拒绝发生在**内核文件系统层**（EROFS），不是 Docker 模拟的报错」
> inspect 输出里那串 `"Propagation":"rprivate"`——当时标注「进阶话题，本文不展开」

凭什么断言「同一份文件」？EROFS 到底是哪一层在拒绝？rprivate 是什么、为什么非要它不可？

根因一句：三笔账指向的是同一个底层机制——**bind 挂载（bind mount）**，一条 Linux 2.4 时代就进内核的机制。Docker 的 `-v /宿主路径:容器路径` 在内核层做的全部事情，一行 `mount --bind` 就能复刻。

本篇不先背挂载术语。实验对象全部放在 `/tmp/lab6-*`，**同一批目录从第一球滚到最后一球**，每一球当场销账或看见效果：

| 雪球 | 你加上去的 | 当场能看见的效果 / 销掉的账 |
|------|------------|------------------------------|
| **1** | 一块 tmpfs 挂到目录上 | `underneath.txt` 消失又归来——「盖布」，Docker 坑①的底层 |
| **2** | 一条 `mount --bind` | 两个路径同一个 inode——**销账①**「同一份文件」 |
| **3** | 三个「查账」工具 | mountinfo 里的 root 子树、findmnt 的方括号；无参 mount 丢证据 |
| **4** | 一个软链接对照组 | `via-link/..` 跳进源的父目录，`via-bind/..` 老实回 `here` |
| **5** | 一次 `remount,ro,bind` | `Read-only file system`——**销账②**「EROFS 在内核层」 |
| **6** | 源换成单个文件 | inode 同号；挂到目录上收 `Not a directory`——Docker 坑② |
| **7** | 一间 mnt namespace 小屋 | 屋里挂的 bind 屋外看不见；🧗 真漏实验——**销账③**「rprivate」 |
| **8** | 一个 busybox 容器 | 容器挂载表里找到 `-v` 那条记录——三笔账全清 |
| **9** | 一行 fstab | `mount -a` 立即生效，最后统一清理 `/tmp/lab6-*` |

输出均来自本机：WSL2 Ubuntu-22.04（root；挂载操作需要），内核 6.6.87.2，util-linux 2.37.2（mount/findmnt），Docker 29.1.3。官方手册：[mount(8)](https://man7.org/linux/man-pages/man8/mount.8.html)、[mount_namespaces(7)](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)。

---

## 雪球 1：先挂一块 tmpfs，看见「盖布」

bind 挂载只是普通挂载的特例——把「源」从块设备换成**一条路径**。所以第一球先做一次最普通的挂载，亲眼看见「挂载点是**盖**上去的」：这半张知识直接解释 Docker 系列的坑①（bind 一个空目录到 `/usr/share/nginx/html`，镜像自带页面「消失」）。

Linux 把所有文件组织成一棵以 `/` 为根的大树；`mount` 做的事，是把一个文件系统的**根**接到这棵树的某个目录上。官方手册原话：「挂上后，该目录**原有的内容（若有）、属主与权限都变得不可见**；只要这个文件系统还挂着，这个路径指的就是新文件系统的根」（[mount(8)](https://man7.org/linux/man-pages/man8/mount.8.html)）。

本机实测，挂一块内存文件系统 tmpfs 到目录上，全程盯着这个目录：

```bash
$ mkdir /tmp/lab6-mp
$ echo 'underneath' > /tmp/lab6-mp/underneath.txt

$ ls -A /tmp/lab6-mp
underneath.txt                       # ← 挂载前：目录自己的内容

$ mount -t tmpfs tmpfs6 /tmp/lab6-mp # ← 把一个 tmpfs 挂到这个目录
$ ls -A /tmp/lab6-mp
（空）                                # ← 原文件"消失"了

$ echo tmpfs-file > /tmp/lab6-mp/in-tmpfs.txt   # 往挂载点里写
$ ls -A /tmp/lab6-mp
in-tmpfs.txt

$ umount /tmp/lab6-mp                 # ← 卸载：把 tmpfs 从这个目录摘下来
$ ls -A /tmp/lab6-mp
underneath.txt                       # ← 原内容完好归来；in-tmpfs.txt 随挂载一起消失
```

**命令拆解**——`mount` 是三段式：`mount -t <类型> <设备> <挂载点>`，逐段对照：

| 段 | 本例 | 是什么 |
|----|------|--------|
| `-t tmpfs` | 文件系统**类型** | **tmpfs = 基于内存的临时文件系统**：不占磁盘、挂上即是一块空白「内存盘」、卸载即清空——不用准备磁盘分区就能演示挂载，所以拿它当教具（Docker 的 `docker run --tmpfs` 就是让 Docker 替你执行了这条 mount，见[第 12 篇雪球 5](/云原生/docker/docker-14-data-persistence)） |
| `tmpfs6` | **「设备」位** | 真磁盘挂载这里放设备（如 `/dev/sdb1`）；tmpfs **没有设备**——这个位置只是给这块内存盘起的**名字**（随便取），之后 `df`、`/proc/self/mountinfo` 里靠它辨认 |
| `/tmp/lab6-mp` | **挂载点** | 把新文件系统的**根**接到这个目录上；即刻起这个路径显示的就是新文件系统的内容 |

对照常规写法 `mount -t ext4 /dev/sdb1 /mnt/data`：三段结构不变，tmpfs 只是把「设备」换成了「内存 + 一个名字」。

**怎么读**：挂载是**替换视图**，不是合并——这个路径此刻看到的是新文件系统的内容，原内容只是被**盖住**了，并没有被删；卸载即「揭开」。写在挂载点里的文件属于那个新文件系统（这里是内存里的 tmpfs），卸载后自然不在原目录。

| 时刻 | `/tmp/lab6-mp` 里看得见 | 为什么 |
|------|------------------------|--------|
| 挂载前 | `underneath.txt` | 目录自己的内容 |
| tmpfs 挂着 | `in-tmpfs.txt` | 原内容被盖住；写入落在 tmpfs |
| umount 后 | `underneath.txt` | 揭开盖布；tmpfs 里的文件随挂载对象消失 |

**背景知识**：系统当前挂着哪些东西，内核记在 proc 的挂载表文件里（`/proc/self/mountinfo` 信息最全，`findmnt` 默认读它）——雪球 3 把查挂载表的三位工具逐个讲清。

---

## 雪球 2：加一条 `mount --bind`——两个入口，同一个 inode

上一球盖上去的是一块**新**文件系统（tmpfs）。这一球只改一个地方：源不再是一块设备，而是**已有的一棵子树**——`mount --bind 源路径 目标路径`，把源路径处的那棵子树**原样再挂一次**到目标路径，之后两个路径指向同一份数据。官方手册特意强调：bind「**不会在内核 VFS 里创建任何二等或特殊节点**……内核里没有任何地方记录『这个文件系统是 bind 挂上去的』」（mount(8)）。

为什么值得学：不需要块设备、不复制一个字节，就能让任意位置的目录出现在第二个位置，而且这是**内核级**的映射，对进程完全透明——容器投递宿主目录、往容器注入 `/etc/hosts`、chroot 抢救系统，用的都是它。

本机实测：

```bash
$ mkdir /tmp/lab6-src /tmp/lab6-dst
$ echo 'host-data' > /tmp/lab6-src/a.txt
$ ls -A /tmp/lab6-dst
（空）

$ mount --bind /tmp/lab6-src /tmp/lab6-dst
$ ls -A /tmp/lab6-dst
a.txt
$ cat /tmp/lab6-dst/a.txt
host-data
```

「同一份文件」的铁证——**inode 同号**：

```bash
$ stat -c 'inode=%i  size=%s  %n' /tmp/lab6-src/a.txt /tmp/lab6-dst/a.txt
inode=118907  size=10  /tmp/lab6-src/a.txt
inode=118907  size=10  /tmp/lab6-dst/a.txt
```

双向「同步」其实是零成本（注意没有任何同步过程）：

```bash
$ echo written-from-dst > /tmp/lab6-dst/b.txt    # 从"挂载点"这边写
$ ls -A /tmp/lab6-src                            # 源那边立刻可见
a.txt  b.txt

$ echo 'appended-from-src' >> /tmp/lab6-src/a.txt  # 从源这边追加
$ cat /tmp/lab6-dst/a.txt                          # 挂载点读到
host-data
appended-from-src
```

**怎么读**：inode 是文件在内核里的身份证。两个路径解析到**同一个** inode，意味着它们不是「两份持续同步的数据」，而是**同一份**。Docker 系列那句「不存在复制、也不存在延迟」的全部底气，就在这两行同号的 inode里——**开头账①，此处销掉**。

**背景知识**：你可能会想到硬链接——同一个 inode 多个名字，确实很像。区别在层次：硬链接是**文件系统内**的机制（inode 层，只能作用于单个文件，不能跨文件系统）；bind 是**挂载表**层的机制，搬动的是整棵子树，目录连同里面的所有内容一起走。挂载表长什么样？下一球翻开看。

---

## 雪球 3：翻开内核的挂载账本——这条 bind 记了什么

雪球 2 的 bind 还挂着。这一球不加新挂载，只加**查账**的能力：每条挂载，内核都记在一本「挂载账本」里。查这本账有三个常用入口——**账本原文、专职查询命令、老习惯**——先把三位「查账人」各自是谁、用来干嘛讲清楚，再看同一条 bind 记录在它们眼里的样子。

### ① 账本原文：`/proc/self/mountinfo`

**是什么**：`/proc/<pid>/mountinfo` 是内核为**每个进程**准备的挂载表——列出该进程视角下的全部挂载，一行一条、字段最全（`/proc/self/` 是「永远指向当前正在读它的进程自己」的快捷方式，[第 1 篇](/Linux/basics/linux-01-nsenter-prerequisites)组块 1 认过；本机此刻 53 行）。

**用来干嘛**：它是**第一手记录**，后面两个工具本质上都是它的「阅读器」；而且标记 bind 的关键字段（root 子树）**只有这里有**；雪球 8 进容器看挂载表，读的也是它。

**怎么做**：拿挂载点当关键词 grep：

```bash
$ grep ' /tmp/lab6-dst ' /proc/self/mountinfo
795 80 8:48 /tmp/lab6-src /tmp/lab6-dst rw,relatime - ext4 /dev/sdd rw,discard,errors=remount-ro,data=ordered
```

这行就是内核为雪球 2 那条 bind 记的账——信息密度之王，本节末尾逐字段解剖。

### ② 专职查询命令：`findmnt`

**是什么**：util-linux 的挂载表查询命令（与 mount 同一个包），默认按 TARGET / SOURCE / FSTYPE / OPTIONS 四列输出，支持按挂载点、类型、选项过滤，还能查挂载点的传播属性（雪球 7 用的 `findmnt -no TARGET,PROPAGATION` 就是它）。

**用来干嘛**：日常排查的首选。官方手册把话说得很直白：「（mount 的）列表模式**只为向后兼容保留**；要更稳健、可定制的输出，请用 findmnt(8)」（mount(8)）。

**怎么做**：

```bash
$ findmnt /tmp/lab6-dst
TARGET        SOURCE                  FSTYPE OPTIONS
/tmp/lab6-dst /dev/sdd[/tmp/lab6-src] ext4   rw,relatime,discard,errors=remount-ro,data=ordered
```

**怎么读**：它把 mountinfo 里的「源设备 + root 子树」两个字段**拼成** `/dev/sdd[/tmp/lab6-src]`——**方括号就是 bind 的标志**：方括号外是设备，方括号里是被搬过来的源子树。日常一眼识别 bind，认这个写法最快。

顺带分清 findmnt 的两种「问法」（实测）：位置参数问的是「这个目录**是不是挂载点**」——拿非挂载点去查（如 `findmnt /tmp/lab6-src`，它只是普通目录）输出为空；要问「这个**路径**被哪条挂载盖着」，用 `-T`：`findmnt -T /tmp/lab6-src` 返回盖住它的最内层挂载（本机是 `/` 那条）。

### ③ 老习惯：`mount` 不带参数

**是什么**：`mount` 不带任何参数 = 列出全部挂载——上古用法，老教程和老运维脚本里到处都是，得看得懂。

**怎么做**（grep 只是为了从几十行里捞出我们要的那条）：

```bash
$ mount | grep lab6-dst
/dev/sdd on /tmp/lab6-dst type ext4 (rw,relatime,discard,errors=remount-ro,data=ordered)
```

**怎么读——坑就在这**：这条输出**看不出任何 bind 的痕迹**——没有源子树、没有方括号，和一条普通的整盘挂载长得一模一样。原因（本机实测）：无参 mount 读的是 `/etc/mtab`，它是指向 `/proc/self/mounts` 的软链——**那份老格式文件里根本没有 root 字段**，bind 的证据在读它的那一刻就丢了。所以：**查挂载表认 ①②；看到 `mount | grep` 的老写法，心里要知道它丢了什么。**

### mountinfo 那行，逐字段解剖

（字段定义见 [proc(5)](https://man7.org/linux/man-pages/man5/proc.5.html)）：

| 字段 | 值 | 含义 |
|------|-----|------|
| 挂载 ID | `795` | 这条挂载在内核挂载表里的编号 |
| 父挂载 ID | `80` | 挂在哪个挂载之下（这里是 `/` 所在的挂载） |
| 设备号 | `8:48` | 数据真正所在的设备（本机是 `/dev/sdd`） |
| **root** | `/tmp/lab6-src` | **本次挂载露出的是设备上的哪棵子树** ← bind 的记录方式 |
| 挂载点 | `/tmp/lab6-dst` | 接到目录树的哪个位置 |
| 挂载选项 | `rw,relatime` | 这条挂载自己的 VFS 标志（雪球 5 的 ro 改的就是它） |
| 文件系统 | `ext4` | 类型 |
| 源设备 | `/dev/sdd` | 超级块所在设备 |
| 超级块选项 | `rw,discard,…` | 设备级的选项 |

**怎么读**：bind 的本质在这里露出来了——**没有新设备、没有数据复制，只是挂载表里多了一条「把 8:48 设备的 `/tmp/lab6-src` 子树，接到 `/tmp/lab6-dst`」的记录**（②里 findmnt 的方括号，拼的就是这行的「源设备 + root」两个字段）。`df` 也从侧面佐证：两个路径算的是同一块盘，不存在新空间：

```bash
$ df /tmp/lab6-src /tmp/lab6-dst | awk '{print $1, $6}'
Filesystem Mounted
/dev/sdd /
/dev/sdd /tmp/lab6-dst
```

顺带一个易错点。手册原话：bind「只挂（单个文件系统的）一部分，**不带其下可能存在的子挂载**」。实测——先在源目录里再挂一个 tmpfs 当「子挂载」：

```bash
$ mkdir /tmp/lab6-src/sub
$ mount -t tmpfs sub6 /tmp/lab6-src/sub          # 源里的"子挂载"
$ echo 'inside-submount' > /tmp/lab6-src/sub/only-in-sub.txt

$ ls -A /tmp/lab6-dst/sub                        # 雪球 2 已挂的 bind 视角：空
（空）

$ mkdir /tmp/lab6-rb
$ mount --rbind /tmp/lab6-src /tmp/lab6-rb       # rbind = 递归，带子挂载
$ ls -A /tmp/lab6-rb/sub
only-in-sub.txt
```

**怎么读**：`--bind` 搬过去的是**挂载那一刻**那棵子树，后来在源里新挂的子挂载不跟过去；要让子挂载跟着走，用 `--rbind`。这个差别雪球 9 清理时还会咬人一口（思考题 1 也靠它）。

---

## 雪球 4：放一个软链接对照——bind 不是链接

雪球 3 的结论是「bind 是挂载表里的记录」；而大家更熟悉的「让内容出现在第二个路径」的老办法是软链接（symlink）。这一球把两者当面锣对面鼓：同一个 `src`，一个用软链接引过去，一个用 bind 挂过去，三条命令看清它们活在两个世界：

```bash
# 准备：src 是真目录；via-link 是指向它的软链接；via-bind 是 bind 挂载点
$ mkdir -p /tmp/lab6-nest/src /tmp/lab6-nest/here/via-bind
$ ln -sfn /tmp/lab6-nest/src /tmp/lab6-nest/here/via-link
$ mount --bind /tmp/lab6-nest/src /tmp/lab6-nest/here/via-bind
```

```bash
$ readlink /tmp/lab6-nest/here/via-link      # 软链接：是"链接"，读得出目标
/tmp/lab6-nest/src
$ readlink /tmp/lab6-nest/here/via-bind; echo "退出码 $?"   # bind：不是链接，读不出
（无输出）
退出码 1

$ realpath /tmp/lab6-nest/here/via-link/a.txt    # 软链接：路径解析会"跳"回源
/tmp/lab6-nest/src/a.txt
$ realpath /tmp/lab6-nest/here/via-bind/a.txt    # bind：路径就是它看起来的样子
/tmp/lab6-nest/here/via-bind/a.txt

$ realpath /tmp/lab6-nest/here/via-link/..       # 软链接再上一级——跳进了源的父目录！
/tmp/lab6-nest
$ realpath /tmp/lab6-nest/here/via-bind/..       # bind 的"上一级"符合直觉
/tmp/lab6-nest/here
```

**怎么读**：软链接是**盘上的对象**——它存在文件系统的 inode 里，谁挂了这个文件系统，谁就看得见同一条链接；路径解析经过它时会跳到目标处。bind 是**挂载表里的记录**——挂载点本身就是一条真实路径，不跳。`via-link/..` 竟然落在 `/tmp/lab6-nest`（源的父目录）而不是 `here`，这就是很多程序（相对路径计算、`..` 回溯、realpath 归一化）对软链接过敏的原因；而 bind 的路径永远「是它看起来的样子」。

**为什么这个区别重要**：挂载表是**按 mount namespace 一份**的（雪球 7 实测），所以 bind 可以做到「**不同进程看到不同的视图**」——这正是容器技术要的性质；软链接刻在盘上，人人看到的都一样，给不了这个性质。Docker 能给每个容器定制挂载视图，根基就在这行区别上。

---

## 雪球 5：给这条 bind 上一把 ro 锁——亲口收到 EROFS

回收开头第二笔账。Docker 系列说 `:ro` 的拒绝「发生在**内核文件系统层**，进程绕不过去，不是 Docker 模拟的报错」。这句话的底气来自本球要弄清的一件事——**ro 到底锁住了什么**：不是盘，不是文件，而是挂载表里**那一条记录**。锁的对象搞对了，「源还能写」「容器绕不过去」这些结论才站得住。

**先挂再锁：为什么经典写法是两步**：

```bash
$ mkdir /tmp/lab6-ro
$ mount --bind /tmp/lab6-src /tmp/lab6-ro          # 第一步：正常 bind，此刻还是可写
$ mount -o remount,ro,bind /tmp/lab6-ro            # 第二步：把「这一条挂载」的标志位改成 ro
```

为什么要分两步？**内核的 bind 挂载在创建时不接受 ro 标志**——只读是挂载条目的 VFS 标志，只能挂上之后用 `remount` 去改。（util-linux 2.27 起 `mount -o bind,ro 源 目标` 可一步写完，但那只是 mount 命令在用户态自动替你补了第二次 remount 系统调用，手册注明「非原子」；本机 2.37.2 实测可用，两种写法效果相同。）

第二条 remount 逐段拆开看：

| 段 | 含义 |
|----|------|
| `mount -o` | 后面跟逗号分隔的选项列表 |
| `remount` | 不是挂新的，是**修改已存在的那条挂载** |
| `ro` | 要改成的标志：只读 |
| `bind` | 声明改的是**这条 bind 挂载（VFS 条目）自己的标志**——不是「再做一次 bind」（少写它的下场见下方易混点） |

**看证据，再动手**。先确认 ro 真的挂上了——`findmnt -no OPTIONS 挂载点`（`-n` 不要表头，`-o` 指定只输出选项列）：

```bash
$ findmnt -no OPTIONS /tmp/lab6-ro
ro,relatime,discard,errors=remount-ro,data=ordered
```

这行输出有个**容易看走眼的地方**：开头一个 `ro`、结尾又有一个 `remount-ro`——它们是两个不相干的东西。回到雪球 3 的解剖：挂载表的选项本来就分**两组**，findmnt 把它们拼成了一行，拆开看 mountinfo 原文：

```bash
$ grep ' /tmp/lab6-ro ' /proc/self/mountinfo
797 80 8:48 /tmp/lab6-src /tmp/lab6-ro ro,relatime - ext4 /dev/sdd rw,discard,errors=remount-ro,data=ordered
```

| 选项组 | 原文 | 此刻的值 | 说明 |
|------|------|------|------|
| **挂载选项**（这条挂载自己的标志） | 第 6 字段 | `ro,relatime` | ← remount 改的是它，**已生效** |
| **超级块选项**（整块盘的属性） | 第 9 字段起 | `rw,discard,…` | **还是 rw！** 盘没被动过 |

（结尾那个 `errors=remount-ro` 是 ext4 的超级块选项「文件系统出错时自动转只读」，名字里恰好带 ro，与我们无关。）**同一块盘、同一个 inode，一条挂载 ro、另一条 rw**——这就是「只读锁的是入口，不是数据」的原文证据。

把两条真实记录并排看（前一行是雪球 3 的 lab6-dst，后一行是本球的 lab6-ro，**root 子树相同**）：

```text
795 80 8:48 /tmp/lab6-src /tmp/lab6-dst rw,relatime - ext4 /dev/sdd rw,discard,errors=remount-ro,data=ordered
797 80 8:48 /tmp/lab6-src /tmp/lab6-ro  ro,relatime - ext4 /dev/sdd rw,discard,errors=remount-ro,data=ordered
```

设备号相同、root 字段（第 4 列）相同、超级块选项（第 9 列起）相同——**唯一不同的是第 6 列挂载标志：`rw` vs `ro`**。画成图：

```text
            同一份底层数据（/dev/sdd 上的 /tmp/lab6-src 子树，inode 也只有一套）
                             ↑
             ┌───────────────┴───────────────┐
             ↓                               ↓
     /tmp/lab6-dst 这条挂载          /tmp/lab6-ro 这条挂载
     标志 rw（没人动过）              标志 ro（remount 改的）
```

**只读是「门」的属性，不是「货」的属性**——走 ro 那扇门的写入被拦下，走 rw 那扇门照常放行。

现在写一个字试试，从只读入口：

```bash
$ echo x > /tmp/lab6-ro/try.txt
bash: /tmp/lab6-ro/try.txt: Read-only file system
```

这句报错就是开头第二笔账的答案：内核 VFS 层直接返回 **`EROFS`**（errno 30，显示为 `Read-only file system`），bash 只是转述——报错发生在**内核**，任何进程绕不过去。它和 Docker 系列[第 12 篇雪球 4](/云原生/docker/docker-14-data-persistence) 里容器内写 `:ro` 挂载收到的报错一字不差，因为是**同一个内核在同一个层**拒绝的——**账②销掉**。而同一时刻，从**源路径**这条挂载写入毫无障碍：

```bash
$ echo 'still-writable' >> /tmp/lab6-src/a.txt && echo OK
OK
```

**解锁**也只是一次 remount，把标志改回来：

```bash
$ mount -o remount,rw,bind /tmp/lab6-ro
$ findmnt -no OPTIONS /tmp/lab6-ro
rw,relatime,discard,errors=remount-ro,data=ordered
```

（首字符 `ro`→`rw`；超级块那组从头到尾没变过。）

> ⚠️ **易混点：remount 里的 `bind` 少写会怎样？**（实测）
>
> ```bash
> $ mount -o remount,ro /tmp/lab6-ro          # 少写了 bind
> $ grep ' /tmp/lab6-ro ' /proc/self/mountinfo
> 797 80 8:48 /tmp/lab6-src /tmp/lab6-ro rw,relatime - ext4 /dev/sdd rw,...
>                                            # ↑ 命令成功返回，但 ro 哪儿都没出现！
> ```
>
> 命令 exit 0、没有任何报错，但这条挂载**没被锁上**——ro 被静默丢弃。手册语义：不带 `bind` 的 remount，操作对象是**超级块**而不是这条挂载；本机实测连超级块也没动成（用 strace 跟踪时，内核直接回 `mount point is busy`——它确实去碰了整块盘所属的超级块，被系统占用顶了回来）。老内核时代这条路真走通时，会把同一块盘的**所有入口**一起变只读，比静默无效更危险。两种结局指向同一句忠告：**`remount,ro,bind` 三个词一个都不能少**。

---

## 雪球 6：把源换成单个文件——挂载点类型必须匹配

前面 bind 的源都是目录。这一球只把源换成一个**文件**——Docker 往容器注入 `/etc/hosts`（一个**文件**，不是目录）用的就是这一手。bind 的源不限于目录：

```bash
$ echo 'KEY=42' > /tmp/lab6-src/app.conf
$ touch /tmp/lab6-conf                             # 挂载点先建好——注意：建的是一个「文件」
$ mount --bind /tmp/lab6-src/app.conf /tmp/lab6-conf

$ cat /tmp/lab6-conf
KEY=42
$ stat -c 'inode=%i  %n' /tmp/lab6-src/app.conf /tmp/lab6-conf
inode=118919  /tmp/lab6-src/app.conf
inode=118919  /tmp/lab6-conf
```

同一 inode、同一份文件——和雪球 2 的目录 bind 一个道理。那为什么挂载点必须先 `touch` 一个**文件**、拿目录当挂载点会怎样？实测：

```bash
$ mkdir /tmp/lab6-conf-dir
$ mount --bind /tmp/lab6-src/app.conf /tmp/lab6-conf-dir
mount: /tmp/lab6-conf-dir: mount(2) system call failed: Not a directory.
```

内核返回 `ENOTDIR`：**源和挂载点类型必须一致**——文件挂到文件上、目录挂到目录上。这里正好和 Docker 系列[第 12 篇雪球 4](/云原生/docker/docker-14-data-persistence) 坑②对上：`-v` 打错路径时 Docker 自动创建的永远是**目录**——想挂单个文件而目标不存在，得到的是目录、类型对不上。所以 Docker 注入 `/etc/hosts` 的姿势必然是「先在容器里放好这个文件，再 bind」——雪球 8 进容器验证这一手。

---

## 雪球 7：把 bind 搬进 mnt namespace 小屋——屋里挂的，屋外看不见

雪球 4 说过：挂载表按 mount namespace 一份。这一球进屋实测。[第 1 篇](/Linux/basics/linux-01-nsenter-prerequisites)讲过：mnt namespace 隔离的就是挂载表。`unshare -m` 建一间「挂载屋子」，在屋里挂 bind：

```bash
$ mkdir /tmp/lab6-ns

$ unshare -m sh -c 'mount --bind /tmp/lab6-src /tmp/lab6-ns && ls -A /tmp/lab6-ns'
a.txt  app.conf  b.txt  sub

$ ls -A /tmp/lab6-ns                           # 屋外（宿主）同一时刻看
（空）
```

**怎么读**：新 mnt ns 拿到的是挂载表的**副本**，屋里后挂的 bind 屋外自然没有——和[第 5 篇](/Linux/basics/linux-05-netns-iptables)「iptables 规则属于 netns」是同一个道理：**视图类资源跟着命名空间走**。

但「屋外看不见」其实有两层原因，第二层叫**挂载传播**（propagation）。先看本机挂载点的传播属性：

```bash
$ findmnt -no TARGET,PROPAGATION /
/      private
```

挂载点除了 rw/ro，还带一个传播属性（mount(8)「Shared subtree operations」一节）：

| 属性 | 含义 |
|------|------|
| **private** | 这里的挂载/卸载事件**不外传**，别人的也传不进来 |
| **shared** | 同组（peer group）成员之间**互相传播**挂载事件 |
| slave / unbindable | 单向只收 / 禁止被 bind（完整语义见 [mount_namespaces(7)](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)） |

### 🧗 进阶：把挂载点设成 shared，挂载真的会「漏」

「传播」不是比喻，**真的能漏**。把一个挂载点显式设为 shared，再让屋里（`--propagation unchanged`，即不让 unshare 自动设 private）往它下面挂一个 bind：

```bash
$ mount -t tmpfs shared6 /tmp/lab6-shared
$ mount --make-shared /tmp/lab6-shared
$ echo 'LEAKED-FILE' > /tmp/lab6-src/proof.txt

$ unshare -m --propagation unchanged sh -c 'mount --bind /tmp/lab6-src /tmp/lab6-shared/leak'
# （unshare 进程已退出）

$ ls -A /tmp/lab6-shared/leak                   # 宿主此刻看——漏出来了
a.txt  app.conf  b.txt  proof.txt  sub
$ cat /tmp/lab6-shared/leak/proof.txt
LEAKED-FILE
```

unshare 里的 shell 早已退出，但它屋里挂的那条 bind 出现在了**宿主**的挂载表里。对照组：private 挂载点做完全相同的操作，宿主那边空空如也（本机实测，`ls /tmp/lab6-priv/leak` 无输出）。

**怎么读**：Docker inspect 里那个 `"Propagation":"rprivate"` 现在有了全解——**r**ecursive **private**：Docker 把挂进容器的子树**显式设成递归私有**，焊死传播门，保证容器内外的挂载操作互不波及——**开头账③，此处销掉**。另外注意环境差异：本机（WSL）的 `/` 本身是 private，且 `unshare -m` 默认也会把新 ns 整棵设为 private（unshare(1) 的默认行为），所以本机「想漏都要特意造」；标准 systemd 主机的 `/` 通常是 shared，在那类机器上「屋里挂载漏到宿主」是真实存在的坑——更显出 Docker 一律 rprivate 的必要性。

---

## 雪球 8：进容器——亲手找到 `-v` 留下的那条记录

材料齐了。这一球把前七球的知识对到 Docker 上：跑一个 busybox 容器，bind 同一个源目录，进容器看挂载表：

```bash
$ docker run --rm -v /tmp/lab6-src:/src busybox grep ' /src ' /proc/self/mountinfo
955 946 8:48 /tmp/lab6-src /src rw,relatime - ext4 /dev/sdd rw,discard,errors=remount-ro,data=ordered
```

和雪球 3 宿主自己那条并排看：

| 字段 | 宿主（雪球 3） | 容器里 |
|------|---------------|--------|
| 设备号 | `8:48` | `8:48`——**同一块盘** |
| root | `/tmp/lab6-src` | `/tmp/lab6-src`——**同一棵子树** |
| 挂载点 | `/tmp/lab6-dst` | `/src`——只是换成了容器内路径 |
| 父挂载 | `80`（`/` 所在挂载） | `946`（容器的 overlay 根，见[Docker 系列 17 篇](/云原生/docker/docker-22-unionfs)） |

inode 跨过容器边界仍然同号：

```bash
$ docker run --rm -v /tmp/lab6-src:/src busybox stat -c 'inode=%i' /src/a.txt
118907
$ stat -c 'inode=%i' /tmp/lab6-src/a.txt         # 宿主同一文件
118907
```

`:ro` 版——两组选项同框，肉眼看懂「锁的只是挂载」：

```bash
$ docker run --rm -v /tmp/lab6-src:/src:ro busybox sh -c \
    'grep " /src " /proc/self/mountinfo; echo try > /src/ro-try.txt'
955 946 8:48 /tmp/lab6-src /src ro,relatime - ext4 /dev/sdd rw,discard,errors=remount-ro,data=ordered
sh: can't create /src/ro-try.txt: Read-only file system
```

挂载选项是 `ro`、超级块选项仍是 `rw`——和雪球 5 本机实验一模一样，报错原文也是同一个 `Read-only file system`（EROFS）。

单文件 bind 的现成用户——**每个容器**的 `/etc/hosts`、`/etc/hostname`、`/etc/resolv.conf`：

```bash
$ docker run --rm busybox grep -E ' /etc/(hosts|resolv.conf|hostname) ' /proc/self/mountinfo
955 946 8:48 /var/lib/docker/containers/1972…/resolv.conf /etc/resolv.conf rw,relatime - ext4 /dev/sdd rw,…
956 946 8:48 /var/lib/docker/containers/1972…/hostname    /etc/hostname    rw,relatime - ext4 /dev/sdd rw,…
957 946 8:48 /var/lib/docker/containers/1972…/hosts       /etc/hosts       rw,relatime - ext4 /dev/sdd rw,…
```

（容器 ID 目录名已截短。）dockerd 为容器生成这三个文件后，**逐个单文件 bind** 进容器的挂载表——雪球 6 手搓的就是这件事的原型；`/etc/resolv.conf` 里写着 `127.0.0.11`，那正是[第 5 篇](/Linux/basics/linux-05-netns-iptables)拆过的嵌入式 DNS 的入口。

**开头三笔账，逐笔销掉**：

1. 「同一份文件、无复制无延迟」→ inode 同号（雪球 2、8），两边操作的是同一个文件对象
2. 「EROFS 在内核层」→ 只读是挂载选项（雪球 5），容器输出里 `ro` 与 `rw` 同框为证
3. 「rprivate 不展开」→ 雪球 7 传播属性；Docker 主动递归设 private，焊死跨命名空间的挂载传播

再加上 Docker 系列的坑①（bind 空目录遮蔽镜像内容）——就是雪球 1 的盖布。

**一句话总结**：`docker run -v /宿主路径:容器路径` = 新建 mnt namespace（第 1 篇）＋ 在它的挂载表里写一条 bind 记录（本文）＋ 默认递归 private（雪球 7）。

---

## 雪球 9：写进 fstab——重启后还在；最后统一清理

上面的挂载都是临时的，重启即失。最后一球加一行 fstab 固化（手册原例就是 `/olddir /newdir none bind`）：

```bash
$ echo '/tmp/lab6-src /tmp/lab6-fstab none bind 0 0' >> /etc/fstab
$ mkdir /tmp/lab6-fstab
$ mount -a                                      # 立即生效，无需重启

$ findmnt /tmp/lab6-fstab
TARGET          SOURCE                  FSTYPE OPTIONS
/tmp/lab6-fstab /dev/sdd[/tmp/lab6-src] ext4   rw,relatime,discard,errors=remount-ro,data=ordered
```

标准 Linux 由 systemd 在启动时处理 fstab。**本机 WSL 注意**：`/etc/wsl.conf` 里 `automount` 的 `mountFsTab=false`，WSL 启动并不处理 `/etc/fstab`，重启后这条 bind 不会自动挂上，需手动 `mount -a`（或交给 systemd 挂载单元）——环境差异，如实记录。（实测完已把这行从 fstab 删除。）

**清理**（本文全部实验对象，一步不落）：

```bash
$ umount /tmp/lab6-shared/leak                  # 先卸"漏"进宿主的那条
$ umount /tmp/lab6-rb/sub /tmp/lab6-src/sub     # rbind 复制出的子挂载要先卸
$ umount /tmp/lab6-dst /tmp/lab6-rb /tmp/lab6-ro /tmp/lab6-conf \
         /tmp/lab6-nest/here/via-bind /tmp/lab6-shared /tmp/lab6-priv
$ rm -rf /tmp/lab6-*
$ findmnt | grep lab6 || echo 挂载表无残留
挂载表无残留
```

（第二条注释是实测踩的坑：直接卸 rbind 的顶层会报 `Device or resource busy`，因为目标侧复制出的子挂载还占着 `/tmp/lab6-rb/sub`——正好是雪球 3「子挂载」知识的现场复习。）

---

## 案例

滚完九球，来一个真实使用场景：把 Windows 的 C 盘挂进 WSL、再做个软链接方便代码同步——用的正是雪球 1 的 mount 三段式和雪球 4 的软链接。

```bash

# 新建一个目录（我本机默认没有这个目录）
sudo mkdir -p /mnt/c

# 绑定C盘到 /mnt/c中
# -t drvfs：指定文件系统类型为 drvfs（WSL 专用的 Windows 文件系统驱动）
sudo mount -t drvfs C: /mnt/c

# 3. 做成软链接：/root/trufor → Windows 那个文件夹
ln -s /mnt/c/Users/chengongyi/Projects/baidu-forgery-detection-trial/trufor-deploy /root/trufor

```

---

## 命令怎么记

按刚才滚雪球的顺序记命令：

| 想干什么 | 命令 / 写法 | 在哪球用过 |
|----------|-------------|-----------|
| 挂块内存盘当教具 | `mount -t tmpfs 名字 挂载点` | 1 |
| 给一棵子树开第二个入口 | `mount --bind 源 目标` | 2、6 |
| 连子挂载一起搬 | `mount --rbind 源 目标` | 3 |
| 看挂载表原文 | `grep ' 挂载点 ' /proc/self/mountinfo` | 3、5、8 |
| 日常查挂载 | `findmnt 挂载点` / `findmnt -T 路径` | 3 |
| 只看选项 / 传播属性 | `findmnt -no OPTIONS`、`-no TARGET,PROPAGATION` | 5、7 |
| 给一条挂载上 ro 锁 | `mount -o remount,ro,bind 挂载点`（三词缺一不可） | 5 |
| 验证「同一份文件」 | `stat -c 'inode=%i'` | 2、6、8 |
| 进挂载小屋做实验 | `unshare -m`（🧗 真漏加 `--propagation unchanged`） | 7 |
| 容器里核对 `-v` | `docker run --rm -v …容器命令` | 8 |
| 开机自动挂 | `/源路径 /目标路径 none bind 0 0` + `mount -a` | 9 |
| 卸载 | `umount 挂载点`（rbind 的子挂载先卸） | 1、9 |

## 历史包袱

- **无参 `mount` 列表是老格式**：它读的 `/etc/mtab` 是指向 `/proc/self/mounts` 的软链，那份老格式文件没有 root 字段，bind 的证据在读它的那一刻就丢了（雪球 3 本机实测）。mount(8) 明说列表模式「只为向后兼容保留」，现行推荐是 `findmnt(8)`——看老脚本要认识它，新排查别依赖它。
- **ro bind 的「一步写法」是用户态补锅**：内核的 bind 创建本就不接受 ro，经典姿势是挂上再 `remount`（雪球 5）；util-linux 2.27 起 `mount -o bind,ro 源 目标` 能一步写完，但那只是 mount 命令替你自动补了第二次 remount 系统调用，手册注明「非原子」。
- **不带 `bind` 的 `remount,ro` 是超级块语义**：老内核上它真走通时会把同一块盘**所有入口**一起变只读；本机实测则被 busy 顶回、ro 静默丢弃——无论哪种结局都不是你要的。历史语义，别当现行写法。

---

## 和系列其它篇

| 相关篇 | 在这条雪球路上的位置 |
|--------|---------------------|
| [Docker 第 12 篇](/云原生/docker/docker-14-data-persistence) 持久化 | 开头三笔账的出处；其雪球 3（bind）在雪球 2/8 内核层复现，其雪球 4 的 `:ro` 与坑①坑②分别在雪球 5、雪球 1、雪球 6 对上 |
| [Docker 第 18 篇](/云原生/docker/docker-20-namespace) | 雪球 7 的 mnt namespace 系统展开 |
| [Docker 第 17 篇](/云原生/docker/docker-22-unionfs) | 雪球 8 容器 mountinfo 里的父挂载 `946` 就是 overlay 根 |
| [Linux 第 1 篇](/Linux/basics/linux-01-nsenter-prerequisites) | `/proc/self`（组块 1）、思考题 2 的能力模型（组块 5）、`unshare -m` 的前置 |
| [Linux 第 5 篇](/Linux/basics/linux-05-netns-iptables) | 雪球 7「视图类资源跟命名空间走」的类比；雪球 8 的 `127.0.0.11` 嵌入式 DNS |

---

## 小结

从一块 tmpfs 盖布滚起，每球只加一个因素：

1. **盖布**（雪球 1）：挂载是替换视图，原内容被盖住不是被删，卸载即揭开——Docker 坑①的底层
2. **bind 双入口**（雪球 2）：两个路径同一个 inode、零复制零延迟——账①
3. **挂载账本**（雪球 3）：bind = 挂载表里多一条「设备 + root 子树 → 新挂载点」的记录；`--bind` 不带子挂载，`--rbind` 才带；无参 `mount` 丢证据
4. **不是软链接**（雪球 4）：链接是盘上的对象（人人同见），bind 是挂载表里的记录（**每个 mnt ns 一份**）——容器按容器定制视图的根基
5. **ro 锁门不锁货**（雪球 5）：`remount,ro,bind` 锁的是挂载（VFS 条目），源路径仍可写；EROFS 在内核 VFS 层、进程绕不过——账②
6. **单文件 bind**（雪球 6）：源与挂载点**类型必须一致**（文件对文件）；Docker `/etc/hosts` 三件套的原型、坑②的答案
7. **mnt ns 与传播**（雪球 7）：屋里挂的屋外看不见；shared 真会跨命名空间「漏」（🧗 实测复现）；Docker 的 `rprivate` = 递归 private，焊死传播门——账③
8. **容器验证**（雪球 8）：`-v` = mnt ns ＋ 一条 bind 记录 ＋ rprivate；inode 跨容器同号、`ro`/`rw` 同框
9. **fstab**（雪球 9）：`/源路径 /目标路径 none bind 0 0`；WSL 默认不处理 fstab，需手动 `mount -a`

---

## 思考题

> 1. 雪球 8 容器里 `ls -A /src` 能看到 `sub` 目录，但里面是空的（宿主在 `/tmp/lab6-src/sub` 挂的 tmpfs 文件看不到）。不加任何额外参数的前提下，宿主**后来**在 `/tmp/lab6-src` 下新挂一个子挂载，已经运行中的容器能看到吗？想让容器里 `--rbind` 式地全看到，该查 Docker 的哪个机制？（提示：雪球 3 的 bind 只搬「挂载那一刻」的子树；雪球 7 讲过一种让挂载事件「跟过去」的属性。）
> 2. 容器里明明是 root，为什么 `umount /src` 卸不掉宿主 bind 进来的挂载？（提示：umount(2) 需要 `CAP_SYS_ADMIN` 能力；`docker run` 默认给容器的能力白名单里没有它——能力模型见[第 1 篇](/Linux/basics/linux-01-nsenter-prerequisites)组块 5。）

---

## 参考资料

- [mount(8) - Linux manual page](https://man7.org/linux/man-pages/man8/mount.8.html)（util-linux 2.43.devel 手册，2026-05 取自上游；本机 util-linux 2.37.2）——bind 操作、fstab 写法、只读两层语义、Shared subtree operations
- [mount_namespaces(7)](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)（man-pages 6.18）——挂载命名空间与传播属性完整语义
- [proc(5)](https://man7.org/linux/man-pages/man5/proc.5.html) —— `/proc/self/mountinfo` 字段定义 ｜ [fstab(5)](https://man7.org/linux/man-pages/man5/fstab.5.html) ｜ [findmnt(8)](https://man7.org/linux/man-pages/man8/findmnt.8.html)
- [Docker Docs · Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)（2026-07 版）——`-v`/`--mount` 行为、遮蔽与自动建目录
- 本机实测环境：WSL2 Ubuntu-22.04（内核 6.6.87.2，root）、util-linux 2.37.2、Docker 29.1.3（busybox 镜像）
