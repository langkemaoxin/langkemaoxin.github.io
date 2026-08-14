---
title: "2. 快速使用Spring AI Alibaba Agent Framework"
sidebarGroup: "Spring AI Alibaba"
shortTitle: "2. 快速使用Spring AI Alibaba Agent Framework"
order: 2
date: 2026-07-14
category: "AI"
tag:
  - "Spring AI Alibaba"
  - "Agent"
description: "Agent的5种模式在之前SpringAi系列课中， 给大家讲过Agent的5种模式， 没有Agent框架（单纯用SpringAi），其实也能实现Agent，但是有很多缺点，会在本课程中详细讲解，如果需要Agent更成熟的解决方案（更灵活的"
---

> 来源：[2. 快速使用Spring AI Alibaba Agent Framework](https://www.yuque.com/geren-t8lyq/sk9iuh/plni9ql87wtpyivi?singleDoc#)  
> 配套代码：https://gitee.com/xscodeit/spring-ai-alibaba-xs.git

## Agent的5种模式

> 在之前SpringAi系列课中， 给大家讲过Agent的5种模式， 没有Agent框架（单纯用SpringAi），其实也能实现Agent，但是有很多缺点，会在本课程中详细讲解，如果需要Agent更成熟的解决方案（更灵活的编排、更高的扩展性）， Agent Framework框架更好。

### [评估优化器模式](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/evaluator-optimizer)(**evaluator-optimizer)**

根据任务-->生成信息--->通过评估器不断完善--->最终输出结果

![image](/Ai/spring-ai-alibaba/saa-02-quickstart/img-001.png)

这个模式实现了双 LLM 过程，其中一个模型生成响应，另一个模型在迭代循环中提供评估和反馈

1. 生成器 LLM 为给定任务产生初始解决方案
2. 评估器 LLM 根据质量标准评估解决方案
3. 如果解决方案通过评估，则作为最终结果返回
4. 如果需要改进，反馈被纳入新的生成周期
5. 重复该过程直到达到满意的解决方案

示例代码：

```java

@SpringBootApplication
public class Application {

	public static void main(String[] args) {
		SpringApplication.run(Application.class, args);
	}

	@Bean
	public CommandLineRunner commandLineRunner(DashScopeChatModel dashScopeChatModel) {
		var chatClient =  ChatClient.create(dashScopeChatModel);
		return args -> { 
			 new SimpleEvaluatorOptimizer(chatClient).loop("""
					<user input>
					 面试被问： 怎么高效的将100行list<User>数据，转化成map<id，user>，不是用stream.
					</user input>
					""");
		};
	}
}

```

```java

public class SimpleEvaluatorOptimizer {  
      
    private final ChatClient chatClient;
      
    // 中文生成器提示词  
    private static final String GENERATOR_PROMPT = """
        你是一个Java代码生成助手。请根据任务要求生成高质量的Java代码。
        重要提醒：
        - 第一次生成时，创建一个基础但完整的实现  
        - 如果收到反馈，请仔细分析每一条建议并逐一改进  
        - 每次迭代都要在前一版本基础上显著提升代码质量  
        - 不要一次性实现所有功能，而是逐步完善  
          
        必须以JSON格式回复：  
        {"thoughts":"详细说明本轮的改进思路","response":"改进后的Java代码"}  
            """;
      
    // 中文评估器提示词    
    private static final String EVALUATOR_PROMPT = """  
        你是一个非常严格的面试官。请从以下维度严格评估代码：
            1. 代码是否高效：从底层分析每一个类型以满足最佳性能！
              
            评估标准：
            - 只有当代码满足要求达到优秀水平时才返回PASS
            - 如果任何一个维度有改进空间，必须返回NEEDS_IMPROVEMENT 
            - 提供具体、详细的改进建议  
              
            必须以JSON格式回复：  
            {"evaluation":"PASS或NEEDS_IMPROVEMENT或FAIL","feedback":"详细的分维度反馈"}  
              
            记住：宁可严格也不要放松标准！ 
        """;

    public SimpleEvaluatorOptimizer(ChatClient chatClient) {  
        this.chatClient = chatClient;  
    }

    int iteration = 0;
    String context = "";
    public RefinedResponse loop(String task) {
            System.out.println("=== 第" + (iteration + 1) + "轮迭代 ===");  
              
            // 生成代码  
            Generation generation = generate(task,context);
              
            // 评估代码  
            EvaluationResponse evaluation = evaluate(generation.response(), task);
            System.out.println("生成结果: " + generation.response());
            System.out.println("评估结果: " + evaluation.evaluation());
            System.out.println("反馈: " + evaluation.feedback());  
              
            if (evaluation.evaluation() == EvaluationResponse.Evaluation.PASS) {  
                System.out.println("代码通过评估！");
                return new RefinedResponse(generation.response());
            }
            else{
                // 准备下一轮的上下文
                context = String.format("之前的尝试:\n%s\n\n评估反馈:\n%s\n\n请根据反馈改进代码。",
                        generation.response(), evaluation.feedback());
                iteration++;
                return loop(task);
            }
    }  
      
    private Generation generate(String task, String context) {
        return chatClient.prompt()  
            .user(u -> u.text("{prompt}\n{context}\n任务: {task}")
                .param("prompt", GENERATOR_PROMPT)
                .param("context", context)
                .param("task", task))  
            .call()  
            .entity(Generation.class);  
    }  
      
    private EvaluationResponse evaluate(String content, String task) {  
        return chatClient.prompt()  
            .user(u -> u.text("{prompt}\n\n任务: {task}\n\n代码:\n{content}")  
                .param("prompt", EVALUATOR_PROMPT)  
                .param("task", task)  
                .param("content", content))  
            .call()  
            .entity(EvaluationResponse.class);  
    }  
      
    // 使用原始的记录类  
    public static record Generation(String thoughts, String response) {}  
      
    public static record EvaluationResponse(Evaluation evaluation, String feedback) {  
        public enum Evaluation { PASS, NEEDS_IMPROVEMENT, FAIL }  
    }  
      
    public static record RefinedResponse(String solution) {}
}
```

1. 一个模型作为由浅入深的代码生成器
2. 另一个模型作为性能分析员
3. 一直优化直到最佳

### [路由模式](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/routing-workflow)(routing-workflow)

模式能够根据用户请求和上下文的分类将输入智能路由到专门的处理程序。

![image](/Ai/spring-ai-alibaba/saa-02-quickstart/img-002.png)

这个工作流特别适用于复杂任务，其中：

- **路由器LLM**: 通过设置提示词进行路由规则设定，由usermessage决定路由的分支。
- 分类可以通过 LLM 或业务代码进行处理
- 不同类型的输入需要不同的专门处理或专业知识

### [编排工作者](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/orchestrator-workers)(orchestrator-workers)

这种模式是一种灵活的方法，用于处理需要动态任务分解和专门处理的复杂任务 manus就是这个模式

![image](/Ai/spring-ai-alibaba/saa-02-quickstart/img-003.png)

该模式包含三个主要组件：

- **编排器（Orchestrator）**：分析任务并确定所需子任务的LLM
- **工作者（Workers）**：执行特定子任务的专门 LLM
- **合成器（Synthesizer）**：将工作者输出合并为最终结果的组件

```java

public class SimpleOrchestratorWorkers {  
      
    private final ChatClient chatClient;
      
    // 中文编排器提示词  
    private static final String ORCHESTRATOR_PROMPT = """  
                你是一个项目管理专家，需要将复杂任务分解为可并行执行的专业子任务。
                    任务: {task}
                    请分析任务的复杂性和专业领域需求，将其分解为2-4个需要不同专业技能的子任务。
                    每个子任务应该：
                    1. 有明确的专业领域（如：前端开发、后端API、数据库设计、测试等）
                    2. 可以独立执行
                    3. 有具体的交付物
                    
                    请以JSON格式回复：
                    {
                        "analysis": "任务复杂度分析和分解策略",
                        "tasks": [
                            {
                                "type": "后端API开发",
                                "description": "设计并实现RESTful API接口，包括数据验证和错误处理"
                            },
                            {
                                "type": "前端界面开发",
                                "description": "创建响应式用户界面，实现与后端API的交互"
                            },
                            {
                                "type": "数据库设计",
                                "description": "设计数据表结构，编写SQL脚本和索引优化"
                            }
                        ]
                    }
            """;  
      
    // 中文工作者提示词  
    private static final String WORKER_PROMPT = """  
            你是一个{task_type}领域的资深专家，请完成以下专业任务：
              项目背景: {original_task}
              专业领域: {task_type}
              具体任务: {task_description}
              
              请按照行业最佳实践完成任务，包括：
              1. 技术选型和架构考虑
              2. 具体实现方案
              3. 潜在风险和解决方案
              4. 质量保证措施
              
              请提供专业、详细的解决方案。
            """;  
      
    public SimpleOrchestratorWorkers(ChatClient chatClient) {  
        this.chatClient = chatClient;  
    }  
      
    public void process(String taskDescription) {
        System.out.println("=== 开始处理任务 ===");  
          
        // 步骤1: 编排器分析任务  
        OrchestratorResponse orchestratorResponse = chatClient.prompt()
            .system(p -> p.param("task", taskDescription))
            .user(ORCHESTRATOR_PROMPT)
            .call()
            .entity(OrchestratorResponse.class);  
          
        System.out.println("编排器分析: " + orchestratorResponse.analysis());  
        System.out.println("子任务列表: " + orchestratorResponse.tasks());  
          
        // 步骤2: 工作者处理各个子任务  
        orchestratorResponse.tasks().stream()
            .map(task -> {  
                System.out.println("-----------------------------------处理子任务: " + task.type()+"--------------------------------");
                String content = chatClient.prompt()
                        .user(u -> u.text(WORKER_PROMPT)
                                .param("original_task", taskDescription)
                                .param("task_type", task.type())
                                .param("task_description", task.description()))
                        .call()
                        .content();
                System.out.println(content);
                return task;
            }).toList();
          
        System.out.println("=== 所有工作者完成任务 ===");  
   }
      
    // 数据记录类  
    public record Task(String type, String description) {}  
    public record OrchestratorResponse(String analysis, List<Task> tasks) {}  
    public record FinalResponse(String analysis, List<String> workerResponses) {}  
}
```

测试

```java

@SpringBootApplication
public class Application {

	public static void main(String[] args) {
		SpringApplication.run(Application.class, args);
	}

	@Bean
	public CommandLineRunner commandLineRunner(DashScopeChatModel dashScopeChatModel) {
		var chatClient =  ChatClient.create(dashScopeChatModel);
		return args -> {
		new SimpleOrchestratorWorkers(chatClient)
					 .process("设计一个企业级的员工考勤系统，支持多种打卡方式和报表生成");

		};
	}
}
```

### [链接](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/chain-workflow)（**chain-workflow**）

该模式将复杂的任务分解为一系列步骤，其中每个 LLM 调用都会处理前一个调用的输出。

![image](/Ai/spring-ai-alibaba/saa-02-quickstart/img-004.png)

这种模式特别适用于：

- 具有清晰顺序步骤的任务
- 当您愿意用延迟换取更高准确性时
- 每个步骤都建立在前一步输出基础上的场景

**使用场景**

常见应用包括：

- 数据转换管道
- 多步骤文本处理
- 结构化步骤的文档生成

> 与 `orchestrator-workers` 或 `evaluator-optimizer` 模式不同，链式工作流不是基于多个独立的 LLM 角色协作，而是通过单一的处理链条，每个步骤都建立在前一步的输出基础上

**代码**

```java

public class DocumentGenerationChainWorkflow {
      
    private final ChatClient chatClient;
      
    public DocumentGenerationChainWorkflow(ChatClient chatClient) {  
        this.chatClient = chatClient;  
    }  
      
    public DocumentResult processDocumentGeneration(String requirements) {  
        List<String> steps = new ArrayList<>();
        String currentOutput = requirements;  
          
        System.out.println("=== 开始文档生成链式流程 ===");  
          
        // 门控：需求验证  
        if (!validateRequirements(currentOutput)) {  
            return new DocumentResult("需求验证失败，流程终止", steps, false);  
        }  
        steps.add("需求验证: 通过");  
          
        // 步骤1: 生成大纲 - 基于原始需求  
        currentOutput = generateOutline(currentOutput);  
        steps.add("大纲生成: 完成");  
          
        // 步骤2: 扩展内容 - 基于大纲  
        currentOutput = expandContent(currentOutput);  
        steps.add("内容扩展: 完成");  
          
        // 步骤3: 优化语言 - 基于扩展后的内容  
        currentOutput = optimizeLanguage(currentOutput);  
        steps.add("语言优化: 完成");  
          
        // 步骤4: 格式化 - 基于优化后的内容  
        currentOutput = formatDocument(currentOutput);  
        steps.add("文档格式化: 完成");  
          
        System.out.println("=== 文档生成流程完成 ===");  
          
        return new DocumentResult(currentOutput, steps, true);  
    }  
      
    private boolean validateRequirements(String requirements) {  
        String validationPrompt = """  
            请验证以下文档需求是否清晰完整：  
              
            需求: {requirements}  
              
            如果需求清晰完整，请回复"PASS"，否则回复"FAIL"。  
            """;  
          
        String result = chatClient.prompt()  
            .user(u -> u.text(validationPrompt).param("requirements", requirements))  
            .call()  
            .content();  
          
        return result.trim().toUpperCase().contains("PASS");  
    }  
      
    private String generateOutline(String requirements) {  
        String outlinePrompt = """  
            基于以下需求，生成详细的文档大纲：  
              
            需求: {input}  
              
            请生成包含主要章节和子章节的结构化大纲。  
            """;  
          
        return executeStep(outlinePrompt, requirements);  
    }  
      
    private String expandContent(String outline) {  
        String contentPrompt = """  
            基于以下大纲，为每个章节生成详细内容：  
              
            大纲: {input}  
              
            请为每个章节编写具体内容，保持逻辑连贯。  
            """;  
          
        return executeStep(contentPrompt, outline);  
    }  
      
    private String optimizeLanguage(String content) {  
        String optimizePrompt = """  
            优化以下文档内容的语言表达：  
              
            原始内容: {input}  
              
            请改进语言表达，使其更加专业、清晰、易读。  
            """;  
          
        return executeStep(optimizePrompt, content);  
    }  
      
    private String formatDocument(String content) {  
        String formatPrompt = """  
            将以下内容格式化为专业文档：  
              
            内容: {input}  
              
            请添加适当的标题层级、列表、表格等格式，生成最终的markdown文档。  
            """;  
          
        return executeStep(formatPrompt, content);  
    }  
      
    private String executeStep(String prompt, String input) {  
        return chatClient.prompt()  
            .user(u -> u.text(prompt).param("input", input))  
            .call()  
            .content();  
    }  
      
    public record DocumentResult(String finalDocument, List<String> steps, boolean success) {}  
}
```

测试

```java
@Bean
	public CommandLineRunner commandLineRunner(DashScopeChatModel dashScopeChatModel) {
		var chatClient =  ChatClient.create(dashScopeChatModel);
		return args -> {
			  

			String requirements = """  
            需要编写一份关于微服务架构设计的技术文档，包括：  
            1. 架构概述  
            2. 服务拆分策略  
            3. 数据一致性方案  
            4. 监控和运维  
            目标读者：技术团队和架构师  
            """;

			DocumentGenerationChainWorkflow.DocumentResult result = new DocumentGenerationChainWorkflow(chatClient)
					.processDocumentGeneration(requirements);

			System.out.println("生成结果: " + (result.success() ? "成功" : "失败"));
			System.out.println("最终文档:" + result.finalDocument());
			System.out.println("处理步骤: " + result.steps());
		};
	}
```

### [并行化](https://github.com/spring-projects/spring-ai-examples/tree/main/agentic-patterns/parallelization-workflow)（**parallelization-workflow**）

该模式对于需要并行执行 LLM 调用并自动进行输出聚合的情况很有用。

deepseek   MoE 多专家  多路并行

![image](/Ai/spring-ai-alibaba/saa-02-quickstart/img-005.png)

并行化工作流模式通过并发处理多个 LLM 操作来提高效率，主要有两种变体：

1. **分段处理（Sectioning）**：将复杂任务分解为独立的子任务并行处理
2. **投票机制（Voting）**：对同一任务运行多次以获得不同视角或进行多数投票

**使用场景**

该模式特别适用于：

- 处理大量相似但独立的项目
- 需要多个独立视角的任务
- 处理时间关键且任务可并行化的场景

```java

public class ParallelizationWorkflowWithAggregator {
      
    private final ChatClient chatClient;

    private static final String RISK_ASSESSMENT_PROMPT = """  
            你是一个风险评估专家，请分析以下部门在数字化转型过程中面临的主要风险：  
              
            请从以下角度分析：  
            1. 技术风险  
            2. 人员风险    
            3. 业务连续性风险  
            4. 预算风险  
            5. 应对建议  
            """;

    public ParallelizationWorkflowWithAggregator(ChatClient chatClient) {  
        this.chatClient = chatClient;  
    }  
      
    public AggregatedResult parallelWithAggregation(List<String> inputs) {
        // 步骤1: 并行处理  
        List<String> parallelResults = parallel(inputs);
          
        // 步骤2: 聚合结果  
        String aggregatedOutput = aggregateResults(parallelResults);
          
        return new AggregatedResult(parallelResults, aggregatedOutput);  
    }  
      
    private List<String> parallel(List<String> inputs ) {
        ExecutorService executor = Executors.newFixedThreadPool(inputs.size());
          
        try {  
            List<CompletableFuture<String>> futures = inputs.stream()
                .map(input -> CompletableFuture.supplyAsync(() -> {  
                    return chatClient.prompt(RISK_ASSESSMENT_PROMPT + "\n输入内容: " + input)
                        .call()  
                        .content();  
                }, executor))  
                .collect(Collectors.toList());
              
            CompletableFuture<Void> allFutures = CompletableFuture.allOf(  
                futures.toArray(CompletableFuture[]::new));  
            allFutures.join();  
              
            return futures.stream()  
                .map(CompletableFuture::join)  
                .collect(Collectors.toList());  
                  
        } finally {  
            executor.shutdown();  
        }  
    }  
      
    // 聚合器：将多个并行结果合并为统一输出  
    private String aggregateResults(List<String> results) {
        String aggregatorPrompt = """  
            你是一个数据聚合专家，请将以下多个分析结果合并为一份综合报告：  
              
            原始分析任务: {originalPrompt}  
              
            各部门/地区分析结果:  
            {results}  
              
            请提供：  
            1. 综合分析摘要  
            2. 共同趋势和模式  
            3. 关键差异对比  
            4. 整体结论和建议  
              
            请生成一份统一的综合报告。  
            """;  
          
        String combinedResults = String.join("\n\n---\n\n", results);  
          
        return chatClient.prompt()  
            .user(u -> u.text(aggregatorPrompt)
                .param("originalPrompt", RISK_ASSESSMENT_PROMPT)
                .param("results", combinedResults))  
            .call()  
            .content();  
    }  
      
    public record AggregatedResult(List<String> individualResults, String aggregatedOutput) {}  
}
```

```java
@SpringBootApplication
public class Application {

	public static void main(String[] args) {
		SpringApplication.run(Application.class, args);
	}

	@Bean
	public CommandLineRunner commandLineRunner(DashScopeChatModel dashScopeChatModel) {
		var chatClient =  ChatClient.create(dashScopeChatModel);
		return args -> {

			List<String> departments = List.of(
					"IT部门：负责系统架构升级，团队技术水平参差不齐，预算紧张",
					"销售部门：需要学习新的CRM系统，担心影响客户关系，抗拒变化",
					"财务部门：要求数据安全性极高，对云端存储有顾虑，流程复杂",
					"人力资源部门：需要数字化招聘流程，缺乏相关技术人员，时间紧迫"
			);

			System.out.println("=== 并行分析 + 聚合处理 ===");
			ParallelizationWorkflowWithAggregator.AggregatedResult result = new ParallelizationWorkflowWithAggregator(chatClient)
					.parallelWithAggregation( departments);

			System.out.println("\n=== 各部门独立分析结果 ===");
			for (int i = 0; i < result.individualResults().size(); i++) {
				System.out.println("部门" + (i + 1) + ":");
				System.out.println(result.individualResults().get(i));
				System.out.println("\n" + "-".repeat(50) + "\n");
			}

			System.out.println("\n=== 聚合器综合报告 ===");
			System.out.println(result.aggregatedOutput());
		};
	}
}
```

# 【极速通关】Spring AI Alibaba Agent：从SpringAi硬编码到企业级Graph图引擎完成Agent应用

### 🎯业务场景设定

我们要用大模型模拟一个“AI 软件外包公司”的完整流水线：

需求分析➔架构设计➔实施计划➔交付清单

![image.png](/Ai/spring-ai-alibaba/saa-02-quickstart/img-006.png)

**特殊风控规则：**如果在“需求分析”阶段发现需求不合理，直接触发风控终止流程（FAIL）。

## 🌪️阶段一：你必须知道，即便不用Agent框架也是可以实现Agent应用的

（该示例取自SpringAI系列课（chain-workflow）模型）

在这个阶段，我们不使用任何 Agent 框架，只用 Spring AI 原生的 `ChatClient`，看看“传统程序员”是怎么写 AI 应用的。

```plain
// 步骤1: 需求分析
String currentOutput1 = chatClient.prompt()
    .user(u -> u.text(REQUIREMENT_ANALYSIS_PROMPT).param("input", businessRequirement))
    .call().content();

// 🔴 程序员硬编码的 Gate (网关) 逻辑
if (currentOutput1.contains("FAIL")) {
    System.out.println("【流程终止】：需求无法实现...");
    return; // 提前返回
}

// 步骤2: 架构设计 (必须手动把上一部的结果 currentOutput1 喂给下一步)
String currentOutput2 = chatClient.prompt()
    .user(u -> u.text(ARCHITECTURE_DESIGN_PROMPT).param("input", currentOutput1))
    .call().content();
```

### 架构师的反思：痛点在哪里？

> **上帝视角的包办：** 所有的流程控制（`if/else`）、上下文传递全部由程序员手写。
> **缺乏扩展性（屎山预警）：**如果流程变成 20 步，这段面向过程的代码将变成一个极其臃肿、无法维护的巨石（Monolith）。
> **缺少 AI 的自主决策**：它的**控制权全部写死在 Java 代码的 **`if/else`** 中**。大模型没有自主决定下一步去哪里的权利，缺乏真正的路由决策

## 🚀阶段二：引入框架，Sequential Agent (多智能体流水线)

为了解决硬编码的痛苦，我们引入 Spring AI Alibaba Agent Framework。代码思维从**“面向过程”**升级为**“面向专家角色 (Persona)”**。

```plain
// 🔵 1. 定义独立的专家 Agent (如：需求分析师)
ReactAgent requirementAgent = ReactAgent.builder()
    .name("requirement_agent")
    .instruction("你是一个资深的需求分析师...")
    .outputKey("requirement_analysis") // 自动将结果落入全局上下文
    .build();

// 🔵 2. 将专家组装成流水线
SequentialAgent workflow = SequentialAgent.builder()
    .name("project_workflow")
    .subAgents(List.of(requirementAgent, architectureAgent, implementationAgent, deliveryAgent))
    .hooks(
        // 🟢 通过 Hook 优雅注入企业级风控逻辑
        new AgentHook() {
            public CompletableFuture<Map<String, Object>> afterAgent(OverAllState state, RunnableConfig config) {
                state.value("requirement_analysis").ifPresent(content -> {
                    if (content.contains("FAIL")) throw new RuntimeException("需求无法实现");
                });
                return CompletableFuture.completedFuture(Map.of());
            }
        }
    ).build();
```

**🚨 痛点暴击：既然框架这么好，为什么还要往下层走？**

> 当业务极其复杂时，这些开箱即用的模式会暴露出一个致命缺陷：**缺乏动态编排的灵活性**。
> 框架提供的都是“预设好的固定拓扑”。如果真实业务是：*先串行两步，然后并行三步，其中一步失败了还要带条件地回退（循环重试）*？这种“异形蜘蛛网”结构，高阶框架很难直接拼装。为了打破套餐式的束缚，我们需要上帝视角的动**态编排能力**。

## ⚙️阶段三：揭秘底层引擎，Alibaba Graph (状态图编排)

为了实现**完全自定义的动态编排**，我们直接使用 Spring AI Alibaba 的物理引擎底座——**Graph Runtime**。把流程图中的“圆圈”变成 Node，“黑线”变成 Edge。

Graph 是 Agent Framework 的底层运行时（实际上Agent Framework底层也会最终解析为Graph）。**官方建议开发者使用Agent Framework，但直接使用Graph API也是完全可行的。** Graph 是一个更底层的工作流和多智能体编排框架，使开发者能够实现复杂的应用程序编排。

使用Spring AI Alibaba Graph 需要改变您构建智能代理的思维方式。使用 Graph 构建代理时，您将首先把它分解为称为节点（nodes）**的离散步骤。然后，描述每个节点的不同决策和转换。最后，通过一个共享的**状态（state）将节点连接起来，每个节点都可以读取和写入该状态。

![image.png](/Ai/spring-ai-alibaba/saa-02-quickstart/img-007.png)

**状态（State）**:在 Node 与 Edge 之间传递数据，是整个 Agent 上下文传递数据的载体，具体实现上是一个 Map<String, Object>。

**节点（Node）**：Node 是执行具体逻辑的单元，接受当前 State 作为输入，执行某些操作（如调用 LLM 或自定义逻辑），并返回传递到下一个Node的 State 数据。

**边（Edge）**：定义一个Node到下一个Node的连接。可为固定连接（普通边），也可依据状态条件动态决定下一步执行路径（条件边）

你会发现，这不仅是一张业务逻辑图，更是我们底层代码的一比一精确映射！

```plain
// 基于 StateGraph，我们将流程图中的元素转化为代码
return new StateGraph("project_workflow", keyStrategyFactory)
    // 🟢 1. 定义节点 (流程图中的蓝色圆圈 Node)
    .addNode("requirement", node_async((state, config) -> { ... }))
    .addNode("architecture", node_async((state, config) -> { ... }))
    
    // 🔵 2. 定义静态边 (流程图中的黑色实线箭头 Edge)
    .addEdge(START, "requirement")
    
    // 🟠 3. 定义条件边 (流程图中的橙色菱形 Check FAIL?)
    .addConditionalEdges("requirement",
        AsyncEdgeActionWithConfig.edge_async((state, config) ->
            // 如果分析结果包含 FAIL，走向 END 节点；否则走向架构设计节点
            state.value("requirement_analysis", String.class)
                 .map(s -> s.contains("FAIL") ? "END" : "to_architecture")
                 .orElse("to_architecture")),
        // 🗺️ 路由表映射字典
        Map.of("to_architecture", "architecture", "END", END))
        
    .addEdge("architecture", "implementation") // 继续连线...
```

**Graph 的核心价值**

1. **任意拓扑的动态编排**：无论是 `if/else` 分支，还是打回重做的 `while` 有向循环，图引擎都能通过 Edge 轻松承载。你画得出图，它就写得出代码！(甚至通过UI编排后动态解析流程）
2. **状态自动托管 (State Management)**：通过 `KeyStrategyFactory` 精确控制状态是“追加”还是“替换”。引擎像传送带一样自动带着上下文流转。
3. **可视化与代码完美同构**：你在业务架构会上画出的白板图，直接 1:1 无损翻译成底层代码。代码即流程图。

## 代码：

[https://gitee.com/xscodeit/alibaba-agent-xs.git](https://gitee.com/xscodeit/alibaba-agent-xs.git)
