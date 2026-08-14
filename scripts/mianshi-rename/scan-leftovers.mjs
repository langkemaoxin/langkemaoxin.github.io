/**
 * Fast scan: find old stems still referenced under src/ (excluding yuque URLs).
 */
import fs from "node:fs";
import path from "node:path";

const map = JSON.parse(
  fs.readFileSync("scripts/mianshi-rename/rename-map.json", "utf8"),
);
const oldStems = map.filter((m) => !m.unchanged).map((m) => m.oldStem);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".temp" || ent.name === ".cache")
      continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(md|mjs|ts|js|json)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

// Build one big alternation regex in chunks
const leftovers = [];
const files = walk(path.resolve("src"));
console.log(`scanning ${files.length} files against ${oldStems.length} old stems`);

const stemSet = new Set(oldStems);
// Also check filesystem: any old-named md left?
const oldMdLeft = [];
for (const m of map) {
  if (m.unchanged) continue;
  if (fs.existsSync(m.oldMd)) oldMdLeft.push(m.oldRel);
  if (m.oldImgDir && fs.existsSync(m.oldImgDir)) oldMdLeft.push("IMG:" + m.oldStem);
}

for (const f of files) {
  // skip generated sidebar maybe large - still scan
  const text = fs.readFileSync(f, "utf8");
  if (!text.includes("-") || text.length < 10) continue;
  // quick reject: none of pattern \d{4}-[a-z0-9]{16} typical old stem? old stems are order-yuqueid
  // Extract candidate stems resembling old pattern: NNNN-xxxxxxxxxxxxxxx
  const re = /\b(\d{4}-[a-z0-9]{10,})\b/g;
  let match;
  const found = new Set();
  while ((match = re.exec(text))) {
    const stem = match[1];
    if (stemSet.has(stem)) found.add(stem);
  }
  // also check exact includes for non-matching patterns (untitled etc won't match above for new; old always \d{4}-[a-z0-9]+)
  if (found.size === 0) continue;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/yuque\.com/.test(line)) continue;
    for (const stem of found) {
      if (line.includes(stem)) {
        leftovers.push({
          file: path.relative(process.cwd(), f).split(path.sep).join("/"),
          line: i + 1,
          oldStem: stem,
          snippet: line.trim().slice(0, 160),
        });
      }
    }
  }
}

console.log(`old paths still on disk: ${oldMdLeft.length}`);
console.log(`leftover refs (excl yuque): ${leftovers.length}`);
for (const L of leftovers.slice(0, 30)) {
  console.log(`${L.file}:${L.line} [${L.oldStem}] ${L.snippet}`);
}
fs.writeFileSync(
  "scripts/mianshi-rename/leftovers.json",
  JSON.stringify({ oldMdLeft, leftovers }, null, 2),
  "utf8",
);
