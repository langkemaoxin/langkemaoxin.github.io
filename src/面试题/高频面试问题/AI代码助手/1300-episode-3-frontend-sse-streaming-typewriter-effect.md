---
title: "第 3 集：前端 SSE 流式交互与打字机效果实现"
sidebarGroup: "AI代码助手"
shortTitle: "第 3 集：前端 SSE 流式交互与打字机效果实现"
order: 1300
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "摘要：本节我们将构建前端页面。你将学到如何使用 JavaScript 的 fetch API 读取后端传来的数据流 (Stream)，如何清洗 SSE 协议数据，以及如何将 Markdown 实时渲染为漂亮的网页。1. 核心技术栈为了保证所"
article: false
---

> 来源：[第 3 集：前端 SSE 流式交互与打字机效果实现](https://www.yuque.com/tulingzhouyu/db22bv/bpwr6gwq8vism8m2)

**摘要**：本节我们将构建前端页面。你将学到如何使用 JavaScript 的 fetch API 读取后端传来的数据流 (Stream)，如何清洗 SSE 协议数据，以及如何将 Markdown 实时渲染为漂亮的网页。

## 1. 核心技术栈

为了保证所有 Java 开发者（哪怕不懂前端）都能看懂，我们采用**零构建工具**方案：

- **HTML5/CSS3**：原生编写，左右分栏布局。
- **Vanilla JS**：原生 JavaScript，无框架依赖。
- **Marked.js**：通过 CDN 引入，用于 Markdown 解析（把 # 变成标题，把 ``` 变成代码块）。
- **SSE (Server-Sent Events)**：处理流式响应的核心技术。

---

## 2. 完整代码实现 (index.html)

请在项目的 src/main/resources/static/ 目录下新建 index.html，并粘贴以下代码。这是**开箱即用**的完整版本。

**codeHtml**

```plain
&lt;!DOCTYPE html&gt;
&lt;html lang="zh-CN"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;title&gt;AI 代码审查助手&lt;/title&gt;
    &lt;!-- 1. 引入 Marked.js 用于解析 Markdown --&gt;
    &lt;script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"&gt;&lt;/script&gt;
    &lt;style&gt;
        /* 简单的现代化 UI 布局 */
        body { margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; height: 100vh; display: flex; flex-direction: column; }
        header { background: #2c3e50; color: white; padding: 1rem; text-align: center; font-size: 1.2rem; font-weight: bold; }
        .container { flex: 1; display: flex; overflow: hidden; }
        
        /* 左侧：输入区 */
        .editor-pane { width: 40%; padding: 1rem; background: #f8f9fa; display: flex; flex-direction: column; border-right: 1px solid #ddd; }
        textarea { flex: 1; padding: 1rem; font-family: 'Consolas', monospace; font-size: 14px; border: 1px solid #ddd; resize: none; outline: none; }
        button { margin-top: 1rem; padding: 10px; background: #27ae60; color: white; border: none; cursor: pointer; font-size: 16px; border-radius: 4px; transition: 0.3s; }
        button:hover { background: #219150; }
        button:disabled { background: #ccc; cursor: not-allowed; }

        /* 右侧：结果展示区 */
        .preview-pane { width: 60%; padding: 2rem; overflow-y: auto; background: #fff; line-height: 1.6; }
        
        /* Markdown 样式微调 */
        .preview-pane pre { background: #f4f4f4; padding: 1rem; border-radius: 5px; overflow-x: auto; }
        .preview-pane code { font-family: 'Consolas', monospace; color: #c7254e; background: #f9f2f4; padding: 2px 4px; border-radius: 4px; }
        .preview-pane pre code { color: inherit; background: transparent; }
    &lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;

&lt;header&gt;🤖 AI 代码审查助手 (Powered by Spring AI)&lt;/header&gt;

&lt;div class="container"&gt;
    &lt;div class="editor-pane"&gt;
        &lt;textarea id="codeInput" placeholder="请在此处粘贴需要审查的 Java 代码..."&gt;&lt;/textarea&gt;
        &lt;button id="btnSubmit" onclick="submitCode()"&gt;🚀 开始审查&lt;/button&gt;
    &lt;/div&gt;
    &lt;div class="preview-pane" id="resultDiv"&gt;
        &lt;p style="color: #888;"&gt;AI 审查报告将在此处生成...&lt;/p&gt;
    &lt;/div&gt;
&lt;/div&gt;

&lt;script&gt;
    // 2. 核心交互逻辑
    async function submitCode() {
        const input = document.getElementById('codeInput');
        const btn = document.getElementById('btnSubmit');
        const resultDiv = document.getElementById('resultDiv');

        if (!input.value.trim()) {
            alert("请先输入代码！");
            return;
        }

        // UI 状态重置
        btn.disabled = true;
        btn.innerText = "审查中...";
        resultDiv.innerHTML = "⏳ AI 正在思考...";
        
        let fullText = ""; // 存储累加的文本

        try {
            // 3. 发起 Fetch 请求
            const response = await fetch('/api/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: input.value // 直接发送字符串
            });

            // 4. 获取读取器 (Reader)
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                // 读取数据流
                const { done, value } = await reader.read();
                if (done) break;

                // 解码字节流
                const chunk = decoder.decode(value, { stream: true });
                
                // ⚠️ 5. 关键：清洗数据 (去除 SSE 协议头 "data:")
                // Spring AI 默认返回格式是 "data: 内容 \n\n"
                // 我们需要用正则把 "data:" 和多余换行去掉
                const cleanChunk = chunk.replace(/data:/g, ''); 

                // 累加文本
                fullText += cleanChunk;

                // 实时渲染 Markdown
                resultDiv.innerHTML = marked.parse(fullText);
                
                // 自动滚动到底部
                resultDiv.scrollTop = resultDiv.scrollHeight;
            }
        } catch (error) {
            console.error(error);
            resultDiv.innerHTML = `&lt;span style="color:red;"&gt;❌ 请求出错: ${error.message}&lt;/span&gt;`;
        } finally {
            // 恢复按钮状态
            btn.disabled = false;
            btn.innerText = "🚀 开始审查";
        }
    }
&lt;/script&gt;

&lt;/body&gt;
&lt;/html&gt;
```

---

## 3. 代码解析 (核心知识点)

### 3.1 为什么要清洗数据 (replace)？

Spring AI 基于 OpenAI 协议，返回的数据块（Chunk）格式通常长这样：

**codeText**

```plain
data: 评
data: 分
data: ：
```

如果不处理，网页上就会显示大量重复的 data:。

- **代码方案**：chunk.replace(/data:/g, '')
- **作用**：利用正则表达式全局替换，把协议头删掉，只保留有效内容。

### 3.2 为什么用 fetch 而不是 axios？

虽然 Axios 很流行，但它默认不支持流式读取（Stream），它倾向于等所有数据下载完再返回。而原生 fetch API 的 response.body.getReader() 是实现打字机效果的最佳原生方案。

### 3.3 Markdown 渲染

AI 返回的是包含 **粗体**、### 标题 和 ```代码块 的 Markdown 文本。

- 我们引入了 marked.js。
- 调用 marked.parse(fullText) 即可瞬间把纯文本转为 HTML 标签。

---

## 4. 🧙‍♂️ 给 Cursor 的提示词 (自动生成)

如果你想演示“完全不写代码”，可以将下面的 Prompt 投喂给 Cursor：

"请在 src/main/resources/static 下生成一个 index.html。

- UI：左右分栏，左边 Textarea，右边 Div 显示结果。底部一个按钮。
- 逻辑：点击按钮发送 POST 请求到 /api/review。
- **核心要求**：使用 fetch API 读取 Stream 流。每收到一个 chunk，就去掉 'data:' 前缀，然后累加到变量中。
- 引入 marked.js CDN，将累加的文本实时转换为 HTML 并渲染到右侧 Div。
- CSS：简单美化，右侧代码块要有背景色。"

---

## 5. 🛠️ 避坑指南 (Troubleshooting)

**Q1: 页面显示 [object Promise] 或者 undefined？**

- **原因**：可能是 fetch 代码写错了，没有 await，或者变量名写错。
- **解决**：直接复制上面的完整代码覆盖即可。

**Q2: 点击按钮没反应，控制台报错 404？**

- **原因**：后端没启动，或者后端接口路径不是 /api/review。
- **解决**：检查 Controller 里的 @RequestMapping 地址。

**Q3: AI 回复全是乱码？**

- **原因**：解码器问题。
- **解决**：确保使用了 new TextDecoder().decode(value)。
