---
title: "JVM 字节码与 Class 文件结构"
sidebarGroup: "JVM"
shortTitle: "05 Class 与字节码"
order: 5
date: 2026-09-03
category: "性能调优"
tag:
  - "性能调优"
  - "JVM"
  - "字节码"
  - "Class文件"
description: "从 javap 与十六进制视角剖析 Class 魔数、常量池、字段/方法表及 Code 属性中的字节码指令。"
---

> **JVM 系列 · 第 5/12 篇**  
> 上一篇：[《JVM 对象创建与内存分配机制》](/性能调优/jvm/jvm-04-object-allocation)  
> 下一篇：[《深入理解 JVM 执行引擎》](/性能调优/jvm/jvm-06-execution-engine)

---

## 开头：`.java` 编译后，JVM 读的是什么？

[类加载](/性能调优/jvm/jvm-02-classloader) 加载的是 **Class 二进制**；[执行引擎](/性能调优/jvm/jvm-06-execution-engine) 执行的是 **方法区里的字节码**。本文用一份简单 POJO，从 **`javap -verbose`** 与 **十六进制** 两条线，完整走读 Class 文件结构——读懂它，才能理解栈帧、常量池在运行期如何被使用。

---

## 一、示例源码与 javap 反编译

### 1.1 源代码

```java
public class TulingByteCode {
    private String userName;

    public String getUserName() { return userName; }

    public void setUserName(String userName) {
        this.userName = userName;
    }
}
```

### 1.2 `javap -verbose TulingByteCode.class` 摘要

```text
Classfile .../TulingByteCode.class
  Last modified ...; size 629 bytes
  MD5 checksum ...
  Compiled from "TulingByteCode.java"
public class ...TulingByteCode
  minor version: 0
  major version: 52          // JDK 1.8
  flags: ACC_PUBLIC, ACC_SUPER
Constant pool:
  #1 = Methodref #4.#21      // java/lang/Object."<init>":()V
  #2 = Fieldref #3.#22       // ...TulingByteCode.userName:Ljava/lang/String;
  ...
```

`javap` 输出的 **常量池索引、方法体 Code、LineNumberTable** 等，与磁盘上 Class 二进制 **一一对应**——下文按字节顺序对齐。

---

## 二、Class 文件整体结构

Class 文件是 **8 位字节流**；十六进制查看器中 **1 字节 = 2 个十六进制 digit**。

![Class 文件结构总览](/性能调优/jvm-05-classfile-bytecode/p004-01.png)

### 2.1 顶层结构表

| 类型 | 名称 | 数量 |
|------|------|------|
| u4 | Magic（魔数） | 1 |
| u2 | minor_version | 1 |
| u2 | major_version | 1 |
| u2 | constant_pool_count | 1 |
| cp_info | constant_pool | count **- 1** |
| u2 | access_flags | 1 |
| u2 | this_class | 1 |
| u2 | super_class | 1 |
| u2 | interfaces_count | 1 |
| u2 | interfaces | interfaces_count |
| u2 | fields_count | 1 |
| field_info | fields | fields_count |
| u2 | methods_count | 1 |
| method_info | methods | methods_count |
| u2 | attributes_count | 1 |
| attribute_info | attributes | attributes_count |

伪代码视角：

![Class 文件结构伪代码](/性能调优/jvm-05-classfile-bytecode/p005-01.png)

### 2.2 魔数与版本号

- **魔数**：前 4 字节固定 **`0xCAFEBABE`**
- **次版本号**（minor）：2 字节，如 `00 00`
- **主版本号**（major）：2 字节，如 `00 34` → 十进制 **52** → **JDK 1.8**（51=1.7，50=1.6，依此类推）

### 2.3 常量池入口

紧跟版本号后 **2 字节** 为 `constant_pool_count`。示例 `00 19` → 十进制 25，**实际常量条目 = 25 - 1 = 24**——因为 **#0 被 JVM 保留为 null**，javap 索引从 **#1** 开始。

---

## 三、常量池（Constant Pool）

### 3.1 角色

常量池是 Class 的 **资源仓库**：方法名、字段名、类名、字面量、符号引用等；后续字段表、方法表、属性表中的索引 **都指向常量池**。

![常量池在 Class 中的位置](/性能调优/jvm-05-classfile-bytecode/p008-01.png)

### 3.2 字面量 vs 符号引用

| 类别 | 内容示例 |
|------|----------|
| **字面量** | Utf8 字符串、int/float、Class 名文本 |
| **符号引用** | Class、Fieldref、Methodref、NameAndType、InterfaceMethodref |

![常量池类型分类](/性能调优/jvm-05-classfile-bytecode__class常量池类型分类/p001-04.png)

完整类型一览（动态调用相关 `InvokeDynamic` 等 JDK 7+ 扩展此处从略）：

| 字面量 | 符号引用 |
|--------|----------|
| Utf8、String、Integer、Float、Long、Double | Class、Fieldref、Methodref、NameAndType、InterfaceMethodref |

### 3.3 cp_info 结构

每个常量项：**u1 tag** + 依 tag 而定的 info。`u1/u2/u4/u8` 表示 1/2/4/8 字节无符号数。

![cp_info 结构示意](/性能调优/jvm-05-classfile-bytecode/p009-01.png)

### 3.4 字段与方法描述符

JVM 用 **描述符** 压缩类型信息：

**基本类型**（单字母大写）：

| 符 | 类型 |
|----|------|
| B/C/D/F/I/J/S/Z/V | byte/char/double/float/int/long/short/boolean/void |

**对象**：`L` + 全限定类名 + `;`，如 `Ljava/lang/String;`

**数组**：每个维度一个 `[`，如 `int[]` → `[I`，`String[][]` → `[[Ljava/lang/String;`

**方法**：`(` 参数列表 `)` 返回值，如 `String getUserInfo(int id, String name)` → `(ILjava/lang/String;)Ljava/lang/String;`

---

## 四、常量池逐条解析（示例 Class）

以下十六进制片段来自同一 Class；与 javap `#1`–`#24` 对照。

### 4.1 #1 方法引用 `0A 00 04 00 15`

| 字节 | 含义 |
|------|------|
| `0A` | CONSTANT_Methodref_info |
| `00 04` | class_index → #4（Class → #24 `java/lang/Object`） |
| `00 15` | name_and_type_index → #21（#7 `<init>` + #8 `()V`） |

语义：`java/lang/Object."<init>":()V`

![#1 方法引用解析](/性能调优/jvm-05-classfile-bytecode/p011-02.png)

### 4.2 #2 字段引用 `09 00 03 00 16`

| 字节 | 含义 |
|------|------|
| `09` | CONSTANT_Fieldref_info |
| `00 03` | class_index → #3（本类） |
| `00 16` | name_and_type → #22（#5 `userName` + #6 `Ljava/lang/String;`） |

语义：`...TulingByteCode.userName:Ljava/lang/String;`

![#2 字段引用解析](/性能调优/jvm-05-classfile-bytecode/p012-01.png)

### 4.3 #3、#4 类引用 `07 00 17` / `07 00 18`

`07` = CONSTANT_Class_info；后 2 字节指向 Utf8：

- #23 → `com/tuling/.../TulingByteCode`
- #24 → `java/lang/Object`

### 4.4 #5–#20：Utf8 字面量（节选）

| 索引 | 十六进制片段（示意） | 字符串 |
|------|----------------------|--------|
| #5 | `01 00 08 ...` | userName |
| #6 | `01 00 12 ...` | Ljava/lang/String; |
| #7 | `01 00 06 ...` | \<init\> |
| #8 | `01 00 03 28 29 56` | ()V |
| #9 | Code | Code |
| #10 | LineNumberTable | LineNumberTable |
| #11 | LocalVariableTable | LocalVariableTable |
| #14 | getUserName | getUserName |
| #15 | ()Ljava/lang/String; | 方法描述 |
| #16 | setUserName | setUserName |
| #17 | (Ljava/lang/String;)V | 方法描述 |
| #20 | TulingByteCode.java | 源文件名 |

Utf8 结构：`01`（tag）+ `u2 length` + UTF-8 字节。例如 #24：

```text
01 00 10 6A 61 76 61 2F 6C 61 6E 67 2F 4F 62 6A 65 63 74
→ java/lang/Object
```

![Utf8 结构示意](/性能调优/jvm-05-classfile-bytecode/p013-02.png)

### 4.5 #21、#22 NameAndType

`0C` = NameAndType：`u2 name_index` + `u2 descriptor_index`

- #21 → #7 + #8（\<init\> + ()V）
- #22 → #5 + #6（userName + Ljava/lang/String;）

---

## 五、访问标志（access_flags）

**u2**，通过 **位运算** 组合（规范未穷举所有组合值）：

示例 `00 21` = `0x0020 | 0x0001` → **ACC_SUPER + ACC_PUBLIC**

| 标志 | 值 | 说明 |
|------|-----|------|
| ACC_PUBLIC | 0x0001 | public |
| ACC_FINAL | 0x0010 | 无子类 |
| ACC_SUPER | 0x0020 | 启用 invokespecial 语义调用父类方法 |
| ACC_INTERFACE | 0x0200 | 接口 |
| ACC_ABSTRACT | 0x0400 | 抽象类 |
| ACC_SYNTHETIC | 0x1000 | 编译器合成、无源文件 |
| ACC_ANNOTATION | 0x2000 | 注解 |
| ACC_ENUM | 0x4000 | 枚举 |

---

## 六、类名、父类与接口

| 字段 | 字节 | 示例 |
|------|------|------|
| **this_class** | u2 | `00 03` → #3 本类名 |
| **super_class** | u2 | `00 04` → #4 → Object |
| **interfaces_count** + **interfaces** | u2 × (1+n) | 本例无接口；若 `00 02 00 08 00 09` 表示实现 2 个接口，索引 #8、#9 |

---

## 七、字段表（field_info）

描述 **类字段与实例字段**（**不含** 方法内局部变量）。

### 7.1 结构

| 类型 | 名称 |
|------|------|
| u2 | access_flags |
| u2 | name_index |
| u2 | descriptor_index |
| u2 | attributes_count |
| attribute_info | attributes |

本例 **1 个字段**：`00 01 00 02 00 05 00 06 00 00`

- 数量 `00 01`
- `00 02` → ACC_PRIVATE
- name `#5` userName，descriptor `#6` Ljava/lang/String;
- 属性数 0

![字段表结构](/性能调优/jvm-05-classfile-bytecode/p043-01.png)

---

## 八、方法表（method_info）

本例 **3 个方法**：\<init\>、getUserName、setUserName。

### 8.1 method_info 结构

与 field_info 相同头部；每个方法的 **Code** 等在 **attributes** 中。

| 类型 | 名称 |
|------|------|
| u2 | access_flags |
| u2 | name_index |
| u2 | descriptor_index |
| u2 | attributes_count |
| attribute_info | attributes（几乎总有 **Code**） |

### 8.2 attribute_info 通用格式

| 类型 | 名称 |
|------|------|
| u2 | attribute_name_index |
| u4 | attribute_length |
| u1 | info[length] |

---

## 九、Code 属性与字节码指令

每个实例/类方法的核心是 **Code 属性**（name_index 指向常量池 `Code`）。

### 9.1 Code 属性结构

| 类型 | 名称 |
|------|------|
| u2 | max_stack |
| u2 | max_locals |
| u4 | code_length |
| u1 | code[code_length] |
| u2 | exception_table_length |
| exception_info | exception_table |
| u2 | attributes_count |
| attribute_info | attributes（LineNumberTable、LocalVariableTable 等） |

![Code 属性结构](/性能调优/jvm-05-classfile-bytecode/p045-02.png)

![Code 属性详细结构](/性能调优/jvm-05-classfile-bytecode/p046-01.png)

### 9.2 构造方法 `<init>`

头部：`00 01 00 07 00 08 00 01` → public、#7 \<init\>、#8 ()V、1 个属性。

Code 体（47 字节）核心字段：

| 字段 | 值 | 含义 |
|------|-----|------|
| max_stack | 1 | 操作数栈最大深度 |
| max_locals | 1 | 局部变量槽位数（仅 this） |
| code_length | 5 | 指令 5 字节 |
| code | `2A B7 00 01 B1` | 见下 |

**指令解析**：

| 字节 | 助记符 | 作用 |
|------|--------|------|
| 2A | aload_0 | 加载 slot 0（this）到栈 |
| B7 00 01 | invokespecial #1 | 调用 Object.\<init\> |
| B1 | return | void 返回 |

**LineNumberTable**：1 对映射 → 字节码偏移 0 对应源码第 6 行。

**LocalVariableTable**：1 项 — slot 0、`this`、类型 `L...TulingByteCode;`。

### 9.3 getUserName

方法头：`00 01 00 0E 00 0F 00 01` → public、#14 getUserName、#15 ()Ljava/lang/String;

指令 `2A B4 00 02 B0`：

| 字节 | 助记符 | 作用 |
|------|--------|------|
| 2A | aload_0 | this |
| B4 00 02 | getfield #2 | 读 userName |
| B0 | areturn | 返回引用 |

LineNumberTable：偏移 0 → 源码第 11 行。

### 9.4 setUserName

方法头：`00 01 00 10 00 11 00 02` → public、#16 setUserName、#17 (Ljava/lang/String;)V、**2 个属性**（Code + MethodParameters）。

Code 关键字段：

| 字段 | 值 |
|------|-----|
| max_stack | 2 |
| max_locals | 2（this + userName） |
| code | `2A 2B B5 00 02 B1` |

| 字节 | 助记符 | 作用 |
|------|--------|------|
| 2A | aload_0 | this |
| 2B | aload_1 | 参数 userName |
| B5 00 02 | putfield #2 | this.userName = ... |
| B1 | return | void |

**LocalVariableTable** 2 项：slot 0 `this`；slot 1 `userName`。

**MethodParameters**（Java 8+）：记录参数名 `userName` 与访问标志，供反射 `Parameter.getName()` 使用。

```json
{
  "attribute_name_index": "#18 MethodParameters",
  "parameter_count": 1,
  "parameter_name_index": "#5 userName",
  "access_flags": "0x0000"
}
```

![setUserName 方法结构](/性能调优/jvm-05-classfile-bytecode/p062-02.png)

---

## 十、类文件级属性

本例 **1 个属性**：**SourceFile**

```text
00 01 00 13 00 00 00 02 00 14
```

- attribute_name → #19 SourceFile
- length 2
- sourcefile_index → #20 TulingByteCode.java

---

## 十一、Class 文件结构速查（参照表）

![Class 文件结构参照表（上）](/性能调优/jvm-05-classfile-bytecode__class文件结构参照表全集/p001-01.png)

![Class 文件结构参照表（中）](/性能调优/jvm-05-classfile-bytecode__class文件结构参照表全集/p001-02.png)

![字段/方法/属性结构](/性能调优/jvm-05-classfile-bytecode__class文件结构参照表全集/p001-03.png)

**Field / Method 访问标志**（节选）：

| 标志 | 值 | 说明 |
|------|-----|------|
| ACC_PUBLIC | 0x0001 | public |
| ACC_PRIVATE | 0x0002 | private |
| ACC_PROTECTED | 0x0004 | protected |
| ACC_STATIC | 0x0008 | static |
| ACC_FINAL | 0x0010 | final |

---

## 十二、实践建议

| 工具 | 用途 |
|------|------|
| `javap -verbose -c -p` | 快速看常量池与字节码 |
| **jclasslib** / **IDEA Bytecode Viewer** | 图形化对照结构体 |
| 十六进制编辑器 | 验证魔数、版本、单条 cp_info |

读懂 Class 文件后，可继续学习 [执行引擎如何解释/编译这些指令](/性能调优/jvm/jvm-06-execution-engine)，以及 `invokedynamic`、Lambda 生成类在常量池中的形态（JDK 8+ 扩展）。

---

## 附录：本类常量池完整索引（javap）

```text
#1  Methodref   #4.#21   Object."<init>":()V
#2  Fieldref    #3.#22   TulingByteCode.userName:Ljava/lang/String;
#3  Class       #23      TulingByteCode
#4  Class       #24      java/lang/Object
#5–#20  Utf8 字面量（字段名、描述符、Code、源文件等）
#21 NameAndType #7:#8    "<init>":()V
#22 NameAndType #5:#6    userName:Ljava/lang/String;
#23 Utf8  com/tuling/.../TulingByteCode
#24 Utf8  java/lang/Object
```

与 [类加载](/性能调优/jvm/jvm-02-classloader) 中「运行时常量池」的关系：Class 文件常量池在加载后进入方法区 **运行时常量池**，动态链接时符号引用可能解析为直接引用。
