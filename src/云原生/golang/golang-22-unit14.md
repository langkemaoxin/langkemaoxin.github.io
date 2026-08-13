---
title: Go 基础练习 unit14
sidebarGroup: Golang
shortTitle: 22 unit14
order: 22
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: goproject unit14 练习整理
---

> **Golang · 第 22 篇**
>
> 源码：`goproject/.../testproject01/unit14`

---

## 本单元 Demo 一览

| Demo | 主要文件 |
|------|----------|
| `demo01` | main.go |
| `demo02` | main.go |
| `demo03` | main.go |
| `demo04` | main.go |
| `demo05` | main.go |
| `demo06` | main.go |

## 示例代码

### `demo01\main.go`

```go
package main

import(
	"fmt"
	"reflect"
)

//利用一个函数，函数的参数定义为空接口：
func testReflect(i interface{}){//空接口没有任何方法,所以可以理解为所有类型都实现了空接口，也可以理解为我们可以把任何一个变量赋给空接口。
	//1.调用TypeOf函数，返回reflect.Type类型数据：
	reType := reflect.TypeOf(i)
	fmt.Println("reType:",reType)
	fmt.Printf("reType的具体类型是：%T",reType)
	//2.调用ValueOf函数，返回reflect.Value类型数据：
	reValue :=reflect.ValueOf(i)
	fmt.Println("reValue:",reValue)
	fmt.Printf("reValue的具体类型是：%T",reValue)
	//num1 := 100
	//如果真想获取reValue的数值，要调用Int()方法：返回v持有的有符号整数
	num2 := 80 + reValue.Int()
	fmt.Println(num2)

	//reValue转成空接口：
	i2 := reValue.Interface()
	//类型断言：
	n := i2.(int)
	n2 := n + 30
	fmt.Println(n2)
}

func main(){
	//对基本数据类型进行反射：
	//定义一个基本数据类型：
	var num int = 100
	testReflect(num)
}
```

### `demo02\main.go`

```go
package main

import(
	"fmt"
	"reflect"
)

//利用一个函数，函数的参数定义为空接口：
func testReflect(i interface{}){//空接口没有任何方法,所以可以理解为所有类型都实现了空接口，也可以理解为我们可以把任何一个变量赋给空接口。
	//1.调用TypeOf函数，返回reflect.Type类型数据：
	reType := reflect.TypeOf(i)
	fmt.Println("reType:",reType)
	fmt.Printf("reType的具体类型是：%T",reType)
	//2.调用ValueOf函数，返回reflect.Value类型数据：
	reValue :=reflect.ValueOf(i)
	fmt.Println("reValue:",reValue)
	fmt.Printf("reValue的具体类型是：%T",reValue)

	//reValue转成空接口：
	i2 := reValue.Interface()
	//类型断言：
	n,flag := i2.(Student)
	if flag == true {//断言成功
		fmt.Printf("学生的名字是：%v,学生的年龄是：%v",n.Name,n.Age)
	}
	
}

//定义学生结构体：
type Student struct{
	Name string
	Age int
}

func main(){
	//对结构体类型进行反射：
	//定义结构体具体的实例：
	stu := Student{
		Name : "丽丽",
		Age : 18,	
	}
	testReflect(stu)
}
```


