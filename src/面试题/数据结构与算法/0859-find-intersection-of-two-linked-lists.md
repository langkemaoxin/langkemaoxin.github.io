---
title: "找出两个单链表的交点"
sidebarGroup: "数据结构与算法"
shortTitle: "找出两个单链表的交点"
order: 859
date: 2026-04-05
category: "面试题"
tag:
  - "面试题"
description: "找出两个单链表的交点是一个常见的问题，可以通过双指针法来解决。以下是详细的代码示例和解释：双指针法思路：使用两个指针pA和pB分别遍历两个链表。当pA到达链表A的末尾时，将其重定位到链表B的头部。当pB到达链表B的末尾时，将其重定位到链表A"
article: false
---

> 来源：[找出两个单链表的交点](https://www.yuque.com/tulingzhouyu/db22bv/ms89el2zzsnq3poq)

找出两个单链表的交点是一个常见的问题，可以通过双指针法来解决。以下是详细的代码示例和解释：

### 双指针法

1. **思路**：

- 使用两个指针`pA`和`pB`分别遍历两个链表。
- 当`pA`到达链表A的末尾时，将其重定位到链表B的头部。
- 当`pB`到达链表B的末尾时，将其重定位到链表A的头部。
- 如果两个链表相交，`pA`和`pB`将在交点相遇。
- 如果不相交，`pA`和`pB`将在遍历完两个链表后同时到达`null`。

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

public class LinkedListIntersection {  
    // 找出两个链表的交点  
    public static ListNode getIntersectionNode(ListNode headA, ListNode headB) {  
        if (headA == null || headB == null) {  
            return null; // 如果任一链表为空，则不可能有交点  
        }  

        ListNode pA = headA; // 指针pA初始化为链表A的头节点  
        ListNode pB = headB; // 指针pB初始化为链表B的头节点  

        // 遍历两个链表  
        while (pA != pB) {  
            // 如果pA到达链表A的末尾，则重定位到链表B的头部  
            pA = (pA == null) ? headB : pA.next;  
            // 如果pB到达链表B的末尾，则重定位到链表A的头部  
            pB = (pB == null) ? headA : pB.next;  
        }  

        // 返回交点节点或null  
        return pA;  
    }  

    public static void main(String[] args) {  
        // 创建链表A: 1 -> 2 -> 3  
        ListNode headA = new ListNode(1);  
        headA.next = new ListNode(2);  
        headA.next.next = new ListNode(3);  

        // 创建链表B: 6 -> 7  
        ListNode headB = new ListNode(6);  
        headB.next = new ListNode(7);  

        // 创建交点: 8 -> 9  
        ListNode intersection = new ListNode(8);  
        intersection.next = new ListNode(9);  

        // 将交点连接到链表A和链表B  
        headA.next.next.next = intersection;  
        headB.next.next = intersection;  

        // 找出交点  
        ListNode intersectNode = getIntersectionNode(headA, headB);  

        if (intersectNode != null) {  
            System.out.println("The intersection node's value is: " + intersectNode.val);  
        } else {  
            System.out.println("The two linked lists do not intersect.");  
        }  
    }  
}
```

### 详细解释

1. **ListNode类**：

- `int val`: 存储节点的值。
- `ListNode next`: 指向下一个节点的指针。
- 构造函数`ListNode(int val)`: 初始化节点的值，并将`next`指针设为`null`。

1. **getIntersectionNode方法**：

- **初始检查**：如果任一链表为空，则不可能有交点，直接返回`null`。
- **初始化指针**：

- `pA`指针初始化为链表A的头节点。
- `pB`指针初始化为链表B的头节点。

- **循环遍历**：

- `while (pA != pB)`: 遍历两个链表，直到`pA`和`pB`相等。
- `pA = (pA == null) ? headB : pA.next`: 如果`pA`到达链表A的末尾，则重定位到链表B的头部。
- `pB = (pB == null) ? headA : pB.next`: 如果`pB`到达链表B的末尾，则重定位到链表A的头部。

- **返回结果**：返回交点节点或`null`。

1. **main方法**：

- 创建两个链表A和B，并在它们之间创建一个交点。
- 调用`getIntersectionNode`方法找出交点，并输出结果。

这种方法的时间复杂度为O(n + m)，空间复杂度为O(1)，其中n和m分别是两个链表的长度。通过这种方式，我们可以高效地找出两个单链表的交点。
