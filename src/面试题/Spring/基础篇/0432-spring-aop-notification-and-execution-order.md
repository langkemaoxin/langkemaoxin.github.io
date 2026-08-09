---
title: "Spring-AOP通知和执行顺序？"
sidebarGroup: "基础篇"
shortTitle: "Spring-AOP通知和执行顺序？"
order: 432
date: 2026-06-11
category: "面试题"
tag:
  - "面试题"
description: "Spring切面可以应用5种类型的通知：前置通知：在目标方法被调用之前调用通知功能；后置通知：在目标方法完成之后调用通知，此时不会关心方法的输出是什么；返回通知：在目标方法成功执行之后调用通知；异常通知：在目标方法抛出异常后调用通知；环绕通"
article: false
---

> 来源：[Spring-AOP通知和执行顺序？](https://www.yuque.com/tulingzhouyu/db22bv/xfezqv82xny1nep5)

Spring切面可以应用5种类型的通知：

1. 前置通知：在目标方法被调用之前调用通知功能；
2. 后置通知：在目标方法完成之后调用通知，此时不会关心方法的输出是什么；
3. 返回通知：在目标方法成功执行之后调用通知；
4. 异常通知：在目标方法抛出异常后调用通知；
5. 环绕通知：通知包裹了被通知的方法，在被通知的方法调用之前和调用之后执行自定义的行为。

执行顺序：

**Spring在5.2.7之前的执行顺序是：**

![image](/面试题/Spring/基础篇/0432-spring-aop-notification-and-execution-order/img-77ca0150beed.png)

**Spring在5.2.7之后就改变的通知的执行顺序改为：**

1、正常执行：前置--->方法---->返回--->后置

2、异常执行：前置--->方法---->异常--->后置
