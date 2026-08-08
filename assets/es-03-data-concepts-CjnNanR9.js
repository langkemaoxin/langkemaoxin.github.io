import{a as e,c as t,i as n,r}from"./app-Bmbm5M5z.js";import{t as i}from"./plugin-vue_export-helper-BDNMzG2s.js";var a=JSON.parse(`{"path":"/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/es-03-data-concepts.html","title":"ES 核心概念与基础数据管理","lang":"zh-CN","frontmatter":{"title":"ES 核心概念与基础数据管理","sidebarGroup":"Elasticsearch","shortTitle":"03 核心概念与数据管理","order":3,"date":"2026-10-22T00:00:00.000Z","category":"中间件","tag":["Elasticsearch","中间件"],"description":"Elasticsearch 系列 · 第 3/10 篇 下一篇预告：《Elasticsearch Query DSL 实战》 开头：场景与目标 MySQL 的 LIKE '%关键词%' 无法支撑亿级文档的全文检索。本篇从倒排索引、Mapping、文档 CRUD、Bulk 导入到索引别名，系统梳理 ES 核心概念与数据管理。 第 1 页 Elastics...","head":[["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"ES 核心概念与基础数据管理\\",\\"image\\":[\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p02-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p03-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p05-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p06-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p07-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p08-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p09-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p10-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p11-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p12-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p13-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p14-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p15-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p16-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p17-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p18-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p19-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p20-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p21-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p22-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p23-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p24-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p25-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p26-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p27-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p28-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p29-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p30-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p31-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p32-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p33-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p34-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p35-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p36-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p37-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p38-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p39-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p40-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p41-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p42-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p43-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p44-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p45-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p46-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p47-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p48-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p49-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p50-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p51-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p52-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p53-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p54-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p55-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p56-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p57-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p58-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p59-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p60-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p61-page.png\\",\\"https://www.code-corey.com/中间件/elasticsearch/46-6/p62-page.png\\"],\\"datePublished\\":\\"2026-10-22T00:00:00.000Z\\",\\"dateModified\\":\\"2026-08-08T16:02:17.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Corey\\",\\"url\\":\\"https://www.code-corey.com\\"}]}"],["meta",{"property":"og:url","content":"https://www.code-corey.com/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/es-03-data-concepts.html"}],["meta",{"property":"og:site_name","content":"Corey 知识库"}],["meta",{"property":"og:title","content":"ES 核心概念与基础数据管理"}],["meta",{"property":"og:description","content":"Elasticsearch 系列 · 第 3/10 篇 下一篇预告：《Elasticsearch Query DSL 实战》 开头：场景与目标 MySQL 的 LIKE '%关键词%' 无法支撑亿级文档的全文检索。本篇从倒排索引、Mapping、文档 CRUD、Bulk 导入到索引别名，系统梳理 ES 核心概念与数据管理。 第 1 页 Elastics..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:image","content":"https://www.code-corey.com/中间件/elasticsearch/46-6/p02-page.png"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2026-08-08T16:02:17.000Z"}],["meta",{"property":"article:tag","content":"中间件"}],["meta",{"property":"article:tag","content":"Elasticsearch"}],["meta",{"property":"article:published_time","content":"2026-10-22T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2026-08-08T16:02:17.000Z"}]]},"git":{"createdTime":1786204937000,"updatedTime":1786204937000,"contributors":[{"name":"langkemaoxin","username":"langkemaoxin","email":"2363613998@qq.com","commits":1,"url":"https://github.com/langkemaoxin"},{"name":"Cursor","username":"Cursor","email":"cursoragent@cursor.com","commits":1,"url":"https://github.com/Cursor"}]},"readingTime":{"minutes":38.3,"words":11490},"filePathRelative":"中间件/elasticsearch/es-03-data-concepts.md","excerpt":"<blockquote>\\n<p><strong>Elasticsearch 系列 · 第 3/10 篇</strong><br>\\n下一篇预告：<a href=\\"/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/es-04-query-dsl\\">《Elasticsearch Query DSL 实战》</a></p>\\n</blockquote>\\n<hr>\\n<h2>开头：场景与目标</h2>\\n<p>MySQL 的 <code>LIKE '%关键词%'</code> 无法支撑亿级文档的全文检索。本篇从倒排索引、Mapping、文档 CRUD、Bulk 导入到索引别名，系统梳理 ES 核心概念与数据管理。</p>","autoDesc":true}`),o={name:`es-03-data-concepts.md`};function s(i,a,o,s,c,l){return t(),n(`div`,null,[a[0]||=e(`<blockquote><p><strong>Elasticsearch 系列 · 第 3/10 篇</strong><br> 下一篇预告：<a href="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/es-04-query-dsl">《Elasticsearch Query DSL 实战》</a></p></blockquote><hr><h2 id="开头-场景与目标" tabindex="-1"><a class="header-anchor" href="#开头-场景与目标"><span>开头：场景与目标</span></a></h2><p>MySQL 的 <code>LIKE &#39;%关键词%&#39;</code> 无法支撑亿级文档的全文检索。本篇从倒排索引、Mapping、文档 CRUD、Bulk 导入到索引别名，系统梳理 ES 核心概念与数据管理。</p><h3 id="第-1-页" tabindex="-1"><a class="header-anchor" href="#第-1-页"><span>第 1 页</span></a></h3><p>Elasticsearch功能的核心是搜索引擎，学习搜索引擎的基础知识对于加深Elasticsearch核心概念的理解大有裨益。</p><p>全文检索（Full-Text Search）是一种从大量文本数据中快速检索出包含指定词汇或短语的信息的技术。它允许用户输入一个或多个关键词，然后系统会在预先建立好的索引中查找包含这些关键词的文档或文档片段，并返回给用户。</p><p>全文检索广泛应用于各种信息管理系统和应用中，如搜索引擎、文档管理系统、电子邮件客户端、新闻聚合网站等。它可以帮助用户快速定位所需信息，提高检索效率和准确性。</p><p>查询：有明确的搜索条件边界。比如，年龄 15~25 岁，颜色 = 红色，价格 &lt; 3000，这里的 15、25、红色、3000 都是条件边界。即有明确的范围界定。</p><p>检索：即全文检索，无搜索条件边界，召回结果取决于相关性，其相关性计算无明确边界性条件，</p><p>如同义词、谐音、别名、错别字、混淆词、网络热梗等均可成为其相关性判断依据。</p><p>设想一个关于全文检索的场景，比如搜索Java设计模式：</p><ol><li>ElasticSearch核心概念1.1 搜索引擎基础知识什么是全文检索</li></ol><h3 id="第-2-页" tabindex="-1"><a class="header-anchor" href="#第-2-页"><span>第 2 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p02-page.png" alt="Elasticsearch 教程配图（46-6 第2页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第2页 图1）</figcaption></figure><p>思考：用传统关系型数据库实现有什么问题？</p><p>如果是用MySQL存储文章 ，我们应该会使用这样的 SQL 去查询这种需要遍历所有的记录进行匹配，不但效率低，而且搜索结果不符合我们搜索时的期望。</p><p>全文检索实现原理1）在全文检索中，首先需要对文本数据进行处理，包括分词、去除停用词等。然后，对处理后的文本数据建立索引，索引会记录每个单词在文档中的位置信息以及其他相关的元数据，如词频、权重等。</p><p>这个过程通常使用倒排索引（inverted index）来实现，倒排索引将单词映射到包含该单词的文档列表中，以便快速定位相关文档。</p><ul><li>2）当用户发起搜索请求时，搜索引擎会根据用户提供的关键词或短语，在建立好的索引中查找匹配的文档。搜索引擎会根据索引中的信息计算文档的相关性，并按照相关性排序返回搜索结果。用户可以通过不同的搜索策略和过滤条件来精确控制搜索结果的质量和范围。</li></ul><p>id标题描述1Java中的23种设计模式Java中23种设计模式，包括简单介绍,适用场景以及优缺点等2Java多线程设计模式Java多线程与设计模式结合3设计模式之美结合真实项目案例，从面向对象编程范式、设计原则、代码规范、重构技巧和设计模式5个方面详细介绍如何编写高质量代码。</p><p>4JavaScript设计模式与开发实践针对JavaScript语言特性全面介绍了更适合JavaScript程序员的了16个常用的设计模式...</p><p>...</p><p>...</p><p>10亿Java并发编程实战深入浅出地介绍了Java线程和并发，是一本完美的Java并发参考手册...</p><p>...</p><p>...</p><p>select * from t_blog where content like &quot;%Java设计模式%&quot;1</p><h3 id="第-3-页" tabindex="-1"><a class="header-anchor" href="#第-3-页"><span>第 3 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p03-page.png" alt="Elasticsearch 教程配图（46-6 第3页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第3页 图1）</figcaption></figure><p>在一个文档集合中，每个文档都可视为一个词语的集合，倒排索引则是将词语映射到包含这个词语的文档的数据结构。</p><p>正排索引（Forward Index）和倒排索引（Inverted Index）是全文检索中常用的两种索引结构，它们在索引和搜索的过程中扮演不同的角色。</p><p>正排索引（正向索引）正排索引是将文档按顺序排列并进行编号的索引结构。每个文档都包含了完整的文本内容，以及其他相关的属性或元数据，如标题、作者、发布日期等。在正排索引中，可以根据文档编号或其他属性快速定位和访问文档的内容。正排索引适合用于需要对文档进行整体检索和展示的场景，但对于包含大量文本内容的数据集来说，正排索引的存储和查询效率可能会受到限制。</p><p>在MySQL 中通过 ID 查找就是一种正排索引的应用。</p><p>倒排索引（反向索引）倒排索引是根据单词或短语建立的索引结构。它将每个单词映射到包含该单词的文档列表中。倒排索引的建立过程是先对文档进行分词处理，然后记录每个单词在哪些文档中出现，以及出现的位置信息。通过倒排索引，可以根据关键词或短语快速找到包含这些词语的文档，并确定它们的相关性。倒排索引适用于在大规模文本数据中进行关键词搜索和相关性排序的场景，它能够快速定位文档，提高搜索效率。</p><p>我们在创建文章的时候，建立一个关键词与文章的对应关系表，就可以称之为倒排索引。如下图所示：</p><p>倒排索引的实现涉及到多个步骤：</p><ul><li><p>1）文档预处理：对文档进行分词处理，移除停用词，并进行词干提取等操作。</p></li><li><p>2）构建词典：将处理后的词汇添加到词典中，并为每个词汇分配一个唯一的ID。</p></li><li><ol start="3"><li>创建倒排列表：对于词典中的每个词汇，创建一个倒排列表，记录该词汇在哪些文档中出现，以及出现的位置信息。</li></ol></li><li><p>4）存储索引文件：将词典和倒排列表存储在磁盘上的索引文件中，通常会进行压缩处理以减小存储空间并提升查询效率。</p></li><li><p>5）查询处理：当用户发起搜索请求时，搜索引擎会从词典中查找每个关键词对应的倒排列表，并根据列表中的文档ID快速定位到包含这些关键词的文档。</p></li></ul><p>什么是倒排索引关键词文章ID是否命中索引Java1,2√设计模式1,2,3,4√多线程2</p><p>JavaScript4</p><h3 id="第-4-页" tabindex="-1"><a class="header-anchor" href="#第-4-页"><span>第 4 页</span></a></h3><p>我们可以对比MySQL来理解Elasticsearch，如下图所示。左侧是MySQL的基本概念，右侧是Elasticsearch对应的相似概念的定义。借由这种对比，我们可以更直观地看出Elasticsearch与传统数据库之间的关系及差异。</p><p>注意：在Elasticsearch 6.X之前的版本中，索引类似于SQL数据库，而type（类型）类似于表。然而，</p><p>从ES 7.x版本开始，类型已经被弃用，一个索引只能包含一个文档类型。</p><p>索引是Elasticsearch中用于存储和管理相关数据的逻辑容器。索引可以看作数据库中的一个表，它包含了一组具有相似结构的文档。在Elasticsearch中，数据以JSON格式的文档存储在索引内。每个索引具有唯一的名称，以便在执行搜索、更新和删除操作时进行引用。索引的名称可以由用户自定义，但必须全部小写。总之，索引是Elasticsearch中用于组织、存储和检索数据的一个核心概念。通过将数据划分为不同的索引，用户可以更有效地管理和查询相关数据。</p><p>不少初学者对映射(Mapping)这个概念会感觉不好理解。映射类似于关系型数据库中的Schema，可以近似地理解为“表结构”。</p><p>映射的定义如下所示：</p><h3 id="_1-2-elasticsearch常用术语索引映射" tabindex="-1"><a class="header-anchor" href="#_1-2-elasticsearch常用术语索引映射"><span>1.2 ElasticSearch常用术语索引映射</span></a></h3><h3 id="第-5-页" tabindex="-1"><a class="header-anchor" href="#第-5-页"><span>第 5 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p05-page.png" alt="Elasticsearch 教程配图（46-6 第5页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第5页 图1）</figcaption></figure><p>我们拿到一个业务需求后，往往会将业务细分会几个索引。每个索引都需要一个相对固定的表结构，</p><p>包含但不限于字段名称、字段类型、是否需要分词、是否需要索引、是否需要存储、是否需要多字段类型等。这些都是设计映射时要考虑的问题。</p><p>关系型数据库将数据以行或元组为单位存储在数据库表中，而Elasticsearch将数据以文档为单位存储在索引中。作为Elasticsearch的基本存储单元，文档是指存储在Elasticsearch索引中的JSON对象。文档中的数据由键值对构成。键是字段的名称，值是不同数据类型的字段。不同的数据类型包含但不限于字符串类型、数字类型、布尔类型、对象类型等。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /employee</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;keyword&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;sex&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;integer&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;age&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;integer&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;address&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;,</span></span>
<span class="line"><span>&quot;analyzer&quot;: &quot;ik_max_word&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;remark&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;,</span></span>
<span class="line"><span>&quot;analyzer&quot;: &quot;ik_smart&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>文档</p><h3 id="第-6-页" tabindex="-1"><a class="header-anchor" href="#第-6-页"><span>第 6 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p06-page.png" alt="Elasticsearch 教程配图（46-6 第6页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第6页 图1）</figcaption></figure><p>文档元数据，用于标注文档的相关信息：</p><p>索引是具有相同结构的文档的集合，由唯一索引名称标定。一个集群中有多个索引，不同的索引代表不同的业务类型数据。下面列举一些应用索引的实战场景。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>{</span></span>
<span class="line"><span>&quot;_index&quot;: &quot;employee&quot;,</span></span>
<span class="line"><span>&quot;_id&quot;: &quot;2&quot;,</span></span>
<span class="line"><span>&quot;_version&quot;: 1,</span></span>
<span class="line"><span>&quot;_seq_no&quot;: 1,</span></span>
<span class="line"><span>&quot;_primary_term&quot;: 1,</span></span>
<span class="line"><span>&quot;found&quot;: true,</span></span>
<span class="line"><span>&quot;_source&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: &quot;李四&quot;,</span></span>
<span class="line"><span>&quot;sex&quot;: 1,</span></span>
<span class="line"><span>&quot;age&quot;: 28,</span></span>
<span class="line"><span>&quot;address&quot;: &quot;广州荔湾大厦&quot;,</span></span>
<span class="line"><span>&quot;remark&quot;: &quot;java assistant&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>_index：文档所属的索引名_type：文档所属的类型名_id：文档唯一id_source: 文档的原始Json数据_version: 文档的版本号，修改删除操作_version都会自增1_seq_no: 和_version一样，一旦数据发生更改，数据也一直是累计的。Shard级别严格递增，保证后写入的Doc的_seq_no大于先写入的Doc的_seq_no。</p><p>_primary_term: _primary_term主要是用来恢复数据时处理当多个文档的_seq_no一样时的冲突，避免PrimaryShard上的写入被覆盖。每当Primary Shard发生重新分配时，比如重启，Primary选举等，_primary_term会递增1。</p><ol start="2"><li>ElasticSearch索引操作详解2.1 索引的实战场景场景一：将采集的不同业务类型的数据存储到不同的索引微博业务对应的索引weibo_index。</li></ol><p>新闻业务对应的索引news_index。</p><p>a.</p><p>b.</p><h3 id="第-7-页" tabindex="-1"><a class="header-anchor" href="#第-7-页"><span>第 7 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p07-page.png" alt="Elasticsearch 教程配图（46-6 第7页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第7页 图1）</figcaption></figure><p>以上3个索引包含的字段个数、字段名称、字段类型可能不完全一致。</p><p>以上logs_202407、logs_202408属于一类索引，只是考虑到日志新旧重要程度、数据量规模、索引分片大小和检索性能，按照时间维度进行了切分。</p><p>创建索引的基本语法创建索引的基本语法如下：</p><p>必要的参数：</p><p>索引名称必须是小写字母，可以包含数字和下划线。</p><ul><li>1)分片数量 (number_of_shards)一个索引的分片数决定了索引的并行度和数据分布。</li></ul><p>示例：</p><p>博客业务对应的索引blog_index。</p><p>场景二：按日期切分存储日志索引2024年7月的日志对应logs_202407。</p><p>2024年8月的日志对应logs_202408。</p><h3 id="_2-2-索引的基本操作创建索引" tabindex="-1"><a class="header-anchor" href="#_2-2-索引的基本操作创建索引"><span>2.2 索引的基本操作创建索引</span></a></h3><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /index_name</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;settings&quot;: {</span></span>
<span class="line"><span>// 索引设置</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>// 字段映射</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>12</p><p>13索引名称 (index_name)索引设置 (settings)c.</p><p>a.</p><p>b.</p><h3 id="第-8-页" tabindex="-1"><a class="header-anchor" href="#第-8-页"><span>第 8 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p08-page.png" alt="Elasticsearch 教程配图（46-6 第8页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第8页 图1）</figcaption></figure><ul><li>2)副本数量 (number_of_replicas)副本提高了数据的可用性和容错能力。</li></ul><p>示例：</p><p>字段属性 (properties)定义索引中文档的字段及其类型。常用字段类型包括：text, keyword, integer,</p><p>float, date 等。</p><p>示例：</p><p>&quot;number_of_shards&quot;: 11</p><p>2</p><p>3&quot;number_of_replicas&quot;: 11映射 (mappings)&quot;properties&quot;: {1&quot;field1&quot;: {2&quot;type&quot;: &quot;text&quot;3</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>},</span></span>
<span class="line"><span>&quot;field2&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;keyword&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>9只定义索引名，而settings、mappings取默认值</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#创建索引</span></span>
<span class="line"><span>PUT /myindex</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>3</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#查看索引</span></span>
<span class="line"><span>GET /myindex</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>6</p><p>7</p><h3 id="第-9-页" tabindex="-1"><a class="header-anchor" href="#第-9-页"><span>第 9 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p09-page.png" alt="Elasticsearch 教程配图（46-6 第9页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第9页 图1）</figcaption></figure><p>创建一个名为 student_index 的索引，并设置以下字段：</p><p>查询操作可以分为两类：检索索引信息和搜索索引中的文档。</p><p>获取索引信息的基本语法如下：</p><p>实践练习：创建一个名为 student_index 的索引，并设置一些自定义字段name（学生姓名）：text 类型age（年龄）：integer 类型enrolled_date(入学日期)：date 类型</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /student_index</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;settings&quot;: {</span></span>
<span class="line"><span>&quot;number_of_shards&quot;: 1,</span></span>
<span class="line"><span>&quot;number_of_replicas&quot;:</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;age&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;integer&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;enrolled_date&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;date&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>22</p><p>23</p><p>24删除索引</p><h3 id="第-10-页" tabindex="-1"><a class="header-anchor" href="#第-10-页"><span>第 10 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p10-page.png" alt="Elasticsearch 教程配图（46-6 第10页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第10页 图1）</figcaption></figure><p>示例搜索索引中的文档的基本语法如下：</p><p>示例</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /index_name</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>2</p><p>3</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 获取名为 myindex的索引的信息：</span></span>
<span class="line"><span>GET myindex</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>3</p><p>4</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /index_name/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>// 查询条件</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><p>8</p><h3 id="第-11-页" tabindex="-1"><a class="header-anchor" href="#第-11-页"><span>第 11 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p11-page.png" alt="Elasticsearch 教程配图（46-6 第11页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第11页 图1）</figcaption></figure><p>查询操作可以分为两类：检索索引信息和搜索索引中的文档。</p><p>获取索引信息的基本语法如下：</p><p>示例搜索索引中的文档的基本语法如下：</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 搜索 name 字段包含 John 的文档</span></span>
<span class="line"><span>GET /student_index/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;match&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: &quot;John&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>11</p><p>12查询索引</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /index_name</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>2</p><p>3</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 获取名为 myindex的索引的信息：</span></span>
<span class="line"><span>GET myindex</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>3</p><p>4</p><h3 id="第-12-页" tabindex="-1"><a class="header-anchor" href="#第-12-页"><span>第 12 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p12-page.png" alt="Elasticsearch 教程配图（46-6 第12页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第12页 图1）</figcaption></figure><p>示例</p><p>动态更新索引的settings部分更新索引设置基本语法</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /index_name/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>// 查询条件</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><p>8</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 搜索 name 字段包含 John 的文档</span></span>
<span class="line"><span>GET /student_index/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;match&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: &quot;John&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>11</p><p>12修改索引</p><h3 id="第-13-页" tabindex="-1"><a class="header-anchor" href="#第-13-页"><span>第 13 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p13-page.png" alt="Elasticsearch 教程配图（46-6 第13页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第13页 图1）</figcaption></figure><p>代码示例将 student_index 的副本数量更新为 2：</p><p>动态更新索引的部分mapping字段信息添加新的字段基本语法</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /index_name/_settings</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;index&quot;: {</span></span>
<span class="line"><span>&quot;setting_name&quot;: &quot;setting_value&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><p>8</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /student_index/_settings</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;index&quot;: {</span></span>
<span class="line"><span>&quot;number_of_replicas&quot;:</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><p>8</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /index_name/_mapping</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;new_field&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;field_type&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>9</p><p>10</p><h3 id="第-14-页" tabindex="-1"><a class="header-anchor" href="#第-14-页"><span>第 14 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p14-page.png" alt="Elasticsearch 教程配图（46-6 第14页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第14页 图1）</figcaption></figure><p>代码示例向 student_index 添加一个名为 grade 的新字段，类型为 integer：</p><p>实践练习向 student_index 添加一个名为 grade 的新字段，类型为 integer，并将副本数量更新为 2。</p><p>创建一个名为 student_index 的索引，并设置以下字段：</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /student_index/_mapping</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;grade&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;integer&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>10</p><p>11</p><p>12name（学生姓名）：text 类型age（年龄）：integer 类型enrolled_date(入学日期)：date 类型</p><h3 id="第-15-页" tabindex="-1"><a class="header-anchor" href="#第-15-页"><span>第 15 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p15-page.png" alt="Elasticsearch 教程配图（46-6 第15页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第15页 图1）</figcaption></figure><p>Elasitcsearch创建索引后，就不允许改索引名了。而在很多业务场景下，单一索引可能无法满足要求，举例如下。</p><p>这两个真实业务场景问题都可以借助索引别名来解决。在很多实际业务场景中，使用别名会很方便、灵活、快捷，且使业务代码松耦合。</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /student_index</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;settings&quot;: {</span></span>
<span class="line"><span>&quot;number_of_shards&quot;: 1,</span></span>
<span class="line"><span>&quot;number_of_replicas&quot;:</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;age&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;integer&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;enrolled_date&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;date&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>22</p><p>23</p><h3 id="_242-3-索引别名详解为什么需要别名场景1-面对pb级别的增量数据-对外提供服务的是基于日期切分的n个不同索引-每次检索都要指定数十个甚至数百个索引-非常麻烦。" tabindex="-1"><a class="header-anchor" href="#_242-3-索引别名详解为什么需要别名场景1-面对pb级别的增量数据-对外提供服务的是基于日期切分的n个不同索引-每次检索都要指定数十个甚至数百个索引-非常麻烦。"><span>242.3 索引别名详解为什么需要别名场景1：面对PB级别的增量数据，对外提供服务的是基于日期切分的n个不同索引，每次检索都要指定数十个甚至数百个索引，非常麻烦。</span></a></h3><p>场景2：线上提供服务的某个索引设计不合理，比如某字段分词定义不准确，那么如何保证对外提供服务不停止，也就是在不更改业务代码的前提下更换索引？</p><h3 id="第-16-页" tabindex="-1"><a class="header-anchor" href="#第-16-页"><span>第 16 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p16-page.png" alt="Elasticsearch 教程配图（46-6 第16页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第16页 图1）</figcaption></figure><p>索引别名可以指向一个或多个索引，并且可以在任何需要索引名称的API中使用。别名提供了极大的灵活性，它允许用户执行以下操作。</p><p>要为现有索引添加别名，可以使用 _aliases API，基本语法如下：</p><p>在正在运行的集群上的一个索引和另一个索引之间进行透明切换。</p><p>对多个索引进行分组组合。例如last_three_months的索引别名就是对过去3个月的索引logstash_202303、logstash_202304、logstash_202305进行的组合。</p><p>在索引中的文档子集上创建“视图”，结合业务场景，缩小了检索范围，自然会提升检索效率。</p><p>如何为索引添加别名创建索引的时候可以指定别名</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT myindex</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;aliases&quot;: {</span></span>
<span class="line"><span>&quot;myindex_alias&quot;: {}</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;settings&quot;: {</span></span>
<span class="line"><span>&quot;refresh_interval&quot;: &quot;30s&quot;,</span></span>
<span class="line"><span>&quot;number_of_shards&quot;: 1,</span></span>
<span class="line"><span>&quot;number_of_replicas&quot;:</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>13为已有索引添加别名</p><h3 id="第-17-页" tabindex="-1"><a class="header-anchor" href="#第-17-页"><span>第 17 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p17-page.png" alt="Elasticsearch 教程配图（46-6 第17页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第17页 图1）</figcaption></figure><p>代码示例</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /_aliases</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;actions&quot;: [</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;add&quot;: {</span></span>
<span class="line"><span>&quot;index&quot;: &quot;index_name&quot;,</span></span>
<span class="line"><span>&quot;alias&quot;: &quot;alias_name&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>]</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>12</p><p>13</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#为 my_index 索引添加一个别名 my_index_alias：</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>3</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /_aliases</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;actions&quot;: [</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;add&quot;: {</span></span>
<span class="line"><span>&quot;index&quot;: &quot;my_index&quot;,</span></span>
<span class="line"><span>&quot;alias&quot;: &quot;my_index_alias&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>]</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>15</p><p>16多索引检索的实现方案不使用别名的方案方式一：使用逗号对多个索引名称进行分隔</p><h3 id="第-18-页" tabindex="-1"><a class="header-anchor" href="#第-18-页"><span>第 18 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p18-page.png" alt="Elasticsearch 教程配图（46-6 第18页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第18页 图1）</figcaption></figure><ul><li><ol><li>使别名关联已有索引示例</li></ol></li></ul><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST tlmall_logs_202401,tlmall_logs_202402,tlmall_logs_202403/_search</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>方式二：使用通配符进行多索引检索</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST tlmall_logs_*/_search</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>3使用别名的方案</p><h3 id="第-19-页" tabindex="-1"><a class="header-anchor" href="#第-19-页"><span>第 19 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p19-page.png" alt="Elasticsearch 教程配图（46-6 第19页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第19页 图1）</figcaption></figure><ul><li><ol start="2"><li>使用别名进行检索示例</li></ol></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT tlmall_logs_202401</span></span>
<span class="line"><span>PUT tlmall_logs_202402</span></span>
<span class="line"><span>PUT tlmall_logs_202403</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>4</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST _aliases</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;actions&quot;: [</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;add&quot;: {</span></span>
<span class="line"><span>&quot;index&quot;: &quot;tlmall_logs_202401&quot;,</span></span>
<span class="line"><span>&quot;alias&quot;: &quot;tlmall_logs_2024&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;add&quot;: {</span></span>
<span class="line"><span>&quot;index&quot;: &quot;tlmall_logs_202402&quot;,</span></span>
<span class="line"><span>&quot;alias&quot;: &quot;tlmall_logs_2024&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;add&quot;: {</span></span>
<span class="line"><span>&quot;index&quot;: &quot;tlmall_logs_202403&quot;,</span></span>
<span class="line"><span>&quot;alias&quot;: &quot;tlmall_logs_2024&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>]</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>28</p><p>29</p><p>30</p><h3 id="第-20-页" tabindex="-1"><a class="header-anchor" href="#第-20-页"><span>第 20 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p20-page.png" alt="Elasticsearch 教程配图（46-6 第20页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第20页 图1）</figcaption></figure><p>思考：使用别名和基于索引的检索效率一样吗？</p><p>若索引和别名指向相同，则在相同检索条件下的检索效率是一致的，因为索引别名只是物理索引的软链接的名称而已。</p><p>注意：</p><ul><li><ol><li>对相同索引别名的物理索引建议有一致的映射，以提升检索效率。</li></ol></li><li><ol start="2"><li>推荐充分发挥索引别名在检索方面的优势，但在写入和更新时还得使用物理索引。</li></ol></li></ul><p>作为Elasticsearch的基本存储单元，文档是指存储在Elasticsearch索引中的JSON对象。</p><p>基本语法在ES8.x中，新增文档的操作可以通过POST或PUT请求完成，具体取决于是否指定了文档的唯一性标识（即ID）。如果在创建数据时指定了唯一性标识，可以使用POST或PUT请求；如果没有指定唯一性标识，只能使用POST请求。</p><p>使用POST请求新增文档当不指定文档ID时，可以使用POST请求来新增文档，Elasticsearch会自动生成一个唯一的ID。语法如下：</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST tlmall_logs_2024/_search</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>3</p><p>4</p><ol start="53"><li>ElasticSearch文档操作详解3.1 文档的介绍3.2 文档的基本操作新增文档新增单个文档</li></ol><h3 id="第-21-页" tabindex="-1"><a class="header-anchor" href="#第-21-页"><span>第 21 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p21-page.png" alt="Elasticsearch 教程配图（46-6 第21页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第21页 图1）</figcaption></figure><p>使用PUT请求新增文档当指定了文档的唯一性标识（ID）时，可以使用PUT请求来新增或更新文档。如果指定的ID在索引中不存在，则会创建一个新文档；如果已存在，则会替换现有文档。语法如下：</p><p>PUT和POST的区别在Elasticsearch 8.x中，PUT和POST请求在新增文档时的行为有所不同，主要体现在以下几个方面：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /&lt;index_name&gt;/_doc</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;field1&quot;: &quot;value1&quot;,</span></span>
<span class="line"><span>&quot;field2&quot;: &quot;value2&quot;,</span></span>
<span class="line"><span>// ... 其他字段</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><p>8</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /&lt;index_name&gt;/_doc/&lt;document_id&gt;</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;field1&quot;: &quot;value1&quot;,</span></span>
<span class="line"><span>&quot;field2&quot;: &quot;value2&quot;,</span></span>
<span class="line"><span>// ... 其他字段</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><p>8指定文档ID：</p><p>PUT请求在创建或更新文档时必须指定文档的唯一ID。如果指定的ID已经存在，PUT请求会替换现有文档；如果不存在，则创建一个新文档。</p><p>POST请求在创建新文档时可以指定ID，也可以不指定。如果不指定ID，Elasticsearch会自动生成一个唯一的ID。</p><p>幂等性：</p><p>PUT请求是幂等的，这意味着多次执行相同的PUT请求，即使是针对同一个文档，最终的结果都是一致的。</p><p>POST请求不是幂等的，多次执行相同的POST请求可能会导致创建多个文档。</p><p>更新行为：</p><p>PUT请求在更新文档时会替换整个文档的内容，即使是文档中未更改的部分也会被新内容覆盖。</p><p>POST请求在更新文档时可以使用_update API，这样可以只更新文档中的特定字段，而不是替换整个文档。</p><ol><li></li><li></li><li></li></ol><h3 id="第-22-页" tabindex="-1"><a class="header-anchor" href="#第-22-页"><span>第 22 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p22-page.png" alt="Elasticsearch 教程配图（46-6 第22页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第22页 图1）</figcaption></figure><p>示例指定ID新增单个文档不指定ID新增单条文档</p><p>基本语法在Elasticsearch 8.x中，批量新增文档可以通过_bulk API来实现。这个API允许您将多个索引、更新或删除操作组合成一个单一的请求，从而提高批量操作的效率。</p><p>以下是使用_bulk API的基本语法：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /employee/_doc/1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;name&quot;: &quot;张三&quot;,</span></span>
<span class="line"><span>&quot;sex&quot;: 1,</span></span>
<span class="line"><span>&quot;age&quot;: 25,</span></span>
<span class="line"><span>&quot;address&quot;: &quot;广州天河公园&quot;,</span></span>
<span class="line"><span>&quot;remark&quot;: &quot;java developer&quot;</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>9</p><p>10</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /employee/_doc</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;name&quot;: &quot;张三&quot;,</span></span>
<span class="line"><span>&quot;sex&quot;: 1,</span></span>
<span class="line"><span>&quot;age&quot;: 25,</span></span>
<span class="line"><span>&quot;address&quot;: &quot;广州天河公园&quot;,</span></span>
<span class="line"><span>&quot;remark&quot;: &quot;java developer&quot;</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>9</p><p>10批量新增文档</p><h3 id="第-23-页" tabindex="-1"><a class="header-anchor" href="#第-23-页"><span>第 23 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p23-page.png" alt="Elasticsearch 教程配图（46-6 第23页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第23页 图1）</figcaption></figure><p>每个操作都是一个独立的JSON对象，这些对象交替出现，形成一个请求体。每个index操作后面跟着的是要索引的文档内容，update操作包含了更新的文档内容和操作类型，而delete操作则直接指明要删除的文档ID。每个操作对象的开头都必须是index、update或delete，并且每个操作之间用一个空行分隔。</p><p>_bulk API支持哪些操作类型？</p><p>Elasticsearch的_bulk API支持以下四种操作类型：</p><p>示例Create: 如果文档不存在则创建，如果文档已存在则返回错误。</p><p>Index: 用于创建新文档或替换已有文档。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /&lt;index_name&gt;/_bulk</span></span>
<span class="line"><span>{ &quot;index&quot; : { &quot;_index&quot; : &quot;&lt;index_name&gt;&quot;, &quot;_id&quot; : &quot;&lt;optional_document_id&gt;&quot; } }</span></span>
<span class="line"><span>{ &quot;field1&quot; : &quot;value1&quot;, &quot;field2&quot; : &quot;value2&quot;, ... }</span></span>
<span class="line"><span>{ &quot;update&quot; : { &quot;_index&quot; : &quot;&lt;index_name&gt;&quot;, &quot;_id&quot; : &quot;&lt;document_id&gt;&quot; } }</span></span>
<span class="line"><span>{ &quot;doc&quot; : {&quot;field1&quot; : &quot;new_value1&quot;, &quot;field2&quot; : &quot;new_value2&quot;, ... }, &quot;_op_type&quot; :</span></span>
<span class="line"><span>&quot;update&quot; }</span></span>
<span class="line"><span>{ &quot;delete&quot; : { &quot;_index&quot; : &quot;&lt;index_name&gt;&quot;, &quot;_id&quot; : &quot;&lt;document_id&gt;&quot; } }</span></span>
<span class="line"><span>{ &quot;index&quot; : { &quot;_index&quot; : &quot;&lt;index_name&gt;&quot;, &quot;_id&quot; : &quot;&lt;optional_document_id&gt;&quot; } }</span></span>
<span class="line"><span>{ &quot;field1&quot; : &quot;value1&quot;, &quot;field2&quot; : &quot;value2&quot;, ... }</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>9</p><p>10</p><p>11Index: 用于创建新文档或替换已有文档。</p><p>Create: 如果文档不存在则创建，如果文档已存在则返回错误。</p><p>Update: 用于更新现有文档。</p><p>Delete: 用于删除指定的文档。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST _bulk</span></span>
<span class="line"><span>{&quot;create&quot;:{&quot;_index&quot;:&quot;article&quot;,&quot;_id&quot;:3}}</span></span>
<span class="line"><span>{&quot;id&quot;:3,&quot;title&quot;:&quot;fox老师&quot;,&quot;content&quot;:&quot;fox老师666&quot;,&quot;tags&quot;:[&quot;java&quot;,&quot;面向对</span></span>
<span class="line"><span>象&quot;],&quot;create_time&quot;:1554015482530}</span></span>
<span class="line"><span>{&quot;create&quot;:{&quot;_index&quot;:&quot;article&quot;,&quot;_id&quot;:4}}</span></span>
<span class="line"><span>{&quot;id&quot;:4,&quot;title&quot;:&quot;mark老师&quot;,&quot;content&quot;:&quot;mark老师NB&quot;,&quot;tags&quot;:[&quot;java&quot;,&quot;面向对</span></span>
<span class="line"><span>象&quot;],&quot;create_time&quot;:1554015482530}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>6</p><p>7</p><h3 id="第-24-页" tabindex="-1"><a class="header-anchor" href="#第-24-页"><span>第 24 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p24-page.png" alt="Elasticsearch 教程配图（46-6 第24页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第24页 图1）</figcaption></figure><ul><li>1）创建员工索引</li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST _bulk</span></span>
<span class="line"><span>{&quot;index&quot;:{&quot;_index&quot;:&quot;article&quot;, &quot;_id&quot;:3}}</span></span>
<span class="line"><span>{&quot;id&quot;:3,&quot;title&quot;:&quot;图灵徐庶老师&quot;,&quot;content&quot;:&quot;图灵学院徐庶老师666&quot;,&quot;tags&quot;:[&quot;java&quot;, &quot;面向对</span></span>
<span class="line"><span>象&quot;],&quot;create_time&quot;:1554015482530}</span></span>
<span class="line"><span>{&quot;index&quot;:{&quot;_index&quot;:&quot;article&quot;,  &quot;_id&quot;:4}}</span></span>
<span class="line"><span>{&quot;id&quot;:4,&quot;title&quot;:&quot;图灵诸葛老师&quot;,&quot;content&quot;:&quot;图灵学院诸葛老师NB&quot;,&quot;tags&quot;:[&quot;java&quot;, &quot;面向对</span></span>
<span class="line"><span>象&quot;],&quot;create_time&quot;:1554015482530}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>6</p><p>7实践练习：批量插入员工信息</p><h3 id="第-25-页" tabindex="-1"><a class="header-anchor" href="#第-25-页"><span>第 25 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p25-page.png" alt="Elasticsearch 教程配图（46-6 第25页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第25页 图1）</figcaption></figure><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /employee</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;settings&quot;: {</span></span>
<span class="line"><span>&quot;number_of_shards&quot;: 1,</span></span>
<span class="line"><span>&quot;number_of_replicas&quot;:</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;keyword&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;sex&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;integer&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;age&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;integer&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;address&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;,</span></span>
<span class="line"><span>&quot;analyzer&quot;: &quot;ik_max_word&quot;,</span></span>
<span class="line"><span>&quot;fields&quot;: {</span></span>
<span class="line"><span>&quot;keyword&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;keyword&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;remark&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;,</span></span>
<span class="line"><span>&quot;analyzer&quot;: &quot;ik_smart&quot;,</span></span>
<span class="line"><span>&quot;fields&quot;: {</span></span>
<span class="line"><span>&quot;keyword&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;keyword&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="第-26-页" tabindex="-1"><a class="header-anchor" href="#第-26-页"><span>第 26 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p26-page.png" alt="Elasticsearch 教程配图（46-6 第26页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第26页 图1）</figcaption></figure><ul><li>2）批量插入员工文档</li></ul><p>基本语法在Elasticsearch 8.x中，根据文档的ID查询单个文档的标准语法是使用GET请求配合文档所在的索引名和文档ID。以下是具体的请求格式：</p><p>40</p><p>41</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /employee/_bulk</span></span>
<span class="line"><span>{&quot;index&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:&quot;1&quot;}}</span></span>
<span class="line"><span>{&quot;name&quot;:&quot;张三&quot;,&quot;sex&quot;:1,&quot;age&quot;:25,&quot;address&quot;:&quot;广州天河公园&quot;,&quot;remark&quot;:&quot;java developer&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:&quot;2&quot;}}</span></span>
<span class="line"><span>{&quot;name&quot;:&quot;李四&quot;,&quot;sex&quot;:1,&quot;age&quot;:28,&quot;address&quot;:&quot;广州荔湾大厦&quot;,&quot;remark&quot;:&quot;java assistant&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:&quot;3&quot;}}</span></span>
<span class="line"><span>{&quot;name&quot;:&quot;王五&quot;,&quot;sex&quot;:0,&quot;age&quot;:26,&quot;address&quot;:&quot;广州白云山公园&quot;,&quot;remark&quot;:&quot;php developer&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:&quot;4&quot;}}</span></span>
<span class="line"><span>{&quot;name&quot;:&quot;赵六&quot;,&quot;sex&quot;:0,&quot;age&quot;:22,&quot;address&quot;:&quot;长沙橘子洲&quot;,&quot;remark&quot;:&quot;python assistant&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:&quot;5&quot;}}</span></span>
<span class="line"><span>{&quot;name&quot;:&quot;张龙&quot;,&quot;sex&quot;:0,&quot;age&quot;:19,&quot;address&quot;:&quot;长沙麓谷企业广场&quot;,&quot;remark&quot;:&quot;java architect</span></span>
<span class="line"><span>assistant&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:&quot;6&quot;}}</span></span>
<span class="line"><span>{&quot;name&quot;:&quot;赵虎&quot;,&quot;sex&quot;:1,&quot;age&quot;:32,&quot;address&quot;:&quot;长沙麓谷兴工国际产业园&quot;,&quot;remark&quot;:&quot;java</span></span>
<span class="line"><span>architect&quot;}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>15</p><p>16</p><p>17查询文档根据id查询文档</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /&lt;index_name&gt;/_doc/&lt;document_id&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>2</p><p>3</p><h3 id="第-27-页" tabindex="-1"><a class="header-anchor" href="#第-27-页"><span>第 27 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p27-page.png" alt="Elasticsearch 教程配图（46-6 第27页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第27页 图1）</figcaption></figure><p>在Elasticsearch 8.x中，使用Multi GET API可以根据ID查询多个文档。该API允许您在单个请求中指定多个文档的ID，并返回这些文档的信息。以下是Multi GET API的基本语法：</p><p>示例根据id从employee索引中检索ID为1的单个文档根据id列表从employee索引中批量检索多个文档基本语法在Elasticsearch 8.x中，查询文档通常使用Query DSL（Domain Specific Language），这是一种基于JSON的语言，用于构建复杂的搜索查询。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /&lt;index_name&gt;/_mget</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;ids&quot; : [&quot;id1&quot;, &quot;id2&quot;, &quot;id3&quot;, ...]</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>5</p><p>6</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /employee/_doc/1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>2</p><p>3</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /employee/_mget</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;ids&quot; : [&quot;1&quot;, &quot;2&quot;, &quot;3&quot;]</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>5</p><p>6根据搜索关键词查询文档</p><h3 id="第-28-页" tabindex="-1"><a class="header-anchor" href="#第-28-页"><span>第 28 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p28-page.png" alt="Elasticsearch 教程配图（46-6 第28页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第28页 图1）</figcaption></figure><p>以下是一些常用的查询语法：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /es_db/_search</span></span>
<span class="line"><span>{json请求体数据}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>3</p><p>4匹配所有文档</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /&lt;index_name&gt;/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;match_all&quot;: {}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7文本字段匹配</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /&lt;index_name&gt;/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;match&quot;: {</span></span>
<span class="line"><span>&quot;&lt;field_name&gt;&quot;: &quot;&lt;query_string&gt;&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>9精确匹配（不分词）</p><h3 id="第-29-页" tabindex="-1"><a class="header-anchor" href="#第-29-页"><span>第 29 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p29-page.png" alt="Elasticsearch 教程配图（46-6 第29页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第29页 图1）</figcaption></figure><p>示例</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /&lt;index_name&gt;/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;term&quot;: {</span></span>
<span class="line"><span>&quot;&lt;field_name&gt;&quot;: {</span></span>
<span class="line"><span>&quot;value&quot;: &quot;&lt;exact_value&gt;&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>11范围查询</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /&lt;index_name&gt;/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;range&quot;: {</span></span>
<span class="line"><span>&quot;&lt;field_name&gt;&quot;: {</span></span>
<span class="line"><span>&quot;gte&quot;: &lt;lower_bound&gt;,</span></span>
<span class="line"><span>&quot;lte&quot;: &lt;upper_bound&gt;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>12</p><h3 id="第-30-页" tabindex="-1"><a class="header-anchor" href="#第-30-页"><span>第 30 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p30-page.png" alt="Elasticsearch 教程配图（46-6 第30页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第30页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#精确匹配, 姓名是张三的员工</span></span>
<span class="line"><span>GET /employee/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;term&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: &quot;张三&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>10</p><p>11</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 全文检索,查询在广州白云山（搜索关键词）的员工</span></span>
<span class="line"><span>GET /employee/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;match&quot;: {</span></span>
<span class="line"><span>&quot;address&quot;: &quot;广州白云山&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>21</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#范围查询, 查询age在20至26岁之间的员工</span></span>
<span class="line"><span>GET /employee/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;range&quot;: {</span></span>
<span class="line"><span>&quot;age&quot;: {</span></span>
<span class="line"><span>&quot;gte&quot;: 20,</span></span>
<span class="line"><span>&quot;lte&quot;:</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>34</p><p>35删除文档</p><h3 id="第-31-页" tabindex="-1"><a class="header-anchor" href="#第-31-页"><span>第 31 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p31-page.png" alt="Elasticsearch 教程配图（46-6 第31页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第31页 图1）</figcaption></figure><p>基本语法在Elasticsearch 8.x中，删除单个文档的基本HTTP请求语法是：</p><p>示例删除员工id为1的文档基本语法在Elasticsearch 8.x中，删除多个文档可以通过两种主要方法实现：</p><p>删除单个文档</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>DELETE /&lt;index_name&gt;/_doc/&lt;document_id&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>2</p><p>3</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>DELETE /employee/_doc/1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>2</p><p>3批量删除文档使用 _bulk API_bulk API允许您发送一系列操作请求，包括删除操作。每个删除请求是一个独立的JSON对象，</p><p>格式如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /_bulk</span></span>
<span class="line"><span>{ &quot;delete&quot;: {&quot;_index&quot;: &quot;{index_name}&quot;, &quot;_id&quot;: &quot;{id}&quot;} }</span></span>
<span class="line"><span>{ &quot;delete&quot;: {&quot;_index&quot;: &quot;{index_name}&quot;, &quot;_id&quot;: &quot;{id}&quot;} }</span></span>
<span class="line"><span>{ &quot;delete&quot;: {&quot;_index&quot;: &quot;{index_name}&quot;, &quot;_id&quot;: &quot;{id}&quot;} }</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>5</p><p>6使用 _delete_by_query API_delete_by_query API允许您根据查询条件删除文档。如果您想删除特定索引中匹配特定查询的所有文档，可以使用以下请求格式：</p><h3 id="第-32-页" tabindex="-1"><a class="header-anchor" href="#第-32-页"><span>第 32 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p32-page.png" alt="Elasticsearch 教程配图（46-6 第32页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第32页 图1）</figcaption></figure><p>示例基本语法在Elasticsearch 8.x版本中，更新操作通常通过_update接口执行，该接口允许您部分更新现有文档的字段。以下是更新文档的基本语法：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /{index_name}/_delete_by_query</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;&lt;your_query&gt;&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><p>8</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 删除员工id为3和4的文档</span></span>
<span class="line"><span>POST _bulk</span></span>
<span class="line"><span>{&quot;delete&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:3}}</span></span>
<span class="line"><span>{&quot;delete&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:4}}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>6</p><p>7</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 删除在广州的员工</span></span>
<span class="line"><span>POST /employee/_delete_by_query</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;match&quot;: {</span></span>
<span class="line"><span>&quot;address&quot;: &quot;广州&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>17</p><p>18</p><p>19更新文档更新单个文档</p><h3 id="第-33-页" tabindex="-1"><a class="header-anchor" href="#第-33-页"><span>第 33 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p33-page.png" alt="Elasticsearch 教程配图（46-6 第33页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第33页 图1）</figcaption></figure><p>示例基本语法在Elasticsearch 8.x中，更新多个文档可以通过两种主要方法实现：</p><p>在这个请求中，每个update块代表一个更新操作，其中_index和_id指定了要更新的文档，doc部分包含了更新后的文档内容，upsert部分定义了如果文档不存在时应该插入的内容。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /{index_name}/_update/{id}</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;doc&quot;: {</span></span>
<span class="line"><span>&quot;&lt;field&gt;: &lt;value&gt;&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 更新员工id为1的文档</span></span>
<span class="line"><span>POST /employee/_update/1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;doc&quot;: {</span></span>
<span class="line"><span>&quot;age&quot;:</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>8</p><p>9批量更新文档使用 _bulk API</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /_bulk</span></span>
<span class="line"><span>{ &quot;update&quot; : {&quot;_index&quot; : &quot;&lt;index_name&gt;&quot;, &quot;_id&quot; : &quot;&lt;document_id&gt;&quot;} }</span></span>
<span class="line"><span>{ &quot;doc&quot; : {&quot;field1&quot; : &quot;new_value1&quot;, &quot;field2&quot; : &quot;new_value2&quot;}, &quot;upsert&quot; : {&quot;field1&quot; :</span></span>
<span class="line"><span>&quot;new_value1&quot;, &quot;field2&quot; : &quot;new_value2&quot;} }</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>...</p><p>4</p><p>5</p><p>6</p><h3 id="第-34-页" tabindex="-1"><a class="header-anchor" href="#第-34-页"><span>第 34 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p34-page.png" alt="Elasticsearch 教程配图（46-6 第34页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第34页 图1）</figcaption></figure><p>在这个请求中，&lt;\\i\\n\\d\\e\\x_\\n\\a\\m\\e&gt;\\是您要更新的索引名称，query部分定义了哪些文档需要被更新，script部分定义了如何更新这些文档的字段。</p><p>示例使用 _update_by_query API_update_by_query API允许您根据查询条件更新多个文档。这个操作是原子性的，</p><p>意味着要么所有匹配的文档都被更新，要么一个都不会被更新。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /&lt;index_name&gt;/_update_by_query</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,399),r(` 定义更新文档的查询条件 `),a[1]||=e(`4 <div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>},</span></span>
<span class="line"><span>&quot;script&quot;: {</span></span>
<span class="line"><span>&quot;source&quot;: &quot;ctx._source.field = &#39;new_value&#39;&quot;,</span></span>
<span class="line"><span>&quot;lang&quot;: &quot;painless&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>11</p><p>12</p><h3 id="第-35-页" tabindex="-1"><a class="header-anchor" href="#第-35-页"><span>第 35 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p35-page.png" alt="Elasticsearch 教程配图（46-6 第35页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第35页 图1）</figcaption></figure><p>在Elasticsearch 7.x及以后的版本中，_seq_no和_primary_term取代了旧版本的_version字段，用于控制文档的版本。_seq_no代表文档在特定分片中的序列号，而_primary_term代表文档所在主分片的任期编号。这两个字段共同构成了文档的唯一版本标识符，用于实现乐观锁机制，确保在高并发环境下文档的一致性和正确更新。</p><p>当在高并发环境下使用乐观锁机制修改文档时，要带上当前文档的_seq_no和_primary_term进行更新：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 更新员工id为3和4的文档</span></span>
<span class="line"><span>POST _bulk</span></span>
<span class="line"><span>{&quot;update&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:3}}</span></span>
<span class="line"><span>{&quot;doc&quot;:{&quot;age&quot;:29}}</span></span>
<span class="line"><span>{&quot;update&quot;:{&quot;_index&quot;:&quot;employee&quot;,&quot;_id&quot;:4}}</span></span>
<span class="line"><span>{&quot;doc&quot;:{&quot;age&quot;:27}}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><p>8</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#更新姓名为张三的员工</span></span>
<span class="line"><span>POST /employee/_update_by_query</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;term&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: &quot;张三&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;script&quot;: {</span></span>
<span class="line"><span>&quot;source&quot;: &quot;ctx._source.age = 30&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>21</p><p>22并发场景下更新文档如何保证线程安全</p><h3 id="第-36-页" tabindex="-1"><a class="header-anchor" href="#第-36-页"><span>第 36 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p36-page.png" alt="Elasticsearch 教程配图（46-6 第36页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第36页 图1）</figcaption></figure><p>如果_seq_no和_primary_term不对，会抛出版本冲突异常：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /employee/_doc/1?if_seq_no=13&amp;if_primary_term=1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;name&quot;: &quot;张三xxxx&quot;,</span></span>
<span class="line"><span>&quot;sex&quot;: 1,</span></span>
<span class="line"><span>&quot;age&quot;:</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>7</p><p>8</p><p>9</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>{</span></span>
<span class="line"><span>&quot;error&quot;: {</span></span>
<span class="line"><span>&quot;root_cause&quot;: [</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;type&quot;: &quot;version_conflict_engine_exception&quot;,</span></span>
<span class="line"><span>&quot;reason&quot;: &quot;[1]: version conflict, required seqNo [13], primary term [1].</span></span>
<span class="line"><span>current document has seqNo [14] and primary term [1]&quot;,</span></span>
<span class="line"><span>&quot;index_uuid&quot;: &quot;7JwW1djNRKymS5P9FWgv7Q&quot;,</span></span>
<span class="line"><span>&quot;shard&quot;: &quot;0&quot;,</span></span>
<span class="line"><span>&quot;index&quot;: &quot;employee&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>],</span></span>
<span class="line"><span>&quot;type&quot;: &quot;version_conflict_engine_exception&quot;,</span></span>
<span class="line"><span>&quot;reason&quot;: &quot;[1]: version conflict, required seqNo [13], primary term [1]. current</span></span>
<span class="line"><span>document has seqNo [14] and primary term [1]&quot;,</span></span>
<span class="line"><span>&quot;index_uuid&quot;: &quot;7JwW1djNRKymS5P9FWgv7Q&quot;,</span></span>
<span class="line"><span>&quot;shard&quot;: &quot;0&quot;,</span></span>
<span class="line"><span>&quot;index&quot;: &quot;employee&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;status&quot;:</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>20</p><p>21实践练习：实现某金融企业理财平台的理财产品信息检索功能</p><h3 id="第-37-页" tabindex="-1"><a class="header-anchor" href="#第-37-页"><span>第 37 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p37-page.png" alt="Elasticsearch 教程配图（46-6 第37页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第37页 图1）</figcaption></figure><p>该企业的理财产品信息如下所示：</p><ul><li><ol><li>创建索引创建一个名称为product_info的索引：</li></ol></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>{</span></span>
<span class="line"><span>&quot;products&quot;:[</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品A&quot;,&quot;annual_rate&quot;:&quot;3.2200%&quot;,&quot;describe&quot;:&quot;180天定期理财，最低</span></span>
<span class="line"><span>20000起投，收益稳定，可以自助选择消息推送&quot;}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品B&quot;,&quot;annual_rate&quot;:&quot;3.1100%&quot;,&quot;describe&quot;:&quot;90天定投产品，最低</span></span>
<span class="line"><span>10000起投，每天收益到账消息推送&quot;}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品C&quot;,&quot;annual_rate&quot;:&quot;3.3500%&quot;,&quot;describe&quot;:&quot;270天定投产品，最低</span></span>
<span class="line"><span>40000起投，每天收益立即到账消息推送&quot;}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品D&quot;,&quot;annual_rate&quot;:&quot;3.1200%&quot;,&quot;describe&quot;:&quot;90天定投产品，最低</span></span>
<span class="line"><span>12000起投，每天收益到账消息推送&quot;}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品E&quot;,&quot;annual_rate&quot;:&quot;3.0100%&quot;,&quot;describe&quot;:&quot;30天定投产品推荐，最低</span></span>
<span class="line"><span>8000起投，每天收益会消息推送&quot;}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品F&quot;,&quot;annual_rate&quot;:&quot;2.7500%&quot;,&quot;describe&quot;:&quot;热门短期产品，3天短期，</span></span>
<span class="line"><span>无须任何手续费用，最低500起投，通过短信提示获取收益消息&quot;}</span></span>
<span class="line"><span>]</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>11</p><p>12</p><p>13</p><h3 id="第-38-页" tabindex="-1"><a class="header-anchor" href="#第-38-页"><span>第 38 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p38-page.png" alt="Elasticsearch 教程配图（46-6 第38页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第38页 图1）</figcaption></figure><ul><li><ol start="2"><li>新增文档</li></ol></li></ul><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /product_info</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;settings&quot;: {</span></span>
<span class="line"><span>&quot;number_of_shards&quot;: 1,</span></span>
<span class="line"><span>&quot;number_of_replicas&quot;:</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;productName&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;,</span></span>
<span class="line"><span>&quot;analyzer&quot;: &quot;ik_smart&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;annual_rate&quot;:{</span></span>
<span class="line"><span>&quot;type&quot;:&quot;keyword&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;describe&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;,</span></span>
<span class="line"><span>&quot;analyzer&quot;: &quot;ik_smart&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>24</p><p>25</p><p>26</p><h3 id="第-39-页" tabindex="-1"><a class="header-anchor" href="#第-39-页"><span>第 39 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p39-page.png" alt="Elasticsearch 教程配图（46-6 第39页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第39页 图1）</figcaption></figure><ul><li><ol start="3"><li>搜索数据搜索描述内容包含每天收益到账消息推送的所有产品。</li></ol></li></ul><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /product_info/_bulk</span></span>
<span class="line"><span>{&quot;index&quot;:{}}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品A&quot;,&quot;annual_rate&quot;:&quot;3.2200%&quot;,&quot;describe&quot;:&quot;180天定期理财，最低20000起</span></span>
<span class="line"><span>投，收益稳定，可以自助选择消息推送&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{}}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品B&quot;,&quot;annual_rate&quot;:&quot;3.1100%&quot;,&quot;describe&quot;:&quot;90天定投产品，最低10000起</span></span>
<span class="line"><span>投，每天收益到账消息推送&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{}}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品C&quot;,&quot;annual_rate&quot;:&quot;3.3500%&quot;,&quot;describe&quot;:&quot;270天定投产品，最低40000起</span></span>
<span class="line"><span>投，每天收益立即到账消息推送&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{}}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品D&quot;,&quot;annual_rate&quot;:&quot;3.1200%&quot;,&quot;describe&quot;:&quot;90天定投产品，最低12000起</span></span>
<span class="line"><span>投，每天收益到账消息推送&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{}}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品E&quot;,&quot;annual_rate&quot;:&quot;3.0100%&quot;,&quot;describe&quot;:&quot;30天定投产品推荐，最低8000</span></span>
<span class="line"><span>起投，每天收益会消息推送&quot;}</span></span>
<span class="line"><span>{&quot;index&quot;:{}}</span></span>
<span class="line"><span>{&quot;productName&quot;:&quot;理财产品F&quot;,&quot;annual_rate&quot;:&quot;2.7500%&quot;,&quot;describe&quot;:&quot;热门短期产品，3天短期，无须</span></span>
<span class="line"><span>任何手续费用，最低500起投，通过短信提示获取收益消息&quot;}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>15</p><p>16全文搜索</p><p>1</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /product_info/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;match&quot;: {</span></span>
<span class="line"><span>&quot;describe&quot;: &quot;每天收益到账消息推送&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>10</p><p>11</p><p>12</p><h3 id="第-40-页" tabindex="-1"><a class="header-anchor" href="#第-40-页"><span>第 40 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p40-page.png" alt="Elasticsearch 教程配图（46-6 第40页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第40页 图1）</figcaption></figure><p>搜索年化率在3.0000%到3.1300%之间的产品。</p><p>Elasticsearch多表关联的问题是讨论最多的问题之一。多表关联通常指一对多或者多对多的数据关系，如博客及其评论的关系。</p><p>Elasticsearch并不擅长处理关联关系，一般会采用以下四种方法处理关联：</p><p>Nested类型适用于一对少量、子文档偶尔更新、查询频繁的场景。如果需要索引对象数组并保持数组中每个对象的独立性，则应使用Nested数据类型而不是Object数据类型。</p><p>Nested类型的优点是Nested文档可以将父子关系的两部分数据关联起来（例如博客与评论），可以基于Nested类型做任何查询。其缺点则是查询相对较慢，更新子文档时需要更新整篇文档。</p><p>Join类型用于在同一索引的文档中创建父子关系。Join类型适用于子文档数据量明显多于父文档的数据量的场景，该场景存在一对多量的关系，子文档更新频繁。举例来说，一个产品和供应商之间就是一对多的关联关系。当使用父子文档时，使用has_child或者has_parent做父子关联查询。</p><p>Join类型的优点是父子文档可独立更新。缺点则是维护Join关系需要占据部分内存，查询较Nested类型更耗资源。</p><p>按查询条件搜索</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>GET /product_info/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;range&quot;: {</span></span>
<span class="line"><span>&quot;annual_rate&quot;: {</span></span>
<span class="line"><span>&quot;gte&quot;: &quot;3.0000%&quot;,</span></span>
<span class="line"><span>&quot;lte&quot;: &quot;3.1300%&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>12</p><ol start="134"><li>ElasticSearch文件建模最佳实践4.1 Elasticsearch中如何处理关联关系嵌套对象(Nested Object)Join父子文档类型</li></ol><h3 id="第-41-页" tabindex="-1"><a class="header-anchor" href="#第-41-页"><span>第 41 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p41-page.png" alt="Elasticsearch 教程配图（46-6 第41页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第41页 图1）</figcaption></figure><p>宽表适用于一对多或者多对多的关联关系。</p><p>宽表的优点是速度快。缺点则是索引更新或删除数据时，应用程序不得不处理宽表的冗余数据；并且由于冗余存储，某些搜索和聚合操作的结果可能不准确。</p><p>这是普遍使用的技术，即在应用接口层面处理关联关系。一般建议在存储层面使用两个独立索引存储，在实际业务层面这将分为两次请求来完成。</p><p>业务端关联适用于数据量少的多表关联业务场景。数据量少时，用户体验好；而数据量多时，两次查询耗时肯定会比较长，反而影响用户体验。</p><p>对象类型：</p><p>宽表冗余存储业务端关联案例1： 博客作者信息变更在每一博客的文档中都保留作者的信息如果作者信息发生变化，需要修改相关的博客文档</p><h3 id="第-42-页" tabindex="-1"><a class="header-anchor" href="#第-42-页"><span>第 42 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p42-page.png" alt="Elasticsearch 教程配图（46-6 第42页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第42页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>DELETE blog</span></span>
<span class="line"><span># 设置blog的 Mapping</span></span>
<span class="line"><span>PUT /blog</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;content&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;time&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;date&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;user&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;city&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;userid&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;long&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;username&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;keyword&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>29</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 插入一条 blog信息</span></span>
<span class="line"><span>PUT /blog/_doc/1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;content&quot;:&quot;I like Elasticsearch&quot;,</span></span>
<span class="line"><span>&quot;time&quot;:&quot;2022-01-01T00:00:00&quot;,</span></span>
<span class="line"><span>&quot;user&quot;:{</span></span>
<span class="line"><span>&quot;userid&quot;:1,</span></span>
<span class="line"><span>&quot;username&quot;:&quot;Fox&quot;,</span></span>
<span class="line"><span>&quot;city&quot;:&quot;Changsha&quot;</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="第-43-页" tabindex="-1"><a class="header-anchor" href="#第-43-页"><span>第 43 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p43-page.png" alt="Elasticsearch 教程配图（46-6 第43页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第43页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>41</p><p>42</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 查询 blog信息</span></span>
<span class="line"><span>POST /blog/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;bool&quot;: {</span></span>
<span class="line"><span>&quot;must&quot;: [</span></span>
<span class="line"><span>{&quot;match&quot;: {&quot;content&quot;: &quot;Elasticsearch&quot;}},</span></span>
<span class="line"><span>{&quot;match&quot;: {&quot;user.username&quot;: &quot;Fox&quot;}}</span></span>
<span class="line"><span>]</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>案例2：包含对象数组的文档</p><h3 id="第-44-页" tabindex="-1"><a class="header-anchor" href="#第-44-页"><span>第 44 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p44-page.png" alt="Elasticsearch 教程配图（46-6 第44页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第44页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>DELETE /my_movies</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>2</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 电影的Mapping信息</span></span>
<span class="line"><span>PUT /my_movies</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;mappings&quot; : {</span></span>
<span class="line"><span>&quot;properties&quot; : {</span></span>
<span class="line"><span>&quot;actors&quot; : {</span></span>
<span class="line"><span>&quot;properties&quot; : {</span></span>
<span class="line"><span>&quot;first_name&quot; : {</span></span>
<span class="line"><span>&quot;type&quot; : &quot;keyword&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;last_name&quot; : {</span></span>
<span class="line"><span>&quot;type&quot; : &quot;keyword&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;title&quot; : {</span></span>
<span class="line"><span>&quot;type&quot; : &quot;text&quot;,</span></span>
<span class="line"><span>&quot;fields&quot; : {</span></span>
<span class="line"><span>&quot;keyword&quot; : {</span></span>
<span class="line"><span>&quot;type&quot; : &quot;keyword&quot;,</span></span>
<span class="line"><span>&quot;ignore_above&quot; :</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>30</p><p>31</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 写入一条电影信息</span></span>
<span class="line"><span>POST /my_movies/_doc/1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;title&quot;:&quot;Speed&quot;,</span></span>
<span class="line"><span>&quot;actors&quot;:[</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;first_name&quot;:&quot;Keanu&quot;,</span></span>
<span class="line"><span>&quot;last_name&quot;:&quot;Reeves&quot;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="第-45-页" tabindex="-1"><a class="header-anchor" href="#第-45-页"><span>第 45 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p45-page.png" alt="Elasticsearch 教程配图（46-6 第45页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第45页 图1）</figcaption></figure><p>思考：为什么会搜到不需要的结果？</p><p>存储时，内部对象的边界并没有考虑在内,JSON格式被处理成扁平式键值对的结构。当对多个字段进行查询时，导致了意外的搜索结果。可以用Nested Data Type解决这个问题。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>},</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>41</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>{</span></span>
<span class="line"><span>&quot;first_name&quot;:&quot;Dennis&quot;,</span></span>
<span class="line"><span>&quot;last_name&quot;:&quot;Hopper&quot;</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>46</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>]</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>49</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 查询电影信息</span></span>
<span class="line"><span>POST /my_movies/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;bool&quot;: {</span></span>
<span class="line"><span>&quot;must&quot;: [</span></span>
<span class="line"><span>{&quot;match&quot;: {&quot;actors.first_name&quot;: &quot;Keanu&quot;}},</span></span>
<span class="line"><span>{&quot;match&quot;: {&quot;actors.last_name&quot;: &quot;Hopper&quot;}}</span></span>
<span class="line"><span>]</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>61</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>}</span></span>
<span class="line"><span>&quot;title&quot;:&quot;Speed&quot;</span></span>
<span class="line"><span>&quot;actor&quot;.first_name: [&quot;Keanu&quot;,&quot;Dennis&quot;]</span></span>
<span class="line"><span>&quot;actor&quot;.last_name: [&quot;Reeves&quot;,&quot;Hopper&quot;]</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>4嵌套对象(Nested Object)</p><h3 id="第-46-页" tabindex="-1"><a class="header-anchor" href="#第-46-页"><span>第 46 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p46-page.png" alt="Elasticsearch 教程配图（46-6 第46页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第46页 图1）</figcaption></figure><p>什么是Nested Data TypeNested数据类型: 允许对象数组中的对象被独立索引使用nested 和properties 关键字，将所有actors索引到多个分隔的文档在内部, Nested文档会被保存在两个Lucene文档中，在查询时做Join处理</p><h3 id="第-47-页" tabindex="-1"><a class="header-anchor" href="#第-47-页"><span>第 47 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p47-page.png" alt="Elasticsearch 教程配图（46-6 第47页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第47页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>DELETE /my_movies</span></span>
<span class="line"><span># 创建 Nested 对象 Mapping</span></span>
<span class="line"><span>PUT /my_movies</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;mappings&quot; : {</span></span>
<span class="line"><span>&quot;properties&quot; : {</span></span>
<span class="line"><span>&quot;actors&quot; : {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;nested&quot;,</span></span>
<span class="line"><span>&quot;properties&quot; : {</span></span>
<span class="line"><span>&quot;first_name&quot; : {&quot;type&quot; : &quot;keyword&quot;},</span></span>
<span class="line"><span>&quot;last_name&quot; : {&quot;type&quot; : &quot;keyword&quot;}</span></span>
<span class="line"><span>}},</span></span>
<span class="line"><span>&quot;title&quot; : {</span></span>
<span class="line"><span>&quot;type&quot; : &quot;text&quot;,</span></span>
<span class="line"><span>&quot;fields&quot; : {&quot;keyword&quot;:{&quot;type&quot;:&quot;keyword&quot;,&quot;ignore_above&quot;:256}}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>20</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /my_movies/_doc/1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;title&quot;:&quot;Speed&quot;,</span></span>
<span class="line"><span>&quot;actors&quot;:[</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;first_name&quot;:&quot;Keanu&quot;,</span></span>
<span class="line"><span>&quot;last_name&quot;:&quot;Reeves&quot;</span></span>
<span class="line"><span>},</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>29</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>{</span></span>
<span class="line"><span>&quot;first_name&quot;:&quot;Dennis&quot;,</span></span>
<span class="line"><span>&quot;last_name&quot;:&quot;Hopper&quot;</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>34</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>]</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>37</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># Nested 查询</span></span>
<span class="line"><span>POST /my_movies/_search</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="第-48-页" tabindex="-1"><a class="header-anchor" href="#第-48-页"><span>第 48 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p48-page.png" alt="Elasticsearch 教程配图（46-6 第48页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第48页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;bool&quot;: {</span></span>
<span class="line"><span>&quot;must&quot;: [</span></span>
<span class="line"><span>{&quot;match&quot;: {&quot;title&quot;: &quot;Speed&quot;}},</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;nested&quot;: {</span></span>
<span class="line"><span>&quot;path&quot;: &quot;actors&quot;,</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;bool&quot;: {</span></span>
<span class="line"><span>&quot;must&quot;: [</span></span>
<span class="line"><span>{&quot;match&quot;: {</span></span>
<span class="line"><span>&quot;actors.first_name&quot;: &quot;Keanu&quot;</span></span>
<span class="line"><span>}},</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>54</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>{&quot;match&quot;: {</span></span>
<span class="line"><span>&quot;actors.last_name&quot;: &quot;Hopper&quot;</span></span>
<span class="line"><span>}}</span></span>
<span class="line"><span>]</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>]</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>67</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># Nested Aggregation</span></span>
<span class="line"><span>POST /my_movies/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;size&quot;: 0,</span></span>
<span class="line"><span>&quot;aggs&quot;: {</span></span>
<span class="line"><span>&quot;actors_agg&quot;: {</span></span>
<span class="line"><span>&quot;nested&quot;: {</span></span>
<span class="line"><span>&quot;path&quot;: &quot;actors&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;aggs&quot;: {</span></span>
<span class="line"><span>&quot;actor_name&quot;: {</span></span>
<span class="line"><span>&quot;terms&quot;: {</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="第-49-页" tabindex="-1"><a class="header-anchor" href="#第-49-页"><span>第 49 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p49-page.png" alt="Elasticsearch 教程配图（46-6 第49页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第49页 图1）</figcaption></figure><p>设定 Parent/Child Mapping&quot;field&quot;: &quot;actors.first_name&quot;,</p><p>80&quot;size&quot;: 1081</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>88</p><p>89</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 普通 aggregation不工作</span></span>
<span class="line"><span>POST /my_movies/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;size&quot;: 0,</span></span>
<span class="line"><span>&quot;aggs&quot;: {</span></span>
<span class="line"><span>&quot;actors_agg&quot;: {</span></span>
<span class="line"><span>&quot;terms&quot;: {</span></span>
<span class="line"><span>&quot;field&quot;: &quot;actors.first_name&quot;,</span></span>
<span class="line"><span>&quot;size&quot;:</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>Join父子关联类型对象和Nested对象的局限性: 每次更新，可能需要重新索引整个对象(包括根对象和嵌套对象)ES提供了类似关系型数据库中Join 的实现。使用Join数据类型实现，可以通过维护Parent/ Child的关系，从而分离两个对象父文档和子文档是两个独立的文档更新父文档无需重新索引子文档。子文档被添加，更新或者删除也不会影响到父文档和其他的子文档</p><h3 id="第-50-页" tabindex="-1"><a class="header-anchor" href="#第-50-页"><span>第 50 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p50-page.png" alt="Elasticsearch 教程配图（46-6 第50页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第50页 图1）</figcaption></figure><p>索引父文档</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>DELETE /my_blogs</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>2</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 设定 Parent/Child Mapping</span></span>
<span class="line"><span>PUT /my_blogs</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;settings&quot;: {</span></span>
<span class="line"><span>&quot;number_of_shards&quot;:</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;blog_comments_relation&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;join&quot;,</span></span>
<span class="line"><span>&quot;relations&quot;: {</span></span>
<span class="line"><span>&quot;blog&quot;: &quot;comment&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;content&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;title&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;keyword&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>26</p><h3 id="第-51-页" tabindex="-1"><a class="header-anchor" href="#第-51-页"><span>第 51 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p51-page.png" alt="Elasticsearch 教程配图（46-6 第51页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第51页 图1）</figcaption></figure><p>索引子文档</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#索引父文档</span></span>
<span class="line"><span>PUT /my_blogs/_doc/blog1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;title&quot;:&quot;Learning Elasticsearch&quot;,</span></span>
<span class="line"><span>&quot;content&quot;:&quot;learning ELK &quot;,</span></span>
<span class="line"><span>&quot;blog_comments_relation&quot;:{</span></span>
<span class="line"><span>&quot;name&quot;:&quot;blog&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>10</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#索引父文档</span></span>
<span class="line"><span>PUT /my_blogs/_doc/blog2</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;title&quot;:&quot;Learning Hadoop&quot;,</span></span>
<span class="line"><span>&quot;content&quot;:&quot;learning Hadoop&quot;,</span></span>
<span class="line"><span>&quot;blog_comments_relation&quot;:{</span></span>
<span class="line"><span>&quot;name&quot;:&quot;blog&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="第-52-页" tabindex="-1"><a class="header-anchor" href="#第-52-页"><span>第 52 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p52-page.png" alt="Elasticsearch 教程配图（46-6 第52页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第52页 图1）</figcaption></figure><p>注意：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#索引子文档</span></span>
<span class="line"><span>PUT /my_blogs/_doc/comment1?routing=blog1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;comment&quot;:&quot;I am learning ELK&quot;,</span></span>
<span class="line"><span>&quot;username&quot;:&quot;Jack&quot;,</span></span>
<span class="line"><span>&quot;blog_comments_relation&quot;:{</span></span>
<span class="line"><span>&quot;name&quot;:&quot;comment&quot;,</span></span>
<span class="line"><span>&quot;parent&quot;:&quot;blog1&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>11</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#索引子文档</span></span>
<span class="line"><span>PUT /my_blogs/_doc/comment2?routing=blog2</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;comment&quot;:&quot;I like Hadoop!!!!!&quot;,</span></span>
<span class="line"><span>&quot;username&quot;:&quot;Jack&quot;,</span></span>
<span class="line"><span>&quot;blog_comments_relation&quot;:{</span></span>
<span class="line"><span>&quot;name&quot;:&quot;comment&quot;,</span></span>
<span class="line"><span>&quot;parent&quot;:&quot;blog2&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>22</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#索引子文档</span></span>
<span class="line"><span>PUT /my_blogs/_doc/comment3?routing=blog2</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;comment&quot;:&quot;Hello Hadoop&quot;,</span></span>
<span class="line"><span>&quot;username&quot;:&quot;Bob&quot;,</span></span>
<span class="line"><span>&quot;blog_comments_relation&quot;:{</span></span>
<span class="line"><span>&quot;name&quot;:&quot;comment&quot;,</span></span>
<span class="line"><span>&quot;parent&quot;:&quot;blog2&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>父文档和子文档必须存在相同的分片上，能够确保查询join 的性能当指定子文档时候，必须指定它的父文档ld。使用routing参数来保证，分配到相同的分片</p><h3 id="第-53-页" tabindex="-1"><a class="header-anchor" href="#第-53-页"><span>第 53 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p53-page.png" alt="Elasticsearch 教程配图（46-6 第53页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第53页 图1）</figcaption></figure><p>查询</p><h3 id="第-54-页" tabindex="-1"><a class="header-anchor" href="#第-54-页"><span>第 54 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p54-page.png" alt="Elasticsearch 教程配图（46-6 第54页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第54页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 查询所有文档</span></span>
<span class="line"><span>POST /my_blogs/_search</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>3</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#根据父文档ID查看</span></span>
<span class="line"><span>GET /my_blogs/_doc/blog2</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>6</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># Parent Id 查询</span></span>
<span class="line"><span>POST /my_blogs/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;parent_id&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;comment&quot;,</span></span>
<span class="line"><span>&quot;id&quot;: &quot;blog2&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>17</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># Has Child 查询,返回父文档</span></span>
<span class="line"><span>POST /my_blogs/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;has_child&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;comment&quot;,</span></span>
<span class="line"><span>&quot;query&quot; : {</span></span>
<span class="line"><span>&quot;match&quot;: {</span></span>
<span class="line"><span>&quot;username&quot; : &quot;Jack&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>32</p><p>33</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># Has Parent 查询，返回相关的子文档</span></span>
<span class="line"><span>POST /my_blogs/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;has_parent&quot;: {</span></span>
<span class="line"><span>&quot;parent_type&quot;: &quot;blog&quot;,</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="第-55-页" tabindex="-1"><a class="header-anchor" href="#第-55-页"><span>第 55 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p55-page.png" alt="Elasticsearch 教程配图（46-6 第55页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第55页 图1）</figcaption></figure><p>在Elasticsearch开发实战中，对于多表关联的设计要突破关系型数据库设计的思维定式。不建议在Elasticsearch中做多表关联操作，尽量在设计时使用扁平的宽表文档模型，或者尽量将业务转化为没有关联关系的文档形式，在文档建模处多下功夫，以提升检索效率。</p><p>&quot;query&quot; : {40&quot;match&quot;: {41&quot;title&quot; : &quot;Learning Hadoop&quot;42</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>48</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#通过ID ，访问子文档</span></span>
<span class="line"><span>GET /my_blogs/_doc/comment3</span></span>
<span class="line"><span>#通过ID和routing ，访问子文档</span></span>
<span class="line"><span>GET /my_blogs/_doc/comment3?routing=blog2</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>53</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#更新子文档</span></span>
<span class="line"><span>PUT /my_blogs/_doc/comment3?routing=blog2</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;comment&quot;: &quot;Hello Hadoop??&quot;,</span></span>
<span class="line"><span>&quot;blog_comments_relation&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: &quot;comment&quot;,</span></span>
<span class="line"><span>&quot;parent&quot;: &quot;blog2&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>多表关联方案对比</p><h3 id="第-56-页" tabindex="-1"><a class="header-anchor" href="#第-56-页"><span>第 56 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p56-page.png" alt="Elasticsearch 教程配图（46-6 第56页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第56页 图1）</figcaption></figure><p>思考：什么原因会导致文档中有成百上千的字段?</p><p>生产环境中，尽量不要打开 Dynamic，可以使用Strict控制新增字段的加入</p><p>Nested嵌套类型Join父子文档类型宽表冗余存储业务端关联优点文档存储在一起，</p><p>读取性能高父子文档可以独立更新，互不影响以空间换时间数据量少时，用户体验好缺点更新嵌套的子文档时，需要更新整个文档，查询相对较慢Join关系的维护也耗费内存。读取性能Nested还差字段冗余造成存储空间的浪费数据量多，两次查询耗时比较长，影响用户体验适用场景对少量、子文档偶尔更新、查询频繁子文档更新频繁一对多或者多对多数据量少4.2 ElasticSearch文档建模的最佳实践如何处理关联关系Object: 优先考虑反范式（Denormalization）Nested: 当数据包含多数值对象，同时有查询需求Child/Parent：关联文档更新非常频繁时避免过多字段一个文档中，最好避免大量的字段过多的字段数不容易维护Mapping 信息保存在Cluster State 中，数据量过大，对集群性能会有影响删除或者修改数据需要reindex默认最大字段数是1000，可以设置index.mapping.total_fields.limit限定最大字段数。·true ：未知字段会被自动加入，默认值false ：新字段不会被索引，但是会保存在_sourcestrict ：新增字段不会被索引，文档写入失败</p><h3 id="第-57-页" tabindex="-1"><a class="header-anchor" href="#第-57-页"><span>第 57 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p57-page.png" alt="Elasticsearch 教程配图（46-6 第57页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第57页 图1）</figcaption></figure><p>对于多属性的字段，比如cookie，商品属性，可以考虑使用Nested</p><p>正则，通配符查询，前缀查询属于Term查询，但是性能不够好。特别是将通配符放在开头，会导致性能的灾难案例：针对版本号的搜索</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /user</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;dynamic&quot;: &quot;strict&quot;,</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;name&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;text&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;address&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;object&quot;,</span></span>
<span class="line"><span>&quot;dynamic&quot;: &quot;true&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span># 插入文档报错，原因为age为新增字段,会抛出异常</span></span>
<span class="line"><span>PUT /user/_doc/1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;name&quot;:&quot;fox&quot;,</span></span>
<span class="line"><span>&quot;age&quot;:32,</span></span>
<span class="line"><span>&quot;address&quot;:{</span></span>
<span class="line"><span>&quot;province&quot;:&quot;湖南&quot;,</span></span>
<span class="line"><span>&quot;city&quot;:&quot;长沙&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>26</p><p>27避免正则，通配符，前缀查询</p><h3 id="第-58-页" tabindex="-1"><a class="header-anchor" href="#第-58-页"><span>第 58 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p58-page.png" alt="Elasticsearch 教程配图（46-6 第58页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第58页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 将字符串转对象</span></span>
<span class="line"><span>PUT softwares/</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;version&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;display_name&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;keyword&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;hot_fix&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;byte&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;marjor&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;byte&quot;</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>&quot;minor&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;byte&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>25</p><p>26</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#通过 Inner Object 写入多个文档</span></span>
<span class="line"><span>PUT softwares/_doc/1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;version&quot;:{</span></span>
<span class="line"><span>&quot;display_name&quot;:&quot;7.1.0&quot;,</span></span>
<span class="line"><span>&quot;marjor&quot;:7,</span></span>
<span class="line"><span>&quot;minor&quot;:1,</span></span>
<span class="line"><span>&quot;hot_fix&quot;:0</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>36</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>38</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT softwares/_doc/2</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><h3 id="第-59-页" tabindex="-1"><a class="header-anchor" href="#第-59-页"><span>第 59 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p59-page.png" alt="Elasticsearch 教程配图（46-6 第59页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第59页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>{</span></span>
<span class="line"><span>&quot;version&quot;:{</span></span>
<span class="line"><span>&quot;display_name&quot;:&quot;7.2.0&quot;,</span></span>
<span class="line"><span>&quot;marjor&quot;:7,</span></span>
<span class="line"><span>&quot;minor&quot;:2,</span></span>
<span class="line"><span>&quot;hot_fix&quot;:0</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>48</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT softwares/_doc/3</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;version&quot;:{</span></span>
<span class="line"><span>&quot;display_name&quot;:&quot;7.2.1&quot;,</span></span>
<span class="line"><span>&quot;marjor&quot;:7,</span></span>
<span class="line"><span>&quot;minor&quot;:2,</span></span>
<span class="line"><span>&quot;hot_fix&quot;:1</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>58</p><p>59</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 通过 bool 查询，</span></span>
<span class="line"><span>POST softwares/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;query&quot;: {</span></span>
<span class="line"><span>&quot;bool&quot;: {</span></span>
<span class="line"><span>&quot;filter&quot;: [</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;match&quot;:{</span></span>
<span class="line"><span>&quot;version.marjor&quot;:7</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>},</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;match&quot;:{</span></span>
<span class="line"><span>&quot;version.minor&quot;:2</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>]</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="第-60-页" tabindex="-1"><a class="header-anchor" href="#第-60-页"><span>第 60 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p60-page.png" alt="Elasticsearch 教程配图（46-6 第60页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第60页 图1）</figcaption></figure><p>80避免空值引起的聚合不准</p><h3 id="第-61-页" tabindex="-1"><a class="header-anchor" href="#第-61-页"><span>第 61 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p61-page.png" alt="Elasticsearch 教程配图（46-6 第61页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第61页 图1）</figcaption></figure><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># Not Null 解决聚合的问题</span></span>
<span class="line"><span>DELETE /scores</span></span>
<span class="line"><span>PUT /scores</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;properties&quot;: {</span></span>
<span class="line"><span>&quot;score&quot;: {</span></span>
<span class="line"><span>&quot;type&quot;: &quot;float&quot;,</span></span>
<span class="line"><span>&quot;null_value&quot;:</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>14</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /scores/_doc/1</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;score&quot;:</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>PUT /scores/_doc/2</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;score&quot;: null</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>23</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>POST /scores/_search</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;size&quot;: 0,</span></span>
<span class="line"><span>&quot;aggs&quot;: {</span></span>
<span class="line"><span>&quot;avg&quot;: {</span></span>
<span class="line"><span>&quot;avg&quot;: {</span></span>
<span class="line"><span>&quot;field&quot;: &quot;score&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>为索引的Mapping加入Meta 信息Mappings设置非常重要，需要从两个维度进行考虑</p><h3 id="第-62-页" tabindex="-1"><a class="header-anchor" href="#第-62-页"><span>第 62 页</span></a></h3><figure><img src="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/46-6/p62-page.png" alt="Elasticsearch 教程配图（46-6 第62页 图1）" tabindex="0" loading="lazy"><figcaption>Elasticsearch 教程配图（46-6 第62页 图1）</figcaption></figure><p>功能︰搜索，聚合，排序性能︰存储的开销; 内存的开销; 搜索的性能Mappings设置是一个迭代的过程加入新的字段很容易（必要时需要update_by_query)更新删除字段不允许(需要Reindex重建数据)最好能对Mappings 加入Meta 信息，更好的进行版本管理可以考虑将Mapping文件上传git进行管理</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>PUT /my_index</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>&quot;mappings&quot;: {</span></span>
<span class="line"><span>&quot;_meta&quot;: {</span></span>
<span class="line"><span>&quot;index_version_mapping&quot;: &quot;1.1&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="小结" tabindex="-1"><a class="header-anchor" href="#小结"><span>小结</span></a></h2><ul><li>本篇为 Elasticsearch 系列第 3/10 篇，主题：<strong>ES 核心概念与基础数据管理</strong>。</li><li>建议结合 Dev Tools / Kibana 动手复现文中的 REST 示例。</li><li>系列文章路径前缀：<code>/中间件/elasticsearch/</code>。</li></ul><p>下一篇：<a href="/%E4%B8%AD%E9%97%B4%E4%BB%B6/elasticsearch/es-04-query-dsl">《Elasticsearch Query DSL 实战》</a></p>`,234)])}var c=i(o,[[`render`,s]]);export{a as _pageData,c as default};