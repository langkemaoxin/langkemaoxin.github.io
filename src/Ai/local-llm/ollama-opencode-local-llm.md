---
title: "Ollama + OpenCode 本地大模型配置全攻略：免费使用 AI 编程助手"
sidebarGroup: "本地模型"
shortTitle: "Ollama + OpenCode"
order: 20
date: 2026-04-21
category: "AI"
tag:
  - "Ollama"
  - "OpenCode"
  - "大模型，本地部署"
---

## 引言：为什么需要本地大模型？

在 AI 编程助手普及的今天，我们面临着这样一个困境：

- **商业 API 成本高**：使用 Claude Code、Cursor 等工具，动辄每月几十到几百美元
- **按量计费不划算**：硅基流动、智普 AI 等平台，一个任务没搞完就花了近 7 块钱
- **额度限制**：Codex 等免费工具有每日额度限制，用得太狠就清零了
- **隐私顾虑**：代码上传到第三方服务器，可能存在泄露风险

**本地部署大模型**成为了解决这些问题的最佳方案：

- **完全免费**：一次性下载，永久使用
- **无额度限制**：想问就问，不用担心 Token
- **数据隐私**：所有数据都在本地，不上云
- **离线可用**：没有网络也能正常工作

---

## 一、Ollama：本地大模型的一站式解决方案

### 1.1 什么是 Ollama？

Ollama 是一个让大语言模型在本地运行的工具，它简化了模型下载、管理和使用的整个流程。就像 Docker 对于容器一样，Ollama 对于大模型：

```bash
# 一行命令下载并运行模型
ollama run qwen2.5:7b

# 查看已安装的模型
ollama list

# 删除不需要的模型
ollama rm qwen2.5:7b
```

### 1.2 为什么选择 Ollama？

对比其他本地部署方案，Ollama 的优势明显：

| 方案 | 难度 | 资源占用 | 易用性 | 社区支持 |
|------|------|----------|--------|----------|
| Ollama | ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| llama.cpp | ⭐⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| LocalAI | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 自己搭建 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ⭐⭐ |

**核心优势**：

1. **开箱即用**：下载就能用，不需要配置环境变量
2. **模型丰富**：支持 Qwen、Llama、Mistral 等主流模型
3. **API 兼容**：提供 OpenAI 兼容的 API 接口
4. **跨平台**：Windows、Mac、Linux 都能用

---

## 二、实战：搭建本地大模型服务

### 2.1 安装 Ollama

**Windows 安装步骤**：

1. 访问官网下载：<https://ollama.com/>
2. 运行安装程序，一路下一步
3. 安装完成后，在 PowerShell 中验证：

```powershell
ollama --version
# 输出：ollama version 0.1.32
```

**Mac/Linux 安装**：

```bash
# Mac
curl -fsSL https://ollama.com/install.sh | sh

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 2.2 下载模型

我选择的是 **Qwen3.5-27B**，这是通义千问的 270 亿参数版本：

```bash
ollama pull Qwen3.5-27B-Q8_0.gguf
```

**模型选择建议**：

| 模型 | 参数 | 显存需求 | 适用场景 |
|------|------|----------|----------|
| Qwen2.5:7b | 7B | 8GB | 日常对话、简单代码 |
| Qwen3.5:14b | 14B | 16GB | 代码生成、复杂任务 |
| Qwen3.5:27b | 27B | 24GB | 专业编程、深度分析 |
| Qwen3.5:72b | 72B | 48GB+ | 企业级应用 |

**量化说明**：

- `Q8_0`：8 位量化，精度损失小，推荐
- `Q4_K_M`：4 位量化，节省空间，精度尚可
- `Q2_K`：2 位量化，极度压缩，精度损失大

### 2.3 启动服务

Ollama 安装后会自动启动服务，默认监听：

```
http://127.0.0.1:11434
```

**验证服务是否正常运行**：

```bash
# 测试 API
curl http://localhost:11434/api/tags

# 输出示例：
{
  "models": [
    {
      "name": "qwen3.5:27b-q8_0",
      "size": 16845234567,
      "modified": 1713724800
    }
  ]
}
```

---

## 三、OpenCode 配置：让 AI 编程助手连接本地模型

### 3.1 什么是 OpenCode？

OpenCode 是一个开源的 AI 编程助手，支持连接各种大模型，包括本地部署的 Ollama。它的优势：

- **免费开源**：完全免费，无使用限制
- **多模型支持**：支持 Ollama、OpenAI、Anthropic 等
- **插件系统**：通过插件扩展功能
- **MCP 支持**：支持 Model Context Protocol

### 3.2 配置 OpenCode 连接 Ollama

**步骤 1：找到配置文件**

OpenCode 的配置文件位于：

```
C:\Users\你的用户名\.config\opencode\opencode.json
```

**步骤 2：编辑配置文件**

添加 Ollama 提供者配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "oh-my-openagent@latest"
  ],
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "My Local Ollama",
      "options": {
        "baseURL": "http://192.168.13.23:8842/v1"
      },
      "models": {
        "Qwen3.5-27B-Q8_0.gguf": {
          "name": "Qwen3.5-27B-Q8_0.gguf",
          "limit": {
            "context": 128000,
            "output": 8192
          }
        }
      }
    }
  }
}
```

**配置项说明**：

| 字段 | 说明 | 示例值 |
|------|------|--------|
| `npm` | 使用的 SDK | `@ai-sdk/openai-compatible` |
| `name` | 提供者显示名称 | `My Local Ollama` |
| `baseURL` | Ollama API 地址 | `http://192.168.13.23:8842/v1` |
| `context` | 上下文窗口大小 | `128000` |
| `output` | 最大输出长度 | `8192` |

**注意**：如果你的 Ollama 运行在本地，使用 `http://127.0.0.1:11434/v1`

### 3.3 在 OpenCode 中选择模型

1. 启动 OpenCode
2. 打开模型选择菜单
3. 选择 `My Local Ollama` → `Qwen3.5-27B-Q8_0.gguf`
4. 开始免费使用！

---

## 四、API 调用详解

### 4.1 直接 HTTP 调用

Ollama 提供标准的聊天完成 API：

```bash
curl http://192.168.13.23:8842/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.5-27B-Q8_0.gguf",
    "messages": [
      {
        "role": "user",
        "content": "出师表默写一下"
      }
    ]
  }'
```

### 4.2 Python 调用

使用 OpenAI 客户端库（Ollama 兼容 OpenAI API）：

```python
from openai import OpenAI

# 配置客户端
client = OpenAI(
    base_url="http://192.168.13.23:8842/v1",
    api_key="ollama"  # Ollama 不需要真实 API Key
)

MODEL_NAME = "Qwen3.5-27B-Q8_0.gguf"

# 调用模型
response = client.chat.completions.create(
    model=MODEL_NAME,
    messages=[
        {"role": "system", "content": "你是一个有用的 AI 助手"},
        {"role": "user", "content": "帮我写一个 Python 函数，计算斐波那契数列"}
    ]
)

print(response.choices[0].message.content)
```

### 4.3 JavaScript/TypeScript 调用

```javascript
const client = new OpenAI({
  baseURL: 'http://192.168.13.23:8842/v1',
  apiKey: 'ollama',
});

const response = await client.chat.completions.create({
  model: 'Qwen3.5-27B-Q8_0.gguf',
  messages: [
    { role: 'user', content: '解释一下什么是闭包' }
  ]
});

console.log(response.choices[0].message.content);
```

---

## 五、性能优化与注意事项

### 5.1 硬件要求

| 配置 | 7B 模型 | 14B 模型 | 27B 模型 | 72B 模型 |
|------|--------|---------|---------|---------|
| 内存 | 16GB | 32GB | 32GB+ | 64GB+ |
| 显存 | 8GB | 16GB | 24GB | 48GB+ |
| CPU | 4 核 | 6 核 | 8 核 | 12 核+ |

**我的配置**：
- 内存：32GB
- 显存：2GB（集显）
- CPU：8 核
- 运行 27B 模型：可以，但速度较慢（约 2-3 tokens/秒）

### 5.2 加速技巧

**使用 GPU 加速**（如果有独立显卡）：

```bash
# 查看 GPU 支持
ollama run qwen3.5:27b --n-gpu-layers 35
```

**调整并发数**：

```json
{
  "num_thread": 8,  // 与 CPU 核心数一致
  "num_ctx": 8192,  // 上下文窗口
  "num_batch": 512  // 批处理大小
}
```

### 5.3 常见问题

**问题 1：模型下载失败**

```bash
# 使用镜像加速
export OLLAMA_HOST=http://127.0.0.1:11434
ollama pull registry.cn-hangzhou.aliyuncs.com/ollama/qwen3.5:27b
```

**问题 2：OpenCode 连接不上**

检查点：
1. Ollama 服务是否启动：`ollama serve`
2. 端口是否正确：默认 11434
3. 防火墙是否阻止
4. 配置文件语法是否正确（JSON 格式）

**问题 3：响应速度慢**

优化方案：
- 减小上下文窗口：`num_ctx: 4096`
- 减少批处理大小：`num_batch: 256`
- 使用更小模型：7B 或 14B 版本

---

## 六、进阶：搭建完整的 AI 开发环境

### 6.1 推荐工具链组合

| 用途 | 工具 | 说明 |
|------|------|------|
| 本地模型 | Ollama | 模型管理与运行 |
| AI 编程助手 | OpenCode | 免费开源，支持本地模型 |
| 备选方案 | Trae | 字节出品，$10/月 |
| 备选方案 | Cursor | 业界标杆，$20/月 |
| 插件扩展 | Cline | VSCode 插件，灵活配置 |

### 6.2 成本对比

| 方案 | 月成本 | 额度限制 | 隐私保护 |
|------|--------|----------|----------|
| Ollama + OpenCode | ¥0 | 无 | 完全本地 |
| Trae Pro | ¥72 | 较高 | 部分上云 |
| Cursor Pro | ¥144 | 高 | 部分上云 |
| 硅基流动 API | 不定 | 按量 | 上云 |
| 阿里云百炼 | ¥200 | 9 万次/月 | 上云 |

**结论**：如果有本地硬件条件，Ollama + OpenCode 是最经济的选择。

---

## 七、第 32 天学习总结

### 今日收获

1. **成功搭建 Ollama 服务**：本地运行 Qwen3.5-27B 模型
2. **配置 OpenCode 连接**：实现免费无限制的 AI 编程辅助
3. **理解 API 调用**：掌握 HTTP 和 SDK 两种调用方式
4. **成本优化**：摆脱了商业 API 的额度焦虑

### 后续计划

- [ ] 学习 Tavily 搜索工具集成
- [ ] 构建 RAG 问答应用
- [ ] 探索 Agent 代理的使用
- [ ] 学习 LangChain 与数据库整合
- [ ] 实践 Youtube 字幕爬取与向量化

### 核心感悟

> 在这个 AI 时代，掌握工具链的组合能力比单纯学习某个框架更重要。

**本地部署大模型**不仅节省了成本，更重要的是：

- 摆脱了对外部服务的依赖
- 保护了代码和数据的隐私
- 提供了无限次数的学习机会
- 培养了独立搭建环境的能力

---

## 附录：快速开始脚本

### Windows PowerShell 一键配置

```powershell
# 1. 安装 Ollama（如果未安装）
# 访问 https://ollama.com/ 下载安装

# 2. 下载模型
ollama pull Qwen3.5-27B-Q8_0.gguf

# 3. 启动服务
ollama serve

# 4. 创建配置文件目录
New-Item -Path "$env:USERPROFILE\.config\opencode" -ItemType Directory -Force

# 5. 创建配置文件
@'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-openagent@latest"],
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "My Local Ollama",
      "options": {
        "baseURL": "http://127.0.0.1:11434/v1"
      },
      "models": {
        "Qwen3.5-27B-Q8_0.gguf": {
          "name": "Qwen3.5-27B-Q8_0.gguf",
          "limit": {
            "context": 128000,
            "output": 8192
          }
        }
      }
    }
  }
}
'@ | Out-File -FilePath "$env:USERPROFILE\.config\opencode\opencode.json" -Encoding utf8

# 6. 验证
Write-Host "配置完成！请在 OpenCode 中选择 My Local Ollama -> Qwen3.5-27B-Q8_0.gguf"
```

---

**写在最后**：

今天是第 32 天，从最初的迷茫到现在能够独立搭建完整的 AI 开发环境，我深刻体会到：**行动比计划更重要，实践比理论更有价值**。

希望这篇文章能帮助你快速搭建本地 AI 编程环境，让我们一起在 AI 时代掌握主动权！
