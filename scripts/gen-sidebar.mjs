import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  modules,
  folders,
  defaultFolderIcon,
} from "./sidebar.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcRoot = path.join(root, "src");
const sidebarOut = path.join(srcRoot, ".vuepress", "sidebar.ts");

/**
 * @param {string} text
 * @returns {{ fm: string, body: string } | null}
 */
function splitFrontmatter(text) {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n") && !normalized.startsWith("---\r\n")) {
    return null;
  }
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return {
    fm: match[1],
    body: normalized.slice(match[0].length),
  };
}

/**
 * @param {string} fm
 * @returns {Record<string, string>}
 */
function parseSimpleFrontmatter(fm) {
  /** @type {Record<string, string>} */
  const data = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[m[1]] = value;
  }
  return data;
}

/**
 * @param {string} fileName
 */
function toSidebarId(fileName) {
  return fileName.replace(/\.md$/i, "");
}

/**
 * @param {number | undefined} order
 */
function sortKey(order) {
  if (order === undefined || Number.isNaN(order)) return Number.POSITIVE_INFINITY;
  return order;
}

/**
 * @param {string} folderName
 * @param {string[]} sidebarGroups
 * @param {string} configKey
 */
function resolveGroupTitle(folderName, sidebarGroups, configKey) {
  const meta = folders[configKey];
  if (meta?.title) return meta.title;

  const counts = new Map();
  for (const g of sidebarGroups) {
    if (!g) continue;
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  if (counts.size === 1) return [...counts.keys()][0];
  if (counts.size > 1) {
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    console.warn(
      `[warn] mixed sidebarGroup in ${configKey}, using majority "${best}"`,
    );
    return best;
  }
  return folderName;
}

/**
 * 读取目录内 md（不含 README），按 order 排序
 * @param {string} dirPath
 * @param {string} configKey
 * @returns {{ id: string, order: number, sidebarGroup?: string }[]}
 */
function readMarkdownItems(dirPath, configKey) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs
    .readdirSync(dirPath)
    .filter((name) => name.endsWith(".md") && name.toLowerCase() !== "readme.md");

  /** @type {{ id: string, order: number, sidebarGroup?: string }[]} */
  const items = [];
  for (const fileName of files) {
    const filePath = path.join(dirPath, fileName);
    if (!fs.statSync(filePath).isFile()) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    const split = splitFrontmatter(raw);
    if (!split) {
      console.warn(`[warn] no frontmatter: ${configKey}/${fileName}`);
      continue;
    }
    const data = parseSimpleFrontmatter(split.fm);
    const order = data.order !== undefined ? Number(data.order) : undefined;
    items.push({
      id: toSidebarId(fileName),
      order: sortKey(order),
      sidebarGroup: data.sidebarGroup,
    });
  }
  items.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, "zh"));
  return items;
}

/**
 * 构建一层分组：可含根级 md + 嵌套子文件夹（再作一级 collapsible）
 * @param {string} groupDir
 * @param {string} folder
 * @param {string} moduleDir
 */
function buildGroupEntry(groupDir, folder, moduleDir) {
  const configKey = `${moduleDir}/${folder}`;
  const rootItems = readMarkdownItems(groupDir, configKey);
  const nestedDirs = fs
    .readdirSync(groupDir)
    .filter((name) => {
      if (name.startsWith(".")) return false;
      return fs.statSync(path.join(groupDir, name)).isDirectory();
    });

  /** @type {(string | object)[]} */
  const children = [];

  for (const item of rootItems) {
    children.push(item.id);
  }

  /** @type {{ name: string, order: number, entry: object }[]} */
  const nested = [];
  for (const nestName of nestedDirs) {
    const nestDir = path.join(groupDir, nestName);
    const nestKey = `${configKey}/${nestName}`;
    const nestItems = readMarkdownItems(nestDir, nestKey);
    if (nestItems.length === 0) continue;

    const groupsInFiles = nestItems
      .map((i) => i.sidebarGroup)
      .filter(Boolean);
    const title = resolveGroupTitle(nestName, groupsInFiles, nestKey);
    const nestMeta = folders[nestKey] || {};
    const icon = nestMeta.icon || defaultFolderIcon;

    nested.push({
      name: nestName,
      order: sortKey(nestMeta.order),
      entry: {
        text: title,
        icon,
        prefix: `${nestName}/`,
        collapsible: true,
        children: nestItems.map((i) => i.id),
      },
    });
  }

  nested.sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh"),
  );
  for (const n of nested) {
    children.push(n.entry);
  }

  if (children.length === 0) return null;

  const groupsInRoot = rootItems.map((i) => i.sidebarGroup).filter(Boolean);
  const title = resolveGroupTitle(folder, groupsInRoot, configKey);
  const meta = folders[configKey] || {};
  const icon = meta.icon || defaultFolderIcon;

  return {
    folder,
    order: sortKey(meta.order),
    entry: {
      text: title,
      icon,
      prefix: `${folder}/`,
      collapsible: true,
      children,
    },
  };
}

/**
 * @param {{ path: string, dir: string }} mod
 */
function collectModuleSidebar(mod) {
  const dirPath = path.join(srcRoot, mod.dir);
  if (!fs.existsSync(dirPath)) {
    console.warn(`[warn] missing module dir: ${mod.dir}`);
    return [""];
  }

  for (const name of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, name);
    if (
      fs.statSync(full).isFile() &&
      name.endsWith(".md") &&
      name.toLowerCase() !== "readme.md"
    ) {
      console.warn(
        `[warn] article at module root (move into a group folder): ${mod.dir}/${name}`,
      );
    }
  }

  const subdirs = fs.readdirSync(dirPath).filter((name) => {
    if (name.startsWith(".")) return false;
    return fs.statSync(path.join(dirPath, name)).isDirectory();
  });

  /** @type {{ folder: string, order: number, entry: object }[]} */
  const groups = [];

  for (const folder of subdirs) {
    const groupDir = path.join(dirPath, folder);
    const built = buildGroupEntry(groupDir, folder, mod.dir);
    if (built) groups.push(built);
  }

  groups.sort(
    (a, b) => a.order - b.order || a.folder.localeCompare(b.folder, "zh"),
  );

  return ["", ...groups.map((g) => g.entry)];
}

/**
 * @param {unknown} value
 * @param {number} indent
 */
function stringifyTs(value, indent = 2) {
  const pad = " ".repeat(indent);
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const lines = value.map((item) => `${pad}${stringifyTs(item, indent + 2)},`);
    return `[\n${lines.join("\n")}\n${" ".repeat(indent - 2)}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    const lines = entries.map(
      ([k, v]) => `${pad}${k}: ${stringifyTs(v, indent + 2)},`,
    );
    return `{\n${lines.join("\n")}\n${" ".repeat(indent - 2)}}`;
  }
  return String(value);
}

function generateSidebar() {
  /** @type {Record<string, object>} */
  const sidebarMap = {};
  for (const mod of modules) {
    sidebarMap[mod.path] = collectModuleSidebar(mod);
  }

  // 博客衍生页无侧栏，避免 /tag/xxx missing sidebar config 警告
  for (const p of ["/tag/", "/category/", "/article/", "/star/", "/timeline/"]) {
    sidebarMap[p] = false;
  }

  const body = Object.entries(sidebarMap)
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${stringifyTs(value, 4)},`)
    .join("\n");

  const content = `import { sidebar } from "vuepress-theme-hope";

// 由 scripts/gen-sidebar.mjs 自动生成，请勿手改。
// 新增分类：直接建子文件夹；权限书稿可在分类下再建卷目录（二级侧栏）。
// 新增文章：放入对应文件夹并写 shortTitle / order / sidebarGroup
// icon / 显示名 / 分类顺序可在 scripts/sidebar/<模块>.mjs 里覆盖
// 然后运行：pnpm sidebar:gen
export default sidebar({
${body}
});
`;

  fs.writeFileSync(sidebarOut, content, "utf8");
  console.log(`[gen] wrote ${path.relative(root, sidebarOut)}`);
}

generateSidebar();
