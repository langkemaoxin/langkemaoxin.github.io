// 重建 k8s 系列的头部导航（上一篇/下一篇）与尾部预告——对齐用户重写版总纲（v2）的 35 篇顺序。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "..", "src", "云原生", "k8s");

const SEQ = [
  { slug: "k8s-01-cloud-native", title: "云原生原理与演进——从 CNCF 到 Service Mesh" },
  { slug: "k8s-02-macro-architecture", title: "穿透 K8S 八大宏观架构——Master、Worker 与数据流" },
  { slug: "k8s-03-minikube-runtime", title: "K8s 运行时实操——Minikube 安装、排障与 Helm" },
  { slug: "k8s-04-objects-kubectl", title: "Kubernetes 基本概念与 kubectl——对象模型与常用命令" },
  { slug: "k8s-05-pod-workload", title: "工作负载核心：Pod 生命周期、Pause、Init 与探针" },
  { slug: "k8s-06-deployment-rs", title: "Deployment 与副本控制——灰度更新、RC 与 ReplicaSet" },
  { slug: "k8s-07-daemon-stateful-job", title: "DaemonSet、StatefulSet、Job 与 CronJob" },
  { slug: "k8s-08-hpa-cri-crd", title: "HPA 自动伸缩与 CRI/CNI/CSI/CRD 扩展点" },
  { slug: "k8s-09-service-l4", title: "Service 四层流量分发——iptables、IPVS 与四类 Port" },
  { slug: "k8s-10-network-dns", title: "Underlay/Overlay 网络与集群 DNS 解析" },
  { slug: "k8s-11-pv-pvc", title: "应用持久化存储——Volume、PV 与 PVC" },
  { slug: "k8s-12-secret-configmap", title: "Secret、ConfigMap 与常见部署排障" },
  { slug: "k8s-13-ingress-l7", title: "Ingress 七层流量分发——原理、部署模式与动态域名" },
  { slug: "k8s-14-gateway-api", title: "Gateway API：七层入口的新标准与 Ingress 迁移", placeholder: true },
  { slug: "k8s-15-release-strategies", title: "发布策略实战——蓝绿、金丝雀、滚动与 A/B 测试" },
  { slug: "k8s-16-prometheus-hpa", title: "基于 QPS 的动态扩缩容——Prometheus Operator 与 Adapter" },
  { slug: "k8s-17-custom-metrics", title: "custom-metrics-server 规则配置与 Grafana 展示" },
  { slug: "k8s-18-logging-elk-efk", title: "集群日志收集——ELK 与 EFK" },
  { slug: "k8s-19-jvm-in-container", title: "容器内 JVM 参数解析与生产优化" },
  { slug: "k8s-20-deploy-kubeadm-ha", title: "生产集群部署——kubeadm 从零到高可用" },
  { slug: "k8s-21-deploy-methods", title: "部署方法横向对比——二进制、RKE/RKE2、k0s、sealos 与 kubespray" },
  { slug: "k8s-22-os-runtimes", title: "国产化 OS 与容器运行时——OpenEuler、麒麟、CRI-O 与 iSula" },
  { slug: "k8s-23-sandbox-runtimes", title: "安全容器运行时——Kata Containers 与 gVisor" },
  { slug: "k8s-24-storage-longhorn-glusterfs", title: "分布式存储方案——Longhorn 与 GlusterFS" },
  { slug: "k8s-25-harbor-springcloud", title: "Harbor + K8s 手动部署 SpringCloud——镜像构建与推送" },
  { slug: "k8s-26-jenkins-canary", title: "Jenkins + Ingress 自动化灰度发布流水线" },
  { slug: "k8s-27-advanced-rollout", title: "发布进阶——Argo Rollouts 金丝雀与 OpenKruise 原地升级" },
  { slug: "k8s-28-app-onboarding", title: "项目上云实战——Java/Python/Golang 与中间件部署" },
  { slug: "k8s-29-advanced-network", title: "网络进阶——Cilium、Hybridnet、双栈与 Traefik" },
  { slug: "k8s-30-service-mesh-istio", title: "Service Mesh 与 Istio——Sidecar 架构与 Bookinfo" },
  { slug: "k8s-31-keda-monitoring", title: "事件驱动伸缩与集群监控——KEDA 与监控 UI" },
  { slug: "k8s-32-etcd-listwatch", title: "etcd 与 List-Watch：控制面的心跳与自愈心脏", placeholder: true },
  { slug: "k8s-33-rbac-security", title: "RBAC 与安全加固：认证、鉴权、准入三道关", placeholder: true },
  { slug: "k8s-34-crd-operator", title: "CRD 与 Operator 开发：把运维经验写成控制器", placeholder: true },
  { slug: "k8s-35-dra-gpu-scheduling", title: "DRA 与 GPU 调度：AI 时代的资源分配", placeholder: true },
];

const link = (a) => `[《${a.title}》](/云原生/k8s/${a.slug})`;

for (let i = 0; i < SEQ.length; i++) {
  const cur = SEQ[i];
  const prev = SEQ[i - 1];
  const next = SEQ[i + 1];
  const p = path.join(dir, cur.slug + ".md");
  if (!fs.existsSync(p)) { console.log(`[skip-not-exist] ${cur.slug}`); continue; }
  let text = fs.readFileSync(p, "utf8");

  if (prev) text = text.replace(/上一篇：\[[^\]]*\]\([^)]*\)/, `上一篇：${link(prev)}`);
  if (next) {
    text = text.replace(/下一篇：\[[^\]]*\]\([^)]*\)/, `下一篇：${link(next)}`);
  } else {
    text = text.replace(/下一篇：\[[^\]]*\]\([^)]*\)/,
      `全系列完结——回看[《K8s 学习总纲》](/云原生/k8s/k8s-00-roadmap)做资深自检`);
  }

  // 尾部预告段：最后 15 行内含「下一篇」的非引用行，替换为标准预告
  const lines = text.split("\n");
  for (let j = Math.max(0, lines.length - 15); j < lines.length; j++) {
    if (/下一篇/.test(lines[j]) && !lines[j].startsWith(">")) {
      lines[j] = next
        ? `> ➡️ 下一篇：${link(next)}`
        : `> ➡️ 全系列完结——回看[《K8s 学习总纲》](/云原生/k8s/k8s-00-roadmap)做资深自检`;
      break;
    }
  }
  text = lines.join("\n");
  fs.writeFileSync(p, text, "utf8");
  console.log(`[nav] ${cur.slug}  prev=${prev ? prev.slug : "-"} next=${next ? next.slug : "END"}`);
}
console.log("done.");
