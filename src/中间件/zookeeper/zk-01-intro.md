---
title: "ZooKeeper 特性、节点类型与快速安装"
sidebarGroup: "ZooKeeper"
shortTitle: "01 特性与安装"
order: 1
date: 2026-10-08
category: "中间件"
tag:
  - "ZooKeeper"
  - "中间件"
---

> **ZooKeeper 系列 · 第 1/5 篇**  
> 下一篇预告：[《ZooKeeper 客户端与经典应用场景》](/中间件/zookeeper/zk-02-client-scenarios)

---

## 开头：微服务多了，谁来做「协调员」？

订单、库存、支付各自扩缩容，配置要统一发布，集群里只能有一个 Master，分布式锁不能靠单机 `synchronized`。这些「跨进程、跨机器」的一致性问题，如果每个团队自己造轮子，成本极高且容易出错。

**ZooKeeper** 是 Apache 下的分布式协调框架（源自 Hadoop 生态），把复杂的一致性原语封装成**树形命名空间 + 监听机制**，供上层应用订阅数据变化、选主、加锁、做配置中心。典型下游包括 Dubbo 注册中心、Kafka 旧版元数据、HBase 等。

![ZooKeeper 定位：分布式协调与一致性服务](/中间件/zookeeper/17/p01-01.png)

本质可理解为：**小文件存储 + 监听**——类似文件系统的目录树，每个节点（ZNode）可存数据、可挂 Watcher；数据变更时通知已注册的观察者（观察者模式）。

---

## 一、快速安装与 CLI

环境：**JDK 8+**。从 [Apache ZooKeeper 发布页](https://zookeeper.apache.org/releases.html) 下载，解压后复制 `conf/zoo_sample.cfg` 为 `zoo.cfg`，修改 `dataDir` 指向持久化目录。

![ZooKeeper 下载与目录结构](/中间件/zookeeper/17/p02-01.png)

启动 Server 与 Client：

```bash
bin/zkServer.sh start
bin/zkServer.sh status
bin/zkCli.sh
# 远程：bin/zkCli.sh -server ip:port
```

常用 CLI（详见 [官方 CLI 文档](https://zookeeper.apache.org/doc/r3.8.0/zookeeperCLI.html)）：

| 命令 | 作用 |
|------|------|
| `ls [-s][-w][-R] path` | 子节点；`-w` 监听子节点变化 |
| `create [-s][-e][-c][-t ttl] path [data]` | 创建节点（顺序/临时/容器/TTL） |
| `get/set [-s][-w] path` | 读/写数据；`-s` 带 stat |
| `delete / deleteall` | 删单层 / 递归删 |
| `stat [-w] path` | 节点元数据 |

GUI 可选：ZooInspector、prettyZoo、ZooKeeperAssistant 等。

---

## 二、数据模型与节点类型

ZNode 树类似 Unix 文件系统，但**每个节点都可存数据**（默认约 1MB），路径全局唯一，带版本号 `version`。

源码中 `DataTree` 用 `ConcurrentHashMap` 存节点，`DataNode` 含 `data[]`、`StatPersisted`、`children` 集合。

![DataTree 与 DataNode 结构](/中间件/zookeeper/17/p13-01.png)

### 节点分类

| 类型 | 生命周期 | 典型用途 |
|------|----------|----------|
| **持久 PERSISTENT** | 会话结束仍存在 | 配置、命名 |
| **临时 EPHEMERAL** | 会话断开即删 | 在线状态、锁持有者 |
| **顺序 SEQUENTIAL** | 与持久/临时组合 | 公平锁队列、ID |
| **容器 CONTAINER** (3.5.3+) | 无子节点约 60s 后删 | Leader/锁场景清理 |
| **TTL** (需 `extendedTypesEnabled=true`) | 到期且无子节点则删 | 限时节点 |

![四种经典节点类型对比](/中间件/zookeeper/17/p14-01.png)

```bash
create /servers xxx
create -e /servers/host xxx
create -e -s /servers/host xxx
create -c /container xxx
create -t 10 /ttl
```

**ZXID**：每次变更产生全局递增事务 ID，可比较操作先后顺序。

**stat 关键字段**：`cZxid/ctime` 创建事务与时间；`mZxid/mtime` 最后修改；`pZxid` 子节点列表最后变更；`dataVersion/cversion` 数据/子节点版本（乐观锁）；`ephemeralOwner` 临时节点绑定的 sessionId。

---

## 三、Watcher 与典型协同

Session 建立后，超时、鉴权失败或主动关闭则 session 结束。Watcher **监听事件**（非数据本身），类型包括：`NodeCreated/Deleted/DataChanged/ChildrenChanged` 等。

| 特性 | 说明 |
|------|------|
| 一次性 | 触发后需重新注册 |
| 串行回调 | 回调完成才看到最新状态 |
| 轻量 | 事件只含 path/类型，不含前后数据 |
| 3.6+ 持久 Watch | `addWatch -m PERSISTENT[_RECURSIVE]` |

**Master-Worker 示例**：`/master` 临时节点保证唯一 Master；`/workers` 下临时子节点表示 Worker，Master `ls -w /workers` 感知上下线。

**条件更新**：`set -v version` 避免基于过期 stat 覆盖（乐观锁删除场景）。

![条件更新与 version](/中间件/zookeeper/17/p22-01.png)

**应用场景**：注册中心、配置发布/订阅、命名服务、集群管理、Master 选举、分布式锁、负载均衡（最少访问数路由）等。ZK **不适合大数据量存储**。

---

## 四、ACL、集群与选举（概览）

ACL 格式 `[scheme:id:permissions]`：`world/ip/auth/digest/super`；权限 `cdrwa`。生产环境务必配置。

**集群角色**：

- **Leader**：事务写请求调度、顺序性
- **Follower**：读 + 转发写 + 选主投票
- **Observer**：读 + 同步 Leader 数据，不参与投票（提升读扩展、跨机房）

三节点配置：`server.A=host:2888:3888`，`dataDir/myid` 填 A。Leader 处理读写，Follower 写转发 Leader。

**四字命令**（需在 `zoo.cfg` 或 JVM 参数白名单）：`ruok`、`stat`、`mntr` 等，`echo stat | nc host 2181`。

**选主比较规则**（`FastLeaderElection`）：先比 **epoch**，再比 **zxid**，再比 **myid**。

![选举 totalOrderPredicate 逻辑](/中间件/zookeeper/17/p22-01.png)

zxid 64 位：高 32 epoch + 低 32 counter。

---

## 小结

- ZooKeeper = **树形命名空间 + 会话 + Watcher + 强一致写入（经 Leader）**。
- 节点类型（尤其**临时/顺序**）直接决定锁、选主、注册中心等玩法。
- 下一篇从 **Java 客户端与 Curator** 入手，把场景落到代码。
