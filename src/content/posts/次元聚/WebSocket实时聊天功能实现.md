---
title: "WebSocket 实时聊天功能实现"
published: 2025-12-28
tags: [WebSocket, Socket.IO, 实时通信, 聊天]
category: 技术
project: 次元聚
draft: false
author: sttez
---

# WebSocket 实时聊天功能实现

## 为什么选 WebSocket

次元聚的消息功能需要实时推送——用户 A 发消息，用户 B 要立即看到。轮询当然也能做，但延迟高、流量浪费。微信小程序原生支持 WebSocket，后端用 Socket.IO 做房间管理，两端搭配起来很方便。

## 小程序端连接

微信小程序用 `wx.connectSocket` 建立连接：

```javascript
Page({
  data: {
    currentView: 'conversations',
    conversations: [],
    messages: [],
    inputMessage: ''
  },

  onLoad() {
    this.loadConversations();
  },

  connectSocket() {
    wx.connectSocket({
      url: 'ws://localhost:3000'
    });

    wx.onSocketOpen(() => {
      console.log('WebSocket connected');
      // 加入当前会话房间
      wx.sendSocketMessage({
        data: JSON.stringify({
          type: 'join_conversation',
          conversationId: this.data.activeConversationId
        })
      });
    });

    wx.onSocketMessage((res) => {
      const msg = JSON.parse(res.data);
      if (msg.type === 'new_message') {
        this.setData({
          messages: [...this.data.messages, msg.data]
        });
        this.scrollToBottom();
      }
    });
  },

  sendMessage() {
    if (!this.data.inputMessage.trim()) return;

    wx.sendSocketMessage({
      data: JSON.stringify({
        type: 'send_message',
        conversationId: this.data.activeConversationId,
        senderId: getApp().globalData.userId,
        content: this.data.inputMessage
      })
    });

    this.setData({ inputMessage: '' });
  }
})
```

## 聊天界面布局

WXML 分三部分：顶部标题栏、中间消息列表、底部输入栏：

```html
<!-- 聊天面板 -->
<view class="chat-container">
  <!-- 顶部栏 -->
  <view class="chat-header">
    <view class="back-btn" bindtap="backToList">
      <image src="/icons/back.png" />
    </view>
    <text class="chat-title">{{activeChatName}}</text>
  </view>

  <!-- 消息列表 -->
  <scroll-view class="message-list" scroll-y scroll-into-view="{{lastMessageId}}">
    <view
      wx:for="{{messages}}"
      wx:key="id"
      id="msg-{{item.id}}"
      class="message-item {{item.sender_id === myUserId ? 'mine' : 'other'}}"
    >
      <image class="msg-avatar" src="{{item.avatar}}" />
      <view class="msg-bubble">
        <text>{{item.content}}</text>
        <text class="msg-time">{{item.created_at}}</text>
      </view>
    </view>
  </scroll-view>

  <!-- 输入栏 -->
  <view class="input-bar">
    <input
      value="{{inputMessage}}"
      bindinput="onInput"
      placeholder="输入消息..."
      confirm-type="send"
      bindconfirm="sendMessage"
    />
    <view class="send-btn" bindtap="sendMessage">发送</view>
  </view>
</view>
```

## 会话列表

消息页默认显示会话列表，每条会话展示对方头像、最后一条消息和未读数：

```html
<view class="conversation-item" wx:for="{{conversations}}" wx:key="id" bindtap="openChat" data-id="{{item.id}}">
  <view class="conv-avatar-wrap">
    <image class="conv-avatar" src="{{item.other_user.avatar}}" />
    <view class="unread-badge" wx:if="{{item.unread > 0}}">{{item.unread}}</view>
  </view>
  <view class="conv-info">
    <text class="conv-name">{{item.other_user.nickname}}</text>
    <text class="conv-last-msg">{{item.last_message}}</text>
  </view>
  <text class="conv-time">{{item.last_time}}</text>
</view>
```

## 后端房间管理

Socket.IO 的房间机制天然适合聊天场景，每个会话是一个房间：

```javascript
io.on('connection', (socket) => {
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conv_${conversationId}`);
  });

  socket.on('send_message', async (data) => {
    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
      [data.conversationId, data.senderId, data.content]
    );

    io.to(`conv_${data.conversationId}`).emit('new_message', {
      id: result.insertId,
      sender_id: data.senderId,
      content: data.content,
      created_at: new Date()
    });
  });
});
```

## 小结

实时聊天的核心就是：WebSocket 长连接 + 房间隔离 + 消息持久化。小程序端负责 UI 渲染和消息发送，后端负责房间管理和消息存储。整个流程没有复杂的状态管理，每条消息到达后直接 append 到数组末尾即可。
