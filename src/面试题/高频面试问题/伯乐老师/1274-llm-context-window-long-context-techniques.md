---
title: "面试题 01：大语言模型（LLM）的“上下文窗口”是什么？突破长上下文有哪些常见技术？"
sidebarGroup: "伯乐老师"
shortTitle: "面试题 01：大语言模型（LLM）的“上下文窗口”是什么？突破长上下文有哪些常见技术？"
order: 1274
date: 2026-06-12
category: "面试题"
tag:
  - "面试题"
description: "一、 核心概念解析1. 什么是“上下文窗口”（Context Window）？定义：上下文窗口是指大语言模型在一次交互（或推理）过程中，能够同时处理的最大 Token 数量。这包括了用户的输入（Prompt）以及模型生成的输出（Comple"
article: false
---

> 来源：[面试题 01：大语言模型（LLM）的“上下文窗口”是什么？突破长上下文有哪些常见技术？](https://www.yuque.com/tulingzhouyu/db22bv/ghn19e90qzp6cuhb)

## 一、 核心概念解析

### 1. 什么是“上下文窗口”（Context Window）？

**定义**：上下文窗口是指大语言模型在一次交互（或推理）过程中，能够同时处理的最大 Token 数量。这包括了用户的输入（Prompt）以及模型生成的输出（Completion）。
**通俗理解**：可以将其类比为人类的“短期记忆容量”。如果对话或文档长度超过了这个窗口限制，模型就会“遗忘”最开始输入的信息，导致上下文断裂或产生幻觉。

### 2. 为什么会有上下文长度限制？（底层痛点）

大语言模型普遍基于 Transformer 架构，其核心是**自注意力机制（Self-Attention）**。
自注意力机制的计算复杂度和内存消耗随着序列长度（Token 数量）的增加呈**平方级增长**，即时间与空间复杂度均为 $

![](/面试题/高频面试问题/伯乐老师/1274-llm-context-window-long-context-techniques/img-041b2c4058d8.svg)

$。
这意味着，如果上下文长度翻倍，显存消耗和计算时间将增加至原来的四倍。当上下文极长时，会迅速撑爆 GPU 显存（OOM，Out of Memory），且推理速度极慢。

---

## 二、 突破长上下文的三大技术路径

在实际业务和前沿研究中，突破长上下文限制通常从以下三个维度入手：

![image](/面试题/高频面试问题/伯乐老师/1274-llm-context-window-long-context-techniques/img-1fa03eed9d61.png)

### 路径一：模型与算法层（扩展原生窗口）

从模型架构底层出发，通过修改算法让模型原生支持更长的文本。

- **位置编码扩展（RoPE Scaling）**：

- 大多数现代 LLM（如 Llama）使用旋转位置编码（RoPE）。通过**线性插值（Linear Interpolation）**、**YaRN** 或 **PI（Position Interpolation）** 等技术，可以修改位置编码的频率，让原本只在 4K 长度上训练的模型，无需从头训练即可外推理解 32K 甚至 128K 的位置关系。

- **注意力机制优化**：

- **FlashAttention**：一种硬件（IO）感知的注意力算法，通过优化 GPU 的 SRAM 和 HBM 之间的读写操作，大幅降低显存占用并提升计算速度，是目前长文本模型的标配。
- **RingAttention**：通过将长序列切块并分布到多张 GPU 上进行环形通信计算，打破单卡显存限制，实现百万级超长上下文（如 Llama-3-1M）。
- **稀疏注意力（Sparse Attention）**：不计算所有 Token 之间的注意力，而是只关注局部或特定的关键 Token，从而将复杂度从 $$。
![](/面试题/高频面试问题/伯乐老师/1274-llm-context-window-long-context-techniques/img-041b2c4058d8.svg)
![](/面试题/高频面试问题/伯乐老师/1274-llm-context-window-long-context-techniques/img-fc1fbf975312.svg)
![](/面试题/高频面试问题/伯乐老师/1274-llm-context-window-long-context-techniques/img-745a1ffe9f8c.svg)

### 路径二：工程与推理层（显存压缩与调度）

在模型部署和推理阶段，通过工程化手段优化内存占用。

- **KV Cache 优化**：

- 在生成阶段，模型会缓存历史 Token 的 Key 和 Value 矩阵（KV Cache）。长文本会导致 KV Cache 极其庞大。
- **量化（Quantization）**：对 KV Cache 进行 INT8 或 INT4 量化，直接减少显存占用。
- **PagedAttention**：vLLM 框架的核心技术，借鉴操作系统的虚拟内存分页管理，将 KV Cache 划分为固定大小的块，消除内存碎片，极大提升了长文本并发处理能力。

- **Prompt Caching（提示词缓存）**：

- 对于系统提示词或超长前置文档，预先计算并缓存其状态，后续请求直接复用，大幅降低 TTFT（首字生成时间）。

### 路径三：系统与应用层（外部记忆扩展）

绕过物理限制，通过外部系统和业务逻辑来扩展模型的“记忆”。

- **RAG（检索增强生成，Retrieval-Augmented Generation）**：

- **核心思想**：不把所有文档塞进上下文，而是将长文档切块存入向量数据库。用户提问时，先通过语义检索（Embedding）找出最相关的几个文本块，再拼接进 Prompt 喂给模型。
- **优势**：成本极低，响应快，且能有效减少幻觉，是目前企业级 AI 应用最主流的做法。

- **记忆摘要（Memory Summarization）**：

- 在超长对话中，后台运行一个小模型，定期将早期的冗长对话总结成简短的摘要（Summary），替换掉原始的逐字记录。

- **滑动窗口（Sliding Window）**：

- 维护一个固定长度的队列，只保留最近 N 轮的对话，丢弃最早的对话记录。

---

## 三、 面试答题技巧与加分项（💡 划重点）

1. **切忌只背算法名词**：面试官更看重你对业务场景的理解。
2. **强调性价比与落地性**：在回答时可以补充：“虽然现在有支持 1M 上下文的模型（如 Gemini 1.5 Pro / Kimi），但在企业级高并发应用中，全部依赖长上下文 API 成本极高且响应慢。因此，**在实际工程落地中，我们通常优先采用『RAG 检索 + 历史对话摘要』的组合方案**，只有在处理单篇不可分割的超长复杂逻辑文档时，才会依赖模型的原生大窗口。”
3. **提及 O(N²) 痛点**：一定要准确说出 Transformer 自注意力机制的时间/空间复杂度是 $$，这能体现你对底层原理的扎实掌握。
![](/面试题/高频面试问题/伯乐老师/1274-llm-context-window-long-context-techniques/img-041b2c4058d8.svg)
