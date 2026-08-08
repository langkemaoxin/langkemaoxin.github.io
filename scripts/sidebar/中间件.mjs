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
};
