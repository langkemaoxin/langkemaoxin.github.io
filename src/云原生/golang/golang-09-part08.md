---
title: Gin 示例 part08 要点
sidebarGroup: Golang
shortTitle: 09 part08
order: 9
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: TestGin/part08 源码整理
---

> **Golang · 第 9 篇**
>
> 源码：`TestGin/part08`

---

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


