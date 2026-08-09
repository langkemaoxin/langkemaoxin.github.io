---
title: "21、面试官：JWT签发后，用户注销了，Token如何失效？"
sidebarGroup: "赋文老师"
shortTitle: "21、面试官：JWT签发后，用户注销了，Token如何失效？"
order: 1235
date: 2026-01-03
category: "面试题"
tag:
  - "面试题"
description: "“面试官：‘JWT 签发后，用户点击注销，Token 怎么让它失效？’ 你是不是心里一慌：JWT 是无状态的，一旦签发没法主动撤回啊！”这道题堪称 Java 面试 “高频陷阱题”——90% 的开发者只答 “存黑名单”，却没 get 到面试官"
article: false
---

> 来源：[21、面试官：JWT签发后，用户注销了，Token如何失效？](https://www.yuque.com/tulingzhouyu/db22bv/pg86cc288ow7gyrc)

“面试官：‘JWT 签发后，用户点击注销，Token 怎么让它失效？’ 你是不是心里一慌：JWT 是无状态的，一旦签发没法主动撤回啊！”

这道题堪称 Java 面试 “高频陷阱题”——90% 的开发者只答 “存黑名单”，却没 get 到面试官的真实意图。看似考 “失效方法”，实则藏着对 JWT 本质、场景权衡、性能安全的三层考察。今天咱们从 “冲突本质” 到 “落地代码”，拆解这道题的满分思路，附场景配图 + Java 实现，让你面试时直接拿捏！

## 一、先搞懂：面试官到底在考你什么？（3 个核心考点）

Q1：为什么这道题能区分 “初级” 和 “中级” 开发者？A：JWT 的 “无状态” 是核心优势（不用服务器存储，分布式部署友好），但也是痛点 ——Token 一旦签发，只要签名正确、没过期，就默认有效。面试官想通过这道题，看你是否理解 “无状态≠不可控”，能否在 “架构优势” 和 “业务需求” 之间找到平衡。

Q2：面试官真正关注的 3 个维度？

1. **基础认知**：是否清楚 JWT 的有效性依赖 “签名 + 过期时间”，而非用户状态；
2. **场景思维**：能否根据并发量、架构（单体 / 分布式）选择合适方案；
3. **工程能力**：是否考虑性能（比如黑名单查询会不会拖慢接口）、安全性（比如刷新 Token 防泄露）。

## 二、冲突本质：为什么 JWT 注销后还能生效？

先看一个真实场景：用户 A 登录后，服务器签发 JWT（有效期 2 小时），A 点击 “注销” 退出系统。但此时 Token 还没过期，黑客如果截获这个 Token，依然能调用接口查询 A 的个人信息 —— 这就是核心冲突：

**JWT 的有效性只和 “技术层面” 相关（签名没篡改、没过期），和 “业务层面” 的用户状态（是否注销、封号）无关**。

解决问题的核心思路：在 JWT 的 “签名 + 过期” 之外，增加一层 “业务有效性校验”，让注销行为能影响 Token 的可用性。

## 三、4 种落地方案（场景 + 代码 + 配图）：从单体到分布式

### 方案 1：黑名单机制（中小规模系统首选）

#### 适用场景

- 并发量不高（QPS<1 万）、单体 / 小型分布式系统；
- 要求注销后 “立即失效”（比如金融、隐私相关接口）。

#### 核心逻辑

用户注销时，把 Token 存入 Redis 黑名单，设置过期时间 = JWT 剩余有效期（避免 Redis 无限存储）；接口请求时，先校验 Token 是否在黑名单中，在则拒绝访问。

#### Java 代码实现（完整可运行）

1. JWT 工具类（简化版，实际密钥需存配置中心）

**java**

运行

```java
import io.jsonwebtoken.*;
import java.util.Date;

public class JwtUtil {
    // 密钥（生产环境用配置中心管理）
    private static final String SECRET = "your-128bit-secret-key";
    // JWT默认有效期2小时
    private static final long EXPIRATION = 7200000;

    // 生成Token
    public static String generateToken(String userId) {
        Date now = new Date();
        Date expirationDate = new Date(now.getTime() + EXPIRATION);
        return Jwts.builder()
                .setSubject(userId) // 存储用户ID
                .setIssuedAt(now)   // 签发时间
                .setExpiration(expirationDate) // 过期时间
                .signWith(SignatureAlgorithm.HS256, SECRET) // HS256签名
                .compact();
    }

    // 验证Token签名和过期时间
    public static boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(SECRET).parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException | MalformedJwtException | SignatureException e) {
            return false; // 过期、格式错误、签名无效均返回false
        }
    }

    // 获取Token剩余有效期（毫秒）
    public static long getRemainingTime(String token) {
        Claims claims = Jwts.parser().setSigningKey(SECRET).parseClaimsJws(token).getBody();
        return claims.getExpiration().getTime() - System.currentTimeMillis();
    }
}
```

1. 注销接口（存入黑名单）

**java**

运行

```java
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.annotation.Resource;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/user")
public class UserController {
    @Resource
    private StringRedisTemplate redisTemplate;

    @PostMapping("/logout")
    public Result&lt;?> logout(@RequestHeader("Authorization") String token) {
        // 去掉前端传的"Bearer "前缀
        token = token.replace("Bearer ", "");
        
        // 先校验Token是否有效（避免无效Token存入黑名单）
        if (!JwtUtil.validateToken(token)) {
            return Result.error("Token无效");
        }
        
        // 计算Token剩余有效期，作为Redis过期时间（避免内存浪费）
        long remainingTime = JwtUtil.getRemainingTime(token);
        // 存入黑名单：key=blacklist:token，value=1（占位即可）
        redisTemplate.opsForValue().set(
            "blacklist:" + token, 
            "1", 
            remainingTime, 
            TimeUnit.MILLISECONDS
        );
        
        return Result.success("注销成功");
    }
}
```

1. 拦截器（校验黑名单）

**java**

运行

```java
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.servlet.HandlerInterceptor;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@Component
public class JwtInterceptor implements HandlerInterceptor {
    @Resource
    private StringRedisTemplate redisTemplate;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. 获取请求头中的Token
        String token = request.getHeader("Authorization");
        if (token == null || token.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }
        token = token.replace("Bearer ", "");

        // 2. 校验Token签名和过期时间
        if (!JwtUtil.validateToken(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }

        // 3. 校验是否在黑名单中（Redis查询O(1)，性能可控）
        Boolean isBlack = redisTemplate.hasKey("blacklist:" + token);
        if (Boolean.TRUE.equals(isBlack)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }

        return true; // 校验通过，放行
    }
}
```

1. 拦截器配置

**java**

运行

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import javax.annotation.Resource;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Resource
    private JwtInterceptor jwtInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtInterceptor)
                .addPathPatterns("/**") // 所有接口拦截
                .excludePathPatterns("/user/login"); // 登录接口放行
    }
}
```

#### 配图建议（黑名单机制流程图）

**plaintext**

```plain
用户请求 → 拦截器 → ①校验Token签名+过期？→ 否（返回401）
                     ↓ 是
                     ②查询Redis黑名单？→ 是（返回401）
                     ↓ 否
                     放行到业务接口
```

### 方案 2：短有效期 + 刷新 Token（高并发场景首选）

#### 适用场景

- 并发量高（QPS>1 万）、分布式系统；
- 允许注销后 “短窗口”（比如 5 分钟）内 Token 仍有效（非核心接口可接受）。

#### 核心逻辑

拆分两个 Token：

- **Access Token**：短期有效（5 分钟），用于接口请求；
- **Refresh Token**：长期有效（7 天），仅用于刷新 Access Token；用户注销时，只需删除 Redis 中存储的 Refresh Token—— 旧 Access Token 过期后，无法获取新 Token，自然失效。

#### Java 代码实现

1. 双 Token 生成与刷新服务

**java**

运行

```java
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import javax.annotation.Resource;
import java.util.Date;

@Service
public class AuthService {
    @Resource
    private StringRedisTemplate redisTemplate;

    // Access Token有效期：5分钟
    private static final long ACCESS_EXP = 300000;
    // Refresh Token有效期：7天
    private static final long REFRESH_EXP = 604800000;
    // 双Token密钥（分开存储，更安全）
    private static final String ACCESS_SECRET = "access-secret-123";
    private static final String REFRESH_SECRET = "refresh-secret-456";

    // 生成双Token
    public TokenPair generateTokenPair(String userId) {
        // 1. 生成Access Token
        String accessToken = generateAccessToken(userId);
        // 2. 生成Refresh Token
        String refreshToken = generateRefreshToken(userId);
        // 3. 存储Refresh Token到Redis（key=refresh:userId，防止多端登录覆盖）
        redisTemplate.opsForValue().set(
            "refresh:" + userId, 
            refreshToken, 
            REFRESH_EXP, 
            java.util.concurrent.TimeUnit.MILLISECONDS
        );
        return new TokenPair(accessToken, refreshToken);
    }

    // 刷新Access Token
    public String refreshAccessToken(String refreshToken) {
        try {
            // 1. 校验Refresh Token有效性
            Claims claims = Jwts.parser()
                    .setSigningKey(REFRESH_SECRET)
                    .parseClaimsJws(refreshToken)
                    .getBody();
            String userId = claims.getSubject();

            // 2. 校验Redis中存储的Refresh Token是否一致（防止注销后仍刷新）
            String storedRefresh = redisTemplate.opsForValue().get("refresh:" + userId);
            if (storedRefresh == null || !storedRefresh.equals(refreshToken)) {
                throw new RuntimeException("Refresh Token已失效");
            }

            // 3. 生成新的Access Token
            return generateAccessToken(userId);
        } catch (Exception e) {
            throw new RuntimeException("Token刷新失败");
        }
    }

    // 注销：删除Refresh Token
    public void logout(String userId) {
        redisTemplate.delete("refresh:" + userId);
    }

    // 生成Access Token
    private String generateAccessToken(String userId) {
        return Jwts.builder()
                .setSubject(userId)
                .setExpiration(new Date(System.currentTimeMillis() + ACCESS_EXP))
                .signWith(SignatureAlgorithm.HS256, ACCESS_SECRET)
                .compact();
    }

    // 生成Refresh Token
    private String generateRefreshToken(String userId) {
        return Jwts.builder()
                .setSubject(userId)
                .setExpiration(new Date(System.currentTimeMillis() + REFRESH_EXP))
                .signWith(SignatureAlgorithm.HS256, REFRESH_SECRET)
                .compact();
    }

    // 双Token封装类
    public static class TokenPair {
        private String accessToken;
        private String refreshToken;
        // getter/setter构造方法省略
    }
}
```

1. 接口层实现

**java**

运行

```java
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import javax.annotation.Resource;

@RestController
@RequestMapping("/auth")
public class AuthController {
    @Resource
    private AuthService authService;

    // 登录生成双Token
    @PostMapping("/login")
    public Result<AuthService.TokenPair> login(
            @RequestParam String username, 
            @RequestParam String password) {
        // 省略用户名密码校验（实际需查库/缓存）
        String userId = "1001"; // 假设校验通过后获取userId
        AuthService.TokenPair tokenPair = authService.generateTokenPair(userId);
        return Result.success(tokenPair);
    }

    // 刷新Access Token
    @PostMapping("/refresh")
    public Result&lt;String&gt; refresh(@RequestParam String refreshToken) {
        String newAccessToken = authService.refreshAccessToken(refreshToken);
        return Result.success(newAccessToken);
    }

    // 注销
    @PostMapping("/logout")
    public Result&lt;?> logout(@RequestParam String userId) {
        authService.logout(userId);
        return Result.success("注销成功");
    }
}
```

#### 配图建议（双 Token 交互时序图）

**plaintext**

```plain
用户登录 → 服务器返回Access Token+Refresh Token
↓
用户用Access Token请求接口 → 接口正常响应（5分钟内）
↓
Access Token过期 → 用户用Refresh Token请求刷新接口
↓
服务器校验Refresh Token（Redis存在）→ 返回新Access Token
↓
用户注销 → 服务器删除Redis中的Refresh Token
↓
旧Access Token过期 → 无法刷新新Token → 彻底失效
```

### 方案 3：令牌撤销中心（大规模分布式系统）

#### 适用场景

- 微服务架构（多服务集群）；
- 需要统一管理 Token 注销、封号、批量失效（比如运营后台批量禁用账号）。

#### 核心逻辑

搭建独立的 “令牌撤销中心” 微服务，内部维护 Redis 集群存储失效 Token；所有业务服务通过 Feign 调用撤销中心，校验 Token 是否有效。

#### Java 代码实现（核心部分）

1. 撤销中心 Feign 接口

**java**

运行

```java
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

// 调用撤销中心服务
@FeignClient(name = "token-revoke-center")
public interface TokenRevokeClient {
    // 检查Token是否已撤销
    @GetMapping("/revoke/check")
    boolean isTokenRevoked(@RequestParam String token);

    // 按用户批量撤销Token
    @PostMapping("/revoke/user")
    void revokeByUserId(@RequestParam String userId);
}
```

1. 撤销中心实现（核心接口）

**java**

运行

```java
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.*;
import javax.annotation.Resource;

@RestController
@RequestMapping("/revoke")
public class RevokeController {
    @Resource
    private StringRedisTemplate redisTemplate;

    // 检查Token是否已撤销
    @GetMapping("/check")
    public boolean isTokenRevoked(@RequestParam String token) {
        return redisTemplate.hasKey("revoked:" + token);
    }

    // 按用户批量撤销（关联JWT的jti声明，需生成Token时加入）
    @PostMapping("/user")
    public void revokeByUserId(@RequestParam String userId) {
        // 假设生成Token时存入jti（唯一标识），并关联用户
        String jtiKey = "user:jti:" + userId;
        redisTemplate.opsForSet().members(jtiKey).forEach(jti -> {
            // 撤销对应Token（设置过期时间=JWT剩余有效期）
            redisTemplate.opsForValue().set(
                "revoked:" + jti, 
                "1", 
                JwtUtil.getRemainingTimeByJti(jti), 
                java.util.concurrent.TimeUnit.MILLISECONDS
            );
        });
        // 删除用户与jti的关联
        redisTemplate.delete(jtiKey);
    }
}
```

1. 业务服务拦截器调用撤销中心

**java**

运行

```java
import org.springframework.web.servlet.HandlerInterceptor;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@Component
public class MicroServiceJwtInterceptor implements HandlerInterceptor {
    @Resource
    private TokenRevokeClient revokeClient;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String token = request.getHeader("Authorization").replace("Bearer ", "");
        
        // 1. 校验JWT本身有效性
        if (!JwtUtil.validateToken(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }
        
        // 2. 调用撤销中心检查是否已撤销
        if (revokeClient.isTokenRevoked(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }
        
        return true;
    }
}
```

#### 配图建议（分布式撤销中心架构图）

**plaintext**

```plain
用户 → 网关 → 业务服务A/B/C → Feign调用 → 令牌撤销中心（Redis集群）
                                          ↓
                                      校验Token状态
                                          ↓
业务服务接收结果 → 有效则放行，无效则返回401
```

### 方案 4：自定义 JWT 声明（批量失效特殊场景）

#### 适用场景

- 需要快速让某类用户（比如管理员账号、违规用户）的所有 Token 失效；
- 无需逐个处理 Token，支持 “一键禁用”。

#### 核心逻辑

在 JWT 中加入自定义声明（比如`version`版本号），服务器存储用户的最新版本号；用户注销 / 被禁用时，修改服务器中的`version`；接口校验时，对比 Token 中的`version`与服务器版本，不一致则失效。

#### Java 代码实现（核心片段）

**java**

运行

```java
// 生成Token时加入version声明
public static String generateTokenWithVersion(String userId) {
    // 从Redis获取用户当前version（默认1）
    String version = redisTemplate.opsForValue().get("jwt:version:" + userId);
    if (version == null) {
        version = "1";
        redisTemplate.opsForValue().set("jwt:version:" + userId, version);
    }
    return Jwts.builder()
            .setSubject(userId)
            .claim("version", version) // 加入自定义声明
            .setExpiration(new Date(System.currentTimeMillis() + 7200000))
            .signWith(SignatureAlgorithm.HS256, SECRET)
            .compact();
}

// 校验时对比version
public static boolean validateTokenWithVersion(String token) {
    try {
        Claims claims = Jwts.parser().setSigningKey(SECRET).parseClaimsJws(token).getBody();
        String userId = claims.getSubject();
        String tokenVersion = claims.get("version", String.class);
        String serverVersion = redisTemplate.opsForValue().get("jwt:version:" + userId);
        return tokenVersion.equals(serverVersion);
    } catch (Exception e) {
        return false;
    }
}

// 批量失效：修改用户version
public void revokeAllTokens(String userId) {
    String oldVersion = redisTemplate.opsForValue().get("jwt:version:" + userId);
    redisTemplate.opsForValue().set("jwt:version:" + userId, String.valueOf(Integer.parseInt(oldVersion) + 1));
}
```

#### 配图建议（自定义声明校验流程图）

**plaintext**

```plain
生成Token（含version=1）→ 服务器存储version=1
↓
用户注销 → 服务器version更新为2
↓
用户用旧Token请求 → 校验version（1≠2）→ 返回401
```

## 四、面试避坑指南（3 个高频追问）

Q1：为什么不建议用数据库存黑名单？A：数据库查询是磁盘 IO，Redis 是内存 IO，性能差 100 倍以上；高并发场景下，数据库会成为瓶颈，导致接口响应超时。

Q2：Refresh Token 应该存在哪里？A：前端存`HttpOnly Cookie`（防止 XSS 攻击窃取），后端存 Redis 并加密（比如 AES）；禁止前端存 LocalStorage（易被 XSS 窃取）。

Q3：双 Token 方案中，Refresh Token 过期了怎么办？A：让用户重新登录 ——Refresh Token 有效期可设为 7~30 天，结合 “记住我” 功能动态调整；过期后强制重新校验账号密码，保证安全性。

## 五、总结

回到面试题本身：JWT 注销后 Token 失效的核心，是**在 “无状态” 基础上增加 “业务校验层”** 。面试官要的不是你背一个方案，而是你能根据场景选择最优解 —— 比如中小规模用黑名单，高并发用双 Token，分布式用撤销中心。
