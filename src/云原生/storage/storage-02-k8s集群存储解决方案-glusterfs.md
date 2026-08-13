---
title: "k8s集群存储解决方案 GlusterFS"
sidebarGroup: "K8s 存储"
shortTitle: "02 k8s集群存储解决方案 GlusterFS"
order: 2
date: 2026-08-13
category: "云原生"
tag:
  - "K8s 存储"
  - "云原生"
  - "课程笔记"
description: "k8s集群存储解决方案 GlusterFS 一、存储解决方案介绍 1.1 GlusterFS - GlusterFS是一个开源的分布式文件系统 - 具有强大的横向扩展能力 - 通过扩展能够支持数PB存..."
---

> **K8s 存储 · 第 2 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# k8s集群存储解决方案 GlusterFS

# 一、存储解决方案介绍

## 1.1 GlusterFS

- GlusterFS是一个开源的分布式文件系统
- 具有强大的横向扩展能力
- 通过扩展能够支持数PB存储容量和处理数千客户端
- GlusterFS借助TCP/IP或InfiniBandRDMA网络将物理分布的存储资源聚集在一起，使用单一全局命名空间来管理数据。

## 1.2 Heketi

- Heketi（https://github.com/heketi/heketi），是一个基于RESTful API的GlusterFS卷管理框架。

- Heketi可以方便地和云平台整合，提供RESTful API供Kubernetes调用，实现多GlusterFS集群的卷管理
- Heketi还有保证bricks和它对应的副本均匀分布在集群中的不同可用区的优点。

# 二、环境说明

## 2.1 k8s集群

| kubeadm  | kubelet  | kubectl  | docker   | 节点数          |
| -------- | -------- | -------- | -------- | --------------- |
| v1.21.10 | v1.21.10 | v1.21.10 | 20.10-17 | 3;1master2slave |

|   主机   |    IP地址     | Heketi               |
| :------: | :-----------: | -------------------- |
| master01 | 192.168.10.11 | heketi heketi-client |
| worker01 | 192.168.10.12 | heketi-client        |
| worker02 | 192.168.10.13 | heketi-client        |

## 2.2 GlusterFS集群

| 主机 | IP地址        | 硬盘     | 硬盘容量 |
| ---- | ------------- | -------- | -------- |
| g1   | 192.168.10.60 | /dev/sdb | 100G     |
| g2   | 192.168.10.61 | /dev/sdb | 100G     |
| g3   | 192.168.10.62 | /dev/sdb | 100G     |

# 三、GlusterFS集群部署

## 3.1 主机准备

### 3.1.1 主机名配置

~~~powershell
[root@localhost ~]# hostnamectl set-hostname gX

X为1，2，3
~~~

### 3.1.2 IP配置

~~~powershell
[root@localhost ~]# cat /etc/sysconfig/network-scripts/ifcfg-eth0
DEVICE=eth0
TYPE=Ethernet
ONBOOT=yes
BOOTPROTO=static
IPADDR=192.168.10.6X
NETMASK=255.255.255.0
GATEWAY=192.168.10.2
DNS1=119.29.29.29

X为0，1，2
~~~

### 3.1.3 主机名解析设置

~~~powershell
[root@localhost ~]# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.60 g1
192.168.10.61 g2
192.168.10.62 g3
~~~

### 3.1.4 主机间免密登录设置

> 在g1主机操作，然后copy到其它主机即可。

~~~powershell
[root@g1 ~]# ssh-keygen -t rsa -f /root/.ssh/id_rsa -N ''
Generating public/private rsa key pair.
Your identification has been saved in /root/.ssh/id_rsa.
Your public key has been saved in /root/.ssh/id_rsa.pub.
The key fingerprint is:
SHA256:FuKHUe57eCqUjIwH9q9zXNsQt/6BHDNZcSOixGBHXs0 root@g1
The key's randomart image is:
+---[RSA 2048]----+
|      o+= ooo o  |
|     . *.o .E+ . |
|      o =   .    |
|  o  . =...o     |
| . = oo.So=.     |
|  . = +oo+.=     |
|   . + .o== .    |
|    . = .+o  .   |
|    .+ ..  ..    |
+----[SHA256]-----+

[root@g1 ~]# cd /root/.ssh

[root@g1 .ssh]# ls
id_rsa  id_rsa.pub 
[root@g1 .ssh]# cp id_rsa.pub authorized_keys
[root@g1 .ssh]# ls
authorized_keys  id_rsa  id_rsa.pub 

[root@g1 .ssh]# cd ..
[root@g1 ~]# scp -r /root/.ssh g2:/root

[root@g1 ~]# scp -r /root/.ssh g3:/root

~~~

### 3.1.5 硬盘准备

#### 3.1.5.1 查看硬盘

> 所有GlusterFS集群节点全部操作，仅在g1主机演示操作方法。

~~~powershell
[root@gX ~]# lsblk
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
vda             252:0    0   20G  0 disk
├─vda1          252:1    0    1G  0 part /boot
└─vda2          252:2    0   19G  0 part
  ├─centos-root 253:0    0   17G  0 lvm  /
  └─centos-swap 253:1    0    2G  0 lvm  [SWAP]
sdb             252:16   0  100G  0 disk
~~~

#### 3.1.5.2 格式化硬盘

~~~powershell
[root@gX ~]# mkfs.xfs /dev/sdb
meta-data=/dev/sdb               isize=512    agcount=4, agsize=6553600 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0, sparse=0
data     =                       bsize=4096   blocks=26214400, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal log           bsize=4096   blocks=12800, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
~~~

### 3.1.6 硬盘自动挂载准备

#### 3.1.6.1 准备挂载目录

~~~powershell
[root@g1 ~]# mkdir /glustersdb

[root@g2 ~]# mkdir /glustersdb

[root@g3~]# mkdir /glustersdb
~~~

#### 3.1.6.2 修改/etc/fstab文件实现自动挂载

~~~powershell
[root@gX ~]# cat /etc/fstab

......
/dev/sdb                /glustersdb             xfs     defaults        0 0
~~~

~~~powershell
挂载所有
[root@gX ~]# mount -a

查看文件系统挂载情况
[root@gX ~]# df -h
文件系统                 容量  已用  可用 已用% 挂载点
/dev/mapper/centos-root   17G  1.1G   16G    7% /
devtmpfs                 988M     0  988M    0% /dev
tmpfs                   1000M     0 1000M    0% /dev/shm
tmpfs                   1000M  8.6M  991M    1% /run
tmpfs                   1000M     0 1000M    0% /sys/fs/cgroup
/dev/vda1               1014M  133M  882M   14% /boot
tmpfs                     98M     0   98M    0% /run/user/0
/dev/sdb                 100G   33M  100G    1% /glustersdb
~~~

## 3.2  安全设置

### 3.2.1 firewalld设置

~~~powershell
[root@gX ~]# systemctl disable firewalld
[root@gX ~]# systemctl stop firewalld
[root@gX ~]# firewall-cmd --state
not running
~~~

### 3.2.2 SELinux设置

> 所有主机均要修改，修改后，请重启系统让修改生效。

~~~powershell
[root@gX ~]# sed -ri 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
~~~

## 3.3 时间同步设置

~~~powershell
[root@gX ~]# crontab -l
0 */1 * * * ntpdate time1.aliyun.com
~~~

## 3.4 GlusterFS安装

### 3.4.1 YUM源准备

~~~powershell
[root@gX ~]# yum -y install centos-release-gluster

[root@gX ~]# ls /etc/yum.repos.d/
CentOS-Gluster-7.repo  CentOS-Storage-common.repo  tuna.repo
~~~

### 3.4.2 GlusterFS安装

> 关于软件的依赖，待补充。

~~~powershell
[root@gX ~]# yum -y install glusterfs glusterfs-server glusterfs-fuse glusterfs-rdma fuse
~~~

### 3.4.3 启动GlusterFS 服务

~~~powershell
[root@gX ~]# systemctl enable glusterd
[root@gX ~]# systemctl start glusterd
~~~

## 3.5 GlusterFS集群配置

> 在GlusterFS集群g1主机上添加g2和g3 2台主机。

~~~powershell
[root@g1 ~]# gluster peer probe g2
peer probe: success.
[root@g1 ~]# gluster peer probe g3
peer probe: success.
~~~

~~~powershell
[root@g1 ~]# gluster peer status
Number of Peers: 2

Hostname: g2
Uuid: 7660736f-056b-414e-8b0c-b5272265946c
State: Peer in Cluster (Connected)

Hostname: g3
Uuid: 75b7c358-edbe-438c-ad72-2ce16ffabf9d
State: Peer in Cluster (Connected)

[root@g2 ~]# gluster peer status
Number of Peers: 2

Hostname: g1
Uuid: 920e9070-1336-4bff-8bfd-eb6161d035d3
State: Peer in Cluster (Connected)

Hostname: g3
Uuid: 75b7c358-edbe-438c-ad72-2ce16ffabf9d
State: Peer in Cluster (Connected)

[root@g3 ~]# gluster peer status
Number of Peers: 2

Hostname: g1
Uuid: 920e9070-1336-4bff-8bfd-eb6161d035d3
State: Peer in Cluster (Connected)

Hostname: g2
Uuid: 7660736f-056b-414e-8b0c-b5272265946c
State: Peer in Cluster (Connected)
~~~

## 3.6 添加复制卷验证GlusterFS集群可用性

> 如果是为K8S集群提供持久化存储，请不要再继续验证GlusterFS集群可用性或验证完成后，重新添加硬盘。

> 在GlusterFS集群任意节点均可完成

### 3.6.1 创建复制卷

~~~powershell
[root@g1 ~]# gluster volume create k8s-test-volume replica 3 g1:/glustersdb/r1 g2:/glustersdb/r2 g3:/glustersdb/r3
volume create: k8s-test-volume: success: please start the volume to access data

[root@g1 ~]# ls /glustersdb
r1

[root@g2 ~]# ls /glustersdb
r2

[root@g3 ~]# ls /glustersdb
r3
~~~

### 3.6.2 启动复制卷

~~~powershell
[root@g1 ~]# gluster volume start k8s-test-volume
volume start: k8s-test-volume: success
~~~

### 3.6.3 查询复制卷状态

~~~powershell
[root@g1 ~]# gluster volume status k8s-test-volume
Status of volume: k8s-test-volume
Gluster process                             TCP Port  RDMA Port  Online  Pid
------------------------------------------------------------------------------
Brick g1:/glustersdb/r1                     49152     0          Y       6622
Brick g2:/glustersdb/r2                     49152     0          Y       6518
Brick g3:/glustersdb/r3                     49152     0          Y       6518
Self-heal Daemon on localhost               N/A       N/A        Y       6643
Self-heal Daemon on g3                      N/A       N/A        Y       6539
Self-heal Daemon on g2                      N/A       N/A        Y       6539

Task Status of Volume k8s-test-volume
------------------------------------------------------------------------------
There are no active volume tasks
~~~

### 3.6.4 查看复制卷信息

~~~powershell
[root@g1 ~]# gluster volume info k8s-test-volume

Volume Name: k8s-test-volume
Type: Replicate
Volume ID: 0529c5f6-1ac0-40ea-a29c-6c4f85dc54cb
Status: Started
Snapshot Count: 0
Number of Bricks: 1 x 3 = 3
Transport-type: tcp
Bricks:
Brick1: g1:/glustersdb/r1
Brick2: g2:/glustersdb/r2
Brick3: g3:/glustersdb/r3
Options Reconfigured:
transport.address-family: inet
storage.fips-mode-rchecksum: on
nfs.disable: on
performance.client-io-threads: off
~~~

### 3.6.5 如果某一个brick不在线会影响客户端挂载(可选)

> 设置后，可以允许volume中的某块brick不在线的情况

~~~powershell
[root@g1 glusterfs]# gluster volume set k8s-test-volume cluster.server-quorum-type none
volume set: success

[root@g1 glusterfs]# gluster volume set k8s-test-volume cluster.quorum-type none
volume set: success
~~~

### 3.6.6 限额问题(可选)

~~~powershell
[root@g1 ~]# gluster volume quota k8s-test-volume enable 
volume quota : success

[root@g1 ~]# gluster volume quota k8s-test-volume limit-usage / 10GB
volume quota : success
~~~

## 3.7 在k8s集群工作节点验证GlusterFS集群可用性

> 由于仅使用一个工作节点验证GlusterFS集群可用性，因此没有必要为所有工作节点全部安装GlusterFS客户端。

### 3.7.1 准备YUM源

~~~powershell
[root@worker01 ~]# yum -y install centos-release-gluster
~~~

### 3.7.2 在k8s集群work1节点安装glusterfs

~~~powershell
[root@worker01 ~]# yum -y install glusterfs glusterfs-fuse
~~~

### 3.7.3 创建用于挂载目录

~~~powershell
[root@worker01 ~]# mkdir /k8s-glusterfs-test-volume
~~~

### 3.7.4 手动挂载GlusterFS集群中的复制卷

> 如果使用主机名挂载，g1,g2,g3主机名需要添加到解析。

~~~powershell
[root@worker01 ~]# mount -t glusterfs g1:/k8s-test-volume /k8s-glusterfs-test-volume
~~~

### 3.7.5 验证挂载情况

~~~powershell
[root@worker01 ~]# df -h
文件系统                                                                       容量  已用  可用 已用% 挂载点
......
g1:/k8s-test-volume                                                          100G  1.1G  99G 2% /k8s-glusterfs-test-volume
~~~

### 3.7.6  验证完成后需要卸载

~~~powershell
[root@worker01 ~]# umount /k8s-glusterfs-test-volume
~~~

# 四、Heketi安装

>heketi是为glusterfs提供RESETFUL的API， 相当于给glusterfs和k8s之间架通了桥梁。k8s集群可以通过heketi提供的RESETFUL API完成对Glusterfs的PV申请和管理。

## 4.1 配置Heketi YUM源

> k8s集群所有节点均需要

~~~powershell
[root@master01 ~]# yum -y install centos-release-gluster

[root@worker01 ~]# yum -y install centos-release-gluster

[root@worker02 ~]# yum -y install centos-release-gluster
~~~

## 4.2 安装Heketi

### 4.2.1 k8s集群master节点安装

~~~powershell
[root@master01 ~]# yum -y install heketi heketi-client
~~~

### 4.2.2 k8s集群工作节点安装

~~~powershell
[root@worker01 ~]# yum -y install heketi-client

[root@worker02 ~]# yum -y install heketi-client
~~~

## 4.3 在k8s集群master节点修改Heketi配置文件

### 4.3.1 在k8s集群master节点查看并备份文件

~~~powershell
[root@master01 ~]# ls /etc/heketi/
heketi.json

[root@master01 ~]# cp /etc/heketi/heketi.json{,.bak}

[root@master01 ~]# ls /etc/heketi/
heketi.json  heketi.json.bak
~~~

### 4.3.2 在k8s集群master节点修改配置文件

~~~powershell
[root@master01 ~]# cat /etc/heketi/heketi.json
{
  "_port_comment": "Heketi Server Port Number",
  "port": "18080", 修改为18080，防止与其它端口冲突

  "_use_auth": "Enable JWT authorization. Please enable for deployment",
  "use_auth": true, 开启用户认证

  "_jwt": "Private keys for access",
  "jwt": {
    "_admin": "Admin has access to all APIs",
    "admin": {
      "key": "adminkey" 用户认证的key
    },
    "_user": "User only has access to /volumes endpoint",
    "user": {
      "key": "My Secret"
    }
  },

  "_glusterfs_comment": "GlusterFS Configuration",
  "glusterfs": {
    "_executor_comment": [
      "Execute plugin. Possible choices: mock, ssh",
      "mock: This setting is used for testing and development.",
      "      It will not send commands to any node.",
      "ssh:  This setting will notify Heketi to ssh to the nodes.",
      "      It will need the values in sshexec to be configured.",
      "kubernetes: Communicate with GlusterFS containers over",
      "            Kubernetes exec api."
    ],
    "executor": "ssh", 访问glusterfs集群的方法

    "_sshexec_comment": "SSH username and private key file information",
    "sshexec": {
      "keyfile": "/etc/heketi/heketi_key", 访问glusterfs集群使用的私钥，需要提前在k8s集群master节点生成并copy到glusterfs集群所有节点,需要从/root/.ssh/id_rsa复制到此处才可以使用。
      "user": "root", 认证使用的用户
      "port": "22", ssh连接使用的端口
      "fstab": "/etc/fstab" 挂载的文件系统
    },

    "_kubeexec_comment": "Kubernetes configuration",
    "kubeexec": {
      "host" :"https://kubernetes.host:8443",
      "cert" : "/path/to/crt.file",
      "insecure": false,
      "user": "kubernetes username",
      "password": "password for kubernetes user",
      "namespace": "OpenShift project or Kubernetes namespace",
      "fstab": "Optional: Specify fstab file on node.  Default is /etc/fstab"
    },

    "_db_comment": "Database file name",
    "db": "/var/lib/heketi/heketi.db", 数据库位置

    "_loglevel_comment": [
      "Set log level. Choices are:",
      "  none, critical, error, warning, info, debug",
      "Default is warning"
    ],
    "loglevel" : "warning" 修改日志级别
  }
}
~~~

> 需要说明的是，heketi有三种executor，分别为mock、ssh、kubernetes，建议在测试环境使用mock，生产环境使用ssh，当glusterfs以容器的方式部署在kubernetes上时，才使用kubernetes。我们这里将glusterfs和heketi独立部署，使用ssh的方式。

## 4.4 配置ssh密钥

在上面我们配置heketi的时候使用了ssh的executor，那么就需要heketi服务器能通过ssh密钥的方式连接到所有glusterfs节点进行管理操作，所以需要先生成ssh密钥

### 4.4.1 生成密钥

~~~powershell
[root@master01 ~]# ssh-keygen -t rsa -f /root/.ssh/id_rsa -N ''
Generating public/private rsa key pair.
Your identification has been saved in /root/.ssh/id_rsa.
Your public key has been saved in /root/.ssh/id_rsa.pub.
The key fingerprint is:
SHA256:EG1ql3V+ExAqMTubL4AqSgCMGZ0mZliSsVH2n83TT28 root@master01
The key's randomart image is:
+---[RSA 2048]----+
|**+.  ..o   oo   |
|*X+.   .o+... .  |
|B+  . .o+o.o   . |
|.    oo=o*  . o  |
|.   ..+.S . .. . |
|.  .   . o o .   |
|...     . . . E  |
|o.       .   .   |
|.                |
+----[SHA256]-----+
~~~

### 4.4.2 复制密钥到远程主机

~~~powershell
[root@master01 ~]# ssh-copy-id 192.168.10.60

[root@master01 ~]# ssh-copy-id 192.168.10.61

[root@master01 ~]# ssh-copy-id 192.168.10.62
~~~

### 4.4.3 验证密钥的可用性

~~~powershell
[root@master01 ~]# ssh 192.168.10.60
Last login: Wed Jan 29 20:17:39 2020 from 192.168.10.1
[root@g1 ~]# exit
登出
Connection to 192.168.10.60 closed.
[root@master01 ~]# ssh 192.168.10.61
Last login: Wed Jan 29 20:17:51 2020 from 192.168.10.1
[root@g2 ~]# exit
登出
Connection to 192.168.10.61 closed.
[root@master01 ~]# ssh 192.168.10.62
Last login: Wed Jan 29 20:18:04 2020 from 192.168.10.1
[root@g3 ~]# exit
登出
Connection to 192.168.10.62 closed.

~~~

### 4.4.4 复制私密到/etc/heketi目录

~~~powershell
[root@master01 ~]# cp .ssh/id_rsa /etc/heketi/heketi_key

[root@master01 ~]# ls /etc/heketi/
heketi.json  heketi.json.bak  heketi_key
~~~

## 4.5 启动Heketi

>默认yum安装后，/etc/heketi及/var/lib/heketi目录所有者是root, 但是安装提供的service文件的user又是heketi. 导致不修改权限就是启动不起来,因此需要修改权限再启动服务。

~~~powershell
[root@master01 heketi]# chown heketi:heketi /etc/heketi/ -R || chown heketi:heketi /var/lib/heketi -R
~~~

~~~powershell
[root@master01 ~]# systemctl enable heketi
[root@master01 ~]# systemctl start heketi
[root@master01 ~]# systemctl status heketi
● heketi.service - Heketi Server
   Loaded: loaded (/usr/lib/systemd/system/heketi.service; enabled; vendor preset: disabled)
   Active: active (running) since 三 2020-01-29 22:13:52 CST; 2min 31s ago
 Main PID: 23664 (heketi)
    Tasks: 11
   Memory: 8.8M
   CGroup: /system.slice/heketi.service
           └─23664 /usr/bin/heketi --config=/etc/heketi/heketi.json

1月 29 22:13:52 master01 systemd[1]: Started Heketi Server.
1月 29 22:13:52 master01 heketi[23664]: Heketi 9.0.0
1月 29 22:13:52 master01 heketi[23664]: Authorization loaded
1月 29 22:13:52 master01 heketi[23664]: Listening on port 18080
~~~

## 4.6 验证Heketi

~~~powershell
验证是否可以创建集群
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 --json  cluster create
{"id":"1c8824939237ea79aa17a127e958fc92","nodes":[],"volumes":[],"block":true,"file":true,"blockvolumes":[]}

删除已创建的集群
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 --json  cluster delete 1c8824939237ea79aa17a127e958fc92
Cluster 1c8824939237ea79aa17a127e958fc92 deleted

~~~

## 4.7 创建集群

~~~powershell
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 --json  cluster create
{"id":"dd456dbc15f1206e980fdb5345117085","nodes":[],"volumes":[],"block":true,"file":true,"blockvolumes":[]}

说明
192.168.10.11 为在k8s集群master节点IP
~~~

## 4.8 添加节点

~~~powershell
添加g1
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 --json  node add --cluster "dd456dbc15f1206e980fdb5345117085" --management-host-name 192.168.10.60  --storage-host-name 192.168.10.60  --zone 1
{"zone":1,"hostnames":{"manage":["192.168.10.60"],"storage":["192.168.10.60"]},"cluster":"dd456dbc15f1206e980fdb5345117085","id":"217899105fa01434f9f29625e7ad9cfb","state":"online","devices":[]}

添加g2
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 --json  node add --cluster "dd456dbc15f1206e980fdb5345117085" --management-host-name 192.168.10.61  --storage-host-name 192.168.10.61  --zone 1
{"zone":1,"hostnames":{"manage":["192.168.10.61"],"storage":["192.168.10.61"]},"cluster":"dd456dbc15f1206e980fdb5345117085","id":"b8cb7ce3f753fea41bb170f2639a1554","state":"online","devices":[]}

添加g3
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 --json  node add --cluster "dd456dbc15f1206e980fdb5345117085" --management-host-name 192.168.10.62  --storage-host-name 192.168.10.62  --zone 1
{"zone":1,"hostnames":{"manage":["192.168.10.62"],"storage":["192.168.10.62"]},"cluster":"dd456dbc15f1206e980fdb5345117085","id":"bd7637215a852092583d7e5cd84b6c9e","state":"online","devices":[]}
~~~

~~~powershell
查看集群中node列表
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080   node list
Id:217899105fa01434f9f29625e7ad9cfb     Cluster:dd456dbc15f1206e980fdb5345117085
Id:b8cb7ce3f753fea41bb170f2639a1554     Cluster:dd456dbc15f1206e980fdb5345117085
Id:bd7637215a852092583d7e5cd84b6c9e     Cluster:dd456dbc15f1206e980fdb5345117085
~~~

## 4.9 添加设备

### 4.9.1 错误的示范

~~~powershell
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080   device add --name "/dev/sdb" --node 217899105fa01434f9f29625e7ad9cfb
Error: Setup of device /dev/sdb failed (already initialized or contains data?):   Can't open /dev/sdb exclusively.  Mounted filesystem?
  Can't open /dev/sdb exclusively.  Mounted filesystem?
~~~

### 4.9.2 添加新硬盘

> 如果没有做使用测试，可以不操作此步骤。

~~~powershell
[root@g1 ~]# lsblk
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
vda             252:0    0   20G  0 disk
├─vda1          252:1    0    1G  0 part /boot
└─vda2          252:2    0   19G  0 part
  ├─centos-root 253:0    0   17G  0 lvm  /
  └─centos-swap 253:1    0    2G  0 lvm  [SWAP]
sdb             252:16   0  100G  0 disk /glustersdb
sdc             252:32   0   50G  0 disk

[root@g2 ~]# lsblk
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
vda             252:0    0   20G  0 disk
├─vda1          252:1    0    1G  0 part /boot
└─vda2          252:2    0   19G  0 part
  ├─centos-root 253:0    0   17G  0 lvm  /
  └─centos-swap 253:1    0    2G  0 lvm  [SWAP]
sdb             252:16   0  100G  0 disk /glustersdb
sdc             252:32   0   50G  0 disk

[root@g3 ~]# lsblk
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
vda             252:0    0   20G  0 disk
├─vda1          252:1    0    1G  0 part /boot
└─vda2          252:2    0   19G  0 part
  ├─centos-root 253:0    0   17G  0 lvm  /
  └─centos-swap 253:1    0    2G  0 lvm  [SWAP]
sdb             252:16   0  100G  0 disk /glustersdb
sdc             252:32   0   50G  0 disk
~~~

### 4.9.3 添加GlusterFS集群节点中的设备到Heketi集群

~~~powershell
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080   device add --name "/dev/sdc" --node 217899105fa01434f9f29625e7ad9cfb
Device added successfully

[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080   device add --name "/dev/sdc" --node b8cb7ce3f753fea41bb170f2639a1554
Device added successfully

[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080   device add --name "/dev/sdc" --node bd7637215a852092583d7e5cd84b6c9e
Device added successfully
~~~

### 4.9.4 验证节点及设备添加情况

~~~powershell
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080  topology info

或

[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080  topology info --json
~~~

## 4.10 测试通过Heketi在GlusterFS集群中添加volume

### 4.10.1 在k8s集群master节点查看是否有volume

~~~powershell
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 volume list
~~~

### 4.10.2 在k8s集群master节点创建volume

~~~powershell
获取帮助
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 volume create -h
~~~

~~~powershell
创建一个复制卷，共5G大小。卷的名称自动生成。
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 volume create --size=5 --replica=2
Name: vol_80539c6510a73f70ad3453c221901334
Size: 5
Volume Id: 80539c6510a73f70ad3453c221901334
Cluster Id: dd456dbc15f1206e980fdb5345117085
Mount: 192.168.10.60:vol_80539c6510a73f70ad3453c221901334
Mount Options: backup-volfile-servers=192.168.10.61,192.168.10.62
Block: false
Free Size: 0
Reserved Size: 0
Block Hosting Restriction: (none)
Block Volumes: []
Durability Type: replicate
Distribute Count: 1
Replica Count: 2
~~~

~~~powershell
验证卷是否创建
[root@master01 ~]# heketi-cli --user admin --secret adminkey --server http://192.168.10.11:18080 volume list
Id:80539c6510a73f70ad3453c221901334    Cluster:dd456dbc15f1206e980fdb5345117085    Name:vol_80539c6510a73f70ad3453c221901334

在GlusterFS集群节点中验证即可看到已创建的卷。
[root@g1 ~]# gluster volume list
k8s-test-volume
vol_80539c6510a73f70ad3453c221901334
~~~

# 五、K8S集群使用GlusterFS集群

> 提示：k8s中使用glusterfs的时候， 会根据pvc的申请自动创建对应的pv， 然后绑定。

## 5.1 在k8s集群master节点创建storageclass资源清单文件

~~~powershell
[root@master01 yaml]# cat storageclass-gluserfs.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: glusterfs
provisioner: kubernetes.io/glusterfs #表示存储分配器，需要根据后端存储的不同而变更
parameters:
  resturl: "http://192.168.10.11:18080" #heketi API服务提供的URL,为k8s集群master节点IP
  restauthenabled: "true" #可选参数，默认为"false",heketi服务开启认证时，必须设置为"true"
  restuser: "admin" #可选参数，开启认证时设置相应用户名
  restuserkey: "adminkey" #可选，开启认证时设置密码
  volumetype: "replicate:2" #可选参数，设置卷类型及其参数，如果未分配卷类型，则有分配器决定卷类型；如”volumetype: replicate:3”表示3副本的replicate卷，”volumetype: disperse:4:2”表示disperse卷，其中‘4’是数据，’2’是冗余校验，”volumetype: none”表示distribute卷
~~~

## 5.2 在k8s集群master节点应用上述资源清单文件

~~~powershell
[root@master01 yaml]# kubectl apply -f storageclass-gluserfs.yaml
storageclass.storage.k8s.io/glusterfs created
~~~

## 5.3 在k8s集群master节点验证是否创建storageclass存储对象

~~~powershell
[root@master01 yaml]# kubectl get sc
NAME                  PROVISIONER               RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
glusterfs             kubernetes.io/glusterfs   Delete          Immediate           false                  48s
~~~

## 5.4 在k8s集群master节点创建用于创建PVC的资源清单文件

~~~powershell
[root@master01 yaml]# cat glusterfs-pvc.yaml
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: glusterfs-mysql
  namespace: default
  annotations:
    volume.beta.kubernetes.io/storage-class: "glusterfs"
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 2Gi
~~~

## 5.5  在k8s集群master节点应用上述资源清单文件

~~~powershell
[root@master01 yaml]# kubectl apply -f glusterfs-pvc.yaml
persistentvolumeclaim/glusterfs-mysql created
~~~

## 5.6 在k8s集群master节点验证是否创建PVC

~~~powershell
[root@master01 yaml]# kubectl get pv,pvc
NAME                                                        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                                            STORAGECLASS          REASON   AGE

persistentvolume/pvc-77d6fca6-f284-49fb-a0f3-8f5664690562   2Gi        RWX            Delete           Bound    default/glusterfs-mysql                          glusterfs                      2s

NAME                                    STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
persistentvolumeclaim/glusterfs-mysql   Bound    pvc-77d6fca6-f284-49fb-a0f3-8f5664690562   2Gi        RWX            glusterfs      3s

~~~

## 5.7 在k8s集群master节点创建Pod时使用上述创建的PVC

~~~powershell
[root@master01 yaml]# cat mysql.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-svc
  labels:
    app: mysql-svc
spec:
  ports:
  - port: 3306
    name: mysql
  clusterIP: None
  selector:
    name: mysql
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: default
spec:
  serviceName: mysql-svc
  selector:
    matchLabels:
      name: mysql
  replicas: 1
  template:
    metadata:
      labels:
        name: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:5.7
        imagePullPolicy: IfNotPresent
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "123456"
        ports:
          - containerPort: 3306
            name: mysql
        volumeMounts:
        - name: glusterfs-mysql-data
          mountPath: "/var/lib/mysql"

      volumes:
      - name: glusterfs-mysql-data
        persistentVolumeClaim:
          claimName: glusterfs-mysql
~~~

~~~powershell
[root@master01 yaml]# kubectl apply -f mysql.yaml
service/mysql-svc created
statefulset.apps/mysql created
~~~

~~~powershell
[root@master01 ~]# kubectl get pods
NAME                                      READY   STATUS    RESTARTS   AGE
busybox-pod                               1/1     Running   247        14d
mysql-0                                   1/1     Running   0          27s
nfs-client-provisioner-5786f95795-x7bcs   1/1     Running   1          30h
[root@master01 ~]# kubectl exec -it mysql-0 sh
# mysql -uroot -p123456
mysql: [Warning] Using a password on the command line interface can be insecure.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 2
Server version: 5.7.29 MySQL Community Server (GPL)

Copyright (c) 2000, 2020, Oracle and/or its affiliates. All rights reserved.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
4 rows in set (0.01 sec)

mysql> create database k8sonline;
Query OK, 1 row affected (0.01 sec)

mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| k8sonline          |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
5 rows in set (0.01 sec)
~~~

~~~powershell
查看GlusterFS集群数据存储位置

在g1节点
[root@g1 ~]# gluster volume list
vol_80539c6510a73f70ad3453c221901334

[root@g1 ~]# gluster volume info vol_80539c6510a73f70ad3453c221901334

Volume Name: vol_80539c6510a73f70ad3453c221901334
Type: Replicate
Volume ID: 5df33cf0-093d-4a6c-9a2c-d2b4ec195c9e
Status: Started
Snapshot Count: 0
Number of Bricks: 1 x 2 = 2
Transport-type: tcp
Bricks:
Brick1: 192.168.10.61:/var/lib/heketi/mounts/vg_d62a7a4a632dd4864edc367c952d0fa9/brick_f7d134a34348c334a369b84604db9a40/brick
Brick2: 192.168.10.60:/var/lib/heketi/mounts/vg_6e8d391aec35995a4ee82e53e986bf70/brick_b4caa8e338233c536fd98966eeccce98/brick
Options Reconfigured:
user.heketi.id: 80539c6510a73f70ad3453c221901334
transport.address-family: inet
storage.fips-mode-rchecksum: on
nfs.disable: on
performance.client-io-threads: off

在g2节点
[root@g2 ~]# ls /var/lib/heketi/mounts/vg_d62a7a4a632dd4864edc367c952d0fa9/brick_834718f2a0236b913b3aa14609b34819/brick/
auto.cnf         ib_buffer_pool  k8sonline           server-cert.pem
ca-key.pem       ibdata1         mysql               server-key.pem
ca.pem           ib_logfile0     performance_schema  sys
client-cert.pem  ib_logfile1     private_key.pem
client-key.pem   ibtmp1          public_key.pem
~~~

## 5.8 关于storageclass资源清单的扩展

以上将userkey明文写入配置文件创建storageclass的方式，官方推荐将key使用secret保存。

~~~powershell
# glusterfs-secret.yaml内容如下：

apiVersion: v1
kind: Secret
metadata:
  name: heketi-secret
  namespace: default
data:
  # base64 encoded password. E.g.: echo -n "mypassword" | base64
  key: TFRTTkd6TlZJOEpjUndZNg==
type: kubernetes.io/glusterfs
~~~

~~~powershell
# storageclass-glusterfs.yaml内容修改如下：

apiVersion: storage.k8s.io/v1beta1
kind: StorageClass
metadata:
  name: glusterfs
provisioner: kubernetes.io/glusterfs
parameters:
  resturl: "http://192.168.10.11:18080"
  clusterid: "dd456dbc15f1206e980fdb5345117085"
  restauthenabled: "true"
  restuser: "admin"
  secretNamespace: "default"
  secretName: "heketi-secret"
  #restuserkey: "adminkey"
  gidMin: "40000"
  gidMax: "50000"
  volumetype: "replicate:2"
~~~

## 5.9 FAQ

### 问题

- heketi有些卷明明存在但是却删不了
   直接删除heketi存储目录/var/lib/heketi/ 下的mounts/文件夹，然后> heketi.db 清空db文件，重新来

- Can't initialize physical volume "/dev/sdb1" of volume group "vg1" without –ff
   这是因为没有卸载之前的vg和pv,使用命令vgremove,pvremove依次删除卷组，逻辑卷即可

