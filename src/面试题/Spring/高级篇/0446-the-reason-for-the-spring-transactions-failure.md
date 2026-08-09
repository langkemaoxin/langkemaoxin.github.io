---
title: "Spring事务的失效原因？"
sidebarGroup: "高级篇"
shortTitle: "Spring事务的失效原因？"
order: 446
date: 2026-06-11
category: "面试题"
tag:
  - "面试题"
description: "1. 配置不对：方法是private 也会失效，解决：改成public目标类没有配置为Bean也会失效 解决：配置为Bean自己捕获了异常 解决：不要捕获处理使用cglib动态代理，但是@Transactional声明在接口上面抛出了非Ru"
article: false
---

> 来源：[Spring事务的失效原因？](https://www.yuque.com/tulingzhouyu/db22bv/oq3yl04fehofd252)

## 配置不对：

1. 方法是private 也会失效，解决：改成public
2. 目标类没有配置为Bean也会失效 解决：配置为Bean
3. 自己捕获了异常 解决：不要捕获处理
4. 使用cglib动态代理，但是@Transactional声明在接口上面
5. 抛出了非RuntimeException异常 解决 ：通过rollbackfor指定回滚的异常

## 不支持：

1. **内部方法调用导致事务传播失效.**

解决方式：必须走**代理， 重新拿到代理对象再次执行方法才能进行增强**

- **在本类中注入当前的bean**
- **设置暴露当前代理对象到本地线程， 可以通过**AopContext.currentProxy() 拿到当前正在调用的动态代理对象

@EnableAspectJAutoProxy(exposeProxy = true)

**2. 多线程事务.**

解决方式：

- 通过编程式事务， 手动控制事务提交、回滚；
- 通过分布式事务思想：2PC\3PC\SAGA等等
