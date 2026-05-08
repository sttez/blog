---
title: "JWT 认证 + Redis 黑名单的安全方案"
published: 2026-02-02
tags: [JWT, Redis, 认证, 安全]
category: 技术
project: ARCH ACG
draft: false
description: "accessToken 双 token 策略、Redis 登出黑名单、BCrypt 加密，一套完整的认证方案。"
author: sttez
---

# JWT 认证 + Redis 黑名单的安全方案

## Token 策略

ARCH ACG 使用双 token 方案：

| Token | 有效期 | 存储位置 | 用途 |
|-------|--------|----------|------|
| accessToken | 7 天 | 前端 Zustand → localStorage | 接口鉴权 |
| refreshToken | 30 天 | 前端 Zustand → localStorage | 续签 accessToken |

accessToken 过期后，前端用 refreshToken 调用 `/auth/refresh` 获取新的 token 对，用户无感续签。

## 为什么选 HS512 而不是 RS512

JWT 签名算法选了 HS512（HMAC-SHA512），而不是 RS512（RSA-SHA512）：

- **HS512**：对称加密，一个密钥签名和验证，简单高效
- **RS512**：非对称加密，公钥验证、私钥签名，适合多服务间验证

ARCH ACG 目前是单体应用，没有微服务间的 token 验证需求，HS512 完全够用。后续拆微服务时可以平滑切换到 RS512。

## Redis 黑名单机制

JWT 本身是无状态的，无法主动失效。解决方案：

1. 用户登出时，把当前 accessToken 存入 Redis 黑名单
2. TTL 设为 token 的剩余过期时间
3. 每次请求时，JWT Filter 先检查 token 是否在黑名单中

```java
// 登出时
String remainingTtl = calculateRemainingTtl(token);
redisTemplate.opsForValue().set(
    "token:blacklist:" + token,
    "1",
    Long.parseLong(remainingTtl),
    TimeUnit.SECONDS
);

// 验证时
Boolean isBlacklisted = redisTemplate.hasKey("token:blacklist:" + token);
if (Boolean.TRUE.equals(isBlacklisted)) {
    throw new UnauthorizedException("Token 已失效");
}
```

TTL 等于 token 剩余有效期——token 过期后黑名单记录自动清理，不会无限膨胀。

## 密码安全

- 算法：BCrypt，cost factor 10
- 从不存储明文密码
- 登录时用 `BCryptPasswordEncoder.matches()` 比对

## 验证码防暴力破解

登录接口前置图形验证码：

1. `GET /auth/captcha` 返回 base64 编码的验证码图片 + UUID
2. 前端展示图片，用户输入验证码
3. 登录时一并提交，后端从 Redis 校验
4. 验证码 5 分钟过期

加上限流（登录 5 次/分钟），暴力破解基本不可能。

## JWT Secret 管理

```bash
# 从环境变量读取，不硬编码
export JWT_SECRET="your-64-char-random-string-here"
```

Secret 最少 64 个字符，写在 `.env` 文件中，不进版本控制。

## 后续规划

- [ ] OAuth2 第三方登录（微信、QQ）
- [ ] 短信验证码登录
- [ ] 两步验证（2FA）
- [ ] 设备管理（踢出其他设备）

## 小结

认证方案没有银弹。双 token + Redis 黑名单是一个在无状态和可控性之间的平衡方案。HS512 在单体架构下足够安全，BCrypt 加密和验证码防暴力破解也到位了。后续根据业务发展再引入 OAuth2 和 2FA。
