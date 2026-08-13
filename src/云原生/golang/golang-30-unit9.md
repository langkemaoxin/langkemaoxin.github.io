---
title: Go 基础练习 unit9
sidebarGroup: Golang
shortTitle: 30 unit9
order: 30
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: goproject unit9 练习整理
---

> **Golang · 第 30 篇**
>
> 源码：`goproject/.../testproject01/unit9`

---

## 本单元 Demo 一览

| Demo | 主要文件 |
|------|----------|
| `demo01` | main.go |
| `demo02` | main.go |
| `demo03` | main.go |

## 示例代码

### `demo01\main.go`

```go
package main
import "fmt"
func main(){
	//方式1：
	//定义map变量：
	var a map[int]string
	//只声明map内存是没有分配空间
	//必须通过make函数进行初始化，才会分配空间：
	a = make(map[int]string,10) //map可以存放10个键值对
	//将键值对存入map中：
	a[20095452] = "张三"
	a[20095387] = "李四"
	//输出集合
	fmt.Println(a)

	//方式2：
	b := make(map[int]string)
	b[20095452] = "张三"
	b[20095387] = "李四"
	fmt.Println(b)

	//方式3：
	c := map[int]string{
		20095452 : "张三",
		20098765 : "李四",
	}
	c[20095387] = "王五"
	fmt.Println(c)
}
```

### `demo02\main.go`

```go
package main
import "fmt"
func main(){
	//定义map
	b := make(map[int]string)
	//增加：
	b[20095452] = "张三"
	b[20095387] = "李四"
	//修改：
	b[20095452] = "王五"
	//删除：
	delete(b,20095387)
	delete(b,20089546)
	fmt.Println(b)
	//查找：
	value,flag := b[200]
	fmt.Println(value)
	fmt.Println(flag)
}
```


