---
title: "线程池参数动态化实践"
sidebarGroup: "线程池"
shortTitle: "03 参数动态化"
order: 3
date: 2026-11-27
category: "并发编程"
tag:
  - "并发编程"
  - "线程池"
---

> **线程池 · 第 3/4 篇**  
> 上一篇：[《线程池拒绝策略与常见故障》](/并发编程/pool/juc-20-reject-pitfalls) · 下一篇：[《ForkJoinPool 分治与工作窃取》](/并发编程/pool/juc-22-forkjoin)

---

## 开头：大促前要不要重启调线程池

商品详情页要并行拉价格、库存、优惠、图片——追求**响应时间**，希望线程够多、尽量不排队。离线报表要扫全国门店——追求**吞吐量**，用队列缓冲、控制线程数避免上下文切换。两类场景参数完全不同，而线程池参数一旦写死在配置文件里，流量模型变了只能改配置重启——大促前这往往不可接受。

![线程池业务场景对比](/并发编程/pool/13b/p01-01.png)

---

## 一、两类典型场景

| 场景 | 目标 | 参数倾向 |
|------|------|----------|
| **快速响应用户** | 页面聚合、低延迟 | 高 core/max，**SynchronousQueue** 或短队列，尽快并行 |
| **快速处理批量** | 离线统计、高吞吐 | 适中 core，**有界队列** 削峰，避免线程过多 |

![响应优先 vs 吞吐优先](/并发编程/pool/13b/p02-01.png)

核心难题：IO 密集与 CPU 密集差异大，没有放之四海而皆准的数字，配错了就是拒绝风暴或队列堆积（见上一篇两个 Case）。

![配置不合理引发故障](/并发编程/pool/13b/p03-01.png)

![Case 拒绝降级与队列超时示意](/并发编程/pool/13b/p03-02.png)

---

## 二、JDK 原生支持运行时调参

`ThreadPoolExecutor` 提供 public setter：

- `setCorePoolSize(int)`
- `setMaximumPoolSize(int)`
- `setKeepAliveTime` / `allowCoreThreadTimeOut` 等

![ThreadPoolExecutor 可调整参数](/并发编程/pool/13b/p04-01.png)

**setCorePoolSize 行为**：

- 新值 **小于** 当前 worker 数 → 向 idle worker 发中断，多余线程下次 idle 时回收
- 新值 **大于** 原值且队列有待执行任务 → 创建新 worker 消费队列

![setCorePoolSize 流程](/并发编程/pool/13b/p04-02.png)

最核心三个参数：**corePoolSize、maximumPoolSize、workQueue**。实践上提供两种队列选择即可覆盖多数业务：同步队列（响应优先）与有界队列（吞吐优先）。

---

## 三、手写动态线程池

```java
public class DynamicThreadPool {
    private final ThreadPoolExecutor executor;

    public DynamicThreadPool(int core, int max, long keepAlive,
            TimeUnit unit, BlockingQueue<Runnable> queue) {
        this.executor = new ThreadPoolExecutor(core, max, keepAlive, unit, queue);
    }

    public void adjustThreadPool(int newCore, int newMax) {
        executor.setCorePoolSize(newCore);
        executor.setMaximumPoolSize(newMax);
    }

    public void submitTask(Runnable task) {
        executor.execute(task);
    }
}
```

![DynamicThreadPool 示例代码](/并发编程/pool/13b/p05-01.png)

运行中调用 `adjustThreadPool(5, 8)` 即可在不重启 JVM 的情况下缩容；多余 worker 会在任务间隙被回收。

---

## 四、基于 Nacos 配置中心

思路：Bean 初始化时注册 Nacos `Listener`，配置变更时解析 YAML/JSON，调用 setter 更新线程池。

核心流程：

1. `@Value` 或配置中心读取初始 core/max/queue
2. 创建 `ThreadPoolTaskExecutor` 并 `initialize()`
3. `addListener("threadPool.yml", ...)` 在 `receiveConfigInfo` 里解析并 `setCorePoolSize` / `setMaxPoolSize`

```java
// 伪代码示意
configService.addListener("threadPool.yml", group, new Listener() {
    @Override
    public void receiveConfigInfo(String configInfo) {
        ThreadPoolConfig cfg = parseYaml(configInfo);
        executor.setCorePoolSize(cfg.getCorePoolSize());
        executor.setMaximumPoolSize(cfg.getMaxPoolSize());
    }
    @Override
    public Executor getExecutor() { return null; }
});
```

运维在 Nacos 控制台改 `threadPool.corePoolSize`，应用秒级生效，无需发版重启。

---

## 五、DynamicTp 开源方案

[DynamicTp](https://dynamictp.cn/) 是基于配置中心的轻量级动态线程池框架，提供：

- 动态调参
- 告警通知
- 运行监控
- 三方线程池统一管理

![DynamicTp 介绍](/并发编程/pool/13b/p11-01.png)

适合微服务集群统一治理线程池，避免每个项目重复写 Nacos Listener。

---

## 小结

- 响应优先：高并行 + 同步/短队列；吞吐优先：有界队列 + 适中线程
- JDK 原生 setter 支持热更新 core/max
- 生产可结合 Nacos 或 DynamicTp 实现可观测、可告警的动态线程池
- 下一篇：**ForkJoinPool**——分治任务与工作窃取
