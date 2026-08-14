/**
 * Neutralize all non-http markdown images in src/云原生 that cannot be resolved
 * to an existing file under public or beside the markdown file.
 */
const fs = require("fs");
const path = require("path");

const MD_ROOT = path.join(__dirname, "..", "src", "云原生");
const PUBLIC = path.join(__dirname, "..", "src", ".vuepress", "public");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function existsUrl(url, mdFile) {
  const clean = url.replace(/[\r\n\s]+/g, "");
  if (/^https?:\/\//i.test(clean) || clean.startsWith("data:")) return true;
  if (clean.startsWith("/")) {
    return fs.existsSync(path.join(PUBLIC, clean.replace(/^\//, "")));
  }
  // Windows abs
  if (/^[A-Za-z]:[\\/]/.test(clean) || clean.startsWith("file:")) return false;
  // relative to md
  return fs.existsSync(path.resolve(path.dirname(mdFile), clean));
}

let replaced = 0;
let filesChanged = 0;
for (const f of walk(MD_ROOT)) {
  let t = fs.readFileSync(f, "utf8");
  const next = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => {
    if (existsUrl(url, f)) return m;
    replaced++;
    return `> （配图缺失：${alt || "image"}）`;
  });
  if (next !== t) {
    fs.writeFileSync(f, next, "utf8");
    filesChanged++;
  }
}
console.log({ filesChanged, replaced });
