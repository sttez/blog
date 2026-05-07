# Mizuki Blog

基于 [Mizuki](https://github.com/matsuzaka-yuki/Mizuki) 主题的个人博客，使用 [Astro](https://astro.build/) 构建。

**站点地址：** https://zhh-blog.netlify.app/

## 技术栈

- **框架：** Astro 5 + Svelte
- **样式：** Tailwind CSS
- **包管理：** pnpm
- **部署：** Netlify

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器 (http://localhost:4321)
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

## 项目结构

```
├── src/
│   ├── config.ts           # 博客配置（主题、导航栏、侧边栏等）
│   ├── content/posts/      # 博客文章（Markdown）
│   ├── content/spec/       # 特殊页面（关于、友链）
│   ├── data/               # 页面数据（项目、技能、友链）
│   ├── pages/              # 页面路由
│   ├── components/         # 组件
│   └── styles/             # 样式
├── public/
│   ├── assets/banner/      # 横幅图片
│   └── images/             # 图片资源
└── Mizuki博客新手指南.md    # 使用指南
```

## 写文章

在 `src/content/posts/` 下新建 `.md` 文件：

```yaml
---
title: 文章标题
published: 2026-05-08
description: 文章描述
category: 技术          # 技术 / 指南 / 踩坑
tags: [标签1, 标签2]
draft: false
---

正文内容...
```

或使用命令：`pnpm new-post 文章名`

## 配置

所有配置集中在 `src/config.ts`：

| 配置项 | 说明 |
|--------|------|
| `siteConfig` | 站点标题、URL、时区 |
| `themeColor` | 主题色 |
| `banner` | 横幅图片与轮播 |
| `navBarConfig` | 导航栏链接 |
| `profileConfig` | 个人简介、头像、社交链接 |
| `sidebarLayoutConfig` | 侧边栏组件布局 |
| `featurePages` | 页面开关 |

详细说明见 [Mizuki博客新手指南.md](./Mizuki博客新手指南.md)。

## 部署

推送到 GitHub 后，Netlify 会自动构建并部署。

- Build command: `pnpm build`
- Publish directory: `dist`

## License

基于 [Mizuki](https://github.com/matsuzaka-yuki/Mizuki) 主题，遵循原项目 MIT 许可证。
