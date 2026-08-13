---
title: Gin 示例 part01 要点
sidebarGroup: Golang
shortTitle: 02 part01
order: 2
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: TestGin/part01 源码整理
---

> **Golang · 第 2 篇**
>
> 源码：`TestGin/part01`

---

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


