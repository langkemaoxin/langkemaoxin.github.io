import Ai from "./sidebar/Ai.mjs";
import BigData from "./sidebar/BigData.mjs";
import DotNet from "./sidebar/DotNet.mjs";
import Java from "./sidebar/Java.mjs";
import Windows from "./sidebar/Windows.mjs";
import Tools from "./sidebar/Tools.mjs";
import English from "./sidebar/English.mjs";
import Notes from "./sidebar/Notes.mjs";

/**
 * @typedef {{ title?: string, icon?: string, order?: number }} FolderMeta
 * @typedef {{ path: string, dir: string }} SidebarModuleConfig
 */

/** 大模块列表（顶层目录） */
/** @type {SidebarModuleConfig[]} */
export const modules = [
  { path: "/Ai/", dir: "Ai" },
  { path: "/BigData/", dir: "BigData" },
  { path: "/DotNet/", dir: "DotNet" },
  { path: "/Java/", dir: "Java" },
  { path: "/Windows/", dir: "Windows" },
  { path: "/Tools/", dir: "Tools" },
  { path: "/English/", dir: "English" },
  { path: "/Notes/", dir: "Notes" },
];

/**
 * @param {string} moduleDir
 * @param {Record<string, FolderMeta>} localFolders
 * @returns {Record<string, FolderMeta>}
 */
function prefix(moduleDir, localFolders) {
  /** @type {Record<string, FolderMeta>} */
  const out = {};
  for (const [folder, meta] of Object.entries(localFolders)) {
    out[`${moduleDir}/${folder}`] = meta;
  }
  return out;
}

/**
 * 汇总各模块 folders 配置
 * key = `${模块目录}/${子文件夹}`
 *
 * @type {Record<string, FolderMeta>}
 */
export const folders = {
  ...prefix("Ai", Ai),
  ...prefix("BigData", BigData),
  ...prefix("DotNet", DotNet),
  ...prefix("Java", Java),
  ...prefix("Windows", Windows),
  ...prefix("Tools", Tools),
  ...prefix("English", English),
  ...prefix("Notes", Notes),
};

/** 未单独配置 icon 时的默认图标 */
export const defaultFolderIcon = "folder";
