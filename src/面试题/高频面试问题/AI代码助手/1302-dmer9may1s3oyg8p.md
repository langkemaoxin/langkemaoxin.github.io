---
title: "第 1 集 AI Code Reviewer 环境配置"
sidebarGroup: "AI代码助手"
shortTitle: "第 1 集 AI Code Reviewer 环境配置"
order: 1302
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: ". 安装 JDK 21 (必须步骤)Spring AI 强依赖 JDK 17+，推荐使用 JDK 21 (LTS)。🍎 macOS 用户 (推荐 Homebrew)打开终端 (Terminal)，依次执行：codeBash# 1. 安装 "
article: false
---

> 来源：[第 1 集 AI Code Reviewer 环境配置](https://www.yuque.com/tulingzhouyu/db22bv/dmer9may1s3oyg8p)

### . 安装 JDK 21 (必须步骤)

Spring AI 强依赖 JDK 17+，推荐使用 JDK 21 (LTS)。

#### 🍎 macOS 用户 (推荐 Homebrew)

打开终端 (Terminal)，依次执行：

**codeBash**

```plain
# 1. 安装 JDK 21
brew install openjdk@21

# 2. 配置系统软连接 (关键！解决 Cursor 找不到 JDK 的问题)
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk

# 3. 配置环境变量 (以 zsh 为例)
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 4. 验证
java -version
# 输出应包含: openjdk version "21.0.9" ...
```

#### 🪟 Windows 用户

- **下载**：访问 [Oracle 官网](https://www.google.com/url?sa=E&q=https%3A%2F%2Fwww.oracle.com%2Fjava%2Ftechnologies%2Fdownloads%2F%23jdk21-windows) 下载 x64 Installer。
- **安装**：双击运行，一路点击“下一步”。
- **验证**：打开 CMD (命令提示符)，输入 java -version。

---

### 2. 安装与配置 Maven

#### 🍎 macOS 用户

**codeBash**

```plain
brew install maven
# 验证
mvn -v
```

#### 🪟 Windows 用户

- 下载 Maven zip 包解压。
- 配置环境变量 MAVEN_HOME 指向解压目录。
- 将 %MAVEN_HOME%\bin 添加到 Path 中。

#### 🚀 加速技巧 (阿里云镜像)

为了防止依赖下载卡死，建议修改 settings.xml。

- **Mac 位置**: /opt/homebrew/opt/maven/libexec/conf/settings.xml
- **Windows 位置**: Maven安装目录/conf/settings.xml

在 &lt;mirrors&gt; 标签内添加：

**codeXml**

```plain
&lt;mirror&gt;
  &lt;id&gt;aliyunmaven&lt;/id&gt;
  &lt;mirrorOf&gt;central&lt;/mirrorOf&gt;
  &lt;name&gt;Aliyun Public&lt;/name&gt;
  &lt;url&gt;https://maven.aliyun.com/repository/public&lt;/url&gt;
&lt;/mirror&gt;
```

---

### 3. 获取阿里云百炼 API Key (大模型大脑)

我们需要获取一个 Key 来调用通义千问模型。

- **访问平台**：登录 [阿里云百炼控制台](https://www.google.com/url?sa=E&q=https%3A%2F%2Fbailian.console.aliyun.com%2F)。
- **开通服务**：点击“开通 DashScope”，新用户通常有免费额度。
- **创建密钥**：

- 点击左侧菜单 **“API-KEY 管理”**。
- 点击 **“创建新的 API-KEY”**。
- **复制保存**：sk-xxxxxxxxxxxx (关掉弹窗后就看不到了，务必保存到记事本)。

---

### 4. 配置 Cursor (开发神器)

- **下载**：[Cursor 官网](https://www.google.com/url?sa=E&q=https%3A%2F%2Fcursor.sh%2F)。
- **安装插件**：

- 打开 Cursor。
- 点击左侧边栏的 **Extensions** (扩展)。
- 搜索 **"Java"**。
- 安装 **"Extension Pack for Java"** (Microsoft 出品)。

- **验证**：

- 重启 Cursor。
- 新建一个 .java 文件，看是否有代码高亮和智能提示。
