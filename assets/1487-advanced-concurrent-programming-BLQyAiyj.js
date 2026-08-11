import{a as e,c as t,i as n}from"./app-DBBTFyea.js";import{t as r}from"./plugin-vue_export-helper-BDNMzG2s.js";var i=JSON.parse(`{"path":"/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming.html","title":"进阶并发编程","lang":"zh-CN","frontmatter":{"title":"进阶并发编程","sidebarGroup":"GoLang","shortTitle":"进阶并发编程","order":1487,"date":"2025-12-30T00:00:00.000Z","category":"面试题","tag":["面试题"],"description":"课程介绍：\\tgolang基本语言 编程基础 有并发经验更好\\tGoLang 核心优势 高性能的支撑 高并发\\t概览 进程Process 与线程 Thread进程定义:进程 是并发执行的程序中分配和管理资源的基本单位。线程定义：线程是进程的执行单","article":false,"head":[["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"WebPage\\",\\"name\\":\\"进阶并发编程\\",\\"description\\":\\"课程介绍：\\\\tgolang基本语言 编程基础 有并发经验更好\\\\tGoLang 核心优势 高性能的支撑 高并发\\\\t概览 进程Process 与线程 Thread进程定义:进程 是并发执行的程序中分配和管理资源的基本单位。线程定义：线程是进程的执行单\\"}"],["meta",{"property":"og:url","content":"https://www.code-corey.com/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming.html"}],["meta",{"property":"og:site_name","content":"Corey 知识库"}],["meta",{"property":"og:title","content":"进阶并发编程"}],["meta",{"property":"og:description","content":"课程介绍：\\tgolang基本语言 编程基础 有并发经验更好\\tGoLang 核心优势 高性能的支撑 高并发\\t概览 进程Process 与线程 Thread进程定义:进程 是并发执行的程序中分配和管理资源的基本单位。线程定义：线程是进程的执行单"}],["meta",{"property":"og:type","content":"website"}],["meta",{"property":"og:image","content":"https://www.code-corey.com/面试题/GoLang/1487-advanced-concurrent-programming/img-1d2b7f70a609.png"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2026-08-09T03:10:04.000Z"}],["meta",{"property":"article:tag","content":"面试题"}],["meta",{"property":"article:published_time","content":"2025-12-30T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2026-08-09T03:10:04.000Z"}]]},"git":{"createdTime":1786240216000,"updatedTime":1786245004000,"contributors":[{"name":"langkemaoxin","username":"langkemaoxin","email":"2363613998@qq.com","commits":3,"url":"https://github.com/langkemaoxin"},{"name":"Cursor","username":"Cursor","email":"cursoragent@cursor.com","commits":3,"url":"https://github.com/Cursor"}]},"readingTime":{"minutes":10.21,"words":3063},"filePathRelative":"面试题/GoLang/1487-advanced-concurrent-programming.md","excerpt":"<blockquote>\\n<p>来源：<a href=\\"https://www.yuque.com/tulingzhouyu/db22bv/ekdzhf1uxhipuush\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">进阶并发编程</a></p>\\n</blockquote>\\n<h4><a href=\\"https://www.yuque.com/tianming-aroh0/sagnbd/nfkf7dvzxgp26nw4\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">课程介绍</a>：</h4>\\n<p>golang基本语言 编程基础 有并发经验更好</p>"}`),a={name:`1487-advanced-concurrent-programming.md`};function o(r,i,a,o,s,c){return t(),n(`div`,null,[...i[0]||=[e(`<blockquote><p>来源：<a href="https://www.yuque.com/tulingzhouyu/db22bv/ekdzhf1uxhipuush" target="_blank" rel="noopener noreferrer">进阶并发编程</a></p></blockquote><h4 id="课程介绍" tabindex="-1"><a class="header-anchor" href="#课程介绍"><span><a href="https://www.yuque.com/tianming-aroh0/sagnbd/nfkf7dvzxgp26nw4" target="_blank" rel="noopener noreferrer">课程介绍</a>：</span></a></h4><p>golang基本语言 编程基础 有并发经验更好</p><p>GoLang 核心优势 高性能的支撑 高并发</p><p>概览</p><h5 id="进程process-与线程-thread" tabindex="-1"><a class="header-anchor" href="#进程process-与线程-thread"><span><strong>进程Process 与线程 Thread</strong></span></a></h5><p>进程定义:进程 是并发执行的程序中分配和管理资源的基本单位。</p><p>线程定义：线程是进程的执行单元，是进行调度的实体，是比进程更小的独立运行单位。</p><h5 id="并行concurrent与并发paralled" tabindex="-1"><a class="header-anchor" href="#并行concurrent与并发paralled"><span>并行Concurrent与并发Paralled</span></a></h5><p>并发定义： 多线程交替操作同一资源类</p><p>并行定义：多个线程同时操作多个资源类</p><h5 id="图解" tabindex="-1"><a class="header-anchor" href="#图解"><span>图解：</span></a></h5><p>Erlang 之父 Joe Armstrong 用一张5岁小孩都能看懂的图解释了并发与并行的区别</p><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-1d2b7f70a609.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><h4 id="协程-goroutine-的引入" tabindex="-1"><a class="header-anchor" href="#协程-goroutine-的引入"><span>协程 goroutine 的引入</span></a></h4><h5 id="需求" tabindex="-1"><a class="header-anchor" href="#需求"><span>需求 :</span></a></h5><p>统计 1~2000000的数字中 哪些是素数</p><p>传统方式 ：使用循环 判断，</p><p>优化：使用并发和并行的方式</p><p>Golang：将统计分配给多个 goroutine去完成</p><h5 id="协程的基本概念" tabindex="-1"><a class="header-anchor" href="#协程的基本概念"><span>协程的基本概念：</span></a></h5><p>协程：</p><p>协程是单线程下的并发，又称微线程，纤程。它是实现多任务的另一种方式，只不过是比线程更小的执行单元。因为它自带CPU的上下文，这样只要在合适的时机，我们可以把一个协程切换到另一个协程。英文名Coroutine。</p><p>一句话说明什么是协程：轻量级的线程 独立的栈空间 ，共享程序堆空间 调度由用户控制 是逻辑态，对资源消耗小</p><h5 id="线程和协程的区别" tabindex="-1"><a class="header-anchor" href="#线程和协程的区别"><span>线程和协程的区别：</span></a></h5><p>线程的切换是一个cpu在不同线程中来回切换，是从系统层面来，不止保存和恢复CPU上下文这么简单，会非常耗费性能。但是协程只是在同一个线程内来回切换不同的函数，只是简单的操作CPU的上下文，所以耗费的性能会大大减少。</p><p>golang的协程机制，可轻松开启上万个协程。其他语言并发机制一般基于线程，开启过多资源耗费大。</p><h5 id="案例" tabindex="-1"><a class="header-anchor" href="#案例"><span>案例：</span></a></h5><p>主线程开启一个 goroutine 每隔1s输出 &quot;马士兵教育申专你好！&quot;</p><p>在主线程中每隔 2s 输出 go routine 十次后退出程序</p><p>要求主线程和 goroutine同时执行</p><h5 id="流程图" tabindex="-1"><a class="header-anchor" href="#流程图"><span>流程图：</span></a></h5><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-c2a5caecac6f.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><h4 id="百万级并发" tabindex="-1"><a class="header-anchor" href="#百万级并发"><span>百万级并发</span></a></h4><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;runtime&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>var num int = 1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    // for i := 1; i &lt; 10000000; i++ {</span></span>
<span class="line"><span>    //  //go runTimes(1)</span></span>
<span class="line"><span>    // }</span></span>
<span class="line"><span>    //1.8前  要设置 CPU 核心数 。 之后默认全开</span></span>
<span class="line"><span>    runtime.GOMAXPROCS(16)</span></span>
<span class="line"><span>    fmt.Println(runtime.NumCPU())</span></span>
<span class="line"><span>    // for i := 1; i &lt;= 10; i++ {</span></span>
<span class="line"><span>    //  fmt.Println(&quot;main&quot;, i, &quot;TianMing你好！&quot;, 10-i)</span></span>
<span class="line"><span>    //  time.Sleep(time.Second * 2)</span></span>
<span class="line"><span>    // }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func runTimes(times int) int {</span></span>
<span class="line"><span>    for i := 1; i &lt;= times; i++ {</span></span>
<span class="line"><span>        fmt.Println(&quot;runTimes&quot;, i, &quot;天明你好！&quot;, times-i)</span></span>
<span class="line"><span>        fmt.Println(&quot;num: &quot;, num)</span></span>
<span class="line"><span>        //  time.Sleep(time.Second)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    num++</span></span>
<span class="line"><span>    return times</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="并发的安全问题" tabindex="-1"><a class="header-anchor" href="#并发的安全问题"><span>并发的安全问题</span></a></h5><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;time&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>var (</span></span>
<span class="line"><span>    testMap = make(map[int]int, 10)</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func testNum(num int) {</span></span>
<span class="line"><span>    res := 1</span></span>
<span class="line"><span>    for i := 1; i &lt;= num; i++ {</span></span>
<span class="line"><span>        res *= i</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    testMap[num] = res</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    start := time.Now()</span></span>
<span class="line"><span>    for i := 1; i &lt; 200; i++ {</span></span>
<span class="line"><span>        go testNum(i)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    //协程需要在main之后完毕</span></span>
<span class="line"><span>    time.Sleep(time.Second * 5)</span></span>
<span class="line"><span>    for key, val := range testMap {</span></span>
<span class="line"><span>        fmt.Printf(&quot;数字%v 对应的阶乘是 %v\\n&quot;, key, val)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    end := time.Since(start)</span></span>
<span class="line"><span>    fmt.Println(end)</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>直接运行：报错：fatal error: concurrent map writes</p><p>go build -race main.go 检测数据竞争状态</p><p>再执行 ./main.exe 会提示 WARNING: DATA RACE</p><p>Previous write at 0x00c000144450 by goroutine 7:</p><p>fatal error: concurrent map writes</p><h5 id="问题的原因" tabindex="-1"><a class="header-anchor" href="#问题的原因"><span>问题的原因：</span></a></h5><p>多协程 并发 资源竞争的问题</p><h5 id="问题的解决方案" tabindex="-1"><a class="header-anchor" href="#问题的解决方案"><span>问题的解决方案：</span></a></h5><h6 id="_1-互斥锁" tabindex="-1"><a class="header-anchor" href="#_1-互斥锁"><span>1.互斥锁</span></a></h6><p>全局变量 通过加锁lock unlock 的方法 达到线程安全</p><p>lock sycn.Mutex</p><p>lock.Lock() 等使用完 lock.Unlock()</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;sync&quot;</span></span>
<span class="line"><span>    &quot;time&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span>var (</span></span>
<span class="line"><span>    testMap = make(map[int]int, 10)</span></span>
<span class="line"><span>    lock sync.Mutex</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span>func testNum(num int) {</span></span>
<span class="line"><span>    lock.Lock()</span></span>
<span class="line"><span>    res := 1</span></span>
<span class="line"><span>    for i := 1; i &lt;= num; i++ {</span></span>
<span class="line"><span>        res *= i</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    time.Sleep(time.Second * 1)</span></span>
<span class="line"><span>    testMap[num] = res</span></span>
<span class="line"><span>    lock.Unlock()</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    start := time.Now()</span></span>
<span class="line"><span>    for i := 1; i &lt; 20; i++ {</span></span>
<span class="line"><span>        go testNum(i)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    //协程需要在main之后完毕</span></span>
<span class="line"><span>    time.Sleep(time.Second * 5)</span></span>
<span class="line"><span>    lock.Lock()</span></span>
<span class="line"><span>    for key, val := range testMap {</span></span>
<span class="line"><span>        fmt.Printf(&quot;数字%v 对应的阶乘是 %v\\n&quot;, key, val)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    lock.Unlock()</span></span>
<span class="line"><span>    end := time.Since(start)</span></span>
<span class="line"><span>    fmt.Println(end)</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>弊端：协程执行的时间不可控</p><h6 id="_2-channel通道" tabindex="-1"><a class="header-anchor" href="#_2-channel通道"><span>2.channel通道</span></a></h6><p>chan 本质就是一个数据结构-队列</p><p>先进先出 FIFO的规则 ，线程安全，多Goroutine访问不需要加锁，因为通道本身线程安全。</p><p>注意：channel是有类型的 定义存放的类型不能放不同类型 。当然如果传空接口就能所有类型</p><p>定义/声明 Channel 如： var intChan chan int</p><p>int表示类型 可以是 map[int] string ; Person ; *User 等</p><p>需要 make 之后才可使用 ： intChan = make(chan int ,6)</p><p>示意图：</p><p>intChan&lt;- 1 &lt;- intChan len(intChan) cap(intChan)</p><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-3db77bb66f85.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><p>使用案例：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import &quot;fmt&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>var intChan chan int  //1.定义</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  intChan = make(chan int, 10)  //初始化</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  intChan &lt;- 1  //in</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  fmt.Println(intChan)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  fmt.Printf(&quot;intChan的值是%v,地址是%v\\n&quot;, &lt;-intChan, &amp;intChan)  // out</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  fmt.Printf(&quot;intChan的大小是%v, 容量%v\\n&quot;, len(intChan), cap(intChan))   //大小 和 容量</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    strChan := make(chan string, 3) //直接初始化</span></span>
<span class="line"><span>    var str = &quot;申&quot;</span></span>
<span class="line"><span>    strChan &lt;- str</span></span>
<span class="line"><span>    strChan &lt;- &quot;专&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    fmt.Printf(&quot;strChan的大小是%v, 容量%v\\n&quot;, len(strChan), cap(strChan))  </span></span>
<span class="line"><span>    </span></span>
<span class="line"><span></span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>练习：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>mapChan := make(chan map[int]string, 5)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  map1 := make(map[int]string, 2)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  map1[0] = &quot;申&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  map1[1] = &quot;专&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  mapChan &lt;- map1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  map2 := make(map[int]string, 2)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  map2[0] = &quot;是&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  map2[1] = &quot;的&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  mapChan &lt;- map2</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  fmt.Printf(&quot;%v%v\\n&quot;, &lt;-mapChan, &lt;-mapChan)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>练习：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>type dog struct {</span></span>
<span class="line"><span>    Name string</span></span>
<span class="line"><span>    Color string</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//main 方法中测试</span></span>
<span class="line"><span>allChan := make(chan interface{}, 10)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  allChan &lt;- dog{Name: &quot;小黄&quot;, Color: &quot;Yellow&quot;}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  allChan &lt;- 1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  allChan &lt;- &quot;很2&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  // fmt.Printf(&quot;%v%v%v\\n&quot;, &lt;-allChan, &lt;-allChan, &lt;-allChan)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  // dog1 := &lt;-allChan</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  // fmt.Printf(&quot;%T\\n&quot;, dog1)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  // // fmt.Printf(&quot;%T&quot;, dog1.Color)  //虽然看到是一条狗,看是你拿不到它任何属性和方法</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  // a := dog1.(dog) //需要 类型断言</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  a := (&lt;-allChan).(dog)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  fmt.Printf(a.Color)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h6 id="channel的循环遍历-与-关闭" tabindex="-1"><a class="header-anchor" href="#channel的循环遍历-与-关闭"><span>Channel的循环遍历 与 关闭</span></a></h6><p>for range 循环 取值 需要 close(chanName) // 注意 关闭的管道 不能写入 否则：panic: send on closed channel</p><p>否则 ：fatal error: all goroutines are asleep - deadlock!</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>close(allChan) //管道关闭之后 不能再写入</span></span>
<span class="line"><span>    //allChan &lt;- 1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // for val := range allChan {</span></span>
<span class="line"><span>    //  fmt.Println(val)</span></span>
<span class="line"><span>    // }</span></span>
<span class="line"><span>    //for i := 0; i &lt; len(allChan); i++ {   //这样循环 结果会不正确 因为 取出值之后len 会变化 </span></span>
<span class="line"><span>    //  fmt.Println(&lt;-allChan)</span></span>
<span class="line"><span>    //}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>      for {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>            val, ok := &lt;-allChan</span></span>
<span class="line"><span></span></span>
<span class="line"><span>            if !ok {  //有数据 则 ok</span></span>
<span class="line"><span></span></span>
<span class="line"><span>                break</span></span>
<span class="line"><span></span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>         fmt.Println(val)</span></span>
<span class="line"><span>  }</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h6 id="goroutine-和-channel的结合应用" tabindex="-1"><a class="header-anchor" href="#goroutine-和-channel的结合应用"><span>Goroutine 和 Channel的结合应用</span></a></h6><p>应用实例1：</p><p>用goroutine和channel协同工作完成</p><p>1.开启一个writeData协程，向管道intChan中写入50个整数</p><p>2.开启一个readData协程，从管道intChan中读取writeData写入的数据</p><p>注意：读写操作的是同一个管道的数据。主线程需要等待读写的协程完成才能退出。</p><p>思路分析：</p><p>代码实现：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;math/rand&quot;</span></span>
<span class="line"><span>    &quot;time&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>var intChan chan int</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    intChan = make(chan int, 150)</span></span>
<span class="line"><span>    exitChan := make(chan bool, 1)</span></span>
<span class="line"><span>    go writeData(intChan)</span></span>
<span class="line"><span>    go readData(intChan, exitChan)</span></span>
<span class="line"><span>    //time.Sleep(time.Second * 2)</span></span>
<span class="line"><span>    if &lt;-exitChan {</span></span>
<span class="line"><span>        return</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    fmt.Println(&quot;end main !&quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//封装两个方法</span></span>
<span class="line"><span>func writeData(intChan chan int) {</span></span>
<span class="line"><span>    rand.Seed(time.Now().UnixNano())</span></span>
<span class="line"><span>    for i := 1; i &lt; 150; i++ {</span></span>
<span class="line"><span>        var tempInt int</span></span>
<span class="line"><span>        tempInt = rand.Intn(4) + 16</span></span>
<span class="line"><span>        fmt.Printf(&quot;写入%v,第%v次写\\n&quot;, tempInt, i)</span></span>
<span class="line"><span>        //time.Sleep(time.Second)</span></span>
<span class="line"><span>        intChan &lt;- tempInt</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    close(intChan) //注意关闭通道</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>func readData(intChan chan int, exitChan chan bool) {</span></span>
<span class="line"><span>    var count int</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        val, ok := &lt;-intChan</span></span>
<span class="line"><span>        count++</span></span>
<span class="line"><span>        if !ok {</span></span>
<span class="line"><span>            break</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        fmt.Printf(&quot;读取到%v,第%v次读取\\n&quot;, val, count)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    exitChan &lt;- true //表示读取完毕</span></span>
<span class="line"><span>    close(exitChan)  //注意关闭通道</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="协程引入的需求实现" tabindex="-1"><a class="header-anchor" href="#协程引入的需求实现"><span>协程引入的需求实现：</span></a></h5><p>统计 1~2000000的数字中 哪些是素数</p><p>传统方式 ：使用循环 判断，</p><p>优化：使用并发和并行的方式</p><p>golang：将统计分配给多个 goroutine去完成</p><h6 id="传统方式" tabindex="-1"><a class="header-anchor" href="#传统方式"><span>传统方式：</span></a></h6><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>//num int 表示这个值以内的素数 有哪些 </span></span>
<span class="line"><span>func isPrime(num int) {</span></span>
<span class="line"><span>    for i := 1; i &lt; num; i++ {</span></span>
<span class="line"><span>        var flag bool = true</span></span>
<span class="line"><span>        for j := 2; j &lt; i; j++ {</span></span>
<span class="line"><span>            if i%j == 0 {</span></span>
<span class="line"><span>                flag = false</span></span>
<span class="line"><span>                continue</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if flag {</span></span>
<span class="line"><span>            fmt.Println(&quot;数字&quot;, i, &quot;是素数。&quot;)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>改进思路：</p><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-a5aee9306ea0.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><h6 id="goroutine-channel-实现" tabindex="-1"><a class="header-anchor" href="#goroutine-channel-实现"><span>goroutine + channel 实现：</span></a></h6><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>var intChan chan int = make(chan int, 20000)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    // isPrime(20000) //20000   2.086 seconds</span></span>
<span class="line"><span>    // fmt.Println()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    var primeChan chan int = make(chan int, 20000)</span></span>
<span class="line"><span>    var exitChan chan bool = make(chan bool, 8)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    go initChan(20000)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    for i := 0; i &lt;= 8; i++ {</span></span>
<span class="line"><span>        go isPrimeA(intChan, primeChan, exitChan)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    go func() { //0.839 seconds</span></span>
<span class="line"><span>        for i := 0; i &lt;= 8; i++ {</span></span>
<span class="line"><span>            &lt;-exitChan</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        close(primeChan)</span></span>
<span class="line"><span>    }()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        res, ok := &lt;-primeChan</span></span>
<span class="line"><span>        if !ok {</span></span>
<span class="line"><span>            break</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        fmt.Println(&quot;素数：&quot;, res)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func initChan(num int) {</span></span>
<span class="line"><span>    for i := 1; i &lt;= num; i++ {</span></span>
<span class="line"><span>        intChan &lt;- i</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    close(intChan)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func isPrimeA(intChan chan int, primeChan chan int, exitChan chan bool) {</span></span>
<span class="line"><span>    var flag bool</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        num, ok := &lt;-intChan</span></span>
<span class="line"><span>        flag = true</span></span>
<span class="line"><span>        if !ok {</span></span>
<span class="line"><span>            break</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        for j := 2; j &lt; num; j++ {</span></span>
<span class="line"><span>            if num%j == 0 {</span></span>
<span class="line"><span>                flag = false</span></span>
<span class="line"><span>                continue</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if flag {</span></span>
<span class="line"><span>            primeChan &lt;- num</span></span>
<span class="line"><span>            //fmt.Println(&quot;数字&quot;, i, &quot;是素数。&quot;)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    exitChan &lt;- true</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func isPrime(num int) {</span></span>
<span class="line"><span>    for i := 1; i &lt; num; i++ {</span></span>
<span class="line"><span>        var flag bool = true</span></span>
<span class="line"><span>        for j := 2; j &lt; i; j++ {</span></span>
<span class="line"><span>            if i%j == 0 {</span></span>
<span class="line"><span>                flag = false</span></span>
<span class="line"><span>                continue</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if flag {</span></span>
<span class="line"><span>            fmt.Println(&quot;数字&quot;, i, &quot;是素数。&quot;)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="管道的注意事项" tabindex="-1"><a class="header-anchor" href="#管道的注意事项"><span>管道的注意事项</span></a></h5><p>1.声明之后需要make开辟内存才可以使用</p><p>2.如果写满了 继续写会报错 //fatal error: all goroutines are asleep - deadlock!</p><p>3.可以声明chan只读或者只写</p><p>只写 var chanIn chan &lt;- int</p><p>只读 var chanOut &lt;- chan int</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    onlyIn()</span></span>
<span class="line"><span>    onlyOut()</span></span>
<span class="line"><span>    fmt.Println()</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>func onlyIn() {</span></span>
<span class="line"><span>    var chanIn chan&lt;- int</span></span>
<span class="line"><span>    chanIn = make(chan int, 1)</span></span>
<span class="line"><span>    chanIn &lt;- 1</span></span>
<span class="line"><span>    // chanIn &lt;- 2   // 会提示fatal error: all goroutines are asleep - deadlock!</span></span>
<span class="line"><span>    fmt.Println(chanIn)</span></span>
<span class="line"><span>    //fmt.Println(&lt;-chanIn) // 读取只写的通道   编译失败  invalid operation: cannot receive from send-only channel chanIn (variable of type chan&lt;- int)compiler</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>func onlyOut() {</span></span>
<span class="line"><span>    var chanOut &lt;-chan int</span></span>
<span class="line"><span>    //chanOut &lt;- 2 // 编译不通过  invalid operation: cannot send to receive-only type &lt;-chan intcomp</span></span>
<span class="line"><span>    chanOut = make(chan int, 3)</span></span>
<span class="line"><span>    fmt.Println(chanOut)</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="只读-只写管道的意义" tabindex="-1"><a class="header-anchor" href="#只读-只写管道的意义"><span>只读 只写管道的意义：</span></a></h5><p>方法参数 控制 只读只写 。防止误操作</p><p>底层处理 效率也会更高</p><p>func isPrimeA(intChan chan int, primeChan chan int, exitChan chan bool) {</p><p>比如这个方法的 参数一 只读 ； 参数二三 只写</p><p>3.close的继续写也会报错 但是可以读 。 如果没有close 去读取 会死锁 //fatal error: all goroutines are asleep - deadlock!</p><p>关键字 select</p><p>label for { select {case := chanName default return}​}</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;math/rand&quot;</span></span>
<span class="line"><span>    &quot;time&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>var intChan chan int</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//封装两个方法</span></span>
<span class="line"><span>func writeData(intChan chan int) {</span></span>
<span class="line"><span>    rand.Seed(time.Now().UnixNano())</span></span>
<span class="line"><span>    for i := 1; i &lt; 150; i++ {</span></span>
<span class="line"><span>        var tempInt int</span></span>
<span class="line"><span>        tempInt = rand.Intn(4) + 18</span></span>
<span class="line"><span>        fmt.Printf(&quot;写入%v,第%v次写\\n&quot;, tempInt, i)</span></span>
<span class="line"><span>        //time.Sleep(time.Second)</span></span>
<span class="line"><span>        intChan &lt;- tempInt</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    //close(intChan) //注意关闭通道</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>func readData(intChan chan int, exitChan chan bool) {</span></span>
<span class="line"><span>    var count int</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        val, ok := &lt;-intChan</span></span>
<span class="line"><span>        count++</span></span>
<span class="line"><span>        if !ok {</span></span>
<span class="line"><span>            break</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        fmt.Printf(&quot;读取到%v,第%v次读取\\n&quot;, val, count)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    exitChan &lt;- true //表示读取完毕</span></span>
<span class="line"><span>    //close(exitChan)  //注意关闭通道</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func isPrime(num int) {</span></span>
<span class="line"><span>    for i := 1; i &lt; num; i++ {</span></span>
<span class="line"><span>        var flag bool = true</span></span>
<span class="line"><span>        for j := 2; j &lt; i; j++ {</span></span>
<span class="line"><span>            if i%j == 0 {</span></span>
<span class="line"><span>                flag = false</span></span>
<span class="line"><span>                continue</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if flag {</span></span>
<span class="line"><span>            fmt.Println(&quot;数字：&quot;, i, &quot;是素数！&quot;)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func isPrimeA(intChan chan int, primeChan chan int, exitChan chan bool) {</span></span>
<span class="line"><span>    var flag bool</span></span>
<span class="line"><span>label:</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        select {</span></span>
<span class="line"><span>        case num := &lt;-intChan:</span></span>
<span class="line"><span>            flag = true</span></span>
<span class="line"><span>            for i := 2; i &lt; num; i++ {</span></span>
<span class="line"><span>                if num%i == 0 {</span></span>
<span class="line"><span>                    flag = false</span></span>
<span class="line"><span>                    break</span></span>
<span class="line"><span>                }</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>            if flag {</span></span>
<span class="line"><span>                primeChan &lt;- num</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        default:</span></span>
<span class="line"><span>            break label</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    fmt.Println(&quot;协程已结束&quot;)</span></span>
<span class="line"><span>    exitChan &lt;- true</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func initChan(num int) {</span></span>
<span class="line"><span>    for i := 1; i &lt;= num; i++ {</span></span>
<span class="line"><span>        intChan &lt;- i</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    //close(intChan)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    // intChan = make(chan int, 150)</span></span>
<span class="line"><span>    // exitChan := make(chan bool, 1)</span></span>
<span class="line"><span>    // go writeData(intChan)</span></span>
<span class="line"><span>    // go readData(intChan, exitChan)</span></span>
<span class="line"><span>    // //time.Sleep(time.Second * 2)</span></span>
<span class="line"><span>    // if &lt;-exitChan {</span></span>
<span class="line"><span>    //  return</span></span>
<span class="line"><span>    // }</span></span>
<span class="line"><span>    // fmt.Println(&quot;end main !&quot;)</span></span>
<span class="line"><span>    //isPrime(100000) //传统方法  100000  39.473 seconds</span></span>
<span class="line"><span>    start := time.Now()</span></span>
<span class="line"><span>    intChan = make(chan int, 100)</span></span>
<span class="line"><span>    go initChan(100)</span></span>
<span class="line"><span>    var primeChan chan int = make(chan int, 100)</span></span>
<span class="line"><span>    var exitChan chan bool = make(chan bool, 8)</span></span>
<span class="line"><span>    for i := 0; i &lt; 8; i++ {</span></span>
<span class="line"><span>        go isPrimeA(intChan, primeChan, exitChan)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    go func() {</span></span>
<span class="line"><span>        for i := 0; i &lt; 7; i++ {</span></span>
<span class="line"><span>            &lt;-exitChan</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        //close(primeChan)</span></span>
<span class="line"><span>    }()</span></span>
<span class="line"><span>label:</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        select {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        case res := &lt;-primeChan:</span></span>
<span class="line"><span>            fmt.Println(&quot;素数：&quot;, res)</span></span>
<span class="line"><span>        default:</span></span>
<span class="line"><span>            break label</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    end := time.Since(start)</span></span>
<span class="line"><span>    fmt.Println(&quot;用时：&quot;, end) // 100000  824.848ms</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="defer匿名函数的捕获panic应用" tabindex="-1"><a class="header-anchor" href="#defer匿名函数的捕获panic应用"><span>defer匿名函数的捕获panic应用：</span></a></h5><p>多个协程可能会有 panic 导致整个程序崩溃</p><p>defer 匿名函数 + err:recore() 捕获panic</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>func onlyOut(num int) {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  defer func() {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>     if err := recover(); err != nil {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>      fmt.Println(&quot;onlyOut方法panic ：&quot;, err)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>   }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  }()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  var testMap map[int]int //panic: assignment to entry in nil map</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  testMap[0] = num</span></span>
<span class="line"><span></span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>进阶综合应用 及源码 原理部分</p><p>能看到这说明你确实“够浪”，我就给你再留给彩蛋吧。上述进阶并发和网路通信的笔记的</p><p><a href="https://www.bilibili.com/video/BV1d84y1v7eZ/?spm_id_from=333.1387.upload.video_card.click&amp;vd_source=04d13f3e51316f05440d2eb2411de9f3" target="_blank" rel="noopener noreferrer">https://www.bilibili.com/video/BV1d84y1v7eZ/?spm_id_from=333.1387.upload.video_card.click&amp;vd_source=04d13f3e51316f05440d2eb2411de9f3</a></p><p>是我已发布在B站（够浪编程），还有更多架构从应用到原理和项目实战的内容。以及云原生二次开发</p><p>天明寄语:如果不是要往go这块转或者云原生定制化，到此面个试基本就够吊打面试官了</p><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-1bbea7f2c6c4.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-187d6802ec13.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><p><strong>底层源码</strong></p><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-1244cf7c2e67.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><p>从计算机底层深入“够浪” 高并发</p><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-cc14529458bd.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-3fdd975615a1.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-cfe2ac8dc694.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure><p><strong>MPG源码流程</strong></p><figure><img src="/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1487-advanced-concurrent-programming/img-9cee0137702e.png" alt="image" tabindex="0" loading="lazy"><figcaption>image</figcaption></figure>`,126)]])}var s=r(a,[[`render`,o]]);export{i as _pageData,s as default};