---
title: "React Query 如何让前端告别 useEffect"
published: 2026-03-10
tags: [React Query, 数据获取, 缓存, 前端]
category: 指南
project: ARCH ACG
draft: false
description: "用 React Query 重写所有数据获取逻辑，从手写 loading/error 到声明式数据管理。"
author: sttez
---

# React Query 如何让前端告别 useEffect

## Before vs After

ARCH ACG 前端有一个硬性规定：**不许用 useState + useEffect 获取服务端数据**。所有数据获取走 React Query。来看一组对比。

### 获取动态列表

**Before（useState + useEffect）：**

```tsx
const [feeds, setFeeds] = useState<Feed[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  let cancelled = false;
  setLoading(true);

  feedApi.getList()
    .then(res => {
      if (!cancelled) setFeeds(res.data.list);
    })
    .catch(err => {
      if (!cancelled) setError(err);
    })
    .finally(() => {
      if (!cancelled) setLoading(false);
    });

  return () => { cancelled = true; };
}, []);
```

每次写这个模式都要处理 loading、error、竞态取消，一个页面有 5 个列表就要写 5 遍。

**After（React Query）：**

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['feeds'],
  queryFn: () => feedApi.getList(),
});
```

6 行代码替代 18 行，还自动获得了缓存、重试、失效等能力。

## React Query 自动处理的事情

| 能力 | 说明 |
|------|------|
| Loading 状态 | 自动管理 `isLoading`，不需要手写 state |
| Error 处理 | 自动捕获错误，提供 `error` 对象 |
| 缓存 | 相同 `queryKey` 的数据自动复用 |
| 窗口聚焦刷新 | 用户切回浏览器时自动刷新数据 |
| 失败重试 | 网络抖动自动重试（配置 `retry: 1`） |
| 竞态处理 | 组件卸载后不会更新 state（不需要 `cancelled` 标记） |

## Mutation + 自动失效

写操作（创建/删除/修改）用 `useMutation`，成功后自动刷新相关列表：

```tsx
const queryClient = useQueryClient();

const likeMutation = useMutation({
  mutationFn: (postId: string) => feedApi.like(postId),
  onSuccess: () => {
    // 点赞成功后，动态列表自动重新获取
    queryClient.invalidateQueries({ queryKey: ['feeds'] });
  },
});
```

不需要手动 `setFeeds([...feeds, newFeed])`——mutation 成功后 invalidate query，列表自动刷新。

## 全局配置

在项目入口统一配置默认参数：

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 分钟内不重新请求
      gcTime: 10 * 60 * 1000,      // 10 分钟无人用则回收
      retry: 1,                      // 失败重试 1 次
      refetchOnWindowFocus: true,    // 窗口聚焦时刷新
    },
  },
});
```

## 和 Zustand 的分工

React Query 管**服务端数据**（从 API 来的），Zustand 管**客户端状态**（UI 状态、用户信息）。两个库各司其职：

| | React Query | Zustand |
|---|---|---|
| 数据来源 | 后端 API | 客户端状态 |
| 典型场景 | 动态列表、用户资料、约单数据 | 登录状态、Toast、选中 Tab |
| 缓存 | 自动（queryKey） | 手动 |
| 失效 | `invalidateQueries` | 直接 `set()` |

## 小结

React Query 不只是一个"请求库"，而是一个完整的**服务端状态管理系统**。它把 loading/error/caching/retry/invalidation 这些数据获取的横切关注点全部内置，让组件只关心"需要什么数据"而不是"怎么获取数据"。配合"不许用 useState + useEffect 获取数据"的编码规范，前端代码质量和开发效率都有显著提升。
