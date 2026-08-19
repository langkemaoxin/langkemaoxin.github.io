---
title: "Proxifier——让不认代理的程序也走代理"
sidebarGroup: "工具"
shortTitle: "Proxifier"
order: 1
date: 2026-08-19
category: "笔记"
tag:
  - "Proxifier"
  - "网络代理"
description: 从一个连不上外网的 curl 开始，每次只加一个因素：代理服务器、一条规则、规则顺序、DNS 走代理、连接列表、代理链，像滚雪球一样学会用 Proxifier。
---

> **代理抓包系列 · 第 1/4 篇**
> 下一篇：[《mitmproxy——从看见一条明文，滚到改流量、造假后端》](/Notes/tools/mitmproxy)

---

## 开头：浏览器能上，git 和 ssh 却连不上

本机开着 Clash Verge，系统代理已设置，浏览器访问 GitHub 一切正常。可一进终端：

- `git clone https://github.com/...` 卡半天，最后超时；
- `ssh -T git@github.com` 一直停在 `Connecting to github.com port 22...`；
- 某个没有代理设置的 GUI 工具，永远转圈。

同一个网络，为什么浏览器行、它们不行？

根因一句话：**「系统代理」只是一条写在 Windows 设置里的建议**——应用要主动去读这个设置才会走代理，而 Windows 自带的 `curl.exe` 只认环境变量、OpenSSH 的 `ssh` 压根没有代理选项。不读建议的程序就直接发起 TCP 直连，网络不通就死。**Proxifier** 做的事是在系统网络层拦下指定进程的 TCP 连接，替它改道到 SOCKS/HTTPS 代理——程序自己毫不知情，官方原话是「无需对软件做任何配置，整个过程完全透明」。

本篇不先背概念。实验从头到尾只有一条故事：**让一个不认代理的 `curl.exe` 走上本机 SOCKS5**，然后往这条线上滚雪球：

| 雪球 | 这一球加上去的 | 当场能看见的效果 |
|------|----------------|------------------|
| **1** | 一个 curl + 一个 SOCKS5 端口 | 看清「不认代理的程序」：直连 8 秒超时，`--socks5-hostname` 0.6 秒回 204 |
| **2** | Proxifier + 一条只管 curl.exe 的规则 | curl 什么参数都不加，也回了 204；主窗口多出这条连接 |
| **3** | 再加一条 Block 规则 | 规则从上到下第一条命中；baidu 被掐断，google 依旧通 |
| **4** | 让 DNS 也走代理（Name Resolution） | 本地解析不出的域名也能连；状态栏显示 DNS 模式 |
| **5** | 把连接列表当显微镜 | 看清哪个进程在连哪里、命中了哪条规则 |
| **6** 🧗 | 代理链 + 冗余 | 两级代理串联；一级挂了自动切二级 |

环境指纹（文中输出均来自本机实跑，GUI 操作为 4.14 界面的操作手册）：

- Windows 10 Enterprise LTSC 2021（10.0.19044）
- Proxifier Standard Edition **v4.14**（`C:\Program Files (x86)\Proxifier\`，官网当前最新版，2025.04.23 发布）
- 本机 Clash Verge（mihomo 内核）监听混合端口 `127.0.0.1:7897`——同一端口同时接受 HTTP 与 SOCKS5
- Windows 自带 curl 8.21.0

官方入口：[下载页](https://www.proxifier.com/download/)、[官方文档](https://www.proxifier.com/docs/win-v3/)（URL 里写着 win-v3，但界面与概念适用于 v4）。

---

## 雪球 1：同一个 curl 的两种命运——先看清问题长什么样

先别开 Proxifier，用 curl 自己的代理参数，把「问题」和「答案」各跑一遍。

```bash
# 直接连（什么都不加）
curl -sI --max-time 8 https://www.google.com/generate_204 -o /dev/null -w "HTTP %{http_code}, time %{time_total}s\n"

# 走本机 SOCKS5
curl -sI --max-time 10 --socks5-hostname 127.0.0.1:7897 https://www.google.com/generate_204 -o /dev/null -w "HTTP %{http_code}, time %{time_total}s\n"
```

本机输出：

```text
HTTP 000, time 8.002758s
exit code 28

HTTP 204, time 0.653918s
```

逐行解读：

- `HTTP 000`：压根没收到 HTTP 响应，连接没建立起来。`time 8.002758s` 正好顶到 `--max-time 8` 的墙。
- `exit code 28`：curl 的超时退出码。这条就是「不认代理的程序」的日常死法——不是报错，是干等到死。
- `HTTP 204`：`generate_204` 是专门用来测连通性的端点，204 No Content 表示「TCP 通了、TLS 握了、HTTP 也回了」，只差没带内容。0.65 秒。

第二条命令里唯一的变量是 `--socks5-hostname 127.0.0.1:7897`：让 curl 把整条 TCP 连接交给本机 7897 端口的 SOCKS5 代理去建。**注意 `-o /dev/null -w` 这部分只是让输出干净，与代理无关。**

这里埋一颗种子，雪球 4 会用到：curl 还有个孪生参数 `--socks5`（不带 `-hostname`）。两者只差一件事——**域名在哪一头解析**。`--socks5` 在本机把域名解析成 IP 再交给代理；`--socks5-hostname` 把域名原样塞给代理，由代理在那头解析。先记住有这回事。

问题来了：curl 是有参数的，可 `ssh` 没有代理选项，那个 GUI 工具连命令行都没有。**与其一个个改造程序，不如在程序外面统一改道**——这就是 Proxifier 存在的理由。

---

## 雪球 2：Proxifier 上场——一条规则只管 curl.exe

先把模型钉在墙上，后面所有操作都在这张图上：

```text
没有 Proxifier：
  curl.exe ──TCP──> www.google.com:443     （直连，网络不通就死）

有了 Proxifier：
  curl.exe ──TCP──> [Proxifier 在系统层拦截]
                        │ 拿这条连接去匹配规则表（从上到下）
                        ▼
                   Action 三选一：
                   ├─ Proxy SOCKS5 → 交给 127.0.0.1:7897 → 远端
                   ├─ Direct      → 原样放行（等价于没有 Proxifier）
                   └─ Block       → 掐断
```

三个名词一次冒出来，各自一句话钉死：

| 名词 | 是什么 | 在哪配 |
|------|--------|--------|
| **Proxy Server** | 一个代理服务器（地址+端口+协议） | Profile → Proxy Servers |
| **Rule（规则）** | 一张「什么连接归谁管」的匹配表 | Profile → Proxification Rules |
| **Action** | 命中规则后的处置：Proxy / Chain / Direct / Block | 规则编辑框最下面一栏 |

现在做最小配置，只加两个东西：

**第一步：登记代理服务器。** 菜单 `Profile → Proxy Servers → Add`：

- Address: `127.0.0.1`，Port: `7897`
- Protocol: `SOCKS5`（mihomo 的混合端口也认 HTTPS 协议，这里选 SOCKS5 是为了后面雪球 4 的 DNS 特性）

**第二步：建一条只管 curl.exe 的规则。** 菜单 `Profile → Proxification Rules → Add`：

- Name: `curl-test`
- Applications: `curl.exe`（只填文件名即可，官方文档明确「文件路径无关紧要」；多个用分号分隔）
- Target hosts / Target ports：**留空**——留空显示灰色的 `Any`，等于这个条件不参与匹配
- Action: `Proxy SOCKS5`

**第三步：什么都别多动。** 规则列表里那两条预置的 `Localhost` 和 `Default` 保持原样（它们是干嘛的，雪球 3 讲）。点确定，Proxifier 立即生效，不用重启任何东西。

验证——注意，这次**一个代理参数都不给**：

```bash
curl -sI --max-time 10 https://www.google.com/generate_204 -o /dev/null -w "HTTP %{http_code}, time %{time_total}s\n"
```

预期输出（照抄手册后在你机器上验证）：

```text
HTTP 204, time 1s 左右
```

和雪球 1 的直连 `000` 对比：curl 以为自己在直连 google，实际这条 TCP 被 Proxifier 拦下、按 `curl-test` 规则塞给了 7897。**curl 不知情，这就是「透明」的含义。**

同时看 Proxifier 主窗口的连接列表，会多出这样一行（各列含义）：

| 列 | 本例中的值 | 代表什么 |
|----|-----------|----------|
| Name | `curl.exe` | 发起连接的进程 |
| Target | `www.google.com:443` | 进程本来想连谁 |
| Rule | `curl-test` | 命中了哪条规则 |
| Proxy | `SOCKS5 127.0.0.1:7897` | 实际交给哪个代理 |
| Time / Speed | — | 连接时长与实时速率 |

再顺手验证一条：别的程序**完全不受影响**。比如 `curl` 换成浏览器访问国内站点、或跑 `ping www.baidu.com`，一切照旧——规则只匹配 `curl.exe`，而且 ping 走的 ICMP 根本不在 Proxifier 的管辖范围（官方文档：Proxifier 隧道化的是 **TCP 连接**）。

---

## 雪球 3：规则从上到下第一条命中——加一条 Block 就明白了

Proxifier 匹配规则的方式，官方文档一句话：**从上到下扫描，第一条命中即止**。所以规则表是有顺序的，上面赢。

先拿一条现在能通的路当靶子。国内站点直连本来就通：

```bash
curl -sI --max-time 8 https://www.baidu.com -o /dev/null -w "HTTP %{http_code}, time %{time_total}s\n"
```

本机输出：

```text
HTTP 200, time 0.140406s
```

现在在规则表里、`curl-test` **上面**插一条新规则（`Add` 后用右侧箭头按钮调顺序）：

- Name: `block-baidu`
- Applications: `curl.exe`
- Target hosts: `www.baidu.com`
- Action: `Block`

再跑同一条命令。预期效果：

- `curl https://www.baidu.com` 立刻失败（连接被掐断），Proxifier 连接列表里这条连接的 Proxy 列显示 `Blocked`；
- 而上一球的 `curl https://www.google.com/generate_204` **依旧 204**——它不匹配 `block-baidu` 的 Target，往下落到 `curl-test`，照样走代理。

同一个 `curl.exe`，两个目标，两种命运——「从上到下第一条命中」不用背，跑一遍就长在脑子里。

规则编辑框里三个条件的关系也顺手钉死（官方文档原意）：**Applications、Target hosts、Target ports 三个条件要同时满足才算命中**；哪个留空哪个就是 `Any`、不参与判断。所以 `curl-test` 那条（只填了 Applications）管的是 curl.exe 的**所有**连接。

顺便把规则表里两位「预置住户」讲清，它们不是摆设：

| 预置规则 | 作用 | 能不能动 |
|----------|------|----------|
| **Localhost** | 让本机回环连接（连 `127.0.0.1` 的）不走代理 | 可以改，但官方建议保留——Firefox 等程序依赖 loopback 连接 |
| **Default** | 所有规则都没命中时的兜底 | 规则本身不可删，只能改它的 Action（默认 Direct） |

两个对应的思考留到章末：把 Default 改成 Proxy 会怎样？Localhost 关掉会怎样？

最后一个容易踩的例外（官方文档明确警告）：通过右键 exe 文件 → 「Proxifier」命令启动的程序，**不受规则表管**，它们永远走代理。排查「为什么这程序不按规则走」时，先想想它是不是这么启动的。

---

## 雪球 4：把 DNS 也交给代理——Name Resolution

解开雪球 1 埋的种子。`--socks5` 与 `--socks5-hostname` 的区别是**域名在哪头解析**：

| 方式 | 域名谁解析 | 什么时候吃亏 |
|------|-----------|--------------|
| `--socks5` | 本机先解析成 IP，再连 | 本地 DNS 查不到、或结果被污染时，连错地方 |
| `--socks5-hostname` | 域名原样交给代理，代理那头解析 | 基本不吃亏；SOCKS5 协议原生支持传域名 |

Proxifier 里对应同一个开关：菜单 `Profile → Name Resolution`，勾选 **Resolve hostnames through proxy**——所有走代理的连接，域名一律不在本机解析，而是送到代理那头。

默认状态值得知道：Proxifier 出厂是 `Detect DNS settings automatically`，会持续监测本机 DNS 是否可用，不可用时**自动**切到代理解析，并在输出窗口打一行 `(Automatic DNS mode detection) ...` 日志，主窗口状态栏也实时显示当前 DNS 模式。所以很多时候你还没手动配，它已经替你切了。

**但这不是「开了就更安全」的开关**，官方文档把代价写得明白，两句最要紧的：

- 走代理解析时程序**拿不到真实 IP**，Proxifier 只能自造假地址（形如 `127.8.x.x`，仅本机有效）；
- 因此规则表里**基于 IP 的 Target hosts 匹配会失效**（域名根本没在本地变成 IP）。

所以官方的态度是：DNS 不可用/受限时才用，其余情况不建议常开。对话框里还有个 `Try to resolve via local DNS service first` 的折中模式——先本地、失败再走代理——文档同样提醒慎用：请求一个不存在的主机名会先等本地解析超时，**明显变慢**。

想亲眼看 DNS 走了哪条路？菜单 `View → Output Level → Verbose`，输出窗口会把每次域名解析打出来，排查「连不上是 IP 错了还是根本没解析」时非常好用。

---

## 雪球 5：把连接列表当显微镜——谁在偷偷联网

到这里配置已经够用了，这一球不加任何配置，只换一双眼睛。

主窗口的连接列表本质是一张**实时流量账本**：每一行是一次连接，列的含义在雪球 2 的表里讲过（Name / Target / Rule / Proxy / Time / Speed）。换上排障视角，它能回答三个问题：

1. **「这个程序到底连了谁？」**——按 Name 找到进程，看它的 Target 列。某个客户端软件「偷偷」上报了哪些服务器，一目了然。
2. **「为什么它没走代理？」**——看 Rule 列命中了哪条。命中 `Default`（Action=Direct）说明规则表里没有一条管它；想让它走代理，就去补规则，而不是反复重启程序。
3. **「现在到底走没走代理？」**——看 Proxy 列。`Direct` 就是没走。改完规则立刻发一次新连接验证，别拿旧连接的行看。

配合两个入口食用更佳：

- `View → Statistics`：按进程聚合的流量统计（连接数、带宽），官方文档列在实时网络活动能力里；
- `View → Output Level → Verbose`：雪球 4 提过，DNS 解析、自动模式切换这些细节事件都会打出来。

一个实用习惯：把连接列表当「规则调试器」——每次加规则后，故意触发一次目标程序的连接，看新行落在哪条 Rule 上。比凭感觉改配置快得多。

---

## 雪球 6 🧗：代理链与冗余——一级挂了自动切二级

到目前为止只有一个代理。Proxifier 还允许把多个代理**串成链**：连接从第一个代理进去、第二个代理出来，再到目标。菜单 `Profile → Proxy Servers` 对话框下半部就是 Proxy Chains 区（`Proxy Chains...` 按钮 → `Create`，把已登记的代理拖进链里）。

官方文档给链的四条事实，直接抄重点：

- 链里可以**混协议**（SOCKS4/5、HTTPS），但 HTTP 代理只能排在**最后一级**；
- 任何一级挂了，整条链断；
- 总延迟 ≈ 各级延迟之和；
- 链里一个代理都不放 = 直连。

链还有个更实用的变体：**冗余（Redundancy）**。建一条链后在类型里选 redundancy，它就从「串联」变成「备胎列表」——第一个代理不可用自动换第二个，还能做负载均衡，且失败节点会在后台被持续探测、恢复了自动归队。对只有单代理的家用场景用不上；管着一排出口的团队，这是 Proxifier 排在 VPN 前面的理由之一。

规则表那边不用学新东西：建好的链会出现在规则的 Action 下拉里（`Chain <名字>`），和选单个代理一个用法。

---

## 章末

### 怎么记

| 你记住的 | 它长在哪一球 |
|----------|--------------|
| 「不认代理的程序」= 不读系统代理设置、直连到死 | 雪球 1（`000` + 退出码 28） |
| 透明改道：拦截 → 规则 → Proxy/Direct/Block | 雪球 2 的 ASCII 图 |
| 规则从上到下第一条命中；三条件同时满足；留空 = Any | 雪球 3（Block 实验） |
| Default 是兜底、Localhost 放行走环回 | 雪球 3 的预置规则表 |
| DNS 在哪头解析：`-hostname` / through proxy | 雪球 1 埋种、雪球 4 解开 |
| 排障先看连接列表的 Rule 和 Proxy 列 | 雪球 5 |

### 版本与授权的几个事实

- Windows 当前最新 **v4.14**（2025.04.23 发布），本机即此版；macOS 是 v3.15，两边**授权分开买**。
- 试用 31 天、**功能无任何限制**；正式版一次买断，4.x 系列（4.00 → 4.99）免费升级，一个授权同时只允许一个运行实例。
- Standard 与 Portable 两种 Windows 版：Portable 免安装、不要管理员权限，但有功能限制（比如不能注册系统右键菜单）；Standard 可以后台注册为 **Windows 服务**运行（本机安装目录里的 `ServiceManager.exe` 就是干这个的）。
- Profile 是 XML 文本文件（扩展名 `.ppx`），存在 `%APPDATA%\Proxifier4\Profiles\`，可以设口令（AES-256 加密）。换机器 = 拷文件。
- 官方文档 URL 至今停在 `/docs/win-v3/` 路径下，但内容与 v4 界面一致，别被 URL 里的 v3 骗到。

### 和其它篇的关系

本系列：**本篇（押送）→ [mitmproxy](/Notes/tools/mitmproxy)（开膛）→ [mitmweb](/Notes/tools/mitmweb)（点着用）→ [微信 MMTLS](/Notes/tools/wechat-mmtls)（边界）**。

- 下一篇把代理换成 mitmproxy 后，Proxifier 规则的 Action 指到 `127.0.0.1:18080`，黑盒程序的流量就能进玻璃管——可照抄步骤写在 [mitmproxy 章末「和其它篇的关系」](/Notes/tools/mitmproxy)。
- 「在系统层把流量改道」这个思想，Linux 侧的同门是 iptables 的 NAT/重定向——见 [《netns 与 iptables——把命名空间里的流量拐个弯》](/Linux/basics/linux-05-netns-iptables)。Proxifier 相当于把这类「出口统一改造」做成了带 GUI 的按进程精细版。
- 代理本身（mihomo/SOCKS5）的行为不在本篇范围，本篇只解决「让程序把流量交出去」。

### 小结与思考题

雪球滚完：一个不认代理的 curl（球 1）→ 透明改道（球 2）→ 规则顺序与兜底（球 3）→ DNS 也交出去（球 4）→ 显微镜排障（球 5）→ 链与备胎（球 6）。Proxifier 的全部日常，就是这张表的排列组合。

思考题（答案都在正文里）：

1. 把 `Default` 规则的 Action 从 Direct 改成 Proxy SOCKS5，会发生什么？（提示：兜底管的是「所有没被别的规则命中的连接」）
2. 本地 DNS 被污染的环境里，`--socks5` 和 `--socks5-hostname` 哪个能拿到正确站点？为什么？
3. 官方为什么建议保留 Localhost 规则？如果 Default 也改成 Proxy，两者叠起来会发生什么？

### 参考资料

- 官方下载与版本：[proxifier.com/download](https://www.proxifier.com/download/)（2026-08 查证：Windows v4.14 / 2025.04.23）
- 官方文档：[Introduction](https://www.proxifier.com/docs/win-v3/)、[Proxification Rules](https://www.proxifier.com/docs/win-v3/rules.htm)、[Name Resolution Through Proxy](https://www.proxifier.com/docs/win-v3/dns.htm)、[Proxy Chains](https://www.proxifier.com/docs/win-v3/chain.htm)、[Proxy Server Redundancy](https://www.proxifier.com/docs/win-v3/redundancy.htm)
- 本机版本指纹：Proxifier Standard 4.14.0.1（注册表 `DisplayVersion`）、curl 8.21.0、Windows 10 LTSC 19044、mihomo 混合端口 7897
