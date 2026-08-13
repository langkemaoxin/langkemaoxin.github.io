/**
 * 扫描 src/云原生 下 markdown 中可能导致 VuePress/vite:vue 编译失败的内容。
 * 用法: node scripts/scan-yunyuansheng-vue-hazards.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.join("src", "云原生");
const ZWSP = "\u200b";

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

/** 将正文按「代码围栏 / 行内代码 / 普通文本」分段 */
function segmentMarkdown(body) {
  const segments = [];
  let i = 0;
  const n = body.length;
  while (i < n) {
    // 围栏 ``` 或 ~~~
    const fenceMatch = body.slice(i).match(/^(```|~~~)/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const start = i;
      i += fence.length;
      const end = body.indexOf(fence, i);
      if (end < 0) {
        segments.push({ type: "fence", text: body.slice(start) });
        break;
      }
      i = end + fence.length;
      segments.push({ type: "fence", text: body.slice(start, i) });
      continue;
    }
    // 行内代码 `
    if (body[i] === "`") {
      const start = i;
      i += 1;
      const end = body.indexOf("`", i);
      if (end < 0) {
        segments.push({ type: "text", text: body.slice(start) });
        break;
      }
      i = end + 1;
      segments.push({ type: "inline", text: body.slice(start, i) });
      continue;
    }
    // 普通文本直到下一个 ` 或围栏
    let j = i + 1;
    while (j < n) {
      if (body[j] === "`") break;
      if (body.slice(j, j + 3) === "```" || body.slice(j, j + 3) === "~~~") break;
      j++;
    }
    segments.push({ type: "text", text: body.slice(i, j) });
    i = j;
  }
  return segments;
}

function splitFrontmatter(raw) {
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  if (!raw.startsWith("---")) return { fm: "", body: raw };
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: "", body: raw };
  return { fm: m[0], body: raw.slice(m[0].length) };
}

function countMustacheOutsideSafe(body) {
  let count = 0;
  const hits = [];
  for (const seg of segmentMarkdown(body)) {
    if (seg.type !== "text") continue;
    let idx = 0;
    while ((idx = seg.text.indexOf("{{", idx)) >= 0) {
      // 已用零宽空格打断的不算
      if (seg.text[idx + 1] === ZWSP) {
        idx += 2;
        continue;
      }
      count++;
      const line = seg.text.slice(0, idx).split(/\r?\n/).length;
      hits.push(seg.text.slice(idx, idx + 40).replace(/\r?\n/g, "\\n"));
      idx += 2;
      if (hits.length >= 5) break;
    }
  }
  return { count, hits };
}

function findRawHtmlIssues(body) {
  const issues = [];
  for (const seg of segmentMarkdown(body)) {
    if (seg.type !== "text") continue;
    const text = seg.text;
    // 可疑 HTML 开标签（排除 markdown 图片语法已是 ![alt](...) ）
    const re = /<\/?([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/g;
    let m;
    while ((m = re.exec(text))) {
      const tag = m[1].toLowerCase();
      const attrs = m[2] || "";
      const full = m[0];
      // VuePress / Theme 组件与常见无害标签放行
      const allow = new Set([
        "catalog",
        "badge",
        "hope",
        "vpicon",
        "autosuggest",
        "br",
        "hr",
        "wbr",
        "img", // 单独再查 duplicate
        "a",
        "p",
        "ul",
        "ol",
        "li",
        "strong",
        "em",
        "b",
        "i",
        "code",
        "pre",
        "blockquote",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "sup",
        "sub",
        "kbd",
        "mark",
        "del",
        "ins",
        "details",
        "summary",
      ]);
      // 尖括号占位符如 <none> <BROADCAST...> 等
      if (/^[A-Z0-9_.:|-]+$/.test(tag) && attrs.trim() === "" && !m[0].includes("=")) {
        // <none> <Distro> 等：非标准 HTML，Vue 可能当组件
        if (!allow.has(tag) && tag !== "br") {
          issues.push({ kind: "angle-placeholder", sample: full.slice(0, 80) });
        }
        continue;
      }
      // 重复属性
      const attrNames = [...attrs.matchAll(/\b([:@]?[A-Za-z_:][\w:.-]*)\s*=/g)].map((x) =>
        x[1].toLowerCase(),
      );
      const seen = new Set();
      for (const name of attrNames) {
        if (seen.has(name)) {
          issues.push({ kind: "duplicate-attr", sample: full.slice(0, 120) });
          break;
        }
        seen.add(name);
      }
      // 未引号且多 class / 明显残缺
      if (/\bclass\s*=\s*[^\s"'=<>`]+\s+class\s*=/i.test(attrs)) {
        issues.push({ kind: "duplicate-class", sample: full.slice(0, 120) });
      }
      // 高风险未闭合容器标签：仅记录出现（扫描阶段）
      if (["div", "span", "font", "section", "article", "center", "font"].includes(tag)) {
        issues.push({ kind: "risky-html", sample: full.slice(0, 120) });
      }
      // script/style
      if (["script", "style", "iframe", "object", "embed"].includes(tag)) {
        issues.push({ kind: "dangerous-tag", sample: full.slice(0, 80) });
      }
    }
  }
  return issues;
}

const files = walk(ROOT);
let mustacheFiles = 0;
let mustacheTotal = 0;
let htmlIssueFiles = 0;
const mustacheReport = [];
const htmlReport = [];

for (const f of files) {
  const raw = fs.readFileSync(f, "utf8");
  const { body } = splitFrontmatter(raw);
  const { count, hits } = countMustacheOutsideSafe(body);
  if (count > 0) {
    mustacheFiles++;
    mustacheTotal += count;
    mustacheReport.push({ f, count, hits });
  }
  const issues = findRawHtmlIssues(body);
  if (issues.length) {
    htmlIssueFiles++;
    htmlReport.push({ f, n: issues.length, samples: issues.slice(0, 4) });
  }
}

mustacheReport.sort((a, b) => b.count - a.count);
htmlReport.sort((a, b) => b.n - a.n);

console.log("=== mustache {{ outside code ===");
console.log(`files=${mustacheFiles} occurrences=${mustacheTotal}`);
mustacheReport.slice(0, 40).forEach((x) => {
  console.log(`${x.count}\t${x.f}`);
  x.hits.forEach((h) => console.log(`    ${h}`));
});

console.log("\n=== raw HTML / angle issues ===");
console.log(`files=${htmlIssueFiles}`);
htmlReport.slice(0, 40).forEach((x) => {
  console.log(`${x.n}\t${x.f}`);
  x.samples.forEach((s) => console.log(`    [${s.kind}] ${s.sample}`));
});
