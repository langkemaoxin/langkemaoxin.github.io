---
title: "9.Bean的后置处理器"
sidebarGroup: "Spring 6 源码"
shortTitle: "9.Bean的后置处理器"
order: 9
date: 2026-01-16
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "9.Bean的后置处理器"
---

> 来源：[9.Bean的后置处理器](https://www.yuque.com/geren-t8lyq/ru879g/tl3cgigvlawkrs11)

在线笔记：[https://www.yuque.com/geren-t8lyq/ru879g/tl3cgigvlawkrs11?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/tl3cgigvlawkrs11?singleDoc#) 《Bean的后置处理器》

![image.png](/源码剖析/spring6/s6-09-bean-postprocessor/img-001.png)

`BeanPostProcessor`是Spring容器扩展的核心机制 。`ApplicationContext`会自动检测并注册实现了`BeanPostProcessor`接口的bean进行调用，在整个Bean的生命周期中会有9个地方会调用。提升扩展性！

## BeanPostProcessor注册机制

`BeanPostProcessor`的注册主要通过refresh中`PostProcessorRegistrationDelegate.registerBeanPostProcessors()`方法实现 PostProcessorRegistrationDelegate

```java
	public static void registerBeanPostProcessors(
			ConfigurableListableBeanFactory beanFactory, AbstractApplicationContext applicationContext) {

		// WARNING: Although it may appear that the body of this method can be easily
		// refactored to avoid the use of multiple loops and multiple lists, the use

		// a bean is created during BeanPostProcessor instantiation, i.e. when
		// a bean is not eligible for getting processed by all BeanPostProcessors.
		int beanProcessorTargetCount = beanFactory.getBeanPostProcessorCount() + 1 + postProcessorNames.length;
		beanFactory.addBeanPostProcessor(
				new BeanPostProcessorChecker(beanFactory, postProcessorNames, beanProcessorTargetCount));

		// Separate between BeanPostProcessors that implement PriorityOrdered,
		// Ordered, and the rest.

			}
		}
		// First, register the BeanPostProcessors that implement PriorityOrdered.
		sortPostProcessors(priorityOrderedPostProcessors, beanFactory);
		registerBeanPostProcessors(beanFactory, priorityOrderedPostProcessors);
 
		// Next, register the BeanPostProcessors that implement Ordered.
		List<BeanPostProcessor> orderedPostProcessors = new ArrayList<>(orderedPostProcessorNames.size());
		for (String ppName : orderedPostProcessorNames) {
			BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
			orderedPostProcessors.add(pp);
			if (pp instanceof MergedBeanDefinitionPostProcessor) {
				internalPostProcessors.add(pp);
			}
		}
		sortPostProcessors(orderedPostProcessors, beanFactory);
		registerBeanPostProcessors(beanFactory, orderedPostProcessors);
 
		// Now, register all regular BeanPostProcessors.
		List<BeanPostProcessor> nonOrderedPostProcessors = new ArrayList<>(nonOrderedPostProcessorNames.size());
		for (String ppName : nonOrderedPostProcessorNames) {
			BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
			nonOrderedPostProcessors.add(pp);
			if (pp instanceof MergedBeanDefinitionPostProcessor) {
				internalPostProcessors.add(pp);
			}
		}
		registerBeanPostProcessors(beanFactory, nonOrderedPostProcessors);
 
		// Finally, re-register all internal BeanPostProcessors.
		sortPostProcessors(internalPostProcessors, beanFactory);
		registerBeanPostProcessors(beanFactory, internalPostProcessors);
 
		// Re-register post-processor for detecting inner beans as ApplicationListeners,
		// moving it to the end of the processor chain (for picking up proxies etc).
		beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(applicationContext));
	}

```

注册过程按优先级分为四个阶段：

1. **PriorityOrdered类型的BeanPostProcessor** PostProcessorRegistrationDelegate.java:258-260
2. **Ordered类型的BeanPostProcessor** PostProcessorRegistrationDelegate.java:262-272
3. **普通BeanPostProcessor** PostProcessorRegistrationDelegate.java:274-283
4. **内部MergedBeanDefinitionPostProcessor** PostProcessorRegistrationDelegate.java:285-287

## BeanPostProcessor的9个调用位置及作用

基于代码库分析，以下是主要的调用位置：

### 在 Spring 中，`BeanPostProcessor` 及其子接口的方法在 Bean 生命周期的不同阶段被调用，共有 9 次关键调用，以下是各次调用的时机、作用以及程序员可做的扩展：

### 1. `InstantiationAwareBeanPostProcessor#postProcessBeforeInstantiation`

```java
@Component
public class My1InstantiationAwareBeanPostProcessor implements InstantiationAwareBeanPostProcessor {

	@Override
	public Object postProcessBeforeInstantiation(Class<?> beanClass, String beanName) throws BeansException {
		System.out.println("1."+beanName+"实例化前.如果返回了对象会中断bean生命周期");

		return InstantiationAwareBeanPostProcessor.super.postProcessBeforeInstantiation(beanClass, beanName);
	}
}
```

- **调用时机**：在 Bean 实例化（通过构造器创建对象）之前调用。
- **作用**：可以在此处直接返回一个自定义的 Bean 实例，若返回非 `null` 对象，Spring 将不再进行后续的 Bean 实例化流程（包括构造器调用、属性赋值等）。
- **扩展**：可用于提前创建 Bean 实例，比如进行一些特殊的对象创建逻辑，或者对某些 Bean 进行 “替换”，使用自定义的实例替代 Spring 原本要创建的实例。

### 2. `SmartInstantiationAwareBeanPostProcessor#determineCandidateConstructors`

- **调用时机**：在确定 Bean 实例化所使用的构造器时调用。
- **作用**：用于指定 Bean 实例化时要使用的构造器，Spring 会根据返回的构造器数组来选择合适的构造器进行实例化。
- **扩展**：当 Bean 有多个构造器时，可自定义逻辑来选择具体使用哪个构造器，比如根据特定条件选择带特定参数的构造器。

```java
@Component
public class My2SmartInstantiationAwareBeanPostProcessor implements SmartInstantiationAwareBeanPostProcessor {
	@Override
	public Constructor<?>[] determineCandidateConstructors(Class<?> beanClass, String beanName) throws BeansException {
		System.out.println("2."+beanName+"实例化中..可以指定构造函数");

		return SmartInstantiationAwareBeanPostProcessor.super.determineCandidateConstructors(beanClass, beanName);
	}
}

```

### 3. `MergedBeanDefinitionPostProcessor#postProcessMergedBeanDefinition`

- **调用时机**：在 Bean 定义（`BeanDefinition`）合并之后，Bean 实例化之前调用。
- **作用**：可以对合并后的 `BeanDefinition` 进行修改，比如提前解析 `@Autowired`、`@Value` 等注解的元数据（`InjectionMetadata`），为后续的依赖注入做准备。
- **扩展**：可用于自定义 Bean 定义的属性，或者对注解的处理逻辑进行扩展，比如添加自定义的注解解析规则。

```java
@Component
public class My3MergedBeanDefinitionPostProcessor implements MergedBeanDefinitionPostProcessor {

	@Override
	public void postProcessMergedBeanDefinition(RootBeanDefinition beanDefinition, Class<?> beanType, String beanName) {

		System.out.println("3."+beanName+"实例化后..为属性注入做准备，可以给beanDefinition指定注入的值");
	}
}
```

### 4. `SmartInstantiationAwareBeanPostProcessor#getEarlyBeanReference`

- **调用时机**：在 Bean 实例化之后，属性赋值之前调用，主要用于解决循环依赖（结合 AOP）。
- **作用**：当存在循环依赖时，返回 Bean 的早期引用（可能是代理对象），以便其他 Bean 能提前引用到当前 Bean，避免循环依赖导致的问题。
- **扩展**：可自定义 Bean 的早期引用生成逻辑，比如在生成早期引用时添加一些额外的代理逻辑或对象包装。

```java

@Component
public class My4SmartInstantiationAwareBeanPostProcessor implements SmartInstantiationAwareBeanPostProcessor {

	@Override
	public Object getEarlyBeanReference(Object bean, String beanName) throws BeansException {

		System.out.println("4."+beanName+"实例化后..解决循环依赖时bean和初始化后的bean不一致");

		return SmartInstantiationAwareBeanPostProcessor.super.getEarlyBeanReference(bean, beanName);
	}
}

```

### 5. `InstantiationAwareBeanPostProcessor#postProcessAfterInstantiation`

- **调用时机**：在 Bean 实例化（构造器调用完成，对象已创建）之后，属性赋值之前调用。
- **作用**：返回一个布尔值，若返回 `false`，则会中止后续的属性赋值流程；若返回 `true`，则继续进行属性赋值。
- **扩展**：可根据 Bean 的某些状态或条件，决定是否进行后续的属性赋值操作，比如当 Bean 不满足特定条件时，跳过属性赋值。

```java
@Component
public class My5InstantiationAwareBeanPostProcessor implements InstantiationAwareBeanPostProcessor {

	@Override
	public boolean postProcessAfterInstantiation(Object bean, String beanName) throws BeansException {
		System.out.println("5."+beanName+"属性注入前..返回true中断依赖注入");

		return InstantiationAwareBeanPostProcessor.super.postProcessAfterInstantiation(bean, beanName);
	}
}
```

### 6. `InstantiationAwareBeanPostProcessor#postProcessProperties`

- **调用时机**：在 Bean 实例化之后，属性赋值过程中调用（`@Autowired` 等注解的依赖注入在此处进行）。
- **作用**：可以对要注入的属性值（`PropertyValues`）进行修改，或者自定义依赖注入的逻辑。
- **扩展**：可拦截属性注入过程，修改属性值，比如对注入的字符串进行加密 / 解密处理，或者替换注入的对象为自定义的实现。

```plain
@Component
public class My6InstantiationAwareBeanPostProcessor implements InstantiationAwareBeanPostProcessor {

    @Override
    public PropertyValues postProcessPropertyValues(PropertyValues pvs, PropertyDescriptor[] pds, Object bean, String beanName) throws BeansException {

       System.out.println("6."+beanName+"属性注入中..@Autowired就是通过此bpp进行自动装配的");

       return InstantiationAwareBeanPostProcessor.super.postProcessPropertyValues(pvs, pds, bean, beanName);
    }
}
```

### 7. `BeanPostProcessor#postProcessBeforeInitialization`

- **调用时机**：在 Bean 初始化（调用 `@PostConstruct` 注解方法、`init-method` 等）之前调用。
- **作用**：可以对 Bean 进行预处理，比如修改 Bean 的属性、添加额外的逻辑等。
- **扩展**：可在 Bean 初始化前对其进行增强，比如检查 Bean 的状态，若不符合要求则进行修正，或者为 Bean 添加一些初始化前的日志记录。

```java
@Component
public class My7BeanPostProcessor implements BeanPostProcessor {

	@Override
	public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
		System.out.println("7."+beanName+"初始化前");

		return BeanPostProcessor.super.postProcessBeforeInitialization(bean, beanName);
	}
}
```

### 8. `BeanPostProcessor#postProcessAfterInitialization`

- **调用时机**：在 Bean 初始化（调用 `@PostConstruct` 注解方法、`init-method` 等）之后调用（结合 AOP 时，在此处创建代理对象）。
- **作用**：可以对 Bean 进行后处理，比如创建 Bean 的代理对象（AOP 的核心逻辑在此体现），或者对 Bean 进行最终的修饰。
- **扩展**：可用于实现 AOP 之外的代理逻辑，或者对 Bean 进行一些初始化后的验证、包装等操作，比如将 Bean 包装为具有额外功能的装饰器对象。

```java
@Component
public class My8BeanPostProcessor implements BeanPostProcessor {

	@Override
	public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
		System.out.println("8."+beanName+"初始化后：bean已经完整可以单独管理");

		return BeanPostProcessor.super.postProcessAfterInitialization(bean, beanName);
	}
}
```

### 9. `DestructionAwareBeanPostProcessor#requiresDestruction`

- **调用时机**：在容器关闭（`application.close()`），Bean 即将被销毁时调用，用于判断 Bean 是否需要进行销毁操作。
- **作用**：返回一个布尔值，若返回 `true`，则会执行后续的销毁逻辑（如调用 `@PreDestroy` 注解方法、`destroy-method` 等）；若返回 `false`，则跳过销毁流程。
- **扩展**：可根据 Bean 的类型或状态，决定是否需要对 Bean 进行销毁处理，比如某些临时 Bean 可能不需要销毁操作，就可返回 `false` 跳过。

```java
@Component
public class My9DestructionAwareBeanPostProcessor implements DestructionAwareBeanPostProcessor {

	@Override
	public void postProcessBeforeDestruction(Object bean, String beanName) throws BeansException {
		System.out.println("9."+beanName+"销毁.");
	}
}
```
