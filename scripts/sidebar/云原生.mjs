/** @type {Record<string, import("../sidebar.config.mjs").FolderMeta>} */
export default {
  foundation: {
    title: "云原生基础",
    icon: "seedling",
    order: 1,
  },
  docker: {
    title: "Docker",
    icon: "cube",
    order: 2,
  },
  k8s: {
    title: "Kubernetes",
    icon: "dharmachakra",
    order: 3,
  },
  "k8s-ops": {
    title: "K8s 运维笔记",
    icon: "screwdriver-wrench",
    order: 4,
  },
  devops: {
    title: "DevOps / GitOps",
    icon: "gears",
    order: 5,
  },
  serverless: {
    title: "Serverless",
    icon: "cloud",
    order: 6,
  },
  observability: {
    title: "可观测性",
    icon: "eye",
    order: 7,
  },
  platform: {
    title: "平台与实战",
    icon: "layer-group",
    order: 8,
  },
  extend: {
    title: "扩展专题",
    icon: "puzzle-piece",
    order: 9,
  },
  golang: {
    title: "Golang",
    icon: "golang",
    order: 10,
  },
};
