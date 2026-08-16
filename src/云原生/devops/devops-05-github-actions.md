---
title: GitHub Actions 流水线——用 workflow 把 PR 变成制品
sidebarGroup: DevOps / GitOps
shortTitle: 05 GitHub Actions
order: 5
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - GitHub Actions
  - CI
description: GitHub Actions 流水线——用 workflow 把 PR 变成制品，对照 Jenkins 的同一套 CI 骨架
---

> **DevOps / GitOps · 第 5/15 篇**  
> 上一篇：[《Jenkins 流水线》](/云原生/devops/devops-04-jenkins-pipeline)  
> 下一篇预告：[《质量门禁：SonarQube》](/云原生/devops/devops-06-sonarqube)

---

## 开头：代码已经在 GitHub，为什么还要自建 Jenkins？

若源码托管在 GitHub，**GitHub Actions** 把 CI 配成仓库里的 YAML，和 PR 检查、环境保护规则绑在一起，免去自建 Controller。代价是：私有化/完全离线场景受限，分钟数与自托管 Runner 要规划。

本篇用与第 4 篇相同的骨架：测 → 构建镜像 → 推仓库。对接 Argo CD 见第 13 篇。

---

## 一、是什么

| 概念 | 含义 |
|------|------|
| Workflow | `.github/workflows/*.yml` 描述的自动化 |
| Job | 一组步骤，默认可并行 |
| Step | 跑 shell 或复用 **Action** |
| Runner | GitHub 托管或自托管执行机 |
| Secret | 仓库/组织级密钥，注入为环境变量 |

触发器常见：`push`、`pull_request`、`workflow_dispatch`、`release`。

---

## 二、为什么选 Actions

- PR 上直接看 check 是否通过，和分支保护一体  
- 生态 Action 多（setup-go、docker/build-push-action 等）  
- 小团队零运维成本起步快  

需要完全内网或复杂审批矩阵时，回头看 Jenkins / GitLab。

---

## 三、怎么做：最小 workflow

> **待本机验证**。下列示例推送到 GHCR；推 Harbor 时改 `registry` 与登录方式即可（第 7 篇）。

```yaml
# .github/workflows/ci.yml
name: ci

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Unit test
        run: echo "run unit tests here"
        # 例：uses: actions/setup-go@v5 + run: go test ./...

  build-and-push:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

要点：

1. **PR 只测不推**（用 `if` 限制 push 到 `main` 才推镜像），避免每个 PR 污染仓库  
2. tag 用 **commit SHA**，便于 GitOps 钉死版本  
3. `latest` 可选；生产更建议只用 SHA 或 semver  

### 推到 Harbor

在仓库 Secrets 增加 `HARBOR_USER` / `HARBOR_PASSWORD`（或 Robot 账号），`docker/login-action` 的 `registry` 改为 `harbor.example.com`。勿把密码写进 YAML。

---

## 四、背景知识

1. **GITHUB_TOKEN** 权限默认收紧，推 GHCR 需 `packages: write`  
2. **自托管 Runner**：内网构建、访问私有 Harbor 时常用；注意 Runner 主机安全等同生产跳板  
3. **Reusable workflows / Composite actions**：多仓复用时再抽，避免过早抽象  
4. **与 GitOps**：本 job 结束后应更新部署仓镜像字段——第 13 篇  

---

## 小结

- Actions = 仓库内 workflow + Runner；骨架与 Jenkins 一致  
- PR 测、主干推镜像，是较稳妥的默认策略  
- 下一篇把 **SonarQube** 接进质量门禁，让「绿灯」包含代码质量与漏洞扫描  

官方文档：[GitHub Actions 文档](https://docs.github.com/en/actions)。
