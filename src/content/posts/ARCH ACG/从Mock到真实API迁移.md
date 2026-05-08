---
title: "从 Mock 到真实 API 的数据层迁移"
published: 2026-02-17
tags: [Mock数据, API联调, React Query, 前后端联调]
category: 指南
project: ARCH ACG
draft: false
description: "前端先用 Mock 数据开发，后端完成后逐个切换为真实接口，这套迁移流程的经验总结。"
author: sttez
---

# 从 Mock 到真实 API 的数据层迁移

## 为什么先 Mock

ARCH ACG 的前端和后端是并行开发的。等后端写完所有接口再开工前端太慢，所以前端先用 Mock 数据把 28 个页面搭出来，后端接口 ready 后再逐个替换。

好处：

- 前端不被后端阻塞，独立推进
- UI 先行，设计问题提前暴露
- 接口定义可以先约定好（API First）

## Mock 数据怎么组织

每个模块有对应的 mock 数据文件：

```ts
// src/mock/feed.ts
export const mockFeeds: Feed[] = [
  {
    id: '1',
    author: { id: '1', nickname: '小明', avatar: '...' },
    content: '今天在漫展出了一套蕾姆！',
    images: ['/mock/feed1.jpg'],
    likes: 234,
    comments: 56,
    createdAt: '2026-01-15T10:30:00Z',
  },
  // ...
];
```

API Service 层一开始直接返回 Mock：

```ts
// 早期：返回 Mock
export const feedApi = {
  getList: async () => ({ data: { list: mockFeeds } }),
};

// 迁移后：调真实接口
export const feedApi = {
  getList: async () => http.get('/api/v1/feeds'),
};
```

迁移时只改 Service 层的实现，组件代码完全不用动——这就是 API Service 层抽象的价值。

## 迁移步骤

按模块逐个迁移，不是一次性全切：

1. **确认后端接口可调通**（用 Swagger/Knife4j 测试）
2. **改 Service 层**：Mock → http.get/post
3. **处理字段差异**：Mock 字段名和实际返回不一致的，统一在 Service 层做映射
4. **测试该模块所有页面**：列表、详情、创建、删除
5. **下一个模块**

## 踩过的坑

### 坑一：Mock 数据太完美

Mock 数据都是精心构造的，实际接口返回的数据经常有 null、空数组、字段缺失的情况。迁移后一堆报错。

解决：Mock 数据要刻意造一些边界情况——空列表、超长文本、null 头像、没有图片的动态。

### 坑二：字段命名不一致

Mock 里用 camelCase（`createdAt`），数据库返回的是 snake_case（`created_at`）。

解决：后端统一返回 camelCase（Jackson 配置 `PropertyNamingStrategies.LOWER_CAMEL_CASE`），或者前端加一个转换层。

### 坑三：分页逻辑差异

Mock 时直接返回全部数据，实际接口是分页的。迁移后发现"加载更多"没实现。

解决：所有列表接口从一开始就要按分页模式写 Mock，模拟 `page`、`pageSize`、`hasMore` 的返回。

## 经验总结

| 做法 | 建议 |
|------|------|
| Mock 数据 | 提前造好边界数据，不要全是"完美数据" |
| 字段约定 | 前后端提前统一 camelCase/snake_case |
| API Service 层 | 必须抽象，迁移时只改一处 |
| 分页 | 从一开始就写分页逻辑，不要偷懒 |
| 迁移顺序 | 先迁核心模块（认证 → 动态 → 约单），再迁辅助模块 |

## 小结

Mock First 策略让 ARCH ACG 前后端并行开发了 3 周，最终 2 天完成了全部接口的切换。关键是 Service 层的抽象——组件不感知数据来自 Mock 还是真实 API，迁移成本极低。教训是 Mock 数据要足够"脏"，才能提前暴露边界问题。
