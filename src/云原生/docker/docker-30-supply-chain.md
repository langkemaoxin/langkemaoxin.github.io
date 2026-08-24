---
title: 镜像供应链安全——从随手 pull 滚到扫描、签名与加固镜像
sidebarGroup: Docker 系列
shortTitle: 30 供应链安全
order: 30
date: 2026-08-24T00:00:00.000Z
category: 云原生
tag:
  - Docker
  - 云原生
  - Docker系列
  - 安全
  - 供应链
description: 镜像信任三档（Official Images/VP/Hardened Images）、Scout 漏洞治理、digest 固定、SBOM 与 provenance attestations、cosign 签名验证（29.x 已移除 DCT）——2026 企业刚需的镜像准入流水线。对应学习总纲阶段 8 单元 8.2。
---

> **Docker 系列 · 第 30/33 篇**
> 上一篇：[《Swarm 多机编排——从一台 docker run 滚到一个小集群》](/云原生/docker/docker-29-swarm) · 下一篇：[《Engine API 与插件——用 curl 也能创建容器》](/云原生/docker/docker-31-engine-api)

---

> 🚧 **本文撰写中（占位文件）**
> 本篇是[学习总纲](./docker-00-roadmap.md)阶段 8（深水区与毕业）的缺口篇目，编号已排入学习路线；正文按下述大纲撰写。**本篇不阻塞主线**——第 11 篇的 attestations 认脸是唯一前置。

## 这一篇要解决什么问题

你的 `FROM ubuntu:22.04` 里有多少个 CVE？那个 `docker pull someblog/tutorial-api` 的作者你认识吗？它被替换过吗？——**随手 pull 一个镜像就跑，等于在服务器上执行陌生人的代码**。2026 年的企业合规（等保/SBOM 要求）已经把「镜像从哪来、能不能证明没被改过」变成上线检查项。这一篇把「镜像的来源与安全」从口头功夫变成可执行的准入流水线。

版本背景（撰写前已核验）：**29.0 起 Docker Content Trust 已从 CLI 移除**——老教程里的 `DOCKER_CONTENT_TRUST=1` 方案已经退役，现行方向是 cosign 签名 + attestations。

## 计划覆盖的知识单元（西蒙学习法拆解）

| 单元 | 回答的核心问题 | 动手实验（撰写时必须真跑） | 吃透的标准 |
|------|----------------|--------------------------|------------|
| 30.1 信任三档 | Hub 上的镜像分几等？ | 对照 Docker Official Images / Docker-Sponsored OSS / Verified Publisher 三档的审核机制 | 给「基础镜像怎么选」立规矩：优先三档内、固定 digest |
| 30.2 digest 固定 | `:latest` 换了内容你知道吗？ | 同 tag 前后 pull 对比 digest；`ubuntu@sha256:...` 固定后重拉验证不变 | 说清 tag（可变指针）与 digest（内容寻址）的本质区别 |
| 30.3 Scout 漏洞治理 | 镜像里的 CVE 怎么发现、怎么治理？ | `docker scout cves` 扫自有镜像；读懂漏洞等级与修复路径；CI 集成认脸 | 能定一条「高危不进生产」的门禁规则并说清误报处理（VEX 认脸） |
| 30.4 attestations 深挖 | 镜像的「出生证明」长什么样？ | 构建带 SBOM + provenance 的镜像；`docker buildx imagetools inspect --format json` 读出 SLSA 字段 | 说清 SBOM（成分表）与 provenance（构建过程证明）各证明什么 |
| 30.5 签名与验证 | 怎么证明镜像没被中间人换过？ | cosign 对镜像签名 + 验证一条龙（第 11 篇已铺 attestations，这里补签名链）；Hardened Images 的代码签名认脸 | 说清「签名保真、attestation 保证明、扫描保成分」三件套分工 |
| 30.6 准入流水线 | 企业镜像准入怎么落地？ | 把以上串成流水线：构建（带证明）→ 扫描（门禁）→ 签名 → 私仓（第 12 篇 Harbor）→ 运行时验证 | 产出一份可照抄的《镜像准入 checklist》 |

## 与前后篇的关系

- 前置：第 11 篇构建元数据（attestations 认脸）、第 12 篇 Harbor（私仓落点）、第 25 篇容器安全（运行时侧）；
- 分工：第 25 篇管「跑起来之后锁权限」，本篇管「进来之前查出身」。

## 官方资料锚点（撰写时以此为准，注意核验版本）

- [Supply chain security 手册](https://docs.docker.com/manuals/)——Hub / Scout / Hardened Images 三大板块（核验于 2026-08-24）
- [Engine 29 发行注记](https://docs.docker.com/engine/release-notes/29/)——DCT 从 CLI 移除的出处
- [SLSA 定义](https://docs.docker.com/build/metadata/attestations/)——provenance 等级说明
