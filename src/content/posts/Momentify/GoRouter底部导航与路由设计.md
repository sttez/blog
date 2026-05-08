---
title: "GoRouter 底部导航与路由设计"
published: 2026-04-04
tags: [Flutter, Dart, GoRouter, 路由]
category: 技术
project: Momentify
draft: false
description: "StatefulShellRoute 实现底部导航栏 + 模态路由的完整方案"
author: sttez
sourceLink: "https://github.com/sttez/Momentify"
---

# GoRouter 底部导航与路由设计

## 路由结构

Momentify 有两套导航需求：

1. **底部 Tab 导航**：首页（模板库）和"我的作品"，需要保持各自的页面栈
2. **全屏流程导航**：选图 → 标记 → 编辑 → 导出，每个页面覆盖整个屏幕

GoRouter 的 `StatefulShellRoute.indexedStack` 完美解决了第一个需求：

```dart
StatefulShellRoute.indexedStack(
  builder: (context, state, navigationShell) =>
      MainScaffold(navigationShell: navigationShell),
  branches: [
    StatefulShellBranch(routes: [
      GoRoute(path: '/', builder: ...),        // 模板库
    ]),
    StatefulShellBranch(routes: [
      GoRoute(path: '/my-works', builder: ...), // 我的作品
    ]),
  ],
)
```

全屏流程页面作为顶层路由，不嵌套在 ShellRoute 中：

```dart
GoRoute(path: '/picker/:templateId', builder: ...),
GoRoute(path: '/marker/:templateId', builder: ...),
GoRoute(path: '/editor/:templateId', builder: ...),
GoRoute(path: '/export', builder: ...),
```

## 自定义转场动画

全屏流程页面使用从右向左的滑动转场，让流程感更强：

```dart
pageBuilder: (context, state) => CustomTransitionPage(
  child: EditorPage(templateId: state.pathParameters['templateId']!),
  transitionsBuilder: (context, animation, secondary, child) =>
      SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(1, 0),
          end: Offset.zero,
        ).animate(CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        )),
        child: child,
      ),
),
```

## 路由守卫

PickerPage 会校验模板 ID 是否存在，不存在则自动返回首页。这不是用 GoRouter 的 redirect 实现的，而是在页面 initState 中检查——因为 redirect 是同步的，而模板查询可能涉及异步加载。

## 踩坑

`StatefulShellRoute` 需要 Flutter 3.7+ 和 go_router 12+。升级 go_router 后，原来的 `ShellRoute` 需要改成 `StatefulShellRoute`，否则底部 Tab 切换时页面状态会丢失。
