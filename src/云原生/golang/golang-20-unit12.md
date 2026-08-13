---
title: "Go 基础练习 unit12"
sidebarGroup: "Golang"
shortTitle: "20 unit12"
order: 20
date: 2026-08-13
category: "云原生"
tag:
  - "Golang"
  - "云原生"
  - "课程笔记"
description: "goproject unit12 练习整理"
---

> **Golang · 第 20 篇**
>
> 源码：`goproject/.../testproject01/unit12`

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

import(
	"fmt"
	"strconv"
	"time"
)

func test(){
	for i := 1;i <= 1000;i++ {
		fmt.Println("hello golang + " + strconv.Itoa(i))
		//阻塞一秒：
		time.Sleep(time.Second)
	}
}

func main(){//主线程
	go test() //开启一个协程

	for i := 1;i <= 10;i++ {
		fmt.Println("hello msb + " + strconv.Itoa(i))
		//阻塞一秒：
		time.Sleep(time.Second)
	}
}
```

### `demo02\main.go`

```go
package main

import(
	"fmt"
	"time"
)

func main(){
	//匿名函数+外部变量 = 闭包
	for i := 1;i <= 5;i++ {
		//启动一个协程
		//使用匿名函数，直接调用匿名函数
		go func(n int){
			fmt.Println(n)
		}(i)
	}

	time.Sleep(time.Second * 2)
}
```


