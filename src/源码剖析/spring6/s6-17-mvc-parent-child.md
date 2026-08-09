---
title: "17.SpringMVC子父容器启动流程"
sidebarGroup: "Spring 6 源码"
shortTitle: "17.SpringMVC子父容器启动流程"
order: 17
date: 2025-09-30
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "17.SpringMVC子父容器启动流程"
---

> 来源：[17.SpringMVC子父容器启动流程](https://www.yuque.com/geren-t8lyq/ru879g/yykdblw3sax1fifm)

在线笔记：

[https://www.yuque.com/geren-t8lyq/ru879g/yykdblw3sax1fifm?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/yykdblw3sax1fifm?singleDoc#)

课上流程图：

[https://www.processon.com/view/link/68d8db50419c8645925ebece](https://www.processon.com/view/link/68d8db50419c8645925ebece)

完整流程图：

[https://www.processon.com/view/link/610e6a167d9c082be334ec49](https://www.processon.com/view/link/610e6a167d9c082be334ec49)

[https://www.processon.com/view/link/616c2f6007912906b2a64b9d](https://www.processon.com/view/link/616c2f6007912906b2a64b9d)

## 1、SPI的方式SpringMVC子父容器启动原理

接着我们来看看SPI方式的原理是什么：

**流程图：**

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-001.png)

### 源码流程

外置Tomcat启动的时候通过SPI 找到我们应用中的/META-INF/service/javax.servlet.ServletContainerInitializer

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-002.png)

调用SpringServletContainerInitializer.onStartUp()

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-003.png)

调用`onStartUp()`前会先找到`@HandlesTypes(WebApplicationInitializer.class) `所有实现了`WebApplicationInitializer`的类，传入到OnStartup的`webAppInitializerClasses`参数中，并传入Servlet上下文对象。

重点关注这组类：他们组成了父子容器

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-004.png)

找到所有`WebApplicationInitializer`的实现类后， 不是接口、不是抽象则通过反射进行实例化（所以，你会发现内部实现类都是抽象的，你想让其起作用我们必须添加一个自定义实现类，在下文提供我的自定义实现类）

调用所有上一步实例化后的对象的`onStartup`方法

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-005.png)

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-006.png)

1. 首先来到`AbstractDispatcherServletInitializer#onStartup`再执行`super.onStartup(servletContext);`

```java
@Override
public void onStartup(ServletContext servletContext) throws ServletException {
    //实例化我们的spring root上下文
    super.onStartup(servletContext);
    //注册我们的DispatcherServlet   创建我们spring web 上下文对象
    registerDispatcherServlet(servletContext);
}
```

### 创建父容器——ContextLoaderListener

2.父类`AbstractContextLoaderInitializer#onStartup`执行`registerContextLoaderListener(servletContext);`

`createRootApplicationContext()`该方法中会**创建父容器**

该方法是抽象方法，实现类是`AbstractAnnotationConfigDispatcherServletInitializer`

调用`getRootConfigClasses();`方法获取父容器配置类（此抽象方法在我们自定义的子类中实现提供我们自定义的映射路径 ）

创建父容器，注册配置类

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-007.png)

会创建`ContextLoaderListener`并通过`ServletContext`注册

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-008.png)

看完大家是不是感觉跟我们XML的配置`ContextLoaderListener`对上了：

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-009.png)

### 创建子容器——DispatcherServlet

3.回到`AbstractDispatcherServletInitializer#onStartup`再执行`registerDispatcherServlet(servletContext);`

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-010.png)

`registerDispatcherServlet`**方法说明：**

调用`createServletApplicationContext`**创建子容器**

该方法是抽象方法，实现类是`AbstractAnnotationConfigDispatcherServletInitializer`

创建子容器（下图很明显不多介绍）

调用抽象方法：`getServletConfigClasses();`获得配置类（此抽象方法在我们自定义的子类中实现提供我们自定义的配置类 ）

配置类除了可以通过`ApplicationContext()`构造函数的方式传入 ， 也可以通过这种方式动态添加，不知道了吧~

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-011.png)

调用`createDispatcherServlet(servletAppContext);`创建`DispatcherServlet`

设置启动时加载：`registration.setLoadOnStartup(1);`

调用抽象方法设置映射路径：`getServletMappings()`（此抽象方法在我们自定义的子类中实现提供我们自定义的映射路径 ）

看完大家是不是感觉跟我们XML的配置DispatcherServlet对上了

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-012.png)

## 2. 初始化ContextLoaderListener

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-013.png)

`ContextLoaderListener`加载过程比较简单：

外置tomcat会帮我们调用`ContextLoaderListener#contextInitialized` 进行初始化

xml的方式下会判断容器为空时创建父容器

在里面会调用父容器的refresh方法加载

将父容器存入到Servlet域中供子容器使用

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-014.png)

## 3. 初始化DispatcherServlet

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-015.png)

可以看到流程比`ContextLoaderListener`流程更多

外置tomcat会帮我们调用`DispatcherServlet#init() `  进行初始化--->重点关注：`initWebApplicationContext`方法

`getWebApplicationContext(getServletContext())`获得父容器（从之前的Servlet域中拿到）

`cwac.setParent(rootContext);`给子容器设置父容器

调用`configureAndRefreshWebApplicationContext(cwac);`

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-016.png)

注册一个监听器（该监听会初始化springmvc所需信息）

`ContextRefreshedEvent`可以看到该监听器监听的是容器refreshed事件， 会在`finishRefresh`中发布

刷新容器

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-017.png)

**当执行refresh 即加载ioc容器  完了会调用finishRefresh():**

`publishEvent(new ContextRefreshedEvent(this));`发布`ContextRefreshedEvent`事件

触发上面的`ContextRefreshListener`监听器：

`---->FrameworkServlet.this.onApplicationEvent(event);`

`-------->onRefresh(event.getApplicationContext());`

`-------------->initStrategies(context);`

```java
protected void initStrategies(ApplicationContext context) {
   //初始化我们web上下文对象的 用于文件上传下载的解析器对象
   initMultipartResolver(context);
   //初始化我们web上下文对象用于处理国际化资源的
   initLocaleResolver(context);
   //主题解析器对象初始化
   initThemeResolver(context);
   //初始化我们的HandlerMapping
   initHandlerMappings(context);
   //实例化我们的HandlerAdapters
   initHandlerAdapters(context);
   //实例化我们处理器异常解析器对象
   initHandlerExceptionResolvers(context);
   initRequestToViewNameTranslator(context);
   //给DispatcherSerlvet的ViewResolvers处理器
   initViewResolvers(context);
   initFlashMapManager(context);
}
```

这里面的每一个方法不用太细看，  就是给SpringMVC准备初始化的数据，  为后续SpringMVC处理请求做准备

基本都是从容器中拿到已经配置的Bean（RequestMappingHandlerMapping、RequestMappingHandlerAdapter、HandlerExceptionResolver  ）放到dispatcherServlet中做准备:

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-018.png)

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-019.png)

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-020.png)

**...**

但是这些Bean又是从哪来的呢？？  来来来， 回到我们的`WebAppConfig`

我们使用的一个`@EnableWebMvc  `

导入了`DelegatingWebMvcConfiguration``@Import(DelegatingWebMvcConfiguration.class)`

`DelegatingWebMvcConfiguration`的父类就配置了这些Bean

而且我告诉你SpringBoot也是用的这种方式，

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-021.png)

## 总结

1. Tomcat在启动时会通过SPI注册 ContextLoaderListener和DispatcherServlet对象
2. 同时创建父子容器
3. 分别创建在ContextLoaderListener初始化时创建父容器设置配置类
4. 在DispatcherServlet初始化时创建子容器 即2个ApplicationContext实例设置配置类
5. Tomcat在启动时执行ContextLoaderListener和DispatcherServlet对象的初始化方法， 执行容器refresh进行加载
6. 在子容器加载时 创建SpringMVC所需的Bean和预准备的数据：(通过配置类+@EnableWebMvc配置（DelegatingWebMvcConfiguration）——可实现WebMvcConfigurer进行定制扩展）
7. RequestMappingHandlerMapping，它会处理@RequestMapping 注解

1. 子容器需要注入父容器的Bean时（比如Controller中需要@Autowired Service的Bean）;  会先从子容器中找，没找到会去父容器中找： 详情见AbstractBeanFactory#doGetBean方法

```java
/** 
 * 一般情况下,只有Spring 和SpringMvc整合的时才会有父子容器的概念, 
 * 作用：
 * 比如我们的Controller中注入Service的时候，发现我们依赖的是一个引用对象，那么他就会调用getBean去把service找出来
 * 但是当前所在的容器是web子容器，那么就会在这里的 先去父容器找
 */
BeanFactory parentBeanFactory = getParentBeanFactory();
//若存在父工厂,且当前的bean工厂不存在当前的bean定义,那么bean定义是存在于父beanFacotry中
if (parentBeanFactory != null && !containsBeanDefinition(beanName)) {
   //获取bean的原始名称
   String nameToLookup = originalBeanName(name);
   //若为 AbstractBeanFactory 类型，委托父类处理
   if (parentBeanFactory instanceof AbstractBeanFactory) {
      return ((AbstractBeanFactory) parentBeanFactory).doGetBean(
            nameToLookup, requiredType, args, typeCheckOnly);
   }
   else if (args != null) {
      //  委托给构造函数 getBean() 处理
      return (T) parentBeanFactory.getBean(nameToLookup, args);
   }
   else {
      // 没有 args，委托给标准的 getBean() 处理
      return parentBeanFactory.getBean(nameToLookup, requiredType);
   }
}
```

## 用几道面试题做个总结:

### Spring和SpringMVC为什么需要父子容器？不要不行吗？

就实现层面来说不用子父容器也可以完成所需功能（参考：SpringBoot就没用子父容器）  一套完整spring整个体系结合体

所以父子容器的主要作用应该是早期Spring为了划分框架边界。有点单一职责的味道。service、dao层我们一般使用spring框架来管理、controller层交给springmvc管理

规范整体架构 使 父容器service无法访问子容器controller、子容器controller可以访问父容器 service

方便子容器的切换。如果现在我们想把web层从spring mvc替换成struts，那么只需要将spring-mvc.xml替换成Struts的配置文件struts.xml即可，而spring-core.xml不需要改变。

为了节省重复bean创建

### 是否可以把所有Bean都通过Spring容器来管理？（Spring的applicationContext.xml中配置全局扫描)

不可以，这样会导致我们请求接口的时候产生404。 如果所有的Bean都交给父容器，SpringMVC在初始化HandlerMethods的时候（initHandlerMethods）无法根据Controller的handler方法注册HandlerMethod，并没有去查找父容器的bean；

也就无法根据请求URI 获取到 HandlerMethod来进行匹配.

![image](/源码剖析/spring6/s6-17-mvc-parent-child/img-022.png)

### 是否可以把我们所需的Bean都放入Spring-mvc子容器里面来管理（springmvc的spring-servlet.xml中配置全局扫描）?

**可以 **， 因为父容器的体现无非是为了获取子容器不包含的bean,  如果全部包含在子容器完全用不到父容器了，  所以是可以全部放在springmvc子容器来管理的。

虽然可以这么做不过一般应该是不推荐这么去做的，一般人也不会这么干的。**如果你的项目里有用到事物、或者aop记得也需要把这部分配置需要放到Spring-mvc子容器的配置文件来，不然一部分内容在子容器和一部分内容在父容器,可能就会导致你的事物或者AOP不生效**。     所以如果aop或事物如果不生效也有可能是通过父容器(spring)去增强子容器(Springmvc)，也就无法增强 这也是很多同学会遇到的问题。
