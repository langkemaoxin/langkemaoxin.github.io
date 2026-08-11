import{a as e,c as t,i as n}from"./app-Pu0XJJTa.js";import{t as r}from"./plugin-vue_export-helper-BDNMzG2s.js";var i=JSON.parse(`{"path":"/%E9%9D%A2%E8%AF%95%E9%A2%98/%E9%AB%98%E9%A2%91%E9%9D%A2%E8%AF%95%E9%97%AE%E9%A2%98/AI%E4%BB%A3%E7%A0%81%E5%8A%A9%E6%89%8B/1300-episode-3-frontend-sse-streaming-typewriter-effect.html","title":"第 3 集：前端 SSE 流式交互与打字机效果实现","lang":"zh-CN","frontmatter":{"title":"第 3 集：前端 SSE 流式交互与打字机效果实现","sidebarGroup":"AI代码助手","shortTitle":"第 3 集：前端 SSE 流式交互与打字机效果实现","order":1300,"date":"2025-12-30T00:00:00.000Z","category":"面试题","tag":["面试题"],"description":"摘要：本节我们将构建前端页面。你将学到如何使用 JavaScript 的 fetch API 读取后端传来的数据流 (Stream)，如何清洗 SSE 协议数据，以及如何将 Markdown 实时渲染为漂亮的网页。1. 核心技术栈为了保证所","article":false,"head":[["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"WebPage\\",\\"name\\":\\"第 3 集：前端 SSE 流式交互与打字机效果实现\\",\\"description\\":\\"摘要：本节我们将构建前端页面。你将学到如何使用 JavaScript 的 fetch API 读取后端传来的数据流 (Stream)，如何清洗 SSE 协议数据，以及如何将 Markdown 实时渲染为漂亮的网页。1. 核心技术栈为了保证所\\"}"],["meta",{"property":"og:url","content":"https://www.code-corey.com/%E9%9D%A2%E8%AF%95%E9%A2%98/%E9%AB%98%E9%A2%91%E9%9D%A2%E8%AF%95%E9%97%AE%E9%A2%98/AI%E4%BB%A3%E7%A0%81%E5%8A%A9%E6%89%8B/1300-episode-3-frontend-sse-streaming-typewriter-effect.html"}],["meta",{"property":"og:site_name","content":"Corey 知识库"}],["meta",{"property":"og:title","content":"第 3 集：前端 SSE 流式交互与打字机效果实现"}],["meta",{"property":"og:description","content":"摘要：本节我们将构建前端页面。你将学到如何使用 JavaScript 的 fetch API 读取后端传来的数据流 (Stream)，如何清洗 SSE 协议数据，以及如何将 Markdown 实时渲染为漂亮的网页。1. 核心技术栈为了保证所"}],["meta",{"property":"og:type","content":"website"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2026-08-09T03:10:04.000Z"}],["meta",{"property":"article:tag","content":"面试题"}],["meta",{"property":"article:published_time","content":"2025-12-30T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2026-08-09T03:10:04.000Z"}]]},"git":{"createdTime":1786240216000,"updatedTime":1786245004000,"contributors":[{"name":"langkemaoxin","username":"langkemaoxin","email":"2363613998@qq.com","commits":2,"url":"https://github.com/langkemaoxin"},{"name":"Cursor","username":"Cursor","email":"cursoragent@cursor.com","commits":2,"url":"https://github.com/Cursor"}]},"readingTime":{"minutes":4.85,"words":1455},"filePathRelative":"面试题/高频面试问题/AI代码助手/1300-episode-3-frontend-sse-streaming-typewriter-effect.md","excerpt":"<blockquote>\\n<p>来源：<a href=\\"https://www.yuque.com/tulingzhouyu/db22bv/bpwr6gwq8vism8m2\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">第 3 集：前端 SSE 流式交互与打字机效果实现</a></p>\\n</blockquote>\\n<p><strong>摘要</strong>：本节我们将构建前端页面。你将学到如何使用 JavaScript 的 fetch API 读取后端传来的数据流 (Stream)，如何清洗 SSE 协议数据，以及如何将 Markdown 实时渲染为漂亮的网页。</p>"}`),a={name:`1300-episode-3-frontend-sse-streaming-typewriter-effect.md`};function o(r,i,a,o,s,c){return t(),n(`div`,null,[...i[0]||=[e(`<blockquote><p>来源：<a href="https://www.yuque.com/tulingzhouyu/db22bv/bpwr6gwq8vism8m2" target="_blank" rel="noopener noreferrer">第 3 集：前端 SSE 流式交互与打字机效果实现</a></p></blockquote><p><strong>摘要</strong>：本节我们将构建前端页面。你将学到如何使用 JavaScript 的 fetch API 读取后端传来的数据流 (Stream)，如何清洗 SSE 协议数据，以及如何将 Markdown 实时渲染为漂亮的网页。</p><h2 id="_1-核心技术栈" tabindex="-1"><a class="header-anchor" href="#_1-核心技术栈"><span>1. 核心技术栈</span></a></h2><p>为了保证所有 Java 开发者（哪怕不懂前端）都能看懂，我们采用<strong>零构建工具</strong>方案：</p><ul><li><strong>HTML5/CSS3</strong>：原生编写，左右分栏布局。</li><li><strong>Vanilla JS</strong>：原生 JavaScript，无框架依赖。</li><li><strong>Marked.js</strong>：通过 CDN 引入，用于 Markdown 解析（把 # 变成标题，把 \`\`\` 变成代码块）。</li><li><strong>SSE (Server-Sent Events)</strong>：处理流式响应的核心技术。</li></ul><hr><h2 id="_2-完整代码实现-index-html" tabindex="-1"><a class="header-anchor" href="#_2-完整代码实现-index-html"><span>2. 完整代码实现 (index.html)</span></a></h2><p>请在项目的 src/main/resources/static/ 目录下新建 index.html，并粘贴以下代码。这是<strong>开箱即用</strong>的完整版本。</p><p><strong>codeHtml</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>&amp;lt;!DOCTYPE html&amp;gt;</span></span>
<span class="line"><span>&amp;lt;html lang=&quot;zh-CN&quot;&amp;gt;</span></span>
<span class="line"><span>&amp;lt;head&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;meta charset=&quot;UTF-8&quot;&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;title&amp;gt;AI 代码审查助手&amp;lt;/title&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;!-- 1. 引入 Marked.js 用于解析 Markdown --&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;script src=&quot;https://cdn.jsdelivr.net/npm/marked/marked.min.js&quot;&amp;gt;&amp;lt;/script&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;style&amp;gt;</span></span>
<span class="line"><span>        /* 简单的现代化 UI 布局 */</span></span>
<span class="line"><span>        body { margin: 0; padding: 0; font-family: &#39;Segoe UI&#39;, sans-serif; height: 100vh; display: flex; flex-direction: column; }</span></span>
<span class="line"><span>        header { background: #2c3e50; color: white; padding: 1rem; text-align: center; font-size: 1.2rem; font-weight: bold; }</span></span>
<span class="line"><span>        .container { flex: 1; display: flex; overflow: hidden; }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        /* 左侧：输入区 */</span></span>
<span class="line"><span>        .editor-pane { width: 40%; padding: 1rem; background: #f8f9fa; display: flex; flex-direction: column; border-right: 1px solid #ddd; }</span></span>
<span class="line"><span>        textarea { flex: 1; padding: 1rem; font-family: &#39;Consolas&#39;, monospace; font-size: 14px; border: 1px solid #ddd; resize: none; outline: none; }</span></span>
<span class="line"><span>        button { margin-top: 1rem; padding: 10px; background: #27ae60; color: white; border: none; cursor: pointer; font-size: 16px; border-radius: 4px; transition: 0.3s; }</span></span>
<span class="line"><span>        button:hover { background: #219150; }</span></span>
<span class="line"><span>        button:disabled { background: #ccc; cursor: not-allowed; }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        /* 右侧：结果展示区 */</span></span>
<span class="line"><span>        .preview-pane { width: 60%; padding: 2rem; overflow-y: auto; background: #fff; line-height: 1.6; }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        /* Markdown 样式微调 */</span></span>
<span class="line"><span>        .preview-pane pre { background: #f4f4f4; padding: 1rem; border-radius: 5px; overflow-x: auto; }</span></span>
<span class="line"><span>        .preview-pane code { font-family: &#39;Consolas&#39;, monospace; color: #c7254e; background: #f9f2f4; padding: 2px 4px; border-radius: 4px; }</span></span>
<span class="line"><span>        .preview-pane pre code { color: inherit; background: transparent; }</span></span>
<span class="line"><span>    &amp;lt;/style&amp;gt;</span></span>
<span class="line"><span>&amp;lt;/head&amp;gt;</span></span>
<span class="line"><span>&amp;lt;body&amp;gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&amp;lt;header&amp;gt;🤖 AI 代码审查助手 (Powered by Spring AI)&amp;lt;/header&amp;gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&amp;lt;div class=&quot;container&quot;&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;div class=&quot;editor-pane&quot;&amp;gt;</span></span>
<span class="line"><span>        &amp;lt;textarea id=&quot;codeInput&quot; placeholder=&quot;请在此处粘贴需要审查的 Java 代码...&quot;&amp;gt;&amp;lt;/textarea&amp;gt;</span></span>
<span class="line"><span>        &amp;lt;button id=&quot;btnSubmit&quot; onclick=&quot;submitCode()&quot;&amp;gt;🚀 开始审查&amp;lt;/button&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;/div&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;div class=&quot;preview-pane&quot; id=&quot;resultDiv&quot;&amp;gt;</span></span>
<span class="line"><span>        &amp;lt;p style=&quot;color: #888;&quot;&amp;gt;AI 审查报告将在此处生成...&amp;lt;/p&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;/div&amp;gt;</span></span>
<span class="line"><span>&amp;lt;/div&amp;gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&amp;lt;script&amp;gt;</span></span>
<span class="line"><span>    // 2. 核心交互逻辑</span></span>
<span class="line"><span>    async function submitCode() {</span></span>
<span class="line"><span>        const input = document.getElementById(&#39;codeInput&#39;);</span></span>
<span class="line"><span>        const btn = document.getElementById(&#39;btnSubmit&#39;);</span></span>
<span class="line"><span>        const resultDiv = document.getElementById(&#39;resultDiv&#39;);</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        if (!input.value.trim()) {</span></span>
<span class="line"><span>            alert(&quot;请先输入代码！&quot;);</span></span>
<span class="line"><span>            return;</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        // UI 状态重置</span></span>
<span class="line"><span>        btn.disabled = true;</span></span>
<span class="line"><span>        btn.innerText = &quot;审查中...&quot;;</span></span>
<span class="line"><span>        resultDiv.innerHTML = &quot;⏳ AI 正在思考...&quot;;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        let fullText = &quot;&quot;; // 存储累加的文本</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        try {</span></span>
<span class="line"><span>            // 3. 发起 Fetch 请求</span></span>
<span class="line"><span>            const response = await fetch(&#39;/api/review&#39;, {</span></span>
<span class="line"><span>                method: &#39;POST&#39;,</span></span>
<span class="line"><span>                headers: { &#39;Content-Type&#39;: &#39;application/json&#39; },</span></span>
<span class="line"><span>                body: input.value // 直接发送字符串</span></span>
<span class="line"><span>            });</span></span>
<span class="line"><span></span></span>
<span class="line"><span>            // 4. 获取读取器 (Reader)</span></span>
<span class="line"><span>            const reader = response.body.getReader();</span></span>
<span class="line"><span>            const decoder = new TextDecoder();</span></span>
<span class="line"><span></span></span>
<span class="line"><span>            while (true) {</span></span>
<span class="line"><span>                // 读取数据流</span></span>
<span class="line"><span>                const { done, value } = await reader.read();</span></span>
<span class="line"><span>                if (done) break;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>                // 解码字节流</span></span>
<span class="line"><span>                const chunk = decoder.decode(value, { stream: true });</span></span>
<span class="line"><span>                </span></span>
<span class="line"><span>                // ⚠️ 5. 关键：清洗数据 (去除 SSE 协议头 &quot;data:&quot;)</span></span>
<span class="line"><span>                // Spring AI 默认返回格式是 &quot;data: 内容 \\n\\n&quot;</span></span>
<span class="line"><span>                // 我们需要用正则把 &quot;data:&quot; 和多余换行去掉</span></span>
<span class="line"><span>                const cleanChunk = chunk.replace(/data:/g, &#39;&#39;); </span></span>
<span class="line"><span></span></span>
<span class="line"><span>                // 累加文本</span></span>
<span class="line"><span>                fullText += cleanChunk;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>                // 实时渲染 Markdown</span></span>
<span class="line"><span>                resultDiv.innerHTML = marked.parse(fullText);</span></span>
<span class="line"><span>                </span></span>
<span class="line"><span>                // 自动滚动到底部</span></span>
<span class="line"><span>                resultDiv.scrollTop = resultDiv.scrollHeight;</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        } catch (error) {</span></span>
<span class="line"><span>            console.error(error);</span></span>
<span class="line"><span>            resultDiv.innerHTML = \`&amp;lt;span style=&quot;color:red;&quot;&amp;gt;❌ 请求出错: \${error.message}&amp;lt;/span&amp;gt;\`;</span></span>
<span class="line"><span>        } finally {</span></span>
<span class="line"><span>            // 恢复按钮状态</span></span>
<span class="line"><span>            btn.disabled = false;</span></span>
<span class="line"><span>            btn.innerText = &quot;🚀 开始审查&quot;;</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>&amp;lt;/script&amp;gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&amp;lt;/body&amp;gt;</span></span>
<span class="line"><span>&amp;lt;/html&amp;gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="_3-代码解析-核心知识点" tabindex="-1"><a class="header-anchor" href="#_3-代码解析-核心知识点"><span>3. 代码解析 (核心知识点)</span></a></h2><h3 id="_3-1-为什么要清洗数据-replace" tabindex="-1"><a class="header-anchor" href="#_3-1-为什么要清洗数据-replace"><span>3.1 为什么要清洗数据 (replace)？</span></a></h3><p>Spring AI 基于 OpenAI 协议，返回的数据块（Chunk）格式通常长这样：</p><p><strong>codeText</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>data: 评</span></span>
<span class="line"><span>data: 分</span></span>
<span class="line"><span>data: ：</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>如果不处理，网页上就会显示大量重复的 data:。</p><ul><li><strong>代码方案</strong>：chunk.replace(/data:/g, &#39;&#39;)</li><li><strong>作用</strong>：利用正则表达式全局替换，把协议头删掉，只保留有效内容。</li></ul><h3 id="_3-2-为什么用-fetch-而不是-axios" tabindex="-1"><a class="header-anchor" href="#_3-2-为什么用-fetch-而不是-axios"><span>3.2 为什么用 fetch 而不是 axios？</span></a></h3><p>虽然 Axios 很流行，但它默认不支持流式读取（Stream），它倾向于等所有数据下载完再返回。而原生 fetch API 的 response.body.getReader() 是实现打字机效果的最佳原生方案。</p><h3 id="_3-3-markdown-渲染" tabindex="-1"><a class="header-anchor" href="#_3-3-markdown-渲染"><span>3.3 Markdown 渲染</span></a></h3><p>AI 返回的是包含 <strong>粗体</strong>、### 标题 和 \`\`\`代码块 的 Markdown 文本。</p><ul><li>我们引入了 marked.js。</li><li>调用 marked.parse(fullText) 即可瞬间把纯文本转为 HTML 标签。</li></ul><hr><h2 id="_4-🧙‍♂️-给-cursor-的提示词-自动生成" tabindex="-1"><a class="header-anchor" href="#_4-🧙‍♂️-给-cursor-的提示词-自动生成"><span>4. 🧙‍♂️ 给 Cursor 的提示词 (自动生成)</span></a></h2><p>如果你想演示“完全不写代码”，可以将下面的 Prompt 投喂给 Cursor：</p><p>&quot;请在 src/main/resources/static 下生成一个 index.html。</p><ul><li>UI：左右分栏，左边 Textarea，右边 Div 显示结果。底部一个按钮。</li><li>逻辑：点击按钮发送 POST 请求到 /api/review。</li><li><strong>核心要求</strong>：使用 fetch API 读取 Stream 流。每收到一个 chunk，就去掉 &#39;data:&#39; 前缀，然后累加到变量中。</li><li>引入 marked.js CDN，将累加的文本实时转换为 HTML 并渲染到右侧 Div。</li><li>CSS：简单美化，右侧代码块要有背景色。&quot;</li></ul><hr><h2 id="_5-🛠️-避坑指南-troubleshooting" tabindex="-1"><a class="header-anchor" href="#_5-🛠️-避坑指南-troubleshooting"><span>5. 🛠️ 避坑指南 (Troubleshooting)</span></a></h2><p><strong>Q1: 页面显示 [object Promise] 或者 undefined？</strong></p><ul><li><strong>原因</strong>：可能是 fetch 代码写错了，没有 await，或者变量名写错。</li><li><strong>解决</strong>：直接复制上面的完整代码覆盖即可。</li></ul><p><strong>Q2: 点击按钮没反应，控制台报错 404？</strong></p><ul><li><strong>原因</strong>：后端没启动，或者后端接口路径不是 /api/review。</li><li><strong>解决</strong>：检查 Controller 里的 @RequestMapping 地址。</li></ul><p><strong>Q3: AI 回复全是乱码？</strong></p><ul><li><strong>原因</strong>：解码器问题。</li><li><strong>解决</strong>：确保使用了 new TextDecoder().decode(value)。</li></ul>`,36)]])}var s=r(a,[[`render`,o]]);export{i as _pageData,s as default};