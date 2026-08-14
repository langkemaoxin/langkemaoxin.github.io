const fs = require("fs");
const path = require("path");
const yaml = require("E:/MyGithub/langkemaoxin.github.io/node_modules/.pnpm/js-yaml@3.15.1/node_modules/js-yaml");

const src = "E:/MyGithub/langkemaoxin.github.io/src/云原生";
const pub = "E:/MyGithub/langkemaoxin.github.io/src/.vuepress/public/云原生";

function readFm(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  let data = {};
  try { data = yaml.safeLoad(m[1]) || {}; } catch {}
  return { data, body: text.slice(m[0].length).replace(/^\r?\n/, "") };
}

function writeDoc(filePath, data, body) {
  const fm = yaml.safeDump(data, { lineWidth: 120, noRefs: true }).trimEnd();
  fs.writeFileSync(filePath, `---\n${fm}\n---\n\n${body.replace(/^\uFEFF/, "")}`, "utf8");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function moveDirContents(from, to) {
  if (!fs.existsSync(from)) return;
  ensureDir(to);
  for (const name of fs.readdirSync(from)) {
    const s = path.join(from, name);
    const d = path.join(to, name);
    if (fs.existsSync(d)) rmrf(d);
    fs.renameSync(s, d);
  }
}

function listMd(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".md") && f !== "README.md").map(f => path.join(dir, f)).sort();
}

function chapterOf(name) {
  // prometheus-04-10-1-xxx -> 10 ; prometheus-01-1-1xxx -> 1
  const m = name.match(/^prometheus-\d+-(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function stripNavNoise(body) {
  return body
    .replace(/^>\s*\*\*[^*]+\*\*[\s\S]*?^---\s*$/m, "")
    .replace(/^\s*>\s*.*$/gm, (line) => (line.includes("课程笔记") || line.includes("第 ") || line.includes("插图")) ? "" : line)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ========== 1) Merge Prometheus by chapter ==========
const promDir = path.join(src, "prometheus");
const promFiles = listMd(promDir);
const byCh = new Map();
for (const f of promFiles) {
  const base = path.basename(f);
  const ch = chapterOf(base);
  if (!byCh.has(ch)) byCh.set(ch, []);
  byCh.get(ch).push(f);
}

const chapterTitles = {
  0: "其他",
  1: "开篇与学习路径",
  2: "学习目标",
  3: "安装与上手",
  4: "基本概念",
  5: "node_exporter",
  6: "PromQL 基础",
  7: "服务发现与 Relabel",
  8: "mysqld_exporter",
  9: "process-exporter",
  10: "redis-exporter",
  11: "Kafka/ZK JVM 监控",
  12: "Pushgateway",
  13: "Alertmanager",
  14: "K8s 监控复杂度",
  15: "K8s 监控组件部署",
  16: "容器与 cAdvisor",
  17: "kube-state-metrics",
  18: "APIServer 监控",
  19: "自定义指标",
  20: "监控体系综述",
  21: "etcd TLS",
  22: "K8s 服务发现",
  23: "Relabel 实战",
  24: "Target 与高基数",
  25: "高基数与采集端",
  26: "客户端指标类型",
  27: "动态分片",
  28: "分片项目实战",
  29: "日志转指标",
  30: "存储与 WAL",
  31: "压缩算法",
  32: "TSDB 索引与 Compact",
  33: "联邦与 Remote",
  34: "M3DB",
  35: "Thanos",
  36: "kube-prometheus",
  37: "HTTP API",
  38: "Range Query",
  39: "资源利用率报表",
  40: "配置与 confd",
  41: "告警源码",
  42: "告警高可用",
  43: "Alertmanager 流水线",
  44: "综合实战",
};

let mergedProm = 0;
const orderedCh = [...byCh.keys()].sort((a,b)=>a-b);
for (const ch of orderedCh) {
  const files = byCh.get(ch).sort();
  if (files.length === 0) continue;
  // if only 1 file and chapter title short, still rename into stable ch slug
  const parts = [];
  let order = ch === 0 ? 99 : ch;
  for (const f of files) {
    const raw = fs.readFileSync(f, "utf8");
    const { data, body } = readFm(raw);
    const title = data.title || path.basename(f, ".md");
    const cleaned = stripNavNoise(body);
    // rewrite image paths from old stem to new stem later
    const oldStem = path.basename(f, ".md");
    parts.push({ title, body: cleaned, oldStem });
  }

  const chTitle = chapterTitles[ch] || `第${ch}章`;
  const newStem = `prometheus-${String(order).padStart(2,"0")}-ch${ch}-${chTitle.replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g,"-")}`;
  const newFile = path.join(promDir, newStem + ".md");
  const newWebBase = `/云原生/prometheus/${newStem}`;

  let bodyOut = `> **Prometheus · 第 ${order} 章（合并）**\n>\n> 由原课程小节笔记合并，便于连续阅读。\n\n---\n\n`;
  for (const p of parts) {
    let section = p.body;
    // remap images
    section = section.replace(new RegExp(`/云原生/prometheus/${p.oldStem.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}/`, "g"), `${newWebBase}/`);
    bodyOut += `## ${p.title}\n\n${section}\n\n`;
  }

  const data = {
    title: `Prometheus 第${ch}章：${chTitle}`,
    sidebarGroup: "Prometheus",
    shortTitle: `${String(order).padStart(2,"0")} ${chTitle}`,
    order,
    date: "2026-08-13",
    category: "云原生",
    tag: ["Prometheus", "云原生", "课程笔记"],
    description: `Prometheus 第${ch}章（${chTitle}）合并笔记`,
  };
  writeDoc(newFile, data, bodyOut);

  // merge images
  const newImgDir = path.join(pub, "prometheus", newStem);
  ensureDir(newImgDir);
  for (const p of parts) {
    const oldImg = path.join(pub, "prometheus", p.oldStem);
    if (fs.existsSync(oldImg)) {
      for (const name of fs.readdirSync(oldImg)) {
        const from = path.join(oldImg, name);
        const to = path.join(newImgDir, name);
        if (fs.statSync(from).isFile()) {
          if (!fs.existsSync(to)) fs.copyFileSync(from, to);
        }
      }
      rmrf(oldImg);
    }
  }

  // delete old md (skip if somehow same as new)
  for (const f of files) {
    if (path.resolve(f) !== path.resolve(newFile)) fs.unlinkSync(f);
  }
  mergedProm++;
}
console.log("prometheus chapters merged:", mergedProm);

// ========== 2) Merge Golang ==========
const goDir = path.join(src, "golang");
const goFiles = listMd(goDir);
const overview = goFiles.find(f => /golang-01/.test(path.basename(f)));
const parts = goFiles.filter(f => /part\d+/.test(path.basename(f))).sort();
const units = goFiles.filter(f => /unit\d+/.test(path.basename(f))).sort();

function mergeGo(files, stem, title, short, order) {
  if (!files.length) return;
  let body = `> **Golang · ${short}**\n>\n> 由示例工程笔记合并。\n\n---\n\n`;
  for (const f of files) {
    const { data, body: b } = readFm(fs.readFileSync(f, "utf8"));
    body += `## ${data.title || path.basename(f)}\n\n${stripNavNoise(b)}\n\n`;
  }
  writeDoc(path.join(goDir, stem + ".md"), {
    title, sidebarGroup: "Golang", shortTitle: short, order, date: "2026-08-13",
    category: "云原生", tag: ["Golang", "云原生", "课程笔记"], description: title,
  }, body);
  for (const f of files) fs.unlinkSync(f);
}

if (parts.length) mergeGo(parts, "golang-02-gin-parts", "Gin 示例 part01～part16 合集", "02 Gin 示例合集", 2);
if (units.length) mergeGo(units, "golang-03-basics-units", "Go 基础练习 unit 合集", "03 基础练习合集", 3);
// keep overview; delete any other leftover except new merged + overview
for (const f of listMd(goDir)) {
  const b = path.basename(f);
  if (/^golang-0[123]-/.test(b)) continue;
  fs.unlinkSync(f);
}
console.log("golang files now:", listMd(goDir).map(f => path.basename(f)));

// ========== 3) Merge small serverless concept pieces (01-08 style intros already separate; leave serving/eventing)
// Merge serverless-02..05 into one "概念入门" if exist
const svDir = path.join(src, "serverless");
const svAll = listMd(svDir);
const concept = svAll.filter(f => {
  const b = path.basename(f);
  return /serverless-0[2-5]-/.test(b);
});
if (concept.length >= 2) {
  let body = `> **Serverless · 概念入门（合并）**\n\n---\n\n`;
  for (const f of concept.sort()) {
    const { data, body: b } = readFm(fs.readFileSync(f, "utf8"));
    const oldStem = path.basename(f, ".md");
    let section = stripNavNoise(b).replace(new RegExp(`/云原生/serverless/${oldStem.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}/`, "g"), "/云原生/serverless/serverless-02-concepts/");
    body += `## ${data.title || oldStem}\n\n${section}\n\n`;
    const oldImg = path.join(pub, "serverless", oldStem);
    const newImg = path.join(pub, "serverless", "serverless-02-concepts");
    ensureDir(newImg);
    if (fs.existsSync(oldImg)) {
      for (const name of fs.readdirSync(oldImg)) {
        const from = path.join(oldImg, name);
        if (fs.statSync(from).isFile()) {
          const to = path.join(newImg, name);
          if (!fs.existsSync(to)) fs.copyFileSync(from, to);
        }
      }
      rmrf(oldImg);
    }
  }
  writeDoc(path.join(svDir, "serverless-02-concepts.md"), {
    title: "Serverless 概念入门",
    sidebarGroup: "Serverless",
    shortTitle: "02 概念入门",
    order: 2,
    date: "2026-08-13",
    category: "云原生",
    tag: ["Serverless", "云原生"],
    description: "Serverless 为什么引入、场景与架构利弊（合并）",
  }, body);
  for (const f of concept) fs.unlinkSync(f);
  console.log("serverless concepts merged:", concept.length);
}

console.log("done merge phase");