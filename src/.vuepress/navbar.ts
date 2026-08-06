import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  {
    text: "文章",
    icon: "book",
    prefix: "/posts/",
    children: [
      { text: "Windows / 权限", link: "/posts/windows/" },
      { text: "Hadoop / 大数据", link: "/posts/hadoop/" },
      { text: ".NET / Java 后端", link: "/posts/dotnet/" },
      { text: "AI / 自动化", link: "/posts/ai-tools/" },
      { text: "开发工具", link: "/posts/devtools/" },
      { text: "其他笔记", link: "/posts/notes/" },
    ],
  },
  {
    text: "GitHub",
    icon: "fab fa-github",
    link: "https://github.com/code-corey/code-corey.github.io",
  },
]);
