---
title: "1. Spring6源码编译"
sidebarGroup: "Spring 6 源码"
shortTitle: "1. Spring6源码编译"
order: 1
date: 2026-04-10
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "1. Spring6源码编译"
---

> 来源：[1. Spring6源码编译](https://www.yuque.com/geren-t8lyq/ru879g/gu4h21zdi5pv9ltt)

此教程基于spring6.2.9讲解

## 前置准备

1. jdk17
2. idea 2023(建议）

下载+破解[https://www.exception.site/essay/idea-reset-eval](https://www.exception.site/essay/idea-reset-eval)

1. 下载gradle(建议，以免idea编译期远程下载gradle-warpper导致超时）

- 找到版本：

选择gradle/wrapper/gradle-wrapper.properties对应的版本：8.14.3

![image.png](/源码剖析/spring6/s6-01-compile/img-001.png)

- 下载

建议去[华为云](https://mirrors.huaweicloud.com/repository/toolkit/gradle/ )下载.比较快！

1. 选择对应版本下载-all.zip（好像没有8.14.3尴尬）
2. 去官网下载吧

[https://gradle.org/next-steps/?version=8.14.3&format=all](https://gradle.org/next-steps/?version=8.14.3&format=all)

## 下载源码

去github下载源码：避免github下载失败

📎 [spring-framework-6.2.9.zip](https://www.yuque.com/attachments/yuque/0/2025/zip/22309163/1755690807085-f5edaf56-fb66-46d0-9129-c0283d6cbc0b.zip)

1. 配置idea , 配置为你下载的gradle

![image.png](/源码剖析/spring6/s6-01-compile/img-002.png)

## 配置镜像

1. build.gradle加入maven镜像
![image.png](/源码剖析/spring6/s6-01-compile/img-003.png)

```java
        maven { url 'https://maven.aliyun.com/repository/public' }
		maven { url 'https://maven.aliyun.com/repository/jcenter' }
		mavenCentral()
		maven { url "https://repo.spring.io/libs-spring-framework-build" }
		maven { url "https://repo.spring.io/milestone" } // Reactor
```

1. spring-framework-6.2.9\buildSrc\build.gradle ****加入插件镜像

```java

repositories {
    maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }
    gradlePluginPortal()
    maven { url 'https://maven.aliyun.com/repository/public' }
}

```

## 加入测试代码

![image.png](/源码剖析/spring6/s6-01-compile/img-004.png)

```java
@Configuration
@ComponentScan
public class Main {
	public static void main(String[] args) {
		AnnotationConfigApplicationContext ioc = new AnnotationConfigApplicationContext(Main.class);

		Main main = (Main) ioc.getBean("xushu");
		System.out.println(main.getClass());
	}
 
}
```

## 常见问题：

### 如何加依赖

在模块的.gradle文件中：

```java
dependencies {
    implementation(project(":spring-beans"))
    implementation(project(":spring-jdbc"))
    implementation(project(":spring-context"))
    implementation(project(":spring-aop"))
    implementation(project(":spring-web"))
    implementation(project(":spring-core"))

    implementation(project(":spring-tx"))
    implementation(project(":spring-instrument"))
    implementation(project(":spring-oxm"))
}
```

### 加了依赖依然不解析

gradle文件要和你的工程名一致，这是我6之前版本没有出现过的。 比如：

![image.png](/源码剖析/spring6/s6-01-compile/img-005.png)

### 每次运行Main方法都会编译gradle

![image.png](/源码剖析/spring6/s6-01-compile/img-006.png)

### 修改build and run using 后不通过，报各种找不到符号

将对应报错工程的spring-xxx的依赖optional改为api

前

![image.png](/源码剖析/spring6/s6-01-compile/img-007.png)

后：

![image.png](/源码剖析/spring6/s6-01-compile/img-008.png)

### 出现乱码

先设置idea的编码， 如果还乱码， 在gradle.properties中加入：

```plain
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8 -Dconsole.encoding=UTF-8
```

![image.png](/源码剖析/spring6/s6-01-compile/img-009.png)

### 出现download失败的依赖

- 如果出现**超时**可能是你的你配置**第3点的镜像**
- 如果出现**401**等异常

比如：

![image.png](/源码剖析/spring6/s6-01-compile/img-010.png)

1. 将报错的插件去 阿里云仓库中按名字进行搜索：[https://developer.aliyun.com/mvn/search](https://developer.aliyun.com/mvn/search)
2. 如果搜到了开源看到是来自于gradle.plugin或jcenter仓库， 只有0.0.4，没有0.0.2

1. 那这里就要改2个地方：1修改plugin下载镜像 2.修改plugin对应的版本

![image.png](/源码剖析/spring6/s6-01-compile/img-011.png)

1. 将gradle.plugin或jcenter仓库的镜像地址加入到spring-framework-6.2.9\buildSrc\build.gradle

![image.png](/源码剖析/spring6/s6-01-compile/img-012.png)

1. 加入到settings.gradle

![image.png](/源码剖析/spring6/s6-01-compile/img-013.png)

1. 修改plugin对应的版本：

![image.png](/源码剖析/spring6/s6-01-compile/img-014.png)
