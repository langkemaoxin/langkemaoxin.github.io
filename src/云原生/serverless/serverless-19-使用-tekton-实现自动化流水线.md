---
title: 使用 Tekton 实现自动化流水线
sidebarGroup: Serverless
shortTitle: 19 使用 Tekton 实现自动化流水线
order: 19
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: 使用 Tekton 实现自动化流水线 一、思路介绍及资源准备 1.1 实现思路 使用tekton pipelines发布项目，需要把要整个工作流划分成不同的任务来执行，工作流的阶段可划分为以下几个阶段...
---

> **Serverless · 第 19 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 使用 Tekton 实现自动化流水线

# 一、思路介绍及资源准备

## 1.1 实现思路

使用tekton pipelines发布项目，需要把要整个工作流划分成不同的任务来执行，工作流的阶段可划分为以下几个阶段：`Clone 代码 -> 单元测试 -> 编译打包 -> Docker镜像构建/推送 -> Kubectl 部署服务及回滚`。

在 Tekton 中我们就可以将这些阶段直接转换成 Task 任务，接下来我们就将上面的工作流一步一步来转换成 Tekton 流水线

## 1.2 源码仓库

源代码仓库地址：http://192.168.10.250/root/tekton-pipeline-kubemsb-demo

![image-20220115203517823](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220115203517823.png)

## 1.3 本案例涉及应用环境

- gitlab
  
  - gitlab认证
  
    
  
- harbor

  - harbor认证

    

- ServiceAccount
  
  - 可使用harbor及gitlab

- 存储后端动态供给
  - nfs实现
  - storageclass: managed-nfs-storage

- namespace
  - kubemsb-ops 
  - 注：流水线自动创建

# 二、Clone 代码

## 2.1 实现思路

> Clone 代码在 Tekton 中不需要我们主动定义一个任务，只需要在执行的任务上面指定一个输入的代码资源即可。

虽然我们可以不用单独定义一个 Clone 代码的任务，直接使用 git 类型的输入资源即可，由于这里涉及到的任务较多，而且很多时候都需要先 Clone 代码然后再进行操作，所以最好的方式是将代码 Clone 下来过后通过 Workspace 共享给其他任务，这里我们可以直接使用 Catalog git-clone 来实现这个任务，我们可以根据自己的需求做一些定制。

## 2.2 Clone任务资源清单文件

>对应的 Task 如下所示，一般来说我们只需要提供 output 这个用于持久化代码的 workspace，然后还包括 url 和 revision 这两个参数，其他使用默认的即可。

~~~powershell
# vim task-clone.yaml
# cat task-clone.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: git-clone
spec:
  workspaces:
    - name: output
      description: The git repo will be cloned onto the volume backing this Workspace.
    - name: basic-auth
      optional: true
      description: |
        A Workspace containing a .gitconfig and .git-credentials file. These
        will be copied to the user's home before any git commands are run. Any
        other files in this Workspace are ignored. It is strongly recommended
        to use ssh-directory over basic-auth whenever possible and to bind a
        Secret to this Workspace over other volume types.
  params:
    - name: url
      description: Repository URL to clone from.
      type: string
    - name: revision
      description: Revision to checkout. (branch, tag, sha, ref, etc...)
      type: string
      default: ""
    - name: refspec
      description: Refspec to fetch before checking out revision.
      default: ""
    - name: submodules
      description: Initialize and fetch git submodules.
      type: string
      default: "true"
    - name: depth
      description: Perform a shallow clone, fetching only the most recent N commits.
      type: string
      default: "1"
    - name: sslVerify
      description: Set the `http.sslVerify` global git config. Setting this to `false` is not advised unless you are sure that you trust your git remote.
      type: string
      default: "true"
    - name: subdirectory
      description: Subdirectory inside the `output` Workspace to clone the repo into.
      type: string
      default: ""
    - name: sparseCheckoutDirectories
      description: Define the directory patterns to match or exclude when performing a sparse checkout.
      type: string
      default: ""
    - name: deleteExisting
      description: Clean out the contents of the destination directory if it already exists before cloning.
      type: string
      default: "true"
    - name: verbose
      description: Log the commands that are executed during `git-clone`'s operation.
      type: string
      default: "true"
    - name: gitInitImage
      description: The image providing the git-init binary that this Task runs.
      type: string
      default: "www.kubemsb.com/tekton/tekton-git-init:v0.24.1"
    - name: userHome
      description: |
        Absolute path to the user's home directory. Set this explicitly if you are running the image as a non-root user or have overridden
        the gitInitImage param with an image containing custom user configuration.
      type: string
      default: "/root"
  results:
    - name: commit
      description: The precise commit SHA that was fetched by this Task.
    - name: url
      description: The precise URL that was fetched by this Task.
  steps:
    - name: clone
      image: "$(params.gitInitImage)"
      env:
      - name: HOME
        value: "$(params.userHome)"
      - name: PARAM_URL
        value: $(params.url)
      - name: PARAM_REVISION
        value: $(params.revision)
      - name: PARAM_REFSPEC
        value: $(params.refspec)
      - name: PARAM_SUBMODULES
        value: $(params.submodules)
      - name: PARAM_DEPTH
        value: $(params.depth)
      - name: PARAM_SSL_VERIFY
        value: $(params.sslVerify)
      - name: PARAM_SUBDIRECTORY
        value: $(params.subdirectory)
      - name: PARAM_DELETE_EXISTING
        value: $(params.deleteExisting)
      - name: PARAM_VERBOSE
        value: $(params.verbose)
      - name: PARAM_SPARSE_CHECKOUT_DIRECTORIES
        value: $(params.sparseCheckoutDirectories)
      - name: PARAM_USER_HOME
        value: $(params.userHome)
      - name: WORKSPACE_OUTPUT_PATH
        value: $(workspaces.output.path)
      - name: WORKSPACE_BASIC_AUTH_DIRECTORY_BOUND
        value: $(workspaces.basic-auth.bound)
      - name: WORKSPACE_BASIC_AUTH_DIRECTORY_PATH
        value: $(workspaces.basic-auth.path)
      script: |
        #!/usr/bin/env sh
        set -eu

        if [ "${PARAM_VERBOSE}" = "true" ] ; then
          set -x
        fi

        if [ "${WORKSPACE_BASIC_AUTH_DIRECTORY_BOUND}" = "true" ] ; then
          cp "${WORKSPACE_BASIC_AUTH_DIRECTORY_PATH}/.git-credentials" "${PARAM_USER_HOME}/.git-credentials"
          cp "${WORKSPACE_BASIC_AUTH_DIRECTORY_PATH}/.gitconfig" "${PARAM_USER_HOME}/.gitconfig"
          chmod 400 "${PARAM_USER_HOME}/.git-credentials"
          chmod 400 "${PARAM_USER_HOME}/.gitconfig"
        fi

        CHECKOUT_DIR="${WORKSPACE_OUTPUT_PATH}/${PARAM_SUBDIRECTORY}"

        cleandir() {
          # Delete any existing contents of the repo directory if it exists.
          #
          # We don't just "rm -rf ${CHECKOUT_DIR}" because ${CHECKOUT_DIR} might be "/"
          # or the root of a mounted volume.
          if [ -d "${CHECKOUT_DIR}" ] ; then
            # Delete non-hidden files and directories
            rm -rf "${CHECKOUT_DIR:?}"/*
            # Delete files and directories starting with . but excluding ..
            rm -rf "${CHECKOUT_DIR}"/.[!.]*
            # Delete files and directories starting with .. plus any other character
            rm -rf "${CHECKOUT_DIR}"/..?*
          fi
        }

        if [ "${PARAM_DELETE_EXISTING}" = "true" ] ; then
          cleandir
        fi

        /ko-app/git-init \
          -url="${PARAM_URL}" \
          -revision="${PARAM_REVISION}" \
          -refspec="${PARAM_REFSPEC}" \
          -path="${CHECKOUT_DIR}" \
          -sslVerify="${PARAM_SSL_VERIFY}" \
          -submodules="${PARAM_SUBMODULES}" \
          -depth="${PARAM_DEPTH}" \
          -sparseCheckoutDirectories="${PARAM_SPARSE_CHECKOUT_DIRECTORIES}"
        cd "${CHECKOUT_DIR}"
        RESULT_SHA="$(git rev-parse HEAD)"
        EXIT_CODE="$?"
        if [ "${EXIT_CODE}" != 0 ] ; then
          exit "${EXIT_CODE}"
        fi
        printf "%s" "${RESULT_SHA}" > "$(results.commit.path)"
        printf "%s" "${PARAM_URL}" > "$(results.url.path)"
~~~

# 三、编译打包

## 3.1 编译打包目的

第二个阶段是编译打包阶段，此案例中项目的 Dockerfile 不是使用的多阶段构建，所以需要先用一个任务去将应用编译打包成二进制文件，然后将这个编译过后的文件传递到下一个任务进行镜像构建。

## 3.2 编译打包任务资源清单文件

> 定义一个 workspace 把 clone 任务里面的代码关联起来。

这个构建任务很简单，将需要用到的环境变量直接通过 `env` 注入（也可以直接写入到 `script` 中，或者直接使用 `command` 来执行任务都可以)，然后构建生成的 `app` 这个二进制文件保留在代码根目录，这样也就可以通过 workspace 进行共享了。

~~~powershell
# vim task-build.yaml
# cat task-build.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: build
spec:
  workspaces:
    - name: go-repo
      mountPath: /workspace/repo
  steps:
    - name: build
      image: golang:1.14-alpine
      workingDir: /workspace/repo
      script: |
        go build -v -o app
      env:
        - name: GOPROXY
          value: https://goproxy.cn
        - name: GOOS
          value: linux
        - name: GOARCH
          value: amd64
~~~

# 四、Docker 镜像制作

## 4.1 Dockerfile编写

> Dockerfile在源代码仓库中，直接被Clone下载使用。

直接将编译好的二进制文件拷贝到镜像中即可，通过 Workspace 去获取上一个构建任务的制品

这个任务的重点还是要去声明一个 Workspace，当执行任务的时候要使用和前面构建任务同一个 Workspace，这样就可以获得上面编译成的 `app` 这个二进制文件了。

~~~powershell
# vim Dockerfile
# cat Dockerfile
FROM alpine
WORKDIR /home

# 修改alpine源为阿里云
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories && \
  apk update && \
  apk upgrade && \
  apk add ca-certificates && update-ca-certificates && \
  apk add --update tzdata && \
  rm -rf /var/cache/apk/*

COPY app /home/
ENV TZ=Asia/Shanghai

EXPOSE 8080

ENTRYPOINT ./app
~~~

## 4.2 通过任务构建容器镜像

下面开始构建并推送 Docker 镜像，构建的方法可以使用 Kaniko、DooD、DinD 3种模式，本次直接使用 `DinD` 这种模式，要使用 `DinD` 模式构建镜像，需要用到 sidecar 功能。

创建一个如下所示的任务：

~~~powershell
# vim task-docker.yaml
# cat task-docker.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: docker
spec:
  workspaces:
    - name: go-repo
  params:
    - name: image
      description: Reference of the image docker will produce.
    - name: registry_mirror
      description: Specific the docker registry mirror
      default: ""
    - name: registry_url
      description: private docker images registry url
  steps:
    - name: docker-build # 构建步骤
      image: docker:stable
      env:
        - name: DOCKER_HOST # 用 TLS 形式通过 TCP 链接 sidecar
          value: tcp://localhost:2376
        - name: DOCKER_TLS_VERIFY # 校验 TLS
          value: "1"
        - name: DOCKER_CERT_PATH # 使用 sidecar 守护进程生成的证书
          value: /certs/client
        - name: DOCKER_PASSWORD
          valueFrom:
            secretKeyRef:
              name: harbor-auth
              key: password
        - name: DOCKER_USERNAME
          valueFrom:
            secretKeyRef:
              name: harbor-auth
              key: username
      workingDir: $(workspaces.go-repo.path)
      script: | # docker 构建命令
        docker login $(params.registry_url) -u $DOCKER_USERNAME -p $DOCKER_PASSWORD
        docker build --no-cache -f ./Dockerfile -t $(params.image) .
        docker push $(params.image)
      volumeMounts: # 声明挂载证书目录
        - mountPath: /certs/client
          name: dind-certs
  sidecars: # sidecar 模式，提供 docker daemon服务，实现真正的 DinD 模式
    - image: docker:dind
      name: server
      args:
        - --storage-driver=vfs
        - --userland-proxy=false
        - --debug
        - --insecure-registry=$(params.registry_url)
        - --registry-mirror=$(params.registry_mirror)
      securityContext:
        privileged: true
      env:
        - name: DOCKER_TLS_CERTDIR # 将生成的证书写入与客户端共享的路径
          value: /certs
      volumeMounts:
        - mountPath: /certs/client
          name: dind-certs
      readinessProbe: # 等待 dind daemon 生成它与客户端共享的证书
        periodSeconds: 1
        exec:
          command: ["ls", "/certs/client/ca.pem"]
  volumes: # 使用 emptyDir 的形式即可
    - name: dind-certs
~~~

# 五、部署应用

## 5.1 实现思路

部署阶段，项目中已包含了 Helm Chart 包，所以直接使用 Helm 来部署即可，要实现 Helm 部署，当然我们首先需要一个包含 `helm` 命令的镜像，可以自己去编写一个这样的任务，也可以直接去 `hub.tekton.dev` 上面查找 Catalog，比如 helm-upgrade-from-source 这个 Task 任务就完全可以满足我们的部署需求

![image-20220105162335684](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220105162335684.png)

## 5.2 任务资源清单文件

> Catalog 里面也包含完整的使用文档了，我们可以将该任务直接下载下来根据我们自己的需求做一些定制修改

本案例中因为我们的 Helm Chart 模板就在代码仓库中，所以不需要从 Chart Repo 仓库中获取，只需要指定 Chart 路径即可，其他可配置的参数都通过 `params` 参数暴露出去了，非常灵活，最后我们还可以获取Helm 部署的状态，写入到了 Results 中，方便后续任务处理。

~~~powershell
# vim task-deployment.yaml
# cat task-deployment.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: deploy
spec:
  params:
    - name: charts_dir
      description: The directory in source that contains the helm chart
    - name: release_name
      description: The helm release name
    - name: release_namespace
      description: The helm release namespace
      default: ""
    - name: overwrite_values
      description: "Specify the values you want to overwrite, comma separated: autoscaling.enabled=true,replicas=1"
      default: ""
    - name: values_file
      description: "The values file to be used"
      default: "values.yaml"
    - name: helm_image
      description: "helm image to be used"
      default: "docker.io/lachlanevenson/k8s-helm:v3.3.4@sha256:e1816be207efbd342cba9d3d32202e237e3de20af350617f8507dc033ea66803" #tag: v3.3.4
  workspaces:
    - name: source
  results:
    - name: helm-status
      description: Helm deploy status
  steps:
    - name: upgrade
      image: $(params.helm_image)
      workingDir: /workspace/source
      script: |
        echo current installed helm releases
        helm list --namespace "$(params.release_namespace)"
        echo installing helm chart...
        helm upgrade --install --wait --values "$(params.charts_dir)/$(params.values_file)" --create-namespace --namespace "$(params.release_namespace)" $(params.release_name) $(params.charts_dir) --debug --set "$(params.overwrite_values)"

        status=`helm status $(params.release_name) --namespace "$(params.release_namespace)" | awk '/STATUS/ {print $2}'`
        echo ${status} | tr -d "\n" | tee $(results.helm-status.path)
~~~

# 六、回滚

## 6.1 实现思路

最后应用部署完成后可能还需要回滚，因为可能部署的应用有错误，当然这个回滚动作最好是我们自己去触发，但是在某些场景下，比如 helm 部署已经明确失败了，那么就可以自动回滚了，所以需要判断当部署失败的时候执行回滚操作，也就是这个任务并不是一定会发生的，只在某些场景下才会出现，我们可以在流水线中通过使用 `WhenExpressions` 来实现这个功能。要只在满足某些条件时运行任务，可以使用 `when` 字段来保护任务执行，when 字段允许你列出对  `WhenExpressions` 的一系列引用。

`WhenExpressions` 由 `Input`、`Operator` 和 `Values` 几部分组成：

- `Input` 是 `WhenExpressions` 的输入，它可以是一个静态的输入或变量（Params 或 Results），如果未提供输入，则默认为空字符串
- `Operator` 是一个运算符，表示 Input 和 Values 之间的关系，有效的运算符包括 `in`、`notin`
- `Values` 是一个字符串数组，必须提供一个非空的 Values 数组，它同样可以包含静态值或者变量（Params、Results 或者 Workspaces 绑定）

当在一个 Task 任务中配置了 `WhenExpressions`，在执行 Task 之前会评估声明的 `WhenExpressions`，如果结果为 True，则执行任务，如果为 False，则不会执行该任务。

## 6.2 回滚任务资源清单文件

~~~powershell
# vim task-rollback.yaml
# cat task-rollback.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: rollback
spec:
  params:
    - name: release_name
      description: The helm release name
    - name: release_namespace
      description: The helm release namespace
      default: ""
    - name: helm_image
      description: "helm image to be used"
      default: "docker.io/lachlanevenson/k8s-helm:v3.3.4@sha256:e1816be207efbd342cba9d3d32202e237e3de20af350617f8507dc033ea66803" #tag: v3.3.4
  steps:
    - name: rollback
      image: $(params.helm_image)
      script: |
        echo rollback current installed helm releases
        helm rollback $(params.release_name) --namespace $(params.release_namespace)
~~~

# 七、流水线

现在我们的整个工作流任务都已经创建完成了，接下来我们就可以将这些任务全部串联起来组成一个 Pipeline 流水线了，将上面定义的几个 Task 引用到 Pipeline 中来，当然还需要声明 Task 中用到的 resources 或者 workspaces 这些数据。

## 7.1 实现思路

整体流程比较简单，就是在 Pipeline 需要先声明使用到的 Workspace、Resource、Params 这些资源，然后将声明的数据传递到 Task 任务中去，需要注意的是最后一个回滚任务，我们需要根据前面的 `deploy` 任务的结果来判断是否需要执行该任务，所以这里我们使用了 `when` 属性，通过 `$(tasks.deploy.results.helm-status)` 获取部署状态。

## 7.2 pipeline资源清单文件

~~~powershell
# vim pipeline.yaml
# cat pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: pipeline
spec:
  workspaces: # 声明 workspaces
    - name: go-repo-pvc
  params:
    # 定义代码仓库
    - name: git_url
    - name: revision
      type: string
      default: "master"
    # 定义镜像参数
    - name: image
    - name: registry_url
      type: string
      default: "www.kubemsb.com"
    - name: registry_mirror
      type: string
      default: "https://s27w6kze.mirror.aliyuncs.com"
    # 定义 helm charts 参数
    - name: charts_dir
    - name: release_name
    - name: release_namespace
      default: "default"
    - name: overwrite_values
      default: ""
    - name: values_file
      default: "values.yaml"
  tasks: # 添加task到流水线中
    - name: clone
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: go-repo-pvc
      params:
        - name: url
          value: $(params.git_url)
        - name: revision
          value: $(params.revision)
    - name: build # 编译二进制程序
      taskRef:
        name: build
      runAfter: # 测试任务执行之后才执行 build task
        - clone
      workspaces: # 传递 workspaces
        - name: go-repo
          workspace: go-repo-pvc
    - name: docker # 构建并推送 Docker 镜像
      taskRef:
        name: docker
      runAfter:
        - build
      workspaces: # 传递 workspaces
        - name: go-repo
          workspace: go-repo-pvc
      params: # 传递参数
        - name: image
          value: $(params.image)
        - name: registry_url
          value: $(params.registry_url)
        - name: registry_mirror
          value: $(params.registry_mirror)
    - name: deploy # 部署应用
      taskRef:
        name: deploy
      runAfter:
        - docker
      workspaces:
        - name: source
          workspace: go-repo-pvc
      params:
        - name: charts_dir
          value: $(params.charts_dir)
        - name: release_name
          value: $(params.release_name)
        - name: release_namespace
          value: $(params.release_namespace)
        - name: overwrite_values
          value: $(params.overwrite_values)
        - name: values_file
          value: $(params.values_file)
    - name: rollback # 回滚
      taskRef:
        name: rollback
      when:
        - input: "$(tasks.deploy.results.helm-status)"
          operator: in
          values: ["failed"]
      params:
        - name: release_name
          value: $(params.release_name)
        - name: release_namespace
          value: $(params.release_namespace)
~~~

# 八、执行流水线

## 8.1 应用环境资源创建

现在我们就可以来执行下我们的流水线，看是否符合我们自身的要求，首先我们需要先创建关联的其他资源对象，比如 Workspace 对应的 PVC、还有 GitLab、Harbor 的认证信息

~~~powershell
# vim other.yaml
# cat other.yaml
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

---

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

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-build-sa
secrets:
  - name: harbor-auth
  - name: gitlab-auth

---

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tekton-clusterrole-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: tekton-build-sa
  namespace: default

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: go-repo-pvc
spec:
  resources:
    requests:
      storage: 5Gi
  volumeMode: Filesystem
  storageClassName: managed-nfs-storage  # 使用 StorageClass 自动生成 PV
  accessModes:
    - ReadWriteOnce
~~~

这些关联的资源对象创建完成后，还需要为上面的 ServiceAccount 绑定一个权限，因为在 Helm 容器中我们要去操作一些集群资源，必然需要先做权限声明，这里我们可以将 `tekton-build-sa` 绑定到 `edit` 这个 ClusterRole 上去。

## 8.2 PipelineRun

> 创建一个 PipelineRun 资源对象来触发我们的流水线构建

~~~powershell
# vim pipelinerun.yaml
# cat pipelinerun.yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: pipelinerun
spec:
  serviceAccountName: tekton-build-sa
  pipelineRef:
    name: pipeline
  workspaces:
    - name: go-repo-pvc
      persistentVolumeClaim:
        claimName: go-repo-pvc
  params:
    - name: git_url
      value: http://192.168.10.250/root/tekton-pipeline-kubemsb-demo
    - name: image
      value: "www.kubemsb.com/test/tekton-pipeline-kubemsb-demo:v0.1.0"
    - name: charts_dir
      value: "./helm"
    - name: release_name
      value: kubemsb-demo
    - name: release_namespace
      value: "kubemsb-ops"
    - name: overwrite_values
      value: "image.repository=www.kubemsb.com/test/tekton-pipeline-kubemsb-demo,image.tag=v0.1.0"
    - name: values_file
      value: "my-values.yaml"

~~~

## 8.3 应用资源清单文件

~~~powershell
# kubectl apply -f other.yaml
secret/gitlab-auth created
secret/harbor-auth created
serviceaccount/tekton-build-sa created
clusterrolebinding.rbac.authorization.k8s.io/tekton-clusterrole-binding created
persistentvolumeclaim/go-repo-pvc created
# kubectl apply -f pipeline.yaml
pipeline.tekton.dev/pipeline created
# kubectl apply -f task-build.yaml
task.tekton.dev/build created
# kubectl apply -f task-clone.yaml
task.tekton.dev/git-clone created
# kubectl apply -f task-docker.yaml
task.tekton.dev/docker created
# kubectl apply -f task-deployment.yaml
task.tekton.dev/deploy created
# kubectl apply -f task-test.yaml
task.tekton.dev/test configured
# kubectl apply -f task-rollback.yaml
task.tekton.dev/rollback created
~~~

~~~powershell
# kubectl apply -f pipelinerun.yaml
pipelinerun.tekton.dev/pipelinerun created
~~~

## 8.4 查看pipelinerun运行情况

~~~powershell
# tkn pr describe pipelinerun
Name:              pipelinerun
Namespace:         default
Pipeline Ref:      pipeline
Service Account:   tekton-build-sa
Timeout:           1h0m0s
Labels:
 tekton.dev/pipeline=pipeline

🌡️  Status

STARTED          DURATION   STATUS
23 seconds ago   ---        Running

📦 Resources

 No resources

⚓ Params

 NAME                  VALUE
 ∙ git_url             http://gitlab.kubemsb.com/root/devops-demo.git
 ∙ image               www.kubemsb.com/test/devops-demo:v0.1.0
 ∙ charts_dir          ./helm
 ∙ release_name        devops-demo
 ∙ release_namespace   kube-ops
 ∙ overwrite_values    image.repository=www.kubemsb.com/test/devops-demo,image.tag=v0.1.0
 ∙ values_file         my-values.yaml

📝 Results

 No results

📂 Workspaces

 NAME            SUB PATH   WORKSPACE BINDING
 ∙ go-repo-pvc   ---        PersistentVolumeClaim (claimName=go-repo-pvc)

🗂  Taskruns

 NAME                  TASK NAME   STARTED          DURATION    STATUS
 ∙ pipelinerun-clone   clone       23 seconds ago   ---         Running
 ∙ pipelinerun-test    test        23 seconds ago   4 seconds   Succeeded

⏭️  Skipped Tasks

 No Skipped Tasks
~~~

## 8.5 在tekton dashboard中查看运行状态

![image-20220105165247116](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220105165247116.png)

![image-20220106091914601](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220106091914601.png)

## 8.6 查看应用部署情况

~~~powershell
# kubectl get pods -n kube-ops
NAME                           READY   STATUS    RESTARTS   AGE
devops-demo-5b7cd476d5-wwmfz   1/1     Running   0          32m
~~~

## 8.7 在dnsserver中添加域名解析

~~~powershell
[root@dnsserver ~]# cat /var/named/kubemsb.com.zone
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
el      A       192.168.10.203
smart  A       192.168.10.203 添加此行内容
nfsserver       A       192.168.10.249
*.knative       A       192.168.10.200
~~~

## 8.8 在k8s集群中访问验证

~~~powershell
# curl http://smart.kubemsb.com
{"msg":"Hello DevOps On Kubernetes"}
~~~

![image-20220106091811921](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220106091811921.png)

## 8.9 在dashboard中查看rollback

在 Dashboard 上也可以看到可以流水线可以正常执行，由于部署成功了，所以 rollback 回滚的任务也就被忽略了

![image-20220106092016701](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220106092016701.png)

# 九、触发器

## 9.1 部署tekton trigger

整个流水线已经成功执行了，接下来最后一步就是将 Gitlab 和 Tekton 进行对接，也就是通过 Tekton Trigger 来自动触发构建。

~~~powershell
# kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/previous/v0.16.0/release.yaml
~~~

~~~powershell
# kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/previous/v0.16.0/interceptors.yaml
~~~

## 9.2 创建webhook认证secret及RBAC授权

首先添加一个用于 Gitlab Webhook 访问的 Secret Token，同样要将这个 Secret 关联到上面使用的 ServiceAccount 上面去，然后继续添加对应的 RBAC 权限：

~~~powershell
# vim gitlab-webhook-rbac.yaml
# cat gitlab-webhook-rbac.yaml

apiVersion: v1
kind: Secret
metadata:
  name: gitlab-secret
type: Opaque
stringData:
  secretToken: "1234567"

---

apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-build-sa
secrets:
  - name: harbor-auth
  - name: gitlab-auth
  - name: gitlab-secret

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tekton-triggers-gitlab-minimal
rules:
# EventListeners need to be able to fetch all namespaced resources
- apiGroups: ["triggers.tekton.dev"]
  resources: ["eventlisteners", "triggerbindings", "triggertemplates", "triggers"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
# configmaps is needed for updating logging config
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
# Permissions to create resources in associated TriggerTemplates
- apiGroups: ["tekton.dev"]
  resources: ["pipelineruns", "pipelineresources", "taskruns"]
  verbs: ["create"]
- apiGroups: [""]
  resources: ["serviceaccounts"]
  verbs: ["impersonate"]
- apiGroups: ["policy"]
  resources: ["podsecuritypolicies"]
  resourceNames: ["tekton-triggers"]
  verbs: ["use"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-triggers-gitlab-binding
subjects:
- kind: ServiceAccount
  name: tekton-build-sa
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
- apiGroups: ["triggers.tekton.dev"]
  resources: ["clustertriggerbindings", "clusterinterceptors"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tekton-triggers-gitlab-clusterbinding
subjects:
- kind: ServiceAccount
  name: tekton-build-sa
  namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tekton-triggers-gitlab-clusterrole
~~~

## 9.3 创建EventListener(事件监听器)

创建 EventListener 资源对象，用来接收 Gitlab 的 Push Event 事件

~~~powershell
# vim gitlab-listener.yaml
# cat gitlab-listener.yaml
apiVersion: triggers.tekton.dev/v1alpha1
kind: EventListener
metadata:
  name: gitlab-listener  # 该事件监听器会创建一个名为el-gitlab-listener的Service对象
spec:
  serviceAccountName: tekton-build-sa
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
    bindings:  # 定义TriggerBinding，配置参数
    - name: gitrevision
      value: $(body.checkout_sha)
    - name: gitrepositoryurl
      value: $(body.repository.git_http_url)
    template:
      ref: gitlab-template
~~~

## 9.4 创建TriggerTemplate

上面我们通过 TriggerBinding 定义了两个参数 `gitrevision`、`gitrepositoryurl`，这两个参数的值可以通过 Gitlab 发送过来的 POST 请求中获取到数据，然后我们就可以将这两个参数传递到  `TriggerTemplate` 对象中去，这里的模板其实也就是将上面我们定义的 PipelineRun 对象模板化，主要是替换 `git_url` 和镜像 TAG 这两个参数

~~~powershell
# vim gitlab-template.yaml
# cat gitlab-template.yaml
apiVersion: triggers.tekton.dev/v1alpha1
kind: TriggerTemplate
metadata:
  name: gitlab-template
spec:
  params: # 定义参数，和 TriggerBinding 中的保持一致
    - name: gitrevision
    - name: gitrepositoryurl
  resourcetemplates: # 定义资源模板
    - apiVersion: tekton.dev/v1beta1
      kind: PipelineRun # 定义 pipeline 模板
      metadata:
        generateName: gitlab-run- # TaskRun 名称前缀
      spec:
        serviceAccountName: tekton-build-sa
        pipelineRef:
          name: pipeline
        workspaces:
          - name: go-repo-pvc
            persistentVolumeClaim:
              claimName: go-repo-pvc
        params:
          - name: git_url
            value: $(tt.params.gitrepositoryurl)
          - name: image
            value: "www.kubemsb.com/test/tekton-pipeline-kubemsb-demo:$(tt.params.gitrevision)"
          - name: charts_dir
            value: "./helm"
          - name: release_name
            value: kubemsb-demo
          - name: release_namespace
            value: "kubemsb-ops"
          - name: overwrite_values
            value: "image.repository=www.kubemsb.com/test/tekton-pipeline-kubemsb-demo,image.tag=$(tt.params.gitrevision)"
          - name: values_file
            value: "my-values.yaml"
~~~

## 9.5 应用资源清单文件

直接创建上面新建的几个资源对象即可，这会创建一个 eventlistern 服务用来接收 Webhook 请求：

~~~powershell
# kubectl apply -f gitlab-listener.yaml
eventlistener.triggers.tekton.dev/gitlab-listener created
~~~

~~~powershell
# kubectl apply -f gitlab-template.yaml
triggertemplate.triggers.tekton.dev/gitlab-template created
~~~

~~~powershell
# kubectl apply -f gitlab-webhook-rbac.yaml
secret/gitlab-secret created
serviceaccount/tekton-build-sa configured
role.rbac.authorization.k8s.io/tekton-triggers-gitlab-minimal created
rolebinding.rbac.authorization.k8s.io/tekton-triggers-gitlab-binding created
clusterrole.rbac.authorization.k8s.io/tekton-triggers-gitlab-clusterrole created
clusterrolebinding.rbac.authorization.k8s.io/tekton-triggers-gitlab-clusterbinding created
~~~

## 9.6 创建EventListener ingress对象

>为了能够让集群外gitlab访问至集群内eventlistener，需要把eventlistener通过ingress暴露在集群外。

~~~powershell
查看已创建的eventlistener
# kubectl get eventlistener
NAME              ADDRESS                                                    AVAILABLE   REASON                     READY   REASON
gitlab-listener   http://el-gitlab-listener.default.svc.cluster.local:8080   True        MinimumReplicasAvailable   True
~~~

~~~powershell
查看svc
# kubectl get svc
NAME                                      TYPE           CLUSTER-IP       EXTERNAL-IP                                            PORT(S)                                      AGE
el-gitlab-listener                        ClusterIP      10.103.43.240    <none>                                                 8080/TCP,9000/TCP                            3m11s

~~~

~~~powershell
# vim ingress-el.yaml
# cat ingress-el.yaml
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
# kubectl apply -f ingress-el.yaml
ingress.networking.k8s.io/ingress created
~~~

~~~powershell
# kubectl get ingress
NAME      CLASS    HOSTS            ADDRESS   PORTS   AGE
ingress   <none>   el.kubemsb.com             80      51s
~~~

~~~powershell
[root@dnsserver ~]# cat /var/named/kubemsb.com.zone
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
el      A       192.168.10.203 添加此行内容
smart  A       192.168.10.203
nfsserver       A       192.168.10.249
*.knative       A       192.168.10.200
~~~

# 十、GitLab WebHook实现

## 10.1 gitlab仓库实现webhook配置

![image-20220115223908484](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220115223908484.png)

![image-20220115231115344](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220115231115344.png)

![image-20220106100255282](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220106100255282.png)

![image-20220106100343419](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220106100343419.png)

![image-20220106100316025](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220106100316025.png)

## 10.2 修改本地代码上传至gitlab仓库

> 触发器和监听器配置好了，接下来去修改下项目代码，然后提交代码，正常提交过后就会在集群中创建一个 PipelinRun 对象用来执行流水线

~~~powershell
# vim main.go
# cat main.go
package main

import (
  "net/http"

  "github.com/gin-gonic/gin"
  "github.com/sirupsen/logrus"
)

func main() {
  r := gin.Default()

  r.GET("/", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H {
      "msg": "Hello KUBEMSB!!!",   修改此处
    })
  })

  r.GET("/health", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H {
      "health": true,
    })
  })

  if err := r.Run(":8080"); err != nil {
    logrus.WithError(err).Fatal("Couldn't listen")
  }

}

~~~

~~~powershell
在项目目录中提交代码
# git add .
# git commit -m "history"
# git push -u origin --all
~~~

## 10.3 在tekton dashboard中查看执行情况

![image-20220106101227986](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220106101227986.png)

![image-20220116110752480](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220116110752480.png)

![image-20220106101609592](/云原生/serverless/serverless-19-使用-tekton-实现自动化流水线/image-20220106101609592.png)

~~~powershell
# curl http://smart.kubemsb.com
{"msg":"Hello KUBEMSB!!!"}
~~~

可以看到流水线执行成功后，应用已经成功部署了我们新提交的代码，到这里我们就完成了使用 Tekton 来实现项目发布自动化流水线。

