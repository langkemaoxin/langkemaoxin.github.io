---
title: "给定一个字符串，找出其中最长的回文子串"
sidebarGroup: "数据结构与算法"
shortTitle: "给定一个字符串，找出其中最长的回文子串"
order: 864
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "要找出一个字符串中的最长回文子串，可以使用中心扩展法。这个方法的基本思想是从每个字符（以及字符之间的空隙）作为中心，向两边扩展以寻找回文。以下是详细的代码示例和解释：中心扩展法实现思路：遍历字符串中的每个字符和每对相邻字符作为中心。从中心向"
article: false
---

> 来源：[给定一个字符串，找出其中最长的回文子串](https://www.yuque.com/tulingzhouyu/db22bv/ouqtgtt0rdbx3xz0)

要找出一个字符串中的最长回文子串，可以使用中心扩展法。这个方法的基本思想是从每个字符（以及字符之间的空隙）作为中心，向两边扩展以寻找回文。以下是详细的代码示例和解释：

### 中心扩展法实现

1. **思路**：

- 遍历字符串中的每个字符和每对相邻字符作为中心。
- 从中心向两边扩展，检查是否为回文。
- 记录最长的回文子串。

1. **代码示例**：

```java
public class LongestPalindromicSubstring {  
    // 找出最长回文子串的方法  
    public static String longestPalindrome(String s) {  
        if (s == null || s.length() < 1) {  
            return "";  
        }  

        int start = 0, end = 0; // 记录最长回文子串的起始和结束索引  

        for (int i = 0; i < s.length(); i++) {  
            // 以单个字符为中心扩展  
            int len1 = expandAroundCenter(s, i, i);  
            // 以两个相邻字符为中心扩展  
            int len2 = expandAroundCenter(s, i, i + 1);  
            // 取较长的回文长度  
            int len = Math.max(len1, len2);  

            // 更新最长回文子串的起始和结束索引  
            if (len > end - start) {  
                start = i - (len - 1) / 2;  
                end = i + len / 2;  
            }  
        }  

        return s.substring(start, end + 1);  
    }  

    // 中心扩展法  
    private static int expandAroundCenter(String s, int left, int right) {  
        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {  
            left--;  
            right++;  
        }  
        return right - left - 1; // 返回回文的长度  
    }  

    public static void main(String[] args) {  
        String s = "babad";  
        String result = longestPalindrome(s);  
        System.out.println("Longest palindromic substring: " + result);  
    }  
}
```

### 详细解释

1. **longestPalindrome方法**：

- **参数**：`String s`是输入字符串。
- **边界检查**：如果字符串为空或长度小于1，返回空字符串。
- **初始化**：`int start = 0, end = 0;`用于记录最长回文子串的起始和结束索引。
- **遍历字符串**：

- 对于每个字符`i`，尝试以`i`为中心扩展（单字符中心）和以`i`和`i+1`为中心扩展（双字符中心）。
- 调用`expandAroundCenter`方法计算从中心扩展得到的回文长度`len1`和`len2`。
- 取较长的回文长度`len = Math.max(len1, len2)`。
- 如果当前回文长度大于已记录的最长回文长度，更新`start`和`end`索引。

- **返回结果**：返回最长回文子串`return s.substring(start, end + 1);`。

1. **expandAroundCenter方法**：

- **参数**：`String s`是输入字符串，`int left`和`int right`是中心的左右索引。
- **扩展回文**：在`while`循环中，检查左右字符是否相等并且索引在有效范围内，若是则继续扩展。
- **返回长度**：返回扩展后的回文长度`right - left - 1`。

1. **main方法**：

- 创建一个字符串`s`。
- 调用`longestPalindrome`方法获取结果。
- 打印最长回文子串。

通过这种方法，我们可以高效地找出字符串中的最长回文子串，时间复杂度为O(n^2)。
