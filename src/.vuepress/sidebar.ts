import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    {
      text: "知识库文章",
      icon: "book",
      prefix: "posts/",
      children: [
        {
          text: "Windows / 权限",
          icon: "laptop-code",
          prefix: "windows/",
          children: "structure",
          collapsible: true,
        },
        {
          text: "Hadoop / 大数据",
          icon: "database",
          prefix: "hadoop/",
          children: "structure",
          collapsible: true,
        },
        {
          text: ".NET / Java 后端",
          icon: "code",
          prefix: "dotnet/",
          children: "structure",
          collapsible: true,
        },
        {
          text: "AI / 自动化",
          icon: "robot",
          prefix: "ai-tools/",
          children: "structure",
          collapsible: true,
        },
        {
          text: "开发工具",
          icon: "screwdriver-wrench",
          prefix: "devtools/",
          children: "structure",
          collapsible: true,
        },
        {
          text: "其他笔记",
          icon: "note-sticky",
          prefix: "notes/",
          children: "structure",
          collapsible: true,
        },
      ],
    },
  ],
});
