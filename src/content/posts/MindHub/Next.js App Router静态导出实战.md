---
title: "Next.js App Router 静态导出实战：不靠服务器也能跑的知识管理工具"
published: 2026-04-30
tags: [Next.js, App Router, 静态导出, SSG, 前端架构]
pinned: false
description: "从零开始用 Next.js 16 App Router + output: 'export' 构建纯静态知识管理应用的实战经验。"
category: 技术
project: MindHub
draft: false
author: sttez
sourceLink: "https://github.com/sttez/mindhub"
---

# Next.js App Router 静态导出实战：不靠服务器也能跑的知识管理工具

## 为什么选静态导出

MindHub 启动时，我面临一个选择：是部署一台 Node.js 服务器跑 SSR，还是用纯静态方案？答案很快就清楚了——静态导出。

理由很实际：

- **不需要服务器**：生成的 `out/` 目录往 Nginx、Vercel、Netlify 一扔就能跑，零运维成本
- **部署灵活**：GitHub Pages 都能用，对个人项目来说免费到极限
- **性能好**：纯静态 HTML + CDN 缓存，首屏加载飞快
- **省钱**：不需要 Vercel Pro，不需要云服务器，对象存储 + CDN 就够了

核心数据源是 Supabase，它是 SaaS 服务，API 在云端，前端直连就行，本就不需要自己的后端。

## 配置有多简单

整个配置就这几行：

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,  // 静态导出必须关闭图片优化
  },
};

export default nextConfig;
```

`output: 'export'` 告诉 Next.js 在 `next build` 时把所有页面预渲染成静态 HTML，输出到 `out/` 目录。`images.unoptimized: true` 是必须的，因为图片优化依赖服务端处理，静态模式下用不了。

构建命令：

```bash
next build
# 产出 out/ 目录，直接部署即可
```

## 路由组的妙用

MindHub 有 7 个页面需要共享相同的侧边栏和顶部导航栏。如果不用路由组，要么每个页面重复写布局，要么用 Pages Router 的 `_app.tsx` 模式。

App Router 的路由组 `(dashboard)` 完美解决了这个问题：

```
app/
  layout.tsx              # 根布局（html/body）
  (dashboard)/
    layout.tsx            # 共享布局（Sidebar + TopBar）
    page.tsx              # 首页
    resources/
      page.tsx            # 资源管理
    graph/
      page.tsx            # 知识图谱
    flow/
      page.tsx            # 任务流程
    ...
```

关键在于括号 `(dashboard)` —— 这个目录名不会出现在 URL 里。访问 `/resources` 时，会同时应用根布局和 `(dashboard)/layout.tsx`，但 URL 保持干净。

`(dashboard)/layout.tsx` 里写共享的 Sidebar 和 TopBar：

```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

子页面只关心自己的内容，不用操心导航的事。

## 最大的取舍：没有服务端

静态导出的核心代价是 **所有东西都在客户端跑**。

### 不能用 API Routes

Next.js 的 API Routes（`app/api/` 目录）依赖服务器运行时，静态导出下完全不可用。所以我把所有数据操作都改成了客户端直连 Supabase：

```typescript
// 没有 getServerSideProps，用 useEffect
useEffect(() => {
  supabase
    .from('resources')
    .select('*')
    .then(({ data }) => setResources(data));
}, []);
```

### 环境变量的坑

静态导出后，所有环境变量必须以 `NEXT_PUBLIC_` 开头，否则构建时会被替换成 `undefined`。MindHub 的配置：

```bash
# 这些变量在静态导出中可用
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
NEXT_PUBLIC_AI_PROVIDER=deepseek
NEXT_PUBLIC_AI_API_KEY=sk-xxx
NEXT_PUBLIC_AI_BASE_URL=https://api.deepseek.com/v1
NEXT_PUBLIC_AI_MODEL=deepseek-chat
```

没有 `NEXT_PUBLIC_` 前缀的变量在静态导出中不会被注入到客户端代码中。这意味着没有"服务端专属"的密钥——所有配置都暴露在前端代码里，所以 Supabase 的 RLS（行级安全）策略必须严格配置，AI API Key 也是用户自己输入存储在 localStorage 的。

### 没有 ISR / 服务端渲染

页面内容在构建时就固定了。如果需要动态内容，必须全部通过客户端 API 调用获取。这对 MindHub 来说不是问题——所有数据都是运行时从 Supabase 拉取的。

## 对比总结

| 方面 | 静态导出 (output: 'export') | SSR / Vercel 托管 |
|------|---------------------------|------------------|
| 部署 | Nginx / Netlify / GitHub Pages | 需要 Node.js 运行时 |
| 成本 | 接近零 | Vercel Pro 或服务器费用 |
| API Routes | 不可用 | 完整支持 |
| 动态数据 | 客户端 fetch | 服务端 + 客户端 |
| 环境变量 | 仅 NEXT_PUBLIC_* | 支持私有变量 |
| 图片优化 | 需关闭 | 内置支持 |
| 首屏性能 | 极快（纯静态） | 依赖服务器响应 |

## 什么时候该选静态导出

**适合的场景：**

- 工具型应用，数据来自外部 API（Supabase、Firebase 等）
- 管理后台、仪表盘、个人知识管理工具
- 不需要服务端认证逻辑（用 Supabase Auth 客户端模式即可）
- 追求最低部署成本

**不适合的场景：**

- 需要服务端 API 逻辑（文件处理、webhook、复杂鉴权）
- SEO 关键的动态内容（博客文章可以用，但电商商品列表不行）
- 需要在服务端持有私钥的场景

## 结论

对 MindHub 这种「前端 + 外部 BaaS」的架构，静态导出是最佳选择。省掉了服务器运维，部署简单，性能优秀。代价是把所有复杂度推到了前端和 Supabase RLS 上——但这个交换对我来说完全值得。

如果以后真的需要服务端逻辑，Next.js 的 App Router 支持渐进式迁移，去掉 `output: 'export'` 就能恢复 SSR 能力。这个选择不是永久性的。
