---
title: "ColorFilter 矩阵实现滤镜系统"
published: 2026-04-08
tags: [Flutter, Dart, 图像处理, 滤镜]
category: 技术
project: Momentify
draft: false
description: "4×5 颜色矩阵实现六种滤镜效果的原理与实践"
author: sttez
sourceLink: "https://github.com/sttez/Momentify"
---

# ColorFilter 矩阵实现滤镜系统

## 颜色矩阵原理

Flutter 的 `ColorFilter.matrix()` 接受一个 4×5 的浮点数矩阵，对每个像素的 RGBA 值做线性变换：

```
R' = a1*R + a2*G + a3*B + a4*A + a5
G' = b1*R + b2*G + b3*B + b4*A + b5
B' = c1*R + c2*G + c3*B + c4*A + c5
A' = d1*R + d2*G + d3*B + d4*A + d5
```

单位矩阵（不做任何变换）是：

```
[1,0,0,0,0,
 0,1,0,0,0,
 0,0,1,0,0,
 0,0,0,1,0]
```

## 六种预设滤镜

| 滤镜 | 实现方式 |
|------|---------|
| 原始 | 单位矩阵 |
| 灰度 | 用亮度系数对 RGB 三通道加权：`0.2126R + 0.7152G + 0.0722B` |
| 暖色 | 红色通道 ×1.1，蓝色通道 ×0.9 |
| 冷色 | 红色通道 ×0.9，蓝色通道 ×1.1 |
| 复古 | 降低饱和度 + 叠加暖色调 |
| 明亮 | RGB 三通道各加 0.1 的偏移量 |

## 灰度矩阵示例

```dart
static const grayscale = FilterPreset(
  name: '灰度',
  matrix: [
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0,      0,      0,      1, 0,
  ],
);
```

前三行相同，把 RGB 都映射到亮度值。第四行保持 Alpha 不变。

## 应用到画布

在 CanvasComposer 中，每个图片槽位用 `ColorFiltered` 包裹：

```dart
ColorFiltered(
  colorFilter: ColorFilter.matrix(slotState.filterMatrix),
  child: Image.file(File(slotState.imagePath)),
)
```

`ColorFiltered` 是一个 Widget，它在绘制子 Widget 时应用颜色矩阵。性能开销很小，因为矩阵运算是 GPU 友好的。

## 滤镜选择器

底部弹出的 `FilterSelector` 是一个水平滚动列表，每项显示滤镜名称和预览色块。选中后更新 `SlotState` 的 `filterMatrix` 字段，CanvasComposer 自动重绘对应的槽位。

矩阵滤镜的好处是**零额外依赖**，纯 Flutter Canvas 能力就能实现，不需要引入任何图片处理库。
