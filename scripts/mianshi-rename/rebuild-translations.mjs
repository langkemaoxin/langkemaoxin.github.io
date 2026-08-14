import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("scripts/mianshi-rename");
const titles = JSON.parse(fs.readFileSync(path.join(ROOT, "titles.json"), "utf8"));
const OUT = path.join(ROOT, "slug-translations.json");

function stripEmoji(s) {
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[💎⭐🔥✅📌🎯🚀💡❤️🎁🏆✨]/g, "")
    .trim();
}

function normSlug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function polish(slug) {
  return normSlug(
    slug
      .replace(/eight-strands?/g, "classic-interview-qa")
      .replace(/eight-strings?/g, "classic-interview-qa")
      .replace(/assault-procedure/g, "crash-prep-flow")
      .replace(/interview-for-a-raid/g, "interview-crash-prep")
      .replace(/r-sum-s/g, "resume")
      .replace(/knowledgable-handbook/g, "hiring-handbook")
      .replace(/knowledgeable-handbook/g, "hiring-handbook")
      .replace(/new-student-resume/g, "fresh-grad-resume")
      .replace(/interviewer-hiring-handbook/g, "interviewer-hiring-handbook"),
  );
}

const data = {};

// 1) recover whatever API translations remain (best-effort)
if (fs.existsSync(OUT)) {
  try {
    const cur = JSON.parse(fs.readFileSync(OUT, "utf8"));
    Object.assign(data, cur);
  } catch {
    /* ignore */
  }
}

// 2) overlay LLM batches (authoritative for their ranges)
for (let i = 1; i <= 6; i++) {
  const p = path.join(ROOT, `slug-batch-${String(i).padStart(2, "0")}.json`);
  const batch = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const [k, v] of Object.entries(batch)) {
    data[k] = {
      order: v.order ?? Number(k),
      title: v.title,
      en: v.en || v.slug,
      slug: polish(v.slug),
    };
  }
}

// 3) manual fills for API failures
data["357"] = {
  order: 357,
  title: "SQL用了函数一定会索引失效吗",
  en: "does SQL function always invalidate index",
  slug: "sql-function-always-invalidate-index",
};
data["370"] = {
  order: 370,
  title: "索引失效的问题如何排查",
  en: "how to troubleshoot index invalidation",
  slug: "how-to-troubleshoot-index-invalidation",
};

// 4) enforce specials + polish all
for (const row of titles) {
  const key = String(row.order);
  const t = stripEmoji(row.title).trim();
  if (t === "短视频") {
    data[key] = {
      order: row.order,
      title: row.title,
      en: "short video",
      slug: `short-video-${row.order}`,
    };
    continue;
  }
  if (/^未命名/.test(t) || /无标题/i.test(t)) {
    data[key] = {
      order: row.order,
      title: row.title,
      en: "untitled",
      slug: `untitled-${row.order}`,
    };
    continue;
  }
  if (!data[key]?.slug) {
    // last-resort: keep latin tokens from title
    let slug = stripEmoji(row.title)
      .toLowerCase()
      .replace(/[\u4e00-\u9fff]+/g, "-")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug || slug.length < 3) slug = `doc-${row.order}`;
    data[key] = {
      order: row.order,
      title: row.title,
      en: slug,
      slug: polish(slug).slice(0, 60) || `doc-${row.order}`,
    };
    continue;
  }
  // fix misclassified short-video-* for non-exact titles
  if (/^short-video-\d+$/.test(data[key].slug) && t !== "短视频") {
    let slug = t
      .toLowerCase()
      .replace(/短视频系统/g, "short-video-system")
      .replace(/短视频/g, "short-video")
      .replace(/系统设计/g, "design")
      .replace(/如何支持/g, "how-to-support")
      .replace(/如何/g, "how-to")
      .replace(/三千万/g, "30m")
      .replace(/千万/g, "10m")
      .replace(/用户/g, "users")
      .replace(/同时在线/g, "concurrent")
      .replace(/看视频/g, "watching")
      .replace(/[\u4e00-\u9fff]+/g, "-")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    if (!slug || slug.length < 6) slug = `short-video-system-design-${row.order}`;
    data[key].slug = slug;
  } else if (!data[key].slug.startsWith("untitled-")) {
    data[key].slug = polish(data[key].slug);
  }
  // ensure title field present
  data[key].title = data[key].title || row.title;
  data[key].order = row.order;
}

const missing = titles.filter((r) => !data[String(r.order)]?.slug);
const tmp = OUT + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
fs.renameSync(tmp, OUT);

console.log(
  JSON.stringify(
    {
      totalKeys: Object.keys(data).length,
      titles: titles.length,
      missing: missing.length,
      fileBytes: fs.statSync(OUT).size,
      sample1: data["1"]?.slug,
      sample708: data["708"]?.slug,
      sample1490: data["1490"]?.slug,
    },
    null,
    2,
  ),
);
