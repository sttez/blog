---
title: "Riverpod 实现跨页面状态共享"
published: 2026-04-03
tags: [Flutter, Dart, Riverpod, 状态管理]
category: 技术
project: Momentify
draft: false
description: "用 StateProvider 在图片选择、编辑、标记、导出四个页面间传递数据"
author: sttez
sourceLink: "https://github.com/sttez/Momentify"
---

# Riverpod 实现跨页面状态共享

## 问题

Momentify 的用户流程是：选模板 → 选图片 → 编辑 → 导出。这条链路上有四个页面需要共享数据——选中的图片列表、当前模板、前景蒙版、导出结果。页面之间没有父子关系，不能通过构造函数传参。

## 方案：全局 StateProvider

用 Riverpod 的 `StateProvider` 定义四个全局状态：

```dart
// 选中的图片
final selectedImagesProvider = StateProvider<List<XFile>>((ref) => []);

// 当前模板
final selectedTemplateProvider = StateProvider<TemplateModel?>((ref) => null);

// 3D 效果的前景蒙版
final foregroundMaskProvider = StateProvider<Uint8List?>((ref) => null);

// 导出的画布图片
final exportedImageProvider = StateProvider<Uint8List?>((ref) => null);
```

## 数据流

```
HomePage          →  写入 selectedTemplateProvider
PickerPage        →  读取模板约束，写入 selectedImagesProvider
MarkerPage        →  读取选中图片，写入 foregroundMaskProvider
EditorPage        →  读取全部三个，组合渲染
ExportPage        →  读取 exportedImageProvider，展示和保存
```

关键点是 **MarkerPage → EditorPage 的蒙版传递**。3D 爆破效果需要用户在标记页用画笔标注前景区域，编辑页读取这个蒙版图片叠加到画布上。用 `Uint8List` 存储蒙版的 PNG 编码，两个页面通过 Provider 解耦。

## 为什么不选其他方案

| 方案 | 缺点 |
|------|------|
| InheritedWidget | 样板代码多，不适合简单的跨页共享 |
| Bloc | 对这个体量来说太重了，不需要事件驱动 |
| GetX | 响应式 API 不够类型安全 |
| Provider (原版) | Riverpod 是它的进化版，没有理由用旧版 |

## 注意事项

- `StateProvider` 适合单一状态值。如果后续需要管理编辑器的复杂状态（多个槽位的偏移/缩放/滤镜），可以升级到 `StateNotifierProvider`
- 图片数据（`XFile`、`Uint8List`）不适合长期持有，导出完成后应该及时释放
- 模板数据是不可变的，用 `final` 保证不会被意外修改
