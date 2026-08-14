/**
 * Improve awkward machine translations with a curated phrase map.
 * Rewrites slug field in slug-translations.json (keeps en raw).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("scripts/mianshi-rename");
const CACHE = path.join(ROOT, "slug-translations.json");
const data = JSON.parse(fs.readFileSync(CACHE, "utf8"));

const MAX_SLUG = 60;

/** Longer phrases first */
const PHRASES = [
  ["八股文", "classic-interview-qa"],
  ["八股", "classic-interview-qa"],
  ["突击流程", "crash-prep-flow"],
  ["面试官识人手册", "interviewer-hiring-handbook"],
  ["面试突击", "interview-crash-prep"],
  ["亮点与难点", "highlights"],
  ["亮点与痛点", "highlights"],
  ["简历模板", "resume-template"],
  ["应届生", "fresh-grad"],
  ["年薪百万", "million-salary"],
  ["分布式事务", "distributed-transaction"],
  ["本地消息表", "local-message-table"],
  ["延时任务", "delayed-task"],
  ["并发编排", "concurrent-orchestration"],
  ["并发限流", "concurrency-rate-limit"],
  ["长事务", "long-transaction"],
  ["数据收集积压", "data-backlog"],
  ["索引失效", "index-invalidation"],
  ["高可用", "high-availability"],
  ["高并发", "high-concurrency"],
  ["线程池", "thread-pool"],
  ["线程安全", "thread-safety"],
  ["垃圾回收", "garbage-collection"],
  ["类加载", "classloading"],
  ["双亲委派", "parent-delegation"],
  ["内存模型", "memory-model"],
  ["分库分表", "sharding"],
  ["读写分离", "read-write-split"],
  ["主从复制", "master-slave-replication"],
  ["一致性哈希", "consistent-hashing"],
  ["负载均衡", "load-balancing"],
  ["服务熔断", "circuit-breaker"],
  ["服务降级", "service-degradation"],
  ["限流", "rate-limiting"],
  ["缓存穿透", "cache-penetration"],
  ["缓存击穿", "cache-breakdown"],
  ["缓存雪崩", "cache-avalanche"],
  ["消息丢失", "message-loss"],
  ["消息积压", "message-backlog"],
  ["重复消费", "duplicate-consumption"],
  ["顺序消费", "ordered-consumption"],
  ["死信队列", "dead-letter-queue"],
  ["事务消息", "transactional-message"],
  ["延迟队列", "delay-queue"],
  ["脑裂", "split-brain"],
  ["选举", "election"],
  ["心跳", "heartbeat"],
  ["红黑树", "red-black-tree"],
  ["哈希表", "hash-table"],
  ["链表", "linked-list"],
  ["二叉树", "binary-tree"],
  ["平衡树", "balanced-tree"],
  ["跳表", "skip-list"],
  ["布隆过滤器", "bloom-filter"],
  ["悲观锁", "pessimistic-lock"],
  ["乐观锁", "optimistic-lock"],
  ["死锁", "deadlock"],
  ["活锁", "livelock"],
  ["饥饿", "starvation"],
  ["可见性", "visibility"],
  ["原子性", "atomicity"],
  ["有序性", "ordering"],
  ["可重入", "reentrant"],
  ["公平锁", "fair-lock"],
  ["非公平锁", "unfair-lock"],
  ["自旋锁", "spinlock"],
  ["偏向锁", "biased-lock"],
  ["轻量级锁", "lightweight-lock"],
  ["重量级锁", "heavyweight-lock"],
  ["对象头", "object-header"],
  ["逃逸分析", "escape-analysis"],
  ["栈上分配", "stack-allocation"],
  ["标量替换", "scalar-replacement"],
  ["元空间", "metaspace"],
  ["方法区", "method-area"],
  ["堆内存", "heap-memory"],
  ["直接内存", "direct-memory"],
  ["年轻代", "young-gen"],
  ["老年代", "old-gen"],
  ["新生代", "young-gen"],
  ["全表扫描", "full-table-scan"],
  ["覆盖索引", "covering-index"],
  ["最左前缀", "leftmost-prefix"],
  ["回表", "table-lookup"],
  ["聚簇索引", "clustered-index"],
  ["非聚簇索引", "secondary-index"],
  ["事务隔离级别", "isolation-level"],
  ["脏读", "dirty-read"],
  ["幻读", "phantom-read"],
  ["不可重复读", "non-repeatable-read"],
  ["MVCC", "mvcc"],
  ["Undo Log", "undo-log"],
  ["Redo Log", "redo-log"],
  ["Binlog", "binlog"],
  ["两阶段提交", "two-phase-commit"],
  ["三阶段提交", "three-phase-commit"],
  ["最终一致性", "eventual-consistency"],
  ["强一致性", "strong-consistency"],
  ["CAP理论", "cap-theorem"],
  ["BASE理论", "base-theory"],
  ["微服务", "microservice"],
  ["网关", "gateway"],
  ["注册中心", "registry"],
  ["配置中心", "config-center"],
  ["链路追踪", "tracing"],
  ["服务发现", "service-discovery"],
  ["熔断降级", "circuit-breaker-degradation"],
  ["什么是", "what-is-"],
  ["怎么样", "how-"],
  ["如何实现", "how-to-impl-"],
  ["如何保证", "how-to-ensure-"],
  ["如何解决", "how-to-solve-"],
  ["如何理解", "understanding-"],
  ["如何", "how-to-"],
  ["为什么", "why-"],
  ["区别", "diff"],
  ["对比", "compare"],
  ["原理", "principles"],
  ["底层", "internals"],
  ["源码", "source"],
  ["实战", "hands-on"],
  ["详解", "explained"],
  ["面试题", "interview"],
  ["面试", "interview"],
  ["总结", "summary"],
  ["概述", "overview"],
  ["入门", "intro"],
  ["进阶", "advanced"],
  ["高级", "advanced"],
  ["基础", "basics"],
  ["常见问题", "faq"],
  ["注意事项", "notes"],
  ["最佳实践", "best-practices"],
  ["性能优化", "perf-tuning"],
  ["优化", "optimization"],
  ["排查", "troubleshoot"],
  ["调优", "tuning"],
  ["监控", "monitoring"],
  ["部署", "deploy"],
  ["安装", "install"],
  ["配置", "config"],
  ["使用", "usage"],
  ["场景", "scenarios"],
  ["方案", "solution"],
  ["设计", "design"],
  ["架构", "architecture"],
  ["机制", "mechanism"],
  ["流程", "flow"],
  ["模型", "model"],
  ["策略", "strategy"],
  ["算法", "algorithm"],
  ["数据结构", "data-structure"],
  ["多线程", "multithreading"],
  ["并发", "concurrency"],
  ["同步", "sync"],
  ["异步", "async"],
  ["阻塞", "blocking"],
  ["非阻塞", "non-blocking"],
  ["序列化", "serialization"],
  ["反序列化", "deserialization"],
  ["反射", "reflection"],
  ["注解", "annotation"],
  ["泛型", "generics"],
  ["集合", "collections"],
  ["异常", "exception"],
  ["类加载器", "classloader"],
  ["类加载", "classloading"],
  ["垃圾收集器", "gc"],
  ["垃圾回收", "gc"],
  ["短视频", "short-video"],
  ["未命名", "untitled"],
];

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

function dictSlug(title, order) {
  let t = stripEmoji(title);
  if (t === "短视频" || /^短视频\b/.test(t)) return `short-video-${order}`;
  if (/^未命名/.test(t) || /无标题/i.test(t)) return `untitled-${order}`;

  // Keep latin tokens, replace chinese phrases
  let work = t;
  const kept = [];
  for (const [zh, en] of PHRASES) {
    if (work.includes(zh)) {
      work = work.split(zh).join(` ${en} `);
    }
  }
  // remaining CJK → drop (already translated via API slug); we merge with API
  const hasCjk = /[\u4e00-\u9fff]/.test(work);
  if (hasCjk) return null; // not fully covered
  let slug = truncateSlug(toKebab(work));
  if (!slug || slug.length < 3) return null;
  return slug;
}

/** Fix known bad English fragments in API slugs */
function polishApiSlug(slug) {
  return slug
    .replace(/eight-strands?/g, "classic-interview-qa")
    .replace(/eight-strings?/g, "classic-interview-qa")
    .replace(/bagu-wen/g, "classic-interview-qa")
    .replace(/assault-procedure/g, "crash-prep-flow")
    .replace(/interview-for-a-raid/g, "interview-crash-prep")
    .replace(/r-sum-s/g, "resume")
    .replace(/rsums?/g, "resume")
    .replace(/knowledgable-handbook/g, "hiring-handbook")
    .replace(/knowledgeable-handbook/g, "hiring-handbook")
    .replace(/new-student-resume/g, "fresh-grad-resume")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let improved = 0;
for (const [key, row] of Object.entries(data)) {
  if (row.slug?.startsWith("short-video-") || row.slug?.startsWith("untitled-")) continue;
  const fromDict = dictSlug(row.title, row.order);
  let next = polishApiSlug(row.slug || "");
  // Prefer dictionary when it fully covers and is reasonably long
  if (fromDict && fromDict.split("-").length >= 2) {
    // blend: if dict slug is shorter & cleaner, use it
    if (fromDict.length <= next.length || /classic-interview-qa|crash-prep|highlights|resume-template/.test(fromDict)) {
      // use dict if it looks complete
      if (!/[\u4e00-\u9fff]/.test(row.title) || fromDict.length >= 8) {
        // only override when dict coverage is good: original title chinese mostly replaced
        const t = stripEmoji(row.title);
        let covered = t;
        for (const [zh] of PHRASES) covered = covered.split(zh).join("");
        covered = covered.replace(/[A-Za-z0-9+.#\-\s()（）【】\[\]?？!！,，.。:：、/]/g, "");
        if (covered.length <= 2) next = fromDict;
      }
    }
  }
  next = truncateSlug(next);
  if (next && next !== row.slug) {
    row.slug = next;
    improved++;
  } else if (next) {
    row.slug = next;
  }
}

fs.writeFileSync(CACHE, JSON.stringify(data, null, 2), "utf8");
console.log(`postprocess improved=${improved} total=${Object.keys(data).length}`);
for (const k of ["1", "2", "3", "5", "6", "7", "15"]) {
  const r = data[k];
  if (r) console.log(k, r.slug, "|", r.title);
}
