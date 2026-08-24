/** @type {Record<string, import("../sidebar.config.mjs").FolderMeta>} */
export default {
  roadmap: {
    title: "学习总纲",
    icon: "map",
    order: 0,
  },
  metrics: {
    title: "度量与估算",
    icon: "ruler",
    order: 1,
  },
  access: {
    title: "接入层扩展",
    icon: "door-open",
    order: 2,
  },
  cache: {
    title: "缓存体系",
    icon: "bolt",
    order: 3,
  },
  async: {
    title: "异步与消息",
    icon: "envelope",
    order: 4,
  },
  sharding: {
    title: "分库分表",
    icon: "table-cells",
    order: 5,
  },
  protection: {
    title: "流量防护",
    icon: "shield-halved",
    order: 6,
  },
  ha: {
    title: "高可用",
    icon: "heart-pulse",
    order: 7,
  },
  scenarios: {
    title: "亿级场景实战",
    icon: "diagram-project",
    order: 8,
  },
  pressure: {
    title: "压测与容量",
    icon: "gauge-high",
    order: 9,
  },
  capstone: {
    title: "毕业设计",
    icon: "graduation-cap",
    order: 10,
  },
};
