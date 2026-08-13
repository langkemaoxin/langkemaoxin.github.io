---
title: 15.4 prometheus使用的ClusterRole等RBAC对象
sidebarGroup: Prometheus
shortTitle: 23 15.4 prometheus使用的Clus...
order: 23
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - k8s的rbac权限模型 - prometheus使用的ClusterRole - prometheus使用的ClusterRoleBinding - prometheus使用的...'
---

> **Prometheus · 第 23 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- k8s的rbac权限模型
- prometheus使用的ClusterRole
- prometheus使用的ClusterRoleBinding
- prometheus使用的serviceAccount

# rbac

- 基于角色（Role）的访问控制（RBAC）是一种基于组织中用户的角色来调节控制对 计算机或网络资源的访问的方法。

## RBAC API 声明了四种 Kubernetes 对象

- Role
- ClusterRole
- RoleBinding
- ClusterRoleBinding

## 可操作的资源

- Pods
- ConfigMaps
- Deployments
- Nodes
- Secrets
- Namespaces

# Role 与 ClusterRole

- Role 总是用来在某个名字空间 内设置访问权限
- ClusterRole 对象可以授予与 Role 对象相同的权限，但由于它们属于集群范围对象

## 定义 prometheus 使用的clusterRole

### rule 规则

- 规则是一组属于不同 API Group 资源上的一组操作的集合
- 规则可以配置属性如下

#### resources 代表可以操作的资源对象

- 如下面的nodes、endpoints、pods等

```yaml
  resources: # 资源
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
```

### apigroups 代表k8s的api集合

- apiGroups: [""] # 空字符串"" 表明使用 core API group
- 而Deployements属于 apps API Group

#### verbs代表可以执行的动作

- 比如下面的

```yaml
  verbs: ["get", "list", "watch"] 
```

#### nonResourceURLs:

- 在非资源型的URL 对象，如下面的/metrics接口可以执行get操作

```yaml
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
```

#### 完整的prometheus使用的clusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1 # api的version
kind: ClusterRole # 类型
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources: # 资源
  - nodes
  - nodes/metrics  
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"] 
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
```

# RoleBinding 与 ClusterRoleBinding

- 角色绑定将一个角色中定义的各种权限授予一个或者一组用户
- 角色绑定包含了一组相关主体（即 subject, 包括用户 ——User、用户组 ——Group、或者服务账户 ——Service Account）以及对被授予角色的引用。
- 在命名空间中可以通过 RoleBinding 对象授予权限，而集群范围的权限授予则通过 ClusterRoleBinding 对象完成。

## 定义prometheus使用的clusterRoleBinding

### roleRef指定与某 Role 或 ClusterRole 的绑定关系

```yaml
roleRef: # 选择需要绑定的Role
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
```

### Subject：主题，对应在集群中尝试操作的对象，集群中定义了3种类型的主题资源：

- User Account：用户，
- Group：组，这是用来关联多个账户的，集群中有一些默认创建的组，比如cluster-admin
- Service Account：服务帐号，通过Kubernetes API 来管理的一些用户帐号，和 namespace 进行关联的，适用于集群内部运行的应用程序
- 比如下面的 ServiceAccount对象

```yaml
subjects: # 对象
- kind: ServiceAccount
  name: prometheus
  namespace: kube-system
```

### 完整的prometheus使用的ClusterRoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef: # 选择需要绑定的Role
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects: # 对象
- kind: ServiceAccount
  name: prometheus
  namespace: kube-system
```

# 完整的prometheus rbac.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1 # api的version
kind: ClusterRole # 类型
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources: # 资源
  - nodes
  - nodes/proxy
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"] 
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus # 自定义名字
  namespace: kube-system # 命名空间
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef: # 选择需要绑定的Role
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects: # 对象
- kind: ServiceAccount
  name: prometheus
  namespace: kube-system

```

# 将完整的RBAC 配置写入 rbac.yaml中

# 本节重点总结 :

- k8s的rbac权限模型
- prometheus使用的ClusterRole
- prometheus使用的ClusterRoleBinding
- prometheus使用的serviceAccount

