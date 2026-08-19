---
title: "PC 微信小程序抓包复盘：为什么「成都房小团」解不出小区单价"
sidebarGroup: "项目与工作流"
shortTitle: "房小团抓包复盘"
order: 23
date: 2026-08-19
category: "笔记"
tag:
  - "微信小程序"
  - "mitmproxy"
  - "Proxifier"
  - "抓包"
  - "mmtls"
---

> 目标很简单：从 PC 微信里的「成都房小团」小程序，抓取某个区域的**小区名字**和**参考单价**，导出 CSV。  
> 结果也很明确：抓包环境搭起来了，微信流量能截到，但业务数据走的是微信自有加密通道 **mmtls**，常规 HTTPS 中间人解不出明文 JSON。  
> 这篇文章按真实过程记录：做了什么、环境怎么配、如何抓包、卡在哪里、以及后续替代方案。

---

## 一、原始目标与约束

### 1.1 业务目标

| 项 | 内容 |
|---|---|
| 数据源 | PC 微信小程序「成都房小团」 |
| 字段 | 小区名字、参考单价 |
| 范围 | 先做一个区域/板块 |
| 输出 | CSV |
| 使用场景 | 本机微信可见的业务信息整理 |

### 1.2 技术约束（一开始的假设）

最初的假设是：

1. 小程序列表页会请求自己的后端 HTTPS 接口  
2. 用本机代理截获微信进程流量  
3. 安装 mitmproxy CA 后，能看到 JSON  
4. 再把接口参数写成脚本，按区域分页拉取

这个假设对很多 App / H5 成立，但对**当前 PC 微信小程序**不成立——后面会用实测数据证明。

### 1.3 合规边界

全程只做「本机账号正常浏览产生的流量观察」，没有走破解微信加密、绕过证书锁定、逆向拆包等方向。  
分享链接形如 `#小程序://成都房小团/...`，只能在微信内打开，不是可爬的普通网页。

---

## 二、项目与目录

本地脚手架项目：

```text
C:\Users\chengongyi\Projects\fangxiaotuan-scraper
```

主要结构：

```text
fangxiaotuan-scraper/
  config.yaml                 # 区域、关键词、接口草稿配置
  requirements.txt            # requests / PyYAML / mitmproxy
  src/
    capture_addon.py          # mitmproxy 插件：落盘 JSON + 流量索引
    analyze_captures.py       # 分析抓包，推断接口
    parse_captures.py         # 离线解析导出 CSV
    scrape_area.py            # 接口配置就绪后的区域拉取
    parse_extract.py          # 小区名/单价启发式提取
  proxifier/
    fangxiaotuan-mitm.template.ppx
    fangxiaotuan-mitm.ppx     # 生成后的 Proxifier 配置
  scripts/
    start_mitm.ps1            # 启动 mitmdump（自动避让占用端口）
    setup_proxifier.ps1       # 生成并加载「只代理微信」配置
    setup_env.ps1             # 一键：装 Proxifier / 信 CA / 启抓包
    restart_capture.ps1       # 重启抓包会话
  data/
    captures/                 # 业务 JSON（本次为空）
    debug/flows_index.jsonl   # 全量 HTTP 索引（有数据）
    exports/                  # CSV 导出目录
    samples/                  # 示例抓包，用于自测解析逻辑
```

Python 环境：虚拟环境 `.venv`，本机验证过 `Python 3.11`。

---

## 三、整体抓包架构

```text
┌─────────────┐     Proxifier 强制代理      ┌──────────────┐
│ Weixin.exe  │ ─────────────────────────► │ mitmdump     │
│ WeChatAppEx │   127.0.0.1:8888           │ + addon      │
└─────────────┘   (HTTPS CONNECT / HTTP)   └──────┬───────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────────┐
                     ▼                            ▼                            ▼
              期望：业务 HTTPS              实际：微信 mmtls              落盘
           xxx.huanjutang.com/...      extshort.weixin.qq.com/mmtls/...   captures/*.json
           明文 JSON（小区/单价）         密文，CA 解不开                 flows_index.jsonl
```

要点：

- **不设系统全局代理去抓微信**（很多情况下微信不走系统代理）  
- 用 **Proxifier** 只代理：
  - `Weixin.exe`（新版 PC 微信主程序）
  - `WeChat.exe`（旧名兼容）
  - `WeChatAppEx.exe`（小程序运行时，非常关键）
- mitmproxy 以 **regular HTTP(S) 代理**方式监听，Proxifier 侧代理类型用 **HTTPS（CONNECT）**，并额外配了 HTTP 80 端口规则

本机微信实际路径示例：

```text
H:\Program Files\Tencent\Weixin\Weixin.exe
...\xwechat\xplugin\plugins\RadiumWMPF\...\WeChatAppEx.exe
```

---

## 四、环境是怎么配起来的

### 4.1 Python / mitmproxy

```powershell
cd C:\Users\chengongyi\Projects\fangxiaotuan-scraper
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

抓包启动（脚本会自动避开被占用的端口）：

```powershell
.\scripts\start_mitm.ps1
# 等价于：mitmdump -s src/capture_addon.py -p <port> --set block_global=false
```

### 4.2 端口冲突

第一次启动失败：

```text
[Errno 10048] bind on address ('0.0.0.0', 8080)
```

原因：本机 `8080` 被 **Node.js** 占用。  
处理：`start_mitm.ps1` 改为自动尝试 `8080 → 8081 → 8082 → 8888 → 9080`。  
本次实际长期使用的是 **`8888`**。

### 4.3 Proxifier

本机原本没有 Proxifier，后续通过官方安装包静默安装了试用版：

```text
C:\Program Files (x86)\Proxifier\Proxifier.exe
```

配置由脚本生成：`proxifier/fangxiaotuan-mitm.ppx`

规则逻辑：

1. `localhost / 127.0.0.1` → Direct（避免回环）  
2. 微信相关进程的 443 → HTTPS 代理到 mitm  
3. 微信相关进程的 80 → HTTP 代理到 mitm  
4. 其它进程 → Direct（不全机走代理）

加载方式：

```powershell
.\scripts\setup_proxifier.ps1 -Port 8888 -Open
```

### 4.4 mitmproxy CA 证书

证书位置：

```text
C:\Users\chengongyi\.mitmproxy\mitmproxy-ca-cert.cer
```

已用管理员权限写入本机「受信任的根证书颁发机构」：

```powershell
certutil -addstore root mitmproxy-ca-cert.cer
```

验证：证书存储中可见 `CN=mitmproxy`。

> 重要结论提前说：  
> **CA 装成功，只代表能解密标准 TLS/HTTPS。**  
> 它**不能**解密微信 mmtls。

### 4.5 一键脚本

`scripts/setup_env.ps1` 把下面步骤串起来：

1. 确保 venv / 依赖  
2. 生成并信任 CA  
3. 下载安装 Proxifier（若缺失）  
4. 启动 mitmdump  
5. 生成并 `silent-load` Proxifier 配置  

事后用于恢复网络时，需要把抓包栈关掉（见文末）。

---

## 五、抓包插件做了什么

`src/capture_addon.py` 挂在 mitmdump 上，职责分两层：

### 5.1 全量索引（排查用）

每条 HTTP(S) 响应写一行到：

```text
data/debug/flows_index.jsonl
```

字段包括：`method / url / host / path / status / content_type / body_len / json_like / mmtls`。

### 5.2 业务 JSON 落盘（目标用）

当响应体像 JSON，且（调试期）开启 `save_all_json`，或命中关键词/主机提示时，写入：

```text
data/captures/*.json
```

关键词与主机提示配置在 `config.yaml`，例如：`小区`、`单价`、`均价`、`huanjutang`、`fxt` 等。

### 5.3 解析链路（接口就绪后才用得上）

```text
抓包 JSON
  → analyze_captures（找候选接口、写 discovered_api 草稿）
  → 人工补 field_map
  → scrape_area / parse_captures
  → data/exports/*.csv
```

解析器用启发式字段名匹配「名称 + 单价」，并用 `data/samples/sample_capture.json` 自测通过（示例数据可导出 2 条）。  
**真实抓包阶段没有业务 JSON 进入这条链路。**

---

## 六、真实时间线（做了什么）

1. **立项与脚手架**  
   创建 `fangxiaotuan-scraper`，初始化 git、配置、抓包/分析/导出脚本。

2. **启动 mitm 失败 → 修端口**  
   `8080` 被 Node 占用；脚本改为自动换端口。

3. **改为 Proxifier 只代理微信**  
   生成 `.ppx`，覆盖 `Weixin / WeChat / WeChatAppEx`。

4. **一键配环境**  
   安装 Proxifier 试用版、信任 CA、监听 `8888`、加载配置。

5. **用户打开小程序，能正常看列表，但没有 captures JSON**  
   查日志：几乎全是 `POST .../mmtls/...`。

6. **放宽插件：记录全部流量索引 + 保存所有 JSON**  
   重启抓包后再测。

7. **专项监控约 3 分钟**（用户打开小程序并翻页）  
   结果见下一节。

8. **分享链验证**  
   用户提供 `#小程序://成都房小团/gwvimsWBLrH3aVG`  
   确认这是微信内短链，浏览器打不开，无法转成普通爬虫目标。

9. **关闭环境**  
   用户反馈微信登录异常后，停止 mitmdump / Proxifier，恢复代理栈。

---

## 七、关键实测结果

### 7.1 监控窗口结果（代表性一次）

| 指标 | 结果 |
|---|---|
| HTTP 流量条数 | 14 |
| mmtls 占比 | 14 / 14 |
| `json_like` | 0 |
| `data/captures` 业务文件 | 无 |

典型 URL：

```text
POST http://extshort.weixin.qq.com/mmtls/...
POST http://61.151.230.226/mmtls/...
```

日志里还出现过原始 TCP 转发到微信相关 IP 的非明文 HTTP 流，同样不是可解析的业务 JSON。

### 7.2 现象与解释

| 现象 | 解释 |
|---|---|
| Proxifier / mitm 有连接日志 | 代理链路工作正常 |
| 小程序仍能刷列表 | 业务通道仍通，只是不走「可被 CA 解密的 HTTPS」 |
| 有 CA 仍无 JSON | CA 只管标准 TLS；mmtls 是微信自有协议 |
| `#小程序://...` 无网页 | 分享物不是 H5 URL |

一句话：

> **不是证书没装好，而是对方没把「小区名 / 参考单价」放在能用这张 CA 解开的通道里。**

---

## 八、知识点：HTTPS MITM vs 微信 mmtls

| | 标准 HTTPS | 微信 mmtls |
|---|---|---|
| 证书体系 | 系统信任的公钥 CA | 微信自有密钥体系 |
| 装 mitmproxy CA | 通常可解密（无证书锁定时） | 基本无效 |
| 抓包可见内容 | URL、Header、JSON | 多为 `/mmtls/...` 密文 |
| 本次是否命中 | 期望命中，实际未命中业务面 | 实测全部命中 |

因此「浏览器抓包经验」不能直接迁移到「PC 微信小程序」。

---

## 九、过程中踩过的坑

1. **8080 端口冲突（Node）** → 自动换端口  
2. **PowerShell 脚本中文乱码** → UTF-8 BOM + `chcp 65001`  
3. **只代理 Weixin 不够** → 必须包含 `WeChatAppEx.exe`  
4. **小程序能用 ≠ 能解密** → 可能正说明流量走了微信通道  
5. **抓包影响微信登录** → 用完必须关 Proxifier / mitm；系统里若还有 `127.0.0.1:7897`（Clash 等）是另一套代理，勿与 mitm 混淆  

关闭抓包环境的做法：

```powershell
Get-Process mitmdump,Proxifier -ErrorAction SilentlyContinue | Stop-Process -Force
```

然后完全退出并重启微信。

---

## 十、后续替代方案（给业务/领导对齐用）

既然 MITM 路径已证伪，可选：

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| A. 屏幕 OCR | PC 微信翻页，截图识别小区名/单价 | 仍来自房小团界面 | 需半自动翻页，有识别误差 |
| B. 半自动文本 | 复制列表文字后脚本清洗 CSV | 快、准 | 人工成本高 |
| C. 公开网页源 | 贝壳等站点抓同类字段 | 可自动化 | 不是房小团原数据，口径可能不同 |
| D. 官方合作 | 谈接口 / 导出 / 采购 | 最稳、最合规 | 周期长 |

**不建议继续加码：** 破解 mmtls、证书锁定绕过、逆向拆包——不确定、合规风险高、投入产出差。

决策建议：

- 必须「房小团界面上的数」→ A / B  
- 只要「成都参考单价」→ C  
- 中长期正式用数 → D  

---

## 十一、可复用经验清单

1. 先做 **1～2 页列表的流量索引**，看是业务域名还是 `mmtls`，再决定是否写爬虫。  
2. PC 新版微信进程名是 **`Weixin.exe`**，小程序关键在 **`WeChatAppEx.exe`**。  
3. 微信常不走系统代理，优先 **Proxifier 按进程代理**。  
4. 抓包脚本要处理 **端口占用** 与 **用完必关**，否则会影响登录/上网。  
5. `#小程序://` 链接不能当爬虫入口。  
6. 解析脚本可以先用 **sample JSON** 自测，避免环境问题与解析逻辑问题缠在一起。

---

## 十二、附录：常用命令

```powershell
# 启动抓包
cd C:\Users\chengongyi\Projects\fangxiaotuan-scraper
.\.venv\Scripts\Activate.ps1
.\scripts\start_mitm.ps1

# 加载 Proxifier（端口以 mitm 打印为准）
.\scripts\setup_proxifier.ps1 -Port 8888 -Open

# 看流量索引
Get-Content .\data\debug\flows_index.jsonl | Select-Object -Last 30

# 分析 / 导出（有 captures 时才有意义）
python -m src.analyze_captures
python -m src.parse_captures

# 关闭环境
Get-Process mitmdump,Proxifier -EA SilentlyContinue | Stop-Process -Force
```

---

## 十三、结论

这次把「PC 微信小程序抓业务 JSON」的路径完整走通到了**可证伪**的程度：

- 环境：Python + mitmproxy + Proxifier + 受信任 CA  
- 抓包：进程级代理、全量索引、JSON 落盘链路齐全  
- 结果：流量全是微信 mmtls，**解不出房小团小区/单价明文**  
- 价值：避免继续在错误技术路线上投入，并明确了 OCR / 半自动 / 公开源 / 官方合作四条替代路径

如果后续选定 OCR 或公开源方案，可以在本项目旁另开一条实现线；本仓库作为「MITM 可行性验证」的完整记录保留即可。
