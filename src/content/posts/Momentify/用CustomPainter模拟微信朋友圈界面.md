---
title: "用 CustomPainter 模拟微信朋友圈界面"
published: 2026-04-09
tags: [Flutter, Dart, CustomPainter, UI还原]
category: 技术
project: Momentify
draft: false
description: "纯代码绘制朋友圈截图，不依赖任何图片资源"
author: sttez
sourceLink: "https://github.com/sttez/Momentify"
---

# 用 CustomPainter 模拟微信朋友圈界面

## 为什么自己画

有些模板需要把图片嵌入到"假装在发朋友圈"的场景中。直接用截图素材会有两个问题：分辨率不固定、适配困难。用 CustomPainter 纯代码绘制，可以精确控制每个元素的位置和大小。

## 绘制内容

`WeChatBgPainter` 绘制一个完整的朋友圈界面：

1. **状态栏**：时间、信号、WiFi、电量图标
2. **导航栏**：返回箭头 + "朋友圈"标题
3. **封面区域**：渐变色背景
4. **头像 + 昵称**：圆形头像占位 + 文字
5. **五条动态**：每条有头像、昵称、文字、时间、缩略图区域
6. **底部 Tab 栏**：微信经典的四个 Tab

## 关键绘制代码

```dart
// 状态栏
canvas.drawRect(
  Rect.fromLTWH(0, 0, size.width, statusBarHeight),
  Paint()..color = Colors.white,
);

// "朋友圈"标题
final titlePainter = TextPainter(
  text: TextSpan(
    text: '朋友圈',
    style: TextStyle(color: Colors.black, fontSize: 17, fontWeight: FontWeight.w600),
  ),
  textDirection: TextDirection.ltr,
)..layout();
titlePainter.paint(canvas, Offset(centerX - titlePainter.width / 2, ...));

// 动态条目
for (int i = 0; i < 5; i++) {
  // 头像圆
  canvas.drawCircle(avatarOffset, 20, avatarPaint);
  // 昵称
  // 文字内容
  // 时间
  // 缩略图占位
}
```

## 随机化

为了让每次生成的朋友圈看起来不同，昵称、文字、时间都从预设列表中随机选取：

```dart
final names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
final texts = ['周末好天气', '打卡新店', '旅行日记', ...];
final times = ['2小时前', '昨天', '3天前', '一周前'];
```

用 `Random(seed)` 保证同一模板的随机结果可复现。

## 与画布集成

在 CanvasComposer 中，微信背景作为一个装饰层渲染在图片槽位下方。用户的真实图片会覆盖在模拟界面的"缩略图区域"上，形成"图片嵌入朋友圈"的视觉效果。
