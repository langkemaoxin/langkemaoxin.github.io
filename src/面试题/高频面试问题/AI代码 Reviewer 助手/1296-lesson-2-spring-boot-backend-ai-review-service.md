---
title: "第 2 课 · Spring Boot 后端与 AI 审查服务"
sidebarGroup: "AI代码 Reviewer 助手"
shortTitle: "第 2 课 · Spring Boot 后端与 AI 审查服务"
order: 1296
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "课程目标： 看懂一次审查从 HTTP 请求到 AI 调用再到落库的完整后端流程； 理解 ReviewService 和 AIReviewService 各自的职责分工； 知道如何通过 Prompt 约束大模型按指定 JSON 返回结果。一、"
article: false
---

> 来源：[第 2 课 · Spring Boot 后端与 AI 审查服务](https://www.yuque.com/tulingzhouyu/db22bv/xtn6xb47yi6si5vt)

**课程目标：**

- 看懂一次审查从 HTTP 请求到 AI 调用再到落库的完整后端流程；

- 理解 `ReviewService` 和 `AIReviewService` 各自的职责分工；

- 知道如何通过 Prompt 约束大模型按指定 JSON 返回结果。

---

## 一、本课整体视图

从“前端点一下开始审查”到“AI 给出结果”，后端大致经历这几步：

1. 前端调用 `POST /api/review/quick`；

1. `ReviewController.quickReview()` 接收请求，交给 `ReviewService.quickReview()`；

1. `ReviewService.createReview()`：

- 创建一条 `Review` 记录，状态设为 `PROCESSING`；

- 调用 `AIReviewService.reviewCode()`，拿到 `ReviewResult`；

- 回写评分、总结、问题列表，状态改为 `COMPLETED`；

1. 按 `ReviewDto.ReviewResponse` 组装响应，返回给前端。

可以把它理解成：

> Controller 管“入口”，Service 管“流程”，AIService 只负责“跟大模型聊天并翻译成 Java 对象”。

---

## 二、请求与响应 DTO 结构

核心 DTO 定义在 `backend/src/main/java/com/aireviewer/dto/ReviewDto.java`。

### 1. 请求：ReviewRequest

```java
@Data
public static class ReviewRequest {
    @NotBlank(message = "代码内容不能为空")
    private String code;

    @NotBlank(message = "编程语言不能为空")
    private String language;
}
```

- 前端只需要传两件事：

- `code`：完整的 Java 源码字符串；

- `language`：当前课程中固定传 `"Java"`。

### 2. AI 返回内部使用：ReviewResult

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public static class ReviewResult {
    private Integer score;
    private String summary;
    private List&lt;ReviewIssue&gt; issues;
    private String optimizedCode;
}
```

- 这是后端内部用来承接 AI 审查结果的模型，不直接对外暴露。

- 字段含义：

- `score`：0–100 的代码质量评分；

- `summary`：AI 对整体质量的一句话总结；

- `issues`：问题列表（行号、严重程度、分类、建议等）；

- `optimizedCode`：**优化后的完整 Java 源码**。

### 3. 对前端响应：ReviewResponse

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public static class ReviewResponse {
    private Long id;
    private String language;
    private String code;
    private Integer score;
    private String summary;
    private List&lt;ReviewIssue&gt; issues;
    private String optimizedCode;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
```

- 在 `ReviewResponse` 的基础上，额外封装了：

- 审查记录的 `id`、`status`；

- 创建时间和完成时间，方便后续做审查历史。

> **知识点：** 通过 DTO 把“自然语言需求”抽象成明确数据结构，是 AI 集成工程化的第一步。

---

## 三、ReviewService：一次审查的业务流程

文件：`backend/src/main/java/com/aireviewer/service/ReviewService.java`

### 1. createReview：审查主流程

伪代码结构如下：

```java
public ReviewDto.ReviewResponse createReview(ReviewDto.ReviewRequest request, String username) {
    // 1. 关联用户（可为空）
    User user = findUserOrNull(username);

    // 2. 创建 Review 实体，状态设为 PROCESSING
    Review review = Review.builder()
            .user(user)
            .code(request.getCode())
            .language(request.getLanguage())
            .status(Review.ReviewStatus.PROCESSING)
            .build();
    review = reviewRepository.save(review);

    // 3. 调用 AI 服务
    ReviewDto.ReviewResult result = aiReviewService
            .reviewCode(request.getCode(), request.getLanguage())
            .block();

    // 4. 更新评分、总结、完成时间等
    review.setScore(result.getScore());
    review.setSummary(result.getSummary());
    review.setStatus(Review.ReviewStatus.COMPLETED);
    review.setCompletedAt(LocalDateTime.now());

    // 5. 把 issues 序列化成 JSON 存入数据库
    review.setResult(objectMapper.writeValueAsString(result.getIssues()));

    reviewRepository.save(review);

    // 6. 组装响应，带上 optimizedCode
    return toResponse(review, result.getIssues(), result.getOptimizedCode());
}
```

**关键点：**

- 审查不是“纯调用 AI”，而是一次完整的业务流程：

- 有记录、有状态、有时间戳；

- 可追溯，可做历史分析。

- `aiReviewService.reviewCode(...).block()`：

- 使用 WebFlux 的 `Mono`，最终在这里同步阻塞拿到结果；

- 方便将来切换为异步审查或消息队列。

### 2. toResponse：聚合数据库字段 + AI 结果

为了保证返回结构统一，`ReviewService` 提供了一个统一的装配方法：

```java
private ReviewDto.ReviewResponse toResponse(
        Review review,
        List<ReviewDto.ReviewIssue> issues,
        String optimizedCode) {
    return ReviewDto.ReviewResponse.builder()
            .id(review.getId())
            .language(review.getLanguage())
            .code(review.getCode())
            .score(review.getScore())
            .summary(review.getSummary())
            .issues(issues)
            .optimizedCode(optimizedCode)
            .status(review.getStatus().name())
            .createdAt(review.getCreatedAt())
            .completedAt(review.getCompletedAt())
            .build();
}
```

> **亮点：** `Review` 实体负责“存历史”，`ReviewResult` 负责“承接 AI 返回”，最终在 `ReviewResponse` 里组合在一起，对前端来说是一个干净、稳定的结构。

---

## 四、AIReviewService：与通义千问对话

文件：`backend/src/main/java/com/aireviewer/service/AIReviewService.java`

### 1. 核心方法签名

```java
public Mono<ReviewDto.ReviewResult> reviewCode(String code, String language)
```

- 入参：

- `code`：待审查的源代码文本；

- `language`：语言标识（当前课程阶段固定为 `"Java"`）。

- 出参：

- `Mono`：方便将来升级为异步流水线。

### 2. Prompt 模板（节选）

```java
private static final String REVIEW_PROMPT_TEMPLATE = """
    你是一位资深的代码审查专家。请对以下 Java 代码进行全面审查：

    ```java
    %s
    ```

    请从以下维度进行审查：
    1. 代码质量：可读性、可维护性、代码结构
    2. 潜在Bug：逻辑错误、边界条件、空指针等
    3. 安全漏洞：SQL注入、XSS、敏感信息泄露等
    4. 性能问题：算法复杂度、资源泄露、不必要的计算等
    5. 最佳实践：设计模式、语言特性使用、注释规范等

    请严格按以下JSON格式输出审查结果（不要有任何其他文本）：
    {
      "score": 代码质量评分(0-100的整数),
      "summary": "整体评价（100字以内）",
      "issues": [
        {
          "lineStart": 问题起始行号(整数),
          "lineEnd": 问题结束行号(整数),
          "severity": "critical或high或medium或low或info",
          "category": "bug或security或performance或style或best_practice",
          "message": "问题描述",
          "suggestion": "修复建议",
          "fixCode": "建议的修复代码（可选，无则为空字符串）"
        }
      ],
      "optimizedCode": "优化后的完整代码（必须是合法的Java代码，包含所有原始代码内容，只做优化改进，不是分段优化）"
    }

    注意：
    - 如果代码没有问题，issues 数组为空
    - 确保返回的是合法的 JSON 格式
    - optimizedCode 必须是完整的Java代码，包含所有原始代码内容，只做优化改进，不是分段优化
    - 行号从1开始计数
    """;
```

**这里有两个非常关键的工程实践：**

1. **要求 AI 严格输出 JSON，且“不要有任何其他文本”**，避免自然语言前后缀干扰解析；

1. 明确约束 `optimizedCode` 是“完整 Java 源码，而不是分段 patch”。

> 这让我们的后端可以“像调用普通服务一样”使用 AI，而不是手动去清洗一堆聊天文本。

### 3. 调用与解析（简化版）

- 构造请求体：

```java
Map<String, Object> requestBody = Map.of(
        "model", model,
        "messages", List.of(
                Map.of("role", "system", "content", "你是一个专业的代码审查助手，只返回JSON格式的审查结果。"),
                Map.of("role", "user", "content", prompt)
        ),
        "max_tokens", maxTokens,
        "temperature", temperature
);
```

- 发送请求并解析返回：

```java
return qwenWebClient.post()
        .bodyValue(requestBody)
        .retrieve()
        .bodyToMono(String.class)
        .map(this::parseResponse)
        .onErrorResume(e -> Mono.just(createErrorResult(e.getMessage())));
```

- `parseResponse` 负责：

1. 取出 `choices[0].message.content`；

1. 去掉可能的 ```json / ``` 包裹；

1. 用 `ObjectMapper` 解析 JSON 字符串；

1. 映射到 `ReviewResult`：`score`、`summary`、`issues`、`optimizedCode`。

---

## 五、本课技术亮点与爆点

### 亮点 1：职责清晰的三层拆分（大模型只是一个服务实现）

- **Controller**：只做 HTTP 入口和参数校验，不管 AI 细节；

- **ReviewService**：负责“业务流程 + 落库 + 组合返回”；

- **AIReviewService**：专注“如何和大模型对话 + 解析 JSON”。

**爆点在哪里？**

> 将来如果你想把阿里千问换成本地大模型或其他云厂商，**只需要换掉 **`AIReviewService`** 的实现，**`ReviewService`** 和前端几乎不用动**。

这就是标准的 **Clean Architecture / Hexagonal 思想**在 AI 工程化中的体现。

---

### 亮点 2：DTO + Prompt 联动，定义“AI 协议”

**爆点在哪里？**

- 不是“随便问问 AI”，而是 **先设计数据结构，再设计 Prompt，让大模型按协议返回**；

- `ReviewResult` / `ReviewResponse` 的结构，与 Prompt 里的 JSON 字段一一对应；

- 这是 **将 AI 能力“产品化”的关键一步**。

**现场演示建议：**
在讲课时，把 `ReviewDto.ReviewResult` 的结构和 `REVIEW_PROMPT_TEMPLATE` 里的 JSON 字段并排展示，让学员直观看到：

- DTO 字段：`score`, `summary`, `issues`, `optimizedCode`

- Prompt JSON：`"score": 代码质量评分`, `"summary": "整体评价"` …

这种“字段对照”会非常有画面感。

---

### 亮点 3：工程化 Prompt，让大模型“老老实实返回 JSON”

**爆点在哪里？**

- 模板里要求：

- 严格按 JSON 格式输出；

- **不要有任何其他文本**；

- `optimizedCode` 必须是完整 Java 代码、不是分段 patch。

- 配合 `parseResponse` 的去 ```json/``` 逻辑，体现出：

- **“AI 集成 ≠ 调个 SDK，核心在于 Prompt 设计 + 严格解析”**。

**现场演示建议（可选）：**
在录课时，可以故意把 "不要有任何其他文本" 这句删掉，演示一次解析失败或者返回乱码，再加回来。
这样能让学员直观地意识到：**Prompt 是后端业务需求文档，不是可有可无的。**

---

### 亮点 4：为未来扩展预留空间

- 审查结果会落到 `Review` 实体中，带状态、时间戳，可以做历史记录和报表；

- `reviewCode` 返回的是 `Mono`，现在用 `.block()`，将来可以演进到异步或消息队列。

**引出一句话：**

> 我们现在是 MVP 同步版，将来想高级玩法，这个接口是可以演进的。

---

## 六、本课课后练习

1. **练习 1：Prompt 微调** 在 `REVIEW_PROMPT_TEMPLATE` 中加入一条自定义规则，例如：

> 优先指出可能导致空指针异常的问题。

然后重新审查同一段代码，观察问题列表是否更倾向于提示空指针风险。

1. **练习 2：增加一个返回字段** 想象你需要一个 `designSuggestions` 字段，用来承载更高层次的设计建议：

- 在 DTO、Prompt、解析逻辑中加入该字段；

- 让前端简单打印这一段文本。 通过这个练习，完整走一遍“改需求 → 改 Prompt → 改 DTO → 改前端”的链路。
