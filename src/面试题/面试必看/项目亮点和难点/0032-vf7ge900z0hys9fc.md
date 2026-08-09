---
title: "基于本地消息表实现分布式事务"
sidebarGroup: "项目亮点和难点"
shortTitle: "基于本地消息表实现分布式事务"
order: 32
date: 2026-07-13
category: "面试题"
tag:
  - "面试题"
description: "假设我们有一个电商系统,包含订单服务和库存服务。当用户下单时,需要在订单服务中创建订单,同时在库存服务中扣减库存。这是一个典型的分布式事务场景,我们需要保证这两个操作要么都成功,要么都失败,以保证数据的最终一致性。项目结构:订单服务(Ord"
article: false
---

> 来源：[基于本地消息表实现分布式事务](https://www.yuque.com/tulingzhouyu/db22bv/vf7ge900z0hys9fc)

假设我们有一个电商系统,包含订单服务和库存服务。当用户下单时,需要在订单服务中创建订单,同时在库存服务中扣减库存。这是一个典型的分布式事务场景,我们需要保证这两个操作要么都成功,要么都失败,以保证数据的最终一致性。

**项目结构:**

1. 订单服务(Order Service)
2. 库存服务(Inventory Service)
3. 本地消息表(Local Message Table)
4. 消息恢复系统(Message Recovery System)

**核心思想:**
使用本地消息表来实现分布式事务。在订单服务中,我们将创建订单和发送消息这两个操作放在一个本地事务中。如果本地事务成功,则订单创建成功,消息也被保存到本地消息表中。然后通过定时任务或消息队列来发送消息到库存服务,实现库存扣减。如果在这个过程中出现任何异常,我们可以通过重试机制来保证最终一致性。

下面是详细的代码实现:

**订单服务(Order Service)**

```java
@Service  
@Transactional  
public class OrderService {  

    @Autowired  
    private OrderRepository orderRepository;  

    @Autowired  
    private LocalMessageRepository localMessageRepository;  

    @Autowired  
    private KafkaTemplate<String, String> kafkaTemplate;  

    public void createOrder(Order order) {  
        // 开启本地事务  
        TransactionStatus txStatus = transactionManager.getTransaction(new DefaultTransactionDefinition());  

        try {  
            // 1. 保存订单  
            orderRepository.save(order);  

            // 2. 创建本地消息  
            LocalMessage message = new LocalMessage();  
            message.setMessageId(UUID.randomUUID().toString());  
            message.setMessage(JSON.toJSONString(order));  
            message.setStatus("NEW");  
            localMessageRepository.save(message);  

            // 3. 提交事务  
            transactionManager.commit(txStatus);  

            // 4. 发送消息到Kafka  
            kafkaTemplate.send("inventory-topic", message.getMessageId(), message.getMessage());  
        } catch (Exception e) {  
            // 回滚事务  
            transactionManager.rollback(txStatus);  
            throw new RuntimeException("Create order failed", e);  
        }  
    }  
}
```

**库存服务(Inventory Service)**

```java
@Service  
public class InventoryService {  

    @Autowired  
    private InventoryRepository inventoryRepository;  

    @KafkaListener(topics = "inventory-topic")  
    public void handleOrderCreation(ConsumerRecord<String, String> record) {  
        String messageId = record.key();  
        Order order = JSON.parseObject(record.value(), Order.class);  

        try {  
            // 扣减库存  
            inventoryRepository.decreaseStock(order.getProductId(), order.getQuantity());  

            // 确认消息处理成功  
            kafkaTemplate.send("inventory-result-topic", messageId, "SUCCESS");  
        } catch (Exception e) {  
            // 消息处理失败,发送失败消息  
            kafkaTemplate.send("inventory-result-topic", messageId, "FAILED");  
        }  
    }  
}
```

**本地消息表(Local Message Table)**

```java
@Entity  
@Table(name = "local_message")  
public class LocalMessage {  
    @Id  
    private String messageId;  
    private String message;  
    private String status; // NEW, SENT, CONFIRMED  
    private Date createTime;  
    private Date updateTime;  

    // Getters and setters  
}
```

**消息恢复系统(Message Recovery System)**

```java
@Component  
public class MessageRecoverySystem {  

    @Autowired  
    private LocalMessageRepository localMessageRepository;  

    @Autowired  
    private KafkaTemplate<String, String> kafkaTemplate;  

    @Scheduled(fixedRate = 60000) // 每分钟执行一次  
    public void recoverFailedMessages() {  
        List&lt;LocalMessage&gt; failedMessages = localMessageRepository.findByStatusAndCreateTimeBefore("NEW", new Date(System.currentTimeMillis() - 300000)); // 5分钟前的消息  

        for (LocalMessage message : failedMessages) {  
            try {  
                kafkaTemplate.send("inventory-topic", message.getMessageId(), message.getMessage());  
                message.setStatus("SENT");  
                localMessageRepository.save(message);  
            } catch (Exception e) {  
                // 记录日志,等待下次重试  
                log.error("Failed to recover message: " + message.getMessageId(), e);  
            }  
        }  
    }  

    @KafkaListener(topics = "inventory-result-topic")  
    public void handleInventoryResult(ConsumerRecord<String, String> record) {  
        String messageId = record.key();  
        String result = record.value();  

        LocalMessage message = localMessageRepository.findById(messageId).orElse(null);  
        if (message != null) {  
            if ("SUCCESS".equals(result)) {  
                message.setStatus("CONFIRMED");  
            } else {  
                message.setStatus("FAILED");  
            }  
            localMessageRepository.save(message);  
        }  
    }  
}
```

代码说明:

1. 订单服务:

- 在一个本地事务中完成订单创建和本地消息保存。
- 事务成功后,立即发送消息到Kafka。

1. 库存服务:

- 监听Kafka消息,处理库存扣减。
- 处理结果(成功或失败)通过Kafka反馈给订单服务。

1. 本地消息表:

- 存储待发送的消息,包括消息ID、内容、状态等信息。

1. 消息恢复系统:

- 定期检查本地消息表,重新发送失败的消息。
- 监听库存服务的处理结果,更新本地消息状态。

**项目亮点:**

1. 高可用性: 即使在网络故障或服务宕机的情况下,也能保证消息最终被成功处理。
2. 数据一致性: 通过本地事务保证订单创建和消息发送的原子性,再通过消息重试机制保证最终一致性。
3. 解耦性: 订单服务和库存服务通过消息进行异步通信,降低了系统耦合度。
4. 可靠性: 使用本地消息表作为消息队列的可靠存储,避免了消息丢失的风险。
5. 扩展性: 该方案易于扩展,可以方便地增加新的微服务而不影响现有服务。
6. 性能: 采用异步处理方式,提高了系统的整体吞吐量。

通过这种方式,我们实现了在分布式系统中保证数据最终一致性的目标,同时保持了系统的高可用性和可扩展性。这种方案特别适用于对实时性要求不是特别高,但对数据一致性有较高要求的业务场景。
