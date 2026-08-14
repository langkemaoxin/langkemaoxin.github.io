---
title: kn工具安装及应用
sidebarGroup: Serverless
shortTitle: 11 kn工具安装及应用
order: 11
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: 'kn工具安装及应用 一、kn工具介绍 kn工具是Knative命令行管理工具。 二、kn工具下载并安装 ~~~powershell 访问网址： http[path]'
---

> **Serverless · 第 11 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# kn工具安装及应用

# 一、kn工具介绍

kn工具是Knative命令行管理工具。

# 二、kn工具下载并安装

~~~powershell
访问网址：
https://knative.dev/docs/install/client/install-kn/
~~~

![image-20211222165529682](/云原生/serverless/serverless-11-kn工具安装及应用/image-20211222165529682.png)

![image-20211222165609487](/云原生/serverless/serverless-11-kn工具安装及应用/image-20211222165609487.png)

![image-20211222165725254](/云原生/serverless/serverless-11-kn工具安装及应用/image-20211222165725254.png)

~~~powershell
# wget https://storage.googleapis.com/knative-nightly/client/latest/kn-linux-amd64
~~~

~~~powershell
# mv kn-linux-amd64 kn
~~~

~~~powershell
# mv kn /usr/bin/
~~~

~~~powershell
# chmod +x /usr/bin/kn
~~~

# 三、kn工具应用

~~~powershell
# kn
kn is the command line interface for managing Knative Serving and Eventing resources

 Find more information about Knative at: https://knative.dev

Serving Commands:
  service      Manage Knative services
  revision     Manage service revisions
  route        List and describe service routes
  domain       Manage domain mappings
  container    Manage service's containers (experimental)

Eventing Commands:
  source       Manage event sources
  broker       Manage message brokers
  trigger      Manage event triggers
  channel      Manage event channels
  subscription Manage event subscriptions

Other Commands:
  plugin       Manage kn plugins
  completion   Output shell completion code
  version      Show the version of this client

Use "kn <command> --help" for more information about a given command.
Use "kn options" for a list of global command-line options (applies to all commands).
~~~

~~~powershell
查看KSVC
# kn service list
NAME                     URL                                                         LATEST                         AGE     CONDITIONS   READY   REASON
cloudevents-player       http://cloudevents-player.default.knative.example.com       cloudevents-player-00001       5h48m   3 OK / 3     True
helloworld-java-spring   http://helloworld-java-spring.default.knative.example.com   helloworld-java-spring-00001   18h     3 OK / 3     True
~~~

~~~powershell
查看路由
# kn route list
NAME                     URL                                                         READY
cloudevents-player       http://cloudevents-player.default.knative.example.com       True
helloworld-java-spring   http://helloworld-java-spring.default.knative.example.com   True
~~~

~~~powershell
查看broker
# kn broker list
NAME             URL                                                                               AGE     CONDITIONS   READY   REASON
example-broker   http://broker-ingress.knative-eventing.svc.cluster.local/default/example-broker   6h13m   6 OK / 6     True
~~~

