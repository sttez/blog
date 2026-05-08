---
title: "首页模板库的 UI 设计与动画"
published: 2026-04-18
tags: [Flutter, Dart, UI设计, 动画, Sliver]
category: 指南
project: Momentify
draft: false
description: "CustomScrollView + SliverGrid + 渐入动画打造模板浏览体验"
author: sttez
sourceLink: "https://github.com/sttez/Momentify"
---

# 首页模板库的 UI 设计与动画

## 页面结构

首页用 `CustomScrollView` 组合多个 Sliver，从上到下依次是：

1. **Hero Header**：渐变背景 + 应用名称 + 快捷操作卡片
2. **分类筛选栏**：水平滚动的 FilterChip 列表
3. **模板网格**：2 列的 SliverGrid

```dart
CustomScrollView(
  slivers: [
    SliverToBoxAdapter(child: _buildHeroHeader()),
    SliverToBoxAdapter(child: _buildCategoryFilter()),
    SliverPadding(
      padding: EdgeInsets.all(16),
      sliver: SliverGrid(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.75,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) => _buildTemplateCard(templates[index]),
          childCount: templates.length,
        ),
      ),
    ),
  ],
)
```

## 分类筛选

FilterChip 用枚举驱动，选中后过滤模板列表：

```dart
Wrap(
  spacing: 8,
  children: TemplateCategory.values.map((cat) {
    return FilterChip(
      label: Text(cat.label),
      selected: _selectedCategory == cat,
      onSelected: (selected) {
        setState(() {
          _selectedCategory = selected ? cat : null;
          _filteredTemplates = selected
              ? templates.where((t) => t.category == cat).toList()
              : templates;
        });
      },
    );
  }).toList(),
)
```

## 卡片入场动画

模板卡片使用 `AnimationController` + `CurvedAnimation` 实现逐个渐入：

```dart
class _TemplateCardState extends State<_TemplateCard>
    with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(
    vsync: this,
    duration: Duration(milliseconds: 400),
  );
  late final _animation = CurvedAnimation(
    parent: _controller,
    curve: Curves.easeOutCubic,
  );

  @override
  void initState() {
    super.initState();
    // 延迟触发，每张卡片错开 50ms
    Future.delayed(Duration(milliseconds: widget.index * 50), () {
      _controller.forward();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _animation,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: Offset(0, 0.1),
          end: Offset.zero,
        ).animate(_animation),
        child: _buildCardContent(),
      ),
    );
  }
}
```

效果是卡片从下方渐入，依次出现，给人一种"内容在加载"的感觉。

## 卡片上的网格纹理

每个模板卡片用 `_GridPainter` 叠加一层半透明的白色网格纹理，增加视觉层次感：

```dart
CustomPaint(
  painter: _GridPainter(),
  child: ClipRRect(...), // 模板封面图
)
```

网格线用 0.05 透明度的白色绘制，间距 20px，在深色模板封面上若隐若现。
