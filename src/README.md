---
home: true
icon: house
title: 首页
heroIcon: book-open
heroText: Corey 的知识库
tagline: 用西蒙学习法整理的技术笔记，把工作里真正啃过的东西写清楚
actions:
  - text: 开始阅读
    icon: book
    link: /Ai/
    type: primary
  - text: GitHub
    icon: fab fa-github
    link: https://github.com/code-corey/code-corey.github.io
---

## 推荐阅读

- [手把手 15 练：从零学会 Playwright CLI](Ai/playwright/playwright-cli-learn.md)：只留命令和结果，打开终端就能跟练的浏览器自动化入门。
- [三阶段实战：Playwright + Skills 打造自动 AI 简报](Ai/playwright/playwright-Agent-Skills-Ai-News.md)：从信息抓取到简报输出，把 Agent 工作流跑通一遍。
- [LangChain 如何构建 RAG 问答应用](Ai/rag/langchain-rag.md)：从直觉到可落地的检索增强，适合想把公司知识库接上大模型的同学。
- [Kestrel 如何监听端口](DotNet/aspnetcore/1-kestrel-socket-connection-listener.md)：从浏览器地址栏一路挖到 Windows `bind/listen`，看清 ASP.NET Core 的入口。
- [ASP.NET Core 10 源码地图](DotNet/aspnetcore/3-aspnetcore-10-source-map.md)：这份仓库到底是什么、`src` 里有哪些项目，读源码前先建立全局图。
- [Hadoop 是什么？](BigData/hadoop-series/hadoop-series-01-what-is-hadoop.md)：Hadoop 系列开篇，用大白话讲清分布式存储与计算为什么能拼出「超级电脑」。
- [Docker 是什么？](云原生/docker/docker-01-what-is-docker.md)：云原生 Docker 系列开篇，从交付痛点讲到镜像与容器。
- [云原生原理与演进](云原生/k8s/k8s-01-cloud-native.md)：Kubernetes 系列开篇，从 CNCF 定义讲到 Service Mesh。
- [MQ 是什么与选型](中间件/rabbitmq/rabbitmq-01-what-is-mq.md)：中间件专栏开篇，从同步事件讲到 RabbitMQ / Kafka / RocketMQ 选型。
- [为何学并发编程](并发编程/basics/juc-01-why-concurrency.md)：并发专栏开篇，从线程与等待通知建立直觉。
- [DDD 是什么](软件架构/ddd-basics/ddd-01-what-is-ddd.md)：软件架构专栏开篇，从领域驱动设计的价值与本质收益讲起。
- [全面理解 JVM](性能调优/jvm/jvm-01-overview.md)：性能调优专栏开篇，建立 JVM 全局图。
- [全面理解 MySQL 架构](数据库/mysql/mysql-01-architecture.md)：数据库专栏开篇，从 MySQL 架构讲到后续索引与事务。
- [分布式事务场景与 Seata 总览](分布式/seata/seata-01-distributed-tx-overview.md)：分布式专栏开篇，从分库分表与微服务事务讲到 Seata。
- [手写模拟 Spring Boot 核心流程](微服务/springboot/boot-01-handwritten-core.md)：微服务专栏开篇，从手写 Boot 核心流程建立直觉。
- [面试必看 · 突击流程](面试题/面试必看/0001-crash-prep-flow.md)：图灵 Java+AI 全栈面试核心点（2026）整库入口。
- [Windows 权限书稿（分卷索引）](Windows/permissions/00-index.md)：从「发明权限」到域 / 权利 / 多对象 / 排障 / .NET（含待写占位章）。
- [用 B1 英语读 ACM 论文：最终一致性生词精讲](English/vocabulary/eventual-consistency-b1-vocabulary.md)：先背生词再读原文，降低技术论文的查词成本。

## 自我介绍

你好，我是 **Corey**。

这个站用来沉淀我在工作和自学里真正啃过的东西：**.NET / Java 源码调试**、**大数据与 Hadoop**、**云原生（Docker / K8s）**、**消息中间件**、**Java 并发编程**、**软件架构（DDD）**、**性能调优（JVM / Tomcat）**、**数据库（MySQL）**、**分布式（Seata）**、**微服务（Spring Cloud Alibaba）**、**源码剖析（Spring 6）**、**面试题（Java+AI 全栈）**、**Windows 权限与环境**、**AI 工程化与自动化**，以及一点用 B1 词汇量读论文的英语笔记。

我习惯用西蒙学习法把概念拆开写——先建立直觉，再落到源码、命令和复盘。写给未来的自己，也欢迎路过的你一起看。

- GitHub：[code-corey/code-corey.github.io](https://github.com/code-corey/code-corey.github.io)
- 在线站点：[www.code-corey.com](https://www.code-corey.com)

## 按专题浏览

- [AI](Ai/)：Playwright、RAG、本地大模型、Agent、Spring AI 与 Spring AI Alibaba
- [.NET](DotNet/)：ASP.NET Core 请求链路与源码构建
- [Java](Java/)：MyBatis 等源码调试实践
- [大数据](BigData/)：Hadoop 系列与架构概念
- [云原生](云原生/)：Docker 系列与 Kubernetes 系列，Serverless 后续展开
- [中间件](中间件/)：消息队列、Redis、ZooKeeper、ShardingSphere、ES、Netty
- [并发编程](并发编程/)：JUC 基础、锁与 AQS、容器、线程池、Disruptor
- [软件架构](软件架构/)：DDD 入门、战略建模、战术分层、COLA 与防腐层
- [性能调优](性能调优/)：JVM 原理与调优、Tomcat 架构与线程模型
- [数据库](数据库/)：MySQL 架构、索引、事务锁、InnoDB、主从与高可用
- [分布式](分布式/)：Seata AT/TCC、TC 集群、源码与隔离性
- [微服务](微服务/)：Spring Boot 原理、SCA、Nacos/Sentinel/Seata 内核
- [源码剖析](源码剖析/)：Spring 6、MyBatis（基础与源码）
- [面试题](面试题/)：图灵 Java+AI 全栈面试核心点（2026），按语雀左侧栏目分组
- [Windows](Windows/)：权限 ACL 与环境搭建
- [工具](Tools/)：Git、代理、编码与发布
- [英语](English/)：技术论文 B1 生词
- [笔记](Notes/)：HAMi、概念与工作流随记
