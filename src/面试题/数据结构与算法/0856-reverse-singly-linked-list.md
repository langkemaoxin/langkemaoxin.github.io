---
title: "反转一个单链表"
sidebarGroup: "数据结构与算法"
shortTitle: "反转一个单链表"
order: 856
date: 2026-04-29
category: "面试题"
tag:
  - "面试题"
description: "反转一个单链表是一个经典的面试题目，涉及到对链表节点的指针进行重新排列。以下是反转单链表的详细步骤和代码示例：反转单链表思路：使用三个指针：prev、current、和next。初始时，prev指向null，current指向链表的头节点。"
article: false
---

> 来源：[反转一个单链表](https://www.yuque.com/tulingzhouyu/db22bv/gmodckrw8s9t5bpg)

反转一个单链表是一个经典的面试题目，涉及到对链表节点的指针进行重新排列。以下是反转单链表的详细步骤和代码示例：

### 反转单链表

1. **思路**：

- 使用三个指针：`prev`、`current`、和`next`。
- 初始时，`prev`指向`null`，`current`指向链表的头节点。
- 在遍历链表时，逐个反转节点的指针方向。
- 最终，`prev`将指向新的头节点。

1. **步骤**：

- 保存当前节点的下一个节点。
- 将当前节点的`next`指针指向前一个节点。
- 移动`prev`和`current`指针到下一个节点。
- 重复上述步骤直到遍历完整个链表。

1. **代码示例**：

```java
class ListNode {  
    int val;  
    ListNode next;  

    ListNode(int val) {  
        this.val = val;  
        this.next = null;  
    }  
}  

public class LinkedListReversal {  
    public static ListNode reverseList(ListNode head) {  
        ListNode prev = null;  
        ListNode current = head;  
        ListNode next = null;  

        while (current != null) {  
            // 保存下一个节点  
            next = current.next;  
            // 反转当前节点的指针  
            current.next = prev;  
            // 移动指针  
            prev = current;  
            current = next;  
        }  
        // prev将是新的头节点  
        return prev;  
    }  

    public static void printList(ListNode head) {  
        ListNode current = head;  
        while (current != null) {  
            System.out.print(current.val + " ");  
            current = current.next;  
        }  
        System.out.println();  
    }  

    public static void main(String[] args) {  
        // 创建链表 1 -> 2 -> 3 -> 4 -> 5  
        ListNode head = new ListNode(1);  
        head.next = new ListNode(2);  
        head.next.next = new ListNode(3);  
        head.next.next.next = new ListNode(4);  
        head.next.next.next.next = new ListNode(5);  

        System.out.println("Original List:");  
        printList(head);  

        // 反转链表  
        ListNode reversedHead = reverseList(head);  

        System.out.println("Reversed List:");  
        printList(reversedHead);  
    }  
}
```

### 说明

- **ListNode类**：定义了链表节点的数据结构，包含一个整数值和一个指向下一个节点的指针。
- **reverseList方法**：实现了反转链表的逻辑，通过迭代方式反转链表。
- **printList方法**：用于打印链表的元素，帮助验证反转结果。

这种方法的时间复杂度为O(n)，空间复杂度为O(1)，因为它只使用了常量级别的额外空间来存储指针。通过这种方式，我们可以高效地反转一个单链表。
