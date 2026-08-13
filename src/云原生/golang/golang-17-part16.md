---
title: Gin 示例 part16 要点
sidebarGroup: Golang
shortTitle: 17 part16
order: 17
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: TestGin/part16 源码整理
---

> **Golang · 第 17 篇**
>
> 源码：`TestGin/part16`

---

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


