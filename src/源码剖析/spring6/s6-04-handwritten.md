---
title: "4.手写模拟Spring底层原理"
sidebarGroup: "Spring 6 源码"
shortTitle: "4.手写模拟Spring底层原理"
order: 4
date: 2025-09-28
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "4.手写模拟Spring底层原理"
---

> 来源：[4.手写模拟Spring底层原理](https://www.yuque.com/geren-t8lyq/ru879g/fxl0kers64e4kegd)

在线资料：

[https://www.yuque.com/geren-t8lyq/ru879g/fxl0kers64e4kegd?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/fxl0kers64e4kegd?singleDoc#) 《3.手写模拟Spring底层原理》

手写模拟Spring代码，太多的笔记，请直接看视频，建议同学们抽空自己也写一个Spring出来，加深理解。

git clone地址：[https://gitee.com/xscodeit/xushu-springframwrok.git](https://gitee.com/xscodeit/xushu-springframwrok.git)

课程内容：

### 通过手写模拟，了解Spring的底层源码启动过程

Spring 流程图：[https://www.processon.com/view/link/68aefe8d687a3f3e21d7702b?cid=68a8595777321f26867aa352](https://www.processon.com/view/link/68aefe8d687a3f3e21d7702b?cid=68a8595777321f26867aa352)

### 通过手写模拟，了解Spring解析配置类等底层源码工作流程

### 通过手写模拟，了解BeanDefinition解析流程

### 通过手写模拟，理解BeanPostProcessor注册和调用过程

### 通过手写模拟，了解Bean的创建过程（实例化、依赖注入，初始化回调等底层源码工作流程）

### 通过手写模拟，了解Spring AOP的底层源码工作流程

1. 本手写课程没有实现切面、切点表达式、通知等解析(太麻烦）
2. 切点表达式其实就是利用aspectj的能力

```xml
<dependencies>
  <dependency>
    <groupId>org.aspectj</groupId>
    <artifactId>aspectjrt</artifactId>
    <version>1.9.19</version>
  </dependency>
  <dependency>
    <groupId>org.aspectj</groupId>
    <artifactId>aspectjweaver</artifactId>
    <version>1.9.19</version>
  </dependency>
</dependencies>
```

```java
package com.xushu.springframework;
 
import com.xushu.app.service.UserService;
import org.aspectj.weaver.tools.PointcutExpression;
import org.aspectj.weaver.tools.PointcutParser;
import org.aspectj.weaver.tools.ShadowMatch;

import java.lang.reflect.Method;

public class PointcutExpressionEvaluator {
    public static void main(String[] args) throws NoSuchMethodException {
        // 定义切点表达式
        String pointcutExpression = "execution(* com.xushu.app.UserService.add(..))";

        // 获取目标类和方法
        Class<?> targetClass = UserService.class;
        Method targetMethod = targetClass.getMethod("delete");

        PointcutParser parser = PointcutParser.getPointcutParserSupportingAllPrimitivesAndUsingContextClassloaderForResolution();
        PointcutExpression pcExpr = parser.parsePointcutExpression(pointcutExpression);
        ShadowMatch match = pcExpr.matchesMethodExecution(targetMethod);
        if (match.alwaysMatches()) {
            System.out.println("ok");
        } else {
            System.out.println("no");
        }
    }
}

class TargetClass {
    public void targetMethod() {
        // 方法体
    }
}
```

### 通过手写模拟，了解Spring 循环依赖的底层源码工作流程

循环依赖流程图：[https://www.processon.com/view/link/5f1fb2cf1e08533a628a7b4c](https://www.processon.com/view/link/5f1fb2cf1e08533a628a7b4c)

## 循环依赖总结

> **循环依赖问题**： 多个Bean直接形成依赖的闭环，从而会死循环的依赖
> **原因**：依赖注入的过程中，bean还没有创建完（没有一个死循环的出口）
> 
> 
> **Spring是怎么解决循环依赖的？**
> 第三级缓存
> 
> 
> 
> 
> **二级缓存能不能解决循环依赖？**
>   如果单纯依赖的闭环问题， 一级缓存都可以解决， 其实只需要提供一个死循环出口
> 
> 
>   一级缓存有什么问题： 多线程并发 锁粒度过大、影响性能（已经创建好的Bean也需要上锁）
> 
> 
> 
> 
> 
> 
> 
> **bean是怎么保证多线程安全的？**
> Bean---> 单例--->单例设计模式---->单例设计模式怎么保证线程安全的？
> 
> 
> 通过双重检查锁
> 
> 
> 
> 
> 
> 
> **二级缓存有什么作用**
> 二级缓存：  提升性能
> 
> 
> **三级缓存有什么作用，为什么要三级缓存**
> AOP 有关系  --> 不是绝对有关系
> 
> 
> 在循环依赖中， AOP有什么问题：（ 循环依赖的bean属性 和 容器中的bean 不一致）
> 
> 
> 只有二级缓存的问题：是要在实例化后创建AOP动态代理，  导致bean的生命周期规范被破坏
> 
> 
> 解决方案： 循环依赖特殊情况就提前创建AOP，  否则依然在初始化后创建AOP
> 
> 
> 三级缓存作用：bean的生命周期规范，存的是函数式接口， 提升扩展性
> 
> 
> **构造函数中的循环依赖Spring有没有解决**
> 
> 
> 没有解决（会报错）， 因为无法实例化， 就拿不出实例对象， 没有实例对象拿什么缓存？
> 
> 
> 解决方案：@Lazy  ---> 会通过cglib创建动态代理  A.b=proxy(B)
> 
> 
> **·多例Bean的循环依赖Spring有没有解决**
> 没有解决（无解）
> 多例本身就是每次都需要创建一个新的bean， 根本就不需要缓存， 但是没有缓存怎么解决循环依赖？
> 
> 
> **循环依赖中@Async问题**
> **6.2+改进不会报错**： 由于Spring6.2支持异步创建， 当出现BeanCurrentlyInCreationException Spring设计者认为这是正常的，觉得是其他的线程正在创建， 所以会忽略。
> **6.2-报错**
![image.png](/源码剖析/spring6/s6-04-handwritten/img-001.png)

> 解决：@Lazy在依赖注入的属性上加上@Async： 相当于异常注入， 真正用到的时候再去从容器中获取@Async的bean ,  已经在容器（一级缓存）创建动态代理
> **根本问题原因：**@Async没有提前创建动态代理的实现,导致一级缓存和依赖注入属性不一致。
