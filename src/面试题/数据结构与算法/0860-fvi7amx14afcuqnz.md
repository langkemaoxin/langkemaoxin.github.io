---
title: "检测单链表中是否有环"
sidebarGroup: "数据结构与算法"
shortTitle: "检测单链表中是否有环"
order: 860
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "检测单链表中是否存在环是一个经典的问题，可以使用“快慢指针”方法来解决。这种方法也被称为“龟兔赛跑”算法。以下是详细的代码示例和解释：快慢指针方法思路：使用两个指针：slow和fast。slow指针每次移动一步，fast指针每次移动两步。如"
article: false
---

> 来源：[检测单链表中是否有环](https://www.yuque.com/tulingzhouyu/db22bv/fvi7amx14afcuqnz)

检测单链表中是否存在环是一个经典的问题，可以使用“快慢指针”方法来解决。这种方法也被称为“龟兔赛跑”算法。以下是详细的代码示例和解释：

### 快慢指针方法

1. **思路**：

- 使用两个指针：`slow`和`fast`。
- `slow`指针每次移动一步，`fast`指针每次移动两步。
- 如果链表中存在环，`fast`指针最终会与`slow`指针相遇。
- 如果链表中没有环，`fast`指针会在到达链表末尾时变为`null`。

1. **代码示例**：

```java
class ListNode {  
    int val; // 节点的值  
    ListNode next; // 指向下一个节点的指针  

    ListNode(int val) {  
        this.val = val;  
        this.next = null; // 初始化时，next指针指向null  
    }  
}  

public class LinkedListCycleDetection {  
    // 检测链表中是否有环的方法  
    public static boolean hasCycle(ListNode head) {  
        if (head == null || head.next == null) {  
            return false; // 如果链表为空或只有一个节点，则不可能有环  
        }  

        ListNode slow = head; // 慢指针初始化为头节点  
        ListNode fast = head; // 快指针初始化为头节点  

        // 遍历链表  
        while (fast != null && fast.next != null) {  
            slow = slow.next; // 慢指针每次移动一步  
            fast = fast.next.next; // 快指针每次移动两步  

            if (slow == fast) {  
                return true; // 如果快慢指针相遇，则链表中有环  
            }  
        }  

        return false; // 如果快指针到达链表末尾，则链表中没有环  
    }  

    public static void main(String[] args) {  
        // 创建链表 1 -> 2 -> 3 -> 4 -> 5  
        ListNode head = new ListNode(1);  
        head.next = new ListNode(2);  
        head.next.next = new ListNode(3);  
        head.next.next.next = new ListNode(4);  
        head.next.next.next.next = new ListNode(5);  

        // 创建一个环：5 -> 3  
        head.next.next.next.next.next = head.next.next;  

        if (hasCycle(head)) {  
            System.out.println("The linked list has a cycle.");  
        } else {  
            System.out.println("The linked list does not have a cycle.");  
        }  
    }  
}
```

### 详细解释

1. **ListNode类**：

- `int val`: 存储节点的值。
- `ListNode next`: 指向下一个节点的指针。
- 构造函数`ListNode(int val)`: 初始化节点的值，并将`next`指针设为`null`。

1. **hasCycle方法**：

- **初始检查**：如果链表为空或只有一个节点，则不可能有环，直接返回`false`。
- **初始化指针**：

- `slow`和`fast`都初始化为头节点。

- **循环遍历**：

- `while (fast != null && fast.next != null)`: 遍历链表，直到`fast`指针到达链表末尾。
- `slow = slow.next`: 慢指针每次移动一步。
- `fast = fast.next.next`: 快指针每次移动两步。
- 如果`slow`和`fast`相遇，则链表中存在环，返回`true`。

- **返回结果**：如果循环结束且没有相遇，返回`false`，表示链表中没有环。

1. **main方法**：

- 创建一个链表`1 -> 2 -> 3 -> 4 -> 5`。
- 手动创建一个环，使节点`5`指向节点`3`。
- 调用`hasCycle`方法检测链表中是否有环，并输出结果。

这种方法的时间复杂度为O(n)，空间复杂度为O(1)，因为它只使用了常量级别的额外空间来存储指针。通过这种方式，我们可以高效地检测单链表中是否存在环。
