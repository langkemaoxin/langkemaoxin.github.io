---
title: "DeepSeek本地部署教程"
sidebarGroup: "AI大模型"
shortTitle: "DeepSeek本地部署教程"
order: 1477
date: 2026-03-05
category: "面试题"
tag:
  - "面试题"
description: "deepseek最近非常火，有时很卡顿，用不了，那么本地部署的需求也随之而来，很多人是有这个需求的。其实很简单，几分钟就可以安装完。🚀 十分钟搞定！Windows电脑玩转DeepSeek本地部署🌈 步骤一：安装灵魂工具Ollama▌官网"
article: false
---

> 来源：[DeepSeek本地部署教程](https://www.yuque.com/tulingzhouyu/db22bv/pgswxy26zlgb4eq9)

deepseek最近非常火，有时很卡顿，用不了，**那么本地部署的需求也随之而来，很多人是有这个需求的。**

其实很简单，几分钟就可以安装完。

**🚀 十分钟搞定！Windows电脑玩转DeepSeek本地部署**

**🌈 步骤一：安装灵魂工具Ollama**
▌官网下载直通车：👉 https://ollama.com

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300127-433b94b7-4509-4f69-bb6f-f7ebb5d66b53.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_24%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

操作就像安装QQ一样简单，点击Download

1. 双击下载的.exe安装包
2. 狂点「下一步」直到完成

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300113-5a08960f-dc7f-4099-9644-59426dcb73ae.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_10%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

🌈** 步骤二：回到ollama的官网，搜索框里搜索deepseek-r1，选择要安装的模型**

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300121-9d39cc88-ae53-4d76-a0ca-9e1de285d7f8.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_22%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

点击下拉框，可以看到多个版本，区别是参数不一样，数字越大，代表参数越多，性能就越强，但也对计算机的性能要求较高。

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300431-9f87126a-5d9b-490f-a6bc-9d02bc6b5918.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_28%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

模型版本怎么选？电脑配置不行的，建议选择1.5B版本，这个模型有15亿参数，属于最轻量的Deepseek版本，电脑配置好点的，可以选择7b以上的。

**🌈 步骤三：复制右边的这串代码“ollama run deepseek-r1:1.5b”**

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300468-3b900f20-5c9d-4c0f-a6fd-c22d271a8fec.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_28%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**🌈 步骤四：安装模型**

按下键盘上的win+R，调出运行窗口，输入cmd回车，调出命令行窗口。

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300521-ef78c0de-206f-422c-a4ca-5424851467db.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_12%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**把复制的代码“ollama run deepseek-r1:1.5b”粘贴到命令行中，再点击回车，如下图所示。**

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300641-d0069cec-63a2-4b88-9e33-8e1b2020a081.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

按回车键之后，就会开始安装，会有百分比的进度条，如下图所示

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300655-f5678259-13e7-47e1-8f9f-b0cb75ab8522.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

跑到了100%之后，就代表安装完成了，就可以和他对话了。

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300734-6fe32845-556f-464e-ba5e-9eecb18faf4b.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**🌈 步骤四：安装可视化工具：chatbox**

是时候告别黑乎乎的窗口了！咱们请出颜值担当：

🔥 ChatBox客户端
▌官网直达：https://chatboxai.app

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300843-12bb2525-70cc-42f3-a774-a56c2c0317e4.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

安装姿势：

1. 点击免费下载后，解压后双击ChatBoxSetup.exe
2. 自定义安装路径（别放C盘！建议装D盘）
3. Chatbox安装好后，打开后，选择“使用自己的 API Key 或本地模型”。

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300852-2a616e68-87d9-41e5-8eb2-f83f6994243e.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_28%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

点击右下角的设置，设置好模型，选择Ollama API，最后选择已经安装好的模型就可以了。

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743301011-df586ec5-d1c0-451b-a840-88ee4b61006f.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_31%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)
