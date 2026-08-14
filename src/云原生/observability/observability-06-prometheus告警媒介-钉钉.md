---
title: Prometheus告警媒介 钉钉
sidebarGroup: 可观测性
shortTitle: 06 Prometheus告警媒介 钉钉
order: 6
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 可观测性
  - 云原生
  - 课程笔记
description: 'Prometheus告警媒介 钉钉 一、创建钉钉群 二、添加钉钉群机器人 ~~~powershell secret: SECc95134129e043e4be06df4d5aa2afdef066a6d...'
---

> **可观测性 · 第 6 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Prometheus告警媒介 钉钉

# 一、创建钉钉群

![image-20230629133335619](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629133335619.png)

![image-20230629133402137](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629133402137.png)

![image-20230629133626208](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629133626208.png)

![image-20230629134601765](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629134601765.png)

# 二、添加钉钉群机器人

![image-20230629134659773](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629134659773.png)

![image-20230629135506161](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629135506161.png)

![image-20230629135845857](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629135845857.png)

![image-20230629135925879](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629135925879.png)

![image-20230629140157687](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629140157687.png)

![image-20230629140241531](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629140241531.png)

![image-20230629140359683](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629140359683.png)

![image-20230629140528429](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629140528429.png)

~~~powershell
secret: SECc95134129e043e4be06df4d5aa2afdef066a6d361ac73da97bc7220618cfa9da
~~~

![image-20230629140644960](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629140644960.png)

![image-20230629140739149](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629140739149.png)

~~~powershell
Webhook: https://oapi.dingtalk.com/robot/send?access_token=e7f8aac8fc2705064b28ae1b6d1a6d0dfc53974e0dc98423384b637c9ebe4498
~~~

![image-20230629140958795](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230629140958795.png)

# 三、安装钉钉告警插件

![image-20230704142848005](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230704142848005.png)

![image-20230704143038337](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230704143038337.png)

![image-20230704143157315](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230704143157315.png)

~~~powershell
[root@alertmanager ~]# wget https://github.com/timonwong/prometheus-webhook-dingtalk/releases/download/v2.1.0/prometheus-webhook-dingtalk-2.1.0.linux-amd64.tar.gz
~~~

~~~powershell
[root@alertmanager ~]# ls
prometheus-webhook-dingtalk-2.1.0.linux-amd64.tar.gz
~~~

~~~powershell
[root@alertmanager ~]# tar xf prometheus-webhook-dingtalk-2.1.0.linux-amd64.tar.gz
[root@alertmanager ~]# ls
prometheus-webhook-dingtalk-2.1.0.linux-amd64
~~~

~~~powershell
[root@alertmanager ~]# mv prometheus-webhook-dingtalk-2.1.0.linux-amd64 /usr/local/src/prometheus-webhook-dingtalk
~~~

~~~powershell
[root@alertmanager ~]# ls /usr/local/src/
alertmanager  prometheus-webhook-dingtalk
~~~

~~~powershell
[root@alertmanager ~]# mv /usr/local/src/prometheus-webhook-dingtalk/config.example.yml /usr/local/src/prometheus-webhook-dingtalk/config.yml
[root@alertmanager ~]# ls /usr/local/src/prometheus-webhook-dingtalk/
config.yml  contrib  LICENSE  prometheus-webhook-dingtalk
~~~

~~~powershell
注册为系统服务
[root@alertmanager prometheus-webhook-dingtalk]# vim /usr/lib/systemd/system/prometheus-webhook-dingtalk.service
[root@alertmanager prometheus-webhook-dingtalk]# cat > /usr/lib/systemd/system/prometheus-webhook-dingtalk.service << EOF
[Service]
ExecStart=/usr/local/src/prometheus-webhook-dingtalk/prometheus-webhook-dingtalk --config.file=/usr/local/src/prometheus-webhook-dingtalk/config.yml
 
[Install]
WantedBy=multi-user.target
 
[Unit]
Description=prometheus-webhook-dingtalk
After=network.target
EOF
~~~

~~~powershell
重载/开机自启/查看状态/启动
[root@alertmanager prometheus-webhook-dingtalk]# systemctl daemon-reload
[root@alertmanager prometheus-webhook-dingtalk]# systemctl enable prometheus-webhook-dingtalk
[root@alertmanager prometheus-webhook-dingtalk]# systemctl status prometheus-webhook-dingtalk
[root@alertmanager prometheus-webhook-dingtalk]# systemctl start prometheus-webhook-dingtalk
~~~

# 四、配置钉钉告警插件与钉钉机器人集成

~~~powershell
[root@alertmanager ~]# cd /usr/local/src/prometheus-webhook-dingtalk/
[root@alertmanager prometheus-webhook-dingtalk]# pwd
/usr/local/src/prometheus-webhook-dingtalk
[root@alertmanager prometheus-webhook-dingtalk]# ls
config.yml  contrib  LICENSE  prometheus-webhook-dingtalk
~~~

~~~powershell
[root@alertmanager prometheus-webhook-dingtalk]# vim config.yml
[root@alertmanager prometheus-webhook-dingtalk]# cat config.yml
## Request timeout
# timeout: 5s

## Uncomment following line in order to write template from scratch (be careful!)
#no_builtin_template: true

## Customizable templates path
#templates:
#  - contrib/templates/legacy/template.tmpl
templates:
  - /usr/local/src/alertmanager/dingtalk.tmpl

## You can also override default template using `default_message`
## The following example to use the 'legacy' template from v0.3.0
#default_message:
#  title: '{{ template "legacy.title" . }}'
#  text: '{{ template "legacy.content" . }}'

## Targets, previously was known as "profiles"
targets:
  webhook1:
    url: https://oapi.dingtalk.com/robot/send?access_token=e7f8aac8fc2705064b28ae1b6d1a6d0dfc53974e0dc98423384b637c9ebe4498
    # secret for signature
    secret: SECc95134129e043e4be06df4d5aa2afdef066a6d361ac73da97bc7220618cfa9da
    # Customize template content
    message:
      # Use legacy template
      title: '{{ template "ops.title" . }}'
      text: '{{ template "ops.content" . }}'
~~~

~~~powershell
说明：
## Request timeout
# timeout: 5s

## Uncomment following line in order to write template from scratch (be careful!)
#no_builtin_template: true

## Customizable templates path
#templates:
#  - contrib/templates/legacy/template.tmpl
templates:
  - /usr/local/src/alertmanager/dingtalk.tmpl 自定义告警模板文件及位置

## You can also override default template using `default_message`
## The following example to use the 'legacy' template from v0.3.0
#default_message:
#  title: '{{ template "legacy.title" . }}'
#  text: '{{ template "legacy.content" . }}'

## Targets, previously was known as "profiles"
targets:
  webhook1:
    url: https://oapi.dingtalk.com/robot/send?access_token=e7f8aac8fc2705064b28ae1b6d1a6d0dfc53974e0dc98423384b637c9ebe4498 配置钉钉机器人webhook_url
    # secret for signature
    secret: SECc95134129e043e4be06df4d5aa2afdef066a6d361ac73da97bc7220618cfa9da 配置加签SECRET
    # Customize template content
    message:
      # Use legacy template
      title: '{{ template "ops.title" . }}' 添加模板标题，在下面的模板文件title位置
      text: '{{ template "ops.content" . }}' 添加模板内容，在下面的模板文件content位置
~~~

# 五、为alertmanager配置告警模板文件

~~~powershell
[root@alertmanager ~]# vim /usr/local/src/alertmanager/dingtalk.tmpl
[root@alertmanager ~]# cat /usr/local/src/alertmanager/dingtalk.tmpl
{{ define "__subject" }}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}]
{{ end }}

{{ define "__alert_list" }}{{ range . }}
---
    **kubemsb 告警类型**: {{ .Labels.alertname }}
    **kubemsb 告警级别**: {{ .Labels.level }}
    **kubemsb 故障主机**: {{ .Labels.instance }}
    **kubemsb 告警信息**: {{ .Annotations.description }}
    **kubemsb 触发时间**: {{ (.StartsAt.Add 28800e9).Format "2006-01-02 15:04:05" }}
{{ end }}{{ end }}

{{ define "__resolved_list" }}{{ range . }}
---
    **kubemsb 告警类型**: {{ .Labels.alertname }}
    **kubemsb 告警级别**: {{ .Labels.level }}
    **kubemsb 故障主机**: {{ .Labels.instance }}
    **kubemsb 触发时间**: {{ (.StartsAt.Add 28800e9).Format "2006-01-02 15:04:05" }}
    **kubemsb 恢复时间**: {{ (.EndsAt.Add 28800e9).Format "2006-01-02 15:04:05" }}
{{ end }}{{ end }}

{{ define "ops.title" }}
{{ template "__subject" . }}
{{ end }}

{{ define "ops.content" }}
{{ if gt (len .Alerts.Firing) 0 }}
**====kubemsb  侦测到{{ .Alerts.Firing | len  }}个故障====**
{{ template "__alert_list" .Alerts.Firing }}
---
{{ end }}

{{ if gt (len .Alerts.Resolved) 0 }}
**====kubemsb  恢复{{ .Alerts.Resolved | len  }}个故障====**
{{ template "__resolved_list" .Alerts.Resolved }}
{{ end }}
{{ end }}

{{ define "ops.link.title" }}{{ template "ops.title" . }}{{ end }}
{{ define "ops.link.content" }}{{ template "ops.content" . }}{{ end }}
{{ template "ops.title" . }}
{{ template "ops.content" . }}
~~~

# 六、修改Alertmanager配置文件添加钉钉告警渠道

~~~powershell
[root@alertmanager ~]# ss -anput | grep ":8060"
tcp    LISTEN     0      4096   [::]:8060               [::]:*                   users:(("prometheus-webh",pid=9313,fd=3))
~~~

~~~powershell
[root@alertmanager ~]# vim /usr/local/src/alertmanager/alertmanager.yml
[root@alertmanager ~]# cat /usr/local/src/alertmanager/alertmanager.yml
global:
  resolve_timeout: 3m

templates:
  - '/usr/local/src/alertmanager/dingtalk.tmpl'

route:
  group_by: ['env','instance','type','group','job','alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
  receiver: dingtalk_webhook

receivers:
- name: 'dingtalk_webhook'
  webhook_configs:
  - url: 'http://192.168.10.173:8060/dingtalk/webhook1/send'
    send_resolved: true
~~~

~~~powershell
说明如下：
global:
  resolve_timeout: 3m

templates:
  - '/usr/local/src/alertmanager/dingtalk.tmpl' 告警模板位置

route:
  group_by: ['env','instance','type','group','job','alertname'] 根据告警规则组名进行分组
  group_wait: 30s 分组内第一个告警等待时间，30s内如有第二个告警会合并一个告警
  group_interval: 5m 发送新告警间隔时间
  repeat_interval: 1h 重复告警间隔发送时间，如果没处理过1h再次发送
  receiver: dingtalk_webhook 告警接收人

receivers:
- name: 'dingtalk_webhook' 告警接收人
  webhook_configs:
  - url: 'http://192.168.10.173:8060/dingtalk/webhook1/send' 访问webhook1 url
    send_resolved: true 在恢复后是否发送恢复消息给接收人
~~~

# 七、重启prometheus-webhook-dingtalk及alertmanager

~~~powershell
[root@alertmanager ~]# systemctl restart prometheus-webhook-dingtalk
~~~

~~~powershell
[root@alertmanager ~]# systemctl restart alertmanager
~~~

> 或使用curl -lv -X POST http://localhost:9093/-/reload进行配置文件重新加载

# 八、告警测试

~~~powershell
[root@prometheus-server ~]# df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 1.9G     0  1.9G    0% /dev
tmpfs                    2.0G     0  2.0G    0% /dev/shm
tmpfs                    2.0G  9.8M  1.9G    1% /run
tmpfs                    2.0G     0  2.0G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G  7.5G   43G   15% /
/dev/sda1               1014M  293M  722M   29% /boot
/dev/mapper/centos-home  969G   33M  969G    1% /home
tmpfs                    391M   12K  391M    1% /run/user/42
tmpfs                    391M     0  391M    0% /run/user/0

[root@prometheus-server ~]# dd if=/dev/zero of=/test1 bs=1M count=10000
记录了10000+0 的读入
记录了10000+0 的写出
10485760000字节(10 GB)已复制，14.1928 秒，739 MB/秒

[root@prometheus-server ~]# df -h
文件系统                 容量  已用  可用 已用% 挂载点
devtmpfs                 1.9G     0  1.9G    0% /dev
tmpfs                    2.0G     0  2.0G    0% /dev/shm
tmpfs                    2.0G  9.8M  1.9G    1% /run
tmpfs                    2.0G     0  2.0G    0% /sys/fs/cgroup
/dev/mapper/centos-root   50G   18G   33G   35% /
/dev/sda1               1014M  293M  722M   29% /boot
/dev/mapper/centos-home  969G   33M  969G    1% /home
tmpfs                    391M   12K  391M    1% /run/user/42
tmpfs                    391M     0  391M    0% /run/user/0
~~~

![image-20230704154349413](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230704154349413.png)

![image-20230704154443743](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230704154443743.png)

![image-20230704154507498](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230704154507498.png)

![image-20230704163347272](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230704163347272.png)

![image-20230704182647395](/云原生/observability/observability-06-prometheus告警媒介-钉钉/image-20230704182647395.png)

