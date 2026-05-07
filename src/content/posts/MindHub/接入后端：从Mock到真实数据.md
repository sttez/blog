---
title: "接入后端：从 Mock 到真实数据"
published: 2026-05-07
tags: [Supabase, DeepSeek, 数据库, AI API, Firecrawl]
pinned: false
description: "接入 Supabase 数据库和 DeepSeek AI API，完成从 mock 数据到生产级数据层的切换。"
category: 技术
project: MindHub
draft: false
author: sttez
sourceLink: "https://github.com/sttez/mindhub"
---

# 接入后端：从 Mock 到真实数据

## Supabase：选它就对了

前端页面都搭好了，但数据还是假的。我需要一个后端——要求是：快、不用自己写 API、支持 SQL。

Supabase 完美符合。它本质上是 PostgreSQL + Auth + REST API 的打包服务，前端直接用 `@supabase/supabase-js` 就能操作数据。

```bash
npm install @supabase/supabase-js
```

创建客户端：

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

## 七张表的数据库设计

在 Supabase 控制台里创建了 7 张表：

| 表名 | 用途 |
|------|------|
| `resources` | 资源数据（标题、类型、URL、AI 摘要等） |
| `flows` | 任务流定义 |
| `flow_nodes` | 任务流节点 |
| `flow_edges` | 任务流连线 |
| `graph_nodes` | 知识图谱节点 |
| `graph_edges` | 知识图谱边 |
| `history` | 操作历史记录 |

`resources` 表的核心字段：

```sql
CREATE TABLE resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'video' | 'article' | 'link' | 'file'
  url TEXT,
  cover_image TEXT,
  ai_summary TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);
```

## db-ops.ts：数据操作层

我写了一个 `services/db-ops.ts`，把所有数据库操作封装起来。这样页面组件不需要直接写 SQL，调用 service 函数就行：

```typescript
// services/db-ops.ts
export async function getResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function createResource(resource: Partial<Resource>) {
  const { data, error } = await supabase
    .from('resources')
    .insert(resource)
    .select()
    .single()
  return { data, error }
}
```

## AI API：DeepSeek 接入

AI 分析功能用的是 DeepSeek API。为了兼容多种 AI 提供商，我把 `openai.ts` 做成了多 provider 的客户端——底层用 OpenAI SDK 格式，通过 `baseURL` 指向不同服务商：

```typescript
// lib/openai.ts
import OpenAI from 'openai'

export function createAIClient() {
  return new OpenAI({
    baseURL: process.env.NEXT_PUBLIC_AI_BASE_URL,
    apiKey: process.env.NEXT_PUBLIC_AI_API_KEY,
    dangerouslyAllowBrowser: true,
  })
}
```

注意 `NEXT_PUBLIC_` 前缀——这是静态导出必须的，因为没有服务端运行时。

`ai-engine.ts` 负责实际的 AI 调用逻辑：分析资源内容、生成摘要、提取关键词、构建知识图谱关联。

## 删除 mock.ts

所有页面都切换到真实数据后，我删掉了 `mock.ts`。那一刻代码清爽了很多——不再有两套数据源的混淆。

```bash
git rm src/lib/mock.ts
```

commit `e40f210` 的消息是："feat: 历史记录本地存储 + 移除 mock 数据层"。

## Firecrawl：网页抓取

资源管理需要能抓取网页内容，我接入了 Firecrawl。用户提交一个 URL，Firecrawl 帮我抓取正文，然后送给 AI 做分析：

```typescript
// services/crawler.ts
export async function crawlUrl(url: string) {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ url, formats: ['markdown'] }),
  })
  return response.json()
}
```

## AI 结果缓存

每次打开资源都调 AI API 太浪费了。我把 AI 分析结果缓存到 Supabase 的 `resources` 表里——`ai_summary` 字段。下次打开同一资源，直接读数据库，不重复调 API。

## 小结

从 mock 到真实数据，看起来改动很大，但因为前期 mock 数据的结构设计得合理，切换过程比预期顺利很多。`db-ops.ts` 这一层抽象也帮了大忙——页面组件几乎不用改，只是换了数据源。
