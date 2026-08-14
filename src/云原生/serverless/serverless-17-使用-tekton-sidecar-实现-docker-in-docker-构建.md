---
title: 使用 Tekton Sidecar 实现 Docker IN Docker 构建
sidebarGroup: Serverless
shortTitle: 17 使用 Tekton Sidecar 实现 D...
order: 17
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: 使用 Tekton SideCar 实现 Docker IN Docker 构建容器镜像 一、Tekton SideCar介绍 在 Tekton 中有一项 Sidecar 功能，和 Pod 中的 Si...
---

> **Serverless · 第 17 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 使用 Tekton SideCar 实现 Docker IN Docker 构建容器镜像

# 一、Tekton SideCar介绍

在 Tekton 中有一项 Sidecar 功能，和 Pod 中的 Sidecar 类似，它也是一个容器，用于和 Task 任务的 Steps 中指定的容器一起运行，为这些 Steps 的执行提供一些辅助支持，比如 Sidecar 可以运行一个 `logging daemon`、更新共享 volume 上的文件或者提供网络代理等功能。

Tekton 会将 Sidecar 注入属于 TaskRun 的 Pod，一旦 Task 中的所有 Steps 完成执行，Pod 内运行的每一个 Sidecar 就会终止掉，如果 Sidecar 成功退出，`kubectl get pods` 命令会将 Pod 的状态返回为 `Completed`，如果 Sidecar 退出时出现了错误，则返回 `Error`，而忽略实际执行 Pod 内部 Steps 的容器镜像的退出码值。

# 二、Tekton SideCar应用场景

前面我们在构建容器镜像的时候是通过挂载宿主机的 `docker.sock` 文件到容器中来执行的，严格意义上来说这种方式叫 `Dood - Docker Outside of Docker`，`DooD` 通过绑定安装 Docker 套接字来使用其底层宿主机的 Docker Daemon， `DinD-Docker in Docker` ,`DinD`是在其中包含一个完整的 Docker 服务。

通过对比，显然 `DooD` 这种方式更快，因为可以利用它的缓存机制，而 `DinD` 显然更加安全、更加干净，对宿主机产生的影响更小，而且支持并行运行，因为每个容器里面都是一个独立的 Docker Daemon，互相不受影响，当然 `DooD` 更加简单易用。

这里我们就来使用 Sidecar 的方式为 Tekton 中的容器构建提供一个 `DinD` 模式的构建服务。

# 三、预备资源

## 3.1 准备容器镜像资源

~~~powershell
# vim dind-pipelineresource.yaml
# cat dind-pipelineresource.yaml
apiVersion: tekton.dev/v1alpha1
kind: PipelineResource
metadata:
  name: demo-git
  namespace: default
spec:
  params:
    - name: url
      value: 'http://192.168.10.250/root/tekton-kubemsb-demo'
    - name: revision
      value: master
  type: git
~~~

## 3.2 准备容器镜像仓库认证资源

~~~powershell
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

~~~powershell
# cat sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: build-sa
secrets:
  - name: harbor-auth
~~~

## 3.3 准备基于时间戳生成容器镜像Tag task

~~~powershell
# cat generate-build-id.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: generate-build-id
spec:
  description: >-
    Given a base version, this task generates a unique build id by appending
    the base-version to the current timestamp.
  params:
    - name: base-version
      description: Base product version
      type: string
      default: "1.0"
  results:
    - name: timestamp
      description: Current timestamp
    - name: build-id
      description: ID of the current build
  steps:
    - name: get-timestamp
      image: bash:5.0.18
      script: |
        #!/usr/bin/env bash
        ts=`date "+%Y%m%d-%H%M%S"`
        echo "Current Timestamp: ${ts}"
        echo ${ts} | tr -d "\n" | tee $(results.timestamp.path)
    - name: get-buildid
      image: bash:5.0.18
      script: |
        #!/usr/bin/env bash
        ts=`cat $(results.timestamp.path)`
        buildId=$(inputs.params.base-version)-${ts}
        echo ${buildId} | tr -d "\n" | tee $(results.build-id.path)
~~~

# 四、容器镜像构建task及流水线

下面的 Task 最重要的就是其中的 `sidecars` 部分，使用了一个 `docker:dind` 镜像来提供 docker 服务端，由于是 sidecar 模式，所以它和上面构建的 steps 中的容器是共享 network namespace 的，所以在构建的时候我们可以通过 `tcp://localhost:2376` 和 docker 服务端进行通信，由于还使用的是 TLS 证书模式，所以需要将证书目录进行声明挂载。

## 4.1 创建构建Docker镜像task

> 新建一个如下所示的 Task 任务，专门用来构建 Docker 镜像

~~~powershell
# vim task-docker-build.yaml
# cat task-docker-build.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: docker-build-push
spec:
  resources:
    inputs: # 定义输入资源
    - name: source  # 源代码仓库
      type: git
  params:
  - name: image
    description: Reference of the image docker will produce.
  - name: builder_image
    description: The location of the docker builder image.
    default: docker:stable
  - name: dockerfile
    description: Path to the Dockerfile to build.
    default: ./Dockerfile
  - name: context
    description: Path to the directory to use as context.
    default: .
  - name: build_extra_args
    description: Extra parameters passed for the build command when building images.
    default: ""
  - name: push_extra_args
    description: Extra parameters passed for the push command when pushing images.
    default: ""
  - name: insecure_registry
    description: Allows the user to push to an insecure registry that has been specified
    default: ""
  - name: registry_mirror
    description: Specific the docker registry mirror
    default: ""
  - name: registry_url
    description: private docker images registry url
  steps:
  - name: docker-build  # 构建步骤
    image: $(params.builder_image)
    env:
    - name: DOCKER_HOST  # 用 TLS 形式通过 TCP 连接 sidecar
      value: tcp://localhost:2376
    - name: DOCKER_TLS_VERIFY  # 校验 TLS
      value: '1'
    - name: DOCKER_CERT_PATH  # 使用 sidecar 守护进程生成的证书
      value: /certs/client
    workingDir: $(resources.inputs.source.path)
    script: |  # docker 构建命令
      docker login $(params.registry_url)
      docker build \
        $(params.build_extra_args) \
        --no-cache \
        -f $(params.dockerfile) -t $(params.image) $(params.context)
    volumeMounts:  # 声明挂载证书目录
      - mountPath: /certs/client
        name: dind-certs
  - name: docker-push
    image: $(params.builder_image)
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2376
    - name: DOCKER_TLS_VERIFY
      value: '1'
    - name: DOCKER_CERT_PATH
      value: /certs/client
    workingDir: $(resources.inputs.source.path)
    script: |  # 推送 docker 镜像
      docker push $(params.push_extra_args) $(params.image)
    volumeMounts:
      - mountPath: /certs/client
        name: dind-certs
  sidecars:  # sidecar 模式，提供 docker daemon服务，实现真正的 DinD 模式
  - image: docker:dind
    name: server
    args:
      - --storage-driver=vfs
      - --userland-proxy=false
      - --debug
      - --insecure-registry=$(params.insecure_registry)
      - --registry-mirror=$(params.registry_mirror)
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR  # 将生成的证书写入与客户端共享的路径
      value: /certs
    volumeMounts:
    - mountPath: /certs/client
      name: dind-certs
    readinessProbe:  # 等待 dind daemon 生成它与客户端共享的证书
      periodSeconds: 1
      exec:
        command: ['ls', '/certs/client/ca.pem']
  volumes:  # 使用 emptyDir 的形式即可
  - name: dind-certs
    emptyDir: {}
~~~

## 4.2  创建引用task的Pipeline 流水线

>这里的流水线最重要的就是将镜像构建的任务替换成上面的 `docker-build-push` 这个 Task，然后传入几个需要的参数

~~~powershell
# vim dind-task-pipeline.yaml
# cat dind-task-pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: test-sidecar-pipeline
spec:
  resources:  # 为 Tasks 提供输入和输出资源声明
    - name: demo-git
      type: git
  params:
  - name: image
    type: string
  - name: image-tag
    type: string
    default: "v0.3.0"
  - name: registry_url
    type: string
    default: "www.kubemsb.com"
  - name: registry_mirror
    type: string
    default: "https://s27w6kze.mirror.aliyuncs.com"
  - name: insecure_registry
    type: string
    default: "www.kubemsb.com"
  tasks:  # 添加task到流水线中
    - name: get-build-id
      taskRef:
        name: generate-build-id
      params:
      - name: base-version
        value: $(params.image-tag)
    # 构建并推送 Docker 镜像
    - name: build-and-push
      taskRef:
        name: docker-build-push  # 使用上面定义的镜像构建任务
      resources:
        inputs:
        - name: source  # 指定输入的git仓库资源
          resource: demo-git
      params:
      - name: image
        value: "$(params.image):$(tasks.get-build-id.results.build-id)"
      - name: registry_url
        value: $(params.registry_url)
      - name: insecure_registry
        value: $(params.insecure_registry)
      - name: registry_mirror
        value: $(params.registry_mirror)
~~~

## 4.3 创建引用Pipeline的PipelineRun

~~~powershell
# vim dind-task-pipelinerun.yaml
# cat dind-task-pipelinerun.yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: test-sidecar-pipelinerun
spec:
  serviceAccountName: build-sa
  pipelineRef:
    name: test-sidecar-pipeline
  resources:
  - name: demo-git  # 指定输入的git仓库资源
    resourceRef:
      name: demo-git
  params:
  - name: image
    value: www.kubemsb.com/test/tekton-demo
~~~

## 4.4 应用上述资源清单文件

~~~powershell
# kubectl apply -f task-docker-build.yaml
task.tekton.dev/docker-build-push created
~~~

~~~powershell
# kubectl apply -f dind-task-pipeline.yaml
pipeline.tekton.dev/test-sidecar-pipeline created
~~~

~~~powershell
# kubectl apply -f dind-task-pipelinerun.yaml
pipelinerun.tekton.dev/test-sidecar-pipelinerun created
~~~

![image-20220105091845767](/云原生/serverless/serverless-17-使用-tekton-sidecar-实现-docker-in-docker-构建/image-20220105091845767.png)

最终在 Harbor 中也可以看到我们刚刚推送的镜像版本：

![image-20220105092010804](/云原生/serverless/serverless-17-使用-tekton-sidecar-实现-docker-in-docker-构建/image-20220105092010804.png)

这种方式还可以避免在宿主机上产生大量无用的构建过程产生的镜像，因为每次构建完成就销毁掉了，这才是真正的 `Docker IN Docker`，也是 Tekton 中的 Sidecar 的一个使用场景。

