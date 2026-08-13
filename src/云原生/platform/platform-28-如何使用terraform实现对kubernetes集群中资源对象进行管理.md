---
title: 如何使用terraform实现对kubernetes集群中资源对象进行管理？
sidebarGroup: 平台与实战
shortTitle: 28 如何使用terraform实现对kubernet
order: 28
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 多集群
  - 云原生
  - 课程笔记
description: 如何使用terraform实现对kubernetes集群中资源对象进行管理？ 一、terraform是什么 Terraform 是一个开源的基础设施即代码（Infrastructure as Code...
---

> **多集群 · 第 1 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何使用terraform实现对kubernetes集群中资源对象进行管理？

# 一、terraform是什么

Terraform 是一个开源的基础设施即代码（Infrastructure as Code）工具，可以帮助用户自动化创建、变更和管理基础架构资源。使用 Terraform，用户可以通过编写简单的声明式语言来描述他们需要的基础架构资源，然后 Terraform 会自动完成创建、更新和删除等操作，从而简化了基础架构管理的过程。

Terraform 支持多种基础架构提供商，例如 Amazon Web Services（AWS）、Microsoft Azure、Google Cloud Platform（GCP）、OpenStack、VMware 等，以及多种基础架构资源，例如虚拟机、网络、存储、负载均衡、数据库等。用户可以在一个 Terraform 配置文件中定义他们需要的资源，然后使用 Terraform 命令行工具来执行这些操作。

**Terraform 的主要优点包括：**

- 简化基础架构管理 - 使用 Terraform，用户可以通过编写简单的配置文件来管理基础架构资源，从而简化了基础架构管理的过程。
- 自动化基础架构 - 使用 Terraform，用户可以自动化创建、更新和删除基础架构资源，从而提高了生产力和效率。
- 可重复性 - 使用 Terraform，用户可以确保基础架构资源的配置是可重复的，从而减少了错误和不一致性。
- 多云支持 - Terraform 支持多种基础架构提供商，从而让用户可以在不同的云环境中使用相同的工具和流程来管理基础架构资源。

记住，Terraform 是一个功能强大的基础设施即代码工具，可以帮助你自动化创建、变更和管理基础架构资源，从而提高生产力和效率。

**Terraform可以对Kubernetes做什么**

- 在 Kubernetes 上部署应用程序 - Terraform 可以使用 Kubernetes provider 来定义和管理 Kubernetes 资源，例如部署、服务和 Ingress 等，从而轻松在 Kubernetes 上部署应用程序。
- 管理 Kubernetes 集群 - Terraform 可以使用 Kubernetes provider 管理 Kubernetes 集群中的节点、命名空间、角色和权限等资源，从而简化集群管理任务。
- 在 Kubernetes 上管理持久化存储 - Terraform 可以使用 Kubernetes provider 管理 Kubernetes 中的存储类、卷和 PVC 等资源，从而简化在 Kubernetes 上管理持久化存储的任务。
- 在 Kubernetes 上管理网络 - Terraform 可以使用 Kubernetes provider 管理 Kubernetes 中的网络策略、服务负载均衡和 Ingress 等资源，从而简化在 Kubernetes 上管理网络的任务。
- 在 Kubernetes 上管理配置 - Terraform 可以使用 Kubernetes provider 管理 Kubernetes 中的 ConfigMap 和 Secret 等资源，从而简化在 Kubernetes 上管理配置的任务。

综上所述，Terraform 和 Kubernetes 可以结合使用来简化在 Kubernetes 上管理应用程序和基础架构的任务，并提高生产力和效率。

# 二、terraform安装

~~~powershell
# wget https://releases.hashicorp.com/terraform/1.7.5/terraform_1.7.5_linux_amd64.zip
~~~

~~~powershell
# unzip terraform_1.7.5_linux_amd64.zip
~~~

~~~powershell
# mv terraform /usr/local/bin/
~~~

~~~powershell
# terraform --version
~~~

# 三、安装terraform-provider-kubernetes插件

`terraform-provider-kubernetes` 是 Terraform 的一个官方提供者（provider）插件，它的主要作用是允许 Terraform 管理和部署到 Kubernetes 集群中的资源。通过这个提供者，用户可以使用 Terraform 的声明性语法来定义、预览和修改 Kubernetes 中的各种资源，如 Pods、Deployments、Services 等，实现基础设施即代码（Infrastructure as Code, IaC）的方法来管理 Kubernetes 集群。

以下是 `terraform-provider-kubernetes` 主要功能的概览：

### 1. 资源管理

它使得在 Kubernetes 集群中创建、更新、删除和管理资源变得自动化和可重复。这些资源包括但不限于：

- Deployments
- Pods
- Services
- Ingresses
- ConfigMaps
- PersistentVolumeClaims
- 等等

### 2. 配置的声明性和版本控制

通过将 Kubernetes 资源配置存储在 Terraform 配置文件中，`terraform-provider-kubernetes` 允许这些配置的版本控制、审计和复用。这符合基础设施即代码的最佳实践，使团队能够更有效地协作和管理集群配置。

### 3. 集群状态的同步与管理

`terraform-provider-kubernetes` 通过 Terraform 状态文件跟踪管理的资源的状态，帮助确保实际集群状态与 Terraform 配置定义的期望状态同步。如果集群的实际状态偏离了 Terraform 配置的定义，Terraform 可以帮助识别这些差异并采取措施以恢复期望的状态。

### 4. 跨多个环境的资源部署

使用 Terraform 和 `terraform-provider-kubernetes`，可以轻松地将同一套资源定义应用到不同的环境中（如开发、测试和生产环境），只需少量的配置更改。这简化了跨多个环境的资源部署和管理。

### 5. 集成其他 Terraform 提供者

`terraform-provider-kubernetes` 可以与 Terraform 生态系统中的其它提供者（如 `terraform-provider-aws`、`terraform-provider-google` 等）结合使用，实现跨云提供商的资源管理和自动化部署，为用户提供一个统一的、自动化的基础设施管理方案。

总之，`terraform-provider-kubernetes` 提供了一个强大的、自动化的方法来管理 Kubernetes 集群和资源，它通过 Terraform 扩展了基础设施即代码的概念到 Kubernetes 领域。

~~~powershell
# mkdir -p /root/terraformdir
~~~

~~~powershell
# cd /root/terraformdir
~~~

~~~powershell
# mkdir -p ./.terraform.d/plugins
~~~

~~~powershell
# wget https://github.com/hashicorp/terraform-provider-kubernetes/archive/refs/tags/v2.27.0.zip
~~~

~~~powershell
# unzip v2.27.0.zip -d ./.terraform.d/plugins
~~~

~~~powershell
# ls .terraform.d/plugins/terraform-provider-kubernetes-2.27.0/
~~~

# 四、编写terraform配置文件

~~~powershell
# vim main.tf

# cat main.tf
provider "kubernetes" {
  host = "https://192.168.10.140:6443"
  config_path = "~/.kube/config"
}

resource "kubernetes_deployment" "example" {
  metadata {
    name = "example"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "example"
      }
    }

    template {
      metadata {
        labels = {
          app = "example"
        }
      }

      spec {
        container {
          image = "nginx:latest"
          name  = "nginx"
        }
      }
    }
  }
}
~~~

~~~powershell
说明：
这个文件是一个 Terraform 配置文件，用于声明在 Kubernetes 集群中创建资源的意图。Terraform 是一个开源的基础设施即代码（Infrastructure as Code, IaC）工具，它允许你使用高级配置语言来定义和管理云服务和其他资源。以下是该配置文件各部分的详细解释：

### Provider 配置

provider "kubernetes" {
  host = "https://192.168.10.140:6443"
  config_path = "~/.kube/config"
}

- `provider "kubernetes"`: 这行指定 Terraform 使用的是 Kubernetes 提供器（provider）。Terraform 提供器是一种插件，用于与外部系统交互。
- `host = "https://192.168.10.160:6443"`: 这行指定了 Kubernetes 集群的 API 服务器地址。在这个例子中，API 服务器在本地网络的 `192.168.10.160` IP 地址上，端口为 `6443`（Kubernetes API 服务器的默认端口）。
- `config_path = "~/.kube/config"`: 这行指定了 kubeconfig 文件的路径，这是 Kubernetes CLI 工具 `kubectl` 用于存储关于集群、用户、命名空间和认证信息的配置文件。Terraform 会使用这个文件中的信息来连接到 Kubernetes 集群。

### 资源配置

resource "kubernetes_deployment" "example" {
  ...
}

这部分定义了一个 Kubernetes 部署资源。

- `resource "kubernetes_deployment" "example"`: `resource` 关键字用于声明资源，`"kubernetes_deployment"` 指定资源类型为 Kubernetes 部署，而 `"example"` 是此资源的名称（在 Terraform 配置中唯一）。
  
以下是部署资源的具体配置：

#### 元数据

metadata {
  name = "example"
}

- `metadata`: 用于定义部署的元数据。
- `name = "example"`: 指定部署的名称为 `"example"`。

#### 规格（Spec）

spec {
  replicas = 3

  selector {
    match_labels = {
      app = "example"
    }
  }

  ...
}

- `replicas = 3`: 定义了部署应该保持的副本数量，即运行三个 Pod 实例。
- `selector`: 用于指定 Pod 选择器，确保部署只管理与这些标签匹配的 Pod。
  - `match_labels = {app = "example"}`: 部署将管理标签为 `app=example` 的 Pod。

#### 模板

template {
  metadata {
    labels = {
      app = "example"
    }
  }

  spec {
    container {
      image = "nginx:latest"
      name  = "nginx"
    }
  }
}

- `template`: 定义用于创建 Pod 的模板。
  - `metadata`: 模板的元数据。
    - `labels = {app = "example"}`: 定义 Pod 的标签，这些标签使得部署的选择器能够匹配到这些 Pod。
  - `spec`: 模板的规格，描述了 Pod 中容器的配置。
    - `container`: 定义容器的详细信息。
      - `image = "nginx:latest"`: 指定容器使用的镜像，这里是使用最新版本的 nginx 镜像。
      - `name  = "nginx"`: 容器的名称。

总的来说，这个配置文件使用 Terraform 定义了一个 Kubernetes 部署，该部署将创建三个含有 nginx 容器的 Pod，这些 Pod 的标签为 `app=example`。通过这种方式，你可以以声明性和版本控制的方式管理 Kubernetes 集群资源。
~~~

# 五、通过terraform对kubernetes集群中资源对象进行创建

当你第一次使用 Terraform 管理特定的基础设施（如在一个全新的目录中编写 Terraform 配置文件）时，需要执行 `terraform init` 和 `terraform apply` 命令，这两个命令各自承担着重要的初始化和应用配置的角色。以下是每个命令的详细解释和它们为什么是必要的：

### 1. `terraform init`

`terraform init` 命令用于初始化一个 Terraform 工作目录，这个过程包括几个关键步骤：

- **下载和安装 Provider 插件**：Terraform 配置中声明的每个 provider（如 `kubernetes`、`aws`、`google` 等）都需要特定的插件才能正常工作。`terraform init` 会根据配置文件中指定的 providers 和它们的版本，从 Terraform Registry 或其他配置的源下载并安装这些插件。
  
- **初始化后端存储**：Terraform 使用后端存储来保存状态文件。状态文件记录了 Terraform 管理的基础设施的当前状态。对于使用远程状态存储的配置（如 AWS S3、Terraform Cloud），`terraform init` 会初始化这些后端存储的连接和配置。
  
- **模块下载**：如果 Terraform 配置使用了模块（module），那么 `terraform init` 也会负责下载这些模块的代码，通常是从 Git 仓库或 Terraform Registry 获取。

执行 `terraform init` 是准备 Terraform 配置的必要步骤，没有它，Terraform 无法执行任何其他操作，因为它不会有执行配置所需的插件、模块和后端存储的初始化。

### 2. `terraform apply`

`terraform apply` 命令则是用于应用 Terraform 配置文件中定义的基础设施更改。在你执行了 `terraform init` 并编写好 Terraform 配置文件后，通过运行 `terraform apply`，Terraform 会执行以下操作：

- **生成执行计划**：Terraform 首先生成一个执行计划，这个计划显示了将要对基础设施执行的具体操作（创建、更新、删除资源等）。这一步提供了一个更改的预览，让用户有机会在应用任何更改之前进行审查。
  
- **请求批准**：默认情况下，Terraform 会在应用更改之前等待用户的批准。只有接收到用户的确认后，Terraform 才会继续执行更改。
  
- **应用更改**：得到用户确认后，Terraform 根据执行计划对基础设施进行更改。这包括调用相应的 provider 插件来创建、更新或删除资源。

通过这个过程，`terraform apply` 实际上将配置中定义的基础设施状态同步到云提供商或其他管理的服务中。

总结，`terraform init` 和 `terraform apply` 是 Terraform 工作流中两个基础且关键的步骤，分别负责初始化工作环境和应用配置更改，它们是部署和管理基础设施的必要步骤。

~~~powershell
# terraform init
~~~

~~~powershell
# terraform apply
~~~

# 六、查看kubernetes集群资源对象

~~~powershell
# kubectl get deployment -n default
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
example   3/3     3            3           32m
~~~

~~~powershell
# kubectl get pods -n default
NAME                       READY   STATUS    RESTARTS   AGE
example-7447d4956b-8s9rf   1/1     Running   0          32m
example-7447d4956b-rd2lk   1/1     Running   0          32m
example-7447d4956b-xsvn4   1/1     Running   0          32m
~~~

# 七、通过terraform删除kubernetes集群资源对象

~~~powershell
# vim main.tf

# cat main.tf
provider "kubernetes" {
  host = "https://192.168.10.140:6443"
  config_path = "~/.kube/config"
}
删除下面的部分或使用/*.....*/对管理的资源部分进行注释。
~~~

~~~powershell
# # terraform state rm kubernetes_deployment.example
Removed kubernetes_deployment.example
Successfully removed 1 resource instance(s).

删除的文件内容：
# vim terraform.tfstate
~~~

~~~powershell
# terraform plan

这将显示 Terraform 打算进行的更改，包括哪些资源将被删除。这一步不会实际修改任何资源，但提供了一个更改的预览，让你可以确认即将进行的操作。
~~~

~~~powershell
# terraform apply

Terraform 将执行计划中的操作，包括删除那些不再存在于配置文件中的资源。
~~~

# 八、扩展：通过terraform创建kubernetes集群其它资源对象

> 在k8s集群中已经部署负载均衡器metallb及服务代理ingress nginx的情况下，创建如下资源对象。

~~~powershell
resource "kubernetes_service" "example" {
  metadata {
    name = "example-service"
  }
  spec {
    selector = {
      app = "example"
    }
    type = "LoadBalancer"
    port {
      port        = 80
      target_port = 80
    }
    # 假设 MetalLB 已配置，这里指定 loadBalancerIP 范围中的一个 IP 地址
    # load_balancer_ip = "192.168.10.240"
  }
}

resource "kubernetes_ingress_v1" "example" {
  metadata {
    name = "example-ingress"
  }：q
  spec {
    ingress_class_name = "nginx"
    rule {
      http {
        path {
          backend {
            service {
              name = kubernetes_service.example.metadata.0.name
              port {
                number = 80
              }
            }
          }
          path     = "/"
          path_type = "Prefix"
        }
      }
    }
  }
}
~~~

~~~powershell
provider "kubernetes" {
  host       = "https://192.168.10.140:6443"
  config_path = "~/.kube/config"
}

resource "kubernetes_deployment" "example" {
  metadata {
    name = "example"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "example"
      }
    }

    template {
      metadata {
        labels = {
          app = "example"
        }
      }

      spec {
        container {
          image = "nginx:latest"
          name  = "nginx"
        }
      }
    }
  }
}

resource "kubernetes_service" "example" {
  metadata {
    name = "example-service"
  }
  spec {
    selector = {
      app = "example"
    }
    type = "LoadBalancer"
    port {
      port        = 80
      target_port = 80
    }
    # 假设 MetalLB 已配置，这里指定 loadBalancerIP 范围中的一个 IP 地址
    # load_balancer_ip = "192.168.10.240"
  }
}

resource "kubernetes_ingress_v1" "example" {
  metadata {
    name = "example-ingress"
  }
  spec {
    ingress_class_name = "nginx"
    rule {
      host = "example.com" # 将此处的 example.com 替换为您的域名
      http {
        path {
          backend {
            service {
              name = kubernetes_service.example.metadata.0.name
              port {
                number = 80
              }
            }
          }
          path     = "/"
          path_type = "Prefix"
        }
      }
    }
  }
}
~~~

~~~powershell
# terraform plan
~~~

~~~powershell
# terraform apply
~~~

# 九、应用升级

要通过 Terraform 对 Kubernetes 集群中的资源对象进行版本升级，您通常需要更新资源定义中的相应属性，例如更改 Deployment 中容器的镜像版本。以下是基于您提供的代码的一个示例，展示如何将 `nginx` 容器的镜像从 `nginx:1.19` 升级到特定版本，比如 `nginx:latest`。

首先，找到 `kubernetes_deployment` 资源定义中指定容器镜像的部分：

```powershell
spec {
  container {
    image = "nginx:1.19"
    name  = "nginx"
  }
}
```

然后，将 `image` 属性的值从 `nginx:latest` 更改为目标版本，例如 `nginx:latest：

```powershell
spec {
  container {
    image = "nginx:latest"
    name  = "nginx"
  }
}
```

完整的 `kubernetes_deployment` 资源定义将如下所示，注意只有 `image` 属性值发生了变化：

```powershell
resource "kubernetes_deployment" "example" {
  metadata {
    name = "example"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "example"
      }
    }

    template {
      metadata {
        labels = {
          app = "example"
        }
      }

      spec {
        container {
          image = "nginx:latest"  // 镜像版本已更新
          name  = "nginx"
        }
      }
    }
  }
}
```

完成修改后，执行以下 Terraform 命令来应用更改：

1. **`terraform plan`**：运行此命令预览将要进行的更改。它会显示 Terraform 计划升级容器镜像的操作。
   
2. **`terraform apply`**：在确认计划的更改无误后，运行此命令实际应用更改。Terraform 将自动处理 Deployment 的更新过程，确保新版本的容器镜像被部署。

通过这种方式，您可以利用 Terraform 管理 Kubernetes 资源的版本升级，无论是更新容器镜像、升级配置还是调整资源规格。这种声明性的方法使得基础设施的版本管理变得更加直观和可追踪。

# 十、多集群部署方案

要使用 Terraform 将 Kubernetes 资源对象部署到不同的 Kubernetes 集群中，你有几个选项可以实现这一需求。主要思路是为每个 Kubernetes 集群使用不同的 provider 配置。下面是一些常见的方法：

### 方法 1: 使用多个 Provider 配置

您可以在同一个 `main.tf` 文件中定义多个 Kubernetes provider 实例，每个实例指向不同的集群。使用 `alias` 属性为每个 provider 实例设置一个唯一的名称，然后在资源定义中通过 `provider` 属性指定使用哪个 provider 实例。

```powershell
provider "kubernetes" {
  host       = "https://192.168.10.140:6443"
  config_path = "~/.kube/config"
  # 默认的 provider 实例
}

provider "kubernetes" {
  alias      = "cluster1"
  host       = "https://cluster1.example.com"
  config_path = "~/.kube/cluster1-config"
  # 第一个额外的 Kubernetes 集群
}

provider "kubernetes" {
  alias      = "cluster2"
  host       = "https://cluster2.example.com"
  config_path = "~/.kube/cluster2-config"
  # 第二个额外的 Kubernetes 集群
}

resource "kubernetes_deployment" "example_cluster1" {
  provider = kubernetes.cluster1
  # 资源配置...
}

resource "kubernetes_deployment" "example_cluster2" {
  provider = kubernetes.cluster2
  # 资源配置...
}
```

### 方法 2: 使用多个配置文件

如果您希望为每个集群使用不同的配置文件（例如 `cluster1.tf`，`cluster2.tf`），您可以创建多个 `.tf` 文件，每个文件中配置一个集群的资源。使用这种方法时，您可以简单地将所有 `.tf` 文件放在同一个目录中，Terraform 会自动加载该目录下的所有 `.tf` 文件。

然而，Terraform 不支持在命令行中直接指定 `.tf` 文件，它总是处理当前目录下的所有 `.tf` 文件。如果需要分别应用不同文件，您可以将文件放在不同的目录中，并在每个目录中分别运行 `terraform apply`。

### 方法 3: 使用工作区（Workspaces）

Terraform 工作区允许您在同一套配置文件中管理多套资源实例。您可以为每个 Kubernetes 集群创建一个单独的工作区，然后在相应的工作区中应用配置。

```powershell
terraform workspace new cluster1
terraform workspace new cluster2
```

切换到特定工作区来部署到对应的集群：

```powershell
terraform workspace select cluster1
terraform apply

terraform workspace select cluster2
terraform apply
```

在使用工作区时，你可以在配置中使用 `${terraform.workspace}` 来动态地根据工作区名称改变资源的配置。

### 案例

~~~powershell
# cat main.tf
provider "kubernetes" {
  alias      = "cluster-1"
  host = "https://192.168.10.140:6443"
  config_path = "/root/terraformdir/cluster1.config"
}
provider "kubernetes" {
  alias      = "cluster-2"
  host = "https://192.168.10.160:6443"
  config_path = "/root/terraformdir/cluster2.config"
}

resource "kubernetes_deployment" "example-cluster-1" {
  provider = kubernetes.cluster-1
  metadata {
    name = "example"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "example"
      }
    }

    template {
      metadata {
        labels = {
          app = "example"
        }
      }

      spec {
        container {
          image = "nginx:1.18.0"
          name  = "nginx"
        }
      }
    }
  }
}
resource "kubernetes_deployment" "example-cluster-2" {
  provider = kubernetes.cluster-2
  metadata {
    name = "example"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "example"
      }
    }

    template {
      metadata {
        labels = {
          app = "example"
        }
      }

      spec {
        container {
          image = "nginx:1.19.0"
          name  = "nginx"
        }
      }
    }
  }
}
~~~

~~~powershell
# terraform plan
~~~

~~~powershell
# terraform apply
~~~

### 总结

每种方法都有其适用场景。选择哪种方法取决于你的具体需求、项目结构和对环境隔离的偏好。使用多个 provider 实例或多个配置文件更适合于结构和配置差异较大的集群，而工作区则适用于配置相似但需要隔离管理的场景。

