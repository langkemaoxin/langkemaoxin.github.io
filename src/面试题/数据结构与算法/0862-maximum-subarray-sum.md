---
title: "给定一个数组，找出其中的最大子数组和"
sidebarGroup: "数据结构与算法"
shortTitle: "给定一个数组，找出其中的最大子数组和"
order: 862
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "要找出一个数组中的最大子数组和，可以使用Kadane's算法。这种算法通过动态规划的思想，以线性时间复杂度O(n)解决问题。以下是详细的代码示例和解释：Kadane's算法实现思路：初始化两个变量：maxSoFar用于存储全局最大子数组和，"
article: false
---

> 来源：[给定一个数组，找出其中的最大子数组和](https://www.yuque.com/tulingzhouyu/db22bv/kwx4si8s733r6uzh)

要找出一个数组中的最大子数组和，可以使用Kadane's算法。这种算法通过动态规划的思想，以线性时间复杂度O(n)解决问题。以下是详细的代码示例和解释：

### Kadane's算法实现

1. **思路**：

- 初始化两个变量：`maxSoFar`用于存储全局最大子数组和，`maxEndingHere`用于存储当前子数组的最大和。
- 遍历数组，对于每个元素，更新`maxEndingHere`为当前元素与`maxEndingHere + 当前元素`的较大值。
- 更新`maxSoFar`为`maxSoFar`与`maxEndingHere`的较大值。
- 最终`maxSoFar`即为最大子数组和。

1. **代码示例**：

```java
public class MaximumSubarraySum {  
    // 找出最大子数组和的方法  
    public static int maxSubArray(int[] nums) {  
        if (nums == null || nums.length == 0) {  
            throw new IllegalArgumentException("Array is empty or null");  
        }  

        int maxSoFar = nums[0]; // 全局最大子数组和  
        int maxEndingHere = nums[0]; // 当前子数组的最大和  

        for (int i = 1; i < nums.length; i++) {  
            // 更新当前子数组的最大和  
            maxEndingHere = Math.max(nums[i], maxEndingHere + nums[i]);  
            // 更新全局最大子数组和  
            maxSoFar = Math.max(maxSoFar, maxEndingHere);  
        }  

        return maxSoFar;  
    }  

    public static void main(String[] args) {  
        int[] nums = {-2, 1, -3, 4, -1, 2, 1, -5, 4};  
        int result = maxSubArray(nums);  
        System.out.println("Maximum subarray sum: " + result);  
    }  
}
```

### 详细解释

1. **maxSubArray方法**：

- **参数**：`int[] nums`是输入数组。
- **边界检查**：如果数组为空或长度为0，抛出异常。
- **初始化**：

- `int maxSoFar = nums[0];`：初始化全局最大子数组和为数组的第一个元素。
- `int maxEndingHere = nums[0];`：初始化当前子数组的最大和为数组的第一个元素。

- **遍历数组**：

- 从第二个元素开始遍历数组。
- **更新当前子数组的最大和**：`maxEndingHere = Math.max(nums[i], maxEndingHere + nums[i]);`。

- 选择当前元素或将其加入当前子数组，取较大值。

- **更新全局最大子数组和**：`maxSoFar = Math.max(maxSoFar, maxEndingHere);`。

- 更新全局最大值为当前最大值与全局最大值的较大者。

- **返回结果**：返回全局最大子数组和`maxSoFar`。

1. **main方法**：

- 创建一个整数数组`nums`。
- 调用`maxSubArray`方法获取结果。
- 打印最大子数组和。

通过这种方法，我们可以高效地找出数组中的最大子数组和，时间复杂度为O(n)。
