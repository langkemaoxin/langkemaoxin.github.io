---
title: "假如有个业务信息表，我要删除表前三个月state为0的数据，如何设计索引？为什么不用state做索引"
sidebarGroup: "综合篇"
shortTitle: "假如有个业务信息表，我要删除表前三个月state为0的数据，如何设计索引？为什么不用state做索引"
order: 120
date: 2026-05-21
category: "面试题"
tag:
  - "面试题"
description: "根据需求是要定期删除三个月前且 state=0 的业务信息表数据，核心 SQL 类大概长这样：DELETE FROM your_table WHERE state = 0 AND create_time &lt; '某个日期';一、如何设计"
article: false
---

> 来源：[假如有个业务信息表，我要删除表前三个月state为0的数据，如何设计索引？为什么不用state做索引](https://www.yuque.com/tulingzhouyu/db22bv/velgnom7tksibfn1)

根据需求是要定期删除**三个月前且 state=0** 的业务信息表数据，核心 SQL 类大概长这样：

```plsql
DELETE FROM your_table
WHERE state = 0 AND create_time < '某个日期';
```

### 一、如何设计索引？

建议为 `state` 和 `create_time` 建**复合索引**，如下：

```plsql
CREATE INDEX idx_state_createtime ON your_table (state, create_time);
```

**理由：**

- `state` 是等值匹配条件（`=`），而 `create_time` 是范围过滤条件（`）。
- 按最优实践，复合索引应把等值查询的列放前面，范围查询的列放后面。
- 这样，数据库可以先快速定位所有 state=0 的数据，再在这些数据中按 create_time 判断是否早于三个月前，极大减少了扫描和对比的数据行数。

---

### 二、为什么不用单独对 `state` 建索引？

**单独给 state 建索引效果差的原因如下：**

1. **选择性低**（通常只有 0/1 等少量不同的值），用 state 索引只能帮你筛出所有 state=0 的数据，如果这些数据量很大，还是要全表扫描这部分，再看哪些是三个月前的，性能就不高。
2. **不能用索引加速 create_time 条件**。单列 state 索引无法支持“先按 create_time 再筛 state=0”的需求。
3. **复合索引能同时支持这两种条件的组合筛选**，效率远大于单列索引。

---

### 总结

- **正确做法**：`(state, create_time)` 复合索引。
- **不推荐只用 state 索引**：选择性差，只能加速其中一部分，效率低。
