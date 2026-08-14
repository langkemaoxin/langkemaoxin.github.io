---
title: "Tomcat 整体架构与设计精髓"
sidebarGroup: "Tomcat"
shortTitle: "01 Tomcat 架构"
order: 1
date: 2026-09-05
category: "性能调优"
tag:
  - "性能调优"
  - "Tomcat"
description: "从 Connector 与 Container 分层入手，梳理 Server/Service/Engine/Host/Context/Wrapper 组件关系，以及 Mapper、Pipeline-Valve 与 LifeCycle 设计精髓。"
---

> **Tomcat 系列 · 第 1/4 篇**  
> 下一篇：[《Tomcat 线程模型与性能调优》](/性能调优/tomcat/tomcat-02-thread-tuning)

---

## 开头：HTTP 服务器 + Servlet 容器

Tomcat 是 Apache 软件基金会维护的开源 **Java Servlet 容器**，也是常用的 Web 服务器：在服务端运行 Servlet 与 JSP，通过 HTTP 处理客户端请求，并支持 JSF、JPA 等 Web 技术栈。

**核心定位**：HTTP 服务器 + Servlet 容器。本系列以 **Tomcat 9.0.x** 为主（与 JDK 8/11 常见组合一致），官方文档见 [Tomcat 9.0 Documentation](https://tomcat.apache.org/tomcat-9.0-doc/index.html)。

理解 Tomcat 架构，是后续线程调优、类加载与热部署的基础；也与 [JVM 类加载机制](/性能调优/jvm/jvm-02-classloader) 一脉相承——容器本身就是跑在 JVM 上的 Java 程序。

---

## 一、Tomcat 目录与 Web 应用部署

解压 Tomcat 后，常见目录如下：

![Tomcat 目录结构示意](/性能调优/tomcat-01-architecture/p002-01.png)

| 目录/文件 | 作用 |
|-----------|------|
| **bin** | 启停脚本（`startup.sh` / `shutdown.sh` 等） |
| **conf** | 核心配置（见下表） |
| **lib** | Tomcat 与 Web 应用共享的公共类库 |
| **logs** | 运行日志 |
| **webapps** | 默认 Web 应用部署目录，启动时加载 |
| **work** | 运行时编译产物（如 JSP 编译后的 class） |

**conf 下关键文件：**

| 文件 | 说明 |
|------|------|
| `server.xml` | Server 顶层配置 |
| `context.xml` | 全局 Context 默认配置 |
| `web.xml` | Servlet 规范部署描述符；Tomcat 内置 DefaultServlet、JspServlet 等 |
| `catalina.properties` | Catalina 行为（如 Common ClassLoader 路径） |
| `catalina.policy` | 安全策略 |
| `logging.properties` | JDK Logging 配置 |
| `tomcat-users.xml` | 角色与用户 |

### 1.1 三种 Web 应用部署方式

**方式一：拷贝到 webapps**

配合 `Host` 的 `appBase`：

```xml
<Host name="localhost" appBase="webapps"
      unpackWARs="true" autoDeploy="true">
```

**方式二：server.xml 中 `<Context>` 标签**

```xml
<Context docBase="D:\mvc" path="/mvc" reloadable="true" />
```

- `path`：URL 入口（context-path）
- `docBase`：应用文件路径（绝对或相对 `appBase`）
- `reloadable="true"`：监视 `WEB-INF/classes` 与 `WEB-INF/lib` 下 class 变更并自动重载

**方式三：`conf/Catalina/localhost/` 下独立 XML**

文件名即 context-path（根路径用 `ROOT.xml`）：

```xml
<Context docBase="D:\mvc" reloadable="true" />
```

---

## 二、整体架构：Connector + Container

Tomcat 要实现两件核心事：

1. **处理 Socket 连接**：网络字节流 ↔ Request/Response 对象
2. **加载与管理 Servlet**：处理业务请求

因此设计了两大组件：

| 组件 | 职责 |
|------|------|
| **Connector（连接器）** | 对外通信，屏蔽 HTTP/AJP 等协议与 I/O 模型差异 |
| **Container（容器）** | 对内处理，装载并调度 Servlet |

![Tomcat 整体架构：Connector 与 Container 分层](/性能调优/tomcat-01-architecture/p004-01.png)

架构分层概览：

| 层级 | 说明 |
|------|------|
| Connector | 接收请求，交给容器 |
| Container | 管理 Servlet、JSP、静态资源生命周期 |
| Engine | 引擎，管理多个虚拟站点 |
| Host | 虚拟主机，可部署多个 Web 应用 |
| Context | 单个 Web 应用上下文 |
| Servlet / JSP | 处理请求、生成响应 |

---

## 三、核心组件详解

### 3.1 Server 与 Service

![Server / Service 组件关系](/性能调优/tomcat-01-architecture/p005-01.png)

- **Server**：整个 Tomcat 实例顶层；可包含多组 **Service**；监听 **8005** 端口接收 shutdown 指令。
- **Service**：一组 **Connector** + 一个 **Engine**；还可含若干 **Executor**（线程池），供 Service 内组件共用。多 Service 可用不同端口访问同一机器上的不同应用。

### 3.2 Connector

监听固定端口，接收外部请求，传给 Container，再把结果返回客户端。对 Servlet 容器而言，无论底层是 HTTP 还是 AJP，拿到的都是标准 `ServletRequest`。

### 3.3 Container 四层父子结构

Tomcat 用 **4 种容器** 装载 Servlet，**父子关系**（非平行）：

![Engine → Host → Context → Wrapper 容器树](/性能调优/tomcat-01-architecture/p006-01.png)

| 容器 | 职责 |
|------|------|
| **Engine** | 顶层容器；一个 Service 最多一个 Engine |
| **Host** | 虚拟主机；可配置多个域名，其下可部署多个 Web 应用 |
| **Context** | 一个 Web 应用；解析 web 配置、管理 Web 资源 |
| **Wrapper** | 对单个 Servlet 的封装；创建、执行、销毁 Servlet 实例 |

### 3.4 结合 server.xml 理解

Tomcat 启动时解析 `server.xml`，通过反射创建组件——XML 标签与源码一一对应：

```xml
<Server>
    <Service>
        <Connector/>
        <Engine>
            <Host>
                <Context/>
            </Host>
        </Engine>
    </Service>
</Server>
```

![server.xml 与组件映射](/性能调优/tomcat-01-architecture/p007-01.png)

---

## 四、请求如何定位到 Servlet

**Mapper** 负责将 URL 定位到 Wrapper（即某个 Servlet）。Mapper 保存各层容器与访问路径的映射（域名、context-path、servlet-mapping），可视为**多层次 Map**。

请求到达时：解析 URL 的域名与路径 → 在 Map 中查找 → 最终定位到一个 **Wrapper**。

![Mapper 定位 Servlet 流程](/性能调优/tomcat-01-architecture/p008-01.png)

---

## 五、架构设计精髓

### 5.1 Connector：高内聚、低耦合

**高内聚**：相关功能集中；**低耦合**：模块间减少强依赖。

连接器需完成：

1. 监听端口、接受连接、读写字节流
2. 按 HTTP/AJP 等协议解析，生成 Tomcat Request
3. Tomcat Request ↔ ServletRequest 转换
4. 调用容器，拿到 ServletResponse 后写回客户端

其中 **1+2** 与 **3+4** 变化点不同，Tomcat 拆成三个高内聚模块：

| 组件 | 职责 |
|------|------|
| **EndPoint** | 网络通信（TCP/IP），提供字节流 |
| **Processor** | 应用层协议解析，生成 Tomcat Request/Response |
| **Adapter** | Tomcat Request ↔ ServletRequest 适配 |

协作关系：**EndPoint → Processor → Adapter → Container**。

I/O 模型与协议可自由组合（如 NIO + HTTP），封装为 **ProtocolHandler** 接口（如 `Http11NioProtocol`、`AjpNioProtocol`）。稳定部分抽象为 **AbstractProtocol** 等基类——**封装变化点、隔离稳定点**，是面向对象设计的典型做法。

![ProtocolHandler / EndPoint / Processor / Adapter](/性能调优/tomcat-01-architecture/p009-01.png)

**EndPoint**（如 `NioEndpoint`）含 **Acceptor**（监听连接）与 **SocketProcessor**（提交线程池处理）。**Processor**（如 `HTTP11Processor`）解析协议后调用 **CoyoteAdapter**（适配器模式）进入容器。

设计复杂系统的思路：**分析需求 → 划分子模块 → 找出变化点与不变点 → 接口/抽象基类封装不变点 → 模板方法留给子类实现变化点**。

### 5.2 Container：组合模式

四种容器均实现 **Container** 接口，对外使用单容器与组合容器一致：

```java
public interface Container extends Lifecycle {
    void setName(String name);
    Container getParent();
    void setParent(Container container);
    void addChild(Container child);
    void removeChild(Container child);
    Container findChild(String name);
}
```

### 5.3 Pipeline-Valve：责任链

Adapter 调用容器 `service()` 时，请求从 **Engine → Host → Context → Wrapper** 逐级传递，靠 **Pipeline-Valve** 管道机制实现——**责任链模式**。

复杂系统中，若全堆在一个大组件里处理权限、日志等，扩展性差；管道把多个 **Valve（阀门）** 串成链，各司其职。

```java
public interface Valve {
    Valve getNext();
    void setNext(Valve valve);
    void invoke(Request request, Response response)
        throws IOException, ServletException;
}
```

**Pipeline** 维护 Valve 链表；触发第一个 Valve 即沿链调用。**Basic Valve** 在链尾，负责调用**下层容器** Pipeline 的第一个 Valve。

入口（CoyoteAdapter）：

```java
connector.getService().getContainer()
    .getPipeline().getFirst().invoke(request, response);
```

Wrapper 链尾创建 **Filter 链** 并 `doFilter()`，最终到 Servlet `service()`。

![Pipeline-Valve 调用链](/性能调优/tomcat-01-architecture/p013-01.png)

**Valve vs Filter：**

| 对比 | Valve | Filter |
|------|-------|--------|
| 规范 | Tomcat 私有，紧耦合容器 | Servlet 标准，Jetty 等也支持 |
| 作用域 | Web 容器级，拦截所有应用 | 应用级，拦截单个 Web 应用 |
| 结构 | 单向链表（first + basic） | 数组 |
| 入口 | `pipeline.getFirst().invoke(...)` | `filterChain.doFilter(...)` |

### 5.4 LifeCycle：一键启停

Tomcat 需动态创建、组装、启动、停止、销毁组件。不变点是：**创建 → 初始化 → 启动 → 停止 → 销毁**；变化点是各组件 `init`/`start` 的具体逻辑。

**LifeCycle 接口**定义 `init()`、`start()`、`stop()`、`destroy()` 及监听器；**LifeCycleBase** 用**模板方法**实现公共逻辑，子类实现 `initInternal()`、`startInternal()` 等。

![LifeCycle 状态流转](/性能调优/tomcat-01-architecture/p016-02.png)

- **组合模式**：Server 的 `init`/`start` 递归触发子组件，一键启动整棵组件树。
- **观察者模式**：状态变化触发 **LifecycleListener**（如 `MemoryLeakTrackingListener` 检测 Context 内存泄漏）；也可在 `server.xml` 自定义监听器。
- **模板方法**：LifeCycleBase 统一骨架，子类填具体步骤。

![LifeCycleBase 模板方法](/性能调优/tomcat-01-architecture/p017-01.png)

具体实现类：`StandardServer`、`StandardService` 继承 LifeCycleBase；`StandardEngine/Host/Context/Wrapper` 继承 **ContainerBase**（实现 Container + LifeCycleBase）——**接口分离**：生命周期与容器能力分接口。

![生命周期总体类图](/性能调优/tomcat-01-architecture/p019-01.png)

---

## 本章小结

| 主题 | 要点 |
|------|------|
| 定位 | HTTP 服务器 + Servlet 容器 |
| 两大件 | Connector 对外、Container 对内 |
| 容器树 | Engine → Host → Context → Wrapper |
| 路由 | Mapper 按 URL 映射到 Wrapper |
| 设计模式 | 适配器（Adapter）、组合（Container）、责任链（Pipeline-Valve）、模板方法 + 观察者（LifeCycle） |

下一篇进入 **I/O 模型与线程池**——Connector 如何收包、线程如何调度，以及线上如何调 `maxThreads`。
