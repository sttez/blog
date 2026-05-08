---
title: "MySQL 数据库设计实战"
published: 2025-12-17
tags: [MySQL, 数据库设计, SQL, Node.js]
category: 技术
project: 次元聚
draft: false
author: sttez
---

# MySQL 数据库设计实战

## 表结构设计

次元聚的核心数据实体有五个：用户、帖子、订单、消息、教程。围绕这五个实体设计了 10 张表：

```sql
-- 用户表
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nickname VARCHAR(50) NOT NULL,
  avatar VARCHAR(255),
  role ENUM('coser', 'photographer', 'makeup', 'hairstylist', 'fan') DEFAULT 'fan',
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 帖子表
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT,
  images JSON,
  category VARCHAR(20),
  likes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 订单表
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  publisher_id INT NOT NULL,
  acceptor_id INT,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  status ENUM('open', 'accepted', 'paid', 'completed', 'cancelled') DEFAULT 'open',
  category VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publisher_id) REFERENCES users(id)
);

-- 会话表
CREATE TABLE conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 会话参与者表
CREATE TABLE conversation_members (
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 消息表
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

## 关键设计决策

### 图片用 JSON 列

帖子和教程的图片用 `JSON` 类型存储，而不是单独建关联表。原因是：小程序端图片上传后直接拼成 JSON 数组存入，查询时一次取出，不需要额外的 JOIN。每篇帖子最多 9 张图片，数据量可控。

### 会话用中间表

消息系统没有在 message 表里直接存 `sender_id` 和 `receiver_id`，而是引入了 `conversations` 和 `conversation_members` 两张表。这样支持未来的群聊功能，两个人之间的对话也只是一个有两个成员的会话。

### 订单状态机

订单的 `status` 字段定义了一个隐式状态机：`open → accepted → paid → completed`，以及任意状态可以到 `cancelled`。后端在更新状态时会校验状态转换的合法性。

## 测试数据脚本

`seed.js` 负责插入测试数据，方便开发调试：

```javascript
const pool = require('./src/index').pool;

async function seed() {
  // 清空已有数据
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('TRUNCATE TABLE messages');
  await pool.query('TRUNCATE TABLE conversation_members');
  await pool.query('TRUNCATE TABLE conversations');
  await pool.query('TRUNCATE TABLE orders');
  await pool.query('TRUNCATE TABLE posts');
  await pool.query('TRUNCATE TABLE users');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  // 插入用户
  const users = [
    { nickname: 'xiawei', role: 'coser', avatar: '/avatars/1.jpg' },
    { nickname: 'photographer_li', role: 'photographer', avatar: '/avatars/2.jpg' },
    { nickname: 'makeup_amy', role: 'makeup', avatar: '/avatars/3.jpg' },
    { nickname: 'hairstylist_pro', role: 'hairstylist', avatar: '/avatars/4.jpg' },
    { nickname: 'fan_wang', role: 'fan', avatar: '/avatars/5.jpg' },
  ];
  // ... 插入逻辑

  console.log('✓ 用户: 13个');
  console.log('✓ 会话: 4个');
  console.log('✓ 消息: 10条');
  console.log('✓ 帖子: 5条');
  console.log('✓ 订单: 6个');
}

seed();
```

执行 `node seed.js` 一键刷新所有测试数据。

## 小结

10 张表、约 15 个外键关系。设计的核心思路是：图片用 JSON 避免多表 JOIN，消息用会话中间表预留群聊扩展，订单用枚举状态机约束流程。测试数据脚本让前后端可以并行开发。
