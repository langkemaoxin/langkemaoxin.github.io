---
title: "调试 MyBatis 源码：从「能编译」到「能 Step Into」的完整复盘"
sidebarGroup: "源码调试"
shortTitle: "MyBatis 源码调试"
order: 1
date: 2026-07-02
category: "Java"
tag:
  - "MyBatis"
  - "Java"
  - "Maven"
  - "IntelliJ IDEA"
  - "源码调试"
  - "问题解决"
---

## 开头：表面问题 vs 真实问题

表面上的目标很简单：把图灵徐庶的 MyBatis 源码学习工程编译好，达到可运行状态。

实际跑下来，目标逐渐变成了：

> 运行 `mybatis-tuling` 里的 `App` 时，能在 IDEA 里 **Step Into** 进入 `mybatis-3.5.3` 的 `.java` 源码，而不是只能看到反编译后的 `.class`。

这两个目标看起来相关，但难度差了一个量级：

| 目标 | 需要满足的条件 |
|------|----------------|
| 能编译 | Maven + JDK 8 + 本地 install |
| 能运行 | 数据库配置正确 |
| **能调试源码** | IDEA 必须把依赖解析为**同工程模块**，而不是本地仓库 jar |

很多「源码学习项目跑不起来」的问题，其实卡在第三层。

---

## 一、项目结构：三个独立 Maven 模块

这个仓库**没有根 `pom.xml`**，三个子目录各自是独立 Maven 工程：

```text
mybatis-3-5.3.x/
├── mybatis-3.5.3/      # MyBatis 核心源码（3.5.3-xsls）
├── mybatis-spring/     # Spring 整合源码
└── mybatis-tuling/     # 自定义测试代码，入口 App.java
```

这意味着：

1. Maven 不会自动按顺序构建
2. IDEA 不一定把它们识别为「同一个工程内的关联模块」
3. `mybatis-tuling` 依赖的 `org.mybatis:mybatis:3.5.3-xsls` 在阿里云、私服里都**不存在**

第一次编译 `mybatis-tuling` 时的报错非常典型：

```text
Could not find artifact org.mybatis:mybatis:jar:3.5.3-xsls
```

`-xsls` 是自定义版本号，只存在于本地源码工程，必须先：

```bash
cd mybatis-3.5.3
mvn clean install -DskipTests
```

把自定义版本安装到本地 Maven 仓库，`mybatis-tuling` 才能编译。

---

## 二、JDK 版本：第一个硬阻塞

环境信息：

- 系统默认 **JDK 17**
- Maven 3.9.9
- 项目基于 MyBatis 3.5.x，parent 是 `mybatis-parent:31`

用 JDK 17 编译 `mybatis-3.5.3` 时，源码能编过，但在打包阶段失败：

```text
Failed to execute goal org.apache.felix:maven-bundle-plugin:4.1.0:manifest
...
ConcurrentModificationException
```

切换到 **JDK 8** 后，同一命令 **BUILD SUCCESS**。

**经验**：老版本 MyBatis 源码工程，优先用 **JDK 8** 构建；IDEA 的 **Project SDK** 也建议设为 1.8，和 Maven 保持一致。

---

## 三、mybatis-tuling 的编译问题

### 1. GBK 编码警告

`mybatis-tuling` 源码里有中文注释，但 `pom.xml` 没指定 UTF-8，Windows 下 Maven 默认 GBK，出现：

```text
编码GBK的不可映射字符
```

解决：在 `pom.xml` 里补：

```xml
<project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
<maven.compiler.source>1.8</maven.compiler.source>
<maven.compiler.target>1.8</maven.compiler.target>
```

### 2. 数据库配置

`db.properties` 里有两个隐蔽问题：

```properties
# 问题1：端口写错
mysql.jdbcUrl=jdbc:mysql://localhost:3310/mybatis_example

# 问题2：等号后面有空格
mysql.user= root
mysql.password= 123456
```

本机 MySQL 实际监听 **3306**，等号后空格会让用户名/密码带上空格，导致连接异常。这类问题不影响「调试源码」，但会让 `App` 运行失败，容易误判为 MyBatis 配置问题。

---

## 四、核心难题：Maven 能跑，IDEA 却进不了源码

编译、install 都成功后，`App` 已经能跑进 MyBatis 调用链（栈里能看到 `DefaultSqlSession`、`BaseExecutor` 等），但 IDEA 里 **Ctrl + 点击** `SqlSessionFactoryBuilder`，仍然打开的是：

```text
// Decompiled .class file, bytecode version: 52.0
```

### 用户侧尝试过的方案

1. Maven → Importing → 勾选 **Automatically download Sources**
2. **Sync All Maven Projects**（新版 IDEA 叫 Sync，不是 Reload）

仍然无效。

### 为什么 Download Sources 不够

对这类项目，Sources 不够用的根本原因是：

| 场景 | Download Sources 能否解决 |
|------|---------------------------|
| 依赖中央仓库里的 `mybatis:3.5.9` | 可以 |
| 依赖**本仓库修改过的** `3.5.3-xsls` | 往往不行 |

即使本地仓库有 `mybatis-3.5.3-xsls-sources.jar`，IDEA 也可能：

- 仍优先绑定 jar 里的 class
- 没把 jar 和同目录下的 `.java` 工程关联起来
- 你改源码后，调试走的还是旧 class

**学源码要的是「改完 → 编译 → 立刻调试」，不是「只读 attached sources」。**

---

## 五、最终解决方案：让 IDEA 走模块依赖，而不是 jar 依赖

### 1. 新增根聚合 `pom.xml`

```xml
<packaging>pom</packaging>
<modules>
    <module>mybatis-3.5.3</module>
    <module>mybatis-spring</module>
    <module>mybatis-tuling</module>
</modules>
```

作用：IDEA 从一个根工程导入，更容易识别模块间关系。

### 2. mybatis 依赖改为 `provided`

`mybatis-tuling/pom.xml`：

```xml
<dependency>
    <groupId>org.mybatis</groupId>
    <artifactId>mybatis</artifactId>
    <version>3.5.3-xsls</version>
    <scope>provided</scope>
</dependency>
```

`provided` 的含义：

- **编译期**：仍可用 mybatis 的类
- **运行时**：不强制从 Maven 仓库拉 jar
- **IDEA**：更容易改用模块 classpath

### 3. 配置 IDEA 模块依赖（关键）

`mybatis-tuling.iml` 中增加：

```xml
<orderEntry type="module" module-name="mybatis" exported="" />
```

并创建 `mybatis.iml`，把 `mybatis-3.5.3/src/main/java` 注册为源码目录。

### 4. 备用：本地源码库

`.idea/libraries/mybatis_local_debug.xml`：

```xml
<library name="mybatis-local-debug">
  <CLASSES>
    <root url="file://$PROJECT_DIR$/mybatis-3.5.3/target/classes" />
  </CLASSES>
  <SOURCES>
    <root url="file://$PROJECT_DIR$/mybatis-3.5.3/src/main/java" />
  </SOURCES>
</library>
```

即使 Maven Sync 覆盖了部分配置，这个库也能保证 class 和源码路径明确绑定。

### 5. 清理冲突配置

发现 `mybatis-tuling/.idea/` 嵌套了一套 IDEA 配置，且 SDK 是 **JDK 25**，与根工程 JDK 1.8 冲突。

**必须打开根目录** `mybatis-3-5.3.x`，不能只打开 `mybatis-tuling` 子目录。删除嵌套 `.idea` 后，问题明显缓解。

---

## 六、完整执行时间线

```text
1. 分析项目结构 → 三个独立 Maven 模块，无根 pom
2. JDK 17 构建 mybatis-3.5.3 → bundle-plugin 失败
3. 切换 JDK 8 → mybatis install 成功
4. mybatis-tuling 编译 → 缺依赖、GBK 编码问题
5. 修复 pom 编码、db.properties 端口和空格
6. App 能跑进 MyBatis 调用链，但 IDEA 只能看反编译 class
7. 尝试 Download Sources + Sync Maven → 无效
8. 新增根 pom、provided 依赖、iml 模块依赖、本地源码库
9. 删除 mybatis-tuling/.idea 冲突配置
10. Ctrl + 点击能进 .java，Debug 可 Step Into → 成功
```

---

## 七、验证是否成功的三个检查点

### 检查点 1：模块依赖

**File → Project Structure → Modules → mybatis-tuling → Dependencies**

应能看到 **`mybatis` 模块**（不是只有 `Maven: org.mybatis:mybatis:3.5.3-xsls` jar）。

### 检查点 2：源码跳转

在 `App.java` 里 **Ctrl + 点击** `SqlSessionFactoryBuilder`，应跳到：

```text
mybatis-3.5.3/src/main/java/org/apache/ibatis/session/SqlSessionFactoryBuilder.java
```

### 检查点 3：断点调试

在 `SqlSessionFactoryBuilder.build()` 打断点，Debug 运行 `App`，应能 Step Into 进入 MyBatis 源码。

---

## 八、推荐调试路径（配合 App.java）

`App` 的主线调用链：

```text
App.main
  → SqlSessionFactoryBuilder.build()        # 解析 XML
  → DefaultSqlSessionFactory.openSession()
  → session.selectOne(...)
  → CachingExecutor / SimpleExecutor
  → JDBC
```

建议断点：

1. `SqlSessionFactoryBuilder.build()`
2. `DefaultSqlSession.selectOne()`
3. `SimpleExecutor.doQuery()`

---

## 九、可复用的经验模型

以后遇到「本地源码工程 + 测试模块 + IDEA 调试不进源码」，可以按这个顺序排查：

```text
1. 构建层：JDK 版本对不对？自定义 artifact 有没有 install 到本地仓库？
2. 依赖层：测试模块能不能解析到源码工程的 jar？
3. 工程层：有没有根 pom？IDEA 是不是只导入了子模块？
4. IDE 层：依赖是 jar 还是 module dependency？
5. 配置层：有没有嵌套 .idea / 错误 SDK 的子工程？
6. 运行层：数据库等外部依赖是否导致误判？
```

一句话总结：

> **学框架源码，目标不是「把 jar 跑起来」，而是「让 IDE 的运行 classpath 指向你正在编辑的那份源码」。**

Download Sources 适合**读**第三方库；**改**同仓库源码并调试，要靠 **Maven 多模块 + IDEA 模块依赖**。

---

## 十、最终构建命令（备忘）

```powershell
$env:JAVA_HOME="H:\develop\Java\jdk1.8"
$env:PATH="H:\develop\Java\jdk1.8\bin;$env:PATH"

cd E:\DeepLearningProject\Java\mybatis-3-5.3.x
mvn clean install -DskipTests -pl mybatis-3.5.3,mybatis-tuling -am
```

IDEA 中：

1. 打开根目录 `mybatis-3-5.3.x`
2. **Sync All Maven Projects**
3. 运行配置选 **App (Debug MyBatis)**
4. 改完 MyBatis 源码后，先 **Rebuild Module 'mybatis'**，再 Debug
