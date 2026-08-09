---
title: "给定一个数组，找出其中和为特定值的两个数"
sidebarGroup: "数据结构与算法"
shortTitle: "给定一个数组，找出其中和为特定值的两个数"
order: 865
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "要在一个数组中找到和为特定值的两个数，可以使用哈希表来实现。这种方法的时间复杂度为O(n)，因为我们只需遍历数组一次。以下是详细的代码示例和解释：找出和为特定值的两个数思路：使用一个哈希表来存储数组中已经访问过的元素及其索引。对于每个元素，"
article: false
---

> 来源：[给定一个数组，找出其中和为特定值的两个数](https://www.yuque.com/tulingzhouyu/db22bv/sa0o3gzrwqktiuqc)

要在一个数组中找到和为特定值的两个数，可以使用哈希表来实现。这种方法的时间复杂度为O(n)，因为我们只需遍历数组一次。以下是详细的代码示例和解释：

### 找出和为特定值的两个数

1. **思路**：

- 使用一个哈希表来存储数组中已经访问过的元素及其索引。
- 对于每个元素，计算其与目标和的差值。
- 检查差值是否在哈希表中存在，如果存在，则找到了两个数。
- 如果不存在，将当前元素及其索引存入哈希表。

1. **代码示例**：

```java
import java.util.HashMap;  
import java.util.Map;  

public class TwoSumExample {  
    // 找出和为特定值的两个数的方法  
    public static int[] twoSum(int[] nums, int target) {  
        // 创建一个哈希表来存储数值和索引  
        Map<Integer, Integer> map = new HashMap<>();  

        // 遍历数组  
        for (int i = 0; i < nums.length; i++) {  
            int complement = target - nums[i]; // 计算差值  

            // 检查差值是否在哈希表中  
            if (map.containsKey(complement)) {  
                // 如果存在，返回两个数的索引  
                return new int[] { map.get(complement), i };  
            }  

            // 如果不存在，将当前元素及其索引存入哈希表  
            map.put(nums[i], i);  
        }  

        // 如果没有找到，返回空数组  
        return new int[] {};  
    }  

    public static void main(String[] args) {  
        int[] nums = {2, 7, 11, 15};  
        int target = 9;  

        int[] result = twoSum(nums, target);  

        if (result.length == 2) {  
            System.out.println("Indices: " + result[0] + ", " + result[1]);  
        } else {  
            System.out.println("No two sum solution found.");  
        }  
    }  
}
```

### 详细解释

1. **twoSum方法**：

- **参数**：`int[] nums`是输入数组，`int target`是目标和。
- **哈希表初始化**：`Map map = new HashMap<>();`用于存储数组元素及其索引。
- **遍历数组**：

- 对于每个元素`nums[i]`，计算其与目标和的差值`complement = target - nums[i]`。
- **检查差值**：使用`map.containsKey(complement)`检查差值是否在哈希表中。

- 如果存在，返回两个数的索引`return new int[] { map.get(complement), i };`。

- **存储元素**：如果差值不存在，将当前元素及其索引存入哈希表`map.put(nums[i], i);`。

- **返回结果**：如果没有找到符合条件的两个数，返回空数组`return new int[] {};`。

1. **main方法**：

- 创建一个数组`nums`和一个目标和`target`。
- 调用`twoSum`方法获取结果。
- 打印结果索引，如果没有找到，输出提示信息。

通过这种方法，我们可以高效地找到数组中和为特定值的两个数，时间复杂度为O(n)。
