---
title: Gin 示例 part15 要点
sidebarGroup: Golang
shortTitle: 16 part15
order: 16
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: TestGin/part15 源码整理
---

> **Golang · 第 16 篇**
>
> 源码：`TestGin/part15`

---

## 说明

从课程 Gin 示例 `TestGin/part15` 提取要点，完整工程请本地运行。

## 源码摘录

### `main.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)

func main(){
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//创建表：通常情况下，数据库中新建的标的名字是结构体名字的复数形式，例如结构体User，表名 users
	db.CreateTable(&demostruct.User{})
	db.CreateTable(&demostruct.UserInfo{})

	//db.CreateTable(&demostruct.Author{})
	//db.CreateTable(&demostruct.Article{})

	//db.CreateTable(&demostruct.Student{})
	//db.CreateTable(&demostruct.Course{})

}
```

### `demostruct\manytomany.go`

```go
package demostruct


type Student struct {
	SId int `gorm:"primary_key"`
	SNo int
	Name string
	Sex string
	Age int
	//关联表：
	Course []Course `gorm:"many2many:Student2Course"`
}

type Course struct {
	CId int `gorm:"primary_key"`
	CName string
	TeacherName string
	Room string
}
```

### `demostruct\onetomany.go`

```go
package demostruct


type Author struct {
	AID int `gorm:"primary_key;AUTO_INCREMENT"`
	Name string
	Age int
	Sex string
	//关联关系：
	Article []Article `gorm:"ForeignKey:AuId;AssociationForeignKey:AID"`
}

type Article struct {
	ArId int `gorm:"primary_key;AUTO_INCREMENT"`
	Title string
	Content string
	Desc string
	//设置外键：
	AuId int
}
```

### `demostruct\onetoone.go`

```go
package demostruct

type User struct{
	UserId int `gorm:"primary_key;AUTO_INCREMENT"`
	Age int
	Name string
	//指定外键：
	IID int
}

type UserInfo struct {
	InfoID int `gorm:"primary_key;AUTO_INCREMENT"`
	Pic string
	Address string
	Email string
	//关联关系
	User User `gorm:"ForeignKey:IID;AssociationForeignKey:InfoID"`
}
```

### `operate\ope01.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
func main() {
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//创建表：通常情况下，数据库中新建的标的名字是结构体名字的复数形式，例如结构体User，表名 users
	//db.CreateTable(&demostruct.User{})
	//db.CreateTable(&demostruct.UserInfo{})

	//关联添加数据：
	userinfo := demostruct.UserInfo{
		Pic:     "/upload/1.jpg",
		Address: "北京海淀区",
		Email:   "124234@126.com",
		User:    demostruct.User{
			Age : 19,
			Name : "丽丽",
		},
	}

	db.Create(&userinfo)

	//关联查询操作：（关联关系在UserInfo表中，所以从UserInfo入手）
	//var userinfo demostruct.UserInfo
	////如果只是执行下面这步操作，那么关联的User信息是查询不到的：
	//db.Debug().First(&userinfo,"info_id = ?",1)
	////fmt.Println(userinfo)//{1 /upload/1.jpg 北京海淀区 124234@126.com {0 0  0}}
	//
	////如果想要查询到User相关内容，必须执行如下操作：
	////Model参数：要查询的表数据，Association参数：关联到的具体的模型：模型名字User（字段名字）
	////Find参数：查询的数据要放在什么字段中&userinfo.User
	//db.Debug().Model(&userinfo).Association("User").Find(&userinfo.User)
	//fmt.Println(userinfo)//{1 /upload/1.jpg 北京海淀区 124234@126.com {1 19 丽丽 1}}

}
```

### `operate\ope02.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"fmt"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
func main() {
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()

	//创建表：通常情况下，数据库中新建的标的名字是结构体名字的复数形式，例如结构体User，表名 users
	db.CreateTable(&demostruct.User{})
	db.CreateTable(&demostruct.UserInfo{})

	//关联添加数据：
	//userinfo := demostruct.UserInfo{
	//	Pic:     "/upload/1.jpg",
	//	Address: "北京海淀区",
	//	Email:   "124234@126.com",
	//	User:    demostruct.User{
	//		Age : 19,
	//		Name : "丽丽",
	//	},
	//}
	//
	//db.Create(&userinfo)

	//关联查询操作：（关联关系在UserInfo表中，所以从UserInfo入手）
	var userinfo demostruct.UserInfo
	db.Debug().Preload("User").Find(&userinfo,"info_id = ?",1)
	fmt.Println(userinfo)


}
```

### `operate\ope03.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"fmt"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
func main() {
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()



	//关联查询操作：（关联关系在UserInfo表中，所以从UserInfo入手）
	var userinfo demostruct.UserInfo
	db.First(&userinfo,"info_id = ?",1)
	fmt.Println(userinfo)

	var user demostruct.User
	//通过userinfo模型查出来的User字段的信息放入新的容器user中：
	db.Model(&userinfo).Related(&user,"User")
	fmt.Println(user)
	fmt.Println(userinfo)

}
```

### `operate\ope04.go`

```go
package main

import (
	"TestGin/part15/demostruct"
	"fmt"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
)
func main() {
	//连接数据库：
	db,err := gorm.Open("mysql","root:root@tcp(localhost:3306)/testgorm?charset=utf8&parseTime=True&loc=Local")

	if err != nil {
		panic(err) //如果出错，后续代码没有必要执行，想让程序中断，panic来执行即可
	}

	//数据库资源释放：
	defer db.Close()



	//关联更新
	//先查询
	var userinfo demostruct.UserInfo
	db.Preload("User").Find(&userinfo,"info_id = ?",1)
	fmt.Println(userinfo)
	//再更新：注意：Update的参数age可以用结构体中字段Age也可以用数据库age字段
	db.Model(&userinfo.User).Update("age",31)
	fmt.Println(userinfo)
}
```


