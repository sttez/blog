---
title: "后台管理面板的 Pragmatic 做法"
published: 2026-02-22
tags: [后台管理, React, Pragmatic, API复用]
category: 技术
project: ARCH ACG
draft: false
description: "后台复用主站 API、共用登录接口、Vite 代理解决跨域——v1.0 的务实选择。"
author: sttez
---

# 后台管理面板的 Pragmatic 做法

## 核心矛盾

做一个后台管理面板有两种路线：

**路线 A**：独立的后端接口 + 独立的前端项目 + RBAC 权限体系

**路线 B**：复用现有 API + 快速搭建 8 个管理页面

ARCH ACG v1.0 选了路线 B。为什么？

1. 单人开发，资源有限
2. v1.0 先把功能跑通，权限隔离后续再做
3. 管理面板的核心需求是"能看数据、能操作"，不是"完美架构"

## 复用了什么

| 资源 | 复用方式 |
|------|---------|
| 后端 API | 直接用 feed/hot、commissions、works 等接口 |
| 登录接口 | 共用 `/auth/login`，管理员账号 admin/admin123 |
| Token | 同一套 JWT，存在 localStorage |
| HTTP 客户端 | 主站自封装、管理面板用 Axios |

## 跨域问题怎么解决

主站跑在 `5173`，管理面板跑在 `5174`，后端在 `8080`。开发环境用 Vite proxy：

```ts
// arch-acg-admin/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
```

前端请求 `/api/v1/feeds`，Vite 自动代理到 `http://localhost:8080/api/v1/feeds`，绕过跨域。

## 8 个管理页面

| 页面 | 功能 |
|------|------|
| 仪表盘 | 用户数、内容数、约单数概览 |
| 用户管理 | 搜索、查看、禁用用户 |
| 内容审核 | 动态/作品审核、举报处理 |
| 约单管理 | 约单列表、状态跟踪 |
| 服务管理 | 6 类服务者的 Tab 管理 |
| 数据分析 | 图表展示平台数据 |
| 系统配置 | 站点设置、公告管理 |
| 作品管理 | 作品列表、推荐/下架 |

## 路由守卫

管理面板有自己的路由守卫——未登录时自动跳转登录页：

```tsx
<Route element={<AdminGuard />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/users" element={<UserManagement />} />
  {/* ... */}
</Route>
```

`AdminGuard` 检查 localStorage 中是否有 token，没有就 redirect 到 `/login`。

## 什么时候该重构

复用 API 的做法在 v1.0 可以，但后续必须拆：

- [ ] 加 `/admin/**` 前缀的独立接口
- [ ] 实现 RBAC（超级管理员/运营/审核员）
- [ ] 操作日志（谁在什么时间做了什么）
- [ ] 批量操作、数据导出

这些是 v1.1 计划中的事情。

## 小结

后台管理面板不应该是"等核心功能都做完再做"的东西。ARCH ACG 的做法是"先复用、后拆分"——v1.0 用现有 API 快速搭建管理能力，后续根据需求逐步加权限隔离。务实比完美重要，尤其在资源有限的时候。
