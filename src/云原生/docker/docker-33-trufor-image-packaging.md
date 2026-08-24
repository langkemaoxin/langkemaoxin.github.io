---
title: 把 TruFor 打成可交付镜像——从 git clone 翻车滚到 curl 通的 HTTP 服务
sidebarGroup: Docker 系列
shortTitle: 33 TruFor 毕业复盘
order: 33
date: 2026-08-18T00:00:00.000Z
author: Corey
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - Dockerfile
  - 镜像
  - TruFor
description: 一次真实交付滚 12 球：DNS、GitHub TLS、权重下载、端口未映射四次翻车逐球补上，最后用 curl 拿到 score 和两张定位图。
---

> **Docker 系列 · 第 33/33 篇 · 实践复盘（毕业设计案例）**
> 上一篇：[《Docker 的 AI 表面——Model Runner 本地跑大模型（含 Sandboxes/MCP 认脸）》](/云原生/docker/docker-32-ai-surface) · 下一篇：[K8s 学习总纲](/云原生/k8s/k8s-00-roadmap)——容器毕业，去编排层
>
> 主线教程到[第 28 篇](/云原生/docker/docker-28-daemon-ops)为止。本文不是再讲一遍 Dockerfile 语法，而是一次**真实打包**：把开源模型打成运维能跑的镜像，中间卡在 DNS、GitHub、权重和端口映射。前置：[第 9 篇 Dockerfile](/云原生/docker/docker-09-dockerfile)、[第 16 篇 Compose](/云原生/docker/docker-16-compose)、[第 4 篇安装与镜像加速](/云原生/docker/docker-04-install)、[第 28 篇 daemon.json](/云原生/docker/docker-28-daemon-ops)。

---

## 开头：表面是写个 Dockerfile，实际是喂饱一条不稳定的交付链

需求很具体：公司要试图像篡改检测。官方仓库 [grip-unina/TruFor](https://github.com/grip-unina/TruFor)（CVPR 2023）给的是「把图丢进目录、跑完就退出」的 `test_docker`。运维要的是长期 HTTP 服务：上传一张图，返回分数和定位图。

表面任务是写个 Dockerfile。真滚起来才发现，卡住的全不是语法：

- **构建期**：要在 `docker build` 里穿过 DNS、TLS、对端稳定性，把源码和 600MB 级的权重搬进镜像——外网全不稳；
- **运行期**：容器起来了，不等于宿主机浏览器能打开。

根因一句话：**打镜像分两段，构建期负责把东西搬进去，运行期负责把端口通出来；这次翻的每一步车，都断在其中一段的接缝上。**

本篇不先背概念，滚的是**同一条交付链**：固定目录 `~/trufor/trufor-deploy`（已开源：[code-corey/trufor-deploy](https://github.com/code-corey/trufor-deploy)），终点是 `curl` 能调通的镜像 `trufor-api:cvpr2023`。

| 雪球 | 加上去的 | 当场能看见的效果 |
|------|----------|------------------|
| **1** | 把需求钉住：官方 CLI 改成 HTTP 服务 | 一张请求路径图，知道终点长什么样 |
| **2** | 第一版配方（学官方：构建时 git clone + wget） | `docker compose build` 开跑，配方成型 |
| **3** | 修 WSL 的 DNS | 再 build，能开始拉底包 metadata 了 |
| **4** | 靠层缓存重试 | 断掉的下载不从头来，一路跑到 git clone 那步 |
| **5** | 源码改 `vendor/`，COPY 进镜像 | git 那步不再出现；交付目录树成型 |
| **6** | 权重 zip 进构建上下文 + `test -f` 保险丝 | 权重层过了；zip 不对当场失败 |
| **7** | `api_server.py` + EXPOSE + ENTRYPOINT | Dockerfile 定稿，镜像打得出来 |
| **8** | `/v1/detect` 接官方 CLI | 上传一张图能拿到 score 和两张图 |
| **9** | Compose 主文件：端口/环境变量/健康检查 | `up` 的完整形态；`:--1` 不再写错 |
| **10** 🧗 | GPU 叠加文件 + batch profiles | 有 GPU 的机器一条 `-f` 命令带卡起服务 |
| **11** | 补上端口映射 | PORTS 出现 `->`，`curl /health` 通 |
| **12** | 真图验收 | JSON 里读出 `score≈0.245` 和两张定位图 |

环境指纹：构建机 **WSL2 Ubuntu-22.04 + Docker，默认用户 root**（所以 `~` 就是 `/root`）。本机 GTX 1050 只有 2GB 显存，TruFor 官方建议约 8GB，所以主线走 **CPU**；GPU 的事留到雪球 10。官方入口：[TruFor 仓库](https://github.com/grip-unina/TruFor)。

许可先记一笔：TruFor 官方是**非营利 / 科研信息用途**，不是 Apache/MIT。镜像能跑，不等于能当商业产品上线。

---

## 雪球 1：钉住交付物——把「跑完就退出」的 CLI 改成常驻 HTTP 服务

先别碰 Dockerfile，把「滚到终点长什么样」钉死。官方推理底包对齐 `pytorch/pytorch:1.11.0-cuda11.3-cudnn8-runtime`，我们只在上面加三件事：

1. 官方 `test_docker/src`（`trufor_test.py` 等）
2. 预训练权重 `/weights/trufor.pth.tar`
3. 自己写的 FastAPI：`GET /health`、`POST /v1/detect`

官方给的用法和运维要的用法，是两种产品形态：

| | 官方 `test_docker` | 这次的交付镜像 |
|------|--------------------|----------------|
| 入口 | `trufor_test.py`，读 `/data` 写 `/data_out`，**跑完就退出** | `api_server.py`，**常驻**监听 8088 |
| 用法 | 把图丢进目录，跑完去翻输出文件 | `POST /v1/detect`，直接拿 JSON |
| 模型 | TruFor 官方代码 + 权重 | **一行没改**，只是被包成子进程 |

模型没变，产品形态变了。整条请求路径长这样，后面每一球都在补这条链上的一环：

```text
浏览器 / curl
    │  POST 一张图（multipart 的 file 字段）
    ▼
宿主机 8088 ──端口映射──► 容器内 Uvicorn（跑 api_server.py）
                                │ subprocess.run(...)
                                ▼
                        python trufor_test.py（官方 CLI，没改）
                                │ 写出 .npz
                                ▼
                        score + map + conf ──拼成──► JSON 返回
```

还有一句丑话说在前面——**这次镜像不会做**：ELA、JPEG 块分析、自动输出「这是假图」。它只是 TruFor 的 HTTP 壳。

---

## 雪球 2：第一版配方——照官方抄：构建时 git clone 源码、wget 权重

配方第一次成型。底包、依赖这些「室内作业」照常写（这几段从第一版活到了定稿）：

```dockerfile
FROM pytorch/pytorch:1.11.0-cuda11.3-cudnn8-runtime

SHELL ["/bin/bash", "-c"]

RUN apt-get update \
    && apt-get install -y --no-install-recommends apt-utils wget unzip git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip \
    && pip install "tqdm" "yacs>=0.1.8" "timm>=0.5.4" "numpy==1.21.5" \
       "fastapi" "uvicorn" "python-multipart" "pillow"

WORKDIR /

# ↓ 第一版最危险的两步：构建时才去外网现拿源码和权重
RUN git clone --depth 1 https://github.com/grip-unina/TruFor.git
#   ……再把官方 test_docker/src 拷到容器根……
RUN wget <www.grip.unina.it 上的权重直链>   # 直链见官方 README，权重也是现场下
```

（定稿的完整 Dockerfile 在雪球 7；完整 `api_server.py` 和 Compose 文件以[交付仓库](https://github.com/code-corey/trufor-deploy)为准，正文按球讲增量。）

再配一个最小 Compose，让 `docker compose build` 跑得起来就行（完整主文件雪球 9 才滚到）：

```yaml
services:
  trufor-api:
    build:
      context: .
      dockerfile: Dockerfile
    image: trufor-api:cvpr2023
```

`build:` 和 `image:` 写在一起，构建产物直接 tag 成 `trufor-api:cvpr2023`——[第 16 篇](/云原生/docker/docker-16-compose)讲过，不写 `image` 时默认是「项目名-服务名」。

```bash
cd ~/trufor/trufor-deploy
docker compose build
```

配方成型，开跑。第一车马上就来：构建机上一台配了 DaoCloud 镜像加速 `https://docker.m.daocloud.io` 的 WSL，连底包的 metadata 都拉不动——下一球拆。

---

## 雪球 3：第一次 build 就卡死——WSL 的 DNS 先是坏的

构建在拉 `pytorch/pytorch:...` 的 metadata 时失败。根因**不是 Dockerfile**，是 WSL 的 `/etc/resolv.conf` 是个坏掉的符号链接，指向根本不存在的 `/mnt/wsl/resolv.conf`，于是 Docker 拿着 `[::1]:53` 去查域名，连接被拒绝。链路是这样的：

```text
docker build 拉底包
   │ 要解析 registry 域名
   ▼
/etc/resolv.conf ──符号链接──► /mnt/wsl/resolv.conf（不存在，链接坏着）
   │ 实际生效的 nameserver
   ▼
[::1]:53 ──► connection refused
```

处理分两半，缺一不可：

1. 给 `/mnt/wsl/resolv.conf` 写上 `223.5.5.5`、`114.114.114.114`、`8.8.8.8`；
2. 在 `/etc/docker/daemon.json` 里补 `"dns"`，重启 Docker（怎么改 daemon.json 见[第 28 篇](/云原生/docker/docker-28-daemon-ops)）。

注意 DaoCloud 加速器**仍然有用**——但加速器自己也是个域名，也得先能被解析。这一课对应主线：[第 4 篇 registry-mirrors](/云原生/docker/docker-04-install)、[第 28 篇 daemon.json](/云原生/docker/docker-28-daemon-ops)。**镜像源配了 ≠ 构建网络通。**

当场效果：再 `docker compose build`，这次真的开始一层一层拉了。

---

## 雪球 4：底包拉了二十分钟被对端掐断——层缓存救了第二次

DNS 修好后，`pytorch/pytorch:1.11.0-...` 的层开始下载。大约**二十分钟**后，在 Cloudflare（`104.21.24.221:443`）上 `connection reset by peer`，镜像没拉完，build 又停了。

处理简单粗暴：**再跑一次 `docker compose build`**。已经落盘的层走缓存，不必从头来——[第 10 篇](/云原生/docker/docker-10-build-advanced)讲过的构建缓存，这里成了救命稻草。这是**构建网络问题，不是配方写错**，改 Dockerfile 没用。

当场效果：第二次 build 从断点附近继续，一路跑到 `RUN git clone` 那一步——然后撞上这次最硬的一堵墙，下一球拆。

---

## 雪球 5：git clone 跑 494 秒后 TLS 断开——把源码变成 vendor/

`RUN git clone` 原样学官方（容器里 `git clone --depth 1 https://github.com/grip-unina/TruFor.git`），跑了约 **494 秒**后：

```text
error: RPC failed; curl 56 GnuTLS recv error (-9): A TLS packet with unexpected length was received.
fatal: The remote end hung up unexpectedly
fatal: early EOF
fatal: index-pack failed
```

逐行读这份输出：`curl 56` 是 git 底层 libcurl 的传输错误码；`GnuTLS recv error (-9)` 说 TLS 会话读到一半收到了长度不对的包——典型的中途被掐；`early EOF` 是数据流提前结束，仓库还没传完；`index-pack failed` 是接收端的解包收尾失败。整串的退出码是 **128**，`RUN` 一失败整层就废，下次还得从头 clone。

换机器验证过：Windows 上直连浅克隆同样 `early EOF`；走 ghproxy 也会一直停在 `Cloning into ...`。也就是说这不是 WSL 一台机器的毛病，是到 GitHub 的 Git 协议长连接本身不稳。

真正起作用的改法：**构建时不要 clone 整个仓库。** 推理只用 `test_docker/src` 十几个文件。在宿主机用 jsDelivr 按文件拉到 `vendor/trufor_src/`，Dockerfile 里 `COPY vendor/`，有这份目录就跳过 git。权重仍然很大，源码很小——没必要为源码赌一次 Git 协议长连接。

于是交付目录长成这样（这就是**最终交付树**；权重 zip 要和 `Dockerfile` 同级，**不进 Git**，`api_server.py` 等文件是后面几球补进来的）：

```text
trufor-deploy/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.gpu.yml
├── .env / .env.example
├── api_server.py              # 我们写的 HTTP 壳
├── TruFor_weights.zip         # 宿主机预下载，COPY 进镜像
├── vendor/
│   └── trufor_src/            # 官方 test_docker/src，避免 git clone
│       ├── trufor_test.py
│       ├── trufor.yaml
│       ├── config.py
│       ├── data_core.py
│       └── models/
│           ├── DnCNN.py
│           └── cmx/           # SegFormer 双流 + 可靠性头
├── call_example.py
├── viewer.html                # 本地打开 JSON 看定位图，不进镜像
└── 运维说明.md
```

Dockerfile 里源码这一步换成（取代雪球 2 里那行 `RUN git clone`）：

```dockerfile
COPY vendor/ /opt/vendor/

RUN set -eux; \
    if [ -f /opt/vendor/trufor_src/trufor_test.py ]; then \
      cp -a /opt/vendor/trufor_src/. /; \
    else \
      # 兜底：jsDelivr / raw / git clone（国内经常走到这里就失败）
      ...; \
    fi; \
    test -f /trufor_test.py
```

兜底分支是留给没准备 `vendor/` 的人的——国内经常走到这里就失败，雪球 5 的教训就在眼前；`apt` 里留着 `git ca-certificates` 也是为它。结尾那句 `test -f /trufor_test.py` 是保险丝：源码没到位，构建当场失败，而不是运行时才发现。

当场效果：这一步之后，**构建过程不再访问 GitHub**。

---

## 雪球 6：权重也不在 build 里下载——COPY zip 进来，test -f 做保险丝

源码解决了，权重还是「构建时 `wget` 现场下」的写法。官方权重在 `www.grip.unina.it`，构建时 `wget` 同样可能被掐——和雪球 5 是同一个病根。改法也是同一个思路：宿主机先下好 `TruFor_weights.zip`，和 Dockerfile 放同级，变成构建上下文里的文件：

```dockerfile
COPY TruFor_weights.zip /TruFor_weights.zip
RUN unzip -q -n /TruFor_weights.zip -d / \
    && rm /TruFor_weights.zip \
    && test -f /weights/trufor.pth.tar
```

三件事各有分工：`unzip -q -n` 静默解压、不覆盖已存在的文件；`rm` 把 zip 从镜像里删掉，不占两层体积；`test -f` 是保险丝——zip 结构不对，构建当场失败，而不是容器启动后才发现没有 `trufor.pth.tar`。

为什么必须解压到容器根下的 `weights/`？官方配置里权重是**相对路径**：

```yaml
# vendor/trufor_src/trufor.yaml
TEST:
  MODEL_FILE: '../weights/trufor.pth.tar'
```

官方 CLI 在根目录跑，`../weights/` 就是 `/weights/`，所以 zip 里必须解出这个位置。

还有一个纯目录坑：`COPY` 要求 zip 出现在**实际执行 build 的那个目录**。Windows 浏览器下好了、Ubuntu 的 `~/trufor/trufor-deploy` 若不是同一份目录，会报 `not found`。

到这里雪球 5、6 的思路可以钉成一个模型——**构建期网络和运行期网络是两张网**：

```text
构建期（docker build 里的 RUN）           运行期（docker run / compose up）
容器外网：DNS → TLS → 对端稳定性          容器只监听自己的端口
源码、权重在这段搬进镜像 ──────► 镜像 ──► 之后不再访问 GitHub / 权重站
（前提：你已经 COPY 进去了）
```

把大文件、源码尽量变成**构建上下文**（第 9 篇讲过：`COPY` 只能从上下文取文件），是国内网络下最稳的一招。

---

## 雪球 7：加上 HTTP 壳——api_server.py 当 ENTRYPOINT（Dockerfile 定稿）

东西都搬进去了，最后加「壳」。自己写的 `api_server.py` 先看骨架：启动时读环境和端口，探活只返回 GPU 号：

```python
DEFAULT_GPU = os.environ.get("TRUFOR_GPU", "-1")
HOST = os.environ.get("TRUFOR_HOST", "0.0.0.0")
PORT = int(os.environ.get("TRUFOR_PORT", "8088"))

app = FastAPI(title="TruFor 图片篡改检测", version="cvpr2023")

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "gpu": DEFAULT_GPU}
```

容器进程入口，就是 Dockerfile 里 ENTRYPOINT 指的那行：

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
```

Dockerfile 收尾三行 + 汇总，定稿长这样（底座是雪球 2 的、源码步是雪球 5 的、权重步是雪球 6 的，这球只加最后三段）：

```dockerfile
FROM pytorch/pytorch:1.11.0-cuda11.3-cudnn8-runtime

SHELL ["/bin/bash", "-c"]

RUN apt-get update \
    && apt-get install -y --no-install-recommends apt-utils wget unzip git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip \
    && pip install "tqdm" "yacs>=0.1.8" "timm>=0.5.4" "numpy==1.21.5" \
       "fastapi" "uvicorn" "python-multipart" "pillow"

WORKDIR /

COPY vendor/ /opt/vendor/

RUN set -eux; \
    if [ -f /opt/vendor/trufor_src/trufor_test.py ]; then \
      cp -a /opt/vendor/trufor_src/. /; \
    else \
      # 兜底：jsDelivr / raw / git clone（国内经常走到这里就失败）
      ...; \
    fi; \
    test -f /trufor_test.py

COPY TruFor_weights.zip /TruFor_weights.zip
RUN unzip -q -n /TruFor_weights.zip -d / \
    && rm /TruFor_weights.zip \
    && test -f /weights/trufor.pth.tar

COPY api_server.py /api_server.py

EXPOSE 8088
ENTRYPOINT ["python", "/api_server.py"]
```

打进镜像之后，容器根目录大致是：

```text
/api_server.py          ← ENTRYPOINT
/trufor_test.py         ← 官方 CLI（从 vendor 拷过来）
/trufor.yaml
/config.py / data_core.py / models/
/weights/trufor.pth.tar ← zip 解压出来
```

注意 `EXPOSE 8088` 只声明容器内会用 8088，真正对外要靠 `-p` 或 Compose 的 `ports`。这句先记下现象——**雪球 11 补**。

当场效果：`docker compose build` 走完全部层，`trufor-api:cvpr2023` 打出来了。

---

## 雪球 8：接上 /v1/detect——子进程调官方 CLI，读 .npz 转 JSON

探活通了，主菜是推理。关键决策：**不把模型 load 进 FastAPI 进程**，而是 `cwd=/` 调官方脚本，权重路径、`sys.path` 都按官方约定：

```python
def _run_trufor(image_path: Path, output_path: Path, gpu: str) -> None:
    command = [
        "python", "trufor_test.py",
        "-gpu", str(gpu),
        "-in", str(image_path),
        "-out", str(output_path),
    ]
    completed = subprocess.run(command, cwd="/", capture_output=True, text=True)
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr or completed.stdout or "TruFor 推理失败")
```

`subprocess.run(..., cwd="/")` 让子进程在容器根目录跑——正是雪球 6 说的那个 `../weights/` 相对路径能成立的原因。返回码不是 0 就把 stderr 抛出去，不让失败静默。

`POST /v1/detect` 把上传文件落到临时目录，跑完读 `.npz`，把 `map` / `conf` 编成 PNG data URL：

```python
@app.post("/v1/detect")
async def detect(file: UploadFile = File(...)) -> JSONResponse:
    raw = await file.read()
    # ... 写入 work_dir/input.* ，调用 _run_trufor ...
    payload = np.load(output_npz)
    score = float(payload["score"])
    imgsize = payload["imgsize"].tolist()
    localization = _to_data_url(_to_png_bytes(payload["map"]))
    confidence = _to_data_url(_to_png_bytes(payload["conf"]))
    return JSONResponse({
        "score": score,
        "imgsize": imgsize,
        "localization_map": localization,
        "confidence_map": confidence,
        "note": "score 接近 1 更像被篡改；confidence_map 越亮表示定位越可信。",
    })
```

`.npz` 里那几样是哪来的？就是官方 `trufor_test.py` 写出来的（另有可选 `np++`，本次 HTTP 没暴露）：

```python
out_dict = dict()
out_dict['map'] = pred
out_dict['imgsize'] = tuple(rgb.shape[2:])
if det is not None:
    out_dict['score'] = det_sig
if conf is not None:
    out_dict['conf'] = conf
np.savez(filename_out, **out_dict)
```

接口转的就是这三样：`score`（整图篡改分）、`map`（定位图）、`conf`（定位可信度）。**官方 CLI 一行没改**——它还是那个跑完就退出的批处理脚本，只是从「主人」变成了「子进程」。

当场效果：镜像的 API 面齐了——`/health` 探活、`/v1/detect` 出结果。

---

## 雪球 9：交给 Compose——端口、环境变量、健康检查（和 `:--1` 这个坑）

镜像好了，怎么起、怎么配，交给 Compose 主文件。它只描述「镜像怎么来、端口怎么映射、环境变量怎么进容器」，在雪球 2 那两行最小版上一次补齐：

```yaml
services:
  trufor-api:
    build:
      context: .
      dockerfile: Dockerfile
    image: trufor-api:cvpr2023
    container_name: trufor-api
    restart: unless-stopped
    environment:
      # 必须写成 :--1。写成 :-1 会被解析成默认值 1（第二块 GPU）
      TRUFOR_GPU: ${TRUFOR_GPU:--1}
      TRUFOR_HOST: 0.0.0.0
      TRUFOR_PORT: 8088
    ports:
      - "${TRUFOR_PORT:-8088}:8088"
    shm_size: "2gb"
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8088/health')"]
      interval: 30s
      timeout: 5s
      retries: 10
      start_period: 60s

  trufor-batch:
    profiles: ["batch"]
    image: trufor-api:cvpr2023
    entrypoint: ["python", "trufor_test.py"]
    command: ["-gpu", "${TRUFOR_GPU:--1}", "-in", "data/", "-out", "data_out/"]
```

逐块看增量：

- **`environment` + `.env`**：变量从同目录 `.env` 来，流转是 `.env` → `${TRUFOR_GPU:--1}` → `environment:` → `os.environ.get("TRUFOR_GPU")`。注意 Python 读的是**容器环境变量**，不是磁盘上那份 `.env` 文件：

  ```env
  TRUFOR_GPU=-1
  TRUFOR_PORT=8088
  ```

  这里埋着全篇最阴的一个坑：`${VAR:-default}` 里 `:-` 后面**整段**都是默认值。CPU 设备号是 `-1`，必须写成 `:--1`；写成 `:-1` 会被拆成「默认值 `1`」——第二块 GPU，和「没写就走 CPU」完全相反。
- **`ports`**：`"${TRUFOR_PORT:-8088}:8088"`，[第 15 篇](/云原生/docker/docker-15-network)的 `-p` 写进 YAML；`:-8088` 这种正数默认值就没那么娇气。
- **`healthcheck`**：容器内自己 `urlopen` 打 `/health`（第 16 篇讲过探针怎么读：`interval` 多久探一次、`retries` 连挂几次算不健康、`start_period` 启动宽限期——模型加载慢，给了 60 秒）。
- **`container_name` / `restart` / `shm_size`**：固定容器名方便运维敲命令；`restart: unless-stopped` 让容器挂了、Docker 重启后自动拉起（手动 `stop` 的除外）；`shm_size: "2gb"` 把容器的 `/dev/shm` 加大，PyTorch 多进程读数据时默认 64MB 不够用。
- **`trufor-batch`**：挂了 `profiles: ["batch"]`，默认 `up` **不会**起它；要批处理时 `--profile batch` 才进来。同一个镜像，入口换回官方 CLI，读 `data/` 写 `data_out/`——雪球 1 那张对比表里的「官方用法」被做成了可选服务。

当场效果：一份能 `up` 的完整主文件。改完变量想先核对渲染结果，用[第 16 篇](/云原生/docker/docker-16-compose)的招 `docker compose config` 先看再起。

---

## 雪球 10 🧗：GPU 与批处理入口——叠加文件只补设备，两件事缺一不可

主线（CPU）到雪球 9 已经完整。这一球是给**有 GPU 的运维机**准备的，本机 1050 那 2GB 显存就别试了。

GPU 不另写一份 Compose，而是**叠加文件只补设备**，不改镜像、不改端口：

```yaml
# docker-compose.gpu.yml
services:
  trufor-api:
    gpus: all
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

起服务用两个 `-f`：

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

两个 `-f` 是**合并成一份配置、起同一个容器**，不是起两套。没 GPU 的机器不加第二个 `-f`，就不会被 `nvidia` 设备声明卡死。

这里最容易想岔的一点：**GPU 是运行时问题**。`docker compose build` 不需要 GPU；`up` 才需要 NVIDIA Container Toolkit，同时 `.env` 里写 `TRUFOR_GPU=0`。两件事缺一不可——`.env` 告诉 **Python** 用 GPU 0，叠加文件告诉 **Docker** 把显卡塞进容器；只做一件，要么模型在 CPU 上跑，要么卡在容器里看不见。

当场效果：GPU 机器上一条命令，`nvidia-smi` 能在容器里看到卡，`/health` 返回的 `gpu` 变成 `0`。

---

## 雪球 11：容器 Up 了，浏览器却打不开——PORTS 里没有箭头

镜像打出来了，容器也起了，日志一切正常：

```text
INFO:     Uvicorn running on http://0.0.0.0:8088
```

`docker ps` 却是：

```text
PORTS
8088/tcp
```

对照雪球 7 预告的那个坑，现在补上。逐行读：日志说明**容器内部**进程活着、监听没毛病；`docker ps` 的 PORTS 列没有 `0.0.0.0:8088->8088/tcp` 这种带箭头的写法，只有孤零零的 `8088/tcp`——这正是 **EXPOSE 声明**的显示效果，不是端口映射。再往下验证：`docker inspect` 里 `PortBindings` 是 `{}`，宿主机 `ss` 也没有进程听 8088。

原因：当时容器名是 `imageTest`，用 `docker run` 起的，**没加 `-p 8088:8088`**。`EXPOSE 8088` 只是镜像元数据，不负责在宿主机开端口；Compose 主文件里的 `ports` 也只有走 `docker compose up` 才生效。三种写法的实际效果：

| 写法 | 实际效果 |
|------|----------|
| `EXPOSE 8088` | 文档/元数据，`docker ps` 可能显示 `8088/tcp` |
| `docker run -p 8088:8088` | 宿主机 8088 → 容器 8088 |
| Compose `ports:` | 等价于 `-p`，必须走 compose up |

处理：

```bash
docker stop imageTest && docker rm imageTest
docker run -d --name imageTest -p 8088:8088 trufor-api:cvpr2023
```

确认 PORTS 变成 `0.0.0.0:8088->8088/tcp` 后，再 `curl http://127.0.0.1:8088/health`。如果 Docker 跑在 WSL、浏览器在 Windows：先在 Ubuntu 里 curl 成功；Windows 仍打不开时，用 `wsl hostname -I` 的地址访问。

当场效果：`/health` 通了，浏览器也能打开 `/docs`。

---

## 雪球 12：最终验收——POST 一张真图，读懂 score

全链路通了，按运维视角从头走一遍（构建目录里需要 `vendor/trufor_src/trufor_test.py` 和 `TruFor_weights.zip`）：

```bash
git clone https://github.com/code-corey/trufor-deploy.git
cd trufor-deploy
# 把官方 TruFor_weights.zip 放到与 Dockerfile 同级
docker compose build
docker run -d --name imageTest -p 8088:8088 trufor-api:cvpr2023
curl http://127.0.0.1:8088/health
curl -X POST http://127.0.0.1:8088/v1/detect -F "file=@/path/to.jpg"
```

返回大致是：

```json
{
  "score": 0.245,
  "imgsize": [1280, 1881],
  "localization_map": "data:image/png;base64,...",
  "confidence_map": "data:image/png;base64,...",
  "note": "score 接近 1 更像被篡改；..."
}
```

逐行读：`score: 0.245` 是整图篡改分；`imgsize` 是原图宽高（`trufor_test.py` 里 `tuple(rgb.shape[2:])` 写进去的）；两张 `data:image/png;base64,...` 是定位图和可信度图，塞进 JSON 是为了前端一个 `<img>` 就能显示——本地看结果也可以用交付树里的 `viewer.html` 打开。

**score 怎么读**：越接近 1，TruFor 越倾向「整图异常」。它**不是**鉴定书上的真/假。本次样例约 `0.25`，只能读成模型不太像整图伪造，不能读成「图一定是真的」。

这次做到的终点：镜像能构建、带端口能调 `/v1/detect`、能拿到 TruFor 的 score 和两张图。ELA / JPEG 通道、以及业务上的「是否伪造」布尔值，都还没进这个镜像。

---

## 怎么记：四次翻车，各在哪一球补的

按症状反查这一路：

| 症状 | 根因 | 在哪一球 |
|------|------|----------|
| 拉 metadata 直接失败，`[::1]:53` 拒绝 | WSL `resolv.conf` 坏符号链接 | 雪球 3 |
| 层下载 20 分钟后 `connection reset` | 对端掐断；层缓存救场 | 雪球 4 |
| `git clone` 494 秒 TLS packet 断 | GitHub 长连接不稳；改 vendor | 雪球 5 |
| 构建里下权重随时翻车 | 又一处构建期外网依赖；改 COPY zip | 雪球 6 |
| 容器 Up、日志正常，浏览器打不开 | `docker run` 没加 `-p` | 雪球 11 |

以后再把「GitHub 上的模型 + 官网站点上下的权重」打进镜像，按这个顺序想（括号里是论证它的那一球）：

1. **先确认构建机 DNS 和 registry 加速都活着**，再怪 Dockerfile（雪球 3）。
2. **能 COPY 的不要在 RUN 里从 GitHub 拉**。clone 失败成本是十几分钟；按文件 vendor 源码通常几秒（雪球 5）。
3. **大权重预下载进构建上下文**，用 `test -f` 校验解压结果（雪球 6）。
4. **镜像构建成功 ≠ 服务可调用**。看 `docker ps` 的 PORTS 有没有 `->`，不要只看容器 Up 和容器内日志（雪球 11）。
5. **GPU 是运行时问题**。`docker compose build` 不需要 GPU；`up` 才需要 Toolkit 和 `TRUFOR_GPU=0`（雪球 10）。

---

## 历史包袱

- **`docker-compose.yml` 这个文件名**：V2 的首选名是 `compose.yaml`，老名字 `docker-compose.yml` 也能认（[第 16 篇](/云原生/docker/docker-16-compose)讲过）。交付仓库沿用的是老名字；新项目建议直接用新名字。
- **GPU 的两种写法**：叠加文件里 `gpus: all` 是 Compose 后来加的简写，`deploy.resources.reservations.devices` 是早先的写法。两段都写是给老版本 Compose 留的兼容，不是写重复了。
- **「构建时 git clone」是官方姿势**：TruFor 的 `test_docker` 默认你有一根稳定的 GitHub 长连接。这是科研仓库的历史假设，不是交付假设——`vendor/` 目录就是为绕开它加的；Dockerfile 里那段「兜底：jsDelivr / raw / git clone」留着可以，国内走到那里大概率就是雪球 5 的下场。

---

## 和系列其它篇

| 相关篇 | 在这一路上出现的位置 |
|--------|----------------------|
| [第 4 篇](/云原生/docker/docker-04-install) 安装与镜像加速 | 雪球 3：registry-mirrors 配了 ≠ 构建网络通 |
| [第 28 篇](/云原生/docker/docker-28-daemon-ops) daemon.json | 雪球 3：`"dns"` 补在 daemon.json |
| [第 9 篇](/云原生/docker/docker-09-dockerfile) Dockerfile | 雪球 2/5/6：构建上下文、COPY、保险丝 |
| [第 10 篇](/云原生/docker/docker-10-build-advanced) 构建进阶 | 雪球 4：层缓存救了第二次 build |
| [第 15 篇](/云原生/docker/docker-15-network) 网络 | 雪球 11：`-p` 与 EXPOSE 的区别 |
| [第 16 篇](/云原生/docker/docker-16-compose) Compose | 雪球 9/10：变量、healthcheck、profiles、多文件合并 |

---

## 小结

从一份「跑完就退出」的官方 CLI 出发，十二球滚出一条交付链：

1. **钉住交付物**：CLI 变 HTTP 服务，模型一行不改，产品形态变了。
2. **第一版配方**：学官方构建时 git clone + wget，外网依赖埋雷。
3. **修 DNS**：WSL `resolv.conf` 坏链接是第一车；加速器也要先能被解析。
4. **层缓存重试**：下载被掐不从头来；网络问题别怪配方。
5. **源码 vendor 化**：`COPY vendor/` 之后构建不再碰 GitHub。
6. **权重 COPY zip + `test -f`**：解压位置跟着官方相对路径走；构建期/运行期是两张网。
7. **HTTP 壳定稿**：`api_server.py` 当 ENTRYPOINT；EXPOSE 只是声明（雪球 11 补）。
8. **/v1/detect**：子进程调官方 CLI，`.npz` 三样转 JSON。
9. **Compose 主文件**：端口、环境变量、健康检查；`:--1` 少一个 `-` 就从 CPU 变 GPU 1。
10. **GPU 叠加文件**：`-f` 合并同一容器；`.env` 管软件、叠加文件管硬件，缺一不可。
11. **补端口映射**：PORTS 有 `->` 才算通；容器 Up ≠ 服务可调。
12. **真图验收**：`score≈0.245` 读作「不太像整图伪造」，不是「图是真的」。

**思考题**：换一台新的构建机，build 又停在拉底包 metadata——按雪球 3 的排查顺序你先看什么？同事说容器明明 Up、日志也正常，但他浏览器打不开 `/docs`——你让他看 `docker ps` 的哪一列？`.env` 里已经写了 `TRUFOR_GPU=-1`，为什么 Compose 里还得写 `${TRUFOR_GPU:--1}`，少写一个 `-` 会发生什么？

---

## 参考资料

- [TruFor 官方仓库（CVPR 2023）](https://github.com/grip-unina/TruFor)
- [本文交付目录 trufor-deploy](https://github.com/code-corey/trufor-deploy)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Compose file reference](https://docs.docker.com/reference/compose-file/)
- [第 16 篇 Compose](/云原生/docker/docker-16-compose)（变量插值、healthcheck、profiles 的主干课）
- 本机：WSL2 Ubuntu-22.04 + Docker（默认用户 root）；GPU GTX 1050 2GB（本篇主线走 CPU）
