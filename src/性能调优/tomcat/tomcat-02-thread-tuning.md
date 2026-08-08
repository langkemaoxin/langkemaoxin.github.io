---
title: "Tomcat 线程模型与性能调优"
sidebarGroup: "Tomcat"
shortTitle: "02 线程模型与调优"
order: 2
date: 2026-09-05
category: "性能调优"
tag:
  - "性能调优"
  - "Tomcat"
description: "从 Linux I/O 模型与 Reactor 线程模型入手，解析 Tomcat NIO/NIO2 实现，以及 JMX 监控、命令行诊断与线程池 maxThreads 调优。"
---

> **Tomcat 系列 · 第 2/4 篇**  
> 上一篇：[《Tomcat 整体架构与设计精髓》](/性能调优/tomcat/tomcat-01-architecture)  
> 下一篇：[《Tomcat 类加载机制与热部署热加载》](/性能调优/tomcat/tomcat-03-classloader-hotdeploy)

---

## 开头：Connector 的 I/O 与线程

上一篇讲了 Connector 的 **EndPoint / Processor / Adapter** 分层。本篇聚焦 **EndPoint 如何处理 I/O**，以及 **Executor 线程池如何承载请求**——这是 Tomcat 性能调优的主战场。

I/O 模型决定「等数据时 CPU 干什么」；线程池决定「有多少 worker 同时处理业务」。两者与 [JVM 内存与 GC](/性能调优/jvm/jvm-03-memory-model) 共同决定线上吞吐与响应时间。

---

## 一、Linux I/O 模型基础

**I/O**：在内存与外部设备之间拷贝数据。CPU 发起读指令后，数据从网卡进内存需要时间；等待期间程序可以：

1. **让出 CPU** 做别的事（非阻塞 / 多路复用 / 异步）
2. **忙等** 直到拷贝完成（阻塞）

网络读涉及 **用户线程** 与 **内核**。进程分用户空间与内核空间；只有内核能直接访问磁盘、网卡。

一次网络读通常两阶段：

| 阶段 | 说明 |
|------|------|
| **数据准备** | 等待内核把数据从网卡拷到内核空间 |
| **数据拷贝** | 内核把数据从内核空间拷到用户空间（应用缓冲区） |

**阻塞/非阻塞**：发起 I/O 后是否立即返回。  
**同步/异步**：数据拷到用户空间由内核主动完成，还是应用触发。

Linux 常见五种模型（信号驱动 I/O 实际较少用）：

![Linux 五种 I/O 模型对比](/性能调优/tomcat-02-thread-tuning/p002-01.png)

---

## 二、Tomcat 支持的 I/O 模型

| 模型 | Endpoint | 说明 |
|------|----------|------|
| **BIO** | JIoEndpoint | 同步阻塞，一连接一线程；Tomcat 8.5+ 已移除 |
| **NIO** | NioEndpoint | 多路复用 + 同步处理；**Tomcat 8+ 默认**；连接多、操作轻（短连接） |
| **NIO2** | Nio2Endpoint | JDK 7+ 异步 I/O；连接多且连接时间长 |
| **APR** | AprEndpoint | JNI 调 APR 本地库；需编译安装 APR |

**选型建议：**

- **绝大多数场景**：默认 **NIO** 即可。
- **TLS 且性能要求极高**：考虑 **APR**（OpenSSL 处理握手与加解密，C 实现通常优于 Java）。
- **Windows + 大报文**：可考虑 **NIO2**（Windows 内核异步 I/O 较完整）。
- **Linux**：NIO 与 NIO2 底层均 epoll；**NIO 更简单高效**。Linux 内核异步 I/O 支持不完善，JVM 多在应用层用 epoll 模拟。

修改 `protocol` 即可切换，例如 NIO2：

```xml
<Connector port="8080"
           protocol="org.apache.coyote.http11.Http11Nio2Protocol"
           connectionTimeout="20000"
           redirectPort="8443" />
```

官方 Connector 参数：[HTTP Connector Configuration](https://tomcat.apache.org/tomcat-9.0-doc/config/http.html)

---

## 三、Reactor 线程模型

Reactor 是服务端处理高并发网络 I/O 的编程模型。三类事件：**连接、读、写**；三个角色：**Reactor、Acceptor、Handler**。

### 3.1 单 Reactor 单线程

Reactor、Acceptor、Handler 及业务逻辑均在**同一线程**：Reactor 监听并分发 → Acceptor 建连 → Handler 读写并处理业务。实现简单，但无法利用多核，一个 Handler 阻塞则全部停滞。

![单 Reactor 单线程](/性能调优/tomcat-02-thread-tuning/p004-01.png)

### 3.2 单 Reactor 多线程

连接处理仍单线程；**Handler 只负责 I/O**，具体业务交给 **worker 线程池**——Tomcat 常用思路的雏形。

![单 Reactor 多线程](/性能调优/tomcat-02-thread-tuning/p005-01.png)

### 3.3 主从 Reactor 多线程

**主 Reactor** 监听连接、Acceptor 建连后把连接分给 **子 Reactor**；子 Reactor 处理该连接上的读写，业务仍进线程池。连接与 I/O 解耦，扩展性更好。

![主从 Reactor 多线程](/性能调优/tomcat-02-thread-tuning/p005-02.png)

---

## 四、Tomcat NIO 实现（NioEndpoint）

Tomcat **NioEndpoint** 基于 **主从 Reactor 多线程** 设计：

![Tomcat NIO 组件：Acceptor / Poller / Executor](/性能调优/tomcat-02-thread-tuning/p006-01.png)

| 组件 | 职责 |
|------|------|
| **Acceptor** | 独立线程，`accept()` 新连接；封装为 `PollerEvent` 压入 Poller 队列（生产者-消费者） |
| **Poller** | 本质是 **Selector** 线程；检测 Channel 就绪，生成 **SocketProcessor** 交给 Executor |
| **LimitLatch** | 连接数控制器；Tomcat 9 默认约 **8192**；达上限阻塞 Acceptor（OS 仍可能收连接，应用层不再接） |
| **Executor** | 线程池，执行 SocketProcessor → Http11Processor 解析 → 调容器 → 写回 Channel |

**ServerSocketChannel** 在 `initServerSocket` 中设为**阻塞模式**，`bind` 时第二个参数为 OS 等待队列长度（默认 100）——应用层连接满时，OS 仍可排队。

```java
serverSock = ServerSocketChannel.open();
serverSock.bind(addr, getAcceptCount());
serverSock.configureBlocking(true);
```

### 4.1 NIO2 与 NIO 的区别

**NIO**：同步 I/O，应用需触发内核→用户空间拷贝。  
**NIO2**：异步 I/O，**无 Poller/Selector**，Selector 工作交给内核；适合长连接、大数据量场景（尤其 Windows）。

![NIO vs NIO2 结构差异](/性能调优/tomcat-02-thread-tuning/p007-02.png)

---

## 五、性能监控

### 5.1 关键指标

| 类型 | 指标 | 说明 |
|------|------|------|
| **业务** | 吞吐量、响应时间、错误数 | 对外服务质量 |
| **资源** | 线程池、CPU、JVM 内存 | 瓶颈往往在此，会反压业务指标 |

线程不足 → 排队、RT 变长；线程过多 → CPU 上下文切换、GC 压力（见 [JVM 调优工具](/性能调优/jvm/jvm-09-tuning-tools)）。

### 5.2 JConsole + JMX

在 `bin/setenv.sh`（Windows 用 `setenv.bat`）：

```bash
export JAVA_OPTS="${JAVA_OPTS} -Dcom.sun.management.jmxremote"
export JAVA_OPTS="${JAVA_OPTS} -Dcom.sun.management.jmxremote.port=8011"
export JAVA_OPTS="${JAVA_OPTS} -Djava.rmi.server.hostname=x.x.x.x"
export JAVA_OPTS="${JAVA_OPTS} -Dcom.sun.management.jmxremote.ssl=false"
export JAVA_OPTS="${JAVA_OPTS} -Dcom.sun.management.jmxremote.authenticate=false"
```

重启后：`jconsole x.x.x.x:8011`

- **MBeans → GlobalRequestProcessor → http-nio-8080**：`requestCount`（吞吐）、`processingTime`（平均 RT）、`maxTime`、`errorCount`
- **线程**：线程数与栈，排查阻塞、死锁
- **CPU / 内存**：进程级使用率

![JConsole 请求统计](/性能调优/tomcat-02-thread-tuning/p009-01.png)

![JConsole 线程视图](/性能调优/tomcat-02-thread-tuning/p009-02.png)

![JConsole CPU 与内存](/性能调优/tomcat-02-thread-tuning/p010-01.png)

### 5.3 命令行（监控不可达时）

```bash
# 1. 找进程
ps -ef | grep tomcat

# 2. 进程状态
cat /proc/<pid>/status

# 3. CPU / 内存
top -p <pid>

# 4. 8080 连接
netstat -an | grep 8080
# 统计 ESTABLISHED / TIME_WAIT 数量

# 5. 网络流量
ifstat
```

---

## 六、线程池调优

核心是 **`maxThreads`**（Connector 或共享 Executor）：

- **过小**：线程饥饿，请求排队，RT 拉长
- **过大**：CPU 核数有限，切换开销大，吞吐反而下降

理论参考（仅作起点）：

$$\text{线程数} \approx \text{CPU 核数} \times \left(1 + \frac{\text{平均等待时间}}{\text{平均工作时间}}\right)$$

实际需 **压测** 在理论值附近找甜点。

### 6.1 server.xml 配置 Executor

```xml
<!--
  namePrefix: 线程名前缀
  maxThreads: 最大线程，默认 200，常见 500~1000（视硬件与业务）
  minSpareThreads: 核心线程，默认 25
  prestartminSpareThreads: 启动时预创建核心线程
  maxQueueSize: 等待队列上限，默认 Integer.MAX_VALUE
  maxIdleTime: 空闲线程存活时间（ms）
-->
<Executor name="tomcatThreadPool" namePrefix="catalina-exec-"
          prestartminSpareThreads="true"
          maxThreads="500" minSpareThreads="10" maxIdleTime="10000"/>

<Connector port="8080" protocol="HTTP/1.1"
           executor="tomcatThreadPool"
           connectionTimeout="20000"
           redirectPort="8443" URIEncoding="UTF-8"/>
```

### 6.2 Spring Boot

`application.yml`：

```yaml
server:
  tomcat:
    threads:
      min-spare: 20
      max: 500
    connection-timeout: 5000ms
```

`TomcatConnectorCustomizer` 精细控制：

```java
@Configuration
public class MyTomcatCustomizer
        implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        factory.setPort(8090);
        factory.setProtocol("org.apache.coyote.http11.Http11NioProtocol");
        factory.addConnectorCustomizers(connector -> {
            Http11NioProtocol protocol =
                (Http11NioProtocol) connector.getProtocolHandler();
            protocol.setMaxThreads(500);
            protocol.setMinSpareThreads(20);
            protocol.setConnectionTimeout(5000);
        });
    }
}
```

![线程池与 Connector 关系示意](/性能调优/tomcat-02-thread-tuning/p011-01.png)

---

## 本章小结

| 主题 | 要点 |
|------|------|
| I/O 选型 | Linux 默认 NIO；TLS 极致性能看 APR；Windows 大流量看 NIO2 |
| 模型 | NioEndpoint ≈ 主从 Reactor + 线程池 |
| 监控 | JMX/GlobalRequestProcessor + 线程栈 + 命令行 netstat |
| 调优 | `maxThreads` 压测定值；Executor 与 Connector 解耦复用 |

下一篇讲 **类加载层次与热部署**——Tomcat 如何打破双亲委派、隔离 Web 应用，以及 `reloadable` 背后在干什么。
