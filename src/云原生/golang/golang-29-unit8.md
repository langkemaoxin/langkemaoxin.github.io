---
title: Go 基础练习 unit8
sidebarGroup: Golang
shortTitle: 29 unit8
order: 29
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: goproject unit8 练习整理
---

> **Golang · 第 29 篇**
>
> 源码：`goproject/.../testproject01/unit8`

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
	//定义数组：
	var intarr [6]int = [6]int{3,6,9,1,4,7}
	//切片构建在数组之上：
	//定义一个切片名字为slice,[]动态变化的数组长度不写，int类型，intarr是原数组
	//[1:3]切片 - 切出的一段片段 - 索引:从1开始，到3结束（不包含3） - [1,3)
	//var slice []int = intarr[1:3]
	slice := intarr[1:3]
	//输出数组：
	fmt.Println("intarr:",intarr)
	//输出切片：
	fmt.Println("slice:",slice)
	//切片元素个数：
	fmt.Println("slice的元素个数:",len(slice))
	//获取切片的容量：容量可以动态变化
	fmt.Println("slice的容量:",cap(slice))
	fmt.Printf("数组中下标为1位置的地址：%p",&intarr[1])
	fmt.Printf("切片中下标为0位置的地址：%p",&slice[0])
	slice[1] = 16 
	fmt.Println("intarr:",intarr)
	fmt.Println("slice:",slice)
}
```

### `demo02\main.go`

```go
package main
import "fmt"
func main(){
	//定义切片：make函数的三个参数：1.切片类型 2.切片长度 3.切片的容量
	slice := make([]int,4,20)
	fmt.Println(slice) ///[0 0 0 0]
	fmt.Println("切片的长度：",len(slice))
	fmt.Println("切片的容量：",cap(slice))
	slice[0] = 66
	slice[1] = 88
	fmt.Println(slice)

	slice2 := []int{1,4,7}
	fmt.Println(slice2) 
	fmt.Println("切片的长度：",len(slice2))
	fmt.Println("切片的容量：",cap(slice2))
}
```


