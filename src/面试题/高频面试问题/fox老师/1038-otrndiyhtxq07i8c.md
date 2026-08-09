---
title: "平台每天有 1000 万张优惠券过期，怎么设计处理系统"
sidebarGroup: "fox老师"
shortTitle: "平台每天有 1000 万张优惠券过期，怎么设计处理系统"
order: 1038
date: 2026-03-24
category: "面试题"
tag:
  - "面试题"
description: "上周帮学弟复盘面试，他在某电商公司的二面栽了 —— 面试官问 “如果平台每天有 1000 万张优惠券过期，怎么设计处理系统”，他答 “直接用定时任务扫主表更新状态”，结果被面试官追问 “全表扫描的 I/O 压力怎么解决？锁竞争导致用户用券卡"
article: false
---

> 来源：[平台每天有 1000 万张优惠券过期，怎么设计处理系统](https://www.yuque.com/tulingzhouyu/db22bv/otrndiyhtxq07i8c)

上周帮学弟复盘面试，他在某电商公司的二面栽了 —— 面试官问 “如果平台每天有 1000 万张优惠券过期，怎么设计处理系统”，他答 “直接用定时任务扫主表更新状态”，结果被面试官追问 “全表扫描的 I/O 压力怎么解决？锁竞争导致用户用券卡顿时怎么处理？”，当场语塞。

其实 “海量优惠券过期处理” 是互联网业务的高频面试题，考察的不只是 “怎么实现”，更是对 “海量数据性能、数据一致性、架构解耦” 的理解。这篇文章就从真实业务场景出发，拆解常见踩坑点，最后给出能让面试官点头的标准答案。

## 一、先搞懂：为什么 “扫主表” 的思路必挂？

在回答方案前，必须先明确 “海量场景” 的核心痛点 —— 如果优惠券主表有 10 亿条记录（假设平台有 1 亿用户，人均 10 张券），直接执行以下 SQL：

```sql
UPDATE coupons 
SET status = 'expired' 
WHERE expire_time < NOW() AND status = 'unused';
```

会触发三个致命问题，这也是面试官判断你 “是否懂海量场景” 的关键：

### 1. 数据库性能灾难：全表扫描拖垮核心业务

主表的`expire_time`和`status`如果没有联合索引，会触发全表扫描 ——10 亿条记录的扫描会占用 90% 以上的数据库 I/O 和 CPU 资源，导致 “用户领券、用券、查券” 等核心操作超时（比如用户付款时要查可用券，结果数据库在扫过期券，直接卡住）。

即使加了索引，若过期券数量达 1000 万条，单次更新会生成巨大的事务日志（redo/undo log），日志刷盘会占用磁盘 IO，同样影响数据库稳定性。

### 2. 锁竞争：阻塞正常业务操作

MySQL 的 InnoDB 引擎在执行 UPDATE 时，会对匹配的行加 “行锁”。如果单次更新 1000 万条记录，这些行锁会持有几分钟甚至几小时，期间用户若要使用其中某张券（比如用户刚好想用一张快过期的券付款），会被阻塞直到锁释放，直接导致业务卡顿，甚至出现 “用户付不了款” 的严重问题。

### 3. 数据一致性风险：任务失败后无法重试

如果定时任务执行到一半（比如更新了 500 万条后），数据库突然宕机，重启后无法判断 “哪些券已经更新，哪些没更新”—— 重新执行会导致重复更新（把已过期的券再更一遍，虽不影响状态，但冗余操作），不执行又会遗漏 500 万条，最终导致 “部分过期券仍显示为可用”，引发用户投诉。

## 二、真实业务方案：临时表 + 定时任务（分层解耦）

电商、外卖平台的核心思路是 “**用轻量临时表隔离主表压力，用异步定时任务批量处理**”，本质是 “把‘判断过期’和‘更新状态’拆成两步，避免直接操作主表”。下面从 “表设计、核心流程、关键细节” 三部分拆解。

### 1. 两张表：分清 “核心数据” 和 “过期任务数据”

首先要拆分表结构，避免把所有数据堆在主表 —— 主表存用户用券需要的完整信息，临时表（过期任务表）只存 “判断过期 + 更新主表” 需要的最小数据。

#### （1）优惠券主表（coupons）：服务核心业务

主表面向 “用户领券、用券、查券”，需要存储完整信息，索引设计优先满足核心业务查询（比如用户查自己的可用券）。

```sql
CREATE TABLE `coupons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `coupon_code` VARCHAR(64) NOT NULL COMMENT '优惠券唯一码（用户可见）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-未使用，2-已使用，3-已过期，4-已冻结',
  `denomination` DECIMAL(10,2) NOT NULL COMMENT '面额（如10元）',
  `min_spend` DECIMAL(10,2) NOT NULL COMMENT '最低使用门槛（如满50元可用）',
  `expire_time` DATETIME NOT NULL COMMENT '过期时间',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间',
  `used_time` DATETIME NULL COMMENT '使用时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_coupon_code` (`coupon_code`) COMMENT '唯一码防重复',
  KEY `idx_user_status` (`user_id`, `status`) COMMENT '用户查可用券：按用户+未使用筛选'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='优惠券主表';
```

#### （2）优惠券过期任务表（coupon_expire_task）：仅服务过期处理

这张表是 “轻量中间层”，只存 3 个关键信息：`coupon_code`（关联主表）、`expire_time`（判断过期）、`task_status`（任务状态），数据量虽大但单条记录小，查询效率高。

```sql
CREATE TABLE `coupon_expire_task` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `coupon_code` VARCHAR(64) NOT NULL COMMENT '关联优惠券唯一码',
  `expire_time` DATETIME NOT NULL COMMENT '优惠券过期时间',
  `task_status` TINYINT NOT NULL DEFAULT 0 COMMENT '任务状态：0-待处理，1-已处理，2-处理失败',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '任务创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_coupon_code` (`coupon_code`) COMMENT '避免重复创建任务',
  KEY `idx_expire_taskstatus` (`expire_time`, `task_status`) COMMENT '核心索引：快速查待处理的过期任务'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='优惠券过期任务表';
```

**关键设计**：`idx_expire_taskstatus`联合索引 —— 让 “查询过期且待处理的任务”（`WHERE expire_time ）能走索引，避免全表扫描，这是整个方案的性能核心。

### 2. 三大核心流程：覆盖 “领券、用券、过期” 全场景

方案的关键是 “**让临时表和主表的数据同步，确保过期任务不遗漏、不重复**”，需要在领券、用券时做好数据联动，在过期时做好批量处理。

#### （1）用户领券：双表事务同步，确保任务不遗漏

用户领取优惠券时，必须同时在 “主表” 和 “任务表” 插入数据，且用**数据库事务**保证一致性 —— 避免 “主表有券但任务表没任务”（导致过期漏处理），或 “任务表有任务但主表没券”（导致无效任务）。

流程代码逻辑（伪代码）：

```java
@Transactional(rollbackFor = Exception.class)
public void receiveCoupon(Long userId, CouponDTO couponDTO) {
    // 1. 向主表插入完整优惠券信息
    Coupons coupons = new Coupons();
    coupons.setCouponCode(generateUniqueCode()); // 生成唯一码
    coupons.setUserId(userId);
    coupons.setStatus(1); // 未使用
    coupons.setDenomination(couponDTO.getDenomination());
    coupons.setExpireTime(couponDTO.getExpireTime());
    couponMapper.insert(coupons);
    
    // 2. 向任务表插入过期任务
    CouponExpireTask task = new CouponExpireTask();
    task.setCouponCode(coupons.getCouponCode());
    task.setExpireTime(couponDTO.getExpireTime());
    task.setTaskStatus(0); // 待处理
    expireTaskMapper.insert(task);
}
```

#### （2）用户用券：清理任务表，避免无效扫描

用户使用优惠券后，主表状态会更新为 “已使用”，此时任务表的 “过期任务” 已无意义 —— 必须同步删除或标记任务表记录，避免定时任务重复扫描已用券。

流程代码逻辑（伪代码）：

```java
@Transactional(rollbackFor = Exception.class)
public void useCoupon(String couponCode, Long userId) {
    // 1. 更新主表状态为“已使用”，并记录使用时间
    int updateCount = couponMapper.updateStatus(
        couponCode, userId, 2, new Date() // 2=已使用
    );
    if (updateCount == 0) {
        throw new BusinessException("优惠券不可用（可能已过期/已使用）");
    }
    
    // 2. 删除任务表对应记录（或更新task_status=1，视追踪需求而定）
    expireTaskMapper.deleteByCouponCode(couponCode);
}
```

#### （3）过期处理：定时任务批量处理，控制负载

这是核心环节 —— 用**分布式定时任务调度器**（如 XXL-Job、Elastic-Job）按固定周期（如 1 分钟）触发，每次只处理一批数据（如 2000 条），避免单次任务负载过高。

完整流程分 4 步：

1. **触发定时任务**：调度器每分钟触发`processExpiredCoupon()`方法；
2. **批量查询待处理任务**：从任务表查 “过期且待处理” 的任务，限制 2000 条；
3. **批量更新主表状态**：根据`couponCode`批量更新主表为 “已过期”；
4. **标记任务为已处理**：更新任务表状态为 “已处理”，避免重复处理。

代码逻辑（伪代码）：

```java
// 分布式定时任务：每分钟执行一次
@XxlJob("processExpiredCouponJob")
public void processExpiredCoupon() {
    // 1. 批量查询待处理的过期任务（每次2000条，控制负载）
    List&lt;CouponExpireTask&gt; taskList = expireTaskMapper.selectExpiredTasks(
        new Date(), // 当前时间（expire_time < 现在）
        0, // task_status=0（待处理）
        2000 // 批量大小
    );
    if (CollectionUtils.isEmpty(taskList)) {
        return; // 无过期任务，直接返回
    }
    
    // 2. 提取couponCode列表，批量更新主表状态为“已过期”
    List&lt;String&gt; couponCodes = taskList.stream()
        .map(CouponExpireTask::getCouponCode)
        .collect(Collectors.toList());
    couponMapper.batchUpdateStatus(
        couponCodes, 3, new Date() // 3=已过期
    );
    
    // 3. 批量更新任务表状态为“已处理”（保证幂等性：失败后下轮可重试）
    List&lt;Long&gt; taskIds = taskList.stream()
        .map(CouponExpireTask::getId)
        .collect(Collectors.toList());
    expireTaskMapper.batchUpdateTaskStatus(
        taskIds, 1 // 1=已处理
    );
}
```

#### （4）额外优化：定期清理任务表，保持轻量化

任务表的 “已处理” 记录会越来越多（每天 1000 万条），长期会影响查询性能 —— 需要另一个定时任务（如每天凌晨 3 点），删除 “已处理且创建时间超过 30 天” 的记录：

```sql
DELETE FROM coupon_expire_task 
WHERE task_status = 1 
  AND create_time < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## 三、方案优势：面试官最关注的 3 个点

在面试中，讲完方案后要主动总结优势，体现你对 “性能、可靠性、扩展性” 的思考：

1. **性能可控**：定时任务只扫描轻量任务表，且走联合索引，避免主表全表扫描；每次处理 2000 条，不会压垮数据库；
2. **可靠性高**：领券用事务保证双表一致，过期处理 “先更主表、再更任务表”—— 即使中间失败，任务表仍是 “待处理”，下轮可重试，保证最终一致性；
3. **架构解耦**：过期处理逻辑独立于 “领券、用券” 核心业务，后续可单独调整定时周期、批量大小，甚至替换成 “延时消息队列” 方案（比如业务量涨到 1 亿 / 天，可无缝迁移）。

## 四、面试标准答案模板（直接套用）

如果面试官问 “海量优惠券过期怎么处理”，可以按这个模板回答，逻辑清晰且覆盖关键点：

“我会采用‘**临时任务表 + 分布式定时任务**’的方案，核心是通过轻量任务表隔离主表压力，用异步批量处理保证性能和一致性，具体分三部分：

### 1. 表结构设计

- 一张**优惠券主表**：存用户用券需要的完整信息（如 couponCode、userId、面额、状态），索引优先满足核心查询（如 idx_user_status 供用户查可用券）；
- 一张**过期任务表**：只存 couponCode、expireTime、taskStatus，加 expireTime+taskStatus 的联合索引，确保过期查询高效。

### 2. 核心流程

- **领券时**：用数据库事务同步插入主表和任务表，避免数据不一致；
- **用券时**：更新主表为 “已使用”，同时删除任务表对应记录，避免无效扫描；
- **过期处理**：用 XXL-Job 每分钟触发任务，每次查 2000 条 “过期且待处理” 的任务，批量更新主表为 “已过期”，再标记任务表为 “已处理”；另外每天凌晨清理 30 天前的已处理任务，保持任务表轻量化。

### 3. 方案优势

- 性能上：任务表轻量且有索引，避免主表全表扫描，批量处理控制负载；
- 可靠性上：事务保证一致性，重试机制避免遗漏；
- 扩展性上：过期逻辑与核心业务解耦，后续可迁移到延时消息队列（如 RocketMQ），应对更大规模业务。”

按这个模板回答，既覆盖了 “怎么做”，又解释了 “为什么这么做”，还体现了扩展性思考，面试官大概率会认可你的系统设计能力。
