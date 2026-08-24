---
title: CI 对接 Harbor——推镜像与权限边界
sidebarGroup: DevOps / GitOps
shortTitle: 07 CI 对接 Harbor
order: 7
date: 2026-08-16T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - Harbor
  - CI
description: CI 对接 Harbor——推镜像与权限边界；安装见 Docker 专栏，本篇只谈流水线接入
---

> **DevOps / GitOps · 第 7/15 篇**  
> 上一篇：[《SonarQube》](/云原生/devops/devops-06-sonarqube)  
> 下一篇预告：[《GitOps 环境规划》](/云原生/devops/devops-08-env-planning)

---

## 开头：镜像能 build，为什么 Runner 就是 push 不上？

Harbor 装好、网页能登录，CI 仍常失败在：HTTP/HTTPS 证书、项目名、Robot 权限、`--password-stdin` 写错。本篇不重复安装步骤——安装与第一次手工 `push` 见：

→ [Docker 系列 · Harbor 私有仓库](/云原生/docker/docker-12-harbor)

这里只解决：**流水线如何稳定、安全地对接 Harbor**。

---

## 一、是什么：CI 眼里的 Harbor

对 CI 而言 Harbor 就是 **OCI 发行版仓库**：

```text
docker login <host>
docker tag  local:tag  <host>/<project>/<repo>:<tag>
docker push <host>/<project>/<repo>:<tag>
```

GitOps 下游（集群节点 / containerd）还要能 **pull** 同一地址，因此证书与 insecure-registry 配置必须在「构建机」和「集群节点」两侧都想清楚。

---

## 二、为什么用 Robot 账号，而不是 admin

| 方式 | 风险 |
|------|------|
| CI 用 `admin` | 权限过大，泄漏即全库沦陷 |
| 每人个人账号 | Token 难轮换、审计乱 |
| **项目 Robot 账号** | 最小权限、可轮换、适合机器 |

在 Harbor 项目里创建 Robot，授予有限的 Push/Pull，把名称与密钥放进 CI Secrets。

---

## 三、怎么做：三条引擎的登录写法

下文 `<HARBOR>` = `harbor.example.com`，`<PROJECT>` = `demo`。

### 3.1 通用 shell（Jenkins / GitLab job / 自托管）

```bash
echo "$HARBOR_PASSWORD" | docker login "<HARBOR>" -u "$HARBOR_USER" --password-stdin
docker build -t "<HARBOR>/<PROJECT>/api:sha-${GIT_SHA}" .
docker push "<HARBOR>/<PROJECT>/api:sha-${GIT_SHA}"
```

### 3.2 GitHub Actions

```yaml
- uses: docker/login-action@v3
  with:
    registry: harbor.example.com
    username: ${{ secrets.HARBOR_USER }}
    password: ${{ secrets.HARBOR_PASSWORD }}

- uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    tags: harbor.example.com/demo/api:sha-${{ github.sha }}
```

### 3.3 GitLab CI

```yaml
# .gitlab-ci.yml 片段
build_image:
  stage: build
  image: docker:27
  services:
    - docker:27-dind
  variables:
    IMAGE: $HARBOR_HOST/$HARBOR_PROJECT/api:$CI_COMMIT_SHORT_SHA
  script:
    - echo "$HARBOR_PASSWORD" | docker login "$HARBOR_HOST" -u "$HARBOR_USER" --password-stdin
    - docker build -t "$IMAGE" .
    - docker push "$IMAGE"
```

在 GitLab：**Settings → CI/CD → Variables** 中配置 `HARBOR_*`（Mask + Protect 按分支策略开启）。

---

## 四、背景知识：证书与「不安全仓库」

| 场景 | 建议 |
|------|------|
| 正式环境 | Harbor 上 HTTPS，构建机与集群信任该 CA |
| 纯实验 HTTP | Docker `insecure-registries`；K8s/containerd 同步放行——**仅限实验** |
| 自签证书 | 把 CA 装进 Runner 镜像或宿主机信任库 |

推送成功后，在 Harbor UI 确认 artifact 与 digest。GitOps 部署清单里优先写 **digest** 或不可变 tag，避免 `latest`。

---

## 五、和后续 GitOps 的衔接

CI 推完镜像后，通常还要：

1. 打开**部署仓库**中 Helm `values.yaml` 或 Kustomize `images:`  
2. 把 `tag` / `digest` 改成本次构建  
3. commit（或自动 PR）→ Argo CD 同步  

这一步在 12–14 篇按引擎分别写。

---

## 小结

- 本篇假设 Harbor 已可用；焦点是 **Robot + CI Secret + 不可变 tag**  
- 三条 CI 登录方式不同，语义相同  
- 下一篇进入 GitOps **环境规划**：机器角色怎么分、哪些该自建、哪些复用已有专栏  

> 旧课堂笔记里「在 Jenkins 里配 Harbor」的长截图流程，已收敛为本篇通用模式 + Docker 专栏安装文。
