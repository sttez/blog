---
title: "CustomPainter 画出碎裂裂纹效果"
published: 2026-04-06
tags: [Flutter, Dart, CustomPainter, 动画]
category: 技术
project: Momentify
draft: false
description: "三种裂纹风格的程序化生成：蛛网碎裂、爆炸碎片、拼图块"
author: sttez
sourceLink: "https://github.com/sttez/Momentify"
---

# CustomPainter 画出碎裂裂纹效果

## 三种裂纹风格

碎裂模板需要在图片上叠加裂纹效果。CrackPainter 支持三种风格：

| 风格 | 效果 | 适用场景 |
|------|------|---------|
| glass | 蛛网状放射裂纹，带辉光 | 玻璃碎裂感 |
| explode | 碎片位移 + 阴影 | 冲击力强的场景 |
| puzzle | 贝塞尔曲线连接的拼图块 | 趣味拼图感 |

## 程序化生成

所有裂纹用**种子随机**生成，保证同一模板每次渲染效果一致：

```dart
final random = Random(seed);
```

### 玻璃裂纹

从中心点向外放射生成裂纹主干，每条主干随机分叉：

```dart
void _drawGlassCrack(Canvas canvas, Size size, Random random) {
  final center = Offset(size.width / 2, size.height / 2);
  final paint = Paint()
    ..style = PaintingStyle.stroke
    ..strokeWidth = 1.5
    ..maskFilter = MaskFilter.blur(BlurStyle.outer, 2); // 辉光效果

  for (int i = 0; i < mainCracks; i++) {
    final angle = random.nextDouble() * 2 * pi;
    final path = Path()..moveTo(center.dx, center.dy);
    // 随机长度和方向的线段组成裂纹
    ...
    canvas.drawPath(path, paint);
  }
}
```

`MaskFilter.blur` 给裂纹加上外发光，在深色图片上效果很明显。

### 爆炸碎片

在裂纹基础上，给每个碎片区域加上位移阴影：

```dart
final shadowPaint = Paint()
  ..color = Colors.black.withOpacity(0.3)
  ..maskFilter = MaskFilter.blur(BlurStyle.normal, 4);
canvas.drawPath(fragmentPath, shadowPaint);
```

### 拼图块

用二次贝塞尔曲线连接随机分割点，模拟拼图块边缘：

```dart
path.quadraticBezierTo(controlPoint.dx, controlPoint.dy, endPoint.dx, endPoint.dy);
```

## 配置模型

`CrackConfig` 封装了每种风格的参数：

```dart
class CrackConfig {
  final CrackStyle style;       // glass / explode / puzzle
  final int crackCount;         // 裂纹数量
  final int seed;               // 随机种子
  final double intensity;       // 强度系数
}
```

模板仓库中预设了三个配置，用户切换模板时自动应用对应的裂纹参数。
