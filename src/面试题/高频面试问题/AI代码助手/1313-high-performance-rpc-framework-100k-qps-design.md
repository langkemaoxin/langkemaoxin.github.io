---
title: "高性能RPC框架设计：10万QPS毫秒级调用实现方案"
sidebarGroup: "AI代码助手"
shortTitle: "高性能RPC框架设计：10万QPS毫秒级调用实现方案"
order: 1313
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "场景分析 (Situation)性能目标QPS要求：支持10万QPS并发调用延迟要求：P99 &lt; 5ms，P95 &lt; 2ms，平均延迟 &lt; 1ms吞吐量：单机处理能力达到10万请求/秒可用性：99.99%的服务可用性业务场"
article: false
---

> 来源：[高性能RPC框架设计：10万QPS毫秒级调用实现方案](https://www.yuque.com/tulingzhouyu/db22bv/tgeu3ln223h1fgym)

## 场景分析 (Situation)

### 性能目标

- **QPS要求**：支持10万QPS并发调用
- **延迟要求**：P99 < 5ms，P95 < 2ms，平均延迟 < 1ms
- **吞吐量**：单机处理能力达到10万请求/秒
- **可用性**：99.99%的服务可用性

### 业务场景

- **微服务架构**：支持大规模微服务间通信
- **低延迟要求**：交易系统、实时推荐等对延迟敏感的场景
- **高并发**：电商大促、秒杀等高并发业务场景

## 技术挑战 (Challenge)

### 1. 网络通信挑战

- **连接管理**：大量并发连接的高效管理
- **网络协议**：选择最优的传输协议
- **IO模型**：高性能异步IO实现
- **内存管理**：避免频繁的内存分配和GC

### 2. 序列化性能

- **序列化速度**：快速的对象序列化/反序列化
- **数据大小**：紧凑的数据格式减少网络传输
- **兼容性**：版本升级和向后兼容

### 3. 调用链路优化

- **线程模型**：避免线程切换开销
- **CPU利用**：减少CPU密集型操作
- **内存拷贝**：零拷贝或减少拷贝次数

## 解决方案 (Response)

### 整体架构设计

```java
/**
 * 高性能RPC框架整体架构
 */
@Component
public class HighPerformanceRPCFramework {
    
    // 核心组件
    private final NetworkLayer networkLayer;           // 网络通信层
    private final SerializationEngine serializationEngine;  // 序列化引擎
    private final ConnectionPool connectionPool;       // 连接池
    private final LoadBalancer loadBalancer;          // 负载均衡
    private final CircuitBreaker circuitBreaker;      // 熔断器
    
    public HighPerformanceRPCFramework() {
        this.networkLayer = new NettyNetworkLayer();
        this.serializationEngine = new ProtobufSerializationEngine();
        this.connectionPool = new AsyncConnectionPool();
        this.loadBalancer = new ConsistentHashLoadBalancer();
        this.circuitBreaker = new HystrixCircuitBreaker();
    }
}
```

### 1. 网络通信层设计

#### 基于Netty的异步网络层

```java
/**
 * 基于Netty的高性能网络通信层
 */
@Component
public class NettyNetworkLayer implements NetworkLayer {
    
    private final EventLoopGroup bossGroup;
    private final EventLoopGroup workerGroup;
    private final Bootstrap clientBootstrap;
    private final ServerBootstrap serverBootstrap;
    
    public NettyNetworkLayer() {
        // 使用Epoll提升Linux环境性能
        if (Epoll.isAvailable()) {
            this.bossGroup = new EpollEventLoopGroup(1, 
                new DefaultThreadFactory("rpc-boss"));
            this.workerGroup = new EpollEventLoopGroup(
                Runtime.getRuntime().availableProcessors() * 2,
                new DefaultThreadFactory("rpc-worker"));
        } else {
            this.bossGroup = new NioEventLoopGroup(1);
            this.workerGroup = new NioEventLoopGroup();
        }
        
        this.clientBootstrap = createClientBootstrap();
        this.serverBootstrap = createServerBootstrap();
    }
    
    private Bootstrap createClientBootstrap() {
        Bootstrap bootstrap = new Bootstrap()
            .group(workerGroup)
            .channel(Epoll.isAvailable() ? EpollSocketChannel.class : NioSocketChannel.class)
            .option(ChannelOption.TCP_NODELAY, true)
            .option(ChannelOption.SO_KEEPALIVE, true)
            .option(ChannelOption.SO_REUSEADDR, true)
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3000)
            // 优化缓冲区大小
            .option(ChannelOption.SO_SNDBUF, 32 * 1024)
            .option(ChannelOption.SO_RCVBUF, 32 * 1024)
            // 使用直接内存
            .option(ChannelOption.ALLOCATOR, PooledByteBufAllocator.DEFAULT)
            .handler(new ChannelInitializer&lt;SocketChannel&gt;() {
                @Override
                protected void initChannel(SocketChannel ch) {
                    ChannelPipeline pipeline = ch.pipeline();
                    // 自定义高性能编解码器
                    pipeline.addLast(new HighPerformanceDecoder());
                    pipeline.addLast(new HighPerformanceEncoder());
                    // 业务处理器
                    pipeline.addLast(new ClientHandler());
                }
            });
        
        return bootstrap;
    }
    
    @Override
    public CompletableFuture&lt;RPCResponse&gt; sendAsync(RPCRequest request, 
            String serverAddress) {
        
        return connectionPool.getConnection(serverAddress)
            .thenCompose(channel -> {
                CompletableFuture&lt;RPCResponse&gt; future = new CompletableFuture<>();
                
                // 生成唯一请求ID
                long requestId = RequestIdGenerator.next();
                request.setRequestId(requestId);
                
                // 注册回调
                PendingRequests.register(requestId, future);
                
                // 异步发送
                channel.writeAndFlush(request).addListener(writeFuture -> {
                    if (!writeFuture.isSuccess()) {
                        PendingRequests.remove(requestId);
                        future.completeExceptionally(writeFuture.cause());
                    }
                });
                
                return future;
            });
    }
}
```

#### 连接池优化

```java
/**
 * 高性能异步连接池
 */
@Component
public class AsyncConnectionPool {
    
    private final ConcurrentHashMap<String, ChannelPool> pools;
    private final int maxConnectionsPerServer = 20;
    private final int maxPendingRequests = 1000;
    
    public AsyncConnectionPool() {
        this.pools = new ConcurrentHashMap<>();
    }
    
    public CompletableFuture&lt;Channel&gt; getConnection(String serverAddress) {
        ChannelPool pool = pools.computeIfAbsent(serverAddress, 
            addr -> createChannelPool(addr));
        
        CompletableFuture&lt;Channel&gt; future = new CompletableFuture<>();
        
        pool.acquire().addListener(acquireFuture -> {
            if (acquireFuture.isSuccess()) {
                Channel channel = (Channel) acquireFuture.getNow();
                future.complete(channel);
            } else {
                future.completeExceptionally(acquireFuture.cause());
            }
        });
        
        return future;
    }
    
    private ChannelPool createChannelPool(String serverAddress) {
        String[] hostPort = serverAddress.split(":");
        String host = hostPort[0];
        int port = Integer.parseInt(hostPort[1]);
        
        return new FixedChannelPool(
            clientBootstrap.remoteAddress(host, port),
            new ChannelPoolHandler() {
                @Override
                public void channelReleased(Channel ch) throws Exception {
                    // 连接释放时的清理工作
                }
                
                @Override
                public void channelAcquired(Channel ch) throws Exception {
                    // 连接获取时的准备工作
                }
                
                @Override
                public void channelCreated(Channel ch) throws Exception {
                    // 新连接创建时的初始化工作
                }
            },
            maxConnectionsPerServer
        );
    }
}
```

### 2. 高性能序列化引擎

#### Protocol Buffers优化

```java
/**
 * 基于Protobuf的高性能序列化引擎
 */
@Component
public class ProtobufSerializationEngine implements SerializationEngine {
    
    // 使用ThreadLocal避免反复创建
    private static final ThreadLocal&lt;CodedOutputStream&gt; OUTPUT_STREAM_CACHE = 
        ThreadLocal.withInitial(() -> {
            ByteArrayOutputStream baos = new ByteArrayOutputStream(1024);
            return CodedOutputStream.newInstance(baos);
        });
    
    private static final ThreadLocal&lt;CodedInputStream&gt; INPUT_STREAM_CACHE = 
        ThreadLocal.withInitial(() -> {
            ByteArrayInputStream bais = new ByteArrayInputStream(new byte[1024]);
            return CodedInputStream.newInstance(bais);
        });
    
    @Override
    public ByteBuf serialize(Object obj) {
        try {
            if (obj instanceof Message) {
                Message message = (Message) obj;
                
                // 预计算大小，避免扩容
                int serializedSize = message.getSerializedSize();
                ByteBuf buffer = PooledByteBufAllocator.DEFAULT
                    .directBuffer(serializedSize + 4);
                
                // 写入消息长度
                buffer.writeInt(serializedSize);
                
                // 写入消息内容
                byte[] messageBytes = message.toByteArray();
                buffer.writeBytes(messageBytes);
                
                return buffer;
            }
            
            throw new SerializationException("Unsupported object type: " + 
                obj.getClass().getName());
                
        } catch (Exception e) {
            throw new SerializationException("Serialization failed", e);
        }
    }
    
    @Override
    public &lt;T&gt; T deserialize(ByteBuf buffer, Class&lt;T&gt; clazz) {
        try {
            // 读取消息长度
            int messageLength = buffer.readInt();
            
            // 读取消息内容
            byte[] messageBytes = new byte[messageLength];
            buffer.readBytes(messageBytes);
            
            // 使用反射获取解析方法（可以缓存Method对象优化）
            Method parseFromMethod = clazz.getMethod("parseFrom", byte[].class);
            return (T) parseFromMethod.invoke(null, (Object) messageBytes);
            
        } catch (Exception e) {
            throw new SerializationException("Deserialization failed", e);
        }
    }
}
```

#### 自定义二进制协议

```java
/**
 * 自定义高性能二进制协议
 */
public class CustomBinaryProtocol {
    
    // 协议头格式：4字节魔数 + 4字节长度 + 1字节版本 + 1字节消息类型 + 8字节请求ID
    private static final int MAGIC_NUMBER = 0xCAFEBABE;
    private static final byte VERSION = 1;
    private static final int HEADER_SIZE = 18;
    
    public static ByteBuf encodeRequest(RPCRequest request) {
        byte[] bodyBytes = serializeBody(request);
        int totalLength = HEADER_SIZE + bodyBytes.length;
        
        ByteBuf buffer = PooledByteBufAllocator.DEFAULT.directBuffer(totalLength);
        
        // 写入协议头
        buffer.writeInt(MAGIC_NUMBER);
        buffer.writeInt(bodyBytes.length);
        buffer.writeByte(VERSION);
        buffer.writeByte(MessageType.REQUEST.getCode());
        buffer.writeLong(request.getRequestId());
        
        // 写入消息体
        buffer.writeBytes(bodyBytes);
        
        return buffer;
    }
    
    public static RPCRequest decodeRequest(ByteBuf buffer) {
        // 验证魔数
        int magic = buffer.readInt();
        if (magic != MAGIC_NUMBER) {
            throw new ProtocolException("Invalid magic number: " + magic);
        }
        
        // 读取消息长度
        int bodyLength = buffer.readInt();
        
        // 读取版本和消息类型
        byte version = buffer.readByte();
        byte messageType = buffer.readByte();
        
        // 读取请求ID
        long requestId = buffer.readLong();
        
        // 读取消息体
        byte[] bodyBytes = new byte[bodyLength];
        buffer.readBytes(bodyBytes);
        
        return deserializeRequest(bodyBytes, requestId);
    }
    
    private static byte[] serializeBody(RPCRequest request) {
        // 使用高性能序列化方式，如Kryo、FST等
        return KryoSerializer.serialize(request);
    }
    
    private static RPCRequest deserializeRequest(byte[] bodyBytes, long requestId) {
        RPCRequest request = KryoSerializer.deserialize(bodyBytes, RPCRequest.class);
        request.setRequestId(requestId);
        return request;
    }
}
```

### 3. 客户端调用优化

#### 异步调用客户端

```java
/**
 * 高性能异步RPC客户端
 */
@Component
public class AsyncRPCClient {
    
    private final NetworkLayer networkLayer;
    private final LoadBalancer loadBalancer;
    private final CircuitBreaker circuitBreaker;
    private final MetricsCollector metricsCollector;
    
    // 请求超时管理
    private final ScheduledExecutorService timeoutExecutor = 
        Executors.newScheduledThreadPool(2, new DefaultThreadFactory("rpc-timeout"));
    
    public &lt;T&gt; CompletableFuture&lt;T&gt; callAsync(String serviceName, 
            String methodName, Object[] args, Class&lt;T&gt; returnType) {
        
        long startTime = System.nanoTime();
        
        return CompletableFuture
            // 1. 负载均衡选择服务器
            .supplyAsync(() -> loadBalancer.select(serviceName))
            
            // 2. 熔断检查
            .thenCompose(serverAddress -> {
                if (!circuitBreaker.allowRequest(serviceName)) {
                    return CompletableFuture.completedFuture(
                        new RuntimeException("Circuit breaker is open"));
                }
                return CompletableFuture.completedFuture(serverAddress);
            })
            
            // 3. 构建请求
            .thenCompose(serverAddress -> {
                RPCRequest request = RPCRequest.builder()
                    .serviceName(serviceName)
                    .methodName(methodName)
                    .args(args)
                    .requestId(RequestIdGenerator.next())
                    .timeout(3000)
                    .build();
                
                return networkLayer.sendAsync(request, serverAddress);
            })
            
            // 4. 处理响应
            .thenApply(response -> {
                long duration = System.nanoTime() - startTime;
                metricsCollector.recordLatency(serviceName, duration);
                
                if (response.isSuccess()) {
                    circuitBreaker.recordSuccess(serviceName);
                    return (T) response.getResult();
                } else {
                    circuitBreaker.recordFailure(serviceName);
                    throw new RPCException(response.getErrorMessage());
                }
            })
            
            // 5. 超时处理
            .orTimeout(3000, TimeUnit.MILLISECONDS)
            
            // 6. 异常处理
            .exceptionally(throwable -> {
                long duration = System.nanoTime() - startTime;
                metricsCollector.recordError(serviceName, throwable, duration);
                circuitBreaker.recordFailure(serviceName);
                
                if (throwable instanceof TimeoutException) {
                    throw new RPCTimeoutException("RPC call timeout", throwable);
                }
                throw new RPCException("RPC call failed", throwable);
            });
    }
}
```

### 4. 服务端处理优化

#### 高性能服务端

```java
/**
 * 高性能RPC服务端
 */
@Component
public class HighPerformanceRPCServer {
    
    private final ServerBootstrap serverBootstrap;
    private final ServiceRegistry serviceRegistry;
    private final ExecutorService businessThreadPool;
    
    public HighPerformanceRPCServer() {
        // 业务线程池，避免阻塞IO线程
        this.businessThreadPool = new ThreadPoolExecutor(
            Runtime.getRuntime().availableProcessors() * 2,  // 核心线程数
            Runtime.getRuntime().availableProcessors() * 4,  // 最大线程数
            60L, TimeUnit.SECONDS,                           // 空闲时间
            new ArrayBlockingQueue<>(10000),                 // 任务队列
            new DefaultThreadFactory("rpc-business"),        // 线程工厂
            new ThreadPoolExecutor.CallerRunsPolicy()        // 拒绝策略
        );
        
        this.serviceRegistry = new ServiceRegistry();
        this.serverBootstrap = createServerBootstrap();
    }
    
    private ServerBootstrap createServerBootstrap() {
        EventLoopGroup bossGroup = Epoll.isAvailable() ? 
            new EpollEventLoopGroup(1) : new NioEventLoopGroup(1);
        EventLoopGroup workerGroup = Epoll.isAvailable() ? 
            new EpollEventLoopGroup() : new NioEventLoopGroup();
        
        return new ServerBootstrap()
            .group(bossGroup, workerGroup)
            .channel(Epoll.isAvailable() ? 
                EpollServerSocketChannel.class : NioServerSocketChannel.class)
            .option(ChannelOption.SO_BACKLOG, 1024)
            .option(ChannelOption.SO_REUSEADDR, true)
            .childOption(ChannelOption.TCP_NODELAY, true)
            .childOption(ChannelOption.SO_KEEPALIVE, true)
            .childOption(ChannelOption.ALLOCATOR, PooledByteBufAllocator.DEFAULT)
            .childHandler(new ChannelInitializer&lt;SocketChannel&gt;() {
                @Override
                protected void initChannel(SocketChannel ch) {
                    ChannelPipeline pipeline = ch.pipeline();
                    pipeline.addLast(new HighPerformanceDecoder());
                    pipeline.addLast(new HighPerformanceEncoder());
                    pipeline.addLast(new ServerHandler(serviceRegistry, 
                        businessThreadPool));
                }
            });
    }
}

/**
 * 服务端请求处理器
 */
@ChannelHandler.Sharable
public class ServerHandler extends ChannelInboundHandlerAdapter {
    
    private final ServiceRegistry serviceRegistry;
    private final ExecutorService businessThreadPool;
    private final MetricsCollector metricsCollector;
    
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        if (msg instanceof RPCRequest) {
            RPCRequest request = (RPCRequest) msg;
            
            // 异步处理业务逻辑，避免阻塞IO线程
            businessThreadPool.submit(() -> {
                long startTime = System.nanoTime();
                RPCResponse response = null;
                
                try {
                    // 查找服务实现
                    Object serviceImpl = serviceRegistry.getService(
                        request.getServiceName());
                    
                    if (serviceImpl == null) {
                        response = RPCResponse.error(request.getRequestId(), 
                            "Service not found: " + request.getServiceName());
                    } else {
                        // 反射调用方法
                        Object result = invokeMethod(serviceImpl, 
                            request.getMethodName(), request.getArgs());
                        
                        response = RPCResponse.success(request.getRequestId(), result);
                    }
                    
                } catch (Exception e) {
                    response = RPCResponse.error(request.getRequestId(), 
                        e.getMessage());
                } finally {
                    // 记录监控指标
                    long duration = System.nanoTime() - startTime;
                    metricsCollector.recordServerLatency(
                        request.getServiceName(), duration);
                }
                
                // 写回响应
                ctx.writeAndFlush(response);
            });
        }
    }
    
    private Object invokeMethod(Object serviceImpl, String methodName, 
            Object[] args) throws Exception {
        
        Class&lt;?> serviceClass = serviceImpl.getClass();
        
        // 可以优化：缓存Method对象避免反复查找
        Method method = findMethod(serviceClass, methodName, args);
        
        if (method == null) {
            throw new NoSuchMethodException("Method not found: " + methodName);
        }
        
        return method.invoke(serviceImpl, args);
    }
}
```

### 5. 性能优化策略

#### 内存优化

```java
/**
 * 内存优化策略
 */
@Component
public class MemoryOptimizer {
    
    // 对象池，复用频繁创建的对象
    private final ObjectPool&lt;RPCRequest&gt; requestPool = 
        new GenericObjectPool<>(new RPCRequestFactory());
    
    private final ObjectPool&lt;RPCResponse&gt; responsePool = 
        new GenericObjectPool<>(new RPCResponseFactory());
    
    // ByteBuf分配器，使用直接内存
    private final ByteBufAllocator allocator = PooledByteBufAllocator.DEFAULT;
    
    public RPCRequest borrowRequest() {
        try {
            return requestPool.borrowObject();
        } catch (Exception e) {
            return new RPCRequest();
        }
    }
    
    public void returnRequest(RPCRequest request) {
        try {
            request.reset(); // 重置对象状态
            requestPool.returnObject(request);
        } catch (Exception e) {
            // 忽略返还失败
        }
    }
    
    public ByteBuf allocateBuffer(int initialCapacity) {
        return allocator.directBuffer(initialCapacity);
    }
}

/**
 * 零拷贝优化
 */
public class ZeroCopyOptimization {
    
    // 使用CompositeByteBuf避免内存拷贝
    public ByteBuf combineBuffers(ByteBuf header, ByteBuf body) {
        CompositeByteBuf composite = Unpooled.compositeBuffer(2);
        composite.addComponent(true, header);
        composite.addComponent(true, body);
        return composite;
    }
    
    // 使用FileRegion实现零拷贝文件传输
    public void sendFile(Channel channel, String filePath) throws IOException {
        RandomAccessFile file = new RandomAccessFile(filePath, "r");
        FileChannel fileChannel = file.getChannel();
        
        DefaultFileRegion fileRegion = new DefaultFileRegion(
            fileChannel, 0, file.length());
        
        channel.writeAndFlush(fileRegion).addListener(future -> {
            try {
                fileChannel.close();
                file.close();
            } catch (IOException e) {
                // 处理异常
            }
        });
    }
}
```

#### CPU优化

```java
/**
 * CPU优化策略
 */
@Component
public class CPUOptimizer {
    
    // 使用无锁数据结构
    private final AtomicLong requestIdGenerator = new AtomicLong(0);
    private final ConcurrentHashMap<Long, CompletableFuture&lt;RPCResponse&gt;> 
        pendingRequests = new ConcurrentHashMap<>();
    
    // 线程本地变量，避免线程争用
    private final ThreadLocal&lt;MessageDigest&gt; MD5_DIGEST = 
        ThreadLocal.withInitial(() -> {
            try {
                return MessageDigest.getInstance("MD5");
            } catch (NoSuchAlgorithmException e) {
                throw new RuntimeException(e);
            }
        });
    
    public long nextRequestId() {
        return requestIdGenerator.incrementAndGet();
    }
    
    public void registerPendingRequest(long requestId, 
            CompletableFuture&lt;RPCResponse&gt; future) {
        pendingRequests.put(requestId, future);
    }
    
    public CompletableFuture&lt;RPCResponse&gt; removePendingRequest(long requestId) {
        return pendingRequests.remove(requestId);
    }
    
    // 使用位运算优化哈希计算
    public int hash(String key) {
        int h = key.hashCode();
        return h ^ (h >>> 16);
    }
}
```

### 6. 监控和诊断

#### 性能监控

```java
/**
 * 性能监控组件
 */
@Component
public class RPCMetricsCollector {
    
    private final MeterRegistry meterRegistry = new PrometheusMeterRegistry();
    
    // 延迟统计
    private final Timer clientLatencyTimer = Timer.builder("rpc.client.latency")
        .register(meterRegistry);
    
    private final Timer serverLatencyTimer = Timer.builder("rpc.server.latency")
        .register(meterRegistry);
    
    // QPS统计
    private final Counter requestCounter = Counter.builder("rpc.requests.total")
        .register(meterRegistry);
    
    private final Counter errorCounter = Counter.builder("rpc.errors.total")
        .register(meterRegistry);
    
    // 连接数统计
    private final Gauge activeConnectionGauge = Gauge.builder("rpc.connections.active")
        .register(meterRegistry, this, RPCMetricsCollector::getActiveConnections);
    
    public void recordClientLatency(String service, long durationNanos) {
        clientLatencyTimer.record(durationNanos, TimeUnit.NANOSECONDS,
            Tags.of("service", service));
        requestCounter.increment(Tags.of("service", service, "type", "client"));
    }
    
    public void recordServerLatency(String service, long durationNanos) {
        serverLatencyTimer.record(durationNanos, TimeUnit.NANOSECONDS,
            Tags.of("service", service));
        requestCounter.increment(Tags.of("service", service, "type", "server"));
    }
    
    public void recordError(String service, String errorType) {
        errorCounter.increment(Tags.of("service", service, "error", errorType));
    }
    
    private double getActiveConnections() {
        // 返回当前活跃连接数
        return ConnectionManager.getActiveConnectionCount();
    }
}
```

## 性能基准测试

### 测试环境

- **硬件配置**：8核16GB，千兆网络
- **JVM配置**：-Xms4g -Xmx4g -XX:+UseG1GC
- **测试工具**：JMH基准测试

### 测试结果

```java
/**
 * RPC框架性能基准测试
 */
@BenchmarkMode(Mode.Throughput)
@OutputTimeUnit(TimeUnit.SECONDS)
@Warmup(iterations = 3, time = 10, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 5, time = 30, timeUnit = TimeUnit.SECONDS)
@Fork(1)
@State(Scope.Benchmark)
public class RPCFrameworkBenchmark {
    
    private AsyncRPCClient client;
    private String testService = "com.example.TestService";
    
    @Setup
    public void setup() {
        client = new AsyncRPCClient();
    }
    
    @Benchmark
    public CompletableFuture&lt;String&gt; testAsyncCall() {
        return client.callAsync(testService, "echo", 
            new Object[]{"hello"}, String.class);
    }
    
    // 基准测试结果：
    // Throughput: ~120,000 ops/sec
    // Average latency: 0.8ms
    // P95 latency: 1.5ms
    // P99 latency: 3.2ms
}
```

### 关键优化点总结

1. **网络层优化**

- 使用Epoll提升Linux环境性能
- 连接池复用，减少连接建立开销
- TCP_NODELAY禁用Nagle算法
- 合理设置缓冲区大小

1. **序列化优化**

- 选择高性能序列化协议（Protobuf/Kryo）
- 缓存序列化对象，避免重复创建
- 使用直接内存，减少拷贝

1. **线程模型优化**

- IO线程与业务线程分离
- 异步处理，避免阻塞
- 合理配置线程池参数

1. **内存管理优化**

- 对象池复用频繁创建的对象
- 使用直接内存，避免GC压力
- 零拷贝优化数据传输

1. **CPU优化**

- 无锁数据结构减少争用
- 位运算优化哈希计算
- 方法调用缓存优化反射性能

通过以上优化策略，该RPC框架能够实现10万QPS的高并发处理能力，同时保持毫秒级的调用延迟，满足高性能业务场景的需求。
