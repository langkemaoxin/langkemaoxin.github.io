/** @type {Record<string, import("../sidebar.config.mjs").FolderMeta>} */
export default {
  springboot: {
    title: "Spring Boot",
    icon: "leaf",
    order: 1,
  },
  springcloud: {
    title: "Spring Cloud Alibaba",
    icon: "cloud",
    order: 2,
  },
  nacos: {
    title: "Nacos",
    icon: "sitemap",
    order: 3,
  },
  sentinel: {
    title: "Sentinel",
    icon: "shield-halved",
    order: 4,
  },
  seata: {
    title: "Seata 内核",
    icon: "database",
    order: 5,
  },
  "spring-ext": {
    title: "Spring 扩展",
    icon: "puzzle-piece",
    order: 6,
  },
  roadmap: {
    title: "路线与占位",
    icon: "map",
    order: 7,
  },
};
