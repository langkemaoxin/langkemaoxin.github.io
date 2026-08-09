---
title: "判断一棵二叉树是否是平衡二叉树"
sidebarGroup: "数据结构与算法"
shortTitle: "判断一棵二叉树是否是平衡二叉树"
order: 854
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "判断一棵二叉树是否是平衡二叉树（即AVL树）是一个常见的问题。平衡二叉树的定义是：对于树中的每个节点，其左右子树的高度差不超过1。我们可以通过递归的方法来判断一棵二叉树是否是平衡的。以下是详细的代码示例和解释：判断平衡二叉树实现思路：使用递"
article: false
---

> 来源：[判断一棵二叉树是否是平衡二叉树](https://www.yuque.com/tulingzhouyu/db22bv/gxmiy6qo3n4d88lz)

判断一棵二叉树是否是平衡二叉树（即AVL树）是一个常见的问题。平衡二叉树的定义是：对于树中的每个节点，其左右子树的高度差不超过1。我们可以通过递归的方法来判断一棵二叉树是否是平衡的。以下是详细的代码示例和解释：

### 判断平衡二叉树实现

1. **思路**：

- 使用递归的方法来计算每个节点的高度。
- 在计算高度的过程中，检查每个节点的左右子树的高度差是否超过1。
- 如果超过1，则该树不是平衡二叉树。

1. **代码示例**：

```java
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

public class BalancedBinaryTree {  
    // 判断二叉树是否是平衡二叉树的方法  
    public static boolean isBalanced(TreeNode root) {  
        return checkHeight(root) != -1;  
    }  

    // 检查节点高度的方法  
    private static int checkHeight(TreeNode node) {  
        if (node == null) {  
            return 0; // 空节点的高度为0  
        }  

        // 递归计算左子树的高度  
        int leftHeight = checkHeight(node.left);  
        if (leftHeight == -1) {  
            return -1; // 如果左子树不平衡，返回-1  
        }  

        // 递归计算右子树的高度  
        int rightHeight = checkHeight(node.right);  
        if (rightHeight == -1) {  
            return -1; // 如果右子树不平衡，返回-1  
        }  

        // 检查当前节点的左右子树高度差  
        if (Math.abs(leftHeight - rightHeight) > 1) {  
            return -1; // 如果高度差超过1，返回-1  
        }  

        // 返回当前节点的高度  
        return Math.max(leftHeight, rightHeight) + 1;  
    }  

    public static void main(String[] args) {  
        // 创建一个平衡二叉树  
        TreeNode root = new TreeNode(1);  
        root.left = new TreeNode(2);  
        root.right = new TreeNode(3);  
        root.left.left = new TreeNode(4);  
        root.left.right = new TreeNode(5);  
        root.right.left = new TreeNode(6);  
        root.right.right = new TreeNode(7);  

        System.out.println("Is the tree balanced? " + isBalanced(root)); // 输出 true  

        // 创建一个不平衡二叉树  
        TreeNode unbalancedRoot = new TreeNode(1);  
        unbalancedRoot.left = new TreeNode(2);  
        unbalancedRoot.left.left = new TreeNode(3);  

        System.out.println("Is the tree balanced? " + isBalanced(unbalancedRoot)); // 输出 false  
    }  
}
```

### 详细解释

1. **TreeNode类**：

- `int val`: 存储节点的值。
- `TreeNode left, right`: 分别指向左子节点和右子节点。
- 构造函数`TreeNode(int val)`: 初始化节点的值，并将左右子节点设为`null`。

1. **isBalanced方法**：

- 调用`checkHeight`方法来检查树的高度。
- 如果`checkHeight`返回-1，表示树不平衡，返回`false`；否则返回`true`。

1. **checkHeight方法**：

- **初始检查**：如果节点为空，返回高度0。
- **递归计算左子树高度**：调用`checkHeight(node.left)`。

- 如果返回-1，表示左子树不平衡，直接返回-1。

- **递归计算右子树高度**：调用`checkHeight(node.right)`。

- 如果返回-1，表示右子树不平衡，直接返回-1。

- **检查高度差**：如果左右子树高度差超过1，返回-1。
- **返回节点高度**：返回左右子树高度的最大值加1。

1. **main方法**：

- 创建一个平衡二叉树并检查其是否平衡。
- 创建一个不平衡二叉树并检查其是否平衡。

通过这种方式，我们可以高效地判断一棵二叉树是否是平衡的，时间复杂度为O(n)，其中n是二叉树的节点数。
