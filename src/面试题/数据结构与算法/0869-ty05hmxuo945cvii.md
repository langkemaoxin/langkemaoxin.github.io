---
title: "在一个排序数组中查找一个数，如果不存在，返回它应该插入的位置"
sidebarGroup: "数据结构与算法"
shortTitle: "在一个排序数组中查找一个数，如果不存在，返回它应该插入的位置"
order: 869
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "在一个排序数组中查找一个数，并返回它的索引或应该插入的位置，可以使用二分查找算法。二分查找的时间复杂度为O(log n)，非常高效。以下是详细的代码示例和解释：二分查找实现思路：使用二分查找算法在排序数组中查找目标值。如果找到目标值，返回其"
article: false
---

> 来源：[在一个排序数组中查找一个数，如果不存在，返回它应该插入的位置](https://www.yuque.com/tulingzhouyu/db22bv/ty05hmxuo945cvii)

在一个排序数组中查找一个数，并返回它的索引或应该插入的位置，可以使用二分查找算法。二分查找的时间复杂度为O(log n)，非常高效。以下是详细的代码示例和解释：

### 二分查找实现

1. **思路**：

- 使用二分查找算法在排序数组中查找目标值。
- 如果找到目标值，返回其索引。
- 如果未找到目标值，返回它应该插入的位置，这个位置是第一个大于目标值的元素的索引。

1. **代码示例**：

```java
public class SearchInsertPosition {  
    // 查找目标值或插入位置的方法  
    public static int searchInsert(int[] nums, int target) {  
        int left = 0;  
        int right = nums.length - 1;  

        while (left <= right) {  
            int mid = left + (right - left) / 2; // 计算中间索引，防止溢出  
            if (nums[mid] == target) {  
                return mid; // 找到目标值，返回索引  
            } else if (nums[mid] < target) {  
                left = mid + 1; // 目标值在右半部分  
            } else {  
                right = mid - 1; // 目标值在左半部分  
            }  
        }  

        // 未找到目标值，返回插入位置  
        return left;  
    }  

    public static void main(String[] args) {  
        int[] nums = {1, 3, 5, 6};  
        int target1 = 5;  
        int target2 = 2;  
        int target3 = 7;  
        int target4 = 0;  

        System.out.println("Index of target 5: " + searchInsert(nums, target1)); // 输出 2  
        System.out.println("Index of target 2: " + searchInsert(nums, target2)); // 输出 1  
        System.out.println("Index of target 7: " + searchInsert(nums, target3)); // 输出 4  
        System.out.println("Index of target 0: " + searchInsert(nums, target4)); // 输出 0  
    }  
}
```

### 详细解释

1. **searchInsert方法**：

- **初始化指针**：

- `int left = 0;`：初始化左指针为数组的起始位置。
- `int right = nums.length - 1;`：初始化右指针为数组的末尾位置。

- **二分查找循环**：

- `while (left : 当左指针不超过右指针时，继续查找。
- `int mid = left + (right - left) / 2;`: 计算中间索引，使用这种方式防止整数溢出。
- **比较中间值与目标值**：

- `if (nums[mid] == target)`: 如果中间值等于目标值，返回中间索引。
- `else if (nums[mid] : 如果中间值小于目标值，目标值在右半部分，移动左指针到`mid + 1`。
- `else`: 如果中间值大于目标值，目标值在左半部分，移动右指针到`mid - 1`。

- **返回插入位置**：

- 当循环结束时，`left`指针指向目标值应该插入的位置。

1. **main方法**：

- 创建一个排序数组`nums`。
- 测试不同的目标值，调用`searchInsert`方法，并输出结果。

通过这种方式，我们可以高效地在排序数组中查找目标值或确定其插入位置，时间复杂度为O(log n)。
