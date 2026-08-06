import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "Corey 知识库",
  description: "Corey 的个人知识库：Windows 权限、Hadoop、.NET、AI 工具笔记",

  theme,
});
