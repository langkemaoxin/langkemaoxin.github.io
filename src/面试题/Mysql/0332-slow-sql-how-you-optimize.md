---
title: "慢SQL你是怎么优化的"
sidebarGroup: "Mysql"
shortTitle: "慢SQL你是怎么优化的"
order: 332
date: 2026-07-09
category: "面试题"
tag:
  - "面试题"
description: "慢SQL你是怎么优化的"
article: false
---

> 来源：[慢SQL你是怎么优化的](https://www.yuque.com/tulingzhouyu/db22bv/iubmavhw2bml7arg)

兄弟们，面试问“慢 SQL 优化”，如果你只回答“加索引”，那你大概率还在 P5/P6 徘徊。 真正的架构师，看的是**全链路**，思考的是**成本与收益**。

今天 Fox 老师教大家一套“海陆空立体化”**的优化打法，尤其是要避开那些**过时的技术陷阱。

---

## ⚔️ 第一维度：全链路监控（发现敌情）

别等用户投诉了才去查。

1. **慢查询日志 (Slow Query Log)**：这是基建。生产环境开启，阈值设为 1s，结合 **pt-query-digest** 工具每天出分析报告。
2. **实时监控 (Real-time)**：利用 Prometheus + Grafana 或 PMM (Percona Monitoring and Management)，监控 **QPS 抖动**、**锁等待** 和 **IO 飙升**。

---

## ⚙️ 第二维度：精准诊断（分析工具的迭代）

![image](/面试题/Mysql/0332-slow-sql-how-you-optimize/img-d5e3056eee74.png)

这里有个**关键区分点**，能体现你的技术深度：

### 1. EXPLAIN（基础必修）

- `type`：目标是 `ref` 或 `range`。看到 `index`（全索引扫）或 `all`（全表扫）要警惕。
- `Extra`：

- `Using index`：完美（索引覆盖）。
- `Using filesort`：**注意！** 只有当 `sort_buffer` 装不下，需要磁盘排序时才是大忌。如果内存够用，其实还好。

![image](/面试题/Mysql/0332-slow-sql-how-you-optimize/img-f1d70c612383.png)

### 2. 弃用 `SHOW PROFILE`，拥抱 `Performance Schema`

**（高分点）**

“很多老教材教大家用 `SHOW PROFILE` 查看 CPU/IO 消耗。但这个命令早被废弃了。 我们团队现在主要用 **Performance Schema** 或 **sys schema**。 比如查询 `sys.statement_analysis` 视图，能看到全实例最耗 IO 的 SQL 是哪条，比 Profile 强大得多。”

![image](/面试题/Mysql/0332-slow-sql-how-you-optimize/img-43e47d5eed35.png)

### 3. Optimizer Trace（绝杀）

当 `EXPLAIN` 骗了你，明明有索引却不走时，开启 Trace 查看优化器的**代价计算过程 (Cost Model)**，看看是不是因为回表成本太高导致优化器放弃了索引。

---

## 🥊 第三维度：实战避坑（MySQL 8.0 新特性）

这一段抛出来，直接降维打击：

### 1. 索引失效的“新常识”

- **老生常谈**：函数计算、隐式转换、模糊查询左匹配，这些都会导致失效。
- **MySQL 8.0 颠覆点（Index Skip Scan）**：

- 以前说：联合索引 `(a,b,c)`，查 `WHERE b=1` 必死。
- **现在说**：在 MySQL 8.0+，如果字段 `a` 的区分度很低（如状态枚举），优化器会触发 **索引跳跃扫描**，依然能利用上索引！*（加上这句话，面试官就知道你技术在持续更新）*

![image](/面试题/Mysql/0332-slow-sql-how-you-optimize/img-8cef9e35ba1d.png)

### 2. 深分页的“特效药”

- **错误示范**：`LIMIT 1000000, 10`。

![image](/面试题/Mysql/0332-slow-sql-how-you-optimize/img-e783bf3a6007.png)

**条件解法**：

- `id > N`** 法**：仅适用于 **ID 连续且按 ID 排序** 的场景。如果按 `create_time` 排序，这招没用。
- **延迟关联 (Deferred Join)**：万能解法。

```sql
-- 先在索引树上把 ID 找出来（覆盖索引，不回表）
SELECT * FROM table t1 
JOIN (SELECT id FROM table ORDER BY time LIMIT 1M, 10) t2 ON t1.id = t2.id;
```

---

## 💣 第四维度：架构兜底（空间换时间）

SQL 优化总有极限（物理极限）。当单表数据量突破 2000 万，或者 SQL 极其复杂时，**不要硬刚 MySQL**。

1. **转移阵地**：

- **复杂搜索/全文检索**：上 **Elasticsearch**。MySQL 的 B+ 树不是为多维筛选设计的，ES 的倒排索引才是。
- **高频热点**：上 **Redis**。

1. **冷热分离**：

- 把 3 个月前的数据归档到历史表（History Table）或数仓（Hive/ClickHouse），保证核心业务表轻装上阵。

1. **读写分离**：

- 报表类的慢 SQL 强制走从库，绝不让它拖垮主库的写性能。

![image](/面试题/Mysql/0332-slow-sql-how-you-optimize/img-0aadab4610a9.png)

---

## 🎓 满分总结（背诵版）

“慢 SQL 优化是一个**闭环**过程：

1. **发现**：靠监控和日志。
2. **诊断**：`EXPLAIN` 看执行计划，8.0 下用 `Performance Schema` 分析资源消耗，必要时用 `Optimizer Trace` 查源码级原因。
3. **治理**：

- 战术上：利用覆盖索引、延迟关联优化深分页，并注意 8.0 的索引跳跃扫描新特性。
- 战略上：引入 ES、Redis 或冷热分离，解决 B+ 树的物理局限性。

核心思想是：**技术服务于业务，不要为了优化而优化，要看 ROI（投入产出比）。**”

---

**Fox 老师寄语：** 兄弟们，细节决定成败，新特性决定高度。加上 **MySQL 8.0** 和 **Performance Schema** 这些点，你的回答就不是背八股文，而是真正的技术沉淀！ **点赞、收藏**，下次面试前拿出来复习一遍，绝对稳！
