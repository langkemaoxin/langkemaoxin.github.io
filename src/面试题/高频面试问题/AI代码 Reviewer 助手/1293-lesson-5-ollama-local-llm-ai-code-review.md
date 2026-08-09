---
title: "第 5 课 接入本地大模型：Ollama 实现零成本 AI 代码审查"
sidebarGroup: "AI代码 Reviewer 助手"
shortTitle: "第 5 课 接入本地大模型：Ollama 实现零成本 AI 代码审查"
order: 1293
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "一、技术方案：双 Provider 架构2.1 架构设计我们采用可插拔的 AI Provider 架构，支持在配置文件中切换：┌─────────────────────────────────────────┐ │ ReviewServi"
article: false
---

> 来源：[第 5 课 接入本地大模型：Ollama 实现零成本 AI 代码审查](https://www.yuque.com/tulingzhouyu/db22bv/qtvn5dywcekg467s)

---

## 一、技术方案：双 Provider 架构

### 2.1 架构设计

我们采用**可插拔的 AI Provider 架构**，支持在配置文件中切换：

```plain
┌─────────────────────────────────────────┐
│         ReviewService                   │
│  (业务逻辑层，不关心具体AI实现)          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      AIReviewService                    │
│  (根据配置选择AI Provider)              │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌──────────┐    ┌──────────┐
│  Qwen    │    │  Ollama  │
│ API      │    │ 本地模型 │
└──────────┘    └──────────┘
```

### 2.2 核心实现

**关键代码位置：**

- `backend/src/main/java/com/aireviewer/service/AIReviewService.java`

- `callQwen()`：调用通义千问 API

- `callOllama()`：调用 Ollama 本地模型

- `reviewCode()`：根据配置选择调用方式

**配置驱动切换：**

```yaml
# application.yml
ai:
  provider: ollama  # qwen 或 ollama
```

---

## 二、Ollama 安装与配置

### 3.1 安装 Ollama

**Windows：**

1. 访问 [https://ollama.ai](https://ollama.ai)

1. 下载并安装 `Ollama.exe`

1. 安装后会自动启动服务（默认端口：11434）

**macOS：**

```bash
brew install ollama
# 或访问 https://ollama.ai 下载安装包
```

**Linux：**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 3.2 下载代码审查模型

推荐模型（按优先级）：

```bash
# 推荐：通义千问2.5，中文支持好，代码理解能力强
ollama pull qwen2.5:7b

# 备选：CodeLlama，专门为代码设计
ollama pull codellama:7b

# 备选：DeepSeek Coder，代码专用模型
ollama pull deepseek-coder:6.7b

# 轻量级：如果内存有限（8GB以下）
ollama pull llama3.2:3b
```

**查看已下载的模型：**

```bash
ollama list
```

**测试模型：**

```bash
ollama run qwen2.5:7b "你好，请介绍一下你自己"
```

### 3.3 验证服务运行

Ollama 默认在 `http://localhost:11434` 启动。

**测试 API：**

```bash
# Windows PowerShell
Invoke-WebRequest -Uri http://localhost:11434/api/tags -Method GET

# Linux/Mac
curl http://localhost:11434/api/tags
```

应该返回已下载的模型列表（JSON格式）。

---

## 三、项目集成步骤

### 4.1 修改配置文件

编辑 `backend/src/main/resources/application.yml`：

```yaml
# AI Provider 配置
ai:
  provider: ollama  # 切换到本地模型

# Ollama 本地大模型配置
ollama:
  base-url: http://localhost:11434  # Ollama 服务地址
  model: qwen2.5:7b  # 使用你下载的模型
  temperature: 0.3
```

### 4.2 代码实现要点

**1. Ollama API 调用格式**

Ollama 使用 `/api/generate` 端点，格式与 OpenAI 不同：

```java
Map<String, Object> requestBody = Map.of(
    "model", ollamaModel,
    "prompt", prompt,
    "stream", false,  // 必须为false，否则返回流式数据
    "options", Map.of(
        "temperature", ollamaTemperature,
        "num_predict", 8192  // 增加最大token数
    )
);
```

**2. 响应格式解析**

Ollama 返回格式：

```json
{
  "response": "AI返回的内容..."
}
```

需要在 `parseOllamaResponse()` 中提取 `response` 字段。

**3. 超时设置**

- 前端超时：`300000`（5分钟）

- 后端超时：`Duration.ofMinutes(5)`

- Spring Boot HTTP：`connection-timeout: 360000`（6分钟）

### 4.3 切换回通义千问

只需修改配置：

```yaml
ai:
  provider: qwen
```

重启应用即可。

---

## 四、性能优化与注意事项

### 5.1 硬件要求

配置
3B 模型
7B 模型

最低配置
4核CPU, 8GB RAM
8核CPU, 16GB RAM

推荐配置
8核CPU, 16GB RAM
8核CPU, 16GB RAM + GPU

最佳配置
GPU (6GB+ VRAM)
GPU (12GB+ VRAM)

### 5.2 性能对比

指标
Qwen API
Ollama (qwen2.5:7b)

响应时间
2-5秒
10-30秒

成本
按调用计费
免费

隐私性
中等
高（本地）

稳定性
高
取决于硬件

网络要求
需要网络
无需网络

### 5.3 常见问题

**Q1: Ollama 响应很慢怎么办？**

- 使用 GPU 加速（如果有 NVIDIA GPU）

- 使用更小的模型（如 `llama3.2:3b`）

- 这是正常现象，本地模型通常需要 10-30 秒

**Q2: 内存不足怎么办？**

- 使用更小的模型（3B 而不是 7B）

- 关闭其他占用内存的程序

- 增加虚拟内存（Windows）

**Q3: 如何加速推理？**

- 使用 GPU（NVIDIA CUDA）

- 使用量化模型（如 `qwen2.5:7b-q4_0`）

- 减少 `num_predict` 参数

**Q4: JSON 解析失败怎么办？**

- 检查模型是否支持长输出

- 使用更大的模型（如 `qwen2.5:14b`）

- 减少审查代码的长度

---

## 五、实际演示步骤

### 6.1 准备工作

1. **确保 Ollama 已安装并运行**

```bash
ollama --version
curl http://localhost:11434/api/tags
```

1. **下载模型**

```bash
ollama pull qwen2.5:7b
```

1. **修改配置文件**

```yaml
ai:
  provider: ollama
```

### 6.2 启动应用

1. **启动后端**

```bash
cd backend
./mvnw spring-boot:run
```

1. **启动前端**

```bash
cd frontend
npm run dev
```

1. **查看日志**

- 应该看到：`[Ollama] 使用本地大模型进行代码审查，模型: qwen2.5:7b`

### 6.3 测试代码审查

1. 在前端输入 Java 代码

1. 点击"开始审查"

1. 等待 10-30 秒（本地模型需要时间）

1. 查看审查结果

---

## 六、架构优势总结

### 7.1 解耦设计

- **业务层不依赖具体 AI 实现**：`ReviewService` 只调用 `AIReviewService`，不关心是 Qwen 还是 Ollama

- **配置驱动切换**：通过配置文件切换 Provider，无需修改代码

- **统一接口**：两种 Provider 返回相同格式的 `ReviewResult`

### 7.2 可扩展性

未来可以轻松添加新的 AI Provider：

1. 实现 `callXXX()` 方法

1. 添加配置项

1. 在 `reviewCode()` 中添加选择逻辑

### 7.3 向后兼容

- 不影响现有功能

- 可以随时切换回 Qwen API

- 两种 Provider 可以并存

---

## 七、最佳实践建议

### 8.1 使用场景

- **开发环境**：使用 Ollama，节省成本，保护代码隐私

- **生产环境**：使用 Qwen API，保证稳定性和速度

- **测试环境**：可以两种都测试，对比效果

### 8.2 模型选择

场景
推荐模型
原因

中文代码审查
`qwen2.5:7b`
中文支持好，代码理解强

纯代码审查
`codellama:7b`
代码专用，性能好

资源受限
`llama3.2:3b`
轻量级，速度快

高质量审查
`qwen2.5:14b`
更大的模型，效果更好

### 8.3 性能优化

1. **使用 GPU 加速**（如果有）

- Ollama 会自动检测并使用 GPU

- 确保安装了 CUDA 驱动

1. **调整模型参数**

```yaml
ollama:
  temperature: 0.3  # 降低温度提高稳定性
  num_predict: 4096  # 根据需要调整
```

1. **代码长度控制**

- 建议单次审查代码不超过 500 行

- 大文件可以分段审查
