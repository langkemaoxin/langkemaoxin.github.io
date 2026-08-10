import{a as e,c as t,i as n}from"./app-D_oZ3uke.js";import{t as r}from"./plugin-vue_export-helper-BDNMzG2s.js";var i=JSON.parse(`{"path":"/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1488-advanced-network-communication.html","title":"进阶网络通信","lang":"zh-CN","frontmatter":{"title":"进阶网络通信","sidebarGroup":"GoLang","shortTitle":"进阶网络通信","order":1488,"date":"2025-12-30T00:00:00.000Z","category":"面试题","tag":["面试题"],"description":"课程介绍通信的本质：TCP/IP通信原理：网络分层TCP如何确保可靠性传递：三次握手四次挥手BIO/NIO： ServerSocket Socket 多路复用 （原理源码详细讲解Epoll）\\t\\t标准库net包的使用Go语言标准库里提供的 n","article":false,"head":[["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"WebPage\\",\\"name\\":\\"进阶网络通信\\",\\"description\\":\\"课程介绍通信的本质：TCP/IP通信原理：网络分层TCP如何确保可靠性传递：三次握手四次挥手BIO/NIO： ServerSocket Socket 多路复用 （原理源码详细讲解Epoll）\\\\t\\\\t标准库net包的使用Go语言标准库里提供的 n\\"}"],["meta",{"property":"og:url","content":"https://www.code-corey.com/%E9%9D%A2%E8%AF%95%E9%A2%98/GoLang/1488-advanced-network-communication.html"}],["meta",{"property":"og:site_name","content":"Corey 知识库"}],["meta",{"property":"og:title","content":"进阶网络通信"}],["meta",{"property":"og:description","content":"课程介绍通信的本质：TCP/IP通信原理：网络分层TCP如何确保可靠性传递：三次握手四次挥手BIO/NIO： ServerSocket Socket 多路复用 （原理源码详细讲解Epoll）\\t\\t标准库net包的使用Go语言标准库里提供的 n"}],["meta",{"property":"og:type","content":"website"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2026-08-09T03:10:04.000Z"}],["meta",{"property":"article:tag","content":"面试题"}],["meta",{"property":"article:published_time","content":"2025-12-30T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2026-08-09T03:10:04.000Z"}]]},"git":{"createdTime":1786240216000,"updatedTime":1786245004000,"contributors":[{"name":"langkemaoxin","username":"langkemaoxin","email":"2363613998@qq.com","commits":3,"url":"https://github.com/langkemaoxin"},{"name":"Cursor","username":"Cursor","email":"cursoragent@cursor.com","commits":3,"url":"https://github.com/Cursor"}]},"readingTime":{"minutes":19.6,"words":5879},"filePathRelative":"面试题/GoLang/1488-advanced-network-communication.md","excerpt":"<blockquote>\\n<p>来源：<a href=\\"https://www.yuque.com/tulingzhouyu/db22bv/vz99ihzxosq0sstz\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">进阶网络通信</a></p>\\n</blockquote>\\n<h4><a href=\\"https://www.yuque.com/tianming-aroh0/sagnbd/nfkf7dvzxgp26nw4\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">课程介绍</a></h4>\\n<h5>通信的本质：</h5>"}`),a={name:`1488-advanced-network-communication.md`};function o(r,i,a,o,s,c){return t(),n(`div`,null,[...i[0]||=[e(`<blockquote><p>来源：<a href="https://www.yuque.com/tulingzhouyu/db22bv/vz99ihzxosq0sstz" target="_blank" rel="noopener noreferrer">进阶网络通信</a></p></blockquote><h4 id="课程介绍" tabindex="-1"><a class="header-anchor" href="#课程介绍"><span><a href="https://www.yuque.com/tianming-aroh0/sagnbd/nfkf7dvzxgp26nw4" target="_blank" rel="noopener noreferrer">课程介绍</a></span></a></h4><h5 id="通信的本质" tabindex="-1"><a class="header-anchor" href="#通信的本质"><span>通信的本质：</span></a></h5><h5 id="tcp-ip通信原理-网络分层" tabindex="-1"><a class="header-anchor" href="#tcp-ip通信原理-网络分层"><span>TCP/IP通信原理：网络分层</span></a></h5><h5 id="tcp如何确保可靠性传递-三次握手四次挥手" tabindex="-1"><a class="header-anchor" href="#tcp如何确保可靠性传递-三次握手四次挥手"><span>TCP如何确保可靠性传递：三次握手四次挥手</span></a></h5><h5 id="bio-nio-serversocket-socket-多路复用-原理源码详细讲解epoll" tabindex="-1"><a class="header-anchor" href="#bio-nio-serversocket-socket-多路复用-原理源码详细讲解epoll"><span>BIO/NIO： ServerSocket Socket 多路复用 （原理源码详细讲解Epoll）</span></a></h5><h4 id="标准库net包的使用" tabindex="-1"><a class="header-anchor" href="#标准库net包的使用"><span>标准库net包的使用</span></a></h4><p>Go语言标准库里提供的 net 包，支持基于 IP 层、TCP/UDP 层及更高层面（如 HTTP、FTP、SMTP）的网络操作，其中用于 IP 层的称为 Raw Socket。</p><p>重要函数：net.Listen() 服务端的监听 。 net.Dial()客户端的处理</p><h5 id="代码实现" tabindex="-1"><a class="header-anchor" href="#代码实现"><span>代码实现：</span></a></h5><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;net&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    fmt.Printf(&quot;服务器准备开启。。。。&quot;)</span></span>
<span class="line"><span>    listener, err := net.Listen(&quot;tcp&quot;, &quot;127.0.0.1:8081&quot;) // &quot;0.0.0.0:8081&quot;)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Println(err)</span></span>
<span class="line"><span>        return</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    defer listener.Close()</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        conn, err := listener.Accept()</span></span>
<span class="line"><span>        if err != nil {</span></span>
<span class="line"><span>            fmt.Println(err)</span></span>
<span class="line"><span>            return</span></span>
<span class="line"><span>        } else {</span></span>
<span class="line"><span>            fmt.Println(conn)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>client端</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;net&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    fmt.Printf(&quot;客户端准备开启。。。。&quot;)</span></span>
<span class="line"><span>    conn, err := net.Dial(&quot;tcp&quot;, &quot;192.168.49.1:8081&quot;)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Println(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    defer conn.Close()</span></span>
<span class="line"><span>    fmt.Println(&quot;客户端连接成功&quot;, conn.RemoteAddr().String())</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>通过标准流 数据传递</p><p>客户端传递数据给服务端</p><p>关键方法：os.stdin bufio. conn.Write conn.Read</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>func main() {</span></span>
<span class="line"><span>    fmt.Printf(&quot;客户端准备开启。。。。&quot;)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    conn, err := net.Dial(&quot;tcp&quot;, &quot;192.168.49.1:8081&quot;)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Println(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    go proc(conn)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func proc(conn net.Conn) {</span></span>
<span class="line"><span>    defer conn.Close()</span></span>
<span class="line"><span>    reader := bufio.NewReader(os.Stdin)  //标准输入流</span></span>
<span class="line"><span>    line, err := reader.ReadString(&#39;\\n&#39;) //每次读一行</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Println(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    len, err := conn.Write([]byte(line))</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Println(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    fmt.Println(&quot;客户端连接成功&quot;, conn.RemoteAddr().String(), &quot;并且写了&quot;, len, &quot;个字节&quot;)</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>服务端读取 客户端数据</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>func main() {</span></span>
<span class="line"><span>    fmt.Printf(&quot;服务器准备开启。。。。&quot;)</span></span>
<span class="line"><span>    listener, err := net.Listen(&quot;tcp&quot;, &quot;0.0.0.0:8081&quot;) // &quot;0.0.0.0:8081&quot;)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Println(err)</span></span>
<span class="line"><span>        return</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    defer listener.Close()</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        conn, err := listener.Accept()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        go proc(conn)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        if err != nil {</span></span>
<span class="line"><span>            fmt.Println(err) // err = EOF client退出了</span></span>
<span class="line"><span>            return</span></span>
<span class="line"><span>        } else {</span></span>
<span class="line"><span>            fmt.Println(conn.LocalAddr())</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func proc(conn net.Conn) {</span></span>
<span class="line"><span>    defer conn.Close()</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        buf := make([]byte, 1024)</span></span>
<span class="line"><span>        n, err := conn.Read(buf) //返回的是 接受的字节数</span></span>
<span class="line"><span>        if err != nil {</span></span>
<span class="line"><span>            fmt.Println(err)</span></span>
<span class="line"><span>            return</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        fmt.Println(n)</span></span>
<span class="line"><span>        fmt.Println(string(buf[:n]))</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>多行写 和 读 bye标志退出</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>func main() {</span></span>
<span class="line"><span>    fmt.Printf(&quot;客户端准备开启。。。。&quot;)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    conn, err := net.Dial(&quot;tcp&quot;, &quot;192.168.49.1:8081&quot;)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Println(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    go proc(conn)</span></span>
<span class="line"><span>    if &lt;-exitChan {</span></span>
<span class="line"><span>        fmt.Println(&quot;客户端退出连接&quot;)</span></span>
<span class="line"><span>        return</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>var exitChan chan bool = make(chan bool, 1)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func proc(conn net.Conn) {</span></span>
<span class="line"><span>    defer conn.Close()</span></span>
<span class="line"><span>    reader := bufio.NewReader(os.Stdin) //标准输入流</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        line, err := reader.ReadString(&#39;\\n&#39;) //每次读一行</span></span>
<span class="line"><span>        if err != nil {</span></span>
<span class="line"><span>            fmt.Println(err)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        line = strings.Trim(line, &quot;\\r\\n&quot;)</span></span>
<span class="line"><span>        if line == &quot;bye&quot; {</span></span>
<span class="line"><span>            exitChan &lt;- true</span></span>
<span class="line"><span>            break</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        len, err := conn.Write([]byte(line))</span></span>
<span class="line"><span>        if err != nil {</span></span>
<span class="line"><span>            fmt.Println(err)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        fmt.Println(&quot;写了&quot;, len, &quot;个字节&quot;)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="web开启-net包装类-net-http" tabindex="-1"><a class="header-anchor" href="#web开启-net包装类-net-http"><span>Web开启 net包装类 net/http</span></a></h4><p>主要方法 http.ListenAndServe() http.HandleFunc()</p><p>代码实现：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;net/http&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    fmt.Printf(&quot;服务器准备开启。。。。&quot;)</span></span>
<span class="line"><span>    http.HandleFunc(&quot;/hello&quot;, hello)</span></span>
<span class="line"><span>    http.ListenAndServe(&quot;:8081&quot;, nil)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func hello(w http.ResponseWriter, r *http.Request) {</span></span>
<span class="line"><span>    fmt.Println(&quot;hello web&quot;)</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>原理图</p><p>多个handler</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;net/http&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    fmt.Printf(&quot;服务器准备开启。。。。&quot;)</span></span>
<span class="line"><span>    http.HandleFunc(&quot;/hello&quot;, hello)</span></span>
<span class="line"><span>    handler1 := handler1{}</span></span>
<span class="line"><span>    http.Handle(&quot;/helloA&quot;, &amp;handler1)</span></span>
<span class="line"><span>    http.ListenAndServe(&quot;:8081&quot;, nil)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>type handler1 struct{}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func (h1 *handler1) ServeHTTP(w http.ResponseWriter, r *http.Request) {</span></span>
<span class="line"><span>    fmt.Println(w, &quot;handler1 &quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func hello(w http.ResponseWriter, r *http.Request) {</span></span>
<span class="line"><span>    fmt.Println(&quot;hello web&quot;)</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="发起get请求" tabindex="-1"><a class="header-anchor" href="#发起get请求"><span>发起Get请求</span></a></h5><p>代码实现：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>func main() {</span></span>
<span class="line"><span>    resp, _ := http.Get(&quot;https://www.mashibing.com/course/1492&quot;)</span></span>
<span class="line"><span>    defer resp.Body.Close()</span></span>
<span class="line"><span>    b, _ := ioutil.ReadAll(resp.Body)</span></span>
<span class="line"><span>    fmt.Printf(&quot;%v\\n&quot;, string(b))</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="传递参数" tabindex="-1"><a class="header-anchor" href="#传递参数"><span>传递参数</span></a></h5><p>代码实现：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;io/ioutil&quot;</span></span>
<span class="line"><span>    &quot;net/http&quot;</span></span>
<span class="line"><span>    &quot;net/url&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    params := url.Values{}</span></span>
<span class="line"><span>    params.Set(&quot;wd&quot;, &quot;天明&quot;)</span></span>
<span class="line"><span>    Url, err := url.Parse(&quot;http://www.baidu.com/s&quot;)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Println(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    Url.RawQuery = params.Encode()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    resp, err := http.Get(Url.String())</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Println(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    b, _ := ioutil.ReadAll(resp.Body)</span></span>
<span class="line"><span>    fmt.Printf(&quot;%v\\n&quot;, string(b))</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="json格式处理" tabindex="-1"><a class="header-anchor" href="#json格式处理"><span>Json格式处理</span></a></h5><p>代码实现：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;encoding/json&quot;</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;io/ioutil&quot;</span></span>
<span class="line"><span>    &quot;net/http&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    testGetJson()</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func testGetJson() {</span></span>
<span class="line"><span>    path := &quot;http://www.weather.com.cn/data/cityinfo/101010100.html&quot;</span></span>
<span class="line"><span>    r, _ := http.Get(path)</span></span>
<span class="line"><span>    defer r.Body.Close()</span></span>
<span class="line"><span>    b, _ := ioutil.ReadAll(r.Body)</span></span>
<span class="line"><span>    fmt.Printf(&quot;%v\\n&quot;, string(b))</span></span>
<span class="line"><span>    var jsonStr res</span></span>
<span class="line"><span>    json.Unmarshal([]byte(b), &amp;jsonStr)</span></span>
<span class="line"><span>    fmt.Printf(&quot;%v\\n&quot;, jsonStr)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>type res struct {</span></span>
<span class="line"><span>    Info weather \`json:&quot;weatherinfo&quot;\`</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>type weather struct {</span></span>
<span class="line"><span>    City    string \`json:&quot;city&quot;\`</span></span>
<span class="line"><span>    cityid  string</span></span>
<span class="line"><span>    temp1   string</span></span>
<span class="line"><span>    temp2   string</span></span>
<span class="line"><span>    weather string</span></span>
<span class="line"><span>    img1    string</span></span>
<span class="line"><span>    img2    string</span></span>
<span class="line"><span>    ptime   string</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="发起post请求" tabindex="-1"><a class="header-anchor" href="#发起post请求"><span>发起Post请求</span></a></h5><p>代码实现：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>package main</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>    &quot;bytes&quot;</span></span>
<span class="line"><span>    &quot;encoding/json&quot;</span></span>
<span class="line"><span>    &quot;fmt&quot;</span></span>
<span class="line"><span>    &quot;io/ioutil&quot;</span></span>
<span class="line"><span>    &quot;net/http&quot;</span></span>
<span class="line"><span>    &quot;net/url&quot;</span></span>
<span class="line"><span>    &quot;strings&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    postC()</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func postA() {</span></span>
<span class="line"><span>    path := &quot;http://apis.juhe.cn/simpleWeather/query&quot;</span></span>
<span class="line"><span>    values := url.Values{}</span></span>
<span class="line"><span>    values.Set(&quot;key&quot;, &quot;087d7d10f700d20e27bb753cd806e40b&quot;)</span></span>
<span class="line"><span>    values.Set(&quot;city&quot;, &quot;上海&quot;)</span></span>
<span class="line"><span>    r, _ := http.PostForm(path, values)</span></span>
<span class="line"><span>    defer r.Body.Close()</span></span>
<span class="line"><span>    b, _ := ioutil.ReadAll(r.Body)</span></span>
<span class="line"><span>    fmt.Printf(&quot;%v\\n&quot;, string(b))</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func postB() {</span></span>
<span class="line"><span>    path := &quot;http://httpbin.org/post&quot;</span></span>
<span class="line"><span>    values := url.Values{</span></span>
<span class="line"><span>        &quot;name&quot;: {&quot;申专&quot;},</span></span>
<span class="line"><span>        &quot;age&quot;:  {&quot;18&quot;},</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    reqBody := values.Encode()</span></span>
<span class="line"><span>    r, _ := http.Post(path, &quot;text/html&quot;, strings.NewReader(reqBody))</span></span>
<span class="line"><span>    defer r.Body.Close()</span></span>
<span class="line"><span>    b, _ := ioutil.ReadAll(r.Body)</span></span>
<span class="line"><span>    fmt.Printf(&quot;%v\\n&quot;, string(b))</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func postC() {</span></span>
<span class="line"><span>    path := &quot;http://httpbin.org/post&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    data := make(map[string]interface{})</span></span>
<span class="line"><span>    data[&quot;name&quot;] = &quot;天明&quot;</span></span>
<span class="line"><span>    data[&quot;age&quot;] = 28</span></span>
<span class="line"><span>    byteData, _ := json.Marshal(data)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    r, _ := http.Post(path, &quot;application/json&quot;, bytes.NewReader(byteData))</span></span>
<span class="line"><span>    defer r.Body.Close()</span></span>
<span class="line"><span>    b, _ := ioutil.ReadAll(r.Body)</span></span>
<span class="line"><span>    fmt.Printf(&quot;%v\\n&quot;, string(b))</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="golang标准库-template" tabindex="-1"><a class="header-anchor" href="#golang标准库-template"><span><strong>Golang标准库 template</strong></span></a></h4><p>templates定义了数据驱动的文本输出，生产html文件的模板在 html/template 包里面。</p><p>模板使用插值语法 <strong>{​{.var}​}</strong> 也可以使用一些流程控制，列如 if else for range等</p><p>主要方法： template.New(&quot;别名&quot;).Parse(&quot;解析的模板&quot;) template.Execute()</p><h5 id="自定义模板代码实现" tabindex="-1"><a class="header-anchor" href="#自定义模板代码实现"><span>自定义模板代码实现：</span></a></h5><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>func main() {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    name := &quot;shenz&quot;</span></span>
<span class="line"><span>    myTemplate := &quot;hello,{​{.}​}&quot;</span></span>
<span class="line"><span>    tmpl, err := template.New(&quot;test&quot;).Parse(myTemplate)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Print(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    err = tmpl.Execute(os.Stdout, name)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Print(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    fmt.Printf(&quot;服务器准备开启。。。。&quot;)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    /**</span></span>
<span class="line"><span>    person := Person{&quot;shen&quot;, 18}</span></span>
<span class="line"><span>    myTemplateA := &quot;hello,{​{.Name}​},your age is {​{.Age}​}&quot;</span></span>
<span class="line"><span>    tmpl, err := template.New(&quot;test&quot;).Parse(myTemplateA)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Print(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    err = tmpl.Execute(os.Stdout, person)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        fmt.Print(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    fmt.Printf(&quot;服务器准备开启。。。。&quot;)</span></span>
<span class="line"><span>    **/</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>type Person struct {</span></span>
<span class="line"><span>    Name string</span></span>
<span class="line"><span>    Age  int</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="html模板" tabindex="-1"><a class="header-anchor" href="#html模板"><span>HTML模板</span></a></h5><p>1.定义html页面</p><p>2.handle中解析模板文件</p><p>(文件目录有问题 路径访问不到问题最好新项目go mod)</p><p>代码实现：</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>&amp;lt;!DOCTYPE html&amp;gt;</span></span>
<span class="line"><span>&amp;lt;html lang=&quot;en&quot;&amp;gt;</span></span>
<span class="line"><span>&amp;lt;head&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;meta charset=&quot;UTF-8&quot;&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;meta http-equiv=&quot;X-UA-Compatible&quot; content=&quot;IE=edge&quot;&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1.0&quot;&amp;gt;</span></span>
<span class="line"><span>    &amp;lt;title&amp;gt;my html&amp;lt;/title&amp;gt;</span></span>
<span class="line"><span>&amp;lt;/head&amp;gt;</span></span>
<span class="line"><span>&amp;lt;body&amp;gt;</span></span>
<span class="line"><span>    {​{.}​}</span></span>
<span class="line"><span>&amp;lt;/body&amp;gt;</span></span>
<span class="line"><span>&amp;lt;/html&amp;gt;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main(){</span></span>
<span class="line"><span>    handle1 := handle1{}</span></span>
<span class="line"><span>    http.Handle(&quot;/handler1&quot;, &amp;handle1)</span></span>
<span class="line"><span>    s := http.Server{</span></span>
<span class="line"><span>        Addr:    &quot;127.0.0.1:8081&quot;,</span></span>
<span class="line"><span>        Handler: nil,</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    s.ListenAndServe()</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>type handle1 struct{}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func (h *handle1) ServeHTTP(w http.ResponseWriter, req *http.Request) {</span></span>
<span class="line"><span>    t1, err := template.ParseFiles(&quot;src/web/template/html/index.html&quot;)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        panic(err)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    t1.Execute(w, &quot;Hello MyHTML&quot;)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h6 id="注意1-空格" tabindex="-1"><a class="header-anchor" href="#注意1-空格"><span>注意1 空格</span></a></h6><p>{​{ 1 }​}</p><p>{​{- 1 -}​} -》 1</p><h6 id="注意2-注释" tabindex="-1"><a class="header-anchor" href="#注意2-注释"><span>注意2 注释</span></a></h6><p>/* xxoo */</p><h6 id="注意3-pipeline多连接传递" tabindex="-1"><a class="header-anchor" href="#注意3-pipeline多连接传递"><span>注意3 pipeline多连接传递</span></a></h6><p>unix 管道 |前面的命令将运算的结果传递给下一名的最后一个位置</p><p>比如下面都会输出 shenzhuan</p><p>{​{<code>&quot;shenzhuan&quot;</code>}​}</p><p>{​{printf &quot;%q&quot; &quot;shenzhuan&quot;}​}</p><p>{​{&quot;shenzhuan&quot; | printf &quot;%q&quot; }​}</p><p>{​{&quot;zhuan&quot; | printf &quot;%s%s&quot; &quot;shen&quot; |printf &quot;%q&quot;}​}</p><p>{​{&quot;shenzhuan&quot; | printf &quot;%s&quot; | printf &quot;%q&quot;}​}</p><h6 id="注意4-变量的使用" tabindex="-1"><a class="header-anchor" href="#注意4-变量的使用"><span>注意4 变量的使用</span></a></h6><p>$var := pipiline //定义一个没有定义过变量</p><p>$var = pipilne</p><h6 id="注意5-条件判断" tabindex="-1"><a class="header-anchor" href="#注意5-条件判断"><span>注意5 条件判断</span></a></h6><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>eq  ne lt le gt  ge</span></span>
<span class="line"><span>{​{$Age := 19}​}</span></span>
<span class="line"><span> {​{if ge $Age 18}​}</span></span>
<span class="line"><span>恭喜你成年了！</span></span>
<span class="line"><span>{​{end}​}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>{​{$Age := 13}​}</span></span>
<span class="line"><span>    {​{if ge $Age 18}​}</span></span>
<span class="line"><span>    恭喜你成年了！</span></span>
<span class="line"><span>    {​{else if lt $Age 14}​}</span></span>
<span class="line"><span>    远离</span></span>
<span class="line"><span>    {​{else}​}</span></span>
<span class="line"><span>    禁止入内</span></span>
<span class="line"><span>    {​{end}​}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h6 id="注意6-循环" tabindex="-1"><a class="header-anchor" href="#注意6-循环"><span>注意6 循环</span></a></h6><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>strs := []string{&quot;图灵教育&quot;, &quot;申专&quot;, &quot;666&quot;}</span></span>
<span class="line"><span>    t1.Execute(w, strs) ///&quot;Hello MyHTML&quot;)</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    </span></span>
<span class="line"><span></span></span>
<span class="line"><span>{​{range $val :=.}​}</span></span>
<span class="line"><span>&amp;lt;span&amp;gt;{​{println $val}​} &amp;lt;/span&amp;gt;</span></span>
<span class="line"><span>{​{end}​}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h6 id="注意7-设置-的值" tabindex="-1"><a class="header-anchor" href="#注意7-设置-的值"><span>注意7 设置.的值</span></a></h6><p>with...end</p><p>{​{with lt $Age 14}​}ssssss{​{else}​} XXXXXXXXXXXX {​{end}​}</p><h6 id="总结" tabindex="-1"><a class="header-anchor" href="#总结"><span>总结：</span></a></h6><p>可API <a href="https://studygolang.com/pkgdoc" target="_blank" rel="noopener noreferrer">https://studygolang.com/pkgdoc</a></p><p>当然也可以看源码 详见 template/funcs.go</p><h5 id="嵌套html" tabindex="-1"><a class="header-anchor" href="#嵌套html"><span>嵌套HTML</span></a></h5><p>define 和 template关键字</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>header.html中</span></span>
<span class="line"><span> {​{define &quot;header&quot;}​}</span></span>
<span class="line"><span>    &amp;lt;h1&amp;gt;这是header&amp;lt;/h1&amp;gt;&gt;</span></span>
<span class="line"><span>    {​{end}​}</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>   index.html中 </span></span>
<span class="line"><span>       {​{template &quot;header&quot;}​}</span></span>
<span class="line"><span>       </span></span>
<span class="line"><span>       </span></span>
<span class="line"><span>    ServeHTTP 方法中</span></span>
<span class="line"><span>    t1, err := template.ParseFiles(&quot;src/web/template/html/index.html&quot;, &quot;src/web/template/html/header.html&quot;)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="多路复用器-mux-multiplexer" tabindex="-1"><a class="header-anchor" href="#多路复用器-mux-multiplexer"><span>多路复用器 Mux(Multiplexer)</span></a></h4><p>ServeMux的路由匹配</p><h5 id="实例代码" tabindex="-1"><a class="header-anchor" href="#实例代码"><span>实例代码</span></a></h5><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>func newServerMux(w http.ResponseWriter, r *http.Request) {</span></span>
<span class="line"><span>    fmt.Println(w, &quot;my mux &quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    mux := http.NewServeMux()</span></span>
<span class="line"><span>    mux.HandleFunc(&quot;/&quot;, newServerMux)</span></span>
<span class="line"><span>    s := &amp;http.Server{</span></span>
<span class="line"><span>        Addr:    &quot;:8081&quot;,</span></span>
<span class="line"><span>        Handler: mux,</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    s.ListenAndServe()</span></span>
<span class="line"><span>    fmt.Println()</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>/happy  /bad   多个handler</span></span>
<span class="line"><span>func newServerMux(w http.ResponseWriter, r *http.Request) {</span></span>
<span class="line"><span>    fmt.Println(w, &quot;my mux &quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func happy(w http.ResponseWriter, r *http.Request) {</span></span>
<span class="line"><span>    fmt.Println(w, &quot;happy &quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>func bad(w http.ResponseWriter, r *http.Request) {</span></span>
<span class="line"><span>    fmt.Println(w, &quot;happy &quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    mux := http.NewServeMux()</span></span>
<span class="line"><span>    mux.HandleFunc(&quot;/&quot;, newServerMux)</span></span>
<span class="line"><span>    mux.HandleFunc(&quot;/happy&quot;, happy)</span></span>
<span class="line"><span>    mux.HandleFunc(&quot;/bad&quot;, bad)</span></span>
<span class="line"><span>    s := &amp;http.Server{</span></span>
<span class="line"><span>        Addr:    &quot;:8081&quot;,</span></span>
<span class="line"><span>        Handler: mux,</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    s.ListenAndServe()</span></span>
<span class="line"><span>    fmt.Println()</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="httprouter高性能http路由包" tabindex="-1"><a class="header-anchor" href="#httprouter高性能http路由包"><span>HttpRouter高性能HTTP路由包</span></a></h4><p>ServeMux 的一个缺陷是无法使用变量实现URL模式匹配。而HttpRouter可以，HttpRouter是一个高性能的第三方HTTP路由包，弥补了net/http包中的路由不足问题。</p><p>此轻量级 高性能的路由器 与默认的路由比，支持路由模式中的变量并匹配请求方法，它还可以更好的拓展。</p><p>还有就是我们接下来要讲的gin架构 就是已此作为基础开发的。</p><h6 id="实例代码-1" tabindex="-1"><a class="header-anchor" href="#实例代码-1"><span>实例代码</span></a></h6><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>go  get github.com/julienschmidt/httprouter</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func Hello(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {</span></span>
<span class="line"><span>    w.Write([]byte(&quot;hello httpRouter！！&quot;))</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func Index(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // w.Write([]byte(ps.ByName(&quot;name&quot;)))</span></span>
<span class="line"><span>    fmt.Fprintf(w, &quot;hello %s \\n&quot;, ps.ByName(&quot;name&quot;))</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    router := httprouter.New()</span></span>
<span class="line"><span>    router.GET(&quot;/&quot;, Hello)</span></span>
<span class="line"><span>    router.GET(&quot;/index/:name&quot;, Index)</span></span>
<span class="line"><span>    http.ListenAndServe(&quot;:8081&quot;, router)</span></span>
<span class="line"><span>    fmt.Println()</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="restful风格路由-完成-crud-的方法" tabindex="-1"><a class="header-anchor" href="#restful风格路由-完成-crud-的方法"><span>RestFul风格路由 完成 CRUD 的方法</span></a></h5><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>func Hello(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {</span></span>
<span class="line"><span>    w.Write([]byte(&quot;hello httpRouter！！&quot;))</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func Index(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {</span></span>
<span class="line"><span>    // w.Write([]byte(ps.ByName(&quot;name&quot;)))</span></span>
<span class="line"><span>    fmt.Fprintf(w, &quot;hello %s \\n&quot;, ps.ByName(&quot;name&quot;))</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func ModifyUser(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {</span></span>
<span class="line"><span>    uid := ps.ByName(&quot;uid&quot;)</span></span>
<span class="line"><span>    fmt.Fprintf(w, &quot;修改了 用户id为 %s \\n&quot;, uid)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>func DeleteUser(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {</span></span>
<span class="line"><span>    uid := ps.ByName(&quot;uid&quot;)</span></span>
<span class="line"><span>    fmt.Fprintf(w, &quot;删除了 用户id为 %s \\n&quot;, uid)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    router := httprouter.New()</span></span>
<span class="line"><span>    router.GET(&quot;/&quot;, Hello)</span></span>
<span class="line"><span>    router.GET(&quot;/index/:name&quot;, Index)</span></span>
<span class="line"><span>    router.POST(&quot;/modifyuser/:uid&quot;, ModifyUser)</span></span>
<span class="line"><span>    router.DELETE(&quot;/deleteuser/:uid&quot;, DeleteUser)</span></span>
<span class="line"><span>    http.ListenAndServe(&quot;:8081&quot;, router)</span></span>
<span class="line"><span>    fmt.Println()</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="网络通信总结" tabindex="-1"><a class="header-anchor" href="#网络通信总结"><span>网络通信总结：</span></a></h4><p>大纲目录结构</p><h4 id="原理流程" tabindex="-1"><a class="header-anchor" href="#原理流程"><span>原理流程：</span></a></h4><p>client &gt; server (注册路由 - 根据路由规则派发 handler处理器 -处理数据 - 模板引擎 - 展示给client)</p><h4 id="源码解读" tabindex="-1"><a class="header-anchor" href="#源码解读"><span>源码解读：</span></a></h4><p>为了新奇， 解决疑难杂症 ， 优化 面试，技术的一种深度 往后的高度</p><h4 id="网络模型" tabindex="-1"><a class="header-anchor" href="#网络模型"><span>网络模型</span></a></h4><p>linux五种：</p><p>BIO ：阻塞IO</p><p>NIO：非阻塞IO</p><p>多路复用</p><p>Select：（多个（1024个）fd文件描述符轮询遍历就绪）</p><p>Poll ：pollfd结构表示要监听的描述符 需要将socket从用户态转换称内核态</p><p>Epoll：事件监听，三个重要方法：</p><p>poll_create(); 创建一个epoll对象</p><p>epoll_ctl(); 事件注册 维护一个红黑树的结构</p><p>poll_wait(); 等待就绪的事件 已经就绪的 维护的到一个 双向链表的结构</p><h4 id="goroutine-epoll网络模型流程图" tabindex="-1"><a class="header-anchor" href="#goroutine-epoll网络模型流程图"><span>goroutine+epoll网络模型流程图：</span></a></h4><h5 id="源码解读-1" tabindex="-1"><a class="header-anchor" href="#源码解读-1"><span>源码解读：</span></a></h5><p>通信原理 ：BIO NIO Selector Poll Epoll</p><p>golang网络通信 ： 多协程+Epoll</p><p>MPG调度跟Epoll的关联：</p><p>MPG模型，在IO事件中的事件与之前的G，g0协程如何获得执行权？</p><p>协程主方法mian最终调用的gopark() 关键方法与Epoll网络模型关联 让出当前协程执行权，一般是返回到g0让g0重新调度</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>net.Listen(&quot;tcp&quot;, &quot;0.0.0.0:8082&quot;) </span></span>
<span class="line"><span></span></span>
<span class="line"><span>func Listen(network, address string) (Listener, error) {</span></span>
<span class="line"><span>    var lc ListenConfig</span></span>
<span class="line"><span>    //s2 listen绑定</span></span>
<span class="line"><span>    return lc.Listen(context.Background(), network, address)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func (lc *ListenConfig) Listen(ctx context.Context, network, address string) (Listener, error) {</span></span>
<span class="line"><span>    //根据协议名称和地址获得Internet协议族地址列表</span></span>
<span class="line"><span>    addrs, err := DefaultResolver.resolveAddrList(ctx, &quot;listen&quot;, network, address, nil)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        return nil, &amp;OpError{Op: &quot;listen&quot;, Net: network, Source: nil, Addr: nil, Err: err}</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    sl := &amp;sysListener{</span></span>
<span class="line"><span>        ListenConfig: *lc,</span></span>
<span class="line"><span>        network:      network,</span></span>
<span class="line"><span>        address:      address,</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    var l Listener</span></span>
<span class="line"><span>    la := addrs.first(isIPv4)</span></span>
<span class="line"><span>    switch la := la.(type) {</span></span>
<span class="line"><span>    case *TCPAddr:</span></span>
<span class="line"><span>        //s1 TCP监听</span></span>
<span class="line"><span>        l, err = sl.listenTCP(ctx, la)</span></span>
<span class="line"><span>    case *UnixAddr:</span></span>
<span class="line"><span>        // Unix</span></span>
<span class="line"><span>        l, err = sl.listenUnix(ctx, la)</span></span>
<span class="line"><span>    default:</span></span>
<span class="line"><span>        return nil, &amp;OpError{Op: &quot;listen&quot;, Net: sl.network, Source: nil, Addr: la, Err: &amp;AddrError{Err: &quot;unexpected address type&quot;, Addr: address}​}</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        return nil, &amp;OpError{Op: &quot;listen&quot;, Net: sl.network, Source: nil, Addr: la, Err: err} // l is non-nil interface containing nil pointer</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    return l, nil</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//s1 返回值可见关键的poll.FD</span></span>
<span class="line"><span>func (sl *sysListener) listenTCP(ctx context.Context, laddr *TCPAddr) (*TCPListener, error) {</span></span>
<span class="line"><span>    //s1 内部（各平台对应）调用生产socket具体描述符</span></span>
<span class="line"><span>    fd, err := internetSocket(ctx, sl.network, laddr, nil, syscall.SOCK_STREAM, 0, &quot;listen&quot;, sl.ListenConfig.Control)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        return nil, err</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    return &amp;TCPListener{fd: fd, lc: sl.ListenConfig}, nil</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func internetSocket(ctx context.Context, net string, laddr, raddr sockaddr, sotype, proto int, mode string, ctrlFn func(string, string, syscall.RawConn) error) (fd *netFD, err error) {</span></span>
<span class="line"><span>    if (runtime.GOOS == &quot;aix&quot; || runtime.GOOS == &quot;windows&quot; || runtime.GOOS == &quot;openbsd&quot;) &amp;&amp; mode == &quot;dial&quot; &amp;&amp; raddr.isWildcard() {</span></span>
<span class="line"><span>        raddr = raddr.toLocal(net)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    family, ipv6only := favoriteAddrFamily(net, laddr, raddr, mode)</span></span>
<span class="line"><span>    //s1  返回socket描述符具体描述 此函数：</span></span>
<span class="line"><span>    //   1调用sysSocket生产描述符。2调用newFD封装描述符 构造netFD    3调用netFD实现bind和listen</span></span>
<span class="line"><span>    return socket(ctx, net, family, sotype, proto, ipv6only, laddr, raddr, ctrlFn)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func socket(ctx context.Context, net string, family, sotype, proto int, ipv6only bool, laddr, raddr sockaddr, ctrlFn func(string, string, syscall.RawConn) error) (fd *netFD, err error) {</span></span>
<span class="line"><span>    //1.根据操作系统获取对应的socket</span></span>
<span class="line"><span>    s, err := sysSocket(family, sotype, proto)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        return nil, err</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    //2.设置socket选项</span></span>
<span class="line"><span>    if err = setDefaultSockopts(s, family, sotype, ipv6only); err != nil {</span></span>
<span class="line"><span>        poll.CloseFunc(s)</span></span>
<span class="line"><span>        return nil, err</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    //3.创建fd</span></span>
<span class="line"><span>    if fd, err = newFD(s, family, sotype, net); err != nil {</span></span>
<span class="line"><span>        poll.CloseFunc(s)</span></span>
<span class="line"><span>        return nil, err</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    //4.监听</span></span>
<span class="line"><span>    if laddr != nil &amp;&amp; raddr == nil {</span></span>
<span class="line"><span>        switch sotype {</span></span>
<span class="line"><span>        //windows实现在socket_windows.go   linux实现在socket_cloexec.go中</span></span>
<span class="line"><span>        case syscall.SOCK_STREAM, syscall.SOCK_SEQPACKET:</span></span>
<span class="line"><span>            //TCP  s1 次方主要负责调用系统 的bind和listen</span></span>
<span class="line"><span>            if err := fd.listenStream(laddr, listenerBacklog(), ctrlFn); err != nil {</span></span>
<span class="line"><span>                fd.Close()</span></span>
<span class="line"><span>                return nil, err</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>            return fd, nil</span></span>
<span class="line"><span>        case syscall.SOCK_DGRAM:</span></span>
<span class="line"><span>            //UDP</span></span>
<span class="line"><span>            if err := fd.listenDatagram(laddr, ctrlFn); err != nil {</span></span>
<span class="line"><span>                fd.Close()</span></span>
<span class="line"><span>                return nil, err</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>            return fd, nil</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    //5.发起连接，非listen socket处理</span></span>
<span class="line"><span>    if err := fd.dial(ctx, laddr, raddr, ctrlFn); err != nil {</span></span>
<span class="line"><span>        fd.Close()</span></span>
<span class="line"><span>        return nil, err</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    return fd, nil</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//这里一会 再过来看 FD </span></span>
<span class="line"><span></span></span>
<span class="line"><span> 先来看 client 怎么跟Service建立连接</span></span>
<span class="line"><span>conn, err := net.Dial(&quot;tcp&quot;, &quot;192.168.49.254:8082&quot;)</span></span>
<span class="line"><span>func Dial(network, address string) (Conn, error) {</span></span>
<span class="line"><span>    var d Dialer</span></span>
<span class="line"><span>    // s1 实际调用DialContext</span></span>
<span class="line"><span>    return d.Dial(network, address)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func (d *Dialer) Dial(network, address string) (Conn, error) {</span></span>
<span class="line"><span>    //s1 conn用的TCPConn</span></span>
<span class="line"><span>    return d.DialContext(context.Background(), network, address)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//s1 最终的TCPConn &gt; Conn  里面都是基于关键网络描述符 netFD</span></span>
<span class="line"><span>func (d *Dialer) DialContext(ctx context.Context, network, address string) (Conn, error) {</span></span>
<span class="line"><span>    if ctx == nil {</span></span>
<span class="line"><span>        panic(&quot;nil context&quot;)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    deadline := d.deadline(ctx, time.Now())</span></span>
<span class="line"><span>    if !deadline.IsZero() {</span></span>
<span class="line"><span>        if d, ok := ctx.Deadline(); !ok || deadline.Before(d) {</span></span>
<span class="line"><span>            subCtx, cancel := context.WithDeadline(ctx, deadline)</span></span>
<span class="line"><span>            defer cancel()</span></span>
<span class="line"><span>            ctx = subCtx</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    if oldCancel := d.Cancel; oldCancel != nil {</span></span>
<span class="line"><span>        subCtx, cancel := context.WithCancel(ctx)</span></span>
<span class="line"><span>        defer cancel()</span></span>
<span class="line"><span>        go func() {</span></span>
<span class="line"><span>            select {</span></span>
<span class="line"><span>            case &lt;-oldCancel:</span></span>
<span class="line"><span>                cancel()</span></span>
<span class="line"><span>            case &lt;-subCtx.Done():</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        }()</span></span>
<span class="line"><span>        ctx = subCtx</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // Shadow the nettrace (if any) during resolve so Connect events don&#39;t fire for DNS lookups.</span></span>
<span class="line"><span>    resolveCtx := ctx</span></span>
<span class="line"><span>    if trace, _ := ctx.Value(nettrace.TraceKey{}).(*nettrace.Trace); trace != nil {</span></span>
<span class="line"><span>        shadow := *trace</span></span>
<span class="line"><span>        shadow.ConnectStart = nil</span></span>
<span class="line"><span>        shadow.ConnectDone = nil</span></span>
<span class="line"><span>        resolveCtx = context.WithValue(resolveCtx, nettrace.TraceKey{}, &amp;shadow)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    addrs, err := d.resolver().resolveAddrList(resolveCtx, &quot;dial&quot;, network, address, d.LocalAddr)</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        return nil, &amp;OpError{Op: &quot;dial&quot;, Net: network, Source: nil, Addr: nil, Err: err}</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    sd := &amp;sysDialer{</span></span>
<span class="line"><span>        Dialer:  *d,</span></span>
<span class="line"><span>        network: network,</span></span>
<span class="line"><span>        address: address,</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    var primaries, fallbacks addrList</span></span>
<span class="line"><span>    if d.dualStack() &amp;&amp; network == &quot;tcp&quot; {</span></span>
<span class="line"><span>        primaries, fallbacks = addrs.partition(isIPv4)</span></span>
<span class="line"><span>    } else {</span></span>
<span class="line"><span>        primaries = addrs</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    var c Conn</span></span>
<span class="line"><span>    if len(fallbacks) &gt; 0 {</span></span>
<span class="line"><span>        c, err = sd.dialParallel(ctx, primaries, fallbacks)</span></span>
<span class="line"><span>    } else {</span></span>
<span class="line"><span>        c, err = sd.dialSerial(ctx, primaries)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    if err != nil {</span></span>
<span class="line"><span>        return nil, err</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    if tc, ok := c.(*TCPConn); ok &amp;&amp; d.KeepAlive &gt;= 0 {</span></span>
<span class="line"><span>        setKeepAlive(tc.fd, true)</span></span>
<span class="line"><span>        ka := d.KeepAlive</span></span>
<span class="line"><span>        if d.KeepAlive == 0 {</span></span>
<span class="line"><span>            ka = defaultTCPKeepAlive</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        setKeepAlivePeriod(tc.fd, ka)</span></span>
<span class="line"><span>        testHookSetKeepAlive(ka)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    return c, nil</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//接下来重点 是 netFD 网络描述符 。 server 创建 socket的时候已经构建好</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func newFD(sysfd syscall.Handle, family, sotype int, net string) (*netFD, error) {</span></span>
<span class="line"><span>    ret := &amp;netFD{</span></span>
<span class="line"><span>        pfd: poll.FD{</span></span>
<span class="line"><span>            Sysfd:         sysfd,</span></span>
<span class="line"><span>            IsStream:      sotype == syscall.SOCK_STREAM,</span></span>
<span class="line"><span>            ZeroReadIsEOF: sotype != syscall.SOCK_DGRAM &amp;&amp; sotype != syscall.SOCK_RAW,</span></span>
<span class="line"><span>        },</span></span>
<span class="line"><span>        family: family,</span></span>
<span class="line"><span>        sotype: sotype,</span></span>
<span class="line"><span>        net:    net,</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    return ret, nil</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//并且 包含Conn 了此网络描述符</span></span>
<span class="line"><span></span></span>
<span class="line"><span>type conn struct {</span></span>
<span class="line"><span>    fd *netFD //s1 关键 网络描述符/句柄  不论net.listener还是dial都是基于此</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// Network file descriptor.</span></span>
<span class="line"><span>//包含在Conn结构中，而Conn又包含在TCPConn结构中，所以此应该处于用户接口层</span></span>
<span class="line"><span>type netFD struct {</span></span>
<span class="line"><span>    //s1 包含两个重要的数据结构 Sysfd 和 pollDesc，  用户层接口调用此完成交互</span></span>
<span class="line"><span>    //1.前者是真正的系统文件描述符，</span></span>
<span class="line"><span>    //2.后者对是底层事件驱动的封装，所有的读写超时等操作都是通过调用后者的对应方法实现的</span></span>
<span class="line"><span>    pfd poll.FD</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // immutable until Close</span></span>
<span class="line"><span>    family      int</span></span>
<span class="line"><span>    sotype      int</span></span>
<span class="line"><span>    isConnected bool // handshake completed or use of association with peer</span></span>
<span class="line"><span>    net         string</span></span>
<span class="line"><span>    laddr       Addr</span></span>
<span class="line"><span>    raddr       Addr</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>type FD struct {</span></span>
<span class="line"><span>    // Lock sysfd and serialize access to Read and Write methods.</span></span>
<span class="line"><span>    fdmu fdMutex //读写锁  锁定sysfd并序列化对Read和Write方法的访问</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // System file descriptor. Immutable until Close.</span></span>
<span class="line"><span>    Sysfd syscall.Handle //关键  系统文件描述符</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // Read operation. 读操作</span></span>
<span class="line"><span>    rop operation</span></span>
<span class="line"><span>    // Write operation. 写操作</span></span>
<span class="line"><span>    wop operation</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // I/O poller.</span></span>
<span class="line"><span>    pd pollDesc //      s1 底层事件驱动的封装 所有的读写超时等操作都是通过此</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // Used to implement pread/pwrite. 用于缓存读写锁</span></span>
<span class="line"><span>    l sync.Mutex</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // For console I/O.</span></span>
<span class="line"><span>    lastbits       []byte   // first few bytes of the last incomplete rune in last write</span></span>
<span class="line"><span>    readuint16     []uint16 // buffer to hold uint16s obtained with ReadConsole</span></span>
<span class="line"><span>    readbyte       []byte   // buffer to hold decoding of readuint16 from utf16 to utf8</span></span>
<span class="line"><span>    readbyteOffset int      // readbyte[readOffset:] is yet to be consumed with file.Read</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // Semaphore signaled when file is closed. 关闭文件时的信号</span></span>
<span class="line"><span>    csema uint32</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    skipSyncNotif bool //是否跳过sync</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // Whether this is a streaming descriptor, as opposed to a</span></span>
<span class="line"><span>    // packet-based descriptor like a UDP socket.</span></span>
<span class="line"><span>    IsStream bool //TCP 还是 UDP</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // Whether a zero byte read indicates EOF. This is false for a</span></span>
<span class="line"><span>    // message based socket connection.</span></span>
<span class="line"><span>    ZeroReadIsEOF bool //读取到0字节时是否为错误。基于socket时is false</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // Whether this is a file rather than a network socket.</span></span>
<span class="line"><span>    isFile bool //是否系统真实文件  或者网络socket连接</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // The kind of this file.</span></span>
<span class="line"><span>    kind fileKind //文件类型</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>type pollDesc struct {</span></span>
<span class="line"><span>    runtimeCtx uintptr //只包含了一个指针  指针具体内容是关键 下面会讲</span></span>
<span class="line"><span>    //s1 通过init初始化</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func (pd *pollDesc) init(fd *FD) error {</span></span>
<span class="line"><span>    //一次 / 首次</span></span>
<span class="line"><span>    serverInit.Do(runtime_pollServerInit)</span></span>
<span class="line"><span>    //s1 关键   内核态用户态共享的关联切换</span></span>
<span class="line"><span>    // 注册epoll 实例到 fd  实际link到runtime包下的 poll_runtime_pollOpen 函数。具体实现在  runtime/netpoll.go</span></span>
<span class="line"><span>    //go:linkname poll_runtime_pollOpen internal/poll.runtime_pollOpen</span></span>
<span class="line"><span>    ctx, errno := runtime_pollOpen(uintptr(fd.Sysfd))</span></span>
<span class="line"><span>    if errno != 0 {</span></span>
<span class="line"><span>        return errnoErr(syscall.Errno(errno))</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    pd.runtimeCtx = ctx</span></span>
<span class="line"><span>    return nil</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//关联到 runtime/netpoll.go</span></span>
<span class="line"><span>//关键 事件驱动</span></span>
<span class="line"><span>type pollDesc struct {</span></span>
<span class="line"><span>    link *pollDesc // in pollcache, protected by pollcache.lock</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // The lock protects pollOpen, pollSetDeadline, pollUnblock and deadlineimpl operations.</span></span>
<span class="line"><span>    // This fully covers seq, rt and wt variables. fd is constant throughout the PollDesc lifetime.</span></span>
<span class="line"><span>    // pollReset, pollWait, pollWaitCanceled and runtime·netpollready (IO readiness notification)</span></span>
<span class="line"><span>    // proceed w/o taking the lock. So closing, everr, rg, rd, wg and wd are manipulated</span></span>
<span class="line"><span>    // in a lock-free way by all operations.</span></span>
<span class="line"><span>    // TODO(golang.org/issue/49008): audit these lock-free fields for continued correctness.</span></span>
<span class="line"><span>    // NOTE(dvyukov): the following code uses uintptr to store *g (rg/wg),</span></span>
<span class="line"><span>    // that will blow up when GC starts moving objects.</span></span>
<span class="line"><span>    //锁  防止多线程/协程操作pollDesc并发问题</span></span>
<span class="line"><span>    lock mutex // protects the following fields</span></span>
<span class="line"><span>    //关键 描述符指针 链表结构可以减少结构大小 提高效率</span></span>
<span class="line"><span>    fd      uintptr</span></span>
<span class="line"><span>    closing bool</span></span>
<span class="line"><span>    everr   bool    // marks event scanning error happened</span></span>
<span class="line"><span>    user    uint32  // user settable cookie</span></span>
<span class="line"><span>    rseq    uintptr // protects from stale read timers</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    //关键： 保存用户态操作的 读协程地址</span></span>
<span class="line"><span>    //比如：我们在用户态协程调用read阻塞时，rg设置为该协程。当内核态epoll_wait检测read就绪后会通过rg找到这个协程让其恢复运行</span></span>
<span class="line"><span>    //pollDesc实现用户态和内核态资源共享就在于此</span></span>
<span class="line"><span>    rg uintptr //取值 pdReady, pdWait, G waiting for read or nil. Accessed atomically.</span></span>
<span class="line"><span>    //读定时器 防止超时</span></span>
<span class="line"><span>    rt   timer   // read deadline timer (set if rt.f != nil)</span></span>
<span class="line"><span>    rd   int64   // read deadline</span></span>
<span class="line"><span>    wseq uintptr // protects from stale write timers</span></span>
<span class="line"><span>    //关键:保存用户态操作pollDesc 写协程的地址</span></span>
<span class="line"><span>    wg uintptr //取值 pdReady, pdWait, G waiting for write or nil. Accessed atomically.</span></span>
<span class="line"><span>    //写定时器</span></span>
<span class="line"><span>    wt timer // write deadline timer</span></span>
<span class="line"><span>    wd int64 // write deadline</span></span>
<span class="line"><span>    //接口地址</span></span>
<span class="line"><span>    self *pollDesc // storage for indirect interface. See (*pollDesc).makeArg.</span></span>
<span class="line"><span>    //epoll 网络模型具体方法在 netpoll_epoll.go 中 epollcreate  epollwait   epollctl 核心方法</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>//go:linkname poll_runtime_pollServerInit internal/poll.runtime_pollServerInit</span></span>
<span class="line"><span>//初始化</span></span>
<span class="line"><span>func poll_runtime_pollServerInit() {</span></span>
<span class="line"><span>    netpollGenericInit()</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>//上面调用此</span></span>
<span class="line"><span>func netpollGenericInit() {</span></span>
<span class="line"><span>    if atomic.Load(&amp;netpollInited) == 0 {</span></span>
<span class="line"><span>        lockInit(&amp;netpollInitLock, lockRankNetpollInit)</span></span>
<span class="line"><span>        lock(&amp;netpollInitLock)</span></span>
<span class="line"><span>        if netpollInited == 0 {</span></span>
<span class="line"><span>            //真正系统调用   link 到 netpoll_epoll.go</span></span>
<span class="line"><span>            netpollinit()</span></span>
<span class="line"><span>            atomic.Store(&amp;netpollInited, 1)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        unlock(&amp;netpollInitLock)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//初始化网络轮询器  ，通过sync.Onec  和 netpollInited 遍历保证只一次</span></span>
<span class="line"><span>func netpollinit() {</span></span>
<span class="line"><span>    epfd = epollcreate1(_EPOLL_CLOEXEC)</span></span>
<span class="line"><span>    if epfd &lt; 0 {</span></span>
<span class="line"><span>        epfd = epollcreate(1024)</span></span>
<span class="line"><span>        if epfd &lt; 0 {</span></span>
<span class="line"><span>            println(&quot;runtime: epollcreate failed with&quot;, -epfd)</span></span>
<span class="line"><span>            throw(&quot;runtime: netpollinit failed&quot;)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        closeonexec(epfd)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    r, w, errno := nonblockingPipe()</span></span>
<span class="line"><span>    if errno != 0 {</span></span>
<span class="line"><span>        println(&quot;runtime: pipe failed with&quot;, -errno)</span></span>
<span class="line"><span>        throw(&quot;runtime: pipe failed&quot;)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    ev := epollevent{</span></span>
<span class="line"><span>        events: _EPOLLIN,</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    *(**uintptr)(unsafe.Pointer(&amp;ev.data)) = &amp;netpollBreakRd</span></span>
<span class="line"><span>    //调用三关键函数的创建</span></span>
<span class="line"><span>    errno = epollctl(epfd, _EPOLL_CTL_ADD, r, &amp;ev)</span></span>
<span class="line"><span>    if errno != 0 {</span></span>
<span class="line"><span>        println(&quot;runtime: epollctl failed with&quot;, -errno)</span></span>
<span class="line"><span>        throw(&quot;runtime: epollctl failed&quot;)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    netpollBreakRd = uintptr(r)</span></span>
<span class="line"><span>    netpollBreakWr = uintptr(w)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// 监听文件描述符上的边缘触发事件，创建事件并加入监听poll_runtime_pollOpen函数，</span></span>
<span class="line"><span>// 这个函数将用户态协程的pollDesc信息写入到epoll所在的单独线程，从而实现用户态和内核态的关联。</span></span>
<span class="line"><span>func netpollopen(fd uintptr, pd *pollDesc) int32 {</span></span>
<span class="line"><span>    var ev epollevent</span></span>
<span class="line"><span>    //具体事件</span></span>
<span class="line"><span>    //注册event事件，这里使用了epoll的ET模式，相对于ET，ET需要每次产生事件时候就要处理事件，</span></span>
<span class="line"><span>    //否则容易丢失事件。</span></span>
<span class="line"><span>    ev.events = _EPOLLIN | _EPOLLOUT | _EPOLLRDHUP | _EPOLLET</span></span>
<span class="line"><span>    //events记录上pd的指针</span></span>
<span class="line"><span>    *(**pollDesc)(unsafe.Pointer(&amp;ev.data)) = pd</span></span>
<span class="line"><span>    //系统调用将该fd加到eventpoll对象中，交由内核监听</span></span>
<span class="line"><span>    return -epollctl(epfd, _EPOLL_CTL_ADD, int32(fd), &amp;ev)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//轮询网络并返回一组已经准备就绪的 Goroutine (GList)，传入的参数会决定它的行为：</span></span>
<span class="line"><span>//  - 如果参数小于0，阻塞等待文件就绪</span></span>
<span class="line"><span>//  - 如果参数等于0，非阻塞轮询</span></span>
<span class="line"><span>//  - 如果参数大于0，阻塞定期轮询</span></span>
<span class="line"><span>func netpoll(delay int64) gList {</span></span>
<span class="line"><span>    if epfd == -1 {</span></span>
<span class="line"><span>        return gList{}</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    var waitms int32</span></span>
<span class="line"><span>    if delay &lt; 0 {</span></span>
<span class="line"><span>        waitms = -1</span></span>
<span class="line"><span>    } else if delay == 0 {</span></span>
<span class="line"><span>        waitms = 0</span></span>
<span class="line"><span>    } else if delay &lt; 1e6 {</span></span>
<span class="line"><span>        waitms = 1</span></span>
<span class="line"><span>    } else if delay &lt; 1e15 {</span></span>
<span class="line"><span>        waitms = int32(delay / 1e6)</span></span>
<span class="line"><span>    } else {</span></span>
<span class="line"><span>        // An arbitrary cap on how long to wait for a timer.</span></span>
<span class="line"><span>        // 1e9 ms == ~11.5 days.</span></span>
<span class="line"><span>        waitms = 1e9</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    //声明一个epollevent事件，在epoll_wait系统调用时候，会给该数组赋值并返回一个索引位</span></span>
<span class="line"><span>    //之后可以遍历数组取出就绪的fd事件</span></span>
<span class="line"><span>    var events [128]epollevent</span></span>
<span class="line"><span>retry:</span></span>
<span class="line"><span>    //陷入系统调用，取出内核eventpoll中的rdlist，返回就绪的事件</span></span>
<span class="line"><span>    n := epollwait(epfd, &amp;events[0], int32(len(events)), waitms)</span></span>
<span class="line"><span>    if n &lt; 0 {</span></span>
<span class="line"><span>        if n != -_EINTR {</span></span>
<span class="line"><span>            println(&quot;runtime: epollwait on fd&quot;, epfd, &quot;failed with&quot;, -n)</span></span>
<span class="line"><span>            throw(&quot;runtime: netpoll failed&quot;)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        // If a timed sleep was interrupted, just return to</span></span>
<span class="line"><span>        // recalculate how long we should sleep now.</span></span>
<span class="line"><span>        if waitms &gt; 0 {</span></span>
<span class="line"><span>            return gList{}</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        goto retry</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    var toRun gList</span></span>
<span class="line"><span>    //遍历event事件数组</span></span>
<span class="line"><span>    for i := int32(0); i &lt; n; i++ {</span></span>
<span class="line"><span>        ev := &amp;events[i]</span></span>
<span class="line"><span>        if ev.events == 0 {</span></span>
<span class="line"><span>            continue</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        if *(**uintptr)(unsafe.Pointer(&amp;ev.data)) == &amp;netpollBreakRd {</span></span>
<span class="line"><span>            if ev.events != _EPOLLIN {</span></span>
<span class="line"><span>                println(&quot;runtime: netpoll: break fd ready for&quot;, ev.events)</span></span>
<span class="line"><span>                throw(&quot;runtime: netpoll: break fd ready for something unexpected&quot;)</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>            if delay != 0 {</span></span>
<span class="line"><span>                // netpollBreak could be picked up by a</span></span>
<span class="line"><span>                // nonblocking poll. Only read the byte</span></span>
<span class="line"><span>                // if blocking.</span></span>
<span class="line"><span>                var tmp [16]byte</span></span>
<span class="line"><span>                read(int32(netpollBreakRd), noescape(unsafe.Pointer(&amp;tmp[0])), int32(len(tmp)))</span></span>
<span class="line"><span>                atomic.Store(&amp;netpollWakeSig, 0)</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>            continue</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        var mode int32</span></span>
<span class="line"><span>        //是否有就绪的读写事件，放入mode标志位</span></span>
<span class="line"><span>        if ev.events&amp;(_EPOLLIN|_EPOLLRDHUP|_EPOLLHUP|_EPOLLERR) != 0 {</span></span>
<span class="line"><span>            mode += &#39;r&#39;</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if ev.events&amp;(_EPOLLOUT|_EPOLLHUP|_EPOLLERR) != 0 {</span></span>
<span class="line"><span>            mode += &#39;w&#39;</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if mode != 0 {</span></span>
<span class="line"><span>            //取出存入的pollDesc的指针</span></span>
<span class="line"><span>            pd := *(**pollDesc)(unsafe.Pointer(&amp;ev.data))</span></span>
<span class="line"><span>            pd.everr = false</span></span>
<span class="line"><span>            if ev.events == _EPOLLERR {</span></span>
<span class="line"><span>                pd.everr = true</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>            //s1 具体实现 netpoll.go</span></span>
<span class="line"><span>            //取出pd中的rg或wg，后面放到运行队列</span></span>
<span class="line"><span>            netpollready(&amp;toRun, pd, mode)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    return toRun</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// netpollBreak interrupts an epollwait.</span></span>
<span class="line"><span>//唤醒网络轮询器，例如：计时器向前修改时间时会通过该函数中断网络轮询器</span></span>
<span class="line"><span>func netpollBreak() {</span></span>
<span class="line"><span>    if atomic.Cas(&amp;netpollWakeSig, 0, 1) {</span></span>
<span class="line"><span>        for {</span></span>
<span class="line"><span>            var b byte</span></span>
<span class="line"><span>            n := write(netpollBreakWr, unsafe.Pointer(&amp;b), 1)</span></span>
<span class="line"><span>            if n == 1 {</span></span>
<span class="line"><span>                break</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>            if n == -_EINTR {</span></span>
<span class="line"><span>                continue</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>            if n == -_EAGAIN {</span></span>
<span class="line"><span>                return</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>            println(&quot;runtime: netpollBreak write failed with&quot;, -n)</span></span>
<span class="line"><span>            throw(&quot;runtime: netpollBreak write failed&quot;)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//go:nowritebarrier</span></span>
<span class="line"><span>//将就绪好得io事件，写入就绪的goroutine对列</span></span>
<span class="line"><span>func netpollready(toRun *gList, pd *pollDesc, mode int32) {</span></span>
<span class="line"><span>    var rg, wg *g</span></span>
<span class="line"><span>    if mode == &#39;r&#39; || mode == &#39;r&#39;+&#39;w&#39; {</span></span>
<span class="line"><span>        rg = netpollunblock(pd, &#39;r&#39;, true)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    if mode == &#39;w&#39; || mode == &#39;r&#39;+&#39;w&#39; {</span></span>
<span class="line"><span>        wg = netpollunblock(pd, &#39;w&#39;, true)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    //将阻塞的goroutine加入gList返回</span></span>
<span class="line"><span>    if rg != nil {</span></span>
<span class="line"><span>        toRun.push(rg)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    if wg != nil {</span></span>
<span class="line"><span>        toRun.push(wg)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func netpollblockcommit(gp *g, gpp unsafe.Pointer) bool {</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>  //把当前g的指针存为gpp指针，gpp为pd的rg或wg</span></span>
<span class="line"><span>    r := atomic.Casuintptr((*uintptr)(gpp), pdWait, uintptr(unsafe.Pointer(gp)))</span></span>
<span class="line"><span>    if r {</span></span>
<span class="line"><span>        // Bump the count of goroutines waiting for the poller.</span></span>
<span class="line"><span>        // The scheduler uses this to decide whether to block</span></span>
<span class="line"><span>        // waiting for the poller if there is nothing else to do.</span></span>
<span class="line"><span>        //将全局变量改为1，代表系统有netpoll的等待者</span></span>
<span class="line"><span>        //关键：此时accept被阻塞，系统会在这个监听的socket fd时间发生变换时(新连接),将park住的goroutine给ready</span></span>
<span class="line"><span>        atomic.Xadd(&amp;netpollWaiters, 1)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    return r</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// 关闭  当发生某些情况，如连接断开，fd销毁等，会调用到此处</span></span>
<span class="line"><span>func poll_runtime_pollClose(pd *pollDesc) {</span></span>
<span class="line"><span>    if !pd.closing {</span></span>
<span class="line"><span>        throw(&quot;runtime: close polldesc w/o unblock&quot;)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    wg := atomic.Loaduintptr(&amp;pd.wg)</span></span>
<span class="line"><span>    if wg != 0 &amp;&amp; wg != pdReady {</span></span>
<span class="line"><span>        throw(&quot;runtime: blocked write on closing polldesc&quot;)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    rg := atomic.Loaduintptr(&amp;pd.rg)</span></span>
<span class="line"><span>    if rg != 0 &amp;&amp; rg != pdReady {</span></span>
<span class="line"><span>        throw(&quot;runtime: blocked read on closing polldesc&quot;)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    </span></span>
<span class="line"><span>    //调用epoll_ctl系统调用，删除该fd在eventpoll上对应的epitem</span></span>
<span class="line"><span>    netpollclose(pd.fd)</span></span>
<span class="line"><span>    //释放对应的pd </span></span>
<span class="line"><span>    pollcache.free(pd)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//释放内存 对应的pd</span></span>
<span class="line"><span>func (c *pollCache) free(pd *pollDesc) {</span></span>
<span class="line"><span>    lock(&amp;c.lock)</span></span>
<span class="line"><span>    pd.link = c.first</span></span>
<span class="line"><span>    c.first = pd</span></span>
<span class="line"><span>    unlock(&amp;c.lock)</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>最后关联 协程 go：</p><p>proc.go main方法 最后</p><p>//s1 关键方法与Epoll网络模型关联 让出当前协程执行权，一般是返回到g0让g0重新调度</p><p>gopark(nil, nil, waitReasonPanicWait, traceEvGoStop, 1)</p><p>并且在 netepoll 轮询 的时候</p><div class="language-plain line-numbers-mode" data-highlighter="shiki" data-ext="plain" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-plain"><span class="line"><span>//轮询时调用的方法，如果io就绪了返回ok，如果没就绪，返回flase</span></span>
<span class="line"><span>func netpollblock(pd *pollDesc, mode int32, waitio bool) bool {</span></span>
<span class="line"><span>    gpp := &amp;pd.rg</span></span>
<span class="line"><span>    if mode == &#39;w&#39; {</span></span>
<span class="line"><span>        gpp = &amp;pd.wg</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // set the gpp semaphore to pdWait</span></span>
<span class="line"><span>    for {</span></span>
<span class="line"><span>        // Consume notification if already ready.</span></span>
<span class="line"><span>        if atomic.Casuintptr(gpp, pdReady, 0) {</span></span>
<span class="line"><span>            return true</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        if atomic.Casuintptr(gpp, 0, pdWait) {</span></span>
<span class="line"><span>            break</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        // Double check that this isn&#39;t corrupt; otherwise we&#39;d loop</span></span>
<span class="line"><span>        // forever.</span></span>
<span class="line"><span>        if v := atomic.Loaduintptr(gpp); v != pdReady &amp;&amp; v != 0 {</span></span>
<span class="line"><span>            throw(&quot;runtime: double wait&quot;)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    // need to recheck error states after setting gpp to pdWait</span></span>
<span class="line"><span>    // this is necessary because runtime_pollUnblock/runtime_pollSetDeadline/deadlineimpl</span></span>
<span class="line"><span>    // do the opposite: store to closing/rd/wd, membarrier, load of rg/wg</span></span>
<span class="line"><span>    if waitio || netpollcheckerr(pd, mode) == 0 {</span></span>
<span class="line"><span>        //s1 gopark是很重要得一个方法，本质上是让出当前协程执行权，一般是返回到g0 让g0重新调度</span></span>
<span class="line"><span>        //proc.go 的main() 最终调用此</span></span>
<span class="line"><span>        gopark(netpollblockcommit, unsafe.Pointer(gpp), waitReasonIOWait, traceEvGoBlockNet, 5)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    // be careful to not lose concurrent pdReady notification</span></span>
<span class="line"><span>    old := atomic.Xchguintptr(gpp, 0)</span></span>
<span class="line"><span>    if old &gt; pdWait {</span></span>
<span class="line"><span>        throw(&quot;runtime: corrupted polldesc&quot;)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    return old == pdReady</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>golang高并发 + 网络通信高性能全部串联起来</p><p>总结 GoLang 网络通信：</p><p>1.网络通信 通过多协程+Epoll事件驱动的网络模型</p><p>2.简单，高效应用 ，内置规范</p><p>3.服务端 和 客户端如何关联交互</p><p>4.网络模型 Conn &gt; netFD &gt; pollDesc (rg /wg) &gt; epoll (epollcreate epollctl epollwait)</p><p>5.详细 init &gt; open &gt; netPoll (wait &gt; broke / break &gt; read &gt; commit ) &gt; gopark 调度G &gt; close &gt; free</p><ol start="6"><li>golang协程MPG调度 跟这里的网络通信的G的调度 gopark 调度G</li></ol><p>7.定制化 自己封装的使用</p><p>能看到这说明你确实“够浪”，<a href="https://www.yuque.com/tianming-aroh0/sagnbd" target="_blank" rel="noopener noreferrer">我就给你</a>再留给彩蛋吧。上述进阶并发和网路通信的笔记的</p><p><a href="https://www.bilibili.com/video/BV1Fg411q7s3/?spm_id_from=333.1387.upload.video_card.click&amp;vd_source=04d13f3e51316f05440d2eb2411de9f3" target="_blank" rel="noopener noreferrer">https://www.bilibili.com/video/BV1Fg411q7s3/?spm_id_from=333.1387.upload.video_card.click&amp;vd_source=04d13f3e51316f05440d2eb2411de9f3</a></p><p>是我已发布在B站（够浪编程），还有更多架构从应用到原理和项目实战的内容。以及云原生二次开发</p><p>tips:如果不是要往go这块转或者云原生定制化，到此面个试基本就够吊打面试官了</p>`,138)]])}var s=r(a,[[`render`,o]]);export{i as _pageData,s as default};