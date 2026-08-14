---
title: 微服务部署前中间件部署
sidebarGroup: 平台与实战
shortTitle: 22 微服务部署前中间件部署
order: 22
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 微服务实战
  - 云原生
  - 课程笔记
description: 严选商城项目中间件部署 一、MySQL部署 1.1 部署MySQL注意事项 可以使用kubesphere快速完成MySQL部署 - 有状态服务抽取配置为ConfigMap - 有状态服务必须使用PVC...
---

> **微服务实战 · 第 19 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 严选商城项目中间件部署

# 一、MySQL部署

## 1.1 部署MySQL注意事项

可以使用kubesphere快速完成MySQL部署

- 有状态服务抽取配置为ConfigMap
- 有状态服务必须使用PVC持久化存储数据
- 服务集群内访问使用DNS提供稳定的域名

## 1.2 通过KubeSphere部署MySQL

### 1.2.1 登录用户

![image-20221116150151129](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221116150151129.png)

### 1.2.2 存储准备

> （配图缺失：image-20230302122045131）

> （配图缺失：image-20230302122105702）

> （配图缺失：image-20230302122138933）

> （配图缺失：image-20230302122246907）

> （配图缺失：image-20230302122315127）

> （配图缺失：image-20230302122336650）

### 1.2.3 配置文件准备

~~~powershell
[client]
default-character-set=utf8

[mysql]
default-character-set=utf8

[mysqld]
init_connect='SET collation_connection = utf8_unicode_ci'
init_connect='SET NAMES utf8'
character-set-server=utf8
collation-server=utf8_unicode_ci
skip-character-set-client-handshake
skip-name-resolve
skip-ssl
~~~

> （配图缺失：image-20230302122444073）

> （配图缺失：image-20230302122506840）

> （配图缺失：image-20230302122533732）

> （配图缺失：image-20230302122551364）

> （配图缺失：image-20230302122724919）

> （配图缺失：image-20230302122749192）

> （配图缺失：image-20230302122807661）

### 1.2.4 mysql管理员root密码准备

> （配图缺失：image-20230302122854554）

> （配图缺失：image-20230302122920502）

> （配图缺失：image-20230302122958853）

> （配图缺失：image-20230302123029190）

> （配图缺失：image-20230302123140190）

> （配图缺失：image-20230302123206261）

> （配图缺失：image-20230302123225863）

### 1.2.5 MySQL部署

> （配图缺失：image-20230302123604664）

> （配图缺失：image-20230302123630151）

> （配图缺失：image-20230302123722874）

> （配图缺失：image-20230302123754158）

> （配图缺失：image-20230302123914955）

> （配图缺失：image-20230302124030037）

> （配图缺失：image-20230302124055125）

> （配图缺失：image-20230302124137179）

> （配图缺失：image-20230302124213317）

> （配图缺失：image-20230302124232868）

> （配图缺失：image-20230302124249359）

> （配图缺失：image-20230302124355013）

> （配图缺失：image-20230302124420472）

> （配图缺失：image-20230302124529831）

> （配图缺失：image-20230302124546918）

> （配图缺失：image-20230302124608572）

> （配图缺失：image-20230302124753860）

> （配图缺失：image-20230302124900908）

> （配图缺失：image-20230302124919834）

> （配图缺失：image-20230302124947244）

> （配图缺失：image-20230302125019766）

> （配图缺失：image-20230302125255992）

~~~powershell
[root@k8s-master01 ~]# dig -t a mysql-db.yanxuan-project.svc.cluster.local. @10.96.0.10

; <<>> DiG 9.11.4-P2-RedHat-9.11.4-26.P2.el7_9.13 <<>> -t a mysql-db.yanxuan-project.svc.cluster.local. @10.96.0.10
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 62435
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;mysql-db.yanxuan-project.svc.cluster.local. IN A

;; ANSWER SECTION:
mysql-db.yanxuan-project.svc.cluster.local. 30 IN A 10.244.69.194 解析出地址

;; Query time: 0 msec
;; SERVER: 10.96.0.10#53(10.96.0.10)
;; WHEN: 四 3月 02 12:53:22 CST 2023
;; MSG SIZE  rcvd: 129
~~~

### 1.2.6 配置MySQL集群外访问

> 由于kubesphere3.3.2存在普通用户（例如project-regular）无法找到OpenELB的情况，需切换为admin用户操作

> （配图缺失：image-20230302125539769）

> （配图缺失：image-20230302125911020）

> （配图缺失：image-20230302130019114）

> （配图缺失：image-20230302130048661）

> （配图缺失：image-20230302130110579）

> （配图缺失：image-20230302130150979）

> （配图缺失：image-20230302130213592）

在此使用admin用户

~~~powershell
lb.kubesphere.io/v1alpha1: openelb
protocol.openelb.kubesphere.io/v1alpha1: layer2
eip.openelb.kubesphere.io/v1alpha2: layer2-eip
~~~

> （配图缺失：image-20230302150959625）

~~~powershell
[root@k8s-master01 ~]# ping -c 4 192.168.10.72
PING 192.168.10.72 (192.168.10.72) 56(84) bytes of data.
64 bytes from 192.168.10.72: icmp_seq=1 ttl=64 time=0.065 ms
64 bytes from 192.168.10.72: icmp_seq=2 ttl=64 time=0.050 ms
64 bytes from 192.168.10.72: icmp_seq=3 ttl=64 time=0.064 ms
64 bytes from 192.168.10.72: icmp_seq=4 ttl=64 time=0.051 ms

--- 192.168.10.72 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3056ms
rtt min/avg/max/mdev = 0.050/0.057/0.065/0.010 ms
~~~

## 1.3 使用DataGrip实现数据库连接

> （配图缺失：image-20230302154221772）

> （配图缺失：image-20230302154328284）

> （配图缺失：image-20230302154402612）

> （配图缺失：image-20230302154451750）

> （配图缺失：image-20230302154530494）

> （配图缺失：image-20230302154610811）

> （配图缺失：image-20230302154641506）

> （配图缺失：image-20230302154818714）

> （配图缺失：image-20230302165151304）

> （配图缺失：image-20230302165211425）

> （配图缺失：image-20230302165449890）

> （配图缺失：image-20230302165534713）

> （配图缺失：image-20230302165828068）

> （配图缺失：image-20230302165912746）

> （配图缺失：image-20230302170011173）

# 二、Redis部署

## 2.1 准备配置PVC

> （配图缺失：image-20230303141431673）

![image-20221117100556510](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117100556510.png)

![image-20221117100628121](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117100628121.png)

![image-20221117100711803](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117100711803.png)

![image-20221117100736679](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117100736679.png)

## 2.2 准备配置文件

> （配图缺失：image-20230303141612460）

![image-20221117101008447](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101008447.png)

![image-20221117101035223](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101035223.png)

![image-20221117101053169](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101053169.png)

![image-20221117101147709](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101147709.png)

![image-20221117101221373](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101221373.png)

![image-20221117101243833](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101243833.png)

## 2.3 部署Redis

> （配图缺失：image-20230303141813121）

![image-20221117101422218](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101422218.png)

![image-20221117101449558](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101449558.png)

![image-20221117101517345](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101517345.png)

![image-20221117101542587](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117101542587.png)

> （配图缺失：image-20230303142301780）

![image-20221117102225292](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117102225292.png)

![image-20221117102244408](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117102244408.png)

![image-20221117102330969](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117102330969.png)

![image-20221117102448090](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117102448090.png)

![image-20221117102619529](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117102619529.png)

![image-20221117102643463](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117102643463.png)

> （配图缺失：image-20230303142612190）

> （配图缺失：image-20230303142716799）

> （配图缺失：image-20230303142756979）

> （配图缺失：image-20230303143051853）

> （配图缺失：image-20230303143142455）

> （配图缺失：image-20230303143211888）

> （配图缺失：image-20230303143238906）

~~~powershell
[root@k8s-master01 ~]# dig -t a redis.yanxuan-project.svc.cluster.local. @10.96.0.10

; <<>> DiG 9.11.4-P2-RedHat-9.11.4-26.P2.el7_9.13 <<>> -t a redis.yanxuan-project.svc.cluster.local. @10.96.0.10
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 10621
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;redis.yanxuan-project.svc.cluster.local. IN A

;; ANSWER SECTION:
redis.yanxuan-project.svc.cluster.local. 30 IN A 10.244.69.199 已解析出IP地址

;; Query time: 0 msec
;; SERVER: 10.96.0.10#53(10.96.0.10)
;; WHEN: 五 3月 03 14:33:08 CST 2023
;; MSG SIZE  rcvd: 123
~~~

> （配图缺失：image-20230303143437662）

## 2.4 Another Redis Desktop Manager使用

> github链接：https://github.com/qishibo/AnotherRedisDesktopManager

> （配图缺失：image-20230303144444960）

> （配图缺失：image-20230303144519825）

> （配图缺失：image-20230303144549898）

> （配图缺失：image-20230303144627996）

> （配图缺失：image-20230303144712400）

> （配图缺失：image-20230303144734037）

> （配图缺失：image-20230303144807303）

> （配图缺失：image-20230303144926225）

> （配图缺失：image-20230303145125569）

> （配图缺失：image-20230303145158228）

> （配图缺失：image-20230303145226462）

> （配图缺失：image-20230303145253550）

> （配图缺失：image-20230303145321802）

> （配图缺失：image-20230303145359896）

> （配图缺失：image-20230303145428488）

> （配图缺失：image-20230303145459314）

> （配图缺失：image-20230303145536052）

> （配图缺失：image-20230303145557726）

> （配图缺失：image-20230303145626279）

> （配图缺失：image-20230303145734161）

> （配图缺失：image-20230303145754336）

> （配图缺失：image-20230303145845058）

> （配图缺失：image-20230303145935988）

## 2.5 为redis设置密码

> （配图缺失：image-20230523130927120）

> （配图缺失：image-20230523131025425）

> （配图缺失：image-20230523131105358）

> （配图缺失：image-20230523131149636）

> （配图缺失：image-20230523131209168）

> （配图缺失：image-20230523131344029）

> （配图缺失：image-20230523131415372）

> （配图缺失：image-20230523131444236）

> （配图缺失：image-20230523131521193）

> （配图缺失：image-20230523131639064）

# 三、ES&Kibana部署

## 3.1 elasticsearch pvc准备

> （配图缺失：image-20230303161620155）

![image-20221117114942349](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117114942349.png)

> （配图缺失：image-20230303161732387）

> （配图缺失：image-20230303161837200）

![image-20221117115107736](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115107736.png)

![image-20221117115127572](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115127572.png)

## 3.2 elasticsearch 配置文件准备

~~~powershell
http.host: 0.0.0.0
discovery.type: single-node
ES_JAVA_OPTS: -Xms64m -Xmx512m
~~~

> （配图缺失：image-20230303161945029）

![image-20221117115222391](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115222391.png)

![image-20221117115254704](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115254704.png)

![image-20221117115312287](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115312287.png)

![image-20221117115402207](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115402207.png)

![image-20221117115423434](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115423434.png)

![image-20221117115525232](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115525232.png)

![image-20221117115550056](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115550056.png)

![image-20221117115648185](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115648185.png)

![image-20221117115705170](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115705170.png)

![image-20221117115725144](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117115725144.png)

## 3.3 elasticsearch 部署

> （配图缺失：image-20230303162309803）

> （配图缺失：image-20230303162342858）

> （配图缺失：image-20230303162422433）

![image-20221117120729395](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221117120729395.png)

> （配图缺失：image-20230303162652867）

> （配图缺失：image-20230303162807389）

> （配图缺失：image-20230303162906752）

> （配图缺失：image-20230303163312893）

> （配图缺失：image-20230303163243537）

> （配图缺失：image-20230303163414171）

> （配图缺失：image-20230303163508847）

> （配图缺失：image-20230303163535886）

> （配图缺失：image-20230303163623259）

> （配图缺失：image-20230303163658296）

> （配图缺失：image-20230303163722386）

> （配图缺失：image-20230303163748435）

> （配图缺失：image-20230303164246155）

~~~powershell
[root@k8s-master01 ~]# dig -t a elasticsearch.yanxuan-project.svc.cluster.local. @10.96.0.10

; <<>> DiG 9.11.4-P2-RedHat-9.11.4-26.P2.el7_9.13 <<>> -t a elasticsearch.yanxuan-project.svc.cluster.local. @10.96.0.10
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 54042
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;elasticsearch.yanxuan-project.svc.cluster.local. IN A

;; ANSWER SECTION:
elasticsearch.yanxuan-project.svc.cluster.local. 30 IN A 10.244.69.232

;; Query time: 0 msec
;; SERVER: 10.96.0.10#53(10.96.0.10)
;; WHEN: 五 3月 03 16:43:26 CST 2023
;; MSG SIZE  rcvd: 139
~~~

> （配图缺失：image-20230303164611916）

> （配图缺失：image-20230303164638189）

> （配图缺失：image-20230303164544164）

## 3.4 kibana部署

~~~powershell
ELASTICSEARCH_HOSTS=http://elasticsearch.yanxuan-project.svc.cluster.local.:9200
~~~

> （配图缺失：image-20230303164751858）

> （配图缺失：image-20230303164823198）

> （配图缺失：image-20230303164911077）

> （配图缺失：image-20230303164936704）

> （配图缺失：image-20230303165057315）

> （配图缺失：image-20230303165231044）

> （配图缺失：image-20230303172822469）

> （配图缺失：image-20230303165702728）

> （配图缺失：image-20230303165730989）

> （配图缺失：image-20230303165756159）

> （配图缺失：image-20230303165821917）

> （配图缺失：image-20230303170305791）

## 3.5 kibana访问

> （配图缺失：image-20230303170530652）

> （配图缺失：image-20230303170605796）

> （配图缺失：image-20230303170631046）

> （配图缺失：image-20230303170739827）

> （配图缺失：image-20230303170803210）

> （配图缺失：image-20230303170828754）

> （配图缺失：image-20230303170928807）

> （配图缺失：image-20230303170949663）

> （配图缺失：image-20230303171105140）

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone

[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71 添加此行内容
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

> （配图缺失：image-20230303173311744）

# 四、XXL-Job部署

## 4.1 确认MySQL数据库访问

> （配图缺失：image-20230308193632614）

> （配图缺失：image-20230308204042111）

> （配图缺失：image-20230308204118076）

> （配图缺失：image-20230308204148723）

## 4.2 创建xxl_job数据库并导入xxl_job数据库

>执行xxl-job-sql，git地址[https://github.com/xuxueli/xxl-job/blob/2.3.1/doc/db/tables_xxl_job.sql](https://links.jianshu.com/go?to=https%3A%2F%2Fgithub.com%2Fxuxueli%2Fxxl-job%2Fblob%2F2.3.1%2Fdoc%2Fdb%2Ftables_xxl_job.sql)，我们选择最新版本v2.3.1，稍后部署同样版本的xxl-job

SQL如下：

~~~powershell
CREATE database if NOT EXISTS `xxl_job` default character set utf8mb4 collate utf8mb4_unicode_ci;
use `xxl_job`;

SET NAMES utf8mb4;

CREATE TABLE `xxl_job_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_group` int(11) NOT NULL COMMENT '执行器主键ID',
  `job_desc` varchar(255) NOT NULL,
  `add_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `author` varchar(64) DEFAULT NULL COMMENT '作者',
  `alarm_email` varchar(255) DEFAULT NULL COMMENT '报警邮件',
  `schedule_type` varchar(50) NOT NULL DEFAULT 'NONE' COMMENT '调度类型',
  `schedule_conf` varchar(128) DEFAULT NULL COMMENT '调度配置，值含义取决于调度类型',
  `misfire_strategy` varchar(50) NOT NULL DEFAULT 'DO_NOTHING' COMMENT '调度过期策略',
  `executor_route_strategy` varchar(50) DEFAULT NULL COMMENT '执行器路由策略',
  `executor_handler` varchar(255) DEFAULT NULL COMMENT '执行器任务handler',
  `executor_param` varchar(512) DEFAULT NULL COMMENT '执行器任务参数',
  `executor_block_strategy` varchar(50) DEFAULT NULL COMMENT '阻塞处理策略',
  `executor_timeout` int(11) NOT NULL DEFAULT '0' COMMENT '任务执行超时时间，单位秒',
  `executor_fail_retry_count` int(11) NOT NULL DEFAULT '0' COMMENT '失败重试次数',
  `glue_type` varchar(50) NOT NULL COMMENT 'GLUE类型',
  `glue_source` mediumtext COMMENT 'GLUE源代码',
  `glue_remark` varchar(128) DEFAULT NULL COMMENT 'GLUE备注',
  `glue_updatetime` datetime DEFAULT NULL COMMENT 'GLUE更新时间',
  `child_jobid` varchar(255) DEFAULT NULL COMMENT '子任务ID，多个逗号分隔',
  `trigger_status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '调度状态：0-停止，1-运行',
  `trigger_last_time` bigint(13) NOT NULL DEFAULT '0' COMMENT '上次调度时间',
  `trigger_next_time` bigint(13) NOT NULL DEFAULT '0' COMMENT '下次调度时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `xxl_job_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `job_group` int(11) NOT NULL COMMENT '执行器主键ID',
  `job_id` int(11) NOT NULL COMMENT '任务，主键ID',
  `executor_address` varchar(255) DEFAULT NULL COMMENT '执行器地址，本次执行的地址',
  `executor_handler` varchar(255) DEFAULT NULL COMMENT '执行器任务handler',
  `executor_param` varchar(512) DEFAULT NULL COMMENT '执行器任务参数',
  `executor_sharding_param` varchar(20) DEFAULT NULL COMMENT '执行器任务分片参数，格式如 1/2',
  `executor_fail_retry_count` int(11) NOT NULL DEFAULT '0' COMMENT '失败重试次数',
  `trigger_time` datetime DEFAULT NULL COMMENT '调度-时间',
  `trigger_code` int(11) NOT NULL COMMENT '调度-结果',
  `trigger_msg` text COMMENT '调度-日志',
  `handle_time` datetime DEFAULT NULL COMMENT '执行-时间',
  `handle_code` int(11) NOT NULL COMMENT '执行-状态',
  `handle_msg` text COMMENT '执行-日志',
  `alarm_status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '告警状态：0-默认、1-无需告警、2-告警成功、3-告警失败',
  PRIMARY KEY (`id`),
  KEY `I_trigger_time` (`trigger_time`),
  KEY `I_handle_code` (`handle_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `xxl_job_log_report` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trigger_day` datetime DEFAULT NULL COMMENT '调度-时间',
  `running_count` int(11) NOT NULL DEFAULT '0' COMMENT '运行中-日志数量',
  `suc_count` int(11) NOT NULL DEFAULT '0' COMMENT '执行成功-日志数量',
  `fail_count` int(11) NOT NULL DEFAULT '0' COMMENT '执行失败-日志数量',
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `i_trigger_day` (`trigger_day`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `xxl_job_logglue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL COMMENT '任务，主键ID',
  `glue_type` varchar(50) DEFAULT NULL COMMENT 'GLUE类型',
  `glue_source` mediumtext COMMENT 'GLUE源代码',
  `glue_remark` varchar(128) NOT NULL COMMENT 'GLUE备注',
  `add_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `xxl_job_registry` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `registry_group` varchar(50) NOT NULL,
  `registry_key` varchar(255) NOT NULL,
  `registry_value` varchar(255) NOT NULL,
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `i_g_k_v` (`registry_group`,`registry_key`,`registry_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `xxl_job_group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app_name` varchar(64) NOT NULL COMMENT '执行器AppName',
  `title` varchar(12) NOT NULL COMMENT '执行器名称',
  `address_type` tinyint(4) NOT NULL DEFAULT '0' COMMENT '执行器地址类型：0=自动注册、1=手动录入',
  `address_list` text COMMENT '执行器地址列表，多地址逗号分隔',
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `xxl_job_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '账号',
  `password` varchar(50) NOT NULL COMMENT '密码',
  `role` tinyint(4) NOT NULL COMMENT '角色：0-普通用户、1-管理员',
  `permission` varchar(255) DEFAULT NULL COMMENT '权限：执行器ID列表，多个逗号分割',
  PRIMARY KEY (`id`),
  UNIQUE KEY `i_username` (`username`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `xxl_job_lock` (
  `lock_name` varchar(50) NOT NULL COMMENT '锁名称',
  PRIMARY KEY (`lock_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `xxl_job_group`(`id`, `app_name`, `title`, `address_type`, `address_list`, `update_time`) VALUES (1, 'xxl-job-executor-sample', '示例执行器', 0, NULL, '2018-11-03 22:21:31' );
INSERT INTO `xxl_job_info`(`id`, `job_group`, `job_desc`, `add_time`, `update_time`, `author`, `alarm_email`, `schedule_type`, `schedule_conf`, `misfire_strategy`, `executor_route_strategy`, `executor_handler`, `executor_param`, `executor_block_strategy`, `executor_timeout`, `executor_fail_retry_count`, `glue_type`, `glue_source`, `glue_remark`, `glue_updatetime`, `child_jobid`) VALUES (1, 1, '测试任务1', '2018-11-03 22:21:31', '2018-11-03 22:21:31', 'XXL', '', 'CRON', '0 0 0 * * ? *', 'DO_NOTHING', 'FIRST', 'demoJobHandler', '', 'SERIAL_EXECUTION', 0, 0, 'BEAN', '', 'GLUE代码初始化', '2018-11-03 22:21:31', '');
INSERT INTO `xxl_job_user`(`id`, `username`, `password`, `role`, `permission`) VALUES (1, 'admin', 'e10adc3949ba59abbe56e057f20f883e', 1, NULL);
INSERT INTO `xxl_job_lock` ( `lock_name`) VALUES ( 'schedule_lock');

commit;
~~~

> （配图缺失：image-20230308204251939）

> （配图缺失：image-20230308204320256）

> （配图缺失：image-20230308204458496）

> （配图缺失：image-20230308204534968）

## 4.3 xxl_job部署

> （配图缺失：image-20230308205057086）

> （配图缺失：image-20230308205131119）

> （配图缺失：image-20230308205546035）

> （配图缺失：image-20230308205616219）

> （配图缺失：image-20230308205842679）

> （配图缺失：image-20230308205909356）

~~~powershell
无邮箱告警

PARAMS  --spring.datasource.url=jdbc:mysql://mysql-db.yanxuan-project.svc.cluster.local.:3306/xxl_job?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=UTC --spring.datasource.username=root --spring.datasource.password=123456  --spring.datasource.driver-class-name=com.mysql.jdbc.Driver
~~~

~~~powershell
有邮箱告警
PARAMS --spring.datasource.url=jdbc:mysql://mysql-db.yanxuan-project.svc.cluster.local.:3306/xxl_job?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=UTC --spring.datasource.username=root --spring.datasource.password=123456  --spring.datasource.driver-class-name=com.mysql.jdbc.Driver --spring.mail.host=smtp.126.com --spring.mail.username=邮箱名 --spring.mail.password=邮箱密码 --xxl.job.login.password=登录密码"
~~~

> （配图缺失：image-20230308213332439）

> （配图缺失：image-20230308210536856）

> （配图缺失：image-20230308210741425）

> （配图缺失：image-20230308210831293）

> （配图缺失：image-20230308211108945）

~~~powershell
dig -t a xxl-job-admin.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

## 4.4 xxl_job访问

> （配图缺失：image-20230308213625086）

> （配图缺失：image-20230308213710597）

> （配图缺失：image-20230308213812253）

> （配图缺失：image-20230308213832581）

> （配图缺失：image-20230308213923925）

> （配图缺失：image-20230308213947390）

> （配图缺失：image-20230308214030657）

> （配图缺失：image-20230308214056183）

> （配图缺失：image-20230308214139004）

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone

[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71
nacos-server    A       192.168.10.71
sentinel-server A       192.168.10.71
skywalking-ui   A       192.168.10.71
rocketmq-dashboard      A       192.168.10.71
xxl-job-admin   A       192.168.10.71
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

> （配图缺失：image-20230308214604743）

> （配图缺失：image-20230308214649919）

# 五、Nacos部署

## 5.1 Nacos Server数据持久存储 PVC

> （配图缺失：image-20230307162403996）

![image-20221118111454614](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118111454614.png)

> （配图缺失：image-20230307162508493）

![image-20221118111603511](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118111603511.png)

![image-20221118111634271](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118111634271.png)

> （配图缺失：image-20230307162547662）

## 5.2 Nacos Server部署

> （配图缺失：image-20230307162716164）

> （配图缺失：image-20230307162809320）

> （配图缺失：image-20230307162858570）

> （配图缺失：image-20230307162945675）

> （配图缺失：image-20230307163306585）

> （配图缺失：image-20230307163401343）

> （配图缺失：image-20230307163456815）

> （配图缺失：image-20230307163802215）

> （配图缺失：image-20230307163910495）

~~~powershell
MODE: standalone
~~~

> （配图缺失：image-20230307164034536）

> （配图缺失：image-20230307164110279）

> （配图缺失：image-20230307164153823）

> （配图缺失：image-20230307164218845）

> （配图缺失：image-20230307164239284）

> （配图缺失：image-20230307164337241）

> （配图缺失：image-20230307164418430）

> （配图缺失：image-20230307164518587）

> （配图缺失：image-20230307164921596）

~~~powershell
# dig -t a nacos-server.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

## 5.3 Nacos Server访问

> （配图缺失：image-20230307165122375）

> （配图缺失：image-20230307165143950）

> （配图缺失：image-20230307165226215）

> （配图缺失：image-20230307165253976）

> （配图缺失：image-20230307165353413）

> （配图缺失：image-20230307165501601）

> （配图缺失：image-20230307165523058）

> （配图缺失：image-20230307165542830）

> （配图缺失：image-20230307165628061）

> （配图缺失：image-20230307165641992）

> （配图缺失：image-20230307165736674）

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone

[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71
nacos-server   A       192.168.10.71
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

> （配图缺失：image-20230307170449476）

> （配图缺失：image-20230307170614522）

> （配图缺失：image-20230307170652524）

# 六、seata部署

> （配图缺失：image-20230308234902946）

> （配图缺失：image-20230308234941559）

> （配图缺失：image-20230308235026660）

> （配图缺失：image-20230308235050012）

> （配图缺失：image-20230308235405321）

> （配图缺失：image-20230308235442188）

> （配图缺失：image-20230308235513385）

> （配图缺失：image-20230308235540561）

> （配图缺失：image-20230308235713897）

~~~powershell
# dig -t a seata-server.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

# 七、sentinel 流量卫兵

## 7.1 获取容器镜像

![image-20221118142514104](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118142514104.png)

## 7.2 sentinel部署

![image-20221118142605585](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118142605585.png)

![image-20221118142628634](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118142628634.png)

![image-20221118142709628](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118142709628.png)

![image-20221118142728309](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118142728309.png)

~~~powershell
bladex/sentinel-dashboard:latest
~~~

> （配图缺失：image-20230308084222381）

> （配图缺失：image-20230308084304174）

> （配图缺失：image-20230308084338394）

> （配图缺失：image-20230308084402876）

> （配图缺失：image-20230308084425409）

> （配图缺失：image-20230308084454620）

> （配图缺失：image-20230308084522967）

~~~powershell
#  dig -t a sentinel-server.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

## 7.3 sentinel访问

> （配图缺失：image-20230308084648089）

> （配图缺失：image-20230308084710105）

> （配图缺失：image-20230308084817167）

> （配图缺失：image-20230308084907365）

> （配图缺失：image-20230308084921065）

> （配图缺失：image-20230308085007326）

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone
[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71
nacos-server    A       192.168.10.71
sentinel-server A       192.168.10.71
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

> （配图缺失：image-20230308085234362）

> （配图缺失：image-20230308085323130）

# 八、Skywalking部署

## 8.1 获取容器镜像方法及ES服务确认 

### 8.1.1 获取Skywalking oap server及Skywalking ui容器镜像

![image-20221118210853186](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118210853186.png)

### 8.1.2 elasticsearch服务确认

> （配图缺失：image-20230308091246215）

~~~powershell
elasticsearch.yanxuan-project.svc.cluster.local.
~~~

## 8.2 Skywalking oap server部署

> （配图缺失：image-20230308091640009）

> （配图缺失：image-20230308091710821）

![image-20221118211236729](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118211236729.png)

> （配图缺失：image-20230308091757770）

![image-20221118211337572](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118211337572.png)

![image-20221118211430843](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118211430843.png)

**CPU及内存限制要注意：CPU 500m至1000m，内存 100M至2000M**

> （配图缺失：image-20230308092221729）

![image-20221118211609548](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118211609548.png)

![image-20221118211629620](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118211629620.png)

> （配图缺失：image-20230308092450802）

~~~powershell
SW_STORAGE  elasticsearch

SW_STORAGE_ES_CLUSTER_NODES    elasticsearch.yanxuan-project.svc.cluster.local.:9200
~~~

![image-20221118211832750](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118211832750.png)

![image-20221118211853178](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118211853178.png)

![image-20221118211913504](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118211913504.png)

> （配图缺失：image-20230308092532117）

> （配图缺失：image-20230308093015756）

~~~powershell
# dig -t a skywalking-oap-server.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

## 8.3 Skywalking ui部署

![image-20221118212131096](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118212131096.png)

![image-20221118212202627](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118212202627.png)

> （配图缺失：image-20230308093107060）

![image-20221118212301376](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118212301376.png)

![image-20221118212325922](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118212325922.png)

![image-20221118212345656](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118212345656.png)

> （配图缺失：image-20230308093341456）

![image-20221118212510914](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118212510914.png)

![image-20221118212709275](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118212709275.png)

> （配图缺失：image-20230308093606296）

~~~powershell
SW_OAP_ADDRESS: http://skywalking-oap-server.yanxuan-project.svc.cluster.local.:12800
~~~

![image-20221118212922595](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118212922595.png)

![image-20221118212944881](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221118212944881.png)

> （配图缺失：image-20230308093700604）

> （配图缺失：image-20230308093757871）

> （配图缺失：image-20230308093834031）

~~~powershell
# dig -t a skywalking-ui.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

## 8.4 Skywalking ui访问

> （配图缺失：image-20230308093920136）

> （配图缺失：image-20230308094019328）

> （配图缺失：image-20230308094201016）

> （配图缺失：image-20230308094229808）

> （配图缺失：image-20230308094251160）

> （配图缺失：image-20230308094332186）

> （配图缺失：image-20230308094356009）

> （配图缺失：image-20230308094441418）

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone
[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71
nacos-server    A       192.168.10.71
sentinel-server A       192.168.10.71
skywalking-ui   A       192.168.10.71
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

> （配图缺失：image-20230308094726156）

# 九、RocketMQ部署

## 9.1 rocketmq namesrv存储准备

> （配图缺失：image-20230308102733984）

![image-20221122012143042](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012143042.png)

![image-20221122012212340](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012212340.png)

![image-20221122012235734](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012235734.png)

## 9.2  rocketmq namesrv部署

![image-20221122012318524](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012318524.png)

![image-20221122012344857](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012344857.png)

![image-20221122012438121](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012438121.png)

![image-20221122012459140](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012459140.png)

![image-20221122012614651](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012614651.png)

![image-20221122012640158](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012640158.png)

~~~powershell
启动命令:
 /bin/bash
 参数:
 mqnamesrv
~~~

![image-20221122012722850](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012722850.png)

~~~powershell
环境变量
JAVA_OPT_EXT: -Xms512M -Xmx512M -Xmn128m
~~~

![image-20221122012757996](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012757996.png)

![image-20221122012827630](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012827630.png)

![image-20221122012914640](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012914640.png)

![image-20221122012933363](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012933363.png)

![image-20221122012956026](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122012956026.png)

~~~powershell
# dig -t a  rocketmq-namesrv.yanxuan-project.svc.cluster.local. @10.96.0.10
~~~

## 9.3 rocketmq broker存储准备

> （配图缺失：image-20230308102451199）

> （配图缺失：image-20230308102821916）

![image-20221122013128094](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013128094.png)

![image-20221122013154589](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013154589.png)

![image-20221122013218521](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013218521.png)

> （配图缺失：image-20230308102520078）

> （配图缺失：image-20230308102553336）

![image-20221122013350824](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013350824.png)

![image-20221122013414186](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013414186.png)

![image-20221122013435806](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013435806.png)

> （配图缺失：image-20230308102610932）

## 9.4 rocketmq broker部署

> （配图缺失：image-20230308102656387）

![image-20221122013617926](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013617926.png)

![image-20221122013653478](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013653478.png)

![image-20221122013816754](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013816754.png)

![image-20221122013845172](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122013845172.png)

~~~powershell
启动命令:
/bin/bash

参数:
mqbroker,-n,rocketmq-namesrv.yanxuan-project.svc.cluster.local.:9876
~~~

> （配图缺失：image-20230308105152331）

~~~powershell
JAVA_OPT_EXT: -server -Xms128m -Xmx128m -Xmn128m
NAMESRV_ADDR: rocketmq-namesrv.yanxuan-project.svc.cluster.local.:9876
~~~

> （配图缺失：image-20230308105331656）

![image-20221122014043978](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014043978.png)

![image-20221122014124423](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014124423.png)

![image-20221122014141070](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014141070.png)

![image-20221122014225375](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014225375.png)

> （配图缺失：image-20230308105501972）

> （配图缺失：image-20230308105536583）

## 9.5 rocketmq dashboard部署

> （配图缺失：image-20230308103008643）

![image-20221122014412889](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014412889.png)

![image-20221122014443710](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014443710.png)

![image-20221122014607093](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014607093.png)

![image-20221122014641959](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014641959.png)

~~~powershell
JAVA_OPTS: -Drocketmq.namesrv.addr=rocketmq-namesrv.yanxuan-project.svc.cluster.local.:9876
~~~

> （配图缺失：image-20230308105905004）

![image-20221122014802165](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014802165.png)

![image-20221122014820149](/云原生/platform/platform-22-微服务部署前中间件部署/image-20221122014820149.png)

> （配图缺失：image-20230308103101602）

## 9.6 rocketmq dashboard创建应用路由

> （配图缺失：image-20230308110037509）

> （配图缺失：image-20230308110119221）

> （配图缺失：image-20230308110139680）

> （配图缺失：image-20230308110232647）

> （配图缺失：image-20230308110254028）

> （配图缺失：image-20230308110334248）

> （配图缺失：image-20230308110402468）

> （配图缺失：image-20230308110503890）

## 9.7 rocketmq dashboard访问

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone

[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71
nacos-server    A       192.168.10.71
sentinel-server A       192.168.10.71
skywalking-ui   A       192.168.10.71
rocketmq-dashboard      A       192.168.10.71
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

> （配图缺失：image-20230308110746860）

