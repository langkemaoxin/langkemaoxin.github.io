/**
 * Translate interview titles to short English kebab-case slugs via MyMemory.
 * Writes scripts/mianshi-rename/slug-translations.json (resumable).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("scripts/mianshi-rename");
const titles = JSON.parse(fs.readFileSync(path.join(ROOT, "titles.json"), "utf8"));
const CACHE = path.join(ROOT, "slug-translations.json");

const cache = fs.existsSync(CACHE)
  ? JSON.parse(fs.readFileSync(CACHE, "utf8"))
  : {};

const MAX_SLUG = 60;

function stripEmoji(s) {
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[💎⭐🔥✅📌🎯🚀💡❤️🎁🏆✨]/g, "")
    .trim();
}

function toKebab(en) {
  return en
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function truncateSlug(slug) {
  if (slug.length <= MAX_SLUG) return slug;
  const cut = slug.slice(0, MAX_SLUG);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

function specialSlug(title, order) {
  const t = stripEmoji(title).trim();
  if (t === "短视频" || /^短视频\b/.test(t)) return `short-video-${order}`;
  if (/^未命名/.test(t) || /无标题/i.test(t) || /^untitled$/i.test(t)) {
    return `untitled-${order}`;
  }
  return null;
}

function shortenEnglish(en) {
  let s = en;
  const repl = [
    [/\bwhat is\b/gi, "what-is"],
    [/\bhow to\b/gi, "how-to"],
    [/\bhow does\b/gi, "how"],
    [/\bhow do\b/gi, "how"],
    [/\binterview questions?\b/gi, "interview"],
    [/\bcommon interview\b/gi, "interview"],
    [/\bin-depth (?:explanation|analysis)\b/gi, "deep-dive"],
    [/\bdetailed explanation\b/gi, "explained"],
    [/\bsource code\b/gi, "source"],
    [/\bimplementation\b/gi, "impl"],
    [/\bintroduction to\b/gi, "intro"],
    [/\ban overview of\b/gi, "overview"],
    [/\bthe difference between\b/gi, "diff"],
    [/\bdifference between\b/gi, "diff"],
    [/\bcomparison of\b/gi, "compare"],
    [/\bversus\b/gi, "vs"],
    [/\bhigh[- ]frequency\b/gi, "faq"],
    [/\bmust[- ]know\b/gi, "must-know"],
    [/\bhighlights? and (?:difficulties|pain points)\b/gi, "highlights"],
    [/\bresume template\b/gi, "resume-template"],
    [/\bshort video\b/gi, "short-video"],
  ];
  for (const [re, to] of repl) s = s.replace(re, to);
  return s;
}

async function translateOne(title) {
  const cleaned = stripEmoji(title);
  const chineseRatio =
    (cleaned.match(/[\u4e00-\u9fff]/g) || []).length / Math.max(cleaned.length, 1);
  if (chineseRatio < 0.05) return cleaned;

  const input = cleaned.length > 160 ? cleaned.slice(0, 160) : cleaned;
  const url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(input) +
    "&langpair=zh|en";
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const text = data?.responseData?.translatedText;
  if (!text || /^MYMEMORY WARNING/i.test(text) || /^INVALID/i.test(text)) {
    throw new Error(`bad response: ${JSON.stringify(data).slice(0, 180)}`);
  }
  return text;
}

async function processRow(row, out) {
  const key = String(row.order);
  if (out[key]?.slug) return "skipped";
  const special = specialSlug(row.title, row.order);
  if (special) {
    out[key] = { order: row.order, title: row.title, en: special, slug: special };
    return "special";
  }
  let attempts = 0;
  while (attempts < 4) {
    attempts++;
    try {
      const enRaw = await translateOne(row.title);
      const en = shortenEnglish(enRaw);
      let slug = truncateSlug(toKebab(en));
      if (!slug || slug.length < 3) slug = `doc-${row.order}`;
      out[key] = { order: row.order, title: row.title, en: enRaw, slug };
      return "ok";
    } catch (err) {
      if (attempts >= 4) {
        console.error(`fail order=${row.order}:`, err?.message || err);
        return "fail";
      }
      await new Promise((r) => setTimeout(r, 400 * attempts));
    }
  }
  return "fail";
}

async function main() {
  const out = { ...cache };
  let done = 0;
  let skipped = 0;
  let failed = 0;
  const CONCURRENCY = 6;
  const pending = titles.filter((row) => !out[String(row.order)]?.slug);

  // seed specials first without network
  for (const row of titles) {
    const key = String(row.order);
    if (out[key]?.slug) continue;
    const special = specialSlug(row.title, row.order);
    if (special) {
      out[key] = { order: row.order, title: row.title, en: special, slug: special };
      done++;
    }
  }

  const needNet = titles.filter((row) => !out[String(row.order)]?.slug);
  console.log(`special/cached done=${Object.keys(out).length} needNet=${needNet.length}`);

  for (let i = 0; i < needNet.length; i += CONCURRENCY) {
    const batch = needNet.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((row) => processRow(row, out)));
    for (const r of results) {
      if (r === "ok" || r === "special") done++;
      else if (r === "skipped") skipped++;
      else failed++;
    }
    if ((i / CONCURRENCY) % 5 === 0) {
      fs.writeFileSync(CACHE, JSON.stringify(out, null, 2), "utf8");
      console.log(
        `progress ${Math.min(i + CONCURRENCY, needNet.length)}/${needNet.length} keys=${Object.keys(out).length} failed=${failed}`,
      );
    }
    await new Promise((r) => setTimeout(r, 60));
  }

  fs.writeFileSync(CACHE, JSON.stringify(out, null, 2), "utf8");
  console.log(
    `done translated=${done} skipped=${skipped} failed=${failed} totalKeys=${Object.keys(out).length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
