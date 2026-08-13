---
title: Go 基础练习 unit3
sidebarGroup: Golang
shortTitle: 24 unit3
order: 24
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: goproject unit3 练习整理
---

> **Golang · 第 24 篇**
>
> 源码：`goproject/.../testproject01/unit3`

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
import "fmt"
func main(){
	//+加号：
	//1.正数 2.相加操作  3.字符串拼接
	var n1 int = +10
	fmt.Println(n1)
	var n2 int = 4 + 7
	fmt.Println(n2)
	var s1 string = "abc" + "def"
	fmt.Println(s1)

	// /除号：
	fmt.Println(10/3) //两个int类型数据运算，结果一定为整数类型
	fmt.Println(10.0/3)//浮点类型参与运算，结果为浮点类型

	// % 取模  等价公式： a%b=a-a/b*b
	fmt.Println(10%3) // 10%3= 10-10/3*3 = 1
	fmt.Println(-10%3)
	fmt.Println(10%-3)
	fmt.Println(-10%-3)

	//++自增操作：
	var a int = 10
	a++
	fmt.Println(a)
	a--
	fmt.Println(a)
	//++ 自增 加1操作，--自减，减1操作
	//go语言里，++，--操作非常简单，只能单独使用，不能参与到运算中去
	//go语言里，++，--只能在变量的后面，不能写在变量的前面 --a  ++a  错误写法
}
```

### `demo02\main.go`

```go
package main
import "fmt"
func main(){
	fmt.Println(5==9)//判断左右两侧的值是否相等，相等返回true，不相等返回的是false， ==不是=
	fmt.Println(5!=9)//判断不等于
	fmt.Println(5>9)
	fmt.Println(5<9)
	fmt.Println(5>=9)
	fmt.Println(5<=9)
}
```


