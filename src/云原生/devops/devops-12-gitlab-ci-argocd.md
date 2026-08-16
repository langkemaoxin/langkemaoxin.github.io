---
title: GitLab CI × Argo CD——端到端发布
sidebarGroup: DevOps / GitOps
shortTitle: 12 GitLab CI × Argo CD
order: 12
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - GitLab CI
  - Argo CD
description: GitLab CI × Argo CD——构建推镜像、更新部署仓，由 Argo CD 完成集群同步
---

> **DevOps / GitOps · 第 12/15 篇**  
> 上一篇：[《应用与 Helm 清单》](/云原生/devops/devops-11-app-manifests)  
> 下一篇预告：[《GitHub Actions × Argo CD》](/云原生/devops/devops-13-github-actions-argocd)

---

## 开头：CI 绿了，谁负责改集群？

在本系列模型里：**GitLab CI 不持有生产 kubectl**。它只做：

1. 测试与构建  
2. 推送 Harbor  
3. 更新部署仓中的 `image.tag`  

**Argo CD** 发现部署仓变更后同步集群。这是旧课堂「GitLab + Argo」主线的现代化写法。

> **待本机验证**。GitLab 可用官方 Omnibus/Compose 自建，或 GitLab.com。

---

## 一、前置 Condensation

- 应用仓、部署仓已按第 11 篇建好  
- Argo CD Application 指向部署仓 `charts/api`  
- Harbor Robot 账号已进 GitLab CI Variables  
- 部署仓写权限：Project Access Token 或 Deploy Key（可写）  

---

## 二、Runner 要点

自建 GitLab 时需注册 Runner，并保证能跑 Docker 构建（Docker socket 或 Kaniko/Buildah）。示意注册：

```bash
# 在 Runner 主机（待本机验证，按官网当前包名安装）
sudo gitlab-runner register \
  --url "https://gitlab.example.com/" \
  --token "<registration-token>" \
  --executor "docker" \
  --docker-image "docker:27"
```

变量（CI/CD Variables）：

| Key | 说明 |
|-----|------|
| `HARBOR_HOST` / `HARBOR_USER` / `HARBOR_PASSWORD` | 推镜像 |
| `DEPLOY_REPO_URL` | 部署仓地址 |
| `DEPLOY_TOKEN` | 推送部署仓用 |

---

## 三、`.gitlab-ci.yml` 示例

```yaml
stages:
  - test
  - build
  - deploy-git

variables:
  IMAGE: $HARBOR_HOST/demo/api:$CI_COMMIT_SHORT_SHA

test:
  stage: test
  image: golang:1.22
  script:
    - echo "go test ./..."
    # - go test ./...

build_image:
  stage: build
  image: docker:27
  services:
    - docker:27-dind
  script:
    - echo "$HARBOR_PASSWORD" | docker login "$HARBOR_HOST" -u "$HARBOR_USER" --password-stdin
    - docker build -t "$IMAGE" .
    - docker push "$IMAGE"
  only:
    - main

update_manifest:
  stage: deploy-git
  image: alpine:3.20
  before_script:
    - apk add --no-cache git git-lfs yq
    - git config --global user.email "ci@example.com"
    - git config --global user.name "gitlab-ci"
  script:
    - git clone "https://oauth2:${DEPLOY_TOKEN}@${DEPLOY_REPO_HOST}/${DEPLOY_REPO_PATH}.git" deploy
    - cd deploy
    - yq -i ".image.tag = \"$CI_COMMIT_SHORT_SHA\"" charts/api/values.yaml
    # 若 values 里写的是 sha- 前缀，改为：
    # yq -i ".image.tag = \"sha-$CI_COMMIT_SHORT_SHA\"" charts/api/values.yaml
    - git add charts/api/values.yaml
    - git commit -m "deploy: api $CI_COMMIT_SHORT_SHA" || echo "no change"
    - git push origin HEAD:main
  only:
    - main
  needs: ["build_image"]
```

按你的 values 格式微调 `yq` 表达式。`DEPLOY_REPO_HOST/PATH` 可拆成 Variables。

---

## 四、验证链路

1. 向应用仓 `main` 推送提交  
2. GitLab Pipeline：test → build → update_manifest 全绿  
3. 部署仓出现新 commit  
4. Argo CD 应用变为 Progressing/Synced  
5. `kubectl -n demo get pods` 镜像 tag 已更新  

若 Argo 未自动同步，检查 Application 是否开启 automated，或手动 `argocd app sync demo-api`。

---

## 五、背景知识：和旧笔记差异

旧笔记常在 CI 末尾隐含「集群已通」；本篇明确 **CD = 改 Git**。回滚也不在 GitLab 点「重跑旧 Job」为主，而是 **Revert 部署仓 commit** 或 Argo History（第 15 篇）。

---

## 小结

- GitLab CI：测、推镜像、改部署仓  
- Argo CD：拉齐集群  
- 对称的 Actions / Jenkins 版本见下两篇  

官方参考：[GitLab CI/CD](https://docs.gitlab.com/ee/ci/)、[Argo CD](https://argo-cd.readthedocs.io/en/stable/)。
