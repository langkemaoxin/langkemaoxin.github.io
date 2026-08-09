---
title: "什么是缓存击穿、缓存穿透、缓存雪崩"
sidebarGroup: "Redis"
shortTitle: "什么是缓存击穿、缓存穿透、缓存雪崩"
order: 522
date: 2026-06-21
category: "面试题"
tag:
  - "面试题"
description: "缓存击穿、缓存穿透和缓存雪崩是分布式系统或缓存机制中常见的三种问题。这些问题会影响系统性能和稳定性，因此理解它们的原理和解决方法非常重要。1. 缓存击穿缓存击穿是指某个热点数据在缓存中失效，并在大量的请求同时涌向后台数据库时发生。这通常会对"
article: false
---

> 来源：[什么是缓存击穿、缓存穿透、缓存雪崩](https://www.yuque.com/tulingzhouyu/db22bv/nwgllrlgzz29vdyp)

缓存击穿、缓存穿透和缓存雪崩是分布式系统或缓存机制中常见的三种问题。这些问题会影响系统性能和稳定性，因此理解它们的原理和解决方法非常重要。

### 1. 缓存击穿

**缓存击穿**是指某个热点数据在缓存中失效，并在大量的请求同时涌向后台数据库时发生。这通常会对数据库造成很大的压力。

#### 解决方案

- **设置热点数据永不过期**：对经常被访问的热点数据，设置一个很长的有效期或者永不过期。
- **互斥锁/同步锁机制**：在缓存失效后，通过加锁控制对数据库的访问，从而保证只有一个请求能够去查询数据库并更新缓存。

#### Java 示例

```java
public class CacheService {  
    private volatile Map<String, Object> cache = new ConcurrentHashMap<>();  
    private ReentrantLock lock = new ReentrantLock();  

    public Object get(String key) {  
        Object value = cache.get(key);  
        if (value == null) {  
            try {  
                lock.lock();  
                // Double check to ensure value is still not in cache  
                value = cache.get(key);  
                if (value == null) {  
                    // Simulate DB call  
                    value = queryDatabase(key);  
                    // Update cache  
                    cache.put(key, value);  
                }  
            } finally {  
                lock.unlock();  
            }  
        }  
        return value;  
    }  

    private Object queryDatabase(String key) {  
        // Simulate a database query  
        return "Value from DB for " + key;  
    }  
}
```

### 2. 缓存穿透

**缓存穿透**是指用户请求的数据在缓存和数据库中都不存在，从而导致每次请求都落到数据库上。

#### 解决方案

- **缓存空对象**：缓存空结果，但要设置短的过期时间。
- **布隆过滤器**：用布隆过滤器在访问缓存之前进行一次快速判断，过滤掉不可能存在的数据请求。

#### Java 示例

```java
public class CacheWithBloomFilter {  
    private Set&lt;String&gt; bloomFilter = new HashSet<>(); // Simplified bloom filter  
    private Map<String, Object> cache = new ConcurrentHashMap<>();  

    public Object get(String key) {  
        if (!bloomFilter.contains(key)) {  
            return null; // Filter out the request  
        }  

        Object value = cache.get(key);  
        if (value == null) {  
            // Simulate DB call  
            value = queryDatabase(key);  
            if (value != null) {  
                cache.put(key, value);  
            } else {  
                // Cache empty with a short TTL  
                cache.put(key, null); // or cache a dummy object  
            }  
        }  
        return value;  
    }  

    private Object queryDatabase(String key) {  
        // Simulate a database query  
        return null; // Simulate nonexistent data  
    }  
}
```

### 3. 缓存雪崩

**缓存雪崩**是指在某一时刻，大量缓存数据共同过期，导致瞬时大流量涌向数据库。或者由于分布式缓存节点故障导致缓存失效。

#### 解决方案

- **缓存数据过期时间设置为随机**：避免大量缓存同一时间过期。
- **加锁或者队列**：用锁或队列将请求进行排队。
- **恢复机制**：对缓存系统进行降级处理或配置多级缓存。

#### Java 示例

```java
public class CacheWithRandomExpiration {  
    private Map<String, CacheObject> cache = new ConcurrentHashMap<>();  

    public Object get(String key) {  
        CacheObject cacheObject = cache.get(key);  
        if (cacheObject == null || cacheObject.isExpired()) {  
            Object value = queryDatabase(key);  
            // Simulate refresh cache with random expiration to avoid snowball effect  
            cache.put(key, new CacheObject(value, System.currentTimeMillis() + getRandomExpirationTime()));  
        }  
        return cacheObject.getValue();  
    }  

    private long getRandomExpirationTime() {  
        // Random expiration between 5 to 10 seconds  
        return 5000 + new Random().nextInt(5000);  
    }  

    private Object queryDatabase(String key) {  
        // Simulate a database query  
        return "Value from DB for " + key;  
    }  

    private static class CacheObject {  
        private Object value;  
        private long expire;  

        public CacheObject(Object value, long expire) {  
            this.value = value;  
            this.expire = expire;  
        }  

        public boolean isExpired() {  
            return System.currentTimeMillis() > expire;  
        }  

        public Object getValue() {  
            return value;  
        }  
    }  
}
```

这些解决方案中的 Java 示例展示了如何应对不同的缓存问题。在实际项目中，可能需要根据具体的应用场景和需求进行调整和优化。
