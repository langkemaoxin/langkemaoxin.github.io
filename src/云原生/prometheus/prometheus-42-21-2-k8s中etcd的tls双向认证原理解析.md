---
title: 21.2 k8s中etcd的tls双向认证原理解析
sidebarGroup: Prometheus
shortTitle: 42 21.2 k8s中etcd的tls双向认证原...
order: 42
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - tls单向认证原理 - tls双向认证原理 - 在k8s中etcd监控的应用 - 以ca.crt client.crt client.key创建的secret并挂载到promet...'
---

> **Prometheus · 第 42 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

