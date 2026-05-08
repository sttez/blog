---
title: "Gradio Web 界面搭建指南"
published: 2025-04-18
tags: [Gradio, Web界面, Python, 部署, 指南]
pinned: false
description: "用 Gradio 快速搭建微表情识别的 Web 界面，支持图像上传、视频处理和摄像头实时识别。"
category: 指南
project: 微表情识别系统
draft: false
author: sttez
---

# Gradio Web 界面搭建指南

## 为什么选 Gradio

项目需要一个 Web 界面方便演示和分享。相比自己写 Flask/FastAPI + 前端页面，Gradio 只需要写 Python 函数就能自动生成 Web UI，几分钟搞定。

## 整体结构

Gradio 界面在 `interfaces/webapp/gradio_app.py` 中，约 160 行代码，包含三个 Tab：

- **图像识别**：上传图片，返回预测结果和标注图
- **视频识别**：上传视频，返回处理后的标注视频
- **摄像头识别**：调用摄像头，实时识别

核心代码直接复用 `InferenceEngine`，界面只做输入输出的转换。

## 图像识别 Tab

最简单的模式：用户上传一张图片，调用 `engine.predict_image` 返回结果。

```python
def predict_image(img: Image.Image):
    if img is None:
        return "请上传图像", None, None

    img_array = np.array(img.convert("RGB"))
    bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

    label, probs, face_rect = engine.predict_image(bgr)
    if label is None:
        return "未检测到人脸", original_img, None

    idx = LABELS.index(label)
    result_text = f"{CHINESE_LABELS[idx]} ({label}) {probs[idx]*100:.2f}%"

    # 绘制人脸框
    if face_rect:
        x, y, w, h = face_rect
        cv2.rectangle(bgr, (x, y), (x+w, y+h), (0, 255, 0), 2)

    processed_img = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    return result_text, original_img, processed_img
```

Gradio 组件绑定：

```python
with gr.Tab("图像识别"):
    img_input = gr.Image(type="pil", label="上传图像")
    result_label = gr.Label(label="预测结果")
    original_out = gr.Image(label="原图")
    processed_out = gr.Image(label="检测结果")
    img_button.click(fn=predict_image, inputs=img_input,
                     outputs=[result_label, original_out, processed_out])
```

## 视频识别 Tab

视频处理稍微复杂，因为需要逐帧处理并重新写入视频文件：

```python
def predict_video(video_file):
    results, fps, total_frames = engine.predict_video(video_path)

    # 重新写入带标注的视频
    output_path = os.path.join(tempfile.gettempdir(), f"processed_{int(time.time())}.mp4")
    cap = cv2.VideoCapture(video_path)
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    result_dict = {r[0]: (r[1], r[2], r[3]) for r in results}
    while True:
        ret, frame = cap.read()
        if not ret: break
        if frame_idx in result_dict:
            # 在帧上绘制人脸框和识别结果
            ...
        out.write(frame)

    return result_text, output_path
```

## 摄像头识别 Tab

Gradio 原生支持摄像头输入，只需指定 `sources=["webcam"]`：

```python
with gr.Tab("摄像头识别"):
    webcam_input = gr.Image(sources=["webcam"], type="pil", label="摄像头")
    webcam_output = gr.Label(label="预测结果")
    webcam_button.click(fn=predict_image, inputs=webcam_input,
                        outputs=[webcam_output, ...])
```

## 启动配置

端口和共享设置通过 `config.ini` 控制：

```ini
[webapp]
port = 7860
share = false
```

启动代码：

```python
if __name__ == "__main__":
    port = config.getint('webapp', 'port', 7860)
    share = config.getboolean('webapp', 'share', False)
    demo.launch(server_name="127.0.0.1", server_port=port, share=share)
```

`share=True` 时 Gradio 会生成一个临时公网 URL，方便给别人演示。

## 小结

Gradio 适合快速搭建 ML 模型的演示界面——不用写前端代码，不用管路由和 API，Python 函数直接变成 Web UI。缺点是 UI 定制性有限，如果需要更复杂的交互，还是得用 PyQt5 或自己写前端。
