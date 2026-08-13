---
title: "Gin 示例 part03 要点"
sidebarGroup: "Golang"
shortTitle: "04 part03"
order: 4
date: 2026-08-13
category: "云原生"
tag:
  - "Golang"
  - "云原生"
  - "课程笔记"
description: "TestGin/part03 源码整理"
---

> **Golang · 第 4 篇**
>
> 源码：`TestGin/part03`

---

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


