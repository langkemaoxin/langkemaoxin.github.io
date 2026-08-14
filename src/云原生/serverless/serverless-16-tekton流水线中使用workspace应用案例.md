---
title: Tekton流水线中使用WorkSpace应用案例
sidebarGroup: Serverless
shortTitle: 16 Tekton流水线中使用WorkSpace应...
order: 16
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Serverless
  - 云原生
  - 课程笔记
description: Tekton流水线中使用WorkSpace应用案例 一、应用场景介绍 在实际工作中，我们经常需要的一个功能是能够在任务之间共享制品，以便缓存构建工具（比如 Maven 和 NPM）的依赖项，在 Tek...
---

> **Serverless · 第 16 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# Tekton流水线中使用WorkSpace应用案例

# 一、应用场景介绍

在实际工作中，我们经常需要的一个功能是能够在任务之间共享制品，以便缓存构建工具（比如 Maven 和 NPM）的依赖项，在 Tekton 0.10 版本就发布增加了对 Workspaces 的支持，这使得流水线中的任务可以更加轻松地使用 PV 来共享数据了，Workspaces 允许指定一个或多个 pipeline 中 task 运行时需要的 volume。

Tekton Pipelines 中的 Workspaces 是指流水线运行时需要的共享卷的声明，在流水线定义中，Workspaces 可以作为共享卷传递给相关任务，这样当为多个任务提供相同的 Workspaces 的时候，它们就可以从相同的 Volumes 中读取和写入数据。当然 Workspaces 的 Volumes 卷除了可以是 PVC，也可以是 ConfigMap，或者是在任务之间挂载和共享的 Secret 资源。

![image-20220105000613905](/云原生/serverless/serverless-16-tekton流水线中使用workspace应用案例/image-20220105000613905.png)

# 二、资源准备

## 2.1 存储动态供给

~~~powershell
# kubectl get storageclass
NAME                  PROVISIONER      RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
managed-nfs-storage   fuseim.pri/ifs   Delete          Immediate           false                  31s
~~~

## 2.2 项目源代码

>http://192.168.10.250/root/spring-petclinic

![image-20220114105751314](/云原生/serverless/serverless-16-tekton流水线中使用workspace应用案例/image-20220114105751314.png)

# 三、创建任务及流水线资源清单文件

接下来让我们看看在实践中如何使用 Workspaces 来缓存 Maven 依赖，加速流水线的构建?

要在流水线中构建 Maven 项目，当然需要定义一个 Maven 的 Task 任务，在 Tekton Catalog 里面就已经包含了这样的通用的 Task 了，这里我们需要对其进行一些修改来为 Maven 的依赖项添加 Workspaces 支持。

~~~powershell
# vim workspace-mvn-task.yaml
# cat workspace-mvn-task.yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: mvn-task
spec:
  workspaces:
  - name: maven-repo
  resources:
    inputs:
    - name: source
      type: git
  params:
  - name: GOALS
    description: The Maven goals to run
    type: array
    default: ["package"]
  steps:
    - name: mvn
      image: www.kubemsb.com/tekton/cloud-builders-mvn:tekton
      workingDir: /workspace/source
      command: ["/usr/bin/mvn"]
      args:
        - -Dmaven.repo.local=$(workspaces.maven-repo.path)
        - "$(inputs.params.GOALS)"
~~~

上面的任务中我们新增了一个名为 `maven-repo` 的 Workspace，该工作区规定无论何时运行该任务，都应该提供并配置一个卷来充当本地的 Maven 存储库，然后将工作区的路径传递给 Maven 命令，以便通过 `-Dmaven.repo.local=$(workspaces.maven-repo.path)` 命令将工作区的路径作为本地的 Maven 库，当然也可以配置 Workspace 挂载的路径，这里我们使用的是默认的路径。

接着我们来定义一个使用 Maven 任务构建 Java 应用程序的流水线 Pipeline，为了演示 Maven 依赖的缓存效果，这里的流水线我们运行3个 Maven 任务来执行构建、集成测试，并生成测试结果和代码覆盖率等报告。

![image-20220105000937635](/云原生/serverless/serverless-16-tekton流水线中使用workspace应用案例/image-20220105000937635.png)

流水线定义如下所示：

~~~powershell
# vim workspace-mvn-pipeline.yaml
# cat workspace-mvn-pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: mvn-pipeline
spec:
  workspaces:  # 声明 workspaces
  - name: local-maven-repo
  resources: # 声明使用的资源
  - name: app-git
    type: git
  tasks:
  - name: build  # 构建任务
    taskRef:
      name: mvn-task  # 引用上面的 mvn 任务
    resources:  # 传递 resources 资源
      inputs:
      - name: source
        resource: app-git
    params:  # 传递 params 参数
    - name: GOALS
      value: ["package"]
    workspaces:  # 传递 workspaces
    - name: maven-repo
      workspace: local-maven-repo
  - name: int-test  # 测试任务
    taskRef:
      name: mvn-task
    runAfter: ["build"]  # 需要 build 任务执行完成后
    resources:
      inputs:
      - name: source
        resource: app-git
    params:
    - name: GOALS
      value: ["verify"]
    workspaces:
    - name: maven-repo
      workspace: local-maven-repo
  - name: gen-report  # 测试报告
    taskRef:
      name: mvn-task
    runAfter: ["build"]  # 需要 build 任务执行完成后
    resources:
      inputs:
      - name: source
        resource: app-git
    params:
    - name: GOALS
      value: ["site"]
    workspaces:
    - name: maven-repo
      workspace: local-maven-repo
~~~

需要注意流水线中的 `local-maven-repo` 工作区的声明，它指出当此流水线运行时，应提供一个卷并将其用作此工作区，然后将此工作区提供给此流水线中的每个任务，以便它们都共享相同的工作区。然后我们根据传入的 `GOALS` 参数来决定应该执行的任务。

流水线 Pipeline 声明完成后，现在我们就可以运行这个流水线来构建 `Spring PetClinic` 这个示例应用了，在启动流水线之前，需要先创建一个 PVC 来提供一个 Workspace 对 Maven 依赖项进行缓存。

~~~powershell
# vim workspace-mvn-pv.yaml
# cat workspace-mvn-pv.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mvn-repo-pvc
spec:
  resources:
    requests:
      storage: 5Gi
  volumeMode: Filesystem
  storageClassName: managed-nfs-storage  # 使用 StorageClass 自动生成 PV
  accessModes:
    - ReadWriteOnce
~~~

这里我们使用了一个名为 `managed-nfs-storage` 的 StorageClass，这样就可以自动生成一个对应的 PV 进行绑定，如果你没有需要自行创建一个对应的静态 PV。

现在我们就可以创建一个使用上述 PVC 作为流水线工作区的 PipelineRun 来执行流水线了：

~~~powershell
# vim workspace-mvn-pipelinerun.yaml
# cat workspace-mvn-pipelinerun.yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: mvn-pipelinerun
spec:
  pipelineRef:
    name: mvn-pipeline
  resources:
  - name: app-git
    resourceSpec:
      type: git
      params:
        - name: url
          value: http://192.168.10.250/root/spring-petclinic
  workspaces:
  - name: local-maven-repo
    persistentVolumeClaim:
      claimName: mvn-repo-pvc
~~~

请注意 PVC 和为缓存 maven 依赖项而声明的工作区之间的映射，`mvn-repo-pvc` 被传递到流水线和相应的任务作为缓存文件和制品的共享卷。

第一次流水线运行将需要一些时间来下载依赖项执行任务，直接创建上面声明的几个资源对象，观察 PipelineRun 的执行过程：

~~~powershell
# kubectl apply -f workspace-mvn-task.yaml
~~~

~~~powershell
# kubectl apply -f workspace-mvn-pipeline.yaml
~~~

~~~powershell
# kubectl apply -f workspace-mvn-pv.yaml
~~~

~~~powershell
# kubectl apply -f workspace-mvn-pipelinerun.yaml
~~~

![image-20220105002223935](/云原生/serverless/serverless-16-tekton流水线中使用workspace应用案例/image-20220105002223935.png)

![image-20220105002249186](/云原生/serverless/serverless-16-tekton流水线中使用workspace应用案例/image-20220105002249186.png)

当第一次执行流水线的时候会在执行 `mvn` 命令的时候消耗大量的时间，因为需要下载依赖包.

查看存储卷使用情况：

![image-20220105002845253](/云原生/serverless/serverless-16-tekton流水线中使用workspace应用案例/image-20220105002845253.png)

然后在执行后面的两个任务的时候就非常快了，因为前面任务执行完成后会把依赖项存入到 Workspace 声明的 PVC 中去，后面的任务直接使用了这个 Workspace，我们可以重新执行一次 PipelineRun，对比下前后两次的时间。

~~~powershell
# tkn pr list
NAME                       STARTED          DURATION     STATUS
mvn-pipelinerun            28 minutes ago   ---          Running
~~~

~~~powershell
# tkn pr describe mvn-pipelinerun
Name:              mvn-pipelinerun
Namespace:         default
Pipeline Ref:      mvn-pipeline
Service Account:   default
Timeout:           1h0m0s
Labels:
 tekton.dev/pipeline=mvn-pipeline

🌡️  Status

STARTED          DURATION   STATUS
28 minutes ago   ---        Running

📦 Resources

 NAME        RESOURCE REF
 ∙ app-git

⚓ Params

 No params

📝 Results

 No results

📂 Workspaces

 NAME                 SUB PATH   WORKSPACE BINDING
 ∙ local-maven-repo   ---        PersistentVolumeClaim (claimName=mvn-repo-pvc)

🗂  Taskruns

 NAME                      TASK NAME   STARTED          DURATION   STATUS
 ∙ mvn-pipelinerun-build   build       28 minutes ago   ---        Running

⏭️  Skipped Tasks

 No Skipped Tasks
~~~

![image-20220105072817861](/云原生/serverless/serverless-16-tekton流水线中使用workspace应用案例/image-20220105072817861.png)

测试任务运行没有受到太大影响，因为它使用了大部分在构建任务运行中下载的依赖项，即使在第一次流水线运行中也是如此。

![image-20220105080533149](/云原生/serverless/serverless-16-tekton流水线中使用workspace应用案例/image-20220105080533149.png)

我们可以看到利用 Workspaces 功能可以对我们的流水线构建进行大幅度的优化，特别是对于依赖包特别大的应用，比如 Maven、NPM、Go Modules 等。

