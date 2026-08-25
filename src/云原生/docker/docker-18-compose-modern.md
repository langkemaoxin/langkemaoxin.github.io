---
title: Compose 现代特性——watch 热更、profiles 分组与 init 容器
sidebarGroup: Docker 系列
shortTitle: 18 Compose 现代特性
order: 18
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Compose
description: 在第 16 篇的主线语法之上补齐现代工作流：compose watch 三动作（sync / sync+restart / rebuild）逐个实测、profiles 按需分组与显式点名自动激活、include 拆分公共编排、pre_start init 容器（Compose 5.3+）先 seed 后启动与失败阻断、post_start 钩子。全部实验在 WSL2 + Engine 29.1.3 + Compose v5.5.0 真机跑通。
---

> **Docker 系列 · 第 18/33 篇**
> 上一篇：[《从零理解 HTTPS——Nginx 容器从红页到可信（师生对话实录）》](/云原生/docker/docker-17-https-nginx) · 下一篇：[《Docker 技术底座——沿着「又轻又像一台机器」逐层解开 Namespace、Cgroups 与 UnionFS》](/云原生/docker/docker-19-tech-foundation)

---

## 开头：第 16 篇之后，你迟早撞上的三个烦人时刻

第 16 篇学会了 compose.yaml 的主线语法：服务、网络、卷、环境变量、健康检查。然后你开始**天天用它**，烦人时刻准时到达：

1. **改一行代码，`up --build` 全套重来**——中间件跟着重启、浏览器重新登录、调试现场全丢，为了改一行 Python；
2. **一套编排里塞了十几个服务**——管理后台、数据导入工具、压测容器平时根本不用，但每次 `up` 全体起立，吃内存还占端口；
3. **每个项目的 compose.yaml 里都复制粘贴着同一段 redis 定义**——改一处要改十个仓库，谁改漏了谁线上出事。

这三件事，官方近年都给了正式答案：`watch`、`profiles`、`include`。再加上 2026 年新转正的 `pre_start` init 容器，这一篇把「会用 Compose」升级成「用得现代」。

> 🧪 **实验环境**（全文输出均产自本机，2026-08-25 实测）：Windows + WSL2 Ubuntu 22.04 · Docker Engine 29.1.3 · **Compose v5.5.0**。实验目录 `/root/compose-modern`（文件全部保留，可照抄重做）。
> ⚠️ **版本门槛先说清**：`watch` 要求 Compose ≥ 2.22；**`pre_start` 要求 Compose ≥ 5.3**。Ubuntu apt 源装的是 `2.40.3+ds1`（实测 `docker compose version`），跑不了 `pre_start`。解法是装官方用户级插件（不动系统包）：
> ```bash
> mkdir -p ~/.docker/cli-plugins
> curl -SL https://ghfast.top/https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
>   -o ~/.docker/cli-plugins/docker-compose && chmod +x ~/.docker/cli-plugins/docker-compose
> ```
> 装完 `docker compose version` 输出 `Docker Compose version v5.5.0`——用户级路径优先于 apt 的系统级包，两者可共存。
> 官方文档：[Compose how-tos](https://docs.docker.com/compose/how-tos/)（核验于 2026-08-25）。

🗺️ **本篇路线**：① 案例工程 → ② watch 三动作 → ③ profiles 分组 → ④ include 拆分 → ⑤ pre_start init 容器与钩子 → ⑥ provider services 与 GPU 认脸 → ⑦ 什么时候跟单机 Compose 说再见。其中 ⑥ 是认脸级（本机无 GPU，未实测，已标注）。

前置：[第 16 篇 Compose 编排](/云原生/docker/docker-16-compose)的服务/网络/depends_on 主线语法。

---

## 一、案例工程：一个准备被改三十次的迷你栈

全文围绕一个小工程滚雪球：Flask 小应用（`web`，自己 build）+ Redis（`db`）。四个文件，全部可照抄：

**app/main.py**

```python
import redis
from flask import Flask

VERSION = "v1"
app = Flask(__name__)
r = redis.Redis(host="db", port=6379)
SITE = open("/etc/app/app.conf").read().strip()   # 启动时读一次，后面不再看它

@app.get("/")
def index():
    seed = r.get("seed_msg")
    return f"[{SITE}] {VERSION} seed={seed.decode() if seed else '(none)'}"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)   # debug=True: Werkzeug 热重载
```

**app/app.conf**

```
Modern Compose Lab
```

**app/requirements.txt**

```
flask==3.1.0
redis==5.2.1
```

**Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
COPY app/main.py .
COPY app/app.conf /etc/app/app.conf
EXPOSE 8000
CMD ["python", "main.py"]
```

**compose.yaml**

```yaml
services:
  web:
    build: .
    ports:
      - "8100:8000"
    depends_on:
      - db
  db:
    image: redis:latest
```

三个角色各管一类改动，正好喂饱后面的实验：`main.py` 是**源码**（改了想立刻生效）、`app.conf` 是**启动时读一次的配置**（改了得重启进程）、`requirements.txt` 是**依赖**（改了必须重装）。

起项目：

```bash
docker compose up -d --build
```

> 插问：端口为什么写 8100 不写 8000？——因为我第一版真的写了 `"8000:8000"`，然后收获：
> ```
> Error response from daemon: ... Bind for 0.0.0.0:8000 failed: port is already allocated
> ```
> 本机 8000 被另一个常驻网关占着。宿主端口是**全局资源**，起项目前先想清楚谁在用什么端口——这条教训和第 16 篇 `--scale` 撞端口是同一个道理。

起来后验证：

```bash
$ docker compose ps
NAME                   IMAGE                COMMAND            SERVICE   CREATED         STATUS         PORTS
compose-modern-db-1    redis:latest         "docker-entrypoint…" db       30 seconds ago  Up 26 seconds  6379/tcp
compose-modern-web-1   compose-modern-web   "python main.py"    web       7 seconds ago   Up 3 seconds   0.0.0.0:8100->8000/tcp

$ curl -s localhost:8100
[Modern Compose Lab] v1 seed=(none)
```

> **本节一句话**：案例 = 一个 Flask + 一个 Redis，三类文件（源码/配置/依赖）对应三种「改了之后想要的不同待遇」。

---

## 二、watch：保存即生效的三档反应

### 2.1 为什么不直接 bind mount 硬灌？

第 14 篇学过 bind mount——把宿主目录挂进容器不就热更了吗？官方文档明确把 `watch` 定位成 bind 的**搭档而非替代**，它补的是 bind 做不好的三件事：

| bind mount 的糙处 | watch 的做法 |
|---|---|
| 整目录全量共享，没法按文件挑 | 规则逐条声明，`ignore` 可以精准排除 |
| `node_modules/` 这种海量小文件跟着灌，I/O 高 | ignore 掉，容器里那份归容器 |
| 宿主是 Windows/Mac 时，编译产物跨平台不可用（原生扩展二进制不通用） | 只同步源码，依赖在容器里装 |

一句话：bind 是「整仓搬家」，watch 是「快递指定文件」。

### 2.2 三动作一览

`develop.watch` 规则的核心是 `action`，三选一：

| action | 改动怎么到达容器 | 容器的命运 | 典型文件 |
|---|---|---|---|
| `sync` | 复制进容器 | **不动**（进程自己热重载） | 源码（配框架 reloader） |
| `sync+restart` | 复制进容器 | **同一个容器重启** | 配置文件（进程启动时读一次的） |
| `rebuild` | 不复制，重新构建镜像 | **换镜像换容器** | 依赖清单（requirements.txt / package.json） |

下面逐个实测。先给 `web` 挂上规则（compose.yaml **整体替换**）：

```yaml
services:
  web:
    build: .
    ports:
      - "8100:8000"
    depends_on:
      - db
    develop:
      watch:
        - action: sync
          path: ./app
          target: /app
          ignore:
            - app.conf
            - requirements.txt
        - action: sync+restart
          path: ./app/app.conf
          target: /etc/app/app.conf
        - action: rebuild
          path: ./app/requirements.txt
  db:
    image: redis:latest
```

读法：`./app` 整目录走 sync（但 conf 和依赖清单除外）；conf 单独走 sync+restart，落点是 `/etc/app/app.conf`；依赖清单走 rebuild。`target` 决定落点——`path: ./app` + `target: /app` 意味着 `./app/main.py` 改动会落到容器内 `/app/main.py`。

### 2.3 实测 sync：容器纹丝不动

把 watch 挂到后台（它是个长驻命令，正常开发时占一个终端）：

```bash
nohup docker compose watch web > watch.log 2>&1 &
```

⚠️ **第一个坑实测**：watch 刚启动时会先把容器**重建一次**——因为 compose.yaml 变了（多了 develop 段），这是一次普通的配置变更重建，不是 watch 干的。看日志认准 `Watch enabled` 这一行，**它之后的行为才是 watch 的**：

```
 Container compose-modern-web-1 Recreate
 Container compose-modern-web-1 Recreated
 Container compose-modern-web-1 Starting
 Container compose-modern-web-1 Started
Watch enabled
```

改 `main.py`（把 `VERSION = "v2"` 改成 `"v3"`，用 sed 模拟保存动作）：

```bash
$ sed -i 's/VERSION = "v2"/VERSION = "v3"/' app/main.py

# 5 秒后
$ curl -s localhost:8100
[Modern Compose Lab] v3 seed=(none)          # ← 新版本号已经在线上

$ docker compose ps -q web
ef56c923a68d                                 # ← 和改动前一模一样
```

watch.log 里对应的事件：

```
Syncing service "web" after 2 changes were detected
```

证据链三点：页面变了（v3）、容器 ID 没变（ef56…）、日志只有 Syncing 没有 Recreate。**文件被快递进去，重启这件事交给了 Flask 自己的 reloader**——这就是 sync 的分工。

### 2.4 实测 sync+restart：同一个容器，重启进程

改 `app.conf`：

```bash
$ echo "Modern Compose Lab (renamed)" > app/app.conf

# 6 秒后
$ curl -s localhost:8100
[Modern Compose Lab (renamed)] v3 seed=(none)   # ← 新站名生效了

$ docker compose ps -q web
ef56c923a68d                                    # ← ID 还是它
```

ID 没变但新站名生效了——而 `SITE` 是**启动时读一次**的，进程不重启就永远读不到新值。所以真相只有一个：容器被重启了。watch.log 作证：

```
 Container compose-modern-web-1 Restarting
 Container compose-modern-web-1 Started
service(s) ["web"] restarted
```

注意措辞是 **Restarting 不是 Recreated**：sync+restart 重启的是**同一个容器**（ID 不变、开机时间变）；它和 rebuild（换容器）的区别就在这一行日志里。容器内 `/etc/app/app.conf` 也确认已被同步成新值（`docker compose exec -T web cat /etc/app/app.conf`）。

### 2.5 实测 rebuild：镜像层重造，依赖真装上

给 `requirements.txt` 追加一个新依赖：

```bash
$ echo "ujson==5.10.0" >> app/requirements.txt
```

watch 触发重建（含 pip install，等半分钟），然后三连验证：

```
$ docker compose ps -q web
51460284c7fe                    # ← 容器换了（原来 ef56c923a68d）
$ docker inspect -f '{{.Image}}' $(docker compose ps -q web) | cut -c8-19
2aba41929aef                    # ← 镜像也换了（原来 55cde761f7f9）
$ docker compose exec -T web pip show ujson
Name: ujson
Version: 5.10.0                 # ← 新依赖在容器里真实可用
```

watch.log 的关键行：`Image compose-modern-web Building` → `Container compose-modern-web-1 Recreate`。依赖变更不可能靠「复制文件」解决——必须重走 Dockerfile 的 `pip install` 层，这就是 rebuild 存在的理由。

### 2.6 规则细节与三个坑

- **`Watch enabled` 之前改的文件会被漏掉**（实测踩中）：我在 watch 还在重建容器时改了 conf，结果没有任何 Syncing 事件、文件也没同步——文件系统事件只在监听开始后才有。官方的答案是给规则加 `initial_sync: true`：watch 启动时先把 `path` 下的存量文件与容器对齐一次（本机未单测此参数，行为以[官方 watch 文档](https://docs.docker.com/compose/how-tos/file-watch/)为准）。
- **`ignore` 的相对路径基准是本条规则的 `path`，不是项目根目录**——`path: ./app` 下的 `ignore: [app.conf]` 指的是 `./app/app.conf`。
- **镜像里要有 `stat`/`mkdir`/`rmdir`**，且容器用户对 target 有写权限；非 root 镜像用 `COPY --chown=app:app . /app` 保证属主（官方 prerequisite）。
- watch 只对**带 `build` 的服务**生效，纯 `image:` 的服务没得 watch。

> 🧱 **易混点独立成块：改 app.conf 时，sync 和 sync+restart 两条规则谁处理？**
> 我的 sync 规则罩着整个 `./app`，conf 就在里面；sync+restart 规则又精确指着它。实验做法：把 sync 规则的 `ignore` 拿掉，改 conf，看落点。实测结果（Compose v5.5.0）：**两条都触发了**——`/app/app.conf`（sync 的落点）和 `/etc/app/app.conf`（sync+restart 的落点）都变成新值，容器也重启了，页面正常出新站名。结论：**restart 规则兜底生效，正确性不靠 ignore**；ignore 的真实价值是**性能与清洁**——别把 `node_modules/`、宿主的依赖清单灌进容器（Node 项目的原生模块跨平台必炸，这是官方举例的场景）。
> **本节一句话**：sync 动进程不动、sync+restart 动进程不动机器、rebuild 重新造机器——三类文件三档待遇，别混。

---

## 三、profiles：一份编排，按需分组

给工程加两个「平时不想起」的服务——管理后台和一次性迁移工具（compose.yaml **整体替换**）：

```yaml
services:
  web:
    build: .
    ports:
      - "8100:8000"
    depends_on:
      - db
  db:
    image: redis:latest
  admin-portal:
    image: nginx:latest
    ports:
      - "8081:80"
    profiles:
      - debug
  migrate:
    image: python:3.12-slim
    command: python -c "print('migrate one-off 工具跑通了')"
    depends_on:
      - db
    profiles:
      - tools
```

**① 默认 up：没挂 profile 的服务才起。** 规则一句话——**没写 `profiles` 的永远起，写了的不点名不起**：

```bash
$ docker compose up -d
$ docker compose ps --format "table {{.Service}}\t{{.Status}}"
SERVICE   STATUS
db        Up 3 minutes
web       Up Less than a second      # ← 只有这俩，admin-portal 不在场
```

**② 点名激活：`--profile` 是全局旗标，必须放在子命令前面**。我第一次写成了 `docker compose up -d --profile debug`，收获一句：

```
unknown flag: --profile
```

正确写法：

```bash
$ docker compose --profile debug up -d
 Container compose-modern-admin-portal-1 Started

$ docker compose ps --format "table {{.Service}}\t{{.Status}}"
SERVICE        STATUS
admin-portal   Up Less than a second   # ← 管理后台加入
db             Up 5 seconds
web            Up 4 seconds
```

多 profile 用空格连写多个 `--profile`，或环境变量 `COMPOSE_PROFILES=debug,tools`；`--profile "*"` 全开。用完单停它不影响主线：`docker compose stop admin-portal`。

**③ 显式点名 run，profile 自动激活。** 一次性工具连 `--profile` 都不用带：

```bash
$ docker compose run --rm migrate
 Container compose-modern-migrate-run-42e240b95a87 Created
migrate one-off 工具跑通了
```

被**显式指定**的服务（连同它 `depends_on` 的 db）自动启动，同 profile 的其他服务（admin-portal）不会跟着起——这就是「run 一次性工具」的正确姿势。

顺带两个官方口径：profile 名要匹配 `[a-zA-Z0-9][a-zA-Z0-9_.-]+`；`down` 只清理「无 profile 的 + 当前激活 profile 的」服务。还有一条设计建议直接抄官方：**核心服务永远别挂 profile**，否则哪天 `up` 完一看，怎么数据库没起。

> 插问：那第 16 篇用两个 compose 文件（base + dev override）也能做「按需」，跟 profiles 什么关系？——override 换的是**文件**（环境维度的加减），profiles 切的是**同一份文件里的分组**（服务维度的开关）；一个按环境分，一个按用途分，可以叠着用。

> **本节一句话**：不挂 profile 的永远起，挂了的等点名；`--profile` 放子命令前面。

---

## 四、include：把团队公共编排拆出去

第三个痛点：十个项目各自粘贴同一段 redis/mysql 定义。做法：公共部分抽成独立文件，主文件一行拉进来。

**common/redis.yaml**

```yaml
services:
  db:
    image: redis:latest
```

**compose.yaml（整体替换）**

```yaml
include:
  - common/redis.yaml

services:
  web:
    build: .
    ports:
      - "8100:8000"
    depends_on:
      - db        # db 来自 include，依赖照常引用
```

验证拆分后一切照旧：

```bash
$ docker compose config --services
db       # ← 来自 common/redis.yaml
web

$ docker compose up -d && curl -s localhost:8100
[Modern Compose Lab (renamed)] v3 seed=seeded-by-pre-start   #（此时还没加 pre_start，显示 seed=(none)）
```

include 与另外两种「多文件」机制的分工，一张表认清脸：

| 机制 | 一句话 | 典型场景 |
|---|---|---|
| **merge**（`compose.override.yaml` 自动合并 / `-f` 多文件） | 同一服务的字段**叠罗汉** | 一份 base + dev/prod 各自覆盖 |
| **extend**（`extends:` 字段） | 一个服务**抄另一个服务的配置** | 同工程里两个长得像的服务 |
| **include**（`include:` 字段） | 把**别的文件整个拉进来**变成自己的一部分 | 团队公共中间件、跨仓库复用 |

> **本节一句话**：merge 改自己的字段，extend 抄兄弟的配置，include 拉别人的文件——复用粒度一层比一层大。

---

## 五、pre_start：init 容器成了一等公民（Compose 5.3+）

### 5.1 老写法的痛

「应用启动前先跑一次迁移/播种」这件事，第 16 篇的老写法是**一次性服务**：

```yaml
services:
  migrate:
    image: myapp:latest
    command: ["./manage.py", "migrate"]
    restart: "no"
  app:
    image: myapp:latest
    depends_on:
      migrate:
        condition: service_completed_successfully
```

能用，但三处别扭：迁移作为**平级服务**躺在工程里；跑完的它以 `Exited` 状态永远挂在 `ps -a` 里；链三四个步骤就得拉一串 depends_on 蜘蛛网。Compose 5.3 把这类「启动前置任务」收编成了 `pre_start`——官方叫法 **init 容器**。

### 5.2 实测：先 seed，后启动

给案例加一个播种脚本（**app/seed.py**）：

```python
import redis

r = redis.Redis(host="db", port=6379)
r.set("seed_msg", "seeded-by-pre-start")
print("seed ok: seed_msg 写入 db")
```

Dockerfile 加一行 `COPY app/seed.py .`，compose.yaml 里给 web 挂上：

```yaml
include:
  - common/redis.yaml

services:
  web:
    build: .
    ports:
      - "8100:8000"
    depends_on:
      - db
    pre_start:
      - command: ["python", "seed.py"]
```

重建启动：

```bash
$ docker compose down && docker compose up -d --build

$ curl -s localhost:8100
[Modern Compose Lab (renamed)] v3 seed=seeded-by-pre-start   # ← 播种的数据已就位
```

再看清单：

```bash
$ docker compose ps -a --format "table {{.Service}}\t{{.Status}}"
SERVICE   STATUS
db        Up 9 seconds
web       Up 3 seconds      # ← 没有多出来的 Exited 容器
```

老写法里那个 `Exited (0)` 的 migrate 消失了——`pre_start` 步骤跑在自己的**一次性容器**里，跑完即走，不占服务列表。

### 5.3 运行规则：四条生命线 + 跳过语义

官方口径（[init containers 文档](https://docs.docker.com/compose/how-tos/init-containers/)，2026-07 版，逐条与本机行为对上）：

1. 每个步骤跑在**独立的临时容器**里——在服务容器**创建之后、启动之前**执行；
2. 默认**继承服务的镜像**（所以 seed.py 不用另配 image），可单独 `image:` 覆盖；
3. 加入服务的**同一网络**（所以能连上 db）、共享服务的**卷挂载**（写共享卷立即可见）；
4. 必须 `exit 0` 才放行——任何一步非零，服务不启动。

什么时候跳过、什么时候重跑：

| 场景 | pre_start 行为 | 实测对上 |
|---|---|---|
| 再次 `up` 且定义没变、上次成功 | **跳过**（服务都没重建，根本不触发） | ✓ ① |
| 定义变了 / 上次失败 / `--force-recreate` | **重跑** | ✓ ①强制重建后重跑 |
| `down` 后全新 up | 重跑 | ✓ ② |

### 5.4 实测失败阻断（连带一个镜像坑）

把 seed.py 改成模拟失败：

```python
import sys

print("seed 模拟失败：连接假库超时")
sys.exit(1)
```

> 插问：我第一次 `docker compose down` 然后 `up -d`——**web 照样起来了**，阻断没发生，为什么？
> 因为 `up -d` 不带 `--build` 时用的是**旧镜像**，跑的还是镜像里旧的成功版 seed.py；宿主上那个失败版根本没进镜像。带上 `--build` 才是真测试：

```bash
$ docker compose down && docker compose up -d --build
 Container compose-modern-db-1 Started
service "web" pre_start[0] exited with code 1      # ← 阻断发生

$ docker compose ps -a --format "table {{.Service}}\t{{.Status}}"
SERVICE   STATUS
db        Up 4 seconds
web       Created        # ← 停在“已创建未启动”：正是“容器创建之后、启动之前”的位置
```

`web Created` 这个状态就是第 4 条生命线的实物证据：容器已经创建（卡位占好），就因为前置任务失败，永远没等到 `Started`。改回成功版再 `up -d --build`，恢复正常。

新老写法怎么选：

| | 一次性服务（老） | pre_start（新） |
|---|---|---|
| 定位 | 与应用平级的独立服务 | 应用自己的附属步骤 |
| `ps -a` 残留 | Exited 躺着 | 不留痕 |
| 多步骤串联 | depends_on 蜘蛛网 | 按声明顺序依次跑 |
| 镜像 | 要重复声明 `image:` | 默认继承服务镜像 |
| 什么时候老写法仍对 | 任务是**多个服务的公共前置**、或需要被独立寻址时 | —— |

### 5.5 post_start / pre_stop：一对钩子认脸

`pre_start` 的两个兄弟是在**服务容器里面**跑命令的钩子（不是独立容器）：`post_start` 启动后执行、`pre_stop` 停止前执行。给 web 挂一个留痕：

```yaml
    post_start:
      - command: ["sh", "-c", "echo post_start hook ran at $(date) > /tmp/hook.txt"]
```

`up -d --force-recreate web` 后进容器验证：

```bash
$ docker compose exec -T web cat /tmp/hook.txt
post_start hook ran at Tue Aug 25 00:39:32 UTC 2026
```

一句话分家：**pre_start 在容器外跑（独立一次性容器），post_start/pre_stop 在容器里跑**。

> **本节一句话**：pre_start = 「先干完这些才准开门」，干砸了门都不开（web 永远 Created）。

---

## 六、provider services 与 GPU：认脸（本机未实测）

两个进阶面，认脸即可，用到时按官方文档走：

**provider services**——把「不由本 compose 管理的外部东西」声明成依赖，比如让 Docker Desktop 的 Model Runner 起一个模型、或引用外部已存在的服务。语义是「我要用它，但它的生死不归我管」。文档：[Use provider services](https://docs.docker.com/compose/how-tos/provider-services/)。什么时候用：本机实验环境里挂着外部模型/数据库、又想让 `depends_on` 语义完整的时候。

**GPU**——`deploy.resources.reservations.devices` 声明显卡，`capabilities: [gpu]`。本机 WSL2 无 GPU 直通，不实测；2026 年的推荐注入方式是 CDI（第 28 篇 daemon 运维里再展开）。文档：[Enable GPU support](https://docs.docker.com/compose/how-tos/gpu-support/)。

> **本节一句话**：provider 是「借外面的东西」，GPU 是「申请里面的硬件」——都只是声明，履约靠引擎。

---

## 七、跟单机 Compose 说再见的三个信号

现代特性把单机体验拉满之后，也要知道边界。出现这三个信号之一，就该去 [第 29 篇 Swarm](/云原生/docker/docker-29-swarm) 和 [K8s 学习总纲](/云原生/k8s/k8s-00-roadmap) 报到了：

1. **要多台机器**——Compose 只认眼前这台 daemon，跨主机的「同一网络」它给不了；
2. **副本要自愈**——`--scale` 能拉起 N 个副本，但宿主机一死全死，没有别的机器补位；
3. **要滚动发布**——Compose 更新是「先 down 后 up」的一刀切，没有按批次替换、就绪探针、自动回滚这套发布机器。

好在这篇学的东西不浪费：服务/profile/depends_on 的声明式思想、pre_start 的前置任务模型，在 Swarm 和 K8s 里都有同构物（service / initContainers）——概念能平移，换的是引擎。

> **本节一句话**：单机 Compose 的天花板是「一台 daemon」——要跨机器、要自愈、要滚动，就是毕业的时候。

---

## 小结

一条因果链收走全文：**改代码烦 → watch 三档待遇（sync 动文件 / sync+restart 动进程 / rebuild 动镜像）**；**服务太多烦 → profiles 分组，不点名不起、run 点名自动激活**；**复制粘贴烦 → include 拉公共编排，与 merge/extend 分工**；**前置任务烦 → pre_start 一等 init 容器，失败就拦在 Created**；**这些都是单机玩具的尽头 → 三个信号到了就去多机**。

**自己跑一遍**（在本机 WSL 里）：

```bash
git clone 不了就照抄第一节四个文件 → docker compose up -d --build → curl localhost:8100
→ 挂 watch 改 main.py → 再改 app.conf → 再追加依赖 → 三种反应各看一次
→ 加 pre_start 后 up，把 seed 改成 exit 1 再 up --build，亲眼看 web 卡在 Created
```

**清理现场**：`docker compose --profile debug down`（实验目录 `/root/compose-modern` 保留，可重做）。

**思考题**：watch 模式下你改了 `requirements.txt`，页面报了 `ModuleNotFoundError`，但 5 秒后又自己好了——中间发生了什么？（提示：两种 action 同时盯上了这个文件，一个快一个慢，慢的那个最终重建了容器。）

下一篇：[《Docker 技术底座——沿着「又轻又像一台机器」逐层解开 Namespace、Cgroups 与 UnionFS》](/云原生/docker/docker-19-tech-foundation)。

---

## 参考资料

- [Use Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/)——三动作/ignore/initial_sync 官方语义（要求 Compose ≥ 2.22）
- [Using profiles with Compose](https://docs.docker.com/compose/how-tos/profiles/)——默认/点名/显式 run 三种激活路径
- [Use multiple Compose files: Include](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/)——include 与 merge/extend 的分工
- [Use init containers in Compose](https://docs.docker.com/compose/how-tos/init-containers/)——pre_start 四条生命线与跳过语义（要求 Compose ≥ 5.3，2026-07 版）
- [Use lifecycle hooks](https://docs.docker.com/compose/how-tos/lifecycle-hooks/)——post_start / pre_stop
- 本机实测：WSL2 Ubuntu-22.04 · Docker 29.1.3 · Compose v5.5.0（用户级插件；apt 源为 2.40.3 不含 pre_start，安装路径见开篇）· 未装 buildx，`compose build` 走内置链路并打 `requires buildx plugin` 警告（与[第 9 篇](/云原生/docker/docker-09-dockerfile)注记一致），实测日期 2026-08-25
