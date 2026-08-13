---
title: Go 基础练习 unit11
sidebarGroup: Golang
shortTitle: 19 unit11
order: 19
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: goproject unit11 练习整理
---

> **Golang · 第 19 篇**
>
> 源码：`goproject/.../testproject01/unit11`

---

## 本单元 Demo 一览

| Demo | 主要文件 |
|------|----------|
| `demo01` | main.go |
| `demo02` | main.go |
| `demo03` | main.go |
| `demo04` | main.go |
| `demo05` | main.go |

## 示例代码

### `demo01\main.go`

```go
package main

import(
	"fmt"
	"os"
)

func main(){
	//打开文件：
	file,err := os.Open("d:/Test.txt");

	if err != nil {//出错
		fmt.Println("文件打开出错，对应错误为：",err)
	}

	//没有出错，输出文件：
	fmt.Printf("文件=%v",file)
	//.........一系列操作

	//关闭文件：
	err2 := file.Close();
	if err2 != nil {
		fmt.Println("关闭失败")
	}
}
```

### `demo02\main.go`

```go
package main

import(
	"fmt"
	"io/ioutil"
)

func main(){
	//备注：在下面的程序中不需要进行 Open\Close操作，因为文件的打开和关闭操作被封装在ReadFile函数内部了
	//读取文件：
	content,err := ioutil.ReadFile("d:/Test.txt")//返回内容为：[]byte,err

	if err != nil {//读取有误
		fmt.Println("读取出错，错误为：",err)
	}

	//如果读取成功，将内容显示在终端即可：
	//fmt.Printf("%v",content)
	fmt.Printf("%v",string(content))
}
```


