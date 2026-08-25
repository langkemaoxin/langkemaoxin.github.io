/** @type {Record<string, import("../sidebar.config.mjs").FolderMeta>} */
export default {
  roadmap: {
    title: "学习路线",
    icon: "map",
    order: 0,
  },
  "00-foundations": {
    title: "地基与密码学",
    icon: "key",
    order: 1,
  },
  "01-bitcoin": {
    title: "比特币",
    icon: "coins",
    order: 2,
  },
  "02-evm": {
    title: "以太坊核心",
    icon: "microchip",
    order: 3,
  },
  "03-solidity": {
    title: "Solidity 与 Foundry",
    icon: "code",
    order: 4,
  },
  "04-tokens": {
    title: "代币标准",
    icon: "gem",
    order: 5,
  },
  "05-dapp": {
    title: "DApp 全栈",
    icon: "laptop-code",
    order: 6,
  },
  "06-security": {
    title: "安全攻防",
    icon: "shield-halved",
    order: 7,
  },
  "07-defi": {
    title: "DeFi 协议",
    icon: "chart-line",
    order: 8,
  },
  "08-l2": {
    title: "共识与扩容",
    icon: "layer-group",
    order: 9,
  },
  "09-capstone": {
    title: "生态与毕业",
    icon: "graduation-cap",
    order: 10,
  },
};
