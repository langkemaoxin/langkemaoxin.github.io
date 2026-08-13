---
title: 使用Knative平台环境说明
sidebarGroup: Serverless
shortTitle: 01 使用Knative平台环境说明
order: 1
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: '使用Knative平台环境说明 整套环境需要VPN支持，请自行解决。 一、Kubernetes集群说明 kubernetes集群中所有节点计算资源配置为:CPU 8核，内存8G。网络资源及存储资源越大...'
---

> **Serverless · 第 1 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 使用Knative平台环境说明

> 整套环境需要VPN支持，请自行解决。

# 一、Kubernetes集群说明

> kubernetes集群中所有节点计算资源配置为:CPU 8核，内存8G。网络资源及存储资源越大越好。
>
> 操作系统版本为:CentOS7u9,操作系统内核版本为:5.15

## 1.1 部署方法说明

- minikube
- kubeadm
- 二进制部署
- 国内第三方部署工具(kubease)

## 1.2 部署架构说明

> 本次用例为单Master节点，既一主多从模式。

### 1.2.1 单Master节点

- 一主多从

### 1.2.2 多Master节点

- 多主多从

## 1.3 Kubernetes集群版本说明

> Knative建议Kubernetes在1.20或以上版本

~~~powershell
查看集群节点及集群版本
# kubectl get nodes
NAME           STATUS   ROLES                  AGE     VERSION
k8s-master01   Ready    control-plane,master   3d12h   v1.21.8
k8s-worker01   Ready    <none>                 3d12h   v1.21.8
k8s-worker02   Ready    <none>                 3d12h   v1.21.8
~~~

## 1.4 Kube-proxy使用ipvs转发Service流量

~~~powershell
配置kube proxy使用ipvs转发
# kubectl edit cm kube-proxy -n kube-system

	 33     ipvs:
     34       excludeCIDRs: null
     35       minSyncPeriod: 0s
     36       scheduler: ""
     37       strictARP: true 注意此处
     38       syncPeriod: 0s
     39       tcpFinTimeout: 0s
     40       tcpTimeout: 0s
     41       udpTimeout: 0s
     42     kind: KubeProxyConfiguration
     43     metricsBindAddress: ""
     44     mode: "ipvs" 注意此处
     45     nodePortAddresses: null
     46     oomScoreAdj: null
     47     portRange: ""

~~~

# 二、Kubernetes集群公共服务说明

![image-20211229121812071](/云原生/serverless/serverless-01-使用knative平台环境说明/image-20211229121812071.png)

## 2.1 DNS服务

~~~powershell
主配置文件
[root@dnsserver ~]# cat -n /etc/named.conf | grep "any;"
    13          listen-on port 53 { 127.0.0.1;any; };
    21          allow-query     { localhost;any; };
~~~

~~~powershell
域名注册文件
[root@dnsserver ~]# cat -n /etc/named.rfc1912.zones | tail -5
    43  zone "kubemsb.com" IN {
    44          type master;
    45          file "kubemsb.com.zone";
    46          allow-update { none; };
    47  };
~~~

~~~powershell
正向区域解析文件
[root@dnsserver ~]# cat -n /var/named/kubemsb.com.zone
     1  $TTL 1D
     2  @       IN SOA  @ admin.kubemsb.com. (
     3                                          0       ; serial
     4                                          1D      ; refresh
     5                                          1H      ; retry
     6                                          1W      ; expire
     7                                          3H )    ; minimum
     8          NS      @
     9  @       A       192.168.10.253
    10  master01        A       192.168.10.10
    11  worker01        A       192.168.10.20
    12  worker02        A       192.168.10.21
    13  yaml    A       192.168.10.252
    14  harbor  A       192.168.10.251
    15  www     A       192.168.10.251
    16  gitlab  A       192.168.10.250
    17  nfsserver       A       192.168.10.249
    18  *.knative       A       192.168.10.200
~~~

## 2.2 负载均衡服务

> 网址：https://metallb.universe.tf/

> 按官方网址配置即可，配置文件（metallb-conf-yaml）已提供，直接应用即可。

~~~powershell
已创建的命名空间
# kubectl get namespace
NAME               STATUS   AGE
default            Active   3d12h
kube-node-lease    Active   3d12h
kube-public        Active   3d12h
kube-system        Active   3d12h
metallb-system     Active   3d1h
~~~

~~~powershell
已运行的Pod
# kubectl get pods -n metallb-system
NAME                          READY   STATUS    RESTARTS   AGE
controller-7dcc8764f4-8gkzv   1/1     Running   9          3d1h
speaker-d5wv8                 1/1     Running   6          3d1h
speaker-kk84s                 1/1     Running   6          3d1h
speaker-q5qls                 1/1     Running   6          3d1h
~~~

~~~powershell
这是配置meatllb文件，关于controller及speaker需要的资源清单文件，需要在网站上下载。
# cat metallb-conf.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: metallb-system
  name: config
data:
  config: |
    address-pools:
    - name: default
      protocol: layer2
      addresses:
      - 192.168.10.200-192.168.10.230
~~~

## 2.3 容器镜像仓库服务

> 一定要开始TLS证书认证，否则Tekton应用过程中会有问题。

![image-20211229115422542](/云原生/serverless/serverless-01-使用knative平台环境说明/image-20211229115422542.png)

~~~powershell
注意使用TLS证书，如注册域名在阿里云，可直接在阿里云上购买证书。
# cat harbor.yml
.......
hostname: www.kubemsb.com

# http related config
http:
  # port for http, default is 80. If https enabled, this port will redirect to https port
  port: 80

# https related config
https:
  # https port for harbor, default is 443
  port: 443
  # The path of cert and key files for nginx
  certificate: /home/harbor/kubemsb.com.pem
  private_key: /home/harbor/kubemsb.com.key
~~~

## 2.4 资源清单文件托管服务

~~~powershell
进入解压后安装目录
# cd nginx-1.18.0/

准备好ngx-fancyindex文件

# ./configure --prefix=/usr/local/nginx --with-http_ssl_module --with-http_stub_status_module --with-http_realip_module --add-module=/root/nginx/ngx-fancyindex-0.4.3/
~~~

~~~powershell
查看安装目录
# ls /usr/local/nginx
client_body_temp  conf  fastcgi_temp  html  logs  proxy_temp  sbin  scgi_temp  uwsgi_temp

查看文件内容
# cat /usr/local/nginx/conf/nginx.conf

#user  nobody;
worker_processes  1;

#error_log  logs/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;

#pid        logs/nginx.pid;

events {
    worker_connections  1024;
}

http {
    .....

    server {
        listen       80;
        server_name yaml.kubemsb.com;

        #charset koi8-r;

        #access_log  logs/host.access.log  main;

        location / {
            root   html;
            index  index; 注意此处，需要修改
            fancyindex on; 注意此处，需要添加
            fancyindex_exact_size off; 注意此处，需要添加
        }

        ......

}
~~~

## 2.5 代码托管服务

> 新版本的gitlab-ce密码要注意，在/etc/gitlab/initial_root_password文件中

~~~powershell
# cat /etc/gitlab/initial_root_password
......

Password: 7vIlNomQh3wcR92ATbDzRCvWZYePsLcV73/5nEkTAcA=
~~~

~~~powershell
yum安装使用的源

# cat /etc/yum.repos.d/gitlab-ce.repo
[gitlab-ce]
name=Gitlab CE Repository
baseurl=https://mirrors.cloud.tencent.com/gitlab-ce/yum/el7/
gpgcheck=0
enabled=1
~~~

