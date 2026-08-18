---
title: Docker Compose 编排——用 YAML 定义一整栈微服务
sidebarGroup: Docker 系列
shortTitle: 13 Compose 编排
order: 13
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: Docker Compose 编排——用 YAML 定义一整栈微服务
---

> **Docker 系列 · 第 13/24 篇**
> 上一篇：[《数据持久化——Volume、Bind Mount 与 tmpfs：容器删了，数据凭什么还在》](/云原生/docker/docker-12-data-persistence) · 下一篇：[《如何通过 docker 部署 HTTPS 访问的 nginx 应用》](/云原生/docker/docker-14-https-nginx)

---

## 开头：五个容器、二十条 docker run，脚本还维护得动吗？

本地开发一套 Nacos + MySQL + Gateway，每个服务一条 `docker run`：端口、卷、环境变量、启动顺序全写在 shell 脚本里。很快你会发现：

- 新人 onboarding：先读 200 行 bash 才敢启动项目
- 改一个环境变量：三处脚本不一致，谁也不敢删旧的
- CI 与本地的命令还不一样，「我这能跑」的经典现场

这些痛苦的根源是 **`docker run` 是「过程式」的**——每条命令描述"现在做一步"，整个栈的状态分散在 N 条命令的执行顺序里。

**Docker Compose** 把它变成「声明式」：用 **一份 YAML 描述整组容器应该长什么样**（终态），**一条命令**让 Docker 把实际状态搬到这个终态。官方定位一句话：定义、分享、运行多容器应用的工具。

本篇全部在本机实测，每一行 YAML、每条输出都跑给你看。实验对象是一套**逐步长大的三件套**：`web`（nginx 页面服务）+ `redis`（缓存）+ `site`（自建镜像的静态站）——从一份 5 行的最小文件起步，每节把 compose.yaml **整体替换**成新版本，跟着抄就能复现全部实验。看完你能回答：`up`/`down` 到底创建了什么、删了什么？服务之间怎么互相找到对方（提示：第 11 篇）？第 12 篇的卷语法怎么搬进来？`depends_on` 为什么经常「不够用」？

> **实验环境**（文中输出均来自本机）：WSL2 Ubuntu-22.04 + Docker 29.1.3 + Compose 插件 v2.40.3。官方参考：[Compose overview](https://docs.docker.com/compose/)、[Compose file reference](https://docs.docker.com/reference/compose-file/)。
>
> 🗺️ **0 基础路线图**：第一次读只走主线，读完就能「一份文件起一套环境、改配置心里有底」。带 🧗 的进阶块用到再回头。
> - **主线（顺序读）**：一（三层模型）→ 二（最小工程）→ 三（多服务与 DNS）→ 四（持久化）→ 五（.env 与校验）→ 六（就绪等待）→ 九（命令速查）
> - **进阶块（🧗）**：七 build 本地构建 ｜ 八 `--scale` 与 deploy 资源限制

---

## 一、是什么：Project / Service / Container 三层模型

Compose 把管理对象分成三层：

```text
Project（工程）          ← 一份 compose.yaml + .env，一个独立的名字空间
└── Service（服务）      ← 逻辑服务，如 web、redis：一段 YAML 声明
    └── Container（容器）← 服务的运行实例，服务可以扩出多个容器（八）
```

- **Project**：默认以**所在目录名**命名（也可 `-p` 指定）。网络、卷、容器都挂在项目名下，互不串门
- **Service**：一段声明——用什么镜像、开什么端口、挂什么卷。它是你写 YAML 时的直接对象
- **Container**：服务跑起来的实例。`web` 服务默认跑出 `web-1` 一个容器

字段上，compose.yaml 的每个服务几乎都能在 `docker run` 里找到对应旗标：`ports` 对 `-p`、`volumes` 对 `-v`、`environment` 对 `-e`、`networks` 对 `--network`——前面 11、12 篇学的知识**原样可用**，只是换了写法。

边界也要说清：Compose 是**单机**编排工具，不做集群那套事——负载均衡（把请求分摊给多个实例）、故障重调度（实例挂了自动在别处重拉一个）是 Swarm/K8s 的地盘。单机与小规模多容器场景，它就是最优解。

---

## 二、第一个工程：一份文件、一条命令、一次清场（实测）

### 2.1 最小 compose.yaml

建个实验目录，写一份最小的 compose 文件（Compose V2 默认找 `compose.yaml`，老文件名 `docker-compose.yml` 也兼容）：

```bash
$ mkdir -p /root/compose-lab && cd /root/compose-lab

$ cat > compose.yaml <<'EOF'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
EOF

$ docker compose up -d
 Network compose-lab_default  Creating
 Network compose-lab_default  Created
 Container compose-lab-web-1  Creating
 Container compose-lab-web-1  Created
 Container compose-lab-web-1  Starting
 Container compose-lab-web-1  Started
```

六行输出，Compose 替你做了两件事：**建了一个项目网络** `compose-lab_default`，**起了一个容器** `compose-lab-web-1`。注意命名规则：**项目名-服务名-序号**——多个工程共存时天然不冲突。

先回头把敲过的命令逐条拆开（`$` 是提示符，不用敲；这些写法后面每节都在用）：

| 命令 | 干什么 |
|------|--------|
| `mkdir -p /root/compose-lab` | 建实验目录；`-p`＝需要的父目录一并创建 |
| `cd /root/compose-lab`（与上一行用 `&&` 相连） | 进目录；`&&`＝前一条**成功**才执行后一条，后面反复出现 |
| `cat > compose.yaml <<'EOF' … EOF` | heredoc 写文件：把两个 `EOF` 之间的内容**原样**写进 `compose.yaml`。不习惯的话，用任何编辑器创建同样内容的文件，效果相同 |
| `docker compose up -d` | 按 compose.yaml 把整个项目跑起来；`-d`＝后台运行（detached） |

再看 YAML 那 5 行：`services:` 下面缩进一层是**服务名**（`web:`），再缩进一层是它的声明——`image` 用什么镜像、`ports` 把宿主机 8080 转发到容器 80（语义同第 11 篇的 `-p`）。缩进是 YAML 的语法（空格，别用 Tab），层级就是靠它表达的。

### 2.2 验证它真的活了

```bash
$ docker compose ps
NAME                IMAGE          COMMAND                  SERVICE   CREATED         STATUS        PORTS
compose-lab-web-1   nginx:alpine   "/docker-entrypoint.…"   web       5 seconds ago   Up 1 second   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp

$ curl -s localhost:8080 | grep "<title>"
<title>Welcome to nginx!</title>

$ docker compose logs --tail=2 web
web-1  | 2026/08/17 13:00:20 [notice] 1#1: start worker process 35
web-1  | 172.26.0.1 - - [17/Aug/2026:13:00:21 +0000] "GET / HTTP/1.1" 200 896 "-" "curl/7.81.0" "-"
```

三条命令逐条拆：

| 命令 | 干什么 | 输出怎么读 |
|------|--------|-----------|
| `docker compose ps` | 列本项目的容器 | 比第 6 篇的 `docker ps` 多一列 **SERVICE**（这个容器属于哪个服务）；PORTS 列的 `0.0.0.0:8080->80` 即「宿主机 8080 → 容器 80」 |
| `curl -s localhost:8080 \| grep "<title>"` | 验证页面真通了 | `curl -s` 静默抓网页；`\|`（管道）把左边命令的输出交给右边；`grep "<title>"` 只留含标题的那一行，少刷屏 |
| `docker compose logs --tail=2 web` | 看服务日志 | `--tail=2` 只取最后 2 行；`web-1 \|` 前缀标明来自哪个容器——多服务混看也不乱 |

第二行日志顺便读懂（nginx 访问日志的标准格式）：宿主机（从网关 `172.26.0.1` 过来）在 `13:00:21` 请求了 `GET /`，nginx 回了 `200`（成功）——正式排障时，`logs -f`（`-f`＝follow，持续滚动新日志）配这个格式，就是你的眼睛。

### 2.3 down：对称清场

```bash
$ docker compose down
 Container compose-lab-web-1  Stopping
 Container compose-lab-web-1  Stopped
 Container compose-lab-web-1  Removing
 Container compose-lab-web-1  Removed
 Network compose-lab_default  Removing
 Network compose-lab_default  Removed
```

`up` 建了什么，`down` 就删什么——容器和网络全清，**卷不在其列**（第四节实测）。这是 `docker run` 脚本永远给不了的对称性：整套环境「一键起、一键清」。

---

## 三、多服务与服务名 DNS：第 11 篇直接复用（实测）

真实项目从来不止一个服务。把 compose.yaml **整体替换**为两服务版——新增 `redis`，`web` 用 `depends_on` 依赖它（短格式就是个名单）：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    depends_on:
      - redis
  redis:
    image: redis:7
```

```bash
$ docker compose up -d
 Network compose-lab_default  Creating
 Network compose-lab_default  Created
 Container compose-lab-redis-1  Creating
 Container compose-lab-redis-1  Created
 Container compose-lab-web-1  Creating
 Container compose-lab-web-1  Created
 Container compose-lab-redis-1  Starting
 Container compose-lab-redis-1  Started
 Container compose-lab-web-1  Starting
 Container compose-lab-web-1  Started
```

两个细节：**redis 先于 web 创建和启动**（`depends_on` 生效）；两个容器进了**同一个项目网络**。于是第 11 篇的知识直接复用——同网络内容器用**服务名**互相解析：

```bash
$ docker compose exec web nslookup redis
Server:		127.0.0.11
Address:	127.0.0.11:53

Non-authoritative answer:
Name:	redis
Address: 172.26.0.2

$ docker compose exec redis redis-cli ping
PONG
```

`127.0.0.11` 就是第 11 篇讲过的内嵌 DNS——Compose 没有发明新网络，只是**自动帮你建了自定义 bridge 并把服务名注册成 DNS 名**。你的应用配置里写 `redis:6379` 即可，不用 IP、不用 `--link`。

两条 `exec` 命令拆开（`exec`＝在**已运行**的服务容器里再执行一条命令，等价于第 12 篇 5.2 用过的 `docker exec`）：

| 命令段 | 含义 |
|--------|------|
| `nslookup redis` | nslookup 是「查域名 → IP」的小工具（alpine 镜像自带）；查的名字就是**服务名** redis。输出里 `Non-authoritative answer` 是 DNS 应答的例行措辞，可忽略——重点是 `Name: redis → Address: 172.26.0.2` |
| `redis-cli ping` | redis-cli 是 redis 官方镜像自带的客户端；`ping` 是握手命令，回 `PONG`＝服务活着、能接活 |

> ⚠️ `depends_on` 短格式只保证**启动顺序**（redis 容器先 start），不保证 redis **就绪**（能接受连接）。web 启动瞬间去连 redis 仍可能吃一个 connection refused——解法在第六节（healthcheck + condition）。

---

## 四、数据持久化：第 12 篇的语法原样搬进来（实测）

第 12 篇十节预告过一段 Compose 写法，现在每一行都能对上了。把 compose.yaml **整体替换**为持久化版——给 redis 加**命名卷**、给 web 挂 **bind mount**（healthcheck 三行先照抄，六节拆解）：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro      # bind mount：宿主目录，只读
    depends_on:
      redis:
        condition: service_healthy
  redis:
    image: redis:7
    volumes:
      - redis-data:/data                     # 命名卷：数据持久化
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 3

volumes:
  redis-data: {}                             # 顶层声明命名卷
```

```bash
$ mkdir -p html && echo '<h1>hello from bind mount</h1>' > html/index.html
$ docker compose up -d
 Container compose-lab-redis-1  Healthy
 Container compose-lab-web-1  Starting
 Container compose-lab-web-1  Started

$ docker compose exec redis redis-cli set compose:proof survives-down
OK

$ curl -s localhost:8080
<h1>hello from bind mount</h1>
```

两个机制同时生效：bind mount 让 nginx 立刻读到宿主机的页面（第 12 篇 5.2 的热更新）；命名卷落在哪——`--format '{{.Name}}'` 让 ls 只输出卷名列（Go 模板，第 12 篇 2.3 认过），`| grep compose` 从中筛出本项目的：

```bash
$ docker volume ls --format '{{.Name}}' | grep compose
compose-lab_redis-data
```

卷名自动加项目前缀。现在做第 12 篇 3.2 的同款实验——**容器删了，数据在吗**：

```bash
$ docker compose down && docker compose up -d
$ docker compose exec redis redis-cli get compose:proof
"survives-down"
```

`down` 删掉了容器与网络，**没动卷**——重新 `up` 后数据还在。那想连数据一起清呢：

```bash
$ docker compose down -v
 Volume compose-lab_redis-data  Removing
 Volume compose-lab_redis-data  Removed

$ docker compose up -d >/dev/null && docker compose exec redis redis-cli get compose:proof
(nil)
```

`>/dev/null` 把 `up` 的过程输出丢进「黑洞」（`/dev/null` 第 12 篇 6.2 认过：写进去的一律消失），好让屏幕只留我们关心的 `get` 结果。而结果是 `(nil)`——redis-cli 对「不存在的键」的固定答复：数据真的随卷一起没了。`down -v` 才会删命名卷（`-v` 就是 `docker rm -v` 的工程级版本）。回头对照第 12 篇十节那段 MySQL 预告，逐行翻译：

| 预告写法 | 对应本篇知识点 |
|------|------|
| `db-data:/var/lib/mysql` | 命名卷挂进服务（本节 redis 同款） |
| `./init:/docker-entrypoint-initdb.d:ro` | bind mount + 只读（本节 html 同款） |
| `volumes: db-data: {}` | 顶层声明命名卷 |

---

## 五、配置与变体：.env、变量替换与 config 校验（实测）

同一份 compose.yaml 要在开发/测试环境跑出不同姿态，靠**变量替换**。写法 `${变量名:-默认值}`（变量有值用变量、没值用默认），变量从**环境变量**或**同目录 `.env` 文件**来。准备两个文件：

```bash
$ printf 'WEB_PORT=8081\nWHO=from-env-file\n' > .env
$ printf 'GREETING=hi-from-envfile\nONLY_IN_ENVFILE=yes\n' > app.env
```

`printf` 拆开：把引号里的内容打到标准输出，`\n` 是换行符（printf 不自动换行，得手动写）；`> 文件名` 把输出**重定向**写进文件。于是 `.env` 是两行 `KEY=VALUE`（Compose 专属的变量来源），`app.env` 也是两行（给后面 `env_file` 用的普通键值文件）。再把 compose.yaml **整体替换**为变量版：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "${WEB_PORT:-8080}:80"               # .env 有就用，没有用 8080
    env_file:
      - ./app.env                            # 把文件里的 KEY=VAL 注入容器环境
    environment:
      GREETING: overridden-by-environment    # 与 env_file 重名，environment 赢
      WHO: ${WHO:-default}
    deploy:
      resources:
        limits:
          cpus: "0.50"                       # 资源上限，八节拆解，这里先带上
          memory: 128M
```

**先校验再启动**——`docker compose config` 不启动任何东西，只把「变量替换、默认值、合并规则」全部渲染成**最终生效的 YAML**（你看到的，就是 Docker 稍后实际会用的）：

```bash
$ docker compose config
name: compose-lab
services:
  web:
    deploy:
      resources:
        limits:
          cpus: 0.5
          memory: "134217728"
    environment:
      GREETING: overridden-by-environment
      ONLY_IN_ENVFILE: "yes"
      WHO: from-env-file
    image: nginx:alpine
    networks:
      default: null
    ports:
      - mode: ingress
        target: 80
        published: "8081"
        protocol: tcp
networks:
  default:
    name: compose-lab_default
```

输出里五处值得看：

| 渲染结果 | 说明 |
|----------|------|
| `name: compose-lab` | 项目名自动取自目录名（九节还会再见它） |
| `published: "8081"` | `${WEB_PORT:-8080}` 被 `.env` 里的 8081 替换——变量真的生效了 |
| `GREETING: overridden-by-environment` | 与 env_file 重名时，**`environment` 赢** |
| `ONLY_IN_ENVFILE: "yes"` | env_file 独有的键，原样注入 |
| `memory: "134217728"` | `128M` 被换算成字节数（128×1024×1024），`cpus: 0.5` 同理被规范化——**渲染结果才是真相** |

**容器内实际值再验一层**（`sh -c '…'`＝把字符串交给容器内的 shell 执行；三条 `printenv`——打印环境变量——用 `;` 相连＝依次执行、互不影响）：

```bash
$ docker compose up -d >/dev/null
$ docker compose exec web sh -c 'printenv GREETING; printenv ONLY_IN_ENVFILE; printenv WHO'
overridden-by-environment
yes
from-env-file

$ curl -s -o /dev/null -w '%{http_code}\n' localhost:8081
200
```

最后一条是「只要状态码」的惯用写法，拆开：`-o /dev/null` 把网页正文丢进黑洞，`-w '%{http_code}\n'` 让 curl 收尾时打印 HTTP 状态码（200＝成功）。端口是 **8081**——正是 `.env` 里 `WEB_PORT` 的值，从文件到端口端到端闭环。优先级链：**`environment` > `env_file`**；而 `${VAR}` 替换发生在**解析 YAML 时**（宿主机侧），与容器内环境变量是两个阶段的事。养成习惯：改完 YAML 先 `docker compose config` 看渲染结果，变量拼错当场现形。

---

## 六、就绪等待：healthcheck + condition（实测）

第三节的遗留问题：`depends_on: [redis]` 只保证 redis 容器**先启动**，不保证它**能干活**。MySQL 起 30 秒才能接连接、redis 起 0.5 秒就能——容器「start」和「ready」之间隔着一个不确定的时间窗。

两步解决。第一步，给被依赖方声明**怎么算健康**：

```yaml
  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]   # 健康探针：能 ping 通才算活
      interval: 3s                          # 每 3s 探一次
      timeout: 3s                           # 单次超过 3s 算失败
      retries: 3                            # 连续失败 3 次才判不健康
```

第二步，把依赖方的 `depends_on` 换成**长格式**，等待条件从"启动了"升级为"健康了"：

```yaml
  web:
    depends_on:
      redis:
        condition: service_healthy          # 等到 healthy 才起 web
```

这正是第四节那份文件里"先照抄"的三行 + 两行。回看第四节 `up -d` 的真实输出：

```text
 Container compose-lab-redis-1  Healthy
 Container compose-lab-web-1  Starting
```

redis 先经历探针检测，状态变 **Healthy** 后 web 才 Starting——这就是 `condition: service_healthy` 在干活。两种写法对比：

| 写法 | 等到什么 | 适用 |
|------|------|------|
| `depends_on: [redis]` | redis 容器 **start** | 依赖方自己有重试逻辑 |
| `condition: service_healthy` | redis **healthy** | 数据库类慢启动服务（生产推荐） |

（健康探针也能写进 Dockerfile 的 `HEALTHCHECK` 指令，镜像自带；compose 里写则随环境可调。）

---

## 七、构建自己的镜像：build 字段（实测）

`image` 用现成镜像，`build` 则让 Compose 直接从 Dockerfile 构建本项目的镜像（Dockerfile 完整教程在[第 9 篇](/云原生/docker/docker-09-dockerfile)，这里三行够用）。先准备构建材料——一个页面 + 一个三行的 Dockerfile：

```bash
$ mkdir -p site
$ echo '<h1>built by compose</h1>' > site/index.html
$ cat > site/Dockerfile <<'EOF'
FROM busybox
COPY index.html /www/index.html
CMD ["httpd", "-f", "-p", "80", "-h", "/www"]
EOF
```

Dockerfile 三行逐行看：

| 行 | 干什么 |
|----|--------|
| `FROM busybox` | 以 busybox 镜像为底座 |
| `COPY index.html /www/index.html` | 把构建目录里的 index.html 拷进镜像的 `/www/` |
| `CMD ["httpd", "-f", "-p", "80", "-h", "/www"]` | 容器启动命令：跑 busybox 自带的 httpd 网页服务器——`-f` 前台运行、`-p 80` 监听 80 端口、`-h /www` 以 `/www` 为站点根目录 |

再把 compose.yaml **整体替换**（这次只剩 site 一个服务，前几节的 web/redis 已完成历史使命）：

```yaml
services:
  site:
    build: ./site                # 上下文目录；也可长格式指定 dockerfile
    ports:
      - "8082:80"
```

```bash
$ docker compose up -d --build
time="…" level=warning msg="Docker Compose is configured to build using Bake, but buildx isn't installed"
#1 [site internal] load build definition from Dockerfile
#1 transferring dockerfile: 128B 0.9s done
#5 [site 1/2] FROM docker.io/library/busybox:latest@sha256:dc2d…
#6 [site 2/2] COPY index.html /www/index.html
#7 exporting to image
#7 naming to docker.io/library/compose-lab-site:latest
 site  Built
 Container compose-lab-site-1  Started
```

（开头那行 warning 是说：本机没装 buildx——官方构建插件，Bake 是它的新一代入口；没装也不影响，Compose 自动退回内置构建链路，输出为 BuildKit 步骤式，`#5`、`#6` 是步骤编号，中间省略若干行。）要点：镜像**自动打上 `项目名-服务名` 的 tag**（`compose-lab-site:latest`），不用手动 `docker build` + `docker tag`。验证页面（`&&`＝前一条成功才执行；刚 Started 的容器有一拍启动时间，隔一秒再访问更稳）：

```bash
$ sleep 1 && curl -s localhost:8082
<h1>built by compose</h1>
```

`build` 与 `image` 可同时写（构建结果按 image 指定的名字打 tag）；改了代码重跑 `up -d --build`，或 `docker compose build --no-cache site` 强制全新构建。

---

## 八、扩缩容与资源限制：单机就能做（实测）

### 8.1 --scale：不需要 Swarm，但小心端口

把 web 扩成两份试试：

```bash
$ docker compose up -d --scale web=2
 Container compose-lab-web-2  Starting
Error response from daemon: failed to set up container networking: …
Bind for 0.0.0.0:8081 failed: port is already allocated
```

**翻车了，而且翻得很有教学价值**：`--scale` 单机就能用（不需要 Swarm），但 `8081:80` 是**固定宿主端口**——第二个容器没端口可占。解法：给一段**端口范围**，Compose 自动分配：

```yaml
    ports:
      - "8080-8081:80"          # 两个宿主端口，分给两个容器
```

```bash
$ docker compose up -d --build --scale site=2
$ docker compose ps --format '{{.Name}} {{.Ports}}'
compose-lab-site-1 0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
compose-lab-site-2 0.0.0.0:8081->80/tcp, [::]:8081->80/tcp
```

两个容器各拿到一个宿主端口——单机扩容成立。多实例的**负载均衡**（把请求分摊给多个实例）仍需前面加一层（如 nginx/网关），这是架构问题，不是 Compose 的锅。

### 8.2 deploy.resources：单机 up 也生效（附实测证据）

`deploy` 字段族历史上是 Swarm 专属，其中**资源限制**如今单机 `docker compose up` 就会应用：

```yaml
  web:
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 128M
```

口说无凭，inspect 容器的宿主配置（`--format` 的 Go 模板写法第 12 篇 2.3 认过；NanoCpus/Memory 是内核 cgroup 的字段，[第 20 篇](/云原生/docker/docker-20-cgroups)细讲）：

```bash
$ docker inspect compose-lab-web-1 --format 'NanoCpus={{.HostConfig.NanoCpus}} Memory={{.HostConfig.Memory}}'
NanoCpus=500000000 Memory=134217728
```

0.5 CPU（5 亿纳秒）与 128 MiB（134217728 字节）实打实写进了容器的资源限制。`deploy` 里 `replicas`、`restart_policy`、`update_config` 等字段则仍属 Swarm 语义，单机 `up` 会忽略——需要滚动更新（新版容器逐个替换旧版）与故障重调度（实例挂了自动重拉）时，就是离开 Compose 换编排系统的信号。

---

## 九、命令速查与两代 Compose（实测）

### 9.1 按生命周期记命令（标注出处）

| 阶段 | 命令 | 本文 |
|------|------|------|
| 起 | `docker compose up -d`（`--build` 先构建） | 二、七 |
| 看 | `docker compose ps` / `logs -f <svc>` / `top` / `ls` | 二 |
| 进 | `docker compose exec <svc> sh` | 三 |
| 一次性 | `docker compose run --rm <svc> <cmd>` | 九 |
| 改 | `docker compose up -d`（声明式：改 YAML 再 up 即收敛） | 五 |
| 校验 | `docker compose config [--services]` | 五 |
| 清 | `docker compose down [-v]` | 二、四 |

`run --rm` 补一个实测——起一个**一次性**容器执行命令：

```bash
$ docker compose run --rm site wget -qO- http://site
<h1>built by compose</h1>
```

拆开：`run` 与 `up` 的区别是一次性（跑完命令就退出），`--rm`＝退出即删不留尸体；`wget -qO- http://site` 用容器内的 wget 抓网页——`-q` 安静模式、`-O-` 把内容打印到终端而不是存成文件。注意主机名 `site` 照样解析——一次性容器也接在项目网络上，服务名 DNS 对它一样有效。

指定文件与项目名：`docker compose -f docker-compose.prod.yml up -d`、`-p myproj up -d`。

### 9.2 `version` 字段已废弃；V1 已 EOL（历史语境）

网上教程常以 `version: '3.8'` 开头——**现在是废弃写法**。实测把 `version` 写进文件，V2 会警告并忽略它：

```bash
$ docker compose config
time="…" level=warning msg="/tmp/ver-test/compose.yaml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
name: ver-test
services:
  …
```

（顺带注意输出第二行：项目名 `ver-test` 来自目录名。）两个历史包袱一次说清：

- **`version:` 顶层键**：V1 时代用来声明文件格式规范的版本（schema＝格式规范）；Compose Specification 统一后已无意义，**新文件直接不写**
- **`docker-compose`（V1，带连字符的独立二进制）**：2023 年 6 月已 EOL（End of Life，官方停止维护），Python 实现被 Go 重写的 **V2 插件**（`docker compose`）取代。见到 `docker-compose up` 老脚本，翻译成 `docker compose up` 即可

另一个 V1 时代的坑也顺手平反：教程说端口必须加引号，否则 YAML 会把 `53:53` 解析成六十进制整数（像「53 分 53 秒」那样换算成一个数）——那是 V1 的 Python YAML 1.1 解析器的行为。实测 V2 不加引号照常解析（`head -4`＝只看前 4 行）：

```bash
$ docker compose -f port-test.yaml config | head -4
services:
  web:
    image: nginx:alpine
    ports:
      - mode: ingress
        target: 80
```

引号仍建议加（明确是字符串、可读性好），但不再是"不加就坏"。

---

## 十、与系列其它篇的衔接

| 相关篇 | 在 Compose 中的体现 |
|------|---------------------|
| [第 11 篇](/云原生/docker/docker-11-network) 网络（前文） | 项目网络自动创建、服务名 DNS（内嵌 DNS 127.0.0.11）、`ports`/`expose` |
| [第 12 篇](/云原生/docker/docker-12-data-persistence) 持久化（前文） | 命名卷 + 顶层 `volumes:`、bind mount + `:ro`（第四节原样复用） |
| [第 14 篇](/云原生/docker/docker-14-https-nginx) HTTPS 实战（后文） | 第一个综合运用的完整项目 |
| [第 20 篇](/云原生/docker/docker-20-cgroups) Cgroups（后文） | `deploy.resources.limits` 落到 NanoCpus/Memory（八节埋的钩子） |

---

## 小结

- Compose 是**声明式单机编排**：一份 `compose.yaml`（Project/Service/Container 三层）描述终态，`up` 收敛、`down` 对称清场（容器+网络，**不含卷**，`down -v` 才删）。
- 资源命名跟着项目走：`compose-lab_default` 网络、`compose-lab_redis-data` 卷、`compose-lab-web-1` 容器、`compose-lab-site` 镜像——项目名默认是目录名。
- 同项目网络内**服务名 DNS 互访**（第 11 篇内嵌 DNS 复用）；`depends_on` 短格式只管启动顺序，**就绪要靠 healthcheck + `condition: service_healthy`**。
- 第 12 篇卷语法原样可用：命名卷（顶层 `volumes:` 声明）+ bind mount（`:ro` 只读）；`down` 后数据在、`down -v` 后数据没（实测）。
- 配置变体：`${VAR:-默认}` 替换发生在解析时，值来自 `.env`/环境变量；容器内优先级 **`environment` > `env_file`**（printenv 实证）；改完先 `docker compose config` 看渲染结果。
- `build: ./dir` 让 Compose 构建并自动 tag 成 `项目名-服务名`；`--scale` 单机可用但**固定宿主端口会撞车**（用端口范围）；`deploy.resources.limits` 单机 `up` 即生效（inspect 实证），`replicas` 等仍属 Swarm。
- 历史包袱：`version:` 已废弃（警告原文实测）、`docker-compose` V1 已 EOL——新文件不写 version，命令用 `docker compose`。

**思考题**：若 `web` 依赖 `db`，仅配置 `depends_on: [db]` 而不做 healthcheck，应用启动仍报「连接拒绝」时，应从哪几个方向排查？（提示：start ≠ ready；应用有无重试；探针本身是否探对了东西。）

至此，主线已覆盖：**安装与日常命令 → 镜像交付 → 网络 / 持久化 / Compose 编排**。下一篇用这些能力部署一个 HTTPS 访问的 nginx 应用，再往后是日志监控，然后转入底层原理（Namespace、进程视角、Cgroups、runtime）。

下一篇：[《如何通过 docker 部署 HTTPS 访问的 nginx 应用》](/云原生/docker/docker-14-https-nginx)。

---

## 参考资料

- [Docker Compose overview](https://docs.docker.com/compose/) — 官方定位与核心概念
- [Compose file reference](https://docs.docker.com/reference/compose-file/) — services/volumes/networks 全字段（Compose Specification）
- [Control startup and shutdown order](https://docs.docker.com/compose/how-tos/startup-order/) — depends_on 与 healthcheck 官方姿势
- [Compose V2 与 V1 差异 / version 字段废弃](https://docs.docker.com/compose/releases/migrate/)
- 本机实测环境：WSL2 Ubuntu-22.04 + Docker 29.1.3 + Compose v2.40.3（apt 发行版；未装 buildx 插件，compose build 走内置构建链路）
