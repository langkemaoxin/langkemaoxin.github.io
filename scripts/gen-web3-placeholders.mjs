// 一次性脚本：按《Web3 区块链学习总纲》生成 57 篇占位文档。
// 用法：node scripts/gen-web3-placeholders.mjs
// 重新生成会覆盖同路径占位文件，正文已撰写的文章请勿放在这些路径下。

import fs from "node:fs";
import path from "node:path";

const ROOT = "E:/MyGithub/langkemaoxin.github.io/src/web3区块链";
const GUIDE = "/web3区块链/roadmap/web3-00-roadmap";

// 文件夹 -> 侧边栏分组名（sidebarGroup 与 scripts/sidebar/web3区块链.mjs 的 title 一致）+ 默认 tag
const FOLDERS = {
  "00-foundations": { group: "地基与密码学", tags: ["密码学", "区块链基础"] },
  "01-bitcoin": { group: "比特币", tags: ["比特币"] },
  "02-evm": { group: "以太坊核心", tags: ["以太坊", "EVM"] },
  "03-solidity": { group: "Solidity 与 Foundry", tags: ["Solidity", "Foundry"] },
  "04-tokens": { group: "代币标准", tags: ["代币标准", "OpenZeppelin"] },
  "05-dapp": { group: "DApp 全栈", tags: ["DApp", "前端"] },
  "06-security": { group: "安全攻防", tags: ["安全"] },
  "07-defi": { group: "DeFi 协议", tags: ["DeFi"] },
  "08-l2": { group: "共识与扩容", tags: ["Layer2", "扩容"] },
  "09-capstone": { group: "生态与毕业", tags: ["实战"] },
};

/** 57 篇文章数据（顺序 = 学习顺序 = 总纲阶段顺序）
 * f: 文件名  d: 目录  t: 标题  s: shortTitle  st: 阶段标签
 * unit: 对应总纲单元  p: 要解决的问题  k: 知识点  e: 实验  a: 验收
 * xt: 额外 tag  ms: 阶段验收（收尾篇）
 */
const A = [
  // ---------- 阶段 0：地基与密码学 ----------
  {
    f: "foundations-01-why-blockchain", d: "00-foundations", st: "阶段 0 · 地基与密码学",
    t: "Web3 全景：区块链到底在解决什么问题", s: "01 Web3 全景",
    unit: "阶段 0 · 单元 0.1",
    p: "在没有中心化机构背书的情况下，两个互不信任的人怎么就「谁欠谁多少钱」达成一致？这是整个 Web3 存在的理由。先把问题、术语版图和学习靶子立起来，后面每一篇都在回答这一篇提出的问题。",
    k: [
      "拜占庭将军问题与分布式共识的白话表述",
      "双花问题：数字文件天然可复制，为什么「复制钱」是个大问题",
      "中心化账本 vs 分布式账本：信任锚从机构移到数学",
      "Web1（只读）/ Web2（读写，平台托管）/ Web3（读写，自己持有）的演进",
      "「Not your keys, not your coins」：自托管的意义",
      "术语版图：区块链 / 公链 / 联盟链 / 智能合约 / DApp / DeFi / L2 各指什么",
    ],
    e: [
      "画一张「中心化支付 vs 比特币转账」的信任链对比图（各需要信任谁）",
      "安装 MetaMask、切到测试网、领取测试币并完成第一笔转账",
      "在区块浏览器上找到这笔转账，记下交易哈希与区块高度",
    ],
    a: [
      "能用自己的话向别人解释「区块链解决了什么问题」",
      "完成测试网第一笔转账并能在浏览器上找到它",
    ],
  },
  {
    f: "foundations-02-hash-merkle", d: "00-foundations", st: "阶段 0 · 地基与密码学",
    t: "哈希函数与默克尔树：区块链的指纹术", s: "02 哈希与默克尔树",
    unit: "阶段 0 · 单元 0.2",
    p: "区块链上任何内容（交易、区块、状态）都会被压缩成一串固定长度的「指纹」，篡改一个字符指纹就面目全非——哈希是区块链全部安全性的地基，而默克尔树让「证明某笔交易在某个区块里」不需要下载整个区块。",
    k: [
      "密码学哈希的三大性质：确定性、抗碰撞性、单向性",
      "雪崩效应：输入微变 → 输出巨变（为什么这让篡改无处遁形）",
      "keccak256 与 SHA-256：以太坊与比特币各自的选型",
      "哈希指针：怎么用「前块哈希」把区块串成一条不可篡改的链",
      "默克尔树：叶子、内部节点、根；SPV 轻验证的原理",
      "哈希承诺与 commit-reveal 模式初见（为后面的白名单埋钩子）",
    ],
    e: [
      "用 Python/JS 对同一段内容计算哈希，改动一个字符观察输出变化",
      "手写一个默克尔树：对 4 笔交易建树，生成第 3 笔的默克尔证明并独立验证",
      "推演：篡改第 2 笔交易后，各级哈希与区块头如何全部失效",
    ],
    a: [
      "能解释「改了区块里的任何一笔交易，后面所有区块头会发生什么」",
      "能说清默克尔证明的验证路径与它省下的数据量",
    ],
  },
  {
    f: "foundations-03-keys-signatures", d: "00-foundations", st: "阶段 0 · 地基与密码学",
    t: "公私钥与数字签名：从私钥到地址", s: "03 公私钥与签名",
    unit: "阶段 0 · 单元 0.3",
    p: "为什么一个签名就能证明「这笔交易确实是这个地址的主人发起的」，而任何人都无法伪造、本人也无法抵赖？账户的「所有权」到底意味着什么？这一篇把区块链的身份体系拆开。",
    k: [
      "非对称加密 vs 对称加密：为什么公开验证、私密持有",
      "secp256k1 椭圆曲线的直觉理解（不需要数学证明）",
      "私钥 → 公钥 → 地址的完整推导链（256 位随机数 → 0x 开头 20 字节地址）",
      "ECDSA 签名与验证：r、s、v 三个参数各是什么",
      "为什么签名不泄露私钥、改一个比特验证就失败",
      "消息签名 vs 交易签名；ecrecover：合约如何从签名恢复出地址",
    ],
    e: [
      "用 cast wallet new 或 Python 库生成密钥对并推导地址",
      "对一条消息签名，再验证签名；篡改消息后观察验证失败",
      "用 ecrecover 思路在脚本里从签名恢复出签名者地址",
    ],
    a: [
      "能画出从 256 位随机数到地址的推导流程图",
      "能解释签名如何同时做到防伪造与防抵赖",
    ],
  },
  {
    f: "foundations-04-wallets", d: "00-foundations", st: "阶段 0 · 地基与密码学",
    t: "钱包与助记词：BIP-39/32/44", s: "04 钱包与助记词",
    unit: "阶段 0 · 单元 0.4",
    p: "12 个英文单词为什么能管理无数把私钥？丢了助记词会发生什么？硬件钱包凭什么更安全？这一篇讲清「钱包」的本质——它不是装钱的容器，而是密钥管理器。",
    k: [
      "钱包的本质：私钥集合 + 签名工具，链上根本没有「钱包」这个对象",
      "BIP-39 助记词：从熵到 12/24 个单词的生成与校验",
      "BIP-32 分层确定性钱包：主密钥与子密钥派生",
      "BIP-44 派生路径规则：m/44'/60'/0'/0/0 每一段是什么",
      "keystore 文件与 Web3 secret storage（加密私钥）",
      "热钱包 / 冷钱包 / 硬件钱包 / 多签的安全模型对比",
    ],
    e: [
      "用 cast wallet 从助记词派生 5 个地址（派生路径号递增），验证地址各不相同",
      "把 MetaMask 导出的私钥与派生结果对照，确认第一路径一致",
      "纸面推演：助记词泄露 vs 助记词丢失，两种情况各自的后果",
    ],
    a: [
      "能解释「同一助记词为什么能在所有链上用」",
      "能列出至少 3 种钱包形态的信任假设与适用场景",
    ],
  },
  {
    f: "foundations-05-mini-blockchain", d: "00-foundations", st: "阶段 0 · 地基与密码学",
    t: "手写 100 行迷你区块链", s: "05 手写迷你区块链",
    unit: "阶段 0 · 单元 0.5",
    p: "把前面所有零件（哈希、签名、区块结构、PoW）组装起来——亲手写一个能挖矿、能转账、能防篡改的迷你区块链。写完之后，「区块链」这个词对你不再是黑盒。",
    k: [
      "区块结构：区块头（前块哈希 / 时间戳 / nonce / 默克尔根）+ 交易列表",
      "PoW 挖矿循环：难度目标与 nonce 搜索",
      "最长链原则与临时分叉的直观理解",
      "全节点如何验证一个新区块（验签名 → 验交易 → 验 PoW → 接链）",
      "迷你链与真实链的差距清单：共识协议、P2P 网络、激励机制、状态管理",
    ],
    e: [
      "用 Python 或 TS 实现迷你区块链：挖出 3 个区块",
      "篡改第 2 块的一笔交易，验证后续整条哈希链断裂、链被拒绝",
      "给转账加上简化签名验证（复用单元 0.3 的代码）",
    ],
    a: [
      "迷你链跑通且篡改检测实验成功",
      "能列出迷你链与比特币/以太坊的至少 5 条差距",
    ],
    ms: {
      n: "阶段 0",
      items: [
        "脱稿画出「一笔交易从签名到上链」的全流程",
        "口述哈希、签名、PoW 各自防住什么攻击",
      ],
    },
  },

  // ---------- 阶段 1：比特币 ----------
  {
    f: "bitcoin-01-utxo", d: "01-bitcoin", st: "阶段 1 · 比特币",
    t: "比特币白皮书精读与 UTXO 模型", s: "01 白皮书与 UTXO",
    unit: "阶段 1 · 单元 1.1",
    p: "中本聪 9 页论文怎么解决双花？UTXO「未花费输出」模型和银行账户模型差在哪？为什么这个设计让比特币「安全但难编程」？理解了它，才理解以太坊为什么换赛道。",
    k: [
      "白皮书逐节精读：时间戳服务器、PoW、网络、激励、简化支付验证",
      "UTXO 模型：交易 = 消费若干输入 + 产生若干输出，找零是自付",
      "一笔比特币交易的结构：vin / vout / locktime",
      "UTXO vs 账户模型：隐私、并行性、状态大小的对比",
      "为什么 UTXO 天然防双花（一个输出只能被花一次）",
    ],
    e: [
      "在区块链浏览器上找一笔真实交易，画出它的输入来自哪些 UTXO、输出去了哪",
      "纸面推演「A→B 转账后，B 再转给 C」的 UTXO 创建与消费流转",
    ],
    a: [
      "能画出任意比特币交易的 UTXO 流向图",
      "能说清 UTXO 与账户模型各自的优劣",
    ],
  },
  {
    f: "bitcoin-02-pow", d: "01-bitcoin", st: "阶段 1 · 比特币",
    t: "挖矿、难度调整与最长链：51% 攻击推演", s: "02 挖矿与最长链",
    unit: "阶段 1 · 单元 1.2",
    p: "全世界几千个节点没有老板，怎么对「下一个区块是谁挖的」达成一致？难度调整为什么让出块稳定在 10 分钟左右？51% 攻击到底能做什么、不能做什么？",
    k: [
      "PoW 全流程：交易进内存池 → 矿工打包 → nonce 搜索 → 广播与验证",
      "难度调整公式与 2016 块重定位周期",
      "最长链原则：临时分叉如何产生、如何被最长链消化",
      "51% 攻击的能力边界：能双花、能审查，不能改规则、不能偷别人的币",
      "算力、矿池集中度与能源争议（了解）",
    ],
    e: [
      "给阶段 0 的迷你区块链加上难度调整，观察不同难度下的出块时间",
      "纸面推演一次双花攻击的完整时序：向商家付一笔、暗中挖更长的链重写",
    ],
    a: [
      "能解释难度调整如何让出块时间稳定",
      "能说清 51% 攻击能做与不能做的事，以及为什么",
    ],
  },
  {
    f: "bitcoin-03-script", d: "01-bitcoin", st: "阶段 1 · 比特币",
    t: "比特币脚本：一种故意不做完的编程语言", s: "03 比特币脚本",
    unit: "阶段 1 · 单元 1.3",
    p: "比特币其实也有「智能合约」，但它是故意设计成图灵不完备的——没有循环、没有复杂状态。为什么安全要靠「少做事」来换？P2PKH 脚本怎么一步步验证一笔花费？",
    k: [
      "基于栈的脚本虚拟机：操作数入栈、OP_DUP、OP_HASH160、OP_CHECKSIG",
      "P2PKH：locking script 与 unlocking script 的完整执行推演",
      "P2SH 与多签脚本（m-of-n）",
      "Taproot（P2TR）：Schnorr 签名与 MAST（了解级）",
      "图灵不完备的设计动机：可预测性、无停机问题、攻击面最小化",
    ],
    e: [
      "解码一个 P2PKH 的脚本，逐操作码手推栈的变化直到验证通过",
      "纸面构造一个 2-of-3 多签的 P2SH 花费流程",
    ],
    a: [
      "能逐操作码推演 P2PKH 验证",
      "能说出比特币脚本「不做」哪些事及安全上的理由",
    ],
  },
  {
    f: "bitcoin-04-tradeoffs", d: "01-bitcoin", st: "阶段 1 · 比特币",
    t: "比特币的取舍与现状：为什么需要以太坊", s: "04 比特币的取舍",
    unit: "阶段 1 · 单元 1.4",
    p: "比特币明明最安全，为什么「世界计算机」的重任落在了以太坊身上？区块大小战争、Taproot、减半时间表——理解比特币的取舍，就是理解所有后来者的设计起点。",
    k: [
      "比特币的定位取舍：结算层 vs 计算平台",
      "区块大小之争与隔离见证（历史脉络，理解社区治理的代价）",
      "Taproot 升级与闪电网络（了解级）",
      "下次减半：预计 2028-04，区块 1,050,000，奖励 3.125 → 1.5625 BTC（2026-08 核验）",
      "量子安全议题：社区尚无软分叉时间表（2026-08 现状）",
      "从比特币到以太坊：图灵完备的诱惑与代价",
    ],
    e: [
      "整理一张「比特币 vs 以太坊」设计取舍对比表（账户/脚本/出块/共识/定位）",
      "查当前区块高度，计算距下次减 halving 还有多少区块",
    ],
    a: [
      "能说出比特币「不做」哪些事及原因",
      "能论证「世界计算机为什么需要新链而不是给比特币加功能」",
    ],
    ms: {
      n: "阶段 1",
      items: [
        "口述：一笔比特币交易从钱包到最终确认的全旅程",
        "UTXO 与账户模型对比，及各自适合的应用形态",
      ],
    },
  },

  // ---------- 阶段 2：以太坊核心 ----------
  {
    f: "evm-01-accounts", d: "02-evm", st: "阶段 2 · 以太坊核心",
    t: "账户模型与状态机：以太坊的世界状态", s: "01 账户与状态机",
    unit: "阶段 2 · 单元 2.1",
    p: "以太坊是一个「全局状态机」——这句话到底是什么意思？EOA 和合约账户的边界在哪？EIP-7702 之后这条边界为什么变模糊了？本篇建立看懂后面一切的地基视角。",
    k: [
      "世界状态：地址 → 账户对象（nonce / balance / storageRoot / codeHash）",
      "EOA（外部账户）vs CA（合约账户）：谁能发起交易、谁只有代码",
      "状态机视角：交易是状态转移函数 S' = ST(S, TX)",
      "EIP-7702（Pectra，2025-05 上线）：EOA 临时委托合约代码执行",
      "状态增长问题与无状态化方向（了解）",
    ],
    e: [
      "用 cast 查询一个 EOA 和一个合约账户的 nonce / balance / code，对比差异",
      "在浏览器上找到一笔 7702 类型交易，观察授权列表的效果",
    ],
    a: [
      "能画出「状态 + 交易 → 新状态」的转移图",
      "能说清 EOA 与 CA 的区别及 7702 带来的变化",
    ],
  },
  {
    f: "evm-02-transactions", d: "02-evm", st: "阶段 2 · 以太坊核心",
    t: "交易全解：类型、签名与 EIP-1559 费用", s: "02 交易与费用",
    unit: "阶段 2 · 单元 2.2",
    p: "一笔交易从 MetaMask 点确认到被打包，中间发生了什么？legacy / 2930 / 1559 / 4844 / 7702 五种类型怎么区分？baseFee 销毁和 priorityFee 给验证者——你的 Gas 费到底付给了谁？",
    k: [
      "交易字段逐个拆解：to / value / data / gasLimit / chainId / accessList / 授权列表",
      "交易类型演进：Legacy → EIP-2930（访问列表）→ EIP-1559（费用市场）→ EIP-4844（blob）→ EIP-7702（授权）",
      "EIP-1559：baseFee（销毁）+ priorityFee（小费）的双价机制",
      "交易签名、交易哈希与 RLP 编码（看懂即可）",
      "nonce 与内存池生命周期：pending → packed → finalized",
    ],
    e: [
      "用 cast 发一笔 EIP-1559 交易，在浏览器逐字段解读，算出实际费用构成",
      "故意用错 nonce（重发旧 nonce / 跳号），复现「替换交易」与「卡住」现象",
    ],
    a: [
      "能逐字段解释浏览器里的任意一笔交易",
      "能算出一笔交易实际花费的费用构成（baseFee × gas + priorityFee × gas）",
    ],
  },
  {
    f: "evm-03-evm-gas", d: "02-evm", st: "阶段 2 · 以太坊核心",
    t: "EVM 执行模型与 Gas：逐条执行一笔交易", s: "03 EVM 与 Gas",
    unit: "阶段 2 · 单元 2.3",
    p: "EVM 是一台什么样的计算机？为什么每条指令都要收费？同样一个功能，为什么有人写花 50 万 Gas、有人只花 10 万？看懂这一篇，Solidity 的每个语法选择都有了价格标签。",
    k: [
      "EVM 架构：栈（1024 深）、内存（临时）、calldata（只读）、storage（持久）、字节码",
      "常用 opcode 分类：算术 / 比较 / 栈操作 / 环境 / 内存 / 存储 / 调用",
      "ABI 编码：函数选择器与参数怎么变成 calldata",
      "Gas 计费：intrinsic cost、opcode 单价、SLOAD/SSTORE 的存储天价",
      "gasLimit 耗尽 → out of gas → 整笔回滚",
      "EVM 目标版本（shanghai / prague）与差分（了解）",
    ],
    e: [
      "用 forge debug 单步跟踪一笔简单调用，观察栈与存储的变化",
      "同功能两种写法（calldata vs memory 参数、storage 重复读 vs 缓存局部变量）实测 Gas 差",
    ],
    a: [
      "能把一段简单 Solidity 编译后的 opcode 与源码行对应起来",
      "能解释「为什么存储读写最贵、calldata 最便宜」",
    ],
  },
  {
    f: "evm-04-nodes-rpc", d: "02-evm", st: "阶段 2 · 以太坊核心",
    t: "节点与 JSON-RPC：亲手当一次客户端", s: "04 节点与 RPC",
    unit: "阶段 2 · 单元 2.4",
    p: "MetaMask 背后连的是谁的节点？eth_call 和 eth_sendRawTransaction 有什么本质区别？本地 anvil 与远程节点各适合什么场景？这一篇之后，你和链之间不再有中间商。",
    k: [
      "执行层客户端（Geth/Nethermind…）与共识层客户端的分工（The Merge 后）",
      "JSON-RPC 常用方法：eth_getBalance / eth_call / eth_sendRawTransaction / eth_getLogs / eth_blockNumber",
      "读 vs 写的本质：状态查询不花 Gas、交易改变状态必须花 Gas",
      "RPC 提供商（Alchemy/Infura/公共 RPC）与速率限制",
      "开发者网络谱系：anvil 本地链、Sepolia/Holesky 测试网、主网 fork",
    ],
    e: [
      "用 cast 直接调 JSON-RPC 完成查余额、读合约、发交易三件事",
      "用 anvil --fork-url 主网分叉，查询真实合约状态（如某 ERC-20 总量）",
    ],
    a: [
      "能脱稿列出常用 RPC 方法并按读/写分类",
      "能解释 MetaMask、RPC 节点、区块链三者的关系",
    ],
  },
  {
    f: "evm-05-storage", d: "02-evm", st: "阶段 2 · 以太坊核心",
    t: "状态存储：MPT、RLP 与存储槽（了解级）", s: "05 状态存储",
    unit: "阶段 2 · 单元 2.5",
    p: "几百 GB 的「世界状态」到底存在什么结构里？为什么轻节点只下载区块头就能验证一笔交易？Solidity 里每个状态变量在存储里的位置怎么定？本篇为 Solidity 阶段的 gas 优化埋下地基。",
    k: [
      "默克尔帕特里夏树（MPT）：状态树、交易树、收据树三棵树的关系",
      "RLP 编码：看懂编码结果即可，不要求手写",
      "区块头的 stateRoot / transactionsRoot / receiptsRoot 各证明什么",
      "轻验证（SPV 思路在以太坊的对应物）",
      "合约存储布局：slot 0,1,2… 与映射/动态数组的存储位置（keccak 计算）",
      "SSZ 与共识层数据结构（了解）",
    ],
    e: [
      "用 cast storage 逐 slot 读取一个真实合约，与源码变量对照",
      "写一个简单合约，先纸面推演每个变量的 slot 位置，再实测验证",
    ],
    a: [
      "能画出三棵树与区块头的关系图",
      "能推出给定合约各变量的 slot 位置（含一个映射和一个动态数组）",
    ],
    ms: {
      n: "阶段 2",
      items: [
        "脱稿讲清一笔交易从钱包签名到 EVM 执行再到状态更新的完整旅程（含费用构成）",
      ],
    },
  },

  // ---------- 阶段 3：Solidity 与 Foundry ----------
  {
    f: "solidity-01-foundry-setup", d: "03-solidity", st: "阶段 3 · Solidity 与 Foundry",
    t: "Foundry 上手：forge、anvil、cast、chisel", s: "01 Foundry 上手",
    unit: "阶段 3 · 单元 3.1",
    xt: ["实战"],
    p: "2026 年的以太坊开发标准工具链是 Foundry（v1.0 稳定版）——一条命令装好编译、测试、本地链、调试、交互五件套。先把工具用顺，后面所有代码都在它上面跑。",
    k: [
      "foundryup 安装（WSL2 下官方脚本）与版本管理",
      "forge init 项目结构：src / test / script / lib / foundry.toml",
      "anvil：秒起本地链、预置账户、时间旅行（为测试埋钩子）",
      "cast：发交易 / 调合约 / 查链 / 算 keccak / 管钱包的多面手",
      "chisel：Solidity REPL，快速试语法",
      "工具链选型：Foundry vs Hardhat vs Remix（为什么主线选 Foundry）",
    ],
    e: [
      "WSL2 安装 Foundry 并 forge init 第一个项目",
      "起 anvil，用 cast 给预置账户互转一笔 ETH，再查余额",
      "在 chisel 里计算 1 ether 等于多少 wei、keccak256(\"hello\") 是什么",
    ],
    a: [
      "独立完成「建项目 → 起本地链 → 部署示例合约 → cast 调用」全流程",
    ],
  },
  {
    f: "solidity-02-syntax-basics", d: "03-solidity", st: "阶段 3 · Solidity 与 Foundry",
    t: "Solidity 语法 I：合约骨架、值类型与函数", s: "02 语法 I 骨架与类型",
    unit: "阶段 3 · 单元 3.2",
    p: "一个 .sol 文件由什么组成？uint256 / address / bool 在 EVM 层面对应什么？public/private 与 view/pure 分别控制什么？——先写出第一个结构清晰的合约。（基准 Solidity 0.8.36）",
    k: [
      "pragma 与编译器版本策略（0.8.36；只有最新版收安全补丁）",
      "合约、状态变量、函数的最小骨架与 SPDX 声明",
      "值类型：uint/int 系列、address、bool、bytes32、enum",
      "address 的成员：balance 与转账三兄弟初见",
      "函数可见性（public/private/internal/external）与状态可变性（view/pure/payable）",
      "构造函数、immutable、constant 的初始化时机",
      "unchecked 块：0.8 默认溢出检查的例外与适用场景",
    ],
    e: [
      "写一个 Bank 合约：存款、查余额、只读统计三个函数，可见性/可变性标注正确",
      "forge build 编译通过 + forge test 跑通第一个测试",
      "在 chisel 里故意触发溢出，对比 checked 与 unchecked 的行为",
    ],
    a: [
      "能独立写出含正确可见性/可变性标注的合约并解释每个选择",
      "能说出 immutable 与 constant 的区别",
    ],
  },
  {
    f: "solidity-03-data-location", d: "03-solidity", st: "阶段 3 · Solidity 与 Foundry",
    t: "语法 II：引用类型与数据位置", s: "03 语法 II 数据位置",
    unit: "阶段 3 · 单元 3.3",
    p: "storage / memory / calldata 三个数据位置是 Solidity 新手的第一道坎，也是 Gas 优化的第一战场——同一个函数签名换一个位置，Gas 能差数倍。",
    k: [
      "三种位置：storage（链上持久）、memory（临时副本）、calldata（只读入参）",
      "赋值语义：什么时候是引用（改一个另一个也变）、什么时候是拷贝",
      "string 与 bytes 的特殊性（为什么不便宜）",
      "结构体/数组在不同位置之间传递的拷贝成本",
      "数据位置的默认规则（参数默认 calldata/memory、局部变量默认 storage 引用）",
      "Gas 实测：同功能不同位置的消耗对比",
    ],
    e: [
      "同一函数分别用 memory 和 calldata 参数，forge test 里用 gas-report 对比",
      "故意写错位置触发编译错误，逐条读懂编译器报错",
      "写一个「storage 引用被意外修改」的例子，验证两处变量同变",
    ],
    a: [
      "能对任意变量说出它该在哪个位置及原因",
      "能预测引用赋值与拷贝赋值的行为差异",
    ],
  },
  {
    f: "solidity-04-mappings-events", d: "03-solidity", st: "阶段 3 · Solidity 与 Foundry",
    t: "语法 III：映射、数组、结构体与事件", s: "04 语法 III 映射与事件",
    unit: "阶段 3 · 单元 3.4",
    p: "链上怎么存「谁存了多少钱」这样的表？事件日志为什么被称为「免费的只读数据库」？custom error 为什么比 revert 字符串省 Gas？——本篇是状态建模三件套 + 可观测性。",
    k: [
      "mapping：O(1) 读写、不可遍历、键集合模式补遍历",
      "数组：memory 数组 vs storage 数组、push/pop/slice、越界行为",
      "结构体：定义、嵌套、作为映射的值",
      "事件与日志：indexed 参数、topics 与 data、过滤器查询",
      "事件存哪里、谁付钱、为什么便宜、删不掉",
      "错误处理：require / revert / assert 的语义分工",
      "custom error（0.8.4+）与 require 的自定义错误形式（0.8.24+）",
    ],
    e: [
      "实现「存款排行」合约：mapping + 地址数组键集合",
      "用 cast logs 过滤自己合约发出的事件，观察 indexed 与非 indexed 参数的去向",
    ],
    a: [
      "能解释事件存哪、谁付钱、怎么查、为什么不适合存关键业务状态",
      "能列出 require/revert/assert 各自的适用场景",
    ],
  },
  {
    f: "solidity-05-oop", d: "03-solidity", st: "阶段 3 · Solidity 与 Foundry",
    t: "继承、接口、库与抽象合约", s: "05 继承与接口",
    unit: "阶段 3 · 单元 3.5",
    p: "Solidity 的面向对象和 Java 有什么不同？多继承的线性化顺序为什么重要？为什么「接口」是与任意已部署合约对话的唯一方式？——本篇之后，你写的不再是孤立合约，而是能组合的组件。",
    k: [
      "is 继承与 C3 线性化：most-base-first 的书写顺序",
      "构造函数参数传递的两种写法（继承列表里 / 修饰器风格）",
      "virtual / override 与 super 关键字的调用路径",
      "接口 interface 与 ABI 的关系：函数选择器从哪来",
      "库 library：internal 调用被编译器内联、using...for 语法",
      "抽象合约 abstract：放共享实现 vs 纯接口的选择",
    ],
    e: [
      "写 Father→Son 继承链，用事件打点观察构造顺序与 super 调用路径",
      "定义 IERC20 接口，读主网上任意 ERC-20 合约的 name/balanceOf",
    ],
    a: [
      "能画出多继承合约的线性化顺序",
      "能解释 interface、library、abstract 三者的使用边界",
    ],
  },
  {
    f: "solidity-06-payable-eth", d: "03-solidity", st: "阶段 3 · Solidity 与 Foundry",
    t: "收付款实战：payable、fallback 与转账三种方式", s: "06 收付款实战",
    unit: "阶段 3 · 单元 3.6",
    p: "合约怎么收钱、怎么转钱、怎么「带着钱调用别人」？transfer/send/call 三兄弟为什么要背熟？——重入攻击的种子就在这一篇埋下（阶段 6 回来拆弹）。",
    k: [
      "payable 函数与 msg.value；不带 payable 收钱的隐式路径（coinbase/自毁）",
      "receive() 与 fallback() 的触发规则与区别",
      "三种转账：transfer（2300 gas 固定）、send（同上限不回滚）、call{value:}()（推荐）",
      "call 带 calldata：带钱调用其他合约的函数",
      "地址 payable 类型与类型转换",
      "selfdestruct 的现状（EIP-6780 后语义变化，了解）",
      "push vs pull 支付模式初见（为安全篇埋钩子）",
    ],
    e: [
      "实现「给合约转账 + 合约按指令转出」全流程",
      "分别用三种方式向一个 revert 的合约转账，对比 gas 消耗与失败表现",
    ],
    a: [
      "能说清三种转账方式在 gas 与安全上的差异及推荐选择",
      "能解释 receive 和 fallback 分别在什么场景被触发",
    ],
  },
  {
    f: "solidity-07-testing", d: "03-solidity", st: "阶段 3 · Solidity 与 Foundry",
    t: "Foundry 测试：cheatcodes、fuzz 与 invariant", s: "07 测试三连",
    unit: "阶段 3 · 单元 3.7",
    xt: ["实战"],
    p: "合约代码「写完」不等于「对」——fuzz 让机器帮你枚举刁钻输入，invariant 让机器随机组合操作序列找协议级漏洞。这两个技能是资深与入门的分水岭之一。",
    k: [
      "forge test 命令体系与 -vv/-vvv 的失败诊断层级",
      "断言：assertTrue / assertEq / assertApproxEqRel 与错误断言",
      "cheatcodes：vm.deal / vm.prank / vm.warp / vm.expectRevert / vm.expectEmit",
      "基于性质的 fuzz：参数随机化、vm.assume 与 bound",
      "invariant 测试：targetContract、handler 模式、不变式怎么设计",
      "forge coverage 覆盖率与 forge snapshot / gas-report",
    ],
    e: [
      "给 Bank 合约写单测 + fuzz（「存后即取，余额归零」性质）+ invariant（「总账守恒」）",
      "故意在合约里埋一个 bug（如减法下溢），验证 fuzz/invariant 能抓到",
    ],
    a: [
      "能为任意合约设计至少 3 条有意义的 invariant",
      "能让 fuzz 抓到自己埋的 bug 并读懂反例输出",
    ],
  },
  {
    f: "solidity-08-deploy-verify", d: "03-solidity", st: "阶段 3 · Solidity 与 Foundry",
    t: "部署与验证：forge script、Sepolia 与 Etherscan", s: "08 部署与验证",
    unit: "阶段 3 · 单元 3.8",
    xt: ["实战", "部署"],
    p: "合约写好测好，怎么让全世界用上？脚本化部署、私钥安全管理、测试网落地、源码验证——这是「本地玩家」到「主网工程师」的临门一脚。",
    k: [
      "forge script：脚本化部署、broadcast、多网络配置",
      "私钥管理三选一：环境变量 / cast wallet / keystore 文件（绝不硬编码进代码）",
      "Sepolia 测试网与水龙头获取测试 ETH",
      "Etherscan 源码验证：forge verify 与 API key",
      "部署的本质：constructor 在部署交易里执行",
      "CREATE vs CREATE2：合约地址怎么算、为什么 CREATE2 能预计算（初见）",
    ],
    e: [
      "把 Bank 合约用 forge script 部署到 Sepolia，并在 Etherscan 完成源码验证",
      "用 CREATE2 在本地预计算一个合约地址，再部署验证地址一致",
    ],
    a: [
      "全流程独立完成：脚本部署 → 浏览器可读可交互 → 源码验证通过",
      "能解释 CREATE 与 CREATE2 生成地址的差别",
    ],
    ms: {
      n: "阶段 3",
      items: [
        "综合实验「众筹合约」：目标金额/截止时间/退款逻辑，fuzz + invariant 全覆盖，部署 Sepolia 并验证",
        "口述 Solidity 数据位置与 Gas 的关系",
      ],
    },
  },

  // ---------- 阶段 4：代币标准与合约工程 ----------
  {
    f: "tokens-01-erc20", d: "04-tokens", st: "阶段 4 · 代币标准",
    t: "ERC-20 与 OpenZeppelin：亲手发一个代币", s: "01 ERC-20",
    unit: "阶段 4 · 单元 4.1",
    xt: ["实战"],
    p: "USDT、UNI、PEPE 背后都是同一个接口标准——为什么标准如此重要（不标准就没人能集成你）？approve/transferFrom 授权模型怎么工作，又埋着什么坑？",
    k: [
      "ERC-20 六函数二事件：totalSupply / balanceOf / transfer / approve / transferFrom + Transfer / Approval",
      "approve 授权模型：为什么转账给别人要两步（授权 → 转移）",
      "无限授权的便利与风险、approve 竞态问题",
      "decimals 约定与最小单位换算（18 位惯例）",
      "OpenZeppelin ERC20 实现精读：站在巨人肩膀上的正确姿势",
      "扩展：mintable / burnable / capped 的组合方式",
    ],
    e: [
      "基于 OZ 发行自己的测试代币并部署到 Sepolia",
      "在浏览器上完成「授权 → 第三方 transferFrom」全流程",
      "写一个用 IERC20 接口与任意代币交互的小合约",
    ],
    a: [
      "能背出 ERC-20 六函数二事件及各自语义",
      "能解释 approve 竞态问题及缓解方式（先置 0 再设值）",
    ],
  },
  {
    f: "tokens-02-erc721-1155", d: "04-tokens", st: "阶段 4 · 代币标准",
    t: "ERC-721 / ERC-1155：NFT 与元数据", s: "02 ERC-721/1155",
    unit: "阶段 4 · 单元 4.2",
    xt: ["实战"],
    p: "一张 jpg 凭什么叫「NFT」？链上存的到底是什么、图片在哪？721 和 1155 分别适合什么场景？——发完自己的 NFT 合集，这些问题全部落地。",
    k: [
      "ERC-721：tokenId、ownerOf、safeTransferFrom、approve/setApprovalForAll",
      "元数据：tokenURI、链上元数据（直接返回 JSON）vs 链下（IPFS 指针）",
      "safeTransferFrom 为什么 safe：接收方回调检查",
      "ERC-1155：多 token 标准、批量转账、单合约多合集的省 gas 设计",
      "ERC-165 接口发现：supportsInterface",
      "铸造实战：merkle 白名单空投初见（为 defi 阶段埋钩子）",
    ],
    e: [
      "基于 OZ 发行一个 NFT 合集（元数据结构先行设计）并完成铸造",
      "对比同样 1000 个 token 用 721 与 1155 的部署/铸造 gas 差异",
    ],
    a: [
      "能解释「NFT 拥有的到底是什么」（链上凭证 vs 链下内容的绑定关系）",
      "能为给定场景在 721/1155 间做出选择并说明理由",
    ],
  },
  {
    f: "tokens-03-erc4626", d: "04-tokens", st: "阶段 4 · 代币标准",
    t: "ERC-4626 金库标准与通胀攻击", s: "03 ERC-4626",
    unit: "阶段 4 · 单元 4.3",
    p: "所有「存币生息」产品（yearn、Pendle……）都长一个样——ERC-4626 把金库接口标准化了。它也是「通胀攻击」这个经典漏洞的策源地：攻击者如何用第一笔存款偷走后续存款人的资产？",
    k: [
      "ERC-4626 接口：asset / totalAssets / totalShares、deposit/mint/withdraw/redeem、preview 系列",
      "份额价格 = totalAssets / totalShares 的会计模型",
      "通胀攻击（捐赠攻击）完整时序：先捐资产抬高价格 → 首个受害者份额被抹零",
      "防御方案：虚拟份额/虚拟资产偏移（OZ 默认）、死份额、最小存款额",
      "4626 与 DeFi 乐高的关系：可替换的金库组件",
    ],
    e: [
      "基于 OZ 实现一个 Vault（存入某种 ERC-20 赚份额）",
      "不用 OZ 防御时亲手复现一次通胀攻击（偷走受害者份额），再开启防御验证攻击失效",
    ],
    a: [
      "能画出通胀攻击的时序图与每一步的份额价格变化",
      "能说清至少两种防御的原理与代价",
    ],
  },
  {
    f: "tokens-04-upgradeable", d: "04-tokens", st: "阶段 4 · 代币标准",
    t: "可升级合约：代理模式与存储槽", s: "04 可升级合约",
    unit: "阶段 4 · 单元 4.4",
    p: "合约部署后不可改，发现 bug 怎么办？「代理合约」让逻辑可换、存储不变——这是把 Web2 的迭代习惯搬进 Web3 的唯一通道，也是存储槽碰撞事故的高发区。",
    k: [
      "不可变性问题与代理思路：用户永远调代理，代理 delegatecall 到实现合约",
      "delegatecall vs call：在谁的存储上跑谁的代码（阶段 2 存储布局的回扣）",
      "三种代理：EIP-1967（标准槽位）/ Transparent（管理员歧义处理）/ UUPS（升级逻辑在实现里）",
      "存储槽碰撞：变量顺序错位导致数据张冠李戴的灾难",
      "初始化问题：initializer 修饰器 vs constructor（实现合约的 constructor 不会跑在代理上）",
      "升级权限治理：谁能升级（为多签/时间锁埋钩子）",
    ],
    e: [
      "部署 V1 → 升级 V2 的合约，验证存储数据原样保留",
      "故意构造一次存储槽错位（V2 变量顺序改乱），观察数据错乱现场",
    ],
    a: [
      "能解释 delegatecall 与 call 的区别",
      "能说出 UUPS 与 Transparent 的取舍及 OZ 为什么推荐 UUPS",
    ],
  },
  {
    f: "tokens-05-patterns", d: "04-tokens", st: "阶段 4 · 代币标准",
    t: "合约工程模式：工厂、多签与时间锁", s: "05 工程模式",
    unit: "阶段 4 · 单元 4.5",
    p: "真实项目的合约从来不是一个文件：用工厂批量部署、用多签管金库、用时间锁防作恶——工程模式是「能写」到「能上线」之间的一层。",
    k: [
      "工厂模式：一个合约批量创建子合约",
      "CREATE2：地址 = f(创建者, salt, initcode)，确定性地址的用途",
      "多签钱包：Safe 的 m-of-n 模型、提案-确认-执行流程",
      "时间锁 Timelock：延迟执行，给用户退出缓冲",
      "初始化模式与防重入初始化",
      "库生态盘点：OpenZeppelin / Solmate / Solady 的定位差异",
    ],
    e: [
      "写一个工厂合约用 CREATE2 部署子合约并预计算地址",
      "在本地搭一个 2/3 多签流程（提案 → 两人确认 → 执行转账）",
    ],
    a: [
      "能说清 CREATE2 地址由什么决定、有什么用",
      "能解释多签 + 时间锁为什么是治理标配",
    ],
    ms: {
      n: "阶段 4",
      items: [
        "「代币全家桶」：ERC-20 + 721 + 4626 金库（存 20 得份额），全部 fuzz + invariant 覆盖",
        "口述 approve 竞态、通胀攻击、代理存储槽三大坑",
      ],
    },
  },

  // ---------- 阶段 5：DApp 全栈 ----------
  {
    f: "dapp-01-viem", d: "05-dapp", st: "阶段 5 · DApp 全栈",
    t: "客户端 API：viem/ethers 与 JSON-RPC 封装", s: "01 viem 客户端",
    unit: "阶段 5 · 单元 5.1",
    p: "前端怎么和链说话？viem（Wagmi 生态新一代，TypeScript 优先）如何把裸 JSON-RPC 封装成人类可读的 API？存量代码里的大量 ethers v6 又怎么读？",
    k: [
      "viem 核心概念：PublicClient / WalletClient / Chain 配置与 transport",
      "读合约：readContract + ABI 类型化调用",
      "写合约：writeContract → 等待确认 → 拿回执",
      "工具函数：formatEther / parseEther、地址 checksum 校验",
      "ethers.js v6 对照：Provider / Signer / Contract（读存量代码用）",
      "事件监听：watchEvent vs 轮询的取舍",
    ],
    e: [
      "用 viem 完成读余额、读 ERC-20、发交易、调用自写合约四件事",
      "把其中两件事改写成裸 JSON-RPC 请求，对照封装的价值",
    ],
    a: [
      "能独立用 viem 完成读 + 写全流程",
      "能看懂 ethers v6 写的老代码",
    ],
  },
  {
    f: "dapp-02-wallet-connect", d: "05-dapp", st: "阶段 5 · DApp 全栈",
    t: "钱包连接：EIP-1193、EIP-6963 与多钱包", s: "02 钱包连接",
    unit: "阶段 5 · 单元 5.2",
    p: "「Connect Wallet」按钮背后发生了什么？为什么 2024 年后要换成 EIP-6963 多钱包发现？连接、断开、切链、加链的完整生命周期怎么处理才健壮？",
    k: [
      "EIP-1193 provider 标准：request 方法与 accountsChanged / chainChanged 事件",
      "EIP-6963：多钱包发现协议（解决 window.ethereum 被先装钱包抢占的问题）",
      "连接生命周期：connect / disconnect / 账户切换 / 网络切换的状态同步",
      "wallet_switchEthereumChain / wallet_addEthereumChain",
      "wallet_connect 库（AppKit/RainbowKit）的取舍：裸写 vs 用库",
    ],
    e: [
      "不用任何连接库，裸写 EIP-6963 钱包发现与连接组件",
      "连接后故意切账户、切网络，验证前端状态正确刷新",
    ],
    a: [
      "能说清 EIP-1193 与 6963 各解决什么问题",
      "能实现一个处理全生命周期的钱包连接组件",
    ],
  },
  {
    f: "dapp-03-frontend-dapp", d: "05-dapp", st: "阶段 5 · DApp 全栈",
    t: "DApp 前端实战：从 0 到 1 一个完整应用", s: "03 前端实战",
    unit: "阶段 5 · 单元 5.3",
    xt: ["实战"],
    p: "把 Solidity 阶段的众筹合约接上真实前端——读链状态、写链交易、等确认、刷新 UI、处理所有失败分支。这是第一个「产品级」交付物。",
    k: [
      "链状态与前端状态的同步策略：乐观更新 vs 等确认回执",
      "交易三态 UX：pending / success / revert 的界面反馈",
      "wagmi hooks（React）：useAccount / useReadContract / useWriteContract",
      "ABI 导入与 TypeScript 类型生成（自动补全合约方法）",
      "本地联调：anvil + 前端开发服务器 + MetaMask 自定义网络",
      "DApp 的架构谱系：纯链 / 链 + 中心化索引 / 链 + 传统后端",
    ],
    e: [
      "用 React + wagmi + viem 实现众筹 DApp 前端，连本地链跑通全流程",
      "模拟交易失败（比如已截止仍投资），验证 UI 反馈路径",
    ],
    a: [
      "完整交付一个可演示的众筹 DApp（本地链）",
      "能讲清链状态同步的至少两种策略与取舍",
    ],
  },
  {
    f: "dapp-04-graph", d: "05-dapp", st: "阶段 5 · DApp 全栈",
    t: "链上数据与 The Graph 子图", s: "04 子图索引",
    unit: "阶段 5 · 单元 5.4",
    p: "「这个地址的全部历史交易」「全平台 NFT 持有分布」这类查询为什么不能靠 RPC 直接做？事件日志 + 索引器 = 链上数据库——The Graph 是这套范式的标准答案。",
    k: [
      "事件日志结构与 eth_getLogs 的过滤参数（地址/主题/区块范围）",
      "eth_getLogs 的局限：无聚合、无分页语义、性能差",
      "The Graph：subgraph.yaml 清单、schema.graphql 实体建模",
      "mapping handler：把事件映射成实体写入索引库",
      "GraphQL 查询：过滤、排序、分页",
      "本地 graph-node + anvil 的开发流程与部署选择",
    ],
    e: [
      "为众筹合约写一个子图：索引所有参与事件",
      "用 GraphQL 查询「某地址全部参与记录」与「金额 Top10」",
    ],
    a: [
      "能独立完成「合约加事件 → 子图索引 → GraphQL 查询」全链路",
    ],
  },
  {
    f: "dapp-05-storage", d: "05-dapp", st: "阶段 5 · DApp 全栈",
    t: "去中心化存储：IPFS 与 Arweave", s: "05 去中心化存储",
    unit: "阶段 5 · 单元 5.5",
    p: "NFT 的图片、DApp 的前端静态文件放哪？链上太贵、中心化服务器违背初衷——IPFS/Arweave 补上 Web3 存储版图的这块拼图。",
    k: [
      "内容寻址 vs 位置寻址：CID 即地址、哈希即内容指纹",
      "IPFS：DAG 结构、pinning（谁负责保活）、公共网关",
      "Arweave：一次性付费永久存储与 endowment 模型",
      "NFT 元数据最佳实践：tokenURI → IPFS CID（而非某个 http 域名）",
      "DApp 前端部署到 IPFS：完全去中心化的最后一块",
      "Filecoin 等存储激励层（了解）",
    ],
    e: [
      "把 NFT 元数据与图片上传 IPFS，铸造一个指向 CID 的 NFT",
      "分别从两个不同公共网关访问同一 CID，验证内容寻址与网关无关",
    ],
    a: [
      "能解释内容寻址与 URL 寻址的本质区别",
      "能说出 IPFS 与 Arweave 的付费与保活模型差异",
    ],
    ms: {
      n: "阶段 5",
      items: [
        "众筹 DApp 完整体：合约 + 测试 + 前端 + 子图 + IPFS 元数据，本地全链路演示",
      ],
    },
  },

  // ---------- 阶段 6：安全攻防 ----------
  {
    f: "security-01-threat-model", d: "06-security", st: "阶段 6 · 安全攻防",
    t: "攻击面与威胁模型：OWASP 智能合约 Top 10", s: "01 攻击面全景",
    unit: "阶段 6 · 单元 6.1",
    p: "智能合约「代码即法律」，但代码有 bug 就等于法律有漏洞——而且不可撤销、公开可攻击。先建立全景威胁模型，再逐个击破：这个领域的历史教训值几千亿美元。",
    k: [
      "合约安全为何独特：不可篡改 + 公开可攻击 + 资产直连",
      "三层攻击面：私钥（人）/ 合约代码 / 链下（前端、预言机、依赖）",
      "OWASP 智能合约 Top 10（2026 版）速览与 SCWE 弱点枚举",
      "历史大案地图：Ronin（6.2 亿）、Wormhole（3.2 亿）、Euler（2 亿）……金额与根因归类",
      "四大高频根因：重入、访问控制、预言机操纵、MEV",
      "漏洞披露与赏金生态：Immunefi 与白帽文化",
    ],
    e: [
      "整理一份「历史十大盗案」表：金额 / 根因分类 / 对应 Top 10 条目",
      "给自己阶段 3~5 写过的所有合约列一份攻击面清单",
    ],
    a: [
      "能对任意合约画出三层攻击面清单",
      "能把历史案件归因到具体漏洞类别",
    ],
  },
  {
    f: "security-02-reentrancy", d: "06-security", st: "阶段 6 · 安全攻防",
    t: "重入攻击：从 The DAO 到今天的变体", s: "02 重入攻击",
    unit: "阶段 6 · 单元 6.2",
    p: "2016 年 The DAO 360 万 ETH 被盗，直接导致以太坊分叉出 ETC——根因只是一个「先转账、后改状态」。亲手复现它，再理解所有变体与所有防御。",
    k: [
      "重入根因：外部调用发生在状态更新之前（checks-effects-interactions 被破坏）",
      "The DAO 事件始末与硬分叉（历史语境）",
      "经典重入：攻击合约在 fallback 里递归调用提款",
      "变体：跨函数重入、跨合约重入、只读重入（preview 函数被利用）",
      "防御四件套：CEI 顺序、重入锁（nonReentrant）、pull 支付、transfer 的 2300 gas 限制为何不再被视为可靠防御",
    ],
    e: [
      "写一对「受害者 + 攻击者」合约复现经典重入，把钱偷光",
      "基于 4626 金库复现一次只读重入",
      "分别用 CEI 与重入锁修复，验证攻击失效",
    ],
    a: [
      "能脱稿写出可运行的重入攻击最小示例",
      "能识别 preview 类函数的只读重入风险",
    ],
  },
  {
    f: "security-03-access-control", d: "06-security", st: "阶段 6 · 安全攻防",
    t: "访问控制漏洞：权限错置与签名滥用", s: "03 访问控制",
    unit: "阶段 6 · 单元 6.3",
    p: "「谁都能调的 mint」「校验签名不查 nonce」——权限类漏洞常年霸榜。Solidity 没有登录与中间件，权限全部要自己写对。",
    k: [
      "权限模型：onlyOwner 的单点风险 → 角色制 RBAC（OZ AccessControl）",
      "漏加修饰器的高发位置：initialize / mint / setXXX / 提款",
      "中心化风险识别：owner 能 rug 的合约长什么样",
      "签名滥用：重放攻击（缺 nonce / chainId / 域分离）",
      "签名延展性（s 值翻转生成第二个合法签名）",
      "EIP-712 结构化签名（了解，为钱包交互埋钩子）",
    ],
    e: [
      "给自己阶段 3~5 的合约做权限矩阵审查（函数 × 角色），列修复清单",
      "复现一次签名重放：同一签名在另一条链 / 另一笔交易中再次生效",
    ],
    a: [
      "能对任意合约列出完整权限矩阵",
      "能写出带 nonce 与域分离的防重放签名验证",
    ],
  },
  {
    f: "security-04-arithmetic-oracle", d: "06-security", st: "阶段 6 · 安全攻防",
    t: "算术漏洞与预言机操纵", s: "04 算术与预言机",
    unit: "阶段 6 · 单元 6.4",
    p: "精度丢失让用户资产凭空蒸发；用 AMM 现货价做清算触发器，等于给攻击者发提款码。数字与价格，是两大高频赛车场。",
    k: [
      "精度丢失：除法截断（先乘后除原则）、倒数放大、乘法中间值溢出",
      "预言机操纵：单块现货价（reserve 比值）如何被闪电贷瞬间拉高",
      "案例复盘：bZx、Mango 等操纵路径",
      "TWAP（时间加权价）与 Chainlink 聚合价的抗操纵原理",
      "stale price（陈旧价）与 deviation（偏离）检查",
      "闪电贷在攻击中扮演的资金角色（无本攻击详解在 6.5）",
    ],
    e: [
      "写一个精度丢失 bug 合约，用 fuzz 找出丢失的差额",
      "在 anvil 主网分叉上模拟拉价，操纵一个「读现货价」的清算逻辑，再换成 Chainlink 价验证修复",
    ],
    a: [
      "能审计任意金额计算的精度顺序",
      "能说清「为什么清算价不能读 AMM 现货」",
    ],
  },
  {
    f: "security-05-mev", d: "06-security", st: "阶段 6 · 安全攻防",
    t: "MEV：抢跑、三明治与闪电贷攻击", s: "05 MEV 攻防",
    unit: "阶段 6 · 单元 6.5",
    p: "你的交易在内存池里是明文的，搜索者会抢在你前面买、再跟在你后面卖。MEV 是链的「物理规律」，不懂它就理解不了 Gas、滑点与交易为何总在区块顶部。",
    k: [
      "MEV 定义与三类：套利 / 清算（普遍被视为良性）、三明治（对用户有害）",
      "抢跑（front-run）：approve 与加流动性场景的抢跑损失",
      "三明治攻击：监视内存池 → 前买 → 受害者买 → 后卖",
      "闪电贷：无本攻击的资金来源，逐层拆解一次完整攻击的资金流",
      "私有内存池（Flashbots Protect）与 MEV-Share：把 MEV 主导权拿回来",
      "用户侧防御：滑点容忍、拆单、私有提交（了解批量拍卖等协议侧方案）",
    ],
    e: [
      "在 anvil 上手工复现三明治：构造 victim / frontrun / backrun 三笔交易并按序执行，计算受害者损失",
      "用本地主网分叉 + 闪电贷完成一次无本套利（借 → 换 → 换回 → 还）",
    ],
    a: [
      "能画出三明治攻击三笔交易与受害者损失来源",
      "能拆解一次真实闪电贷攻击的完整资金流",
    ],
  },
  {
    f: "security-06-tools", d: "06-security", st: "阶段 6 · 安全攻防",
    t: "工具链：Slither、fuzz 与形式化验证", s: "06 安全工具链",
    unit: "阶段 6 · 单元 6.6",
    p: "人眼会累，机器不会。2026 年审计标配 = Slither 静态扫描 + Foundry fuzz/invariant + 人工复核；形式化验证在关键路径开始落地——工具的价值取决于你会不会读它的输出。",
    k: [
      "Slither：检测器矩阵、常见误报与 triage 方法、自定义检测器（了解）",
      "echidna / medusa 与 Foundry invariant 的分工",
      "形式化验证：Certora / Halmos 的能力边界——写规格比跑工具更难",
      "依赖安全：npm 依赖投毒事件、lockfile 与供应链审查",
      "CI 集成：build → test → slither → fuzz 流水线",
      "怎么读审计报告：severity 分级、PoC、修复验证",
    ],
    e: [
      "用 Slither 扫自己阶段 3~5 的全部合约，逐条修复或豁免告警",
      "给众筹合约写一份 echidna/Halmos 规格并跑通",
      "读一份社区公开审计报告并做笔记",
    ],
    a: [
      "能配置一条本地安全扫描流水线",
      "能读懂公开审计报告并复现其中的 PoC",
    ],
  },
  {
    f: "security-07-audit-method", d: "06-security", st: "阶段 6 · 安全攻防",
    t: "审计方法论：像审计师一样审查合约", s: "07 审计方法论",
    unit: "阶段 6 · 单元 6.7",
    p: "把前六篇的武器按流程串起来：威胁建模 → 架构信任边界 → 逐函数审查 → 攻击树 → PoC → 报告。对一个小型开源协议完成一次完整自查——这是安全阶段的毕业考。",
    k: [
      "审计流程：理解规格 → 画架构与信任边界 → 逐函数审查 → 攻击树 → PoC → 报告",
      "五维审查清单：访问控制 / 金额计算 / 外部调用 / 升级性 / 事件日志",
      "代码异味：魔数、未处理返回值、装饰器缺失、注释与代码不符",
      "公开审计报告精读法：从别人的发现训练自己的眼力",
      "安全开发生命周期：solo → 多签 → 审计 → 赏金",
    ],
    e: [
      "选一个开源小型协议（简单 DEX / 金库），按完整流程产出一份自查审计报告（至少一个真实发现）",
      "对照社区公开审计结果查漏，反思漏看的原因",
    ],
    a: [
      "独立产出一份结构完整的审计报告",
    ],
    ms: {
      n: "阶段 6",
      items: [
        "把自己阶段 3~5 的全部合约按 6.7 流程审一遍：清单 + 报告 + 修复",
        "在本地主网分叉上成功复现一次完整攻击链（闪电贷 + 操纵 + 提取）",
      ],
    },
  },

  // ---------- 阶段 7：DeFi 协议 ----------
  {
    f: "defi-01-landscape", d: "07-defi", st: "阶段 7 · DeFi 协议",
    t: "DeFi 全景与可组合性", s: "01 DeFi 全景",
    unit: "阶段 7 · 单元 7.1",
    p: "没有银行、没有券商，一套自动执行的合约网络怎么长出存款、借贷、交易、保险？「乐高积木」为什么既是蜜糖也是毒药（风险传染）？",
    k: [
      "DeFi 版图：DEX / 借贷 / 稳定币 / 衍生品 / 聚合器 / 保险 分类地图",
      "可组合性：协议互调的收益与风险传染（一个协议出事、全家遭殃）",
      "TVL 与协议收入：怎么读 DefiLlama 数据",
      "DeFi vs 传统金融：清算即代码、7×24、无准入、无最终担保人",
      "级联风险：价格下跌 → 清算 → 再跌 的死亡螺旋推演",
    ],
    e: [
      "在测试网走完一条组合链：swap → 存入借贷 → 抵押借出（小额测试资金）",
      "用 DefiLlama 拉三个协议的 TVL 曲线并写解读",
    ],
    a: [
      "能画出 DeFi 版图并给任意新协议定位",
      "能推演一个级联清算的具体例子",
    ],
  },
  {
    f: "defi-02-amm", d: "07-defi", st: "阶段 7 · DeFi 协议",
    t: "AMM 演进：恒定乘积到集中流动性到 hooks", s: "02 AMM 三代",
    unit: "阶段 7 · 单元 7.2",
    p: "Uniswap 用 x*y=k 干掉了做市商，v3 把资金效率提升数千倍，v4 把池子变成可编程平台——AMM 是 DeFi 的心脏，也是合约工程的巅峰教材。",
    k: [
      "v2 恒定乘积：价格 = 储备比、LP 份额、滑点来源",
      "无常损失推导：为什么「提供流动性可能跑不赢拿住」",
      "v3 集中流动性：价格区间、tick、资本效率与主动管理成本",
      "v4（2025-01 上线）：单例架构省 gas、flash accounting、hooks 生命周期钩子",
      "hooks 的应用与恶意 hook 的风险面",
      "其他曲线一览：Curve 稳定币 AMM（了解）",
    ],
    e: [
      "手算 v2 一笔 swap 后的新价格与滑点，再与公式对照",
      "用 v4 合约/SDK 创建一个带自定义 hook 的池子",
      "给定价格路径，手推 LP 的无常损失数值",
    ],
    a: [
      "能手推 v2 swap 公式与无常损失",
      "能说清 v3 / v4 各自解决什么问题",
    ],
  },
  {
    f: "defi-03-lending", d: "07-defi", st: "阶段 7 · DeFi 协议",
    t: "借贷协议：Aave 的利率模型与清算", s: "03 借贷与清算",
    unit: "阶段 7 · 单元 7.3",
    p: "没有信用评估，凭什么敢借钱给陌生人？答案是超额抵押 + 机器人清算——借贷协议是理解「链上金融自稳性」的最佳样本。",
    k: [
      "供需利率模型：utilization 曲线与 kink 拐点",
      "健康因子：LTV / 清算门槛 / 清算罚金的三角",
      "清算机器人：利润来源与 gas 竞争（与 MEV 篇呼应）",
      "稳定利率与浮动利率的切换",
      "坏账处理与安全模块（了解）",
      "aToken / 债权代币化（与 ERC-4626 呼应）",
    ],
    e: [
      "在测试网 Aave 完成：存款 → 借款 → anvil 改价压低健康因子 → 触发清算的完整实验",
      "画出 utilization 与借贷利率的关系曲线并标注 kink",
    ],
    a: [
      "能算出给定抵押/债务下的健康因子与清算额",
      "能解释清算为什么是系统稳定器而不是风险",
    ],
  },
  {
    f: "defi-04-stablecoins", d: "07-defi", st: "阶段 7 · DeFi 协议",
    t: "稳定币三形态与监管（GENIUS Act 时代）", s: "04 稳定币",
    unit: "阶段 7 · 单元 7.4",
    p: "USDT 一家托管几千亿美元，DAI 靠超额抵押，UST 已死——三种稳定机制各有命门。2025 年美国 GENIUS Act 落地后，合规成了稳定币的新变量。",
    k: [
      "法币抵押型（USDT/USDC）：储备透明度、脱锚与银行挤兑传导",
      "超额抵押型（DAI）：清算链路与 PSM 锚定机制",
      "算法型：UST 崩盘复盘——死亡螺旋的完整机制",
      "稳定币三难：锚定 / 去中心化 / 资本效率 不可兼得",
      "GENIUS Act（2025-07 签署）要点：发行方牌照与储备要求（影响的是合规型）",
      "收益型稳定币与 RWA 的交叉趋势（为 capstone 埋钩子）",
    ],
    e: [
      "写三类稳定币在黑天鹅下的表现推演报告（脱锚时各自发生什么）",
      "复盘一次历史脱锚事件的数据（如 USDC 2023-03 或 USDe），归因链路写清",
    ],
    a: [
      "能画出三种稳定机制的「崩坏路径」",
      "能说清 GENIUS Act 改变了什么、没管住什么",
    ],
  },
  {
    f: "defi-05-oracles-chainlink", d: "07-defi", st: "阶段 7 · DeFi 协议",
    t: "预言机：Chainlink 价格喂送实操", s: "05 预言机",
    unit: "阶段 7 · 单元 7.5",
    p: "链是封闭世界，外部价格怎么进来？Chainlink 的去中心化喂价网络是 DeFi 的隐形基础设施，也是安全篇「预言机操纵」的正面教材。",
    k: [
      "为什么链上拿不到链下价格：EVM 无 I/O、无网络",
      "Chainlink 聚合流程：节点采集 → 中位数聚合 → 链上 Aggregator 合约",
      "正确读取：latestRoundData 的 roundId / updatedAt / answeredInRound 与 stale 检查",
      "TWAP（AMM 内生价）vs 聚合价的适用场景对比",
      "Data Streams 低延迟方案（了解）",
      "VRF：链上可验证随机数",
    ],
    e: [
      "在测试网/主网用 cast 与 Solidity 读取 ETH/USD 价格 feed",
      "写一个带 stale 与 deviation 检查的安全价格读取合约",
    ],
    a: [
      "能写出安全的价格读取合约并解释每个检查防什么",
      "能对比 TWAP 与聚合价的取舍",
    ],
  },
  {
    f: "defi-06-staking-restaking", d: "07-defi", st: "阶段 7 · DeFi 协议",
    t: "质押与再质押：从 ETH Staking 到 EigenLayer", s: "06 质押与再质押",
    unit: "阶段 7 · 单元 7.6",
    p: "PoS 之后 ETH 持有者怎么「存币生息」？再质押把同一份质押安全复用给别的协议（AVS）——收益叠加，风险也叠加：一份安全卖两次。",
    k: [
      "ETH 质押用户侧视角：32 ETH 门槛与流动性质押的出现原因",
      "流动性质押：stETH / wstETH 与 Lido 的双刃剑",
      "再质押 EigenLayer：AVS 租借以太坊安全性的模型",
      "slashing 的传染风险：AVS 作恶 → 再质押者被罚 → LST 脱锚的推演",
      "收益率构成：基础质押 + MEV + 协议激励的叠加",
    ],
    e: [
      "在测试网走一遍流动性质押流程（如 Lido 测试环境或模拟合约）",
      "画出「ETH → stETH → 再质押 AVS」的风险传递图并标注每个环节的罚没来源",
    ],
    a: [
      "能解释再质押「一份安全卖两次」的收益与风险",
      "能算一个组合收益率的示例",
    ],
  },
  {
    f: "defi-07-governance-dao", d: "07-defi", st: "阶段 7 · DeFi 协议",
    t: "治理与 DAO：代币投票的工程实现", s: "07 治理与 DAO",
    unit: "阶段 7 · 单元 7.7",
    p: "「去中心化」的最后一公里是治理：谁有权改参数、升级合约、动金库？ERC-20 Votes + Governor + Timelock 是行业标配三件套——它也是阶段 4 可升级合约「谁能升级」的正式答案。",
    k: [
      "治理代币：ERC-20 Votes 与历史快照（checkpoint）机制",
      "委托投票：delegate 与投票权计算时点",
      "Governor：提案门槛、投票期、法定人数、执行",
      "Timelock：通过 ≠ 立即执行，留出退出时间",
      "治理攻击：买票、闪电贷临时获票（Beanstalk 案例）",
      "什么该链上治理、什么不该（治理最小主义）",
    ],
    e: [
      "用 OZ 部署 Governor + Timelock 全套，走通：发起提案 → 投票 → 时间锁 → 执行",
      "在本地模拟一次「闪电贷临时买票通过恶意提案」的推演",
    ],
    a: [
      "能部署一套治理三件套并走通全流程",
      "能识别一个协议的治理集中度风险",
    ],
  },
  {
    f: "defi-08-tokenomics", d: "07-defi", st: "阶段 7 · DeFi 协议",
    t: "代币经济学：发行、分配与释放曲线", s: "08 代币经济学",
    unit: "阶段 7 · 单元 7.8",
    p: "同样的代码，不同的代币经济学，一个长成协议、一个归零。发行曲线、解锁悬崖、激励飞轮——这是工程与经济的交叉课，也是看懂项目的基本功。",
    k: [
      "供给设计：固定总量 / 增发 / 减半式释放",
      "分配结构：团队 / 投资人 / 社区 / 金库的典型比例与争议",
      "解锁计划：cliff + vesting 的合约实现（OZ VestingWallet）",
      "激励机制：流动性挖矿与「挖卖提」死亡螺旋",
      "价值捕获：手续费分成（fee switch）与销毁机制",
      "诊断框架：一张表评估任意项目的代币经济",
    ],
    e: [
      "用 OZ VestingWallet 实现「1 年 cliff + 3 年线性解锁」",
      "为毕业项目设计一套代币经济并写出参数表与推演",
    ],
    a: [
      "能实现 cliff + linear vesting 合约",
      "能对任意项目做结构化代币诊断",
    ],
    ms: {
      n: "阶段 7",
      items: [
        "测试网组装「迷你 DeFi」：AMM swap + 借贷 + 价格 feed + 治理，串成完整用例并演示一次级联清算",
      ],
    },
  },

  // ---------- 阶段 8：共识、扩容与 L2 ----------
  {
    f: "l2-01-pos-consensus", d: "08-l2", st: "阶段 8 · 共识与扩容",
    t: "PoS 共识：验证者、罚没与 Gasper", s: "01 PoS 共识",
    unit: "阶段 8 · 单元 8.1",
    p: "The Merge 之后以太坊靠百万级验证者达成共识——没有矿机，质押和罚没怎么替代算力？这是理解 L2「安全性从哪来」的前提。",
    k: [
      "PoS 全流程：质押 32 ETH → 成为验证者 → 提议/证明区块",
      "Gasper = Casper FFG（终局性：2/3 多数投票）+ LMD-GHOST（分叉选择：最重子树）",
      "罚没 slashing：双签、环绕投票等可罚行为与罚没经济学",
      "弱主观性与 checkpoint（与「已确认」的语义）",
      "The Merge 的历史与能耗下降（了解）",
      "验证者收益构成（与 7.6 用户侧视角呼应）",
    ],
    e: [
      "推演一次「验证者双签被罚没」的完整过程与被罚金额逻辑",
      "用可视化/测试网观察一次 epoch 终局性的推进",
    ],
    a: [
      "能解释 FFG 与 LMD-GHOST 各解决什么",
      "能说出至少两种会被罚没的行为",
    ],
  },
  {
    f: "l2-02-scaling-roadmap", d: "08-l2", st: "阶段 8 · 共识与扩容",
    t: "扩容路线图：Rollup-centric、blobs 与 PeerDAS", s: "02 扩容路线图",
    unit: "阶段 8 · 单元 8.2",
    p: "以太坊不自己扩容执行，而是把执行外包给 L2、自己专注做「数据可用性」——blobs（EIP-4844）与 Fusaka 的 PeerDAS 是怎么一步步走到今天的？Glamsterdam 又要带来什么？",
    k: [
      "扩容三板斧的取舍：更大区块 / 分片执行 / rollup-centric 路线",
      "数据可用性问题：L1 只需保证「数据可取」而非「亲自执行」",
      "EIP-4844（Dencun，2024-03）：proto-danksharding、blob 独立费用市场",
      "Fusaka（2025-12 上线）：PeerDAS 与 blob 吞吐提升",
      "Glamsterdam（目标 2026 Q3-Q4）：ePBS / BALs / 并行执行展望",
      "danksharding 终局图景（了解）",
    ],
    e: [
      "查历史数据对比同一 L2 在 EIP-4844 前后的单笔成本变化",
      "查当前 blob 目标数/费用并解读对 L2 成本的影响",
    ],
    a: [
      "能解释「为什么 L1 只需保证数据可用而非执行」",
      "能画出 rollup-centric 的分层架构图",
    ],
  },
  {
    f: "l2-03-optimistic-rollup", d: "08-l2", st: "阶段 8 · 共识与扩容",
    t: "Optimistic Rollup 与 OP Stack 实操", s: "03 Optimistic Rollup",
    unit: "阶段 8 · 单元 8.3",
    xt: ["实战"],
    p: "OP Stack 成了发 L2 的标准模板（Base 就是它）——乐观 Rollup 凭什么「先执行、后挑战」？七天挑战期又是怎么回事？亲手把合约部署到 OP 测试网。",
    k: [
      "Optimistic Rollup 原理：排序器 → 批量提交 L1 → 挑战期 → 欺诈证明",
      "七日挑战期与提款体验（为什么快充桥有市场）",
      "OP Stack 模块化：execution / derivation / settlement 分层",
      "Superchain：共享标准的一族链",
      "Stage 0/1/2 去中心化分级（L2BEAT；Base/Arbitrum/OP 已达 Stage 1，2026-01 核验）",
      "排序器中心化风险与强制 inclusion 逃生舱",
    ],
    e: [
      "把众筹合约部署到 OP Sepolia 并完成一笔 L1→L2 测试网桥操作",
      "在 L2BEAT 查一条链的 Stage 与风险评级并写解读",
    ],
    a: [
      "能解释欺诈证明为什么只需要「一个诚实参与者」",
      "能读懂 L2BEAT 的风险评估表",
    ],
  },
  {
    f: "l2-04-zk-rollup", d: "08-l2", st: "阶段 8 · 共识与扩容",
    t: "ZK Rollup：零知识证明与有效性证明", s: "04 ZK Rollup",
    unit: "阶段 8 · 单元 8.4",
    p: "不用挑战期，每个状态根都附带一个数学证明——零知识证明是区块链里最「魔法」的数学。先建立直觉，再看工程落地。",
    k: [
      "ZKP 三要素：证明者 / 验证者 / 简洁性（证明比计算本身短得多）",
      "zk-SNARK vs zk-STARK：可信设置与抗量子差异（了解）",
      "validity proof：执行 trace → 证明 → L1 合约验证",
      "zkEVM 类型学（Type 1~4）：等价性与工程成本的谱系",
      "ZK vs Optimistic 全面对比：提款时间 / 证明成本 / 信任假设",
      "zkSync / Starknet / Linea 现状（了解）",
    ],
    e: [
      "用 circom 或 noir 写一个最简电路（如证明知道哈希原像）并完成验证",
      "对比 OP 与某 zk 链测试网同一操作的费用与到账时间",
    ],
    a: [
      "能用自己的话解释「有效性证明在证什么」",
      "能列出 zk vs optimistic 选型对比表",
    ],
  },
  {
    f: "l2-05-bridges", d: "08-l2", st: "阶段 8 · 共识与扩容",
    t: "跨链桥：机制与史上最大盗案群", s: "05 跨链桥",
    unit: "阶段 8 · 单元 8.5",
    p: "链与链之间没有原生通道，桥是所有跨链资产的命门，也是历史上被盗金额最大的品类（Ronin 6.2 亿、Wormhole 3.2 亿）——机制决定风险。",
    k: [
      "桥的三种形态：lock-mint / burn-mint / liquidity 桥",
      "验证机制谱系：外部验证者 / 多签 / 乐观验证 / ZK 桥",
      "Ronin 案复盘：验证者私钥泄露（密钥管理问题）",
      "Wormhole 案复盘：签名验证被绕过（代码问题）",
      "原生桥 vs 第三方桥；LayerZero / CCIP 等消息协议（了解）",
      "风控直觉：为什么「不要桥大钱」",
    ],
    e: [
      "复盘 Wormhole 攻击的漏洞代码，写一篇笔记讲清绕过原理",
      "分别走一遍 OP 原生桥与一个第三方测试网桥，对比体验与信任假设",
    ],
    a: [
      "能对任意桥画出信任假设图（谁作恶会丢钱）",
      "能说清两大盗案的根因类别差异（人 vs 代码）",
    ],
  },
  {
    f: "l2-06-account-abstraction", d: "08-l2", st: "阶段 8 · 共识与扩容",
    t: "账户抽象：ERC-4337 与 EIP-7702", s: "06 账户抽象",
    unit: "阶段 8 · 单元 8.6",
    xt: ["实战"],
    p: "「忘记私钥 = 资产归零」劝退了九成新用户。账户抽象让钱包变成智能合约：社交恢复、Gas 代付、批量操作——ERC-4337（2600 万+账户）与 EIP-7702 是并行的两条落地路径。",
    k: [
      "EOA 的痛点清单：私钥丢失无恢复 / 必须用 ETH 付 gas / 无法批量",
      "ERC-4337：UserOperation → Bundler → EntryPoint → Paymaster 四组件架构",
      "智能账户与聚合签名（Safe 等，了解）",
      "EIP-7702：EOA 临时委托合约代码，批量交易与 gas 代付的实现",
      "4337 与 7702 的关系：互补而非竞争（新账户 vs 存量账户升级）",
      "Passkey 与新签名曲线（RIP-7212，了解）",
    ],
    e: [
      "在测试网用 4337 技术栈（如 permissionless.js）发一笔 UserOperation 并由 paymaster 代付 gas",
      "用 7702 给自己的 EOA 委托批量转账逻辑，发一笔批量交易",
    ],
    a: [
      "能画出 4337 四组件流程图",
      "能说清 7702 与 4337 的分工",
    ],
    ms: {
      n: "阶段 8",
      items: [
        "把毕业项目的部署目标扩展到 L1 Sepolia + OP Sepolia 双链，用 CREATE2 保证地址一致",
        "口述 Rollup 两条路线、桥的信任假设、账户抽象两条路径的对比",
      ],
    },
  },

  // ---------- 阶段 9：生态与毕业 ----------
  {
    f: "capstone-01-multichain", d: "09-capstone", st: "阶段 9 · 生态与毕业",
    t: "多链生态一瞥：Solana、Move 系与比特币 L2", s: "01 多链生态",
    unit: "阶段 9 · 单元 9.1",
    p: "以太坊之外的世界很大：Solana 的高吞吐单体、Move 系的资源模型、比特币 L2——了解它们与 EVM 的根本差异，架构选型时才不做井底之蛙。",
    k: [
      "Solana：PoH + SVM、账户租金模型、Rust 程序开发初览",
      "Move 系（Sui/Aptus）：资源类型与线性所有权——把安全做进语言",
      "比特币生态：Ordinals / Runes、比特币 L2 的信任模型",
      "EVM 的护城河：网络效应、工具链、开发者存量",
      "跨链格局总览与「多链 vs 单链扩容」之争",
    ],
    e: [
      "在 Solana devnet 完成一笔转账与一个 program 调用（官方入门）",
      "写一份「EVM vs SVM vs Move」编程模型对比笔记",
    ],
    a: [
      "能说清三种编程模型的本质差异",
      "能为给定场景做链选型论证",
    ],
  },
  {
    f: "capstone-02-rwa", d: "09-capstone", st: "阶段 9 · 生态与毕业",
    t: "RWA 与现实资产上链", s: "02 RWA",
    unit: "阶段 9 · 单元 9.2",
    p: "美债、私募信贷、房地产凭证正在代币化（2026-08 核验：六大类 RWA 已上线流通）——机构入场后，链上金融的边界在哪？合规与去中心化的张力如何调和？",
    k: [
      "RWA 六大类地图：美债 / 私募信贷 / 大宗商品 / 房地产 / 股票 / 稳定收益",
      "发行架构：SPV + 托管 + 代币的三层结构",
      "合规层：KYC / 准入控制（许可池）与 Uniswap v4 permissioned hooks 的交叉",
      "链上收益分发：token 化国债怎么付息",
      "传统金融基础设施的动作：BUIDL 等机构产品",
      "RWA 的去中心化悖论：链上代币 vs 链下法律权利的锚定",
    ],
    e: [
      "调研一个 RWA 协议（如 Ondo）的架构并画出信任链",
      "写一份「哪些资产适合先上链」的判断笔记",
    ],
    a: [
      "能画出 RWA 发行的合规架构图",
      "能论证 RWA 与原生 DeFi 的互补 / 竞争关系",
    ],
  },
  {
    f: "capstone-03-final-project", d: "09-capstone", st: "阶段 9 · 生态与毕业",
    t: "毕业设计：全栈 DApp 从 0 到 1", s: "03 毕业设计",
    unit: "阶段 9 · 单元 9.3",
    xt: ["架构"],
    p: "毕业考：不查资料、不用模板，独立交付一个「合约 + 测试 + 安全审查 + 前端 + 子图 + L2 部署 + 账户抽象登录」的完整项目——这就是你作品集的第一件。",
    k: [
      "选题建议：众筹 / 担保交易 / 小型 DEX / 积分系统（任选或自拟）",
      "全流程 checklist：设计 → 实现 → 测试（fuzz/invariant）→ 安全自查（Top 10 清单）→ 前端 → 索引 → 双链部署 → 验证 → 文档",
      "README 与部署脚本的工程化",
      "开源发布与作品集展示（验证链接、测试徽章）",
    ],
    e: [
      "独立完成毕业项目全流程交付",
      "录一段 5 分钟演示或写一篇部署复盘",
    ],
    a: [
      "交付四件套：代码仓库（含 CI 测试）、可演示应用、设计文档、安全自查报告",
    ],
  },
  {
    f: "capstone-04-self-check", d: "09-capstone", st: "阶段 9 · 生态与毕业",
    t: "资深自检 30 问", s: "04 自检 30 问",
    unit: "阶段 9 · 单元 9.4",
    xt: ["面试"],
    p: "学完到底掌握没有？30 问闭卷自测，从密码学到 L2 全域覆盖，答不出的按锚点回补——这也是 Web3 面试前的最后冲刺材料。",
    k: [
      "30 问清单：十个阶段各 3 问（哈希 / 签名 / UTXO / Gas / 数据位置 / 重入 / AMM / 清算 / PoS / Rollup……）",
      "每问标注回补锚点（对应篇目）",
      "60 秒口述训练法：把每题练成面试可用的答案",
      "面试高频题与作答框架（机制 → 取舍 → 案例）",
    ],
    e: [
      "闭卷自测一遍；答不出的回补对应篇目再测",
    ],
    a: [
      "至少 27 问能脱稿讲清楚",
    ],
    ms: {
      n: "阶段 9（毕业）",
      items: [
        "毕业项目四件套交付完成",
        "自检 30 问 ≥ 27 问脱稿通过",
      ],
    },
  },
];

// ---------- 渲染 ----------
const folderOrder = {}; // 每个目录内的 order 计数
let rendered = 0;

const lines = [];

A.forEach((art, i) => {
  const idx = i + 1;
  const folder = FOLDERS[art.d];
  folderOrder[art.d] = (folderOrder[art.d] || 0) + 1;
  const order = folderOrder[art.d];

  const tags = ["web3区块链", ...folder.tags, ...(art.xt || [])];

  const prev =
    idx === 1
      ? `上一篇：[《Web3 区块链学习总纲》](${GUIDE})`
      : `上一篇：[《${A[i - 1].t}》](/web3区块链/${A[i - 1].d}/${A[i - 1].f})`;
  const next =
    idx === A.length
      ? `下一篇：系列完结——回到 [《学习总纲》](${GUIDE}) 做毕业复盘`
      : `下一篇：[《${A[i + 1].t}》](/web3区块链/${A[i + 1].d}/${A[i + 1].f})`;

  const body = `---
title: "${art.t}"
sidebarGroup: "${folder.group}"
shortTitle: "${art.s}"
order: ${order}
date: 2026-08-24
category: "web3区块链"
tag:
${tags.map((t) => `  - "${t}"`).join("\n")}
description: "【占位待学】${art.t}——对应总纲${art.unit}。学完本篇应能：${art.a[0]}"
---

> **Web3 区块链系列 · ${art.st} · 第 ${idx}/${A.length} 篇 · 🚧 占位待学**
> ${prev}
> ${next}
> 学习大纲：[《Web3 区块链学习总纲》](${GUIDE})

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**${art.unit}**

## 一、本文要解决的问题

${art.p}

## 二、知识点清单

${art.k.map((x) => `- ${x}`).join("\n")}

## 三、动手实验（学习时必须真跑）

${art.e.map((x) => `- ${x}`).join("\n")}

## 四、验收标准（全部通过才进入下一篇）

${art.a.map((x) => `- [ ] ${x}`).join("\n")}
${
  art.ms
    ? `
## 五、阶段验收（本篇是${art.ms.n}收尾篇）

${art.ms.items.map((x) => `- [ ] ${x}`).join("\n")}

## 六、写作提示（补正文时遵守）
`
    : `
## 五、写作提示（补正文时遵守）
`
}
- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（以太坊 Fusaka / Solidity 0.8.36 / Foundry v1.0 / OpenZeppelin Contracts 5.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
`;

  const dir = path.join(ROOT, art.d);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, art.f + ".md"), body, "utf8");
  rendered++;
  lines.push(`${String(idx).padStart(2, "0")}  ${art.d}/${art.f}.md  (order ${order}, ${folder.group})`);
});

console.log(`已生成 ${rendered} 篇占位文档：\n`);
console.log(lines.join("\n"));
console.log(`\n目录内计数：${JSON.stringify(folderOrder)}`);
