---
title: "Express + MySQL 后端搭建"
published: 2025-12-13
tags: [Express, MySQL, Node.js, RESTful API]
category: 技术
project: 次元聚
draft: false
author: sttez
---

# Express + MySQL 后端搭建

## 技术栈选择

后端用 Express + MySQL + Socket.IO 的组合。没有选 Koa 或 NestJS，因为 Express 生态最成熟，小程序后端不需要太重的框架。数据库选 MySQL 而不是 MongoDB，因为次元聚的数据关系明确（用户-帖子-订单-消息），关系型数据库更合适。

## 项目结构

```
server/
├── src/
│   ├── index.js          # 入口，Express + Socket.IO 初始化
│   ├── routes/
│   │   ├── posts.js      # 帖子相关 API
│   │   ├── orders.js     # 订单相关 API
│   │   ├── messages.js   # 消息相关 API
│   │   └── users.js      # 用户相关 API
│   ├── services/
│   │   ├── postService.js
│   │   ├── orderService.js
│   │   └── messageService.js
│   └── models/
│       ├── post.js
│       ├── order.js
│       └── user.js
├── seed.js               # 测试数据脚本
└── package.json
```

路由只负责接收请求和返回响应，业务逻辑放在 service 层。

## 数据库连接池

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: 'ciyuanju',
  connectionLimit: 20,
  waitForConnections: true
});

module.exports = pool;
```

用连接池而不是每次请求新建连接。`connectionLimit: 20` 对开发环境足够，生产环境可以按需调大。

## API 端点设计

RESTful 风格，统一返回格式：

```javascript
// 获取帖子列表
router.get('/posts', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT p.*, u.nickname, u.avatar FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建帖子
router.post('/posts', async (req, res) => {
  const { user_id, title, content, images, category } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO posts (user_id, title, content, images, category) VALUES (?, ?, ?, ?, ?)',
      [user_id, title, content, JSON.stringify(images), category]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
```

关键点：所有 SQL 都用参数化查询（`?` 占位符），防止 SQL 注入。

## Socket.IO 集成

WebSocket 和 HTTP 共享同一个服务器实例：

```javascript
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
  });

  socket.on('send_message', async (data) => {
    // 保存到数据库
    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
      [data.conversationId, data.senderId, data.content]
    );
    // 广播给房间内所有人
    io.to(`conv_${data.conversationId}`).emit('new_message', {
      id: result.insertId,
      ...data,
      created_at: new Date()
    });
  });
});

server.listen(3000);
```

## 小结

后端搭建的核心原则：分层清晰（routes → services → models），参数化查询防注入，HTTP 和 WebSocket 共用端口。整个后端代码约 2300 行，没有用 TypeScript——小程序后端的数据结构变化频繁，JavaScript 的灵活性在这个场景下是优势。
