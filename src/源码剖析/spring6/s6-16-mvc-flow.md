---
title: "16.SpringMVC无XML启动流程和请求流程"
sidebarGroup: "Spring 6 源码"
shortTitle: "16.SpringMVC无XML启动流程和请求流程"
order: 16
date: 2025-09-28
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "16.SpringMVC无XML启动流程和请求流程"
---

> 来源：[16.SpringMVC无XML启动流程和请求流程](https://www.yuque.com/geren-t8lyq/ru879g/gf15vyucapz7f3a6)

在线笔记：[https://www.yuque.com/geren-t8lyq/ru879g/gf15vyucapz7f3a6?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/gf15vyucapz7f3a6?singleDoc#)

课程流程图：

[https://www.processon.com/view/link/68d8db50419c8645925ebece](https://www.processon.com/view/link/68d8db50419c8645925ebece)

完整流程图：

**SpringMVC启动流程**[https://www.processon.com/view/link/610e6a167d9c082be334ec49](https://www.processon.com/view/link/610e6a167d9c082be334ec49)

**@RequestMapping原理**[https://www.processon.com/view/link/615ea79e1efad4070b2d6707](https://www.processon.com/view/link/615ea79e1efad4070b2d6707)

**SpringMVC 整体请求流程**

[https://www.processon.com/view/link/616553cd1e085340f843bcf7](https://www.processon.com/view/link/616553cd1e085340f843bcf7)

## 1、Spring整合SpringMVC

相信大家在SSM框架整合的时候都曾在web.xml配置过这段：

```xml
<!--spring 基于web应用的启动-->
<listener>
  <listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
</listener>
<!--全局参数：spring配置文件-->
<context-param>
  <param-name>contextConfigLocation</param-name>
  <param-value>classpath:spring-core.xml</param-value>
</context-param>
<!--前端调度器servlet-->
<servlet>
  <servlet-name>dispatcherServlet</servlet-name>
  <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
  <!--设置配置文件的路径-->
  <init-param>
    <param-name>contextConfigLocation</param-name>
    <param-value>classpath:spring-mvc.xml</param-value>
  </init-param>
  <!--设置启动即加载-->
  <load-on-startup>1</load-on-startup>
</servlet>
<servlet-mapping>
  <servlet-name>dispatcherServlet</servlet-name>
  <url-pattern>/</url-pattern>
</servlet-mapping>
```

但是它的作用是什么知道吗？

![image](/源码剖析/spring6/s6-16-mvc-flow/img-001.png)

有人可能只知道DispatcherServlet叫前端控制器，是SpringMVC处理前端请求的一个核心调度器

那它为什么能处理请求？处理之前做了什么准备工作呢？又是怎么和Spring结合起来的呢？

为什么有了DispatcherServlet还要个ContextLoaderListener， 配一个不行吗？干嘛要配俩啊？

看完本文你就会有答案！

![image](/源码剖析/spring6/s6-16-mvc-flow/img-002.png)

还有人可能会觉得， 我现在都用SpringBoot开发， 哪还要配这玩意.......

![image](/源码剖析/spring6/s6-16-mvc-flow/img-003.png)

这就是典型的SpringBoot使用后遗症，SpringBoot降低了使用难度，但是从某种程度来说，也让初级的程序员变得更加小白，把实现原理都隐藏起来了而我们只管用，一旦涉及扩展就束手无策。

那当然我们今天不讲SpringBoot,我们今天用贴近

![image](/源码剖析/spring6/s6-16-mvc-flow/img-004.png)

SpringBoot的方式来讲SpringMVC。

![image](/源码剖析/spring6/s6-16-mvc-flow/img-005.png)

也就是**零配置（零xml）的方式**来说明SpringMVC的原理！！

此方式作为我们本文重点介绍，也是很多人缺失的一种方式， 其实早在Spring3+就已经提供， 只不过我们直到SpringBoot才使用该方式进行自动配置， 这也是很多人从xml调到SpringBoot不适应的原因， 因为你缺失了这个版本。  所以我们以这种方式作为源码切入点既可以理解到XML的方式又能兼顾到SpringBoot的方式 。

## 2、零配置SpringMVC实现方式：

那没有配置就需要省略掉web.xml 怎么省略呢？

在Servlet3.0提供的规范文档中可以找到2种方式：

### 注解的方式

@WebServlet

@WebFilter

@WebListener

但是这种方式不利于扩展， 并且如果编写在jar包中tomcat是无法感知到的。

### SPI的方式

在Serlvet3-1的规范手册中：就提供了一种更加易于扩展可用于共享库可插拔的一种方式，参见8.2.4：

![image](/源码剖析/spring6/s6-16-mvc-flow/img-006.png)

也就是让你在应用META-INF/services 路径下 放一个 javax.servlet.ServletContainerInitailizer  ——即SPI规范

啥？？ 啥是SPI??

![image](/源码剖析/spring6/s6-16-mvc-flow/img-007.png)

SPI 我们叫他服务接口扩展,(Service Provider Interface) 直译服务提供商接口， 不要被这个名字唬到了， 其实很好理解的一个东西：

其实就是根据Servlet厂商（服务提供商）提供要求的一个接口，  在固定的目录（META-INF/services）放上以接口全类名 为命名的文件， 文件中放入接口的实现的全类名，该类由我们自己实现，按照这种约定的方式（即SPI规范），服务提供商会调用文件中实现类的方法， 从而完成扩展。

[SPI演示案例](https://github.com/xulisha123/sample_code/tree/main/spi-parent)：

假设我们自己是服务提供商： 现在要求的一个接口 IUserDao

1.在固定的目录放上接口的文件名

![image](/源码剖析/spring6/s6-16-mvc-flow/img-008.png)

2.文件中放入实现类（该实现类由你实现）：

一行一个实现类。

![image](/源码剖析/spring6/s6-16-mvc-flow/img-009.png)

3.通过java.util.ServiceLoader提供的ServiceLoader就可以完成SPI的实现类加载

```java
public class App {
    public static void main(String[] args) {
        ServiceLoader<IUserDao> daos = ServiceLoader.load(IUserDao.class);
        for (IUserDao dao : daos) {
            dao.save();
        }
    }
}
```

ok 那我们知道了SPI是什么，我们是不是可以在Web应用中，在Servlet的SPI放入对应的接口文件：

![image](/源码剖析/spring6/s6-16-mvc-flow/img-010.png)

放入实现类：

![image](/源码剖析/spring6/s6-16-mvc-flow/img-011.png)

通过ServletContext就可以动态注册三大组件：以Servlet注册为例：

```java
public class TulingSpringServletContainerInitializer extends SpringServletContainerInitializer {

    @Override
    public void onStartup(Set<Class<?>> webAppInitializerClasses, ServletContext servletContext) throws ServletException {

        // 通过servletContext动态添加Servlet
        servletContext.addServlet("spiServlet", new HttpServlet() {
            @Override
            protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
                resp.getWriter().write("spiServlet--doGet");
            }
        }).addMapping("/spiServlet.do");

    }
}
```

当然在SpringMVC中， 这个接口文件和实现类都把我们实现好了，甚至ContextLoaderListener和DispatcherServlet都帮我们注册好了，我们只要让他生效，来，看看他是怎么做的：

![image](/源码剖析/spring6/s6-16-mvc-flow/img-012.png)

## 3、实现基于SPI规范的SpringMVC

**RootConfig**

父容器的配置类  =以前的spring.xml

扫描的包排除掉@Controller

```java
@Configuration
@ComponentScan(basePackages = "com.tuling")
public class RootConfig {
}
```

```java
@Configuration
@ComponentScan(basePackages = {"com.tuling"},includeFilters = {
      @ComponentScan.Filter(type = FilterType.ANNOTATION,value = {RestController.class, Controller.class})
},useDefaultFilters =false)
@EnableWebMvc   // ≈<mvc:annotation-driven/>
public class WebAppConfig implements WebMvcConfigurer{

   /**
    * 配置拦截器
    * @return
    */
   @Bean
   public TulingInterceptor tulingInterceptor() {
      return new TulingInterceptor();
   }

   /**
    * 文件上传下载的组件
    * @return
    */
   @Bean
   public MultipartResolver multipartResolver() {
      CommonsMultipartResolver multipartResolver = new CommonsMultipartResolver();
      multipartResolver.setDefaultEncoding("UTF-8");
      multipartResolver.setMaxUploadSize(1024*1024*10);
      return multipartResolver;
   }

   /**
    * 注册处理国际化资源的组件
    * @return
    */
/* @Bean
   public AcceptHeaderLocaleResolver localeResolver() {
      AcceptHeaderLocaleResolver acceptHeaderLocaleResolver = new AcceptHeaderLocaleResolver();
      return acceptHeaderLocaleResolver;
   }*/

   @Override
   public void addInterceptors(InterceptorRegistry registry) {
      registry.addInterceptor(tulingInterceptor()).addPathPatterns("/*");
   }

   /**
    * 方法实现说明:配置试图解析器
    * @author:xsls
    * @exception:
    * @date:2019/8/6 16:23
    */
   @Bean
   public InternalResourceViewResolver internalResourceViewResolver() {
      InternalResourceViewResolver viewResolver = new InternalResourceViewResolver();
      viewResolver.setSuffix(".jsp");
      viewResolver.setPrefix("/WEB-INF/jsp/");
      return viewResolver;
   }

   @Override
   public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
      converters.add(new MappingJackson2HttpMessageConverter());
   }

}
```

自己去添加个Controller进行测试

OK， 现在可以访问你的SpringMVC了

![image](/源码剖析/spring6/s6-16-mvc-flow/img-013.png)

可以看到流程比ContextLoaderListener流程更多

外置tomcat会帮我们调用DispatcherServlet#init()   进行初始化--->重点关注：initWebApplicationContext方法

*getWebApplicationContext*(getServletContext())获得父容器（从之前的Servlet域中拿到）

cwac.setParent(rootContext);给子容器设置父容器

调用configureAndRefreshWebApplicationContext(cwac);

![image](/源码剖析/spring6/s6-16-mvc-flow/img-014.png)

注册一个监听器（该监听会初始化springmvc所需信息）

ContextRefreshedEvent可以看到该监听器监听的是容器refreshed事件， 会在finishRefresh中发布

刷新容器

![image](/源码剖析/spring6/s6-16-mvc-flow/img-015.png)

**当执行refresh 即加载ioc容器  完了会调用finishRefresh():**

publishEvent(**new **ContextRefreshedEvent(**this**));发布ContextRefreshedEvent事件

触发上面的ContextRefreshListener监听器：

---->FrameworkServlet.**this**.onApplicationEvent(event);

-------->onRefresh(event.getApplicationContext());

-------------->initStrategies(context);

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

这里面的每一个方法不用太细看，  就是给SpringMVC准备初始化的数据，  为后续SpringMVC处理请求做准备

基本都是从容器中拿到已经配置的Bean（RequestMappingHandlerMapping、RequestMappingHandlerAdapter、HandlerExceptionResolver  ）放到dispatcherServlet中做准备:

![image](/源码剖析/spring6/s6-16-mvc-flow/img-016.png)

![image](/源码剖析/spring6/s6-16-mvc-flow/img-017.png)

![image](/源码剖析/spring6/s6-16-mvc-flow/img-018.png)

**...**

但是这些Bean又是从哪来的呢？？  来来来， 回到我们的WebAppConfig

我们使用的一个@EnableWebMvc

导入了DelegatingWebMvcConfiguration@Import(DelegatingWebMvcConfiguration.**class**)

DelegatingWebMvcConfiguration的父类就配置了这些Bean

而且我告诉你SpringBoot也是用的这种方式，

![image](/源码剖析/spring6/s6-16-mvc-flow/img-019.png)

### 原理

#### DispatcherServlet注册（SPI）

**流程图：**

![image](/源码剖析/spring6/s6-16-mvc-flow/img-020.png)

** 源码流程**

外置Tomcat启动的时候通过SPI 找到我们应用中的/META-INF/service/javax.servlet.ServletContainerInitializer

![image](/源码剖析/spring6/s6-16-mvc-flow/img-021.png)

调用`SpringServletContainerInitializer.onStartUp()`

![image](/源码剖析/spring6/s6-16-mvc-flow/img-022.png)

调用`onStartUp()`前会先找到`@HandlesTypes(WebApplicationInitializer.class)` 所有实现了`WebApplicationInitializer`的类，传入到`OnStartup`的`webAppInitializerClasses`参数中，并传入Servlet上下文对象。

**MyWebApplicationInitializer**

通过servletContext注册DispatcherServlet

```java
/**
 * @author gzh:程序员徐庶
 */
public class MyWebApplicationInitializer implements WebApplicationInitializer {

    @Override
    public void onStartup(ServletContext servletContext) {

        // Load Spring web application configuration
        AnnotationConfigWebApplicationContext context = new AnnotationConfigWebApplicationContext();
        context.register(AppConfig.class);

        // Create and register the DispatcherServlet
        DispatcherServlet servlet = new DispatcherServlet(context);
        ServletRegistration.Dynamic registration = servletContext.addServlet("app", servlet);
        registration.setLoadOnStartup(1);  // tomcat启动的时候初始化Servlet
        registration.addMapping("/");

        /*
    <servlet>
        <servlet-name>springmvc</servlet-name>
        <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
        <init-param>
            <param-name>contextConfigLocation</param-name>
            <param-value>classpath:spring-mvc.xml</param-value>
        </init-param>
        <load-on-startup>1</load-on-startup>
    </servlet>

    <servlet-mapping>
        <servlet-name>springmvc</servlet-name>
        <url-pattern>/</url-pattern>
    </servlet-mapping>
       * */
    }

}
```

#### DispatcherServlet初始化

![image](/源码剖析/spring6/s6-16-mvc-flow/img-023.png)

外置tomcat会帮我们调用`DispatcherServlet#init() `  进行初始化--->重点关注：`initWebApplicationContext`方法

`getWebApplicationContext(getServletContext())`获得父容器（从之前的Servlet域中拿到）

`cwac.setParent(rootContext);`给子容器设置父容器

调用`configureAndRefreshWebApplicationContext(cwac);`

![image](/源码剖析/spring6/s6-16-mvc-flow/img-024.png)

注册一个监听器（该监听会初始化springmvc所需信息）

`ContextRefreshedEvent`可以看到该监听器监听的是容器refreshed事件， 会在finishRefresh中发布

刷新容器

![image](/源码剖析/spring6/s6-16-mvc-flow/img-025.png)

**当执行refresh 即加载ioc容器  完了会调用finishRefresh():**

`publishEvent(new ContextRefreshedEvent(this));`发布`ContextRefreshedEvent`事件

触发上面的`ContextRefreshListener`监听器：

---->`FrameworkServlet.this.onApplicationEvent(event);`

-------->`onRefresh(event.getApplicationContext());`

-------------->`initStrategies(context);`

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

![image](/源码剖析/spring6/s6-16-mvc-flow/img-026.png)

![image](/源码剖析/spring6/s6-16-mvc-flow/img-027.png)

![image](/源码剖析/spring6/s6-16-mvc-flow/img-028.png)

**...**

但是这些Bean又是从哪来的呢？？  来来来， 回到我们的WebAppConfig

我们使用的一个@EnableWebMvc

导入了`DelegatingWebMvcConfiguration@Import(DelegatingWebMvcConfiguration.class)`

`DelegatingWebMvcConfiguration`的父类就配置了这些Bean

而且我告诉你SpringBoot也是用的这种方式，

![image](/源码剖析/spring6/s6-16-mvc-flow/img-029.png)

**SpringMVC的具体执行流程：**

Spring MVC 是围绕前端控制器模式设计的，其中：中央 Servlet DispatcherServlet 为请求处理流程提供统一调度，实际工作则交给可配置组件执行。这个模型是灵活的且开放的，我们可以通过自己去定制这些组件从而进行定制自己的工作流。

![image](/源码剖析/spring6/s6-16-mvc-flow/img-030.png)

DispatcherServlet： 前端调度器 ， 负责将请求拦截下来分发到各控制器方法中

HandlerMapping: 负责根据请求的URL和配置@RequestMapping映射去匹配， 匹配到会返回Handler（具体控制器的方法）

HandlerAdaper: 负责调用Handler-具体的方法-  返回视图的名字  Handler将它封装到ModelAndView(封装视图名，request域的数据）

ViewReslover: 根据ModelAndView里面的视图名地址去找到具体的jsp封装在View对象中

View：进行视图渲染（将jsp转换成html内容 --这是Servlet容器的事情了） 最终response到的客户端

用户发送请求至前端控制器DispatcherServlet

DispatcherServlet收到请求调用处理器映射器HandlerMapping。

处理器映射器根据请求url找到具体的处理器，生成处理器执行链HandlerExecutionChain(包括处理器对象和处理器拦截器)一并返回给DispatcherServlet。

DispatcherServlet根据处理器Handler获取处理器适配器HandlerAdapter,执行HandlerAdapter处理一系列的操作，如：参数封装，数据格式转换，数据验证等操作

执行处理器Handler(Controller，也叫页面控制器)。

Handler执行完成返回ModelAndView

HandlerAdapter将Handler执行结果ModelAndView返回到DispatcherServlet

DispatcherServlet将ModelAndView传给ViewReslover视图解析器

ViewReslover解析后返回具体View

DispatcherServlet对View进行渲染视图（即将模型数据model填充至视图中）。

DispatcherServlet响应用户。

**整个调用过程其实都在doDispatch中体现了：**

用户发送请求至前端控制器DispatcherServlet

由于它是个Servlet会先进入service方法——>doGet/doPost——>processRequestdoService——>doDispatch	 ↓

这个doDispatch非常重要--体现了整个请求流程

```java
protected void doDispatch(HttpServletRequest request, HttpServletResponse response) throws Exception {

   try {

      try {
          // 文件上传相关
         processedRequest = checkMultipart(request);
         multipartRequestParsed = (processedRequest != request);

        // DispatcherServlet收到请求调用处理器映射器HandlerMapping。
        // 处理器映射器根据请求url找到具体的处理器，生成处理器执行链HandlerExecutionChain(包括处理器对象和处理器拦截器)一并返回给DispatcherServlet。
         mappedHandler = getHandler(processedRequest);
         if (mappedHandler == null) {
            noHandlerFound(processedRequest, response);
            return;
         }

         4.DispatcherServlet根据处理器Handler获取处理器适配器HandlerAdapter,
         HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());

         // Process last-modified header, if supported by the handler.  HTTP缓存相关
         String method = request.getMethod();
         boolean isGet = HttpMethod.GET.matches(method);
         if (isGet || HttpMethod.HEAD.matches(method)) {
            long lastModified = ha.getLastModified(request, mappedHandler.getHandler());
            if (new ServletWebRequest(request, response).checkNotModified(lastModified) && isGet) {
               return;
            }
         }
         // 前置拦截器
         if (!mappedHandler.applyPreHandle(processedRequest, response)) {
            // 返回false就不进行后续处理了
            return;
         }

         // 执行HandlerAdapter处理一系列的操作，如：参数封装，数据格式转换，数据验证等操作
         // 执行处理器Handler(Controller，也叫页面控制器)。
         // Handler执行完成返回ModelAndView
         // HandlerAdapter将Handler执行结果ModelAndView返回到DispatcherServlet
         mv = ha.handle(processedRequest, response, mappedHandler.getHandler());

         if (asyncManager.isConcurrentHandlingStarted()) {
            return;
         }
         // 如果没有视图，给你设置默认视图  json忽略
         applyDefaultViewName(processedRequest, mv);
         //后置拦截器
         mappedHandler.applyPostHandle(processedRequest, response, mv);
      }
      catch (Exception ex) {
         dispatchException = ex;
      }
      catch (Throwable err) {
         // As of 4.3, we're processing Errors thrown from handler methods as well,
         // making them available for @ExceptionHandler methods and other scenarios.
         dispatchException = new NestedServletException("Handler dispatch failed", err);
      }
      // DispatcherServlet将ModelAndView传给ViewReslover视图解析器
      // ViewReslover解析后返回具体View
      // DispatcherServlet对View进行渲染视图（即将模型数据model填充至视图中）。
      // DispatcherServlet响应用户。
      processDispatchResult(processedRequest, response, mappedHandler, mv, dispatchException);
   }
   catch (Exception ex) {
      triggerAfterCompletion(processedRequest, response, mappedHandler, ex);
   }
   catch (Throwable err) {
      triggerAfterCompletion(processedRequest, response, mappedHandler,
            new NestedServletException("Handler processing failed", err));
   }
   finally {
      if (asyncManager.isConcurrentHandlingStarted()) {
         // Instead of postHandle and afterCompletion
         if (mappedHandler != null) {
            mappedHandler.applyAfterConcurrentHandlingStarted(processedRequest, response);
         }
      }
      else {
         // Clean up any resources used by a multipart request.
         if (multipartRequestParsed) {
            cleanupMultipart(processedRequest);
         }
      }
   }
}
```

**详细过程我们课程中分析....**

**HandlerMapping**

在整个过程中，涉及到非常多的组件，每个组件解析各个环节，其中**HandlerMapping最为重要它是用来映射请求的**，我们就着重介绍下HandlerMapping的解析过程和请求映射过程：

附上流程图：

[https://www.processon.com/view/link/615ea79e1efad4070b2d6707](https://www.processon.com/view/link/615ea79e1efad4070b2d6707)

![image](/源码剖析/spring6/s6-16-mvc-flow/img-031.png)
