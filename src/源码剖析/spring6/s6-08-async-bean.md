---
title: "8.Bean异步并行的创建"
sidebarGroup: "Spring 6 源码"
shortTitle: "8.Bean异步并行的创建"
order: 8
date: 2025-09-28
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "8.Bean异步并行的创建"
---

> 来源：[8.Bean异步并行的创建](https://www.yuque.com/geren-t8lyq/ru879g/uqz8732hks00qd9l)

在线笔记： [https://www.yuque.com/geren-t8lyq/ru879g/uqz8732hks00qd9l?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/uqz8732hks00qd9l?singleDoc#) 《Bean异步并行的创建》

## 支持Ioc 容器 bean 异步并行的创建

![image.png](/源码剖析/spring6/s6-08-async-bean/img-001.png)

这可以显着减少启动时间。

[https://github.com/spring-projects/spring-framework/issues/13410](https://github.com/spring-projects/spring-framework/issues/13410)

由于Spring6.2+的版本更新， 加了`this.mainThreadPrefix = null`;  导致异步bean创建可能会进入锁状态：  所以， 这个功能还有待商榷： 我已经在github提了[Issues](https://github.com/spring-projects/spring-framework/issues):

[https://github.com/spring-projects/spring-framework/issues/35409](https://github.com/spring-projects/spring-framework/issues/35409)

### 使用方式

1. **配置需要异步创建的bean**

```java
@Bean(bootstrap = Bean.Bootstrap.BACKGROUND)
```

1. 配置线程池

```java
@Bean
public Executor bootstrapExecutor(){
    return  Executors.newCachedThreadPool();
}
```

### 测试：

#### 批量注册异步bean

```java
@Component
public class BatchBeanDefinitionRegister implements BeanDefinitionRegistryPostProcessor, BeanFactoryAware {
    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException {
        for (int i=0;i<10;i++){
            RootBeanDefinition rootBeanDefinition = new RootBeanDefinition(AService.class);
            rootBeanDefinition.setBackgroundInit(true);
            registry.registerBeanDefinition("AService"+i,rootBeanDefinition);
        }
    }
```

#### 为了更好演示让bean睡几秒

```java
public class AService {
    @Autowired
    BService bService;

    public AService() throws InterruptedException {
        Thread.sleep(5000);
    }
}
```

#### 可以分别测试用bootstrapExecutor和不用的用时时间

```java
public static void main(String[] args) {
    long beginTime = System.currentTimeMillis();
    AnnotationConfigApplicationContext ioc = new AnnotationConfigApplicationContext(Main2.class);
    long endTime = System.currentTimeMillis();
    System.out.println(endTime-beginTime);
    AService aService = (AService) ioc.getBean("AService9");
    System.out.println(aService);
}
```

可以发现如果bean很多， 确实速度提升了~!!!✿✿ヽ(°▽°)ノ✿

**源码：**

org.springframework.beans.factory.support.DefaultListableBeanFactory#preInstantiateSingleton

### 问题

#### 问题1：   如果异步beanA正在通过ioc容器加载创建，  此时另外一个线程2获取beanA.会怎么样？

![image.png](/源码剖析/spring6/s6-08-async-bean/img-002.png)

在异步beanA创建时， 会往三级缓存中加入future.join();，

```java
addSingletonFactory(beanName, () -> {
					try {
						future.join();
					}
					catch (CompletionException ex) {
						ReflectionUtils.rethrowRuntimeException(ex.getCause());
					}
					return future;  // not to be exposed, just to lead to ClassCastException in case of mismatch
				});
```

线程2在获取bean时， 会等待异步beanA线程执行完毕， 再去一级缓存中捞一遍

```java
ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
    if (singletonFactory != null) {
        // 如果backgroundInit beanA正在创建， 此时有其他线程获取beanA或回调future.join 等待
        singletonObject = singletonFactory.getObject();
        // Singleton could have been added or removed in the meantime.
        if (this.singletonFactories.remove(beanName) != null) {
            this.earlySingletonObjects.put(beanName, singletonObject);
        }
        else {
            singletonObject = this.singletonObjects.get(beanName);
        }
    }
```

> 疑问？？？：：：
> 从这里可以看出， 2个线程都可以可以trylock。  这是为什么呢？
> spring5的时候， 源码在创建的时候会上锁啊， 按道理第2个线程获取不到锁啊。 其实啊...
> 在spring6为了支持并行createBean ，  不再进行上锁了，所以getsingleton中2个线程都可以trylock
> 
> 
> tryLock()返回值表示的是用来尝试获取锁：成功获取则返回true；获取失败则返回false，**这个方法无论如何都会立即返回**。不会像synchronized一样，一个线程获取锁之后，其他锁只能等待那个线程释放之后才能有获取锁。

#### 问题2：如果同一个Bean懒加载一起创建会怎么样？

![image.png](/源码剖析/spring6/s6-08-async-bean/img-003.png)

为了支持并行createBean  ， 在创建bean时不再使用互斥锁

```java
// 创建前标记当前bean正在创建
// 由于现版本并发创建允许并行， 所以可能存在同一个bean在正在创建， 其他线程报错， 以前版本是不存在的因为以前是互斥锁
// 但是这种情况极少  因为很少实际情况级别不会一起创建一个bean,除非程序员人为
// 相当于悲观锁（之前互斥等待）改乐观锁（现在不互斥比较替换，异常跳出）了。
beforeSingletonCreation(beanName);
```

在标记正在创建的bean时会报错：

```java
if (!this.inCreationCheckExclusions.contains(beanName) && !this.singletonsCurrentlyInCreation.add(beanName)) {
			throw new BeanCurrentlyInCreationException(beanName);
		}
```

> 相当于悲观锁（之前互斥等待）改乐观锁（现在不互斥比较替换，异常跳出）了。

ps:  有人反馈他的是6.2版本 不会报错， 会阻塞，  经过验证， 由于我的版本是`6.2.0-SNAPSHOT`  快照版， 正式版改了东西

![image.png](/源码剖析/spring6/s6-08-async-bean/img-004.png)

在方法：org.springframework.beans.factory.support.DefaultSingletonBeanRegistry#getSingleton(java.lang.String, org.springframework.beans.factory.ObjectFactory<?>)

**正式版（同学的）**：

![image.png](/源码剖析/spring6/s6-08-async-bean/img-005.png)

快照版(我的)：

估计快照版这里是BUG， 作者估计是想实现拿的到锁就阻塞（拿的到锁代表有bean正在创建）

![image.png](/源码剖析/spring6/s6-08-async-bean/img-006.png)

#### 问题3：   如果BeanA\BeanB  都是异步lazy bean， 并且循环依赖，   2个线程，  线程1  getBean(A)   线程2  getBean(B)      ， 会互相join（死锁）？？？？？

![image.png](/源码剖析/spring6/s6-08-async-bean/img-007.png)

不会，  因为在创建bean的时候， 实例化后会把三级缓存给覆盖掉！

![image.png](/源码剖析/spring6/s6-08-async-bean/img-008.png)

## defaultCandidate

[https://github.com/spring-projects/spring-framework/issues/26528](https://github.com/spring-projects/spring-framework/issues/26528)

当声明了bean,  不想被依赖注入，  可以设置该属性

解决问题：

当声明了bean， 有些时候不想被DI， 以前做不到，现在可以：

```java
@Bean(defaultCandidate = true)
```
