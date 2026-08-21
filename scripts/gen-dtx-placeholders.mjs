// 一次性脚本：按《分布式事务学习总纲》生成 49 篇占位文档。
// 用法：node scripts/gen-dtx-placeholders.mjs
// 重新生成会覆盖同路径占位文件，正文已撰写的文章请勿放在这些路径下。

import fs from "node:fs";
import path from "node:path";

const ROOT = "E:/MyGithub/langkemaoxin.github.io/src/分布式";
const GUIDE = "/分布式/roadmap/distributed-tx-roadmap";

// 文件夹 -> 侧边栏分组名（sidebarGroup 与 sidebar/分布式.mjs 的 title 一致）+ 默认 tag
const FOLDERS = {
  "tx-basics": { group: "事务地基", tags: ["事务基础"] },
  theory: { group: "理论与协议", tags: ["理论"] },
  "seata-at": { group: "Seata AT", tags: ["Seata", "AT"] },
  "seata-tcc": { group: "Seata TCC", tags: ["Seata", "TCC"] },
  saga: { group: "Saga", tags: ["Seata", "Saga"] },
  message: { group: "消息一致性", tags: ["消息最终一致性"] },
  consensus: { group: "共识算法", tags: ["共识算法"] },
  capstone: { group: "毕业实战", tags: ["实战"] },
};

/** 49 篇文章数据（顺序 = 学习顺序 = 总纲阶段顺序）
 * f: 文件名  d: 目录  t: 标题  s: shortTitle  st: 阶段标签
 * unit: 对应总纲单元  p: 要解决的问题  k: 知识点  e: 实验  a: 验收
 * xt: 额外 tag  ms: 阶段验收（收尾篇）
 */
const A = [
  // ---------- 阶段 0：事务地基 ----------
  {
    f: "tx-basics-01-acid-anomalies", d: "tx-basics", st: "阶段 0 · 事务地基",
    t: "ACID 与并发异常：亲手复现脏读、不可重复读、幻读", s: "01 ACID 与并发异常",
    unit: "阶段 0 · 单元 0.1",
    p: "原子性、一致性、隔离性、持久性到底各自承诺了什么？脏读、不可重复读、幻读在真实数据库里分别长什么样？这是整个分布式事务大厦的地基——后面 Seata AT 的全局锁、undo log，全都是围绕这些并发异常打的仗。",
    k: [
      "ACID 四特性各自的白话含义与实现分工（原子性靠 undo log，持久性靠 redo log，隔离性靠锁 + MVCC）",
      "四种并发异常的时序：丢失修改、脏读、不可重复读、幻读",
      "SQL 标准四种隔离级别分别挡住哪些异常",
      "MySQL InnoDB 的 RR 与 SQL 标准 RR 的差异（快照读为什么\"额外\"防住了部分幻读）",
    ],
    e: [
      "开两个 mysql 客户端、建测试表，在 RR 隔离级别下手工复现不可重复读与幻读（范围查询场景）",
      "每一步都记录两个会话各自看到的输出，形成对照表",
      "把 isolation 级别逐级调低，观察哪些异常在低级别下出现",
    ],
    a: [
      "每种并发异常都能独立写出复现步骤（不看资料）",
      "能说出 MySQL RR 与 SQL 标准 RR 的差异及原因",
    ],
  },
  {
    f: "tx-basics-02-isolation-mvcc", d: "tx-basics", st: "阶段 0 · 事务地基",
    t: "隔离级别与 MVCC：ReadView 与版本链", s: "02 隔离级别与 MVCC",
    unit: "阶段 0 · 单元 0.2",
    p: "快照读为什么不加锁也能保证可重复读？ReadView 和版本链怎么配合决定\"我能看见哪个版本\"？不搞懂 MVCC，后面 Seata AT 的 before/after 镜像、全局锁与本地锁的分工都读不懂。",
    k: [
      "隐藏列 trx_id、roll_pointer 与 undo log 版本链的构成",
      "ReadView 的四要素（m_ids / min_trx_id / max_trx_id / creator_trx_id）与可见性判断规则",
      "RC 与 RR 生成 ReadView 时机差异：一次一条 vs 整个事务一条",
      "当前读（select for update / update）与快照读的区别",
    ],
    e: [
      "建表插数据，两个事务交错执行，观察同一 SELECT 在 RR 下的两次结果",
      "查 information_schema.innodb_trx，找到长事务并解释它的危害",
    ],
    a: ["能画出一条记录的版本链，并对任意一次读，推出它落在哪个版本上"],
  },
  {
    f: "tx-basics-03-innodb-logs", d: "tx-basics", st: "阶段 0 · 事务地基",
    t: "InnoDB 日志体系：redo、undo 与内部两阶段提交", s: "03 InnoDB 日志体系",
    unit: "阶段 0 · 单元 0.3",
    p: "redo log、undo log、binlog 各管什么？一条 UPDATE 从执行到落盘走什么路径？数据库崩溃后靠谁恢复？这篇是阶段 0 的枢纽——Seata AT 的 undo_log 设计思想就是从这里偷师的。",
    k: [
      "redo log：WAL 思想、崩溃恢复、循环写与 checkpoint",
      "undo log：回滚滚 + MVCC 双职责",
      "binlog：复制与归档，与 redo log 的分工",
      "内部两阶段提交：redo prepare → 写 binlog → redo commit，以及三种崩溃点的恢复行为",
    ],
    e: [
      "纸面推演三种崩溃点（写 redo 前 / redo prepare 后 binlog 前 / binlog 写完后）各自的恢复逻辑",
      "用 show engine innodb status 与 general log 观察一次 UPDATE 的痕迹",
    ],
    a: [
      "脱稿画出一条 UPDATE 的完整路径：SQL 解析 → 加行锁 → 写 undo → 写 redo → 写 binlog",
      "能说出 undo log 将来在 Seata AT 里扮演什么角色（为阶段 3 埋钩子）",
    ],
  },
  {
    f: "tx-basics-04-spring-transaction", d: "tx-basics", st: "阶段 0 · 事务地基",
    t: "Spring 事务：传播行为与失效场景", s: "04 Spring 事务",
    unit: "阶段 0 · 单元 0.4",
    p: "@Transactional 依赖什么机制生效？七种传播行为分别在解决什么？为什么实际项目里它总是\"莫名失效\"？把单机事务的最后一层（应用层）补齐，下一章就能引出跨库失灵的边界问题。",
    k: [
      "Spring 事务抽象：PlatformTransactionManager 与 TransactionDefinition",
      "声明式事务与 AOP 代理的关系（事务注解为什么加在代理上才生效）",
      "七种传播行为的语义与典型使用场景（重点 REQUIRED / REQUIRES_NEW / NESTED）",
      "常见失效场景：同类自调用、非 public 方法、异常被 catch 吞掉、抛受检异常、多线程",
    ],
    e: [
      "写出「同类方法自调用导致事务失效」的最小复现项目",
      "用注入自身代理 / AopContext.currentProxy() 修复，验证生效",
    ],
    a: ["每种失效场景都能说出原因（对应到代理机制）并给出修法"],
  },
  {
    f: "tx-basics-05-local-tx-limit", d: "tx-basics", st: "阶段 0 · 事务地基",
    t: "本地事务的天花板：跨库跨服务为什么失灵", s: "05 本地事务的边界",
    unit: "阶段 0 · 单元 0.5",
    p: "单机事务的边界到底画在哪？为什么换两个数据源、加一次 RPC，ACID 就集体罢工了？本篇亲手制造一次数据不一致，把「为什么需要分布式事务」变成亲眼所见，随后进入阶段 1 的理论标尺。",
    k: [
      "事务边界的本质：一个连接 + 一个事务管理器的作用域",
      "跨库场景：两个 DataSource 各自独立提交，没有全局协调者",
      "跨服务场景：RPC 调用在本地事务边界之外，网络调用不可回滚",
      "两种典型不一致时序：先提交后失败、先扣款后加款中间崩溃",
    ],
    e: [
      "Spring Boot 双 DataSource 小项目：库 A 扣款成功、库 B 加款前抛异常，验证两库状态不一致",
      "记录不一致现场（两库各查一次余额），标注崩溃点在第几步",
    ],
    a: ["能画出不一致窗口发生的具体步骤，并由此推导出「全局协调者」的必要性"],
    ms: {
      n: "阶段 0",
      items: [
        "脱稿画出一条 UPDATE 在 InnoDB 中的完整路径（解析 → 行锁 → undo → redo → binlog）",
        "说出 undo log 将来在 Seata AT 里扮演的角色",
      ],
    },
  },

  // ---------- 阶段 1~2：理论与协议 ----------
  {
    f: "theory-01-distributed-reality", d: "theory", st: "阶段 1 · 理论与协议",
    t: "分布式的物理现实：分区、部分失败与时钟", s: "01 分布式的物理现实",
    unit: "阶段 1 · 单元 1.1",
    p: "把数据库复制到两台机器、把服务拆到两个进程之后，物理上到底多了哪些麻烦？这三个麻烦是 CAP 定理存在的理由，也是所有分布式事务方案真正对抗的敌人。",
    k: [
      "网络分区与普通丢包的区别",
      "部分失败：调用一半成功一半失败，且无法区分「慢」和「死」",
      "无全局时钟：时钟漂移、跨机器事件排序问题",
      "三者分别怎么破坏本地事务的 ACID（逐条对应）",
    ],
    e: [
      "思想实验：两机房专线断了，两边各自接收写入，推演数据如何分叉",
      "（可选）本地用防火墙规则模拟两进程间断连，观察调用方的超时行为",
    ],
    a: ["能举出三个「部分失败」的具体例子，并说出它为什么比「全失败」难处理"],
  },
  {
    f: "theory-02-cap", d: "theory", st: "阶段 1 · 理论与协议",
    t: "CAP 定理：为什么是三选二", s: "02 CAP 定理",
    unit: "阶段 1 · 单元 1.2",
    p: "分区发生的那一刻，为什么一致性和可用性只能保一个？为什么说「三选二」这个流行说法本身就不严谨？这篇建立整份大纲的评价坐标系——后面每个方案都要在这里过秤。",
    k: [
      "C（线性一致）、A（每个请求必有响应）、P（分区容忍）的严格含义",
      "为什么 P 不可放弃：网络分区不是选择题",
      "CP 与 AP 在分区瞬间的行为差异：拒绝写入 vs 各自接受",
      "站队表：ZooKeeper / etcd / Eureka / Nacos / Redis / MySQL 主从各站哪边、为什么",
    ],
    e: [
      "亲手做一张 CP/AP 站队表，每个系统写一句站队理由",
      "推演：注册中心如果做成 CP，分区时会发生什么（结合服务发现场景）",
    ],
    a: ["站队表能自圆其说；能讲清「CAP 三选二」的说法为什么不严谨"],
  },
  {
    f: "theory-03-base-spectrum", d: "theory", st: "阶段 1 · 理论与协议",
    t: "BASE 定理与一致性谱系", s: "03 BASE 与一致性谱系",
    unit: "阶段 1 · 单元 1.3 + 1.4",
    p: "放弃强一致之后靠什么吃饭？「一致性」这个词到底有多少档位？把 BASE 和一致性谱系搞清楚，才能精确说出「AT 是什么强度的一致性」「可靠消息是什么强度」这种话。",
    k: [
      "BASE 三要素：基本可用、软状态、最终一致",
      "BASE 与 CAP 的关系：AP + 补偿机制落地",
      "一致性谱系：线性一致 → 顺序一致 → 因果一致 → 读己之写 → 最终一致",
      "每个档位的代表系统（etcd / ZooKeeper / 主从复制 / CDN 等）",
    ],
    e: [
      "用 BASE 解释「12306 显示有票、下单却说无票」的完整链路",
      "把谱系按强弱排序并标注每个方案将来会落在哪里",
    ],
    a: [
      "谱系排序正确并各举一例",
      "能把 XA、AT、TCC、可靠消息、最大努力通知、Saga 六方案放进「一致性强度 × 侵入性」坐标系",
    ],
    ms: {
      n: "阶段 1",
      items: ["六方案坐标系：每个方案的位置 + 取舍理由，说给别人听一遍"],
    },
  },
  {
    f: "theory-04-dtp-2pc", d: "theory", st: "阶段 2 · 理论与协议",
    t: "X/Open DTP 模型与 2PC 协议：原型机与三大缺陷", s: "04 DTP 与 2PC",
    unit: "阶段 2 · 单元 2.1 + 2.2",
    p: "分布式事务的「原型机」怎么转起来？它的三大缺陷分别在什么时序下发作？Seata 的 TC/TM/RM 三个名词全部继承自这里的 DTP 模型——不懂原型，就看不懂改进。",
    k: [
      "X/Open DTP 模型：AP / TM / RM 三角色与 XA 接口",
      "2PC 两阶段完整时序：投票阶段（prepare）与执行阶段（commit/rollback）",
      "三大缺陷的推演：同步阻塞、协调者单点、二阶段部分提交的数据不一致",
      "DTP 命名与 Seata TC/TM/RM 的对应关系（谁改了名、为什么）",
    ],
    e: [
      "手画 2PC 完整时序图，标出每一个可能故障的点",
      "逐个推演「协调者在第 N 步宕机」后，各参与者分别卡在什么状态",
    ],
    a: ["三大缺陷每一个都能讲出触发时序，不靠背"],
  },
  {
    f: "theory-05-3pc", d: "theory", st: "阶段 2 · 理论与协议",
    t: "3PC：缓解了什么，又引入了什么", s: "05 3PC",
    unit: "阶段 2 · 单元 2.3",
    p: "3PC 多加一个阶段、多了超时自动提交，到底解决了 2PC 的哪个问题？为什么说它只是「缓解」而不是「解决」？理解它失败在哪，才能理解为什么工程界最终转向了共识算法。",
    k: [
      "CanCommit / PreCommit / DoCommit 三阶段流程",
      "超时机制如何缓解同步阻塞（参与者不再无限等待）",
      "网络分区下 3PC 仍可能数据不一致的原因（预提交后分区）",
      "工程界的选择：不修 2PC，改用 Paxos/Raft 解决协调者单点",
    ],
    e: ["对比推演同一分区场景下 2PC 与 3PC 的行为差异，列表格"],
    a: ["能说清「缓解」与「解决」的差别，以及 3PC 为何仍被抛弃"],
  },
  {
    f: "theory-06-mysql-xa", d: "theory", st: "阶段 2 · 理论与协议",
    t: "MySQL XA 实操：亲手跑一遍两阶段", s: "06 MySQL XA 实操",
    unit: "阶段 2 · 单元 2.4",
    p: "XA 协议在 MySQL 里到底长什么样？PREPARE 之后连接断了，事务会怎样？亲手跑一遍，2PC 就从纸面图变成肌肉记忆——这也是对比 Seata AT 的实验基线。",
    k: [
      "XA START / XA END / XA PREPARE / XA COMMIT 语法与 xid 的组成",
      "XA RECOVER：查看悬挂中的已 prepare 事务",
      "PREPARE 前后 kill 会话的行为差异",
      "MySQL XA 与 binlog / 主从复制的历史坑（了解即可）",
    ],
    e: [
      "两个 mysql 客户端手工执行 XA 转账：一个库扣款 PREPARE，另一个库加款 PREPARE，再逐个 COMMIT",
      "在 PREPARE 后 kill 会话，用 XA RECOVER 观察悬挂事务，再手工提交 / 回滚它",
    ],
    a: [
      "亲眼见过 in-flight 的 XA 事务",
      "能说清 PREPARE 前与 PREPARE 后 kill 会话的差别及原因（锁与状态）",
    ],
  },
  {
    f: "theory-07-xa-cost", d: "theory", st: "阶段 2 · 理论与协议",
    t: "XA 的工程代价：为什么互联网公司不用它", s: "07 XA 的工程代价",
    unit: "阶段 2 · 单元 2.5",
    p: "标准 XA 是教科书答案，为什么生产环境几乎绝迹？用一次压测找到答案，并由此引出 Seata AT 的核心动机：缩短锁持有时间。",
    k: [
      "锁跨阶段持有：从 PREPARE 到 COMMIT 期间行锁不释放，并发串行化",
      "协调者单点与故障恢复的运维复杂度",
      "吞吐差距的数量级直觉（结合自己的压测数据）",
      "XA 的合理生存空间：低并发、强一致刚需、无法改造业务时",
    ],
    e: [
      "Spring Boot + Atomikos 双库 XA demo 跑通转账",
      "同一业务分别用 XA 与本地事务简单压测，记录吞吐与锁等待对比",
    ],
    a: ["用「锁持有时间」一句话说清 XA 与 Seata AT 的本质区别"],
    ms: {
      n: "阶段 2",
      items: ["一句话讲清 XA 与 Seata AT 在「锁持有时间」上的本质区别（这是理解 AT 性能优势的钥匙）"],
    },
  },

  // ---------- 阶段 3A：Seata AT 实战 ----------
  {
    f: "seata-at-01-roles-lifecycle", d: "seata-at", st: "阶段 3A · Seata AT",
    t: "三角色与全局事务生命周期", s: "01 三角色与生命周期",
    unit: "阶段 3A · 单元 3A.1",
    xt: ["实战"],
    p: "Seata 用哪三个角色把 2PC 改造成工程可用的框架？XID 怎么把一次跨服务调用串成一个全局事务？先建立总框架，后面每一篇都在往这张图里填细节。",
    k: [
      "TC / TM / RM 的职责、部署形态与进程边界",
      "生命周期五步：TM begin → XID 传播 → RM 注册分支 → TM commit/rollback → TC 驱动分支",
      "与 DTP 模型的名词对应（阶段 2 的回扣）",
      "发行版结构：seata-server、console、各 client 包",
    ],
    e: ["手画生命周期五步图；官网 quickstart 从下载到跑通过一遍（Apache Seata 2.6.0）"],
    a: ["不看资料复述五步全过程，并指出每一步是谁跟谁通信"],
  },
  {
    f: "seata-at-02-deploy-tc", d: "seata-at", st: "阶段 3A · Seata AT",
    t: "部署 seata-server：db 存储、Nacos 注册与 console", s: "02 部署 TC",
    unit: "阶段 3A · 单元 3A.2",
    xt: ["实战", "部署"],
    p: "TC 协调器怎么跑起来？file 与 db 存储模式的本质差别是什么？把 TC 部署成后续所有实战的公共基础设施。",
    k: [
      "seata-server 启动方式与关键配置（registry / store / console）",
      "db 存储模式建表：global_table、branch_table、lock_table 三张表的结构与作用",
      "接入 Nacos 注册中心与配置中心",
      "console 控制台：查全局事务、分支事务、全局锁",
    ],
    e: [
      "用 db 存储 + Nacos 注册部署单机 TC（Apache Seata 2.6.0，坐标 org.apache.seata）",
      "制造一次全局回滚，到 console 里找到这条事务记录与它的分支",
    ],
    a: ["能在 console 里定位一次回滚事务，并解释三张存储表里各自新增了什么"],
  },
  {
    f: "seata-at-03-integrate-app", d: "seata-at", st: "阶段 3A · Seata AT",
    t: "应用接入：starter、@GlobalTransactional 与 undo_log 表", s: "03 应用接入",
    unit: "阶段 3A · 单元 3A.3",
    xt: ["实战"],
    p: "业务应用怎么接入 AT？每个业务库里的 undo_log 表是干嘛的？这是第一个完整实战：三库转账全局回滚成功。",
    k: [
      "seata-spring-boot-starter 关键配置项（group、registry、proxy 数据源自动装配）",
      "@GlobalTransactional 开启全局事务、超时与回滚规则",
      "undo_log 表结构（branch_id、xid、context、rollback_info）与生命周期",
      "常见接入报错排查：连不上 TC、undo_log 缺表、数据源未被代理",
    ],
    e: [
      "搭「订单-库存-账户」三库（或三服务）项目接入 TC",
      "下游抛异常，验证全局回滚后三库数据一致；观察 undo_log 表的出现与消失",
    ],
    a: ["能解释 undo_log 记录的内容、什么时候写入、什么时候删除"],
  },
  {
    f: "seata-at-04-two-phase", d: "seata-at", st: "阶段 3A · Seata AT",
    t: "AT 两阶段拆解：一阶段四件事与异步二阶段", s: "04 AT 两阶段拆解",
    unit: "阶段 3A · 单元 3A.4",
    xt: ["实战"],
    p: "AT 的「一阶段直接提交本地事务」凭什么敢？二阶段提交为什么只是删日志、回滚又靠什么？这是 AT 模式的灵魂一篇，也是源码篇（06-10）的总纲。",
    k: [
      "一阶段四件事：业务 SQL → 查 before/after 镜像 → undo_log 与业务同本地事务提交 → 注册分支 + 申请全局锁后释放本地锁",
      "二阶段提交：异步批量删除 undo_log 即完成",
      "二阶段回滚：用 before 镜像反向补偿，校验 after 镜像防脏写",
      "与 XA 的锁持有时间对比（阶段 2 验收问题的工程落地）",
    ],
    e: [
      "回滚场景下逐步观察 undo_log 表变化与最终数据",
      "手工解码一条 undo_log 的 rollback_info JSON（before / after 镜像）",
    ],
    a: ["能手写一条 undo_log 镜像 JSON 的结构（两张镜像 + where 条件）"],
  },
  {
    f: "seata-at-05-isolation", d: "seata-at", st: "阶段 3A · Seata AT",
    t: "AT 隔离性：全局锁防脏写与读隔离", s: "05 AT 隔离性",
    unit: "阶段 3A · 单元 3A.5",
    xt: ["实战"],
    p: "一阶段就提交了本地事务，别的事务读到中间态怎么办？两个全局事务改同一行怎么办？全局锁是 AT 隔离性的全部答案，也是面试最爱问的点。",
    k: [
      "AT 默认全局读未提交的原因（一阶段已释放本地锁）",
      "全局锁（lock_table）防脏写：TC 侧按资源排队，本地提交前先拿全局锁",
      "写冲突：全局锁获取失败时的重试与回滚行为",
      "读隔离方案：@GlobalLock + select for update 实现全局读已提交",
    ],
    e: [
      "绕过框架用裸 SQL 直接改下游库，观察全局锁拦截报错",
      "两个全局事务并发写同一行，观察锁竞争与重试日志",
    ],
    a: ["能说清全局锁与 InnoDB 行锁的分工，以及两把锁交织时会不会死锁、怎么防"],
  },

  // ---------- 阶段 3B：Seata AT 源码 ----------
  {
    f: "seata-at-06-src-tm", d: "seata-at", st: "阶段 3B · Seata AT 源码",
    t: "源码·TM 侧：从注解拦截到全局事务开启", s: "06 源码·TM 链路",
    unit: "阶段 3B · 单元 3B.1",
    xt: ["源码"],
    p: "@GlobalTransactional 是谁拦截的？begin / commit 怎么一路走到 TC？源码篇第一章，先搭源码调试环境，再追第一条链路。",
    k: [
      "源码环境：拉取 apache/incubator-seata 源码、版本对齐 2.6.0、与实战项目联调",
      "GlobalTransactionalInterceptor：注解切面入口与方法解析",
      "TransactionalTemplate：begin → 业务 → commit/rollback 的模板流程与异常传播",
      "DefaultGlobalTransaction 状态机与 TM 向 TC 发送 GlobalBeginRequest",
    ],
    e: ["在 TransactionalTemplate 打断点，完整追一遍开启 → 业务 → 提交 / 回滚链路"],
    a: ["脱稿写出 TM 侧类名级调用链（注解 → 切面 → 模板 → 事务对象 → 网络）"],
  },
  {
    f: "seata-at-07-src-xid", d: "seata-at", st: "阶段 3B · Seata AT 源码",
    t: "源码·XID 传播：跨 RPC 的事务上下文", s: "07 源码·XID 传播",
    unit: "阶段 3B · 单元 3B.2",
    xt: ["源码"],
    p: "XID 存放在哪？怎么跨 Dubbo / Feign / HTTP 传给下游？为什么异步线程里它常常神秘消失？",
    k: [
      "RootContext.bind / unbind 与 ThreadLocal 事务上下文",
      "各 RPC 框架的 filter 链：请求带出 XID、下游解析并绑定",
      "跨线程 / 线程池 / @Async 场景的上下文丢失与传递方案",
    ],
    e: [
      "断点观察 XID 在 filter 链中的完整传递过程",
      "复现「线程池里丢 XID」问题，再修复并验证",
    ],
    a: ["能说清 XID 的存放位置、传播路径与恢复机制"],
  },
  {
    f: "seata-at-08-src-rm", d: "seata-at", st: "阶段 3B · Seata AT 源码",
    t: "源码·RM 一阶段：数据源代理、镜像生成与全局锁", s: "08 源码·RM 一阶段",
    unit: "阶段 3B · 单元 3B.3",
    xt: ["源码"],
    p: "业务 SQL 是怎么被拦下来解析、生成镜像、写 undo_log、申请全局锁的？这是 AT 源码最厚的一篇，也是「无侵入」三个字的全部实现。",
    k: [
      "DataSourceProxy / ConnectionProxy / PreparedStatementProxy 代理体系",
      "ExecuteTemplate 按语句类型路由执行器（UpdateExecutor / SelectForUpdateExecutor 等）",
      "SQL 解析：Select / Update / Insert / Delete 识别器与 where 条件提取",
      "before / after 镜像构建（主键查询回填）与 UndoLogManager 写 undo_log",
      "branchRegister + 全局锁申请的时序：为什么本地提交前必须拿到全局锁",
    ],
    e: [
      "断点追一阶段全链路：代理 → 解析 → 镜像 → undo_log → 注册 → 本地提交",
      "观察联合主键 / 无主键表的镜像构建行为",
    ],
    a: ["能讲出「业务 SQL 与 undo_log 同本地事务提交」的原理，及其对原子性的意义"],
  },
  {
    f: "seata-at-09-src-tc", d: "seata-at", st: "阶段 3B · Seata AT 源码",
    t: "源码·TC 侧：会话管理与四种存储", s: "09 源码·TC 会话",
    unit: "阶段 3B · 单元 3B.4",
    xt: ["源码"],
    p: "TC 怎么维护全局会话与分支会话？重启之后未完成的事务为什么能恢复（或为什么会丢）？四种存储模式各拿什么换什么？",
    k: [
      "DefaultCoordinator 与 DefaultCore：begin / branchRegister / globalCommit / globalRollback",
      "GlobalSession / BranchSession 的状态机与流转",
      "SessionHolder 四种存储：file / db / redis / raft 的取舍",
      "LockManager：lock_table 的键设计（资源 + 行主键）与获取 / 释放",
    ],
    e: [
      "断点看 branchRegister 全过程（含全局锁写入 lock_table）",
      "TC 重启后观察未完成事务的恢复（db 存储模式）",
    ],
    a: ["能说清 TC 重启后事务不丢的条件（存储模式 + 恢复流程）"],
  },
  {
    f: "seata-at-10-src-phase2", d: "seata-at", st: "阶段 3B · Seata AT 源码",
    t: "源码·二阶段：异步提交、反向补偿与超时检测", s: "10 源码·二阶段",
    unit: "阶段 3B · 单元 3B.5",
    xt: ["源码"],
    p: "二阶段提交为什么只是删日志？回滚怎么用镜像反向补偿、又是怎么发现「数据已被别人改过」的？超时的事务谁来收尸？附一个 SPI 扩展加分实验。",
    k: [
      "commit 链路：异步批量删 undo_log（二阶段提交如此之轻的原因）",
      "rollback 链路：BranchRollbackRequest → before 镜像反向补偿 → after 镜像校验防脏写后误回滚",
      "重试机制与 timeoutCheck 定时检测全局超时事务",
      "分支回滚失败的重试策略与人工介入点",
      "加分：Seata SPI 扩展体系——实现一个全局事务审计日志扩展",
    ],
    e: [
      "断点画出提交、回滚两条完整时序（含失败重试路径）",
      "加分实验：实现一个事务事件监听 SPI，把全局事务审计打到自己的表里",
    ],
    a: ["画出提交与回滚两条类名级完整时序图；加分实验跑通"],
  },

  // ---------- 阶段 3C：Seata TCC ----------
  {
    f: "seata-tcc-01-try-confirm-cancel", d: "seata-tcc", st: "阶段 3C · Seata TCC",
    t: "TCC 三段语义：Try / Confirm / Cancel 业务怎么写", s: "01 TCC 三段语义",
    unit: "阶段 3C · 单元 3C.1",
    xt: ["实战"],
    p: "Try 预留、Confirm 确认、Cancel 释放——三段在业务和数据表上怎么落地？和 AT 比，拿开发量换来了什么？",
    k: [
      "资源预留模式：冻结字段 / 预留表的通用设计",
      "Try / Confirm / Cancel 的业务语义边界与数据表设计（同一张表加冻结字段 vs 独立预留表）",
      "Confirm / Cancel 必须幂等、必须成功的设计约束",
      "AT vs TCC：侵入性、性能、开发量的三角交换",
    ],
    e: [
      "实现库存 TCC：try 冻结库存、confirm 扣减冻结、cancel 解冻",
      "正常与回滚两条路径各跑一遍，观察三段执行顺序与数据变化",
    ],
    a: ["画出三个方法对应的数据表设计，并解释为什么 Confirm/Cancel 不允许失败"],
  },
  {
    f: "seata-tcc-02-three-issues", d: "seata-tcc", st: "阶段 3C · Seata TCC",
    t: "空回滚、悬挂、幂等：三大问题的异常时序", s: "02 空回滚悬挂幂等",
    unit: "阶段 3C · 单元 3C.2",
    xt: ["实战"],
    p: "TCC 的三大经典问题——空回滚、悬挂、幂等——各自的触发时序是什么？先不加任何防护，亲手把三个问题全部复现一遍，再谈修复。",
    k: [
      "空回滚：Try 未到达或失败，Cancel 先执行",
      "悬挂：Cancel 先执行完，迟到的 Try 才到（比空回滚更危险）",
      "幂等：Confirm / Cancel 因重试被重复调用",
      "三个问题的异常时序图与手工复现条件",
    ],
    e: [
      "不开 fence，人为延迟 Try 的到达（sleep / 断点挂起），复现空回滚与悬挂",
      "构造 Confirm 重试场景，观察重复扣减",
    ],
    a: ["独立画出三个问题的异常时序图，并说清每个问题造成的实际资损"],
  },
  {
    f: "seata-tcc-03-fence", d: "seata-tcc", st: "阶段 3C · Seata TCC",
    t: "Fence 机制：一张表防三害", s: "03 Fence 机制",
    unit: "阶段 3C · 单元 3C.3",
    xt: ["实战"],
    p: "开启 useTCCFence 之后，一张 tcc_fence_log 表怎么同时防住空回滚、悬挂、幂等三个问题？",
    k: [
      "useTCCFence 配置与 tcc_fence_log 建表",
      "fence 记录状态：初始化 / 已提交 / 已回滚 / 悬挂",
      "prepare / commit / rollback 三步各自对 fence 的检查与更新逻辑",
      "fence 表与业务库的关系：为什么它可以和业务表同库",
    ],
    e: [
      "开启 fence，重复上一篇的三个复现实验，观察全部被拦截",
      "每个实验后查 tcc_fence_log 表，对照记录状态",
    ],
    a: ["能说清 fence 的四个状态分别挡住哪个问题、在哪一步检查"],
  },
  {
    f: "seata-tcc-04-source", d: "seata-tcc", st: "阶段 3C · Seata TCC",
    t: "TCC 源码：切面拆解、分支注册与 Fence 实现", s: "04 TCC 源码",
    unit: "阶段 3C · 单元 3C.4",
    xt: ["源码"],
    p: "一个业务接口怎么被切面拆成两阶段？fence 在源码层怎么实现？对照 AT 源码，看两种模式在「分支注册」这一步的分道扬镳。",
    k: [
      "@TwoPhaseBusinessAction 注解的解析与元数据注册",
      "TccActionInterceptor 切面：Try 执行 + 分支注册",
      "二阶段回调：TC 请求如何分发到 Confirm / Cancel 方法",
      "TransactionFenceManager 的 prepare / commit / rollback 实现（对照 03 篇的状态检查）",
      "AT 与 TCC 在 branchRegister 上的异同",
    ],
    e: ["断点追 Try → 注册分支 → 二阶段回调 Confirm 的全链路"],
    a: ["能对比 AT 与 TCC 分支注册与二阶段驱动的异同（类名级）"],
  },

  // ---------- 阶段 3D：Saga ----------
  {
    f: "saga-01-theory", d: "saga", st: "阶段 3D · Saga",
    t: "Saga 理论：LLT 与补偿语义", s: "01 Saga 理论",
    unit: "阶段 3D · 单元 3D.1",
    xt: ["理论"],
    p: "1987 年的论文怎么解决「长事务」？为什么补偿是业务反向操作而不是数据库回滚？Saga 的灵魂在理论，先把语义吃透再碰框架。",
    k: [
      "LLT（Long Lived Transaction）的定义与产生背景",
      "拆解：LLT = T1..Tn 子事务 + C1..Cn 补偿",
      "补偿的语义：业务层面的反向操作（如「取消冻结」而非 UPDATE 回滚）",
      "补偿必须最终成功的设计约束；什么样的操作没法补偿",
    ],
    e: ["读原论文（Sagas, SIGMOD 1987）前两节，写一页笔记"],
    a: ["能说清「补偿与回滚的区别」，并举一个不可补偿的反例"],
  },
  {
    f: "saga-02-orchestration-choreography", d: "saga", st: "阶段 3D · Saga",
    t: "编排 vs 协同：两种协调风格", s: "02 编排与协同",
    unit: "阶段 3D · 单元 3D.2",
    xt: ["理论"],
    p: "谁决定「下一步做什么」？中央状态机（编排）和事件订阅（协同）各适合什么场景？这决定了你在 Seata Saga 和事件驱动方案之间怎么选。",
    k: [
      "编排（orchestration）：命令式、中央协调器 / 状态机",
      "协同（choreography）：事件式、无中央、服务自治",
      "对比：可观测性、耦合度、流程变更成本、单点风险",
      "Seata Saga 的选择：编排（状态机引擎）及理由",
    ],
    e: ["用两种风格各画一遍同一订单流程图，标注状态与事件"],
    a: ["能说出两种风格各自的适用边界与 Seata 的取舍理由"],
  },
  {
    f: "saga-03-statemachine", d: "saga", st: "阶段 3D · Saga",
    t: "Seata Saga 状态机：DSL、补偿与重试", s: "03 Saga 状态机",
    unit: "阶段 3D · 单元 3D.3",
    xt: ["实战"],
    p: "Seata 的状态机引擎怎么用？JSON DSL 怎么描述流程、补偿、重试？跑通一个带逆向补偿的真实流程。",
    k: [
      "JSON DSL 结构：状态节点、转移条件、服务绑定、补偿链",
      "saga-statemachine-designer 设计器的安装与使用",
      "状态机实例的持久化与崩溃恢复（状态机本身也是一条记录）",
      "向前恢复（重试）与向后恢复（补偿）的配置",
    ],
    e: [
      "状态机跑「下单-扣款-送积分-发券」，扣款失败触发逆向补偿",
      "在设计器里打开同一流程截图，逐节点标注",
    ],
    a: ["看懂一张状态机图的每个节点、补偿链与重试策略"],
  },
  {
    f: "saga-04-selection", d: "saga", st: "阶段 3D · Saga",
    t: "Saga 选型：什么时候非它不可", s: "04 Saga 选型",
    unit: "阶段 3D · 单元 3D.4",
    xt: ["实战"],
    p: "什么场景非 Saga 不可？三问选型法（能否预留资源 / 事务多长 / 参与方可控吗）在本篇变成肌肉记忆，并完成阶段 3 的总验收。",
    k: [
      "三问选型法：资源可预留？长事务？参与方可控？",
      "Saga vs TCC vs AT 的决策边界",
      "真实案例：退款流程、跨企业流程为什么只能 Saga",
    ],
    e: [
      "阶段 3 总验收：秒杀场景（扣库存 + 生成订单 + 送积分）分别用 AT、TCC、Saga 各实现一遍",
      "写对比笔记：代码量 / 侵入性 / 一致性强度 / 性能直觉 四个维度",
    ],
    a: ["对比笔记完成，三种实现都能说清各自最适合的变体场景"],
    ms: {
      n: "阶段 3",
      items: [
        "秒杀三实现（AT / TCC / Saga）+ 四维对比笔记",
        "六方案坐标系第二次落位（对照阶段 1 的答案看进步）",
      ],
    },
  },

  // ---------- 阶段 4：消息最终一致性 ----------
  {
    f: "message-01-two-inconsistencies", d: "message", st: "阶段 4 · 消息一致性",
    t: "两种不一致：问题定义与风险地图", s: "01 两种不一致",
    unit: "阶段 4A · 单元 4A.1",
    xt: ["理论"],
    p: "消息方案要防的两种不一致——事务成功但消息丢、消息发了但事务回滚——分别怎么发生？把生产端、MQ、消费端三段的风险全部画在一张图上。",
    k: [
      "不一致一：本地事务成功，消息没发出去（发送在事务外 + 进程崩溃）",
      "不一致二：消息发出去了，本地事务却回滚（发送在事务内）",
      "三段风险地图：生产端丢失 / MQ 丢失与重复 / 消费端丢失与重复",
      "最终一致的前提：至少一次投递 + 消费幂等",
    ],
    e: ["画出两种不一致的完整时序图与三段风险地图"],
    a: ["能枚举三段各自的风险与对应防护手段"],
  },
  {
    f: "message-02-local-message-table", d: "message", st: "阶段 4 · 消息一致性",
    t: "本地消息表：同库同事务是灵魂", s: "02 本地消息表",
    unit: "阶段 4A · 单元 4A.2",
    xt: ["实战"],
    p: "不依赖任何 MQ 特性，怎么保证「业务成功」和「消息必达」原子？先手写本地消息表，才能真懂后面框架帮你做了什么。",
    k: [
      "业务表 + outbox 消息表同库同事务插入（原子性的来源）",
      "后台扫表补发 + 指数退避 + 已发标记",
      "最少一次语义下的消费端幂等要求",
      "扫描任务的分页、并发控制与性能影响",
    ],
    e: [
      "手写本地消息表版「注册成功-发优惠券」：业务与 outbox 同事务写入，后台线程扫描补发",
      "kill 消费方再重启，验证消息最终送达（券不丢）",
    ],
    a: ["能说清「同库同事务」为什么是灵魂（对照两种不一致时序逐一解释）"],
  },
  {
    f: "message-03-rocketmq-tx", d: "message", st: "阶段 4 · 消息一致性",
    t: "RocketMQ 事务消息：half、回查与全时序", s: "03 事务消息",
    unit: "阶段 4A · 单元 4A.3",
    xt: ["实战"],
    p: "RocketMQ 怎么把 outbox 内置进 broker？half message、本地事务、回查四个环节怎么咬合成不丢不漏？",
    k: [
      "half message：先对消费者不可见的半消息",
      "本地事务执行后 commit / rollback 半消息",
      "回查机制：broker 定时回查未决事务（transactionListener）",
      "事务消息与本地消息表的等价性对比（谁承担 outbox 角色）",
    ],
    e: [
      "用 RocketMQ 5.x 事务消息重写「注册-发券」",
      "在本地事务里 sleep 模拟超时，观察 broker 回查日志与最终投递",
    ],
    a: ["画出全时序图并标出回查兜底位置；解释回查为什么能保证不丢"],
  },
  {
    f: "message-04-idempotent-consume", d: "message", st: "阶段 4 · 消息一致性",
    t: "消费端幂等：至少一次 + 去重 = 恰好一次", s: "04 消费幂等",
    unit: "阶段 4A · 单元 4A.4",
    xt: ["实战"],
    p: "至少一次投递下，重复消息怎么挡？去重表、状态机、业务唯一键三种幂等方案各防哪一层？",
    k: [
      "重复的来源：ACK 丢失、消费超时重试、生产端重发",
      "方案一：去重表（消息 key 唯一索引）",
      "方案二：业务状态机（当前状态不允许的动作直接忽略）",
      "方案三：业务唯一键天然幂等（如「一单一券」唯一约束）",
      "去重操作与业务操作必须同事务",
    ],
    e: [
      "消费端用去重表实现幂等",
      "人为重复投递同一消息，验证只生效一次",
    ],
    a: ["能说清三种方案的适用层次与组合用法"],
  },
  {
    f: "message-05-best-effort", d: "message", st: "阶段 4 · 消息一致性",
    t: "最大努力通知：衰减重试与查证兜底", s: "05 最大努力通知",
    unit: "阶段 4B · 单元 4B.1",
    xt: ["实战"],
    p: "支付回调为什么「尽力就行」？衰减重试、查证接口、对账文件三层防线各自兜什么底？",
    k: [
      "跨企业通知的一致性责任划分：通知方尽力，被通知方负责查证",
      "衰减重试间隔表设计（如 1m / 5m / 10m / 30m / 1h）",
      "查证接口：被通知方主动查询的兜底通道",
      "对账文件：最终的对账防线",
    ],
    e: [
      "模拟支付结果通知第三方：失败后按衰减间隔重试 5 次",
      "实现查证接口，走一遍「通知全失败 → 主动查证成功」路径",
    ],
    a: ["能说清三层防线各兜什么底，以及与可靠消息的责任方向差异"],
  },
  {
    f: "message-06-compare", d: "message", st: "阶段 4 · 消息一致性",
    t: "可靠消息 vs 最大努力通知：一张表定分野", s: "06 方案对比",
    unit: "阶段 4B · 单元 4B.2",
    xt: ["理论"],
    p: "两个「异步方案」到底差在哪？用一张对比表钉死五个维度，并完成阶段 4 的 kill 演练总验收。",
    k: [
      "对比维度：消息方向、是否必须 MQ、一致性要求、失败责任方、典型场景",
      "判断规则：内部数据流转用可靠消息，对外通知用最大努力通知",
    ],
    e: [
      "阶段 4 总验收：对「注册-发券」做 kill 演练——分别 kill 业务进程、MQ、消费方",
      "记录哪些环节断了仍能最终一致、为什么",
    ],
    a: ["完成对比表 + kill 演练记录"],
    ms: {
      n: "阶段 4",
      items: ["kill 三处（业务进程 / MQ / 消费方）各一次，记录恢复路径与最终一致性结论"],
    },
  },

  // ---------- 阶段 5：共识算法 ----------
  {
    f: "consensus-01-replication-quorum", d: "consensus", st: "阶段 5 · 共识算法",
    t: "复制与 Quorum：NWR 基础", s: "01 复制与 Quorum",
    unit: "阶段 5.0 · 单元 5.0.1 + 5.0.2",
    xt: ["理论"],
    p: "数据复制到多副本之后，怎么读写才安全？为什么多数派写入能容忍少数派故障？共识算法的全部推理都建立在 Quorum 之上，先把它变成直觉。",
    k: [
      "主从复制、多主复制、无主（leaderless）复制",
      "复制延迟与读到旧数据的问题",
      "NWR 公式与 W + R > N 的含义",
      "Dynamo 系存储的取舍；为什么多数派写入容忍少数派故障",
    ],
    e: ["纸面推演：N=3、W=2、R=1 时读到旧数据的具体场景；调整 W/R 再推演"],
    a: ["能用 NWR 解释 Dynamo 系存储的一致性与可用性取舍"],
  },
  {
    f: "consensus-02-basic-paxos", d: "consensus", st: "阶段 5 · 共识算法",
    t: "Basic Paxos：两阶段与多数派", s: "02 Basic Paxos",
    unit: "阶段 5.1 · 单元 5.1.1",
    xt: ["理论"],
    p: "没有 leader 时，一群人怎么对一个值达成一致？prepare 与 accept 两阶段各自防住什么？活锁又是怎么发生的？",
    k: [
      "Proposer / Acceptor / Learner 三角色",
      "prepare 阶段：承诺不再接受更旧提案；accept 阶段：选定值",
      "多数派的意义：任意两个多数派必有交集",
      "被拒绝后的重新提案与编号规则",
      "活锁：两个 Proposer 交错抬价的场景",
    ],
    e: ["纸面推演两个 Proposer 交错提案的活锁场景（对照论文走一遍消息）"],
    a: ["能手画完整消息时序（含被拒绝重提），并说出两阶段各防住什么"],
  },
  {
    f: "consensus-03-multi-paxos", d: "consensus", st: "阶段 5 · 共识算法",
    t: "Multi-Paxos：从单值到日志（附 ZAB 对照）", s: "03 Multi-Paxos",
    unit: "阶段 5.1 · 单元 5.1.2（附 5.2.7 ZAB）",
    xt: ["理论"],
    p: "Paxos 一次只定一个值，工程上要定一串日志怎么办？leader 优化省掉了什么？顺带把 ZooKeeper 的 ZAB 对照看完。",
    k: [
      "instance 与日志：每个槽位跑一次 Paxos",
      "leader 选出后为什么可以省掉 prepare（提案号垄断）",
      "日志空洞与恢复",
      "ZAB 对照：崩溃恢复 vs 日志复制，一段话说清与 Raft/Paxos 的异同",
      "为什么工程实现都「不等于」论文（实现补了大量工程细节）",
    ],
    e: ["对照 ZooKeeper ZAB 资料，写一页差异笔记"],
    a: ["能说清 Basic Paxos 到 Multi-Paxos 的鸿沟是怎么填的"],
  },
  {
    f: "consensus-04-raft-election", d: "consensus", st: "阶段 5 · 共识算法",
    t: "Raft 分解思想与 Leader 选举", s: "04 Raft 选举",
    unit: "阶段 5.2 · 单元 5.2.1 + 5.2.2",
    xt: ["理论"],
    p: "Raft 为什么比 Paxos 好懂？Leader 怎么选出来、怎么防脑裂？从三子问题的分解开始。",
    k: [
      "三子问题：Leader 选举、日志复制、安全性；「为可理解性设计」的方法论",
      "任期（term）、随机选举超时、多数派投票",
      "脑裂防护：同一任期内多数派只投一票",
      "旧 leader 复活后的降级（发现更高任期立刻让位）",
    ],
    e: [
      "在 raft.github.io 可视化页面强制触发选举，观察任期与投票变化",
      "推演「旧 leader 复活后发现已有新 leader」的处理",
    ],
    a: ["能推演讲清防脑裂机制：为什么不可能同时存在两个同任期的 leader"],
  },
  {
    f: "consensus-05-raft-log", d: "consensus", st: "阶段 5 · 共识算法",
    t: "Raft 日志复制与提交规则", s: "05 Raft 日志复制",
    unit: "阶段 5.2 · 单元 5.2.3",
    xt: ["理论"],
    p: "日志怎么复制？什么条件才算「提交」？提交与应用到状态机的关系是什么？",
    k: [
      "AppendEntries 与日志匹配原则（prevLogIndex / prevLogTerm 向前回退）",
      "冲突日志的强制覆盖",
      "提交规则：只有「当前任期」的日志条目能通过计数提交",
      "提交 → 应用到状态机的顺序语义",
    ],
    e: ["可视化页面制造日志不一致，观察新 leader 如何逐段回退并覆盖"],
    a: ["能说清匹配规则与提交条件，以及「日志匹配 + 单调追加」如何保证一致性"],
  },
  {
    f: "consensus-06-raft-safety", d: "consensus", st: "阶段 5 · 共识算法",
    t: "Raft 安全性与成员变更", s: "06 Raft 安全性",
    unit: "阶段 5.2 · 单元 5.2.4",
    xt: ["理论"],
    p: "哪些「坏例子」会破坏已提交日志不丢的承诺？选举限制为什么必要？成员变更的双多数问题怎么解？",
    k: [
      "选举限制：只有拥有最新日志的候选人可当选",
      "CurrentTerm 检查：防止旧任期的日志被「间接」误提交（坏例子推演）",
      "Leader 完整性：已提交条目出现在之后所有 leader 的日志里",
      "成员变更：联合共识（joint consensus）与单节点变更",
      "快照与日志压缩（了解）",
    ],
    e: ["推演「旧任期日志被误提交」的坏例子，写出没有安全条款时会发生什么"],
    a: ["能举出坏例子并对应说出防护条款"],
  },
  {
    f: "consensus-07-etcd-lab", d: "consensus", st: "阶段 5 · 共识算法",
    t: "工程锚点 etcd：亲眼看一次选主", s: "07 etcd 实操",
    unit: "阶段 5.2 · 单元 5.2.5",
    xt: ["实战"],
    p: "生产级 Raft 长什么样？本地起一个 3 节点 etcd，亲手 kill 一次 leader，把论文里的选举看进日志里。",
    k: [
      "etcd 架构：raft 库 + WAL + 存储 + gRPC API",
      "集群部署与 etcdctl endpoint status / endpoint health",
      "WAL 与快照的作用",
      "观察指标：任期跳变、选举耗时、写入恢复",
    ],
    e: [
      "本地 3 节点 etcd 集群：endpoint status 看 leader 分布",
      "kill leader，观察自动选举时间线与新 leader 上的写入恢复",
    ],
    a: ["亲手见过一次选主，并能用论文术语复述时间线"],
  },
  {
    f: "consensus-08-seata-raft", d: "consensus", st: "阶段 5 · 共识算法",
    t: "工程锚点 Seata TC：Raft 存储模式实操", s: "08 Seata TC Raft",
    unit: "阶段 5.2 · 单元 5.2.6",
    xt: ["实战", "Seata"],
    p: "Seata TC 自己的高可用为什么用 Raft？3 节点 raft 存储模式的 TC，kill leader 后全局事务能被新 leader 接管吗？主线回扣：理论落到自己天天用的框架上。",
    k: [
      "seata-server 的 raft 存储模式（2.0+ 引入）：配置与部署",
      "TC 会话与全局锁的复制方式",
      "leader 切换时未完成全局事务的接管",
      "raft / db / redis 三种存储模式的对比与选型",
    ],
    e: [
      "部署 3 节点 raft 模式 seata-server",
      "全局事务进行中 kill TC leader，验证事务被新 leader 接管并完成",
    ],
    a: ["能讲清「TC 为什么用 Raft 而不是主从复制 / Gossip」（主线回扣）"],
  },
  {
    f: "consensus-09-gossip-model", d: "consensus", st: "阶段 5 · 共识算法",
    t: "Gossip：反熵与谣言传播", s: "09 Gossip 模型",
    unit: "阶段 5.3 · 单元 5.3.1",
    xt: ["理论"],
    p: "没有中心节点，成千上万个节点怎么同步元数据？传染病模型为什么收敛得又快又稳？",
    k: [
      "传染病模型：每个节点周期性随机挑几个同伴交换信息",
      "反熵（anti-entropy）：push / pull / push-pull 三种模式与收敛速度",
      "谣言传播（rumor mongering）：低开销的「新鲜事」扩散",
      "O(log n) 收敛直觉；反熵保最终一致 + 谣言保低开销的分工",
    ],
    e: ["纸面模拟 16 节点 push-pull 传播，记录每轮已知节点数"],
    a: ["能说清两种机制的分工与收敛速度的直觉来源"],
  },
  {
    f: "consensus-10-swim-redis", d: "consensus", st: "阶段 5 · 共识算法",
    t: "SWIM 故障检测与 Redis Cluster 实操", s: "10 SWIM 与 Redis",
    unit: "阶段 5.3 · 单元 5.3.2 + 5.3.3",
    xt: ["实战"],
    p: "Gossip 怎么发现节点挂了又不误杀？Redis Cluster 用它管槽位与故障转移——最后一个工程锚点，阶段收官。",
    k: [
      "SWIM：直接探测失败 → 间接探测确认 → 怀疑 → 摘除",
      "成员信息 piggyback 在心跳里传播",
      "Redis Cluster：节点发现、16384 槽位、槽迁移、主从故障转移",
    ],
    e: [
      "6 节点（3 主 3 从）Redis Cluster：CLUSTER MEET 后观察节点表收敛",
      "kill 一个主节点，记录故障转移时间线（谁先怀疑、谁 promoted）",
    ],
    a: [
      "能说清「元数据系统用 Gossip（AP）、事务存储用 Raft（CP）」各自的合理性",
    ],
    ms: {
      n: "阶段 5",
      items: [
        "口述题一：Basic Paxos 两阶段各防住什么",
        "口述题二：Raft 一个日志条目从客户端到提交的完整旅程",
        "口述题三：为什么 Seata TC 用 Raft、Redis Cluster 用 Gossip，而两者都是对的",
      ],
    },
  },

  // ---------- 阶段 6：毕业 ----------
  {
    f: "capstone-01-decision-tree", d: "capstone", st: "阶段 6 · 毕业实战",
    t: "选型决策树：六方案一张图", s: "01 选型决策树",
    unit: "阶段 6 · 单元 6.1",
    xt: ["架构"],
    p: "拿到一个业务需求，怎么三分钟选出方案、并说出其它方案为什么不行？把 13 周的内容压缩成一棵决策树。",
    k: [
      "六方案决策树：强一致 → AT / TCC / XA；长事务第三方 → Saga；可异步 → 可靠消息；通知类 → 最大努力通知",
      "每个分支的反对理由：被淘汰方案的具体缺陷",
      "性能与侵入性的排序直觉",
    ],
    e: ["用 5 个真实需求（转账 / 退款 / 积分 / 物流通知 / 账务对账）各走一遍决策树"],
    a: ["5 题全对，且每题能说出被淘汰方案的具体缺陷"],
  },
  {
    f: "capstone-02-final-project", d: "capstone", st: "阶段 6 · 毕业实战",
    t: "毕业设计：五方案混搭电商交易链路", s: "02 毕业设计",
    unit: "阶段 6 · 单元 6.2",
    xt: ["架构"],
    p: "真实系统从来不是单一方案。把五种方案混进一条电商交易链路，每个环节都断一次，验证恢复能力——这是毕业设计。",
    k: [
      "链路设计：订单 + 库存（TCC 或 AT）、支付 → 积分（可靠消息）、物流通知（最大努力通知）、退款（Saga）",
      "架构图与设计文档：每个环节的选型理由必须用 CAP / BASE 说理",
      "失败演练矩阵：每个环节的人为故障点与预期行为",
    ],
    e: [
      "实现全链路（可用最小可行版本）",
      "逐环节人为断一次（kill / 超时 / 抛异常），验证恢复并记录",
    ],
    a: ["交付四件套：架构图、设计文档、可运行代码、故障演练记录"],
  },
  {
    f: "capstone-03-self-check", d: "capstone", st: "阶段 6 · 毕业实战",
    t: "资深自检 20 问", s: "03 自检 20 问",
    unit: "阶段 6 · 单元 6.3",
    xt: ["面试"],
    p: "学完到底掌握没有？20 问闭卷自测，答不出的按锚点回补对应阶段——这也是面试前的最后冲刺材料。",
    k: [
      "20 问清单：覆盖六个阶段的高频考点（AT 两阶段 / 全局锁 / fence / 事务消息回查 / 2PC 缺陷 / Raft 选举限制……）",
      "每问标注回补锚点（对应占位篇目）",
      "面试表述训练：每问答成 60 秒版本",
    ],
    e: ["闭卷自测一遍；答不出的回补对应篇目再测"],
    a: ["至少 18 问能脱稿讲清楚"],
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

  const tags = ["分布式", ...folder.tags, ...(art.xt || [])];

  const prev =
    idx === 1
      ? `上一篇：[《分布式事务学习总纲》](${GUIDE})`
      : `上一篇：[《${A[i - 1].t}》](/分布式/${A[i - 1].d}/${A[i - 1].f})`;
  const next =
    idx === A.length
      ? `下一篇：系列完结——回到 [《学习总纲》](${GUIDE}) 做毕业复盘`
      : `下一篇：[《${A[i + 1].t}》](/分布式/${A[i + 1].d}/${A[i + 1].f})`;

  const body = `---
title: "${art.t}"
sidebarGroup: "${folder.group}"
shortTitle: "${art.s}"
order: ${order}
date: 2026-08-22
category: "分布式"
tag:
${tags.map((t) => `  - "${t}"`).join("\n")}
description: "【占位待学】${art.t}——对应总纲${art.unit}。学完本篇应能：${art.a[0]}"
---

> **分布式事务系列 · ${art.st} · 第 ${idx}/${A.length} 篇 · 🚧 占位待学**
> ${prev}
> ${next}
> 学习大纲：[《分布式事务学习总纲》](${GUIDE})

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
- 版本口径以总纲环境清单为准（Apache Seata 2.6.0 / MySQL 8.0 / RocketMQ 5.x / Spring Boot 3.x）
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
