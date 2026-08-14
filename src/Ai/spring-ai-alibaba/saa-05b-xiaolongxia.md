---
title: "5.手搓简版\"小龙虾\"：实现 70% 核心功能"
sidebarGroup: "Spring AI Alibaba"
shortTitle: "5.手搓简版\"小龙虾\"：实现 70% 核心功能"
order: 6
date: 2026-07-13
category: "AI"
tag:
  - "Spring AI Alibaba"
  - "Agent"
description: "代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/miniclaw-agent-example导读"
---

> 来源：[5.手搓简版"小龙虾"：实现 70% 核心功能](https://www.yuque.com/geren-t8lyq/sk9iuh/mymb2uv0hpyibvcm?singleDoc#)  
> 配套代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs.git

![MQv62KGmrHKxgDWMAaaf7X.png](/Ai/spring-ai-alibaba/saa-05b-xiaolongxia/img-001.png)

## 代码：

[https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/miniclaw-agent-example](https://gitee.com/xscodeit/spring-ai-alibaba-xs/tree/main/miniclaw-agent-example)

**导读**：Open Claw（小龙虾）火了！但你知道用 Spring AI Alibaba 只需要多少代码就能实现它的核心能力吗？本文带你从零开始，手搓一个支持浏览器自动化、Python 执行、文件操作的 ReAct Agent，实现 Open Claw 70% 的核心功能！

---

## 🤔 为什么是"简版小龙虾"？

Open Claw（开源项目）的核心架构是什么？

- ✅ **ReAct Agent 框架** - Reasoning + Acting
- ✅ **Tool Calling 机制** - 浏览器、Shell、文件操作
- ✅ **技能扩展系统** - 动态加载新能力
- ⚠️ 即时通讯集成（这个我们后面再加）

而我们今天的项目，基于 **Spring AI Alibaba Agent Framework**，用最简洁的代码实现了前三个核心能力！

---

## 🛠️ 技术栈选型

```plain
<!-- 核心依赖 -->
<spring-ai-alibaba.version>1.1.2.0</spring-ai-alibaba.version>
<spring-boot.version>3.5.7</spring-boot.version>

<!-- 关键组件 -->
1. spring-ai-alibaba-agent-framework - Agent 框架
2. spring-ai-alibaba-starter-dashscope - 通义千问模型
3. selenium-java 4.18.1 - 浏览器自动化
4. graalvm.polyglot 24.2.1 - Python 执行引擎
```

**核心理念**：不重复造轮子，站在巨人肩膀上！

---

## 🏗️ 架构设计

### 整体架构图

```plain
┌─────────────┐
│   REST API  │  ← HTTP 接口暴露服务
└──────┬──────┘
       │
┌──────▼──────┐
│ ReactAgent  │  ← 核心 Agent（ReAct 模式）
└──────┬──────┘
       │
┌──────┴──────────────────────────────┐
│         Tools（工具层）              │
├──────────┬──────────┬───────────────┤
│ Browser  │  Python  │  FileSystem   │
│   Tool   │   Tool   │     Tools     │
└──────────┴──────────┴───────────────┘
       │
┌──────┴──────────────────────────────┐
│         Hooks（技能系统）            │
├──────────────┬──────────────────────┤
│ Skills Hook  │   Shell Hook         │
└──────────────┴──────────────────────┘
```

---

## 💻 核心代码实现

### 1️⃣ Agent 构建器：SkillsAgent

这是整个应用的**心脏**，负责组装所有组件。

```plain
@Service
public class SkillsAgent {
    
    public ReactAgent buildAgent(ChatModel chatModel) {
        // 1. 配置 Skills 注册中心（从用户目录加载技能）
        FileSystemSkillRegistry skillRegistry = FileSystemSkillRegistry.builder()
                .userSkillsDirectory(System.getProperty("user.home") + "/.agents/skills")
                .build();
        
        // 2. 创建 Skills Hook（拦截并执行技能）
        SkillsAgentHook skillsHook = SkillsAgentHook.builder()
                .skillRegistry(skillRegistry)
                .build();
        
        // 3. 创建 Shell Hook（支持命令执行）
        ShellToolAgentHook shellHook = ShellToolAgentHook.builder()
                .shellTool2(ShellTool2.builder(System.getProperty("user.dir"))
                    .withCommandTimeout(10000)
                    .build())
                .build();
        
        // 4. 构建 ReAct Agent
        ReactAgent agent = ReactAgent.builder()
                .name("skills-integration-agent")
                .systemPrompt("""
                    你是一个电脑管家，会接管用户电脑处理任务。你有以下重要能力：
                    
                    【Skills 技能系统】
                    - 你可以通过 npx skills 命令查找和安装各种技能
                    - 当用户问"如何做 X"、"找技能"时，使用 find-skills
                    
                    【浏览器能力】
                    - browser_tool: 浏览网页、点击、填表、截图
                    
                    【Python 执行能力】
                    - 执行 Python 代码，自动 pip install 缺失模块
                    
                    【Shell 执行能力】
                    - 安装软件、执行系统操作
                    """)
                .model(chatModel)
                .saver(new MemorySaver())  // 对话记忆
                .tools(
                    PythonTool.createPythonToolCallback(PythonTool.DESCRIPTION),
                    BrowserTool.createBrowserToolCallback(BrowserTool.DESCRIPTION, false),
                    WriteFileTool.createWriteFileToolCallback(WriteFileTool.DESCRIPTION),
                    ReadFileTool.createReadFileToolCallback(ReadFileTool.DESCRIPTION),
                    ListFilesTool.createListFilesToolCallback(ListFilesTool.DESCRIPTION)
                )
                .hooks(List.of(skillsHook, shellHook))
                .enableLogging(true)
                .build();
        
        return agent;
    }
}
```

**关键点解析**：

- `.tools()` - 注册底层工具（浏览器、Python、文件）
- `.hooks()` - 注册技能拦截器（动态技能、Shell）
- `.systemPrompt()` - 告诉 AI 它有哪些能力（非常重要！）

---

### 2️⃣ 自研 BrowserTool：不依赖 Sandbox

这是**完全独立实现**的浏览器自动化工具，基于 Selenium。

```plain
public class BrowserTool implements BiFunction<BrowserRequest, ToolContext, String> {
    
    private WebDriver driver;
    private boolean headless;
    
    public BrowserTool(boolean headless) {
        this.headless = headless;
        initializeDriver();
    }
    
    private void initializeDriver() {
        // 自动下载 ChromeDriver
        WebDriverManager.chromedriver().setup();
        
        ChromeOptions options = new ChromeOptions();
        if (headless) {
            options.addArguments("--headless=new");
        }
        options.addArguments("--disable-gpu", "--no-sandbox", "--window-size=1920,1080");
        
        this.driver = new ChromeDriver(options);
        this.driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    }
    
    @Override
    public String apply(BrowserRequest request, ToolContext toolContext) {
        return switch (request.action.toLowerCase()) {
            case "navigate" -> handleNavigate(request);
            case "click" -> handleClick(request);
            case "extract" -> handleExtract(request);
            case "screenshot" -> handleScreenshot(request);
            case "fill" -> handleFill(request);
            default -> "Error: Unknown action";
        };
    }
    
    // ... 具体实现方法
}
```

**支持的 7 种操作**：

1. `navigate` - 打开网页
2. `click` - 点击元素
3. `extract` - 提取文本
4. `screenshot` - 截图
5. `get_html` - 获取页面 HTML
6. `fill` - 填充输入框
7. `scroll` - 滚动页面

**为什么不基于 Sandbox？**

- 更轻量，无额外依赖
- 更灵活，完全控制
- 更符合项目需求

---

### 3️⃣ 增强 PythonTool：自动 pip install

这是 GraalVM Polyglot 的增强版本，**最大亮点是自动安装缺失模块**！

```plain
public class PythonTool implements BiFunction<PythonRequest, ToolContext, String> {
    
    @Override
    public String apply(PythonRequest request, ToolContext toolContext) {
        try (Context context = Context.newBuilder("python")
                .allowAllAccess(true)      // 允许完全访问
                .allowIO(true)             // 启用文件 I/O
                .allowNativeAccess(true)   // 启用原生访问
                .allowCreateProcess(true)  // 允许创建进程（用于 pip）
                .build()) {
            
            try {
                Value result = context.eval("python", request.code);
                return convertResultToString(result);
            } catch (PolyglotException e) {
                String errorMsg = e.getMessage();
                
                // 🔥 关键：检测模块缺失并自动安装
                if (errorMsg.contains("ModuleNotFoundError") || 
                    errorMsg.contains("No module named")) {
                    
                    String moduleName = extractModuleName(errorMsg);
                    if (moduleName != null) {
                        log.info("Missing module: {}, installing...", moduleName);
                        
                        // 执行 pip install
                        ProcessBuilder pb = new ProcessBuilder(
                            "pip", "install", moduleName, "--quiet"
                        );
                        Process process = pb.start();
                        int exitCode = process.waitFor();
                        
                        if (exitCode == 0) {
                            // 重新执行代码
                            Value result = context.eval("python", request.code);
                            return "Module '" + moduleName + "' installed. Result:\n" 
                                   + convertResultToString(result);
                        }
                    }
                }
                
                return "Error: " + errorMsg;
            }
        }
    }
}
```

**实战效果**：

```plain
# 用户代码
import requests
response = requests.get("https://api.github.com")
print(response.status_code)
```

**执行流程**：

1. 第一次执行 → 发现缺少 `requests`
2. 自动运行 `pip install requests`
3. 重新执行 → 成功返回 `200`
4. 回复："Module 'requests' was missing and has been installed. Result: 200"

---

### 4️⃣ Skills 技能系统：动态扩展

这是最像 Open Claw 的部分！**通过文件系统加载技能**。

#### 技能目录结构

```plain
C:\Users\yourname\.agents\skills\
├── find-skills/
│   └── SKILL.md
├── file-organizer/
│   └── SKILL.md
└── your-custom-skill/
    └── SKILL.md
```

#### SKILL.md 模板

```plain
---
name: find-skills
description: 帮助用户发现和安装技能
allowed-tools: [Bash]  # 声明需要的权限
---

# Find Skills

## 何时使用
当用户问：
- "如何优化 React 性能？"
- "有没有技能可以做代码审查？"
- "找一个生成 changelog 的技能"

## 使用方法
```bash
npx skills find react performance
npx skills add vercel-labs/agent-skills@react-best-practices
```

```plain
**关键配置**：
```java
// 在 SkillsAgent 中
FileSystemSkillRegistry skillRegistry = FileSystemSkillRegistry.builder()
    .userSkillsDirectory(System.getProperty("user.home") + "/.agents/skills")
    .build();

SkillsAgentHook skillsHook = SkillsAgentHook.builder()
    .skillRegistry(skillRegistry)
    .build();
```

**AI 就会知道**：

- 有这个技能可用
- 什么场景下应该调用
- 可以执行哪些命令

---

## 🎯 实战演示

### 场景 1：开发贪食蛇游戏

**用户请求**：

```plain
帮我开发一个贪食蛇 HTML 游戏，保存到桌面
```

**Agent 思考过程**：

1. 理解需求 → 需要编写 HTML+JS 代码
2. 选择工具 → WriteFileTool
3. 执行 → 保存为 `C:\Users\tuling\Desktop\snake.html`
4. 验证 → 可以用 BrowserTool 打开测试

**实际输出**：

```plain
✅ 已成功创建贪食蛇游戏！
文件路径：C:\Users\tuling\Desktop\snake.html
文件大小：4.2 KB

游戏说明：
- 方向键控制移动
- 吃到食物得分
- 撞墙或咬到自己游戏结束

要现在打开浏览器测试吗？
```

---

### 场景 2：查找并安装技能

**用户请求**：

```plain
有没有能优化 React 性能的技能？
```

**Agent 思考过程**：

1. 识别意图 → 用户在找技能
2. 触发 find-skills
3. 执行 `npx skills find react performance`
4. 返回结果

**实际回复**：

```plain
找到了相关技能！

📦 vercel-labs/agent-skills@react-best-practices
功能：React 和 Next.js 性能优化最佳实践
来源：Vercel 工程师团队

安装命令：
npx skills add vercel-labs/agent-skills@react-best-practices

要我帮你安装吗？
```

---

### 场景 3：浏览器自动化

**用户请求**：

```plain
帮我把 GitHub 首页截个图
```

**Agent 执行**：

```plain
browser_tool(action="navigate", url="https://github.com")
browser_tool(action="screenshot")
```

**返回结果**：

```plain
✅ 截图成功！
格式：PNG
大小：245 KB
数据：[Base64 编码，可直接显示]
```

---

## JavaClaw（抓虾） vs Open Claw🦞

**总体完成度**：**70%** 🎉

**缺少的 30%**：

- 即时通讯集成（飞书/钉钉/微信）
- MCP（Model Context Protocol）
- 可视化界面

---

## 🚀 下一步优化方向

### 1. 飞书集成（优先级：高）

```plain
@RestController
@RequestMapping("/api/lark")
public class LarkWebhookController {
    
    @PostMapping("/event")
    public String handleEvent(@RequestBody LarkEvent event) {
        // 1. 验证签名
        // 2. 解析用户消息
        // 3. 调用 Agent.invoke()
        // 4. 返回结果到飞书
        String reply = agent.call(event.getMessage());
        return larkService.sendMessage(event.getUserId(), reply);
    }
}
```

**内网穿透方案**：

- natapp / ngrok（开发）
- 云服务器（生产）

---

### 2. MCP Server 支持

```plain
@Bean
public McpClient mcpClient() {
    return McpClient.builder()
        .serverUrl("http://localhost:8081/mcp")
        .build();
}

// 在 Agent 中使用
agent.tools(new McpTool(mcpClient));
```

**可以连接**：

- 数据库
- 向量库
- 第三方 API

---

### 3. Web UI 界面

**技术栈推荐**：

- React + Vite（前端）
- WebSocket（实时通信）
- XTerm.js（终端模拟）

**功能规划**：

- 对话界面
- 任务执行日志
- 文件管理器
- 技能市场

---

## 💡 核心收获

### 1. Agent 框架没那么神秘

**本质就是**：

```plain
LLM + Tools + Memory + Planning = Agent
```

Spring AI Alibaba 把这些都封装好了，你只需要组装！

---

### 2. 工具决定能力边界

**你的 Agent 有多强，取决于你给了它什么工具**。

- BrowserTool → 可以操作网页
- PythonTool → 可以写代码
- FileSystem → 可以读写文件
- Skills → 可以无限扩展

**给 AI 工具，就像给孩子玩具**，越多越好！

---

### 3. Prompt 工程很重要

看看我们的 System Prompt：

```plain
你是一个电脑管家，会接管用户电脑处理任务...

【Skills 技能系统】
- 你可以通过 npx skills 命令查找和安装各种技能
- 当用户问"如何做 X"、"找技能"时，使用 find-skills

【浏览器能力】
- browser_tool: 浏览网页、点击、填表、截图
...
```

**这是在教 AI**：

- 你是谁（角色定位）
- 你会什么（能力清单）
- 什么时候用什么（决策逻辑）

**Prompt 写得好，Agent 更智能！**

---

## 🎁完整代码仓库

项目已开源在 Gitee/GitHub，包含：

- ✅ 完整源代码
- ✅ 配置示例
- ✅ 测试用例
- ✅ 部署文档

**地址**：

📎 [miniclaw-agent-example.zip](https://www.yuque.com/attachments/yuque/0/2026/zip/22309163/1773382633096-35d5b1c6-7de0-4c20-acfb-b5dc67e54331.zip)

[https://gitee.com/xscodeit/alibaba-agent-xs/tree/main/miniclaw-agent-example](https://gitee.com/xscodeit/alibaba-agent-xs/tree/main/miniclaw-agent-example)

---

## 📝 总结

我们用不到 **500 行核心代码**，实现了 Open Claw 70% 的功能：

- ✅ ReAct Agent 框架
- ✅ 浏览器自动化（Selenium）
- ✅ Python 执行（GraalVM + 自动 pip）
- ✅ 文件操作
- ✅ Shell 命令
- ✅ Skills 扩展系统

**缺少的 30%**（IM 集成、MCP、UI）只是锦上添花，核心能力已经完备！

**最重要的是**：

- 不依赖 Sandbox，更轻量
- 基于 Spring Boot，易上手
- 可以无缝集成企业应用
