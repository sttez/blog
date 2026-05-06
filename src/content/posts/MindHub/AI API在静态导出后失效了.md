---
title: "AI API 在静态导出后失效了"
published: 2026-05-07
tags: [Next.js, 静态导出, 环境变量, DeepSeek, 踩坑]
pinned: false
description: "配置 output: 'export' 后 AI API 调用全挂了，原来是没有 NEXT_PUBLIC_ 前缀"
category: 踩坑记录
draft: false
author: sttez
sourceLink: "https://github.com/sttez/mindhub"
---

## 问题

MindHub 的 AI 功能（DeepSeek 摘要、知识点提取）在本地开发环境下跑得非常顺畅。等我配好了 `output: 'export'` 准备部署到静态托管服务时，一切都不对了。

页面能打开，但一触发 AI 功能，控制台就报错：

```
TypeError: Failed to fetch
```

或者更离谱的：

```
GET undefined/v1/chat/completions 404
```

URL 是 `undefined`？API 地址怎么没了？

## 排查过程

### 第一阶段：加 console.log

我实在想不通为什么 API 地址会变成 `undefined`，于是在 AI 调用函数里加了一堆 `console.log`（commit `17f1199`）：

```tsx
console.log('API URL:', process.env.NEXT_PUBLIC_DEEPSEEK_API_URL);
console.log('API Key:', process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY);
```

结果：在 `next dev` 下输出正常，但 `next build && next export` 之后的静态文件里全是 `undefined`。

### 第二阶段：恍然大悟

看到 `undefined` 的那一刻我突然明白了——静态导出（`output: 'export'`）意味着**没有 Node.js 服务器**，整个应用就是一堆纯静态的 HTML/JS/CSS 文件。而 Next.js 在构建时，**只有 `NEXT_PUBLIC_` 前缀的环境变量才会被注入到客户端代码里**。

没有 `NEXT_PUBLIC_` 前缀的变量，Next.js 认为它们只在服务端可用，构建时直接用空值替换。静态导出没有服务端，所以这些变量就彻底消失了。

我的 `.env.local` 文件里写的变量名是：

```
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=sk-xxxxx
```

缺少 `NEXT_PUBLIC_` 前缀。

## 解决方案

### 第一步：加前缀（commit `5c6668f`）

把所有 AI 相关的环境变量加上 `NEXT_PUBLIC_` 前缀：

```
NEXT_PUBLIC_DEEPSEEK_API_URL=https://api.deepseek.com
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-xxxxx
```

代码里的引用也相应修改：

```tsx
const apiUrl = process.env.NEXT_PUBLIC_DEEPSEEK_API_URL;
const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
```

### 第二步：加错误处理（commit `8b64cc8`）

修完环境变量后，AI 功能在本地构建测试中恢复了。但我想到一个更严重的问题：**API Key 暴露在客户端代码里，任何用户都能在浏览器 DevTools 里看到。** 虽然 DeepSeek API 有用量限制，但总归不安全。

更重要的是，即使环境变量配对了，**网络请求依然可能失败**——DeepSeek API 超时、限流、余额不足等等。之前没有 try-catch，一个 fetch 失败直接让整个页面崩溃。

于是我给所有 AI 调用加了错误边界：

```tsx
async function generateSummary(content: string): Promise<string> {
  try {
    const response = await fetch(apiUrl!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ /* ... */ }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI summary failed:', error);
    return ''; // 返回空值，不让页面崩溃
  }
}
```

同时在 UI 层加了 fallback 显示：当 AI 返回空值时，显示"AI 摘要生成失败，请稍后重试"而不是空白或报错。

### 第三步：AI 可选配置

还加了一个判断：如果环境变量未配置（`!apiUrl || !apiKey`），直接跳过 AI 调用，显示一个友好的提示"请配置 DeepSeek API Key 吥用 AI 功能"，而不是发起一个注定失败的请求。

## 学到的教训

**静态导出从根本上改变了运行时环境。** 本地开发时 `next dev` 有一个完整的 Node.js 服务器，很多问题都被掩盖了。一旦切换到 `output: 'export'`，所有"服务端能力"全部消失。

几条铁律：

1. **客户端要用的环境变量，必须加 `NEXT_PUBLIC_` 前缀**——这是 Next.js 的设计约束，没有例外
2. **静态导出下不存在安全的 API Key 存放方式**——如果涉及敏感 Key，考虑用 Serverless Function 做代理（但那就不是纯静态了）
3. **所有外部 API 调用必须加 try-catch**——网络是不可靠的，用户的操作是不可预测的
4. **永远不要假设"本地能跑 = 线上能跑"**——尽早做构建测试
