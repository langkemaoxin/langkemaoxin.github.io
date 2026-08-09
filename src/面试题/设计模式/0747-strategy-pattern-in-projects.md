---
title: "策略模式在实际项目中的灵活应用"
sidebarGroup: "设计模式"
shortTitle: "策略模式在实际项目中的灵活应用"
order: 747
date: 2026-04-20
category: "面试题"
tag:
  - "面试题"
description: "下面我将通过一个具体的电商促销策略案例，详细阐述策略模式的实际应用：// 定义促销策略接口   public interface PromotionStrategy {       double calculatePrice(double "
article: false
---

> 来源：[策略模式在实际项目中的灵活应用](https://www.yuque.com/tulingzhouyu/db22bv/pxf2btgv0sg5uyy0)

下面我将通过一个具体的电商促销策略案例，详细阐述策略模式的实际应用：

```java
// 定义促销策略接口  
public interface PromotionStrategy {  
    double calculatePrice(double originalPrice);  
}  

// 具体促销策略实现：打折策略  
public class DiscountStrategy implements PromotionStrategy {  
    private double discountRate;  

    public DiscountStrategy(double discountRate) {  
        this.discountRate = discountRate;  
    }  

    @Override  
    public double calculatePrice(double originalPrice) {  
        return originalPrice * discountRate;  
    }  
}  

// 具体促销策略：满减策略  
public class FullReductionStrategy implements PromotionStrategy {  
    private double threshold;  
    private double reduction;  

    public FullReductionStrategy(double threshold, double reduction) {  
        this.threshold = threshold;  
        this.reduction = reduction;  
    }  

    @Override  
    public double calculatePrice(double originalPrice) {  
        return originalPrice >= threshold ? originalPrice - reduction : originalPrice;  
    }  
}  

// 促销上下文管理器  
public class PromotionContext {  
    private PromotionStrategy promotionStrategy;  

    public void setPromotionStrategy(PromotionStrategy strategy) {  
        this.promotionStrategy = strategy;  
    }  

    public double calculateFinalPrice(double originalPrice) {  
        return promotionStrategy.calculatePrice(originalPrice);  
    }  
}  

// 使用示例  
public class PromotionDemo {  
    public static void main(String[] args) {  
        PromotionContext context = new PromotionContext();  

        // 双十一：8折促销  
        context.setPromotionStrategy(new DiscountStrategy(0.8));  
        System.out.println("双十一价格:" + context.calculateFinalPrice(1000));  

        // 圣诞节：满1000减200  
        context.setPromotionStrategy(new FullReductionStrategy(1000, 200));  
        System.out.println("圣诞节价格:" + context.calculateFinalPrice(1000));  
    }  
}
```

策略模式优势：

1. 开闭原则：新增策略无需修改现有代码
2. 算法独立性：各策略相互解耦
3. 运行时动态切换策略
4. 消除大量条件语句
5. 提高代码可维护性

实践建议：

- 策略数量不宜过多，避免类爆炸
- 策略之间应该是平等的
- 优先使用组合，而非继承
- 结合工厂模式管理策略创建

通过这种设计，电商平台可以轻松应对不同节日、不同场景的促销策略，实现灵活的价格计算逻辑。
