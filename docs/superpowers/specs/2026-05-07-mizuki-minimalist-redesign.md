# MIZUKI 极简风格改造设计

日期：2026-05-07
状态：待审批

## 目标

将 MIZUKI 个人网站从花哨风格改为极简风格，减少视觉噪音，保留核心功能。

## 一、页面精简

### 保留页面（5 个）

| 页面 | 路由 | 说明 |
|------|------|------|
| 文章 | `/` (首页) | 文章列表，分页 |
| 文章详情 | `/posts/[slug]` | 单篇文章 |
| 项目 | `/projects` | 项目展示 |
| 关于 | `/about` | 个人简历、技能介绍 |
| 技能 | `/skills` | 技术栈展示 |
| 友链 | `/friends` | 外部链接（GitHub、Bilibili 等） |

### 移除页面（4 个）

| 页面 | 路由 | 操作 |
|------|------|------|
| 日记 | `/diary` | 删除页面文件，config 中禁用 |
| 相册 | `/albums/*` | 删除页面文件和目录，config 中禁用 |
| 时间线 | `/timeline` | 删除页面文件，config 中禁用 |
| 归档 | `/archive` | 删除页面文件，config 中禁用（与文章列表功能重复） |

## 二、导航栏

- 5 个链接一字平铺：`Mizuki | 文章 | 项目 | 关于 | 技能 | 友链`
- 去掉下拉菜单分组，改为直接平铺
- 右侧保留：搜索按钮、暗色/亮色切换
- 移动端：超出部分折叠为汉堡菜单

## 三、首页布局

- **Banner 区**：保留图片 Banner + 波浪动画 + 打字机效果
- **内容区**：左侧边栏 + 右侧文章列表（保持现有左右布局）
- **首页 Hero**：Banner 区内展示站名、一句话简介、社交链接图标

## 四、字体

- 移除 3 个自定义 `@font-face`（ZenMaruGothic、微软雅黑 woff2、萝莉体）
- 移除 `@fontsource/roboto` 依赖
- 改用系统字体栈：`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`
- 代码字体保留 JetBrains Mono（用于代码块渲染）

## 五、动效与动画

### 移除

- **Swup 页面过渡**：卸载 `@swup/astro` 集成，删除 `transition.css`
- **入场动画**：删除 `animation-enhancements.css`（fade-in、card-animation、sidebar-animate 等）
- **面板动画**：删除 `panel-animations.css`
- **自定义滚动条**：删除 `CustomScrollbar.astro` 组件引用，移除 `overlayscrollbars` 依赖，删除 `scrollbar.css`
- **渐变按钮动画**：删除 `gradient-buttons.css` 中的过渡效果，改为静态样式

### 保留

- Banner 图片轮播 + 波浪 SVG 动画
- 打字机效果（首页 banner 和简介）
- 暗色/亮色主题切换（保留 View Transitions API 用于主题切换）
- 基础 hover 效果（链接下划线、按钮状态）

## 六、侧边栏 Widget

### 保留（左侧边栏）

- 个人简介卡片（头像、名字、简介、社交链接）
- 文章分类
- 标签云

### 移除

- 公告栏
- 项目卡片（项目页已有完整展示）
- 站点统计
- 日历
- 右侧边栏整体移除（TOC 改为浮动按钮模式）

## 七、布局组件变更

- `MainGridLayout.astro`：移除右侧边栏，改为单侧边栏（左）+ 内容区
- `SideBar.astro`：只渲染 Profile、Categories、Tags 三个 widget
- `RightSideBar.astro`：不再使用
- TOC 改为 `FloatingTOC` 浮动按钮模式（文章详情页）
- 移动端侧边栏：改为可折叠面板

## 八、依赖清理

### 移除

- `@swup/astro` — Swup 页面过渡
- `overlayscrollbars` — 自定义滚动条
- `@fontsource/roboto` — Roboto 字体
- `@fancyapps/ui` — Fancybox 灯箱（如无文章使用）
- `photoswipe` — 图片画廊（如无文章使用）

### 保留

- `astro` + `@astrojs/svelte` + `@astrojs/tailwind` — 核心框架
- `@astrojs/sitemap` — 站点地图
- `astro-icon` — 图标系统
- `astro-expressive-code` — 代码高亮
- `@fontsource-variable/jetbrains-mono` — 代码字体
- `@tailwindcss/typography` — Markdown 排版
- `pagefind` — 全文搜索

## 九、样式文件清理

### 删除

- `transition.css`
- `animation-enhancements.css`
- `panel-animations.css`
- `gradient-buttons.css`（或简化为无动画版本）
- `scrollbar.css`
- `wallpaper-navbar-transparent.css`（壁纸模式移除后不再需要）
- `mobile-transition-fix.css`

### 保留

- `main.css`（移除 @font-face 声明）
- `markdown.css`
- `expressive-code.css`
- `mobile-navbar.css`
- `mobile-post-list-fix.css`
- `widget-responsive.css`

## 十、配置变更（config.ts）

```typescript
// 禁用页面
featurePages: {
  diary: false,
  albums: false,
  timeline: false,
  // archive 不在 featurePages 中，直接删除页面文件
  friends: true,
  projects: true,
  skills: true,
}

// 字体改为系统默认
font: {
  asciiFont: { fontFamily: 'system-ui', enableCompress: false },
  cjkFont: { fontFamily: 'system-ui', enableCompress: false },
}

// 侧边栏改为单侧（左）
sidebarLayoutConfig: {
  position: 'left',
  // 左侧：profile, categories, tags
  // 右侧：无
}

// 关闭壁纸模式切换
wallpaperMode: { defaultMode: 'banner', showModeSwitchOnMobile: 'none' }
```

## 十一、实现顺序

1. 配置变更（config.ts）— 禁用页面、字体、侧边栏
2. 删除不需要的页面文件
3. 简化导航栏（Navbar.astro）— 去掉下拉，改为平铺
4. 移除 Swup 集成和过渡动画
5. 移除入场动画 CSS
6. 移除自定义滚动条
7. 简化侧边栏 widget
8. 移除自定义字体
9. 清理依赖（package.json）
10. 验证所有页面功能正常
