import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("scripts/mianshi-rename");
const CACHE = path.join(ROOT, "slug-translations.json");
const titles = JSON.parse(fs.readFileSync(path.join(ROOT, "titles.json"), "utf8"));
const data = JSON.parse(fs.readFileSync(CACHE, "utf8"));

let merged = 0;
for (let i = 1; i <= 6; i++) {
  const p = path.join(ROOT, `slug-batch-${String(i).padStart(2, "0")}.json`);
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
  const batch = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const [k, v] of Object.entries(batch)) {
    if (!v?.slug) throw new Error(`bad entry ${k}`);
    // don't overwrite existing good entries unless missing
    if (!data[k]?.slug) {
      data[k] = {
        order: v.order ?? Number(k),
        title: v.title,
        en: v.en || v.slug,
        slug: String(v.slug)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60),
      };
      merged++;
    }
  }
}

// Fix special-case rules strictly
function stripEmoji(s) {
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[💎⭐🔥✅📌🎯🚀💡❤️🎁🏆✨]/g, "")
    .trim();
}

let fixedSpecial = 0;
for (const row of titles) {
  const key = String(row.order);
  const t = stripEmoji(row.title).trim();
  const isShortVideoExact = t === "短视频";
  const isUntitled = /^未命名/.test(t) || /无标题/i.test(t) || /^untitled$/i.test(t);

  if (isShortVideoExact) {
    data[key] = {
      order: row.order,
      title: row.title,
      en: "short video",
      slug: `short-video-${row.order}`,
    };
    fixedSpecial++;
  } else if (isUntitled) {
    data[key] = {
      order: row.order,
      title: row.title,
      en: "untitled",
      slug: `untitled-${row.order}`,
    };
    fixedSpecial++;
  } else if (data[key]?.slug?.startsWith("short-video-") && !isShortVideoExact) {
    // misclassified: title contains 短视频 but is not exact — regenerate from en or keep non-special
    // If slug is only short-video-N, replace with a better fallback from title latin parts
    const cur = data[key];
    if (/^short-video-\d+$/.test(cur.slug)) {
      // force a non-special slug from title
      let slug = stripEmoji(row.title)
        .toLowerCase()
        .replace(/短视频/g, "short-video-system")
        .replace(/系统设计/g, "design")
        .replace(/如何/g, "how-to")
        .replace(/支持/g, "support")
        .replace(/用户/g, "users")
        .replace(/同时在线/g, "concurrent")
        .replace(/看视频/g, "watch")
        .replace(/[\u4e00-\u9fff]+/g, "-")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
      if (!slug || slug.length < 4) slug = `short-video-system-${row.order}`;
      cur.slug = slug;
      fixedSpecial++;
    }
  }
}

// Ensure every title has a slug
const missing = [];
for (const row of titles) {
  if (!data[String(row.order)]?.slug) missing.push(row.order);
}

fs.writeFileSync(CACHE, JSON.stringify(data, null, 2), "utf8");
console.log(
  JSON.stringify(
    {
      merged,
      fixedSpecial,
      totalKeys: Object.keys(data).length,
      missingCount: missing.length,
      missing: missing.slice(0, 20),
    },
    null,
    2,
  ),
);
