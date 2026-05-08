---
title: "WebSocket 事件监听器初始化时机踩坑"
published: 2025-12-22
tags: [WebSocket, 微信小程序, 踩坑, 事件监听]
category: 踩坑
project: 次元聚
draft: false
author: sttez
---

## 问题

消息页面接入 WebSocket 后，本地测试一切正常——连接成功，消息能发能收。但偶尔刷新页面后，消息就收不到了。控制台没有任何报错，`wx.onSocketMessage` 好像根本没触发。

更诡异的是：如果我在 `onLoad` 里加一个 `console.log`，问题出现的频率就降低了。这让我一度以为是时序问题，但反复检查代码逻辑都没发现明显错误。

## 排查过程

一开始以为是后端 Socket.IO 的问题，检查了服务端的房间管理和消息广播逻辑，都是对的。用 Postman 模拟 WebSocket 连接，服务端能正常推送。

回头看小程序端的代码：

```javascript
Page({
  onLoad() {
    // 1. 连接 WebSocket
    wx.connectSocket({ url: 'ws://localhost:3000' });

    // 2. 注册事件监听（问题在这里！）
    wx.onSocketMessage((res) => {
      const msg = JSON.parse(res.data);
      this.handleNewMessage(msg);
    });

    // 3. 加载会话列表
    this.loadConversations();
  }
})
```

看起来没问题对吧？问题在于：`wx.connectSocket` 是异步的，而 `wx.onSocketMessage` 在调用时就注册了全局监听器。

**不对，这不是问题所在。** `wx.onSocketMessage` 本身可以在连接前注册。真正的坑在于——

我重新仔细看了报错日志（开启调试模式后），发现问题出在连接尚未建立时，`onSocketMessage` 的回调被覆盖了。

```javascript
// 在消息页面中
wx.connectSocket({ ... });
wx.onSocketMessage(callbackA);

// 用户快速切换到其他 tab 再切回来
// onLoad 再次执行
wx.connectSocket({ ... });
wx.onSocketMessage(callbackB); // callbackA 被覆盖！
// 但旧的连接还没断开，新连接又建立了
```

## 问题根源

微信小程序的 `wx.onSocketMessage` 是**全局单例注册**——后注册的回调会覆盖先注册的。当用户快速切换 tab 导致页面重新 `onLoad` 时：

1. 第一次 `onLoad`：注册 callbackA，建立连接
2. 用户切换 tab
3. 第二次 `onLoad`：注册 callbackB（覆盖了 A），又发起新连接
4. 此时存在两个 WebSocket 连接，但只有 B 的回调在监听
5. 如果旧连接先收到消息，B 收不到（因为消息走的是新连接的通道），或者新连接还没建立完成

更关键的是：**事件监听器必须在 `connectSocket` 的 `success` 回调里注册**，而不是在它之前。

## 解决方案

把事件监听器的注册移到 `connectSocket` 的成功回调中：

```javascript
Page({
  data: {
    socketConnected: false
  },

  onLoad() {
    this.connectSocket();
    this.loadConversations();
  },

  connectSocket() {
    wx.connectSocket({
      url: 'ws://localhost:3000',
      success: () => {
        // 连接成功后再注册监听器
        wx.onSocketOpen(() => {
          this.setData({ socketConnected: true });
          // 如果有活跃会话，加入房间
          if (this.data.activeConversationId) {
            wx.sendSocketMessage({
              data: JSON.stringify({
                type: 'join_conversation',
                conversationId: this.data.activeConversationId
              })
            });
          }
        });

        wx.onSocketMessage((res) => {
          const msg = JSON.parse(res.data);
          if (msg.type === 'new_message') {
            this.setData({
              messages: [...this.data.messages, msg.data]
            });
          }
        });

        wx.onSocketClose(() => {
          this.setData({ socketConnected: false });
        });
      }
    });
  },

  onUnload() {
    wx.closeSocket();
  }
})
```

关键改动：

1. **监听器在 `success` 回调里注册**：确保连接已建立
2. **`onUnload` 时关闭连接**：页面卸载时主动断开，避免旧连接残留
3. **`socketConnected` 状态标记**：防止在连接未就绪时发消息

## 学到的教训

**微信小程序的 `wx.onSocket*` 系列 API 是全局状态，不是实例方法。**

这意味着：
- 后注册的回调会覆盖先注册的
- 所有页面共享同一个 WebSocket 连接
- 必须手动管理连接的生命周期

经验法则：

- **事件监听器在连接成功后注册**，不在之前
- **页面卸载时主动关闭连接**，别指望框架自动清理
- **加一个 `connected` 状态**，UI 层根据状态决定是否允许操作
- 如果项目有多个页面需要 WebSocket，考虑做一个全局的 Socket 管理单例，而不是每个页面自己管
