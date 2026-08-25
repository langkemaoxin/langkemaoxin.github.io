---
title: Compose 现代特性——watch 热更、profiles 分组与 init 容器
sidebarGroup: Docker 系列
shortTitle: 18 Compose 现代特性
order: 18
date: 2026-08-25T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Compose
  - 对话实录
description: 师生对话实录课：0 基础学生与教学大师的 Compose 现代特性逐字稿，从「改一行代码要全套重启」的痛出发，实测 watch 三档待遇、profiles 按需分组、include 拆公共编排、pre_start init 容器失败阻断，顺带纠正「两条 watch 规则同时生效」的流传说法。实验全部 WSL2 + Engine 29.1.3 + Compose v5.5.0 真机跑通。
---

> **Docker 系列 · 第 18/33 篇**
> 上一篇：[《从零理解 HTTPS——Nginx 容器从红页到可信（师生对话实录）》](/云原生/docker/docker-17-https-nginx) · 下一篇：[《Docker 技术底座——容器凭什么又轻又像一台机器（师生对话实录）》](/云原生/docker/docker-19-tech-foundation)
>
> 本篇接在[第 16 篇 Compose 主线语法](/云原生/docker/docker-16-compose)之后：服务、网络、卷、健康检查都会了，这篇解决的是「天天用之后长出来的烦」。

---

## 写在前面

第 16 篇之后，我的 compose.yaml 已经能一键起一整栈了。用了两周，三个烦人时刻准时到达：

- 改一行 Python，得 `up --build` 全套重来——Redis 跟着重启、调试现场全丢；
- 编排里塞了十几个服务，管理后台、数据导入工具平时根本不用，但每次 `up` 全体起立；
- 每个项目的 compose.yaml 里都复制粘贴着同一段 redis 定义，改一处要改十个仓库。

所以这篇继续用老办法：**让 AI 当老师，我当学生，每课只讲一个概念，我有问题就打断，没问题就继续**。从「改一行代码的代价」这个现场出发，把官方这几年补的现代答案——`watch`、`profiles`、`include`、`pre_start`——一个一个实测过去。

课程路线图（走到哪算哪）：

> ① 改一行代码的代价 → ② watch 三档待遇（sync / sync+restart / rebuild）→ ③ profiles 按需分组 → ④ include 拆公共编排 → ⑤ pre_start init 容器与失败阻断 → ⑥ post_start 钩子 → ⑦ provider/GPU 认脸与单机边界

环境：Windows + WSL2 Ubuntu-22.04（root）· Docker Engine 29.1.3 · **Compose v5.5.0**（用户级插件）。实验目录 `/root/compose-modern`，全部输出为本机 2026-08-25 实跑。

> ⚠️ **版本门槛先说清**：`watch` 要 Compose ≥ 2.22，**`pre_start` 要 ≥ 5.3**。Ubuntu apt 源装的是 2.40.3，跑不了 `pre_start`——解法是装官方用户级插件（不动系统包，两者共存，用户级优先）：
> ```bash
> mkdir -p ~/.docker/cli-plugins
> curl -SL https://ghfast.top/https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
>   -o ~/.docker/cli-plugins/docker-compose && chmod +x ~/.docker/cli-plugins/docker-compose
> ```
> 装完 `docker compose version` 应输出 `Docker Compose version v5.5.0`。另外本机没装 buildx 插件，`compose build` 走内置构建链并打一条 `requires buildx plugin` 警告——不影响结果，与[第 9 篇](/云原生/docker/docker-09-dockerfile)的注记一致。

---

## 第 1 课：改一行代码的代价

**🧑‍🏫 老师：**

先搭台。全文围绕一个小工程滚：Flask 小应用（`web`，自己 build）+ Redis（`db`）。四个文件全部可照抄：

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

这个工程刻意安排了三类文件：`main.py` 是**源码**（改了想立刻生效）、`app.conf` 是**启动时读一次的配置**（改了得重启进程）、`requirements.txt` 是**依赖**（改了必须重装）。后面整篇都在回答同一个问题：三类文件，各自的改动怎么用最小的代价到达容器。

起来：

```bash
docker compose up -d --build
```

```text
 Container compose-modern-db-1 Started
 Container compose-modern-web-1 Started
```

```bash
$ curl -s localhost:8100
[Modern Compose Lab] v1 seed=(none)
```

现在，做那个让你来的动作——改一行代码：

```bash
sed -i 's/VERSION = "v1"/VERSION = "v2"/' app/main.py
```

三秒后刷新页面：

```bash
$ curl -s localhost:8100
[Modern Compose Lab] v1 seed=(none)        # ← 文件已经是 v2，页面还是 v1
```

纹丝不动。想想为什么：镜像是构建时把 `main.py` COPY 进去的，你改的是宿主机上的文件，容器里那份还是旧的。要让改动到达容器，第 16 篇学过的唯一办法是 `up -d --build`——重走构建、换镜像、重建容器，Redis 虽然有缓存不重启，但 web 的进程现场、你 attach 的调试会话全部归零。**为了改一行字，付出整套重启的代价**——这就是第一个烦人时刻。

一句话总结本课：

> **容器里跑的是「构建那一刻」的代码；宿主文件的改动默认永远到不了容器——除非有机制替你送进去。**

顺带一个实战教训：宿主端口别顺手写 `"8000:8000"`——我第一版这么写，收获 `Bind for 0.0.0.0:8000 failed: port is already allocated`（本机 8000 被常驻网关占着）。宿主端口是全局资源，起项目前先想清楚谁在用什么端口。

---

## 插问 1：bind mount 不就能热更吗？第 14 篇学过

**🧑‍🎓 学生：** 等等。第 14 篇数据持久化里，bind mount 把宿主目录挂进容器，两边就是同一份文件——我把 `./app` 挂到 `/app`，改完 main.py 不就立刻生效了？为什么还需要一个新机制？

**🧑‍🏫 老师：**

思路完全正确，bind 确实能解决「源码热更」，很多人也真这么干。但官方文档把 `watch` 定位成 bind 的**搭档而非替代**，它补的是 bind 做不好的三件事：

| bind mount 的糙处 | watch 的做法 |
|---|---|
| 整目录全量共享，没法按文件挑 | 规则逐条声明，`ignore` 精准排除 |
| `node_modules/` 这种海量小文件跟着灌，跨系统 I/O 高 | ignore 掉，容器里那份归容器 |
| 宿主是 Windows/Mac 时，编译产物跨平台不可用（原生扩展二进制不通用） | 只同步源码，依赖在容器里装 |

第三条最致命：在 WSL2 里挂 Windows 目录跑 Node 项目，宿主侧 npm 装出来的 `.node` 二进制和 Linux 容器不通用，一挂就炸。bind 是「整仓搬家」，watch 是「快递指定文件」——而且 watch 能做的另两件事（重启进程、重建镜像），bind 连边都摸不着：配置文件改了 bind 能同步，但进程不重启就永远读不到；依赖清单改了更没用，pip install 只在构建时发生。

一句话收口：

> **bind 解决「同一份文件」，watch 解决「哪份文件、用什么方式、到达后做什么」——三件事 bind 只会第一件。**

---

## 第 2 课：watch 登场——先认清「Watch enabled」这条分界线

**🧑‍🏫 老师：**

给 web 挂上 watch 规则（compose.yaml 里 services.web 下加一段，其余不动）：

```yaml
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
```

先别管三种 action 的区别，下一课起逐个实测。读法只有两个要点：每条规则是「**盯哪个路径**（path）+ **怎么反应**（action）」，sync 类的还有「**落到容器哪里**（target）」；`ignore` 的相对路径基准是**本条规则的 path**——`path: ./app` 下写 `app.conf`，指的是 `./app/app.conf`，不是项目根。

然后启动 watch。它是个**长驻命令**，正常开发时占一个终端，我实验里丢到后台：

```bash
nohup docker compose watch web > watch.log 2>&1 &
```

**第一个坑当场就踩**：watch 刚启动，先干了一件看起来吓人的事——把 web 容器重建了一次。看日志：

```text
 Image compose-modern-web Building
（……完整构建输出……）
 Container compose-modern-web-1 Recreate
 Container compose-modern-web-1 Recreated
 Container compose-modern-web-1 Starting
 Container compose-modern-web-1 Started
Watch enabled
```

不是 watch 抽风：是 compose.yaml 变了（多了 develop 段），这是一次普通的「配置变更重建」，跟 watch 本身无关。**认准 `Watch enabled` 这一行——它之后的行为才是 watch 的**。这条分界线后面还有个大用处，插问 3 再说。

顺带把这条日志里的另一件事说破：启动时它顺手把镜像也重新构建了一遍（我磁盘上的 main.py 是 v2，所以新镜像里也是 v2）。重启后验证一下：

```bash
$ curl -s localhost:8100
[Modern Compose Lab] v2 seed=(none)          # ← 重建顺带把 v2 带进来了

$ docker compose ps -q web
fa94ae245d1f                                  # ← 记住这个 ID，下面几课反复用
```

一句话总结本课：

> **watch 启动时会因「配置变更」重建一次容器，认准 `Watch enabled` 之后才是它的主场；web 容器 ID fa94ae245d1f 是后面所有对照实验的基准。**

---

## 第 3 课：sync——快递文件，容器纹丝不动

**🧑‍🏫 老师：**

第一档待遇：`sync`。把 `main.py` 的版本号 v2 改成 v3，模拟你按下保存：

```bash
sed -i 's/VERSION = "v2"/VERSION = "v3"/' app/main.py
```

五秒后看页面：

```bash
$ curl -s localhost:8100
[Modern Compose Lab] v3 seed=(none)          # ← 新版本号已经在线上
```

关键证据在第二项——容器换没换：

```bash
$ docker compose ps -q web
fa94ae245d1f                                  # ← 还是它，一个字母都没变
```

watch.log 里对应的事件只有一行：

```text
Syncing service "web" after 2 changes were detected
```

（说句题外话：「2 changes」不是它数错了——sed 保存文件会触发「写入+改名」两个事件，所以一次保存计成两次变化，正常现象。）

三点证据链拼起来：页面变了（v3）、容器 ID 没变（fa94…）、日志只有 Syncing 没有 Recreate。**watch 只是把文件快递进了容器，重启这件事根本没发生**——那页面怎么就新了？因为 main.py 第 10 行的 `debug=True`：Flask 自带的 reloader 检测到文件变化，自己重启了 Python 进程。容器没换，进程在容器里换了一代。

这就是 sync 的分工哲学：**watch 管送文件，热重载交给应用自己**。所以 sync 适合「配了 reloader 的源码」——Flask/Django dev server、Vite、Air 热重载的 Go 项目都行；如果你的程序没有 reloader，sync 完它就坐着不动，那是下一档的事。

一句话总结本课：

> **sync = 把文件复制进容器，别的什么都不做；进程要不要重启是应用自己的事（reloader）。**

---

## 第 4 课：sync+restart——同一台机器，重启一次

**🧑‍🏫 老师：**

第二档：`sync+restart`，伺候「启动时读一次」的文件。把站名改掉：

```bash
echo "Modern Compose Lab (renamed)" > app/app.conf
```

六秒后：

```bash
$ curl -s localhost:8100
[Modern Compose Lab (renamed)] v3 seed=(none)   # ← 新站名生效了
```

新站名出来的这一刻，其实发生了一次重启——证据有两条。第一条还是 ID：

```bash
$ docker compose ps -q web
fa94ae245d1f                                     # ← 容器还是那个容器
```

第二条在 watch.log，这次的事件跟上次不一样了：

```text
Syncing service "web" after 1 changes were detected
 Container compose-modern-web-1 Restarting
 Container compose-modern-web-1 Started
service(s) ["web"] restarted
```

注意措辞：**Restarting，不是 Recreated**。sync+restart 重启的是**同一个容器**——ID 不变，容器里进程从 1 号重新跑。为什么必须重启？因为 main.py 第 6 行：`SITE = open(...).read()` 在**进程启动那一刻**读了 conf 存进变量，此后再不看那个文件——文件送进去了进程也不知道，只能让它重新出生一次。

对比着记：sync 结束后进程「自己选择」要不要换（reloader），sync+restart 结束后进程「被迫」换——但机器（容器）都不换。要换机器的，是下一档。

一句话总结本课：

> **sync+restart = 送文件 + 重启同一个容器（Restarting ≠ Recreated）；伺候「启动时读一次」的配置文件。**

---

## 插问 2：两条规则同时盯上 app.conf，听谁的？

**🧑‍🎓 学生：** 我盯着配置看了半天发现一个漏洞：我的 sync 规则罩着整个 `./app`，app.conf 就在里面；sync+restart 规则又精确指着 `./app/app.conf`。同一个文件两条规则都匹配——它到底走哪条？会不会 sync 先复制一份、restart 再重启一次，甚至打起来？

**🧑‍🏫 老师：**

好眼力，这正是 watch 规则里最容易含糊的地方。网上有个流传的说法是「两条都触发，restart 兜底」。**我不信传闻，直接做实验**：把 sync 规则的 `ignore` 整段删掉（现在两条规则赤裸裸地重叠），改 app.conf，两个落点都检查。

第一次实验（改 app.conf 为 `Overlap Demo Conf`），看 sync 规则的落点 `/app/app.conf`：

```bash
$ docker compose exec -T web cat /app/app.conf
cat: /app/app.conf: No such file or directory
```

**文件根本不存在**——广域的 sync 规则压根没碰它。再看 sync+restart 的落点：

```bash
$ docker compose exec -T web cat /etc/app/app.conf
Overlap Demo Conf                              # ← 新值，且容器重启了（日志有 Restarting）
```

不放心，换个值再跑一遍排除偶然：

```bash
$ echo 'Second Overlap Test' > app/app.conf
$ docker compose exec -T web cat /app/app.conf
cat: /app/app.conf: No such file or directory  # ← 依然不存在
$ docker compose exec -T web cat /etc/app/app.conf
Second Overlap Test                            # ← 依然是精确规则独占
```

再验证广域规则本身没死——往 `./app` 放一个只有它能管的新文件：

```bash
$ echo 'note-from-host' > app/notes.txt
$ docker compose exec -T web cat /app/notes.txt
note-from-host                                 # ← sync 规则正常工作
```

结论清楚了，而且**纠正了流传的说法**（至少在 Compose v5.5.0 上）：**精确到单文件的规则会把文件「独占」，广域规则自动让位**——不打架、不重复、不需要靠 ignore 保正确。那 ignore 还写它干嘛？两个字：**性能与清洁**。别把 `node_modules/`、宿主侧依赖清单这种东西灌进容器——官方举例的正是 Node 项目原生模块跨平台必炸的场景。ignore 是给「广域规则没有精确规则接管的地盘」划边界的。

一句话收口：

> **重叠时精确规则独占文件（v5.5.0 实测两次验证）；ignore 管的不是正确性，是别把不该送的送进去。**

---

## 第 5 课：rebuild——重造机器

**🧑‍🏫 老师：**

第三档：`rebuild`。给依赖清单追加一个真依赖：

```bash
echo "ujson==5.10.0" >> app/requirements.txt
```

ujson 是个带 C 扩展的 JSON 库——它不可能靠「复制文件」装好：pip 得下载源码、编译、装进 Python 环境，而这一切只发生在 Dockerfile 的 `RUN pip install` 那一层。所以 watch 的反应是整套重来（等半分钟左右），完了三连验证：

```text
$ docker compose ps -q web
7577ac5db930                          # ← 容器换了（原来 fa94ae245d1f）

$ docker inspect -f '{{.Image}}' $(docker compose ps -q web) | cut -c8-19
2aba41929aef                          # ← 镜像也换了（原来 6b13d280a514）

$ docker compose exec -T web pip show ujson
Name: ujson
Version: 5.10.0                       # ← 新依赖在容器里真实可用
```

watch.log 的关键行：`Image compose-modern-web Building` → `Container compose-modern-web-1 Recreate` → `Recreated`——**这次是 Recreated，机器换了**。

三档的分工到这就齐了，放进一张表钉死：

| action | 改动怎么到达 | 容器命运 | 进程命运 | 典型文件 |
|---|---|---|---|---|
| `sync` | 复制进容器 | **不动** | 自己热重载（reloader） | 源码 |
| `sync+restart` | 复制进容器 | **Restarting**（同一个） | 被迫重启 | 启动时读一次的配置 |
| `rebuild` | 重新构建镜像 | **Recreated**（换新的） | 全新进程 | 依赖清单 |

还有一条边界规则：watch 只对**带 `build:` 的服务**生效——纯 `image:` 的服务没得 watch（没有构建过程，rebuild 无从谈起；文件同步对别人的镜像也多半是越权）。

一句话总结本课：

> **rebuild = 重走 Dockerfile 换镜像换容器；依赖变更没有任何捷径，三档里它最重，也只在真正需要时用。**

---

## 插问 3：watch 刚启动那几秒改的文件，为什么丢了？

**🧑‍🎓 学生：** 我复现你的实验时踩了个怪事：watch 还在「启动重建」的阶段（就是第 2 课那段构建输出还在刷的时候），我顺手改了 app.conf——结果什么都没发生，文件也没同步进去。文件系统坏了？

**🧑‍🏫 老师：**

没坏，这是**事件机制的天然盲区**：inotify 这类文件系统事件只在「监听开始后」才存在，`Watch enabled` 之前发生的改动，watch 无从得知——这就是我说「认准那条分界线」的原因。实验时要么等 `Watch enabled` 再动手，要么用官方给的开关：给规则加 `initial_sync: true`，watch 启动时先把 path 下的存量文件与容器对齐一次（这个参数我没单测，行为以[官方 watch 文档](https://docs.docker.com/compose/how-tos/file-watch/)为准）。

另一个孪生坑一并说了：**`ignore` 别写成绝对路径**，基准是本条规则的 `path`。还有官方 prerequisite 提醒的两条：镜像里要有 `stat`/`mkdir`/`rmdir`（主流基础镜像都有，scratch 类的没有）；容器用户要对 target 有写权限——非 root 运行的镜像用 `COPY --chown=app:app . /app` 保证属主。

一句话收口：

> **`Watch enabled` 之前改的文件不在事件流里；要补就用 `initial_sync: true`，要避就等分界线出现再动手。**

---

## 第 6 课：profiles——不是所有服务都天天该起

**🧑‍🏫 老师：**

第二个烦人时刻：编排越写越长，但里面一半的服务是「偶尔用」。给工程加两个这样的角色——管理后台（偶尔看看）和一次性迁移工具（用完就走）：

```yaml
  admin-portal:
    image: nginx:latest
    ports:
      - "8081:80"
    profiles:
      - debug
  migrate:
    image: python:3.12-slim
    command: python -c "print('migrate one-off done')"
    depends_on:
      - db
    profiles:
      - tools
```

profiles 的规则一句话就能记全：**没写 `profiles` 的永远起，写了的不点名不起**。默认 up 验证：

```bash
$ docker compose up -d
$ docker compose ps --format "table {{.Service}}\t{{.Status}}"
SERVICE   STATUS
db        Up 5 minutes
web       Up 47 seconds         # ← 只有这俩，admin-portal 不在场
```

想带谁玩，就点名谁的 profile。这里我当着一回学生——第一反应把旗标写在子命令后面：

```bash
$ docker compose up -d --profile debug
unknown flag: --profile
```

真实的报错糊脸。原因是 `--profile` 是**全局旗标**，管的是「这次 compose 调用整体激活哪些组」，必须放在子命令前面：

```bash
$ docker compose --profile debug up -d
 Container compose-modern-admin-portal-1 Started

$ docker compose ps --format "table {{.Service}}\t{{.Status}}"
SERVICE        STATUS
admin-portal   Up 1 second      # ← 管理后台加入
db             Up 5 minutes
web            Up About a minute
```

多组用空格连写多个 `--profile`；环境变量 `COMPOSE_PROFILES=debug,tools` 适合写进 shell 配置；`--profile "*"` 全开。用完单停它不碍主线：`docker compose stop admin-portal`。

最后是一一次性工具的正确姿势——`run` 显式点名时，目标服务的 profile **自动激活**，连旗标都不用带：

```bash
$ docker compose run --rm migrate
 Container compose-modern-migrate-run-d580162197de Created
migrate one-off done
```

注意两条边界：`run` 只激活「被点名的 migrate 和它 depends_on 的 db」，同 profile 的 admin-portal 不会跟着起；`down` 只清理「无 profile 的 + 当前激活 profile 的」服务。再送一条官方设计建议：**核心服务永远别挂 profile**——否则哪天 `up` 完一看，怎么数据库没起。

一句话总结本课：

> **不挂 profile 的永远起，挂了的等点名；`--profile` 放子命令前面；`run` 点名即激活。**

---

## 第 7 课：include——把公共编排拆出去

**🧑‍🏫 老师：**

第三个烦人时刻：十个仓库各贴一份 redis 定义。做法是「公共部分抽成独立文件，主文件一行拉进来」。把 db 搬出去：

**common/redis.yaml**

```yaml
services:
  db:
    image: redis:latest
```

**compose.yaml（顶部加两行，db 段删除）**

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
  # ……（develop watch、profiles 部分原样保留）
```

验证拆分后模型里 db 还在：

```bash
$ docker compose config --services
db       # ← 来自 common/redis.yaml
web
```

（细心的你会发现 admin-portal 和 migrate 没列出来——`config --services` 也遵守 profiles 规则，不激活的组不出现在模型里。）

```bash
$ docker compose up -d && curl -s localhost:8100
 Container compose-modern-web-1 Running
[Modern Compose Lab (renamed)] v3 seed=(none)
```

照常工作。但「多文件」机制 Compose 其实有三套，容易混，一张表分清：

| 机制 | 一句话 | 典型场景 |
|---|---|---|
| **merge**（`compose.override.yaml` 自动合并 / `-f` 多文件） | 同一服务的字段**叠罗汉** | 一份 base + dev/prod 各自覆盖 |
| **extend**（`extends:` 字段） | 一个服务**抄另一个服务的配置** | 同工程里两个长得像的服务 |
| **include**（`include:` 字段） | 把**别的文件整个拉进来**变成自己的一部分 | 团队公共中间件、跨仓库复用 |

一句话总结本课：

> **merge 改自己的字段，extend 抄兄弟的配置，include 拉别人的文件——复用粒度一层比一层大。**

---

## 第 8 课：pre_start——「先干完这些，才准开门」

**🧑‍🏫 老师：**

最后一个烦人时刻有点不一样，它烦的不是「每次」，而是「每次都要记得」。场景：应用启动前得先往 Redis 里播一条种子数据（真实项目里就是数据库迁移、修目录权限这类前置活）。**第 16 篇的老写法**是一次性服务：

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

能用，但别扭：迁移作为**平级服务**躺在工程里，跑完以 `Exited (0)` 永远挂在 `ps -a`，链三步就是一串 depends_on 蜘蛛网。Compose 5.3 把这类「启动前置任务」收编成一等公民：`pre_start`，官方叫法 **init 容器**。

照旧实测。播种脚本 **app/seed.py**：

```python
import redis

r = redis.Redis(host="db", port=6379)
r.set("seed_msg", "seeded-by-pre-start")
print("seed ok: seed_msg written to db")
```

Dockerfile 加一行 `COPY app/seed.py .`，compose.yaml 的 web 段加两行：

```yaml
    pre_start:
      - command: ["python", "seed.py"]
```

重建启动：

```bash
$ docker compose down && docker compose up -d --build

$ curl -s localhost:8100
[Modern Compose Lab (renamed)] v3 seed=seeded-by-pre-start   # ← 播种的数据已就位
```

页面直接拿到种子数据——播种在 web 启动前就完成了。它的运行规则，官方文档列了四条（[init containers](https://docs.docker.com/compose/how-tos/init-containers/)，2026-07 版），逐条跟实验对上：

1. 每个步骤跑在**自己的一次性容器**里，时机是「服务容器**创建之后、启动之前**」；
2. 默认**继承服务的镜像**——所以 seed.py 不用另配 image（要换也可以单写 `image:`）；
3. 加入服务的**同一网络**（所以连得上 db）、共享服务的**卷挂载**（写共享卷立即可见）；
4. 必须 **exit 0** 才放行——非零就中止启动，连带依赖它的服务一起停。

什么时候重跑、什么时候跳过，官方口径：**定义没变且上次成功 → 跳过；定义变了 / 上次失败 / `--force-recreate` → 重跑**。第 4 条「必须 exit 0」是这套机制的牙齿，下一课专门掰开看。

文档里还有两段「反向清单」值得记——什么时候**不该**用 init 容器：静态文件和密钥用原生的 `configs`/`secrets` 挂进去就行，不必起容器；定时备份这类**有自己的生命周期**的后台任务也不是它的活——init 容器只管「启动之前」。

一句话总结本课：

> **pre_start = 应用自带的「先干完才准开门」清单；跑在自己的一次性容器里，默认继承镜像、同网络、共享卷。**

---

## 插问 4：我 down 再 up，阻断怎么没发生？

**🧑‍🎓 学生：** 你说要测「失败阻断」，我把 seed.py 改成 `sys.exit(1)`，`docker compose down` 再 `up -d`——web 照样起来了，页面好好的。第 4 条规则是骗人的？

**🧑‍🏫 老师：**

规则没骗人，是你被镜像骗了——我踩的是同一个坑。推理一遍：你改的是**宿主机上**的 seed.py，而 pre_start 步骤「继承服务镜像」，跑的是**镜像里**那份。`up -d` 不带 `--build` 时用的是旧镜像——里面装的还是旧的成功版 seed.py。宿主上那个 exit 1 的新版，从头到尾没进过容器。

```bash
$ docker compose down && docker compose up -d
 Container compose-modern-web-1 Started        # ← 旧镜像，旧 seed，一切"正常"
$ curl -s localhost:8100
[Modern Compose Lab (renamed)] v3 seed=seeded-by-pre-start   # ← 假象：数据还是上次播的
```

想真测阻断，必须让改动进镜像——带上 `--build`：

```bash
$ docker compose down && docker compose up -d --build
```

这次一个新面孔出现了。

一句话收口：

> **「继承服务镜像」意味着 pre_start 跑的是镜像里的脚本——改了脚本不 `--build`，测了个寂寞。这和第 1 课「容器里是构建那一刻的代码」是同一条根。**

---

## 第 9 课：失败阻断的实物证据——web 卡在 Created

**🧑‍🏫 老师：**

接着插问 4 的现场。带 `--build` 的 up，输出里有一行从没见过的：

```text
 Container compose-modern-web-1 Creating
 Container compose-modern-web-1 Created
 Container compose-modern-db-1 Started
service "web" pre_start[0] exited with code 1     # ← 阻断发生
```

看清单，web 的状态是全场焦点：

```bash
$ docker compose ps -a --format "table {{.Service}}\t{{.Status}}"
SERVICE        STATUS
admin-portal   Exited (0) 2 minutes ago    # ← 上一课我们自己 stop 的，不是残留
db             Up 6 seconds
web            Created                     # ← 卡在「已创建、未启动」

$ curl -s --max-time 2 localhost:8100 || echo 'connection refused'
connection refused                          # ← 门根本没开
```

`web Created` 这五个字母就是第 8 课第 1 条规则的实物证据：容器已经创建（卡位占好、网络已接、卷已挂），就因为前置任务 exit 1，永远没等到 `Started`——**「创建之后、启动之前」这个时间点，被你亲眼看到了**。

把 seed.py 改回成功版、`up -d --build`，一切复原。最后用一张表给新老写法定案（官方文档同款结论）：

| | 一次性服务（老） | pre_start（新） |
|---|---|---|
| 定位 | 与应用平级的独立服务 | 应用自己的附属步骤 |
| `ps -a` 残留 | Exited 躺着 | 不留痕 |
| 多步骤串联 | depends_on 蜘蛛网 | 按声明顺序依次跑 |
| 镜像 | 要重复声明 `image:` | 默认继承服务镜像 |
| 老写法仍对的地方 | 任务是**多个服务的公共前置**、或需要被独立寻址 | —— |

补两条官方 limitations：pre_start 对服务整体跑一次，**不按副本跑**（`per_replica` 暂不支持）；`--scale` 扩容**不会**重新触发它。

一句话总结本课：

> **pre_start 失败 = 服务永远停在 Created；「干砸了门都不开」，这就是 init 容器的牙齿。**

---

## 第 10 课：post_start / pre_stop——跑在容器里的兄弟钩子

**🧑‍🏫 老师：**

`pre_start` 还有两个兄弟，一秒分清：**pre_start 在容器外跑（自己的一次性容器），post_start/pre_stop 在服务容器里面跑**——它们是「钩子」，不是容器。给 web 挂一个留痕：

```yaml
    post_start:
      - command: ["sh", "-c", "echo post_start hook ran at $(date) > /tmp/hook.txt"]
```

```bash
$ docker compose up -d --force-recreate web
 Container compose-modern-web-1 Started

$ docker compose exec -T web cat /tmp/hook.txt
post_start hook ran at Tue Aug 25 07:46:25 UTC 2026
```

钩子在容器里执行、文件落在容器的文件系统里——位置本身就是身份证明。什么时候用：服务起来后注册服务发现、打启动标点；`pre_stop` 则在停止前做优雅收尾（通知、摘流量）。别拿它们干 pre_start 的活——钩子跑在容器里，而容器能起来的前提是……前置任务已经过了，因果反了。

一句话总结本课：

> **pre_start 容器外（一次性容器）、post_start/pre_stop 容器里（钩子）——一个管「开门前」，一对管「开门后/关门前」。**

---

## 第 11 课：认脸两个进阶面，然后知道何时说再见

**🧑‍🏫 老师：**

收官前认两张脸，本机条件不实测、用到时按官方文档走：

**provider services**——把「不由本 compose 管的外部东西」声明成依赖，比如让 Docker Desktop 的 Model Runner 起一个本地模型、或引用外部已存在的数据库。语义是「我要用它，但它的生死不归我管」（[文档](https://docs.docker.com/compose/how-tos/provider-services/)）。

**GPU**——`deploy.resources.reservations.devices` 声明显卡，`capabilities: [gpu]`（[文档](https://docs.docker.com/compose/how-tos/gpu-support/)）。本机 WSL2 无 GPU 直通不实测；2026 年推荐的注入方式是 CDI，第 28 篇 daemon 运维再展开。

然后是更重要的事：**这套现代特性把单机体验拉满之后，单机的天花板也露出来了**。出现这三个信号之一，就该去[第 29 篇 Swarm](/云原生/docker/docker-29-swarm)和 [K8s 学习总纲](/云原生/k8s/k8s-00-roadmap)报到了：

1. **要多台机器**——Compose 只认眼前这台 daemon，跨主机的「同一网络」它给不了；
2. **副本要自愈**——`--scale` 能拉起 N 个副本，但宿主机一死全死，没有别的机器补位；
3. **要滚动发布**——Compose 的更新是「先 down 后 up」一刀切，没有按批次替换、就绪探针、自动回滚。

好在这篇学的东西不白学：服务/profile/depends_on 的声明式思想、pre_start 的前置任务模型，在 Swarm 和 K8s 里都有同构物（service / initContainers）——概念平移过去，换的只是引擎。

一句话总结本课：

> **单机 Compose 的天花板是「一台 daemon」；要跨机、要自愈、要滚动，就是毕业的时候——而毕业带走的是同一套声明式思想。**

---

## 小结

从「改一行代码的代价」出发，把四个烦人时刻挨个解决：

1. **改代码烦 → watch 三档待遇**：sync 送文件不动容器（reloader 自己重启）、sync+restart 同容器重启（Restarting ≠ Recreated）、rebuild 换镜像换容器（Recreated）。
2. **规则重叠 → 精确独占**（v5.5.0 两次实测）：单文件规则把文件独占，广域规则让位；ignore 管的是性能与清洁，不是正确性。
3. **服务太多烦 → profiles**：不挂的永远起，挂了的等点名；`--profile` 放子命令前，`run` 点名即激活。
4. **复制粘贴烦 → include**：拉整个文件，与 merge（叠字段）、extend（抄服务）分工。
5. **前置任务烦 → pre_start**：一次性容器、继承镜像、同网络、exit 0 才放行；失败的服务永远 Created。
6. **钩子 → post_start/pre_stop 在容器里跑**，与容器外的 pre_start 一墙之隔。
7. **单机天花板 → 三信号**：跨机、自愈、滚动发布，毕业去 Swarm/K8s，概念同构带走。

**自己跑一遍**（照抄第 1 课四个文件）：

```bash
docker compose up -d --build → curl localhost:8100
→ 挂 watch：改 main.py 看容器 ID 不变 → 改 app.conf 看 Restarting → 加依赖看 Recreated
→ 加 profiles：up 不带组 → --profile debug（注意旗标位置）→ run --rm migrate
→ db 拆进 common/redis.yaml，include 拉回
→ 加 pre_start：播种成功 → seed.py 改 exit 1，up -d --build，亲眼看 web 卡在 Created
→ 挂 post_start 钩子，进容器 cat /tmp/hook.txt
```

**清理现场**：`docker compose --profile debug down`（实验目录 `/root/compose-modern` 保留，可重做）。

**思考题**：同事说「我改了 seed.py，`up -d` 之后种子逻辑没更新，这 pre_start 是坏的」——他大概漏了哪两件事？（提示：插问 4 的镜像陷阱 + 第 8 课的跳过语义，两个答案其实是一件事的两面。）

下一篇：[《Docker 技术底座——容器凭什么又轻又像一台机器（师生对话实录）》](/云原生/docker/docker-19-tech-foundation)——「会用」到「资深」的分水岭从下一篇开始。

---

## 参考资料

- [Use Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/)——三动作 / ignore / `initial_sync` 官方语义（要求 Compose ≥ 2.22）
- [Using profiles with Compose](https://docs.docker.com/compose/how-tos/profiles/)——默认 / 点名 / 显式 run 三种激活路径；核心服务别挂 profile
- [Use multiple Compose files: Include](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/)——include 与 merge/extend 的分工
- [Use init containers in Compose](https://docs.docker.com/compose/how-tos/init-containers/)（2026-07 版）——pre_start 四条生命线、跳过语义、什么时候不该用、limitations（要求 Compose ≥ 5.3）
- [Use lifecycle hooks](https://docs.docker.com/compose/how-tos/lifecycle-hooks/)——post_start / pre_stop 在容器内执行
- [Use provider services](https://docs.docker.com/compose/how-tos/provider-services/) / [GPU support](https://docs.docker.com/compose/how-tos/gpu-support/)——认脸级
- 本机实测：WSL2 Ubuntu-22.04 · Docker 29.1.3 · Compose v5.5.0（用户级插件；apt 源 2.40.3 不含 pre_start，安装方式见开篇）；「精确规则独占重叠文件」为 v5.5.0 两次实测结论，实测日期 2026-08-25
