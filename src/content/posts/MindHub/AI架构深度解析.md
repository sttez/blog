---
title: "MindHub 项目 AI 架构深度解析：提示词工程、RAG 与 Agent 应用实践"
published: 2026-05-11
description: 从提示词工程、RAG（检索增强生成）和 Agent 应用三个维度，深度剖析 MindHub 项目的 AI 架构设计，包含四种提示词模式、轻量级 RAG 实现与 Agent 升级路径。
tags: [AI架构, 提示词工程, RAG, Agent, MindHub, TypeScript, Next.js]
category: 指南
project: MindHub
draft: false
---

# MindHub 项目 AI 架构深度解析：提示词工程、RAG 与 Agent 应用实践

> **项目背景**：MindHub 是一个基于 Next.js 的知识管理仪表盘，集成了 AI 能力来实现资源摘要生成、智能标签、深度洞察分析和搜索建议等功能。本文将从提示词工程、RAG（检索增强生成）和 Agent 应用三个维度，深度剖析该项目的 AI 架构设计。

---

## 一、AI 基础设施：Provider 无关的 API 抽象层

在深入具体 AI 应用之前，先看项目的 AI 基础设施。MindHub 没有使用 OpenAI SDK 或 LangChain 等框架，而是基于原生 `fetch` 实现了一个轻量级的、Provider 无关的 API 客户端。

### 1.1 核心客户端 openai.ts

```typescript
type AIProvider = "deepseek" | "mimo" | "openai";

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const aiConfig: AIConfig = {
  provider: (process.env.NEXT_PUBLIC_AI_PROVIDER as AIProvider) || "deepseek",
  apiKey: process.env.NEXT_PUBLIC_AI_API_KEY || "",
  baseUrl: process.env.NEXT_PUBLIC_AI_BASE_URL || "https://api.deepseek.com",
  model: process.env.NEXT_PUBLIC_AI_MODEL || "deepseek-chat",
};
```

设计特点：

- **Provider 无关**：支持 DeepSeek、小米 Mimo、OpenAI 三种 OpenAI 兼容 API，通过环境变量切换
- **零依赖**：没有引入任何 AI SDK，仅使用原生 `fetch` 调用 `/chat/completions` 端点
- **统一接口**：暴露 `generateCompletion(prompt, system?)` 函数，上层业务无需关心底层 API 差异

```typescript
export async function generateCompletion(
  prompt: string,
  system?: string
): Promise<string> {
  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: aiConfig.model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
```

### 1.2 环境配置

```env
NEXT_PUBLIC_AI_PROVIDER=deepseek
NEXT_PUBLIC_AI_API_KEY=sk-xxx
NEXT_PUBLIC_AI_BASE_URL=https://api.deepseek.com
NEXT_PUBLIC_AI_MODEL=deepseek-v4-pro
NEXT_PUBLIC_FIRECRAWL_API_KEY=fc-xxx
```

项目同时配置了 Firecrawl API 密钥，用于网页内容抓取——这是项目中唯一的"检索"环节，下文会详细分析。

---

## 二、提示词工程（Prompt Engineering）详解

MindHub 的所有提示词集中在 `ai-engine.ts` 中，包含四个功能各异的 AI 函数。每个函数都展示了不同的提示词设计技巧。

### 2.1 模式一：约束式提示词 — 资源摘要生成

```typescript
export async function generateResourceSummary(content: string): Promise<string> {
  const response = await generateCompletion(
    `请用中文为以下内容生成一段 50-100 字的摘要：\n\n${content}`,
    "你是一个知识管理助手，擅长为资源生成简洁的摘要。"
  );
  return response || "";
}
```

**提示词技巧分析**：

| 技巧 | 具体体现 |
|------|---------|
| 角色设定 | System prompt 定义"知识管理助手"角色 |
| 长度约束 | "50-100 字"精确控制输出长度 |
| 语言约束 | "用中文"确保输出语言一致 |
| 内容注入 | `${content}` 将待摘要内容放入 user prompt |

这是最基础的提示词模式，适用于需要**固定格式短文本输出**的场景。

### 2.2 模式二：结构化输出提示词 — 标签生成

```typescript
export async function generateTags(content: string): Promise<string[]> {
  const response = await generateCompletion(
    `请为以下内容生成 3-5 个标签，用 JSON 数组格式返回（如 ["#标签1", "#标签2"]）：\n\n${content}`,
    "你是一个标签生成助手，只返回 JSON 数组，不要返回其他内容。"
  );
  try {
    return JSON.parse(response);
  } catch {
    return [];
  }
}
```

**提示词技巧分析**：

| 技巧 | 具体体现 |
|------|---------|
| 格式锁定 | System prompt 强调"只返回 JSON 数组，不要返回其他内容" |
| Few-shot 示例 | User prompt 中给出 `["#标签1", "#标签2"]` 作为输出示例 |
| 数量约束 | "3-5 个"控制标签数量范围 |
| 防御性解析 | `JSON.parse` 失败时返回空数组，防止 LLM 输出格式偏差导致崩溃 |

**关键设计**：这是一个典型的 **"提示词约束 + 代码侧兜底"** 双保险模式。提示词尽力引导输出格式，代码侧用 `try/catch` 处理模型不按格式输出的边界情况。

### 2.3 模式三：条件提示词 + JSON Schema 强制 — 深度洞察分析

这是整个项目中最复杂的提示词设计，值得详细拆解。

```typescript
export async function generateInsight(resourceId: string): Promise<AIInsight> {
  // Step 1: 获取资源数据
  const resource = await getResourceById(resourceId);

  // Step 2: 尝试通过 Firecrawl 抓取网页内容
  let webpageContent = "";
  const urlMatch = resource.description.match(/(https?:\/\/[^\s\n]+)/);
  const url = urlMatch ? urlMatch[1] : "";
  if (url && isFirecrawlConfigured()) {
    const crawled = await crawlUrl(url);
    webpageContent = crawled.markdown || crawled.content;
  }

  // Step 3: 根据是否有网页内容，构造不同的输入
  const resourceInfo = webpageContent
    ? `标题：${resource.title}
网页内容（摘要）：${webpageContent.slice(0, 3000)}
类型：${resource.type}
标签：${resource.tags.join(", ")}`
    : `标题：${resource.title}
描述：${resource.description}
类型：${resource.type}
标签：${resource.tags.join(", ")}`;

  // Step 4: 条件提示词 + JSON Schema 强制
  const response = await generateCompletion(
    `请分析以下资源并返回 JSON：\n${resourceInfo}`,
    `你是一个知识分析专家，请用中文分析这个资源。${
      webpageContent
        ? "我会提供网页的实际内容，请基于实际内容进行分析。"
        : "我只提供了基本描述，请基于描述信息进行分析。"
    }返回如下 JSON 格式：
{
  "summary": "100-150字的综合分析，包含资源是什么、核心功能、适合什么人使用",
  "optimalScenario": "具体适用场景描述，如学习、开发、研究等",
  "relevance": 75,
  "keyHighlights": [
    {"title": "亮点1标题", "description": "亮点说明", "icon": "Sparkles"},
    {"title": "亮点2标题", "description": "亮点说明", "icon": "Zap"},
    {"title": "亮点3标题", "description": "亮点说明", "icon": "Target"}
  ],
  "relatedResources": ["推荐关联资源1", "推荐关联资源2"]
}
只返回 JSON，不要返回其他内容。`
  );
}
```

**提示词技巧深度分析**：

**1. 条件提示词（Conditional Prompting）**

根据数据可用性动态调整 system prompt：

```
有网页内容时 → "我会提供网页的实际内容，请基于实际内容进行分析。"
无网页内容时 → "我只提供了基本描述，请基于描述信息进行分析。"
```

这种设计有两个好处：

- **降低幻觉**：明确告诉模型信息来源的局限性，防止模型在信息不足时编造细节
- **引导分析深度**：有实际内容时鼓励深入分析，只有描述时引导模型做合理推断

**2. JSON Schema 内嵌提示词**

项目没有使用 OpenAI 的 `response_format` 或 `function_calling` 参数来强制结构化输出，而是将 JSON Schema 直接嵌入提示词：

```json
{
  "summary": "100-150字的综合分析...",
  "optimalScenario": "具体适用场景描述...",
  "relevance": 75,
  "keyHighlights": [
    {"title": "亮点1标题", "description": "亮点说明", "icon": "Sparkles"}
  ],
  "relatedResources": ["推荐关联资源1", "推荐关联资源2"]
}
```

这种做法的优缺点：

| 优点 | 缺点 |
|------|------|
| 兼容所有 OpenAI 兼容 API | 不如 `response_format: json_schema` 可靠 |
| 无需额外 API 参数支持 | 模型偶尔可能偏离格式 |
| 可读性好，易于调试 | 需要代码侧做 JSON.parse 兜底 |

**3. 内容截断策略**

```typescript
webpageContent.slice(0, 3000)
```

将抓取的网页内容截断到 3000 字符，这是一个务实的 Token 控制策略：

- 避免超出模型上下文窗口
- 降低 API 调用成本
- 3000 字符大约 1000 tokens，给输出留足 1000 tokens 空间

**4. 输出类型定义**

与提示词对应，TypeScript 侧定义了严格的类型：

```typescript
export interface AIInsight {
  summary: string;
  optimalScenario: string;
  relevance: number;
  keyHighlights: {
    title: string;
    description: string;
    icon: string;
  }[];
  relatedResources: string[];
}
```

解析时使用**合并策略**，用默认值兜底缺失字段：

```typescript
const parsed = JSON.parse(response);
return { ...EMPTY_INSIGHT, ...parsed };
```

### 2.4 模式四：指令式提示词 — AI 搜索建议

```typescript
export async function searchWithAI(query: string): Promise<string[]> {
  const response = await generateCompletion(
    `用户搜索：${query}\n请生成 2 个相关的搜索建议，每行一个。用中文回答。`,
    "你是搜索建议助手，每次返回 2 个建议，每行一个。"
  );
  return response.split("\n").filter(Boolean).slice(0, 3);
}
```

**提示词技巧分析**：

| 技巧 | 具体体现 |
|------|---------|
| 输出格式约定 | "每行一个" 利用换行符作为自然分隔符 |
| 数量精确控制 | "2 个" 明确数量 |
| 代码侧截断 | `.slice(0, 3)` 防止模型多输出 |
| 上下文注入 | `用户搜索：${query}` 直接嵌入用户意图 |

### 2.5 提示词工程总结

项目展示了四种提示词模式的递进使用：

```
基础模式                    高级模式
  │                          │
  ▼                          ▼
约束式 ──→ 结构化输出 ──→ 条件提示词 ──→ 指令式
(摘要)     (标签)         (洞察分析)    (搜索建议)
```

每种模式都遵循一个共同原则：**提示词引导 + 代码侧兜底**。提示词尽力控制输出格式，代码侧通过 `try/catch`、`.slice()`、`{ ...DEFAULT, ...parsed }` 等方式处理模型输出的不确定性。

---

## 三、RAG（检索增强生成）：轻量级实现分析

### 3.1 项目中的"检索"环节

严格来说，MindHub 没有实现完整的 RAG 管线，但有一个简化的检索流程：

```
资源描述 → 提取 URL → Firecrawl 抓取网页 → 截取内容 → 注入 LLM 提示词
```

核心代码在 `crawler.ts`：

```typescript
export async function crawlUrl(url: string) {
  const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      pageOptions: { onlyMainContent: true },
    }),
  });
  const data = await response.json();
  return {
    title: data?.data?.metadata?.title || "",
    content: data?.data?.content || "",
    markdown: data?.data?.markdown || "",
  };
}
```

在 `generateInsight()` 中，检索结果被拼接到提示词中：

```typescript
const resourceInfo = webpageContent
  ? `标题：${resource.title}
网页内容（摘要）：${webpageContent.slice(0, 3000)}
类型：${resource.type}
标签：${resource.tags.join(", ")}`
  : `标题：${resource.title}
描述：${resource.description}
...`;
```

### 3.2 与完整 RAG 的差距

一个标准的 RAG 管线通常包含以下环节，而 MindHub 只实现了其中的部分：

| RAG 环节 | 标准实现 | MindHub 实现 |
|---------|---------|-------------|
| 文档加载 | 多格式解析器（PDF、DOCX、HTML） | Firecrawl 网页抓取 |
| 文档分块 | 递归字符分割 / 语义分割 | 简单截断前 3000 字符 |
| Embedding | 调用 Embedding 模型生成向量 | **无** |
| 向量存储 | pgvector / Pinecone / Weaviate | **无** |
| 语义检索 | 余弦相似度 / ANN 检索 | **无（直接注入）** |
| 上下文组装 | 检索结果拼接 + 重排序 | 字符串模板拼接 |
| LLM 生成 | 基于检索上下文生成回答 | 有 |

项目当前的模式更接近于 **"Retrieve-then-Read"**，而非完整的 RAG：

- "Retrieve" 仅限于 URL 对应的单个网页，没有跨文档检索能力
- 没有向量化过程，无法做语义相似度匹配
- 内容直接注入，没有相关性排序

### 3.3 如何升级为完整 RAG

如果要在现有基础上构建完整的 RAG 能力，可以按以下路径升级：

**第一步：加入 Embedding 和向量存储**

Supabase 已经支持 pgvector 扩展，可以在现有数据库中直接添加：

```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 为资源内容创建向量表
CREATE TABLE resource_embeddings (
  id TEXT PRIMARY KEY,
  resource_id TEXT REFERENCES resources(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI embedding 维度
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 HNSW 索引加速检索
CREATE INDEX ON resource_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

**第二步：实现文档分块**

```typescript
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
```

**第三步：实现语义检索**

```typescript
async function semanticSearch(query: string, topK = 5) {
  // 1. 将查询向量化
  const embedding = await generateEmbedding(query);

  // 2. 在 Supabase 中做相似度检索
  const { data } = await supabase.rpc("match_resources", {
    query_embedding: embedding,
    match_count: topK,
  });

  return data;
}
```

**第四步：将检索结果注入提示词**

```typescript
export async function generateInsightWithRAG(resourceId: string, userQuery: string) {
  // 语义检索相关文档块
  const relevantChunks = await semanticSearch(userQuery);

  const context = relevantChunks
    .map((chunk) => chunk.content)
    .join("\n---\n");

  return generateCompletion(
    `基于以下参考资料回答用户问题：\n\n${context}\n\n用户问题：${userQuery}`,
    "你是一个知识分析专家，请基于提供的参考资料进行分析。如果资料不足，请明确说明。"
  );
}
```

---

## 四、Agent 应用：现状与未来

### 4.1 当前状态：无 Agent 架构

MindHub 当前的 AI 集成全部是**单轮请求-响应模式**，没有任何 Agent 特性：

- 没有 Function Calling / Tool Use
- 没有多步推理链
- 没有自主决策和循环执行
- 没有状态管理和记忆机制

Flows 页面的"AI 智能添加"功能甚至是一个**模拟特性**——用 `setTimeout` 模拟 1.5 秒的"分析"延迟后直接选中所有资源，实际上并没有调用 AI API。

### 4.2 Agent 架构设计建议

对于 MindHub 这样的知识管理场景，Agent 架构可以带来显著的体验提升。以下是一个可行的设计方案：

#### 4.2.1 知识管理 Agent 架构

```
用户请求
   │
   ▼
┌──────────────────────────────────┐
│          Agent 主循环              │
│  ┌─────────────────────────────┐ │
│  │      LLM 推理引擎           │ │
│  │  (决定下一步调用哪个工具)     │ │
│  └──────────┬──────────────────┘ │
│             │                    │
│    ┌────────┼────────┐           │
│    ▼        ▼        ▼           │
│ ┌──────┐ ┌──────┐ ┌──────┐      │
│ │网页  │ │知识  │ │资源  │      │
│ │抓取  │ │图谱  │ │搜索  │      │
│ │Tool  │ │Tool  │ │Tool  │      │
│ └──────┘ └──────┘ └──────┘      │
│    │        │        │           │
│    └────────┼────────┘           │
│             ▼                    │
│      汇总 → 生成最终回答          │
└──────────────────────────────────┘
```

#### 4.2.2 基于 Function Calling 的实现

利用 DeepSeek / OpenAI 的 Function Calling 能力，可以将现有功能封装为 Agent 工具：

```typescript
// 工具定义
const tools = [
  {
    type: "function",
    function: {
      name: "crawl_webpage",
      description: "抓取指定 URL 的网页内容",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "要抓取的网页 URL" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_resources",
      description: "在知识库中搜索相关资源",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索关键词" },
          type: {
            type: "string",
            enum: ["video", "document", "software", "article"],
            description: "资源类型过滤",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_knowledge_graph",
      description: "查询知识图谱中的关联关系",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string", description: "起始节点 ID" },
          depth: { type: "number", description: "查询深度" },
        },
        required: ["nodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_summary",
      description: "为内容生成摘要",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "待摘要的内容" },
        },
        required: ["content"],
      },
    },
  },
];

// Agent 主循环
async function runAgent(userMessage: string): Promise<string> {
  const messages = [
    {
      role: "system",
      content: `你是一个知识管理 Agent，可以帮助用户搜索、分析和组织知识资源。
你可以调用工具来获取信息，然后综合分析后给出回答。
当前知识库中有视频、文档、软件和文章四类资源。`,
    },
    { role: "user", content: userMessage },
  ];

  // Agent 循环：最多执行 5 轮
  for (let i = 0; i < 5; i++) {
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const choice = data.choices[0];

    // 模型选择直接回答
    if (choice.finish_reason === "stop") {
      return choice.message.content;
    }

    // 模型选择调用工具
    if (choice.finish_reason === "tool_calls") {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const result = await executeTool(toolCall.function.name, toolCall.function.arguments);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }
  }

  return "分析超时，请尝试更具体的问题。";
}

// 工具执行器
async function executeTool(name: string, args: string): Promise<any> {
  const parsed = JSON.parse(args);

  switch (name) {
    case "crawl_webpage":
      return crawlUrl(parsed.url);
    case "search_resources":
      return searchResources(parsed.query, parsed.type);
    case "query_knowledge_graph":
      return queryKnowledgeGraph(parsed.nodeId, parsed.depth);
    case "generate_summary":
      return generateResourceSummary(parsed.content);
    default:
      return { error: `未知工具: ${name}` };
  }
}
```

#### 4.2.3 Agent 应用场景示例

**场景 1：智能资源推荐**

```
用户：我在研究分布式系统安全，有什么相关资源？

Agent 执行流程：
1. 调用 search_resources(query="分布式系统安全")
2. 获取到资源列表后，调用 query_knowledge_graph 找关联资源
3. 对每个资源调用 generate_summary 生成摘要
4. 综合分析，生成推荐报告
```

**场景 2：自动知识整理**

```
用户：帮我分析这个 URL 并归档到合适的知识分类中

Agent 执行流程：
1. 调用 crawl_webpage(url=用户提供的URL)
2. 调用 generate_summary 对内容做摘要
3. 调用 search_resources 查找已有相似资源，避免重复
4. 推荐合适的分类和标签
5. 生成待确认的归档方案
```

**场景 3：知识图谱自动扩展**

```
用户：根据我最近添加的资源，更新知识图谱

Agent 执行流程：
1. 查询最近添加的资源
2. 对每个新资源调用 search_resources 找相似资源
3. 推断资源间的关系类型（依赖、替代、包含等）
4. 生成知识图谱更新建议
```

### 4.3 Agent 的记忆管理

对于知识管理 Agent，记忆机制尤为重要。可以在 Supabase 中增加对话历史表：

```sql
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 五、AI 缓存策略

### 5.1 数据库级缓存

MindHub 实现了一个实用的 AI 结果缓存机制，存储在 Supabase 的 `resources` 表的 `ai_summary` 字段中：

```typescript
// insight/page.tsx 中的缓存逻辑
if (res?.aiSummary) {
  try {
    const cached = JSON.parse(res.aiSummary);
    if (cached.summary) {
      setInsight(cached);
      return; // 命中缓存，直接返回
    }
  } catch { /* 不是 JSON，忽略 */ }
}

// 缓存未命中 → 调用 AI → 写回缓存
if (res && isAIConfigured()) {
  const aiResult = await generateInsight(resourceId);
  if (aiResult.summary) {
    setInsight(aiResult);
    await supabase
      .from("resources")
      .update({
        ai_summary: JSON.stringify(aiResult),
        updated_at: new Date().toISOString()
      })
      .eq("id", resourceId);
  }
}
```

**缓存策略特点**：

- **写入即缓存**：AI 分析结果立即持久化到数据库
- **懒加载**：只在用户查看 Insight 页面时才触发 AI 分析
- **格式兼容**：`extractAiSummary` 工具函数兼容纯文本和 JSON 两种历史格式
- **无失效策略**：缓存没有 TTL，需要手动清除或资源更新时重新生成

### 5.2 缓存优化方向

| 当前 | 可优化为 |
|------|---------|
| 精确匹配缓存 | 语义缓存（相似问题命中缓存） |
| 无 TTL | 设置 TTL，定期刷新 AI 分析 |
| 单层缓存 | Redis 热缓存 + DB 持久化双层 |
| 手动失效 | 资源更新时自动清除关联缓存 |

---

## 六、整体架构全景

```
                        ┌─────────────────┐
                        │    用户界面      │
                        │  (Next.js RSC)  │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                   │
              ▼                  ▼                   ▼
     ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
     │ Dashboard   │   │ Insight 页   │   │ Flows 页     │
     │ 展示摘要    │   │ AI 洞察分析  │   │ 模拟 AI 添加 │
     │ 和相关度    │   │ + 缓存策略   │   │              │
     └──────┬──────┘   └──────┬───────┘   └──────────────┘
            │                 │
            │                 ▼
            │        ┌─────────────────┐
            │        │  AI Engine      │
            │        │  (4 个函数)     │
            │        └────────┬────────┘
            │                 │
            │     ┌───────────┼───────────┐
            │     │           │           │
            │     ▼           ▼           ▼
            │  摘要生成   标签生成    洞察分析
            │                        (含网页抓取)
            │                             │
            │                             ▼
            │                    ┌──────────────┐
            │                    │   Crawler    │
            │                    │  (Firecrawl) │
            │                    └──────────────┘
            │                             │
            ▼                             ▼
     ┌──────────────────────────────────────────┐
     │         generateCompletion()             │
     │     (OpenAI-compatible API Client)       │
     └──────────────────┬───────────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │  DeepSeek / Mimo    │
              │  / OpenAI API       │
              └─────────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │   Supabase 缓存     │
              │  (ai_summary 字段)  │
              └─────────────────────┘
```

---

## 七、总结与展望

### 7.1 当前成果

MindHub 的 AI 集成虽然属于**初级阶段**，但有几个值得肯定的设计决策：

1. **Provider 无关架构**：不绑定任何单一 AI 提供商，通过环境变量灵活切换
2. **分层提示词设计**：四种不同复杂度的提示词模式，覆盖从简单摘要到深度分析的场景
3. **务实的兜底策略**：每次 AI 调用都有 `try/catch`、默认值、格式兼容等防御措施
4. **数据库级缓存**：避免重复调用 API，控制成本

### 7.2 待完善方向

| 维度 | 现状 | 建议 |
|------|------|------|
| **提示词工程** | 内联硬编码，无版本管理 | 抽取为独立模板文件，支持版本迭代和 A/B 测试 |
| **RAG** | 仅有网页抓取，无向量检索 | 加入 pgvector + Embedding，实现跨文档语义检索 |
| **Agent** | 无 Agent 架构 | 基于 Function Calling 构建知识管理 Agent |
| **流式输出** | 同步阻塞式 | 改用 SSE 流式响应，提升交互体验 |
| **结构化输出** | 提示词引导 + JSON.parse | 利用 API 的 `response_format` 参数 |
| **成本控制** | 基础缓存 | 加入 Token 用量监控、语义缓存、分级模型策略 |

### 7.3 一句话总结

> MindHub 的 AI 架构展示了一个务实的**"最小可用 AI 集成"**范式：用最简洁的提示词工程解决实际问题，用数据库缓存控制成本，用 Provider 无关设计保留扩展性。RAG 和 Agent 是自然的下一步演进方向。
