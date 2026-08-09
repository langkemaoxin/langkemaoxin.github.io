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

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593123366-519ab1da-839a-4602-ab70-c1b733f5a85c.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_20%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**Centos7 ISO 文件**

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593109638-5944d3f8-b751-4ef5-965b-083d2d8b230d.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_13%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

.

**xshell 工具，去官网搞一个，个人使用不要钱**

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593919191-23de48b4-ffdb-4200-bd8c-acda6e1f049a.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_9%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**如果是从 0 开始，大家不要自己找对应的版本，找对应的班班小姐姐获取相应的软件以及 ISO。**

**已经趟过的坑就不用再浪费时间了，安装本来就是一个不太重要的东西。**

# 2.VM 安装 Centos7

按照图片操作

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593352408-4eae8312-9258-415f-8afd-d6275cf169a3.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_39%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593394771-60458518-f497-442f-ac69-0e6267ef5a3f.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_39%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593475406-d6c5c002-4ae3-43c4-bc34-484da696dd0d.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_39%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593598546-06fb6ba4-561a-4ebd-9d54-0fa8ddeba03b.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_39%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593614655-2a2c0ce7-6a22-4dfa-a1f4-779789ef62d3.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_39%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593648667-5bbf83fe-4b1b-4f1b-b322-1829cceff00e.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_39%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731593704055-64e6cf1f-62a5-4bd4-9339-d683b2fd1cad.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_39%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**修改完硬件配置后，点击完成会自动启动 Centos7，默默地等待就行。**

## 补充：

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731594347465-8f0bf5f8-1691-416f-8739-91892edd27ca.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_50%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731594421816-e5224c3d-96c3-411b-84c5-51edc4122b36.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_50%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731594495493-6b880411-a769-4e9b-ba4a-c6733664f693.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_50%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

## 继续：

**安装好之后涨这个样子，如果不知道怎么配置网络就开启图形化，在来配置，不会占用多少资源的，开了也可以后续关掉。**

```java
-- 关闭图形化：
systemctl set-default multi-user.target

-- 开启图形化：
systemctl set-default graphical.target
```

**登录账号时，选择 Not listed，然后 输入 root 账号，密码之前自己输入的******

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731594553531-ce200085-29d1-4e57-bf4c-49cd7638c593.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731594816610-00cdcd97-6792-4524-8f58-3c69e8dc9c1c.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731594790064-845ec1b1-31d8-485b-b39b-721f58caa257.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731594970219-ba8f40d6-3dae-4920-b03d-b557ad98a675.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731594901026-cb254541-cc0d-49a0-917f-2cc846734f4a.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731595029953-e2873767-7166-4df2-bf6b-51494fece14f.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731595070652-675e351a-261f-47d0-a455-769d16b58544.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731595148932-ca8de650-a8e2-4d1e-93a8-ddc49c00a321.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731595264330-eab7768a-6a4e-4fd4-a894-749d542dd303.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

![image](https://cdn.nlark.com/yuque/0/2024/png/35268836/1731595301708-66114d3d-ad45-496b-81f5-d8e0c4db8e0d.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_47%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**至此 NAT 网络连接就已经搞定了。**

**不喜欢图形化，使用将上边关闭图形化的命令复制到 xshell 执行。**

**在 VM 中是没有办法复制的。**

**如果你需要使用其他方式配置网络，请联系，更新教程。**

**如果网络一直有问题，请使用补充部分的网络重置。**
