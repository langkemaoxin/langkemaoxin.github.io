const fs = require("fs");
const path = require("path");
const yaml = require("E:/MyGithub/langkemaoxin.github.io/node_modules/.pnpm/js-yaml@3.15.1/node_modules/js-yaml");

const src = "E:/MyGithub/langkemaoxin.github.io/src/云原生";
const pub = "E:/MyGithub/langkemaoxin.github.io/src/.vuepress/public/云原生";

function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
function rmrf(p){ if(fs.existsSync(p)) fs.rmSync(p,{recursive:true,force:true}); }
function readFm(text){
  const m=text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if(!m) return {data:{}, body:text};
  let data={}; try{data=yaml.safeLoad(m[1])||{};}catch{}
  return {data, body:text.slice(m[0].length).replace(/^\r?\n/,"")};
}
function writeDoc(fp,data,body){
  const fm=yaml.safeDump(data,{lineWidth:120,noRefs:true}).trimEnd();
  fs.writeFileSync(fp,`---\n${fm}\n---\n\n${body}`, "utf8");
}
function listMd(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f=>f.endsWith(".md")&&f!=="README.md").map(f=>path.join(dir,f)).sort();
}
function nextOrder(dir, prefix){
  const nums = listMd(dir).map(f=>{
    const m=path.basename(f).match(new RegExp("^"+prefix+"-(\\d+)"));
    return m?parseInt(m[1],10):0;
  });
  return (nums.length?Math.max(...nums):0)+1;
}
function moveArticle(file, fromSeries, toSeries, newPrefix, groupName, order){
  const raw=fs.readFileSync(file,"utf8");
  let {data, body}=readFm(raw);
  const oldStem=path.basename(file,".md");
  const slug = oldStem.replace(new RegExp("^"+fromSeries+"-\\d+-"),"");
  const newStem = `${newPrefix}-${String(order).padStart(2,"0")}-${slug}`;
  const destDir=path.join(src,toSeries);
  ensureDir(destDir);
  const dest=path.join(destDir, newStem+".md");

  data.sidebarGroup = groupName;
  data.order = order;
  data.shortTitle = `${String(order).padStart(2,"0")} ${(data.title||slug).toString().slice(0,24)}`;
  // rewrite image urls
  body = body.replaceAll(`/云原生/${fromSeries}/${oldStem}/`, `/云原生/${toSeries}/${newStem}/`);
  writeDoc(dest, data, body);

  // move images
  const oldImg=path.join(pub, fromSeries, oldStem);
  const newImg=path.join(pub, toSeries, newStem);
  if(fs.existsSync(oldImg)){
    ensureDir(path.dirname(newImg));
    if(fs.existsSync(newImg)) rmrf(newImg);
    fs.renameSync(oldImg, newImg);
  }
  fs.unlinkSync(file);
  return newStem;
}
function writeReadme(dir, title, icon, desc){
  ensureDir(dir);
  const body=`---\ntitle: ${title}\nindex: false\nicon: ${icon}\narticle: false\n---\n\n# ${title}\n\n${desc}\n\n## 文章目录\n\n<Catalog />\n`;
  fs.writeFileSync(path.join(dir,"README.md"), body, "utf8");
}
function emptyAndRemove(series){
  const d=path.join(src,series);
  if(!fs.existsSync(d)) return;
  // remove leftover readme and empty
  for(const f of fs.readdirSync(d)){
    const p=path.join(d,f);
    if(fs.statSync(p).isDirectory()) rmrf(p);
    else fs.unlinkSync(p);
  }
  rmrf(d);
  const pd=path.join(pub,series);
  if(fs.existsSync(pd)) rmrf(pd);
}

// ---- docker-extra + containerd -> docker ----
let order = nextOrder(path.join(src,"docker"), "docker");
for(const f of listMd(path.join(src,"docker-extra"))){
  moveArticle(f,"docker-extra","docker","docker","Docker 系列", order++);
}
for(const f of listMd(path.join(src,"containerd"))){
  moveArticle(f,"containerd","docker","docker","Docker 系列", order++);
}
emptyAndRemove("docker-extra");
emptyAndRemove("containerd");
console.log("docker now", listMd(path.join(src,"docker")).length);

// ---- k8s-course + network + storage -> k8s-ops ----
ensureDir(path.join(src,"k8s-ops"));
// rename move all k8s-course files
order=1;
for(const f of listMd(path.join(src,"k8s-course"))){
  moveArticle(f,"k8s-course","k8s-ops","k8s-ops","K8s 运维笔记", order++);
}
for(const f of listMd(path.join(src,"network"))){
  moveArticle(f,"network","k8s-ops","k8s-ops","K8s 运维笔记", order++);
}
for(const f of listMd(path.join(src,"storage"))){
  moveArticle(f,"storage","k8s-ops","k8s-ops","K8s 运维笔记", order++);
}
emptyAndRemove("k8s-course");
emptyAndRemove("network");
emptyAndRemove("storage");
writeReadme(path.join(src,"k8s-ops"),"K8s 运维笔记","screwdriver-wrench","课程侧部署、网络、存储与组件笔记（已去重合并）。");
console.log("k8s-ops now", listMd(path.join(src,"k8s-ops")).length);

// ---- prometheus -> observability ----
order = nextOrder(path.join(src,"observability"), "observability");
// Use prometheus- prefix preserved via observability-XX-prometheus-...
for(const f of listMd(path.join(src,"prometheus"))){
  const raw=fs.readFileSync(f,"utf8");
  let {data, body}=readFm(raw);
  const oldStem=path.basename(f,".md");
  const newStem=`observability-${String(order).padStart(2,"0")}-${oldStem.replace(/^prometheus-\d+-/,"prom-")}`;
  data.sidebarGroup="可观测性";
  data.order=order;
  data.shortTitle=`${String(order).padStart(2,"0")} ${(data.shortTitle||data.title||"").toString().replace(/^\d+\s*/,"").slice(0,28)}`;
  body=body.replaceAll(`/云原生/prometheus/${oldStem}/`, `/云原生/observability/${newStem}/`);
  writeDoc(path.join(src,"observability", newStem+".md"), data, body);
  const oldImg=path.join(pub,"prometheus",oldStem);
  const newImg=path.join(pub,"observability",newStem);
  if(fs.existsSync(oldImg)){
    ensureDir(path.dirname(newImg));
    if(fs.existsSync(newImg)) rmrf(newImg);
    fs.renameSync(oldImg,newImg);
  }
  fs.unlinkSync(f);
  order++;
}
emptyAndRemove("prometheus");
writeReadme(path.join(src,"observability"),"可观测性","eye","监控、链路追踪与 Prometheus 章节合并笔记。");
console.log("observability now", listMd(path.join(src,"observability")).length);

// ---- platform fold ----
ensureDir(path.join(src,"platform"));
order=1;
const platformSources = [
  ["paas","PaaS"],
  ["microservices","微服务实战"],
  ["multicluster","多集群"],
  ["backup","备份恢复"],
  ["public-cloud","公有云"],
  ["edge","边缘计算"],
];
for(const [series, label] of platformSources){
  for(const f of listMd(path.join(src,series))){
    moveArticle(f, series, "platform", "platform", "平台与实战", order++);
  }
  emptyAndRemove(series);
}
writeReadme(path.join(src,"platform"),"平台与实战","layer-group","PaaS、微服务部署、多集群、备份、公有云与边缘等实战笔记。");
console.log("platform now", listMd(path.join(src,"platform")).length);

// ---- extend fold ----
ensureDir(path.join(src,"extend"));
order=1;
const extendSources = [
  ["bigdata","大数据"],
  ["data-service","数据服务"],
  ["kubevirt","KubeVirt"],
  ["operator","Operator"],
  ["vip","VIP"],
  ["interview","面试"],
];
for(const [series,label] of extendSources){
  for(const f of listMd(path.join(src,series))){
    moveArticle(f, series, "extend", "extend", "扩展专题", order++);
  }
  emptyAndRemove(series);
}
writeReadme(path.join(src,"extend"),"扩展专题","puzzle-piece","大数据/ML、数据服务、KubeVirt、Operator、VIP 与面试等。");
console.log("extend now", listMd(path.join(src,"extend")).length);

// update serverless/devops readme lightly
writeReadme(path.join(src,"serverless"),"Serverless","cloud","Knative / Tekton / OpenFaaS（概念篇已合并）。");
writeReadme(path.join(src,"devops"),"DevOps / GitOps","gears","CI/CD、Argo CD 与 GitOps 实践。");
writeReadme(path.join(src,"golang"),"Golang","golang","课程示例合集（Gin / 基础练习已合并）。");
writeReadme(path.join(src,"foundation"),"云原生基础","seedling","云原生、虚拟化与云计算导论。");

// final counts
console.log("\n=== final dirs ===");
for(const name of fs.readdirSync(src).sort()){
  const p=path.join(src,name);
  if(!fs.statSync(p).isDirectory()) continue;
  const n=listMd(p).length;
  console.log(String(n).padStart(4), name);
}