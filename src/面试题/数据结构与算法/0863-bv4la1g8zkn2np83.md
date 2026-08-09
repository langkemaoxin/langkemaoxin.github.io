---
title: "实现二叉树的前序、中序和后序遍历（递归和非递归方式）"
sidebarGroup: "数据结构与算法"
shortTitle: "实现二叉树的前序、中序和后序遍历（递归和非递归方式）"
order: 863
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "实现二叉树的前序、中序和后序遍历可以通过递归和非递归两种方式来完成。以下是详细的代码示例和解释：二叉树节点类class TreeNode {       int val; // 节点的值       TreeNode left; // 左子"
article: false
---

> 来源：[实现二叉树的前序、中序和后序遍历（递归和非递归方式）](https://www.yuque.com/tulingzhouyu/db22bv/bv4la1g8zkn2np83)

实现二叉树的前序、中序和后序遍历可以通过递归和非递归两种方式来完成。以下是详细的代码示例和解释：

### 二叉树节点类

```java
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
```

### 递归方式

#### 前序遍历（递归）

```java
public static void preorderTraversalRecursive(TreeNode node) {  
    if (node == null) {  
        return;  
    }  
    System.out.print(node.val + " "); // 访问根节点  
    preorderTraversalRecursive(node.left); // 递归遍历左子树  
    preorderTraversalRecursive(node.right); // 递归遍历右子树  
}
```

#### 中序遍历（递归）

```java
public static void inorderTraversalRecursive(TreeNode node) {  
    if (node == null) {  
        return;  
    }  
    inorderTraversalRecursive(node.left); // 递归遍历左子树  
    System.out.print(node.val + " "); // 访问根节点  
    inorderTraversalRecursive(node.right); // 递归遍历右子树  
}
```

#### 后序遍历（递归）

```java
public static void postorderTraversalRecursive(TreeNode node) {  
    if (node == null) {  
        return;  
    }  
    postorderTraversalRecursive(node.left); // 递归遍历左子树  
    postorderTraversalRecursive(node.right); // 递归遍历右子树  
    System.out.print(node.val + " "); // 访问根节点  
}
```

### 非递归方式

#### 前序遍历（非递归）

```java
import java.util.Stack;  

public static void preorderTraversalIterative(TreeNode root) {  
    if (root == null) {  
        return;  
    }  
    Stack&lt;TreeNode&gt; stack = new Stack<>();  
    stack.push(root);  

    while (!stack.isEmpty()) {  
        TreeNode node = stack.pop();  
        System.out.print(node.val + " "); // 访问根节点  

        if (node.right != null) {  
            stack.push(node.right); // 先将右子节点入栈  
        }  
        if (node.left != null) {  
            stack.push(node.left); // 再将左子节点入栈  
        }  
    }  
}
```

#### 中序遍历（非递归）

```java
import java.util.Stack;  

public static void inorderTraversalIterative(TreeNode root) {  
    Stack&lt;TreeNode&gt; stack = new Stack<>();  
    TreeNode current = root;  

    while (current != null || !stack.isEmpty()) {  
        while (current != null) {  
            stack.push(current); // 将左子节点入栈  
            current = current.left;  
        }  
        current = stack.pop();  
        System.out.print(current.val + " "); // 访问根节点  
        current = current.right; // 转向右子节点  
    }  
}
```

#### 后序遍历（非递归）

```java
import java.util.Stack;  

public static void postorderTraversalIterative(TreeNode root) {  
    if (root == null) {  
        return;  
    }  
    Stack&lt;TreeNode&gt; stack = new Stack<>();  
    Stack&lt;TreeNode&gt; output = new Stack<>();  
    stack.push(root);  

    while (!stack.isEmpty()) {  
        TreeNode node = stack.pop();  
        output.push(node);  

        if (node.left != null) {  
            stack.push(node.left); // 将左子节点入栈  
        }  
        if (node.right != null) {  
            stack.push(node.right); // 将右子节点入栈  
        }  
    }  

    while (!output.isEmpty()) {  
        System.out.print(output.pop().val + " "); // 访问根节点  
    }  
}
```

### 详细解释

1. **递归方式**：

- **前序遍历**：访问根节点，然后递归遍历左子树和右子树。
- **中序遍历**：递归遍历左子树，访问根节点，然后递归遍历右子树。
- **后序遍历**：递归遍历左子树和右子树，然后访问根节点。

1. **非递归方式**：

- **前序遍历**：使用栈来模拟递归，先访问根节点，然后将右子节点和左子节点依次入栈。
- **中序遍历**：使用栈来模拟递归，先将左子节点入栈，访问根节点后转向右子节点。
- **后序遍历**：使用两个栈，一个用于遍历，一个用于存储访问顺序，最后输出访问顺序。

通过这些方法，我们可以实现二叉树的前序、中序和后序遍历，既可以使用递归方式，也可以使用非递归方式。
