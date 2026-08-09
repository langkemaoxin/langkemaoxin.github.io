---
title: "6.配置类解析"
sidebarGroup: "Spring 6 源码"
shortTitle: "6.配置类解析"
order: 6
date: 2025-09-28
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "6.配置类解析"
---

> 来源：[6.配置类解析](https://www.yuque.com/geren-t8lyq/ru879g/yh6ny24uu7dfrxeo)

在线长期更新笔记：[https://www.yuque.com/geren-t8lyq/ru879g/yh6ny24uu7dfrxeo?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/yh6ny24uu7dfrxeo?singleDoc#) 《5.配置类解析》

配置类解析完整流程图：[https://www.processon.com/view/link/5f18298a7d9c0835d38a57c0?cid=5f18298a7d9c0835d38a57bd](https://www.processon.com/view/link/5f18298a7d9c0835d38a57c0?cid=5f18298a7d9c0835d38a57bd)

课上流程图：[https://www.processon.com/view/link/68aefe8d687a3f3e21d7702b?cid=68a8595777321f26867aa352](https://www.processon.com/view/link/68aefe8d687a3f3e21d7702b?cid=68a8595777321f26867aa352)

课上Spring6.2.9源码：[https://github.com/spring-projects/spring-framework](https://github.com/spring-projects/spring-framework)

Spring6.2.9Deepwiki:[https://deepwiki.com/spring-projects/spring-framework](https://deepwiki.com/spring-projects/spring-framework)

## 流程概述

这个流程主要涉及Spring容器启动时对配置类的处理，特别是`@ComponentScan`注解的解析和组件扫描过程。

大家记住3个组件

1. `ConfigurationClassPostProcessor`  配置类后置处理器， 他实现了BeanFactoryPostProcessor和BeanDefinitionRegistryPostProcessor会在扩展方法processConfigBeanDefinitions 中进行动态BeanDefinition注册。
2. ConfigurationClassParser 配置类解析器： 在`doProcessConfigurationClass`方法中会解析@Import、@ComponentScan、@Bean等等， 但是只有@ComponentScan解析完立即注册为BeanDefinition 所以他的优先级最高。
3. ComponentScanAnnotationParser  @ComponentScan解析器， 在parse 方法中会进行扫描包。
4. ClassPathBeanDefinitionScanner 通过该组件进行具体的资源扫描注册为BeanDefintion

## 主要组件和流程

Spring 启动过程中，`ConfigurationClassPostProcessor`负责处理配置类，该处理器由new BeanDefinitionReader时注册。

### 1. 配置类解析入口

在 Spring 的`AbstractApplicationContext`的`refresh`方法中，会调用`invokeBeanFactoryPostProcessors`方法， 其中会并执行`ConfigurationClassPostProcessor`。

#### `processConfigBeanDefinitions`方法

流程从`ConfigurationClassPostProcessor`开始，它是一个`BeanDefinitionRegistryPostProcessor`，负责处理配置类。 ConfigurationClassPostProcessor.java:

```java
/**
	 * Build and validate a configuration model based on the registry of
	 * {@link Configuration} classes.
	 */
	public void processConfigBeanDefinitions(BeanDefinitionRegistry registry) {
		...

		// Parse each @Configuration class
		ConfigurationClassParser parser = new ConfigurationClassParser(
				this.metadataReaderFactory, this.problemReporter, this.environment,
				this.resourceLoader, this.componentScanBeanNameGenerator, registry);

		...
	}
```

### 2. ConfigurationClassParser解析配置类

`ConfigurationClassParser`负责解析配置类，包括处理`@ComponentScan`注解。 ConfigurationClassParser.java

```java
private final ComponentScanAnnotationParser componentScanParser;
```

在`doProcessConfigurationClass`方法中，专门处理`@ComponentScan`注解： ConfigurationClassParser.java

```java
/**
	 * Apply processing and build a complete {@link ConfigurationClass} by reading the
	 * annotations, members and methods from the source class. This method can be called
	 * multiple times as relevant sources are discovered.
	 * @param configClass the configuration class being build
	 * @param sourceClass a source class
	 * @return the superclass, or {@code null} if none found or previously processed
	 */
	protected final @Nullable SourceClass doProcessConfigurationClass(
			ConfigurationClass configClass, SourceClass sourceClass, Predicate<String> filter)
			throws IOException {
        ...

		// Search for locally declared @ComponentScan annotations first.
		Set<AnnotationAttributes> componentScans = AnnotationConfigUtils.attributesForRepeatable(
				sourceClass.getMetadata(), ComponentScan.class, ComponentScans.class,
				MergedAnnotation::isDirectlyPresent);

		...
	}

```

### 3. ComponentScanAnnotationParser处理@ComponentScan

当发现`@ComponentScan`注解时，会委托给`ComponentScanAnnotationParser`进行解析： ConfigurationClassParser.java

```java
/**
	 * Apply processing and build a complete {@link ConfigurationClass} by reading the
	 * annotations, members and methods from the source class. This method can be called
	 * multiple times as relevant sources are discovered.
	 * @param configClass the configuration class being build
	 * @param sourceClass a source class
	 * @return the superclass, or {@code null} if none found or previously processed
	 */
	protected final @Nullable SourceClass doProcessConfigurationClass(
			ConfigurationClass configClass, SourceClass sourceClass, Predicate<String> filter)
			throws IOException {

		...

		// Search for locally declared @ComponentScan annotations first.
		Set<AnnotationAttributes> componentScans = AnnotationConfigUtils.attributesForRepeatable(
				sourceClass.getMetadata(), ComponentScan.class, ComponentScans.class,
				MergedAnnotation::isDirectlyPresent);

		// Fall back to searching for @ComponentScan meta-annotations (which indirectly
		// includes locally declared composed annotations).
		if (componentScans.isEmpty()) {
			componentScans = AnnotationConfigUtils.attributesForRepeatable(sourceClass.getMetadata(),
					ComponentScan.class, ComponentScans.class, MergedAnnotation::isMetaPresent);
		}

		if (!componentScans.isEmpty()) {
			List<Condition> registerBeanConditions = collectRegisterBeanConditions(configClass);
			if (!registerBeanConditions.isEmpty()) {
				throw new ApplicationContextException(
						"Component scan for configuration class [%s] could not be used with conditions in REGISTER_BEAN phase: %s"
								.formatted(configClass.getMetadata().getClassName(), registerBeanConditions));
			}
			for (AnnotationAttributes componentScan : componentScans) {
				// The config class is annotated with @ComponentScan -> perform the scan immediately
				Set<BeanDefinitionHolder> scannedBeanDefinitions =
						this.componentScanParser.parse(componentScan, sourceClass.getMetadata().getClassName());
				// Check the set of scanned definitions for any further config classes and parse recursively if needed
				for (BeanDefinitionHolder holder : scannedBeanDefinitions) {
					BeanDefinition bdCand = holder.getBeanDefinition().getOriginatingBeanDefinition();
					if (bdCand == null) {
						bdCand = holder.getBeanDefinition();
					}
					if (ConfigurationClassUtils.checkConfigurationClassCandidate(bdCand, this.metadataReaderFactory)) {
						parse(bdCand.getBeanClassName(), holder.getBeanName());
					}
				}
			}
		}

		...
	}
```

`ComponentScanAnnotationParser.parse`方法创建`ClassPathBeanDefinitionScanner`并执行扫描： ComponentScanAnnotationParser.java

```java
public Set<BeanDefinitionHolder> parse(AnnotationAttributes componentScan, String declaringClass) {
		ClassPathBeanDefinitionScanner scanner = new ClassPathBeanDefinitionScanner(this.registry,
				componentScan.getBoolean("useDefaultFilters"), this.environment, this.resourceLoader);

		Class<? extends BeanNameGenerator> generatorClass = componentScan.getClass("nameGenerator");
		boolean useInheritedGenerator = (BeanNameGenerator.class == generatorClass);
		scanner.setBeanNameGenerator(useInheritedGenerator ? this.beanNameGenerator :
				BeanUtils.instantiateClass(generatorClass));

		ScopedProxyMode scopedProxyMode = componentScan.getEnum("scopedProxy");
		if (scopedProxyMode != ScopedProxyMode.DEFAULT) {
			scanner.setScopedProxyMode(scopedProxyMode);
		}
		else {
			Class<? extends ScopeMetadataResolver> resolverClass = componentScan.getClass("scopeResolver");
			scanner.setScopeMetadataResolver(BeanUtils.instantiateClass(resolverClass));
		}

		scanner.setResourcePattern(componentScan.getString("resourcePattern"));

		for (AnnotationAttributes includeFilterAttributes : componentScan.getAnnotationArray("includeFilters")) {
			List<TypeFilter> typeFilters = TypeFilterUtils.createTypeFiltersFor(includeFilterAttributes, this.environment,
					this.resourceLoader, this.registry);
			for (TypeFilter typeFilter : typeFilters) {
				scanner.addIncludeFilter(typeFilter);
			}
		}
		for (AnnotationAttributes excludeFilterAttributes : componentScan.getAnnotationArray("excludeFilters")) {
			List<TypeFilter> typeFilters = TypeFilterUtils.createTypeFiltersFor(excludeFilterAttributes, this.environment,
				this.resourceLoader, this.registry);
			for (TypeFilter typeFilter : typeFilters) {
				scanner.addExcludeFilter(typeFilter);
			}
		}

		boolean lazyInit = componentScan.getBoolean("lazyInit");
		if (lazyInit) {
			scanner.getBeanDefinitionDefaults().setLazyInit(true);
		}

		Set<String> basePackages = new LinkedHashSet<>();
		String[] basePackagesArray = componentScan.getStringArray("basePackages");
		for (String pkg : basePackagesArray) {
			String[] tokenized = StringUtils.tokenizeToStringArray(this.environment.resolvePlaceholders(pkg),
					ConfigurableApplicationContext.CONFIG_LOCATION_DELIMITERS);
			Collections.addAll(basePackages, tokenized);
		}
		for (Class<?> clazz : componentScan.getClassArray("basePackageClasses")) {
			basePackages.add(ClassUtils.getPackageName(clazz));
		}
		if (basePackages.isEmpty()) {
			basePackages.add(ClassUtils.getPackageName(declaringClass));
		}

		scanner.addExcludeFilter(new AbstractTypeHierarchyTraversingFilter(false, false) {
			@Override
			protected boolean matchClassName(String className) {
				return declaringClass.equals(className);
			}
		});
		return scanner.doScan(StringUtils.toStringArray(basePackages));
	}
```

### 4. ClassPathBeanDefinitionScanner执行扫描

`ClassPathBeanDefinitionScanner`负责实际的类路径扫描和BeanDefinition注册： ComponentScanAnnotationParser.java:

```java
return scanner.doScan(StringUtils.toStringArray(basePackages));
```

扫描过程在`doScan`方法中实现：

扫描到的组件会被转换为`BeanDefinition`并注册到容器中： ClassPathBeanDefinitionScanner.java:292

```java
protected Set<BeanDefinitionHolder> doScan(String... basePackages) {
		Assert.notEmpty(basePackages, "At least one base package must be specified");
		Set<BeanDefinitionHolder> beanDefinitions = new LinkedHashSet<>();
		for (String basePackage : basePackages) {
			Set<BeanDefinition> candidates = findCandidateComponents(basePackage);
			for (BeanDefinition candidate : candidates) {
				ScopeMetadata scopeMetadata = this.scopeMetadataResolver.resolveScopeMetadata(candidate);
				candidate.setScope(scopeMetadata.getScopeName());
				String beanName = this.beanNameGenerator.generateBeanName(candidate, this.registry);
				if (candidate instanceof AbstractBeanDefinition abstractBeanDefinition) {
					postProcessBeanDefinition(abstractBeanDefinition, beanName);
				}
				if (candidate instanceof AnnotatedBeanDefinition annotatedBeanDefinition) {
					AnnotationConfigUtils.processCommonDefinitionAnnotations(annotatedBeanDefinition);
				}
				if (checkCandidate(beanName, candidate)) {
					BeanDefinitionHolder definitionHolder = new BeanDefinitionHolder(candidate, beanName);
					definitionHolder =
							AnnotationConfigUtils.applyScopedProxyMode(scopeMetadata, definitionHolder, this.registry);
					beanDefinitions.add(definitionHolder);
					registerBeanDefinition(definitionHolder, this.registry);
				}
			}
		}
		return beanDefinitions;
	}
```

> Spring的组件扫描机制基于元注解的设计模式，通过 `@Component` 作为基础元注解，所有的stereotype注解（如 `@Service`、`@Repository`、`@Controller`、`@Configuration`）都能被统一检测。这种设计既保持了扩展性，又确保了一致的扫描行为。扫描过程中还支持自定义过滤器来进一步控制哪些类应该被检测为候选组件。

### 6. 递归处理新发现的配置类

如果扫描到的组件也是配置类，会递归进行解析： ConfigurationClassParser.java:

```java
for (AnnotationAttributes componentScan : componentScans) {
				// The config class is annotated with @ComponentScan -> perform the scan immediately
				Set<BeanDefinitionHolder> scannedBeanDefinitions =
						this.componentScanParser.parse(componentScan, sourceClass.getMetadata().getClassName());
				// Check the set of scanned definitions for any further config classes and parse recursively if needed
				for (BeanDefinitionHolder holder : scannedBeanDefinitions) {
					BeanDefinition bdCand = holder.getBeanDefinition().getOriginatingBeanDefinition();
					if (bdCand == null) {
						bdCand = holder.getBeanDefinition();
					}
					if (ConfigurationClassUtils.checkConfigurationClassCandidate(bdCand, this.metadataReaderFactory)) {
						parse(bdCand.getBeanClassName(), holder.getBeanName());
					}
				}
			}
		}
```

## @Import的解析过程

### 1. 注解收集阶段

Spring首先通过 `getImports()` 方法收集所有的 `@Import` 注解，包括元注解中的 `@Import`。 ConfigurationClassParser

```java
/**
	 * Returns {@code @Import} classes, considering all meta-annotations.
	 */
private Set<SourceClass> getImports(SourceClass sourceClass) throws IOException {
    Set<SourceClass> imports = new LinkedHashSet<>();
    collectImports(sourceClass, imports, new HashSet<>());
    return imports;
}
```

这个过程会递归地收集所有声明的 `@Import` 值，因为一个类可能通过多个元注解间接声明多个 `@Import`。 ConfigurationClassParser.java

```java
private void collectImports(SourceClass sourceClass, Set<SourceClass> imports, Set<SourceClass> visited)
throws IOException {

    if (visited.add(sourceClass)) {
        for (SourceClass annotation : sourceClass.getAnnotations()) {
            String annName = annotation.getMetadata().getClassName();
            if (!annName.equals(Import.class.getName())) {
                collectImports(annotation, imports, visited);
            }
        }
        imports.addAll(sourceClass.getAnnotationAttributes(Import.class.getName(), "value"));
    }
}
```

### 2. Import候选类处理

收集到Import候选类后，Spring会调用 `processImports()` 方法进行处理，该方法会根据候选类的类型采用不同的处理策略。 ConfigurationClassParser.java

```java
private void processImports(ConfigurationClass configClass, SourceClass currentSourceClass,
                            Collection<SourceClass> importCandidates, Predicate<String> filter, boolean checkForCircularImports) {

    if (importCandidates.isEmpty()) {
        return;
    }

    if (checkForCircularImports && isChainedImportOnStack(configClass)) {
        this.problemReporter.error(new CircularImportProblem(configClass, this.importStack));
    }
    else {
        this.importStack.push(configClass);
        try {
            for (SourceClass candidate : importCandidates) {
                if (candidate.isAssignable(ImportSelector.class)) {
                    // Candidate class is an ImportSelector -> delegate to it to determine imports
                    Class<?> candidateClass = candidate.loadClass();
                    ImportSelector selector = ParserStrategyUtils.instantiateClass(candidateClass, ImportSelector.class,
                                                                                   this.environment, this.resourceLoader, this.registry);
                    Predicate<String> selectorFilter = selector.getExclusionFilter();
                    if (selectorFilter != null) {
                        filter = filter.or(selectorFilter);
                    }
                    if (selector instanceof DeferredImportSelector deferredImportSelector) {
                        this.deferredImportSelectorHandler.handle(configClass, deferredImportSelector);
                    }
                    else {
                        String[] importClassNames = selector.selectImports(currentSourceClass.getMetadata());
                        Collection<SourceClass> importSourceClasses = asSourceClasses(importClassNames, filter);
                        processImports(configClass, currentSourceClass, importSourceClasses, filter, false);
                    }
                }
                else if (candidate.isAssignable(ImportBeanDefinitionRegistrar.class)) {
                    // Candidate class is an ImportBeanDefinitionRegistrar ->
                    // delegate to it to register additional bean definitions
                    Class<?> candidateClass = candidate.loadClass();
                    ImportBeanDefinitionRegistrar registrar =
                    ParserStrategyUtils.instantiateClass(candidateClass, ImportBeanDefinitionRegistrar.class,
                                                         this.environment, this.resourceLoader, this.registry);
                    configClass.addImportBeanDefinitionRegistrar(registrar, currentSourceClass.getMetadata());
                }
                else {
                    // Candidate class not an ImportSelector or ImportBeanDefinitionRegistrar ->
                    // process it as an @Configuration class
                    this.importStack.registerImport(
                        currentSourceClass.getMetadata(), candidate.getMetadata().getClassName());
                    processConfigurationClass(candidate.asConfigClass(configClass), filter);
                }
            }
        }
        catch (BeanDefinitionStoreException ex) {
            throw ex;
        }
        catch (Throwable ex) {
            throw new BeanDefinitionStoreException(
                "Failed to process import candidates for configuration class [" +
                configClass.getMetadata().getClassName() + "]: " + ex.getMessage(), ex);
        }
        finally {
            this.importStack.pop();
        }
    }
}
```

### 3. 三种Import类型的处理

- **ImportSelector类型**

如果候选类实现了 `ImportSelector` 接口，Spring会实例化该类并调用其 `selectImports()` 方法来动态确定要导入的类。

对于 `DeferredImportSelector`，会延迟处理直到所有配置类都处理完毕。

- **ImportBeanDefinitionRegistrar类型**

如果候选类实现了 `ImportBeanDefinitionRegistrar` 接口，Spring会将其添加到配置类中，稍后用于注册额外的bean定义。

- **普通配置类**

如果候选类既不是 `ImportSelector` 也不是 `ImportBeanDefinitionRegistrar`，则将其作为普通的配置类进行处理。

## @Configuration加与不加的区别

1. **使用层面的区别**

- `@Configuration`** 注解的作用**：

- 当一个类被 `@Configuration` 注解标记时，它表示这是一个配置类，Spring 容器会将其视为一个特殊的 Bean 定义来源。配置类通常用于定义 Bean 以及配置 Spring 应用程序的各种设置。例如：

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {
    @Bean
    public MyService myService() {
        return new MyService();
    }
}
```

- 在上述例子中，`AppConfig` 类被 `@Configuration` 注解标记，其中的 `myService` 方法使用 `@Bean` 注解定义了一个名为 `myService` 的 Bean。Spring 容器在启动时会扫描这个配置类，并将 `myService` 方法返回的实例注册为一个 Bean。
- 配置类中的方法可以相互调用，并且每次调用都会返回 Spring 容器中管理的同一个 Bean 实例，这是因为 Spring 会对配置类进行 CGLIB 代理，以确保 Bean 的单例性和方法调用的一致性。例如：

```java
@Configuration
public class AnotherConfig {
    @Bean
    public ComponentA componentA() {
        return new ComponentA(componentB());
    }

    @Bean
    public ComponentB componentB() {
        return new ComponentB();
    }
}
```

- 这里 `componentA` 方法调用了 `componentB` 方法，Spring 保证返回的 `ComponentB` 实例是同一个单例实例。

- **不加 **`@Configuration`** 的情况**：

- 如果一个类没有被 `@Configuration` 注解标记，但其中包含 `@Bean` 方法，这个类依然可以作为 Bean 定义的来源。不过，它不会被 Spring 视为配置类，而是普通的 Bean。
- 在这种情况下，类中的 `@Bean` 方法相互调用时，每次调用都会创建一个新的实例，而不是返回 Spring 容器管理的单例 Bean。例如：

```java
public class NonConfigClass {
    @Bean
    public ComponentC componentC() {
        return new ComponentC(componentD());
    }

    @Bean
    public ComponentD componentD() {
        return new ComponentD();
    }
}
```

- 这里 `componentC` 方法调用 `componentD` 方法时，每次都会创建一个新的 `ComponentD` 实例，这与配置类中方法调用返回单例实例的行为不同。

1. **源码层面的区别**

- `@Configuration`** 注解的处理**：

- Spring 在启动过程中，会通过 `ConfigurationClassPostProcessor` 来处理被 `@Configuration` 注解标记的类。`ConfigurationClassPostProcessor` 实现了 `BeanDefinitionRegistryPostProcessor` 接口，它会在所有其他 Bean 定义被加载之后执行。
- `ConfigurationClassPostProcessor` 的 `processConfigBeanDefinitions` 方法会扫描所有的 Bean 定义，找出被 `@Configuration` 注解标记的类。对于这些配置类，它会解析类中的 `@Bean` 方法等配置信息，并将其转换为 Spring 内部的 `BeanDefinition`。
- 为了实现配置类中方法调用返回单例 Bean 的特性，Spring 会为配置类创建 CGLIB 代理。在 `ConfigurationClassEnhancer` 类中，会对配置类进行增强，创建代理类。代理类会拦截方法调用，确保返回的是 Spring 容器中管理的单例 Bean。例如，当调用配置类中的 `@Bean` 方法时，代理类会从容器中获取对应的 Bean 实例，而不是直接执行方法创建新的实例。

- **非 **`@Configuration`** 类中 **`@Bean`** 方法的处理**：

- 对于没有被 `@Configuration` 注解标记但包含 `@Bean` 方法的类，Spring 同样会将其视为 Bean 定义的来源。`AnnotatedBeanDefinitionReader` 会处理这些类，解析其中的 `@Bean` 方法并注册对应的 `BeanDefinition`。
- 但是，由于这类类没有被当作配置类处理，Spring 不会为其创建 CGLIB 代理。所以，当类中的 `@Bean` 方法相互调用时，就会按照普通 Java 类的方法调用逻辑，每次调用都会创建新的实例。
