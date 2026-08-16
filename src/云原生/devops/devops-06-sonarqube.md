---
title: 质量门禁：把 SonarQube 接入 CI
sidebarGroup: DevOps / GitOps
shortTitle: 06 SonarQube
order: 6
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - SonarQube
  - 质量门禁
description: 质量门禁：把 SonarQube 接入 CI——扫描重复代码、漏洞与规范，不达标就阻断合并
---

> **DevOps / GitOps · 第 6/15 篇**  
> 上一篇：[《GitHub Actions》](/云原生/devops/devops-05-github-actions)  
> 下一篇预告：[《CI 对接 Harbor》](/云原生/devops/devops-07-harbor-ci)

---

## 开头：测试全绿，为什么线上还在修低级漏洞？

单元测试证明「功能路径大致对」，不证明「没有明显漏洞、重复屎山、禁用 API」。**质量门禁（Quality Gate）**在合并或发版前加一道自动裁决：重复率、覆盖率、安全热点等不达标 → 流水线失败 → 合并被挡。

**SonarQube**（及 SonarCloud）是常见实现：多语言静态分析 + 服务端存历史趋势 + 与 CI 集成。

---

## 一、是什么

| 组件 | 作用 |
|------|------|
| SonarQube Server | Web UI、规则集、Quality Gate、历史 |
| Scanner | CI 里跑的分析客户端（或 Scanner CLI / 构建插件） |
| 数据库 | 存项目与问题（生产用 PostgreSQL 等；勿用已废弃的 MySQL 方案） |

课堂笔记里的 8.9 已过时。写作时：

- **SonarQube Server LTA**：`2026.1`（Docker 可用 `2026-lta-*` 商业版 tag）  
- **Community Build**：持续发版，Docker Hub 常见 `sonarqube:community` / 带版本号 tag  

自学实验优先 **Community Build**；企业选 LTA 路线请看 [官方镜像说明](https://hub.docker.com/_/sonarqube)。

---

## 二、为什么放在 CI 里

- 本地偶尔扫 ≠ 每次 MR 强制扫  
- 趋势（新增债务、覆盖率掉点）比单次报告更有用  
- 与分支保护结合：Gate 不过不能合  

注意：静态分析**替代不了**安全测试与依赖扫描（SCA）；可并行加 Trivy / Dependabot 等。

---

## 三、怎么做：Compose 起一套（实验）

> **待本机验证**。以下为学习向最小编排，生产需持久卷、资源限制与备份。

```yaml
# docker-compose.sonar.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar
      POSTGRES_DB: sonar
    volumes:
      - sonar_pg:/var/lib/postgresql/data

  sonarqube:
    image: sonarqube:community
    depends_on: [db]
    ports:
      - "9000:9000"
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://db:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: sonar
    volumes:
      - sonar_data:/opt/sonarqube/data
      - sonar_ext:/opt/sonarqube/extensions

volumes:
  sonar_pg:
  sonar_data:
  sonar_ext:
```

Linux 宿主机常需调高：

```bash
sudo sysctl -w vm.max_map_count=524288
```

启动后浏览器打开 `http://<host>:9000`，默认账号按当前镜像文档（常见首次为 `admin`，强制改密）。在 UI 创建项目，生成 **Project Key** 与 **Token**。

---

## 四、接入 CI（概念步骤）

1. CI 密钥中存 `SONAR_TOKEN`、`SONAR_HOST_URL`  
2. 在 `test` 之后、`push image` 之前增加分析步骤  
3. 使用对应语言的 Scanner 或 Maven/Gradle 插件  
4. Quality Gate 失败则 `exit 1`（官方有 wait-for-quality-gate 类机制）

**GitHub Actions 示意：**

```yaml
- name: Sonar scan
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
  run: |
    # 按语言选用官方 Scanner 文档中的命令
    echo "run sonar-scanner or mvn sonar:sonar here"
```

**Jenkins**：凭据绑定 Token，Pipeline `stage('Sonar')` 中调用同样命令；可配合 SonarQube Scanner 插件展示结果。

---

## 五、背景知识

1. **首次全量 vs PR 增量**：分支分析 / PR 装饰需要 DevOps 平台与 Sonar 版本支持，按官方「PR 分析」文档开  
2. **不要扫依赖源码目录的噪声**：合理设 `sonar.exclusions`  
3. **Gate 要可执行**：一开始全挡会烂尾；先挡新增 blocker/漏洞，再收紧  

---

## 小结

- SonarQube 让「质量」变成可自动化的门禁，而不是发版前的人工感觉  
- 版本用当前 Community / LTA，弃用笔记里的 8.9 + MySQL 叙事  
- 门禁通过后再推镜像，避免带已知问题的制品流入 Harbor  

下一篇：CI 如何 **登录并推送 Harbor**，以及和 Docker 专栏安装文的分工。
