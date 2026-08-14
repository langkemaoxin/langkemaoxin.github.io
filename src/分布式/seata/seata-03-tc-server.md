---
title: "搭建 Seata TC：file/db 存储与 Nacos 集群"
sidebarGroup: "Seata"
shortTitle: "03 TC Server"
order: 3
date: 2026-09-06
category: "分布式"
tag:
  - "分布式"
  - "Seata"
description: "Seata TC Server 搭建：file 与 db 存储模式、单机启动、MySQL 初始化、Nacos 注册与配置中心集群部署。"
---

> **Seata 系列 · 第 3/8 篇**  
> 上一篇：[《Seata AT 模式：角色、两阶段与 XA 对比》](/分布式/seata/seata-02-at-mode)  
> 下一篇：[《AT 模式 TM/RM 接入与秒杀实战》](/分布式/seata/seata-04-at-tm-rm)

---

## 开头：TC 必须先跑起来

[AT 模式](/分布式/seata/seata-02-at-mode) 中的 **TC（Transaction Coordinator）** 负责维护全局/分支事务状态。TM、RM 都要连上 TC 才能工作。本文从**下载 seata-server** 到 **file 单机**、**db + Nacos 集群**完整走一遍。

文中示例版本以 **Seata 1.3.0** 为主（与 Spring Cloud Alibaba 2.1.x 配套成熟）；更高版本配置项名称可能略有变化，思路一致。

---

## 一、全局会话存储：file 与 db

TC 必须持久化**全局事务**与**分支事务**会话信息。`store.mode` 决定存储方式：

| 模式 | 适用 | 特点 |
|------|------|------|
| **file** | 开发、单机 | 会话在内存读写，持久化到本地 `root.data`，性能高，**不支持 HA** |
| **db** | 生产集群 | 会话写入 MySQL 等，`global_table` / `branch_table` / `lock_table` 共享，**支持多 TC 实例** |

![file 模式单机 TC](/分布式/seata/p020-01.png)

![db 模式集群 TC 通过数据库共享会话](/分布式/seata/p020-02.png)

集群下多个 TC 实例通过 **db** 共享会话，并注册到 **Nacos** 等注册中心，客户端按事务分组发现可用 TC：

![集群 TC + Nacos 注册](/分布式/seata/p021-01.png)

---

## 二、下载与单机启动（file 模式）

### 2.1 获取 seata-server

- 官方文档：<http://seata.io/zh-cn/docs/overview/what-is-seata.html>
- 发行包：<https://github.com/seata/seata/releases>（示例：`seata-server-1.3.0.tar.gz`）

解压后目录结构包含 `bin/`、`conf/`、`lib/` 等。

### 2.2 启动

```bash
cd /work/seata/bin
sh ./seata-server.sh
```

默认监听 **8091**。未改配置时使用 **file** 模式，可在 `bin/sessionStore/` 看到持久化文件：

```bash
ll -ls /work/seata/bin/sessionStore/
# root.data
```

日志出现 `Server started ...` 即启动成功。

### 2.3 配置文件位置

| 文件 | 作用 |
|------|------|
| `conf/registry.conf` | 注册中心、配置中心类型（file / nacos / …） |
| `conf/file.conf` | TC 端 store、service、事务恢复等参数 |

`file.conf` 也是 RM/TM 与 TC 通信时的参数参考（客户端侧有同名结构）。

---

## 三、TC 端关键参数（file.conf 节选）

生产与调优时常改项如下（完整列表见官方文档）：

| key | 说明 | 默认/备注 |
|-----|------|-----------|
| `store.mode` | 存储方式 | `file` / `db` |
| `store.file.dir` | file 模式目录 | `sessionStore` |
| `store.db.url` / `user` / `password` | db 模式 JDBC | 指向 seata 库 |
| `store.db.globalTable` | 全局事务表 | `global_table` |
| `store.db.branchTable` | 分支事务表 | `branch_table` |
| `store.db.lockTable` | 全局锁表 | `lock_table` |
| `server.undo.logSaveDays` | undo 保留天数 | 7 |
| `server.undo.logDeletePeriod` | undo 清理间隔 | 86400000 ms |
| `service.max.commit.retry.timeout` | 二阶段提交重试超时 | -1 无限 |
| `service.max.rollback.retry.timeout` | 二阶段回滚重试超时 | 同 commit |
| `recovery.*-retry-period` | 各状态重试线程间隔 | 1000 ms |

![TC 端 file.conf 参数示意](/分布式/seata/p025-01.png)

---

## 四、db 模式：MySQL 初始化

### 4.1 获取建表脚本

脚本路径（1.3.0）：

- GitHub：<https://github.com/seata-io/seata/tree/v1.3.0/script/server/db>
- Gitee：<https://gitee.com/seata-io/seata/tree/v1.3.0/script/server/db>

支持 MySQL、Oracle、PostgreSQL 等；MySQL 示例会创建三张表：

| 表名 | 用途 |
|------|------|
| `global_table` | 全局事务会话 |
| `branch_table` | 分支事务 |
| `lock_table` | 全局锁 |

### 4.2 创建库并导入

```bash
mysql -uroot -p123456 <<EOF
CREATE DATABASE \`seata\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON seata.* TO 'root'@'%' IDENTIFIED BY '123456';
FLUSH PRIVILEGES;
EOF

mysql -uroot -p123456 seata -e "source /work/seata/conf/db_store.sql;"
mysql -uroot -p123456 seata -e "show tables;"
```

![TC 库表初始化](/分布式/seata/p027-01.png)

### 4.3 修改 file.conf 为 db 模式

```properties
store {
  mode = "db"
  db {
    datasource = "druid"
    dbType = "mysql"
    driverClassName = "com.mysql.jdbc.Driver"
    url = "jdbc:mysql://192.168.56.121:3306/seata?useUnicode=true&characterEncoding=utf8&useSSL=true&serverTimezone=UTC"
    user = "root"
    password = "123456"
    minConn = 5
    maxConn = 30
    globalTable = "global_table"
    branchTable = "branch_table"
    lockTable = "lock_table"
    queryLimit = 100
    maxWait = 5000
  }
}
```

![db 模式 store 配置](/分布式/seata/p029-01.png)

### 4.4 MySQL 8 驱动

若使用 MySQL 8.x，需将 `mysql-connector-java-8.x.jar` 放入 `lib/`，并修改：

```properties
driverClassName = "com.mysql.cj.jdbc.Driver"
url = "jdbc:mysql://host:3306/seata?useUnicode=true&characterEncoding=utf8&serverTimezone=UTC"
```

---

## 五、Nacos 注册中心

修改 `conf/registry.conf`：

```properties
registry {
  type = "nacos"
  nacos {
    application = "seata-server"
    serverAddr = "localhost:8848"
    namespace = ""
    cluster = "default"
    username = "nacos"
    password = "nacos"
  }
}
```

若指定 **namespace**，需先在 Nacos 控制台创建命名空间，使用其 **UUID** 作为 `namespace` 值。

![Nacos 注册配置](/分布式/seata/p027-02.png)

---

## 六、集群部署两个 TC 实例

db 模式 + Nacos 注册后，可启动多个 TC，通过 `-p` 端口与 `-n` 节点编号区分：

```bash
# 实例 1
nohup sh /work/seata/bin/seata-server.sh -p 18091 -n 1 > /work/seata/bin/console1.log 2>&1 &

# 实例 2
nohup sh /work/seata/bin/seata-server.sh -p 18092 -n 2 > /work/seata/bin/console2.log 2>&1 &
```

| 参数 | 含义 |
|------|------|
| `-p` | 监听端口 |
| `-n` | 节点 id，多实例时用于生成不同区间的 transactionId，避免冲突 |

启动后在 Nacos 服务列表中应看到 `seata-server` 多个实例。

![双 TC 启动日志](/分布式/seata/p032-01.png)

---

## 七、Nacos 作为配置中心

除注册中心外，可将 TC 的 `file.conf` 内容托管到 Nacos，便于集群统一变更。

### 7.1 脚本导入

从官方获取配置模板：

- <https://github.com/seata/seata/tree/develop/script/config-center>

修改 `config.txt` 中的 **事务分组映射** 与 **db 连接**，再执行：

```bash
sh /work/seata/script/config-center/nacos/nacos-config.sh \
  -h localhost -p 8848 \
  -g SEATA_GROUP \
  -t <namespace-uuid> \
  -u nacos -w nacos
```

事务分组示例（需与业务 `spring.application.name` 对应）：

```properties
service.vgroupMapping.my_test_tx_group=default
service.vgroupMapping.seata-seckill-demo=default
service.vgroupMapping.seata-order-demo=default
service.vgroupMapping.seata-stock-demo=default
store.mode=db
store.db.url=jdbc:mysql://127.0.0.1:3306/seata?useUnicode=true
store.db.user=root
store.db.password=123456
```

### 7.2 registry.conf 指向 Nacos 配置

```properties
config {
  type = "nacos"
  nacos {
    serverAddr = "cdh1:8848"
    namespace = "e385bfe2-e743-4910-8c32-e05759f9f9f4"
    group = "SEATA_GROUP"
    dataId = "seata-tc.properties"
    username = "nacos"
    password = "nacos"
  }
}
```

也可在 Nacos 控制台手工创建 **DataId** 配置文件。完成后重启 TC。

![Nacos 配置列表](/分布式/seata/p038-01.png)

---

## 八、NameSpace、Group、DataId

Nacos 用三者唯一定位一份配置。不同团队定义可能不同，常见一种划分：

| 概念 | 常见用途 |
|------|----------|
| **NameSpace** | 隔离环境（dev / test / prod） |
| **Group** | 隔离项目或模块 |
| **DataId** | 具体配置文件名 |

客户端切换 namespace 示例：

```yaml
spring:
  cloud:
    nacos:
      discovery:
        server-addr: localhost:8848
        namespace: <命名空间UUID>
      config:
        server-addr: localhost:8848
        namespace: <命名空间UUID>
        group: SEATA_GROUP
```

![Nacos 控制台 namespace](/分布式/seata/p038-02.png)

Seata TC 与业务微服务应使用**同一 namespace**，保证事务分组映射一致。

---

## 九、部署检查清单

| 步骤 | 检查项 |
|------|--------|
| 1 | `seata-server` 进程监听端口正常 |
| 2 | file 模式有 `root.data`；db 模式 `global_table` 等三张表存在 |
| 3 | Nacos 中可见 `seata-server` 服务实例 |
| 4 | `service.vgroupMapping.<事务分组>=default` 与业务配置一致 |
| 5 | 防火墙 / 安全组放行 TC 端口（8091 或自定义） |

TC 就绪后，下一篇在业务侧配置 **TM/RM**、创建 **undo_log**，完成秒杀 AT 实战。

---

## 小结

- **file**：本地开发快；**db + 注册中心**：生产集群必备。
- TC 库三张表承载全局/分支/锁；客户端 undo_log 在各业务库（见下一篇）。
- **Nacos** 可同时作注册与配置中心；注意 **事务分组 vgroupMapping** 与 **namespace** 对齐。
