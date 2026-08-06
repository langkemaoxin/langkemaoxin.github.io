---
layout: post
author:     "Corey"
header-img: "img/post-bg-desk-coding.jpg"
header-mask: 0.25
title: 告别重复劳动：Playwright CLI + Skills 实战案例大全
date: 2026-04-26 19:35
tags: [Playwright CLI,Skills]
description: 告别重复劳动：Playwright CLI + Skills 实战案例大全
---

# 告别重复劳动：Playwright CLI + Skills 实战案例大全

如果你还在让 AI 帮你写自动化脚本，那你还停留在 AI 编程的 1.0 时代。

真正的 2.0 时代，是你说一句话，AI 自己打开浏览器、点击、输入、抓取数据、生成报告——全过程零人工干预。

这不是科幻。这是 **Playwright CLI + Skills** 正在做的事情。

本文将用 **5 个完整的实战案例**，并附带**详细的 Skills 安装教程**，展示这套组合拳如何解决真实世界的重复性任务，让 AI 真正成为你的数字员工。


## 第一部分：快速安装与配置

在开始案例之前，我们先完成 Playwright CLI 和 Skills 的安装。这部分大约需要 5-10 分钟。

### 1.1 前置要求

| 要求项 | 最低版本 | 验证命令 |
|:---|:---|:---|
| Node.js | v18.0+ | `node -v` |
| npm | v8.0+ | `npm -v` |
| 操作系统 | Windows 10+ / macOS 11+ / Linux | — |

如果 `node -v` 低于 v18，请先前往 [nodejs.org](https://nodejs.org) 下载 LTS 版本安装。

### 1.2 安装 Playwright CLI

```bash
# 步骤 1：全局安装 Playwright CLI
npm install -g @playwright/cli@latest

# 步骤 2：验证安装是否成功
playwright-cli --version
# 预期输出：1.46.0 或更高版本

# 步骤 3：安装 Playwright 浏览器（约 200MB，需要 1-2 分钟）
npx playwright install
```

**可能遇到的问题：**

| 错误信息 | 解决方法 |
|:---|:---|
| `command not found: playwright-cli` | npm 全局安装路径未加入 PATH，尝试 `npx playwright-cli` 替代 |
| `EACCES: permission denied` | macOS/Linux 需要 `sudo npm install -g @playwright/cli@latest` |
| 下载浏览器缓慢 | 设置环境变量 `PLAYWRIGHT_DOWNLOAD_HOST="https://npmmirror.com/mirrors/playwright/"` |

### 1.3 安装 Skills（核心步骤）

Skills 是让 AI 知道“如何正确操作”的关键。有两种安装方式：

**方式一：通过 CLI 自动安装（推荐）**

```bash
# 在项目根目录执行
playwright-cli install --skills

# 输出示例：
# ✓ Skills installed to .playwright/skills/
# ✓ Ready for Claude Code, Copilot, and other coding agents
```

这会自动创建以下目录结构：

```
你的项目/
└── .playwright/
    └── skills/
        └── playwright-cli/
            ├── SKILL.md          # AI 技能定义文件
            ├── examples/         # 代码示例
            └── scripts/          # 辅助脚本
```

**方式二：手动克隆官方仓库**

```bash
# 克隆 LambdaTest 维护的官方技能库
git clone https://github.com/LambdaTest/agent-skills.git

# 复制到 AI 能识别的位置
cp -r agent-skills/playwright-skill .claude/skills/

# 或者如果你使用 Cursor
cp -r agent-skills/playwright-skill .cursor/skills/

# 或者如果你使用 Copilot
cp -r agent-skills/playwright-skill .github/skills/
```

**方式三：针对特定 AI 工具的配置**

**Claude Code 用户（最推荐）**：

```bash
# 使用 MCP 协议添加 playwright 能力
claude mcp add playwright npx @playwright/mcp@latest

# 验证是否添加成功
claude mcp list
# 应该看到 playwright 在列表中
```

**Cursor 用户**：

在项目根目录创建 `.cursor/skills/playwright/SKILL.md`，内容可以从官方仓库复制。

### 1.4 验证安装是否成功

```bash
# 测试 1：CLI 能否打开浏览器
playwright-cli open https://example.com --headed
# 应该弹出一个浏览器窗口，显示 example.com

# 测试 2：CLI 能否获取快照
playwright-cli snapshot
# 应该输出 YAML 格式的页面元素列表，类似：
# - link "More information..." [ref=e5]
# - heading "Example Domain" [ref=e6]

# 测试 3：确认 Skills 文件存在
ls .playwright/skills/playwright-cli/SKILL.md
# 或者
ls .claude/skills/playwright-skill/SKILL.md

# 测试 4：在 Claude Code 中验证 Skills 加载
claude
# 然后在对话框中输入：/skills
# 应该能看到 playwright 相关的 skill 已加载
```

### 1.5 创建你的第一个 Skill 文件

如果你想让 AI 遵循你的项目规范，需要创建自定义 Skill：

```bash
# 创建技能目录
mkdir -p .claude/skills/my-project

# 创建 SKILL.md 文件
cat > .claude/skills/my-project/SKILL.md << 'EOF'
# 我的项目 Playwright 规范

## 项目信息
- 测试域名：https://staging.myapp.com
- 默认测试账号：test@example.com / Test123456

## 操作规范（必须遵守）
1. **定位器优先级**：getByRole > getByText > getByTestId > 禁止使用 CSS 选择器
2. **每次操作后等待 500ms**：确保页面响应
3. **测试失败必须截图**：便于排查问题
4. **保持登录状态**：使用 `--persistent` 参数

## 禁止事项
- 禁止使用 `page.waitForTimeout()` 硬等待
- 禁止使用 `data-testid` 以外的自定义属性
- 禁止在生产环境运行自动化脚本

## 示例代码
```typescript
// 正确的页面对象写法
class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.getByRole('textbox', { name: /email/i }).fill(email);
    await this.page.getByRole('textbox', { name: /password/i }).fill(password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
  }
}
```
EOF

# 验证文件创建成功
cat .claude/skills/my-project/SKILL.md
```

### 1.6 安装检查清单

完成以上步骤后，请逐项确认：

| 检查项 | 状态 | 验证方法 |
|:---|:---|:---|
| ✅ Playwright CLI 已安装 | ☐ | `playwright-cli --version` |
| ✅ 浏览器已安装 | ☐ | `npx playwright install` |
| ✅ Skills 已安装 | ☐ | `playwright-cli install --skills` |
| ✅ 能打开浏览器 | ☐ | `playwright-cli open https://example.com --headed` |
| ✅ 能获取快照 | ☐ | `playwright-cli snapshot` 输出 YAML |
| ✅ Skill 文件存在 | ☐ | `ls .playwright/skills/` |
| ✅ Claude Code 能识别 | ☐ | 在 claude 中运行 `/skills` |

如果全部通过，恭喜！你的环境已经完全就绪。


## 第二部分：什么是 Playwright CLI + Skills？

### 2.1 Playwright CLI：AI 的手和脚

Playwright CLI 是微软在 2026 年初开源的全新浏览器自动化工具。它允许 AI 像使用 Linux 命令一样操作浏览器：

```bash
playwright-cli open https://example.com --headed   # 打开浏览器
playwright-cli snapshot                            # 获取页面元素引用
playwright-cli click @e12                          # 点击元素
playwright-cli type "Hello"                        # 输入文本
playwright-cli screenshot                          # 截图保存
```

**为什么比 MCP 更省 Token？**

根据官方基准测试，Playwright CLI 相比 MCP 方案可以减少约 **4 倍的 Token 消耗**。秘密在于：
- MCP 会把整个页面的 DOM 结构塞进上下文
- CLI 只返回简洁的快照文件路径，AI **按需读取**

### 2.2 Skills：AI 的大脑和说明书

Skills 是 Anthropic 开源的技术规范——一个 Markdown 文件，放在项目目录里，告诉 AI 该如何做事。

一个完整的 Playwright Skill 包含：
- **方法论**：用什么架构、什么命名规范
- **参考范例**：完美的代码模板
- **验证清单**：代码必须满足的规则

简单说：**CLI 给 AI 手脚，Skills 给 AI 大脑**。

### 2.3 为什么需要 Skills？

**没有 Skills 时**：每次给 AI 下指令都要写长篇 Prompt，AI 发挥不稳定，不同会话生成的代码风格不一致。

**有了 Skills 后**：Skills 像一本员工手册，所有规则固化在 `SKILL.md` 中。更新一次 Skill，以后所有生成的代码都自动符合规范。


## 第三部分：五个实战案例

### 案例一：电商网站评论采集（0 Token 自动化）

**痛点**：需要定期采集某电商平台商品的前 100 条评论，手工复制粘贴效率太低。

**解决方案**：让 AI 摸索一次流程，沉淀成 Skill，再固化成脚本，最终实现 0 Token 全自动运行。

#### 执行过程

**第一步：让 AI 自己摸索**

在 Claude Code 中输入：

```
使用 playwright-cli 查看这个商品前 100 条评论，保存到 CSV 文件
```

AI 会自己打开浏览器、找到评论区、滚动加载、抓取数据。第一次运行消耗了约 **41% 的上下文窗口**。

**第二步：沉淀成 Skill**

```
创建一个新的 skill，把刚才的全过程和遇到的坑都提炼出来
```

AI 把可复用的内容固化到了 `save-mall-comments` Skill 中：
- 主流程方法论
- 天猫页面的特殊处理（如评论弹层 vs 页面跳转）
- 可直接复用的滚动脚本

**第三步：用 Skill 指导执行**

让 AI 再次执行相同任务。有了 Skill 指导后，上下文消耗降到了 **5%**。

**第四步：固化成独立脚本**

```
把刚才所有的 playwright-cli 命令汇总成一个脚本
```

AI 生成了一个 PowerShell 脚本。以后直接在终端执行，**0 Token，0 AI 参与**，完成评论采集。

#### 成果

| 阶段 | Token 消耗 | 耗时 |
|:---|:---|:---|
| 第一次摸索 | 41% 上下文 | ~5 分钟 |
| Skill 指导 | 5% 上下文 | ~1 分钟 |
| 固化脚本 | **0** | **~10 秒** |

**核心规律**：让 AI 替你踩坑，把经验固化成代码，以后就能零成本重复使用。


### 案例二：自动发布文章到 X（复杂流程自动化）

**痛点**：X 的发文流程非常繁琐——Markdown 格式不支持、图片不能批量粘贴、需要一个个手动替换占位符。

**解决方案**：用 Playwright CLI 模拟人工操作，实现一键发布。

#### 执行过程

**第一步：预处理文章**

```
帮我编写一个 Python 脚本，把文章里的图片下载到本地，转成只使用本地图片的 Markdown，再用 pandoc 转成 HTML
```

AI 生成了转换脚本，把 Markdown 文章变成了 HTML 格式。

**第二步：AI 执行发文**

```
使用 playwright-cli，打开 X 创建新文章，把 HTML 粘贴进去，
找到所有照相机占位符，逐个删除，再从本地复制图片粘贴替换
```

AI 打开浏览器，模拟人工操作：
1. 登录 X
2. 点击创建新文章
3. 粘贴 HTML 内容
4. 识别所有图片占位符
5. 逐个删除占位符，从本地复制图片粘贴

**第三步：沉淀成 Skill**

整个过程固化成了 `x-publisher` Skill。以后只要一句话：

```
使用 x-publisher 发布这篇文章
```

AI 就会自动完成全部流程。

#### 成果

- 原本需要 10-15 分钟的手工操作
- 变成了一个命令 + 等待 30 秒


### 案例三：仪表盘 E2E 自动化测试

**痛点**：微服务仪表盘有 5 个图表组件，每次发布前需要验证筛选、排序、数据刷新等功能，手工测试耗时且容易遗漏。

**解决方案**：用 Playwright CLI + Skills 生成测试代码，CI 自动执行，双报告输出。

#### 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│  1. 本地：AI 生成测试用例                                         │
│                                                                 │
│  "验证延迟图表按服务筛选功能"                                     │
│       ↓                                                         │
│  playwright-cli open http://localhost:5173                      │
│  playwright-cli snapshot          (获取元素引用 e42, e56)        │
│  playwright-cli click e42         (输出 TypeScript 代码)         │
│       ↓                                                         │
│  playwright/tests/charts.spec.ts  (提交到 Git)                  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. CI：自动化执行                                                │
│                                                                 │
│  GitHub Actions → npm ci → playwright install → 运行测试        │
│  8 个测试，约 2.5 秒，失败重试 2 次                               │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. 双报告层                                                      │
│                                                                 │
│  HTML 报告 (Playwright)     +    Allure 报告 (历史趋势)          │
│  - 交互式追踪查看器                - 通过率趋势图                  │
│  - 失败截图                       - 按史诗/功能/严重度分组        │
└─────────────────────────────────────────────────────────────────┘
```

#### 关键设计

**确定性 Mock 数据**：仪表盘的数据层使用种子随机数生成器，每次运行产生相同的图表数据，测试完全不依赖网络 Mock。

**AI 生成测试**：用自然语言描述流程，AI 通过 CLI 实时抓取元素引用，生成的代码使用 `getByRole` 等可靠定位器，不会产生幻觉选择器。

**双报告输出**：
- HTML 报告：本地调试、追踪查看
- Allure 报告：发布到 GitHub Pages，累计历史趋势图

#### 成果

- 测试代码编写时间从 2 小时 → **10 分钟**（自然语言描述）
- 每次 PR 自动执行，无需人工干预
- 历史趋势图让团队清楚看到测试稳定性


### 案例四：零 Token 网页数据采集

**核心理念**：很多固定流程其实不需要 AI 参与，只需要让 AI **帮你写一次脚本**。

#### 应用场景

- 定期爬取某网站的价格信息
- 每天检查某个页面的更新
- 批量下载某个专栏的文章

#### 工作流

```
Step 1: 让 AI 用 Playwright CLI 手动执行一次
        ↓
Step 2: AI 摸索出最佳路径，遇到坑自己解决
        ↓
Step 3: 把整个过程固化成 Skill
        ↓
Step 4: 让 AI 把 Skill 转写成独立脚本（Bash/Python/PS）
        ↓
Step 5: 脚本可以在任何环境执行，0 Token
```

#### 示例：定时抓取某宝每日好店

AI 生成的脚本结构：

```bash
# 由 AI 根据摸索经验生成的 PowerShell 脚本
playwright-cli open https://taobao.com --headed --persistent
playwright-cli type "每日好店"
playwright-cli press Enter
# 等待 3 秒加载
Start-Sleep -Seconds 3
playwright-cli snapshot > snapshot.yml
# 提取店铺信息
playwright-cli eval "document.querySelectorAll('.shop-name').map(e => e.innerText)" > shops.json
playwright-cli close
```

设置 Windows 任务计划或 Linux cron，每天自动运行，**完全不需要 AI**。


### 案例五：跨系统工作流自动化

**场景**：从 A 系统读取数据 → 处理后 → 写入 B 系统

**示例**：从内部 CRM 导出客户列表，在 Excel 中处理，然后上传到营销系统。

#### 执行流程

```
自然语言指令：
"从 CRM 导出昨天的客户列表，筛选出活跃用户，上传到营销系统"

AI 执行：
1. playwright-cli open crm.company.com --persistent（保持登录）
2. playwright-cli click @date-picker
3. playwright-cli fill @date-input "2025-01-15"
4. playwright-cli click @export-btn
5. playwright-cli eval "processExportData()" > active_users.csv
6. playwright-cli open marketing.com/upload --persistent
7. playwright-cli upload active_users.csv
8. playwright-cli click @submit
```

整个过程无需人工参与，AI 在 Skills 指导下自动完成跨系统操作。


## 第四部分：核心概念深入

### 4.1 Recon（侦察） vs Heal（自愈）

**Recon 侦察**：执行任何操作前，先 `snapshot` 获取当前页面的真实元素引用，不靠记忆。

**Heal 自愈**：测试失败时，AI 不会盲目重试，而是：

1. 分类错误（超时 / 严格模式冲突 / 断言不匹配）
2. 应用对应修复（更新定位器 / 加 `.first()` / 调整预期值）
3. 重新运行，最多 2 个循环

超过 2 次仍失败 → 说明 Skill 需要更新，不是 AI 的问题。

### 4.2 Session 与会话管理

Playwright CLI 支持**命名会话**，不同项目可以使用独立的浏览器实例：

```bash
# 启动项目 A 的会话
playwright-cli -s=projectA open https://app-a.com --persistent

# 启动项目 B 的会话
playwright-cli -s=projectB open https://app-b.com --persistent

# 查看所有会话
playwright-cli list
```

`--persistent` 参数将 Cookie 和登录状态保存到磁盘，下次使用不需要重新登录。

### 4.3 监控仪表盘

`playwright-cli show` 打开可视化仪表板，可以实时观察所有运行中的浏览器会话，每个会话都有实时截屏预览。


## 第五部分：常见问题与故障排除

| 问题 | 原因 | 解决方法 |
|:---|:---|:---|
| `command not found: playwright-cli` | CLI 未全局安装 | 执行 `npm install -g @playwright/cli@latest` |
| `Error: browserType.launch: Executable doesn't exist` | 浏览器未安装 | 执行 `npx playwright install` |
| 快照返回空结果 | 页面需要登录 | 先用 `playwright-cli click` 完成登录流程 |
| AI 找不到 Skill | Skill 放错了目录 | 确保在 `.claude/skills/` 下，不是 `.claude/skill/` |
| Skills 安装后 AI 仍不遵循规范 | Skill 文件格式错误 | 检查 `SKILL.md` 是否符合 Markdown 格式 |
| Windows 上执行缓慢 | 杀毒软件干扰 | 将项目目录加入杀毒软件排除列表 |
| 同时运行多个会话冲突 | Session 名称重复 | 使用 `-s` 参数指定不同的会话名称 |


## 第六部分：总结

| 对比维度 | 传统方式 | CLI + Skills 方式 |
|:---|:---|:---|
| **编写测试** | 手动写代码，查选择器 | 自然语言描述，AI 自动生成 |
| **定位元素** | 硬编码选择器，容易失效 | 实时快照获取，永远准确 |
| **失败处理** | 人工排查，手动修复 | AI 自动自愈，2 次重试 |
| **团队规范** | 代码审查保证 | Skill 固化，自动执行 |
| **重复任务** | 每次都要人操作 | 固化脚本，0 Token 自动 |
| **Token 消耗** | MCP 方案消耗高 | CLI 方案省 4 倍 |

**Playwright CLI** 给了 AI 操作浏览器的手脚，**Skills** 给了 AI 遵循规范的大脑，**自愈循环** 给了 AI 适应变化的能力。

这套组合拳正在让“手动测试工程师”和“重复劳动”成为历史。现在就开始，让你的 AI 从对话框里走出来，真正地去浏览网页、点击按钮、完成任务。

---
