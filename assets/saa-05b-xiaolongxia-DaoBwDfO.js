import{a as e,c as t,i as n}from"./app-Cmb-X6oy.js";import{t as r}from"./plugin-vue_export-helper-BDNMzG2s.js";var i=JSON.parse(`{"path":"/Ai/spring-ai-alibaba/saa-05b-xiaolongxia.html","title":"5.手搓简版\\"小龙虾\\"：实现 70% 核心功能","lang":"zh-CN","frontmatter":{"title":"5.手搓简版\\"小龙虾\\"：实现 70% 核心功能","sidebarGroup":"Spring AI Alibaba","shortTitle":"5.手搓简版\\"小龙虾\\"：实现 70% 核心功能","order":6,"date":"2026-07-13T00:00:00.000Z","category":"AI","tag":["Spring AI Alibaba","Agent"],"description":"代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/miniclaw-agent-example导读","head":[["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"5.手搓简版\\\\\\"小龙虾\\\\\\"：实现 70% 核心功能\\",\\"image\\":[\\"https://www.code-corey.com/Ai/spring-ai-alibaba/saa-05b-xiaolongxia/img-001.png\\"],\\"datePublished\\":\\"2026-07-13T00:00:00.000Z\\",\\"dateModified\\":\\"2026-08-09T00:26:52.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Corey\\",\\"url\\":\\"https://www.code-corey.com\\"}]}"],["meta",{"property":"og:url","content":"https://www.code-corey.com/Ai/spring-ai-alibaba/saa-05b-xiaolongxia.html"}],["meta",{"property":"og:site_name","content":"Corey 知识库"}],["meta",{"property":"og:title","content":"5.手搓简版\\"小龙虾\\"：实现 70% 核心功能"}],["meta",{"property":"og:description","content":"代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/miniclaw-agent-example导读"}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:image","content":"https://www.code-corey.com/Ai/spring-ai-alibaba/saa-05b-xiaolongxia/img-001.png"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2026-08-09T00:26:52.000Z"}],["meta",{"property":"article:tag","content":"Agent"}],["meta",{"property":"article:tag","content":"Spring AI Alibaba"}],["meta",{"property":"article:published_time","content":"2026-07-13T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2026-08-09T00:26:52.000Z"}]]},"git":{"createdTime":1786234615000,"updatedTime":1786235212000,"contributors":[{"name":"langkemaoxin","username":"langkemaoxin","email":"2363613998@qq.com","commits":2,"url":"https://github.com/langkemaoxin"},{"name":"Cursor","username":"Cursor","email":"cursoragent@cursor.com","commits":2,"url":"https://github.com/Cursor"}]},"readingTime":{"minutes":7.71,"words":2313},"filePathRelative":"Ai/spring-ai-alibaba/saa-05b-xiaolongxia.md","excerpt":"<blockquote>\\n<p>来源：<a href=\\"https://www.yuque.com/geren-t8lyq/sk9iuh/mymb2uv0hpyibvcm?singleDoc#\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">5.手搓简版&quot;小龙虾&quot;：实现 70% 核心功能</a><br>\\n配套代码：<a href=\\"https://gitee.com/xscodeit/spring-ai-alibaba-xs.git\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">https://gitee.com/xscodeit/spring-ai-alibaba-xs.git</a></p>\\n</blockquote>"}`),a={name:`saa-05b-xiaolongxia.md`};function o(r,i,a,o,s,c){return t(),n(`div`,null,[...i[0]||=[e(`<blockquote><p>来源：<a href="https://www.yuque.com/geren-t8lyq/sk9iuh/mymb2uv0hpyibvcm?singleDoc#" target="_blank" rel="noopener noreferrer">5.手搓简版&quot;小龙虾&quot;：实现 70% 核心功能</a><br> 配套代码：<a href="https://gitee.com/xscodeit/spring-ai-alibaba-xs.git" target="_blank" rel="noopener noreferrer">https://gitee.com/xscodeit/spring-ai-alibaba-xs.git</a></p></blockquote><figure><img src="/Ai/spring-ai-alibaba/saa-05b-xiaolongxia/img-001.png" alt="MQv62KGmrHKxgDWMAaaf7X.png" tabindex="0" loading="lazy"><figcaption>MQv62KGmrHKxgDWMAaaf7X.png</figcaption></figure><h2 id="代码" tabindex="-1"><a class="header-anchor" href="#代码"><span>代码：</span></a></h2><p><a href="https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/miniclaw-agent-example" target="_blank" rel="noopener noreferrer">https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/miniclaw-agent-example</a></p><p><strong>导读</strong>：Open Claw（小龙虾）火了！但你知道用 Spring AI Alibaba 只需要多少代码就能实现它的核心能力吗？本文带你从零开始，手搓一个支持浏览器自动化、Python 执行、文件操作的 ReAct Agent，实现 Open Claw 70% 的核心功能！</p><hr><h2 id="🤔-为什么是-简版小龙虾" tabindex="-1"><a class="header-anchor" href="#🤔-为什么是-简版小龙虾"><span>🤔 为什么是&quot;简版小龙虾&quot;？</span></a></h2><p>Open Claw（开源项目）的核心架构是什么？</p><ul><li>✅ <strong>ReAct Agent 框架</strong> - Reasoning + Acting</li><li>✅ <strong>Tool Calling 机制</strong> - 浏览器、Shell、文件操作</li><li>✅ <strong>技能扩展系统</strong> - 动态加载新能力</li><li>⚠️ 即时通讯集成（这个我们后面再加）</li></ul><p>而我们今天的项目，基于 <strong>Spring AI Alibaba Agent Framework</strong>，用最简洁的代码实现了前三个核心能力！</p><hr><h2 id="🛠️-技术栈选型" tabindex="-1"><a class="header-anchor" href="#🛠️-技术栈选型"><span>🛠️ 技术栈选型</span></a></h2><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>&lt;!-- 核心依赖 --&gt;</span></span>
<span class="line"><span>&lt;spring-ai-alibaba.version&gt;1.1.2.0&lt;/spring-ai-alibaba.version&gt;</span></span>
<span class="line"><span>&lt;spring-boot.version&gt;3.5.7&lt;/spring-boot.version&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;!-- 关键组件 --&gt;</span></span>
<span class="line"><span>1. spring-ai-alibaba-agent-framework - Agent 框架</span></span>
<span class="line"><span>2. spring-ai-alibaba-starter-dashscope - 通义千问模型</span></span>
<span class="line"><span>3. selenium-java 4.18.1 - 浏览器自动化</span></span>
<span class="line"><span>4. graalvm.polyglot 24.2.1 - Python 执行引擎</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>核心理念</strong>：不重复造轮子，站在巨人肩膀上！</p><hr><h2 id="🏗️-架构设计" tabindex="-1"><a class="header-anchor" href="#🏗️-架构设计"><span>🏗️ 架构设计</span></a></h2><h3 id="整体架构图" tabindex="-1"><a class="header-anchor" href="#整体架构图"><span>整体架构图</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>┌─────────────┐</span></span>
<span class="line"><span>│   REST API  │  ← HTTP 接口暴露服务</span></span>
<span class="line"><span>└──────┬──────┘</span></span>
<span class="line"><span>       │</span></span>
<span class="line"><span>┌──────▼──────┐</span></span>
<span class="line"><span>│ ReactAgent  │  ← 核心 Agent（ReAct 模式）</span></span>
<span class="line"><span>└──────┬──────┘</span></span>
<span class="line"><span>       │</span></span>
<span class="line"><span>┌──────┴──────────────────────────────┐</span></span>
<span class="line"><span>│         Tools（工具层）              │</span></span>
<span class="line"><span>├──────────┬──────────┬───────────────┤</span></span>
<span class="line"><span>│ Browser  │  Python  │  FileSystem   │</span></span>
<span class="line"><span>│   Tool   │   Tool   │     Tools     │</span></span>
<span class="line"><span>└──────────┴──────────┴───────────────┘</span></span>
<span class="line"><span>       │</span></span>
<span class="line"><span>┌──────┴──────────────────────────────┐</span></span>
<span class="line"><span>│         Hooks（技能系统）            │</span></span>
<span class="line"><span>├──────────────┬──────────────────────┤</span></span>
<span class="line"><span>│ Skills Hook  │   Shell Hook         │</span></span>
<span class="line"><span>└──────────────┴──────────────────────┘</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="💻-核心代码实现" tabindex="-1"><a class="header-anchor" href="#💻-核心代码实现"><span>💻 核心代码实现</span></a></h2><h3 id="_1️⃣-agent-构建器-skillsagent" tabindex="-1"><a class="header-anchor" href="#_1️⃣-agent-构建器-skillsagent"><span>1️⃣ Agent 构建器：SkillsAgent</span></a></h3><p>这是整个应用的<strong>心脏</strong>，负责组装所有组件。</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class SkillsAgent {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    public ReactAgent buildAgent(ChatModel chatModel) {</span></span>
<span class="line"><span>        // 1. 配置 Skills 注册中心（从用户目录加载技能）</span></span>
<span class="line"><span>        FileSystemSkillRegistry skillRegistry = FileSystemSkillRegistry.builder()</span></span>
<span class="line"><span>                .userSkillsDirectory(System.getProperty(&quot;user.home&quot;) + &quot;/.agents/skills&quot;)</span></span>
<span class="line"><span>                .build();</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 2. 创建 Skills Hook（拦截并执行技能）</span></span>
<span class="line"><span>        SkillsAgentHook skillsHook = SkillsAgentHook.builder()</span></span>
<span class="line"><span>                .skillRegistry(skillRegistry)</span></span>
<span class="line"><span>                .build();</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 3. 创建 Shell Hook（支持命令执行）</span></span>
<span class="line"><span>        ShellToolAgentHook shellHook = ShellToolAgentHook.builder()</span></span>
<span class="line"><span>                .shellTool2(ShellTool2.builder(System.getProperty(&quot;user.dir&quot;))</span></span>
<span class="line"><span>                    .withCommandTimeout(10000)</span></span>
<span class="line"><span>                    .build())</span></span>
<span class="line"><span>                .build();</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 4. 构建 ReAct Agent</span></span>
<span class="line"><span>        ReactAgent agent = ReactAgent.builder()</span></span>
<span class="line"><span>                .name(&quot;skills-integration-agent&quot;)</span></span>
<span class="line"><span>                .systemPrompt(&quot;&quot;&quot;</span></span>
<span class="line"><span>                    你是一个电脑管家，会接管用户电脑处理任务。你有以下重要能力：</span></span>
<span class="line"><span>                    </span></span>
<span class="line"><span>                    【Skills 技能系统】</span></span>
<span class="line"><span>                    - 你可以通过 npx skills 命令查找和安装各种技能</span></span>
<span class="line"><span>                    - 当用户问&quot;如何做 X&quot;、&quot;找技能&quot;时，使用 find-skills</span></span>
<span class="line"><span>                    </span></span>
<span class="line"><span>                    【浏览器能力】</span></span>
<span class="line"><span>                    - browser_tool: 浏览网页、点击、填表、截图</span></span>
<span class="line"><span>                    </span></span>
<span class="line"><span>                    【Python 执行能力】</span></span>
<span class="line"><span>                    - 执行 Python 代码，自动 pip install 缺失模块</span></span>
<span class="line"><span>                    </span></span>
<span class="line"><span>                    【Shell 执行能力】</span></span>
<span class="line"><span>                    - 安装软件、执行系统操作</span></span>
<span class="line"><span>                    &quot;&quot;&quot;)</span></span>
<span class="line"><span>                .model(chatModel)</span></span>
<span class="line"><span>                .saver(new MemorySaver())  // 对话记忆</span></span>
<span class="line"><span>                .tools(</span></span>
<span class="line"><span>                    PythonTool.createPythonToolCallback(PythonTool.DESCRIPTION),</span></span>
<span class="line"><span>                    BrowserTool.createBrowserToolCallback(BrowserTool.DESCRIPTION, false),</span></span>
<span class="line"><span>                    WriteFileTool.createWriteFileToolCallback(WriteFileTool.DESCRIPTION),</span></span>
<span class="line"><span>                    ReadFileTool.createReadFileToolCallback(ReadFileTool.DESCRIPTION),</span></span>
<span class="line"><span>                    ListFilesTool.createListFilesToolCallback(ListFilesTool.DESCRIPTION)</span></span>
<span class="line"><span>                )</span></span>
<span class="line"><span>                .hooks(List.of(skillsHook, shellHook))</span></span>
<span class="line"><span>                .enableLogging(true)</span></span>
<span class="line"><span>                .build();</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return agent;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>关键点解析</strong>：</p><ul><li><code>.tools()</code> - 注册底层工具（浏览器、Python、文件）</li><li><code>.hooks()</code> - 注册技能拦截器（动态技能、Shell）</li><li><code>.systemPrompt()</code> - 告诉 AI 它有哪些能力（非常重要！）</li></ul><hr><h3 id="_2️⃣-自研-browsertool-不依赖-sandbox" tabindex="-1"><a class="header-anchor" href="#_2️⃣-自研-browsertool-不依赖-sandbox"><span>2️⃣ 自研 BrowserTool：不依赖 Sandbox</span></a></h3><p>这是<strong>完全独立实现</strong>的浏览器自动化工具，基于 Selenium。</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>public class BrowserTool implements BiFunction&lt;BrowserRequest, ToolContext, String&gt; {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    private WebDriver driver;</span></span>
<span class="line"><span>    private boolean headless;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    public BrowserTool(boolean headless) {</span></span>
<span class="line"><span>        this.headless = headless;</span></span>
<span class="line"><span>        initializeDriver();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    private void initializeDriver() {</span></span>
<span class="line"><span>        // 自动下载 ChromeDriver</span></span>
<span class="line"><span>        WebDriverManager.chromedriver().setup();</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        ChromeOptions options = new ChromeOptions();</span></span>
<span class="line"><span>        if (headless) {</span></span>
<span class="line"><span>            options.addArguments(&quot;--headless=new&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        options.addArguments(&quot;--disable-gpu&quot;, &quot;--no-sandbox&quot;, &quot;--window-size=1920,1080&quot;);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        this.driver = new ChromeDriver(options);</span></span>
<span class="line"><span>        this.driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Override</span></span>
<span class="line"><span>    public String apply(BrowserRequest request, ToolContext toolContext) {</span></span>
<span class="line"><span>        return switch (request.action.toLowerCase()) {</span></span>
<span class="line"><span>            case &quot;navigate&quot; -&gt; handleNavigate(request);</span></span>
<span class="line"><span>            case &quot;click&quot; -&gt; handleClick(request);</span></span>
<span class="line"><span>            case &quot;extract&quot; -&gt; handleExtract(request);</span></span>
<span class="line"><span>            case &quot;screenshot&quot; -&gt; handleScreenshot(request);</span></span>
<span class="line"><span>            case &quot;fill&quot; -&gt; handleFill(request);</span></span>
<span class="line"><span>            default -&gt; &quot;Error: Unknown action&quot;;</span></span>
<span class="line"><span>        };</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    // ... 具体实现方法</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>支持的 7 种操作</strong>：</p><ol><li><code>navigate</code> - 打开网页</li><li><code>click</code> - 点击元素</li><li><code>extract</code> - 提取文本</li><li><code>screenshot</code> - 截图</li><li><code>get_html</code> - 获取页面 HTML</li><li><code>fill</code> - 填充输入框</li><li><code>scroll</code> - 滚动页面</li></ol><p><strong>为什么不基于 Sandbox？</strong></p><ul><li>更轻量，无额外依赖</li><li>更灵活，完全控制</li><li>更符合项目需求</li></ul><hr><h3 id="_3️⃣-增强-pythontool-自动-pip-install" tabindex="-1"><a class="header-anchor" href="#_3️⃣-增强-pythontool-自动-pip-install"><span>3️⃣ 增强 PythonTool：自动 pip install</span></a></h3><p>这是 GraalVM Polyglot 的增强版本，<strong>最大亮点是自动安装缺失模块</strong>！</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>public class PythonTool implements BiFunction&lt;PythonRequest, ToolContext, String&gt; {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Override</span></span>
<span class="line"><span>    public String apply(PythonRequest request, ToolContext toolContext) {</span></span>
<span class="line"><span>        try (Context context = Context.newBuilder(&quot;python&quot;)</span></span>
<span class="line"><span>                .allowAllAccess(true)      // 允许完全访问</span></span>
<span class="line"><span>                .allowIO(true)             // 启用文件 I/O</span></span>
<span class="line"><span>                .allowNativeAccess(true)   // 启用原生访问</span></span>
<span class="line"><span>                .allowCreateProcess(true)  // 允许创建进程（用于 pip）</span></span>
<span class="line"><span>                .build()) {</span></span>
<span class="line"><span>            </span></span>
<span class="line"><span>            try {</span></span>
<span class="line"><span>                Value result = context.eval(&quot;python&quot;, request.code);</span></span>
<span class="line"><span>                return convertResultToString(result);</span></span>
<span class="line"><span>            } catch (PolyglotException e) {</span></span>
<span class="line"><span>                String errorMsg = e.getMessage();</span></span>
<span class="line"><span>                </span></span>
<span class="line"><span>                // 🔥 关键：检测模块缺失并自动安装</span></span>
<span class="line"><span>                if (errorMsg.contains(&quot;ModuleNotFoundError&quot;) || </span></span>
<span class="line"><span>                    errorMsg.contains(&quot;No module named&quot;)) {</span></span>
<span class="line"><span>                    </span></span>
<span class="line"><span>                    String moduleName = extractModuleName(errorMsg);</span></span>
<span class="line"><span>                    if (moduleName != null) {</span></span>
<span class="line"><span>                        log.info(&quot;Missing module: {}, installing...&quot;, moduleName);</span></span>
<span class="line"><span>                        </span></span>
<span class="line"><span>                        // 执行 pip install</span></span>
<span class="line"><span>                        ProcessBuilder pb = new ProcessBuilder(</span></span>
<span class="line"><span>                            &quot;pip&quot;, &quot;install&quot;, moduleName, &quot;--quiet&quot;</span></span>
<span class="line"><span>                        );</span></span>
<span class="line"><span>                        Process process = pb.start();</span></span>
<span class="line"><span>                        int exitCode = process.waitFor();</span></span>
<span class="line"><span>                        </span></span>
<span class="line"><span>                        if (exitCode == 0) {</span></span>
<span class="line"><span>                            // 重新执行代码</span></span>
<span class="line"><span>                            Value result = context.eval(&quot;python&quot;, request.code);</span></span>
<span class="line"><span>                            return &quot;Module &#39;&quot; + moduleName + &quot;&#39; installed. Result:\\n&quot; </span></span>
<span class="line"><span>                                   + convertResultToString(result);</span></span>
<span class="line"><span>                        }</span></span>
<span class="line"><span>                    }</span></span>
<span class="line"><span>                }</span></span>
<span class="line"><span>                </span></span>
<span class="line"><span>                return &quot;Error: &quot; + errorMsg;</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>实战效果</strong>：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span># 用户代码</span></span>
<span class="line"><span>import requests</span></span>
<span class="line"><span>response = requests.get(&quot;https://api.github.com&quot;)</span></span>
<span class="line"><span>print(response.status_code)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>执行流程</strong>：</p><ol><li>第一次执行 → 发现缺少 <code>requests</code></li><li>自动运行 <code>pip install requests</code></li><li>重新执行 → 成功返回 <code>200</code></li><li>回复：&quot;Module &#39;requests&#39; was missing and has been installed. Result: 200&quot;</li></ol><hr><h3 id="_4️⃣-skills-技能系统-动态扩展" tabindex="-1"><a class="header-anchor" href="#_4️⃣-skills-技能系统-动态扩展"><span>4️⃣ Skills 技能系统：动态扩展</span></a></h3><p>这是最像 Open Claw 的部分！<strong>通过文件系统加载技能</strong>。</p><h4 id="技能目录结构" tabindex="-1"><a class="header-anchor" href="#技能目录结构"><span>技能目录结构</span></a></h4><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>C:\\Users\\yourname\\.agents\\skills\\</span></span>
<span class="line"><span>├── find-skills/</span></span>
<span class="line"><span>│   └── SKILL.md</span></span>
<span class="line"><span>├── file-organizer/</span></span>
<span class="line"><span>│   └── SKILL.md</span></span>
<span class="line"><span>└── your-custom-skill/</span></span>
<span class="line"><span>    └── SKILL.md</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="skill-md-模板" tabindex="-1"><a class="header-anchor" href="#skill-md-模板"><span><a href="http://SKILL.md" target="_blank" rel="noopener noreferrer">SKILL.md</a> 模板</span></a></h4><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>---</span></span>
<span class="line"><span>name: find-skills</span></span>
<span class="line"><span>description: 帮助用户发现和安装技能</span></span>
<span class="line"><span>allowed-tools: [Bash]  # 声明需要的权限</span></span>
<span class="line"><span>---</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Find Skills</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 何时使用</span></span>
<span class="line"><span>当用户问：</span></span>
<span class="line"><span>- &quot;如何优化 React 性能？&quot;</span></span>
<span class="line"><span>- &quot;有没有技能可以做代码审查？&quot;</span></span>
<span class="line"><span>- &quot;找一个生成 changelog 的技能&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 使用方法</span></span>
<span class="line"><span>\`\`\`bash</span></span>
<span class="line"><span>npx skills find react performance</span></span>
<span class="line"><span>npx skills add vercel-labs/agent-skills@react-best-practices</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>**关键配置**：</span></span>
<span class="line"><span>\`\`\`java</span></span>
<span class="line"><span>// 在 SkillsAgent 中</span></span>
<span class="line"><span>FileSystemSkillRegistry skillRegistry = FileSystemSkillRegistry.builder()</span></span>
<span class="line"><span>    .userSkillsDirectory(System.getProperty(&quot;user.home&quot;) + &quot;/.agents/skills&quot;)</span></span>
<span class="line"><span>    .build();</span></span>
<span class="line"><span></span></span>
<span class="line"><span>SkillsAgentHook skillsHook = SkillsAgentHook.builder()</span></span>
<span class="line"><span>    .skillRegistry(skillRegistry)</span></span>
<span class="line"><span>    .build();</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>AI 就会知道</strong>：</p><ul><li>有这个技能可用</li><li>什么场景下应该调用</li><li>可以执行哪些命令</li></ul><hr><h2 id="🎯-实战演示" tabindex="-1"><a class="header-anchor" href="#🎯-实战演示"><span>🎯 实战演示</span></a></h2><h3 id="场景-1-开发贪食蛇游戏" tabindex="-1"><a class="header-anchor" href="#场景-1-开发贪食蛇游戏"><span>场景 1：开发贪食蛇游戏</span></a></h3><p><strong>用户请求</strong>：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>帮我开发一个贪食蛇 HTML 游戏，保存到桌面</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p><strong>Agent 思考过程</strong>：</p><ol><li>理解需求 → 需要编写 HTML+JS 代码</li><li>选择工具 → WriteFileTool</li><li>执行 → 保存为 <code>C:\\Users\\tuling\\Desktop\\snake.html</code></li><li>验证 → 可以用 BrowserTool 打开测试</li></ol><p><strong>实际输出</strong>：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>✅ 已成功创建贪食蛇游戏！</span></span>
<span class="line"><span>文件路径：C:\\Users\\tuling\\Desktop\\snake.html</span></span>
<span class="line"><span>文件大小：4.2 KB</span></span>
<span class="line"><span></span></span>
<span class="line"><span>游戏说明：</span></span>
<span class="line"><span>- 方向键控制移动</span></span>
<span class="line"><span>- 吃到食物得分</span></span>
<span class="line"><span>- 撞墙或咬到自己游戏结束</span></span>
<span class="line"><span></span></span>
<span class="line"><span>要现在打开浏览器测试吗？</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h3 id="场景-2-查找并安装技能" tabindex="-1"><a class="header-anchor" href="#场景-2-查找并安装技能"><span>场景 2：查找并安装技能</span></a></h3><p><strong>用户请求</strong>：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>有没有能优化 React 性能的技能？</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p><strong>Agent 思考过程</strong>：</p><ol><li>识别意图 → 用户在找技能</li><li>触发 find-skills</li><li>执行 <code>npx skills find react performance</code></li><li>返回结果</li></ol><p><strong>实际回复</strong>：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>找到了相关技能！</span></span>
<span class="line"><span></span></span>
<span class="line"><span>📦 vercel-labs/agent-skills@react-best-practices</span></span>
<span class="line"><span>功能：React 和 Next.js 性能优化最佳实践</span></span>
<span class="line"><span>来源：Vercel 工程师团队</span></span>
<span class="line"><span></span></span>
<span class="line"><span>安装命令：</span></span>
<span class="line"><span>npx skills add vercel-labs/agent-skills@react-best-practices</span></span>
<span class="line"><span></span></span>
<span class="line"><span>要我帮你安装吗？</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h3 id="场景-3-浏览器自动化" tabindex="-1"><a class="header-anchor" href="#场景-3-浏览器自动化"><span>场景 3：浏览器自动化</span></a></h3><p><strong>用户请求</strong>：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>帮我把 GitHub 首页截个图</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p><strong>Agent 执行</strong>：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>browser_tool(action=&quot;navigate&quot;, url=&quot;https://github.com&quot;)</span></span>
<span class="line"><span>browser_tool(action=&quot;screenshot&quot;)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>返回结果</strong>：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>✅ 截图成功！</span></span>
<span class="line"><span>格式：PNG</span></span>
<span class="line"><span>大小：245 KB</span></span>
<span class="line"><span>数据：[Base64 编码，可直接显示]</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="javaclaw-抓虾-vs-open-claw🦞" tabindex="-1"><a class="header-anchor" href="#javaclaw-抓虾-vs-open-claw🦞"><span>JavaClaw（抓虾） vs Open Claw🦞</span></a></h2><p><strong>总体完成度</strong>：<strong>70%</strong> 🎉</p><p><strong>缺少的 30%</strong>：</p><ul><li>即时通讯集成（飞书/钉钉/微信）</li><li>MCP（Model Context Protocol）</li><li>可视化界面</li></ul><hr><h2 id="🚀-下一步优化方向" tabindex="-1"><a class="header-anchor" href="#🚀-下一步优化方向"><span>🚀 下一步优化方向</span></a></h2><h3 id="_1-飞书集成-优先级-高" tabindex="-1"><a class="header-anchor" href="#_1-飞书集成-优先级-高"><span>1. 飞书集成（优先级：高）</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@RestController</span></span>
<span class="line"><span>@RequestMapping(&quot;/api/lark&quot;)</span></span>
<span class="line"><span>public class LarkWebhookController {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @PostMapping(&quot;/event&quot;)</span></span>
<span class="line"><span>    public String handleEvent(@RequestBody LarkEvent event) {</span></span>
<span class="line"><span>        // 1. 验证签名</span></span>
<span class="line"><span>        // 2. 解析用户消息</span></span>
<span class="line"><span>        // 3. 调用 Agent.invoke()</span></span>
<span class="line"><span>        // 4. 返回结果到飞书</span></span>
<span class="line"><span>        String reply = agent.call(event.getMessage());</span></span>
<span class="line"><span>        return larkService.sendMessage(event.getUserId(), reply);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>内网穿透方案</strong>：</p><ul><li>natapp / ngrok（开发）</li><li>云服务器（生产）</li></ul><hr><h3 id="_2-mcp-server-支持" tabindex="-1"><a class="header-anchor" href="#_2-mcp-server-支持"><span>2. MCP Server 支持</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Bean</span></span>
<span class="line"><span>public McpClient mcpClient() {</span></span>
<span class="line"><span>    return McpClient.builder()</span></span>
<span class="line"><span>        .serverUrl(&quot;http://localhost:8081/mcp&quot;)</span></span>
<span class="line"><span>        .build();</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// 在 Agent 中使用</span></span>
<span class="line"><span>agent.tools(new McpTool(mcpClient));</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>可以连接</strong>：</p><ul><li>数据库</li><li>向量库</li><li>第三方 API</li></ul><hr><h3 id="_3-web-ui-界面" tabindex="-1"><a class="header-anchor" href="#_3-web-ui-界面"><span>3. Web UI 界面</span></a></h3><p><strong>技术栈推荐</strong>：</p><ul><li>React + Vite（前端）</li><li>WebSocket（实时通信）</li><li>XTerm.js（终端模拟）</li></ul><p><strong>功能规划</strong>：</p><ul><li>对话界面</li><li>任务执行日志</li><li>文件管理器</li><li>技能市场</li></ul><hr><h2 id="💡-核心收获" tabindex="-1"><a class="header-anchor" href="#💡-核心收获"><span>💡 核心收获</span></a></h2><h3 id="_1-agent-框架没那么神秘" tabindex="-1"><a class="header-anchor" href="#_1-agent-框架没那么神秘"><span>1. Agent 框架没那么神秘</span></a></h3><p><strong>本质就是</strong>：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>LLM + Tools + Memory + Planning = Agent</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>Spring AI Alibaba 把这些都封装好了，你只需要组装！</p><hr><h3 id="_2-工具决定能力边界" tabindex="-1"><a class="header-anchor" href="#_2-工具决定能力边界"><span>2. 工具决定能力边界</span></a></h3><p><strong>你的 Agent 有多强，取决于你给了它什么工具</strong>。</p><ul><li>BrowserTool → 可以操作网页</li><li>PythonTool → 可以写代码</li><li>FileSystem → 可以读写文件</li><li>Skills → 可以无限扩展</li></ul><p><strong>给 AI 工具，就像给孩子玩具</strong>，越多越好！</p><hr><h3 id="_3-prompt-工程很重要" tabindex="-1"><a class="header-anchor" href="#_3-prompt-工程很重要"><span>3. Prompt 工程很重要</span></a></h3><p>看看我们的 System Prompt：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>你是一个电脑管家，会接管用户电脑处理任务...</span></span>
<span class="line"><span></span></span>
<span class="line"><span>【Skills 技能系统】</span></span>
<span class="line"><span>- 你可以通过 npx skills 命令查找和安装各种技能</span></span>
<span class="line"><span>- 当用户问&quot;如何做 X&quot;、&quot;找技能&quot;时，使用 find-skills</span></span>
<span class="line"><span></span></span>
<span class="line"><span>【浏览器能力】</span></span>
<span class="line"><span>- browser_tool: 浏览网页、点击、填表、截图</span></span>
<span class="line"><span>...</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>这是在教 AI</strong>：</p><ul><li>你是谁（角色定位）</li><li>你会什么（能力清单）</li><li>什么时候用什么（决策逻辑）</li></ul><p><strong>Prompt 写得好，Agent 更智能！</strong></p><hr><h2 id="🎁完整代码仓库" tabindex="-1"><a class="header-anchor" href="#🎁完整代码仓库"><span>🎁完整代码仓库</span></a></h2><p>项目已开源在 Gitee/GitHub，包含：</p><ul><li>✅ 完整源代码</li><li>✅ 配置示例</li><li>✅ 测试用例</li><li>✅ 部署文档</li></ul><p><strong>地址</strong>：</p><p>📎 <a href="https://www.yuque.com/attachments/yuque/0/2026/zip/22309163/1773382633096-35d5b1c6-7de0-4c20-acfb-b5dc67e54331.zip" target="_blank" rel="noopener noreferrer">miniclaw-agent-example.zip</a></p><p><a href="https://gitee.com/xscodeit/alibaba-agent-xs/tree/main/miniclaw-agent-example" target="_blank" rel="noopener noreferrer">https://gitee.com/xscodeit/alibaba-agent-xs/tree/main/miniclaw-agent-example</a></p><hr><h2 id="📝-总结" tabindex="-1"><a class="header-anchor" href="#📝-总结"><span>📝 总结</span></a></h2><p>我们用不到 <strong>500 行核心代码</strong>，实现了 Open Claw 70% 的功能：</p><ul><li>✅ ReAct Agent 框架</li><li>✅ 浏览器自动化（Selenium）</li><li>✅ Python 执行（GraalVM + 自动 pip）</li><li>✅ 文件操作</li><li>✅ Shell 命令</li><li>✅ Skills 扩展系统</li></ul><p><strong>缺少的 30%</strong>（IM 集成、MCP、UI）只是锦上添花，核心能力已经完备！</p><p><strong>最重要的是</strong>：</p><ul><li>不依赖 Sandbox，更轻量</li><li>基于 Spring Boot，易上手</li><li>可以无缝集成企业应用</li></ul>`,130)]])}var s=r(a,[[`render`,o]]);export{i as _pageData,s as default};