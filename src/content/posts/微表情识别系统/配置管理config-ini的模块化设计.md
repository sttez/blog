---
title: "配置管理：config.ini 的模块化设计"
published: 2025-03-17
tags: [配置管理, 单例模式, INI, Python, 指南]
pinned: false
description: "一个 config.ini 文件统一管理数据路径、预处理参数、训练超参和界面配置，Config 单例类全局读取。"
category: 指南
project: 微表情识别系统
draft: false
author: sttez
---

# 配置管理：config.ini 的模块化设计

## 为什么要做集中配置

重构前，超参数和路径散落在各个 Python 文件里——`image_size = 128` 写在一个文件，`batch_size = 8` 写在另一个文件。改一个参数要全局搜索，改错地方就出 bug。

重构后用一个 `config.ini` 文件统一管理所有配置。

## config.ini 结构

```ini
[paths]
raw_data_dir = data/CASME2-RAW
sequences_dir = data/sequences
optical_flow_dir = data/optical_flow
landmarks_dir = data/landmarks
excel_path = data/CASME2-coding-20140508.xlsx
cascade_path = utils/haarcascade_frontalface_default.xml
predictor_path = utils/shape_predictor_68_face_landmarks.dat
weights_dir = models/weights

[preprocessing]
image_size = 128
sequence_length = 32
min_sequences_per_class = 475
excluded_classes = fear,sadness
valid_classes = surprise,repression,happiness,disgust,others

[training]
stage = 0
batch_size = 8
num_epochs = 30
learning_rate = 0.0001
early_stopping_patience = 10
train_split = 0.8

[webapp]
port = 7860
share = false

[model]
selected_path =
```

五个分区，覆盖了项目的四个核心模块。

## Config 单例类

`core/config.py` 用单例模式实现全局配置管理：

```python
class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._config = configparser.ConfigParser()
            cls._instance._config.read('config.ini')
        return cls._instance
```

单例保证整个进程只有一个 Config 实例，不管从哪里调用 `Config()`，拿到的都是同一份配置。

## 常用方法

Config 类提供了一系列便捷方法：

```python
config = Config()

# 基本读取
image_size = config.getint('preprocessing', 'image_size', 128)
learning_rate = config.getfloat('training', 'learning_rate', 0.0001)

# 路径拼接（自动处理相对路径）
raw_data = config.path('paths', 'raw_data_dir')

# 列表解析
classes = config.get_class_names()  # -> ['surprise', 'repression', ...]

# 模型管理
model_path = config.get_model_path()
models = config.list_models()  # -> [(name, path, accuracy), ...]
```

## list_models 的实现

一个有趣的功能：自动扫描 `models/weights/` 目录，列出所有已训练的模型：

```python
def list_models(self):
    weights_dir = self.get_weights_dir()
    models = []
    for name in sorted(os.listdir(weights_dir)):
        path = os.path.join(weights_dir, name, 'best_model.pth')
        if os.path.exists(path):
            # 从文件夹名解析准确率：MicroExpModel_20260508_143022_82.35
            parts = name.split('_')
            acc = parts[-1] if len(parts) >= 4 else "未知"
            models.append((name, path, acc))
    return models
```

PyQt5 的"切换模型"菜单直接调用这个方法，列出所有可用模型供选择。

## 好处

- **改配置不用改代码**：调超参数只需编辑 config.ini
- **不会改错地方**：所有配置在一个文件里
- **便于版本管理**：config.ini 可以提交到 Git，不同环境改 config.ini 即可
- **全局一致**：单例模式保证所有模块读到相同的配置值

## 局限

configparser 只支持字符串值，列表类型（如 valid_classes）需要自己解析。如果配置项再多或者类型更复杂，可以考虑迁移到 YAML 或 TOML。
