---
title: "15.Spring AOT提前优化"
sidebarGroup: "Spring 6 源码"
shortTitle: "15.Spring AOT提前优化"
order: 15
date: 2025-09-28
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "15.Spring AOT提前优化"
---

> 来源：[15.Spring AOT提前优化](https://www.yuque.com/geren-t8lyq/ru879g/er33n8k4b806smvp)

在线笔记：

[https://www.yuque.com/geren-t8lyq/ru879g/er33n8k4b806smvp?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/er33n8k4b806smvp?singleDoc#)

Spring6AOT示例代码：

链接: [https://pan.baidu.com/s/17n_KZ9AMa0SHmpxkdIdiIw?pwd=wr64](https://pan.baidu.com/s/17n_KZ9AMa0SHmpxkdIdiIw?pwd=wr64) 提取码: wr64

## AOT之什么是AOT

一种编译方式的变革！旨在提升启动速度！

JIT，即Just-in-time,动态(即时)编译，运行时编译；

AOT，Ahead Of Time，指运行前编译，是两种程序的编译方式

![cover.png](/源码剖析/spring6/s6-15-aot/img-001.png)

## AOT之什么是GraalVM

![image.png](/源码剖析/spring6/s6-15-aot/img-002.png)

GraalVM旨在加速Java应用程序的性能，同时消耗更少的资源。GraalVM提供了两种运行Java应用程序的方式：在HotSpot JVM上使用Graal即时编译器或作为预先编译的本地可执行文件（AOT）。除了Java，它还提供了JavaScript、Ruby、Python和许多其他流行语言的运行时。GraalVM的多语言能力使得可以在单个应用程序中混合编程语言，同时消除不同语言之间调用的成本。

GraalVM文章推荐：[https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzI3MDI5MjI1Nw==&action=getalbum&album_id=2761361634840969217&scene=173&from_msgid=2247484273&from_itemidx=1&count=3&nolastread=1#wechat_redirect](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzI3MDI5MjI1Nw==&action=getalbum&album_id=2761361634840969217&scene=173&from_msgid=2247484273&from_itemidx=1&count=3&nolastread=1#wechat_redirect)

## GraalVM体验

### 下载压缩包

打开[https://github.com/graalvm/graalvm-ce-builds/releases](https://github.com/graalvm/graalvm-ce-builds/releases)，按JDK版本下载GraalVM对应的压缩包，请下载**Java 17对应**的版本，不然后面运行SpringBoot3可能会有问题。

![image.png](/源码剖析/spring6/s6-15-aot/img-003.png)

windows的同学直接给大家：

📎 [graalvm-ce-java17-windows-amd64-22.3.0.zip](https://www.yuque.com/attachments/yuque/0/2025/zip/22309163/1758185423498-b8c85312-da70-476b-b2cd-09e02ce930b7.zip)

下载完后，就解压，

![image.png](/源码剖析/spring6/s6-15-aot/img-004.png)

### 配置环境变量

![image.png](/源码剖析/spring6/s6-15-aot/img-005.png)

新开一个cmd测试：

![image.png](/源码剖析/spring6/s6-15-aot/img-006.png)

### 安装Visual Studio Build Tools

![image](/源码剖析/spring6/s6-15-aot/img-007.png)

打开[visualstudio.microsoft.com](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=BuildTools&rel=16)，下载Visual Studio Installer。

选择C++桌面开发，和Windows 11 SDK，然后进行下载和安装，安装后重启操作系统。

![image.png](/源码剖析/spring6/s6-15-aot/img-008.png)

要使用GraalVM，不能使用普通的windows自带的命令行窗口，得使用VS提供的** x64 Native Tools Command Prompt for VS 2019**，如果没有可以执行`C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat`脚本来安装。

安装完之后其实就可以在 **x64 Native Tools Command Prompt for VS 2019**中去使用`native-image`命令去进行编译了。

但是，如果后续在编译过程中编译失败了，出现以下错误：

![image.png](/源码剖析/spring6/s6-15-aot/img-009.png)

那么可以执行cl.exe，如果是中文，那就得修改为英文。

![image.png](/源码剖析/spring6/s6-15-aot/img-010.png)

通过Visual Studio Installer来修改，比如：

![image.png](/源码剖析/spring6/s6-15-aot/img-011.png)

可能一开始只选择了中文，手动选择英文，去掉中文，然后安装即可。

再次检查

![image.png](/源码剖析/spring6/s6-15-aot/img-012.png)

这样就可以正常的编译了。

### Hello World实战

新建一个简单的Java工程：

![image.png](/源码剖析/spring6/s6-15-aot/img-013.png)

我们可以直接把graalvm当作普通的jdk的使用

![image.png](/源码剖析/spring6/s6-15-aot/img-014.png)

我们也可以利用native-image命令来将字节码编译为二进制可执行文件。

打开**x64 Native Tools Command Prompt for VS 2019**，进入工程目录下，并利用javac将java文件编译为class文件：`javac -d . src/com/xs/App.java`

![image.png](/源码剖析/spring6/s6-15-aot/img-015.png)

此时的class文件因为有main方法，所以用java命令可以运行

![image.png](/源码剖析/spring6/s6-15-aot/img-016.png)

我们也可以利用native-image来编译：

![image.png](/源码剖析/spring6/s6-15-aot/img-017.png)

编译完了之后就会在当前目录生成一个exe文件：

![image.png](/源码剖析/spring6/s6-15-aot/img-018.png)

我们可以直接运行这个exe文件：

![image.png](/源码剖析/spring6/s6-15-aot/img-019.png)

并且**运行这个exe文件是不需要操作系统上安装了JDK环境的。**

我们可以使用-o参数来指定exe文件的名字：

```java
native-image com.xs.App -o app
```

## SpringBoot 3.0实战

![image](/源码剖析/spring6/s6-15-aot/img-020.png)

然后新建一个Maven工程，添加SpringBoot依赖

```xml
<parent>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-parent</artifactId>
	<version>3.0.0</version>
</parent>
 
```

以及SpringBoot的插件

```xml
<build>
	<plugins>
		<plugin>
			<groupId>org.graalvm.buildtools</groupId>
			<artifactId>native-maven-plugin</artifactId>
		</plugin>
		<plugin>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-maven-plugin</artifactId>
		</plugin>
	</plugins>
</build>
```

以及一些代码

```java
package com.xs;

import org.springframework.stereotype.Component;

@Component
public class UserService {

    public String test(){
        return "hello xushu";
    }
}

```

```java
package com.xs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}

```

这本身就是一个普通的SpringBoot工程，所以可以使用我们之前的方式使用，同时也支持利用native-image命令把整个SpringBoot工程编译成为一个exe文件。

同样在 **x64 Native Tools Command Prompt for VS 2019**中，进入到工程目录下，执行`mvn -Pnative native:compile`进行编译就可以了，就能在target下生成对应的exe文件，后续只要运行exe文件就能启动应用了。

在执行命令之前，请确保环境变量中设置的时graalvm的路径。

编译完成截图：

![image.png](/源码剖析/spring6/s6-15-aot/img-021.png)

![image.png](/源码剖析/spring6/s6-15-aot/img-022.png)

这样，我们就能够直接运行这个exe来启动我们的SpringBoot项目了。

## GraalVM的限制

GraalVM在编译成二进制可执行文件时，需要确定该应用到底用到了哪些类、哪些方法、哪些属性，从而把这些代码编译为机器指令（也就是exe文件）。但是我们一个应用中某些类可能是动态生成的，也就是应用运行后才生成的，为了解决这个问题，GraalVM提供了配置的方式，比如我们可以在编译时告诉GraalVM哪些方法会被反射调用，比如我们可以通过reflect-config.json来进行配置。

### 通过RuntimeHints解决

`RuntimeHints` 内部包含了五种不同类型的提示信息

1. **反射提示 (ReflectionHints)** - 记录需要反射访问的类、方法、字段等
2. **资源提示 (ResourceHints)** - 指定需要包含在原生镜像中的资源文件
3. **序列化提示 (SerializationHints)** - 标记需要Java序列化支持的类
4. **代理提示 (ProxyHints)** - 记录需要生成的JDK动态代理
5. **JNI提示 (ReflectionHints)** - 用于JNI相关的反射访问

#### 为什么需要RuntimeHints

在GraalVM原生镜像中，运行时的动态特性（如反射、资源加载）需要在构建时明确声明。`RuntimeHints` 就是用来收集这些信息的API。

假如应用中有如下代码：

```java
/**
* 作者：徐庶
*/
public class XushuService {

    public String test(){
        return "xushu";
    }
}
```

```java
@Component
public class UserService {

    public String test(){

        String result = "";
        try {
            Method test = XushuService.class.getMethod("test", null);
            result = (String) test.invoke(XushuService.class.newInstance(), null);
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(e);
        } catch (InvocationTargetException e) {
            throw new RuntimeException(e);
        } catch (IllegalAccessException e) {
            throw new RuntimeException(e);
        } catch (InstantiationException e) {
            throw new RuntimeException(e);
        }

        return result;
    }

}
```

在UserService中，通过反射的方式使用到了XushuService的无参构造方法（XushuService.class.newInstance()），如果我们不做任何处理，那么打成二进制可执行文件后是运行不了的，可执行文件中是没有XushuService的无参构造方法的，会报如下错误：

![image.png](/源码剖析/spring6/s6-15-aot/img-023.png)

我们可以通过Spring提供的Runtime Hints机制来间接的配置reflect-config.json。

#### 方式一：RuntimeHintsRegistrar

提供一个RuntimeHintsRegistrar接口的实现类，并导入到Spring容器中就可以了：

```java
@Component
@ImportRuntimeHints(UserService.XushuServiceRuntimeHints.class)
public class UserService {

    public String test(){

        String result = "";
        try {
            Method test = XushuService.class.getMethod("test", null);
            result = (String) test.invoke(XushuService.class.newInstance(), null);
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(e);
        } catch (InvocationTargetException e) {
            throw new RuntimeException(e);
        } catch (IllegalAccessException e) {
            throw new RuntimeException(e);
        } catch (InstantiationException e) {
            throw new RuntimeException(e);
        }

        return result;
    }

    static class XushuServiceRuntimeHints implements RuntimeHintsRegistrar {

        @Override
        public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
            try {
                hints.reflection().registerConstructor(XushuService.class.getConstructor(), ExecutableMode.INVOKE);
            } catch (NoSuchMethodException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
```

#### 方式二：@RegisterReflectionForBinding

```java
@RegisterReflectionForBinding(XushuService.class)
public String test(){

    String result = "";
    try {
        Method test = XushuService.class.getMethod("test", null);
        result = (String) test.invoke(XushuService.class.newInstance(), null);
    } catch (NoSuchMethodException e) {
        throw new RuntimeException(e);
    } catch (InvocationTargetException e) {
        throw new RuntimeException(e);
    } catch (IllegalAccessException e) {
        throw new RuntimeException(e);
    } catch (InstantiationException e) {
        throw new RuntimeException(e);
    }

    return result;
}
```

**注意**

如果代码中的methodName是通过参数获取的，那么GraalVM在编译时就不能知道到底会使用到哪个方法，那么test方法也要利用RuntimeHints来进行配置。

```java
@Component
@ImportRuntimeHints(UserService.XushuServiceRuntimeHints.class)
public class UserService {

    public String test(){

        String methodName = System.getProperty("methodName");

        String result = "";
        try {
            Method test = XushuService.class.getMethod(methodName, null);
            result = (String) test.invoke(XushuService.class.newInstance(), null);
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(e);
        } catch (InvocationTargetException e) {
            throw new RuntimeException(e);
        } catch (IllegalAccessException e) {
            throw new RuntimeException(e);
        } catch (InstantiationException e) {
            throw new RuntimeException(e);
        }

        return result;
    }

    static class XushuServiceRuntimeHints implements RuntimeHintsRegistrar {

        @Override
        public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
            try {
                hints.reflection().registerConstructor(XushuService.class.getConstructor(), ExecutableMode.INVOKE);
                hints.reflection().registerMethod(XushuService.class.getMethod("test"), ExecutableMode.INVOKE);
            } catch (NoSuchMethodException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
```

或者使用了JDK动态代理：

```java
public String test() throws ClassNotFoundException {

    String className = System.getProperty("className");
	Class<?> aClass = Class.forName(className);

	Object o = Proxy.newProxyInstance(UserService.class.getClassLoader(), new Class[]{aClass}, new InvocationHandler() {
    	@Override
    	public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        	return method.getName();
    	}
	});

	return o.toString();
}
```

那么也可以利用RuntimeHints来进行配置要代理的接口：

```java
public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
    hints.proxies().registerJdkProxy(UserInterface.class);
}
```

#### 方式三：@Reflective

对于反射用到的地方，我们可以直接加一个@Reflective，前提是XushuService得是一个Bean：

```java
@Component
public class XushuService {

    @Reflective
    public XushuService() {
    }

    @Reflective
    public String test(){
        return "Xushu";
    }
}
```

以上Spring6提供的RuntimeHints机制，我们可以使用该机制更方便的告诉GraalVM我们额外用到了哪些类、接口、方法等信息，最终Spring会生成对应的reflect-config.json、proxy-config.json中的内容，GraalVM就知道了。

## Spring AOT的源码实现

> AOT将Spring的运行时动态特性转换为构建时的静态代码，同时通过RuntimeHints为GraalVM构建时需要明确的类型（如反射访问的类、代理类、资源文件等）生成配置文件，避免运行时动态解析开销，从而实现原生镜像的快速启动和低内存占用。

传统方式ioc加载过程：

![image.png](/源码剖析/spring6/s6-15-aot/img-024.png)

Aot:  提前确定BeanDefinition所需要的一切信息（beanclass生成的代码直接可以new,依赖关系、回调、代理等）

举个吃饭例子：

> 传统方式： 你要去菜市场买菜（不知道怎么想吃什么，边逛边买，怎么搭配）， 回去洗菜、炒菜、才能吃饭
> AOT： 直接点外卖， 前面的环节都已经准备好了， 但是你不能临时改， 在点的时候就要确定（构建时必须固定类路径和配置）

当运行`mvn -Pnative native:compile`，就会执行mvn `compile`从而执行spring-boot-maven-plugin

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
</plugin>
```

就会执行spring-boot-maven-plugin中的插件的执行目标（Mojo）,即：`ProcessAotMojo.execute()`方法

```java
@Mojo(name = "process-aot", defaultPhase = LifecyclePhase.PREPARE_PACKAGE, threadSafe = true,
      requiresDependencyResolution = ResolutionScope.COMPILE_PLUS_RUNTIME,
      requiresDependencyCollection = ResolutionScope.COMPILE_PLUS_RUNTIME)
public class ProcessAotMojo extends AbstractAotMojo {
...
    @Override
	public void execute() throws MojoExecutionException, MojoFailureException {
		...
			executeAot();
		...
...
}
```

在executeAot中执行：

1. 执行`org.springframework.boot.SpringApplicationAotProcessor`的`main`方法
2. 从而执行`SpringApplicationAotProcessor的process()`

以**上为SpringBoot:**

**以下为Spring:**

1. 从而执行Spring的`ContextAotProcessor`的`doProcess()`

1. **入口点：ContextAotProcessor.doProcess()**

整个AOT处理从 `ContextAotProcessor.doProcess()` 开始

```java
protected ClassName doProcess() {
		deleteExistingOutput();
		try (GenericApplicationContext applicationContext = prepareApplicationContext(getApplicationClass())) {
			return performAotProcessing(applicationContext);
		}
	}

```

1. **核心处理：performAotProcessing()**

`doProcess()` 调用 `performAotProcessing()` 执行核心AOT处理逻辑

```java
protected ClassName performAotProcessing(GenericApplicationContext applicationContext) {
		FileSystemGeneratedFiles generatedFiles = createFileSystemGeneratedFiles();
		DefaultGenerationContext generationContext = new DefaultGenerationContext(
				createClassNameGenerator(), generatedFiles);
		ApplicationContextAotGenerator generator = new ApplicationContextAotGenerator();
		ClassName generatedInitializerClassName = generator.processAheadOfTime(applicationContext, generationContext);
		registerEntryPointHint(generationContext, generatedInitializerClassName);
		generationContext.writeGeneratedContent();
		writeHints(generationContext.getRuntimeHints());
		writeNativeImageProperties(getDefaultNativeImageArguments(getApplicationClass().getName()));
		return generatedInitializerClassName;
	}
```

** 2.1  AOT生成器：ApplicationContextAotGenerator.processAheadOfTime()**

在 `performAotProcessing()` 中，关键调用是 `generator.processAheadOfTime(applicationContext, generationContext)`

**2.2.  容器刷新：refreshForAotProcessing()**

`ApplicationContextAotGenerator.processAheadOfTime()` 内部会调用 `applicationContext.refreshForAotProcessing(generationContext.getRuntimeHints())` 来执行AOT专用的容器刷新，这一步会注册所有Bean定义但不实例化Bean。

### 3. 运行时提示收集

在整个过程中，运行时提示通过多个途径收集：

- **反射提示注册**：在代码生成过程中自动注册反射访问提示

```java
private void registerRuntimeHintsIfNecessary(RegisteredBean registeredBean, Executable constructorOrFactoryMethod) {
    if (registeredBean.getBeanFactory() instanceof DefaultListableBeanFactory dlbf) {
        RuntimeHints runtimeHints = this.generationContext.getRuntimeHints();
        ProxyRuntimeHintsRegistrar registrar = new ProxyRuntimeHintsRegistrar(dlbf.getAutowireCandidateResolver());
        registrar.registerRuntimeHints(runtimeHints, constructorOrFactoryMethod);
    }
}
```

- **RuntimeHintsRegistrar处理**：通过 `RuntimeHintsBeanFactoryInitializationAotProcessor` 处理 `@ImportRuntimeHints` 注解和spring.factories中的注册器

```java
public BeanFactoryInitializationAotContribution processAheadOfTime(ConfigurableListableBeanFactory beanFactory) {
Map<Class<? extends RuntimeHintsRegistrar>, RuntimeHintsRegistrar> registrars = AotServices
.factories(beanFactory.getBeanClassLoader()).load(RuntimeHintsRegistrar.class).stream()
.collect(LinkedHashMap::new, (map, item) -> map.put(item.getClass(), item), Map::putAll);
extractFromBeanFactory(beanFactory).forEach(registrarClass ->
                                            registrars.computeIfAbsent(registrarClass, BeanUtils::instantiateClass));
return new RuntimeHintsRegistrarContribution(registrars.values(), beanFactory.getBeanClassLoader());
}
```

- **自动提示收集**：各种AOT贡献器在生成代码时自动收集运行时提示，如字段注入、方法调用等

```java
private CodeBlock generateMethodStatementForField(ClassName targetClassName,
                                                  Field field, LookupElement lookupElement, RuntimeHints hints) {
    hints.reflection().registerField(field);
```

### 7. 文件输出

最终通过以下步骤输出文件：

- **Java源码写入**：`generationContext.writeGeneratedContent()`
- **运行时提示写入**：`writeHints(generationContext.getRuntimeHints())`
- **原生镜像配置写入**：`writeNativeImageProperties()`

### AOT不创建Bean实例的核心原因

**1. AOT的目标是代码生成，不是运行时执行**

AOT处理的目标是在**构建时**分析应用结构并生成优化的启动代码。如果创建Bean实例，就变成了实际运行应用，而不是分析应用。

**2. 避免副作用和资源消耗**

创建Bean实例可能会产生不必要的副作用：

- 数据库连接
- 网络请求
- 文件操作
- 线程启动

这些在构建时都是不需要的，甚至可能导致构建失败。

**3. 只需要结构信息，不需要运行时状态**

AOT处理只需要知道：

- 有哪些Bean
- Bean之间的依赖关系
- Bean的类型信息
- 需要哪些反射访问

这些信息通过Bean定义就能获得，不需要实际的Bean实例

**4. refreshForAotProcessing的特殊设计**

`refreshForAotProcessing`方法专门为AOT设计

注意这个方法**没有调用**常规refresh中的Bean实例化步骤，而是：

- 只执行`BeanFactoryPostProcessor`
- 只调用特定的后处理器如`MergedBeanDefinitionPostProcessor`

**5. 但有例外情况**

虽然一般不创建Bean实例，但有特殊情况：

实现了`BeanFactoryInitializationAotProcessor`的Bean会在AOT处理时被实例化，因为它们需要参与AOT代码生成过程。

总结：AOT不创建Bean实例是因为它的目标是**分析和生成代码**，而不是**运行应用**。只有Bean定义就足够获得生成优化启动代码所需的所有结构信息，而避免了运行时的副作用和资源消耗。
