import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/面试题");
const OUT = path.resolve("scripts/mianshi-rename/titles.json");

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith(".md") && ent.name !== "README.md") acc.push(p);
  }
  return acc;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = m[1];
  const titleMatch = fm.match(/^title:\s*(?:"([^"]*)"|'([^']*)'|(.+))\s*$/m);
  const orderMatch = fm.match(/^order:\s*(\d+)/m);
  return {
    title: (titleMatch?.[1] ?? titleMatch?.[2] ?? titleMatch?.[3] ?? "").trim(),
    order: Number(orderMatch?.[1] ?? 0),
  };
}

const files = walk(ROOT);
const rows = [];
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const { title, order } = parseFrontmatter(text);
  const stem = path.basename(f, ".md");
  const rel = path.relative(ROOT, f).split(path.sep).join("/");
  rows.push({ rel, stem, order, title });
}
rows.sort((a, b) => a.order - b.order || a.rel.localeCompare(b.rel));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(rows, null, 2), "utf8");
console.log(`wrote ${rows.length} titles -> ${OUT}`);

const special = rows.filter((r) =>
  /未命名|短视频|Untitled|无标题/i.test(r.title),
);
console.log("special titles:", special.length);
for (const r of special.slice(0, 30)) {
  console.log(`  ${String(r.order).padStart(4, "0")} ${r.title}`);
}
