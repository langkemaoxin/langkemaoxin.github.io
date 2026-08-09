---
title: "解释Spring中bean的生命周期"
sidebarGroup: "高级篇"
shortTitle: "解释Spring中bean的生命周期"
order: 452
date: 2026-06-06
category: "面试题"
tag:
  - "面试题"
description: "Bean生命周期：指定的就是Bean从创建到销毁的整个过程: 分4大步：实例化通过反射去推断构造函数进行实例化实例工厂、 静态工厂依赖注入（DI）解析自动装配（byname bytype constractor none @Autowire"
article: false
---

> 来源：[解释Spring中bean的生命周期](https://www.yuque.com/tulingzhouyu/db22bv/xp7igarg3iivvs54)

Bean生命周期：指定的就是Bean从创建到销毁的整个过程: 分4大步：

1. 实例化

1. 通过反射去推断构造函数进行实例化
2. 实例工厂、 静态工厂

1. 依赖注入（DI）

1. 解析自动装配（byname bytype constractor none @Autowired）

1. 初始化

1. 调用很多Aware回调方法
2. 调用BeanPostProcessor.postProcessBeforeInitialization
3. 调用生命周期回调初始化方法
4. 调用BeanPostProcessor.postProcessAfterInitialization, 如果bean实现aop则会在这里创建动态代理

1. 销毁

1. 在spring容器关闭的时候进行调用
2. 调用生命周期回调销毁方法

这4大步组成了Bean的生命周期
