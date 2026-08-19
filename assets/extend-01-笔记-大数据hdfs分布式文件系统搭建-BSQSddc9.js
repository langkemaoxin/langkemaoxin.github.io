import{a as e,c as t,i as n}from"./app-BIwnH469.js";import{t as r}from"./plugin-vue_export-helper-BDNMzG2s.js";var i=JSON.parse(`{"path":"/%E4%BA%91%E5%8E%9F%E7%94%9F/extend/extend-01-%E7%AC%94%E8%AE%B0-%E5%A4%A7%E6%95%B0%E6%8D%AEhdfs%E5%88%86%E5%B8%83%E5%BC%8F%E6%96%87%E4%BB%B6%E7%B3%BB%E7%BB%9F%E6%90%AD%E5%BB%BA.html","title":"【笔记】大数据HDFS分布式文件系统搭建","lang":"zh-CN","frontmatter":{"title":"【笔记】大数据HDFS分布式文件系统搭建","sidebarGroup":"扩展专题","shortTitle":"01 【笔记】大数据HDFS分布式文件系统搭建","order":1,"date":"2026-08-13T00:00:00.000Z","category":"云原生","tag":["大数据与 ML","云原生","课程笔记"],"description":"1.1 大数据HDFS分布式文件系统搭建 这里我们使用5台节点来安装分布式文件系统，每台节点给了4G内存，4个core，并且每台节点已经关闭防火墙、配置主机名、设置yum源、各个节点时间同步、各个节点...","head":[["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"【笔记】大数据HDFS分布式文件系统搭建\\",\\"image\\":[\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1666918405095/222e6bbeeb6942d3bd453576c2ace737.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1666918405095/ccb112a251d042408f66f52db1155be7.png\\"],\\"datePublished\\":\\"2026-08-13T00:00:00.000Z\\",\\"dateModified\\":\\"2026-08-14T02:04:51.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Corey\\",\\"url\\":\\"https://www.code-corey.com\\"}]}"],["meta",{"property":"og:url","content":"https://www.code-corey.com/%E4%BA%91%E5%8E%9F%E7%94%9F/extend/extend-01-%E7%AC%94%E8%AE%B0-%E5%A4%A7%E6%95%B0%E6%8D%AEhdfs%E5%88%86%E5%B8%83%E5%BC%8F%E6%96%87%E4%BB%B6%E7%B3%BB%E7%BB%9F%E6%90%AD%E5%BB%BA.html"}],["meta",{"property":"og:site_name","content":"Corey 知识库"}],["meta",{"property":"og:title","content":"【笔记】大数据HDFS分布式文件系统搭建"}],["meta",{"property":"og:description","content":"1.1 大数据HDFS分布式文件系统搭建 这里我们使用5台节点来安装分布式文件系统，每台节点给了4G内存，4个core，并且每台节点已经关闭防火墙、配置主机名、设置yum源、各个节点时间同步、各个节点..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:image","content":"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1666918405095/222e6bbeeb6942d3bd453576c2ace737.png"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2026-08-14T02:04:51.000Z"}],["meta",{"property":"article:tag","content":"课程笔记"}],["meta",{"property":"article:tag","content":"云原生"}],["meta",{"property":"article:tag","content":"大数据与 ML"}],["meta",{"property":"article:published_time","content":"2026-08-13T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2026-08-14T02:04:51.000Z"}]]},"git":{"createdTime":1786673091000,"updatedTime":1786673091000,"contributors":[{"name":"chengongyi","username":"chengongyi","email":"2363613998@qq.com","commits":1,"url":"https://github.com/chengongyi"},{"name":"Cursor","username":"Cursor","email":"cursoragent@cursor.com","commits":1,"url":"https://github.com/Cursor"}]},"readingTime":{"minutes":6.73,"words":2019},"filePathRelative":"云原生/extend/extend-01-笔记-大数据hdfs分布式文件系统搭建.md","excerpt":"<blockquote>\\n<p><strong>大数据与 ML · 第 1 篇</strong></p>\\n<p>来源课程笔记整理优化；插图已迁入博客静态目录。</p>\\n</blockquote>\\n<hr>\\n<h2><strong>1.1 大数据HDFS分布式文件系统搭建</strong></h2>\\n<p>这里我们使用5台节点来安装分布式文件系统，每台节点给了4G内存，4个core，并且每台节点已经关闭防火墙、配置主机名、设置yum源、各个节点时间同步、各个节点两两免密、安装JDK操作。5台节点信息如下：</p>\\n<table>\\n<thead>\\n<tr>\\n<th><strong>节点IP</strong></th>\\n<th><strong>节点名称</strong></th>\\n</tr>\\n</thead>\\n<tbody>\\n<tr>\\n<td>192.168.179.4</td>\\n<td>node1</td>\\n</tr>\\n<tr>\\n<td>192.168.179.5</td>\\n<td>node2</td>\\n</tr>\\n<tr>\\n<td>192.168.179.6</td>\\n<td>node3</td>\\n</tr>\\n<tr>\\n<td>192.168.179.7</td>\\n<td>node4</td>\\n</tr>\\n<tr>\\n<td>192.168.179.8</td>\\n<td>node5</td>\\n</tr>\\n</tbody>\\n</table>"}`),a={name:`extend-01-笔记-大数据hdfs分布式文件系统搭建.md`};function o(r,i,a,o,s,c){return t(),n(`div`,null,[...i[0]||=[e(`<blockquote><p><strong>大数据与 ML · 第 1 篇</strong></p><p>来源课程笔记整理优化；插图已迁入博客静态目录。</p></blockquote><hr><h2 id="_1-1-大数据hdfs分布式文件系统搭建" tabindex="-1"><a class="header-anchor" href="#_1-1-大数据hdfs分布式文件系统搭建"><span><strong>1.1 大数据HDFS分布式文件系统搭建</strong></span></a></h2><p>这里我们使用5台节点来安装分布式文件系统，每台节点给了4G内存，4个core，并且每台节点已经关闭防火墙、配置主机名、设置yum源、各个节点时间同步、各个节点两两免密、安装JDK操作。5台节点信息如下：</p><table><thead><tr><th><strong>节点IP</strong></th><th><strong>节点名称</strong></th></tr></thead><tbody><tr><td>192.168.179.4</td><td>node1</td></tr><tr><td>192.168.179.5</td><td>node2</td></tr><tr><td>192.168.179.6</td><td>node3</td></tr><tr><td>192.168.179.7</td><td>node4</td></tr><tr><td>192.168.179.8</td><td>node5</td></tr></tbody></table><p>下面一一进行基础技术组件搭建。</p><p>备注：修改阿里镜像源：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#安装wget，wget是linux最常用的下载命令(有些系统默认安装，可忽略)</span></span>
<span class="line"><span>yum -y install wget</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#备份当前的yum源</span></span>
<span class="line"><span>mv /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.backup</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#下载阿里云的yum源配置</span></span>
<span class="line"><span>wget -O /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-7.repo</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#清除原来文件缓存，构建新加入的repo结尾文件的缓存</span></span>
<span class="line"><span>yum clean all</span></span>
<span class="line"><span>yum makecache</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-1-1-搭建zookeeper" tabindex="-1"><a class="header-anchor" href="#_1-1-1-搭建zookeeper"><span>1.1.1 <strong>搭建Zookeeper</strong></span></a></h3><p>这里搭建zookeeper版本为3.4.13，搭建zookeeper对应的角色分布如下：</p><table><thead><tr><th><strong>节点IP</strong></th><th><strong>节点名称</strong></th><th><strong>Zookeeper</strong></th></tr></thead><tbody><tr><td>192.168.179.4</td><td>node1</td><td></td></tr><tr><td>192.168.179.5</td><td>node2</td><td></td></tr><tr><td>192.168.179.6</td><td>node3</td><td>★</td></tr><tr><td>192.168.179.7</td><td>node4</td><td>★</td></tr><tr><td>192.168.179.8</td><td>node5</td><td>★</td></tr></tbody></table><p>具体搭建步骤如下:</p><ol><li><strong>上传zookeeper并解压,配置环境变量</strong></li></ol><p>在node1,node2,node3,node4,node5各个节点都创建/software目录，方便后期安装技术组件使用。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>mkdir /software</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>将zookeeper安装包上传到node3节点/software目录下并解压：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 software]# tar -zxvf ./zookeeper-3.4.13.tar.gz</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>在node3节点配置环境变量：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#进入vim /etc/profile，在最后加入：</span></span>
<span class="line"><span>export ZOOKEEPER_HOME=/software/zookeeper-3.4.13</span></span>
<span class="line"><span>export PATH=$PATH:$ZOOKEEPER_HOME/bin</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#使配置生效</span></span>
<span class="line"><span>source /etc/profile</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="2"><li><strong>在node3节点配置zookeeper</strong></li></ol><p>进入“/software/zookeeper-3.4.13/conf”修改zoo_sample.cfg为zoo.cfg：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 conf]# mv zoo_sample.cfg  zoo.cfg</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>配置zoo.cfg中内容如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>tickTime=2000</span></span>
<span class="line"><span>initLimit=10</span></span>
<span class="line"><span>syncLimit=5</span></span>
<span class="line"><span>dataDir=/opt/data/zookeeper</span></span>
<span class="line"><span>clientPort=2181</span></span>
<span class="line"><span>server.1=node3:2888:3888</span></span>
<span class="line"><span>server.2=node4:2888:3888</span></span>
<span class="line"><span>server.3=node5:2888:3888</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="3"><li><strong>将配置好的zookeeper发送到node4,node5节点</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>tickTime=2000</span></span>
<span class="line"><span>initLimit=10</span></span>
<span class="line"><span>syncLimit=5</span></span>
<span class="line"><span>dataDir=/opt/data/zookeeper</span></span>
<span class="line"><span>clientPort=2181</span></span>
<span class="line"><span>server.1=node3:2888:3888</span></span>
<span class="line"><span>server.2=node4:2888:3888</span></span>
<span class="line"><span>server.3=node5:2888:3888</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="4"><li><strong>各个节点上创建数据目录，并配置zookeeper环境变量</strong></li></ol><p>在node3,node4,node5各个节点上创建zoo.cfg中指定的数据目录“/opt/data/zookeeper”。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>mkdir -p /opt/data/zookeeper</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>在node4,node5节点配置zookeeper环境变量</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#进入vim /etc/profile，在最后加入：</span></span>
<span class="line"><span>export ZOOKEEPER_HOME=/software/zookeeper-3.4.13</span></span>
<span class="line"><span>export PATH=$PATH:$ZOOKEEPER_HOME/bin</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#使配置生效</span></span>
<span class="line"><span>source /etc/profile</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="5"><li><strong>各个节点创建节点ID</strong></li></ol><p>在node3,node4,node5各个节点路径“/opt/data/zookeeper”中添加myid文件分别写入1,2,3:</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#在node3的/opt/data/zookeeper中创建myid文件写入1</span></span>
<span class="line"><span>#在node4的/opt/data/zookeeper中创建myid文件写入2</span></span>
<span class="line"><span>#在node5的/opt/data/zookeeper中创建myid文件写入3</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="6"><li><strong>各个节点启动zookeeper,并检查进程状态</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#各个节点启动zookeeper命令</span></span>
<span class="line"><span>zkServer.sh start</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#检查各个节点zookeeper进程状态</span></span>
<span class="line"><span>zkServer.sh status</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-1-2-搭建hdfs" tabindex="-1"><a class="header-anchor" href="#_1-1-2-搭建hdfs"><span>1.1.2 <strong>搭建HDFS</strong></span></a></h3><p>这里搭建HDFS版本为3.3.4，搭建HDFS对应的角色在各个节点分布如下：</p><table><thead><tr><th><strong>节点IP</strong></th><th><strong>节点名称</strong></th><th><strong>NN</strong></th><th><strong>DN</strong></th><th><strong>ZKFC</strong></th><th><strong>JN</strong></th><th><strong>RM</strong></th><th><strong>NM</strong></th></tr></thead><tbody><tr><td>192.168.179.4</td><td>node1</td><td>★</td><td></td><td>★</td><td></td><td>★</td><td></td></tr><tr><td>192.168.179.5</td><td>node2</td><td>★</td><td></td><td>★</td><td></td><td>★</td><td></td></tr><tr><td>192.168.179.6</td><td>node3</td><td></td><td>★</td><td></td><td>★</td><td></td><td>★</td></tr><tr><td>192.168.179.7</td><td>node4</td><td></td><td>★</td><td></td><td>★</td><td></td><td>★</td></tr><tr><td>192.168.179.8</td><td>node5</td><td></td><td>★</td><td></td><td>★</td><td></td><td>★</td></tr></tbody></table><p>搭建具体步骤如下：</p><ol><li><strong>各个节点安装HDFS HA自动切换必须的依赖</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>yum -y install psmisc</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><ol start="2"><li><strong>上传下载好的Hadoop安装包到node1节点上，并解压</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 software]# tar -zxvf ./hadoop-3.3.4.tar.gz</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><ol start="3"><li><strong>在node1节点上配置Hadoop的环境变量</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 software]# vim /etc/profile</span></span>
<span class="line"><span>export HADOOP_HOME=/software/hadoop-3.3.4/</span></span>
<span class="line"><span>export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#使配置生效</span></span>
<span class="line"><span>source /etc/profile</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="4"><li><strong>配置$HADOOP_HOME/etc/hadoop下的hadoop-env.sh文件</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#导入JAVA_HOME</span></span>
<span class="line"><span>export JAVA_HOME=/usr/java/jdk1.8.0_181-amd64/</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><ol start="5"><li><strong>配置$HADOOP_HOME/etc/hadoop下的hdfs-site.xml文件</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>&lt;configuration&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!--这里配置逻辑名称，可以随意写 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.nameservices&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;mycluster&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 禁用权限 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.permissions.enabled&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;false&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 配置namenode 的名称，多个用逗号分割  --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.ha.namenodes.mycluster&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;nn1,nn2&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- dfs.namenode.rpc-address.[nameservice ID].[name node ID] namenode 所在服务器名称和RPC监听端口号  --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.namenode.rpc-address.mycluster.nn1&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node1:8020&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- dfs.namenode.rpc-address.[nameservice ID].[name node ID] namenode 所在服务器名称和RPC监听端口号  --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.namenode.rpc-address.mycluster.nn2&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node2:8020&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- dfs.namenode.http-address.[nameservice ID].[name node ID] namenode 监听的HTTP协议端口 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.namenode.http-address.mycluster.nn1&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node1:50070&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- dfs.namenode.http-address.[nameservice ID].[name node ID] namenode 监听的HTTP协议端口 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.namenode.http-address.mycluster.nn2&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node2:50070&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- namenode 共享的编辑目录， journalnode 所在服务器名称和监听的端口 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.namenode.shared.edits.dir&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;qjournal://node3:8485;node4:8485;node5:8485/mycluster&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- namenode高可用代理类 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.client.failover.proxy.provider.mycluster&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;org.apache.hadoop.hdfs.server.namenode.ha.ConfiguredFailoverProxyProvider&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 使用ssh 免密码自动登录 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.ha.fencing.methods&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;sshfence&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.ha.fencing.ssh.private-key-files&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;/root/.ssh/id_rsa&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- journalnode 存储数据的地方 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.journalnode.edits.dir&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;/opt/data/journal/node/local/data&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 配置namenode自动切换 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;dfs.ha.automatic-failover.enabled&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;true&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;/configuration&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="6"><li><strong>配置$HADOOP_HOME/ect/hadoop/core-site.xml</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>&lt;configuration&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 为Hadoop 客户端配置默认的高可用路径  --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;fs.defaultFS&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;hdfs://mycluster&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- Hadoop 数据存放的路径，namenode,datanode 数据存放路径都依赖本路径，不要使用 file:/ 开头，使用绝对路径即可</span></span>
<span class="line"><span>            namenode 默认存放路径 ：file://\${hadoop.tmp.dir}/dfs/name</span></span>
<span class="line"><span>            datanode 默认存放路径 ：file://\${hadoop.tmp.dir}/dfs/data</span></span>
<span class="line"><span>        --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;hadoop.tmp.dir&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;/opt/data/hadoop/&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 指定zookeeper所在的节点 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;ha.zookeeper.quorum&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node3:2181,node4:2181,node5:2181&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>&lt;/configuration&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="7"><li><strong>配置$HADOOP_HOME/etc/hadoop/yarn-site.xml</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>&lt;configuration&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.nodemanager.aux-services&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;mapreduce_shuffle&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.nodemanager.env-whitelist&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;JAVA_HOME,HADOOP_COMMON_HOME,HADOOP_HDFS_HOME,HADOOP_CONF_DIR,CLASSPATH_PREPEND_DISTCACHE,HADOOP_YARN_HOME,HADOOP_MAPRED_HOME&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 配置yarn为高可用 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.resourcemanager.ha.enabled&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;true&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 集群的唯一标识 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.resourcemanager.cluster-id&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;mycluster&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!--  ResourceManager ID --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.resourcemanager.ha.rm-ids&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;rm1,rm2&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 指定ResourceManager 所在的节点 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.resourcemanager.hostname.rm1&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node1&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 指定ResourceManager 所在的节点 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.resourcemanager.hostname.rm2&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node2&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 指定ResourceManager Http监听的节点 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.resourcemanager.webapp.address.rm1&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node1:8088&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 指定ResourceManager Http监听的节点 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.resourcemanager.webapp.address.rm2&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node2:8088&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;!-- 指定zookeeper所在的节点 --&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.resourcemanager.zk-address&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;node3:2181,node4:2181,node5:2181&lt;/value&gt;</span></span>
<span class="line"><span>&lt;/property&gt;</span></span>
<span class="line"><span>&lt;property&gt;</span></span>
<span class="line"><span>       &lt;!-- 关闭虚拟内存检查 --&gt;</span></span>
<span class="line"><span>    &lt;name&gt;yarn.nodemanager.vmem-check-enabled&lt;/name&gt;</span></span>
<span class="line"><span>    &lt;value&gt;false&lt;/value&gt;</span></span>
<span class="line"><span>&lt;/property&gt;</span></span>
<span class="line"><span>	&lt;!-- 启用节点的内容和CPU自动检测，最小内存为1G --&gt;</span></span>
<span class="line"><span>    &lt;!--&lt;property&gt;</span></span>
<span class="line"><span>        &lt;name&gt;yarn.nodemanager.resource.detect-hardware-capabilities&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;true&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;--&gt;</span></span>
<span class="line"><span>&lt;/configuration&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="8"><li><strong>配置$HADOOP_HOME/etc/hadoop/mapred-site.xml</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>&lt;configuration&gt;</span></span>
<span class="line"><span>    &lt;property&gt;</span></span>
<span class="line"><span>        &lt;name&gt;mapreduce.framework.name&lt;/name&gt;</span></span>
<span class="line"><span>        &lt;value&gt;yarn&lt;/value&gt;</span></span>
<span class="line"><span>    &lt;/property&gt;</span></span>
<span class="line"><span>&lt;/configuration&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="9"><li><strong>配置$HADOOP_HOME/etc/hadoop/workers文件</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# vim /software/hadoop-3.3.4/etc/hadoop/workers</span></span>
<span class="line"><span>node3</span></span>
<span class="line"><span>node4</span></span>
<span class="line"><span>node5</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="10"><li><strong>配置$HADOOP_HOME/sbin/start-dfs.sh 和stop-dfs.sh两个文件中顶部添加以下参数，防止启动错误</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>HDFS_DATANODE_USER=root</span></span>
<span class="line"><span>HDFS_DATANODE_SECURE_USER=hdfs</span></span>
<span class="line"><span>HDFS_NAMENODE_USER=root</span></span>
<span class="line"><span>HDFS_JOURNALNODE_USER=root</span></span>
<span class="line"><span>HDFS_ZKFC_USER=root</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="11"><li><strong>配置$HADOOP_HOME/sbin/start-yarn.sh和stop-yarn.sh两个文件顶部添加以下参数，防止启动错误</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>YARN_RESOURCEMANAGER_USER=root</span></span>
<span class="line"><span>YARN_NODEMANAGER_USER=root</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><ol start="12"><li><strong>将配置好的Hadoop安装包发送到其他4个节点</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# scp -r /software/hadoop-3.3.4 node2:/software/</span></span>
<span class="line"><span>[root@node1 ~]# scp -r /software/hadoop-3.3.4 node3:/software/</span></span>
<span class="line"><span>[root@node1 ~]# scp -r /software/hadoop-3.3.4 node4:/software/</span></span>
<span class="line"><span>[root@node1 ~]# scp -r /software/hadoop-3.3.4 node5:/software/</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="13"><li><strong>在node2、node3、node4、node5节点上配置HADOOP_HOME</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#分别在node2、node3、node4、node5节点上配置HADOOP_HOME</span></span>
<span class="line"><span>vim /etc/profile</span></span>
<span class="line"><span>export HADOOP_HOME=/software/hadoop-3.3.4/</span></span>
<span class="line"><span>export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#最后记得Source</span></span>
<span class="line"><span>source /etc/profile</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="14"><li><strong>启动HDFS和Yarn</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#在node3,node4,node5节点上启动zookeeper</span></span>
<span class="line"><span>zkServer.sh start</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#在node1上格式化zookeeper</span></span>
<span class="line"><span>[root@node1 ~]# hdfs zkfc -formatZK</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#在每台journalnode中启动所有的journalnode,这里就是node3,node4,node5节点上启动</span></span>
<span class="line"><span>hdfs --daemon start journalnode</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#在node1中格式化namenode</span></span>
<span class="line"><span>[root@node1 ~]# hdfs namenode -format</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#在node1中启动namenode,以便同步其他namenode</span></span>
<span class="line"><span>[root@node1 ~]# hdfs --daemon start namenode</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#高可用模式配置namenode,使用下列命令来同步namenode(在需要同步的namenode中执行，这里就是在node2上执行):</span></span>
<span class="line"><span>[root@node2 software]# hdfs namenode -bootstrapStandby</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#node1上启动HDFS,启动Yarn</span></span>
<span class="line"><span>[root@node1 sbin]# start-dfs.sh</span></span>
<span class="line"><span>[root@node1 sbin]# start-yarn.sh</span></span>
<span class="line"><span>注意以上也可以使用start-all.sh命令启动Hadoop集群。</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="15"><li><strong>访问WebUI</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#访问HDFS : http://node1:50070</span></span>
<span class="line"><span>#访问Yarn WebUI ：http://node1:8088</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1666918405095/222e6bbeeb6942d3bd453576c2ace737.png" alt="image.png" loading="lazy"></p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1666918405095/ccb112a251d042408f66f52db1155be7.png" alt="image.png" loading="lazy"></p><ol start="18"><li><strong>停止集群</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#停止集群 </span></span>
<span class="line"><span>[root@node1 ~]# stop-dfs.sh </span></span>
<span class="line"><span>[root@node1 ~]# stop-yarn.sh</span></span>
<span class="line"><span>注意：以上也可以使用 stop-all.sh 停止集群。</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,74)]])}var s=r(a,[[`render`,o]]);export{i as _pageData,s as default};