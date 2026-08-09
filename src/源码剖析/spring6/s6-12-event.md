---
title: "12.Spring事件监听使用和原理源码"
sidebarGroup: "Spring 6 源码"
shortTitle: "12.Spring事件监听使用和原理源码"
order: 12
date: 2025-09-28
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "12.Spring事件监听使用和原理源码"
---

> 来源：[12.Spring事件监听使用和原理源码](https://www.yuque.com/geren-t8lyq/ru879g/dtw2hxler25nn0zs)

在线笔记：[https://www.yuque.com/geren-t8lyq/ru879g/dtw2hxler25nn0zs?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/dtw2hxler25nn0zs?singleDoc#) 《Spring事件监听使用和原理源码》

## 说明

![image.png](/源码剖析/spring6/s6-12-event/img-001.png)

Spring 的事件监听   ，  通过发布事件触发一个或多个对感兴趣的监听器作出响应，从而实现组件间的低耦合通信。通过这种机制，当特定事件发生时，系统可以触发一系列相关操作，而无需了解具体的响应逻辑，提高了代码的可维护性和扩展性。例如，在用户注册成功后，触发一个 “用户注册成功” 事件，多个监听器可以分别执行发送欢迎邮件、记录日志等不同操作。  以后如果增加了发送短线的需求，只需扩展一个发短信的监听器即可

## 使用Spring 事件

### 事件

#### Spring内置事件

内置事件中由系统内部进行发布，只需注入监听器

![image](/源码剖析/spring6/s6-12-event/img-002.png)

#### 自定义事件

事件类需要继承ApplicationEvent，代码如下：

```java
/***
 * @Author 公众号：程序员徐庶
 * @Slogan 致敬大师，致敬未来的你
 * 事件
 */
public class BigEvent  extends ApplicationEvent {

    private String name;

    public BigEvent(Object source, String name) {
        super(source);
        this.name = name;
    }

    public String getName() {
        return name;
    }
}
```

这里为了简单测试，所以写的很简单。

事件类是一种很简单的pojo，除了需要继承ApplicationEvent也没什么了，这个类有一个构造方法需要super。

### 事件监听器

#### 事件监听器-基于接口

```java
@Component
public class HelloEventListener implements ApplicationListener<OrderEvent> {
 
    @Override
    public void onApplicationEvent(OrderEvent event) {
        if(event.getName().equals("减库存")){
            System.out.println("减库存.......");
        }
    }
}
```

事件监听器需要实现ApplicationListener接口，这是个泛型接口，泛型类类型就是事件类型，其次需要是spring容器托管的bean，所以这里加了@component，只有一个方法，就是onApplicationEvent。

#### 事件监听器-基于注解

```java
@Component
public class OrderEventListener {
    @EventListener(OrderEvent.class)
    public void onApplicationEvent(OrderEvent event) {
        if(event.getName().equals("减库存")){
            System.out.println("减库存.......");
        }
    }

}
 
```

### 事件发布操作

事件发布方式很简单

```java
applicationContext.publishEvent(new HelloEvent(this,"lgb"));
```

然后调用方法就能看到

2020-9-22 19:08:00.052  INFO 284928 --- [nio-5577-exec-3] l.b.e.c.s.event.HelloEventListener       : receive lgb say hello!

![image](/源码剖析/spring6/s6-12-event/img-003.jpg)

## 疑问

- 同样的事件能有多个监听器 -- 可以的
- 事件监听器一定要写一个类去实现吗 -- 其实是可以不需要的，spring有个注解@EventListener，修饰在方法上，稍后给出使用方法
- 事件监听操作和发布事件的操作是同步的吗？ -- 是的，所以如果有事务，监听操作也在事务内
- 可以作为异步处理吗？  --可以  看源码有解释。：

```java
@Bean(name = "applicationEventMulticaster")
public ApplicationEventMulticaster simpleApplicationEventMulticaster() {
    SimpleApplicationEventMulticaster eventMulticaster
            = new SimpleApplicationEventMulticaster();
    // 异步执行器
    eventMulticaster.setTaskExecutor(new SimpleAsyncTaskExecutor());
    return eventMulticaster;
}
```

## Spring事件原理

spring的事件监听有三个部分组成：

**事件**（ApplicationEvent)  负责对应相应监听器 事件源发生某事件是特定事件监听器被触发的原因。** **

**监听器(**ApplicationListener) 对监听器监听特定事件,并在内部定义了事件发生后的响应逻辑。** **

**事件发布器**（ApplicationEventMulticaster ）**负责通知观察者** 对外提供发布事件和增删事件监听器的接口,维护事件和事件监听器之间的映射关系,并在事件发生时负责通知相关监听器。

![image.png](/源码剖析/spring6/s6-12-event/img-004.png)

### Spring事件机制

**也就是说上面代码中发布者调用**applicationEventPublisher.publishEvent(msg);** 是会将事件发送给了EventMultiCaster， 而后由EventMultiCaster注册着所有的Listener，然后根据事件类型决定转发给那个Listener。**

**源码流程：**

![spring源码.png](/源码剖析/spring6/s6-12-event/img-005.png)

Spring在ApplicationContext接口的抽象实现类AbstractApplicationContext中完成了事件体系的搭建。

AbstractApplicationContext拥有一个applicationEventMulticaster成员变量，applicationEventMulticaster提供了容器监听器的注册表。

AbstractApplicationContext在refresh()这个容器启动方法中搭建了事件的基础设施,其中AbstractApplicationContext的refresh方法实现如下:

```java
@Override
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // Prepare this context for refreshing.
        prepareRefresh();

        // Tell the subclass to refresh the internal bean factory.
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

        // Prepare the bean factory for use in this context.
        prepareBeanFactory(beanFactory);

        try {
            // Allows post-processing of the bean factory in context subclasses.
            postProcessBeanFactory(beanFactory);

            // Invoke factory processors registered as beans in the context.
            invokeBeanFactoryPostProcessors(beanFactory);

            // Register bean processors that intercept bean creation.
            registerBeanPostProcessors(beanFactory);

            // Initialize message source for this context.
            initMessageSource();

            // Initialize event multicaster for this context.
            initApplicationEventMulticaster();

            // Initialize other special beans in specific context subclasses.
            onRefresh();

            // Check for listener beans and register them.
            registerListeners();

            // Instantiate all remaining (non-lazy-init) singletons.
            finishBeanFactoryInitialization(beanFactory);

            // Last step: publish corresponding event.
            finishRefresh();
        }

        catch (BeansException ex) {
            if (logger.isWarnEnabled()) {
                logger.warn("Exception encountered during context initialization - " +
                        "cancelling refresh attempt: " + ex);
            }

            // Destroy already created singletons to avoid dangling resources.
            destroyBeans();

            // Reset 'active' flag.
            cancelRefresh(ex);

            // Propagate exception to caller.
            throw ex;
        }

        finally {
            // Reset common introspection caches in Spring's core, since we
            // might not ever need metadata for singleton beans anymore...
            resetCommonCaches();
        }
    }
}
```

### 1 事件广播器的初始化

```java
/**
 * Initialize the ApplicationEventMulticaster.
 * Uses SimpleApplicationEventMulticaster if none defined in the context.
 * @see org.springframework.context.event.SimpleApplicationEventMulticaster
 */
protected void initApplicationEventMulticaster() {
    ConfigurableListableBeanFactory beanFactory = getBeanFactory();
    if (beanFactory.containsLocalBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME)) {
        this.applicationEventMulticaster =
                beanFactory.getBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, ApplicationEventMulticaster.class);
        if (logger.isDebugEnabled()) {
            logger.debug("Using ApplicationEventMulticaster [" + this.applicationEventMulticaster + "]");
        }
    }
    else {
        this.applicationEventMulticaster = new SimpleApplicationEventMulticaster(beanFactory);
        beanFactory.registerSingleton(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, this.applicationEventMulticaster);
        if (logger.isDebugEnabled()) {
            logger.debug("Unable to locate ApplicationEventMulticaster with name '" +
                    APPLICATION_EVENT_MULTICASTER_BEAN_NAME +
                    "': using default [" + this.applicationEventMulticaster + "]");
        }
    }
}
```

用户可以在配置文件中为容器定义一个自定义的事件广播器，只要实现ApplicationEventMulticaster就可以了，Spring会通过 反射的机制将其注册成容器的事件广播器，如果没有找到配置的外部事件广播器，Spring自动使用 SimpleApplicationEventMulticaster作为事件广播器。

### 2 注册事件监听器

```java
/**
 * Add beans that implement ApplicationListener as listeners.
 * Doesn't affect other listeners, which can be added without being beans.
 */
protected void registerListeners() {
    // Register statically specified listeners first.
    for (ApplicationListener<?> listener : getApplicationListeners()) {
        getApplicationEventMulticaster().addApplicationListener(listener);
    }

    // Do not initialize FactoryBeans here: We need to leave all regular beans
    // uninitialized to let post-processors apply to them!
    String[] listenerBeanNames = getBeanNamesForType(ApplicationListener.class, true, false);
    for (String listenerBeanName : listenerBeanNames) {
        getApplicationEventMulticaster().addApplicationListenerBean(listenerBeanName);
    }

    // Publish early application events now that we finally have a multicaster...
    Set<ApplicationEvent> earlyEventsToProcess = this.earlyApplicationEvents;
    this.earlyApplicationEvents = null;
    if (earlyEventsToProcess != null) {
        for (ApplicationEvent earlyEvent : earlyEventsToProcess) {
            getApplicationEventMulticaster().multicastEvent(earlyEvent);
        }
    }
}
```

Spring根据反射机制，使用ListableBeanFactory的getBeansOfType方法，从BeanDefinitionRegistry中找出所有实现 org.springframework.context.ApplicationListener的Bean，将它们注册为容器的事件监听器，实际的操作就是将其添加到事件广播器所提供的监听器注册表中。

### 3 发布事件

跟着 finishRefresh();方法进入publishEvent(new ContextRefreshedEvent(this));方法如下:

```java
/**
 * Publish the given event to all listeners.
 * @param event the event to publish (may be an {@link ApplicationEvent}
 * or a payload object to be turned into a {@link PayloadApplicationEvent})
 * @param eventType the resolved event type, if known
 * @since 4.2
 */
protected void publishEvent(Object event, ResolvableType eventType) {
    Assert.notNull(event, "Event must not be null");
    if (logger.isTraceEnabled()) {
        logger.trace("Publishing event in " + getDisplayName() + ": " + event);
    }

    // Decorate event as an ApplicationEvent if necessary
    ApplicationEvent applicationEvent;
    if (event instanceof ApplicationEvent) {
        applicationEvent = (ApplicationEvent) event;
    }
    else {
        applicationEvent = new PayloadApplicationEvent<Object>(this, event);
        if (eventType == null) {
            eventType = ((PayloadApplicationEvent)applicationEvent).getResolvableType();
        }
    }

    // Multicast right now if possible - or lazily once the multicaster is initialized
    if (this.earlyApplicationEvents != null) {
        this.earlyApplicationEvents.add(applicationEvent);
    }
    else {
        getApplicationEventMulticaster().multicastEvent(applicationEvent, eventType);
    }

    // Publish event via parent context as well...
    if (this.parent != null) {
        if (this.parent instanceof AbstractApplicationContext) {
            ((AbstractApplicationContext) this.parent).publishEvent(event, eventType);
        }
        else {
            this.parent.publishEvent(event);
        }
    }
}
```

在AbstractApplicationContext的publishEvent方法中， Spring委托ApplicationEventMulticaster将事件通知给所有的事件监听器.

### 4 Spring默认的事件广播器SimpleApplicationEventMulticaster

```java
@Override
public void multicastEvent(final ApplicationEvent event, ResolvableType eventType) {
    ResolvableType type = (eventType != null ? eventType : resolveDefaultEventType(event));
    for (final ApplicationListener<?> listener : getApplicationListeners(event, type)) {
        Executor executor = getTaskExecutor();
        if (executor != null) {
            executor.execute(new Runnable() {
                @Override
                public void run() {
                    invokeListener(listener, event);
                }
            });
        }
        else {
            invokeListener(listener, event);
        }
    }
}

/**
 * Invoke the given listener with the given event.
 * @param listener the ApplicationListener to invoke
 * @param event the current event to propagate
 * @since 4.1
 */
@SuppressWarnings({"unchecked", "rawtypes"})
protected void invokeListener(ApplicationListener listener, ApplicationEvent event) {
    ErrorHandler errorHandler = getErrorHandler();
    if (errorHandler != null) {
        try {
            listener.onApplicationEvent(event);
        }
        catch (Throwable err) {
            errorHandler.handleError(err);
        }
    }
    else {
        try {
            listener.onApplicationEvent(event);
        }
        catch (ClassCastException ex) {
            // Possibly a lambda-defined listener which we could not resolve the generic event type for
            LogFactory.getLog(getClass()).debug("Non-matching event type for listener: " + listener, ex);
        }
    }
}
```

遍历注册的每个监听器，并启动来调用每个监听器的onApplicationEvent方法。由于SimpleApplicationEventMulticaster的taskExecutor的实现类是SyncTaskExecutor，因此，事件监听器对事件的处理，是同步进行的。

从代码可以看出，applicationContext.publishEvent()方法，需要同步等待各个监听器处理完之后，才返回。

也就是说，Spring提供的事件机制，默认是同步的。如果想用异步的，可以自己实现ApplicationEventMulticaster接口，并在Spring容器中注册id为applicationEventMulticaster的Bean。例如下面所示:

```java
public class AsyncApplicationEventMulticaster extends AbstractApplicationEventMulticaster {  
    private TaskExecutor taskExecutor = new SimpleAsyncTaskExecutor();  

    public void setTaskExecutor(TaskExecutor taskExecutor) {  
        this.taskExecutor = (taskExecutor != null ? taskExecutor : new SimpleAsyncTaskExecutor());  
    }  

    protected TaskExecutor getTaskExecutor() {  
        return this.taskExecutor;  
    }  

    @SuppressWarnings("unchecked")  
    public void multicastEvent(final ApplicationEvent event) {  
        for (Iterator<ApplicationListener> it = getApplicationListeners().iterator(); it.hasNext();) {  
            final ApplicationListener listener =  it.next();  
            getTaskExecutor().execute(new Runnable() {  
                public void run() {  
                    listener.onApplicationEvent(event);  
                }  
            });  
        }  
    }  
}  
```

spring配置：

```java
@Bean(name = "applicationEventMulticaster")
public ApplicationEventMulticaster simpleApplicationEventMulticaster() {
    SimpleApplicationEventMulticaster eventMulticaster
            = new SimpleApplicationEventMulticaster();

    //ThreadPoolTaskExecutor
    eventMulticaster.setTaskExecutor(new SimpleAsyncTaskExecutor());
    return eventMulticaster;
}
```

Spring发布事件之后，所有注册的事件监听器，都会收到该事件，因此，事件监听器在处理事件时，需要先判断该事件是否是自己关心的。

Sping事件体系所使用的设计模式是：观察者模式。ApplicationListener是观察者接口，接口中定义了onApplicationEvent方法，该方法的作用是对ApplicationEvent事件进行处理。

### 5. 设计模式

Spring事件机制是观察者模式的一种实现，但是除了发布者和监听者者两个角色之外，还有一个EventMultiCaster ，所以和订阅-发布模式更接近， 虽然订阅-发布模式不是传统的23种设计模式， 如果非要说23种经典设计模式 的是那就是 观察者模式，发布-订阅模式可以看作是观察者模式的一种演进和解耦升级版。 一个是基础理论， 另一个是实践改进。

![image.png](/源码剖析/spring6/s6-12-event/img-006.png)

- **观察者模式 (Observer Pattern):**

- **结构:** 主题 (Subject) **直接持有** 观察者 (Observer) 的引用列表。
- **关系:** 它们之间是**直接关联**的。主题知道要通知谁，并亲自逐个通知。
- **比喻:** 报社（主题）有一份订阅者（观察者）的地址名录，它按照名录**直接**给每家每户送报纸。

- **发布-订阅模式 (Publish-Subscribe Pattern):**

- **结构:** 发布者 (Publisher) 和订阅者 (Subscriber) 之间没有直接联系，它们都只与一个**第三方中介 (Broker)** 交互。
- **关系:** 它们之间是**完全解耦**的。发布者只管把消息发给中介，订阅者只管从中介那里接收自己感兴趣的消息。
- **比喻:** 店员（发布者）做好了奶茶，把消息告诉**叫号大屏幕**（中介）。顾客（订阅者）看着大屏幕，只关心自己的号码。店员和顾客互不相识。

现在，我们将Spring的角色代入上面的模型：

- **发布者 (Publisher)**: 调用 `ApplicationEventPublisher.publishEvent()` 的业务代码。
- **订阅者 (Subscriber)**: 使用 `@EventListener` 或实现 `ApplicationListener` 接口的Bean。
- **消息代理 (Broker)**: 这是关键！Spring内部有一个叫做 `ApplicationEventMulticaster` 的核心组件。
