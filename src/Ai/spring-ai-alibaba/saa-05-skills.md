---
title: "5.Skills"
sidebarGroup: "Spring AI Alibaba"
shortTitle: "5.Skills"
order: 5
date: 2026-05-27
category: "AI"
tag:
  - "Spring AI Alibaba"
  - "Agent"
description: "Agent Skills / Tools / MCP 的本质差异与最佳实践，以及 Spring AI Alibaba Skills 用法。"
---

> 来源：[5.Skills](https://www.yuque.com/geren-t8lyq/sk9iuh/nnczv3h6cdts7gpx?singleDoc#)  
> 配套代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs.git

> 嵌入图板：[打开](https://www.processon.com/view/link/6a1446090a44250db23cdfb7)

## Agent Skills-Tools-MCP的本质差异与最佳实践

> 本篇文章转自阿里JManus（现叫Lynxe）作者—沈询

- **Function Calling**：AI Agent 调用工具的基础能力，也是后面两个能够存在的基础。
- **MCP (Model Context Protocol)**：由 Anthropic 推动的开放标准，为 [LLM](https://zhida.zhihu.com/search?content_id=268669150&content_type=Article&match_order=1&q=LLM&zhida_source=entity) 应用提供标准化接口以连接和交互外部数据源和工具，现已捐赠给linux基金会。
- **Skills**：Anthropic [Claude](https://zhida.zhihu.com/search?content_id=268669150&content_type=Article&match_order=1&q=Claude&zhida_source=entity)的一个新的尝试，可以允许用户更细致的用文字定义指令、脚本和资源，跟MCP有竞合关系，我们后面会从不同角度来阐述这个竞合关系（虽然很多人认为是互补，但实际上，这两个是竞争关系更大一些）

### 为什么需要这些技术：理解工具调用的基础

要讲明白为什么这几个概念是竞合关系，我们需要先简单了解一下AI Agent工具调用的基本原理。

#### AI Agent工具调用的基本流程

![image.png](/Ai/spring-ai-alibaba/saa-05-skills/img-001.png)

一个典型的AI Agent工具调用流程是这样的：

1. **LLM接收用户请求和工具描述**

- 用户提出需求（比如"帮我查一下北京今天的天气"）
- 系统向LLM提供可用工具的列表和描述（比如"天气查询工具：可以查询指定城市的天气信息"）

1. **LLM决定是否需要调用工具**

- LLM根据用户需求和工具描述，判断是否需要调用工具
- 如果需要，LLM会生成结构化的工具调用请求

这里的关键是LLM返回的是结构化的JSON格式，而不是自然语言。比如用户说"帮我查一下北京今天的天气"，LLM可能会返回：

```plain
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "get_weather",
              "arguments": "{\"city\": \"北京\", \"date\": \"today\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ]
}
```

这种结构化的输出格式，就是Function Calling的核心机制。它让系统能够稳定地解析LLM的意图，而不需要复杂的文本解析逻辑。注意关键字段：

- `tool_calls`：当需要调用工具时，这里包含工具调用的信息
- `function.name`：要调用的工具名称
- `function.arguments`：工具的参数（JSON字符串格式）

1. **系统解析并执行工具调用**

- 系统解析LLM生成的工具调用请求
- 执行对应的工具函数（比如调用天气API）
- 获取工具执行结果 还是以上面的llm返回为例：

上面的JSON格式会被系统解析并转换为真正的函数调用。以JavaScript为例：

```plain
// 1. 从LLM响应中提取工具调用信息
const toolCall = response.choices[0].message.tool_calls[0];
const functionName = toolCall.function.name;  // "get_weather"
const functionArgs = JSON.parse(toolCall.function.arguments);  // {city: "北京", date: "today"}

// 2. 根据工具名称找到对应的函数
const tools = {
  get_weather: (city, date) => {
    // 执行天气查询逻辑
    return `北京今天天气：25°C，晴天`;
  },
  // ... 其他工具
};

// 3. 执行工具调用
const result = tools[functionName](functionArgs.city, functionArgs.date);
// 实际调用：tools["get_weather"]("北京", "today")
```

这个过程是自动的：系统根据`function.name`找到对应的函数，解析`function.arguments`获取参数，然后执行调用。这就是Function Calling让工具调用变得可预测和可靠的核心机制。

1. **将结果返回给LLM**

- 工具执行结果被返回给LLM
- LLM根据结果决定下一步行动（继续调用工具，或者生成最终回答）

#### 小结：工具调用的本质

这个流程的核心在于：LLM需要把用户的非结构化需求（一段自然语言文本）转换为结构化的函数调用（函数名和参数），然后与其他应用程序交互，再将结构化结果返回给模型，让模型能够基于这些结果进行下一步决策。

问题的本质在于，历史上其他系统（数据库、API、文件系统等）只能处理结构化信息，而LLM擅长处理非结构化信息（文本）。因此，LLM必须想办法在两种信息形式之间架起桥梁：将非结构化的用户需求转换为结构化的函数调用，这样才能与外部系统交互。

这就是Function Calling的本质，也是后面MCP和Skills能够存在的前置条件。

### 那既然有了工具调用，为什么又会有MCP和Skills呢？

Function Calling确实解决了核心问题：让LLM能够稳定地输出结构化的工具调用请求，实现了"非结构化→结构化"的转换。这是AI Agent工具能力的基础。

但在实际应用中，开发者很快发现了一个新的问题：**工具集成成本太高**。

#### Function calling会有工具集成成本高的问题

现实世界中，有大量的既有系统和数据：数据库里存储着业务数据，文件系统里有各种文档和代码，GitHub上有项目仓库和Issue，dingding里有团队沟通记录，还有各种API服务提供实时数据。这些既有系统里有着丰富的信息，如果能让LLM直接使用这些系统和数据，AI Agent的能力会大大增强。

但问题是：**如何让LLM能够使用这些既有系统？**

在Function Calling的框架下，每个既有系统都需要单独集成到应用中。每个组织或公司都有自己的API、认证方式、数据格式，开发者需要为每个组织或公司编写对应的函数实现。这就是MCP产生的原因：提供一个服务，可以让既有系统快速集成到LLM中。

MCP的核心其实还是基于Function Calling的。它做的事情很简单：把Function Calling的调用，在客户端转换成一套JSON+HTTP的请求。然后提供一套Server来响应这个JSON+HTTP请求，这样就能实现各类应用都可以被LLM使用的效果。

```plain
LLM -> Function Calling -> MCP Client -> JSON+HTTP请求 -> MCP Server -> 既有系统（GitHub/Slack/数据库等）
                                                                    ↓
LLM <- Function Calling结果 <- MCP Client <- JSON响应 <- MCP Server <- 既有系统返回结果
```

但MCP解决了工具集成的问题后，又出现了另一个问题。

#### Function calling和MCP都会有任务流程定义困难的问题

在实际使用中，用户经常需要让AI Agent按照特定的方式执行任务。比如，格式化Excel表格要按照公司的品牌指南，法律审查要遵循特定的合规性要求，数据分析要按照组织的工作流程。这些任务往往需要复杂的提示词和多个步骤的组合。

但在Function Calling和MCP的框架下，用户面临一个两难的问题：当前的大模型很难仅仅依托自己的模型能力就做出最优的工具调用步骤。很多任务需要特定的执行顺序、规则和约束，但把这些步骤全部写成代码又不太现实。就像我们在第一篇文章里讲的，模型的核心优势是面对不确定性时可以走一步看一步，动态调整策略。如果全部落成程序，就会丧失模型的核心优势。

举个例子，我们以Lynxe实际在跑的一个`new_branch`流程定义为例，我这个流程用文字写到一个markdown里面，每次都让模型遵照执行：

```plain
1) 确认本地的 VERSION 与 pom.xml 与 本地branch 中的版本一致，不一致的话以pom.xml为准
2) mvn package 
3) 进入 ui-vue3 运行pnpm lint 
4) 退回项目目录， git merge upstream/main
5) 项目目录，运行 make ui-deploy
6) git 提交 branch到origin
7) git 打包 tag名字与pom的版本号一致，先删除远程tag（如果存在）：git push upstream :refs/tags/v{版本号}，然后上传tag到 upstream (上传之前请先用git remote 看一下upstream是哪里，确认是spring-ai-alibaba/JManus)
```

这个流程有7个步骤，每个步骤都有特定的顺序、条件和规则。如果完全写成代码，每一步都要处理各种异常情况（比如版本不一致、tag已存在、upstream地址不对等），代码会变得非常复杂。但如果只给模型一个简单的提示词"帮我创建新分支"，模型可能无法按照这个精确的流程执行，或者执行顺序不对。 而用文字表达，非常直接简单，而且实际跑的过程中只有很小的概率会出错，非常爽。

而这就是这个问题的本质：**如何在尽可能的准确的前提下，能让用户能用文字（而非代码）指导模型按照特定的流程和规则执行任务？**

这就是Skills产生的原因（其实也是Lynxe的Func-Agent产生的核心原因）：提供一个方式，让用户可以用文字定义指令、脚本和资源，形成可复用的任务流程。

Skills的核心其实也是基于Function Calling的。它做的事情很巧妙：通过一个固化的函数和参数，让模型去查找和加载固定的skills文档。

**这里的关键是，Skills完全依赖于Function Calling这个基础能力。** 如果没有Function Calling，Skills就无法工作。Skills只是在Function Calling之上的一个巧妙应用：把"加载文档"这个操作封装成一个函数，然后让Claude在需要时自动调用。

具体工作流程是这样的：

1. **初始化阶段**：用户用文字定义指令、脚本和资源，打包成Skills（包含SKILL.md和可选的脚本、参考资料等）。Claude在启动时会读取所有Skills的元数据（名称和描述），这些元数据被加载到模型的上下文中（每个约100 token）。
2. **发现阶段**：当用户发起请求时，Claude会根据请求内容，对比已加载的Skills元数据，判断是否需要使用某个Skill。这个判断过程本质上就是LLM根据上下文做决策，跟Function Calling中判断是否需要调用工具是一样的。
3. **加载阶段（Function Calling）**：如果Claude判断需要某个Skill，它会**通过Function Calling机制**调用一个专门的加载函数（类似`load_skill(skill_name)`），将对应的SKILL.md文档内容读取并加载到当前上下文中。这一步完全依赖Function Calling的能力。
4. **执行阶段（继续使用Function Calling）**：SKILL.md的内容（包含指令、流程、示例等）被加入到上下文后，Claude按照文档中定义的指令执行任务。如果SKILL.md中定义了需要执行脚本（比如`scripts/rotate_pdf.py`），Claude还是会**通过Function Calling**调用执行脚本的函数。如果需要加载参考资料，同样是**通过Function Calling**调用读取文件的函数。

可以看到，**整个Skills的运行过程，从加载文档、执行脚本到读取资源，每一步都离不开Function Calling**。Skills并没有创造新的能力，它只是把Function Calling这个基础能力组织成了一个更易用的形式：让用户可以用文字定义流程，让Claude自动发现和加载相关知识。 从本质来说，他替代的是mcp 调用的函数里面，过去可能会用代码写的一套串接各种API的逻辑流程，用这种方式，可以增强流程的适应性，其实也是呼应了我们第二篇文章的核心观点：Agent将决策权完全下放给了 Agent 和 Prompt，能够解决原有写程序不能解决的问题——比如处理不确定性、动态调整策略、理解自然语言意图等。

```plain
Claude 判断是否需调用某 Skill（基于请求内容匹配已加载的 skill_name 与 description）
↓
若需要，则通过 Function Calling 调用 load_skill(skill_name)
↓
将对应 SKILL.md 的内容注入当前上下文，作为执行指令依据
↓
Claude 依照 SKILL.md 中定义的流程执行任务
↓
在执行过程中，按需通过 Function Calling：
  • 调用 bash 执行附带脚本
  • 调用 read_file 读取所需资源文件
↓
整合执行结果
```

### Function Calling、MCP、Skills的核心定位

通过前面的分析，我们可以看到Function Calling、MCP和Skills三者之间的本质关系：**MCP和Skills都是基于Function Calling的，它们只是在Function Calling这个基础能力之上的不同应用方式。**

**MCP的核心是解决与既有系统的接驳问题** ： 实际上，与外部系统接驳的方法并不只有MCP这一种——我们完全可以用curl、bash等传统方式来与程序接驳。MCP的价值在于它提供了一套标准化的接驳协议，让不同的工具和数据源能够以统一的方式被LLM使用。通过[JSON-RPC协议](https://zhida.zhihu.com/search?content_id=268669150&content_type=Article&match_order=1&q=JSON-RPC%E5%8D%8F%E8%AE%AE&zhida_source=entity)和标准化的工具描述格式，MCP降低了工具集成的成本，让开发者不需要为每个系统单独编写集成代码。但本质上，MCP更偏重是一套接驳标准，而不是唯一的接驳方式。

**Skills则实际上是一个sub-agent的包装** ： 它让用户可以用文字来写流程，替代了过去在MCP调用的函数里用代码写的一套串接各种API的逻辑流程。这种方式可以增强流程的环境适应性——因为模型可以根据实际情况动态调整策略，处理不确定性，理解自然语言意图。这正是我们第二篇文章提到的核心观点：Agent将决策权完全下放给了模型和Prompt，能够解决原有写程序不能解决的问题。但代价就是不可能100%准确，因为模型的行为存在不确定性，无法像传统代码那样保证完全可预测的执行结果。

从本质来说，Function Calling是基础能力，MCP是在这个基础上提供标准化接驳方案，而Skills是在这个基础上提供文字化流程定义方案。三者共同构成了AI Agent工具能力的完整体系。

### 三者的总结性对比表

## Agent Skill介绍

Skills 是可复用的、基于文件系统的资源，为 LLM 提供特定领域的专业知识：工作流程、上下文和最佳实践。与提示词（针对一次性任务的对话级指令）不同，Skills 按需加载，无需在多次对话中反复提供相同的指导。

![image.png](/Ai/spring-ai-alibaba/saa-05-skills/img-002.png)

一个 Skill 的最小形态只需要一个文件：

![image.png](/Ai/spring-ai-alibaba/saa-05-skills/img-003.png)

![image.png](/Ai/spring-ai-alibaba/saa-05-skills/img-004.png)

### SKILL 格式规范

根据Anthropic提出的规范，SKILL.md 由 YAML frontmatter（元数据） 和 Markdown body（指令正文） 两部分组成。

#### SKILL.md 格式规范

```yaml
---
name: skill-name
description: This skill should be used when...
---

# 技能名称
正文：功能说明、使用方法、可用资源列表等。
```

**必需字段**：`name`（建议小写字母、数字、连字符，最长 64 字符）、`description`（超长会被截断）。

合法示例：

```markdown
name: pdf-processing
name: data-analysis
name: code-review
```

非法示例：

```plain

name: PDF-Processing    # 不允许大写字母
name: -pdf               # 不能以连字符开头
name: pdf--processing    # 不允许连续连字符
```

#### 1.2.2 description 字段的写法建议

description 应该清晰描述 Skill 的功能和适用场景：

- 必须为 1-1024 个字符
- 应该描述该技能的作用以及何时使用。
- 应包含有助于代理识别相关任务的特定关键词。

好的示例：

```plain
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.
```

差的示例：

```plain
description: Helps with PDFs.
```

#### 1.2.3 Markdown 正文内容

元数据之后的 Markdown 正文部分就是 Skill 的核心指令。对正文格式没有硬性限制，只要能帮助 AI 有效执行任务即可。

建议包含以下内容：分步骤的操作说明、输入输出示例、常见边界情况处理。

建议正文控制在 500 行以内。如果内容较多，可以把详细的参考资料拆分到单独的文件中。

#### 1.2.4 最简示例

一个最简的 SKILL.md 只需要 name 和 description：

```plain

---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

#### 1.2.6 文件引用规范

在 SKILL.md 中引用其他文件时，请使用相对于 Skill 根目录的路径。例如：

- 引用参考文档：references/REFERENCE.md
- 引用脚本：scripts/extract.py

建议文件引用保持在一层深度，避免深层嵌套的引用链。

#### 1.2.7 可选目录结构

**scripts/ 目录**

存放 AI 可以运行的可执行代码。脚本应该是自包含的或明确说明依赖关系，包含有用的错误提示信息，并能妥善处理边界情况。常见支持的语言包括 Python、Bash 和 JavaScript。

**references/ 目录**

存放 AI 在需要时可以读取的补充文档，例如：REFERENCE.md（详细技术参考）、FORMS.md（表单模板或结构化数据格式）、或特定领域的文档（如 finance.md、legal.md）。

建议每个参考文件保持聚焦，因为 AI 是按需加载这些文件的，文件越小，消耗的上下文越少。

**assets/ 目录**

存放静态资源文件，包括：模板文件（文档模板、配置模板）、图片（示意图、示例图）、数据文件（查找表、Schema 定义）。

**1.3 三层渐进式加载机制**

![image.png](/Ai/spring-ai-alibaba/saa-05-skills/img-005.png)

这是 Agent Skills 规范最精妙的设计，借鉴了 UI/UX 领域的渐进式信息披露策略：

**关键价值：**即使安装了 20 个 Skill，初始加载也仅 1000-2000 tokens。相比单体式提示词，上下文使用量减少约 90%。

**L1 层：** Agent 启动时只加载所有 Skill 的 name + description，以 XML 格式注入系统提示词。Agent 此时只知道有哪些 Skill 可用。

**L2 层： **用户任务匹配某个 Skill 的描述时，Agent 读取完整 SKILL.md body。建议控制在 500 行以内。

L3 层： SKILL.md 中的指令引用外部文件时按需加载。关键是告诉 Agent 何时加载，如「当 API 返回非 200 时，读取 references/api-errors.md」。

**1.4 触发机制设计**

Skill 的触发完全依赖 description 字段，由**模型自主判断**当前任务是否匹配（Model-driven Activation），而非关键词硬编码匹配。

**description 写作要点：**

- 使用祈使语气：「Use this skill when...」
- 聚焦用户意图，而非 Skill 内部机制
- 适当「强势」，覆盖用户可能的各种表述
- 包含关键触发词

好的例子：

```plain

Analyze CSV and tabular data files — compute summary statistics,
add derived columns, generate charts, and clean messy data. Use this
skill when the user has a CSV, TSV, or Excel file and wants to
explore, transform, or visualize the data, even if they don't
explicitly mention "CSV" or "analysis."
```

差的例子：`Helps with PDFs.`

### Skill 设计模式（Google）

来源：Google Cloud Tech

规范告诉我们"Skill 长什么样"，但没告诉我们"Skill 内部的逻辑该怎么设计"。

Google ADK 团队研究了生态中各种 Skill 的实现方式，从 Anthropic 仓库到 Vercel 和 Google 内部指南，总结出 5 种反复出现的设计模式。

![19e685d54b2bf.png](/Ai/spring-ai-alibaba/saa-05-skills/img-006.png)

**4.1 五种 Skill 设计模式**

#### 模式一：Tool Wrapper — 给 Agent 装"技能包"

**核心逻辑：**让 Agent 在需要时才加载特定领域的知识，而不是把所有东西塞进 system prompt。

```markdown
---
name: api-expert
description: FastAPI 开发最佳实践与规范。适用于构建、审查或调试 FastAPI 应用程序时使用。
---
## 核心规范
加载 'references/conventions.md' 获取完整规范列表。

## 审查代码时
1. 加载规范参考文件
2. 对照每条规范逐一检查用户代码
3. 针对每处违规，引用具体规则并给出修改建议
```

**关键：**SKILL.md 本身不包含完整规范，而是告诉 Agent 去哪里加载规范。

**适用场景：**封装框架/库的编码规范、团队内部代码风格指南、特定技术栈的最佳实践。

#### 模式二：Generator — 填空题式文档生成

**核心逻辑：**用模板 + 风格指南强制输出一致性。

```markdown
---
name: report-generator
description: 以 Markdown 格式生成结构化技术报告。
---
第一步：加载 'references/style-guide.md'，获取语气和格式规范。
第二步：加载 'assets/report-template.md'，获取所需的输出结构。
第三步：向用户询问缺失信息：
  - 主题或议题
  - 关键发现或数据要点
  - 目标受众
第四步：按照风格指南规范填写模板。
第五步：返回已完成的报告。
```

**关键：**Step 3 的主动提问——Agent 不会瞎猜，缺什么直接问。

**适用场景：**标准化技术文档生成、API 文档自动生成、项目脚手架。

#### 模式三：Reviewer — 代码审查自动化

**核心逻辑：**把"查什么"和"怎么查"分离。检查清单独立维护，Agent 只负责执行打分。

```markdown
---
name: code-reviewer
description: 审查 Python 代码的质量、风格与常见错误。
---
第一步：加载 'references/review-checklist.md'。
第二步：仔细阅读用户的代码。
第三步：逐一应用清单中的每条规则。针对每处违规：
  - 记录行号
  - 划分严重等级：错误 / 警告 / 提示
  - 解释问题的原因，而不仅仅是描述问题本身
  - 给出具体的修改建议
第四步：按严重等级分组，输出结构化的审查报告。
```

**关键：**Step 3 的 "WHY not WHAT"——不只指出问题，还要解释为什么是问题。

**适用场景：**自动化 PR 审查、安全漏洞扫描、代码风格检查。

#### 模式四：Inversion — 让 Agent 先问你

**核心逻辑：**翻转传统交互模式。不是用户驱动 prompt → Agent 执行，而是 Agent 先采访用户，收集完整需求后再动手。

```markdown

---
name: project-planner
description: 通过结构化提问收集需求，
  为新软件项目制定规划。
---
在所有阶段完成之前，请勿开始构建。

## 第一阶段 — 问题探索
每次只提一个问题：
- 问题1："这个项目解决什么问题？"
- 问题2："主要用户群体是哪些？"
- 问题3："预期的使用规模是多少？"

## 第二阶段 — 技术约束
仅在第一阶段全部回答完毕后进行：
- 问题4："部署环境是什么？"
- 问题5："是否有技术栈偏好？"
- 问题6："哪些是不可妥协的硬性需求？"

## 第三阶段 — 综合整理
收集所有信息 → 加载模板 → 填写内容 → 呈现结果 → 迭代优化
```

**适用场景：**新项目规划、系统架构设计、需求不明确时的需求澄清。

#### 模式五：Pipeline — 带检查点的多步工作流

**核心逻辑：**把复杂任务拆成严格顺序的步骤，每步都有明确的输入/输出和通过条件，Agent 不能跳步。

```markdown

---
name: doc-pipeline
description: 通过多步骤流水线，
  从 Python 源代码生成 API 文档。
---
按顺序执行每个步骤，不得跳过任何步骤。

## 第一步 — 解析与清点
分析代码，提取所有公开 API，以清单形式呈现。
询问："这是完整的公开 API 列表吗？"

## 第二步 — 生成文档字符串
针对每个缺少文档字符串的函数，生成内容并提交用户确认。
在用户确认之前，不得进入第三步。

## 第三步 — 组装文档
加载模板，将所有内容汇编为统一的 API 参考文档。

## 第四步 — 质量检查
对照清单进行审查，在呈现最终文档之前修复所有问题。
```

**关键：**Step 2 → Step 3 的 【确认前不得继续】 是硬性约束——用户不点头，Agent 不能往下走。

**适用场景：**从代码生成文档、多阶段内容生产、需要人工检查点的自动化流程。

**4.2 设计模式选择指南**

![image](/Ai/spring-ai-alibaba/saa-05-skills/img-007.webp)

## 在 Agent 中使用 Skills

![diagram](/Ai/spring-ai-alibaba/saa-05-skills/diagram-008.jpg)

### 使用 FileSystemSkillRegistry

智能体支持从本地文件系统中加载 skills 技能，以下示例假设 `skills` 在进程工作目录，如：

```plain
skills/
├── pdf-extractor/
	├── SKILL.md
	├── references/
	└── scripts/
```

**FileSystemSkillRegistry + SkillsAgentHook**

```java
SkillRegistry registry = FileSystemSkillRegistry.builder()
  .projectSkillsDirectory(System.getProperty("user.dir") + "/skills")
  .build();

SkillsAgentHook hook = SkillsAgentHook.builder()
  .skillRegistry(registry)
  .build();

ReactAgent agent = ReactAgent.builder()
  .name("skills-agent")
  .model(chatModel)
  .saver(new MemorySaver())
  .hooks(List.of(hook))
  .build();

agent.call("请介绍你有哪些技能");
```

目录配置：`userSkillsDirectory(String|Resource)`、`projectSkillsDirectory(String|Resource)`；不设置时用户级默认 `~/saa/skills`，项目级默认 `./skills`，同名技能“项目级别”覆盖“用户级别”。

### 使用 ClasspathSkillRegistry

技能放在 `src/main/resources/skills` 或随 JAR 打包。可选 `.basePath("/tmp")` 指定 JAR 内资源复制到的目录（默认 `/tmp`）。

**ClasspathSkillRegistry**

```java
SkillRegistry registry = ClasspathSkillRegistry.builder()
  .classpathPath("skills")
  .build();

SkillsAgentHook hook = SkillsAgentHook.builder()
  .skillRegistry(registry)
  .build();

ReactAgent agent = ReactAgent.builder()
  .name("skills-agent")
  .model(chatModel)
  .hooks(List.of(hook))
  .build();
```

### 完整集成示例（Skills + Python + Shell）

技能常需配合脚本执行（如技能目录下的 Python 脚本）和 Shell 命令。下面示例使用 **ClasspathSkillRegistry** 加载技能、**SkillsAgentHook** 提供 `read_skill`、**ShellToolAgentHook** 提供 Shell 工具、**PythonTool** 提供 Python 执行能力，Agent 可根据技能说明读取并处理技能目录下的文件。

**Skills + Python + Shell 完整集成**

```java
import com.alibaba.cloud.ai.graph.agent.ReactAgent;
import com.alibaba.cloud.ai.graph.agent.hook.skills.SkillsAgentHook;
import com.alibaba.cloud.ai.graph.agent.hook.shelltool.ShellToolAgentHook;
import com.alibaba.cloud.ai.graph.agent.tools.PythonTool;
import com.alibaba.cloud.ai.graph.agent.tools.ShellTool2;
import com.alibaba.cloud.ai.graph.checkpoint.savers.MemorySaver;
import com.alibaba.cloud.ai.graph.skills.registry.classpath.ClasspathSkillRegistry;
import com.alibaba.cloud.ai.graph.skills.registry.SkillRegistry;

// 1. 技能注册表：从 classpath:skills 加载（如 src/main/resources/skills/）
SkillRegistry registry = ClasspathSkillRegistry.builder()
  .classpathPath("skills")
  .build();

// 2. Skills Hook：注册 read_skill 工具并注入技能列表到系统提示
SkillsAgentHook skillsHook = SkillsAgentHook.builder()
  .skillRegistry(registry)
  .build();

// 3. Shell Hook：提供 Shell 命令执行（工作目录可指定，如当前工程目录）
ShellToolAgentHook shellHook = ShellToolAgentHook.builder()
  .shellTool2(ShellTool2.builder(System.getProperty("user.dir")).build())
  .build();

// 4. 构建 Agent：同时挂载 Skills Hook、Shell Hook 和 Python 工具
ReactAgent agent = ReactAgent.builder()
  .name("skills-integration-agent")
  .model(chatModel)
  .saver(new MemorySaver())
  .tools(PythonTool.createPythonToolCallback(PythonTool.DESCRIPTION))
  .hooks(List.of(skillsHook, shellHook))
  .enableLogging(true)
  .build();

// 5. 调用示例：用户请求处理技能目录下的文件时，模型可先 read_skill 再按技能说明调用 Python/Shell
String skillFilePath = "/path/to/skills/pdf-extractor/saa-roadmap.pdf";  // 实际路径来自技能目录或 hook.listSkills()
AssistantMessage response = agent.call("请从 " + skillFilePath + " 文件中提取关键信息。");
```

- **SkillRegistry**：`FileSystemSkillRegistry` 用 `projectSkillsDirectory(path)` 或 `ClassPathResource("skills")`；`ClasspathSkillRegistry` 用 `classpathPath("skills")`。
- **ShellTool2**：`ShellTool2.builder(workDir).build()`，`workDir` 为 Shell 执行的工作目录（如 `System.getProperty("user.dir")`）。
- **PythonTool**：`PythonTool.createPythonToolCallback(PythonTool.DESCRIPTION)` 即够用，如需自定义描述可传第二个参数。
- 技能列表中会包含每个技能的 `skillPath`，模型可用该路径拼出技能目录下文件的绝对路径并交给 Python/Shell 处理。

---

### 高级用法

#### 渐进式工具 Tool 披露

通过将工具与 Skill 技能名绑定，可以做到工具跟随 Skill 实现渐进式披露：仅当模型对该技能调用了 `read_skill` 后，对应工具才会加入当次请求，实现按需暴露。激活后该技能的工具在会话后续轮次中仍可用。

**groupedTools 绑定工具到技能**

```java
Map<String, List<ToolCallback>> groupedTools = Map.of(
  "my-skill",   // 与 SKILL.md 的 name 一致，如 'pdf-extractor'
  List.of(myTool)
);

SkillsAgentHook hook = SkillsAgentHook.builder()
  .skillRegistry(registry)
  .groupedTools(groupedTools)
  .build();
```

#### 生产环境配置

##### 自动重载技能

**启用技能自动重载**

```java
SkillsAgentHook hook = SkillsAgentHook.builder()
  .skillRegistry(registry)
  .autoReload(true)
  .build();
```

每次 Agent 执行前会调用 `registry.reload()`（若实现支持；不支持则抛 `UnsupportedOperationException`，Hook 会捕获并打 debug 日志）。

注意，每次 Agent 执行可能包含多次模型推理，`registry.reload()` 仅会在第一次推理时执行并加载最新的 skills，这样能保证同一次 Agent 执行时行为的连续性。

#### 用户级与项目级目录

**用户级与项目级技能目录**

```java
SkillRegistry registry = FileSystemSkillRegistry.builder()
  .userSkillsDirectory("/home/user/saa/skills")
  .projectSkillsDirectory("/app/project/skills")
  .build();
```

同名技能项目覆盖用户。

#### 自定义系统提示模板

SAA 框架内置了 Skill Prompt 模板，用来引导实现 Skill 的渐进式披露。用户可结合自己系统的 Skill 组织方式定制 Prompt 模板。

**自定义技能系统提示模板**

```java
SystemPromptTemplate customTemplate = SystemPromptTemplate.builder()
  .template("## 可用技能\n{skills_list}\n\n## 加载说明\n{skills_load_instructions}")
  .build();

FileSystemSkillRegistry registry = FileSystemSkillRegistry.builder()
  .projectSkillsDirectory("./skills")
  .systemPromptTemplate(customTemplate)
  .build();
```

模板变量：`{skills_list}`、`{skills_load_instructions}`。

#### 拓展 SkillRegistry 实现

实现 `SkillRegistry` 接口（`get`、`listAll`、`contains`、`size`、`readSkillContent`、`getSkillLoadInstructions`、`getRegistryType`、`getSystemPromptTemplate`，可选 `reload()`）即可接入现有 Skills 体系。`SkillMetadata` 需包含 `name`、`description`、`skillPath`（及可选 `source`）。可参考 `AbstractSkillRegistry`、`FileSystemSkillRegistry`、`ClasspathSkillRegistry`。

---

## 最佳实践与性能建议

- **控制 SKILL.md 大小**：单文件建议约 1.5k–2k tokens，长内容放 `references/` 并在正文中列路径。
- **技能名称一致**：`name`、`read_skill` 参数、`groupedTools` 的 key 保持一致。
- **按需使用 groupedTools**：仅需「随技能激活」的工具用 groupedTools，其余用 Agent 的 `.tools()` 即可。
- **常用 API**：`hook.listSkills()`、`hook.hasSkill(name)`、`hook.getSkillCount()`；`registry.reload()`（ClasspathSkillRegistry 支持）。
