---
title: 严选商城项目部署前配置及数据库导入说明
sidebarGroup: 平台与实战
shortTitle: 25 严选商城项目部署前配置及数据库导入说明
order: 25
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 微服务实战
  - 云原生
  - 课程笔记
description: 严选商城项目部署前配置及数据库导入说明 一、配置导入 1.1 nacos访问 1.2 命名空间创建 开发环境创建dev命名空间，生产环境创建prod命名空间。 或在配置列表中也可以看到dev命名空间 ...
---

> **微服务实战 · 第 22 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 严选商城项目部署前配置及数据库导入说明

# 一、配置导入

## 1.1  nacos访问

![image-20230503123104024](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503123104024.png)

## 1.2 命名空间创建

> 开发环境创建dev命名空间，生产环境创建prod命名空间。

![image-20230503123543943](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503123543943.png)

![image-20230503123626647](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503123626647.png)

![image-20230503123651721](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503123651721.png)

> 或在配置列表中也可以看到dev命名空间

![image-20230503123746220](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503123746220.png)

## 1.3 导入项目配置文件

![image-20230503125108172](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503125108172.png)

![image-20230503125156221](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503125156221.png)

![image-20230503125252356](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503125252356.png)

![image-20230503125326855](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503125326855.png)

![image-20230503125357039](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503125357039.png)

![image-20230503125424745](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503125424745.png)

![image-20230503125550279](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503125550279.png)

![image-20230503125639111](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503125639111.png)

> 导入配置文件后，可以修改各服务访问地址等。

## 1.4 修改配置文件中配置项

~~~powershell
数据库访问地址：mysql-db.yanxuan-project.svc.cluster.local.  用户名：root,密码：123456，端口：3306
验证是否能够解析：# dig -t a mysql-db.yanxuan-project.svc.cluster.local @10.96.0.10
~~~

~~~powershell
redis访问地址：redis.yanxuan-project.svc.cluster.local. 端口：6379
验证是否能够解析： # dig -t a redis.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

~~~powershell
xxl-job-admin访问地址：xxl-job-admin.yanxuan-project.svc.cluster.local. 端口：8080
验证是否能够解析：# dig -t a xxl-job-admin.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

~~~powershell
seata-server访问地址：seata-server.yanxuan-project.svc.cluster.local. 端口：8091
验证是否能够解析：# dig -t a seata-server.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

~~~powershell
rocketmq-namesrv访问地址：rocketmq-namesrv.yanxuan-project.svc.cluster.local. 端口：9876
验证是否能够解析：# dig -t a  rocketmq-namesrv.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

~~~powershell
nacos-server访问地址：nacos-server.yanxuan-project.svc.cluster.local. 端口：8848
验证是否能够解析：# dig -t a nacos-server.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

![image-20230503133110958](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503133110958.png)

![image-20230503133256559](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503133256559.png)

![image-20230503133611099](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503133611099.png)

![image-20230503134514251](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503134514251.png)

![image-20230503134641696](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503134641696.png)

![image-20230503134755349](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503134755349.png)

![image-20230503134937411](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503134937411.png)

![image-20230503135559745](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503135559745.png)

![image-20230503135725276](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503135725276.png)

![image-20230503140732739](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503140732739.png)

![image-20230503141756135](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503141756135.png)

![image-20230503144655123](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503144655123.png)

![image-20230503145038600](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503145038600.png)

![image-20230503145639058](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503145639058.png)

![image-20230503145902025](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503145902025.png)

![image-20230503150132541](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503150132541.png)

![image-20230503150325024](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503150325024.png)

![image-20230503150437324](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503150437324.png)

![image-20230503150539191](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503150539191.png)

![image-20230503150703811](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503150703811.png)

![image-20230503150803537](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503150803537.png)

![image-20230503152951424](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503152951424.png)

![image-20230503153028680](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503153028680.png)

![image-20230503161037231](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503161037231.png)

# 二、数据库导入

![image-20230503173438755](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503173438755.png)

![image-20230503173541620](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503173541620.png)

![image-20230503173613826](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503173613826.png)

![image-20230503173649394](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503173649394.png)

![image-20230503173715007](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503173715007.png)

![image-20230503174836017](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503174836017.png)

> 在导入中台数据前，请先删除xxl_job数据库，否侧会报错。

![image-20230503174923456](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503174923456.png)

![image-20230503174955228](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503174955228.png)

![image-20230503175032312](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503175032312.png)

![image-20230503175100548](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503175100548.png)

![image-20230503175126576](/云原生/platform/platform-25-严选商城项目部署前配置及数据库导入说明/image-20230503175126576.png)

