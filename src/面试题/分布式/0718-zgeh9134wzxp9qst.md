---
title: "什么是分布式事务"
sidebarGroup: "分布式"
shortTitle: "什么是分布式事务"
order: 718
date: 2026-06-11
category: "面试题"
tag:
  - "面试题"
description: "分布式事务是相对本地事务而言的，对于本地事务，利用数据库本身的事务机制，就可以保证事务的ACID特性。ACID而在分布式环境下，会涉及到多个数据库。多数据库分布式事务其实就是将对同一库事务的概念扩大到了对多个库的事务。目的是为了保证分布式系"
article: false
---

> 来源：[什么是分布式事务](https://www.yuque.com/tulingzhouyu/db22bv/zgeh9134wzxp9qst)

分布式事务是相对本地事务而言的，对于本地事务，利用数据库本身的事务机制，就可以保证事务的ACID特性。

![image](https://cdn.nlark.com/yuque/0/2023/png/22309163/1695888893434-299916d8-40d8-48d4-a167-58e2342e0f2a.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_30%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

ACID

而在分布式环境下，会涉及到多个数据库。

![image](https://cdn.nlark.com/yuque/0/2023/jpeg/22309163/1695889076528-e0c496e5-a7c3-4122-b377-c4f730b15194.jpeg?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_26%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

多数据库

分布式事务其实就是将对同一库事务的概念扩大到了对多个库的事务。目的是为了保证分布式系统中的数据一致性。

分布式事务处理的关键是：

1. **需要记录事务在任何节点所做的所有动作；**
2. **事务进行的所有操作要么全部提交，要么全部回滚。**
