---
title: 集群日志收集——ELK 与 EFK
sidebarGroup: Kubernetes
shortTitle: 18 日志收集 ELK/EFK
order: 18
date: 2026-08-14T00:00:00.000Z
category: 云原生
tag:
  - Kubernetes
  - 云原生
  - K8s系列
description: K8s 集群日志收集：ELK（Logstash）与 EFK（Fluentd/Fluent Bit）两套方案架构、部署与选型。
---

> **Kubernetes 系列 · 第 18/35 篇**  
> 上一篇：[《custom-metrics-server 规则配置与 Grafana 展示》](/云原生/k8s/k8s-17-custom-metrics)  
> 下一篇：[《容器内 JVM 参数解析与生产优化》](/云原生/k8s/k8s-19-jvm-in-container)

---

## 开头：kubectl logs 看到的日志，去哪了？

排查问题时，`kubectl logs` 是最趁手的工具。但它有几个天然局限：

- 只能看 **单个 Pod 当前实例** 的日志，Pod 重建后日志随之消失
- 无法跨节点、跨应用 **聚合检索**（比如"过去一小时哪些 Pod 报了 OOM"）
- 节点系统日志（`/var/log/messages`）、K8s 组件日志根本不在它的视野内

容器引擎会把容器 stdout/stderr 落盘到节点 `/var/log/containers/` 目录，加上节点自身的系统与应用日志，集群里散落着三类日志。要把它们变成可检索、可告警、可分析的数据，就需要一套 **日志收集方案**。业界最主流的两套是：

- **ELK**：Filebeat 采集 + Logstash 解析 + Elasticsearch 存储 + Kibana 展示
- **EFK**：Fluentd（或 Fluent Bit）采集 + Elasticsearch + Kibana

本文先梳理 K8s 日志全景，再完整落地这两套方案，最后给出选型建议与生产注意事项。

---

## 一、K8s 日志全景

### 1.1 为什么要收集日志

收集日志可以用于：

- 分析用户行为
- 监控服务器状态
- 增强系统或应用安全性等

> 💡 日志与指标是可观测性的两条腿：指标（如 [Prometheus 监控体系](/云原生/k8s/k8s-16-prometheus-hpa)）告诉你"哪里不对劲"，日志告诉你"为什么会这样"。

### 1.2 集群里要收集哪些日志

| 日志来源 | 位置示例 | 说明 |
|----------|----------|------|
| 节点系统日志 | `/var/log/messages` | 内核、systemd、容器运行时日志 |
| 节点应用程序日志 | `/var/log/nginx/access.log` | 直接装在节点上的服务（非容器化） |
| 集群中以 Pod 运行的应用日志 | `/var/log/containers/`、容器内文件 | 容器 stdout/stderr 或 Pod 内落盘文件 |
| K8s 系统组件日志 | kube-apiserver、kube-scheduler 等 | 控制面组件输出 |

### 1.3 采集方式的三种套路

| 方式 | 做法 | 适用 |
|------|------|------|
| **节点级 DaemonSet** | 采集器以 DaemonSet 跑在每个节点，挂载宿主机日志目录 | 节点日志、容器 stdout 日志，最常用 |
| **Sidecar** | 在应用 Pod 里附加一个采集容器，共享日志卷 | 应用日志写容器内文件、格式特殊时 |
| **应用直推** | 应用直接输出到采集端 | 改造成本高，侵入业务 |

DaemonSet 的调度特性在[第 7 篇](/云原生/k8s/k8s-07-daemon-stateful-job)已详细讲过，本章直接复用。

两套主流技术栈的架构如下。

**ELK（ELKB）+ Filebeat**：

![](/云原生/k8s-ops/k8s-ops-07-kubernetes日志收集方案-elk/image-20200106175502929.png)

**EFK + Fluentd**：

![image-20220408005109209](/云原生/k8s-ops/k8s-ops-07-kubernetes日志收集方案-elk/image-20220408005109209.png)

两套方案的 **存储（E）与展示（K）完全相同**，区别只在中间的采集与转发层：Logstash vs Fluentd。下面逐一落地。

---

## 二、ELK 方案：Filebeat + Logstash + ES + Kibana

> 为了增加 ELK 集群的运行效率，一般建议在 k8s 集群之外使用物理机部署 ELK 集群，当然也可以直接在 k8s 集群内部署（EFK 一节会演示这种方式）。

数据流：**Filebeat（DaemonSet，跑在 K8s 节点）→ Logstash（物理机，解析转发）→ Elasticsearch（物理机，存储）→ Kibana（物理机，展示）**。

### 2.1 主机准备

| 主机     | 软件          | 版本   | 配置 | IP             |
| -------- | ------------- | ------ | ---- | -------------- |
| kibana   | kibana        | 7.17.2 | 2C2G | 192.168.10.200 |
| elastic  | elasticsearch | 7.17.2 | 2C4G | 192.168.10.201 |
| logstash | logstash      | 7.17.2 | 2C4G | 192.168.10.202 |

三台主机各设置主机名并互配 hosts：

```bash
# hostnamectl set-hostname xxx
```

```bash
# cat /etc/hosts
192.168.10.200 kibana
192.168.10.201 elastic
192.168.10.202 logstash
```

### 2.2 软件安装

> 由于软件下载较慢，请提前准备好以下 RPM 包。

所有主机安装 JDK（openjdk 或 oracle jdk 均可）：

```bash
[root@kibana ~]# yum -y install java-11-openjdk
[root@elastic ~]# yum -y install java-11-openjdk
[root@logstash ~]# yum -y install java-11-openjdk
```

三件套均为 RPM 安装：

```bash
# 安装 kibana
# wget https://artifacts.elastic.co/downloads/kibana/kibana-7.17.2-x86_64.rpm
# yum -y install kibana-7.17.2-x86_64.rpm

# 安装 elasticsearch
# wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-7.17.2-x86_64.rpm
# yum -y install elasticsearch-7.17.2-x86_64.rpm

# 安装 logstash
# wget https://artifacts.elastic.co/downloads/logstash/logstash-7.17.2-x86_64.rpm
# yum -y install logstash-7.17.2-x86_64.rpm
```

### 2.3 配置及启动

#### 2.3.1 Elasticsearch

```bash
[root@elastic ~]# cat -n /etc/elasticsearch/elasticsearch.yml | grep -v "#" | grep -v "^$"
    17  cluster.name: k8s-elastic
    23  node.name: elastic
    33  path.data: /var/lib/elasticsearch
    37  path.logs: /var/log/elasticsearch
    56  network.host: 192.168.10.201
    61  http.port: 9200
    70  discovery.seed_hosts: ["192.168.10.201"]
    74  cluster.initial_master_nodes: ["192.168.10.201"]
```

```text
cluster.name 集群名称
node.name 节点名称
path.data 数据目录
path.logs 日志目录
network.host 主机IP
http.port 监听端口
discovery.seed_hosts 主机发现列表
cluster.initial_master_nodes 集群master节点
```

启动并验证：

```bash
[root@elastic ~]# systemctl enable elasticsearch
[root@elastic ~]# systemctl start elasticsearch
```

```bash
[root@elastic ~]# curl http://192.168.10.201:9200
{
  "name" : "elastic",
  "cluster_name" : "k8s-elastic",
  "cluster_uuid" : "cW78ZkrhS4OV41DV5CtWWQ",
  "version" : {
    "number" : "7.17.2",
    ...
  },
  "tagline" : "You Know, for Search"
}
```

#### 2.3.2 Kibana

```bash
[root@kibana ~]# cat -n /etc/kibana/kibana.yml | grep -v "#" | grep -v "^$"
     2  server.port: 5601
     7  server.host: "192.168.10.200"
    32  elasticsearch.hosts: ["http://192.168.10.201:9200"]
   115  i18n.locale: "zh-CN"
```

```text
server.port 是开启kibana监听端口
server.host 设置远程连接主机IP地址，用于远程访问使用
elasticsearch.hosts 设置elasticsearch主机IP，用于连接elasticsearch主机，可以为多个值
i18n.locale 设置语言支持，不需要再汉化，直接修改后即可支持中文
```

```bash
[root@kibana ~]# systemctl enable kibana
[root@kibana ~]# systemctl start kibana
[root@kibana ~]# ss -anput | grep ":5601"
tcp    LISTEN     0      128    192.168.10.200:5601                  *:*                   users:(("node",pid=2571,fd=71))
```

#### 2.3.3 Logstash

```bash
[root@logstash ~]# cat -n /etc/logstash/logstash.yml | grep -v "#" | grep -v "^$"
    19  node.name: logstash
    28  path.data: /var/lib/logstash
   133  api.http.host: 192.168.10.202
   139  api.http.port: 9600-9700
   280  path.logs: /var/log/logstash
```

> ⚠️ 分布式架构中 `api.http.host` 一定要配置为 logstash 主机 IP，不然无法远程访问。**Logstash 进程不用预先启动，使用时启动即可。**

用标准输入输出快速验证 Logstash 可用：

```bash
[root@logstash ~]# /usr/share/logstash/bin/logstash -e 'input { stdin{} } output { stdout{} }'
# 启动后输入 abc，回车即以 JSON 格式输出
{
    "@timestamp" => 2022-04-07T08:35:24.663Z,
          "host" => "logstash",
       "message" => "abc",
      "@version" => "1"
}
```

再验证 Logstash 能写入 ES：

```bash
[root@logstash ~]# /usr/share/logstash/bin/logstash -e 'input { stdin{} } output { elasticsearch { hosts => ["192.168.10.201:9200"] index => "logstash-%{+YYYY.MM.dd}" } }'
# 输入 hello elasticsearch，内容将写入 ES，可在 kibana 页面中添加索引后看到
```

通过浏览器访问 `http://192.168.10.200:5601` 即可打开 Kibana：

![image-20220407163953277](/云原生/k8s-ops/k8s-ops-07-kubernetes日志收集方案-elk/image-20220407163953277.png)

### 2.4 收集节点系统日志（DaemonSet Filebeat）

通过在 work 节点以 DaemonSet 方式运行 Filebeat 实现。

编写 Logstash 接收配置（监听 5044 端口接收 beats 数据，写入 ES）：

```bash
[root@logstash ~]# cat /etc/logstash/conf.d/logstash-to-elastic.conf
input {
  beats {
    host => "0.0.0.0"
    port => "5044"
  }
}

filter {

}

output {
    elasticsearch {
      hosts => "192.168.10.201:9200"
      index => "k8s-%{+YYYY.MM.dd}"
    }
}
```

启动 Logstash（单配置文件可直接 `systemctl start logstash`；多配置文件只想启动一个时用如下方法）：

```bash
[root@logstash ~]# /usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/logstash-to-elastic.conf --path.data /usr/share/logstash/data1 &
```

> 💡 每多起一个 Logstash 实例，要指定不同的 `--path.data`，否则会因数据目录冲突启动失败。开机自启可把启动命令追加进 `/etc/rc.local` 并 `chmod +x /etc/rc.d/rc.local`。

编写 Filebeat 资源清单（ConfigMap 存配置 + DaemonSet 跑采集）：

```yaml
[root@k8s-master1 ~]# cat filebeat-to-logstash.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k8s-logs-filebeat-config
  namespace: kube-system

data:
  filebeat.yml: |
    filebeat.inputs:
      - type: log
        paths:
          - /var/log/messages
        fields:
          app: k8s
          type: module
        fields_under_root: true

    setup.ilm.enabled: false
    setup.template.name: "k8s-module"
    setup.template.pattern: "k8s-module-*"

    output.logstash:
      hosts: ['192.168.10.202:5044']
      index: "k8s-module-%{+yyyy.MM.dd}"

---

apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: k8s-logs
  namespace: kube-system
spec:
  selector:
    matchLabels:
      project: k8s
      app: filebeat
  template:
    metadata:
      labels:
        project: k8s
        app: filebeat
    spec:
      containers:
      - name: filebeat
        image: docker.io/elastic/filebeat:7.17.2
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 500m
            memory: 500Mi
        securityContext:
          runAsUser: 0
        volumeMounts:
        - name: filebeat-config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
        - name: k8s-logs
          mountPath: /var/log/messages
      volumes:
      - name: k8s-logs
        hostPath:
          path: /var/log/messages
      - name: filebeat-config
        configMap:
          name: k8s-logs-filebeat-config
```

关键点：

- `hostPath` 把节点的 `/var/log/messages` 挂进容器，Filebeat 才能读到节点日志
- `runAsUser: 0`：日志文件属主是 root，采集器需要 root 权限
- 所有 work 节点提前拉取镜像：`docker pull elastic/filebeat:7.17.2`（containerd 环境用 `crictl pull elastic/filebeat:7.17.2`）

应用并验证：

```bash
[root@k8s-master1 ~]# kubectl apply -f filebeat-to-logstash.yaml

[root@k8s-master1 ~]# kubectl get pods -n kube-system -o wide
NAME                                       READY   STATUS    RESTARTS   AGE   IP               NODE
k8s-logs-s8qw6                             1/1     Running   0          15s   10.244.194.83    k8s-worker1

[root@k8s-master1 ~]# kubectl logs k8s-logs-s8qw6 -n kube-system
```

最后在 Kibana 页面 **Stack Management → 索引模式 → 创建索引模式**，输入 `k8s-module-*` 并选择时间字段，即可在 Discover 中检索节点日志：

![image-20220407182931857](/云原生/k8s-ops/k8s-ops-07-kubernetes日志收集方案-elk/image-20220407182931857.png)

![image-20220407203219708](/云原生/k8s-ops/k8s-ops-07-kubernetes日志收集方案-elk/image-20220407203219708.png)

### 2.5 收集节点应用程序日志（以 nginx 为例）

节点上直接安装的 nginx（非容器），其 access/error 日志同样用 DaemonSet Filebeat 采集，只是把挂载换成 nginx 日志文件，并让 DaemonSet 通过 `nodeName` 固定到目标节点：

```yaml
[root@k8s-master1 ~]# cat filebeat-to-logstash-nginx.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: k8s-filebeat-config-nginx-logs
  namespace: default

data:
  filebeat.yml: |
    filebeat.inputs:
      - type: log
        paths:
          - /var/log/nginx/access.log
        fields:
          app: k8s
          type: module
        fields_under_root: true

      - type: log
        paths:
          - /var/log/nginx/error.log
        fields:
          app: k8s
          type: module
        fields_under_root: true

    setup.ilm.enabled: false
    setup.template.name: "k8s-module"
    setup.template.pattern: "k8s-module-*"

    output.logstash:
      hosts: ['192.168.10.202:5055']

---

apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: k8s-logs
  namespace: default
spec:
  selector:
    matchLabels:
      project: k8s
      app: filebeat
  template:
    metadata:
      labels:
        project: k8s
        app: filebeat
    spec:
      nodeName: k8s-worker1
      containers:
      - name: filebeat
        image: docker.io/elastic/filebeat:7.17.2
        imagePullPolicy: IfNotPresent
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        resources:
          requests:
            cpu: 100m
            memory: 100Mi
          limits:
            cpu: 500m
            memory: 500Mi
        securityContext:
          runAsUser: 0
        volumeMounts:
        - name: filebeat-config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
        - name: nginx-access
          mountPath: /var/log/nginx/access.log
        - name: nginx-error
          mountPath: /var/log/nginx/error.log
      volumes:
      - name: nginx-access
        hostPath:
          path: /var/log/nginx/access.log
      - name: nginx-error
        hostPath:
          path: /var/log/nginx/error.log
      - name: filebeat-config
        configMap:
          name: k8s-filebeat-config-nginx-logs
```

Logstash 侧再起一个实例，监听 5055、写入 `nginx-*` 索引：

```bash
[root@logstash ~]# cat /etc/logstash/conf.d/nginx-logstash-to-elastic.conf
input {
  beats {
    host => "0.0.0.0"
    port => "5055"
  }
}

filter {

}

output {
    elasticsearch {
      hosts => "192.168.10.201:9200"
      index => "nginx-%{+YYYY.MM.dd}"
    }
}

[root@logstash ~]# /usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/nginx-logstash-to-elastic.conf --path.data /usr/share/logstash/data2 &
[root@logstash ~]# ss -anput | grep ":5055"
tcp    LISTEN     0      128    [::]:5055               [::]:*                   users:(("java",pid=14296,fd=106))
```

```bash
[root@k8s-master1 ~]# kubectl apply -f filebeat-to-logstash-nginx.yaml
configmap/k8s-filebeat-config-nginx-logs created
daemonset.apps/k8s-logs created

[root@k8s-master1 ~]# kubectl get pods -o wide
NAME             READY   STATUS    RESTARTS   AGE   IP              NODE          NOMINATED NODE   READINESS GATES
k8s-logs-ndznb   1/1     Running   0          14s   10.244.194.84   k8s-worker1   <none>           <none>
```

访问几次 nginx 页面产生日志，再到 Kibana 添加 `nginx-*` 索引即可检索。

### 2.6 收集 Pod 应用日志（Sidecar 方式，以 tomcat 为例）

tomcat 日志写在容器内文件（`catalina.*`）而非 stdout，DaemonSet 在节点上读不到，因此在应用 Pod 里附加一个 filebeat **Sidecar 容器**，两者共享 `emptyDir` 日志卷：

```yaml
[root@k8s-master1 ~]# cat tomcat-logs.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tomcat-demo
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      project: www
      app: tomcat-demo
  template:
    metadata:
      labels:
        project: www
        app: tomcat-demo
    spec:
      nodeName: k8s-worker1
      containers:
      - name: tomcat
        image: tomcat:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
          name: web
          protocol: TCP
        resources:
          requests:
            cpu: 0.5
            memory: 1Gi
          limits:
            cpu: 1
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 60
          timeoutSeconds: 20
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 60
          timeoutSeconds: 20
        volumeMounts:
        - name: tomcat-logs
          mountPath: /usr/local/tomcat/logs
        - name: tomcatwebroot
          mountPath: /usr/local/tomcat/webapps/ROOT

      - name: filebeat
        image: docker.io/elastic/filebeat:7.17.2
        imagePullPolicy: IfNotPresent
        args: [
          "-c", "/etc/filebeat.yml",
          "-e",
        ]
        resources:
          limits:
            memory: 500Mi
          requests:
            cpu: 100m
            memory: 100Mi
        securityContext:
          runAsUser: 0
        volumeMounts:
        - name: filebeat-config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
        - name: tomcat-logs
          mountPath: /usr/local/tomcat/logs
      volumes:
      - name: tomcat-logs
        emptyDir: {}
      - name: tomcatwebroot
        hostPath:
          path: /opt/tomcatwebroot
          type: Directory
      - name: filebeat-config
        configMap:
          name: filebeat-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: default

data:
  filebeat.yml: |-
    filebeat.inputs:
    - type: log
      paths:
        - /usr/local/tomcat/logs/catalina.*

      fields:
        app: www
        type: tomcat-catalina
      fields_under_root: true
      multiline:
        pattern: '^\['
        negate: true
        match: after

    setup.ilm.enabled: false
    setup.template.name: "tomcat-catalina"
    setup.template.pattern: "tomcat-catalina-*"

    output.logstash:
      hosts: ['192.168.10.202:5056']
```

注意其中 `multiline` 配置：catalina 日志一条记录跨多行（堆栈），`pattern: '^\['` 表示不以 `[` 开头的行合并到上一条之后——这是 Java 应用日志采集的关键配置，后文生产注意事项还会展开。

> 💡 默认 tomcat 容器没有网站首页文件，不添加会导致健康探针失败、Pod 无法就绪。提前在节点上 `mkdir /opt/tomcatwebroot && echo "tomcat running" > /opt/tomcatwebroot/index.html`。

Logstash 再起一个 5056 端口的实例：

```bash
[root@logstash ~]# cat /etc/logstash/conf.d/tomcat-logstash-to-elastic.conf
input {
  beats {
    host => "0.0.0.0"
    port => "5056"
  }
}

filter {

}

output {
    elasticsearch {
      hosts => "192.168.10.201:9200"
      index => "tomcat-catalina-%{+yyyy.MM.dd}"
    }
}

[root@logstash ~]# /usr/share/logstash/bin/logstash -f /etc/logstash/conf.d/tomcat-logstash-to-elastic.conf --path.data /usr/share/logstash/data3 &
[root@logstash ~]# ss -anput | grep ":5056"
tcp    LISTEN     0      128    [::]:5056               [::]:*                   users:(("java",pid=14144,fd=106))
```

应用并验证：

```bash
[root@k8s-master1 ~]# kubectl apply -f tomcat-logs.yaml

[root@k8s-master1 ~]# kubectl get deployment.apps
NAME          READY   UP-TO-DATE   AVAILABLE   AGE
tomcat-demo   2/2     2            2            5m26s
[root@k8s-master1 ~]# kubectl get pods
NAME                           READY   STATUS    RESTARTS   AGE
tomcat-demo-664584f857-k8whd   2/2     Running   0          5m33s
tomcat-demo-664584f857-xncpk   2/2     Running   0          5m33s

# 分别查看 tomcat 与 filebeat 容器日志
[root@k8s-master1 ~]# kubectl logs tomcat-demo-664584f857-k8whd -c tomcat
[root@k8s-master1 ~]# kubectl logs tomcat-demo-664584f857-k8whd -c filebeat
```

在 Kibana 添加 `tomcat-catalina-*` 索引后即可检索。

---

## 三、EFK 方案：Fluentd + ES + Kibana

EFK 为 Elasticsearch、Fluentd、Kibana 的简称。与 ELK 相比，它用 Fluentd 替代了 Filebeat + Logstash 两个组件，并且全套件可以直接部署在 K8s 集群内部——K8s 官方仓库就自带这套 addon 清单。

### 3.1 Fluentd 介绍

![image-20220408232416685](/云原生/k8s-ops/k8s-ops-08-kubernetes日志收集方案-efk/image-20220408232416685.png)

Fluentd 是一款开源日志收集工具，2016 年 11 月 8 日被云原生计算基金会（CNCF）收录，并于 2019 年毕业。它的优势：

- **使用 JSON 统一日志记录**：尽可能把数据结构化为 JSON，让下游数据处理容易
- **可插拔架构**：利用插件对功能扩展，输入/输出/过滤器自由组合
- **对计算机资源要求少**：C 语言和 Ruby 结合编写，少量系统资源即可运行
- **内置可靠性**：支持基于内存和文件的缓冲，防止节点间数据丢失；支持强大故障转移并可设置为高可用

**Fluent Bit 与 Fluentd 的差异**：Fluent Bit 是 Fluentd 生态的轻量版采集器，纯 C 实现，内存占用约 450KB 起（Fluentd 数十 MB 起），插件生态较小但覆盖 K8s 场景所需的全部能力（tail、kubernetes 过滤器、ES 输出等）。资源紧张的边缘/大规模节点场景优先 Fluent Bit；需要复杂过滤加工时用 Fluentd。

| 维度 | Fluentd | Fluent Bit |
|------|---------|------------|
| 语言 | C + Ruby | 纯 C |
| 内存占用 | 数十 MB 起 | ~450KB 起 |
| 插件数量 | 1000+（Ruby gem） | 较少但够用 |
| 定位 | 采集 + 转发 + 处理 | 轻量采集/转发 |
| K8s 场景 | 官方 addon 传统方案 | 目前主流推荐 |

### 3.2 获取部署清单

本例使用 K8s 官方仓库自带的 fluentd-elasticsearch addon（以 v1.21.10 分支为例，本地主机指 k8s master 节点）：

```bash
# git clone https://github.com/kubernetes/kubernetes.git
# cd kubernetes/
# git branch
# git checkout -b v1.21.10

# cd cluster/addons/fluentd-elasticsearch
# ls
create-logging-namespace.yaml  es-statefulset.yaml        fluentd-es-image        OWNERS
es-image                       fluentd-es-configmap.yaml  kibana-deployment.yaml  podsecuritypolicies
es-service.yaml                fluentd-es-ds.yaml         kibana-service.yaml     README.md
```

### 3.3 部署 ES

创建命名空间（非必须，也可使用清单中默认的 kube-system）：

```bash
# kubectl create namespace logging
```

部署 ES StatefulSet 与 Service：

```bash
# kubectl apply -f es-statefulset.yaml

# 应用前，请注释 es-service.yaml 中的 clusterIP: None，并修改 type 为 NodePort，再执行
# kubectl apply -f es-service.yaml
```

```bash
# kubectl get pods -n logging
NAME                      READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0   1/1     Running   0          8m
elasticsearch-logging-1   1/1     Running   1          5m50s

# kubectl get svc -n logging
NAME                    TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)                         AGE
elasticsearch-logging   NodePort   10.107.97.124   <none>        9200:31885/TCP,9300:32214/TCP   68s
```

验证集群健康（green 即健康）：

```bash
# curl 10.107.97.124:9200/_cat/health?pretty
1640939218 08:26:58 kubernetes-logging green 2 2 6 3 0 0 0 0 - 100.0%
```

### 3.4 部署 Fluentd

部署前先修改 ConfigMap 中连接 ES 的地址与端口（根据实际环境调整）：

```bash
# vim fluentd-es-configmap.yaml

456   output.conf: |-
457     <match **>
458       @id elasticsearch
459       @type elasticsearch
460       @log_level info
461       type_name _doc
462       include_tag_key true
463       host elasticsearch-logging 修改此处为es主机地址
464       port 9200 使用NodePort时，此处也需要修改对应映射端口
465       logstash_format true
466       <buffer>
```

```bash
# kubectl apply -f fluentd-es-configmap.yaml
```

再修改 DaemonSet 清单（按需调整 selector 等配置）后应用：

```bash
# vim fluentd-es-ds.yaml

 55   selector:
 56     matchLabels:
 57       k8s-app: fluentd-es
 58       version: v3.1.1
 59   template:
 60     metadata:
 61       labels:
 62         k8s-app: fluentd-es
 63         version: v3.1.1
 64     spec:
 65       #securityContext:
 66       #  seccompProfile:
 67       #    type: RuntimeDefault

# kubectl apply -f fluentd-es-ds.yaml
```

```bash
# kubectl get pods -n logging
NAME                      READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0   1/1     Running   0          20m
elasticsearch-logging-1   1/1     Running   1          18m
fluentd-es-v3.1.1-2chjb   1/1     Running   0          64s
fluentd-es-v3.1.1-5gpmd   1/1     Running   0          64s
```

每个节点各跑一个 fluentd-es Pod，自动采集 `/var/log/containers/` 下所有容器日志并写入 ES。

### 3.5 部署 Kibana

修改 Deployment 清单（注释 securityContext 与 SERVER_BASEPATH）后应用：

```bash
# vim kibana-deployment.yaml

 18     spec:
        以下三行注释掉
 19      # securityContext:
 20      #   seccompProfile:
 21      #    type: RuntimeDefault
 22       containers:
 23         - name: kibana-logging
 24           image: docker.elastic.co/kibana/kibana-oss:7.10.2
 ...
 32             - name: ELASTICSEARCH_HOSTS
 33               value: http://elasticsearch-logging.logging.svc.cluster.local.:9200
 34             - name: SERVER_NAME
 35               value: kibana-logging
             以下两行注释掉
 36             #- name: SERVER_BASEPATH
 37             #  value: /api/v1/namespaces/logging/services/kibana-logging/proxy

# kubectl apply -f kibana-deployment.yaml
```

修改 Service 为 NodePort 暴露，供集群外用户访问：

```bash
# vim kibana-service.yaml

spec:
  ports:
  - port: 5601
    protocol: TCP
    targetPort: ui
  selector:
    k8s-app: kibana-logging
  type: NodePort 添加此行内容

# kubectl apply -f kibana-service.yaml
```

```bash
# kubectl get pods -n logging
NAME                             READY   STATUS    RESTARTS   AGE
elasticsearch-logging-0          1/1     Running   0          25m
elasticsearch-logging-1          1/1     Running   1          22m
fluentd-es-v3.1.1-2chjb          1/1     Running   0          5m45s
fluentd-es-v3.1.1-5gpmd          1/1     Running   0          5m45s
kibana-logging-c46f6b9c5-g9fsl   1/1     Running   0          11s

# kubectl get svc -n logging
NAME                    TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)                         AGE
elasticsearch-logging   NodePort   10.107.97.124   <none>        9200:31885/TCP,9300:32214/TCP   15m
kibana-logging          NodePort   10.99.171.38    <none>        5601:31739/TCP                  7s

# 在集群任意主机验证端口已打开
# ss -anput | grep "31739"
tcp    LISTEN     0      4096      *:31739                 *:*                   users:(("kube-proxy",pid=4569,fd=23))
```

通过浏览器访问 `http://<任意节点IP>:31739` 打开 Kibana，fluentd 默认以 `logstash-*` 格式建索引，添加索引模式后即可检索全集群容器日志：

![image-20211231164228950](/云原生/k8s-ops/k8s-ops-08-kubernetes日志收集方案-efk/image-20211231164228950.png)

---

## 四、ELK vs EFK 选型

两套方案的 ES 与 Kibana 完全一致，差异集中在采集与转发层：

| 维度 | ELK（Filebeat + Logstash） | EFK（Fluentd / Fluent Bit） |
|------|---------------------------|------------------------------|
| 采集器 | Filebeat（Go，轻量） | Fluentd（C+Ruby）/ Fluent Bit（C，更轻） |
| 解析加工 | Logstash filter（grok 强大，但 JVM 吃资源） | Fluentd filter 插件（够用） |
| 部署位置 | 常物理机独立部署 ELK 集群 | 官方 addon，全组件可跑在 K8s 内 |
| 资源占用 | Logstash 较重（JVM，GB 级） | Fluentd 较轻，Fluent Bit 极轻 |
| 生态 | Elastic 全家桶，X-Pack 认证/告警 | CNCF 毕业项目，云原生事实标准 |
| 与 K8s 集成 | 需自己拼 DaemonSet 清单 | 官方清单、Helm Chart 现成 |
| 适用场景 | 已有 Elastic 物理机集群、日志需复杂清洗 | 全栈 K8s 内自洽、追求运维简单 |

选型建议：

- **中小集群、快速落地**：EFK（或 ES + Fluent Bit + Kibana），一套清单全在集群内，运维心智负担最小
- **大规模、多集群汇总**：Filebeat（ DaemonSet）→ Kafka 缓冲 → Logstash 集中清洗 → ES，物理机部署，抗流量洪峰
- **混合**：采集端用 Fluent Bit/Filebeat，加工层保留 Logstash，三者协议兼容（都支持 beats/HTTP 协议互通）

---

## 五、生产注意事项

### 5.1 索引生命周期（ILM）

日志按天建索引（`k8s-%{+YYYY.MM.dd}`）只解决组织问题，不解决容量问题。生产必须配置索引生命周期管理：

- 热阶段（如 1~3 天）：全量副本可查询
- 温/冷阶段（如 7 天）：缩减副本、冻结索引
- 删除阶段（如 30 天）：自动删除

```text
setup.ilm.enabled: true           # 生产建议开启（实验环境为避免干扰才关闭）
setup.ilm.policy_name: logs-policy
setup.ilm.rollover_alias: k8s-logs
```

> ⚠️ 本文实验配置中 `setup.ilm.enabled: false` 是为了让索引名完全可控便于演示，生产环境不要照抄。不配 ILM 的 ES 集群，磁盘水位达到 85%~90% 后会强制只读（`read_only_allow_delete: true`），写入直接失败。

### 5.2 日志量控制

集群日志量极易失控（一条访问日志一行、健康探针每次访问都记日志）：

- **采集侧裁剪**：不采集健康检查路径的 access 日志、DEBUG 级别日志；Filebeat 用 `exclude_lines` / Fluentd 用 grep filter 过滤
- **索引区分**：不同来源（系统/应用/访问日志）分索引，访问日志保留期可远短于错误日志
- **资源限制**：给采集器 DaemonSet 设置 `resources.limits`（本文清单中的 500Mi 即为此），防止采集器自身吃垮节点
- **采样与丢弃**：超大规模下对海量重复日志采样上报

### 5.3 多行日志

Java 异常堆栈一条记录跨几十行，不合并的话每行都会成为一条独立 ES 文档，检索时惨不忍睹：

```yaml
# Filebeat 多行合并：不以 '[' 开头的行归并到上一条
multiline:
  pattern: '^\['
  negate: true
  match: after
```

- Fluentd/Fluent Bit 对应 `multiline` / `multiline.parser` 插件
- 最佳实践是 **应用输出 JSON 单行日志**（logback 等框架原生支持），从根上规避多行问题
- 注意：多行合并必须发生在采集侧，日志到达 ES 后无法再合并

> 💡 另外两个高频坑：容器 stdout 日志默认 json-file 驱动有 10MB×3 的轮转上限，历史日志会丢，需要更长保留时要么调大驱动参数、要么靠采集端外发；Sidecar 方案中日志卷用 `emptyDir`，Pod 消失日志即消失，采集链路要保证在此之前已外发。

---

## 小结

- K8s 日志分三层：节点系统日志、节点应用日志、Pod 应用日志；`kubectl logs` 只能看单 Pod，聚合检索必须上收集方案
- **ELK**：Filebeat DaemonSet 采集 → Logstash 解析 → ES 存储 → Kibana 展示；ELK 集群常物理机部署，三种采集模式（DaemonSet / 节点日志挂载 / Sidecar）分别对应三类日志
- **EFK**：用 Fluentd（或更轻的 Fluent Bit）一个组件替代 Filebeat + Logstash，全套件可用官方 addon 清单跑在 K8s 集群内部
- 选型：中小集群用 EFK 省心，大规模多集群用 Filebeat + Kafka + Logstash 抗量
- 生产三件事：ILM 索引生命周期、日志量裁剪、多行日志合并

> **Kubernetes 系列 · 第 18/35 篇**  
> 下一篇：[《安全容器运行时——Kata Containers 与 gVisor》](/云原生/k8s/k8s-23-sandbox-runtimes)
