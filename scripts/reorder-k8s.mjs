// 一次性重排脚本：把 src/云原生/k8s 的 30 篇旧文按 k8s-00-roadmap 的九阶段学习线重新编号，
// 并把 sidebarGroup 切成阶段分组。幂等：重跑时已就位的文件会被跳过。
// 2026-08-24 配合《K8s 学习总纲》重组使用；占位篇（13/22/23/24/27/36/37）不在此建，另行手写。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "..", "src", "云原生", "k8s");

// 阶段分组名（与 k8s-00-roadmap 阶段命名一致）
const G1 = "阶段 1 · 上手";
const G2 = "阶段 2 · 工作负载";
const G3 = "阶段 3 · 流量";
const G4 = "阶段 4 · 存储";
const G5 = "阶段 5 · 调度与弹性";
const G6 = "阶段 6 · 控制面内幕";
const G7 = "阶段 7 · 生产化";
const G8 = "阶段 8 · 深水区与毕业";

// 旧 slug（不含 .md）→ { to: 新 slug, order, title: 新 shortTitle, group }
// 「to」与旧 slug 相同表示文件名不变，仅改 frontmatter。
const MAP = {
  "k8s-01-cloud-native":            { to: "k8s-01-cloud-native",                order: 1,  title: "01 云原生演进",    group: G1 },
  "k8s-02-macro-architecture":      { to: "k8s-02-macro-architecture",          order: 2,  title: "02 宏观架构",      group: G1 },
  "k8s-03-minikube-runtime":        { to: "k8s-03-minikube-runtime",            order: 3,  title: "03 Minikube 实操", group: G1 },
  "k8s-04-objects-kubectl":         { to: "k8s-04-objects-kubectl",             order: 4,  title: "04 对象与 kubectl", group: G1 },
  "k8s-05-pod-workload":            { to: "k8s-05-pod-workload",                order: 5,  title: "05 Pod 工作负载",  group: G2 },
  "k8s-06-deployment-rs":           { to: "k8s-06-deployment-rs",               order: 6,  title: "06 Deployment/RS", group: G2 },
  "k8s-07-daemon-stateful-job":     { to: "k8s-07-daemon-stateful-job",         order: 7,  title: "07 守护集与有状态", group: G2 },
  "k8s-16-secret-configmap":        { to: "k8s-08-secret-configmap",            order: 8,  title: "08 Secret/ConfigMap", group: G2 },
  "k8s-15-harbor-springcloud":      { to: "k8s-09-harbor-springcloud",          order: 9,  title: "09 Harbor 部署实战", group: G2 },
  "k8s-09-service-l4":              { to: "k8s-10-service-l4",                  order: 10, title: "10 Service 四层",  group: G3 },
  "k8s-10-network-dns":             { to: "k8s-11-network-dns",                 order: 11, title: "11 网络与 DNS",    group: G3 },
  "k8s-12-ingress-l7":              { to: "k8s-12-ingress-l7",                  order: 12, title: "12 Ingress 七层",  group: G3 },
  // 13 = Gateway API 占位（手写）
  "k8s-28-advanced-network":        { to: "k8s-14-advanced-network",            order: 14, title: "14 网络进阶",      group: G3 },
  "k8s-11-pv-pvc":                  { to: "k8s-15-pv-pvc",                      order: 15, title: "15 PV 与 PVC",    group: G4 },
  "k8s-27-storage-longhorn-glusterfs": { to: "k8s-16-storage-longhorn-glusterfs", order: 16, title: "16 存储进阶",    group: G4 },
  "k8s-08-hpa-cri-crd":             { to: "k8s-17-hpa-cri-crd",                 order: 17, title: "17 HPA 与扩展点", group: G5 },
  "k8s-18-prometheus-hpa":          { to: "k8s-18-prometheus-hpa",              order: 18, title: "18 Prometheus HPA", group: G5 },
  "k8s-19-custom-metrics":          { to: "k8s-19-custom-metrics",              order: 19, title: "19 自定义指标",   group: G5 },
  "k8s-30-keda-monitoring":         { to: "k8s-20-keda-monitoring",             order: 20, title: "20 KEDA 与监控",  group: G5 },
  "k8s-20-jvm-in-container":        { to: "k8s-21-jvm-in-container",            order: 21, title: "21 容器内 JVM",   group: G5 },
  // 22 = etcd/List-Watch 占位、23 = RBAC 安全占位、24 = CRD/Operator 占位（手写）
  "k8s-21-deploy-kubeadm-ha":       { to: "k8s-25-deploy-kubeadm-ha",           order: 25, title: "25 kubeadm 高可用", group: G7 },
  "k8s-22-deploy-methods":          { to: "k8s-26-deploy-methods",              order: 26, title: "26 部署方法对比", group: G7 },
  // 27 = 升级与备份占位（手写）
  "k8s-23-os-runtimes":             { to: "k8s-28-os-runtimes",                 order: 28, title: "28 国产 OS 与运行时", group: G7 },
  "k8s-24-logging-elk-efk":         { to: "k8s-29-logging-elk-efk",             order: 29, title: "29 日志收集 ELK/EFK", group: G7 },
  "k8s-25-sandbox-runtimes":        { to: "k8s-30-sandbox-runtimes",            order: 30, title: "30 沙箱运行时",   group: G7 },
  "k8s-13-release-strategies":      { to: "k8s-31-release-strategies",          order: 31, title: "31 发布策略",      group: G7 },
  "k8s-17-jenkins-canary":          { to: "k8s-32-jenkins-canary",              order: 32, title: "32 Jenkins 灰度",  group: G7 },
  "k8s-26-advanced-rollout":        { to: "k8s-33-advanced-rollout",            order: 33, title: "33 发布进阶",      group: G7 },
  "k8s-14-service-mesh-istio":      { to: "k8s-34-service-mesh-istio",          order: 34, title: "34 Service Mesh",  group: G8 },
  "k8s-29-app-onboarding":          { to: "k8s-35-app-onboarding",              order: 35, title: "35 项目上云实战",  group: G8 },
  // 36 = DRA/GPU 调度占位、37 = 毕业设计占位（手写）
};

// ---- 1) 两阶段重命名，规避编号互换冲突 ----
const renames = Object.entries(MAP).filter(([oldId, v]) => oldId !== v.to);
for (const [oldId] of renames) {
  if (fs.existsSync(path.join(dir, oldId + ".md"))) {
    fs.renameSync(path.join(dir, oldId + ".md"), path.join(dir, "tmp-" + oldId + ".md"));
  }
}
for (const [oldId, v] of renames) {
  const tmp = path.join(dir, "tmp-" + oldId + ".md");
  if (fs.existsSync(tmp)) fs.renameSync(tmp, path.join(dir, v.to + ".md"));
}

// ---- 2) 全目录内容替换（含 README / roadmap，slug 全局映射一次性替换，无连锁风险）----
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
const slugRe = /k8s-\d{2}-[a-z0-9-]+/g;
for (const f of files) {
  if (f.startsWith("tmp-")) continue;
  const p = path.join(dir, f);
  let text = fs.readFileSync(p, "utf8");
  const before = text;

  // slug 全局替换（URL、相对链接、文内引用一并覆盖）
  text = text.replace(slugRe, (s) => (MAP[s] ? MAP[s].to : s));

  // frontmatter / 序号行（仅当本文件在映射表中）
  const hit = MAP[f.replace(/\.md$/, "")] ?? MAP[Object.keys(MAP).find((k) => MAP[k].to === f.replace(/\.md$/, ""))];
  if (hit) {
    text = text.replace(/^order:.*$/m, `order: ${hit.order}`);
    text = text.replace(/^shortTitle:.*$/m, `shortTitle: ${hit.title}`);
    text = text.replace(/^sidebarGroup:.*$/m, `sidebarGroup: "${hit.group}"`);
    // 头部序号行：第 X/30 篇 → 第 N/37 篇（兼容「（完结）」标记，完结标记只属于新 37）
    text = text.replace(/第 \d+\/30 篇（完结）?/u, `第 ${hit.order}/37 篇`);
  }

  if (text !== before) {
    fs.writeFileSync(p, text, "utf8");
    console.log(`[rewrite] ${f}${hit ? ` -> order ${hit.order}, "${hit.group}"` : ""}`);
  }
}
console.log(`[done] renamed ${renames.length} files, rewrote links across ${files.length} files.`);
