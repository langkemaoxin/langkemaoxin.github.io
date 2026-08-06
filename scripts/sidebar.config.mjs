/** @typedef {{ path: string, dir: string }} SidebarModuleConfig */

/** 大模块列表（顶层目录） */
/** @type {SidebarModuleConfig[]} */
export const modules = [
  { path: "/Ai/", dir: "Ai" },
  { path: "/BigData/", dir: "BigData" },
  { path: "/DotNet/", dir: "DotNet" },
  { path: "/Java/", dir: "Java" },
  { path: "/Windows/", dir: "Windows" },
  { path: "/Tools/", dir: "Tools" },
  { path: "/English/", dir: "English" },
  { path: "/Notes/", dir: "Notes" },
];

/**
 * 可选：文件夹 icon 覆盖
 * key = `${模块目录}/${子文件夹}`，例如 "Ai/playwright"
 */
export const folderIcons = {
  "Ai/playwright": "robot",
  "Ai/rag": "book",
  "Ai/local-llm": "server",
  "Ai/agent": "lightbulb",
  "Ai/基础知识": "book",
  "BigData/hadoop-series": "database",
  "BigData/practice": "flask",
  "DotNet/aspnetcore": "code",
  "Java/source-debug": "code",
  "Windows/permissions": "shield-halved",
  "Windows/setup": "laptop-code",
  "Tools/encoding-publish": "file-code",
  "Tools/git-proxy": "network-wired",
  "Tools/misc": "screwdriver-wrench",
  "English/vocabulary": "language",
  "Notes/hami": "microchip",
  "Notes/concepts": "lightbulb",
  "Notes/projects": "diagram-project",
};

/**
 * 可选：侧栏显示名覆盖（默认用文件夹名，或文章里的 sidebarGroup）
 * key = `${模块目录}/${子文件夹}`
 */
export const folderTitles = {
  "Ai/playwright": "自动化 / Playwright",
  "Ai/rag": "RAG / LangChain",
  "Ai/local-llm": "本地模型",
  "Ai/agent": "Agent / 方法论",
  "BigData/hadoop-series": "Hadoop 系列",
  "BigData/practice": "实战与概念",
  "DotNet/aspnetcore": "ASP.NET Core",
  "Java/source-debug": "源码调试",
  "Windows/permissions": "权限",
  "Windows/setup": "环境搭建",
  "Tools/encoding-publish": "编码与发布",
  "Tools/git-proxy": "Git / 代理",
  "Tools/misc": "其他工具",
  "English/vocabulary": "论文生词",
  "Notes/hami": "HAMi",
  "Notes/concepts": "基础概念",
  "Notes/projects": "项目与工作流",
};

/** 未单独配置 icon 时的默认图标 */
export const defaultFolderIcon = "folder";
