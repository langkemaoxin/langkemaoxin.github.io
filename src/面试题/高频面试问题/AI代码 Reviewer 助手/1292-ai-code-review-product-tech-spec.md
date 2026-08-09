---
title: "AI 智能代码评审与优势产品技术说明文档"
sidebarGroup: "AI代码 Reviewer 助手"
shortTitle: "AI 智能代码评审与优势产品技术说明文档"
order: 1292
date: 2026-01-20
category: "面试题"
tag:
  - "面试题"
description: "版本: v1.0更新日期: 2025-12-26文档类型: 产品技术说明文档目录产品概述技术架构"
article: false
---

> 来源：[AI 智能代码评审与优势产品技术说明文档](https://www.yuque.com/tulingzhouyu/db22bv/lsd4lf1sx55c3g0f)

**版本**: v1.0
**更新日期**: 2025-12-26
**文档类型**: 产品技术说明文档

---

## 目录

1. [产品概述](#1-产品概述)

1. [技术架构](#2-技术架构)

1. [功能模块详解](#3-功能模块详解)

1. [前后端实现](#4-前后端实现)

1. [数据库设计](#5-数据库设计)

1. [API 接口文档](#6-api-接口文档)

1. [部署与运维](#7-部署与运维)

1. [开发指南](#8-开发指南)

1. [安全与性能](#9-安全与性能)

1. [未来规划](#10-未来规划)

---

## 1. 产品概述

### 1.1 产品定位

**AI Code Reviewer**（AI 代码审查平台）是一款基于大语言模型的智能代码审查 SaaS 平台，旨在帮助开发团队和个人开发者自动化代码审查流程，提高代码质量，减少潜在 Bug 和安全漏洞。

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-bce8ea428914.png)

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-31336ea4e305.png)

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-4e7221a806b2.png)

### 1.2 核心价值

价值点
说明

**智能审查**
基于阿里通义千问（qwen-plus）和 Ollama 本地模型，提供多维度代码分析

**即时反馈**
提交代码后 2-30 秒内获得详细审查结果

**结构化输出**
通过 Prompt 工程约束 AI 返回严格 JSON 格式，包含问题分类、严重程度、修复建议

**完整优化**
不仅指出问题，还生成可直接使用的优化后完整代码

**多语言支持**
支持 Java、Python、JavaScript、TypeScript、Go、C++、C#、PHP、Ruby、Rust、Kotlin、Swift 等主流编程语言

**历史追踪**
审查结果持久化存储，支持历史查询和趋势分析

**团队协作**
支持团队成员协同审查、项目管理和统计报告

### 1.3 目标用户

- **个人开发者**: 快速检查代码质量，学习最佳实践

- **开发团队**: 自动化代码审查流程，提高代码质量

- **技术管理者**: 监控团队代码质量趋势，制定改进计划

- **开源项目维护者**: 自动化 PR 审查，提高项目质量

### 1.4 产品特色

1. **双 AI 引擎支持**

- 云端模型：阿里通义千问 API（快速响应，2-5秒）

- 本地模型：Ollama（免费离线，10-30秒响应）

- 用户可根据需求灵活选择

1. **五维度审查**

- Bug 检测：逻辑错误、边界条件、空指针等

- 安全漏洞：SQL 注入、XSS、敏感信息泄露等

- 性能问题：算法复杂度、资源泄露、不必要的计算

- 代码风格：命名规范、格式化、注释质量

- 最佳实践：设计模式、语言特性使用、架构建议

1. **现代化 UI/UX**

- 深色主题，护眼设计

- 响应式布局，支持多设备访问

- 流畅的交互动画和过渡效果

- IDE 风格的代码展示

---

## 2. 技术架构

### 2.1 整体架构图

```plain
┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (Frontend)                         │
│  Vue 3 + TypeScript + Vite                                      │
│  端口: 5173                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  首页/落地页  │ │  登录/注册    │ │  工作台      │           │
│  │  Index.vue   │ │ Login/Register│ │  Dashboard   │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  代码评审     │ │  项目概览     │ │  质量报告     │           │
│  │  Home.vue    │ │  Overview.vue│ │ QualityReport│           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│  ┌──────────────┐ ┌──────────────┐                            │
│  │  历史记录     │ │  团队协作     │                            │
│  │  History.vue │ │  Team.vue    │                            │
│  └──────────────┘ └──────────────┘                            │
└──────────────────────────┬──────────────────────────────────────┘
                            │ HTTP/HTTPS
                            │ Axios + Supabase Auth
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    后端层 (Backend)                              │
│  Spring Boot 3.2.1 + Java 17                                   │
│  端口: 8080                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Controller 层                                             │  │
│  │  ReviewController - 代码审查接口                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Service 层                                               │  │
│  │  ReviewService - 业务逻辑协调                              │  │
│  │  AIReviewService - AI 调用与结果解析（核心）              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Security 层                                              │  │
│  │  SupabaseAuthenticationFilter - JWT 验证                  │  │
│  │  SupabaseTokenValidator - Token 校验                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Repository 层                                             │  │
│  │  ReviewRepository - 审查记录持久化                        │  │
│  │  UserRepository - 用户信息管理                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
    ┌───────────▼───────────┐     ┌───────────▼───────────┐
    │    H2 Database        │     │  AI Provider          │
    │    (内存模式)          │     │  ┌─────────────────┐ │
    │    - Review 表         │     │  │ 通义千问 API     │ │
    │    - User 表           │     │  │ (qwen-plus)     │ │
    │                        │     │  └─────────────────┘ │
    │                        │     │  ┌─────────────────┐ │
    │                        │     │  │ Ollama 本地模型 │ │
    │                        │     │  │ (qwen2.5:7b)    │ │
    │                        │     │  └─────────────────┘ │
    └────────────────────────┘     └───────────────────────┘
```

### 2.2 技术栈

#### 2.2.1 后端技术栈

技术
版本
用途

Java
17
编程语言

Spring Boot
3.2.1
应用框架

Spring Security
6.x
安全框架

Spring Data JPA
3.x
数据访问层

Spring WebFlux
3.x
响应式 HTTP 客户端（用于 AI API 调用）

H2 Database
2.x
内存数据库（开发环境）

MySQL Connector
8.0.33
MySQL 数据库驱动（生产环境）

Lombok
-
简化 Java 代码

Jackson
-
JSON 序列化/反序列化

#### 2.2.2 前端技术栈

技术
版本
用途

Vue.js
3.4.0
前端框架

TypeScript
5.3.0
类型系统

Vite
5.0.0
构建工具

Vue Router
4.2.5
路由管理

Axios
1.6.0
HTTP 客户端

Supabase JS
2.39.0
认证和用户管理

Highlight.js
11.9.0
代码高亮

#### 2.2.3 第三方服务

服务
用途

Supabase
用户认证、数据库（PostgreSQL）

阿里云 DashScope
通义千问大模型 API

Ollama
本地大模型运行环境

### 2.3 项目目录结构

```plain
ai-code-reviewer/
├── backend/                          # Spring Boot 后端
│   ├── src/main/java/com/aireviewer/
│   │   ├── AiCodeReviewerApplication.java    # 启动类
│   │   ├── config/                            # 配置类
│   │   │   ├── GlobalExceptionHandler.java   # 全局异常处理
│   │   │   ├── OpenAIConfig.java             # AI 服务配置（WebClient）
│   │   │   ├── RestTemplateConfig.java       # RestTemplate 配置
│   │   │   └── SecurityConfig.java           # Spring Security 配置
│   │   ├── controller/                        # REST 控制器
│   │   │   └── ReviewController.java         # 审查接口
│   │   ├── dto/                               # 数据传输对象
│   │   │   ├── AuthDto.java                  # 认证 DTO（已废弃）
│   │   │   └── ReviewDto.java                # 审查 DTO
│   │   ├── model/                             # JPA 实体
│   │   │   ├── Review.java                    # 审查记录实体
│   │   │   ├── ReviewRepository.java         # 审查数据访问
│   │   │   ├── User.java                      # 用户实体
│   │   │   └── UserRepository.java           # 用户数据访问
│   │   ├── security/                          # 安全组件
│   │   │   ├── SupabaseAuthenticationFilter.java    # Supabase 认证过滤器
│   │   │   ├── SupabaseTokenValidator.java           # Token 验证器
│   │   │   └── SupabaseUser.java                    # Supabase 用户详情
│   │   └── service/                            # 业务服务层
│   │       ├── AIReviewService.java           # AI 审查服务（核心）
│   │       └── ReviewService.java            # 审查业务服务
│   └── src/main/resources/
│       └── application.yml                    # 应用配置
│
├── frontend/                         # Vue 3 前端
│   ├── src/
│   │   ├── api/
│   │   │   └── review.ts            # API 封装层
│   │   ├── assets/
│   │   │   └── style.css            # 全局样式
│   │   ├── components/              # 公共组件（空）
│   │   ├── lib/
│   │   │   └── supabase.ts          # Supabase 客户端初始化
│   │   ├── router/
│   │   │   └── index.ts             # 路由配置
│   │   ├── views/                   # 页面组件
│   │   │   ├── Dashboard.vue        # 工作台主布局
│   │   │   ├── Home.vue              # 代码评审页面
│   │   │   ├── Index.vue             # 首页/落地页
│   │   │   ├── Login.vue             # 登录页
│   │   │   ├── Register.vue         # 注册页
│   │   │   ├── Overview.vue          # 项目概览页
│   │   │   ├── QualityReport.vue     # 质量报告页
│   │   │   ├── History.vue           # 历史记录页
│   │   │   └── Team.vue              # 团队协作页
│   │   ├── App.vue                   # 根组件
│   │   └── main.ts                   # 入口文件
│   ├── vite.config.ts                # Vite 配置
│   └── package.json                  # 依赖配置
│
└── docs/                             # 文档目录
    ├── README.md                      # 快速启动指南
    ├── TECHNICAL_DESIGN.md            # 技术设计文档
    ├── PRODUCT_DESIGN.md              # 产品设计文档
    ├── SUPABASE_SETUP.md             # Supabase 配置指南
    ├── GITHUB_OAUTH_SETUP.md        # GitHub OAuth 配置指南
    └── ai-code-review-prod.md        # 本文档
```

---

## 3. 功能模块详解

### 3.1 用户认证模块

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-f507eabf3ff6.png)

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-baf9ceaa981c.png)

#### 3.1.1 认证方式

- **邮箱密码注册/登录**: 通过 Supabase Auth 实现

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-e08a6eb1a460.png)

- **GitHub OAuth 登录**: 支持 GitHub 账号快速登录

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-fa47f7109b09.png)

- **JWT Token 认证**: 使用 Supabase 签发的 JWT Token

#### 3.1.2 实现细节

**前端实现** (`frontend/src/views/Login.vue`, `Register.vue`):

- 使用 `@supabase/supabase-js` 客户端

- 支持邮箱/密码登录和 GitHub OAuth

- 登录成功后跳转到 Dashboard

- 错误处理和用户提示

**后端实现** (`backend/src/main/java/com/aireviewer/security/`):

- `SupabaseAuthenticationFilter`: 拦截请求，提取 JWT Token

- `SupabaseTokenValidator`: 调用 Supabase API 验证 Token

- `SupabaseUser`: 实现 `UserDetails` 接口，存储用户信息

#### 3.1.3 安全特性

- Token 自动刷新机制

- 请求拦截器自动添加 Authorization Header

- 后端验证 Token 有效性

- 支持退出登录功能

### 3.2 代码审查模块（核心）

#### 3.2.1 审查流程

```plain
用户提交代码
    ↓
前端发送 POST /api/review/quick
    ↓
ReviewController 接收请求
    ↓
ReviewService 处理业务逻辑
    ↓
AIReviewService 调用 AI Provider
    ├─→ 通义千问 API (云端)
    └─→ Ollama (本地)
    ↓
AI 返回 JSON 格式审查结果
    ↓
解析并转换为 ReviewDto
    ↓
保存到数据库（可选）
    ↓
返回审查结果给前端
    ↓
前端展示审查结果
```

#### 3.2.2 AI Prompt 设计

**核心 Prompt 结构**:

```plain
你是一位资深的代码审查专家。请对以下代码进行全面审查：

【代码语言】: {language}
【代码内容】:
```{code}```

请从以下维度进行审查：
1. Bug 检测：逻辑错误、边界条件、空指针等
2. 安全漏洞：SQL注入、XSS、敏感信息泄露等
3. 性能问题：算法复杂度、资源泄露、不必要的计算
4. 代码风格：命名规范、格式化、注释质量
5. 最佳实践：设计模式、语言特性使用、架构建议

请按以下 JSON 格式输出审查结果：
{
  "score": 代码质量评分(0-100),
  "summary": "整体评价",
  "issues": [
    {
      "lineStart": 行号,
      "lineEnd": 行号,
      "severity": "critical|high|medium|low|info",
      "category": "bug|security|performance|style|best_practice",
      "message": "问题描述",
      "suggestion": "修复建议",
      "fixCode": "建议的修复代码（可选）"
    }
  ],
  "optimizedCode": "优化后的完整代码"
}
```

#### 3.2.3 AI Provider 切换

**支持的 Provider**:

- `qwen`: 阿里通义千问 API（默认，快速响应）

- `ollama`: Ollama 本地模型（免费离线）

**切换方式**:

- 前端选择器：用户可在 UI 中选择 AI Provider

- 配置默认值：`application.yml` 中配置 `ai.provider`

- 请求参数：API 请求中可指定 `provider` 参数

#### 3.2.4 审查结果结构

```typescript
interface ReviewResponse {
  id: number                    // 审查记录 ID
  language: string              // 编程语言
  code: string                  // 原始代码
  score: number                 // 质量评分 (0-100)
  summary: string               // 整体评价
  issues: ReviewIssue[]         // 问题列表
  optimizedCode: string         // 优化后的代码
  status: string                // 状态 (pending/completed/failed)
  createdAt: string             // 创建时间
  completedAt: string           // 完成时间
}

interface ReviewIssue {
  lineStart: number             // 起始行号
  lineEnd: number               // 结束行号
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string              // 问题分类
  message: string               // 问题描述
  suggestion: string            // 修复建议
  fixCode: string               // 修复代码
}
```

### 3.3 工作台模块（Dashboard）

#### 3.3.1 页面结构

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-69f6a5ddc7cb.png)

**左侧菜单栏**:

- 代码评审

- 项目概览

- 质量报告

- 历史记录

- 团队协作

- 系统设置

- 退出登录（底部）

**右侧内容区**:

- 根据选中的菜单项动态加载对应组件

- 支持路由参数切换：`/dashboard?menu=review`

#### 3.3.2 主要页面

**1. 代码评审页面** (`Home.vue`):

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-997e519ba37a.png)

- AI Provider 选择器（通义千问/Ollama）

- Tab 切换：代码内容 / 优化后的代码

- 代码编辑器（支持多语言）

- 审查结果展示：

- 质量评分和等级

- 问题统计（按严重程度分类）

- 详细问题列表（可展开查看代码对比）

- 优化后的完整代码

**2. 项目概览页面** (`Overview.vue`):

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-7d5878af2111.png)

- 统计卡片：总漏洞数、待修复、今日扫描次数、平均健康分

- 项目列表 Grid：

- 项目信息（名称、语言、更新时间）

- 健康评分和等级

- 进度条（安全性、性能）

- 状态消息和问题列表

- 操作按钮（进入评审、设置）

**3. 质量报告页面** (`QualityReport.vue`):

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-ad011bebd7f4.png)

- 面包屑导航

- 报告标题和基本信息

- 核心指标区：

- 问题分布环形图

- 测试覆盖率

- AI 综合点评

- 详细问题列表（可展开查看代码对比）

- 右侧扫描历史时间线

**4. 历史记录页面** (`History.vue`):

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-0a87f2943eee.png)

- 统计卡片：总扫描次数、发现问题、扫描项目、平均评分

- 时间筛选：全部/今天/本周/本月

- 历史记录列表：

- 项目名称和描述

- 扫描时间和耗时

- 评分和等级

- 问题数量

- 操作按钮（查看报告）

**5. 团队协作页面** (`Team.vue`):

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-e701864bd65e.png)

- 统计卡片：团队成员、协作项目、本周活动、待处理任务

- 团队成员列表：

- 成员信息（头像、姓名、角色）

- 评审次数和项目数

- 操作按钮（查看、消息）

- 协作项目列表：

- 项目信息

- 成员头像和数量

- 项目状态

### 3.4 首页/落地页模块

![image](/面试题/高频面试问题/AI代码 Reviewer 助手/1292-ai-code-review-product-tech-spec/img-7d31e70ee047.png)

#### 3.4.1 页面结构 (`Index.vue`)

- **顶部导航栏**: Logo、导航菜单、登录/注册按钮

- **Hero 区域**: 产品介绍、主要特性、CTA 按钮

- **IDE 演示区**: 代码展示和 AI 建议弹窗

- **功能特性**: 网格布局展示核心功能

- **页脚**: 链接和版权信息

#### 3.4.2 设计特点

- 深色主题，现代化设计

- 渐变背景和浮动光球效果

- 代码高亮和语法着色

- 响应式布局，适配多设备

---

## 4. 前后端实现

### 4.1 后端核心实现

#### 4.1.1 ReviewController

**位置**: `backend/src/main/java/com/aireviewer/controller/ReviewController.java`

**主要接口**:

```java
// 快速审查（无需登录）
POST /api/review/quick
Request Body: {
  "code": "代码内容",
  "language": "Java",
  "provider": "qwen" // 可选：qwen 或 ollama
}

// 创建审查（需登录）
POST /api/review
Request Body: {
  "code": "代码内容",
  "language": "Java",
  "provider": "qwen"
}
Headers: Authorization: Bearer {token}

// 获取审查详情
GET /api/review/{id}

// 获取用户审查历史
GET /api/review/history
Headers: Authorization: Bearer {token}
```

#### 4.1.2 AIReviewService（核心）

**位置**: `backend/src/main/java/com/aireviewer/service/AIReviewService.java`

**核心方法**:

```java
public Mono<ReviewDto.ReviewResult> reviewCode(
    String code, 
    String language, 
    String requestProvider
)
```

**实现流程**:

1. 构建 Prompt（包含代码和审查要求）

1. 根据 Provider 选择调用方式：

- `qwen`: 调用通义千问 API（WebClient）

- `ollama`: 调用 Ollama 本地 API（WebClient）

1. 解析 AI 返回的 JSON 响应

1. 转换为 `ReviewDto.ReviewResult` 对象

1. 错误处理和重试机制

**关键配置**:

- 超时设置：6 分钟（支持本地模型长响应）

- Temperature: 0.3（保证输出稳定性）

- Max Tokens: 4096（足够返回完整结果）

#### 4.1.3 ReviewService

**位置**: `backend/src/main/java/com/aireviewer/service/ReviewService.java`

**职责**:

- 协调 AIReviewService 和数据库操作

- 处理审查记录的创建和查询

- 用户关联和历史记录管理

#### 4.1.4 安全实现

**SupabaseAuthenticationFilter**:

- 拦截所有请求（排除公开接口）

- 提取 `Authorization: Bearer {token}` Header

- 调用 `SupabaseTokenValidator` 验证 Token

- 设置 `SecurityContextHolder` 中的认证信息

**SupabaseTokenValidator**:

- 调用 Supabase `/auth/v1/user` 端点验证 Token

- 解析用户信息（ID、Email、Username）

- 返回 `SupabaseUser` 对象

### 4.2 前端核心实现

#### 4.2.1 路由配置

**位置**: `frontend/src/router/index.ts`

**路由列表**:

- `/`: 首页（Index.vue）

- `/dashboard`: 工作台（Dashboard.vue）

- `/review`: 代码评审（Home.vue，已整合到 Dashboard）

- `/login`: 登录页（Login.vue）

- `/register`: 注册页（Register.vue）

#### 4.2.2 API 封装

**位置**: `frontend/src/api/review.ts`

**主要方法**:

```typescript
// 快速审查
reviewApi.quickReview({
  code: string,
  language: string,
  provider?: 'qwen' | 'ollama'
}): Promise&lt;ReviewResponse&gt;

// 获取审查详情
reviewApi.getReview(id: number): Promise&lt;ReviewResponse&gt;
```

**特性**:

- 自动添加 Supabase Token 到请求头

- 5 分钟超时设置（支持本地模型）

- TypeScript 类型定义

#### 4.2.3 Supabase 集成

**位置**: `frontend/src/lib/supabase.ts`

**功能**:

- 初始化 Supabase 客户端

- 提供 `getCurrentUser()` 和 `getCurrentSession()` 工具函数

- 配置 Supabase URL 和 Anon Key

#### 4.2.4 主要组件实现

**Dashboard.vue**:

- 左侧菜单栏：响应式菜单，支持展开/收起

- 右侧内容区：动态加载子组件

- 路由参数解析：支持 `?menu=xxx` 切换页面

- 退出登录：调用 Supabase `signOut()` 并跳转

**Home.vue**:

- AI Provider 选择器

- Tab 切换（代码输入/优化代码）

- 代码编辑器（Textarea）

- 审查结果展示：

- 评分卡片

- 问题统计

- 问题列表（可展开代码对比）

- 优化代码展示

**Overview.vue**:

- 搜索功能（按项目名/语言筛选）

- 统计卡片（4 个指标）

- 项目卡片 Grid（响应式布局）

**QualityReport.vue**:

- 面包屑导航

- 环形图（CSS conic-gradient）

- 代码对比（Diff 视图）

- 时间线（扫描历史）

---

## 5. 数据库设计

### 5.1 数据模型

#### 5.1.1 Review 实体

**位置**: `backend/src/main/java/com/aireviewer/model/Review.java`

**字段定义**:

```java
@Entity
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String language;           // 编程语言
    private String code;                // 原始代码
    private Integer score;              // 质量评分 (0-100)
    private String summary;             // 整体评价
    private String optimizedCode;       // 优化后的代码
    private String userEmail;           // 用户邮箱（关联 Supabase）
    private ReviewStatus status;        // 状态 (PENDING/COMPLETED/FAILED)
    private LocalDateTime createdAt;   // 创建时间
    private LocalDateTime completedAt;  // 完成时间
}
```

**关系**:

- Review 与 User 通过 `userEmail` 关联（非外键，因为用户数据在 Supabase）

#### 5.1.2 User 实体

**位置**: `backend/src/main/java/com/aireviewer/model/User.java`

**字段定义**:

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String email;               // 用户邮箱（Supabase）
    private String username;             // 用户名
    private LocalDateTime createdAt;    // 创建时间
}
```

**说明**:

- 用户主数据存储在 Supabase PostgreSQL

- 本地 User 表仅用于关联审查记录（可选）

### 5.2 数据库配置

**开发环境** (H2):

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:aireviewer
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop  # 自动创建表结构
```

**生产环境** (MySQL):

- 需要配置 MySQL 数据源

- 修改 `ddl-auto` 为 `update` 或使用 Flyway/Liquibase

### 5.3 Supabase PostgreSQL

**用户表** (Supabase Auth):

- 由 Supabase 自动管理

- 包含：id, email, encrypted_password, email_confirmed_at 等

**自定义表** (可选):

- 可在 Supabase Dashboard 创建自定义表

- 通过 Supabase JS SDK 访问

---

## 6. API 接口文档

### 6.1 基础信息

**Base URL**: `http://localhost:8080/api`

**认证方式**: Bearer Token (JWT)

```plain
Authorization: Bearer {supabase_access_token}
```

### 6.2 代码审查接口

#### 6.2.1 快速审查

**接口**: `POST /api/review/quick`

**描述**: 快速代码审查，无需登录

**请求体**:

```json
{
  "code": "public class Test {\n    public static void main(String[] args) {\n        System.out.println(\"Hello\");\n    }\n}",
  "language": "Java",
  "provider": "qwen"  // 可选：qwen 或 ollama，默认使用配置文件的 provider
}
```

**响应**:

```json
{
  "id": 1,
  "language": "Java",
  "code": "原始代码...",
  "score": 85,
  "summary": "代码整体质量良好，但存在一些可以改进的地方...",
  "issues": [
    {
      "lineStart": 2,
      "lineEnd": 2,
      "severity": "medium",
      "category": "style",
      "message": "建议使用更描述性的变量名",
      "suggestion": "将 'args' 改为更具描述性的名称",
      "fixCode": "public static void main(String[] commandLineArgs)"
    }
  ],
  "optimizedCode": "优化后的完整代码...",
  "status": "COMPLETED",
  "createdAt": "2024-12-21T10:30:00",
  "completedAt": "2024-12-21T10:30:05"
}
```

**状态码**:

- `200 OK`: 审查成功

- `400 Bad Request`: 请求参数错误

- `500 Internal Server Error`: 服务器错误或 AI 调用失败

#### 6.2.2 创建审查（需登录）

**接口**: `POST /api/review`

**描述**: 创建审查记录并关联用户

**请求头**:

```plain
Authorization: Bearer {token}
```

**请求体**: 同快速审查

**响应**: 同快速审查（包含用户信息）

#### 6.2.3 获取审查详情

**接口**: `GET /api/review/{id}`

**描述**: 根据 ID 获取审查详情

**路径参数**:

- `id`: 审查记录 ID

**响应**: 同快速审查响应格式

#### 6.2.4 获取用户审查历史

**接口**: `GET /api/review/history`

**描述**: 获取当前用户的审查历史列表

**请求头**:

```plain
Authorization: Bearer {token}
```

**响应**:

```json
[
  {
    "id": 1,
    "language": "Java",
    "score": 85,
    "summary": "代码整体质量良好...",
    "status": "COMPLETED",
    "createdAt": "2024-12-21T10:30:00"
  },
  ...
]
```

### 6.3 错误响应格式

```json
{
  "timestamp": "2024-12-21T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "代码内容不能为空",
  "path": "/api/review/quick"
}
```

---

## 7. 部署与运维

### 7.1 开发环境启动

#### 7.1.1 前置要求

- Java 17+

- Node.js 18+

- Maven 3.6+（或使用项目自带的 `mvnw`）

- Supabase 账号（用于认证）

- 阿里云 DashScope API Key（可选，用于通义千问）

- Ollama（可选，用于本地模型）

#### 7.1.2 后端启动

```bash
# 1. 配置 Supabase
编辑 backend/src/main/resources/application.yml:
  supabase:
    url: https://your-project.supabase.co
    anon-key: your-anon-key

# 2. 配置 AI Provider（可选）
编辑 application.yml:
  ai:
    provider: qwen  # 或 ollama
  qwen:
    api-key: your-dashscope-api-key

# 3. 启动后端
cd backend
./mvnw spring-boot:run
# Windows: mvnw.cmd spring-boot:run
```

后端将在 `http://localhost:8080` 启动

#### 7.1.3 前端启动

```bash
# 1. 安装依赖
cd frontend
npm install

# 2. 配置 Supabase（可选，有默认值）
创建 .env 文件:
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key

# 3. 启动开发服务器
npm run dev
```

前端将在 `http://localhost:5173` 启动

#### 7.1.4 Vite 代理配置

**位置**: `frontend/vite.config.ts`

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true
    }
  }
}
```

### 7.2 生产环境部署

#### 7.2.1 后端部署

**方式 1: JAR 包部署**

```bash
# 构建
cd backend
./mvnw clean package

# 运行
java -jar target/ai-code-reviewer-1.0.0-SNAPSHOT.jar
```

**方式 2: Docker 部署**

```dockerfile
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY target/ai-code-reviewer-1.0.0-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### 7.2.2 前端部署

**构建**:

```bash
cd frontend
npm run build
```

**部署到 Nginx**:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/ai-code-reviewer/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 7.2.3 环境变量配置

**后端** (`application.yml` 或环境变量):

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/aireviewer
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

supabase:
  url: ${SUPABASE_URL}
  anon-key: ${SUPABASE_ANON_KEY}

qwen:
  api-key: ${DASHSCOPE_API_KEY}
```

**前端** (`.env.production`):

```plain
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://api.your-domain.com
```

### 7.3 监控与日志

**日志配置**:

- Spring Boot 默认使用 Logback

- 日志级别可在 `application.yml` 配置

- 建议生产环境使用 `INFO` 级别

**健康检查**:

- Spring Boot Actuator（可选）

- 端点：`/actuator/health`

---

## 8. 开发指南

### 8.1 添加新的 AI Provider

**步骤**:

1. 在 `AIReviewService` 中添加新的 Provider 判断

1. 实现对应的调用方法（如 `callNewProvider()`）

1. 配置 `WebClient` 实例（在 `OpenAIConfig` 或新建配置类）

1. 在 `application.yml` 中添加配置项

1. 前端添加 Provider 选择选项

**示例**:

```java
// AIReviewService.java
if ("new-provider".equals(actualProvider)) {
    return callNewProvider(prompt);
}
```

### 8.2 添加新的问题分类

**步骤**:

1. 更新 Prompt，添加新的分类说明

1. 前端添加对应的分类图标和样式

1. 统计功能自动支持新分类

### 8.3 自定义审查规则

**方式**:

- 修改 Prompt 中的审查要求

- 添加特定语言的审查规则

- 实现规则引擎（高级功能）

### 8.4 前端组件开发

**组件结构**:

```vue
&lt;template&gt;
  &lt;!-- HTML 结构 --&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
// TypeScript 逻辑
&lt;/script&gt;

&lt;style scoped&gt;
/* 组件样式 */
&lt;/style&gt;

```

**状态管理**:

- 使用 Vue 3 Composition API

- 大型应用可考虑 Pinia

---

## 9. 安全与性能

### 9.1 安全措施

#### 9.1.1 认证与授权

- **JWT Token 验证**: 所有受保护接口验证 Supabase Token

- **Token 刷新**: 前端自动处理 Token 刷新

- **CORS 配置**: 限制允许的源

- **输入验证**: 使用 `@Valid` 注解验证请求参数

#### 9.1.2 数据安全

- **敏感信息**: API Key 等配置通过环境变量管理

- **代码隔离**: 用户代码在审查后可选删除

- **HTTPS**: 生产环境强制使用 HTTPS

#### 9.1.3 防护措施

- **SQL 注入**: 使用 JPA，避免原生 SQL

- **XSS**: Vue 自动转义，避免 `v-html` 直接渲染用户输入

- **CSRF**: Spring Security 默认防护

### 9.2 性能优化

#### 9.2.1 后端优化

- **异步处理**: 使用 WebFlux 响应式编程

- **连接池**: 数据库连接池配置

- **缓存**: 可添加 Redis 缓存常见审查结果

- **超时控制**: AI API 调用设置合理超时

#### 9.2.2 前端优化

- **代码分割**: Vite 自动代码分割

- **懒加载**: 路由组件懒加载

- **资源压缩**: 生产构建自动压缩

- **CDN**: 静态资源可部署到 CDN

#### 9.2.3 AI 调用优化

- **Prompt 优化**: 精简 Prompt，减少 Token 消耗

- **结果缓存**: 相同代码可缓存审查结果

- **批量处理**: 支持批量审查（未来功能）

### 9.3 性能指标

指标
目标值
当前值

页面加载时间
< 2s
~1.5s

API 响应时间（非 AI）
< 500ms
~200ms

AI 审查时间（通义千问）
< 10s
2-5s

AI 审查时间（Ollama）
< 60s
10-30s

并发用户数
100+
未测试

---

## 10. 未来规划

### 10.1 短期计划（1-3个月）

1. **GitHub 集成**

- Webhook 自动触发审查

- PR 评论自动添加

- 代码 Diff 审查

1. **更多 AI Provider**

- OpenAI GPT-4

- Claude API

- 本地 CodeLlama

1. **规则配置**

- 自定义审查规则

- 规则开关

- 严重程度调整

1. **报告导出**

- PDF 报告生成

- Excel 数据导出

- 邮件发送报告

### 10.2 中期计划（3-6个月）

1. **团队功能增强**

- 团队权限管理

- 审查任务分配

- 协作评论功能

1. **代码仓库集成**

- GitLab 集成

- Bitbucket 集成

- 自托管 Git 支持

1. **CI/CD 集成**

- GitHub Actions

- GitLab CI

- Jenkins Plugin

1. **高级分析**

- 代码质量趋势

- 团队统计报告

- 问题热力图

### 10.3 长期计划（6-12个月）

1. **企业版功能**

- 私有化部署

- SSO 单点登录

- 审计日志

1. **AI 模型优化**

- 微调专用代码审查模型

- 多模型融合

- 增量学习

1. **移动端应用**

- iOS App

- Android App

- 移动端优化界面

1. **生态建设**

- VS Code 插件

- IntelliJ IDEA 插件

- CLI 工具

---

## 附录

### A. 配置文件示例

#### A.1 后端配置 (`application.yml`)

```yaml
server:
  port: 8080
  connection-timeout: 360000

spring:
  application:
    name: ai-code-reviewer
  datasource:
    url: jdbc:h2:mem:aireviewer
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop

ai:
  provider: qwen

qwen:
  api-key: ${DASHSCOPE_API_KEY}
  api-url: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
  model: qwen-plus
  max-tokens: 4096
  temperature: 0.3

ollama:
  base-url: http://localhost:11434
  model: qwen2.5:7b
  temperature: 0.3

supabase:
  url: ${SUPABASE_URL}
  anon-key: ${SUPABASE_ANON_KEY}

cors:
  allowed-origins: http://localhost:5173
```

#### A.2 前端配置 (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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

### B. 常见问题

#### B.1 AI 调用失败

**问题**: AI API 返回错误或超时

**解决方案**:

1. 检查 API Key 是否正确

1. 检查网络连接

1. 增加超时时间

1. 检查 API 配额

#### B.2 Token 验证失败

**问题**: 后端无法验证 Supabase Token

**解决方案**:

1. 检查 Supabase URL 和 Anon Key 配置

1. 检查 Token 是否过期

1. 检查网络连接

1. 查看后端日志

#### B.3 前端路由问题

**问题**: 刷新页面后 404

**解决方案**:

- 配置 Nginx 或其他 Web 服务器的 `try_files` 规则

- 确保所有路由都指向 `index.html`

### C. 参考资料

- [Spring Boot 官方文档](https://spring.io/projects/spring-boot)

- [Vue.js 官方文档](https://vuejs.org/)

- [Supabase 文档](https://supabase.com/docs)

- [阿里云 DashScope 文档](https://help.aliyun.com/zh/dashscope/)

- [Ollama 文档](https://ollama.ai/docs)

---

**文档结束**

*本文档由 AI Code Reviewer 团队维护，如有问题或建议，请联系开发团队。*
