---
title: Gin 示例 part05 要点
sidebarGroup: Golang
shortTitle: 06 part05
order: 6
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: TestGin/part05 源码整理
---

> **Golang · 第 6 篇**
>
> 源码：`TestGin/part05`

---

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


