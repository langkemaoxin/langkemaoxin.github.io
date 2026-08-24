// 二次对齐：把 v1 布局（37 篇）调整为用户重写版总纲（k8s-00-roadmap v2）的九阶段 35 篇结构。
// v2 阶段：0 起步 / 1 会用 / 2 联网 / 3 状态 / 4 入口 / 5 会修 / 6 会建 / 7 交付 / 8 会扩
// 同时删除 v1 多加的两篇占位（upgrade-backup / graduation-project）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "..", "src", "云原生", "k8s");

const G0 = "阶段 0 · 起步";
const G1 = "阶段 1 · 会用";
const G2 = "阶段 2 · 联网";
const G3 = "阶段 3 · 状态";
const G4 = "阶段 4 · 入口";
const G5 = "阶段 5 · 会修";
const G6 = "阶段 6 · 会建";
const G7 = "阶段 7 · 交付";
const G8 = "阶段 8 · 会扩";

// v1 slug → { to: v2 slug, order, title: shortTitle, group }
const MAP = {
  "k8s-01-cloud-native":               { to: "k8s-01-cloud-native",               order: 1,  title: "01 云原生演进",     group: G0 },
  "k8s-02-macro-architecture":         { to: "k8s-02-macro-architecture",         order: 2,  title: "02 宏观架构",       group: G0 },
  "k8s-03-minikube-runtime":           { to: "k8s-03-minikube-runtime",           order: 3,  title: "03 Minikube 实操",  group: G0 },
  "k8s-04-objects-kubectl":            { to: "k8s-04-objects-kubectl",            order: 4,  title: "04 对象与 kubectl",  group: G1 },
  "k8s-05-pod-workload":               { to: "k8s-05-pod-workload",               order: 5,  title: "05 Pod 工作负载",   group: G1 },
  "k8s-06-deployment-rs":              { to: "k8s-06-deployment-rs",              order: 6,  title: "06 Deployment/RS",  group: G1 },
  "k8s-07-daemon-stateful-job":        { to: "k8s-07-daemon-stateful-job",        order: 7,  title: "07 守护集与有状态", group: G1 },
  "k8s-17-hpa-cri-crd":                { to: "k8s-08-hpa-cri-crd",                order: 8,  title: "08 HPA 与扩展点",   group: G1 },
  "k8s-10-service-l4":                 { to: "k8s-09-service-l4",                 order: 9,  title: "09 Service 四层",   group: G2 },
  "k8s-11-network-dns":                { to: "k8s-10-network-dns",                order: 10, title: "10 网络与 DNS",     group: G2 },
  "k8s-15-pv-pvc":                     { to: "k8s-11-pv-pvc",                     order: 11, title: "11 PV 与 PVC",     group: G3 },
  "k8s-08-secret-configmap":           { to: "k8s-12-secret-configmap",           order: 12, title: "12 Secret/ConfigMap", group: G3 },
  "k8s-12-ingress-l7":                 { to: "k8s-13-ingress-l7",                 order: 13, title: "13 Ingress 七层",  group: G4 },
  "k8s-13-gateway-api":                { to: "k8s-14-gateway-api",                order: 14, title: "14 Gateway API",   group: G4 },
  "k8s-31-release-strategies":         { to: "k8s-15-release-strategies",         order: 15, title: "15 发布策略",      group: G4 },
  "k8s-18-prometheus-hpa":             { to: "k8s-16-prometheus-hpa",             order: 16, title: "16 QPS 动态扩缩",  group: G5 },
  "k8s-19-custom-metrics":             { to: "k8s-17-custom-metrics",             order: 17, title: "17 自定义指标",    group: G5 },
  "k8s-29-logging-elk-efk":            { to: "k8s-18-logging-elk-efk",            order: 18, title: "18 日志收集 ELK/EFK", group: G5 },
  "k8s-21-jvm-in-container":           { to: "k8s-19-jvm-in-container",           order: 19, title: "19 容器内 JVM",    group: G5 },
  "k8s-25-deploy-kubeadm-ha":          { to: "k8s-20-deploy-kubeadm-ha",          order: 20, title: "20 kubeadm 高可用", group: G6 },
  "k8s-26-deploy-methods":             { to: "k8s-21-deploy-methods",             order: 21, title: "21 部署方法对比",  group: G6 },
  "k8s-28-os-runtimes":                { to: "k8s-22-os-runtimes",                order: 22, title: "22 国产 OS 与运行时", group: G6 },
  "k8s-30-sandbox-runtimes":           { to: "k8s-23-sandbox-runtimes",           order: 23, title: "23 沙箱运行时",    group: G6 },
  "k8s-16-storage-longhorn-glusterfs": { to: "k8s-24-storage-longhorn-glusterfs", order: 24, title: "24 存储进阶",      group: G7 },
  "k8s-09-harbor-springcloud":         { to: "k8s-25-harbor-springcloud",         order: 25, title: "25 Harbor 部署实战", group: G7 },
  "k8s-32-jenkins-canary":             { to: "k8s-26-jenkins-canary",             order: 26, title: "26 Jenkins 灰度",   group: G7 },
  "k8s-33-advanced-rollout":           { to: "k8s-27-advanced-rollout",           order: 27, title: "27 发布进阶",      group: G7 },
  "k8s-35-app-onboarding":             { to: "k8s-28-app-onboarding",             order: 28, title: "28 项目上云实战",   group: G7 },
  "k8s-14-advanced-network":           { to: "k8s-29-advanced-network",           order: 29, title: "29 网络进阶 Cilium", group: G8 },
  "k8s-34-service-mesh-istio":         { to: "k8s-30-service-mesh-istio",         order: 30, title: "30 Service Mesh",  group: G8 },
  "k8s-20-keda-monitoring":            { to: "k8s-31-keda-monitoring",            order: 31, title: "31 KEDA 伸缩",     group: G8 },
  "k8s-22-etcd-listwatch":             { to: "k8s-32-etcd-listwatch",             order: 32, title: "32 etcd 内幕",     group: G8 },
  "k8s-23-rbac-security":              { to: "k8s-33-rbac-security",              order: 33, title: "33 RBAC 安全",     group: G8 },
  "k8s-24-crd-operator":               { to: "k8s-34-crd-operator",               order: 34, title: "34 CRD 与 Operator", group: G8 },
  "k8s-36-dra-gpu-scheduling":         { to: "k8s-35-dra-gpu-scheduling",         order: 35, title: "35 DRA 与 GPU",    group: G8 },
};

// 删除 v1 多加、v2 大纲没有的两篇占位
for (const extra of ["k8s-27-upgrade-backup.md", "k8s-37-graduation-project.md"]) {
  const p = path.join(dir, extra);
  if (fs.existsSync(p)) { fs.rmSync(p); console.log(`[removed] ${extra}`); }
}

// 两阶段重命名（规避编号互换冲突）
const renames = Object.entries(MAP).filter(([oldId, v]) => oldId !== v.to);
for (const [oldId] of renames) {
  const p = path.join(dir, oldId + ".md");
  if (fs.existsSync(p)) fs.renameSync(p, path.join(dir, "tmp2-" + oldId + ".md"));
}
for (const [oldId, v] of renames) {
  const tmp = path.join(dir, "tmp2-" + oldId + ".md");
  if (fs.existsSync(tmp)) fs.renameSync(tmp, path.join(dir, v.to + ".md"));
}

// 全目录内容替换
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("tmp2-"));
const slugRe = /k8s-\d{2}-[a-z0-9-]+/g;
const toMap = {}; for (const [k, v] of Object.entries(MAP)) toMap[v.to] = v;
for (const f of files) {
  const p = path.join(dir, f);
  let text = fs.readFileSync(p, "utf8");
  const before = text;
  text = text.replace(slugRe, (s) => (MAP[s] ? MAP[s].to : s));
  const hit = toMap[f.replace(/\.md$/, "")];
  if (hit) {
    text = text.replace(/^order:.*$/m, `order: ${hit.order}`);
    text = text.replace(/^shortTitle:.*$/m, `shortTitle: ${hit.title}`);
    text = text.replace(/^sidebarGroup:.*$/m, `sidebarGroup: "${hit.group}"`);
    text = text.replace(/第 \d+\/37 篇（完结）?/u, `第 ${hit.order}/35 篇`);
  }
  if (text !== before) { fs.writeFileSync(p, text, "utf8"); console.log(`[rewrite] ${f}`); }
}
console.log(`[done] renamed ${renames.length}, total files ${files.length}`);
