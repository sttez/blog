---
title: "PyQt5 桌面应用开发实战"
published: 2025-04-14
tags: [PyQt5, 桌面应用, OpenCV, 实时视频, Python]
pinned: false
description: "用 PyQt5 做一个支持图片、视频和摄像头三种模式的微表情识别桌面应用。"
category: 技术
project: 微表情识别系统
draft: false
author: sttez
---

# PyQt5 桌面应用开发实战

## 整体架构

PyQt5 桌面应用是项目中功能最完整的界面，支持三种推理模式：图片识别、视频识别、实时摄像头识别。代码分两个文件：

- `gui_main.py`：主窗口逻辑，约 270 行
- `ui_layout.py`：Qt Designer 生成的界面布局

## 主窗口类

`MainWindow` 继承 `QMainWindow`，核心结构：

```python
class MainWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.config = Config()
        self.engine = InferenceEngine(self.config)

        # 帧缓冲区（摄像头/视频模式需要）
        self.frame_buffer, self.landmark_buffer, self.gray_buffer = \
            self.engine.create_frame_buffers()

        # 定时器驱动视频播放
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_frame)
```

## 三种推理模式

### 图片模式

最简单：选择文件 → 检测人脸 → 推理 → 绘制结果。

```python
def run_image_predict(self):
    path, _ = QFileDialog.getOpenFileName(self, "选择图像", "",
                                          "Image Files (*.png *.jpg)")
    img = cv2.imread(path)

    # 为了满足模型输入要求（32帧序列），单帧重复32次
    for _ in range(32):
        self.frame_buffer.append(face)
        self.landmark_buffer.append(landmarks.flatten())
        self.gray_buffer.append(gray)

    label, probs, _ = self.engine.predict_frame(
        img, self.frame_buffer, self.landmark_buffer, self.gray_buffer
    )
    pixmap = self.draw_results(img, label, probs, face_rect)
    self.ui.display_frame.setPixmap(pixmap)
```

### 视频模式

用 QTimer 每 30ms 读一帧，模拟视频播放：

```python
def run_video_predict(self):
    self.cap = cv2.VideoCapture(path)
    self.timer.start(30)  # ~33fps

def update_frame(self):
    ret, frame = self.cap.read()
    if ret:
        pixmap = self.process_and_draw(frame)
        self.ui.display_frame.setPixmap(pixmap)
```

### 摄像头模式

和视频模式共用同一个 `update_frame`，区别是摄像头模式做水平镜像：

```python
if self.current_mode == 'camera':
    frame = cv2.flip(frame, 1)  # 镜像
```

## 实时绘制结果

OpenCV 不支持中文，所以用 PIL 绘制后再转回 PyQt5 的 QPixmap：

```python
def draw_results(self, frame, label, probs, face_rect):
    # PIL 绘制中文
    pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)
    font = ImageFont.truetype(self.font_path, 20)
    draw.text((x, y-10), f"{cn_label} [{confidence:.1f}%",
              font=font, fill=(color[2], color[1], color[0]))

    # 转成 QPixmap
    rgb_image = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    rgb_image = cv2.cvtColor(rgb_image, cv2.COLOR_BGR2RGB)
    qt_image = QImage(rgb_image.data, w, h, ch*w, QImage.Format_RGB888)
    return QPixmap.fromImage(qt_image)
```

## 概率条 UI

界面底部有 5 个进度条，显示每种表情的概率：

```python
def update_prob_bars(self, probs):
    for i in range(len(LABELS)):
        val = int(probs[i] * 100)
        self.ui.progress_bars[i].setValue(val)
        self.ui.percent_labels[i].setText(f"{val}%")
```

## 模型切换

菜单栏支持运行时切换模型，不用重启应用：

```python
menubar = self.menuBar()
model_menu = menubar.addMenu('模型')
switch_action = model_menu.addAction('切换模型')
switch_action.triggered.connect(self.switch_model)
```

点击后弹出下拉列表，列出所有已训练模型（含准确率），选择后调用 `engine.switch_model(path)` 热切换。

## 状态栏

底部状态栏显示当前模型名称和识别状态：

```python
def update_status_bar(self, msg="就绪"):
    model_name = os.path.basename(os.path.dirname(self.current_model_path))
    self.statusBar().showMessage(f"{msg} | 模型: {model_name} | 5类")
```

## 小结

PyQt5 适合做功能丰富的桌面应用，但开发效率不如 Gradio。关键的坑在于中文显示和 OpenCV/PIL/Qt 的图像格式转换——BGR、RGB、QImage、Pixmap 四种格式来回转，搞清楚了就不难。
