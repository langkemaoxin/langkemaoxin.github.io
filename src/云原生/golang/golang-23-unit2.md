---
title: Go 基础练习 unit2
sidebarGroup: Golang
shortTitle: 23 unit2
order: 23
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: goproject unit2 练习整理
---

> **Golang · 第 23 篇**
>
> 源码：`goproject/.../testproject01/unit2`

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
| `demo07` | main.go |
| `demo08` | main.go |
| `demo09` | main.go |
| `demo10` | main.go |
| `demo11` | main.go |
| `demo12` | main.go |

## 示例代码

### `demo01\main.go`

```go
package main
import "fmt"

func main(){
	//1.变量的声明
	var age int
	//2.变量的赋值
	age = 18
	//3.变量的使用
	fmt.Println("age = ",age);

	//声明和赋值可以合成一句：
	var age2 int = 19
	fmt.Println("age2 = ",age2);

	// var age int = 20;
	// fmt.Println("age = ",age);

	/*变量的重复定义会报错：
		# command-line-arguments
		.\main.go:16:6: age redeclared in this block
				previous declaration at .\main.go:6:6
	*/


	//不可以在赋值的时候给与不匹配的类型
	var num int = 12.56
	fmt.Println("num = ",num);
}
```

### `demo02\main.go`

```go
package main
import "fmt"

//全局变量：定义在函数外的变量
var n7 = 100
var n8 = 9.7

//设计者认为上面的全局变量的写法太麻烦了，可以一次性声明：
var (
	n9 = 500
	n10 = "netty"
)


func main(){
	//定义在{}中的变量叫：局部变量
	//第一种：变量的使用方式：指定变量的类型，并且赋值，
	var num int = 18
	fmt.Println(num)

	//第二种：指定变量的类型，但是不赋值，使用默认值 
	var num2 int
	fmt.Println(num2)

	//第三种：如果没有写变量的类型，那么根据=后面的值进行判定变量的类型 （自动类型推断）
	var num3 = "tom"
	fmt.Println(num3)

	//第四种：省略var，注意 := 不能写为 =   
	sex := "男"
	fmt.Println(sex)

	fmt.Println("------------------------------------------------------------------")
	//声明多个变量：
	var n1,n2,n3 int
	fmt.Println(n1)
	fmt.Println(n2)
	fmt.Println(n3)

	var n4,name,n5 = 10,"jack",7.8
	fmt.Println(n4)
	fmt.Println(name)
	fmt.Println(n5)

	n6,height := 6.9,100.6
	fmt.Println(n6)
	fmt.Println(height)


	fmt.Println(n7)
	fmt.Println(n8)

	fmt.Println(n9)
	fmt.Println(n10)


}
```


