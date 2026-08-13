import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://www.code-corey.com",

  author: {
    name: "Corey",
    url: "https://www.code-corey.com",
  },

  logo: "https://theme-hope-assets.vuejs.press/logo.svg",

  repo: "code-corey/code-corey.github.io",

  docsDir: "src",
  docsBranch: "master",

  navbar,
  sidebar,

  footer: "Corey 知识库",
  displayFooter: true,

  metaLocales: {
    editLink: "在 GitHub 上编辑此页",
  },

  markdown: {
    align: true,
    attrs: false,
    codeTabs: true,
    figure: false,
    gfm: true,
    imgLazyload: true,
    imgSize: true,
    mark: true,
    mermaid: true,
    spoiler: true,
    sub: true,
    sup: true,
    tabs: true,
    tasklist: true,
    vPre: true,
  },

  plugins: {
    blog: true,
    catalog: true,

    components: {
      components: ["Badge", "VPCard"],
    },

    icon: {
      prefix: "fa6-solid:",
    },
  },
});
