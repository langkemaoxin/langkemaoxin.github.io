import fs from "node:fs";
import path from "node:path";

const map = JSON.parse(
  fs.readFileSync("scripts/mianshi-rename/rename-map.json", "utf8"),
);
const changing = map.filter((m) => !m.unchanged);
changing.sort((a, b) => b.oldStem.length - a.oldStem.length);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

let files = 0;
let replacements = 0;
for (const f of walk("src/面试题")) {
  let text = fs.readFileSync(f, "utf8");
  const before = text;
  for (const m of changing) {
    if (!text.includes(m.oldStem)) continue;
    const stemEsc = m.oldStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // allow spaces in path segments
    const rePath = new RegExp(`(/面试题/(?:[^)'"\`\\n]*?)/)${stemEsc}(/)`, "g");
    text = text.replace(rePath, (full, p1, p2) => {
      replacements++;
      return `${p1}${m.newStem}${p2}`;
    });
  }
  if (text !== before) {
    fs.writeFileSync(f, text, "utf8");
    files++;
  }
}
console.log({ files, replacements });
