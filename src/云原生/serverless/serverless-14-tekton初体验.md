---
title: Tekton初体验
sidebarGroup: Serverless
shortTitle: 14 Tekton初体验
order: 14
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: Tekton应用初体验 一、Tekton介绍 1.1 Tekton由来 - Tekton 是一款功能非常强大而灵活的 CI/CD 开源的云原生框架。 - Tekton 的前身是 Knative 项目的...
---

> **Serverless · 第 14 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Tekton应用初体验

# 一、Tekton介绍

## 1.1 Tekton由来

- Tekton 是一款功能非常强大而灵活的 CI/CD 开源的云原生框架。
- Tekton 的前身是 Knative 项目的 build-pipeline 项目，这个项目是为了给 build 模块增加 pipeline 的功能，但是随着不同的功能加入到 Knative build 模块中，build 模块越来越变得像一个通用的 CI/CD 系统，于是，索性将 build-pipeline 剥离出 Knative，就变成了现在的 Tekton，而 Tekton 也从此致力于提供全功能、标准化的云原生 CI/CD 解决方案。

## 1.2 Tekton 为 CI/CD 系统提供了诸多好处

- 可定制：Tekton 是完全可定制的，具有高度的灵活性，我们可以定义非常详细的构建块目录，供开发人员在各种场景中使用。
- 可重复使用：Tekton 是完全可移植的，任何人都可以使用给定的流水线并重用其构建块，可以使得开发人员无需"造轮子"就可以快速构建复杂的流水线。
- 可扩展：`Tekton Catalog` 是社区驱动的 Tekton 构建块存储库，我们可以使用 `Tekton Catalog` 中定义的组件快速创建新的流水线并扩展现有管道。
- 标准化：Tekton 在你的 Kubernetes 集群上作为扩展安装和运行，并使用完善的 Kubernetes 资源模型，Tekton 工作负载在 Kubernetes Pod 内执行。
- 伸缩性：要增加工作负载容量，只需添加新的节点到集群即可，Tekton 可随集群扩展，无需重新定义资源分配或对管道进行任何其他修改。

# 二、组件介绍

Tekton 由一些列组件组成：

- `Tekton Pipelines` 是 Tekton 的基础，它定义了一组 Kubernetes CRD 作为构建块，我们可以使用这些对象来组装 CI/CD 流水线。
- `Tekton Triggers` 允许我们根据事件来实例化流水线，例如，可以我们在每次将 PR 合并到 GitHub 仓库的时候触发流水线实例和构建工作。
- `Tekton CLI` 提供了一个名为 `tkn` 的命令行界面，它构建在 Kubernetes CLI 之上，运行和 Tekton 进行交互。
- `Tekton Dashboard` 是 `Tekton Pipelines` 的基于 Web 的一个图形界面，可以看到线上有关流水线执行的相关信息。
- `Tekton Catalog` 是一个由社区贡献的高质量 Tekton 构建块（任务、流水线等）存储库，可以直接在我们自己的流水线中使用这些构建块。
- `Tekton Hub` 是一个用于访问 `Tekton Catalog` 的 Web 图形界面工具。
- `Tekton Operator` 是一个 Kubernetes Operator，可以让我们在 Kubernetes 集群上安装、更新、删除 Tekton 项目。

# 三、组件安装

## 3.1 安装tekton pipeline

安装 Tekton 非常简单，可以直接通过 tektoncd/pipeline 的 GitHub 仓库中的 `release.yaml` 文件进行安装,

安装参考链接：https://tekton.dev/docs/pipelines/install/#installing-tekton-pipelines-on-kubernetes

如下所示的命令：

~~~powershell
#  kubectl apply --filename https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml
~~~

上面的资源清单文件安装后，会创建一个名为 `tekton-pipelines` 的命名空间，在该命名空间下面会有大量和 tekton 相关的资源对象，我们可以通过在该命名空间中查看 Pod 并确保它们处于 Running 状态来检查安装是否成功：

~~~powershell
# kubectl get pods -n tekton-pipelines
NAME                                                 READY   STATUS    RESTARTS   AGE
tekton-pipelines-controller-99b764966-84ggp          1/1     Running   1          29h
tekton-pipelines-webhook-55c9dd7446-t44sh            1/1     Running   1          29h
~~~

Tekton 安装完成后，我们还可以选择是否安装 CLI 工具，有时候可能 Tekton 提供的命令行工具比 kubectl 管理这些资源更加方便

## 3.2 tkn安装

网址：https://tekton.dev/docs/cli/

![image-20220113140722628](/云原生/serverless/serverless-14-tekton初体验/image-20220113140722628.png)

~~~powershell
查看本地RPM包
# ls
tektoncd-cli-0.21.0_Linux-64bit.rpm
~~~

~~~powershell
安装
# yum -y install tektoncd-cli-0.21.0_Linux-64bit.rpm
~~~

~~~powershell
使用验证
# tkn version
Client version: 0.21.0
Pipeline version: v0.31.0
~~~

## 3.3 tekton dashboard安装

还可以安装一个 Tekton 提供的一个 Dashboard，我们可以通过 Dashboard 查看 Tekton 整个任务的构建过程

网址：https://tekton.dev/docs/dashboard/

执行下面的命令直接安装：

~~~powershell
# wget https://github.com/tektoncd/dashboard/releases/latest/download/tekton-dashboard-release.yaml
~~~

~~~powershell
# vim tekton-dashboard-release.yaml
......
apiVersion: v1
kind: Service
metadata:
  labels:
    app: tekton-dashboard
    app.kubernetes.io/component: dashboard
    app.kubernetes.io/instance: default
    app.kubernetes.io/name: dashboard
    app.kubernetes.io/part-of: tekton-dashboard
    app.kubernetes.io/version: v0.23.0
    dashboard.tekton.dev/release: v0.23.0
    version: v0.23.0
  name: tekton-dashboard
  namespace: tekton-pipelines
spec:
  type: NodePort 添加此行内容
  ports:
    - name: http
      port: 9097
      protocol: TCP
      targetPort: 9097
      nodePort: 32097 添加此行内容
......
~~~

~~~powershell
# kubectl apply -f  tekton-dashboard-release.yaml
~~~

~~~powershell
# tkn version
Client version: 0.21.0
Pipeline version: v0.31.0
Dashboard version: v0.23.0
~~~

![image-20220104190450003](/云原生/serverless/serverless-14-tekton初体验/image-20220104190450003.png)

# 四、概念回顾

Tekton 为 Kubernetes 提供了多种 CRD 资源对象，可用于定义流水线。

![image-20220104190521371](/云原生/serverless/serverless-14-tekton初体验/image-20220104190521371.png)

主要有以下几个资源对象：

- Task：表示执行命令的一系列有序的步骤，task 里可以定义一系列的 steps，例如编译代码、构建镜像、推送镜像等，每个 step 实际由一个 Pod 执行。
- TaskRun：Task 只是定义了一个模版，TaskRun 才真正代表了一次实际的运行，当然你也可以自己手动创建一个 TaskRun，TaskRun 创建出来之后，就会自动触发 Task 描述的构建任务。
- Pipeline：一组有序的 Task，既是一个或多个 Task、PipelineResource 以及各种定义参数的集合。Pipeline 中的 Task 可以使用之前执行过的 Task 的输出作为它的输入。
- PipelineRun：类似 Task 和 TaskRun 的关系，`PipelineRun` 也表示某一次实际运行的 pipeline，下发一个 PipelineRun CRD 实例到 Kubernetes 后，同样也会触发一次 pipeline 的构建。
- ClusterTask：覆盖整个集群的任务，而不是单一的某一个命名空间，这是和 Task 最大的区别，其他基本上一致的。
- PipelineResource：表示 pipeline 输入资源，比如 github 上的源码，或者 pipeline 输出资源，例如一个容器镜像或者构建生成的 jar 包等。

每个任务都在自己的 Kubernetes Pod 中执行，因此，默认情况下，管道内的任务不共享数据。要在 Tasks 之间共享数据，你必须明确配置每个 Task 以使其输出可用于下一个 Task 并获取先前执行的 Task 的输出作为其输入。

![image-20220114001749785](/云原生/serverless/serverless-14-tekton初体验/image-20220114001749785.png)

# 五、tekton应用案例

在这里我们使用一个简单的 Golang 应用，可以在仓库http://192.168.10.250/root/tekton-kubemsb-demo.git下面获取应用程序代码，测试以及 Dockerfile 文件。

## 5.1 clone应用程序代码案例

首先第一个任务就是 Clone 应用程序代码进行测试，要创建一个 Task 任务，就需要使用到 Kubernetes 中定义的 Task 这个 CRD 对象，这里我们创建一个如下所示的资源文件，内容如下所示：

~~~powershell
# vim task.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: test
spec:
  resources:
    inputs:
      - name: repo
        type: git
  steps:
    - name: run-test
      image: golang:1.14-alpine
      workingDir: /workspace/repo
      command: ['go']
      args: ['test']
~~~

其中 `resources` 定义了我们的任务中定义的 Step 所需的输入内容，这里我们的步骤需要 Clone 一个 Git 仓库作为 `go test` 命令的输入，目前支持 git、pullRequest、image、cluster、storage、cloudevent 等资源。

Tekton 内置的 git 资源类型，它会自动将代码仓库 Clone 到 `/workspace/$input_name` 目录中，由于我们这里输入被命名成 repo，所以代码会被 Clone 到 `/workspace/repo` 目录下面。

然后下面的 `steps` 就是来定义执行运行测试命令的步骤，这里我们直接在代码的根目录中运行 `go test` 命令即可，需要注意的是命令和参数需要分别定义。

定义完成后直接使用 kubectl 创建该任务：

~~~powershell
# kubectl apply -f task-test.yaml
~~~

现在我们定义完成了一个新建的 Task 任务，但是该任务并不会立即执行，我们必须创建一个 `TaskRun` 引用它并提供所有必需输入的数据才行。当然我们也可以直接使用 `tkn` 命令来启动这个 Task 任务，我们可以通过如下所示的命令来获取启动 Task 所需的资源对象：

~~~powershell
# tkn task start test --dry-run
no pipeline resource of type "git" found in namespace: default
Please create a new "git" resource for pipeline resource "repo"
?Enter a name for a pipeline resource : demo-git 自定义
? Enter a value for url :  http://192.168.10.250/root/tekton-kubemsb-demo 源码仓库
? Enter a value for revision :  master 分支，回车后自动创建
New git resource "demo-git" has been created
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  creationTimestamp: null
  generateName: test-run-
  namespace: default
spec:
  resources:
    inputs:
    - name: repo
      resourceRef:
        name: demo-git
  serviceAccountName: ""
  taskRef:
    name: test
status:
  podName: ""
~~~

由于我们这里的 Task 任务需要一个 git 代码仓库作为输入，所以需要一个 `PipelineResource` 对象来定义输入信息，上面的命令会自动创建一个名为 `demo-git` 的 `PipelineResource` 资源对象，如下所示：

~~~powershell
# kubectl get pipelineresource
NAME       AGE
demo-git   4m33s
~~~

~~~powershell
# kubectl get pipelineresource demo-git -o yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  creationTimestamp: "2022-01-04T11:50:39Z"
  generation: 1
  name: demo-git
  namespace: default
  resourceVersion: "1387185"
  uid: e00ca136-6a14-4174-8614-4ae9adeaf8c5
spec:
  params:
  - name: url
    value: http://192.168.10.250/root/tekton-kubemsb-demo
  - name: revision
    value: master
  type: git
~~~

当我们不知道如何创建 `PipelineResource` 的时候我们就可以参考上面的方式来创建，当然最后还需要创建 `TaskRun` 对象才可以真正执行这个 Task 任务，上面的 `tkn task start` 命令也为我们打印出对应的 TaskRun 资源，将其内容添加到 `taskrun.yaml` 文件中：

~~~powershell
# taskrun.yaml
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: testrun
spec:
  resources:
    inputs:
      - name: repo
        resourceRef:
          name: demo-git
  taskRef:
    name: test
~~~

这里的 `taskRef` 引用上面定义的 Task 和 git 仓库作为输入，`resourceRef` 也是引用上面定义的 `PipelineResource` 资源对象。现在我们创建这个资源对象过后，就会开始运行了：

~~~powershell
# kubectl apply -f taskrun.yaml
taskrun.tekton.dev/testrun created
~~~

Tekton 现在将开始运行您的 Task, 要查看最后一个 TaskRun 的日志，可以使用以下 `tkn` 命令：

~~~powershell
# tkn taskrun logs --last -f
~~~

此外我们还可以通过查看 TaskRun 资源对象的状态来查看构建状态：

~~~powershell
# kubectl get taskrun
NAME      SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
testrun   True        Succeeded   105s        62s
~~~

~~~powershell
# kubectl get pods
NAME                                                     READY   STATUS      RESTARTS   AGE

testrun-pod                                              0/2     Completed   0          117s
~~~

~~~powershell
# kubectl describe pods testrun-pod

Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  2m39s  default-scheduler  Successfully assigned default/testrun-pod to k8s-worker01
  Normal  Pulled     2m38s  kubelet            Container image "gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/entrypoint:v0.31.0@sha256:97139f59df7c6e2b3d22e75191be653f4202143859d3937e2bafa7a8a7a44822" already present on machine
  Normal  Created    2m38s  kubelet            Created container place-tools
  Normal  Started    2m38s  kubelet            Started container place-tools
  Normal  Pulled     2m37s  kubelet            Container image "gcr.io/distroless/base@sha256:cfdc553400d41b47fd231b028403469811fcdbc0e69d66ea8030c5a0b5fbac2b" already present on machine
  Normal  Created    2m37s  kubelet            Created container working-dir-initializer
  Normal  Started    2m37s  kubelet            Started container working-dir-initializer
  Normal  Pulled     2m36s  kubelet            Container image "gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/git-init:v0.31.0@sha256:86fce1d4245b9d7318e31635e0a310df6a88fe1cfe5d9f37406dde746ac15e1a" already present on machine
  Normal  Created    2m36s  kubelet            Created container step-git-source-repo-jsq78
  Normal  Started    2m36s  kubelet            Started container step-git-source-repo-jsq78
  Normal  Pulling    2m36s  kubelet            Pulling image "golang:1.14-alpine"
  Normal  Pulled     2m4s   kubelet            Successfully pulled image "golang:1.14-alpine" in 32.010343957s
  Normal  Created    2m4s   kubelet            Created container step-run-test
  Normal  Started    2m4s   kubelet            Started container step-run-test

~~~

我们可以通过 `kubectl describe` 命令来查看任务运行的过程，首先会通过 `tekton-git-init` 拉取代码，然后会使用我们定义的 Task 任务中的 Steps 镜像来执行任务。当任务执行完成后， Pod 就会变成 Completed 状态了：

~~~powershell
# kubectl get pods
NAME                                                     READY   STATUS      RESTARTS   AGE
testrun-pod                                              0/2     Completed   0          4m53s
~~~

~~~powershell
# kubectl get taskrun
NAME      SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
testrun   True        Succeeded   5m20s       4m37s
~~~

我们可以查看容器的日志信息来了解任务的执行结果信息：

~~~powershell
# kubectl logs testrun-pod --all-containers
PASS
ok      _/workspace/repo        0.002s
2022/01/04 11:58:29 Copied /ko-app/entrypoint to /tekton/bin/entrypoint
{"level":"info","ts":1641297548.2512565,"caller":"git/git.go:176","msg":"Successfully cloned http://192.168.10.250/root/tekton-kubemsb-demo @ 5e1e3a1d0f167b9b639df5b802a0f0f81064d21e (grafted, HEAD, origin/master) in path /workspace/repo"}
{"level":"info","ts":1641297548.2727892,"caller":"git/git.go:215","msg":"Successfully initialized and updated submodules in path /workspace/repo"}
~~~

我们可以看到我们的测试已经通过了。

## 5.2 Docker Hub 配置

为了能够构建 Docker 镜像，一般来说我们需要使用 Docker 来进行，我们这里是容器，所以可以使用 `Docker In Docker 模式`，这种模式安全性不高，除了这种方式之外，我们还可以使用 Google 推出的 Kaniko 工具来进行构建，该工具可以在 Kubernetes 集群中构建 Docker 镜像而无需依赖 Docker 守护进程，之前我们已经介绍过 kaniko 这种形式，这里我们就介绍 `DIND` 这种模式。

使用 Kaniko 构建镜像和 Docker 命令基本上一致，所以我们可以提前设置下 Docker Hub 的登录凭证，方便后续将镜像推送到镜像仓库。登录凭证可以保存到 Kubernetes 的 Secret 资源对象中，创建一个名为 `harbor-auth.yaml` 的文件，内容如下所示:

~~~powershell
# vim harbor-auth.yaml
# cat harbor-auth.yaml
apiVersion: v1
kind: Secret
metadata:
  name: harbor-auth
  annotations:
    tekton.dev/docker-0: http://www.kubemsb.com
type: kubernetes.io/basic-auth
stringData:
  username: 'admin'
  password: '12345'
~~~

记得将 username 和 password 替换成你的 Harbor 仓库登录凭证。

我们这里在 Secret 对象中添加了一个 `tekton.dev/docker-0` 的 annotation，该注解信息是用来告诉 Tekton 这些认证信息所属的 Docker 镜像仓库。

然后创建一个 ServiceAccount 对象来使用上面的 `harbor-auth` 这个 Secret 对象，创建一个名为 `sa.yaml` 的文件，内容如下所示：

~~~powershell
# vim sa.yaml
# cat sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: build-sa
secrets:
  - name: harbor-auth
~~~

然后直接创建上面两个资源对象即可：

~~~powershell
# kubectl apply -f harbor-auth.yaml
secret/harbor-auth created
# kubectl apply -f sa.yaml
serviceaccount/build-sa created
~~~

创建完成后，我们就可以在运行 Tekton 的任务或者流水线的时候使用上面的 build-sa 这个 `ServiceAccount` 对象来进行 Docker Hub 的登录认证了。

## 5.3 镜像制作与上传案例

### 5.3.1 创建镜像任务

现在我们创建一个 Task 任务来构建并推送 Docker 镜像，我们这里使用的示例应用根目录下面已经包含了一个 `Dockerfile` 文件了，所以我们直接 Clone 代码就可以获得：

~~~powershell
# vim Dockerfile
# cat Dockerfile
FROM golang:1.14-alpine

WORKDIR /go/src/app
COPY . .

RUN go get -d -v ./...
RUN go install -v ./...

CMD ["app"]
~~~

创建一个名为 `task-build-push.yaml` 的文件，文件内容如下所示：

~~~powershell
# vim task-build-push.yaml
# cat task-build-push.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: build-and-push
spec:
  resources:
    inputs: # 定义输入资源
      - name: repo #输入资源，就是github的那个仓库
        type: git
    outputs: # 定义输出资源
      - name: builtImage # 输出镜像名字
        type: image
  params:
    - name: pathToDockerfile #指明 dockerfile 在仓库中的哪个位置
      type: string
      default: /workspace/repo/Dockerfile # repo资源的路径
      description: dockerfile path
    - name: pathToContext #指明 dockerfile 在仓库中的哪个位置
      type: string
      default: /workspace/repo  # repo资源的路径
      description: the build context used by docker daemon
  steps:
    - name: build-and-push
      image: docker:stable
      script: |
        #!/usr/bin/env sh
        docker login www.kubemsb.com
        docker build -t $(resources.outputs.builtImage.url) -f $(params.pathToDockerfile) $(params.pathToContext)
        docker push $(resources.outputs.builtImage.url)  # 这边的参数都是在 input 和 output 中定义的
      volumeMounts:
        - name: dockersock #将docker.sock文件挂载进来，使用宿主机docker daemon 构建镜像
          mountPath: /var/run/docker.sock
  volumes:
    - name: dockersock
      hostPath:
        path: /var/run/docker.sock
~~~

和前面的测试任务类似，这里我们同样将 git 作为输入资源，此外还定义了一个 `dockerfile-path` 的参数，用来指定 Dockerfile 的路径，此外还定义了一个名为 `builtImage` 的镜像输出资源，用来定义 Docker 镜像的相关参数。然后定义了一个名为 build-and-push 的步骤，这里我们使用 `DIND` 的方式，将宿主机的 `/var/run/docker.sock` 文件挂载到 `docker:stable` 的容器中，然后执行 `script` 下面的 Docker 镜像构建推送的操作。同样直接创建上面的资源对象即可：

~~~powershell
# kubectl apply -f task-build-push.yaml
task.tekton.dev/build-and-push created
~~~

创建了 Task 任务过后，要想真正去执行这个任务，需要创建一个对应的 TaskRun 资源对象。

### 5.3.2 执行任务

和前面一样，现在我们来创建一个 TaskRun 对象来触发任务，不同之处在于我们需要指定 Task 时需要的 ServiceAccount 对象。创建一个名为 `taskrun-build-push.yaml` 的文件，内容如下所示：

~~~powershell
# vim taskrun-build-push.yaml
# cat taskrun-build-push.yaml
apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: build-and-push
spec:
  serviceAccountName: build-sa
  taskRef:
    name: build-and-push # 关联定义好的task
  resources:
    inputs:
      - name: repo # 指定输入的仓库资源
        resourceRef:
          name: demo-git
    outputs: # 指定输出的镜像资源
      - name: builtImage
        resourceRef:
          name: harbor-image
~~~

注意这里我们通过 `serviceAccountName` 属性指定了 Docker 认证信息的 `ServiceAccount` 对象，然后通过 `taskRef` 引用我们的任务，以及下面的 `resourceRef` 关联第一部分我们声明的输入资源，此外还需要定义一个关于输出镜像的 `PipelineResource` 资源：

~~~powershell
# vim harbor-image-reg.yaml
# cat harbor-image-reg.yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: harbor-image
spec:
  type: image
  params:
    - name: url
      value: www.kubemsb.com/test/tekton-kubemsb-demo:latest #构建完的镜像名称
~~~

然后直接创建这个资源对象即可：

~~~powershell
# kubectl apply -f harbor-image-reg.yaml
pipelineresource.tekton.dev/harbor-image created
~~~

~~~powershell
# kubectl apply -f taskrun-build-push.yaml
taskrun.tekton.dev/build-and-push created
~~~

创建完成后就会触发任务执行了，我们可以通过查看 Pod 对象状态来了解进度：

~~~powershell
# kubectl get pods
NAME                                                     READY   STATUS      RESTARTS   AGE

build-and-push-pod                                       0/4     Completed   0          52s
~~~

~~~powershell
# kubectl get taskrun
NAME             SUCCEEDED   REASON      STARTTIME   COMPLETIONTIME
build-and-push   True        Succeeded   75s         50s
~~~

我们可以看到 TaskRun 任务已经执行成功了。这个时候其实我们可以在 Harbor 上找到我们的镜像了，当然也可以直接使用这个镜像进行测试：

![image-20220104202139101](/云原生/serverless/serverless-14-tekton初体验/image-20220104202139101.png)

## 5.4 创建流水线运行task

到这里前面我们的两个任务 test 和 build-and-push 都已经完成了，我们还可以创建一个流水线来将这两个任务组织起来，首先运行 test 任务，如果通过了再执行后面的 build-and-push 这个任务。

创建一个名为 `pipeline.yaml` 的文件，内容如下所示：

~~~powershell
# vim pipeline.yaml
# cat pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: test-build-push
spec:
  resources:
    - name: demo-git
      type: git
    - name: harbor-image
      type: image
  tasks:
    - name: test
      taskRef:
        name: test
      resources:
        inputs:
          - name: repo
            resource: demo-git
    - name: build-and-push
      taskRef:
        name: build-and-push
      runAfter:
        - test # test任务执行之后
      resources:
        inputs:
        - name: repo
          resource: demo-git
        outputs:
        - name: builtImage
          resource: harbor-image
~~~

首先我们需要定义流水线需要哪些资源，可以是输入或者输出的资源，在这里我们只有一个输入，那就是命名为 repo 的应用程序源码的 GitHub 仓库。接下来定义任务，每个任务都通过 taskRef 进行引用，并传递任务需要的输入参数。

同样直接创建这个资源对象即可：

~~~powershell
# kubectl apply -f pipeline.yaml
pipeline.tekton.dev/test-build-push created
~~~

前面我们提到过和通过创建 TaskRun 去触发 Task 任务类似，我们可以通过创建一个 `PipelineRun` 对象来运行流水线。这里我们创建一个名为 `pipelinerun.yaml` 的 PipelineRun 对象来运行流水线，文件内容如下所示：

~~~powershell
# vim pipelinerun.yaml
# cat pipelinerun.yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: test-build-push-run
spec:
  serviceAccountName: build-sa
  pipelineRef:
    name: test-build-push
  resources:
    - name: demo-git
      resourceRef:
        name: demo-git
    - name: harbor-image
      resourceRef:
        name: harbor-image
~~~

定义方式和 TaskRun 几乎一样，通过 serviceAccountName 属性指定 ServiceAccount 对象，`pipelineRef` 关联流水线对象。同样直接创建这个资源，创建后就会触发我们的流水线任务了：

~~~powershell
# kubectl apply -f pipelinerun.yaml
pipelinerun.tekton.dev/test-build-push-run created
~~~

![image-20220113212450301](/云原生/serverless/serverless-14-tekton初体验/image-20220113212450301.png)

