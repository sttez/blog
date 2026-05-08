---
title: "Redis 在本项目中的五种实战模式"
published: 2026-02-08
tags: [Redis, 缓存策略, Lua, 原子操作]
category: 技术
project: ARCH ACG
draft: false
description: "Token 黑名单、原子点赞、热门排序、验证码、滑动窗口限流，五种 Redis 用法详解。"
author: sttez
---

# Redis 在本项目中的五种实战模式

## 模式一：Token 黑名单（String + TTL）

**场景**：用户登出后，accessToken 要立即失效。

```java
redisTemplate.opsForValue().set(
    "token:blacklist:" + token,
    "1",
    remainingTtl,
    TimeUnit.SECONDS
);
```

用 String 结构存一个标记，TTL 设为 token 剩余有效期。token 过期后自动从 Redis 清除，不需要额外的清理任务。

## 模式二：原子点赞（Set + Lua）

**场景**：用户给动态点赞，需要保证同一用户不能重复点赞。

```lua
-- KEYS[1] = "post:likes:{postId}"
-- ARGV[1] = userId
local added = redis.call('SADD', KEYS[1], ARGV[1])
if added == 1 then
    redis.call('ZINCRBY', 'post:hot', 1, ARGV[2]) -- 热度 +1
    return 1  -- 点赞成功
else
    redis.call('SREM', KEYS[1], ARGV[1])
    redis.call('ZINCRBY', 'post:hot', -1, ARGV[2]) -- 热度 -1
    return 0  -- 取消点赞
end
```

Lua 脚本保证 SADD + ZINCRBY 是原子操作，不会出现点赞成功但热度没更新的竞态问题。

## 模式三：热门内容排序（ZSet）

**场景**：首页"热门"Tab 按热度排序展示动态。

```
Key: post:hot
Member: postId
Score: 热度分数（点赞数 × 1 + 评论数 × 2 + 收藏数 × 3）
```

```java
// 获取热门 Top 20
List<String> hotPosts = redisTemplate.opsForZSet()
    .reverseRange("post:hot", 0, 19);
```

热度分数 5 分钟刷新一次，通过定时任务重新计算。ZSet 的 `reverseRange` 直接按分数降序取 Top N，O(log N) 复杂度。

## 模式四：验证码（String + 5 分钟 TTL）

**场景**：登录/注册时的图形验证码。

```java
// 生成验证码时
redisTemplate.opsForValue().set(
    "captcha:" + uuid,
    captchaText,
    5, TimeUnit.MINUTES
);

// 校验时
String saved = redisTemplate.opsForValue().get("captcha:" + uuid);
if (saved == null || !saved.equalsIgnoreCase(input)) {
    throw new BusinessException("验证码错误或已过期");
}
```

验证码用完即删，5 分钟 TTL 作为兜底过期。

## 模式五：滑动窗口限流（String + 计数器）

**场景**：限制同一 IP 的请求频率，防止恶意刷接口。

两种策略并行：

| 策略 | 窗口 | 阈值 |
|------|------|------|
| 宽松限流 | 1 分钟 | 60 次/IP+URI |
| 严格限流 | 1 秒 | 10 次/IP |

```java
// 滑动窗口实现
String key = "rate:" + ip + ":" + uri;
Long count = redisTemplate.opsForValue().increment(key);
if (count == 1) {
    redisTemplate.expire(key, 60, TimeUnit.SECONDS);
}
if (count > 60) {
    throw new TooManyRequestsException();
}
```

用 `INCR` + `EXPIRE` 实现固定窗口计数。如果需要更精确的滑动窗口，可以用 Redis 7.0 的 `EXPIREMEMBER` 或者自己用 ZSet 记录每次请求的时间戳。

## 小结

Redis 不只是缓存。在 ARCH ACG 中，它同时扮演了缓存、限流器、原子计数器、消息队列（后续）等多重角色。关键是选对数据结构——String 做标记和计数，Set 做去重，ZSet 做排序和限流，Lua 保证复合操作的原子性。
