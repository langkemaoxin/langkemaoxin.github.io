---
title: "AI Code Reviewer 技术详细设计文档"
sidebarGroup: "AI代码 Reviewer 助手"
shortTitle: "AI Code Reviewer 技术详细设计文档"
order: 1298
date: 2026-07-22
category: "面试题"
tag:
  - "面试题"
description: "一、系统概述AI Code Reviewer 是一个基于大语言模型的智能代码审查平台，能够对 Java 代码进行全面审查，提供：代码质量评分（0-100分）结构化问题列表（Bug / 安全 / 性能 / 风格 / 最佳实践）完整的优化后代码"
article: false
---

> 来源：[AI Code Reviewer 技术详细设计文档](https://www.yuque.com/tulingzhouyu/db22bv/md6mx341hvcq539y)

## 一、系统概述

**AI Code Reviewer** 是一个基于大语言模型的智能代码审查平台，能够对 Java 代码进行全面审查，提供：

- 代码质量评分（0-100分）

- 结构化问题列表（Bug / 安全 / 性能 / 风格 / 最佳实践）

- 完整的优化后代码

### 1.1 核心价值

功能
说明

智能审查
基于阿里通义千问(qwen-plus)大模型，5个维度全面审查

结构化输出
通过 Prompt 工程约束 AI 返回严格 JSON 格式

完整优化
不只给建议，直接生成可编译的优化后完整代码

历史记录
审查结果落库持久化，支持历史查询

### 1.2 技术栈总览

```plain
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vue 3)                         │
│  TypeScript + Vite + Axios                                      │
│  端口: 5173                                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (Proxy /api → :8080)
┌──────────────────────────▼──────────────────────────────────────┐
│                     Backend (Spring Boot 3.2)                   │
│  Java 17 + Spring Security + JPA + WebFlux                      │
│  端口: 8080                                                      │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
    ┌───────────▼───────────┐     ┌───────────▼───────────┐
    │    H2 Database        │     │  阿里通义千问 API      │
    │    (内存模式)          │     │  qwen-plus            │
    └───────────────────────┘     └───────────────────────┘
```

---

## 二、项目目录结构

```plain
ai-code-reviewer/
├── backend/                          # Spring Boot 后端
│   ├── src/main/java/com/aireviewer/
│   │   ├── config/                   # 配置类
│   │   │   ├── GlobalExceptionHandler.java   # 全局异常处理
│   │   │   ├── OpenAIConfig.java             # AI服务配置
│   │   │   └── SecurityConfig.java           # 安全配置
│   │   ├── controller/               # REST 控制器
│   │   │   ├── AuthController.java           # 认证接口
│   │   │   └── ReviewController.java         # 审查接口
│   │   ├── dto/                      # 数据传输对象
│   │   │   ├── AuthDto.java                  # 认证DTO
│   │   │   └── ReviewDto.java                # 审查DTO
│   │   ├── model/                    # JPA 实体
│   │   │   ├── Review.java                   # 审查记录实体
│   │   │   ├── ReviewRepository.java         # 审查数据访问
│   │   │   ├── User.java                     # 用户实体
│   │   │   └── UserRepository.java           # 用户数据访问
│   │   ├── security/                 # 安全组件
│   │   │   ├── CustomUserDetailsService.java
│   │   │   ├── JwtAuthenticationFilter.java
│   │   │   └── JwtTokenProvider.java
│   │   ├── service/                  # 业务服务层
│   │   │   ├── AIReviewService.java          # AI审查服务(核心)
│   │   │   ├── AuthService.java              # 认证服务
│   │   │   └── ReviewService.java            # 审查业务服务
│   │   └── AiCodeReviewerApplication.java    # 启动类
│   └── src/main/resources/
│       └── application.yml           # 应用配置
│
├── frontend/                         # Vue 3 前端
│   ├── src/
│   │   ├── api/
│   │   │   └── review.ts             # API 封装层
│   │   ├── assets/
│   │   │   └── style.css             # 全局样式
│   │   ├── App.vue                   # 根组件(主界面)
│   │   └── main.ts                   # 入口文件
│   ├── vite.config.ts                # Vite 配置
│   └── package.json                  # 依赖配置
│
└── lesson-0[1-4]-*.md                # 课程资料
```

---

## 三、后端架构设计

### 3.1 分层架构

采用经典的三层分离架构，职责清晰：

```plain
┌─────────────────────────────────────────────────────────────┐
│                     Controller 层                            │
│  ReviewController / AuthController                           │
│  职责: HTTP 入口、参数校验、路由分发                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Service 层                              │
│  ReviewService        AIReviewService       AuthService      │
│  业务流程+落库         AI对话+解析           认证逻辑          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Repository / Model 层                      │
│  Review / User 实体    ReviewRepository / UserRepository     │
│  JPA 持久化                                                  │
└─────────────────────────────────────────────────────────────┘
```

**设计亮点**：

- `AIReviewService` 独立成层，将来换模型只需修改这一个类

- `ReviewService` 不直接依赖 AI 实现细节，只依赖接口契约

- 符合 **Clean Architecture / Hexagonal** 思想

### 3.2 核心服务详解

#### 3.2.1 AIReviewService - AI 审查服务

**文件**: `backend/src/main/java/com/aireviewer/service/AIReviewService.java`

**核心职责**：

1. 构造 Prompt 请求

1. 调用通义千问 API

1. 解析 JSON 响应为 Java 对象

**关键代码结构**：

```java
@Service
public class AIReviewService {
    
    private final WebClient qwenWebClient;  // WebFlux 异步客户端
    
    // Prompt 模板 - 约束 AI 返回严格 JSON
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
          "issues": [...],
          "optimizedCode": "优化后的完整代码"
        }
        """;
    
    // 核心方法：返回 Mono&lt;ReviewResult&gt;（响应式）
    public Mono<ReviewDto.ReviewResult> reviewCode(String code, String language) {
        return qwenWebClient.post()
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .map(this::parseResponse)
                .onErrorResume(e -> Mono.just(createErrorResult(e.getMessage())));
    }
    
    // 响应解析：清理 markdown 标记 + JSON 解析
    private ReviewDto.ReviewResult parseResponse(String response) {
        // 1. 提取 choices[0].message.content
        // 2. 去除 ```json / ``` 包裹
        // 3. 用 ObjectMapper 解析为 ReviewResult
    }
}
```

**Prompt 工程要点**：

约束
作用

`不要有任何其他文本`
避免 AI 添加解释性前缀/后缀干扰 JSON 解析

`optimizedCode 必须是完整代码`
确保返回可编译的完整源码，而非片段

`行号从1开始计数`
统一前后端行号标准

#### 3.2.2 ReviewService - 审查业务服务

**文件**: `backend/src/main/java/com/aireviewer/service/ReviewService.java`

**核心流程**：

```plain
createReview(request, username)
    │
    ├── 1. 查找关联用户（可为空）
    │
    ├── 2. 创建 Review 实体，状态 = PROCESSING
    │      └── reviewRepository.save(review)
    │
    ├── 3. 调用 AI 服务
    │      └── aiReviewService.reviewCode(...).block()
    │
    ├── 4. 更新审查结果
    │      ├── review.setScore(...)
    │      ├── review.setSummary(...)
    │      ├── review.setStatus(COMPLETED)
    │      └── review.setResult(issues JSON)
    │
    └── 5. 组装 ReviewResponse 返回
           └── toResponse(review, issues, optimizedCode)
```

**设计要点**：

- 审查记录先落库再调 AI，便于后续扩展异步审查

- `issues` 序列化为 JSON 存入 TEXT 字段，方便查询和统计

- 使用 `.block()` 同步等待，简化当前实现，保留异步演进空间

### 3.3 数据模型

#### 3.3.1 Review 实体

```java
@Entity
@Table(name = "reviews")
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;              // 关联用户（可为空，快速审查无需登录）
    
    private String language;         // 编程语言
    
    @Column(columnDefinition = "TEXT")
    private String code;             // 原始代码
    
    @Column(columnDefinition = "TEXT")
    private String result;           // 问题列表 JSON
    
    private Integer score;           // 评分 0-100
    
    @Column(columnDefinition = "TEXT")
    private String summary;          // AI 总结
    
    @Enumerated(EnumType.STRING)
    private ReviewStatus status;     // PENDING / PROCESSING / COMPLETED / FAILED
    
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
```

#### 3.3.2 User 实体

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String password;         // BCrypt 加密存储
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

### 3.4 DTO 设计

**文件**: `backend/src/main/java/com/aireviewer/dto/ReviewDto.java`

```java
public class ReviewDto {
    
    // 请求 DTO
    public static class ReviewRequest {
        @NotBlank private String code;      // 待审查代码
        @NotBlank private String language;  // 编程语言
    }
    
    // AI 返回结果（内部使用）
    public static class ReviewResult {
        private Integer score;
        private String summary;
        private List&lt;ReviewIssue&gt; issues;
        private String optimizedCode;
    }
    
    // 问题详情
    public static class ReviewIssue {
        private Integer lineStart;     // 起始行
        private Integer lineEnd;       // 结束行
        private String severity;       // critical/high/medium/low/info
        private String category;       // bug/security/performance/style/best_practice
        private String message;        // 问题描述
        private String suggestion;     // 修复建议
        private String fixCode;        // 修复代码片段
    }
    
    // 响应 DTO（对外暴露）
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
}
```

**DTO 与 Prompt 联动**：

- `ReviewResult` 字段与 Prompt 中定义的 JSON 结构**一一对应**

- 这是将 AI 能力"产品化"的关键——先设计数据结构，再设计 Prompt

---

## 四、API 接口设计

### 4.1 代码审查 API

接口
方法
路径
认证
说明

快速审查
POST
`/api/review/quick`
无
无需登录，直接审查

创建审查
POST
`/api/review`
JWT
需登录，关联用户

获取详情
GET
`/api/review/{id}`
无
按 ID 查询审查结果

历史记录
GET
`/api/review/history`
JWT
获取当前用户的审查历史

#### 快速审查接口详情

**请求**：

```http
POST /api/review/quick
Content-Type: application/json

{
  "code": "public class Hello { ... }",
  "language": "Java"
}
```

**响应**：

```json
{
  "id": 1,
  "language": "Java",
  "code": "public class Hello { ... }",
  "score": 65,
  "summary": "代码存在几个常见问题，包括字符串比较方式不当...",
  "issues": [
    {
      "lineStart": 5,
      "lineEnd": 5,
      "severity": "high",
      "category": "bug",
      "message": "使用 == 比较字符串",
      "suggestion": "应使用 equals() 方法比较字符串内容",
      "fixCode": "if (\"VIP\".equals(type)) {"
    }
  ],
  "optimizedCode": "import java.util.List;\nimport java.util.StringJoiner;...",
  "status": "COMPLETED",
  "createdAt": "2024-12-18T10:30:00",
  "completedAt": "2024-12-18T10:30:15"
}
```

### 4.2 认证 API

接口
方法
路径
说明

用户注册
POST
`/api/auth/register`
注册新用户

用户登录
POST
`/api/auth/login`
登录获取 JWT

---

## 五、前端架构设计

### 5.1 技术选型

技术
版本
用途

Vue
3.x
前端框架，Composition API

TypeScript
5.x
类型安全

Vite
5.x
构建工具，支持热重载

Axios
1.x
HTTP 客户端

### 5.2 项目结构

```plain
frontend/src/
├── api/
│   └── review.ts       # API 封装 + 类型定义
├── assets/
│   └── style.css       # 全局样式（CSS 变量 + 响应式）
├── App.vue             # 根组件（主界面逻辑）
└── main.ts             # 入口文件
```

### 5.3 API 封装层

**文件**: `frontend/src/api/review.ts`

```typescript
// 类型定义 - 与后端 DTO 对应
export interface ReviewIssue {
  lineStart: number
  lineEnd: number
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  message: string
  suggestion: string
  fixCode: string
}

export interface ReviewResponse {
  id: number
  language: string
  code: string
  score: number
  summary: string
  issues: ReviewIssue[]
  optimizedCode: string
  status: string
  createdAt: string
  completedAt: string
}

// API 封装
export const reviewApi = {
  quickReview: async (request: ReviewRequest): Promise&lt;ReviewResponse&gt; => {
    const response = await api.post&lt;ReviewResponse&gt;('/review/quick', request)
    return response.data
  }
}
```

**设计亮点**：

- 使用 TypeScript 接口定义，编译期类型检查

- 统一封装 API 调用，组件只需 `await reviewApi.quickReview(...)`

### 5.4 界面布局

**三区域联动设计**：

```plain
┌─────────────────────────────────────────────────────────────────┐
│                         Header                                   │
│        🔍 AI Code Reviewer - 智能代码审查平台                      │
└─────────────────────────────────────────────────────────────────┘
┌───────────────────────────┬─────────────────────────────────────┐
│      左侧（输入区）         │           右侧（结果区）             │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐   │
│  │ 输入Java代码 [开始]  │  │  │ 📊 审查结果                  │   │
│  │                     │  │  │  ┌─────┐                    │   │
│  │ ┌─────────────────┐ │  │  │  │ 65  │ 代码质量评分        │   │
│  │ │ textarea        │ │  │  │  └─────┘                    │   │
│  │ │ (代码输入)       │ │  │  │ 总结: ...                   │   │
│  │ └─────────────────┘ │  │  │                             │   │
│  └─────────────────────┘  │  │ 🔎 发现的问题 (5)            │   │
│                           │  │  ├── [高] 行5-5 Bug          │   │
│  ┌─────────────────────┐  │  │  ├── [中] 行8-10 性能        │   │
│  │ 优化后的代码         │  │  │  └── ...                    │   │
│  │ ┌─────────────────┐ │  │  └─────────────────────────────┘   │
│  │ │ pre             │ │  │                                     │
│  │ │ (优化后代码)     │ │  │                                     │
│  │ └─────────────────┘ │  │                                     │
│  └─────────────────────┘  │                                     │
└───────────────────────────┴─────────────────────────────────────┘
```

**交互状态管理**：

- `loading`: 控制按钮禁用 + 加载动画

- `result`: 审查结果数据

- `error`: 错误提示信息

---

## 六、安全设计

### 6.1 认证机制

采用 **JWT (JSON Web Token)** 无状态认证：

```plain
用户登录 → 服务端生成 JWT → 返回给客户端
    │
    └── 客户端存储 Token
           │
           └── 后续请求携带 Authorization: Bearer &lt;token&gt;
                  │
                  └── 服务端验证 Token → 放行/拒绝
```

### 6.2 JWT 配置

```yaml
jwt:
  secret: your-256-bit-secret-key-for-jwt-token-signing
  expiration: 86400000  # 24小时
```

### 6.3 安全配置

**文件**: `SecurityConfig.java`

```java
http
    .csrf(AbstractHttpConfigurer::disable)           // 禁用 CSRF（API 无状态）
    .cors(cors -> cors.configurationSource(...))     // 配置 CORS
    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/auth/**").permitAll() // 认证接口公开
        .requestMatchers("/api/review/**").permitAll()// 审查接口公开
        .anyRequest().permitAll()
    )
    .sessionManagement(session -> session
        .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // 无状态
    )
    .addFilterBefore(jwtAuthenticationFilter, ...);   // JWT 过滤器
```

### 6.4 密码安全

- 使用 **BCrypt** 加密存储密码

- 登录时使用 `AuthenticationManager` 进行认证

---

## 七、AI 集成设计

### 7.1 模型配置

```yaml
qwen:
  api-key: sk-xxxxxxx
  api-url: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
  model: qwen-plus
  max-tokens: 4096
  temperature: 0.3  # 低温度保证输出稳定性
```

### 7.2 WebClient 配置

**文件**: `OpenAIConfig.java`

```java
@Bean
public WebClient qwenWebClient() {
    return WebClient.builder()
            .baseUrl(apiUrl)
            .defaultHeader("Authorization", "Bearer " + apiKey)
            .defaultHeader("Content-Type", "application/json")
            .codecs(configurer -> configurer
                    .defaultCodecs()
                    .maxInMemorySize(16 * 1024 * 1024))  // 16MB 缓冲区
            .build();
}
```

### 7.3 请求结构

```java
Map<String, Object> requestBody = Map.of(
    "model", "qwen-plus",
    "messages", List.of(
        Map.of("role", "system", "content", "你是一个专业的代码审查助手，只返回JSON格式的审查结果。"),
        Map.of("role", "user", "content", prompt)
    ),
    "max_tokens", 4096,
    "temperature", 0.3
);
```

### 7.4 响应解析流程

```plain
AI 原始响应
    │
    ├── 1. 提取 choices[0].message.content
    │
    ├── 2. 清理 Markdown 标记
    │      ├── 去除 ```json 前缀
    │      └── 去除 ``` 后缀
    │
    ├── 3. JSON 解析为 JsonNode
    │
    └── 4. 映射到 ReviewResult
           ├── score: Integer
           ├── summary: String
           ├── issues: List&lt;ReviewIssue&gt;
           └── optimizedCode: String
```

---

## 八、异常处理

### 8.1 全局异常处理器

**文件**: `GlobalExceptionHandler.java`

异常类型
HTTP 状态码
说明

`MethodArgumentNotValidException`
400
参数校验失败

`RuntimeException`
400
业务逻辑异常

`BadCredentialsException`
401
认证失败

`UsernameNotFoundException`
401
用户不存在

`Exception`
500
未知异常

### 8.2 统一错误响应格式

```json
{
  "timestamp": "2024-12-18T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "用户名已存在"
}
```

---

## 九、部署配置

### 9.1 开发环境

**后端启动**：

```bash
cd backend
./mvnw spring-boot:run
# 访问: http://localhost:8080
# H2 Console: http://localhost:8080/h2-console
```

**前端启动**：

```bash
cd frontend
npm install
npm run dev
# 访问: http://localhost:5173
```

### 9.2 前端代理配置

**文件**: `vite.config.ts`

```typescript
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

### 9.3 CORS 配置

```yaml
cors:
  allowed-origins: http://localhost:5173,http://localhost:3000
```

---

## 十、扩展性设计

### 10.1 支持多语言审查

当前架构已预留 `language` 参数，扩展步骤：

1. 前端增加语言选择下拉框

1. Prompt 模板中动态替换语言描述

1. 针对不同语言添加特定审查维度

### 10.2 换模型实现

只需修改 `AIReviewService`：

1. 更换 WebClient 调用地址

1. 调整请求参数格式

1. 适配响应解析逻辑

`ReviewService` 和前端几乎不需要修改。

### 10.3 增加返回字段

完整链路：`改 DTO → 改 Prompt → 改解析 → 改前端展示`

---

## 十一、依赖清单

### 11.1 后端依赖 (Maven)

依赖
版本
用途

spring-boot-starter-web
3.2.1
Web MVC

spring-boot-starter-security
3.2.1
安全框架

spring-boot-starter-validation
3.2.1
参数校验

spring-boot-starter-data-jpa
3.2.1
ORM

spring-boot-starter-webflux
3.2.1
响应式客户端

h2
runtime
内存数据库

mysql-connector-java
8.0.33
MySQL 驱动

jjwt-api/impl/jackson
0.12.3
JWT 库

lombok
-
代码简化

### 11.2 前端依赖 (npm)

依赖
用途

vue
核心框架

axios
HTTP 客户端

typescript
类型支持

vite
构建工具

@vitejs/plugin-vue
Vue 插件

---

## 十二、总结

本项目是一个**工程化 AI 应用**的典型案例，核心设计理念：

1. **AI 能力产品化**：通过 Prompt + DTO 定义"AI 协议"，让大模型按规范返回结构化数据

1. **分层解耦**：AIReviewService 独立封装 AI 调用，业务层只关心接口契约

1. **前后端分离**：Vue + Spring Boot 各司其职，通过 REST API 通信

1. **类型安全**：后端 DTO + 前端 TypeScript 接口保证数据一致性

1. **可扩展架构**：预留多语言支持、换模型、加字段的演进空间

> 这不是一个玩具 Demo，而是一个可以继续打磨、真正上线给团队用的 AI 代码审查工具骨架。
