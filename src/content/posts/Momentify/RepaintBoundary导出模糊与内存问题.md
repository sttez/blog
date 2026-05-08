---
title: "RepaintBoundary 导出踩坑：模糊与内存"
published: 2026-04-13
tags: [Flutter, Dart, RepaintBoundary, 性能优化, 踩坑]
category: 踩坑
project: Momentify
draft: false
description: "导出图片模糊、内存溢出和异步时序问题的排查过程"
author: sttez
sourceLink: "https://github.com/sttez/Momentify"
---

# RepaintBoundary 导出踩坑：模糊与内存

## 坑一：导出图片模糊

第一版直接用 `pixelRatio: 1.0` 导出，结果在高分屏上图片只有屏幕分辨率的一半。

修复方案：用设备像素比：

```dart
final deviceRatio = MediaQuery.of(context).devicePixelRatio;
final image = await boundary.toImage(pixelRatio: deviceRatio);
```

但更稳妥的做法是固定用 `2.0`——这样在所有设备上导出的图片至少是 2x 分辨率，且文件大小可控。

## 坑二：toImage 内存爆炸

画布上有大量图层时（9 张大图 + 多个装饰层），`toImage()` 可能分配数百 MB 内存导致 OOM。

优化策略：

1. **限制画布尺寸**：不要用屏幕实际尺寸做画布，而是用固定的逻辑尺寸（如 1080×1080），通过 `Transform.scale` 适配屏幕
2. **分步导出**：先导出背景层，再叠加前景层，避免一次性渲染所有内容
3. **及时释放**：导出完成后调用 `image.dispose()` 释放底层 GPU 纹理

```dart
Future<Uint8List?> export() async {
  final image = await boundary.toImage(pixelRatio: 2.0);
  final byteData = await image.toByteData(format: ImageByteFormat.png);
  image.dispose(); // 关键：释放 GPU 纹理
  return byteData?.buffer.asUint8List();
}
```

## 坑三：异步时序

`toImage()` 是异步的。如果用户在导出过程中又修改了画布（拖动图片、切换滤镜），导出的结果可能和预期不一致。

解决方案：导出时显示 loading 状态，禁止画布交互：

```dart
setState(() => _isExporting = true);
try {
  final bytes = await _exporter.export();
  // 导航到导出页
} finally {
  setState(() => _isExporting = false);
}
```

## 坑四：StatefulShellRoute 中的 GlobalKey

GoRouter 的 `StatefulShellRoute` 会缓存页面。如果 ExportPage 用了 `GlobalKey` 持有 `RepaintBoundary`，切换 Tab 再回来时 key 可能指向已经被 dispose 的 RenderObject。解决方法是每次进入 ExportPage 时重新捕获引用。
