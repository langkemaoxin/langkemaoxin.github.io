---
title: "实现归并排序算法"
sidebarGroup: "数据结构与算法"
shortTitle: "实现归并排序算法"
order: 852
date: 2026-01-17
category: "面试题"
tag:
  - "面试题"
description: "归并排序（Merge Sort）是一种基于分治法的排序算法。它将数组分成两个子数组，分别排序，然后合并这两个子数组。归并排序的时间复杂度为O(n log n)，并且是稳定的排序算法。以下是详细的代码示例和解释：归并排序实现思路：将数组分成两"
article: false
---

> 来源：[实现归并排序算法](https://www.yuque.com/tulingzhouyu/db22bv/ufwsc029nbpf4ofn)

归并排序（Merge Sort）是一种基于分治法的排序算法。它将数组分成两个子数组，分别排序，然后合并这两个子数组。归并排序的时间复杂度为O(n log n)，并且是稳定的排序算法。以下是详细的代码示例和解释：

### 归并排序实现

1. **思路**：

- 将数组分成两半，递归地对每一半进行归并排序。
- 合并两个已排序的子数组。

1. **代码示例**：

```java
public class MergeSortExample {  
    // 归并排序主方法  
    public static void mergeSort(int[] arr, int left, int right) {  
        if (left < right) {  
            // 计算中间索引  
            int mid = left + (right - left) / 2;  

            // 递归排序左半部分  
            mergeSort(arr, left, mid);  
            // 递归排序右半部分  
            mergeSort(arr, mid + 1, right);  

            // 合并两个已排序的子数组  
            merge(arr, left, mid, right);  
        }  
    }  

    // 合并两个子数组的方法  
    private static void merge(int[] arr, int left, int mid, int right) {  
        // 找出两个子数组的大小  
        int n1 = mid - left + 1;  
        int n2 = right - mid;  

        // 创建临时数组  
        int[] L = new int[n1];  
        int[] R = new int[n2];  

        // 将数据复制到临时数组  
        for (int i = 0; i < n1; i++) {  
            L[i] = arr[left + i];  
        }  
        for (int j = 0; j < n2; j++) {  
            R[j] = arr[mid + 1 + j];  
        }  

        // 合并临时数组  

        // 初始索引  
        int i = 0, j = 0;  
        int k = left;  

        while (i < n1 && j < n2) {  
            if (L[i] <= R[j]) {  
                arr[k] = L[i];  
                i++;  
            } else {  
                arr[k] = R[j];  
                j++;  
            }  
            k++;  
        }  

        // 复制剩余元素  
        while (i < n1) {  
            arr[k] = L[i];  
            i++;  
            k++;  
        }  

        while (j < n2) {  
            arr[k] = R[j];  
            j++;  
            k++;  
        }  
    }  

    public static void main(String[] args) {  
        int[] arr = {12, 11, 13, 5, 6, 7};  
        System.out.println("Unsorted array:");  
        printArray(arr);  

        mergeSort(arr, 0, arr.length - 1);  

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

1. **mergeSort方法**：

- **参数**：`int[] arr`是待排序的数组，`int left`是起始索引，`int right`是结束索引。
- **递归条件**：`if (left ，当起始索引小于结束索引时，继续排序。
- **计算中间索引**：`int mid = left + (right - left) / 2;`。
- **递归调用**：

- 对左半部分进行归并排序：`mergeSort(arr, left, mid)`。
- 对右半部分进行归并排序：`mergeSort(arr, mid + 1, right)`。

- **合并两个子数组**：调用`merge(arr, left, mid, right)`。

1. **merge方法**：

- **参数**：`int[] arr`是待合并的数组，`int left`是左子数组的起始索引，`int mid`是中间索引，`int right`是右子数组的结束索引。
- **创建临时数组**：`int[] L`和`int[] R`用于存储左右子数组。
- **复制数据到临时数组**：将左右子数组的数据复制到临时数组`L`和`R`。
- **合并临时数组**：

- 使用两个索引`i`和`j`遍历临时数组`L`和`R`。
- 比较`L[i]`和`R[j]`，将较小的元素放入原数组`arr`。
- 继续合并直到一个临时数组耗尽。

- **复制剩余元素**：将未耗尽的临时数组的剩余元素复制到`arr`。

1. **main方法**：

- 创建一个未排序的数组`arr`。
- 调用`mergeSort`方法对数组进行排序。
- 打印排序前和排序后的数组。

通过这种方式，我们可以高效地对数组进行排序，归并排序的时间复杂度为O(n log n)。
