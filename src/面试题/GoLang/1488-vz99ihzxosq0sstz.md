---
title: "进阶网络通信"
sidebarGroup: "GoLang"
shortTitle: "进阶网络通信"
order: 1488
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "课程介绍通信的本质：TCP/IP通信原理：网络分层TCP如何确保可靠性传递：三次握手四次挥手BIO/NIO： ServerSocket Socket 多路复用 （原理源码详细讲解Epoll）		标准库net包的使用Go语言标准库里提供的 n"
article: false
---

> 来源：[进阶网络通信](https://www.yuque.com/tulingzhouyu/db22bv/vz99ihzxosq0sstz)

#### [课程介绍](https://www.yuque.com/tianming-aroh0/sagnbd/nfkf7dvzxgp26nw4)

##### 通信的本质：

##### TCP/IP通信原理：网络分层

##### TCP如何确保可靠性传递：三次握手四次挥手

##### BIO/NIO： ServerSocket Socket 多路复用 （原理源码详细讲解Epoll）

#### 标准库net包的使用

Go语言标准库里提供的 net 包，支持基于 IP 层、TCP/UDP 层及更高层面（如 HTTP、FTP、SMTP）的网络操作，其中用于 IP 层的称为 Raw Socket。

重要函数：net.Listen() 服务端的监听 。 net.Dial()客户端的处理

##### 代码实现：

```plain
package main

import (
    "fmt"
    "net"
)

func main() {
    fmt.Printf("服务器准备开启。。。。")
    listener, err := net.Listen("tcp", "127.0.0.1:8081") // "0.0.0.0:8081")
    if err != nil {
        fmt.Println(err)
        return
    }
    defer listener.Close()
    for {
        conn, err := listener.Accept()
        if err != nil {
            fmt.Println(err)
            return
        } else {
            fmt.Println(conn)
        }

    }
}
```

client端

```plain
package main
import (
    "fmt"
    "net"
)

func main() {
    fmt.Printf("客户端准备开启。。。。")
    conn, err := net.Dial("tcp", "192.168.49.1:8081")
    if err != nil {
        fmt.Println(err)
    }
    defer conn.Close()
    fmt.Println("客户端连接成功", conn.RemoteAddr().String())
}
```

通过标准流 数据传递

客户端传递数据给服务端

关键方法：os.stdin	bufio. conn.Write conn.Read

```plain
func main() {
    fmt.Printf("客户端准备开启。。。。")

    conn, err := net.Dial("tcp", "192.168.49.1:8081")
    if err != nil {
        fmt.Println(err)
    }

    go proc(conn)
}

func proc(conn net.Conn) {
    defer conn.Close()
    reader := bufio.NewReader(os.Stdin)  //标准输入流
    line, err := reader.ReadString('\n') //每次读一行
    if err != nil {
        fmt.Println(err)
    }
    len, err := conn.Write([]byte(line))
    if err != nil {
        fmt.Println(err)
    }

    fmt.Println("客户端连接成功", conn.RemoteAddr().String(), "并且写了", len, "个字节")
}
```

服务端读取 客户端数据

```plain
func main() {
    fmt.Printf("服务器准备开启。。。。")
    listener, err := net.Listen("tcp", "0.0.0.0:8081") // "0.0.0.0:8081")
    if err != nil {
        fmt.Println(err)
        return
    }
    defer listener.Close()
    for {
        conn, err := listener.Accept()

        go proc(conn)

        if err != nil {
            fmt.Println(err) // err = EOF client退出了
            return
        } else {
            fmt.Println(conn.LocalAddr())
        }
    }
}

func proc(conn net.Conn) {
    defer conn.Close()
    for {
        buf := make([]byte, 1024)
        n, err := conn.Read(buf) //返回的是 接受的字节数
        if err != nil {
            fmt.Println(err)
            return
        }
        fmt.Println(n)
        fmt.Println(string(buf[:n]))
    }
}
```

多行写 和 读 bye标志退出

```plain
func main() {
    fmt.Printf("客户端准备开启。。。。")

    conn, err := net.Dial("tcp", "192.168.49.1:8081")
    if err != nil {
        fmt.Println(err)
    }

    go proc(conn)
    if <-exitChan {
        fmt.Println("客户端退出连接")
        return
    }
}

var exitChan chan bool = make(chan bool, 1)

func proc(conn net.Conn) {
    defer conn.Close()
    reader := bufio.NewReader(os.Stdin) //标准输入流
    for {
        line, err := reader.ReadString('\n') //每次读一行
        if err != nil {
            fmt.Println(err)
        }
        line = strings.Trim(line, "\r\n")
        if line == "bye" {
            exitChan <- true
            break
        }

        len, err := conn.Write([]byte(line))
        if err != nil {
            fmt.Println(err)
        }
        fmt.Println("写了", len, "个字节")
    }
}
```

#### Web开启 net包装类 net/http

主要方法 http.ListenAndServe() http.HandleFunc()

代码实现：

```plain
import (
    "fmt"
    "net/http"
)

func main() {
    fmt.Printf("服务器准备开启。。。。")
    http.HandleFunc("/hello", hello)
    http.ListenAndServe(":8081", nil)
}

func hello(w http.ResponseWriter, r *http.Request) {
    fmt.Println("hello web")
}
```

原理图

多个handler

```plain
package main

import (
    "fmt"
    "net/http"
)

func main() {
    fmt.Printf("服务器准备开启。。。。")
    http.HandleFunc("/hello", hello)
    handler1 := handler1{}
    http.Handle("/helloA", &handler1)
    http.ListenAndServe(":8081", nil)
}

type handler1 struct{}

func (h1 *handler1) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    fmt.Println(w, "handler1 ")
}

func hello(w http.ResponseWriter, r *http.Request) {
    fmt.Println("hello web")
}
```

##### 发起Get请求

代码实现：

```plain
func main() {
    resp, _ := http.Get("https://www.mashibing.com/course/1492")
    defer resp.Body.Close()
    b, _ := ioutil.ReadAll(resp.Body)
    fmt.Printf("%v\n", string(b))
}
```

##### 传递参数

代码实现：

```plain
package main

import (
    "fmt"
    "io/ioutil"
    "net/http"
    "net/url"
)

func main() {
    params := url.Values{}
    params.Set("wd", "天明")
    Url, err := url.Parse("http://www.baidu.com/s")
    if err != nil {
        fmt.Println(err)
    }
    Url.RawQuery = params.Encode()

    resp, err := http.Get(Url.String())
    if err != nil {
        fmt.Println(err)
    }
    b, _ := ioutil.ReadAll(resp.Body)
    fmt.Printf("%v\n", string(b))
}
```

##### Json格式处理

代码实现：

```plain
import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
)

func main() {
    testGetJson()
}

func testGetJson() {
    path := "http://www.weather.com.cn/data/cityinfo/101010100.html"
    r, _ := http.Get(path)
    defer r.Body.Close()
    b, _ := ioutil.ReadAll(r.Body)
    fmt.Printf("%v\n", string(b))
    var jsonStr res
    json.Unmarshal([]byte(b), &jsonStr)
    fmt.Printf("%v\n", jsonStr)
}

type res struct {
    Info weather `json:"weatherinfo"`
}
type weather struct {
    City    string `json:"city"`
    cityid  string
    temp1   string
    temp2   string
    weather string
    img1    string
    img2    string
    ptime   string
}
```

##### 发起Post请求

代码实现：

```plain
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
    "net/url"
    "strings"
)

func main() {
    postC()
}

func postA() {
    path := "http://apis.juhe.cn/simpleWeather/query"
    values := url.Values{}
    values.Set("key", "087d7d10f700d20e27bb753cd806e40b")
    values.Set("city", "上海")
    r, _ := http.PostForm(path, values)
    defer r.Body.Close()
    b, _ := ioutil.ReadAll(r.Body)
    fmt.Printf("%v\n", string(b))
}

func postB() {
    path := "http://httpbin.org/post"
    values := url.Values{
        "name": {"申专"},
        "age":  {"18"},
    }
    reqBody := values.Encode()
    r, _ := http.Post(path, "text/html", strings.NewReader(reqBody))
    defer r.Body.Close()
    b, _ := ioutil.ReadAll(r.Body)
    fmt.Printf("%v\n", string(b))
}

func postC() {
    path := "http://httpbin.org/post"

    data := make(map[string]interface{})
    data["name"] = "天明"
    data["age"] = 28
    byteData, _ := json.Marshal(data)

    r, _ := http.Post(path, "application/json", bytes.NewReader(byteData))
    defer r.Body.Close()
    b, _ := ioutil.ReadAll(r.Body)
    fmt.Printf("%v\n", string(b))
}
```

#### **Golang标准库 template**

templates定义了数据驱动的文本输出，生产html文件的模板在 html/template 包里面。

模板使用插值语法 **{​{.var}​}** 也可以使用一些流程控制，列如 if else for range等

主要方法： template.New("别名").Parse("解析的模板") template.Execute()

##### 自定义模板代码实现：

```plain
func main() {

    name := "shenz"
    myTemplate := "hello,{​{.}​}"
    tmpl, err := template.New("test").Parse(myTemplate)
    if err != nil {
        fmt.Print(err)
    }
    err = tmpl.Execute(os.Stdout, name)
    if err != nil {
        fmt.Print(err)
    }
    fmt.Printf("服务器准备开启。。。。")

    /**
    person := Person{"shen", 18}
    myTemplateA := "hello,{​{.Name}​},your age is {​{.Age}​}"
    tmpl, err := template.New("test").Parse(myTemplateA)
    if err != nil {
        fmt.Print(err)
    }
    err = tmpl.Execute(os.Stdout, person)
    if err != nil {
        fmt.Print(err)
    }
    fmt.Printf("服务器准备开启。。。。")
    **/
    
}
type Person struct {
    Name string
    Age  int
}
```

##### HTML模板

1.定义html页面

2.handle中解析模板文件

(文件目录有问题 路径访问不到问题最好新项目go mod)

代码实现：

```plain
&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;meta http-equiv="X-UA-Compatible" content="IE=edge"&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;
    &lt;title&gt;my html&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
    {​{.}​}
&lt;/body&gt;
&lt;/html&gt;

func main(){
    handle1 := handle1{}
    http.Handle("/handler1", &handle1)
    s := http.Server{
        Addr:    "127.0.0.1:8081",
        Handler: nil,
    }
    s.ListenAndServe()
}

type handle1 struct{}

func (h *handle1) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    t1, err := template.ParseFiles("src/web/template/html/index.html")
    if err != nil {
        panic(err)
    }
    t1.Execute(w, "Hello MyHTML")

}
```

###### 注意1 空格

{​{ 1 }​}

{​{- 1 -}​} -》 1

###### 注意2 注释

/* xxoo */

###### 注意3 pipeline多连接传递

unix 管道 |前面的命令将运算的结果传递给下一名的最后一个位置

比如下面都会输出 shenzhuan

{​{`"shenzhuan"`}​}

{​{printf "%q" "shenzhuan"}​}

{​{"shenzhuan" | printf "%q" }​}

{​{"zhuan" | printf "%s%s" "shen" |printf "%q"}​}

{​{"shenzhuan" | printf "%s" | printf "%q"}​}

###### 注意4 变量的使用

$var := pipiline //定义一个没有定义过变量

$var = pipilne

###### 注意5 条件判断

```plain
eq  ne lt le gt  ge
{​{$Age := 19}​}
 {​{if ge $Age 18}​}
恭喜你成年了！
{​{end}​}

{​{$Age := 13}​}
    {​{if ge $Age 18}​}
    恭喜你成年了！
    {​{else if lt $Age 14}​}
    远离
    {​{else}​}
    禁止入内
    {​{end}​}
```

###### 注意6 循环

```plain
strs := []string{"图灵教育", "申专", "666"}
    t1.Execute(w, strs) ///"Hello MyHTML")
    
    

{​{range $val :=.}​}
&lt;span&gt;{​{println $val}​} &lt;/span&gt;
{​{end}​}
```

###### 注意7 设置.的值

with...end

{​{with lt $Age 14}​}ssssss{​{else}​} XXXXXXXXXXXX {​{end}​}

###### 总结：

可API [https://studygolang.com/pkgdoc](https://studygolang.com/pkgdoc)

当然也可以看源码 详见 template/funcs.go

##### 嵌套HTML

define 和 template关键字

```plain
header.html中
 {​{define "header"}​}
    &lt;h1&gt;这是header&lt;/h1&gt;>
    {​{end}​}
    
   index.html中 
       {​{template "header"}​}
       
       
    ServeHTTP 方法中
    t1, err := template.ParseFiles("src/web/template/html/index.html", "src/web/template/html/header.html")
```

#### 多路复用器 Mux(Multiplexer)

ServeMux的路由匹配

##### 实例代码

```plain
func newServerMux(w http.ResponseWriter, r *http.Request) {
    fmt.Println(w, "my mux ")
}

func main() {

    mux := http.NewServeMux()
    mux.HandleFunc("/", newServerMux)
    s := &http.Server{
        Addr:    ":8081",
        Handler: mux,
    }
    s.ListenAndServe()
    fmt.Println()
}

/happy  /bad   多个handler
func newServerMux(w http.ResponseWriter, r *http.Request) {
    fmt.Println(w, "my mux ")
}

func happy(w http.ResponseWriter, r *http.Request) {
    fmt.Println(w, "happy ")
}
func bad(w http.ResponseWriter, r *http.Request) {
    fmt.Println(w, "happy ")
}

func main() {

    mux := http.NewServeMux()
    mux.HandleFunc("/", newServerMux)
    mux.HandleFunc("/happy", happy)
    mux.HandleFunc("/bad", bad)
    s := &http.Server{
        Addr:    ":8081",
        Handler: mux,
    }
    s.ListenAndServe()
    fmt.Println()
}
```

#### HttpRouter高性能HTTP路由包

ServeMux 的一个缺陷是无法使用变量实现URL模式匹配。而HttpRouter可以，HttpRouter是一个高性能的第三方HTTP路由包，弥补了net/http包中的路由不足问题。

此轻量级 高性能的路由器 与默认的路由比，支持路由模式中的变量并匹配请求方法，它还可以更好的拓展。

还有就是我们接下来要讲的gin架构 就是已此作为基础开发的。

###### 实例代码

```plain
go  get github.com/julienschmidt/httprouter

func Hello(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    w.Write([]byte("hello httpRouter！！"))
}

func Index(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {

    // w.Write([]byte(ps.ByName("name")))
    fmt.Fprintf(w, "hello %s \n", ps.ByName("name"))
}
func main() {
    router := httprouter.New()
    router.GET("/", Hello)
    router.GET("/index/:name", Index)
    http.ListenAndServe(":8081", router)
    fmt.Println()
}
```

##### RestFul风格路由 完成 CRUD 的方法

```plain
func Hello(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
    w.Write([]byte("hello httpRouter！！"))
}

func Index(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    // w.Write([]byte(ps.ByName("name")))
    fmt.Fprintf(w, "hello %s \n", ps.ByName("name"))
}

func ModifyUser(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    uid := ps.ByName("uid")
    fmt.Fprintf(w, "修改了 用户id为 %s \n", uid)
}
func DeleteUser(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
    uid := ps.ByName("uid")
    fmt.Fprintf(w, "删除了 用户id为 %s \n", uid)
}

func main() {
    router := httprouter.New()
    router.GET("/", Hello)
    router.GET("/index/:name", Index)
    router.POST("/modifyuser/:uid", ModifyUser)
    router.DELETE("/deleteuser/:uid", DeleteUser)
    http.ListenAndServe(":8081", router)
    fmt.Println()
}
```

#### 网络通信总结：

大纲目录结构

#### 原理流程：

client > server (注册路由 - 根据路由规则派发 handler处理器 -处理数据 - 模板引擎 - 展示给client)

#### 源码解读：

为了新奇， 解决疑难杂症 ， 优化 面试，技术的一种深度 往后的高度

#### 网络模型

linux五种：

BIO ：阻塞IO

NIO：非阻塞IO

多路复用

Select：（多个（1024个）fd文件描述符轮询遍历就绪）

Poll ：pollfd结构表示要监听的描述符 需要将socket从用户态转换称内核态

Epoll：事件监听，三个重要方法：

poll_create(); 创建一个epoll对象

epoll_ctl(); 事件注册 维护一个红黑树的结构

poll_wait(); 等待就绪的事件 已经就绪的 维护的到一个 双向链表的结构

#### goroutine+epoll网络模型流程图：

##### 源码解读：

通信原理 ：BIO NIO Selector Poll Epoll

golang网络通信 ： 多协程+Epoll

MPG调度跟Epoll的关联：

MPG模型，在IO事件中的事件与之前的G，g0协程如何获得执行权？

协程主方法mian最终调用的gopark() 关键方法与Epoll网络模型关联 让出当前协程执行权，一般是返回到g0让g0重新调度

```plain
net.Listen("tcp", "0.0.0.0:8082") 

func Listen(network, address string) (Listener, error) {
    var lc ListenConfig
    //s2 listen绑定
    return lc.Listen(context.Background(), network, address)
}

func (lc *ListenConfig) Listen(ctx context.Context, network, address string) (Listener, error) {
    //根据协议名称和地址获得Internet协议族地址列表
    addrs, err := DefaultResolver.resolveAddrList(ctx, "listen", network, address, nil)
    if err != nil {
        return nil, &OpError{Op: "listen", Net: network, Source: nil, Addr: nil, Err: err}
    }
    sl := &sysListener{
        ListenConfig: *lc,
        network:      network,
        address:      address,
    }
    var l Listener
    la := addrs.first(isIPv4)
    switch la := la.(type) {
    case *TCPAddr:
        //s1 TCP监听
        l, err = sl.listenTCP(ctx, la)
    case *UnixAddr:
        // Unix
        l, err = sl.listenUnix(ctx, la)
    default:
        return nil, &OpError{Op: "listen", Net: sl.network, Source: nil, Addr: la, Err: &AddrError{Err: "unexpected address type", Addr: address}​}
    }
    if err != nil {
        return nil, &OpError{Op: "listen", Net: sl.network, Source: nil, Addr: la, Err: err} // l is non-nil interface containing nil pointer
    }
    return l, nil
}

//s1 返回值可见关键的poll.FD
func (sl *sysListener) listenTCP(ctx context.Context, laddr *TCPAddr) (*TCPListener, error) {
    //s1 内部（各平台对应）调用生产socket具体描述符
    fd, err := internetSocket(ctx, sl.network, laddr, nil, syscall.SOCK_STREAM, 0, "listen", sl.ListenConfig.Control)
    if err != nil {
        return nil, err
    }
    return &TCPListener{fd: fd, lc: sl.ListenConfig}, nil
}

func internetSocket(ctx context.Context, net string, laddr, raddr sockaddr, sotype, proto int, mode string, ctrlFn func(string, string, syscall.RawConn) error) (fd *netFD, err error) {
    if (runtime.GOOS == "aix" || runtime.GOOS == "windows" || runtime.GOOS == "openbsd") && mode == "dial" && raddr.isWildcard() {
        raddr = raddr.toLocal(net)
    }
    family, ipv6only := favoriteAddrFamily(net, laddr, raddr, mode)
    //s1  返回socket描述符具体描述 此函数：
    //   1调用sysSocket生产描述符。2调用newFD封装描述符 构造netFD    3调用netFD实现bind和listen
    return socket(ctx, net, family, sotype, proto, ipv6only, laddr, raddr, ctrlFn)
}

func socket(ctx context.Context, net string, family, sotype, proto int, ipv6only bool, laddr, raddr sockaddr, ctrlFn func(string, string, syscall.RawConn) error) (fd *netFD, err error) {
    //1.根据操作系统获取对应的socket
    s, err := sysSocket(family, sotype, proto)
    if err != nil {
        return nil, err
    }
    //2.设置socket选项
    if err = setDefaultSockopts(s, family, sotype, ipv6only); err != nil {
        poll.CloseFunc(s)
        return nil, err
    }
    //3.创建fd
    if fd, err = newFD(s, family, sotype, net); err != nil {
        poll.CloseFunc(s)
        return nil, err
    }

    //4.监听
    if laddr != nil && raddr == nil {
        switch sotype {
        //windows实现在socket_windows.go   linux实现在socket_cloexec.go中
        case syscall.SOCK_STREAM, syscall.SOCK_SEQPACKET:
            //TCP  s1 次方主要负责调用系统 的bind和listen
            if err := fd.listenStream(laddr, listenerBacklog(), ctrlFn); err != nil {
                fd.Close()
                return nil, err
            }
            return fd, nil
        case syscall.SOCK_DGRAM:
            //UDP
            if err := fd.listenDatagram(laddr, ctrlFn); err != nil {
                fd.Close()
                return nil, err
            }
            return fd, nil
        }
    }
    //5.发起连接，非listen socket处理
    if err := fd.dial(ctx, laddr, raddr, ctrlFn); err != nil {
        fd.Close()
        return nil, err
    }
    return fd, nil
}

//这里一会 再过来看 FD 

 先来看 client 怎么跟Service建立连接
conn, err := net.Dial("tcp", "192.168.49.254:8082")
func Dial(network, address string) (Conn, error) {
    var d Dialer
    // s1 实际调用DialContext
    return d.Dial(network, address)
}

func (d *Dialer) Dial(network, address string) (Conn, error) {
    //s1 conn用的TCPConn
    return d.DialContext(context.Background(), network, address)
}

//s1 最终的TCPConn > Conn  里面都是基于关键网络描述符 netFD
func (d *Dialer) DialContext(ctx context.Context, network, address string) (Conn, error) {
    if ctx == nil {
        panic("nil context")
    }
    deadline := d.deadline(ctx, time.Now())
    if !deadline.IsZero() {
        if d, ok := ctx.Deadline(); !ok || deadline.Before(d) {
            subCtx, cancel := context.WithDeadline(ctx, deadline)
            defer cancel()
            ctx = subCtx
        }
    }
    if oldCancel := d.Cancel; oldCancel != nil {
        subCtx, cancel := context.WithCancel(ctx)
        defer cancel()
        go func() {
            select {
            case <-oldCancel:
                cancel()
            case <-subCtx.Done():
            }
        }()
        ctx = subCtx
    }

    // Shadow the nettrace (if any) during resolve so Connect events don't fire for DNS lookups.
    resolveCtx := ctx
    if trace, _ := ctx.Value(nettrace.TraceKey{}).(*nettrace.Trace); trace != nil {
        shadow := *trace
        shadow.ConnectStart = nil
        shadow.ConnectDone = nil
        resolveCtx = context.WithValue(resolveCtx, nettrace.TraceKey{}, &shadow)
    }

    addrs, err := d.resolver().resolveAddrList(resolveCtx, "dial", network, address, d.LocalAddr)
    if err != nil {
        return nil, &OpError{Op: "dial", Net: network, Source: nil, Addr: nil, Err: err}
    }

    sd := &sysDialer{
        Dialer:  *d,
        network: network,
        address: address,
    }

    var primaries, fallbacks addrList
    if d.dualStack() && network == "tcp" {
        primaries, fallbacks = addrs.partition(isIPv4)
    } else {
        primaries = addrs
    }

    var c Conn
    if len(fallbacks) > 0 {
        c, err = sd.dialParallel(ctx, primaries, fallbacks)
    } else {
        c, err = sd.dialSerial(ctx, primaries)
    }
    if err != nil {
        return nil, err
    }

    if tc, ok := c.(*TCPConn); ok && d.KeepAlive >= 0 {
        setKeepAlive(tc.fd, true)
        ka := d.KeepAlive
        if d.KeepAlive == 0 {
            ka = defaultTCPKeepAlive
        }
        setKeepAlivePeriod(tc.fd, ka)
        testHookSetKeepAlive(ka)
    }
    return c, nil
}

//接下来重点 是 netFD 网络描述符 。 server 创建 socket的时候已经构建好

func newFD(sysfd syscall.Handle, family, sotype int, net string) (*netFD, error) {
    ret := &netFD{
        pfd: poll.FD{
            Sysfd:         sysfd,
            IsStream:      sotype == syscall.SOCK_STREAM,
            ZeroReadIsEOF: sotype != syscall.SOCK_DGRAM && sotype != syscall.SOCK_RAW,
        },
        family: family,
        sotype: sotype,
        net:    net,
    }
    return ret, nil
}

//并且 包含Conn 了此网络描述符

type conn struct {
    fd *netFD //s1 关键 网络描述符/句柄  不论net.listener还是dial都是基于此
}

// Network file descriptor.
//包含在Conn结构中，而Conn又包含在TCPConn结构中，所以此应该处于用户接口层
type netFD struct {
    //s1 包含两个重要的数据结构 Sysfd 和 pollDesc，  用户层接口调用此完成交互
    //1.前者是真正的系统文件描述符，
    //2.后者对是底层事件驱动的封装，所有的读写超时等操作都是通过调用后者的对应方法实现的
    pfd poll.FD

    // immutable until Close
    family      int
    sotype      int
    isConnected bool // handshake completed or use of association with peer
    net         string
    laddr       Addr
    raddr       Addr
}

type FD struct {
    // Lock sysfd and serialize access to Read and Write methods.
    fdmu fdMutex //读写锁  锁定sysfd并序列化对Read和Write方法的访问

    // System file descriptor. Immutable until Close.
    Sysfd syscall.Handle //关键  系统文件描述符

    // Read operation. 读操作
    rop operation
    // Write operation. 写操作
    wop operation

    // I/O poller.
    pd pollDesc //      s1 底层事件驱动的封装 所有的读写超时等操作都是通过此

    // Used to implement pread/pwrite. 用于缓存读写锁
    l sync.Mutex

    // For console I/O.
    lastbits       []byte   // first few bytes of the last incomplete rune in last write
    readuint16     []uint16 // buffer to hold uint16s obtained with ReadConsole
    readbyte       []byte   // buffer to hold decoding of readuint16 from utf16 to utf8
    readbyteOffset int      // readbyte[readOffset:] is yet to be consumed with file.Read

    // Semaphore signaled when file is closed. 关闭文件时的信号
    csema uint32

    skipSyncNotif bool //是否跳过sync

    // Whether this is a streaming descriptor, as opposed to a
    // packet-based descriptor like a UDP socket.
    IsStream bool //TCP 还是 UDP

    // Whether a zero byte read indicates EOF. This is false for a
    // message based socket connection.
    ZeroReadIsEOF bool //读取到0字节时是否为错误。基于socket时is false

    // Whether this is a file rather than a network socket.
    isFile bool //是否系统真实文件  或者网络socket连接

    // The kind of this file.
    kind fileKind //文件类型
}

type pollDesc struct {
    runtimeCtx uintptr //只包含了一个指针  指针具体内容是关键 下面会讲
    //s1 通过init初始化
}

func (pd *pollDesc) init(fd *FD) error {
    //一次 / 首次
    serverInit.Do(runtime_pollServerInit)
    //s1 关键   内核态用户态共享的关联切换
    // 注册epoll 实例到 fd  实际link到runtime包下的 poll_runtime_pollOpen 函数。具体实现在  runtime/netpoll.go
    //go:linkname poll_runtime_pollOpen internal/poll.runtime_pollOpen
    ctx, errno := runtime_pollOpen(uintptr(fd.Sysfd))
    if errno != 0 {
        return errnoErr(syscall.Errno(errno))
    }
    pd.runtimeCtx = ctx
    return nil
}

//关联到 runtime/netpoll.go
//关键 事件驱动
type pollDesc struct {
    link *pollDesc // in pollcache, protected by pollcache.lock

    // The lock protects pollOpen, pollSetDeadline, pollUnblock and deadlineimpl operations.
    // This fully covers seq, rt and wt variables. fd is constant throughout the PollDesc lifetime.
    // pollReset, pollWait, pollWaitCanceled and runtime·netpollready (IO readiness notification)
    // proceed w/o taking the lock. So closing, everr, rg, rd, wg and wd are manipulated
    // in a lock-free way by all operations.
    // TODO(golang.org/issue/49008): audit these lock-free fields for continued correctness.
    // NOTE(dvyukov): the following code uses uintptr to store *g (rg/wg),
    // that will blow up when GC starts moving objects.
    //锁  防止多线程/协程操作pollDesc并发问题
    lock mutex // protects the following fields
    //关键 描述符指针 链表结构可以减少结构大小 提高效率
    fd      uintptr
    closing bool
    everr   bool    // marks event scanning error happened
    user    uint32  // user settable cookie
    rseq    uintptr // protects from stale read timers

    //关键： 保存用户态操作的 读协程地址
    //比如：我们在用户态协程调用read阻塞时，rg设置为该协程。当内核态epoll_wait检测read就绪后会通过rg找到这个协程让其恢复运行
    //pollDesc实现用户态和内核态资源共享就在于此
    rg uintptr //取值 pdReady, pdWait, G waiting for read or nil. Accessed atomically.
    //读定时器 防止超时
    rt   timer   // read deadline timer (set if rt.f != nil)
    rd   int64   // read deadline
    wseq uintptr // protects from stale write timers
    //关键:保存用户态操作pollDesc 写协程的地址
    wg uintptr //取值 pdReady, pdWait, G waiting for write or nil. Accessed atomically.
    //写定时器
    wt timer // write deadline timer
    wd int64 // write deadline
    //接口地址
    self *pollDesc // storage for indirect interface. See (*pollDesc).makeArg.
    //epoll 网络模型具体方法在 netpoll_epoll.go 中 epollcreate  epollwait   epollctl 核心方法
}
```

```plain
//go:linkname poll_runtime_pollServerInit internal/poll.runtime_pollServerInit
//初始化
func poll_runtime_pollServerInit() {
    netpollGenericInit()
}
//上面调用此
func netpollGenericInit() {
    if atomic.Load(&netpollInited) == 0 {
        lockInit(&netpollInitLock, lockRankNetpollInit)
        lock(&netpollInitLock)
        if netpollInited == 0 {
            //真正系统调用   link 到 netpoll_epoll.go
            netpollinit()
            atomic.Store(&netpollInited, 1)
        }
        unlock(&netpollInitLock)
    }
}

//初始化网络轮询器  ，通过sync.Onec  和 netpollInited 遍历保证只一次
func netpollinit() {
    epfd = epollcreate1(_EPOLL_CLOEXEC)
    if epfd < 0 {
        epfd = epollcreate(1024)
        if epfd < 0 {
            println("runtime: epollcreate failed with", -epfd)
            throw("runtime: netpollinit failed")
        }
        closeonexec(epfd)
    }
    r, w, errno := nonblockingPipe()
    if errno != 0 {
        println("runtime: pipe failed with", -errno)
        throw("runtime: pipe failed")
    }
    ev := epollevent{
        events: _EPOLLIN,
    }
    *(**uintptr)(unsafe.Pointer(&ev.data)) = &netpollBreakRd
    //调用三关键函数的创建
    errno = epollctl(epfd, _EPOLL_CTL_ADD, r, &ev)
    if errno != 0 {
        println("runtime: epollctl failed with", -errno)
        throw("runtime: epollctl failed")
    }
    netpollBreakRd = uintptr(r)
    netpollBreakWr = uintptr(w)
}

// 监听文件描述符上的边缘触发事件，创建事件并加入监听poll_runtime_pollOpen函数，
// 这个函数将用户态协程的pollDesc信息写入到epoll所在的单独线程，从而实现用户态和内核态的关联。
func netpollopen(fd uintptr, pd *pollDesc) int32 {
    var ev epollevent
    //具体事件
    //注册event事件，这里使用了epoll的ET模式，相对于ET，ET需要每次产生事件时候就要处理事件，
    //否则容易丢失事件。
    ev.events = _EPOLLIN | _EPOLLOUT | _EPOLLRDHUP | _EPOLLET
    //events记录上pd的指针
    *(**pollDesc)(unsafe.Pointer(&ev.data)) = pd
    //系统调用将该fd加到eventpoll对象中，交由内核监听
    return -epollctl(epfd, _EPOLL_CTL_ADD, int32(fd), &ev)
}

//轮询网络并返回一组已经准备就绪的 Goroutine (GList)，传入的参数会决定它的行为：
//  - 如果参数小于0，阻塞等待文件就绪
//  - 如果参数等于0，非阻塞轮询
//  - 如果参数大于0，阻塞定期轮询
func netpoll(delay int64) gList {
    if epfd == -1 {
        return gList{}
    }
    var waitms int32
    if delay < 0 {
        waitms = -1
    } else if delay == 0 {
        waitms = 0
    } else if delay < 1e6 {
        waitms = 1
    } else if delay < 1e15 {
        waitms = int32(delay / 1e6)
    } else {
        // An arbitrary cap on how long to wait for a timer.
        // 1e9 ms == ~11.5 days.
        waitms = 1e9
    }
    //声明一个epollevent事件，在epoll_wait系统调用时候，会给该数组赋值并返回一个索引位
    //之后可以遍历数组取出就绪的fd事件
    var events [128]epollevent
retry:
    //陷入系统调用，取出内核eventpoll中的rdlist，返回就绪的事件
    n := epollwait(epfd, &events[0], int32(len(events)), waitms)
    if n < 0 {
        if n != -_EINTR {
            println("runtime: epollwait on fd", epfd, "failed with", -n)
            throw("runtime: netpoll failed")
        }
        // If a timed sleep was interrupted, just return to
        // recalculate how long we should sleep now.
        if waitms > 0 {
            return gList{}
        }
        goto retry
    }
    var toRun gList
    //遍历event事件数组
    for i := int32(0); i < n; i++ {
        ev := &events[i]
        if ev.events == 0 {
            continue
        }

        if *(**uintptr)(unsafe.Pointer(&ev.data)) == &netpollBreakRd {
            if ev.events != _EPOLLIN {
                println("runtime: netpoll: break fd ready for", ev.events)
                throw("runtime: netpoll: break fd ready for something unexpected")
            }
            if delay != 0 {
                // netpollBreak could be picked up by a
                // nonblocking poll. Only read the byte
                // if blocking.
                var tmp [16]byte
                read(int32(netpollBreakRd), noescape(unsafe.Pointer(&tmp[0])), int32(len(tmp)))
                atomic.Store(&netpollWakeSig, 0)
            }
            continue
        }

        var mode int32
        //是否有就绪的读写事件，放入mode标志位
        if ev.events&(_EPOLLIN|_EPOLLRDHUP|_EPOLLHUP|_EPOLLERR) != 0 {
            mode += 'r'
        }
        if ev.events&(_EPOLLOUT|_EPOLLHUP|_EPOLLERR) != 0 {
            mode += 'w'
        }
        if mode != 0 {
            //取出存入的pollDesc的指针
            pd := *(**pollDesc)(unsafe.Pointer(&ev.data))
            pd.everr = false
            if ev.events == _EPOLLERR {
                pd.everr = true
            }
            //s1 具体实现 netpoll.go
            //取出pd中的rg或wg，后面放到运行队列
            netpollready(&toRun, pd, mode)
        }
    }
    return toRun
}

// netpollBreak interrupts an epollwait.
//唤醒网络轮询器，例如：计时器向前修改时间时会通过该函数中断网络轮询器
func netpollBreak() {
    if atomic.Cas(&netpollWakeSig, 0, 1) {
        for {
            var b byte
            n := write(netpollBreakWr, unsafe.Pointer(&b), 1)
            if n == 1 {
                break
            }
            if n == -_EINTR {
                continue
            }
            if n == -_EAGAIN {
                return
            }
            println("runtime: netpollBreak write failed with", -n)
            throw("runtime: netpollBreak write failed")
        }
    }
}

//go:nowritebarrier
//将就绪好得io事件，写入就绪的goroutine对列
func netpollready(toRun *gList, pd *pollDesc, mode int32) {
    var rg, wg *g
    if mode == 'r' || mode == 'r'+'w' {
        rg = netpollunblock(pd, 'r', true)
    }
    if mode == 'w' || mode == 'r'+'w' {
        wg = netpollunblock(pd, 'w', true)
    }
    //将阻塞的goroutine加入gList返回
    if rg != nil {
        toRun.push(rg)
    }
    if wg != nil {
        toRun.push(wg)
    }
}

func netpollblockcommit(gp *g, gpp unsafe.Pointer) bool {
    
  //把当前g的指针存为gpp指针，gpp为pd的rg或wg
    r := atomic.Casuintptr((*uintptr)(gpp), pdWait, uintptr(unsafe.Pointer(gp)))
    if r {
        // Bump the count of goroutines waiting for the poller.
        // The scheduler uses this to decide whether to block
        // waiting for the poller if there is nothing else to do.
        //将全局变量改为1，代表系统有netpoll的等待者
        //关键：此时accept被阻塞，系统会在这个监听的socket fd时间发生变换时(新连接),将park住的goroutine给ready
        atomic.Xadd(&netpollWaiters, 1)
    }
    return r
}

// 关闭  当发生某些情况，如连接断开，fd销毁等，会调用到此处
func poll_runtime_pollClose(pd *pollDesc) {
    if !pd.closing {
        throw("runtime: close polldesc w/o unblock")
    }
    wg := atomic.Loaduintptr(&pd.wg)
    if wg != 0 && wg != pdReady {
        throw("runtime: blocked write on closing polldesc")
    }
    rg := atomic.Loaduintptr(&pd.rg)
    if rg != 0 && rg != pdReady {
        throw("runtime: blocked read on closing polldesc")
    }
    
    //调用epoll_ctl系统调用，删除该fd在eventpoll上对应的epitem
    netpollclose(pd.fd)
    //释放对应的pd 
    pollcache.free(pd)
}

//释放内存 对应的pd
func (c *pollCache) free(pd *pollDesc) {
    lock(&c.lock)
    pd.link = c.first
    c.first = pd
    unlock(&c.lock)
}
```

最后关联 协程 go：

proc.go main方法 最后

//s1 关键方法与Epoll网络模型关联 让出当前协程执行权，一般是返回到g0让g0重新调度

gopark(nil, nil, waitReasonPanicWait, traceEvGoStop, 1)

并且在 netepoll 轮询 的时候

```plain
//轮询时调用的方法，如果io就绪了返回ok，如果没就绪，返回flase
func netpollblock(pd *pollDesc, mode int32, waitio bool) bool {
    gpp := &pd.rg
    if mode == 'w' {
        gpp = &pd.wg
    }

    // set the gpp semaphore to pdWait
    for {
        // Consume notification if already ready.
        if atomic.Casuintptr(gpp, pdReady, 0) {
            return true
        }
        if atomic.Casuintptr(gpp, 0, pdWait) {
            break
        }

        // Double check that this isn't corrupt; otherwise we'd loop
        // forever.
        if v := atomic.Loaduintptr(gpp); v != pdReady && v != 0 {
            throw("runtime: double wait")
        }
    }

    // need to recheck error states after setting gpp to pdWait
    // this is necessary because runtime_pollUnblock/runtime_pollSetDeadline/deadlineimpl
    // do the opposite: store to closing/rd/wd, membarrier, load of rg/wg
    if waitio || netpollcheckerr(pd, mode) == 0 {
        //s1 gopark是很重要得一个方法，本质上是让出当前协程执行权，一般是返回到g0 让g0重新调度
        //proc.go 的main() 最终调用此
        gopark(netpollblockcommit, unsafe.Pointer(gpp), waitReasonIOWait, traceEvGoBlockNet, 5)
    }
    // be careful to not lose concurrent pdReady notification
    old := atomic.Xchguintptr(gpp, 0)
    if old > pdWait {
        throw("runtime: corrupted polldesc")
    }
    return old == pdReady
}
```

golang高并发 + 网络通信高性能全部串联起来

总结 GoLang 网络通信：

1.网络通信 通过多协程+Epoll事件驱动的网络模型

2.简单，高效应用 ，内置规范

3.服务端 和 客户端如何关联交互

4.网络模型 Conn > netFD > pollDesc (rg /wg) > epoll (epollcreate epollctl epollwait)

5.详细 init > open > netPoll (wait > broke / break > read > commit ) > gopark 调度G > close > free

6. golang协程MPG调度 跟这里的网络通信的G的调度 gopark 调度G

7.定制化 自己封装的使用

能看到这说明你确实“够浪”，[我就给你](https://www.yuque.com/tianming-aroh0/sagnbd)再留给彩蛋吧。上述进阶并发和网路通信的笔记的

[https://www.bilibili.com/video/BV1Fg411q7s3/?spm_id_from=333.1387.upload.video_card.click&vd_source=04d13f3e51316f05440d2eb2411de9f3](https://www.bilibili.com/video/BV1Fg411q7s3/?spm_id_from=333.1387.upload.video_card.click&vd_source=04d13f3e51316f05440d2eb2411de9f3)

是我已发布在B站（够浪编程），还有更多架构从应用到原理和项目实战的内容。以及云原生二次开发

tips:如果不是要往go这块转或者云原生定制化，到此面个试基本就够吊打面试官了
