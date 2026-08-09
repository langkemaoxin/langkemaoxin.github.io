---
title: "面试题 10：一个标准 RAG 系统的完整数据流转过程是什么样的？"
sidebarGroup: "伯乐老师"
shortTitle: "面试题 10：一个标准 RAG 系统的完整数据流转过程是什么样的？"
order: 1283
date: 2026-06-23
category: "面试题"
tag:
  - "面试题"
description: "一、 核心概念解析RAG (Retrieval-Augmented Generation，检索增强生成) 是目前企业落地大模型最成熟的架构。它的核心思想是：不依赖大模型自身参数中模糊的记忆，而是在大模型回答问题前，先去企业私有知识库中“检索"
article: false
---

> 来源：[面试题 10：一个标准 RAG 系统的完整数据流转过程是什么样的？](https://www.yuque.com/tulingzhouyu/db22bv/fn94k71ugry4zzbl)

## 一、 核心概念解析

**RAG (Retrieval-Augmented Generation，检索增强生成)** 是目前企业落地大模型最成熟的架构。
它的核心思想是：不依赖大模型自身参数中模糊的记忆，而是在大模型回答问题前，先去企业私有知识库中“检索”出相关资料，然后把资料作为“上下文”喂给大模型，让大模型基于这些资料进行“生成”。

标准 RAG 系统的数据流转严格分为两个阶段：**离线知识构建阶段（Offline）** 和 **在线检索生成阶段（Online）**。

---

![image](/面试题/高频面试问题/伯乐老师/1283-rag-system-data-flow/img-f99abe92a5f2.png)

## 二、 Phase 1：离线知识构建阶段 (Offline Indexing)

这个阶段的任务是将企业的非结构化数据（如 PDF、Word、网页、内部 Wiki）转化为计算机可高效检索的向量数据。

1. **数据接入与解析 (Data Ingestion & Parsing)**

- 将各种格式的文件读取进来，清洗掉无用的 HTML 标签、页眉页脚，提取出纯文本（有时还需处理表格和图片）。

1. **文本切块 (Chunking)**

- **原因**：大模型的上下文窗口有限，且整篇文档转为一个向量会导致语义丢失。
- **操作**：将长文档切分成合适大小的文本块（Chunks），例如每 500 个 Token 一块，且块与块之间通常会保留一定的重叠（Overlap，如 50 个 Token）以防切断上下文语义。

1. **向量化 (Embedding)**

- 调用 Embedding 模型（如 OpenAI 的 `text-embedding-3` 或开源的 `BGE`），将每一个文本块映射为一个高维的浮点数数组（向量）。

1. **入库存储 (Vector DB Storage)**

- 将生成的向量（Vector）以及对应的原文文本（Payload/Metadata，如文档名、页码）存入向量数据库（如 Milvus, Pinecone, Elasticsearch）。

---

## 三、 Phase 2：在线检索与生成阶段 (Online Generation)

这个阶段发生在用户发起提问的实时交互过程中。

1. **用户提问与向量化 (Query Embedding)**

- 用户输入问题（Query）。系统调用与离线阶段**完全相同**的 Embedding 模型，将用户的问题也转化为一个高维向量。

1. **相似度检索 (Retrieval)**

- 拿着问题向量，去向量数据库中进行相似度计算（通常使用**余弦相似度 Cosine Similarity**）。
- 召回（Recall）距离最近、语义最相关的 Top-K 个文本块。

1. **提示词组装 (Prompt Assembly)**

- 将召回的 Top-K 个文本块作为背景知识（Context），与用户的原始问题（Query）拼接在一起，套入预设的 Prompt 模板中。
- *示例 Prompt：“请严格基于以下背景知识回答问题。背景知识：[Chunk 1, Chunk 2...]。用户问题：[Query]”*

1. **大模型生成 (LLM Generation)**

- 将组装好的庞大 Prompt 发送给生成式大模型（如 GPT-4, Qwen）。大模型阅读背景知识后，生成最终答案并返回给用户。

---

## 四、 面试高分加分项（💡 进阶架构）

在面试中，如果只答出上述基础流程（Naive RAG），只能算及格。为了展现高级工程能力，必须提到**高级 RAG (Advanced RAG)** 的优化组件：

1. **检索前优化：Query Rewrite (问题重写)**

- 用户的提问往往是口语化、指代不清的（比如“那它有什么缺点？”）。在向量化之前，先用一个小模型对问题进行补全和重写，提升检索准确率。

1. **检索中优化：Hybrid Search (混合检索)**

- 纯向量检索对专有名词（如特定的产品型号、订单号）极不敏感。工业界通常采用 **“向量检索（语义） + BM25（关键词匹配）”** 的多路召回策略。

1. **检索后优化：Rerank (重排)**

- 向量检索速度快但精度略粗。通常会先粗筛出 Top-20，然后引入一个专门的 Rerank 模型（如 BGE-Reranker），对这 20 个结果与问题的相关性进行交叉打分，精准提取出 Top-5 喂给 LLM。
