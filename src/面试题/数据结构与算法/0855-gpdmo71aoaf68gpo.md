---
title: "实现一个简单的字符串匹配算法"
sidebarGroup: "数据结构与算法"
shortTitle: "实现一个简单的字符串匹配算法"
order: 855
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "实现一个简单的字符串匹配算法可以使用朴素的字符串匹配方法（也称为暴力匹配法）。这种方法的基本思想是从目标字符串的每一个位置开始，尝试匹配模式字符串，直到找到匹配或遍历完整个目标字符串。以下是详细的代码示例和解释：朴素字符串匹配算法实现思路："
article: false
---

> 来源：[实现一个简单的字符串匹配算法](https://www.yuque.com/tulingzhouyu/db22bv/gpdmo71aoaf68gpo)

实现一个简单的字符串匹配算法可以使用朴素的字符串匹配方法（也称为暴力匹配法）。这种方法的基本思想是从目标字符串的每一个位置开始，尝试匹配模式字符串，直到找到匹配或遍历完整个目标字符串。以下是详细的代码示例和解释：

### 朴素字符串匹配算法实现

1. **思路**：

- 遍历目标字符串，从每一个可能的起始位置开始，尝试匹配模式字符串。
- 如果从某个位置开始的子字符串与模式字符串完全匹配，则返回该起始位置。
- 如果遍历完整个目标字符串而没有找到匹配，则返回-1。

1. **代码示例**：

```java
public class NaiveStringMatching {  
    // 字符串匹配方法  
    public static int naiveStringMatch(String text, String pattern) {  
        int n = text.length(); // 目标字符串长度  
        int m = pattern.length(); // 模式字符串长度  

        // 遍历目标字符串  
        for (int i = 0; i <= n - m; i++) {  
            int j;  
            // 尝试匹配模式字符串  
            for (j = 0; j < m; j++) {  
                if (text.charAt(i + j) != pattern.charAt(j)) {  
                    break; // 如果不匹配，跳出循环  
                }  
            }  
            // 如果完全匹配，返回起始位置  
            if (j == m) {  
                return i;  
            }  
        }  
        // 如果没有找到匹配，返回-1  
        return -1;  
    }  

    public static void main(String[] args) {  
        String text = "hello world";  
        String pattern = "world";  

        int result = naiveStringMatch(text, pattern);  

        if (result != -1) {  
            System.out.println("Pattern found at index: " + result);  
        } else {  
            System.out.println("Pattern not found.");  
        }  
    }  
}
```

### 详细解释

1. **naiveStringMatch方法**：

- **参数**：`String text`是目标字符串，`String pattern`是模式字符串。
- **长度计算**：`int n = text.length();`和`int m = pattern.length();`分别计算目标字符串和模式字符串的长度。
- **遍历目标字符串**：

- `for (int i = 0; i ：从目标字符串的每一个可能的起始位置开始，尝试匹配模式字符串。
- **匹配模式字符串**：

- `for (j = 0; j ：遍历模式字符串的每一个字符。
- `if (text.charAt(i + j) != pattern.charAt(j))`：如果当前字符不匹配，跳出循环。

- **检查匹配结果**：

- `if (j == m)`：如果`j`等于模式字符串的长度，说明完全匹配，返回起始位置`i`。

- **返回结果**：如果没有找到匹配，返回-1。

1. **main方法**：

- 创建目标字符串`text`和模式字符串`pattern`。
- 调用`naiveStringMatch`方法获取结果。
- 打印结果索引，如果没有找到，输出提示信息。

通过这种方法，我们可以实现一个简单的字符串匹配算法，时间复杂度为O(n * m)，其中n是目标字符串的长度，m是模式字符串的长度。
