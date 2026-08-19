---
title: "mitmweb——在浏览器里点着用 mitmproxy"
sidebarGroup: "工具"
shortTitle: "mitmweb"
order: 3
date: 2026-08-19
category: "笔记"
tag:
  - "mitmweb"
  - "mitmproxy"
  - "网络代理"
description: 从一次被 403 挡在门外的访问开始，每次只加一个因素：登录、流解剖、筛选表达式、拦截手改、重放导出、离线回看，像滚雪球一样学会 mitmweb。
---

> **代理抓包系列 · 第 3/4 篇**
> 上一篇：[《mitmproxy——从看见一条明文，滚到改流量、造假后端》](/Notes/tools/mitmproxy) · 下一篇：[《微信 MMTLS——抓包工具看不见的那条 80 端口连接》](/Notes/tools/wechat-mmtls)

---

## 开头：命令行账本滚得太快，手跟不上眼

[上一篇](/Notes/tools/mitmproxy)用 mitmdump 把流量看、改、录、放全干了一遍，但全是命令行手艺：

- 日志哗哗滚动，想回看第三条请求得往上翻半天；
- 改流量要记 `--map-local` 的正则语法，改一次起一次进程；
- 抓了一段包想给同事看，只能贴终端截图，零碎还失色。

**mitmweb** 就是同一引擎换了张皮：浏览器打开一个页面，流量变成**可点开的列表**，看、筛、改、放全是点击。官方对它的定位值得先记两句话：**交互式检查和修改 HTTP 流量**；**所有 flow 都存在内存里，适合小批量样本**（拿它当长期抓包仓库是不对的用法）。

根因一句话：mitmdump 的输出是「日志流」，而 mitmweb 的本质是**把每个 flow 存成结构化数据，再用网页渲染出来**——本篇会多次用它的 HTTP API 实拍证明这一点：你在页面上看到的每一行，背后就是一条 JSON。

本篇不先背概念。故事还是同一条：**上一篇用命令行干过的看、筛、改、放，这次全在浏览器里点出来一遍**。靶子也还是老三样（`~/mitm-lab` 的 http.server:18081 + hi.txt），环境指纹不变：Windows 10 LTSC + Git Bash + mitmproxy **12.2.3**（PyPI 当前最新）+ Windows curl 8.21.0。前置阅读就是[上一篇](/Notes/tools/mitmproxy)（flow、CA、`-x`、以及雪球 3 尝过的两端口，本篇不再重讲安装）。

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 一次带密码的进门 | 先被 403 挡在门外，`?token=` 一进，浏览器看到流列表 |
| **2** | 点开一条流 | 请求 / 响应 / 连接三段解剖，JSON 真身实拍 |
| **3** | 筛选表达式 | 千条流量里只留想要的（`~u` `~m` `~c` 一套语言） |
| **4** | 拦截与手改 | 请求停在半路，改完再放行 |
| **5** | 重放与导出 | 一条流反复发、存成文件带走 |
| **6** 🧗 | 离线回看与远程访问 | 不产生新流量翻旧账；在 WSL/虚机里跑、宿主机浏览器看 |

---

## 雪球 1：进门——先吃一个 403，再递上 token

老规矩起服务（`web_open_browser=false` 是让它别自己弹浏览器，方便手动控制）：

```bash
cd ~/mitm-lab
python -m http.server 18081          # 终端 1：靶子
mitmweb --set web_open_browser=false --web-port 18099 -p 18080   # 终端 2
```

上一篇这里直接说「浏览器打开 127.0.0.1:18099 就行」，本篇偏要先用 curl 摸一下门（本机实拍）：

```bash
curl -s -w "[HTTP %{http_code}]" http://127.0.0.1:18099/
```

```text
[HTTP 403]
```

**403 Forbidden**——什么都没干就被拒了。这不是坏掉，而是 v12 的一层安全设计，权威出处是本机 `mitmweb --options` 里 `web_password` 选项的自带注释：

> If no password is provided, a random token is generated on startup. For automated calls, you can pass the password as token query parameter or as `Authorization: Bearer ...` header.

翻译成模型钉在墙上：

```text
mitmweb 的门禁：
  没设 web_password → 启动时随机生成一个 token（打印在启动日志里）
  设了 web_password → 它就是 token
  进门两种方式：  ?token=<密码>  或  Authorization: Bearer <密码>
  进过一次 → 发签名 Cookie（400 天，SameSite=Strict），之后免票
```

（源码 `tools/web/app.py` 里还能看到第二道锁：非 GET 请求若带 `Sec-Fetch-Site` 且不是 same-origin，直接 403——防跨站伪造。）

所以正式的启动姿势是显式给密码：

```bash
mitmweb --set web_open_browser=false --web-port 18099 -p 18080 \
        --set web_password=lab-pass-123
```

带着 token 再摸门（本机实拍）：

```bash
curl -s "http://127.0.0.1:18099/flows.json?token=lab-pass-123" | head -c 400
```

```text
[{"id": "f70b2be4-a698-4d7d-8d84-281d2c48f05d", "intercepted": false,
"is_replay": null, "type": "http", "modified": false, ...
```

进了。浏览器那边同理：直接访问 `http://127.0.0.1:18099`，登录时输入你设的密码即可（或直接访问带 `?token=` 的地址）。

手动开代理产生一条流量（`curl -x http://127.0.0.1:18080 http://127.0.0.1:18081/hi.txt`），浏览器里流列表随即多出这一行——**这行的数据源就是刚才那份 JSON**。

顺手看两个兄弟端点（都带 token，本机实拍）：

- `/events.json` —— mitmweb 自己的事件日志。第一条就很有教育意义：

  ```text
  Using a plaintext password to protect the mitmweb user interface.
  Consider using an argon2 hash for `web_password` instead.
  ```

  官方在提醒：明文密码会留在 shell 历史和进程列表里，讲究一点就给 argon2 哈希值而不是明文。

- `/options.json` —— 所有选项的 JSON 形态（界面里改选项的本质就是改这份数据）。

---

## 雪球 2：点开一条流——它到底由什么构成

浏览器里点开一条流（界面操作手册）：左侧流列表选中一行，右侧分成几个标签页看细节：

- **Request**：方法、URL、请求头、请求体（有 body 才有内容可看）；
- **Response**：状态码、响应头、响应体——文本直接渲染，图片直接预览，JSON 带高亮；
- **Details/连接信息**：客户端是谁、服务端是谁、TLS 用的什么套件。

界面是皮，JSON 是骨。用 API 把这条流的「骨」原样拿出来看（本机实拍，字段按 `sorted` 排列）：

```text
flow 顶层键：['client_conn', 'comment', 'id', 'intercepted', 'is_replay',
 'marked', 'modified', 'request', 'response', 'server_conn',
 'timestamp_created', 'type']

request 键：['contentHash', 'contentLength', 'headers', 'host',
 'http_version', 'method', 'path', 'port', 'pretty_host', 'scheme',
 'timestamp_end', 'timestamp_start']
```

逐段解读，正好是 mitmproxy 世界里一个 flow 的完整解剖：

| 字段组 | 装的是什么 | 对应界面上哪里 |
|--------|-----------|----------------|
| `id`（UUID）、`type: "http"` | 这条流的身份证 | 列表里的一行 |
| `request`（method/host/path/headers…） | 客户端发出的请求 | Request 标签页 |
| `response`（status_code/headers/content…） | 后端回的响应 | Response 标签页 |
| `client_conn` | **谁连进了代理**：`peername 127.0.0.1:41530 → sockname 127.0.0.1:18080` | 连接信息 |
| `server_conn` | **代理替它连了谁**：`peername 127.0.0.1:18081` | 连接信息 |
| `intercepted` / `modified` / `marked` | 被拦过？被改过？被标记过？ | 雪球 4、5 的伏笔 |

注意 `client_conn` 和 `server_conn` 这对**两头各记一份**的结构——上一篇 ASCII 图里「mitmproxy 站在中间」这件事，在数据结构上就是这两个对象：一边记录客户端↔代理的连接，一边记录代理↔服务器的连接。**中间人不是比喻，是数据模型。**

---

## 雪球 3：筛选——流量一大，列表就成了垃圾场

真实抓包几分钟就是几百条流，页面一滚到底全是噪音。mitmweb 顶部有 Filter 输入框，它吃的是 mitmproxy 全家通用的**筛选表达式**（mitmdump 里 `--map-local` 的 flow-filter、TUI 的过滤，同一套语言）。官方文档的速查表，挑日常最常用的：

| 表达式 | 匹配什么 |
|--------|----------|
| `~u regex` | URL（最常用） |
| `~d regex` | 域名 |
| `~m regex` | 请求方法（GET/POST…） |
| `~c int` | 响应状态码 |
| `~t regex` | Content-Type 头 |
| `~bq regex` / `~bs regex` | 请求体 / 响应体 |
| `~q` / `~e` | 还没有响应的流 / 出错的流 |
| `!` `&` `\|` `( )` | 非、与、或、分组 |

三条官方示例原样收录（Python 风格正则；**默认大小写不敏感**；不带操作符的裸字符串等于按 URL 匹配）：

```text
google\.com                  # URL 里带 google.com 的
~q ~b test                   # 还没响应、且请求体含 test 的
!(~q & ~t "text/html")       # 排除「无响应且 text/html」的组合
```

手册（浏览器操作）：在 Filter 框输入 `~u hi\.txt`，流列表立刻只剩 hi.txt 那一条；再换 `~c 200`，只剩成功响应。改的是**显示**，不是流量本身——被滤掉的流还在内存里，清空 Filter 全回来。

这套语言值得专门记：三个工具（mitmproxy/mitmweb/mitmdump）一处学会、处处能用，上一篇 `--map-local '|/hi\.txt|...'` 里那个 filter 位子，填的也是它。

---

## 雪球 4：拦截与手改——让请求停在半路

到这为止 mitmweb 只是「眼睛」。这一球把它变成「手」。

对照上一篇的关系先钉住：`--map-local` / `--modify-headers` 是**提前写好的规则**，启动前就要想好改什么；界面拦截是**临场手改**——看到可疑请求，拦下来，现场改，再放走。一个像 iptables 规则，一个像 debugger 断点。

手册（浏览器操作，12.2.3 界面）：

1. 点流列表上方的 **Intercept（停止图标）**，在拦截框里填筛选表达式（就用雪球 3 的语言，如 `~u hi\.txt`，留空=拦一切）；
2. 再发一次 `curl -x http://127.0.0.1:18080 http://127.0.0.1:18081/hi.txt`——curl 会**卡住不返回**，流列表里这条流的图标显示「已拦截」，`/flows.json` 里它的 `"intercepted": true`；
3. 选中这条流，在 Request/Response 标签页里直接编辑——改 URL、改头、改 body 都行；
4. 点 **Resume/放行**，改过的请求才真正发往（或继续走向）后端，curl 拿到你改过之后的响应。

两个实战提醒：

- 拦截是**全局限闸**：表达式太宽（比如留空），所有流量都会堵在半路，浏览器网页全部转圈——调试完记得关；
- 想改成「后端永远回某个假响应」，别在界面里手动拦，回上一篇用 `--map-local`，那才是干粗活的工具。**手改适合调试，规则适合自动化。**

---

## 雪球 5：重放与导出——一条流反复发、存成文件带走

界面上对着一条流还有两个高频动作（手册）：

- **Replay（重放）**：把这条**请求**原样再发一次。后端是增删改接口时慎用（等于再提交一遍）；对只读接口是免费的「重试按钮」。重放产生的流会带 `is_replay` 标记（雪球 2 的 JSON 伏笔），和原始流区分开。
- **导出**：一条流（或全选）可存成 `.flow` 文件 / HAR 等格式带走——给同事复现、贴 issue、导入别的工具（HAR 是通吃型的）。

和上一篇命令行的对照，正好收拢成一张表：

| 想干什么 | 命令行（上一篇） | 界面（本篇） |
|----------|------------------|--------------|
| 看明文 | `mitmdump` 日志 | 流列表 + Request/Response 标签 |
| 只看某类 | `--map-local` 的 filter 位 | Filter 框（同一套表达式） |
| 改流量 | `--map-local` / `--modify-headers` | Intercept 拦下手动改 |
| 改的完全体 | `-s addon.py` | （界面没有，回命令行） |
| 存流量 | `-w flows.mitm` | 导出 `.flow` / HAR |
| 重发 | `--server-replay` | Replay 按钮 |

一行结论：**规则化的找命令行，交互式的找界面。**

---

## 雪球 6 🧗：离线回看与远程访问——两个进阶姿势

**姿势一：翻旧账（`-r` 读文件）。**上一章导出的 `.flow` 文件，不用跑后端就能回看：

```bash
mitmweb -r flows.mitm -p 18080 --set web_open_browser=false \
        --web-port 18098 --set web_password=lab-pass-123
```

`-r` 让 mitmweb 启动时把文件里的流**加载进界面**。本机实拍——用 API 验证加载结果：

```text
GET http://127.0.0.1:18081/hi.txt -> 200
GET http://127.0.0.1:18081/fake.txt -> 200
```

两条录制的流原样躺在列表里，后端一个都没醒。适合：复现同事抓的包、离线分析现场流量。

踩了个真坑值得抄走：**`-r` 模式下不带 `-p`，它仍会去绑默认 8080 端口**，本机 8080 被占，直接启动失败（本机实拍报错原文）：

```text
[Errno 10048] HTTP(S) proxy failed to listen on *:8080 ...
Try specifying a different port by using `--mode regular@8082`.
```

所以 `-r` 也要带 `-p`，肌肉记忆统一掉。

**姿势二：跑在别处，看在这里。**`web_host` 默认只绑 `127.0.0.1`——只有本机能开界面。当 mitmweb 跑在 WSL、虚拟机、服务器里，宿主机/你电脑的浏览器要访问，就得：

```bash
mitmweb --set web_host=0.0.0.0 --set web_password=<强密码> ...
```

浏览器访问 `http://<那台机器的IP>:18099`。**此刻密码从「可选」变成「必须」**：0.0.0.0 意味着同网段任何人都能摸到你的流量检查器——雪球 1 那个 403 挡的就是这种场景，官方默认随机 token 也是为它兜底。

**一个实测翻车记录**（版本包袱，慎用）：`--set web_static_viewer=./viewer.html` 本意是把 flows 导出成免服务器的静态页面（`mitmweb --options` 里确实有此选项），但 12.2.3 上无论参数顺序如何，启动即崩（本机实拍报错）：

```text
Addon error: expected str, bytes or os.PathLike object, not NoneType
  File ".../mitmproxy/tools/web/static_viewer.py", line 110, in configure
    flows = io.read_flows_from_paths([ctx.options.rfile])
```

读取的 `rfile` 是 None——这个 addon 在 v12.2.3 上是坏的。替代方案就是上面的 `-r` 回看。遇到「文档里有、实测就崩」的功能，报错栈里看一眼源码位置，基本能判断是版本坑而不是自己用错。

---

## 章末

### 怎么记

| 你记住的 | 它长在哪一球 |
|----------|--------------|
| 403 = 门禁；`?token=` / `Bearer` 进门；默认随机 token | 雪球 1 的门禁模型 |
| 界面每行流 = 一条 JSON（/flows.json 是真身） | 雪球 2 的解剖表 |
| `client_conn` / `server_conn` = 中间人的两端各记一份 | 雪球 2 |
| 筛选表达式一套语言三工具通用；裸字符串 = 按 URL | 雪球 3 |
| Intercept 是断点，map-local 是规则；手改调试、规则自动化 | 雪球 4 |
| Replay 带 `is_replay` 标记；导出 .flow / HAR | 雪球 5 |
| `-r` 翻旧账也要带 `-p`；`web_host=0.0.0.0` 必配密码 | 雪球 6 |

### 版本事实与历史包袱

- mitmproxy 12.2.3（PyPI 最新，2026-05-12）自带 mitmweb；官方对 mitmweb 的定位是 **beta**：UI 已暴露的功能稳定，但「缺 mitmproxy 的很多功能」（比如 addon 脚本就别指望在界面上配）。
- 全部 flow 存内存——**mitmweb 是放大镜不是仓库**，长时间大批量抓包请用 mitmdump `-w` 落盘。
- v12 起默认随机 token + Cookie 签名 + CSRF 校验（`Sec-Fetch-Site`），远程部署的安全底线比老版本高；明文密码会被 events 日志劝退改 argon2。
- `web_static_viewer` 在 12.2.3 实测崩溃（雪球 6 原始报错），别按老文章试。
- 上一篇的坑在本篇继续生效：Git Bash 传 `/regex` 记得 `MSYS_NO_PATHCONV=1`。

### 和其它篇的关系

本系列：[Proxifier](/Notes/tools/proxifier)（押送）→ [mitmproxy](/Notes/tools/mitmproxy)（开膛）→ **本篇（点着用）** → [微信 MMTLS](/Notes/tools/wechat-mmtls)（边界）。

- [《mitmproxy》](/Notes/tools/mitmproxy)：本篇的全部概念（flow、CA、CONNECT、`-x`）来自它；雪球 5 的对照表就是两篇的缝合线。Proxifier × mitm 的联动步骤也写在它的章末。
- [《Proxifier》](/Notes/tools/proxifier)：黑盒程序的流量由 Proxifier 押送到本篇的代理口（`-p 18080`），然后你在浏览器里「看见它」。
- [《微信 MMTLS》](/Notes/tools/wechat-mmtls)：下一篇——工具箱齐了仍看不见的那条线。

### 小结与思考题

雪球滚完：进门（1）→ 解剖（2）→ 筛选（3）→ 手改（4）→ 重放导出（5）→ 离线与远程（6）。mitmweb 不是新工具，是 mitmproxy 引擎的一层皮——**看懂了那份 JSON，界面怎么改版都不怕**。

思考题：

1. 为什么 v12 默认生成随机 token，而不是像老版本那样裸奔？提示：想想 `web_host=0.0.0.0` 和浏览器里同时开着别的网页的场景。
2. `client_conn.peername` 和 `server_conn.peername` 各自指向谁？如果用 Proxifier 把流量押进 mitmweb，`client_conn.peername` 会变成什么？（提示：谁在连代理）
3. 雪球 6 的 `-r` 模式下，界面里对着录制的流按 Replay，后端必须活着吗？和上一篇 `--server-replay` 的区别在哪？

### 参考资料

- 官方文档：[mitmweb 工具页](https://docs.mitmproxy.org/stable/tools-mitmweb/)（定位与 beta 说明）、[Filter 表达式](https://docs.mitmproxy.org/stable/concepts/filters/)（完整速查表）
- 本机权威信源：`mitmweb --options`（web_password/web_host/web_static_viewer 注释）、源码 `tools/web/app.py`（认证与 CSRF 逻辑）
- 本机版本指纹：mitmproxy 12.2.3 + Python 3.14.3 + Windows 10 LTSC 19044 + Git Bash；实验端口 18080（代理）/ 18098-18099（界面）
