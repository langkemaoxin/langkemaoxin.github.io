---
title: "MCP：工具生态的 USB-C"
sidebarGroup: "阶段 3 · Agent 工程"
shortTitle: "03 MCP"
order: 3
date: 2026-08-23
category: "AI"
tag:
  - "AI"
  - "Agent"
  - "实战"
  - "MCP"
description: "【占位待学】MCP：工具生态的 USB-C——对应总纲阶段 3 · 单元 3.3。学完本篇应能：说清 MCP 与 function calling 的关系（协议化 + 可发现）"
---

> **AICon 2026 学习系列 · 阶段 3 · Agent 工程 · 第 18/43 篇 · 🚧 占位待学**
> 上一篇：[《工具设计工程学：写给模型看的 API 文档》](/Ai/3-agent-core/agent-core-02-tool-design)
> 下一篇：[《规划模式：先画图再走 vs 边走边看》](/Ai/3-agent-core/agent-core-04-planning)
> 学习大纲：[《AICon 2026 学习总纲》](/Ai/roadmap/aicon-2026-roadmap)

---

> **状态：待学习。** 本文为占位文档：知识点清单、实验与验收标准已就绪，正文待按「先学习、先实验、再撰写」补全。
> 对应总纲单元：**阶段 3 · 单元 3.3**

## 一、本文要解决的问题

每个应用都给每个模型写一遍工具对接？MCP（Model Context Protocol）把工具、资源、提示做成标准协议——服务端一次实现，客户端处处接入。它已成为事实标准，是 AICon 2026 一切 Agent 互操作讨论的底座。

## 二、知识点清单

- MCP 三类原语：tools / resources / prompts
- 架构：host、client、server 的关系与传输（stdio / HTTP+SSE）
- 与 function calling 的关系：FC 是模型能力，MCP 是工具分发协议
- 生态现状：主流客户端与公共 server（文件系统、数据库、浏览器……）
- 安全面：MCP server 的信任与沙箱问题

## 三、动手实验（学习时必须真跑）

- 用官方 SDK 写一个最小 MCP server（如「查通讯录」假数据），接进一个 MCP 客户端调用成功
- 换一个现成公共 server（如 filesystem）接入，体验「一次实现、处处接入」

## 四、验收标准（全部通过才进入下一篇）

- [ ] 说清 MCP 与 function calling 的关系（协议化 + 可发现）
- [ ] 亲手写过并跑通过一个 MCP server

## 五、写作提示（补正文时遵守）

- 开篇问题驱动；结构走「是什么 → 为什么 → 怎么做 → 背景知识」
- 所有代码、命令、输出必须先在本机跑通再写入，不得杜撰
- 版本口径以总纲环境清单为准（Python 3.12 / Ollama / vLLM 与 SGLang 最新版 / Spring AI 1.x）
- 涉及版本敏感结论时标注出处与时间

---

> 本篇完成后，把文首导航块的「🚧 占位待学」去掉，并在总纲处打卡。
