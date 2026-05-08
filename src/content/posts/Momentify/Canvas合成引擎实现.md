---
title: "Canvas 合成引擎实现"
published: 2026-04-05
tags: [Flutter, Dart, CustomPainter, Canvas]
category: 技术
project: Momentify
draft: false
description: "Stack 分层渲染、手势交互与图片组合的核心实现"
author: sttez
sourceLink: "https://github.com/sttez/Momentify"
---

# Canvas 合成引擎实现

## 架构

CanvasComposer 是整个编辑器的核心。它不是一个真正的 Canvas 绘制，而是一个**分层的 Stack**，每一层负责一种视觉元素：

```
Stack
├── 白色背景
├── 图片槽位层（每个槽位一个 Positioned + Transform 链）
├── 装饰层（边框、阴影、撕纸遮罩、裂纹叠加）
├── 文字覆盖层（可拖拽的 TextOverlay）
└── 贴纸覆盖层（可拖拽的 StickerOverlay）
```

## 图片槽位渲染

每个图片槽位根据 `LayoutSlot` 的相对坐标进行定位，内部用 Transform 链实现交互：

```dart
Positioned(
  left: slot.x * canvasWidth,
  top: slot.y * canvasHeight,
  width: slot.width * canvasWidth,
  height: slot.height * canvasHeight,
  child: Transform.rotate(
    angle: slotState.rotation,
    child: Transform.translate(
      offset: slotState.offset,
      child: Transform.scale(
        scale: slotState.scale,
        child: ColorFiltered(
          colorFilter: ColorFilter.matrix(slotState.filterMatrix),
          child: Image.file(File(slotState.imagePath), fit: BoxFit.cover),
        ),
      ),
    ),
  ),
)
```

Transform 的顺序很重要：先旋转，再平移，再缩放，最后应用滤镜。这个顺序保证手势操作的直觉正确——拖拽是平移，捏合是缩放。

## 手势交互

每个槽位套一个 `GestureDetector`，用 `onScaleStart` / `onScaleUpdate` 同时处理拖拽和缩放：

```dart
GestureDetector(
  onScaleStart: (details) { ... },
  onScaleUpdate: (details) {
    setState(() {
      slotState.offset += details.focalPointDelta;
      slotState.scale *= details.scale;
    });
  },
)
```

Flutter 的 Scale 手势把拖拽和捏合统一了：单指时 `details.scale` 为 1.0，只有 `focalPointDelta` 有效；双指时两者都有效。

## 导出

`CanvasExporter` 通过 `RepaintBoundary` 把 Widget 树渲染成图片：

```dart
final boundary = repaintBoundaryKey.currentContext!
    .findRenderObject() as RenderRepaintBoundary;
final image = await boundary.toImage(pixelRatio: 2.0);
final byteData = await image.toByteData(format: ImageByteFormat.png);
```

2x 像素比保证在高分屏上导出的图片足够清晰。九宫格切割用 `ui.PictureRecorder` 把源图片裁成 9 个等分单元。
