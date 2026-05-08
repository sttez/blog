---
title: "三流 CNN+BiLSTM 模型架构设计"
published: 2025-03-21
tags: [CNN, BiLSTM, 多流网络, 模型架构, PyTorch]
pinned: false
description: "图像流、光流流、关键点流三路并行提取特征，再用双向 LSTM 建模时序关系，最终分类微表情。"
category: 技术
project: 微表情识别系统
draft: false
author: sttez
---

# 三流 CNN+BiLSTM 模型架构设计

## 为什么要三流

微表情的特点是持续时间极短（1/25 到 1/3 秒），仅靠单一图像特征很难捕捉。我们的模型融合了三种互补信息：

- **图像流**：人脸外观的静态特征，捕捉纹理和肌肉变化
- **光流流**：帧间运动信息，捕捉面部微小位移
- **关键点流**：68 个面部关键点的空间位置变化

三种信息从不同角度描述同一个微表情事件，融合后比任何单一特征都更鲁棒。

## 网络结构

每个流都用轻量 CNN 提取特征，最后拼接送入 BiLSTM：

```python
class MicroExpressionModel(nn.Module):
    def __init__(self, num_classes, sequence_length=32):
        super().__init__()

        # 图像流: 1通道灰度 → 128维特征
        self.image_cnn = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(), nn.MaxPool2d(2),
        )
        self.image_pool = nn.AdaptiveAvgPool2d(1)  # GAP → (B, 128)

        # 光流流: 2通道光流 → 128维特征
        self.flow_cnn = nn.Sequential(...)
        self.flow_pool = nn.AdaptiveAvgPool2d(1)

        # 关键点流: 136维坐标 → 128维特征
        self.landmark_fc = nn.Sequential(
            nn.Linear(68 * 2, 128), nn.BatchNorm1d(128), nn.ReLU()
        )

        # 拼接 128+128+128=384 → BiLSTM → 分类
        self.lstm = nn.LSTM(384, 256, num_layers=2, batch_first=True,
                            bidirectional=True, dropout=0.3)
        self.classifier = nn.Sequential(
            nn.Linear(512, 128), nn.ReLU(), nn.Dropout(0.5),
            nn.Linear(128, num_classes)
        )
```

## 关键设计决策

### 全局平均池化替代 Flatten

原模型直接把 CNN 输出（128×16×16=32768 维）flatten 后送入 LSTM，参数量爆炸。改成 GAP 后空间维度压缩到 1 维，特征从 32768 降到 128，总参数量从 68M 降到 3M。

### BatchNorm 加速收敛

每个 Conv 和 FC 层后面都加了 BatchNorm。好处是训练更稳定、收敛更快，还有一点正则化效果。

### 双向 LSTM 处理时序

微表情的开始和结束阶段存在重要关联——压抑型微表情开始时面部收紧，结束时突然放松。单向 LSTM 只能看到前文，双向 LSTM 可以同时利用前后文信息，识别效果更好。

## 光流时间对齐

光流是帧间计算的，所以序列长度比图像少 1 帧（T-1=31）。模型在特征融合时会把图像流和关键点流截取到与光流相同的时间步，确保拼接维度正确：

```python
combined = torch.cat((
    img_feat[:, :T_flow, :],   # 截取到 31 步
    lm_feat[:, :T_flow, :],
    flow_feat                  # 本身就是 31 步
), dim=2)  # (B, 31, 384)
```

## 最终效果

整个模型约 300 万参数，在 CASME2 数据集上训练 30 个 epoch 即可收敛。相比原版 68M 参数的版本，参数量减少了 95%，但识别准确率没有明显下降——因为精简掉的主要是 CNN 到 LSTM 之间的冗余全连接层。
