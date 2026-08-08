import { sidebar } from "vuepress-theme-hope";

// 由 scripts/gen-sidebar.mjs 自动生成，请勿手改。
// 新增分类：直接建子文件夹；权限书稿可在分类下再建卷目录（二级侧栏）。
// 新增文章：放入对应文件夹并写 shortTitle / order / sidebarGroup
// icon / 显示名 / 分类顺序可在 scripts/sidebar/<模块>.mjs 里覆盖
// 然后运行：pnpm sidebar:gen
export default sidebar({
  "/Ai/": [
    "",
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
      text: "Agent / 方法论",
      icon: "lightbulb",
      prefix: "agent/",
      collapsible: true,
      children: [
        "how-to-build-tech-info-radar",
        "harness-engineering",
        "2026年AI-Agent框架选型指南：从“大爆发”到“大灭绝”后的生存法则",
      ],
    },
    {
      text: "基础知识",
      icon: "book",
      prefix: "基础知识/",
      collapsible: true,
      children: [
        "harness-engineering",
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
        "00-index",
        {
          text: "卷一·发明权限",
          icon: "book",
          prefix: "vol1-invent/",
          collapsible: true,
          children: [
            "01-no-permission",
            "02-account",
            "03-sid",
            "04-name-sid-lsa",
            "05-logon-lsa",
            "06-access-token",
            "07-owner",
            "08-permission-bits",
            "09-groups",
            "10-ace-dacl",
            "11-access-check",
            "12-security-descriptor",
            "13-inheritance",
            "14-effective-permissions",
            "15-sacl",
          ],
        },
        {
          text: "卷二·网上的身份",
          icon: "book",
          prefix: "vol2-identity/",
          collapsible: true,
          children: [
            "01-domain-dc",
            "02-kerberos",
            "03-ntlm",
            "04-logon-types",
            "05-spn",
          ],
        },
        {
          text: "卷三·权利与 UAC",
          icon: "book",
          prefix: "vol3-rights-uac/",
          collapsible: true,
          children: [
            "01-rights-uac",
            "02-user-rights",
            "03-uac",
            "04-gpo-rights",
            "05-adminsdholder",
          ],
        },
        {
          text: "卷四·不只是文件",
          icon: "book",
          prefix: "vol4-beyond-files/",
          collapsible: true,
          children: [
            "01-registry",
            "02-services",
            "03-ad-delegation",
          ],
        },
        {
          text: "卷五·排障与设计",
          icon: "book",
          prefix: "vol5-ops/",
          collapsible: true,
          children: [
            "01-share-design",
            "02-effective-access-practice",
            "03-troubleshooting-cases",
          ],
        },
        {
          text: "卷六·用代码改权限",
          icon: "book",
          prefix: "vol6-dotnet/",
          collapsible: true,
          children: [
            "01-identity",
            "02-acl",
            "03-impersonation",
          ],
        },
        {
          text: "附录",
          icon: "book",
          prefix: "appendix/",
          collapsible: true,
          children: [
            "01-map",
            "02-sddl",
            "03-event-ids",
            "04-lab",
            "05-references",
          ],
        },
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
    {
      text: "思考",
      icon: "folder",
      prefix: "think/",
      collapsible: true,
      children: [
        "技术专家10问自查清单",
      ],
    },
  ],
  "/云原生/": [
    "",
    {
      text: "Docker",
      icon: "cube",
      prefix: "docker/",
      collapsible: true,
      children: [
        "docker-01-what-is-docker",
        "docker-02-engine-platform",
        "docker-03-container-vs-vm",
        "docker-04-install",
        "docker-05-container-and-image",
        "docker-06-container-commands",
        "docker-07-enter-container",
        "docker-08-image-transfer",
        "docker-09-harbor",
        "docker-10-dockerfile",
        "docker-11-process-view",
        "docker-12-daemon-runtime",
        "docker-13-tech-foundation",
        "docker-14-unionfs",
        "docker-15-namespace",
        "docker-16-cgroups",
        "docker-17-network",
        "docker-18-compose",
      ],
    },
    {
      text: "Kubernetes",
      icon: "dharmachakra",
      prefix: "k8s/",
      collapsible: true,
      children: [
        "k8s-00-coming-soon",
      ],
    },
    {
      text: "Serverless",
      icon: "cloud",
      prefix: "serverless/",
      collapsible: true,
      children: [
        "serverless-00-coming-soon",
      ],
    },
  ],
});
