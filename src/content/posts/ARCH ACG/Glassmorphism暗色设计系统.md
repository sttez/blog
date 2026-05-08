---
title: "Glassmorphism 暗色主题设计系统"
published: 2026-02-19
tags: [Glassmorphism, 暗色主题, Tailwind CSS, 设计系统]
category: 技术
project: ARCH ACG
draft: false
description: "深色背景 + 玻璃拟态卡片 + 渐变按钮，如何用 CSS 变量构建统一的设计语言。"
author: sttez
---

# Glassmorphism 暗色主题设计系统

## 设计语言

ARCH ACG 的视觉风格是"科技感 + 二次元"，选了暗色主题 + Glassmorphism 作为基础设计语言：

- **背景**：纯深色 `#020817`，不是纯黑，带一点蓝调
- **卡片**：玻璃拟态效果，半透明 + 模糊 + 微边框
- **文字**：渐变色标题，白色正文
- **按钮**：紫色到蓝色渐变

## CSS 变量定义

所有颜色通过 CSS 变量管理，方便后续切主题：

```css
:root {
  --bg-primary: #020817;
  --bg-glass: rgba(255, 255, 255, 0.05);
  --border-glass: rgba(255, 255, 255, 0.1);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.6);
  --gradient-main: linear-gradient(135deg, #8b5cf6, #3b82f6);
}
```

## 三个核心组件

### 1. Glass Card（玻璃卡片）

```css
.glass-card {
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}
```

`backdrop-filter: blur(12px)` 是 Glassmorphism 的核心——让卡片背后的背景产生模糊效果，增加层次感。

### 2. Gradient Text（渐变文字）

```css
.gradient-text {
  background: var(--gradient-main);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

标题和重点文字用紫蓝渐变，视觉上比纯白更醒目。

### 3. Gradient Button（渐变按钮）

```css
.gradient-btn {
  background: var(--gradient-main);
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.gradient-btn:hover {
  opacity: 0.9;
}

.gradient-btn:active {
  transform: scale(0.97);
}
```

## 布局系统

### 三套 Layout

| Layout | 用途 | 组件 |
|--------|------|------|
| MainLayout | 主要页面 | TopNav + Sidebar + Content |
| FullWidthLayout | 发布页面 | TopNav + Content（无侧栏） |
| BareLayout | 认证页面 | 纯 Content（无导航） |

通过 React Router 嵌套路由实现：

```tsx
<Route element={<MainLayout />}>
  <Route path="/" element={<Home />} />
  <Route path="/feeds" element={<Feed />} />
  <Route path="/profile" element={<Profile />} />
</Route>
<Route element={<FullWidthLayout />}>
  <Route path="/publish" element={<Publish />} />
</Route>
<Route element={<BareLayout />}>
  <Route path="/login" element={<Login />} />
</Route>
```

## 动画

用 Framer Motion 给页面过渡和卡片入场加了微动画：

- 页面切换：淡入淡出
- 卡片列表：交错入场（stagger）
- 按钮交互：点击缩放

动画点到为止，不喧宾夺主。

## 小结

设计系统的核心不是"好看"，而是**一致性**。通过 CSS 变量 + 三个核心组件 + 三套 Layout，保证了 28 个页面的视觉风格统一。新增页面时直接用 glass-card 和 gradient-btn，不需要重新设计样式。Glassmorphism 在深色背景上效果很好，配合紫蓝渐变，科技感和二次元感都有了。
