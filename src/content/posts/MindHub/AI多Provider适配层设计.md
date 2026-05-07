---
title: "AI 多 Provider 适配层设计：一套代码搞定 DeepSeek、MiMo、OpenAI"
published: 2026-05-07
tags: [AI, DeepSeek, MiMo, OpenAI, 适配层, TypeScript]
pinned: false
description: "如何设计一个轻量级的 AI Provider 抽象层，在 DeepSeek、MiMo、OpenAI 之间无缝切换。"
category: 技术
project: MindHub
draft: false
author: sttez
sourceLink: "https://github.com/sttez/mindhub"
---

# AI 多 Provider 适配层设计：一套代码搞定 DeepSeek、MiMo、OpenAI

## 为什么要搞适配层

MindHub 需要 AI 来做摘要生成、标签推荐、洞察分析。但我不想被锁死在一个 AI 服务商上——价格会变、服务会挂、模型会升级。

好消息是，DeepSeek、小米的 MiMo、OpenAI 的 API 都遵循 OpenAI 兼容协议。理论上一个 `fetch` 调用就能通吃。但实践中坑不少，比如模型名大小写、端点差异等。所以我写了一个轻量适配层。

## 核心架构

整个适配层的核心是一个配置接口和一个统一调用函数：

```typescript
// src/lib/openai.ts
interface AIConfig {
  provider: string;    // 'deepseek' | 'mimo' | 'openai'
  apiKey: string;
  baseUrl: string;
  model: string;
}
```

配置从环境变量读取，全部用 `NEXT_PUBLIC_AI_` 前缀（因为 MindHub 是静态导出，没有服务端）：

```bash
NEXT_PUBLIC_AI_PROVIDER=deepseek
NEXT_PUBLIC_AI_API_KEY=sk-your-key
NEXT_PUBLIC_AI_BASE_URL=https://api.deepseek.com/v1
NEXT_PUBLIC_AI_MODEL=deepseek-chat
```

统一调用函数：

```typescript
export async function generateCompletion(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const config = getAIConfig(); // 从 env 读取配置

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

就是这样。不管用哪个 Provider，调用方式完全一样：

```typescript
// 调用方不需要知道用的是哪个 AI
const summary = await generateCompletion(
  `请总结以下内容：${content}`,
  '你是一个知识管理助手，擅长提炼要点。'
);
```

## 踩过的坑

### MiMo 的模型名大小写

这是我浪费最多时间的一个坑。小米的 MiMo 模型名是 `mimo-v2.5-pro`（全小写），但直觉上你会写成 `MiMo-V2.5-Pro`。API 直接返回 400 错误，没有任何有用的提示。

解决办法：先调 `/models` 端点看看实际支持哪些模型名：

```bash
curl https://api.xiaoai.mi.com/v1/models \
  -H "Authorization: Bearer your-key"
```

回来的列表里是小写的就是小写。建议在文档里标红提醒自己。

### 错误处理的差异

不同 Provider 的错误响应格式不完全一致。有的返回 `{ error: { message: "..." } }`，有的返回 `{ message: "..." }`。适配层统一做了兼容：

```typescript
if (!response.ok) {
  const errorBody = await response.json().catch(() => ({}));
  const message = errorBody?.error?.message
    || errorBody?.message
    || `Unknown error: ${response.status}`;
  throw new Error(message);
}
```

## 上层应用

这个 `generateCompletion` 函数被上层的 `ai-engine.ts` 封装成具体功能：

```typescript
// src/lib/ai-engine.ts

// 生成内容摘要
export async function generateSummary(content: string): Promise<string> {
  return generateCompletion(
    `请用 2-3 句话总结以下内容的核心要点：\n\n${content}`,
    '你是知识管理助手，擅长提炼核心要点，回答要简洁。'
  );
}

// 生成标签
export async function generateTags(content: string): Promise<string[]> {
  const result = await generateCompletion(
    `请为以下内容推荐 3-5 个标签，用逗号分隔：\n\n${content}`,
    '你是标签推荐助手，只返回标签，不要解释。'
  );
  return result.split(',').map(t => t.trim()).filter(Boolean);
}

// 洞察分析
export async function generateInsights(content: string): Promise<string> {
  return generateCompletion(
    `请分析以下内容，给出 3 条关键洞察：\n\n${content}`,
    '你是深度分析助手，善于发现隐藏的关联和趋势。'
  );
}
```

所有上层功能不关心底层用的是哪个 AI，以后加新的分析维度也只需要加函数，不需要改适配层。

## AI 结果缓存

每次打开资源详情都调一遍 AI 是浪费钱。MindHub 把 AI 分析结果存在 Supabase 的 `resources` 表的 `ai_summary` 字段里：

```typescript
async function getOrCreateSummary(content: string, resourceId: string) {
  // 先查缓存
  const { data } = await supabase
    .from('resources')
    .select('ai_summary')
    .eq('id', resourceId)
    .single();

  if (data?.ai_summary) {
    return data.ai_summary;  // 缓存命中
  }

  // 缓存未命中，调 AI
  const summary = await generateSummary(content);

  // 写入缓存
  await supabase
    .from('resources')
    .update({ ai_summary: summary })
    .eq('id', resourceId);

  return summary;
}
```

这样同一个资源只调一次 AI，省钱又快。

## 火烧云？不，是 Firecrawl

MindHub 支持分析网页内容。这部分用的是 Firecrawl——一个专门做网页抓取的 SaaS 服务。流程是：

1. 用户输入 URL
2. 调用 Firecrawl API 抓取网页正文
3. 把抓取结果喂给 AI 生成摘要和标签
4. 存入 Supabase

Firecrawl 和 AI 适配层是解耦的——Firecrawl 负责「拿到内容」，AI 适配层负责「分析内容」，各干各的。

## 设计取舍

### 优点

- **简单**：核心代码不到 50 行，没有抽象工厂、没有策略模式，就是一个函数
- **灵活**：换 Provider 只改环境变量，不用改代码
- **透明**：调用方完全不感知 Provider 差异

### 代价

- **不能用 Provider 独有功能**：比如 DeepSeek 的某些高级参数、OpenAI 的 function calling——适配层只用了最基础的 chat completion
- **流式输出要单独处理**：当前用的是同步模式（等完整响应），如果要加 streaming，需要改调用方式
- **错误处理是最低公分母**：统一了通用错误，但 Provider 特有的错误码信息会丢失

### 什么时候该扩展这个适配层

如果你需要以下功能，可能需要更复杂的架构：

- 流式输出（SSE）支持
- 多模型回退（DeepSeek 挂了自动切 OpenAI）
- Token 用量统计和计费
- 函数调用 / Tool Use

但对 MindHub 来说，当前的轻量方案完全够用。过度设计比设计不足更有害。

## 总结

AI 适配层的核心思路就是 **利用 OpenAI 兼容协议的趋同性**，用最简单的 `fetch` 调用通吃多个 Provider。加上结果缓存避免重复调用，整个方案既省钱又实用。如果有一天需要更复杂的功能，再扩展也不迟——先跑起来比什么都重要。
