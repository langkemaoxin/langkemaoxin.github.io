/**
 * Build rename-map.json from titles + slug-translations.
 * Resolves collisions within the same directory.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve("scripts/mianshi-rename");
const SRC = path.resolve("src/面试题");
const PUBLIC = path.resolve("src/.vuepress/public/面试题");

const titles = JSON.parse(fs.readFileSync(path.join(ROOT, "titles.json"), "utf8"));
const translations = JSON.parse(
  fs.readFileSync(path.join(ROOT, "slug-translations.json"), "utf8"),
);

const MAX_SLUG = 60;

function truncateSlug(slug) {
  if (slug.length <= MAX_SLUG) return slug;
  const cut = slug.slice(0, MAX_SLUG);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

function shortHash(s) {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 6);
}

const usedByDir = new Map(); // dir -> Set of new stems
const map = [];

for (const row of titles) {
  const tr = translations[String(row.order)];
  if (!tr?.slug) {
    throw new Error(`Missing translation for order=${row.order} title=${row.title}`);
  }

  let slug = tr.slug;
  // special slugs already include order suffix
  const isSpecial =
    slug.startsWith("short-video-") || slug.startsWith("untitled-");

  if (!isSpecial) {
    slug = truncateSlug(slug.replace(/-+$/g, ""));
    if (!slug || slug.length < 2) slug = `doc-${row.order}`;
  }

  const orderStr = String(row.order).padStart(4, "0");
  const dir = path.posix.dirname(row.rel);
  if (!usedByDir.has(dir)) usedByDir.set(dir, new Set());
  const used = usedByDir.get(dir);

  let newStem = isSpecial ? `${orderStr}-${slug}` : `${orderStr}-${slug}`;
  // For special, slug already has order: short-video-48 → 0048-short-video-48
  // That's fine per user rule: untitled-{order} / short-video-{order}

  if (used.has(newStem)) {
    const withOrder = `${orderStr}-${slug}-${row.order}`;
    if (!used.has(withOrder)) {
      newStem = withOrder;
    } else {
      newStem = `${orderStr}-${slug}-${shortHash(row.stem)}`;
    }
  }
  used.add(newStem);

  const oldStem = row.stem;
  const newRel = dir === "." ? `${newStem}.md` : `${dir}/${newStem}.md`;
  const oldMd = path.join(SRC, row.rel);
  const newMd = path.join(SRC, newRel);
  const oldImgDir = path.join(PUBLIC, dir === "." ? oldStem : path.join(dir, oldStem));
  const newImgDir = path.join(PUBLIC, dir === "." ? newStem : path.join(dir, newStem));
  const hasImgDir = fs.existsSync(oldImgDir);

  map.push({
    order: row.order,
    title: row.title,
    en: tr.en,
    slug,
    dir,
    oldStem,
    newStem,
    oldRel: row.rel,
    newRel,
    oldMd,
    newMd,
    oldImgDir: hasImgDir ? oldImgDir : null,
    newImgDir: hasImgDir ? newImgDir : null,
    unchanged: oldStem === newStem,
  });
}

const outPath = path.join(ROOT, "rename-map.json");
fs.writeFileSync(outPath, JSON.stringify(map, null, 2), "utf8");
const changing = map.filter((m) => !m.unchanged);
const withImg = changing.filter((m) => m.oldImgDir);
console.log(`map entries=${map.length} changing=${changing.length} withImgDir=${withImg.length}`);
console.log("samples:");
for (const m of changing.slice(0, 12)) {
  console.log(`  ${m.oldStem} -> ${m.newStem}`);
}
