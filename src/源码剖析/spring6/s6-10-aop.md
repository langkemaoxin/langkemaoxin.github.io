---
title: "10.Spring-AOP源码"
sidebarGroup: "Spring 6 源码"
shortTitle: "10.Spring-AOP源码"
order: 10
date: 2025-09-28
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "10.Spring-AOP源码"
---

> 来源：[10.Spring-AOP源码](https://www.yuque.com/geren-t8lyq/ru879g/rxkgtxkusgg2hhd0)

在线实时更新文档：[https://www.yuque.com/geren-t8lyq/ru879g/rxkgtxkusgg2hhd0?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/rxkgtxkusgg2hhd0?singleDoc#)

**课上流程图：**

[https://www.processon.com/view/link/68c656dc73573f0d1903425f?cid=68b980be31af7c10c3e06661](https://www.processon.com/view/link/68c656dc73573f0d1903425f?cid=68b980be31af7c10c3e06661)

**课上示例代码：**
[https://github.com/xulisha123/spring6.2.9/tree/main/tuling/src/main/java/com/xushu/aop](https://github.com/xulisha123/spring6.2.9/tree/main/tuling/src/main/java/com/xushu/aop)

**完成流程图：**

AOP-切面解析：[https://www.processon.com/view/link/5f1958a35653bb7fd24d0aad](https://www.processon.com/view/link/5f1958a35653bb7fd24d0aad)

AOP-创建代理：[https://www.processon.com/view/link/5f1e93f25653bb7fd2549b7c](https://www.processon.com/view/link/5f1e93f25653bb7fd2549b7c)

AOP-调用：[https://www.processon.com/view/link/5f4dd513e0b34d1abc735998](https://www.processon.com/view/link/5f4dd513e0b34d1abc735998)

** 公众号： 程序员徐庶**

# Spring AOP 原理示例说明文档（基于代码实现）

## 1. 切面解析阶段：从切面信息到可执行通知器

在 Spring AOP 中，切面解析的核心是将横切逻辑（通知）与切入点关联，形成可执行的通知器（`Advisor`）。本示例中这一过程的实现与 Spring 的核心思想一致：

- **核心组件协作**：

- `CustomBeforeAdvice`和`CustomAfterAdvice`分别实现了 Spring 的`MethodBeforeAdvice`和`AfterReturningAdvice`接口，定义了具体的横切逻辑（前置通知和后置通知）
- `SimplePointcut`作为切入点定义，通过`ClassFilter.TRUE`匹配所有类，其`MethodMatcher`始终返回`true`（实际场景中可通过表达式精确匹配更精确的匹配规则）
- `MyInstantiationModelAwarePointcutAdvisorImpl`继承自 Spring 的`AbstractPointcutAdvisor`，将切入点（`SimplePointcut`）与通知（`Advice`）封装为`Advisor`，完成 "在什么地方执行什么增强逻辑" 的绑定

## Advice的分类

1. Before Advice：方法之前执行
2. After returning advice：方法return后执行+后置通知
3. After throwing advice：方法抛异常后执行
4. After (finally) advice：方法执行完finally之后执行，这是最后的，比return更后
5. Around advice：这是功能最强大的Advice，可以自定义执行顺序

## Advisor的理解

跟Advice类似的还有一个Advisor的概念，一个Advisor是有一个Pointcut和一个Advice组成的，通过Pointcut可以指定要需要被代理的逻辑，比如一个UserService类中有两个方法，按上面的例子，这两个方法都会被代理，被增强，那么我们现在可以通过Advisor，来控制到具体代理哪一个方法，比如：

- **解析过程**： 代码中通过手动创建`List`模拟了 Spring 容器的解析过程。在实际 Spring 环境中，容器会通过`@Aspect`注解扫描或 XML 配置自动识别切面，解析出对应的`Pointcut`和`Advice`，并自动组装为`Advisor`**java**运行

```java
// 模拟切面解析为Advisor的过程
List<Advisor> list = new ArrayList<>();
SimplePointcut pointcut = new SimplePointcut();
list.add(new MyInstantiationModelAwarePointcutAdvisorImpl(new CustomBeforeAdvice(), pointcut));
list.add(new MyInstantiationModelAwarePointcutAdvisorImpl(new CustomAfterAdvice(), pointcut));
```

- **匹配筛选**： 通过切入点的`ClassFilter`对目标类（`UserService`）进行匹配，筛选出适用于当前目标对象的`Advisor`，这与 Spring 中 "根据切入点动态筛选适用通知" 的逻辑一致**java**运行

```java
// 筛选适用于目标类的Advisor
List<Advisor> canApply = list.stream().filter(advisor -> {
    Pointcut pc = ((MyInstantiationModelAwarePointcutAdvisorImpl) advisor).getPointcut();
    return pc.getClassFilter().matches(bean.getClass());
}).collect(Collectors.toList());
```

## 2. 代理创建阶段：为目标对象生成代理实例

Spring AOP 通过动态代理实现对目标对象的增强，本示例采用 JDK 动态代理（与 Spring 对实现接口的类的默认处理一致）：

- **代理创建核心**： 使用`Proxy.newProxyInstance()`创建代理对象，需要三个关键参数：

- 目标对象的类加载器（保证类加载一致性）
- 目标对象实现的接口（`IUserService`）：代理对象通过实现相同接口，保证与目标对象具有一致的方法签名
- 自定义调用处理器（`MyInvocationHandler`）：封装了目标对象和匹配的`Advisor`，是代理逻辑的核心执行者

- **java**运行

```java
IUserService proxy = (IUserService) Proxy.newProxyInstance(
    bean.getClass().getClassLoader(),
    bean.getClass().getInterfaces(), // 基于IUserService接口创建代理
    new MyInvocationHandler(bean, canApply)
);
```

- **与 Spring 的对应关系**： 此过程对应 Spring 中`AopProxyFactory`的工作：当目标类实现接口时，默认使用 JDK 动态代理（如示例）；若目标类未实现接口，则使用 CGLIB 代理（通过继承目标类实现）。`MyInvocationHandler`的角色类似于 Spring 中的`JdkDynamicAopProxy`，负责协调通知执行与目标方法调用

## 3. 代理调用阶段：拦截方法执行并应用通知链

当通过代理对象调用方法时，会触发代理逻辑，按顺序执行通知与目标方法，这一过程完全遵循 Spring AOP 的拦截器链模式：

- **拦截器链构建**： `MyInvocationHandler`将`Advisor`中的通知转换为`MethodInterceptor`（拦截器），统一通知的执行接口。其中：

- `MethodBeforeAdvice`被转换为`MethodBeforeAdviceInterceptor`
- `AfterReturningAdvice`被转换为`AfterReturningAdviceInterceptor`

- 这与 Spring 的`AdvisorAdapter`机制一致，通过适配器模式将不同类型的通知统一为拦截器接口**java**运行

```java
// 通知转换为拦截器
List<MethodInterceptor> interceptors = canApply.stream()
    .map(advisor -> {
        if (advisor.getAdvice() instanceof MethodBeforeAdvice) {
            return new MethodBeforeAdviceInterceptor((MethodBeforeAdvice) advisor.getAdvice());
        }
        if (advisor.getAdvice() instanceof AfterReturningAdvice) {
            return new AfterReturningAdviceInterceptor((AfterReturningAdvice) advisor.getAdvice());
        }
        return null;
    })
    .collect(Collectors.toList());
```

- **调用链执行流程**： `MyMethodInvocation`模拟了 Spring 的`ReflectiveMethodInvocation`，通过`proceed()`方法实现拦截器的链式调用：

1. 执行第一个拦截器（前置通知拦截器），触发`CustomBeforeAdvice.before()`
2. 调用`proceed()`进入下一个拦截器（后置通知拦截器）
3. 当所有拦截器执行完毕，通过`method.invoke(target, args)`调用目标方法（`UserService.addUser()`）
4. 目标方法返回后，回溯执行后置通知拦截器，触发`CustomAfterAdvice.afterReturning()`

- **java**运行

```java
// 调用链执行核心逻辑
public Object proceed() throws Throwable {
    if (i == list.size()) {
        // 所有拦截器执行完毕，调用目标方法
        return getMethod().invoke(target, getArguments());
    }
    // 执行下一个拦截器
    MethodInterceptor mi = list.get(i);
    i++;
    return mi.invoke(this);
}
```

- **执行结果**： 最终调用`proxy.addUser("xushu")`会输出：**plaintext**

```plain
[前置Advice] 方法 addUser 即将执行，参数: [xushu]
添加用户：xushu
[后置Advice] 方法 addUser 执行完成，返回值: addUserxushu
```

清晰展示了 "前置通知→目标方法→后置通知" 的执行顺序，与 Spring AOP 的通知执行规则完全一致

## 总结

本示例完整复现了 Spring AOP 的核心工作流程：

1. 切面解析阶段：将通知与切入点绑定为`Advisor`，确定增强的位置和逻辑
2. 代理创建阶段：通过动态代理为目标对象生成代理实例，代理对象持有增强逻辑
3. 代理调用阶段：通过拦截器链按序执行通知与目标方法，实现横切逻辑的织入

这一过程实现了业务逻辑（`UserService`）与横切逻辑（通知）的解耦，是 Spring AOP"面向切面编程" 思想的直观体现。

## spring aop源码解析

我们知道，spring中的aop是通过动态代理实现的，那么他具体是如何实现的呢？spring通过一个切面类，在他的类上加入@Aspect注解，定义一个Pointcut方法，最后定义一系列的增强方法。这样就完成一个对象的切面操作。

那么思考一下，按照上述的基础，要实现我们的aop，大致有以下思路：

1.找到所有的切面类

2.解析出所有的advice并保存

3.创建一个动态代理类

4.调用被代理类的方法时，找到他的所有增强器，并增强当前的方法

那么下面通过源码验证一下我们的猜测：

![image](/源码剖析/spring6/s6-10-aop/img-001.png)

### 一、切面类的解析

#### 详细流程图：

[https://www.processon.com/view/link/5f1958a35653bb7fd24d0aad](https://www.processon.com/view/link/5f1958a35653bb7fd24d0aad)

spring通过@EnableAspectJAutoProxy开启aop切面，在注解类上面发现@Import(AspectJAutoProxyRegistrar.class)，AspectJAutoProxyRegistrar实现了ImportBeanDefinitionRegistrar，所以他会通过registerBeanDefinitions方法为我们容器导入beanDefinition。

![image](/源码剖析/spring6/s6-10-aop/img-002.png)

#### 进入解析切面的过程：

![image](/源码剖析/spring6/s6-10-aop/img-003.png)

postProcessBeforeInstantiation是在任意bean创建的时候就调用了

org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#resolveBeforeInstantiation

org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#applyBeanPostProcessorsBeforeInstantiation

org.springframework.beans.factory.config.InstantiationAwareBeanPostProcessor#postProcessBeforeInstantiation

org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#postProcessBeforeInstantiation

追踪一下源码可以看到最终导入AnnotationAwareAspectJAutoProxyCreator，我们看一下他的类继承关系图，发现它实现了两个重要的接口，BeanPostProcessor和InstantiationAwareBeanPostProcessor

首先看InstantiationAwareBeanPostProcessor的postProcessBeforeInstantiation方法

Object postProcessBeforeInstantiation(Class<?> beanClass, String beanName)（InstantiationAwareBeanPostProcessor）

org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#postProcessBeforeInstantiation

org.springframework.aop.aspectj.autoproxy.AspectJAwareAdvisorAutoProxyCreator#shouldSkip

org.springframework.aop.aspectj.annotation.AnnotationAwareAspectJAutoProxyCreator#findCandidateAdvisors

org.springframework.aop.aspectj.annotation.BeanFactoryAspectJAdvisorsBuilder#buildAspectJAdvisors

```java
public List<Advisor> buildAspectJAdvisors() {
                 //获取缓存中的aspectBeanNames
        List<String> aspectNames = this.aspectBeanNames;

        if (aspectNames == null) {
            synchronized (this) {
                aspectNames = this.aspectBeanNames;
                if (aspectNames == null) {
                    List<Advisor> advisors = new ArrayList<>();
                    aspectNames = new ArrayList<>();
                          //获取beanFactory中所有的beanNames
                    String[] beanNames = BeanFactoryUtils.beanNamesForTypeIncludingAncestors(
                            this.beanFactory, Object.class, true, false);
                    for (String beanName : beanNames) {
                        if (!isEligibleBean(beanName)) {
                            continue;
                        }
                        // We must be careful not to instantiate beans eagerly as in this case they
                        // would be cached by the Spring container but would not have been weaved.
                        Class<?> beanType = this.beanFactory.getType(beanName);
                        if (beanType == null) {
                            continue;
                        }
                        //找出所有类上面含@Aspect注解的beanName
                        if (this.advisorFactory.isAspect(beanType)) {
                        //将找到的beanName放入aspectNames集合
                            aspectNames.add(beanName);
                            AspectMetadata amd = new AspectMetadata(beanType, beanName);
                            if (amd.getAjType().getPerClause().getKind() == PerClauseKind.SINGLETON) {
                                MetadataAwareAspectInstanceFactory factory =
                                        new BeanFactoryAspectInstanceFactory(this.beanFactory, beanName);
                          //1.找到切面类的所有但是不包括@Pointcut注解的方法
                           //2.筛选出来包含@Around, @Before, @After,@ AfterReturning， @AfterThrowing注解的方法
                          //3.封装为List<Advisor>返回
                                List<Advisor> classAdvisors = this.advisorFactory.getAdvisors(factory);
                                if (this.beanFactory.isSingleton(beanName)) {
                            //将上面找出来的Advisor按照key为beanName，value为List<Advisor>的形式存入advisorsCache
                                    this.advisorsCache.put(beanName, classAdvisors);
                                }
                                else {
                                    this.aspectFactoryCache.put(beanName, factory);
                                }
                                advisors.addAll(classAdvisors);
                            }
                            else {
                                // Per target or per this.
                                if (this.beanFactory.isSingleton(beanName)) {
                                    throw new IllegalArgumentException("Bean with name '" + beanName +
                                            "' is a singleton, but aspect instantiation model is not singleton");
                                }
                                MetadataAwareAspectInstanceFactory factory =
                                        new PrototypeAspectInstanceFactory(this.beanFactory, beanName);
                                this.aspectFactoryCache.put(beanName, factory);
                                advisors.addAll(this.advisorFactory.getAdvisors(factory));
                            }
                        }
                    }
                    this.aspectBeanNames = aspectNames;
                    return advisors;
                }
            }
        }

        if (aspectNames.isEmpty()) {
            return Collections.emptyList();
        }
        List<Advisor> advisors = new ArrayList<>();
        for (String aspectName : aspectNames) {
            //当再次进入该方法，会直接从advisorsCache缓存中获取
            List<Advisor> cachedAdvisors = this.advisorsCache.get(aspectName);
            if (cachedAdvisors != null) {
                advisors.addAll(cachedAdvisors);
            }
            else {
                MetadataAwareAspectInstanceFactory factory = this.aspectFactoryCache.get(aspectName);
                advisors.addAll(this.advisorFactory.getAdvisors(factory));
            }
        }
        return advisors;
    }
```

流程图：

![image](/源码剖析/spring6/s6-10-aop/img-004.png)

#### 解析的步骤：

![image](/源码剖析/spring6/s6-10-aop/img-005.png)

最终将解析出来的advisor放入缓存，这里思考清楚 advisor和advise的区别

![image](/源码剖析/spring6/s6-10-aop/img-006.png)

其实就是我们切面中的通知方法：

![image](/源码剖析/spring6/s6-10-aop/img-007.png)

### 二、创建代理

**进入创建代理的过程：**

![image](/源码剖析/spring6/s6-10-aop/img-008.png)

postProcessAfterInitialization是在bean创建完成之后执行的

org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#doCreateBean

org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#initializeBean(java.lang.String, java.lang.Object, org.springframework.beans.factory.support.RootBeanDefinition)

org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#applyBeanPostProcessorsAfterInitialization

org.springframework.beans.factory.config.BeanPostProcessor#postProcessAfterInitialization

org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#postProcessAfterInitialization

![image](/源码剖析/spring6/s6-10-aop/img-009.png)

#### 详细流程图：

[https://www.processon.com/view/link/5f1e93f25653bb7fd2549b7c](https://www.processon.com/view/link/5f1e93f25653bb7fd2549b7c)

**1.获取advisors:**创建代理之前首先要判断当前bean是否满足被代理， 所以需要**将advisor从之前的缓存中拿出来**和当前bean 根据**表达式**进行匹配：

![image](/源码剖析/spring6/s6-10-aop/img-010.png)

Object postProcessAfterInitialization(@Nullable Object bean, String beanName)（BeanPostProcessor）

org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#postProcessAfterInitialization

org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator#wrapIfNecessary

org.springframework.aop.framework.autoproxy.AbstractAdvisorAutoProxyCreator#getAdvicesAndAdvisorsForBean

org.springframework.aop.aspectj.annotation.AnnotationAwareAspectJAutoProxyCreator#findCandidateAdvisors

上述代码的链路最终到了findCandidateAdvisors，我们发现在postProcessBeforeInstantiation方法中对查找到的Advisors做了缓存，所以这里只需要从缓存中取就好了

最后创建代理类，并将Advisors赋予代理类，缓存当前的代理类

**2.匹配:**根据advisors和当前的bean根据切点表达式进行匹配，看是否符合。

![image](/源码剖析/spring6/s6-10-aop/img-011.png)

org.springframework.aop.framework.autoproxy.AbstractAdvisorAutoProxyCreator#findAdvisorsThatCanApply

org.springframework.aop.support.AopUtils#findAdvisorsThatCanApply

org.springframework.aop.support.AopUtils#canApply(org.springframework.aop.Advisor, java.lang.Class<?>, boolean)         拿到PointCut

org.springframework.aop.support.AopUtils#canApply(org.springframework.aop.Pointcut, java.lang.Class<?>, boolean)

org.springframework.aop.ClassFilter#matches    粗筛

org.springframework.aop.IntroductionAwareMethodMatcher#matches    精筛

**3.创建代理:**找到了 和当前Bean匹配的advisor说明满足创建动态代理的条件：

![image](/源码剖析/spring6/s6-10-aop/img-012.png)

```java
Object proxy = createProxy(
                    bean.getClass(), beanName, specificInterceptors, new SingletonTargetSource(bean));
this.proxyTypes.put(cacheKey, proxy.getClass());
```

![image](/源码剖析/spring6/s6-10-aop/img-013.png)

理解了上面两个重要的方法，我们只需要将他与创建bean的流程联系起来就可以知道代理对象创建的整个流程了，在before和after方法分别放置断点，我们可以看到他的整个调用链路

### 三、代理类的调用

#### 详细流程图：

[https://www.processon.com/view/link/5f4dd513e0b34d1abc735998](https://www.processon.com/view/link/5f4dd513e0b34d1abc735998)

前面的分析可知，spring将找到的增强器Advisors赋予了代理类，那么在执行只要将这些增强器应用到被代理的类上面就可以了，那么spring具体是怎么实现的呢，下面我们以jdk代理为例分析一下源码：

```java
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        MethodInvocation invocation;
        Object oldProxy = null;
        boolean setProxyContext = false;
                 //获取当前被代理类
        TargetSource targetSource = this.advised.targetSource;
        Object target = null;
                // equals，hashcode等方法不做代理，直接调用
        try {
            if (!this.equalsDefined && AopUtils.isEqualsMethod(method)) {
                // The target does not implement the equals(Object) method itself.
                return equals(args[0]);
            }
            else if (!this.hashCodeDefined && AopUtils.isHashCodeMethod(method)) {
                // The target does not implement the hashCode() method itself.
                return hashCode();
            }
            else if (method.getDeclaringClass() == DecoratingProxy.class) {
                // There is only getDecoratedClass() declared -> dispatch to proxy config.
                return AopProxyUtils.ultimateTargetClass(this.advised);
            }
            else if (!this.advised.opaque && method.getDeclaringClass().isInterface() &&
                    method.getDeclaringClass().isAssignableFrom(Advised.class)) {
                // Service invocations on ProxyConfig with the proxy config...
                return AopUtils.invokeJoinpointUsingReflection(this.advised, method, args);
            }

            Object retVal;
                        // 将代理对象放到线程本地变量中
            if (this.advised.exposeProxy) {
                // Make invocation available if necessary.
                oldProxy = AopContext.setCurrentProxy(proxy);
                setProxyContext = true;
            }

            // Get as late as possible to minimize the time we "own" the target,
            // in case it comes from a pool.
            target = targetSource.getTarget();
            Class<?> targetClass = (target != null ? target.getClass() : null);

                        //将增加器装换为方法执行拦截器链
            List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass);

            // Check whether we have any advice. If we don't, we can fallback on direct
            // reflective invocation of the target, and avoid creating a MethodInvocation.
            if (chain.isEmpty()) {
                // We can skip creating a MethodInvocation: just invoke the target directly
                // Note that the final invoker must be an InvokerInterceptor so we know it does
                // nothing but a reflective operation on the target, and no hot swapping or fancy proxying.
                Object[] argsToUse = AopProxyUtils.adaptArgumentsIfNecessary(method, args);
                retVal = AopUtils.invokeJoinpointUsingReflection(target, method, argsToUse);
            }
            else {
                //将拦截器链包装为ReflectiveMethodInvocation并执行
                invocation = new ReflectiveMethodInvocation(proxy, target, method, args, targetClass, chain);
                retVal = invocation.proceed();
            }

            // Massage return value if necessary.
            Class<?> returnType = method.getReturnType();
            if (retVal != null && retVal == target &&
                    returnType != Object.class && returnType.isInstance(proxy) &&
                    !RawTargetAccess.class.isAssignableFrom(method.getDeclaringClass())) {
                // Special case: it returned "this" and the return type of the method
                // is type-compatible. Note that we can't help if the target sets
                // a reference to itself in another returned object.
                retVal = proxy;
            }
            else if (retVal == null && returnType != Void.TYPE && returnType.isPrimitive()) {
                throw new AopInvocationException(
                        "Null return value from advice does not match primitive return type for: " + method);
            }
            return retVal;
        }
        finally {
            if (target != null && !targetSource.isStatic()) {
                // Must have come from TargetSource.
                targetSource.releaseTarget(target);
            }
            if (setProxyContext) {
                // Restore old proxy.
                AopContext.setCurrentProxy(oldProxy);
            }
        }
    }
```

通过上面代码可知，将增强器装换为方法拦截器链，最终包装为ReflectiveMethodInvocation执行它的proceed方法，那么我们就来看下具体如果执行

```java
public Object proceed() throws Throwable {
        //  当执行到最后一个拦截器的时候才会进入
        if (this.currentInterceptorIndex == this.interceptorsAndDynamicMethodMatchers.size() - 1) {
            return invokeJoinpoint();
        }
//获取集合当前需要运行的拦截器
        Object interceptorOrInterceptionAdvice =
                this.interceptorsAndDynamicMethodMatchers.get(++this.currentInterceptorIndex);
        if (interceptorOrInterceptionAdvice instanceof InterceptorAndDynamicMethodMatcher) {
            // Evaluate dynamic method matcher here: static part will already have
            // been evaluated and found to match.
            InterceptorAndDynamicMethodMatcher dm =
                    (InterceptorAndDynamicMethodMatcher) interceptorOrInterceptionAdvice;
            Class<?> targetClass = (this.targetClass != null ? this.targetClass : this.method.getDeclaringClass());
            if (dm.methodMatcher.matches(this.method, targetClass, this.arguments)) {
                return dm.interceptor.invoke(this);
            }
            else {
                // Dynamic matching failed.
                // Skip this interceptor and invoke the next in the chain.
                return proceed();
            }
        }
        else {
            // 执行拦截器方法
            return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this);
        }
    }
这样一看会感觉很蒙，其实追踪一下源码就很好理解了
org.springframework.aop.interceptor.ExposeInvocationInterceptor#invoke
public Object invoke(MethodInvocation mi) throws Throwable {
        MethodInvocation oldInvocation = invocation.get();
        invocation.set(mi);
        try {
            return mi.proceed();
        }
        finally {
            invocation.set(oldInvocation);
        }
    }
```

org.springframework.aop.aspectj.AspectJAfterThrowingAdvice#invoke

异常拦截器，当方法调用异常会被执行

```java
public Object invoke(MethodInvocation mi) throws Throwable {
        try {
            return mi.proceed();
        }
        catch (Throwable ex) {
            if (shouldInvokeOnThrowing(ex)) {
                invokeAdviceMethod(getJoinPointMatch(), null, ex);
            }
            throw ex;
        }
    }
```

org.springframework.aop.framework.adapter.AfterReturningAdviceInterceptor#invoke

返回拦截器，方法执行失败，不会调用

```java
public Object invoke(MethodInvocation mi) throws Throwable {
        Object retVal = mi.proceed();
        this.advice.afterReturning(retVal, mi.getMethod(), mi.getArguments(), mi.getThis());
        return retVal;
    }
```

org.springframework.aop.aspectj.AspectJAfterAdvice#invoke

后置拦截器，总是执行

```java
public Object invoke(MethodInvocation mi) throws Throwable {
        try {
            return mi.proceed();
        }
        finally {
            invokeAdviceMethod(getJoinPointMatch(), null, null);
        }
    }
```

org.springframework.aop.framework.adapter.MethodBeforeAdviceInterceptor#invoke

前置拦截器

```java
public Object invoke(MethodInvocation mi) throws Throwable {
        this.advice.before(mi.getMethod(), mi.getArguments(), mi.getThis());
        return mi.proceed();
    }
```

这里用了责任链的设计模式，递归调用排序好的拦截器链
