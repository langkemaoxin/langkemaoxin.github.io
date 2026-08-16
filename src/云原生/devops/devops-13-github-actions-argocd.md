---
title: GitHub Actions × Argo CD——端到端发布
sidebarGroup: DevOps / GitOps
shortTitle: 13 GitHub Actions × Argo CD
order: 13
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - GitHub Actions
  - Argo CD
description: GitHub Actions × Argo CD——在 workflow 中推镜像并提交部署仓，交由 Argo CD 同步
---

> **DevOps / GitOps · 第 13/15 篇**  
> 上一篇：[《GitLab CI × Argo CD》](/云原生/devops/devops-12-gitlab-ci-argocd)  
> 下一篇预告：[《Jenkins × Argo CD》](/云原生/devops/devops-14-jenkins-argocd)

---

## 开头：同一套 GitOps，换引擎怎么写？

逻辑与第 12 篇完全相同，只是把 `.gitlab-ci.yml` 换成 **GitHub Actions workflow**。适合源码在 GitHub、部署仓也在 GitHub（或 Actions 能推的 Git 主机）的团队。

> **待本机验证**

---

## 一、权限准备

| Secret / 权限 | 用途 |
|---------------|------|
| `HARBOR_USER` / `HARBOR_PASSWORD` | 推私有 Harbor；若用 GHCR 可用 `GITHUB_TOKEN` |
| `DEPLOY_PAT` 或 Deploy Key | 写部署仓（跨仓时经典用 PAT） |
| `contents: write`（同仓部署目录时） | 少见：应用与清单同仓 |

推荐：**应用仓**与**部署仓**分离；Actions 用 fine-grained PAT 或 GitHub App 只授部署仓 `contents: write`。

Argo CD 侧 Application 的 `repoURL` 指向部署仓。

---

## 二、workflow 示例

```yaml
# app-repo/.github/workflows/release.yml
name: release

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "run tests"

  build-push:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      short_sha: ${{ steps.meta.outputs.short }}
    steps:
      - uses: actions/checkout@v4
      - id: meta
        run: echo "short=${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"

      - uses: docker/login-action@v3
        with:
          registry: harbor.example.com
          username: ${{ secrets.HARBOR_USER }}
          password: ${{ secrets.HARBOR_PASSWORD }}

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: harbor.example.com/demo/api:sha-${{ steps.meta.outputs.short }}

  update-gitops:
    needs: build-push
    runs-on: ubuntu-latest
    steps:
      - name: Checkout deploy repo
        uses: actions/checkout@v4
        with:
          repository: your-org/deploy-repo
          token: ${{ secrets.DEPLOY_PAT }}
          path: deploy

      - name: Bump image tag
        run: |
          set -e
          cd deploy
          # 需 runner 有 yq，或改用 python/jq
          sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/download/v4.44.3/yq_linux_amd64
          sudo chmod +x /usr/local/bin/yq
          yq -i ".image.tag = \"sha-${{ needs.build-push.outputs.short_sha }}\"" charts/api/values.yaml

      - name: Commit and push
        run: |
          cd deploy
          git config user.name "github-actions"
          git config user.email "github-actions@users.noreply.github.com"
          git add charts/api/values.yaml
          git diff --cached --quiet && echo "no change" && exit 0
          git commit -m "deploy: api sha-${{ needs.build-push.outputs.short_sha }}"
          git push
```

---

## 三、验证

与第 12 篇相同：Actions 绿 → 部署仓新 commit → Argo Synced → Pod 镜像更新。

PR 上建议另建 `ci.yml` **只跑 test**，避免每个 PR 推镜像、改生产期望状态。

---

## 四、变体：推 GHCR + 同组织部署仓

若不用 Harbor，把 `login`/`tags` 改成 `ghcr.io/<owner>/<name>:sha-...`，并保证集群能 pull（`imagePullSecrets` 或公开包）。GitOps 原则不变。

---

## 小结

- Actions 负责制品与改 Git；Argo 负责集群  
- 跨仓写权限用最小 PAT/App，勿用个人全能 Token  
- 下一篇：Jenkins 完成同一闭环  

相关：第 5 篇（纯 CI）、第 7 篇（Harbor 登录）。
