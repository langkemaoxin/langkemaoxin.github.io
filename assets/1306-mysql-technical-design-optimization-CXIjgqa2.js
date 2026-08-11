import{a as e,c as t,i as n}from"./app-CHZzAZM0.js";import{t as r}from"./plugin-vue_export-helper-BDNMzG2s.js";var i=JSON.parse('{"path":"/%E9%9D%A2%E8%AF%95%E9%A2%98/%E9%AB%98%E9%A2%91%E9%9D%A2%E8%AF%95%E9%97%AE%E9%A2%98/AI%E4%BB%A3%E7%A0%81%E5%8A%A9%E6%89%8B/1306-mysql-technical-design-optimization.html","title":"MySQL 技术设计优化方案","lang":"zh-CN","frontmatter":{"title":"MySQL 技术设计优化方案","sidebarGroup":"AI代码助手","shortTitle":"MySQL 技术设计优化方案","order":1306,"date":"2025-12-30T00:00:00.000Z","category":"面试题","tag":["面试题"],"description":"目录索引设计优化方案慢查询优化方案深分页性能优化事务与死锁优化主从复制高可用方案综合优化最佳实践1. 索引设计优化方案1.1 联合索引设计规范问题场景-- 现有表结构 CREATE TABLE `user` ( `id` bigint NO","article":false,"head":[["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"WebPage\\",\\"name\\":\\"MySQL 技术设计优化方案\\",\\"description\\":\\"目录索引设计优化方案慢查询优化方案深分页性能优化事务与死锁优化主从复制高可用方案综合优化最佳实践1. 索引设计优化方案1.1 联合索引设计规范问题场景-- 现有表结构 CREATE TABLE `user` ( `id` bigint NO\\"}"],["meta",{"property":"og:url","content":"https://www.code-corey.com/%E9%9D%A2%E8%AF%95%E9%A2%98/%E9%AB%98%E9%A2%91%E9%9D%A2%E8%AF%95%E9%97%AE%E9%A2%98/AI%E4%BB%A3%E7%A0%81%E5%8A%A9%E6%89%8B/1306-mysql-technical-design-optimization.html"}],["meta",{"property":"og:site_name","content":"Corey 知识库"}],["meta",{"property":"og:title","content":"MySQL 技术设计优化方案"}],["meta",{"property":"og:description","content":"目录索引设计优化方案慢查询优化方案深分页性能优化事务与死锁优化主从复制高可用方案综合优化最佳实践1. 索引设计优化方案1.1 联合索引设计规范问题场景-- 现有表结构 CREATE TABLE `user` ( `id` bigint NO"}],["meta",{"property":"og:type","content":"website"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2026-08-09T03:10:04.000Z"}],["meta",{"property":"article:tag","content":"面试题"}],["meta",{"property":"article:published_time","content":"2025-12-30T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2026-08-09T03:10:04.000Z"}]]},"git":{"createdTime":1786240216000,"updatedTime":1786245004000,"contributors":[{"name":"langkemaoxin","username":"langkemaoxin","email":"2363613998@qq.com","commits":2,"url":"https://github.com/langkemaoxin"},{"name":"Cursor","username":"Cursor","email":"cursoragent@cursor.com","commits":2,"url":"https://github.com/Cursor"}]},"readingTime":{"minutes":16.21,"words":4864},"filePathRelative":"面试题/高频面试问题/AI代码助手/1306-mysql-technical-design-optimization.md","excerpt":"<blockquote>\\n<p>来源：<a href=\\"https://www.yuque.com/tulingzhouyu/db22bv/cgzh5tgqv4pm1h3y\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">MySQL 技术设计优化方案</a></p>\\n</blockquote>\\n<h2>目录</h2>\\n<ol>\\n<li>索引设计优化方案</li>\\n<li>慢查询优化方案</li>\\n<li>深分页性能优化</li>\\n<li>事务与死锁优化</li>\\n<li>主从复制高可用方案</li>\\n<li>综合优化最佳实践</li>\\n</ol>\\n<hr>"}'),a={name:`1306-mysql-technical-design-optimization.md`};function o(r,i,a,o,s,c){return t(),n(`div`,null,[...i[0]||=[e(`<blockquote><p>来源：<a href="https://www.yuque.com/tulingzhouyu/db22bv/cgzh5tgqv4pm1h3y" target="_blank" rel="noopener noreferrer">MySQL 技术设计优化方案</a></p></blockquote><h2 id="目录" tabindex="-1"><a class="header-anchor" href="#目录"><span>目录</span></a></h2><ol><li>索引设计优化方案</li><li>慢查询优化方案</li><li>深分页性能优化</li><li>事务与死锁优化</li><li>主从复制高可用方案</li><li>综合优化最佳实践</li></ol><hr><h2 id="_1-索引设计优化方案" tabindex="-1"><a class="header-anchor" href="#_1-索引设计优化方案"><span>1. 索引设计优化方案</span></a></h2><h3 id="_1-1-联合索引设计规范" tabindex="-1"><a class="header-anchor" href="#_1-1-联合索引设计规范"><span>1.1 联合索引设计规范</span></a></h3><h4 id="问题场景" tabindex="-1"><a class="header-anchor" href="#问题场景"><span>问题场景</span></a></h4><div class="language-sql line-numbers-mode" data-highlighter="shiki" data-ext="sql" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-sql"><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic;">-- 现有表结构</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">CREATE</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> TABLE</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> \`</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF;">user</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">\` (</span></span>
<span class="line"><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">  \`id\`</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> bigint</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> NOT NULL</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> AUTO_INCREMENT,</span></span>
<span class="line"><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">  \`name\`</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> varchar</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">(</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;">50</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">) </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">NOT NULL</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">,</span></span>
<span class="line"><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">  \`age\`</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> int</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> NOT NULL</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">,</span></span>
<span class="line"><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">  \`city\`</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> varchar</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">(</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;">50</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">) </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">NOT NULL</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">,</span></span>
<span class="line"><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">  \`status\`</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> tinyint</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> NOT NULL</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> DEFAULT</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;"> &#39;1&#39;</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">,</span></span>
<span class="line"><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">  \`create_time\`</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> datetime</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> NOT NULL</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">,</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">  PRIMARY KEY</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> (</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;">\`id\`</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">)</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">) ENGINE</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;">=</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">InnoDB;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic;">-- 常见查询场景</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">SELECT</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> * </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">FROM</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> user </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">WHERE</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> age </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;"> 20</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> AND</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> city </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;"> &#39;北京&#39;</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">SELECT</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> * </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">FROM</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> user </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">WHERE</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> age </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;">&gt;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;"> 18</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> AND</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> city </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;"> &#39;北京&#39;</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> AND</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> status</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;"> =</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">SELECT</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> * </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">FROM</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> user </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">WHERE</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> city </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;"> &#39;北京&#39;</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="优化方案" tabindex="-1"><a class="header-anchor" href="#优化方案"><span>优化方案</span></a></h4><p><strong>方案一：传统联合索引（不推荐）</strong></p><div class="language-sql line-numbers-mode" data-highlighter="shiki" data-ext="sql" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-sql"><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic;">-- ❌ 问题：范围查询导致后续索引失效</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">ALTER</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> TABLE</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> user </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">ADD</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> INDEX</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> idx_age_city_status(age, city, </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">status</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic;">-- 执行计划分析</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">EXPLAIN </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">SELECT</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> * </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">FROM</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> user </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;">WHERE</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> age </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;">&gt;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;"> 18</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> AND</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;"> city </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379;"> &#39;北京&#39;</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> AND</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD;"> status</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2;"> =</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66;"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF;">;</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic;">-- 结果：只用到了age索引，city和status失效</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>方案二：优化后的联合索引（推荐）</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- ✅ 优化：等值查询字段放前面，范围查询放后面</span></span>
<span class="line"><span>ALTER TABLE user ADD INDEX idx_city_status_age(city, status, age);</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 调整后的查询</span></span>
<span class="line"><span>SELECT * FROM user WHERE city = &#39;北京&#39; AND status = 1 AND age &gt; 18;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 执行计划分析</span></span>
<span class="line"><span>EXPLAIN SELECT * FROM user WHERE city = &#39;北京&#39; AND status = 1 AND age &gt; 18;</span></span>
<span class="line"><span>-- 结果：三个字段都用上了索引</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>联合索引设计原则</strong></p><p><strong>原则</strong><br><strong>说明</strong><br><strong>示例</strong></p><ol><li><p>等值查询优先<br> WHERE a=1 AND b&gt;10 → 索引(a,b)<br><code>idx_city_age</code><br> 而非 <code>idx_age_city</code></p></li><li><p>选择性高的优先<br> 区分度高的字段放前面<br> 身份证号 &gt; 性别</p></li><li><p>查询频率高的优先<br> 常用查询条件放前面<br> 根据业务统计决定顺序</p></li><li><p>尽量覆盖索引<br> SELECT字段包含在索引中<br><code>idx_city_age</code><br> 能覆盖 SELECT city, age</p></li></ol><h4 id="实战代码示例" tabindex="-1"><a class="header-anchor" href="#实战代码示例"><span>实战代码示例</span></a></h4><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>// 业务代码优化：根据索引调整查询条件顺序</span></span>
<span class="line"><span>@Repository</span></span>
<span class="line"><span>public class UserRepository {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ❌ 不推荐：范围查询在前</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;User&amp;gt; findUsersBadWay(int minAge, String city, int status) {</span></span>
<span class="line"><span>        String sql = &quot;SELECT * FROM user WHERE age &gt; ? AND city = ? AND status = ?&quot;;</span></span>
<span class="line"><span>        // age的范围查询会导致city和status索引失效</span></span>
<span class="line"><span>        return jdbcTemplate.query(sql, new Object[]{minAge, city, status}, userRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 推荐：等值查询在前，范围查询在后</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;User&amp;gt; findUsersOptimized(String city, int status, int minAge) {</span></span>
<span class="line"><span>        // 确保索引是 idx_city_status_age</span></span>
<span class="line"><span>        String sql = &quot;SELECT * FROM user WHERE city = ? AND status = ? AND age &gt; ?&quot;;</span></span>
<span class="line"><span>        return jdbcTemplate.query(sql, new Object[]{city, status, minAge}, userRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 进阶：使用覆盖索引，避免回表</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;UserDTO&amp;gt; findUsersWithCoveringIndex(String city, int status) {</span></span>
<span class="line"><span>        // 只查询索引中包含的字段，避免回表</span></span>
<span class="line"><span>        String sql = &quot;SELECT id, city, status, age FROM user &quot; +</span></span>
<span class="line"><span>                     &quot;WHERE city = ? AND status = ? &quot; +</span></span>
<span class="line"><span>                     &quot;ORDER BY age DESC LIMIT 100&quot;;</span></span>
<span class="line"><span>        return jdbcTemplate.query(sql, new Object[]{city, status}, userDTORowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="_2-慢查询优化方案" tabindex="-1"><a class="header-anchor" href="#_2-慢查询优化方案"><span>2. 慢查询优化方案</span></a></h2><h3 id="_2-1-索引失效问题排查" tabindex="-1"><a class="header-anchor" href="#_2-1-索引失效问题排查"><span>2.1 索引失效问题排查</span></a></h3><h4 id="问题场景-函数导致索引失效" tabindex="-1"><a class="header-anchor" href="#问题场景-函数导致索引失效"><span>问题场景：函数导致索引失效</span></a></h4><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- ❌ 慢查询：在索引列上使用函数</span></span>
<span class="line"><span>SELECT * FROM orders </span></span>
<span class="line"><span>WHERE DATE_FORMAT(create_time, &#39;%Y-%m-%d&#39;) = &#39;2024-01-01&#39;;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 执行时间：3.5秒（100万条数据）</span></span>
<span class="line"><span>-- 扫描行数：1,000,000行（全表扫描）</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>优化方案</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- ✅ 优化：改写查询条件，避免函数</span></span>
<span class="line"><span>SELECT * FROM orders </span></span>
<span class="line"><span>WHERE create_time &gt;= &#39;2024-01-01 00:00:00&#39; </span></span>
<span class="line"><span>  AND create_time &lt; &#39;2024-01-02 00:00:00&#39;;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 执行时间：0.05秒</span></span>
<span class="line"><span>-- 扫描行数：2,350行（走索引）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 确保有索引</span></span>
<span class="line"><span>ALTER TABLE orders ADD INDEX idx_create_time(create_time);</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>Java代码实现</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class OrderService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ❌ 不推荐：使用日期函数</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;Order&amp;gt; findOrdersByDateBadWay(LocalDate date) {</span></span>
<span class="line"><span>        String sql = &quot;SELECT * FROM orders WHERE DATE(create_time) = ?&quot;;</span></span>
<span class="line"><span>        return jdbcTemplate.query(sql, new Object[]{date}, orderRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 推荐：使用范围查询</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;Order&amp;gt; findOrdersByDateOptimized(LocalDate date) {</span></span>
<span class="line"><span>        LocalDateTime startTime = date.atStartOfDay();</span></span>
<span class="line"><span>        LocalDateTime endTime = date.plusDays(1).atStartOfDay();</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        String sql = &quot;SELECT * FROM orders &quot; +</span></span>
<span class="line"><span>                     &quot;WHERE create_time &gt;= ? AND create_time &lt; ?&quot;;</span></span>
<span class="line"><span>        return jdbcTemplate.query(sql, </span></span>
<span class="line"><span>            new Object[]{startTime, endTime}, </span></span>
<span class="line"><span>            orderRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 进阶：使用MyBatis动态SQL + 覆盖索引</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Select(&quot;SELECT id, order_no, create_time, amount &quot; +</span></span>
<span class="line"><span>            &quot;FROM orders &quot; +</span></span>
<span class="line"><span>            &quot;WHERE create_time &gt;= #{startTime} AND create_time &lt; #{endTime}&quot;)</span></span>
<span class="line"><span>    List&amp;lt;OrderDTO&amp;gt; findOrdersWithCoveringIndex(</span></span>
<span class="line"><span>        @Param(&quot;startTime&quot;) LocalDateTime startTime,</span></span>
<span class="line"><span>        @Param(&quot;endTime&quot;) LocalDateTime endTime</span></span>
<span class="line"><span>    );</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-2-隐式类型转换优化" tabindex="-1"><a class="header-anchor" href="#_2-2-隐式类型转换优化"><span>2.2 隐式类型转换优化</span></a></h3><h4 id="问题场景-1" tabindex="-1"><a class="header-anchor" href="#问题场景-1"><span>问题场景</span></a></h4><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- 表结构：phone字段是varchar类型</span></span>
<span class="line"><span>CREATE TABLE \`user_phone\` (</span></span>
<span class="line"><span>  \`id\` bigint NOT NULL AUTO_INCREMENT,</span></span>
<span class="line"><span>  \`phone\` varchar(20) NOT NULL,</span></span>
<span class="line"><span>  \`user_id\` bigint NOT NULL,</span></span>
<span class="line"><span>  KEY \`idx_phone\` (\`phone\`)</span></span>
<span class="line"><span>) ENGINE=InnoDB;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- ❌ 慢查询：传入数字类型导致索引失效</span></span>
<span class="line"><span>SELECT * FROM user_phone WHERE phone = 13800138000;</span></span>
<span class="line"><span>-- MySQL会将索引列转换：CAST(phone AS UNSIGNED) = 13800138000</span></span>
<span class="line"><span>-- 结果：全表扫描</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>优化方案</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- ✅ 优化：确保类型匹配</span></span>
<span class="line"><span>SELECT * FROM user_phone WHERE phone = &#39;13800138000&#39;;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>Java代码防御</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class UserPhoneService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 推荐：强制类型转换，防止隐式转换</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public UserPhone findByPhone(Object phoneInput) {</span></span>
<span class="line"><span>        // 统一转换为字符串</span></span>
<span class="line"><span>        String phone = String.valueOf(phoneInput);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 参数校验</span></span>
<span class="line"><span>        if (!phone.matches(&quot;^1[3-9]\\\\d{9}$&quot;)) {</span></span>
<span class="line"><span>            throw new IllegalArgumentException(&quot;手机号格式错误&quot;);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        String sql = &quot;SELECT * FROM user_phone WHERE phone = ?&quot;;</span></span>
<span class="line"><span>        return jdbcTemplate.queryForObject(sql, new Object[]{phone}, userPhoneRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 批量查询优化：使用IN查询 + PreparedStatement</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;UserPhone&amp;gt; findByPhones(List&amp;lt;String&amp;gt; phones) {</span></span>
<span class="line"><span>        if (CollectionUtils.isEmpty(phones)) {</span></span>
<span class="line"><span>            return Collections.emptyList();</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 使用IN查询，而非循环单次查询</span></span>
<span class="line"><span>        String inClause = String.join(&quot;,&quot;, Collections.nCopies(phones.size(), &quot;?&quot;));</span></span>
<span class="line"><span>        String sql = &quot;SELECT * FROM user_phone WHERE phone IN (&quot; + inClause + &quot;)&quot;;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return jdbcTemplate.query(sql, phones.toArray(), userPhoneRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-3-like查询优化" tabindex="-1"><a class="header-anchor" href="#_2-3-like查询优化"><span>2.3 LIKE查询优化</span></a></h3><h4 id="问题场景-2" tabindex="-1"><a class="header-anchor" href="#问题场景-2"><span>问题场景</span></a></h4><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- ❌ 索引失效：前缀模糊查询</span></span>
<span class="line"><span>SELECT * FROM product WHERE name LIKE &#39;%手机%&#39;;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- ❌ 索引失效：后缀模糊查询</span></span>
<span class="line"><span>SELECT * FROM product WHERE name LIKE &#39;%手机&#39;;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- ✅ 走索引：前缀匹配</span></span>
<span class="line"><span>SELECT * FROM product WHERE name LIKE &#39;手机%&#39;;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>优化方案</strong></p><p><strong>方案一：前缀匹配（简单场景）</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class ProductService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 前缀匹配查询</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;Product&amp;gt; searchByNamePrefix(String keyword) {</span></span>
<span class="line"><span>        String sql = &quot;SELECT * FROM product WHERE name LIKE ?&quot;;</span></span>
<span class="line"><span>        return jdbcTemplate.query(sql, new Object[]{keyword + &quot;%&quot;}, productRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>方案二：全文索引（复杂场景）</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- 创建全文索引（MySQL 5.7+支持InnoDB全文索引）</span></span>
<span class="line"><span>ALTER TABLE product ADD FULLTEXT INDEX ft_idx_name(name) WITH PARSER ngram;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 使用全文搜索</span></span>
<span class="line"><span>SELECT * FROM product WHERE MATCH(name) AGAINST(&#39;手机&#39; IN NATURAL LANGUAGE MODE);</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class ProductSearchService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 使用全文索引搜索</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;Product&amp;gt; fullTextSearch(String keyword) {</span></span>
<span class="line"><span>        String sql = &quot;SELECT *, MATCH(name) AGAINST(? IN NATURAL LANGUAGE MODE) as score &quot; +</span></span>
<span class="line"><span>                     &quot;FROM product &quot; +</span></span>
<span class="line"><span>                     &quot;WHERE MATCH(name) AGAINST(? IN NATURAL LANGUAGE MODE) &quot; +</span></span>
<span class="line"><span>                     &quot;ORDER BY score DESC &quot; +</span></span>
<span class="line"><span>                     &quot;LIMIT 100&quot;;</span></span>
<span class="line"><span>        return jdbcTemplate.query(sql, new Object[]{keyword, keyword}, productRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>方案三：Elasticsearch（推荐生产环境）</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class ProductSearchServiceES {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private ElasticsearchRestTemplate elasticsearchTemplate;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 使用ES进行复杂搜索（推荐）</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;Product&amp;gt; searchProducts(String keyword) {</span></span>
<span class="line"><span>        NativeSearchQuery query = new NativeSearchQueryBuilder()</span></span>
<span class="line"><span>            .withQuery(QueryBuilders.multiMatchQuery(keyword, &quot;name&quot;, &quot;description&quot;)</span></span>
<span class="line"><span>                .type(MultiMatchQueryBuilder.Type.BEST_FIELDS)</span></span>
<span class="line"><span>                .fuzziness(Fuzziness.AUTO))</span></span>
<span class="line"><span>            .withPageable(PageRequest.of(0, 100))</span></span>
<span class="line"><span>            .build();</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        SearchHits&amp;lt;Product&amp;gt; searchHits = elasticsearchTemplate.search(query, Product.class);</span></span>
<span class="line"><span>        return searchHits.stream()</span></span>
<span class="line"><span>            .map(SearchHit::getContent)</span></span>
<span class="line"><span>            .collect(Collectors.toList());</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="_3-深分页性能优化" tabindex="-1"><a class="header-anchor" href="#_3-深分页性能优化"><span>3. 深分页性能优化</span></a></h2><h3 id="_3-1-问题分析" tabindex="-1"><a class="header-anchor" href="#_3-1-问题分析"><span>3.1 问题分析</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- ❌ 深分页慢查询</span></span>
<span class="line"><span>SELECT * FROM orders </span></span>
<span class="line"><span>WHERE status = 1 </span></span>
<span class="line"><span>ORDER BY create_time DESC </span></span>
<span class="line"><span>LIMIT 1000000, 20;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 问题：MySQL需要扫描前1000020条记录，然后丢弃前1000000条</span></span>
<span class="line"><span>-- 执行时间：5.8秒</span></span>
<span class="line"><span>-- 扫描行数：1,000,020行</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_3-2-优化方案" tabindex="-1"><a class="header-anchor" href="#_3-2-优化方案"><span>3.2 优化方案</span></a></h3><p><strong>方案一：子查询 + 延迟关联（推荐）</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- ✅ 优化：先查ID（走覆盖索引），再关联查询</span></span>
<span class="line"><span>SELECT o.* FROM orders o</span></span>
<span class="line"><span>INNER JOIN (</span></span>
<span class="line"><span>    SELECT id FROM orders </span></span>
<span class="line"><span>    WHERE status = 1 </span></span>
<span class="line"><span>    ORDER BY create_time DESC </span></span>
<span class="line"><span>    LIMIT 1000000, 20</span></span>
<span class="line"><span>) tmp ON o.id = tmp.id;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 执行时间：0.3秒</span></span>
<span class="line"><span>-- 子查询扫描行数：1,000,020行（但走覆盖索引，不回表）</span></span>
<span class="line"><span>-- 关联查询只需回表20次</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>Java实现</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class OrderPaginationService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private JdbcTemplate jdbcTemplate;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ❌ 传统分页（慢）</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public PageResult&amp;lt;Order&amp;gt; findOrdersTraditional(int page, int size) {</span></span>
<span class="line"><span>        int offset = (page - 1) * size;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        String sql = &quot;SELECT * FROM orders WHERE status = 1 &quot; +</span></span>
<span class="line"><span>                     &quot;ORDER BY create_time DESC LIMIT ?, ?&quot;;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        List&amp;lt;Order&amp;gt; orders = jdbcTemplate.query(sql, </span></span>
<span class="line"><span>            new Object[]{offset, size}, </span></span>
<span class="line"><span>            orderRowMapper);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return new PageResult&lt;&gt;(orders, page, size);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 子查询优化分页（快）</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public PageResult&amp;lt;Order&amp;gt; findOrdersOptimized(int page, int size) {</span></span>
<span class="line"><span>        int offset = (page - 1) * size;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        String sql = &quot;SELECT o.* FROM orders o &quot; +</span></span>
<span class="line"><span>                     &quot;INNER JOIN (&quot; +</span></span>
<span class="line"><span>                     &quot;  SELECT id FROM orders &quot; +</span></span>
<span class="line"><span>                     &quot;  WHERE status = 1 &quot; +</span></span>
<span class="line"><span>                     &quot;  ORDER BY create_time DESC &quot; +</span></span>
<span class="line"><span>                     &quot;  LIMIT ?, ?&quot; +</span></span>
<span class="line"><span>                     &quot;) tmp ON o.id = tmp.id&quot;;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        List&amp;lt;Order&amp;gt; orders = jdbcTemplate.query(sql, </span></span>
<span class="line"><span>            new Object[]{offset, size}, </span></span>
<span class="line"><span>            orderRowMapper);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return new PageResult&lt;&gt;(orders, page, size);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>方案二：游标分页（最佳方案）</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- ✅ 使用上次查询的最后一条记录ID作为起点</span></span>
<span class="line"><span>SELECT * FROM orders </span></span>
<span class="line"><span>WHERE status = 1 </span></span>
<span class="line"><span>  AND id &lt; 999999  -- 上次查询的最后一个ID</span></span>
<span class="line"><span>ORDER BY id DESC </span></span>
<span class="line"><span>LIMIT 20;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 执行时间：0.01秒</span></span>
<span class="line"><span>-- 扫描行数：20行</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class OrderCursorPaginationService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 游标分页（推荐用于移动端滚动加载）</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public CursorPageResult&amp;lt;Order&amp;gt; findOrdersByCursor(Long lastId, int size) {</span></span>
<span class="line"><span>        String sql;</span></span>
<span class="line"><span>        Object[] params;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        if (lastId == null) {</span></span>
<span class="line"><span>            // 第一页</span></span>
<span class="line"><span>            sql = &quot;SELECT * FROM orders WHERE status = 1 &quot; +</span></span>
<span class="line"><span>                  &quot;ORDER BY id DESC LIMIT ?&quot;;</span></span>
<span class="line"><span>            params = new Object[]{size + 1};  // 多查一条判断是否有下一页</span></span>
<span class="line"><span>        } else {</span></span>
<span class="line"><span>            // 后续页</span></span>
<span class="line"><span>            sql = &quot;SELECT * FROM orders WHERE status = 1 AND id &lt; ? &quot; +</span></span>
<span class="line"><span>                  &quot;ORDER BY id DESC LIMIT ?&quot;;</span></span>
<span class="line"><span>            params = new Object[]{lastId, size + 1};</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        List&amp;lt;Order&amp;gt; orders = jdbcTemplate.query(sql, params, orderRowMapper);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        boolean hasNext = orders.size() &gt; size;</span></span>
<span class="line"><span>        if (hasNext) {</span></span>
<span class="line"><span>            orders = orders.subList(0, size);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        Long nextCursor = hasNext &amp;&amp; !orders.isEmpty() </span></span>
<span class="line"><span>            ? orders.get(orders.size() - 1).getId() </span></span>
<span class="line"><span>            : null;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return new CursorPageResult&lt;&gt;(orders, nextCursor, hasNext);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// 返回对象</span></span>
<span class="line"><span>@Data</span></span>
<span class="line"><span>public class CursorPageResult&amp;lt;T&amp;gt; {</span></span>
<span class="line"><span>    private List&amp;lt;T&amp;gt; data;</span></span>
<span class="line"><span>    private Long nextCursor;  // 下次查询的起点</span></span>
<span class="line"><span>    private boolean hasNext;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    public CursorPageResult(List&amp;lt;T&amp;gt; data, Long nextCursor, boolean hasNext) {</span></span>
<span class="line"><span>        this.data = data;</span></span>
<span class="line"><span>        this.nextCursor = nextCursor;</span></span>
<span class="line"><span>        this.hasNext = hasNext;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>方案三：分表 + 搜索引擎（海量数据）</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>/**</span></span>
<span class="line"><span> * ✅ 千万级/亿级数据方案</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Service</span></span>
<span class="line"><span>public class OrderBigDataService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private ElasticsearchRestTemplate esTemplate;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ES做搜索和分页，MySQL存储完整数据</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public PageResult&amp;lt;Order&amp;gt; searchOrders(OrderSearchDTO searchDTO) {</span></span>
<span class="line"><span>        // 1. ES查询，返回ID列表</span></span>
<span class="line"><span>        NativeSearchQuery query = buildSearchQuery(searchDTO);</span></span>
<span class="line"><span>        SearchHits&amp;lt;OrderES&amp;gt; searchHits = esTemplate.search(query, OrderES.class);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        List&amp;lt;Long&amp;gt; orderIds = searchHits.stream()</span></span>
<span class="line"><span>            .map(hit -&gt; hit.getContent().getId())</span></span>
<span class="line"><span>            .collect(Collectors.toList());</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        if (orderIds.isEmpty()) {</span></span>
<span class="line"><span>            return PageResult.empty();</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 2. 根据ID批量查询MySQL（保证数据一致性）</span></span>
<span class="line"><span>        List&amp;lt;Order&amp;gt; orders = orderRepository.findByIdIn(orderIds);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 3. 按ES的排序结果重新排列</span></span>
<span class="line"><span>        Map&lt;Long, Order&gt; orderMap = orders.stream()</span></span>
<span class="line"><span>            .collect(Collectors.toMap(Order::getId, o -&gt; o));</span></span>
<span class="line"><span>        List&amp;lt;Order&amp;gt; sortedOrders = orderIds.stream()</span></span>
<span class="line"><span>            .map(orderMap::get)</span></span>
<span class="line"><span>            .filter(Objects::nonNull)</span></span>
<span class="line"><span>            .collect(Collectors.toList());</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return new PageResult&lt;&gt;(sortedOrders, </span></span>
<span class="line"><span>            searchDTO.getPage(), </span></span>
<span class="line"><span>            searchDTO.getSize(), </span></span>
<span class="line"><span>            searchHits.getTotalHits());</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="_4-事务与死锁优化" tabindex="-1"><a class="header-anchor" href="#_4-事务与死锁优化"><span>4. 事务与死锁优化</span></a></h2><h3 id="_4-1-死锁场景分析" tabindex="-1"><a class="header-anchor" href="#_4-1-死锁场景分析"><span>4.1 死锁场景分析</span></a></h3><h4 id="典型死锁场景" tabindex="-1"><a class="header-anchor" href="#典型死锁场景"><span>典型死锁场景</span></a></h4><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- 会话1</span></span>
<span class="line"><span>BEGIN;</span></span>
<span class="line"><span>UPDATE account SET balance = balance - 100 WHERE id = 1;  -- 锁住id=1</span></span>
<span class="line"><span>-- 等待...</span></span>
<span class="line"><span>UPDATE account SET balance = balance + 100 WHERE id = 2;  -- 等待id=2的锁</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 会话2</span></span>
<span class="line"><span>BEGIN;</span></span>
<span class="line"><span>UPDATE account SET balance = balance - 50 WHERE id = 2;   -- 锁住id=2</span></span>
<span class="line"><span>-- 等待...</span></span>
<span class="line"><span>UPDATE account SET balance = balance + 50 WHERE id = 1;   -- 等待id=1的锁（死锁！）</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-2-死锁解决方案" tabindex="-1"><a class="header-anchor" href="#_4-2-死锁解决方案"><span>4.2 死锁解决方案</span></a></h3><p><strong>方案一：统一加锁顺序</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class AccountTransferService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private JdbcTemplate jdbcTemplate;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ❌ 可能导致死锁：加锁顺序不一致</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    public void transferBadWay(Long fromId, Long toId, BigDecimal amount) {</span></span>
<span class="line"><span>        // 先锁fromId，再锁toId</span></span>
<span class="line"><span>        updateBalance(fromId, amount.negate());</span></span>
<span class="line"><span>        updateBalance(toId, amount);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 避免死锁：统一按ID大小顺序加锁</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    public void transferOptimized(Long fromId, Long toId, BigDecimal amount) {</span></span>
<span class="line"><span>        // 确保总是先锁ID小的，再锁ID大的</span></span>
<span class="line"><span>        Long firstId = Math.min(fromId, toId);</span></span>
<span class="line"><span>        Long secondId = Math.max(fromId, toId);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 先锁定两个账户</span></span>
<span class="line"><span>        Account firstAccount = lockAccount(firstId);</span></span>
<span class="line"><span>        Account secondAccount = lockAccount(secondId);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 再执行业务逻辑</span></span>
<span class="line"><span>        if (fromId.equals(firstId)) {</span></span>
<span class="line"><span>            firstAccount.setBalance(firstAccount.getBalance().subtract(amount));</span></span>
<span class="line"><span>            secondAccount.setBalance(secondAccount.getBalance().add(amount));</span></span>
<span class="line"><span>        } else {</span></span>
<span class="line"><span>            firstAccount.setBalance(firstAccount.getBalance().add(amount));</span></span>
<span class="line"><span>            secondAccount.setBalance(secondAccount.getBalance().subtract(amount));</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        updateAccount(firstAccount);</span></span>
<span class="line"><span>        updateAccount(secondAccount);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 使用SELECT ... FOR UPDATE显式加锁</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    private Account lockAccount(Long accountId) {</span></span>
<span class="line"><span>        String sql = &quot;SELECT * FROM account WHERE id = ? FOR UPDATE&quot;;</span></span>
<span class="line"><span>        return jdbcTemplate.queryForObject(sql, new Object[]{accountId}, accountRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>方案二：减小事务粒度</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class OrderService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ❌ 大事务：锁持有时间长，容易死锁</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    public void processOrderBadWay(Long orderId) {</span></span>
<span class="line"><span>        Order order = orderRepository.findById(orderId);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 复杂业务逻辑（耗时操作）</span></span>
<span class="line"><span>        calculateDiscount(order);</span></span>
<span class="line"><span>        checkInventory(order);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 外部调用（网络IO，非常耗时！）</span></span>
<span class="line"><span>        PaymentResult paymentResult = paymentService.pay(order);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 更新订单状态</span></span>
<span class="line"><span>        order.setStatus(OrderStatus.PAID);</span></span>
<span class="line"><span>        orderRepository.save(order);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 小事务：只在必要时加锁</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public void processOrderOptimized(Long orderId) {</span></span>
<span class="line"><span>        Order order = orderRepository.findById(orderId);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 1. 非事务操作：计算和检查</span></span>
<span class="line"><span>        calculateDiscount(order);</span></span>
<span class="line"><span>        checkInventory(order);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 2. 非事务操作：支付（外部调用）</span></span>
<span class="line"><span>        PaymentResult paymentResult = paymentService.pay(order);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 3. 事务操作：只在更新数据时开启事务</span></span>
<span class="line"><span>        updateOrderStatus(orderId, OrderStatus.PAID, paymentResult);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    private void updateOrderStatus(Long orderId, OrderStatus status, PaymentResult result) {</span></span>
<span class="line"><span>        // 事务内只做数据库更新，快速释放锁</span></span>
<span class="line"><span>        orderRepository.updateStatus(orderId, status);</span></span>
<span class="line"><span>        paymentRepository.save(result);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>方案三：乐观锁替代悲观锁</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- 表结构：添加版本号字段</span></span>
<span class="line"><span>CREATE TABLE \`inventory\` (</span></span>
<span class="line"><span>  \`id\` bigint NOT NULL AUTO_INCREMENT,</span></span>
<span class="line"><span>  \`product_id\` bigint NOT NULL,</span></span>
<span class="line"><span>  \`stock\` int NOT NULL,</span></span>
<span class="line"><span>  \`version\` int NOT NULL DEFAULT &#39;0&#39;,  -- 版本号</span></span>
<span class="line"><span>  PRIMARY KEY (\`id\`),</span></span>
<span class="line"><span>  KEY \`idx_product_id\` (\`product_id\`)</span></span>
<span class="line"><span>) ENGINE=InnoDB;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Service</span></span>
<span class="line"><span>public class InventoryService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ❌ 悲观锁：SELECT FOR UPDATE（可能死锁）</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    public boolean deductStockPessimistic(Long productId, int quantity) {</span></span>
<span class="line"><span>        String lockSql = &quot;SELECT * FROM inventory WHERE product_id = ? FOR UPDATE&quot;;</span></span>
<span class="line"><span>        Inventory inventory = jdbcTemplate.queryForObject(lockSql, </span></span>
<span class="line"><span>            new Object[]{productId}, inventoryRowMapper);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        if (inventory.getStock() &lt; quantity) {</span></span>
<span class="line"><span>            return false;</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        String updateSql = &quot;UPDATE inventory SET stock = stock - ? WHERE product_id = ?&quot;;</span></span>
<span class="line"><span>        jdbcTemplate.update(updateSql, quantity, productId);</span></span>
<span class="line"><span>        return true;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 乐观锁：使用版本号（避免死锁）</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    public boolean deductStockOptimistic(Long productId, int quantity) {</span></span>
<span class="line"><span>        // 1. 查询当前库存和版本号（无锁）</span></span>
<span class="line"><span>        String selectSql = &quot;SELECT * FROM inventory WHERE product_id = ?&quot;;</span></span>
<span class="line"><span>        Inventory inventory = jdbcTemplate.queryForObject(selectSql, </span></span>
<span class="line"><span>            new Object[]{productId}, inventoryRowMapper);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        if (inventory.getStock() &lt; quantity) {</span></span>
<span class="line"><span>            return false;</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 2. 更新时校验版本号</span></span>
<span class="line"><span>        String updateSql = &quot;UPDATE inventory &quot; +</span></span>
<span class="line"><span>                           &quot;SET stock = stock - ?, version = version + 1 &quot; +</span></span>
<span class="line"><span>                           &quot;WHERE product_id = ? AND version = ?&quot;;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        int affected = jdbcTemplate.update(updateSql, </span></span>
<span class="line"><span>            quantity, productId, inventory.getVersion());</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 3. 如果affected=0，说明版本号已变化，需要重试</span></span>
<span class="line"><span>        return affected &gt; 0;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * ✅ 带重试机制的乐观锁</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public boolean deductStockWithRetry(Long productId, int quantity) {</span></span>
<span class="line"><span>        int maxRetries = 3;</span></span>
<span class="line"><span>        for (int i = 0; i &lt; maxRetries; i++) {</span></span>
<span class="line"><span>            try {</span></span>
<span class="line"><span>                if (deductStockOptimistic(productId, quantity)) {</span></span>
<span class="line"><span>                    return true;</span></span>
<span class="line"><span>                }</span></span>
<span class="line"><span>                // 版本冲突，等待后重试</span></span>
<span class="line"><span>                Thread.sleep(50 * (i + 1));  // 指数退避</span></span>
<span class="line"><span>            } catch (InterruptedException e) {</span></span>
<span class="line"><span>                Thread.currentThread().interrupt();</span></span>
<span class="line"><span>                return false;</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        return false;  // 重试失败</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-3-死锁监控与告警" tabindex="-1"><a class="header-anchor" href="#_4-3-死锁监控与告警"><span>4.3 死锁监控与告警</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>@Component</span></span>
<span class="line"><span>public class DeadlockMonitor {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private JdbcTemplate jdbcTemplate;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private AlertService alertService;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 定时检测死锁</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Scheduled(fixedRate = 60000)  // 每分钟执行一次</span></span>
<span class="line"><span>    public void monitorDeadlocks() {</span></span>
<span class="line"><span>        try {</span></span>
<span class="line"><span>            String sql = &quot;SHOW ENGINE INNODB STATUS&quot;;</span></span>
<span class="line"><span>            String status = jdbcTemplate.queryForObject(sql, String.class);</span></span>
<span class="line"><span>            </span></span>
<span class="line"><span>            // 检查是否包含死锁信息</span></span>
<span class="line"><span>            if (status.contains(&quot;LATEST DETECTED DEADLOCK&quot;)) {</span></span>
<span class="line"><span>                // 解析死锁信息</span></span>
<span class="line"><span>                String deadlockInfo = extractDeadlockInfo(status);</span></span>
<span class="line"><span>                </span></span>
<span class="line"><span>                // 发送告警</span></span>
<span class="line"><span>                alertService.sendAlert(&quot;MySQL死锁告警&quot;, deadlockInfo);</span></span>
<span class="line"><span>                </span></span>
<span class="line"><span>                // 记录日志</span></span>
<span class="line"><span>                log.error(&quot;检测到MySQL死锁: {}&quot;, deadlockInfo);</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        } catch (Exception e) {</span></span>
<span class="line"><span>            log.error(&quot;死锁监控异常&quot;, e);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    private String extractDeadlockInfo(String status) {</span></span>
<span class="line"><span>        // 解析SHOW ENGINE INNODB STATUS的输出</span></span>
<span class="line"><span>        // 提取死锁相关的SQL和表信息</span></span>
<span class="line"><span>        // ...</span></span>
<span class="line"><span>        return &quot;死锁详细信息&quot;;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="_5-主从复制高可用方案" tabindex="-1"><a class="header-anchor" href="#_5-主从复制高可用方案"><span>5. 主从复制高可用方案</span></a></h2><h3 id="_5-1-半同步复制配置" tabindex="-1"><a class="header-anchor" href="#_5-1-半同步复制配置"><span>5.1 半同步复制配置</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- 主库配置</span></span>
<span class="line"><span>-- my.cnf</span></span>
<span class="line"><span>[mysqld]</span></span>
<span class="line"><span>server-id=1</span></span>
<span class="line"><span>log-bin=mysql-bin</span></span>
<span class="line"><span>binlog_format=ROW</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 开启半同步复制插件</span></span>
<span class="line"><span>plugin-load=&quot;rpl_semi_sync_master=semisync_master.so&quot;</span></span>
<span class="line"><span>rpl_semi_sync_master_enabled=1</span></span>
<span class="line"><span>rpl_semi_sync_master_timeout=1000  # 超时时间1秒</span></span>
<span class="line"><span></span></span>
<span class="line"><span>-- 从库配置</span></span>
<span class="line"><span>-- my.cnf</span></span>
<span class="line"><span>[mysqld]</span></span>
<span class="line"><span>server-id=2</span></span>
<span class="line"><span>relay-log=mysql-relay-bin</span></span>
<span class="line"><span>read_only=1</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 开启半同步复制插件</span></span>
<span class="line"><span>plugin-load=&quot;rpl_semi_sync_slave=semisync_slave.so&quot;</span></span>
<span class="line"><span>rpl_semi_sync_slave_enabled=1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_5-2-读写分离实现" tabindex="-1"><a class="header-anchor" href="#_5-2-读写分离实现"><span>5.2 读写分离实现</span></a></h3><p><strong>方案一：Spring Boot + MyBatis多数据源</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>/**</span></span>
<span class="line"><span> * 数据源配置</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Configuration</span></span>
<span class="line"><span>public class DataSourceConfig {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Bean</span></span>
<span class="line"><span>    @ConfigurationProperties(&quot;spring.datasource.master&quot;)</span></span>
<span class="line"><span>    public DataSource masterDataSource() {</span></span>
<span class="line"><span>        return DataSourceBuilder.create().build();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Bean</span></span>
<span class="line"><span>    @ConfigurationProperties(&quot;spring.datasource.slave&quot;)</span></span>
<span class="line"><span>    public DataSource slaveDataSource() {</span></span>
<span class="line"><span>        return DataSourceBuilder.create().build();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Bean</span></span>
<span class="line"><span>    @Primary</span></span>
<span class="line"><span>    public DataSource dynamicDataSource() {</span></span>
<span class="line"><span>        DynamicRoutingDataSource dataSource = new DynamicRoutingDataSource();</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        Map&lt;Object, Object&gt; targetDataSources = new HashMap&lt;&gt;();</span></span>
<span class="line"><span>        targetDataSources.put(DataSourceType.MASTER, masterDataSource());</span></span>
<span class="line"><span>        targetDataSources.put(DataSourceType.SLAVE, slaveDataSource());</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        dataSource.setTargetDataSources(targetDataSources);</span></span>
<span class="line"><span>        dataSource.setDefaultTargetDataSource(masterDataSource());</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return dataSource;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>/**</span></span>
<span class="line"><span> * 动态数据源路由</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>public class DynamicRoutingDataSource extends AbstractRoutingDataSource {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Override</span></span>
<span class="line"><span>    protected Object determineCurrentLookupKey() {</span></span>
<span class="line"><span>        return DataSourceContextHolder.getDataSourceType();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>/**</span></span>
<span class="line"><span> * 数据源上下文（ThreadLocal）</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>public class DataSourceContextHolder {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    private static final ThreadLocal&amp;lt;DataSourceType&amp;gt; CONTEXT = new ThreadLocal&lt;&gt;();</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    public static void setDataSourceType(DataSourceType type) {</span></span>
<span class="line"><span>        CONTEXT.set(type);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    public static DataSourceType getDataSourceType() {</span></span>
<span class="line"><span>        return CONTEXT.get();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    public static void clear() {</span></span>
<span class="line"><span>        CONTEXT.remove();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>/**</span></span>
<span class="line"><span> * 自定义注解</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Target({ElementType.METHOD, ElementType.TYPE})</span></span>
<span class="line"><span>@Retention(RetentionPolicy.RUNTIME)</span></span>
<span class="line"><span>public @interface DataSource {</span></span>
<span class="line"><span>    DataSourceType value() default DataSourceType.MASTER;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>/**</span></span>
<span class="line"><span> * AOP切面：自动切换数据源</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Aspect</span></span>
<span class="line"><span>@Component</span></span>
<span class="line"><span>@Order(1)  // 确保在@Transactional之前执行</span></span>
<span class="line"><span>public class DataSourceAspect {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Around(&quot;@annotation(dataSource)&quot;)</span></span>
<span class="line"><span>    public Object around(ProceedingJoinPoint point, DataSource dataSource) throws Throwable {</span></span>
<span class="line"><span>        try {</span></span>
<span class="line"><span>            DataSourceContextHolder.setDataSourceType(dataSource.value());</span></span>
<span class="line"><span>            return point.proceed();</span></span>
<span class="line"><span>        } finally {</span></span>
<span class="line"><span>            DataSourceContextHolder.clear();</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>/**</span></span>
<span class="line"><span> * 业务代码使用</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Service</span></span>
<span class="line"><span>public class UserService {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private UserMapper userMapper;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 写操作：走主库</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @DataSource(DataSourceType.MASTER)</span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    public void createUser(User user) {</span></span>
<span class="line"><span>        userMapper.insert(user);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 读操作：走从库</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @DataSource(DataSourceType.SLAVE)</span></span>
<span class="line"><span>    public User getUserById(Long id) {</span></span>
<span class="line"><span>        return userMapper.selectById(id);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 读操作：要求强一致性，走主库</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @DataSource(DataSourceType.MASTER)</span></span>
<span class="line"><span>    public User getUserByIdFromMaster(Long id) {</span></span>
<span class="line"><span>        return userMapper.selectById(id);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>方案二：ShardingSphere读写分离</strong></p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span># application.yml</span></span>
<span class="line"><span>spring:</span></span>
<span class="line"><span>  shardingsphere:</span></span>
<span class="line"><span>    datasource:</span></span>
<span class="line"><span>      names: master,slave0,slave1</span></span>
<span class="line"><span>      master:</span></span>
<span class="line"><span>        type: com.zaxxer.hikari.HikariDataSource</span></span>
<span class="line"><span>        driver-class-name: com.mysql.cj.jdbc.Driver</span></span>
<span class="line"><span>        jdbc-url: jdbc:mysql://master:3306/db</span></span>
<span class="line"><span>        username: root</span></span>
<span class="line"><span>        password: password</span></span>
<span class="line"><span>      slave0:</span></span>
<span class="line"><span>        type: com.zaxxer.hikari.HikariDataSource</span></span>
<span class="line"><span>        driver-class-name: com.mysql.cj.jdbc.Driver</span></span>
<span class="line"><span>        jdbc-url: jdbc:mysql://slave0:3306/db</span></span>
<span class="line"><span>        username: root</span></span>
<span class="line"><span>        password: password</span></span>
<span class="line"><span>      slave1:</span></span>
<span class="line"><span>        type: com.zaxxer.hikari.HikariDataSource</span></span>
<span class="line"><span>        driver-class-name: com.mysql.cj.jdbc.Driver</span></span>
<span class="line"><span>        jdbc-url: jdbc:mysql://slave1:3306/db</span></span>
<span class="line"><span>        username: root</span></span>
<span class="line"><span>        password: password</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    rules:</span></span>
<span class="line"><span>      readwrite-splitting:</span></span>
<span class="line"><span>        data-sources:</span></span>
<span class="line"><span>          ds:</span></span>
<span class="line"><span>            type: Static</span></span>
<span class="line"><span>            props:</span></span>
<span class="line"><span>              write-data-source-name: master</span></span>
<span class="line"><span>              read-data-source-names: slave0,slave1</span></span>
<span class="line"><span>            load-balancer-name: round-robin</span></span>
<span class="line"><span>        load-balancers:</span></span>
<span class="line"><span>          round-robin:</span></span>
<span class="line"><span>            type: ROUND_ROBIN</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    props:</span></span>
<span class="line"><span>      sql-show: true</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>/**</span></span>
<span class="line"><span> * 使用ShardingSphere，业务代码无需修改</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Service</span></span>
<span class="line"><span>public class UserServiceWithShardingSphere {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private UserMapper userMapper;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 写操作：自动路由到主库</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    public void createUser(User user) {</span></span>
<span class="line"><span>        userMapper.insert(user);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 读操作：自动路由到从库（轮询）</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public User getUserById(Long id) {</span></span>
<span class="line"><span>        return userMapper.selectById(id);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 强制走主库：使用HintManager</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public User getUserByIdFromMaster(Long id) {</span></span>
<span class="line"><span>        try (HintManager hintManager = HintManager.getInstance()) {</span></span>
<span class="line"><span>            hintManager.setWriteRouteOnly();  // 强制走主库</span></span>
<span class="line"><span>            return userMapper.selectById(id);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_5-3-主从延迟处理" tabindex="-1"><a class="header-anchor" href="#_5-3-主从延迟处理"><span>5.3 主从延迟处理</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>/**</span></span>
<span class="line"><span> * 主从延迟解决方案</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Service</span></span>
<span class="line"><span>public class UserServiceWithDelayHandle {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private UserMapper userMapper;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private RedisTemplate&lt;String, Object&gt; redisTemplate;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    private static final String USER_CACHE_KEY = &quot;user:&quot;;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 方案一：写入后短时间内强制读主库</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    public void createUserWithMasterRead(User user) {</span></span>
<span class="line"><span>        // 1. 写入主库</span></span>
<span class="line"><span>        userMapper.insert(user);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 2. 标记该用户需要从主库读取（5秒内）</span></span>
<span class="line"><span>        String key = &quot;master_read:user:&quot; + user.getId();</span></span>
<span class="line"><span>        redisTemplate.opsForValue().set(key, &quot;1&quot;, 5, TimeUnit.SECONDS);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    public User getUserById(Long id) {</span></span>
<span class="line"><span>        // 检查是否需要强制读主库</span></span>
<span class="line"><span>        String key = &quot;master_read:user:&quot; + id;</span></span>
<span class="line"><span>        if (Boolean.TRUE.equals(redisTemplate.hasKey(key))) {</span></span>
<span class="line"><span>            return getUserByIdFromMaster(id);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 正常读从库</span></span>
<span class="line"><span>        return userMapper.selectById(id);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 方案二：写入后同步缓存，读取时优先读缓存</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Transactional</span></span>
<span class="line"><span>    public void createUserWithCache(User user) {</span></span>
<span class="line"><span>        // 1. 写入主库</span></span>
<span class="line"><span>        userMapper.insert(user);</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 2. 同步写入缓存</span></span>
<span class="line"><span>        String cacheKey = USER_CACHE_KEY + user.getId();</span></span>
<span class="line"><span>        redisTemplate.opsForValue().set(cacheKey, user, 10, TimeUnit.MINUTES);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    public User getUserByIdWithCache(Long id) {</span></span>
<span class="line"><span>        // 1. 先查缓存</span></span>
<span class="line"><span>        String cacheKey = USER_CACHE_KEY + id;</span></span>
<span class="line"><span>        User user = (User) redisTemplate.opsForValue().get(cacheKey);</span></span>
<span class="line"><span>        if (user != null) {</span></span>
<span class="line"><span>            return user;</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 2. 缓存没有，查从库</span></span>
<span class="line"><span>        user = userMapper.selectById(id);</span></span>
<span class="line"><span>        if (user != null) {</span></span>
<span class="line"><span>            redisTemplate.opsForValue().set(cacheKey, user, 10, TimeUnit.MINUTES);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return user;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @DataSource(DataSourceType.MASTER)</span></span>
<span class="line"><span>    private User getUserByIdFromMaster(Long id) {</span></span>
<span class="line"><span>        return userMapper.selectById(id);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="_6-综合优化最佳实践" tabindex="-1"><a class="header-anchor" href="#_6-综合优化最佳实践"><span>6. 综合优化最佳实践</span></a></h2><h3 id="_6-1-慢查询日志分析" tabindex="-1"><a class="header-anchor" href="#_6-1-慢查询日志分析"><span>6.1 慢查询日志分析</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>-- 开启慢查询日志</span></span>
<span class="line"><span>SET GLOBAL slow_query_log = &#39;ON&#39;;</span></span>
<span class="line"><span>SET GLOBAL long_query_time = 1;  -- 超过1秒的查询记录为慢查询</span></span>
<span class="line"><span>SET GLOBAL slow_query_log_file = &#39;/var/log/mysql/slow.log&#39;;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>/**</span></span>
<span class="line"><span> * 慢查询监控与分析</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Component</span></span>
<span class="line"><span>public class SlowQueryMonitor {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private JdbcTemplate jdbcTemplate;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 定时分析慢查询日志</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    @Scheduled(cron = &quot;0 0 2 * * ?&quot;)  // 每天凌晨2点执行</span></span>
<span class="line"><span>    public void analyzeSlowQueries() {</span></span>
<span class="line"><span>        // 使用pt-query-digest分析慢查询日志</span></span>
<span class="line"><span>        String command = &quot;pt-query-digest /var/log/mysql/slow.log &gt; /tmp/slow_query_report.txt&quot;;</span></span>
<span class="line"><span>        // 执行命令...</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 发送报告</span></span>
<span class="line"><span>        sendSlowQueryReport();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>     * 获取当前慢查询统计</span></span>
<span class="line"><span>     */</span></span>
<span class="line"><span>    public List&amp;lt;SlowQueryInfo&amp;gt; getSlowQueryStats() {</span></span>
<span class="line"><span>        String sql = &quot;SELECT &quot; +</span></span>
<span class="line"><span>                     &quot;  sql_text, &quot; +</span></span>
<span class="line"><span>                     &quot;  count_star as exec_count, &quot; +</span></span>
<span class="line"><span>                     &quot;  avg_timer_wait / 1000000000000 as avg_time_sec, &quot; +</span></span>
<span class="line"><span>                     &quot;  sum_rows_examined as total_rows_scanned &quot; +</span></span>
<span class="line"><span>                     &quot;FROM performance_schema.events_statements_summary_by_digest &quot; +</span></span>
<span class="line"><span>                     &quot;WHERE avg_timer_wait &gt; 1000000000000 &quot; +  // 超过1秒</span></span>
<span class="line"><span>                     &quot;ORDER BY avg_timer_wait DESC &quot; +</span></span>
<span class="line"><span>                     &quot;LIMIT 20&quot;;</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return jdbcTemplate.query(sql, slowQueryRowMapper);</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_6-2-连接池优化" tabindex="-1"><a class="header-anchor" href="#_6-2-连接池优化"><span>6.2 连接池优化</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span># application.yml</span></span>
<span class="line"><span>spring:</span></span>
<span class="line"><span>  datasource:</span></span>
<span class="line"><span>    type: com.zaxxer.hikari.HikariDataSource</span></span>
<span class="line"><span>    hikari:</span></span>
<span class="line"><span>      # 连接池配置</span></span>
<span class="line"><span>      minimum-idle: 10              # 最小空闲连接数</span></span>
<span class="line"><span>      maximum-pool-size: 50         # 最大连接数</span></span>
<span class="line"><span>      connection-timeout: 30000     # 连接超时时间（毫秒）</span></span>
<span class="line"><span>      idle-timeout: 600000          # 空闲连接超时时间（10分钟）</span></span>
<span class="line"><span>      max-lifetime: 1800000         # 连接最大生命周期（30分钟）</span></span>
<span class="line"><span>      </span></span>
<span class="line"><span>      # 连接测试</span></span>
<span class="line"><span>      connection-test-query: SELECT 1</span></span>
<span class="line"><span>      validation-timeout: 5000</span></span>
<span class="line"><span>      </span></span>
<span class="line"><span>      # 性能优化</span></span>
<span class="line"><span>      auto-commit: true</span></span>
<span class="line"><span>      read-only: false</span></span>
<span class="line"><span>      </span></span>
<span class="line"><span>      # 连接池名称</span></span>
<span class="line"><span>      pool-name: HikariCP-MySQL</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>/**</span></span>
<span class="line"><span> * 连接池监控</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Component</span></span>
<span class="line"><span>public class DataSourceMonitor {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Autowired</span></span>
<span class="line"><span>    private DataSource dataSource;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Scheduled(fixedRate = 60000)  // 每分钟</span></span>
<span class="line"><span>    public void monitorConnectionPool() {</span></span>
<span class="line"><span>        if (dataSource instanceof HikariDataSource) {</span></span>
<span class="line"><span>            HikariDataSource hikariDS = (HikariDataSource) dataSource;</span></span>
<span class="line"><span>            HikariPoolMXBean poolMXBean = hikariDS.getHikariPoolMXBean();</span></span>
<span class="line"><span>            </span></span>
<span class="line"><span>            log.info(&quot;连接池状态 - 活跃连接: {}, 空闲连接: {}, 等待线程: {}, 总连接: {}&quot;,</span></span>
<span class="line"><span>                poolMXBean.getActiveConnections(),</span></span>
<span class="line"><span>                poolMXBean.getIdleConnections(),</span></span>
<span class="line"><span>                poolMXBean.getThreadsAwaitingConnection(),</span></span>
<span class="line"><span>                poolMXBean.getTotalConnections());</span></span>
<span class="line"><span>            </span></span>
<span class="line"><span>            // 告警：连接池使用率超过80%</span></span>
<span class="line"><span>            if (poolMXBean.getActiveConnections() &gt; hikariDS.getMaximumPoolSize() * 0.8) {</span></span>
<span class="line"><span>                log.warn(&quot;连接池使用率过高！&quot;);</span></span>
<span class="line"><span>                // 发送告警...</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_6-3-sql审核与规范" tabindex="-1"><a class="header-anchor" href="#_6-3-sql审核与规范"><span>6.3 SQL审核与规范</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>/**</span></span>
<span class="line"><span> * SQL拦截器：审核SQL规范</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>@Component</span></span>
<span class="line"><span>@Intercepts({</span></span>
<span class="line"><span>    @Signature(</span></span>
<span class="line"><span>        type = StatementHandler.class,</span></span>
<span class="line"><span>        method = &quot;prepare&quot;,</span></span>
<span class="line"><span>        args = {Connection.class, Integer.class}</span></span>
<span class="line"><span>    )</span></span>
<span class="line"><span>})</span></span>
<span class="line"><span>public class SqlAuditInterceptor implements Interceptor {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    private static final int MAX_LIMIT = 1000;</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    @Override</span></span>
<span class="line"><span>    public Object intercept(Invocation invocation) throws Throwable {</span></span>
<span class="line"><span>        StatementHandler statementHandler = (StatementHandler) invocation.getTarget();</span></span>
<span class="line"><span>        BoundSql boundSql = statementHandler.getBoundSql();</span></span>
<span class="line"><span>        String sql = boundSql.getSql().toLowerCase();</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 1. 检查是否有LIMIT</span></span>
<span class="line"><span>        if (sql.contains(&quot;select&quot;) &amp;&amp; !sql.contains(&quot;limit&quot;)) {</span></span>
<span class="line"><span>            log.warn(&quot;SQL未添加LIMIT: {}&quot;, sql);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 2. 检查LIMIT是否过大</span></span>
<span class="line"><span>        Pattern pattern = Pattern.compile(&quot;limit\\\\s+(\\\\d+)&quot;);</span></span>
<span class="line"><span>        Matcher matcher = pattern.matcher(sql);</span></span>
<span class="line"><span>        if (matcher.find()) {</span></span>
<span class="line"><span>            int limit = Integer.parseInt(matcher.group(1));</span></span>
<span class="line"><span>            if (limit &gt; MAX_LIMIT) {</span></span>
<span class="line"><span>                throw new IllegalArgumentException(</span></span>
<span class="line"><span>                    &quot;LIMIT不能超过&quot; + MAX_LIMIT + &quot;, 当前: &quot; + limit);</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 3. 检查是否使用SELECT *</span></span>
<span class="line"><span>        if (sql.contains(&quot;select *&quot;)) {</span></span>
<span class="line"><span>            log.warn(&quot;不建议使用SELECT *, 应该明确指定字段: {}&quot;, sql);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        // 4. 检查是否有WHERE条件（UPDATE/DELETE）</span></span>
<span class="line"><span>        if ((sql.contains(&quot;update&quot;) || sql.contains(&quot;delete&quot;)) </span></span>
<span class="line"><span>            &amp;&amp; !sql.contains(&quot;where&quot;)) {</span></span>
<span class="line"><span>            throw new IllegalArgumentException(</span></span>
<span class="line"><span>                &quot;UPDATE/DELETE必须包含WHERE条件: &quot; + sql);</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        </span></span>
<span class="line"><span>        return invocation.proceed();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr><h2 id="总结" tabindex="-1"><a class="header-anchor" href="#总结"><span>总结</span></a></h2><h3 id="优化决策树" tabindex="-1"><a class="header-anchor" href="#优化决策树"><span>优化决策树</span></a></h3><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>遇到MySQL性能问题</span></span>
<span class="line"><span>    ↓</span></span>
<span class="line"><span>是否开启了慢查询日志？</span></span>
<span class="line"><span>    ↓ 是</span></span>
<span class="line"><span>查看EXPLAIN执行计划</span></span>
<span class="line"><span>    ↓</span></span>
<span class="line"><span>是否走索引？</span></span>
<span class="line"><span>    ↓ 否</span></span>
<span class="line"><span>检查索引失效原因：</span></span>
<span class="line"><span>    - 函数/类型转换？</span></span>
<span class="line"><span>    - LIKE前缀模糊？</span></span>
<span class="line"><span>    - OR条件？</span></span>
<span class="line"><span>    - 优化器选择？</span></span>
<span class="line"><span>    ↓ 已走索引但仍慢</span></span>
<span class="line"><span>检查是否回表？</span></span>
<span class="line"><span>    ↓ 是</span></span>
<span class="line"><span>    - 考虑覆盖索引</span></span>
<span class="line"><span>    - 考虑索引下推</span></span>
<span class="line"><span>    ↓</span></span>
<span class="line"><span>是否深分页？</span></span>
<span class="line"><span>    ↓ 是</span></span>
<span class="line"><span>    - 子查询优化</span></span>
<span class="line"><span>    - 游标分页</span></span>
<span class="line"><span>    ↓</span></span>
<span class="line"><span>是否高并发死锁？</span></span>
<span class="line"><span>    ↓ 是</span></span>
<span class="line"><span>    - 统一加锁顺序</span></span>
<span class="line"><span>    - 减小事务粒度</span></span>
<span class="line"><span>    - 乐观锁替代悲观锁</span></span>
<span class="line"><span>    ↓</span></span>
<span class="line"><span>是否主从延迟？</span></span>
<span class="line"><span>    ↓ 是</span></span>
<span class="line"><span>    - 半同步复制</span></span>
<span class="line"><span>    - 写后短时读主库</span></span>
<span class="line"><span>    - 缓存方案</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="关键指标" tabindex="-1"><a class="header-anchor" href="#关键指标"><span>关键指标</span></a></h3><p><strong>指标</strong><br><strong>阈值</strong><br><strong>说明</strong></p><p>查询响应时间<br> &lt; 100ms<br> 超过需优化</p><p>慢查询比例<br> &lt; 1%<br> 慢查询/总查询</p><p>连接池使用率<br> &lt; 80%<br> 超过需扩容</p><p>主从延迟<br> &lt; 1s<br> 超过影响业务</p><p>索引命中率</p><blockquote><p>95%<br> InnoDB Buffer Pool</p></blockquote><p>死锁频率<br> 0<br> 每小时死锁次数</p><p><strong>Look at me! 这才是真正的MySQL优化方案，不是简单说一句&quot;加个索引&quot;就完事了！</strong></p>`,110)]])}var s=r(a,[[`render`,o]]);export{i as _pageData,s as default};