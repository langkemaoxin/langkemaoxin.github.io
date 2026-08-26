---
title: "手写 100 行迷你区块链（师生对话实录）"
sidebarGroup: "地基与密码学"
shortTitle: "05 手写迷你区块链"
order: 5
date: 2026-08-26T00:00:00.000Z
category: "web3区块链"
tag:
  - "web3区块链"
  - "密码学"
  - "区块链基础"
  - "对话实录"
description: 师生对话实录课：把前四篇的零件全部组装成一台能挖矿、能验签、能防篡改、能处理分叉的迷你区块链——含一次当堂翻车的验证函数 bug 复盘，篡改者要连过默克尔根、签名、PoW 三道门，全部 WSL 实机真跑。
---

> **Web3 区块链系列 · 阶段 0 · 地基与密码学 · 第 5/57 篇（阶段 0 收尾）**
> 上一篇：[《钱包与助记词：BIP-39/32/44》](/web3区块链/00-foundations/foundations-04-wallets) · 下一篇：[《比特币白皮书精读与 UTXO 模型》](/web3区块链/01-bitcoin/bitcoin-01-utxo)
> 学习大纲：[《Web3 区块链学习总纲》](/web3区块链/roadmap/web3-00-roadmap)

---

## 写在前面

四篇下来零件摆了一桌子：哈希（指纹）、默克尔树（封印）、签名（身份）、钱包（钥匙工厂）。今天组装——**亲手写一个能挖矿、能转账、能防篡改的迷你区块链**。写完之后，「区块链」这个词对我不再是黑盒；更重要的是，我能准确说出它和你**写不出来**的那些东西（P2P 网络、全球共识）差在哪。

继续对话老办法。这堂课还翻了一次车：老师第一版验证函数有个 bug，篡改实验居然报「OK」——当堂修掉的过程，反而是全课最有价值的十分钟。

课程路线图：

> ① 区块长什么样 → ② 挖矿：nonce 的暴力搜索 → ③ 全节点验证五道关卡 → ④ 篡改者要过三道门 → ⑤ 分叉与最长链 → ⑥ 迷你链 vs 真实链：差距清单

环境：WSL2 Ubuntu-22.04 + Python 3.10（`ecdsa + pycryptodome`）。完整脚本在文末，约 120 行。

---

## 第 1 课：一个区块长什么样

**🧑‍🏫 老师：**

先定零件图纸。一个区块 = **区块头 + 交易列表**，头里有四个关键字段：

```python
class Block:
    def __init__(self, index, txs, prev_hash):
        self.index, self.txs, self.prev_hash = index, txs, prev_hash
        self.timestamp = str(int(time.time()))                          # 时间戳
        self.merkle_root = merkle_root([t["payload"] for t in txs])     # 全部交易的指纹
        self.nonce = 0                                                  # 挖矿计数器

    def header(self):   # 区块头 = 这五样的 JSON
        return json.dumps({"index": self.index, "prev": self.prev_hash,
                           "ts": self.timestamp, "root": self.merkle_root,
                           "nonce": self.nonce}, sort_keys=True)
```

对照真实比特币的区块头（80 字节，字段一模一样只是更紧凑）：`prev_block（前块哈希）`、`merkle_root`、`timestamp`、`nonce`（还有位目标 `bits`——我们用常量 `DIFFICULTY` 代替）。**交易列表本体不在头里**——头只存它们的默克尔根（0.2 篇：32 字节封印全部交易）。

交易本身带签名（0.3 篇的流水线）：

```python
def make_tx(sender, to, amt):
    payload = json.dumps({"from": sender.name, "to": to, "amt": amt}, sort_keys=True)
    return {"payload": payload, "sig": sender.sign(payload)}
```

注意签名对象是**整笔交易的 JSON**（不含 sig 自己）——这个细节是后面篡改实验的第二道门。

> 一句话收口：**区块 = 头（前块哈希/时间戳/默克尔根/nonce）+ 交易列表；交易自带签名，签名盖住整笔转账。**

---

## 第 2 课：挖矿——一场没有捷径的暴力搜索

**🧑‍🎓 学生：** 「挖矿」到底在挖什么？总不能真有个镐头吧？

**🧑‍🏫 老师：**

挖的是 **nonce**。规则简单到粗暴：不断换 nonce，重算区块头的哈希，直到哈希**以前 4 个 0 开头**（真实比特币是「小于某个目标数」，等价）：

```python
DIFFICULTY = "0000"

def mine(self):
    t0 = time.time()
    while True:
        self.attempts += 1
        h = H(self.header())                 # 头里有 nonce，nonce 变头就变
        if h.startswith(DIFFICULTY):
            self.hash = h
            return h
        self.nonce += 1
```

跑起来——挖 3 个块：

```text
===== 挖 3 个块（难度：哈希前 4 个 0） =====
块 0（创世）  nonce= 45504  hash=0000da28b5eae63d0e6f…  45505 次尝试 / 0.28s
块 1           nonce= 10860  hash=0000b226a56fecec7be0…  10861 次尝试 / 0.07s
块 2           nonce= 46668  hash=00004d5b1ab39d631303…  46669 次尝试 / 0.29s
```

看这三行能读出三件事：

- **没有捷径**：找到合格 nonce 靠纯试（几万次），验证它只需**一次**哈希——「难算易验」就是 PoW 的全部性格。为什么这很重要？因为它让「伪造一个区块」和「验证一个区块」的成本差了几个数量级，全节点验证一万条候选链也不费劲，造假者却要烧掉等量电费；
- **次数是随机的**：三个块分别 4.5 万、1 万、4.7 万次尝试——像掷骰子等某个面，期望固定、方差很大（真实比特币某块 1 分钟、某块 40 分钟，同理由）；
- **nonce 证明了劳动**：`hash` 以 `0000` 开头这件事，**任何人重算一次头哈希就能核验**——这就是「工作量证明」的字面意思：合格哈希本身就是工作量的证据。

（真实比特币的难度是浮动的——全网算力涨，目标就自动收紧，把出块时间钉在 10 分钟左右。这个**难度调整机制**是 1.2 篇的主角，我们的迷你链用固定 `0000` 偷了个懒。）

> 一句话收口：**挖矿 = 暴力搜 nonce 让头哈希达标；难算易验 + 结果自带工作量证明，是 PoW 的全部性格。**

---

## 插问 1：「前 4 个 0」怎么就这么难？多加一个 0 会怎样？

**🧑‍🎓 学生：** 哈希输出看起来就是随机数——「0000 开头」的概率多大？难度怎么调？

**🧑‍🏫 老师：**

把哈希输出想成均匀随机数：每个十六进制位取 `0` 的概率是 1/16，连续 4 个 0 的概率是 16⁻⁴ = **1/65536**——所以平均要试 65536 次，跟我们实测的「万次级」对上了。

难度就是**前缀 0 的个数**，每多一个 0，期望尝试次数 ×16：

| 前缀 0 个数 | 平均尝试 | 本机 Python 大约 |
|---|---|---|
| `000`（3 个） | 4 千次 | < 0.05 秒 |
| `0000`（4 个，本课） | 6.5 万次 | ~ 0.2 秒 |
| `00000`（5 个） | 100 万次 | ~ 3 秒 |
| 比特币 2026-08 实况 | ~2⁷⁷ 次 | 全网专用矿机一起跑 |

第 1 篇查过真实链：当前难度 `125807076547197.55`（相对难度 1 的倍数）——**全网每秒尝试量级在数百 EH（10¹⁸ 哈希/秒）**。我们的 `0000` 和它之间隔着 18 个数量级，但**机制完全同构**：改一个字符改一个数，矿工和节点跑的是同一套规则。

> 一句话收口：**每个前缀 0 = 难度 ×16；迷你链与比特币的差别只在 0 的个数，不在机制。**

---

## 第 3 课：全节点怎么验收一个块——五道关卡

**🧑‍🏫 老师：**

块挖出来只是广播的开始。收到块的节点要做**完整验证**——这是「人人记账」能成立的根基，五道关卡写成代码：

```python
def is_valid(chain):
    for i, b in enumerate(chain):
        # ① 交易↔头一致：重算默克尔根，和头里存的比
        if merkle_root([t["payload"] for t in b.txs]) != b.merkle_root:
            return f"块 {i}：交易列表与头里的默克尔根对不上"
        # ② 每笔交易的签名有效（coinbase 除外）
        for t in b.txs:
            if not tx_ok(t):
                return f"块 {i}：交易签名验证失败"
        # ③ 头没被改：重算头哈希，等于存的哈希
        if H(b.header()) != b.hash:
            return f"块 {i}：区块头被改过"
        # ④ PoW 达标：哈希真的以 0000 开头
        if not b.hash.startswith(DIFFICULTY):
            return f"块 {i}：工作量不足"
        # ⑤ 与前块焊牢：prev 指向前一块的哈希
        if i > 0 and b.prev_hash != chain[i-1].hash:
            return f"块 {i}：与前块断开"
    return "OK"
```

对我们的链跑一遍：

```text
===== 全节点验证（签名→交易→PoW→接链） =====
结果: OK
```

占位大纲的「验签名 → 验交易 → 验 PoW → 接链」就是这五行的展开。真实节点的顺序和细节更多（先查交易是否双花、金额是否合法……），骨架完全一致：**每一关都是「重算一遍、和声称的比对」**——因为除了数学，谁也不信。

> 一句话收口：**全节点验证 = 五道「重算比对」关卡（默克尔/签名/头哈希/PoW/链接）；信任的来源不是人，是每一步都可以独立复算。**

---

## 第 4 课：篡改者要过的三道门

**🧑‍🎓 学生：** 该攻击测试了——我把块 1 里的「转账 5」偷改成「500」，这条链还能发现吗？

**🧑‍🏫 老师：**

改一下，验证：

```python
tampered = json.loads(chain[1].txs[0]["payload"]); tampered["amt"] = 500
chain[1].txs[0]["payload"] = json.dumps(tampered, sort_keys=True)
print(is_valid(chain))
```

```text
验证结果: 块 1：交易列表与头里的默克尔根对不上
```

**第一道门（默克尔根）**拦住了：交易变了，重算的根和头里存的对不上。攻击者不认输——「我是矿工，我把头里的 root 也更新掉」：

```python
chain[1].merkle_root = merkle_root([t["payload"] for t in chain[1].txs])
print(is_valid(chain))
```

```text
验证结果: 块 1：交易签名验证失败
```

**第二道门（签名）**拦住了：alice 当初的签名盖住的是 `amt=5` 那条消息，交易一改，签名立即作废——矿工也伪造不了（没有 alice 的私钥，0.3 篇）。

那如果篡改的是**没有签名约束的内容**（比如 coinbase 的收款人）？第三道门兜底：root 一改，**头就变**（③），旧 nonce 的 PoW 作废（④）——攻击者唯一的路是**把块 1 连同后面所有块全部重挖**，还要挖得比诚实全网更快（1.2 篇的 51% 推演）。三道门的分工：

| 门 | 拦截对象 | 依据 |
|---|---|---|
| ① 默克尔根 | 交易列表被换 | 0.2 篇：32 字节封印 |
| ② 签名 | 交易内容被改 | 0.3 篇：签名盖整笔交易 |
| ③+④ PoW 与链式 | 连头一起改的深度伪造 | 本篇：重挖成本 + 5) 与全网赛跑 |

> 一句话收口：**改交易死于默克尔根，改内容死于签名，改头死于 PoW——三道门各借前几篇一个零件，这就是「组装」的含义。**

---

## 插问 2：老师，你的第一版验证函数是不是漏了一道门？

**🧑‍🎓 学生：** 我看到你刚才改脚本了——第一版 `is_valid` 里好像没有「重算默克尔根」那一步？那版会发生什么？

**🧑‍🏫 老师：**

被抓个正着，如实复盘。第一版我只验证了 ③（重算头哈希）和 ⑤（链的焊接），**漏了 ①**。结果篡改实验当场翻车：改完交易金额，`is_valid` 居然返回 `OK`——因为攻击者只要**不动区块头**，头哈希当然还能重算一致，而我的代码根本没去核对「交易列表 ↔ 头里的根」。

这个 bug 的教学价值极高，它暴露了一个直觉误区：**「验证哈希链」不等于「验证区块内容」**。哈希链只保证「头没被改」；交易列表是独立的字段，必须显式地重算默克尔根去比对。真实比特币节点的验证清单里这条赫然在列（`CheckBlock`：先验 merkle root 一致，再验每笔交易、PoW……）。密码学零件都是对的，**验证流程漏一步，整个保险柜就形同虚设**——这也是 6.7 篇审计方法论「按清单走」的第一课预演。

> 一句话收口：**验证函数少一步 = 保险柜少一面墙；「重算默克尔根比对交易」与「重算头哈希」缺一不可，安全流程要用清单保证，不靠手感。**

---

## 第 5 课：分叉与最长链

**🧑‍🏫 老师：**

最后一个零件：两个矿工**同时**挖出下一个块怎么办？链分叉了。模拟——从同一个创世块后长出两条竞争链：

```text
===== 分叉：两条竞争链，最长者胜 =====
A 链长度 2（A块1 hash=000049ac4140bae3…）
B 链长度 3（B块1 hash=0000e5712bebedca… ←同一父块的不同孩子）
节点选择 B 链（最长链原则）
>>> A 链块 1 里的交易作废回内存池；两个『块 1』同一 prev、不同内容——就是临时分叉
```

两个「块 1」都合法（各自 PoW 达标、都指向创世块），但**账本不能有两个版本**。规则：节点始终跟随**累计工作量最大**的链（迷你链里简化为最长）。B 链先长出一块，A 链上的节点切换过去，A 块 1 作废——里面的交易回到「内存池」（待打包交易的候车区），等下一个块重新捞。

两条推论值得咀嚼：

- **「6 个确认」的由来**：你的交易刚进的那个块，随时可能处在将被抛弃的分叉上；它后面每多一个块，被推翻的成本就指数上升——等 6 块（约 1 小时）再发货，是比特币世界的实践标准；
- **临时分叉是常态**：几万个节点同时挖，几分钟一次的小分叉天天有——最长链原则让全网**不需要任何协调者**地收敛到同一个历史。这就是第 1 篇插问 2「大家怎么记成同一本账」的答案雏形；1.2 篇把它推到 51% 攻击的极限场景去压力测试。

> 一句话收口：**分叉 = 两个合法的「下一个块」；最长链原则让全网无协调地收敛，落败块里的交易回内存池重排队。**

---

## 第 6 课：迷你链 vs 真实链——差距清单

**🧑‍🎓 学生：** 我们这台机器和比特币之间，到底差多少？

**🧑‍🏫 老师：**

写一张诚实的差距清单——每一行都是接下来几篇的预告：

| # | 迷你链 | 真实比特币/以太坊 | 哪篇补 |
|---|--------|-------------------|--------|
| 1 | 单机一条链 | 几万节点 P2P 广播、各自验证 | 1.2 / 2.4 |
| 2 | 固定难度 `0000` | 每 2016 块自动调难度，钉住 10 分钟 | 1.2 |
| 3 | 转账 = 签名即可 | **UTXO 模型**：花的是「上次收到的零钱」，找零是自付 | 1.1 |
| 4 | 不查余额（可以无限签） | 全节点维护 UTXO 集 / 状态树，双花当场拒绝 | 1.1 / 2.5 |
| 5 | 挖矿奖励是摆设 | 激励经济学：coinbase + 手续费，减半时间表 | 1.2 / 1.4 |
| 6 | 没有「账户/合约」概念 | 以太坊：世界状态机 + 智能合约（EVM） | 2.x / 3.x |
| 7 | 分叉只看长度 | PoS：验证者集、罚没、终局性 | 8.1 |
| 8 | 验证函数 120 行 | 客户端几十万行 + 十七年实战打磨 | — |

但注意清单的**左列**没有一行是错的——区块结构、哈希链、PoW、签名验证、最长链，全是真实链的同构缩小版。写完这 120 行，你已经把「区块链」从名词变成了动词；剩下的差距，全是工程与经济学。

> 一句话收口：**迷你链是真实链的同构缩小：机制全对、规模全无；差距清单就是后面 52 篇的课程表。**

---

## 小结（阶段 0 收官）

组装完毕，阶段 0 五篇的零件全部咬合：

1. **区块结构**：头（prev/时间戳/merkle_root/nonce）+ 交易列表；交易带全字段签名。
2. **挖矿**：暴力搜 nonce，难算易验；`0000` 与比特币差 18 个数量级，机制同构。
3. **验证五道关卡**：默克尔根 ↔ 签名 ↔ 头哈希 ↔ PoW ↔ 链焊接——每关都是「重算比对」。
4. **篡改三道门**：改交易死于默克尔根、改内容死于签名、改头死于 PoW+重挖。
5. **翻车复盘**：漏掉「重算默克尔根」的验证形同虚设——安全流程靠清单不靠手感。
6. **分叉与最长链**：无协调地收敛到同一历史；「6 确认」是分叉风险的实践对冲。
7. **差距清单**：P2P、难度调整、UTXO、激励、状态机、PoS——就是接下来的课程表。

**阶段验收**（占位大纲的两条，现在都应该能脱稿完成）：

- [ ] 脱稿画出「一笔交易从签名到上链」的全流程：钱包签名（0.3）→ 广播进内存池 → 矿工打包进块（本篇）→ 挖出 nonce → 全网节点五道关卡验证 → 后续块逐个焊上（确认加深）
- [ ] 口述哈希、签名、PoW 各自防住什么攻击：哈希防「偷偷改历史」（雪崩+链式）；签名防「冒充别人花钱」（防伪造+防抵赖）；PoW 防「凭空伪造历史」（重挖要烧电+和全网赛跑）

**验收清单**（本篇）：

- [ ] 迷你链跑通且篡改检测实验成功
- [ ] 能列出迷你链与比特币/以太坊的至少 5 条差距（第 6 课表）

**思考题**：攻击者算力占全网 40%（不到 51%），坚持在包含「自己付给商家的交易」之前的一个块开始挖私链——他追上主链的概率随块数怎么变？为什么商家等 6 个确认后基本可以放心？（提示：每落后一块，追上的概率按比例平方级衰减——1.2 篇有完整推演。）

下一篇：[《比特币白皮书精读与 UTXO 模型》](/web3区块链/01-bitcoin/bitcoin-01-utxo)——带着你这台机器去看 17 年前那 9 页论文，看真实链怎么把「钱」本身建模成链上的零钱。

---

## 本篇完整脚本（可照抄，约 120 行）

```python
# minichain.py —— 区块结构 + PoW + 签名 + 验证 + 篡改 + 分叉
import json, time, hashlib, ecdsa
from Crypto.Hash import keccak

def H(s): return hashlib.sha256(s.encode()).hexdigest()
def keccak256(b):
    k = keccak.new(digest_bits=256); k.update(b); return k.digest()

class Account:
    def __init__(self, name):
        self.name = name
        self.sk = ecdsa.SigningKey.from_string(hashlib.sha256(name.encode()).digest(),
                                               curve=ecdsa.SECP256k1)
        self.vk = self.sk.get_verifying_key()
        self.addr = keccak256(self.vk.to_string())[-20:].hex()
    def sign(self, payload):
        return self.sk.sign_digest(keccak256(payload.encode()),
                                   sigencode=ecdsa.util.sigencode_string_canonize).hex()
    def verify(self, payload, sig_hex):
        try:
            return self.vk.verify_digest(bytes.fromhex(sig_hex), keccak256(payload.encode()),
                                         sigdecode=ecdsa.util.sigdecode_string)
        except Exception:
            return False

def make_tx(sender, to, amt):
    payload = json.dumps({"from": sender.name, "to": to, "amt": amt}, sort_keys=True)
    return {"payload": payload, "sig": sender.sign(payload)}

def merkle_root(items):
    if not items: return H("")
    layer = [H(i) for i in items]
    while len(layer) > 1:
        if len(layer) % 2: layer.append(layer[-1])
        layer = [H(layer[i] + layer[i+1]) for i in range(0, len(layer), 2)]
    return layer[0]

DIFFICULTY = "0000"

class Block:
    def __init__(self, index, txs, prev_hash):
        self.index, self.txs, self.prev_hash = index, txs, prev_hash
        self.timestamp = str(int(time.time()))
        self.merkle_root = merkle_root([t["payload"] for t in txs])
        self.nonce, self.hash, self.attempts, self.elapsed = 0, None, 0, 0.0
    def header(self):
        return json.dumps({"index": self.index, "prev": self.prev_hash, "ts": self.timestamp,
                           "root": self.merkle_root, "nonce": self.nonce}, sort_keys=True)
    def mine(self):
        t0 = time.time()
        while True:
            self.attempts += 1
            h = H(self.header())
            if h.startswith(DIFFICULTY):
                self.hash, self.elapsed = h, time.time() - t0
                return h
            self.nonce += 1

def is_valid(chain, accounts):
    for i, b in enumerate(chain):
        if merkle_root([t["payload"] for t in b.txs]) != b.merkle_root:
            return f"块 {i}：交易列表与头里的默克尔根对不上"
        for t in b.txs:                                   # 验签（coinbase 跳过）
            p = t["payload"]
            if p.strip().startswith("{"):
                frm = json.loads(p)["from"]
                if frm not in accounts or not accounts[frm].verify(p, t["sig"]):
                    return f"块 {i}：交易签名验证失败"
        if H(b.header()) != b.hash:
            return f"块 {i}：区块头被改过"
        if not b.hash.startswith(DIFFICULTY):
            return f"块 {i}：工作量不足"
        if i > 0 and b.prev_hash != chain[i-1].hash:
            return f"块 {i}：与前块断开"
    return "OK"

if __name__ == "__main__":
    alice, bob = Account("alice"), Account("bob")
    accts = {"alice": alice, "bob": bob}
    chain = [Block(0, [{"payload": "coinbase: 50 -> miner"}], "0"*64)]
    chain[0].mine()
    for i in (1, 2):
        b = Block(i, [make_tx(alice, bob.addr, 5*i)], chain[-1].hash)
        b.mine(); chain.append(b)
    print("整链验证:", is_valid(chain, accts))
    # 篡改实验 / 分叉实验：按正文第 4、5 课展开
```

---

## 参考资料

- [比特币白皮书](https://bitcoin.org/bitcoin.pdf)（本篇是它的可运行摘要：PoW、默克尔、最长链）
- [比特币开发者文档 — Block Chain Overview](https://developer.bitcoin.org/block-chain-guide.html)
- [Mastering Ethereum — 区块与 PoW 直觉](https://github.com/ethereumbook/ethereumbook)（中译《精通以太坊》）
- 本机：WSL2 Ubuntu-22.04 + Python 3.10（ecdsa + pycryptodome）
