---
title: Gin 示例 part02 要点
sidebarGroup: Golang
shortTitle: 03 part02
order: 3
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: TestGin/part02 源码整理
---

> **Golang · 第 3 篇**
>
> 源码：`TestGin/part02`

---

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


