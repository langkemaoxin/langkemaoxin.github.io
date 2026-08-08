---
title: "Docker Compose 编排——用 YAML 定义一整栈微服务"
sidebarGroup: "Docker 系列"
shortTitle: "18 Compose 编排"
order: 18
date: 2026-08-25
category: "云原生"
tag:
  - "Docker"
  - "云原生"
  - "Docker系列"
---

> **Docker 系列 · 第 18/18 篇**  
> 上一篇：[《网络模式与实操》](/云原生/docker/docker-17-network/) · 系列开篇：[《技术底座总览》](/云原生/docker/docker-13-tech-foundation/)

---

## 开头：五个容器、二十条 docker run，脚本还维护得动吗？

本地开发一套 Nacos + MySQL + Gateway，每个服务一条 `docker run`：端口、卷、环境变量、依赖顺序全写在 shell 里。

- 新人 onboarding：先读 200 行 bash
- 改一个 env：三处脚本不一致
- CI 与本地命令还不相同

**Docker Compose** 的官方定位是：用 **一份 YAML** 描述一组关联容器，**一条命令**创建并启动整个项目。Compose 通过 Docker API 管理容器，只要平台支持 Docker API，即可使用 Compose 编排。

---

## 一、Compose 解决什么问题

| 痛点 | Compose 做法 |
|------|--------------|
| 多容器启动顺序 | `depends_on`、healthcheck |
| 配置分散 | 单文件 `docker-compose.yml` |
| 环境差异 | `.env` + 变量替换 |
| 重复 docker run | 声明式 services 定义 |

Compose **不负责集群负载均衡**（多实例需 Swarm/K8s 或外部 Consul 等），但单机/小规模多容器场景足够高效。

---

## 二、三层架构

Compose 将管理对象分为三层：

```text
Project（工程）
└── Service（服务）
    └── Container（容器实例）
```

- **Project**：当前目录（或 `-p` 指定名）下的 compose 文件与环境文件构成一个工程
- **Service**：逻辑服务（如 `web`、`db`），定义镜像、端口、卷等
- **Container**：服务的运行实例；同一 service 可 scale 多个 container（需配合 Swarm 或 `--scale`）

标准模板包含 **`version`（可选，Compose V2 已弱化）、`services`、`networks`、`volumes`** 等顶层键。

---

## 三、安装与验证

Compose V2 已作为 Docker CLI 插件分发：

```bash
docker compose version
# 或旧版独立二进制
docker-compose --version
```

旧版独立安装示例（仅当环境未带插件时）：

```bash
# 下载后放到 PATH 并 chmod +x
docker-compose version
```

---

## 四、YAML 关键字段详解

以下字段与 `docker run` 高度对应；使用 **`build`** 时，Dockerfile 中的 `CMD`、`EXPOSE`、`VOLUME`、`ENV` 等会自动带入，无需在 compose 重复声明（除非要覆盖）。

### 4.1 image 与 build

```yaml
services:
  web:
    image: nginx:1.25          # 直接用镜像
  api:
    build: ./api               # 上下文目录，含 Dockerfile
    # build:
    #   context: ./api
    #   dockerfile: Dockerfile.prod
```

- **image**：镜像名或 ID；本地不存在则 pull
- **build**：基于 Dockerfile 构建；与 image 可同时写（构建并打 tag）

### 4.2 ports 与 expose

```yaml
services:
  web:
    ports:
      - "8080:80"              # 宿主机:容器
      - "127.0.0.1:8443:443"   # 绑定本地
    expose:
      - "3000"                 # 仅容器间可见，不映射宿主机
```

**注意**：YAML 可能把 `8080:80` 误解析为 60 进制，**建议端口映射用字符串引号**。

### 4.3 volumes

```yaml
services:
  db:
    volumes:
      - db_data:/var/lib/mysql           # 命名卷
      - ./conf:/etc/mysql/conf.d:ro      # 绑定挂载，只读
      - /var/log/mysql:/var/log/mysql

volumes:
  db_data:
```

`volumes_from` 可挂载另一服务的全部卷（少用，显式更清晰）。

### 4.4 environment 与 env_file

```yaml
services:
  app:
    environment:
      RACK_ENV: production
      SESSION_SECRET: ${SESSION_SECRET}   # 从 .env 或 shell 注入
    env_file:
      - ./common.env
      - ./app.env
```

`env_file` 中每行 `KEY=VAL`；与 `environment` 冲突时，**以后者为准**。

### 4.5 depends_on

```yaml
services:
  web:
    depends_on:
      - redis
      - db
```

**仅保证启动顺序**，不等待 DB「就绪」。生产级应配合 **healthcheck**：

```yaml
services:
  db:
    image: mysql:8
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 5
  web:
    depends_on:
      db:
        condition: service_healthy   # Compose 格式因版本而异，V2+ 支持 condition
```

Dockerfile 中也可定义：

```dockerfile
HEALTHCHECK --interval=5s --timeout=3s \
  CMD curl -f http://localhost/alive || exit 1
```

### 4.6 networks

```yaml
services:
  web:
    networks:
      - frontend
  db:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    external: true
    name: existing_net
```

与第 17 篇自定义 bridge 一致：**同一 network 下服务可用服务名 DNS 互访**。

### 4.7 deploy（Swarm / Compose 扩展）

```yaml
services:
  api:
    deploy:
      mode: replicated
      replicas: 2
      resources:
        limits:
          cpus: '0.50'
          memory: 1G
      restart_policy:
        condition: on-failure
        max_attempts: 3
      update_config:
        order: start-first
```

单机 `docker compose up` 对部分 `deploy` 字段支持有限；**Swarm 模式**下语义最完整。资源 limits 与第 16 篇 Cgroups 对应。

### 4.8 其他常用字段（速览）

| 字段 | 作用 |
|------|------|
| **command** | 覆盖镜像默认 CMD |
| **entrypoint** | 覆盖 ENTRYPOINT |
| **restart** | `always` / `unless-stopped` / `on-failure` |
| **privileged** | 特权容器 |
| **pid: host** | 共享 PID namespace |
| **cap_add / cap_drop** | Linux capabilities |
| **extends** | 继承另一 YAML 中的 service 定义 |

---

## 五、完整示例（精简版）

```yaml
version: '3.8'

services:
  nacos1:
    image: nacos/nacos-server:${NACOS_VERSION}
    container_name: nacos1
    restart: always
    ports:
      - "8001:8001"
    env_file:
      - ./nacos.env
    environment:
      NACOS_SERVER_IP: ${NACOS_SERVER_IP_1}
      NACOS_APPLICATION_PORT: 8001
    volumes:
      - ./logs_01/:/home/nacos/logs/
      - ./data_01/:/home/nacos/data/
    networks:
      - ha-overlay
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 1024M

networks:
  ha-overlay:
    external: true
```

多节点 Nacos 集群可复用同一模板，改端口、卷路径与环境变量即可。

---

## 六、YAML 编写注意事项

- **缩进用空格，不要用 Tab**
- 同级元素对齐；通常 2 空格一级
- `#` 注释
- 布尔值建议用 `"true"` / `"false"` 字符串（避免 YAML 1.1 坑）
- 修改后用 `docker compose config` **校验渲染结果**

---

## 七、常用命令（精选）

不必死记 22 条 one-liner，按**生命周期**掌握以下即可覆盖 90% 场景。

### 7.1 项目生命周期

```bash
docker compose up -d          # 后台启动全部服务（最常用）
docker compose up -d --build  # 启动前重新构建镜像
docker compose down           # 停止并删除容器、默认网络
docker compose down -v        # 同时删除命名卷
docker compose ps             # 查看服务状态
docker compose top            # 各容器内进程
```

### 7.2 构建与镜像

```bash
docker compose build
docker compose build --no-cache web
docker compose pull
docker compose push           # 需 compose 配置 push 权限
```

### 7.3 运维与调试

```bash
docker compose logs -f web              # 跟踪日志
docker compose logs -f -t --tail=100    # 带时间戳，最后 100 行
docker compose exec web bash            # 进入容器
docker compose run --rm api pytest      # 一次性命令（如跑测试）
docker compose restart web
docker compose pause web / unpause web
docker compose kill -s SIGINT web
```

### 7.4 配置与校验

```bash
docker compose config          # 验证并展开 YAML
docker compose config --services
docker compose version
docker compose -f docker-compose.prod.yml up -d   # 指定文件
docker compose -p myproj up -d                    # 指定项目名
```

### 7.5 与旧版 docker-compose 对照

| 操作 | Compose V2 | 旧版 |
|------|------------|------|
| 启动 | `docker compose up -d` | `docker-compose up -d` |
| 停止 | `docker compose down` | `docker-compose down` |
| 日志 | `docker compose logs -f` | `docker-compose logs -f` |

V2 推荐作为默认；CI 脚本可逐步迁移。

---

## 八、Compose 与系列前文的衔接

| 前文 | 在 Compose 中的体现 |
|------|---------------------|
| 第 14 篇 UnionFS / 镜像 | `build` / `image` |
| 第 15 篇 Namespace | `network_mode`、`pid` |
| 第 16 篇 Cgroups | `deploy.resources.limits` |
| 第 17 篇网络 | `networks`、`ports`、服务名 DNS |

---

## 本节小结

| 概念 | 一句话 |
|------|--------|
| **Project / Service / Container** | Compose 三层模型 |
| **docker-compose.yml** | 声明式多容器定义 |
| **depends_on + healthcheck** | 启动顺序与就绪 |
| **networks** | 与自定义 bridge、DNS 一致 |
| **docker compose up -d** | 日常最核心的启动命令 |
| **docker compose config** | 提交前校验 YAML |

---

## 系列结语

至此 **Docker 系列 18 篇** 完结：从安装使用到底层 Namespace、Cgroup、UnionFS，再到网络与 Compose 编排，构成一套可查阅的知识库脉络。

后续 **Kubernetes**、**Serverless** 专栏将在本仓库 `src/云原生/` 下继续展开；容器运行时与 OCI 的理解，会直接迁移到 Pod、CRI 与云原生调度层。

---

## 思考题

> 若 `web` 依赖 `db`，仅配置 `depends_on: [db]` 而不做 healthcheck，应用启动仍报「连接拒绝」时，应从哪几个方向排查？

欢迎在评论区分享你的 Compose 踩坑记录。系列完结，感谢阅读 🐳
