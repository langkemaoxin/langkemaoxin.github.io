/** @type {Record<string, import("../sidebar.config.mjs").FolderMeta>} */
export default {
  docker: {
    title: "Docker",
    icon: "cube",
    order: 1,
  },
  k8s: {
    title: "Kubernetes",
    icon: "dharmachakra",
    order: 2,
  },
  serverless: {
    title: "Serverless",
    icon: "cloud",
    order: 3,
  },
};
