---
title: "Gin 示例 part14 要点"
sidebarGroup: "Golang"
shortTitle: "15 part14"
order: 15
date: 2026-08-13
category: "云原生"
tag:
  - "Golang"
  - "云原生"
  - "课程笔记"
description: "TestGin/part14 源码整理"
---

> **Golang · 第 15 篇**
>
> 源码：`TestGin/part14`

---

## 说明

从课程 Gin 示例 `TestGin/part14` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
//定义结构体：
type User struct {
	Age int
	Name string
}
type UserInfo struct {
	Age int
	Name string
}
type DBUserInfo struct {
	Age int
	Name string
}
type MyUser struct {
	Age int
	Name string
}

func (MyUser) TableName() string{
	return "test_my_user"
}

type MyUser2 struct {
	//增加一个匿名字段：
	gorm.Model
	Age int
	Name string
}


type Student struct {
	StuID int `gorm:"primary_key;AUTO_INCREMENT"`
	Name string `gorm:"not null"`
	Age int `gorm:"unique_index"`
	Email string `gorm:"unique"`
	Sex string `gorm:"column:gender;size:10"`
	Desc string `gorm:"-"`
	Classno string `gorm:"type:int"`
}

func main(){
	//连接数据库：
	//Open传入两个参数：
	//第一个参数：指定你要连接的数据库
	//第二个参数：指的是数据库的设置信息：用户名:密码@tcp(ip:port)/数据库名字?charset=utf8&parseTime=True&loc=Local
	//charset=utf8设置字符集
	//parseTime=True为了处理time.Time
	//loc=Local 时区设置，与本地时区保持一致
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//创建表：通常情况下，数据库中新建的标的名字是结构体名字的复数形式，例如结构体User，表名 users
	//db.CreateTable(&User{})
	//db.CreateTable(&UserInfo{})
	//db.CreateTable(&DBUserInfo{})
	//db.CreateTable(&MyUser{})
	//db.CreateTable(&MyUser2{})
	db.CreateTable(&Student{})

	//Table方法可以指定你要创建的数据库的表名
	//db.Table("user").CreateTable(&User{})


	//删除表：
	//db.DropTable(&User{}) //通过&User{}来删除users表
	//db.DropTable("user") //通过"user"删除user表

	//判断表是否存在：
	//flag1 := db.HasTable(&User{})//判断是否有users表
	//fmt.Println(flag1)
	//
	//flag2 := db.HasTable("user")//判断是否有user表
	//fmt.Println(flag2)

	//增删改查：
	//增加数据：
	//db.Create(&User{Age:18,Name:"丽丽"})

	//查询数据：第一个参数：查询出来的数据的载体：
	//var myuser User
	//db.First(&myuser,"age = ?",18)
	//fmt.Println(myuser)

	//更新数据：
	//需要做的：先查询，再更新
	//db.Model(&myuser).Update("age",30)
	//db.Model(&myuser).Update("name","菲菲")

	//删除数据：
	//需要做的：先查询，再删除
	//db.Delete(&myuser)
}
```


