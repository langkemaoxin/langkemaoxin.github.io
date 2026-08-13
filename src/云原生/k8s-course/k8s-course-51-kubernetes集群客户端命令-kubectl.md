---
title: "kubernetes集群客户端命令 kubectl"
sidebarGroup: "K8s 课程笔记"
shortTitle: "51 kubernetes集群客户端命令 kube..."
order: 51
date: 2026-08-13
category: "云原生"
tag:
  - "K8s 课程笔记"
  - "云原生"
  - "课程笔记"
description: "kubernetes集群客户端命令 kubectl 一、kubectl命令帮助 集群中的管理操作几乎都可以使用 kubectl 命令完成 powershell [root@k8s-master1 ~]..."
---

> **K8s 课程笔记 · 第 51 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# kubernetes集群客户端命令 kubectl

# 一、kubectl命令帮助

集群中的管理操作几乎都可以使用`kubectl`命令完成

```powershell
[root@k8s-master1 ~]# kubectl -h
```

# 二、kubectl命令说明

![](/云原生/k8s-course/k8s-course-51-kubernetes集群客户端命令-kubectl/kubectl命令帮助1.png)

![](/云原生/k8s-course/k8s-course-51-kubernetes集群客户端命令-kubectl/kubectl命令帮助2.png)

# 三、kubectl命令补全

~~~powershell
yum install -y bash-completion
source /usr/share/bash-completion/bash_completion
source <(kubectl completion bash)
kubectl completion bash > ~/.kube/completion.bash.inc
source '/root/.kube/completion.bash.inc'  
source $HOME/.bash_profile
~~~

