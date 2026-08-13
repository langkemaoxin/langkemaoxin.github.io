---
title: Go 基础练习 unit5
sidebarGroup: Golang
shortTitle: 26 unit5
order: 26
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: goproject unit5 练习整理
---

> **Golang · 第 26 篇**
>
> 源码：`goproject/.../testproject01/unit5`

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
| `demo09` | calutils.go, dbutils.go, util.go |
| `demo10` | main.go, testutils.go |
| `demo11` | main.go |
| `demo12` | main.go |

## 示例代码

### `demo01\main.go`

```go
package main
import "fmt"

// func   函数名（形参列表)（返回值类型列表）{
// 	执行语句..
// 	return + 返回值列表
// }

//自定义函数：功能：两个数相加：
func cal (num1 int,num2 int) (int) { //如果返回值类型就一个的话，那么()是可以省略不写的
	var sum int = 0
	sum += num1
	sum += num2
	return sum
}


func main(){
	//功能：10 + 20
	//调用函数：
	sum := cal(10,20)
	fmt.Println(sum)
	// var num1 int = 10
	// var num2 int = 20
	//求和：
	// var sum int = 0
	// sum += num1
	// sum += num2
	// fmt.Println(sum)

	//功能：30 + 50
	var num3 int = 30
	var num4 int = 50
	//调用函数：
	sum1 := cal(num3,num4)
	fmt.Println(sum1)
	//求和：
	// var sum1 int = 0
	// sum1 += num3
	// sum1 += num4
	// fmt.Println(sum1)
}
```

### `demo02\main.go`

```go
package main
import "fmt"


//自定义函数：功能：两个数相加：
func cal (num1 int,num2 int) int { //如果返回值类型就一个的话，那么()是可以省略不写的
	var sum int = 0
	sum += num1
	sum += num2
	return sum
	//fmt.Println(sum)
}
//计算两个数的和，两个数的差
func cal2 (num1 int,num2 int) (int,int) { 
	var sum int = 0
	sum += num1
	sum += num2

	var result int = num1 - num2
	return sum,result
}


func main(){
	//功能：10 + 20
	//调用函数：
	// sum := cal(10,20)
	// fmt.Println(sum)

	sum1,_ := cal2(10,20)
	fmt.Println(sum1)
	
}
```


