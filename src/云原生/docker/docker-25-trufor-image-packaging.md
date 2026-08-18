---
title: 把 TruFor 打成可交付镜像——构建翻车与修复
sidebarGroup: Docker 系列
shortTitle: 25 TruFor 镜像打包复盘
order: 25
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
description: 一次真实交付：把 CVPR 2023 开源取证模型 TruFor 打成 HTTP 镜像，以及 WSL DNS、GitHub TLS、权重下载和端口未映射四次翻车怎么修。
---

> **Docker 系列 · 实践复盘**
>
> 主线教程到[第 24 篇](/云原生/docker/docker-24-daemon-ops)为止。本文不是再讲一遍 Dockerfile 语法，而是一次**真实打包**：把开源模型打成运维能跑的镜像，中间卡在 DNS、GitHub、权重和端口映射。前置：[第 9 篇 Dockerfile](/云原生/docker/docker-09-dockerfile)、[第 13 篇 Compose](/云原生/docker/docker-13-compose)、[第 4 篇安装与镜像加速](/云原生/docker/docker-04-install)、[第 24 篇 daemon.json](/云原生/docker/docker-24-daemon-ops)。

---

## 开头：表面上是「做个 Docker 镜像」

需求很具体：公司要试图像篡改检测。官方仓库 [grip-unina/TruFor](https://github.com/grip-unina/TruFor)（CVPR 2023）给的是「把图丢进目录、跑完就退出」的 `test_docker`。运维要的是长期 HTTP 服务：上传一张图，返回分数和定位图。

交付目录已开源：[code-corey/trufor-deploy](https://github.com/code-corey/trufor-deploy)。镜像名 `trufor-api:cvpr2023`。构建机是 **WSL2 Ubuntu-22.04 + Docker**，默认用户 root。本机 GTX 1050 只有 2GB 显存，官方建议约 8GB，所以这台机器走 CPU；有 GPU 的运维机再用 Compose 叠加文件开 GPU。

表面任务是写 Dockerfile。真正卡住的是：**构建时要访问的外网全不稳定**，以及 **容器起来了不等于宿主机浏览器能打开**。

许可先记一笔：TruFor 官方是非营利 / 科研信息用途，不是 Apache/MIT。镜像能跑，不等于能当商业产品上线。

---

## 目标镜像长什么样

官方推理底包对齐 `pytorch/pytorch:1.11.0-cuda11.3-cudnn8-runtime`。我们只在上面加三件事：

1. 官方 `test_docker/src`（`trufor_test.py` 等）
2. 预训练权重 `/weights/trufor.pth.tar`
3. 自己写的 FastAPI：`GET /health`、`POST /v1/detect`

容器一启动就跑 `python /api_server.py`，监听 8088。业务上传 `file`，进程里再调官方 CLI，把 `.npz` 里的 `score` / `map` / `conf` 转成 JSON。

**这次镜像不会做**：ELA、JPEG 块分析、自动输出「这是假图」。它只是 TruFor 的 HTTP 壳。

Compose 拆成两份：主文件管端口和环境变量；`docker-compose.gpu.yml` 只补 `gpus`。没 GPU 的机器不会被 `nvidia` 设备声明卡死。两个 `-f` 是合并成一份配置、起**同一个**容器，不是起两套。

---

## 交付目录与代码结构

构建上下文就是 `trufor-deploy/`（GitHub：[code-corey/trufor-deploy](https://github.com/code-corey/trufor-deploy)）。构建机最终认的是这份树（权重 zip 要和 `Dockerfile` 同级，**不进 Git**）：

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

打进镜像之后，容器根目录大致是：

```text
/api_server.py          ← ENTRYPOINT
/trufor_test.py         ← 官方 CLI（从 vendor 拷过来）
/trufor.yaml
/config.py / data_core.py / models/
/weights/trufor.pth.tar ← zip 解压出来
```

请求路径：浏览器/curl → 宿主机 `8088` → 容器内 Uvicorn → `api_server.py` 用子进程调 `python trufor_test.py` → 读 `.npz` → JSON。

### Dockerfile：底包、vendor、权重、入口

完整配方如下。先装依赖，再 `COPY vendor/`；有 `trufor_test.py` 就不再 clone GitHub。权重用本地 zip，解压后必须存在 `/weights/trufor.pth.tar`。

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

`EXPOSE` 只声明容器内会用 8088，真正对外要靠 `-p` 或 Compose 的 `ports`。

官方配置里权重路径是相对路径，所以必须解压到容器根下的 `weights/`：

```yaml
# vendor/trufor_src/trufor.yaml
TEST:
  MODEL_FILE: '../weights/trufor.pth.tar'
```

### Compose：HTTP 服务 + 可选批处理

主文件只描述「镜像怎么来、端口怎么映射、环境变量怎么进容器」。`trufor-batch` 挂了 `profiles: ["batch"]`，默认 `up` 不会起它。

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

GPU 叠加文件**只补设备**，不改镜像、不改端口：

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

`.env` 给 Compose 填变量，Python 读的是容器环境变量，不是磁盘上这份文件：

```env
TRUFOR_GPU=-1
TRUFOR_PORT=8088
```

流转：`.env` → `${TRUFOR_GPU:--1}` → `environment:` → `os.environ.get("TRUFOR_GPU")`。

### `api_server.py`：FastAPI 壳，模型仍是官方 CLI

启动时读环境和端口，探活只返回 GPU 号：

```python
DEFAULT_GPU = os.environ.get("TRUFOR_GPU", "-1")
HOST = os.environ.get("TRUFOR_HOST", "0.0.0.0")
PORT = int(os.environ.get("TRUFOR_PORT", "8088"))

app = FastAPI(title="TruFor 图片篡改检测", version="cvpr2023")

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "gpu": DEFAULT_GPU}
```

推理不把模型 load 进 FastAPI 进程，而是 `cwd=/` 调官方脚本（权重路径、`sys.path` 都按官方约定）：

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

容器进程入口：

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
```

对应 Dockerfile 的 `ENTRYPOINT ["python", "/api_server.py"]`。

官方 `trufor_test.py` 写出的字段就是接口在转的那三样（另有可选 `np++`，本次 HTTP 没暴露）：

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

---

## 时间线：从配方到能调 API

### 1. 先写配方，不先在容器里 clone 业务逻辑

目录和关键片段见上一节。这里只补一个**还没构建就踩过的坑**：默认 CPU 必须写成 `${TRUFOR_GPU:--1}`。写成 `:-1` 时，Compose 会把默认值解析成 `1`（第二块 GPU），和「没写就走 CPU」完全相反。

### 2. 第一次 `docker compose build`：DNS 根本解析不了

机器上配了 DaoCloud 镜像加速 `https://docker.m.daocloud.io`。构建在拉 `pytorch/pytorch:...` 的 metadata 时失败，根因不是 Dockerfile，是 **WSL 的 `/etc/resolv.conf` 是坏掉的符号链接**，指向不存在的 `/mnt/wsl/resolv.conf`。Docker 去 `[::1]:53` 查域名，连接被拒绝。

处理：给 `/mnt/wsl/resolv.conf` 写上 `223.5.5.5`、`114.114.114.114`、`8.8.8.8`，并在 `/etc/docker/daemon.json` 里补 `"dns"`，重启 Docker。镜像加速仍然有用，但加速器自己也要先能被解析。

这一步对应主线：[第 4 篇 registry-mirrors](/云原生/docker/docker-04-install)、[第 24 篇 daemon.json](/云原生/docker/docker-24-daemon-ops)。**镜像源配了不等于构建网络通。**

### 3. PyTorch 底包：拉了二十分钟被对端掐断

DNS 修好后，层开始下载，大约二十分钟后在 Cloudflare（`104.21.24.221:443`）`connection reset by peer`。镜像当时没拉完。

处理：再 `docker compose build`。已经落盘的层走缓存，不必从头来。这是构建网络问题，不是配方写错。

### 4. 卡在 `RUN git clone` GitHub：TLS 中途断开

源码步骤原样学官方：容器里 `git clone --depth 1 https://github.com/grip-unina/TruFor.git`。跑了约 494 秒后：

```text
error: RPC failed; curl 56 GnuTLS recv error (-9): A TLS packet with unexpected length was received.
fatal: The remote end hung up unexpectedly
fatal: early EOF
fatal: index-pack failed
```

退出码 128。Windows 上直连浅克隆同样 `early EOF`；走 ghproxy 也会一直停在 `Cloning into ...`。

真正起作用的改法：**构建时不要 clone 整个仓库。** 推理只用 `test_docker/src` 十几个文件。在宿主机用 jsDelivr 按文件拉到 `vendor/trufor_src/`，Dockerfile 里 `COPY vendor/`。有这份目录就跳过 git。权重仍然很大，源码很小，没必要为源码赌一次 Git 协议长连接。

### 5. 权重：不要在 `docker build` 里 wget 外网大文件

官方权重在 `www.grip.unina.it`，构建时 `wget` 同样可能被掐。这次是宿主机先下好 `TruFor_weights.zip`，和 Dockerfile 放同级：

```dockerfile
COPY TruFor_weights.zip /TruFor_weights.zip
RUN unzip -q -n /TruFor_weights.zip -d / \
    && rm /TruFor_weights.zip \
    && test -f /weights/trufor.pth.tar
```

`test` 是保险丝：zip 结构不对，构建当场失败，而不是容器启动后才发现没有 `trufor.pth.tar`。`COPY` 要求 zip 出现在 **实际执行 build 的那个目录**。Windows 下好了、Ubuntu 的 `~/trufor/trufor-deploy` 若不是同一份目录，会报 `not found`。

### 6. 镜像打出来了，浏览器打开 `/docs` 没反应

容器日志是正常的：

```text
INFO:     Uvicorn running on http://0.0.0.0:8088
```

`docker ps` 却是：

```text
PORTS
8088/tcp
```

没有 `0.0.0.0:8088->8088/tcp`。`docker inspect` 里 `PortBindings` 是 `{}`。宿主机 `ss` 也没有进程听 8088。

原因：容器名是 `imageTest`，用 `docker run` 起的，**没加 `-p 8088:8088`**。`EXPOSE 8088` 只是镜像元数据声明，不负责在宿主机开端口。Compose 主文件里的 `ports` 只有走 `docker compose up` 才会生效。

处理：

```bash
docker stop imageTest && docker rm imageTest
docker run -d --name imageTest -p 8088:8088 trufor-api:cvpr2023
```

确认 PORTS 变成 `0.0.0.0:8088->8088/tcp` 后，再 `curl http://127.0.0.1:8088/health`。通了才能用浏览器打开 `/docs`。

如果 Docker 跑在 WSL、浏览器在 Windows：先在 Ubuntu 里 curl 成功。Windows 仍打不开时，用 `wsl hostname -I` 的地址访问。

---

## 最终镜像怎么用（本次真实可用的部分）

构建目录里需要：

- `vendor/trufor_src/trufor_test.py`
- `TruFor_weights.zip`

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

`score` 越接近 1，TruFor 越倾向「整图异常」。它**不是**鉴定书上的真/假。本次样例约 `0.25`，只能读成模型不太像整图伪造，不能读成「图一定是真的」。

有 GPU 且显存够时：`.env` 里 `TRUFOR_GPU=0`，再用

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

`.env` 告诉 Python 用 GPU 0；gpu 叠加文件告诉 Docker 把显卡塞进容器。两件事缺一不可。本机 2GB 显存不够，不要在这台 1050 上强行 GPU。

---

## 相关知识点（从这次翻车展开）

### 构建期网络 ≠ 运行期网络

`docker build` 的 `RUN git clone` / `RUN wget` 发生在**构建容器**里，走的是当时的 DNS、TLS、对端稳定性。镜像一旦打好，运行时不再访问 GitHub 和权重站——前提是你已经 COPY 进去了。把大文件、源码尽量变成构建上下文，是国内网络下最稳的一招。

### `EXPOSE` 不是端口映射

| 写法 | 实际效果 |
|------|----------|
| `EXPOSE 8088` | 文档/元数据，`docker ps` 可能显示 `8088/tcp` |
| `docker run -p 8088:8088` | 宿主机 8088 → 容器 8088 |
| Compose `ports:` | 等价于 `-p`，必须走 compose up |

进程在容器内监听 `0.0.0.0:8088`，只说明容器**内部**通。浏览器访问的是宿主机的 `127.0.0.1`。

### Compose 变量默认值

`${VAR:-default}` 里，`:-` 后面整段都是默认值。CPU 设备号是 `-1`，必须写成 `:--1`，否则 `-1` 被拆成「默认值 `1`」。

### 官方批处理镜像 vs 交付用服务镜像

官方 `test_docker`：入口是 `trufor_test.py`，读 `/data` 写 `/data_out`，跑完退出。  
交付镜像：入口换成长期进程，官方 CLI 变成子进程。模型没变，产品形态变了。

---

## 可复用经验

以后再把「GitHub 上的模型 + 官网站点上下的权重」打进镜像，可以按这个顺序想：

1. **先确认构建机 DNS 和 registry 加速都活着**，再怪 Dockerfile。
2. **能 COPY 的不要在 RUN 里从 GitHub 拉。** clone 失败成本是十几分钟；按文件 vendor 源码通常几秒。
3. **大权重预下载进构建上下文**，用 `test -f` 校验解压结果。
4. **镜像构建成功 ≠ 服务可调用。** 看 `docker ps` 的 PORTS 有没有 `->`，不要只看容器 Up 和容器内日志。
5. **GPU 是运行时问题。** `docker compose build` 不需要 GPU；`up` 才需要 Toolkit 和 `TRUFOR_GPU=0`。

这次做到的终点：镜像能构建、带端口能调 `/v1/detect`、能拿到 TruFor 的 score 和两张图。ELA / JPEG 通道、以及业务上的「是否伪造」布尔值，都还没进这个镜像。
