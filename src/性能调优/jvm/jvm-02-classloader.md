---
title: "Java 类加载机制"
sidebarGroup: "JVM"
shortTitle: "02 类加载机制"
order: 2
date: 2026-09-03
category: "性能调优"
tag:
  - "性能调优"
  - "JVM"
description: "从双亲委派、沙箱到自定义加载器、热加载与 SPI，用实战案例串起类加载全貌。"
---

> **JVM 系列 · 第 2/12 篇**  
> 上一篇：[《全面理解 JVM 虚拟机》](/性能调优/jvm/jvm-01-overview) · 下一篇：[《JVM 内存模型深度剖析与优化》](/性能调优/jvm/jvm-03-memory-model)

---

## 开头：Class 文件的「门卫」

我们写的 `.class` 必须经过**类加载器**进入 JVM 才能执行。类加载是少数能在 Java 代码层扩展的 JVM 能力之一——规则引擎外置 JAR、代码加密、Tomcat 多应用隔离、Spring Boot SPI，底层都绕不开它。

本篇先用 JDK 8 体系把机制讲清，再用一条「工资计算」故事线串起：**外置 JAR、混淆、热加载、打破双亲委派、SPI 替代反射**。

---

## 一、JDK 8 类加载体系

三句话总结：

1. **类缓存**：每个类加载器对加载过的类保留缓存。
2. **双亲委派**：向上委托查找，向下委托加载。
3. **沙箱保护**：不允许应用加载/覆盖 JDK 核心类。

### 1.1 三层加载器与 Demo

```java
public class LoaderDemo {
    public static String a = "aaa";

    public static void main(String[] args) throws ClassNotFoundException {
        // AppClassLoader <- ExtClassLoader <- Bootstrap（Bootstrap 为 null）
        ClassLoader cl1 = LoaderDemo.class.getClassLoader();
        System.out.println("cl1 > " + cl1);
        System.out.println("parent of cl1 > " + cl1.getParent());
        System.out.println("grant parent of cl1 > " + cl1.getParent().getParent());

        ClassLoader cl2 = String.class.getClassLoader();
        System.out.println("cl2 > " + cl2); // null，Bootstrap 加载

        System.out.println(cl1.loadClass("java.util.List").getClass().getClassLoader());

        System.out.println("Bootstrap: " + System.getProperty("sun.boot.class.path"));
        System.out.println("Extension: " + System.getProperty("java.ext.dirs"));
        System.out.println("App classpath: " + System.getProperty("java.class.path"));
    }
}
```

启动时可加 `-verbose:class` 观察加载过程。

![JDK 8 类加载器层次（对象关系与类继承）](/性能调优/jvm-02-classloader/p002-01.png)

- **Bootstrap ClassLoader**：C++ 实现，加载 `lib/rt.jar` 等核心库；Java 中 `getParent()` 为 null。
- **ExtClassLoader**：扩展目录，`-Djava.ext.dirs` 可指定。
- **AppClassLoader**：`CLASSPATH`，应用 JAR 与 classes。

左侧是**运行时实例**的父子链，右侧是 `ClassLoader` **继承体系**——自定义加载器通常继承 `ClassLoader` / `SecureClassLoader` / `URLClassLoader`。

### 1.2 双亲委派：`loadClass` 核心

```java
protected Class<?> loadClass(String name, boolean resolve)
        throws ClassNotFoundException {
    synchronized (getClassLoadingLock(name)) {
        Class<?> c = findLoadedClass(name);
        if (c == null) {
            try {
                if (parent != null) {
                    c = parent.loadClass(name, false);
                } else {
                    c = findBootstrapClassOrNull(name);
                }
            } catch (ClassNotFoundException e) {
                // 父加载器找不到，继续
            }
            if (c == null) {
                c = findClass(name);  // 子加载器自己解析 class
            }
        }
        if (resolve) {
            resolveClass(c);
        }
        return c;
    }
}
```

流程：**先查缓存 → 委派父加载器 → 父找不到则 `findClass`**。

![双亲委派：向上查找、向下加载](/性能调优/jvm-02-classloader/p004-01.png)

该方法是 **protected**，子类可重写——**双亲委派可以被打破**（Tomcat、SPI、OSGi 等）。

### 1.3 沙箱保护

除委派外，`ClassLoader.preDefineClass` 禁止自定义 `java.*` 包名：

```java
if ((name != null) && name.startsWith("java.")) {
    throw new SecurityException("Prohibited package name: " + ...);
}
```

这也是历史上大量 **`javax.*`** 扩展包存在的原因之一。

### 1.4 Linking：验证、准备、解析

`loadClass` 在 `resolve=true` 时会 **link**。准备阶段给 static 字段**默认零值**，初始化阶段才赋程序员指定的值。

```java
class Apple {
    static Apple apple = new Apple(10);
    static double price = 20.00;
    double totalpay;

    public Apple(double discount) {
        System.out.println("====" + price);
        totalpay = price - discount;
    }
}

public class PriceTest01 {
    public static void main(String[] args) {
        System.out.println(Apple.apple.totalpay); // -10.0，不是 10.0
    }
}
```

访问 `Apple.apple` 触发类初始化；构造 `Apple(10)` 时 `price` 仍在准备阶段（0.0），故 `totalpay = 0 - 10 = -10`。

![类加载 Linking 三阶段](/性能调优/jvm-02-classloader/p005-01.png)

**符号引用 vs 直接引用**：链接前指向类的引用无具体地址；解析完成后指向真实内存。

**为何 `loadClass(name, false)` 常传 false？** 运行时动态加载往往希望延迟解析/初始化，由后续 `newInstance` 或首次主动使用再触发 `<clinit>`。

---

## 二、外置 JAR：URLClassLoader

场景：把「算工资」逻辑抽到独立 JAR，主工程通过 `URLClassLoader` 加载。

```java
URL jarPath = new URL("file:/path/to/SalaryCaler.jar");
URLClassLoader urlClassLoader = new URLClassLoader(new URL[] { jarPath });

Class<?> clazz = urlClassLoader.loadClass("com.example.SalaryCaler");
Object obj = clazz.newInstance();
Double money = (Double) clazz.getMethod("cal", Double.class).invoke(obj, salary);
```

**适用场景**：流程固定、规则常变的模块——审批规则、订单状态机、规则引擎（Drools 可从 Maven 仓库拉规则文件）。

**JAR 放哪**：本地路径、`file:` URL，或 HTTP 远程 JAR（`URLClassLoader` 支持）。

---

## 三、自定义类加载器：混淆 Class

标准 JVM 只认 `.class`。若改成 `.myclass` 或在文件头加字节，需**自定义 `findClass`**：

```java
public class SalaryClassLoader extends SecureClassLoader {
    private String classPath;

    public SalaryClassLoader(String classPath) {
        this.classPath = classPath;
    }

    @Override
    protected Class<?> findClass(String fullClassName) throws ClassNotFoundException {
        String filePath = classPath + fullClassName.replace(".", "/") + ".myclass";
        try (FileInputStream fis = new FileInputStream(filePath);
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            int code;
            while ((code = fis.read()) != -1) {
                bos.write(code);
            }
            byte[] data = bos.toArray();
            return defineClass(fullClassName, data, 0, data.length);
        } catch (Exception e) {
            throw new ClassNotFoundException(fullClassName, e);
        }
    }
}
```

简单「加密」：写文件时在 class 前加无意义字节 `1`，加载时跳过：

```java
fos.write(1);  // 混淆头
while ((code = fis.read()) != -1) {
    fos.write(code);
}
```

生产可用对称/非对称加密，甚至「加密类加载器 A 加载加密类加载器 B，再由 B 加载业务类」。

部署时应对 **JAR 内 class** 做同样处理，用流读写即可。

---

## 四、热加载：每次 new 新的 ClassLoader

修改 JAR 后仍加载旧类？因为 **`findLoadedClass` 缓存**。Java 层无法清掉某 ClassLoader 已加载的类。

做法：**每次计算 new 一个 `SalaryJARLoader`**，缓存随旧加载器成为垃圾（注意 Metaspace 压力）。

```java
public class SalaryJARLoader extends SecureClassLoader {
    private String jarFile;

    @Override
    protected Class<?> findClass(String fullClassName) throws ClassNotFoundException {
        String classFilepath = fullClassName.replace('.', '/').concat(".class");
        URL jarURL = new URL("jar:file:" + jarFile + "!/" + classFilepath);
        URLConnection conn = jarURL.openConnection();
        conn.setUseCaches(false);  // 避免 JAR 更新后仍读缓存
        // ... 读字节 defineClass
    }
}
```

```java
private static Double calSalary(Double salary) throws Exception {
    SalaryJARLoader loader = new SalaryJARLoader("/path/SalaryCaler.jar");
    Class<?> clazz = loader.loadClass("com.example.SalaryCaler");
    Object obj = clazz.newInstance();
    return (Double) clazz.getMethod("cal", Double.class).invoke(obj, salary);
}
```

**为何开源项目少见这种裸热加载？** 大量 ClassLoader 与 Class 元数据会加重 **Metaspace / GC**。工程上更常见 **JRebel、Arthas redefine** 等方案。

懒加载：加载 `SalaryCaler` 时往往连带加载 `Object`、`Double` 等依赖——**用到才加载**，非启动全量加载。

---

## 五、打破双亲委派：同类多版本

若 OA 工程 classpath 里已有 `SalaryCaler`，`SalaryJARLoader` 委派给 **AppClassLoader** 会先加载工程内版本，外置 JAR **永远进不来**。

解决：**子类优先**（逆委派）——仅对业务包 `com.example.*` 先 `findClass`，失败再 `super.loadClass`：

```java
@Override
public Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
    synchronized (getClassLoadingLock(name)) {
        Class<?> c = findLoadedClass(name);
        if (c == null) {
            c = findClass(name);           // 先 jar
            if (c == null) {
                c = super.loadClass(name, resolve);  // 再双亲
            }
        }
        return c;
    }
}
```

`findClass` 找不到时应返回 null 或抛 CNFE，让父加载器兜底；**不能**借此加载 `java.*`——Bootstrap / Ext / App 三者实现不可改，沙箱仍有效。

### Tomcat 为何也要改委派？

![Tomcat 类加载体系](/性能调优/jvm-02-classloader/p016-01.png)

| 加载器 | 作用 |
|--------|------|
| Common | 容器与各 Webapp 共享 |
| Catalina | 容器私有，Webapp 不可见 |
| Shared | 各 Webapp 共享，容器不可见 |
| WebappClassLoader | **每个 WAR 私有**，不同 Spring 版本隔离 |
| JspClassLoader | 每 JSP 页一个，改 JSP 即新加载器 → **热更新** |

---

## 六、SPI：少写反射

外置 JAR 里的 `SalaryCaler` 与 OA 里同名类**不是同一个 Class**，强转：

```java
SalaryCaler caler2 = (SalaryCaler) obj; // ClassCastException: A cannot be cast to A
```

**ServiceLoader** 按接口加载实现，配合 **线程上下文类加载器（TCCL）**：

配置文件：`META-INF/services/全限定接口名`，每行一个实现类。

```java
private static SalaryCalService getSalaryService(ClassLoader classloader) {
    ClassLoader prev = Thread.currentThread().getContextClassLoader();
    try {
        if (classloader != null) {
            Thread.currentThread().setContextClassLoader(classloader);
        }
        ServiceLoader<SalaryCalService> services = ServiceLoader.load(SalaryCalService.class);
        Iterator<SalaryCalService> it = services.iterator();
        return it.hasNext() ? it.next() : null;
    } finally {
        Thread.currentThread().setContextClassLoader(prev);
    }
}
```

`ServiceLoader.load` 默认用 TCCL——这就是为什么 API 要传 `ClassLoader`，也是 **Spring Boot `SpringFactoriesLoader`** 的同类思路（Boot 自研了一套 SPI，但思想相通）。

SPI 配置放在 **OA 工程** 还是 **业务 JAR** 内，决定加载哪份实现；可对比 `OADemo9` 类案例做实验。

---

## 本章小结

| 能力 | 手段 |
|------|------|
| 外置规则 | `URLClassLoader` |
| 防反编译 | 自定义后缀/加密 + `defineClass` |
| 不停机换逻辑 | 新 ClassLoader + 禁用 URL 缓存（注意 Metaspace） |
| 覆盖 classpath 同类 | 打破双亲委派 |
| 类型安全调用 | 接口 + SPI + TCCL |

JDK 9+ **模块化**改写了 JDK 内部加载器分工，但对**自定义 ClassLoader** 仍保留类似委派模型；本系列案例在 JDK 17 上**大多可平滑迁移**，细节见第 11 篇。

下一篇进入 **运行时数据区与 JVM 参数**——堆、栈、Metaspace 如何配才不误伤 GC。
