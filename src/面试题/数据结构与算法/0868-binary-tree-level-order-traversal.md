---
title: "给定一个二叉树，实现层序遍历"
sidebarGroup: "数据结构与算法"
shortTitle: "给定一个二叉树，实现层序遍历"
order: 868
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "层序遍历（也称为广度优先遍历）是一种遍历二叉树的方式，按照从上到下、从左到右的顺序访问每一层的节点。可以使用队列来实现层序遍历。以下是详细的代码示例和解释：层序遍历实现思路：使用一个队列来辅助遍历。首先将根节点入队。当队列不为空时，取出队首"
article: false
---

> 来源：[给定一个二叉树，实现层序遍历](https://www.yuque.com/tulingzhouyu/db22bv/suo8y6zu2fpoxv6b)

层序遍历（也称为广度优先遍历）是一种遍历二叉树的方式，按照从上到下、从左到右的顺序访问每一层的节点。可以使用队列来实现层序遍历。以下是详细的代码示例和解释：

### 层序遍历实现

1. **思路**：

- 使用一个队列来辅助遍历。
- 首先将根节点入队。
- 当队列不为空时，取出队首节点，访问该节点，并将其左右子节点（如果存在）入队。
- 重复上述过程直到队列为空。

1. **代码示例**：

```java
import java.util.LinkedList;  
import java.util.Queue;  

// 定义二叉树节点类  
class TreeNode {  
    int val; // 节点的值  
    TreeNode left; // 左子节点  
    TreeNode right; // 右子节点  

    TreeNode(int val) {  
        this.val = val;  
        this.left = null;  
        this.right = null;  
    }  
}  

public class BinaryTreeLevelOrderTraversal {  
    // 层序遍历二叉树的方法  
    public static void levelOrderTraversal(TreeNode root) {  
        if (root == null) {  
            return; // 如果树为空，直接返回  
        }  

        Queue&lt;TreeNode&gt; queue = new LinkedList<>(); // 创建一个队列  
        queue.add(root); // 将根节点入队  

        while (!queue.isEmpty()) {  
            TreeNode currentNode = queue.poll(); // 取出队首节点  
            System.out.print(currentNode.val + " "); // 访问当前节点  

            // 如果左子节点不为空，将其入队  
            if (currentNode.left != null) {  
                queue.add(currentNode.left);  
            }  

            // 如果右子节点不为空，将其入队  
            if (currentNode.right != null) {  
                queue.add(currentNode.right);  
            }  
        }  
    }  

    public static void main(String[] args) {  
        // 创建二叉树  
        TreeNode root = new TreeNode(1);  
        root.left = new TreeNode(2);  
        root.right = new TreeNode(3);  
        root.left.left = new TreeNode(4);  
        root.left.right = new TreeNode(5);  
        root.right.left = new TreeNode(6);  
        root.right.right = new TreeNode(7);  

        System.out.println("Level Order Traversal:");  
        levelOrderTraversal(root); // 输出层序遍历结果  
    }  
}
```

### 详细解释

1. **TreeNode类**：

- `int val`: 存储节点的值。
- `TreeNode left, right`: 分别指向左子节点和右子节点。
- 构造函数`TreeNode(int val)`: 初始化节点的值，并将左右子节点设为`null`。

1. **levelOrderTraversal方法**：

- **初始检查**：如果树为空（`root == null`），直接返回。
- **初始化队列**：

- `Queue queue = new LinkedList<>();`：创建一个队列用于辅助遍历。
- `queue.add(root);`：将根节点入队。

- **循环遍历**：

- `while (!queue.isEmpty())`: 当队列不为空时，继续遍历。
- `TreeNode currentNode = queue.poll();`: 取出队首节点。
- `System.out.print(currentNode.val + " ");`: 访问当前节点并打印其值。
- 如果当前节点的左子节点不为空，将其入队。
- 如果当前节点的右子节点不为空，将其入队。

1. **main方法**：

- 创建一个二叉树。
- 调用`levelOrderTraversal`方法进行层序遍历，并输出结果。

通过这种方式，我们可以高效地实现二叉树的层序遍历，时间复杂度为O(n)，其中n是二叉树的节点数。
