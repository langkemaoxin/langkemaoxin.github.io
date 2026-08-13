---
title: "Go 基础练习 unit7"
sidebarGroup: "Golang"
shortTitle: "28 unit7"
order: 28
date: 2026-08-13
category: "云原生"
tag:
  - "Golang"
  - "云原生"
  - "课程笔记"
description: "goproject unit7 练习整理"
---

> **Golang · 第 28 篇**
>
> 源码：`goproject/.../testproject01/unit7`

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

## 示例代码

### `demo01\main.go`

```go
package main
import "fmt"
func main(){
	//实现的功能：给出五个学生的成绩，求出成绩的总和，平均数：
	//给出五个学生的成绩：
	score1 := 95
	score2 := 91
	score3 := 39
	score4 := 60
	score5 := 21
	//求和：
	sum := score1 + score2 + score3 + score4 + score5 
	//平均数：
	avg := sum / 5
	//输出
	fmt.Printf("成绩的总和为：%v,成绩的平均数为：%v",sum,avg)
}
```

### `demo02\main.go`

```go
package main
import "fmt"
func main(){
	//实现的功能：给出五个学生的成绩，求出成绩的总和，平均数：
	//给出五个学生的成绩：--->数组存储：
	//定义一个数组：
	var scores [5]int
	//将成绩存入数组：
	scores[0] = 95
	scores[1] = 91
	scores[2] = 39
	scores[3] = 60
	scores[4] = 21
	//求和：
	//定义一个变量专门接收成绩的和：
	sum := 0
	for i := 0;i < len(scores);i++ {//i: 0,1,2,3,4 
		sum += scores[i]
	}
	//平均数：
	avg := sum / len(scores)
	//输出
	fmt.Printf("成绩的总和为：%v,成绩的平均数为：%v",sum,avg)
}
```


