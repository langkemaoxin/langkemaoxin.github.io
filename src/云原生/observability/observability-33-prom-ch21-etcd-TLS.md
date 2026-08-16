---
title: Prometheus 第21章：etcd TLS
sidebarGroup: 可观测性
shortTitle: 33 etcd TLS
order: 33
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第21章（etcd TLS）合并笔记
---

> **Prometheus · 第 21 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 21.1 k8s接口鉴权token认证和prometheus的实现

# 本节重点介绍 :

- k8s接口鉴权方式
- serviceaccount和token的关系
- 手动curl访问metrics接口

# k8s对象接口鉴权

## 以容器基础资源指标为例

- 对应就是访问node上的kubelet的/metrics/cadvisor接口，即访问`https://nodeip:10250/metrics/cadvisor`

### 直接curl访问

- 会报错，如下所示

```shell
curl https://localhost:10250/metrics/cadvisor
curl: (60) Peer's certificate issuer has been marked as not trusted by the user.
More details here: http://curl.haxx.se/docs/sslcerts.html

curl performs SSL certificate verification by default, using a "bundle"
 of Certificate Authority (CA) public keys (CA certs). If the default
 bundle file isn't adequate, you can specify an alternate file
 using the --cacert option.
If this HTTPS server uses a certificate signed by a CA represented in
 the bundle, the certificate verification probably failed due to a
 problem with the certificate (it might be expired, or the name might
 not match the domain name in the URL).
If you'd like to turn off curl's verification of the certificate, use
 the -k (or --insecure) option.
```

#### 原因解析

- 因为node上的kubelet的/metrics/cadvisor接口开启了https
- 而且证书属于自签的，没有在本地的证书链中，我们可以使用 curl -vvv打印访问过程

```shell
[root@k8s-master01 ink8s-pod-metrics]# curl -vvv https://localhost:10250/metrics/cadvisor
* About to connect() to localhost port 10250 (#0)
*   Trying ::1...
* Connected to localhost (::1) port 10250 (#0)
* Initializing NSS with certpath: sql:/etc/pki/nssdb
*   CAfile: /etc/pki/tls/certs/ca-bundle.crt
  CApath: none
* Server certificate:
*       subject: CN=k8s-master01@1617711637
*       start date: Apr 06 11:20:36 2021 GMT
*       expire date: Apr 06 11:20:36 2022 GMT
*       common name: k8s-master01@1617711637
*       issuer: CN=k8s-master01-ca@1617711637
* NSS error -8172 (SEC_ERROR_UNTRUSTED_ISSUER)
* Peer's certificate issuer has been marked as not trusted by the user.
* Closing connection 0
```

- 上述过程说明了，使用本地机器上的证书链没有找到
- 再比如访问 https://www.baidu.com，下面的过程可以看到baidu的证书可以在本地证书链中验证，所以访问没有问题

```shell
[root@k8s-master01 ink8s-pod-metrics]# curl -vvv https://www.baidu.com
* About to connect() to www.baidu.com port 443 (#0)
*   Trying 103.235.46.39...
* Connected to www.baidu.com (103.235.46.39) port 443 (#0)
* Initializing NSS with certpath: sql:/etc/pki/nssdb
*   CAfile: /etc/pki/tls/certs/ca-bundle.crt
  CApath: none
* SSL connection using TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
* Server certificate:
*       subject: CN=baidu.com,O="Beijing Baidu Netcom Science Technology Co., Ltd",OU=service operation department,L=beijing,ST=beijing,C=CN
*       start date: Jul 01 01:16:03 2021 GMT
*       expire date: Aug 02 01:16:03 2022 GMT
*       common name: baidu.com
*       issuer: CN=GlobalSign Organization Validation CA - SHA256 - G2,O=GlobalSign nv-sa,C=BE
> GET / HTTP/1.1
> User-Agent: curl/7.29.0
> Host: www.baidu.com
> Accept: */*
> 
< HTTP/1.1 200 OK
< Accept-Ranges: bytes
< Cache-Control: private, no-cache, no-store, proxy-revalidate, no-transform
< Connection: keep-alive
< Content-Length: 2443
< Content-Type: text/html
< Date: Tue, 24 Aug 2021 03:04:50 GMT
< Etag: "58860411-98b"
< Last-Modified: Mon, 23 Jan 2017 13:24:33 GMT
< Pragma: no-cache
< Server: bfe/1.0.8.18
< Set-Cookie: BDORZ=27315; max-age=86400; domain=.baidu.com; path=/
< 
<!DOCTYPE html>
<!--STATUS OK--><html> <head><meta http-equiv=content-type content=text/html;charset=utf-8><meta http-equiv=X-UA-Compatible content=IE=Edge><meta content=always name=referrer><link rel=stylesheet type=text/css href=https://ss1.bdstatic.com/5eN1bjq8AAUYm2zgoY3K/r/www/cache/bdorz/baidu.min.css><title>百度一下，你就知道</title></head> <body link=#0000cc> <div id=wrapper> <div id=head> <div class=head_wrapper> <div class=s_form> <div class=s_form_wrapper> <div id=lg> <img hidefocus=true src=//www.baidu.com/img/bd_logo1.png width=270 height=129> </div> <form id=form name=f action=//www.baidu.com/s class=fm> <input type=hidden name=bdorz_come value=1> <input type=hidden name=ie value=utf-8> <input type=hidden name=f value=8> <input type=hidden name=rsv_bp value=1> <input type=hidden name=rsv_idx value=1> <input type=hidden name=tn value=baidu><span class="bg s_ipt_wr"><input id=kw name=wd class=s_ipt value maxlength=255 autocomplete=off autofocus=autofocus></span><span class="bg s_btn_wr"><input type=submit id=su value=百度一下 class="bg s_btn" autofocus></span> </form> </div> </div> <div id=u1> <a href=http://news.baidu.com name=tj_trnews class=mnav>新闻</a> <a href=https://www.hao123.com name=tj_trhao123 class=mnav>hao123</a> <a href=http://map.baidu.com name=tj_trmap class=mnav>地图</a> <a href=http://v.baidu.com name=tj_trvideo class=mnav>视频</a> <a href=http://tieba.baidu.com name=tj_trtieba class=mnav>贴吧</a> <noscript> <a href=http://www.baidu.com/bdorz/login.gif?login&tpl=mn&u=http%3A%2F%2Fwww.baidu.com%2f%3fbdorz_come%3d1 name=tj_login class=lb>登录</a> </noscript> <script>document.write('<a href="http://www.baidu.com/bdorz/login.gif?login&tpl=mn&u='+ encodeURIComponent(window.location.href+ (window.location.search === "" ? "?" : "&")+ "bdorz_come=1")+ '" name="tj_login" class="lb">登录</a>');
                </script> <a href=//www.baidu.com/more/ name=tj_briicon class=bri style="display: block;">更多产品</a> </div> </div> </div> <div id=ftCon> <div id=ftConw> <p id=lh> <a href=http://home.baidu.com>关于百度</a> <a href=http://ir.baidu.com>About Baidu</a> </p> <p id=cp>©2017 Baidu <a href=http://www.baidu.com/duty/>使用百度前必读</a>  <a href=http://jianyi.baidu.com/ class=cp-feedback>意见反馈</a> 京ICP证030173号  <img src=//www.baidu.com/img/gs.gif> </p> </div> </div> </div> </body> </html>
* Connection #0 to host www.baidu.com left intact
```

同时我们知道在k8s中接口都是带有鉴权的，比如我们直接访问k8s node上的kubelet的/metrics/cadvisor接口会返回未授权。如下面的实例所示

```shell
[root@k8s-node01 logs]# curl -k https://localhost:10250/metrics/cadvisor
Unauthorized
```

### 使用curl -k 访问

- 直接使用curl访问的报错已经提示我们可以使用 -k参数关掉证书校验

```shell
[root@k8s-master01 ink8s-pod-metrics]# curl -vvv -k https://localhost:10250/metrics/cadvisor
* About to connect() to localhost port 10250 (#0)
*   Trying ::1...
* Connected to localhost (::1) port 10250 (#0)
* Initializing NSS with certpath: sql:/etc/pki/nssdb
* skipping SSL peer certificate verification
* NSS: client certificate not found (nickname not specified)
* SSL connection using TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
* Server certificate:
*       subject: CN=k8s-master01@1617711637
*       start date: Apr 06 11:20:36 2021 GMT
*       expire date: Apr 06 11:20:36 2022 GMT
*       common name: k8s-master01@1617711637
*       issuer: CN=k8s-master01-ca@1617711637
> GET /metrics/cadvisor HTTP/1.1
> User-Agent: curl/7.29.0
> Host: localhost:10250
> Accept: */*
> 
< HTTP/1.1 401 Unauthorized
< Date: Tue, 24 Aug 2021 03:08:37 GMT
< Content-Length: 12
< Content-Type: text/plain; charset=utf-8
< 
* Connection #0 to host localhost left intact
```

- 发现返回的是401 Unauthorized
- 原因是这个接口开启了鉴权，无法直接访问

## rbac.yaml中的 service account 创建token

- 在我们之前的rbac.yaml中配置的 service account是提供身份信息的对象
- 并且通过clusterrole和clusterrolebinding进行资源操作权限的绑定，整体配置如下

```yaml
apiVersion: rbac.authorization.k8s.io/v1 # api的version
kind: ClusterRole # 类型
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources: # 资源
  - nodes
  - nodes/metrics
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"] 
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus # 自定义名字
  namespace: kube-system # 命名空间
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef: # 选择需要绑定的Role
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects: # 对象
- kind: ServiceAccount
  name: prometheus
  namespace: kube-system
```

- 上述配置代表，在kube-system命名空间下创建了一个 服务账号叫prometheus
- 这个账号可以对 services、endpoints、pods等资源执行get、list、watch操作

## prometheus配置了 service account 会自动挂载token

- 配置好之后 k8s会将对应的token和证书文件挂载到pod中

```yaml
serviceAccountName: prometheus
```

- 我们exec进入prometheus的pod中，执行命令如下

```shell
 kubectl -n kube-system exec prometheus-0 -c prometheus -ti -- /bin/sh
```

- 可以查看到相关文件在`/var/run/secrets/kubernetes.io/serviceaccount/`，如下所示

```shell
/ # ls /var/run/secrets/kubernetes.io/serviceaccount/ -l
total 0
lrwxrwxrwx    1 root     root            13 Jan  7 20:54 ca.crt -> ..data/ca.crt
lrwxrwxrwx    1 root     root            16 Jan  7 20:54 namespace -> ..data/namespace
lrwxrwxrwx    1 root     root            12 Jan  7 20:54 token -> ..data/token
```

- ca.crt代表ca的证书
- namespace代表是哪个命名空间

```shell
/prometheus $ cat /var/run/secrets/kubernetes.io/serviceaccount/namespace 
kube-system
```

- token 代表是对应的api token

```shell
/prometheus $ cat /var/run/secrets/kubernetes.io/serviceaccount/token
eyJhbGciOiJSUzI1NiIsImtpZCI6IkFfYlFvT2FpX21jZDNRVWMwN2dyN3ZTUExDTWxrdW9QSFU3VFQxSDhMNnMifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJwcm9tZXRoZXVzLXRva2VuLTdidmh6Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6InByb21ldGhldXMiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiIyZjk1MzIyNC00ODFiLTRjOTItODRhZC01MTkxOTk4MzQwMmEiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZS1zeXN0ZW06cHJvbWV0aGV1cyJ9.LNQXagpS4oCel28a6v6jmzTEeroserf98Q5VShUJykIOI1MzvJXJ2IJuBeTUWic1qz6b-DnQkRR7TAczCkXdekfuLCZMI9OpQ8BCXdFgEZ5xQBUsslZ9gV58VKgIJ_HwOFhD33eIqKFdmcgNVNHuDMQSYwwf9DQtP3BuSedklbwS07BoS6WuL51XZoJ5mQXq-1Bv6b2XPeC1_Q0n9NzAKYXNOtdgKwQpgwfeQTGtVbmsxZ7ld6lpIlpfdPygmFaiSJyRFf7gDD7xRjg6Yg7ELCUnUXyXUZICar2x1sNeduw933XRUT0iFzebvq1PZnhVSrmRBZFv-_V7WTCoHj0E1w

```

## 使用token访问 接口

- 我们可以使用上面获取到的token ，作为header加在我们的curl命令中`--header "Authorization: Bearer $TOKEN"`

```shell
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6IkFfYlFvT2FpX21jZDNRVWMwN2dyN3ZTUExDTWxrdW9QSFU3VFQxSDhMNnMifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJwcm9tZXRoZXVzLXRva2VuLTdidmh6Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6InByb21ldGhldXMiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiIyZjk1MzIyNC00ODFiLTRjOTItODRhZC01MTkxOTk4MzQwMmEiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZS1zeXN0ZW06cHJvbWV0aGV1cyJ9.LNQXagpS4oCel28a6v6jmzTEeroserf98Q5VShUJykIOI1MzvJXJ2IJuBeTUWic1qz6b-DnQkRR7TAczCkXdekfuLCZMI9OpQ8BCXdFgEZ5xQBUsslZ9gV58VKgIJ_HwOFhD33eIqKFdmcgNVNHuDMQSYwwf9DQtP3BuSedklbwS07BoS6WuL51XZoJ5mQXq-1Bv6b2XPeC1_Q0n9NzAKYXNOtdgKwQpgwfeQTGtVbmsxZ7ld6lpIlpfdPygmFaiSJyRFf7gDD7xRjg6Yg7ELCUnUXyXUZICar2x1sNeduw933XRUT0iFzebvq1PZnhVSrmRBZFv-_V7WTCoHj0E1w"

[root@k8s-master01 ink8s-pod-metrics]# curl -s   https://172.20.70.215:10250/metrics/cadvisor --header "Authorization: Bearer $TOKEN" --insecure  |head                                                                                  # HELP cadvisor_version_info A metric with a constant '1' value labeled by kernel version, OS version, docker version, cadvisor version & cadvisor revision.
# TYPE cadvisor_version_info gauge
cadvisor_version_info{cadvisorRevision="",cadvisorVersion="",dockerVersion="1.13.1",kernelVersion="3.10.0-957.1.3.el7.x86_64",osVersion="CentOS Linux 7 (Core)"} 1
# HELP container_cpu_cfs_periods_total Number of elapsed enforcement period intervals.
# TYPE container_cpu_cfs_periods_total counter
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod6ab97c68_b0ac_48ce_ba39_6ffa72a2f4c8.slice",image="",name="",namespace="default",pod="ink8s-pod-metrics-deployment-85d9795d6-95lsp"} 50944 1629776475132
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-podbf3f353a_92fa_4436_a8ca_6cb632d48ada.slice",image="",name="",namespace="kube-admin",pod="k8s-mon-daemonset-z6sfw"} 765645 1629776472844
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-podd9a95d67_a843_4369_8d5c_34a5333f1480.slice",image="",name="",namespace="kube-admin",pod="k8s-mon-deployment-6d7d58bdc8-rxj42"} 465845 1629776483759
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pode27c9fe7_9d82_4228_86fb_b9c920611c15.slice",image="",name="",namespace="kube-system",pod="prometheus-0"} 954723 1629776471842
container_cpu_cfs_periods_total{container="ink8s-pod-metrics",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod6ab97c68_b0ac_48ce_ba39_6ffa72a2f4c8.slice/cri-containerd-2f85fd45a67cc4bb775b99d4676200b412ea18ef7ae4976fc93a8a7cff1c5f34.scope",image="docker.io/library/ink8s-pod-metrics:v1",name="2f85fd45a67cc4bb775b99d4676200b412ea18ef7ae4976fc93a8a7cff1c5f34",namespace="default",pod="ink8s-pod-metrics-deployment-85d9795d6-95lsp"} 50939 1629776473234
```

- 说明带上token是可以正常访问到的

## 命令行获取token

- 先获取serviceaccount中的token名字，对应就是一个secret
- 然后获取secret中的token，完整过程如下

```shell
[root@k8s-master01 ink8s-pod-metrics]# kubectl -n kube-system  describe serviceaccount prometheus
Name:                prometheus
Namespace:           kube-system
Labels:              <none>
Annotations:         <none>
Image pull secrets:  <none>
Mountable secrets:   prometheus-token-7bvhz
Tokens:              prometheus-token-7bvhz
Events:              <none>

[root@k8s-master01 ink8s-pod-metrics]# kubectl -n kube-system  describe secret prometheus-token-7bvhz
Name:         prometheus-token-7bvhz
Namespace:    kube-system
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: prometheus
              kubernetes.io/service-account.uid: 2f953224-481b-4c92-84ad-51919983402a

Type:  kubernetes.io/service-account-token

Data
====
namespace:  11 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6IkFfYlFvT2FpX21jZDNRVWMwN2dyN3ZTUExDTWxrdW9QSFU3VFQxSDhMNnMifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJwcm9tZXRoZXVzLXRva2VuLTdidmh6Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6InByb21ldGhldXMiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiIyZjk1MzIyNC00ODFiLTRjOTItODRhZC01MTkxOTk4MzQwMmEiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZS1zeXN0ZW06cHJvbWV0aGV1cyJ9.LNQXagpS4oCel28a6v6jmzTEeroserf98Q5VShUJykIOI1MzvJXJ2IJuBeTUWic1qz6b-DnQkRR7TAczCkXdekfuLCZMI9OpQ8BCXdFgEZ5xQBUsslZ9gV58VKgIJ_HwOFhD33eIqKFdmcgNVNHuDMQSYwwf9DQtP3BuSedklbwS07BoS6WuL51XZoJ5mQXq-1Bv6b2XPeC1_Q0n9NzAKYXNOtdgKwQpgwfeQTGtVbmsxZ7ld6lpIlpfdPygmFaiSJyRFf7gDD7xRjg6Yg7ELCUnUXyXUZICar2x1sNeduw933XRUT0iFzebvq1PZnhVSrmRBZFv-_V7WTCoHj0E1w
ca.crt:     1066 bytes
```

- 使用一条命令获取

```shell
TOKEN=$(kubectl -n kube-system  get secret $(kubectl -n kube-system  get serviceaccount prometheus -o jsonpath='{.secrets[0].name}') -o jsonpath='{.data.token}' | base64 --decode )
```

- 然后带token访问

```shell
[root@k8s-master01 ink8s-pod-metrics]# curl -s   https://172.20.70.215:10250/metrics/cadvisor --header "Authorization: Bearer $TOKEN" --insecure  |head            
# HELP cadvisor_version_info A metric with a constant '1' value labeled by kernel version, OS version, docker version, cadvisor version & cadvisor revision.
# TYPE cadvisor_version_info gauge
cadvisor_version_info{cadvisorRevision="",cadvisorVersion="",dockerVersion="1.13.1",kernelVersion="3.10.0-957.1.3.el7.x86_64",osVersion="CentOS Linux 7 (Core)"} 1
# HELP container_cpu_cfs_periods_total Number of elapsed enforcement period intervals.
# TYPE container_cpu_cfs_periods_total counter
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod6ab97c68_b0ac_48ce_ba39_6ffa72a2f4c8.slice",image="",name="",namespace="default",pod="ink8s-pod-metrics-deployment-85d9795d6-95lsp"} 53643 1629779251088
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-podbf3f353a_92fa_4436_a8ca_6cb632d48ada.slice",image="",name="",namespace="kube-admin",pod="k8s-mon-daemonset-z6sfw"} 767261 1629779242493
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-podd9a95d67_a843_4369_8d5c_34a5333f1480.slice",image="",name="",namespace="kube-admin",pod="k8s-mon-deployment-6d7d58bdc8-rxj42"} 469759 1629779243845
container_cpu_cfs_periods_total{container="",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pode27c9fe7_9d82_4228_86fb_b9c920611c15.slice",image="",name="",namespace="kube-system",pod="prometheus-0"} 962356 1629779247681
container_cpu_cfs_periods_total{container="ink8s-pod-metrics",id="/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod6ab97c68_b0ac_48ce_ba39_6ffa72a2f4c8.slice/cri-containerd-2f85fd45a67cc4bb775b99d4676200b412ea18ef7ae4976fc93a8a7cff1c5f34.scope",image="docker.io/library/ink8s-pod-metrics:v1",name="2f85fd45a67cc4bb775b99d4676200b412ea18ef7ae4976fc93a8a7cff1c5f34",namespace="default",pod="ink8s-pod-metrics-deployment-85d9795d6-95lsp"} 53634 1629779250226
```

## prometheus job配置token

- prometheus在采集cadvisor 可以看到采集配置中有相关token和证书的信息。配置如下

```yaml
  bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  tls_config:
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    insecure_skip_verify: true
```

- insecure_skip_verify=true 等同于 curl -k 或者curl  --insecure
- bearer_token_file 的意思是在header中添加相关token

## 将clusterrole中的resource nodes/metrics 去掉

- 注释后的yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1 # api的version
kind: ClusterRole # 类型
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources: # 资源
  - nodes
  #- nodes/metrics
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
```

- 然后 应用rbac.yml，再获取token请求metrics接口，发现已经是 403 Forbidden了
- 并且明确指出了是nodes.metrics不能被这个sa通过get访问了

```shell
curl -s   https://172.20.70.215:10250/metrics/cadvisor --header "Authorization: Bearer $TOKEN" --insecure  
Forbidden (user=system:serviceaccount:kube-system:prometheus, verb=get, resource=nodes, subresource=metrics)
```

- target页面截图
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630111231000/043524259354428f8a0b14569deb167a.png)
- 修改回来后正常

# 本节重点总结 :

- k8s接口鉴权方式
- serviceaccount和token的关系
- 手动curl访问metrics接口

## 21.2 k8s中etcd的tls双向认证原理解析

# 本节重点介绍 : 
- tls单向认证原理
- tls双向认证原理
    - 在k8s中etcd监控的应用
    - 以ca.crt client.crt client.key创建的secret并挂载到prometheus中
    - prometheus配置证书信息打到采集etcd的目的
    
    

# tls单向认证
![image](https://pic1.zhimg.com/80/v2-1147be0e808b67d72a9d86abfb383344_720w.jpg)
-  在单向SSL身份认证过程中，客户端需要验证服务端证书，比如访问baidu.com
```shell script
[root@k8s-master01 ~]# curl -vvv https://www.baidu.com
* About to connect() to www.baidu.com port 443 (#0)
*   Trying 103.235.46.39...
* Connected to www.baidu.com (103.235.46.39) port 443 (#0)
* Initializing NSS with certpath: sql:/etc/pki/nssdb
*   CAfile: /etc/pki/tls/certs/ca-bundle.crt
  CApath: none
* SSL connection using TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
* Server certificate:
*       subject: CN=baidu.com,O="Beijing Baidu Netcom Science Technology Co., Ltd",OU=service operation department,L=beijing,ST=beijing,C=CN
*       start date: Jul 01 01:16:03 2021 GMT
*       expire date: Aug 02 01:16:03 2022 GMT
*       common name: baidu.com
*       issuer: CN=GlobalSign Organization Validation CA - SHA256 - G2,O=GlobalSign nv-sa,C=BE
> GET / HTTP/1.1
> User-Agent: curl/7.29.0
> Host: www.baidu.com
> Accept: */*
> 
< HTTP/1.1 200 OK
< Accept-Ranges: bytes
< Cache-Control: private, no-cache, no-store, proxy-revalidate, no-transform
< Connection: keep-alive
< Content-Length: 2443
< Content-Type: text/html
< Date: Tue, 24 Aug 2021 07:28:01 GMT
< Etag: "58860411-98b"
< Last-Modified: Mon, 23 Jan 2017 13:24:33 GMT
< Pragma: no-cache
< Server: bfe/1.0.8.18
< Set-Cookie: BDORZ=27315; max-age=86400; domain=.baidu.com; path=/
< 
```

## 对应prometheus中的配置 
- tls_config.ca_file指定ca_file
```yaml
  bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  tls_config:
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    insecure_skip_verify: true
```
### 追踪ca_file源码
- 位置 D:\go_path\pkg\mod\github.com\prometheus\common@v0.30.0\config\http_config.go 
```go

func NewTLSConfig(cfg *TLSConfig) (*tls.Config, error) {
	tlsConfig := &tls.Config{InsecureSkipVerify: cfg.InsecureSkipVerify}

	// If a CA cert is provided then let's read it in so we can validate the
	// scrape target's certificate properly.
	if len(cfg.CAFile) > 0 {
		b, err := readCAFile(cfg.CAFile)
		if err != nil {
			return nil, err
		}
		if !updateRootCA(tlsConfig, b) {
			return nil, fmt.Errorf("unable to use specified CA cert %s", cfg.CAFile)
		}
	}
```
- 在上述代码中可以看到当用户配置了ca_file，则会将RootCA设置为这个值
- 如果RootCA没设置，则默认使用主机的
```go
// updateRootCA parses the given byte slice as a series of PEM encoded certificates and updates tls.Config.RootCAs.
func updateRootCA(cfg *tls.Config, b []byte) bool {
	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(b) {
		return false
	}
	cfg.RootCAs = caCertPool
	return true
}

```

## service account  ca.crt来源
- 在prometheus容器中看到的ca.crt内容为
```shell script
kubectl -n kube-system exec prometheus-0 -c prometheus -ti -- /bin/sh

/prometheus $ cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt 
-----BEGIN CERTIFICATE-----
MIIC5zCCAc+gAwIBAgIBADANBgkqhkiG9w0BAQsFADAVMRMwEQYDVQQDEwprdWJl
cm5ldGVzMB4XDTIxMDQwNjEyMjAzMloXDTMxMDQwNDEyMjAzMlowFTETMBEGA1UE
AxMKa3ViZXJuZXRlczCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKwi
+0eDgehQaaJU5mIy5GhtMAgQdsHEps9zYSkzQ0TDPdEcsv5zwzCXionv0aTWmFB4
kKG6EkhhxiuBUG8qz1kJwm4Pog7Hlx0SsLCpAxLW750ASHE/4CVZ7TCDW4Yl/jns
rGWeqj+3POO1dId1WUSvXiwEcusLHLBY8v4wCApRB81KM7RUGIgP4WEenxwVG4tP
LQ44I7V1fLsMfl+hA/wyr94Ufyqe+TzVVY8CMS8PL5SKwviVOxrE2GrTfU/bjmjH
NpKZgTqRU2oFThAa2A7O820FJE/a0K8FleyvOuZ+dWHZXF0JxV4buiw4r5d1LnEh
+eRX8KZykeSCFNeyXEsCAwEAAaNCMEAwDgYDVR0PAQH/BAQDAgKkMA8GA1UdEwEB
/wQFMAMBAf8wHQYDVR0OBBYEFIOi7ByyvNV7vQJP9CPWFT2iHgGaMA0GCSqGSIb3
DQEBCwUAA4IBAQCFp5z/FsbPFbu2kCLNOjSYrA7mhF+QA+qv6Fgv0ljQfE1PYzqm
Q8PJuqEoSWS3z8OgtBOUvkOyofLPLr5DKyoCcOipkC4NhFiZWILJ61i441IAzseE
uC1FESFwhO/HVQZVtt6M1G4DcG7afv9gVw4R2lFfWRsmVQY8kW97aqCq72OsgbAp
U6mDvPR6ISkfkxMmkSMY4+Fa9jyeRCsm4i7S8Jp61jYkqsSbMjYUnApykaadYpCs
FpNNKNTq63XkC1N4WOW86RskoCNhnuztt1NvHdvgASqcwjCmheFh+JKjgBScCUNo
mqBXsmuXNzVetojQvulMKxsmr/L+hh3ekpaW
-----END CERTIFICATE-----
``` 

- 可以发现和 master节点上的`/etc/kubernetes/pki/ca.crt `一致 
```shell script
[root@k8s-master01 prome_k8s_all_pod]# cat /etc/kubernetes/pki/ca.crt 
-----BEGIN CERTIFICATE-----
MIIC5zCCAc+gAwIBAgIBADANBgkqhkiG9w0BAQsFADAVMRMwEQYDVQQDEwprdWJl
cm5ldGVzMB4XDTIxMDQwNjEyMjAzMloXDTMxMDQwNDEyMjAzMlowFTETMBEGA1UE
AxMKa3ViZXJuZXRlczCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKwi
+0eDgehQaaJU5mIy5GhtMAgQdsHEps9zYSkzQ0TDPdEcsv5zwzCXionv0aTWmFB4
kKG6EkhhxiuBUG8qz1kJwm4Pog7Hlx0SsLCpAxLW750ASHE/4CVZ7TCDW4Yl/jns
rGWeqj+3POO1dId1WUSvXiwEcusLHLBY8v4wCApRB81KM7RUGIgP4WEenxwVG4tP
LQ44I7V1fLsMfl+hA/wyr94Ufyqe+TzVVY8CMS8PL5SKwviVOxrE2GrTfU/bjmjH
NpKZgTqRU2oFThAa2A7O820FJE/a0K8FleyvOuZ+dWHZXF0JxV4buiw4r5d1LnEh
+eRX8KZykeSCFNeyXEsCAwEAAaNCMEAwDgYDVR0PAQH/BAQDAgKkMA8GA1UdEwEB
/wQFMAMBAf8wHQYDVR0OBBYEFIOi7ByyvNV7vQJP9CPWFT2iHgGaMA0GCSqGSIb3
DQEBCwUAA4IBAQCFp5z/FsbPFbu2kCLNOjSYrA7mhF+QA+qv6Fgv0ljQfE1PYzqm
Q8PJuqEoSWS3z8OgtBOUvkOyofLPLr5DKyoCcOipkC4NhFiZWILJ61i441IAzseE
uC1FESFwhO/HVQZVtt6M1G4DcG7afv9gVw4R2lFfWRsmVQY8kW97aqCq72OsgbAp
U6mDvPR6ISkfkxMmkSMY4+Fa9jyeRCsm4i7S8Jp61jYkqsSbMjYUnApykaadYpCs
FpNNKNTq63XkC1N4WOW86RskoCNhnuztt1NvHdvgASqcwjCmheFh+JKjgBScCUNo
mqBXsmuXNzVetojQvulMKxsmr/L+hh3ekpaW
-----END CERTIFICATE-----
```

# tls双向认证
![image](https://pic4.zhimg.com/v2-09903ee121fe3aead6b8c3f91e3c64c7_r.jpg)

## 为什么需要TLS双向认证？
- 一般Web应用都是采用SSL单向认证的，用户数自由无限制，且无需在通讯层对用户身份进行验证，一般都在应用逻辑层来保证用户的合法登入
- 但如果是企业应用对接，数据信息相对较多且复杂，可能会要求对客户端做身份验证，这时就需要做SSL双向认证，这也是保护公司内部数据信息的最好的方法
- 或者说在访问特别重要的系统时需要做tls双向认证

## 双向认证的必备条件
- 私钥  client.key
- 个人认证证书 client.crt
- CA根证书 如ca.crt
- CA中间证书（非所有情况下必需）
- 有了以上必备东西，当客户端验证服务器身份后，服务器才能验证客户端身份。双方都有自己独立的SSL证书，而且这些证书必须是由受信任的第三方CA机构颁发的。

## k8s中的etcd需要双向认证
### 重要性说明

### prometheus采集 etcd job配置
```shell script
- job_name: kube-etcd
  honor_timestamps: true
  scrape_interval: 30s
  scrape_timeout: 10s
  metrics_path: /metrics
  scheme: https
  authorization:
    type: Bearer
    credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  tls_config:
    ca_file: /etc/prometheus/secrets/etcd-certs/ca.crt
    cert_file: /etc/prometheus/secrets/etcd-certs/healthcheck-client.crt
    key_file: /etc/prometheus/secrets/etcd-certs/healthcheck-client.key
    insecure_skip_verify: true
  follow_redirects: true
  relabel_configs:
  - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name]
    separator: ;
    regex: kube-system;kube-etcd
    replacement: $1
    action: keep
  kubernetes_sd_configs:
  - role: endpoints
    kubeconfig_file: ""
    follow_redirects: true
```
- 其中ca_file代表 ca的证书
- cert_file代表 client的公钥
- key_file代表 client的私钥

#### 同时我们在采集之初，使用master上的文件创建了对应的secret
```shell script
kubectl create secret generic etcd-certs --from-file=/etc/kubernetes/pki/etcd/healthcheck-client.crt --from-file=/etc/kubernetes/pki/etcd/healthcheck-client.key --from-file=/etc/kubernetes/pki/etcd/ca.crt -n kube-system

```

#### prometheus配置的volume 挂载了 etcd-certs
```yaml
      volumes:
        - name: secret-volume
          secret:
            secretName: etcd-certs   
```
- 同时我们登录到prometheus容器内部可以查看相关的证书文件
```shell script
[root@k8s-master01 ~]# kubectl -n kube-system exec prometheus-0 -c prometheus -ti -- /bin/sh

/prometheus $ ls /etc/prometheus/secrets/etcd-certs/ -lrt
total 0
lrwxrwxrwx    1 root     root            29 Aug 20 04:56 healthcheck-client.key -> ..data/healthcheck-client.key
lrwxrwxrwx    1 root     root            29 Aug 20 04:56 healthcheck-client.crt -> ..data/healthcheck-client.crt
lrwxrwxrwx    1 root     root            13 Aug 20 04:56 ca.crt -> ..data/ca.crt
```

#### 手动访问，在master上

```shell script
[root@k8s-master01 ~]#  curl -s -vvv  https://localhost:2379/metrics  --cert /etc/kubernetes/pki/etcd/healthcheck-client.crt --key /etc/kubernetes/pki/etcd/healthcheck-client.key --cacert /etc/kubernetes/pki/etcd/ca.crt  |head  
* About to connect() to localhost port 2379 (#0)
*   Trying ::1...
* Connection refused
*   Trying 127.0.0.1...
* Connected to localhost (127.0.0.1) port 2379 (#0)
* Initializing NSS with certpath: sql:/etc/pki/nssdb
*   CAfile: /etc/kubernetes/pki/etcd/ca.crt
  CApath: none
* NSS: client certificate from file
*       subject: CN=kube-etcd-healthcheck-client,O=system:masters
*       start date: Apr 06 12:20:33 2021 GMT
*       expire date: Apr 06 12:20:33 2022 GMT
*       common name: kube-etcd-healthcheck-client
*       issuer: CN=etcd-ca
* SSL connection using TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
* Server certificate:
*       subject: CN=k8s-master01
*       start date: Apr 06 12:20:33 2021 GMT
*       expire date: Apr 06 12:20:33 2022 GMT
*       common name: k8s-master01
*       issuer: CN=etcd-ca
> GET /metrics HTTP/1.1
> User-Agent: curl/7.29.0
> Host: localhost:2379
> Accept: */*
> 
< HTTP/1.1 200 OK
< Access-Control-Allow-Headers: accept, content-type, authorization
< Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE
< Access-Control-Allow-Origin: *
< Content-Type: text/plain; version=0.0.4; charset=utf-8
< Date: Tue, 24 Aug 2021 07:57:33 GMT
< Transfer-Encoding: chunked
< 
{ [data not shown]
# HELP etcd_cluster_version Which version is running. 1 for 'cluster_version' label with current cluster version
# TYPE etcd_cluster_version gauge
etcd_cluster_version{cluster_version="3.4"} 1
# HELP etcd_debugging_auth_revision The current revision of auth store.
# TYPE etcd_debugging_auth_revision gauge
etcd_debugging_auth_revision 1
# HELP etcd_debugging_disk_backend_commit_rebalance_duration_seconds The latency distributions of commit.rebalance called by bboltdb backend.
# TYPE etcd_debugging_disk_backend_commit_rebalance_duration_seconds histogram
etcd_debugging_disk_backend_commit_rebalance_duration_seconds_bucket{le="0.001"} 4.561017e+06
etcd_debugging_disk_backend_commit_rebalance_duration_seconds_bucket{le="0.002"} 4.561069e+06
* Failed writing body (0 != 2048)
* Failed writing data
* Closing connection 0
```
- --cacert指定ca的公钥
- --cert指定客户端公钥
- --key指定客户端私钥

# 本节重点总结 : 
- tls单向认证原理
- tls双向认证原理
    - 在k8s中etcd监控的应用
    - 以ca.crt client.crt client.key创建的secret并挂载到prometheus中
    - prometheus配置证书信息打到采集etcd的目的

