/** @type {Record<string, import("../sidebar.config.mjs").FolderMeta>} */
export default {
  permissions: {
    title: "权限",
    icon: "shield-halved",
    order: 1,
  },
  "permissions/vol1-invent": {
    title: "卷一·发明权限",
    icon: "book",
    order: 1,
  },
  "permissions/vol2-identity": {
    title: "卷二·网上的身份",
    icon: "network-wired",
    order: 2,
  },
  "permissions/vol3-rights-uac": {
    title: "卷三·权利与 UAC",
    icon: "user-shield",
    order: 3,
  },
  "permissions/vol4-beyond-files": {
    title: "卷四·不只是文件",
    icon: "folder-tree",
    order: 4,
  },
  "permissions/vol5-ops": {
    title: "卷五·排障与设计",
    icon: "screwdriver-wrench",
    order: 5,
  },
  "permissions/vol6-dotnet": {
    title: "卷六·用代码改权限",
    icon: "code",
    order: 6,
  },
  "permissions/appendix": {
    title: "附录",
    icon: "bookmark",
    order: 7,
  },
  setup: {
    title: "环境搭建",
    icon: "laptop-code",
    order: 2,
  },
};
