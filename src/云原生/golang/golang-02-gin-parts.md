---
title: Gin 示例 part01～part16 合集
sidebarGroup: Golang
shortTitle: 02 Gin 示例合集
order: 2
date: 2026-08-13
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: Gin 示例 part01～part16 合集
---

> **Golang · 02 Gin 示例合集**
>
> 由示例工程笔记合并。

---

## Gin 示例 part01 要点

## 说明

从课程 Gin 示例 `TestGin/part01` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part01/myfunc"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	//加载html文件：
	r.LoadHTMLGlob("part01/templates/**/*")
	//指定静态文件：css文件
	r.Static("/s","part01/static")
	//写路由：
	r.GET("/demo",myfunc.Hello)

	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import "github.com/gin-gonic/gin"

func Hello(context *gin.Context){
	context.HTML(200,"demo01/hello.html",nil)
}
```

## Gin 示例 part02 要点

## 说明

从课程 Gin 示例 `TestGin/part02` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part02/myfunc"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	//写路由：
	//路由规则中要求你传入id的参数，那么就必须你在访问的时候必须传入参数值
	r.GET("/demo/:id",myfunc.Hello1)
	//如果利用*占位符，路径是否带参数值就不重要了
	r.GET("/demo2/*id",myfunc.Hello2)
	//如果路径中以键值对形式传入参数的话，在路由规则中就不用做文章了，不用进行任何操作
	r.GET("/demo3",myfunc.Hello3)
	r.GET("/demo4",myfunc.Hello4)
	r.GET("/demo5",myfunc.Hello5)
	r.GET("/demo6",myfunc.Hello6)
	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import "github.com/gin-gonic/gin"

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	id := context.Param("id")
	context.String(200,"获取路径上拼接的参数值,%s",id)
}
func Hello2(context *gin.Context){
	//获取路径中的参数值：
	id := context.Param("id")
	context.String(200,"获取路径上拼接的参数值,%s",id)
}
func Hello3(context *gin.Context){
	//获取路径中的参数值：通过key获取对应的value
	id := context.Query("id")
	name := context.Query("name")
	context.String(200,"获取路径上拼接的参数值,%s,%s",id,name)
}

func Hello4(context *gin.Context){
	//获取路径中的参数值：通过key获取对应的value
	id := context.DefaultQuery("id","123")
	name := context.DefaultQuery("name","丽丽")
	context.String(200,"获取路径上拼接的参数值,%s,%s",id,name)
}

func Hello5(context *gin.Context){
	//获取路径中的参数值：通过key获取对应的value的多个参数：
	idvalues := context.QueryArray("id")
	context.String(200,"获取路径上拼接的参数值,%s",idvalues)
}
func Hello6(context *gin.Context){
	//获取路径中的参数值：通过key获取对应的value的多个参数：
	user_map := context.QueryMap("user")
	context.String(200,"获取路径上拼接的参数值,%s",user_map)
}
```

## Gin 示例 part03 要点

## 说明

从课程 Gin 示例 `TestGin/part03` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part03/myfunc"
	"github.com/gin-gonic/gin"

)

func main() {
	r := gin.Default()
	//写路由：
	//加载html页面：
	r.LoadHTMLGlob("part03/templates/**/*")
	//定义路由：
	r.GET("/userindex",myfunc.Hello1)
	r.POST("/getUserInfo",myfunc.Hello2)
	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"time"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

func Hello2(context *gin.Context){
	time.Sleep(time.Second * 10)
	//获取post请求的参数：
	//PostForm方法：作用：通过key得到value数据
	uname := context.PostForm("username")
	pwd := context.PostForm("pwd")
	//DefaultPostForm方法:作用：当页面中未定义表单元素进行提交给出默认值，如果页面定义了元素但是提交没有提交数据，那么不会有默认值，会认为是没有提交数据
	age := context.DefaultPostForm("age","18")
	//PostFormArray方法：作用：如果前端value数据过多可以用数组接收：
	lovelang := context.PostFormArray("lovelang")
	//PostFormMap方法:作用：获取map的数据,参数需要注意：传入的是整个map（而不是具体的key）
	usermap := context.PostFormMap("user")
	fmt.Println(uname)
	fmt.Println(pwd)
	fmt.Println(age)
	fmt.Println(lovelang)
	fmt.Println(usermap)
}
```

## Gin 示例 part04 要点

## 说明

从课程 Gin 示例 `TestGin/part04` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part04/myfunc"
	"github.com/gin-gonic/gin"

)

func main() {
	r := gin.Default()
	//写路由：
	//加载html页面：
	r.LoadHTMLGlob("part04/templates/**/*")
	//指定js文件：
	r.Static("/s","part04/static")
	//定义路由：
	r.GET("/userindex",myfunc.Hello1)
	r.POST("/getUserInfo",myfunc.Hello2)
	r.POST("/ajaxpost",myfunc.Hello3)
	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"time"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

func Hello2(context *gin.Context){
	time.Sleep(time.Second * 10)
	//获取post请求的参数：
	//PostForm方法：作用：通过key得到value数据
	uname := context.PostForm("username")
	pwd := context.PostForm("pwd")
	fmt.Println(uname)
	fmt.Println(pwd)
}

//ajax的后端的处理
func Hello3(context *gin.Context){
	//获取post-ajax请求的数据，获取对应的参数：
	uname := context.PostForm("uname")
	fmt.Println(uname)
	fmt.Println(uname == "丽丽")
	//如果获取的数据和"丽丽"一样，那么就在前端响应-用户名录入重复：
	if uname == "丽丽" {
		//向浏览器返回数据，返回json格式数据：
		//mapdata := map[string]interface{}{
		//	"msg" : "用户名重复了！",
		//}
		//context.JSON(200,mapdata)

		context.JSON(200,gin.H{
			"msg" : "用户名重复了！",
		})
	}else {
		context.JSON(200,gin.H{
			"msg" : "",
		})
	}
}
```

## Gin 示例 part05 要点

## 说明

从课程 Gin 示例 `TestGin/part05` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part05/myfunc"
	"github.com/gin-gonic/gin"

)

func main() {
	r := gin.Default()
	//写路由：
	//加载html页面：
	r.LoadHTMLGlob("part05/templates/**/*")
	//定义路由：
	r.GET("/userindex",myfunc.Hello1)
	r.POST("/savefile",myfunc.Hello3)
	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"strconv"
	"time"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

func Hello2(context *gin.Context){
	//获取前端传入的文件：
	file,_ := context.FormFile("myfile")
	fmt.Println(file.Filename)

	//加入一个时间戳：
	time_int := time.Now().Unix()
	time_str := strconv.FormatInt(time_int,10) //10:十进制
	//保存在我的本地：
	context.SaveUploadedFile(file,"e://" + time_str + file.Filename)

	//响应一个字符串：
	context.String(200,"文件上传成功")

}

func Hello3(context *gin.Context){
	//先获取form表单
	form,_ := context.MultipartForm()
	//在form表单中获取name相同的文件：
	files := form.File["myfile"]  //File是个Map，通过key获取value部分

	//files就是name相同的多个文件：挨个处理---遍历处理：
	for _,file := range files{
		//加入一个时间戳：
		time_int := time.Now().Unix()
		time_str := strconv.FormatInt(time_int,10) //10:十进制
		//保存在我的本地：
		context.SaveUploadedFile(file,"e://" + time_str + file.Filename)
	}

	//响应一个字符串：
	context.String(200,"文件上传成功")

}
```

## Gin 示例 part06 要点

## 说明

从课程 Gin 示例 `TestGin/part06` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part06/myfunc"
	"github.com/gin-gonic/gin"

)

func main() {
	r := gin.Default()
	//写路由：
	//加载html页面：
	r.LoadHTMLGlob("part06/templates/**/*")
	//指定js文件：
	r.Static("/s","part06/static")
	//定义路由：
	r.GET("/userindex",myfunc.Hello1)
	r.POST("/savefile",myfunc.Hello4)
	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"strconv"
	"time"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

func Hello2(context *gin.Context){
	//获取前端传入的文件：
	file,_ := context.FormFile("myfile")
	fmt.Println(file.Filename)

	//加入一个时间戳：
	time_int := time.Now().Unix()
	time_str := strconv.FormatInt(time_int,10) //10:十进制
	//保存在我的本地：
	context.SaveUploadedFile(file,"e://" + time_str + file.Filename)

	//响应一个字符串：
	context.String(200,"文件上传成功")

}

func Hello4(context *gin.Context){
	//获取前端传入的文件：
	file,_ := context.FormFile("file")
	fmt.Println(file.Filename)

	//加入一个时间戳：
	time_int := time.Now().Unix()
	time_str := strconv.FormatInt(time_int,10) //10:十进制
	//保存在我的本地：
	context.SaveUploadedFile(file,"e://" + time_str + file.Filename)

	//响应一个字符串：
	context.String(200,"文件上传成功")

}

func Hello3(context *gin.Context){
	//先获取form表单
	form,_ := context.MultipartForm()
	//在form表单中获取name相同的文件：
	files := form.File["myfile"]  //File是个Map，通过key获取value部分

	//files就是name相同的多个文件：挨个处理---遍历处理：
	for _,file := range files{
		//加入一个时间戳：
		time_int := time.Now().Unix()
		time_str := strconv.FormatInt(time_int,10) //10:十进制
		//保存在我的本地：
		context.SaveUploadedFile(file,"e://" + time_str + file.Filename)
	}

	//响应一个字符串：
	context.String(200,"文件上传成功")

}
```

## Gin 示例 part07 要点

## 说明

从课程 Gin 示例 `TestGin/part07` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part07/myfunc"
	"github.com/gin-gonic/gin"

)

func main() {
	r := gin.Default()
	//写路由：
	//加载html页面：
	r.LoadHTMLGlob("part07/templates/**/*")
	//指定js文件：
	r.Static("/s","part06/static")
	//定义路由：
	r.GET("/userindex",myfunc.Hello1)
	r.POST("/savefile",myfunc.Hello2)
	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import (
	"github.com/gin-gonic/gin"
	"strconv"
	"time"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

func Hello2(context *gin.Context){
	//先获取form表单
	form,_ := context.MultipartForm()
	//在form表单中获取name相同的文件：
	files := form.File["myfile"]  //File是个Map，通过key获取value部分

	//files就是name相同的多个文件：挨个处理---遍历处理：
	for _,file := range files{
		//加入一个时间戳：
		time_int := time.Now().Unix()
		time_str := strconv.FormatInt(time_int,10) //10:十进制
		//保存在我的本地：
		context.SaveUploadedFile(file,"e://" + time_str + file.Filename)
	}

	//响应一个json....：
	//....

}
```

## Gin 示例 part08 要点

## 说明

从课程 Gin 示例 `TestGin/part08` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part08/myfunc"
	"github.com/gin-gonic/gin"

)

func main() {
	r := gin.Default()
	//写路由：
	//定义路由：
	r.GET("/red1",myfunc.Red1)
	r.GET("/red2",myfunc.Red2)
	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
)

func Red1(context *gin.Context){
	fmt.Println("这是Red1")
	//发送一个重定向的请求：
	context.Redirect(http.StatusFound,"/red2")
}

func Red2(context *gin.Context){
	fmt.Println("这是Red2")
	//在浏览器响应字符串：
	context.String(http.StatusOK,"重定向成功-这里是Red2")
}
```

## Gin 示例 part09 要点

## 说明

从课程 Gin 示例 `TestGin/part09` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part09/myfunc"
	"github.com/gin-gonic/gin"
	"html/template"
)

func main() {
	r := gin.Default()
	//注册函数：FuncMap是html/FuncMap
	r.SetFuncMap(template.FuncMap{
		//键值对的作用：key指定前端调用的名字，value指定的是后端对应的函数
		"add" : myfunc.Add,
	})
	//写路由：
	//加载html页面：
	r.LoadHTMLGlob("part09/templates/**/*")
	//定义路由：
	r.GET("/userindex",myfunc.Hello1)
	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import (
	"github.com/gin-gonic/gin"
	"time"
)
type Student struct {
	Age int
	Name string
}
func Hello1(context *gin.Context){
	//定义数据：
	age := 19
	arr := []int{33,66,99}
	flag := true
	username := "丽丽"
	//创建结构体实例：
	stu := Student{
		Age : 18,
		Name : "丽丽",
	}
	now_time := time.Now()
	//将age 和arr放入map中：
	map_data := map[string]interface{}{
		"age" : age,
		"arr" : arr,
		"flag" : flag,
		"username" : username,
		"stu" : stu,
		"now_time" : now_time,
	}
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",map_data)
}

//定义一个函数：
func Add(num1 int,num2 int) int{
	return num1+num2
}
```

## Gin 示例 part10 要点

## 说明

从课程 Gin 示例 `TestGin/part10` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part10/myfunc"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	//加载html页面：
	r.LoadHTMLGlob("part10/templates/**/*")
	//指定文件：
	r.Static("/s","part10/static")
	//定义路由：
	r.GET("/userindex",myfunc.Hello1)
	r.GET("/toFormBind",myfunc.Hello2)
	r.GET("/userindex2",myfunc.Hello3)

	r.GET("/userindex3",myfunc.Hello4)
	r.POST("/toajax",myfunc.Hello5)

	r.GET("/userindex4/:uname/:age",myfunc.Hello6)
	r.GET("/userindex4/丽丽/18",myfunc.Hello1)

	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

//定义结构体：
type User struct {
	//加入标签：绑定的时候需要指定将form表单中的username绑定到Username上
	Uername string `form:"username"`
	//加入标签：绑定的时候需要指定将form表单中的pwd绑定到Pwd上
	Pwd string `form:"pwd"`
}
func Hello2(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.Bind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}

func Hello3(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}

func Hello4(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello3.html",nil)
}
type User2 struct {
	Uname string `json:"uname" uri:"uname" form:"uname"`
	Age int `json:"age" uri:"age" form:"age"`
}
func Hello5(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.JSON(404,gin.H{
			"msg" : "绑定失败",
		})
	}else{
		context.JSON(200,gin.H{

			"msg" : "绑定成功",
		})
	}
}

func Hello6(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBindUri(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}
```

## Gin 示例 part11 要点

## 说明

从课程 Gin 示例 `TestGin/part11` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part11/myfunc"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	//加载html页面：
	r.LoadHTMLGlob("part11/templates/**/*")
	//指定文件：
	r.Static("/s","part11/static")

	//按照版本号对路由进行分组：
	v1 := r.Group("/version01")

	{
		v1.GET("/userindex",myfunc.Hello1)
		v1.GET("/toFormBind",myfunc.Hello2)
		v1.GET("/userindex2",myfunc.Hello3)
	}

	v2 := r.Group("/version02")

	{
		v2.GET("/userindex3",myfunc.Hello4)
		v2.POST("/toajax",myfunc.Hello5)
		v2.GET("/userindex4/:uname/:age",myfunc.Hello6)
		v2.GET("/userindex4/丽丽/18",myfunc.Hello1)
	}
	r.Run()
}
```

### `myfunc\user.go`

```go
package myfunc

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

//定义结构体：
type User struct {
	//加入标签：绑定的时候需要指定将form表单中的username绑定到Username上
	Uername string `form:"username"`
	//加入标签：绑定的时候需要指定将form表单中的pwd绑定到Pwd上
	Pwd string `form:"pwd"`
}
func Hello2(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.Bind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}

func Hello3(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}

func Hello4(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello3.html",nil)
}
type User2 struct {
	Uname string `json:"uname" uri:"uname" form:"uname"`
	Age int `json:"age" uri:"age" form:"age"`
}
func Hello5(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.JSON(404,gin.H{
			"msg" : "绑定失败",
		})
	}else{
		context.JSON(200,gin.H{

			"msg" : "绑定成功",
		})
	}
}

func Hello6(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBindUri(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}
```

## Gin 示例 part12 要点

## 说明

从课程 Gin 示例 `TestGin/part12` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part12/router"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	//加载html页面：
	r.LoadHTMLGlob("part12/templates/**/*")
	//指定文件：
	r.Static("/s","part12/static")

	//指定总路由：
	router.Router(r)
	r.Run()
}
```

### `bill\bill.go`

```go
package bill

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

//定义结构体：
type User struct {
	//加入标签：绑定的时候需要指定将form表单中的username绑定到Username上
	Uername string `form:"username"`
	//加入标签：绑定的时候需要指定将form表单中的pwd绑定到Pwd上
	Pwd string `form:"pwd"`
}
func Hello2(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.Bind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}

func Hello3(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}
```

### `bill\router.go`

```go
package bill

import "github.com/gin-gonic/gin"

func Router(r *gin.RouterGroup){
	r.GET("/userindex",Hello1)
	r.GET("/toFormBind",Hello2)
	r.GET("/userindex2",Hello3)
}
```

### `external\external.go`

```go
package external

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func Hello4(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello3.html",nil)
}
type User2 struct {
	Uname string `json:"uname" uri:"uname" form:"uname"`
	Age int `json:"age" uri:"age" form:"age"`
}
func Hello5(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.JSON(404,gin.H{
			"msg" : "绑定失败",
		})
	}else{
		context.JSON(200,gin.H{

			"msg" : "绑定成功",
		})
	}
}

func Hello6(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBindUri(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}
```

### `external\router.go`

```go
package external

import (
	"TestGin/part12/bill"
	"TestGin/part13/middleware"
	"github.com/gin-gonic/gin"
)

func Router(r *gin.RouterGroup){

	r.GET("/userindex3",middleware.MiddleWare01,Hello4)
	r.POST("/toajax",Hello5)
	r.GET("/userindex4/:uname/:age",Hello6)
	r.GET("/userindex4/丽丽/18",bill.Hello1)
}
```

### `router\router.go`

```go
package router

import (
	"TestGin/part12/bill"
	"TestGin/part12/external"
	"github.com/gin-gonic/gin"
)

func Router(r *gin.Engine){
	b := r.Group("/bill") //支票模块的分组
	e := r.Group("/external") //第三方工具的分组

	//模块分组：
	bill.Router(b)
	external.Router(e)
}
```

## Gin 示例 part13 要点

## 说明

从课程 Gin 示例 `TestGin/part13` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part13/router"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	//加载html页面：
	r.LoadHTMLGlob("part13/templates/**/*")
	//指定文件：
	r.Static("/s","part13/static")

	//使用中间件：
	//r.Use(middleware.MiddleWare01)
	//方式2中参数中需要对函数进行调用
	//r.Use(middleware.MiddleWare03())
	//r.Use(middleware.MiddleWare02())

	//指定总路由：
	router.Router(r)

	r.Run()
}
```

### `bill\bill.go`

```go
package bill

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

//定义结构体：
type User struct {
	//加入标签：绑定的时候需要指定将form表单中的username绑定到Username上
	Uername string `form:"username"`
	//加入标签：绑定的时候需要指定将form表单中的pwd绑定到Pwd上
	Pwd string `form:"pwd"`
}
func Hello2(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.Bind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}

func Hello3(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}
```

### `bill\router.go`

```go
package bill

import (
	"github.com/gin-gonic/gin"
)

func Router(r *gin.RouterGroup){
	r.GET("/userindex",Hello1)
	r.GET("/toFormBind",Hello2)
	r.GET("/userindex2",Hello3)
}
```

### `external\external.go`

```go
package external

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func Hello4(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello3.html",nil)
}
type User2 struct {
	Uname string `json:"uname" uri:"uname" form:"uname"`
	Age int `json:"age" uri:"age" form:"age"`
}
func Hello5(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.JSON(404,gin.H{
			"msg" : "绑定失败",
		})
	}else{
		context.JSON(200,gin.H{

			"msg" : "绑定成功",
		})
	}
}

func Hello6(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBindUri(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}
```

### `external\router.go`

```go
package external

import (
	"TestGin/part12/bill"
	"TestGin/part13/middleware"
	"github.com/gin-gonic/gin"
)

func Router(r *gin.RouterGroup){

	r.GET("/userindex3",middleware.MiddleWare01,Hello4)
	r.POST("/toajax",Hello5)
	r.GET("/userindex4/:uname/:age",Hello6)
	r.GET("/userindex4/丽丽/18",bill.Hello1)
}
```

### `middleware\mw.go`

```go
package middleware

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func MiddleWare01(context *gin.Context){
	fmt.Println("这是自定义的中间件1-开始")
	//context.Next()
	fmt.Println("这是自定义的中间件1-结束")
}

//gin.HandlerFunc 等价于  func(*Context)函数
//所以MiddleWare02就必须有个返回值，并且返回值是一个函数
func MiddleWare02() gin.HandlerFunc{
	return func(context *gin.Context){
		fmt.Println("这是自定义的中间件2-开始")
		fmt.Println("这是自定义的中间件2-结束")
	}
}

func MiddleWare03() gin.HandlerFunc{
	return func(context *gin.Context){
		fmt.Println("这是自定义的中间件3-开始")
		if 4 > 2 { //满足条件
			//终止链条：
			//context.Abort()
			return
		}
		context.Next()
		fmt.Println("这是自定义的中间件3-结束")
	}
}
```

### `router\router.go`

```go
package router

import (
	"TestGin/part12/bill"
	"TestGin/part12/external"
	"github.com/gin-gonic/gin"
)

func Router(r *gin.Engine){
	b := r.Group("/bill") //支票模块的分组
	//b.Use(middleware.MiddleWare02())
	e := r.Group("/external") //第三方工具的分组

	//模块分组：
	bill.Router(b)
	external.Router(e)
}
```

## Gin 示例 part14 要点

## 说明

从课程 Gin 示例 `TestGin/part14` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
//定义结构体：
type User struct {
	Age int
	Name string
}
type UserInfo struct {
	Age int
	Name string
}
type DBUserInfo struct {
	Age int
	Name string
}
type MyUser struct {
	Age int
	Name string
}

func (MyUser) TableName() string{
	return "test_my_user"
}

type MyUser2 struct {
	//增加一个匿名字段：
	gorm.Model
	Age int
	Name string
}

type Student struct {
	StuID int `gorm:"primary_key;AUTO_INCREMENT"`
	Name string `gorm:"not null"`
	Age int `gorm:"unique_index"`
	Email string `gorm:"unique"`
	Sex string `gorm:"column:gender;size:10"`
	Desc string `gorm:"-"`
	Classno string `gorm:"type:int"`
}

func main(){
	//连接数据库：
	//Open传入两个参数：
	//第一个参数：指定你要连接的数据库
	//第二个参数：指的是数据库的设置信息：用户名:密码@tcp(ip:port)/数据库名字?charset=utf8&parseTime=True&loc=Local
	//charset=utf8设置字符集
	//parseTime=True为了处理time.Time
	//loc=Local 时区设置，与本地时区保持一致
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//创建表：通常情况下，数据库中新建的标的名字是结构体名字的复数形式，例如结构体User，表名 users
	//db.CreateTable(&User{})
	//db.CreateTable(&UserInfo{})
	//db.CreateTable(&DBUserInfo{})
	//db.CreateTable(&MyUser{})
	//db.CreateTable(&MyUser2{})
	db.CreateTable(&Student{})

	//Table方法可以指定你要创建的数据库的表名
	//db.Table("user").CreateTable(&User{})

	//删除表：
	//db.DropTable(&User{}) //通过&User{}来删除users表
	//db.DropTable("user") //通过"user"删除user表

	//判断表是否存在：
	//flag1 := db.HasTable(&User{})//判断是否有users表
	//fmt.Println(flag1)
	//
	//flag2 := db.HasTable("user")//判断是否有user表
	//fmt.Println(flag2)

	//增删改查：
	//增加数据：
	//db.Create(&User{Age:18,Name:"丽丽"})

	//查询数据：第一个参数：查询出来的数据的载体：
	//var myuser User
	//db.First(&myuser,"age = ?",18)
	//fmt.Println(myuser)

	//更新数据：
	//需要做的：先查询，再更新
	//db.Model(&myuser).Update("age",30)
	//db.Model(&myuser).Update("name","菲菲")

	//删除数据：
	//需要做的：先查询，再删除
	//db.Delete(&myuser)
}
```

## Gin 示例 part15 要点

## 说明

从课程 Gin 示例 `TestGin/part15` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)

func main(){
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//创建表：通常情况下，数据库中新建的标的名字是结构体名字的复数形式，例如结构体User，表名 users
	db.CreateTable(&demostruct.User{})
	db.CreateTable(&demostruct.UserInfo{})

	//db.CreateTable(&demostruct.Author{})
	//db.CreateTable(&demostruct.Article{})

	//db.CreateTable(&demostruct.Student{})
	//db.CreateTable(&demostruct.Course{})

}
```

### `demostruct\manytomany.go`

```go
package demostruct

type Student struct {
	SId int `gorm:"primary_key"`
	SNo int
	Name string
	Sex string
	Age int
	//关联表：
	Course []Course `gorm:"many2many:Student2Course"`
}

type Course struct {
	CId int `gorm:"primary_key"`
	CName string
	TeacherName string
	Room string
}
```

### `demostruct\onetomany.go`

```go
package demostruct

type Author struct {
	AID int `gorm:"primary_key;AUTO_INCREMENT"`
	Name string
	Age int
	Sex string
	//关联关系：
	Article []Article `gorm:"ForeignKey:AuId;AssociationForeignKey:AID"`
}

type Article struct {
	ArId int `gorm:"primary_key;AUTO_INCREMENT"`
	Title string
	Content string
	Desc string
	//设置外键：
	AuId int
}
```

### `demostruct\onetoone.go`

```go
package demostruct

type User struct{
	UserId int `gorm:"primary_key;AUTO_INCREMENT"`
	Age int
	Name string
	//指定外键：
	IID int
}

type UserInfo struct {
	InfoID int `gorm:"primary_key;AUTO_INCREMENT"`
	Pic string
	Address string
	Email string
	//关联关系
	User User `gorm:"ForeignKey:IID;AssociationForeignKey:InfoID"`
}
```

### `operate\ope01.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
func main() {
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//创建表：通常情况下，数据库中新建的标的名字是结构体名字的复数形式，例如结构体User，表名 users
	//db.CreateTable(&demostruct.User{})
	//db.CreateTable(&demostruct.UserInfo{})

	//关联添加数据：
	userinfo := demostruct.UserInfo{
		Pic:     "/upload/1.jpg",
		Address: "北京海淀区",
		Email:   "124234@126.com",
		User:    demostruct.User{
			Age : 19,
			Name : "丽丽",
		},
	}

	db.Create(&userinfo)

	//关联查询操作：（关联关系在UserInfo表中，所以从UserInfo入手）
	//var userinfo demostruct.UserInfo
	////如果只是执行下面这步操作，那么关联的User信息是查询不到的：
	//db.Debug().First(&userinfo,"info_id = ?",1)
	////fmt.Println(userinfo)//{1 /upload/1.jpg 北京海淀区 124234@126.com {0 0  0}}
	//
	////如果想要查询到User相关内容，必须执行如下操作：
	////Model参数：要查询的表数据，Association参数：关联到的具体的模型：模型名字User（字段名字）
	////Find参数：查询的数据要放在什么字段中&userinfo.User
	//db.Debug().Model(&userinfo).Association("User").Find(&userinfo.User)
	//fmt.Println(userinfo)//{1 /upload/1.jpg 北京海淀区 124234@126.com {1 19 丽丽 1}}

}
```

### `operate\ope02.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"fmt"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
func main() {
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//创建表：通常情况下，数据库中新建的标的名字是结构体名字的复数形式，例如结构体User，表名 users
	db.CreateTable(&demostruct.User{})
	db.CreateTable(&demostruct.UserInfo{})

	//关联添加数据：
	//userinfo := demostruct.UserInfo{
	//	Pic:     "/upload/1.jpg",
	//	Address: "北京海淀区",
	//	Email:   "124234@126.com",
	//	User:    demostruct.User{
	//		Age : 19,
	//		Name : "丽丽",
	//	},
	//}
	//
	//db.Create(&userinfo)

	//关联查询操作：（关联关系在UserInfo表中，所以从UserInfo入手）
	var userinfo demostruct.UserInfo
	db.Debug().Preload("User").Find(&userinfo,"info_id = ?",1)
	fmt.Println(userinfo)

}
```

### `operate\ope03.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"fmt"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
func main() {
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//关联查询操作：（关联关系在UserInfo表中，所以从UserInfo入手）
	var userinfo demostruct.UserInfo
	db.First(&userinfo,"info_id = ?",1)
	fmt.Println(userinfo)

	var user demostruct.User
	//通过userinfo模型查出来的User字段的信息放入新的容器user中：
	db.Model(&userinfo).Related(&user,"User")
	fmt.Println(user)
	fmt.Println(userinfo)

}
```

### `operate\ope04.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"fmt"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
func main() {
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//关联更新
	//先查询
	var userinfo demostruct.UserInfo
	db.Preload("User").Find(&userinfo,"info_id = ?",1)
	fmt.Println(userinfo)
	//再更新：注意：Update的参数age可以用结构体中字段Age也可以用数据库age字段
	db.Model(&userinfo.User).Update("age",31)
	fmt.Println(userinfo)
}
```

## Gin 示例 part16 要点

## 说明

从课程 Gin 示例 `TestGin/part16` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	_ "TestGin/part16/dbope"
	_ "TestGin/part16/logs_ope"
	"TestGin/part16/router"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	//加载html页面：
	r.LoadHTMLGlob("part16/templates/**/*")
	//指定文件：
	r.Static("/s","part16/static")

	//指定总路由：
	router.Router(r)

	r.Run()
}
```

### `bill\bill.go`

```go
package bill

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func Hello1(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello.html",nil)
}

//定义结构体：
type User struct {
	//加入标签：绑定的时候需要指定将form表单中的username绑定到Username上
	Uername string `form:"username"`
	//加入标签：绑定的时候需要指定将form表单中的pwd绑定到Pwd上
	Pwd string `form:"pwd"`
}
func Hello2(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.Bind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}

func Hello3(context *gin.Context){
	//定义结构体对象：
	var user User
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}
```

### `bill\router.go`

```go
package bill

import "github.com/gin-gonic/gin"

func Router(r *gin.RouterGroup){
	r.GET("/userindex",Hello1)
	r.GET("/toFormBind",Hello2)
	r.GET("/userindex2",Hello3)
}
```

### `dbope\mysql_connect.go`

```go
package dbope

import (
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
//提取DB，ERR：
var Db *gorm.DB
var Err error
//init函数：初始化操作：
func init() {
	//连接数据库：
	Db,Err = gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if Err != nil {
		panic(Err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//创建表：
	//Db.CreateTable(&models.Student{})

}
```

### `external\external.go`

```go
package external

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func Hello4(context *gin.Context){
	//获取路径中的参数值：
	context.HTML(200,"demo01/hello3.html",nil)
}
type User2 struct {
	Uname string `json:"uname" uri:"uname" form:"uname"`
	Age int `json:"age" uri:"age" form:"age"`
}
func Hello5(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBind(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.JSON(404,gin.H{
			"msg" : "绑定失败",
		})
	}else{
		context.JSON(200,gin.H{

			"msg" : "绑定成功",
		})
	}
}

func Hello6(context *gin.Context){
	//创建结构体示例：
	var user User2
	//数据绑定：
	err := context.ShouldBindUri(&user)
	//打印结构体对象的内容：
	fmt.Println(user)
	if(err != nil ){
		context.String(404,"绑定失败")
	}else{
		context.String(200,"绑定成功")
	}
}
```

### `external\router.go`

```go
package external

import (
	"TestGin/part12/bill"
	"TestGin/part13/middleware"
	"github.com/gin-gonic/gin"
)

func Router(r *gin.RouterGroup){

	r.GET("/userindex3",middleware.MiddleWare01,Hello4)
	r.POST("/toajax",Hello5)
	r.GET("/userindex4/:uname/:age",Hello6)
	r.GET("/userindex4/丽丽/18",bill.Hello1)
}
```

### `logs_ope\log_init.go`

```go
package logs_ope

import (
	"github.com/sirupsen/logrus"
	"os"
)

//初始化记录器一个实例：
var Logrus = logrus.New()

func init(){
	//先读取日志的配置文件：
	log_conf := LoadLogConfig()

	//设置日志的输出文件：
	file,err := os.OpenFile(log_conf.LogDir,os.O_APPEND|os.O_CREATE,0666)

	if err != nil {
		panic(err)
	}

	//将上面打开的file文件设置为  日志的输出文件：
	Logrus.Out = file

	//设置日志的级别：
	//定义一个map，专门存储日志级别：
	log_level_map := map[string]logrus.Level{
		"trace" : logrus.TraceLevel,
		"panic": logrus.PanicLevel,
		"fatal": logrus.FatalLevel,
		"error": logrus.ErrorLevel,
		"warn": logrus.WarnLevel,
		"info": logrus.InfoLevel,
		"debug": logrus.DebugLevel,
	}
	Logrus.SetLevel(log_level_map[log_conf.LogLevel])

	//日志格式化：设置文本格式
	Logrus.SetFormatter(&logrus.TextFormatter{})
}
```

### `logs_ope\log_load_conf.go`

```go
package logs_ope

import (
	"encoding/json"
	"io/ioutil"
	"os"
)

//对应结构体：
type LogConfig struct {
	LogDir string `json:"log_dir"`
	LogLevel string  `json:"log_level"`
}

//读取配置文件：
func LoadLogConfig() *LogConfig{
	log_conf := LogConfig{}

	//打开文件：
	file,err := os.Open("part16/confs/log_config.json")

	if err != nil{//错误处理
		panic(err)
	}
	//资源释放：
	defer file.Close()

	//用流读取文件中内容：
	data,err2  := ioutil.ReadAll(file)

	if err2 != nil {
		panic(err2)
	}
	//Unmarshal将json字符串解码到对应的数据结构中：
	//第一个参数：json字符串，第二个参数：接收json解析的数据结构
	err3 := json.Unmarshal(data,&log_conf)

	if err3 != nil {
		panic(err3)
	}

	return &log_conf
}
```

