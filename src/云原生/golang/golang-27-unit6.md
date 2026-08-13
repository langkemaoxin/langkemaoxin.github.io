---
title: Go 基础练习 unit6
sidebarGroup: Golang
shortTitle: 27 unit6
order: 27
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: goproject unit6 练习整理
---

> **Golang · 第 27 篇**
>
> 源码：`goproject/.../testproject01/unit6`

---

## 本单元 Demo 一览

| Demo | 主要文件 |
|------|----------|
| `demo01` | main.go |
| `demo02` | main.go |

## 示例代码

### `demo01\main.go`

```go
package main
import "fmt"
func main(){
	test()
	fmt.Println("上面的除法操作执行成功。。。")
	fmt.Println("正常执行下面的逻辑。。。")
}

func test(){
	//利用defer+recover来捕获错误：defer后加上匿名函数的调用
	defer func() {
		//调用recover内置函数，可以捕获错误：
		err := recover()
		//如果没有捕获错误，返回值为零值：nil
		if err != nil {
			fmt.Println("错误已经捕获")
			fmt.Println("err是：", err)
		}
	}()  
	num1 := 10
	num2 := 0
	result := num1 / num2
	fmt.Println(result)
}
```

### `demo02\main.go`

```go
package main
import (
	"fmt"
	"errors"
)
func main(){
	err := test()
	if err != nil {
		fmt.Println("自定义错误：" ,err)
		panic(err)
	}
	fmt.Println("上面的除法操作执行成功。。。")
	fmt.Println("正常执行下面的逻辑。。。")
}

func test() (err error){
	num1 := 10
	num2 := 0
	if num2 == 0 {
		//抛出自定义错误：
		return errors.New("除数不能为0哦~~")
	}else {//如果除数不为0，那么正常执行就可以了
		result := num1 / num2
		fmt.Println(result)
		//如果没有错误，返回零值：
		return nil
	}
}
```


