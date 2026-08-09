---
title: "快速生成数据库表映射工具-Screw"
sidebarGroup: "综合篇"
shortTitle: "快速生成数据库表映射工具-Screw"
order: 144
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "本篇文章主要是帮助还在手工维护数据库表关系的老爷们，直接进入主题：screw 特点简洁、轻量、设计良好。不需要 powerdesigner 这种重量的建模工具多数据库支持 。支持市面常见的数据库类型 MySQL、Oracle、SqlServ"
article: false
---

> 来源：[快速生成数据库表映射工具-Screw](https://www.yuque.com/tulingzhouyu/db22bv/mengqwt50gtu2ek5)

![image](/面试题/综合篇/0144-quick-build-database-table-mapping-tool-screw/img-8096c6a6f5c7.png)

本篇文章主要是帮助还在手工维护数据库表关系的老爷们，直接进入主题：

## screw 特点

- 简洁、轻量、设计良好。不需要 powerdesigner 这种重量的建模工具
- 多数据库支持 。支持市面常见的数据库类型 MySQL、Oracle、SqlServer
- 多种格式文档。支持 MD、HTML、WORD 格式
- 灵活扩展。支持用户自定义模板和展示样式

## 支持数据库类型

- [✔️] MySQL
- [✔️] MariaDB
- [✔️] TIDB
- [✔️] Oracle
- [✔️] SqlServer
- [✔️] PostgreSQL
- [✔️] Cache DB

## 生成文档类型

- [✔️] Html
- [✔️] Word
- [✔️] Markdown

## 代码

用 springboot3 + jdk17 进行测试。

```java
&lt;?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    &lt;modelVersion&gt;4.0.0&lt;/modelVersion&gt;
    &lt;parent&gt;
        &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
        &lt;artifactId&gt;spring-boot-starter-parent&lt;/artifactId&gt;
        &lt;version&gt;3.2.5&lt;/version&gt;
        &lt;relativePath/&gt; &lt;!-- lookup parent from repository --&gt;
    &lt;/parent&gt;
    &lt;groupId&gt;com.baiLi.screw&lt;/groupId&gt;
    &lt;artifactId&gt;screwDemo&lt;/artifactId&gt;
    &lt;version&gt;1.0.0&lt;/version&gt;
    &lt;name&gt;screwDemo&lt;/name&gt;
    &lt;description&gt;screwDemo&lt;/description&gt;
    &lt;properties&gt;
        <java.version>17</java.version>
    &lt;/properties&gt;
    &lt;dependencies&gt;
        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-starter-jdbc&lt;/artifactId&gt;
        &lt;/dependency&gt;

        &lt;dependency&gt;
            &lt;groupId&gt;com.mysql&lt;/groupId&gt;
            &lt;artifactId&gt;mysql-connector-j&lt;/artifactId&gt;
            &lt;scope&gt;runtime&lt;/scope&gt;
        &lt;/dependency&gt;

        &lt;dependency&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-starter-test&lt;/artifactId&gt;
            &lt;scope&gt;test&lt;/scope&gt;
        &lt;/dependency&gt;

        &lt;dependency&gt;
            &lt;groupId&gt;cn.smallbun.screw&lt;/groupId&gt;
            &lt;artifactId&gt;screw-core&lt;/artifactId&gt;
            &lt;version&gt;1.0.5&lt;/version&gt;
        &lt;/dependency&gt;

        &lt;dependency&gt;
            &lt;groupId&gt;com.zaxxer&lt;/groupId&gt;
            &lt;artifactId&gt;HikariCP&lt;/artifactId&gt;
            &lt;version&gt;5.1.0&lt;/version&gt;
        &lt;/dependency&gt;
    &lt;/dependencies&gt;

    &lt;build&gt;
        &lt;plugins&gt;
            &lt;plugin&gt;
                &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
                &lt;artifactId&gt;spring-boot-maven-plugin&lt;/artifactId&gt;
            &lt;/plugin&gt;
        &lt;/plugins&gt;
    &lt;/build&gt;

&lt;/project&gt;
```

```java
@Test
void document() {
    //数据源
    HikariConfig hikariConfig = new HikariConfig();
    hikariConfig.setDriverClassName("com.mysql.cj.jdbc.Driver");
    hikariConfig.setJdbcUrl("jdbc:mysql://localhost:3306/sys");
    hikariConfig.setUsername("root");
    hikariConfig.setPassword("1qaz@WSX");
    //设置可以获取tables remarks信息
    hikariConfig.addDataSourceProperty("useInformationSchema", "true");
    hikariConfig.setMinimumIdle(2);
    hikariConfig.setMaximumPoolSize(5);
    DataSource dataSource = new HikariDataSource(hikariConfig);
    //生成配置
    String fileOutputDir = "C:\\Users\\Desktop\\screw_word";
    EngineConfig engineConfig = EngineConfig.builder()
            //生成文件路径
            .fileOutputDir(fileOutputDir)
            //打开目录
            .openOutputDir(true)
            //文件类型
            .fileType(EngineFileType.HTML)
            //生成模板实现
            .produceType(EngineTemplateType.freemarker)
            //自定义文件名称
            .fileName("screw_mysql").build();

    //忽略表
    ArrayList&lt;String&gt; ignoreTableName = new ArrayList<>();
    ignoreTableName.add("test_user");
    ignoreTableName.add("test_group");
    //忽略表前缀
    ArrayList&lt;String&gt; ignorePrefix = new ArrayList<>();
    ignorePrefix.add("test_");
    //忽略表后缀
    ArrayList&lt;String&gt; ignoreSuffix = new ArrayList<>();
    ignoreSuffix.add("_test");
    ProcessConfig processConfig = ProcessConfig.builder()
            //指定生成逻辑、当存在指定表、指定表前缀、指定表后缀时，将生成指定表，其余表不生成、并跳过忽略表配置
            //根据名称指定表生成
//                .designatedTableName(new ArrayList<>())
            //根据表前缀生成
//                .designatedTablePrefix(new ArrayList<>())
            //根据表后缀生成
//                .designatedTableSuffix(new ArrayList<>())
            //忽略表名
            .ignoreTableName(ignoreTableName)
            //忽略表前缀
            .ignoreTablePrefix(ignorePrefix)
            //忽略表后缀
            .ignoreTableSuffix(ignoreSuffix).build();
    //配置
    Configuration config = Configuration.builder()
            //版本
            .version("1.0.0")
            //描述
            .description("数据库设计文档生成")
            //数据源
            .dataSource(dataSource)
            //生成配置
            .engineConfig(engineConfig)
            //生成配置
            .produceConfig(processConfig)
            .build();
    //执行生成
    new DocumentationExecute(config).execute();
}
```

## 数据库数据截图

![image](/面试题/综合篇/0144-quick-build-database-table-mapping-tool-screw/img-3c984d510420.png)

## 生成文档截图

![image](/面试题/综合篇/0144-quick-build-database-table-mapping-tool-screw/img-eb582407c857.png)

![image](/面试题/综合篇/0144-quick-build-database-table-mapping-tool-screw/img-ecfc12ae82cb.png)
