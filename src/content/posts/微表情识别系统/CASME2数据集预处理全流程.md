---
title: "CASME2 数据集预处理全流程"
published: 2025-03-08
tags: [CASME2, 数据预处理, 光流, 关键点, dlib]
pinned: false
description: "从 CASME2 原始帧到可训练的序列数据：人脸检测、关键点提取、光流计算、序列构建、数据增强。"
category: 技术
project: 微表情识别系统
draft: false
author: sttez
---

# CASME2 数据集预处理全流程

## CASME2 是什么

CASME2 是中科院自动化所发布的自发微表情数据集，包含 26 名被试的面部微表情视频帧，由人工标注了 onset（起始帧）、apex（峰值帧）、offset（结束帧）以及情绪类别。

原始数据是逐帧的图像文件，不能直接送入模型。我们需要把它加工成三种格式的序列数据。

## 预处理流水线

整个流程分五步，由 `data/prepare_dataset.py` 一个脚本完成：

```
原始帧 → 类别分析 → 人脸检测+关键点+光流 → 序列构建 → 数据增强 → 训练/测试分割
```

### 第一步：类别分布分析

CASME2 标注了 7 种情绪，但有些类别样本太少。脚本先读取 Excel 标注文件，统计各类别数量：

```python
df = pd.read_excel(excel_path)
for _, row in df.iterrows():
    emotion = str(row['Estimated Emotion']).strip().lower()
    # 统计各类别出现次数
```

结果是：fear 和 sadness 样本严重不足，被排除。保留 surprise、repression、happiness、disgust、others 五个类别。

### 第二步：逐帧提取特征

对每个序列的每一帧，同时做三件事：

**人脸检测 + 裁剪**：用 dlib 的 frontal face detector 检测人脸，裁剪并 resize 到 128×128 灰度图。

**68 点关键点提取**：用 dlib 的 shape_predictor 拿到 68 个面部关键点的 (x, y) 坐标，保存为 JSON。

```python
landmarks = predictor(gray, faces[0])
points = [(landmarks.part(i).x, landmarks.part(i).y) for i in range(68)]
```

**光流计算**：用 OpenCV 的 Farneback 算法计算相邻帧之间的稠密光流，保存为 npz 压缩文件。

```python
flow = cv2.calcOpticalFlowFarneback(prev, next_img, None,
    0.5, 3, 15, 3, 5, 1.2, 0)
```

这一步最耗时间，因为 CASME2 有上万帧图像。每帧都要经过人脸检测 + 关键点提取 + 光流计算。

### 第三步：构建定长序列

模型需要固定长度（32 帧）的输入序列，但原始微表情序列长短不一。脚本用"智能窗口滑动"策略：

- 如果序列长度 >= 32：以 apex 为中心截取 32 帧窗口
- 如果序列长度 < 32：跳过该序列
- 对长序列做多次随机采样，直到每个类别凑够最少 475 个样本

```python
def select_sequence_start(onset, apex, offset, total_frames, sequence_length, loop):
    if loop == 0:
        # 第一轮：以 apex 为中心
        ideal_start = apex - sequence_length // 2
    else:
        # 后续轮次：随机位置
        ideal_start = min_start + random.randint(0, range_width)
    return max(0, min(ideal_start, total_frames - sequence_length))
```

### 第四步：数据增强

对所有序列做水平翻转，数据量翻倍。翻转后的文件名加上 `_flip` 后缀。

### 第五步：分割与导出

用 `train_test_split` 按 8:2 比例分层分割，生成 `cls_train.txt` 和 `cls_test.txt` 标签文件。每行格式：

```
label;npy_path;landmark_paths;flow_paths;onehot
```

## 输出结构

```
data/
├── sequences/train/happiness/  # 训练序列
├── sequences/test/disgust/     # 测试序列
├── optical_flow/sub01/xxx/     # 光流 npz 文件
├── landmarks/sub01/xxx/        # 关键点 JSON 文件
cls_train.txt                   # 训练标签
cls_test.txt                    # 测试标签
```

## 经验教训

预处理阶段花的时间远超预期——CASME2 数据量不小，逐帧提取特征加光流要跑几个小时。建议提前做好预处理，把中间结果（关键点、光流）缓存到磁盘，避免每次都要重跑。
