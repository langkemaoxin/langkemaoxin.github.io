/** @type {Record<string, import("../sidebar.config.mjs").FolderMeta>} */
export default {
  roadmap: {
    title: "学习路线",
    icon: "map",
    order: 0,
  },
  "tx-basics": {
    title: "事务地基",
    icon: "database",
    order: 1,
  },
  theory: {
    title: "理论与协议",
    icon: "scale-balanced",
    order: 2,
  },
  "seata-at": {
    title: "Seata AT",
    icon: "network-wired",
    order: 3,
  },
  "seata-tcc": {
    title: "Seata TCC",
    icon: "handshake",
    order: 4,
  },
  saga: {
    title: "Saga",
    icon: "diagram-project",
    order: 5,
  },
  message: {
    title: "消息一致性",
    icon: "envelope",
    order: 6,
  },
  consensus: {
    title: "共识算法",
    icon: "vote-yea",
    order: 7,
  },
  capstone: {
    title: "毕业实战",
    icon: "graduation-cap",
    order: 8,
  },
  seata: {
    title: "Seata（早期系列）",
    icon: "network-wired",
    order: 9,
  },
};
