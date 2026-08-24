---
title: Docker 本地镜像载入与载出——离线环境的镜像搬运术
sidebarGroup: Docker 系列
shortTitle: 08 镜像搬运
order: 8
date: 2026-08-15T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - 镜像
description: Docker 本地镜像载入与载出——离线环境的镜像搬运术
---

> **Docker 系列 · 第 8/33 篇**
> 上一篇：[《进入 Docker 容器的四种方式——exec、attach、SSH 与 nsenter》](/云原生/docker/docker-07-enter-container) · 下一篇：[《Dockerfile——从一句 echo 滚到三个能 curl 的自制镜像》](/云原生/docker/docker-09-dockerfile)

---

## 开头：内网服务器上不了 Docker Hub，怎么办？

你在公司内网部署 Kubernetes / Docker，节点**无法访问公网**。应用镜像在 Docker Hub 上，直接 `docker pull` 会超时。

要解决的问题很具体：**把镜像从「有网的机器」安全、完整地搬到「没网的机器」**，最好还能再推到私有仓库，供集群统一拉取。

常见解法：

1. 有网机：**拉取 → 打包 → 拷贝**
2. 内网机：**载入 →（可选）打 tag → 推私有仓库**

本文就讲这条「镜像搬运」链路：为什么要用 `save/load`，它和 `export/import` 差在哪，以及本机跑通后的真实结果。

> **实验环境**（本文命令输出均来自本机）：Docker Client / Server **29.1.2**（Docker Desktop，Windows）。官方命令参考：[docker image save](https://docs.docker.com/reference/cli/docker/image/save/)、[docker image load](https://docs.docker.com/reference/cli/docker/image/load/)、[docker container export](https://docs.docker.com/reference/cli/docker/container/export/)、[docker image import](https://docs.docker.com/reference/cli/docker/image/import/)。

---

## 一、背景：镜像到底在搬什么？

第 5 篇说过：镜像是**只读模板**，由多层文件系统（layer）叠起来，再加上 config / manifest 等元数据；容器是镜像之上再加一层可写层。

搬运时要分清两件事：

| 概念 | 白话 |
|------|------|
| **layer** | 镜像的「积木块」，每层有自己的内容摘要；Registry 可以只传缺的层 |
| **tag** | 给人看的名字，如 `alpine:3.21`；同一镜像 ID 可以挂多个 tag |
| **镜像 ID** | 内容指纹；`save/load` 成功后，两端应看到**同一个 ID** |

所以「用 U 盘拷一个文件夹」和「用 Docker 搬镜像」不一样：

- 乱拷本地存储目录，容易丢层、丢元数据，对不上引擎期望的格式
- `docker save` 导出的是引擎认识的 **tar 仓库包**（含层 + tag）
- 私有 Registry（下篇 Harbor）则按 **layer 增量** 传，比每次全量 tar 更省

**结论先放这儿**：离线分发优先 `save` → 拷贝 → `load`；日常多人协作再上私有仓库。

---

## 二、两条路：save/load 与 export/import

| 方式 | 命令 | 对象 | 载入后镜像 ID |
|------|------|------|---------------|
| **保存镜像（推荐）** | `docker save` → `docker load` | 镜像（含层与 tag） | 与源端 **相同** |
| **导出容器** | `docker export` → `docker import` | 容器文件系统快照 | **新建**（另一枚镜像） |

官方说明：`save` 产出的 tar 含 parent layers 以及指定的 tags；`load` 从 tar（可 gzip/bzip2/xz/zstd）恢复镜像与 tags。`export` 导出的是**容器**文件系统，不包含 volume 挂载内容；`import` 则是把 tarball 变成一枚**新的** filesystem image。

下文先把推荐主路径跑通，再对比旁路。

---

## 三、主路径：有网机 pull → save

### 3.1 拉取镜像

默认从 Docker Hub（`docker.io`）拉取：

```bash
docker pull alpine:3.21
```

本机实际输出：

```text
3.21: Pulling from library/alpine
897d797d2723: Pull complete
Digest: sha256:48b0309ca019d89d40f670aa1bc06e426dc0931948452e8491e3d65087abc07d
Status: Downloaded newer image for alpine:3.21
docker.io/library/alpine:3.21
```

核对本地：

```bash
docker images alpine:3.21
```

```text
REPOSITORY   TAG       IMAGE ID       SIZE
alpine       3.21      48b0309ca019   12.2MB
```

完整 ID：

```text
sha256:48b0309ca019d89d40f670aa1bc06e426dc0931948452e8491e3d65087abc07d
```

### 3.2 导出为 tar（save）

```bash
# 推荐：-o 写文件
docker save alpine:3.21 -o alpine-3.21.tar

# 等价：重定向 STDOUT
docker save alpine:3.21 > alpine-3.21.tar

# 压缩体积（官方示例常见写法）
docker save alpine:3.21 | gzip > alpine-3.21.tar.gz
```

本机未压缩 tar 约 **3.6 MB**（3754496 字节）。`save` 会带上该镜像的层与 tag；也可一次打包多个 tag，例如 `docker save -o multi.tar alpine:3.21 nginx:alpine`。

新版本还支持按平台筛选（API 1.48+）：

```bash
docker image save --platform=linux/amd64 -o alpine-amd64.tar alpine:3.21
```

本地没有对应平台变体时会报错——只保存 daemon 里实际存在的平台。

---

## 四、主路径：内网机 load → 核对 ID

把 `alpine-3.21.tar` 拷到内网（U 盘、`scp` 等均可）后：

```bash
docker load -i alpine-3.21.tar
```

本机为验证「ID 是否一致」，先删掉本地镜像再 load：

```bash
docker rmi alpine:3.21
docker load -i alpine-3.21.tar
```

```text
Loaded image: alpine:3.21
```

再次查看 ID：

```text
sha256:48b0309ca019d89d40f670aa1bc06e426dc0931948452e8491e3d65087abc07d
```

与 save 前**完全一致**——这就是离线分发优先 `save/load` 的关键证据：搬的是同一枚镜像，不是「看起来像 alpine 的另一坨文件」。

---

## 五、打 tag：指向私有仓库

`load` 之后，镜像名往往还是原来的 `alpine:3.21`。若要 `docker push` 到 Harbor 等私有 Registry，必须让名字带上仓库地址：

```text
[<registry 主机>[:端口]/[<项目/命名空间>/]<仓库名>:<标签>
```

本机实验（只打 tag，不真正 push）：

```bash
docker tag alpine:3.21 harbor.example.com/demo/alpine:3.21
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}'
```

```text
REPOSITORY                       TAG    IMAGE ID
alpine                           3.21   48b0309ca019
harbor.example.com/demo/alpine   3.21   48b0309ca019
```

两个名字，**同一个 IMAGE ID**——`tag` 只是多挂一块「门牌」，不复制层。接下来在内网执行：

```bash
docker push harbor.example.com/demo/alpine:3.21
```

推送、HTTPS、hostname 报错等，留给下一篇 Harbor。

清理多余引用时用 `docker rmi <名字>`；只要还有别的 tag 指着同一 ID，层不会立刻被删掉。

---

## 六、旁路：export / import 适合干什么？

有时你想的是：「把**这个容器当前文件系统**打个包带走」，而不是完整镜像仓库。那才用：

```bash
# 从容器导出文件系统（不是从镜像）
docker create alpine:3.21          # 或对已有容器 ID
docker export <容器ID> -o alpine-export.tar

# 再导入成一枚新镜像
docker import alpine-export.tar alpine-imported:lab
```

本机对比结果：

| 项 | 原镜像 `alpine:3.21` | `import` 后 |
|----|----------------------|-------------|
| 镜像 ID | `48b0309ca019…` | `cd548ac5e600…`（**不同**） |
| `docker history` | 可见构建步骤（ADD / CMD） | 单层：`Imported from -` |
| tar 体积（本机） | save ≈ 3.6 MB | export ≈ 7.7 MB（未压缩 rootfs） |

`export` **不会**导出挂载的 volume 内容；`import` 得到的是极简新镜像，原有 layer 历史、大部分构建元数据都丢了（可用 `docker import --change 'ENV …'` 等补少量配置，见[官方 import 文档](https://docs.docker.com/reference/cli/docker/image/import/)）。

**因此**：离线给集群「分发应用镜像」请用 `save/load`；`export/import` 更适合「容器 rootfs 快照 / 特殊迁移」，不要当成默认搬运术。

---

## 七、一张表收束

| 维度 | save / load | export / import |
|------|-------------|-----------------|
| 对象 | 镜像（层 + tag） | 容器文件系统快照 |
| 层历史 | 保留 | 丢失（压成一层） |
| 镜像 ID | 两端一致 | 新建 |
| 元数据 | 较完整 | 极简 |
| 适用 | 离线分发、备份、进私有仓前的中转 | 快速快照、特殊 rootfs 迁移 |

---

## 八、端到端清单（可照着做）

```bash
# === 有网络的机器（跳板机）===
docker pull alpine:3.21
docker save alpine:3.21 -o alpine-3.21.tar
# scp / U 盘拷到内网

# === 内网机器 ===
docker load -i alpine-3.21.tar
docker tag alpine:3.21 harbor.example.com/demo/alpine:3.21
# 配好 Harbor / insecure-registries 后：
# docker push harbor.example.com/demo/alpine:3.21
```

把 `alpine:3.21` 换成你的业务镜像即可；多镜像就多次 `save`，或一次 `docker save -o bundle.tar img1:tag img2:tag`。

---

## 下篇预告

**第 9 篇：《Dockerfile——从一句 echo 滚到三个能 curl 的自制镜像》**

- 从两行 `FROM` + `CMD`，每次加一种能力：COPY 静态页、history、ENTRYPOINT、先清单后代码、多阶段
- 本地 `build` 通过后，再接到第 12 篇 Harbor 做私仓 `push`

---

## 思考题

> 为什么 Docker 镜像通常不适合「FTP 随便拷一份本地目录」，而要用 `save/load`，长期则用 Registry 的分层 push/pull？

提示：镜像由多个 layer 组成，每层有内容摘要；引擎与 Registry 认的是这套格式。`save/load` 保住完整镜像身份；Registry 还能只传缺失的层——这正是后续 Harbor「港口」要发挥的能力。

下一篇见 🐳
