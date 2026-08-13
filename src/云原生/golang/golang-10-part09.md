---
title: "Gin 示例 part09 要点"
sidebarGroup: "Golang"
shortTitle: "10 part09"
order: 10
date: 2026-08-13
category: "云原生"
tag:
  - "Golang"
  - "云原生"
  - "课程笔记"
description: "TestGin/part09 源码整理"
---

> **Golang · 第 10 篇**
>
> 源码：`TestGin/part09`

---

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


