---
title: "RESTful API 设计踩坑记录"
published: 2026-02-09
tags: [API设计, RESTful, 踩坑, Spring Boot]
category: 踩坑
project: ARCH ACG
draft: false
description: "URL 命名、响应格式、分页方案、错误码——接口设计中的坑和解法。"
author: sttez
---

# RESTful API 设计踩坑记录

## 坑一：URL 命名不统一

刚开始写接口时，有的用 `/getUser`，有的用 `/user-info`，前端同学（也就是我自己）调用时非常痛苦。后来统一了规范：

- 基础路径：`/api/v1/{resource}`
- 资源名用复数名词：`/feeds`、`/commissions`
- 多段路径用 kebab-case：`/service-providers`
- 版本号在 URL 中：`/api/v1/...`

## 坑二：响应格式没有统一信封

一开始返回的数据格式五花八门，有的直接返回对象，有的包在 `{ data: ... }` 里。前端每次都要猜测返回结构。

统一后的信封格式：

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

- `code: 0` 表示成功，非 0 表示业务错误
- `message` 给人类看的提示
- `data` 实际数据

前端封装一个拦截器统一处理，`code !== 0` 就 toast 错误信息。

## 坑三：分页方案选择

最初用了传统的 `{ page, pageSize, total }` 方案，前端做无限滚动时发现一个问题：翻页过程中如果有新数据插入，会导致数据重复或遗漏。

改为 cursor-based 分页后加了一个 `hasMore` 字段：

```json
{
  "list": [...],
  "page": 1,
  "pageSize": 20,
  "total": 156,
  "hasMore": true
}
```

`hasMore` 让前端不需要算 `total / pageSize` 来判断还有没有下一页，直接看布尔值就行。

## 坑四：@RequestParam 还是 @RequestBody

约单创建接口最初用了 `@RequestParam` 接收参数：

```java
@PostMapping("/commissions")
public Result create(
    @RequestParam String title,
    @RequestParam String category,
    @RequestParam String description,
    // ...10 多个参数
) { ... }
```

参数一多，URL 超长，而且不支持嵌套对象。后来统一改为 `@RequestBody` JSON 体：

```java
@PostMapping("/commissions")
public Result create(@RequestBody CommissionCreateRequest req) { ... }
```

教训：**POST/PUT 请求一律用 @RequestBody**，不要用 @RequestParam 传复杂数据。

## 坑五：错误码设计

一开始用 HTTP 状态码 200 包装一切，业务错误也返回 200。后来发现前端没法区分网络错误和业务错误。

最终方案：

| HTTP 状态码 | 场景 |
|------------|------|
| 200 | 成功 |
| 400 | 参数校验失败 |
| 401 | 未登录/token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

业务错误码在 `code` 字段中区分，HTTP 状态码只表示协议层面的结果。

## 小结

API 设计是"小事大影响"——命名不统一、格式不规范、错误码混乱，这些看似小问题会在联调阶段疯狂浪费时间。建议项目一开始就定义好 API 规范文档，所有接口统一遵循。
