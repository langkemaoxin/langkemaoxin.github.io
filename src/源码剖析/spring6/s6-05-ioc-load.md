---
title: "5.Spring之IOC容器加载主脉络源码"
sidebarGroup: "Spring 6 源码"
shortTitle: "5.Spring之IOC容器加载主脉络源码"
order: 5
date: 2025-11-24
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "5.Spring之IOC容器加载主脉络源码"
---

> 来源：[5.Spring之IOC容器加载主脉络源码](https://www.yuque.com/geren-t8lyq/ru879g/pf4mhzgp6bczle5s)

在线更新笔记(后期会更新在线笔记）：[https://www.yuque.com/geren-t8lyq/ru879g/yh6ny24uu7dfrxeo?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/yh6ny24uu7dfrxeo?singleDoc#)

完整流程图：[https://www.processon.com/view/link/5f15341b07912906d9ae8642?cid=5f15341b7d9c081beac17a19](https://www.processon.com/view/link/5f15341b07912906d9ae8642?cid=5f15341b7d9c081beac17a19)

课上流程图：[https://www.processon.com/view/link/68aefe8d687a3f3e21d7702b?cid=68a8595777321f26867aa352](https://www.processon.com/view/link/68aefe8d687a3f3e21d7702b?cid=68a8595777321f26867aa352)

课上Spring6.2.9源码：

![](https://github.com/xulisha123/spring6.2.9.git)

Spring6.2.9Deepwiki:

![](https://deepwiki.com/xulisha123/spring6.2.9)

## 创建

容器

`AnnotationConfigApplicationContext`的构造函数创建了两个关键组件：`AnnotatedBeanDefinitionReader`用于解析配置类，`ClassPathBeanDefinitionScanner`用于扫描包路径，最终将配置转换为`BeanDefinition`并存储在map中。 AnnotationConfigApplicationContext.java:

```java
public AnnotationConfigApplicationContext() {
    StartupStep createAnnotatedBeanDefReader = getApplicationStartup().start("spring.context.annotated-bean-reader.create");
    this.reader = new AnnotatedBeanDefinitionReader(this);
    createAnnotatedBeanDefReader.end();
    this.scanner = new ClassPathBeanDefinitionScanner(this);
}
```

当使用带参数的构造函数时，会自动调用`register()`和`refresh()`方法： AnnotationConfigApplicationContext.java:91-95 AnnotationConfigApplicationContext.java:

```java
	public AnnotationConfigApplicationContext(Class<?>... componentClasses) {
		this();
		register(componentClasses);
		refresh();
	}
```

## 2. 容器刷新与Bean预实例化

在`refresh()`方法中，`finishBeanFactoryInitialization()`负责实例化所有单例Bean： AbstractApplicationContext.java:

```java
// Instantiate all remaining (non-lazy-init) singletons.
finishBeanFactoryInitialization(beanFactory);
```

AbstractApplicationContext.java:

```java
		// Allow for caching all bean definition metadata, not expecting further changes.
		beanFactory.freezeConfiguration();
		// Instantiate all remaining (non-lazy-init) singletons.
		beanFactory.preInstantiateSingletons();
	}
```

## 3. 循环判断Bean定义

`preInstantiateSingletons()`方法遍历所有Bean定义，判断是否符合单例、非抽象、非懒加载的条件： DefaultListableBeanFactory.java:

```java
	this.preInstantiationThread.set(PreInstantiation.MAIN);
		this.mainThreadPrefix = getThreadNamePrefix();
		try {
			for (String beanName : beanNames) {
				RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);
				if (!mbd.isAbstract() && mbd.isSingleton()) {
					CompletableFuture<?> future = preInstantiateSingleton(beanName, mbd);
					if (future != null) {
						futures.add(future);
					}
				}
			}
		}
		finally {
			this.mainThreadPrefix = null;
```

## 4. 通过BeanFactory.getBean()生成Bean对象

对于符合条件的Bean，通过`getBean()`方法获取或创建Bean实例。`doGetBean()`是实际的实现方法： AbstractBeanFactory.java:

```java
@SuppressWarnings("unchecked")
	protected <T> T doGetBean(
			String name, @Nullable Class<T> requiredType, @Nullable Object @Nullable [] args, boolean typeCheckOnly)
			throws BeansException {

		String beanName = transformedBeanName(name);
		Object beanInstance;
```

## 5. 先检查单例缓存

首先检查单例缓存，如果已存在则直接返回： AbstractBeanFactory.java

```java
// Eagerly check singleton cache for manually registered singletons.
		Object sharedInstance = getSingleton(beanName);
		if (sharedInstance != null && args == null) {
			if (logger.isTraceEnabled()) {
				if (isSingletonCurrentlyInCreation(beanName)) {
					logger.trace("Returning eagerly cached instance of singleton bean '" + beanName +
							"' that is not fully initialized yet - a consequence of a circular reference");
				}
				else {
					logger.trace("Returning cached instance of singleton bean '" + beanName + "'");
				}
			}
			beanInstance = getObjectForBeanInstance(sharedInstance, name, beanName, null);
		}

		else {
```

## 6. 创建新的Bean实例

如果缓存中没有，则进入真正的创建流程，通过`createBean()`方法： AbstractBeanFactory.java

```java
// Create bean instance.
				if (mbd.isSingleton()) {
					sharedInstance = getSingleton(beanName, () -> {
						try {
							return createBean(beanName, mbd, args);
						}
						catch (BeansException ex) {
							// Explicitly remove instance from singleton cache: It might have been put there
							// eagerly by the creation process, to allow for circular reference resolution.
							// Also remove any beans that received a temporary reference to the bean.
							destroySingleton(beanName);
							throw ex;
						}
					});
					beanInstance = getObjectForBeanInstance(sharedInstance, name, beanName, mbd);
				}
```

## 7. Bean实例化 - 反射调用构造函数

`doCreateBean()`方法中，通过`createBeanInstance()`进行实例化，使用反射调用构造函数： AbstractAutowireCapableBeanFactory.java:

```java
if (mbd.isSingleton()) {
			instanceWrapper = this.factoryBeanInstanceCache.remove(beanName);
		}
		if (instanceWrapper == null) {
			instanceWrapper = createBeanInstance(beanName, mbd, args);
		}
		Object bean = instanceWrapper.getWrappedInstance();
		Class<?> beanType = instanceWrapper.getWrappedClass();
		if (beanType != NullBean.class) {
```

对于简单的Bean，会调用`instantiateBean()`使用无参构造函数： AbstractAutowireCapableBeanFactory.java

```java
if (autowireNecessary) {
				return autowireConstructor(beanName, mbd, null, null);
			}
			else {
				return instantiateBean(beanName, mbd);
			}
		}
```

## 8. 依赖注入与初始化

在Bean实例化后，通过`populateBean()`进行依赖注入，然后通过`initializeBean()`执行初始化回调方法： AbstractAutowireCapableBeanFactory.java

```java
// Initialize the bean instance.
		Object exposedObject = bean;
		try {
			populateBean(beanName, mbd, instanceWrapper);
			exposedObject = initializeBean(beanName, exposedObject, mbd);
		}
		catch (Throwable ex) {
			if (ex instanceof BeanCreationException bce && beanName.equals(bce.getBeanName())) {
```

## 9. 缓存到单例池

对于单例Bean，Spring使用`getSingleton()`方法确保线程安全地将Bean实例缓存到单例池中，实现单例模式： AbstractBeanFactory.java:331-342

## Notes

这个流程展示了Spring IoC容器的核心工作机制：从配置解析到Bean定义注册，再到Bean实例化、依赖注入和初始化的完整生命周期。`AnnotationConfigApplicationContext`通过组合`AnnotatedBeanDefinitionReader`和`ClassPathBeanDefinitionScanner`来支持基于注解的配置，而底层的Bean创建和管理则依赖于`AbstractBeanFactory`和`AbstractAutowireCapableBeanFactory`的实现。整个过程严格按照Spring容器的生命周期规范执行，确保了Bean的正确创建和依赖关系的建立。
