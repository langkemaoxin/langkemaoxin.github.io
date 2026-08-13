---
title: Go 基础练习 unit4
sidebarGroup: Golang
shortTitle: 25 unit4
order: 25
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: goproject unit4 练习整理
---

> **Golang · 第 25 篇**
>
> 源码：`goproject/.../testproject01/unit4`

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
	//实现功能：如果口罩的库存小于30个，提示：库存不足：
	//var count int = 100
	//单分支：
	// if count < 30 {
	// 	fmt.Println("对不起，口罩存量不足")
	// }

	//if后面表达式，返回结果一定是true或者false，
	//如果返回结果为true的话，那么{}中的代码就会执行
	//如果返回结果为false的话，那么{}中的代码就不会执行
	//if后面一定要有空格，和条件表达式分隔开来
	//{}一定不能省略
	//条件表达式左右的()是建议省略的
	//在golang里，if后面可以并列的加入变量的定义：

	if count := 20;count < 30 {
		fmt.Println("对不起，口罩存量不足")
	}
}
```

### `demo02\main.go`

```go
package main
import "fmt"
func main(){
	//实现功能：如果口罩的库存小于30个，提示：库存不足,否则提示：库存充足
	//定义口罩的数量：
	var count int = 70
	if count < 30 { //这个条件表达式返回的是true的话，后面{}执行了
		fmt.Println("库存不足")
	} else {//count >= 30
		fmt.Println("库存充足")
	}

	//双分支一定会二选一走其中一个分支。
	
}
```


