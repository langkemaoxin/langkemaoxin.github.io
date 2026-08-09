---
title: "RocketMQ消费消息是推模式还是拉模式"
sidebarGroup: "Rocketmq"
shortTitle: "RocketMQ消费消息是推模式还是拉模式"
order: 637
date: 2026-02-24
category: "面试题"
tag:
  - "面试题"
description: "RocketMQ实际上同时支持推模式和拉模式来消费消息，但这里有一个有趣的细节：虽然RocketMQ提供了所谓的\"推模式\"消费者，但在底层实现上，它仍然是基于拉模式的。让我们详细探讨这两种模式，并通过代码示例来解释它们的工作原理。1. 推模"
article: false
---

> 来源：[RocketMQ消费消息是推模式还是拉模式](https://www.yuque.com/tulingzhouyu/db22bv/iz20l15657osg030)

RocketMQ实际上同时支持推模式和拉模式来消费消息，但这里有一个有趣的细节：虽然RocketMQ提供了所谓的"推模式"消费者，但在底层实现上，它仍然是基于拉模式的。让我们详细探讨这两种模式，并通过代码示例来解释它们的工作原理。

### 1. 推模式（Push Mode）

虽然称为"推模式"，但RocketMQ的DefaultMQPushConsumer实际上是在内部通过长轮询（Long Polling）来实现的，这本质上还是一种拉模式。不过，对于开发者来说，使用起来就像是推模式，因为消息会自动被"推送"到消费者的监听器中。

#### 推模式示例代码：

```java
import org.apache.rocketmq.client.consumer.DefaultMQPushConsumer;  
import org.apache.rocketmq.client.consumer.listener.ConsumeConcurrentlyContext;  
import org.apache.rocketmq.client.consumer.listener.ConsumeConcurrentlyStatus;  
import org.apache.rocketmq.client.consumer.listener.MessageListenerConcurrently;  
import org.apache.rocketmq.common.message.MessageExt;  

public class PushConsumerExample {  
    public static void main(String[] args) throws Exception {  
        // 创建消费者实例  
        DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("PushConsumerGroup");  

        // 设置NameServer地址  
        consumer.setNamesrvAddr("localhost:9876");  

        // 订阅主题和标签  
        consumer.subscribe("TestTopic", "*");  

        // 注册消息监听器  
        consumer.registerMessageListener(new MessageListenerConcurrently() {  
            @Override  
            public ConsumeConcurrentlyStatus consumeMessage(List&lt;MessageExt&gt; msgs, ConsumeConcurrentlyContext context) {  
                for (MessageExt msg : msgs) {  
                    System.out.println("Received message: " + new String(msg.getBody()));  
                }  
                return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;  
            }  
        });  

        // 启动消费者  
        consumer.start();  

        System.out.println("Push Consumer Started.");  
    }  
}
```

在这个例子中，我们使用DefaultMQPushConsumer，它会自动从Broker拉取消息并调用我们注册的监听器。对开发者来说，这就像是消息被推送到了消费者。

### 2. 拉模式（Pull Mode）

拉模式允许消费者主动从Broker拉取消息。这种模式给了开发者更多的控制权，可以根据自己的节奏来消费消息。

#### 拉模式示例代码：

```java
import org.apache.rocketmq.client.consumer.DefaultMQPullConsumer;  
import org.apache.rocketmq.client.consumer.PullResult;  
import org.apache.rocketmq.common.message.MessageExt;  
import org.apache.rocketmq.common.message.MessageQueue;  

public class PullConsumerExample {  
    public static void main(String[] args) throws Exception {  
        // 创建消费者实例  
        DefaultMQPullConsumer consumer = new DefaultMQPullConsumer("PullConsumerGroup");  

        // 设置NameServer地址  
        consumer.setNamesrvAddr("localhost:9876");  

        // 启动消费者  
        consumer.start();  

        // 获取主题的消息队列  
        Set&lt;MessageQueue&gt; mqs = consumer.fetchSubscribeMessageQueues("TestTopic");  

        for (MessageQueue mq : mqs) {  
            long offset = consumer.fetchConsumeOffset(mq, true);  

            while (true) {  
                PullResult pullResult = consumer.pull(mq, "*", offset, 32);  
                offset = pullResult.getNextBeginOffset();  

                switch (pullResult.getPullStatus()) {  
                    case FOUND:  
                        for (MessageExt msg : pullResult.getMsgFoundList()) {  
                            System.out.println("Received message: " + new String(msg.getBody()));  
                        }  
                        break;  
                    case NO_NEW_MSG:  
                        break;  
                    case NO_MATCHED_MSG:  
                        break;  
                    case OFFSET_ILLEGAL:  
                        break;  
                    default:  
                        break;  
                }  

                // 更新消费偏移量  
                consumer.updateConsumeOffset(mq, offset);  

                // 模拟处理时间  
                Thread.sleep(1000);  
            }  
        }  
    }  
}
```

在这个例子中，我们使用DefaultMQPullConsumer来主动拉取消息。消费者需要自己管理消费偏移量，并决定何时拉取下一批消息。

### 比较和选择

1. **推模式（Push）**:

- 优点：使用简单，自动管理消费进度，适合大多数场景。
- 缺点：灵活性较低，无法完全控制消费节奏。

1. **拉模式（Pull）**:

- 优点：更灵活，可以精确控制消费速度和批次大小。
- 缺点：需要自己管理偏移量，实现相对复杂。

### 结论

虽然RocketMQ提供了所谓的"推模式"，但实际上它是基于拉模式实现的。对于大多数应用场景，使用DefaultMQPushConsumer就足够了，因为它提供了一个类似推模式的简单接口。只有在需要精细控制消息消费过程时，才需要考虑使用拉模式。

无论选择哪种模式，理解它们的底层工作原理都是很重要的，这样可以在遇到性能问题或特殊需求时做出正确的选择和优化。
