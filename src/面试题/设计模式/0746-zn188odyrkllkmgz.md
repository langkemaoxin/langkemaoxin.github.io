---
title: "观察者模式在开源框架设计中的应用"
sidebarGroup: "设计模式"
shortTitle: "观察者模式在开源框架设计中的应用"
order: 746
date: 2026-04-20
category: "面试题"
tag:
  - "面试题"
description: "1. Spring事件机制 - 应用上下文事件广播// 自定义应用事件   public class UserRegisteredEvent extends ApplicationEvent {       private User use"
article: false
---

> 来源：[观察者模式在开源框架设计中的应用](https://www.yuque.com/tulingzhouyu/db22bv/zn188odyrkllkmgz)

#### 1. Spring事件机制 - 应用上下文事件广播

```java
// 自定义应用事件  
public class UserRegisteredEvent extends ApplicationEvent {  
    private User user;  

    public UserRegisteredEvent(Object source, User user) {  
        super(source);  
        this.user = user;  
    }  

    public User getUser() {  
        return user;  
    }  
}  

// 事件监听器  
@Component  
public class EmailNotificationListener   
implements ApplicationListener&lt;UserRegisteredEvent&gt; {  

    @Override  
    public void onApplicationEvent(UserRegisteredEvent event) {  
        User user = event.getUser();  
        // 发送注册邮件通知  
        sendRegistrationEmail(user);  
    }  

    private void sendRegistrationEmail(User user) {  
        // 实际邮件发送逻辑  
        System.out.println("发送注册通知邮件给: " + user.getEmail());  
    }  
}  

// 积分服务监听器  
@Component  
public class UserPointsListener   
implements ApplicationListener&lt;UserRegisteredEvent&gt; {  

    @Override  
    public void onApplicationEvent(UserRegisteredEvent event) {  
        User user = event.getUser();  
        // 为新注册用户初始化积分  
        initializeUserPoints(user);  
    }  

    private void initializeUserPoints(User user) {  
        // 初始化用户积分  
        System.out.println("为新用户初始化积分: " + user.getUsername());  
    }  
}  

// 事件发布服务  
@Service  
public class UserService {  
    @Autowired  
    private ApplicationEventPublisher eventPublisher;  

    public void registerUser(User user) {  
        // 用户注册逻辑  

        // 发布用户注册事件  
        UserRegisteredEvent event = new UserRegisteredEvent(this, user);  
        eventPublisher.publishEvent(event);  
    }  
}
```

#### 2. Guava EventBus - 解耦的事件总线

```java
// 自定义事件  
public class OrderEvent {  
    private String orderId;  
    private OrderStatus status;  

    public OrderEvent(String orderId, OrderStatus status) {  
        this.orderId = orderId;  
        this.status = status;  
    }  
}  

// 枚举订单状态  
public enum OrderStatus {  
    CREATED, PAID, SHIPPED, DELIVERED  
}  

// 事件订阅者  
public class OrderEventHandler {  
    // 监听订单创建事件  
    @Subscribe  
    public void handleOrderCreated(OrderEvent event) {  
        if (event.getStatus() == OrderStatus.CREATED) {  
            System.out.println("订单已创建: " + event.getOrderId());  
            // 触发库存检查  
            checkInventory(event.getOrderId());  
        }  
    }  

    // 监听订单支付事件  
    @Subscribe  
    public void handleOrderPaid(OrderEvent event) {  
        if (event.getStatus() == OrderStatus.PAID) {  
            System.out.println("订单已支付: " + event.getOrderId());  
            // 触发支付确认  
            confirmPayment(event.getOrderId());  
        }  
    }  

    private void checkInventory(String orderId) {  
        // 库存检查逻辑  
    }  

    private void confirmPayment(String orderId) {  
        // 支付确认逻辑  
    }  
}  

// 订单服务  
public class OrderService {  
    private EventBus eventBus;  

    public OrderService() {  
        // 创建EventBus  
        this.eventBus = new EventBus("OrderEventBus");  
    }  

    public void registerListener(Object listener) {  
        eventBus.register(listener);  
    }  

    public void createOrder(String orderId) {  
        // 创建订单逻辑  

        // 发布订单创建事件  
        OrderEvent event = new OrderEvent(orderId, OrderStatus.CREATED);  
        eventBus.post(event);  
    }  

    public void payOrder(String orderId) {  
        // 订单支付逻辑  

        // 发布订单支付事件  
        OrderEvent event = new OrderEvent(orderId, OrderStatus.PAID);  
        eventBus.post(event);  
    }  
}  

// 使用示例  
public class EventBusDemo {  
    public static void main(String[] args) {  
        OrderService orderService = new OrderService();  

        // 注册事件处理器  
        OrderEventHandler handler = new OrderEventHandler();  
        orderService.registerListener(handler);  

        // 创建并支付订单  
        String orderId = "ORDER-001";  
        orderService.createOrder(orderId);  
        orderService.payOrder(orderId);  
    }  
}
```

#### 3. RxJava响应式编程 - 异步事件流

```java
// 响应式用户服务  
public class UserService {  
    // 用户注册Observable  
    public Observable&lt;User&gt; registerUser(String username, String password) {  
        return Observable.create(emitter -> {  
            try {  
                // 模拟用户注册  
                User user = new User(username, password);  

                // 注册成功发送用户对象  
                emitter.onNext(user);  

                // 完成事件流  
                emitter.onComplete();  
            } catch (Exception e) {  
                // 发送错误事件  
                emitter.onError(e);  
            }  
        });  
    }  
}  

// 多观察者处理  
public class UserRegistrationDemo {  
    public static void main(String[] args) {  
        UserService userService = new UserService();  

        userService.registerUser("john_doe", "password123")  
        // 转换用户信息  
        .map(user -> {  
            // 生成用户详细信息  
            return enrichUserData(user);  
        })  
        // 异步线程处理  
        .subscribeOn(Schedulers.io())  
        // 主线程观察结果  
        .observeOn(Schedulers.mainThread())  
        // 注册多个观察者  
        .subscribe(  
            // 成功处理  
            user -> {  
                System.out.println("用户注册成功: " + user.getUsername());  
                // 触发后续流程  
                sendWelcomeEmail(user);  
            },  
            // 错误处理  
            error -> {  
                System.err.println("用户注册失败: " + error.getMessage());  
            },  
            // 完成处理  
            () -> {  
                System.out.println("用户注册流程完成");  
            }  
        );  
    }  

    private static User enrichUserData(User user) {  
        // 用户信息扩展逻辑  
        return user;  
    }  

    private static void sendWelcomeEmail(User user) {  
        // 发送欢迎邮件  
    }  
}
```

### 观察者模式的设计要点

1. **解耦机制**

- 降低对象间耦合
- 支持动态注册和移除
- 提高系统灵活性

1. **事件驱动**

- 支持异步通知
- 多观察者并行处理
- 松散的事件传播机制

1. **性能优化**

- 避免同步阻塞
- 支持异步事件处理
- 惰性计算

### 实现建议

1. 使用弱引用避免内存泄露
2. 提供线程安全的实现
3. 控制事件传播范围
4. 合理设计事件层次
5. 使用队列进行事件缓冲

### 适用场景

1. 消息通知系统
2. 实时数据同步
3. GUI事件处理
4. 分布式系统解耦
5. 状态变更通知

### 潜在挑战

1. 复杂的事件依赖
2. 性能开销
3. 事件顺序控制
4. 异常处理

### 高级扩展

1. 支持事件过滤
2. 实现事件编排
3. 提供优先级机制
4. 支持事务性事件

观察者模式是现代框架中非常重要的设计模式，它提供了一种灵活的事件通知和处理机制。通过解耦观察者和被观察者，实现了系统组件间的松散协作，极大地提高了系统的可扩展性和灵活性。

在实际应用中，开发者可以根据具体场景选择合适的观察者模式实现，如Spring的事件机制、Guava的EventBus或RxJava的响应式编程模型，以满足不同的架构和性能需求。
