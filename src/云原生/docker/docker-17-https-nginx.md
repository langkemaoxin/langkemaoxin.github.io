---
title: 从零理解 HTTPS——Nginx 容器从红页到可信（师生对话实录）
sidebarGroup: Docker 系列
shortTitle: 17 HTTPS Nginx 实战
order: 17
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - HTTPS
  - Nginx
  - 对话实录
description: 让 AI 当老师、我当学生，每课只讲一个概念：从浏览器红页讲到中间人攻击与 ARP 欺骗，再亲手解剖证书、配自签 HTTPS、自建 CA，最后用 Compose 拼出第一个完整项目。
---

> **Docker 系列 · 第 17/33 篇**
> 上一篇：[《Docker Compose 编排——从一个 Nginx 滚成一整栈》](/云原生/docker/docker-16-compose) · 下一篇：[《Compose 现代特性——watch 热更、profiles 分组与 init 容器》](/云原生/docker/docker-18-compose-modern)
>
> 主线实战篇：端口发布（15）、挂载（14）、Compose（16）在这里拼成第一个完整项目。Nginx 本体见 [Linux/Nginx 系列](/Linux/nginx/nginx-01-what-is-nginx)。

---

## 写在前面

Docker 系列学到第 17 篇，前面把端口发布、挂载、Compose 都用熟了，本以为 HTTPS 也就是「多配一个端口」的事——结果被浏览器一整页红色警告糊脸：「您的连接不是私密连接」。而且我对 TLS、证书这些词的认识约等于零。

所以换个办法：**让 AI 当老师，我当学生，每课只讲一个概念，我有问题就打断，没问题就继续**。这场对话从「换个协议名怎么就不私密了」开始，一路问到中间人攻击的底层手法，后面还要亲手解剖证书、配自签 HTTPS、自建 CA，最后用 Compose 拼出第一个完整项目。

课程路线图（走到哪算哪）：

> ① 红页怎么回事 → ② 中间人怎么上的路（ARP）→ ③ 解剖一张证书 → ④ 自签证书让 https 先跑起来 → ⑤ 报错地图：三种「不信」长什么样 → ⑥ 80 端口只做 301 → ⑦ 自建 CA：把信任装进去 → ⑧ Compose + 反代收尾 → ⑨ 生产证书从哪来

环境：WSL2 Ubuntu-22.04（root）+ Docker 29.1.3 + OpenSSL 3.0.2，实验目录 `/root/https-lab`，域名 `lab.test`。官方入口：[Mozilla：Transport Layer Security](https://developer.mozilla.org/zh-CN/docs/Web/Security/Transport_Layer_Security)。

---

## 第 1 课：浏览器凭什么说「您的连接不是私密连接」

**🧑‍🏫 老师：**

先看你已经会的东西。前面章节里，一条命令就能跑起一个网站：

```bash
docker run -d -p 80:80 nginx
```

浏览器访问 `http://localhost`，页面正常显示。现在做一个小动作：把地址栏里的 `http` 换成 `https`，回车。

浏览器不显示页面了，甩给你一整页红色警告：**「您的连接不是私密连接」**。

同一个站点、同一个端口规则，仅仅换了个协议名，怎么就「不私密」了？这节课就讲这一件事。

先建立对 `http` 的认知：**HTTP 是明信片**。你在网页里输入的密码、返回给你的数据，都是以明文在网上跑的。从你的电脑到那台 nginx 之间，要经过 WiFi 路由器、运营商的机房、也许还有几台交换机——**每一站都能完整看到明信片上写了什么，甚至可以涂改了再往前递**。内网环境这无所谓；但只要涉及登录、支付、隐私，「明信片」就是不能接受的。

`https` 里的那个 `s`，就是来解决这个问题的：**HTTPS = HTTP + 一层叫 TLS 的包装**。你可以把 TLS 想成一个信封：装进信封之后，沿途谁都看不见内容、也拆不开。

但 TLS 在封信封之前，还多做了一件事，而红页正是卡在这一件事上——**验明正身**。浏览器在开始加密通信之前，会先要求对方出示一张「证件」，证明「我真的是你要访问的那个站点」。为什么要验？因为如果只加密不验身份，攻击者可以冒充你要访问的网站，跟你之间也用一个信封——你俩聊得热火朝天，其实对面是个骗子。**加密解决「被偷看」，证件解决「被冒充」，两件事缺一不可。**

红页的意思翻译成人话就是：

> 「我让对面出示证件，它**拿不出来**（或者拿出来的证件我不认），所以我不能信任这条连接，内容我一律不显示。」

一句话总结本课：

> **HTTPS 多做的第一件事是「查证件」；红页 = 你的 nginx 拿不出浏览器认可的证件。**

---

## 插问 1：所以 HTTPS 能保证我访问的是真网站？

**🧑‍🎓 学生：** 所以你的意思是，我在浏览网站的时候，我必须得确定我访问的这个网站是真实的网站，而不是虚假的网站，而 HTTPS 能够做到这一点？

**🧑‍🏫 老师：**

对了一大半，但有一个地方我要帮你拧精确——这个差别恰恰是整篇后面所有内容的枢纽。

你说对的部分：**身份确认是必需的**。不光是「假网站骗你输入密码」这种明显场景；更隐蔽的是中间人攻击——你明明敲的是真网址，流量半路被截、转发给一个一模一样的假页面，你以为在跟真网站聊天，其实对面是骗子。所以「确认对面是谁」必须有人来保证。

要拧精确的部分：**HTTPS 提供的是「查证件的机制」，但「证件可不可信」是另一套系统在担保**。

拆开说。TLS 握手时，网站确实会出示证件（证书），浏览器也确实会查。但浏览器判断的不是「这张证件存不存在」，而是「**这张证件上的章，是不是我一个本来就信任的发证机关盖的**」。类比：你查房客的身份证，不是看「他手里有没有一张卡」，而是看这张卡是不是公安局签发的——他自己用 A4 纸打印一张「我是张三」，卡是有的，但你认吗？

浏览器里预装了一份它信任的发证机关名单（发证机关的专业名字叫 **CA，Certificate Authority**，先记住这个词，后面每一课都要用）。所以完整的链条是：

```text
HTTPS 查证件（机制，TLS 提供）
   └─ 证件上的章是谁盖的？
        ├─ 我信任的 CA 盖的   → 绿锁，放心通信
        └─ 没章 / 自己盖的 / 我不认识的章 → 红页
```

这也提前解释了后面我们会亲手撞上的墙：我们的 nginx 到时候**会有**一张证件——但是「自己给自己盖章」的（术语叫自签，self-signed）。浏览器一看：章是「lab.test 自己」盖的，而我的信任名单里没有它——红页。**证件存在 ≠ 证件可信**，这一步分清，后面就顺了。

一句话收口你这个问题：

> **HTTPS 负责让浏览器「查证件」；证件可不可信，看盖章的 CA 在不在浏览器预装的信任名单里。**

---

## 插问 2：「中间人攻击」究竟是怎样的手法？

**🧑‍🎓 学生：** 你说「流量半路被截、转发给一个一模一样的假页面」——这个究竟是怎样的攻击手法？

**🧑‍🏫 老师：**

问得好，这个不搞清楚，「为什么要查证件」就始终悬着。拆成三步讲：流量本来是怎么走的、攻击者怎么站到你路中间、站中间之后能干什么。

**第一步，先纠正一个默认直觉：你的数据不是「专线直达」网站的。**

你在家敲下 `www.example.com`，数据包不是沿着一条专属电线直接通到那台服务器。它更像接力快递：先到你的路由器，再到小区/城市的网络设备，进运营商骨干网，跨过若干机房，最后一站才落到目标服务器。**路上每一站都能看到这个包、也都理论上能改它**——HTTP 明信片的问题就出在这。

**第二步，攻击者要做的只有一件事：让自己成为你路上的一站。** 常见手法从低到高：

- **假热点**：机场、咖啡馆摆一个叫「Free_Airport_WiFi」的热点。你一连上，你的所有流量**天然**从他那过——这都不算「截获」，是你亲手递给他的。
- **同一局域网内冒充网关（ARP 欺骗）**：你和攻击者连着同一个 WiFi。他向路由器广播「我是那台笔记本」，又向你广播「我是路由器」。你俩都信了，于是你发给路由器的包全先绕到他机器上，他再转出去。你全程毫无感知。
- **DNS 污染**：你敲的是真网址，但被做过手脚的 DNS 把域名解析到攻击者的 IP。你「访问对了网址」，却连到了他的服务器。

**第三步，站到中间之后，他有两种玩法：**

```text
玩法一：偷看 / 涂改（HTTP 时代畅通无阻）

   你 ──明信片──► [攻击者：抄一遍，改两行，继续递] ──► 真网站
                    ↑ 他看得见、改得了：密码、验证码、插广告

玩法二：顶替（你从头到尾没见过真网站）

   你 ──► [攻击者的假服务器：页面做得和真的一模一样]    真网站：根本没参与
```

玩法二就是刚才说的「一模一样的假页面」：登录页的 logo、布局、域名看着都对（DNS 污染下域名栏甚至显示真域名），你在假页面里输的账号密码直接进攻击者的库。国内 HTTP 时代的「运营商劫持插广告」，本质就是玩法一的温和版——路上有人改了你的明信片。

**那 HTTPS 不是在吗？——正好接回第 1 课。** 如果浏览器走的是 https，玩法二就卡在一个关口：攻击者必须出示一张「属于这个域名、且由可信 CA 盖章」的证件。他出示自己的证件 → 浏览器红页。**他没有任何办法伪造出一张可信 CA 盖章的证件**（盖章的私钥在 CA 手里，这正是整套体系的地基）。所以他只剩一条路：**等你**。红页上那个「高级 → 仍要访问此网站」的按钮，就是他等的——你亲手点了「不查了」，他得手。

所以红页的「不友好」恰恰是设计使然：**宁可拦住你，也不默认放行一个证件对不上的人**。

一句话收口：

> **中间人攻击 = 攻击者挤进你与网站之间的必经之路，偷看、涂改或整个顶替对面；HTTPS 查证件是它的克星——前提是你别手贱点「仍要继续」。**

后面做自签证书实验时，`curl -k` 里那个 `-k` 的本质就是「跳过查证件」——相当于命令行版的「仍要访问」，到时候你会亲手看到跳过之后发生了什么。

---

## 插问 3：「向路由器广播我是那台笔记本」具体怎么做？

**🧑‍🎓 学生：** 你说 ARP 欺骗是「他向路由器广播『我是那台笔记本』，又向你广播『我是路由器』，你俩都信了」——这个究竟咋做的？

**🧑‍🏫 老师：**

这个问到了底层，值得拆。先看一眼你机器上真实存在的一张表——我在本机跑了这条命令：

```bash
ip neigh show
ip route show default
```

```text
172.22.208.1 dev eth0 lladdr 00:15:5d:53:ec:46 STALE
172.17.0.2 dev docker0 lladdr b2:89:c9:cb:07:96 REACHABLE
172.17.0.3 dev docker0 lladdr 0e:ec:cf:63:cf:05 REACHABLE
---
default via 172.22.208.1 dev eth0 proto kernel
```

看这张表——这就是攻击要篡改的东西，先把它讲明白。

**先补一个背景：网络上其实有两层「地址」。**

- **IP 地址**：逻辑门牌（`172.22.208.1`），负责跨网络寻路——「这个包最终要去哪栋楼」；
- **MAC 地址**：网卡出厂烧死的物理编号（`00:15:5d:53:ec:46`），负责**本局域网内的实际投递**——「这个包在本楼里交给哪个门口」。

上面那张表（`ip neigh`，就是常说的 ARP 表）是你机器的「IP → MAC 对照账本」。注意最后两行输出：默认路由是 `default via 172.22.208.1`——**你所有出网的流量，最终都交给 `172.22.208.1` 对应的那个 MAC**。账本上这一行写的是谁的 MAC，你的包就实际递到谁手里。

**那这一行是怎么写上去的？——ARP 协议，两步：**

```text
① 你的机器（广播，全楼喊）：谁是 172.22.208.1？我要把包交给它！
② 路由器（应答）：我是。我的 MAC 是 00:15:5d:53:ec:46。
   → 你的机器把这条记进账本，之后包都递给这个 MAC。
```

这个协议 1982 年设计（RFC 826），它默认**局域网里人人诚实**。于是有三个要命的性质：

1. **谁都能答**——应答里没有任何身份验证，不检查「答话的人是不是真的持有这个 IP」；
2. **不请自来也收**——攻击者可以不等广播、主动推送应答（叫 gratuitous ARP），你的机器照样记账；
3. **后到覆盖先到**——新的应答直接改写账本旧行。

**攻击就是两条假应答。** 你和攻击者连着同一个 WiFi，他向两边各发一条：

```text
攻击者 ──「172.22.208.1 的 MAC 是 我（攻击者）」──► 你的机器
攻击者 ──「你的 IP 的 MAC 是 我（攻击者）」──────► 路由器

结果：
你 ──► 出网的包，链路层全部递给攻击者
路由器 ──► 发给你的包，也全部递给攻击者

攻击者开启 IP 转发（收到包再转给真网关）：
你 ──► [攻击者：抄录/涂改] ──► 路由器 ──► 互联网
                │
                └── 网还能上、页面还正常 —— 你毫无感知
```

他要做的就是**持续发这两条假应答**——因为 ARP 缓存有存活期（你看第一行那个 `STALE`，就是「快过期了」），不发的话你的机器迟早重新广播去问真网关，账本就回正了。

边界也说清楚：这招**只在同一局域网内成立**（攻击者必须和你在同一个 WiFi/交换机下），所以公共 WiFi 是重灾区、家里的 WiFi 相对安全；企业交换机有 DAI 这类检查可以拦，但你没法指望咖啡店的设备替你拦。

最后收回主线——**为什么讲这个**：ARP 欺骗成功后，攻击者就是上一课说的「路上的一站」。HTTP 明信片全程裸奔；而 HTTPS 的证件他**依然拿不出来**——这正是「加密 + 查证件缺一不可」的原因：只加密不查证件，等于跟中间人用信封聊得热火朝天。

> 一句话收口：**ARP 欺骗 = 利用「ARP 应答无验证」污染你账本上的「网关 IP→MAC」那行，让你出网的包先过攻击者的手；防不住他上路，但 HTTPS 的证件能防他冒充。**

---

## 第 2 课：解剖一张真网站的证件

**🧑‍🏫 老师：**

空讲证件长什么样没意思，我们先去**偷看一张真网站的证件**——连上百度，把它出示的证书抓下来：

```bash
echo | openssl s_client -connect www.baidu.com:443 -servername www.baidu.com 2>/dev/null \
    | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

（管道开头的 `echo |` 是喂一个回车让命令别挂着等输入，照抄即可。）`openssl s_client` 的角色是「冒充浏览器」——去做一次 TLS 握手，把对方递出来的证件原件抓下来；`openssl x509` 把它翻译成人能读的字段。本机真实输出：

```text
subject=C=CN, ST=Beijing, L=Beijing, O=Beijing Baidu Netcom Science Technology Co., Ltd., CN=baidu.com
issuer=C=BE, O=GlobalSign nv-sa, CN=GlobalSign RSA OV SSL CA 2018
notBefore=Jul  9 02:32:55 2026 GMT
notAfter=Jan 24 02:32:55 2027 GMT
X509v3 Subject Alternative Name:
    DNS:baidu.com, DNS:click.hm.baidu.com, DNS:baifubao.com, DNS:www.baidu.cn, DNS:www.baidu.com.cn, DNS:mct.y.nuomi.com, DNS:apollo.auto, DNS:dwz.cn, DNS:update.pan.baidu.com, DNS:wn.pos.baidu.com, DNS:cm.pos.baidu.com, DNS:log.hm.baidu.com, DNS:*.baidu.com, DNS:*.baifubao.com, DNS:*.baidustatic.com, DNS:*.bdstatic.com, DNS:*.bdimg.com, DNS:*.hao123.com, DNS:*.nuomi.com, DNS:*.chuanke.com, DNS:*.trustgo.com, DNS:*.bce.baidu.com, DNS:*.eyun.baidu.com, DNS:*.map.baidu.com, DNS:*.mbd.baidu.com, DNS:*.fanyi.baidu.com, DNS:*.baidubce.com, DNS:*.mipcdn.com, DNS:*.news.baidu.com, DNS:*.baidupcs.com, DNS:*.aipage.com, DNS:*.aipage.cn, DNS:*.bcehost.com, DNS:*.safe.baidu.com, DNS:*.im.baidu.com, DNS:*.baiducontent.com, DNS:*.dlnel.com, DNS:*.dlnel.org, DNS:*.dueros.baidu.com, DNS:*.su.baidu.com, DNS:*.91.com, DNS:*.hao123.baidu.com, DNS:*.apollo.auto, DNS:*.xueshu.baidu.com, DNS:*.bj.baidubce.com, DNS:*.gz.baidubce.com, DNS:*.smartapps.cn, DNS:*.bdtjrcv.com, DNS:*.hao222.com, DNS:*.haokan.com, DNS:*.pae.baidu.com, DNS:*.vd.bdstatic.com, DNS:*.cloud.baidu.com
```

（SAN 实际一长串共几十个域名，此处节选。）逐块读这张真证件，它就是「证书」这个词的活样本：

**`subject`——证件是给谁办的。** 拆开：国家 CN、城市 Beijing、公司「北京百度网讯科技」、最关键的 **`CN = baidu.com`：这张证绑定 baidu.com**。subject 就是「持证人」。

**`issuer`——章是谁盖的。** 盖章的是一家比利时公司 **GlobalSign**——第 1 课说的 CA，这就是它活的样子。注意细节：**subject ≠ issuer**，持证人和盖章人不是同一个——这是「由 CA 签发」的铁证。等做自签证书时，你会看到两者一模一样——自己给自己盖章。

**`Verify return code: 0 (ok)`——「绿」在命令行里的样子。**（抓证书时顺带输出）本机信任名单里有 GlobalSign，验证通过。记住这个 `0 (ok)`，以后会看到它不是 0 的时候长什么样。

**有效期。** `notBefore` / `notAfter` 之间才算数，浏览器每次都拿当前时间对一遍，不在区间内就红页——你见过的「网站的安全证书已过期」就是它到期了。

**SAN——真正绑定域名的字段。** 两个看点：一张证可以绑很多域名；`*.baidu.com` 这种通配符罩住所有子域名。

这里有个**重要的坑**：`CN = baidu.com`，但 `www.baidu.com` 并没有单独写在 CN 里——因为**现代浏览器验域名只看 SAN、完全无视 CN**（Chrome 58 起）。CN 成了摆设，SAN 才是干活的字段。以后自己造证书时 SAN 忘了写，证书照样能生成、照样能配进 nginx，但浏览器一律报「域名不匹配」——这个坑后面会亲手踩一遍。

留个伏笔：这张证件里还躺着一样东西没展示——**百度站点的公钥**，它是「信封」机制的零件。下一课自己动手：生成一对钥匙、给自己签一张证书、喂给 nginx，亲眼看看红页和 `curl -k` 的真身。

一句话总结本课：

> **证书 = 「我是谁（SAN 域名清单）+ 我的公钥 + 有效期」，外加一个章（issuer 的 CA 签名）；浏览器验的是 SAN 和章，不看 CN。**

---

## 插问 4：证书里面，哪里有 SAN？

**🧑‍🎓 学生：** 证书里面，哪里有 SAN？我在输出里找不到这三个字母。

**🧑‍🏫 老师：**

因为它藏在全称里——输出这行的全称就是 SAN：

```text
X509v3 Subject Alternative Name:
    DNS:baidu.com, ...
```

**SAN = Subject Alternative Name 的缩写**，中文叫「主体备用名称」。再把证书的内部结构抓出来看它住在哪一层：

```bash
echo | openssl s_client -connect www.baidu.com:443 -servername www.baidu.com 2>/dev/null \
    | openssl x509 -noout -text | grep -A4 "X509v3 extensions"
```

```text
        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
            X509v3 Basic Constraints: critical
                CA:FALSE
                  URI:http://crl.globalsign.com/gsrsaovsslca2018.crl
            X509v3 Subject Alternative Name:
                DNS:baidu.com, DNS:click.hm.baidu.com, ..., DNS:*.cloud.baidu.com
            X509v3 Extended Key Usage: ...
```

SAN 住在证书的**「扩展区」**里，整张证书的结构钉成一张图：

```text
一张 X.509 证书
├── 基本区（v1 时代就有，固定栏目）
│     ├── Subject        ← 持证人：CN = baidu.com（老的"名字"栏）
│     ├── Issuer         ← 盖章的 CA：GlobalSign
│     ├── Validity       ← 有效期
│     └── 公钥            ← 百度站点的公钥
│
└── X509v3 extensions（扩展区，v3 版才加的）
      ├── Key Usage            ← 这把钥匙的用途（签名/加密）
      ├── Basic Constraints    ← CA:FALSE（这张证不是用来当 CA 的）
      ├── Subject Alternative Name  ← ★ SAN：域名清单
      │       DNS:baidu.com, DNS:*.baidu.com, ...
      └── ...
```

三个点说透：

**「X509v3」是什么。** X.509 是证书的格式标准——就像「身份证的规格由公安部定」，证书长什么样、有哪些栏位，由 X.509 定。v1/v2 时代只有「基本区」那几个固定栏目；v3 引入了**扩展（extensions）机制**——标准栏位不够用的，都往扩展区里加。SAN 就是 v3 补进来的，所以每行扩展都顶个 `X509v3` 前缀。

**为什么域名清单放进扩展、不直接用 CN？** CN 只能写**一个**名字，而且历史上被塞过公司名、邮箱等各种东西，语义早就不干净。v3 干脆新开一个专门字段放「这个证到底拥有哪些域名」——能列一长串、还能写通配符。**旧栏位（CN）留着但不再信，新栏位（SAN）说了算**——典型的「历史包袱不好删，就开新字段」设计。

**30 秒自己看到它。** 浏览器随便进个 https 网站 → 点地址栏锁图标 →「证书」→ 详细信息里翻到**「主题备用名称」**——那就是 SAN 的中文界面版。

埋个伏笔：下一课自己签证书时，命令里的 `-addext "subjectAltName=DNS:lab.test"` 干的就是往这个扩展区里写 SAN，而且你会亲手看到**不写它会发生什么**。

> 一句话收口：**SAN = Subject Alternative Name（主体备用名称），住在证书的 X509v3 扩展区里；浏览器验域名只认它。**

---

## 第 3 课：亲手签一张自签证书

**🧑‍🏫 老师：**

动手之前，先兑现第 2 课埋的伏笔——**证书里的「公钥」是干什么用的**。这需要一对钥匙：

- **私钥**：你手里唯一的一把钥匙，打死不给别人；
- **公钥**：由私钥推导出来的「挂锁」，可以无限复制、随便发。

寄密件的流程就变成：**任何人**拿一把你的挂锁，「咔哒」一锁（用公钥加密）——锁上容易、人人会锁；但全程**只有你的私钥能打开**。所以公钥可以印在名片上满世界发（证书里放的就是它），私钥必须自己藏着。

那证书和挂锁什么关系？**证书 = 挂锁（公钥）+ 身份信息 + CA 的章**。光有挂锁，别人不知道「这锁真是你家的」；章就是防伪标签。这就是为什么生成证书时总会产出**两个文件**——马上就见。

**第一步：给实验域名安个家。** 我们在宿主机上进行实验，实验用 `lab.test` 这个域名（`.test` 是专门保留给测试的顶级域，永远撞不上真网站）。浏览器访问 `lab.test` 得先知道它对应的 IP——本机有本「私账」`/etc/hosts`，写一行就够：

```bash
mkdir -p /root/https-lab/nginx/conf.d /root/https-lab/nginx/certs /root/https-lab/app
echo "127.0.0.1 lab.test" >> /etc/hosts
grep lab.test /etc/hosts
```

```text
127.0.0.1 lab.test
```

（`hosts` 比 DNS 查询优先级高，本机自己认账。生产环境这个活由 DNS 负责，思路一样。）

**第二步：一条命令，签一张自签证书。** 这个证书存放在本机上

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
    -keyout /root/https-lab/nginx/certs/lab.test.key \
    -out    /root/https-lab/nginx/certs/lab.test.crt \
    -subj "/CN=lab.test" \
    -addext "subjectAltName=DNS:lab.test"
```

| 段 | 含义 |
|----|------|
| `openssl req` | 造证书的子命令（req = request） |
| `-x509` | 不走「向 CA 申请」的流程，直接输出一张成品自签证书。（不加它输出的是 CSR 申请表——第 7 课自建 CA 时会用到，先埋个伏笔） |
| `-newkey rsa:2048` | 顺手生成一对 2048 位 RSA 钥匙——公钥进证书，私钥单独存文件 |
| `-nodes` | 私钥**不**加密存储（no DES）。加了密的话，nginx 每次启动都要人工输一遍口令——生产上没人这么干 |
| `-days 30` | 有效期 30 天，写进 notBefore/notAfter |
| `-keyout` / `-out` | 私钥落 `.key` 文件，证书落 `.crt` 文件。后缀只是约定，内容都是 PEM 格式的文本 |
| `-subj "/CN=lab.test"` | 持证人信息，免交互问答直接填。CN 顺手写上（第 2 课说了它只是摆设） |
| `-addext "subjectAltName=..."` | **往 X509v3 扩展区写 SAN**——上一课讲的那个字段，浏览器真正验的东西 |

**第三步：验货。** 先看产物：

```bash
ls -l /root/https-lab/nginx/certs/
```

```text
-rw-r--r-- 1 root root 1139 Aug 22 17:50 lab.test.crt
-rw------- 1 root root 1704 Aug 22 17:50 lab.test.key
```

两个文件、两种待遇：**证书 `.crt` 是 644（谁都可读）——它本来就是拿给别人看的；私钥 `.key` 是 600（仅 root）——钥匙嘛**。和挂锁模型完全对上。

再用第 2 课学的读法，读我们自己的证件：

```bash
openssl x509 -in /root/https-lab/nginx/certs/lab.test.crt -noout \
    -subject -issuer -dates -ext subjectAltName
```

```text
subject=CN = lab.test
issuer=CN = lab.test
notBefore=Aug 22 09:50:36 2026 GMT
notAfter=Sep 21 09:50:36 2026 GMT
X509v3 Subject Alternative Name:
    DNS:lab.test
```

和百度的证件对照着读，一处相同、一处天差地别：

- **相同**：SAN 都乖乖写在扩展区——`DNS:lab.test`，这张证绑定 `lab.test`；有效期也在。
- **天差地别**：`subject` 和 `issuer` **一模一样**——持证人就是盖章人。百度的章是 GlobalSign 盖的（subject ≠ issuer）；我们的章是「lab.test 自己」盖的。**这就是「自签」二字的铁证**，也是浏览器红页的根源——没有任何一个 CA 为它背书。

一句话总结本课：

> **自签 = 自己生成钥匙对、自己给自己盖章发证；证件内容齐全（SAN/公钥/有效期），唯独章不被别人信任。**

---

## 第 4 课：把证件喂给 nginx——红页的真身

**🧑‍🏫 老师：**

**先看配置。** 写进 `/root/https-lab/nginx/conf.d/default.conf` 的内容：

<u>当前的Https的配置</u>

```nginx
server {
    listen      443 ssl;
    server_name lab.test;

    ssl_certificate     /etc/nginx/certs/lab.test.crt;
    ssl_certificate_key /etc/nginx/certs/lab.test.key;

    location / {
        root  /usr/share/nginx/html;
        index index.html;
    }
}
```

整个配置里，HTTP 和 HTTPS 的差别其实只有**两处**：`listen 443 ssl` 里的 `ssl` 参数（这个端口用 TLS 接客），和 `ssl_certificate` 两行（出示哪张证、钥匙在哪）。其余和[第 15 篇](/云原生/docker/docker-15-network)跑过的 HTTP 站点一模一样。

注意一个细节：证书路径写的是 `/etc/nginx/certs/...`——**容器内**的路径，不是宿主机的 `/root/https-lab/...`。因为证书躺在宿主机上，得靠 [第 14 篇](/云原生/docker/docker-14-data-persistence)的 bind 挂进去：

| 宿主机（真身） | 容器内（nginx 视角） | 装什么 |
|---|---|---|
| `…/nginx/conf.d` | `/etc/nginx/conf.d` | 配置（盖住镜像默认配置） |
| `…/nginx/certs` | `/etc/nginx/certs` | 证书 + 私钥 |
| `…/app` | `/usr/share/nginx/html` | 网页 |

另外准备一个html文件

```shell
root@pc3507:~# cat /root/https-lab/app/index.html
https-lab page v1
```

**起容器：**

```bash
docker run -d --name https-lab-nginx \
    -p 443:443 \
    -v /root/https-lab/nginx/conf.d:/etc/nginx/conf.d:ro \
    -v /root/https-lab/nginx/certs:/etc/nginx/certs:ro \
    -v /root/https-lab/app:/usr/share/nginx/html:ro \
    --restart always \
    nginx:latest
```

（`-p 443:443` 发布 HTTPS 门面；三个 `-v …:ro` 就是上面那张映射表，`:ro` 只读——回头专门验证它防什么。）

这里的ro其实就是readonly

```nginx
-v /root/https-lab/nginx/conf.d:/etc/nginx/conf.d:ro
```

等价于

```nginx
-v /root/https-lab/nginx/conf.d:/etc/nginx/conf.d:readonly
```

这是容器启动后的结果

```text
Up 2 seconds | 80/tcp, 0.0.0.0:443->443/tcp, [::]:443->443/tcp
```

容器活了，nginx 实测 1.31.3。顺便记一个细节：PORTS 列里 `80/tcp` **没有箭头**（`443->443` 才有）——这个悬念下节课拆。

**然后是本课的主菜，三连验证。** 同一个站点，三种「查不查证件」的态度：

```bash
curl -k -s https://lab.test/          
# ① 跳过查证件 
# -k 忽略 SSL 证书验证（允许自签名证书或过期证书）
# -s 静默模式（不显示进度条和错误信息）
# 注意看，这里使用的是Https，所以走的端口是是443

================= 执行结果  ================= 
https-lab page v1
============================================  


curl -sS https://lab.test/            
# ② 老老实实查
# -s 静默模式（不显示进度条）
# -S 显示错误信息（与 -s 配合使用）

================= 执行结果  ================= 
root@pc3507:~# curl -sS https://lab.test/
curl: (60) SSL certificate problem: self-signed certificate
More details here: https://curl.se/docs/sslcerts.html

curl failed to verify the legitimacy of the server and therefore could not
establish a secure connection to it. To learn more about this situation and
how to fix it, please visit the web page mentioned above.
============================================  



echo | openssl s_client -connect lab.test:443 2>/dev/null | grep -E 'subject=|issuer=|Verify return code'
# ③ 命令行版的「浏览器视角」
# openssl s_client : OpenSSL 的 SSL/TLS 客户端工具
# -connect lab.test:443 : 连接到目标服务器的 443 端口
# 2>/dev/null : 将错误输出（stderr）丢弃，只保留正常输出
# | grep -E : 用扩展正则表达式过滤
# 'subject=|issuer=|Verify return code' : 匹配包含这三个关键词的行

================= 执行结果  ================= 
root@pc3507:~# echo | openssl s_client -connect lab.test:443 2>/dev/null | grep -E 'subject=|issuer=|Verify return code'
subject=CN = lab.test
issuer=CN = lab.test
Verify return code: 18 (self-signed certificate)
============================================ 
```

 逐个读，这三段合起来才是完整的真相：

**① `-k` 拿到了页面。** 插问 2 结尾埋过一句话——`-k` 就是命令行版的「高级 → 仍要访问」。它跳过查证件，但**其余一切照常**：TLS 握手完成、密钥协商完成、数据加密传输。页面 `https-lab page v1` 原样到达。这证明了一件重要的事：**我们的加密通道从头到尾都是好的。**

**② 不带 `-k`，curl 拒绝了。** 报错把病根说得明明白白：`self-signed certificate`——章是自己盖的。这就是浏览器红页的命令行版：**不是连不上，是「我不信你，内容不给你看」**。

**③ `Verify return code: 18`。** 第 2 课看百度时它是 `0 (ok)`——同一个字段，两种命运。**18 是「自签证书」的编号**，0 是「完全信任」。以后排障 HTTPS，看到这串数字就知道信到哪一步断了——这是排障地图的第一块拼图，后面还会看到 21。

当前的这个小章节演示的效果是，自己给自己的颁发了一个证书，并且在nginx中进行了使用。

## OpenSSL s_client Verify return code 常见值

| 场景                                             | 典型返回码 |
| ------------------------------------------------ | ---------- |
| 正规 CA 签发的证书（Let's Encrypt、DigiCert 等） | **0** ✅    |
| 自签名证书（测试环境）                           | **18** ⚠️   |
| 证书已过期                                       | **10** ❌   |
| 证书尚未生效                                     | **9** ❌    |
| 访问的域名与证书 CN/SAN 不匹配                   | **61** ❌   |
| 证书被吊销                                       | **23** ❌   |
| 缺少中间证书（证书链不完整）                     | **20** ❌   |

---

## 第 5 课：80 端口只做一件事——永久搬家通知

**🧑‍🏫 老师：**

先兑现上节课的悬念：PORTS 列里 `80/tcp` 为什么没有箭头？

因为 `EXPOSE` 只是**声明**。nginx 官方镜像的 Dockerfile 里写了 `EXPOSE 80`——意思是「我这个镜像里的程序会在 80 上说话」，这是说明书上的参数表，**不是开门**。真正把宿主机的门打开的是 `-p`。所以 `docker ps` 里：`80/tcp` = 只是声明；`0.0.0.0:80->80/tcp` = 真开了门。

**然后是本课要解决的现实问题。** 用户在浏览器敲 `lab.test`，不带协议、不带端口——浏览器会自动补 `http://`，去敲 **80 号门**。我们 443 上的站点再好，80 没人应答，用户看到的就是「打不开」。

**意外紧接着来。** 重建容器，这次把 80 也发布了（`-p 80:80 -p 443:443`）

```
docker run -d --name https-lab-nginx \
    -p 443:443 \
    -p 80:80 \
    -v /root/https-lab/nginx/conf.d:/etc/nginx/conf.d:ro \
    -v /root/https-lab/nginx/certs:/etc/nginx/certs:ro \
    -v /root/https-lab/app:/usr/share/nginx/html:ro \
    --restart always \
    nginx:latest
```



docker ps 展示如下 `0.0.0.0:80->80/tcp, [::]:80->80/tcp, 0.0.0.0:443->443/tcp, [::]:443->443/tcp`

然后再进行curl，发现出问题了

```text
root@pc3507:~# curl lab.test
curl: (56) Recv failure: Connection reset by peer
```

还是不通？——[第 15 篇](/云原生/docker/docker-15-network)讲过这条链路：`-p` 只负责「宿主 → 容器」的转发，**容器内得有进程在听**。

真正的原因是：我们的配置里写的是 `listen 443 ssl`，容器里根本没人听 80。**发布了 ≠ 有人听**，两件事各管一半。

在这里，我们**补上 80 的 server 块**——它只干一件事，发永久搬家通知：

```nginx
server {
    listen      80;
    server_name lab.test;
    return 301 https://$host$request_uri;
}
server {
    listen      443 ssl;
    server_name lab.test;

    ssl_certificate     /etc/nginx/certs/lab.test.crt;
    ssl_certificate_key /etc/nginx/certs/lab.test.key;

    location / {
        root  /usr/share/nginx/html;
        index index.html;
    }
}
```

主要加上了这个东西

```nginx
server {
    listen      80;
    server_name lab.test;
    return 301 https://$host$request_uri;
}
```

- **`301`**：永久重定向。区别于 302（临时）：浏览器和搜索引擎会**记住** 301——以后敲这个域名直接走 https，不再来 80 问路。这正是生产站点的标准姿势。
- **`$host` / `$request_uri`**：nginx 的变量——域名照旧、路径照旧，只把协议换成 https。用户访问 `http://lab.test/article/1`，会被精确地领到 `https://lab.test/article/1`。
- **`return`**：直接应答，不进 location 匹配，最轻量的跳转写法。



 当我们改完配置后，执行下面这一句，这里的 `-t` 意味着检查配置，如果配置有问题，就会报错，如果没有问题则进行重新启动 nginx

```shell
    docker exec https-lab-nginx nginx -t && docker exec https-lab-nginx nginx -s reload
```

运行后的结果

```shell
root@pc3507:~# docker exec https-lab-nginx nginx -t && docker exec https-lab-nginx nginx -s reload
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
2026/08/23 09:15:50 [notice] 33#33: signal process started
```

**验证，两种问法：**

```bash
curl -sI http://lab.test/          
# -I 只拿响应头
# -s 静默模式
# 注意看，这里是http，而不是https


================= 执行结果  ================= 
root@pc3507:~# curl -sI http://lab.test/
HTTP/1.1 301 Moved Permanently
Server: nginx/1.31.3
Date: Sun, 23 Aug 2026 09:18:12 GMT
Content-Type: text/html
Content-Length: 169
Connection: keep-alive
Location: https://lab.test/
=============================================


curl -k -sL http://lab.test/       
# -L 跟随重定向（Location 跳转）
# 如果不加-L 如果碰到301 只会告诉你跳转到了新地址，但是不会自动访问新地址 
# 如果加上了-L 如果碰到301 则直接访问到新地址
# -k 忽略 SSL 证书验证（对 HTTP 无效，但无害）
# -s 静默模式
================= 执行结果  ================= 
https-lab page v1
=============================================
```

`-I` 看到 80 的应答就是一纸通知：301 + `Location: https://lab.test/`；

`-L` 自动跟着 Location 走到 443，最终拿到页面。第 4 课的 `Connection reset` 从此变成 301。

一句话总结本课：

> **EXPOSE 是声明、-p 才是开门；发布了还得有人听。80 上只放一条 301，把所有人永久领去 https。**

---

## 第 6 课：自建 CA——把信任装进去

**🧑‍🏫 老师：**

先清第 4 课挂的账：`:ro` 到底防什么。模拟「容器被攻破后攻击者想篡改私钥」——从容器里改挂载的三个目录：

```text
== 容器内三连改（模拟被攻破后的篡改）：
sh: 1: cannot create /etc/nginx/certs/lab.test.key: Read-only file system
sh: 1: cannot create /etc/nginx/conf.d/default.conf: Read-only file system
sh: 1: cannot create /usr/share/nginx/html/index.html: Read-only file system
== 宿主机侧改同一份文件（热更新）：
https-lab page v2 (hot update)
```

`:ro` 把「从容器里改挂载文件」这条路焊死了（内核 `EROFS`），宿主机照常能改、改完立即生效（热更新，不用动容器）。**私钥就该享受这个待遇**：就算容器被打穿，攻击者也带不走、改不了钥匙。

**然后是本课的正题。** 第 4 课结束时我们卡在：<u>章是「lab.test 自己」盖的，没人信</u>。

目前使用https访问网站就会报错(提示这个证书是自己签的 **self-signed certificate**)：

```shell
root@pc3507:~/https-lab/nginx/certs# curl https://lab.test
curl: (60) SSL certificate problem: self-signed certificate
More details here: https://curl.se/docs/sslcerts.html

curl failed to verify the legitimacy of the server and therefore could not
establish a secure connection to it. To learn more about this situation and
how to fix it, please visit the web page mentioned above.
```

那么如何做呢？破解思路不是把每张服务器证书塞进每台客户机——而是 **自建 CA**：

```text
   自签（现在的困境）                自建 CA（这一课）
                                 信任名单: [Lab Test Root CA] ✓
   ┌─────────────┐               ┌─────────────┐
   │ lab.test 证书 │ ←章是自己盖的│ lab.test 证书 │ ←章是 CA 盖的
   └─────────────┘               └─────────────┘
   谁都不认识你 → 18                名单里认识盖章的 CA → 0
```

这正是 Let's Encrypt、企业内网 root CA 共同的原理——区别只在于它们的根早就预装（或被管理员统一装）进了信任库。

所以这里的问题是：如何浏览器把当这个网站当做真的网站？总共有三步

```
1、造一个自己的 CA（自己当公安局局长）
2、给你的网站颁发一张证书（给自己网站办身份证）
3、自己电脑信任这个公安局（把公安局的公章样存进电脑）
```

先提前透露整个流程：申请 -> 签发流程

```shell
# 进入指定的ca生成目录
cd /root/https-lab/ca

# 第 1 步：生成私钥（藏好，不给任何人）
openssl genrsa -out server.key 2048

# 第 2 步：生成 CSR（申请表，可以公开给别人）
openssl req -new -key server.key -subj "/CN=lab.test" -out server.csr

# 第 3 步：把 CSR 交给 CA（CA 用它的私钥在上面盖章）
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -out server.crt

# 第 4 步：拿回盖了章的证书（server.crt），配置到 Nginx
```

<u>所有命令的执行位置：**/root/https-lab/ca	**</u>

第一步：我要当公安局局长，相当于自己造一个CA

```shell
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -subj "/CN=Lab Test Root CA" -days 3650 -out ca.crt

# 第一句命令：
# openssl genrsa：调用 OpenSSL 工具生成 RSA 私钥。
# -out ca.key：将生成的私钥保存到当前目录下的 ca.key 文件中。
# 2048：指定密钥长度为 2048 位（目前行业标准，安全性足够）

# 第二句命令：
# openssl req：调用证书请求和生成工具。
# -x509：告诉 OpenSSL 直接输出自签名的 X.509 格式证书，而不是生成证书签名请求（CSR）。
# -new：生成一个新的证书请求（这里配合 -x509 表示直接生成新证书）。
# -nodes（No DES）：不对私钥进行加密（即不设置密码保护）。如果不加此参数，每次启动服务（如 Nginx）需要手动输入密码，通常内部测试环境为了方便会加上。
# -key ca.key：指定使用刚才生成的 ca.key 私钥来签发这个证书。
# -subj "/CN=Lab Test Root CA"：指明了证书的持有者是谁，当前是 Lab Test Root CA
# -days 3650：证书有效期设为 3650 天（约 10 年）。根证书通常作为信任锚点，有效期较长。
# -out ca.crt：将生成的根证书保存为 ca.crt 文件



执行完上述两条命令后，你会在当前目录得到一对文件：
- ca.key（私钥）：用于签发下级证书（如服务器证书、客户端证书），或吊销证书。
- ca.crt（公钥证书）：包含你的公钥和身份信息。需要将此证书安装到客户端（浏览器、操作系统）的“受信任的根证书颁发机构”列表中，那么所有由该 CA 签发的子证书才会被系统信任。

```

第二步：生成服务器的私钥 + 申请表，生成了一张申请表，不过没有法律效应

```shell
openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "/CN=lab.test" -out server.csr

## 第一条命令 生成服务器私钥
# openssl genrsa：生成 RSA 私钥。
# -out server.key：保存为 server.key 文件。
# 2048：密钥长度 2048 位。
结果：得到服务器专用的私钥 server.key。这个密钥与根 CA 的私钥（ca.key）是分开的，遵循密钥分离的安全原则——根 CA 私钥应离线保存，而服务器私钥仅用于该特定服务器。



## 第二条命令 生成证书签名请求（CSR）
# openssl req：调用证书请求管理工具。
# -new：生成一个新的证书签名请求。
# -key server.key：指定使用 server.key 私钥来生成 CSR。OpenSSL 会从私钥中提取公钥信息并嵌入到 CSR 中。
# -subj "/CN=lab.test"：免交互设置主题信息。这里只设置了 CN（Common Name，通用名称） 为 lab.test。
# 	对于服务器证书，CN 必须与访问时的域名完全匹配（例如 lab.test 或 *.lab.test 通配符）。
# 	如果是 IP 访问，需要额外在 SAN（Subject Alternative Name）扩展中指定，仅靠 CN 已不推荐（Chrome 等浏览器已弃用 CN 匹配）。
# -out server.csr：将生成的 CSR 保存为 server.csr 文件


结果：得到 server.csr 文件——这是一个尚未签名的证书申请文件，包含了公钥和身份信息，但还没有被任何 CA 签名，因此本身不是有效证书。
```

第三步：CA 在申请表上盖章（签发证书）

```shell
printf 'subjectAltName=DNS:lab.test\n' > san.ext
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out server.crt -days 825 -sha256 -extfile san.ext
    
# openssl x509 -req	以"请求签名"模式运行，将 CSR 转换为 X.509 证书
# -in server.csr	输入文件：之前生成的证书签名请求
# -CA ca.crt	指定签发者的证书（根CA证书）
# -CAkey ca.key	指定签发者的私钥（根CA私钥）
# -CAcreateserial	自动创建序列号文件 ca.srl，每次签发递增，确保每个证书有唯一序列号
# -out server.crt	输出文件：最终生成的服务器证书
# -days 825	有效期 825天（约2年3个月），比常见的365天稍长
# -sha256	使用 SHA-256 哈希算法签名（安全，取代已弃用的 SHA-1）
# -extfile san.ext	引用外部扩展文件，将 SAN 信息嵌入到证书中

使用公安局局长的证书和私钥进行签名，最终签发证书
```



首先这里讲明白，加 `-x509`和不加的区别是什么

带`-x509` :直接生成一张**成品证书**——"我给自己发一张证书"

不带`-x509` :生成一个**申请文件（CSR）**——"我要申请一张证书，这是我的信息"

<u>什么是申请文件（CSR）？</u>

**CSR = Certificate Signing Request = 证书签名请求**

它是一个**文本文件**，里面装着你申请证书时需要的"申请信息"。

使用这个命令来查看一下CSR里面有什么 `openssl req -text -noout -in server.csr`

```shell
Certificate Request:
    Subject: CN=lab.test          # ① 域名：我要给哪个网站申请证书
    Subject Public Key Info:       # ② 我的公钥（配对的私钥在我自己手里）
        Public Key: (2048 bit)
            04:7b:3f:a2:...
    Attributes:
        (none)
    Signature Algorithm: sha256WithRSAEncryption
        28:1f:5a:...              # ③ 数字签名：证明这个申请确实是我发的
        

域名（CN）	"我要给 lab.test 申请证书"
公钥	我的公钥，CA 要用它来加密证书里的内容
签名	用我的私钥签的，证明这个申请确实是我发的
注意：CSR 里没有私钥！ 私钥永远只留在你自己手里
```



所有命令的执行完后，查看一下目录，发现已经有很多东西

````shell
root@pc3507:~/https-lab/ca# ls
ca.crt  ca.key  san.ext  server.crt  server.csr  server.key
````

然后我们来查看一下两种证书有什么区别

```shell
# 进入ca证书的目录
cd /root/https-lab/ca
 
# 查看一下根证书有什么内容  ca.crt
root@pc3507:~/https-lab/ca# openssl x509 -in ca.crt -text -noout | grep -E "Subject:|Issuer:"
        Issuer: CN = Lab Test Root CA
        Subject: CN = Lab Test Root CA ← 根：自己给自己签（天经地义）

# 查看一下服务器证书有什么内容 server.crt
root@pc3507:~/https-lab/ca# openssl x509 -in server.crt -text -noout | grep -E "Subject:|Issuer:"
        Issuer: CN = Lab Test Root CA
        Subject: CN = lab.test ← 换人了！章是 CA 盖的
```

 现在我们把新证书和私钥复制到 Nginx 挂载的证书目录,并且重新启动nginx

```shell
cp /root/https-lab/ca/server.crt /root/https-lab/nginx/certs/lab.test.crt
cp /root/https-lab/ca/server.key /root/https-lab/nginx/certs/lab.test.key

docker exec https-lab-nginx nginx -s reload
```

再次进行 `curl -sS https://lab.test/`后，却再次发生了异常，提示如下：

```shell
root@pc3507:/usr/local/share/ca-certificates# curl -sS https://lab.test/
curl: (60) SSL certificate problem: unable to get local issuer certificate
More details here: https://curl.se/docs/sslcerts.html

curl failed to verify the legitimacy of the server and therefore could not
establish a secure connection to it. To learn more about this situation and
how to fix it, please visit the web page mentioned above.
```

这个错误是：**curl 找不到能验证 `lab.test` 服务器证书的上级 CA 证书**

所以我们需要做的，就是 把你自己创建的"公安局"（CA）正式登记到操作系统的"可信机构名单"里**

```bash
cd /root/https-lab/ca

cp ca.crt /usr/local/share/ca-certificates/lab-test-root-ca.crt
#/usr/local/share/ca-certificates/ 系统专门存放"用户自定义根证书"的文件夹 

update-ca-certificates	
# 扫描 /usr/local/share/ca-certificates/ 文件夹里所有的 .crt 文件
# 把它们全部加载到系统的全局信任库 /etc/ssl/certs/ca-certificates.crt 中
# 从此系统里的所有程序（curl、wget、openssl、apt 等）都认这个 CA
```

**最终验证：**

```text
root@pc3507:~# curl -sS https://lab.test/
https-lab page v1
```



待续

课程进行中，后面的内容（Compose + 反代收尾、生产证书从哪来、实验清理）讲完会持续追加到本文。



