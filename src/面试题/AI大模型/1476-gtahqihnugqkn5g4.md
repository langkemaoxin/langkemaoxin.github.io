---
title: "QWQ-32B本地部署教程"
sidebarGroup: "AI大模型"
shortTitle: "QWQ-32B本地部署教程"
order: 1476
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "deepseek国内大模型一哥的位置都没坐热， 阿里就推出了qwq-32b， 性能差不多，相比deepeseek满血版的6710亿参数， qwq-32b只有320亿参数， 成本降低了20倍，本地部署成本只需要一张消费级显卡RXT8090即可"
article: false
---

> 来源：[QWQ-32B本地部署教程](https://www.yuque.com/tulingzhouyu/db22bv/gtahqihnugqkn5g4)

deepseek国内大模型一哥的位置都没坐热， 阿里就推出了qwq-32b， 性能差不多，相比deepeseek满血版的6710亿参数， qwq-32b只有320亿参数， 成本降低了20倍，本地部署成本只需要一张消费级显卡RXT8090即可，**那么本地部署的需求也随之而来，很多人是有这个需求的。**

其实很简单，几分钟就可以安装完。

**🚀 十分钟搞定！Windows电脑玩转DeepSeek本地部署**

**🌈 步骤一：安装灵魂工具Ollama**
▌官网下载直通车：👉 https://ollama.com

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300127-433b94b7-4509-4f69-bb6f-f7ebb5d66b53.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_24%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

操作就像安装QQ一样简单，点击Download

1. 双击下载的.exe安装包
2. 狂点「下一步」直到完成

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300113-5a08960f-dc7f-4099-9644-59426dcb73ae.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_10%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

🌈** 步骤二：回到ollama的官网，搜索框里搜索qwq，选择要安装的模型**

![image](https://cdn.nlark.com/yuque/0/2025/png/22309163/1741267966136-47319a75-6954-4005-985b-7cdbfaf7a640.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_21%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

只有一个32b版本，  需要20G存储空间，  至少32G运行内存，  一张H100或者RXT8090即可

**🌈 步骤三：复制右边的这串代码“ollama run qwq”**

![image](https://cdn.nlark.com/yuque/0/2025/png/22309163/1741268046537-b39119b3-be1c-48fd-a2b4-087279c01e85.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_29%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**🌈 步骤四：安装模型**

按下键盘上的win+R，调出运行窗口，输入cmd回车，调出命令行窗口。

![image](https://cdn.nlark.com/yuque/0/2025/png/22811459/1738743300521-ef78c0de-206f-422c-a4ca-5424851467db.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_12%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

**把复制的代码“ollama run qwq”粘贴到命令行中，再点击回车，如下图所示。**

![image](https://cdn.nlark.com/yuque/0/2025/png/22309163/1741268161019-bf1307ea-3460-4598-a47f-e08c3a9302bc.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

按回车键之后，就会开始安装，会有百分比的进度条，如下图所示

![image](https://cdn.nlark.com/yuque/0/2025/png/22309163/1741268172068-3a2ae24c-4eff-4ff8-83fe-6e333561a770.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_42%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)

跑到了100%之后，就代表安装完成了，就可以和他对话了。

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

![image](https://cdn.nlark.com/yuque/0/2025/png/22309163/1741268365398-edf0eea2-420d-4094-8cc4-bb3e4be914a8.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_54%2Ctext_5Zu-54G16K--5aCC%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10)
