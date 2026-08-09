---
title: "吃透多端登录强制下线：Java 后端 3 大核心方案（附完整代码 / 伪代码）+ 面试高频避坑点"
sidebarGroup: "鹏宇老师"
shortTitle: "吃透多端登录强制下线：Java 后端 3 大核心方案（附完整代码 / 伪代码）+ 面试高频避坑点"
order: 1194
date: 2025-12-30
category: "面试题"
tag:
  - "面试题"
description: "一、需求背景与核心概念1.1 核心业务需求在账号体系相关系统中（如视频会员、办公协作工具、游戏账号），“多端登录强制下线” 是保障账号安全与商业收益的核心需求，具体场景包括：防止账号共享：避免 1 个 VIP 账号被多人同时使用（如 1 个"
article: false
---

> 来源：[吃透多端登录强制下线：Java 后端 3 大核心方案（附完整代码 / 伪代码）+ 面试高频避坑点](https://www.yuque.com/tulingzhouyu/db22bv/syrk6fzgi1nslay8)

## 一、需求背景与核心概念

### 1.1 核心业务需求

在账号体系相关系统中（如视频会员、办公协作工具、游戏账号），“多端登录强制下线” 是保障**账号安全**与**商业收益**的核心需求，具体场景包括：

- 防止账号共享：避免 1 个 VIP 账号被多人同时使用（如 1 个视频会员账号登录 5 台设备），导致企业付费用户流失；
- 账号安全防护：检测到陌生设备登录时，可强制下线旧设备，防止账号被盗用后的数据泄露；
- 资源占用控制：避免同一账号多端登录导致服务器资源（如连接数、缓存）过度消耗。

![image](/面试题/高频面试问题/鹏宇老师/1194-multi-device-login-force-logout-java/img-fd5da8e34cda.png)

### 1.2 核心实现逻辑（3 步总纲）

无论最终选择哪种技术方案，“多端登录强制下线” 的核心逻辑始终围绕 “会话生命周期可控” 展开，可拆解为 3 个关键步骤，先明确这一总纲，后续方案理解会更清晰：

1. **第一步：检测（是否存在活跃会话）**新用户发起登录请求时，首先查询该账号是否已存在有效活跃会话（会话载体可能是 Session、Token 或 JWT）。核心目的是判断 “当前账号是否已在其他设备登录”，避免跳过检测导致 “多端同时登录且无法管控” 的漏洞。
2. **第二步：处理（旧会话的管控策略）**若检测到账号已存在活跃会话，需触发 “旧会话处理逻辑”：

- 优先提示用户确认（如前端弹窗 “检测到您的账号已在电脑端登录，是否强制下线？”），兼顾用户体验；
- 用户确认后，销毁旧会话（如删除 Session、清除 Redis 中的 Token/JWT 映射），确保旧设备后续请求失效；
- 若用户拒绝强制下线，则终止当前登录流程，返回 “登录失败” 提示。

1. **第三步：存储（新会话的安全保存）**旧会话处理完成后，生成新会话并安全存储：

- 存储内容需包含 “账号唯一标识” 与 “会话标识” 的关联（如 SessionId 与 userId、Token 与 userId）；
- 确保后续请求能通过会话标识验证身份（如浏览器携带 SessionId、APP 携带 Token）；
- 同步设置会话过期时间，避免无效会话长期占用存储资源。

**关键差异点**：不同方案的核心区别仅在于 “会话的存储介质与验证方式”（如 Session 存在内存 Map、Token 存在 Redis、JWT 存在客户端 + Redis 缓存），但 “检测→处理→存储” 的 3 步逻辑完全一致。

![image](/面试题/高频面试问题/鹏宇老师/1194-multi-device-login-force-logout-java/img-48e8d970e90b.png)

### 1.3 核心技术概念

**概念**
**定义与作用**

会话（Session）
服务器端存储的用户登录状态，包含用户信息、登录时间等，通过 SessionId 与客户端关联（依赖 Cookie 传递 SessionId）

Token
服务器生成的无状态令牌（字符串），含用户标识等信息，客户端每次请求携带 Token，服务器通过存储介质（如 Redis）验证有效性

JWT
JSON Web Token，自带用户信息的加密令牌（由 Header.Payload.Signature 组成），无需服务端存储用户信息，但无法主动失效

无状态服务
服务端不存储会话信息，仅通过客户端携带的 Token/JWT 验证身份，支持水平扩展（分布式架构核心需求）

## 二、方案一：Session + Cookie（单体架构）

### 2.1 适用场景

- 单体应用（如企业内部管理系统、小型 CRM 系统）；
- 无需跨服务共享会话，且用户终端以 PC 浏览器为主（依赖 Cookie 传递 SessionId）。

### 2.2 实现原理

通过**全局线程安全 Map**管理所有用户的 Session，配合**Session 监听器**同步销毁无效会话，确保 “一个账号仅存在一个有效 Session”，核心逻辑：

1. 用户登录时，查询全局 Map 是否存在该账号的旧 Session；
2. 若存在旧 Session，提示用户确认后删除旧 Session；
3. 生成新 Session，存入全局 Map，并通过 Cookie 返回 SessionId 给客户端；
4. Session 过期 / 用户退出时，监听器同步删除全局 Map 中的对应记录。

![image](/面试题/高频面试问题/鹏宇老师/1194-multi-device-login-force-logout-java/img-fffc17cde4b9.png)

### 2.3 核心代码实现

#### 2.3.1 全局 Session 管理工具类（伪代码）

```java
import javax.servlet.http.HttpSession;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 全局Session管理器（线程安全）
 * 对应PPT中“全局Map<SessionId, Session>”
 */
public class GlobalSessionManager {
    // 核心存储：key=SessionId，value=HttpSession（ConcurrentHashMap保证并发安全）
    private static final Map<String, HttpSession> SESSION_MAP = new ConcurrentHashMap<>();
    // 账号与SessionId的映射：key=userId，value=SessionId（用于快速查询账号是否已登录）
    private static final Map<String, String> USER_SESSION_MAP = new ConcurrentHashMap<>();

    /**
     * 新增Session（登录时调用）
     * @param userId 用户ID（账号唯一标识）
     * @param session 新生成的Session
     */
    public static void addSession(String userId, HttpSession session) {
        // 1. 若账号已存在旧Session，先删除旧Session
        if (USER_SESSION_MAP.containsKey(userId)) {
            String oldSessionId = USER_SESSION_MAP.get(userId);
            HttpSession oldSession = SESSION_MAP.get(oldSessionId);
            if (oldSession != null) {
                oldSession.invalidate(); // 触发Session销毁（会调用监听器）
                SESSION_MAP.remove(oldSessionId);
            }
        }
        // 2. 存储新Session
        String newSessionId = session.getId();
        SESSION_MAP.put(newSessionId, session);
        USER_SESSION_MAP.put(userId, newSessionId);
    }

    /**
     * 删除Session（Session过期/用户退出时调用）
     * @param sessionId 要删除的SessionId
     */
    public static void removeSession(String sessionId) {
        HttpSession session = SESSION_MAP.get(sessionId);
        if (session != null) {
            // 从USER_SESSION_MAP中删除账号映射
            String userId = (String) session.getAttribute("userId");
            if (userId != null) {
                USER_SESSION_MAP.remove(userId);
            }
            SESSION_MAP.remove(sessionId);
        }
    }

    /**
     * 查询账号是否已登录
     * @param userId 用户ID
     * @return 已登录返回true，否则false
     */
    public static boolean isUserLoggedIn(String userId) {
        return USER_SESSION_MAP.containsKey(userId);
    }
}
```

#### 2.3.2 Session 监听器（同步销毁全局 Map）

```java
import javax.servlet.http.HttpSession;
import javax.servlet.http.HttpSessionEvent;
import javax.servlet.http.HttpSessionListener;

/**
 * Session监听器：监听Session创建/销毁，同步更新GlobalSessionManager
 * 对应PPT中“Session监听器同步销毁无效会话”
 */
public class CustomSessionListener implements HttpSessionListener {

    // Session创建时触发（用户登录生成Session）
    @Override
    public void sessionCreated(HttpSessionEvent se) {
        HttpSession session = se.getSession();
        // 设置Session过期时间（30分钟，单位：秒）
        session.setMaxInactiveInterval(30 * 60);
    }

    // Session销毁时触发（过期/主动invalidate）
    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        HttpSession session = se.getSession();
        String sessionId = session.getId();
        // 从全局Map中删除该Session
        GlobalSessionManager.removeSession(sessionId);
    }
}
```

#### 2.3.3 登录接口实现（伪代码）

```java
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

@RestController
public class LoginController {

    @PostMapping("/login")
    public Result login(@RequestBody LoginDTO loginDTO, HttpServletRequest request) {
        // 1. 校验账号密码（省略，实际需查数据库）
        String userId = loginDTO.getUserId();
        boolean authSuccess = checkPassword(loginDTO.getUsername(), loginDTO.getPassword());
        if (!authSuccess) {
            return Result.fail("账号或密码错误");
        }

        // 2. 检查账号是否已登录（调用全局管理器）
        if (GlobalSessionManager.isUserLoggedIn(userId)) {
            // 提示用户：是否强制下线旧设备（前端弹窗确认）
            boolean forceLogout = loginDTO.isForceLogout();
            if (!forceLogout) {
                return Result.fail("账号已在其他设备登录，是否强制下线？");
            }
        }

        // 3. 生成新Session，存入全局管理器
        HttpSession session = request.getSession(true); // 不存在则创建新Session
        session.setAttribute("userId", userId); // 存储用户标识
        GlobalSessionManager.addSession(userId, session);

        // 4. 返回结果（SessionId通过Cookie自动传递，无需手动返回）
        return Result.success("登录成功", session.getId());
    }
}
```

### 2.4 避坑要点

1. **线程安全问题**：全局 Map 必须使用`ConcurrentHashMap`，避免多线程并发登录时的`ConcurrentModificationException`；
2. **会话同步问题**：必须通过`HttpSessionListener`监听 Session 销毁，否则 Session 过期后全局 Map 仍残留无效数据，导致内存泄漏；
3. **分布式不兼容**：单体架构专属方案，多服务部署时，各服务的`GlobalSessionManager`无法共享，会导致 “同一账号在不同服务同时登录” 的漏洞。

## 三、方案二：Token + Redis（分布式架构）

### 3.1 适用场景

- 分布式架构（如电商 APP、多端小程序）；
- 需跨服务共享会话（如用户服务、订单服务均需验证登录状态）；
- 支持多终端（PC/APP/ 平板），不依赖 Cookie（Token 可放在 Header / 请求参数中）。

### 3.2 实现原理

通过**Redis**存储 Token 的 “双向映射”，实现跨服务会话共享，核心逻辑：

1. 用户登录时，服务器生成唯一 Token（含用户 ID、过期时间）；
2. 查 Redis：若存在该用户的旧 Token，删除旧 Token 的双向映射；
3. 存 Redis：新增两个映射 ——`key=userId:${userId} → value=Token`（查账号登录状态）、`key=token:${Token} → value=userId`（验证 Token 有效性）；
4. 客户端每次请求携带 Token，服务器通过 Redis 验证 Token 是否存在，不存在则需重新登录。

![image](/面试题/高频面试问题/鹏宇老师/1194-multi-device-login-force-logout-java/img-53d32a67907b.png)

### 3.3 核心代码实现

#### 3.3.1 Token 工具类（生成 / 验证 Token）

```java
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
public class TokenManager {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    // Token过期时间（2小时）
    private static final long TOKEN_EXPIRE = 2 * 60 * 60;
    // Redis键前缀（避免key冲突）
    private static final String PREFIX_USER = "user:token:";
    private static final String PREFIX_TOKEN = "token:user:";

    /**
     * 生成Token并存储到Redis（登录时调用）
     * @param userId 用户ID
     * @return 生成的Token
     */
    public String generateToken(String userId) {
        // 1. 生成唯一Token（UUID+随机字符串，避免重复）
        String token = "TOKEN_" + UUID.randomUUID().toString().replace("-", "") + System.currentTimeMillis();

        // 2. 先删除旧Token（若存在）
        String oldToken = redisTemplate.opsForValue().get(PREFIX_USER + userId);
        if (oldToken != null) {
            redisTemplate.delete(PREFIX_TOKEN + oldToken); // 删除旧Token→userId映射
            redisTemplate.delete(PREFIX_USER + userId);   // 删除旧userId→Token映射
        }

        // 3. 存储新Token的双向映射（设置过期时间）
        redisTemplate.opsForValue().set(PREFIX_USER + userId, token, TOKEN_EXPIRE, TimeUnit.SECONDS);
        redisTemplate.opsForValue().set(PREFIX_TOKEN + token, userId, TOKEN_EXPIRE, TimeUnit.SECONDS);

        return token;
    }

    /**
     * 验证Token有效性（请求拦截时调用）
     * @param token 客户端携带的Token
     * @return 有效返回userId，无效返回null
     */
    public String validateToken(String token) {
        if (token == null || token.isEmpty()) {
            return null;
        }
        // 查Token→userId映射，若不存在则Token无效
        return redisTemplate.opsForValue().get(PREFIX_TOKEN + token);
    }

    /**
     * 强制下线（删除Token）
     * @param userId 用户ID
     */
    public void forceLogout(String userId) {
        String token = redisTemplate.opsForValue().get(PREFIX_USER + userId);
        if (token != null) {
            redisTemplate.delete(PREFIX_USER + userId);
            redisTemplate.delete(PREFIX_TOKEN + token);
        }
    }
}
```

#### 3.3.2 登录接口实现

```java
@RestController
public class LoginController {

    @Autowired
    private TokenManager tokenManager;

    @PostMapping("/login")
    public Result login(@RequestBody LoginDTO loginDTO) {
        // 1. 校验账号密码（省略）
        String userId = loginDTO.getUserId();
        boolean authSuccess = checkAuth(loginDTO);
        if (!authSuccess) {
            return Result.fail("认证失败");
        }

        // 2. 检查是否已登录（通过Redis查userId→Token）
        String oldToken = redisTemplate.opsForValue().get("user:token:" + userId);
        if (oldToken != null) {
            // 提示用户确认强制下线
            if (!loginDTO.isForceLogout()) {
                return Result.fail("账号已在其他设备登录，是否强制下线？");
            }
        }

        // 3. 生成新Token并存储
        String newToken = tokenManager.generateToken(userId);

        // 4. 返回Token（客户端需存储Token，后续请求放在Header中）
        return Result.success("登录成功", newToken);
    }
}
```

#### 3.3.3 登录拦截器（验证 Token）

```java
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@Component
public class LoginInterceptor implements HandlerInterceptor {

    @Autowired
    private TokenManager tokenManager;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. 从Header获取Token（客户端需携带：Authorization: Bearer ${Token}）
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7); // 截取"Bearer "后的真实Token
        }

        // 2. 验证Token
        String userId = tokenManager.validateToken(token);
        if (userId == null) {
            // Token无效，返回401未授权
            response.setContentType("application/json");
            response.getWriter().write(JSON.toJSONString(Result.fail("请先登录")));
            return false;
        }

        // 3. Token有效，延长过期时间（可选：实现“活跃会话续期”）
        tokenManager.refreshTokenExpire(token);

        // 4. 传递userId到Controller（通过Request属性）
        request.setAttribute("userId", userId);
        return true;
    }
}
```

### 3.4 避坑要点

1. **Redis 高可用**：Token 存储依赖 Redis，需部署 Redis 主从复制 + 哨兵 / 集群，避免 Redis 单点故障导致所有 Token 失效；
2. **Token 续期**：需实现 “活跃会话续期”（如拦截器中延长 Token 过期时间），否则用户操作中 Token 过期会强制登出，影响体验；
3. **键名规范**：必须添加 Redis 键前缀（如`user:token:`、`token:user:`），避免与其他业务的 Redis 键冲突。

## 四、方案三：JWT + Redis（高并发分布式架构）

### 4.1 适用场景

- 高并发场景（如秒杀系统、直播平台）；
- 需减少服务端查询压力（JWT 自带用户信息，无需查库 / Redis 获取用户基本信息）；
- 分布式架构，且需兼顾无状态与 “强制下线” 能力。

### 4.2 实现原理

JWT 本身是 “无状态令牌”，但无法主动失效，因此需结合**Redis 缓存 JWT**解决该缺陷，核心逻辑：

1. 用户登录时，生成 JWT（含 userId、过期时间、用户昵称等基础信息）；
2. 查 Redis：若存在该用户的旧 JWT，删除旧 JWT 缓存；
3. 存 Redis：`key=jwt:user:${userId} → value=JWT`（用于标记 “当前有效 JWT”）；
4. 客户端携带 JWT 请求，服务器先验证 JWT 签名有效性，再查 Redis 确认 JWT 是否在缓存中（存在则有效，不存在则已被强制下线）。

![image](/面试题/高频面试问题/鹏宇老师/1194-multi-device-login-force-logout-java/img-b2ef613a1196.png)

### 4.3 核心代码实现

#### 4.3.1 JWT 工具类（生成 / 验证 JWT）

```java
import io.jsonwebtoken.*;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtils {

    // JWT密钥（需配置在配置文件，避免硬编码）
    private static final String SECRET = "your-secret-key-123456";
    // JWT过期时间（2小时，与Redis缓存时间一致）
    private static final long EXPIRE = 2 * 60 * 60 * 1000;

    /**
     * 生成JWT（含用户基础信息）
     * @param userId 用户ID
     * @param username 用户名（JWT自带，无需后续查库）
     * @return JWT字符串
     */
    public String generateJwt(String userId, String username) {
        // 1. 设置JWT payload（用户基础信息，非敏感数据）
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("issueTime", new Date()); // 签发时间

        // 2. 生成JWT（Header.Payload.Signature）
        return Jwts.builder()
                .setClaims(claims) // 设置payload
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRE)) // 过期时间
                .signWith(SignatureAlgorithm.HS256, SECRET) // 签名算法+密钥
                .compact();
    }

    /**
     * 验证JWT签名有效性（不包含“是否被强制下线”判断）
     * @param jwt JWT字符串
     * @return 有效返回Claims（含用户信息），无效返回null
     */
    public Claims validateJwtSignature(String jwt) {
        try {
            // 验证签名+过期时间
            return Jwts.parser()
                    .setSigningKey(SECRET)
                    .parseClaimsJws(jwt)
                    .getBody();
        } catch (ExpiredJwtException | UnsupportedJwtException | MalformedJwtException | SignatureException e) {
            // JWT过期/格式错误/签名无效
            return null;
        }
    }

    /**
     * 从JWT中获取userId
     * @param jwt JWT字符串
     * @return userId
     */
    public String getUserIdFromJwt(String jwt) {
        Claims claims = validateJwtSignature(jwt);
        if (claims == null) {
            return null;
        }
        return claims.get("userId", String.class);
    }
}
```

#### 4.3.2 JWT 与 Redis 结合的登录逻辑

```java
@Component
public class JwtLoginService {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    // Redis键前缀
    private static final String PREFIX_JWT = "jwt:user:";
    // JWT过期时间（与Redis缓存时间一致，2小时）
    private static final long JWT_EXPIRE = 2 * 60 * 60;

    /**
     * 登录生成JWT并缓存到Redis
     * @param userId 用户ID
     * @param username 用户名
     * @param forceLogout 是否强制下线旧设备
     * @return JWT字符串
     */
    public String login(String userId, String username, boolean forceLogout) {
        // 1. 检查旧JWT是否存在（Redis中）
        String redisKey = PREFIX_JWT + userId;
        String oldJwt = redisTemplate.opsForValue().get(redisKey);
        if (oldJwt != null) {
            if (!forceLogout) {
                throw new BusinessException("账号已在其他设备登录，是否强制下线？");
            }
            // 强制下线：删除旧JWT缓存
            redisTemplate.delete(redisKey);
        }

        // 2. 生成新JWT
        String newJwt = jwtUtils.generateJwt(userId, username);

        // 3. 缓存新JWT到Redis（过期时间与JWT一致）
        redisTemplate.opsForValue().set(redisKey, newJwt, JWT_EXPIRE, TimeUnit.SECONDS);

        return newJwt;
    }

    /**
     * 验证JWT有效性（含强制下线判断）
     * @param jwt 客户端携带的JWT
     * @return 有效返回userId，无效返回null
     */
    public String validateJwt(String jwt) {
        // 1. 先验证JWT签名和过期时间
        String userId = jwtUtils.getUserIdFromJwt(jwt);
        if (userId == null) {
            return null;
        }

        // 2. 再验证Redis中是否存在该JWT（判断是否被强制下线）
        String redisKey = PREFIX_JWT + userId;
        String validJwt = redisTemplate.opsForValue().get(redisKey);
        if (validJwt == null || !validJwt.equals(jwt)) {
            // JWT已被删除（强制下线）或不一致（旧JWT）
            return null;
        }

        return userId;
    }
}
```

### 4.4 避坑要点

1. **过期时间同步**：JWT 本身的过期时间必须与 Redis 缓存时间完全一致，否则会出现 “JWT 未过期但 Redis 已删除”（无法登录）或 “JWT 已过期但 Redis 未删除”（无效 JWT 残留）的矛盾；
2. **不可依赖 JWT 单独使用**：仅靠 JWT 无法实现强制下线，必须配合 Redis 缓存 “当前有效 JWT”，这是 JWT 的核心缺陷，面试中需主动提及；
3. **敏感信息不放入 JWT**：JWT 的 Payload 是 Base64 编码（可解码），不可存储密码、手机号等敏感信息，仅放 userId、用户名等非敏感数据。

## 五、扩展场景：最多 3 端同时登录

### 5.1 业务需求

允许同一账号最多在 3 台不同设备登录（如微信、QQ 的多设备登录逻辑），超过 3 台时，按 “先进先出（FIFO）” 删除最早登录的设备会话。

### 5.2 实现原理

将 “单一会话存储” 升级为 “会话列表存储”，通过 Redis 的`List`结构维护每个用户的活跃会话，核心逻辑：

1. 每个用户对应一个 Redis List：`key=user:sessions:${userId}`，List 元素为 “会话对象”（含 token/JWT、设备标识、登录时间）；
2. 新登录时，先按设备标识去重（同一设备登录覆盖旧会话）；
3. 若 List 长度 < 3，直接添加新会话；若≥3，删除 List 中最早的会话（FIFO）；
4. 客户端可查询当前登录设备列表，支持手动踢下线某一端。

![image](/面试题/高频面试问题/鹏宇老师/1194-multi-device-login-force-logout-java/img-dcca73de5c1d.png)

### 5.3 核心代码实现（以 Token 方案为例）

```java
@Component
public class MultiDeviceLoginService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    // 最大登录设备数
    private static final int MAX_DEVICE_COUNT = 3;
    // Redis键前缀（用户会话列表）
    private static final String PREFIX_USER_SESSIONS = "user:sessions:";

    /**
     * 多设备登录逻辑
     * @param userId 用户ID
     * @param deviceInfo 设备信息（如：PC-Windows-Chrome、iPhone-15-iOS17）
     * @return 新生成的Token
     */
    public String multiDeviceLogin(String userId, String deviceInfo) {
        String redisKey = PREFIX_USER_SESSIONS + userId;
        // 1. 生成新会话（Token+设备信息+登录时间）
        DeviceSession newSession = new DeviceSession();
        newSession.setToken(generateToken(userId)); // 复用之前的Token生成逻辑
        newSession.setDeviceInfo(deviceInfo);
        newSession.setLoginTime(new Date());

        // 2. 设备去重：删除同一设备的旧会话（避免同一设备占多个名额）
        List&lt;DeviceSession&gt; sessionList = redisTemplate.opsForList().range(redisKey, 0, -1);
        if (sessionList != null && !sessionList.isEmpty()) {
            for (DeviceSession oldSession : sessionList) {
                if (oldSession.getDeviceInfo().equals(deviceInfo)) {
                    // 删除同一设备的旧会话
                    redisTemplate.opsForList().remove(redisKey, 1, oldSession);
                    break;
                }
            }
        }

        // 3. 检查会话列表长度，超过3则删除最早的会话（FIFO）
        Long currentSize = redisTemplate.opsForList().size(redisKey);
        if (currentSize != null && currentSize >= MAX_DEVICE_COUNT) {
            // 删除List的第一个元素（最早登录）
            redisTemplate.opsForList().leftPop(redisKey);
        }

        // 4. 添加新会话到List末尾（最新登录）
        redisTemplate.opsForList().rightPush(redisKey, newSession);

        // 5. 同步更新Token的双向映射（复用之前的Redis逻辑）
        updateTokenRedisMapping(userId, newSession.getToken());

        return newSession.getToken();
    }

    /**
     * 查询当前登录设备列表
     * @param userId 用户ID
     * @return 设备会话列表
     */
    public List&lt;DeviceSession&gt; getLoginDevices(String userId) {
        String redisKey = PREFIX_USER_SESSIONS + userId;
        return redisTemplate.opsForList().range(redisKey, 0, -1);
    }

    /**
     * 手动踢下线某一设备
     * @param userId 用户ID
     * @param token 要下线的设备Token
     */
    public void kickDevice(String userId, String token) {
        String redisKey = PREFIX_USER_SESSIONS + userId;
        List&lt;DeviceSession&gt; sessionList = redisTemplate.opsForList().range(redisKey, 0, -1);
        if (sessionList != null) {
            for (DeviceSession session : sessionList) {
                if (session.getToken().equals(token)) {
                    // 从列表中删除该会话
                    redisTemplate.opsForList().remove(redisKey, 1, session);
                    // 删除Token的Redis映射
                    deleteTokenRedisMapping(userId, token);
                    break;
                }
            }
        }
    }

    // 内部方法：生成Token（复用方案二的Token生成逻辑）
    private String generateToken(String userId) { /* 省略 */ }
    // 内部方法：更新Token的Redis双向映射（复用方案二的逻辑）
    private void updateTokenRedisMapping(String userId, String token) { /* 省略 */ }
    // 内部方法：删除Token的Redis映射（复用方案二的逻辑）
    private void deleteTokenRedisMapping(String userId, String token) { /* 省略 */ }
}

// 设备会话实体类
@Data
public class DeviceSession implements Serializable {
    private String token;         // 会话标识（Token/JWT）
    private String deviceInfo;    // 设备标识（如：PC-Windows-Chrome）
    private Date loginTime;       // 登录时间
    private Date lastActiveTime;  // 最后活跃时间（用于LRU策略）
}
```

### 5.4 面试应答与方案总结

本扩展场景的核心是 “在基础会话管理上增加‘数量控制’与‘用户可控’维度”，面试中需突出以下设计亮点：

1. **存储选型有理有据**：根据 “顺序需求” 选 List，根据 “快速查询” 选 Hash，体现对 Redis 数据结构的深度理解；
2. **策略设计灵活可扩展**：支持 FIFO/LRU 两种策略，可根据业务场景切换，而非固定一种方案；
3. **兼顾技术与体验**：既解决 “设备去重”“性能优化” 等技术问题，又通过 “设备展示”“手动踢下线” 提升用户体验；
4. **风险意识到位**：通过过期时间、定时清理避免存储膨胀，通过`scan`替代`keys`避免 Redis 阻塞，体现生产环境思维。

## 六、方案对比与选型建议

**方案**
**适用架构**
**存储介质**
**核心优势**
**核心劣势**
**推荐场景**

Session + Cookie
单体架构
内存 ConcurrentHashMap
开发简单，依赖容器，无需额外组件
不支持分布式，依赖 Cookie，多终端兼容性差
企业内部管理系统、小型单体应用

Token + Redis
分布式架构
Redis（双向映射）
无状态，跨服务共享，多终端兼容
需额外查 Redis 获取用户信息，依赖 Redis 高可用
电商 APP、多端小程序、分布式服务

JWT + Redis
高并发分布式
Redis（JWT 缓存）+ JWT 本身
自带用户信息，减少查询，高并发性能好
无法单独实现强制下线，敏感信息不可存
秒杀系统、直播平台、高并发 API 服务

### 6.1 核心选型原则

1. **架构匹配**：单体用 Session，分布式用 Token/JWT，避免 “用分布式方案解决单体问题”（增加复杂度）或 “用单体方案解决分布式问题”（存在漏洞）；
2. **成本可控**：无需为了 “技术先进” 选择复杂方案，如内部管理系统用 Session 即可，无需引入 Redis；
3. **业务优先**：若需 “多端数量限制”“手动踢下线”，优先选择 Token/JWT 方案（基于 Redis 列表 / Hash 实现会话管理）。

## 七、总结

“同一账号多端登录强制下线” 的本质是 **“会话生命周期的可控管理”**，技术方案的选择需围绕 “业务需求（如是否多端、是否高并发）” 与 “架构场景（单体 / 分布式）” 展开。核心逻辑可归纳为三步：

1. **检测**：新登录时检查账号是否存在活跃会话；
2. **处理**：按规则（强制下线 / 保留多端）处理旧会话；
3. **存储**：安全存储新会话，确保有效性与可扩展性。

在面试或实际开发中，需不仅能讲清技术方案，更能结合业务背景说明选型理由，同时规避技术缺陷（如 Session 的分布式问题、JWT 的主动失效问题），才能体现出完整的技术思考能力。

![image](/面试题/高频面试问题/鹏宇老师/1194-multi-device-login-force-logout-java/img-b66f56916a17.png)
