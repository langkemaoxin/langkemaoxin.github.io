---
title: "21.1 k8s接口鉴权token认证和prometheus的实现"
sidebarGroup: "Prometheus"
shortTitle: "41 21.1 k8s接口鉴权token认证和pr..."
order: 41
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - k8s接口鉴权方式 - serviceaccount和token的关系 - 手动curl访问metrics接口 k8s对象接口鉴权 以容器基础资源指标为例 - 对应就是访问nod..."
---

> **Prometheus · 第 41 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

