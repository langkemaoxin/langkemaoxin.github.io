const fs = require("fs");
const path = require("path");
const yaml = require("E:/MyGithub/langkemaoxin.github.io/node_modules/.pnpm/js-yaml@3.15.1/node_modules/js-yaml");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function sanitizeString(s) {
  if (typeof s !== "string") return s;
  let v = s.replace(/\\/g, "/");
  v = v.replace(/[A-Za-z]:\/[^\s"]+/g, "[path]");
  v = v.replace(/"/g, "'");
  if (v.length > 160) v = v.slice(0, 160) + "...";
  return v;
}

const root = path.join("src", "云原生");
const files = walk(root);
let fixed = 0, fail = 0;
const errors = [];

for (const f of files) {
  let text = fs.readFileSync(f, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!text.startsWith("---")) continue;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) {
    fail++;
    errors.push(f + " :: no frontmatter end");
    continue;
  }
  let data;
  try {
    data = yaml.safeLoad(m[1]);
  } catch (e) {
    const title = ((m[1].match(/^title:\s*"(.*)"/m) || [])[1]) || path.basename(f, ".md");
    data = {
      title: sanitizeString(title),
      sidebarGroup: "云原生",
      category: "云原生",
      tag: ["云原生", "课程笔记"],
      description: sanitizeString(title),
    };
  }
  if (!data || typeof data !== "object") {
    fail++;
    errors.push(f + " :: empty fm");
    continue;
  }
  for (const k of Object.keys(data)) {
    if (typeof data[k] === "string") data[k] = sanitizeString(data[k]);
  }
  if (Array.isArray(data.tag)) data.tag = data.tag.map((t) => (typeof t === "string" ? sanitizeString(t) : t));
  if (data.description) data.description = sanitizeString(String(data.description));
  else data.description = sanitizeString(String(data.title || ""));

  const fm = yaml.safeDump(data, { lineWidth: 120, noRefs: true }).trimEnd();
  try {
    yaml.safeLoad(fm);
  } catch (e) {
    fail++;
    errors.push(f + " :: dump invalid: " + e.message.split("\n")[0]);
    continue;
  }
  const body = text.slice(m[0].length).replace(/^\r?\n/, "");
  const out = `---\n${fm}\n---\n\n${body}`;
  fs.writeFileSync(f, out, "utf8");
  fixed++;
}
console.log(`fixed=${fixed} fail=${fail}`);
errors.slice(0, 40).forEach((e) => console.log(e));

// revalidate
let ok = 0, bad = 0;
for (const f of files) {
  let text = fs.readFileSync(f, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!text.startsWith("---")) continue;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) { bad++; continue; }
  try { yaml.safeLoad(m[1]); ok++; } catch (e) { bad++; console.log("BAD", f, e.message.split("\n")[0]); }
}
console.log(`revalidate ok=${ok} bad=${bad}`);