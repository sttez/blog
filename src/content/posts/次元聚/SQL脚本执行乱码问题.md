---
title: "SQL 脚本执行乱码问题"
published: 2025-12-30
tags: [MySQL, 编码, SQL, 踩坑, 中文]
category: 踩坑
project: 次元聚
draft: false
author: sttez
---

## 问题

`seed.sql` 里包含了中文测试数据——用户昵称"xiawei"、简介"资深COSER，擅长角色还原"等。用 MySQL 命令行直接执行 SQL 文件：

```bash
mysql -u root ciyuanju < seed.sql
```

结果数据库里的中文全部变成问号 `???` 或者乱码 `\xE8\xB5\xA4`。页面上显示的全是乱码文字。

## 排查过程

第一反应是数据库编码问题。检查了数据库和表的字符集：

```sql
SHOW CREATE DATABASE ciyuanju;
-- DEFAULT CHARACTER SET latin1  ← 问题在这里

SHOW CREATE TABLE users;
-- DEFAULT CHARACTER SET latin1
```

数据库创建时没指定编码，默认用了 `latin1`，根本不支持中文。

### 尝试一：修改数据库编码

```sql
ALTER DATABASE ciyuanju CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE posts CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

改完编码后重新导入 SQL，结果——还是乱码。

### 尝试二：指定连接编码

```bash
mysql -u root --default-character-set=utf8mb4 ciyuanju < seed.sql
```

这次部分中文能显示了，但还是有一些乱码。检查 SQL 文件本身的编码，发现是 GBK 而不是 UTF-8。

### 根本原因

三个编码环节不一致：

1. **SQL 文件编码**：GBK（Windows 记事本默认保存格式）
2. **MySQL 连接编码**：latin1（默认）
3. **数据库/表编码**：latin1（默认）

必须三者统一为 UTF-8 才行。

## 解决方案

最终没有用 SQL 文件导入，改成了 Node.js 脚本 `seed.js`：

```javascript
const pool = require('./src/index').pool;

async function seed() {
  await pool.query('TRUNCATE TABLE users');

  const users = [
    { nickname: 'xiawei', role: 'coser', bio: '资深COSER，擅长角色还原' },
    { nickname: 'photographer_li', role: 'photographer', bio: '人像摄影5年经验' },
    // ...
  ];

  for (const user of users) {
    await pool.query(
      'INSERT INTO users (nickname, role, bio) VALUES (?, ?, ?)',
      [user.nickname, user.role, user.bio]
    );
  }

  console.log('✓ 用户插入完成');
}

seed();
```

Node.js 的 `mysql2` 驱动默认使用 UTF-8 编码，通过参数化查询传入的中文字符串不会出现编码问题。执行 `node seed.js`，中文完美存储和读取。

同时还是修正了数据库编码，防止将来其他方式导入数据时出问题：

```sql
ALTER DATABASE ciyuanju CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 对每个表
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4;
ALTER TABLE posts CONVERT TO CHARACTER SET utf8mb4;
-- ... 所有表都改
```

## 学到的教训

**涉及中文数据，编码问题一定会来，区别只是早晚。**

经验法则：

1. **数据库从一开始就用 `utf8mb4`**，不要用 `utf8`（不支持 emoji）更不要用 `latin1`
2. **创建数据库时显式指定编码**：
   ```sql
   CREATE DATABASE ciyuanju CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. **SQL 文件保存为 UTF-8 编码**（不要用 Windows 记事本，用 VS Code）
4. **优先用代码脚本导入数据**，而不是直接执行 SQL 文件——代码里的字符串编码由运行时控制，更可靠
5. **`utf8mb4` 而不是 `utf8`**：MySQL 的 `utf8` 实际上是三字节编码，存不了 emoji，只有 `utf8mb4` 是真正的 UTF-8

另外，这个经历也让我决定：以后所有项目的第一步，就是在建库建表时统一用 `utf8mb4`，写进项目初始化 checklist 里。
