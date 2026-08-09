---
title: "☯️ 达梦数据库安装使用教程"
sidebarGroup: "系列篇"
shortTitle: "☯️ 达梦数据库安装使用教程"
order: 107
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "1.前言随着大环境的发展，很多公司开始逐步迁移使用国产数据库代替原有的数据库，为了让大家更加方便的学习，本篇文章给大家带来国产数据库-达梦的安装教程2.环境准备达梦数据库支持Windows、Linux和Unix操作系统，我们学习的话在本机使"
article: false
---

> 来源：[☯️ 达梦数据库安装使用教程](https://www.yuque.com/tulingzhouyu/db22bv/gspgyeys4ozne4uk)

# 1.前言

随着大环境的发展，很多公司开始逐步迁移使用国产数据库代替原有的数据库，为了让大家更加方便的学习，本篇文章给大家带来国产数据库-达梦的安装教程

# 2.环境准备

达梦数据库支持Windows、Linux和Unix操作系统，我们学习的话在本机使用VM安装一个Centos，然后去[达梦官网下载](https://www.dameng.com/list_103.html)适用自己平台的安装包。

达梦正式版需要授权，自学选择试用版就可以了。本教程使用的是VM安装的centos7.2。所以选择X86架构、Centos7的安装包。

```powershell
# 查看CPU以及整个系统的架构相关信息
lscpu
# 查看系统版本
cat /etc/redhat-release
# 查看系统位数
getconf LONG_BIT
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-dc0d65a285f6.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-3303f5cdf933.png)

# 3.安装

为了更好的管理用户与资源消耗，我们可以添加一个用户组专门处理达梦数据库。

## 3.1.添加用户

```powershell
# 添加组
groupadd dinstall
# 添加安装用户
useradd -g dinstall dmdba
# 设置dmdba密码：dameng123123
echo "dameng123123" | passwd dmdba --stdin
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-f5ed791f008c.png)

## 3.2.切换到dmdba账户，查看限制信息，使用root账户修改dmdba用户资源限制

```powershell
# 切换到dmdba账户，查看当前用户限制信息
su dmdba
ulimit -a
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-aa5a9aa9ff09.png)

```powershell
# 使用root账户修改配置
cat >> /etc/security/limits.conf << EOF
dmdba    soft    nofile    65536
dmdba    hard    nofile    65536	
EOF
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-1c1a228f12b1.png)

验证是否修改成功：

```powershell
su dmdba
ulimit -a
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-7edb2d25eed0.png)

## 3.3.统一管理应用

```powershell
# 使用root账号根目录创建app/dmDB8文件夹
mkdir -p /app/dmDB8
# 数据文件存放目录
mkdir -p /app/dmDB8/installData
# 达梦安装文件目录
mkdir -p /app/dmDB8/data
# 开通dmdba权限
chown dmdba:dinstall /app/dmDB8/ /app/dmDB8/data /app/dmDB8/installData
# 或者
chown -R dmdba:dinstall /app/dmDB8

# 查看
ls -ld /app/dmDB8
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-89e9850bea96.png)

## 3.4.关闭防火墙

```powershell
# 检查防火墙状态
firewall-cmd --state
# 停止并禁用防火墙
systemctl stop firewalld
systemctl disable firewalld
# 删除防火墙
yum remove firewalld
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-610e8a3fd962.png)

## 3.5.安装依赖包

检查依赖包是否正常，缺少哪个依赖就安装哪个即可。注意需要使用root用户才能安装

```powershell
#下面开始使用root账号安装依赖
# 检查是否安装相关依赖
rpm -q glibc
rpm -q libXp
rpm -q libXt
rpm -q libXtst
# 安装依赖
yum install glibc
yum install libXp
yum install libXt
yum install libXtst
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-40af63e24e9c.png)

安装后重新检查：

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-aaa0ad95986c.png)

## 3.6.上传安装包，解压安装包并挂载镜像文件

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-7842511c8714.png)

```powershell
cd /app/dmDB8
unzip dm8_20230418_x86_rh6_64.zip
mount -o loop dm8_20230418_x86_rh6_64.iso /mnt

cd /mnt/
ll
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-67477fd87a33.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-a73676306a2b.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-bc33b7014c00.png)

切换到dmdba用户，然后进入mnt目录查看文件；调用bin文件开始安装，如果没有安装图形化软件将出现以下提示

```powershell
# 192.168.10.50本机ip
export DISPLAY=192.168.10.50:0.0
./DMInstall.bin
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-9f4c218e5a44.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-e20323b56d9a.png)

## 3.7.本机安装Xmanager

## 3.8.图形化安装

### 3.8.1.安装完后Xmanager，linux指定本机端口，然后图形化安装

```powershell
# 192.168.10.50本机ip
export DISPLAY=192.168.10.50:0.0
./DMInstall.bin
```

### 3.8.2.启用图形化之后，使用默认配置即可，一直下一步

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-b7dac35a736d.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-babceb20dae4.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-bceb8411faaa.png)

### 3.8.3.学习使用，不用填写key，直接下一步

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-1931d9da17e8.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-e1b053732ebf.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-0556c5dc98d3.png)

### 3.8.4.注意安装到对应的自定义目录，并且安装文件夹需要是空的。

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-5126b1a6f6b9.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-2752ebfa7118.png)

### 3.8.5.安装完成之后，一定不要直接点OK，认真观看提示。

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-d056607f3ddc.png)

### 3.8.6.到这一步之后，先复制软件提供的命令，然后使用root账号执行

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-3ac4bd3b063a.png)

### 3.8.7.点击OK-->finish

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-97fc1cfe892c.png)

### 3.8.8.点击init初始化数据库，出现以下界面，开始创建数据库，又或者是使用tool目录下的工具初始化数据库

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-2913db25bc18.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-abeecf1bb7b5.png)

## 3.9.初始化数据库

### 3.9.1.观察下达梦数据库的安装目录

```powershell
# bin执目录，tool工具目录
cd /app/dmDB8/installData/
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-97d8b159d624.png)

### 3.9.2.使用命令创建数据库

```powershell
# 直接使用
/app/dmDB8/installData/tool/dbca.sh
# 或者进入到tool目录
./dbca.sh 
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-702705ea1da6.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-5412ce72884f.png)

### 3.9.3.需要修改下数据库对应文件所在位置

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-4215e508e612.png)

### 3.9.4.下一步之后，可以修改数据名称与实例名

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-fd958812f290.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-b0b6fa85991d.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-6449b15da897.png)

### 3.9.5.设置统一密码，我这边设置：dameng123

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-cef26fb9b57b.png)

### 3.9.6.选择提供完整示例demo

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-3fa9daa2571c.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-034a462fc1b1.png)

### 3.9.7.点击finish完成，然后开始创建，同样注意提示，用root账号执行相应命令

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-881b35893cbe.png)

### 3.9.8.执行完成之后，可以用以下命令检查状态，没有问题点击OK，然后finish

```powershell
# 注意服务名称
systemctl is-enabled DmServiceBaiLiTestIns.service
	
systemctl status DmServiceBaiLiTestIns.service
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-9da4ea3bbe9b.png)

### 3.9.9.再次执行命令，OK-->finish

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-37c5a3ab4c22.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-1c6742db27df.png)

### 3.9.10.进入data目录查看文件

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-d02465b52749.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-efcd4ab3ce9d.png)

## 3.10.使用tool目录下的disql登录数据库，至此图形化安装完成

```powershell
./disql
conn sysdba/dameng123
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-82ba97bac741.png)

## 3.11.删除数据库

删除数据库，包括删除数据库的数据文件、日志文件、控制文件和初始化参数文件。

为了保证删除数据库成功，必须保证dmserver已关闭。可以使用数据库配置工具来删除数据库。

### 3.11.1.使用root账户停止服务

```powershell
systemctl status DmServiceBaiLiTestIns.service

systemctl stop DmServiceBaiLiTestIns
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-a1b66dcf4159.png)

### 3.11.2.使用dmdba账户删除数据库，整个操作跟初始化数据库类似。直接根据界面提示操作即可。

```powershell
./dbca.sh
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-414270cfb814.png)

### 3.11.3.选中需要删除的数据库

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-fefd52b297d7.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-cacc1758215a.png)

### 3.11.4.点击finish

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-580ed54f2e65.png)

### 3.11.5.进入data数据库安装目录检查是否删除完成

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-1636bc5dd97e.png)

# 4.使用

## 4.1.本机安装达梦客户端

下载window版本安装包，解压zip得到iso文件，再解压iso文件，执行exe文件开始安装

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-e3aae421c483.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-e189861f7c66.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-9032eb888b27.png)

### 4.1.1.跟着引导开始安装

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-39b833722752.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-7642f5810218.png)

### 4.1.2.同样的，自学我们就不填入key

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-05fa634813cf.png)

### 4.1.3.本机安装的时候选择客户端，修改下安装目录

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-f787b59988f4.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-26f4611304f7.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-3eebe77c9a6b.png)

## 4.2.使用客户端连接服务器

打开DM管理工具

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-afff72a36b7a.png)

填入服务器ip地址，输入账户、密码，远程连接

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-6d4cba48e166.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-75411d535798.png)

### 4.2.1这样就连接成功了；日常开发通常会添加一个新用户进行处理，并且新创建一个表空间。

### 4.2.2.创建表空间

选中表空间然后右键新建表空间，填入空间名，点击添加按钮，需要注意文件路径需要从服务器目录获取

我这边填入：/app/dmDB8/installData/data/BaiLiTestDBDemo/BAILI.DBF

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-c533e4c81b17.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-059f727f09f0.png)

### 4.2.3.添加角色

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-c6a4a44cba68.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-b8ec66ba6a49.png)

添加完成后，刷新可以看到用户与模式都存在BAILI

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-e6343938d666.png)

### 4.2.4.使用新用户登录服务器

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-db954ca74f5c.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-127bdfb3f93c.png)

### 4.2.5.添加表并测试

```plsql
# 创建学生表
CREATE TABLE STUDENT (
  STUNO INT CLUSTER PRIMARY KEY,
  STUNAME VARCHAR(15) NOT NULL, 
  TEANO INT, 
  CLASSID INT
);

select * from student;

insert into STUDENT ("STUNO", "STUNAME", "TEANO", "CLASSID") 
VALUES(1, 'baili', 1, 1);

update STUDENT set STUNAME = '百里' where stuno = 1;

delete from STUDENT where stuno = 1;
```

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-52d2e6c27294.png)

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-d3b524d63596.png)

# 5.总结

至此达梦数据库的安装使用教程就到此结束了。

如果有疑问或者是发现什么错误，可以在对应视频留言或者私信up主。

# 6.启动达梦数据库（补充）

部署完成后，关掉服务启动方式

先进入到bin目录下，找到对应的实例，然后直接运行。

![image](/面试题/系列篇/0107-dammam-database-installation-tutorial/img-61301b29781a.png)

```powershell
# 启动
./DmServiceBaiLiTestInsDemo start

# 检查状态
systemctl status DmServiceBaiLiTestInsDemo

# 回到tool目录使用disql，参考目录3.10
```
