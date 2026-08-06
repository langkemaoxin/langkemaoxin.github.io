import { sidebar } from "vuepress-theme-hope";

// 由 scripts/gen-sidebar.mjs 自动生成，请勿手改。
// 新增分类：直接建子文件夹；新增文章：放入对应文件夹并写 shortTitle / order / sidebarGroup
// icon / 显示名可在 scripts/sidebar.config.mjs 的 folderIcons / folderTitles 里覆盖
// 然后运行：pnpm sidebar:gen
export default sidebar({
  "/Ai/": [
    "",
    {
      text: "基础知识",
      icon: "book",
      prefix: "基础知识/",
      collapsible: true,
      children: [
        "harness-engineering",
      ],
    },
    {
      text: "Agent / 方法论",
      icon: "lightbulb",
      prefix: "agent/",
      collapsible: true,
      children: [
        "how-to-build-tech-info-radar",
        "how-to-build-tech-info-radar copy",
        "harness-engineering",
        "2026年AI-Agent框架选型指南：从“大爆发”到“大灭绝”后的生存法则",
      ],
    },
    {
      text: "本地模型",
      icon: "server",
      prefix: "local-llm/",
      collapsible: true,
      children: [
        "ollama-opencode-local-llm",
        "qwen3-5-27b-deep-dive",
      ],
    },
    {
      text: "自动化 / Playwright",
      icon: "robot",
      prefix: "playwright/",
      collapsible: true,
      children: [
        "playwright-cli-learn",
        "playwright-Agent-Skills",
        "playwright-Agent-Skills-Ai-News",
        "LangChain-Learn",
        "技术专家10问自查清单",
      ],
    },
    {
      text: "RAG / LangChain",
      icon: "book",
      prefix: "rag/",
      collapsible: true,
      children: [
        "langchain-rag",
      ],
    },
  ],
  "/BigData/": [
    "",
    {
      text: "Hadoop 系列",
      icon: "database",
      prefix: "hadoop-series/",
      collapsible: true,
      children: [
        "hadoop-series-01-what-is-hadoop",
        "hadoop-series-02-hdfs-core-concepts",
        "hadoop-series-03-hdfs-read-write",
        "hadoop-series-04-mapreduce",
        "hadoop-series-05-yarn",
        "hadoop-series-06-hive",
        "hadoop-series-07-kafka-hadoop",
        "hadoop-series-08-hbase",
        "hadoop-series-09-data-warehouse",
        "hadoop-series-10-future",
      ],
    },
    {
      text: "实战与概念",
      icon: "flask",
      prefix: "practice/",
      collapsible: true,
      children: [
        "hadoop-docker-wordcount-demo",
        "lambda-kappa-architecture-concepts",
      ],
    },
  ],
  "/DotNet/": [
    "",
    {
      text: "ASP.NET Core",
      icon: "code",
      prefix: "aspnetcore/",
      collapsible: true,
      children: [
        "1-kestrel-socket-connection-listener",
        "2-aspnetcore-request-pipeline-debug",
        "3-aspnetcore-10-source-map",
        "4-aspnetcore-10-source-build-retrospective",
      ],
    },
  ],
  "/Java/": [
    "",
    {
      text: "源码调试",
      icon: "code",
      prefix: "source-debug/",
      collapsible: true,
      children: [
        "mybatis-source-debug-setup",
      ],
    },
  ],
  "/Windows/": [
    "",
    {
      text: "权限",
      icon: "shield-halved",
      prefix: "permissions/",
      collapsible: true,
      children: [
        "windows-permission-acl-ad",
      ],
    },
    {
      text: "环境搭建",
      icon: "laptop-code",
      prefix: "setup/",
      collapsible: true,
      children: [
        "windows-wsl-docker-hadoop-setup",
        "fix-jekyll-build-on-windows",
      ],
    },
  ],
  "/Tools/": [
    "",
    {
      text: "编码与发布",
      icon: "file-code",
      prefix: "encoding-publish/",
      collapsible: true,
      children: [
        "Utf8_And_Unicode",
        "how-a-local-folder-gets-published-to-github",
      ],
    },
    {
      text: "Git / 代理",
      icon: "network-wired",
      prefix: "git-proxy/",
      collapsible: true,
      children: [
        "git-proxy-internal-repo-fix",
        "clash-verge-tun-mode-git-ssh-fix",
      ],
    },
    {
      text: "其他工具",
      icon: "screwdriver-wrench",
      prefix: "misc/",
      collapsible: true,
      children: [
        "yt-dlp的使用",
      ],
    },
  ],
  "/English/": [
    "",
    {
      text: "论文生词",
      icon: "language",
      prefix: "vocabulary/",
      collapsible: true,
      children: [
        "eventual-consistency-b1-vocabulary",
      ],
    },
  ],
  "/Notes/": [
    "",
    {
      text: "基础概念",
      icon: "lightbulb",
      prefix: "concepts/",
      collapsible: true,
      children: [
        "one-hot",
        "math-jax",
      ],
    },
    {
      text: "HAMi",
      icon: "microchip",
      prefix: "hami/",
      collapsible: true,
      children: [
        "Hami",
        "Hami-Learning",
        "Hami-Use",
        "Hami-UseTo-Make-Money",
      ],
    },
    {
      text: "项目与工作流",
      icon: "diagram-project",
      prefix: "projects/",
      collapsible: true,
      children: [
        "zero-to-hero-auto-warehouse",
        "project-learning-map",
        "three-blog-skills-for-retrospective-and-publish",
        "hello-202026",
      ],
    },
  ],
});
