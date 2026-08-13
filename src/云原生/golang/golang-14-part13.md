---
title: "Gin 示例 part13 要点"
sidebarGroup: "Golang"
shortTitle: "14 part13"
order: 14
date: 2026-08-13
category: "云原生"
tag:
  - "Golang"
  - "云原生"
  - "课程笔记"
description: "TestGin/part13 源码整理"
---

> **Golang · 第 14 篇**
>
> 源码：`TestGin/part13`

---

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


