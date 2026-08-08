import Ai from "./sidebar/Ai.mjs";
import BigData from "./sidebar/BigData.mjs";
import DotNet from "./sidebar/DotNet.mjs";
import Java from "./sidebar/Java.mjs";
import Windows from "./sidebar/Windows.mjs";
import Tools from "./sidebar/Tools.mjs";
import English from "./sidebar/English.mjs";
import Notes from "./sidebar/Notes.mjs";
import CloudNative from "./sidebar/云原生.mjs";
import Middleware from "./sidebar/中间件.mjs";
import Concurrency from "./sidebar/并发编程.mjs";
import SoftwareArch from "./sidebar/软件架构.mjs";
import PerfTune from "./sidebar/性能调优.mjs";
import Database from "./sidebar/数据库.mjs";

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
  { path: "/云原生/", dir: "云原生" },
  { path: "/中间件/", dir: "中间件" },
  { path: "/并发编程/", dir: "并发编程" },
  { path: "/软件架构/", dir: "软件架构" },
  { path: "/性能调优/", dir: "性能调优" },
  { path: "/数据库/", dir: "数据库" },
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
  ...prefix("云原生", CloudNative),
  ...prefix("中间件", Middleware),
  ...prefix("并发编程", Concurrency),
  ...prefix("软件架构", SoftwareArch),
  ...prefix("性能调优", PerfTune),
  ...prefix("数据库", Database),
};

/** 未单独配置 icon 时的默认图标 */
export const defaultFolderIcon = "folder";
