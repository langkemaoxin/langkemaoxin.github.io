const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

function walk(dir, out=[]) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const root = path.join("src", "云原生");
const files = walk(root);
let ok = 0, fail = 0;
const errors = [];
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  if (!text.startsWith("---")) continue;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  try {
    yaml.safeLoad(m[1]);
    ok++;
  } catch (e) {
    fail++;
    errors.push(f + " :: " + e.message.split("\n")[0]);
  }
}
console.log(`ok=${ok} fail=${fail}`);
errors.slice(0, 30).forEach(e => console.log(e));