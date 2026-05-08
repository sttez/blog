---
title: "Cytoscape 在 SSR 下崩溃了"
published: 2026-04-27
tags: [Cytoscape, Next.js, SSR, 知识图谱, 踩坑]
pinned: false
description: "Cytoscape.js 需要真实 DOM 才能初始化，但 Next.js 在服务端预渲染时根本没有 DOM"
category: 踩坑
project: MindHub
draft: false
author: sttez
sourceLink: "https://github.com/sttez/mindhub"
---

## 问题

MindHub 的知识图谱页面用的是 Cytoscape.js，功能写完之后本地 `next dev` 跑得好好的，一切正常。结果一执行 `next build`，直接报错：

```
Error: container parameter must be a HTML element
```

或者更诡异的：

```
TypeError: Cannot read properties of null (reading 'style')
```

## 排查过程

我一开始以为是 Cytoscape 版本有问题，反复检查了依赖版本，都没问题。仔细看报错堆栈，指向的是 `graph/page.tsx` 里的 Cytoscape 初始化代码。

突然反应过来——Next.js 默认会做服务端预渲染（SSR），在 Node.js 环境里根本没有 `document`、没有 `window`、更没有真实的 DOM 元素。而 Cytoscape 的初始化必须传入一个真实的 HTML 容器元素：

```tsx
// 这段代码在 SSR 阶段会直接炸掉
const cy = cytoscape({
  container: document.getElementById('cy'), // 服务端没有 document！
  elements: [...],
});
```

`next dev` 能跑是因为开发模式下 SSR 的行为和生产构建不完全一样，所以掩盖了这个问题。

## 解决方案

核心思路：**等组件在客户端挂载完成之后再初始化 Cytoscape**。用 `useRef` 拿到容器 DOM 引用，用 `useEffect` 保证只在客户端执行。

```tsx
const containerRef = useRef<HTMLDivElement>(null);
const cyRef = useRef<cytoscape.Core | null>(null);

useEffect(() => {
  if (!containerRef.current) return;

  cyRef.current = cytoscape({
    container: containerRef.current,
    elements: graphData,
    style: [/* ... */],
    layout: { name: 'cose' },
  });

  return () => cyRef.current?.destroy();
}, []);
```

关键点：

1. **`useRef` 容器引用**：JSX 里给 div 加 `ref={containerRef}`，React 在客户端挂载后会填充这个 ref
2. **`useEffect` 延迟初始化**：`useEffect` 只在客户端执行，服务端预渲染时跳过，完美避开 DOM 不存在的问题
3. **空值检查**：`if (!containerRef.current) return` 是双重保险，防止 ref 还没挂载的情况
4. **清理函数**：组件卸载时调用 `destroy()` 释放 Cytoscape 实例，避免内存泄漏

对应的 commit 是 `ac5d690 fix: 修复 Cytoscape SSR 预渲染空引用错误`。

## 学到的教训

**任何依赖真实 DOM 的库，在 Next.js 里都要特殊处理。** 不只是 Cytoscape，像 D3.js、Three.js、Mapbox 这些"客户端专用"库都有同样的问题。

经验法则：

- **初始化逻辑放进 `useEffect`**，永远不会错
- **`useRef` 拿 DOM 元素**，别用 `document.getElementById`
- **做空值检查**，防御性编程永远不嫌多
- 如果实在懒得处理 SSR，也可以用 `dynamic import` 配 `{ ssr: false }` 直接跳过服务端渲染，但这应该是最后的手段

另外，这次经历也让我理解了为什么很多 Next.js 的图表/可视化组件都会包裹一层 `<ClientOnly>` 或者 `<Suspense>`——不是炫技，是真的被 SSR 坑过。
