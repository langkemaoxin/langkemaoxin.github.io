---
title: "第 1 课  AI Code Reviewer 快速上手与完整体验"
sidebarGroup: "AI代码 Reviewer 助手"
shortTitle: "第 1 课  AI Code Reviewer 快速上手与完整体验"
order: 1297
date: 2026-07-22
category: "面试题"
tag:
  - "面试题"
description: "课程目标： 知道这个 Java + AI 审查器能做什么 能在本机跑起来前后端 完整体验一次“代码 → AI 审查 → 优化后的代码”的闭环一、本课要解决什么问题？痛点 1： 日常写完代码，没有人帮你做 Code Review，很多隐患拖到"
article: false
---

> 来源：[第 1 课  AI Code Reviewer 快速上手与完整体验](https://www.yuque.com/tulingzhouyu/db22bv/gg2gitlbzd9yuex3)

**课程目标：**

- 知道这个 Java + AI 审查器能做什么

- 能在本机跑起来前后端

- 完整体验一次“代码 → AI 审查 → 优化后的代码”的闭环

---

## 一、本课要解决什么问题？

- **痛点 1：** 日常写完代码，没有人帮你做 Code Review，很多隐患拖到上线才暴露

- **痛点 2：** 想用 AI 帮忙看代码，但只会在聊天窗口里“问一问”，无法形成固定流程

- **本课目标：** 用一套 Java + AI 小工具，把“AI 代码审查”固化成一个稳定流程：

- 输入代码 → AI 给评分 & 问题列表 → 生成一份**优化后的完整代码**

---

## 二、项目整体结构（只看关键）

- **后端（backend）** – Spring Boot 3

- `controller/ReviewController.java`：审查接口入口（`/api/review/quick`）

- `service/ReviewService.java`：负责审查流程 & 落库

- `service/AIReviewService.java`：与阿里通义千问对话，拿到 JSON 审查结果

- `dto/ReviewDto.java`：请求 / 响应的数据结构

- **前端（frontend）** – Vue 3 + TypeScript

- `src/App.vue`：页面布局和交互逻辑

- `src/api/review.ts`：封装调用 `/api/review/quick` 的 API

- `src/assets/style.css`：样式（包括左右布局、优化代码区域等）

---

## 三、运行环境准备

- **必须软件：**

- Java 17+

- Node.js（自带 npm）

- **必须配置：**

- 获取阿里云 DASHSCOPE 的 API Key

- 在后端配置中填写：

- 可以在环境变量里设置 `DASHSCOPE_API_KEY`

- 或在 `backend/src/main/resources/application.yml` 中配置：

```yaml
qwen:
  api-key: "你的-dashscope-api-key"
```

---

## 四、启动步骤（后端 + 前端）

1. **启动后端（Spring Boot）**

- 终端执行：

```bash
cd backend
./mvnw spring-boot:run
```

- 成功后：

- 控制台会看到 `Tomcat started on port 8080`

- 后端地址：`http://localhost:8080`

1. **启动前端（Vite + Vue 3）**

- 新开一个终端：

```bash
cd frontend
npm install
npm run dev
```

- 浏览器访问：`http://localhost:5173`

---

## 五、第一次完整体验：审查一段“有坑”的 Java 代码

1. **在左侧输入区粘贴下面的示例代码：**

```java
import java.util.List;

public class UserUtils {
    // 这是一个充满槽点的代码片段
    public String handle(List&lt;String&gt; list, String type) {
        String s = "";
        if (type == "VIP") { // 使用 == 比较字符串
            for (int i = 0; i < list.size(); i++) {
                String u = list.get(i);
                if (u.length() > 5) {
                    s = s + u + ","; // 频繁字符串拼接
                    System.out.println("Add user: " + u); // 直接打印日志
                }
            }
        } else {
            return null; // 返回 null，不利于调用方处理
        }
        return s;
    }
}
```

1. **点击“开始审查”按钮**

- 按钮在左上角标题“输入 Java 代码”的右侧

- 点击后，右侧会进入“AI 正在分析”的加载状态

1. **观察右侧“审查结果”区域**

- **代码质量评分**：一个 0–100 的分数圈，旁边有一句简短评价

- **总结**：一段对整体代码质量的文字说明

- **问题列表**：每条包含：

- 行号范围（如：行 4–17）

- 严重程度：严重、高、中、低、建议

- 问题类型：Bug / 性能 / 风格 / 最佳实践等

- 问题描述 + 修复建议

- 这一块相当于一个资深工程师给你的 Code Review 反馈

1. **观察左下“优化后的代码”区域**

- 标题始终是：**“优化后的代码”**

- 审查完成后，这里会展示一份 **完整的、优化后的 Java 源码**

- 你可以对比：

- 字符串拼接是否改成了 `StringBuilder`

- `==` 比较字符串是否改成 `equals`

- 分支结构、返回值是否更安全、易读

---

# 六、本课技术亮点与爆点

### 亮点 1：一条 API Key 打通 Java + AI 全链路（最小成本接入 AI）

- 只需在 `application.yml` 配置一个 `qwen.api-key`，整个 AI 审查能力立刻生效；

- 这是真实项目中「最小可用 AI 能力接入」的典型案例；

- **可复用性极强**：任何 Spring Boot 项目都能用同样方式接入大模型。

### 亮点 2：AI 不是"聊天工具"，而是"产品功能"

- 一次点击，你得到的不是一堆对话，而是：

- 0–100 的代码质量评分；

- 结构化的问题列表（行号、严重程度、分类、修复建议）；

- **完整的优化后 Java 源码**（而不是零碎的建议片段）。

- 这背后的关键：**后端用 Prompt 约束了 AI 的输出格式，让它按「数据协议」返回，而不是自由发挥**。

### 亮点 3：前后对比 = 最直观的代码学习方式

- 左上：你的原始代码；

- 左下：AI 优化后的完整代码；

- 右侧：问题列表 + 评分。

- 学员可以直接对比：

- 字符串拼接 `+` → `StringBuilder`；

- `==` 比字符串 → `equals()`；

- `return null` → 更安全的返回值设计。

- **这种"原版 vs 优化版"的并排展示，比单纯看文档规范更有学习效果。**

---

# 七、本课课后练习

- **练习 1：** 换一段你自己项目里的真实 Java 代码，丢进工具审查一次，看看评分和问题是否有共鸣。

- **练习 2：** 把"优化后的代码"复制到 IDE 里，用 diff 工具对比，挑出 2–3 点你觉得确实更好的写法，并思考为什么 AI 会这样改。

- **练习 3（选做）：** 尝试故意写几种"坏代码"（如：未关闭资源、空指针风险、SQL 注入隐患），看看 AI 是否能指出来，以及它给出的修复建议是否靠谱。

- **练习 4（进阶）：** 把同一段代码审查两次，对比两次返回的"优化后的代码"是否完全一致，体会大模型的「非确定性」特点。
