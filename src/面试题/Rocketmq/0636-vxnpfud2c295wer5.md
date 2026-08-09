---
title: "RocketMQ的Consumer是如何消费消息的"
sidebarGroup: "Rocketmq"
shortTitle: "RocketMQ的Consumer是如何消费消息的"
order: 636
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "RocketMQ提供了两种主要的消费模式：推送式消费（Push Consumer）和拉取式消费（Pull Consumer）。我们将主要讨论更常用的推送式消费模式，并提供相应的代码示例。Consumer消费消息的基本流程实例化Consume"
article: false
---

> 来源：[RocketMQ的Consumer是如何消费消息的](https://www.yuque.com/tulingzhouyu/db22bv/vxnpfud2c295wer5)

RocketMQ提供了两种主要的消费模式：推送式消费（Push Consumer）和拉取式消费（Pull Consumer）。我们将主要讨论更常用的推送式消费模式，并提供相应的代码示例。

### Consumer消费消息的基本流程

1. **实例化Consumer**：创建并配置一个Consumer实例。
2. **订阅主题**：指定要订阅的主题和标签。
3. **注册消息监听器**：实现消息处理逻辑。
4. **启动Consumer**：开始消费消息。
5. **处理消息**：在监听器中处理接收到的消息。

### 代码示例

以下是一个基本的Push Consumer的代码示例：

```java
import org.apache.rocketmq.client.consumer.DefaultMQPushConsumer;  
import org.apache.rocketmq.client.consumer.listener.ConsumeConcurrentlyContext;  
import org.apache.rocketmq.client.consumer.listener.ConsumeConcurrentlyStatus;  
import org.apache.rocketmq.client.consumer.listener.MessageListenerConcurrently;  
import org.apache.rocketmq.common.message.MessageExt;  
import org.apache.rocketmq.common.consumer.ConsumeFromWhere;  

import java.util.List;  

public class SimplePushConsumer {  
    public static void main(String[] args) throws Exception {  
        // 创建一个Consumer实例，并指定Consumer Group  
        DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("ConsumerGroupName");  

        // 设置NameServer地址  
        consumer.setNamesrvAddr("localhost:9876");  

        // 设置消费起始位置  
        consumer.setConsumeFromWhere(ConsumeFromWhere.CONSUME_FROM_FIRST_OFFSET);  

        // 订阅一个或多个主题，并指定标签筛选表达式  
        consumer.subscribe("TopicTest", "*");  

        // 注册回调函数来处理消息  
        consumer.registerMessageListener(new MessageListenerConcurrently() {  
            @Override  
            public ConsumeConcurrentlyStatus consumeMessage(List&lt;MessageExt&gt; msgs,  
                                                            ConsumeConcurrentlyContext context) {  
                for (MessageExt msg : msgs) {  
                    System.out.printf("Received message: %s%n", new String(msg.getBody()));  
                }  
                // 标记消息消费成功  
                return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;  
            }  
        });  

        // 启动Consumer实例  
        consumer.start();  

        System.out.printf("Consumer started.%n");  
    }  
}
```

### 详细解释

1. **Consumer实例化**：

- 使用`DefaultMQPushConsumer`类创建Consumer实例，并指定Consumer Group。
- Consumer Group用于标识一组具有相同角色的Consumer实例。

1. **设置NameServer地址**：

- 使用`setNamesrvAddr()`方法设置RocketMQ NameServer的地址。

1. **设置消费起始位置**：

- `setConsumeFromWhere()`方法用于指定从哪里开始消费消息。
- `CONSUME_FROM_FIRST_OFFSET`表示从最早的可用消息开始消费。

1. **订阅主题**：

- `subscribe()`方法用于订阅指定的主题。
- 第一个参数是主题名称，第二个参数是标签过滤表达式。"*"表示订阅该主题下的所有消息。

1. **注册消息监听器**：

- `registerMessageListener()`方法用于注册一个消息监听器。
- 这里使用的是`MessageListenerConcurrently`接口，适用于并发消费场景。
- 在`consumeMessage()`方法中实现具体的消息处理逻辑。

1. **消息处理**：

- 在监听器的`consumeMessage()`方法中，我们遍历收到的消息列表并打印消息内容。
- 返回`ConsumeConcurrentlyStatus.CONSUME_SUCCESS`表示消息已成功消费。

1. **启动Consumer**：

- 调用`start()`方法启动Consumer实例，开始消费消息。

### 其他重要概念

1. **消费模式**：

- Push模式：Broker主动将消息推送给Consumer。
- Pull模式：Consumer主动从Broker拉取消息。

1. **消息过滤**：

- 可以通过标签（Tag）或自定义属性进行消息过滤。

1. **消费进度**：

- RocketMQ会自动管理消费进度，确保消息不会重复消费。

1. **消费失败处理**：

- 如果消息处理失败，可以返回`ConsumeConcurrentlyStatus.RECONSUME_LATER`，RocketMQ会稍后重试。

1. **负载均衡**：

- 同一个Consumer Group中的多个Consumer实例会自动进行负载均衡，分摊消息的消费。

### 小结

RocketMQ的Consumer提供了灵活且强大的消息消费机制。通过Push模式，开发者可以方便地实现消息的实时处理。Consumer的配置和使用相对简单，但要注意合理处理消息，包括正确设置消费起始位置、适当的消息过滤、以及妥善处理消费失败的情况。在实际应用中，还需要考虑Consumer的伸缩性、容错性和性能优化等方面。
