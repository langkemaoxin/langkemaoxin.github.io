/**
 * Fix remaining VuePress build hazards in src/云原生:
 * 1) Escape markdown-it-attrs curly dicts like {name: master, address: ...}
 * 2) Rename extensionless image assets to .png and fix MD links
 * 3) Escape remaining unsafe patterns
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src", "云原生");
const PUBLIC = path.join(__dirname, "..", "src", ".vuepress", "public", "云原生");
const ZWSP = "\u200b";

function walk(dir, out = [], pred = (n) => n.endsWith(".md")) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out, pred);
    else if (pred(ent.name)) out.push(p);
  }
  return out;
}

function splitFrontmatter(raw) {
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  if (!raw.startsWith("---")) return { fm: "", body: raw };
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: "", body: raw };
  return { fm: m[0], body: raw.slice(m[0].length) };
}

function segmentMarkdown(body) {
  const segments = [];
  let i = 0;
  const n = body.length;
  while (i < n) {
    const fenceMatch = body.slice(i).match(/^(```|~~~)/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const start = i;
      i += fence.length;
      const end = body.indexOf(fence, i);
      if (end < 0) {
        segments.push({ type: "fence", text: body.slice(start) });
        break;
      }
      i = end + fence.length;
      segments.push({ type: "fence", text: body.slice(start, i) });
      continue;
    }
    if (body[i] === "`") {
      const start = i;
      i += 1;
      const end = body.indexOf("`", i);
      if (end < 0) {
        segments.push({ type: "text", text: body.slice(start) });
        break;
      }
      i = end + 1;
      segments.push({ type: "inline", text: body.slice(start, i) });
      continue;
    }
    let j = i + 1;
    while (j < n) {
      if (body[j] === "`") break;
      if (body.slice(j, j + 3) === "```" || body.slice(j, j + 3) === "~~~") break;
      j++;
    }
    segments.push({ type: "text", text: body.slice(i, j) });
    i = j;
  }
  return segments;
}

const SAFE_TAGS = new Set([
  "br", "hr", "wbr", "img", "a", "p", "ul", "ol", "li", "strong", "em", "b", "i",
  "code", "pre", "blockquote", "table", "thead", "tbody", "tr", "th", "td",
  "h1", "h2", "h3", "h4", "h5", "h6", "sup", "sub", "kbd", "mark", "del", "ins",
  "details", "summary", "catalog", "badge",
]);

function sanitizeText(text) {
  let t = text;
  t = t.replace(/!\[[^\]]*\]\(file:\/\/\/[^)]+\)/gi, "");
  t = t.replace(/!\[[^\]]*\]\(\/img\/[^)]+\)/g, "（配图链接已失效，已省略）");

  // Break markdown-it-attrs: {name: ...} / {.class} after blocks
  // Insert ZWSP after { when it looks like attrs/object literal in prose
  t = t.replace(/\{(?!\u200b)(?=[.#a-zA-Z_])/g, `{${ZWSP}`);

  // Escape unsafe HTML-like tags
  t = t.replace(/<\/?([A-Za-z][\w:.-]*)\b([^>]*)>/g, (full, tag) => {
    if (SAFE_TAGS.has(tag.toLowerCase())) return full;
    return full.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  });

  // Mustache
  t = t.replace(/\{(\u200b)?\{/g, (m, z) => (z ? m : `{${ZWSP}{`));

  // Fix extensionless absolute public image links: /云原生/.../1 -> /云原生/.../1.png
  t = t.replace(/(!\[[^\]]*\]\()(\/云原生\/[^)]+?)(\))/g, (full, a, url, c) => {
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(url)) return full;
    // only rewrite if looks like asset id (no trailing slash, last segment short/numeric or no dot)
    const base = url.split("/").pop() || "";
    if (!base || base.includes(".")) return full;
    return `${a}${url}.png${c}`;
  });

  return t;
}

function processMd(file) {
  const raw = fs.readFileSync(file, "utf8");
  const { fm, body } = splitFrontmatter(raw);
  let changed = false;
  const out = segmentMarkdown(body)
    .map((s) => {
      if (s.type !== "text") return s.text;
      const n = sanitizeText(s.text);
      if (n !== s.text) changed = true;
      return n;
    })
    .join("");
  if (changed) fs.writeFileSync(file, fm + out, "utf8");
  return changed;
}

/** Rename extensionless files under public/云原生 that look like PNG/JPEG */
function renameExtensionlessImages() {
  let n = 0;
  const files = walk(PUBLIC, [], () => true);
  for (const f of files) {
    const name = path.basename(f);
    if (name.includes(".")) continue;
    if (!fs.statSync(f).isFile()) continue;
    const buf = Buffer.alloc(8);
    const fd = fs.openSync(f, "r");
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    let ext = null;
    if (buf[0] === 0x89 && buf[1] === 0x50) ext = ".png";
    else if (buf[0] === 0xff && buf[1] === 0xd8) ext = ".jpg";
    else if (buf[0] === 0x47 && buf[1] === 0x49) ext = ".gif";
    else if (buf[0] === 0x52 && buf[1] === 0x49) ext = ".webp";
    if (!ext) continue;
    const dest = f + ext;
    if (fs.existsSync(dest)) {
      fs.unlinkSync(f);
    } else {
      fs.renameSync(f, dest);
    }
    n++;
    console.log("renamed", path.relative(PUBLIC, f), "->", name + ext);
  }
  return n;
}

const renamed = renameExtensionlessImages();
let md = 0;
for (const f of walk(ROOT)) {
  if (processMd(f)) {
    md++;
    console.log("md", path.relative(ROOT, f));
  }
}
console.log(`done renamed=${renamed} mdChanged=${md}`);
