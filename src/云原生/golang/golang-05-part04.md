---
title: "Gin 示例 part04 要点"
sidebarGroup: "Golang"
shortTitle: "05 part04"
order: 5
date: 2026-08-13
category: "云原生"
tag:
  - "Golang"
  - "云原生"
  - "课程笔记"
description: "TestGin/part04 源码整理"
---

> **Golang · 第 5 篇**
>
> 源码：`TestGin/part04`

---

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


