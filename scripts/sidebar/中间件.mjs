/** @type {Record<string, import("../sidebar.config.mjs").FolderMeta>} */
export default {
  rabbitmq: {
    title: "RabbitMQ",
    icon: "envelope",
    order: 1,
  },
  kafka: {
    title: "Kafka",
    icon: "diagram-project",
    order: 2,
  },
  rocketmq: {
    title: "RocketMQ",
    icon: "rocket",
    order: 3,
  },
  faq: {
    title: "MQ 常见问题",
    icon: "circle-question",
    order: 4,
  },
  redis: {
    title: "Redis",
    icon: "database",
    order: 5,
  },
  zookeeper: {
    title: "ZooKeeper",
    icon: "sitemap",
    order: 6,
  },
  shardingsphere: {
    title: "ShardingSphere",
    icon: "table",
    order: 7,
  },
  elasticsearch: {
    title: "Elasticsearch",
    icon: "magnifying-glass",
    order: 8,
  },
  netty: {
    title: "Netty",
    icon: "network-wired",
    order: 9,
  },
};
