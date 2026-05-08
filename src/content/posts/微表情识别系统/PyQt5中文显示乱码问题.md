---
title: "PyQt5 中文显示乱码问题"
published: 2025-04-10
tags: [PyQt5, 中文, 字体, 踩坑, Python]
pinned: false
description: "PyQt5 界面上的中文显示为方框或乱码，OpenCV 不支持中文绘制，用 PIL 绘图解决。"
category: 踩坑
project: 微表情识别系统
draft: false
author: sttez
---

# PyQt5 中文显示乱码问题

## 问题

PyQt5 桌面应用需要在视频画面上绘制中文标签（"惊讶"、"压抑"、"高兴"等），但 `cv2.putText` 不支持中文——显示出来的全是方框：

```python
# 这样写中文是不行的
cv2.putText(frame, "惊讶", (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
# 输出: □□
```

## 原因

OpenCV 的 `putText` 函数底层用的是 Hershey 字体，只支持 ASCII 字符。中文需要 TrueType 字体才能渲染，而 OpenCV 没有这个能力。

PyQt5 的 QLabel 可以显示中文，但问题是我们需要在视频帧上实时绘制中文标签，不能只靠 QLabel。

## 解决方案：PIL 绘制中文

用 PIL（Pillow）的 `ImageDraw` 和 `ImageFont` 替代 OpenCV 的 `putText`：

```python
from PIL import Image, ImageDraw, ImageFont

# 将 OpenCV 图像转为 PIL 图像
disp_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
pil_img = Image.fromarray(disp_rgb)
draw = ImageDraw.Draw(pil_img)

# 加载中文字体
try:
    font = ImageFont.truetype(font_path, 20)
except IOError:
    font = ImageFont.load_default()

# 绘制中文
draw.text((x, y - 10), "惊讶 (surprise) [95.2%]", font=font, fill=(0, 255, 0))

# 转回 OpenCV 格式
frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
```

关键步骤：BGR→RGB→PIL→绘制→RGB→BGR。因为 OpenCV 用 BGR，PIL 用 RGB，两边要转来转去。

## 字体路径

Windows 上的中文字体一般在：

```
C:\Windows\Fonts\msyh.ttc      # 微软雅黑
C:\Windows\Fonts\simhei.ttf    # 黑体
```

代码里通过 `config.ini` 配置字体路径，没配置时 fallback 到系统默认字体：

```python
font_path = self.config.get_font_path()
try:
    font = ImageFont.truetype(font_path, 20) if font_path else ImageFont.load_default()
except IOError:
    font = ImageFont.load_default()
```

## PyQt5 应用全局字体

除了视频帧上的中文，PyQt5 界面本身的控件也需要设置中文字体。在应用启动时全局设置：

```python
app = QtWidgets.QApplication(sys.argv)
font = app.font()
font.setFamily("Microsoft YaHei")
app.setFont(font)
app.setStyleSheet('* { font-family: "Microsoft YaHei", "SimHei", "sans-serif"; }')
```

对所有子控件也要递归设置：

```python
for widget in self.findChildren(QtWidgets.QWidget):
    wfont = widget.font()
    wfont.setFamily("Microsoft YaHei")
    widget.setFont(wfont)
```

## 学到的教训

**OpenCV 不能直接画中文，这是个经典坑。** 每个用 OpenCV 做中文项目的人都会踩一次。解决方案就是绕道 PIL，虽然要多做两次 BGR↔RGB 转换，但效果完美。

如果项目要跨平台部署，字体路径也要根据不同系统做适配——Windows 用微软雅黑，macOS 用苹方，Linux 用文泉驿。
