---
title: "项目中所需的知识点"
sidebarGroup: "项目与工作流"
shortTitle: "项目知识点地图"
order: 21
date: 2026-04-01
category: "笔记"
tag:
  - ""
---

**核心技术点总表**

| 技术点 | 在这个项目里的作用 | GitHub 仓库 | 官方/核心学习资料 |
|---|---|---|---|
| Aegra | 整个后端服务壳子，负责标准 Agent API、部署、运行 | [ibbybuilds/aegra](https://github.com/ibbybuilds/aegra) | 仓库 README: [Aegra](https://github.com/ibbybuilds/aegra) |
| LangGraph | Agent graph 编排核心，`jzfz` 的 graph 就挂在这里 | [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | 概览: [LangGraph overview](https://docs.langchain.com/oss/python/langgraph) |
| LangChain | 模型、工具、消息、agent 抽象层 | [langchain-ai/langchain](https://github.com/langchain-ai/langchain) | 概览: [LangChain overview](https://docs.langchain.com/oss/python/langchain/overview) |
| DeepAgents | 当前项目创建 deep agent 的直接框架 | [langchain-ai/deepagents](https://github.com/langchain-ai/deepagents) | 仓库 README: [deepagents](https://github.com/langchain-ai/deepagents) |
| MCP 协议 | 外部工具接入标准，项目里 `mcp.json` 就是这套协议 | [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk) | 介绍: [MCP Introduction](https://modelcontextprotocol.io/schema/v1) |
| MCP 规范 | 理解 tools/resources/prompts/client-server 架构必看 | [modelcontextprotocol](https://github.com/modelcontextprotocol) | 规范总览: [MCP Specification Overview](https://modelcontextprotocol.io/specification/2025-06-18/basic) |
| LangChain MCP Adapters | 把 MCP server 转成 LangChain/LangGraph 可用工具 | [langchain-ai/langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters) | 仓库 README: [langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters) |
| FastAPI | Aegra API 底层 Web 框架基础 | [fastapi/fastapi](https://github.com/fastapi/fastapi) | 文档: [FastAPI Docs](https://fastapi.tiangolo.com/) |
| Uvicorn | ASGI 服务启动器，`serve.py` 最终就是起它 | [Kludex/uvicorn](https://github.com/Kludex/uvicorn) | 文档/仓库: [Uvicorn](https://github.com/Kludex/uvicorn) |
| PostgreSQL | 运行状态、threads、runs、迁移的持久化存储 | [postgres/postgres](https://github.com/postgres/postgres) | 官方文档: [PostgreSQL Docs](https://www.postgresql.org/docs/) |
| Docker | 本地数据库、可选沙箱 backend、部署支撑 | [moby/moby](https://github.com/moby/moby) | 安装: [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/) |
| uv | Python 依赖管理和虚拟环境工具，这个项目就是用它 | [astral-sh/uv](https://github.com/astral-sh/uv) | 官方文档: [uv Docs](https://docs.astral.sh/uv/) |
| OpenAI Python SDK | 项目支持 `langchain-openai`，常见模型接入来源 | [openai/openai-python](https://github.com/openai/openai-python) | API 文档: [OpenAI Platform Docs](https://platform.openai.com/docs) |
| Anthropic Python SDK | 项目默认模型配置里就有 Anthropic 风格模型 | [anthropics/anthropic-sdk-python](https://github.com/anthropics/anthropic-sdk-python) | 文档: [Anthropic Docs](https://docs.anthropic.com/) |
| Langfuse | 可观测性/Tracing，可选集成 | [langfuse/langfuse](https://github.com/langfuse/langfuse) | 文档: [Langfuse Docs](https://langfuse.com/docs) |
| OpenTelemetry | 链路追踪基础设施，`.env.example` 里有 OTEL 配置 | [open-telemetry/opentelemetry-python](https://github.com/open-telemetry/opentelemetry-python) | 文档入口: [OpenTelemetry Python](https://github.com/open-telemetry/opentelemetry-python) |
| SearXNG | 当前配置里的 MCP 搜索服务之一 | [searxng/searxng](https://github.com/searxng/searxng) | 仓库 README: [SearXNG](https://github.com/searxng/searxng) |
| Firecrawl | 当前配置里的 MCP 抓取服务之一 | [firecrawl/firecrawl](https://github.com/firecrawl/firecrawl) | 仓库 README: [Firecrawl](https://github.com/firecrawl/firecrawl) |
| asyncpg | PostgreSQL 的异步驱动，Aegra/SQLAlchemy 这一层会用到 | [MagicStack/asyncpg](https://github.com/MagicStack/asyncpg) | 文档: [asyncpg Docs](https://magicstack.github.io/asyncpg/) |
| SQLAlchemy | Aegra API 的数据库 ORM/迁移生态基础 | [sqlalchemy/sqlalchemy](https://github.com/sqlalchemy/sqlalchemy) | 文档: [SQLAlchemy 2.0 Docs](https://docs.sqlalchemy.org/20/) |
| python-dotenv | `.env` 读取，`serve.py` 里直接用了 | [theskumar/python-dotenv](https://github.com/theskumar/python-dotenv) | 仓库 README: [python-dotenv](https://github.com/theskumar/python-dotenv) |
| structlog | 项目里大量结构化日志输出 | [hynek/structlog](https://github.com/hynek/structlog) | 仓库 README: [structlog](https://github.com/hynek/structlog) |

**你最需要优先学的资料**
先学这 8 个，够你把这个项目真正看懂：

1. LangGraph  
文档: [https://docs.langchain.com/oss/python/langgraph](https://docs.langchain.com/oss/python/langgraph)  
仓库: [https://github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)

2. LangChain  
文档: [https://docs.langchain.com/oss/python/langchain/overview](https://docs.langchain.com/oss/python/langchain/overview)  
仓库: [https://github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain)

3. DeepAgents  
仓库: [https://github.com/langchain-ai/deepagents](https://github.com/langchain-ai/deepagents)

4. MCP  
介绍: [https://modelcontextprotocol.io/schema/v1](https://modelcontextprotocol.io/schema/v1)  
规范: [https://modelcontextprotocol.io/specification/2025-06-18/basic](https://modelcontextprotocol.io/specification/2025-06-18/basic)  
Tools 概念: [https://modelcontextprotocol.io/docs/concepts/tools](https://modelcontextprotocol.io/docs/concepts/tools)

5. LangChain MCP Adapters  
仓库: [https://github.com/langchain-ai/langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters)

6. Aegra  
仓库: [https://github.com/ibbybuilds/aegra](https://github.com/ibbybuilds/aegra)

7. PostgreSQL  
文档: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)

8. Docker  
文档: [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/)

**补充学习资料**
这些是“上手开发”很有帮助的补充：

- LangChain Academy: [https://academy.langchain.com/](https://academy.langchain.com/)
- uv 文档: [https://docs.astral.sh/uv/](https://docs.astral.sh/uv/)
- FastAPI 文档: [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)
- OpenAI Python SDK: [https://github.com/openai/openai-python](https://github.com/openai/openai-python)
- OpenAI API 文档: [https://platform.openai.com/docs](https://platform.openai.com/docs)
- Anthropic SDK: [https://github.com/anthropics/anthropic-sdk-python](https://github.com/anthropics/anthropic-sdk-python)
- Anthropic 文档: [https://docs.anthropic.com/](https://docs.anthropic.com/)
- Langfuse 文档: [https://langfuse.com/docs](https://langfuse.com/docs)

**推荐学习顺序**
如果你想最高效，不要乱学，按这个顺序：

1. `LangGraph`
2. `LangChain`
3. `DeepAgents`
4. `MCP 协议 + MCP Adapters`
5. `Aegra`
6. `PostgreSQL`
7. `Docker`
8. `OpenAI/Anthropic`
9. `Langfuse/OTEL` 
