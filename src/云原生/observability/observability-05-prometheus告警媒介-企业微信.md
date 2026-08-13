---
title: Prometheus告警媒介 企业微信
sidebarGroup: 可观测性
shortTitle: 05 Prometheus告警媒介 企业微信
order: 5
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 可观测性
  - 云原生
  - 课程笔记
description: Prometheus告警媒介 企业微信 一、创建用于接收告警的部门 创建部门 获取部分ID，告警配置用。 添加成员至部门 二、企业微信创建应用 三、为创建的应用配置可信IP 如果不配置可信IP，则无法...
---

> **可观测性 · 第 5 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Prometheus告警媒介 企业微信

# 一、创建用于接收告警的部门

> 创建部门

![image-20230628153816172](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628153816172.png)

> 获取部分ID，告警配置用。

![image-20230628153850470](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628153850470.png)

> 添加成员至部门

![image-20230628153939051](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628153939051.png)

# 二、企业微信创建应用

![image-20230628130203879](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628130203879.png)

![image-20230628130241868](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628130241868.png)

![image-20230628130503604](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628130503604.png)

![image-20230628130419529](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628130419529.png)

![image-20230628130741848](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628130741848.png)

![image-20230628130933785](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628130933785.png)

![image-20230628154041956](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628154041956.png)

![image-20230628131221933](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628131221933.png)

# 三、为创建的应用配置可信IP

> 如果不配置可信IP，则无法发送告警信息。

## 3.1 添加可信域名

![image-20230628140705960](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628140705960.png)3.1 

![image-20230628142539435](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628142539435.png)

![image-20230628143051315](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628143051315.png)

## 3.2 获取公网IP地址添加到企业可信IP

~~~powershell
[root@prometheus-server ~]# curl httpbin.org/ip
{
  "origin": "120.244.60.4"
}
~~~

![image-20230628143420206](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628143420206.png)

![image-20230628132026382](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628132026382.png)

![image-20230628143239085](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628143239085.png)

![image-20230628143300150](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628143300150.png)

## 3.3 查看企业ID

![image-20230628143833861](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628143833861.png)

## 3.4 测试验证（可选）

~~~powershell
获取token
# curl -H "Content-Type: application/json" -d '{"corpid":"wwf0fd3739c7f28337", "corpsecret": "rAqYm0eRgUucQZqqrXKI87tRqA5I0RzbJG3EGFpG1os"}' https://qyapi.weixin.qq.com/cgi-bin/gettoken
~~~

~~~powershell
输出内容如下，重点观察token部分：
{"errcode":0,"errmsg":"ok","access_token":"UEKus0dgltgA2WLxJ0Vye9haDCdrvVg56NgUentKSw3-jSpZubH61dQ1_ucsa13yMNQx7snhHurM25VdUsjYY4I72iPDU4Ektsj0qaXZ_UdvdQVeosV5o14Ka-BMKPAZO3J0kLknUBQAJ-6GzDn3wxaU1Ey_88sy3Bvhs202W1qEeDJAlTI5aV6nukVBrjP_woSL6BB40H9RfSNK9gE1mg","expires_in":7200}
~~~

~~~powershell
告警测试，使用上面的token
# curl -H "Content-Type: application/json" -d '{"toparty": "74","msgtype":"text","agentid": "1000066", "text":{"content":"PromAlert - prometheus 告警测试"}, "safe": "0"}' https://qyapi.weixin.qq.com/cgi-bin/message/send？access_token="UEKus0dgltgA2WLxJ0Vye9haDCdrvVg56NgUentKSw3-jSpZubH61dQ1_ucsa13yMNQx7snhHurM25VdUsjYY4I72iPDU4Ektsj0qaXZ_UdvdQVeosV5o14Ka-BMKPAZO3J0kLknUBQAJ-6GzDn3wxaU1Ey_88sy3Bvhs202W1qEeDJAlTI5aV6nukVBrjP_woSL6BB40H9RfSNK9gE1mg"
~~~

# 四、配置Alertmanager告警配置及告警模板文件

>企业ID：wwf0fd3739c7f28337
>
>部门ID：75
>
>应用ID（agentID）:1000067
>
>Secret: wQ6msUpcpOvOTvjxtX59X7Ym7eZ3LmegG72LNloJ-6U

## 4.1 修改Alertmanager配置文件

~~~powershell
[root@alertmanager alertmanager]# vim alertmanager.yml
[root@alertmanager alertmanager]# cat > alertmanager.yml << EOF
global:
  resolve_timeout: 3m
  wechat_api_url: "https://qyapi.weixin.qq.com/cgi-bin/"
  wechat_api_secret: "wQ6msUpcpOvOTvjxtX59X7Ym7eZ3LmegG72LNloJ-6U"
  wechat_api_corp_id: "wwf0fd3739c7f28337"

templates:
  - '/usr/local/src/alertmanager/wechat.tmpl'

route:
  group_by: ['env','instance','type','group','job','alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
  receiver: wechat

receivers:
- name: 'wechat'
  wechat_configs:
  - agent_id: "1000067"
    to_party: "75"
    message: '{{ template "wechat.default.message" . }}'
    send_resolved: true
EOF
~~~

## 4.2 配置告警模板

~~~powershell
[root@alertmanager alertmanager]# vim wechat.tmpl
[root@alertmanager alertmanager]# cat > /usr/local/src/alertmanager/wechat.tmpl << EOF
{{ define "wechat.default.message" }}
{{- if gt (len .Alerts.Firing) 0 -}}
{{- range $index, $alert := .Alerts -}}
{{- if eq $index 0 }}
======== 监控报警 ========
告警状态：{{   .Status }}
告警级别：{{ .Labels.severity }}
告警类型：{{ .Labels.alertname }}
故障主机：{{ .Labels.instance }}
告警主题：{{ .Annotations.summary }}
告警详情：{{ .Annotations.description }};
故障时间：{{ .StartsAt.Format "2006-01-02 15:04:05" }}
======== = END = ========
{{- end }}
{{- end }}
{{- end }}

{{- if gt (len .Alerts.Resolved) 0 -}}
{{- range $index, $alert := .Alerts -}}
{{- if eq $index 0 }}
======== 异常恢复 ========
告警类型：{{ .Labels.alertname }}
告警状态：{{ .Status }}
告警主题：{{ .Annotations.summary }}
告警详情：{{ .Annotations.description }};
故障时间：{{ .StartsAt.Format "2006-01-02 15:04:05" }}
恢复时间：{{ .EndsAt.Format "2006-01-02 15:04:05" }}
{{- if gt (len $alert.Labels.instance) 0 }}
实例信息：{{ $alert.Labels.instance }}
{{- end }}
======== = END = ========
{{- end }}
{{- end }}
{{- end }}
{{- end }}
EOF
~~~

~~~powershell
如果告警时间显示的是 UTC 时区，可以将其配置为 {{ (.StartsAt.Add 28800e9).Format "2006-01-02 15:04:05" }}
~~~

~~~powershell
首先，{{ define "wechat.default.message" }} 表示定义了一个名为 "wechat.default.message" 的模板。

接下来的代码使用了条件语句和循环来生成消息的内容。下面是对代码的逐行解释：

if gt (len .Alerts.Firing) 0 检查 .Alerts.Firing 的长度是否大于0。这里使用了内置的 gt 函数来比较长度，.Alerts.Firing 是一个列表或数组。如果列表不为空，那么执行接下来的代码块。

range $index, $alert := .Alerts 是一个循环语句，遍历 .Alerts 列表中的元素。每个元素会被赋值给 $alert 变量，而索引会被赋值给 $index 变量。这里使用了 - 符号来删除循环语句生成的空白字符。

if eq $index 0 检查当前循环迭代的索引是否为0，也就是第一个元素。如果是第一个元素，执行下面的代码块。

======== 监控报警 ======== 是一行静态文本，用于作为报警消息的标题。

告警状态：{{ .Status }} 插入了一个动态内容，使用了 .Status 的值。这里的 .Status 是从当前迭代的 $alert 对象中获取的。

告警级别：{{ .Labels.severity }} 插入了 .Labels.severity 的值，.Labels 是 $alert 对象中的一个字段，.severity 是该字段中的一个属性。

告警类型：{{ .Labels.alertname }} 插入了 .Labels.alertname 的值，同样是从 $alert 对象中获取的。

故障主机：{{ .Labels.instance }} 插入了 .Labels.instance 的值。

告警主题：{{ .Annotations.summary }} 插入了 .Annotations.summary 的值。

告警详情：{{ .Annotations.description }} 插入了 .Annotations.description 的值。

故障时间：{{ (.StartsAt.Add 28800e9).Format "2006-01-02 15:04:05" }} 插入了动态内容，使用了 .StartsAt 的值，并对其进行了一些计算和格式化。这里的 .StartsAt 可能是一个时间戳，通过调用 .Add 方法并添加 28800e9（可能是一个时间偏移值）后，使用了 Format 方法将时间格式化为 "2006-01-02 15:04:05" 的形式。

通过遍历 .Alerts 列表中的元素，可以处理多个报警信息。然而，由于代码中使用了 if eq $index 0，只有第一个报警会生成完整的报警消息，其他报警可能只会生成部分内容或根本不会生成。

模板中的动态内容是通过在双花括号 {{ }} 中使用点符号 . 和字段名来引用。点符号表示当前上下文中的对象，这里是 $alert 对象。可以使用点符号来访问对象的字段和属性，以动态地获取数据并插入到消息中。

最后一行的 (.StartsAt.Add 28800e9).Format "2006-01-02 15:04:05" 表示对 .StartsAt 进行时间计算和格式化。首先，使用 .Add 方法将 .StartsAt 的值增加了 28800e9，这可能是一个时间偏移值，然后使用 Format 方法将结果格式化为 "2006-01-02 15:04:05" 的时间字符串。
~~~

> 加载配置文件及告警模板

~~~powershell
[root@alertmanager alertmanager]# curl -X POST http://192.168.10.173:9093/-/reload
~~~

# 五、测试企业微信告警

~~~powershell
[root@prometheus-server ~]# dd if=/dev/zero of=/test1 bs=1M count=10000
~~~

![image-20230628162011593](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628162011593.png)

![image-20230628162037461](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628162037461.png)

![image-20230628161919479](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628161919479.png)

![image-20230628163848440](/云原生/observability/observability-05-prometheus告警媒介-企业微信/image-20230628163848440.png)

