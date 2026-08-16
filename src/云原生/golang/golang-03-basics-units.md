---
title: Go 基础练习 unit 合集
sidebarGroup: Golang
shortTitle: 03 基础练习合集
order: 3
date: 2026-08-13
category: 云原生
tag:
  - Golang
  - 云原生
  - 课程笔记
description: Go 基础练习 unit 合集
---

> **Golang · 03 基础练习合集**
>
> 由示例工程笔记合并。

---

## Go 基础练习 unit10

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
| `demo11` | main.go, student.go |
| `demo12` | main.go, person.go |

## 示例代码

### `demo01\main.go`

```go
package main
import "fmt"

func main(){
	//珊珊老师： 姓名：赵珊珊   年龄：31岁   性别 ：女
	var name string = "赵珊珊"
	var age int = 31
	var sex string = "女"

	//马士兵老师：
	var name2 string = "马士兵"
	var age2 int = 45
	var sex2 string = "男"
}
```

### `demo02\main.go`

```go
package main
import "fmt"

//定义老师结构体，将老师中的各个属性  统一放入结构体中管理：
type Teacher struct{
	//变量名字大写外界可以访问这个属性
	Name string
	Age int
	School string
}
func main(){
	//创建老师结构体的实例、对象、变量：
	var t *Teacher = &Teacher{"马士兵",46,"清华大学"}
	// (*t).Name = "马士兵"
	// (*t).Age = 45
	// t.School = "清华大学"
	fmt.Println(*t)
}


// func main(){
// 	//创建老师结构体的实例、对象、变量：
// 	var t *Teacher = new(Teacher) 
// 	//t是指针，t其实指向的就是地址，应该给这个地址的指向的对象的字段赋值：
// 	(*t).Name = "马士兵"
// 	(*t).Age = 45  //*的作用：根据地址取值
// 	//为了符合程序员的编程习惯，go提供了简化的赋值方式：
// 	t.School = "清华大学" //go编译器底层对t.School转化 (*t).School = "清华大学"
// 	fmt.Println(*t)
// }




// func main(){
// 	//创建老师结构体的实例、对象、变量：
// 	var t Teacher = Teacher{"赵珊珊",31,"黑龙江大学"}
// 	fmt.Println(t)
// 	// t.Name = "赵珊珊"
// 	// t.Age = 31
// 	// t.School = "黑龙江大学"
// 	fmt.Println(t)
// }

// func main(){
// 	//创建老师结构体的实例、对象、变量：
// 	var t1 Teacher // var a int
// 	fmt.Println(t1) //在未赋值时默认值：{ 0 }
// 	t1.Name = "马士兵"
// 	t1.Age = 45
// 	t1.School = "清华大学"
// 	fmt.Println(t1)
// 	fmt.Println(t1.Age + 10)
// }
```

## Go 基础练习 unit11

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

## Go 基础练习 unit12

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

## Go 基础练习 unit13

## 本单元 Demo 一览

| Demo | 主要文件 |
|------|----------|
| `demo01` | main.go, main.go |

## 示例代码

### `demo01\client\main.go`

```go
package main

import(
	"fmt"
	"net" //所需的网络编程全部都在net包下
	"bufio"
	"os"
	"strings"
)

func main(){
	//打印：
	fmt.Println("客服端启动。。")
	//调用Dial函数：参数需要指定tcp协议，需要指定服务器端的IP+PORT
	conn,err := net.Dial("tcp","127.0.0.1:8888")
	if err != nil {//连接失败
		fmt.Println("客户端连接失败：err:",err)
		return
	}
	fmt.Println("连接成功，conn:",conn)

	//通过客户端发送单行数据，然后退出：
	reader := bufio.NewReader(os.Stdin)//os.Stdin代表终端标准输入


	//从终端读取一行用户输入的信息：
	str,err := reader.ReadString('\n')
	if err != nil {
		fmt.Println("终端输入失败，err:",err)
	}

	//将str数据发送给服务器：
	n,err := conn.Write([]byte(str))
	if err != nil{
		fmt.Println("连接失败，err:",err)
	}

	fmt.Printf("终端数据通过客户端发送成功，一共发送了%d字节的数据,并退出\n",n)



}
```

### `demo01\server\main.go`

```go
package main

import(
	"fmt"
	"net" //所需的网络编程全部都在net包下
)

func process(conn net.Conn){
	//连接用完一定要关闭：
	defer conn.Close()

	for{
		//创建一个切片，准备：将读取的数据放入切片：
		buf := make([]byte,1024)

		//从conn连接中读取数据：
		n,err := conn.Read(buf)
		if err != nil{
			return
		}
		//将读取内容在服务器端输出：
		fmt.Println(string(buf[0:n]))
	}
}

func main(){
	//打印：
	fmt.Println("服务器端启动了。。")
	//进行监听：需要指定服务器端TCP协议，服务器端的IP+PORT
	listen,err := net.Listen("tcp","127.0.0.1:8888")
	if err != nil{//监听失败
		fmt.Println("监听失败，err:",err)
		return
	}

	//监听成功以后：
	//循环等待客户端的链接：
	for{
		conn,err2 := listen.Accept()
		if err2 != nil {//客户端的等待失败
			fmt.Println("客户端的等待失败,err2:",err2)
		}else{
			//连接成功：
			fmt.Printf("等待链接成功，con=%v ，接收到的客户端信息：%v \n",conn,conn.RemoteAddr().String())
		}

		//准备一个协程，协程处理客户端服务请求：
		go process(conn)//不同的客户端的请求，连接conn不一样的
	}
}
```

## Go 基础练习 unit14

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

import(
	"fmt"
	"reflect"
)

//利用一个函数，函数的参数定义为空接口：
func testReflect(i interface{}){//空接口没有任何方法,所以可以理解为所有类型都实现了空接口，也可以理解为我们可以把任何一个变量赋给空接口。
	//1.调用TypeOf函数，返回reflect.Type类型数据：
	reType := reflect.TypeOf(i)
	fmt.Println("reType:",reType)
	fmt.Printf("reType的具体类型是：%T",reType)
	//2.调用ValueOf函数，返回reflect.Value类型数据：
	reValue :=reflect.ValueOf(i)
	fmt.Println("reValue:",reValue)
	fmt.Printf("reValue的具体类型是：%T",reValue)
	//num1 := 100
	//如果真想获取reValue的数值，要调用Int()方法：返回v持有的有符号整数
	num2 := 80 + reValue.Int()
	fmt.Println(num2)

	//reValue转成空接口：
	i2 := reValue.Interface()
	//类型断言：
	n := i2.(int)
	n2 := n + 30
	fmt.Println(n2)
}

func main(){
	//对基本数据类型进行反射：
	//定义一个基本数据类型：
	var num int = 100
	testReflect(num)
}
```

### `demo02\main.go`

```go
package main

import(
	"fmt"
	"reflect"
)

//利用一个函数，函数的参数定义为空接口：
func testReflect(i interface{}){//空接口没有任何方法,所以可以理解为所有类型都实现了空接口，也可以理解为我们可以把任何一个变量赋给空接口。
	//1.调用TypeOf函数，返回reflect.Type类型数据：
	reType := reflect.TypeOf(i)
	fmt.Println("reType:",reType)
	fmt.Printf("reType的具体类型是：%T",reType)
	//2.调用ValueOf函数，返回reflect.Value类型数据：
	reValue :=reflect.ValueOf(i)
	fmt.Println("reValue:",reValue)
	fmt.Printf("reValue的具体类型是：%T",reValue)

	//reValue转成空接口：
	i2 := reValue.Interface()
	//类型断言：
	n,flag := i2.(Student)
	if flag == true {//断言成功
		fmt.Printf("学生的名字是：%v,学生的年龄是：%v",n.Name,n.Age)
	}
	
}

//定义学生结构体：
type Student struct{
	Name string
	Age int
}

func main(){
	//对结构体类型进行反射：
	//定义结构体具体的实例：
	stu := Student{
		Name : "丽丽",
		Age : 18,	
	}
	testReflect(stu)
}
```

## Go 基础练习 unit2

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

## Go 基础练习 unit3

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

## Go 基础练习 unit4

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

## Go 基础练习 unit5

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

## Go 基础练习 unit6

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

## Go 基础练习 unit7

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

## Go 基础练习 unit8

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

## Go 基础练习 unit9

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

