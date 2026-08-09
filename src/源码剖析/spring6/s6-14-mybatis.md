---
title: "14.Spring之整合Mybatis底层源码解析"
sidebarGroup: "Spring 6 源码"
shortTitle: "14.Spring之整合Mybatis底层源码解析"
order: 14
date: 2025-09-28
category: "源码剖析"
tag:
  - "Spring 6"
  - "源码"
description: "14.Spring之整合Mybatis底层源码解析"
---

> 来源：[14.Spring之整合Mybatis底层源码解析](https://www.yuque.com/geren-t8lyq/ru879g/yvhfv7faqx4dgv7h)

在线笔记：

[https://www.yuque.com/geren-t8lyq/ru879g/yvhfv7faqx4dgv7h?singleDoc#](https://www.yuque.com/geren-t8lyq/ru879g/yvhfv7faqx4dgv7h?singleDoc#)

完整流程图：

[https://www.processon.com/view/link/5f153429e401fd2e0deefd01](https://www.processon.com/view/link/5f153429e401fd2e0deefd01)

手写代码：

[https://github.com/xulisha123/spring6.2.9/tree/main/tuling/src/main/java/com/xushu/mybatis/real/mock](https://github.com/xulisha123/spring6.2.9/tree/main/tuling/src/main/java/com/xushu/mybatis/real/mock)

## 前言

spring整合myabtis无非就是，把@Mapper修饰的接口扫描到容器中，但spring中接口是不能呗扫描成为bean定义的，还有spring中connection与mybatis中connection的整合无非就是同一个线程spring生成的connection放到ThreadLocal中，mybatis用到时直接从中取保证了同一个业务方法中spring的连接与Mybatis时同一个。（此文只针对相应的@Mapper接口扫描beandefinition）

## 手写Spring整合mybatis

### 如何把@Mapper接口扫描到容器中

（1） spring中接口是不能扫描成bean定义的，而且bean定义的class肯定不能设置为接口类型，因接口不能实例化。spring提供了FactoryBean,因此我们可以在生成bean定义的时候指定beanClass为FactoryBean类型当getObject时根据当前接口生成代理对象

看下伪代码：

```java

public class MybatisFactoryBean implements FactoryBean {

    private Class  classInterface;

    public MybatisFactoryBean(Class<?> classInterface) {
        this.classInterface = classInterface;
    }

    @Override
    public Object getObject() throws Exception {
        return  生成相应代理对象；
    }

    @Override
    public Class<?> getObjectType() {
        return classInterface;
    }
}

///  扫描无非就是把没过bean定义的先把构造参数设置当前的接口的，再把beanClass设置FactoryBean类型因为需要实例化
GenericBeanDefinition beanDefinition = (GenericBeanDefinition) beanDefinitionHolder.getBeanDefinition();
beanDefinition.getConstructorArgumentValues().addGenericArgumentValue(beanDefinition.getBeanClassName());
beanDefinition.setBeanClassName(MybatisFactoryBean.class.getName());
beanDefinition.setAutowireMode(AbstractBeanDefinition.AUTOWIRE_BY_TYPE);
```

生成代理对象mybatis中sqlSession.getMapper(classInterface);

所以FactoryBean需要有SqlSession属性

```java

public class MybatisFactoryBean implements FactoryBean {

    private Class  classInterface;

    private DefaultSqlSession sqlSession;
	//设置by_type注入会扫描所有set方法进行注入不多做解释
    public void setSqlSession(SqlSessionFactory sqlSessionFactory) {
        this.sqlSession = (DefaultSqlSession)sqlSessionFactory.openSession();
        //此处必须把这个接口加入进来负责报错
        sqlSession.getConfiguration().addMapper(classInterface);
    }

    public MybatisFactoryBean(Class<?> classInterface) {
        this.classInterface = classInterface;
    }

    @Override
    public Object getObject() throws Exception {
        return  sqlSession.getMapper(classInterface);
    }

    @Override
    public Class<?> getObjectType() {
        return classInterface;
    }
}
```

因SqlSessionFactory 需要在容器中

### SqlSessionFactory 需要交给spring容器

```java
@ComponentScan("com.spring.demo.component")
@Configuration
@MapperScan("com.spring.demo.mybatis")
public class ApplicationConfig {

	@Bean
	public SqlSessionFactory sqlSessionFactory() throws IOException {
			InputStream inputStream = Resources.getResourceAsStream("mybatis.xml");
			SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(inputStream);
			return sqlSessionFactory;
	}

}
```

mybatis配置文件：

```java

<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE configuration
        PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration>
    <environments default="development">
        <environment id="development">
            <transactionManager type="JDBC"/>
            <dataSource type="POOLED">
                <property name="driver" value="com.mysql.cj.jdbc.Driver"/>
                <property name="url" value="jdbc:mysql://localhost:3306/test_db?useUnicode=true&amp;useJDBCCompliantTimezoneShift=true&amp;useLegacyDatetimeCode=false&amp;serverTimezone=UTC"/>
                <property name="username" value="root"/>
                <property name="password" value="123456"/>
            </dataSource>
        </environment>
    </environments>
</configuration>
```

### 考虑如何把接口扫描成bean定义呢

先来了解下 spring中扫描bean定义：

1、org.springframework.context.annotation.ClassPathBeanDefinitionScanner#doScan

2、org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider#findCandidateComponents

3、org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider#scanCandidateComponents

```java

private Set<BeanDefinition> scanCandidateComponents(String basePackage) {
		Set<BeanDefinition> candidates = new LinkedHashSet<>();
		try {
			String packageSearchPath = ResourcePatternResolver.CLASSPATH_ALL_URL_PREFIX +
					resolveBasePackage(basePackage) + '/' + this.resourcePattern;
			Resource[] resources = getResourcePatternResolver().getResources(packageSearchPath);
			boolean traceEnabled = logger.isTraceEnabled();
			boolean debugEnabled = logger.isDebugEnabled();
			for (Resource resource : resources) {
				if (traceEnabled) {
					logger.trace("Scanning " + resource);
				}
				try {
					MetadataReader metadataReader = getMetadataReaderFactory().getMetadataReader(resource);
					//1此处就是改造关键点
					if (isCandidateComponent(metadataReader)) {
						ScannedGenericBeanDefinition sbd = new ScannedGenericBeanDefinition(metadataReader);
						sbd.setSource(resource);
						//2、此处会把接口类型过滤掉
						if (isCandidateComponent(sbd)) {
							if (debugEnabled) {
								logger.debug("Identified candidate component class: " + resource);
							}
							candidates.add(sbd);
						}
					}
				}

		return candidates;
	}

	protected boolean isCandidateComponent(AnnotatedBeanDefinition beanDefinition) {
		AnnotationMetadata metadata = beanDefinition.getMetadata();
		return (metadata.isIndependent() && (metadata.isConcrete() ||
				(metadata.isAbstract() && metadata.hasAnnotatedMethods(Lookup.class.getName()))));
	}

	protected boolean isCandidateComponent(MetadataReader metadataReader) throws IOException {
	 
		for (TypeFilter tf : this.excludeFilters) {
			if (tf.match(metadataReader, getMetadataReaderFactory())) {
				return false;
			}
		}
		//此处扫描只会this.includeFilters.add(new AnnotationTypeFilter(Component.class));@Componet注解的bean
		for (TypeFilter tf : this.includeFilters) {
			if (tf.match(metadataReader, getMetadataReaderFactory())) {
				return isConditionMatch(metadataReader);
			}
		}
		return false;
	}
```

因此我们自定义扫描器肯定需要把1、不是@Component注解修饰的也需要扫描进来，2、还要把接口类行不要过滤掉

为了方便自定义扫描器继承ClassPathBeanDefinitionScanner只需要把上面注释中的1、2两处重写即可

```java

public class MybatisMapperScan extends ClassPathBeanDefinitionScanner {

    public MybatisMapperScan(BeanDefinitionRegistry registry) {
        super(registry);
    }

    @Override
    protected Set<BeanDefinitionHolder> doScan(String... basePackages) {
        Set<BeanDefinitionHolder> beanDefinitionHolders = super.doScan(basePackages);

        for (BeanDefinitionHolder beanDefinitionHolder : beanDefinitionHolders) {
            GenericBeanDefinition beanDefinition = (GenericBeanDefinition) beanDefinitionHolder.getBeanDefinition();
            beanDefinition.getConstructorArgumentValues().addGenericArgumentValue(beanDefinition.getBeanClassName());
            beanDefinition.setBeanClassName(MybatisFactoryBean.class.getName());
            beanDefinition.setAutowireMode(AbstractBeanDefinition.AUTOWIRE_BY_TYPE);
        }

        return beanDefinitionHolders;
    }

    @Override//把接口类型放开
    protected boolean isCandidateComponent(AnnotatedBeanDefinition beanDefinition) {
        AnnotationMetadata metadata = beanDefinition.getMetadata();
        return metadata.isInterface();
    }
}

public class MybatisImportBeanDefinitionRegistrar implements ImportBeanDefinitionRegistrar {

    public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
      Map<String,Object> mapScan=  importingClassMetadata.getAnnotationAttributes(MapperScan.class.getName());
      String value= (String) mapScan.get("value");
      MybatisMapperScan mybatisMapperScan=new MybatisMapperScan(registry);
      //2、添加过滤条件此处把所有条件都放开，spring中此处之后把@Copmonet注解放开，此处后续可以改造只扫描@Mapper注解的放开
      mybatisMapperScan.addIncludeFilter(new TypeFilter(){

            @Override
            public boolean match(MetadataReader metadataReader, MetadataReaderFactory metadataReaderFactory) throws IOException {
                return true;
            }
        });
        mybatisMapperScan.doScan(value);
    }
}
```

何时会触发这个扫描器呢？

ImportBeanDefinitionRegistrar接口Spring启动时候调用该接口的registerBeanDefinitions（）因此我们只需在配置类上导入该类即可

```java

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@Import(MybatisImportBeanDefinitionRegistrar.class)
public @interface MapperScan {
     String value() default "";
}

@ComponentScan("com.spring.demo.component")
@Configuration
@MapperScan("com.spring.demo.mybatis")
public class ApplicationConfig {

	@Bean
	public SqlSessionFactory sqlSessionFactory() throws IOException {
			InputStream inputStream = Resources.getResourceAsStream("mybatis.xml");
			SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(inputStream);
			return sqlSessionFactory;
	}

}
```

一切准备就绪测试（注意我的TestMapper接口没有加@Mapper注解因为上面代码过滤中会把所有类都扫描到，此处可以扩展，即加上@Mapper，上面过滤条件只扫描带此注解的）：

```java

public interface TestMapper {
    @Select("select 'hello' from  dual ")
    String select();
}

@Component
public class UserService {

    @Autowired
    private TestMapper testMapper;

    public void hello(){
        System.out.println(testMapper.select());
    }

}
```

二、代码demo路径

[https://github.com/kangchangchang/SpringMybatis.git](https://github.com/kangchangchang/SpringMybatis.git)

## Mybatis-Spring 1.3.2版本底层源码执行流程

1. 通过@MapperScan导入了MapperScannerRegistrar类
2. MapperScannerRegistrar类实现了ImportBeanDefinitionRegistrar接口，所以Spring在启动时会调用MapperScannerRegistrar类中的registerBeanDefinitions方法
3. 在registerBeanDefinitions方法中定义了一个ClassPathMapperScanner对象，用来扫描mapper
4. 设置ClassPathMapperScanner对象可以扫描到接口，因为在Spring中是不会扫描接口的
5. 同时因为ClassPathMapperScanner中重写了isCandidateComponent方法，导致isCandidateComponent只会认为接口是备选者Component
6. 通过利用Spring的扫描后，会把接口扫描出来并且得到对应的BeanDefinition
7. 接下来把扫描得到的BeanDefinition进行修改，把BeanClass修改为MapperFactoryBean，把AutowireMode修改为byType
8. 扫描完成后，Spring就会基于BeanDefinition去创建Bean了，相当于每个Mapper对应一个FactoryBean
9. 在MapperFactoryBean中的getObject方法中，调用了getSqlSession()去得到一个sqlSession对象，然后根据对应的Mapper接口生成一个Mapper接口代理对象，这个代理对象就成为Spring容器中的Bean
10. sqlSession对象是Mybatis中的，一个sqlSession对象需要SqlSessionFactory来产生
11. MapperFactoryBean的AutowireMode为byType，所以Spring会自动调用set方法，有两个set方法，一个setSqlSessionFactory，一个setSqlSessionTemplate，而这两个方法执行的前提是根据方法参数类型能找到对应的bean，所以Spring容器中要存在SqlSessionFactory类型的bean或者SqlSessionTemplate类型的bean。
12. 如果你定义的是一个SqlSessionFactory类型的bean，那么最终也会被包装为一个SqlSessionTemplate对象，并且赋值给sqlSession属性
13. 而在SqlSessionTemplate类中就存在一个getMapper方法，这个方法中就产生一个Mapper接口代理对象
14. 到时候，当执行该代理对象的某个方法时，就会进入到Mybatis框架的底层执行流程，详细的请看下图

Spring整合Mybatis流程：

[https://www.processon.com/view/link/5f153429e401fd2e0deefd01?cid=5f153429f346fb2bfb3061bc](https://www.processon.com/view/link/5f153429e401fd2e0deefd01?cid=5f153429f346fb2bfb3061bc)

## Mybatis-Spring  2.0.6版本(最新版)底层源码执行流程

1. 通过@MapperScan导入了MapperScannerRegistrar类
2. MapperScannerRegistrar类实现了ImportBeanDefinitionRegistrar接口，所以Spring在启动时会调用MapperScannerRegistrar类中的registerBeanDefinitions方法
3. **在registerBeanDefinitions方法中注册一个MapperScannerConfigurer类型的BeanDefinition**
4. 而MapperScannerConfigurer实现了BeanDefinitionRegistryPostProcessor接口，所以Spring在启动过程中时会调用它的postProcessBeanDefinitionRegistry()方法
5. 在postProcessBeanDefinitionRegistry方法中会生成一个ClassPathMapperScanner对象，然后进行扫描
6. 后续的逻辑和1.3.2版本一样。

带来的好处是，可以不使用@MapperScan注解，而可以直接定义一个Bean，比如：

```java
@Bean
public MapperScannerConfigurer mapperScannerConfigurer() {
	MapperScannerConfigurer mapperScannerConfigurer = new MapperScannerConfigurer();
	mapperScannerConfigurer.setBasePackage("com.luban");
	return mapperScannerConfigurer;
}
```
