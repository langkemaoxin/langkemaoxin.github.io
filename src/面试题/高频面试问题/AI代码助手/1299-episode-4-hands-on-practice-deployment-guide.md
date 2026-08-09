---
title: "第 4 集：终极实战演练与部署指南"
sidebarGroup: "AI代码助手"
shortTitle: "第 4 集：终极实战演练与部署指南"
order: 1299
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "摘要：恭喜！你已经完成了所有的开发工作。本节我们将进行“地狱级”代码测试，验证 AI 的审计能力；并学习如何将项目打包成 JAR 文件，脱离 IDE 运行，让你的电脑变成一台真正的 AI 服务器。1. 🧪 终极测试：烂代码样本 (The "
article: false
---

> 来源：[第 4 集：终极实战演练与部署指南](https://www.yuque.com/tulingzhouyu/db22bv/magwexcmaggixo85)

**摘要**：恭喜！你已经完成了所有的开发工作。本节我们将进行“地狱级”代码测试，验证 AI 的审计能力；并学习如何将项目打包成 JAR 文件，脱离 IDE 运行，让你的电脑变成一台真正的 AI 服务器。

## 1. 🧪 终极测试：烂代码样本 (The "Rotten" Code)

为了验证 AI 到底是不是在“胡说八道”，我们需要一段逻辑通顺但隐患重重的代码。请在演示时复制以下代码放入你的系统。

### 1.1 测试样本 (UserUtils.java)

**codeJava**

```plain
public class UserUtils {
    // 这是一个充满槽点的代码片段
    public String handle(List&lt;String&gt; list, String type) {
        String s = "";
        
        // ❌ 槽点1：使用 == 比较字符串 (这是 Java 新手最容易犯的错)
        if (type == "VIP") {
            // ❌ 槽点2：没有判空，如果 list 为 null，下面会报 NPE
            for (int i = 0; i < list.size(); i++) {
                String u = list.get(i);
                // ❌ 槽点3：魔法数字 5，应该定义常量
                if (u.length() > 5) {
                    // ❌ 槽点4：在循环中进行 String 拼接，性能极差 (O(n^2))
                    s = s + u + ",";
                    // ❌ 槽点5：生产环境禁止使用 System.out 打印日志
                    System.out.println("Add user: " + u);
                }
            }
        } else {
            // ❌ 槽点6：返回 null 会导致调用方空指针，应返回空字符串
            return null;
        }
        return s;
    }
}
```

### 1.2 预期 AI 审查结果 (Checklist)

在视频中，请重点检查 AI 是否指出了以下问题：

- 
&lt;!-- card:checkbox --&gt;

**致命 Bug**：指出 type == "VIP" 应该是 type.equals("VIP")。

- 
&lt;!-- card:checkbox --&gt;

**性能隐患**：指出循环内字符串拼接应使用 StringBuilder。

- 
&lt;!-- card:checkbox --&gt;

**代码规范**：指出 System.out.println 应改为日志框架 log.info。

- 
&lt;!-- card:checkbox --&gt;

**评分**：通常应在 **40-50分** 左右（不及格）。

---

## 2. 📦 项目打包与脱离 IDE 运行

开发完成后，我们要把它打包成一个可执行文件，这样你发给同事，或者部署到服务器上都能跑。

### 2.1 这里的坑：Maven 打包配置

确保你的 pom.xml 里有 Spring Boot 的打包插件（Cursor 生成的代码通常自带，但需检查）：

**codeXml**

```plain
&lt;build&gt;
    &lt;plugins&gt;
        &lt;plugin&gt;
            &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
            &lt;artifactId&gt;spring-boot-maven-plugin&lt;/artifactId&gt;
            &lt;configuration&gt;
                &lt;excludes&gt;
                    &lt;exclude&gt;
                        &lt;groupId&gt;org.projectlombok&lt;/groupId&gt;
                        &lt;artifactId&gt;lombok&lt;/artifactId&gt;
                    &lt;/exclude&gt;
                &lt;/excludes&gt;
            &lt;/configuration&gt;
        &lt;/plugin&gt;
    &lt;/plugins&gt;
&lt;/build&gt;
```

### 2.2 执行打包命令

打开终端 (Terminal)，进入项目根目录，运行：

**codeBash**

```plain
# -DskipTests 表示跳过单元测试（防止测试用例报错卡住打包）
mvn clean package -DskipTests
```

### 2.3 启动 JAR 包

打包成功后，在 target 目录下会生成一个 ai-code-reviewer-0.0.1-SNAPSHOT.jar。
输入以下命令启动：

**codeBash**

```plain
java -jar target/ai-code-reviewer-0.0.1-SNAPSHOT.jar
```

**成功标志**：看到 Spring 的 Logo 出现，且日志显示 Started AiCodeReviewerApplication in x.xxx seconds。
此时访问 http://localhost:8080，你的应用依然完美运行！

---

## 3. 🧩 项目全景复盘 (架构图)

在视频最后，可以用这张图帮观众梳理知识点，增加课程的专业度。

**codeMermaid**

```plain
graph TD
    User[用户浏览器] -->|1. SSE 连接 /api/review| Controller[CodeReviewController]
    
    subgraph Spring Boot 后端
        Controller -->|2. 构建 Prompt| PromptTemplate[Prompt 工程]
        PromptTemplate -->|3. 发送请求| AIClient[Spring AI ChatClient]
    end
    
    subgraph 阿里云百炼
        AIClient -->|4. HTTP 调用 (OpenAI Protocol)| Qwen[通义千问大模型]
    end
    
    Qwen -->|5. 流式返回 Token| AIClient
    AIClient -->|6. Flux 数据流| Controller
    Controller -->|7. 推送 Event| User
    
    subgraph 前端渲染
        User -->|8. 正则清洗 data: 前缀| JS[JavaScript]
        JS -->|9. Markdown 转 HTML| Marked[Marked.js]
    end
```

---

## 4. 🚀 课后作业与扩展方向

为了增加粉丝粘性，可以布置以下“作业”，并在下一期视频或粉丝群解答：

- **作业一：给 AI 换个脑子**

- 尝试修改 application.yml，把模型从 qwen-turbo 换成 qwen-plus，看看代码重构的质量有没有提升？

- **作业二：增加“一键复制”功能**

- 前端生成的代码块目前不能复制，能不能让 Cursor 帮忙写一个 JS，在代码块右上角加个“Copy”按钮？

- **进阶挑战：保存历史记录**

- 引入 MySQL 和 MyBatis-Plus，把每次 AI 的审查报告存入数据库，做一个“历史审查记录”列表页。

---

## 5. 🎁 粉丝福利话术 (用于视频结尾)

**（配合画面：展示整理好的文件夹，包含源码、PDF文档、Key申请教程）**

“做这个项目的所有代码、我整理的 3 份详细 PDF 文档（环境配置、后端实现、前端技巧），以及刚才演示用的烂代码样本，我都打包好了。”

“大家不用一个字一个字敲，**关注我的频道，在评论区回复【代码审查】**，或者看简介里的链接，直接拿走！祝大家都能拥有自己的 AI 架构师，我们下个项目见！”
