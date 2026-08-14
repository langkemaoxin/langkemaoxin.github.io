import fs from "node:fs";

const p = "scripts/mianshi-rename/slug-translations.json";
const st = fs.statSync(p);
console.log("size", st.size, "mtime", st.mtime.toISOString());
const raw = fs.readFileSync(p, "utf8");
console.log("raw includes 708 key?", raw.includes('"708"'));
const d = JSON.parse(raw);
console.log("keys", Object.keys(d).length);
console.log("708", d["708"]);
console.log("357", d["357"]);
const t = JSON.parse(fs.readFileSync("scripts/mianshi-rename/titles.json", "utf8"));
const missing = t.filter((r) => !d[String(r.order)]?.slug);
console.log("missing", missing.length);
console.log(
  "missing sample",
  missing.slice(0, 10).map((r) => r.order + ":" + r.title.slice(0, 40)),
);
