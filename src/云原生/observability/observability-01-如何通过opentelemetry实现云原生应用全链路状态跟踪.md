---
title: 如何通过OpenTelemetry实现云原生应用全链路状态跟踪？
sidebarGroup: 可观测性
shortTitle: 01 如何通过OpenTelemetry实现云原生...
order: 1
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 可观测性
  - 云原生
  - 课程笔记
description: 如何通过OpenTelemetry实现云原生应用全链路状态跟踪？ 一、为什么需要分布式跟踪？ 1.1 为什么需要分布式跟踪？ 随着SOA，微服务架构及PaaS，Devops等技术的兴起，线上问题的追踪...
---

> **可观测性 · 第 1 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何通过OpenTelemetry实现云原生应用全链路状态跟踪？

# 一、为什么需要分布式跟踪？

## 1.1 为什么需要分布式跟踪？

随着SOA，微服务架构及PaaS，Devops等技术的兴起，线上问题的追踪和排查变得更加困难。对线上业务的可观测性得到了越来越多企业的重视，由此涌现出了许多优秀的链路追踪及服务监控中间件。比较流行的有Spring Cloud全家桶自带的Zipkin，点评的CAT, 华为的skywalking，Uber的Jaeger, naver的Pinpoint。

一个典型的应用，通常有三种类型的数据需要被监控系统记录：Metric, logs and traces。让我们先了解下它们都是什么。

**Metrics**

提供进行运行时的指标信息。比如CPU使用率，内存使用情况，GC情况，网站流量等。

**Logging**

可以监控程序进程中的日志，比如集成Log4j记录的日志，或者程序运行中发生的事件或通知。

**Tracing**

也叫做分布式追踪，包含请求中每个子操作的开始和结束时间，传递的参数，请求间的调用链路，请求在各个链路上的耗时等信息。Tracing可以包含消息发送和接收，数据库访问，负载均衡等各种信息，让我们可以深入了解请求的执行情况。Tracing为我们提供了获取请求的时间主要消耗在哪里，请求的参数都是什么，如果发生了异常，那么异常是在哪个环节产生的等能力。

我们为什么需要分布式追踪？为什么我们不能只使用指标和日志呢？假设你有一个如下所示的微服务架构。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/a8eec4a22d94978f28b48913de676a8b21a188.jpg)

现在想象一下来自客户端的请求。

从上面的架构图中我们可以看出，一个请求可能要经过几十个或几百个网络调用。这使得我们很难知道请求所经过的整个路径，如果只有日志和指标，那么故障排查会非常复杂。

分布式跟踪可以帮助查看整个请求过程中服务之间的交互，并可以让我们深入了解系统中请求的整个生命周期。它帮助我们发现应用程序中的错误、瓶颈和性能问题。

追踪从用户与应用程序进行交互的一刻开始，我们应该能够看到整个请求直到最后一层。

跟踪数据（以 span 的形式，跨度表示一个工作或操作单元。跨度是痕迹的组成部分。）生成信息（元数据），可以帮助了解请求延迟或错误是如何发生的，以及它们对整个请求会产生什么样的影响。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/23d9294756e546fb5ab1763c2a7654309005bc.jpg)

## 1.2 如何实现分布式跟踪？

为了实现追踪，我们需要做以下几件事：

- 检测我们的应用程序(埋点)。
- 收集和处理数据。
- 存储和可视化数据，以便我们可以查询它。

为此我们可以使用两个开源项目：OpenTelemetry 和 Jaeger。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/18e368e1286d8bd5a827909f4eb9c7d0724995.jpg)

# 二、OpenTelemetry 是什么？

## 2.1 OpenTelemetry是什么？

OpenTelemetry（简称 Otel） 是一个用于观察性的开源项目，提供了一套工具、APIs（是一个编程接口，可以使用它来检测代码以收集遥测数据，如跟踪、指标和日志） 和 SDKs(是 OpenTelemetry API 的官方实现，用于处理和将收集的遥测数据导出到后端)，用于收集、处理和导出遥测数据（如指标、日志和追踪信息）。应用程序遥测数据（如追踪、指标和日志）的收集是通过探针来完成的，探针通常以库的形式集成到应用程序中，自动捕获重要信息协助监控和调试。OpenTelemetry 探针支持市面上大多数的编程语言，探针的安装（通常被称为插桩，Instrumentation）分为手动和自动两种方式。

OpenTelemetry 可以用于从应用程序收集数据。它是一组工具、API 和 SDK 集合，我们可以使用它们来检测、生成、收集和导出遥测数据（指标、日志和追踪），以帮助分析应用的性能和行为。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/d56df7378038dd370255122e3bcd0557f6d8de.jpg)

图中展示了OTel Collector的功能和与其他组件的交互。具体如下：

- **Microservices**：这是指由多个小型、自治服务组成的系统，每个服务都可以独立部署和扩展。
- **App Code, OTel Auto Inst., OTel API, OTel SDK**: 这些是与应用代码相关的工具和服务，用于自动安装OpenTelemetry库并提供API访问。
- **Kubernetes, L7 Proxy, AWS, Shared Infra**: Kubernetes是一个容器编排平台，L7 Proxy是一种网络代理层，AWS是一家云服务商，Shared Infra表示共享基础设施（可能是公共或私有）。
- **3rd party service**: 这是指外部提供的服务，可能包括时间序列数据库、跟踪数据库等。
- **Time Series Databases, Trace Databases, Column Stores**: 这些都是存储数据的不同方式，适用于不同的场景需求。
- **Observability Frontends & APIs**: 这指的是观测性前端界面和应用程序接口，帮助用户查看和分析收集的数据。
- **Managed DBs, APIs**: 管理型数据库提供了更高级别的管理支持，而API则允许其他软件通过特定协议进行通信。

这些元素共同构成了一个完整的可观测性和监控解决方案，并且可以适应各种环境和用例。

OpenTelemetry 是：

- 开源的
- 受到可观测领域行业领导者的采用和支持
- 一个 CNCF 项目
- 与供应商无关的

OpenTelemetry 包括可观测性的三个支柱：追踪、指标和日志。

- **分布式追踪**是一种跟踪服务请求在分布式系统中从开始到结束的方法。
- **指标**是对一段时间内活动的测量，以便了解系统或应用程序的性能。
- **日志**是系统或应用程序在特定时间点发生的事件的文本记录。

## 2.2 Open Telemetry 与供应商无关

OpenTelemetry 提供了一个与供应商无关的**可观测性标准**，因为它旨在标准化跟踪的生成。通过 OpenTelemetry，我们可以将检测埋点与后端分离。这意味着我们不依赖于任何工具（或供应商）。

我们不仅可以使用任何我们想要的编程语言，还可以挑选任何兼容的存储后端，从而避免被绑定在特定的商业供应商上面。

开发人员可以检测他们的应用程序，而无需知道数据将存储在哪里。

OpenTelemetry 为我们提供了创建跟踪数据的工具，为了获取这些数据，我们首先需要检测应用程序来收集数据。为此，我们需要使用 OpenTelemetry SDK。

# 三、OpenTelemetry检测（埋点）

应用程序的检测数据可以使用自动或手动（或混合）方式生成。 要使用 OpenTelemetry 检测应用程序，可以前往访问 OpenTelemetry 存储库，选择适用于的应用程序的语言，然后按照说明进行操作。

## 3.1 自动检测

使用自动检测是一个很好的方式，因为它简单、容易，不需要进行很多代码更改。

如果你没有必要的知识（或时间）来创建适合你应用程序量身的追踪代码，那么这种方法就非常合适。

当使用自动检测时，将创建一组预定义的 spans，并填充相关属性。

## 3.2 手动检测

手动检测是指为应用程序编写特定的埋点代码。这是向应用程序添加可观测性代码的过程。这样做可以更有效地满足你的需求，因为可以自己添加属性和事件。这样做的缺点是需要导入库并自己完成所有工作。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/2566ac8734cf8130e9a6410d956481251c71ff.jpg)

1. 应用程序被OpenTelemetry SDK instrumented（流行框架和库的插件）：这一步骤涉及在需要进行追踪的应用程序中添加必要的代码以启用OpenTelemetry的功能。SDK会生成追踪上下文并将它们发送到收集器。
2. 收集器接收来自应用程序的追踪事件：一旦应用程序开始产生追踪上下文，它就会将这些事件发送给位于同一台机器上的OpenTelemetry收集器。这个过程通常发生在gRPC/HTTP调用之间。
3. OpenTelemetry收集器暴露两个端口：4317(gRPC) 和 4318(HTTP)，分别接受不同类型的输入格式。收集器在此阶段主要负责从客户端接收到的所有追踪事件。
4. 收集器将追踪数据导出至Jaeger收集器：收集器现在将接收到的追踪数据转发到Jaeger收集器。Jaeger收集器随后将其保存在其内部存储结构中以便后续查询和其他操作。
5. Jaeger UI 提供了一个基于Web的用户界面：此UI使用户能够浏览和分析存储在Jaeger后端的各种追踪数据。
6. Jaeger Query检索追踪数据并显示结果：当用户想要查找特定的追踪时，他们可以通过JaegerQuery向Jaeger后端发出请求。该查询返回所有匹配的结果并在Jaeger UI上展示出来。

## 3.3 传播器

Context Propagation(上下文传播)
Context propagation 确保相关的上下文数据(如 trace IDs、span IDs 和其他元数据)在应用程序的不同服务和组件之间一致地传播。

通过传播上下文，OpenTelemetry 确保从不同服务和组件收集的遥测数据保持相关，即使在分布式和微服务架构中也是如此。它支持端到端跟踪，从而更容易理解请求流、性能瓶颈和系统依赖关系。

可以将 W3C trace context、baggage 和b3 等传播器（Propagators）添加到配置中。

> 不同的传播器定义特定的行为规范，以便跨进程边界传播带上上下文数据。

- Trace Context：用于在 HTTP headers 中编码 trace 数据，以便在不同的服务间传递这些数据。
- Baggage：用于在 span 之间传递键值对数据，例如用户 ID、请求 ID 等。
- B3：用于在 HTTP headers 中编码 trace 数据，以便在不同的服务间传递这些数据（主要用于 Zipkin 或其兼容的系统）。

# 四、OpenTelemetry 协议（OTLP）

在 OpenTelemetry 的架构中，OTLP（OpenTelemetry Protocol）作为一种标准化的协议，用于在不同的组件之间传输遥测数据。具体来说：

- 代理（或者在这里指的是使用 OpenTelemetry SDK 的应用）：这些应用会生成或捕获遥测数据，如 traces、metrics 和 logs。为了将这些数据发送出去，代理需要配置一个 OTLP 导出器。这个导出器负责将原始的遥测数据按照 OTLP 规范进行编码和打包，以便于在网络中传输。
- 收集器（OpenTelemetry Collector）：收集器是一个独立的服务，其主要职责是接收、处理和转发遥测数据。为了能够接收通过 OTLP 协议发送来的数据，收集器需要配置一个 OTLP 接收器。这个接收器监听特定的网络端口，等待来自代理的 OTLP 数据包，并将接收到的数据解码和解析为可处理的格式。

代理通过配置的 OTLP 导出器将遥测数据以 OTLP 格式发送出去，而收集器则通过配置的 OTLP 接收器来接收和处理这些数据。这样，OTLP 就成为了一个桥梁，实现了遥测数据在不同系统和组件之间的高效、标准化传输。

# 五、OpenTelemetry Collectors

## 5.1 OpenTelemetry Collectors作用

应用程序的遥测数据可以发送到 OpenTelemetry Collectors 收集器。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/351cabc0273c473ed3b14634f7f6a481a239ef.jpg)

收集器是 OpenTelemetry 的一个组件，它接收遥测数据（span、metrics、logs 等），处理（预处理数据）并导出数据（将其发送到想要的通信后端）。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/e7137e282de44ff04d4675ee78fefb14e5d3c0.jpg)

## 5.2 Receivers

接收器 Receivers 是数据进入收集器的方式，可以是推送或拉取。OpenTelemetry 收集器可以以多种格式接收遥测数据。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/f28b42d89ffea1428a1093b5273c18cfb88411.jpg)

以下是接收器在端口 4317(gRPC) 和 4318(http) 上接受 OTLP 数据的配置示例：

~~~powershell
otlp:
  protocols:
    http:
    grpc:
      endpoint: "0.0.0.0:4317"
~~~

同样下面的示例，它可以以 Jaeger Thrift HTTP 协议方式接收遥测数据。

~~~powershell
jaeger: # Jaeger 协议接收器
  protocols: # 定义接收器支持的协议
    thrift_http: # 通过 Jaeger Thrift HTTP 协议接收数据
      endpoint: "0.0.0.0:14278"
~~~

## 5.3 Processors

一旦接收到数据，收集器就可以处理数据。处理器在接收和导出之间处理数据。处理器是可选的，但有些是推荐的。

比如 batch 处理器是非常推荐的。批处理器接收跨度、指标或日志，并将它们放入批次中。批处理有助于更好地压缩数据，减少传输数据所需的传出连接数量。该处理器支持基于大小和时间的批处理。

~~~powershell
processors:
  batch:
~~~

需要注意的是配置处理器并不会启用它。需要通过 service 部分的 pipelines 启用。

~~~powershell
service:
  pipelines:
    traces:
      receivers: [jaeger]
      processors: [batch]
      exporters: [zipkin]
~~~

## 5.4 Exporters

为了可视化和分析遥测数据，我们还需要使用导出器。导出器是 OpenTelemetry 的一个组件，也是数据发送到不同系统/后端的方式。

比如 console exporter 是一种常见的导出器，对于开发和调试任务非常有用，它会将数据打印到控制台。

在 exporters 部分，可以添加更多目的地。例如，如果想将追踪数据发送到 Grafana Tempo（是一个新的开源、易于使用的大容量分布式跟踪后端。Grafana 的 Tempo 是出自 Grafana 实验室的一个简单易用、大规模的、分布式的跟踪后端。Tempo 集成了 Grafana、Prometheus 以及 Loki，并且它只需要对象存储进行操作，因此成本低廉，操作简单。），只需添加如下所示的配置：

~~~powershell
exporters:
  logging:
  otlp:
    endpoint: "<tempo_endpoint>"
    headers:
      authorization: Basic <api_token>
~~~

当然最终要生效也需要在 service 部分的 pipelines 中启用。

~~~powershell
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [logging, otlp]
~~~

OpenTelemetry 附带了各种导出器，在 OpenTelemetry 收集器 Contrib 存储库中可以找到。

## 5.5 Extensions

扩展主要用于不涉及处理遥测数据的任务。比如健康监控、服务发现和数据转发等。扩展是可选的。

~~~powershell
extensions:
  health_check:
  pprof:
  zpages:
  memory_ballast:
    size_mib: 512
~~~

# 六、OpenTelemetry Collector 部署模式/策略

OpenTelemetry 收集器可以通过不同的方式进行部署，所以我们要考虑下如何部署它。具体选择哪种策略取决于你的团队和组织情况。

## 6.1 Agent 模式

在这种情况下，OpenTelemetry 检测的应用程序将数据发送到与应用程序一起驻留的（收集器）代理。然后，该代理程序将接管并处理所有来自应用程序的追踪数据。

收集器可以通过 sidecar 方式部署为代理，sidecar 可以配置为直接将数据发送到存储后端。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/f10306d64ea86cced3a622e15c67d24ead2032.jpg)

## 6.2 Gateway 模式

还可以决定将数据发送到另一个 OpenTelemetry 收集器，然后从（中心）收集器进一步将数据发送到存储后端。在这种配置中，我们有一个中心的 OpenTelemetry 收集器，它使用 deployment 模式部署，具有许多优势，如自动扩展。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/34ea76376cb16287c20317c77bd0aebb38a965.jpg)

使用中心收集器的一些优点是：

- 消除对团队的依赖
- 强制执行批处理、重试、加密、压缩的配置/策略
- 在中心位置进行身份验证
- 丰富的元数据信息
- 进行抽样决策
- 通过 HPA 进行扩展

## 6.3 部署模式总结

下面我们总结下常见的一些部署策略。

**基本版 **

客户端使用 OTLP 进行检测，将数据发送到一组收集器。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/9723fe873d389fce5c8352e1b4e0a22c72232d.jpg)

可以将数据发送到多个导出器。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/143c8df5258a9be8d34854849436f586328b89.jpg)

在 Kubernetes 上部署 OpenTelemetry Collector 时可以使用的模式。

**sidecar 模式：**

![image-20231220211251487](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231220211251487.png)

代理作为 sidecar，其中使用 OpenTelemetry Collector 将容器添加到工作负载 Pod。然后，该实例被配置为将数据发送到可能位于不同命名空间或集群中的外部收集器。

**daemonset 模式**

Agent 作为 DaemonSet，这样我们每个 Kubernetes 节点就有一个代理 pod。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/562fbbf59207d65a1e332711d0a22197991271.jpg)

**负载均衡**

基于 trace id 的负载均衡：

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/e550d0c80f60d3970de194409ba156067524d1.png)

**多集群模式**

 代理、工作负载和控制平面收集器：

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/826052503c81b581bc286836a0e0fde8197bf3.png)

**多租户模式**

两个租户，每个租户都有自己的 Jaeger。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/7431733335946eb8b2c72877aef94826b34b76.jpg)

**信号模式**

两个收集器，每个收集器对应一种遥测数据类型。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/06b158395b256186f7e8379f165382b7ddfcbc.png)

# 七、OpenTelemetry 后端

OpenTelemetry 收集器并不提供自己的后端，所以可以使用任何供应商或开源产品！

>尽管 OpenTelemetry 不提供自己的后端，但通过使用它，我们不会依赖于任何工具或供应商，因为它与供应商无关。我们不仅可以使用我们想要的任何编程语言，而且还可以选择存储后端，并且只需配置另一个导出器即可轻松切换到另一个后端/供应商。

为了可视化和分析遥测数据，我们只需要在 OpenTelemetry 采集器中配置一个导出器。

比如 Jaeger 就是一个非常流行的用于分析和查询数据的开源产品。

![img](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/750e7a271b80620eb495180a71457ebc48f281.png)

我们可以在 OpenTelemetry 收集器中配置 Jaeger 导出器，以便将数据发送到 Jaeger。

~~~powershell
exporters:
  jaeger:
    endpoint: "http://localhost:14250"
~~~

# 八、在K8S集群中安装OpenTelemetry

## 8.1 OpenTelemetry Operator 介绍

OpenTelemetry Operator是一个为了简化 OpenTelemetry 组件在 Kubernetes 环境中的部署和管理而设计的 Kubernetes Operator。

OpenTelemetry Operator 通过 CRD（OpenTelemetryCollector、Instrumentation、OpAMPBridge） 实现在 Kubernetes 集群中自动部署和管理 OpenTelemetry Collector；在工作负载中自动安装 OpenTelemetry 探针。

## 8.2 负载均衡器metallb部署

### 8.2.1 修改kube-proxy代理模式

~~~powershell
# kubectl get configmap -n kube-system
NAME                                                   DATA   AGE
......
kube-proxy                                             2      35h
~~~

~~~powershell
# kubectl edit configmap kube-proxy -n kube-system
   ipvs:
      excludeCIDRs: null
      minSyncPeriod: 0s
      scheduler: ""
      strictARP: true 由原来的flase修改为true
      syncPeriod: 0s
      tcpFinTimeout: 0s
      tcpTimeout: 0s
      udpTimeout: 0s
    kind: KubeProxyConfiguration
    logging:
      flushFrequency: 0
      options:
        json:
          infoBufferSize: "0"
      verbosity: 0
    metricsBindAddress: ""
    mode: "ipvs" 默认为空，添加ipvs
~~~

~~~powershell
# kubectl rollout restart daemonset kube-proxy -n kube-system
~~~

### 8.2.2 metallb部署 

#### 8.2.2.1 metallb部署

![image-20231013093528604](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231013093528604.png)

![image-20231013093709673](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231013093709673.png)

~~~powershell
# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.11/config/manifests/metallb-native.yaml
~~~

#### 8.2.2.2 IP地址池准备

~~~powershell
# vim ippool.yaml
# cat ippool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: first-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.10.240-192.168.10.250
~~~

~~~powershell
# kubectl apply -f ippool.yaml
~~~

#### 8.2.2.3 开启二层通告

~~~powershell
# vim l2.yaml
# cat l2.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: example
  namespace: metallb-system
~~~

~~~powershell
# kubectl apply -f l2.yaml
~~~

## 8.3 OpenTelemetry 后端 jaeger部署

为了便于演示这里使用 jaegertracing/all-in-one 镜像来部署 Jaeger，这个镜像包含了 Jaeger 收集器、内存存储、查询服务和 UI 等组件，非常适合开发和测试使用。

通过环境变量 COLLECTOR_OTLP_ENABLED 启动对 OTLP（OpenTelemetry Protocol）的支持。

~~~powershell
# vim jaeger.yaml
# cat > jaeger.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:latest
        env:
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
        ports:
        - containerPort: 16686
        - containerPort: 14268
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
spec:
  selector:
    app: jaeger
  type: LoadBalancer
  ports:
    - name: ui
      port: 16686
      targetPort: 16686
    - name: collector
      port: 14268
      targetPort: 14268
    - name: http
      protocol: TCP
      port: 4318
      targetPort: 4318
    - name: grpc
      protocol: TCP
      port: 4317
      targetPort: 4317
EOF
~~~

~~~powershell
# kubectl apply -f jaeger.yaml
deployment.apps/jaeger created
service/jaeger created
~~~

~~~powershell
# kubectl get service
NAME         TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                                                         AGE
jaeger       LoadBalancer   10.111.96.244   192.168.10.241   16686:32520/TCP,14268:31845/TCP,4318:30086/TCP,4317:32169/TCP   68s
~~~

![image-20231214165224041](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231214165224041.png)

## 8.4 cert-manager安装

Otel Operator 依赖 cert-manager 进行证书的管理，安装 operator 之前需要安装 cert-manager。

~~~powershell
# kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
~~~

~~~powershell
# # kubectl get ns
NAME                            STATUS   AGE
......
cert-manager                    Active   20s
~~~

~~~powershell
# kubectl get pods -n cert-manager
NAME                                      READY   STATUS    RESTARTS   AGE
cert-manager-7d75f47cc5-mfdgl             1/1     Running   0          21s
cert-manager-cainjector-c778d44d8-ql2kq   1/1     Running   0          21s
cert-manager-webhook-55d76f97bb-k66gb     1/1     Running   0          21s
~~~

## 8.5 部署OpenTelemetry Operator

~~~powershell
# wget https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml
~~~

~~~powershell
# kubectl apply -f opentelemetry-operator.yaml
~~~

~~~powershell
# kubectl get ns
NAME                            STATUS   AGE
......
opentelemetry-operator-system   Active   32s
~~~

~~~powershell
# kubectl get pods -n opentelemetry-operator-system
NAME                                                         READY   STATUS    RESTARTS   AGE
opentelemetry-operator-controller-manager-799f946479-x9qc9   2/2     Running   0          30s
~~~

~~~powershell
# kubectl get svc -n opentelemetry-operator-system
NAME                                                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
opentelemetry-operator-controller-manager-metrics-service   ClusterIP   10.109.145.154   <none>        8443/TCP  33s
opentelemetry-operator-webhook-service                      ClusterIP   10.111.240.117   <none>        443/TCP    32s
~~~

## 8.6 部署OpenTelemetry Collector

通过创建 CR OpenTelemetry Collector 来配置 Otel 的采集器,Collector 部署的四种部署模型 Deployment、DaemonSet、StatefulSet、Sidecar，默认为 Deployment。

otel 接收器：支持 grpc（端口 4317）和 http（端口 4318）
memory_limiter 和 batch 处理器，但是为了方便快速查看数据，这两个并没有启用，仅作展示用。
debug 和 otlp/jaeger 的输出器，分别用于在标准输出中打印信息和使用 otlp 协议输出到 Jaeger。
pipeline 服务，用于配置跟踪数据的处理流程：接收、处理和输出。

~~~powershell
# cat > opentelemetrycollector.yaml << EOF
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel
spec:
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
          http:
    processors:
      memory_limiter:
        check_interval: 1s
        limit_percentage: 75
        spike_limit_percentage: 15
      batch:
        send_batch_size: 10000
        timeout: 10s

    exporters:
      debug:
      otlp/jaeger:
        endpoint: "jaeger.default.svc.cluster.local.:4317"
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: []
          exporters: [debug,otlp/jaeger]
EOF
~~~

~~~powershell
# kubectl apply -f otc.yaml
opentelemetrycollector.opentelemetry.io/otel created
~~~

创建 CR OpenTelemetry Collector 后，Otel Operator 会创建一个 deployment 和 多个 service。

~~~powershell
# kubectl get pods
NAME                              READY   STATUS    RESTARTS   AGE
jaeger-66d4f7f6cf-dh5nr           1/1     Running   0          41m
otel-collector-5b74b97df5-bkrdj   1/1     Running   0          6s
~~~

~~~powershell
# kubectl get deployment
NAME             READY   UP-TO-DATE   AVAILABLE   AGE
otel-collector   1/1     1            1          15s
~~~

~~~powershell
# kubectl get service
NAME                        TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                                                         AGE

......
otel-collector              ClusterIP      10.107.67.11    <none>           4317/TCP,4318/TCP                                               17s
otel-collector-headless     ClusterIP      None            <none>           4317/TCP,4318/TCP                                               17s
otel-collector-monitoring   ClusterIP      10.111.89.46    <none>           8888/TCP                                                        17s
~~~

## 8.7 配置 Instrumentation（插桩）

Instrumentation 是 Otel Operator 的另一个 CRD，用于自动安装 Otel 探针和配置：

- propagators 用于配置跟踪信息在上下文的传递方式。
- sampler 采样器
- env 和 [language].env 添加到容器的环境变量

~~~powershell
# cat > instrumentation.yaml << EOF
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: instrumentation-sample
spec:
  propagators:
    - tracecontext
    - baggage
    - b3
  sampler:
    type: parentbased_traceidratio
    argument: "1"
  env:
    - name: OTEL_EXPORTER_OTLP_ENDPOINT
      value: otel-collector.default.svc.cluster.local.:4318
  java:
    env:
      - name: OTEL_EXPORTER_OTLP_ENDPOINT
        value: http://otel-collector.default.svc.cluster.local.:4317
EOF
~~~

~~~powershell
# kubectl apply -f instrumentation.yaml
instrumentation.opentelemetry.io/instrumentation-sample created
~~~

~~~powershell
# kubectl get instrumentation
NAME                     AGE   ENDPOINT   SAMPLER                    SAMPLER ARG
instrumentation-sample   28s              parentbased_traceidratio   1
~~~

~~~powershell
# kubectl describe instrumentation instrumentation-sample
Name:         instrumentation-sample
Namespace:    default
Labels:       app.kubernetes.io/managed-by=opentelemetry-operator
Annotations:  instrumentation.opentelemetry.io/default-auto-instrumentation-apache-httpd-image:
                ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-apache-httpd:1.0.3
              instrumentation.opentelemetry.io/default-auto-instrumentation-dotnet-image:
                ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-dotnet:1.2.0
              instrumentation.opentelemetry.io/default-auto-instrumentation-go-image:
                ghcr.io/open-telemetry/opentelemetry-go-instrumentation/autoinstrumentation-go:v0.8.0-alpha
              instrumentation.opentelemetry.io/default-auto-instrumentation-java-image:
                ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:1.32.0
              instrumentation.opentelemetry.io/default-auto-instrumentation-nginx-image:
                ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-apache-httpd:1.0.3
              instrumentation.opentelemetry.io/default-auto-instrumentation-nodejs-image:
                ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:0.44.0
              instrumentation.opentelemetry.io/default-auto-instrumentation-python-image:
                ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:0.41b0
API Version:  opentelemetry.io/v1alpha1
Kind:         Instrumentation
Metadata:
  Creation Timestamp:  2023-12-14T09:38:32Z
  Generation:          1
  Resource Version:    257993
  UID:                 84a6daa3-5f12-481c-acc1-14b9ff5694f6
Spec:
  Apache Httpd:
    Config Path:  /usr/local/apache2/conf
    Image:        ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-apache-httpd:1.0.3
    Resource Requirements:
      Limits:
        Cpu:     500m
        Memory:  128Mi
      Requests:
        Cpu:     1m
        Memory:  128Mi
    Version:     2.4
  Dotnet:
    Image:  ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-dotnet:1.2.0
    Resource Requirements:
      Limits:
        Cpu:     500m
        Memory:  128Mi
      Requests:
        Cpu:     50m
        Memory:  128Mi
  Env:
    Name:   OTEL_EXPORTER_OTLP_ENDPOINT
    Value:  otel-collector.default.svc.cluster.local.:4318
  Exporter:
  Go:
    Image:  ghcr.io/open-telemetry/opentelemetry-go-instrumentation/autoinstrumentation-go:v0.8.0-alpha
    Resource Requirements:
      Limits:
        Cpu:     500m
        Memory:  32Mi
      Requests:
        Cpu:     50m
        Memory:  32Mi
  Java:
    Env:
      Name:   OTEL_EXPORTER_OTLP_ENDPOINT
      Value:  http://otel-collector.defaulti.svc.cluster.local.:4317
    Image:    ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:1.32.0
    Resources:
      Limits:
        Cpu:     500m
        Memory:  64Mi
      Requests:
        Cpu:     50m
        Memory:  64Mi
  Nginx:
    Config File:  /etc/nginx/nginx.conf
    Image:        ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-apache-httpd:1.0.3
    Resource Requirements:
      Limits:
        Cpu:     500m
        Memory:  128Mi
      Requests:
        Cpu:     1m
        Memory:  128Mi
  Nodejs:
    Image:  ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:0.44.0
    Resource Requirements:
      Limits:
        Cpu:     500m
        Memory:  128Mi
      Requests:
        Cpu:     50m
        Memory:  128Mi
  Propagators:
    tracecontext
    baggage
    b3
  Python:
    Image:  ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:0.41b0
    Resource Requirements:
      Limits:
        Cpu:     500m
        Memory:  32Mi
      Requests:
        Cpu:     50m
        Memory:  32Mi
  Resource:
  Sampler:
    Argument:  1
    Type:      parentbased_traceidratio
Events:        <none>
~~~

# 九、OpenTelemetry使用案例

## 9.1  JAVA项目案例

为 Pod 添加注解 instrumentation.opentelemetry.io/inject-java: "true" 通知 Otel Operator 该应用的类型以便注入正确的探针。

~~~powershell
# cat > java-sample.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-sample
spec:
  replicas: 1
  selector:
    matchLabels:
      app: java-sample
  template:
    metadata:
      labels:
        app: java-sample
      annotations:
        instrumentation.opentelemetry.io/inject-java: "true"
    spec:
      containers:
      - name: java-sample
        image: pinakispecial/spring-boot-rest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: java-sample
spec:
  type: LoadBalancer
  ports:
  - port: 8080
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: java-sample
EOF
~~~

~~~powershell
# kubectl apply -f java-sample.yaml
deployment.apps/java-sample created
service/java-sample created
~~~

~~~powershell
# kubectl get pods
NAME                              READY   STATUS     RESTARTS   AGE
......
java-sample-6895889c64-4jqnw      0/1     Init:0/1   0          15s
~~~

~~~powershell
# kubectl get pods
NAME                              READY   STATUS    RESTARTS   AGE
......
java-sample-6895889c64-4jqnw      1/1     Running   0          41s
~~~

~~~powershell
# kubectl get service
NAME                        TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                                                         AGE
......
java-sample                 LoadBalancer   10.99.175.163   192.168.10.242   8080:30727/TCP                                                  97s
~~~

~~~powershell
# kubectl get pods java-sample-6895889c64-wx6ns -o yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    cni.projectcalico.org/containerID: a13f4fcd5c7277ca467ae3be00da845944c8959f58bdfe199cf08515a38ef813
    cni.projectcalico.org/podIP: 10.244.69.243/32
    cni.projectcalico.org/podIPs: 10.244.69.243/32
    instrumentation.opentelemetry.io/inject-java: "true"
  creationTimestamp: "2023-12-14T10:12:47Z"
  generateName: java-sample-6895889c64-
  labels:
    app: java-sample
    pod-template-hash: 6895889c64
  name: java-sample-6895889c64-wx6ns
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: java-sample-6895889c64
    uid: fc0a7f47-2dae-4b25-9082-5c6d65216858
  resourceVersion: "269172"
  uid: 4d5f4567-6b85-4194-8922-6940f9d18c87
spec:
  containers:
  - env:
    - name: OTEL_EXPORTER_OTLP_ENDPOINT
      value: http://otel-collector.default.svc.cluster.local.:4317
    - name: JAVA_TOOL_OPTIONS
      value: ' -javaagent:/otel-auto-instrumentation-java/javaagent.jar'
    - name: OTEL_SERVICE_NAME
      value: java-sample
    - name: OTEL_RESOURCE_ATTRIBUTES_POD_NAME
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: metadata.name
    - name: OTEL_RESOURCE_ATTRIBUTES_NODE_NAME
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: spec.nodeName
    - name: OTEL_PROPAGATORS
      value: tracecontext,baggage,b3
    - name: OTEL_TRACES_SAMPLER
      value: parentbased_traceidratio
    - name: OTEL_TRACES_SAMPLER_ARG
      value: "1"
    - name: OTEL_RESOURCE_ATTRIBUTES
      value: k8s.container.name=java-sample,k8s.deployment.name=java-sample,k8s.namespace.name=default,k8s.node.name=$(OTEL_RESOURCE_ATTRIBUTES_NODE_NAME),k8s.pod.name=$(OTEL_RESOURCE_ATTRIBUTES_POD_NAME),k8s.replicaset.name=java-sample-6895889c64
    image: pinakispecial/spring-boot-rest
    imagePullPolicy: Always
    name: java-sample
    ports:
    - containerPort: 8080
      protocol: TCP
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-4m4jt
      readOnly: true
    - mountPath: /otel-auto-instrumentation-java
      name: opentelemetry-auto-instrumentation-java
  dnsPolicy: ClusterFirst
  enableServiceLinks: true
  initContainers:
  - command:
    - cp
    - /javaagent.jar
    - /otel-auto-instrumentation-java/javaagent.jar
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:1.32.0
    imagePullPolicy: IfNotPresent
    name: opentelemetry-auto-instrumentation-java
    resources:
      limits:
        cpu: 500m
        memory: 64Mi
      requests:
        cpu: 50m
        memory: 64Mi
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /otel-auto-instrumentation-java
      name: opentelemetry-auto-instrumentation-java
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-4m4jt
      readOnly: true
  nodeName: k8s-worker02
  preemptionPolicy: PreemptLowerPriority
  priority: 0
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - name: kube-api-access-4m4jt
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
  - emptyDir:
      sizeLimit: 200Mi
    name: opentelemetry-auto-instrumentation-java
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: "2023-12-14T10:12:49Z"
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: "2023-12-14T10:12:53Z"
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: "2023-12-14T10:12:53Z"
    status: "True"
    type: ContainersReady
  - lastProbeTime: null
    lastTransitionTime: "2023-12-14T10:12:47Z"
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://f1dde18e580d6574f588ca32c837e95523c848b83ed73b317c5133ffb0dd28be
    image: pinakispecial/spring-boot-rest:latest
    imageID: docker-pullable://pinakispecial/spring-boot-rest@sha256:0e3052dbe6d5fd8935b7f2f344f6241a3117b4fe86cb86ac3d1451b9117d4af0
    lastState: {}
    name: java-sample
    ready: true
    restartCount: 0
    started: true
    state:
      running:
        startedAt: "2023-12-14T10:12:52Z"
  hostIP: 192.168.10.164
  initContainerStatuses:
  - containerID: docker://3543870aeebd02fd4494181d73e93070848ef23cb8b85377777d183fd8925097
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:1.32.0
    imageID: docker-pullable://ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java@sha256:4e5b3cbc3d89ead3bf21b271e02bf241ebbfca1bdf061f781cabcc490549bf0c
    lastState: {}
    name: opentelemetry-auto-instrumentation-java
    ready: true
    restartCount: 0
    started: false
    state:
      terminated:
        containerID: docker://3543870aeebd02fd4494181d73e93070848ef23cb8b85377777d183fd8925097
        exitCode: 0
        finishedAt: "2023-12-14T10:12:48Z"
        reason: Completed
        startedAt: "2023-12-14T10:12:48Z"
  phase: Running
  podIP: 10.244.69.243
  podIPs:
  - ip: 10.244.69.243
  qosClass: Burstable
  startTime: "2023-12-14T10:12:47Z"
~~~

可以看到 Otel Operator 向 Pod 中注入了一个 otel 的初始化容器。

~~~powershell
# kubectl describe pods java-sample-6895889c64-d9qpd
Name:             java-sample-6895889c64-d9qpd
Namespace:        default
Priority:         0
Service Account:  default
Node:             k8s-worker02/192.168.10.164
Start Time:       Thu, 14 Dec 2023 18:18:35 +0800
Labels:           app=java-sample
                  pod-template-hash=6895889c64
Annotations:      cni.projectcalico.org/containerID: 16f8dbbc0a97b96009a1f991af8f698f8ed7717195564aa927f396db98eaa269
                  cni.projectcalico.org/podIP: 10.244.69.244/32
                  cni.projectcalico.org/podIPs: 10.244.69.244/32
                  instrumentation.opentelemetry.io/inject-java: true
Status:           Running
IP:               10.244.69.244
IPs:
  IP:           10.244.69.244
Controlled By:  ReplicaSet/java-sample-6895889c64
Init Containers:
  opentelemetry-auto-instrumentation-java:
    Container ID:  docker://6c8c3a35c2193d93a61150812132e67416b24b8d0833b79ea8d2a225273de40f
    Image:         ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:1.32.0
    Image ID:      docker-pullable://ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java@sha256:4e5b3cbc3d89ead3bf21b271e02bf241ebbfca1bdf061f781cabcc490549bf0c
    Port:          <none>
    Host Port:     <none>
    Command:
      cp
      /javaagent.jar
      /otel-auto-instrumentation-java/javaagent.jar
    State:          Terminated
      Reason:       Completed
      Exit Code:    0
      Started:      Thu, 14 Dec 2023 18:18:36 +0800
      Finished:     Thu, 14 Dec 2023 18:18:36 +0800
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     500m
      memory:  64Mi
    Requests:
      cpu:        50m
      memory:     64Mi
    Environment:  <none>
    Mounts:
      /otel-auto-instrumentation-java from opentelemetry-auto-instrumentation-java (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-5wphg (ro)
Containers:
  java-sample:
    Container ID:   docker://b5e00c3c8428cbb7118c39aaeeb06214d1e825b677ec86a0923fdf8671ce9d5e
    Image:          pinakispecial/spring-boot-rest
    Image ID:       docker-pullable://pinakispecial/spring-boot-rest@sha256:0e3052dbe6d5fd8935b7f2f344f6241a3117b4fe86cb86ac3d1451b9117d4af0
    Port:           8080/TCP
    Host Port:      0/TCP
    State:          Running
      Started:      Thu, 14 Dec 2023 18:18:46 +0800
    Ready:          True
    Restart Count:  0
    Environment:
      OTEL_EXPORTER_OTLP_ENDPOINT:         http://otel-collector.default.svc.cluster.local.:4317
      JAVA_TOOL_OPTIONS:                    -javaagent:/otel-auto-instrumentation-java/javaagent.jar
      OTEL_SERVICE_NAME:                   java-sample
      OTEL_RESOURCE_ATTRIBUTES_POD_NAME:   java-sample-6895889c64-d9qpd (v1:metadata.name)
      OTEL_RESOURCE_ATTRIBUTES_NODE_NAME:   (v1:spec.nodeName)
      OTEL_PROPAGATORS:                    tracecontext,baggage,b3
      OTEL_TRACES_SAMPLER:                 parentbased_traceidratio
      OTEL_TRACES_SAMPLER_ARG:             1
      OTEL_RESOURCE_ATTRIBUTES:            k8s.container.name=java-sample,k8s.deployment.name=java-sample,k8s.namespace.name=default,k8s.node.name=$(OTEL_RESOURCE_ATTRIBUTES_NODE_NAME),k8s.pod.name=$(OTEL_RESOURCE_ATTRIBUTES_POD_NAME),k8s.replicaset.name=java-sample-6895889c64
    Mounts:
      /otel-auto-instrumentation-java from opentelemetry-auto-instrumentation-java (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-5wphg (ro)
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Volumes:
  kube-api-access-5wphg:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    ConfigMapOptional:       <nil>
    DownwardAPI:             true
  opentelemetry-auto-instrumentation-java:
    Type:        EmptyDir (a temporary directory that shares a pod's lifetime)
    Medium:
    SizeLimit:   200Mi
QoS Class:       Burstable
Node-Selectors:  <none>
Tolerations:     node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                 node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  2m53s  default-scheduler  Successfully assigned default/java-sample-6895889c64-d9qpd to k8s-worker02
  Normal  Pulled     2m52s  kubelet            Container image "ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:1.32.0" already present on machine
  Normal  Created    2m52s  kubelet            Created container opentelemetry-auto-instrumentation-java
  Normal  Started    2m52s  kubelet            Started container opentelemetry-auto-instrumentation-java
  Normal  Pulling    2m51s  kubelet            Pulling image "pinakispecial/spring-boot-rest"
  Normal  Pulled     2m42s  kubelet            Successfully pulled image "pinakispecial/spring-boot-rest" in 8.986s (8.986s including waiting)
  Normal  Created    2m42s  kubelet            Created container java-sample
  Normal  Started    2m42s  kubelet            Started container java-sample
~~~

在 java 容器中注入了一系列的环境变量进行配置。

![image-20231214181927842](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231214181927842.png)

![image-20231214182012987](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231214182012987.png)

## 9.2  Go项目案例

~~~powershell
# cd http-sample/

# ls
Dockerfile  go.mod  go.sum  main.go  manifests  otel.go  README.md
~~~

~~~powershell
# cat > Dockerfile <<EOF
FROM --platform=$BUILDPLATFORM golang:1.21.4 as builder
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
ENV GOPROXY=https://goproxy.cn,direct
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -a -installsuffix cgo -o main .

FROM --platform=$BUILDPLATFORM golang:1.21.4
WORKDIR /
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
EOF
~~~

~~~powershell
# cat > go.mod <<EOF
module http-sample

go 1.21.4

require (
        go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.46.1
        go.opentelemetry.io/otel v1.21.0
        go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp v0.44.0
        go.opentelemetry.io/otel/exporters/otlp/otlptrace v1.21.0
        go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.21.0
        go.opentelemetry.io/otel/sdk v1.21.0
        go.opentelemetry.io/otel/sdk/metric v1.21.0
)

require (
        github.com/cenkalti/backoff/v4 v4.2.1 // indirect
        github.com/felixge/httpsnoop v1.0.4 // indirect
        github.com/go-logr/logr v1.3.0 // indirect
        github.com/go-logr/stdr v1.2.2 // indirect
        github.com/golang/protobuf v1.5.3 // indirect
        github.com/grpc-ecosystem/grpc-gateway/v2 v2.16.0 // indirect
        go.opentelemetry.io/contrib/propagators/b3 v1.21.1 // indirect
        go.opentelemetry.io/contrib/propagators/jaeger v1.21.1 // indirect
        go.opentelemetry.io/otel/metric v1.21.0 // indirect
        go.opentelemetry.io/otel/trace v1.21.0 // indirect
        go.opentelemetry.io/proto/otlp v1.0.0 // indirect
        golang.org/x/net v0.17.0 // indirect
        golang.org/x/sys v0.14.0 // indirect
        golang.org/x/text v0.13.0 // indirect
        google.golang.org/genproto/googleapis/api v0.0.0-20230822172742-b8732ec3820d // indirect
        google.golang.org/genproto/googleapis/rpc v0.0.0-20230822172742-b8732ec3820d // indirect
        google.golang.org/grpc v1.59.0 // indirect
        google.golang.org/protobuf v1.31.0 // indirect
)
EOF
~~~

~~~powershell
# cat > go.sum <<EOF
github.com/cenkalti/backoff/v4 v4.2.1 h1:y4OZtCnogmCPw98Zjyt5a6+QwPLGkiQsYW5oUqylYbM=
github.com/cenkalti/backoff/v4 v4.2.1/go.mod h1:Y3VNntkOUPxTVeUxJ/G5vcM//AlwfmyYozVcomhLiZE=
github.com/davecgh/go-spew v1.1.1 h1:vj9j/u1bqnvCEfJOwUhtlOARqs3+rkHYY13jYWTU97c=
github.com/davecgh/go-spew v1.1.1/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/felixge/httpsnoop v1.0.4 h1:NFTV2Zj1bL4mc9sqWACXbQFVBBg2W3GPvqp8/ESS2Wg=
github.com/felixge/httpsnoop v1.0.4/go.mod h1:m8KPJKqk1gH5J9DgRY2ASl2lWCfGKXixSwevea8zH2U=
github.com/go-logr/logr v1.2.2/go.mod h1:jdQByPbusPIv2/zmleS9BjJVeZ6kBagPoEUsqbVz/1A=
github.com/go-logr/logr v1.3.0 h1:2y3SDp0ZXuc6/cjLSZ+Q3ir+QB9T/iG5yYRXqsagWSY=
github.com/go-logr/logr v1.3.0/go.mod h1:9T104GzyrTigFIr8wt5mBrctHMim0Nb2HLGrmQ40KvY=
github.com/go-logr/stdr v1.2.2 h1:hSWxHoqTgW2S2qGc0LTAI563KZ5YKYRhT3MFKZMbjag=
github.com/go-logr/stdr v1.2.2/go.mod h1:mMo/vtBO5dYbehREoey6XUKy/eSumjCCveDpRre4VKE=
github.com/golang/glog v1.1.2 h1:DVjP2PbBOzHyzA+dn3WhHIq4NdVu3Q+pvivFICf/7fo=
github.com/golang/glog v1.1.2/go.mod h1:zR+okUeTbrL6EL3xHUDxZuEtGv04p5shwip1+mL/rLQ=
github.com/golang/protobuf v1.5.0/go.mod h1:FsONVRAS9T7sI+LIUmWTfcYkHO4aIWwzhcaSAoJOfIk=
github.com/golang/protobuf v1.5.3 h1:KhyjKVUg7Usr/dYsdSqoFveMYd5ko72D+zANwlG1mmg=
github.com/golang/protobuf v1.5.3/go.mod h1:XVQd3VNwM+JqD3oG2Ue2ip4fOMUkwXdXDdiuN0vRsmY=
github.com/google/go-cmp v0.5.5/go.mod h1:v8dTdLbMG2kIc/vJvl+f65V22dbkXbowE6jgT/gNBxE=
github.com/google/go-cmp v0.6.0 h1:ofyhxvXcZhMsU5ulbFiLKl/XBFqE1GSq7atu8tAmTRI=
github.com/google/go-cmp v0.6.0/go.mod h1:17dUlkBOakJ0+DkrSSNjCkIjxS6bF9zb3elmeNGIjoY=
github.com/grpc-ecosystem/grpc-gateway/v2 v2.16.0 h1:YBftPWNWd4WwGqtY2yeZL2ef8rHAxPBD8KFhJpmcqms=
github.com/grpc-ecosystem/grpc-gateway/v2 v2.16.0/go.mod h1:YN5jB8ie0yfIUg6VvR9Kz84aCaG7AsGZnLjhHbUqwPg=
github.com/pmezard/go-difflib v1.0.0 h1:4DBwDE0NGyQoBHbLQYPwSUPoCMWR5BEzIk/f1lZbAQM=
github.com/pmezard/go-difflib v1.0.0/go.mod h1:iKH77koFhYxTK1pcRnkKkqfTogsbg7gZNVY4sRDYZ/4=
github.com/stretchr/testify v1.8.4 h1:CcVxjf3Q8PM0mHUKJCdn+eZZtm5yQwehR5yeSVQQcUk=
github.com/stretchr/testify v1.8.4/go.mod h1:sz/lmYIOXD/1dqDmKjjqLyZ2RngseejIcXlSw2iwfAo=
go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.46.1 h1:aFJWCqJMNjENlcleuuOkGAPH82y0yULBScfXcIEdS24=
go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.46.1/go.mod h1:sEGXWArGqc3tVa+ekntsN65DmVbVeW+7lTKTjZF3/Fo=
go.opentelemetry.io/contrib/propagators/b3 v1.21.1 h1:WPYiUgmw3+b7b3sQ1bFBFAf0q+Di9dvNc3AtYfnT4RQ=
go.opentelemetry.io/contrib/propagators/b3 v1.21.1/go.mod h1:EmzokPoSqsYMBVK4nRnhsfm5mbn8J1eDuz/U1UaQaWg=
go.opentelemetry.io/contrib/propagators/jaeger v1.21.1 h1:f4beMGDKiVzg9IcX7/VuWVy+oGdjx3dNJ72YehmtY5k=
go.opentelemetry.io/contrib/propagators/jaeger v1.21.1/go.mod h1:U9jhkEl8d1LL+QXY7q3kneJWJugiN3kZJV2OWz3hkBY=
go.opentelemetry.io/otel v1.21.0 h1:hzLeKBZEL7Okw2mGzZ0cc4k/A7Fta0uoPgaJCr8fsFc=
go.opentelemetry.io/otel v1.21.0/go.mod h1:QZzNPQPm1zLX4gZK4cMi+71eaorMSGT3A4znnUvNNEo=
go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp v0.44.0 h1:bflGWrfYyuulcdxf14V6n9+CoQcu5SAAdHmDPAJnlps=
go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp v0.44.0/go.mod h1:qcTO4xHAxZLaLxPd60TdE88rxtItPHgHWqOhOGRr0as=
go.opentelemetry.io/otel/exporters/otlp/otlptrace v1.21.0 h1:cl5P5/GIfFh4t6xyruOgJP5QiA1pw4fYYdv6nc6CBWw=
go.opentelemetry.io/otel/exporters/otlp/otlptrace v1.21.0/go.mod h1:zgBdWWAu7oEEMC06MMKc5NLbA/1YDXV1sMpSqEeLQLg=
go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.21.0 h1:digkEZCJWobwBqMwC0cwCq8/wkkRy/OowZg5OArWZrM=
go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.21.0/go.mod h1:/OpE/y70qVkndM0TrxT4KBoN3RsFZP0QaofcfYrj76I=
go.opentelemetry.io/otel/metric v1.21.0 h1:tlYWfeo+Bocx5kLEloTjbcDwBuELRrIFxwdQ36PlJu4=
go.opentelemetry.io/otel/metric v1.21.0/go.mod h1:o1p3CA8nNHW8j5yuQLdc1eeqEaPfzug24uvsyIEJRWM=
go.opentelemetry.io/otel/sdk v1.21.0 h1:FTt8qirL1EysG6sTQRZ5TokkU8d0ugCj8htOgThZXQ8=
go.opentelemetry.io/otel/sdk v1.21.0/go.mod h1:Nna6Yv7PWTdgJHVRD9hIYywQBRx7pbox6nwBnZIxl/E=
go.opentelemetry.io/otel/sdk/metric v1.21.0 h1:smhI5oD714d6jHE6Tie36fPx4WDFIg+Y6RfAY4ICcR0=
go.opentelemetry.io/otel/sdk/metric v1.21.0/go.mod h1:FJ8RAsoPGv/wYMgBdUJXOm+6pzFY3YdljnXtv1SBE8Q=
go.opentelemetry.io/otel/trace v1.21.0 h1:WD9i5gzvoUPuXIXH24ZNBudiarZDKuekPqi/E8fpfLc=
go.opentelemetry.io/otel/trace v1.21.0/go.mod h1:LGbsEB0f9LGjN+OZaQQ26sohbOmiMR+BaslueVtS/qQ=
go.opentelemetry.io/proto/otlp v1.0.0 h1:T0TX0tmXU8a3CbNXzEKGeU5mIVOdf0oykP+u2lIVU/I=
go.opentelemetry.io/proto/otlp v1.0.0/go.mod h1:Sy6pihPLfYHkr3NkUbEhGHFhINUSI/v80hjKIs5JXpM=
golang.org/x/net v0.17.0 h1:pVaXccu2ozPjCXewfr1S7xza/zcXTity9cCdXQYSjIM=
golang.org/x/net v0.17.0/go.mod h1:NxSsAGuq816PNPmqtQdLE42eU2Fs7NoRIZrHJAlaCOE=
golang.org/x/sys v0.14.0 h1:Vz7Qs629MkJkGyHxUlRHizWJRG2j8fbQKjELVSNhy7Q=
golang.org/x/sys v0.14.0/go.mod h1:/VUhepiaJMQUp4+oa/7Zr1D23ma6VTLIYjOOTFZPUcA=
golang.org/x/text v0.13.0 h1:ablQoSUd0tRdKxZewP80B+BaqeKJuVhuRxj/dkrun3k=
golang.org/x/text v0.13.0/go.mod h1:TvPlkZtksWOMsz7fbANvkp4WM8x/WCo/om8BMLbz+aE=
golang.org/x/xerrors v0.0.0-20191204190536-9bdfabe68543/go.mod h1:I/5z698sn9Ka8TeJc9MKroUUfqBBauWjQqLJ2OPfmY0=
google.golang.org/genproto v0.0.0-20230822172742-b8732ec3820d h1:VBu5YqKPv6XiJ199exd8Br+Aetz+o08F+PLMnwJQHAY=
google.golang.org/genproto v0.0.0-20230822172742-b8732ec3820d/go.mod h1:yZTlhN0tQnXo3h00fuXNCxJdLdIdnVFVBaRJ5LWBbw4=
google.golang.org/genproto/googleapis/api v0.0.0-20230822172742-b8732ec3820d h1:DoPTO70H+bcDXcd39vOqb2viZxgqeBeSGtZ55yZU4/Q=
google.golang.org/genproto/googleapis/api v0.0.0-20230822172742-b8732ec3820d/go.mod h1:KjSP20unUpOx5kyQUFa7k4OJg0qeJ7DEZflGDu2p6Bk=
google.golang.org/genproto/googleapis/rpc v0.0.0-20230822172742-b8732ec3820d h1:uvYuEyMHKNt+lT4K3bN6fGswmK8qSvcreM3BwjDh+y4=
google.golang.org/genproto/googleapis/rpc v0.0.0-20230822172742-b8732ec3820d/go.mod h1:+Bk1OCOj40wS2hwAMA+aCW9ypzm63QTBBHp6lQ3p+9M=
google.golang.org/grpc v1.59.0 h1:Z5Iec2pjwb+LEOqzpB2MR12/eKFhDPhuqW91O+4bwUk=
google.golang.org/grpc v1.59.0/go.mod h1:aUPDwccQo6OTjy7Hct4AfBPD1GptF4fyUjIkQ9YtF98=
google.golang.org/protobuf v1.26.0-rc.1/go.mod h1:jlhhOSvTdKEhbULTjvd4ARK9grFBp09yW+WbY/TyQbw=
google.golang.org/protobuf v1.26.0/go.mod h1:9q0QmTI4eRPtz6boOQmLYwt+qCgq0jsYwAQnmE0givc=
google.golang.org/protobuf v1.31.0 h1:g0LDEJHgrBl9N9r17Ru3sqWhkIx2NB67okBHPwC7hs8=
google.golang.org/protobuf v1.31.0/go.mod h1:HV8QOd/L58Z+nl8r43ehVNZIU/HEI6OcFqwMG9pJV4I=
gopkg.in/yaml.v3 v3.0.1 h1:fxVm/GzAzEWqLHuvctI91KS9hhNmmWOoWu0XTYJS7CA=
gopkg.in/yaml.v3 v3.0.1/go.mod h1:K4uyk7z7BCEPqu6E+C64Yfv1cQ7kz7rIZviUmN+EgEM=
EOF
~~~

~~~powershell
# cat > main.go <<EOF
package main

import (
        "context"
        "errors"
        "fmt"
        "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
        "io/ioutil"
        "net"
        "net/http"
        "os"
        "os/signal"
        "time"
)

const (
        IdentityHeader = "Identity"
        App            = "app"
        Version        = "version"
        Upstream       = "upstream"
        Port           = "port"
)

var upstream = os.Getenv(Upstream)
var appName = os.Getenv(App)
var version = os.Getenv(Version)
var port = os.Getenv(Port)

func main() {
        if port == "" {
                port = "8080"
        }

        // Handle SIGINT (CTRL+C) gracefully.
        ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
        defer stop()

        // Set up OpenTelemetry.
        otelShutdown, err := setupOTelSDK(ctx, appName, version)

        // Handle shutdown properly so nothing leaks.
        defer func() {
                err = errors.Join(err, otelShutdown(context.Background()))
        }()

        // Start HTTP server.
        srv := &http.Server{
                Addr:         ":" + port,
                Handler:      newHTTPHandler(),
                WriteTimeout: 10 * time.Second,
                BaseContext:  func(_ net.Listener) context.Context { return ctx },
        }

        srvErr := make(chan error, 1)
        go func() {
                srvErr <- srv.ListenAndServe()
        }()

        // Wait for interruption.
        select {
        case err = <-srvErr:
                // Error when starting HTTP server.
                return
        case <-ctx.Done():
                // Wait for first CTRL+C.
                // Stop receiving signal notifications as soon as possible.
                stop()
        }

        // When Shutdown is called, ListenAndServe immediately returns ErrServerClosed.
        err = srv.Shutdown(context.Background())
        return
}

func newHTTPHandler() http.Handler {
        mux := http.NewServeMux()

        // handleFunc is a replacement for mux.HandleFunc
        // which enriches the handler's HTTP instrumentation with the pattern as the http.route.
        handleFunc := func(pattern string, handlerFunc func(http.ResponseWriter, *http.Request)) {
                // Configure the "http.route" for the HTTP instrumentation.
                handler := otelhttp.WithRouteTag(pattern, http.HandlerFunc(handlerFunc))
                mux.Handle(pattern, handler)
        }

        // Register handlers.
        handleFunc("/", handle)

        // Add HTTP instrumentation for the whole server.
        handler := otelhttp.NewHandler(mux, "/")
        return handler
}

func handle(w http.ResponseWriter, r *http.Request) {
        ip, hostname := getIPAndHostname()
        response := fmt.Sprintf("%s(version: %s, ip: %s, hostname: %s)", appName, version, ip, hostname)

        if upstream != "" {
                client := &http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport)}
                req, _ := http.NewRequestWithContext(r.Context(), "GET", upstream, nil)

                for name, value := range getTracingHeaders(r) {
                        req.Header.Set(name, value)
                }

                upstreamResponse, err := client.Do(req)
                if err != nil {
                        fmt.Fprintf(w, "Error contacting upstream service: %v", err)
                        return
                }
                defer upstreamResponse.Body.Close()
                body, err := ioutil.ReadAll(upstreamResponse.Body)
                if err != nil {
                        fmt.Fprintf(w, "Error reading upstream response: %v", err)
                        return
                }
                response += fmt.Sprintf(" -> %s", string(body))
        }

        setHeaders(w, r)
        fmt.Fprintf(w, response)
}

func getIPAndHostname() (string, string) {
        host, _ := os.Hostname()
        addrs, _ := net.LookupIP(host)
        var ip string
        for _, addr := range addrs {
                if ipv4 := addr.To4(); ipv4 != nil {
                        ip = ipv4.String()
                        break
                }
        }
        return ip, host
}

func setHeaders(w http.ResponseWriter, r *http.Request) {
        w.Header().Set(IdentityHeader, os.Getenv(App))

        if r == nil {
                return
        }

        for _, header := range getTracingHeaderKeys() {
                if v := r.Header.Get(header); v != "" {
                        w.Header().Set(header, v)
                }
        }
}

func getTracingHeaderKeys() []string {
        return []string{"X-Ot-Span-Context", "Traceparent", "X-Request-Id", "uber-trace-id", "x-b3-traceid", "x-b3-spanid", "x-b3-parentspanid"}
}

func getTracingHeaders(r *http.Request) map[string]string {
        var headers = map[string]string{}
        for _, key := range getTracingHeaderKeys() {
                if v := r.Header.Get(key); v != "" {
                        headers[key] = v
                }
        }

        return headers
}
EOF
~~~

~~~powershell
# cat > otel.go <<EOF
package main

import (
        "context"
        "errors"
        "fmt"
        "go.opentelemetry.io/contrib/propagators/b3"
        "go.opentelemetry.io/contrib/propagators/jaeger"
        "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
        "go.opentelemetry.io/otel/exporters/otlp/otlptrace"
        "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
        "os"
        "strings"
        "time"

        "go.opentelemetry.io/otel"
        "go.opentelemetry.io/otel/propagation"
        "go.opentelemetry.io/otel/sdk/metric"
        "go.opentelemetry.io/otel/sdk/resource"
        "go.opentelemetry.io/otel/sdk/trace"
        sdktrace "go.opentelemetry.io/otel/sdk/trace"
        semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

const OtelExporterOTLPEndpoints = "OTEL_EXPORTER_OTLP_ENDPOINT"
const OtelPropagators = "OTEL_PROPAGATORS"

// setupOTelSDK bootstraps the OpenTelemetry pipeline.
// If it does not return an error, make sure to call shutdown for proper cleanup.
func setupOTelSDK(ctx context.Context, serviceName, serviceVersion string) (shutdown func(context.Context) error, err error) {
        var shutdownFuncs []func(context.Context) error

        if os.Getenv(OtelExporterOTLPEndpoints) == "" {
                fmt.Println("OTEL_EXPORTER_OTLP_ENDPOINT not provided, skip!!!")
                return
        }

        // shutdown calls cleanup functions registered via shutdownFuncs.
        // The errors from the calls are joined.
        // Each registered cleanup will be invoked once.
        shutdown = func(ctx context.Context) error {
                var err error
                for _, fn := range shutdownFuncs {
                        err = errors.Join(err, fn(ctx))
                }
                shutdownFuncs = nil
                return err
        }

        // handleErr calls shutdown for cleanup and makes sure that all errors are returned.
        handleErr := func(inErr error) {
                err = errors.Join(inErr, shutdown(ctx))
        }

        // Set up resource.
        res, err := newResource(serviceName, serviceVersion)
        if err != nil {
                handleErr(err)
                return
        }

        // Set up propagator.
        prop := newPropagator()
        otel.SetTextMapPropagator(prop)

        // Set up trace provider.
        tracerProvider, err := newTraceProvider(res)
        if err != nil {
                handleErr(err)
                return
        }
        shutdownFuncs = append(shutdownFuncs, tracerProvider.Shutdown)
        otel.SetTracerProvider(tracerProvider)

        // Set up meter provider.
        meterProvider, err := newMeterProvider(res)
        if err != nil {
                handleErr(err)
                return
        }
        shutdownFuncs = append(shutdownFuncs, meterProvider.Shutdown)
        otel.SetMeterProvider(meterProvider)

        return
}

func newResource(serviceName, serviceVersion string) (*resource.Resource, error) {
        return resource.Merge(resource.Default(),
                resource.NewWithAttributes(semconv.SchemaURL,
                        semconv.ServiceName(serviceName),
                        semconv.ServiceVersion(serviceVersion),
                ))
}

func newPropagator() propagation.TextMapPropagator {
        propagatorString := os.Getenv(OtelPropagators)
        var propagators []propagation.TextMapPropagator
        if propagatorString != "" {
                for _, p := range strings.Split(propagatorString, ",") {
                        switch p {
                        case "tracecontext":
                                propagators = append(propagators, propagation.TraceContext{})
                        case "b3":
                                propagators = append(propagators, b3.New(b3.WithInjectEncoding(b3.B3SingleHeader)))
                        case "b3multi":
                                propagators = append(propagators, b3.New(b3.WithInjectEncoding(b3.B3MultipleHeader)))
                        case "baggage":
                                propagators = append(propagators, propagation.Baggage{})
                        case "jaeger":
                                propagators = append(propagators, jaeger.Jaeger{})
                        }
                }
        }
        if len(propagators) == 0 {
                propagators = append(propagators, b3.New(b3.WithInjectEncoding(b3.B3SingleHeader)))
        }
        return propagation.NewCompositeTextMapPropagator(propagators...)
}

func newTraceProvider(res *resource.Resource) (*trace.TracerProvider, error) {
        traceExporter, err := newTraceExporter()
        if err != nil {
                return nil, fmt.Errorf("failed to create trace provider: %w", err)
        }

        bsp := sdktrace.NewBatchSpanProcessor(traceExporter)
        tracerProvider := sdktrace.NewTracerProvider(
                sdktrace.WithSampler(sdktrace.AlwaysSample()),
                sdktrace.WithResource(res),
                sdktrace.WithSpanProcessor(bsp),
        )
        return tracerProvider, nil
}

func newTraceExporter() (*otlptrace.Exporter, error) {
        ctx := context.Background()

        ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
        defer cancel()
        traceExporter, err := otlptracehttp.New(ctx, otlptracehttp.WithEndpoint(os.Getenv(OtelExporterOTLPEndpoints)), otlptracehttp.WithInsecure())
        if err != nil {
                return nil, fmt.Errorf("failed to create trace exporter: %w", err)
        }
        return traceExporter, nil
}

func newMeterProvider(res *resource.Resource) (*metric.MeterProvider, error) {
        metricExporter, err := newMetricExporter()
        if err != nil {
                return nil, fmt.Errorf("failed to create meter provider: %w", err)
        }

        meterProvider := metric.NewMeterProvider(
                metric.WithResource(res),
                metric.WithReader(metric.NewPeriodicReader(metricExporter,
                        // Default is 1m. Set to 5s for demonstrative purposes.
                        metric.WithInterval(5*time.Second))),
        )
        return meterProvider, nil
}

func newMetricExporter() (*otlpmetrichttp.Exporter, error) {
        ctx := context.Background()

        ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
        defer cancel()

        metricExporter, err := otlpmetrichttp.New(ctx, otlpmetrichttp.WithEndpoint(os.Getenv(OtelExporterOTLPEndpoints)), otlpmetrichttp.WithInsecure())
        if err != nil {
                return nil, fmt.Errorf("failed to create metrics exporter: %w", err)
        }

        return metricExporter, nil
}
EOF
~~~

>这段代码是一个使用 Go 语言编写的 OpenTelemetry SDK 设置和初始化函数。其主要功能是配置和启动一个完整的 OpenTelemetry 监控管道，包括资源定义、传播器设置、跟踪提供者和度量提供者的创建以及相应的 OTLP（OpenTelemetry Protocol）Exporter 的配置。

~~~powershell
# ls manifests/
service-v1.yaml

# cat > manifests/service-v1.yaml <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: service-a
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-a
  labels:
    app: service-a
    version: v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: service-a
  template:
    metadata:
      labels:
        app: service-a
        version: v1
      annotations:
        instrumentation.opentelemetry.io/inject-sdk: "true"
        instrumentation.opentelemetry.io/container-names: "service-a"
    spec:
      serviceAccountName: service-a
      containers:
        - name: service-a
          image: www.kubemsb.com/library/http-sample:v1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          env:
            - name: app
              value: "service-a"
            - name: version
              value: "v1"
            - name: upstream
              value: "http://service-b:8080/"
---
apiVersion: v1
kind: Service
metadata:
  name: service-a
  labels:
    app: service-a
spec:
  type: LoadBalancer
  selector:
    app: service-a
    version: v1
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: service-b
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-b
  labels:
    app: service-b
    version: v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: service-b
  template:
    metadata:
      labels:
        app: service-b
        version: v1
      annotations:
        instrumentation.opentelemetry.io/inject-sdk: "true"
        instrumentation.opentelemetry.io/container-names: "service-b"
    spec:
      serviceAccountName: service-b
      containers:
        - name: service-b
          image: www.kubemsb.com/library/http-sample:v1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          env:
            - name: app
              value: "service-b"
            - name: version
              value: "v1"
            - name: upstream
              value: "http://service-c:8080/"
---
apiVersion: v1
kind: Service
metadata:
  name: service-b
  labels:
    app: service-b
spec:
  type: LoadBalancer
  selector:
    app: service-b
    version: v1
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: service-c
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-c
  labels:
    app: service-c
    version: v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: service-c
  template:
    metadata:
      labels:
        app: service-c
        version: v1
      annotations:
        instrumentation.opentelemetry.io/inject-sdk: "true"
        instrumentation.opentelemetry.io/container-names: "service-c"
    spec:
      serviceAccountName: service-c
      containers:
        - name: service-c
          image: www.kubemsb.com/library/http-sample:v1
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
          env:
            - name: app
              value: "service-c"
            - name: version
              value: "v1"
---
apiVersion: v1
kind: Service
metadata:
  name: service-c
  labels:
    app: service-c
spec:
  type: LoadBalancer
  selector:
    app: service-c
    version: v1
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
EOF
~~~

~~~powershell
# docker build -t www.kubemsb.com/library/http-sample:v1 .
~~~

> 上传到本地镜像仓库更佳。

~~~powershell
# docker save -o http-sample-v1.tar www.kubemsb.com/library/http-sample:v1
~~~

~~~powershell
# for i in 161 162 163 164 ; do scp http-sample-v1.tar 192.168.10.$i:/root; done
~~~

~~~powershell
# kubectl apply -f manifests/service-v1.yaml
~~~

~~~powershell
# kubectl get svc
NAME                        TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                                                         AGE
jaeger                      LoadBalancer   10.111.96.244   192.168.10.241   16686:32520/TCP,14268:31845/TCP,4318:30086/TCP,4317:32169/TCP   6h25m
java-sample                 LoadBalancer   10.98.13.169    192.168.10.242   8080:30614/TCP                                                  4h47m
kubernetes                  ClusterIP      10.96.0.1       <none>           443/TCP                                                         6d2h
otel-collector              ClusterIP      10.107.67.11    <none>           4317/TCP,4318/TCP                                               5h44m
otel-collector-headless     ClusterIP      None            <none>           4317/TCP,4318/TCP                                               5h44m
otel-collector-monitoring   ClusterIP      10.111.89.46    <none>           8888/TCP                                                        5h44m
service-a                   LoadBalancer   10.97.117.218   192.168.10.243   8080:31495/TCP                                                  25s
service-b                   LoadBalancer   10.108.41.212   192.168.10.244   8080:32050/TCP                                                  25s
service-c                   LoadBalancer   10.106.93.36    192.168.10.245   8080:30310/TCP                                                  25s
~~~

![image-20231214230831685](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231214230831685.png)

![image-20231214231012327](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231214231012327.png)

![image-20231214230930393](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231214230930393.png)

![image-20231214230854376](/云原生/observability/observability-01-如何通过opentelemetry实现云原生应用全链路状态跟踪/image-20231214230854376.png)

