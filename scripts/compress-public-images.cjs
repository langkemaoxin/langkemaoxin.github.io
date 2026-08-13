/**
 * Batch compress images under src/.vuepress/public
 * - Resize with sharp (max edge 1600)
 * - PNG: pngquant quality 65-80
 * - JPG: sharp mozjpeg quality 78
 * Keep original if compressed is larger.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "../src/.vuepress/public");
const PNGQUANT = path.resolve(__dirname, "tools/pngquant/pngquant.exe");
const MAX_EDGE = 1600;
const MIN_BYTES = 30 * 1024; // skip tiny
const JPG_QUALITY = 78;
const LOG = path.resolve(__dirname, "compress-images.log");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function log(line) {
  fs.appendFileSync(LOG, line + "\n", "utf8");
}

async function processOne(file) {
  const ext = path.extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) return { skipped: "type" };
  const st = fs.statSync(file);
  if (st.size < MIN_BYTES) return { skipped: "tiny", before: st.size };

  const before = st.size;
  const tmpSharp = file + ".sharp-tmp" + ext;
  const tmpOut = file + ".out" + ext;

  try {
    let pipeline = sharp(file, { failOn: "none", animated: false }).rotate();
    const meta = await pipeline.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (w > MAX_EDGE || h > MAX_EDGE) {
      pipeline = pipeline.resize({
        width: w >= h ? MAX_EDGE : undefined,
        height: h > w ? MAX_EDGE : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    if (ext === ".png") {
      // intermediate PNG for pngquant (no palette yet)
      await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(tmpSharp);
      try {
        execFileSync(
          PNGQUANT,
          [
            "--force",
            "--skip-if-larger",
            "--quality=65-80",
            "--speed",
            "1",
            "--output",
            tmpOut,
            tmpSharp,
          ],
          { stdio: "pipe" }
        );
      } catch (e) {
        // pngquant exits 98/99 when skipped; fall back to sharp png
        if (fs.existsSync(tmpSharp)) {
          fs.copyFileSync(tmpSharp, tmpOut);
        } else {
          return { skipped: "pngquant-fail", before };
        }
      }
    } else {
      await pipeline.jpeg({ quality: JPG_QUALITY, mozjpeg: true }).toFile(tmpOut);
    }

    if (!fs.existsSync(tmpOut)) return { skipped: "no-out", before };
    const after = fs.statSync(tmpOut).size;
    if (after > 0 && after < before) {
      fs.copyFileSync(tmpOut, file);
      return { ok: true, before, after };
    }
    return { skipped: "not-smaller", before, after };
  } catch (e) {
    return { error: e.message, before };
  } finally {
    for (const t of [tmpSharp, tmpOut]) {
      try {
        if (fs.existsSync(t)) fs.unlinkSync(t);
      } catch {}
    }
  }
}

async function main() {
  if (!fs.existsSync(PNGQUANT)) {
    console.error("pngquant missing:", PNGQUANT);
    process.exit(1);
  }
  fs.writeFileSync(LOG, `=== start ${new Date().toISOString()} ===\n`, "utf8");
  const files = walk(ROOT).filter((f) => /\.(png|jpe?g)$/i.test(f));
  console.log("candidates:", files.length);

  let ok = 0,
    skip = 0,
    err = 0;
  let saved = 0;
  let beforeAll = 0;
  let afterAll = 0;
  const t0 = Date.now();

  // concurrency limited
  const CONCURRENCY = 4;
  let i = 0;
  async function worker() {
    while (i < files.length) {
      const idx = i++;
      const f = files[idx];
      const rel = path.relative(ROOT, f);
      const r = await processOne(f);
      if (r.ok) {
        ok++;
        saved += r.before - r.after;
        beforeAll += r.before;
        afterAll += r.after;
        if (ok % 50 === 0) {
          console.log(
            `progress ok=${ok} skip=${skip} err=${err} saved=${(saved / 1048576).toFixed(1)}MB  ${rel}`
          );
        }
        log(`OK ${rel} ${r.before}->${r.after}`);
      } else if (r.error) {
        err++;
        log(`ERR ${rel} ${r.error}`);
      } else {
        skip++;
        if (r.before) {
          beforeAll += r.before;
          afterAll += r.after || r.before;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = `done ok=${ok} skip=${skip} err=${err} savedMB=${(saved / 1048576).toFixed(2)} elapsed=${sec}s`;
  console.log(summary);
  log(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
