---
title: "说下类加载器机制与双亲委派"
sidebarGroup: "JVM"
shortTitle: "说下类加载器机制与双亲委派"
order: 320
date: 2026-05-11
category: "面试题"
tag:
  - "面试题"
description: "Java 的类加载器机制与双亲委派模型是 Java 虚拟机（JVM）加载类文件时采用的一种体系结构。它用于确保 Java 应用程序中类的单一性、安全性和加载顺序。类加载器机制Java 的类加载器机制负责将类的字节码从各种来源（例如本地文件系"
article: false
---

> 来源：[说下类加载器机制与双亲委派](https://www.yuque.com/tulingzhouyu/db22bv/hgkf3zbuut09l7ig)

Java 的类加载器机制与双亲委派模型是 Java 虚拟机（JVM）加载类文件时采用的一种体系结构。它用于确保 Java 应用程序中类的单一性、安全性和加载顺序。

### 类加载器机制

Java 的类加载器机制负责将类的字节码从各种来源（例如本地文件系统、网络等）加载到 JVM 中。主要的类加载器包括：

1. **Bootstrap ClassLoader**：引导类加载器，负责加载核心 Java 库，由 JVM 自身实现（如 `rt.jar`）。
2. **Extension ClassLoader**：扩展类加载器，加载扩展库，通常从 `java.ext.dirs` 系统属性指定的目录中加载。
3. **Application ClassLoader**：系统类加载器，加载用户类路径（`classpath`）中定义的类。

### 双亲委派模型

双亲委派模型是类加载机制的一种实现策略，确保类的唯一性和安全性。其工作流程如下：

1. 当一个类加载器接收到类加载请求时，它首先将请求委派给它的父类加载器去加载。
2. 只有当父加载器无法完成加载任务时，子加载器才会尝试自己去加载该类。

这种机制确保了 Java 核心类始终由 Bootstrap ClassLoader 加载，防止重复加载和安全漏洞。

### 代码示例

以下是一个简单的示例，展示如何自定义类加载器并观察双亲委派模型的工作：

```java
import java.io.*;  

public class CustomClassLoader extends ClassLoader {  

    private String classPath;  

    public CustomClassLoader(String classPath) {  
        this.classPath = classPath;  
    }  

    @Override  
    protected Class&lt;?> findClass(String name) throws ClassNotFoundException {  
        byte[] classData = loadClassData(name);  
        if (classData == null) {  
            throw new ClassNotFoundException();  
        } else {  
            return defineClass(name, classData, 0, classData.length);  
        }  
    }  

    private byte[] loadClassData(String className) {  
        String path = classPath + "/" + className.replace('.', '/') + ".class";  
        try (InputStream is = new FileInputStream(path); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {  
            int bufferSize = 1024;  
            byte[] buffer = new byte[bufferSize];  
            int length;  
            while ((length = is.read(buffer)) != -1) {  
                baos.write(buffer, 0, length);  
            }  
            return baos.toByteArray();  
        } catch (IOException e) {  
            e.printStackTrace();  
            return null;  
        }  
    }  

    public static void main(String[] args) {  
        try {  
            // 设定自定义类加载器的路径  
            String classPath = "/path/to/classes";  
            CustomClassLoader customClassLoader = new CustomClassLoader(classPath);  

            // 从自定义路径加载类  
            Class&lt;?> loadedClass = customClassLoader.loadClass("MyClass");  
            System.out.println("Class " + loadedClass.getName() + " loaded by " + loadedClass.getClassLoader());  

        } catch (ClassNotFoundException e) {  
            e.printStackTrace();  
        }  
    }  
}
```

### 解释

- **自定义类加载器**：`CustomClassLoader` 实现了从给定路径加载类的逻辑，通过重写 `findClass` 方法实现。
- **双亲委派**：当 `loadClass` 调用时，首先会尝试委托给父类加载器加载类。
- **类路径加载**：通过 `loadClassData` 方法实现从文件系统读取类数据。

### 总结

- **安全性**：双亲委派模型帮助防止加载非法类或重复类，保证核心库的安全。
- **扩展性**：自定义类加载器允许开发者改变类加载行为（如从数据库、网络等加载类），在插件系统中非常有用。
- **单一性**：确保核心类由一个统一的类加载器进行加载，避免冲突和不一致。在大多数情况下，开发者不需要实现自己的类加载器，但了解它的机制对于深入理解 Java 执行环境是十分有益的。
