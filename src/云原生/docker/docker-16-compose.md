---
title: Docker Compose 编排——从一个 Nginx 滚成一整栈
sidebarGroup: Docker 系列
shortTitle: 16 Compose 编排
order: 16
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
description: 从一个 5 行 Nginx 开始，每次只加一个因素：多服务 DNS、卷、.env、就绪等待、本地构建，像堆雪球一样学会 Compose。
---

> **Docker 系列 · 第 16/33 篇**
> 上一篇：[《Docker 网络——从 localhost 不通滚到能用名字互访》](/云原生/docker/docker-15-network) · 下一篇：[《从零理解 HTTPS——Nginx 容器从红页到可信（师生对话实录）》](/云原生/docker/docker-17-https-nginx)

---

## 开头：先跑通一个页面，再往上加东西

本地开发一套 Nacos + MySQL + Gateway，每个服务一条 `docker run`。端口、卷、环境变量、启动顺序散在 bash 里：新人不敢动，改一处漏两处，CI 和本机命令还对不上。

根因是 **`docker run` 是过程式的**——每条命令只说「现在做一步」。**Docker Compose** 换成声明式：一份 YAML 写整组容器**应该长什么样**，一条 `docker compose up` 把实际状态搬过去。

本篇不先背概念。实验目录始终是 `/root/compose-lab`，**同一个网站一路长大**：

| 雪球 | 你加上去的 | 当场能看见的效果 |
|------|------------|------------------|
| **1** | 一个 nginx | 浏览器/`curl` 出欢迎页 |
| **2** | 再加一个 redis | 容器里 `nslookup redis` 能解析，`ping` 回 PONG |
| **3** | 给 nginx 挂本地 html | 页面变成你写的 `<h1>` |
| **4** | 给 redis 挂命名卷 | `down` 后再 `up`，键还在；`down -v` 才没 |
| **5** | `.env` 改端口 | 变成 8081，先 `config` 再访问 |
| **6** | 健康检查 | redis 变 Healthy 之后，web 才 Starting |
| **7** | `build` 自己的镜像 | `curl` 出 `built by compose` |
| **8** 🧗 | `--scale`、CPU/内存上限 | 固定端口会翻车；inspect 能看到限制 |

每一节给出**当时完整的** `compose.yaml`（方便整份复制），但正文只强调「相对上一节新增了什么」。输出均来自本机：WSL2 Ubuntu-22.04 + Docker 29.1.3 + Compose v2.40.3。官方：[Compose overview](https://docs.docker.com/compose/)、[Compose file reference](https://docs.docker.com/reference/compose-file/)。

---

## 雪球 1：五行星，一条命令，一个欢迎页

建目录，写入最小文件。Compose V2 默认找 `compose.yaml`（老名字 `docker-compose.yml` 也能认）：

```bash
mkdir -p /root/compose-lab && cd /root/compose-lab

cat > compose.yaml <<'EOF'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
EOF

docker compose up -d
```

本机输出：

```text
 Network compose-lab_default  Creating
 Network compose-lab_default  Created
 Container compose-lab-web-1  Creating
 Container compose-lab-web-1  Created
 Container compose-lab-web-1  Starting
 Container compose-lab-web-1  Started
```

六行里 Compose 做了两件事：建项目网络 `compose-lab_default`，起容器 `compose-lab-web-1`。名字规则是 **项目名-服务名-序号**。项目名默认等于**目录名** `compose-lab`。

YAML 就三层缩进（空格，别用 Tab）：`services` → 服务名 `web` → `image` / `ports`。`8080:80` 和[第 15 篇](/云原生/docker/docker-15-network) 的 `-p` 是同一件事。

看效果：

```bash
docker compose ps
curl -s localhost:8080 | grep "<title>"
docker compose logs --tail=2 web
```

本机：

```text
NAME                IMAGE          COMMAND                  SERVICE   CREATED         STATUS        PORTS
compose-lab-web-1   nginx:alpine   "/docker-entrypoint.…"   web       5 seconds ago   Up 1 second   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp

<title>Welcome to nginx!</title>

web-1  | 2026/08/17 13:00:20 [notice] 1#1: start worker process 35
web-1  | 172.26.0.1 - - [17/Aug/2026:13:00:21 +0000] "GET / HTTP/1.1" 200 896 "-" "curl/7.81.0" "-"
```

`ps` 比 `docker ps` 多一列 **SERVICE**。日志第二行是 nginx 访问日志：有人 `GET /`，回了 `200`。页面通了，这一球就算滚起来了。

清场（先记住，后面几节还要用同一目录反复 `up`）：

```bash
docker compose down
```

```text
 Container compose-lab-web-1  Stopping
 Container compose-lab-web-1  Stopped
 Container compose-lab-web-1  Removing
 Container compose-lab-web-1  Removed
 Network compose-lab_default  Removing
 Network compose-lab_default  Removed
```

`up` 建了什么，`down` 就删什么——容器和网络。**卷暂时还没有**，所以还看不出「数据还在不在」。

现在回头看刚才冒出来的三个名字，Compose 的三层模型才有着落：

```text
Project（工程）          ← 目录 compose-lab，一份 YAML
└── Service（服务）      ← YAML 里的 web
    └── Container（容器）← 跑起来的 compose-lab-web-1
```

Compose 是**单机**编排：不管集群负载均衡、故障在别的机器上重拉。那是 Swarm / K8s 的事。

---

## 雪球 2：再加一个 Redis，用服务名互相找到

真实项目不会只有一个容器。**只新增 `redis` 服务**，`web` 用短格式 `depends_on` 点名依赖它：

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
docker compose up -d
```

```text
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

两个细节：**redis 先创建、先启动**；两个容器进了**同一张项目网络**。于是[第 15 篇](/云原生/docker/docker-15-network) 的自定义 bridge + 内嵌 DNS 直接能用——同网络里用**服务名**当主机名：

```bash
docker compose exec web nslookup redis
docker compose exec redis redis-cli ping
```

```text
Server:		127.0.0.11
Address:	127.0.0.11:53

Non-authoritative answer:
Name:	redis
Address: 172.26.0.2

PONG
```

`127.0.0.11` 就是内嵌 DNS。应用配置里写 `redis:6379` 即可，不用记 IP，也不用过时的 `--link`。`exec` 是在已运行的服务里再跑一条命令。

> 短格式 `depends_on` **只保证 redis 容器先 start，不保证 redis 已经能接连接**。web 启动瞬间去连，仍可能 `connection refused`。先把现象记下，雪球 6 用 healthcheck 补上。

---

## 雪球 3：把页面换成你自己的 HTML

nginx 默认欢迎页没意思。给 `web` 加一行 **bind mount**：把宿主机 `./html` 盖到 nginx 的站点目录，只读。

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - redis
  redis:
    image: redis:7
```

```bash
mkdir -p html && echo '<h1>hello from bind mount</h1>' > html/index.html
docker compose up -d
curl -s localhost:8080
```

```text
<h1>hello from bind mount</h1>
```

这就是[第 14 篇雪球 3](/云原生/docker/docker-14-data-persistence) 的 bind：改宿主机文件，容器读到的就是新页面。语法仍是 `宿主机路径:容器路径:ro`，只是写进 YAML 的 `volumes:`。

---

## 雪球 4：Redis 的数据，删容器之后还在吗？

网页能换了，缓存呢？给 redis 加**命名卷**，并在文件最外层声明卷名（和 `services` 同级）：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - redis
  redis:
    image: redis:7
    volumes:
      - redis-data:/data

volumes:
  redis-data: {}
```

写入一个键，确认卷已经出现，并且带着项目前缀：

```bash
docker compose up -d
docker compose exec redis redis-cli set compose:proof survives-down
docker volume ls --format '{{.Name}}' | grep compose
```

```text
OK
compose-lab_redis-data
```

然后做[第 14 篇雪球 1](/云原生/docker/docker-14-data-persistence) 同款实验——**先 down 掉整套，再 up**：

```bash
docker compose down && docker compose up -d
docker compose exec redis redis-cli get compose:proof
```

```text
"survives-down"
```

`down` 删了容器和网络，**没动卷**。要连数据一起清：

```bash
docker compose down -v
docker compose up -d >/dev/null
docker compose exec redis redis-cli get compose:proof
```

```text
 Volume compose-lab_redis-data  Removing
 Volume compose-lab_redis-data  Removed

(nil)
```

`(nil)` 是 redis 对「键不存在」的固定答复。`down -v` 才会删命名卷。对照第 14 篇开头的 MySQL 故事：`db-data:/var/lib/mysql` 就是这一球的 redis 写法。

---

## 雪球 5：同一份 YAML，换个端口、换套环境变量

开发和测试不该改 YAML 里的硬编码端口。加上 **`${变量:-默认值}`**，值来自同目录 `.env` 或外壳环境变量。

```bash
printf 'WEB_PORT=8081\nWHO=from-env-file\n' > .env
printf 'GREETING=hi-from-envfile\nONLY_IN_ENVFILE=yes\n' > app.env
```

在上一份文件的 `web` 上增加端口变量、`env_file` 和 `environment`（redis / 卷先原样留着也行；下面为了盯配置，只留下 web）：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "${WEB_PORT:-8080}:80"
    env_file:
      - ./app.env
    environment:
      GREETING: overridden-by-environment
      WHO: ${WHO:-default}
    volumes:
      - ./html:/usr/share/nginx/html:ro
```

先不要 `up`。`docker compose config` **不启动任何东西**，只把变量替换后的最终 YAML 打出来：

```bash
docker compose config
```

本机节选：

```text
name: compose-lab
services:
  web:
    environment:
      GREETING: overridden-by-environment
      ONLY_IN_ENVFILE: "yes"
      WHO: from-env-file
    image: nginx:alpine
    ports:
      - mode: ingress
        target: 80
        published: "8081"
        protocol: tcp
```

| 渲染结果 | 说明 |
|----------|------|
| `published: "8081"` | `.env` 里的 `WEB_PORT` 生效了 |
| `GREETING: overridden-by-environment` | 与 `env_file` 重名时，**`environment` 赢** |
| `ONLY_IN_ENVFILE: "yes"` | 只在 env_file 里的键，原样注入 |
| `WHO: from-env-file` | `${WHO}` 在**解析 YAML 时**替换，来自 `.env` |

再启动，进容器核对，并用新端口访问：

```bash
docker compose up -d >/dev/null
docker compose exec web sh -c 'printenv GREETING; printenv ONLY_IN_ENVFILE; printenv WHO'
curl -s -o /dev/null -w '%{http_code}\n' localhost:8081
```

```text
overridden-by-environment
yes
from-env-file
200
```

优先级：**`environment` > `env_file`**。`${VAR}` 发生在宿主机解析阶段，和容器里的环境变量是两件事。改完 YAML 先 `config`，拼错立刻现形。

> 若你把 redis 从这一版临时拿掉了，下一球加健康检查时再一并写回去。

---

## 雪球 6：等到 Redis 真的能干活，再起 Web

雪球 2 留下的坑：`depends_on: [redis]` = 容器 start 了，不等于 `redis-cli ping` 已经 PONG。给 redis 加探针，把依赖改成「等到 healthy」：

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "${WEB_PORT:-8080}:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      redis:
        condition: service_healthy
  redis:
    image: redis:7
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 3

volumes:
  redis-data: {}
```

`up -d` 时本机出现过这样的顺序：

```text
 Container compose-lab-redis-1  Healthy
 Container compose-lab-web-1  Starting
 Container compose-lab-web-1  Started
```

redis 先变成 **Healthy**，web 才 Starting。对照：

| 写法 | 等到什么 | 适用 |
|------|----------|------|
| `depends_on: [redis]` | 容器 **start** | 应用自己会重试 |
| `condition: service_healthy` | 探针 **healthy** | 数据库类慢启动（生产更稳） |

探针也可以写在 Dockerfile 的 `HEALTHCHECK` 里；compose 里写的好处是随环境改、不用重建镜像。

---

## 雪球 7：不要现成 nginx 了，让 Compose 现场 build

前面一直 `image: nginx:alpine`。现在加一个**自己的静态站**：三行 Dockerfile + 一个 html，compose 里写 `build` 而不是 `image`。

```bash
mkdir -p site
echo '<h1>built by compose</h1>' > site/index.html
cat > site/Dockerfile <<'EOF'
FROM busybox
COPY index.html /www/index.html
CMD ["httpd", "-f", "-p", "80", "-h", "/www"]
EOF
```

这一球换演示对象，YAML 只留 `site`（web/redis 的知识点已经练过）：

```yaml
services:
  site:
    build: ./site
    ports:
      - "8082:80"
```

```bash
docker compose up -d --build
```

本机节选：

```text
time="…" level=warning msg="Docker Compose is configured to build using Bake, but buildx isn't installed"
#1 [site internal] load build definition from Dockerfile
#5 [site 1/2] FROM docker.io/library/busybox:latest@sha256:dc2d…
#6 [site 2/2] COPY index.html /www/index.html
#7 naming to docker.io/library/compose-lab-site:latest
 site  Built
 Container compose-lab-site-1  Started
```

没装 buildx 时那行 warning 可以忽略，Compose 会退回内置构建。镜像自动打成 **`项目名-服务名`**：`compose-lab-site:latest`。

```bash
sleep 1 && curl -s localhost:8082
```

```text
<h1>built by compose</h1>
```

Dockerfile 细节见[第 9 篇](/云原生/docker/docker-09-dockerfile)。改了页面再 `up -d --build`，或 `docker compose build --no-cache site`。

一次性进项目网络跑条命令（服务名 DNS 对它同样有效）：

```bash
docker compose run --rm site wget -qO- http://site
```

```text
<h1>built by compose</h1>
```

---

## 雪球 8 🧗：扩成两份，以及给 CPU/内存加盖

### 固定宿主端口会撞车

```bash
docker compose up -d --scale web=2
```

本机翻过车：

```text
 Container compose-lab-web-2  Starting
Error response from daemon: failed to set up container networking: …
Bind for 0.0.0.0:8081 failed: port is already allocated
```

`--scale` **不需要 Swarm**，但 `8081:80` 这种写死的宿主端口，第二个容器没口可占。改成一段端口范围：

```yaml
    ports:
      - "8080-8081:80"
```

```bash
docker compose up -d --build --scale site=2
docker compose ps --format '{{.Name}} {{.Ports}}'
```

```text
compose-lab-site-1 0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
compose-lab-site-2 0.0.0.0:8081->80/tcp, [::]:8081->80/tcp
```

各拿一个宿主端口。把请求分摊给两个实例，还得自己在前面加 nginx/网关——那不是 Compose 的职责。

### 资源上限，单机 `up` 也会写进容器

```yaml
  web:
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 128M
```

`deploy` 当年是 Swarm 字段，其中 **limits 在单机 `docker compose up` 就会生效**：

```bash
docker inspect compose-lab-web-1 --format 'NanoCpus={{.HostConfig.NanoCpus}} Memory={{.HostConfig.Memory}}'
```

```text
NanoCpus=500000000 Memory=134217728
```

0.5 CPU、128 MiB 已经落到 cgroup（原理见[第 21 篇](/云原生/docker/docker-21-cgroups)）。`replicas`、`restart_policy` 等仍是 Swarm 语义，单机 `up` 会忽略。

---

## 命令怎么记、两个历史包袱

按刚才滚雪球的顺序记命令：

| 阶段 | 命令 | 你在哪一球用过 |
|------|------|----------------|
| 起 | `docker compose up -d`（`--build` 先构建） | 1、7 |
| 看 | `ps` / `logs -f` | 1 |
| 进 | `exec <服务> sh` | 2 |
| 一次性 | `run --rm <服务> <命令>` | 7 |
| 校验 | `config` | 5 |
| 清 | `down`（`-v` 连命名卷） | 1、4 |
| 指定文件 / 项目名 | `-f 其它.yml`、`-p 名字` | — |

网上教程常写 `version: '3.8'`。**现在是废弃字段**。本机把 `version` 写进文件，V2 会警告并忽略：

```text
the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion
```

`docker-compose`（带连字符的 V1）已于 2023-06 EOL，换成插件命令 **`docker compose`**。新文件不要写 `version:`。

端口建议仍加引号（`"8080:80"`），V2 不加也不再把 `53:53` 当成六十进制整数——那是 V1 Python YAML 1.1 的坑。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|------|----------------------|
| [第 15 篇](/云原生/docker/docker-15-network) 网络 | 雪球 2：项目网络 + 服务名 DNS |
| [第 14 篇](/云原生/docker/docker-14-data-persistence) 持久化 | 雪球 3 bind、雪球 1 命名卷 |
| [第 9 篇](/云原生/docker/docker-09-dockerfile) Dockerfile | 雪球 7 `build` |
| [第 17 篇](/云原生/docker/docker-17-https-nginx) HTTPS | 下一篇：把编排用到一个完整站点 |
| [第 21 篇](/云原生/docker/docker-21-cgroups) | 雪球 8 的 NanoCpus / Memory |

---

## 小结

从一个 nginx 欢迎页开始，每次只加一种能力：

1. **一份 YAML + `up`/`down`**：声明终态；容器名带着项目前缀。  
2. **多服务**：同一项目网络，服务名就是 DNS。短 `depends_on` 只管启动顺序。  
3. **bind / 命名卷**：页面跟宿主机走；`down` 保数据，`down -v` 才清卷。  
4. **`.env` + `config`**：先看渲染结果再启动；`environment` 覆盖 `env_file`。  
5. **healthcheck**：等到 Healthy 再起依赖方。  
6. **`build`**：Compose 构建并自动 tag 成 `项目名-服务名`。  
7. **`--scale` 撞端口**用端口范围；`deploy.resources.limits` 单机也会生效。

**思考题**：`web` 只写了 `depends_on: [db]`，启动仍报连接拒绝。先查 start 是否等于 ready，再查应用有没有重试、探针探的是不是那个端口。

下一篇：[《HTTPS Nginx——从浏览器红页滚到本机全绿》](/云原生/docker/docker-17-https-nginx)。

---

## 参考资料

- [Docker Compose overview](https://docs.docker.com/compose/)
- [Compose file reference](https://docs.docker.com/reference/compose-file/)
- [Control startup and shutdown order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Compose V2 与 V1 差异 / version 字段废弃](https://docs.docker.com/compose/releases/migrate/)
- 本机：WSL2 Ubuntu-22.04 + Docker 29.1.3 + Compose v2.40.3（未装 buildx，compose build 走内置链路）
