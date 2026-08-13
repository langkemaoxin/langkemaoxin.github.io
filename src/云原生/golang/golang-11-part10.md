---
title: "Gin 示例 part10 要点"
sidebarGroup: "Golang"
shortTitle: "11 part10"
order: 11
date: 2026-08-13
category: "云原生"
tag:
  - "Golang"
  - "云原生"
  - "课程笔记"
description: "TestGin/part10 源码整理"
---

> **Golang · 第 11 篇**
>
> 源码：`TestGin/part10`

---

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


