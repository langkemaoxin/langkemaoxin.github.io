---
title: "实现快速排序算法"
sidebarGroup: "数据结构与算法"
shortTitle: "实现快速排序算法"
order: 851
date: 2026-04-29
category: "面试题"
tag:
  - "面试题"
description: "快速排序（QuickSort）是一种高效的排序算法，采用分治法策略。它的基本思想是选择一个“基准”元素，通过一趟排序将待排序序列分成两部分，其中一部分的所有元素都比基准元素小，另一部分的所有元素都比基准元素大，然后递归地对这两部分进行排序。"
article: false
---

> 来源：[实现快速排序算法](https://www.yuque.com/tulingzhouyu/db22bv/przpf1ercwlhumma)

快速排序（QuickSort）是一种高效的排序算法，采用分治法策略。它的基本思想是选择一个“基准”元素，通过一趟排序将待排序序列分成两部分，其中一部分的所有元素都比基准元素小，另一部分的所有元素都比基准元素大，然后递归地对这两部分进行排序。以下是详细的代码示例和解释：

### 快速排序实现

1. **思路**：

- 选择一个基准元素（通常选择数组的最后一个元素）。
- 通过分区操作将数组分为两部分：左边部分的元素都小于基准元素，右边部分的元素都大于基准元素。
- 递归地对左边和右边部分进行快速排序。

1. **代码示例**：

```java
public class QuickSortExample {  
    // 快速排序主方法  
    public static void quickSort(int[] arr, int low, int high) {  
        if (low < high) {  
            // 获取分区索引  
            int pi = partition(arr, low, high);  

            // 递归排序左子数组  
            quickSort(arr, low, pi - 1);  
            // 递归排序右子数组  
            quickSort(arr, pi + 1, high);  
        }  
    }  

    // 分区方法  
    private static int partition(int[] arr, int low, int high) {  
        int pivot = arr[high]; // 选择最后一个元素作为基准  
        int i = low - 1; // i是小于基准的元素的索引  

        for (int j = low; j < high; j++) {  
            // 如果当前元素小于或等于基准  
            if (arr[j] <= pivot) {  
                i++;  
                // 交换arr[i]和arr[j]  
                int temp = arr[i];  
                arr[i] = arr[j];  
                arr[j] = temp;  
            }  
        }  

        // 交换arr[i+1]和基准元素  
        int temp = arr[i + 1];  
        arr[i + 1] = arr[high];  
        arr[high] = temp;  

        return i + 1; // 返回分区索引  
    }  

    public static void main(String[] args) {  
        int[] arr = {10, 7, 8, 9, 1, 5};  
        int n = arr.length;  

        System.out.println("Unsorted array:");  
        printArray(arr);  

        quickSort(arr, 0, n - 1);  

        System.out.println("Sorted array:");  
        printArray(arr);  
    }  

    // 打印数组方法  
    private static void printArray(int[] arr) {  
        for (int value : arr) {  
            System.out.print(value + " ");  
        }  
        System.out.println();  
    }  
}
```

### 详细解释

1. **quickSort方法**：

- **参数**：`int[] arr`是待排序的数组，`int low`是起始索引，`int high`是结束索引。
- **递归条件**：`if (low ，当起始索引小于结束索引时，继续排序。
- **分区操作**：调用`partition`方法获取分区索引`pi`。
- **递归调用**：

- 对左子数组进行快速排序：`quickSort(arr, low, pi - 1)`。
- 对右子数组进行快速排序：`quickSort(arr, pi + 1, high)`。

1. **partition方法**：

- **选择基准**：选择数组的最后一个元素作为基准。
- **初始化索引**：`int i = low - 1`，用于标记小于基准的元素的索引。
- **遍历数组**：从`low`到`high-1`遍历数组。

- 如果当前元素小于或等于基准，增加`i`并交换`arr[i]`和`arr[j]`。

- **交换基准**：将基准元素与`arr[i+1]`交换。
- **返回分区索引**：返回`i + 1`作为新的分区索引。

1. **main方法**：

- 创建一个未排序的数组`arr`。
- 调用`quickSort`方法对数组进行排序。
- 打印排序前和排序后的数组。

通过这种方式，我们可以高效地对数组进行排序，快速排序的平均时间复杂度为O(n log n)。
