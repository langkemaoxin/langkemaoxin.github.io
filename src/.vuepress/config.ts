import { umamiAnalyticsPlugin } from "@vuepress/plugin-umami-analytics";
import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "Corey 知识库",
  description: "Corey 的个人知识库：Windows 权限、Hadoop、.NET、AI 工具笔记",

  theme,

  plugins: [
    umamiAnalyticsPlugin({
      id: "561a9c25-2c91-44ee-a584-088d1935ca03",
      link: "https://cloud.umami.is/script.js",
      // 只统计正式域名，避免 localhost 污染数据
      domains: ["www.code-corey.com", "code-corey.com"],
    }),
  ],
});
