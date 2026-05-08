---
title: "Controller 不写业务逻辑的理由"
published: 2026-02-25
tags: [编码规范, Spring Boot, 分层架构, 最佳实践]
category: 技术
project: ARCH ACG
draft: false
description: "Controller 只做参数校验，Service 承载全部业务逻辑，异常交给全局处理器。"
author: sttez
---

# Controller 不写业务逻辑的理由

## 编码规范的核心规则

ARCH ACG 后端有一条非常严格的规则：

> **Controller 不包含任何业务逻辑。**

Controller 的职责只有一个：接收请求参数、校验、调用 Service、返回结果。

## 为什么这么规定

### 1. 可测试性

Service 层可以独立单元测试，不需要启动 Web 容器。如果业务逻辑写在 Controller 里，测试必须 Mock HttpServletRequest，成本高、速度慢。

### 2. 复用性

同一个业务逻辑可能被多个入口调用——HTTP 接口、定时任务、WebSocket 消息处理。如果逻辑在 Controller 里，要么复制代码，要么抽方法，都不如直接调 Service 干净。

### 3. 关注点分离

Controller 管"怎么接收和返回"，Service 管"做什么"。职责清晰，改接口格式不影响业务，改业务逻辑不影响接口格式。

## 实际代码对比

**错误示范（逻辑在 Controller）：**

```java
@RestController
public class FeedController {
    @PostMapping("/feeds")
    public Result create(@RequestBody FeedRequest req) {
        // 参数校验
        if (req.getContent().isBlank()) {
            return Result.error("内容不能为空");
        }
        // 业务逻辑不应该在这里
        Feed feed = new Feed();
        feed.setContent(req.getContent());
        feed.setUserId(getCurrentUserId());
        feed.setCreatedAt(LocalDateTime.now());
        feedMapper.insert(feed);
        // 通知也不该在这里
        notificationService.notifyFollowers(feed);
        return Result.success(feed);
    }
}
```

**正确示范（逻辑在 Service）：**

```java
@RestController
public class FeedController {
    @PostMapping("/feeds")
    public Result create(@RequestBody @Valid FeedRequest req) {
        Feed feed = feedService.create(req, getCurrentUserId());
        return Result.success(feed);
    }
}

@Service
public class FeedServiceImpl implements FeedService {
    @Override
    public Feed create(FeedRequest req, Long userId) {
        Feed feed = new Feed();
        feed.setContent(req.getContent());
        feed.setUserId(userId);
        feedMapper.insert(feed);
        notificationService.notifyFollowers(feed);
        return feed;
    }
}
```

Controller 从 15 行变成 3 行，业务逻辑全在 Service。

## 异常处理也不在 Controller

Controller 里不写 try-catch，全部交给 `GlobalExceptionHandler`：

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public Result handleBusiness(BusinessException e) {
        return Result.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        return Result.error(400, msg);
    }
}
```

Controller 里抛异常，全局处理器统一捕获和格式化。代码更干净，错误格式也统一。

## 前端同理

前端也有一条对应规则：

> **不用 useState + useEffect 获取服务端数据。**

所有数据获取走 React Query，组件只管渲染。和后端的"Controller 不写业务逻辑"是同一个思想——**展示层不包含数据获取逻辑**。

## 小结

分层架构的精髓是"每层只做自己的事"。Controller 管 HTTP 协议，Service 管业务逻辑，Mapper 管数据访问，Exception Handler 管异常格式化。看似多了一层代码，但换来了可测试性、可复用性和可维护性。18 个 Controller、19 个 Service、24 个 Mapper 的项目结构，就是因为严格遵守了这个规则才能保持清晰。
