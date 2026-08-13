---
title: GitLab 触发 Tekton 任务构建
sidebarGroup: Serverless
shortTitle: 18 GitLab 触发 Tekton 任务构建
order: 18
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: 基于GitLab 触发 Tekton 实现任务构建 一、Tekton Triggers介绍 前面我们都是通过创建一个 TaskRun 或者一个 PipelineRun 对象来触发构建任务，但是在实际的...
---

> **Serverless · 第 18 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 基于GitLab 触发 Tekton 实现任务构建

# 一、Tekton Triggers介绍

前面我们都是通过创建一个 TaskRun 或者一个 PipelineRun 对象来触发构建任务，但是在实际的工作中更多的是开发人员提交代码过后自动触发构建任务，这个时候就需要用到 Tekton 里面的 `Triggers` 概念。

Triggers 同样通过下面的几个 CRD 对象对 Tekton 进行了一些扩展：

- `TriggerTemplate`: 创建资源的模板，比如用来创建 `PipelineResource` 和 `PipelineRun`
- `TriggerBinding`: 校验事件并提取相关字段属性
- `ClusterTriggerBinding`: 和 `TriggerBinding` 类似，只是是全局的
- `Interceptor`: 处理事件以进行自定义验证或过滤，称为拦截器
- `EventListener`: 事件监听器，连接 `TriggerBinding` 和 `TriggerTemplate` 到事件接收器，使用从各个 `TriggerBinding` 中提取的参数来创建 `TriggerTemplate` 中指定的 resources，同样通过 `interceptor` 字段来指定外部服务对事件属性进行预处理

![image-20220105115005833](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220105115005833.png)

# 二、部署Tekton Triggers

要使用 Tekton Triggers 就需要安装对应的控制器，可以直接通过 tektoncd/triggers 的 GitHub 仓库说明进行安装，如下所示的命令（需要注意 v0.16.0 版本需要安装两个资源清单）

## 2.1 获取Tekton Triggers部署资源清单文件

![image-20220105094850161](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220105094850161.png)

![image-20220105094915178](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220105094915178.png)

![image-20220105094955454](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220105094955454.png)

![image-20220105095027671](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220105095027671.png)

![image-20220105095048985](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220105095048985.png)

## 2.2 部署并验证是否部署成功

~~~powershell
安装triggers-controller与triggers-webhook
# kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/previous/v0.16.0/release.yaml
~~~

~~~powershell
安装triggers-core-interceptors
# kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/previous/v0.16.0/interceptors.yaml
~~~

~~~powershell
查看 Triggers 的相关组件安装状态，直到都为Running 状态

# kubectl get pods -n tekton-pipelines
NAME                                                 READY   STATUS    RESTARTS   AGE
tekton-dashboard-7487777d44-mg46b                    1/1     Running   1          22h
tekton-pipelines-controller-99b764966-84ggp          1/1     Running   1          24h
tekton-pipelines-webhook-55c9dd7446-t44sh            1/1     Running   1          24h
tekton-triggers-controller-6b7df75f4f-6ddbd          1/1     Running   1          21h
tekton-triggers-core-interceptors-7cb974f69f-hs7qh   1/1     Running   1          21h
tekton-triggers-webhook-74b774b8c9-xw59t             1/1     Running   1          21h
~~~

# 三、查看已安装版本

~~~powershell
# tkn version
Client version: 0.21.0
Pipeline version: v0.31.0
Triggers version: v0.16.0
Dashboard version: v0.23.0
~~~

# 四、源码仓库准备

代码已经推送到私有仓库 GitLab，地址为：`http://192.168.10.250/root/tekton-kubemsb-demo`。

![image-20220115070131613](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220115070131613.png)

# 五、EventListener（事件监听器）资源对象创建

## 5.1 创建事件监听器资源对象

当我们提交源代码到 GitLab 的时候，需要触发 Tekton 的任务运行，必须先创建一个`EventListener`,即事件监听器，所以首先需要完成这个事件监听器对象创建。

> 创建一个名为 `gitlab-listener` 的 `EventListener` 资源对象

~~~powershell
# vim gitlab-push-listener.yaml
# cat gitlab-push-listener.yaml
apiVersion: triggers.tekton.dev/v1alpha1
kind: EventListener
metadata:
  name: gitlab-listener  # 该事件监听器会创建一个名为el-gitlab-listener的Service对象
spec:
  serviceAccountName: tekton-triggers-gitlab-sa
  triggers:
  - name: gitlab-push-events-trigger
    interceptors:
    - ref:
        name: gitlab
      params:
      - name: secretRef  # 引用 gitlab-secret 的 Secret 对象中的 secretToken 的值
        value:
          secretName: gitlab-secret
          secretKey: secretToken
      - name: eventTypes
        value:
          - Push Hook # 只接收 GitLab Push 事件
    bindings:
    - ref: tekton-kubemsb-demo-binding
    template:
      ref: tekton-kubemsb-demo-template
~~~

- 由于 `EventListener` 创建完成后会生成一个 Listener 的服务，用来对外暴露用于接收事件响应，上面我们创建的对象名为 `gitlab-listener`，创建完成后会生成一个名为 `el-gitlab-listener` 的 Service 对象

  

- 另外需要注意的是在上面的 `EventListener` 对象中我们添加了 `interceptors` 属性，其中有一个内置的 `gitlab` 拦截器，GitLab 拦截器包含验证和过滤来自 GitLab 的请求逻辑， 比如我们可以配置 WebHook 的 `Secret Token`，可以通过 Secret 对象引入进来

  

- 如果GitLab部署在集群内部，可以用 Service 的 DNS 形式来访问 `EventListener` 即可，如果Gitlab暴露到集群外部则可以使用 NodePort 或者 Ingress 的形式。

~~~powershell
interceptors:
- ref:
    name: gitlab
  params:
  - name: secretRef  # 引用 gitlab-secret 的 Secret 对象中的 secretToken 的值
    value:
      secretName: gitlab-secret
      secretKey: secretToken
  - name: eventTypes
    value:
      - Push Hook # 只接收 GitLab Push 事件
~~~

## 5.2 创建用于WebHook认证的Secret及RBAC授权

对应的 Secret 资源对象如下所示，一个用于 WebHook 的 `Secret Token`，另外一个是用于 GitLab 登录认证使用的：

~~~powershell
# vim gitlab-secret.yaml
# cat gitlab-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-secret
type: Opaque
stringData:
  secretToken: '1234567'
---
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-auth
  annotations:
    tekton.dev/git-0: http://gitlab.kubemsb.com
type: kubernetes.io/basic-auth
stringData:
  username: 'root'
  password: 'abc123.net'
~~~

由于 `EventListener` 对象需要访问其他资源对象，所以需要声明 RBAC，如下所示：

~~~powershell
# vim event-listener-rbac.yaml
# cat event-listener-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-gitlab-sa
secrets:
  - name: gitlab-secret
  - name: gitlab-auth
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tekton-triggers-gitlab-minimal
rules:
   # EventListeners need to be able to fetch all namespaced resources
  - apiGroups: ['triggers.tekton.dev']
    resources:
      ['eventlisteners', 'triggerbindings', 'triggertemplates', 'triggers']
    verbs: ['get', 'list', 'watch']
  - apiGroups: ['']
   #  configmaps is needed for updating logging config
    resources: ['configmaps']
    verbs: ['get', 'list', 'watch']
   # Permissions to create resources in associated TriggerTemplates
  - apiGroups: ['tekton.dev']
    resources: ['pipelineruns', 'pipelineresources', 'taskruns']
    verbs: ['create']
  - apiGroups: ['']
    resources: ['serviceaccounts']
    verbs: ['impersonate']
  - apiGroups: ['policy']
    resources: ['podsecuritypolicies']
    resourceNames: ['tekton-triggers']
    verbs: ['use']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-triggers-gitlab-binding
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-gitlab-sa
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: tekton-triggers-gitlab-minimal
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: tekton-triggers-gitlab-clusterrole
rules:
   # EventListeners need to be able to fetch any clustertriggerbindings
  - apiGroups: ['triggers.tekton.dev']
    resources: ['clustertriggerbindings', 'clusterinterceptors']
    verbs: ['get', 'list', 'watch']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tekton-triggers-gitlab-clusterbinding
subjects:
  - kind: ServiceAccount
    name: tekton-triggers-gitlab-sa
    namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tekton-triggers-gitlab-clusterrole
~~~

## 5.3 创建TriggerBinding与TriggerTemplate对象

接下来就是最重要的 `TriggerBinding` 和 `TriggerTemplate` 对象了，在上面的 `EventListener` 对象中将两个对象组合在一起，这样就可以将 `TriggerBinding` 中的参数传递到 `TriggerTemplate` 对象中进行模板化。

~~~powershell
bindings:
  - ref: tekton-kubemsb-demo-binding # TriggerBinding 对象
template:
  ref: tekton-kubemsb-demo-template # TriggerTemplate 对象
~~~

### 5.3.1 定义 TriggerBinding 对象

~~~powershell
# vim triggerbinding.yaml
# cat triggerbinding.yaml
apiVersion: triggers.tekton.dev/v1alpha1
kind: TriggerBinding
metadata:
  name: tekton-kubemsb-demo-binding
spec:
  params:
    - name: gitrevision
      value: $(body.checkout_sha)
    - name: gitrepositoryurl
      value: $(body.repository.git_http_url)
~~~

这里需要注意的是参数的值是通过读取 `GitLab WebHook` 发送过来的数据值，通过 `$()` 包裹的 JSONPath 表达式来提取的，关于表达式的更多用法可以查看官方文档说明，至于能够提取哪些参数值，则可以查看 WebHook 的说明，比如这里是 GitLab Webhook 的 `Push Hook`，对应的请求体数据如下所示：

~~~powershell
{
  "object_kind": "push",
  "before": "95790bf891e76fee5e1747ab589903a6a1f80f22",
  "after": "da1560886d4f094c3e6c9ef40349f7d38b5d27d7",
  "ref": "refs/heads/master",
  "checkout_sha": "da1560886d4f094c3e6c9ef40349f7d38b5d27d7",
  "user_id": 4,
  "user_name": "John Smith",
  "user_username": "jsmith",
  "user_email": "john@example.com",
  "user_avatar": "https://s.gravatar.com/avatar/d4c74594d841139328695756648b6bd6?s=8://s.gravatar.com/avatar/d4c74594d841139328695756648b6bd6?s=80",
  "project_id": 15,
  "project":{
    "id": 15,
    "name":"Diaspora",
    "description":"",
    "web_url":"http://example.com/mike/diaspora",
    "avatar_url":null,
    "git_ssh_url":"git@example.com:mike/diaspora.git",
    "git_http_url":"http://example.com/mike/diaspora.git",
    "namespace":"Mike",
    "visibility_level":0,
    "path_with_namespace":"mike/diaspora",
    "default_branch":"master",
    "homepage":"http://example.com/mike/diaspora",
    "url":"git@example.com:mike/diaspora.git",
    "ssh_url":"git@example.com:mike/diaspora.git",
    "http_url":"http://example.com/mike/diaspora.git"
  },
  "repository":{
    "name": "Diaspora",
    "url": "git@example.com:mike/diaspora.git",
    "description": "",
    "homepage": "http://example.com/mike/diaspora",
    "git_http_url":"http://example.com/mike/diaspora.git",
    "git_ssh_url":"git@example.com:mike/diaspora.git",
    "visibility_level":0
  },
  "commits": [
    {
      "id": "b6568db1bc1dcd7f8b4d5a946b0b91f9dacd7327",
      "message": "Update Catalan translation to e38cb41.\n\nSee https://gitlab.com/gitlab-org/gitlab for more information",
      "title": "Update Catalan translation to e38cb41.",
      "timestamp": "2011-12-12T14:27:31+02:00",
      "url": "http://example.com/mike/diaspora/commit/b6568db1bc1dcd7f8b4d5a946b0b91f9dacd7327",
      "author": {
        "name": "Jordi Mallach",
        "email": "jordi@softcatala.org"
      },
      "added": ["CHANGELOG"],
      "modified": ["app/controller/application.rb"],
      "removed": []
    },
    {
      "id": "da1560886d4f094c3e6c9ef40349f7d38b5d27d7",
      "message": "fixed readme",
      "title": "fixed readme",
      "timestamp": "2012-01-03T23:36:29+02:00",
      "url": "http://example.com/mike/diaspora/commit/da1560886d4f094c3e6c9ef40349f7d38b5d27d7",
      "author": {
        "name": "GitLab dev user",
        "email": "gitlabdev@dv6700.(none)"
      },
      "added": ["CHANGELOG"],
      "modified": ["app/controller/application.rb"],
      "removed": []
    }
  ],
  "total_commits_count": 4
}
~~~

请求体中的任何属性都可以提取出来，作为 `TriggerBinding` 的参数，如果是其他的 Hook 事件，对应的请求体结构可以查看 GitLab 文档说明。

### 5.3.2 定义TriggerTemplate对象

定义`TriggerBinding`对象后就可以在 `TriggerTemplate` 对象中通过参数来读取上面 `TriggerBinding` 中定义的参数值了。

定义一个如下所示的 `TriggerTemplate` 对象，声明一个 `TaskRun` 的模板，定义的 Task 任务用于在容器中打印出代码的目录结构。

~~~powershell
# vim triggertemplate.yaml
# cat triggertemplate.yaml
apiVersion: triggers.tekton.dev/v1alpha1
kind: TriggerTemplate
metadata:
  name: tekton-kubemsb-demo-template
spec:
  params: # 定义参数，和 TriggerBinding 中的保持一致
    - name: gitrevision
    - name: gitrepositoryurl
  resourcetemplates: # 定义资源模板
    - apiVersion: tekton.dev/v1beta1
      kind: TaskRun # 定义 TaskRun 模板
      metadata:
        generateName: gitlab-run- # TaskRun 名称前缀
      spec:
        serviceAccountName: tekton-triggers-gitlab-sa
        taskSpec: # Task 任务声明
          resources:
            inputs: # 定义一个名为 source 的 git 输入资源
              - name: source
                type: git
          steps:
            - name: show-path
              image: ubuntu # 定义一个执行步骤，列出代码目录结构
              script: |
                #! /bin/bash
                ls -la $(resources.inputs.source.path)
        resources: # 声明具体的输入资源参数
          inputs:
            - name: source # 和 Task 中的资源名保持一直
              resourceSpec: # 资源声明
                type: git
                params:
                  - name: revision
                    value: $(tt.params.gitrevision) # 读取参数值
                  - name: url
                    value: $(tt.params.gitrepositoryurl)
~~~

> 需要注意在最后的 pipelineresource 中引用参数值的时候使用了一个 `tt` 的前缀。

### 5.3.3 应用资源清单文件

定义完过后，直接创建上面的资源对象，创建完成后会自动生成 `EventListener` 的 Pod 和 Service 对象。

~~~powershell
# kubectl apply -f gitlab-push-listener.yaml
eventlistener.triggers.tekton.dev/gitlab-listener created
# kubectl apply -f triggerbinding.yaml
triggerbinding.triggers.tekton.dev/devops-demo-binding created
# kubectl apply -f triggertemplate.yaml
triggertemplate.triggers.tekton.dev/devops-demo-template created
# kubectl apply -f event-listener-rbac.yaml
serviceaccount/tekton-triggers-gitlab-sa created
role.rbac.authorization.k8s.io/tekton-triggers-gitlab-minimal created
rolebinding.rbac.authorization.k8s.io/tekton-triggers-gitlab-binding created
clusterrole.rbac.authorization.k8s.io/tekton-triggers-gitlab-clusterrole created
clusterrolebinding.rbac.authorization.k8s.io/tekton-triggers-gitlab-clusterbinding created
~~~

### 5.3.4 查看事件监听器资源

~~~powershell
查看事件监听器svc
# kubectl get svc -l eventlistener=gitlab-listener
NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)             AGE
el-gitlab-listener   ClusterIP   10.104.23.173   <none>        8080/TCP,9000/TCP   2m4s
~~~

~~~powershell
查看事件监听器pod
# kubectl get pod -l eventlistener=gitlab-listener
NAME                                  READY   STATUS    RESTARTS   AGE
el-gitlab-listener-684f7d8bd5-s5hjd   1/1     Running   0          70s
~~~

~~~powershell
查看事件监听器对象
# kubectl get eventlistener
NAME              ADDRESS                                                    AVAILABLE   REASON                     READY   REASON
gitlab-listener   http://el-gitlab-listener.default.svc.cluster.local:8080   True        MinimumReplicasAvailable   True

~~~

~~~powershell
查看事件监听器endpoints
# kubectl get endpoints
NAME                                      ENDPOINTS                                                              AGE
el-gitlab-listener                        10.244.79.72:8080,10.244.79.72:9000                                    68m
~~~

# 六、Ingress资源准备

> el需要在k8s集群之外访问，以上无法被K8S集群外主机访问，可以通过如下方法实现：部署ingress nginx

~~~powershell
应用ingress controller部署资源清单文件
# kubectl apply -f https://raw.fastgit.org/kubernetes/ingress-nginx/main/deploy/static/provider/baremetal/deploy.yaml
~~~

~~~powershell
查看ingress部署
# kubectl get pods -n ingress-nginx
NAME                                        READY   STATUS      RESTARTS   AGE
ingress-nginx-admission-create-bb29k        0/1     Completed   0          65s
ingress-nginx-admission-patch-kmxbw         0/1     Completed   1          65s
ingress-nginx-controller-5fd866c9b6-cw527   1/1     Running     0          65s
~~~

~~~powershell
编辑svc修改type为LoadBalancer
# kubectl edit service ingress-nginx-controller -n ingress-nginx
service/ingress-nginx-controller edited
~~~

~~~powershell
把type:NodePort 修改为type：LoadBalancer
sessionAffinity: None
  type: LoadBalancer
~~~

~~~powershell
查看其获取的IP地址
# kubectl get svc -n ingress-nginx -o wide
NAME                                 TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)                      AGE     SELECTOR
ingress-nginx-controller             LoadBalancer   10.97.17.70   192.168.10.203   80:30024/TCP,443:30367/TCP   2m46s   app.kubernetes.io/component=controller,app.kubernetes.io/instance=ingress-nginx,app.kubernetes.io/name=ingress-nginx
~~~

~~~powershell
创建ingress对象，便于在k8s集群之外访问到EventListener
# vim ingress.yaml
# cat ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: el.kubemsb.com
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: el-gitlab-listener
            port:
              number: 8080
~~~

~~~powershell
应用资源清单文件
# kubectl apply -f ingress.yaml
ingress.networking.k8s.io/ingress created
~~~

~~~powershell
修改dnsserver服务器中配置，添加EventListener域名解析，并重启named服务。
# cat /var/named/kubemsb.com.zone
$TTL 1D
@       IN SOA  @ admin.kubemsb.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
        NS      @
@       A       192.168.10.253
master01        A       192.168.10.10
worker01        A       192.168.10.20
worker02        A       192.168.10.21
yaml    A       192.168.10.252
harbor  A       192.168.10.251
www     A       192.168.10.251
gitlab  A       192.168.10.250
nfsserver       A       192.168.10.249
el      A       192.168.10.203 添加此内容
*.knative       A       192.168.10.200
~~~

~~~powershell
在k8s集群内访问验证域名是否可用
# dig -t a el.kubemsb.com @10.96.0.10

; <<>> DiG 9.11.4-P2-RedHat-9.11.4-26.P2.el7_9.8 <<>> -t a el.kubemsb.com @10.96.0.10
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 48039
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 1, ADDITIONAL: 2

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;el.kubemsb.com.                        IN      A

;; ANSWER SECTION:
el.kubemsb.com.         30      IN      A       192.168.10.203

;; AUTHORITY SECTION:
kubemsb.com.            30      IN      NS      kubemsb.com.

;; ADDITIONAL SECTION:
kubemsb.com.            30      IN      A       192.168.10.253

;; Query time: 1 msec
;; SERVER: 10.96.0.10#53(10.96.0.10)
;; WHEN: 三 1月 05 13:32:00 CST 2022
;; MSG SIZE  rcvd: 136
~~~

~~~powershell
查看ingress对象描述，以便了解配置是否成功
# kubectl describe ingress
Name:             ingress
Namespace:        default
Address:          192.168.10.21
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host            Path  Backends
  ----            ----  --------
  el.kubemsb.com
                  /   el-gitlab-listener:8080 (10.244.79.72:8080)
Annotations:      kubernetes.io/ingress.class: nginx
Events:
  Type    Reason  Age                From                      Message
  ----    ------  ----               ----                      -------
  Normal  Sync    18m (x2 over 19m)  nginx-ingress-controller  Scheduled for sync
~~~

# 七、GitLab WebHook配置

接下来我们就可以到 GitLab 的项目中配置 WebHook，注意需要配置 `Secret Token`，我们在上面的 Secret 对象中声明过。

## 7.1 GitLab网络权限设置

> 允许GitLab通过本地网络接收WebHook请求。

![image-20220115083535879](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220115083535879.png)

![image-20220115083627021](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220115083627021.png)

![image-20220115083703420](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220115083703420.png)

![image-20220115083757304](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220115083757304.png)

## 7.2 为GitLab仓库添加WebHook功能

![image-20220115084126709](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220115084126709.png)

![image-20220115084322000](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220115084322000.png)

![image-20220115084342603](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220115084342603.png)

创建完成后，我们可以测试下该 WebHook 的 `Push events` 事件，直接点击测试即可，正常会返回 `Hook executed successfully: HTTP 202` 的提示信息。

![image-20220105135307199](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220105135307199.png)

![image-20220105135240388](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220105135240388.png)

# 八、提交本地代码至远程仓库后观察

## 8.1 修改本地代码并提交

~~~powershell
[root@gitlab tekton-kubemsb-demo]# ls
Dockerfile  main.go  main_test.go  README.md
[root@gitlab tekton-kubemsb-demo]# vim main.go
[root@gitlab tekton-kubemsb-demo]# cat main.go
package main

import "fmt"

func sum(a, b int) int {
        return a + b
}

func main() {
        fmt.Println("Hello KubeMSB Sum: ", sum(1, 2))
}
在 fmt.Println("Sum: ", sum(1, 2))中添加 Hello KubeMSB
~~~

~~~powershell
[root@gitlab tekton-kubemsb-demo]# git add .
[root@gitlab tekton-kubemsb-demo]# git commit -m "add hello kubemsb"
[root@gitlab tekton-kubemsb-demo]# git push -u origin master
~~~

## 8.2 查看k8s集群中资源创建情况

~~~powershell
查看taskrun对应的pod
# kubectl get pods -l triggers.tekton.dev/eventlistener=gitlab-listener
NAME                   READY   STATUS      RESTARTS   AGE
gitlab-run-8mb96-pod   0/2     Completed   0          62s
~~~

~~~powershell
查看是否生成taskrun
# kubectl get taskrun -l triggers.tekton.dev/eventlistener=gitlab-listener
NAME               SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
gitlab-run-8mb96   True        Succeeded   103s        90s

~~~

~~~powershell
查看taskrun日志
# tkn taskrun logs gitlab-run-8mb96
[git-source-source-qn4l5] {"level":"info","ts":1641361951.6502163,"caller":"git/git.go:176","msg":"Successfully cloned http://192.168.10.250/root/tekton-kubemsb-demo.git @ 5e1e3a1d0f167b9b639df5b802a0f0f81064d21e (grafted, HEAD) in path /workspace/source"}
[git-source-source-qn4l5] {"level":"info","ts":1641361951.6840498,"caller":"git/git.go:215","msg":"Successfully initialized and updated submodules in path /workspace/source"}

[show-path] total 24
[show-path] drwxr-xr-x 5 root root  138 Jan  5 05:52 .
[show-path] drwxrwxrwx 3 root root   20 Jan  5 05:52 ..
[show-path] drwxr-xr-x 8 root root  177 Jan  5 05:52 .git
[show-path] -rw-r--r-- 1 root root  283 Jan  5 05:52 .gitignore
[show-path] -rw-r--r-- 1 root root  115 Jan  5 05:52 Dockerfile
[show-path] -rw-r--r-- 1 root root  378 Jan  5 05:52 README.md
[show-path] drwxr-xr-x 2 root root   48 Jan  5 05:52 install
[show-path] -rw-r--r-- 1 root root  119 Jan  5 05:52 main.go
[show-path] -rw-r--r-- 1 root root  169 Jan  5 05:52 main_test.go
[show-path] drwxr-xr-x 2 root root 4096 Jan  5 05:52 manifests

~~~

到这里我们就完成了通过 GitLab 的 Push 事件来触发 Tekton 的一个任务。

![image-20220105135729328](/云原生/serverless/serverless-18-gitlab-触发-tekton-任务构建/image-20220105135729328.png)

