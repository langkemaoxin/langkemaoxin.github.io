---
title: CoreDNS级联本地DNS服务器
sidebarGroup: 平台与实战
shortTitle: 20 CoreDNS级联本地DNS服务器
order: 20
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 微服务实战
  - 云原生
  - 课程笔记
description: 'CoreDNS级联本地DNS服务器 ~~~powershell kubectl edit configmap coredns -n kube-system apiVersion: v1 data: C...'
---

> **微服务实战 · 第 16 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# CoreDNS级联本地DNS服务器

~~~powershell
# kubectl edit configmap coredns -n kube-system

apiVersion: v1
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf { 修改这里为本地DNS IP地址
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
    
    
 修改为：
 apiVersion: v1
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . 192.168.10.143 { 重点注意看IP地址，修改为本地DNS IP地址
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
~~~

~~~powershell
# dig -t a ns.mashibing.com @10.96.0.10
~~~

