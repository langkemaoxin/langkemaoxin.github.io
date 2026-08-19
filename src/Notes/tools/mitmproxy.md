---
title: "mitmproxy——从看见一条明文，滚到改流量、造假后端"
sidebarGroup: "工具"
shortTitle: "mitmproxy"
order: 2
date: 2026-08-19
category: "笔记"
tag:
  - "mitmproxy"
  - "网络代理"
  - "HTTP"
description: 从安装 mitmproxy 开始，每次只加一个因素：明文抓包、HTTPS 证书、Web 界面、map-local 改响应、addon 脚本、录制回放，像滚雪球一样学会看流量和改流量。
---

> **代理抓包系列 · 第 2/4 篇**
> 上一篇：[《Proxifier——让不认代理的程序也走代理》](/Notes/tools/proxifier) · 下一篇：[《mitmweb——在浏览器里点着用 mitmproxy》](/Notes/tools/mitmweb)

---

## 开头：想看看它到底发了什么，可流量是黑的

三个都真发生过的场景：

- 一个第三方客户端出了问题，想知道它到底**往哪发了什么请求**——curl 有 `-v` 看自己，浏览器有 F12 看自己，它什么都没有；
- 后端接口还没上线，前端想先联调，需要**凭空造一个响应**；
- 想验证客户端对某个异常响应（403、超长 body、特定头）的处理，但**服务端不肯配合演**。

根因一句话：HTTP 明文本可以直接看，但 **HTTPS 把内容锁进了 TLS 隧道**，路上任何人（包括普通代理）都只见密文。要看、要改，就得站在中间，**对客户端冒充服务器、对服务器冒充客户端，两头各握一次手**——这正是名字里 Man-In-The-Middle 的含义。mitmproxy 就是把这套「合法的中间人」做成了开箱即用的代理（官方定位：HTTP/1、HTTP/2、WebSockets 的 SSL/TLS 拦截代理）。

它和[上一篇的 Proxifier](/Notes/tools/proxifier) 是天然搭档：**Proxifier 负责「把程序的流量押送到代理」，mitmproxy 负责「代理里打开看、随手改」**。本篇先单练 mitmproxy，联动放章末。

本篇不先背概念。实验从头到尾只有一条故事：**先把工具装上，再让一条 curl 的请求「被看见」，再「被改掉」，最后「被凭空造出来」**。环境指纹（文中输出均来自本机实跑，mitmweb 界面部分为操作手册）：

- Windows 10 Enterprise LTSC 2021（10.0.19044）+ Git Bash（MSYS）
- mitmproxy **12.2.3**（PyPI 当前最新版，2026-05-12 发布；本篇主路径 `pip install mitmproxy`，Python 3.14.3 / OpenSSL 4.0.0）
- Windows 自带 curl 8.21.0（注意：TLS 走 **schannel**，本篇好几个坑源于它）

实验目录固定在 `~/mitm-lab`，全部命令都在 Git Bash 里跑。官方入口：[安装说明](https://docs.mitmproxy.org/stable/overview/installation/)、[文档首页](https://docs.mitmproxy.org/stable/)、[下载页](https://mitmproxy.org/downloads/)。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **0** | pip / 安装包装上 mitmproxy | `mitmdump --version` 打出 12.x；命令在 PATH 里 |
| **1** | mitmdump + 一条 curl | HTTP 明文请求/响应直接打印在日志里 |
| **2** | HTTPS（CONNECT 隧道） | 先死在证书上（exit 35/60）；认了 mitmproxy 的 CA 后明文可见 |
| **3** | mitmweb（尝一口） | 一个进程两个端口；界面里看见 flow（深挖见下一篇） |
| **4** | `--map-local` / `--modify-headers` | curl 要 hi.txt 却拿到假文件；请求头里的 UA 被删 |
| **5** | 一个 8 行的 addon 脚本 | 每个响应自动多一个头、正文自动追加一行 |
| **6** 🧗 | `-w` 录制 + `--server-replay` | 后端已死，curl 仍拿到录好的响应 |

---

## 雪球 0：装上 mitmproxy——先让三个命令出现在 PATH

还没代理、没流量，这一球只做一件事：**本机能打出 `mitmdump`**。装完立刻用 `--version` 验收，别装完不知道有没有装上。

**路径 A（本篇主路径，本机实跑）**：有 Python ≥ 3.12 时，一条 pip 就够：

```bash
pip install mitmproxy
mitmdump --version
```

本机实拍：

```text
Mitmproxy: 12.2.3
Python:    3.14.3
OpenSSL:   OpenSSL 4.0.0 14 Apr 2026
Platform:  Windows-10-10.0.19044-SP0
```

再确认命令落在哪（PowerShell / cmd）：

```powershell
where.exe mitmdump
```

本机：`C:\Users\chengongyi\AppData\Local\Programs\Python\Python314\Scripts\mitmdump.exe`。装上的其实是**同一引擎三个壳**：`mitmproxy`（终端全屏）、`mitmweb`（浏览器界面）、`mitmdump`（纯命令行）。本篇主线用 `mitmdump`，雪球 3 才切到 `mitmweb`。

**路径 B（官方对 Windows 的推荐）**：去 [mitmproxy.org/downloads](https://mitmproxy.org/downloads/) 下安装包，装完三个命令进 PATH。独立二进制也能用，但冷启动更慢。官方还建议装 [Windows Terminal](https://aka.ms/terminal)，`mitmproxy` 那个 TUI 界面渲染会舒服很多。

其它平台一笔带过（细节以官方安装页为准）：

| 平台 | 常用装法 |
|------|----------|
| macOS | `brew install --cask mitmproxy` |
| Linux | 官网独立二进制（发行版包常落后） |
| 任意有 uv 的环境 | `uv tool install mitmproxy` |

首次真正跑起代理时，mitmproxy 会在 `~/.mitmproxy/` 生成自签 CA——**这一球先知道目录会冒出来**；要不要信任它、HTTPS 怎么解开，整件事留给雪球 2。

装好了。下一球开始：起代理，让一条 curl 的明文请求出现在日志里。

---

## 雪球 1：mitmdump + 一条 curl——三分钟看见明文

雪球 0 已经装好。先不碰 HTTPS。两个终端，一个当「被观测的程序」，一个当「眼睛」。

准备实验目录和靶子文件（一个普通的 HTTP 文件服务器当后端）：

```bash
mkdir -p ~/mitm-lab && cd ~/mitm-lab
echo "hello mitmproxy" > hi.txt
echo "THIS IS FAKE CONTENT from map-local" > fake.txt   # 雪球 4 要用

# 终端 1：后端，监听 18081
python -m http.server 18081

# 终端 2：mitmproxy，监听 18080
#（8080 是它的默认端口，但常被别的程序占用——比如本机就有一个，
# 所以直接用 -p 指定一个干净的端口，这也是日常习惯）
mitmdump -p 18080
```

`mitmdump` 是 mitmproxy 的纯命令行版本，官方类比「HTTP 版的 tcpdump」——只打日志，没有界面。然后让 curl 把请求交给它（`-x` 指定 HTTP 代理）：

```bash
curl -x http://127.0.0.1:18080 http://127.0.0.1:18081/hi.txt
```

curl 侧输出 `hello mitmproxy`（一切如常，它不知道有人在看），mitmdump 侧同步打印（本机实拍）：

```text
[11:27:58.112] HTTP(S) proxy listening at *:18080.
[11:28:01.091][127.0.0.1:23536] client connect
[11:28:01.096][127.0.0.1:23536] server connect 127.0.0.1:18081
127.0.0.1:23536: GET http://127.0.0.1:18081/hi.txt HTTP/1.1
     << HTTP/1.0 200 OK 16b
```

逐行解读——这五行就是 mitmproxy 的世界观：

- `listening at *:18080`：代理就绪，等程序把流量送来；
- `client connect`：curl 和代理建立了 TCP；
- `server connect 127.0.0.1:18081`：代理以**自己的名义**去连了真正的后端——注意，是 mitmproxy 连的，不是 curl 连的；
- `GET http://...hi.txt HTTP/1.1`：**明文请求行**，URL、方法、版本一目了然；
- `<< HTTP/1.0 200 OK 16b`：**明文响应**，16b = 16 字节，正是 `hello mitmproxy\n` 的长度。

刚冒出来的「flow（流）」这个词钉成小模型：**一次 请求→响应 的完整往返记作一个 flow**，mitmproxy 的一切功能（看、改、录、放）都以 flow 为单位。

此刻的 mitmdump 只是个**普通 HTTP 代理**：它转发 HTTP，也顺便把明文给你看。那 HTTPS 呢？

---

## 雪球 2：加上 HTTPS——先死在证书上，认了 CA 复活

换个真站点，通过代理走 HTTPS：

```bash
curl -x http://127.0.0.1:18080 https://www.baidu.com -o /dev/null
```

curl 一句话回绝（本机实拍，退出码 35）：

```text
curl: (35) schannel: next InitializeSecurityContext failed:
CRYPT_E_REVOCATION_OFFLINE (0x80092013) - 这个 revocation 功能
无法检查吊销，因为吊销服务器处于脱机状态
```

而 mitmdump 侧的日志替你说出了真相（本机实拍）：

```text
[11:30:12.707][127.0.0.1:25544] server connect www.baidu.com:443 (183.2.172.177:443)
[11:30:13.814][127.0.0.1:25544] Client TLS handshake failed. The client disconnected
during the handshake. If this happens consistently for www.baidu.com, this may
indicate that the client does not trust the proxy's certificate.
```

`does not trust the proxy's certificate`——**代理的证书**？哪来的代理证书？这就是本篇最核心的一张图，值得停下来看清：

```text
普通 HTTPS 代理（只挖隧道）：            mitmproxy（真的站在中间）：

curl ──CONNECT baidu:443──▶ 代理          curl ──CONNECT baidu:443──▶ mitmproxy
curl ◀──── 200 隧道挖好 ──── 代理          curl ◀──── 200 隧道挖好 ──── mitmproxy
  │                                            │
  │  隧道里是 curl↔baidu 的 TLS，                │  mitmproxy 回给 curl 一张
  │  代理只见密文，看不见内容                     │  「伪造的 baidu 证书」（用它自己的 CA 签的）
  ▼                                            ▼
baidu                                      curl ⇄ mitmproxy：TLS①（伪证书）明文可见
                                           mitmproxy ⇄ baidu：TLS②（真握手）明文可见
```

「中间人」三个字落到实处：**mitmproxy 首次启动时生成了一对自签 CA（存在 `~/.mitmproxy/`），此后对每个 HTTPS 站点现场签一张假证书发给客户端**。客户端信不信这张假证书，就是本球剩下要解决的事。

先拆掉 Windows curl 特有的一层墙：上面那个 `CRYPT_E_REVOCATION_OFFLINE` 是 **schannel 在线检查证书吊销**失败（假证书当然没有吊销服务器可查），还没轮到「信不信」。加 `--ssl-no-revoke` 跳过吊销检查，把真正的矛盾暴露出来：

```bash
curl -x http://127.0.0.1:18080 --ssl-no-revoke https://www.baidu.com -o /dev/null
```

本机这台「老熟人」直接通了（exit 0）——因为它**系统信任库里早就装过 mitmproxy 的 CA**（雪球 2 末尾验证）。换一台干净机器，这一步会报 `curl: (60) SSL certificate problem`，然后就需要下面这步——**把 mitmproxy 的 CA 告诉 curl**：

```bash
curl -x http://127.0.0.1:18080 --ssl-no-revoke \
     --cacert "$USERPROFILE/.mitmproxy/mitmproxy-ca-cert.pem" \
     https://www.baidu.com -o /dev/null -w "HTTP %{http_code}, time %{time_total}s\n"
```

本机实拍：

```text
HTTP 200, time 0.160318s
```

mitmdump 侧（本机实拍，注意已经能看见 HTTPS 里的**明文**了）：

```text
[11:30:35.909][127.0.0.1:25894] server connect www.baidu.com:443 (183.2.172.177:443)
127.0.0.1:25894: GET https://www.baidu.com/
              << 200 OK 2.4k
```

验证一下「本机为什么免装」（PowerShell，本机实拍）：

```powershell
Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root |
  Where-Object {$_.Subject -like '*mitmproxy*'}
```

```text
Subject      : O=mitmproxy, CN=mitmproxy
NotAfter     : 2036/8/16 18:59:59
PSParentPath : ...Certificate::LocalMachine\Root

Subject      : O=mitmproxy, CN=mitmproxy
NotAfter     : 2036/8/7 21:53:15
PSParentPath : ...Certificate::CurrentUser\Root
```

两条**到期日不同**的 mitmproxy CA——说明这台机器的 CA 被生成过不止一次。这埋着一个真实的坑：`~/.mitmproxy/` 目录删掉重生成后，**系统信任库里的旧 CA 就作废了**，浏览器会重新报证书错误，得把新 CA 再导一次。给不同客户端装 CA，用哪个文件：

| 文件（在 `~/.mitmproxy/`） | 给谁用 |
|---------------------------|--------|
| `mitmproxy-ca-cert.pem` | curl `--cacert`、Linux/macOS |
| `mitmproxy-ca-cert.cer` | Windows 证书库（双击导入「受信任的根证书颁发机构」） |
| `mitmproxy-ca-cert.p12` | macOS 钥匙串、部分要求 PKCS#12 的场景 |

一句话总结这一球：**HTTPS 不是看不见，是「信不过中间人」；把 mitmproxy 的 CA 变成自己人，隧道两头就都透明了**。

---

## 雪球 3：加上 mitmweb——把流量列表搬进浏览器

`mitmdump` 是纯文本账本，看得见但不方便翻。`mitmweb` 是同一引擎的 Web 界面版——**这一球只尝一口**；门禁 token、流解剖、筛选、拦截手改、导出整套点法，滚到[下一篇《mitmweb》](/Notes/tools/mitmweb)。

```bash
mitmweb --set web_open_browser=false --web-port 18099 -p 18080
```

（`web_open_browser=false` 是让它别自动弹浏览器；不加 `--web-port` 默认 Web 界面在 8081。）

本机实拍——**一个进程，两个身份**：

```text
TCP    0.0.0.0:18080     LISTENING   （代理口，程序把流量送到这）
TCP    127.0.0.1:18099   LISTENING   （Web 界面口，只绑本机回环）
```

浏览器打开 `http://127.0.0.1:18099`（若先吃到 403，带上启动日志里的 token，见下一篇雪球 1），再产生一条流量：

```bash
curl -x http://127.0.0.1:18080 http://127.0.0.1:18081/hi.txt
```

左侧流列表就会多出一行。这一球只要看见：**代理口收流量，界面口给人点**。三兄弟（雪球 0）里日常翻流量用 mitmweb，命令行改流量继续用 mitmdump——下一球立刻回到 mitmdump。

---

## 雪球 4：加上 map-local / modify-headers——不写代码改流量

回到 mitmdump。这次不是看，是改。两件事：把某个 URL 的响应**偷换成本地文件**，把请求头**删掉一个**：

```bash
mitmdump -p 18080 \
  --map-local '|/hi\.txt|C:/Users/chengongyi/mitm-lab/fake.txt' \
  --modify-headers '/User-Agent/' \
  --set flow_detail=3
```

三个参数一个一个说（语法都来自本机 `mitmdump --options` 的权威注释）：

- `--map-local`：格式 `[/flow-filter]/url-regex/file`。这里没写 filter（对所有 flow 生效），URL 正则 `/hi\.txt`，命中就读本地 `fake.txt` 当响应；
- `--modify-headers`：格式 `[/flow-filter]/header-name/value`，**value 留空 = 删除该头**。所以 `/User-Agent/` 的意思不是「设置空 UA」，而是「把 UA 头删掉」；
- `--set flow_detail=3`：日志详细度调到 3，**连请求/响应头都打印**——上一球只看到请求行，这一球要看头，所以加它。

验证（curl 特意自带一个花哨 UA）：

```bash
curl -x http://127.0.0.1:18080 -A "my-custom-ua/1.0" http://127.0.0.1:18081/hi.txt
```

本机实拍——**要的是 hi.txt，拿到的是 fake.txt 的内容**：

```text
THIS IS FAKE CONTENT from map-local
```

mitmdump 日志（本机实拍）藏着两个关键证据：

```text
[11:32:53.610][127.0.0.1:26611] client connect
127.0.0.1:26611: GET http://127.0.0.1:18081/hi.txt
    Host: 127.0.0.1:18081
    Accept: */*
    Proxy-Connection: Keep-Alive

 << 200 OK 36b
    Server: mitmproxy 12.2.3
    Content-Type: text/plain
    content-length: 36
```

- 请求头里**没有 `User-Agent`**——`my-custom-ua/1.0` 被 `/User-Agent/` 删了，后端永远看不到它；
- 对比雪球 1：日志里**没有 `server connect`**——请求根本没去后端，mitmproxy 在代理层直接短路回了本地文件（响应头 `Server: mitmproxy 12.2.3` 也是它自己签的）。36b 正是 fake.txt 的大小。

这一球在真实世界里叫「**联调时把某个接口 mock 成本地 JSON**」——后端没好，前端先把响应文件备好，`--map-local` 一指，客户端毫无感知。

两个血泪坑，都是本机踩出来的原样报错：

**坑 1（版本语法）**：网上老教程写 `--modify-headers '~q-User-Agent'`（旧版的 flow 前缀语法），v12 直接拒绝：

```text
Cannot parse modify_headers option ~q-User-Agent:
Invalid number of parameters (2 or 3 are expected)
```

v12 只认上面的 `/header-name/value` 格式。**学 mitmproxy 参数语法，第一信源永远是 `mitmdump --options`**——每个选项自带注释，比搜来的教程新。

**坑 2（Git Bash 路径改写）**：同一个命令第一次跑，报的是这个：

```text
Cannot parse map_local option |C:\Program Files\Git\hi\.txt|C;C:\Program Files\Git\Users\...:
Invalid regular expression 'C:\\Program Files\\Git\\hi\\.txt' (bad escape \P at position 2)
```

`/hi\.txt` 好好的一条正则，变成了 `C:\Program Files\Git\hi\.txt`——**Git Bash（MSYS）会把「像 POSIX 路径」的参数自动转换成 Windows 路径**。解法是命令前加 `MSYS_NO_PATHCONV=1`（PowerShell/cmd 里跑则无此坑）：

```bash
MSYS_NO_PATHCONV=1 mitmdump -p 18080 --map-local '|/hi\.txt|C:/.../fake.txt' ...
```

**坑 3（日志缓冲）**：把 mitmdump 日志重定向进文件（`> mitm.log`），跑的时候 `cat` 是空的，**kill 进程后内容才哗啦一下出来**——Python 对文件是块缓冲。别被「日志是空的」骗了，进程八成活得好好的；日常直接开个独立终端跑它最省心。

---

## 雪球 5：加上一个 addon 脚本——把「改」写成代码

`--map-local` 能换文件，但要「给所有响应加个标记头」「body 里做正则替换」「按逻辑动态决定改不改」，命令行参数就不够了。mitmproxy 的答案是 **addon 脚本**：一个普通 Python 文件，mitmproxy 在每个事件上回调你的函数。

`~/mitm-lab/addon.py`，完整可抄，就 8 行：

```python
from mitmproxy import http


def response(flow: http.HTTPFlow) -> None:
    """每个响应经过时：加一个响应头，正文末尾追加一行标记。"""
    flow.response.headers["X-Mitm-Addon"] = "yes"
    flow.response.text += "\n[seen by addon]"
```

`response` 是钩子名——**每个 flow 拿到响应时**被调用一次，参数就是这个 flow 对象。启动时挂上脚本：

```bash
mitmdump -p 18080 -s addon.py
```

验证：

```bash
curl -si -x http://127.0.0.1:18080 http://127.0.0.1:18081/hi.txt
```

本机实拍：

```text
HTTP/1.0 200 OK
Server: SimpleHTTP/0.6 Python/3.11.15
Content-type: text/plain
Content-Length: 32
X-Mitm-Addon: yes

hello mitmproxy

[seen by addon]
```

三处解读：

- 响应头多了 `X-Mitm-Addon: yes`——mitmdump 启动日志也有一行 `Loading script addon.py` 为证；
- 正文末尾多了 `[seen by addon]`；
- `Content-Length: 32`——原文 16 字节 + 追加 16 字节，**mitmproxy 自动重算了长度**，改 body 不用手动对账。

这就是 mitmproxy 的「编程接口」本质：**flow 在管道里流的每个环节（`request`、`response`、`error`……）都是可挂载的钩子**。命令行参数（雪球 4）是官方预制的一小撮常用钩子，addon 脚本是完全体。往深走的方向：`request` 钩子改请求、`ctx.log` 打日志、`load` 钩子读配置——官方文档的 **Events** 一节是完整清单。

---

## 雪球 6 🧗：加上录制与回放——把后端装进口袋

最后一球，两个新参数，效果像魔术。

**第一步：录制。**`-w` 把每个 flow 原样写进文件：

```bash
mitmdump -p 18080 -w flows.mitm
# 另一个终端，产生两条流量：
curl -x http://127.0.0.1:18080 http://127.0.0.1:18081/hi.txt
curl -x http://127.0.0.1:18080 http://127.0.0.1:18081/fake.txt
```

curl 正常拿到两个文件的内容。`ls -la flows.mitm` 显示 3885 字节——**两个 flow 连头带体全被存下来了**。

**第二步：杀死后端。**把 `http.server`（18081）和 mitmdump 全关掉，`netstat` 确认（本机实拍）：

```text
18080/18081 both dead
```

**第三步：回放。**只起 mitmdump，这次不当代理，当「录像机倒带」：

```bash
mitmdump -p 18080 --server-replay flows.mitm
```

对着一具后端尸体再请求（本机实拍）：

```bash
curl -x http://127.0.0.1:18080 http://127.0.0.1:18081/hi.txt
```

```text
hello mitmproxy
```

**后端死了，响应还活着。**mitmdump 日志里的 `[replay]` 前缀是铁证（本机实拍）：

```text
127.0.0.1:27113: GET http://127.0.0.1:18081/hi.txt HTTP/1.1
[replay] << HTTP/1.0 200 OK 16b
```

顺手验证边界：请求一个**没录过**的路径：

```bash
curl -x http://127.0.0.1:18080 http://127.0.0.1:18081/not-recorded.txt
# (exit code 7)
```

退出码 7（连接失败）——mitmproxy 想真转发到已死的 18081，失败。**回放只回答录过的问题**，没录过的照常走正常代理逻辑。

这一球的现实用途：把生产环境一段真实交互录下来，离线重放复现 bug；给客户端测试造一个「永远同一响应」的假后端；压测时把后端换成录像，只测客户端自身的表现。

---

## 章末

### 怎么记

| 你记住的 | 它长在哪一球 |
|----------|--------------|
| `pip install` / 安装包 → `mitmdump --version` 验收；三兄弟同引擎 | 雪球 0 |
| flow = 一次请求→响应往返；mitmproxy 一切以 flow 为单位 | 雪球 1 的五行日志 |
| 普通代理只挖隧道（密文），mitmproxy 两头握手（全明文） | 雪球 2 的对照图 |
| 信任根：`--cacert`（curl）/ 导入 CA（系统/浏览器） | 雪球 2 的 35→60→200 三连 |
| 三兄弟同引擎；mitmweb = 代理口 + 界面口（深挖见专篇） | 雪球 0、3 |
| map-local 短路响应、modify-headers 空值删头、`--options` 是语法权威 | 雪球 4 |
| addon = 事件钩子上的 Python 函数；Content-Length 自动重算 | 雪球 5 |
| `-w` 录 flow，`--server-replay` 原样倒带 | 雪球 6 的 `[replay]` |

### 版本事实与历史包袱

- 本机 12.2.3 = PyPI 当前最新（2026-05-12）；要求 Python ≥ 3.12，Windows/macOS/Linux 三平台。Windows 也可用官网安装包（雪球 0 路径 B）。
- `--modify-headers` 的旧语法 `~q-Header` 在 v12 已不可用（本机报错原样收录在雪球 4）——老教程迁移时注意。
- mitmproxy 默认端口 8080，mitmweb 界面默认 8081；被占就用 `-p` / `--web-port`。
- 三个 Windows 专属坑都踩在雪球 2/4：schannel 吊销检查（`--ssl-no-revoke`）、MSYS 路径改写（`MSYS_NO_PATHCONV=1`）、Python 块缓冲（日志 kill 后才落盘）。

### 和其它篇的关系

本系列：[Proxifier](/Notes/tools/proxifier)（押送）→ **本篇（开膛）** → [mitmweb](/Notes/tools/mitmweb)（点着用）→ [微信 MMTLS](/Notes/tools/wechat-mmtls)（边界）。

- [《Proxifier》](/Notes/tools/proxifier)：**联动是这个系列的完全体**。curl 认 `-x`，黑盒程序不认。可照抄步骤：
  1. 按本篇起代理：`mitmdump -p 18080`（或下一篇的 `mitmweb ... -p 18080`）；
  2. Proxifier → `Profile → Proxy Servers` 登记：`Address 127.0.0.1`、`Port 18080`、`Protocol HTTP`；
  3. `Profile → Proxification Rules` 新建规则：目标程序 → Action = 刚登记的那个代理；
  4. 目标若走 HTTPS，须信任 mitmproxy 的 CA（本篇雪球 2 的 `.cer` / `.pem`）。
  押送来的流量就进了玻璃管；在 mitmweb 里点开看，效果一样。
- [《mitmweb》](/Notes/tools/mitmweb)：雪球 3 尝过的 Web 壳，专篇把看、筛、改、放在浏览器里滚完。
- [《微信 MMTLS》](/Notes/tools/wechat-mmtls)：工具箱齐了仍抓不到微信时，读这篇——系列收官。
- [《netns 与 iptables》](/Linux/basics/linux-05-netns-iptables)：Linux 侧「不改程序改流量」的另一种实现（重定向/透明代理），思路同源。

### 小结与思考题

雪球滚完：装上工具（0）→ 明文可见（1）→ HTTPS 解锁（2）→ 界面翻阅（3）→ 命令行改流量（4）→ 脚本改流量（5）→ 录制回放（6）。一句话收拢：**mitmproxy 把「流量」变成了可看、可改、可存、可放的一等公民。**

思考题：

1. 雪球 4 的日志里为什么没有 `server connect`？这个特性让 `--map-local` 天然适合做什么？（提示：后端根本没被吵醒）
2. 手机 App 想走 mitmproxy 抓包，需要几步？（Wi-Fi 手动代理指到电脑 IP:8080 + 手机装 mitmproxy CA；Android 7+ 应用默认不信任用户装的 CA，需要 root 或应用开放调试——本篇环境指纹之外的延伸，官方文档 *How mitmproxy works* 与 Android 文档有权威说明）
3. `--server-replay` 模式下，把磁盘上的 `hi.txt` 改成新内容，curl 拿到的是新的还是旧的？为什么？（提示：录的是什么，放的才是什么）

### 参考资料

- 官方文档（stable）：[docs.mitmproxy.org](https://docs.mitmproxy.org/stable/)——重点章 *Overview*、*Options*（即 `mitmdump --options`）、*API Events*
- 发布与版本：[PyPI mitmproxy](https://pypi.org/project/mitmproxy/)（2026-08 查证：12.2.3 / 2026-05-12）
- 本机版本指纹：mitmproxy 12.2.3 + Python 3.14.3 + OpenSSL 4.0.0（`mitmdump --version`）、curl 8.21.0 (schannel)、Windows 10 LTSC 19044、Git Bash (MSYS)
