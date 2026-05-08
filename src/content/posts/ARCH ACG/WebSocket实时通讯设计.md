---
title: "WebSocket 实时通讯：私信与通知系统"
published: 2026-02-14
tags: [WebSocket, 实时通讯, 私信, Spring Boot]
category: 技术
project: ARCH ACG
draft: false
description: "用 WebSocket 实现用户私信和系统通知的实时推送，从后端 Handler 到前端客户端。"
author: sttez
---

# WebSocket 实时通讯：私信与通知系统

## 为什么不用轮询

实时通知有两种常见方案：

| 方案 | 原理 | 缺点 |
|------|------|------|
| 轮询 | 前端每 N 秒请求一次 | 延迟高、浪费请求 |
| WebSocket | 建立长连接，服务端主动推送 | 实现复杂但实时性好 |

ARCH ACG 选择了 WebSocket，因为私信和通知需要低延迟——用户发消息后对方应该立刻看到。

## 后端设计

### 两个 Handler

```
WebSocket 服务
├── ChatMessageHandler      # 处理私信
└── NotificationHandler     # 处理系统通知
```

**ChatMessageHandler** 负责：

1. 用户连接时，记录 userId → WebSocket Session 映射
2. 收到消息时，存入 MySQL messages 表
3. 查找接收者的 Session，实时推送
4. 接收者不在线时，消息存库，下次连接时拉取未读消息

**NotificationHandler** 负责：

1. 各业务模块触发事件（点赞、评论、约单状态变更）
2. NotificationService 创建通知记录
3. 通过 WebSocket 推送给目标用户
4. 前端收到后更新未读数徽标

### 消息流转

```
用户A发送消息
  → ChatMessageHandler.onMessage()
  → 存入 messages 表
  → 查询用户B的 WebSocket Session
  → 在线？推送消息给B
  → 不在线？标记为未读，B上线后拉取
```

## 前端设计

### 封装 WebSocket Client

```ts
class WSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;

  connect(token: string) {
    this.ws = new WebSocket(`ws://localhost:8080/ws?token=${token}`);
    this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
    this.ws.onclose = () => this.reconnect();
  }

  private handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case 'CHAT':
        useMessageStore.getState().addMessage(msg.data);
        break;
      case 'NOTIFICATION':
        useNotificationStore.getState().addNotification(msg.data);
        useNotificationStore.getState().incrementUnread();
        break;
    }
  }
}
```

### 断线重连

WebSocket 连接断开后自动重连，重连间隔指数退避（1s → 2s → 4s → 8s），最多重连 5 次。重连成功后重新认证。

## Redis 未读计数

未读消息数用 Redis 缓存，避免每次查询都扫库：

```java
// 收到新消息时
redisTemplate.opsForValue().increment("unread:" + receiverId);

// 用户查看消息后
redisTemplate.delete("unread:" + userId);
```

## 消息 vs 通知：两个概念

项目明确区分了消息（Message）和通知（Notification）：

| | 消息（Message） | 通知（Notification） |
|---|---|---|
| 来源 | 用户对用户 | 系统对用户 |
| 场景 | 私信聊天 | 点赞、评论、约单状态 |
| 存储 | conversations + messages 表 | notifications 表 |
| 实时性 | 必须实时 | 可接受短暂延迟 |

## 小结

WebSocket 不只是"能推就行"，要考虑断线重连、消息去重、未读计数、离线消息拉取等实际问题。ARCH ACG 把消息和通知分为两个独立的 Handler，职责清晰。前端通过 Zustand Store 桥接 WebSocket 消息到 UI，做到了"后端推、前端收、Store 管、组件渲染"的全链路贯通。
