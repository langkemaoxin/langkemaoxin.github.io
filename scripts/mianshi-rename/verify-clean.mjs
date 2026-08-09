import fs from "node:fs";
import path from "node:path";

const map = JSON.parse(
  fs.readFileSync("scripts/mianshi-rename/rename-map.json", "utf8"),
);
const stems = new Set(map.map((m) => m.oldStem));

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".temp", ".cache", "dist"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith(".md") || ent.name === "sidebar.ts") acc.push(p);
  }
  return acc;
}

const files = walk("src");
const hits = [];
const re = /\b(\d{4}-[a-z0-9]{10,})\b/g;
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/yuque\.com/.test(line)) continue;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line))) {
      if (stems.has(m[1])) {
        hits.push({
          file: f.split(path.sep).join("/"),
          line: i + 1,
          stem: m[1],
          snippet: line.trim().slice(0, 140),
        });
      }
    }
  }
}

console.log("leftover old stems in src md/sidebar (excl yuque):", hits.length);
for (const h of hits.slice(0, 25)) {
  console.log(`${h.file}:${h.line} ${h.stem} ${h.snippet}`);
}

// broken image dirs?
let broken = 0;
const imgRe = /\/面试题\/([^\s)'"]+?)\/(img-[a-z0-9]+\.[a-z0-9]+)/g;
for (const f of walk("src/面试题")) {
  if (!f.endsWith(".md")) continue;
  const text = fs.readFileSync(f, "utf8");
  let m;
  imgRe.lastIndex = 0;
  while ((m = imgRe.exec(text))) {
    const rel = m[1];
    const img = m[2];
    const full = path.join("src/.vuepress/public/面试题", rel, img);
    if (!fs.existsSync(full)) {
      broken++;
      if (broken <= 10) console.log("missing img", full);
    }
  }
}
console.log("broken image refs:", broken);
