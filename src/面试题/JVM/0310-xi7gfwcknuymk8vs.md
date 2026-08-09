---
title: "什么情况会导致JVM退出"
sidebarGroup: "JVM"
shortTitle: "什么情况会导致JVM退出"
order: 310
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "Java虚拟机（JVM）退出通常是由以下几个原因导致的：正常程序终止：当程序执行完main方法，包括所有非守护线程都终止时，JVM将正常退出。调用System.exit(int status)：显式调用System.exit()方法，以指定"
article: false
---

> 来源：[什么情况会导致JVM退出](https://www.yuque.com/tulingzhouyu/db22bv/xi7gfwcknuymk8vs)

Java虚拟机（JVM）退出通常是由以下几个原因导致的：

1. **正常程序终止**：

- 当程序执行完`main`方法，包括所有非守护线程都终止时，JVM将正常退出。

1. **调用**`System.exit(int status)`：

- 显式调用`System.exit()`方法，以指定的状态码终止当前运行的Java虚拟机。

1. **未捕获的异常或错误**：

- 如果某个线程抛出的异常没有被捕获，并且此异常传播到了主线程，JVM可能会终止。

1. `Runtime.halt(int)`**或崩溃**：

- 直接调用`Runtime.halt()`会立即停止Java进程，类似于突然终止程序而不调用任何钩子。
- JVM的致命错误（如内存访问违规）也可能导致崩溃并退出。

1. **外部命令强制关闭**：

- 例如通过操作系统的任务管理器或者控制台命令，如`kill`命令。

### 示例代码

```java
public class JVMExitExample {  
    public static void main(String[] args) {  
        // 情况1：正常程序终止  
        System.out.println("Program starts...");  

        // 打开注释逐一尝试其他退出情况  

        // 情况2：显式调用System.exit()  
        // System.exit(0);  

        // 情况3：未捕获的异常  
        // willCauseException();  

        // 情况4：调用Runtime.halt()（高风险）  
        // Runtime.getRuntime().halt(0);  

        System.out.println("Program ends...");  
    }  

    private static void willCauseException() {  
        // 产生一个未捕获的异常，导致JVM退出  
        throw new RuntimeException("Unexpected Error!");  
    }  
}
```

### 解释

- **正常程序终止**：默认情况下，`main`执行完毕后，所有非守护线程完成，程序正常退出。
- `System.exit()`：调用`System.exit(0)`立即终止JVM。非零参数值通常被用来指示异常终止。
- **未捕获的异常**：在`willCauseException()`中，我们故意抛出一个未捕获的`RuntimeException`，导致程序退出。
- `Runtime.halt()`：直接使用`Runtime.halt()`强行终止虚拟机。这不会调用`finalize`方法或执行任何待处理的关闭钩子，也推荐在高风险操作或崩溃模拟时使用。
- **外部强制关闭**：不演示于代码中，需通过操作系统进行操作。

每种退出机制的影响和使用场合都不同，开发者应根据程序需求谨慎地选择合适的退出方式。特别是涉及到异常退出时，通常伴随可能尚未完成的重要资源清理工作，因此合理处理异常显得尤为重要。
