/** @type {Record<string, import("../sidebar.config.mjs").FolderMeta>} */
export default {
  basics: {
    title: "并发基础",
    icon: "book",
    order: 1,
  },
  async: {
    title: "异步编程",
    icon: "clock",
    order: 2,
  },
  lock: {
    title: "锁与同步",
    icon: "lock",
    order: 3,
  },
  collections: {
    title: "并发容器",
    icon: "boxes-stacked",
    order: 4,
  },
  pool: {
    title: "线程池",
    icon: "gears",
    order: 5,
  },
  performance: {
    title: "性能扩展",
    icon: "gauge-high",
    order: 6,
  },
};
