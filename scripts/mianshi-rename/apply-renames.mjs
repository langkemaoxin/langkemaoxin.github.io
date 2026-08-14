/**
 * Apply rename-map.json:
 * 1) rewrite image/path refs in md (while old stems still exist in content)
 * 2) rename md files (git mv when possible)
 * 3) rename public image dirs
 * 4) rewrite src/README.md hardcoded links
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO = path.resolve(".");
const map = JSON.parse(
  fs.readFileSync(path.resolve("scripts/mianshi-rename/rename-map.json"), "utf8"),
);
const dryRun = process.argv.includes("--dry-run");
const skipGit = process.argv.includes("--skip-git");

const changing = map.filter((m) => !m.unchanged);
changing.sort((a, b) => b.oldStem.length - a.oldStem.length);

function walkMd(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMd(p, acc);
    else if (ent.name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

function rewriteText(text) {
  let out = text;
  for (const m of changing) {
    const stemEsc = m.oldStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // /面试题/<dirs>/oldStem/
    // allow spaces in folder segments (e.g. "AI代码 Reviewer 助手")
    const rePath = new RegExp(`(/面试题/(?:[^)'"\`\\n]*?)/)${stemEsc}(/)`, "g");
    out = out.replace(rePath, `$1${m.newStem}$2`);

    // 面试题/<dir>/oldStem.md (README etc.)
    if (m.dir && m.dir !== ".") {
      const dirEsc = m.dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const reHome = new RegExp(`(面试题/${dirEsc}/)${stemEsc}(\\.md)`, "g");
      out = out.replace(reHome, `$1${m.newStem}$2`);
    }
  }
  return out;
}

let filesRewritten = 0;
const mianshiFiles = walkMd(path.resolve("src/面试题"));
const readme = path.resolve("src/README.md");
for (const f of [...mianshiFiles, readme]) {
  if (!fs.existsSync(f)) continue;
  const before = fs.readFileSync(f, "utf8");
  const after = rewriteText(before);
  if (after !== before) {
    if (!dryRun) fs.writeFileSync(f, after, "utf8");
    filesRewritten++;
  }
}

function renamePath(from, to, useGit) {
  if (!fs.existsSync(from)) return false;
  if (fs.existsSync(to)) throw new Error(`target exists: ${to}`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (dryRun) return true;
  if (useGit && !skipGit) {
    const fromRel = path.relative(REPO, from).split(path.sep).join("/");
    const toRel = path.relative(REPO, to).split(path.sep).join("/");
    try {
      execFileSync("git", ["mv", "--", fromRel, toRel], { cwd: REPO, stdio: "pipe" });
      return true;
    } catch {
      fs.renameSync(from, to);
      return true;
    }
  }
  fs.renameSync(from, to);
  return true;
}

let mdRenamed = 0;
let imgRenamed = 0;
let i = 0;
for (const m of changing) {
  i++;
  if (renamePath(m.oldMd, m.newMd, true)) mdRenamed++;
  if (m.oldImgDir) {
    if (renamePath(m.oldImgDir, m.newImgDir, false)) imgRenamed++;
  }
  if (i % 200 === 0) console.log(`renamed progress ${i}/${changing.length}`);
}

console.log(
  JSON.stringify(
    {
      dryRun,
      changing: changing.length,
      filesRewritten,
      mdRenamed,
      imgRenamed,
      sample: changing.slice(0, 8).map((m) => `${m.oldStem} -> ${m.newStem}`),
    },
    null,
    2,
  ),
);
