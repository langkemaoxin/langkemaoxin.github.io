---
title: "电商产品详情接口并发编排提升性能"
sidebarGroup: "项目亮点和难点"
shortTitle: "电商产品详情接口并发编排提升性能"
order: 27
date: 2026-08-02
category: "面试题"
tag:
  - "面试题"
description: "在现代软件开发中，很多时候我们需要在一个接口中调用多个服务来汇总结果，这种情况下使用并发编排可以显著提升接口性能。CompletableFuture 是 Java 中一个非常强大的工具，用于处理异步编程和并发流。通过它，我们可以在后台执行任"
article: false
---

> 来源：[电商产品详情接口并发编排提升性能](https://www.yuque.com/tulingzhouyu/db22bv/cplcclxcob1sg07b)

在现代软件开发中，很多时候我们需要在一个接口中调用多个服务来汇总结果，这种情况下使用并发编排可以显著提升接口性能。`CompletableFuture` 是 Java 中一个非常强大的工具，用于处理异步编程和并发流。通过它，我们可以在后台执行任务，并在任务完成后合并其结果。

### 项目背景

假设我们正在开发一个电子商务系统的产品详情接口，该接口需要从多个服务获取数据，例如：

1. 产品基本信息服务
2. 产品库存服务
3. 产品定价服务
4. 用户评论服务

每个服务都是独立的，如果串行调用会影响性能。因此，我们将使用`CompletableFuture`并发地调度这些服务提升响应性能。

### 项目结构

1. Controller层负责接收请求和返回结果。
2. Service层设定每个服务的调用逻辑。
3. 使用`CompletableFuture`进行并发编排。

### 核心代码实现

#### 1. 产品详情实体类

```java
public class ProductDetails {  
    private String basicInfo;  
    private Integer stock;  
    private Double price;  
    private List&lt;String&gt; reviews;  

    // Getters and setters  
}
```

#### 2. Controller层

```java
@RestController  
@RequestMapping("/api/products")  
public class ProductController {  

    @Autowired  
    private ProductService productService;  

    @GetMapping("/{productId}/details")  
    public CompletableFuture<ResponseEntity&lt;ProductDetails&gt;> getProductDetails(@PathVariable Long productId) {  
        return productService.getProductDetails(productId)  
        .thenApply(ResponseEntity::ok);  
    }  
}
```

#### 3. Service层

```java
@Service  
public class ProductService {  

    @Autowired  
    private BasicInfoService basicInfoService;  

    @Autowired  
    private StockService stockService;  

    @Autowired  
    private PricingService pricingService;  

    @Autowired  
    private ReviewsService reviewsService;  

    public CompletableFuture&lt;ProductDetails&gt; getProductDetails(Long productId) {  
        CompletableFuture&lt;String&gt; basicInfoFuture = CompletableFuture.supplyAsync(() -> basicInfoService.getBasicInfo(productId));  
        CompletableFuture&lt;Integer&gt; stockFuture = CompletableFuture.supplyAsync(() -> stockService.getStock(productId));  
        CompletableFuture&lt;Double&gt; priceFuture = CompletableFuture.supplyAsync(() -> pricingService.getPrice(productId));  
        CompletableFuture<List&lt;String&gt;> reviewsFuture = CompletableFuture.supplyAsync(() -> reviewsService.getReviews(productId));  

        return CompletableFuture.allOf(basicInfoFuture, stockFuture, priceFuture, reviewsFuture)  
        .thenApply(voided -> {  
            try {  
                ProductDetails details = new ProductDetails();  
                details.setBasicInfo(basicInfoFuture.get());  
                details.setStock(stockFuture.get());  
                details.setPrice(priceFuture.get());  
                details.setReviews(reviewsFuture.get());  
                return details;  
            } catch (Exception e) {  
                throw new RuntimeException(e);  
            }  
        });  
    }  
}
```

#### 4. 各个服务类（示例）

下面是其中一个示例服务类，其余服务类可以类似实现：

```java
@Service  
public class BasicInfoService {  

    public String getBasicInfo(Long productId) {  
        // 模拟调用远程服务或数据库查询以获取基本信息  
        return "Product basic information for productId: " + productId;  
    }  
}
```

### 代码说明

1. **产品详情实体类**：

- `ProductDetails` 类用来封装从不同服务获取的所有产品数据。

1. **Controller层**：

- `ProductController` 提供了一个接口来获取产品详情。它调用 `ProductService#getProductDetails` 方法，该方法返回一个 `CompletableFuture` 对象，以异步的方式响应请求。

1. **Service层**：

- `ProductService` 中的 `getProductDetails` 方法使用 `CompletableFuture.supplyAsync` 方法并发调用各个子服务。
- `CompletableFuture.allOf` 方法用于等待所有的服务请求完成，然后从各个 `CompletableFuture` 中获取结果。
- `thenApply` 是一个转换器方法，用于将异步操作的结果转换为最终的 `ProductDetails` 对象。

1. **各个服务类**：

- 每个服务类（如 `BasicInfoService`、`StockService` 等）代表一个子任务。这些任务被 `CompletableFuture` 并发调用以提高性能。

### 项目亮点

1. **提升性能**：

- `CompletableFuture` 提供了一种简单的方式来并发多个异步任务，从而减少总的接口响应时间。

1. **易于维护和扩展**：

- 各个服务之间是解耦的，增加新服务只需扩展`CompletableFuture`的组合逻辑，而无需重构现有代码。

1. **非阻塞的异步设计**：

- 使用`CompletableFuture`的非阻塞特性，并发调用远程服务或数据库查询，有效地利用系统资源。

1. **异常处理简便**：

- `CompletableFuture` 可以通过`exceptionally`方法进行异常处理，确保系统的稳定性。

这个示例展示了如何利用`CompletableFuture`进行服务调用并发编排，从而使接口响应更快，提升系统整体性能。在实际应用中，可以根据需要进一步调整并发和处理策略。
