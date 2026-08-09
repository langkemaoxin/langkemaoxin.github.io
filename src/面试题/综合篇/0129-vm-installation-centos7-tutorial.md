---
title: "VM虚拟机安装Centos7教程"
sidebarGroup: "综合篇"
shortTitle: "VM虚拟机安装Centos7教程"
order: 129
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "1.前置准备虚拟机软件： VMware Workstation ProCentos7 ISO 文件.xshell 工具，去官网搞一个，个人使用不要钱如果是从 0 开始，大家不要自己找对应的版本，找对应的班班小姐姐获取相应的软件以及 ISO。"
article: false
---

> 来源：[VM虚拟机安装Centos7教程](https://www.yuque.com/tulingzhouyu/db22bv/wyvmp2h6ka9h90yf)

# 1.前置准备

虚拟机软件：** VMware Workstation Pro**

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-0b765f974d07.png)

**Centos7 ISO 文件**

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-da2080b95d9e.png)

.

**xshell 工具，去官网搞一个，个人使用不要钱**

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-ff39ddc18690.png)

**如果是从 0 开始，大家不要自己找对应的版本，找对应的班班小姐姐获取相应的软件以及 ISO。**

**已经趟过的坑就不用再浪费时间了，安装本来就是一个不太重要的东西。**

# 2.VM 安装 Centos7

按照图片操作

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-d2b797c2d223.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-d984f2a9e95f.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-c4285342bf0b.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-816f0901d724.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-c5cf277d80cd.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-312251313653.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-b51693246dd0.png)

**修改完硬件配置后，点击完成会自动启动 Centos7，默默地等待就行。**

## 补充：

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-412ad18911fb.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-96f86102c1c6.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-1675b52a2d95.png)

## 继续：

**安装好之后涨这个样子，如果不知道怎么配置网络就开启图形化，在来配置，不会占用多少资源的，开了也可以后续关掉。**

```java
-- 关闭图形化：
systemctl set-default multi-user.target

-- 开启图形化：
systemctl set-default graphical.target
```

**登录账号时，选择 Not listed，然后 输入 root 账号，密码之前自己输入的******

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-fa77740b9dd0.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-95f4df23cf99.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-b9e9cc0714f4.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-615284ed2173.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-a4d26d27770e.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-1b2edbd4d013.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-346c45b99c61.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-342142f2021e.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-3508da1b938d.png)

![image](/面试题/综合篇/0129-vm-installation-centos7-tutorial/img-e05b5fa4079d.png)

**至此 NAT 网络连接就已经搞定了。**

**不喜欢图形化，使用将上边关闭图形化的命令复制到 xshell 执行。**

**在 VM 中是没有办法复制的。**

**如果你需要使用其他方式配置网络，请联系，更新教程。**

**如果网络一直有问题，请使用补充部分的网络重置。**
