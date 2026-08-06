---
title: "学习HAMi的路线图"
sidebarGroup: "HAMi"
shortTitle: "HAMi 学习路线"
order: 2
date: 2026-04-15
category: "笔记"
tag:
  - "HAMi"
---


学习 HAMi 需要掌握一套完整的技术栈，从容器和 Kubernetes 基础，到底层的 CUDA 编程。我把这些技术分成了四个层级，你可以按顺序来学习：

```mermaid
flowchart TD
    subgraph L1[“第一层：基础环境”]
        A1[“Docker<br>容器化基础”]
        A2[“Kubernetes<br>编排与调度”]
        A3[“NVIDIA Drivers<br>GPU驱动栈”]
    end
    
    subgraph L2[“第二层：K8s扩展机制”]
        B1[“Device Plugin<br>设备发现与注册”]
        B2[“Scheduler Extender<br>自定义调度”]
        B3[“Mutating Webhook<br>动态修改Pod”]
    end
    
    subgraph L3[“第三层：核心技术”]
        C1[“CUDA Runtime/Driver API<br>GPU编程基础”]
        C2[“LD_PRELOAD<br>库劫持技术”]
        C3[“系统编程 (C/Go)<br>性能与并发”]
    end
    
    subgraph L4[“第四层：进阶扩展”]
        D1[“Prometheus<br>监控指标采集”]
        D2[“DRA<br>动态资源分配”]
        D3[“国产芯片<br>寒武纪/昇腾适配”]
    end
    
    L1 --> L2 --> L3 --> L4
```

---

## 📦 第一层：基础环境

这些是使用 HAMi 的**前置条件**，也是你首先要掌握的内容。

| 技术 | 学习重点 | 与 HAMi 的关系 |
|------|----------|----------------|
| **Docker** | 镜像构建、容器运行、Volume挂载、环境变量 | HAMi 通过 LD_PRELOAD 注入 libvgpu.so，需要理解容器的库加载机制  |
| **Kubernetes** | Pod、Deployment、Resource Limits、Node Affinity、Helm | HAMi 以 K8s 扩展组件形式运行，通过 `nvidia.com/gpu` 等资源字段进行调度  |
| **NVIDIA 驱动栈** | nvidia-smi、CUDA驱动、nvidia-container-toolkit | HAMi-core 劫持 CUDA API 调用，需要理解 GPU 驱动与运行时的关系  |

**前置要求速查**（来自 HAMi 官方文档）：
- Kubernetes ≥ 1.16
- NVIDIA drivers ≥ 440
- glibc ≥ 2.17
- Helm ≥ 3.0

---

## 🔧 第二层：K8s 扩展机制

HAMi 充分利用了 Kubernetes 的扩展能力，理解这些机制是看懂代码的关键。

| 技术 | 作用 | 在 HAMi 中的实现 |
|------|------|------------------|
| **Device Plugin** | 向 Kubelet 注册节点上的设备资源（如 `nvidia.com/gpu`） | `nvidia-device-plugin` 组件，负责 GPU 发现和注册  |
| **Scheduler Extender** | 干预 K8s 默认调度器的决策过程 | `hami-scheduler` 组件，根据设备拓扑、binpack/spread 策略分配 GPU  |
| **Mutating Webhook** | Pod 创建时动态修改其配置 | 将 Pod 的 schedulerName 改为 HAMi-scheduler  |
| **Annotations** | 在 Pod 中存储调度决策信息 | 调度结果写入 `hami.io/vgpu-devices-allocated` 等注解  |

**核心流程**：Webhook 修改 Pod → Scheduler 决策 → 结果写入 Annotation → Device Plugin 读取并挂载设备 

---

## 🧠 第三层：核心技术（HAMi 的灵魂）

这一层是 HAMi **最核心的技术原理**，也是区分普通使用者和深度开发者的分水岭。

### 1. CUDA API 编程

HAMi 的核心武器是 **劫持 CUDA API 调用**。你需要理解：
- **CUDA Runtime API**（`cudaMalloc` 等）vs **CUDA Driver API**（`cuMemAlloc` 等）
- **NVML**（NVIDIA Management Library）：用于获取 GPU 状态信息

### 2. LD_PRELOAD 库劫持

这是 HAMi 实现“瞒天过海”的关键技术 ：

```
应用 → LD_PRELOAD → HAMi-core (libvgpu.so) → 真实 CUDA 驱动
                           ↓
                    根据限制判断/修改请求
```

学习要点：
- Linux 动态链接器的加载顺序
- `dlsym()` 函数的作用（获取真实函数地址）
- 如何编写一个 hook 库

### 3. 系统编程语言

| 语言 | 用途 | 学习重点 |
|------|------|----------|
| **C** | HAMi-core（libvgpu.so）开发 | 指针、内存管理、动态库、线程安全 |
| **Go** | 调度器、Device Plugin、Webhook 开发 | goroutine、K8s client-go、HTTP 服务 |

---

## 🚀 第四层：进阶扩展

当你想贡献代码或二次开发时，这些技术会派上用场。

| 技术 | 应用场景 | 参考资料 |
|------|----------|----------|
| **Prometheus** | HAMi 监控指标暴露 | 内置 `/metrics` 端点，可接入 Grafana  |
| **DRA**（动态资源分配）| K8s 1.34+ 的新资源模型 | HAMi v2.8.0 已支持 DRA 模式  |
| **CDI**（容器设备接口）| 标准化设备注入方式 | HAMi 支持 CDI 运行时接口  |
| **国产芯片 SDK** | 适配寒武纪 MLU、昇腾 NPU、海光 DCU | HAMi 已支持多厂商设备  |

---

## 📚 学习路径总结

| 阶段 | 目标 | 核心学习内容 | 预计时间 |
|------|------|--------------|----------|
| **基础** | 能部署和使用 HAMi | Docker + K8s + NVIDIA 驱动 | 2-3 周 |
| **扩展** | 理解 HAMi 架构 | Device Plugin + Scheduler Extender + Webhook | 2-3 周 |
| **核心** | 掌握虚拟化原理 | CUDA API + LD_PRELOAD + C/Go 编程 | 4-6 周 |
| **进阶** | 能贡献代码 | Prometheus + DRA + 国产芯片 SDK | 持续学习 |

---
