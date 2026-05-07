# Mizuki 博客新手指南

面向小白的完整使用手册，从零开始搭建、配置、写文章到部署上线。

---

## 目录

- [第一部分：快速上手](#第一部分快速上手)
  - [1. 环境准备](#1-环境准备)
  - [2. 启动博客](#2-启动博客)
  - [3. 认识项目结构](#3-认识项目结构)
  - [4. 发布第一篇文章](#4-发布第一篇文章)
  - [5. 修改站点信息](#5-修改站点信息)
- [第二部分：常用配置](#第二部分常用配置)
  - [1. 主题颜色](#1-主题颜色)
  - [2. 横幅图片与轮播](#2-横幅图片与轮播)
  - [3. 侧边栏组件](#3-侧边栏组件)
  - [4. 导航栏](#4-导航栏)
  - [5. 页面开关](#5-页面开关)
  - [6. 评论系统](#6-评论系统)
  - [7. 页脚](#7-页脚)
- [第三部分：内容进阶](#第三部分内容进阶)
  - [1. Markdown 扩展语法](#1-markdown-扩展语法)
  - [2. 添加图片和视频](#2-添加图片和视频)
  - [3. 文章管理技巧](#3-文章管理技巧)
  - [4. 添加项目](#4-添加项目)
  - [5. 修改技能页](#5-修改技能页)
  - [6. 修改关于页面](#6-修改关于页面)
  - [7. 修改个人简介](#7-修改个人简介)
  - [8. 页面调整总览](#8-页面调整总览)
- [第四部分：部署上线](#第四部分部署上线)
  - [1. Vercel 部署](#1-vercel-部署)
  - [2. Netlify 部署](#2-netlify-部署)
  - [3. GitHub Pages 部署](#3-github-pages-部署)
- [附录](#附录)
  - [常用命令速查](#常用命令速查)
  - [常见问题 FAQ](#常见问题-faq)

---

# 第一部分：快速上手

## 1. 环境准备

在使用 Mizuki 博客之前，需要安装以下工具：

### 安装 Node.js（>= 20）

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载并安装 **LTS 版本**（推荐 20.x 或更高）
3. 安装完成后，打开终端验证：

```bash
node --version
# 应该显示 v20.x.x 或更高

npm --version
# 应该显示 10.x.x 或更高
```

### 安装 pnpm

Mizuki 使用 pnpm 作为包管理器。在终端运行：

```bash
npm install -g pnpm
```

验证安装：

```bash
pnpm --version
# 应该显示 10.x.x
```

---

## 2. 启动博客

### 克隆项目

```bash
git clone https://github.com/你的用户名/Mizuki.git
cd Mizuki
```

### 安装依赖

```bash
pnpm install
```

首次安装可能需要几分钟，取决于网络速度。

### 启动开发服务器

```bash
pnpm dev
```

启动成功后，打开浏览器访问 `<!-- http://localhost:4321 -->`，就能看到你的博客了。

> **提示：** 开发模式下修改文件会自动刷新页面，所见即所得。

---

## 3. 认识项目结构

以下是新手需要了解的核心目录（不用全部记住，用到时再查）：

```
Mizuki/
├── src/
│   ├── config.ts          ← 最重要的文件！所有博客配置都在这里
│   ├── content/
│   │   ├── posts/         ← 你的博客文章放在这里
│   │   └── spec/          ← 特殊页面内容（关于、友链）
│   ├── data/              ← 特色页面的数据文件（日记、项目、技能等）
│   ├── pages/             ← 页面路由（一般不需要改）
│   ├── components/        ← 组件（一般不需要改）
│   └── styles/            ← 样式文件
├── public/
│   ├── assets/
│   │   ├── desktop-banner/  ← 桌面端横幅图片
│   │   ├── mobile-banner/   ← 移动端横幅图片
│   │   └── font/            ← 字体文件
│   └── images/              ← 你的图片资源
├── package.json           ← 项目依赖和命令
└── astro.config.mjs       ← Astro 框架配置
```

### 新手只需要关注这几个地方

| 你要做什么 | 去哪里 |
|-----------|--------|
| 改网站标题、颜色、头像 | `src/config.ts` |
| 写新文章 | `src/content/posts/` |
| 改"关于"页面 | `src/content/spec/about.md` |
| 添加项目 | `src/data/projects.ts` |
| 修改技能 | `src/data/skills.ts` |
| 改个人简介 | `src/config.ts` 中的 `profileConfig` |
| 改横幅图片 | `public/assets/desktop-banner/` 和 `mobile-banner/` |
| 放文章里的图片 | `public/images/` |
| 改友链数据 | `src/data/friends.ts` |
| 改日记数据 | `src/data/diary.ts` |

---

## 4. 发布第一篇文章

### 方法一：用命令创建（推荐）

在项目根目录运行：

```bash
pnpm new-post 我的第一篇文章
```

脚本会在 `src/content/posts/` 下创建一个新的 markdown 文件。

### 方法二：手动创建

在 `src/content/posts/` 目录下新建一个 `.md` 文件，文件名用英文和连字符：

```
src/content/posts/my-first-post.md
```

### 编写 Frontmatter（文章头部信息）

每个文章文件的开头必须有 Frontmatter，用 `---` 包裹：

```yaml
---
title: 我的第一篇博客文章
published: 2026-05-07
description: 这是我的第一篇博客文章，记录我的学习心得
tags: [随笔, 日记]
category: 生活
draft: false
---

# 文章正文

在这里写你的文章内容，支持 Markdown 语法。
```

### Frontmatter 字段说明

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `title` | 是 | 文章标题 | `我的第一篇文章` |
| `published` | 是 | 发布日期（YYYY-MM-DD） | `2026-05-07` |
| `description` | 建议 | 文章描述，用于 SEO | `这是一篇关于...` |
| `category` | 是 | 分类（固定值：技术、指南、踩坑） | `技术` |
| `tags` | 是 | 标签列表 | `[JavaScript, 教程]` |
| `project` | 否 | 所属项目（对应项目数据中的 title） | `Mizuki Blog Theme` |
| `image` | 否 | 封面图片 | `./cover.webp` |
| `draft` | 否 | 是否为草稿（默认 false） | `true` |
| `pinned` | 否 | 是否置顶（默认 false） | `true` |

### 完整示例

```yaml
---
title: 使用 Astro 搭建个人博客
published: 2026-05-07
description: 记录用 Astro 框架搭建 Mizuki 博客的完整过程
category: 技术
tags: [Astro, 博客, 前端]
project: Mizuki Blog Theme
draft: false
---

# 文章正文

在这里写你的文章内容...
```

> **提示：** `project` 字段用于将文章归类到某个项目下。值必须和 `src/data/projects.ts` 中对应项目的 `title` 完全一致。填写后，该项目的详情页会自动收录这篇文章。

保存文件后，刷新浏览器就能在首页看到你的文章了。

---

## 5. 修改站点信息

打开 `src/config.ts`，找到最上面的 `siteConfig`：

```typescript
export const siteConfig: SiteConfig = {
    title: "Mizuki",              // ← 网站标题，改成你的博客名
    subtitle: "个人博客",          // ← 网站副标题
    siteURL: "https://zhh-blog.netlify.app/",  // ← 你的网站地址
    siteStartDate: "2026-01-05",  // ← 建站日期
    // ...
};
```

### 修改个人资料

在同一个文件中找到 `profileConfig`：

```typescript
export const profileConfig: ProfileConfig = {
    avatar: "assets/images/avatar.webp",  // 头像（图片放 src/assets/images/ 下）
    name: "你的昵称",                      // ← 改成你的昵称
    bio: "一句话介绍自己",                  // ← 个人简介
    links: [
        { name: "Bilibili", icon: "fa6-brands:bilibili", url: "https://bilibili.com" },
        { name: "GitHub", icon: "fa6-brands:github", url: "https://github.com/你的用户名" },
    ],
    donationImage: "/images/donate.webp",  // 赞赏码图片（可选）
    donationTitle: "赏个鸡腿",
};
```

**头像图片：** 把头像放到 `src/assets/images/` 目录下。
**赞赏码：** 把图片放到 `public/images/` 下，不需要可以删掉 `donationImage` 那行。
**社交图标：** 在 `links` 里增减，图标去 https://iconify.design/ 搜。

---

# 第二部分：常用配置

所有配置都在 `src/config.ts` 文件中。修改后保存即可看到效果。

## 1. 主题颜色

```typescript
themeColor: {
    hue: 230,     // 色相值，范围 0-360
    fixed: false, // true = 用户不能自选颜色
},
```

### 常用色相值参考

| hue 值 | 颜色 | 效果 |
|--------|------|------|
| 0 | 红色 | 热情 |
| 60 | 黄色 | 明亮 |
| 120 | 绿色 | 清新 |
| 200 | 天蓝 | 清爽 |
| 230 | 蓝紫（当前） | 稳重 |
| 270 | 紫色 | 神秘 |
| 345 | 粉色 | 可爱 |

---

## 2. 横幅图片与轮播

横幅是博客顶部的大图区域。

### 图片放在哪里

- 桌面端图片：`public/assets/desktop-banner/`
- 移动端图片：`public/assets/mobile-banner/`

图片命名建议：`1.webp`、`2.webp`、`3.webp`...

### 配置

```typescript
banner: {
    src: {
        desktop: [
            "/assets/desktop-banner/1.webp",
            "/assets/desktop-banner/2.webp",
        ],
        mobile: [
            "/assets/mobile-banner/1.webp",
            "/assets/mobile-banner/2.webp",
        ],
    },
    position: "center",   // 图片位置：top / center / bottom
    carousel: {
        enable: true,     // 是否轮播
        interval: 3,      // 轮播间隔（秒）
    },
    waves: {
        enable: true,     // 底部水波纹效果
    },
    homeText: {
        enable: true,         // 首页显示文字
        title: "Blog记录",    // ← 改成你的标题
        subtitle: [            // 轮播的副标题
            "心有山海，静而不争",
            "行稳致远，水到渠成",
        ],
        typewriter: {
            enable: true,      // 打字机效果
            speed: 100,
        },
    },
},
```

### 只想显示一张图片？

把数组改成只有一项就行：

```typescript
src: {
    desktop: ["/assets/desktop-banner/1.webp"],
    mobile: ["/assets/mobile-banner/1.webp"],
},
```

同时把 `carousel.enable` 设为 `false`。

---

## 3. 侧边栏组件

侧边栏通过 `sidebarLayoutConfig` 控制，可以决定哪些组件显示、放在左边还是右边、排序顺序。

```typescript
export const sidebarLayoutConfig: SidebarLayoutConfig = {
    position: "both",  // "both" = 左右两侧边栏, "unilateral" = 单侧

    components: [
        {
            type: "profile",       // 个人资料卡片
            enable: true,          // ← true 启用, false 关闭
            order: 1,              // 排序（数字越小越靠前）
            position: "top",       // "top" = 固定, "sticky" = 粘性
            sidebar: "left",       // "left" = 左边, "right" = 右边
            class: "onload-animation",
            animationDelay: 0,
        },
        {
            type: "announcement",  // 公告组件
            enable: true,
            order: 2,
            sidebar: "left",
            // ...
        },
        {
            type: "categories",    // 分类组件
            enable: true,
            order: 3,
            sidebar: "left",
            responsive: {
                collapseThreshold: 5,  // 超过5个分类自动折叠
            },
        },
        {
            type: "tags",          // 标签组件
            enable: true,
            order: 5,
            sidebar: "left",
            responsive: {
                collapseThreshold: 20, // 超过20个标签自动折叠
            },
        },
        {
            type: "site-stats",    // 站点统计
            enable: true,
            order: 5,
            sidebar: "right",
        },
        {
            type: "calendar",      // 日历组件
            enable: true,
            order: 6,
            sidebar: "right",
        },
    ],
};
```

### 想关闭某个组件？

把对应组件的 `enable` 改为 `false` 即可。不需要删除配置项。

### 常用操作

| 操作 | 怎么做 |
|------|--------|
| 关闭公告 | `announcement` 的 `enable` 设为 `false` |
| 关闭日历 | `calendar` 的 `enable` 设为 `false` |
| 把日历移到左边 | `calendar` 的 `sidebar` 改为 `"left"` |
| 调整排序 | 修改各组件的 `order` 值 |

---

## 4. 导航栏

```typescript
export const navBarConfig: NavBarConfig = {
    links: [
        LinkPreset.Home,     // 首页（内置）
        LinkPreset.Archive,  // 归档（内置）

        // 自定义一级菜单
        {
            name: "链接",
            url: "/links/",
            icon: "material-symbols:link",
            children: [           // 子菜单
                {
                    name: "GitHub",
                    url: "https://github.com/sttez",
                    external: true,   // 外部链接
                    icon: "fa6-brands:github",
                },
            ],
        },

        // 自定义一级菜单
        {
            name: "我的",
            url: "/content/",
            icon: "material-symbols:person",
            children: [
                {
                    name: "记录",
                    url: "/diary/",
                    icon: "material-symbols:book",
                },
                {
                    name: "相册",
                    url: "/albums/",
                    icon: "material-symbols:photo-library",
                },
            ],
        },
        // ... 更多菜单
    ],
};
```

### 添加一个新导航链接

在 `links` 数组中添加一项：

```typescript
{
    name: "工具箱",                      // 显示名称
    url: "/tools/",                      // 链接地址
    icon: "material-symbols:build",      // 图标
},
```

### 图标从哪里找？

Mizuki 使用 [Iconify](https://iconify.design/) 图标系统，可以在这里搜索图标：https://iconify.design/

搜索到图标后，复制其名称（如 `material-symbols:home`）填入 `icon` 字段。

---

## 5. 页面开关

```typescript
featurePages: {
    anime: false,     // 番剧页面
    diary: true,      // 日记页面
    friends: true,    // 友链页面
    projects: true,   // 项目页面
    skills: true,     // 技能页面
    timeline: true,   // 时间线页面
    albums: true,     // 相册页面
    devices: false,   // 设备页面
},
```

### 关闭不需要的页面

1. 把对应的值改为 `false`
2. 在导航栏中删除对应的链接

> **提示：** 关闭不在使用的页面有助于提升 SEO。

---

## 6. 评论系统

Mizuki 支持 [Twikoo](https://twikoo.js.org/) 评论系统。

```typescript
export const commentConfig: CommentConfig = {
    enable: true,    // ← 改为 true 启用
    twikoo: {
        envId: "https://你的twikoo地址",  // Twikoo 环境 ID
        lang: "zh_CN",
    },
};
```

### 启用步骤

1. 先部署一个 Twikoo 服务（参考 [Twikoo 文档](https://twikoo.js.org/)）
2. 把 `enable` 改为 `true`
3. 填入你的 Twikoo `envId`

---

## 7. 页脚

```typescript
export const footerConfig: FooterConfig = {
    enable: true,
    customHtml: "你好，欢迎阅读！",  // ← 改成你的页脚内容
};
```

支持 HTML 格式，比如放备案号：

```typescript
customHtml: "© 2026 我的博客 | <a href='https://beian.miit.gov.cn/'>京ICP备xxxxxx号</a>",
```

---

# 第三部分：内容进阶

## 1. Markdown 扩展语法

除了标准 Markdown，Mizuki 还支持以下扩展语法：

### 提示框

```markdown
> [!NOTE]
> 这是一个提示信息

> [!TIP]
> 这是一个小技巧

> [!IMPORTANT]
> 这是重要信息

> [!WARNING]
> 这是警告信息

> [!CAUTION]
> 这是危险警告
```

### 数学公式（KaTeX）

行内公式：`$E = mc^2$`

块级公式：

```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

### Mermaid 图表

```markdown
​```mermaid
graph TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作]
    B -->|否| D[另一操作]
​```
```

支持的图表类型：流程图、序列图、甘特图、类图、饼图等。

### 代码块

```markdown
​```javascript
function hello(name) {
    console.log(`Hello, ${name}!`);
}
​```
```

支持语法高亮、行号显示和一键复制。

---

## 2. 添加图片和视频

### 在文章中添加图片

1. 将图片放到 `public/images/` 目录下
2. 在文章中引用：

```markdown
![图片描述](/images/你的图片.jpg)
```

> **注意：** 路径以 `/` 开头，对应 `public/` 目录。

### 设置文章封面

在 Frontmatter 中添加：

```yaml
---
title: 我的文章
image: /images/cover.webp
---
```

如果封面图片和文章文件在同一目录，可以用相对路径：

```yaml
image: ./cover.webp
```

### 嵌入 Bilibili 视频

```html
<iframe src="//player.bilibili.com/player.html?bvid=BV1xx411c7mD"
  scrolling="no"
  border="0"
  frameborder="no"
  framespacing="0"
  allowfullscreen="true"
  width="100%"
  height="500">
</iframe>
```

### 嵌入 YouTube 视频

```html
<iframe width="560" height="315"
  src="https://www.youtube.com/embed/视频ID"
  frameborder="0"
  allowfullscreen>
</iframe>
```

### 嵌入本地视频

```html
<video controls width="100%">
  <source src="/videos/my-video.mp4" type="video/mp4">
</video>
```

---

## 3. 文章管理技巧

### 草稿

未完成的文章可以设为草稿，不会在生产环境中显示：

```yaml
---
title: 未完成的文章
draft: true
---
```

开发模式下仍然可以看到草稿文章。

### 置顶

重要文章可以置顶显示在列表最前面：

```yaml
---
title: 重要公告
pinned: true
---
```

### 分类和标签

```yaml
---
category: 技术
tags: [JavaScript, 前端, 教程]
---
```

**建议：**
- 分类用宽泛的词（技术、生活、随笔）
- 标签用具体的词（JavaScript、React、CSS）
- 每篇文章 3-5 个标签为宜

---

## 4. 添加项目

编辑 `src/data/projects.ts`，在 `projectsData` 数组中添加一个新对象：

```typescript
{
    id: "my-project",                    // 唯一标识，用英文连字符
    title: "我的项目",                    // 项目名称（文章关联时要和 project 字段一致）
    description: "这是一个很棒的项目",     // 项目简介
    image: "",                           // 项目图片路径，放 public/images/ 下
    category: "web",                     // 分类：web / mobile / desktop / other
    techStack: ["React", "TypeScript"],  // 技术栈列表
    status: "in-progress",              // 状态：completed / in-progress / planned
    liveDemo: "https://example.com",     // 在线演示地址（可选）
    sourceCode: "https://github.com/xxx", // 源码地址（可选）
    visitUrl: "https://example.com",     // 访问链接（可选）
    startDate: "2024-01-01",            // 开始日期
    endDate: "2024-06-01",              // 结束日期（进行中的项目可不填）
    featured: true,                     // 是否在首页精选展示（可选）
    tags: ["前端", "开源"],              // 标签（可选）
},
```

### 关联文章到项目

1. 在 `src/data/projects.ts` 中记下项目的 `title` 值
2. 在文章的 Frontmatter 中添加 `project` 字段，值必须和 `title` 完全一致：

```yaml
---
title: 我的项目开发记录
project: 我的项目
category: 技术
tags: [React, TypeScript]
---
```

3. 项目详情页会自动按分类（技术、指南、踩坑）展示关联的文章

---

## 5. 修改技能页

编辑 `src/data/skills.ts`，在 `skillsData` 数组中添加或修改技能项：

```typescript
{
    id: "react",                         // 唯一标识
    name: "React",                       // 技能名称
    description: "前端 UI 开发框架",       // 简介
    icon: "logos:react",                 // Iconify 图标名称
    category: "frontend",                // 分类：frontend / backend / database / tools / other
    level: "advanced",                   // 水平：beginner / intermediate / advanced / expert
    experience: { years: 2, months: 6 }, // 经验时长
    projects: ["mizuki-blog"],           // 关联的项目 ID（可选）
    color: "#61DAFB",                    // 卡片主题色（可选）
},
```

### 图标怎么选

访问 https://iconify.design/ 搜索图标，复制名称（如 `logos:react`、`logos:python`、`skill-icons:git`）填入 `icon` 字段。

### 技能分类

| category | 说明 |
|----------|------|
| `frontend` | 前端技术 |
| `backend` | 后端技术 |
| `database` | 数据库 |
| `tools` | 开发工具 |
| `other` | 其他 |

---

## 6. 修改关于页面

编辑 `src/content/spec/about.md`，直接写 Markdown 内容即可：

```markdown
# 关于我

你好，我是 xxx，一名热爱技术的开发者。

## 我的技能

- 前端开发：React、Vue、TypeScript
- 后端开发：Node.js、Python

## 联系方式

- GitHub: https://github.com/xxx
- Email: xxx@example.com
```

保存后刷新浏览器即可看到更新。

---

## 7. 修改个人简介

编辑 `src/config.ts` 中的 `profileConfig`：

```typescript
export const profileConfig: ProfileConfig = {
    avatar: "assets/images/avatar.webp",  // 头像（图片放 src/assets/images/ 下）
    name: "你的昵称",                      // 显示名称
    bio: "一句话介绍自己",                  // 个人简介
    typewriter: {
        enable: true,                      // 打字机效果
        speed: 80,                         // 打字速度（毫秒）
    },
    links: [
        {
            name: "Bilibili",
            icon: "fa6-brands:bilibili",    // B站图标
            url: "https://space.bilibili.com/你的UID",
        },
        {
            name: "GitHub",
            icon: "fa6-brands:github",
            url: "https://github.com/你的用户名",
        },
        {
            name: "Email",
            icon: "material-symbols:mail",
            url: "mailto:你的邮箱@example.com",
        },
    ],
    donationImage: "/images/donate.webp",  // 赞赏码（图片放 public/images/ 下）
    donationTitle: "赏个鸡腿",              // 点击赞赏图标后显示的标题
};
```

### 各字段说明

| 字段 | 说明 |
|------|------|
| `avatar` | 头像图片，放 `src/assets/images/` 下 |
| `name` | 侧边栏显示的名字 |
| `bio` | 一句话简介，支持打字机效果 |
| `links` | 社交链接图标，点击跳转 |
| `donationImage` | 赞赏码图片路径，放 `public/images/` 下，不想要可以删掉这行 |
| `donationTitle` | 点击赞赏图标弹窗里显示的标题 |

### 怎么加减社交图标？

在 `links` 数组里增减对象即可。图标名称去 https://iconify.design/ 搜索复制。

### 怎么关闭赞赏码？

删掉 `donationImage` 和 `donationTitle` 两行，或者把 `donationImage` 改为空字符串 `""`。

---

## 8. 页面调整总览

博客有很多页面，你可以按需开关和调整。

### 开关页面

编辑 `src/config.ts` 中的 `featurePages`：

```typescript
featurePages: {
    anime: false,     // 番剧页面  ← true 开启，false 关闭
    diary: true,      // 日记页面
    friends: true,    // 友链页面
    projects: true,   // 项目页面
    skills: true,     // 技能页面
    timeline: true,   // 时间线页面
    albums: true,     // 相册页面
    devices: false,   // 设备页面
},
```

把不需要的页面改成 `false` 即可。

### 关闭页面后还要做什么？

1. 把上面的值改为 `false`
2. 在导航栏配置中删除对应的菜单链接（见下面）

### 调整导航栏菜单

编辑 `src/config.ts` 中的 `navBarConfig`：

```typescript
export const navBarConfig: NavBarConfig = {
    links: [
        LinkPreset.Home,     // 首页（内置，保留）
        LinkPreset.Archive,  // 归档（内置，保留）

        // 自定义菜单：按需增减
        {
            name: "项目",
            url: "/projects/",
            icon: "material-symbols:work",
        },
        {
            name: "技能",
            url: "/skills/",
            icon: "material-symbols:code",
        },
        {
            name: "友链",
            url: "/links/",
            icon: "material-symbols:link",
        },
        // 想加子菜单？用 children：
        {
            name: "我的",
            url: "/content/",
            icon: "material-symbols:person",
            children: [
                {
                    name: "记录",
                    url: "/diary/",
                    icon: "material-symbols:book",
                },
                {
                    name: "相册",
                    url: "/albums/",
                    icon: "material-symbols:photo-library",
                },
            ],
        },
    ],
};
```

**增减菜单：** 在 `links` 数组里增减对象。
**外部链接：** 加 `external: true`，如 `{ name: "GitHub", url: "https://github.com/xxx", external: true, icon: "fa6-brands:github" }`。

### 图标从哪里找？

去 https://iconify.design/ 搜索，复制图标名称填入 `icon` 字段。

---

### 其他数据文件一览

| 页面 | 数据文件 | 说明 |
|------|---------|------|
| 友链 | `src/data/friends.ts` | 添加友情链接 |
| 日记 | `src/data/diary.ts` | 写日记条目 |
| 时间线 | `src/data/timeline.ts` | 个人经历时间线 |
| 相册 | `src/data/albums.ts` | 照片相册 |
| 设备 | `src/data/devices.ts` | 设备展示 |

每个文件都有 TypeScript 接口定义字段，照着已有的数据格式添加即可。

---

# 第四部分：部署上线

## 1. Vercel 部署（推荐）

1. 把代码推送到 GitHub
2. 访问 [vercel.com](https://vercel.com)，点击 **Import Git Repository**
3. 选择你的仓库
4. Framework 选择 **Astro**，其余保持默认
5. 点击 **Deploy**

Vercel 会自动检测到项目配置（`vercel.json`），无需额外设置。

每次推送到 GitHub 都会自动重新部署。

---

## 2. Netlify 部署

1. 把代码推送到 GitHub
2. 访问 [netlify.com](https://www.netlify.com)，点击 **Add new site** → **Import an existing project**
3. 选择你的仓库
4. 构建设置：
   - Build command: `pnpm build`
   - Publish directory: `dist`
5. 点击 **Deploy**

---

## 3. GitHub Pages 部署

项目已配置 GitHub Actions，推送到 `main` 分支会自动构建和部署。

1. 把代码推送到 GitHub
2. 进入仓库 **Settings** → **Pages**
3. Source 选择 **Deploy from a branch** → `pages` / `root`
4. 等待 Actions 完成

> **详细部署说明：** 参考 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

# 附录

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动本地开发服务器（http://localhost:4321） |
| `pnpm build` | 构建生产版本（输出到 `dist/`） |
| `pnpm preview` | 本地预览构建结果 |
| `pnpm new-post 文件名` | 创建新文章 |
| `pnpm check` | 检查代码错误 |
| `pnpm format` | 格式化代码 |

---

## 常见问题 FAQ

### 文章不显示？

检查清单：
- [ ] 文件在 `src/content/posts/` 目录下
- [ ] 文件扩展名是 `.md`
- [ ] Frontmatter 格式正确（`---` 包裹）
- [ ] `draft` 字段不是 `true`
- [ ] `published` 日期已到

### 图片不显示？

检查清单：
- [ ] 图片在 `public/` 目录下
- [ ] 路径以 `/` 开头
- [ ] 文件名区分大小写

### 修改配置后没效果？

- 保存文件后等开发服务器自动刷新
- 如果没刷新，手动刷新浏览器（Ctrl+F5）
- 检查是否有语法错误（终端会报错）

### 构建失败？

- 运行 `pnpm check` 检查错误
- 检查 `src/config.ts` 是否有语法错误
- 检查文章的 Frontmatter 格式是否正确

### 如何修改字体？

在 `src/config.ts` 中找到 `font` 配置：

```typescript
font: {
    asciiFont: {
        fontFamily: "ZenMaruGothic-Medium",  // 英文字体
        fontWeight: "400",
        localFonts: ["ZenMaruGothic-Medium.ttf"],  // 字体文件名
        enableCompress: true,
    },
    cjkFont: {
        fontFamily: "微软雅黑",               // 中文字体
        fontWeight: "500",
        localFonts: ["微软雅黑.ttf"],
        enableCompress: true,
    },
},
```

字体文件放在 `public/assets/font/` 目录下。

### 如何自定义 CSS？

1. 在 `src/styles/` 目录下创建 `custom.css`
2. 写入你的自定义样式
3. 在 `src/styles/main.css` 开头添加 `@import "custom.css";`

---

> 本指南基于 Mizuki v7.6.5 编写，已适配项目分类、技能展示等功能。如有问题，请参考项目 [GitHub Issues](https://github.com/matsuzaka-yuki/Mizuki/issues)。
