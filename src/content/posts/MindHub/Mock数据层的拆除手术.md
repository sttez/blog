---
title: "Mock 数据层的拆除手术"
published: 2026-05-03
tags: [Supabase, 数据迁移, Mock, 架构重构, 踩坑]
pinned: false
description: "整个应用 6 个页面都依赖 mock 数据，迁移到 Supabase 时只能一次性全换"
category: 踩坑
project: MindHub
draft: false
author: sttez
sourceLink: "https://github.com/sttez/mindhub"
---

## 问题

MindHub 的初版是用 mock 数据开发的。一个 `src/data/mock.ts` 文件导出了所有假数据——资源列表、标签、任务流、知识图谱节点关系——全都在里面。

6 个页面都直接 `import { mockResources } from "@/data/mock"`，用的时候就是一行简单的赋值：

```tsx
import { mockResources } from "@/data/mock";

export default function Page() {
  const resources = mockResources; // 直接用，同步的，永远不会错
  return <ResourceList resources={resources} />;
}
```

这样开发飞快，但到了要接 Supabase 真实数据库的时候，麻烦来了。

## 挑战

我原本想"一个页面一个页面慢慢迁移"，结果发现根本做不到：

- **数据类型耦合**：mock 数据的 TypeScript 类型和 Supabase 返回的类型不完全一致，某些字段名不同
- **同步 vs 异步**：mock 是同步导入，Supabase 查询是异步的，这意味着每个页面的数据加载逻辑都要从"直接用"改成"useEffect + useState + loading 状态"
- **交叉引用**：页面 A 的数据依赖页面 B 的数据结构，改了一个，另一个也要改

简而言之，这是一次必须"一刀切"的手术。

## 解决方案

### 第一步：设计文档先行（commit `5035a79`）

在动代码之前，我先写了一个设计文档，列清楚了：

1. Supabase 表结构（resources, tags, flows, graph_nodes, graph_edges）
2. 每个表对应的 CRUD 操作函数签名
3. 每个页面需要改哪些地方
4. 数据类型映射（mock 哪些字段要改名、哪些要丢弃）

这一步花了一个小时，但避免了后面反复修改的混乱。

### 第二步：写 db-ops.ts

创建了 `src/lib/db-ops.ts`，把所有 Supabase 查询封装成函数：

```tsx
import { supabase } from './supabase';

export async function getResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createResource(resource: Omit<Resource, 'id'>): Promise<Resource> {
  const { data, error } = await supabase
    .from('resources')
    .insert(resource)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 第三步：逐页替换（commit `e40f210`）

每个页面的数据加载从同步改成异步。模式是一样的：

```tsx
// Before: 同步 mock
import { mockResources } from "@/data/mock";
const resources = mockResources;

// After: 异步 Supabase
const [resources, setResources] = useState<Resource[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  getResources()
    .then(setResources)
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);
```

6 个页面全部改完：`page.tsx`、`insight/page.tsx`、`graph/page.tsx`、`flows/page.tsx`、`viewer/page.tsx`、`archive/page.tsx`。

### 第四步：加 FAB 和资源增删改（commit `2060abc`）

既然有了真实数据库，终于可以做真正的"创建资源"功能了。加了一个浮动操作按钮（FAB），点击弹出创建对话框，调用 `createResource` 写入 Supabase。

同时创建了 `AddResourceContext`，用 React Context 实现跨组件的资源创建能力——任何页面的任何组件都能触发"新建资源"操作。

### 第五步：删除 mock.ts

最后一步，删除 `src/data/mock.ts`。编译通过的那一刻，有一种拔掉呼吸机病人还能自主呼吸的成就感。

## 学到的教训

**Mock 到真实数据的迁移，要么不做，做就一次做完。**

混用 mock 和真实数据是最糟糕的状态——你不知道哪个页面用的是假数据，debug 的时候会疯掉。

具体的经验：

1. **设计文档先行**：先想清楚表结构、函数签名、类型映射，再动手写代码。花一小时写文档，省十小时改代码
2. **抽象数据访问层**：所有数据库操作封装在 `db-ops.ts` 里，页面组件只调用函数，不直接写 Supabase 查询。将来换数据库也只需要改这一个文件
3. **统一异步模式**：从同步到异步的转变是最大的工作量。但一旦统一成 `useState + useEffect` 的模式，每个页面的改动就是机械性的复制粘贴
4. **一次做完，不留尾巴**：不要想着"先改三个页面试试"，改就改全部。中间状态是最危险的

这次"拆除手术"虽然痛苦，但完成后整个应用的数据层清晰了，后续加功能（比如收藏、标签过滤）都是在真实数据上做，心里踏实。
